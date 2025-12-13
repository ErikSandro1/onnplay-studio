import { useEffect, useState } from 'react';
import { Wifi, Activity, Users, Zap, Clock } from 'lucide-react';

interface StatusData {
  bitrate: number;
  fps: number;
  latency: number;
  viewers: number;
  uptime: string;
  connection: 'online' | 'offline' | 'warning';
}

export default function StatusBar() {
  const [status, setStatus] = useState<StatusData>({
    bitrate: 5.2,
    fps: 60,
    latency: 45,
    viewers: 1234,
    uptime: '00:00:00',
    connection: 'online',
  });

  const [seconds, setSeconds] = useState(0);

  // Simular atualizações em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
      
      // Simular variações realistas
      setStatus(prev => ({
        ...prev,
        bitrate: 5.0 + Math.random() * 0.5,
        fps: 59 + Math.floor(Math.random() * 2),
        latency: 40 + Math.floor(Math.random() * 20),
        viewers: Math.max(1000, prev.viewers + Math.floor((Math.random() - 0.5) * 100)),
        uptime: formatUptime(seconds),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [seconds]);

  const formatUptime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getConnectionColor = () => {
    switch (status.connection) {
      case 'online':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-green-500';
    }
  };

  const getFpsColor = () => {
    if (status.fps >= 59) return 'text-green-500';
    if (status.fps >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLatencyColor = () => {
    if (status.latency < 50) return 'text-green-500';
    if (status.latency < 100) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between gap-6 text-xs font-mono">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <Wifi size={14} className={getConnectionColor()} />
          <span className="text-gray-400">Connection:</span>
          <span className={getConnectionColor()}>{status.connection.toUpperCase()}</span>
        </div>

        {/* Bitrate */}
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-orange-500" />
          <span className="text-gray-400">Bitrate:</span>
          <span className="text-orange-500">{status.bitrate.toFixed(1)} Mbps</span>
        </div>

        {/* FPS */}
        <div className="flex items-center gap-2">
          <Activity size={14} className={getFpsColor()} />
          <span className="text-gray-400">FPS:</span>
          <span className={getFpsColor()}>{status.fps}</span>
        </div>

        {/* Latency */}
        <div className="flex items-center gap-2">
          <Clock size={14} className={getLatencyColor()} />
          <span className="text-gray-400">Latency:</span>
          <span className={getLatencyColor()}>{status.latency}ms</span>
        </div>

        {/* Viewers */}
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-500" />
          <span className="text-gray-400">Viewers:</span>
          <span className="text-blue-500">{status.viewers.toLocaleString()}</span>
        </div>

        {/* Uptime */}
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-purple-500" />
          <span className="text-gray-400">Uptime:</span>
          <span className="text-purple-500">{status.uptime}</span>
        </div>
      </div>
    </div>
  );
}
