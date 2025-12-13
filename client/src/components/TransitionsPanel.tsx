import React, { useState } from 'react';

type TransitionType = 'mix' | 'wipe' | 'cut' | 'auto';

interface TransitionsPanelProps {
  onTransitionSelect?: (type: TransitionType) => void;
}

const TransitionsPanel: React.FC<TransitionsPanelProps> = ({ onTransitionSelect }) => {
  const [activeTransition, setActiveTransition] = useState<TransitionType>('mix');

  const transitions: { type: TransitionType; label: string }[] = [
    { type: 'mix', label: 'MIX' },
    { type: 'wipe', label: 'WIPE' },
    { type: 'cut', label: 'CUT' },
    { type: 'auto', label: 'AUTO' },
  ];

  const handleTransitionClick = (type: TransitionType) => {
    setActiveTransition(type);
    onTransitionSelect?.(type);
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
        TRANSITIONS
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {transitions.map((transition) => {
          const isActive = activeTransition === transition.type;

          return (
            <button
              key={transition.type}
              onClick={() => handleTransitionClick(transition.type)}
              className="px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200 hover:scale-105"
              style={{
                background: isActive ? '#FF6B00' : '#1E2842',
                color: isActive ? '#FFFFFF' : '#B8C5D6',
                boxShadow: isActive ? '0 0 20px rgba(255, 107, 0, 0.5)' : 'none',
                border: isActive ? '2px solid #FF8833' : '2px solid transparent',
              }}
            >
              {transition.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TransitionsPanel;
