import React, { useState } from 'react';
import { Video, FileText, LayoutGrid, Settings, X, Plus } from 'lucide-react';

interface SidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

type PanelType = 'sources' | 'scenes' | 'layouts' | 'settings' | null;

interface VideoSource {
  id: string;
  name: string;
  type: 'camera' | 'screen' | 'media';
  stream?: MediaStream;
  active: boolean;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [isAddingSource, setIsAddingSource] = useState(false);

  const togglePanel = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const addCameraSource = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });

      const newSource: VideoSource = {
        id: `camera-${Date.now()}`,
        name: `Câmera ${sources.filter(s => s.type === 'camera').length + 1}`,
        type: 'camera',
        stream,
        active: true,
      };

      setSources(prev => [...prev, newSource]);
      setIsAddingSource(false);
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const addScreenSource = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });

      const newSource: VideoSource = {
        id: `screen-${Date.now()}`,
        name: `Tela ${sources.filter(s => s.type === 'screen').length + 1}`,
        type: 'screen',
        stream,
        active: true,
      };

      setSources(prev => [...prev, newSource]);
      setIsAddingSource(false);

      stream.getVideoTracks()[0].onended = () => {
        setSources(prev => prev.filter(s => s.id !== newSource.id));
      };
    } catch (error) {
      console.error('Erro ao compartilhar tela:', error);
    }
  };

  const removeSource = (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (source?.stream) {
      source.stream.getTracks().forEach(track => track.stop());
    }
    setSources(prev => prev.filter(s => s.id !== sourceId));
  };

  const sidebarItems = [
    { id: 'sources' as PanelType, icon: Video, label: 'Fontes' },
    { id: 'scenes' as PanelType, icon: FileText, label: 'Scenes' },
    { id: 'layouts' as PanelType, icon: LayoutGrid, label: 'Layouts' },
  ];

  return (
    <div className="flex h-full">
      {/* Icon Sidebar - Narrow strip with icons only */}
      <div
        className="flex flex-col h-full py-2"
        style={{
          width: '48px',
          background: '#0A0E1A',
          borderRight: '1px solid #1E2842',
        }}
      >
        {/* Menu Items */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;

            return (
              <button
                key={item.id}
                onClick={() => togglePanel(item.id)}
                className="relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200"
                style={{
                  background: isActive ? '#1E2842' : 'transparent',
                  color: isActive ? '#00D9FF' : '#7A8BA3',
                }}
                title={item.label}
              >
                <Icon size={20} />
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                    style={{ background: '#00D9FF' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Settings at bottom */}
        <div className="flex flex-col items-center pb-2">
          <button
            onClick={() => togglePanel('settings')}
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
            style={{ 
              color: activePanel === 'settings' ? '#00D9FF' : '#7A8BA3',
              background: activePanel === 'settings' ? '#1E2842' : 'transparent',
            }}
            title="Configurações"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Expandable Panel - FONTES */}
      {activePanel === 'sources' && (
        <div
          className="h-full flex flex-col"
          style={{
            width: '280px',
            background: '#0F1419',
            borderRight: '1px solid #1E2842',
          }}
        >
          {/* Panel Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #1E2842' }}
          >
            <span className="text-sm font-semibold text-white">FONTES</span>
            <button
              onClick={() => setActivePanel(null)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#1E2842] transition-colors"
              style={{ color: '#7A8BA3' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* FONTES DE VÍDEO Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  FONTES DE VÍDEO
                </span>
                <button
                  onClick={() => setIsAddingSource(!isAddingSource)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: '#FF6B00',
                  }}
                >
                  <Plus size={16} className="text-white" />
                </button>
              </div>

              {/* Add Source Menu */}
              {isAddingSource && (
                <div 
                  className="mb-3 p-3 rounded-lg"
                  style={{ background: '#1E2842', border: '1px solid #2D3A5C' }}
                >
                  <p className="text-xs text-gray-400 mb-2">Adicionar fonte:</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={addCameraSource}
                      className="flex items-center gap-2 px-3 py-2 rounded text-sm text-white hover:bg-[#2D3A5C] transition-colors"
                    >
                      <Video size={16} />
                      Câmera / Webcam
                    </button>
                    <button
                      onClick={addScreenSource}
                      className="flex items-center gap-2 px-3 py-2 rounded text-sm text-white hover:bg-[#2D3A5C] transition-colors"
                    >
                      <Video size={16} />
                      Compartilhar Tela
                    </button>
                  </div>
                </div>
              )}

              {/* Sources List */}
              {sources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Video size={48} className="text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm">Nenhuma fonte adicionada</p>
                  <p className="text-gray-600 text-xs mt-1">Clique em + para adicionar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <SourceItem
                      key={source.id}
                      source={source}
                      onRemove={() => removeSource(source.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer hint */}
          <div 
            className="px-4 py-3 text-center"
            style={{ borderTop: '1px solid #1E2842' }}
          >
            <p className="text-xs text-gray-500">
              Clique duplo para enviar ao PROGRAM
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Source Item Component
interface SourceItemProps {
  source: VideoSource;
  onRemove: () => void;
}

const SourceItem: React.FC<SourceItemProps> = ({ source, onRemove }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (videoRef.current && source.stream) {
      videoRef.current.srcObject = source.stream;
    }
  }, [source.stream]);

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer transition-all group"
      style={{ border: '2px solid #1E2842' }}
    >
      <div className="aspect-video bg-black relative">
        {source.stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video size={24} className="text-gray-600" />
          </div>
        )}

        <div
          className="absolute top-2 left-2 w-2 h-2 rounded-full"
          style={{
            background: source.active ? '#00FF88' : '#FF3366',
            boxShadow: source.active
              ? '0 0 8px rgba(0, 255, 136, 0.6)'
              : '0 0 8px rgba(255, 51, 102, 0.6)',
          }}
        />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} className="text-white" />
        </button>
      </div>

      <div
        className="px-2 py-1.5 text-xs font-medium"
        style={{ background: '#1E2842', color: '#FFFFFF' }}
      >
        {source.name}
      </div>
    </div>
  );
};
