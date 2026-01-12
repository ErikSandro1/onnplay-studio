import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, MoreVertical, UserPlus, Eye, EyeOff } from 'lucide-react';
import { LocalParticipantCard } from './LocalParticipantCard';
import { useDailyContext } from '../contexts/DailyContext';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking?: boolean;
  isLocal?: boolean;
  isInPreview?: boolean;
  isInProgram?: boolean;
}

interface ParticipantsStripProps {
  participants: Participant[];
  onToggleMute: (id: string) => void;
  onToggleCamera: (id: string) => void;
  onParticipantClick: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  onTogglePreview?: (id: string) => void;
  onSendToProgram?: (id: string) => void;
  onInvite?: () => void;
  previewParticipants?: string[];
  programParticipants?: string[];
}

// Componente para renderizar o vídeo de um participante remoto
const RemoteParticipantVideo: React.FC<{ participantId: string }> = ({ participantId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { getVideoTrack, isConnected } = useDailyContext();

  useEffect(() => {
    if (!videoRef.current || !isConnected) return;

    const track = getVideoTrack(participantId);
    if (track) {
      const stream = new MediaStream([track]);
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn('[RemoteParticipantVideo] Failed to play:', err);
      });
    } else {
      videoRef.current.srcObject = null;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [participantId, getVideoTrack, isConnected]);

  // Re-check track periodically (tracks can arrive after participant)
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (!videoRef.current) return;
      
      const track = getVideoTrack(participantId);
      if (track && !videoRef.current.srcObject) {
        const stream = new MediaStream([track]);
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.warn('[RemoteParticipantVideo] Failed to play on retry:', err);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [participantId, getVideoTrack, isConnected]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
    />
  );
};

const ParticipantsStrip: React.FC<ParticipantsStripProps> = ({
  participants,
  onToggleMute,
  onToggleCamera,
  onParticipantClick,
  onRemoveParticipant,
  onTogglePreview,
  onSendToProgram,
  onInvite,
  previewParticipants = [],
  programParticipants = [],
}) => {
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
  const { isConnected, getVideoTrack } = useDailyContext();
  
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
      {remoteParticipants.map((participant, index) => {
        const isInPreview = previewParticipants.includes(participant.id);
        const isInProgram = programParticipants.includes(participant.id);
        const hasVideoTrack = isConnected && getVideoTrack(participant.id) !== null;
        
        return (
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
                border: isInProgram 
                  ? '2px solid #FF3366' 
                  : isInPreview 
                    ? '2px solid #00FF88' 
                    : participant.isSpeaking 
                      ? '2px solid #00D9FF' 
                      : '2px solid #2D3A5C',
                boxShadow: isInProgram 
                  ? '0 0 15px rgba(255, 51, 102, 0.5)' 
                  : isInPreview 
                    ? '0 0 15px rgba(0, 255, 136, 0.5)' 
                    : participant.isSpeaking 
                      ? '0 0 15px rgba(0, 217, 255, 0.5)' 
                      : 'none',
              }}
            >
              {/* Vídeo do participante remoto */}
              {!participant.isCameraOff && isConnected ? (
                <RemoteParticipantVideo participantId={participant.id} />
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
              
              {/* Controls Overlay - aparece ao passar o mouse */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {/* Eye Icon - Toggle Preview */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('[ParticipantsStrip] Toggle preview clicked for:', participant.id);
                    if (onTogglePreview) {
                      onTogglePreview(participant.id);
                    }
                  }}
                  className="p-1.5 rounded-full transition-all hover:scale-110"
                  style={{
                    background: isInPreview ? '#00FF88' : '#1E2842',
                    color: isInPreview ? '#0A0E1A' : '#FFFFFF'
                  }}
                  title={isInPreview ? 'Remover do Preview' : 'Adicionar ao Preview'}
                >
                  {isInPreview ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                
                {/* Mute Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('[ParticipantsStrip] Mute clicked for:', participant.id);
                    onToggleMute(participant.id);
                  }}
                  className="p-1.5 rounded-full transition-all hover:scale-110"
                  style={{
                    background: participant.isMuted ? '#FF6B00' : '#1E2842',
                    color: '#FFFFFF'
                  }}
                  title={participant.isMuted ? 'Ativar Microfone' : 'Mutar'}
                >
                  {participant.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
                
                {/* Camera Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('[ParticipantsStrip] Camera clicked for:', participant.id);
                    onToggleCamera(participant.id);
                  }}
                  className="p-1.5 rounded-full transition-all hover:scale-110"
                  style={{
                    background: participant.isCameraOff ? '#FF6B00' : '#1E2842',
                    color: '#FFFFFF'
                  }}
                  title={participant.isCameraOff ? 'Ativar Câmera' : 'Desligar Câmera'}
                >
                  {participant.isCameraOff ? <VideoOff size={14} /> : <Video size={14} />}
                </button>
                
                {/* More Options Menu */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === participant.id ? null : participant.id);
                    }}
                    className="p-1.5 rounded-full transition-all hover:scale-110"
                    style={{
                      background: menuOpenId === participant.id ? '#FF6B00' : '#1E2842',
                      color: '#FFFFFF'
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {menuOpenId === participant.id && (
                    <div 
                      className="absolute bottom-full right-0 mb-2 py-1 rounded-lg shadow-xl z-50"
                      style={{ background: '#1E2842', border: '1px solid #2D3A5C', minWidth: '180px' }}
                    >
                      {/* Toggle Preview Option */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTogglePreview) {
                            onTogglePreview(participant.id);
                          }
                          setMenuOpenId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                        style={{ color: isInPreview ? '#00FF88' : '#FFFFFF' }}
                      >
                        {isInPreview ? <Eye size={14} /> : <EyeOff size={14} />}
                        {isInPreview ? 'Remover do Preview' : 'Adicionar ao Preview'}
                      </button>
                      
                      {/* Send to Program Option */}
                      {isInPreview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSendToProgram) {
                              onSendToProgram(participant.id);
                            }
                            setMenuOpenId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                          style={{ color: '#FF3366' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                          Enviar para Program (LIVE)
                        </button>
                      )}
                      
                      <div style={{ borderTop: '1px solid #2D3A5C', margin: '4px 0' }} />
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleMute(participant.id);
                          setMenuOpenId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                        style={{ color: '#FFFFFF' }}
                      >
                        {participant.isMuted ? <Mic size={14} /> : <MicOff size={14} />}
                        {participant.isMuted ? 'Ativar Mic' : 'Mutar'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCamera(participant.id);
                          setMenuOpenId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2"
                        style={{ color: '#FFFFFF' }}
                      >
                        {participant.isCameraOff ? <Video size={14} /> : <VideoOff size={14} />}
                        {participant.isCameraOff ? 'Ativar Câmera' : 'Desligar Câmera'}
                      </button>
                      <div style={{ borderTop: '1px solid #2D3A5C', margin: '4px 0' }} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onRemoveParticipant) {
                            onRemoveParticipant(participant.id);
                          }
                          setMenuOpenId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-red-900 flex items-center gap-2"
                        style={{ color: '#FF3366' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                        Remover da Sala
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Badge - GUEST / PREVIEW / LIVE */}
              <div
                className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-bold"
                style={{
                  background: isInProgram 
                    ? 'rgba(255, 51, 102, 0.9)' 
                    : isInPreview 
                      ? 'rgba(0, 255, 136, 0.9)' 
                      : 'rgba(0, 217, 255, 0.9)',
                  color: isInProgram || isInPreview ? '#0A0E1A' : '#0A0E1A',
                }}
              >
                {isInProgram ? 'LIVE' : isInPreview ? 'PREVIEW' : `GUEST ${index + 1}`}
              </div>

              {/* Status indicator - online/offline */}
              <div
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
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
                className="absolute bottom-8 left-1 p-0.5 rounded-full"
                style={{ background: 'rgba(255, 107, 0, 0.9)' }}
              >
                <MicOff size={10} style={{ color: '#FFFFFF' }} />
              </div>
            )}
            
            {/* Preview/Program Indicator Bar */}
            {(isInPreview || isInProgram) && (
              <div 
                className="absolute bottom-6 left-0 right-0 h-1 rounded-b-lg"
                style={{
                  background: isInProgram ? '#FF3366' : '#00FF88',
                }}
              />
            )}
          </div>
        );
      })}
      
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
