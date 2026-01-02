/**
 * OverlayFrame - Renderiza o overlay/moldura decorativa sobre o vídeo
 */

import { useState, useEffect } from 'react';
import { overlayService, ActiveOverlay } from '../services/OverlayService';
import { OverlayPreset } from '../config/OverlayPresets';

interface OverlayFrameProps {
  target: 'preview' | 'program';
}

// SVG overlays pré-definidos (renderizados inline para melhor qualidade)
const SVG_OVERLAYS: Record<string, React.ReactNode> = {
  'christmas-lights': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      {/* Fio de luzes no topo */}
      <path 
        d="M0,30 Q120,60 240,30 Q360,0 480,30 Q600,60 720,30 Q840,0 960,30 Q1080,60 1200,30 Q1320,0 1440,30 Q1560,60 1680,30 Q1800,0 1920,30" 
        stroke="#228B22" 
        fill="none" 
        strokeWidth="8"
      />
      {/* Luzes */}
      {[0, 120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320, 1440, 1560, 1680, 1800].map((x, i) => (
        <circle 
          key={i} 
          cx={x + 60} 
          cy={i % 2 === 0 ? 35 : 25} 
          r="12" 
          fill={['#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff'][i % 5]}
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
      {/* Fio de luzes no rodapé */}
      <path 
        d="M0,1050 Q120,1080 240,1050 Q360,1020 480,1050 Q600,1080 720,1050 Q840,1020 960,1050 Q1080,1080 1200,1050 Q1320,1020 1440,1050 Q1560,1080 1680,1050 Q1800,1020 1920,1050" 
        stroke="#228B22" 
        fill="none" 
        strokeWidth="8"
      />
      {[0, 120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320, 1440, 1560, 1680, 1800].map((x, i) => (
        <circle 
          key={`bottom-${i}`} 
          cx={x + 60} 
          cy={i % 2 === 0 ? 1055 : 1045} 
          r="12" 
          fill={['#ff0000', '#00ff00', '#ffff00', '#ff00ff', '#00ffff'][i % 5]}
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </svg>
  ),

  'snowflakes': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      {/* Flocos de neve animados */}
      {Array.from({ length: 30 }).map((_, i) => (
        <text
          key={i}
          x={Math.random() * 1920}
          y={Math.random() * 200}
          fontSize={Math.random() * 30 + 20}
          fill="white"
          opacity={Math.random() * 0.5 + 0.5}
          className="animate-bounce"
          style={{ animationDelay: `${i * 0.2}s`, animationDuration: '3s' }}
        >
          ❄
        </text>
      ))}
      {Array.from({ length: 30 }).map((_, i) => (
        <text
          key={`bottom-${i}`}
          x={Math.random() * 1920}
          y={880 + Math.random() * 200}
          fontSize={Math.random() * 30 + 20}
          fill="white"
          opacity={Math.random() * 0.5 + 0.5}
          className="animate-bounce"
          style={{ animationDelay: `${i * 0.2}s`, animationDuration: '3s' }}
        >
          ❄
        </text>
      ))}
    </svg>
  ),

  'new-year': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      {/* Confetes e fogos */}
      {Array.from({ length: 20 }).map((_, i) => (
        <text
          key={i}
          x={Math.random() * 1920}
          y={Math.random() * 150}
          fontSize={Math.random() * 30 + 20}
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {['✨', '🎆', '🎉', '🎊', '🥂'][i % 5]}
        </text>
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <text
          key={`bottom-${i}`}
          x={Math.random() * 1920}
          y={930 + Math.random() * 150}
          fontSize={Math.random() * 30 + 20}
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {['✨', '🎆', '🎉', '🎊', '🥂'][i % 5]}
        </text>
      ))}
    </svg>
  ),

  'neon-frame': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <filter id="neon-glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <rect 
        x="20" y="20" 
        width="1880" height="1040" 
        fill="none" 
        stroke="#00ffff" 
        strokeWidth="6"
        filter="url(#neon-glow)"
      />
      <rect 
        x="40" y="40" 
        width="1840" height="1000" 
        fill="none" 
        stroke="#ff00ff" 
        strokeWidth="3"
        filter="url(#neon-glow)"
      />
    </svg>
  ),

  'gaming-hud': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      {/* Cantos estilo HUD */}
      <polygon points="0,0 150,0 100,80 0,80" fill="#ff0000" opacity="0.8"/>
      <polygon points="1920,0 1770,0 1820,80 1920,80" fill="#ff0000" opacity="0.8"/>
      <polygon points="0,1080 150,1080 100,1000 0,1000" fill="#00ff00" opacity="0.8"/>
      <polygon points="1920,1080 1770,1080 1820,1000 1920,1000" fill="#00ff00" opacity="0.8"/>
      {/* Barra superior */}
      <rect x="800" y="10" width="320" height="50" rx="10" fill="rgba(0,0,0,0.7)"/>
      <circle cx="840" cy="35" r="8" fill="#ff0000" className="animate-pulse"/>
      <text x="860" y="42" fontSize="24" fill="#00ff00" fontFamily="monospace">LIVE</text>
    </svg>
  ),

  'cyber-frame': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <filter id="cyber-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path 
        d="M0,80 L80,0 L1840,0 L1920,80 L1920,1000 L1840,1080 L80,1080 L0,1000 Z" 
        fill="none" 
        stroke="#00ffff" 
        strokeWidth="4"
        filter="url(#cyber-glow)"
      />
      <path 
        d="M20,90 L90,20 L1830,20 L1900,90" 
        fill="none" 
        stroke="#ff00ff" 
        strokeWidth="2"
      />
      <path 
        d="M20,990 L90,1060 L1830,1060 L1900,990" 
        fill="none" 
        stroke="#ff00ff" 
        strokeWidth="2"
      />
    </svg>
  ),

  'corporate-clean': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      <rect x="0" y="0" width="1920" height="15" fill="#f97316"/>
      <rect x="0" y="1065" width="1920" height="15" fill="#f97316"/>
      <rect x="0" y="0" width="15" height="1080" fill="#f97316" opacity="0.5"/>
      <rect x="1905" y="0" width="15" height="1080" fill="#f97316" opacity="0.5"/>
    </svg>
  ),

  'professional-frame': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      <rect x="0" y="0" width="1920" height="8" fill="#2563eb"/>
      <rect x="0" y="1072" width="1920" height="8" fill="#2563eb"/>
      <rect x="0" y="980" width="400" height="100" fill="#2563eb" opacity="0.9"/>
    </svg>
  ),

  'breaking-news': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      <rect x="0" y="0" width="1920" height="80" fill="#cc0000"/>
      <text x="40" y="55" fontSize="40" fill="white" fontWeight="bold">BREAKING NEWS</text>
      <rect x="0" y="1000" width="1920" height="80" fill="#cc0000"/>
      <rect x="0" y="1010" width="1920" height="60" fill="#222"/>
    </svg>
  ),

  'news-ticker': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      <rect x="0" y="1000" width="1920" height="80" fill="#1a1a2e"/>
      <rect x="0" y="1000" width="200" height="80" fill="#cc0000"/>
      <text x="30" y="1050" fontSize="30" fill="white" fontWeight="bold">AO VIVO</text>
      <rect x="200" y="1000" width="1720" height="80" fill="#222"/>
    </svg>
  ),

  'like-subscribe': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      <rect x="20" y="950" width="250" height="80" rx="15" fill="#ff0000"/>
      <text x="50" y="1000" fontSize="28" fill="white" fontWeight="bold">INSCREVA-SE</text>
      <rect x="1650" y="950" width="250" height="80" rx="15" fill="#065fd4"/>
      <text x="1720" y="1000" fontSize="40" fill="white">👍</text>
    </svg>
  ),

  'social-icons': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      <circle cx="50" cy="400" r="30" fill="#1877f2"/>
      <text x="40" y="410" fontSize="24" fill="white">f</text>
      <circle cx="50" cy="480" r="30" fill="#e4405f"/>
      <text x="35" y="490" fontSize="24" fill="white">📷</text>
      <circle cx="50" cy="560" r="30" fill="#000"/>
      <text x="35" y="570" fontSize="24" fill="white">𝕏</text>
      <circle cx="50" cy="640" r="30" fill="#ff0000"/>
      <text x="35" y="650" fontSize="24" fill="white">▶</text>
    </svg>
  ),

  'podcast-wave': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      {/* Ondas de áudio */}
      {Array.from({ length: 20 }).map((_, i) => (
        <rect
          key={i}
          x={30 + i * 25}
          y={1030 - Math.random() * 50}
          width="10"
          height={20 + Math.random() * 40}
          fill="#f97316"
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.05}s` }}
        />
      ))}
      <text x="550" y="1060" fontSize="28" fill="#f97316" fontWeight="bold">🎙️ PODCAST</text>
    </svg>
  ),

  'microphone-frame': (
    <svg viewBox="0 0 1920 1080" className="w-full h-full" preserveAspectRatio="none">
      <circle cx="60" cy="60" r="40" fill="#333"/>
      <text x="40" y="75" fontSize="40">🎙️</text>
      <rect x="0" y="0" width="1920" height="8" fill="#9333ea"/>
      <rect x="0" y="1072" width="1920" height="8" fill="#9333ea"/>
    </svg>
  ),
};

export function OverlayFrame({ target }: OverlayFrameProps) {
  const [overlay, setOverlay] = useState<ActiveOverlay>(null);

  useEffect(() => {
    // Obter overlay inicial
    const currentOverlay = target === 'preview' 
      ? overlayService.getPreviewOverlay() || overlayService.getCurrentOverlay()
      : overlayService.getCurrentOverlay();
    
    setOverlay(currentOverlay);

    // Escutar mudanças
    const unsubscribe = overlayService.subscribe(() => {
      const newOverlay = target === 'preview' 
        ? overlayService.getPreviewOverlay() || overlayService.getCurrentOverlay()
        : overlayService.getCurrentOverlay();
      setOverlay(newOverlay);
    });

    return unsubscribe;
  }, [target]);

  if (!overlay) return null;

  // Verificar se é um overlay SVG pré-definido
  const isPreset = 'imageUrl' in overlay && typeof overlay.imageUrl === 'string';
  const svgOverlay = isPreset ? SVG_OVERLAYS[(overlay as OverlayPreset).imageUrl] : null;

  // Se é um overlay customizado (imagem carregada)
  const isCustom = 'createdAt' in overlay;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-40"
      style={{ overflow: 'hidden' }}
    >
      {svgOverlay ? (
        // Renderizar SVG inline
        <div className="w-full h-full">
          {svgOverlay}
        </div>
      ) : isCustom ? (
        // Renderizar imagem customizada
        <img
          src={overlay.imageUrl}
          alt={overlay.name}
          className="w-full h-full object-cover"
          style={{ 
            mixBlendMode: 'normal',
            imageRendering: 'crisp-edges',
          }}
        />
      ) : null}
    </div>
  );
}

export default OverlayFrame;
