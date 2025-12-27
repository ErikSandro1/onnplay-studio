import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface Scene {
  id: string;
  name: string;
  type: 'intro' | 'outro' | 'custom';
  thumbnail?: string;
  duration?: number;
}

interface ScenePanelProps {
  scenes: Scene[];
  activeSceneId?: string;
  onSceneSelect: (sceneId: string) => void;
  onAddScene?: () => void;
  onEditScene?: (sceneId: string) => void;
  onDeleteScene?: (sceneId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({
  scenes,
  activeSceneId,
  onSceneSelect,
  onAddScene,
  onEditScene,
  onDeleteScene,
  collapsed = false,
  onToggleCollapse,
  className,
}) => {
  const [hoveredScene, setHoveredScene] = useState<string | null>(null);

  const introScene = scenes.find(s => s.type === 'intro');
  const outroScene = scenes.find(s => s.type === 'outro');
  const customScenes = scenes.filter(s => s.type === 'custom');

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={cn(
          'flex items-center justify-center w-8 h-full bg-card border-r border-border',
          'hover:bg-accent/10 transition-colors',
          className
        )}
        title="Expandir Scenes"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-90">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </button>
    );
  }

  return (
    <div className={cn('w-48 bg-card border-r border-border flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span className="text-sm font-semibold">Scenes</span>
          <span className="px-1.5 py-0.5 bg-accent/20 text-accent text-[10px] rounded">BETA</span>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-accent/10 rounded transition-colors"
            title="Recolher"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Scenes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Intro Scene */}
        <SceneItem
          scene={introScene || { id: 'intro', name: 'Set intro video', type: 'intro' }}
          isActive={activeSceneId === introScene?.id}
          isPlaceholder={!introScene}
          isHovered={hoveredScene === 'intro'}
          onMouseEnter={() => setHoveredScene('intro')}
          onMouseLeave={() => setHoveredScene(null)}
          onClick={() => introScene ? onSceneSelect(introScene.id) : onAddScene?.()}
          onEdit={introScene ? () => onEditScene?.(introScene.id) : undefined}
        />

        {/* Custom Scenes */}
        {customScenes.map((scene) => (
          <SceneItem
            key={scene.id}
            scene={scene}
            isActive={activeSceneId === scene.id}
            isHovered={hoveredScene === scene.id}
            onMouseEnter={() => setHoveredScene(scene.id)}
            onMouseLeave={() => setHoveredScene(null)}
            onClick={() => onSceneSelect(scene.id)}
            onEdit={() => onEditScene?.(scene.id)}
            onDelete={() => onDeleteScene?.(scene.id)}
          />
        ))}

        {/* Add Scene Button */}
        {onAddScene && (
          <button
            onClick={onAddScene}
            className="w-full p-2 border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            <span className="text-xs">Nova Scene</span>
          </button>
        )}

        {/* Outro Scene */}
        <SceneItem
          scene={outroScene || { id: 'outro', name: 'Set outro video', type: 'outro' }}
          isActive={activeSceneId === outroScene?.id}
          isPlaceholder={!outroScene}
          isHovered={hoveredScene === 'outro'}
          onMouseEnter={() => setHoveredScene('outro')}
          onMouseLeave={() => setHoveredScene(null)}
          onClick={() => outroScene ? onSceneSelect(outroScene.id) : onAddScene?.()}
          onEdit={outroScene ? () => onEditScene?.(outroScene.id) : undefined}
        />
      </div>
    </div>
  );
};

// Individual Scene Item
const SceneItem: React.FC<{
  scene: Scene;
  isActive?: boolean;
  isPlaceholder?: boolean;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({
  scene,
  isActive,
  isPlaceholder,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden cursor-pointer transition-all',
        'border-2',
        isActive 
          ? 'border-primary ring-2 ring-primary/30' 
          : 'border-transparent hover:border-accent/50',
        isPlaceholder && 'opacity-60'
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className={cn(
        'aspect-video bg-secondary flex items-center justify-center',
        isPlaceholder && 'border border-dashed border-border'
      )}>
        {scene.thumbnail ? (
          <img src={scene.thumbnail} alt={scene.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-muted-foreground">
            {scene.type === 'intro' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
            {scene.type === 'outro' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            )}
            {scene.type === 'custom' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="m9 8 6 4-6 4Z"/>
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="p-1.5 bg-card">
        <p className="text-[10px] text-center truncate">{scene.name}</p>
      </div>

      {/* Duration Badge */}
      {scene.duration && (
        <span className="absolute top-1 right-1 px-1 py-0.5 bg-black/70 text-white text-[9px] rounded">
          {Math.floor(scene.duration / 60)}:{(scene.duration % 60).toString().padStart(2, '0')}
        </span>
      )}

      {/* Hover Actions */}
      {isHovered && !isPlaceholder && (
        <div className="absolute top-1 left-1 flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1 bg-black/70 rounded hover:bg-black/90 transition-colors"
              title="Editar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1 bg-black/70 rounded hover:bg-red-500/90 transition-colors"
              title="Remover"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
      )}
    </div>
  );
};

export default ScenePanel;
