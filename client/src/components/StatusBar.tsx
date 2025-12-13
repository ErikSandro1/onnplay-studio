import React, { useEffect, useState } from 'react';
import { Wifi, Activity, Zap, HardDrive, Clock } from 'lucide-react';

interface StatusData {
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  bitrate: number;
  fps: number;
  storage: string;
  uptime: string;
}

const StatusBar: React.FC = () => {
  const [status, setStatus] = useState<StatusData>({
    connectionStatus: 'connected',
    bitrate: 6.5,
    fps: 60,
    storage: '256 GB',
    uptime: '00:00:00',
  });

  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);

      setStatus((prev) => ({
        ...prev,
        bitrate: 6.0 + Math.random() * 1.0,
        fps: 59 + Math.floor(Math.random() * 2),
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
    switch (status.connectionStatus) {
      case 'connected':
        return '#00FF88';
      case 'connecting':
        return '#FFB800';
      case 'disconnected':
        return '#FF3366';
    }
  };

  const getConnectionLabel = () => {
    switch (status.connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
    }
  };

  return (
    <div
      className="px-6 py-3 flex items-center justify-between"
      style={{
        background: '#0A0E1A',
        borderTop: '2px solid #1E2842',
      }}
    >
      {/* Left Side - Connection Status */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Wifi
            size={18}
            style={{ color: getConnectionColor() }}
            className={status.connectionStatus === 'connecting' ? 'animate-pulse' : ''}
          />
          <span className="text-sm font-semibold" style={{ color: getConnectionColor() }}>
            {getConnectionLabel()}
          </span>
        </div>

        <div className="w-px h-6" style={{ background: '#1E2842' }} />

        <div className="flex items-center gap-2">
          <Activity size={18} style={{ color: '#00D9FF' }} />
          <span className="text-sm font-semibold" style={{ color: '#B8C5D6' }}>
            {status.bitrate.toFixed(1)} Mbps
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Zap size={18} style={{ color: '#FFB800' }} />
          <span className="text-sm font-semibold" style={{ color: '#B8C5D6' }}>
            {status.fps} FPS
          </span>
        </div>
      </div>

      {/* Center - System Info */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <HardDrive size={18} style={{ color: '#7A8BA3' }} />
          <span className="text-sm font-semibold" style={{ color: '#B8C5D6' }}>
            {status.storage} Free
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={18} style={{ color: '#7A8BA3' }} />
          <span className="text-sm font-semibold" style={{ color: '#B8C5D6' }}>
            {status.uptime}
          </span>
        </div>
      </div>

      {/* Right Side - Version */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
          OnnPlay Studio v2.0
        </span>

        <div
          className="px-3 py-1 rounded-md text-xs font-bold"
          style={{
            background: 'rgba(0, 217, 255, 0.2)',
            color: '#00D9FF',
            border: '1px solid #00D9FF',
          }}
        >
          PRO
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
