/**
 * RTMPStreamingService - Professional YouTube Edition
 * 
 * Receives JPEG frames from browser and converts to RTMP stream.
 * Uses YouTube-recommended settings for reliable streaming.
 * 
 * YouTube Requirements:
 * - Codec: H.264 with CBR
 * - Bitrate: 3000-4000 Kbps for 720p@30fps
 * - Keyframe: Every 2 seconds
 * - Frame rate: 24-30 fps
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
      maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for larger frames
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

    // Use YouTube-recommended defaults
    const activeStream: ActiveStream = {
      socketId: socket.id,
      destinations: data.destinations,
      config: data.config || { 
        width: 1280, 
        height: 720, 
        frameRate: 30, 
        videoBitrate: 4000000, // 4 Mbps
        audioBitrate: 128000 
      },
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
   * Start FFmpeg process with YouTube-recommended settings
   * Based on: https://support.google.com/youtube/answer/2853702
   */
  private startFFmpegProcess(socket: Socket, activeStream: ActiveStream, dest: StreamDestination): void {
    const rtmpFullUrl = `${dest.rtmpUrl}/${dest.streamKey}`;
    console.log(`[RTMPStreamingService] Starting FFmpeg for ${dest.platform}...`);
    console.log(`[RTMPStreamingService] RTMP URL: ${dest.rtmpUrl}/${dest.streamKey.substring(0, 10)}...`);

    const { config } = activeStream;
    
    // YouTube requirements:
    // - 720p@30fps: 3-4 Mbps
    // - 1080p@30fps: 3-8 Mbps (recommended 10 Mbps)
    // - Keyframe every 2 seconds
    // - CBR encoding
    
    const targetFps = config.frameRate || 30;
    const targetWidth = config.width || 1280;
    const targetHeight = config.height || 720;
    
    // Calculate bitrate based on resolution
    let targetBitrate = '4000k'; // Default for 720p
    if (targetHeight >= 1080) {
      targetBitrate = '6000k';
    } else if (targetHeight >= 720) {
      targetBitrate = '4000k';
    } else {
      targetBitrate = '2500k';
    }
    
    const keyframeInterval = targetFps * 2; // Keyframe every 2 seconds

    // YouTube-recommended FFmpeg settings
    const ffmpegArgs = [
      // Logging
      '-loglevel', 'warning',
      '-stats',
      
      // Input: JPEG frames from stdin
      '-f', 'image2pipe',
      '-framerate', String(targetFps),
      '-i', 'pipe:0',
      
      // Video codec - YouTube recommended H.264 settings
      '-c:v', 'libx264',
      '-preset', 'veryfast',          // Good balance of speed/quality
      '-tune', 'zerolatency',         // Low latency for live
      '-profile:v', 'high',           // High profile for better quality
      '-level', '4.1',                // Level 4.1 for 1080p
      '-pix_fmt', 'yuv420p',          // Required for compatibility
      
      // Bitrate - CBR mode (YouTube requirement)
      '-b:v', targetBitrate,          // Target bitrate
      '-minrate', targetBitrate,      // Minimum = target for CBR
      '-maxrate', targetBitrate,      // Maximum = target for CBR
      '-bufsize', `${parseInt(targetBitrate) * 2}k`, // 2x bitrate buffer
      
      // Keyframe settings (YouTube: 2 seconds, max 4 seconds)
      '-g', String(keyframeInterval), // Keyframe every 2 seconds
      '-keyint_min', String(keyframeInterval),
      '-sc_threshold', '0',           // Disable scene change detection
      
      // B-frames and references (YouTube recommended)
      '-bf', '2',                     // 2 B-frames
      '-refs', '3',                   // 3 reference frames
      
      // Entropy coding
      '-coder', '1',                  // CABAC
      
      // Threading
      '-threads', '0',                // Auto-detect threads
      
      // Scaling
      '-vf', `scale=${targetWidth}:${targetHeight}:flags=lanczos,format=yuv420p`,
      
      // Output format
      '-f', 'flv',
      
      // RTMP output
      rtmpFullUrl,
    ];

    console.log(`[RTMPStreamingService] FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);
    console.log(`[RTMPStreamingService] Target: ${targetWidth}x${targetHeight} @ ${targetFps}fps, ${targetBitrate}`);

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
          const fpsMatch = output.match(/fps=\s*([\d.]+)/);
          const bitrateMatch = output.match(/bitrate=\s*([\d.]+)kbits/);
          
          if (speedMatch) {
            const speed = parseFloat(speedMatch[1]);
            const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
            const bitrate = bitrateMatch ? parseFloat(bitrateMatch[1]) : 0;
            
            if (speed < 0.9) {
              console.warn(`[FFmpeg ${dest.platform}] ⚠️ Speed ${speed}x (fps=${fps}, bitrate=${bitrate}kbps) - TOO SLOW!`);
            } else {
              console.log(`[FFmpeg ${dest.platform}] ✅ Speed ${speed}x (fps=${fps}, bitrate=${bitrate}kbps)`);
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

    // Log every 30 frames (once per second at 30fps)
    if (activeStream.frameCount % 30 === 0) {
      const elapsed = (Date.now() - activeStream.startTime.getTime()) / 1000;
      const fps = activeStream.frameCount / elapsed;
      console.log(`[RTMPStreamingService] Frame ${data.frameNumber}: ${(frameBuffer.length / 1024).toFixed(1)} KB, avg ${fps.toFixed(1)} fps`);
    }

    // Send frame to all FFmpeg processes
    for (const [destId, ffmpeg] of activeStream.ffmpegProcesses) {
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        try {
          const written = ffmpeg.stdin.write(frameBuffer);
          if (!written) {
            // Buffer full, wait for drain
            ffmpeg.stdin.once('drain', () => {
              // Buffer drained, can continue
            });
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
