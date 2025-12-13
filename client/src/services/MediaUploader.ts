export interface UploadedMedia {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  size: number;
  duration?: number; // For videos
  uploadedAt: Date;
}

export type UploadProgressCallback = (progress: number) => void;

export class MediaUploader {
  private mediaLibrary: Map<string, UploadedMedia> = new Map();
  private listeners: Set<(media: UploadedMedia[]) => void> = new Set();

  /**
   * Upload a file (image or video)
   * @param file File to upload
   * @param onProgress Optional progress callback
   * @returns Promise with uploaded media info
   */
  async uploadFile(
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<UploadedMedia> {
    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      throw new Error('Only image and video files are supported');
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size exceeds 500MB limit');
    }

    // Create object URL for the file
    const url = URL.createObjectURL(file);

    // Generate thumbnail for videos
    let thumbnail: string | undefined;
    let duration: number | undefined;

    if (isVideo) {
      const videoInfo = await this.extractVideoInfo(url);
      thumbnail = videoInfo.thumbnail;
      duration = videoInfo.duration;
    }

    // Create media object
    const media: UploadedMedia = {
      id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: isImage ? 'image' : 'video',
      url,
      thumbnail,
      size: file.size,
      duration,
      uploadedAt: new Date(),
    };

    // Add to library
    this.mediaLibrary.set(media.id, media);
    this.notifyListeners();

    // Simulate upload progress
    if (onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        onProgress(i);
      }
    }

    return media;
  }

  /**
   * Extract video info (thumbnail and duration)
   */
  private extractVideoInfo(videoUrl: string): Promise<{
    thumbnail: string;
    duration: number;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';

      video.addEventListener('loadedmetadata', () => {
        const duration = video.duration;

        // Seek to 1 second or 10% of video
        video.currentTime = Math.min(1, duration * 0.1);
      });

      video.addEventListener('seeked', () => {
        // Create canvas and draw video frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

          resolve({
            thumbnail,
            duration: video.duration,
          });
        } else {
          reject(new Error('Failed to create canvas context'));
        }

        // Cleanup
        video.remove();
      });

      video.addEventListener('error', () => {
        reject(new Error('Failed to load video'));
        video.remove();
      });
    });
  }

  /**
   * Get all uploaded media
   */
  getAllMedia(): UploadedMedia[] {
    return Array.from(this.mediaLibrary.values());
  }

  /**
   * Get media by ID
   */
  getMedia(id: string): UploadedMedia | undefined {
    return this.mediaLibrary.get(id);
  }

  /**
   * Delete media
   */
  deleteMedia(id: string) {
    const media = this.mediaLibrary.get(id);
    if (media) {
      // Revoke object URL to free memory
      URL.revokeObjectURL(media.url);
      if (media.thumbnail) {
        URL.revokeObjectURL(media.thumbnail);
      }

      this.mediaLibrary.delete(id);
      this.notifyListeners();
    }
  }

  /**
   * Clear all media
   */
  clearAll() {
    // Revoke all object URLs
    this.mediaLibrary.forEach(media => {
      URL.revokeObjectURL(media.url);
      if (media.thumbnail) {
        URL.revokeObjectURL(media.thumbnail);
      }
    });

    this.mediaLibrary.clear();
    this.notifyListeners();
  }

  /**
   * Subscribe to media library changes
   */
  subscribe(listener: (media: UploadedMedia[]) => void) {
    this.listeners.add(listener);
    listener(this.getAllMedia());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const media = this.getAllMedia();
    this.listeners.forEach(listener => listener(media));
  }

  /**
   * Cleanup
   */
  destroy() {
    this.clearAll();
    this.listeners.clear();
  }
}

// Singleton instance
export const mediaUploader = new MediaUploader();
