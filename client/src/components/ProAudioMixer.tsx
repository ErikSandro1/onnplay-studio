import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Music, 
  Video, 
  Users,
  Headphones,
  Settings,
  Sliders,
  Radio,
  Monitor,
  Speaker,
  Link2,
  Unlink2,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useDailyContext } from '../contexts/DailyContext';

// Tipos
interface AudioChannel {
  id: string;
  name: string;
  type: 'microphone' | 'guest' | 'media' | 'system' | 'master';
  volume: number;
  pan: number; // -100 (left) to 100 (right)
  isMuted: boolean;
  isSolo: boolean;
  isLinked: boolean;
  peakLevel: number;
  peakLevelR?: number; // Para canais estéreo
  // EQ
  eqLow: number; // -12 to +12 dB
  eqMid: number;
  eqHigh: number;
  // Compressor
  compressorEnabled: boolean;
  compressorThreshold: number; // -60 to 0 dB
  compressorRatio: number; // 1:1 to 20:1
  // Aux sends
  auxSend1: number; // 0-100
  auxSend2: number;
  // Source info
  sourceId?: string;
  participantId?: string;
  isActive: boolean;
}

interface MixerPreset {
  id: string;
  name: string;
  channels: Partial<AudioChannel>[];
}

interface ProAudioMixerProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultPresets: MixerPreset[] = [
  { id: 'default', name: 'Padrão', channels: [] },
  { id: 'podcast', name: 'Podcast', channels: [] },
  { id: 'music', name: 'Música', channels: [] },
  { id: 'interview', name: 'Entrevista', channels: [] },
];

export const ProAudioMixer: React.FC<ProAudioMixerProps> = ({ isOpen, onClose }) => {
  const { participants } = useDailyContext();
  
  // Estados
  const [channels, setChannels] = useState<AudioChannel[]>([]);
  const [masterVolume, setMasterVolume] = useState(100);
  const [masterMuted, setMasterMuted] = useState(false);
  const [monitorVolume, setMonitorVolume] = useState(80);
  const [selectedPreset, setSelectedPreset] = useState('default');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'eq' | 'dynamics' | 'routing'>('channels');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  
  // Refs para animação de medidores
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);

  // Inicializar canais baseado nos participantes e fontes
  useEffect(() => {
    const initialChannels: AudioChannel[] = [
      // Canal do Host (Você)
      {
        id: 'host-mic',
        name: 'Meu Microfone',
        type: 'microphone',
        volume: 100,
        pan: 0,
        isMuted: false,
        isSolo: false,
        isLinked: false,
        peakLevel: 0,
        eqLow: 0,
        eqMid: 0,
        eqHigh: 0,
        compressorEnabled: true,
        compressorThreshold: -20,
        compressorRatio: 4,
        auxSend1: 0,
        auxSend2: 0,
        isActive: true,
      },
      // Canais dos convidados
      ...participants
        .filter(p => !p.local)
        .map((participant, index) => ({
          id: `guest-${participant.session_id}`,
          name: participant.user_name || `Convidado ${index + 1}`,
          type: 'guest' as const,
          volume: 100,
          pan: 0,
          isMuted: false,
          isSolo: false,
          isLinked: false,
          peakLevel: 0,
          eqLow: 0,
          eqMid: 0,
          eqHigh: 0,
          compressorEnabled: false,
          compressorThreshold: -20,
          compressorRatio: 4,
          auxSend1: 0,
          auxSend2: 0,
          participantId: participant.session_id,
          isActive: participant.audio,
        })),
      // Canal de Mídia (vídeos, músicas)
      {
        id: 'media',
        name: 'Mídia',
        type: 'media',
        volume: 80,
        pan: 0,
        isMuted: false,
        isSolo: false,
        isLinked: true,
        peakLevel: 0,
        peakLevelR: 0,
        eqLow: 0,
        eqMid: 0,
        eqHigh: 0,
        compressorEnabled: false,
        compressorThreshold: -10,
        compressorRatio: 2,
        auxSend1: 0,
        auxSend2: 0,
        isActive: true,
      },
      // Canal de Sistema (sons do sistema)
      {
        id: 'system',
        name: 'Sistema',
        type: 'system',
        volume: 70,
        pan: 0,
        isMuted: false,
        isSolo: false,
        isLinked: true,
        peakLevel: 0,
        peakLevelR: 0,
        eqLow: 0,
        eqMid: 0,
        eqHigh: 0,
        compressorEnabled: false,
        compressorThreshold: -10,
        compressorRatio: 2,
        auxSend1: 0,
        auxSend2: 0,
        isActive: false,
      },
    ];

    setChannels(initialChannels);
  }, [participants]);

  // Simular níveis de áudio (em produção, usar Web Audio API real)
  useEffect(() => {
    const updateLevels = () => {
      setChannels(prev => prev.map(ch => ({
        ...ch,
        peakLevel: ch.isActive && !ch.isMuted 
          ? Math.min(100, Math.max(0, ch.peakLevel + (Math.random() - 0.5) * 20))
          : Math.max(0, ch.peakLevel - 5),
        peakLevelR: ch.isLinked && ch.isActive && !ch.isMuted
          ? Math.min(100, Math.max(0, (ch.peakLevelR || 0) + (Math.random() - 0.5) * 20))
          : Math.max(0, (ch.peakLevelR || 0) - 5),
      })));
      animationRef.current = requestAnimationFrame(updateLevels);
    };

    if (isOpen) {
      animationRef.current = requestAnimationFrame(updateLevels);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isOpen]);

  // Funções de controle
  const updateChannel = useCallback((id: string, updates: Partial<AudioChannel>) => {
    setChannels(prev => prev.map(ch => 
      ch.id === id ? { ...ch, ...updates } : ch
    ));
  }, []);

  const toggleMute = useCallback((id: string) => {
    setChannels(prev => prev.map(ch => 
      ch.id === id ? { ...ch, isMuted: !ch.isMuted } : ch
    ));
  }, []);

  const toggleSolo = useCallback((id: string) => {
    setChannels(prev => {
      const channel = prev.find(ch => ch.id === id);
      if (!channel) return prev;
      
      const newSoloState = !channel.isSolo;
      
      // Se ativando solo, desativar solo de outros canais
      return prev.map(ch => ({
        ...ch,
        isSolo: ch.id === id ? newSoloState : false,
      }));
    });
  }, []);

  const resetChannel = useCallback((id: string) => {
    updateChannel(id, {
      volume: 100,
      pan: 0,
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      compressorEnabled: false,
      auxSend1: 0,
      auxSend2: 0,
    });
  }, [updateChannel]);

  // Renderizar medidor de nível
  const renderMeter = (level: number, height: number = 150) => {
    const segments = 20;
    const activeSegments = Math.floor((level / 100) * segments);
    
    return (
      <div className="flex flex-col-reverse gap-0.5" style={{ height }}>
        {Array.from({ length: segments }).map((_, i) => {
          const isActive = i < activeSegments;
          const isRed = i >= segments - 3;
          const isYellow = i >= segments - 7 && i < segments - 3;
          
          return (
            <div
              key={i}
              className={`w-3 h-1.5 rounded-sm transition-all duration-75 ${
                isActive
                  ? isRed
                    ? 'bg-red-500 shadow-red-500/50 shadow-sm'
                    : isYellow
                    ? 'bg-yellow-500 shadow-yellow-500/50 shadow-sm'
                    : 'bg-green-500 shadow-green-500/50 shadow-sm'
                  : 'bg-gray-700'
              }`}
            />
          );
        })}
      </div>
    );
  };

  // Renderizar fader de volume
  const renderFader = (channel: AudioChannel) => (
    <div className="flex flex-col items-center gap-2">
      {/* Medidores estéreo */}
      <div className="flex gap-1">
        {renderMeter(channel.peakLevel)}
        {channel.isLinked && renderMeter(channel.peakLevelR || channel.peakLevel)}
      </div>
      
      {/* Fader vertical */}
      <div className="relative h-32 w-8 bg-gray-800 rounded-lg overflow-hidden">
        <input
          type="range"
          min="0"
          max="100"
          value={channel.volume}
          onChange={(e) => updateChannel(channel.id, { volume: parseInt(e.target.value) })}
          className="absolute w-32 h-8 -rotate-90 origin-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-track]:bg-gradient-to-t [&::-webkit-slider-track]:from-gray-700 [&::-webkit-slider-track]:to-gray-600 [&::-webkit-slider-track]:rounded-lg [&::-webkit-slider-track]:h-2
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-gray-300 [&::-webkit-slider-thumb]:to-gray-400 [&::-webkit-slider-thumb]:rounded [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab"
          style={{ width: '128px' }}
        />
        {/* Marcações de dB */}
        <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col justify-between py-1 text-[8px] text-gray-500">
          <span>+6</span>
          <span>0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-∞</span>
        </div>
      </div>
      
      {/* Valor do volume */}
      <div className="text-xs font-mono text-gray-400">
        {channel.volume === 0 ? '-∞' : `${Math.round((channel.volume / 100) * 12 - 6)}dB`}
      </div>
    </div>
  );

  // Renderizar controle de pan
  const renderPan = (channel: AudioChannel) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500">L</span>
      <input
        type="range"
        min="-100"
        max="100"
        value={channel.pan}
        onChange={(e) => updateChannel(channel.id, { pan: parseInt(e.target.value) })}
        className="w-16 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
      <span className="text-[10px] text-gray-500">R</span>
    </div>
  );

  // Renderizar canal individual
  const renderChannel = (channel: AudioChannel) => {
    const getIcon = () => {
      switch (channel.type) {
        case 'microphone': return <Mic size={16} />;
        case 'guest': return <Users size={16} />;
        case 'media': return <Music size={16} />;
        case 'system': return <Monitor size={16} />;
        default: return <Volume2 size={16} />;
      }
    };

    const isSelected = selectedChannel === channel.id;

    return (
      <div
        key={channel.id}
        className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
          isSelected
            ? 'border-cyan-500 bg-cyan-500/10'
            : channel.isActive
            ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            : 'border-gray-800 bg-gray-900/30 opacity-50'
        }`}
        onClick={() => setSelectedChannel(channel.id)}
      >
        {/* Header */}
        <div className="flex items-center gap-1 mb-2">
          <div className={`p-1 rounded ${channel.isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
            {getIcon()}
          </div>
          <span className="text-xs font-medium text-white truncate max-w-[60px]" title={channel.name}>
            {channel.name}
          </span>
        </div>

        {/* Pan */}
        {renderPan(channel)}

        {/* Fader e Medidores */}
        <div className="my-2">
          {renderFader(channel)}
        </div>

        {/* Botões de controle */}
        <div className="flex gap-1 mt-2">
          {/* Mute */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleMute(channel.id); }}
            className={`p-1.5 rounded text-xs font-bold transition-colors ${
              channel.isMuted
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            title="Mute"
          >
            M
          </button>
          
          {/* Solo */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleSolo(channel.id); }}
            className={`p-1.5 rounded text-xs font-bold transition-colors ${
              channel.isSolo
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
            title="Solo"
          >
            S
          </button>

          {/* Link (para canais estéreo) */}
          {(channel.type === 'media' || channel.type === 'system') && (
            <button
              onClick={(e) => { e.stopPropagation(); updateChannel(channel.id, { isLinked: !channel.isLinked }); }}
              className={`p-1.5 rounded transition-colors ${
                channel.isLinked
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              title="Link Stereo"
            >
              {channel.isLinked ? <Link2 size={12} /> : <Unlink2 size={12} />}
            </button>
          )}
        </div>

        {/* Aux Sends (mini) */}
        <div className="flex gap-2 mt-2 text-[10px] text-gray-500">
          <div className="flex flex-col items-center">
            <span>AUX1</span>
            <input
              type="range"
              min="0"
              max="100"
              value={channel.auxSend1}
              onChange={(e) => updateChannel(channel.id, { auxSend1: parseInt(e.target.value) })}
              className="w-10 h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-purple-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex flex-col items-center">
            <span>AUX2</span>
            <input
              type="range"
              min="0"
              max="100"
              value={channel.auxSend2}
              onChange={(e) => updateChannel(channel.id, { auxSend2: parseInt(e.target.value) })}
              className="w-10 h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-purple-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    );
  };

  // Renderizar EQ para canal selecionado
  const renderEQ = () => {
    const channel = channels.find(ch => ch.id === selectedChannel);
    if (!channel) return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Selecione um canal para ajustar o EQ
      </div>
    );

    return (
      <div className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sliders size={20} />
          Equalizador - {channel.name}
        </h3>
        
        <div className="grid grid-cols-3 gap-6">
          {/* Low */}
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-400 mb-2">LOW</span>
            <span className="text-xs text-gray-500 mb-1">80Hz</span>
            <div className="relative h-32 w-8 bg-gray-800 rounded-lg">
              <input
                type="range"
                min="-12"
                max="12"
                value={channel.eqLow}
                onChange={(e) => updateChannel(channel.id, { eqLow: parseInt(e.target.value) })}
                className="absolute w-32 h-8 -rotate-90 origin-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 appearance-none bg-transparent cursor-pointer accent-orange-500"
                style={{ width: '128px' }}
              />
            </div>
            <span className="text-xs font-mono text-gray-400 mt-2">
              {channel.eqLow > 0 ? '+' : ''}{channel.eqLow}dB
            </span>
          </div>

          {/* Mid */}
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-400 mb-2">MID</span>
            <span className="text-xs text-gray-500 mb-1">2.5kHz</span>
            <div className="relative h-32 w-8 bg-gray-800 rounded-lg">
              <input
                type="range"
                min="-12"
                max="12"
                value={channel.eqMid}
                onChange={(e) => updateChannel(channel.id, { eqMid: parseInt(e.target.value) })}
                className="absolute w-32 h-8 -rotate-90 origin-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 appearance-none bg-transparent cursor-pointer accent-orange-500"
                style={{ width: '128px' }}
              />
            </div>
            <span className="text-xs font-mono text-gray-400 mt-2">
              {channel.eqMid > 0 ? '+' : ''}{channel.eqMid}dB
            </span>
          </div>

          {/* High */}
          <div className="flex flex-col items-center">
            <span className="text-sm text-gray-400 mb-2">HIGH</span>
            <span className="text-xs text-gray-500 mb-1">10kHz</span>
            <div className="relative h-32 w-8 bg-gray-800 rounded-lg">
              <input
                type="range"
                min="-12"
                max="12"
                value={channel.eqHigh}
                onChange={(e) => updateChannel(channel.id, { eqHigh: parseInt(e.target.value) })}
                className="absolute w-32 h-8 -rotate-90 origin-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 appearance-none bg-transparent cursor-pointer accent-orange-500"
                style={{ width: '128px' }}
              />
            </div>
            <span className="text-xs font-mono text-gray-400 mt-2">
              {channel.eqHigh > 0 ? '+' : ''}{channel.eqHigh}dB
            </span>
          </div>
        </div>

        <button
          onClick={() => updateChannel(channel.id, { eqLow: 0, eqMid: 0, eqHigh: 0 })}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
        >
          <RotateCcw size={14} />
          Reset EQ
        </button>
      </div>
    );
  };

  // Renderizar Dynamics (Compressor) para canal selecionado
  const renderDynamics = () => {
    const channel = channels.find(ch => ch.id === selectedChannel);
    if (!channel) return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Selecione um canal para ajustar a dinâmica
      </div>
    );

    return (
      <div className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Radio size={20} />
          Compressor - {channel.name}
        </h3>

        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => updateChannel(channel.id, { compressorEnabled: !channel.compressorEnabled })}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              channel.compressorEnabled
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {channel.compressorEnabled ? 'Ativo' : 'Inativo'}
          </button>
        </div>

        <div className={`grid grid-cols-2 gap-6 ${!channel.compressorEnabled && 'opacity-50 pointer-events-none'}`}>
          {/* Threshold */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Threshold</label>
            <input
              type="range"
              min="-60"
              max="0"
              value={channel.compressorThreshold}
              onChange={(e) => updateChannel(channel.id, { compressorThreshold: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-xs font-mono text-gray-400">{channel.compressorThreshold}dB</span>
          </div>

          {/* Ratio */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Ratio</label>
            <input
              type="range"
              min="1"
              max="20"
              value={channel.compressorRatio}
              onChange={(e) => updateChannel(channel.id, { compressorRatio: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-xs font-mono text-gray-400">{channel.compressorRatio}:1</span>
          </div>
        </div>

        {/* Gain Reduction Meter */}
        <div className="mt-4">
          <label className="text-sm text-gray-400 mb-2 block">Redução de Ganho</label>
          <div className="w-full h-4 bg-gray-800 rounded overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all duration-100"
              style={{ width: `${channel.compressorEnabled ? Math.random() * 30 : 0}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Renderizar Routing
  const renderRouting = () => (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Settings size={20} />
        Roteamento de Áudio
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Saída Principal (Live) */}
        <div className="p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Radio size={18} className="text-red-500" />
            <span className="font-medium text-white">Saída para Live</span>
          </div>
          <div className="space-y-2">
            {channels.map(ch => (
              <label key={ch.id} className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={!ch.isMuted}
                  onChange={() => toggleMute(ch.id)}
                  className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500"
                />
                {ch.name}
              </label>
            ))}
          </div>
        </div>

        {/* Monitor/Headphones */}
        <div className="p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Headphones size={18} className="text-purple-500" />
            <span className="font-medium text-white">Monitor (Fones)</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400">Volume do Monitor</label>
              <input
                type="range"
                min="0"
                max="100"
                value={monitorVolume}
                onChange={(e) => setMonitorVolume(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <span className="text-xs text-gray-500">{monitorVolume}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* AUX Buses */}
      <div className="p-4 bg-gray-800 rounded-lg">
        <h4 className="font-medium text-white mb-3">Buses Auxiliares</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">AUX 1 (Efeitos)</label>
            <p className="text-xs text-gray-500">Reverb, Delay</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">AUX 2 (Monitor)</label>
            <p className="text-xs text-gray-500">Mix para convidados</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div 
        className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-xl shadow-2xl border border-gray-800 w-[95vw] max-w-[1400px] h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sliders className="text-cyan-400" size={24} />
              <h2 className="text-xl font-bold text-white">Mixer de Áudio Profissional</h2>
            </div>
            
            {/* Preset Selector */}
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {defaultPresets.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>

            <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300">
              <Save size={14} />
              Salvar Preset
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              {[
                { id: 'channels', label: 'Canais', icon: <Volume2 size={14} /> },
                { id: 'eq', label: 'EQ', icon: <Sliders size={14} /> },
                { id: 'dynamics', label: 'Dinâmica', icon: <Radio size={14} /> },
                { id: 'routing', label: 'Roteamento', icon: <Settings size={14} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'channels' && (
              <div className="p-4">
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {channels.map(renderChannel)}
                </div>
              </div>
            )}
            {activeTab === 'eq' && renderEQ()}
            {activeTab === 'dynamics' && renderDynamics()}
            {activeTab === 'routing' && renderRouting()}
          </div>

          {/* Master Section */}
          <div className="w-48 border-l border-gray-800 bg-gray-900/50 p-4 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
              <Speaker size={16} />
              MASTER OUTPUT
            </h3>

            <div className="flex-1 flex flex-col items-center">
              {/* Master Meters */}
              <div className="flex gap-2 mb-4">
                {renderMeter(masterMuted ? 0 : (masterVolume / 100) * 75 + Math.random() * 25, 180)}
                {renderMeter(masterMuted ? 0 : (masterVolume / 100) * 75 + Math.random() * 25, 180)}
              </div>
              <div className="flex gap-4 text-[10px] text-gray-500 mb-2">
                <span>L</span>
                <span>R</span>
              </div>

              {/* Master Fader */}
              <div className="relative h-40 w-10 bg-gray-800 rounded-lg mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseInt(e.target.value))}
                  className="absolute w-40 h-10 -rotate-90 origin-center left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 appearance-none bg-transparent cursor-pointer
                    [&::-webkit-slider-track]:bg-gradient-to-t [&::-webkit-slider-track]:from-red-600 [&::-webkit-slider-track]:via-yellow-500 [&::-webkit-slider-track]:to-green-500 [&::-webkit-slider-track]:rounded-lg [&::-webkit-slider-track]:h-3
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-gray-200 [&::-webkit-slider-thumb]:to-gray-400 [&::-webkit-slider-thumb]:rounded [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab"
                  style={{ width: '160px' }}
                />
              </div>

              <div className="text-lg font-mono text-white mb-4">
                {masterVolume === 0 ? '-∞' : `${Math.round((masterVolume / 100) * 12 - 6)}dB`}
              </div>

              {/* Master Mute */}
              <button
                onClick={() => setMasterMuted(!masterMuted)}
                className={`w-full py-2 rounded-lg font-bold transition-colors ${
                  masterMuted
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {masterMuted ? 'MUTED' : 'MUTE'}
              </button>
            </div>

            {/* Output Info */}
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${masterMuted ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                <span className="text-gray-400">Saída para Live</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                48kHz / 16bit / Stereo
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 bg-gray-900/50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>💡 Dica: Use Solo (S) para ouvir apenas um canal, Mute (M) para silenciar</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300"
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Avançado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProAudioMixer;
