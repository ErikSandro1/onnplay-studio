import React, { useState } from 'react';
import { Mic, Volume2, Plus, Sliders, Wand2, Layers, SkipBack, SkipForward } from 'lucide-react';

const AudioControlsPanel: React.FC = () => {
  const [micVolume, setMicVolume] = useState(75);
  const [speakerVolume, setSpeakerVolume] = useState(60);
  const [timelinePosition, setTimelinePosition] = useState(30);

  return (
    <div
      className="p-6 rounded-xl"
      style={{
        background: '#141B2E',
        border: '2px solid #1E2842',
      }}
    >
      {/* Audio Sliders */}
      <div className="space-y-4 mb-6">
        {/* Mic Slider */}
        <div className="flex items-center gap-4">
          <div
            className="p-2 rounded-lg"
            style={{ background: '#1E2842', color: '#00D9FF' }}
          >
            <Mic size={20} />
          </div>
          
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={micVolume}
              onChange={(e) => setMicVolume(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00D9FF 0%, #00D9FF ${micVolume}%, #1E2842 ${micVolume}%, #1E2842 100%)`,
              }}
            />
          </div>

          <div
            className="p-2 rounded-lg cursor-pointer hover:bg-[#1E2842] transition-all"
            style={{ color: '#7A8BA3' }}
          >
            <Plus size={20} />
          </div>
        </div>

        {/* Speaker Slider */}
        <div className="flex items-center gap-4">
          <div
            className="p-2 rounded-lg"
            style={{ background: '#1E2842', color: '#00D9FF' }}
          >
            <Volume2 size={20} />
          </div>
          
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={speakerVolume}
              onChange={(e) => setSpeakerVolume(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00D9FF 0%, #00D9FF ${speakerVolume}%, #1E2842 ${speakerVolume}%, #1E2842 100%)`,
              }}
            />
          </div>

          <div
            className="p-2 rounded-lg cursor-pointer hover:bg-[#1E2842] transition-all"
            style={{ color: '#7A8BA3' }}
          >
            <Plus size={20} />
          </div>
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="mb-6">
        <input
          type="range"
          min="0"
          max="100"
          value={timelinePosition}
          onChange={(e) => setTimelinePosition(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: '#1E2842',
          }}
        />
        <div className="flex justify-between mt-2 text-xs" style={{ color: '#7A8BA3' }}>
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i}>|</div>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-2">
        <button
          className="p-3 rounded-lg transition-all hover:bg-[#1E2842]"
          style={{ background: '#1E2842', color: '#7A8BA3' }}
        >
          <Sliders size={20} />
        </button>

        <button
          className="p-3 rounded-lg transition-all"
          style={{ background: '#FF6B00', color: '#FFFFFF' }}
        >
          <Wand2 size={20} />
        </button>

        <button
          className="p-3 rounded-lg transition-all"
          style={{ background: '#00D9FF', color: '#FFFFFF' }}
        >
          <Layers size={20} />
        </button>

        <button
          className="p-3 rounded-lg transition-all hover:bg-[#1E2842]"
          style={{ background: '#1E2842', color: '#7A8BA3' }}
        >
          <SkipBack size={20} />
        </button>

        <button
          className="p-3 rounded-lg transition-all hover:bg-[#1E2842]"
          style={{ background: '#1E2842', color: '#7A8BA3' }}
        >
          <SkipForward size={20} />
        </button>
      </div>

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #FF6B00;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(255, 107, 0, 0.6);
        }
        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #FF6B00;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(255, 107, 0, 0.6);
        }
      `}</style>
    </div>
  );
};

export default AudioControlsPanel;
