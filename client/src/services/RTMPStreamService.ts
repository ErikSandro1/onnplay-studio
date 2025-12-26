/**
 * RTMPStreamService - Ultra-Optimized Client
 * 
 * Captures canvas and sends JPEG frames to server for RTMP streaming.
 * Optimized for low bandwidth and server CPU usage.
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
  private canvas: HTMLCanvasElement | null = null;
  private frameInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  
  // Stats
  private framesSent = 0;
  private bytesSent = 0;
  private startTime = 0;
  
  // Callbacks
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  
  // Config - ULTRA LOW for Railway
  private config = {
    width: 640,
    height: 360,
    frameRate: 8,        // Very low FPS for Railway
    jpegQuality: 0.4,    // Low quality for smaller files
    videoBitrate: 600000,
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

  /**
   * Set the canvas element to capture
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
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
  }

  /**
   * Get current config
   */
  getConfig(): typeof this.config {
    return { ...this.config };
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

    // Find the program canvas
    if (!this.canvas) {
      this.canvas = document.querySelector('canvas[data-program="true"]') as HTMLCanvasElement;
      if (!this.canvas) {
        // Try to find any canvas in the program monitor
        const programMonitor = document.querySelector('[class*="program"]');
        if (programMonitor) {
          this.canvas = programMonitor.querySelector('canvas') as HTMLCanvasElement;
        }
      }
      if (!this.canvas) {
        // Last resort: find any visible canvas
        this.canvas = document.querySelector('canvas') as HTMLCanvasElement;
      }
    }

    if (!this.canvas) {
      throw new Error('No canvas element found for streaming');
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
    if (!this.canvas || !this.socket) return;

    // Create a smaller canvas for encoding
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = this.config.width;
    captureCanvas.height = this.config.height;
    const ctx = captureCanvas.getContext('2d', { alpha: false });

    if (!ctx) {
      console.error('[RTMPStreamService] Failed to get canvas context');
      return;
    }

    // Disable image smoothing for speed
    ctx.imageSmoothingEnabled = false;

    const captureFrame = () => {
      if (!this.isStreaming || !this.canvas || !this.socket?.connected) {
        return;
      }

      try {
        // Draw the source canvas to our smaller capture canvas
        ctx.drawImage(this.canvas, 0, 0, this.config.width, this.config.height);

        // Convert to JPEG blob
        captureCanvas.toBlob(
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
