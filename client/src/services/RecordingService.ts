import { RecordingConfig } from '../types/studio';

export interface RecordingState {
  isRecording: boolean;
  startTime: Date | null;
  duration: number; // seconds
  fileSize: number; // bytes
  fileName: string | null;
}

export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: Date | null = null;
  private durationInterval: NodeJS.Timeout | null = null;
  
  private state: RecordingState = {
    isRecording: false,
    startTime: null,
    duration: 0,
    fileSize: 0,
    fileName: null,
  };

  private listeners: Set<(state: RecordingState) => void> = new Set();

  /**
   * Start recording
   * NOTE: This is a placeholder. Actual implementation requires canvas capture
   */
  async startRecording(config: RecordingConfig): Promise<void> {
    if (this.state.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      // TODO: Implement actual recording logic
      // This will require:
      // 1. Canvas element capturing program output
      // 2. captureStream() to get MediaStream from canvas
      // 3. MediaRecorder to encode stream
      // 4. Handle audio mixing from all participants
      
      // For now, simulate recording start
      this.state = {
        isRecording: true,
        startTime: new Date(),
        duration: 0,
        fileSize: 0,
        fileName: `recording-${Date.now()}.${config.format}`,
      };

      // Start duration counter
      this.durationInterval = setInterval(() => {
        if (this.state.startTime) {
          this.state.duration = Math.floor(
            (Date.now() - this.state.startTime.getTime()) / 1000
          );
          this.notifyListeners();
        }
      }, 1000);

      this.notifyListeners();

      console.log('✅ Recording service ready - waiting for canvas capture implementation');
    } catch (err) {
      throw new Error(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop recording and save file
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.state.isRecording) {
      return null;
    }

    try {
      // Stop duration counter
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }

      // TODO: Implement actual stop logic
      // 1. Stop MediaRecorder
      // 2. Combine recorded chunks
      // 3. Create Blob
      // 4. Trigger download or upload

      // For now, create empty blob
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });

      // Trigger download
      if (this.state.fileName) {
        this.downloadRecording(blob, this.state.fileName);
      }

      // Reset state
      this.recordedChunks = [];
      this.state = {
        isRecording: false,
        startTime: null,
        duration: 0,
        fileSize: 0,
        fileName: null,
      };

      this.notifyListeners();

      return blob;
    } catch (err) {
      throw new Error(`Failed to stop recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause recording
   */
  pauseRecording() {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.pause();
      
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }
    }
  }

  /**
   * Resume recording
   */
  resumeRecording() {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.resume();
      
      // Restart duration counter
      this.durationInterval = setInterval(() => {
        if (this.state.startTime) {
          this.state.duration = Math.floor(
            (Date.now() - this.state.startTime.getTime()) / 1000
          );
          this.notifyListeners();
        }
      }, 1000);
    }
  }

  /**
   * Download recording file
   */
  private downloadRecording(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    return { ...this.state };
  }

  /**
   * Check if recording is in progress
   */
  isRecording(): boolean {
    return this.state.isRecording;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: RecordingState) => void) {
    this.listeners.add(listener);
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Cleanup
   */
  async destroy() {
    if (this.state.isRecording) {
      await this.stopRecording();
    }

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }

    this.recordedChunks = [];
    this.listeners.clear();
  }
}

// Singleton instance
export const recordingService = new RecordingService();
