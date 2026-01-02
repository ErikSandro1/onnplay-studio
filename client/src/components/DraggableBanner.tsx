/**
 * DraggableBanner - Componente para arrastar e posicionar banners livremente
 * 
 * Permite que o usuário arraste o banner para qualquer posição na tela,
 * mantendo os pre-sets como ponto de partida.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Move, RotateCcw, Check } from 'lucide-react';
import { Banner, BannerCustomPosition, bannerOverlayService } from '../services/BannerOverlayService';

interface DraggableBannerProps {
  banner: Banner;
  containerRef: React.RefObject<HTMLDivElement>;
  isEditMode: boolean;
  onEditModeChange: (isEdit: boolean) => void;
  children: React.ReactNode;
}

export function DraggableBanner({ 
  banner, 
  containerRef, 
  isEditMode, 
  onEditModeChange,
  children 
}: DraggableBannerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<BannerCustomPosition | null>(
    banner.customPosition || null
  );
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0 });
  const bannerRef = useRef<HTMLDivElement>(null);

  // Atualizar posição quando o banner mudar
  useEffect(() => {
    setPosition(banner.customPosition || null);
  }, [banner.customPosition]);

  // Calcular posição inicial baseada no pre-set
  const getPresetPosition = useCallback((): { x: number; y: number } => {
    const positions: Record<string, { x: number; y: number }> = {
      'top': { x: 50, y: 5 },
      'bottom': { x: 50, y: 85 },
      'left': { x: 5, y: 50 },
      'right': { x: 95, y: 50 },
      'center': { x: 50, y: 50 },
      'top-left': { x: 5, y: 5 },
      'top-right': { x: 95, y: 5 },
      'bottom-left': { x: 5, y: 85 },
      'bottom-right': { x: 95, y: 85 },
    };
    return positions[banner.position] || positions['bottom-left'];
  }, [banner.position]);

  // Converter posição para CSS
  const getPositionStyle = useCallback((): React.CSSProperties => {
    if (position) {
      return {
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      };
    }
    
    // Usar pre-set se não tiver posição customizada
    const preset = getPresetPosition();
    return {
      position: 'absolute',
      left: `${preset.x}%`,
      top: `${preset.y}%`,
      transform: 'translate(-50%, -50%)',
    };
  }, [position, getPresetPosition]);

  // Iniciar arrasto
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditMode || !containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Posição atual do elemento
    const currentPos = position || getPresetPosition();
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: currentPos.x, y: currentPos.y });
  }, [isEditMode, containerRef, position, getPresetPosition]);

  // Durante o arrasto
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const container = containerRef.current;
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
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, containerRef, dragStart, elementStart]);

  // Finalizar arrasto
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Salvar posição se mudou
    if (position) {
      bannerOverlayService.updateBannerPosition(banner.id, position);
    }
  }, [isDragging, position, banner.id]);

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
    bannerOverlayService.resetBannerPosition(banner.id);
    setPosition(null);
  }, [banner.id]);

  // Confirmar posição e sair do modo de edição
  const handleConfirm = useCallback(() => {
    onEditModeChange(false);
  }, [onEditModeChange]);

  // Para ticker, não permitir arrastar (sempre no rodapé)
  if (banner.type === 'ticker') {
    return <>{children}</>;
  }

  return (
    <div
      ref={bannerRef}
      style={getPositionStyle()}
      className={`
        ${isEditMode ? 'cursor-move' : ''}
        ${isDragging ? 'z-[100]' : 'z-50'}
      `}
      onMouseDown={handleMouseDown}
    >
      {/* Controles de edição */}
      {isEditMode && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gray-900/90 rounded-lg px-2 py-1 shadow-lg border border-gray-700">
          {/* Indicador de arrastar */}
          <div className="flex items-center gap-1 text-cyan-400 text-xs font-medium px-2">
            <Move size={12} />
            <span>Arraste para mover</span>
          </div>
          
          {/* Botão resetar */}
          {position && (
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
      {isEditMode && (
        <div 
          className={`
            absolute inset-0 border-2 border-dashed rounded-lg pointer-events-none
            ${isDragging ? 'border-cyan-400' : 'border-cyan-600'}
          `}
          style={{ margin: '-8px', padding: '8px' }}
        />
      )}
      
      {/* Conteúdo do banner */}
      <div className={isDragging ? 'opacity-80' : ''}>
        {children}
      </div>
      
      {/* Indicador de posição customizada */}
      {position && !isEditMode && (
        <div 
          className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center"
          title="Posição personalizada"
        >
          <Move size={8} className="text-white" />
        </div>
      )}
    </div>
  );
}

export default DraggableBanner;
