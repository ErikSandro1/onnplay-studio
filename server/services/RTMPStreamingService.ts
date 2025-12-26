/**
 * RTMPStreamingService - Backend service para streaming RTMP
 * 
 * Recebe chunks de vídeo via Socket.IO do frontend e envia para
 * destinos RTMP (YouTube, Twitch, Facebook) usando FFmpeg
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
    
    // Criar Socket.IO server com configuração para proxies
    this.io = new SocketIOServer(server, {
      path: '/socket.io/stream',
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['polling', 'websocket'], // Polling first for better proxy compatibility
      allowUpgrades: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 10e6, // 10MB para chunks de vídeo
      allowEIO3: true, // Allow Engine.IO v3 clients
    });

    this.io.on('connection', (socket: Socket) => {
      console.log('[RTMPStreamingService] ✅ New Socket.IO connection:', socket.id);
      this.clients.set(socket.id, {});

      // Enviar confirmação de conexão
      socket.emit('connected', { message: 'Connected to RTMP streaming service' });

      // Handlers de eventos
      socket.on('start', (data) => this.handleStart(socket, data));
      socket.on('stop', () => this.handleStop(socket));
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
   * Handler para iniciar streaming
   */
  private async handleStart(socket: Socket, data: { config: StreamConfig; targets: StreamTarget[] }) {
    console.log('[RTMPStreamingService] Start request from:', socket.id);
    console.log('[RTMPStreamingService] Config:', JSON.stringify(data.config));
    console.log('[RTMPStreamingService] Targets:', data.targets.length);

    // Salvar configuração do cliente
    this.clients.set(socket.id, { config: data.config, targets: data.targets });

    // Iniciar FFmpeg para cada destino
    for (const target of data.targets) {
      try {
        console.log(`[RTMPStreamingService] Starting FFmpeg for ${target.platform}...`);
        await this.startFFmpegProcess(target, data.config, socket.id);
        
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
   * Handler para parar streaming
   */
  private handleStop(socket: Socket) {
    console.log('[RTMPStreamingService] Stop request from:', socket.id);
    this.stopAllStreamsForClient(socket.id);
    socket.emit('stopped', { message: 'All streams stopped' });
  }

  /**
   * Handler para chunks de vídeo
   */
  private handleChunk(socket: Socket, data: ArrayBuffer | Buffer) {
    const clientData = this.clients.get(socket.id);
    if (clientData?.targets) {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      // Log a cada 100 chunks para debug
      const streamId = `${socket.id}:${clientData.targets[0]?.id}`;
      const stream = this.activeStreams.get(streamId);
      if (stream) {
        stream.chunksReceived = (stream.chunksReceived || 0) + 1;
        if (stream.chunksReceived % 100 === 0) {
          console.log(`[RTMPStreamingService] Chunks received: ${stream.chunksReceived}, bytes: ${stream.bytesReceived}`);
        }
      }
      
      this.forwardToFFmpeg(buffer, clientData.targets);
    }
  }

  /**
   * Inicia processo FFmpeg para um destino
   */
  private async startFFmpegProcess(target: StreamTarget, config: StreamConfig, clientId: string): Promise<void> {
    // Construir URL RTMP completa
    const rtmpUrl = target.rtmpUrl.endsWith('/') 
      ? `${target.rtmpUrl}${target.streamKey}`
      : `${target.rtmpUrl}/${target.streamKey}`;

    console.log(`[RTMPStreamingService] FFmpeg target: ${target.platform}`);
    console.log(`[RTMPStreamingService] RTMP URL: ${rtmpUrl.substring(0, 60)}...`);

    // Argumentos do FFmpeg otimizados para WebM input
    // O navegador envia WebM com VP9/Opus, precisamos converter para H.264/AAC para RTMP
    const ffmpegArgs = [
      // Logging
      '-loglevel', 'warning',
      '-stats',
      
      // Input - WebM from stdin
      '-f', 'webm',                         // Força formato WebM
      '-i', 'pipe:0',                       // Ler de stdin
      
      // Video codec - converter VP9 para H.264
      '-c:v', 'libx264',                    // Codec H.264
      '-preset', 'ultrafast',               // Preset mais rápido para streaming
      '-tune', 'zerolatency',               // Otimizar para streaming
      '-profile:v', 'baseline',             // Perfil mais compatível
      '-level', '3.1',
      '-b:v', `${Math.min(config.videoBitrate, 4500000)}`, // Max 4.5Mbps
      '-maxrate', `${Math.min(config.videoBitrate, 4500000)}`,
      '-bufsize', `${Math.min(config.videoBitrate * 2, 9000000)}`,
      '-pix_fmt', 'yuv420p',                // Formato de pixel compatível
      '-g', '60',                           // GOP = 2 segundos a 30fps
      '-keyint_min', '30',
      
      // Video scaling - garantir resolução correta
      '-vf', `scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease,pad=${config.width}:${config.height}:(ow-iw)/2:(oh-ih)/2,fps=${config.frameRate}`,
      
      // Audio codec - converter Opus para AAC
      '-c:a', 'aac',                        // Codec AAC
      '-b:a', '128k',                       // Bitrate de áudio fixo
      '-ar', '44100',                       // Sample rate
      '-ac', '2',                           // Stereo
      
      // Output
      '-f', 'flv',                          // Formato FLV para RTMP
      '-flvflags', 'no_duration_filesize',
      rtmpUrl,
    ];

    console.log(`[RTMPStreamingService] FFmpeg command: ffmpeg ${ffmpegArgs.join(' ').substring(0, 200)}...`);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const streamId = `${clientId}:${target.id}`;

      // Capturar stdout (stats)
      ffmpeg.stdout.on('data', (data: Buffer) => {
        console.log(`[FFmpeg ${target.platform} stdout]`, data.toString().trim());
      });

      // Capturar stderr (logs e erros)
      ffmpeg.stderr.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        
        // Log todas as mensagens para debug
        if (output.length > 0) {
          // Filtrar mensagens muito longas
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.includes('frame=') || line.includes('fps=') || line.includes('bitrate=')) {
              // Log de progresso - mostrar apenas a cada 5 segundos
              const stream = this.activeStreams.get(streamId);
              if (stream && Date.now() - stream.startTime.getTime() > 5000) {
                console.log(`[FFmpeg ${target.platform}] ${line.substring(0, 150)}`);
              }
            } else if (line.includes('Error') || line.includes('error') || line.includes('failed')) {
              console.error(`[FFmpeg ${target.platform} ERROR]`, line);
            } else if (line.includes('Output') || line.includes('Stream mapping') || line.includes('Press')) {
              console.log(`[FFmpeg ${target.platform}]`, line.substring(0, 150));
            }
          }
        }
      });

      ffmpeg.on('error', (error) => {
        console.error(`[RTMPStreamingService] FFmpeg spawn error for ${target.platform}:`, error);
        this.activeStreams.delete(streamId);
        reject(error);
      });

      ffmpeg.on('close', (code, signal) => {
        const stream = this.activeStreams.get(streamId);
        const duration = stream ? Math.floor((Date.now() - stream.startTime.getTime()) / 1000) : 0;
        const bytes = stream?.bytesReceived || 0;
        const chunks = stream?.chunksReceived || 0;
        
        console.log(`[RTMPStreamingService] FFmpeg closed for ${target.platform}:`);
        console.log(`  - Exit code: ${code}`);
        console.log(`  - Signal: ${signal}`);
        console.log(`  - Duration: ${duration}s`);
        console.log(`  - Bytes received: ${bytes}`);
        console.log(`  - Chunks received: ${chunks}`);
        
        this.activeStreams.delete(streamId);
      });

      // Marcar como ativo
      this.activeStreams.set(streamId, {
        target,
        ffmpeg,
        startTime: new Date(),
        bytesReceived: 0,
        chunksReceived: 0,
      });
      
      // Resolver após um curto delay para permitir que FFmpeg inicie
      setTimeout(() => resolve(), 500);
    });
  }

  /**
   * Encaminha chunks de vídeo para os processos FFmpeg
   */
  private forwardToFFmpeg(data: Buffer, targets: StreamTarget[]) {
    for (const target of targets) {
      // Procurar stream ativo para este target
      for (const [streamId, stream] of this.activeStreams) {
        if (stream.target.id === target.id) {
          if (stream.ffmpeg.stdin && !stream.ffmpeg.stdin.destroyed) {
            try {
              const written = stream.ffmpeg.stdin.write(data);
              stream.bytesReceived += data.length;
              
              if (!written) {
                // Buffer cheio, aguardar drain
                stream.ffmpeg.stdin.once('drain', () => {
                  // Buffer drenado, pode continuar
                });
              }
            } catch (e) {
              console.error(`[RTMPStreamingService] Error writing to FFmpeg for ${target.platform}:`, e);
            }
          } else {
            console.warn(`[RTMPStreamingService] FFmpeg stdin not available for ${target.platform}`);
          }
          break;
        }
      }
    }
  }

  /**
   * Para todos os streams de um cliente
   */
  private stopAllStreamsForClient(clientId: string) {
    const toDelete: string[] = [];
    
    this.activeStreams.forEach((stream, streamId) => {
      if (streamId.startsWith(clientId)) {
        this.stopStreamById(streamId);
        toDelete.push(streamId);
      }
    });
    
    toDelete.forEach(id => this.activeStreams.delete(id));
  }

  /**
   * Para um stream específico por ID
   */
  private stopStreamById(streamId: string) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      console.log(`[RTMPStreamingService] Stopping stream: ${streamId}`);
      
      // Fechar stdin para sinalizar fim do stream
      if (stream.ffmpeg.stdin && !stream.ffmpeg.stdin.destroyed) {
        stream.ffmpeg.stdin.end();
      }
      
      // Matar processo após um delay
      setTimeout(() => {
        if (!stream.ffmpeg.killed) {
          stream.ffmpeg.kill('SIGTERM');
        }
      }, 2000);
    }
  }

  /**
   * Para um stream específico por target ID
   */
  stopStream(targetId: string) {
    for (const [streamId, stream] of this.activeStreams) {
      if (stream.target.id === targetId) {
        this.stopStreamById(streamId);
        this.activeStreams.delete(streamId);
        break;
      }
    }
  }

  /**
   * Para todos os streams ativos
   */
  stopAllStreams() {
    const ids = Array.from(this.activeStreams.keys());
    ids.forEach(id => {
      this.stopStreamById(id);
      this.activeStreams.delete(id);
    });
  }

  /**
   * Retorna estatísticas dos streams ativos
   */
  getStats() {
    const stats: any[] = [];
    
    this.activeStreams.forEach((stream, id) => {
      const duration = Date.now() - stream.startTime.getTime();
      stats.push({
        id,
        platform: stream.target.platform,
        duration: Math.floor(duration / 1000),
        bytesReceived: stream.bytesReceived,
        chunksReceived: stream.chunksReceived,
        status: 'streaming',
      });
    });
    
    return stats;
  }

  /**
   * Verifica se há streams ativos
   */
  hasActiveStreams(): boolean {
    return this.activeStreams.size > 0;
  }
}

// Singleton
export const rtmpStreamingService = new RTMPStreamingService();
