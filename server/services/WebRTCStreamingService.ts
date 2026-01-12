/**
 * WebRTCStreamingService - Professional Streaming with Mediasoup
 * 
 * This service uses WebRTC (via Mediasoup SFU) for professional-grade streaming.
 * 
 * Architecture:
 * Browser (Canvas 30fps) → WebRTC → Mediasoup → PlainRtpTransport → FFmpeg → RTMP
 * 
 * Advantages over MediaRecorder approach:
 * - Constant frame rate (30fps guaranteed)
 * - Lower latency (< 1 second)
 * - Better quality control
 * - Automatic reconnection
 * - Same architecture as StreamYard/Restream
 */

import { spawn, ChildProcess } from 'child_process';
import os from 'os';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';

interface StreamDestination {
  id: string;
  platform: string;
  name: string;
  rtmpUrl: string;
  streamKey: string;
}

interface StreamConfig {
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
}

interface ActiveStream {
  socket: Socket;
  destinations: StreamDestination[];
  config: StreamConfig;
  // Mediasoup components
  router?: mediasoupTypes.Router;
  webRtcTransport?: mediasoupTypes.WebRtcTransport;
  plainRtpTransport?: mediasoupTypes.PlainTransport;
  videoProducer?: mediasoupTypes.Producer;
  audioProducer?: mediasoupTypes.Producer;
  videoConsumer?: mediasoupTypes.Consumer;
  audioConsumer?: mediasoupTypes.Consumer;
  // FFmpeg process
  ffmpegProcess?: ChildProcess;
  // Stats
  bytesReceived: number;
  startTime: number;
}

// Mediasoup configuration
const mediasoupConfig = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: 'warn' as mediasoupTypes.WorkerLogLevel,
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'] as mediasoupTypes.WorkerLogTag[],
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio' as mediasoupTypes.MediaKind,
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video' as mediasoupTypes.MediaKind,
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video' as mediasoupTypes.MediaKind,
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '42e01f',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000,
        },
      },
    ] as mediasoupTypes.RtpCodecCapability[],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.ANNOUNCED_IP || '3.132.135.140', // EC2 public IP
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 4500000, // 4.5 Mbps
  },
  plainRtpTransport: {
    listenIp: { ip: '127.0.0.1', announcedIp: undefined },
    rtcpMux: false,
    comedia: false,
  },
};

export class WebRTCStreamingService {
  private io: SocketIOServer | null = null;
  private workers: mediasoupTypes.Worker[] = [];
  private nextWorkerIndex = 0;
  private activeStreams: Map<string, ActiveStream> = new Map();

  constructor() {
    console.log('[WebRTCStreamingService] Professional streaming service initialized');
  }

  /**
   * Initialize Mediasoup workers
   */
  async initialize(): Promise<void> {
    console.log('[WebRTCStreamingService] Initializing Mediasoup workers...');
    
    const numWorkers = Math.min(4, os.cpus().length);
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: mediasoupConfig.worker.logLevel,
        logTags: mediasoupConfig.worker.logTags,
        rtcMinPort: mediasoupConfig.worker.rtcMinPort,
        rtcMaxPort: mediasoupConfig.worker.rtcMaxPort,
      });

      worker.on('died', () => {
        console.error('[WebRTCStreamingService] Mediasoup worker died, exiting...');
        process.exit(1);
      });

      this.workers.push(worker);
      console.log(`[WebRTCStreamingService] Worker ${i + 1}/${numWorkers} created`);
    }

    console.log('[WebRTCStreamingService] All workers initialized');
  }

  /**
   * Get next available worker (round-robin)
   */
  private getNextWorker(): mediasoupTypes.Worker {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  /**
   * Attach to HTTP server
   */
  attach(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      path: '/webrtc-stream',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 120000,
      pingInterval: 10000,
      maxHttpBufferSize: 50 * 1024 * 1024,
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebRTCStreamingService] Client connected: ${socket.id}`);
      this.handleConnection(socket);
    });

    console.log('[WebRTCStreamingService] WebSocket server attached at /webrtc-stream');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: Socket): void {
    socket.emit('connected', { message: 'WebRTC streaming service ready' });

    // Get router RTP capabilities
    socket.on('getRouterRtpCapabilities', async (data, callback) => { if (typeof data === 'function') { callback = data; data = undefined; }
      try {
        const worker = this.getNextWorker();
        const router = await worker.createRouter({
          mediaCodecs: mediasoupConfig.router.mediaCodecs,
        });

        // Store router for this client
        const stream = this.activeStreams.get(socket.id) || {
          socket,
          destinations: [],
          config: { width: 1280, height: 720, frameRate: 30, videoBitrate: 4500000, audioBitrate: 128000 },
          bytesReceived: 0,
          startTime: Date.now(),
        };
        stream.router = router;
        this.activeStreams.set(socket.id, stream);

        if (callback && typeof callback === 'function') {
          callback({ rtpCapabilities: router.rtpCapabilities });
        }
        console.log('[WebRTCStreamingService] Router RTP capabilities sent');
      } catch (error) {
        console.error('[WebRTCStreamingService] Error getting router capabilities:', error);
        if (callback && typeof callback === 'function') {
          callback({ error: (error as Error).message });
        }
      }
    });

    // Create WebRTC transport for sending media
    socket.on('createProducerTransport', async (data: any, callback?: any) => { if (typeof data === 'function') { callback = data; data = undefined; }
      try {
        const stream = this.activeStreams.get(socket.id);
        if (!stream?.router) {
          throw new Error('Router not initialized');
        }

        const transport = await stream.router.createWebRtcTransport({
          ...mediasoupConfig.webRtcTransport,
          appData: { clientId: socket.id },
        });

        stream.webRtcTransport = transport;

        if (callback && typeof callback === 'function') {
          callback({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
          });
        }

        console.log('[WebRTCStreamingService] Producer transport created');
      } catch (error) {
        console.error('[WebRTCStreamingService] Error creating producer transport:', error);
        if (callback && typeof callback === 'function') {
          callback({ error: (error as Error).message });
        }
      }
    });

    // Connect WebRTC transport
    socket.on('connectProducerTransport', async (data: any, callback?: any) => { if (typeof data === 'function') { callback = data; data = {}; } const { dtlsParameters } = data || {};
      try {
        const stream = this.activeStreams.get(socket.id);
        if (!stream?.webRtcTransport) {
          throw new Error('Transport not initialized');
        }

        await stream.webRtcTransport.connect({ dtlsParameters });
        if (callback && typeof callback === 'function') {
          callback({ success: true });
        }
        console.log('[WebRTCStreamingService] Producer transport connected');
      } catch (error) {
        console.error('[WebRTCStreamingService] Error connecting transport:', error);
        if (callback && typeof callback === 'function') {
          callback({ error: (error as Error).message });
        }
      }
    });

    // Produce media (video or audio)
    socket.on('produce', async (data: any, callback?: any) => { if (typeof data === 'function') { callback = data; data = {}; } const { kind, rtpParameters, appData } = data || {};
      try {
        const stream = this.activeStreams.get(socket.id);
        if (!stream?.webRtcTransport) {
          throw new Error('Transport not initialized');
        }

        const producer = await stream.webRtcTransport.produce({
          kind,
          rtpParameters,
          appData,
        });

        if (kind === 'video') {
          stream.videoProducer = producer;
        } else {
          stream.audioProducer = producer;
        }

        if (callback && typeof callback === 'function') {
          callback({ id: producer.id });
        }
        console.log(`[WebRTCStreamingService] ${kind} producer created: ${producer.id}`);

        // If both video and audio are ready, start RTMP relay
        if (stream.videoProducer && stream.audioProducer && stream.destinations.length > 0) {
          await this.startRtmpRelay(socket.id);
        }
      } catch (error) {
        console.error('[WebRTCStreamingService] Error producing:', error);
        if (callback && typeof callback === 'function') {
          callback({ error: (error as Error).message });
        }
      }
    });

    // Start streaming to RTMP destinations
    socket.on('startRelay', async (data: any, callback?: any) => { if (typeof data === 'function') { callback = data; data = {}; } const { destinations, config } = data || {};
      try {
        const stream = this.activeStreams.get(socket.id);
        if (!stream) {
          throw new Error('Stream not initialized');
        }

        stream.destinations = destinations;
        stream.config = config;

        // If producers are ready, start relay
        if (stream.videoProducer) {
          await this.startRtmpRelay(socket.id);
        }

        if (callback && typeof callback === 'function') {
          callback({ success: true });
        }
        console.log('[WebRTCStreamingService] Relay configuration set');
      } catch (error) {
        console.error('[WebRTCStreamingService] Error starting relay:', error);
        if (callback && typeof callback === 'function') {
          callback({ error: (error as Error).message });
        }
      }
    });

    // Stop streaming
    socket.on('stopRelay', async (data: any, callback?: any) => { if (typeof data === 'function') { callback = data; data = undefined; }
      try {
        await this.stopStream(socket.id);
        if (callback && typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (error) {
        console.error('[WebRTCStreamingService] Error stopping relay:', error);
        if (callback && typeof callback === 'function') {
          callback({ error: (error as Error).message });
        }
      }
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`[WebRTCStreamingService] Client disconnected: ${socket.id}, reason: ${reason}`);
      await this.stopStream(socket.id);
    });
  }

  /**
   * Start RTMP relay using PlainRtpTransport + FFmpeg
   */
  private async startRtmpRelay(socketId: string): Promise<void> {
    const stream = this.activeStreams.get(socketId);
    if (!stream?.router || !stream.videoProducer) {
      console.log('[WebRTCStreamingService] Cannot start relay: missing components');
      return;
    }

    console.log('[WebRTCStreamingService] Starting RTMP relay...');

    try {
      // Create PlainRtpTransport for video
      const videoPlainTransport = await stream.router.createPlainTransport({
        ...mediasoupConfig.plainRtpTransport,
        appData: { type: 'video' },
      });

      // Create PlainRtpTransport for audio
      const audioPlainTransport = await stream.router.createPlainTransport({
        ...mediasoupConfig.plainRtpTransport,
        appData: { type: 'audio' },
      });

      // Get ports for FFmpeg
      const videoRtpPort = videoPlainTransport.tuple.localPort;
      const videoRtcpPort = videoPlainTransport.rtcpTuple?.localPort || videoRtpPort + 1;
      const audioRtpPort = audioPlainTransport.tuple.localPort;
      const audioRtcpPort = audioPlainTransport.rtcpTuple?.localPort || audioRtpPort + 1;

      console.log(`[WebRTCStreamingService] Video RTP port: ${videoRtpPort}, RTCP: ${videoRtcpPort}`);
      console.log(`[WebRTCStreamingService] Audio RTP port: ${audioRtpPort}, RTCP: ${audioRtcpPort}`);

      // Create consumers to forward media to PlainRtpTransport
      const videoConsumer = await videoPlainTransport.consume({
        producerId: stream.videoProducer.id,
        rtpCapabilities: stream.router.rtpCapabilities,
        paused: false,
      });

      let audioConsumer: mediasoupTypes.Consumer | undefined;
      if (stream.audioProducer) {
        audioConsumer = await audioPlainTransport.consume({
          producerId: stream.audioProducer.id,
          rtpCapabilities: stream.router.rtpCapabilities,
          paused: false,
        });
      }

      stream.videoConsumer = videoConsumer;
      stream.audioConsumer = audioConsumer;
      stream.plainRtpTransport = videoPlainTransport;

      // Start FFmpeg for each destination
      for (const dest of stream.destinations) {
        if (dest.enabled === false) continue;

        const rtmpUrl = `${dest.rtmpUrl}/${dest.streamKey}`;
        console.log(`[WebRTCStreamingService] Starting FFmpeg for ${dest.platform}: ${dest.rtmpUrl}`);

        // Generate SDP for FFmpeg
        const sdp = this.generateSdp(
          videoRtpPort,
          videoRtcpPort,
          audioRtpPort,
          audioRtcpPort,
          videoConsumer.rtpParameters,
          audioConsumer?.rtpParameters
        );

        // Start FFmpeg process
        const ffmpeg = this.startFfmpeg(sdp, rtmpUrl, stream.config);
        stream.ffmpegProcess = ffmpeg;

        // Monitor FFmpeg
        ffmpeg.on('close', (code) => {
          console.log(`[WebRTCStreamingService] FFmpeg closed with code ${code}`);
        });
      }

      stream.socket.emit('relay-started', { message: 'RTMP relay started' });
      console.log('[WebRTCStreamingService] RTMP relay started successfully');

    } catch (error) {
      console.error('[WebRTCStreamingService] Error starting RTMP relay:', error);
      stream.socket.emit('error', { message: 'Failed to start RTMP relay' });
    }
  }

  /**
   * Generate SDP for FFmpeg input
   */
  private generateSdp(
    videoRtpPort: number,
    videoRtcpPort: number,
    audioRtpPort: number,
    audioRtcpPort: number,
    videoRtpParameters: mediasoupTypes.RtpParameters,
    audioRtpParameters?: mediasoupTypes.RtpParameters
  ): string {
    const videoCodec = videoRtpParameters.codecs[0];
    const videoPayloadType = videoCodec.payloadType;
    const videoClockRate = videoCodec.clockRate;
    const videoCodecName = videoCodec.mimeType.split('/')[1];

    let sdp = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=FFmpeg
c=IN IP4 127.0.0.1
t=0 0
m=video ${videoRtpPort} RTP/AVP ${videoPayloadType}
a=rtpmap:${videoPayloadType} ${videoCodecName}/${videoClockRate}
a=recvonly
`;

    if (audioRtpParameters) {
      const audioCodec = audioRtpParameters.codecs[0];
      const audioPayloadType = audioCodec.payloadType;
      const audioClockRate = audioCodec.clockRate;
      const audioChannels = audioCodec.channels || 2;

      sdp += `m=audio ${audioRtpPort} RTP/AVP ${audioPayloadType}
a=rtpmap:${audioPayloadType} opus/${audioClockRate}/${audioChannels}
a=recvonly
`;
    }

    return sdp;
  }

  /**
   * Start FFmpeg process
   */
  private startFfmpeg(sdp: string, rtmpUrl: string, config: StreamConfig): ChildProcess {
    const args = [
      // Input from SDP
      '-protocol_whitelist', 'pipe,udp,rtp',
      '-fflags', '+genpts',
      '-f', 'sdp',
      '-i', 'pipe:0',
      
      // Video encoding - YouTube recommended settings
      '-map', '0:v:0',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-profile:v', 'high',
      '-level', '4.1',
      '-b:v', `${config.videoBitrate}`,
      '-maxrate', `${Math.floor(config.videoBitrate * 1.5)}`,
      '-bufsize', `${config.videoBitrate * 2}`,
      '-g', `${config.frameRate}`, // GOP = 1 second
      '-keyint_min', `${config.frameRate}`,
      '-sc_threshold', '0',
      '-bf', '2',
      '-flags', '+cgop',
      '-pix_fmt', 'yuv420p',
      
      // Audio encoding
      '-map', '0:a:0?',
      '-c:a', 'aac',
      '-b:a', `${config.audioBitrate}`,
      '-ar', '48000',
      '-ac', '2',
      
      // Output to RTMP
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      rtmpUrl,
    ];

    console.log('[WebRTCStreamingService] FFmpeg args:', args.join(' '));

    const ffmpeg = spawn('ffmpeg', args);

    // Pipe SDP to FFmpeg stdin
    if (ffmpeg.stdin) {
      ffmpeg.stdin.write(sdp);
      ffmpeg.stdin.end();
    }

    // Log FFmpeg output
    if (ffmpeg.stderr) {
      ffmpeg.stderr.setEncoding('utf-8');
      ffmpeg.stderr.on('data', (data: string) => {
        // Only log important messages
        if (data.includes('frame=') || data.includes('Error') || data.includes('error')) {
          console.log('[FFmpeg]', data.trim());
        }
      });
    }

    ffmpeg.on('error', (error) => {
      console.error('[WebRTCStreamingService] FFmpeg error:', error);
    });

    return ffmpeg;
  }

  /**
   * Stop stream and cleanup
   */
  private async stopStream(socketId: string): Promise<void> {
    const stream = this.activeStreams.get(socketId);
    if (!stream) return;

    console.log(`[WebRTCStreamingService] Stopping stream for ${socketId}`);

    // Kill FFmpeg
    if (stream.ffmpegProcess) {
      stream.ffmpegProcess.kill('SIGINT');
    }

    // Close consumers
    if (stream.videoConsumer) {
      stream.videoConsumer.close();
    }
    if (stream.audioConsumer) {
      stream.audioConsumer.close();
    }

    // Close producers
    if (stream.videoProducer) {
      stream.videoProducer.close();
    }
    if (stream.audioProducer) {
      stream.audioProducer.close();
    }

    // Close transports
    if (stream.webRtcTransport) {
      stream.webRtcTransport.close();
    }
    if (stream.plainRtpTransport) {
      stream.plainRtpTransport.close();
    }

    // Close router
    if (stream.router) {
      stream.router.close();
    }

    this.activeStreams.delete(socketId);
    console.log(`[WebRTCStreamingService] Stream stopped for ${socketId}`);
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    console.log('[WebRTCStreamingService] Shutting down...');

    // Stop all streams
    for (const socketId of this.activeStreams.keys()) {
      await this.stopStream(socketId);
    }

    // Close all workers
    for (const worker of this.workers) {
      worker.close();
    }

    this.workers = [];
    console.log('[WebRTCStreamingService] Shutdown complete');
  }
}

export const webRTCStreamingService = new WebRTCStreamingService();
