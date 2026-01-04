import { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Settings, X, User, Video, Music } from 'lucide-react';
import AudioMixerService, { AudioSource } from '../services/AudioMixerService';

interface AdvancedAudioMixerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedAudioMixer({ isOpen, onClose }: AdvancedAudioMixerProps) {
  const [audioSources, setAudioSources] = useState<AudioSource[]>([]);
  const [masterVolume, setMasterVolume] = useState(100);
  const [masterMuted, setMasterMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar o AudioMixerService
  useEffect(() => {
    const initMixer = async () => {
      try {
        const mixer = AudioMixerService.getInstance();
        await mixer.initialize();
        setIsInitialized(true);
        
        // Carregar configuração inicial
        const config = mixer.getConfig();
        setMasterVolume(config.masterVolume);
        setMasterMuted(config.masterMuted);
        
        // Carregar fontes existentes
        setAudioSources(mixer.getSources());
      } catch (error) {
        console.error('[AdvancedAudioMixer] Failed to initialize:', error);
      }
    };

    if (isOpen) {
      initMixer();
    }
  }, [isOpen]);

  // Listener para mudanças nas fontes
  useEffect(() => {
    if (!isInitialized) return;

    const mixer = AudioMixerService.getInstance();
    const handleSourcesChange = (sources: AudioSource[]) => {
      setAudioSources([...sources]);
    };

    mixer.addListener(handleSourcesChange);
    return () => mixer.removeListener(handleSourcesChange);
  }, [isInitialized]);

  const updateVolume = useCallback((id: string, volume: number) => {
    const mixer = AudioMixerService.getInstance();
    mixer.setSourceVolume(id, volume);
  }, []);

  const toggleMute = useCallback((id: string) => {
    const mixer = AudioMixerService.getInstance();
    const source = audioSources.find(s => s.id === id);
    if (source) {
      mixer.setSourceMuted(id, !source.isMuted);
    }
  }, [audioSources]);

  const handleMasterVolumeChange = useCallback((volume: number) => {
    setMasterVolume(volume);
    const mixer = AudioMixerService.getInstance();
    mixer.setMasterVolume(volume);
  }, []);

  const handleMasterMuteToggle = useCallback(() => {
    setMasterMuted(!masterMuted);
    const mixer = AudioMixerService.getInstance();
    mixer.setMasterMuted(!masterMuted);
  }, [masterMuted]);

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={16} />;
      case 'camera':
        return <Video size={16} />;
      case 'mic':
        return <Mic size={16} />;
      case 'participant':
        return <User size={16} />;
      case 'music':
        return <Music size={16} />;
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
                onClick={handleMasterMuteToggle}
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
                onChange={(e) => handleMasterVolumeChange(parseInt(e.target.value))}
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
          {audioSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Volume2 size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma fonte de áudio ativa</p>
              <p className="text-sm">Adicione vídeos ou ative o microfone para ver as fontes aqui</p>
            </div>
          ) : (
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
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              💡 Dica: Use o mixer para balancear o áudio de cada fonte individualmente
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
