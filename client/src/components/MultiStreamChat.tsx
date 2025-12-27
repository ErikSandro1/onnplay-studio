/**
 * MultiStreamChat Component
 * Chat Unificado com design Cinematic Dark Mode (dourado/preto)
 * Baseado no design do OnnPlay Studio Pro
 */

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Youtube, Facebook, Settings, Pin, Eye, EyeOff, X, ChevronDown } from 'lucide-react';
import { commentOverlayService } from '../services/CommentOverlayService';
import type { Comment } from '../types/comments';

// Ícone do Twitch customizado
const TwitchIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>
);

interface ChatMessage {
  id: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'custom';
  username: string;
  avatarUrl?: string;
  message: string;
  timestamp: Date;
  isPinned?: boolean;
  isSelected?: boolean;
}

interface MultiStreamChatProps {
  className?: string;
  onSelectMessage?: (message: ChatMessage | null) => void;
  selectedMessage?: ChatMessage | null;
}

export function MultiStreamChat({ className = '', onSelectMessage, selectedMessage }: MultiStreamChatProps) {
  // Iniciar com array vazio - mensagens reais virão das plataformas conectadas
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [showOverlay, setShowOverlay] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Função para adicionar mensagem externa (chamada por integrações reais)
  const addExternalMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-50), msg]);
  };

  // Expor função para uso externo (integrações de plataformas)
  useEffect(() => {
    // @ts-ignore - Expor para uso global temporário
    window.addMultiStreamChatMessage = addExternalMessage;
    return () => {
      // @ts-ignore
      delete window.addMultiStreamChatMessage;
    };
  }, []);

  const handleSelectMessage = (msg: ChatMessage) => {
    const newSelected = selectedMessage?.id === msg.id ? null : msg;
    onSelectMessage?.(newSelected);
  };

  const getPlatformIcon = (platform: string, size: number = 20) => {
    switch (platform) {
      case 'youtube':
        return (
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
            <Youtube size={size} className="text-white" />
          </div>
        );
      case 'twitch':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
            <TwitchIcon size={size} className="text-white" />
          </div>
        );
      case 'facebook':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <Facebook size={size} className="text-white" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            <MessageCircle size={size} className="text-white" />
          </div>
        );
    }
  };

  const formatTime = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'agora';
    return `${minutes}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const filteredMessages = messages.filter(
    (msg) => filterPlatform === 'all' || msg.platform === filterPlatform
  );

  return (
    <div className={`flex flex-col h-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2a2a]">
        <h2 className="text-lg font-bold text-[#d4a853] tracking-wide uppercase">
          Multistream Chat Unificado
        </h2>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2a2a2a] bg-[#0f0f0f]">
        <button
          onClick={() => setFilterPlatform('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filterPlatform === 'all'
              ? 'bg-[#d4a853] text-black'
              : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilterPlatform('youtube')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            filterPlatform === 'youtube'
              ? 'bg-red-600 text-white'
              : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
          }`}
        >
          <Youtube size={12} /> YouTube
        </button>
        <button
          onClick={() => setFilterPlatform('twitch')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            filterPlatform === 'twitch'
              ? 'bg-purple-600 text-white'
              : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
          }`}
        >
          <TwitchIcon size={12} /> Twitch
        </button>
        <button
          onClick={() => setFilterPlatform('facebook')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            filterPlatform === 'facebook'
              ? 'bg-blue-600 text-white'
              : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
          }`}
        >
          <Facebook size={12} /> Facebook
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filteredMessages.map((msg) => (
          <div
            key={msg.id}
            onClick={() => handleSelectMessage(msg)}
            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              selectedMessage?.id === msg.id
                ? 'bg-[#d4a853]/20 border-2 border-[#d4a853]'
                : 'hover:bg-[#1a1a1a] border-2 border-transparent'
            }`}
          >
            {/* Platform Icon */}
            {getPlatformIcon(msg.platform)}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white text-sm">{msg.username}</span>
                <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-sm text-gray-300 mt-0.5 break-words">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer - Configuration Button */}
      <div className="px-4 py-3 border-t border-[#2a2a2a] bg-[#0f0f0f]">
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#d4a853] to-[#b8934a] hover:from-[#e0b563] hover:to-[#c9a45a] text-black font-semibold rounded-lg transition-all"
        >
          <Settings size={16} />
          CONFIGURAÇÃO
        </button>
      </div>
    </div>
  );
}

/**
 * ChatMessageOverlay Component
 * Exibe a mensagem selecionada como overlay na transmissão
 */
export function ChatMessageOverlay({ message, position = 'bottom-right' }: { message: ChatMessage | null; position?: string }) {
  if (!message) return null;

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube size={16} className="text-red-500" />;
      case 'twitch':
        return <TwitchIcon size={16} className="text-purple-500" />;
      case 'facebook':
        return <Facebook size={16} className="text-blue-500" />;
      default:
        return <MessageCircle size={16} className="text-gray-400" />;
    }
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }[position] || 'bottom-4 right-4';

  return (
    <div className={`absolute ${positionClasses} z-50 animate-fade-in`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-[#0a0a0a]/90 backdrop-blur-sm border-2 border-[#d4a853] rounded-xl max-w-md">
        {/* Avatar */}
        <img
          src={message.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.username}`}
          alt={message.username}
          className="w-10 h-10 rounded-full border-2 border-[#d4a853]"
        />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#d4a853]">{message.username}</span>
            {getPlatformIcon(message.platform)}
          </div>
          <p className="text-white text-sm mt-0.5">{message.message}</p>
        </div>
      </div>
    </div>
  );
}

export default MultiStreamChat;
