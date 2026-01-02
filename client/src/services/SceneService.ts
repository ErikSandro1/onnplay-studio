/**
 * SceneService - Gerencia cenas (scenes) para o estúdio
 * 
 * Uma cena salva:
 * - Layout atual
 * - Fontes ativas
 * - Banners/Overlays ativos
 * - Configurações de áudio
 * 
 * Permite trocar rapidamente entre configurações pré-definidas durante a transmissão
 */

import { LayoutType } from '../components/LayoutIcons';

export interface SceneSource {
  id: string;
  type: 'camera' | 'screen' | 'image' | 'video';
  name: string;
  position?: { x: number; y: number; width: number; height: number };
  visible: boolean;
}

export interface SceneBanner {
  id: string;
  type: 'lower-third' | 'banner' | 'ticker';
  active: boolean;
}

export interface Scene {
  id: string;
  name: string;
  thumbnail?: string;
  layout: LayoutType;
  sources: SceneSource[];
  banners: SceneBanner[];
  audioSettings?: {
    masterVolume: number;
    musicVolume: number;
    micVolume: number;
  };
  createdAt: Date;
  updatedAt: Date;
  folderId?: string;
}

export interface SceneFolder {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

type SceneEventType = 'scene:created' | 'scene:updated' | 'scene:deleted' | 'scene:activated' | 'folder:created' | 'folder:deleted';

interface SceneEvent {
  type: SceneEventType;
  scene?: Scene;
  folder?: SceneFolder;
}

type SceneListener = (event: SceneEvent) => void;

class SceneService {
  private scenes: Map<string, Scene> = new Map();
  private folders: Map<string, SceneFolder> = new Map();
  private activeSceneId: string | null = null;
  private previewSceneId: string | null = null;
  private listeners: Set<SceneListener> = new Set();

  constructor() {
    this.createDefaultScenes();
  }

  private createDefaultScenes() {
    // Criar cenas padrão
    const defaultScenes: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Abertura',
        layout: 'single',
        sources: [
          { id: 'cam1', type: 'camera', name: 'Câmera Principal', visible: true },
        ],
        banners: [],
        audioSettings: { masterVolume: 100, musicVolume: 50, micVolume: 100 },
      },
      {
        name: 'Apresentação',
        layout: 'pip-bottom-right',
        sources: [
          { id: 'screen1', type: 'screen', name: 'Tela Compartilhada', visible: true },
          { id: 'cam1', type: 'camera', name: 'Câmera Principal', visible: true },
        ],
        banners: [],
        audioSettings: { masterVolume: 100, musicVolume: 20, micVolume: 100 },
      },
      {
        name: 'Entrevista',
        layout: 'side-by-side',
        sources: [
          { id: 'cam1', type: 'camera', name: 'Câmera 1', visible: true },
          { id: 'cam2', type: 'camera', name: 'Câmera 2', visible: true },
        ],
        banners: [],
        audioSettings: { masterVolume: 100, musicVolume: 0, micVolume: 100 },
      },
      {
        name: 'Encerramento',
        layout: 'single',
        sources: [
          { id: 'cam1', type: 'camera', name: 'Câmera Principal', visible: true },
        ],
        banners: [],
        audioSettings: { masterVolume: 100, musicVolume: 70, micVolume: 80 },
      },
    ];

    defaultScenes.forEach(scene => {
      const id = `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.scenes.set(id, {
        ...scene,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Ativar primeira cena
    const firstScene = Array.from(this.scenes.values())[0];
    if (firstScene) {
      this.activeSceneId = firstScene.id;
    }
  }

  // Criar nova cena
  createScene(data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): Scene {
    const id = `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scene: Scene = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.scenes.set(id, scene);
    this.emit({ type: 'scene:created', scene });

    return scene;
  }

  // Atualizar cena
  updateScene(id: string, updates: Partial<Omit<Scene, 'id' | 'createdAt'>>): Scene | null {
    const scene = this.scenes.get(id);
    if (!scene) return null;

    const updatedScene = {
      ...scene,
      ...updates,
      updatedAt: new Date(),
    };

    this.scenes.set(id, updatedScene);
    this.emit({ type: 'scene:updated', scene: updatedScene });

    return updatedScene;
  }

  // Deletar cena
  deleteScene(id: string): boolean {
    const scene = this.scenes.get(id);
    if (!scene) return false;

    if (this.activeSceneId === id) {
      // Ativar outra cena se a atual for deletada
      const otherScene = Array.from(this.scenes.values()).find(s => s.id !== id);
      this.activeSceneId = otherScene?.id || null;
    }

    this.scenes.delete(id);
    this.emit({ type: 'scene:deleted', scene });

    return true;
  }

  // Duplicar cena
  duplicateScene(id: string): Scene | null {
    const scene = this.scenes.get(id);
    if (!scene) return null;

    return this.createScene({
      ...scene,
      name: `${scene.name} (cópia)`,
    });
  }

  // Ativar cena (enviar para PROGRAM)
  activateScene(id: string): boolean {
    const scene = this.scenes.get(id);
    if (!scene) return false;

    this.activeSceneId = id;
    this.emit({ type: 'scene:activated', scene });

    console.log('[SceneService] Scene activated:', scene.name);
    
    // Disparar evento para outros serviços aplicarem a cena
    window.dispatchEvent(new CustomEvent('scene:apply', {
      detail: {
        scene,
        layout: scene.layout,
        sources: scene.sources,
        banners: scene.banners,
        audioSettings: scene.audioSettings,
      }
    }));

    return true;
  }

  // Preview de cena (mostrar no PREVIEW sem enviar para PROGRAM)
  previewScene(id: string): boolean {
    const scene = this.scenes.get(id);
    if (!scene) return false;

    this.previewSceneId = id;

    console.log('[SceneService] Scene preview:', scene.name);
    
    window.dispatchEvent(new CustomEvent('scene:preview', {
      detail: {
        scene,
        layout: scene.layout,
        sources: scene.sources,
        banners: scene.banners,
      }
    }));

    return true;
  }

  // Transição do PREVIEW para PROGRAM
  transitionToProgram(): boolean {
    if (!this.previewSceneId) return false;
    return this.activateScene(this.previewSceneId);
  }

  // Obter todas as cenas
  getAllScenes(): Scene[] {
    return Array.from(this.scenes.values()).sort((a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  // Obter cenas de uma pasta
  getScenesInFolder(folderId: string | null): Scene[] {
    return this.getAllScenes().filter(scene =>
      folderId ? scene.folderId === folderId : !scene.folderId
    );
  }

  // Obter cena por ID
  getScene(id: string): Scene | null {
    return this.scenes.get(id) || null;
  }

  // Obter cena ativa
  getActiveScene(): Scene | null {
    if (!this.activeSceneId) return null;
    return this.scenes.get(this.activeSceneId) || null;
  }

  // Obter cena em preview
  getPreviewScene(): Scene | null {
    if (!this.previewSceneId) return null;
    return this.scenes.get(this.previewSceneId) || null;
  }

  // Salvar estado atual como nova cena
  saveCurrentAsScene(name: string, currentState: {
    layout: LayoutType;
    sources: SceneSource[];
    banners: SceneBanner[];
    audioSettings?: Scene['audioSettings'];
  }): Scene {
    return this.createScene({
      name,
      layout: currentState.layout,
      sources: currentState.sources,
      banners: currentState.banners,
      audioSettings: currentState.audioSettings,
    });
  }

  // Gerenciamento de pastas
  createFolder(name: string, color: string = '#f97316'): SceneFolder {
    const id = `folder-${Date.now()}`;
    const folder: SceneFolder = {
      id,
      name,
      color,
      createdAt: new Date(),
    };

    this.folders.set(id, folder);
    this.emit({ type: 'folder:created', folder });

    return folder;
  }

  deleteFolder(id: string): boolean {
    const folder = this.folders.get(id);
    if (!folder) return false;

    // Mover cenas da pasta para raiz
    this.scenes.forEach(scene => {
      if (scene.folderId === id) {
        scene.folderId = undefined;
      }
    });

    this.folders.delete(id);
    this.emit({ type: 'folder:deleted', folder });

    return true;
  }

  getAllFolders(): SceneFolder[] {
    return Array.from(this.folders.values());
  }

  moveSceneToFolder(sceneId: string, folderId: string | null): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;

    scene.folderId = folderId || undefined;
    scene.updatedAt = new Date();
    this.emit({ type: 'scene:updated', scene });

    return true;
  }

  // Sistema de eventos
  subscribe(listener: SceneListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SceneEvent) {
    this.listeners.forEach(listener => listener(event));
  }
}

// Singleton
export const sceneService = new SceneService();
