/**
 * PersistenceService
 * 
 * Gerencia a persistência de configurações do usuário usando:
 * - IndexedDB: Para arquivos grandes (imagens, vídeos)
 * - localStorage: Para configurações leves (banners, cenas, preferências)
 * 
 * Permite que o usuário feche o navegador e volte com tudo salvo.
 */

// Tipos para persistência
export interface PersistedMediaSource {
  id: string;
  name: string;
  type: 'image' | 'video';
  mimeType: string;
  data: ArrayBuffer; // Dados binários do arquivo
  isActive: boolean;
  createdAt: number;
}

export interface PersistedBanner {
  id: string;
  title: string;
  subtitle?: string;
  theme: string;
  position: string;
  isActive: boolean;
  isInPreview: boolean;
  createdAt: number;
}

export interface PersistedScene {
  id: string;
  name: string;
  layout: string;
  sources: string[]; // IDs das fontes
  banners: string[]; // IDs dos banners
  audioSettings: {
    masterVolume: number;
    musicVolume: number;
    micVolume: number;
  };
  createdAt: number;
}

export interface StudioSettings {
  activeSceneId: string | null;
  previewSceneId: string | null;
  activeMediaSourceId: string | null;
  activeBannerId: string | null;
  lastUpdated: number;
}

const DB_NAME = 'onnplay-studio-db';
const DB_VERSION = 1;
const MEDIA_STORE = 'media-sources';
const SETTINGS_KEY = 'onnplay-studio-settings';
const BANNERS_KEY = 'onnplay-studio-banners';
const SCENES_KEY = 'onnplay-studio-scenes';

class PersistenceService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  /**
   * Inicializa o IndexedDB
   */
  private async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[PersistenceService] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[PersistenceService] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para mídias (imagens e vídeos)
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        console.log('[PersistenceService] IndexedDB schema created');
      };
    });
  }

  /**
   * Garante que o DB está pronto
   */
  private async ensureReady(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  // ==================== MEDIA SOURCES ====================

  /**
   * Salva uma fonte de mídia no IndexedDB
   */
  async saveMediaSource(source: {
    id: string;
    name: string;
    type: 'image' | 'video';
    file: File;
    isActive: boolean;
  }): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;

    const arrayBuffer = await source.file.arrayBuffer();

    const persisted: PersistedMediaSource = {
      id: source.id,
      name: source.name,
      type: source.type,
      mimeType: source.file.type,
      data: arrayBuffer,
      isActive: source.isActive,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEDIA_STORE], 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.put(persisted);

      request.onsuccess = () => {
        console.log('[PersistenceService] Media source saved:', source.name);
        resolve();
      };

      request.onerror = () => {
        console.error('[PersistenceService] Failed to save media source:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove uma fonte de mídia do IndexedDB
   */
  async removeMediaSource(id: string): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEDIA_STORE], 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[PersistenceService] Media source removed:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[PersistenceService] Failed to remove media source:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Carrega todas as fontes de mídia do IndexedDB
   */
  async loadMediaSources(): Promise<PersistedMediaSource[]> {
    await this.ensureReady();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEDIA_STORE], 'readonly');
      const store = transaction.objectStore(MEDIA_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('[PersistenceService] Loaded media sources:', request.result.length);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[PersistenceService] Failed to load media sources:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Converte dados persistidos de volta para File
   */
  arrayBufferToFile(data: ArrayBuffer, name: string, mimeType: string): File {
    const blob = new Blob([data], { type: mimeType });
    return new File([blob], name, { type: mimeType });
  }

  // ==================== BANNERS ====================

  /**
   * Salva banners no localStorage
   */
  saveBanners(banners: PersistedBanner[]): void {
    try {
      localStorage.setItem(BANNERS_KEY, JSON.stringify(banners));
      console.log('[PersistenceService] Banners saved:', banners.length);
    } catch (e) {
      console.error('[PersistenceService] Failed to save banners:', e);
    }
  }

  /**
   * Carrega banners do localStorage
   */
  loadBanners(): PersistedBanner[] {
    try {
      const data = localStorage.getItem(BANNERS_KEY);
      if (data) {
        const banners = JSON.parse(data);
        console.log('[PersistenceService] Loaded banners:', banners.length);
        return banners;
      }
    } catch (e) {
      console.error('[PersistenceService] Failed to load banners:', e);
    }
    return [];
  }

  // ==================== SCENES ====================

  /**
   * Salva cenas no localStorage
   */
  saveScenes(scenes: PersistedScene[]): void {
    try {
      localStorage.setItem(SCENES_KEY, JSON.stringify(scenes));
      console.log('[PersistenceService] Scenes saved:', scenes.length);
    } catch (e) {
      console.error('[PersistenceService] Failed to save scenes:', e);
    }
  }

  /**
   * Carrega cenas do localStorage
   */
  loadScenes(): PersistedScene[] {
    try {
      const data = localStorage.getItem(SCENES_KEY);
      if (data) {
        const scenes = JSON.parse(data);
        console.log('[PersistenceService] Loaded scenes:', scenes.length);
        return scenes;
      }
    } catch (e) {
      console.error('[PersistenceService] Failed to load scenes:', e);
    }
    return [];
  }

  // ==================== SETTINGS ====================

  /**
   * Salva configurações gerais no localStorage
   */
  saveSettings(settings: Partial<StudioSettings>): void {
    try {
      const current = this.loadSettings();
      const updated = {
        ...current,
        ...settings,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      console.log('[PersistenceService] Settings saved');
    } catch (e) {
      console.error('[PersistenceService] Failed to save settings:', e);
    }
  }

  /**
   * Carrega configurações gerais do localStorage
   */
  loadSettings(): StudioSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('[PersistenceService] Failed to load settings:', e);
    }
    return {
      activeSceneId: null,
      previewSceneId: null,
      activeMediaSourceId: null,
      activeBannerId: null,
      lastUpdated: 0,
    };
  }

  // ==================== UTILITIES ====================

  /**
   * Limpa todos os dados persistidos
   */
  async clearAll(): Promise<void> {
    await this.ensureReady();
    
    // Limpar localStorage
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(BANNERS_KEY);
    localStorage.removeItem(SCENES_KEY);

    // Limpar IndexedDB
    if (this.db) {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([MEDIA_STORE], 'readwrite');
        const store = transaction.objectStore(MEDIA_STORE);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('[PersistenceService] All data cleared');
          resolve();
        };

        request.onerror = () => {
          console.error('[PersistenceService] Failed to clear data:', request.error);
          reject(request.error);
        };
      });
    }
  }

  /**
   * Verifica se há dados salvos
   */
  async hasPersistedData(): Promise<boolean> {
    const settings = this.loadSettings();
    const banners = this.loadBanners();
    const scenes = this.loadScenes();
    const mediaSources = await this.loadMediaSources();

    return (
      settings.lastUpdated > 0 ||
      banners.length > 0 ||
      scenes.length > 0 ||
      mediaSources.length > 0
    );
  }

  /**
   * Obtém estatísticas de armazenamento
   */
  async getStorageStats(): Promise<{
    mediaSources: number;
    banners: number;
    scenes: number;
    totalSizeBytes: number;
  }> {
    const mediaSources = await this.loadMediaSources();
    const banners = this.loadBanners();
    const scenes = this.loadScenes();

    let totalSize = 0;
    for (const media of mediaSources) {
      totalSize += media.data.byteLength;
    }

    return {
      mediaSources: mediaSources.length,
      banners: banners.length,
      scenes: scenes.length,
      totalSizeBytes: totalSize,
    };
  }
}

// Singleton instance
export const persistenceService = new PersistenceService();
