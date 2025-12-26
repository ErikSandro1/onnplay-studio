/**
 * RTMPStreamingService - Backend service para streaming RTMP
 * 
 * Recebe segmentos WebM completos via Socket.IO do frontend e envia para
 * destinos RTMP (YouTube, Twitch, Facebook) usando FFmpeg
 * 
 * Cada segmento é um arquivo WebM completo com headers válidos,
 * permitindo que o FFmpeg processe corretamente.
 * 
 * Usa Socket.IO para melhor compatibilidade com proxies (Railway, etc.)
 */

import { spawn, ChildProcess } from 'child_process';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
  segmentDuration: number;
}

interface SegmentData {
  segmentNumber: number;
  data: ArrayBuffer | Buffer;
  mimeType: string;
  duration: number;
}

interface ActiveStream {
  target: StreamTarget;
  ffmpeg: ChildProcess | null;
  startTime: Date;
  bytesReceived: number;
  segmentsReceived: number;
  lastLogTime: number;
  tempDir: string;
  isProcessing: boolean;
  segmentQueue: Buffer[];
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
      maxHttpBufferSize: 50e6, // 50MB para segmentos de vídeo
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
      socket.on('segment', (data) => this.handleSegment(socket, data));
      socket.on('chunk', (data) => this.handleChunk(socket, data)); // Legacy support
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

    // Iniciar stream para cada destino
    for (const target of data.targets) {
      try {
        console.log(`[RTMPStreamingService] Setting up stream for ${target.platform}...`);
        await this.setupStream(target, data.config, socket.id);
        
        socket.emit('status', {
          targetId: target.id,
          status: 'streaming',
          message: `Streaming to ${target.platform} started`,
        });
        
        console.log(`[RTMPStreamingService] ✅ Stream to ${target.platform} ready!`);
      } catch (error) {
        console.error(`[RTMPStreamingService] ❌ Failed to setup stream to ${target.platform}:`, error);
        
        socket.emit('error', {
          targetId: target.id,
          error: error instanceof Error ? error.message : 'Failed to setup stream',
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
   * Handler para segmentos de vídeo completos
   */
  private handleSegment(socket: Socket, data: SegmentData) {
    const clientData = this.clients.get(socket.id);
    if (!clientData?.targets) return;

    const buffer = Buffer.isBuffer(data.data) ? data.data : Buffer.from(data.data);
    
    console.log(`[RTMPStreamingService] Received segment ${data.segmentNumber}: ${buffer.length} bytes`);

    // Processar segmento para cada destino
    for (const target of clientData.targets) {
      const streamId = `${socket.id}:${target.id}`;
      const stream = this.activeStreams.get(streamId);
      
      if (stream) {
        stream.bytesReceived += buffer.length;
        stream.segmentsReceived++;
        
        // Adicionar segmento à fila
        stream.segmentQueue.push(buffer);
        
        // Processar fila
        this.processSegmentQueue(streamId, target, clientData.config!);
      }
    }
  }

  /**
   * Handler para chunks de vídeo (legacy - para compatibilidade)
   */
  private handleChunk(socket: Socket, data: ArrayBuffer | Buffer) {
    // Ignorar chunks individuais - agora usamos apenas segmentos completos
    console.log('[RTMPStreamingService] Received legacy chunk, ignoring...');
  }

  /**
   * Configura stream para um destino
   */
  private async setupStream(target: StreamTarget, config: StreamConfig, clientId: string): Promise<void> {
    const streamId = `${clientId}:${target.id}`;
    
    // Criar diretório temporário para segmentos
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onnplay-'));
    
    // Registrar stream ativo
    this.activeStreams.set(streamId, {
      target,
      ffmpeg: null,
      startTime: new Date(),
      bytesReceived: 0,
      segmentsReceived: 0,
      lastLogTime: Date.now(),
      tempDir,
      isProcessing: false,
      segmentQueue: [],
    });

    console.log(`[RTMPStreamingService] Stream ${streamId} ready, temp dir: ${tempDir}`);
  }

  /**
   * Processa fila de segmentos
   */
  private async processSegmentQueue(streamId: string, target: StreamTarget, config: StreamConfig) {
    const stream = this.activeStreams.get(streamId);
    if (!stream || stream.isProcessing || stream.segmentQueue.length === 0) {
      return;
    }

    stream.isProcessing = true;

    try {
      while (stream.segmentQueue.length > 0) {
        const segment = stream.segmentQueue.shift()!;
        await this.processSegment(streamId, target, config, segment, stream.segmentsReceived);
      }
    } catch (error) {
      console.error(`[RTMPStreamingService] Error processing segment queue:`, error);
    } finally {
      stream.isProcessing = false;
    }
  }

  /**
   * Processa um segmento individual
   */
  private async processSegment(
    streamId: string, 
    target: StreamTarget, 
    config: StreamConfig, 
    segmentData: Buffer,
    segmentNumber: number
  ): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    // Salvar segmento em arquivo temporário
    const segmentPath = path.join(stream.tempDir, `segment_${segmentNumber}.webm`);
    fs.writeFileSync(segmentPath, segmentData);

    // Construir URL RTMP completa
    const rtmpUrl = target.rtmpUrl.endsWith('/') 
      ? `${target.rtmpUrl}${target.streamKey}`
      : `${target.rtmpUrl}/${target.streamKey}`;

    // Argumentos do FFmpeg para processar o segmento
    const ffmpegArgs = [
      '-y', // Overwrite output
      '-loglevel', 'warning',
      
      // Input - arquivo WebM completo
      '-i', segmentPath,
      
      // Video codec - converter para H.264
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-profile:v', 'baseline',
      '-level', '3.1',
      '-b:v', '2500k',
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-pix_fmt', 'yuv420p',
      '-g', '60',
      '-keyint_min', '60',
      '-sc_threshold', '0',
      '-r', '30',
      
      // Video scaling
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p',
      
      // Audio codec
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      
      // Output
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      rtmpUrl,
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let hasError = false;

      ffmpeg.stderr.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output.includes('Error') || output.includes('error') || output.includes('Invalid')) {
          console.error(`[FFmpeg ${target.platform} ERROR]`, output);
          hasError = true;
        } else if (output.includes('frame=') || output.includes('fps=')) {
          // Log de progresso
          const now = Date.now();
          if (now - stream.lastLogTime > 5000) {
            console.log(`[FFmpeg ${target.platform}] ${output.substring(0, 150)}`);
            stream.lastLogTime = now;
          }
        }
      });

      ffmpeg.on('close', (code) => {
        // Limpar arquivo temporário
        try {
          fs.unlinkSync(segmentPath);
        } catch (e) {
          // Ignorar erro de limpeza
        }

        if (code === 0 || !hasError) {
          console.log(`[RTMPStreamingService] Segment ${segmentNumber} sent to ${target.platform}`);
          resolve();
        } else {
          console.error(`[RTMPStreamingService] FFmpeg exited with code ${code} for segment ${segmentNumber}`);
          resolve(); // Continuar mesmo com erro
        }
      });

      ffmpeg.on('error', (error) => {
        console.error(`[RTMPStreamingService] FFmpeg spawn error:`, error);
        resolve(); // Continuar mesmo com erro
      });
    });
  }

  /**
   * Para todos os streams de um cliente
   */
  private stopAllStreamsForClient(clientId: string) {
    const toDelete: string[] = [];
    
    this.activeStreams.forEach((stream, streamId) => {
      if (streamId.startsWith(clientId)) {
        this.cleanupStream(streamId);
        toDelete.push(streamId);
      }
    });
    
    toDelete.forEach(id => this.activeStreams.delete(id));
  }

  /**
   * Limpa recursos de um stream
   */
  private cleanupStream(streamId: string) {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    console.log(`[RTMPStreamingService] Cleaning up stream: ${streamId}`);

    // Matar processo FFmpeg se existir
    if (stream.ffmpeg && !stream.ffmpeg.killed) {
      stream.ffmpeg.kill('SIGTERM');
    }

    // Limpar diretório temporário
    try {
      const files = fs.readdirSync(stream.tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(stream.tempDir, file));
      }
      fs.rmdirSync(stream.tempDir);
    } catch (e) {
      // Ignorar erros de limpeza
    }

    const duration = Math.floor((Date.now() - stream.startTime.getTime()) / 1000);
    console.log(`[RTMPStreamingService] Stream ${streamId} cleaned up:`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Bytes received: ${stream.bytesReceived}`);
    console.log(`  - Segments received: ${stream.segmentsReceived}`);
  }

  /**
   * Para um stream específico por target ID
   */
  stopStream(targetId: string) {
    for (const [streamId, stream] of this.activeStreams) {
      if (stream.target.id === targetId) {
        this.cleanupStream(streamId);
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
      this.cleanupStream(id);
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
        segmentsReceived: stream.segmentsReceived,
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
