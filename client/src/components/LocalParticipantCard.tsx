import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, MoreVertical, Eye } from 'lucide-react';
import { localCameraService } from '../services/LocalCameraService';
import { toast } from 'sonner';

interface LocalParticipantCardProps {
  name?: string;
  onSendToPreview?: () => void;
}

export const LocalParticipantCard: React.FC<LocalParticipantCardProps> = ({
  name = 'YOU',
  onSendToPreview,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Subscrever ao serviço de câmera local
  useEffect(() => {
    const unsubscribe = localCameraService.subscribe((state) => {
      setIsActive(state.isActive);
      setStream(state.stream);
    });

    return unsubscribe;
  }, []);

  // Atualizar vídeo quando stream mudar
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn('[LocalParticipantCard] Failed to play video:', err);
      });
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Iniciar câmera automaticamente ao montar
  useEffect(() => {
    if (!localCameraService.isStreamActive()) {
      localCameraService.startCamera();
    }
  }, []);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleToggleCamera = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await localCameraService.toggleCamera();
  };

  const handleClick = () => {
    if (isActive && stream) {
      localCameraService.sendToPreview();
      toast.success(`${name} enviado para PREVIEW`);
      onSendToPreview?.();
    } else {
      // Tentar iniciar a câmera
      localCameraService.startCamera();
    }
  };

  return (
    <div
      className="flex-shrink-0 relative group cursor-pointer"
      style={{ width: '140px' }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Thumbnail */}
      <div 
        className="relative rounded-lg overflow-hidden"
        style={{
          height: '80px',
          background: '#1E2842',
          border: isActive ? '2px solid #00FF88' : '2px solid #FF6B00',
          boxShadow: isActive ? '0 0 15px rgba(0, 255, 136, 0.3)' : '0 0 10px rgba(255, 107, 0, 0.3)',
        }}
      >
        {/* Vídeo da câmera */}
        {isActive && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // Espelhar
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{
                background: '#FF6B00',
                color: '#FFFFFF'
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        
        {/* Camera Off Overlay */}
        {!isActive && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(10, 14, 26, 0.7)' }}
          >
            <div className="text-center">
              <VideoOff size={24} style={{ color: '#FF6B00' }} className="mx-auto mb-1" />
              <span className="text-xs text-gray-400">Clique para ativar</span>
            </div>
          </div>
        )}
        
        {/* Controls Overlay */}
        <div 
          className={`absolute inset-0 bg-black transition-all duration-200 flex items-center justify-center gap-2 ${
            isHovering ? 'bg-opacity-60 opacity-100' : 'bg-opacity-0 opacity-0'
          }`}
        >
          <button
            onClick={handleToggleMute}
            className="p-2 rounded-full transition-all"
            style={{
              background: isMuted ? '#FF6B00' : '#1E2842',
              color: '#FFFFFF'
            }}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          
          <button
            onClick={handleToggleCamera}
            className="p-2 rounded-full transition-all"
            style={{
              background: !isActive ? '#FF6B00' : '#1E2842',
              color: '#FFFFFF'
            }}
          >
            {!isActive ? <VideoOff size={16} /> : <Video size={16} />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isActive) {
                localCameraService.sendToPreview();
                toast.success('Enviado para PREVIEW');
              }
            }}
            className="p-2 rounded-full transition-all"
            style={{
              background: '#00D9FF',
              color: '#0A0E1A'
            }}
            title="Enviar para PREVIEW"
          >
            <Eye size={16} />
          </button>
        </div>

        {/* Status indicator */}
        <div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{
            background: isActive ? '#00FF88' : '#FF3366',
            boxShadow: isActive
              ? '0 0 8px rgba(0, 255, 136, 0.6)'
              : '0 0 8px rgba(255, 51, 102, 0.6)',
          }}
        />

        {/* YOU badge */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold"
          style={{
            background: 'rgba(255, 107, 0, 0.9)',
            color: '#FFFFFF',
          }}
        >
          YOU
        </div>
      </div>
      
      {/* Name */}
      <div 
        className="mt-2 text-center text-sm font-medium truncate"
        style={{ color: '#FFFFFF' }}
      >
        {name}
      </div>
      
      {/* Muted Indicator */}
      {isMuted && isActive && (
        <div 
          className="absolute bottom-8 left-2 p-1 rounded-full"
          style={{ background: 'rgba(255, 107, 0, 0.9)' }}
        >
          <MicOff size={10} style={{ color: '#FFFFFF' }} />
        </div>
      )}
    </div>
  );
};

export default LocalParticipantCard;
