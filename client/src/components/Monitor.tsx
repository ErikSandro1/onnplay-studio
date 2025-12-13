import { Maximize2, Volume2, Settings } from 'lucide-react';

interface MonitorProps {
  type: 'edit' | 'program';
  title: string;
  isActive?: boolean;
}

export default function Monitor({ type, title, isActive = false }: MonitorProps) {
  const borderClass = type === 'edit' ? 'monitor-edit' : 'monitor-program';
  const titleColor = type === 'edit' ? 'text-cyan-400' : 'text-orange-500';

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Monitor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 rounded-t border-b border-gray-700">
        <h3 className={`text-sm font-bold uppercase tracking-wider ${titleColor}`}>{title}</h3>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-gray-700 rounded transition-colors">
            <Volume2 size={16} className="text-gray-400" />
          </button>
          <button className="p-1 hover:bg-gray-700 rounded transition-colors">
            <Settings size={16} className="text-gray-400" />
          </button>
          <button className="p-1 hover:bg-gray-700 rounded transition-colors">
            <Maximize2 size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Monitor Display */}
      <div className={`${borderClass} flex-1 relative overflow-hidden bg-black flex items-center justify-center`}>
        {/* Placeholder Video Content */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
          {type === 'edit' ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-700 rounded-lg mx-auto mb-4 opacity-30"></div>
              <p className="text-gray-500 text-sm">Green Screen Studio</p>
              <p className="text-gray-600 text-xs mt-1">Ready for input</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-32 h-20 bg-gradient-to-br from-blue-600 to-orange-500 rounded-lg mx-auto mb-4 opacity-40"></div>
              <p className="text-gray-500 text-sm">Broadcast Output</p>
              <p className="text-gray-600 text-xs mt-1">On Air</p>
            </div>
          )}
        </div>

        {/* Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0 bg-repeat" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)'
          }}></div>
        </div>

        {/* Status Indicator */}
        {isActive && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded text-xs font-bold text-white">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            LIVE
          </div>
        )}
      </div>
    </div>
  );
}
