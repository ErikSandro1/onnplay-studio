/**
 * RTMPStreamingService - Backend service para streaming RTMP
 * 
 * Recebe chunks de vídeo via WebSocket do frontend e envia para
 * destinos RTMP (YouTube, Twitch, Facebook) usando FFmpeg
 */

import { spawn, ChildProcess } from 'child_process';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
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
}

export class RTMPStreamingService {
  private wss: WebSocketServer | null = null;
  private activeStreams: Map<string, ActiveStream> = new Map();
  private clients: Map<WebSocket, { config?: StreamConfig; targets?: StreamTarget[] }> = new Map();

  /**
   * Inicializa o WebSocket server
   */
  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/stream/ws'
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('[RTMPStreamingService] New WebSocket connection');
      this.clients.set(ws, {});

      ws.on('message', (data: Buffer | string) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        console.log('[RTMPStreamingService] WebSocket closed');
        this.stopAllStreamsForClient(ws);
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[RTMPStreamingService] WebSocket error:', error);
      });
    });

    console.log('[RTMPStreamingService] WebSocket server initialized on /api/stream/ws');
  }

  /**
   * Processa mensagens do cliente
   */
  private handleMessage(ws: WebSocket, data: Buffer | string) {
    // Se for string, é uma mensagem de controle JSON
    if (typeof data === 'string') {
      try {
        const message = JSON.parse(data);
        this.handleControlMessage(ws, message);
      } catch (e) {
        console.error('[RTMPStreamingService] Invalid JSON message:', e);
      }
      return;
    }

    // Se for Buffer, é um chunk de vídeo
    const clientData = this.clients.get(ws);
    if (clientData?.targets) {
      this.forwardToFFmpeg(data, clientData.targets);
    }
  }

  /**
   * Processa mensagens de controle
   */
  private handleControlMessage(ws: WebSocket, message: any) {
    console.log('[RTMPStreamingService] Control message:', message.type);

    switch (message.type) {
      case 'start':
        this.startStreaming(ws, message.config, message.targets);
        break;
      case 'stop':
        this.stopAllStreamsForClient(ws);
        break;
      default:
        console.warn('[RTMPStreamingService] Unknown message type:', message.type);
    }
  }

  /**
   * Inicia streaming para os destinos
   */
  private async startStreaming(ws: WebSocket, config: StreamConfig, targets: StreamTarget[]) {
    console.log('[RTMPStreamingService] Starting stream to', targets.length, 'targets');
    
    // Salvar configuração do cliente
    this.clients.set(ws, { config, targets });

    // Iniciar FFmpeg para cada destino
    for (const target of targets) {
      try {
        await this.startFFmpegProcess(target, config);
        
        ws.send(JSON.stringify({
          type: 'status',
          targetId: target.id,
          status: 'streaming',
        }));
      } catch (error) {
        console.error(`[RTMPStreamingService] Failed to start stream to ${target.platform}:`, error);
        
        ws.send(JSON.stringify({
          type: 'error',
          targetId: target.id,
          error: error instanceof Error ? error.message : 'Failed to start stream',
        }));
      }
    }
  }

  /**
   * Inicia processo FFmpeg para um destino
   */
  private async startFFmpegProcess(target: StreamTarget, config: StreamConfig): Promise<void> {
    // Construir URL RTMP completa
    const rtmpUrl = target.rtmpUrl.endsWith('/') 
      ? `${target.rtmpUrl}${target.streamKey}`
      : `${target.rtmpUrl}/${target.streamKey}`;

    console.log(`[RTMPStreamingService] Starting FFmpeg for ${target.platform}`);
    console.log(`[RTMPStreamingService] RTMP URL: ${target.rtmpUrl.substring(0, 30)}...`);

    // Argumentos do FFmpeg
    // Recebe WebM via stdin e converte para FLV/H.264 para RTMP
    const ffmpegArgs = [
      // Input
      '-i', 'pipe:0',                    // Ler de stdin
      '-re',                              // Ler em tempo real
      
      // Video codec
      '-c:v', 'libx264',                  // Codec H.264
      '-preset', 'veryfast',              // Preset rápido para baixa latência
      '-tune', 'zerolatency',             // Otimizar para streaming
      '-b:v', `${config.videoBitrate}`,   // Bitrate de vídeo
      '-maxrate', `${config.videoBitrate}`,
      '-bufsize', `${config.videoBitrate * 2}`,
      '-pix_fmt', 'yuv420p',              // Formato de pixel compatível
      '-g', `${config.frameRate * 2}`,    // GOP = 2 segundos
      '-keyint_min', `${config.frameRate}`,
      
      // Video scaling
      '-vf', `scale=${config.width}:${config.height}:force_original_aspect_ratio=decrease,pad=${config.width}:${config.height}:(ow-iw)/2:(oh-ih)/2`,
      '-r', `${config.frameRate}`,        // Frame rate
      
      // Audio codec
      '-c:a', 'aac',                      // Codec AAC
      '-b:a', `${config.audioBitrate}`,   // Bitrate de áudio
      '-ar', '44100',                     // Sample rate
      '-ac', '2',                         // Stereo
      
      // Output
      '-f', 'flv',                        // Formato FLV para RTMP
      '-flvflags', 'no_duration_filesize',
      rtmpUrl,
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Timeout para conexão inicial
      const timeout = setTimeout(() => {
        if (!this.activeStreams.has(target.id)) {
          ffmpeg.kill();
          reject(new Error('FFmpeg connection timeout'));
        }
      }, 30000);

      ffmpeg.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        
        // Log apenas mensagens importantes
        if (output.includes('frame=') || output.includes('Error') || output.includes('error')) {
          console.log(`[FFmpeg ${target.platform}]`, output.trim().substring(0, 200));
        }

        // Detectar quando a conexão foi estabelecida
        if (output.includes('Output #0') || output.includes('frame=')) {
          clearTimeout(timeout);
          
          if (!this.activeStreams.has(target.id)) {
            this.activeStreams.set(target.id, {
              target,
              ffmpeg,
              startTime: new Date(),
            });
            resolve();
          }
        }
      });

      ffmpeg.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`[RTMPStreamingService] FFmpeg error for ${target.platform}:`, error);
        this.activeStreams.delete(target.id);
        reject(error);
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timeout);
        console.log(`[RTMPStreamingService] FFmpeg closed for ${target.platform} with code ${code}`);
        this.activeStreams.delete(target.id);
      });

      // Marcar como ativo imediatamente para começar a receber dados
      this.activeStreams.set(target.id, {
        target,
        ffmpeg,
        startTime: new Date(),
      });
      
      // Resolver após um curto delay para permitir que FFmpeg inicie
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, 2000);
    });
  }

  /**
   * Encaminha chunks de vídeo para os processos FFmpeg
   */
  private forwardToFFmpeg(data: Buffer, targets: StreamTarget[]) {
    for (const target of targets) {
      const stream = this.activeStreams.get(target.id);
      if (stream?.ffmpeg.stdin && !stream.ffmpeg.stdin.destroyed) {
        try {
          stream.ffmpeg.stdin.write(data);
        } catch (e) {
          console.error(`[RTMPStreamingService] Error writing to FFmpeg for ${target.platform}:`, e);
        }
      }
    }
  }

  /**
   * Para todos os streams de um cliente
   */
  private stopAllStreamsForClient(ws: WebSocket) {
    const clientData = this.clients.get(ws);
    if (clientData?.targets) {
      for (const target of clientData.targets) {
        this.stopStream(target.id);
      }
    }
  }

  /**
   * Para um stream específico
   */
  stopStream(targetId: string) {
    const stream = this.activeStreams.get(targetId);
    if (stream) {
      console.log(`[RTMPStreamingService] Stopping stream to ${stream.target.platform}`);
      
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
      
      this.activeStreams.delete(targetId);
    }
  }

  /**
   * Para todos os streams ativos
   */
  stopAllStreams() {
    const ids = Array.from(this.activeStreams.keys());
    ids.forEach(id => this.stopStream(id));
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
