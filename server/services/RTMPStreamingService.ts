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
  lastLogTime: number;
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
        
        // Log a cada 5 segundos
        const now = Date.now();
        if (now - stream.lastLogTime > 5000) {
          console.log(`[RTMPStreamingService] Stats: chunks=${stream.chunksReceived}, bytes=${stream.bytesReceived}, rate=${Math.round(stream.bytesReceived / ((now - stream.startTime.getTime()) / 1000) / 1024)}KB/s`);
          stream.lastLogTime = now;
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

    // Argumentos do FFmpeg otimizados para WebM streaming via pipe
    // O navegador envia WebM com VP9/Opus, precisamos converter para H.264/AAC para RTMP
    const ffmpegArgs = [
      // Logging - mais verboso para debug
      '-loglevel', 'info',
      '-stats',
      
      // Opções de input para streaming via pipe
      '-fflags', '+genpts+discardcorrupt',   // Gerar timestamps e descartar dados corrompidos
      '-probesize', '10M',                    // Aumentar tamanho de probe para melhor detecção
      '-analyzeduration', '10M',              // Aumentar duração de análise
      
      // Input - WebM from stdin (live streaming)
      '-f', 'webm',                           // Força formato WebM
      '-live_start_index', '0',               // Para live streaming
      '-i', 'pipe:0',                         // Ler de stdin
      
      // Mapeamento de streams
      '-map', '0:v:0?',                       // Mapear primeiro stream de vídeo (opcional)
      '-map', '0:a:0?',                       // Mapear primeiro stream de áudio (opcional)
      
      // Video codec - converter VP9 para H.264
      '-c:v', 'libx264',                      // Codec H.264
      '-preset', 'ultrafast',                 // Preset mais rápido para streaming
      '-tune', 'zerolatency',                 // Otimizar para streaming
      '-profile:v', 'baseline',               // Perfil mais compatível
      '-level', '3.1',
      '-b:v', '2500k',                        // Bitrate fixo de 2.5Mbps (mais estável)
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-pix_fmt', 'yuv420p',                  // Formato de pixel compatível
      '-g', '60',                             // GOP = 2 segundos a 30fps
      '-keyint_min', '60',                    // Keyframe mínimo
      '-sc_threshold', '0',                   // Desabilitar detecção de cena
      '-r', '30',                             // Forçar 30fps
      
      // Video scaling - garantir resolução correta
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
      
      // Audio codec - converter Opus para AAC
      '-c:a', 'aac',                          // Codec AAC
      '-b:a', '128k',                         // Bitrate de áudio fixo
      '-ar', '44100',                         // Sample rate
      '-ac', '2',                             // Stereo
      
      // Output
      '-f', 'flv',                            // Formato FLV para RTMP
      '-flvflags', 'no_duration_filesize',
      rtmpUrl,
    ];

    console.log(`[RTMPStreamingService] FFmpeg command: ffmpeg ${ffmpegArgs.slice(0, 20).join(' ')}...`);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const streamId = `${clientId}:${target.id}`;

      // Capturar stdout (stats)
      ffmpeg.stdout.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`[FFmpeg ${target.platform} stdout]`, output);
        }
      });

      // Capturar stderr (logs e erros)
      ffmpeg.stderr.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        
        if (output.length > 0) {
          const lines = output.split('\n');
          for (const line of lines) {
            // Log de progresso
            if (line.includes('frame=') || line.includes('fps=') || line.includes('bitrate=')) {
              console.log(`[FFmpeg ${target.platform}] ${line.substring(0, 200)}`);
            } 
            // Erros
            else if (line.includes('Error') || line.includes('error') || line.includes('failed') || line.includes('Invalid')) {
              console.error(`[FFmpeg ${target.platform} ERROR]`, line);
            }
            // Info importante
            else if (line.includes('Output') || line.includes('Stream') || line.includes('Input') || line.includes('Duration')) {
              console.log(`[FFmpeg ${target.platform}]`, line.substring(0, 200));
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
        lastLogTime: Date.now(),
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
