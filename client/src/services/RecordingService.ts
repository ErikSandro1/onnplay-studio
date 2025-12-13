export interface RecordingConfig {
  quality: 'low' | 'medium' | 'high';
  format: 'webm' | 'mp4';
}

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
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  
  private state: RecordingState = {
    isRecording: false,
    startTime: null,
    duration: 0,
    fileSize: 0,
    fileName: null,
  };

  private listeners: Set<(state: RecordingState) => void> = new Set();

  constructor() {
    this.initCanvas();
  }

  /**
   * Initialize canvas for capturing
   */
  private initCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Start recording
   */
  async startRecording(config: RecordingConfig): Promise<void> {
    if (this.state.isRecording) {
      throw new Error('Recording already in progress');
    }

    try {
      // Get PROGRAM monitor element
      const programMonitor = document.querySelector('[data-monitor="program"]') as HTMLElement;
      if (!programMonitor) {
        throw new Error('PROGRAM monitor not found');
      }

      // Capture canvas stream
      await this.captureMonitor(programMonitor);

      // Configure MediaRecorder
      const mimeType = config.format === 'webm' ? 'video/webm;codecs=vp8,opus' : 'video/mp4';
      const videoBitsPerSecond = config.quality === 'high' ? 5000000 :
                                  config.quality === 'medium' ? 2500000 : 1000000;

      const options = {
        mimeType,
        videoBitsPerSecond,
      };

      this.mediaRecorder = new MediaRecorder(this.stream!, options);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          
          // Update file size
          this.state.fileSize = this.recordedChunks.reduce((total, chunk) => total + chunk.size, 0);
          this.notifyListeners();
        }
      };

      this.mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
      };

      // Start recording
      this.mediaRecorder.start(1000); // Emit data every 1 second

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

      console.log('✅ Recording started:', this.state.fileName);
    } catch (err) {
      throw new Error(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Capture monitor element to canvas
   */
  private async captureMonitor(element: HTMLElement): Promise<void> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not initialized');
    }

    // Create a function to continuously draw the element to canvas
    const drawFrame = () => {
      if (!this.ctx || !this.canvas) return;

      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw black background
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw element (simplified - in real implementation use html2canvas)
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('RECORDING', this.canvas.width / 2, this.canvas.height / 2);
      this.ctx.font = '24px Arial';
      this.ctx.fillText('OnnPlay Studio', this.canvas.width / 2, this.canvas.height / 2 + 50);

      if (this.state.isRecording) {
        this.animationFrameId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    // Capture stream from canvas
    this.stream = this.canvas.captureStream(30); // 30 FPS
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

      // Stop animation frame
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        return new Promise((resolve) => {
          this.mediaRecorder!.onstop = () => {
            // Create blob from recorded chunks
            const blob = new Blob(this.recordedChunks, {
              type: this.mediaRecorder!.mimeType,
            });

            // Download file
            this.downloadRecording(blob, this.state.fileName || 'recording.webm');

            // Reset state
            this.state = {
              isRecording: false,
              startTime: null,
              duration: 0,
              fileSize: 0,
              fileName: null,
            };

            this.notifyListeners();

            console.log('✅ Recording stopped and saved');
            resolve(blob);
          };

          this.mediaRecorder!.stop();
        });
      }

      // Stop stream tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      return null;
    } catch (err) {
      throw new Error(`Failed to stop recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Download recording file
   */
  private downloadRecording(blob: Blob, fileName: string): void {
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
   * Get current state
   */
  getState(): RecordingState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: RecordingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopRecording();
    this.listeners.clear();
  }
}

// Singleton instance
export const recordingService = new RecordingService();
