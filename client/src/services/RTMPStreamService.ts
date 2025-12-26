/**
 * RTMPStreamService - Professional Edition
 * 
 * Uses MediaRecorder for browser-side encoding (H.264/WebM)
 * Server only relays the pre-encoded stream to RTMP destinations
 * 
 * This architecture:
 * - Encoding happens in the user's browser (uses their CPU/GPU)
 * - Server just relays data (minimal CPU usage)
 * - Scales to thousands of users
 * - Same approach used by StreamYard, Restream, etc.
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
  private socket: Socket | null = null;
  private isStreaming: boolean = false;
  private destinations: StreamDestination[] = [];
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private startTime: number = 0;
  private bytesSent: number = 0;
  private statsInterval: number | null = null;
  
  // MediaRecorder for browser-side encoding
  private mediaRecorder: MediaRecorder | null = null;
  private canvasStream: MediaStream | null = null;
  
  // Stats
  private stats: StreamStats = {
    bitrate: 0,
    fps: 0,
    droppedFrames: 0,
    duration: 0,
    status: 'idle',
  };

  // Stream configuration - High quality since browser does encoding
  private config = {
    width: 1280,           // 720p
    height: 720,
    frameRate: 30,         // 30fps
    videoBitrate: 2500000, // 2.5 Mbps
    audioBitrate: 128000,  // 128 Kbps
  };

  constructor() {
    this.loadDestinations();
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
   * Start streaming using MediaRecorder (browser-side encoding)
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
      // 1. Get canvas stream from PROGRAM monitor
      const canvas = await this.getCanvasStream();
      
      // 2. Connect to backend via Socket.IO
      await this.connectSocket(enabledDestinations);

      // 3. Start MediaRecorder with browser encoding
      await this.startMediaRecorder(canvas);

      this.isStreaming = true;
      this.startTime = Date.now();
      this.bytesSent = 0;
      this.startStatsUpdate();

      this.updateStatus('streaming');
      console.log('✅ [RTMPStreamService] Streaming started with MediaRecorder to', enabledDestinations.length, 'destinations');
    } catch (error) {
      console.error('[RTMPStreamService] Failed to start streaming:', error);
      this.updateStatus('error', error instanceof Error ? error.message : 'Failed to start streaming');
      throw error;
    }
  }

  /**
   * Get canvas stream from PROGRAM monitor
   */
  private async getCanvasStream(): Promise<MediaStream> {
    // Find PROGRAM monitor
    const programMonitor = document.querySelector('[data-monitor="program"]') as HTMLElement;
    
    if (!programMonitor) {
      throw new Error('Could not find PROGRAM monitor element');
    }

    // Look for video element
    const videoElement = programMonitor.querySelector('video') as HTMLVideoElement;
    
    // Create canvas for capture
    const canvas = document.createElement('canvas');
    canvas.width = this.config.width;
    canvas.height = this.config.height;
    const ctx = canvas.getContext('2d')!;

    // Create stream from canvas
    this.canvasStream = canvas.captureStream(this.config.frameRate);

    // Start drawing loop
    const drawFrame = () => {
      if (!this.isStreaming && !this.canvasStream) return;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (videoElement && videoElement.readyState >= 2) {
        // Draw video maintaining aspect ratio
        const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (videoAspect > canvasAspect) {
          drawWidth = canvas.width;
          drawHeight = canvas.width / videoAspect;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        } else {
          drawHeight = canvas.height;
          drawWidth = canvas.height * videoAspect;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        }
        
        ctx.drawImage(videoElement, drawX, drawY, drawWidth, drawHeight);
      } else {
        // Draw OnnPlay placeholder
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1e3a5f');
        gradient.addColorStop(1, '#0d1b2a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FF6B00';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OnnPlay', canvas.width / 2, canvas.height / 2 - 30);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px Arial';
        ctx.fillText('STUDIO', canvas.width / 2, canvas.height / 2 + 30);
      }
      
      // Draw LIVE indicator
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(60, 50, 12, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('LIVE', 80, 50);
      
      if (this.isStreaming) {
        requestAnimationFrame(drawFrame);
      }
    };
    
    // Start drawing
    requestAnimationFrame(drawFrame);

    // Try to add audio
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStream.getAudioTracks().forEach(track => {
        this.canvasStream!.addTrack(track);
      });
      console.log('[RTMPStreamService] Audio track added');
    } catch (e) {
      console.warn('[RTMPStreamService] Could not get audio:', e);
    }

    return this.canvasStream;
  }

  /**
   * Connect to backend Socket.IO
   */
  private async connectSocket(destinations: StreamDestination[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverUrl = window.location.origin;
      console.log('[RTMPStreamService] Connecting to:', serverUrl);

      this.socket = io(serverUrl, {
        path: '/socket.io/stream',
        transports: ['polling', 'websocket'],
        timeout: 30000,
        reconnection: true,
        reconnectionAttempts: 5,
      });

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);

      this.socket.on('connect', () => {
        console.log('[RTMPStreamService] ✅ Socket connected:', this.socket?.id);
        clearTimeout(timeout);

        // Send start command with destinations
        this.socket!.emit('start-relay', {
          destinations: destinations.map(d => ({
            id: d.id,
            platform: d.platform,
            name: d.name,
            rtmpUrl: d.rtmpUrl,
            streamKey: d.streamKey,
          })),
          config: this.config,
        });

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[RTMPStreamService] Connection error:', error);
        clearTimeout(timeout);
        reject(error);
      });

      this.socket.on('error', (data) => {
        console.error('[RTMPStreamService] Server error:', data);
        this.updateStatus('error', data.message);
      });

      this.socket.on('status', (data) => {
        console.log('[RTMPStreamService] Status:', data);
      });
    });
  }

  /**
   * Start MediaRecorder for browser-side encoding
   */
  private async startMediaRecorder(stream: MediaStream): Promise<void> {
    // Determine best codec
    const mimeTypes = [
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];

    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }

    if (!selectedMimeType) {
      throw new Error('No supported video codec found');
    }

    console.log('[RTMPStreamService] Using codec:', selectedMimeType);

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: this.config.videoBitrate,
      audioBitsPerSecond: this.config.audioBitrate,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket?.connected) {
        // Send encoded chunk to server
        event.data.arrayBuffer().then(buffer => {
          this.socket!.emit('video-chunk', {
            data: buffer,
            timestamp: Date.now(),
          });
          this.bytesSent += buffer.byteLength;
        });
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[RTMPStreamService] MediaRecorder error:', event);
      this.updateStatus('error', 'MediaRecorder error');
    };

    // Start recording with small timeslice for low latency
    this.mediaRecorder.start(100); // Send data every 100ms
    console.log('[RTMPStreamService] MediaRecorder started');
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    console.log('[RTMPStreamService] Stopping stream...');
    
    this.isStreaming = false;

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

    // Notify server
    if (this.socket) {
      this.socket.emit('stop');
      this.socket.disconnect();
      this.socket = null;
    }

    // Stop stats update
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.updateStatus('idle');
    console.log('[RTMPStreamService] Stream stopped');
  }

  /**
   * Start stats update interval
   */
  private startStatsUpdate(): void {
    this.statsInterval = window.setInterval(() => {
      const duration = (Date.now() - this.startTime) / 1000;
      const bitrate = duration > 0 ? (this.bytesSent * 8) / duration : 0;

      this.stats = {
        ...this.stats,
        bitrate: Math.round(bitrate),
        duration: Math.round(duration),
        status: 'streaming',
      };

      this.notifyCallbacks();
    }, 1000);
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
