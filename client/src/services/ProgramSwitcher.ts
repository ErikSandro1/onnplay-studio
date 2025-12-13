import { TransitionConfig } from '../types/studio';
import { transitionEngine } from './TransitionEngine';

export type SwitchCallback = (progress: number) => void;

export class ProgramSwitcher {
  private previewSourceId: string | null = null;
  private programSourceId: string | null = null;
  private listeners: Set<() => void> = new Set();

  /**
   * Set the preview source (what will go to program on TAKE)
   */
  setPreview(sourceId: string) {
    this.previewSourceId = sourceId;
    this.notifyListeners();
  }

  /**
   * Get current preview source ID
   */
  getPreview(): string | null {
    return this.previewSourceId;
  }

  /**
   * Set the program source (what's currently on air)
   */
  setProgram(sourceId: string) {
    this.programSourceId = sourceId;
    this.notifyListeners();
  }

  /**
   * Get current program source ID
   */
  getProgram(): string | null {
    return this.programSourceId;
  }

  /**
   * Execute TAKE - transition from preview to program
   * @param config Transition configuration
   * @param onProgress Optional callback for transition progress
   * @returns Promise that resolves when transition completes
   */
  async executeTake(
    config: TransitionConfig,
    onProgress?: SwitchCallback
  ): Promise<void> {
    if (!this.previewSourceId) {
      throw new Error('No preview source selected');
    }

    if (transitionEngine.isInProgress()) {
      throw new Error('Transition already in progress');
    }

    const newProgramSource = this.previewSourceId;
    const oldProgramSource = this.programSourceId;

    // Execute transition
    await transitionEngine.executeTransition(config, (progress) => {
      if (onProgress) {
        onProgress(progress);
      }
    });

    // After transition completes, update program
    this.programSourceId = newProgramSource;
    
    // Optionally set preview to old program (for quick switch back)
    if (oldProgramSource) {
      this.previewSourceId = oldProgramSource;
    }

    this.notifyListeners();
  }

  /**
   * Quick cut - instant switch without transition
   */
  async executeCut(): Promise<void> {
    if (!this.previewSourceId) {
      throw new Error('No preview source selected');
    }

    const newProgramSource = this.previewSourceId;
    const oldProgramSource = this.programSourceId;

    // Instant switch
    this.programSourceId = newProgramSource;
    
    if (oldProgramSource) {
      this.previewSourceId = oldProgramSource;
    }

    this.notifyListeners();
  }

  /**
   * Auto transition - execute TAKE with default settings
   */
  async executeAuto(): Promise<void> {
    const defaultConfig: TransitionConfig = {
      type: 'fade',
      duration: 1000,
      easing: 'ease-in-out',
    };

    return this.executeTake(defaultConfig);
  }

  /**
   * Swap preview and program
   */
  swap() {
    const temp = this.previewSourceId;
    this.previewSourceId = this.programSourceId;
    this.programSourceId = temp;
    this.notifyListeners();
  }

  /**
   * Check if TAKE is available (preview is set and different from program)
   */
  canTake(): boolean {
    return (
      this.previewSourceId !== null &&
      this.previewSourceId !== this.programSourceId
    );
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    listener(); // Call immediately
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Cleanup
   */
  destroy() {
    this.listeners.clear();
    this.previewSourceId = null;
    this.programSourceId = null;
  }
}

// Singleton instance
export const programSwitcher = new ProgramSwitcher();
