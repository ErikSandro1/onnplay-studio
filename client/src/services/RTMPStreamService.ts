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
import AudioMixerService, { AudioSource } from './AudioMixerService';

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
  // private masterGainNode: GainNode | null = null; // Para controle de volume mestre
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
  
  // Config - YouTube Professional Settings
  private config = {
    width: 1280,
    height: 720,
    frameRate: 30,
    videoBitrate: 4000000,  // 4 Mbps for YouTube 720p
    audioBitrate: 128000,
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
    });
    
    // Listen for media activation events
    window.addEventListener('media:activate', ((event: CustomEvent) => {
      console.log('[RTMPStreamService] Media activated:', event.detail);
      this.activeMediaSource = mediaSourceService.getActiveSource();
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
   * Update streaming config
   */
  updateConfig(config: Partial<typeof this.config>): void {
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
    // IMPORTANTE: Incluir codecs de áudio para garantir que o áudio seja gravado
    const types = [
      'video/webm;codecs=vp9,opus',      // VP9 video + Opus audio (melhor qualidade)
      'video/webm;codecs=vp8,opus',      // VP8 video + Opus audio
      'video/webm;codecs=h264,opus',     // H264 video + Opus audio
      'video/webm;codecs=vp9,vorbis',    // VP9 video + Vorbis audio
      'video/webm;codecs=vp8,vorbis',    // VP8 video + Vorbis audio
      'video/webm;codecs=h264',          // H264 sem codec de áudio específico
      'video/webm;codecs=vp9',           // VP9 sem codec de áudio específico
      'video/webm;codecs=vp8',           // VP8 sem codec de áudio específico
      'video/webm',                       // WebM genérico
      'video/mp4',                        // MP4 fallback
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('[RTMPStreamService] ✅ Using MIME type:', type);
        return type;
      }
    }
    
    console.warn('[RTMPStreamService] ⚠️ No preferred MIME type supported, using default');
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
        transports: ['websocket', 'polling'],
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

    // Create stream from canvas (video track)
    const videoStream = this.captureCanvas.captureStream(this.config.frameRate);
    
    // Create a new stream for the MediaRecorder
    const streamToRecord = new MediaStream();
    
    // 1. Add video track from canvas
    videoStream.getVideoTracks().forEach(track => streamToRecord.addTrack(track));
    
    // 2. ABORDAGEM DIRETA: Capturar áudio diretamente do vídeo ativo
    console.log('[RTMPStreamService] 🎵 Starting audio capture...');
    
    let audioAdded = false;
    
    // Tentar capturar áudio diretamente do vídeo no PROGRAM
    const activeSource = mediaSourceService.getActiveSource();
    console.log('[RTMPStreamService] Active source:', activeSource?.name, activeSource?.type);
    
    if (activeSource && activeSource.type === 'video') {
      const videoElement = activeSource.videoElement || activeSource.element as HTMLVideoElement;
      
      if (videoElement) {
        console.log('[RTMPStreamService] Found video element, attempting audio capture...');
        
        // Garantir que o vídeo não está mudo
        videoElement.muted = false;
        videoElement.volume = 1.0;
        
        // Se pausado, iniciar
        if (videoElement.paused) {
          try {
            await videoElement.play();
            console.log('[RTMPStreamService] Video started playing');
          } catch (e) {
            console.log('[RTMPStreamService] Could not auto-play video:', e);
          }
        }
        
        // IMPORTANTE: Aguardar um pouco para garantir que o vídeo está tocando com áudio
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verificar se o vídeo tem áudio
        const videoHasAudio = (videoElement as any).mozHasAudio !== undefined 
          ? (videoElement as any).mozHasAudio 
          : (videoElement as any).webkitAudioDecodedByteCount !== undefined 
            ? (videoElement as any).webkitAudioDecodedByteCount > 0 
            : true; // Assumir que tem áudio se não puder verificar
        
        console.log('[RTMPStreamService] Video state - muted:', videoElement.muted, 'volume:', videoElement.volume, 'paused:', videoElement.paused, 'hasAudio:', videoHasAudio, 'currentTime:', videoElement.currentTime);
        
        // Método 1: captureStream do elemento de vídeo
        const videoWithCapture = videoElement as HTMLVideoElement & { 
          captureStream?: () => MediaStream;
          mozCaptureStream?: () => MediaStream;
        };
        
        if (videoWithCapture.captureStream) {
          try {
            const capturedStream = videoWithCapture.captureStream();
            const audioTracks = capturedStream.getAudioTracks();
            console.log('[RTMPStreamService] captureStream() returned', audioTracks.length, 'audio tracks');
            
            if (audioTracks.length > 0) {
              audioTracks.forEach(track => {
                track.enabled = true;
                streamToRecord.addTrack(track);
                console.log('[RTMPStreamService] ✅ Added audio track from captureStream:', track.label);
              });
              audioAdded = true;
            }
          } catch (e) {
            console.error('[RTMPStreamService] captureStream failed:', e);
          }
        }
        
        // Método 2: Se captureStream não funcionou, tentar videoElementStream
        if (!audioAdded && activeSource.videoElementStream) {
          const audioTracks = activeSource.videoElementStream.getAudioTracks();
          console.log('[RTMPStreamService] videoElementStream has', audioTracks.length, 'audio tracks');
          
          if (audioTracks.length > 0) {
            audioTracks.forEach(track => {
              track.enabled = true;
              streamToRecord.addTrack(track);
              console.log('[RTMPStreamService] ✅ Added audio track from videoElementStream:', track.label);
            });
            audioAdded = true;
          }
        }
        
        // Método 3: Usar Web Audio API para capturar do elemento de vídeo
        if (!audioAdded) {
          try {
            console.log('[RTMPStreamService] Trying Web Audio API approach...');
            const audioContext = new AudioContext();
            const source = audioContext.createMediaElementSource(videoElement);
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            source.connect(audioContext.destination); // Para ouvir localmente também
            
            const audioTracks = destination.stream.getAudioTracks();
            if (audioTracks.length > 0) {
              audioTracks.forEach(track => {
                track.enabled = true;
                streamToRecord.addTrack(track);
                console.log('[RTMPStreamService] ✅ Added audio track from Web Audio API:', track.label);
              });
              audioAdded = true;
            }
          } catch (e) {
            console.error('[RTMPStreamService] Web Audio API approach failed:', e);
          }
        }
      }
    }
    
    // Fallback: Usar microfone se nenhum áudio de vídeo disponível
    if (!audioAdded) {
      console.log('[RTMPStreamService] ⚠️ No video audio available, trying microphone...');
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micTrack = micStream.getAudioTracks()[0];
        if (micTrack) {
          micTrack.enabled = true;
          streamToRecord.addTrack(micTrack);
          console.log('[RTMPStreamService] ✅ Added microphone audio as fallback');
          audioAdded = true;
        }
      } catch (e) {
        console.log('[RTMPStreamService] Microphone not available:', e);
      }
    }
    
    // Log final
    console.log('[RTMPStreamService] =================================');
    console.log('[RTMPStreamService] Final stream to record:');
    console.log('[RTMPStreamService] - Video tracks:', streamToRecord.getVideoTracks().length);
    console.log('[RTMPStreamService] - Audio tracks:', streamToRecord.getAudioTracks().length);
    streamToRecord.getAudioTracks().forEach((track, i) => {
      console.log(`[RTMPStreamService] - Audio track ${i}:`, track.label, 'enabled:', track.enabled);
    });
    console.log('[RTMPStreamService] =================================');
    
    // Update this.canvasStream to the new mixed stream
    this.canvasStream = streamToRecord;
    
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

    this.mediaRecorder = new MediaRecorder(streamToRecord, options);

    // Send data chunks to server
    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.socket?.connected && this.isStreaming) {
        const arrayBuffer = await event.data.arrayBuffer();
        this.socket.emit('video-chunk', arrayBuffer);
        
        this.chunksSent++;
        this.bytesSent += event.data.size;
        
        if (this.chunksSent % 30 === 0) {
          console.log(`[RTMPStreamService] Sent chunk ${this.chunksSent}, ${(this.bytesSent / 1024 / 1024).toFixed(2)} MB total`);
        }
      } else if (event.data.size > 0 && this.isStreaming && !this.socket?.connected) {
        // Socket disconnected but we're still streaming - buffer or log
        console.warn('[RTMPStreamService] Socket disconnected, chunk not sent');
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[RTMPStreamService] MediaRecorder error:', event);
      this.updateStatus('error', 'MediaRecorder error');
    };

    // Start recording with small timeslice for low latency
    this.mediaRecorder.start(100); // 100ms chunks for low latency
    console.log('[RTMPStreamService] MediaRecorder started with', mimeType || 'default codec');
  }

  /**
   * Start canvas capture animation loop
   */
  private startCanvasCapture(): void {
    if (!this.captureCanvas || !this.captureCtx) return;

    const drawFrame = () => {
      if (!this.isStreaming || !this.captureCtx || !this.captureCanvas) {
        return;
      }

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
        // Priority 3: Fallback - draw placeholder
        else {
          // Draw a gradient background as placeholder
          const gradient = this.captureCtx.createLinearGradient(0, 0, this.config.width, this.config.height);
          gradient.addColorStop(0, '#1a1a2e');
          gradient.addColorStop(1, '#16213e');
          this.captureCtx.fillStyle = gradient;
          this.captureCtx.fillRect(0, 0, this.config.width, this.config.height);
          
          // Draw "OnnPlay" text
          this.captureCtx.fillStyle = '#ffffff';
          this.captureCtx.font = 'bold 48px Arial';
          this.captureCtx.textAlign = 'center';
          this.captureCtx.textBaseline = 'middle';
          this.captureCtx.fillText('OnnPlay Studio', this.config.width / 2, this.config.height / 2);
          
          // Draw "Aguardando conteúdo..." subtitle
          this.captureCtx.font = '24px Arial';
          this.captureCtx.fillStyle = '#888888';
          this.captureCtx.fillText('Aguardando conteúdo...', this.config.width / 2, this.config.height / 2 + 50);
        }
      } catch (error) {
        console.error('[RTMPStreamService] Error drawing frame:', error);
      }

      this.animationFrameId = requestAnimationFrame(drawFrame);
    };

    drawFrame();
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
   * Add fallback audio to stream when AudioMixerService fails
   */
  private async addFallbackAudio(streamToRecord: MediaStream): Promise<void> {
    console.log('[RTMPStreamService] Attempting to add fallback audio...');
    
    // Tentar 1: Capturar áudio diretamente do vídeo ativo
    const activeSource = mediaSourceService.getActiveSource();
    if (activeSource && activeSource.type === 'video') {
      const videoElement = activeSource.videoElement || activeSource.element as HTMLVideoElement;
      
      if (videoElement) {
        try {
          // Garantir que o vídeo não está mudo
          videoElement.muted = false;
          videoElement.volume = 1.0;
          
          // Tentar captureStream
          const videoWithCapture = videoElement as HTMLVideoElement & { 
            captureStream?: () => MediaStream;
            mozCaptureStream?: () => MediaStream;
          };
          
          let videoStream: MediaStream | null = null;
          if (videoWithCapture.captureStream) {
            videoStream = videoWithCapture.captureStream();
          } else if (videoWithCapture.mozCaptureStream) {
            videoStream = videoWithCapture.mozCaptureStream();
          }
          
          if (videoStream) {
            const audioTracks = videoStream.getAudioTracks();
            if (audioTracks.length > 0) {
              audioTracks.forEach(track => {
                track.enabled = true;
                streamToRecord.addTrack(track);
              });
              console.log('[RTMPStreamService] ✅ Fallback: Added', audioTracks.length, 'audio tracks from video captureStream');
              return;
            }
          }
          
          // Tentar videoElementStream
          if (activeSource.videoElementStream) {
            const audioTracks = activeSource.videoElementStream.getAudioTracks();
            if (audioTracks.length > 0) {
              audioTracks.forEach(track => {
                track.enabled = true;
                streamToRecord.addTrack(track);
              });
              console.log('[RTMPStreamService] ✅ Fallback: Added', audioTracks.length, 'audio tracks from videoElementStream');
              return;
            }
          }
        } catch (e) {
          console.error('[RTMPStreamService] Fallback video audio failed:', e);
        }
      }
    }
    
    // Tentar 2: Usar microfone como último recurso
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = audioStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        streamToRecord.addTrack(audioTrack);
        console.log('[RTMPStreamService] ✅ Fallback: Using local microphone audio track');
        return;
      }
    } catch (e) {
      console.log('[RTMPStreamService] Fallback microphone not available:', e);
    }
    
    console.log('[RTMPStreamService] ⚠️ No fallback audio available - stream will have no audio');
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
   * Setup audio sources for the AudioMixerService
   */
  private async setupAudioSources(audioMixer: AudioMixerService): Promise<void> {
    console.log('[RTMPStreamService] Setting up audio sources for mixer...');
    
    // 1. Add video audio source (if active source is a video)
    const activeSource = mediaSourceService.getActiveSource();
    console.log('[RTMPStreamService] Active source:', activeSource?.name, activeSource?.type);
    
    if (activeSource && activeSource.type === 'video') {
      // Try to get audio from video element
      const videoElement = activeSource.videoElement || activeSource.element as HTMLVideoElement;
      console.log('[RTMPStreamService] Video element found:', !!videoElement);
      
      if (videoElement) {
        try {
          // IMPORTANTE: Garantir que o vídeo está tocando e não está mudo
          videoElement.muted = false;
          videoElement.volume = 1.0;
          
          // Se o vídeo estiver pausado, iniciar reprodução
          if (videoElement.paused) {
            console.log('[RTMPStreamService] Video is paused, starting playback...');
            await videoElement.play();
          }
          
          console.log('[RTMPStreamService] Video state - muted:', videoElement.muted, 'paused:', videoElement.paused, 'volume:', videoElement.volume, 'readyState:', videoElement.readyState);
          
          // Aguardar um pouco para garantir que o vídeo está tocando
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Create a MediaStream from the video element using captureStream
          const videoElementWithCapture = videoElement as HTMLVideoElement & { 
            captureStream?: () => MediaStream;
            mozCaptureStream?: () => MediaStream;
          };
          
          let videoStream: MediaStream | null = null;
          
          if (videoElementWithCapture.captureStream) {
            videoStream = videoElementWithCapture.captureStream();
            console.log('[RTMPStreamService] Used captureStream()');
          } else if (videoElementWithCapture.mozCaptureStream) {
            videoStream = videoElementWithCapture.mozCaptureStream();
            console.log('[RTMPStreamService] Used mozCaptureStream()');
          }
          
          if (videoStream) {
            const audioTracks = videoStream.getAudioTracks();
            const videoTracks = videoStream.getVideoTracks();
            console.log('[RTMPStreamService] Video stream has', videoTracks.length, 'video tracks and', audioTracks.length, 'audio tracks');
            
            // Log detalhes das tracks de áudio
            audioTracks.forEach((track, i) => {
              console.log(`[RTMPStreamService] Audio track ${i}:`, track.label, 'enabled:', track.enabled, 'muted:', track.muted, 'readyState:', track.readyState);
            });
            
            if (audioTracks.length > 0) {
              // Garantir que as tracks estão habilitadas
              audioTracks.forEach(track => {
                track.enabled = true;
              });
              
              const audioOnlyStream = new MediaStream(audioTracks);
              
              audioMixer.addSource({
                id: `video-${activeSource.id}`,
                name: activeSource.name || 'Video Audio',
                type: 'video',
                volume: 100,
                isMuted: false,
                isActive: true,
                peakLevel: 0,
                mediaStream: audioOnlyStream,
              });
              
              console.log('[RTMPStreamService] ✅ Added video audio source to mixer with', audioTracks.length, 'tracks');
            } else {
              console.log('[RTMPStreamService] ⚠️ Video has no audio tracks from captureStream');
              
              // Tentar usar o videoElementStream pré-capturado
              if (activeSource.videoElementStream) {
                const preAudioTracks = activeSource.videoElementStream.getAudioTracks();
                console.log('[RTMPStreamService] Pre-captured stream has', preAudioTracks.length, 'audio tracks');
                
                if (preAudioTracks.length > 0) {
                  preAudioTracks.forEach(track => { track.enabled = true; });
                  const audioOnlyStream = new MediaStream(preAudioTracks);
                  
                  audioMixer.addSource({
                    id: `video-${activeSource.id}`,
                    name: activeSource.name || 'Video Audio',
                    type: 'video',
                    volume: 100,
                    isMuted: false,
                    isActive: true,
                    peakLevel: 0,
                    mediaStream: audioOnlyStream,
                  });
                  
                  console.log('[RTMPStreamService] ✅ Added video audio from pre-captured stream');
                } else {
                  // Último recurso: usar o elemento de vídeo diretamente
                  console.log('[RTMPStreamService] Trying audioElement approach as last resort');
                  audioMixer.addSource({
                    id: `video-${activeSource.id}`,
                    name: activeSource.name || 'Video Audio',
                    type: 'video',
                    volume: 100,
                    isMuted: false,
                    isActive: true,
                    peakLevel: 0,
                    audioElement: videoElement,
                  });
                  console.log('[RTMPStreamService] Added video element as audio source');
                }
              } else {
                // Usar o elemento de vídeo diretamente
                console.log('[RTMPStreamService] No pre-captured stream, using audioElement approach');
                audioMixer.addSource({
                  id: `video-${activeSource.id}`,
                  name: activeSource.name || 'Video Audio',
                  type: 'video',
                  volume: 100,
                  isMuted: false,
                  isActive: true,
                  peakLevel: 0,
                  audioElement: videoElement,
                });
                console.log('[RTMPStreamService] Added video element as audio source');
              }
            }
          } else {
            console.log('[RTMPStreamService] ⚠️ captureStream not available');
            
            // Usar o videoElementStream se disponível
            if (activeSource.videoElementStream) {
              const audioTracks = activeSource.videoElementStream.getAudioTracks();
              console.log('[RTMPStreamService] Using pre-captured stream with', audioTracks.length, 'audio tracks');
              
              if (audioTracks.length > 0) {
                audioTracks.forEach(track => { track.enabled = true; });
                const audioOnlyStream = new MediaStream(audioTracks);
                
                audioMixer.addSource({
                  id: `video-${activeSource.id}`,
                  name: activeSource.name || 'Video Audio',
                  type: 'video',
                  volume: 100,
                  isMuted: false,
                  isActive: true,
                  peakLevel: 0,
                  mediaStream: audioOnlyStream,
                });
                
                console.log('[RTMPStreamService] ✅ Added video audio from pre-captured stream');
              }
            }
          }
        } catch (error) {
          console.error('[RTMPStreamService] Error adding video audio source:', error);
        }
      }
    } else {
      console.log('[RTMPStreamService] No active video source to capture audio from');
    }
    
    // 2. Add microphone source (optional, can be enabled by user)
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioMixer.addSource({
        id: 'microphone',
        name: 'Microfone',
        type: 'mic',
        volume: 100,
        isMuted: true, // Iniciar mutado por padrão
        isActive: true,
        peakLevel: 0,
        mediaStream: micStream,
      });
      
      console.log('[RTMPStreamService] Added microphone source to mixer (muted by default)');
    } catch (error) {
      console.log('[RTMPStreamService] Microphone not available:', error);
    }
    
    // Log final das fontes de áudio
    const sources = audioMixer.getSources();
    console.log('[RTMPStreamService] Audio sources setup complete. Total sources:', sources.length);
    sources.forEach(s => {
      console.log(`[RTMPStreamService] - ${s.name} (${s.type}): volume=${s.volume}, muted=${s.isMuted}, active=${s.isActive}`);
    });
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
}

// Export singleton instance
export const rtmpStreamService = new RTMPStreamService();
export default rtmpStreamService;
