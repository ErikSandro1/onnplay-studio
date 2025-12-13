import { VideoSource, SourceType } from '../types/studio';

export class VideoSourceManager {
  private sources: Map<string, VideoSource> = new Map();
  private listeners: Set<(sources: VideoSource[]) => void> = new Set();

  constructor() {
    // Initialize with default sources
    this.initializeDefaultSources();
  }

  private initializeDefaultSources() {
    // Camera sources (will be populated when Daily.co connects)
    for (let i = 1; i <= 3; i++) {
      this.addSource({
        id: `cam-${i}`,
        type: 'camera',
        name: `CAM ${i}`,
        isActive: false,
        isAvailable: false,
      });
    }

    // Screen share source
    this.addSource({
      id: 'screen',
      type: 'screen',
      name: 'SCREEN',
      isActive: false,
      isAvailable: false,
    });

    // Media source (for uploaded images/videos)
    this.addSource({
      id: 'media',
      type: 'media',
      name: 'MEDIA',
      isActive: false,
      isAvailable: false,
    });
  }

  addSource(source: VideoSource) {
    this.sources.set(source.id, source);
    this.notifyListeners();
  }

  removeSource(sourceId: string) {
    this.sources.delete(sourceId);
    this.notifyListeners();
  }

  updateSource(sourceId: string, updates: Partial<VideoSource>) {
    const source = this.sources.get(sourceId);
    if (source) {
      this.sources.set(sourceId, { ...source, ...updates });
      this.notifyListeners();
    }
  }

  getSource(sourceId: string): VideoSource | undefined {
    return this.sources.get(sourceId);
  }

  getAllSources(): VideoSource[] {
    return Array.from(this.sources.values());
  }

  getAvailableSources(): VideoSource[] {
    return this.getAllSources().filter(s => s.isAvailable);
  }

  getSourcesByType(type: SourceType): VideoSource[] {
    return this.getAllSources().filter(s => s.type === type);
  }

  setSourceActive(sourceId: string, isActive: boolean) {
    this.updateSource(sourceId, { isActive });
  }

  setSourceAvailable(sourceId: string, isAvailable: boolean) {
    this.updateSource(sourceId, { isAvailable });
  }

  // For camera sources - will be called when Daily.co provides device info
  setCameraDevice(sourceId: string, deviceId: string) {
    this.updateSource(sourceId, { 
      deviceId, 
      isAvailable: true 
    });
  }

  // For media sources - will be called when user uploads media
  setMediaSource(sourceId: string, mediaUrl: string, mediaType: 'image' | 'video') {
    this.updateSource(sourceId, {
      mediaUrl,
      mediaType,
      isAvailable: true,
    });
  }

  // For screen share - will be called when user shares screen
  setScreenShare(sourceId: string, streamId: string) {
    this.updateSource(sourceId, {
      streamId,
      isAvailable: true,
    });
  }

  // Subscribe to source changes
  subscribe(listener: (sources: VideoSource[]) => void) {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.getAllSources());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const sources = this.getAllSources();
    this.listeners.forEach(listener => listener(sources));
  }

  // Cleanup
  destroy() {
    this.sources.clear();
    this.listeners.clear();
  }
}

// Singleton instance
export const videoSourceManager = new VideoSourceManager();
