/**
 * BackdropFrame - Renderiza o fundo/backdrop que fica ATRÁS do vídeo
 * Diferente do OverlayFrame que fica NA FRENTE como moldura
 * 
 * IMPORTANTE: z-index 1 = mais atrás de tudo
 */

import { useState, useEffect } from 'react';
import { overlayService, ActiveOverlay } from '../services/OverlayService';

interface BackdropFrameProps {
  target: 'preview' | 'program';
}

export function BackdropFrame({ target }: BackdropFrameProps) {
  const [backdrop, setBackdrop] = useState<ActiveOverlay>(null);

  useEffect(() => {
    // Obter backdrop inicial
    const currentBackdrop = overlayService.getBackdrop(target);
    console.log(`[BackdropFrame ${target}] Initial backdrop:`, currentBackdrop?.name || 'none');
    setBackdrop(currentBackdrop);

    // Escutar mudanças
    const unsubscribe = overlayService.subscribe(() => {
      const newBackdrop = overlayService.getBackdrop(target);
      console.log(`[BackdropFrame ${target}] Backdrop changed:`, newBackdrop?.name || 'none');
      setBackdrop(newBackdrop);
    });

    return unsubscribe;
  }, [target]);

  // Debug: sempre mostrar algo para verificar se o componente está renderizando
  console.log(`[BackdropFrame ${target}] Rendering, backdrop:`, backdrop?.name || 'none');

  if (!backdrop) {
    return null;
  }

  // Obter URL da imagem
  const imageUrl = backdrop.imageUrl;
  console.log(`[BackdropFrame ${target}] Image URL:`, imageUrl);

  return (
    <div 
      className="pointer-events-none"
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1, // Camada mais baixa - fica atrás do vídeo
        overflow: 'hidden',
      }}
    >
      <img
        src={imageUrl}
        alt={backdrop.name}
        style={{ 
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          display: 'block',
        }}
        onLoad={() => {
          console.log(`[BackdropFrame ${target}] Image loaded successfully:`, imageUrl);
        }}
        onError={(e) => {
          console.error(`[BackdropFrame ${target}] Failed to load image:`, imageUrl);
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

export default BackdropFrame;
