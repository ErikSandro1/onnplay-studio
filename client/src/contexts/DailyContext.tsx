import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Participant } from '../types/studio';

// Daily.co types (from CDN)
declare global {
  interface Window {
    DailyIframe: any;
  }
}

interface DailyParticipant {
  user_id: string;
  user_name: string;
  local: boolean;
  audio: boolean;
  video: boolean;
  screen: boolean;
  tracks: {
    audio?: {
      state: string;
      track?: MediaStreamTrack;
    };
    video?: {
      state: string;
      track?: MediaStreamTrack;
    };
    screenVideo?: {
      state: string;
      track?: MediaStreamTrack;
    };
  };
}

interface DailyContextValue {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  roomUrl: string | null;
  error: string | null;

  // Participants
  participants: Participant[];
  localParticipant: Participant | null;

  // Actions
  joinRoom: (roomUrl: string, userName?: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;

  // State
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;

  // Video tracks
  getVideoTrack: (participantId: string) => MediaStreamTrack | null;
  getAudioTrack: (participantId: string) => MediaStreamTrack | null;
}

const DailyContext = createContext<DailyContextValue | null>(null);

export const useDailyContext = () => {
  const context = useContext(DailyContext);
  if (!context) {
    throw new Error('useDailyContext must be used within DailyProvider');
  }
  return context;
};

interface DailyProviderProps {
  children: React.ReactNode;
}

export const DailyProvider: React.FC<DailyProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<Participant | null>(null);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const callObjectRef = useRef<any>(null);
  const participantTracksRef = useRef<Map<string, { video?: MediaStreamTrack; audio?: MediaStreamTrack }>>(new Map());

  /**
   * Convert Daily participant to our Participant type
   */
  const convertParticipant = useCallback((dailyParticipant: DailyParticipant, id: string): Participant => {
    return {
      id,
      name: dailyParticipant.user_name || 'Guest',
      isMuted: !dailyParticipant.audio,
      isCameraOff: !dailyParticipant.video,
      isSpeaking: false,
      isLocal: dailyParticipant.local,
    };
  }, []);

  /**
   * Update participants from Daily.co
   */
  const updateParticipants = useCallback(() => {
    if (!callObjectRef.current) return;

    const dailyParticipants = callObjectRef.current.participants();
    const participantList: Participant[] = [];
    let local: Participant | null = null;

    // Update tracks map
    Object.entries(dailyParticipants).forEach(([id, p]: [string, any]) => {
      const tracks = {
        video: p.tracks?.video?.track,
        audio: p.tracks?.audio?.track,
      };
      participantTracksRef.current.set(id, tracks);

      const participant = convertParticipant(p, id);
      participantList.push(participant);

      if (p.local) {
        local = participant;
      }
    });

    setParticipants(participantList);
    setLocalParticipant(local);
  }, [convertParticipant]);

  /**
   * Join a Daily.co room
   */
  const joinRoom = useCallback(async (url: string, userName: string = 'Host') => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if Daily.co SDK is loaded
      if (!window.DailyIframe) {
        throw new Error('Daily.co SDK not loaded');
      }

      // Create call object
      const callObject = window.DailyIframe.createCallObject({
        audioSource: true,
        videoSource: true,
      });

      callObjectRef.current = callObject;

      // Set up event listeners
      callObject
        .on('joined-meeting', () => {
          console.log('✅ Joined Daily.co meeting');
          setIsConnected(true);
          setIsConnecting(false);
          updateParticipants();
        })
        .on('left-meeting', () => {
          console.log('👋 Left Daily.co meeting');
          setIsConnected(false);
          setParticipants([]);
          setLocalParticipant(null);
        })
        .on('participant-joined', (event: any) => {
          console.log('👤 Participant joined:', event.participant.user_name);
          updateParticipants();
        })
        .on('participant-updated', (event: any) => {
          console.log('🔄 Participant updated:', event.participant.user_name);
          updateParticipants();
        })
        .on('participant-left', (event: any) => {
          console.log('👋 Participant left:', event.participant.user_name);
          participantTracksRef.current.delete(event.participant.session_id);
          updateParticipants();
        })
        .on('track-started', (event: any) => {
          console.log('🎥 Track started:', event.participant?.user_name, event.track.kind);
          updateParticipants();
        })
        .on('track-stopped', (event: any) => {
          console.log('⏹️ Track stopped:', event.participant?.user_name, event.track.kind);
          updateParticipants();
        })
        .on('error', (event: any) => {
          console.error('❌ Daily.co error:', event.errorMsg);
          setError(event.errorMsg);
        });

      // Join the room
      await callObject.join({
        url,
        userName,
      });

      setRoomUrl(url);
    } catch (err) {
      console.error('❌ Failed to join room:', err);
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setIsConnecting(false);
    }
  }, [updateParticipants]);

  /**
   * Leave the Daily.co room
   */
  const leaveRoom = useCallback(async () => {
    try {
      if (callObjectRef.current) {
        await callObjectRef.current.leave();
        await callObjectRef.current.destroy();
        callObjectRef.current = null;
      }

      participantTracksRef.current.clear();
      setIsConnected(false);
      setRoomUrl(null);
      setParticipants([]);
      setLocalParticipant(null);
      setIsScreenSharing(false);
    } catch (err) {
      console.error('❌ Failed to leave room:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave room');
    }
  }, []);

  /**
   * Toggle local audio
   */
  const toggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);

    if (callObjectRef.current) {
      callObjectRef.current.setLocalAudio(newState);
    }
  }, [isAudioEnabled]);

  /**
   * Toggle local video
   */
  const toggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);

    if (callObjectRef.current) {
      callObjectRef.current.setLocalVideo(newState);
    }
  }, [isVideoEnabled]);

  /**
   * Toggle screen share
   */
  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        if (callObjectRef.current) {
          await callObjectRef.current.stopScreenShare();
        }
        setIsScreenSharing(false);
      } else {
        if (callObjectRef.current) {
          await callObjectRef.current.startScreenShare();
        }
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('❌ Failed to toggle screen share:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle screen share');
    }
  }, [isScreenSharing]);

  /**
   * Get video track for a participant
   */
  const getVideoTrack = useCallback((participantId: string): MediaStreamTrack | null => {
    return participantTracksRef.current.get(participantId)?.video || null;
  }, []);

  /**
   * Get audio track for a participant
   */
  const getAudioTrack = useCallback((participantId: string): MediaStreamTrack | null => {
    return participantTracksRef.current.get(participantId)?.audio || null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
      }
    };
  }, []);

  const value: DailyContextValue = {
    isConnected,
    isConnecting,
    roomUrl,
    error,
    participants,
    localParticipant,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    getVideoTrack,
    getAudioTrack,
  };

  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
};
