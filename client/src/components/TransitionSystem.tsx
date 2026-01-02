import { useState, useEffect } from 'react';
import { Zap, Scissors, ArrowRightLeft, Play, X } from 'lucide-react';
import { toast } from 'sonner';

type TransitionType = 'mix' | 'wipe' | 'cut' | 'auto';

interface TransitionSystemProps {
  onTransition: (type: TransitionType) => void;
  isTransitioning: boolean;
  onClose?: () => void;
}

export default function TransitionSystem({ onTransition, isTransitioning, onClose }: TransitionSystemProps) {
  const [selectedTransition, setSelectedTransition] = useState<TransitionType>('mix');
  const [transitionDuration, setTransitionDuration] = useState(1000); // ms
  const [autoTransitionInterval, setAutoTransitionInterval] = useState(5000); // ms
  const [isAutoMode, setIsAutoMode] = useState(false);

  const transitions = [
    {
      id: 'mix' as TransitionType,
      label: 'MIX',
      icon: ArrowRightLeft,
      description: 'Transição suave com fade',
      color: 'bg-yellow-600 hover:bg-yellow-700',
    },
    {
      id: 'wipe' as TransitionType,
      label: 'WIPE',
      icon: Zap,
      description: 'Transição com efeito de varredura',
      color: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      id: 'cut' as TransitionType,
      label: 'CUT',
      icon: Scissors,
      description: 'Corte direto instantâneo',
      color: 'bg-gray-800 hover:bg-gray-900',
    },
    {
      id: 'auto' as TransitionType,
      label: 'AUTO',
      icon: Play,
      description: 'Transição automática',
      color: 'bg-red-600 hover:bg-red-700',
    },
  ];

  // Auto transition logic
  useEffect(() => {
    if (!isAutoMode) return;

    const interval = setInterval(() => {
      // Use selected transition instead of always 'mix'
      const transitionToUse = selectedTransition === 'auto' ? 'mix' : selectedTransition;
      handleTransition(transitionToUse);
      toast.info('Transição automática executada', {
        description: `Próxima transição em ${autoTransitionInterval / 1000}s`,
      });
    }, autoTransitionInterval);

    return () => clearInterval(interval);
  }, [isAutoMode, autoTransitionInterval, selectedTransition]);

  const handleTransition = (type: TransitionType) => {
    console.log('🎭 TransitionSystem.handleTransition called:', type);
    
    if (isTransitioning) {
      console.log('⚠️ isTransitioning is true, showing warning');
      toast.warning('Aguarde a transição atual terminar');
      return;
    }

    setSelectedTransition(type);

    // Execute transition
    console.log('📞 Calling onTransition prop with:', type);
    onTransition(type);

    // Show toast based on transition type
    const messages = {
      mix: 'Transição suave executada',
      wipe: 'Transição com efeito de varredura',
      cut: 'Corte direto executado',
      auto: 'Modo automático ativado',
    };

    toast.success(messages[type], {
      description: type === 'auto' ? 'Transições automáticas iniciadas' : `Duração: ${transitionDuration}ms`,
    });

    // Toggle auto mode if AUTO button
    if (type === 'auto') {
      setIsAutoMode(!isAutoMode);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header with Close Button */}
      {onClose && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-bold text-sm">Transições</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      )}
      
      {/* Transition Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {transitions.map((transition) => {
          const Icon = transition.icon;
          const isActive = selectedTransition === transition.id;
          const isAutoActive = transition.id === 'auto' && isAutoMode;

          return (
            <button
              key={transition.id}
              onClick={() => handleTransition(transition.id)}
              disabled={isTransitioning && transition.id !== 'auto'}
              className={`${transition.color} ${
                isActive || isAutoActive ? 'ring-2 ring-white' : ''
              } ${
                isAutoActive ? 'animate-pulse' : ''
              } text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1 relative`}
              title={transition.description}
            >
              <Icon size={20} />
              <span className="text-xs">{transition.label}</span>
              {isTransitioning && transition.id === selectedTransition && (
                <div className="absolute inset-0 bg-white bg-opacity-20 rounded-lg animate-pulse"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Transition Settings */}
      <div className="bg-gray-800 rounded-lg p-3 space-y-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Duração da Transição</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="100"
              max="3000"
              step="100"
              value={transitionDuration}
              onChange={(e) => setTransitionDuration(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-white font-mono w-16 text-right">
              {transitionDuration}ms
            </span>
          </div>
        </div>

        {isAutoMode && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Intervalo Auto</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={autoTransitionInterval}
                onChange={(e) => setAutoTransitionInterval(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-white font-mono w-12 text-right">
                {autoTransitionInterval / 1000}s
              </span>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center pt-1">
          {isAutoMode ? (
            <span className="text-red-400 font-semibold animate-pulse">
              🔴 MODO AUTOMÁTICO ATIVO
            </span>
          ) : (
            'Selecione um tipo de transição acima'
          )}
        </div>
      </div>
    </div>
  );
}
