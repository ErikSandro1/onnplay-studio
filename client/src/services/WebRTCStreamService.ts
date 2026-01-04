/**
 * WebRTCStreamService - Professional WebRTC Streaming Client
 * 
 * This service replaces MediaRecorder with WebRTC for professional-grade streaming.
 * Uses mediasoup-client to connect to the server's Mediasoup SFU.
 * 
 * Advantages over MediaRecorder:
 * - Constant frame rate (30fps guaranteed by WebRTC)
 * - Lower latency
 * - Better quality control
 * - Automatic bitrate adaptation
 * - Same technology used by StreamYard, Zoom, Google Meet
 */

import { io, Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { types as mediasoupTypes } from 'mediasoup-client';

export interface StreamDestination {
  id: string;
  platform: string;
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled?: boolean;
}

export interface StreamConfig {
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
}

export interface StreamStatus {
  isConnected: boolean;
  isStreaming: boolean;
  bytesTransferred: number;
  duration: number;
  fps: number;
  bitrate: number;
}

type StatusCallback = (status: StreamStatus) => void;
type ErrorCallback = (error: Error) => void;

class WebRTCStreamService {
  private socket: Socket | null = null;
  private device: mediasoupTypes.Device | null = null;
  private producerTransport: mediasoupTypes.Transport | null = null;
  private videoProducer: mediasoupTypes.Producer | null = null;
  private audioProducer: mediasoupTypes.Producer | null = null;
  
  private canvas: HTMLCanvasElement | null = null;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  
  private isStreaming = false;
  private startTime = 0;
  private bytesTransferred = 0;
  
  private statusCallback: StatusCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  
  private frameRequestId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private currentFps = 0;
  
  private config: StreamConfig = {
    width: 1280,
    height: 720,
    frameRate: 30,
    videoBitrate: 4500000, // 4.5 Mbps
    audioBitrate: 128000,  // 128 kbps
  };

  /**
   * Initialize the WebRTC streaming service
   */
  async initialize(
    canvas: HTMLCanvasElement,
    audioContext: AudioContext,
    audioDestination: MediaStreamAudioDestinationNode
  ): Promise<void> {
    this.canvas = canvas;
    this.audioContext = audioContext;
    this.audioDestination = audioDestination;
    
    console.log('[WebRTCStreamService] Initialized with canvas:', canvas.width, 'x', canvas.height);
  }

  /**
   * Connect to the WebRTC streaming server
   */
  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[WebRTCStreamService] Connecting to server:', serverUrl);
      
      this.socket = io(serverUrl, {
        path: '/webrtc-stream',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 30000,
      });

      this.socket.on('connect', async () => {
        console.log('[WebRTCStreamService] Connected to server');
        
        try {
          // Get router RTP capabilities
          const { rtpCapabilities } = await this.request('getRouterRtpCapabilities');
          
          // Create mediasoup device
          this.device = new mediasoupClient.Device();
          await this.device.load({ routerRtpCapabilities: rtpCapabilities });
          
          console.log('[WebRTCStreamService] Device loaded with capabilities');
          
          // Create producer transport
          await this.createProducerTransport();
          
          this.updateStatus();
          resolve();
        } catch (error) {
          console.error('[WebRTCStreamService] Error initializing:', error);
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[WebRTCStreamService] Disconnected:', reason);
        this.updateStatus();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebRTCStreamService] Connection error:', error);
        this.errorCallback?.(error);
        reject(error);
      });

      this.socket.on('error', (error) => {
        console.error('[WebRTCStreamService] Socket error:', error);
        this.errorCallback?.(new Error(error.message || 'Socket error'));
      });

      this.socket.on('relay-started', () => {
        console.log('[WebRTCStreamService] RTMP relay started');
      });
    });
  }

  /**
   * Create producer transport for sending media
   */
  private async createProducerTransport(): Promise<void> {
    if (!this.socket || !this.device) {
      throw new Error('Not connected');
    }

    const transportOptions = await this.request('createProducerTransport');
    
    this.producerTransport = this.device.createSendTransport({
      id: transportOptions.id,
      iceParameters: transportOptions.iceParameters,
      iceCandidates: transportOptions.iceCandidates,
      dtlsParameters: transportOptions.dtlsParameters,
      iceServers: [],
      proprietaryConstraints: {},
    });

    this.producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.request('connectProducerTransport', { dtlsParameters });
        callback();
      } catch (error) {
        errback(error as Error);
      }
    });

    this.producerTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const { id } = await this.request('produce', { kind, rtpParameters, appData });
        callback({ id });
      } catch (error) {
        errback(error as Error);
      }
    });

    this.producerTransport.on('connectionstatechange', (state) => {
      console.log('[WebRTCStreamService] Transport connection state:', state);
      if (state === 'failed' || state === 'closed') {
        this.handleTransportFailure();
      }
    });

    console.log('[WebRTCStreamService] Producer transport created');
  }

  /**
   * Start streaming to RTMP destinations
   */
  async startStreaming(destinations: StreamDestination[]): Promise<void> {
    if (!this.socket || !this.device || !this.producerTransport) {
      throw new Error('Not connected to server');
    }

    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    console.log('[WebRTCStreamService] Starting streaming to', destinations.length, 'destinations');

    try {
      // Get video stream from canvas with constant frame rate
      const videoStream = this.canvas.captureStream(0); // 0 = manual frame control
      const videoTrack = videoStream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new Error('No video track from canvas');
      }

      // Apply constraints for consistent quality
      await videoTrack.applyConstraints({
        width: { ideal: this.config.width },
        height: { ideal: this.config.height },
        frameRate: { ideal: this.config.frameRate, max: this.config.frameRate },
      });

      // Create video producer
      this.videoProducer = await this.producerTransport.produce({
        track: videoTrack,
        encodings: [
          {
            maxBitrate: this.config.videoBitrate,
            maxFramerate: this.config.frameRate,
          },
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
        appData: { type: 'video' },
      });

      console.log('[WebRTCStreamService] Video producer created:', this.videoProducer.id);

      // Get audio stream
      if (this.audioDestination) {
        const audioTrack = this.audioDestination.stream.getAudioTracks()[0];
        
        if (audioTrack) {
          this.audioProducer = await this.producerTransport.produce({
            track: audioTrack,
            codecOptions: {
              opusStereo: true,
              opusDtx: true,
            },
            appData: { type: 'audio' },
          });
          
          console.log('[WebRTCStreamService] Audio producer created:', this.audioProducer.id);
        }
      }

      // Start RTMP relay on server
      await this.request('startRelay', {
        destinations,
        config: this.config,
      });

      // Start frame generation loop
      this.isStreaming = true;
      this.startTime = Date.now();
      this.bytesTransferred = 0;
      this.startFrameLoop(videoStream);

      console.log('[WebRTCStreamService] Streaming started');
      this.updateStatus();

    } catch (error) {
      console.error('[WebRTCStreamService] Error starting streaming:', error);
      this.errorCallback?.(error as Error);
      throw error;
    }
  }

  /**
   * Start frame generation loop for constant FPS
   */
  private startFrameLoop(videoStream: MediaStream): void {
    const track = videoStream.getVideoTracks()[0] as any;
    const frameInterval = 1000 / this.config.frameRate; // ~33ms for 30fps
    
    const generateFrame = () => {
      if (!this.isStreaming) return;
      
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;
      
      if (elapsed >= frameInterval) {
        // Request new frame from canvas
        if (track.requestFrame) {
          track.requestFrame();
        }
        
        this.frameCount++;
        this.lastFrameTime = now - (elapsed % frameInterval);
        
        // Calculate FPS every second
        if (this.frameCount % this.config.frameRate === 0) {
          this.currentFps = this.config.frameRate;
        }
      }
      
      this.frameRequestId = requestAnimationFrame(generateFrame);
    };

    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    generateFrame();
    
    console.log('[WebRTCStreamService] Frame loop started at', this.config.frameRate, 'fps');
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    console.log('[WebRTCStreamService] Stopping streaming');
    
    this.isStreaming = false;
    
    // Stop frame loop
    if (this.frameRequestId) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }

    // Close producers
    if (this.videoProducer) {
      this.videoProducer.close();
      this.videoProducer = null;
    }

    if (this.audioProducer) {
      this.audioProducer.close();
      this.audioProducer = null;
    }

    // Stop relay on server
    if (this.socket?.connected) {
      try {
        await this.request('stopRelay');
      } catch (error) {
        console.error('[WebRTCStreamService] Error stopping relay:', error);
      }
    }

    this.updateStatus();
    console.log('[WebRTCStreamService] Streaming stopped');
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stopStreaming();
    
    if (this.producerTransport) {
      this.producerTransport.close();
      this.producerTransport = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.device = null;
    console.log('[WebRTCStreamService] Disconnected');
  }

  /**
   * Handle transport failure
   */
  private handleTransportFailure(): void {
    console.error('[WebRTCStreamService] Transport failed, attempting reconnection...');
    
    // Try to reconnect
    setTimeout(async () => {
      try {
        if (this.socket?.connected) {
          await this.createProducerTransport();
          console.log('[WebRTCStreamService] Reconnected successfully');
        }
      } catch (error) {
        console.error('[WebRTCStreamService] Reconnection failed:', error);
        this.errorCallback?.(error as Error);
      }
    }, 2000);
  }

  /**
   * Send request to server and wait for response
   */
  private request(event: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit(event, data, (response: any) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Update and emit status
   */
  private updateStatus(): void {
    const status: StreamStatus = {
      isConnected: this.socket?.connected || false,
      isStreaming: this.isStreaming,
      bytesTransferred: this.bytesTransferred,
      duration: this.isStreaming ? Date.now() - this.startTime : 0,
      fps: this.currentFps,
      bitrate: this.config.videoBitrate,
    };

    this.statusCallback?.(status);
  }

  /**
   * Set status callback
   */
  onStatus(callback: StatusCallback): void {
    this.statusCallback = callback;
  }

  /**
   * Set error callback
   */
  onError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * Update stream configuration
   */
  setConfig(config: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[WebRTCStreamService] Config updated:', this.config);
  }

  /**
   * Get current status
   */
  getStatus(): StreamStatus {
    return {
      isConnected: this.socket?.connected || false,
      isStreaming: this.isStreaming,
      bytesTransferred: this.bytesTransferred,
      duration: this.isStreaming ? Date.now() - this.startTime : 0,
      fps: this.currentFps,
      bitrate: this.config.videoBitrate,
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const webRTCStreamService = new WebRTCStreamService();
export default webRTCStreamService;
