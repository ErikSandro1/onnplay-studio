/**
 * OverlayFrame - Renderiza a MOLDURA decorativa NA FRENTE do vídeo
 * 
 * Camadas (z-index):
 * - z-index: 1 = Backdrop (fundo, atrás do vídeo)
 * - z-index: 10 = Vídeo/Câmera (conteúdo principal)
 * - z-index: 30 = Moldura (borda, na frente do vídeo)
 * 
 * A moldura deve:
 * - Cobrir toda a área do monitor
 * - Manter a proporção 16:9
 * - Ter centro transparente para mostrar o vídeo
 */

import { useState, useEffect } from 'react';
import { overlayService, ActiveOverlay } from '../services/OverlayService';

interface OverlayFrameProps {
  target: 'preview' | 'program';
}

export function OverlayFrame({ target }: OverlayFrameProps) {
  const [overlay, setOverlay] = useState<ActiveOverlay>(null);

  useEffect(() => {
    // Obter overlay inicial - usar moldura específica do serviço
    const currentOverlay = overlayService.getCurrentOverlay();
    setOverlay(currentOverlay);

    // Escutar mudanças
    const unsubscribe = overlayService.subscribe(() => {
      const newOverlay = overlayService.getCurrentOverlay();
      setOverlay(newOverlay);
    });

    return unsubscribe;
  }, [target]);

  if (!overlay) return null;

  // Obter URL da imagem
  const imageUrl = 'thumbnail' in overlay ? overlay.imageUrl : overlay.imageUrl;

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ 
        zIndex: 30, // Camada mais alta - fica NA FRENTE do vídeo
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      <img
        src={imageUrl}
        alt={overlay.name}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill', // Preencher toda a área - molduras são feitas para 16:9
          display: 'block',
        }}
        onError={(e) => {
          console.error('[OverlayFrame] Failed to load image:', imageUrl);
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

export default OverlayFrame;
