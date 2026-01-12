import React from 'react';
import ParticipantVideo from './ParticipantVideo';
import { useDailyContext, Participant } from '../contexts/DailyContext';

type LayoutType = 'single' | 'split' | 'grid' | 'pip';

interface ParticipantGridProps {
  layout?: LayoutType;
  maxParticipants?: number;
  showNames?: boolean;
  showControls?: boolean;
  className?: string;
  isProgram?: boolean; // Se true, mostra no PROGRAM, senão no PREVIEW
}

/**
 * ParticipantGrid Component
 * 
 * Renderiza os participantes do Daily.co em um grid de acordo com o layout selecionado.
 * Similar ao StreamYard, onde múltiplos participantes aparecem na tela.
 */
const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  layout = 'grid',
  maxParticipants = 9,
  showNames = true,
  showControls = true,
  className = '',
  isProgram = false,
}) => {
  const { participants, getVideoTrack, getAudioTrack, isConnected } = useDailyContext();

  // Se não está conectado ao Daily.co, mostrar placeholder
  if (!isConnected || participants.length === 0) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-900 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-gray-400 text-sm">Aguardando participantes...</p>
          <p className="text-gray-500 text-xs mt-1">Convide pessoas para entrar na live</p>
        </div>
      </div>
    );
  }

  // Limitar número de participantes
  const visibleParticipants = participants.slice(0, maxParticipants);
  const count = visibleParticipants.length;

  // Calcular grid baseado no layout e número de participantes
  const getGridClass = () => {
    switch (layout) {
      case 'single':
        return 'grid-cols-1 grid-rows-1';
      case 'split':
        return count <= 2 ? 'grid-cols-2 grid-rows-1' : 'grid-cols-2 grid-rows-2';
      case 'pip':
        return 'grid-cols-1 grid-rows-1'; // PiP é tratado diferente
      case 'grid':
      default:
        if (count === 1) return 'grid-cols-1 grid-rows-1';
        if (count === 2) return 'grid-cols-2 grid-rows-1';
        if (count <= 4) return 'grid-cols-2 grid-rows-2';
        if (count <= 6) return 'grid-cols-3 grid-rows-2';
        return 'grid-cols-3 grid-rows-3';
    }
  };

  // Renderizar layout PiP (Picture in Picture)
  if (layout === 'pip' && count >= 2) {
    const mainParticipant = visibleParticipants[0];
    const pipParticipants = visibleParticipants.slice(1, 4); // Máximo 3 no PiP

    return (
      <div className={`relative w-full h-full bg-gray-900 ${className}`}>
        {/* Participante principal */}
        <ParticipantVideo
          participantId={mainParticipant.id}
          name={mainParticipant.name}
          videoTrack={getVideoTrack(mainParticipant.id)}
          audioTrack={getAudioTrack(mainParticipant.id)}
          isLocal={mainParticipant.isLocal}
          isMuted={mainParticipant.isMuted}
          isCameraOff={mainParticipant.isCameraOff}
          showControls={showControls}
          showName={showNames}
          className="w-full h-full"
        />

        {/* Participantes em PiP */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          {pipParticipants.map((participant) => (
            <div key={participant.id} className="w-32 h-24 rounded-lg overflow-hidden shadow-lg">
              <ParticipantVideo
                participantId={participant.id}
                name={participant.name}
                videoTrack={getVideoTrack(participant.id)}
                audioTrack={getAudioTrack(participant.id)}
                isLocal={participant.isLocal}
                isMuted={participant.isMuted}
                isCameraOff={participant.isCameraOff}
                showControls={false}
                showName={showNames}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Renderizar grid normal
  return (
    <div className={`w-full h-full grid gap-1 p-1 bg-gray-900 ${getGridClass()} ${className}`}>
      {visibleParticipants.map((participant) => (
        <ParticipantVideo
          key={participant.id}
          participantId={participant.id}
          name={participant.name}
          videoTrack={getVideoTrack(participant.id)}
          audioTrack={getAudioTrack(participant.id)}
          isLocal={participant.isLocal}
          isMuted={participant.isMuted}
          isCameraOff={participant.isCameraOff}
          showControls={showControls}
          showName={showNames}
        />
      ))}

      {/* Mostrar contador se há mais participantes */}
      {participants.length > maxParticipants && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
          +{participants.length - maxParticipants} mais
        </div>
      )}
    </div>
  );
};

export default ParticipantGrid;
