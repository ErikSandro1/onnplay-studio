import React from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, UserPlus, LogOut } from 'lucide-react';

interface ControlBarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onInvite: () => void;
  onLeave: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onInvite,
  onLeave,
}) => {
  return (
    <div 
      className="flex items-center justify-center gap-4 px-6 py-4"
      style={{
        background: '#0A0E1A',
        borderTop: '2px solid #1E2842',
        minHeight: '80px'
      }}
    >
      {/* Mute/Unmute */}
      <button
        onClick={onToggleMute}
        className="flex flex-col items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: isMuted ? '#FF6B00' : '#1E2842',
          color: '#FFFFFF',
          border: isMuted ? '2px solid #FF6B00' : '2px solid #2A3F5F'
        }}
      >
        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        <span className="text-xs font-semibold">
          {isMuted ? 'Unmute' : 'Mute'}
        </span>
      </button>

      {/* Camera On/Off */}
      <button
        onClick={onToggleCamera}
        className="flex flex-col items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: isCameraOff ? '#FF6B00' : '#1E2842',
          color: '#FFFFFF',
          border: isCameraOff ? '2px solid #FF6B00' : '2px solid #2A3F5F'
        }}
      >
        {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
        <span className="text-xs font-semibold">
          {isCameraOff ? 'Start Cam' : 'Stop Cam'}
        </span>
      </button>

      {/* Share Screen */}
      <button
        onClick={onToggleScreenShare}
        className="flex flex-col items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: isScreenSharing ? '#00D9FF' : '#1E2842',
          color: '#FFFFFF',
          border: isScreenSharing ? '2px solid #00D9FF' : '2px solid #2A3F5F'
        }}
      >
        <MonitorUp size={24} />
        <span className="text-xs font-semibold">
          {isScreenSharing ? 'Stop Share' : 'Share Screen'}
        </span>
      </button>

      {/* Divider */}
      <div 
        className="h-12 w-px"
        style={{ background: '#1E2842' }}
      />

      {/* Invite */}
      <button
        onClick={onInvite}
        className="flex flex-col items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: '#1E2842',
          color: '#00D9FF',
          border: '2px solid #2A3F5F'
        }}
      >
        <UserPlus size={24} />
        <span className="text-xs font-semibold">Invite</span>
      </button>

      {/* Leave Studio */}
      <button
        onClick={onLeave}
        className="flex flex-col items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105"
        style={{
          background: '#DC2626',
          color: '#FFFFFF',
          border: '2px solid #DC2626'
        }}
      >
        <LogOut size={24} />
        <span className="text-xs font-semibold">Leave Studio</span>
      </button>
    </div>
  );
};

export default ControlBar;
