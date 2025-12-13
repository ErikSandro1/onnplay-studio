import { TransitionType, TransitionConfig } from '../types/studio';

export type TransitionCallback = (progress: number) => void;

export class TransitionEngine {
  private isTransitioning: boolean = false;
  private animationFrameId: number | null = null;

  /**
   * Execute a transition with callback for progress updates
   * @param config Transition configuration
   * @param onProgress Callback called with progress (0 to 1)
   * @returns Promise that resolves when transition completes
   */
  async executeTransition(
    config: TransitionConfig,
    onProgress: TransitionCallback
  ): Promise<void> {
    if (this.isTransitioning) {
      throw new Error('Transition already in progress');
    }

    this.isTransitioning = true;

    return new Promise((resolve) => {
      const startTime = Date.now();
      const duration = config.duration;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const rawProgress = Math.min(elapsed / duration, 1);
        
        // Apply easing
        const progress = this.applyEasing(rawProgress, config.easing || 'ease-in-out');
        
        // Call progress callback
        onProgress(progress);

        if (rawProgress < 1) {
          this.animationFrameId = requestAnimationFrame(animate);
        } else {
          this.isTransitioning = false;
          this.animationFrameId = null;
          resolve();
        }
      };

      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  /**
   * Cancel ongoing transition
   */
  cancelTransition() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isTransitioning = false;
  }

  /**
   * Check if transition is in progress
   */
  isInProgress(): boolean {
    return this.isTransitioning;
  }

  /**
   * Apply easing function to progress
   */
  private applyEasing(
    t: number,
    easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  ): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:
        return t;
    }
  }

  /**
   * Get CSS styles for transition effect
   */
  getTransitionStyles(
    type: TransitionType,
    progress: number,
    isOutgoing: boolean
  ): React.CSSProperties {
    switch (type) {
      case 'cut':
        // Instant cut - no animation
        return {
          opacity: progress >= 1 ? (isOutgoing ? 0 : 1) : (isOutgoing ? 1 : 0),
        };

      case 'fade':
        // Fade in/out
        return {
          opacity: isOutgoing ? 1 - progress : progress,
          transition: 'none', // We control opacity manually
        };

      case 'wipe':
        // Wipe from left to right
        return {
          clipPath: isOutgoing
            ? `inset(0 ${progress * 100}% 0 0)`
            : `inset(0 0 0 ${(1 - progress) * 100}%)`,
        };

      case 'mix':
        // Cross-fade (both visible during transition)
        return {
          opacity: isOutgoing ? 1 - progress * 0.5 : 0.5 + progress * 0.5,
        };

      default:
        return {};
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.cancelTransition();
  }
}

// Singleton instance
export const transitionEngine = new TransitionEngine();
