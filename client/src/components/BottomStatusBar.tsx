import React, { useEffect, useState } from 'react';

interface BottomStatusBarProps {
  isLive?: boolean;
  isRecording?: boolean;
}

const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  isLive = false,
  isRecording = false,
}) => {
  const [liveTime, setLiveTime] = useState(0);
  const [recTime, setRecTime] = useState(0);
  const [bitrate, setBitrate] = useState(6000);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLive) {
        setLiveTime((t) => t + 1);
      }
      if (isRecording) {
        setRecTime((t) => t + 1);
      }
      // Simular variação de bitrate
      setBitrate(5800 + Math.floor(Math.random() * 400));
    }, 1000);

    return () => clearInterval(interval);
  }, [isLive, isRecording]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className="px-8 py-4 flex items-center justify-between"
      style={{
        background: '#0A0E1A',
        borderTop: '2px solid #1E2842',
      }}
    >
      {/* Left Side - Empty or can add more info */}
      <div className="flex-1" />

      {/* Center - Status Indicators */}
      <div className="flex items-center gap-8">
        {/* LIVE Indicator */}
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background: isLive ? '#00FF88' : '#7A8BA3',
              boxShadow: isLive ? '0 0 10px rgba(0, 255, 136, 0.8)' : 'none',
            }}
          />
          <span className="text-sm font-semibold" style={{ color: '#B8C5D6' }}>
            LIVE:
          </span>
          <span
            className="text-sm font-bold font-mono"
            style={{ color: isLive ? '#00FF88' : '#7A8BA3' }}
          >
            {formatTime(liveTime)}
          </span>
        </div>

        {/* REC Indicator */}
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background: isRecording ? '#FF3366' : '#7A8BA3',
              boxShadow: isRecording ? '0 0 10px rgba(255, 51, 102, 0.8)' : 'none',
            }}
          />
          <span className="text-sm font-semibold" style={{ color: '#B8C5D6' }}>
            REC:
          </span>
          <span
            className="text-sm font-bold font-mono"
            style={{ color: isRecording ? '#FF3366' : '#7A8BA3' }}
          >
            {formatTime(recTime)}
          </span>
        </div>

        {/* Bitrate */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: '#B8C5D6' }}>
            BITRATE:
          </span>
          <span
            className="text-sm font-bold font-mono"
            style={{ color: '#00D9FF' }}
          >
            {bitrate} Kbps
          </span>
        </div>
      </div>

      {/* Right Side - Empty or can add more info */}
      <div className="flex-1" />
    </div>
  );
};

export default BottomStatusBar;
