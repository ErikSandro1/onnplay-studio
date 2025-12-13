import React from 'react';
import { 
  Radio, 
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

export type TabId = 
  | 'broadcast' 
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

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isPro?: boolean;
}

interface RightSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'broadcast', label: 'Broadcast', icon: <Radio size={20} /> },
  { id: 'transitions', label: 'Transitions', icon: <Shuffle size={20} />, isPro: true },
  { id: 'brand', label: 'Brand', icon: <Palette size={20} /> },
  { id: 'people', label: 'People', icon: <Users size={20} />, isPro: true },
  { id: 'audio', label: 'Audio', icon: <Mic size={20} />, isPro: true },
  { id: 'camera', label: 'Camera', icon: <Video size={20} />, isPro: true },
  { id: 'destinations', label: 'Destinations', icon: <Cast size={20} /> },
  { id: 'recording', label: 'Recording', icon: <Circle size={20} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} />, isPro: true },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

const RightSidebar: React.FC<RightSidebarProps> = ({ activeTab, onTabChange, children }) => {
  return (
    <div 
      className="flex flex-col h-full"
      style={{ 
        width: '400px',
        background: '#0F1419',
        borderLeft: '1px solid #1E2842'
      }}
    >
      {/* Tabs List */}
      <div 
        className="flex flex-col gap-1 p-2"
        style={{ 
          borderBottom: '1px solid #1E2842',
          background: '#0A0E1A'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group"
            style={{
              background: activeTab === tab.id ? '#1E2842' : 'transparent',
              color: activeTab === tab.id ? '#00D9FF' : '#7A8BA3',
              border: activeTab === tab.id ? '1px solid #00D9FF' : '1px solid transparent',
            }}
          >
            <div className="flex-shrink-0">
              {tab.icon}
            </div>
            
            <span className="flex-1 text-left font-medium text-sm">
              {tab.label}
            </span>
            
            {tab.isPro && (
              <span 
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{
                  background: '#FF6B00',
                  color: '#FFFFFF'
                }}
              >
                PRO
              </span>
            )}
            
            {tab.badge && (
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{
                  background: '#FF6B00',
                  color: '#FFFFFF'
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
};

export default RightSidebar;
