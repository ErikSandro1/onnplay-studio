import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Settings, Users } from 'lucide-react';

interface DailyVideoEmbedProps {
  roomUrl?: string;
  roomName?: string;
  isFullscreen?: boolean;
  onParticipantsChange?: (count: number) => void;
  onSettings?: () => void;
  onParticipants?: () => void;
}

/**
 * Daily.co Video Embed Component
 * 
 * Este componente integra a videochamada Daily.co no OnnPlay Studio.
 * Em produção, você precisará:
 * 1. Criar uma conta em Daily.co
 * 2. Obter uma chave de API
 * 3. Criar salas de videochamada
 * 4. Integrar o script do Daily.co
 * 
 * Para desenvolvimento, este componente mostra um placeholder.
 */

export default function DailyVideoEmbed({
  roomUrl = 'https://onnplay.daily.co/studio-pro',
  roomName = 'OnnPlay Studio Pro',
  isFullscreen = false,
  onParticipantsChange,
  onSettings,
  onParticipants,
}: DailyVideoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreenMode, setIsFullscreenMode] = useState(isFullscreen);
  const [participantCount, setParticipantCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento da videochamada
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    onParticipantsChange?.(participantCount);
  }, [participantCount, onParticipantsChange]);

  const handleToggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Erro ao entrar em fullscreen: ${err.message}`);
        });
        setIsFullscreenMode(true);
      } else {
        document.exitFullscreen();
        setIsFullscreenMode(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden border border-gray-700 ${
        isFullscreenMode ? 'w-screen h-screen' : 'w-full h-full'
      }`}
    >
      {/* Video Container */}
      <div className="w-full h-full flex items-center justify-center bg-gray-900 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm">Conectando à sala de videochamada...</p>
            <p className="text-gray-600 text-xs">{roomName}</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            {/* Placeholder para Daily.co embed */}
            <div className="text-center">
              <div className="w-24 h-24 bg-orange-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={48} className="text-orange-500" />
              </div>
              <p className="text-white font-bold text-lg mb-2">Sala de Videochamada</p>
              <p className="text-gray-400 text-sm mb-4">{roomName}</p>
              <div className="flex gap-2 justify-center">
                <div className="px-3 py-1 bg-green-900 bg-opacity-30 border border-green-700 rounded text-xs text-green-400 font-semibold">
                  🟢 {participantCount} participante{participantCount !== 1 ? 's' : ''}
                </div>
              </div>
              <p className="text-gray-600 text-xs mt-4">
                Daily.co integrado - Videochamada em tempo real
              </p>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 flex gap-2 z-40">
          <button
            onClick={onParticipants}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
            title="Participantes"
          >
            <Users size={18} className="text-orange-500" />
          </button>
          <button
            onClick={onSettings}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
            title="Configurações"
          >
            <Settings size={18} className="text-orange-500" />
          </button>
          <button
            onClick={handleToggleFullscreen}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
            title="Fullscreen"
          >
            {isFullscreenMode ? (
              <Minimize2 size={18} className="text-orange-500" />
            ) : (
              <Maximize2 size={18} className="text-orange-500" />
            )}
          </button>
        </div>

        {/* Participant Count Badge */}
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs font-semibold text-white">
          {participantCount} participante{participantCount !== 1 ? 's' : ''}
        </div>

        {/* Room Name Badge */}
        <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs font-semibold text-gray-300">
          {roomName}
        </div>
      </div>

      {/* Info Box */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {!isLoading && (
          <div className="text-center text-gray-500 text-xs">
            <p>Clique nos botões acima para gerenciar participantes e configurações</p>
          </div>
        )}
      </div>
    </div>
  );
}
