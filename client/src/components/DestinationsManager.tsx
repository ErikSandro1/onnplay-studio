/**
 * DestinationsManager - Gerenciador de Destinos Profissional
 * 
 * Interface estilo estúdio de TV com:
 * - Criação de live com agendamento
 * - Pop-up de confirmação
 * - Contagem regressiva
 * - Luz piscando GO LIVE
 * - Indicador NO AR
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Youtube, Twitch, Facebook, Instagram, Settings, Loader2, Check, AlertCircle, ExternalLink, Clock, Calendar, X, Radio, Tv, Camera, Mic, Image, Layout } from 'lucide-react';
import { rtmpStreamService } from '../services/RTMPStreamService';

interface ConnectedAccount {
  id: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'custom';
  channelId?: string;
  channelTitle: string;
  channelThumbnail?: string;
  connectedAt: number;
  isOAuth: boolean;
}

interface ActiveBroadcast {
  id: string;
  accountId: string;
  platform: string;
  title: string;
  watchUrl?: string;
  streamKey?: string;
  rtmpUrl?: string;
  liveChatId?: string;
  status: 'scheduled' | 'ready' | 'live' | 'ended';
  scheduledStartTime?: Date;
}

interface DestinationsManagerProps {
  onBroadcastReady?: (broadcasts: ActiveBroadcast[]) => void;
  onStartStreaming?: () => void;
  isStreaming?: boolean;
  onClose?: () => void;
}

const PLATFORM_CONFIG = {
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    bgColor: 'bg-red-600',
    hasOAuth: true,
  },
  twitch: {
    name: 'Twitch',
    icon: Twitch,
    color: '#9146FF',
    bgColor: 'bg-purple-600',
    hasOAuth: true,
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    bgColor: 'bg-blue-600',
    hasOAuth: true,
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    bgColor: 'bg-pink-600',
    hasOAuth: false,
  },
  tiktok: {
    name: 'TikTok',
    icon: () => <span className="text-lg">🎵</span>,
    color: '#000000',
    bgColor: 'bg-black',
    hasOAuth: false,
  },
  linkedin: {
    name: 'LinkedIn',
    icon: () => <span className="text-lg">💼</span>,
    color: '#0A66C2',
    bgColor: 'bg-blue-700',
    hasOAuth: false,
  },
  custom: {
    name: 'RTMP Custom',
    icon: Settings,
    color: '#6B7280',
    bgColor: 'bg-gray-600',
    hasOAuth: false,
  },
};

// Componente de luz indicadora estilo estúdio de TV
const StudioLight = ({ status, size = 'md' }: { status: 'off' | 'standby' | 'ready' | 'live'; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const getColorClass = () => {
    switch (status) {
      case 'off':
        return 'bg-gray-600';
      case 'standby':
        return 'bg-yellow-500 animate-pulse';
      case 'ready':
        return 'bg-yellow-500 animate-[pulse_0.5s_ease-in-out_infinite]';
      case 'live':
        return 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)]';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full ${getColorClass()} transition-all duration-300`} />
  );
};

// Componente de contagem regressiva
const CountdownTimer = ({ targetTime, onTimeReached }: { targetTime: Date; onTimeReached?: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        if (onTimeReached) onTimeReached();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
      setIsUrgent(diff < 60000); // Menos de 1 minuto
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetTime, onTimeReached]);

  if (!timeLeft) {
    return (
      <div className="flex items-center gap-2 text-red-500 animate-pulse">
        <Clock size={16} />
        <span className="font-bold">É HORA DE IR AO AR!</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${isUrgent ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
      <Clock size={16} />
      <span className="font-mono font-bold">
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
      <span className="text-xs text-gray-400">para ir ao ar</span>
    </div>
  );
};

// Pop-up de Live Criada
const LiveCreatedModal = ({ 
  broadcast, 
  account, 
  onClose, 
  onStartNow 
}: { 
  broadcast: ActiveBroadcast; 
  account: ConnectedAccount;
  onClose: () => void;
  onStartNow: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full border border-gray-700 overflow-hidden relative">
        {/* Botão X de fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
        
        {/* Header com animação de sucesso */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Check size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-white">Live Criada!</h2>
          <p className="text-green-100 mt-1">Sua transmissão está pronta para ir ao ar</p>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {/* Info da Live */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Youtube size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white font-medium">{broadcast.title}</p>
                <p className="text-gray-400 text-sm">{account.channelTitle}</p>
              </div>
            </div>

            {broadcast.scheduledStartTime && (
              <div className="flex items-center gap-2 text-yellow-400 bg-yellow-900/30 rounded-lg p-3">
                <Calendar size={16} />
                <span className="text-sm">
                  Agendada para: {broadcast.scheduledStartTime.toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </div>

          {/* Prepare sua Live */}
          <div className="bg-gradient-to-r from-orange-900/40 to-orange-800/40 border border-orange-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tv size={18} className="text-orange-400" />
              <p className="text-orange-400 font-medium">Prepare sua Live no OnnPlay Studio</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <Camera size={14} className="text-gray-400" />
                <span>Configure sua câmera e enquadramento</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Mic size={14} className="text-gray-400" />
                <span>Ajuste o áudio e microfone</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Image size={14} className="text-gray-400" />
                <span>Adicione logo, banners e overlays</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Layout size={14} className="text-gray-400" />
                <span>Escolha o layout da transmissão</span>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Preparar Live
            </button>
            <button
              onClick={onStartNow}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Radio size={18} />
              Ir ao Ar Agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Indicador NO AR / LIVE
const OnAirIndicator = ({ isLive, duration }: { isLive: boolean; duration?: number }) => {
  const [elapsed, setElapsed] = useState(duration || 0);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isLive) return null;

  return (
    <div className="flex items-center gap-3 bg-red-900/50 border border-red-600 rounded-lg px-4 py-2">
      <div className="flex items-center gap-2">
        <StudioLight status="live" size="lg" />
        <span className="text-red-500 font-bold text-lg tracking-wider">NO AR</span>
      </div>
      <div className="h-6 w-px bg-red-600/50" />
      <div className="flex items-center gap-2 text-white">
        <Clock size={16} />
        <span className="font-mono">{formatDuration(elapsed)}</span>
      </div>
    </div>
  );
};

export default function DestinationsManager({ onBroadcastReady, onStartStreaming, isStreaming, onClose }: DestinationsManagerProps) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [broadcasts, setBroadcasts] = useState<ActiveBroadcast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [creatingBroadcast, setCreatingBroadcast] = useState<string | null>(null);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [lastCreatedBroadcast, setLastCreatedBroadcast] = useState<ActiveBroadcast | null>(null);
  const [lastCreatedAccount, setLastCreatedAccount] = useState<ConnectedAccount | null>(null);
  const [isTimeToGoLive, setIsTimeToGoLive] = useState(false);
  
  // Broadcast settings
  const [broadcastTitle, setBroadcastTitle] = useState('Minha Live');
  const [broadcastDescription, setBroadcastDescription] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState<'public' | 'private' | 'unlisted'>('public');
  const [scheduledTime, setScheduledTime] = useState('');
  const [useSchedule, setUseSchedule] = useState(false);

  // Determinar status geral
  const getOverallStatus = (): 'off' | 'standby' | 'ready' | 'live' => {
    if (isStreaming) return 'live';
    if (broadcasts.some(b => b.status === 'ready')) return 'ready';
    if (broadcasts.some(b => b.status === 'scheduled')) return 'standby';
    return 'off';
  };

  // Load connected accounts on mount
  useEffect(() => {
    loadAccounts();
    
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const youtubeConnected = urlParams.get('youtube_connected');
    const youtubeError = urlParams.get('youtube_error');
    
    if (youtubeConnected === 'true') {
      loadAccounts();
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (youtubeError) {
      setError(`Erro ao conectar YouTube: ${youtubeError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/youtube/oauth/accounts?userId=default-user');
      if (response.ok) {
        const data = await response.json();
        const ytAccounts: ConnectedAccount[] = data.accounts.map((a: any) => ({
          id: a.id,
          platform: 'youtube' as const,
          channelId: a.channelId,
          channelTitle: a.channelTitle,
          channelThumbnail: a.channelThumbnail,
          connectedAt: a.connectedAt,
          isOAuth: true,
        }));
        setAccounts(ytAccounts);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const connectYouTube = () => {
    window.location.href = '/api/youtube/oauth/connect?userId=default-user';
  };

  const connectTwitch = () => {
    alert('Twitch OAuth em breve!');
  };

  const connectFacebook = () => {
    alert('Facebook OAuth em breve!');
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/youtube/oauth/accounts/${accountId}?userId=default-user`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAccounts(prev => prev.filter(a => a.id !== accountId));
        setBroadcasts(prev => prev.filter(b => b.accountId !== accountId));
        rtmpStreamService.removeDestination(accountId);
      }
    } catch (err) {
      console.error('Failed to disconnect account:', err);
    }
  };

  const createBroadcast = async (account: ConnectedAccount) => {
    if (!broadcastTitle.trim()) {
      setError('Digite um título para a live');
      return;
    }

    // Verificar se já existe uma live ativa para esta conta
    const existingBroadcast = broadcasts.find(b => b.accountId === account.id);
    if (existingBroadcast) {
      // Se já existe, remover a anterior antes de criar nova
      console.log('[DestinationsManager] Removendo live anterior:', existingBroadcast.id);
      setBroadcasts(prev => prev.filter(b => b.accountId !== account.id));
      rtmpStreamService.removeDestination(account.id);
    }

    setCreatingBroadcast(account.id);
    setError(null);

    try {
      // Preparar dados do agendamento
      let scheduledStartTime: Date | undefined;
      if (useSchedule && scheduledTime) {
        scheduledStartTime = new Date(scheduledTime);
      }

      const response = await fetch('/api/youtube/oauth/create-live?userId=default-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          title: broadcastTitle,
          description: broadcastDescription,
          privacyStatus,
          scheduledStartTime: scheduledStartTime?.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Falha ao criar live');
      }

      const data = await response.json();
      
      const newBroadcast: ActiveBroadcast = {
        id: data.broadcast.id,
        accountId: account.id,
        platform: 'youtube',
        title: data.broadcast.title,
        watchUrl: data.broadcast.watchUrl,
        streamKey: data.broadcast.streamKey,
        rtmpUrl: data.broadcast.rtmpUrl,
        liveChatId: data.broadcast.liveChatId,
        status: scheduledStartTime ? 'scheduled' : 'ready',
        scheduledStartTime,
      };
      
      // Emitir evento global para o chat se conectar automaticamente
      if (data.broadcast.liveChatId) {
        window.dispatchEvent(new CustomEvent('broadcast:created', {
          detail: {
            broadcastId: data.broadcast.id,
            liveChatId: data.broadcast.liveChatId,
            platform: 'youtube',
            accountId: account.id,
          }
        }));
      }

      setBroadcasts(prev => [...prev, newBroadcast]);
      
      // Registrar destino no RTMPStreamService
      if (newBroadcast.rtmpUrl && newBroadcast.streamKey) {
        rtmpStreamService.addDestination({
          id: account.id,
          platform: 'youtube',
          name: account.channelTitle,
          rtmpUrl: newBroadcast.rtmpUrl,
          streamKey: newBroadcast.streamKey,
          enabled: true,
        });
      }
      
      // Mostrar modal de sucesso
      setLastCreatedBroadcast(newBroadcast);
      setLastCreatedAccount(account);
      setShowCreatedModal(true);
      
      // Notify parent
      if (onBroadcastReady) {
        onBroadcastReady([...broadcasts, newBroadcast]);
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao criar live');
    } finally {
      setCreatingBroadcast(null);
    }
  };

  const removeBroadcast = (broadcastId: string) => {
    const broadcast = broadcasts.find(b => b.id === broadcastId);
    if (broadcast) {
      rtmpStreamService.removeDestination(broadcast.accountId);
    }
    setBroadcasts(prev => prev.filter(b => b.id !== broadcastId));
  };

  const getAccountBroadcast = (accountId: string) => {
    return broadcasts.find(b => b.accountId === accountId);
  };

  const handleConnect = (platform: string) => {
    setShowAddMenu(false);
    switch (platform) {
      case 'youtube':
        connectYouTube();
        break;
      case 'twitch':
        connectTwitch();
        break;
      case 'facebook':
        connectFacebook();
        break;
      default:
        alert(`${platform} - Em breve!`);
    }
  };

  const openYouTubeStudio = (broadcast: ActiveBroadcast) => {
    // Abrir YouTube Studio na página da live
    const studioUrl = `https://studio.youtube.com/video/${broadcast.id}/livestreaming`;
    window.open(studioUrl, '_blank');
    setShowCreatedModal(false);
  };

  const handleTimeReached = useCallback(() => {
    setIsTimeToGoLive(true);
    // Atualizar status dos broadcasts agendados para ready
    setBroadcasts(prev => prev.map(b => 
      b.status === 'scheduled' ? { ...b, status: 'ready' as const } : b
    ));
  }, []);

  const overallStatus = getOverallStatus();
  const hasScheduledBroadcast = broadcasts.some(b => b.scheduledStartTime);
  const nextScheduledTime = broadcasts.find(b => b.scheduledStartTime)?.scheduledStartTime;

  return (
    <div className="space-y-4">
      {/* Header com indicador de status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Destinos de Transmissão</h3>
          <StudioLight status={overallStatus} size="md" />
        </div>
        
        {/* Indicador NO AR */}
        {isStreaming && <OnAirIndicator isLive={true} />}
        
        {/* Botões do lado direito */}
        <div className="flex items-center gap-2">
          {/* Botão Adicionar Conta */}
          <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Adicionar Conta
          </button>
          
          {/* Menu de plataformas */}
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50 overflow-hidden">
              <div className="p-2">
                <p className="text-xs text-gray-400 px-3 py-2 font-medium">COM OAUTH (AUTOMÁTICO)</p>
                
                <button
                  onClick={() => handleConnect('youtube')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <Youtube size={18} className="text-white" />
                  </div>
                  <span className="text-white text-sm">YouTube</span>
                </button>
                
                <button
                  onClick={() => handleConnect('twitch')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors opacity-50"
                >
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Twitch size={18} className="text-white" />
                  </div>
                  <span className="text-white text-sm">Twitch</span>
                  <span className="text-xs text-gray-500 ml-auto">Em breve</span>
                </button>
                
                <button
                  onClick={() => handleConnect('facebook')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors opacity-50"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Facebook size={18} className="text-white" />
                  </div>
                  <span className="text-white text-sm">Facebook</span>
                  <span className="text-xs text-gray-500 ml-auto">Em breve</span>
                </button>
                
                <div className="border-t border-gray-700 my-2" />
                <p className="text-xs text-gray-400 px-3 py-2 font-medium">RTMP MANUAL</p>
                
                <button
                  onClick={() => handleConnect('tiktok')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center border border-gray-600">
                    <span className="text-lg">🎵</span>
                  </div>
                  <span className="text-white text-sm">TikTok</span>
                </button>
                
                <button
                  onClick={() => handleConnect('instagram')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-pink-600 rounded-lg flex items-center justify-center">
                    <Instagram size={18} className="text-white" />
                  </div>
                  <span className="text-white text-sm">Instagram</span>
                </button>
                
                <button
                  onClick={() => handleConnect('custom')}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                    <Settings size={18} className="text-white" />
                  </div>
                  <span className="text-white text-sm">RTMP Custom</span>
                </button>
              </div>
            </div>
          )}
          </div>
          
          {/* Botão X de fechar/voltar ao studio */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Voltar ao Studio"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Contagem regressiva se houver broadcast agendado */}
      {hasScheduledBroadcast && nextScheduledTime && !isStreaming && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
          <CountdownTimer 
            targetTime={nextScheduledTime} 
            onTimeReached={handleTimeReached}
          />
        </div>
      )}

      {/* Alerta GO LIVE */}
      {isTimeToGoLive && !isStreaming && broadcasts.length > 0 && (
        <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StudioLight status="ready" size="lg" />
              <div>
                <p className="text-red-400 font-bold text-lg">🔴 É HORA DE IR AO AR!</p>
                <p className="text-red-300 text-sm">Clique em "Iniciar Transmissão" para começar</p>
              </div>
            </div>
            <Radio size={32} className="text-red-500 animate-bounce" />
          </div>
        </div>
      )}

      {/* Broadcast Settings */}
      <div className="space-y-3 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Settings size={16} />
          Configurações da Live
        </h4>
        
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Título da Live *</label>
          <input
            type="text"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            placeholder="Minha Live Incrível"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Descrição (opcional)</label>
          <textarea
            value={broadcastDescription}
            onChange={(e) => setBroadcastDescription(e.target.value)}
            placeholder="Descrição da transmissão..."
            rows={2}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Visibilidade</label>
            <select
              value={privacyStatus}
              onChange={(e) => setPrivacyStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
            >
              <option value="public">🌐 Público</option>
              <option value="unlisted">🔗 Não listado</option>
              <option value="private">🔒 Privado</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs text-gray-400 mb-1 block flex items-center gap-2">
              <input
                type="checkbox"
                checked={useSchedule}
                onChange={(e) => setUseSchedule(e.target.checked)}
                className="rounded"
              />
              Agendar horário
            </label>
            {useSchedule && (
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <AlertCircle size={16} className="text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={14} className="text-red-400" />
          </button>
        </div>
      )}

      {/* Connected Accounts */}
      <div className="space-y-2">
        {accounts.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700 border-dashed">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Youtube size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400 text-sm">Nenhuma conta conectada</p>
            <p className="text-gray-500 text-xs mt-1">Clique em "Adicionar Conta" para começar</p>
          </div>
        ) : (
          accounts.map(account => {
            const config = PLATFORM_CONFIG[account.platform];
            const Icon = config.icon;
            const broadcast = getAccountBroadcast(account.id);
            
            return (
              <div
                key={account.id}
                className={`flex items-center gap-3 p-3 bg-gray-800 rounded-lg border ${
                  broadcast?.status === 'live' ? 'border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 
                  broadcast?.status === 'ready' ? 'border-green-600' : 
                  broadcast?.status === 'scheduled' ? 'border-yellow-600' : 
                  'border-gray-700'
                } transition-all duration-300`}
              >
                {/* Platform Icon */}
                <div className={`w-10 h-10 ${config.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className="text-white" />
                </div>
                
                {/* Account Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm truncate">
                      {account.channelTitle}
                    </span>
                    {account.isOAuth && (
                      <span className="text-xs bg-green-600/30 text-green-400 px-2 py-0.5 rounded">
                        OAuth
                      </span>
                    )}
                    {broadcast?.status === 'live' && (
                      <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
                        🔴 NO AR
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{config.name}</span>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  {broadcast ? (
                    <div className="flex items-center gap-2">
                      {broadcast.status === 'scheduled' && (
                        <span className="flex items-center gap-1 text-xs text-yellow-400">
                          <Clock size={14} />
                          Agendada
                        </span>
                      )}
                      {broadcast.status === 'ready' && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <Check size={14} />
                          Pronta
                        </span>
                      )}
                      {broadcast.status === 'live' && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <Radio size={14} className="animate-pulse" />
                          Ao Vivo
                        </span>
                      )}
                      
                      {/* Botão Abrir no YouTube Studio */}
                      <button
                        onClick={() => openYouTubeStudio(broadcast)}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="Abrir no YouTube Studio"
                      >
                        <ExternalLink size={14} className="text-gray-400" />
                      </button>
                      
                      <button
                        onClick={() => removeBroadcast(broadcast.id)}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={14} className="text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => createBroadcast(account)}
                      disabled={creatingBroadcast === account.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
                    >
                      {creatingBroadcast === account.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Criando...
                        </>
                      ) : (
                        'Criar Live'
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => disconnectAccount(account.id)}
                    className="p-1.5 hover:bg-red-900/50 rounded transition-colors"
                    title="Desconectar conta"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Start Streaming Button */}
      {broadcasts.length > 0 && !isStreaming && (
        <button
          onClick={onStartStreaming}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-3 ${
            isTimeToGoLive 
              ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.5)]' 
              : 'bg-orange-600 hover:bg-orange-500 text-white'
          }`}
        >
          <StudioLight status={isTimeToGoLive ? 'ready' : 'standby'} size="md" />
          {isTimeToGoLive ? '🔴 GO LIVE!' : '▶️ Iniciar Transmissão'}
          <span className="text-sm font-normal opacity-75">
            ({broadcasts.length} destino{broadcasts.length > 1 ? 's' : ''})
          </span>
        </button>
      )}

      {/* Modal de Live Criada */}
      {showCreatedModal && lastCreatedBroadcast && lastCreatedAccount && (
        <LiveCreatedModal
          broadcast={lastCreatedBroadcast}
          account={lastCreatedAccount}
          onClose={() => setShowCreatedModal(false)}
          onStartNow={() => {
            setShowCreatedModal(false);
            if (onStartStreaming) onStartStreaming();
          }}
        />
      )}
    </div>
  );
}
