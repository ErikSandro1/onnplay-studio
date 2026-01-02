/**
 * MediaSourceService
 * 
 * Gerencia fontes de mídia (imagens e vídeos) carregadas pelo usuário.
 * Integra com VideoSourceManager e RTMPStreamService para permitir
 * que mídias sejam exibidas no stream.
 */

export interface MediaSource {
  id: string;
  name: string;
  type: 'image' | 'video';
  file: File;
  url: string;
  stream: MediaStream;
  element: HTMLImageElement | HTMLVideoElement;
  canvas: HTMLCanvasElement;
  isActive: boolean;
  duration?: number; // Para vídeos
  isPlaying?: boolean; // Para vídeos
}

type MediaSourceCallback = (sources: MediaSource[]) => void;
type ActiveSourceCallback = (source: MediaSource | null) => void;

class MediaSourceService {
  private sources: Map<string, MediaSource> = new Map();
  private activeSourceId: string | null = null;
  private callbacks: Set<MediaSourceCallback> = new Set();
  private activeCallbacks: Set<ActiveSourceCallback> = new Set();
  
  // Canvas para captura
  private captureCanvas: HTMLCanvasElement;
  private captureCtx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  
  constructor() {
    // Criar canvas de captura em resolução HD
    this.captureCanvas = document.createElement('canvas');
    this.captureCanvas.width = 1920;
    this.captureCanvas.height = 1080;
    this.captureCtx = this.captureCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    })!;
  }

  /**
   * Adiciona uma imagem como fonte de mídia
   */
  async addImage(file: File): Promise<MediaSource> {
    const id = `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const url = URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Criar canvas individual para esta imagem
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d')!;
        
        // Desenhar imagem centralizada com aspect ratio mantido
        this.drawImageCentered(ctx, img, canvas.width, canvas.height);
        
        // Criar stream do canvas
        const stream = canvas.captureStream(30);
        
        const source: MediaSource = {
          id,
          name: file.name.substring(0, 30),
          type: 'image',
          file,
          url,
          stream,
          element: img,
          canvas,
          isActive: false,
        };
        
        this.sources.set(id, source);
        this.notify();
        
        console.log('[MediaSourceService] Image added:', source.name);
        resolve(source);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Adiciona um vídeo como fonte de mídia
   */
  async addVideo(file: File): Promise<MediaSource> {
    const id = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const url = URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.muted = true; // Inicialmente mudo para autoplay
      video.playsInline = true;
      video.preload = 'auto';
      
      video.onloadedmetadata = () => {
        // Criar canvas individual para este vídeo
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d')!;
        
        // Iniciar loop de renderização
        const renderFrame = () => {
          if (!video.paused && !video.ended) {
            this.drawVideoCentered(ctx, video, canvas.width, canvas.height);
          }
          if (this.sources.has(id)) {
            requestAnimationFrame(renderFrame);
          }
        };
        
        video.onplay = () => {
          renderFrame();
        };
        
        // Criar stream do canvas
        const stream = canvas.captureStream(30);
        
        // Tentar adicionar áudio do vídeo ao stream
        try {
          const audioCtx = new AudioContext();
          const audioSource = audioCtx.createMediaElementSource(video);
          const dest = audioCtx.createMediaStreamDestination();
          audioSource.connect(dest);
          audioSource.connect(audioCtx.destination); // Para ouvir localmente também
          dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
        } catch (e) {
          console.log('[MediaSourceService] Video has no audio or audio capture failed');
        }
        
        const source: MediaSource = {
          id,
          name: file.name.substring(0, 30),
          type: 'video',
          file,
          url,
          stream,
          element: video,
          canvas,
          isActive: false,
          duration: video.duration,
          isPlaying: false,
        };
        
        this.sources.set(id, source);
        this.notify();
        
        console.log('[MediaSourceService] Video added:', source.name, 'Duration:', video.duration);
        resolve(source);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };
    });
  }

  /**
   * Desenha imagem centralizada mantendo aspect ratio
   */
  private drawImageCentered(
    ctx: CanvasRenderingContext2D, 
    img: HTMLImageElement, 
    canvasWidth: number, 
    canvasHeight: number
  ) {
    // Fundo preto
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Calcular escala mantendo aspect ratio
    const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
    const x = (canvasWidth - img.width * scale) / 2;
    const y = (canvasHeight - img.height * scale) / 2;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }

  /**
   * Desenha vídeo centralizado mantendo aspect ratio
   */
  private drawVideoCentered(
    ctx: CanvasRenderingContext2D, 
    video: HTMLVideoElement, 
    canvasWidth: number, 
    canvasHeight: number
  ) {
    // Fundo preto
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Calcular escala mantendo aspect ratio
    const scale = Math.min(canvasWidth / video.videoWidth, canvasHeight / video.videoHeight);
    const x = (canvasWidth - video.videoWidth * scale) / 2;
    const y = (canvasHeight - video.videoHeight * scale) / 2;
    
    ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
  }

  /**
   * Remove uma fonte de mídia
   */
  removeSource(id: string): void {
    const source = this.sources.get(id);
    if (!source) return;
    
    // Parar stream
    source.stream.getTracks().forEach(track => track.stop());
    
    // Parar vídeo se for vídeo
    if (source.type === 'video') {
      (source.element as HTMLVideoElement).pause();
    }
    
    // Liberar URL
    URL.revokeObjectURL(source.url);
    
    // Se era a fonte ativa, desativar
    if (this.activeSourceId === id) {
      this.activeSourceId = null;
      this.notifyActive();
    }
    
    this.sources.delete(id);
    this.notify();
    
    console.log('[MediaSourceService] Source removed:', id);
  }

  /**
   * Define a fonte ativa (a que será enviada para o stream)
   */
  setActiveSource(id: string | null): void {
    // Desativar fonte anterior
    if (this.activeSourceId) {
      const prevSource = this.sources.get(this.activeSourceId);
      if (prevSource) {
        prevSource.isActive = false;
        if (prevSource.type === 'video') {
          (prevSource.element as HTMLVideoElement).pause();
          prevSource.isPlaying = false;
        }
      }
    }
    
    this.activeSourceId = id;
    
    // Ativar nova fonte
    if (id) {
      const source = this.sources.get(id);
      if (source) {
        source.isActive = true;
        if (source.type === 'video') {
          (source.element as HTMLVideoElement).play();
          source.isPlaying = true;
        }
      }
    }
    
    this.notify();
    this.notifyActive();
    
    console.log('[MediaSourceService] Active source changed:', id);
  }

  /**
   * Controles de vídeo
   */
  playVideo(id: string): void {
    const source = this.sources.get(id);
    if (source?.type === 'video') {
      (source.element as HTMLVideoElement).play();
      source.isPlaying = true;
      this.notify();
    }
  }

  pauseVideo(id: string): void {
    const source = this.sources.get(id);
    if (source?.type === 'video') {
      (source.element as HTMLVideoElement).pause();
      source.isPlaying = false;
      this.notify();
    }
  }

  seekVideo(id: string, time: number): void {
    const source = this.sources.get(id);
    if (source?.type === 'video') {
      (source.element as HTMLVideoElement).currentTime = time;
    }
  }

  /**
   * Obtém todas as fontes
   */
  getSources(): MediaSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Obtém uma fonte específica
   */
  getSource(id: string): MediaSource | undefined {
    return this.sources.get(id);
  }

  /**
   * Obtém a fonte ativa
   */
  getActiveSource(): MediaSource | null {
    if (!this.activeSourceId) return null;
    return this.sources.get(this.activeSourceId) || null;
  }

  /**
   * Obtém o stream da fonte ativa (para uso no RTMPStreamService)
   */
  getActiveStream(): MediaStream | null {
    const active = this.getActiveSource();
    return active?.stream || null;
  }

  /**
   * Subscribe para mudanças nas fontes
   */
  subscribe(callback: MediaSourceCallback): () => void {
    this.callbacks.add(callback);
    callback(this.getSources());
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe para mudanças na fonte ativa
   */
  subscribeActive(callback: ActiveSourceCallback): () => void {
    this.activeCallbacks.add(callback);
    callback(this.getActiveSource());
    return () => this.activeCallbacks.delete(callback);
  }

  private notify(): void {
    const sources = this.getSources();
    this.callbacks.forEach(cb => cb(sources));
  }

  private notifyActive(): void {
    const active = this.getActiveSource();
    this.activeCallbacks.forEach(cb => cb(active));
  }

  /**
   * Limpa todas as fontes
   */
  destroy(): void {
    // Remover todas as fontes
    this.sources.forEach((_, id) => this.removeSource(id));
    this.callbacks.clear();
    this.activeCallbacks.clear();
  }
}

// Singleton instance
export const mediaSourceService = new MediaSourceService();
