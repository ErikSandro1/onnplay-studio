import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  author: string;
  avatar?: string;
  message: string;
  timestamp: Date;
  role: 'host' | 'guest' | 'viewer';
  isModerated?: boolean;
}

interface LiveChatProps {
  isOpen?: boolean;
  onClose?: () => void;
  userName?: string;
  userRole?: 'host' | 'guest' | 'viewer';
}

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    author: 'Você (Host)',
    message: 'Bem-vindo a transmissão ao vivo!',
    timestamp: new Date(Date.now() - 300000),
    role: 'host',
  },
  {
    id: '2',
    author: 'João Silva',
    message: 'Ótima qualidade de transmissão!',
    timestamp: new Date(Date.now() - 240000),
    role: 'guest',
  },
  {
    id: '3',
    author: 'Maria Santos',
    message: 'Quando começa?',
    timestamp: new Date(Date.now() - 180000),
    role: 'viewer',
  },
  {
    id: '4',
    author: 'Pedro Costa',
    message: 'Adorei o conteúdo!',
    timestamp: new Date(Date.now() - 120000),
    role: 'viewer',
  },
];

export default function LiveChat({
  isOpen = false,
  onClose,
  userName = 'Você',
  userRole = 'host',
}: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [showModeration, setShowModeration] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      author: userName,
      message: newMessage,
      timestamp: new Date(),
      role: userRole,
    };

    setMessages([...messages, message]);
    setNewMessage('');
    toast.success('Mensagem enviada!');
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(messages.filter(m => m.id !== messageId));
    toast.success('Mensagem removida');
  };

  const handleBlockUser = (author: string) => {
    setMessages(messages.filter(m => m.author !== author));
    toast.success(`${author} foi bloqueado`);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'host':
        return 'text-orange-500';
      case 'guest':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'host':
        return '👑';
      case 'guest':
        return '🎤';
      default:
        return '👁️';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800">
          <div className="flex items-center gap-2">
            <MessageSquare size={24} className="text-orange-500" />
            <div>
              <h2 className="text-lg font-bold text-white">Chat ao Vivo</h2>
              <p className="text-xs text-gray-400">{messages.length} mensagens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma mensagem ainda</p>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className="group p-3 bg-gray-900 rounded border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{getRoleBadge(msg.role)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${getRoleColor(msg.role)} truncate`}>
                        {msg.author}
                      </p>
                      <p className="text-xs text-gray-600">
                        {msg.timestamp.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Delete Button (Host only) */}
                  {userRole === 'host' && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 hover:bg-opacity-20 rounded transition-all"
                      title="Deletar mensagem"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-300 break-words">{msg.message}</p>

                {/* Block User Button (Host only) */}
                {userRole === 'host' && msg.role !== 'host' && (
                  <button
                    onClick={() => handleBlockUser(msg.author)}
                    className="mt-2 text-xs px-2 py-1 bg-red-900 bg-opacity-30 text-red-400 rounded hover:bg-opacity-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Bloquear usuário
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Moderation Info */}
        {showModeration && (
          <div className="border-t border-gray-700 p-3 bg-blue-900 bg-opacity-30 border-b border-blue-700 flex gap-2">
            <AlertCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300">
              <p className="font-semibold">Modo Moderação Ativo</p>
              <p>Você pode deletar mensagens e bloquear usuários</p>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4 bg-gray-800 sticky bottom-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-600 text-white rounded font-semibold transition-colors flex items-center gap-2"
            >
              <Send size={16} />
              Enviar
            </button>
          </div>

          {/* Moderation Toggle */}
          {userRole === 'host' && (
            <button
              onClick={() => setShowModeration(!showModeration)}
              className={`mt-2 w-full px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                showModeration
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {showModeration ? '🔒 Moderação Ativa' : '🔓 Ativar Moderação'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
