import { useState } from 'react';
import { Volume2, Sliders, Zap, Shield, X } from 'lucide-react';
import { toast } from 'sonner';

interface AudioProcessorProps {
  isOpen: boolean;
  onClose: () => void;
  sourceId: string;
  sourceName: string;
}

interface AudioSettings {
  // Compressor
  compressorEnabled: boolean;
  threshold: number; // dB
  ratio: number;
  attack: number; // ms
  release: number; // ms
  makeupGain: number; // dB

  // Limiter
  limiterEnabled: boolean;
  limiterThreshold: number; // dB
  limiterRelease: number; // ms

  // Noise Gate
  noiseGateEnabled: boolean;
  gateThreshold: number; // dB
  gateAttack: number; // ms
  gateRelease: number; // ms

  // EQ
  eqEnabled: boolean;
  lowGain: number; // dB
  midGain: number; // dB
  highGain: number; // dB
}

export default function AudioProcessor({ isOpen, onClose, sourceId, sourceName }: AudioProcessorProps) {
  const [settings, setSettings] = useState<AudioSettings>({
    compressorEnabled: false,
    threshold: -24,
    ratio: 4,
    attack: 5,
    release: 50,
    makeupGain: 0,

    limiterEnabled: true,
    limiterThreshold: -1,
    limiterRelease: 10,

    noiseGateEnabled: false,
    gateThreshold: -50,
    gateAttack: 1,
    gateRelease: 100,

    eqEnabled: false,
    lowGain: 0,
    midGain: 0,
    highGain: 0,
  });

  if (!isOpen) return null;

  const handleSave = () => {
    toast.success('Processamento de áudio aplicado!', {
      description: `Configurações salvas para ${sourceName}`,
    });
    onClose();
  };

  const handleReset = () => {
    setSettings({
      compressorEnabled: false,
      threshold: -24,
      ratio: 4,
      attack: 5,
      release: 50,
      makeupGain: 0,
      limiterEnabled: true,
      limiterThreshold: -1,
      limiterRelease: 10,
      noiseGateEnabled: false,
      gateThreshold: -50,
      gateAttack: 1,
      gateRelease: 100,
      eqEnabled: false,
      lowGain: 0,
      midGain: 0,
      highGain: 0,
    });
    toast.info('Configurações resetadas para o padrão');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="text-orange-500" size={24} />
            Processamento de Áudio - {sourceName}
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
          {/* Compressor */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Volume2 className="text-blue-500" size={20} />
                <h3 className="text-white font-semibold">Compressor</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.compressorEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, compressorEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            {settings.compressorEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Threshold: {settings.threshold} dB
                    </label>
                    <input
                      type="range"
                      min="-60"
                      max="0"
                      value={settings.threshold}
                      onChange={(e) =>
                        setSettings({ ...settings, threshold: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Ratio: {settings.ratio}:1
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={settings.ratio}
                      onChange={(e) =>
                        setSettings({ ...settings, ratio: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Attack: {settings.attack} ms
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.attack}
                      onChange={(e) =>
                        setSettings({ ...settings, attack: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Release: {settings.release} ms
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={settings.release}
                      onChange={(e) =>
                        setSettings({ ...settings, release: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Makeup Gain: {settings.makeupGain > 0 ? '+' : ''}{settings.makeupGain} dB
                  </label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={settings.makeupGain}
                    onChange={(e) =>
                      setSettings({ ...settings, makeupGain: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Limiter */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="text-red-500" size={20} />
                <h3 className="text-white font-semibold">Limiter</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.limiterEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, limiterEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            {settings.limiterEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Threshold: {settings.limiterThreshold} dB
                    </label>
                    <input
                      type="range"
                      min="-12"
                      max="0"
                      value={settings.limiterThreshold}
                      onChange={(e) =>
                        setSettings({ ...settings, limiterThreshold: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Release: {settings.limiterRelease} ms
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={settings.limiterRelease}
                      onChange={(e) =>
                        setSettings({ ...settings, limiterRelease: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Noise Gate */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="text-yellow-500" size={20} />
                <h3 className="text-white font-semibold">Noise Gate</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.noiseGateEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, noiseGateEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            {settings.noiseGateEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Threshold: {settings.gateThreshold} dB
                    </label>
                    <input
                      type="range"
                      min="-80"
                      max="-20"
                      value={settings.gateThreshold}
                      onChange={(e) =>
                        setSettings({ ...settings, gateThreshold: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Attack: {settings.gateAttack} ms
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={settings.gateAttack}
                      onChange={(e) =>
                        setSettings({ ...settings, gateAttack: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">
                      Release: {settings.gateRelease} ms
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={settings.gateRelease}
                      onChange={(e) =>
                        setSettings({ ...settings, gateRelease: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* EQ */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="text-green-500" size={20} />
                <h3 className="text-white font-semibold">Equalizador (EQ)</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.eqEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, eqEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            {settings.eqEnabled && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Low: {settings.lowGain > 0 ? '+' : ''}{settings.lowGain} dB
                  </label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={settings.lowGain}
                    onChange={(e) =>
                      setSettings({ ...settings, lowGain: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Mid: {settings.midGain > 0 ? '+' : ''}{settings.midGain} dB
                  </label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={settings.midGain}
                    onChange={(e) =>
                      setSettings({ ...settings, midGain: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    High: {settings.highGain > 0 ? '+' : ''}{settings.highGain} dB
                  </label>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    value={settings.highGain}
                    onChange={(e) =>
                      setSettings({ ...settings, highGain: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Resetar
          </button>
          <div className="flex gap-3">
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
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
