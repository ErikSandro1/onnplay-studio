/**
 * ChatSource Component
 * Chat Unificado como Fonte de Vídeo - aparece na área de fontes
 * Pode ser expandido/minimizado igual às outras fontes de vídeo
 */
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Youtube, ChevronDown, ChevronUp, Eye, EyeOff, Pin, Send, X, Maximize2, Minimize2 } from 'lucide-react';
import { commentOverlayService } from '../services/CommentOverlayService';
import type { Comment } from '../types/comments';

// Ícone do Twitch customizado
const TwitchIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>
);

// Ícone do Facebook
const FacebookIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
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
  isHighlighted?: boolean;
}

interface ChatSourceProps {
  onShowOnStream?: (message: ChatMessage) => void;
}

const platformColors = {
  youtube: { bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500' },
  twitch: { bg: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500' },
  facebook: { bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500' },
  custom: { bg: 'bg-gray-600', text: 'text-gray-400', border: 'border-gray-500' },
};

export default function ChatSource({ onShowOnStream }: ChatSourceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [showOnStream, setShowOnStream] = useState(true);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o final
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  // Função para adicionar mensagem externa (chamada por integrações reais)
  const addExternalMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev.slice(-100), msg]);
    
    // Adicionar ao sistema de overlay de comentários
    if (showOnStream) {
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
    }
  };

  // Expor função para uso externo (integrações de plataformas)
  useEffect(() => {
    // @ts-ignore - Expor para uso global temporário
    window.addChatSourceMessage = addExternalMessage;
    return () => {
      // @ts-ignore
      delete window.addChatSourceMessage;
    };
  }, [showOnStream]);

  // Simular mensagens para demonstração
  useEffect(() => {
    const demoMessages: ChatMessage[] = [
      {
        id: '1',
        platform: 'youtube',
        username: 'TechFan2024',
        message: 'Ótima live! 🔥',
        timestamp: new Date(),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TechFan',
      },
      {
        id: '2',
        platform: 'twitch',
        username: 'StreamerPro',
        message: 'Qual equipamento você usa?',
        timestamp: new Date(),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=StreamerPro',
      },
      {
        id: '3',
        platform: 'facebook',
        username: 'Maria Silva',
        message: 'Adorando o conteúdo! 👏',
        timestamp: new Date(),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
      },
    ];
    setMessages(demoMessages);
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const msg: ChatMessage = {
      id: Date.now().toString(),
      platform: 'custom',
      username: 'Host',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Host',
      message: newMessage,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, msg]);
    setNewMessage('');
  };

  const handlePinMessage = (msg: ChatMessage) => {
    if (pinnedMessage?.id === msg.id) {
      setPinnedMessage(null);
    } else {
      setPinnedMessage(msg);
    }
  };

  const handleShowOnStream = (msg: ChatMessage) => {
    if (onShowOnStream) {
      onShowOnStream(msg);
    }
    // Adicionar ao overlay
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
      isPinned: true,
      isStarred: true,
      isRead: false,
    };
    commentOverlayService.showOnScreen(comment);
  };

  const filteredMessages = filterPlatform === 'all' 
    ? messages 
    : messages.filter(m => m.platform === filterPlatform);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube size={12} className="text-red-500" />;
      case 'twitch':
        return <TwitchIcon size={12} className="text-purple-500" />;
      case 'facebook':
        return <FacebookIcon size={12} className="text-blue-500" />;
      default:
        return <MessageCircle size={12} className="text-gray-500" />;
    }
  };

  const messageCount = messages.length;
  const youtubeCount = messages.filter(m => m.platform === 'youtube').length;
  const twitchCount = messages.filter(m => m.platform === 'twitch').length;
  const facebookCount = messages.filter(m => m.platform === 'facebook').length;

  // Versão minimizada (só o header)
  if (!isExpanded) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <MessageCircle size={20} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">Chat Unificado</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{messageCount} mensagens</span>
                {youtubeCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Youtube size={10} className="text-red-500" />
                    {youtubeCount}
                  </span>
                )}
                {twitchCount > 0 && (
                  <span className="flex items-center gap-1">
                    <TwitchIcon size={10} className="text-purple-500" />
                    {twitchCount}
                  </span>
                )}
                {facebookCount > 0 && (
                  <span className="flex items-center gap-1">
                    <FacebookIcon size={10} className="text-blue-500" />
                    {facebookCount}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showOnStream ? (
              <Eye size={16} className="text-green-400" />
            ) : (
              <EyeOff size={16} className="text-gray-500" />
            )}
            <ChevronDown size={20} className="text-gray-400" />
          </div>
        </button>
      </div>
    );
  }

  // Versão expandida
  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col ${isMaximized ? 'fixed inset-4 z-50' : 'max-h-96'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <MessageCircle size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">Chat Unificado</p>
            <p className="text-xs text-gray-400">{messageCount} mensagens</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Toggle mostrar na transmissão */}
          <button
            onClick={() => setShowOnStream(!showOnStream)}
            className={`p-1.5 rounded transition-colors ${showOnStream ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}
            title={showOnStream ? 'Visível na transmissão' : 'Oculto na transmissão'}
          >
            {showOnStream ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          
          {/* Maximizar */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400"
            title={isMaximized ? 'Minimizar' : 'Maximizar'}
          >
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          
          {/* Minimizar */}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400"
            title="Minimizar"
          >
            <ChevronUp size={16} />
          </button>
        </div>
      </div>

      {/* Filtros de plataforma */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-700 bg-gray-850">
        <button
          onClick={() => setFilterPlatform('all')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            filterPlatform === 'all' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Todos ({messageCount})
        </button>
        <button
          onClick={() => setFilterPlatform('youtube')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
            filterPlatform === 'youtube' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Youtube size={12} /> {youtubeCount}
        </button>
        <button
          onClick={() => setFilterPlatform('twitch')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
            filterPlatform === 'twitch' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <TwitchIcon size={12} /> {twitchCount}
        </button>
        <button
          onClick={() => setFilterPlatform('facebook')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
            filterPlatform === 'facebook' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <FacebookIcon size={12} /> {facebookCount}
        </button>
      </div>

      {/* Mensagem fixada */}
      {pinnedMessage && (
        <div className="p-2 bg-yellow-900/30 border-b border-yellow-600/50">
          <div className="flex items-start gap-2">
            <Pin size={14} className="text-yellow-500 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {getPlatformIcon(pinnedMessage.platform)}
                <span className="text-yellow-400 text-xs font-medium">{pinnedMessage.username}</span>
              </div>
              <p className="text-white text-sm truncate">{pinnedMessage.message}</p>
            </div>
            <button
              onClick={() => setPinnedMessage(null)}
              className="p-1 hover:bg-yellow-800/50 rounded"
            >
              <X size={14} className="text-yellow-500" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de mensagens */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs">As mensagens aparecerão aqui quando a live começar</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-700/50 transition-colors ${
                msg.isHighlighted ? 'bg-orange-900/30 border border-orange-600/50' : ''
              }`}
            >
              {/* Avatar */}
              <img
                src={msg.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`}
                alt={msg.username}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              
              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getPlatformIcon(msg.platform)}
                  <span className={`text-xs font-medium ${platformColors[msg.platform].text}`}>
                    {msg.username}
                  </span>
                  <span className="text-xs text-gray-500">
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-white text-sm break-words">{msg.message}</p>
              </div>
              
              {/* Ações (aparecem no hover) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handlePinMessage(msg)}
                  className={`p-1 rounded transition-colors ${
                    pinnedMessage?.id === msg.id ? 'bg-yellow-600/20 text-yellow-400' : 'hover:bg-gray-600 text-gray-400'
                  }`}
                  title="Fixar mensagem"
                >
                  <Pin size={14} />
                </button>
                <button
                  onClick={() => handleShowOnStream(msg)}
                  className="p-1 hover:bg-gray-600 rounded transition-colors text-gray-400"
                  title="Mostrar na transmissão"
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensagem */}
      <div className="p-2 border-t border-gray-700 bg-gray-900">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Enviar mensagem como Host..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-orange-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
