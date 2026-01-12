/**
 * LiveDetectionService
 * 
 * Detecta automaticamente lives ativas e conecta ao chat
 * Funciona igual StreamYard - sem necessidade de ações manuais
 */

type LiveDetectedCallback = (videoId: string, platform: 'youtube' | 'twitch') => void;

class LiveDetectionService {
  private static instance: LiveDetectionService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private callbacks: Set<LiveDetectedCallback> = new Set();
  private currentYouTubeVideoId: string | null = null;
  private currentTwitchChannel: string | null = null;
  private isPolling: boolean = false;

  private constructor() {
    console.log('[LiveDetection] Service initialized');
  }

  static getInstance(): LiveDetectionService {
    if (!LiveDetectionService.instance) {
      LiveDetectionService.instance = new LiveDetectionService();
    }
    return LiveDetectionService.instance;
  }

  /**
   * Subscribe to live detection events
   */
  onLiveDetected(callback: LiveDetectedCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Notify all subscribers
   */
  private notifyLiveDetected(videoId: string, platform: 'youtube' | 'twitch'): void {
    this.callbacks.forEach(cb => cb(videoId, platform));
  }

  /**
   * Start polling for active lives
   */
  startPolling(intervalMs: number = 10000): void {
    if (this.isPolling) return;
    
    console.log('[LiveDetection] Starting polling...');
    this.isPolling = true;
    
    // Check immediately
    this.checkForActiveLives();
    
    // Then poll periodically
    this.pollingInterval = setInterval(() => {
      this.checkForActiveLives();
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('[LiveDetection] Polling stopped');
  }

  /**
   * Check for active lives from configured streaming destinations
   */
  private async checkForActiveLives(): Promise<void> {
    try {
      // Get streaming destinations from the server
      const response = await fetch('/api/streaming/destinations');
      if (!response.ok) return;

      const data = await response.json();
      const destinations = data.destinations || [];

      // Check each YouTube destination
      for (const dest of destinations) {
        if (dest.platform === 'youtube' && dest.isActive) {
          await this.checkYouTubeLive(dest);
        }
      }
    } catch (error) {
      console.error('[LiveDetection] Error checking for lives:', error);
    }
  }

  /**
   * Check if a YouTube destination has an active live
   */
  private async checkYouTubeLive(destination: any): Promise<void> {
    try {
      // If we have a video ID from the destination, use it
      if (destination.videoId && destination.videoId !== this.currentYouTubeVideoId) {
        console.log('[LiveDetection] Found YouTube live from destination:', destination.videoId);
        this.currentYouTubeVideoId = destination.videoId;
        this.notifyLiveDetected(destination.videoId, 'youtube');
        return;
      }

      // Otherwise, try to detect from stream key or channel
      if (destination.channelId) {
        const videoId = await this.findActiveLiveByChannel(destination.channelId);
        if (videoId && videoId !== this.currentYouTubeVideoId) {
          console.log('[LiveDetection] Found YouTube live by channel:', videoId);
          this.currentYouTubeVideoId = videoId;
          this.notifyLiveDetected(videoId, 'youtube');
        }
      }
    } catch (error) {
      console.error('[LiveDetection] Error checking YouTube live:', error);
    }
  }

  /**
   * Find active live video by channel ID
   */
  private async findActiveLiveByChannel(channelId: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/youtube/channel/${channelId}/live`);
      if (!response.ok) return null;

      const data = await response.json();
      return data.videoId || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Manually set the current YouTube video ID
   * Called when user starts streaming or pastes a URL
   */
  setYouTubeVideoId(videoId: string): void {
    if (videoId && videoId !== this.currentYouTubeVideoId) {
      console.log('[LiveDetection] YouTube video ID set manually:', videoId);
      this.currentYouTubeVideoId = videoId;
      this.notifyLiveDetected(videoId, 'youtube');
    }
  }

  /**
   * Manually set the current Twitch channel
   */
  setTwitchChannel(channel: string): void {
    if (channel && channel !== this.currentTwitchChannel) {
      console.log('[LiveDetection] Twitch channel set manually:', channel);
      this.currentTwitchChannel = channel;
      this.notifyLiveDetected(channel, 'twitch');
    }
  }

  /**
   * Extract video ID from YouTube URL
   */
  static extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    // If it's already just an ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    return null;
  }

  /**
   * Get current detected lives
   */
  getCurrentLives(): { youtube: string | null; twitch: string | null } {
    return {
      youtube: this.currentYouTubeVideoId,
      twitch: this.currentTwitchChannel,
    };
  }

  /**
   * Clear current live (when stream ends)
   */
  clearYouTubeLive(): void {
    this.currentYouTubeVideoId = null;
  }

  clearTwitchLive(): void {
    this.currentTwitchChannel = null;
  }
}

export const liveDetectionService = LiveDetectionService.getInstance();
export { LiveDetectionService };
