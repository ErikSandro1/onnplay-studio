import React from 'react';
import { cn } from '../lib/utils';

interface Layout {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface VisualLayoutSelectorProps {
  currentLayout: string;
  onLayoutChange: (layoutId: string) => void;
  className?: string;
}

// SVG icons for each layout
const LayoutIcons = {
  solo: (
    <svg viewBox="0 0 48 32" className="w-full h-full">
      <rect x="8" y="4" width="32" height="24" rx="2" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  sideBySide: (
    <svg viewBox="0 0 48 32" className="w-full h-full">
      <rect x="2" y="4" width="20" height="24" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="26" y="4" width="20" height="24" rx="2" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  grid2x2: (
    <svg viewBox="0 0 48 32" className="w-full h-full">
      <rect x="2" y="2" width="20" height="12" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="26" y="2" width="20" height="12" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="2" y="18" width="20" height="12" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="26" y="18" width="20" height="12" rx="2" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  pip: (
    <svg viewBox="0 0 48 32" className="w-full h-full">
      <rect x="2" y="2" width="44" height="28" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="30" y="18" width="14" height="10" rx="1" fill="currentColor" opacity="0.9" />
    </svg>
  ),
  presentation: (
    <svg viewBox="0 0 48 32" className="w-full h-full">
      <rect x="2" y="2" width="32" height="28" rx="2" fill="currentColor" opacity="0.4" />
      <rect x="36" y="2" width="10" height="9" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="36" y="13" width="10" height="9" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="36" y="24" width="10" height="6" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  ),
  fullscreen: (
    <svg viewBox="0 0 48 32" className="w-full h-full">
      <rect x="0" y="0" width="48" height="32" rx="2" fill="currentColor" opacity="0.5" />
    </svg>
  ),
  leader: (
    <svg viewBox="0 0 48 32" className="w-full h-full">
      <rect x="2" y="2" width="28" height="28" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="32" y="2" width="14" height="9" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="32" y="13" width="14" height="9" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="32" y="24" width="14" height="6" rx="1" fill="currentColor" opacity="0.4" />
    </svg>
  ),
  custom: (
    <svg viewBox="0 0 48 32" className="w-full h-full">
      <rect x="8" y="8" width="12" height="8" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="24" y="4" width="16" height="12" rx="1" fill="currentColor" opacity="0.8" />
      <rect x="4" y="20" width="18" height="10" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="26" y="20" width="18" height="10" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  ),
};

const layouts: Layout[] = [
  { id: 'solo', name: 'Solo', icon: LayoutIcons.solo, description: 'Uma pessoa centralizada' },
  { id: 'sideBySide', name: 'Lado a Lado', icon: LayoutIcons.sideBySide, description: 'Duas pessoas lado a lado' },
  { id: 'grid2x2', name: 'Grid 2x2', icon: LayoutIcons.grid2x2, description: 'Quatro pessoas em grid' },
  { id: 'pip', name: 'PiP', icon: LayoutIcons.pip, description: 'Picture in Picture' },
  { id: 'presentation', name: 'Apresentação', icon: LayoutIcons.presentation, description: 'Tela + câmeras pequenas' },
  { id: 'leader', name: 'Destaque', icon: LayoutIcons.leader, description: 'Uma pessoa maior + outras menores' },
  { id: 'fullscreen', name: 'Tela Cheia', icon: LayoutIcons.fullscreen, description: 'Apenas tela compartilhada' },
  { id: 'custom', name: 'Custom', icon: LayoutIcons.custom, description: 'Layout personalizado' },
];

export const VisualLayoutSelector: React.FC<VisualLayoutSelectorProps> = ({
  currentLayout,
  onLayoutChange,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-1 p-2 bg-card/50 rounded-lg', className)}>
      {layouts.map((layout) => (
        <button
          key={layout.id}
          onClick={() => onLayoutChange(layout.id)}
          className={cn(
            'relative group flex flex-col items-center justify-center',
            'w-14 h-10 rounded-md transition-all duration-200',
            'hover:bg-accent/20',
            currentLayout === layout.id
              ? 'bg-primary/20 ring-2 ring-primary text-primary'
              : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
          )}
          title={layout.description}
        >
          <div className="w-10 h-6">
            {layout.icon}
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {layout.name}
          </div>
        </button>
      ))}
      
      {/* Edit/Manage button */}
      <button
        className="w-8 h-10 flex items-center justify-center rounded-md bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-all"
        title="Gerenciar layouts"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    </div>
  );
};

export default VisualLayoutSelector;
