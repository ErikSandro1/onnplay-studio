import React, { useState, useEffect, useRef } from 'react';
import { Video, FileText, LayoutGrid, Settings, X, Plus, MessageSquare, Youtube, Eye, RefreshCw, Link2, Unlink, Facebook, Instagram, Twitch, Music, Image, Film, Type, ArrowRight, Play, Monitor, Palette } from 'lucide-react';
import { commentOverlayService } from '../services/CommentOverlayService';
import { mediaSourceService } from '../services/MediaSourceService';
import { BannerPanel } from './BannerPanel';
import { ScenePanelSidebar } from './ScenePanelSidebar';
import { BackgroundPanel } from './BackgroundPanel';

interface SidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

type PanelType = 'sources' | 'chat' | 'scenes' | 'layouts' | 'settings' | 'banners' | 'backgrounds' | null;

interface VideoSource {
  id: string;
  name: string;
  type: 'camera' | 'screen' | 'media' | 'image' | 'video';
  stream?: MediaStream;
  active: boolean;
}

interface YouTubeComment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  textDisplay: string;
  publishedAt: string;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [isAddingSource, setIsAddingSource] = useState(false);
  
  // Chat state
  const [activeChatPlatform, setActiveChatPlatform] = useState<'youtube' | 'facebook' | 'instagram' | 'twitch' | 'tiktok'>('youtube');
  const [videoId, setVideoId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState<YouTubeComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Auto-connect to chat when broadcast goes LIVE (not just created)
  useEffect(() => {
    const handleBroadcastLive = (event: CustomEvent) => {
      const { broadcastId, liveChatId, platform } = event.detail;
      console.log('[Chat] Broadcast is LIVE, connecting to chat...', { broadcastId, liveChatId, platform });
      
      if (platform === 'youtube' && broadcastId) {
        setVideoId(broadcastId);
        setActiveChatPlatform('youtube');
        setIsLoading(true);
        setError(null);
        
        // Start polling for comments
        const fetchAndPoll = async () => {
          try {
            const response = await fetch(`/api/youtube/comments/${broadcastId}`);
            if (response.ok) {
              const data = await response.json();
              if (data.comments && Array.isArray(data.comments)) {
                setComments(prev => {
                  const existingIds = new Set(prev.map(c => c.id));
                  const newComments = data.comments.filter((c: YouTubeComment) => !existingIds.has(c.id));
                  return [...prev, ...newComments].slice(-50);
                });
              }
              setIsConnected(true);
              // Start polling
              if (!pollingRef.current) {
                pollingRef.current = setInterval(async () => {
                  try {
                    const res = await fetch(`/api/youtube/comments/${broadcastId}`);
                    if (res.ok) {
                      const d = await res.json();
                      if (d.comments && Array.isArray(d.comments)) {
                        setComments(prev => {
                          const existingIds = new Set(prev.map(c => c.id));
                          const newComments = d.comments.filter((c: YouTubeComment) => !existingIds.has(c.id));
                          return [...prev, ...newComments].slice(-50);
                        });
                      }
                    }
                  } catch (e) {
                    console.error('[Chat] Polling error:', e);
                  }
                }, 5000);
              }
            } else {
              console.log('[Chat] Chat not available yet, will retry...');
              // Retry after a few seconds (chat may not be ready immediately)
              setTimeout(fetchAndPoll, 3000);
            }
          } catch (e) {
            console.error('[Chat] Auto-connect error:', e);
          } finally {
            setIsLoading(false);
          }
        };
        fetchAndPoll();
      }
    };

    window.addEventListener('broadcast:live', handleBroadcastLive as EventListener);
    return () => {
      window.removeEventListener('broadcast:live', handleBroadcastLive as EventListener);
    };
  }, []);

  const fetchComments = async () => {
    if (!videoId.trim()) return;
    try {
      const response = await fetch(`/api/youtube/comments/${videoId}`);
      if (!response.ok) throw new Error('Falha ao buscar comentários');
      const data = await response.json();
      if (data.comments && Array.isArray(data.comments)) {
        setComments(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newComments = data.comments.filter((c: YouTubeComment) => !existingIds.has(c.id));
          return [...prev, ...newComments].slice(-50);
        });
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleConnect = async () => {
    if (!videoId.trim()) {
      setError('Insira o Video ID do YouTube');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await fetchComments();
      setIsConnected(true);
      pollingRef.current = setInterval(fetchComments, 5000);
    } catch (err) {
      setError('Erro ao conectar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsConnected(false);
    setComments([]);
  };

  const handleShowComment = (comment: YouTubeComment) => {
    commentOverlayService.showComment({
      id: comment.id,
      author: comment.authorDisplayName,
      message: comment.textDisplay,
      avatar: comment.authorProfileImageUrl,
      platform: 'youtube',
      timestamp: new Date(comment.publishedAt),
    });
  };

  const togglePanel = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const addCameraSource = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });

      const newSource: VideoSource = {
        id: `camera-${Date.now()}`,
        name: `Câmera ${sources.filter(s => s.type === 'camera').length + 1}`,
        type: 'camera',
        stream,
        active: true,
      };

      setSources(prev => [...prev, newSource]);
      setIsAddingSource(false);
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const addScreenSource = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080 },
        audio: true,
      });

      const newSource: VideoSource = {
        id: `screen-${Date.now()}`,
        name: `Tela ${sources.filter(s => s.type === 'screen').length + 1}`,
        type: 'screen',
        stream,
        active: true,
      };

      setSources(prev => [...prev, newSource]);
      setIsAddingSource(false);

      stream.getVideoTracks()[0].onended = () => {
        setSources(prev => prev.filter(s => s.id !== newSource.id));
      };
    } catch (error) {
      console.error('Erro ao compartilhar tela:', error);
    }
  };

  // Referência para input de arquivo
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const addImageSource = () => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Usar o MediaSourceService para gerenciar a imagem
      const mediaSource = await mediaSourceService.addImage(file);
      
      // Adicionar à lista local de fontes
      const newSource: VideoSource = {
        id: mediaSource.id,
        name: mediaSource.name,
        type: 'image',
        stream: mediaSource.stream,
        active: true,
      };

      setSources(prev => [...prev, newSource]);
      setIsAddingSource(false);
      
      // Emitir evento para notificar outros componentes
      window.dispatchEvent(new CustomEvent('media:added', { 
        detail: { id: mediaSource.id, type: 'image', name: mediaSource.name } 
      }));
      
      console.log('[Sidebar] Image added via MediaSourceService:', mediaSource.name);
    } catch (error) {
      console.error('[Sidebar] Error adding image:', error);
      alert('Erro ao carregar imagem. Tente novamente.');
    }
    
    // Limpar input
    event.target.value = '';
  };

  const addVideoSource = () => {
    videoInputRef.current?.click();
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Usar o MediaSourceService para gerenciar o vídeo
      const mediaSource = await mediaSourceService.addVideo(file);
      
      // Adicionar à lista local de fontes
      const newSource: VideoSource = {
        id: mediaSource.id,
        name: mediaSource.name,
        type: 'video',
        stream: mediaSource.stream,
        active: true,
      };

      setSources(prev => [...prev, newSource]);
      setIsAddingSource(false);
      
      // Emitir evento para notificar outros componentes
      window.dispatchEvent(new CustomEvent('media:added', { 
        detail: { id: mediaSource.id, type: 'video', name: mediaSource.name } 
      }));
      
      console.log('[Sidebar] Video added via MediaSourceService:', mediaSource.name);
    } catch (error) {
      console.error('[Sidebar] Error adding video:', error);
      alert('Erro ao carregar vídeo. Tente novamente.');
    }
    
    // Limpar input
    event.target.value = '';
  };

  const removeSource = (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    
    // Se for uma fonte de mídia gerenciada pelo MediaSourceService, remover de lá
    if (source?.type === 'image' || source?.type === 'video') {
      mediaSourceService.removeSource(sourceId);
    } else if (source?.stream) {
      // Para câmera/tela, apenas parar as tracks
      source.stream.getTracks().forEach(track => track.stop());
    }
    
    setSources(prev => prev.filter(s => s.id !== sourceId));
    
    // Emitir evento para notificar outros componentes
    window.dispatchEvent(new CustomEvent('media:removed', { 
      detail: { id: sourceId } 
    }));
  };

  const sidebarItems = [
    { id: 'sources' as PanelType, icon: Video, label: 'Fontes' },
    { id: 'chat' as PanelType, icon: MessageSquare, label: 'Chat' },
    { id: 'banners' as PanelType, icon: Type, label: 'Banners' },
    { id: 'backgrounds' as PanelType, icon: Palette, label: 'Fundos' },
    { id: 'scenes' as PanelType, icon: FileText, label: 'Scenes' },
    { id: 'layouts' as PanelType, icon: LayoutGrid, label: 'Layouts' },
  ];

  return (
    <div className="flex h-full">
      {/* Icon Sidebar - Narrow strip with icons only */}
      <div
        className="flex flex-col h-full py-2"
        style={{
          width: '48px',
          background: '#0A0E1A',
          borderRight: '1px solid #1E2842',
        }}
      >
        {/* Menu Items */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;

            return (
              <button
                key={item.id}
                onClick={() => togglePanel(item.id)}
                className="relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200"
                style={{
                  background: isActive ? '#1E2842' : 'transparent',
                  color: isActive ? '#00D9FF' : '#7A8BA3',
                }}
                title={item.label}
              >
                <Icon size={20} />
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                    style={{ background: '#00D9FF' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Settings at bottom */}
        <div className="flex flex-col items-center pb-2">
          <button
            onClick={() => togglePanel('settings')}
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
            style={{ 
              color: activePanel === 'settings' ? '#00D9FF' : '#7A8BA3',
              background: activePanel === 'settings' ? '#1E2842' : 'transparent',
            }}
            title="Configurações"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Expandable Panel - FONTES */}
      {activePanel === 'sources' && (
        <div
          className="h-full flex flex-col"
          style={{
            width: '280px',
            background: '#0F1419',
            borderRight: '1px solid #1E2842',
          }}
        >
          {/* Panel Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #1E2842' }}
          >
            <span className="text-sm font-semibold text-white">FONTES</span>
            <button
              onClick={() => setActivePanel(null)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#1E2842] transition-colors"
              style={{ color: '#7A8BA3' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Panel Content - FONTES DE VÍDEO */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* FONTES DE VÍDEO Section */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    FONTES DE VÍDEO
                  </span>
                  <button
                    onClick={() => setIsAddingSource(!isAddingSource)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: '#FF6B00',
                    }}
                  >
                    <Plus size={16} className="text-white" />
                  </button>
                </div>

                {/* Add Source Menu */}
                {isAddingSource && (
                  <div 
                    className="mb-3 p-3 rounded-lg"
                    style={{ background: '#1E2842', border: '1px solid #2D3A5C' }}
                  >
                    <p className="text-xs text-gray-400 mb-2">Adicionar fonte:</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={addCameraSource}
                        className="flex items-center gap-2 px-3 py-2 rounded text-sm text-white hover:bg-[#2D3A5C] transition-colors"
                      >
                        <Video size={16} />
                        Câmera / Webcam
                      </button>
                      <button
                        onClick={addScreenSource}
                        className="flex items-center gap-2 px-3 py-2 rounded text-sm text-white hover:bg-[#2D3A5C] transition-colors"
                      >
                        <Video size={16} />
                        Compartilhar Tela
                      </button>
                      <button
                        onClick={addImageSource}
                        className="flex items-center gap-2 px-3 py-2 rounded text-sm text-white hover:bg-[#2D3A5C] transition-colors"
                      >
                        <Image size={16} />
                        📷 Carregar Imagem
                      </button>
                      <button
                        onClick={addVideoSource}
                        className="flex items-center gap-2 px-3 py-2 rounded text-sm text-white hover:bg-[#2D3A5C] transition-colors"
                      >
                        <Film size={16} />
                        🎬 Carregar Vídeo
                      </button>
                    </div>
                    {/* Hidden file inputs */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Sources List */}
                {sources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <Video size={32} className="text-gray-600 mb-2" />
                    <p className="text-gray-500 text-xs">Nenhuma fonte adicionada</p>
                    <p className="text-gray-600 text-xs mt-1">Clique em + para adicionar</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sources.map((source) => (
                      <SourceItem
                        key={source.id}
                        source={source}
                        onRemove={() => removeSource(source.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer hint */}
          <div 
            className="px-4 py-2 text-center"
            style={{ borderTop: '1px solid #1E2842' }}
          >
            <p className="text-xs text-gray-500">
              Clique duplo para enviar ao PROGRAM
            </p>
          </div>
        </div>
      )}

      {/* Expandable Panel - CHAT */}
      {activePanel === 'chat' && (
        <div
          className="h-full flex flex-col"
          style={{
            width: '280px',
            background: '#0F1419',
            borderRight: '1px solid #1E2842',
          }}
        >
          {/* Panel Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #1E2842' }}
          >
            <span className="text-sm font-semibold text-white">CHAT</span>
            <button
              onClick={() => setActivePanel(null)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#1E2842] transition-colors"
              style={{ color: '#7A8BA3' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Chat Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* CHAT UNIFICADO Header */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #1E2842' }}>
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                CHAT UNIFICADO
              </span>
            </div>

            {/* Platform Tabs */}
            <div className="flex px-2 py-2 gap-1" style={{ borderBottom: '1px solid #1E2842' }}>
              <button
                onClick={() => setActiveChatPlatform('youtube')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${activeChatPlatform === 'youtube' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-[#1E2842]'}`}
              >
                <Youtube size={14} />
                YouTube
              </button>
              <button
                onClick={() => setActiveChatPlatform('facebook')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${activeChatPlatform === 'facebook' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-[#1E2842]'}`}
              >
                <Facebook size={14} />
                Facebook
              </button>
              <button
                onClick={() => setActiveChatPlatform('instagram')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${activeChatPlatform === 'instagram' ? 'bg-pink-500/20 text-pink-400' : 'text-gray-400 hover:bg-[#1E2842]'}`}
              >
                <Instagram size={14} />
                Insta
              </button>
            </div>
            <div className="flex px-2 py-2 gap-1" style={{ borderBottom: '1px solid #1E2842' }}>
              <button
                onClick={() => setActiveChatPlatform('twitch')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${activeChatPlatform === 'twitch' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:bg-[#1E2842]'}`}
              >
                <Twitch size={14} />
                Twitch
              </button>
              <button
                onClick={() => setActiveChatPlatform('tiktok')}
                className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${activeChatPlatform === 'tiktok' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-[#1E2842]'}`}
              >
                <Music size={14} />
                TikTok
              </button>
            </div>

            {/* Platform Status */}
            <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #1E2842' }}>
              <div className="flex items-center gap-2">
                {activeChatPlatform === 'youtube' && <Youtube size={16} className="text-red-500" />}
                {activeChatPlatform === 'facebook' && <Facebook size={16} className="text-blue-500" />}
                {activeChatPlatform === 'instagram' && <Instagram size={16} className="text-pink-500" />}
                {activeChatPlatform === 'twitch' && <Twitch size={16} className="text-purple-500" />}
                {activeChatPlatform === 'tiktok' && <Music size={16} className="text-cyan-500" />}
                <span className="text-sm font-medium text-white capitalize">{activeChatPlatform}</span>
              </div>
              <span 
                className="text-xs px-2 py-0.5 rounded"
                style={{ 
                  background: isConnected && activeChatPlatform === 'youtube' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 107, 0, 0.2)',
                  color: isConnected && activeChatPlatform === 'youtube' ? '#00FF88' : '#FF6B00'
                }}
              >
                {isConnected && activeChatPlatform === 'youtube' ? 'Conectado' : 'Aguardando Live'}
              </span>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-2">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <MessageSquare size={32} className="text-gray-600 mb-2" />
                  <p className="text-gray-500 text-sm">
                    {activeChatPlatform === 'youtube' && 'Inicie uma live para ver o chat'}
                    {activeChatPlatform === 'facebook' && 'Conecte o Facebook para ver o chat'}
                    {activeChatPlatform === 'instagram' && 'Conecte o Instagram para ver o chat'}
                    {activeChatPlatform === 'twitch' && 'Conecte a Twitch para ver o chat'}
                    {activeChatPlatform === 'tiktok' && 'Conecte o TikTok para ver o chat'}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">
                    O chat aparece automaticamente quando a live começar
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-2 rounded-lg group hover:bg-[#1E2842] transition-colors"
                      style={{ background: '#0A0E14' }}
                    >
                      <div className="flex items-start gap-2">
                        <img
                          src={comment.authorProfileImageUrl}
                          alt=""
                          className="w-6 h-6 rounded-full flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-cyan-400 truncate">
                            {comment.authorDisplayName}
                          </p>
                          <p className="text-xs text-gray-300 break-words">
                            {comment.textDisplay}
                          </p>
                        </div>
                        <button
                          onClick={() => handleShowComment(comment)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#2D3A5C] transition-all"
                          title="Mostrar na transmissão"
                        >
                          <Eye size={14} className="text-green-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Footer */}
            <div className="px-3 py-2 space-y-2" style={{ borderTop: '1px solid #1E2842' }}>
              <button
                onClick={() => {
                  // Teste com comentário mock
                  const mockComment = {
                    id: `test-${Date.now()}`,
                    authorDisplayName: 'Teste User',
                    authorProfileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestUser',
                    textDisplay: 'Este é um comentário de teste! 🎉',
                    publishedAt: new Date().toISOString()
                  };
                  handleShowComment(mockComment);
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                🧪 Testar Overlay
              </button>
              <p className="text-xs text-gray-500 text-center">
                Clique em 👁 para mostrar na live
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Panel - BANNERS */}
      {activePanel === 'banners' && (
        <BannerPanel 
          isOpen={true} 
          onClose={() => setActivePanel(null)} 
        />
      )}

      {/* Expandable Panel - BACKGROUNDS */}
      {activePanel === 'backgrounds' && (
        <BackgroundPanel 
          isOpen={true} 
          onClose={() => setActivePanel(null)} 
        />
      )}

      {/* Expandable Panel - SCENES */}
      {activePanel === 'scenes' && (
        <ScenePanelSidebar 
          isOpen={true} 
          onClose={() => setActivePanel(null)} 
        />
      )}
    </div>
  );
}

// Source Item Component
interface SourceItemProps {
  source: VideoSource;
  onRemove: () => void;
}

const SourceItem: React.FC<SourceItemProps> = ({ source, onRemove }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = React.useState(false);
  const [isInPreview, setIsInPreview] = React.useState(false);

  React.useEffect(() => {
    if (videoRef.current && source.stream) {
      videoRef.current.srcObject = source.stream;
    }
  }, [source.stream]);

  // Enviar para PROGRAM (botão de seta ou duplo clique)
  const sendToProgram = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (source.type === 'image' || source.type === 'video') {
      // Ativar esta fonte no MediaSourceService
      mediaSourceService.setActiveSource(source.id);
      setIsActive(true);
      setIsInPreview(false);
      
      // Emitir evento para que o RTMPStreamService capture esta fonte
      window.dispatchEvent(new CustomEvent('media:activate', { 
        detail: { 
          id: source.id, 
          type: source.type, 
          name: source.name,
          stream: source.stream 
        } 
      }));
      
      console.log('[SourceItem] Source sent to PROGRAM:', source.name);
    }
  };

  // Enviar para PREVIEW (clique simples)
  const sendToPreview = () => {
    if (source.type === 'image' || source.type === 'video') {
      setIsInPreview(true);
      
      // Definir no MediaSourceService como fonte de preview
      mediaSourceService.setPreviewSource(source.id);
      
      // Emitir evento para preview (para atualizar UI)
      window.dispatchEvent(new CustomEvent('media:preview', { 
        detail: { 
          id: source.id, 
          type: source.type, 
          name: source.name,
          stream: source.stream 
        } 
      }));
      
      console.log('[SourceItem] Source sent to PREVIEW:', source.name);
    }
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden transition-all group"
      style={{ 
        border: isActive ? '3px solid #FF6B00' : isInPreview ? '3px solid #00D9FF' : '2px solid #1E2842',
        boxShadow: isActive ? '0 0 10px rgba(255, 107, 0, 0.5)' : isInPreview ? '0 0 10px rgba(0, 217, 255, 0.5)' : 'none'
      }}
    >
      {/* Preview da fonte */}
      <div 
        className="aspect-video bg-black relative cursor-pointer hover:opacity-90"
        onClick={sendToPreview}
        title="Clique para enviar ao PREVIEW"
      >
        {source.stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video size={24} className="text-gray-600" />
          </div>
        )}

        {/* Indicador de tipo */}
        <div
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
          style={{
            background: source.type === 'image' ? '#00D9FF' : source.type === 'video' ? '#FF6B00' : '#00FF88',
            color: '#000',
          }}
        >
          {source.type === 'image' ? 'IMG' : source.type === 'video' ? 'VID' : source.type.toUpperCase()}
        </div>

        {/* Indicador de status */}
        {isActive && (
          <div
            className="absolute bottom-2 left-2 px-2 py-1 rounded text-[10px] font-bold animate-pulse flex items-center gap-1"
            style={{ background: '#FF6B00', color: '#FFF' }}
          >
            <Monitor size={10} /> PROGRAM
          </div>
        )}
        {isInPreview && !isActive && (
          <div
            className="absolute bottom-2 left-2 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"
            style={{ background: '#00D9FF', color: '#000' }}
          >
            <Eye size={10} /> PREVIEW
          </div>
        )}

        {/* Botão de remover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remover fonte"
        >
          <X size={12} className="text-white" />
        </button>
      </div>

      {/* Barra inferior com nome e botões de ação */}
      <div
        className="px-2 py-2 flex items-center justify-between gap-2"
        style={{ background: '#1E2842' }}
      >
        <span className="text-xs font-medium truncate flex-1" style={{ color: '#FFFFFF' }}>
          {source.name}
        </span>
        
        {/* Botões de ação */}
        <div className="flex items-center gap-1">
          {/* Botão PREVIEW */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              sendToPreview();
            }}
            className="w-7 h-7 rounded flex items-center justify-center transition-all hover:scale-110"
            style={{ 
              background: isInPreview ? '#00D9FF' : '#374151',
              color: isInPreview ? '#000' : '#FFF'
            }}
            title="Enviar para PREVIEW"
          >
            <Eye size={14} />
          </button>
          
          {/* Botão PROGRAM (seta) */}
          <button
            onClick={sendToProgram}
            className="w-7 h-7 rounded flex items-center justify-center transition-all hover:scale-110"
            style={{ 
              background: isActive ? '#FF6B00' : '#374151',
              color: '#FFF'
            }}
            title="Enviar para PROGRAM (Live)"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
// Force rebuild 1767310403
