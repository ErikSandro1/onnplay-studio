import React, { useState } from 'react';
import { Video, Mic, Settings, BarChart3 } from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const menuSections = [
    {
      id: 'video',
      label: 'VIDEO',
      icon: Video,
      color: '#00D9FF', // Azul neon
      subsections: [
        { id: 'preview', label: 'Preview' },
        { id: 'scenes', label: 'Scenes' },
      ],
    },
    {
      id: 'audio',
      label: 'AUDIO',
      icon: Mic,
      color: '#FF6B00', // Laranja
      subsections: [
        { id: 'mixer', label: 'Mixer' },
        { id: 'levels', label: 'Levels' },
      ],
    },
    {
      id: 'production',
      label: 'PRODUCTION',
      icon: Settings,
      color: '#FF6B00', // Laranja
      subsections: [
        { id: 'recording', label: 'Recording' },
        { id: 'streaming', label: 'Streaming' },
      ],
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      icon: BarChart3,
      color: '#00D9FF', // Azul neon
      subsections: [
        { id: 'stats', label: 'Statistics' },
        { id: 'performance', label: 'Performance' },
      ],
    },
  ];

  const handleSectionClick = (sectionId: string) => {
    const section = menuSections.find((s) => s.id === sectionId);
    
    if (!section) return;

    // Se já está expandido, fecha
    if (expandedMenu === sectionId) {
      setExpandedMenu(null);
      return;
    }

    // Expande o menu
    setExpandedMenu(sectionId);
    onSectionChange(sectionId);
  };

  const handleBackClick = () => {
    setExpandedMenu(null);
  };

  return (
    <div
      className="flex flex-col h-full transition-all duration-300"
      style={{
        width: expandedMenu ? '200px' : '170px',
        background: '#0A0E1A',
        borderRight: '2px solid #1E2842',
      }}
    >
      {/* Back Button - Só aparece quando menu está expandido */}
      {expandedMenu && (
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-[#1E2842]"
          style={{
            color: '#00D9FF',
            borderBottom: '1px solid #1E2842',
          }}
        >
          <span>←</span>
          <span>Voltar ao Menu</span>
        </button>
      )}

      {/* Menu Items */}
      <div className="flex-1 py-4">
        {!expandedMenu ? (
          // Menu Principal
          <div className="space-y-2">
            {menuSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className="flex flex-col items-center justify-center w-full py-6 transition-all duration-200 group"
                  style={{
                    background: isActive ? '#1E2842' : 'transparent',
                    borderLeft: isActive ? `4px solid ${section.color}` : '4px solid transparent',
                  }}
                >
                  <Icon
                    size={32}
                    style={{
                      color: isActive ? section.color : '#7A8BA3',
                      filter: isActive ? `drop-shadow(0 0 8px ${section.color})` : 'none',
                    }}
                    className="mb-2 transition-all duration-200 group-hover:scale-110"
                  />
                  <span
                    className="text-xs font-semibold tracking-wide"
                    style={{
                      color: isActive ? section.color : '#B8C5D6',
                    }}
                  >
                    {section.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          // Submenu
          <div className="px-4 space-y-2">
            {menuSections
              .find((s) => s.id === expandedMenu)
              ?.subsections.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => onSectionChange(sub.id)}
                  className="w-full px-4 py-3 text-left text-sm font-medium rounded-lg transition-all duration-200"
                  style={{
                    background: activeSection === sub.id ? '#1E2842' : 'transparent',
                    color: activeSection === sub.id ? '#00D9FF' : '#B8C5D6',
                  }}
                >
                  {sub.label}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-4 text-center text-xs"
        style={{
          color: '#7A8BA3',
          borderTop: '1px solid #1E2842',
        }}
      >
        <div className="font-semibold">OnnPlay Studio</div>
        <div className="mt-1">v1.0.0</div>
      </div>
    </div>
  );
}
