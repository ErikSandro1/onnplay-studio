/**
 * BannerPresetSelector - Seletor de presets pré-configurados para banners
 */

import { useState } from 'react';
import { Sparkles, Briefcase, Palette, Newspaper, Gamepad2, Users } from 'lucide-react';
import { 
  BANNER_PRESETS, 
  BannerPreset, 
  getColorTheme, 
  getBannerStyle,
  getPresetsByCategory 
} from '../config/BannerPresets';

interface BannerPresetSelectorProps {
  onSelect: (preset: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    style: string;
    position: string;
  }) => void;
}

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: Sparkles },
  { id: 'professional', name: 'Profissional', icon: Briefcase },
  { id: 'creative', name: 'Criativo', icon: Palette },
  { id: 'news', name: 'Notícias', icon: Newspaper },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
  { id: 'social', name: 'Social', icon: Users },
] as const;

export function BannerPresetSelector({ onSelect }: BannerPresetSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredPresets = activeCategory === 'all' 
    ? BANNER_PRESETS 
    : getPresetsByCategory(activeCategory as BannerPreset['category']);

  const handlePresetClick = (preset: BannerPreset) => {
    const colorTheme = getColorTheme(preset.colorTheme);
    const style = getBannerStyle(preset.style);

    if (colorTheme && style) {
      onSelect({
        backgroundColor: colorTheme.backgroundColor,
        textColor: colorTheme.textColor,
        accentColor: colorTheme.accentColor,
        style: preset.style,
        position: preset.position,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-orange-400" />
        <label className="text-xs text-gray-400 font-medium">Presets Rápidos</label>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon size={12} />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Presets grid */}
      <div className="grid grid-cols-3 gap-2">
        {filteredPresets.map((preset) => {
          const colorTheme = getColorTheme(preset.colorTheme);
          const style = getBannerStyle(preset.style);

          if (!colorTheme || !style) return null;

          // Generate preview
          const previewStyles: React.CSSProperties = {
            background: colorTheme.preview.gradient || colorTheme.backgroundColor,
            borderRadius: style.borderRadius === '9999px' ? '12px' : 
                         style.borderRadius === '0' ? '2px' : '6px',
            padding: '4px 8px',
            boxShadow: style.glow ? `0 0 8px ${colorTheme.backgroundColor}` : undefined,
            border: style.border ? `1px solid ${colorTheme.accentColor}` : undefined,
          };

          return (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className="group p-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:border-orange-500 hover:bg-gray-800 transition-all"
            >
              {/* Preview banner */}
              <div 
                className="w-full h-6 flex items-center justify-center mb-1.5"
                style={previewStyles}
              >
                <span 
                  className="text-[8px] font-medium truncate px-1"
                  style={{ color: colorTheme.textColor }}
                >
                  Preview
                </span>
              </div>
              
              {/* Preset name */}
              <p className="text-[10px] text-gray-400 group-hover:text-white text-center truncate">
                {preset.name}
              </p>
            </button>
          );
        })}
      </div>

      {filteredPresets.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">
          Nenhum preset nesta categoria
        </p>
      )}
    </div>
  );
}

export default BannerPresetSelector;
