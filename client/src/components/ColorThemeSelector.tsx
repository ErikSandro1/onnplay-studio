/**
 * ColorThemeSelector - Seletor visual de temas de cores para banners
 */

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { COLOR_THEMES, ColorTheme } from '../config/BannerPresets';

interface ColorThemeSelectorProps {
  selectedThemeId: string;
  onSelect: (theme: ColorTheme) => void;
  compact?: boolean;
}

export function ColorThemeSelector({ selectedThemeId, onSelect, compact = false }: ColorThemeSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedTheme = COLOR_THEMES.find(t => t.id === selectedThemeId);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full border-2 border-white/20"
              style={{
                background: selectedTheme?.preview.gradient || selectedTheme?.backgroundColor,
              }}
            />
            <span className="text-sm text-white">{selectedTheme?.name || 'Selecione'}</span>
          </div>
          {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {isExpanded && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            <div className="p-2 grid grid-cols-4 gap-1">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    onSelect(theme);
                    setIsExpanded(false);
                  }}
                  className={`relative w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                    selectedThemeId === theme.id
                      ? 'border-white ring-2 ring-orange-500'
                      : 'border-transparent hover:border-gray-600'
                  }`}
                  style={{
                    background: theme.preview.gradient || theme.backgroundColor,
                  }}
                  title={theme.name}
                >
                  {selectedThemeId === theme.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full grid view
  return (
    <div className="space-y-3">
      <label className="text-xs text-gray-400 font-medium">Tema de Cores</label>
      
      {/* Quick picks - most popular */}
      <div className="flex gap-1.5 flex-wrap">
        {COLOR_THEMES.slice(0, 8).map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelect(theme)}
            className={`relative w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
              selectedThemeId === theme.id
                ? 'border-white ring-2 ring-orange-500 ring-offset-1 ring-offset-gray-900'
                : 'border-gray-700 hover:border-gray-500'
            }`}
            style={{
              background: theme.preview.gradient || theme.backgroundColor,
            }}
            title={theme.name}
          >
            {selectedThemeId === theme.id && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check size={12} className="text-white drop-shadow-lg" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Expandable full list */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
      >
        {isExpanded ? 'Menos cores' : 'Mais cores'}
        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {isExpanded && (
        <div className="grid grid-cols-6 gap-1.5 p-2 bg-gray-800/50 rounded-lg">
          {COLOR_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onSelect(theme)}
              className={`relative w-full aspect-square rounded-lg border-2 transition-all hover:scale-105 ${
                selectedThemeId === theme.id
                  ? 'border-white ring-2 ring-orange-500'
                  : 'border-transparent hover:border-gray-600'
              }`}
              style={{
                background: theme.preview.gradient || theme.backgroundColor,
              }}
              title={theme.name}
            >
              {selectedThemeId === theme.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                  <Check size={10} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected theme name */}
      {selectedTheme && (
        <p className="text-xs text-gray-500">
          Selecionado: <span className="text-white">{selectedTheme.name}</span>
        </p>
      )}
    </div>
  );
}

export default ColorThemeSelector;
