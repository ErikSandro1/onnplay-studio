/**
 * RTMPStreamService - DOM Capture Edition
 * 
 * Captures the PROGRAM monitor DOM element and streams to RTMP destinations.
 * Uses html2canvas or direct video element capture.
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
  private captureCanvas: HTMLCanvasElement | null = null;
  private captureCtx: CanvasRenderingContext2D | null = null;
  private frameInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private videoElement: HTMLVideoElement | null = null;
  
  // Stats
  private framesSent = 0;
  private bytesSent = 0;
  private startTime = 0;
  
  // Callbacks
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  
  // Config - Optimized for Railway
  private config = {
    width: 640,
    height: 360,
    frameRate: 8,
    jpegQuality: 0.5,
    videoBitrate: 800000,
    audioBitrate: 64000,
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
    this.captureCtx = this.captureCanvas.getContext('2d', { alpha: false });
    if (this.captureCtx) {
      this.captureCtx.imageSmoothingEnabled = false;
    }
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
    // Try to find video element in PROGRAM monitor
    // Look for video elements that are playing
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      if (!video.paused && video.readyState >= 2) {
        console.log('[RTMPStreamService] Found playing video element');
        return video;
      }
    }
    
    // If no playing video, try to find any video
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
    // Try multiple selectors to find the PROGRAM monitor
    const selectors = [
      '[data-program="true"]',
      '.program-monitor',
      '[class*="program"]',
      // Look for the orange-bordered monitor (PROGRAM has orange border)
      'div[style*="border"][style*="FF6B00"]',
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
        // Get the parent container
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
      // Try to find PROGRAM element as fallback
      const programElement = this.findProgramElement();
      if (!programElement) {
        throw new Error('No canvas element found for streaming');
      }
      console.log('[RTMPStreamService] Will capture PROGRAM DOM element');
    } else {
      console.log('[RTMPStreamService] Will capture video element');
    }

    // Connect to server
    await this.connectToServer();

    // Start the stream
    this.socket!.emit('start', {
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
    this.framesSent = 0;
    this.bytesSent = 0;
    this.startTime = Date.now();

    // Start capturing frames
    this.startFrameCapture();
    
    // Start stats tracking
    this.startStatsTracking();

    this.updateStatus('streaming');
    console.log('[RTMPStreamService] Stream started');
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
        transports: ['polling', 'websocket'],
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

      this.socket.on('started', (data: { message: string }) => {
        console.log('[RTMPStreamService] Server started streaming:', data.message);
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
   * Start capturing and sending frames
   */
  private startFrameCapture(): void {
    if (!this.captureCanvas || !this.captureCtx || !this.socket) return;

    const captureFrame = () => {
      if (!this.isStreaming || !this.socket?.connected || !this.captureCtx || !this.captureCanvas) {
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
          // Fallback: draw a colored rectangle with text (placeholder)
          this.captureCtx.fillStyle = '#1a1a2e';
          this.captureCtx.fillRect(0, 0, this.config.width, this.config.height);
          this.captureCtx.fillStyle = '#FF6B00';
          this.captureCtx.font = 'bold 48px Arial';
          this.captureCtx.textAlign = 'center';
          this.captureCtx.fillText('LIVE', this.config.width / 2, this.config.height / 2);
          this.captureCtx.font = '24px Arial';
          this.captureCtx.fillText('OnnPlay Studio', this.config.width / 2, this.config.height / 2 + 40);
        }

        // Convert to JPEG blob
        this.captureCanvas.toBlob(
          (blob) => {
            if (blob && this.socket?.connected) {
              blob.arrayBuffer().then(buffer => {
                this.socket!.emit('frame', {
                  frameNumber: this.framesSent + 1,
                  data: buffer,
                  timestamp: Date.now(),
                });
                this.framesSent++;
                this.bytesSent += buffer.byteLength;
              });
            }
          },
          'image/jpeg',
          this.config.jpegQuality
        );
      } catch (error) {
        console.error('[RTMPStreamService] Frame capture error:', error);
      }
    };

    // Capture frames at configured rate
    const intervalMs = 1000 / this.config.frameRate;
    this.frameInterval = setInterval(captureFrame, intervalMs);
    
    console.log(`[RTMPStreamService] Frame capture started at ${this.config.frameRate} fps (${intervalMs}ms interval)`);
  }

  /**
   * Start tracking stats
   */
  private startStatsTracking(): void {
    this.statsInterval = setInterval(() => {
      if (!this.isStreaming) return;

      const duration = (Date.now() - this.startTime) / 1000;
      const bitrate = duration > 0 ? Math.round((this.bytesSent * 8) / duration / 1000) : 0;
      const fps = duration > 0 ? this.framesSent / duration : 0;

      this.stats = {
        ...this.stats,
        isStreaming: true,
        framesSent: this.framesSent,
        bytesSent: this.bytesSent,
        bitrate,
        fps: Math.round(fps * 10) / 10,
        duration: Math.round(duration),
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
    
    this.isStreaming = false;

    // Stop frame capture
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    // Stop stats tracking
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Notify server
    if (this.socket) {
      this.socket.emit('stop');
      this.socket.disconnect();
      this.socket = null;
    }

    // Reset stats
    this.stats = {
      isStreaming: false,
      framesSent: this.framesSent,
      bytesSent: this.bytesSent,
      bitrate: 0,
      fps: 0,
      duration: 0,
      status: 'idle',
    };

    this.updateStatus('idle');
    this.notifyCallbacks();
    
    console.log('[RTMPStreamService] Stream stopped');
  }

  /**
   * Update status and notify callbacks
   */
  private updateStatus(status: 'idle' | 'connecting' | 'streaming' | 'error', error?: string): void {
    this.stats.status = status;
    if (error) {
      this.stats.error = error;
    }
    
    this.statusCallbacks.forEach(cb => cb(status, error));
    this.notifyCallbacks();
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(cb => cb({ ...this.stats }));
  }

  /**
   * Subscribe to stats updates (alias for backwards compatibility)
   */
  subscribe(callback: StreamCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe to stats updates
   */
  onStatsUpdate(callback: StreamCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe to status updates
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
  getIsStreaming(): boolean {
    return this.isStreaming;
  }
}

// Export singleton instance
export const rtmpStreamService = new RTMPStreamService();
export default rtmpStreamService;
