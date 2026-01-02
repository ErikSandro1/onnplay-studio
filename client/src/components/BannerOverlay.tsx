import { useState, useEffect, useRef, useCallback } from 'react';
import { Move, RotateCcw, Check } from 'lucide-react';
import { bannerOverlayService, Banner, BannerTheme, BannerCustomPosition } from '../services/BannerOverlayService';

interface BannerOverlayProps {
  target: 'preview' | 'program';
  containerRef?: React.RefObject<HTMLDivElement>;
  editMode?: boolean;
  onEditModeChange?: (isEdit: boolean) => void;
}

export function BannerOverlay({ target, containerRef, editMode = false, onEditModeChange }: BannerOverlayProps) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(editMode);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<BannerCustomPosition | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0 });
  const bannerRef = useRef<HTMLDivElement>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);

  // Usar ref interno se não for fornecido
  const activeContainerRef = containerRef || internalContainerRef;

  useEffect(() => {
    setIsEditMode(editMode);
  }, [editMode]);

  useEffect(() => {
    // Obter banner inicial
    const currentBanner = target === 'preview' 
      ? bannerOverlayService.getPreviewBanner()
      : bannerOverlayService.getProgramBanner();
    
    if (currentBanner) {
      setBanner(currentBanner);
      setIsVisible(true);
      setDragPosition(currentBanner.customPosition || null);
    }

    // Escutar mudanças
    const unsubscribe = bannerOverlayService.subscribe((event) => {
      if (target === 'preview' && (event.type === 'banner:preview' || event.type === 'banner:removed' || event.type === 'banner:updated')) {
        const previewBanner = bannerOverlayService.getPreviewBanner();
        if (previewBanner) {
          setBanner(previewBanner);
          setIsVisible(true);
          setDragPosition(previewBanner.customPosition || null);
        } else {
          setIsVisible(false);
          setTimeout(() => setBanner(null), 300);
        }
      }
      
      if (target === 'program' && (event.type === 'banner:program' || event.type === 'banner:removed' || event.type === 'banner:updated')) {
        const programBanner = bannerOverlayService.getProgramBanner();
        if (programBanner) {
          setBanner(programBanner);
          setIsVisible(true);
          setDragPosition(programBanner.customPosition || null);
        } else {
          setIsVisible(false);
          setTimeout(() => setBanner(null), 300);
        }
      }
    });

    return unsubscribe;
  }, [target]);

  // Helper to adjust color brightness
  const adjustColor = (color: string, amount: number): string => {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Calcular posição inicial baseada no pre-set
  const getPresetPosition = useCallback((): { x: number; y: number } => {
    if (!banner) return { x: 5, y: 85 };
    
    const positions: Record<string, { x: number; y: number }> = {
      'top': { x: 50, y: 8 },
      'bottom': { x: 50, y: 85 },
      'left': { x: 8, y: 50 },
      'right': { x: 92, y: 50 },
      'center': { x: 50, y: 50 },
      'top-left': { x: 8, y: 8 },
      'top-right': { x: 92, y: 8 },
      'bottom-left': { x: 8, y: 85 },
      'bottom-right': { x: 92, y: 85 },
    };
    return positions[banner.position] || positions['bottom-left'];
  }, [banner]);

  // Iniciar arrasto
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditMode || !banner || banner.type === 'ticker') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Posição atual do elemento
    const currentPos = dragPosition || getPresetPosition();
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: currentPos.x, y: currentPos.y });
  }, [isEditMode, banner, dragPosition, getPresetPosition]);

  // Durante o arrasto
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !bannerRef.current) return;
    
    // Encontrar o container pai (monitor)
    const container = bannerRef.current.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    // Calcular delta em pixels
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Converter delta para porcentagem
    const deltaXPercent = (deltaX / rect.width) * 100;
    const deltaYPercent = (deltaY / rect.height) * 100;
    
    // Nova posição
    let newX = elementStart.x + deltaXPercent;
    let newY = elementStart.y + deltaYPercent;
    
    // Limitar aos bounds (5% - 95%)
    newX = Math.max(5, Math.min(95, newX));
    newY = Math.max(5, Math.min(95, newY));
    
    setDragPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, elementStart]);

  // Finalizar arrasto
  const handleMouseUp = useCallback(() => {
    if (!isDragging || !banner) return;
    
    setIsDragging(false);
    
    // Salvar posição se mudou
    if (dragPosition) {
      bannerOverlayService.updateBannerPosition(banner.id, dragPosition);
    }
  }, [isDragging, dragPosition, banner]);

  // Adicionar listeners globais durante o arrasto
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Resetar posição para pre-set
  const handleReset = useCallback(() => {
    if (!banner) return;
    bannerOverlayService.resetBannerPosition(banner.id);
    setDragPosition(null);
  }, [banner]);

  // Confirmar posição e sair do modo de edição
  const handleConfirm = useCallback(() => {
    setIsEditMode(false);
    onEditModeChange?.(false);
  }, [onEditModeChange]);

  if (!banner) return null;

  const getThemeStyles = (theme: BannerTheme, bgColor: string, textColor: string, accentColor?: string): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      backgroundColor: bgColor,
      color: textColor,
    };

    switch (theme) {
      case 'bubble':
        return {
          ...baseStyles,
          borderRadius: '9999px',
          padding: '12px 28px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        };
      case 'classic':
        return {
          ...baseStyles,
          borderRadius: '0',
          padding: '12px 20px',
          borderLeft: `4px solid ${accentColor || bgColor}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        };
      case 'minimal':
        return {
          ...baseStyles,
          borderRadius: '4px',
          padding: '8px 16px',
          backgroundColor: `${bgColor}dd`,
          backdropFilter: 'blur(8px)',
        };
      case 'block':
        return {
          ...baseStyles,
          borderRadius: '8px',
          padding: '16px 24px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        };
      case 'gradient':
        return {
          ...baseStyles,
          background: `linear-gradient(135deg, ${bgColor}, ${adjustColor(bgColor, -30)})`,
          borderRadius: '12px',
          padding: '14px 24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        };
      case 'neon':
        return {
          ...baseStyles,
          borderRadius: '8px',
          padding: '12px 24px',
          boxShadow: `0 0 20px ${bgColor}, 0 0 40px ${bgColor}50`,
          border: `1px solid ${bgColor}`,
          backgroundColor: `${bgColor}20`,
          backdropFilter: 'blur(4px)',
        };
      case 'glass':
        return {
          ...baseStyles,
          borderRadius: '16px',
          padding: '14px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(12px)',
          backgroundColor: `${bgColor}80`,
          border: '1px solid rgba(255,255,255,0.2)',
        };
      case 'sharp':
        return {
          ...baseStyles,
          borderRadius: '0',
          padding: '14px 24px',
          boxShadow: `4px 4px 0 ${adjustColor(bgColor, -40)}`,
        };
      default:
        return baseStyles;
    }
  };

  const getPositionStyles = (): React.CSSProperties => {
    // Para ticker, usar posição especial no rodapé
    if (banner.type === 'ticker') {
      return {
        bottom: '0',
        left: '0',
        right: '0',
        width: '100%',
      };
    }

    // Se tem posição customizada ou está arrastando, usar posição em porcentagem
    if (dragPosition || banner.customPosition) {
      const pos = dragPosition || banner.customPosition!;
      return {
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: 'translate(-50%, -50%)',
      };
    }

    // Usar pre-set
    const positions: Record<string, React.CSSProperties> = {
      'top': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
      'bottom': { bottom: '80px', left: '50%', transform: 'translateX(-50%)' },
      'left': { left: '20px', top: '50%', transform: 'translateY(-50%)' },
      'right': { right: '20px', top: '50%', transform: 'translateY(-50%)' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'top-left': { top: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'bottom-left': { bottom: '80px', left: '20px' },
      'bottom-right': { bottom: '80px', right: '20px' },
    };
    return positions[banner.position] || positions['bottom-left'];
  };

  const getAnimationClass = (): string => {
    if (!isVisible) return 'opacity-0 scale-95';
    
    switch (banner.position) {
      case 'top':
      case 'top-left':
      case 'top-right':
        return 'animate-in slide-in-from-top duration-500';
      case 'bottom':
      case 'bottom-left':
      case 'bottom-right':
        return 'animate-in slide-in-from-bottom duration-500';
      case 'left':
        return 'animate-in slide-in-from-left duration-500';
      case 'right':
        return 'animate-in slide-in-from-right duration-500';
      default:
        return 'animate-in fade-in duration-500';
    }
  };

  const renderBannerContent = () => {
    const { content, theme, type } = banner;
    const themeStyles = getThemeStyles(
      theme,
      content.backgroundColor || '#f97316',
      content.textColor || '#ffffff',
      content.accentColor
    );

    // Lower Third
    if (type === 'lower-third') {
      return (
        <div style={themeStyles} className={getAnimationClass()}>
          <h3 className="text-lg font-bold leading-tight">{content.title}</h3>
          {content.subtitle && (
            <p className="text-sm opacity-90 mt-0.5">{content.subtitle}</p>
          )}
        </div>
      );
    }

    // Banner (full width)
    if (type === 'banner') {
      return (
        <div 
          style={{
            ...themeStyles,
            width: '100%',
            textAlign: 'center',
          }} 
          className={getAnimationClass()}
        >
          <p className="text-lg font-semibold">{content.title}</p>
        </div>
      );
    }

    // Ticker (scrolling text) - Rodapé
    if (type === 'ticker') {
      return (
        <div 
          style={{
            ...themeStyles,
            width: '100vw',
            maxWidth: '100%',
            overflow: 'hidden',
            padding: '8px 0',
          }} 
          className={getAnimationClass()}
        >
          <div className="animate-marquee whitespace-nowrap flex items-center">
            <span className="text-sm font-medium mx-8">• {content.title}</span>
            <span className="text-sm font-medium mx-8">• {content.title}</span>
            <span className="text-sm font-medium mx-8">• {content.title}</span>
            <span className="text-sm font-medium mx-8">• {content.title}</span>
          </div>
        </div>
      );
    }

    // Logo
    if (type === 'logo' && content.imageUrl) {
      return (
        <div className={getAnimationClass()}>
          <img 
            src={content.imageUrl} 
            alt="Logo" 
            className="max-h-16 max-w-32 object-contain"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
          />
        </div>
      );
    }

    return null;
  };

  const canDrag = isEditMode && banner.type !== 'ticker';
  const hasCustomPosition = dragPosition || banner.customPosition;

  return (
    <div 
      ref={bannerRef}
      className={`
        absolute transition-all duration-300
        ${canDrag ? 'pointer-events-auto cursor-move' : 'pointer-events-none'}
        ${isDragging ? 'z-[100]' : 'z-50'}
      `}
      style={{
        ...getPositionStyles(),
        opacity: isVisible ? 1 : 0,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Controles de edição */}
      {canDrag && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-900/95 rounded-lg px-2 py-1.5 shadow-lg border border-cyan-600 whitespace-nowrap">
          {/* Indicador de arrastar */}
          <div className="flex items-center gap-1 text-cyan-400 text-xs font-medium px-2">
            <Move size={12} />
            <span>Arraste</span>
          </div>
          
          {/* Botão resetar */}
          {hasCustomPosition && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
              title="Resetar para posição padrão"
            >
              <RotateCcw size={12} />
            </button>
          )}
          
          {/* Botão confirmar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleConfirm();
            }}
            className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white transition-colors"
            title="Confirmar posição"
          >
            <Check size={12} />
          </button>
        </div>
      )}
      
      {/* Borda de edição */}
      {canDrag && (
        <div 
          className={`
            absolute inset-0 border-2 border-dashed rounded-lg pointer-events-none
            ${isDragging ? 'border-cyan-400 bg-cyan-400/10' : 'border-cyan-600'}
          `}
          style={{ margin: '-8px', padding: '8px' }}
        />
      )}
      
      {/* Conteúdo do banner */}
      <div className={isDragging ? 'opacity-90' : ''}>
        {renderBannerContent()}
      </div>
      
      {/* Indicador de posição customizada */}
      {hasCustomPosition && !isEditMode && (
        <div 
          className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg"
          title="Posição personalizada"
        >
          <Move size={8} className="text-white" />
        </div>
      )}
    </div>
  );
}

// CSS para animação de marquee (adicionar ao global.css ou tailwind)
const marqueeStyles = `
@keyframes marquee {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}
.animate-marquee {
  animation: marquee 15s linear infinite;
}
`;

// Injetar estilos
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = marqueeStyles;
  document.head.appendChild(styleSheet);
}

export default BannerOverlay;
