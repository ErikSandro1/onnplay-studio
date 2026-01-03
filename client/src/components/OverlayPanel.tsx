/**
 * OverlayPanel - Painel para seleção de overlays/molduras e backdrops
 * 
 * BACKDROP = Imagem de FUNDO que fica ATRÁS do vídeo
 * MOLDURA = Imagem PNG transparente que fica NA FRENTE do vídeo
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Trash2, Check, Layers, ImagePlus, Image, Frame } from 'lucide-react';
import { overlayService, CustomOverlay, ActiveOverlay } from '../services/OverlayService';
import { 
  OverlayPreset, 
  OverlayCategory, 
  OVERLAY_CATEGORIES, 
  getOverlaysByCategory 
} from '../config/OverlayPresets';

interface OverlayPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type LayerType = 'frame' | 'backdrop';

export function OverlayPanel({ isOpen, onClose }: OverlayPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<OverlayCategory>('christmas');
  const [activeLayer, setActiveLayer] = useState<LayerType>('frame');
  
  // Estado separado para moldura e backdrop
  const [currentFrame, setCurrentFrame] = useState<ActiveOverlay>(null);
  const [currentBackdrop, setCurrentBackdrop] = useState<ActiveOverlay>(null);
  
  const [customOverlays, setCustomOverlays] = useState<CustomOverlay[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Carregar estado inicial
    setCurrentFrame(overlayService.getCurrentOverlay());
    setCurrentBackdrop(overlayService.getBackdrop('program'));
    setCustomOverlays(overlayService.getCustomOverlays());

    // Escutar mudanças
    const unsubscribe = overlayService.subscribe(() => {
      setCurrentFrame(overlayService.getCurrentOverlay());
      setCurrentBackdrop(overlayService.getBackdrop('program'));
      setCustomOverlays(overlayService.getCustomOverlays());
    });

    return unsubscribe;
  }, []);

  // Bloquear scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSelectOverlay = (overlay: OverlayPreset | CustomOverlay) => {
    if (activeLayer === 'frame') {
      overlayService.setOverlay(overlay);
    } else {
      overlayService.setBackdrop(overlay, 'program');
    }
  };

  const handleClearLayer = () => {
    if (activeLayer === 'frame') {
      overlayService.clearOverlay();
      overlayService.clearPreviewOverlay();
    } else {
      overlayService.clearBackdrop('program');
      overlayService.clearBackdrop('preview');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem (PNG, JPG, etc.)');
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        const name = file.name.replace(/\.[^/.]+$/, '');
        overlayService.addCustomOverlay(name, imageUrl, activeLayer);
        setIsUploading(false);
        setSelectedCategory('custom');
      };
      reader.onerror = () => {
        alert('Erro ao carregar a imagem');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading overlay:', error);
      setIsUploading(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteCustomOverlay = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este overlay?')) {
      overlayService.removeCustomOverlay(id);
    }
  };

  // Obter overlays da categoria selecionada
  const getDisplayOverlays = (): (OverlayPreset | CustomOverlay)[] => {
    if (selectedCategory === 'none') return [];
    if (selectedCategory === 'custom') {
      // Filtrar por tipo quando na categoria custom
      return customOverlays.filter(o => o.type === activeLayer || !o.type);
    }
    return getOverlaysByCategory(selectedCategory);
  };

  const displayOverlays = getDisplayOverlays();
  const currentActive = activeLayer === 'frame' ? currentFrame : currentBackdrop;

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 99999 }}
    >
      {/* Backdrop - clique para fechar */}
      <div 
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-gray-900 rounded-xl shadow-2xl border border-gray-700 flex flex-col w-full max-w-3xl max-h-[90vh] m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-purple-400" />
            <h3 className="text-white font-semibold text-lg">Overlays e Fundos</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Seletor de Camada (Moldura vs Backdrop) */}
        <div className="p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Selecione a camada:</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveLayer('frame')}
              className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                activeLayer === 'frame'
                  ? 'border-purple-500 bg-purple-600/20 shadow-lg shadow-purple-500/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <Frame size={24} className={activeLayer === 'frame' ? 'text-purple-400' : 'text-gray-400'} />
              <div className="text-left">
                <div className={`font-semibold ${activeLayer === 'frame' ? 'text-white' : 'text-gray-300'}`}>
                  Moldura
                </div>
                <div className="text-xs text-gray-500">
                  Fica NA FRENTE do vídeo
                </div>
              </div>
              {currentFrame && (
                <div className="ml-auto w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              )}
            </button>
            
            <button
              onClick={() => setActiveLayer('backdrop')}
              className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                activeLayer === 'backdrop'
                  ? 'border-cyan-500 bg-cyan-600/20 shadow-lg shadow-cyan-500/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <Image size={24} className={activeLayer === 'backdrop' ? 'text-cyan-400' : 'text-gray-400'} />
              <div className="text-left">
                <div className={`font-semibold ${activeLayer === 'backdrop' ? 'text-white' : 'text-gray-300'}`}>
                  Fundo (Backdrop)
                </div>
                <div className="text-xs text-gray-500">
                  Fica ATRÁS do vídeo
                </div>
              </div>
              {currentBackdrop && (
                <div className="ml-auto w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Status atual da camada selecionada */}
        {currentActive && (
          <div className={`p-4 border-b border-gray-700 ${
            activeLayer === 'frame' 
              ? 'bg-gradient-to-r from-purple-900/30 to-transparent' 
              : 'bg-gradient-to-r from-cyan-900/30 to-transparent'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium uppercase tracking-wide ${
                activeLayer === 'frame' ? 'text-purple-300' : 'text-cyan-300'
              }`}>
                {activeLayer === 'frame' ? 'Moldura Ativa' : 'Fundo Ativo'}
              </span>
              <button
                onClick={handleClearLayer}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-900/30 transition-colors"
              >
                <X size={12} />
                Remover
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-20 h-12 rounded-lg border overflow-hidden bg-gray-800 ${
                activeLayer === 'frame' ? 'border-purple-500' : 'border-cyan-500'
              }`}>
                {'thumbnail' in currentActive ? (
                  <img 
                    src={currentActive.thumbnail} 
                    alt={currentActive.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={currentActive.imageUrl} 
                    alt={currentActive.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <span className="text-sm text-white font-medium">{currentActive.name}</span>
                <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">ATIVO</span>
              </div>
            </div>
          </div>
        )}

        {/* Categorias */}
        <div className="p-4 border-b border-gray-700">
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
            {OVERLAY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                title={cat.name}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                  selectedCategory === cat.id
                    ? activeLayer === 'frame'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400'
                      : 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 ring-2 ring-cyan-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="text-xl mb-1">{cat.icon}</span>
                <span className="text-[10px] leading-tight text-center truncate w-full">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botão de Upload - sempre visível na categoria custom */}
        {selectedCategory === 'custom' && (
          <div className="p-4 border-b border-gray-700">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`w-full py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg ${
                activeLayer === 'frame'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
              } disabled:from-gray-700 disabled:to-gray-700`}
            >
              <ImagePlus size={20} />
              {isUploading ? 'Carregando...' : `Carregar ${activeLayer === 'frame' ? 'Moldura' : 'Fundo'}`}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {activeLayer === 'frame' 
                ? 'PNG com transparência recomendado para molduras'
                : 'Qualquer imagem pode ser usada como fundo'
              }
            </p>
          </div>
        )}

        {/* Grid de overlays */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedCategory === 'none' ? (
            <div className="text-center text-gray-500 py-12">
              <Layers size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-base font-medium">Nenhum overlay selecionado</p>
              <p className="text-sm mt-1">Escolha uma categoria acima para ver os overlays disponíveis</p>
            </div>
          ) : displayOverlays.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <ImagePlus size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-base font-medium">Nenhum overlay nesta categoria</p>
              {selectedCategory === 'custom' && (
                <p className="text-sm mt-1">Clique no botão acima para adicionar</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {displayOverlays.map((overlay) => {
                const isActive = currentActive?.id === overlay.id;
                const isCustom = 'createdAt' in overlay;

                return (
                  <div
                    key={overlay.id}
                    onClick={() => handleSelectOverlay(overlay)}
                    className={`relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden group ${
                      isActive
                        ? activeLayer === 'frame'
                          ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20'
                          : 'border-cyan-500 ring-2 ring-cyan-500/50 shadow-lg shadow-cyan-500/20'
                        : 'border-gray-700 hover:border-gray-500 hover:shadow-lg'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-800 relative">
                      {'thumbnail' in overlay ? (
                        <img 
                          src={overlay.thumbnail} 
                          alt={overlay.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect fill="#374151" width="100" height="60"/><text x="50" y="35" text-anchor="middle" fill="#9CA3AF" font-size="10">Imagem</text></svg>');
                          }}
                        />
                      ) : (
                        <img 
                          src={overlay.imageUrl} 
                          alt={overlay.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className={`text-white text-sm font-medium px-3 py-1.5 rounded-lg ${
                          activeLayer === 'frame' ? 'bg-purple-600' : 'bg-cyan-600'
                        }`}>
                          {isActive ? '✓ Ativo' : 'Usar'}
                        </span>
                      </div>
                    </div>

                    {/* Nome */}
                    <div className="p-3 bg-gray-800/90">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white truncate font-medium">{overlay.name}</p>
                        {'hasTransparency' in overlay && overlay.hasTransparency && (
                          <span className="text-[10px] bg-purple-600/80 text-white px-1.5 py-0.5 rounded">
                            MOLDURA
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badge ativo */}
                    {isActive && (
                      <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg ${
                        activeLayer === 'frame' ? 'bg-purple-500' : 'bg-cyan-500'
                      }`}>
                        <Check size={12} />
                        ATIVO
                      </div>
                    )}

                    {/* Botão de deletar para customizados */}
                    {isCustom && (
                      <button
                        onClick={(e) => handleDeleteCustomOverlay(overlay.id, e)}
                        className="absolute top-2 left-2 p-2 bg-red-600/90 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-600" />
              <span className="text-gray-400">Moldura (frente)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-cyan-600" />
              <span className="text-gray-400">Fundo (atrás)</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Você pode usar uma moldura E um fundo ao mesmo tempo!
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default OverlayPanel;
