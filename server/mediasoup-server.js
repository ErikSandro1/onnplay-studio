/**
 * Mediasoup Server - Professional WebRTC Streaming
 * 
 * This runs as a separate process to avoid bundler issues with native modules.
 * Communicates with the main server via Socket.IO.
 * 
 * Architecture:
 * Browser → WebRTC → Mediasoup → PlainRtpTransport → FFmpeg → RTMP
 */

const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const mediasoup = require('mediasoup');
const { spawn } = require('child_process');
const os = require('os');

// Configuration
const PORT = process.env.MEDIASOUP_PORT || 3001;
const ANNOUNCED_IP = process.env.ANNOUNCED_IP || '3.132.135.140';

const config = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '42e01f',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000,
        },
      },
    ],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: ANNOUNCED_IP,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 4500000,
  },
  plainRtpTransport: {
    listenIp: { ip: '127.0.0.1', announcedIp: null },
    rtcpMux: false,
    comedia: false,
  },
};

// State
let workers = [];
let nextWorkerIndex = 0;
const activeStreams = new Map();

/**
 * Create Mediasoup workers
 */
async function createWorkers() {
  const numWorkers = Math.min(4, os.cpus().length);
  
  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: config.worker.logLevel,
      logTags: config.worker.logTags,
      rtcMinPort: config.worker.rtcMinPort,
      rtcMaxPort: config.worker.rtcMaxPort,
    });

    worker.on('died', () => {
      console.error('[Mediasoup] Worker died, exiting...');
      process.exit(1);
    });

    workers.push(worker);
    console.log(`[Mediasoup] Worker ${i + 1}/${numWorkers} created`);
  }
}

/**
 * Get next worker (round-robin)
 */
function getNextWorker() {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}

/**
 * Handle client connection
 */
async function handleConnection(socket) {
  console.log(`[Mediasoup] Client connected: ${socket.id}`);
  
  let stream = {
    socket,
    router: null,
    webRtcTransport: null,
    plainVideoTransport: null,
    plainAudioTransport: null,
    videoProducer: null,
    audioProducer: null,
    videoConsumer: null,
    audioConsumer: null,
    ffmpegProcess: null,
    destinations: [],
    config: {
      width: 1280,
      height: 720,
      frameRate: 30,
      videoBitrate: 4500000,
      audioBitrate: 128000,
    },
  };
  
  activeStreams.set(socket.id, stream);

  // Get router RTP capabilities
  socket.on('getRouterRtpCapabilities', async (callback) => {
    try {
      const worker = getNextWorker();
      stream.router = await worker.createRouter({
        mediaCodecs: config.router.mediaCodecs,
      });
      
      callback({ rtpCapabilities: stream.router.rtpCapabilities });
      console.log('[Mediasoup] Router created, capabilities sent');
    } catch (error) {
      console.error('[Mediasoup] Error getting capabilities:', error);
      callback({ error: error.message });
    }
  });

  // Create producer transport
  socket.on('createProducerTransport', async (callback) => {
    try {
      if (!stream.router) {
        throw new Error('Router not initialized');
      }

      stream.webRtcTransport = await stream.router.createWebRtcTransport({
        ...config.webRtcTransport,
        appData: { clientId: socket.id },
      });

      callback({
        id: stream.webRtcTransport.id,
        iceParameters: stream.webRtcTransport.iceParameters,
        iceCandidates: stream.webRtcTransport.iceCandidates,
        dtlsParameters: stream.webRtcTransport.dtlsParameters,
      });
      
      console.log('[Mediasoup] Producer transport created');
    } catch (error) {
      console.error('[Mediasoup] Error creating transport:', error);
      callback({ error: error.message });
    }
  });

  // Connect producer transport
  socket.on('connectProducerTransport', async ({ dtlsParameters }, callback) => {
    try {
      if (!stream.webRtcTransport) {
        throw new Error('Transport not initialized');
      }

      await stream.webRtcTransport.connect({ dtlsParameters });
      callback({ success: true });
      console.log('[Mediasoup] Producer transport connected');
    } catch (error) {
      console.error('[Mediasoup] Error connecting transport:', error);
      callback({ error: error.message });
    }
  });

  // Produce media
  socket.on('produce', async ({ kind, rtpParameters, appData }, callback) => {
    try {
      if (!stream.webRtcTransport) {
        throw new Error('Transport not initialized');
      }

      const producer = await stream.webRtcTransport.produce({
        kind,
        rtpParameters,
        appData,
      });

      if (kind === 'video') {
        stream.videoProducer = producer;
        console.log('[Mediasoup] Video producer created:', producer.id);
      } else {
        stream.audioProducer = producer;
        console.log('[Mediasoup] Audio producer created:', producer.id);
      }

      callback({ id: producer.id });

      // Start RTMP relay if both producers are ready and destinations configured
      if (stream.videoProducer && stream.destinations.length > 0) {
        await startRtmpRelay(socket.id);
      }
    } catch (error) {
      console.error('[Mediasoup] Error producing:', error);
      callback({ error: error.message });
    }
  });

  // Start relay
  socket.on('startRelay', async ({ destinations, config: streamConfig }, callback) => {
    try {
      stream.destinations = destinations;
      if (streamConfig) {
        stream.config = { ...stream.config, ...streamConfig };
      }

      if (stream.videoProducer) {
        await startRtmpRelay(socket.id);
      }

      callback({ success: true });
      console.log('[Mediasoup] Relay configuration set');
    } catch (error) {
      console.error('[Mediasoup] Error starting relay:', error);
      callback({ error: error.message });
    }
  });

  // Stop relay
  socket.on('stopRelay', async (callback) => {
    try {
      await stopStream(socket.id);
      callback({ success: true });
    } catch (error) {
      console.error('[Mediasoup] Error stopping relay:', error);
      callback({ error: error.message });
    }
  });

  // Disconnect
  socket.on('disconnect', async (reason) => {
    console.log(`[Mediasoup] Client disconnected: ${socket.id}, reason: ${reason}`);
    await stopStream(socket.id);
  });
}

/**
 * Start RTMP relay using PlainRtpTransport + FFmpeg
 */
async function startRtmpRelay(socketId) {
  const stream = activeStreams.get(socketId);
  if (!stream || !stream.router || !stream.videoProducer) {
    console.log('[Mediasoup] Cannot start relay: missing components');
    return;
  }

  console.log('[Mediasoup] Starting RTMP relay...');

  try {
    // Create PlainRtpTransport for video
    stream.plainVideoTransport = await stream.router.createPlainTransport({
      ...config.plainRtpTransport,
      appData: { type: 'video' },
    });

    // Connect to local ports
    await stream.plainVideoTransport.connect({
      ip: '127.0.0.1',
      port: stream.plainVideoTransport.tuple.localPort,
    });

    const videoRtpPort = stream.plainVideoTransport.tuple.localPort;
    const videoRtcpPort = stream.plainVideoTransport.rtcpTuple?.localPort || videoRtpPort + 1;

    console.log(`[Mediasoup] Video RTP: ${videoRtpPort}, RTCP: ${videoRtcpPort}`);

    // Create video consumer
    stream.videoConsumer = await stream.plainVideoTransport.consume({
      producerId: stream.videoProducer.id,
      rtpCapabilities: stream.router.rtpCapabilities,
      paused: false,
    });

    // Audio transport (if audio producer exists)
    let audioRtpPort = 0;
    let audioRtcpPort = 0;

    if (stream.audioProducer) {
      stream.plainAudioTransport = await stream.router.createPlainTransport({
        ...config.plainRtpTransport,
        appData: { type: 'audio' },
      });

      await stream.plainAudioTransport.connect({
        ip: '127.0.0.1',
        port: stream.plainAudioTransport.tuple.localPort,
      });

      audioRtpPort = stream.plainAudioTransport.tuple.localPort;
      audioRtcpPort = stream.plainAudioTransport.rtcpTuple?.localPort || audioRtpPort + 1;

      stream.audioConsumer = await stream.plainAudioTransport.consume({
        producerId: stream.audioProducer.id,
        rtpCapabilities: stream.router.rtpCapabilities,
        paused: false,
      });

      console.log(`[Mediasoup] Audio RTP: ${audioRtpPort}, RTCP: ${audioRtcpPort}`);
    }

    // Generate SDP
    const sdp = generateSdp(
      videoRtpPort,
      stream.videoConsumer.rtpParameters,
      audioRtpPort,
      stream.audioConsumer?.rtpParameters
    );

    console.log('[Mediasoup] Generated SDP:\n', sdp);

    // Start FFmpeg for each destination
    for (const dest of stream.destinations) {
      if (dest.enabled === false) continue;

      const rtmpUrl = `${dest.rtmpUrl}/${dest.streamKey}`;
      console.log(`[Mediasoup] Starting FFmpeg for ${dest.platform}: ${dest.rtmpUrl}`);

      stream.ffmpegProcess = startFfmpeg(sdp, rtmpUrl, stream.config);

      stream.ffmpegProcess.on('close', (code) => {
        console.log(`[Mediasoup] FFmpeg closed with code ${code}`);
        stream.socket.emit('relay-stopped', { code });
      });
    }

    stream.socket.emit('relay-started', { message: 'RTMP relay started' });
    console.log('[Mediasoup] RTMP relay started successfully');

  } catch (error) {
    console.error('[Mediasoup] Error starting RTMP relay:', error);
    stream.socket.emit('error', { message: 'Failed to start RTMP relay: ' + error.message });
  }
}

/**
 * Generate SDP for FFmpeg
 */
function generateSdp(videoRtpPort, videoRtpParams, audioRtpPort, audioRtpParams) {
  const videoCodec = videoRtpParams.codecs[0];
  const videoPayloadType = videoCodec.payloadType;
  const videoClockRate = videoCodec.clockRate;
  const videoCodecName = videoCodec.mimeType.split('/')[1].toUpperCase();

  let sdp = `v=0
o=- 0 0 IN IP4 127.0.0.1
s=OnnPlay WebRTC Stream
c=IN IP4 127.0.0.1
t=0 0
m=video ${videoRtpPort} RTP/AVP ${videoPayloadType}
a=rtpmap:${videoPayloadType} ${videoCodecName}/${videoClockRate}
a=recvonly
`;

  if (audioRtpParams && audioRtpPort > 0) {
    const audioCodec = audioRtpParams.codecs[0];
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
function startFfmpeg(sdp, rtmpUrl, streamConfig) {
  const args = [
    // Input from SDP
    '-protocol_whitelist', 'pipe,udp,rtp',
    '-fflags', '+genpts+discardcorrupt',
    '-f', 'sdp',
    '-i', 'pipe:0',
    
    // Video encoding
    '-map', '0:v:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-profile:v', 'high',
    '-level', '4.1',
    '-b:v', `${streamConfig.videoBitrate}`,
    '-maxrate', `${Math.floor(streamConfig.videoBitrate * 1.5)}`,
    '-bufsize', `${streamConfig.videoBitrate * 2}`,
    '-g', `${streamConfig.frameRate}`,
    '-keyint_min', `${streamConfig.frameRate}`,
    '-sc_threshold', '0',
    '-bf', '2',
    '-flags', '+cgop',
    '-pix_fmt', 'yuv420p',
    
    // Audio encoding
    '-map', '0:a:0?',
    '-c:a', 'aac',
    '-b:a', `${streamConfig.audioBitrate}`,
    '-ar', '48000',
    '-ac', '2',
    
    // Output
    '-f', 'flv',
    '-flvflags', 'no_duration_filesize',
    rtmpUrl,
  ];

  console.log('[Mediasoup] FFmpeg command:', 'ffmpeg', args.join(' '));

  const ffmpeg = spawn('ffmpeg', args);

  // Write SDP to stdin
  if (ffmpeg.stdin) {
    ffmpeg.stdin.write(sdp);
    ffmpeg.stdin.end();
  }

  // Log stderr
  if (ffmpeg.stderr) {
    ffmpeg.stderr.setEncoding('utf-8');
    ffmpeg.stderr.on('data', (data) => {
      const line = data.trim();
      if (line.includes('frame=') || line.includes('fps=') || line.includes('Error') || line.includes('error')) {
        console.log('[FFmpeg]', line);
      }
    });
  }

  ffmpeg.on('error', (error) => {
    console.error('[Mediasoup] FFmpeg error:', error);
  });

  return ffmpeg;
}

/**
 * Stop stream
 */
async function stopStream(socketId) {
  const stream = activeStreams.get(socketId);
  if (!stream) return;

  console.log(`[Mediasoup] Stopping stream for ${socketId}`);

  // Kill FFmpeg
  if (stream.ffmpegProcess) {
    stream.ffmpegProcess.kill('SIGINT');
  }

  // Close consumers
  if (stream.videoConsumer) stream.videoConsumer.close();
  if (stream.audioConsumer) stream.audioConsumer.close();

  // Close producers
  if (stream.videoProducer) stream.videoProducer.close();
  if (stream.audioProducer) stream.audioProducer.close();

  // Close transports
  if (stream.webRtcTransport) stream.webRtcTransport.close();
  if (stream.plainVideoTransport) stream.plainVideoTransport.close();
  if (stream.plainAudioTransport) stream.plainAudioTransport.close();

  // Close router
  if (stream.router) stream.router.close();

  activeStreams.delete(socketId);
  console.log(`[Mediasoup] Stream stopped for ${socketId}`);
}

/**
 * Main
 */
async function main() {
  console.log('[Mediasoup] Starting server...');
  
  // Create workers
  await createWorkers();
  
  // Create HTTP server
  const server = http.createServer();
  
  // Create Socket.IO server
  const io = new SocketIOServer(server, {
    path: '/webrtc-stream',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 120000,
    pingInterval: 10000,
  });

  io.on('connection', handleConnection);

  // Start server
  server.listen(PORT, () => {
    console.log(`[Mediasoup] Server running on port ${PORT}`);
    console.log(`[Mediasoup] WebSocket path: /webrtc-stream`);
    console.log(`[Mediasoup] Announced IP: ${ANNOUNCED_IP}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Mediasoup] SIGTERM received, shutting down...');
    for (const socketId of activeStreams.keys()) {
      await stopStream(socketId);
    }
    for (const worker of workers) {
      worker.close();
    }
    process.exit(0);
  });
}

main().catch(console.error);
