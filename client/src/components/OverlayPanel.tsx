/**
 * OverlayPanel - Painel para seleção de overlays/molduras decorativas
 * Renderizado como modal centralizado para garantir visibilidade
 */

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Check, Layers, ImagePlus } from 'lucide-react';
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

export function OverlayPanel({ isOpen, onClose }: OverlayPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<OverlayCategory>('christmas');
  const [currentOverlay, setCurrentOverlay] = useState<ActiveOverlay>(null);
  const [previewOverlay, setPreviewOverlay] = useState<ActiveOverlay>(null);
  const [customOverlays, setCustomOverlays] = useState<CustomOverlay[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Carregar estado inicial
    setCurrentOverlay(overlayService.getCurrentOverlay());
    setPreviewOverlay(overlayService.getPreviewOverlay());
    setCustomOverlays(overlayService.getCustomOverlays());

    // Escutar mudanças
    const unsubscribe = overlayService.subscribe(() => {
      setCurrentOverlay(overlayService.getCurrentOverlay());
      setPreviewOverlay(overlayService.getPreviewOverlay());
      setCustomOverlays(overlayService.getCustomOverlays());
    });

    return unsubscribe;
  }, []);

  const handleSelectOverlay = (overlay: OverlayPreset | CustomOverlay) => {
    // Aplicar diretamente no PROGRAM
    overlayService.setOverlay(overlay);
  };

  const handleClearOverlay = () => {
    overlayService.clearOverlay();
    overlayService.clearPreviewOverlay();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem (PNG, JPG, etc.)');
      return;
    }

    setIsUploading(true);

    try {
      // Converter para Data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        const name = file.name.replace(/\.[^/.]+$/, ''); // Remove extensão
        overlayService.addCustomOverlay(name, imageUrl);
        setIsUploading(false);
        // Mudar para categoria custom para ver o overlay adicionado
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

    // Limpar input
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
    if (selectedCategory === 'custom') return customOverlays;
    return getOverlaysByCategory(selectedCategory);
  };

  const displayOverlays = getDisplayOverlays();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - clique para fechar */}
      <div 
        className="fixed inset-0 bg-black/60 z-[9998]"
        onClick={onClose}
      />
      
      {/* Modal centralizado */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 flex flex-col w-full max-w-2xl max-h-[85vh] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-purple-400" />
              <h3 className="text-white font-semibold text-lg">Overlays / Molduras</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Status atual */}
          {currentOverlay && (
            <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/30 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-300 font-medium uppercase tracking-wide">Overlay Ativo</span>
                <button
                  onClick={handleClearOverlay}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-900/30 transition-colors"
                >
                  <X size={12} />
                  Remover
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-12 rounded-lg border border-purple-500 overflow-hidden bg-gray-800">
                  {'thumbnail' in currentOverlay ? (
                    <img 
                      src={currentOverlay.thumbnail} 
                      alt={currentOverlay.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img 
                      src={currentOverlay.imageUrl} 
                      alt={currentOverlay.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <span className="text-sm text-white font-medium">{currentOverlay.name}</span>
                  <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">LIVE</span>
                </div>
              </div>
            </div>
          )}

          {/* Categorias - Scroll horizontal */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700">
              {OVERLAY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span>{cat.name}</span>
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
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <ImagePlus size={20} />
                {isUploading ? 'Carregando...' : 'Carregar Meu Overlay'}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                PNG com transparência recomendado para melhores resultados
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
                  <p className="text-sm mt-1">Clique em "Carregar Meu Overlay" para adicionar</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {displayOverlays.map((overlay) => {
                  const isActive = currentOverlay?.id === overlay.id;
                  const isCustom = 'createdAt' in overlay;

                  return (
                    <div
                      key={overlay.id}
                      onClick={() => handleSelectOverlay(overlay)}
                      className={`relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden group ${
                        isActive
                          ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20'
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
                          <span className="text-white text-sm font-medium bg-purple-600 px-3 py-1.5 rounded-lg">
                            {isActive ? '✓ Ativo' : 'Usar'}
                          </span>
                        </div>
                      </div>

                      {/* Nome */}
                      <div className="p-3 bg-gray-800/90">
                        <p className="text-sm text-white truncate font-medium">{overlay.name}</p>
                      </div>

                      {/* Badge ativo */}
                      {isActive && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                          <Check size={12} />
                          LIVE
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
            <p className="text-sm text-gray-400 text-center">
              Clique em um overlay para aplicar instantaneamente no stream
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default OverlayPanel;
