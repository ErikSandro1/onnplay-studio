import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface ParticipantVideoProps {
  participantId: string;
  name: string;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  isLocal?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  showControls?: boolean;
  showName?: boolean;
  className?: string;
}

/**
 * ParticipantVideo Component
 * 
 * Renderiza o vídeo de um participante do Daily.co com nome e indicadores.
 */
const ParticipantVideo: React.FC<ParticipantVideoProps> = ({
  participantId,
  name,
  videoTrack,
  audioTrack,
  isLocal = false,
  isMuted = false,
  isCameraOff = false,
  showControls = true,
  showName = true,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Conectar o track de vídeo ao elemento video
  useEffect(() => {
    if (videoRef.current && videoTrack) {
      const stream = new MediaStream([videoTrack]);
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn(`[ParticipantVideo] Autoplay blocked for ${name}:`, err);
      });
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [videoTrack, name]);

  // Gerar cor de fundo baseada no nome
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-600', 'bg-green-600', 'bg-purple-600', 
      'bg-pink-600', 'bg-orange-600', 'bg-teal-600',
      'bg-red-600', 'bg-indigo-600', 'bg-yellow-600'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className={`relative w-full h-full bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Vídeo */}
      {videoTrack && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video to prevent echo
          className="w-full h-full object-cover"
        />
      ) : (
        /* Avatar quando câmera está desligada */
        <div className="w-full h-full flex items-center justify-center">
          <div className={`w-20 h-20 rounded-full ${getAvatarColor(name)} flex items-center justify-center`}>
            <span className="text-3xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Nome do participante */}
      {showName && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate">
              {name} {isLocal && '(Você)'}
            </span>
            {showControls && (
              <div className="flex gap-1 ml-auto">
                {isMuted ? (
                  <MicOff className="w-4 h-4 text-red-500" />
                ) : (
                  <Mic className="w-4 h-4 text-green-500" />
                )}
                {isCameraOff && (
                  <VideoOff className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indicador de local/você */}
      {isLocal && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-600 rounded text-xs text-white font-medium">
          YOU
        </div>
      )}

      {/* Borda verde quando está ao vivo */}
      <div className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none opacity-50" />
    </div>
  );
};

export { ParticipantVideo };
export default ParticipantVideo;
