/**
 * BannerStyleSelector - Seletor visual de estilos para banners
 */

import { Check } from 'lucide-react';
import { BANNER_STYLES, BannerStyle } from '../config/BannerPresets';

interface BannerStyleSelectorProps {
  selectedStyleId: string;
  onSelect: (style: BannerStyle) => void;
  previewColor?: string;
}

export function BannerStyleSelector({ selectedStyleId, onSelect, previewColor = '#f97316' }: BannerStyleSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400 font-medium">Estilo do Banner</label>
      
      <div className="grid grid-cols-2 gap-2">
        {BANNER_STYLES.map((style) => {
          const isSelected = selectedStyleId === style.id;
          
          // Generate preview styles
          const previewStyles: React.CSSProperties = {
            backgroundColor: style.id === 'minimal' ? `${previewColor}dd` : previewColor,
            borderRadius: style.borderRadius,
            padding: '6px 10px',
            boxShadow: style.glow ? `0 0 10px ${previewColor}` : style.boxShadow,
            border: style.border ? `2px solid ${previewColor}` : undefined,
            backdropFilter: style.backdropFilter,
          };

          if (style.gradient) {
            previewStyles.background = `linear-gradient(135deg, ${previewColor}, ${adjustColor(previewColor, -30)})`;
          }

          return (
            <button
              key={style.id}
              onClick={() => onSelect(style)}
              className={`relative p-2 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-orange-500 bg-orange-900/20'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              {/* Style Preview */}
              <div className="flex flex-col items-center gap-2">
                <div 
                  className="w-full h-8 flex items-center justify-center"
                  style={previewStyles}
                >
                  <span className="text-white text-[10px] font-medium truncate px-1">
                    {style.name}
                  </span>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-white font-medium">{style.name}</p>
                  <p className="text-[10px] text-gray-500 leading-tight">{style.description}</p>
                </div>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default BannerStyleSelector;
