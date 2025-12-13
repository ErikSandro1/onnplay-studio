import { useState } from 'react';
import { Settings, X, Save, RotateCcw } from 'lucide-react';

interface AdvancedSettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdvancedSettings({ isOpen = false, onClose }: AdvancedSettingsProps) {
  const [settings, setSettings] = useState({
    // Video Settings
    videoResolution: '1080p',
    videoFramerate: 60,
    videoBitrate: 6000,
    
    // Audio Settings
    audioSampleRate: 48000,
    audioBitrate: 128,
    
    // Network Settings
    bufferSize: 2,
    reconnectTimeout: 10,
    
    // Advanced
    enableHardwareAccel: true,
    enableLowLatency: true,
    enableAutoAdjust: true,
  });

  const handleSave = () => {
    console.log('Configurações salvas:', settings);
    onClose?.();
  };

  const handleReset = () => {
    setSettings({
      videoResolution: '1080p',
      videoFramerate: 60,
      videoBitrate: 6000,
      audioSampleRate: 48000,
      audioBitrate: 128,
      bufferSize: 2,
      reconnectTimeout: 10,
      enableHardwareAccel: true,
      enableLowLatency: true,
      enableAutoAdjust: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-orange-500" />
            <h2 className="text-lg font-bold text-white">Configurações Avançadas</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Video Settings */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-500 mb-3">
              Configurações de Vídeo
            </h3>
            <div className="space-y-3 bg-gray-900 p-3 rounded border border-gray-700">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Resolução
                </label>
                <select
                  value={settings.videoResolution}
                  onChange={(e) =>
                    setSettings(prev => ({ ...prev, videoResolution: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="1440p">1440p (2K)</option>
                  <option value="4K">4K (Ultra HD)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Taxa de Quadros (FPS)
                  </label>
                  <input
                    type="number"
                    value={settings.videoFramerate}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        videoFramerate: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Bitrate (kbps)
                  </label>
                  <input
                    type="number"
                    value={settings.videoBitrate}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        videoBitrate: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audio Settings */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-500 mb-3">
              Configurações de Áudio
            </h3>
            <div className="space-y-3 bg-gray-900 p-3 rounded border border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Taxa de Amostragem (Hz)
                  </label>
                  <select
                    value={settings.audioSampleRate}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        audioSampleRate: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  >
                    <option value={44100}>44.1 kHz</option>
                    <option value={48000}>48 kHz</option>
                    <option value={96000}>96 kHz</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Bitrate (kbps)
                  </label>
                  <input
                    type="number"
                    value={settings.audioBitrate}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        audioBitrate: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Network Settings */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-500 mb-3">
              Configurações de Rede
            </h3>
            <div className="space-y-3 bg-gray-900 p-3 rounded border border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Tamanho do Buffer (s)
                  </label>
                  <input
                    type="number"
                    value={settings.bufferSize}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        bufferSize: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Timeout de Reconexão (s)
                  </label>
                  <input
                    type="number"
                    value={settings.reconnectTimeout}
                    onChange={(e) =>
                      setSettings(prev => ({
                        ...prev,
                        reconnectTimeout: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-500 mb-3">
              Opções Avançadas
            </h3>
            <div className="space-y-2 bg-gray-900 p-3 rounded border border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableHardwareAccel}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      enableHardwareAccel: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-300">Ativar Aceleração de Hardware</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableLowLatency}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      enableLowLatency: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-300">Modo de Baixa Latência</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableAutoAdjust}
                  onChange={(e) =>
                    setSettings(prev => ({
                      ...prev,
                      enableAutoAdjust: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-gray-600 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-300">Ajuste Automático de Qualidade</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700 bg-gray-800 sticky bottom-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors font-semibold"
          >
            <RotateCcw size={16} />
            Restaurar Padrão
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors font-semibold"
            >
              <Save size={16} />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
