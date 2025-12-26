/**
 * RTMPStreamingService
 * 
 * Handles RTMP streaming from browser to YouTube/Twitch/Facebook/Custom RTMP servers.
 * Receives JPEG frames from frontend via Socket.IO and uses FFmpeg to convert to H.264 RTMP stream.
 * 
 * Uses Socket.IO for better proxy compatibility (Railway, etc.)
 * Uses JPEG frame input for better FFmpeg compatibility.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[RTMPStreamingService] ✅ New Socket.IO connection: ${socket.id}`);
      
      socket.emit('connected', { message: 'Connected to RTMP streaming service' });

      socket.on('start', (data: { destinations: StreamDestination[]; config: StreamConfig }) => {
        this.handleStart(socket, data);
      });

      socket.on('frame', (data: { frameNumber: number; data: ArrayBuffer; timestamp: number }) => {
        this.handleFrame(socket, data);
      });

      socket.on('stop', () => {
        this.handleStop(socket);
      });

      socket.on('disconnect', (reason: string) => {
        console.log(`[RTMPStreamingService] Socket disconnected: ${socket.id}, reason: ${reason}`);
        this.handleStop(socket);
      });
    });

    console.log('[RTMPStreamingService] ✅ Socket.IO server initialized on path /socket.io/stream');
  }

  /**
   * Handle start streaming request
   */
  private handleStart(socket: Socket, data: { destinations: StreamDestination[]; config: StreamConfig }): void {
    console.log(`[RTMPStreamingService] Start request from: ${socket.id}`);
    console.log(`[RTMPStreamingService] Config:`, JSON.stringify(data.config));
    console.log(`[RTMPStreamingService] Targets: ${data.destinations.length}`);

    // Clean up any existing stream for this socket
    this.handleStop(socket);

    const activeStream: ActiveStream = {
      socketId: socket.id,
      destinations: data.destinations,
      config: data.config,
      ffmpegProcesses: new Map(),
      startTime: new Date(),
      frameCount: 0,
    };

    // Start FFmpeg process for each destination
    for (const dest of data.destinations) {
      this.startFFmpegProcess(socket, activeStream, dest);
    }

    this.activeStreams.set(socket.id, activeStream);
    socket.emit('started', { message: `Streaming started to ${data.destinations.length} destinations` });
  }

  /**
   * Start FFmpeg process for a destination
   */
  private startFFmpegProcess(socket: Socket, activeStream: ActiveStream, dest: StreamDestination): void {
    const rtmpFullUrl = `${dest.rtmpUrl}/${dest.streamKey}`;
    console.log(`[RTMPStreamingService] Starting FFmpeg for ${dest.platform}...`);
    console.log(`[RTMPStreamingService] RTMP URL: ${dest.rtmpUrl}/${dest.streamKey.substring(0, 10)}...`);

    const { config } = activeStream;

    // FFmpeg command to convert JPEG frames to H.264 RTMP stream
    // Input: JPEG frames from stdin (image2pipe)
    // Output: H.264 video to RTMP
    const ffmpegArgs = [
      // Logging
      '-loglevel', 'warning',
      '-stats',
      
      // Input: JPEG frames from stdin
      '-f', 'image2pipe',
      '-framerate', String(config.frameRate),
      '-i', 'pipe:0',
      
      // Video codec settings
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-profile:v', 'baseline',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      
      // Bitrate control
      '-b:v', `${Math.round(config.videoBitrate / 1000)}k`,
      '-maxrate', `${Math.round(config.videoBitrate * 1.2 / 1000)}k`,
      '-bufsize', `${Math.round(config.videoBitrate * 2 / 1000)}k`,
      
      // GOP and keyframe settings for streaming
      '-g', String(config.frameRate * 2), // Keyframe every 2 seconds
      '-keyint_min', String(config.frameRate),
      '-sc_threshold', '0',
      
      // Output format
      '-f', 'flv',
      
      // RTMP destination
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
        // Filter out progress stats (frame=, fps=, etc.)
        if (output.includes('frame=') || output.includes('fps=')) {
          // Log progress every 30 frames
          if (activeStream.frameCount % 30 === 0) {
            console.log(`[FFmpeg ${dest.platform}] ${output}`);
          }
        } else if (output.toLowerCase().includes('error')) {
          console.error(`[FFmpeg ${dest.platform} ERROR] ${output}`);
        } else {
          console.log(`[FFmpeg ${dest.platform}] ${output}`);
        }
      }
    });

    ffmpeg.on('close', (code: number | null) => {
      console.log(`[RTMPStreamingService] FFmpeg closed for ${dest.platform} with code ${code}`);
      activeStream.ffmpegProcesses.delete(dest.id);
      
      if (code !== 0 && code !== null) {
        socket.emit('error', { message: `FFmpeg process for ${dest.platform} exited with code ${code}` });
      }
    });

    ffmpeg.on('error', (error: Error) => {
      console.error(`[RTMPStreamingService] FFmpeg error for ${dest.platform}:`, error);
      socket.emit('error', { message: `FFmpeg error: ${error.message}` });
    });

    console.log(`[RTMPStreamingService] FFmpeg process started for ${dest.platform}, PID: ${ffmpeg.pid}`);
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
    const frameBuffer = Buffer.from(data.data);

    // Log every 30 frames (1 second at 30fps)
    if (activeStream.frameCount % 30 === 0) {
      console.log(`[RTMPStreamingService] Received frame ${data.frameNumber}: ${frameBuffer.length} bytes`);
    }

    // Send frame to all FFmpeg processes
    for (const [destId, ffmpeg] of activeStream.ffmpegProcesses) {
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        try {
          ffmpeg.stdin.write(frameBuffer);
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
      
      // Close stdin to signal end of input
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        ffmpeg.stdin.end();
      }
      
      // Kill the process after a short delay
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
   * Stop all active streams (for cleanup)
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
