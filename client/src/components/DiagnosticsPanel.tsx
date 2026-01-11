/**
 * DiagnosticsPanel - Painel de Controle Manual para Diagnóstico
 * 
 * ETAPA 1 do Playbook Profissional de Streaming Estável v2
 * 
 * Objetivo: Instrumentação total com controles manuais.
 * Sem correção automática nesta etapa.
 * 
 * Controles disponíveis:
 * - Resolução (1080p, 720p, 480p, 360p)
 * - FPS (60, 30, 25, 20, 15)
 * - Bitrate de vídeo (6000, 4000, 3000, 2500, 2000, 1500, 1000 kbps)
 * - Bitrate de áudio (192, 128, 96, 64 kbps)
 * - Perfil de buffer (LOW, MED, HIGH)
 */

import React, { useState, useEffect } from 'react';
import { rtmpStreamService } from '../services/RTMPStreamService';
import { getStreamingMode, setStreamingMode, StreamingMode } from '../services/streamingConfig';

interface DiagnosticsConfig {
  resolution: '1080p' | '720p' | '480p' | '360p';
  fps: 60 | 30 | 25 | 20 | 15;
  videoBitrate: number; // kbps
  audioBitrate: number; // kbps
  bufferProfile: 'LOW' | 'MED' | 'HIGH';
}

const RESOLUTION_OPTIONS = [
  { value: '1080p', label: '1080p (1920x1080)', width: 1920, height: 1080 },
  { value: '720p', label: '720p (1280x720)', width: 1280, height: 720 },
  { value: '480p', label: '480p (854x480)', width: 854, height: 480 },
  { value: '360p', label: '360p (640x360)', width: 640, height: 360 },
];

const FPS_OPTIONS = [60, 30, 25, 20, 15];

const VIDEO_BITRATE_OPTIONS = [
  { value: 6000, label: '6000 kbps (6 Mbps)' },
  { value: 4000, label: '4000 kbps (4 Mbps)' },
  { value: 3000, label: '3000 kbps (3 Mbps)' },
  { value: 2500, label: '2500 kbps (2.5 Mbps) - Preset Onnplay' },
  { value: 2000, label: '2000 kbps (2 Mbps)' },
  { value: 1500, label: '1500 kbps (1.5 Mbps)' },
  { value: 1000, label: '1000 kbps (1 Mbps)' },
];

const AUDIO_BITRATE_OPTIONS = [
  { value: 192, label: '192 kbps' },
  { value: 128, label: '128 kbps - Preset Onnplay' },
  { value: 96, label: '96 kbps' },
  { value: 64, label: '64 kbps' },
];

const BUFFER_PROFILE_OPTIONS = [
  { value: 'LOW', label: 'LOW (32 KB)', size: 32 },
  { value: 'MED', label: 'MED (64 KB) - Preset Onnplay', size: 64 },
  { value: 'HIGH', label: 'HIGH (128 KB)', size: 128 },
];

export const DiagnosticsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<DiagnosticsConfig>({
    resolution: '720p',
    fps: 30,
    videoBitrate: 2500,
    audioBitrate: 128,
    bufferProfile: 'MED',
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMode, setStreamingModeState] = useState<StreamingMode>(getStreamingMode());

  useEffect(() => {
    // Check if streaming
    const checkStreamingStatus = () => {
      const stats = rtmpStreamService.getStats();
      setIsStreaming(stats.isStreaming);
    };

    checkStreamingStatus();
    const interval = setInterval(checkStreamingStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStreamingModeChange = (mode: StreamingMode) => {
    setStreamingMode(mode);
    setStreamingModeState(mode);
    console.log('[DiagnosticsPanel] Streaming mode changed to:', mode);
  };

  const handleApplyConfig = () => {
    const resolutionData = RESOLUTION_OPTIONS.find(r => r.value === config.resolution);
    const bufferData = BUFFER_PROFILE_OPTIONS.find(b => b.value === config.bufferProfile);

    if (!resolutionData || !bufferData) {
      console.error('[DiagnosticsPanel] Invalid configuration');
      return;
    }

    console.log('[DiagnosticsPanel] 🔧 APPLYING MANUAL CONFIGURATION:');
    console.log(`  Resolution: ${config.resolution} (${resolutionData.width}x${resolutionData.height})`);
    console.log(`  FPS: ${config.fps}`);
    console.log(`  Video Bitrate: ${config.videoBitrate} kbps`);
    console.log(`  Audio Bitrate: ${config.audioBitrate} kbps`);
    console.log(`  Buffer Profile: ${config.bufferProfile} (${bufferData.size} KB)`);

    // Apply configuration to RTMPStreamService
    rtmpStreamService.updateConfig({
      width: resolutionData.width,
      height: resolutionData.height,
      frameRate: config.fps,
      videoBitrate: config.videoBitrate * 1000, // Convert to bps
      audioBitrate: config.audioBitrate * 1000, // Convert to bps
      bufferSize: bufferData.size,
    });

    console.log('[DiagnosticsPanel] ✅ Configuration applied successfully');
    console.log('[DiagnosticsPanel] ⚠️ Restart the stream for changes to take effect');
  };

  const handlePresetOnnplay = () => {
    setConfig({
      resolution: '720p',
      fps: 30,
      videoBitrate: 2500,
      audioBitrate: 128,
      bufferProfile: 'MED',
    });
    console.log('[DiagnosticsPanel] 📋 Preset Onnplay loaded');
  };

  const handlePresetConservative = () => {
    setConfig({
      resolution: '480p',
      fps: 25,
      videoBitrate: 1500,
      audioBitrate: 96,
      bufferProfile: 'HIGH',
    });
    console.log('[DiagnosticsPanel] 📋 Preset Conservative loaded (for slow networks)');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50"
        title="Open Diagnostics Panel"
      >
        🔧 Diagnóstico
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl p-6 w-96 z-50 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          🔧 Painel de Diagnóstico
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
        <strong>⚠️ ETAPA 1:</strong> Instrumentação Total
        <br />
        Controles manuais para diagnóstico.
        <br />
        {isStreaming && <span className="text-red-600 dark:text-red-400">Reinicie a live para aplicar mudanças.</span>}
      </div>

      {/* Resolution */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Resolução
        </label>
        <select
          value={config.resolution}
          onChange={(e) => setConfig({ ...config, resolution: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {RESOLUTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* FPS */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          FPS (Frames por Segundo)
        </label>
        <select
          value={config.fps}
          onChange={(e) => setConfig({ ...config, fps: parseInt(e.target.value) as any })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {FPS_OPTIONS.map((fps) => (
            <option key={fps} value={fps}>
              {fps} FPS
            </option>
          ))}
        </select>
      </div>

      {/* Video Bitrate */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Bitrate de Vídeo
        </label>
        <select
          value={config.videoBitrate}
          onChange={(e) => setConfig({ ...config, videoBitrate: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {VIDEO_BITRATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Audio Bitrate */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Bitrate de Áudio
        </label>
        <select
          value={config.audioBitrate}
          onChange={(e) => setConfig({ ...config, audioBitrate: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {AUDIO_BITRATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Streaming Mode Toggle */}
      <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
          🚀 Modo de Streaming
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleStreamingModeChange('mediarecorder')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              streamingMode === 'mediarecorder'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            📹 MediaRecorder
          </button>
          <button
            onClick={() => handleStreamingModeChange('webrtc')}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              streamingMode === 'webrtc'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            🌐 WebRTC Pro
          </button>
        </div>
        <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">
          {streamingMode === 'webrtc' 
            ? '✨ Modo profissional: RTP contínuo, clock único, baixa latência'
            : '⚡ Modo estável: Compatível com mais navegadores'}
        </p>
      </div>

      {/* Buffer Profile */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Perfil de Buffer
        </label>
        <select
          value={config.bufferProfile}
          onChange={(e) => setConfig({ ...config, bufferProfile: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {BUFFER_PROFILE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Presets */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={handlePresetOnnplay}
          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
        >
          📋 Preset Onnplay
        </button>
        <button
          onClick={handlePresetConservative}
          className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-md"
        >
          🐢 Conservador
        </button>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApplyConfig}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
      >
        ✅ Aplicar Configuração
      </button>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <strong>Nota:</strong> As mudanças só terão efeito após reiniciar a transmissão.
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
