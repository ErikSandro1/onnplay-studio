import { useState } from 'react';
import { X, Video, HardDrive, Zap, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface RecordingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: RecordingConfig) => void;
}

export interface RecordingConfig {
  quality: '4k' | '1080p' | '720p' | '480p';
  format: 'mp4' | 'mkv' | 'mov' | 'hls';
  bitrate: number; // Mbps
  fps: 30 | 60 | 120;
  codec: 'h264' | 'h265' | 'vp9';
  audioCodec: 'aac' | 'opus' | 'mp3';
  audioBitrate: number; // kbps
  saveLocation: 'local' | 'cloud';
  autoSplit: boolean;
  splitDuration: number; // minutes
}

export default function RecordingSettings({ isOpen, onClose, onSave }: RecordingSettingsProps) {
  const [config, setConfig] = useState<RecordingConfig>({
    quality: '1080p',
    format: 'mp4',
    bitrate: 8,
    fps: 60,
    codec: 'h264',
    audioCodec: 'aac',
    audioBitrate: 192,
    saveLocation: 'local',
    autoSplit: false,
    splitDuration: 60,
  });

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(config);
    toast.success('Configurações de gravação salvas!', {
      description: `${config.quality} @ ${config.fps}fps, ${config.bitrate}Mbps`,
    });
    onClose();
  };

  const estimatedFileSize = () => {
    // Rough calculation: (video bitrate + audio bitrate) * duration / 8
    const videoBitrateMbps = config.bitrate;
    const audioBitrateMbps = config.audioBitrate / 1000;
    const totalMbps = videoBitrateMbps + audioBitrateMbps;
    const mbPerMinute = (totalMbps * 60) / 8;
    return mbPerMinute.toFixed(2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="text-red-500" size={24} />
            Configurações de Gravação
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Quality */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Qualidade de Vídeo
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['4k', '1080p', '720p', '480p'] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() => setConfig({ ...config, quality })}
                  className={`${
                    config.quality === quality
                      ? 'bg-orange-600 ring-2 ring-orange-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                  } text-white font-semibold py-2 px-4 rounded transition-all`}
                >
                  {quality.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* FPS */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Taxa de Quadros (FPS)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([30, 60, 120] as const).map((fps) => (
                <button
                  key={fps}
                  onClick={() => setConfig({ ...config, fps })}
                  className={`${
                    config.fps === fps
                      ? 'bg-orange-600 ring-2 ring-orange-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                  } text-white font-semibold py-2 px-4 rounded transition-all`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Bitrate */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Bitrate de Vídeo: {config.bitrate} Mbps
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={config.bitrate}
              onChange={(e) => setConfig({ ...config, bitrate: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Baixa (1 Mbps)</span>
              <span>Alta (50 Mbps)</span>
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Formato de Arquivo
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['mp4', 'mkv', 'mov', 'hls'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setConfig({ ...config, format })}
                  className={`${
                    config.format === format
                      ? 'bg-orange-600 ring-2 ring-orange-400'
                      : 'bg-gray-700 hover:bg-gray-600'
                  } text-white font-semibold py-2 px-4 rounded transition-all uppercase`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          {/* Codec */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Codec de Vídeo
              </label>
              <select
                value={config.codec}
                onChange={(e) => setConfig({ ...config, codec: e.target.value as any })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
              >
                <option value="h264">H.264 (Compatível)</option>
                <option value="h265">H.265 (Eficiente)</option>
                <option value="vp9">VP9 (Web)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Codec de Áudio
              </label>
              <select
                value={config.audioCodec}
                onChange={(e) => setConfig({ ...config, audioCodec: e.target.value as any })}
                className="w-full bg-gray-700 text-white rounded px-3 py-2"
              >
                <option value="aac">AAC (Recomendado)</option>
                <option value="opus">Opus (Alta Qualidade)</option>
                <option value="mp3">MP3 (Compatível)</option>
              </select>
            </div>
          </div>

          {/* Audio Bitrate */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Bitrate de Áudio: {config.audioBitrate} kbps
            </label>
            <input
              type="range"
              min="64"
              max="320"
              step="32"
              value={config.audioBitrate}
              onChange={(e) => setConfig({ ...config, audioBitrate: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Save Location */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Local de Salvamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfig({ ...config, saveLocation: 'local' })}
                className={`${
                  config.saveLocation === 'local'
                    ? 'bg-orange-600 ring-2 ring-orange-400'
                    : 'bg-gray-700 hover:bg-gray-600'
                } text-white font-semibold py-2 px-4 rounded transition-all flex items-center justify-center gap-2`}
              >
                <HardDrive size={18} />
                Local
              </button>
              <button
                onClick={() => setConfig({ ...config, saveLocation: 'cloud' })}
                className={`${
                  config.saveLocation === 'cloud'
                    ? 'bg-orange-600 ring-2 ring-orange-400'
                    : 'bg-gray-700 hover:bg-gray-600'
                } text-white font-semibold py-2 px-4 rounded transition-all flex items-center justify-center gap-2`}
              >
                <Zap size={18} />
                Nuvem
              </button>
            </div>
          </div>

          {/* Auto Split */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
            <div>
              <div className="text-white font-semibold">Divisão Automática</div>
              <div className="text-sm text-gray-400">
                Dividir gravação em arquivos de {config.splitDuration} minutos
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoSplit}
                onChange={(e) => setConfig({ ...config, autoSplit: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          {config.autoSplit && (
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Duração de Cada Arquivo: {config.splitDuration} minutos
              </label>
              <input
                type="range"
                min="10"
                max="120"
                step="10"
                value={config.splitDuration}
                onChange={(e) => setConfig({ ...config, splitDuration: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          {/* Estimated File Size */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-white font-semibold mb-2">
              <Settings2 size={18} className="text-orange-500" />
              Estimativa de Tamanho
            </div>
            <div className="text-2xl font-bold text-orange-500">
              ~{estimatedFileSize()} MB/min
            </div>
            <div className="text-sm text-gray-400 mt-1">
              1 hora = ~{(parseFloat(estimatedFileSize()) * 60 / 1024).toFixed(2)} GB
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors font-semibold"
          >
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}
