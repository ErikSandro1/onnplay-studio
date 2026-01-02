/**
 * LocalCameraService
 * 
 * Gerencia a câmera local do usuário independente do Daily.co
 * Permite capturar e exibir a webcam mesmo sem estar em uma sala
 */

type CameraStateListener = (state: CameraState) => void;

interface CameraState {
  isActive: boolean;
  stream: MediaStream | null;
  deviceId: string | null;
  deviceLabel: string;
  error: string | null;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

class LocalCameraService {
  private stream: MediaStream | null = null;
  private deviceId: string | null = null;
  private deviceLabel: string = 'Câmera';
  private isActive: boolean = false;
  private error: string | null = null;
  private listeners: Set<CameraStateListener> = new Set();
  private availableDevices: CameraDevice[] = [];

  constructor() {
    // Enumerar dispositivos disponíveis ao iniciar
    this.enumerateDevices();
  }

  /**
   * Enumera câmeras disponíveis
   */
  async enumerateDevices(): Promise<CameraDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Câmera ${index + 1}`,
        }));
      
      console.log('[LocalCameraService] Available cameras:', this.availableDevices);
      return this.availableDevices;
    } catch (err) {
      console.error('[LocalCameraService] Error enumerating devices:', err);
      return [];
    }
  }

  /**
   * Inicia a câmera local
   */
  async startCamera(deviceId?: string): Promise<MediaStream | null> {
    try {
      // Se já tem stream ativo, parar primeiro
      if (this.stream) {
        this.stopCamera();
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: 1920, height: 1080 }
          : { width: 1920, height: 1080, facingMode: 'user' },
        audio: true,
      };

      console.log('[LocalCameraService] Starting camera with constraints:', constraints);
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isActive = true;
      this.error = null;

      // Obter informações do dispositivo
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        this.deviceId = settings.deviceId || null;
        this.deviceLabel = videoTrack.label || 'Câmera';
      }

      // Atualizar lista de dispositivos (agora terá labels)
      await this.enumerateDevices();

      console.log('[LocalCameraService] Camera started:', this.deviceLabel);
      this.notifyListeners();

      // Disparar evento global
      window.dispatchEvent(new CustomEvent('localcamera:started', {
        detail: { stream: this.stream, deviceLabel: this.deviceLabel }
      }));

      return this.stream;
    } catch (err) {
      console.error('[LocalCameraService] Error starting camera:', err);
      this.error = err instanceof Error ? err.message : 'Erro ao acessar câmera';
      this.isActive = false;
      this.notifyListeners();
      return null;
    }
  }

  /**
   * Para a câmera local
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.isActive = false;
    this.deviceId = null;
    this.deviceLabel = 'Câmera';
    this.error = null;
    
    console.log('[LocalCameraService] Camera stopped');
    this.notifyListeners();

    // Disparar evento global
    window.dispatchEvent(new CustomEvent('localcamera:stopped'));
  }

  /**
   * Alterna a câmera (liga/desliga)
   */
  async toggleCamera(): Promise<boolean> {
    if (this.isActive) {
      this.stopCamera();
      return false;
    } else {
      await this.startCamera();
      return this.isActive;
    }
  }

  /**
   * Troca para outra câmera
   */
  async switchCamera(deviceId: string): Promise<MediaStream | null> {
    return this.startCamera(deviceId);
  }

  /**
   * Retorna o stream atual
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Retorna o estado atual
   */
  getState(): CameraState {
    return {
      isActive: this.isActive,
      stream: this.stream,
      deviceId: this.deviceId,
      deviceLabel: this.deviceLabel,
      error: this.error,
    };
  }

  /**
   * Retorna dispositivos disponíveis
   */
  getAvailableDevices(): CameraDevice[] {
    return this.availableDevices;
  }

  /**
   * Verifica se a câmera está ativa
   */
  isStreamActive(): boolean {
    return this.isActive && this.stream !== null;
  }

  /**
   * Envia a câmera para o PREVIEW
   */
  sendToPreview(): void {
    if (!this.stream) {
      console.warn('[LocalCameraService] No camera stream to send to preview');
      return;
    }

    console.log('[LocalCameraService] Sending camera to preview');
    
    // Disparar evento para DualMonitors
    window.dispatchEvent(new CustomEvent('source:preview', {
      detail: {
        id: 'local-camera',
        type: 'camera',
        name: this.deviceLabel || 'Minha Câmera',
        stream: this.stream,
      }
    }));
  }

  /**
   * Subscreve para mudanças de estado
   */
  subscribe(listener: CameraStateListener): () => void {
    this.listeners.add(listener);
    // Notificar imediatamente com estado atual
    listener(this.getState());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

// Singleton
export const localCameraService = new LocalCameraService();
