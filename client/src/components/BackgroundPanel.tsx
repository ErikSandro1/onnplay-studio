/**
 * BackgroundPanel - Painel de seleção de fundos para o stream
 */

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Check, Palette, Image as ImageIcon, Sparkles, Trash2, Plus } from 'lucide-react';
import { backgroundService, CustomBackground } from '../services/BackgroundService';
import { 
  BackgroundPreset, 
  SOLID_BACKGROUNDS, 
  GRADIENT_BACKGROUNDS, 
  PATTERN_BACKGROUNDS,
  getBackgroundCSS 
} from '../config/BackgroundPresets';

interface BackgroundPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'colors' | 'gradients' | 'patterns' | 'custom';

export function BackgroundPanel({ isOpen, onClose }: BackgroundPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('colors');
  const [currentBackground, setCurrentBackground] = useState<BackgroundPreset | CustomBackground | null>(null);
  const [customBackgrounds, setCustomBackgrounds] = useState<CustomBackground[]>([]);
  const [customColor, setCustomColor] = useState('#1f2937');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Carregar estado inicial
    setCurrentBackground(backgroundService.getCurrentBackground());
    setCustomBackgrounds(backgroundService.getCustomBackgrounds());

    // Escutar mudanças
    const unsubscribe = backgroundService.subscribe((bg) => {
      setCurrentBackground(bg);
      setCustomBackgrounds(backgroundService.getCustomBackgrounds());
    });

    return unsubscribe;
  }, []);

  const handleSelectBackground = (bg: BackgroundPreset | CustomBackground) => {
    backgroundService.setBackground(bg);
  };

  const handlePreviewBackground = (bg: BackgroundPreset | CustomBackground) => {
    backgroundService.setPreviewBackground(bg);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }

    try {
      const custom = await backgroundService.addCustomImage(file);
      backgroundService.setBackground(custom);
    } catch (error) {
      console.error('Failed to add custom image:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddCustomColor = () => {
    const custom = backgroundService.addCustomColor(customColor);
    backgroundService.setBackground(custom);
  };

  const handleRemoveCustom = (id: string) => {
    backgroundService.removeCustomBackground(id);
  };

  const handleClearBackground = () => {
    backgroundService.setBackground(null);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'colors' as TabType, name: 'Cores', icon: Palette },
    { id: 'gradients' as TabType, name: 'Gradientes', icon: Sparkles },
    { id: 'patterns' as TabType, name: 'Padrões', icon: Sparkles },
    { id: 'custom' as TabType, name: 'Personalizado', icon: ImageIcon },
  ];

  const renderBackgroundGrid = (backgrounds: (BackgroundPreset | CustomBackground)[], showDelete = false) => (
    <div className="grid grid-cols-4 gap-2">
      {backgrounds.map((bg) => {
        const isSelected = currentBackground?.id === bg.id;
        const cssStyles = backgroundService.getBackgroundCSS(bg);

        return (
          <div key={bg.id} className="relative group">
            <button
              onClick={() => handleSelectBackground(bg)}
              onMouseEnter={() => handlePreviewBackground(bg)}
              onMouseLeave={() => backgroundService.setPreviewBackground(null)}
              className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 overflow-hidden ${
                isSelected
                  ? 'border-orange-500 ring-2 ring-orange-500 ring-offset-1 ring-offset-gray-900'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
              style={cssStyles}
              title={bg.name}
            >
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Check size={16} className="text-white" />
                </div>
              )}
            </button>

            {showDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCustom(bg.id);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={10} className="text-white" />
              </button>
            )}

            <p className="text-[10px] text-gray-400 text-center mt-1 truncate">{bg.name}</p>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 flex flex-col z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Fundos</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Current Background Preview */}
      <div className="p-3 border-b border-gray-700">
        <p className="text-xs text-gray-400 mb-2">Fundo Atual:</p>
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-10 rounded border border-gray-600"
            style={backgroundService.getBackgroundCSS(currentBackground)}
          />
          <div className="flex-1">
            <p className="text-sm text-white">
              {currentBackground?.name || 'Nenhum'}
            </p>
            <p className="text-xs text-gray-500">
              {currentBackground?.type === 'solid' ? 'Cor sólida' :
               currentBackground?.type === 'gradient' ? 'Gradiente' :
               currentBackground?.type === 'pattern' ? 'Padrão' :
               currentBackground?.type === 'image' ? 'Imagem' : 'Padrão'}
            </p>
          </div>
          {currentBackground && (
            <button
              onClick={handleClearBackground}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Remover fundo"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                activeTab === tab.id
                  ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-900/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon size={12} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">OnnPlay</h3>
              {renderBackgroundGrid(SOLID_BACKGROUNDS.filter(bg => bg.category === 'brand'))}
            </div>
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">Profissional</h3>
              {renderBackgroundGrid(SOLID_BACKGROUNDS.filter(bg => bg.category === 'professional'))}
            </div>
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">Criativo</h3>
              {renderBackgroundGrid(SOLID_BACKGROUNDS.filter(bg => bg.category === 'creative'))}
            </div>
          </div>
        )}

        {/* Gradients Tab */}
        {activeTab === 'gradients' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">OnnPlay</h3>
              {renderBackgroundGrid(GRADIENT_BACKGROUNDS.filter(bg => bg.category === 'brand'))}
            </div>
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">Profissional</h3>
              {renderBackgroundGrid(GRADIENT_BACKGROUNDS.filter(bg => bg.category === 'professional'))}
            </div>
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">Criativo</h3>
              {renderBackgroundGrid(GRADIENT_BACKGROUNDS.filter(bg => bg.category === 'creative'))}
            </div>
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">Natureza</h3>
              {renderBackgroundGrid(GRADIENT_BACKGROUNDS.filter(bg => bg.category === 'nature'))}
            </div>
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">Abstrato</h3>
              {renderBackgroundGrid(GRADIENT_BACKGROUNDS.filter(bg => bg.category === 'abstract'))}
            </div>
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 mb-2">
              Padrões são aplicados sobre uma cor de fundo
            </p>
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">Padrões Disponíveis</h3>
              <div className="grid grid-cols-2 gap-2">
                {PATTERN_BACKGROUNDS.map((pattern) => {
                  const isSelected = currentBackground?.id === pattern.id;
                  return (
                    <button
                      key={pattern.id}
                      onClick={() => handleSelectBackground(pattern)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-900/20'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div
                        className="w-full h-12 rounded mb-2"
                        style={{
                          background: `${pattern.value}, #1f2937`,
                          backgroundSize: pattern.id === 'pattern-dots' ? '20px 20px' : 
                                         pattern.id === 'pattern-grid' ? '20px 20px' : undefined,
                        }}
                      />
                      <p className="text-xs text-white text-center">{pattern.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Custom Tab */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            {/* Upload Image */}
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">Carregar Imagem</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-700 rounded-lg hover:border-orange-500 hover:bg-orange-900/10 transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-orange-400"
              >
                <Upload size={18} />
                <span className="text-sm">Escolher Imagem</span>
              </button>
            </div>

            {/* Custom Color */}
            <div>
              <h3 className="text-xs text-gray-400 font-medium mb-2">Cor Personalizada</h3>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border border-gray-700"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                  placeholder="#000000"
                />
                <button
                  onClick={handleAddCustomColor}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded text-white text-sm"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Custom Backgrounds List */}
            {customBackgrounds.length > 0 && (
              <div>
                <h3 className="text-xs text-gray-400 font-medium mb-2">Seus Fundos</h3>
                {renderBackgroundGrid(customBackgrounds, true)}
              </div>
            )}

            {customBackgrounds.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum fundo personalizado</p>
                <p className="text-xs mt-1">Carregue uma imagem ou adicione uma cor</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BackgroundPanel;
