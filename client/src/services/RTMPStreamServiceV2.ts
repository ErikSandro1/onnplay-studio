/**
 * RTMPStreamService V2 - Arquitetura Profissional
 * 
 * OnnPlay Studio - A Melhor Plataforma de Streaming do Mundo
 * Primeiro Estúdio 100% Criado por IA
 * 
 * Esta versão usa pipelines separados de áudio e vídeo para:
 * - Zero travamentos
 * - Performance superior
 * - Sincronização perfeita
 * - Controle profissional
 * 
 * Arquitetura:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    RTMPStreamService V2                         │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                 │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │                   MediaSourceService                     │   │
 * │  │              (Gerencia vídeos e imagens)                │   │
 * │  └──────────────────────┬──────────────────────────────────┘   │
 * │                         │                                       │
 * │         ┌───────────────┴───────────────┐                      │
 * │         │                               │                      │
 * │         ▼                               ▼                      │
 * │  ┌─────────────────┐           ┌─────────────────┐            │
 * │  │  VideoPipeline  │           │  AudioPipeline  │            │
 * │  │  (Só vídeo)     │           │  (Só áudio)     │            │
 * │  │  - 30fps        │           │  - 48kHz        │            │
 * │  │  - Canvas       │           │  - Mixer        │            │
 * │  └────────┬────────┘           └────────┬────────┘            │
 * │           │                             │                      │
 * │           │     ┌───────────────────────┘                      │
 * │           │     │                                              │
 * │           ▼     ▼                                              │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │                    StreamOutput                          │   │
 * │  │  - Combina A/V                                          │   │
 * │  │  - MediaRecorder                                        │   │
 * │  │  - WebSocket                                            │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * │                                                                 │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { io, Socket } from 'socket.io-client';
import { mediaSourceService, MediaSource } from './MediaSourceService';
import { audioPipeline, AudioChannel } from './AudioPipeline';
import { videoPipeline } from './VideoPipeline';

export interface StreamDestination {
  id: string;
  platform: string;
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled?: boolean;
}

export interface StreamStats {
  isStreaming: boolean;
  framesSent: number;
  bytesSent: number;
  bitrate: number;
  fps: number;
  duration: number;
  status: 'idle' | 'connecting' | 'streaming' | 'reconnecting' | 'error';
  error?: string;
  reconnectAttempts?: number;
}

export interface StreamConfig {
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
}

type StreamCallback = (stats: StreamStats) => void;
type StatusCallback = (status: string, error?: string) => void;

class RTMPStreamServiceV2 {
  // Socket connection
  private socket: Socket | null = null;
  
  // MediaRecorder
  private mediaRecorder: MediaRecorder | null = null;
  private combinedStream: MediaStream | null = null;
  
  // Destinations
  private destinations: StreamDestination[] = [];
  
  // State
  private isStreaming: boolean = false;
  private activeMediaSource: MediaSource | null = null;
  private currentAudioChannel: AudioChannel | null = null;
  
  // Stats
  private chunksSent: number = 0;
  private bytesSent: number = 0;
  private startTime: number = 0;
  private lastBytesSent: number = 0;
  private lastStatsTime: number = 0;
  
  // Configuration
  private config: StreamConfig = {
    width: 1280,
    height: 720,
    frameRate: 30,
    videoBitrate: 4000000,  // 4 Mbps
    audioBitrate: 128000,   // 128 kbps
  };
  
  // Stats object
  private stats: StreamStats = {
    isStreaming: false,
    framesSent: 0,
    bytesSent: 0,
    bitrate: 0,
    fps: 0,
    duration: 0,
    status: 'idle',
  };
  
  // Callbacks
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  
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

  constructor() {
    console.log('[RTMPStreamServiceV2] ╔════════════════════════════════════════════╗');
    console.log('[RTMPStreamServiceV2] ║     PROFESSIONAL STREAMING SERVICE        ║');
    console.log('[RTMPStreamServiceV2] ║         OnnPlay Studio V2                 ║');
    console.log('[RTMPStreamServiceV2] ╚════════════════════════════════════════════╝');
    
    // Subscribe to media source changes
    mediaSourceService.subscribeActive((source) => {
      this.handleMediaSourceChange(source);
    });
    
    // Listen for media activation events
    window.addEventListener('media:activate', ((event: CustomEvent) => {
      console.log('[RTMPStreamServiceV2] Media activated:', event.detail);
      const source = mediaSourceService.getActiveSource();
      this.handleMediaSourceChange(source);
    }) as EventListener);
  }

  /**
   * Handles media source changes
   */
  private handleMediaSourceChange(source: MediaSource | null): void {
    console.log('[RTMPStreamServiceV2] Media source changed:', source?.name || 'none');
    this.activeMediaSource = source;
    
    // Update video pipeline
    videoPipeline.setActiveSource(source);
    
    // Update audio pipeline if streaming
    if (this.isStreaming && source?.type === 'video' && source.element) {
      this.connectVideoAudio(source.element as HTMLVideoElement, source.name);
    }
  }

  /**
   * Connects video audio to the audio pipeline
   */
  private connectVideoAudio(videoElement: HTMLVideoElement, name: string): void {
    // Remove previous audio channel if exists
    if (this.currentAudioChannel) {
      audioPipeline.removeChannel(this.currentAudioChannel.id);
      this.currentAudioChannel = null;
    }
    
    // Add new audio channel
    this.currentAudioChannel = audioPipeline.addVideoAudio(videoElement, name);
    
    if (this.currentAudioChannel) {
      console.log('[RTMPStreamServiceV2] ✅ Video audio connected:', name);
    } else {
      console.warn('[RTMPStreamServiceV2] ⚠️ Failed to connect video audio');
    }
  }

  // ==================== DESTINATION MANAGEMENT ====================

  addDestination(dest: StreamDestination): void {
    const existing = this.destinations.find(d => d.id === dest.id);
    if (existing) {
      Object.assign(existing, dest);
    } else {
      this.destinations.push(dest);
    }
    console.log('[RTMPStreamServiceV2] Destination added:', dest.name);
  }

  removeDestination(id: string): void {
    this.destinations = this.destinations.filter(d => d.id !== id);
  }

  getDestinations(): StreamDestination[] {
    return [...this.destinations];
  }

  // ==================== CONFIG ====================

  updateConfig(config: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update video pipeline config
    videoPipeline.setConfig({
      width: this.config.width,
      height: this.config.height,
      frameRate: this.config.frameRate,
    });
    
    console.log('[RTMPStreamServiceV2] Config updated:', this.config);
  }

  getConfig(): StreamConfig {
    return { ...this.config };
  }

  // ==================== STREAMING ====================

  /**
   * Start streaming to all enabled destinations
   */
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      console.warn('[RTMPStreamServiceV2] Already streaming');
      return;
    }

    const enabledDestinations = this.destinations.filter(d => d.enabled !== false);
    if (enabledDestinations.length === 0) {
      throw new Error('No streaming destinations configured');
    }

    console.log('[RTMPStreamServiceV2] ════════════════════════════════════════════');
    console.log('[RTMPStreamServiceV2] STARTING PROFESSIONAL STREAM');
    console.log('[RTMPStreamServiceV2] Destinations:', enabledDestinations.length);
    console.log('[RTMPStreamServiceV2] ════════════════════════════════════════════');

    this.updateStatus('connecting');
    this.reconnectAttempts = 0;

    try {
      // Initialize pipelines
      await this.initializePipelines();
      
      // Connect to server
      await this.connectToServer();
      
      // Start the stream on server
      this.socket!.emit('start-relay', {
        destinations: enabledDestinations.map(d => ({
          id: d.id,
          platform: d.platform,
          name: d.name,
          rtmpUrl: d.rtmpUrl,
          streamKey: d.streamKey,
        })),
        config: this.config,
      });

      // Create combined stream and start MediaRecorder
      await this.startMediaRecorder();
      
      this.isStreaming = true;
      this.chunksSent = 0;
      this.bytesSent = 0;
      this.startTime = Date.now();
      
      // Start auxiliary systems
      this.startStatsTracking();
      this.startHeartbeat();
      this.startKeepAlive();
      
      this.updateStatus('streaming');
      
      console.log('[RTMPStreamServiceV2] ════════════════════════════════════════════');
      console.log('[RTMPStreamServiceV2] ✅ STREAM STARTED SUCCESSFULLY');
      console.log('[RTMPStreamServiceV2] ════════════════════════════════════════════');

      // Auto-transition YouTube broadcasts
      await this.transitionYouTubeBroadcastsToLive();

    } catch (error) {
      console.error('[RTMPStreamServiceV2] ❌ Failed to start streaming:', error);
      this.updateStatus('error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Initialize audio and video pipelines
   */
  private async initializePipelines(): Promise<void> {
    console.log('[RTMPStreamServiceV2] Initializing pipelines...');
    
    // Initialize audio pipeline
    if (!audioPipeline.isReady()) {
      await audioPipeline.initialize();
    }
    
    // Initialize video pipeline
    if (!videoPipeline.isReady()) {
      videoPipeline.initialize({
        width: this.config.width,
        height: this.config.height,
        frameRate: this.config.frameRate,
      });
    }
    
    // Set current media source to video pipeline
    if (this.activeMediaSource) {
      videoPipeline.setActiveSource(this.activeMediaSource);
      
      // Connect audio if it's a video
      if (this.activeMediaSource.type === 'video' && this.activeMediaSource.element) {
        this.connectVideoAudio(
          this.activeMediaSource.element as HTMLVideoElement,
          this.activeMediaSource.name
        );
      }
    }
    
    console.log('[RTMPStreamServiceV2] ✅ Pipelines initialized');
  }

  /**
   * Connect to streaming server
   */
  private async connectToServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);

      const serverUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : `${window.location.protocol}//${window.location.host}`;

      console.log('[RTMPStreamServiceV2] Connecting to:', serverUrl);

      this.socket = io(serverUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('[RTMPStreamServiceV2] ✅ Connected to server');
        resolve();
      });

      this.socket.on('ready', () => {
        console.log('[RTMPStreamServiceV2] Server ready');
      });

      this.socket.on('heartbeat-ack', () => {
        this.lastHeartbeatAck = Date.now();
      });

      this.socket.on('error', (data: { message: string }) => {
        console.error('[RTMPStreamServiceV2] Server error:', data.message);
        this.updateStatus('error', data.message);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('[RTMPStreamServiceV2] Disconnected:', reason);
        if (this.isStreaming && reason !== 'io client disconnect') {
          this.attemptReconnect();
        }
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('[RTMPStreamServiceV2] Connection error:', error);
        clearTimeout(timeout);
        if (!this.isStreaming) {
          reject(error);
        }
      });
    });
  }

  /**
   * Start MediaRecorder with combined stream
   */
  private async startMediaRecorder(): Promise<void> {
    console.log('[RTMPStreamServiceV2] Creating combined stream...');
    
    // Create combined stream
    this.combinedStream = new MediaStream();
    
    // Add video track from video pipeline
    const videoTrack = videoPipeline.getOutputTrack();
    if (videoTrack) {
      this.combinedStream.addTrack(videoTrack);
      console.log('[RTMPStreamServiceV2] ✅ Video track added');
    } else {
      throw new Error('Video track not available');
    }
    
    // Add audio track from audio pipeline
    const audioTrack = audioPipeline.getOutputTrack();
    if (audioTrack) {
      this.combinedStream.addTrack(audioTrack);
      console.log('[RTMPStreamServiceV2] ✅ Audio track added');
    } else {
      throw new Error('Audio track not available');
    }
    
    console.log('[RTMPStreamServiceV2] Combined stream:',
      this.combinedStream.getVideoTracks().length, 'video,',
      this.combinedStream.getAudioTracks().length, 'audio');
    
    // Get supported codec
    const mimeType = this.getSupportedMimeType();
    console.log('[RTMPStreamServiceV2] Using codec:', mimeType || 'default');
    
    // Create MediaRecorder
    const options: MediaRecorderOptions = {
      videoBitsPerSecond: this.config.videoBitrate,
      audioBitsPerSecond: this.config.audioBitrate,
    };
    
    if (mimeType) {
      options.mimeType = mimeType;
    }
    
    this.mediaRecorder = new MediaRecorder(this.combinedStream, options);
    
    // Handle data chunks
    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.socket?.connected && this.isStreaming) {
        try {
          const arrayBuffer = await event.data.arrayBuffer();
          this.socket.emit('video-chunk', arrayBuffer);
          
          this.chunksSent++;
          this.bytesSent += event.data.size;
          
          if (this.chunksSent % 20 === 0) {
            console.log(`[RTMPStreamServiceV2] Chunk ${this.chunksSent}, ${(this.bytesSent / 1024 / 1024).toFixed(2)} MB`);
          }
        } catch (error) {
          console.error('[RTMPStreamServiceV2] Error sending chunk:', error);
        }
      }
    };
    
    this.mediaRecorder.onerror = (event) => {
      console.error('[RTMPStreamServiceV2] MediaRecorder error:', event);
    };
    
    // Start recording with 500ms timeslice (more stable than 250ms)
    this.mediaRecorder.start(500);
    console.log('[RTMPStreamServiceV2] ✅ MediaRecorder started');
  }

  /**
   * Get supported MIME type
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
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      console.warn('[RTMPStreamServiceV2] Not streaming');
      return;
    }

    console.log('[RTMPStreamServiceV2] Stopping stream...');
    this.isStreaming = false;

    // Stop timers
    this.stopStatsTracking();
    this.stopHeartbeat();
    this.stopKeepAlive();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Stop combined stream
    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(track => track.stop());
      this.combinedStream = null;
    }

    // Disconnect socket
    if (this.socket?.connected) {
      this.socket.emit('stop');
      this.socket.disconnect();
      this.socket = null;
    }

    // Remove current audio channel
    if (this.currentAudioChannel) {
      audioPipeline.removeChannel(this.currentAudioChannel.id);
      this.currentAudioChannel = null;
    }

    this.reconnectAttempts = 0;
    this.updateStatus('idle');

    console.log('[RTMPStreamServiceV2] ✅ Stream stopped');
  }

  // ==================== RECONNECTION ====================

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RTMPStreamServiceV2] Max reconnect attempts reached');
      this.updateStatus('error', 'Connection lost');
      this.stopStreaming();
      return;
    }

    this.reconnectAttempts++;
    this.updateStatus('reconnecting');

    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000);
    console.log(`[RTMPStreamServiceV2] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connectToServer();
        
        // Re-emit start-relay
        const enabledDestinations = this.destinations.filter(d => d.enabled !== false);
        this.socket!.emit('start-relay', {
          destinations: enabledDestinations.map(d => ({
            id: d.id,
            platform: d.platform,
            name: d.name,
            rtmpUrl: d.rtmpUrl,
            streamKey: d.streamKey,
          })),
          config: this.config,
        });
        
        this.reconnectAttempts = 0;
        this.updateStatus('streaming');
        console.log('[RTMPStreamServiceV2] ✅ Reconnected');
      } catch (error) {
        console.error('[RTMPStreamServiceV2] Reconnect failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  // ==================== HEARTBEAT ====================

  private startHeartbeat(): void {
    this.lastHeartbeatAck = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (!this.socket?.connected) return;

      if (Date.now() - this.lastHeartbeatAck > 30000) {
        console.warn('[RTMPStreamServiceV2] Heartbeat timeout');
        this.socket.disconnect();
        return;
      }

      this.socket.emit('heartbeat');
    }, 10000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ==================== KEEP-ALIVE ====================

  private async startKeepAlive(): Promise<void> {
    // Wake Lock API
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[RTMPStreamServiceV2] ✅ Wake lock acquired');
      } catch (e) {
        console.warn('[RTMPStreamServiceV2] Wake lock failed:', e);
      }
    }

    this.keepAliveInterval = setInterval(() => {
      // Keep page active
    }, 30000);
  }

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

  // ==================== STATS ====================

  private startStatsTracking(): void {
    this.lastBytesSent = 0;
    this.lastStatsTime = Date.now();

    this.statsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.lastStatsTime) / 1000;
      const bytesDiff = this.bytesSent - this.lastBytesSent;
      
      this.stats.bitrate = (bytesDiff * 8) / elapsed / 1000; // kbps
      this.stats.duration = (now - this.startTime) / 1000;
      this.stats.bytesSent = this.bytesSent;
      this.stats.framesSent = this.chunksSent;
      this.stats.fps = videoPipeline.getStats().actualFps;
      this.stats.reconnectAttempts = this.reconnectAttempts;

      this.lastBytesSent = this.bytesSent;
      this.lastStatsTime = now;

      this.notifyCallbacks();
    }, 1000);
  }

  private stopStatsTracking(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  // ==================== YOUTUBE INTEGRATION ====================

  private async transitionYouTubeBroadcastsToLive(): Promise<void> {
    // Find YouTube destinations
    const youtubeDestinations = this.destinations.filter(
      d => d.platform === 'youtube' && d.enabled !== false
    );

    if (youtubeDestinations.length === 0) return;

    console.log('[RTMPStreamServiceV2] Transitioning YouTube broadcasts to live...');
    
    // Wait for stream to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));

    for (const dest of youtubeDestinations) {
      try {
        const response = await fetch('/api/youtube/transition-to-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destinationId: dest.id }),
        });

        if (response.ok) {
          console.log('[RTMPStreamServiceV2] ✅ YouTube broadcast transitioned:', dest.name);
        }
      } catch (error) {
        console.warn('[RTMPStreamServiceV2] YouTube transition failed:', error);
      }
    }
  }

  // ==================== CALLBACKS ====================

  subscribe(callback: StreamCallback): () => void {
    this.callbacks.add(callback);
    callback(this.stats);
    return () => this.callbacks.delete(callback);
  }

  subscribeStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(cb => cb(this.stats));
  }

  private updateStatus(status: StreamStats['status'], error?: string): void {
    this.stats.status = status;
    this.stats.error = error;
    this.stats.isStreaming = status === 'streaming';
    this.statusCallbacks.forEach(cb => cb(status, error));
    this.notifyCallbacks();
  }

  // ==================== GETTERS ====================

  getStats(): StreamStats {
    return { ...this.stats };
  }

  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  // ==================== LEGACY COMPATIBILITY ====================
  // These methods maintain compatibility with existing code

  setVideoElement(element: HTMLVideoElement | null): void {
    // Legacy method - not needed in V2
    console.log('[RTMPStreamServiceV2] setVideoElement called (legacy)');
  }

  setActiveMediaSource(source: MediaSource | null): void {
    this.handleMediaSourceChange(source);
  }
}

// Export singleton instance
export const rtmpStreamService = new RTMPStreamServiceV2();
export default rtmpStreamService;
