/**
 * RTMPStreamService
 * 
 * Manages real RTMP streaming to YouTube, Facebook, Twitch, and custom RTMP servers.
 * Captures canvas from PROGRAM monitor and streams via WebSocket to backend.
 * Backend uses FFmpeg to push to RTMP destinations.
 */

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
  private websocket: WebSocket | null = null;
  private isStreaming: boolean = false;
  private destinations: StreamDestination[] = [];
  private callbacks: Set<StreamCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private startTime: number = 0;
  private frameCount: number = 0;
  private bytesSent: number = 0;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  
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

      // 3. Connect to backend WebSocket
      await this.connectWebSocket(enabledDestinations);

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
   * Connect to backend WebSocket
   */
  private async connectWebSocket(destinations: StreamDestination[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/stream/ws`;
      
      console.log('[RTMPStreamService] Connecting to WebSocket:', wsUrl);
      
      this.websocket = new WebSocket(wsUrl);
      this.websocket.binaryType = 'arraybuffer';

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 15000);

      this.websocket.onopen = () => {
        clearTimeout(timeout);
        console.log('[RTMPStreamService] WebSocket connected');
        
        // Send start command with configuration
        this.websocket!.send(JSON.stringify({
          type: 'start',
          config: this.config,
          targets: destinations.map(d => ({
            id: d.id,
            platform: d.platform,
            rtmpUrl: d.rtmpUrl,
            streamKey: d.streamKey,
          })),
        }));

        resolve();
      };

      this.websocket.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[RTMPStreamService] WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };

      this.websocket.onclose = () => {
        console.log('[RTMPStreamService] WebSocket closed');
        if (this.isStreaming) {
          this.updateStatus('error', 'Connection lost');
          this.stopStreaming();
        }
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[RTMPStreamService] Server message:', message);
          
          if (message.type === 'error') {
            this.updateStatus('error', message.error);
          } else if (message.type === 'status') {
            console.log('[RTMPStreamService] Server status:', message.status);
          }
        } catch (e) {
          // Binary message or non-JSON
        }
      };
    });
  }

  /**
   * Start MediaRecorder to capture and send chunks
   */
  private startRecording(): void {
    if (!this.mediaStream || !this.websocket) {
      throw new Error('MediaStream or WebSocket not ready');
    }

    // Determine supported codec
    const mimeType = this.getSupportedMimeType();
    console.log('[RTMPStreamService] Using codec:', mimeType);

    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: this.config.videoBitrate,
      audioBitsPerSecond: this.config.audioBitrate,
    };

    this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(event.data);
        this.bytesSent += event.data.size;
        this.frameCount++;
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[RTMPStreamService] MediaRecorder error:', event);
      this.updateStatus('error', 'Recording error');
    };

    // Capture in 1-second intervals
    this.mediaRecorder.start(1000);
    console.log('[RTMPStreamService] MediaRecorder started');
  }

  /**
   * Get supported MIME type
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
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
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    if (!this.isStreaming) {
      return;
    }

    console.log('[RTMPStreamService] Stopping stream...');

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Send stop command and close WebSocket
    if (this.websocket) {
      try {
        this.websocket.send(JSON.stringify({ type: 'stop' }));
      } catch (e) {
        // Ignore errors when sending stop
      }
      this.websocket.close();
      this.websocket = null;
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.mediaRecorder = null;
    this.isStreaming = false;
    this.updateStatus('idle');

    console.log('✅ [RTMPStreamService] Streaming stopped');
  }

  /**
   * Start stats update loop
   */
  private startStatsUpdate(): void {
    const updateStats = () => {
      if (!this.isStreaming) return;

      const now = Date.now();
      const duration = Math.floor((now - this.startTime) / 1000);
      const bitrate = duration > 0 ? Math.round((this.bytesSent * 8) / duration / 1000) : 0; // Kbps

      this.stats = {
        ...this.stats,
        bitrate,
        fps: this.config.frameRate,
        droppedFrames: 0,
        duration,
      };

      this.notifyCallbacks();

      setTimeout(updateStats, 1000);
    };

    updateStats();
  }

  /**
   * Update status and notify listeners
   */
  private updateStatus(status: 'idle' | 'connecting' | 'streaming' | 'error', error?: string): void {
    this.stats = { ...this.stats, status, error };
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
   * Check if streaming
   */
  getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Get current status
   */
  getStatus(): 'idle' | 'connecting' | 'streaming' | 'error' {
    return this.stats.status;
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
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.stats));
  }

  /**
   * Update stream configuration
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

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopStreaming();
    this.callbacks.clear();
    this.statusCallbacks.clear();
  }
}

// Singleton instance
export const rtmpStreamService = new RTMPStreamService();
