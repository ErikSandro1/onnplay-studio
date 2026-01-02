import React from 'react';
import { Mic, MicOff, Video, VideoOff, MoreVertical, UserPlus } from 'lucide-react';
import { LocalParticipantCard } from './LocalParticipantCard';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking?: boolean;
  isLocal?: boolean;
}

interface ParticipantsStripProps {
  participants: Participant[];
  onToggleMute: (id: string) => void;
  onToggleCamera: (id: string) => void;
  onParticipantClick: (id: string) => void;
  onInvite?: () => void;
}

const ParticipantsStrip: React.FC<ParticipantsStripProps> = ({
  participants,
  onToggleMute,
  onToggleCamera,
  onParticipantClick,
  onInvite,
}) => {
  // Filtrar participantes remotos (não locais)
  const remoteParticipants = participants.filter(p => !p.isLocal);

  return (
    <div 
      className="flex items-center gap-3 px-6 py-4 overflow-x-auto"
      style={{
        background: '#0F1419',
        borderTop: '1px solid #1E2842',
        minHeight: '120px'
      }}
    >
      {/* Card do usuário local (YOU) - sempre primeiro */}
      <LocalParticipantCard 
        name="YOU"
        onSendToPreview={() => {
          console.log('[ParticipantsStrip] Local camera sent to preview');
        }}
      />

      {/* Participantes remotos (GUESTs) */}
      {remoteParticipants.map((participant, index) => (
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
              border: participant.isSpeaking ? '2px solid #00D9FF' : '2px solid #2D3A5C',
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

            {/* GUEST badge */}
            <div
              className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold"
              style={{
                background: 'rgba(0, 217, 255, 0.9)',
                color: '#0A0E1A',
              }}
            >
              GUEST {index + 1}
            </div>

            {/* Status indicator */}
            <div
              className="absolute top-2 right-2 w-2 h-2 rounded-full"
              style={{
                background: !participant.isCameraOff ? '#00FF88' : '#FF3366',
                boxShadow: !participant.isCameraOff
                  ? '0 0 8px rgba(0, 255, 136, 0.6)'
                  : '0 0 8px rgba(255, 51, 102, 0.6)',
              }}
            />
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
              className="absolute bottom-8 left-2 p-1 rounded-full"
              style={{ background: 'rgba(255, 107, 0, 0.9)' }}
            >
              <MicOff size={10} style={{ color: '#FFFFFF' }} />
            </div>
          )}
        </div>
      ))}
      
      {/* Add Participant Button */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center cursor-pointer group"
        style={{ width: '140px' }}
        onClick={onInvite}
      >
        <div 
          className="w-full rounded-lg flex items-center justify-center border-2 border-dashed transition-all group-hover:border-solid group-hover:border-[#00D9FF]"
          style={{
            height: '80px',
            borderColor: '#2D3A5C',
            background: 'transparent'
          }}
        >
          <div className="text-center">
            <UserPlus 
              size={24} 
              className="mx-auto mb-1 transition-colors group-hover:text-[#00D9FF]"
              style={{ color: '#7A8BA3' }}
            />
            <div 
              className="text-xs font-medium transition-colors group-hover:text-[#00D9FF]"
              style={{ color: '#7A8BA3' }}
            >
              Convidar
            </div>
          </div>
        </div>
        <div 
          className="mt-2 text-center text-sm font-medium"
          style={{ color: '#7A8BA3' }}
        >
          Add Guest
        </div>
      </div>
    </div>
  );
};

export default ParticipantsStrip;
