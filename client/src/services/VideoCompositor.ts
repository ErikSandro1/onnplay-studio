/**
 * VideoCompositor - Efficient Video Composition Service
 * 
 * Combines multiple video sources (webcam, screen share, media files)
 * into a single output canvas for streaming.
 * 
 * Uses native canvas drawing instead of html2canvas for maximum performance.
 */

export interface VideoSource {
  id: string;
  name: string;
  type: 'camera' | 'screen' | 'media' | 'image';
  element: HTMLVideoElement | HTMLImageElement | null;
  stream?: MediaStream;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  visible: boolean;
  muted: boolean;
}

export interface CompositorConfig {
  width: number;
  height: number;
  frameRate: number;
  backgroundColor: string;
}

export interface CompositorStats {
  fps: number;
  frameCount: number;
  activeSources: number;
}

type StatsCallback = (stats: CompositorStats) => void;

class VideoCompositor {
  private outputCanvas: HTMLCanvasElement;
  private outputCtx: CanvasRenderingContext2D;
  private sources: Map<string, VideoSource> = new Map();
  private animationFrameId: number | null = null;
  private isRunning = false;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 0;
  private statsCallbacks: Set<StatsCallback> = new Set();
  
  private config: CompositorConfig = {
    width: 1280,
    height: 720,
    frameRate: 30,
    backgroundColor: '#1a1a2e',
  };

  constructor() {
    this.outputCanvas = document.createElement('canvas');
    this.outputCanvas.width = this.config.width;
    this.outputCanvas.height = this.config.height;
    this.outputCtx = this.outputCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // Better performance
    })!;
  }

  /**
   * Get the output canvas for streaming
   */
  getOutputCanvas(): HTMLCanvasElement {
    return this.outputCanvas;
  }

  /**
   * Get a MediaStream from the output canvas
   */
  getOutputStream(frameRate: number = 30): MediaStream {
    return this.outputCanvas.captureStream(frameRate);
  }

  /**
   * Update compositor configuration
   */
  updateConfig(config: Partial<CompositorConfig>): void {
    this.config = { ...this.config, ...config };
    this.outputCanvas.width = this.config.width;
    this.outputCanvas.height = this.config.height;
  }

  /**
   * Add a camera source
   */
  async addCameraSource(deviceId?: string): Promise<VideoSource> {
    const constraints: MediaStreamConstraints = {
      video: deviceId 
        ? { deviceId: { exact: deviceId }, width: 1280, height: 720 }
        : { width: 1280, height: 720 },
      audio: true,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.muted = true; // Prevent echo
    videoElement.playsInline = true;
    await videoElement.play();

    const source: VideoSource = {
      id: `cam-${Date.now()}`,
      name: 'Webcam',
      type: 'camera',
      element: videoElement,
      stream,
      x: 0,
      y: 0,
      width: this.config.width,
      height: this.config.height,
      zIndex: this.sources.size,
      visible: true,
      muted: false,
    };

    this.sources.set(source.id, source);
    console.log('[VideoCompositor] Added camera source:', source.id);
    return source;
  }

  /**
   * Add a screen share source
   */
  async addScreenSource(): Promise<VideoSource> {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' } as any,
      audio: true,
    });

    const videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.muted = true;
    videoElement.playsInline = true;
    await videoElement.play();

    // Handle when user stops sharing
    stream.getVideoTracks()[0].onended = () => {
      this.removeSource(`screen-${Date.now()}`);
    };

    const source: VideoSource = {
      id: `screen-${Date.now()}`,
      name: 'Screen Share',
      type: 'screen',
      element: videoElement,
      stream,
      x: 0,
      y: 0,
      width: this.config.width,
      height: this.config.height,
      zIndex: this.sources.size,
      visible: true,
      muted: false,
    };

    this.sources.set(source.id, source);
    console.log('[VideoCompositor] Added screen source:', source.id);
    return source;
  }

  /**
   * Add a media file source (video or image)
   */
  async addMediaSource(file: File): Promise<VideoSource> {
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');

    let element: HTMLVideoElement | HTMLImageElement;

    if (isVideo) {
      element = document.createElement('video');
      (element as HTMLVideoElement).src = url;
      (element as HTMLVideoElement).loop = true;
      (element as HTMLVideoElement).muted = false;
      (element as HTMLVideoElement).playsInline = true;
      await (element as HTMLVideoElement).play();
    } else {
      element = document.createElement('img');
      element.src = url;
      await new Promise<void>((resolve) => {
        element.onload = () => resolve();
      });
    }

    const source: VideoSource = {
      id: `media-${Date.now()}`,
      name: file.name.substring(0, 20),
      type: isVideo ? 'media' : 'image',
      element,
      x: 0,
      y: 0,
      width: this.config.width,
      height: this.config.height,
      zIndex: this.sources.size,
      visible: true,
      muted: false,
    };

    this.sources.set(source.id, source);
    console.log('[VideoCompositor] Added media source:', source.id);
    return source;
  }

  /**
   * Add an existing video element as source
   */
  addVideoElementSource(videoElement: HTMLVideoElement, name: string): VideoSource {
    const source: VideoSource = {
      id: `video-${Date.now()}`,
      name,
      type: 'media',
      element: videoElement,
      x: 0,
      y: 0,
      width: this.config.width,
      height: this.config.height,
      zIndex: this.sources.size,
      visible: true,
      muted: false,
    };

    this.sources.set(source.id, source);
    return source;
  }

  /**
   * Remove a source
   */
  removeSource(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (source) {
      // Stop stream tracks
      if (source.stream) {
        source.stream.getTracks().forEach(track => track.stop());
      }
      // Revoke object URL if media
      if (source.element && source.type === 'media') {
        const src = (source.element as HTMLVideoElement).src;
        if (src.startsWith('blob:')) {
          URL.revokeObjectURL(src);
        }
      }
      this.sources.delete(sourceId);
      console.log('[VideoCompositor] Removed source:', sourceId);
    }
  }

  /**
   * Update source position and size
   */
  updateSource(sourceId: string, updates: Partial<VideoSource>): void {
    const source = this.sources.get(sourceId);
    if (source) {
      Object.assign(source, updates);
    }
  }

  /**
   * Get all sources
   */
  getSources(): VideoSource[] {
    return Array.from(this.sources.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Get source by ID
   */
  getSource(sourceId: string): VideoSource | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * Start the compositor render loop
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.render();
    console.log('[VideoCompositor] Started');
  }

  /**
   * Stop the compositor
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('[VideoCompositor] Stopped');
  }

  /**
   * Main render loop
   */
  private render = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    const targetInterval = 1000 / this.config.frameRate;

    if (elapsed >= targetInterval) {
      this.drawFrame();
      this.frameCount++;
      
      // Calculate FPS every second
      if (this.frameCount % this.config.frameRate === 0) {
        this.fps = 1000 / elapsed;
        this.notifyStats();
      }
      
      this.lastFrameTime = now - (elapsed % targetInterval);
    }

    this.animationFrameId = requestAnimationFrame(this.render);
  };

  /**
   * Draw a single frame
   */
  private drawFrame(): void {
    const ctx = this.outputCtx;
    const { width, height, backgroundColor } = this.config;

    // Clear with background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Get sorted sources by zIndex
    const sortedSources = this.getSources();

    // Draw each visible source
    for (const source of sortedSources) {
      if (!source.visible || !source.element) continue;

      try {
        // Calculate aspect ratio preserving dimensions
        const srcWidth = source.element instanceof HTMLVideoElement 
          ? source.element.videoWidth 
          : source.element.naturalWidth || source.element.width;
        const srcHeight = source.element instanceof HTMLVideoElement 
          ? source.element.videoHeight 
          : source.element.naturalHeight || source.element.height;

        if (srcWidth === 0 || srcHeight === 0) continue;

        // Draw the source
        ctx.drawImage(
          source.element,
          source.x,
          source.y,
          source.width,
          source.height
        );
      } catch (e) {
        // Video might not be ready yet
      }
    }

    // If no sources, draw placeholder
    if (sortedSources.filter(s => s.visible).length === 0) {
      this.drawPlaceholder();
    }
  }

  /**
   * Draw placeholder when no sources are active
   */
  private drawPlaceholder(): void {
    const ctx = this.outputCtx;
    const { width, height } = this.config;

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw "LIVE" text
    ctx.fillStyle = '#FF6B00';
    ctx.font = `bold ${Math.floor(height / 8)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LIVE', width / 2, height / 2 - 30);

    // Draw "OnnPlay Studio" text
    ctx.fillStyle = 'white';
    ctx.font = `${Math.floor(height / 16)}px Arial`;
    ctx.fillText('OnnPlay Studio', width / 2, height / 2 + 20);

    // Draw current time
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    ctx.fillStyle = '#888';
    ctx.font = `${Math.floor(height / 24)}px Arial`;
    ctx.fillText(timeStr, width / 2, height / 2 + 60);
  }

  /**
   * Subscribe to stats updates
   */
  onStats(callback: StatsCallback): () => void {
    this.statsCallbacks.add(callback);
    return () => this.statsCallbacks.delete(callback);
  }

  private notifyStats(): void {
    const stats: CompositorStats = {
      fps: this.fps,
      frameCount: this.frameCount,
      activeSources: this.sources.size,
    };
    this.statsCallbacks.forEach(cb => cb(stats));
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.stop();
    this.sources.forEach((_, id) => this.removeSource(id));
    this.statsCallbacks.clear();
  }
}

// Singleton instance
export const videoCompositor = new VideoCompositor();
