import { useState } from 'react';
import { Volume2, Zap, Sliders } from 'lucide-react';
import MasterFader from './MasterFader';
import PresetManager from './PresetManager';

interface Channel {
  id: string;
  name: string;
  level: number;
  muted: boolean;
}

interface Preset {
  id: string;
  name: string;
  channels: { [key: string]: number };
  master: number;
  createdAt: Date;
}

export default function Mixer() {
  const [channels, setChannels] = useState<Channel[]>([
    { id: 'ch1', name: 'Camera 1', level: 75, muted: false },
    { id: 'ch2', name: 'Camera 2', level: 60, muted: false },
    { id: 'ch3', name: 'Mic 1', level: 85, muted: false },
    { id: 'ch4', name: 'Mic 2', level: 70, muted: false },
  ]);

  const [masterLevel, setMasterLevel] = useState(50);

  const handleLevelChange = (id: string, newLevel: number) => {
    setChannels(channels.map(ch => 
      ch.id === id ? { ...ch, level: newLevel } : ch
    ));
  };

  const handleMuteToggle = (id: string) => {
    setChannels(channels.map(ch =>
      ch.id === id ? { ...ch, muted: !ch.muted } : ch
    ));
  };

  const handleLoadPreset = (preset: { channels: Record<string, number>; master: number }) => {
    // Carregar níveis dos canais do preset
    setChannels(channels.map(ch => ({
      ...ch,
      level: preset.channels[ch.id] || ch.level,
    })));
    // Carregar master level
    setMasterLevel(preset.master);
  };



  return (
    <div className="mixer-panel h-full flex flex-col">
      {/* Mixer Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Sliders size={20} className="text-orange-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Audio Mixer</h3>
        </div>
        <PresetManager
          onLoadPreset={handleLoadPreset}
          currentChannels={Object.fromEntries(channels.map(ch => [ch.id, ch.level]))}
          currentMaster={masterLevel}
        />
      </div>

      {/* Mixer Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Channels Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-4">
            {channels.map((channel) => (
              <div key={channel.id} className="flex flex-col items-center gap-3">
                {/* Channel Knob */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="knob"></div>
                  <div
                    className="absolute inset-0 flex items-center justify-center text-xs font-bold text-orange-500"
                    style={{
                      transform: `rotate(${(channel.level / 100) * 270 - 135}deg)`,
                    }}
                  >
                    <div style={{ transform: 'rotate(-' + ((channel.level / 100) * 270 - 135) + 'deg)' }}>
                      {channel.level}
                    </div>
                  </div>
                </div>

                {/* Level Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={channel.level}
                  onChange={(e) => handleLevelChange(channel.id, parseInt(e.target.value))}
                  disabled={channel.muted}
                  className="w-10 h-20 appearance-none bg-gray-700 rounded-full cursor-pointer accent-orange-500 vertical-slider"
                />

                {/* Mute Button */}
                <button
                  onClick={() => handleMuteToggle(channel.id)}
                  className={`p-2 rounded transition-colors ${
                    channel.muted
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <Volume2 size={14} />
                </button>

                {/* Channel Label */}
                <p className="text-xs text-gray-400 text-center truncate w-full px-1">
                  {channel.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Master Fader */}
        <div className="w-20 flex flex-col items-center gap-3 pb-4">
          <p className="text-xs font-bold uppercase text-orange-500 mt-2">Master</p>
          <MasterFader
            value={masterLevel}
            onChange={setMasterLevel}
            min={0}
            max={100}
          />
        </div>
      </div>

      {/* Master Controls Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-yellow-500" />
            <span className="text-xs font-semibold text-gray-300">Output</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">-12dB</span>
            <div className="w-24 h-2 bg-gray-700 rounded-full relative">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full transition-all"
                style={{ width: `${masterLevel}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500">+12dB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
