/**
 * RTMPStreamingService - Relay Edition
 * 
 * Receives pre-encoded WebM chunks from browser and relays to RTMP destinations.
 * Uses FFmpeg only to remux (copy) the stream, NOT to re-encode.
 * 
 * This is extremely lightweight - server just passes data through.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { spawn, ChildProcess } from 'child_process';

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

interface ActiveRelay {
  socketId: string;
  destinations: StreamDestination[];
  config: StreamConfig;
  ffmpegProcesses: Map<string, ChildProcess>;
  startTime: Date;
  bytesReceived: number;
}

export class RTMPStreamingService {
  private io: SocketIOServer | null = null;
  private activeRelays: Map<string, ActiveRelay> = new Map();

  /**
   * Initialize the Socket.IO server for streaming
   */
  initialize(httpServer: HTTPServer): void {
    console.log('[RTMPStreamingService] Initializing Socket.IO server (Relay Mode)...');
    
    this.io = new SocketIOServer(httpServer, {
      path: '/socket.io/stream',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['polling', 'websocket'],
      allowUpgrades: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for video chunks
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[RTMPStreamingService] ✅ New Socket.IO connection: ${socket.id}`);
      
      socket.emit('connected', { message: 'Connected to RTMP relay service' });

      // Handle relay start (new method for pre-encoded streams)
      socket.on('start-relay', (data: { destinations: StreamDestination[]; config: StreamConfig }) => {
        this.handleStartRelay(socket, data);
      });

      // Handle legacy start (for backwards compatibility)
      socket.on('start', (data: { destinations: StreamDestination[]; config: StreamConfig }) => {
        this.handleStartRelay(socket, data);
      });

      // Handle video chunks from MediaRecorder
      socket.on('video-chunk', (data: { data: ArrayBuffer; timestamp: number }) => {
        this.handleVideoChunk(socket, data);
      });

      // Handle legacy frame (for backwards compatibility)
      socket.on('frame', (data: { frameNumber: number; data: ArrayBuffer; timestamp: number }) => {
        this.handleVideoChunk(socket, { data: data.data, timestamp: data.timestamp });
      });

      socket.on('stop', () => {
        this.handleStop(socket);
      });

      socket.on('disconnect', (reason: string) => {
        console.log(`[RTMPStreamingService] Socket disconnected: ${socket.id}, reason: ${reason}`);
        this.handleStop(socket);
      });
    });

    console.log('[RTMPStreamingService] ✅ Socket.IO server initialized (Relay Mode)');
  }

  /**
   * Handle start relay request
   */
  private handleStartRelay(socket: Socket, data: { destinations: StreamDestination[]; config: StreamConfig }): void {
    console.log(`[RTMPStreamingService] Start relay request from: ${socket.id}`);
    
    if (!data || !data.destinations || !Array.isArray(data.destinations)) {
      console.error(`[RTMPStreamingService] Invalid data: destinations is missing`);
      socket.emit('error', { message: 'Invalid data: destinations is required' });
      return;
    }
    
    console.log(`[RTMPStreamingService] Config:`, JSON.stringify(data.config));
    console.log(`[RTMPStreamingService] Targets: ${data.destinations.length}`);

    // Clean up any existing relay
    this.handleStop(socket);

    const activeRelay: ActiveRelay = {
      socketId: socket.id,
      destinations: data.destinations,
      config: data.config || { width: 1280, height: 720, frameRate: 30, videoBitrate: 2500000, audioBitrate: 128000 },
      ffmpegProcesses: new Map(),
      startTime: new Date(),
      bytesReceived: 0,
    };

    // Start FFmpeg relay process for each destination
    for (const dest of data.destinations) {
      this.startRelayProcess(socket, activeRelay, dest);
    }

    this.activeRelays.set(socket.id, activeRelay);
    socket.emit('started', { message: `Relay started to ${data.destinations.length} destinations` });
  }

  /**
   * Start FFmpeg relay process (copy mode - no re-encoding)
   */
  private startRelayProcess(socket: Socket, activeRelay: ActiveRelay, dest: StreamDestination): void {
    const rtmpFullUrl = `${dest.rtmpUrl}/${dest.streamKey}`;
    console.log(`[RTMPStreamingService] Starting FFmpeg relay for ${dest.platform}...`);
    console.log(`[RTMPStreamingService] RTMP URL: ${dest.rtmpUrl}/${dest.streamKey.substring(0, 10)}...`);

    // FFmpeg command to RELAY (not re-encode) WebM to RTMP
    // This is extremely fast because it just copies the data
    const ffmpegArgs = [
      // Logging
      '-loglevel', 'info',
      '-stats',
      
      // Input: WebM from stdin (already encoded by browser)
      '-f', 'webm',
      '-i', 'pipe:0',
      
      // Copy video codec (NO re-encoding!)
      '-c:v', 'copy',
      
      // Copy audio codec (NO re-encoding!)
      '-c:a', 'aac',
      '-b:a', '128k',
      
      // Output format
      '-f', 'flv',
      
      // RTMP destination
      rtmpFullUrl,
    ];

    console.log(`[RTMPStreamingService] FFmpeg relay command: ffmpeg ${ffmpegArgs.join(' ')}`);

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    activeRelay.ffmpegProcesses.set(dest.id, ffmpeg);

    ffmpeg.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[FFmpeg Relay ${dest.platform}] ${output}`);
      }
    });

    ffmpeg.stderr?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        // Log all output for debugging
        console.log(`[FFmpeg Relay ${dest.platform}] ${output}`);
      }
    });

    ffmpeg.on('close', (code: number | null) => {
      console.log(`[RTMPStreamingService] FFmpeg relay closed for ${dest.platform} with code ${code}`);
      activeRelay.ffmpegProcesses.delete(dest.id);
      
      if (code !== 0 && code !== null) {
        socket.emit('error', { message: `FFmpeg relay for ${dest.platform} exited with code ${code}` });
      }
    });

    ffmpeg.on('error', (error: Error) => {
      console.error(`[RTMPStreamingService] FFmpeg relay error for ${dest.platform}:`, error);
      socket.emit('error', { message: `FFmpeg relay error: ${error.message}` });
    });

    console.log(`[RTMPStreamingService] FFmpeg relay started for ${dest.platform}, PID: ${ffmpeg.pid}`);
    console.log(`[RTMPStreamingService] ✅ Relay to ${dest.platform} started!`);
    socket.emit('status', { target: dest.platform, status: 'relay started' });
  }

  /**
   * Handle incoming video chunk (pre-encoded WebM)
   */
  private handleVideoChunk(socket: Socket, data: { data: ArrayBuffer; timestamp: number }): void {
    const activeRelay = this.activeRelays.get(socket.id);
    if (!activeRelay) {
      return;
    }

    const chunkBuffer = Buffer.from(data.data);
    activeRelay.bytesReceived += chunkBuffer.length;

    // Log every 1MB received
    if (activeRelay.bytesReceived % (1024 * 1024) < chunkBuffer.length) {
      const mbReceived = (activeRelay.bytesReceived / (1024 * 1024)).toFixed(2);
      console.log(`[RTMPStreamingService] Received ${mbReceived} MB total`);
    }

    // Send chunk to all FFmpeg relay processes
    for (const [destId, ffmpeg] of activeRelay.ffmpegProcesses) {
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        try {
          ffmpeg.stdin.write(chunkBuffer);
        } catch (error) {
          console.error(`[RTMPStreamingService] Error writing chunk to FFmpeg ${destId}:`, error);
        }
      }
    }
  }

  /**
   * Handle stop request
   */
  private handleStop(socket: Socket): void {
    const activeRelay = this.activeRelays.get(socket.id);
    if (!activeRelay) {
      return;
    }

    console.log(`[RTMPStreamingService] Stopping relay for socket: ${socket.id}`);
    const mbReceived = (activeRelay.bytesReceived / (1024 * 1024)).toFixed(2);
    console.log(`[RTMPStreamingService] Total data relayed: ${mbReceived} MB`);

    // Stop all FFmpeg processes
    for (const [destId, ffmpeg] of activeRelay.ffmpegProcesses) {
      console.log(`[RTMPStreamingService] Stopping FFmpeg relay for ${destId}...`);
      
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        ffmpeg.stdin.end();
      }
      
      setTimeout(() => {
        if (!ffmpeg.killed) {
          ffmpeg.kill('SIGTERM');
        }
      }, 1000);
    }

    this.activeRelays.delete(socket.id);
    socket.emit('status', { target: 'all', status: 'stopped' });
  }

  /**
   * Stop all active relays
   */
  stopAllStreams(): void {
    console.log('[RTMPStreamingService] Stopping all relays...');
    
    for (const [socketId, activeRelay] of this.activeRelays) {
      for (const [destId, ffmpeg] of activeRelay.ffmpegProcesses) {
        if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
          ffmpeg.stdin.end();
        }
        if (!ffmpeg.killed) {
          ffmpeg.kill('SIGTERM');
        }
      }
    }
    
    this.activeRelays.clear();
  }
}

// Export singleton instance
export const rtmpStreamingService = new RTMPStreamingService();
export default rtmpStreamingService;
