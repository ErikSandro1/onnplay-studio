/**
 * BannerOverlayService - Gerencia banners e overlays com fluxo PREVIEW -> PROGRAM
 * 
 * Fluxo:
 * 1. Criar banner -> aparece na lista
 * 2. Ativar no PREVIEW -> visualizar antes de enviar
 * 3. Enviar para PROGRAM -> público vê
 * 4. Remover do PROGRAM -> volta para lista
 */

export type BannerType = 'lower-third' | 'banner' | 'ticker' | 'logo';
export type BannerPosition = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type BannerTheme = 'bubble' | 'classic' | 'minimal' | 'block';

export interface Banner {
  id: string;
  type: BannerType;
  name: string;
  theme: BannerTheme;
  position: BannerPosition;
  content: {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
  };
  isInPreview: boolean;  // Está no PREVIEW
  isInProgram: boolean;  // Está no PROGRAM (público vê)
  createdAt: Date;
}

type BannerEventType = 'banner:created' | 'banner:updated' | 'banner:deleted' | 'banner:preview' | 'banner:program' | 'banner:removed';

interface BannerEvent {
  type: BannerEventType;
  banner: Banner;
}

type BannerListener = (event: BannerEvent) => void;

class BannerOverlayService {
  private banners: Map<string, Banner> = new Map();
  private listeners: Set<BannerListener> = new Set();
  private previewBannerId: string | null = null;
  private programBannerId: string | null = null;

  constructor() {
    // Criar alguns banners de exemplo
    this.createDefaultBanners();
  }

  private createDefaultBanners() {
    const defaultBanners: Omit<Banner, 'id' | 'createdAt' | 'isInPreview' | 'isInProgram'>[] = [
      {
        type: 'lower-third',
        name: 'Apresentador',
        theme: 'classic',
        position: 'bottom-left',
        content: {
          title: 'João Silva',
          subtitle: 'CEO & Fundador',
          backgroundColor: '#f97316',
          textColor: '#ffffff',
          accentColor: '#ea580c',
        },
      },
      {
        type: 'banner',
        name: 'Promoção',
        theme: 'bubble',
        position: 'top',
        content: {
          title: '🎉 Desconto de 50% - Use o código: LIVE50',
          backgroundColor: '#16a34a',
          textColor: '#ffffff',
        },
      },
      {
        type: 'ticker',
        name: 'Breaking News',
        theme: 'minimal',
        position: 'bottom',
        content: {
          title: 'ÚLTIMAS NOTÍCIAS: Acompanhe nossa transmissão ao vivo!',
          backgroundColor: '#dc2626',
          textColor: '#ffffff',
        },
      },
      {
        type: 'lower-third',
        name: 'Convidado',
        theme: 'block',
        position: 'bottom-left',
        content: {
          title: 'Maria Santos',
          subtitle: 'Especialista em Marketing Digital',
          backgroundColor: '#2563eb',
          textColor: '#ffffff',
          accentColor: '#1d4ed8',
        },
      },
    ];

    defaultBanners.forEach(banner => {
      const id = `banner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.banners.set(id, {
        ...banner,
        id,
        isInPreview: false,
        isInProgram: false,
        createdAt: new Date(),
      });
    });
  }

  // Criar novo banner
  createBanner(data: Omit<Banner, 'id' | 'createdAt' | 'isInPreview' | 'isInProgram'>): Banner {
    const id = `banner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const banner: Banner = {
      ...data,
      id,
      isInPreview: false,
      isInProgram: false,
      createdAt: new Date(),
    };
    
    this.banners.set(id, banner);
    this.emit({ type: 'banner:created', banner });
    
    return banner;
  }

  // Atualizar banner
  updateBanner(id: string, updates: Partial<Omit<Banner, 'id' | 'createdAt'>>): Banner | null {
    const banner = this.banners.get(id);
    if (!banner) return null;

    const updatedBanner = { ...banner, ...updates };
    this.banners.set(id, updatedBanner);
    this.emit({ type: 'banner:updated', banner: updatedBanner });

    return updatedBanner;
  }

  // Deletar banner
  deleteBanner(id: string): boolean {
    const banner = this.banners.get(id);
    if (!banner) return false;

    // Remover do preview e program se estiver ativo
    if (this.previewBannerId === id) this.previewBannerId = null;
    if (this.programBannerId === id) this.programBannerId = null;

    this.banners.delete(id);
    this.emit({ type: 'banner:deleted', banner });

    return true;
  }

  // Enviar banner para PREVIEW
  sendToPreview(id: string): boolean {
    const banner = this.banners.get(id);
    if (!banner) return false;

    // Remover banner anterior do preview
    if (this.previewBannerId && this.previewBannerId !== id) {
      const prevBanner = this.banners.get(this.previewBannerId);
      if (prevBanner) {
        prevBanner.isInPreview = false;
        this.banners.set(this.previewBannerId, prevBanner);
      }
    }

    // Ativar novo banner no preview
    banner.isInPreview = true;
    this.banners.set(id, banner);
    this.previewBannerId = id;
    
    this.emit({ type: 'banner:preview', banner });
    console.log('[BannerService] Banner sent to PREVIEW:', banner.name);

    return true;
  }

  // Enviar banner para PROGRAM (público vê)
  sendToProgram(id: string): boolean {
    const banner = this.banners.get(id);
    if (!banner) return false;

    // Remover banner anterior do program
    if (this.programBannerId && this.programBannerId !== id) {
      const prevBanner = this.banners.get(this.programBannerId);
      if (prevBanner) {
        prevBanner.isInProgram = false;
        this.banners.set(this.programBannerId, prevBanner);
      }
    }

    // Ativar novo banner no program
    banner.isInProgram = true;
    this.banners.set(id, banner);
    this.programBannerId = id;
    
    this.emit({ type: 'banner:program', banner });
    console.log('[BannerService] Banner sent to PROGRAM:', banner.name);

    return true;
  }

  // Enviar do PREVIEW para PROGRAM (transição)
  transitionToProgram(): boolean {
    if (!this.previewBannerId) return false;
    
    const banner = this.banners.get(this.previewBannerId);
    if (!banner) return false;

    // Remover do preview
    banner.isInPreview = false;
    
    // Enviar para program
    return this.sendToProgram(this.previewBannerId);
  }

  // Remover banner do PREVIEW
  removeFromPreview(): boolean {
    if (!this.previewBannerId) return false;

    const banner = this.banners.get(this.previewBannerId);
    if (banner) {
      banner.isInPreview = false;
      this.banners.set(this.previewBannerId, banner);
      this.emit({ type: 'banner:removed', banner });
    }

    this.previewBannerId = null;
    return true;
  }

  // Remover banner do PROGRAM
  removeFromProgram(): boolean {
    if (!this.programBannerId) return false;

    const banner = this.banners.get(this.programBannerId);
    if (banner) {
      banner.isInProgram = false;
      this.banners.set(this.programBannerId, banner);
      this.emit({ type: 'banner:removed', banner });
    }

    this.programBannerId = null;
    return true;
  }

  // Obter todos os banners
  getAllBanners(): Banner[] {
    return Array.from(this.banners.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Obter banner do PREVIEW
  getPreviewBanner(): Banner | null {
    if (!this.previewBannerId) return null;
    return this.banners.get(this.previewBannerId) || null;
  }

  // Obter banner do PROGRAM
  getProgramBanner(): Banner | null {
    if (!this.programBannerId) return null;
    return this.banners.get(this.programBannerId) || null;
  }

  // Obter banner por ID
  getBanner(id: string): Banner | null {
    return this.banners.get(id) || null;
  }

  // Sistema de eventos
  subscribe(listener: BannerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: BannerEvent) {
    this.listeners.forEach(listener => listener(event));
  }
}

// Singleton
export const bannerOverlayService = new BannerOverlayService();
