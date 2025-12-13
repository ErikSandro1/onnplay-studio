import React, { useState } from 'react';
import { Volume2, Mic, Music, VolumeX } from 'lucide-react';

interface AudioChannel {
  id: string;
  label: string;
  icon: 'mic' | 'music' | 'volume';
  volume: number;
  muted: boolean;
}

const AudioControls: React.FC = () => {
  const [channels, setChannels] = useState<AudioChannel[]>([
    { id: 'master', label: 'MASTER', icon: 'volume', volume: 75, muted: false },
    { id: 'mic', label: 'MIC', icon: 'mic', volume: 60, muted: false },
    { id: 'music', label: 'MUSIC', icon: 'music', volume: 40, muted: false },
  ]);

  const handleVolumeChange = (id: string, value: number) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, volume: value } : ch))
    );
  };

  const handleMuteToggle = (id: string) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, muted: !ch.muted } : ch))
    );
  };

  const getIcon = (icon: AudioChannel['icon'], size = 20) => {
    switch (icon) {
      case 'mic':
        return <Mic size={size} />;
      case 'music':
        return <Music size={size} />;
      case 'volume':
        return <Volume2 size={size} />;
    }
  };

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: '#141B2E',
        border: '2px solid #1E2842',
      }}
    >
      <h3
        className="text-sm font-bold tracking-wide mb-4"
        style={{ color: '#B8C5D6' }}
      >
        AUDIO CONTROLS
      </h3>

      <div className="space-y-4">
        {channels.map((channel) => (
          <div key={channel.id} className="flex items-center gap-3">
            {/* Icon and Label */}
            <div className="flex items-center gap-2 w-24">
              <div style={{ color: channel.muted ? '#7A8BA3' : '#00D9FF' }}>
                {getIcon(channel.icon, 18)}
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: channel.muted ? '#7A8BA3' : '#B8C5D6' }}
              >
                {channel.label}
              </span>
            </div>

            {/* Volume Slider */}
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="100"
                value={channel.volume}
                onChange={(e) => handleVolumeChange(channel.id, Number(e.target.value))}
                disabled={channel.muted}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: channel.muted
                    ? '#1E2842'
                    : `linear-gradient(to right, #00D9FF 0%, #00D9FF ${channel.volume}%, #1E2842 ${channel.volume}%, #1E2842 100%)`,
                  outline: 'none',
                }}
              />
              <style>{`
                input[type='range']::-webkit-slider-thumb {
                  appearance: none;
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  background: ${channel.muted ? '#7A8BA3' : '#00D9FF'};
                  cursor: pointer;
                  box-shadow: 0 0 8px rgba(0, 217, 255, 0.6);
                }
                input[type='range']::-moz-range-thumb {
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  background: ${channel.muted ? '#7A8BA3' : '#00D9FF'};
                  cursor: pointer;
                  border: none;
                  box-shadow: 0 0 8px rgba(0, 217, 255, 0.6);
                }
              `}</style>
            </div>

            {/* Volume Value */}
            <div
              className="w-12 text-right text-sm font-bold"
              style={{ color: channel.muted ? '#7A8BA3' : '#00D9FF' }}
            >
              {channel.volume}%
            </div>

            {/* Mute Button */}
            <button
              onClick={() => handleMuteToggle(channel.id)}
              className="p-2 rounded-lg transition-all duration-200"
              style={{
                background: channel.muted ? '#FF3366' : '#1E2842',
                color: channel.muted ? '#FFFFFF' : '#7A8BA3',
              }}
            >
              {channel.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        ))}
      </div>

      {/* Level Meter */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: '#1E2842' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: '#7A8BA3' }}>
            LEVEL
          </span>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#0A0E1A' }}>
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: '65%',
                background: 'linear-gradient(to right, #00FF88, #00D9FF, #FF6B00)',
              }}
            />
          </div>
          <span className="text-xs font-bold" style={{ color: '#00D9FF' }}>
            -12dB
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioControls;
