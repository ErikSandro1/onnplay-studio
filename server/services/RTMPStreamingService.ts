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
 * 
 * UPDATED: Increased timeouts and added heartbeat for stable long-running streams
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
  lastChunkTime: number; // Track last chunk received for health monitoring
  heartbeatInterval?: NodeJS.Timeout; // Heartbeat interval
}

export class RTMPStreamingService {
  private io: SocketIOServer | null = null;
  private activeStreams: Map<string, ActiveStream> = new Map();

  constructor() {
    console.log('[RTMPStreamingService] Relay service initialized');
  }

  /**
   * Initialize the Socket.IO server for streaming
   * UPDATED: Increased timeouts significantly for stable streaming
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      path: '/socket.io/stream',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      maxHttpBufferSize: 50 * 1024 * 1024, // 50MB max for video chunks (increased from 10MB)
      pingTimeout: 120000,    // 2 minutes (increased from 60s) - time to wait for pong
      pingInterval: 10000,    // 10 seconds (decreased from 25s) - more frequent pings
      connectTimeout: 60000,  // 60 seconds connection timeout
      upgradeTimeout: 30000,  // 30 seconds upgrade timeout
      transports: ['websocket', 'polling'], // Prefer websocket but allow polling fallback
      allowUpgrades: true,
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

      // Handle heartbeat from client (keep-alive)
      socket.on('heartbeat', () => {
        const stream = this.activeStreams.get(socket.id);
        if (stream) {
          stream.lastChunkTime = Date.now();
        }
        socket.emit('heartbeat-ack', { timestamp: Date.now() });
      });

      // Handle stop
      socket.on('stop', () => {
        this.handleStop(socket.id);
      });

      // Handle disconnect with reason logging
      socket.on('disconnect', (reason: string) => {
        console.log('[RTMPStreamingService] Client disconnected:', socket.id, 'Reason:', reason);
        
        // Log more details about the disconnect
        if (reason === 'ping timeout') {
          console.warn('[RTMPStreamingService] ⚠️ Client disconnected due to ping timeout - possible network issue');
        } else if (reason === 'transport close') {
          console.warn('[RTMPStreamingService] ⚠️ Client disconnected due to transport close - connection was closed');
        } else if (reason === 'transport error') {
          console.error('[RTMPStreamingService] ❌ Client disconnected due to transport error');
        }
        
        this.handleStop(socket.id);
      });

      // Handle connection errors
      socket.on('error', (error: Error) => {
        console.error('[RTMPStreamingService] Socket error:', socket.id, error.message);
      });
    });

    console.log('[RTMPStreamingService] Socket.IO server initialized with enhanced stability settings');
  }

  /**
   * Handle start relay request
   * UPDATED: Added heartbeat monitoring
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
      lastChunkTime: Date.now(),
    };

    // Start FFmpeg relay process for each destination
    for (const dest of destinations) {
      const ffmpeg = this.startRelayProcess(dest, config, socket);
      if (ffmpeg) {
        activeStream.ffmpegProcesses.set(dest.id, ffmpeg);
      }
    }

    // Start heartbeat monitoring - check every 30 seconds if stream is healthy
    activeStream.heartbeatInterval = setInterval(() => {
      this.checkStreamHealth(socket.id);
    }, 30000);

    this.activeStreams.set(socket.id, activeStream);
    
    socket.emit('relay-started', { 
      message: `Relay started to ${destinations.length} destinations`,
      heartbeatInterval: 10000, // Tell client to send heartbeat every 10 seconds
    });
  }

  /**
   * Check stream health - warn if no data received recently
   */
  private checkStreamHealth(socketId: string): void {
    const stream = this.activeStreams.get(socketId);
    if (!stream) return;

    const timeSinceLastChunk = Date.now() - stream.lastChunkTime;
    const elapsed = (Date.now() - stream.startTime) / 1000;

    if (timeSinceLastChunk > 30000) {
      console.warn(`[RTMPStreamingService] ⚠️ Stream ${socketId} - No data received for ${(timeSinceLastChunk/1000).toFixed(0)}s`);
      stream.socket.emit('warning', { 
        message: 'No video data received recently',
        lastChunkAgo: timeSinceLastChunk 
      });
    } else {
      console.log(`[RTMPStreamingService] ✅ Stream ${socketId} healthy - ${elapsed.toFixed(0)}s elapsed, ${stream.chunksReceived} chunks`);
    }
  }

  /**
   * Start FFmpeg relay process for a destination
   * FFmpeg receives WebM from stdin and remuxes to RTMP
   * Using proven parameters from working backup
   */
  private startRelayProcess(dest: StreamDestination, config: StreamConfig, socket: Socket): ChildProcess | null {
    const rtmpUrl = `${dest.rtmpUrl}/${dest.streamKey}`;
    console.log(`[RTMPStreamingService] Starting relay to ${dest.platform}: ${dest.rtmpUrl}/****`);
    console.log(`[FFmpeg ${dest.platform}] Full RTMP URL:`, rtmpUrl);

    // Fixed output bitrates (proven to work)
    const OUTPUT_VIDEO_BITRATE = 2500; // 2.5 Mbps (reduced for stability)
    const OUTPUT_AUDIO_BITRATE = 128;  // 128 kbps
    
    const videoBitrate = `${OUTPUT_VIDEO_BITRATE}k`;
    const audioBitrate = `${OUTPUT_AUDIO_BITRATE}k`;
    const bufsize = `${OUTPUT_VIDEO_BITRATE * 4}k`; // 4x buffer for stability
    
    console.log(`[FFmpeg ${dest.platform}] Output: ${videoBitrate}`);
    
    // FFmpeg arguments - optimized for stability with VBR
    const ffmpegArgs = [
      // Parameters for valid timestamps and stability
      '-fflags', '+genpts+igndts+discardcorrupt',
      '-use_wallclock_as_timestamps', '1',
      '-thread_queue_size', '8192', // Large buffer
      '-probesize', '32M',
      '-analyzeduration', '32M',
      '-err_detect', 'ignore_err', // Ignore input errors
      '-hide_banner', '-loglevel', 'warning',
      
      // Input from stdin (WebM from MediaRecorder)
      '-f', 'webm',
      '-i', 'pipe:0',
      
      // Video encoding - optimized for streaming stability
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-threads', '0', // Auto-detect threads
      
      // Video bitrate settings - VBR for better stability
      '-b:v', videoBitrate,
      '-maxrate', `${OUTPUT_VIDEO_BITRATE * 1.5}k`, // Allow 50% burst
      '-bufsize', bufsize,
      
      // x264 specific params - removed strict CBR for stability
      '-x264-params', 'force-cfr=1',
      
      // Keyframe settings (YouTube requires keyframe every 2 seconds)
      '-g', String(config.frameRate * 2),
      '-keyint_min', String(config.frameRate * 2),
      '-sc_threshold', '0',
      
      // H.264 profile (main works better than high for streaming)
      '-profile:v', 'main',
      '-level', '4.1',
      '-bf', '0',
      
      // Resolution and framerate (explicit)
      '-s', `${config.width}x${config.height}`,
      '-pix_fmt', 'yuv420p',
      '-r', String(config.frameRate),
      
      // Audio settings
      '-c:a', 'aac',
      '-b:a', audioBitrate,
      '-ar', '44100',
      '-ac', '2',
      
      // FLV output settings
      '-flvflags', 'no_duration_filesize',
      '-flush_packets', '0', // Don't flush immediately for stability
      '-max_interleave_delta', '0',
      '-f', 'flv',
      
      // RTMP output with timeout settings
      '-rtmp_live', 'live',
      '-rtmp_buffer', '3000', // 3 second buffer
      rtmpUrl,
    ];

    console.log(`[FFmpeg Relay ${dest.platform}] Starting with args:`, ffmpegArgs.slice(0, 10).join(' '), '...');

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // CRITICAL: Handle stdin errors to prevent server crash
    ffmpeg.stdin?.on('error', (err: any) => {
      if (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED') {
        console.log(`[FFmpeg Relay ${dest.platform}] stdin closed (expected when FFmpeg exits)`);
      } else {
        console.error(`[FFmpeg Relay ${dest.platform}] stdin error:`, err.message);
      }
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
    activeStream.lastChunkTime = Date.now(); // Update last chunk time

    // Log progress periodically
    if (activeStream.chunksReceived % 100 === 0) {
      const elapsed = (Date.now() - activeStream.startTime) / 1000;
      const mbReceived = activeStream.bytesReceived / 1024 / 1024;
      const bitrate = (activeStream.bytesReceived * 8 / elapsed / 1000).toFixed(0);
      console.log(`[RTMPStreamingService] Received ${activeStream.chunksReceived} chunks, ${mbReceived.toFixed(2)} MB, ${bitrate} Kbps`);
    }

    // Write chunk to all FFmpeg processes
    for (const [destId, ffmpeg] of activeStream.ffmpegProcesses) {
      if (ffmpeg.stdin && !ffmpeg.stdin.destroyed && ffmpeg.stdin.writable) {
        try {
          const canWrite = ffmpeg.stdin.write(buffer);
          if (!canWrite) {
            // Buffer is full, wait for drain
            ffmpeg.stdin.once('drain', () => {
              // Buffer drained, can continue
            });
          }
        } catch (e: any) {
          // Ignore EPIPE errors - FFmpeg may have closed
          if (e.code !== 'EPIPE' && e.code !== 'ERR_STREAM_DESTROYED') {
            console.error(`[RTMPStreamingService] Error writing to FFmpeg ${destId}:`, e.message);
          }
        }
      }
    }
  }

  /**
   * Handle stop request
   * UPDATED: Clear heartbeat interval
   */
  private handleStop(socketId: string): void {
    const activeStream = this.activeStreams.get(socketId);
    if (!activeStream) {
      return;
    }

    console.log('[RTMPStreamingService] Stopping stream for', socketId);

    // Clear heartbeat interval
    if (activeStream.heartbeatInterval) {
      clearInterval(activeStream.heartbeatInterval);
    }

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
   * Check if there are active streams
   */
  hasActiveStreams(): boolean {
    return this.activeStreams.size > 0;
  }

  /**
   * Get stats for all active streams
   */
  getStats(): object {
    const stats: any[] = [];
    for (const [socketId, stream] of this.activeStreams) {
      stats.push({
        socketId,
        destinations: stream.destinations.length,
        bytesReceived: stream.bytesReceived,
        chunksReceived: stream.chunksReceived,
        duration: (Date.now() - stream.startTime) / 1000,
        lastChunkAgo: (Date.now() - stream.lastChunkTime) / 1000,
      });
    }
    return { count: this.activeStreams.size, streams: stats };
  }

  /**
   * Stop all active streams (for graceful shutdown)
   */
  stopAllStreams(): void {
    console.log(`[RTMPStreamingService] Stopping all ${this.activeStreams.size} active streams...`);
    
    for (const [socketId, stream] of this.activeStreams) {
      try {
        // Clear heartbeat
        if (stream.heartbeatInterval) {
          clearInterval(stream.heartbeatInterval);
        }
        
        for (const [destId, ffmpeg] of stream.ffmpegProcesses) {
          if (ffmpeg && !ffmpeg.killed) {
            ffmpeg.kill('SIGTERM');
          }
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
