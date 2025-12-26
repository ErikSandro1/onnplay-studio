/**
 * RTMPStreamService
 * 
 * Manages real RTMP streaming to YouTube, Facebook, Twitch, and custom RTMP servers.
 * Captures JPEG frames from PROGRAM monitor canvas and streams via Socket.IO to backend.
 * Backend uses FFmpeg to convert JPEG frames to H.264 and push to RTMP destinations.
 * 
 * Uses Socket.IO for better proxy compatibility (Railway, etc.)
 * 
 * IMPORTANT: Uses JPEG frame capture instead of WebM for better FFmpeg compatibility.
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
  private programVideo: HTMLVideoElement | null = null;
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
  
  // Frame capture
  private frameInterval: number | null = null;
  private frameNumber: number = 0;
  
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
    jpegQuality: 0.85,     // JPEG quality (0-1)
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

      // 2. Connect to backend via Socket.IO
      await this.connectSocket(enabledDestinations);

      // 3. Start frame capture loop
      this.startFrameCapture();

      this.isStreaming = true;
      this.startTime = Date.now();
      this.frameCount = 0;
      this.bytesSent = 0;
      this.frameNumber = 0;
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
   * Finds the video element in PROGRAM monitor and creates a canvas that mirrors it
   */
  private async setupCanvas(): Promise<void> {
    // Try to find PROGRAM monitor video element
    const programMonitor = document.querySelector('[data-monitor="program"]') as HTMLElement;
    
    if (!programMonitor) {
      throw new Error('Could not find PROGRAM monitor element');
    }

    // Look for video element inside PROGRAM monitor
    const videoElement = programMonitor.querySelector('video') as HTMLVideoElement;
    
    // Create a canvas for capturing
    this.programCanvas = document.createElement('canvas');
    this.programCanvas.width = this.config.width;
    this.programCanvas.height = this.config.height;
    
    if (videoElement && videoElement.srcObject) {
      // Found a video element with a stream - use it directly
      console.log('[RTMPStreamService] Found video element in PROGRAM monitor');
      this.programVideo = videoElement;
      console.log('[RTMPStreamService] Canvas created from video:', this.config.width, 'x', this.config.height);
    } else {
      // No video element - will draw placeholder
      console.log('[RTMPStreamService] No video element found, will use placeholder');
      this.programVideo = null;
    }

    if (!this.programCanvas) {
      throw new Error('Could not create PROGRAM canvas');
    }
  }

  /**
   * Draw current frame to canvas
   */
  private drawFrameToCanvas(): void {
    if (!this.programCanvas) return;
    
    const ctx = this.programCanvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.programCanvas.width, this.programCanvas.height);
    
    if (this.programVideo && this.programVideo.readyState >= 2) {
      // Draw video frame
      const videoAspect = this.programVideo.videoWidth / this.programVideo.videoHeight;
      const canvasAspect = this.programCanvas.width / this.programCanvas.height;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (videoAspect > canvasAspect) {
        drawWidth = this.programCanvas.width;
        drawHeight = this.programCanvas.width / videoAspect;
        drawX = 0;
        drawY = (this.programCanvas.height - drawHeight) / 2;
      } else {
        drawHeight = this.programCanvas.height;
        drawWidth = this.programCanvas.height * videoAspect;
        drawX = (this.programCanvas.width - drawWidth) / 2;
        drawY = 0;
      }
      
      ctx.drawImage(this.programVideo, drawX, drawY, drawWidth, drawHeight);
    } else {
      // Draw placeholder
      const gradient = ctx.createLinearGradient(0, 0, this.programCanvas.width, this.programCanvas.height);
      gradient.addColorStop(0, '#1e3a5f');
      gradient.addColorStop(1, '#0d1b2a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.programCanvas.width, this.programCanvas.height);
      
      // Draw OnnPlay logo
      ctx.fillStyle = '#FF6B00';
      ctx.font = 'bold 120px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OnnPlay', this.programCanvas.width / 2, this.programCanvas.height / 2 - 50);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px Arial';
      ctx.fillText('STUDIO', this.programCanvas.width / 2, this.programCanvas.height / 2 + 50);
      
      ctx.font = '30px Arial';
      ctx.fillStyle = '#7A8BA3';
      ctx.fillText('Conecte uma câmera para transmitir', this.programCanvas.width / 2, this.programCanvas.height / 2 + 150);
    }
    
    // Draw LIVE indicator
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(80, 60, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('LIVE', 105, 60);
    
    // Draw timestamp
    const now = new Date();
    const timestamp = now.toLocaleTimeString('pt-BR');
    ctx.font = '24px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(timestamp, this.programCanvas.width - 30, 60);
  }

  /**
   * Start frame capture loop
   */
  private startFrameCapture(): void {
    const frameIntervalMs = 1000 / this.config.frameRate; // ~33ms for 30fps
    
    console.log(`[RTMPStreamService] Starting frame capture at ${this.config.frameRate}fps (${frameIntervalMs.toFixed(1)}ms interval)`);
    
    this.frameInterval = window.setInterval(() => {
      this.captureAndSendFrame();
    }, frameIntervalMs);
  }

  /**
   * Capture a single frame and send to backend
   */
  private captureAndSendFrame(): void {
    if (!this.isStreaming || !this.programCanvas || !this.socket) return;
    
    try {
      // Draw current frame to canvas
      this.drawFrameToCanvas();
      
      // Convert canvas to JPEG blob
      this.programCanvas.toBlob((blob) => {
        if (!blob || !this.socket || !this.isStreaming) return;
        
        // Convert blob to ArrayBuffer and send
        blob.arrayBuffer().then((buffer) => {
          if (!this.socket || !this.isStreaming) return;
          
          this.socket.emit('frame', {
            frameNumber: this.frameNumber,
            data: buffer,
            timestamp: Date.now(),
          });
          
          this.frameNumber++;
          this.frameCount++;
          this.bytesSent += buffer.byteLength;
          
          // Log every 30 frames (1 second at 30fps)
          if (this.frameNumber % 30 === 0) {
            console.log(`[RTMPStreamService] Sent frame ${this.frameNumber}, size: ${(buffer.byteLength / 1024).toFixed(1)}KB`);
          }
        });
      }, 'image/jpeg', this.config.jpegQuality);
    } catch (error) {
      console.error('[RTMPStreamService] Error capturing frame:', error);
    }
  }

  /**
   * Connect to backend via Socket.IO
   */
  private connectSocket(destinations: StreamDestination[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // Determine the Socket.IO URL based on environment
      const isProduction = window.location.hostname !== 'localhost';
      const socketUrl = isProduction ? window.location.origin : 'http://localhost:3000';
      
      console.log('[RTMPStreamService] Connecting to Socket.IO at:', socketUrl);
      
      this.socket = io(socketUrl, {
        path: '/socket.io/stream',
        transports: ['polling', 'websocket'], // Start with polling for better proxy compatibility
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      const connectionTimeout = setTimeout(() => {
        if (this.socket) {
          this.socket.disconnect();
        }
        reject(new Error('Connection timeout'));
      }, 15000);

      this.socket.on('connect', () => {
        console.log('[RTMPStreamService] ✅ Socket.IO connected!');
        clearTimeout(connectionTimeout);
        
        // Send start command with destinations and config
        this.socket!.emit('start', {
          destinations: destinations.map(d => ({
            id: d.id,
            platform: d.platform,
            name: d.name,
            rtmpUrl: d.rtmpUrl,
            streamKey: d.streamKey,
          })),
          config: {
            width: this.config.width,
            height: this.config.height,
            frameRate: this.config.frameRate,
            videoBitrate: this.config.videoBitrate,
            audioBitrate: this.config.audioBitrate,
          },
        });
      });

      this.socket.on('started', (data: { message: string }) => {
        console.log('[RTMPStreamService] Server confirmed start:', data);
        resolve();
      });

      this.socket.on('connected', (data: { message: string }) => {
        console.log('[RTMPStreamService] Server confirmed connection:', data);
      });

      this.socket.on('status', (data: { target: string; status: string }) => {
        console.log(`[RTMPStreamService] Stream status: ${data.target} ${data.status}`);
      });

      this.socket.on('error', (error: { message: string }) => {
        console.error('[RTMPStreamService] Socket error:', error);
        this.updateStatus('error', error.message);
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('[RTMPStreamService] Connection error:', error);
        clearTimeout(connectionTimeout);
        reject(new Error(`Connection failed: ${error.message}`));
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('[RTMPStreamService] Disconnected:', reason);
        if (this.isStreaming) {
          this.updateStatus('error', `Disconnected: ${reason}`);
        }
      });
    });
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) return;

    console.log('[RTMPStreamService] Stopping streaming...');
    this.isStreaming = false;

    // Stop frame capture
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    // Stop stats update
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Send stop command and disconnect socket
    if (this.socket) {
      this.socket.emit('stop');
      this.socket.disconnect();
      this.socket = null;
    }

    // Clean up
    this.programCanvas = null;
    this.programVideo = null;
    this.frameNumber = 0;

    this.updateStatus('idle');
    console.log('[RTMPStreamService] Streaming stopped');
  }

  /**
   * Start stats update interval
   */
  private startStatsUpdate(): void {
    this.statsInterval = window.setInterval(() => {
      const duration = (Date.now() - this.startTime) / 1000;
      const bitrate = duration > 0 ? (this.bytesSent * 8) / duration : 0;
      const fps = duration > 0 ? this.frameCount / duration : 0;

      this.stats = {
        ...this.stats,
        bitrate: Math.round(bitrate),
        fps: Math.round(fps * 10) / 10,
        duration: Math.round(duration),
      };

      this.notifyCallbacks();
    }, 1000);
  }

  /**
   * Update status and notify callbacks
   */
  private updateStatus(status: StreamStats['status'], error?: string): void {
    this.stats = { ...this.stats, status, error };
    this.notifyCallbacks();
    this.statusCallbacks.forEach(cb => cb(status, error));
  }

  /**
   * Notify all callbacks with current stats
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(cb => cb(this.stats));
  }

  /**
   * Subscribe to stats updates
   */
  onStats(callback: StreamCallback): () => void {
    this.callbacks.add(callback);
    callback(this.stats);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe to stats updates (alias for onStats)
   */
  subscribe(callback: StreamCallback): () => void {
    return this.onStats(callback);
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
  getIsStreaming(): boolean {
    return this.isStreaming;
  }
}

// Export singleton instance
export const rtmpStreamService = new RTMPStreamService();
export default rtmpStreamService;
