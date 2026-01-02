import React from 'react';
import { Radio, Circle, Users, Activity, Loader2, Wifi, Send, Youtube } from 'lucide-react';
import { UsageDashboard } from './UsageDashboard';

// Broadcast status types
export type BroadcastStatus = 
  | 'off_air'           // Not streaming
  | 'connecting'        // Starting stream, connecting to server
  | 'sending'           // Stream being sent to YouTube
  | 'waiting_youtube'   // Waiting for YouTube to confirm
  | 'live'              // Confirmed LIVE on YouTube
  | 'ending';           // Ending broadcast

interface BroadcastPanelProps {
  isLive: boolean;
  isRecording: boolean;
  viewers: number;
  duration: string;
  bitrate: string;
  onGoLive: () => void;
  onStartRecording: () => void;
  broadcastStatus?: BroadcastStatus;
}

// LED Component
const StatusLED: React.FC<{
  active: boolean;
  color: string;
  pulsing?: boolean;
  label: string;
  icon: React.ReactNode;
}> = ({ active, color, pulsing, label, icon }) => (
  <div className="flex flex-col items-center gap-1">
    <div 
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${pulsing ? 'animate-pulse' : ''}`}
      style={{
        background: active ? color : '#2A3F5F',
        boxShadow: active ? `0 0 15px ${color}, 0 0 30px ${color}40` : 'none',
        border: `2px solid ${active ? color : '#3A4F6F'}`,
      }}
    >
      <span style={{ color: active ? '#fff' : '#5A6A7F' }}>
        {icon}
      </span>
    </div>
    <span className="text-[10px] font-medium" style={{ color: active ? color : '#5A6A7F' }}>
      {label}
    </span>
  </div>
);

const BroadcastPanel: React.FC<BroadcastPanelProps> = ({
  isLive,
  isRecording,
  viewers,
  duration,
  bitrate,
  onGoLive,
  onStartRecording,
  broadcastStatus = isLive ? 'live' : 'off_air',
}) => {
  // Determine LED states based on broadcast status
  const getLEDStates = () => {
    switch (broadcastStatus) {
      case 'connecting':
        return {
          server: { active: true, pulsing: true, color: '#FFA500' },
          stream: { active: false, pulsing: false, color: '#FFD700' },
          youtube: { active: false, pulsing: false, color: '#00FF00' },
        };
      case 'sending':
        return {
          server: { active: true, pulsing: false, color: '#00FF00' },
          stream: { active: true, pulsing: true, color: '#FFD700' },
          youtube: { active: false, pulsing: false, color: '#00FF00' },
        };
      case 'waiting_youtube':
        return {
          server: { active: true, pulsing: false, color: '#00FF00' },
          stream: { active: true, pulsing: false, color: '#00FF00' },
          youtube: { active: true, pulsing: true, color: '#FF4500' },
        };
      case 'live':
        return {
          server: { active: true, pulsing: false, color: '#00FF00' },
          stream: { active: true, pulsing: false, color: '#00FF00' },
          youtube: { active: true, pulsing: true, color: '#00FF00' },
        };
      case 'ending':
        return {
          server: { active: true, pulsing: true, color: '#DC2626' },
          stream: { active: true, pulsing: true, color: '#DC2626' },
          youtube: { active: true, pulsing: true, color: '#DC2626' },
        };
      default: // off_air
        return {
          server: { active: false, pulsing: false, color: '#00FF00' },
          stream: { active: false, pulsing: false, color: '#FFD700' },
          youtube: { active: false, pulsing: false, color: '#00FF00' },
        };
    }
  };

  const ledStates = getLEDStates();
  const isInProgress = ['connecting', 'sending', 'waiting_youtube', 'ending'].includes(broadcastStatus);

  // Get status text
  const getStatusText = () => {
    switch (broadcastStatus) {
      case 'connecting': return 'CONECTANDO...';
      case 'sending': return 'ENVIANDO STREAM...';
      case 'waiting_youtube': return 'AGUARDANDO YOUTUBE...';
      case 'live': return 'ONLINE';
      case 'ending': return 'ENCERRANDO...';
      default: return 'OFF AIR';
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (broadcastStatus) {
      case 'connecting': return '#FFA500';
      case 'sending': return '#FFD700';
      case 'waiting_youtube': return '#FF4500';
      case 'live': return '#00FF00';
      case 'ending': return '#DC2626';
      default: return '#7A8BA3';
    }
  };

  // Get button display
  const getButtonDisplay = () => {
    if (broadcastStatus === 'ending') {
      return { text: '⏳ ENCERRANDO...', disabled: true, bg: '#666' };
    }
    if (isInProgress && broadcastStatus !== 'live') {
      return { text: '⏳ AGUARDE...', disabled: true, bg: '#FFA500' };
    }
    if (broadcastStatus === 'live') {
      return { text: '🔴 END BROADCAST', disabled: false, bg: '#DC2626' };
    }
    return { text: '▶️ GO LIVE', disabled: false, bg: '#FF6B00' };
  };

  const buttonDisplay = getButtonDisplay();
  const statusColor = getStatusColor();

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Broadcast Status Section with LEDs */}
      <div 
        className="p-4 rounded-xl transition-all duration-300"
        style={{ 
          background: broadcastStatus === 'live' ? 'rgba(0, 255, 0, 0.05)' : '#1E2842',
          border: `2px solid ${broadcastStatus === 'live' ? '#00FF00' : '#2A3F5F'}`
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Radio size={16} style={{ color: statusColor }} />
          <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
            BROADCAST
          </span>
        </div>

        {/* LED Indicators */}
        <div className="flex justify-around mb-3 py-2">
          <StatusLED 
            active={ledStates.server.active}
            color={ledStates.server.color}
            pulsing={ledStates.server.pulsing}
            label="SERVER"
            icon={<Wifi size={14} />}
          />
          <StatusLED 
            active={ledStates.stream.active}
            color={ledStates.stream.color}
            pulsing={ledStates.stream.pulsing}
            label="STREAM"
            icon={<Send size={14} />}
          />
          <StatusLED 
            active={ledStates.youtube.active}
            color={ledStates.youtube.color}
            pulsing={ledStates.youtube.pulsing}
            label="YOUTUBE"
            icon={<Youtube size={14} />}
          />
        </div>

        {/* Status Text */}
        <div 
          className={`text-center text-xl font-bold transition-all duration-300 ${broadcastStatus === 'live' ? 'animate-pulse' : ''}`}
          style={{ 
            color: statusColor,
            textShadow: broadcastStatus === 'live' ? `0 0 10px ${statusColor}` : 'none'
          }}
        >
          {getStatusText()}
        </div>

        {/* Progress message */}
        {isInProgress && broadcastStatus !== 'live' && (
          <div className="mt-2 text-center text-xs flex items-center justify-center gap-2" style={{ color: statusColor }}>
            <Loader2 className="animate-spin" size={12} />
            {broadcastStatus === 'connecting' && 'Iniciando conexão com servidor...'}
            {broadcastStatus === 'sending' && 'Enviando vídeo para YouTube...'}
            {broadcastStatus === 'waiting_youtube' && 'Aguardando confirmação do YouTube...'}
            {broadcastStatus === 'ending' && 'Finalizando transmissão...'}
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="space-y-2">
        {/* Viewers */}
        <div 
          className="p-3 rounded-xl"
          style={{ background: '#1E2842' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} style={{ color: '#7A8BA3' }} />
              <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
                VIEWERS
              </span>
            </div>
            <div 
              className="text-xl font-bold"
              style={{ color: broadcastStatus === 'live' ? '#00D9FF' : '#7A8BA3' }}
            >
              {viewers}
            </div>
          </div>
        </div>

        {/* Duration */}
        <div 
          className="p-3 rounded-xl"
          style={{ background: '#1E2842' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} style={{ color: '#7A8BA3' }} />
              <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
                DURATION
              </span>
            </div>
            <div 
              className="text-xl font-bold font-mono"
              style={{ color: broadcastStatus === 'live' ? '#00D9FF' : '#7A8BA3' }}
            >
              {duration}
            </div>
          </div>
        </div>

        {/* Bitrate */}
        <div 
          className="p-3 rounded-xl"
          style={{ background: '#1E2842' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Circle size={16} style={{ color: '#7A8BA3' }} />
              <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
                BITRATE
              </span>
            </div>
            <div 
              className="text-xl font-bold"
              style={{ color: broadcastStatus === 'live' ? '#00D9FF' : '#7A8BA3' }}
            >
              {bitrate}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Dashboard */}
      <div className="mt-2">
        <UsageDashboard />
      </div>

      {/* Action Buttons */}
      <div className="mt-auto pt-3 space-y-2">
        <button
          onClick={onGoLive}
          disabled={buttonDisplay.disabled}
          className="w-full py-3 rounded-xl text-base font-bold transition-all duration-200 hover:scale-105 disabled:hover:scale-100 disabled:opacity-70 disabled:cursor-not-allowed"
          style={{
            background: buttonDisplay.bg,
            color: '#FFFFFF',
            border: `2px solid ${buttonDisplay.bg}`,
            boxShadow: broadcastStatus === 'live' 
              ? '0 0 30px rgba(0, 255, 0, 0.5)' 
              : isInProgress 
                ? '0 0 20px rgba(255, 165, 0, 0.3)'
                : '0 0 30px rgba(255, 107, 0, 0.5)'
          }}
        >
          {buttonDisplay.text}
        </button>
        
        <button
          onClick={onStartRecording}
          className="w-full py-3 rounded-xl text-base font-bold transition-all duration-200 hover:scale-105"
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
