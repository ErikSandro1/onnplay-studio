/**
 * RTMPStreamService - MediaRecorder Edition
 * 
 * Uses browser's MediaRecorder API to encode video directly in the browser.
 * This is the same architecture used by StreamYard, Restream, etc.
 * 
 * Benefits:
 * - Encoding happens on user's device (uses their CPU/GPU)
 * - Server only relays the stream (minimal CPU usage)
 * - Real-time streaming guaranteed
 * - Better quality (hardware encoding when available)
 * 
 * UPDATED: Added automatic reconnection and heartbeat for stable long-running streams
 */

import { io, Socket } from 'socket.io-client';
import { mediaSourceService, MediaSource } from './MediaSourceService';
import { StreamBuffer } from './StreamBuffer';
import { ChunkQueue } from './ChunkQueue';
import { commentOverlayService } from './CommentOverlayService';

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

type StreamCallback = (stats: StreamStats) => void;
type StatusCallback = (status: string, error?: string) => void;

class RTMPStreamService {
  private socket: Socket | null = null;
  private isStreaming = false;
  private destinations: StreamDestination[] = [];
  private mediaRecorder: MediaRecorder | null = null;
  private captureCanvas: HTMLCanvasElement | null = null;
  private captureCtx: CanvasRenderingContext2D | null = null;
  private canvasStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private activeMediaSource: MediaSource | null = null;
  
  // Stats
  private chunksSent = 0;
  private bytesSent = 0;
  private startTime = 0;
  
  // Callbacks
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  
  // Reconnection settings
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 2000; // Start with 2 seconds
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeatAck = 0;
  
  // Keep-alive to prevent browser suspension
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private audioContext: AudioContext | null = null;
  
  // Audio Mixer - permite trocar fonte de áudio sem quebrar o MediaRecorder
  private streamAudioContext: AudioContext | null = null;
  private audioMixerDestination: MediaStreamAudioDestinationNode | null = null;
  private currentAudioSource: MediaElementAudioSourceNode | null = null;
  private currentVideoElement: HTMLVideoElement | null = null;
  
  // StreamBuffer - "Capacitor" para streaming suave
  private streamBuffer: StreamBuffer | null = null;
  
  // ChunkQueue - Fila local de chunks (BACKUP24 FIX)
  private chunkQueue: ChunkQueue | null = null;
  private isProcessingQueue = false;
  private backpressureActive = false;
  
  // Config - YouTube Professional Settings
  // Using 720p as default - good balance between quality and stability
  // YouTube recommends 2,500-6,500 kbps for 720p
  // REDUCED bitrate for more stable streaming
  private config = {
    width: 1280,
    height: 720,
    frameRate: 30,
    videoBitrate: 2500000,  // 2.5 Mbps for 720p (lower end for stability)
    audioBitrate: 128000,
    bufferSize: 64,  // KB - smaller buffer for lower latency
  };

  private stats: StreamStats = {
    isStreaming: false,
    framesSent: 0,
    bytesSent: 0,
    bitrate: 0,
    fps: 0,
    duration: 0,
    status: 'idle',
  };

  constructor() {
    // Create capture canvas
    this.captureCanvas = document.createElement('canvas');
    this.captureCanvas.width = this.config.width;
    this.captureCanvas.height = this.config.height;
    this.captureCtx = this.captureCanvas.getContext('2d', { 
      alpha: false,
      desynchronized: true  // Better performance
    });
    
    // Subscribe to media source changes
    mediaSourceService.subscribeActive((source) => {
      this.activeMediaSource = source;
      console.log('[RTMPStreamService] Active media source changed:', source?.name || 'none');
      
      // Se estamos streaming e a mídia mudou, conectar o novo áudio ao mixer
      if (this.isStreaming && source?.type === 'video') {
        console.log('[RTMPStreamService] Video changed during streaming, connecting new audio...');
        this.connectVideoAudioToMixer();
      }
    });
    
    // Listen for media activation events
    window.addEventListener('media:activate', ((event: CustomEvent) => {
      console.log('[RTMPStreamService] Media activated:', event.detail);
      this.activeMediaSource = mediaSourceService.getActiveSource();
      
      // Se estamos streaming, conectar o áudio do novo vídeo
      if (this.isStreaming && this.activeMediaSource?.type === 'video') {
        console.log('[RTMPStreamService] Video activated during streaming, connecting audio...');
        this.connectVideoAudioToMixer();
      }
    }) as EventListener);
  }

  /**
   * Add a streaming destination
   */
  addDestination(dest: StreamDestination): void {
    const existing = this.destinations.find(d => d.id === dest.id);
    if (existing) {
      Object.assign(existing, dest);
    } else {
      this.destinations.push(dest);
    }
  }

  /**
   * Remove a streaming destination
   */
  removeDestination(id: string): void {
    this.destinations = this.destinations.filter(d => d.id !== id);
  }

  /**
   * Get all destinations
   */
  getDestinations(): StreamDestination[] {
    return [...this.destinations];
  }

  /**
   * Get active YouTube broadcast info (for chat auto-connect)
   */
  getActiveYouTubeBroadcast(): { broadcastId: string; accountId: string; liveChatId?: string } | null {
    if (!this.isStreaming) return null;
    
    const ytDest = this.destinations.find(
      d => d.platform === 'youtube' && d.enabled !== false
    );
    
    if (!ytDest) return null;
    
    const broadcastId = (ytDest as any).broadcastId;
    const accountId = (ytDest as any).accountId;
    const liveChatId = (ytDest as any).liveChatId;
    
    if (!broadcastId || !accountId) return null;
    
    return { broadcastId, accountId, liveChatId };
  }

  /**
   * Check if currently streaming
   */
  isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Update streaming config (Legacy)
   * @deprecated Use updateConfig() instead (new version with detailed logs)
   */
  updateConfigLegacy(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    if (this.captureCanvas) {
      this.captureCanvas.width = this.config.width;
      this.captureCanvas.height = this.config.height;
    }
  }

  /**
   * Get current config
   */
  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Find the video element to capture
   */
  private findVideoElement(): HTMLVideoElement | null {
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      if (!video.paused && video.readyState >= 2) {
        console.log('[RTMPStreamService] Found playing video element');
        return video;
      }
    }
    
    if (videos.length > 0) {
      console.log('[RTMPStreamService] Using first video element');
      return videos[0] as HTMLVideoElement;
    }
    
    return null;
  }

  /**
   * Find the PROGRAM monitor element
   */
  private findProgramElement(): HTMLElement | null {
    const selectors = [
      '[data-program="true"]',
      '.program-monitor',
      '[class*="program"]',
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[RTMPStreamService] Found PROGRAM element with selector:', selector);
        return element as HTMLElement;
      }
    }
    
    // Fallback: find by text content
    const headers = document.querySelectorAll('h2');
    for (const header of headers) {
      if (header.textContent?.includes('PROGRAM')) {
        const container = header.closest('div')?.parentElement;
        if (container) {
          console.log('[RTMPStreamService] Found PROGRAM by header text');
          return container as HTMLElement;
        }
      }
    }
    
    return null;
  }

  /**
   * Get supported MIME type for MediaRecorder
   */
  private getSupportedMimeType(): string {
    // Priority: H.264 first (best for RTMP/YouTube), then VP9, then VP8
    // H.264 allows FFmpeg to do simple remux without re-encoding
    const types = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',  // H.264 Baseline + AAC
      'video/mp4;codecs=avc1.4D401E,mp4a.40.2',  // H.264 Main + AAC  
      'video/mp4;codecs=avc1.64001E,mp4a.40.2',  // H.264 High + AAC
      'video/webm;codecs=h264,opus',              // WebM with H.264
      'video/webm;codecs=h264',                   // WebM with H.264 (no audio codec specified)
      'video/mp4',                                // MP4 container
      'video/webm;codecs=vp9,opus',               // VP9 (fallback)
      'video/webm;codecs=vp8,opus',               // VP8 (fallback)
      'video/webm',                               // WebM default
    ];
    
    console.log('[RTMPStreamService] Checking supported MIME types...');
    for (const type of types) {
      const supported = MediaRecorder.isTypeSupported(type);
      console.log(`[RTMPStreamService]   ${type}: ${supported ? '✅' : '❌'}`);
      if (supported) {
        console.log('[RTMPStreamService] 🎬 Selected MIME type:', type);
        return type;
      }
    }
    
    console.warn('[RTMPStreamService] No preferred MIME type supported, using browser default');
    return '';
  }

  /**
   * Start streaming to all enabled destinations
   */
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      console.warn('[RTMPStreamService] Already streaming');
      return;
    }

    const enabledDestinations = this.destinations.filter(d => d.enabled !== false);
    if (enabledDestinations.length === 0) {
      throw new Error('No streaming destinations configured');
    }

    console.log('[RTMPStreamService] Starting stream to', enabledDestinations.length, 'destinations');
    this.updateStatus('connecting');
    this.reconnectAttempts = 0;

    // Find video element first (preferred)
    this.videoElement = this.findVideoElement();
    
    if (!this.videoElement) {
      const programElement = this.findProgramElement();
      if (!programElement) {
        console.log('[RTMPStreamService] No video or PROGRAM element found, will use placeholder');
      }
      console.log('[RTMPStreamService] Will capture PROGRAM DOM element');
    } else {
      console.log('[RTMPStreamService] Will capture video element');
    }

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

    this.isStreaming = true;
    this.chunksSent = 0;
    this.bytesSent = 0;
    this.startTime = Date.now();

    // SIMPLIFIED: No ChunkQueue, direct streaming
    this.backpressureActive = false;

    // Start canvas capture and MediaRecorder
    await this.startMediaRecorder();
    
    // Start stats tracking
    this.startStatsTracking();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Start keep-alive to prevent browser suspension
    this.startKeepAlive();

    this.updateStatus('streaming');
    console.log('[RTMPStreamService] Stream started with MediaRecorder');

    // Auto-transition YouTube broadcasts to LIVE after stream starts
    await this.transitionYouTubeBroadcastsToLive();
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.lastHeartbeatAck = Date.now();
    
    // Send heartbeat every 10 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
        
        // Check if we haven't received ack in 30 seconds
        const timeSinceAck = Date.now() - this.lastHeartbeatAck;
        if (timeSinceAck > 30000) {
          console.warn('[RTMPStreamService] ⚠️ No heartbeat ack for 30s, connection may be stale');
        }
      }
    }, 10000);
    
    console.log('[RTMPStreamService] Heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start keep-alive mechanisms to prevent browser from suspending the tab
   * Uses multiple strategies: Wake Lock API, silent audio, and periodic activity
   */
  private async startKeepAlive(): Promise<void> {
    console.log('[RTMPStreamService] Starting keep-alive mechanisms...');
    
    // Strategy 1: Wake Lock API (prevents screen from sleeping)
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[RTMPStreamService] ✅ Wake Lock acquired');
        
        // Re-acquire wake lock if it's released (e.g., when tab becomes visible again)
        this.wakeLock.addEventListener('release', async () => {
          console.log('[RTMPStreamService] Wake Lock released, re-acquiring...');
          if (this.isStreaming) {
            try {
              this.wakeLock = await (navigator as any).wakeLock.request('screen');
              console.log('[RTMPStreamService] ✅ Wake Lock re-acquired');
            } catch (e) {
              console.warn('[RTMPStreamService] Failed to re-acquire Wake Lock');
            }
          }
        });
      }
    } catch (e) {
      console.warn('[RTMPStreamService] Wake Lock not available:', e);
    }
    
    // Strategy 2: Silent audio to keep browser active
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // Set volume to 0 (silent)
      gainNode.gain.value = 0;
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      oscillator.start();
      
      console.log('[RTMPStreamService] ✅ Silent audio started');
    } catch (e) {
      console.warn('[RTMPStreamService] Silent audio not available:', e);
    }
    
    // Strategy 3: Periodic activity to prevent tab throttling
    this.keepAliveInterval = setInterval(() => {
      if (this.isStreaming) {
        // Touch the DOM to keep the tab active
        const now = Date.now();
        document.title = `🔴 LIVE - OnnPlay Studio`;
        
        // Log keep-alive activity
        if (now % 60000 < 5000) { // Log every minute
          console.log('[RTMPStreamService] Keep-alive tick - stream active');
        }
        
        // Force a small layout recalculation to prevent throttling
        const dummy = document.body.offsetHeight;
      }
    }, 5000); // Every 5 seconds
    
    // Strategy 4: Visibility change handler
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    console.log('[RTMPStreamService] ✅ Keep-alive mechanisms started');
  }
  
  /**
   * Handle visibility change to re-acquire wake lock
   */
  private handleVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState === 'visible' && this.isStreaming) {
      console.log('[RTMPStreamService] Tab became visible, checking wake lock...');
      
      if (!this.wakeLock && 'wakeLock' in navigator) {
        try {
          this.wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('[RTMPStreamService] ✅ Wake Lock re-acquired on visibility change');
        } catch (e) {
          console.warn('[RTMPStreamService] Failed to re-acquire Wake Lock');
        }
      }
    }
  };
  
  /**
   * Stop keep-alive mechanisms
   */
  private stopKeepAlive(): void {
    console.log('[RTMPStreamService] Stopping keep-alive mechanisms...');
    
    // Release wake lock
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
    
    // Stop silent audio
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Clear keep-alive interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    // Remove visibility change listener
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Reset title
    document.title = 'OnnPlay Studio';
    
    console.log('[RTMPStreamService] ✅ Keep-alive mechanisms stopped');
  }

  /**
   * Attempt to reconnect to server
   */
  private async attemptReconnect(): Promise<void> {
    if (!this.isStreaming) {
      console.log('[RTMPStreamService] Not streaming, skipping reconnect');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RTMPStreamService] Max reconnect attempts reached, stopping stream');
      this.updateStatus('error', 'Connection lost after multiple reconnect attempts');
      await this.stopStreaming();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`[RTMPStreamService] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    this.updateStatus('reconnecting');
    this.stats.reconnectAttempts = this.reconnectAttempts;

    this.reconnectTimer = setTimeout(async () => {
      try {
        // Disconnect old socket
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
          this.socket = null;
        }

        // Reconnect
        await this.connectToServer();
        
        // Restart relay on server
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

        console.log('[RTMPStreamService] ✅ Reconnected successfully!');
        this.reconnectAttempts = 0;
        this.updateStatus('streaming');
        
      } catch (error) {
        console.error('[RTMPStreamService] Reconnect failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  /**
   * Transition YouTube broadcasts to LIVE status
   * This is required because YouTube needs explicit transition after receiving stream
   */
  private async transitionYouTubeBroadcastsToLive(): Promise<void> {
    // Find YouTube destinations
    const youtubeDestinations = this.destinations.filter(
      d => d.platform === 'youtube' && d.enabled !== false
    );

    if (youtubeDestinations.length === 0) {
      console.log('[RTMPStreamService] No YouTube destinations to transition');
      return;
    }

    console.log('[RTMPStreamService] Waiting 5 seconds for YouTube to receive stream...');
    
    // Wait for YouTube to receive and process the stream
    await new Promise(resolve => setTimeout(resolve, 5000));

    for (const dest of youtubeDestinations) {
      try {
        // Extract broadcastId and accountId from destination
        // The destination should have these stored when created
        const broadcastId = (dest as any).broadcastId;
        const accountId = (dest as any).accountId;
        const userId = (dest as any).userId || 'default-user';

        if (!broadcastId || !accountId) {
          console.log('[RTMPStreamService] YouTube destination missing broadcastId or accountId:', dest.id);
          continue;
        }

        console.log('[RTMPStreamService] Transitioning YouTube broadcast to LIVE:', broadcastId);

        const response = await fetch('/api/youtube/oauth/go-live', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            broadcastId,
            userId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[RTMPStreamService] YouTube broadcast is now LIVE!', data);
          
          // Dispatch event for chat auto-connect
          window.dispatchEvent(new CustomEvent('broadcast:live', {
            detail: {
              broadcastId: broadcastId,
              liveChatId: data.liveChatId || broadcastId,
              platform: 'youtube',
              accountId: accountId
            }
          }));
          console.log('[RTMPStreamService] Dispatched broadcast:live event for chat auto-connect');
        } else {
          const error = await response.json();
          console.error('[RTMPStreamService] Failed to transition YouTube broadcast:', error);
        }
      } catch (error) {
        console.error('[RTMPStreamService] Error transitioning YouTube broadcast:', error);
      }
    }
  }

  /**
   * Connect to the streaming server
   * UPDATED: Added reconnection logic and heartbeat handling
   */
  private async connectToServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverUrl = window.location.origin;
      console.log('[RTMPStreamService] Connecting to server:', serverUrl);

      this.socket = io(serverUrl, {
        path: '/socket.io/stream',
        transports: ['websocket'],  // BACKUP24 FIX: WebSocket only (no polling)
        timeout: 30000,           // Increased from 10s to 30s
        reconnection: false,      // We handle reconnection manually
        forceNew: true,           // Force new connection
      });

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);

      this.socket.on('connect', () => {
        console.log('[RTMPStreamService] Connected to server');
        clearTimeout(timeout);
      });

      this.socket.on('connected', () => {
        console.log('[RTMPStreamService] Server acknowledged connection');
        resolve();
      });

      this.socket.on('relay-started', (data: { message: string; heartbeatInterval?: number }) => {
        console.log('[RTMPStreamService] Server relay started:', data.message);
      });

      this.socket.on('status', (data: { target: string; status: string; speed?: number; fps?: number }) => {
        console.log('[RTMPStreamService] Status update:', data);
        
        // Detectar quando o stream morre (FFmpeg fechou)
        if (data.status === 'error' || data.status === 'stopped') {
          console.warn('[RTMPStreamService] Stream ended:', data.status);
          this.updateStatus('error', 'Stream ended by server');
        }
        
        // If speed is too low, log warning
        if (data.speed && data.speed < 0.8) {
          console.warn('[RTMPStreamService] ⚠️ FFmpeg speed is low:', data.speed);
        }
      });

      // Handle heartbeat acknowledgment
      this.socket.on('heartbeat-ack', (data: { timestamp: number }) => {
        this.lastHeartbeatAck = Date.now();
        const latency = Date.now() - data.timestamp;
        if (latency > 1000) {
          console.warn('[RTMPStreamService] High latency detected:', latency, 'ms');
        }
      });

      // SIMPLIFIED: Just log backpressure, don't stop sending
      this.socket.on('backpressure', (data: { reason: string; speed?: number; queueSize?: number }) => {
        console.warn('[RTMPStreamService] ⚠️ Server backpressure (ignoring):', data);
        // Don't set backpressureActive - keep sending data
      });

      // Handle server warnings
      this.socket.on('warning', (data: { message: string }) => {
        console.warn('[RTMPStreamService] Server warning:', data.message);
      });

      this.socket.on('error', (data: { message: string }) => {
        console.error('[RTMPStreamService] Server error:', data.message);
        this.updateStatus('error', data.message);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('[RTMPStreamService] Disconnected:', reason);
        
        if (this.isStreaming) {
          console.warn('[RTMPStreamService] ⚠️ Disconnected while streaming, attempting reconnect...');
          
          // Don't update status to error immediately, try to reconnect
          if (reason !== 'io client disconnect') {
            this.attemptReconnect();
          }
        }
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('[RTMPStreamService] Connection error:', error);
        clearTimeout(timeout);
        
        if (this.isStreaming && this.reconnectAttempts > 0) {
          // Already trying to reconnect, don't reject
          console.log('[RTMPStreamService] Connection error during reconnect, will retry');
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Start MediaRecorder for browser-side encoding
   */
  private async startMediaRecorder(): Promise<void> {
    if (!this.captureCanvas || !this.captureCtx) {
      throw new Error('Canvas not initialized');
    }

    // Start canvas animation loop
    this.startCanvasCapture();

    // Create stream from canvas
    this.canvasStream = this.captureCanvas.captureStream(this.config.frameRate);
    
    // ========== AUDIO MIXER - Cria um mixer de áudio que fica sempre conectado ==========
    console.log('[RTMPStreamService] ========== INITIALIZING AUDIO MIXER ==========');
    
    // Criar AudioContext para o mixer
    this.streamAudioContext = new AudioContext();
    this.audioMixerDestination = this.streamAudioContext.createMediaStreamDestination();
    
    // Adicionar o audio track do mixer ao stream (este track NUNCA muda)
    const mixerAudioTrack = this.audioMixerDestination.stream.getAudioTracks()[0];
    if (mixerAudioTrack) {
      this.canvasStream.addTrack(mixerAudioTrack);
      console.log('[RTMPStreamService] ✅ Audio mixer track added to stream');
    }
    
    // Tentar conectar o vídeo atual ao mixer
    await this.connectVideoAudioToMixer();
    
    console.log('[RTMPStreamService] Audio tracks in stream:', this.canvasStream.getAudioTracks().length);
    console.log('[RTMPStreamService] ========== AUDIO MIXER INITIALIZED ==========');
    // ========== FIM DO AUDIO MIXER ==========

    // Get supported MIME type
    const mimeType = this.getSupportedMimeType();
    
    // Create MediaRecorder with optimal settings
    const options: MediaRecorderOptions = {
      videoBitsPerSecond: this.config.videoBitrate,
      audioBitsPerSecond: this.config.audioBitrate,
    };
    
    if (mimeType) {
      options.mimeType = mimeType;
    }

    this.mediaRecorder = new MediaRecorder(this.canvasStream, options);

    // ========== SIMPLIFIED DIRECT STREAMING ==========
    // Send chunks directly to socket - no intermediate buffers
    // This is how StreamYard and professional streaming services work
    console.log('[RTMPStreamService] 🚀 Using DIRECT streaming (no buffers)');

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.isStreaming && this.socket?.connected) {
        try {
          const arrayBuffer = await event.data.arrayBuffer();
          
          // Send directly to socket - simple and reliable
          this.socket.emit('video-chunk', arrayBuffer);
          
          this.chunksSent++;
          this.bytesSent += arrayBuffer.byteLength;
          
          // Log progress every 50 chunks (~5 seconds at 100ms timeslice)
          if (this.chunksSent % 50 === 0) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const bitrate = (this.bytesSent * 8 / elapsed / 1000).toFixed(0);
            console.log(`[RTMPStreamService] 📊 Sent ${this.chunksSent} chunks, ${(this.bytesSent / 1024 / 1024).toFixed(2)} MB, ${bitrate} kbps`);
          }
        } catch (err) {
          console.error('[RTMPStreamService] Error sending chunk:', err);
        }
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[RTMPStreamService] MediaRecorder error:', event);
      console.warn('[RTMPStreamService] MediaRecorder error occurred but continuing...');
    };

    // Start recording with optimized timeslice
    // 100ms provides more frequent chunks for smoother streaming:
    // - Smaller chunks = more consistent frame delivery
    // - Better real-time performance
    // - Reduced buffering on viewer side
    // Trade-off: more network overhead (acceptable with good connection)
    const TIMESLICE_MS = 100;
    this.mediaRecorder.start(TIMESLICE_MS);
    console.log(`[RTMPStreamService] MediaRecorder started with ${mimeType || 'default codec'}, timeslice=${TIMESLICE_MS}ms`);
  }

  /**
   * Connect video audio to the mixer (can be called anytime to switch audio source)
   * Uses MediaElementSource for reliable audio capture
   */
  private async connectVideoAudioToMixer(): Promise<void> {
    if (!this.streamAudioContext || !this.audioMixerDestination) {
      console.log('[RTMPStreamService] Audio mixer not initialized');
      return;
    }

    // Buscar o vídeo ativo atual
    const currentSource = mediaSourceService.getActiveSource();
    
    console.log('[RTMPStreamService] Connecting audio for source:', currentSource?.name || 'none', 'type:', currentSource?.type || 'none');
    
    if (!currentSource || currentSource.type !== 'video') {
      console.log('[RTMPStreamService] No video source active, audio mixer will be silent');
      return;
    }

    const videoElement = currentSource.videoElement;
    if (!videoElement) {
      console.log('[RTMPStreamService] Video element not found');
      return;
    }

    // Se já estamos conectados a este vídeo, não fazer nada
    if (this.currentVideoElement === videoElement && this.currentAudioSource) {
      console.log('[RTMPStreamService] Already connected to this video');
      return;
    }

    try {
      // Desconectar fonte anterior se existir
      if (this.currentAudioSource) {
        try {
          this.currentAudioSource.disconnect();
          console.log('[RTMPStreamService] Disconnected previous audio source');
        } catch (e) {
          // Ignorar erro de desconexão
        }
        this.currentAudioSource = null;
      }

      // Verificar se já existe um MediaElementSource para este vídeo
      const existingSource = (videoElement as any).__audioSource;
      let source: MediaElementAudioSourceNode;
      
      if (existingSource && existingSource.context === this.streamAudioContext) {
        source = existingSource;
        console.log('[RTMPStreamService] Reusing existing MediaElementSource');
      } else {
        // Desmutar o vídeo antes de criar MediaElementSource
        videoElement.muted = false;
        videoElement.volume = 1.0;
        
        source = this.streamAudioContext.createMediaElementSource(videoElement);
        (videoElement as any).__audioSource = source;
        console.log('[RTMPStreamService] Created new MediaElementSource');
      }

      // Conectar ao mixer E ao destino local (necessário com MediaElementSource)
      source.connect(this.audioMixerDestination);
      source.connect(this.streamAudioContext.destination);
      
      this.currentAudioSource = source;
      this.currentVideoElement = videoElement;
      
      console.log('[RTMPStreamService] ✅ Video audio connected via MediaElementSource');
      
    } catch (err) {
      console.error('[RTMPStreamService] Error connecting video audio to mixer:', err);
    }
  }

  /**
   * Start canvas capture animation loop - OPTIMIZED for 30fps
   */
  private startCanvasCapture(): void {
    if (!this.captureCanvas || !this.captureCtx) return;

    // Use setInterval at 30fps instead of requestAnimationFrame (60fps)
    // This reduces CPU usage by 50%
    const targetFps = this.config.frameRate;
    const frameInterval = 1000 / targetFps; // ~33ms for 30fps
    let lastFrameTime = 0;

    const drawFrame = (timestamp: number) => {
      if (!this.isStreaming || !this.captureCtx || !this.captureCanvas) {
        return;
      }

      // Throttle to target FPS
      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) {
        this.animationFrameId = requestAnimationFrame(drawFrame);
        return;
      }
      lastFrameTime = timestamp - (elapsed % frameInterval);

      try {
        // Priority 1: Check for active media source (image/video uploaded by user)
        if (this.activeMediaSource && this.activeMediaSource.canvas) {
          // Draw from the media source's canvas
          this.captureCtx.drawImage(
            this.activeMediaSource.canvas, 
            0, 0, 
            this.config.width, 
            this.config.height
          );
        }
        // Priority 2: Try to capture video element (webcam/screen share)
        else if (this.videoElement && !this.videoElement.paused && this.videoElement.readyState >= 2) {
          this.captureCtx.drawImage(
            this.videoElement, 
            0, 0, 
            this.config.width, 
            this.config.height
          );
        } 
        // Priority 3: Fallback - draw placeholder (only draw once, not every frame)
        else {
          // Draw a simple solid background (much faster than gradient)
          this.captureCtx.fillStyle = '#1a1a2e';
          this.captureCtx.fillRect(0, 0, this.config.width, this.config.height);
          
          // Draw "OnnPlay" text
          this.captureCtx.fillStyle = '#ffffff';
          this.captureCtx.font = 'bold 48px Arial';
          this.captureCtx.textAlign = 'center';
          this.captureCtx.textBaseline = 'middle';
          this.captureCtx.fillText('OnnPlay Studio', this.config.width / 2, this.config.height / 2);
        }
        // ========== DRAW CHAT OVERLAY ==========
        // Render pinned comments on top of the video
        this.drawChatOverlay(this.captureCtx, this.config.width, this.config.height);
        
      } catch (error) {
        console.error('[RTMPStreamService] Error drawing frame:', error);
      }

      this.animationFrameId = requestAnimationFrame(drawFrame);
    };

    // Start with timestamp 0
    this.animationFrameId = requestAnimationFrame(drawFrame);
  }

  /**
   * Draw chat overlay on the canvas
   * Renders pinned comments in StreamYard style
   */
  private drawChatOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pinnedComments = commentOverlayService.getPinnedComments();
    if (pinnedComments.length === 0) return;

    const config = commentOverlayService.getConfig();
    const comment = pinnedComments[0]; // Show only the first pinned comment
    if (!comment) return;

    // Calculate position based on config
    const padding = 20;
    const boxWidth = Math.min(400, width * 0.35); // Max 35% of width
    const boxHeight = 80;
    
    let x = padding;
    let y = height - boxHeight - padding;

    // Position based on config
    switch (config.position) {
      case 'top-left':
        x = padding;
        y = padding;
        break;
      case 'top-center':
        x = (width - boxWidth) / 2;
        y = padding;
        break;
      case 'top-right':
        x = width - boxWidth - padding;
        y = padding;
        break;
      case 'bottom-left':
        x = padding;
        y = height - boxHeight - padding;
        break;
      case 'bottom-center':
        x = (width - boxWidth) / 2;
        y = height - boxHeight - padding;
        break;
      case 'bottom-right':
        x = width - boxWidth - padding;
        y = height - boxHeight - padding;
        break;
    }

    // Draw background with rounded corners
    ctx.save();
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.roundRect(ctx, x, y, boxWidth, boxHeight, 12);
    ctx.fill();

    // Left accent bar (brand color)
    ctx.fillStyle = config.brandColor || '#FF6B00';
    ctx.fillRect(x, y, 4, boxHeight);

    // Avatar circle
    const avatarSize = 50;
    const avatarX = x + 16;
    const avatarY = y + (boxHeight - avatarSize) / 2;
    
    // Draw avatar placeholder (circle with initial)
    ctx.fillStyle = this.getPlatformColor(comment.platform);
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Avatar initial
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      comment.author.name.charAt(0).toUpperCase(),
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2
    );

    // Author name
    const textX = avatarX + avatarSize + 12;
    const textMaxWidth = boxWidth - avatarSize - 50;
    
    ctx.fillStyle = config.brandColor || '#FF6B00';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Truncate name if too long
    let authorName = comment.author.name;
    while (ctx.measureText(authorName).width > textMaxWidth && authorName.length > 3) {
      authorName = authorName.slice(0, -1);
    }
    if (authorName !== comment.author.name) authorName += '...';
    
    ctx.fillText(authorName, textX, y + 14);

    // Message
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'top';
    
    // Word wrap message
    const words = comment.message.split(' ');
    let line = '';
    let lineY = y + 36;
    const lineHeight = 18;
    const maxLines = 2;
    let currentLine = 0;

    for (const word of words) {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > textMaxWidth) {
        ctx.fillText(line.trim(), textX, lineY);
        line = word + ' ';
        lineY += lineHeight;
        currentLine++;
        if (currentLine >= maxLines) {
          // Add ellipsis if more text
          if (words.indexOf(word) < words.length - 1) {
            ctx.fillText(line.trim() + '...', textX, lineY - lineHeight);
          }
          break;
        }
      } else {
        line = testLine;
      }
    }
    if (currentLine < maxLines && line.trim()) {
      ctx.fillText(line.trim(), textX, lineY);
    }

    ctx.restore();
  }

  /**
   * Helper to draw rounded rectangle
   */
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Get platform color for avatar background
   */
  private getPlatformColor(platform: string): string {
    switch (platform) {
      case 'youtube': return '#FF0000';
      case 'twitch': return '#9146FF';
      case 'facebook': return '#1877F2';
      default: return '#FF6B00';
    }
  }

  /**
   * Set video element to capture
   */
  setVideoElement(element: HTMLVideoElement | null): void {
    this.videoElement = element;
    console.log('[RTMPStreamService] Video element set:', element ? 'yes' : 'no');
  }

  /**
   * Get active media source
   */
  getActiveMediaSource(): MediaSource | null {
    return this.activeMediaSource;
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      console.warn('[RTMPStreamService] Not streaming');
      return;
    }

    console.log('[RTMPStreamService] Stopping stream...');
    this.isStreaming = false;

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Stop heartbeat
    this.stopHeartbeat();
    
    // Stop keep-alive mechanisms
    this.stopKeepAlive();

    // Stop animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop StreamBuffer (capacitor)
    if (this.streamBuffer) {
      this.streamBuffer.stop();
      this.streamBuffer = null;
      console.log('[RTMPStreamService] StreamBuffer stopped');
    }

    // BACKUP24 FIX: Clear ChunkQueue
    if (this.chunkQueue) {
      const stats = this.chunkQueue.getStats();
      console.log('[RTMPStreamService] 📦 Final Queue Stats:', {
        chunksDropped: stats.chunksDropped,
        chunksSent: stats.chunksSent,
      });
      this.chunkQueue.clear();
      this.chunkQueue = null;
      console.log('[RTMPStreamService] ChunkQueue cleared');
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Stop canvas stream tracks
    if (this.canvasStream) {
      this.canvasStream.getTracks().forEach(track => track.stop());
      this.canvasStream = null;
    }

    // Stop stats tracking
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Tell server to stop
    if (this.socket?.connected) {
      this.socket.emit('stop');
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
    this.updateStatus('idle');
    console.log('[RTMPStreamService] Stream stopped');
  }

  /**
   * Start tracking stats
   */
  private startStatsTracking(): void {
    let lastBytesSent = 0;
    let lastTime = Date.now();

    this.statsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      const bytesDiff = this.bytesSent - lastBytesSent;
      
      const bitrate = (bytesDiff * 8) / elapsed / 1000; // Kbps
      const duration = (now - this.startTime) / 1000;
      
      this.stats = {
        isStreaming: this.isStreaming,
        framesSent: this.chunksSent,
        bytesSent: this.bytesSent,
        bitrate: Math.round(bitrate),
        fps: this.config.frameRate,
        duration: Math.round(duration),
        status: this.isStreaming ? (this.reconnectAttempts > 0 ? 'reconnecting' : 'streaming') : 'idle',
        reconnectAttempts: this.reconnectAttempts,
      };

      lastBytesSent = this.bytesSent;
      lastTime = now;

      this.notifyCallbacks();
    }, 1000);
  }

  /**
   * Subscribe to stats updates
   */
  subscribe(callback: StreamCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe to status updates
   */
  onStatus(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(cb => cb(this.stats));
  }

  /**
   * Update status and notify
   */
  private updateStatus(status: StreamStats['status'], error?: string): void {
    this.stats.status = status;
    this.stats.error = error;
    this.statusCallbacks.forEach(cb => cb(status, error));
    this.notifyCallbacks();
  }

  /**
   * Get current stats
   */
  getStats(): StreamStats {
    return { ...this.stats };
  }

  /**
   * Check if currently streaming
   */
  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Process chunk queue (BACKUP24 FIX)
   * 
   * Processes chunks from the queue one at a time (microtask) to avoid blocking the main thread.
   * Uses emit 'volatile' to avoid backlog when the server is slow.
   */
  private async processChunkQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.chunkQueue || !this.socket) {
      return;
    }

    this.isProcessingQueue = true;

    while (!this.chunkQueue.isEmpty() && this.isStreaming) {
      // Check if backpressure is active
      if (this.backpressureActive) {
        console.warn('[RTMPStreamService] ⚠️ Backpressure active, pausing queue processing');
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        continue;
      }

      const chunk = this.chunkQueue.dequeue();
      if (!chunk) {
        break;
      }

      const startTime = performance.now();

      // BACKUP24 FIX: Use emit 'volatile' to avoid backlog
      // volatile = if the packet cannot be sent immediately, it will be dropped
      this.socket.volatile.emit('video-chunk', {
        data: chunk,
        destinations: this.destinations.filter(d => d.enabled !== false).map(d => d.id),
      });

      const emitTime = performance.now() - startTime;

      // Log if emit is taking too long
      if (emitTime > 10) {
        console.warn(`[RTMPStreamService] ⚠️ Emit took ${emitTime.toFixed(2)}ms`);
      }

      this.chunksSent++;
      this.bytesSent += chunk.byteLength;

      // Log queue stats every 100 chunks
      if (this.chunksSent % 100 === 0) {
        const stats = this.chunkQueue.getStats();
        console.log('[RTMPStreamService] 📊 Queue Stats:', {
          queueLength: stats.queueLength,
          bytesPending: (stats.bytesPending / 1024).toFixed(2) + ' KB',
          chunksDropped: stats.chunksDropped,
          chunksSent: stats.chunksSent,
          chunksPerSecond: stats.chunksPerSecond.toFixed(2),
        });
      }

      // Yield to event loop every 5 chunks to avoid blocking
      if (this.chunksSent % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Update configuration (ETAPA 1 - Diagnostics Panel)
   * 
   * @param newConfig - New configuration to apply
   * 
   * Note: Changes will only take effect after restarting the stream.
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    console.log('[RTMPStreamService] 🔧 UPDATING CONFIGURATION:');
    console.log('  Old config:', this.config);
    
    // Update config
    Object.assign(this.config, newConfig);
    
    console.log('  New config:', this.config);
    
    // Update canvas size if resolution changed
    if (newConfig.width || newConfig.height) {
      if (this.captureCanvas) {
        this.captureCanvas.width = this.config.width;
        this.captureCanvas.height = this.config.height;
        console.log(`  Canvas resized to ${this.config.width}x${this.config.height}`);
      }
    }
    
    // Update StreamBuffer size if changed
    if (newConfig.bufferSize && this.streamBuffer) {
      this.streamBuffer.setBufferSize(this.config.bufferSize);
      console.log(`  Buffer size changed to ${this.config.bufferSize} KB`);
    }
    
    console.log('[RTMPStreamService] ✅ Configuration updated successfully');
    
    if (this.isStreaming) {
      console.warn('[RTMPStreamService] ⚠️ Stream is currently active. Restart the stream for changes to take effect.');
    }
  }
}

// Export singleton instance
export const rtmpStreamService = new RTMPStreamService();
export default rtmpStreamService;
