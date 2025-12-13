import { StreamDestination } from '../types/studio';

export interface StreamConfig {
  platform: 'youtube' | 'facebook' | 'twitch' | 'rtmp';
  streamKey: string;
  streamUrl?: string; // For RTMP
}

export class StreamingService {
  private destinations: Map<string, StreamDestination> = new Map();
  private listeners: Set<(destinations: StreamDestination[]) => void> = new Set();
  private activeStreams: Set<string> = new Set();

  /**
   * Add a streaming destination
   */
  addDestination(config: StreamConfig): StreamDestination {
    const destination: StreamDestination = {
      id: `dest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      platform: config.platform,
      name: this.getPlatformName(config.platform),
      isActive: false,
      streamKey: config.streamKey,
      streamUrl: config.streamUrl,
      status: 'idle',
    };

    this.destinations.set(destination.id, destination);
    this.notifyListeners();

    return destination;
  }

  /**
   * Remove a streaming destination
   */
  removeDestination(destinationId: string) {
    // Stop stream if active
    if (this.activeStreams.has(destinationId)) {
      this.stopStream(destinationId);
    }

    this.destinations.delete(destinationId);
    this.notifyListeners();
  }

  /**
   * Start streaming to a destination
   * NOTE: This is a placeholder. Actual implementation requires backend service
   */
  async startStream(destinationId: string): Promise<void> {
    const destination = this.destinations.get(destinationId);
    if (!destination) {
      throw new Error('Destination not found');
    }

    if (destination.isActive) {
      throw new Error('Stream already active');
    }

    // Update status
    this.updateDestination(destinationId, {
      status: 'connecting',
      isActive: false,
    });

    try {
      // TODO: Implement actual streaming logic
      // This will require:
      // 1. Backend service to handle RTMP/RTMPS
      // 2. Canvas capture of program output
      // 3. MediaRecorder API for encoding
      // 4. WebSocket connection to backend
      // 5. Backend forwards stream to destination

      // For now, simulate connection
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.updateDestination(destinationId, {
        status: 'live',
        isActive: true,
      });

      this.activeStreams.add(destinationId);

      console.log(`✅ Streaming to ${destination.platform} ready - waiting for backend implementation`);
    } catch (err) {
      this.updateDestination(destinationId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to start stream',
        isActive: false,
      });
      throw err;
    }
  }

  /**
   * Stop streaming to a destination
   */
  async stopStream(destinationId: string): Promise<void> {
    const destination = this.destinations.get(destinationId);
    if (!destination) {
      throw new Error('Destination not found');
    }

    if (!destination.isActive) {
      return;
    }

    try {
      // TODO: Implement actual stop logic
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.updateDestination(destinationId, {
        status: 'idle',
        isActive: false,
        error: undefined,
      });

      this.activeStreams.delete(destinationId);
    } catch (err) {
      this.updateDestination(destinationId, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to stop stream',
      });
      throw err;
    }
  }

  /**
   * Start streaming to all destinations
   */
  async startAllStreams(): Promise<void> {
    const destinations = this.getAllDestinations();
    const promises = destinations.map(dest => this.startStream(dest.id));
    await Promise.all(promises);
  }

  /**
   * Stop all active streams
   */
  async stopAllStreams(): Promise<void> {
    const promises = Array.from(this.activeStreams).map(id => this.stopStream(id));
    await Promise.all(promises);
  }

  /**
   * Get all destinations
   */
  getAllDestinations(): StreamDestination[] {
    return Array.from(this.destinations.values());
  }

  /**
   * Get destination by ID
   */
  getDestination(id: string): StreamDestination | undefined {
    return this.destinations.get(id);
  }

  /**
   * Check if any stream is active
   */
  hasActiveStreams(): boolean {
    return this.activeStreams.size > 0;
  }

  /**
   * Update destination
   */
  private updateDestination(id: string, updates: Partial<StreamDestination>) {
    const destination = this.destinations.get(id);
    if (destination) {
      this.destinations.set(id, { ...destination, ...updates });
      this.notifyListeners();
    }
  }

  /**
   * Get platform display name
   */
  private getPlatformName(platform: string): string {
    const names: Record<string, string> = {
      youtube: 'YouTube',
      facebook: 'Facebook',
      twitch: 'Twitch',
      rtmp: 'Custom RTMP',
    };
    return names[platform] || platform;
  }

  /**
   * Subscribe to destination changes
   */
  subscribe(listener: (destinations: StreamDestination[]) => void) {
    this.listeners.add(listener);
    listener(this.getAllDestinations());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const destinations = this.getAllDestinations();
    this.listeners.forEach(listener => listener(destinations));
  }

  /**
   * Cleanup
   */
  async destroy() {
    await this.stopAllStreams();
    this.destinations.clear();
    this.listeners.clear();
  }
}

// Singleton instance
export const streamingService = new StreamingService();
