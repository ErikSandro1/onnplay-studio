/**
 * CameraControlService
 * 
 * Gerencia controles avançados de câmera (zoom, pan, tilt) para cada fonte de vídeo.
 * Permite ajustes finos de enquadramento sem mover a câmera física.
 */

export interface CameraSettings {
  zoom: number;      // 1.0 (normal) to 3.0 (3x zoom)
  panX: number;      // -100 (left) to 100 (right)
  panY: number;      // -100 (up) to 100 (down)
  rotation: number;  // -45 to 45 degrees
}

export type CameraId = 'cam1' | 'cam2' | 'cam3' | 'screen' | 'media';

export interface CameraControlState {
  [key: string]: CameraSettings;
}

type Observer = (state: CameraControlState) => void;

class CameraControlService {
  private state: CameraControlState = {
    cam1: { zoom: 1.0, panX: 0, panY: 0, rotation: 0 },
    cam2: { zoom: 1.0, panX: 0, panY: 0, rotation: 0 },
    cam3: { zoom: 1.0, panX: 0, panY: 0, rotation: 0 },
    screen: { zoom: 1.0, panX: 0, panY: 0, rotation: 0 },
    media: { zoom: 1.0, panX: 0, panY: 0, rotation: 0 },
  };

  private observers: Observer[] = [];

  /**
   * Subscribe to camera control changes
   */
  subscribe(observer: Observer): () => void {
    this.observers.push(observer);
    return () => {
      this.observers = this.observers.filter((obs) => obs !== observer);
    };
  }

  /**
   * Notify all observers of state change
   */
  private notify(): void {
    this.observers.forEach((observer) => observer(this.state));
  }

  /**
   * Get current state
   */
  getState(): CameraControlState {
    return { ...this.state };
  }

  /**
   * Get settings for specific camera
   */
  getCameraSettings(cameraId: CameraId): CameraSettings {
    return { ...this.state[cameraId] };
  }

  /**
   * Set zoom level for camera (1.0 to 3.0)
   */
  setZoom(cameraId: CameraId, zoom: number): void {
    const clampedZoom = Math.max(1.0, Math.min(3.0, zoom));
    
    this.state[cameraId] = {
      ...this.state[cameraId],
      zoom: clampedZoom,
    };

    console.log(`📹 Camera ${cameraId} zoom set to ${clampedZoom.toFixed(2)}x`);
    this.notify();
  }

  /**
   * Set pan (horizontal movement) for camera (-100 to 100)
   */
  setPanX(cameraId: CameraId, panX: number): void {
    const clampedPanX = Math.max(-100, Math.min(100, panX));
    
    this.state[cameraId] = {
      ...this.state[cameraId],
      panX: clampedPanX,
    };

    console.log(`📹 Camera ${cameraId} panX set to ${clampedPanX}`);
    this.notify();
  }

  /**
   * Set tilt (vertical movement) for camera (-100 to 100)
   */
  setPanY(cameraId: CameraId, panY: number): void {
    const clampedPanY = Math.max(-100, Math.min(100, panY));
    
    this.state[cameraId] = {
      ...this.state[cameraId],
      panY: clampedPanY,
    };

    console.log(`📹 Camera ${cameraId} panY set to ${clampedPanY}`);
    this.notify();
  }

  /**
   * Set rotation for camera (-45 to 45 degrees)
   */
  setRotation(cameraId: CameraId, rotation: number): void {
    const clampedRotation = Math.max(-45, Math.min(45, rotation));
    
    this.state[cameraId] = {
      ...this.state[cameraId],
      rotation: clampedRotation,
    };

    console.log(`📹 Camera ${cameraId} rotation set to ${clampedRotation}°`);
    this.notify();
  }

  /**
   * Set all settings at once
   */
  setCameraSettings(cameraId: CameraId, settings: Partial<CameraSettings>): void {
    this.state[cameraId] = {
      ...this.state[cameraId],
      ...settings,
    };

    console.log(`📹 Camera ${cameraId} settings updated:`, settings);
    this.notify();
  }

  /**
   * Reset camera to default settings
   */
  resetCamera(cameraId: CameraId): void {
    this.state[cameraId] = {
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
    };

    console.log(`📹 Camera ${cameraId} reset to defaults`);
    this.notify();
  }

  /**
   * Reset all cameras to default settings
   */
  resetAll(): void {
    Object.keys(this.state).forEach((cameraId) => {
      this.state[cameraId] = {
        zoom: 1.0,
        panX: 0,
        panY: 0,
        rotation: 0,
      };
    });

    console.log('📹 All cameras reset to defaults');
    this.notify();
  }

  /**
   * Apply CSS transform based on camera settings
   * Returns CSS transform string for video element
   */
  getTransformCSS(cameraId: CameraId): string {
    const settings = this.state[cameraId];
    
    const transforms = [
      `scale(${settings.zoom})`,
      `translateX(${settings.panX}px)`,
      `translateY(${settings.panY}px)`,
      `rotate(${settings.rotation}deg)`,
    ];

    return transforms.join(' ');
  }

  /**
   * Get transform style object for React
   */
  getTransformStyle(cameraId: CameraId): React.CSSProperties {
    return {
      transform: this.getTransformCSS(cameraId),
      transition: 'transform 0.3s ease-out',
    };
  }
}

// Singleton instance
export const cameraControlService = new CameraControlService();
