/**
 * StreamOutput - Gerenciador de Saída de Stream Profissional
 * 
 * OnnPlay Studio - A Melhor Plataforma de Streaming do Mundo
 * Primeiro Estúdio 100% Criado por IA
 * 
 * Este serviço combina os pipelines de áudio e vídeo em um único
 * stream de saída, gerencia o MediaRecorder e envia para o servidor.
 * 
 * Arquitetura:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     STREAM OUTPUT                           │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  ┌─────────────────┐     ┌─────────────────┐              │
 * │  │  VideoPipeline  │     │  AudioPipeline  │              │
 * │  │  (Video Track)  │     │  (Audio Track)  │              │
 * │  └────────┬────────┘     └────────┬────────┘              │
 * │           │                       │                        │
 * │           └───────────┬───────────┘                        │
 * │                       │                                    │
 * │                       ▼                                    │
 * │              ┌─────────────────┐                          │
 * │              │  MediaStream    │  ← Combined A/V          │
 * │              │  (Video+Audio)  │                          │
 * │              └────────┬────────┘                          │
 * │                       │                                    │
 * │                       ▼                                    │
 * │              ┌─────────────────┐                          │
 * │              │ MediaRecorder   │  ← WebM/VP9+Opus         │
 * │              │ (Encoding)      │                          │
 * │              └────────┬────────┘                          │
 * │                       │                                    │
 * │                       ▼                                    │
 * │              ┌─────────────────┐                          │
 * │              │   WebSocket     │  ← Chunks to server      │
 * │              │   (Transport)   │                          │
 * │              └─────────────────┘                          │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 */

import { io, Socket } from 'socket.io-client';
import { audioPipeline } from './AudioPipeline';
import { videoPipeline } from './VideoPipeline';

export interface StreamDestination {
  id: string;
  platform: string;
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled?: boolean;
}

export interface StreamConfig {
  videoBitrate: number;   // bps
  audioBitrate: number;   // bps
  timeslice: number;      // ms - intervalo de chunks
}

export interface StreamStats {
  isStreaming: boolean;
  status: 'idle' | 'connecting' | 'streaming' | 'reconnecting' | 'error';
  chunksSent: number;
  bytesSent: number;
  bitrate: number;        // kbps
  duration: number;       // seconds
  reconnectAttempts: number;
  error?: string;
}

type StatsCallback = (stats: StreamStats) => void;
type StatusCallback = (status: string, error?: string) => void;

class StreamOutput {
  // Socket connection
  private socket: Socket | null = null;
  
  // MediaRecorder
  private mediaRecorder: MediaRecorder | null = null;
  private combinedStream: MediaStream | null = null;
  
  // Destinations
  private destinations: StreamDestination[] = [];
  
  // Configuration
  private config: StreamConfig = {
    videoBitrate: 4000000,  // 4 Mbps
    audioBitrate: 128000,   // 128 kbps
    timeslice: 500,         // 500ms chunks (mais estável que 250ms)
  };
  
  // State
  private isStreaming: boolean = false;
  private chunksSent: number = 0;
  private bytesSent: number = 0;
  private startTime: number = 0;
  
  // Reconnection
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 2000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  // Heartbeat
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeatAck: number = 0;
  
  // Keep-alive
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  
  // Stats tracking
  private statsInterval: NodeJS.Timeout | null = null;
  private lastBytesSent: number = 0;
  private lastStatsTime: number = 0;
  
  // Callbacks
  private statsCallbacks: Set<StatsCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();

  /**
   * Define os destinos de streaming
   */
  setDestinations(destinations: StreamDestination[]): void {
    this.destinations = destinations;
    console.log('[StreamOutput] Destinations set:', destinations.length);
  }

  /**
   * Define configuração do stream
   */
  setConfig(config: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[StreamOutput] Config updated:', this.config);
  }

  /**
   * Inicia o streaming
   */
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      console.warn('[StreamOutput] Already streaming');
      return;
    }

    console.log('[StreamOutput] ╔════════════════════════════════════════════╗');
    console.log('[StreamOutput] ║        STARTING PROFESSIONAL STREAM       ║');
    console.log('[StreamOutput] ║           OnnPlay Studio Output           ║');
    console.log('[StreamOutput] ╚════════════════════════════════════════════╝');

    try {
      this.updateStatus('connecting');

      // Verificar se os pipelines estão prontos
      if (!audioPipeline.isReady()) {
        await audioPipeline.initialize();
      }
      if (!videoPipeline.isReady()) {
        videoPipeline.initialize();
      }

      // Combinar tracks de áudio e vídeo
      await this.createCombinedStream();

      // Conectar ao servidor
      await this.connectToServer();

      // Iniciar MediaRecorder
      await this.startMediaRecorder();

      // Iniciar keep-alive
      this.startKeepAlive();

      // Iniciar tracking de stats
      this.startStatsTracking();

      this.isStreaming = true;
      this.startTime = Date.now();
      this.updateStatus('streaming');

      console.log('[StreamOutput] ════════════════════════════════════════════');
      console.log('[StreamOutput] ✅ STREAMING STARTED');

    } catch (error) {
      console.error('[StreamOutput] ❌ Failed to start streaming:', error);
      this.updateStatus('error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Para o streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      console.warn('[StreamOutput] Not streaming');
      return;
    }

    console.log('[StreamOutput] Stopping stream...');
    this.isStreaming = false;

    // Parar timers
    this.stopKeepAlive();
    this.stopStatsTracking();
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Parar MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Parar stream combinado
    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(track => track.stop());
      this.combinedStream = null;
    }

    // Desconectar socket
    if (this.socket?.connected) {
      this.socket.emit('stop');
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.updateStatus('idle');

    console.log('[StreamOutput] ✅ Stream stopped');
  }

  /**
   * Cria o stream combinado de áudio e vídeo
   */
  private async createCombinedStream(): Promise<void> {
    console.log('[StreamOutput] Creating combined A/V stream...');

    this.combinedStream = new MediaStream();

    // Adicionar track de vídeo
    const videoTrack = videoPipeline.getOutputTrack();
    if (videoTrack) {
      this.combinedStream.addTrack(videoTrack);
      console.log('[StreamOutput] ✅ Video track added');
    } else {
      throw new Error('Video track not available');
    }

    // Adicionar track de áudio
    const audioTrack = audioPipeline.getOutputTrack();
    if (audioTrack) {
      this.combinedStream.addTrack(audioTrack);
      console.log('[StreamOutput] ✅ Audio track added');
    } else {
      throw new Error('Audio track not available');
    }

    console.log('[StreamOutput] Combined stream created:',
      this.combinedStream.getVideoTracks().length, 'video,',
      this.combinedStream.getAudioTracks().length, 'audio');
  }

  /**
   * Conecta ao servidor de streaming
   */
  private async connectToServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);

      // Determinar URL do servidor
      const serverUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : `${window.location.protocol}//${window.location.host}`;

      console.log('[StreamOutput] Connecting to:', serverUrl);

      this.socket = io(serverUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: false, // Gerenciamos reconexão manualmente
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('[StreamOutput] ✅ Connected to server');

        // Enviar configuração de stream
        const enabledDestinations = this.destinations.filter(d => d.enabled !== false);
        
        this.socket!.emit('start', {
          destinations: enabledDestinations,
          config: {
            width: 1280,
            height: 720,
            frameRate: 30,
            videoBitrate: this.config.videoBitrate,
            audioBitrate: this.config.audioBitrate,
          }
        });

        // Iniciar heartbeat
        this.startHeartbeat();

        resolve();
      });

      this.socket.on('ready', () => {
        console.log('[StreamOutput] Server ready to receive stream');
      });

      this.socket.on('heartbeat-ack', () => {
        this.lastHeartbeatAck = Date.now();
      });

      this.socket.on('latency', (data: { latency: number }) => {
        if (data.latency > 1000) {
          console.warn('[StreamOutput] High latency:', data.latency, 'ms');
        }
      });

      this.socket.on('error', (data: { message: string }) => {
        console.error('[StreamOutput] Server error:', data.message);
        this.updateStatus('error', data.message);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('[StreamOutput] Disconnected:', reason);
        
        if (this.isStreaming && reason !== 'io client disconnect') {
          this.attemptReconnect();
        }
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('[StreamOutput] Connection error:', error);
        clearTimeout(timeout);
        
        if (!this.isStreaming) {
          reject(error);
        }
      });
    });
  }

  /**
   * Inicia o MediaRecorder
   */
  private async startMediaRecorder(): Promise<void> {
    if (!this.combinedStream) {
      throw new Error('Combined stream not available');
    }

    // Detectar codec suportado
    const mimeType = this.getSupportedMimeType();
    console.log('[StreamOutput] Using codec:', mimeType || 'default');

    const options: MediaRecorderOptions = {
      videoBitsPerSecond: this.config.videoBitrate,
      audioBitsPerSecond: this.config.audioBitrate,
    };

    if (mimeType) {
      options.mimeType = mimeType;
    }

    this.mediaRecorder = new MediaRecorder(this.combinedStream, options);

    // Handler de dados
    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.socket?.connected && this.isStreaming) {
        try {
          const arrayBuffer = await event.data.arrayBuffer();
          this.socket.emit('video-chunk', arrayBuffer);
          
          this.chunksSent++;
          this.bytesSent += event.data.size;

          if (this.chunksSent % 20 === 0) {
            console.log(`[StreamOutput] Chunk ${this.chunksSent}, ${(this.bytesSent / 1024 / 1024).toFixed(2)} MB total`);
          }
        } catch (error) {
          console.error('[StreamOutput] Error sending chunk:', error);
        }
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[StreamOutput] MediaRecorder error:', event);
    };

    // Iniciar gravação com timeslice configurado
    this.mediaRecorder.start(this.config.timeslice);
    console.log('[StreamOutput] ✅ MediaRecorder started, timeslice:', this.config.timeslice, 'ms');
  }

  /**
   * Detecta o melhor codec suportado
   */
  private getSupportedMimeType(): string | null {
    const codecs = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
    ];

    for (const codec of codecs) {
      if (MediaRecorder.isTypeSupported(codec)) {
        return codec;
      }
    }

    return null;
  }

  /**
   * Tenta reconectar ao servidor
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[StreamOutput] Max reconnect attempts reached');
      this.updateStatus('error', 'Connection lost');
      this.stopStreaming();
      return;
    }

    this.reconnectAttempts++;
    this.updateStatus('reconnecting');

    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);
    console.log(`[StreamOutput] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connectToServer();
        this.reconnectAttempts = 0;
        this.updateStatus('streaming');
        console.log('[StreamOutput] ✅ Reconnected successfully');
      } catch (error) {
        console.error('[StreamOutput] Reconnect failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  /**
   * Inicia heartbeat
   */
  private startHeartbeat(): void {
    this.lastHeartbeatAck = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (!this.socket?.connected) return;

      // Verificar se recebemos ack do último heartbeat
      if (Date.now() - this.lastHeartbeatAck > 15000) {
        console.warn('[StreamOutput] Heartbeat timeout, reconnecting...');
        this.socket.disconnect();
        return;
      }

      this.socket.emit('heartbeat', { timestamp: Date.now() });
    }, 5000);
  }

  /**
   * Para heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Inicia keep-alive (previne suspensão do browser)
   */
  private startKeepAlive(): void {
    // Wake Lock API
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen')
        .then(lock => {
          this.wakeLock = lock;
          console.log('[StreamOutput] ✅ Wake lock acquired');
        })
        .catch(err => {
          console.warn('[StreamOutput] Wake lock failed:', err);
        });
    }

    // Fallback: Audio context keep-alive
    this.keepAliveInterval = setInterval(() => {
      // Manter a página ativa
    }, 30000);
  }

  /**
   * Para keep-alive
   */
  private stopKeepAlive(): void {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Inicia tracking de estatísticas
   */
  private startStatsTracking(): void {
    this.lastBytesSent = 0;
    this.lastStatsTime = Date.now();

    this.statsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.lastStatsTime) / 1000;
      const bytesDiff = this.bytesSent - this.lastBytesSent;
      
      const bitrate = (bytesDiff * 8) / elapsed / 1000; // kbps
      const duration = (now - this.startTime) / 1000;

      this.lastBytesSent = this.bytesSent;
      this.lastStatsTime = now;

      this.notifyStats({
        isStreaming: this.isStreaming,
        status: this.isStreaming ? 'streaming' : 'idle',
        chunksSent: this.chunksSent,
        bytesSent: this.bytesSent,
        bitrate,
        duration,
        reconnectAttempts: this.reconnectAttempts,
      });
    }, 1000);
  }

  /**
   * Para tracking de estatísticas
   */
  private stopStatsTracking(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Atualiza status e notifica callbacks
   */
  private updateStatus(status: string, error?: string): void {
    this.statusCallbacks.forEach(cb => cb(status, error));
    
    this.notifyStats({
      isStreaming: this.isStreaming,
      status: status as StreamStats['status'],
      chunksSent: this.chunksSent,
      bytesSent: this.bytesSent,
      bitrate: 0,
      duration: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
      reconnectAttempts: this.reconnectAttempts,
      error,
    });
  }

  // ==================== GETTERS ====================

  getStats(): StreamStats {
    return {
      isStreaming: this.isStreaming,
      status: this.isStreaming ? 'streaming' : 'idle',
      chunksSent: this.chunksSent,
      bytesSent: this.bytesSent,
      bitrate: 0,
      duration: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  isActive(): boolean {
    return this.isStreaming;
  }

  // ==================== CALLBACKS ====================

  subscribeStats(callback: StatsCallback): () => void {
    this.statsCallbacks.add(callback);
    callback(this.getStats());
    return () => this.statsCallbacks.delete(callback);
  }

  subscribeStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  private notifyStats(stats: StreamStats): void {
    this.statsCallbacks.forEach(cb => cb(stats));
  }

  // ==================== CLEANUP ====================

  async cleanup(): Promise<void> {
    await this.stopStreaming();
    console.log('[StreamOutput] ✅ Cleanup complete');
  }
}

// Singleton export
export const streamOutput = new StreamOutput();
