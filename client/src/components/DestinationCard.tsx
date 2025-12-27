import React from 'react';
import { cn } from '../lib/utils';

export type Platform = 'youtube' | 'twitch' | 'facebook' | 'tiktok' | 'instagram' | 'kick' | 'custom';

interface Destination {
  id: string;
  platform: Platform;
  name: string;
  serverUrl?: string;
  streamKey?: string;
  isConnected?: boolean;
  isLive?: boolean;
}

interface DestinationCardProps {
  destination: Destination;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, enabled: boolean) => void;
  isEnabled?: boolean;
  compact?: boolean;
}

// Platform configurations
const platformConfig: Record<Platform, { name: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    bgColor: 'bg-red-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  twitch: {
    name: 'Twitch',
    color: '#9146FF',
    bgColor: 'bg-purple-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
      </svg>
    ),
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    bgColor: 'bg-blue-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    bgColor: 'bg-gray-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    bgColor: 'bg-pink-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.757-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
      </svg>
    ),
  },
  kick: {
    name: 'Kick',
    color: '#53FC18',
    bgColor: 'bg-green-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M1.333 0v24h5.334v-8l2.666 2.667L12 24h6.667l-5.334-8 5.334-8H12l-2.667 5.333L6.667 8V0z"/>
      </svg>
    ),
  },
  custom: {
    name: 'RTMP',
    color: '#FF6B35',
    bgColor: 'bg-orange-500/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
};

export const DestinationCard: React.FC<DestinationCardProps> = ({
  destination,
  onEdit,
  onDelete,
  onToggle,
  isEnabled = true,
  compact = false,
}) => {
  const config = platformConfig[destination.platform];

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg transition-all',
          config.bgColor,
          isEnabled ? 'opacity-100' : 'opacity-50'
        )}
      >
        <div style={{ color: config.color }}>{config.icon}</div>
        <span className="text-sm font-medium truncate flex-1">{destination.name}</span>
        {destination.isLive && (
          <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded animate-pulse">
            LIVE
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border transition-all',
        config.bgColor,
        isEnabled 
          ? 'border-border hover:border-primary/50' 
          : 'border-border/50 opacity-60',
        destination.isLive && 'ring-2 ring-red-500'
      )}
    >
      {/* Platform Icon & Name */}
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{destination.name}</h4>
          <p className="text-xs text-muted-foreground">{config.name}</p>
        </div>
        
        {/* Status Badge */}
        {destination.isLive ? (
          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
            LIVE
          </span>
        ) : destination.isConnected ? (
          <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-medium rounded-full">
            Conectado
          </span>
        ) : null}
      </div>

      {/* Server URL (truncated) */}
      {destination.serverUrl && (
        <div className="mb-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Server URL</p>
          <p className="text-xs text-foreground/80 truncate font-mono bg-background/50 px-2 py-1 rounded">
            {destination.serverUrl}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        {/* Toggle */}
        {onToggle && (
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => onToggle(destination.id, e.target.checked)}
                className="sr-only"
              />
              <div className={cn(
                'w-9 h-5 rounded-full transition-colors',
                isEnabled ? 'bg-primary' : 'bg-muted'
              )}>
                <div className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                  isEnabled && 'translate-x-4'
                )} />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {isEnabled ? 'Ativo' : 'Inativo'}
            </span>
          </label>
        )}

        {/* Edit & Delete */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(destination.id)}
              className="p-1.5 rounded-md hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
              title="Editar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(destination.id)}
              className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
              title="Remover"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Platform selector for adding new destinations
export const PlatformSelector: React.FC<{
  onSelect: (platform: Platform) => void;
}> = ({ onSelect }) => {
  const platforms: Platform[] = ['youtube', 'twitch', 'facebook', 'tiktok', 'kick', 'custom'];

  return (
    <div className="grid grid-cols-3 gap-3">
      {platforms.map((platform) => {
        const config = platformConfig[platform];
        return (
          <button
            key={platform}
            onClick={() => onSelect(platform)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border border-border',
              'hover:border-primary/50 transition-all',
              config.bgColor
            )}
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${config.color}20`, color: config.color }}
            >
              {config.icon}
            </div>
            <span className="text-sm font-medium">{config.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default DestinationCard;
