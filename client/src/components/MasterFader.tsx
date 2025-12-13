import { useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';

interface MasterFaderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
}

export default function MasterFader({ 
  value = 50, 
  onChange,
  min = 0,
  max = 100
}: MasterFaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const faderRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !faderRef.current) return;

    const rect = faderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, (1 - y / rect.height) * 100));
    
    setCurrentValue(Math.round(percentage));
    if (onChange) {
      onChange(Math.round(percentage));
    }
  };

  const getColor = () => {
    if (currentValue > 80) return 'from-red-500 to-red-600';
    if (currentValue > 60) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!faderRef.current) return;
    const rect = faderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, (1 - y / rect.height) * 100));
    
    setCurrentValue(Math.round(percentage));
    if (onChange) {
      onChange(Math.round(percentage));
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 h-full">
      {/* Fader Track */}
      <div
        ref={faderRef}
        className="flex-1 w-12 bg-gray-900 rounded-full relative cursor-pointer border-2 border-gray-700 hover:border-orange-500 transition-colors"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      >
        {/* Filled portion */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getColor()} rounded-full transition-all`}
          style={{ height: `${currentValue}%` }}
        ></div>

        {/* Handle */}
        <div
          className={`absolute left-1/2 w-10 h-6 bg-gradient-to-b from-gray-600 to-gray-800 rounded-full border-2 border-gray-500 cursor-grab active:cursor-grabbing transition-all ${
            isDragging ? 'shadow-lg shadow-orange-500' : ''
          }`}
          style={{
            transform: `translate(-50%, calc(${100 - currentValue}% - 12px))`,
          }}
        ></div>

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <div
            key={tick}
            className="absolute left-0 right-0 h-0.5 bg-gray-600"
            style={{ bottom: `${tick}%` }}
          ></div>
        ))}
      </div>

      {/* Value Display */}
      <div className="text-center">
        <p className="text-xs font-bold text-orange-500">{currentValue}</p>
        <p className="text-xs text-gray-500">dB</p>
      </div>

      {/* Meter Indicator */}
      <div className="w-full flex items-end justify-center gap-0.5 h-16 bg-gray-900 rounded p-1">
        {[...Array(8)].map((_, i) => {
          const threshold = (i / 8) * 100;
          const isActive = currentValue >= threshold;
          const isWarning = currentValue > 80;
          const isPeak = currentValue > 90;

          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-all ${
                isActive
                  ? isPeak
                    ? 'bg-red-600'
                    : isWarning
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                  : 'bg-gray-700'
              }`}
              style={{ height: `${(i + 1) * 12.5}%` }}
            ></div>
          );
        })}
      </div>
    </div>
  );
}
