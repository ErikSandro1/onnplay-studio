import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Participant } from '../types/studio';

// Daily.co types (will be replaced with actual Daily types when installed)
interface DailyCall {
  join: (options: any) => Promise<void>;
  leave: () => Promise<void>;
  setLocalAudio: (enabled: boolean) => void;
  setLocalVideo: (enabled: boolean) => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  participants: () => Record<string, any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
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

  const [callObject, setCallObject] = useState<DailyCall | null>(null);

  /**
   * Join a Daily.co room
   * NOTE: This is a placeholder. Actual implementation requires Daily.co SDK
   */
  const joinRoom = useCallback(async (url: string, userName: string = 'User') => {
    setIsConnecting(true);
    setError(null);

    try {
      // TODO: Replace with actual Daily.co initialization
      // const daily = DailyIframe.createCallObject();
      // await daily.join({ url, userName });
      // setCallObject(daily);

      // For now, simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create mock local participant
      const mockLocal: Participant = {
        id: 'local',
        name: userName,
        isMuted: !isAudioEnabled,
        isCameraOff: !isVideoEnabled,
        isSpeaking: false,
        isLocal: true,
      };

      setLocalParticipant(mockLocal);
      setParticipants([mockLocal]);
      setRoomUrl(url);
      setIsConnected(true);
      setIsConnecting(false);

      console.log('✅ Daily.co integration ready - waiting for SDK installation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      setIsConnecting(false);
    }
  }, [isAudioEnabled, isVideoEnabled]);

  /**
   * Leave the Daily.co room
   */
  const leaveRoom = useCallback(async () => {
    try {
      if (callObject) {
        await callObject.leave();
      }

      setCallObject(null);
      setIsConnected(false);
      setRoomUrl(null);
      setParticipants([]);
      setLocalParticipant(null);
      setIsScreenSharing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave room');
    }
  }, [callObject]);

  /**
   * Toggle local audio
   */
  const toggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);

    if (callObject) {
      callObject.setLocalAudio(newState);
    }

    // Update local participant
    if (localParticipant) {
      setLocalParticipant({
        ...localParticipant,
        isMuted: !newState,
      });
    }
  }, [isAudioEnabled, callObject, localParticipant]);

  /**
   * Toggle local video
   */
  const toggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);

    if (callObject) {
      callObject.setLocalVideo(newState);
    }

    // Update local participant
    if (localParticipant) {
      setLocalParticipant({
        ...localParticipant,
        isCameraOff: !newState,
      });
    }
  }, [isVideoEnabled, callObject, localParticipant]);

  /**
   * Toggle screen share
   */
  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        if (callObject) {
          callObject.stopScreenShare();
        }
        setIsScreenSharing(false);
      } else {
        if (callObject) {
          await callObject.startScreenShare();
        }
        setIsScreenSharing(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle screen share');
    }
  }, [isScreenSharing, callObject]);

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
  };

  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
};
