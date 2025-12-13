import { useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Settings, X, User, Video } from 'lucide-react';

interface AudioSource {
  id: string;
  name: string;
  type: 'camera' | 'mic' | 'screen' | 'participant';
  volume: number;
  isMuted: boolean;
  isActive: boolean;
  peakLevel: number;
  participantName?: string;
}

interface AdvancedAudioMixerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedAudioMixer({ isOpen, onClose }: AdvancedAudioMixerProps) {
  const [audioSources, setAudioSources] = useState<AudioSource[]>([
    {
      id: '1',
      name: 'Câmera 1',
      type: 'camera',
      volume: 75,
      isMuted: false,
      isActive: true,
      peakLevel: 65,
    },
    {
      id: '2',
      name: 'Câmera 2',
      type: 'camera',
      volume: 60,
      isMuted: false,
      isActive: true,
      peakLevel: 45,
    },
    {
      id: '3',
      name: 'Microfone Principal',
      type: 'mic',
      volume: 85,
      isMuted: false,
      isActive: true,
      peakLevel: 80,
    },
    {
      id: '4',
      name: 'Microfone 2',
      type: 'mic',
      volume: 70,
      isMuted: false,
      isActive: true,
      peakLevel: 55,
    },
    {
      id: '5',
      name: 'João Silva',
      type: 'participant',
      volume: 80,
      isMuted: false,
      isActive: true,
      peakLevel: 70,
      participantName: 'João Silva',
    },
    {
      id: '6',
      name: 'Maria Santos',
      type: 'participant',
      volume: 75,
      isMuted: false,
      isActive: true,
      peakLevel: 60,
      participantName: 'Maria Santos',
    },
    {
      id: '7',
      name: 'Compartilhamento de Tela',
      type: 'screen',
      volume: 50,
      isMuted: false,
      isActive: false,
      peakLevel: 0,
    },
  ]);

  const [masterVolume, setMasterVolume] = useState(100);
  const [masterMuted, setMasterMuted] = useState(false);

  const updateVolume = (id: string, volume: number) => {
    setAudioSources((prev) =>
      prev.map((source) => (source.id === id ? { ...source, volume } : source))
    );
  };

  const toggleMute = (id: string) => {
    setAudioSources((prev) =>
      prev.map((source) => (source.id === id ? { ...source, isMuted: !source.isMuted } : source))
    );
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'camera':
        return <Video size={16} />;
      case 'mic':
        return <Mic size={16} />;
      case 'participant':
        return <User size={16} />;
      default:
        return <Volume2 size={16} />;
    }
  };

  const getVolumeColor = (volume: number, isMuted: boolean) => {
    if (isMuted) return 'bg-gray-600';
    if (volume > 80) return 'bg-green-500';
    if (volume > 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getPeakLevelColor = (level: number) => {
    if (level > 85) return 'bg-red-500';
    if (level > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-5xl max-h-[85vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Volume2 size={24} className="text-orange-500" />
            <div>
              <h2 className="text-lg font-bold text-white">Mixer de Áudio Avançado</h2>
              <p className="text-xs text-gray-400">
                Controle individual de volume e mute para cada fonte
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Master Controls */}
        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMasterMuted(!masterMuted)}
                className={`p-2 rounded-lg transition-colors ${
                  masterMuted
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {masterMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Master</span>
                <span className="text-xs text-gray-400">{masterVolume}%</span>
              </div>
            </div>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                disabled={masterMuted}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">{masterVolume}%</div>
              <div className="text-xs text-gray-400">Volume Geral</div>
            </div>
          </div>
        </div>

        {/* Audio Sources */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audioSources.map((source) => (
              <div
                key={source.id}
                className={`p-4 rounded-lg border transition-all ${
                  source.isActive
                    ? 'border-gray-700 bg-gray-800/50'
                    : 'border-gray-800 bg-gray-900/30 opacity-50'
                }`}
              >
                {/* Source Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-gray-400">{getSourceIcon(source.type)}</div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{source.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{source.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMute(source.id)}
                    disabled={!source.isActive}
                    className={`p-2 rounded-lg transition-colors ${
                      source.isMuted
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {source.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>

                {/* Volume Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Volume</span>
                    <span className="text-white font-semibold">{source.volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={source.volume}
                    onChange={(e) => updateVolume(source.id, parseInt(e.target.value))}
                    disabled={source.isMuted || !source.isActive}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  />

                  {/* Peak Level Meter */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Nível de Áudio</span>
                      <span className={`font-semibold ${
                        source.peakLevel > 85
                          ? 'text-red-500'
                          : source.peakLevel > 70
                          ? 'text-yellow-500'
                          : 'text-green-500'
                      }`}>
                        {source.peakLevel}dB
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-150 ${getPeakLevelColor(
                          source.peakLevel
                        )}`}
                        style={{ width: `${source.peakLevel}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 pt-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        source.isActive
                          ? source.isMuted
                            ? 'bg-red-500'
                            : 'bg-green-500 animate-pulse'
                          : 'bg-gray-600'
                      }`}
                    />
                    <span className="text-xs text-gray-400">
                      {source.isActive
                        ? source.isMuted
                          ? 'Mutado'
                          : 'Ativo'
                        : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              💡 Dica: Use o mixer para balancear o áudio de cada participante individualmente
            </div>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2">
              <Settings size={16} />
              Configurações Avançadas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
