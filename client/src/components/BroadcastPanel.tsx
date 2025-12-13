import React from 'react';
import { Radio, Circle, Users, Activity } from 'lucide-react';

interface BroadcastPanelProps {
  isLive: boolean;
  isRecording: boolean;
  viewers: number;
  duration: string;
  bitrate: string;
  onGoLive: () => void;
  onStartRecording: () => void;
}

const BroadcastPanel: React.FC<BroadcastPanelProps> = ({
  isLive,
  isRecording,
  viewers,
  duration,
  bitrate,
  onGoLive,
  onStartRecording,
}) => {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Stats Section */}
      <div className="space-y-3">
        {/* LIVE Status */}
        <div 
          className="p-4 rounded-xl"
          style={{ 
            background: isLive ? 'rgba(255, 107, 0, 0.1)' : '#1E2842',
            border: isLive ? '2px solid #FF6B00' : '2px solid #2A3F5F'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Radio size={18} style={{ color: isLive ? '#FF6B00' : '#7A8BA3' }} />
              <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
                STATUS
              </span>
            </div>
            {isLive && (
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#FF6B00' }}
              />
            )}
          </div>
          <div 
            className="text-2xl font-bold"
            style={{ color: isLive ? '#FF6B00' : '#7A8BA3' }}
          >
            {isLive ? 'LIVE' : 'OFF AIR'}
          </div>
        </div>

        {/* Viewers */}
        <div 
          className="p-4 rounded-xl"
          style={{ background: '#1E2842' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} style={{ color: '#7A8BA3' }} />
            <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
              VIEWERS
            </span>
          </div>
          <div 
            className="text-2xl font-bold"
            style={{ color: isLive ? '#00D9FF' : '#7A8BA3' }}
          >
            {viewers}
          </div>
        </div>

        {/* Duration */}
        <div 
          className="p-4 rounded-xl"
          style={{ background: '#1E2842' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity size={18} style={{ color: '#7A8BA3' }} />
            <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
              DURATION
            </span>
          </div>
          <div 
            className="text-2xl font-bold font-mono"
            style={{ color: isLive ? '#00D9FF' : '#7A8BA3' }}
          >
            {duration}
          </div>
        </div>

        {/* Bitrate */}
        <div 
          className="p-4 rounded-xl"
          style={{ background: '#1E2842' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Circle size={18} style={{ color: '#7A8BA3' }} />
            <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
              BITRATE
            </span>
          </div>
          <div 
            className="text-2xl font-bold"
            style={{ color: isLive ? '#00D9FF' : '#7A8BA3' }}
          >
            {bitrate}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-1 flex flex-col justify-end gap-3">
        <button
          onClick={onGoLive}
          className="w-full py-5 rounded-xl text-lg font-bold transition-all duration-200 hover:scale-105"
          style={{
            background: isLive ? '#DC2626' : '#FF6B00',
            color: '#FFFFFF',
            border: isLive ? '2px solid #DC2626' : '2px solid #FF6B00',
            boxShadow: isLive 
              ? '0 0 30px rgba(220, 38, 38, 0.5)' 
              : '0 0 30px rgba(255, 107, 0, 0.5)'
          }}
        >
          {isLive ? '🔴 END BROADCAST' : '▶️ GO LIVE'}
        </button>
        
        <button
          onClick={onStartRecording}
          className="w-full py-5 rounded-xl text-lg font-bold transition-all duration-200 hover:scale-105"
          style={{
            background: isRecording ? '#DC2626' : '#DC2626',
            color: '#FFFFFF',
            border: '2px solid #DC2626'
          }}
        >
          {isRecording ? '⏹️ STOP RECORDING' : '⏺️ START RECORDING'}
        </button>
      </div>
    </div>
  );
};

export default BroadcastPanel;
