/**
 * ProjectService
 * 
 * Gerencia projetos salvos do OnnPlay Studio.
 * Um projeto contém todas as configurações da live:
 * - Cenas
 * - Banners
 * - Overlays
 * - Backgrounds
 * - Fontes de mídia
 * - Configurações de layout
 * 
 * Salva no localStorage e permite exportar/importar como JSON.
 */

import { sceneService, Scene } from './SceneService';
import { bannerOverlayService, Banner } from './BannerOverlayService';
import { overlayService, ActiveOverlay, CustomOverlay } from './OverlayService';
import { backgroundService, CustomBackground } from './BackgroundService';
import { BackgroundPreset } from '../config/BackgroundPresets';

export interface Project {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  data: ProjectData;
}

export interface ProjectData {
  scenes: Scene[];
  banners: Banner[];
  overlay: {
    current: ActiveOverlay;
    preview: ActiveOverlay;
    customOverlays: CustomOverlay[];
  };
  background: {
    current: BackgroundPreset | CustomBackground | null;
    preview: BackgroundPreset | CustomBackground | null;
  };
  settings: {
    defaultLayout?: string;
    defaultTransition?: string;
  };
}

type ProjectCallback = (projects: Project[]) => void;

const STORAGE_KEY = 'onnplay_projects';
const CURRENT_VERSION = '1.0.0';

class ProjectService {
  private projects: Map<string, Project> = new Map();
  private callbacks: Set<ProjectCallback> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Carrega projetos do localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const projects: Project[] = JSON.parse(stored);
        projects.forEach(p => this.projects.set(p.id, p));
        console.log('[ProjectService] Loaded', projects.length, 'projects from storage');
      }
    } catch (error) {
      console.error('[ProjectService] Error loading from storage:', error);
    }
  }

  /**
   * Salva projetos no localStorage
   */
  private saveToStorage(): void {
    try {
      const projects = Array.from(this.projects.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      console.log('[ProjectService] Saved', projects.length, 'projects to storage');
    } catch (error) {
      console.error('[ProjectService] Error saving to storage:', error);
    }
  }

  /**
   * Notifica callbacks sobre mudanças
   */
  private notify(): void {
    const projects = this.getProjects();
    this.callbacks.forEach(cb => cb(projects));
  }

  /**
   * Gera um ID único
   */
  private generateId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Captura o estado atual de todos os serviços
   */
  private captureCurrentState(): ProjectData {
    return {
      scenes: sceneService.getScenes(),
      banners: bannerOverlayService.getBanners(),
      overlay: {
        current: overlayService.getCurrentOverlay(),
        preview: overlayService.getPreviewOverlay(),
        customOverlays: overlayService.getCustomOverlays(),
      },
      background: {
        current: backgroundService.getCurrentBackground(),
        preview: backgroundService.getPreviewBackground(),
      },
      settings: {
        defaultLayout: 'single',
        defaultTransition: 'fade',
      },
    };
  }

  /**
   * Restaura o estado de um projeto
   */
  private restoreState(data: ProjectData): void {
    // Restaurar cenas
    if (data.scenes && data.scenes.length > 0) {
      // Limpar cenas existentes e adicionar as do projeto
      const existingScenes = sceneService.getScenes();
      existingScenes.forEach(s => sceneService.deleteScene(s.id));
      
      data.scenes.forEach(scene => {
        sceneService.addScene(scene.name, scene.sources);
      });
    }

    // Restaurar banners
    if (data.banners && data.banners.length > 0) {
      // Limpar banners existentes e adicionar os do projeto
      const existingBanners = bannerOverlayService.getBanners();
      existingBanners.forEach(b => bannerOverlayService.deleteBanner(b.id));
      
      data.banners.forEach(banner => {
        bannerOverlayService.createBanner(
          banner.name,
          banner.subtitle,
          banner.type,
          banner.position,
          banner.theme,
          banner.style
        );
      });
    }

    // Restaurar overlays customizados
    if (data.overlay?.customOverlays) {
      data.overlay.customOverlays.forEach(overlay => {
        overlayService.addCustomOverlay(overlay.name, overlay.imageUrl);
      });
    }

    // Restaurar overlay ativo
    if (data.overlay?.current) {
      overlayService.setOverlay(data.overlay.current);
    }

    // Restaurar background
    if (data.background?.current) {
      backgroundService.setBackground(data.background.current);
    }

    console.log('[ProjectService] State restored from project');
  }

  /**
   * Inscreve um callback para mudanças
   */
  subscribe(callback: ProjectCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Retorna todos os projetos
   */
  getProjects(): Project[] {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Retorna um projeto pelo ID
   */
  getProject(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  /**
   * Salva o estado atual como um novo projeto
   */
  saveProject(name: string, description?: string): Project {
    const id = this.generateId();
    const now = new Date().toISOString();

    const project: Project = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      version: CURRENT_VERSION,
      data: this.captureCurrentState(),
    };

    this.projects.set(id, project);
    this.saveToStorage();
    this.notify();

    console.log('[ProjectService] Project saved:', name);
    return project;
  }

  /**
   * Atualiza um projeto existente com o estado atual
   */
  updateProject(id: string, name?: string, description?: string): Project | null {
    const project = this.projects.get(id);
    if (!project) return null;

    project.name = name || project.name;
    project.description = description !== undefined ? description : project.description;
    project.updatedAt = new Date().toISOString();
    project.data = this.captureCurrentState();

    this.projects.set(id, project);
    this.saveToStorage();
    this.notify();

    console.log('[ProjectService] Project updated:', project.name);
    return project;
  }

  /**
   * Carrega um projeto (restaura o estado)
   */
  loadProject(id: string): boolean {
    const project = this.projects.get(id);
    if (!project) {
      console.error('[ProjectService] Project not found:', id);
      return false;
    }

    this.restoreState(project.data);
    console.log('[ProjectService] Project loaded:', project.name);
    return true;
  }

  /**
   * Deleta um projeto
   */
  deleteProject(id: string): boolean {
    const deleted = this.projects.delete(id);
    if (deleted) {
      this.saveToStorage();
      this.notify();
      console.log('[ProjectService] Project deleted:', id);
    }
    return deleted;
  }

  /**
   * Duplica um projeto
   */
  duplicateProject(id: string): Project | null {
    const original = this.projects.get(id);
    if (!original) return null;

    const newId = this.generateId();
    const now = new Date().toISOString();

    const duplicate: Project = {
      ...original,
      id: newId,
      name: `${original.name} (Cópia)`,
      createdAt: now,
      updatedAt: now,
      data: JSON.parse(JSON.stringify(original.data)), // Deep clone
    };

    this.projects.set(newId, duplicate);
    this.saveToStorage();
    this.notify();

    console.log('[ProjectService] Project duplicated:', duplicate.name);
    return duplicate;
  }

  /**
   * Exporta um projeto como JSON
   */
  exportProject(id: string): string | null {
    const project = this.projects.get(id);
    if (!project) return null;

    return JSON.stringify(project, null, 2);
  }

  /**
   * Exporta um projeto como arquivo para download
   */
  downloadProject(id: string): void {
    const json = this.exportProject(id);
    if (!json) return;

    const project = this.projects.get(id)!;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.onnplay`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('[ProjectService] Project downloaded:', project.name);
  }

  /**
   * Importa um projeto de JSON
   */
  importProject(json: string): Project | null {
    try {
      const project: Project = JSON.parse(json);
      
      // Validar estrutura básica
      if (!project.name || !project.data) {
        throw new Error('Invalid project format');
      }

      // Gerar novo ID para evitar conflitos
      const newId = this.generateId();
      const now = new Date().toISOString();

      const importedProject: Project = {
        ...project,
        id: newId,
        name: `${project.name} (Importado)`,
        createdAt: now,
        updatedAt: now,
        version: CURRENT_VERSION,
      };

      this.projects.set(newId, importedProject);
      this.saveToStorage();
      this.notify();

      console.log('[ProjectService] Project imported:', importedProject.name);
      return importedProject;
    } catch (error) {
      console.error('[ProjectService] Error importing project:', error);
      return null;
    }
  }

  /**
   * Importa um projeto de um arquivo
   */
  async importProjectFromFile(file: File): Promise<Project | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = e.target?.result as string;
        const project = this.importProject(json);
        resolve(project);
      };
      reader.onerror = () => {
        console.error('[ProjectService] Error reading file');
        resolve(null);
      };
      reader.readAsText(file);
    });
  }

  /**
   * Renomeia um projeto
   */
  renameProject(id: string, newName: string): boolean {
    const project = this.projects.get(id);
    if (!project) return false;

    project.name = newName;
    project.updatedAt = new Date().toISOString();
    
    this.projects.set(id, project);
    this.saveToStorage();
    this.notify();

    console.log('[ProjectService] Project renamed:', newName);
    return true;
  }
}

export const projectService = new ProjectService();
