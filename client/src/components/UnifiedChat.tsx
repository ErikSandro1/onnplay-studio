import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Youtube, Twitch, Facebook, X, Send, Filter, Pin, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'custom';
  username: string;
  message: string;
  timestamp: Date;
  isPinned?: boolean;
  isHighlighted?: boolean;
  badges?: string[];
}

interface UnifiedChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UnifiedChat({ isOpen, onClose }: UnifiedChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      platform: 'youtube',
      username: 'João Silva',
      message: 'Ótima transmissão! 🔥',
      timestamp: new Date(Date.now() - 120000),
      badges: ['Membro', 'Verificado'],
    },
    {
      id: '2',
      platform: 'twitch',
      username: 'GamerPro',
      message: 'Quando vai ter sorteio?',
      timestamp: new Date(Date.now() - 90000),
      badges: ['Subscriber'],
    },
    {
      id: '3',
      platform: 'facebook',
      username: 'Maria Santos',
      message: 'Primeira vez assistindo, adorei!',
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: '4',
      platform: 'youtube',
      username: 'TechLover',
      message: 'Qual câmera você está usando?',
      timestamp: new Date(Date.now() - 30000),
      isPinned: true,
    },
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [showModeration, setShowModeration] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simular mensagens chegando
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const platforms: Array<'youtube' | 'twitch' | 'facebook'> = ['youtube', 'twitch', 'facebook'];
      const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
      const sampleMessages = [
        'Conteúdo incrível! 👏',
        'Pode falar mais sobre isso?',
        'Obrigado pela dica!',
        'Quando é a próxima live?',
        'Salvando para assistir depois!',
      ];

      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        platform: randomPlatform,
        username: `User${Math.floor(Math.random() * 1000)}`,
        message: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMsg]);
    }, 8000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      platform: 'custom',
      username: 'Você (Host)',
      message: newMessage,
      timestamp: new Date(),
      isHighlighted: true,
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

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube size={14} className="text-red-500" />;
      case 'twitch':
        return <Twitch size={14} className="text-purple-500" />;
      case 'facebook':
        return <Facebook size={14} className="text-blue-500" />;
      default:
        return <MessageCircle size={14} className="text-gray-400" />;
    }
  };

  const filteredMessages = messages.filter(
    (msg) => filterPlatform === 'all' || msg.platform === filterPlatform
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <MessageCircle size={24} className="text-orange-500" />
            <div>
              <h2 className="text-lg font-bold text-white">Chat Unificado</h2>
              <p className="text-xs text-gray-400">
                {filteredMessages.length} mensagens • {filterPlatform === 'all' ? 'Todas as plataformas' : filterPlatform}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-800 bg-gray-900/50">
          <Filter size={16} className="text-gray-400" />
          <button
            onClick={() => setFilterPlatform('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterPlatform === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterPlatform('youtube')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              filterPlatform === 'youtube'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Youtube size={12} /> YouTube
          </button>
          <button
            onClick={() => setFilterPlatform('twitch')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              filterPlatform === 'twitch'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Twitch size={12} /> Twitch
          </button>
          <button
            onClick={() => setFilterPlatform('facebook')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              filterPlatform === 'facebook'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Facebook size={12} /> Facebook
          </button>
          <div className="flex-1"></div>
          <button
            onClick={() => setShowModeration(!showModeration)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              showModeration
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Moderação
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg transition-colors ${
                msg.isPinned
                  ? 'bg-orange-900/20 border border-orange-600/30'
                  : msg.isHighlighted
                  ? 'bg-green-900/20 border border-green-600/30'
                  : 'bg-gray-800/50 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getPlatformIcon(msg.platform)}
                    <span className="text-sm font-semibold text-white">{msg.username}</span>
                    {msg.badges?.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gray-700 text-xs text-gray-300 rounded"
                      >
                        {badge}
                      </span>
                    ))}
                    <span className="text-xs text-gray-500">
                      {msg.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200">{msg.message}</p>
                </div>
                {showModeration && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePinMessage(msg.id)}
                      className={`p-1 rounded hover:bg-gray-700 transition-colors ${
                        msg.isPinned ? 'text-orange-500' : 'text-gray-400'
                      }`}
                      title="Fixar mensagem"
                    >
                      <Pin size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
                      title="Deletar mensagem"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Enviar mensagem para o chat..."
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-600"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              <Send size={16} />
              Enviar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Dica: Use a moderação para fixar ou remover mensagens do chat
          </p>
        </div>
      </div>
    </div>
  );
}
