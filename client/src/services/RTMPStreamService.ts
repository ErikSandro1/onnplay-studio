/**
 * RTMPStreamService
 * 
 * Manages real RTMP streaming to YouTube, Facebook, Twitch, and custom RTMP servers.
 * Captures canvas from PROGRAM monitor and streams via Socket.IO to backend.
 * Backend uses FFmpeg to push to RTMP destinations.
 * 
 * Uses Socket.IO for better proxy compatibility (Railway, etc.)
 */

import { io, Socket } from 'socket.io-client';

export type StreamPlatform = 'youtube' | 'facebook' | 'twitch' | 'custom';

export interface StreamDestination {
  id: string;
  platform: StreamPlatform;
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: boolean;
}

export interface StreamStats {
  bitrate: number;
  fps: number;
  droppedFrames: number;
  duration: number;
  status: 'idle' | 'connecting' | 'streaming' | 'error';
  error?: string;
}

type StreamCallback = (stats: StreamStats) => void;
type StatusCallback = (status: 'idle' | 'connecting' | 'streaming' | 'error', error?: string) => void;

class RTMPStreamService {
  private programCanvas: HTMLCanvasElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private socket: Socket | null = null;
  private isStreaming: boolean = false;
  private destinations: StreamDestination[] = [];
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private startTime: number = 0;
  private frameCount: number = 0;
  private bytesSent: number = 0;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private statsInterval: number | null = null;
  
  // Stats
  private stats: StreamStats = {
    bitrate: 0,
    fps: 0,
    droppedFrames: 0,
    duration: 0,
    status: 'idle',
  };

  // Stream configuration
  private config = {
    width: 1920,
    height: 1080,
    frameRate: 30,
    videoBitrate: 4500000, // 4.5 Mbps
    audioBitrate: 128000,  // 128 Kbps
  };

  constructor() {
    // Load saved destinations from localStorage
    this.loadDestinations();
  }

  /**
   * Set the PROGRAM monitor canvas for capturing
   */
  setProgramCanvas(canvas: HTMLCanvasElement): void {
    this.programCanvas = canvas;
    console.log('[RTMPStreamService] Program canvas set:', canvas.width, 'x', canvas.height);
  }

  /**
   * Add audio source to the stream
   */
  addAudioSource(audioTrack: MediaStreamTrack): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.audioDestination = this.audioContext.createMediaStreamDestination();
    }

    const source = this.audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
    source.connect(this.audioDestination!);
    console.log('[RTMPStreamService] Audio source added');
  }

  /**
   * Load destinations from localStorage
   */
  private loadDestinations(): void {
    try {
      const saved = localStorage.getItem('onnplay_stream_destinations');
      if (saved) {
        this.destinations = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[RTMPStreamService] Failed to load destinations:', e);
    }
  }

  /**
   * Save destinations to localStorage
   */
  private saveDestinations(): void {
    try {
      localStorage.setItem('onnplay_stream_destinations', JSON.stringify(this.destinations));
    } catch (e) {
      console.warn('[RTMPStreamService] Failed to save destinations:', e);
    }
  }

  /**
   * Add streaming destination
   */
  addDestination(destination: StreamDestination): void {
    this.destinations.push(destination);
    this.saveDestinations();
    this.notifyCallbacks();
  }

  /**
   * Remove streaming destination
   */
  removeDestination(id: string): void {
    this.destinations = this.destinations.filter(d => d.id !== id);
    this.saveDestinations();
    this.notifyCallbacks();
  }

  /**
   * Update streaming destination
   */
  updateDestination(id: string, updates: Partial<StreamDestination>): void {
    const index = this.destinations.findIndex(d => d.id === id);
    if (index !== -1) {
      this.destinations[index] = { ...this.destinations[index], ...updates };
      this.saveDestinations();
      this.notifyCallbacks();
    }
  }

  /**
   * Get all destinations
   */
  getDestinations(): StreamDestination[] {
    return [...this.destinations];
  }

  /**
   * Get enabled destinations
   */
  getEnabledDestinations(): StreamDestination[] {
    return this.destinations.filter(d => d.enabled);
  }

  /**
   * Start streaming to all enabled destinations
   */
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      throw new Error('Already streaming');
    }

    const enabledDestinations = this.getEnabledDestinations();
    if (enabledDestinations.length === 0) {
      throw new Error('No destinations enabled');
    }

    this.updateStatus('connecting');

    try {
      // 1. Get or create PROGRAM canvas
      await this.setupCanvas();

      // 2. Create media stream from canvas
      await this.createMediaStream();

      // 3. Connect to backend via Socket.IO
      await this.connectSocket(enabledDestinations);

      // 4. Start MediaRecorder
      this.startRecording();

      this.isStreaming = true;
      this.startTime = Date.now();
      this.frameCount = 0;
      this.bytesSent = 0;
      this.startStatsUpdate();

      this.updateStatus('streaming');
      console.log('✅ [RTMPStreamService] Streaming started to', enabledDestinations.length, 'destinations');
    } catch (error) {
      console.error('[RTMPStreamService] Failed to start streaming:', error);
      this.updateStatus('error', error instanceof Error ? error.message : 'Failed to start streaming');
      throw error;
    }
  }

  /**
   * Setup canvas for capturing
   */
  private async setupCanvas(): Promise<void> {
    // Try to find PROGRAM monitor canvas
    if (!this.programCanvas) {
      const programMonitor = document.querySelector('[data-monitor="program"] canvas') as HTMLCanvasElement;
      if (programMonitor) {
        this.programCanvas = programMonitor;
      } else {
        // Create a fallback canvas
        const programElement = document.querySelector('[data-monitor="program"]') as HTMLElement;
        if (programElement) {
          // Create canvas from element
          this.programCanvas = document.createElement('canvas');
          this.programCanvas.width = this.config.width;
          this.programCanvas.height = this.config.height;
          
          // Draw placeholder
          const ctx = this.programCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, this.config.width, this.config.height);
            ctx.fillStyle = '#d4a853';
            ctx.font = 'bold 72px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('OnnPlay Studio', this.config.width / 2, this.config.height / 2);
            ctx.font = '36px Arial';
            ctx.fillText('LIVE', this.config.width / 2, this.config.height / 2 + 60);
          }
        }
      }
    }

    if (!this.programCanvas) {
      throw new Error('Could not find or create PROGRAM canvas');
    }

    console.log('[RTMPStreamService] Canvas ready:', this.programCanvas.width, 'x', this.programCanvas.height);
  }

  /**
   * Create media stream from canvas and audio
   */
  private async createMediaStream(): Promise<void> {
    if (!this.programCanvas) {
      throw new Error('Canvas not ready');
    }

    // Capture video stream from canvas
    const videoStream = this.programCanvas.captureStream(this.config.frameRate);
    const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

    // Add audio tracks if available
    if (this.audioDestination) {
      tracks.push(...this.audioDestination.stream.getAudioTracks());
    } else {
      // Create silent audio track
      const silentAudio = this.createSilentAudio();
      if (silentAudio) {
        tracks.push(silentAudio);
      }
    }

    this.mediaStream = new MediaStream(tracks);
    console.log('[RTMPStreamService] Media stream created with', tracks.length, 'tracks');
  }

  /**
   * Create silent audio track
   */
  private createSilentAudio(): MediaStreamTrack | null {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const destination = ctx.createMediaStreamDestination();
      
      gain.gain.value = 0; // Silent
      oscillator.connect(gain);
      gain.connect(destination);
      oscillator.start();
      
      return destination.stream.getAudioTracks()[0];
    } catch (e) {
      console.warn('[RTMPStreamService] Could not create silent audio:', e);
      return null;
    }
  }

  /**
   * Connect to backend via Socket.IO
   */
  private async connectSocket(destinations: StreamDestination[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // Determinar URL base
      const baseUrl = window.location.origin;
      
      console.log('[RTMPStreamService] Connecting to Socket.IO at:', baseUrl);
      
      this.socket = io(baseUrl, {
        path: '/socket.io/stream',
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      const timeout = setTimeout(() => {
        this.socket?.disconnect();
        reject(new Error('Socket.IO connection timeout'));
      }, 20000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('[RTMPStreamService] ✅ Socket.IO connected!');
        
        // Send start command with configuration
        this.socket!.emit('start', {
          config: this.config,
          targets: destinations.map(d => ({
            id: d.id,
            platform: d.platform,
            rtmpUrl: d.rtmpUrl,
            streamKey: d.streamKey,
          })),
        });

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('[RTMPStreamService] Socket.IO connect error:', error);
        reject(new Error(`Connection failed: ${error.message}`));
      });

      this.socket.on('connected', (data) => {
        console.log('[RTMPStreamService] Server confirmed connection:', data);
      });

      this.socket.on('status', (data) => {
        console.log('[RTMPStreamService] Stream status:', data);
      });

      this.socket.on('error', (data) => {
        console.error('[RTMPStreamService] Stream error:', data);
        this.updateStatus('error', data.error);
      });

      this.socket.on('stopped', () => {
        console.log('[RTMPStreamService] Stream stopped by server');
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[RTMPStreamService] Socket.IO disconnected:', reason);
        if (this.isStreaming) {
          this.updateStatus('error', 'Connection lost');
        }
      });
    });
  }

  /**
   * Start MediaRecorder to capture and send chunks
   */
  private startRecording(): void {
    if (!this.mediaStream) {
      throw new Error('Media stream not ready');
    }

    // Determine best codec
    const mimeType = this.getSupportedMimeType();
    console.log('[RTMPStreamService] Using MIME type:', mimeType);

    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType,
      videoBitsPerSecond: this.config.videoBitrate,
      audioBitsPerSecond: this.config.audioBitrate,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket?.connected) {
        // Convert Blob to ArrayBuffer and send
        event.data.arrayBuffer().then(buffer => {
          this.socket!.emit('chunk', buffer);
          this.bytesSent += buffer.byteLength;
          this.frameCount++;
        });
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[RTMPStreamService] MediaRecorder error:', event);
      this.updateStatus('error', 'Recording error');
    };

    // Start recording with 100ms chunks for low latency
    this.mediaRecorder.start(100);
    console.log('[RTMPStreamService] MediaRecorder started');
  }

  /**
   * Get supported MIME type for MediaRecorder
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  /**
   * Start stats update interval
   */
  private startStatsUpdate(): void {
    this.statsInterval = window.setInterval(() => {
      if (!this.isStreaming) return;

      const now = Date.now();
      const duration = Math.floor((now - this.startTime) / 1000);
      const elapsed = (now - this.startTime) / 1000;
      
      this.stats = {
        bitrate: elapsed > 0 ? Math.round((this.bytesSent * 8) / elapsed / 1000) : 0, // Kbps
        fps: elapsed > 0 ? Math.round(this.frameCount / elapsed) : 0,
        droppedFrames: 0,
        duration,
        status: 'streaming',
      };

      this.notifyCallbacks();
    }, 1000);
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    console.log('[RTMPStreamService] Stopping stream...');

    // Stop stats update
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Send stop command and disconnect socket
    if (this.socket) {
      this.socket.emit('stop');
      this.socket.disconnect();
      this.socket = null;
    }

    this.isStreaming = false;
    this.updateStatus('idle');
    
    console.log('[RTMPStreamService] Stream stopped');
  }

  /**
   * Update status and notify callbacks
   */
  private updateStatus(status: StreamStats['status'], error?: string): void {
    this.stats.status = status;
    this.stats.error = error;
    
    this.statusCallbacks.forEach(cb => cb(status, error));
    this.notifyCallbacks();
  }

  /**
   * Notify all stats callbacks
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(cb => cb({ ...this.stats }));
  }

  /**
   * Subscribe to stats updates
   */
  onStats(callback: StreamCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
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
  isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Set stream configuration
   */
  setConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): typeof this.config {
    return { ...this.config };
  }
}

// Export singleton instance
export const rtmpStreamService = new RTMPStreamService();
