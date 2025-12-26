/**
 * RTMPStreamingService - Ultra-Optimized JPEG Edition
 * 
 * Receives JPEG frames from browser and converts to RTMP stream.
 * Uses extreme FFmpeg optimizations for real-time processing on limited CPU.
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

interface ActiveStream {
  socketId: string;
  destinations: StreamDestination[];
  config: StreamConfig;
  ffmpegProcesses: Map<string, ChildProcess>;
  startTime: Date;
  frameCount: number;
  lastFrameTime: number;
}

export class RTMPStreamingService {
  private io: SocketIOServer | null = null;
  private activeStreams: Map<string, ActiveStream> = new Map();

  /**
   * Initialize the Socket.IO server for streaming
   */
  initialize(httpServer: HTTPServer): void {
    console.log('[RTMPStreamingService] Initializing Socket.IO server...');
    
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
      maxHttpBufferSize: 5 * 1024 * 1024, // 5MB for frames
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[RTMPStreamingService] ✅ New Socket.IO connection: ${socket.id}`);
      
      socket.emit('connected', { message: 'Connected to RTMP streaming service' });

      socket.on('start', (data: { destinations: StreamDestination[]; config: StreamConfig }) => {
        this.handleStart(socket, data);
      });

      socket.on('start-relay', (data: { destinations: StreamDestination[]; config: StreamConfig }) => {
        this.handleStart(socket, data);
      });

      socket.on('frame', (data: { frameNumber: number; data: ArrayBuffer; timestamp: number }) => {
        this.handleFrame(socket, data);
      });

      socket.on('video-chunk', (data: { data: ArrayBuffer; timestamp: number }) => {
        // Convert video-chunk to frame format for compatibility
        const activeStream = this.activeStreams.get(socket.id);
        if (activeStream) {
          this.handleFrame(socket, { 
            frameNumber: activeStream.frameCount + 1, 
            data: data.data, 
            timestamp: data.timestamp 
          });
        }
      });

      socket.on('stop', () => {
        this.handleStop(socket);
      });

      socket.on('disconnect', (reason: string) => {
        console.log(`[RTMPStreamingService] Socket disconnected: ${socket.id}, reason: ${reason}`);
        this.handleStop(socket);
      });
    });

    console.log('[RTMPStreamingService] ✅ Socket.IO server initialized');
  }

  /**
   * Handle start streaming request
   */
  private handleStart(socket: Socket, data: { destinations: StreamDestination[]; config: StreamConfig }): void {
    console.log(`[RTMPStreamingService] Start request from: ${socket.id}`);
    
    if (!data || !data.destinations || !Array.isArray(data.destinations)) {
      console.error(`[RTMPStreamingService] Invalid data: destinations is missing`);
      socket.emit('error', { message: 'Invalid data: destinations is required' });
      return;
    }
    
    console.log(`[RTMPStreamingService] Config:`, JSON.stringify(data.config));
    console.log(`[RTMPStreamingService] Targets: ${data.destinations.length}`);

    // Clean up any existing stream
    this.handleStop(socket);

    const activeStream: ActiveStream = {
      socketId: socket.id,
      destinations: data.destinations,
      config: data.config || { width: 640, height: 360, frameRate: 10, videoBitrate: 800000, audioBitrate: 64000 },
      ffmpegProcesses: new Map(),
      startTime: new Date(),
      frameCount: 0,
      lastFrameTime: Date.now(),
    };

    // Start FFmpeg process for each destination
    for (const dest of data.destinations) {
      this.startFFmpegProcess(socket, activeStream, dest);
    }

    this.activeStreams.set(socket.id, activeStream);
    socket.emit('started', { message: `Streaming started to ${data.destinations.length} destinations` });
  }

  /**
   * Start FFmpeg process with EXTREME optimizations for Railway
   */
  private startFFmpegProcess(socket: Socket, activeStream: ActiveStream, dest: StreamDestination): void {
    const rtmpFullUrl = `${dest.rtmpUrl}/${dest.streamKey}`;
    console.log(`[RTMPStreamingService] Starting FFmpeg for ${dest.platform}...`);
    console.log(`[RTMPStreamingService] RTMP URL: ${dest.rtmpUrl}/${dest.streamKey.substring(0, 10)}...`);

    const { config } = activeStream;
    
    // Use higher framerate for AWS with more CPU
    const targetFps = Math.min(config.frameRate || 24, 30);

    // EXTREME optimization FFmpeg args for Railway
    const ffmpegArgs = [
      // Minimal logging
      '-loglevel', 'warning',
      
      // Input: JPEG frames from stdin
      '-f', 'image2pipe',
      '-framerate', String(targetFps),
      '-i', 'pipe:0',
      
      // Video codec - EXTREME speed settings
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-pix_fmt', 'yuv420p',
      
      // Quality/speed tradeoff - balanced for YouTube
      '-crf', '28',              // Good quality
      '-maxrate', '2500k',       // YouTube minimum for 720p
      '-bufsize', '5000k',
      
      // Minimize complexity
      '-refs', '1',
      '-bf', '0',
      '-g', String(targetFps * 2),  // Keyframe every 2 seconds
      '-sc_threshold', '0',
      
      // Use 2 threads for AWS
      '-threads', '2',
      
      // Fast scaling if needed
      '-vf', `scale=${config.width || 640}:${config.height || 360}:flags=fast_bilinear`,
      
      // Output
      '-f', 'flv',
      rtmpFullUrl,
    ];

    console.log(`[RTMPStreamingService] FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    activeStream.ffmpegProcesses.set(dest.id, ffmpeg);

    ffmpeg.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[FFmpeg ${dest.platform}] ${output}`);
      }
    });

    ffmpeg.stderr?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        // Log speed info
        if (output.includes('speed=')) {
          const speedMatch = output.match(/speed=\s*([\d.]+)x/);
          if (speedMatch) {
            const speed = parseFloat(speedMatch[1]);
            if (speed < 0.9) {
              console.warn(`[FFmpeg ${dest.platform}] ⚠️ Speed ${speed}x - encoding too slow!`);
            } else {
              console.log(`[FFmpeg ${dest.platform}] ✅ Speed ${speed}x`);
            }
          }
        }
        // Log errors
        if (output.toLowerCase().includes('error')) {
          console.error(`[FFmpeg ${dest.platform} ERROR] ${output}`);
        }
      }
    });

    ffmpeg.on('close', (code: number | null) => {
      console.log(`[RTMPStreamingService] FFmpeg closed for ${dest.platform} with code ${code}`);
      activeStream.ffmpegProcesses.delete(dest.id);
      
      if (code !== 0 && code !== null) {
        socket.emit('error', { message: `FFmpeg for ${dest.platform} exited with code ${code}` });
      }
    });

    ffmpeg.on('error', (error: Error) => {
      console.error(`[RTMPStreamingService] FFmpeg error for ${dest.platform}:`, error);
      socket.emit('error', { message: `FFmpeg error: ${error.message}` });
    });

    console.log(`[RTMPStreamingService] FFmpeg started for ${dest.platform}, PID: ${ffmpeg.pid}`);
    console.log(`[RTMPStreamingService] ✅ Stream to ${dest.platform} started!`);
    socket.emit('status', { target: dest.platform, status: 'streaming started' });
  }

  /**
   * Handle incoming JPEG frame
   */
  private handleFrame(socket: Socket, data: { frameNumber: number; data: ArrayBuffer; timestamp: number }): void {
    const activeStream = this.activeStreams.get(socket.id);
    if (!activeStream) {
      return;
    }

    activeStream.frameCount++;
    activeStream.lastFrameTime = Date.now();
    const frameBuffer = Buffer.from(data.data);

    // Log every 50 frames
    if (activeStream.frameCount % 50 === 0) {
      const elapsed = (Date.now() - activeStream.startTime.getTime()) / 1000;
      const fps = activeStream.frameCount / elapsed;
      console.log(`[RTMPStreamingService] Frame ${data.frameNumber}: ${frameBuffer.length} bytes, avg ${fps.toFixed(1)} fps`);
    }

    // Send frame to all FFmpeg processes
    for (const [destId, ffmpeg] of activeStream.ffmpegProcesses) {
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        try {
          const written = ffmpeg.stdin.write(frameBuffer);
          if (!written) {
            // Buffer full, skip frame
            console.warn(`[RTMPStreamingService] Buffer full for ${destId}, skipping frame`);
          }
        } catch (error) {
          console.error(`[RTMPStreamingService] Error writing frame to FFmpeg ${destId}:`, error);
        }
      }
    }
  }

  /**
   * Handle stop streaming request
   */
  private handleStop(socket: Socket): void {
    const activeStream = this.activeStreams.get(socket.id);
    if (!activeStream) {
      return;
    }

    console.log(`[RTMPStreamingService] Stopping stream for socket: ${socket.id}`);
    console.log(`[RTMPStreamingService] Total frames sent: ${activeStream.frameCount}`);

    // Stop all FFmpeg processes
    for (const [destId, ffmpeg] of activeStream.ffmpegProcesses) {
      console.log(`[RTMPStreamingService] Stopping FFmpeg for ${destId}...`);
      
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        ffmpeg.stdin.end();
      }
      
      setTimeout(() => {
        if (!ffmpeg.killed) {
          ffmpeg.kill('SIGTERM');
        }
      }, 1000);
    }

    this.activeStreams.delete(socket.id);
    socket.emit('status', { target: 'all', status: 'stopped' });
  }

  /**
   * Stop all active streams
   */
  stopAllStreams(): void {
    console.log('[RTMPStreamingService] Stopping all streams...');
    
    for (const [socketId, activeStream] of this.activeStreams) {
      for (const [destId, ffmpeg] of activeStream.ffmpegProcesses) {
        if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
          ffmpeg.stdin.end();
        }
        if (!ffmpeg.killed) {
          ffmpeg.kill('SIGTERM');
        }
      }
    }
    
    this.activeStreams.clear();
  }
}

// Export singleton instance
export const rtmpStreamingService = new RTMPStreamingService();
export default rtmpStreamingService;
