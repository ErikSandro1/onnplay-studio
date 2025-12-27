import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  badge?: number;
}

interface SidebarTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

// Icons
const Icons = {
  destinations: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  comments: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  banners: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>
  ),
  media: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="9" cy="9" r="2"/>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  ),
  style: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="0.5"/>
      <circle cx="17.5" cy="10.5" r="0.5"/>
      <circle cx="8.5" cy="7.5" r="0.5"/>
      <circle cx="6.5" cy="12.5" r="0.5"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  people: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  chat: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>
    </svg>
  ),
  analytics: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  ),
};

export const SidebarTabs: React.FC<SidebarTabsProps> = ({
  tabs,
  defaultTab,
  className,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className={cn('flex flex-col h-full bg-card rounded-lg overflow-hidden', className)}>
      {/* Tab Headers */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-col items-center justify-center px-3 py-2 min-w-[60px] transition-all relative',
              'hover:bg-accent/10',
              activeTab === tab.id
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground'
            )}
          >
            <div className="relative">
              {tab.icon}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 whitespace-nowrap">{tab.label}</span>
            
            {/* Active indicator */}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeContent}
      </div>
    </div>
  );
};

// Pre-built tab configurations
export const createDefaultTabs = (components: {
  destinations?: React.ReactNode;
  comments?: React.ReactNode;
  banners?: React.ReactNode;
  media?: React.ReactNode;
  style?: React.ReactNode;
  people?: React.ReactNode;
  chat?: React.ReactNode;
  analytics?: React.ReactNode;
}): Tab[] => {
  const tabs: Tab[] = [];

  if (components.destinations) {
    tabs.push({
      id: 'destinations',
      label: 'Destinos',
      icon: Icons.destinations,
      content: components.destinations,
    });
  }

  if (components.comments) {
    tabs.push({
      id: 'comments',
      label: 'Comments',
      icon: Icons.comments,
      content: components.comments,
    });
  }

  if (components.banners) {
    tabs.push({
      id: 'banners',
      label: 'Banners',
      icon: Icons.banners,
      content: components.banners,
    });
  }

  if (components.media) {
    tabs.push({
      id: 'media',
      label: 'Mídia',
      icon: Icons.media,
      content: components.media,
    });
  }

  if (components.style) {
    tabs.push({
      id: 'style',
      label: 'Estilo',
      icon: Icons.style,
      content: components.style,
    });
  }

  if (components.people) {
    tabs.push({
      id: 'people',
      label: 'Pessoas',
      icon: Icons.people,
      content: components.people,
    });
  }

  if (components.chat) {
    tabs.push({
      id: 'chat',
      label: 'Chat',
      icon: Icons.chat,
      content: components.chat,
    });
  }

  if (components.analytics) {
    tabs.push({
      id: 'analytics',
      label: 'Analytics',
      icon: Icons.analytics,
      content: components.analytics,
    });
  }

  return tabs;
};

export default SidebarTabs;
