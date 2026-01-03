/**
 * OverlayService - Gerencia overlays/molduras e backdrops/fundos
 * 
 * BACKDROP = Imagem de FUNDO que fica ATRÁS do vídeo
 * MOLDURA = Imagem PNG transparente que fica NA FRENTE do vídeo
 */

import { OverlayPreset, OVERLAY_PRESETS, getOverlayById } from '../config/OverlayPresets';

export interface CustomOverlay {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: number;
  type?: 'frame' | 'backdrop'; // Tipo do overlay
}

export type ActiveOverlay = OverlayPreset | CustomOverlay | null;

type OverlayListener = (overlay: ActiveOverlay) => void;

class OverlayService {
  // Molduras (ficam NA FRENTE do vídeo)
  private currentFrame: ActiveOverlay = null;
  private previewFrame: ActiveOverlay = null;
  
  // Backdrops (ficam ATRÁS do vídeo)
  private currentBackdrop: ActiveOverlay = null;
  private previewBackdrop: ActiveOverlay = null;
  
  // Overlays customizados
  private customOverlays: CustomOverlay[] = [];
  
  // Listeners
  private listeners: Set<OverlayListener> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('onnplay_custom_overlays');
      if (saved) {
        this.customOverlays = JSON.parse(saved);
        console.log('[OverlayService] Loaded', this.customOverlays.length, 'custom overlays');
      }

      // Carregar moldura ativa
      const frameId = localStorage.getItem('onnplay_active_frame');
      if (frameId) {
        const preset = getOverlayById(frameId);
        if (preset) {
          this.currentFrame = preset;
        } else {
          const custom = this.customOverlays.find(o => o.id === frameId);
          if (custom) this.currentFrame = custom;
        }
      }

      // Carregar backdrop ativo
      const backdropId = localStorage.getItem('onnplay_active_backdrop');
      if (backdropId) {
        const preset = getOverlayById(backdropId);
        if (preset) {
          this.currentBackdrop = preset;
        } else {
          const custom = this.customOverlays.find(o => o.id === backdropId);
          if (custom) this.currentBackdrop = custom;
        }
      }
    } catch (e) {
      console.error('[OverlayService] Failed to load from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('onnplay_custom_overlays', JSON.stringify(this.customOverlays));
      
      if (this.currentFrame) {
        localStorage.setItem('onnplay_active_frame', this.currentFrame.id);
      } else {
        localStorage.removeItem('onnplay_active_frame');
      }

      if (this.currentBackdrop) {
        localStorage.setItem('onnplay_active_backdrop', this.currentBackdrop.id);
      } else {
        localStorage.removeItem('onnplay_active_backdrop');
      }
    } catch (e) {
      console.error('[OverlayService] Failed to save to storage:', e);
    }
  }

  // ==================== MOLDURAS (FRENTE) ====================

  setOverlay(overlay: ActiveOverlay): void {
    this.currentFrame = overlay;
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Frame set:', overlay?.name || 'none');
  }

  setPreviewOverlay(overlay: ActiveOverlay): void {
    this.previewFrame = overlay;
    this.notifyListeners();
    console.log('[OverlayService] Preview frame set:', overlay?.name || 'none');
  }

  clearOverlay(): void {
    this.currentFrame = null;
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Frame cleared');
  }

  clearPreviewOverlay(): void {
    this.previewFrame = null;
    this.notifyListeners();
    console.log('[OverlayService] Preview frame cleared');
  }

  getCurrentOverlay(): ActiveOverlay {
    return this.currentFrame;
  }

  getPreviewOverlay(): ActiveOverlay {
    return this.previewFrame;
  }

  // ==================== BACKDROPS (FUNDO) ====================

  setBackdrop(overlay: ActiveOverlay, target: 'preview' | 'program' = 'program'): void {
    if (target === 'preview') {
      this.previewBackdrop = overlay;
    } else {
      this.currentBackdrop = overlay;
      this.saveToStorage();
    }
    this.notifyListeners();
    console.log('[OverlayService] Backdrop set for', target, ':', overlay?.name || 'none');
  }

  clearBackdrop(target: 'preview' | 'program' = 'program'): void {
    if (target === 'preview') {
      this.previewBackdrop = null;
    } else {
      this.currentBackdrop = null;
      this.saveToStorage();
    }
    this.notifyListeners();
    console.log('[OverlayService] Backdrop cleared for', target);
  }

  getBackdrop(target: 'preview' | 'program' = 'program'): ActiveOverlay {
    return target === 'preview' ? this.previewBackdrop : this.currentBackdrop;
  }

  // ==================== TRANSIÇÃO ====================

  applyPreviewToProgram(): void {
    this.currentFrame = this.previewFrame;
    this.currentBackdrop = this.previewBackdrop;
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Applied preview to program');
  }

  // ==================== CUSTOMIZADOS ====================

  addCustomOverlay(name: string, imageUrl: string, type: 'frame' | 'backdrop' = 'frame'): CustomOverlay {
    const overlay: CustomOverlay = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      imageUrl,
      createdAt: Date.now(),
      type,
    };

    this.customOverlays.push(overlay);
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Custom overlay added:', name, 'type:', type);

    return overlay;
  }

  removeCustomOverlay(id: string): boolean {
    const index = this.customOverlays.findIndex(o => o.id === id);
    if (index === -1) return false;

    if (this.currentFrame?.id === id) this.currentFrame = null;
    if (this.previewFrame?.id === id) this.previewFrame = null;
    if (this.currentBackdrop?.id === id) this.currentBackdrop = null;
    if (this.previewBackdrop?.id === id) this.previewBackdrop = null;

    this.customOverlays.splice(index, 1);
    this.saveToStorage();
    this.notifyListeners();
    console.log('[OverlayService] Custom overlay removed:', id);

    return true;
  }

  getCustomOverlays(): CustomOverlay[] {
    return [...this.customOverlays];
  }

  getPresets(): OverlayPreset[] {
    return OVERLAY_PRESETS;
  }

  // ==================== LISTENERS ====================

  subscribe(listener: OverlayListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentFrame));
  }
}

export const overlayService = new OverlayService();
