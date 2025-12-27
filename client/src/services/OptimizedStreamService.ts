/**
 * OptimizedStreamService - High Performance Streaming
 * 
 * Uses VideoCompositor for efficient frame capture and
 * sends frames to the backend via Socket.IO for RTMP streaming.
 * 
 * Key improvements over html2canvas approach:
 * - Native canvas drawing (60fps capable)
 * - Direct video element rendering
 * - No DOM parsing overhead
 */

import { io, Socket } from 'socket.io-client';
import { videoCompositor, VideoSource } from './VideoCompositor';

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
  speed?: number;
}

type StreamCallback = (stats: StreamStats) => void;
type StatusCallback = (status: string, error?: string) => void;

class OptimizedStreamService {
  private socket: Socket | null = null;
  private isStreaming = false;
  private destinations: StreamDestination[] = [];
  private captureInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  
  // Stats
  private framesSent = 0;
  private bytesSent = 0;
  private startTime = 0;
  private lastSpeed = 0;
  
  // Callbacks
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  
  // Config
  private config = {
    width: 854,       // 480p for efficiency
    height: 480,
    frameRate: 24,    // Good balance
    jpegQuality: 0.7,
    serverUrl: '',
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
    // Determine server URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.config.serverUrl = `${window.location.protocol}//${host}`;
    
    // Configure compositor
    videoCompositor.updateConfig({
      width: this.config.width,
      height: this.config.height,
      frameRate: this.config.frameRate,
    });
  }

  /**
   * Subscribe to stats updates
   */
  subscribe(callback: StreamCallback): () => void {
    this.callbacks.add(callback);
    callback(this.stats);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  private notifySubscribers(): void {
    this.stats = {
      ...this.stats,
      isStreaming: this.isStreaming,
      framesSent: this.framesSent,
      bytesSent: this.bytesSent,
      duration: this.isStreaming ? (Date.now() - this.startTime) / 1000 : 0,
      speed: this.lastSpeed,
    };
    this.callbacks.forEach(cb => cb(this.stats));
  }

  private updateStatus(status: StreamStats['status'], error?: string): void {
    this.stats.status = status;
    this.stats.error = error;
    this.notifySubscribers();
    this.statusCallbacks.forEach(cb => cb(status, error));
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
   * Remove a destination
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
    videoCompositor.updateConfig({
      width: this.config.width,
      height: this.config.height,
      frameRate: this.config.frameRate,
    });
  }

  /**
   * Get current config
   */
  getConfig(): typeof this.config {
    return { ...this.config };
  }

  // ==================== Video Source Management ====================

  /**
   * Add camera source
   */
  async addCameraSource(deviceId?: string): Promise<VideoSource> {
    return videoCompositor.addCameraSource(deviceId);
  }

  /**
   * Add screen share source
   */
  async addScreenSource(): Promise<VideoSource> {
    return videoCompositor.addScreenSource();
  }

  /**
   * Add media file source
   */
  async addMediaSource(file: File): Promise<VideoSource> {
    return videoCompositor.addMediaSource(file);
  }

  /**
   * Remove a source
   */
  removeSource(sourceId: string): void {
    videoCompositor.removeSource(sourceId);
  }

  /**
   * Get all sources
   */
  getSources(): VideoSource[] {
    return videoCompositor.getSources();
  }

  /**
   * Update source properties
   */
  updateSource(sourceId: string, updates: Partial<VideoSource>): void {
    videoCompositor.updateSource(sourceId, updates);
  }

  // ==================== Streaming Control ====================

  /**
   * Start streaming to all enabled destinations
   */
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      console.warn('[OptimizedStreamService] Already streaming');
      return;
    }

    const enabledDestinations = this.destinations.filter(d => d.enabled !== false);
    if (enabledDestinations.length === 0) {
      throw new Error('No streaming destinations configured');
    }

    console.log('[OptimizedStreamService] Starting stream to', enabledDestinations.length, 'destinations');
    this.updateStatus('connecting');

    try {
      // Connect to Socket.IO server
      this.socket = io(this.config.serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          console.log('[OptimizedStreamService] Connected to server');
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Set up event handlers
      this.setupSocketHandlers();

      // Send start command with destinations
      this.socket.emit('start', {
        destinations: enabledDestinations,
        config: {
          width: this.config.width,
          height: this.config.height,
          frameRate: this.config.frameRate,
        },
      });

      // Wait for server confirmation
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server did not confirm stream start'));
        }, 10000);

        this.socket!.once('started', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket!.once('relay-started', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket!.once('error', (error: { message: string }) => {
          clearTimeout(timeout);
          reject(new Error(error.message));
        });
      });

      // Start compositor and frame capture
      this.isStreaming = true;
      this.framesSent = 0;
      this.bytesSent = 0;
      this.startTime = Date.now();

      videoCompositor.start();
      this.startFrameCapture();
      this.startStatsTracking();

      this.updateStatus('streaming');
      console.log('[OptimizedStreamService] Stream started successfully');

    } catch (error) {
      console.error('[OptimizedStreamService] Failed to start stream:', error);
      this.updateStatus('error', error instanceof Error ? error.message : 'Failed to start stream');
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) return;

    console.log('[OptimizedStreamService] Stopping stream...');
    this.isStreaming = false;

    // Stop frame capture
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    // Stop stats tracking
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Stop compositor
    videoCompositor.stop();

    // Notify server
    if (this.socket) {
      this.socket.emit('stop');
      this.socket.disconnect();
      this.socket = null;
    }

    this.updateStatus('idle');
    console.log('[OptimizedStreamService] Stream stopped');
  }

  /**
   * Check if currently streaming
   */
  isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Get current stats
   */
  getStats(): StreamStats {
    return { ...this.stats };
  }

  // ==================== Private Methods ====================

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('status', (data: { speed?: number; fps?: number; bitrate?: number }) => {
      if (data.speed !== undefined) {
        this.lastSpeed = data.speed;
        this.stats.speed = data.speed;
      }
      if (data.fps !== undefined) {
        this.stats.fps = data.fps;
      }
      if (data.bitrate !== undefined) {
        this.stats.bitrate = data.bitrate;
      }
      this.notifySubscribers();
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('[OptimizedStreamService] Server error:', error.message);
      this.updateStatus('error', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[OptimizedStreamService] Disconnected:', reason);
      if (this.isStreaming) {
        this.updateStatus('error', 'Connection lost');
        this.cleanup();
      }
    });
  }

  private startFrameCapture(): void {
    const canvas = videoCompositor.getOutputCanvas();
    const interval = 1000 / this.config.frameRate;

    this.captureInterval = setInterval(() => {
      if (!this.isStreaming || !this.socket?.connected) return;

      canvas.toBlob(
        (blob) => {
          if (blob && this.socket?.connected) {
            blob.arrayBuffer().then((buffer) => {
              this.socket!.emit('frame', buffer);
              this.framesSent++;
              this.bytesSent += blob.size;
            });
          }
        },
        'image/jpeg',
        this.config.jpegQuality
      );
    }, interval);

    console.log('[OptimizedStreamService] Frame capture started at', this.config.frameRate, 'fps');
  }

  private startStatsTracking(): void {
    this.statsInterval = setInterval(() => {
      if (!this.isStreaming) return;

      const elapsed = (Date.now() - this.startTime) / 1000;
      if (elapsed > 0) {
        this.stats.bitrate = (this.bytesSent * 8 / elapsed / 1000);
        this.stats.fps = this.framesSent / elapsed;
      }

      this.notifySubscribers();

      // Log stats every 10 seconds
      if (Math.floor(elapsed) % 10 === 0 && Math.floor(elapsed) > 0) {
        console.log(`[OptimizedStreamService] Stats: ${this.framesSent} frames, ${this.stats.fps.toFixed(1)} fps, ${this.stats.bitrate.toFixed(0)} kbps, speed: ${this.lastSpeed.toFixed(2)}x`);
      }
    }, 1000);
  }

  private cleanup(): void {
    this.isStreaming = false;
    
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.stopStreaming();
    videoCompositor.destroy();
    this.callbacks.clear();
    this.statusCallbacks.clear();
  }
}

// Singleton instance
export const optimizedStreamService = new OptimizedStreamService();
