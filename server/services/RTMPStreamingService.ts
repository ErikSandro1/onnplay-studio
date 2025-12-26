/**
 * RTMPStreamingService - Backend service para streaming RTMP
 * 
 * Recebe dados de vídeo via Socket.IO do frontend e envia para
 * destinos RTMP (YouTube, Twitch, Facebook) usando FFmpeg com
 * conexão RTMP PERSISTENTE.
 * 
 * Usa Socket.IO para melhor compatibilidade com proxies (Railway, etc.)
 */

import { spawn, ChildProcess } from 'child_process';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server } from 'http';

interface StreamTarget {
  id: string;
  platform: string;
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
  target: StreamTarget;
  ffmpeg: ChildProcess;
  startTime: Date;
  bytesReceived: number;
  chunksReceived: number;
  lastLogTime: number;
  isReady: boolean;
}

interface ClientData {
  config?: StreamConfig;
  targets?: StreamTarget[];
}

export class RTMPStreamingService {
  private io: SocketIOServer | null = null;
  private activeStreams: Map<string, ActiveStream> = new Map();
  private clients: Map<string, ClientData> = new Map();

  /**
   * Inicializa o Socket.IO server
   */
  initialize(server: Server) {
    console.log('[RTMPStreamingService] Initializing Socket.IO server...');
    
    this.io = new SocketIOServer(server, {
      path: '/socket.io/stream',
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['polling', 'websocket'],
      allowUpgrades: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 50e6, // 50MB
      allowEIO3: true,
    });

    this.io.on('connection', (socket: Socket) => {
      console.log('[RTMPStreamingService] ✅ New Socket.IO connection:', socket.id);
      this.clients.set(socket.id, {});

      socket.emit('connected', { message: 'Connected to RTMP streaming service' });

      socket.on('start', (data) => this.handleStart(socket, data));
      socket.on('stop', () => this.handleStop(socket));
      socket.on('segment', (data) => this.handleSegment(socket, data));
      socket.on('chunk', (data) => this.handleChunk(socket, data));
      socket.on('ping', () => socket.emit('pong'));

      socket.on('disconnect', (reason) => {
        console.log('[RTMPStreamingService] Socket disconnected:', socket.id, reason);
        this.stopAllStreamsForClient(socket.id);
        this.clients.delete(socket.id);
      });

      socket.on('error', (error) => {
        console.error('[RTMPStreamingService] Socket error:', error);
      });
    });

    this.io.on('error', (error) => {
      console.error('[RTMPStreamingService] Socket.IO Server error:', error);
    });

    console.log('[RTMPStreamingService] ✅ Socket.IO server initialized on path /socket.io/stream');
  }

  /**
   * Handler para iniciar streaming - Cria conexão RTMP PERSISTENTE
   */
  private async handleStart(socket: Socket, data: { config: StreamConfig; targets: StreamTarget[] }) {
    console.log('[RTMPStreamingService] Start request from:', socket.id);
    console.log('[RTMPStreamingService] Config:', JSON.stringify(data.config));
    console.log('[RTMPStreamingService] Targets:', data.targets.length);

    this.clients.set(socket.id, { config: data.config, targets: data.targets });

    for (const target of data.targets) {
      try {
        console.log(`[RTMPStreamingService] Starting PERSISTENT FFmpeg for ${target.platform}...`);
        await this.startPersistentFFmpeg(target, data.config, socket);
        
        socket.emit('status', {
          targetId: target.id,
          status: 'streaming',
          message: `Streaming to ${target.platform} started`,
        });
        
        console.log(`[RTMPStreamingService] ✅ Stream to ${target.platform} started!`);
      } catch (error) {
        console.error(`[RTMPStreamingService] ❌ Failed to start stream to ${target.platform}:`, error);
        
        socket.emit('error', {
          targetId: target.id,
          error: error instanceof Error ? error.message : 'Failed to start stream',
        });
      }
    }
  }

  /**
   * Inicia FFmpeg com conexão RTMP persistente
   */
  private async startPersistentFFmpeg(target: StreamTarget, config: StreamConfig, socket: Socket): Promise<void> {
    const streamId = `${socket.id}:${target.id}`;
    
    // Construir URL RTMP completa
    const rtmpUrl = target.rtmpUrl.endsWith('/') 
      ? `${target.rtmpUrl}${target.streamKey}`
      : `${target.rtmpUrl}/${target.streamKey}`;

    console.log(`[RTMPStreamingService] RTMP URL: ${rtmpUrl.substring(0, 50)}...`);

    // FFmpeg com entrada via PIPE (stdin) - conexão PERSISTENTE
    const ffmpegArgs = [
      // Logging
      '-loglevel', 'info',
      '-stats',
      
      // Input via pipe - WebM format
      '-f', 'webm',
      '-i', 'pipe:0',
      
      // Video codec - H.264 para RTMP
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-profile:v', 'main',
      '-level', '4.0',
      '-b:v', `${Math.floor(config.videoBitrate / 1000)}k`,
      '-maxrate', `${Math.floor(config.videoBitrate / 1000)}k`,
      '-bufsize', `${Math.floor(config.videoBitrate / 500)}k`,
      '-pix_fmt', 'yuv420p',
      '-g', `${config.frameRate * 2}`, // Keyframe every 2 seconds
      '-keyint_min', `${config.frameRate}`,
      '-sc_threshold', '0',
      '-r', `${config.frameRate}`,
      
      // Video scaling
      '-vf', `scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease,pad=${config.width}:${config.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
      
      // Audio codec
      '-c:a', 'aac',
      '-b:a', `${Math.floor(config.audioBitrate / 1000)}k`,
      '-ar', '44100',
      '-ac', '2',
      
      // Output RTMP
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      rtmpUrl,
    ];

    console.log(`[RTMPStreamingService] FFmpeg command: ffmpeg ${ffmpegArgs.join(' ').substring(0, 200)}...`);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!ffmpeg.stdin) {
        reject(new Error('FFmpeg stdin not available'));
        return;
      }

      const stream: ActiveStream = {
        target,
        ffmpeg,
        startTime: new Date(),
        bytesReceived: 0,
        chunksReceived: 0,
        lastLogTime: Date.now(),
        isReady: false,
      };

      this.activeStreams.set(streamId, stream);

      // Handle FFmpeg stdout
      ffmpeg.stdout?.on('data', (data: Buffer) => {
        console.log(`[FFmpeg ${target.platform} stdout]`, data.toString().trim());
      });

      // Handle FFmpeg stderr (progress and errors)
      ffmpeg.stderr?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        
        // Check for errors
        if (output.toLowerCase().includes('error') || output.includes('Invalid')) {
          console.error(`[FFmpeg ${target.platform} ERROR]`, output);
          socket.emit('error', {
            targetId: target.id,
            error: output,
          });
        } 
        // Log progress periodically
        else if (output.includes('frame=') || output.includes('fps=') || output.includes('bitrate=')) {
          stream.isReady = true;
          const now = Date.now();
          if (now - stream.lastLogTime > 3000) {
            console.log(`[FFmpeg ${target.platform}]`, output.substring(0, 150));
            stream.lastLogTime = now;
            
            // Send stats to client
            socket.emit('stats', {
              targetId: target.id,
              bytesReceived: stream.bytesReceived,
              chunksReceived: stream.chunksReceived,
              uptime: Math.floor((Date.now() - stream.startTime.getTime()) / 1000),
            });
          }
        }
        // Log other messages
        else if (output.length > 0) {
          console.log(`[FFmpeg ${target.platform}]`, output.substring(0, 200));
        }
      });

      ffmpeg.on('close', (code) => {
        console.log(`[RTMPStreamingService] FFmpeg closed for ${target.platform} with code ${code}`);
        this.activeStreams.delete(streamId);
        
        socket.emit('status', {
          targetId: target.id,
          status: 'stopped',
          message: `Stream to ${target.platform} ended`,
        });
      });

      ffmpeg.on('error', (error) => {
        console.error(`[RTMPStreamingService] FFmpeg error for ${target.platform}:`, error);
        this.activeStreams.delete(streamId);
        reject(error);
      });

      // Handle stdin errors (broken pipe)
      ffmpeg.stdin.on('error', (error) => {
        console.error(`[RTMPStreamingService] FFmpeg stdin error:`, error.message);
      });

      // FFmpeg started successfully
      console.log(`[RTMPStreamingService] FFmpeg process started for ${target.platform}, PID: ${ffmpeg.pid}`);
      resolve();
    });
  }

  /**
   * Handler para parar streaming
   */
  private handleStop(socket: Socket) {
    console.log('[RTMPStreamingService] Stop request from:', socket.id);
    this.stopAllStreamsForClient(socket.id);
    socket.emit('stopped', { message: 'All streams stopped' });
  }

  /**
   * Handler para segmentos de vídeo - envia para FFmpeg via stdin
   */
  private handleSegment(socket: Socket, data: { segmentNumber: number; data: ArrayBuffer | Buffer; mimeType: string; duration: number }) {
    const clientData = this.clients.get(socket.id);
    if (!clientData?.targets) return;

    const buffer = Buffer.isBuffer(data.data) ? data.data : Buffer.from(data.data);
    
    console.log(`[RTMPStreamingService] Received segment ${data.segmentNumber}: ${buffer.length} bytes`);

    // Enviar para cada stream ativo
    for (const target of clientData.targets) {
      const streamId = `${socket.id}:${target.id}`;
      const stream = this.activeStreams.get(streamId);
      
      if (stream && stream.ffmpeg.stdin && !stream.ffmpeg.stdin.destroyed) {
        try {
          stream.bytesReceived += buffer.length;
          stream.chunksReceived++;
          
          // Escrever dados no stdin do FFmpeg
          const written = stream.ffmpeg.stdin.write(buffer);
          
          if (!written) {
            // Buffer cheio, aguardar drain
            stream.ffmpeg.stdin.once('drain', () => {
              console.log(`[RTMPStreamingService] FFmpeg stdin drained for ${target.platform}`);
            });
          }
          
          console.log(`[RTMPStreamingService] Segment ${data.segmentNumber} sent to ${target.platform} FFmpeg`);
        } catch (error) {
          console.error(`[RTMPStreamingService] Error writing to FFmpeg stdin:`, error);
        }
      } else {
        console.warn(`[RTMPStreamingService] No active stream for ${target.platform}`);
      }
    }
  }

  /**
   * Handler para chunks de vídeo - envia para FFmpeg via stdin
   */
  private handleChunk(socket: Socket, data: ArrayBuffer | Buffer) {
    const clientData = this.clients.get(socket.id);
    if (!clientData?.targets) return;

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Enviar para cada stream ativo
    for (const target of clientData.targets) {
      const streamId = `${socket.id}:${target.id}`;
      const stream = this.activeStreams.get(streamId);
      
      if (stream && stream.ffmpeg.stdin && !stream.ffmpeg.stdin.destroyed) {
        try {
          stream.bytesReceived += buffer.length;
          stream.chunksReceived++;
          
          stream.ffmpeg.stdin.write(buffer);
        } catch (error) {
          console.error(`[RTMPStreamingService] Error writing chunk to FFmpeg:`, error);
        }
      }
    }
  }

  /**
   * Para todos os streams de um cliente
   */
  private stopAllStreamsForClient(clientId: string) {
    const clientData = this.clients.get(clientId);
    if (!clientData?.targets) return;

    for (const target of clientData.targets) {
      const streamId = `${clientId}:${target.id}`;
      const stream = this.activeStreams.get(streamId);
      
      if (stream) {
        console.log(`[RTMPStreamingService] Stopping stream to ${target.platform}...`);
        
        // Fechar stdin para sinalizar fim do stream
        if (stream.ffmpeg.stdin && !stream.ffmpeg.stdin.destroyed) {
          stream.ffmpeg.stdin.end();
        }
        
        // Dar tempo para FFmpeg finalizar, depois matar
        setTimeout(() => {
          if (!stream.ffmpeg.killed) {
            stream.ffmpeg.kill('SIGTERM');
          }
        }, 2000);
        
        this.activeStreams.delete(streamId);
      }
    }
  }

  /**
   * Para todos os streams ativos
   */
  stopAllStreams() {
    console.log('[RTMPStreamingService] Stopping all streams...');
    
    for (const [streamId, stream] of this.activeStreams) {
      console.log(`[RTMPStreamingService] Stopping stream ${streamId}...`);
      
      if (stream.ffmpeg.stdin && !stream.ffmpeg.stdin.destroyed) {
        stream.ffmpeg.stdin.end();
      }
      
      setTimeout(() => {
        if (!stream.ffmpeg.killed) {
          stream.ffmpeg.kill('SIGTERM');
        }
      }, 2000);
    }
    
    this.activeStreams.clear();
  }
}

// Exportar instância singleton
export const rtmpStreamingService = new RTMPStreamingService();
