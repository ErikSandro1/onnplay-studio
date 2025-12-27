/**
 * useVideoSources Hook
 * 
 * Connects the SourcesPanel UI with the VideoCompositor service
 * for efficient video composition and streaming.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { videoCompositor, VideoSource as CompositorSource } from '../services/VideoCompositor';

export interface UIVideoSource {
  id: string;
  name: string;
  type: 'camera' | 'screen' | 'media' | 'image';
  status: 'active' | 'inactive' | 'error';
  stream?: MediaStream;
  mediaUrl?: string;
  deviceId?: string;
  resolution?: string;
  muted: boolean;
  inProgram: boolean;
}

interface UseVideoSourcesReturn {
  sources: UIVideoSource[];
  selectedSourceId: string | null;
  isLoading: boolean;
  availableCameras: MediaDeviceInfo[];
  
  // Actions
  addCameraSource: (deviceId?: string) => Promise<void>;
  addScreenSource: () => Promise<void>;
  addMediaSource: (file: File) => Promise<void>;
  removeSource: (sourceId: string) => void;
  selectSource: (sourceId: string | null) => void;
  toggleSourceMute: (sourceId: string) => void;
  sendToProgram: (sourceId: string) => void;
  refreshCameras: () => Promise<void>;
}

export function useVideoSources(): UseVideoSourcesReturn {
  const [sources, setSources] = useState<UIVideoSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Load available cameras on mount
  useEffect(() => {
    refreshCameras();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sources.forEach(source => {
        if (source.stream) {
          source.stream.getTracks().forEach(track => track.stop());
        }
      });
    };
  }, []);

  const refreshCameras = useCallback(async () => {
    try {
      // Request permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(cameras);
    } catch (error) {
      console.error('[useVideoSources] Failed to load cameras:', error);
    }
  }, []);

  const addCameraSource = useCallback(async (deviceId?: string) => {
    setIsLoading(true);
    try {
      // Add to compositor
      const compositorSource = await videoCompositor.addCameraSource(deviceId);
      
      // Get video element from compositor source
      const videoElement = compositorSource.element as HTMLVideoElement;
      const settings = videoElement.srcObject instanceof MediaStream 
        ? videoElement.srcObject.getVideoTracks()[0]?.getSettings()
        : null;

      const cameraName = deviceId 
        ? availableCameras.find(c => c.deviceId === deviceId)?.label || 'Câmera'
        : 'Webcam';

      const uiSource: UIVideoSource = {
        id: compositorSource.id,
        name: cameraName.substring(0, 20),
        type: 'camera',
        status: 'active',
        stream: compositorSource.stream,
        deviceId,
        resolution: settings ? `${settings.width}x${settings.height}` : 'Auto',
        muted: false,
        inProgram: false,
      };

      setSources(prev => [...prev, uiSource]);
      setSelectedSourceId(uiSource.id);
      
      console.log('[useVideoSources] Added camera source:', uiSource.id);
    } catch (error) {
      console.error('[useVideoSources] Failed to add camera:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [availableCameras]);

  const addScreenSource = useCallback(async () => {
    setIsLoading(true);
    try {
      const compositorSource = await videoCompositor.addScreenSource();
      
      const videoElement = compositorSource.element as HTMLVideoElement;
      const settings = videoElement.srcObject instanceof MediaStream 
        ? videoElement.srcObject.getVideoTracks()[0]?.getSettings()
        : null;

      const uiSource: UIVideoSource = {
        id: compositorSource.id,
        name: 'Compartilhar Tela',
        type: 'screen',
        status: 'active',
        stream: compositorSource.stream,
        resolution: settings ? `${settings.width}x${settings.height}` : 'Auto',
        muted: false,
        inProgram: false,
      };

      // Handle when user stops sharing via browser UI
      if (compositorSource.stream) {
        compositorSource.stream.getVideoTracks()[0].onended = () => {
          removeSource(uiSource.id);
        };
      }

      setSources(prev => [...prev, uiSource]);
      setSelectedSourceId(uiSource.id);
      
      console.log('[useVideoSources] Added screen source:', uiSource.id);
    } catch (error) {
      console.error('[useVideoSources] Failed to add screen share:', error);
      // User cancelled - don't throw
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addMediaSource = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const compositorSource = await videoCompositor.addMediaSource(file);
      
      const isVideo = file.type.startsWith('video/');

      const uiSource: UIVideoSource = {
        id: compositorSource.id,
        name: file.name.substring(0, 20),
        type: isVideo ? 'media' : 'image',
        status: 'active',
        mediaUrl: URL.createObjectURL(file),
        resolution: 'Auto',
        muted: false,
        inProgram: false,
      };

      setSources(prev => [...prev, uiSource]);
      setSelectedSourceId(uiSource.id);
      
      console.log('[useVideoSources] Added media source:', uiSource.id);
    } catch (error) {
      console.error('[useVideoSources] Failed to add media:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeSource = useCallback((sourceId: string) => {
    // Remove from compositor
    videoCompositor.removeSource(sourceId);
    
    // Remove from UI state
    setSources(prev => {
      const source = prev.find(s => s.id === sourceId);
      if (source?.mediaUrl) {
        URL.revokeObjectURL(source.mediaUrl);
      }
      return prev.filter(s => s.id !== sourceId);
    });

    // Clear selection if removed source was selected
    setSelectedSourceId(prev => prev === sourceId ? null : prev);
    
    console.log('[useVideoSources] Removed source:', sourceId);
  }, []);

  const selectSource = useCallback((sourceId: string | null) => {
    setSelectedSourceId(sourceId);
  }, []);

  const toggleSourceMute = useCallback((sourceId: string) => {
    setSources(prev => prev.map(source => {
      if (source.id === sourceId && source.stream) {
        const newMuted = !source.muted;
        // Mute/unmute audio tracks
        source.stream.getAudioTracks().forEach(track => {
          track.enabled = !newMuted;
        });
        return { ...source, muted: newMuted };
      }
      return source;
    }));
  }, []);

  const sendToProgram = useCallback((sourceId: string) => {
    // Update compositor to show this source
    const compositorSource = videoCompositor.getSource(sourceId);
    if (compositorSource) {
      // Make all other sources invisible, this one visible and full screen
      videoCompositor.getSources().forEach(s => {
        videoCompositor.updateSource(s.id, { 
          visible: s.id === sourceId,
          x: 0,
          y: 0,
          width: 1280,
          height: 720,
        });
      });
    }

    // Update UI state
    setSources(prev => prev.map(source => ({
      ...source,
      inProgram: source.id === sourceId,
    })));

    console.log('[useVideoSources] Sent to program:', sourceId);
  }, []);

  return {
    sources,
    selectedSourceId,
    isLoading,
    availableCameras,
    addCameraSource,
    addScreenSource,
    addMediaSource,
    removeSource,
    selectSource,
    toggleSourceMute,
    sendToProgram,
    refreshCameras,
  };
}
