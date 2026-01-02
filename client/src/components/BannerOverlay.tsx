import { useState, useEffect } from 'react';
import { bannerOverlayService, Banner, BannerTheme } from '../services/BannerOverlayService';

interface BannerOverlayProps {
  target: 'preview' | 'program';
}

export function BannerOverlay({ target }: BannerOverlayProps) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Obter banner inicial
    const currentBanner = target === 'preview' 
      ? bannerOverlayService.getPreviewBanner()
      : bannerOverlayService.getProgramBanner();
    
    if (currentBanner) {
      setBanner(currentBanner);
      setIsVisible(true);
    }

    // Escutar mudanças
    const unsubscribe = bannerOverlayService.subscribe((event) => {
      if (target === 'preview' && (event.type === 'banner:preview' || event.type === 'banner:removed')) {
        const previewBanner = bannerOverlayService.getPreviewBanner();
        if (previewBanner) {
          setBanner(previewBanner);
          setIsVisible(true);
        } else {
          setIsVisible(false);
          setTimeout(() => setBanner(null), 300);
        }
      }
      
      if (target === 'program' && (event.type === 'banner:program' || event.type === 'banner:removed')) {
        const programBanner = bannerOverlayService.getProgramBanner();
        if (programBanner) {
          setBanner(programBanner);
          setIsVisible(true);
        } else {
          setIsVisible(false);
          setTimeout(() => setBanner(null), 300);
        }
      }
    });

    return unsubscribe;
  }, [target]);

  if (!banner) return null;

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

    // Ticker (scrolling text)
    if (type === 'ticker') {
      return (
        <div 
          style={{
            ...themeStyles,
            width: '100%',
            overflow: 'hidden',
          }} 
          className={getAnimationClass()}
        >
          <div className="animate-marquee whitespace-nowrap">
            <span className="text-sm font-medium mx-4">{content.title}</span>
            <span className="text-sm font-medium mx-4">{content.title}</span>
            <span className="text-sm font-medium mx-4">{content.title}</span>
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

  return (
    <div 
      className="absolute pointer-events-none transition-all duration-300"
      style={{
        ...getPositionStyles(),
        zIndex: 50,
        opacity: isVisible ? 1 : 0,
      }}
    >
      {renderBannerContent()}
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
