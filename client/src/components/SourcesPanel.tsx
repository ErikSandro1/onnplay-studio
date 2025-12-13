import React, { useState } from 'react';
import { Video, Image, Monitor } from 'lucide-react';

interface Source {
  id: string;
  label: string;
  type: 'camera' | 'media' | 'screen';
  resolution: string;
  status: 'active' | 'inactive';
}

interface SourcesPanelProps {
  onSourceSelect?: (sourceId: string) => void;
}

const SourcesPanel: React.FC<SourcesPanelProps> = ({ onSourceSelect }) => {
  const [selectedSource, setSelectedSource] = useState<string>('cam1');

  const sources: Source[] = [
    { id: 'cam1', label: 'CAM 1', type: 'camera', resolution: '1080p', status: 'active' },
    { id: 'cam2', label: 'CAM 2', type: 'camera', resolution: '1080p', status: 'active' },
    { id: 'cam3', label: 'CAM 3', type: 'camera', resolution: '720p', status: 'active' },
    { id: 'media', label: 'MEDIA', type: 'media', resolution: '1080p', status: 'inactive' },
  ];

  const handleSourceClick = (sourceId: string) => {
    setSelectedSource(sourceId);
    onSourceSelect?.(sourceId);
  };

  const getIcon = (type: Source['type']) => {
    switch (type) {
      case 'camera':
        return <Video size={32} />;
      case 'media':
        return <Image size={32} />;
      case 'screen':
        return <Monitor size={32} />;
    }
  };

  return (
    <div
      className="h-full p-4 rounded-xl flex flex-col"
      style={{
        background: '#141B2E',
        border: '2px solid #1E2842',
      }}
    >
      <h3
        className="text-base font-bold tracking-wide mb-4"
        style={{ color: '#B8C5D6' }}
      >
        SOURCES
      </h3>

      <div className="grid grid-cols-2 gap-3 flex-1">
        {sources.map((source) => {
          const isSelected = selectedSource === source.id;
          const Icon = getIcon(source.type);

          return (
            <button
              key={source.id}
              onClick={() => handleSourceClick(source.id)}
              className="relative aspect-video rounded-lg overflow-hidden transition-all duration-200 hover:scale-105"
              style={{
                background: '#0A0E1A',
                border: isSelected ? '3px solid #FF6B00' : '2px solid #1E2842',
                boxShadow: isSelected ? '0 0 15px rgba(255, 107, 0, 0.4)' : 'none',
              }}
            >
              {/* Thumbnail placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div style={{ color: isSelected ? '#FF6B00' : '#7A8BA3' }}>
                    {Icon}
                  </div>
                </div>
              </div>

              {/* Label */}
              <div
                className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs font-bold text-center"
                style={{
                  background: isSelected
                    ? 'rgba(255, 107, 0, 0.9)'
                    : 'rgba(30, 40, 66, 0.9)',
                  color: isSelected ? '#FFFFFF' : '#B8C5D6',
                }}
              >
                {source.label}
              </div>

              {/* Status indicator */}
              <div
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{
                  background: source.status === 'active' ? '#00FF88' : '#FF3366',
                  boxShadow:
                    source.status === 'active'
                      ? '0 0 8px rgba(0, 255, 136, 0.6)'
                      : '0 0 8px rgba(255, 51, 102, 0.6)',
                }}
              />

              {/* Resolution badge */}
              <div
                className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold"
                style={{
                  background: 'rgba(0, 217, 255, 0.2)',
                  color: '#00D9FF',
                  border: '1px solid #00D9FF',
                }}
              >
                {source.resolution}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SourcesPanel;
