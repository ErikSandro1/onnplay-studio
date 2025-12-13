import { useState, useEffect } from 'react';
import { Clock as ClockIcon, ChevronDown } from 'lucide-react';

interface CompactClockProps {
  isLive?: boolean;
  onLiveStart?: () => void;
  onLiveStop?: () => void;
}

type ClockSize = 'compact' | 'normal' | 'large';
type ClockFormat = '12h' | '24h';

export default function CompactClock({ isLive = false }: CompactClockProps) {
  const [localTime, setLocalTime] = useState(new Date());
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [clockSize, setClockSize] = useState<ClockSize>('compact');
  const [clockFormat, setClockFormat] = useState<ClockFormat>('24h');
  const [showMenu, setShowMenu] = useState(false);

  // Update local time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update live timer
  useEffect(() => {
    if (!isLive) {
      setLiveSeconds(0);
      setIsTimerRunning(false);
      return;
    }

    setIsTimerRunning(true);
    const interval = setInterval(() => {
      setLiveSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = (date: Date) => {
    if (clockFormat === '24h') {
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } else {
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const sizeClasses = {
    compact: 'px-2 py-1 text-xs',
    normal: 'px-3 py-2 text-sm',
    large: 'px-4 py-3 text-base',
  };

  const timeClasses = {
    compact: 'text-xs font-mono font-bold',
    normal: 'text-sm font-mono font-bold',
    large: 'text-lg font-mono font-bold',
  };

  const labelClasses = {
    compact: 'text-xs',
    normal: 'text-xs',
    large: 'text-sm',
  };

  return (
    <div className="relative">
      {/* Clock Display */}
      <div className={`flex gap-2 ${sizeClasses[clockSize]}`}>
        {/* Local Time */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded">
          <ClockIcon size={clockSize === 'compact' ? 14 : 16} className="text-orange-500 flex-shrink-0" />
          <div className="flex flex-col">
            <p className={`text-gray-400 font-semibold ${labelClasses[clockSize]}`}>HORA</p>
            <p className={`text-white ${timeClasses[clockSize]}`}>{formatTime(localTime)}</p>
          </div>
        </div>

        {/* Live Duration */}
        {isLive && (
          <div className={`flex items-center gap-1 rounded border ${
            isLive
              ? 'bg-red-900 bg-opacity-30 border-red-700'
              : 'bg-gray-900 border-gray-700'
          }`}>
            <div className="flex flex-col px-2">
              <p className={`text-gray-400 font-semibold ${labelClasses[clockSize]}`}>LIVE</p>
              <p className={`${isLive ? 'text-red-400' : 'text-gray-400'} ${timeClasses[clockSize]}`}>
                {formatDuration(liveSeconds)}
              </p>
            </div>
            {isLive && (
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse mr-2"></div>
            )}
          </div>
        )}

        {/* Menu Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 hover:bg-gray-700 rounded transition-colors relative"
          title="Opções de relógio"
        >
          <ChevronDown size={clockSize === 'compact' ? 14 : 16} className="text-gray-400" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-48">
          <div className="p-2 border-b border-gray-700">
            <p className="text-xs font-semibold text-gray-400 mb-2">TAMANHO</p>
            <div className="flex gap-1">
              {(['compact', 'normal', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => {
                    setClockSize(size);
                    setShowMenu(false);
                  }}
                  className={`flex-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    clockSize === size
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {size === 'compact' ? 'P' : size === 'normal' ? 'M' : 'G'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2">
            <p className="text-xs font-semibold text-gray-400 mb-2">FORMATO</p>
            <div className="flex gap-1">
              {(['24h', '12h'] as const).map(format => (
                <button
                  key={format}
                  onClick={() => {
                    setClockFormat(format);
                    setShowMenu(false);
                  }}
                  className={`flex-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    clockFormat === format
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
