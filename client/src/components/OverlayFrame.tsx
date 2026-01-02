/**
 * OverlayFrame - Renderiza o overlay/moldura decorativa sobre o vídeo
 */

import { useState, useEffect } from 'react';
import { overlayService, ActiveOverlay } from '../services/OverlayService';

interface OverlayFrameProps {
  target: 'preview' | 'program';
}

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

  // Obter URL da imagem
  const imageUrl = 'thumbnail' in overlay ? overlay.imageUrl : overlay.imageUrl;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-40"
      style={{ overflow: 'hidden' }}
    >
      <img
        src={imageUrl}
        alt={overlay.name}
        className="w-full h-full object-fill"
        style={{ 
          mixBlendMode: 'normal',
          objectFit: 'fill',
        }}
        onError={(e) => {
          // Esconder se a imagem falhar ao carregar
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

export default OverlayFrame;
