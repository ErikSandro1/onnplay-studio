/**
 * OverlayService - Gerencia overlays/molduras decorativas
 * 
 * Overlays são imagens PNG transparentes que ficam por cima do vídeo,
 * criando molduras temáticas como no StreamYard.
 */

import { OverlayPreset, OVERLAY_PRESETS, getOverlayById } from '../config/OverlayPresets';

export interface CustomOverlay {
  id: string;
  name: string;
  imageUrl: string;  // Data URL ou URL da imagem
  createdAt: number;
}

export type ActiveOverlay = OverlayPreset | CustomOverlay | null;

type OverlayListener = (overlay: ActiveOverlay) => void;

class OverlayService {
  private currentOverlay: ActiveOverlay = null;
  private previewOverlay: ActiveOverlay = null;
  private customOverlays: CustomOverlay[] = [];
  private listeners: Set<OverlayListener> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Carrega overlays customizados do localStorage
   */
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('onnplay_custom_overlays');
      if (saved) {
        this.customOverlays = JSON.parse(saved);
        console.log('[OverlayService] Loaded', this.customOverlays.length, 'custom overlays');
      }

      // Carregar overlay ativo
      const activeId = localStorage.getItem('onnplay_active_overlay');
      if (activeId) {
        // Verificar se é um preset
        const preset = getOverlayById(activeId);
        if (preset) {
          this.currentOverlay = preset;
        } else {
          // Verificar se é customizado
          const custom = this.customOverlays.find(o => o.id === activeId);
          if (custom) {
            this.currentOverlay = custom;
          }
        }
      }
    } catch (e) {
      console.error('[OverlayService] Failed to load from storage:', e);
    }
  }

  /**
   * Salva overlays customizados no localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('onnplay_custom_overlays', JSON.stringify(this.customOverlays));
      
      // Salvar overlay ativo
      if (this.currentOverlay) {
        localStorage.setItem('onnplay_active_overlay', this.currentOverlay.id);
      } else {
        localStorage.removeItem('onnplay_active_overlay');
      }
    } catch (e) {
      console.error('[OverlayService] Failed to save to storage:', e);
    }
  }

  /**
   * Define o overlay ativo no PROGRAM
   */
  setOverlay(overlay: ActiveOverlay): void {
    this.currentOverlay = overlay;
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Overlay set:', overlay?.name || 'none');
  }

  /**
   * Define o overlay de preview
   */
  setPreviewOverlay(overlay: ActiveOverlay): void {
    this.previewOverlay = overlay;
    this.notifyListeners();
    console.log('[OverlayService] Preview overlay set:', overlay?.name || 'none');
  }

  /**
   * Aplica o overlay do preview no program
   */
  applyPreviewToProgram(): void {
    this.currentOverlay = this.previewOverlay;
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Applied preview to program');
  }

  /**
   * Remove o overlay ativo
   */
  clearOverlay(): void {
    this.currentOverlay = null;
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Overlay cleared');
  }

  /**
   * Remove o overlay de preview
   */
  clearPreviewOverlay(): void {
    this.previewOverlay = null;
    this.notifyListeners();
    console.log('[OverlayService] Preview overlay cleared');
  }

  /**
   * Obtém o overlay ativo no PROGRAM
   */
  getCurrentOverlay(): ActiveOverlay {
    return this.currentOverlay;
  }

  /**
   * Obtém o overlay de preview
   */
  getPreviewOverlay(): ActiveOverlay {
    return this.previewOverlay;
  }

  /**
   * Adiciona um overlay customizado
   */
  addCustomOverlay(name: string, imageUrl: string): CustomOverlay {
    const overlay: CustomOverlay = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      imageUrl,
      createdAt: Date.now(),
    };

    this.customOverlays.push(overlay);
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Custom overlay added:', name);

    return overlay;
  }

  /**
   * Remove um overlay customizado
   */
  removeCustomOverlay(id: string): boolean {
    const index = this.customOverlays.findIndex(o => o.id === id);
    if (index === -1) return false;

    // Se o overlay removido estava ativo, limpar
    if (this.currentOverlay?.id === id) {
      this.currentOverlay = null;
    }
    if (this.previewOverlay?.id === id) {
      this.previewOverlay = null;
    }

    this.customOverlays.splice(index, 1);
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Custom overlay removed:', id);

    return true;
  }

  /**
   * Obtém todos os overlays customizados
   */
  getCustomOverlays(): CustomOverlay[] {
    return [...this.customOverlays];
  }

  /**
   * Obtém todos os presets de overlays
   */
  getPresets(): OverlayPreset[] {
    return OVERLAY_PRESETS;
  }

  /**
   * Inscreve um listener para mudanças
   */
  subscribe(listener: OverlayListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentOverlay));
  }
}

// Singleton
export const overlayService = new OverlayService();
