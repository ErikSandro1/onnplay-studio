/**
 * Streaming Configuration
 * 
 * Feature flag para alternar entre MediaRecorder e WebRTC
 * Configurável via DiagnosticsPanel
 */

// Chave para localStorage
const STORAGE_KEY = 'onnplay_streaming_mode';

export type StreamingMode = 'mediarecorder' | 'webrtc';

/**
 * Obtém o modo de streaming atual
 */
export function getStreamingMode(): StreamingMode {
  if (typeof window === 'undefined') return 'mediarecorder';
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'webrtc') return 'webrtc';
  return 'mediarecorder'; // Default - MediaRecorder (estável)
}

/**
 * Define o modo de streaming
 */
export function setStreamingMode(mode: StreamingMode): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(STORAGE_KEY, mode);
  console.log(`[StreamingConfig] Mode set to: ${mode}`);
}

/**
 * Verifica se WebRTC está habilitado
 */
export function isWebRTCEnabled(): boolean {
  return getStreamingMode() === 'webrtc';
}

// Log inicial
if (typeof window !== 'undefined') {
  console.log(`[StreamingConfig] Current mode: ${getStreamingMode()}`);
}
