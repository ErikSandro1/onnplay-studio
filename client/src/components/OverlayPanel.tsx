/**
 * OverlayPanel - Painel para seleção de overlays/molduras decorativas
 */

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Check, Eye, Layers } from 'lucide-react';
import { overlayService, CustomOverlay, ActiveOverlay } from '../services/OverlayService';
import { 
  OverlayPreset, 
  OverlayCategory, 
  OVERLAY_CATEGORIES, 
  OVERLAY_PRESETS,
  getOverlaysByCategory 
} from '../config/OverlayPresets';

interface OverlayPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OverlayPanel({ isOpen, onClose }: OverlayPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<OverlayCategory>('none');
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
    // Enviar para preview primeiro
    overlayService.setPreviewOverlay(overlay);
  };

  const handleApplyToProgram = () => {
    overlayService.applyPreviewToProgram();
  };

  const handleClearOverlay = () => {
    overlayService.clearOverlay();
    overlayService.clearPreviewOverlay();
  };

  const handleClearPreview = () => {
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

  const handleDeleteCustomOverlay = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este overlay?')) {
      overlayService.removeCustomOverlay(id);
    }
  };

  const filteredOverlays = selectedCategory === 'none' 
    ? [] 
    : selectedCategory === 'custom'
    ? customOverlays
    : getOverlaysByCategory(selectedCategory);

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-full ml-2 w-80 bg-gray-900 rounded-lg shadow-xl border border-gray-700 z-50 flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-purple-400" />
          <h3 className="text-white font-semibold">Overlays</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Status atual */}
      <div className="p-3 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Overlay Ativo:</span>
          {currentOverlay && (
            <button
              onClick={handleClearOverlay}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remover
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentOverlay ? (
            <>
              <div className="w-12 h-8 rounded border border-gray-600 overflow-hidden bg-gray-700">
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
              <span className="text-sm text-white">{currentOverlay.name}</span>
              <span className="text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded">LIVE</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">Nenhum overlay ativo</span>
          )}
        </div>

        {/* Preview */}
        {previewOverlay && previewOverlay !== currentOverlay && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Preview:</span>
              <div className="flex gap-1">
                <button
                  onClick={handleClearPreview}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyToProgram}
                  className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-0.5 rounded flex items-center gap-1"
                >
                  <Check size={10} />
                  Aplicar
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-8 rounded border border-cyan-600 overflow-hidden bg-gray-700">
                {'thumbnail' in previewOverlay ? (
                  <img 
                    src={previewOverlay.thumbnail} 
                    alt={previewOverlay.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={previewOverlay.imageUrl} 
                    alt={previewOverlay.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <span className="text-sm text-cyan-400">{previewOverlay.name}</span>
              <span className="text-xs bg-cyan-600 text-white px-1.5 py-0.5 rounded">PRV</span>
            </div>
          </div>
        )}
      </div>

      {/* Categorias */}
      <div className="p-3 border-b border-gray-700">
        <p className="text-xs text-gray-400 mb-2">Categorias:</p>
        <div className="flex flex-wrap gap-1">
          {OVERLAY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload customizado */}
      {selectedCategory === 'custom' && (
        <div className="p-3 border-b border-gray-700">
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
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            {isUploading ? 'Carregando...' : 'Carregar Overlay (PNG)'}
          </button>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Use imagens PNG com transparência para melhores resultados
          </p>
        </div>
      )}

      {/* Lista de overlays */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedCategory === 'none' ? (
          <div className="text-center text-gray-500 py-8">
            <Layers size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Selecione uma categoria</p>
            <p className="text-xs mt-1">para ver os overlays disponíveis</p>
          </div>
        ) : filteredOverlays.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Nenhum overlay nesta categoria</p>
            {selectedCategory === 'custom' && (
              <p className="text-xs mt-1">Clique em "Carregar Overlay" para adicionar</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredOverlays.map((overlay) => {
              const isActive = currentOverlay?.id === overlay.id;
              const isPreview = previewOverlay?.id === overlay.id;
              const isCustom = 'createdAt' in overlay;

              return (
                <div
                  key={overlay.id}
                  onClick={() => handleSelectOverlay(overlay)}
                  className={`relative rounded-lg border cursor-pointer transition-all overflow-hidden ${
                    isActive
                      ? 'border-orange-500 ring-2 ring-orange-500/50'
                      : isPreview
                      ? 'border-cyan-500 ring-2 ring-cyan-500/50'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-800">
                    {'thumbnail' in overlay ? (
                      <img 
                        src={overlay.thumbnail} 
                        alt={overlay.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src={overlay.imageUrl} 
                        alt={overlay.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Nome */}
                  <div className="p-1.5 bg-gray-800/90">
                    <p className="text-xs text-white truncate">{overlay.name}</p>
                  </div>

                  {/* Badges */}
                  {isActive && (
                    <div className="absolute top-1 right-1 bg-orange-600 text-white text-[10px] px-1 py-0.5 rounded">
                      LIVE
                    </div>
                  )}
                  {isPreview && !isActive && (
                    <div className="absolute top-1 right-1 bg-cyan-600 text-white text-[10px] px-1 py-0.5 rounded">
                      PRV
                    </div>
                  )}

                  {/* Botão de deletar para customizados */}
                  {isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCustomOverlay(overlay.id);
                      }}
                      className="absolute top-1 left-1 p-1 bg-red-600/80 hover:bg-red-600 rounded text-white"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer com dica */}
      <div className="p-2 border-t border-gray-700 bg-gray-800/50">
        <p className="text-xs text-gray-500 text-center">
          💡 Clique para preview, depois "Aplicar" para usar no stream
        </p>
      </div>
    </div>
  );
}

export default OverlayPanel;
