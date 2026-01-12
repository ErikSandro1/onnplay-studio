import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Zap, Sliders, Mic, Video, Monitor, Music } from 'lucide-react';
import MasterFader from './MasterFader';
import PresetManager from './PresetManager';
import AudioMixerService, { AudioSource } from '../services/AudioMixerService';

interface Channel {
  id: string;
  name: string;
  level: number;
  muted: boolean;
  type: 'camera' | 'mic' | 'media' | 'system';
  peakLevel?: number;
}

// Instância do serviço de mixagem
const audioMixer = new AudioMixerService();

export default function Mixer() {
  const [channels, setChannels] = useState<Channel[]>([
    { id: 'cam1', name: 'Câmera 1', level: 75, muted: false, type: 'camera', peakLevel: 0 },
    { id: 'cam2', name: 'Câmera 2', level: 60, muted: false, type: 'camera', peakLevel: 0 },
    { id: 'mic1', name: 'Microfone', level: 85, muted: false, type: 'mic', peakLevel: 0 },
    { id: 'media', name: 'Mídia', level: 70, muted: false, type: 'media', peakLevel: 0 },
    { id: 'system', name: 'Sistema', level: 50, muted: false, type: 'system', peakLevel: 0 },
  ]);

  const [masterLevel, setMasterLevel] = useState(80);
  const [masterMuted, setMasterMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const peakIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializar o mixer de áudio
  useEffect(() => {
    const initMixer = async () => {
      try {
        await audioMixer.initialize();
        setIsInitialized(true);
        console.log('[Mixer] AudioMixerService initialized');
      } catch (error) {
        console.error('[Mixer] Failed to initialize AudioMixerService:', error);
      }
    };

    initMixer();

    // Simular níveis de pico para visualização
    peakIntervalRef.current = setInterval(() => {
      setChannels(prev => prev.map(ch => ({
        ...ch,
        peakLevel: ch.muted ? 0 : Math.min(100, ch.level * (0.5 + Math.random() * 0.5))
      })));
    }, 100);

    return () => {
      if (peakIntervalRef.current) {
        clearInterval(peakIntervalRef.current);
      }
      audioMixer.dispose();
    };
  }, []);

  // Escutar mudanças nas fontes de áudio
  useEffect(() => {
    const handleSourcesChange = (sources: AudioSource[]) => {
      // Atualizar canais com base nas fontes do serviço
      console.log('[Mixer] Audio sources changed:', sources);
    };

    audioMixer.addListener(handleSourcesChange);

    return () => {
      audioMixer.removeListener(handleSourcesChange);
    };
  }, []);

  const handleLevelChange = (id: string, newLevel: number) => {
    setChannels(channels.map(ch => 
      ch.id === id ? { ...ch, level: newLevel } : ch
    ));
    
    // Atualizar no serviço de mixagem
    if (isInitialized) {
      audioMixer.setSourceVolume(id, newLevel);
    }
  };

  const handleMuteToggle = (id: string) => {
    const channel = channels.find(ch => ch.id === id);
    if (!channel) return;

    setChannels(channels.map(ch =>
      ch.id === id ? { ...ch, muted: !ch.muted } : ch
    ));

    // Atualizar no serviço de mixagem
    if (isInitialized) {
      audioMixer.setSourceMuted(id, !channel.muted);
    }
  };

  const handleMasterLevelChange = (newLevel: number) => {
    setMasterLevel(newLevel);
    if (isInitialized) {
      audioMixer.setMasterVolume(newLevel);
    }
  };

  const handleMasterMuteToggle = () => {
    setMasterMuted(!masterMuted);
    if (isInitialized) {
      audioMixer.setMasterMuted(!masterMuted);
    }
  };

  const handleLoadPreset = (preset: { channels: Record<string, number>; master: number }) => {
    setChannels(channels.map(ch => ({
      ...ch,
      level: preset.channels[ch.id] ?? ch.level,
    })));
    setMasterLevel(preset.master);
    
    // Aplicar ao serviço
    if (isInitialized) {
      channels.forEach(ch => {
        const level = preset.channels[ch.id] ?? ch.level;
        audioMixer.setSourceVolume(ch.id, level);
      });
      audioMixer.setMasterVolume(preset.master);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'camera': return <Video size={14} />;
      case 'mic': return <Mic size={14} />;
      case 'media': return <Music size={14} />;
      case 'system': return <Monitor size={14} />;
      default: return <Volume2 size={14} />;
    }
  };

  const getChannelColor = (type: string) => {
    switch (type) {
      case 'camera': return '#00D9FF';
      case 'mic': return '#FF6B00';
      case 'media': return '#00FF88';
      case 'system': return '#FFD700';
      default: return '#7A8BA3';
    }
  };

  return (
    <div className="mixer-panel h-full flex flex-col bg-[#0F1419] rounded-lg p-4">
      {/* Mixer Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Sliders size={20} className="text-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Audio Mixer</h3>
          {isInitialized && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
              Ativo
            </span>
          )}
        </div>
        <PresetManager
          onLoadPreset={handleLoadPreset}
          currentChannels={Object.fromEntries(channels.map(ch => [ch.id, ch.level]))}
          currentMaster={masterLevel}
        />
      </div>

      {/* Mixer Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Channels */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {channels.map((channel) => (
              <div 
                key={channel.id} 
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#1E2842]/50 min-w-[80px]"
              >
                {/* Channel Icon */}
                <div 
                  className="p-2 rounded-full"
                  style={{ 
                    background: `${getChannelColor(channel.type)}20`,
                    color: getChannelColor(channel.type)
                  }}
                >
                  {getChannelIcon(channel.type)}
                </div>

                {/* Peak Meter */}
                <div className="w-4 h-24 bg-gray-800 rounded-full relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 transition-all duration-75 rounded-full"
                    style={{ 
                      height: `${channel.peakLevel || 0}%`,
                      background: (channel.peakLevel || 0) > 80 
                        ? 'linear-gradient(to top, #00FF88, #FFD700, #FF3366)' 
                        : 'linear-gradient(to top, #00FF88, #00D9FF)'
                    }}
                  />
                  {/* Marcadores de dB */}
                  <div className="absolute top-[10%] left-0 right-0 h-px bg-gray-600" />
                  <div className="absolute top-[30%] left-0 right-0 h-px bg-gray-600" />
                  <div className="absolute top-[50%] left-0 right-0 h-px bg-gray-600" />
                  <div className="absolute top-[70%] left-0 right-0 h-px bg-gray-600" />
                </div>

                {/* Level Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={channel.level}
                  onChange={(e) => handleLevelChange(channel.id, parseInt(e.target.value))}
                  disabled={channel.muted}
                  className="w-full h-2 appearance-none bg-gray-700 rounded-full cursor-pointer accent-orange-500"
                  style={{ 
                    accentColor: getChannelColor(channel.type),
                    opacity: channel.muted ? 0.5 : 1
                  }}
                />

                {/* Level Value */}
                <span className="text-xs font-mono text-gray-400">
                  {channel.level}%
                </span>

                {/* Mute Button */}
                <button
                  onClick={() => handleMuteToggle(channel.id)}
                  className={`p-2 rounded-lg transition-all ${
                    channel.muted
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={channel.muted ? 'Ativar' : 'Mutar'}
                >
                  {channel.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>

                {/* Channel Label */}
                <p className="text-xs text-gray-400 text-center truncate w-full">
                  {channel.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Master Fader */}
        <div className="w-24 flex flex-col items-center gap-3 p-3 rounded-lg bg-[#1E2842]/50 border border-orange-500/30">
          <p className="text-xs font-bold uppercase text-orange-500">Master</p>
          
          {/* Master Peak Meter */}
          <div className="w-6 h-32 bg-gray-800 rounded-full relative overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 right-0 transition-all duration-75 rounded-full"
              style={{ 
                height: `${masterMuted ? 0 : masterLevel}%`,
                background: masterLevel > 80 
                  ? 'linear-gradient(to top, #00FF88, #FFD700, #FF3366)' 
                  : 'linear-gradient(to top, #00FF88, #FF6B00)'
              }}
            />
          </div>

          <MasterFader
            value={masterLevel}
            onChange={handleMasterLevelChange}
            min={0}
            max={100}
          />

          {/* Master Mute */}
          <button
            onClick={handleMasterMuteToggle}
            className={`p-2 rounded-lg transition-all w-full ${
              masterMuted
                ? 'bg-red-600 text-white'
                : 'bg-orange-600 text-white hover:bg-orange-500'
            }`}
            title={masterMuted ? 'Ativar Master' : 'Mutar Master'}
          >
            {masterMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <span className="text-sm font-mono text-orange-400">
            {masterLevel}%
          </span>
        </div>
      </div>

      {/* Output Meter Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-yellow-500" />
            <span className="text-xs font-semibold text-gray-300">Output</span>
          </div>
          <div className="flex items-center gap-2 flex-1 ml-4">
            <span className="text-xs text-gray-500 w-8">-∞</span>
            <div className="flex-1 h-3 bg-gray-700 rounded-full relative overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full transition-all duration-100 rounded-full"
                style={{ 
                  width: `${masterMuted ? 0 : masterLevel}%`,
                  background: masterLevel > 80 
                    ? 'linear-gradient(to right, #00FF88, #FFD700, #FF3366)' 
                    : 'linear-gradient(to right, #00FF88, #00D9FF, #FF6B00)'
                }}
              />
              {/* Clip indicator */}
              {masterLevel > 95 && !masterMuted && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-xs text-gray-500 w-8">0dB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
