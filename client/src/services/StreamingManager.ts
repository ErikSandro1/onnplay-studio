/**
 * StreamingManager - Intelligent Streaming Service Selector
 * 
 * Automatically selects the best streaming method:
 * 1. WebRTC (Mediasoup) - Professional grade, constant FPS
 * 2. MediaRecorder - Fallback for older browsers
 * 
 * This provides the best of both worlds:
 * - Professional quality when WebRTC is available
 * - Compatibility when it's not
 */

import { io, Socket } from 'socket.io-client';
import { mediaSourceService, MediaSource } from './MediaSourceService';

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
  streamingMethod: 'webrtc' | 'mediarecorder' | 'none';
}

type StreamCallback = (stats: StreamStats) => void;
type StatusCallback = (status: string, error?: string) => void;

class StreamingManager {
  // Socket connections
  private webrtcSocket: Socket | null = null;
  private rtmpSocket: Socket | null = null;
  
  // State
  private isStreaming = false;
  private destinations: StreamDestination[] = [];
  private streamingMethod: 'webrtc' | 'mediarecorder' | 'none' = 'none';
  
  // WebRTC components
  private peerConnection: RTCPeerConnection | null = null;
  private videoSender: RTCRtpSender | null = null;
  private audioSender: RTCRtpSender | null = null;
  
  // MediaRecorder fallback
  private mediaRecorder: MediaRecorder | null = null;
  
  // Canvas capture
  private captureCanvas: HTMLCanvasElement | null = null;
  private captureCtx: CanvasRenderingContext2D | null = null;
  private canvasStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  
  // Audio
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  
  // Stats
  private chunksSent = 0;
  private bytesSent = 0;
  private startTime = 0;
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentFps = 0;
  
  // Callbacks
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  
  // Intervals
  private statsInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private frameInterval: NodeJS.Timeout | null = null;
  
  // Keep-alive
  private wakeLock: WakeLockSentinel | null = null;
  
  // Config
  private config = {
    width: 1280,
    height: 720,
    frameRate: 30,
    videoBitrate: 4500000,  // 4.5 Mbps
    audioBitrate: 128000,   // 128 kbps
  };

  private stats: StreamStats = {
    isStreaming: false,
    framesSent: 0,
    bytesSent: 0,
    bitrate: 0,
    fps: 0,
    duration: 0,
    status: 'idle',
    streamingMethod: 'none',
  };

  constructor() {
    // Create capture canvas
    this.captureCanvas = document.createElement('canvas');
    this.captureCanvas.width = this.config.width;
    this.captureCanvas.height = this.config.height;
    this.captureCtx = this.captureCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    
    // Initialize audio context
    this.initAudio();
    
    console.log('[StreamingManager] Initialized');
  }

  /**
   * Initialize audio context and destination
   */
  private initAudio(): void {
    try {
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.audioDestination = this.audioContext.createMediaStreamDestination();
      console.log('[StreamingManager] Audio context initialized');
    } catch (error) {
      console.error('[StreamingManager] Failed to initialize audio:', error);
    }
  }

  /**
   * Check if WebRTC streaming is available
   */
  private isWebRTCAvailable(): boolean {
    return !!(
      window.RTCPeerConnection &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  /**
   * Connect to the streaming server
   */
  async connect(serverUrl?: string): Promise<void> {
    const url = serverUrl || window.location.origin;
    
    console.log('[StreamingManager] Connecting to server:', url);
    this.updateStatus('connecting');

    // Try WebRTC first
    if (this.isWebRTCAvailable()) {
      try {
        await this.connectWebRTC(url);
        this.streamingMethod = 'webrtc';
        console.log('[StreamingManager] Using WebRTC streaming');
        this.updateStatus('idle');
        return;
      } catch (error) {
        console.warn('[StreamingManager] WebRTC not available, falling back to MediaRecorder:', error);
      }
    }

    // Fallback to MediaRecorder
    try {
      await this.connectMediaRecorder(url);
      this.streamingMethod = 'mediarecorder';
      console.log('[StreamingManager] Using MediaRecorder streaming');
      this.updateStatus('idle');
    } catch (error) {
      console.error('[StreamingManager] Failed to connect:', error);
      this.updateStatus('error', 'Failed to connect to streaming server');
      throw error;
    }
  }

  /**
   * Connect using WebRTC (Mediasoup)
   */
  private async connectWebRTC(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try direct connection to Mediasoup server on port 3001
      // If that fails, will fallback to MediaRecorder
      const baseUrl = url.replace(/\/$/, '');
      const webrtcUrl = baseUrl.includes('onnplay.com') 
        ? 'https://www.onnplay.com:3001'  // Production
        : baseUrl.replace(':3000', ':3001'); // Development
      
      console.log('[StreamingManager] Connecting to WebRTC server:', webrtcUrl);
      
      this.webrtcSocket = io(webrtcUrl, {
        path: '/webrtc-stream',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        timeout: 30000,
      });

      const timeout = setTimeout(() => {
        this.webrtcSocket?.disconnect();
        reject(new Error('WebRTC connection timeout'));
      }, 10000);

      this.webrtcSocket.on('connect', () => {
        clearTimeout(timeout);
        console.log('[StreamingManager] WebRTC socket connected');
        resolve();
      });

      this.webrtcSocket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.webrtcSocket.on('disconnect', (reason) => {
        console.log('[StreamingManager] WebRTC socket disconnected:', reason);
        if (this.isStreaming) {
          this.handleDisconnect();
        }
      });
    });
  }

  /**
   * Connect using MediaRecorder (fallback)
   */
  private async connectMediaRecorder(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.rtmpSocket = io(url, {
        path: '/rtmp-stream',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        timeout: 30000,
      });

      const timeout = setTimeout(() => {
        this.rtmpSocket?.disconnect();
        reject(new Error('MediaRecorder connection timeout'));
      }, 10000);

      this.rtmpSocket.on('connect', () => {
        clearTimeout(timeout);
        console.log('[StreamingManager] MediaRecorder socket connected');
        resolve();
      });

      this.rtmpSocket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.rtmpSocket.on('disconnect', (reason) => {
        console.log('[StreamingManager] MediaRecorder socket disconnected:', reason);
        if (this.isStreaming) {
          this.handleDisconnect();
        }
      });
    });
  }

  /**
   * Start streaming to destinations
   */
  async startStreaming(destinations: StreamDestination[]): Promise<void> {
    if (this.isStreaming) {
      console.warn('[StreamingManager] Already streaming');
      return;
    }

    this.destinations = destinations.filter(d => d.enabled !== false);
    
    if (this.destinations.length === 0) {
      throw new Error('No destinations configured');
    }

    console.log('[StreamingManager] Starting stream to', this.destinations.length, 'destinations');
    this.updateStatus('connecting');

    try {
      // Request wake lock to prevent screen sleep
      await this.requestWakeLock();
      
      // Start canvas capture
      this.startCanvasCapture();
      
      // Start streaming based on method
      if (this.streamingMethod === 'webrtc') {
        await this.startWebRTCStreaming();
      } else {
        await this.startMediaRecorderStreaming();
      }

      this.isStreaming = true;
      this.startTime = Date.now();
      this.updateStatus('streaming');
      
      // Start stats reporting
      this.startStatsReporting();
      
      console.log('[StreamingManager] Streaming started via', this.streamingMethod);
      
    } catch (error) {
      console.error('[StreamingManager] Failed to start streaming:', error);
      this.updateStatus('error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Start WebRTC streaming
   */
  private async startWebRTCStreaming(): Promise<void> {
    if (!this.webrtcSocket || !this.canvasStream) {
      throw new Error('WebRTC not initialized');
    }

    // Get router capabilities
    const { rtpCapabilities } = await this.socketRequest(this.webrtcSocket, 'getRouterRtpCapabilities');
    
    // Create producer transport
    const transportOptions = await this.socketRequest(this.webrtcSocket, 'createProducerTransport');
    
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: transportOptions.iceCandidates?.map((c: any) => ({ urls: `stun:${c.ip}:${c.port}` })) || [],
    });

    // Add video track
    const videoTrack = this.canvasStream.getVideoTracks()[0];
    if (videoTrack) {
      this.videoSender = this.peerConnection.addTrack(videoTrack, this.canvasStream);
      
      // Set encoding parameters
      const params = this.videoSender.getParameters();
      if (params.encodings && params.encodings.length > 0) {
        params.encodings[0].maxBitrate = this.config.videoBitrate;
        params.encodings[0].maxFramerate = this.config.frameRate;
        await this.videoSender.setParameters(params);
      }
    }

    // Add audio track
    if (this.audioDestination) {
      const audioTrack = this.audioDestination.stream.getAudioTracks()[0];
      if (audioTrack) {
        this.audioSender = this.peerConnection.addTrack(audioTrack, this.audioDestination.stream);
      }
    }

    // Create and send offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Connect transport
    await this.socketRequest(this.webrtcSocket, 'connectProducerTransport', {
      dtlsParameters: {
        fingerprints: [{ algorithm: 'sha-256', value: '' }],
        role: 'client',
      },
    });

    // Start relay
    await this.socketRequest(this.webrtcSocket, 'startRelay', {
      destinations: this.destinations,
      config: this.config,
    });

    console.log('[StreamingManager] WebRTC streaming started');
  }

  /**
   * Start MediaRecorder streaming (fallback)
   */
  private async startMediaRecorderStreaming(): Promise<void> {
    if (!this.rtmpSocket || !this.canvasStream) {
      throw new Error('MediaRecorder not initialized');
    }

    // Combine video and audio streams
    const tracks = [...this.canvasStream.getTracks()];
    if (this.audioDestination) {
      tracks.push(...this.audioDestination.stream.getTracks());
    }
    const combinedStream = new MediaStream(tracks);

    // Create MediaRecorder
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: this.config.videoBitrate,
      audioBitsPerSecond: this.config.audioBitrate,
    });

    // Handle data
    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.rtmpSocket?.connected) {
        const buffer = await event.data.arrayBuffer();
        this.rtmpSocket.emit('video-chunk', buffer);
        this.chunksSent++;
        this.bytesSent += buffer.byteLength;
      }
    };

    // Start relay on server
    this.rtmpSocket.emit('start-relay', {
      destinations: this.destinations,
      config: this.config,
    });

    // Wait for server confirmation
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server timeout')), 10000);
      
      this.rtmpSocket!.once('relay-started', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      this.rtmpSocket!.once('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.message || 'Server error'));
      });
    });

    // Start recording
    this.mediaRecorder.start(100); // 100ms chunks for low latency

    console.log('[StreamingManager] MediaRecorder streaming started');
  }

  /**
   * Start canvas capture with constant frame rate
   */
  private startCanvasCapture(): void {
    if (!this.captureCanvas) return;

    // Create stream with manual frame control
    this.canvasStream = this.captureCanvas.captureStream(0);
    
    const track = this.canvasStream.getVideoTracks()[0] as any;
    const frameInterval = 1000 / this.config.frameRate;
    
    // Frame generation loop
    const generateFrame = () => {
      if (!this.isStreaming && !this.canvasStream) return;
      
      // Draw current program content to capture canvas
      this.drawProgramToCanvas();
      
      // Request frame from canvas stream
      if (track && track.requestFrame) {
        track.requestFrame();
      }
      
      this.frameCount++;
      
      // Calculate FPS
      const now = performance.now();
      if (now - this.lastFpsTime >= 1000) {
        this.currentFps = this.frameCount;
        this.frameCount = 0;
        this.lastFpsTime = now;
      }
    };

    // Use setInterval for consistent timing
    this.frameInterval = setInterval(generateFrame, frameInterval);
    this.lastFpsTime = performance.now();
    
    console.log('[StreamingManager] Canvas capture started at', this.config.frameRate, 'fps');
  }

  /**
   * Draw program content to capture canvas
   */
  private drawProgramToCanvas(): void {
    if (!this.captureCtx || !this.captureCanvas) return;

    // Get program canvas from media source service
    const programCanvas = mediaSourceService.getProgramCanvas();
    
    if (programCanvas) {
      this.captureCtx.drawImage(
        programCanvas,
        0, 0,
        this.captureCanvas.width,
        this.captureCanvas.height
      );
    } else {
      // Draw black frame if no content
      this.captureCtx.fillStyle = '#000000';
      this.captureCtx.fillRect(0, 0, this.captureCanvas.width, this.captureCanvas.height);
    }
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) return;

    console.log('[StreamingManager] Stopping stream');
    this.isStreaming = false;

    // Stop frame generation
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }

    // Stop stats reporting
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Stop WebRTC
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Stop canvas stream
    if (this.canvasStream) {
      this.canvasStream.getTracks().forEach(track => track.stop());
      this.canvasStream = null;
    }

    // Release wake lock
    this.releaseWakeLock();

    // Notify server
    if (this.webrtcSocket?.connected) {
      this.webrtcSocket.emit('stopRelay');
    }
    if (this.rtmpSocket?.connected) {
      this.rtmpSocket.emit('stop-relay');
    }

    this.updateStatus('idle');
    console.log('[StreamingManager] Stream stopped');
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    console.log('[StreamingManager] Handling disconnect');
    this.updateStatus('reconnecting');
    
    // Try to reconnect
    setTimeout(async () => {
      try {
        await this.connect();
        if (this.destinations.length > 0) {
          await this.startStreaming(this.destinations);
        }
      } catch (error) {
        console.error('[StreamingManager] Reconnection failed:', error);
        this.updateStatus('error', 'Reconnection failed');
      }
    }, 2000);
  }

  /**
   * Request wake lock
   */
  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('[StreamingManager] Wake lock acquired');
      }
    } catch (error) {
      console.warn('[StreamingManager] Wake lock not available:', error);
    }
  }

  /**
   * Release wake lock
   */
  private releaseWakeLock(): void {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
      console.log('[StreamingManager] Wake lock released');
    }
  }

  /**
   * Start stats reporting
   */
  private startStatsReporting(): void {
    this.statsInterval = setInterval(() => {
      const duration = this.isStreaming ? Date.now() - this.startTime : 0;
      const bitrate = duration > 0 ? Math.round((this.bytesSent * 8) / (duration / 1000) / 1000) : 0;

      this.stats = {
        isStreaming: this.isStreaming,
        framesSent: this.chunksSent,
        bytesSent: this.bytesSent,
        bitrate,
        fps: this.currentFps,
        duration,
        status: this.isStreaming ? 'streaming' : 'idle',
        streamingMethod: this.streamingMethod,
      };

      this.callbacks.forEach(cb => cb(this.stats));
    }, 1000);
  }

  /**
   * Update status
   */
  private updateStatus(status: StreamStats['status'], error?: string): void {
    this.stats.status = status;
    this.stats.error = error;
    this.stats.streamingMethod = this.streamingMethod;
    
    this.callbacks.forEach(cb => cb(this.stats));
    this.statusCallbacks.forEach(cb => cb(status, error));
  }

  /**
   * Socket request helper
   */
  private socketRequest(socket: Socket, event: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      socket.emit(event, data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
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
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
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
   * Subscribe to status updates
   */
  onStatus(callback: StatusCallback): () => void {
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
   * Check if streaming
   */
  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Get streaming method
   */
  getStreamingMethod(): string {
    return this.streamingMethod;
  }

  /**
   * Get audio destination for mixing
   */
  getAudioDestination(): MediaStreamAudioDestinationNode | null {
    return this.audioDestination;
  }

  /**
   * Get audio context
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.stopStreaming();
    
    if (this.webrtcSocket) {
      this.webrtcSocket.disconnect();
      this.webrtcSocket = null;
    }
    
    if (this.rtmpSocket) {
      this.rtmpSocket.disconnect();
      this.rtmpSocket = null;
    }
    
    this.streamingMethod = 'none';
    console.log('[StreamingManager] Disconnected');
  }
}

// Export singleton instance
export const streamingManager = new StreamingManager();
export default streamingManager;
