// Core Studio Types

export type SourceType = 'camera' | 'screen' | 'media' | 'rtmp';

export type TransitionType = 'cut' | 'fade' | 'wipe' | 'mix';

export type LayoutType = 'single' | 'pip' | 'split' | 'grid-2x2' | 'grid-3x3';

export interface VideoSource {
  id: string;
  type: SourceType;
  name: string;
  isActive: boolean;
  isAvailable: boolean;
  thumbnail?: string;
  // For camera sources
  deviceId?: string;
  // For media sources
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  // For RTMP sources
  rtmpUrl?: string;
  // For screen share
  streamId?: string;
}

export interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
  isLocal?: boolean;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
}

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // milliseconds
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface LayoutConfig {
  type: LayoutType;
  sources: string[]; // source IDs
  positions?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

export interface StreamDestination {
  id: string;
  platform: 'youtube' | 'facebook' | 'twitch' | 'rtmp';
  name: string;
  isActive: boolean;
  streamKey?: string;
  streamUrl?: string;
  status: 'idle' | 'connecting' | 'live' | 'error';
  error?: string;
}

export interface RecordingConfig {
  quality?: 'low' | 'medium' | 'high' | '720p' | '1080p' | '4k';
  fps?: 30 | 60;
  format: 'mp4' | 'webm';
  saveLocal?: boolean;
  savePath?: string;
}

export interface BroadcastState {
  isLive: boolean;
  isRecording: boolean;
  startTime?: Date;
  duration: number; // seconds
  viewers: number;
  bitrate: number; // kbps
}

export interface StudioState {
  // Sources
  sources: VideoSource[];
  previewSourceId: string | null;
  programSourceId: string | null;
  
  // Layout
  layout: LayoutConfig;
  
  // Transition
  isTransitioning: boolean;
  transitionConfig: TransitionConfig;
  
  // Participants
  participants: Participant[];
  
  // Broadcast
  broadcast: BroadcastState;
  
  // Destinations
  destinations: StreamDestination[];
  
  // Recording
  recording: RecordingConfig;
}
