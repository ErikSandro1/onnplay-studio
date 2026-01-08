/**
 * VideoPipeline - Pipeline de Vídeo Profissional
 * 
 * OnnPlay Studio - A Melhor Plataforma de Streaming do Mundo
 * Primeiro Estúdio 100% Criado por IA
 * 
 * Este pipeline é responsável APENAS pela renderização de vídeo.
 * NÃO processa áudio - isso é feito pelo AudioPipeline.
 * 
 * Características:
 * - Renderização em 30fps constante
 * - Composição de múltiplas camadas
 * - Transições suaves entre fontes
 * - Zero interferência com áudio
 * - Performance otimizada
 * 
 * Arquitetura:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     VIDEO PIPELINE                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
 * │  │ Image   │  │ Video   │  │ Camera  │  │ Screen  │       │
 * │  │ Layer   │  │ Layer   │  │ Layer   │  │ Layer   │       │
 * │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
 * │       │            │            │            │             │
 * │       └────────────┴─────┬──────┴────────────┘             │
 * │                          │                                 │
 * │                          ▼                                 │
 * │                   ┌─────────────┐                         │
 * │                   │  Compositor │  ← Canvas 2D            │
 * │                   │  (Layers)   │                         │
 * │                   └──────┬──────┘                         │
 * │                          │                                 │
 * │                          ▼                                 │
 * │                   ┌─────────────┐                         │
 * │                   │   Output    │  ← captureStream()      │
 * │                   │   (Track)   │                         │
 * │                   └─────────────┘                         │
 * └─────────────────────────────────────────────────────────────┘
 */

import { mediaSourceService, MediaSource } from './MediaSourceService';

export interface VideoLayer {
  id: string;
  name: string;
  type: 'image' | 'video' | 'camera' | 'screen' | 'overlay' | 'placeholder';
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null;
  zIndex: number;
  opacity: number;
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  fit: 'contain' | 'cover' | 'fill' | 'none';
}

export interface VideoPipelineConfig {
  width: number;
  height: number;
  frameRate: number;
  backgroundColor: string;
}

export interface VideoPipelineStats {
  isActive: boolean;
  width: number;
  height: number;
  frameRate: number;
  actualFps: number;
  layerCount: number;
}

type LayerCallback = (layers: VideoLayer[]) => void;
type StatsCallback = (stats: VideoPipelineStats) => void;

class VideoPipeline {
  // Canvas de composição
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private outputStream: MediaStream | null = null;
  
  // Camadas
  private layers: Map<string, VideoLayer> = new Map();
  private activeLayerId: string | null = null;
  
  // Configuração
  private config: VideoPipelineConfig = {
    width: 1920,
    height: 1080,
    frameRate: 30,
    backgroundColor: '#1a1a2e',
  };
  
  // Estado
  private isActive: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private actualFps: number = 0;
  
  // Callbacks
  private layerCallbacks: Set<LayerCallback> = new Set();
  private statsCallbacks: Set<StatsCallback> = new Set();

  /**
   * Inicializa o pipeline de vídeo
   */
  initialize(config?: Partial<VideoPipelineConfig>): void {
    if (this.isActive) {
      console.log('[VideoPipeline] Already active');
      return;
    }

    console.log('[VideoPipeline] ╔════════════════════════════════════════════╗');
    console.log('[VideoPipeline] ║     INITIALIZING PROFESSIONAL VIDEO       ║');
    console.log('[VideoPipeline] ║         PIPELINE - OnnPlay Studio         ║');
    console.log('[VideoPipeline] ╚════════════════════════════════════════════╝');

    // Aplicar configuração
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Criar canvas de composição
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    
    // Contexto otimizado para performance
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,           // Não precisa de transparência
      desynchronized: true,   // Renderização assíncrona
      willReadFrequently: false, // Não vamos ler pixels
    })!;

    // Criar stream de saída
    this.outputStream = this.canvas.captureStream(this.config.frameRate);

    // Criar camada placeholder padrão
    this.createPlaceholderLayer();

    this.isActive = true;
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = performance.now();

    // Iniciar loop de renderização
    this.startRenderLoop();

    console.log('[VideoPipeline] ✅ Resolution:', this.config.width, 'x', this.config.height);
    console.log('[VideoPipeline] ✅ Frame Rate:', this.config.frameRate, 'fps');
    console.log('[VideoPipeline] ════════════════════════════════════════════');
    console.log('[VideoPipeline] ✅ VIDEO PIPELINE READY');

    this.notifyStats();
  }

  /**
   * Cria camada placeholder (exibida quando não há conteúdo)
   */
  private createPlaceholderLayer(): void {
    const layer: VideoLayer = {
      id: '__placeholder__',
      name: 'Placeholder',
      type: 'placeholder',
      source: null,
      zIndex: -1000,
      opacity: 1,
      visible: true,
      position: { x: 0, y: 0 },
      size: { width: this.config.width, height: this.config.height },
      fit: 'fill',
    };

    this.layers.set(layer.id, layer);
  }

  /**
   * Define a fonte ativa (do MediaSourceService)
   */
  setActiveSource(mediaSource: MediaSource | null): void {
    if (!mediaSource) {
      this.activeLayerId = null;
      console.log('[VideoPipeline] Active source cleared');
      return;
    }

    // Criar ou atualizar camada para esta fonte
    const layerId = `media-${mediaSource.id}`;
    
    let source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null = null;
    let type: VideoLayer['type'] = 'image';

    if (mediaSource.type === 'image') {
      source = mediaSource.element as HTMLImageElement;
      type = 'image';
    } else if (mediaSource.type === 'video') {
      // Usar o canvas do MediaSource (já tem o vídeo renderizado)
      source = mediaSource.canvas;
      type = 'video';
    }

    const layer: VideoLayer = {
      id: layerId,
      name: mediaSource.name,
      type,
      source,
      zIndex: 0,
      opacity: 1,
      visible: true,
      position: { x: 0, y: 0 },
      size: { width: this.config.width, height: this.config.height },
      fit: 'contain',
    };

    this.layers.set(layerId, layer);
    this.activeLayerId = layerId;

    console.log('[VideoPipeline] Active source set:', mediaSource.name);
    this.notifyLayers();
  }

  /**
   * Adiciona uma camada de overlay
   */
  addOverlay(id: string, element: HTMLImageElement | HTMLCanvasElement, options?: Partial<VideoLayer>): VideoLayer {
    const layer: VideoLayer = {
      id: `overlay-${id}`,
      name: options?.name || 'Overlay',
      type: 'overlay',
      source: element,
      zIndex: options?.zIndex || 100,
      opacity: options?.opacity || 1,
      visible: options?.visible !== false,
      position: options?.position || { x: 0, y: 0 },
      size: options?.size || { width: element.width, height: element.height },
      fit: options?.fit || 'none',
    };

    this.layers.set(layer.id, layer);
    this.notifyLayers();

    console.log('[VideoPipeline] Overlay added:', layer.name);
    return layer;
  }

  /**
   * Remove uma camada
   */
  removeLayer(layerId: string): void {
    if (layerId === '__placeholder__') return; // Não remover placeholder

    this.layers.delete(layerId);
    
    if (this.activeLayerId === layerId) {
      this.activeLayerId = null;
    }

    this.notifyLayers();
    console.log('[VideoPipeline] Layer removed:', layerId);
  }

  /**
   * Atualiza propriedades de uma camada
   */
  updateLayer(layerId: string, updates: Partial<VideoLayer>): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    Object.assign(layer, updates);
    this.notifyLayers();
  }

  /**
   * Loop de renderização principal
   */
  private startRenderLoop(): void {
    const targetFrameTime = 1000 / this.config.frameRate;

    const render = (timestamp: number) => {
      if (!this.isActive || !this.ctx || !this.canvas) {
        return;
      }

      // Throttle para FPS alvo
      const elapsed = timestamp - this.lastFrameTime;
      if (elapsed < targetFrameTime * 0.9) { // 90% do intervalo para margem
        this.animationFrameId = requestAnimationFrame(render);
        return;
      }

      this.lastFrameTime = timestamp;
      this.frameCount++;

      // Calcular FPS real a cada segundo
      if (timestamp - this.fpsUpdateTime >= 1000) {
        this.actualFps = this.frameCount;
        this.frameCount = 0;
        this.fpsUpdateTime = timestamp;
        this.notifyStats();
      }

      // Renderizar frame
      this.renderFrame();

      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  /**
   * Renderiza um frame
   */
  private renderFrame(): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const width = this.config.width;
    const height = this.config.height;

    // Limpar canvas com cor de fundo
    ctx.fillStyle = this.config.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Ordenar camadas por zIndex
    const sortedLayers = Array.from(this.layers.values())
      .filter(layer => layer.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Renderizar cada camada
    for (const layer of sortedLayers) {
      this.renderLayer(ctx, layer);
    }
  }

  /**
   * Renderiza uma camada individual
   */
  private renderLayer(ctx: CanvasRenderingContext2D, layer: VideoLayer): void {
    // Placeholder especial
    if (layer.type === 'placeholder' && this.activeLayerId) {
      return; // Não desenhar placeholder se há conteúdo ativo
    }

    if (layer.type === 'placeholder') {
      this.renderPlaceholder(ctx);
      return;
    }

    if (!layer.source) return;

    ctx.save();
    ctx.globalAlpha = layer.opacity;

    try {
      const source = layer.source;
      let sourceWidth: number;
      let sourceHeight: number;

      if (source instanceof HTMLImageElement) {
        sourceWidth = source.naturalWidth || source.width;
        sourceHeight = source.naturalHeight || source.height;
      } else if (source instanceof HTMLVideoElement) {
        sourceWidth = source.videoWidth;
        sourceHeight = source.videoHeight;
      } else if (source instanceof HTMLCanvasElement) {
        sourceWidth = source.width;
        sourceHeight = source.height;
      } else {
        ctx.restore();
        return;
      }

      // Calcular posição e tamanho baseado no fit
      const { x, y, w, h } = this.calculateFit(
        layer.fit,
        sourceWidth,
        sourceHeight,
        layer.size.width,
        layer.size.height,
        layer.position.x,
        layer.position.y
      );

      ctx.drawImage(source, x, y, w, h);

    } catch (error) {
      // Ignorar erros de renderização (vídeo não pronto, etc)
    }

    ctx.restore();
  }

  /**
   * Renderiza o placeholder
   */
  private renderPlaceholder(ctx: CanvasRenderingContext2D): void {
    const width = this.config.width;
    const height = this.config.height;

    // Fundo gradiente
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Logo OnnPlay
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OnnPlay Studio', width / 2, height / 2 - 20);

    // Subtítulo
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText('A Melhor Plataforma de Streaming do Mundo', width / 2, height / 2 + 40);

    // Criado por IA
    ctx.font = '18px Arial, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('100% Criado por IA', width / 2, height / 2 + 80);
  }

  /**
   * Calcula posição e tamanho baseado no modo de fit
   */
  private calculateFit(
    fit: VideoLayer['fit'],
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
    offsetX: number,
    offsetY: number
  ): { x: number; y: number; w: number; h: number } {
    switch (fit) {
      case 'fill':
        return { x: offsetX, y: offsetY, w: targetWidth, h: targetHeight };

      case 'cover': {
        const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
        const w = sourceWidth * scale;
        const h = sourceHeight * scale;
        const x = offsetX + (targetWidth - w) / 2;
        const y = offsetY + (targetHeight - h) / 2;
        return { x, y, w, h };
      }

      case 'contain':
      default: {
        const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
        const w = sourceWidth * scale;
        const h = sourceHeight * scale;
        const x = offsetX + (targetWidth - w) / 2;
        const y = offsetY + (targetHeight - h) / 2;
        return { x, y, w, h };
      }

      case 'none':
        return { x: offsetX, y: offsetY, w: sourceWidth, h: sourceHeight };
    }
  }

  /**
   * Retorna o track de vídeo para o stream de saída
   */
  getOutputTrack(): MediaStreamTrack | null {
    if (!this.outputStream) return null;
    const tracks = this.outputStream.getVideoTracks();
    return tracks.length > 0 ? tracks[0] : null;
  }

  /**
   * Retorna o MediaStream de vídeo
   */
  getOutputStream(): MediaStream | null {
    return this.outputStream;
  }

  /**
   * Retorna o canvas de composição
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /**
   * Retorna todas as camadas
   */
  getLayers(): VideoLayer[] {
    return Array.from(this.layers.values()).filter(l => l.id !== '__placeholder__');
  }

  /**
   * Retorna estatísticas do pipeline
   */
  getStats(): VideoPipelineStats {
    return {
      isActive: this.isActive,
      width: this.config.width,
      height: this.config.height,
      frameRate: this.config.frameRate,
      actualFps: this.actualFps,
      layerCount: this.layers.size - 1, // Excluir placeholder
    };
  }

  /**
   * Atualiza configuração
   */
  setConfig(config: Partial<VideoPipelineConfig>): void {
    const needsResize = config.width !== undefined || config.height !== undefined;
    
    this.config = { ...this.config, ...config };

    if (needsResize && this.canvas) {
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
    }

    this.notifyStats();
  }

  // ==================== CALLBACKS ====================

  subscribeLayers(callback: LayerCallback): () => void {
    this.layerCallbacks.add(callback);
    callback(this.getLayers());
    return () => this.layerCallbacks.delete(callback);
  }

  subscribeStats(callback: StatsCallback): () => void {
    this.statsCallbacks.add(callback);
    callback(this.getStats());
    return () => this.statsCallbacks.delete(callback);
  }

  private notifyLayers(): void {
    const layers = this.getLayers();
    this.layerCallbacks.forEach(cb => cb(layers));
  }

  private notifyStats(): void {
    const stats = this.getStats();
    this.statsCallbacks.forEach(cb => cb(stats));
  }

  // ==================== CLEANUP ====================

  /**
   * Limpa todos os recursos do pipeline
   */
  cleanup(): void {
    console.log('[VideoPipeline] Cleaning up...');

    // Parar loop de renderização
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Parar tracks do stream
    if (this.outputStream) {
      this.outputStream.getTracks().forEach(track => track.stop());
      this.outputStream = null;
    }

    // Limpar camadas
    this.layers.clear();
    this.activeLayerId = null;

    // Limpar canvas
    this.canvas = null;
    this.ctx = null;

    this.isActive = false;

    console.log('[VideoPipeline] ✅ Cleanup complete');
  }

  /**
   * Verifica se o pipeline está ativo
   */
  isReady(): boolean {
    return this.isActive;
  }
}

// Singleton export
export const videoPipeline = new VideoPipeline();
