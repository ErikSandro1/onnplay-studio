import { useState } from 'react';
import { Sliders, Volume2, Zap, Waves } from 'lucide-react';

interface ChannelEQ {
  bass: number;
  mid: number;
  treble: number;
}

interface ChannelCompressor {
  enabled: boolean;
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
}

interface ChannelEffects {
  reverb: number;
  delay: number;
  distortion: number;
}

interface AdvancedChannel {
  id: string;
  name: string;
  eq: ChannelEQ;
  compressor: ChannelCompressor;
  effects: ChannelEffects;
  pan: number;
  muted: boolean;
}

export default function AdvancedMixer() {
  const [channels, setChannels] = useState<AdvancedChannel[]>([
    {
      id: 'ch1',
      name: 'Camera 1',
      eq: { bass: 0, mid: 0, treble: 0 },
      compressor: { enabled: false, threshold: -20, ratio: 4, attack: 10, release: 100 },
      effects: { reverb: 0, delay: 0, distortion: 0 },
      pan: 0,
      muted: false,
    },
    {
      id: 'ch2',
      name: 'Mic 1',
      eq: { bass: 2, mid: 5, treble: 3 },
      compressor: { enabled: true, threshold: -15, ratio: 3, attack: 5, release: 50 },
      effects: { reverb: 20, delay: 10, distortion: 0 },
      pan: -20,
      muted: false,
    },
  ]);

  const [selectedChannel, setSelectedChannel] = useState<string>('ch1');
  const [activeTab, setActiveTab] = useState<'eq' | 'compressor' | 'effects' | 'pan'>('eq');

  const currentChannel = channels.find(ch => ch.id === selectedChannel);

  const updateChannel = (id: string, updates: Partial<AdvancedChannel>) => {
    setChannels(channels.map(ch => (ch.id === id ? { ...ch, ...updates } : ch)));
  };

  const updateEQ = (id: string, key: keyof ChannelEQ, value: number) => {
    const channel = channels.find(ch => ch.id === id);
    if (channel) {
      updateChannel(id, {
        eq: { ...channel.eq, [key]: value },
      });
    }
  };

  const updateCompressor = (id: string, key: keyof ChannelCompressor, value: any) => {
    const channel = channels.find(ch => ch.id === id);
    if (channel) {
      updateChannel(id, {
        compressor: { ...channel.compressor, [key]: value },
      });
    }
  };

  const updateEffects = (id: string, key: keyof ChannelEffects, value: number) => {
    const channel = channels.find(ch => ch.id === id);
    if (channel) {
      updateChannel(id, {
        effects: { ...channel.effects, [key]: value },
      });
    }
  };

  if (!currentChannel) return null;

  return (
    <div className="bg-gray-800 rounded border border-gray-700 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Sliders size={20} className="text-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Mixer Avançado</h3>
        </div>
      </div>

      {/* Channel Selector */}
      <div className="mb-4 flex gap-2">
        {channels.map(ch => (
          <button
            key={ch.id}
            onClick={() => setSelectedChannel(ch.id)}
            className={`px-3 py-2 rounded text-xs font-semibold transition-colors ${
              selectedChannel === ch.id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {ch.name}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 border-b border-gray-700">
        {(['eq', 'compressor', 'effects', 'pan'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab === 'eq' && 'EQ'}
            {tab === 'compressor' && 'Compressor'}
            {tab === 'effects' && 'Efeitos'}
            {tab === 'pan' && 'Pan'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* EQ Section */}
        {activeTab === 'eq' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400">Bass</label>
                <span className="text-xs font-bold text-orange-500">{currentChannel.eq.bass} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={currentChannel.eq.bass}
                onChange={(e) => updateEQ(selectedChannel, 'bass', parseInt(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400">Mid</label>
                <span className="text-xs font-bold text-orange-500">{currentChannel.eq.mid} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={currentChannel.eq.mid}
                onChange={(e) => updateEQ(selectedChannel, 'mid', parseInt(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400">Treble</label>
                <span className="text-xs font-bold text-orange-500">{currentChannel.eq.treble} dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                value={currentChannel.eq.treble}
                onChange={(e) => updateEQ(selectedChannel, 'treble', parseInt(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
          </div>
        )}

        {/* Compressor Section */}
        {activeTab === 'compressor' && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentChannel.compressor.enabled}
                onChange={(e) =>
                  updateCompressor(selectedChannel, 'enabled', e.target.checked)
                }
                className="w-4 h-4 rounded border-gray-600 text-orange-500"
              />
              <span className="text-sm font-semibold text-white">Ativar Compressor</span>
            </label>

            {currentChannel.compressor.enabled && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-400">Threshold</label>
                    <span className="text-xs font-bold text-orange-500">
                      {currentChannel.compressor.threshold} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="0"
                    value={currentChannel.compressor.threshold}
                    onChange={(e) =>
                      updateCompressor(selectedChannel, 'threshold', parseInt(e.target.value))
                    }
                    className="w-full accent-orange-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-400">Ratio</label>
                    <span className="text-xs font-bold text-orange-500">
                      {currentChannel.compressor.ratio}:1
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    value={currentChannel.compressor.ratio}
                    onChange={(e) =>
                      updateCompressor(selectedChannel, 'ratio', parseInt(e.target.value))
                    }
                    className="w-full accent-orange-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-400">Attack</label>
                    <span className="text-xs font-bold text-orange-500">
                      {currentChannel.compressor.attack} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={currentChannel.compressor.attack}
                    onChange={(e) =>
                      updateCompressor(selectedChannel, 'attack', parseInt(e.target.value))
                    }
                    className="w-full accent-orange-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-400">Release</label>
                    <span className="text-xs font-bold text-orange-500">
                      {currentChannel.compressor.release} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    value={currentChannel.compressor.release}
                    onChange={(e) =>
                      updateCompressor(selectedChannel, 'release', parseInt(e.target.value))
                    }
                    className="w-full accent-orange-500"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Effects Section */}
        {activeTab === 'effects' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400">Reverb</label>
                <span className="text-xs font-bold text-orange-500">{currentChannel.effects.reverb}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentChannel.effects.reverb}
                onChange={(e) => updateEffects(selectedChannel, 'reverb', parseInt(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400">Delay</label>
                <span className="text-xs font-bold text-orange-500">{currentChannel.effects.delay}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentChannel.effects.delay}
                onChange={(e) => updateEffects(selectedChannel, 'delay', parseInt(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400">Distortion</label>
                <span className="text-xs font-bold text-orange-500">
                  {currentChannel.effects.distortion}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentChannel.effects.distortion}
                onChange={(e) =>
                  updateEffects(selectedChannel, 'distortion', parseInt(e.target.value))
                }
                className="w-full accent-orange-500"
              />
            </div>
          </div>
        )}

        {/* Pan Section */}
        {activeTab === 'pan' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400">Panorama L/R</label>
                <span className="text-xs font-bold text-orange-500">
                  {currentChannel.pan > 0 ? 'R' : 'L'} {Math.abs(currentChannel.pan)}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={currentChannel.pan}
                onChange={(e) =>
                  updateChannel(selectedChannel, { pan: parseInt(e.target.value) })
                }
                className="w-full accent-orange-500"
              />
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>Esquerda</span>
                <span>Centro</span>
                <span>Direita</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mute Button */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <button
          onClick={() => updateChannel(selectedChannel, { muted: !currentChannel.muted })}
          className={`w-full px-4 py-2 rounded font-semibold transition-colors ${
            currentChannel.muted
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
          }`}
        >
          {currentChannel.muted ? 'Desmutado' : 'Mutar'}
        </button>
      </div>
    </div>
  );
}
