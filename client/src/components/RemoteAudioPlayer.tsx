import React, { useEffect, useRef } from 'react';
import { useDailyContext } from '../contexts/DailyContext';

/**
 * RemoteAudioPlayer Component
 * 
 * Este componente reproduz o áudio de todos os participantes remotos do Daily.co.
 * Ele cria elementos <audio> invisíveis para cada participante remoto.
 */
const RemoteAudioPlayer: React.FC = () => {
  const { participants, getAudioTrack, isConnected } = useDailyContext();
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!isConnected) {
      // Limpar todos os elementos de áudio quando desconectar
      audioElementsRef.current.forEach((audio) => {
        audio.srcObject = null;
        audio.remove();
      });
      audioElementsRef.current.clear();
      return;
    }

    // Filtrar apenas participantes remotos (não locais)
    const remoteParticipants = participants.filter(p => !p.isLocal);

    // Criar/atualizar elementos de áudio para cada participante remoto
    remoteParticipants.forEach((participant) => {
      const audioTrack = getAudioTrack(participant.id);
      
      if (audioTrack) {
        let audioElement = audioElementsRef.current.get(participant.id);
        
        if (!audioElement) {
          // Criar novo elemento de áudio
          audioElement = document.createElement('audio');
          audioElement.autoplay = true;
          audioElement.playsInline = true;
          audioElement.id = `remote-audio-${participant.id}`;
          document.body.appendChild(audioElement);
          audioElementsRef.current.set(participant.id, audioElement);
          console.log(`[RemoteAudio] Created audio element for ${participant.name}`);
        }

        // Atualizar o stream de áudio
        const currentStream = audioElement.srcObject as MediaStream | null;
        const currentTrack = currentStream?.getAudioTracks()[0];
        
        if (currentTrack?.id !== audioTrack.id) {
          const stream = new MediaStream([audioTrack]);
          audioElement.srcObject = stream;
          audioElement.play().catch(err => {
            console.warn(`[RemoteAudio] Autoplay blocked for ${participant.name}:`, err);
          });
          console.log(`[RemoteAudio] Updated audio stream for ${participant.name}`);
        }
      }
    });

    // Remover elementos de áudio de participantes que saíram
    const remoteIds = new Set(remoteParticipants.map(p => p.id));
    audioElementsRef.current.forEach((audio, participantId) => {
      if (!remoteIds.has(participantId)) {
        audio.srcObject = null;
        audio.remove();
        audioElementsRef.current.delete(participantId);
        console.log(`[RemoteAudio] Removed audio element for participant ${participantId}`);
      }
    });

  }, [participants, getAudioTrack, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioElementsRef.current.forEach((audio) => {
        audio.srcObject = null;
        audio.remove();
      });
      audioElementsRef.current.clear();
    };
  }, []);

  // Este componente não renderiza nada visível
  return null;
};

export default RemoteAudioPlayer;
