/**
 * RTMPStreamingService - Relay Edition
 * 
 * This service receives encoded video chunks from the browser (via MediaRecorder)
 * and relays them to RTMP destinations using FFmpeg.
 * 
 * The browser does the encoding, so the server just needs to:
 * 1. Receive WebM/H264 chunks via WebSocket
 * 2. Pipe them to FFmpeg
 * 3. FFmpeg remuxes (no re-encoding) and sends to RTMP
 * 
 * This is the same architecture used by StreamYard, Restream, etc.
 */

import { spawn, ChildProcess } from 'child_process';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

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
  ffmpegProcesses: Map<string, ChildProcess>;
  config: StreamConfig;
  bytesReceived: number;
  chunksReceived: number;
  startTime: number;
}

export class RTMPStreamingService {
  private io: SocketIOServer | null = null;
  private activeStreams: Map<string, ActiveStream> = new Map();

  constructor() {
    console.log('[RTMPStreamingService] Relay service initialized');
  }

  /**
   * Initialize the Socket.IO server for streaming
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      path: '/socket.io/stream',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      maxHttpBufferSize: 10 * 1024 * 1024, // 10MB max for video chunks
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.io.on('connection', (socket: Socket) => {
      console.log('[RTMPStreamingService] Client connected:', socket.id);
      
      // Acknowledge connection
      socket.emit('connected', { message: 'Connected to streaming server' });

      // Handle relay start (MediaRecorder mode)
      socket.on('start-relay', (data: { destinations: StreamDestination[]; config: StreamConfig }) => {
        this.handleStartRelay(socket, data.destinations, data.config);
      });

      // Handle video chunks from MediaRecorder
      socket.on('video-chunk', (chunk: ArrayBuffer) => {
        this.handleVideoChunk(socket.id, chunk);
      });

      // Handle stop
      socket.on('stop', () => {
        this.handleStop(socket.id);
      });

      // Handle disconnect
      socket.on('disconnect', (reason: string) => {
        console.log('[RTMPStreamingService] Client disconnected:', socket.id, reason);
        this.handleStop(socket.id);
      });
    });

    console.log('[RTMPStreamingService] Socket.IO server initialized');
  }

  /**
   * Handle start relay request
   */
  private handleStartRelay(socket: Socket, destinations: StreamDestination[], config: StreamConfig): void {
    console.log('[RTMPStreamingService] Starting relay for', destinations.length, 'destinations');
    console.log('[RTMPStreamingService] Config:', config);

    // Create active stream entry
    const activeStream: ActiveStream = {
      socket,
      destinations,
      ffmpegProcesses: new Map(),
      config,
      bytesReceived: 0,
      chunksReceived: 0,
      startTime: Date.now(),
    };

    // Start FFmpeg relay process for each destination
    for (const dest of destinations) {
      const ffmpeg = this.startRelayProcess(dest, config, socket);
      if (ffmpeg) {
        activeStream.ffmpegProcesses.set(dest.id, ffmpeg);
      }
    }

    this.activeStreams.set(socket.id, activeStream);
    
    socket.emit('relay-started', { 
      message: `Relay started to ${destinations.length} destinations` 
    });
  }

  /**
   * Start FFmpeg relay process for a destination
   * FFmpeg receives WebM from stdin and remuxes to RTMP (minimal CPU usage)
   */
  private startRelayProcess(dest: StreamDestination, config: StreamConfig, socket: Socket): ChildProcess | null {
    const rtmpUrl = `${dest.rtmpUrl}/${dest.streamKey}`;
    console.log(`[RTMPStreamingService] Starting relay to ${dest.platform}: ${dest.rtmpUrl}/****`);

    // Force minimum bitrate for YouTube (3000k minimum)
    const minBitrate = 3000000; // 3 Mbps minimum
    const targetBitrate = Math.max(config.videoBitrate || minBitrate, minBitrate);
    const bitrateStr = `${Math.floor(targetBitrate / 1000)}k`;
    
    console.log(`[FFmpeg Relay ${dest.platform}] Target bitrate: ${bitrateStr}`);
    
    // FFmpeg arguments for relay with proper YouTube settings
    const ffmpegArgs = [
      // Input from stdin (WebM from MediaRecorder)
      '-i', 'pipe:0',
      
      // Re-encode video with proper bitrate for YouTube
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      
      // Video settings for YouTube - FORCE HIGH BITRATE
      '-b:v', bitrateStr,
      '-minrate', bitrateStr,
      '-maxrate', bitrateStr,
      '-bufsize', `${Math.floor(targetBitrate * 2 / 1000)}k`,
      
      // Keyframe settings (YouTube requires keyframe every 2 seconds)
      '-g', `${config.frameRate * 2}`,
      '-keyint_min', `${config.frameRate * 2}`,
      '-sc_threshold', '0',
      
      // H.264 profile for YouTube compatibility
      '-profile:v', 'high',
      '-level', '4.1',
      '-bf', '2',
      
      // Pixel format
      '-pix_fmt', 'yuv420p',
      
      // Audio settings
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      
      // Output format
      '-f', 'flv',
      
      // RTMP output
      rtmpUrl,
    ];

    console.log(`[FFmpeg Relay ${dest.platform}] Starting with args:`, ffmpegArgs.slice(0, 10).join(' '), '...');

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Handle FFmpeg stdout (progress info)
    ffmpeg.stdout?.on('data', (data: Buffer) => {
      // Usually empty for FFmpeg
    });

    // Handle FFmpeg stderr (logs and progress)
    ffmpeg.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      
      // Parse progress info
      const speedMatch = output.match(/speed=\s*([\d.]+)x/);
      const fpsMatch = output.match(/fps=\s*([\d.]+)/);
      const bitrateMatch = output.match(/bitrate=\s*([\d.]+)kbits/);
      
      if (speedMatch || fpsMatch) {
        const speed = speedMatch ? parseFloat(speedMatch[1]) : 0;
        const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
        const bitrate = bitrateMatch ? bitrateMatch[1] : '0';
        
        if (speed >= 0.9) {
          console.log(`[FFmpeg Relay ${dest.platform}] ✅ Speed ${speed}x (fps=${fps}, bitrate=${bitrate}kbps) - OK`);
        } else if (speed > 0) {
          console.log(`[FFmpeg Relay ${dest.platform}] ⚠️ Speed ${speed}x (fps=${fps}, bitrate=${bitrate}kbps) - SLOW`);
        }
        
        // Send status to client
        socket.emit('status', {
          target: dest.id,
          status: speed >= 0.9 ? 'streaming' : 'slow',
          speed,
          fps,
          bitrate: parseFloat(bitrate),
        });
      }
      
      // Log errors
      if (output.includes('Error') || output.includes('error')) {
        console.error(`[FFmpeg Relay ${dest.platform}] Error:`, output.trim());
      }
    });

    // Handle FFmpeg close
    ffmpeg.on('close', (code: number | null) => {
      console.log(`[FFmpeg Relay ${dest.platform}] Process closed with code ${code}`);
      socket.emit('status', {
        target: dest.id,
        status: code === 0 ? 'stopped' : 'error',
      });
    });

    // Handle FFmpeg error
    ffmpeg.on('error', (error: Error) => {
      console.error(`[FFmpeg Relay ${dest.platform}] Process error:`, error.message);
      socket.emit('error', { message: `FFmpeg error: ${error.message}` });
    });

    return ffmpeg;
  }

  /**
   * Handle incoming video chunk from MediaRecorder
   */
  private handleVideoChunk(socketId: string, chunk: ArrayBuffer): void {
    const activeStream = this.activeStreams.get(socketId);
    if (!activeStream) {
      return;
    }

    const buffer = Buffer.from(chunk);
    activeStream.bytesReceived += buffer.length;
    activeStream.chunksReceived++;

    // Log progress periodically
    if (activeStream.chunksReceived % 100 === 0) {
      const elapsed = (Date.now() - activeStream.startTime) / 1000;
      const mbReceived = activeStream.bytesReceived / 1024 / 1024;
      const bitrate = (activeStream.bytesReceived * 8 / elapsed / 1000).toFixed(0);
      console.log(`[RTMPStreamingService] Received ${activeStream.chunksReceived} chunks, ${mbReceived.toFixed(2)} MB, ${bitrate} Kbps`);
    }

    // Write chunk to all FFmpeg processes
    for (const [destId, ffmpeg] of activeStream.ffmpegProcesses) {
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        try {
          ffmpeg.stdin.write(buffer);
        } catch (e) {
          console.error(`[RTMPStreamingService] Error writing to FFmpeg ${destId}:`, e);
        }
      }
    }
  }

  /**
   * Handle stop request
   */
  private handleStop(socketId: string): void {
    const activeStream = this.activeStreams.get(socketId);
    if (!activeStream) {
      return;
    }

    console.log('[RTMPStreamingService] Stopping stream for', socketId);

    // Close all FFmpeg processes
    for (const [destId, ffmpeg] of activeStream.ffmpegProcesses) {
      console.log(`[RTMPStreamingService] Closing FFmpeg for ${destId}`);
      
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed) {
        ffmpeg.stdin.end();
      }
      
      // Give FFmpeg time to finish, then kill
      setTimeout(() => {
        if (!ffmpeg.killed) {
          ffmpeg.kill('SIGTERM');
        }
      }, 2000);
    }

    // Log final stats
    const elapsed = (Date.now() - activeStream.startTime) / 1000;
    const mbReceived = activeStream.bytesReceived / 1024 / 1024;
    console.log(`[RTMPStreamingService] Stream ended. Duration: ${elapsed.toFixed(0)}s, Data: ${mbReceived.toFixed(2)} MB`);

    this.activeStreams.delete(socketId);
  }

  /**
   * Get active streams count
   */
  getActiveStreamsCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Stop all active streams (for graceful shutdown)
   */
  stopAllStreams(): void {
    console.log(`[RTMPStreamingService] Stopping all ${this.activeStreams.size} active streams...`);
    
    for (const [socketId, stream] of this.activeStreams) {
      try {
        if (stream.ffmpegProcess && !stream.ffmpegProcess.killed) {
          stream.ffmpegProcess.kill('SIGTERM');
        }
      } catch (error) {
        console.error(`[RTMPStreamingService] Error stopping stream ${socketId}:`, error);
      }
    }
    
    this.activeStreams.clear();
    console.log('[RTMPStreamingService] All streams stopped');
  }
}

// Export singleton instance
export const rtmpStreamingService = new RTMPStreamingService();
