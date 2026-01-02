/**
 * BackgroundService - Gerencia fundos do stream
 * 
 * Permite selecionar cores sólidas, gradientes, imagens ou padrões
 * como fundo do stream.
 */

import { 
  BackgroundPreset, 
  BackgroundType,
  ALL_BACKGROUNDS,
  getBackgroundById,
  getBackgroundCSS 
} from '../config/BackgroundPresets';

export interface CustomBackground {
  id: string;
  name: string;
  type: BackgroundType;
  value: string;
  file?: File;
  createdAt: number;
}

type BackgroundChangeCallback = (background: BackgroundPreset | CustomBackground | null) => void;

const STORAGE_KEY = 'onnplay-studio-background';
const CUSTOM_BACKGROUNDS_KEY = 'onnplay-studio-custom-backgrounds';

class BackgroundService {
  private currentBackground: BackgroundPreset | CustomBackground | null = null;
  private customBackgrounds: CustomBackground[] = [];
  private callbacks: Set<BackgroundChangeCallback> = new Set();
  private previewBackground: BackgroundPreset | CustomBackground | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Carrega configurações do localStorage
   */
  private loadFromStorage(): void {
    try {
      // Carregar background atual
      const savedBgId = localStorage.getItem(STORAGE_KEY);
      if (savedBgId) {
        const preset = getBackgroundById(savedBgId);
        if (preset) {
          this.currentBackground = preset;
        } else {
          // Pode ser um background customizado
          const customBgs = this.loadCustomBackgrounds();
          const custom = customBgs.find(bg => bg.id === savedBgId);
          if (custom) {
            this.currentBackground = custom;
          }
        }
      }

      // Carregar backgrounds customizados
      this.customBackgrounds = this.loadCustomBackgrounds();

      console.log('[BackgroundService] Loaded from storage:', this.currentBackground?.name);
    } catch (e) {
      console.error('[BackgroundService] Failed to load from storage:', e);
    }
  }

  /**
   * Carrega backgrounds customizados do localStorage
   */
  private loadCustomBackgrounds(): CustomBackground[] {
    try {
      const data = localStorage.getItem(CUSTOM_BACKGROUNDS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('[BackgroundService] Failed to load custom backgrounds:', e);
    }
    return [];
  }

  /**
   * Salva configurações no localStorage
   */
  private saveToStorage(): void {
    try {
      if (this.currentBackground) {
        localStorage.setItem(STORAGE_KEY, this.currentBackground.id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }

      localStorage.setItem(CUSTOM_BACKGROUNDS_KEY, JSON.stringify(this.customBackgrounds));
    } catch (e) {
      console.error('[BackgroundService] Failed to save to storage:', e);
    }
  }

  /**
   * Define o background atual (PROGRAM)
   */
  setBackground(background: BackgroundPreset | CustomBackground | null): void {
    this.currentBackground = background;
    this.saveToStorage();
    this.notify();
    console.log('[BackgroundService] Background set:', background?.name);
  }

  /**
   * Define o background de preview
   */
  setPreviewBackground(background: BackgroundPreset | CustomBackground | null): void {
    this.previewBackground = background;
    this.notify();
  }

  /**
   * Transição do preview para program
   */
  transitionToProgram(): void {
    if (this.previewBackground) {
      this.setBackground(this.previewBackground);
      this.previewBackground = null;
    }
  }

  /**
   * Obtém o background atual (PROGRAM)
   */
  getCurrentBackground(): BackgroundPreset | CustomBackground | null {
    return this.currentBackground;
  }

  /**
   * Obtém o background de preview
   */
  getPreviewBackground(): BackgroundPreset | CustomBackground | null {
    return this.previewBackground;
  }

  /**
   * Obtém todos os presets disponíveis
   */
  getAllPresets(): BackgroundPreset[] {
    return ALL_BACKGROUNDS;
  }

  /**
   * Obtém backgrounds customizados
   */
  getCustomBackgrounds(): CustomBackground[] {
    return this.customBackgrounds;
  }

  /**
   * Adiciona um background customizado (imagem)
   */
  async addCustomImage(file: File, name?: string): Promise<CustomBackground> {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const url = URL.createObjectURL(file);

    const custom: CustomBackground = {
      id,
      name: name || file.name.replace(/\.[^/.]+$/, ''),
      type: 'image',
      value: url,
      file,
      createdAt: Date.now(),
    };

    this.customBackgrounds.push(custom);
    this.saveToStorage();
    this.notify();

    console.log('[BackgroundService] Custom image added:', custom.name);
    return custom;
  }

  /**
   * Adiciona uma cor customizada
   */
  addCustomColor(color: string, name?: string): CustomBackground {
    const id = `custom-color-${Date.now()}`;

    const custom: CustomBackground = {
      id,
      name: name || `Cor ${color}`,
      type: 'solid',
      value: color,
      createdAt: Date.now(),
    };

    this.customBackgrounds.push(custom);
    this.saveToStorage();
    this.notify();

    return custom;
  }

  /**
   * Remove um background customizado
   */
  removeCustomBackground(id: string): void {
    const index = this.customBackgrounds.findIndex(bg => bg.id === id);
    if (index !== -1) {
      const bg = this.customBackgrounds[index];
      
      // Revogar URL se for imagem
      if (bg.type === 'image' && bg.value.startsWith('blob:')) {
        URL.revokeObjectURL(bg.value);
      }

      this.customBackgrounds.splice(index, 1);
      
      // Se era o background atual, limpar
      if (this.currentBackground?.id === id) {
        this.currentBackground = null;
      }

      this.saveToStorage();
      this.notify();
    }
  }

  /**
   * Obtém CSS para um background
   */
  getBackgroundCSS(background?: BackgroundPreset | CustomBackground | null): React.CSSProperties {
    const bg = background || this.currentBackground;
    if (!bg) return { backgroundColor: '#000000' };

    if (bg.type === 'solid') {
      return { backgroundColor: bg.value };
    }

    if (bg.type === 'gradient' || bg.type === 'pattern') {
      return { background: bg.value };
    }

    if (bg.type === 'image') {
      return {
        backgroundImage: `url(${bg.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }

    return { backgroundColor: '#000000' };
  }

  /**
   * Sistema de eventos
   */
  subscribe(callback: BackgroundChangeCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notify(): void {
    this.callbacks.forEach(cb => cb(this.currentBackground));
  }

  /**
   * Limpa todos os backgrounds customizados
   */
  clearCustomBackgrounds(): void {
    // Revogar URLs de imagens
    this.customBackgrounds.forEach(bg => {
      if (bg.type === 'image' && bg.value.startsWith('blob:')) {
        URL.revokeObjectURL(bg.value);
      }
    });

    this.customBackgrounds = [];
    this.saveToStorage();
    this.notify();
  }
}

// Singleton
export const backgroundService = new BackgroundService();
