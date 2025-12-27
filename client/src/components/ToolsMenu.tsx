import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical,
  Shuffle, 
  Palette, 
  Users, 
  Mic, 
  Video, 
  Cast, 
  Circle, 
  BarChart3, 
  MessageSquare, 
  Settings 
} from 'lucide-react';

export type ToolId = 
  | 'transitions' 
  | 'brand' 
  | 'people' 
  | 'audio' 
  | 'camera' 
  | 'destinations' 
  | 'recording' 
  | 'analytics' 
  | 'chat' 
  | 'settings';

interface Tool {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
}

interface ToolsMenuProps {
  onSelectTool: (toolId: ToolId) => void;
}

const tools: Tool[] = [
  { id: 'transitions', label: 'Transitions', icon: <Shuffle size={18} /> },
  { id: 'brand', label: 'Brand', icon: <Palette size={18} /> },
  { id: 'people', label: 'People', icon: <Users size={18} /> },
  { id: 'audio', label: 'Audio', icon: <Mic size={18} /> },
  { id: 'camera', label: 'Camera', icon: <Video size={18} /> },
  { id: 'destinations', label: 'Destinations', icon: <Cast size={18} /> },
  { id: 'recording', label: 'Recording', icon: <Circle size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

const ToolsMenu: React.FC<ToolsMenuProps> = ({ onSelectTool }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectTool = (toolId: ToolId) => {
    onSelectTool(toolId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
        style={{ color: isOpen ? '#00D9FF' : '#7A8BA3' }}
        title="Tools"
      >
        <MoreVertical size={24} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 top-12 w-64 rounded-xl shadow-2xl overflow-hidden z-50"
          style={{
            background: '#0F1419',
            border: '1px solid #1E2842'
          }}
        >
          <div 
            className="px-4 py-3 border-b"
            style={{ borderColor: '#1E2842' }}
          >
            <h3 
              className="text-sm font-bold"
              style={{ color: '#FFFFFF' }}
            >
              Tools & Features
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleSelectTool(tool.id)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-[#1E2842]"
                style={{ color: '#7A8BA3' }}
              >
                <div className="flex-shrink-0">
                  {tool.icon}
                </div>
                
                <span className="flex-1 text-left font-medium text-sm">
                  {tool.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsMenu;
