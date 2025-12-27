/**
 * UnifiedChat Component
 * Chat Unificado com design Cinematic Dark Mode (dourado/preto)
 * Baseado no design do OnnPlay Studio Pro
 */

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Youtube, Facebook, Settings, Pin, Eye, EyeOff, X, Send, Filter, Trash2 } from 'lucide-react';
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
  badges?: string[];
}

interface UnifiedChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UnifiedChat({ isOpen, onClose }: UnifiedChatProps) {
  // Iniciar com array vazio - mensagens reais virão das plataformas conectadas
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [newMessage, setNewMessage] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [showModeration, setShowModeration] = useState(false);
  const [autoShow, setAutoShow] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
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
    
    // Add to comment overlay system
    const comment: Comment = {
      id: msg.id,
      platform: msg.platform,
      author: {
        id: msg.id,
        name: msg.username,
        avatarUrl: msg.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`,
        badges: [],
      },
      message: msg.message,
      timestamp: msg.timestamp.getTime(),
      isPinned: false,
      isStarred: false,
      isRead: false,
    };
    commentOverlayService.addComment(comment);
  };

  // Expor função para uso externo (integrações de plataformas)
  useEffect(() => {
    // @ts-ignore - Expor para uso global temporário
    window.addChatMessage = addExternalMessage;
    return () => {
      // @ts-ignore
      delete window.addChatMessage;
    };
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      platform: 'custom',
      username: 'Você (Host)',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Host',
      message: newMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, msg]);
    setNewMessage('');
  };

  const handlePinMessage = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, isPinned: !msg.isPinned } : msg))
    );
  };

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const handleSelectMessage = (msg: ChatMessage) => {
    const newSelected = selectedMessage?.id === msg.id ? null : msg;
    setSelectedMessage(newSelected);
    
    // Pin to overlay if selected
    if (newSelected) {
      const comment: Comment = {
        id: newSelected.id,
        platform: newSelected.platform,
        author: {
          id: newSelected.id,
          name: newSelected.username,
          avatarUrl: newSelected.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newSelected.username}`,
          badges: [],
        },
        message: newSelected.message,
        timestamp: newSelected.timestamp.getTime(),
        isPinned: true,
        isStarred: false,
        isRead: false,
      };
      commentOverlayService.pinComment(comment);
    } else {
      commentOverlayService.clearPinned();
    }
  };

  const getPlatformIcon = (platform: string, size: number = 16) => {
    switch (platform) {
      case 'youtube':
        return (
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
            <Youtube size={size} className="text-white" />
          </div>
        );
      case 'twitch':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <TwitchIcon size={size} className="text-white" />
          </div>
        );
      case 'facebook':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Facebook size={size} className="text-white" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-[#d4a853] flex items-center justify-center flex-shrink-0">
            <MessageCircle size={size} className="text-black" />
          </div>
        );
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredMessages = messages.filter(
    (msg) => filterPlatform === 'all' || msg.platform === filterPlatform
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col border-2 border-[#2a2a2a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] bg-gradient-to-r from-[#0a0a0a] to-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4a853] to-[#b8934a] flex items-center justify-center">
              <MessageCircle size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#d4a853] tracking-wide uppercase">
                Multistream Chat Unificado
              </h2>
              <p className="text-xs text-gray-500">
                {filteredMessages.length} mensagens • {filterPlatform === 'all' ? 'Todas as plataformas' : filterPlatform}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[#2a2a2a] bg-[#0f0f0f]">
          <Filter size={16} className="text-gray-500" />
          <button
            onClick={() => setFilterPlatform('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              filterPlatform === 'all'
                ? 'bg-gradient-to-r from-[#d4a853] to-[#b8934a] text-black'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterPlatform('youtube')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              filterPlatform === 'youtube'
                ? 'bg-red-600 text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
            }`}
          >
            <Youtube size={14} /> YouTube
          </button>
          <button
            onClick={() => setFilterPlatform('twitch')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              filterPlatform === 'twitch'
                ? 'bg-purple-600 text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
            }`}
          >
            <TwitchIcon size={14} /> Twitch
          </button>
          <button
            onClick={() => setFilterPlatform('facebook')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              filterPlatform === 'facebook'
                ? 'bg-blue-600 text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
            }`}
          >
            <Facebook size={14} /> Facebook
          </button>
          
          <div className="flex-1"></div>
          
          <button
            onClick={() => {
              const newAutoShow = !autoShow;
              setAutoShow(newAutoShow);
              commentOverlayService.setAutoShow(newAutoShow);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              autoShow
                ? 'bg-cyan-600 text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
            }`}
            title="Mostrar todos os comentários automaticamente na tela"
          >
            {autoShow ? <Eye size={14} /> : <EyeOff size={14} />}
            {autoShow ? 'Auto ON' : 'Auto OFF'}
          </button>
          <button
            onClick={() => setShowModeration(!showModeration)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              showModeration
                ? 'bg-[#d4a853] text-black'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
            }`}
          >
            Moderação
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => handleSelectMessage(msg)}
              className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                selectedMessage?.id === msg.id
                  ? 'bg-[#d4a853]/20 border-2 border-[#d4a853] shadow-lg shadow-[#d4a853]/20'
                  : msg.isPinned
                  ? 'bg-[#d4a853]/10 border-2 border-[#d4a853]/50'
                  : 'hover:bg-[#1a1a1a] border-2 border-transparent'
              }`}
            >
              {/* Platform Icon */}
              {getPlatformIcon(msg.platform)}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{msg.username}</span>
                    {msg.badges?.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-[#2a2a2a] text-xs text-[#d4a853] rounded font-medium"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-300 mt-1 break-words">{msg.message}</p>
              </div>

              {/* Moderation Actions */}
              {showModeration && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinMessage(msg.id);
                    }}
                    className={`p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors ${
                      msg.isPinned ? 'text-[#d4a853]' : 'text-gray-500'
                    }`}
                    title="Fixar mensagem"
                  >
                    <Pin size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(msg.id);
                    }}
                    className="p-2 rounded-lg hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-colors"
                    title="Deletar mensagem"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Selected Message Preview */}
        {selectedMessage && (
          <div className="px-6 py-3 border-t border-[#2a2a2a] bg-[#0f0f0f]">
            <div className="flex items-center gap-3 p-3 bg-[#d4a853]/10 border border-[#d4a853]/30 rounded-lg">
              <Eye size={16} className="text-[#d4a853]" />
              <span className="text-sm text-[#d4a853]">
                Mensagem de <strong>{selectedMessage.username}</strong> está sendo exibida no overlay
              </span>
              <button
                onClick={() => {
                  setSelectedMessage(null);
                  commentOverlayService.clearPinned();
                }}
                className="ml-auto text-xs text-gray-400 hover:text-white"
              >
                Remover
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t border-[#2a2a2a] bg-[#0f0f0f]">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Enviar mensagem para o chat..."
              className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#d4a853] transition-colors"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#d4a853] to-[#b8934a] hover:from-[#e0b563] hover:to-[#c9a45a] disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl text-black font-bold transition-all flex items-center gap-2"
            >
              <Send size={18} />
              Enviar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 Clique em uma mensagem para exibi-la como overlay na transmissão
          </p>
        </div>
      </div>
    </div>
  );
}
