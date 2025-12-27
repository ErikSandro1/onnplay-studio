import React from 'react';

export type LayoutType = 'single' | 'split' | 'grid' | 'pip';

interface LayoutIconsProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
}

const LayoutIcons: React.FC<LayoutIconsProps> = ({ currentLayout, onLayoutChange }) => {
  const layouts: { id: LayoutType; icon: React.ReactNode; label: string }[] = [
    {
      id: 'single',
      label: 'Single',
      icon: (
        <div className="w-full h-full rounded-sm" style={{ background: 'currentColor' }} />
      ),
    },
    {
      id: 'split',
      label: 'Split',
      icon: (
        <div className="w-full h-full flex gap-0.5">
          <div className="flex-1 rounded-sm" style={{ background: 'currentColor' }} />
          <div className="flex-1 rounded-sm" style={{ background: 'currentColor' }} />
        </div>
      ),
    },
    {
      id: 'grid',
      label: 'Grid 2x2',
      icon: (
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
          <div className="rounded-sm" style={{ background: 'currentColor' }} />
          <div className="rounded-sm" style={{ background: 'currentColor' }} />
          <div className="rounded-sm" style={{ background: 'currentColor' }} />
          <div className="rounded-sm" style={{ background: 'currentColor' }} />
        </div>
      ),
    },
    {
      id: 'pip',
      label: 'PiP',
      icon: (
        <div className="w-full h-full relative">
          <div className="w-full h-full rounded-sm" style={{ background: 'currentColor' }} />
          <div 
            className="absolute bottom-0.5 right-0.5 w-2/5 h-2/5 rounded-sm" 
            style={{ background: '#0A0E1A', border: '1px solid currentColor' }} 
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {layouts.map((layout) => {
        const isActive = currentLayout === layout.id;
        
        return (
          <button
            key={layout.id}
            onClick={() => onLayoutChange(layout.id)}
            className="w-10 h-7 p-1.5 rounded transition-all duration-200"
            style={{
              background: isActive ? '#00D9FF' : '#1E2842',
              color: isActive ? '#0A0E1A' : '#7A8BA3',
              border: isActive ? '2px solid #00D9FF' : '2px solid #2D3A5C',
            }}
            title={layout.label}
          >
            {layout.icon}
          </button>
        );
      })}
    </div>
  );
};

export default LayoutIcons;
