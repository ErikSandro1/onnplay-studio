import { useState, useEffect } from 'react';
import { Smile, X } from 'lucide-react';
import { toast } from 'sonner';

interface Reaction {
  id: string;
  emoji: string;
  author: string;
  timestamp: Date;
  x: number;
  y: number;
}

const REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '😍', '👏', '🚀', '💯', '⭐'];

interface ReactionsPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ReactionsPanel({ isOpen = false, onClose }: ReactionsPanelProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [selectedReaction, setSelectedReaction] = useState<string>('👍');

  // Remove reactions after 3 seconds
  useEffect(() => {
    if (reactions.length === 0) return;

    const timer = setInterval(() => {
      setReactions(prev => prev.slice(1));
    }, 3000);

    return () => clearInterval(timer);
  }, [reactions]);

  const handleSendReaction = (emoji: string) => {
    const reaction: Reaction = {
      id: Date.now().toString(),
      emoji,
      author: 'Você',
      timestamp: new Date(),
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
    };

    setReactions([...reactions, reaction]);
    toast.success(`Reação enviada: ${emoji}`);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Reactions Floating Display */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {reactions.map(reaction => (
          <div
            key={reaction.id}
            className="fixed text-4xl animate-bounce"
            style={{
              left: `${reaction.x}%`,
              top: `${reaction.y}%`,
              animation: 'float-up 3s ease-out forwards',
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* Reactions Selector Panel */}
      <div className="fixed bottom-4 left-4 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-50 pointer-events-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smile size={20} className="text-orange-500" />
            <p className="text-sm font-semibold text-white">Reações</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Reactions Grid */}
        <div className="grid grid-cols-5 gap-2">
          {REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleSendReaction(emoji)}
              className={`w-10 h-10 flex items-center justify-center text-xl rounded border transition-all hover:scale-110 ${
                selectedReaction === emoji
                  ? 'bg-orange-600 border-orange-500'
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
              }`}
              title={`Enviar ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 mt-3 text-center">
          Clique para enviar reação
        </p>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.5);
          }
        }
      `}</style>
    </>
  );
}
