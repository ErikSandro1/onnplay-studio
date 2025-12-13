import React, { useEffect, useRef } from 'react';
import { useDailyContext } from '../contexts/DailyContext';

interface ParticipantVideoProps {
  participantId: string;
  participantName: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  className?: string;
}

export const ParticipantVideo: React.FC<ParticipantVideoProps> = ({
  participantId,
  participantName,
  isLocal = false,
  isMuted = false,
  isCameraOff = false,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { getVideoTrack, getAudioTrack } = useDailyContext();

  // Update video track
  useEffect(() => {
    const videoTrack = getVideoTrack(participantId);
    
    if (videoRef.current && videoTrack) {
      const stream = new MediaStream([videoTrack]);
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.warn('Failed to play video:', err);
      });
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [participantId, getVideoTrack]);

  // Update audio track (only for remote participants)
  useEffect(() => {
    if (isLocal) return; // Don't play local audio (causes echo)

    const audioTrack = getAudioTrack(participantId);
    
    if (audioRef.current && audioTrack) {
      const stream = new MediaStream([audioTrack]);
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(err => {
        console.warn('Failed to play audio:', err);
      });
    } else if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  }, [participantId, isLocal, getAudioTrack]);

  return (
    <div className={`relative w-full h-full bg-gray-900 ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local video to prevent echo
        className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
        style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }} // Mirror local video
      />

      {/* Audio element (hidden, only for remote participants) */}
      {!isLocal && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          className="hidden"
        />
      )}

      {/* Camera off placeholder */}
      {isCameraOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {participantName.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-white text-lg font-medium">{participantName}</p>
            <p className="text-gray-400 text-sm mt-1">Camera Off</p>
          </div>
        </div>
      )}

      {/* Participant info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">
              {participantName}
              {isLocal && ' (You)'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Muted indicator */}
            {isMuted && (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
