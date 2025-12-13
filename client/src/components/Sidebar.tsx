import { Menu, Video, Headphones, Film, BarChart3, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const sections = [
    {
      id: 'video',
      label: 'VIDEO',
      icon: Video,
      submenu: [
        { id: 'preview', label: 'Preview' },
        { id: 'scenes', label: 'Scenes' },
      ],
    },
    {
      id: 'audio',
      label: 'AUDIO',
      icon: Headphones,
      submenu: [
        { id: 'mixer', label: 'Mixer' },
        { id: 'levels', label: 'Levels' },
      ],
    },
    {
      id: 'production',
      label: 'PRODUCTION',
      icon: Film,
      submenu: [
        { id: 'recording', label: 'Recording' },
        { id: 'streaming', label: 'Streaming' },
      ],
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      icon: BarChart3,
      submenu: [
        { id: 'stats', label: 'Statistics' },
        { id: 'performance', label: 'Performance' },
      ],
    },
  ];

  return (
    <div
      className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img src="/logo-silver.png" alt="OnnPlay" className="w-10 h-10 object-contain" />
            <span className="text-white font-bold text-sm">OnnPlay</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <Menu size={20} className="text-gray-300" />
        </button>
      </div>

      {/* Back Button - Show when a submenu item is active - Force rebuild */}
      {expandedMenu && (
        <div className="px-4 py-2">
          <button
            onClick={() => {
              setExpandedMenu(null);
              const parentSection = sections.find(s => 
                s.submenu?.some(item => item.id === activeSection)
              );
              if (parentSection) {
                onSectionChange(parentSection.id);
              }
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ChevronDown size={16} className="rotate-90" />
            <span>Voltar ao Menu</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          const isExpanded = expandedMenu === section.id;

          return (
            <div key={section.id}>
              <button
                onClick={() => {
                  onSectionChange(section.id);
                  if (!isCollapsed) {
                    setExpandedMenu(isExpanded ? null : section.id);
                  }
                }}
                className={`sidebar-item w-full justify-between ${
                  isActive ? 'active' : 'text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  {!isCollapsed && <span className="text-sm font-semibold">{section.label}</span>}
                </div>
                {!isCollapsed && section.submenu && (
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {/* Submenu */}
              {!isCollapsed && isExpanded && section.submenu && (
                <div className="ml-4 border-l border-gray-700">
                  {section.submenu.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={`sidebar-item w-full text-left pl-6 py-2 text-xs ${
                        activeSection === item.id
                          ? 'bg-orange-600 text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        {!isCollapsed && (
          <div className="text-xs text-gray-500 text-center">
            <p className="font-semibold text-gray-400">OnnPlay Studio</p>
            <p className="text-gray-600">v1.0.0</p>
          </div>
        )}
      </div>
    </div>
  );
}
