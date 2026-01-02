/**
 * ScenePanelSidebar - Painel de cenas para o Sidebar
 * 
 * Permite gerenciar cenas com fluxo PREVIEW -> PROGRAM
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Play, Eye, Copy, Trash2, Edit2, Check, LayoutGrid, ArrowRight } from 'lucide-react';
import { sceneService, Scene } from '../services/SceneService';

interface ScenePanelSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScenePanelSidebar({ isOpen, onClose }: ScenePanelSidebarProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');

  useEffect(() => {
    const loadScenes = () => {
      setScenes(sceneService.getAllScenes());
      setActiveSceneId(sceneService.getActiveScene()?.id || null);
      setPreviewSceneId(sceneService.getPreviewScene()?.id || null);
    };

    loadScenes();

    const unsubscribe = sceneService.subscribe(() => {
      loadScenes();
    });

    return unsubscribe;
  }, []);

  const handleActivateScene = (sceneId: string) => {
    sceneService.activateScene(sceneId);
  };

  const handlePreviewScene = (sceneId: string) => {
    sceneService.previewScene(sceneId);
  };

  const handleTransition = () => {
    sceneService.transitionToProgram();
  };

  const handleDuplicateScene = (sceneId: string) => {
    sceneService.duplicateScene(sceneId);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (confirm('Tem certeza que deseja excluir esta cena?')) {
      sceneService.deleteScene(sceneId);
    }
  };

  const handleStartEdit = (scene: Scene) => {
    setEditingScene(scene.id);
    setEditName(scene.name);
  };

  const handleSaveEdit = (sceneId: string) => {
    if (editName.trim()) {
      sceneService.updateScene(sceneId, { name: editName.trim() });
    }
    setEditingScene(null);
    setEditName('');
  };

  const handleCreateScene = () => {
    if (newSceneName.trim()) {
      sceneService.createScene({
        name: newSceneName.trim(),
        layout: 'single',
        sources: [],
        banners: [],
        audioSettings: { masterVolume: 100, musicVolume: 50, micVolume: 100 },
      });
      setNewSceneName('');
      setIsCreating(false);
    }
  };

  const getLayoutName = (layout: string): string => {
    const names: Record<string, string> = {
      'single': 'Tela Cheia',
      'side-by-side': 'Lado a Lado',
      'pip-bottom-right': 'PiP Inferior Direito',
      'pip-bottom-left': 'PiP Inferior Esquerdo',
      'pip-top-right': 'PiP Superior Direito',
      'pip-top-left': 'PiP Superior Esquerdo',
      'grid-2x2': 'Grade 2x2',
      'grid-3x3': 'Grade 3x3',
      'presenter-left': 'Apresentador Esquerda',
      'presenter-right': 'Apresentador Direita',
    };
    return names[layout] || layout;
  };

  if (!isOpen) return null;

  return (
    <div
      className="h-full flex flex-col"
      style={{
        width: '280px',
        background: '#0F1419',
        borderRight: '1px solid #1E2842',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1E2842' }}
      >
        <span className="text-sm font-semibold text-white">CENAS</span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#1E2842] transition-colors"
          style={{ color: '#7A8BA3' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-2 flex gap-2" style={{ borderBottom: '1px solid #1E2842' }}>
        <button
          onClick={() => setIsCreating(true)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{
            background: '#f97316',
            color: '#FFF',
          }}
        >
          <Plus size={14} />
          Nova Cena
        </button>
        {previewSceneId && previewSceneId !== activeSceneId && (
          <button
            onClick={handleTransition}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all animate-pulse"
            style={{
              background: '#22c55e',
              color: '#FFF',
            }}
            title="Enviar Preview para PROGRAM"
          >
            <ArrowRight size={14} />
            GO
          </button>
        )}
      </div>

      {/* Create Scene Form */}
      {isCreating && (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid #1E2842' }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSceneName}
              onChange={(e) => setNewSceneName(e.target.value)}
              placeholder="Nome da cena..."
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#1E2842] text-white border border-[#2D3A5C] focus:border-[#f97316] focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateScene();
                if (e.key === 'Escape') setIsCreating(false);
              }}
            />
            <button
              onClick={handleCreateScene}
              className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Scenes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <LayoutGrid size={32} className="text-gray-600 mb-2" />
            <p className="text-gray-500 text-xs">Nenhuma cena criada</p>
            <p className="text-gray-600 text-xs mt-1">Clique em "Nova Cena" para criar</p>
          </div>
        ) : (
          scenes.map((scene) => {
            const isActive = scene.id === activeSceneId;
            const isPreview = scene.id === previewSceneId;

            return (
              <div
                key={scene.id}
                className={`
                  group rounded-lg overflow-hidden cursor-pointer transition-all
                  ${isActive ? 'ring-2 ring-[#f97316]' : ''}
                  ${isPreview && !isActive ? 'ring-2 ring-[#00D9FF]' : ''}
                `}
                style={{
                  background: '#1E2842',
                  border: `1px solid ${isActive ? '#f97316' : isPreview ? '#00D9FF' : '#2D3A5C'}`,
                }}
                onClick={() => handlePreviewScene(scene.id)}
                onDoubleClick={() => handleActivateScene(scene.id)}
                title="Clique para preview, duplo clique para ativar"
              >
                {/* Scene Preview */}
                <div
                  className="relative h-16 flex items-center justify-center"
                  style={{ background: '#141B2E' }}
                >
                  {/* Layout Icon */}
                  <div className="opacity-30">
                    <LayoutGrid size={32} className="text-gray-500" />
                  </div>

                  {/* Status Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {isActive && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse"
                        style={{ background: '#f97316', color: '#FFF' }}
                      >
                        LIVE
                      </span>
                    )}
                    {isPreview && !isActive && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: '#00D9FF', color: '#000' }}
                      >
                        PREVIEW
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewScene(scene.id);
                      }}
                      className="p-1 rounded bg-[#00D9FF]/80 text-black hover:bg-[#00D9FF]"
                      title="Preview"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivateScene(scene.id);
                      }}
                      className="p-1 rounded bg-[#f97316]/80 text-white hover:bg-[#f97316]"
                      title="Ativar (PROGRAM)"
                    >
                      <Play size={12} />
                    </button>
                  </div>

                  {/* Bottom Actions */}
                  <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(scene);
                      }}
                      className="p-1 rounded bg-white/10 text-white hover:bg-white/20"
                      title="Editar"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateScene(scene.id);
                      }}
                      className="p-1 rounded bg-white/10 text-white hover:bg-white/20"
                      title="Duplicar"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScene(scene.id);
                      }}
                      className="p-1 rounded bg-red-500/50 text-white hover:bg-red-500"
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Scene Info */}
                <div className="px-3 py-2">
                  {editingScene === scene.id ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 rounded text-xs bg-[#141B2E] text-white border border-[#2D3A5C] focus:border-[#f97316] focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') handleSaveEdit(scene.id);
                          if (e.key === 'Escape') setEditingScene(null);
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit(scene.id);
                        }}
                        className="p-1 rounded bg-green-500 text-white"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-white truncate">{scene.name}</p>
                      <p className="text-xs text-gray-500">{getLayoutName(scene.layout)}</p>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2" style={{ borderTop: '1px solid #1E2842' }}>
        <p className="text-xs text-gray-500 text-center">
          Clique para preview • Duplo clique para ativar
        </p>
      </div>
    </div>
  );
}

export default ScenePanelSidebar;
