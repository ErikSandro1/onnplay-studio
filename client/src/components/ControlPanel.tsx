import { Circle, Square, Triangle, Disc3, Radio, Wifi, Clock } from 'lucide-react';
import { useState } from 'react';

interface ControlPanelProps {
  isLive?: boolean;
}

export default function ControlPanel({ isLive = false }: ControlPanelProps) {
  const [recording, setRecording] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [selectedInput, setSelectedInput] = useState(1);

  return (
    <div className="mixer-panel flex flex-col gap-4">
      {/* Status Indicators */}
      <div className="grid grid-cols-4 gap-3">
        {/* Live Indicator */}
        <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded">
          <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-600 animate-pulse' : 'bg-gray-600'}`}></div>
          <span className="text-xs font-semibold text-gray-300">LIVE</span>
        </div>

        {/* Recording Indicator */}
        <button
          onClick={() => setRecording(!recording)}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
            recording ? 'bg-red-900 text-red-300' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
          }`}
        >
          <Circle size={12} className={recording ? 'fill-current' : ''} />
          <span className="text-xs font-semibold">REC</span>
        </button>

        {/* Streaming Indicator */}
        <button
          onClick={() => setStreaming(!streaming)}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
            streaming ? 'bg-blue-900 text-blue-300' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
          }`}
        >
          <Wifi size={12} />
          <span className="text-xs font-semibold">STREAM</span>
        </button>

        {/* Time Display */}
        <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded">
          <Clock size={12} className="text-gray-400" />
          <span className="text-xs font-mono text-gray-400">00:00:00</span>
        </div>
      </div>

      {/* Input Selection */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase">Input:</span>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((input) => (
            <button
              key={input}
              onClick={() => setSelectedInput(input)}
              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                selectedInput === input
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {input}
            </button>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-xs font-semibold transition-colors">
          RESET
        </button>
        <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-xs font-semibold transition-colors">
          SAVE
        </button>
        <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-xs font-semibold transition-colors">
          LOAD
        </button>
      </div>

      {/* Advanced Controls */}
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Advanced</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-xs font-semibold transition-colors">
            Color Correction
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-xs font-semibold transition-colors">
            Effects
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-xs font-semibold transition-colors">
            Transitions
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded text-xs font-semibold transition-colors">
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
