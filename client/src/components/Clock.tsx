import { useState, useEffect } from 'react';
import { Clock as ClockIcon, Play, Pause, RotateCcw } from 'lucide-react';

interface ClockProps {
  isLive?: boolean;
  onLiveStart?: () => void;
  onLiveStop?: () => void;
}

export default function Clock({ isLive = false, onLiveStart, onLiveStop }: ClockProps) {
  const [localTime, setLocalTime] = useState(new Date());
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

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
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleTimerReset = () => {
    setLiveSeconds(0);
    setIsTimerRunning(false);
  };

  return (
    <div className="flex gap-4">
      {/* Local Time Clock */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg">
        <ClockIcon size={20} className="text-orange-500 flex-shrink-0" />
        <div className="flex flex-col">
          <p className="text-xs text-gray-400 font-semibold">HORA LOCAL</p>
          <p className="text-lg font-mono font-bold text-white">{formatTime(localTime)}</p>
          <p className="text-xs text-gray-500">
            {localTime.toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            })}
          </p>
        </div>
      </div>

      {/* Live Duration Timer */}
      <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${
        isLive
          ? 'bg-red-900 bg-opacity-30 border-red-700'
          : 'bg-gray-900 border-gray-700'
      }`}>
        <div className="flex flex-col flex-1">
          <p className="text-xs text-gray-400 font-semibold">DURAÇÃO DA LIVE</p>
          <p className={`text-lg font-mono font-bold ${isLive ? 'text-red-400' : 'text-gray-400'}`}>
            {formatDuration(liveSeconds)}
          </p>
        </div>
        
        {/* Timer Controls */}
        <div className="flex items-center gap-1">
          {isLive && (
            <>
              <button
                onClick={handleTimerReset}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                title="Resetar cronômetro"
              >
                <RotateCcw size={16} className="text-gray-400 hover:text-white" />
              </button>
            </>
          )}
          {isLive && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
      </div>
    </div>
  );
}
