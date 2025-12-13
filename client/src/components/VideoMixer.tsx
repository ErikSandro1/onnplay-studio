import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface VideoSource {
  id: number;
  label: string;
  type: 'camera' | 'media' | 'graphics';
}

interface VideoMixerProps {
  sources?: VideoSource[];
  activeProgram: number;
  activePreview: number;
  onProgramChange: (id: number) => void;
  onPreviewChange: (id: number) => void;
  onCut: () => void;
  onAuto: () => void;
  isLive: boolean;
}

export default function VideoMixer({
  sources = [
    { id: 1, label: 'CAM 1', type: 'camera' },
    { id: 2, label: 'CAM 2', type: 'camera' },
    { id: 3, label: 'CAM 3', type: 'camera' },
    { id: 4, label: 'MEDIA', type: 'media' },
  ],
  activeProgram,
  activePreview,
  onProgramChange,
  onPreviewChange,
  onCut,
  onAuto,
  isLive
}: VideoMixerProps) {
  const [tBarValue, setTBarValue] = useState(0);
  const [transitionType, setTransitionType] = useState<'mix' | 'wipe' | 'dip'>('mix');

  // Simulate Auto Transition
  useEffect(() => {
    if (tBarValue > 0 && tBarValue < 100) {
      // In a real app, this would drive the mix effect
    }
  }, [tBarValue]);

  const handleTBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setTBarValue(val);
    if (val === 100 || val === 0) {
      // Complete transition when T-Bar reaches ends
      if (val !== (tBarValue > 50 ? 100 : 0)) { // Simple debounce logic
         onCut(); // Swap buses
         // Reset T-Bar visually or keep it? Usually T-Bars are non-resetting in software or reset on release.
         // For this UI, let's snap back to 0 after a delay or keep it as a fader.
         // Let's just snap back for simplicity in this mock
         setTimeout(() => setTBarValue(0), 100);
      }
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-2xl flex gap-6 select-none">
      {/* Bus Section */}
      <div className="flex flex-col gap-4">
        {/* Program Bus */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-red-500 w-8 text-right">PGM</div>
          <div className="flex gap-2">
            {sources.map((src) => (
              <BusButton
                key={`pgm-${src.id}`}
                label={src.label}
                active={activeProgram === src.id}
                type="program"
                onClick={() => onProgramChange(src.id)}
              />
            ))}
          </div>
        </div>

        {/* Preview Bus */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-green-500 w-8 text-right">PVW</div>
          <div className="flex gap-2">
            {sources.map((src) => (
              <BusButton
                key={`pvw-${src.id}`}
                label={src.label}
                active={activePreview === src.id}
                type="preview"
                onClick={() => onPreviewChange(src.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Transition Control Section */}
      <div className="flex gap-4 border-l border-gray-800 pl-4">
        {/* Transition Buttons */}
        <div className="flex flex-col justify-between w-20">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <TransTypeBtn label="MIX" active={transitionType === 'mix'} onClick={() => setTransitionType('mix')} />
            <TransTypeBtn label="WIPE" active={transitionType === 'wipe'} onClick={() => setTransitionType('wipe')} />
          </div>
          
          <div className="flex flex-col gap-2 mt-auto">
            <button
              onClick={onCut}
              className="h-12 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-white font-bold text-sm active:scale-95 transition-transform"
            >
              CUT
            </button>
            <button
              onClick={onAuto}
              className="h-12 bg-red-600 hover:bg-red-500 border border-red-400 rounded text-white font-bold text-sm shadow-[0_0_10px_rgba(220,38,38,0.5)] active:scale-95 transition-transform"
            >
              AUTO
            </button>
          </div>
        </div>

        {/* T-Bar */}
        <div className="relative w-12 h-full bg-gray-950 rounded-lg border border-gray-800 flex justify-center py-2">
          <div className="absolute top-2 bottom-2 w-1 bg-gray-800 rounded-full"></div>
          <input
            type="range"
            min="0"
            max="100"
            value={tBarValue}
            onChange={handleTBarChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-20"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any} // Vertical slider hack
          />
          {/* Visual Handle */}
          <div 
            className="absolute w-10 h-6 bg-gray-300 rounded shadow-lg z-10 flex items-center justify-center cursor-ns-resize transition-all duration-75 ease-out"
            style={{ top: `${100 - tBarValue}%`, transform: 'translateY(-50%)' }}
          >
            <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusButton({ label, active, type, onClick }: { label: string, active: boolean, type: 'program' | 'preview', onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-12 h-10 rounded flex items-center justify-center text-xs font-bold border transition-all shadow-sm",
        type === 'program' 
          ? (active ? "bg-red-600 border-red-400 text-white shadow-[0_0_8px_rgba(220,38,38,0.6)]" : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700")
          : (active ? "bg-green-600 border-green-400 text-white shadow-[0_0_8px_rgba(22,163,74,0.6)]" : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700")
      )}
    >
      {label}
    </button>
  );
}

function TransTypeBtn({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 rounded text-[10px] font-bold border transition-colors",
        active ? "bg-yellow-500 text-black border-yellow-400" : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
      )}
    >
      {label}
    </button>
  );
}
