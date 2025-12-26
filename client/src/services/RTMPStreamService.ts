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
 */

import { io, Socket } from 'socket.io-client';

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
  status: 'idle' | 'connecting' | 'streaming' | 'error';
  error?: string;
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
  
  // Stats
  private chunksSent = 0;
  private bytesSent = 0;
  private startTime = 0;
  
  // Callbacks
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  
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
    const types = [
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('[RTMPStreamService] Using MIME type:', type);
        return type;
      }
    }
    
    console.warn('[RTMPStreamService] No preferred MIME type supported, using default');
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

    this.updateStatus('streaming');
    console.log('[RTMPStreamService] Stream started with MediaRecorder');
  }

  /**
   * Connect to the streaming server
   */
  private async connectToServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverUrl = window.location.origin;
      console.log('[RTMPStreamService] Connecting to server:', serverUrl);

      this.socket = io(serverUrl, {
        path: '/socket.io/stream',
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        console.log('[RTMPStreamService] Connected to server');
        clearTimeout(timeout);
      });

      this.socket.on('connected', () => {
        console.log('[RTMPStreamService] Server acknowledged connection');
        resolve();
      });

      this.socket.on('relay-started', (data: { message: string }) => {
        console.log('[RTMPStreamService] Server relay started:', data.message);
      });

      this.socket.on('status', (data: { target: string; status: string }) => {
        console.log('[RTMPStreamService] Status update:', data);
      });

      this.socket.on('error', (data: { message: string }) => {
        console.error('[RTMPStreamService] Server error:', data.message);
        this.updateStatus('error', data.message);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('[RTMPStreamService] Disconnected:', reason);
        if (this.isStreaming) {
          this.updateStatus('error', `Disconnected: ${reason}`);
        }
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('[RTMPStreamService] Connection error:', error);
        clearTimeout(timeout);
        reject(error);
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
    
    // Try to add audio if available
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getAudioTracks().forEach(track => {
        this.canvasStream!.addTrack(track);
      });
      console.log('[RTMPStreamService] Audio track added');
    } catch (e) {
      console.log('[RTMPStreamService] No audio available, continuing without audio');
    }

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
        // Try to capture video element first
        if (this.videoElement && !this.videoElement.paused && this.videoElement.readyState >= 2) {
          this.captureCtx.drawImage(
            this.videoElement, 
            0, 0, 
            this.config.width, 
            this.config.height
          );
        } else {
          // Fallback: draw placeholder
          this.captureCtx.fillStyle = '#1a1a2e';
          this.captureCtx.fillRect(0, 0, this.config.width, this.config.height);
          
          // Draw gradient background
          const gradient = this.captureCtx.createLinearGradient(0, 0, this.config.width, this.config.height);
          gradient.addColorStop(0, '#1a1a2e');
          gradient.addColorStop(1, '#16213e');
          this.captureCtx.fillStyle = gradient;
          this.captureCtx.fillRect(0, 0, this.config.width, this.config.height);
          
          // Draw LIVE indicator
          this.captureCtx.fillStyle = '#FF6B00';
          this.captureCtx.font = 'bold 72px Arial';
          this.captureCtx.textAlign = 'center';
          this.captureCtx.fillText('LIVE', this.config.width / 2, this.config.height / 2 - 20);
          
          // Draw studio name
          this.captureCtx.fillStyle = '#ffffff';
          this.captureCtx.font = '36px Arial';
          this.captureCtx.fillText('OnnPlay Studio', this.config.width / 2, this.config.height / 2 + 40);
          
          // Draw timestamp
          const now = new Date();
          const timeStr = now.toLocaleTimeString();
          this.captureCtx.font = '24px Arial';
          this.captureCtx.fillStyle = '#888888';
          this.captureCtx.fillText(timeStr, this.config.width / 2, this.config.height / 2 + 80);
        }
      } catch (e) {
        console.error('[RTMPStreamService] Error drawing frame:', e);
      }

      this.animationFrameId = requestAnimationFrame(drawFrame);
    };

    this.animationFrameId = requestAnimationFrame(drawFrame);
    console.log('[RTMPStreamService] Canvas capture started at', this.config.frameRate, 'fps');
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
        status: this.isStreaming ? 'streaming' : 'idle',
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
}

// Export singleton instance
export const rtmpStreamService = new RTMPStreamService();
export default rtmpStreamService;
