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

// BACKUP24 FIX: Queue per destination for backpressure
interface DestinationQueue {
  chunks: Buffer[];
  totalBytes: number;
  dropsCount: number;
  lastDrainTime: number;
  backpressureActive: boolean;
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
  // BACKUP24 FIX: Queue and backpressure properties
  destinationQueues: Map<string, DestinationQueue>;
  chunksDropped: number;
  lastBackpressureTime: number;
  lastMetricsTime: number;
}

// BACKUP24 FIX: Feature flags and limits
const ENABLE_BACKPRESSURE = false; // DISABLED - causes audio issues
const ENABLE_QUEUE = false; // DISABLED - direct pipe to FFmpeg
const MAX_QUEUE_BYTES = 5 * 1024 * 1024; // 5MB per destination
const MAX_QUEUE_CHUNKS = 50; // 50 chunks per destination
const BACKPRESSURE_SPEED_THRESHOLD = 0.95; // Emit backpressure if speed < 0.95x
const BACKPRESSURE_COOLDOWN_MS = 5000; // 5 seconds cooldown between backpressure events
const METRICS_INTERVAL_MS = 5000; // Send metrics every 5 seconds

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
      transports: ['websocket'], // BACKUP24 FIX: WebSocket only, NO polling
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
      socket.on('video-chunk', (payload: ArrayBuffer | { data: ArrayBuffer; destinations?: string[] }) => {
        // BACKUP25 FIX: Accept both old format (ArrayBuffer) and new format ({data, destinations})
        let chunk: ArrayBuffer;
        if (payload && typeof payload === 'object' && 'data' in payload) {
          chunk = (payload as { data: ArrayBuffer }).data;
        } else {
          chunk = payload as ArrayBuffer;
        }
        if (chunk) {
          this.handleVideoChunk(socket.id, chunk);
        }
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
      // BACKUP24 FIX: Queue and backpressure properties
      destinationQueues: new Map(),
      chunksDropped: 0,
      lastBackpressureTime: 0,
      lastMetricsTime: Date.now(),
    };

    // Start FFmpeg relay process for each destination
    for (const dest of destinations) {
      const ffmpeg = this.startRelayProcess(dest, config, socket);
      if (ffmpeg) {
        activeStream.ffmpegProcesses.set(dest.id, ffmpeg);
        
        // BACKUP24 FIX: Initialize queue for this destination
        activeStream.destinationQueues.set(dest.id, {
          chunks: [],
          totalBytes: 0,
          dropsCount: 0,
          lastDrainTime: Date.now(),
          backpressureActive: false,
        });
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

    // Dynamic output bitrates based on resolution - supports up to 4K
    // YouTube recommended bitrates:
    // 4K (2160p): 20,000-51,000 kbps
    // 1440p: 9,000-18,000 kbps  
    // 1080p: 4,500-9,000 kbps
    // 720p: 2,500-6,500 kbps
    // 480p: 1,000-2,000 kbps
    let OUTPUT_VIDEO_BITRATE: number;
    if (config.height >= 2160) {
      OUTPUT_VIDEO_BITRATE = 20000; // 4K
    } else if (config.height >= 1440) {
      OUTPUT_VIDEO_BITRATE = 12000; // 1440p
    } else if (config.height >= 1080) {
      OUTPUT_VIDEO_BITRATE = 6000; // 1080p
    } else if (config.height >= 720) {
      OUTPUT_VIDEO_BITRATE = 3000; // 720p - balanced quality/stability
    } else {
      OUTPUT_VIDEO_BITRATE = 2000; // 480p or lower
    }
    const OUTPUT_AUDIO_BITRATE = 128;  // 128 kbps AAC
    
    const videoBitrate = `${OUTPUT_VIDEO_BITRATE}k`;
    const audioBitrate = `${OUTPUT_AUDIO_BITRATE}k`;
    
    console.log(`[FFmpeg ${dest.platform}] Resolution: ${config.width}x${config.height}, Output: ${videoBitrate}`);
    
    // FFmpeg arguments - PROFESSIONAL STREAMING
    // Tries to copy video if H.264, otherwise re-encodes with ultrafast preset
    const ffmpegArgs = [
      // Input settings - auto-detect format (WebM or MP4)
      '-fflags', '+genpts+discardcorrupt+igndts+nobuffer',
      '-flags', 'low_delay',
      '-thread_queue_size', '4096',
      '-probesize', '500k',
      '-analyzeduration', '500k',
      '-err_detect', 'ignore_err',
      '-i', 'pipe:0',
      
      '-hide_banner', '-loglevel', 'info',
      
      // Video: Try to copy H.264, otherwise re-encode
      // Using libx264 with ultrafast for compatibility
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-b:v', videoBitrate,
      '-maxrate', `${OUTPUT_VIDEO_BITRATE * 1.2}k`,
      '-bufsize', `${OUTPUT_VIDEO_BITRATE * 2}k`,
      '-g', String(config.frameRate * 2), // Keyframe every 2 seconds
      '-keyint_min', String(config.frameRate),
      '-sc_threshold', '0',
      '-profile:v', 'baseline',
      '-level', '4.1',
      '-bf', '0', // No B-frames for lower latency
      '-threads', '0', // Use 4 threads
      '-pix_fmt', 'yuv420p',
      '-r', String(config.frameRate),
      '-vsync', 'cfr',
      
      // Audio: Always re-encode to AAC for RTMP compatibility
      '-c:a', 'aac',
      '-b:a', audioBitrate,
      '-ar', '48000',
      '-ac', '2',
      '-af', 'adelay=480|480,aresample=async=0',
      
      // FLV output for RTMP
      '-flvflags', 'no_duration_filesize',
      '-f', 'flv',
      
      // RTMP settings
      '-rtmp_live', 'live',
      '-rtmp_buffer', '1000',
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
      const dropMatch = output.match(/drop=\s*(\d+)/);
      const dupMatch = output.match(/dup=\s*(\d+)/);
      const frameMatch = output.match(/frame=\s*(\d+)/);
      
      if (speedMatch || fpsMatch) {
        const speed = speedMatch ? parseFloat(speedMatch[1]) : 0;
        const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
        const bitrate = bitrateMatch ? bitrateMatch[1] : '0';
        const drop = dropMatch ? parseInt(dropMatch[1]) : 0;
        const dup = dupMatch ? parseInt(dupMatch[1]) : 0;
        const frame = frameMatch ? parseInt(frameMatch[1]) : 0;
        
        // DIAGNOSTIC: Detailed FFmpeg log
        console.log(`[FFmpeg ${dest.platform}] speed=${speed}x fps=${fps} bitrate=${bitrate}kbps frame=${frame} drop=${drop} dup=${dup}`);
        
        if (speed < 0.9 && speed > 0) {
          console.warn(`[FFmpeg ${dest.platform}] ⚠️ SLOW ENCODING: speed=${speed}x`);
        }
        
        // Send status to client
        socket.emit('status', {
          target: dest.id,
          status: speed >= 0.9 ? 'streaming' : 'slow',
          speed,
          fps,
          bitrate: parseFloat(bitrate),
          drop,
          dup,
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
   * BACKUP24 FIX: Handle video chunk with backpressure and queue management
   */
  private handleVideoChunk(socketId: string, chunk: ArrayBuffer): void {
    const activeStream = this.activeStreams.get(socketId);
    if (!activeStream) {
      return;
    }

    const buffer = Buffer.from(chunk);
    activeStream.bytesReceived += buffer.length;
    activeStream.chunksReceived++;
    activeStream.lastChunkTime = Date.now();

    // BACKUP24 FIX: Log progress with queue stats
    if (activeStream.chunksReceived % 100 === 0) {
      const elapsed = (Date.now() - activeStream.startTime) / 1000;
      const mbReceived = activeStream.bytesReceived / 1024 / 1024;
      const bitrate = (activeStream.bytesReceived * 8 / elapsed / 1000).toFixed(0);
      
      // Calculate total queue stats
      let totalQueueBytes = 0;
      let totalQueueChunks = 0;
      for (const [, queue] of activeStream.destinationQueues) {
        totalQueueBytes += queue.totalBytes;
        totalQueueChunks += queue.chunks.length;
      }
      
      console.log(`[RTMPStreamingService] 📊 Stats: ${activeStream.chunksReceived} chunks, ${mbReceived.toFixed(2)} MB, ${bitrate} Kbps | Queue: ${totalQueueChunks} chunks, ${(totalQueueBytes / 1024).toFixed(2)} KB | Drops: ${activeStream.chunksDropped}`);
    }

    // BACKUP24 FIX: Send metrics to client periodically
    const now = Date.now();
    if (now - activeStream.lastMetricsTime >= METRICS_INTERVAL_MS) {
      this.sendMetricsToClient(activeStream);
      activeStream.lastMetricsTime = now;
    }

    // Write chunk to all FFmpeg processes with backpressure
    for (const [destId, ffmpeg] of activeStream.ffmpegProcesses) {
      if (!ffmpeg.stdin || ffmpeg.stdin.destroyed || !ffmpeg.stdin.writable) {
        continue;
      }

      const queue = activeStream.destinationQueues.get(destId);
      if (!queue) continue;

      // BACKUP24 FIX: Check if we need to drop chunks (queue full)
      if (ENABLE_QUEUE && (queue.totalBytes >= MAX_QUEUE_BYTES || queue.chunks.length >= MAX_QUEUE_CHUNKS)) {
        // Drop oldest chunk to make room (continuity > quality)
        const dropped = queue.chunks.shift();
        if (dropped) {
          queue.totalBytes -= dropped.length;
          queue.dropsCount++;
          activeStream.chunksDropped++;
          console.warn(`[RTMPStreamingService] ⚠️ DROPPED chunk for ${destId} (queue full: ${queue.chunks.length} chunks, ${(queue.totalBytes / 1024).toFixed(2)} KB)`);
        }
      }

      // Try to write directly first
      try {
        const canWrite = ffmpeg.stdin.write(buffer);
        
        if (!canWrite) {
          // BACKUP24 FIX: Buffer is full - apply backpressure
          queue.backpressureActive = true;
          const drainStartTime = Date.now();
          
          // Enqueue chunk instead of blocking
          if (ENABLE_QUEUE) {
            queue.chunks.push(buffer);
            queue.totalBytes += buffer.length;
          }
          
          // Set up drain handler to process queue
          ffmpeg.stdin.once('drain', () => {
            const drainTime = Date.now() - drainStartTime;
            queue.lastDrainTime = Date.now();
            queue.backpressureActive = false;
            
            // Log if drain took too long
            if (drainTime > 100) {
              console.warn(`[RTMPStreamingService] ⚠️ Drain for ${destId} took ${drainTime}ms`);
            }
            
            // Process queued chunks
            this.processDestinationQueue(activeStream, destId);
          });
          
          // BACKUP24 FIX: Emit backpressure event to client
          if (ENABLE_BACKPRESSURE && now - activeStream.lastBackpressureTime >= BACKPRESSURE_COOLDOWN_MS) {
            activeStream.lastBackpressureTime = now;
            activeStream.socket.emit('backpressure', {
              reason: 'stdin_buffer_full',
              destId,
              queueSize: queue.chunks.length,
              queueBytes: queue.totalBytes,
            });
            console.warn(`[RTMPStreamingService] 🔴 BACKPRESSURE emitted to client (${destId})`);
          }
        }
      } catch (e: any) {
        if (e.code !== 'EPIPE' && e.code !== 'ERR_STREAM_DESTROYED') {
          console.error(`[RTMPStreamingService] Error writing to FFmpeg ${destId}:`, e.message);
        }
      }
    }
  }

  /**
   * BACKUP24 FIX: Process queued chunks for a destination
   */
  private processDestinationQueue(activeStream: ActiveStream, destId: string): void {
    const queue = activeStream.destinationQueues.get(destId);
    const ffmpeg = activeStream.ffmpegProcesses.get(destId);
    
    if (!queue || !ffmpeg || !ffmpeg.stdin || ffmpeg.stdin.destroyed || !ffmpeg.stdin.writable) {
      return;
    }

    while (queue.chunks.length > 0) {
      const chunk = queue.chunks[0];
      
      try {
        const canWrite = ffmpeg.stdin.write(chunk);
        
        if (canWrite) {
          // Successfully written, remove from queue
          queue.chunks.shift();
          queue.totalBytes -= chunk.length;
        } else {
          // Buffer full again, wait for next drain
          queue.backpressureActive = true;
          ffmpeg.stdin.once('drain', () => {
            queue.backpressureActive = false;
            this.processDestinationQueue(activeStream, destId);
          });
          break;
        }
      } catch (e: any) {
        if (e.code !== 'EPIPE' && e.code !== 'ERR_STREAM_DESTROYED') {
          console.error(`[RTMPStreamingService] Error processing queue for ${destId}:`, e.message);
        }
        break;
      }
    }
  }

  /**
   * BACKUP24 FIX: Send metrics to client
   */
  private sendMetricsToClient(activeStream: ActiveStream): void {
    let totalQueueBytes = 0;
    let totalQueueChunks = 0;
    let totalDrops = 0;
    
    for (const [, queue] of activeStream.destinationQueues) {
      totalQueueBytes += queue.totalBytes;
      totalQueueChunks += queue.chunks.length;
      totalDrops += queue.dropsCount;
    }
    
    const elapsed = (Date.now() - activeStream.startTime) / 1000;
    const bitrate = (activeStream.bytesReceived * 8 / elapsed / 1000).toFixed(0);
    
    // DIAGNOSTIC: Log detailed metrics every 5s
    console.log(`[METRICS 5s] server_queue_chunks=${totalQueueChunks} server_queue_bytes=${totalQueueBytes} drops_server=${totalDrops} chunks_received=${activeStream.chunksReceived} bitrate=${bitrate}Kbps elapsed=${elapsed.toFixed(1)}s`);
    
    activeStream.socket.emit('metrics', {
      queueBytes: totalQueueBytes,
      queueChunks: totalQueueChunks,
      dropsServer: totalDrops,
      chunksReceived: activeStream.chunksReceived,
      bytesReceived: activeStream.bytesReceived,
      bitrate: parseInt(bitrate),
      elapsed: elapsed,
    });
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
