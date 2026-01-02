import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Settings, ArrowRight, Play } from 'lucide-react';
import VideoPreview from './VideoPreview';
import { CameraId } from '../services/CameraControlService';
import { CommentOverlay } from './CommentOverlay';
import { BannerOverlay } from './BannerOverlay';
import { OverlayFrame } from './OverlayFrame';
import { MonitorSettingsMenu, getMonitorSettings, applySettingsToVideo } from './MonitorSettingsMenu';
import { mediaSourceService, MediaSource } from '../services/MediaSourceService';
import { backgroundService, CustomBackground } from '../services/BackgroundService';
import { BackgroundPreset } from '../config/BackgroundPresets';

interface DualMonitorsProps {
  isLive: boolean;
  viewers?: number;
  duration?: string;
  previewCamera?: CameraId;
  programCamera?: CameraId;
  lastTransition?: string;
  transitionTimestamp?: string;
  isTransitioning?: boolean;
}

const DualMonitors: React.FC<DualMonitorsProps> = ({
  isLive = false,
  viewers = 0,
  duration = '00:00:00',
  previewCamera = 'cam1',
  programCamera = 'cam2',
  lastTransition = 'none',
  transitionTimestamp = '',
  isTransitioning = false,
}) => {
  const previewLabel = previewCamera.toUpperCase().replace('CAM', 'CAM ');
  const programLabel = programCamera.toUpperCase().replace('CAM', 'CAM ');
  
  const [hasPreviewContent, setHasPreviewContent] = useState(false);
  const [isTransitioningLocal, setIsTransitioningLocal] = useState(false);
  
  // Estado para fontes de mídia no PREVIEW e PROGRAM
  const [previewMedia, setPreviewMedia] = useState<MediaSource | null>(null);
  const [programMedia, setProgramMedia] = useState<MediaSource | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const programVideoRef = useRef<HTMLVideoElement>(null);
  
  // Estado para backgrounds
  const [currentBackground, setCurrentBackground] = useState<BackgroundPreset | CustomBackground | null>(null);
  const [previewBackground, setPreviewBackground] = useState<BackgroundPreset | CustomBackground | null>(null);
  
  // Estado para stream de câmera/tela no PREVIEW e PROGRAM
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [programStream, setProgramStream] = useState<MediaStream | null>(null);
  const previewStreamRef = useRef<HTMLVideoElement>(null);
  const programStreamRef = useRef<HTMLVideoElement>(null);
  
  // Estado para modo de edição de posição do banner
  const [bannerEditMode, setBannerEditMode] = useState(false);
  const previewMonitorRef = useRef<HTMLDivElement>(null);
  
  // Estado para menus de configurações
  const [previewSettingsOpen, setPreviewSettingsOpen] = useState(false);
  const [programSettingsOpen, setProgramSettingsOpen] = useState(false);
  const previewSettingsRef = useRef<HTMLButtonElement>(null);
  const programSettingsRef = useRef<HTMLButtonElement>(null);

  // Escutar eventos de preview de mídia e mudanças no MediaSourceService
  useEffect(() => {
    const handleMediaPreview = (event: CustomEvent) => {
      console.log('[DualMonitors] Media preview event:', event.detail);
      const source = mediaSourceService.getPreviewSource();
      setPreviewMedia(source);
      setHasPreviewContent(!!source);
    };

    // Escutar mudanças na fonte de preview
    const unsubscribePreview = mediaSourceService.onPreviewChange((source) => {
      console.log('[DualMonitors] Preview source changed:', source?.name);
      setPreviewMedia(source);
      setHasPreviewContent(!!source);
      // Se uma nova mídia for enviada para PREVIEW, limpar o stream de câmera
      if (source) {
        setPreviewStream(null);
      }
    });

    // Escutar mudanças na fonte ativa (PROGRAM)
    const unsubscribeActive = mediaSourceService.onActiveChange((source) => {
      console.log('[DualMonitors] Program source changed:', source?.name);
      setProgramMedia(source);
      // Se uma nova mídia for enviada para PROGRAM, limpar o stream de câmera
      if (source) {
        setProgramStream(null);
      }
    });

    // Carregar estado inicial
    setPreviewMedia(mediaSourceService.getPreviewSource());
    setProgramMedia(mediaSourceService.getActiveSource());
    setHasPreviewContent(!!mediaSourceService.getPreviewSource());

    window.addEventListener('media:preview', handleMediaPreview as EventListener);
    return () => {
      window.removeEventListener('media:preview', handleMediaPreview as EventListener);
      unsubscribePreview();
      unsubscribeActive();
    };
  }, []);

  // Escutar mudanças de background
  useEffect(() => {
    // Carregar estado inicial
    setCurrentBackground(backgroundService.getCurrentBackground());
    setPreviewBackground(backgroundService.getPreviewBackground());

    // Escutar mudanças
    const unsubscribe = backgroundService.subscribe((bg) => {
      setCurrentBackground(backgroundService.getCurrentBackground());
      setPreviewBackground(backgroundService.getPreviewBackground());
    });

    return unsubscribe;
  }, []);

  // Escutar evento de edição de posição do banner
  useEffect(() => {
    const handleEditPosition = (event: CustomEvent) => {
      console.log('[DualMonitors] Banner edit position event:', event.detail);
      setBannerEditMode(true);
    };

    window.addEventListener('banner:edit-position', handleEditPosition as EventListener);
    return () => {
      window.removeEventListener('banner:edit-position', handleEditPosition as EventListener);
    };
  }, []);

  // Escutar evento camera:preview para câmera/tela
  useEffect(() => {
    const handleCameraPreview = (event: CustomEvent) => {
      const { id, type, name, stream } = event.detail;
      console.log('[DualMonitors] Camera preview event:', { id, type, name, stream });
      
      if (stream && (type === 'camera' || type === 'screen')) {
        setPreviewStream(stream);
        setPreviewMedia(null); // Limpar mídia de imagem/vídeo
        setHasPreviewContent(true);
        // Limpar a fonte de mídia no MediaSourceService também
        mediaSourceService.setPreviewSource(null);
      }
    };
    
    window.addEventListener('camera:preview', handleCameraPreview as EventListener);
    
    return () => {
      window.removeEventListener('camera:preview', handleCameraPreview as EventListener);
    };
  }, []);

  // Atualizar vídeo do stream de câmera/tela
  useEffect(() => {
    if (previewStream && previewStreamRef.current) {
      previewStreamRef.current.srcObject = previewStream;
      previewStreamRef.current.play().catch((e) => console.error('Error playing stream:', e));
    }
  }, [previewStream]);

  // Atualizar vídeos quando as fontes mudarem
  useEffect(() => {
    if (previewMedia?.type === 'video' && previewVideoRef.current) {
      const video = previewMedia.element as HTMLVideoElement;
      previewVideoRef.current.srcObject = previewMedia.stream;
      previewVideoRef.current.play().catch(() => {});
      setPreviewStream(null); // Limpar stream de câmera quando houver mídia
    }
  }, [previewMedia]);

  useEffect(() => {
    if (programMedia?.type === 'video' && programVideoRef.current) {
      const video = programMedia.element as HTMLVideoElement;
      programVideoRef.current.srcObject = programMedia.stream;
      programVideoRef.current.play().catch(() => {});
    }
  }, [programMedia]);

  // Atualizar vídeo do stream de câmera/tela no PROGRAM
  useEffect(() => {
    if (programStream && programStreamRef.current) {
      programStreamRef.current.srcObject = programStream;
      programStreamRef.current.play().catch((e) => console.error('Error playing program stream:', e));
    }
  }, [programStream]);

  // Escutar mudanças nas configurações de câmera e aplicar ao vídeo
  useEffect(() => {
    const handleSettingsChanged = (event: CustomEvent) => {
      const { target, settings } = event.detail;
      console.log('[DualMonitors] Settings changed:', target, settings);
      
      // Aplicar configurações ao vídeo correspondente
      const videoRef = target === 'preview' ? previewStreamRef.current : programStreamRef.current;
      
      if (videoRef) {
        const transforms: string[] = [];
        
        if (settings.flipH) transforms.push('scaleX(-1)');
        if (settings.flipV) transforms.push('scaleY(-1)');
        if (settings.rotation !== 0) transforms.push(`rotate(${settings.rotation}deg)`);
        if (settings.zoom !== 1) transforms.push(`scale(${settings.zoom})`);
        
        videoRef.style.transform = transforms.join(' ');
        videoRef.style.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%)`;
      }
    };
    
    window.addEventListener('monitor:settings-changed', handleSettingsChanged as EventListener);
    
    return () => {
      window.removeEventListener('monitor:settings-changed', handleSettingsChanged as EventListener);
    };
  }, []);

  // Função de transição GO (PREVIEW -> PROGRAM)
  const handleTransitionGo = () => {
    setIsTransitioningLocal(true);
    
    // Se tiver stream de câmera no PREVIEW, transferir para PROGRAM
    if (previewStream) {
      console.log('[DualMonitors] Transferring camera stream to PROGRAM');
      setProgramStream(previewStream);
      setProgramMedia(null); // Limpar mídia quando tiver câmera
      setPreviewStream(null); // Limpar do preview
    } else if (previewMedia) {
      // Se tiver mídia (imagem/vídeo) no PREVIEW, limpar o stream de câmera do PROGRAM
      console.log('[DualMonitors] Transferring media to PROGRAM, clearing camera stream');
      setProgramStream(null); // Limpar câmera quando tiver mídia
    }
    
    // Disparar evento de transição
    window.dispatchEvent(new CustomEvent('transition:go', {
      detail: { from: 'preview', to: 'program' }
    }));
    
    // Disparar evento para ativar a mídia no PROGRAM
    window.dispatchEvent(new CustomEvent('media:transition-to-program'));
    
    console.log('[DualMonitors] Transition GO: PREVIEW -> PROGRAM');
    
    // Reset após animação
    setTimeout(() => {
      setIsTransitioningLocal(false);
      setHasPreviewContent(false);
    }, 500);
  };

  return (
    <div className="flex gap-2 h-full items-stretch">
      {/* PREVIEW Monitor */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-3">
            <h2 
              className="text-xl font-bold tracking-wide"
              style={{ color: '#00D9FF' }}
            >
              PREVIEW
            </h2>
            <span 
              className="text-sm font-medium px-3 py-1 rounded"
              style={{ 
                background: 'rgba(0, 217, 255, 0.2)',
                color: '#00D9FF',
                border: '1px solid #00D9FF'
              }}
            >
              {previewLabel}
            </span>
          </div>
          
          <button
            ref={previewSettingsRef}
            onClick={() => setPreviewSettingsOpen(!previewSettingsOpen)}
            className={`p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842] ${previewSettingsOpen ? 'bg-[#1E2842]' : ''}`}
            style={{ color: previewSettingsOpen ? '#00D9FF' : '#7A8BA3' }}
            title="Configurações do PREVIEW"
          >
            <Settings size={18} />
          </button>
        </div>
        
        {/* Menu de configurações do PREVIEW */}
        <MonitorSettingsMenu
          target="preview"
          isOpen={previewSettingsOpen}
          onClose={() => setPreviewSettingsOpen(false)}
          anchorRef={previewSettingsRef}
        />
        
        {/* Monitor */}
        <div 
          className="flex-1 rounded-lg overflow-hidden relative"
          style={{
            ...backgroundService.getBackgroundCSS(previewBackground || currentBackground),
            border: '2px solid #00D9FF',
            boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)',
          }}
        >
          {/* Renderizar stream de câmera, mídia ou placeholder */}
          {previewStream ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <video
                ref={previewStreamRef}
                className="max-w-full max-h-full object-contain"
                autoPlay
                muted
                playsInline
                style={{ transform: 'scaleX(-1)' }}
              />
              {/* Label da câmera */}
              <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/70 text-white text-xs">
                🎥 Câmera Local
              </div>
            </div>
          ) : previewMedia ? (
            <div className="w-full h-full relative">
              {previewMedia.type === 'image' ? (
                <img 
                  src={previewMedia.url} 
                  alt={previewMedia.name}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <video
                  ref={previewVideoRef}
                  className="w-full h-full object-contain bg-black"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}
              {/* Nome da mídia */}
              <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/70 text-white text-xs">
                {previewMedia.name}
              </div>
            </div>
          ) : (
            <VideoPreview cameraId={previewCamera} />
          )}
          
          {/* Label */}
          <div 
            className="absolute top-3 left-3 px-3 py-1 rounded-md text-xs font-bold"
            style={{
              background: 'rgba(0, 217, 255, 0.9)',
              color: '#0A0E1A',
            }}
          >
            PREVIEW
          </div>
          
          {/* Overlay Frame - PREVIEW */}
          <OverlayFrame target="preview" />
          
          {/* Banner Overlay - PREVIEW */}
          <BannerOverlay 
            target="preview" 
            editMode={bannerEditMode}
            onEditModeChange={(isEdit) => setBannerEditMode(isEdit)}
          />
        </div>
      </div>

      {/* Botão GO de Transição */}
      <div className="flex flex-col items-center justify-center px-2">
        <button
          onClick={handleTransitionGo}
          disabled={!hasPreviewContent && !previewStream && !previewMedia && !isTransitioningLocal}
          className={`
            relative w-14 h-14 rounded-full flex items-center justify-center
            transition-all duration-300 transform
            ${(hasPreviewContent || previewStream || previewMedia || isTransitioningLocal)
              ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 hover:scale-110 shadow-lg shadow-green-500/50' 
              : 'bg-gray-700 cursor-not-allowed opacity-50'
            }
            ${isTransitioningLocal ? 'animate-pulse scale-110' : ''}
          `}
          title="Enviar PREVIEW para PROGRAM (GO)"
        >
          <ArrowRight 
            size={28} 
            className={`text-white ${isTransitioningLocal ? 'animate-bounce' : ''}`}
          />
        </button>
        
        <span 
          className="mt-2 text-xs font-bold tracking-wider"
          style={{ color: (hasPreviewContent || previewStream || previewMedia) ? '#22C55E' : '#6B7280' }}
        >
          GO
        </span>
        
        {/* Indicador de conteúdo no PREVIEW */}
        {(hasPreviewContent || previewStream || previewMedia) && (
          <div 
            className="mt-2 w-2 h-2 rounded-full animate-pulse"
            style={{ background: '#22C55E' }}
          />
        )}
      </div>

      {/* PROGRAM Monitor */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-3">
            <h2 
              className="text-xl font-bold tracking-wide"
              style={{ color: '#FF6B00' }}
            >
              PROGRAM
            </h2>
            
            {isLive && (
              <div 
                className="flex items-center gap-2 px-3 py-1 rounded-lg animate-pulse"
                style={{
                  background: 'rgba(255, 107, 0, 0.2)',
                  border: '1px solid #FF6B00'
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#FF6B00' }}
                />
                <span 
                  className="text-xs font-bold"
                  style={{ color: '#FF6B00' }}
                >
                  LIVE
                </span>
              </div>
            )}
            
            <span 
              className="text-sm font-medium px-3 py-1 rounded"
              style={{ 
                background: 'rgba(255, 107, 0, 0.2)',
                color: '#FF6B00',
                border: '1px solid #FF6B00'
              }}
            >
              {programLabel}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              ref={programSettingsRef}
              onClick={() => setProgramSettingsOpen(!programSettingsOpen)}
              className={`p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842] ${programSettingsOpen ? 'bg-[#1E2842]' : ''}`}
              style={{ color: programSettingsOpen ? '#FF6B00' : '#7A8BA3' }}
              title="Configurações do PROGRAM"
            >
              <Settings size={18} />
            </button>
            <button
              className="p-2 rounded-lg transition-all duration-200 hover:bg-[#1E2842]"
              style={{ color: '#7A8BA3' }}
              title="Tela cheia"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Menu de configurações do PROGRAM */}
        <MonitorSettingsMenu
          target="program"
          isOpen={programSettingsOpen}
          onClose={() => setProgramSettingsOpen(false)}
          anchorRef={programSettingsRef}
        />
        
        {/* Monitor */}
        <div 
          data-monitor="program"
          className="flex-1 rounded-lg overflow-hidden relative"
          style={{
            ...backgroundService.getBackgroundCSS(currentBackground),
            border: '2px solid #FF6B00',
            boxShadow: '0 0 20px rgba(255, 107, 0, 0.3)',
          }}
        >
          {/* Renderizar stream de câmera, mídia ou placeholder */}
          {programStream ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <video
                ref={programStreamRef}
                className="max-w-full max-h-full object-contain"
                autoPlay
                muted
                playsInline
                style={{ transform: 'scaleX(-1)' }}
              />
              {/* Label da câmera */}
              <div className="absolute bottom-12 left-3 px-2 py-1 rounded bg-black/70 text-white text-xs">
                🎥 Câmera Local
              </div>
            </div>
          ) : programMedia ? (
            <div className="w-full h-full relative">
              {programMedia.type === 'image' ? (
                <img 
                  src={programMedia.url} 
                  alt={programMedia.name}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <video
                  ref={programVideoRef}
                  className="w-full h-full object-contain bg-black"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}
              {/* Nome da mídia */}
              <div className="absolute bottom-12 left-3 px-2 py-1 rounded bg-black/70 text-white text-xs">
                {programMedia.name}
              </div>
            </div>
          ) : (
            <VideoPreview cameraId={programCamera} />
          )}
          
          {/* LIVE indicator */}
          {isLive && (
            <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-lg flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-white font-bold text-sm">LIVE</span>
            </div>
          )}
          
          {/* Live Stats Overlay */}
          {isLive && (
            <>
              <div 
                className="absolute top-3 left-3 px-3 py-2 rounded-lg backdrop-blur-sm"
                style={{
                  background: 'rgba(10, 14, 26, 0.8)',
                  border: '1px solid #FF6B00'
                }}
              >
                <div 
                  className="text-xs font-semibold mb-1"
                  style={{ color: '#7A8BA3' }}
                >
                  VIEWERS
                </div>
                <div 
                  className="text-xl font-bold"
                  style={{ color: '#FF6B00' }}
                >
                  {viewers}
                </div>
              </div>
              
              <div 
                className="absolute top-3 right-3 px-3 py-2 rounded-lg backdrop-blur-sm"
                style={{
                  background: 'rgba(10, 14, 26, 0.8)',
                  border: '1px solid #FF6B00'
                }}
              >
                <div 
                  className="text-xs font-semibold mb-1"
                  style={{ color: '#7A8BA3' }}
                >
                  DURATION
                </div>
                <div 
                  className="text-lg font-mono font-bold"
                  style={{ color: '#FF6B00' }}
                >
                  {duration}
                </div>
              </div>
            </>
          )}
          
          {/* Label */}
          <div 
            className="absolute bottom-3 left-3 px-3 py-1 rounded-md text-xs font-bold"
            style={{
              background: 'rgba(255, 107, 0, 0.9)',
              color: '#FFFFFF',
            }}
          >
            {isLive ? 'LIVE' : 'PROGRAM'}
          </div>
          
          {/* Resolution Indicator */}
          <div 
            className="absolute bottom-3 right-3 px-2 py-1 rounded-md text-xs font-semibold"
            style={{
              background: 'rgba(255, 107, 0, 0.2)',
              color: '#FF6B00',
              border: '1px solid #FF6B00',
            }}
          >
            1080p
          </div>
          
          {/* Comment Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <CommentOverlay />
          </div>
          
          {/* Overlay Frame - PROGRAM */}
          <OverlayFrame target="program" />
          
          {/* Banner Overlay - PROGRAM */}
          <BannerOverlay target="program" />
          
          {/* Transition Indicator */}
          {lastTransition !== 'none' && (
            <div 
              className="absolute top-16 left-3 px-3 py-2 rounded-lg backdrop-blur-sm"
              style={{
                background: 'rgba(10, 14, 26, 0.9)',
                border: isTransitioning ? '2px solid #00D9FF' : '1px solid #FF6B00',
                boxShadow: isTransitioning ? '0 0 20px rgba(0, 217, 255, 0.5)' : 'none',
              }}
            >
              <div 
                className="text-xs font-semibold mb-1"
                style={{ color: '#7A8BA3' }}
              >
                {isTransitioning ? 'TRANSITIONING...' : 'LAST TRANSITION'}
              </div>
              <div 
                className={`text-lg font-bold ${isTransitioning ? 'animate-pulse' : ''}`}
                style={{ color: isTransitioning ? '#00D9FF' : '#FF6B00' }}
              >
                {lastTransition}
              </div>
              {transitionTimestamp && (
                <div 
                  className="text-xs font-mono mt-1"
                  style={{ color: '#7A8BA3' }}
                >
                  {transitionTimestamp}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DualMonitors;
