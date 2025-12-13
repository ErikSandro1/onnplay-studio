import React from 'react';
import { Mic, MicOff, Video, VideoOff, MoreVertical } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking?: boolean;
}

interface ParticipantsStripProps {
  participants: Participant[];
  onToggleMute: (id: string) => void;
  onToggleCamera: (id: string) => void;
  onParticipantClick: (id: string) => void;
}

const ParticipantsStrip: React.FC<ParticipantsStripProps> = ({
  participants,
  onToggleMute,
  onToggleCamera,
  onParticipantClick,
}) => {
  return (
    <div 
      className="flex items-center gap-3 px-6 py-4 overflow-x-auto"
      style={{
        background: '#0F1419',
        borderTop: '1px solid #1E2842',
        minHeight: '120px'
      }}
    >
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="flex-shrink-0 relative group cursor-pointer"
          onClick={() => onParticipantClick(participant.id)}
          style={{ width: '140px' }}
        >
          {/* Thumbnail */}
          <div 
            className="relative rounded-lg overflow-hidden"
            style={{
              height: '80px',
              background: '#1E2842',
              border: participant.isSpeaking ? '2px solid #00D9FF' : '2px solid transparent',
              boxShadow: participant.isSpeaking ? '0 0 15px rgba(0, 217, 255, 0.5)' : 'none'
            }}
          >
            {participant.avatar ? (
              <img 
                src={participant.avatar} 
                alt={participant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{
                    background: '#00D9FF',
                    color: '#0A0E1A'
                  }}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            
            {/* Camera Off Overlay */}
            {participant.isCameraOff && (
              <div 
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(10, 14, 26, 0.9)' }}
              >
                <VideoOff size={24} style={{ color: '#7A8BA3' }} />
              </div>
            )}
            
            {/* Controls Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute(participant.id);
                }}
                className="p-2 rounded-full transition-all"
                style={{
                  background: participant.isMuted ? '#FF6B00' : '#1E2842',
                  color: '#FFFFFF'
                }}
              >
                {participant.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCamera(participant.id);
                }}
                className="p-2 rounded-full transition-all"
                style={{
                  background: participant.isCameraOff ? '#FF6B00' : '#1E2842',
                  color: '#FFFFFF'
                }}
              >
                {participant.isCameraOff ? <VideoOff size={16} /> : <Video size={16} />}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="p-2 rounded-full transition-all"
                style={{
                  background: '#1E2842',
                  color: '#FFFFFF'
                }}
              >
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
          
          {/* Name */}
          <div 
            className="mt-2 text-center text-sm font-medium truncate"
            style={{ color: '#FFFFFF' }}
          >
            {participant.name}
          </div>
          
          {/* Muted Indicator */}
          {participant.isMuted && (
            <div 
              className="absolute top-2 left-2 p-1 rounded-full"
              style={{ background: 'rgba(255, 107, 0, 0.9)' }}
            >
              <MicOff size={12} style={{ color: '#FFFFFF' }} />
            </div>
          )}
        </div>
      ))}
      
      {/* Add Participant Button */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center cursor-pointer group"
        style={{ width: '140px', height: '80px' }}
      >
        <div 
          className="w-full h-full rounded-lg flex items-center justify-center border-2 border-dashed transition-all group-hover:border-solid"
          style={{
            borderColor: '#1E2842',
            background: 'transparent'
          }}
        >
          <div className="text-center">
            <div 
              className="text-3xl mb-1"
              style={{ color: '#7A8BA3' }}
            >
              +
            </div>
            <div 
              className="text-xs font-medium"
              style={{ color: '#7A8BA3' }}
            >
              Invite
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsStrip;
