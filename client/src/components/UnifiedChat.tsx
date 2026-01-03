/**
 * UnifiedChat Component
 * Chat Unificado com design Cinematic Dark Mode (dourado/preto)
 * Integrado com UnifiedChatService para YouTube e Twitch
 * Suporta conexão automática via OAuth (igual StreamYard)
 */

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Youtube, Facebook, Pin, Eye, EyeOff, X, Send, Filter, Trash2, Link2, Unlink, Loader2, RefreshCw, User, LogIn } from 'lucide-react';
import { unifiedChatService, UnifiedMessage, ConnectedAccount } from '../services/UnifiedChatService';
import { commentOverlayService } from '../services/CommentOverlayService';

// Ícone do Twitch customizado
const TwitchIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>
);

interface UnifiedChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UnifiedChat({ isOpen, onClose }: UnifiedChatProps) {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [showModeration, setShowModeration] = useState(false);
  const [autoShow, setAutoShow] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<UnifiedMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connection states
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [twitchConnected, setTwitchConnected] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [showConnectPanel, setShowConnectPanel] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  // Manual connection (fallback)
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [twitchChannel, setTwitchChannel] = useState('');
  const [isConnecting, setIsConnecting] = useState<'youtube' | 'twitch' | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to UnifiedChatService
  useEffect(() => {
    // Load existing messages
    setMessages(unifiedChatService.getMessages());

    // Subscribe to new messages
    const unsubMessage = unifiedChatService.onMessage((msg) => {
      setMessages(prev => [...prev.slice(-99), msg]);
    });

    // Subscribe to connection changes
    const unsubConnection = unifiedChatService.onConnectionChange((connections) => {
      const youtube = connections.find(c => c.platform === 'youtube');
      const twitch = connections.find(c => c.platform === 'twitch');
      setYoutubeConnected(youtube?.isConnected || false);
      setTwitchConnected(twitch?.isConnected || false);
    });

    // Subscribe to account changes
    const unsubAccounts = unifiedChatService.onAccountsChange((accounts) => {
      setConnectedAccounts(accounts);
    });

    // Check initial connection status
    setYoutubeConnected(unifiedChatService.isConnected('youtube'));
    setTwitchConnected(unifiedChatService.isConnected('twitch'));
    setAutoShow(unifiedChatService.getAutoShow());
    setConnectedAccounts(unifiedChatService.getConnectedAccounts());

    return () => {
      unsubMessage();
      unsubConnection();
      unsubAccounts();
    };
  }, []);

  // Auto-connect when panel opens
  useEffect(() => {
    if (isOpen && connectedAccounts.length > 0) {
      handleAutoConnect();
    }
  }, [isOpen]);

  const handleAutoConnect = async () => {
    setIsAutoConnecting(true);
    await unifiedChatService.autoConnect();
    setIsAutoConnecting(false);
  };

  const handleConnectYouTubeOAuth = () => {
    unifiedChatService.connectYouTubeOAuth();
  };

  const handleConnectTwitchOAuth = () => {
    unifiedChatService.connectTwitchOAuth();
  };

  const handleDisconnectAccount = async (accountId: string) => {
    await unifiedChatService.disconnectAccount(accountId);
  };

  // Manual connection handlers (fallback)
  const handleConnectYouTube = async () => {
    if (!youtubeVideoId.trim()) return;
    
    setIsConnecting('youtube');
    const success = await unifiedChatService.connectYouTube(youtubeVideoId.trim());
    setIsConnecting(null);
    
    if (success) {
      setShowManualConnect(false);
    }
  };

  const handleConnectTwitch = () => {
    if (!twitchChannel.trim()) return;
    
    setIsConnecting('twitch');
    unifiedChatService.connectTwitch(twitchChannel.trim());
    
    setTimeout(() => {
      setIsConnecting(null);
      if (unifiedChatService.isConnected('twitch')) {
        setShowManualConnect(false);
      }
    }, 2000);
  };

  const handleDisconnectYouTube = () => {
    unifiedChatService.disconnectYouTube();
    setYoutubeVideoId('');
  };

  const handleDisconnectTwitch = () => {
    unifiedChatService.disconnectTwitch();
    setTwitchChannel('');
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    unifiedChatService.addCustomMessage('Você (Host)', newMessage.trim());
    setNewMessage('');
  };

  const handleSelectMessage = (msg: UnifiedMessage) => {
    const newSelected = selectedMessage?.id === msg.id ? null : msg;
    setSelectedMessage(newSelected);
    
    if (newSelected) {
      unifiedChatService.pinToOverlay(newSelected.id);
    } else {
      unifiedChatService.clearPinnedOverlay();
    }
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const handleToggleAutoShow = () => {
    const newAutoShow = !autoShow;
    setAutoShow(newAutoShow);
    unifiedChatService.setAutoShow(newAutoShow);
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

  const youtubeAccounts = connectedAccounts.filter(a => a.platform === 'youtube');
  const twitchAccounts = connectedAccounts.filter(a => a.platform === 'twitch');

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
                Chat Unificado
              </h2>
              <p className="text-xs text-gray-500">
                {filteredMessages.length} mensagens • 
                {youtubeConnected && ' YouTube'} 
                {twitchConnected && ' Twitch'}
                {!youtubeConnected && !twitchConnected && ' Nenhuma plataforma conectada'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-connect button */}
            {connectedAccounts.length > 0 && (
              <button
                onClick={handleAutoConnect}
                disabled={isAutoConnecting}
                className="px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 bg-green-600/20 text-green-400 hover:bg-green-600/30"
              >
                {isAutoConnecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Auto-conectar
              </button>
            )}
            <button
              onClick={() => setShowConnectPanel(!showConnectPanel)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                showConnectPanel
                  ? 'bg-[#d4a853] text-black'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
            >
              <Link2 size={16} />
              Contas
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Connection Panel - OAuth Style */}
        {showConnectPanel && (
          <div className="px-6 py-4 border-b border-[#2a2a2a] bg-[#0f0f0f] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-400 uppercase">Contas Conectadas</h3>
              <button
                onClick={() => setShowManualConnect(!showManualConnect)}
                className="text-xs text-[#d4a853] hover:underline"
              >
                {showManualConnect ? 'Ocultar conexão manual' : 'Conexão manual'}
              </button>
            </div>
            
            {/* YouTube Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Youtube size={16} className="text-red-500" />
                <span>YouTube</span>
              </div>
              
              {youtubeAccounts.length > 0 ? (
                youtubeAccounts.map(account => (
                  <div key={account.id} className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                    {account.profileImage ? (
                      <img src={account.profileImage} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                        <User size={20} className="text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{account.displayName}</p>
                      <p className={`text-xs ${account.isConnected ? 'text-green-400' : 'text-gray-500'}`}>
                        {account.isConnected ? '● Chat conectado' : '○ Chat desconectado'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDisconnectAccount(account.id)}
                      className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded text-xs font-semibold hover:bg-red-600/30"
                    >
                      Remover
                    </button>
                  </div>
                ))
              ) : (
                <button
                  onClick={handleConnectYouTubeOAuth}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  <LogIn size={16} />
                  Conectar conta YouTube
                </button>
              )}
            </div>

            {/* Twitch Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <TwitchIcon size={16} className="text-purple-500" />
                <span>Twitch</span>
              </div>
              
              {twitchAccounts.length > 0 ? (
                twitchAccounts.map(account => (
                  <div key={account.id} className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                    {account.profileImage ? (
                      <img src={account.profileImage} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                        <User size={20} className="text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{account.displayName}</p>
                      <p className={`text-xs ${account.isConnected ? 'text-green-400' : 'text-gray-500'}`}>
                        {account.isConnected ? '● Chat conectado' : '○ Chat desconectado'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDisconnectAccount(account.id)}
                      className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded text-xs font-semibold hover:bg-red-600/30"
                    >
                      Remover
                    </button>
                  </div>
                ))
              ) : (
                <button
                  onClick={handleConnectTwitchOAuth}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
                >
                  <LogIn size={16} />
                  Conectar conta Twitch
                </button>
              )}
            </div>

            {/* Manual Connection (Fallback) */}
            {showManualConnect && (
              <div className="pt-4 border-t border-[#2a2a2a] space-y-3">
                <p className="text-xs text-gray-500">Conexão manual (sem conta vinculada):</p>
                
                {/* YouTube Manual */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={youtubeVideoId}
                    onChange={(e) => setYoutubeVideoId(e.target.value)}
                    placeholder="ID do vídeo YouTube"
                    className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                  {youtubeConnected && !youtubeAccounts.some(a => a.isConnected) ? (
                    <button
                      onClick={handleDisconnectYouTube}
                      className="px-3 py-2 bg-red-600/20 text-red-400 rounded text-sm hover:bg-red-600/30"
                    >
                      <Unlink size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectYouTube}
                      disabled={!youtubeVideoId.trim() || isConnecting === 'youtube'}
                      className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      {isConnecting === 'youtube' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    </button>
                  )}
                </div>

                {/* Twitch Manual */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={twitchChannel}
                    onChange={(e) => setTwitchChannel(e.target.value)}
                    placeholder="Nome do canal Twitch"
                    className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  {twitchConnected && !twitchAccounts.some(a => a.isConnected) ? (
                    <button
                      onClick={handleDisconnectTwitch}
                      className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded text-sm hover:bg-purple-600/30"
                    >
                      <Unlink size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectTwitch}
                      disabled={!twitchChannel.trim() || isConnecting === 'twitch'}
                      className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                    >
                      {isConnecting === 'twitch' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Info */}
            <p className="text-xs text-gray-600 text-center pt-2">
              Conecte suas contas para o chat funcionar automaticamente quando você estiver ao vivo
            </p>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#2a2a2a] bg-[#0f0f0f]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterPlatform('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterPlatform === 'all'
                  ? 'bg-[#d4a853] text-black'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterPlatform('youtube')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterPlatform === 'youtube'
                  ? 'bg-red-600 text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
            >
              <Youtube size={12} /> YouTube
            </button>
            <button
              onClick={() => setFilterPlatform('twitch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterPlatform === 'twitch'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
            >
              <TwitchIcon size={12} /> Twitch
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAutoShow}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                autoShow
                  ? 'bg-green-600 text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
              title={autoShow ? 'Desativar exibição automática' : 'Ativar exibição automática'}
            >
              {autoShow ? <Eye size={12} /> : <EyeOff size={12} />}
              Auto-exibir
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageCircle size={48} className="mb-4 opacity-30" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs mt-1">
                {youtubeConnected || twitchConnected
                  ? 'Aguardando mensagens do chat...'
                  : 'Conecte uma plataforma para receber mensagens'}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleSelectMessage(msg)}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  selectedMessage?.id === msg.id
                    ? 'bg-[#d4a853]/20 border border-[#d4a853]/50'
                    : 'bg-[#1a1a1a] hover:bg-[#252525] border border-transparent'
                }`}
              >
                {/* Avatar with platform indicator */}
                <div className="relative">
                  {msg.avatarUrl ? (
                    <img
                      src={msg.avatarUrl}
                      alt={msg.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    getPlatformIcon(msg.platform, 18)
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                    msg.platform === 'youtube' ? 'bg-red-600' :
                    msg.platform === 'twitch' ? 'bg-purple-600' :
                    msg.platform === 'facebook' ? 'bg-blue-600' : 'bg-[#d4a853]'
                  }`}>
                    {msg.platform === 'youtube' && <Youtube size={8} className="text-white" />}
                    {msg.platform === 'twitch' && <TwitchIcon size={8} className="text-white" />}
                    {msg.platform === 'facebook' && <Facebook size={8} className="text-white" />}
                  </div>
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="font-semibold text-sm truncate"
                      style={{ color: msg.color || '#d4a853' }}
                    >
                      {msg.displayName}
                    </span>
                    {msg.badges && msg.badges.length > 0 && (
                      <div className="flex items-center gap-1">
                        {msg.badges.slice(0, 3).map((badge, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-[#2a2a2a] rounded text-[10px] text-gray-400 uppercase"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-600 ml-auto">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200 break-words">
                    {msg.message}
                  </p>
                  {msg.isSuperChat && msg.superChatAmount && (
                    <div className="mt-2 px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-xs text-yellow-400">
                      💰 Super Chat: {msg.superChatAmount}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {selectedMessage?.id === msg.id && (
                    <Pin size={14} className="text-[#d4a853]" />
                  )}
                  {showModeration && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMessage(msg.id);
                      }}
                      className="p-1 hover:bg-red-600/20 rounded"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-[#2a2a2a] bg-[#0f0f0f]">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Enviar mensagem como Host..."
              className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d4a853] transition-colors"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="p-3 bg-[#d4a853] text-black rounded-xl hover:bg-[#c49843] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            Clique em uma mensagem para exibi-la na tela
          </p>
        </div>
      </div>
    </div>
  );
}
