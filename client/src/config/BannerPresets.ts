/**
 * BannerPresets - Configurações pré-definidas de cores e estilos para banners
 * 
 * Similar ao StreamYard mas com design único do OnnPlay
 */

// Tipos de temas de cores
export interface ColorTheme {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  preview: {
    gradient?: string;
    borderColor?: string;
  };
}

// Tipos de estilos visuais
export interface BannerStyle {
  id: string;
  name: string;
  description: string;
  borderRadius: string;
  padding: string;
  boxShadow: string;
  border?: string;
  backdropFilter?: string;
  animation?: string;
  gradient?: boolean;
  glow?: boolean;
}

// ==================== TEMAS DE CORES ====================

export const COLOR_THEMES: ColorTheme[] = [
  // OnnPlay Brand Colors
  {
    id: 'onnplay-orange',
    name: 'OnnPlay Orange',
    backgroundColor: '#f97316',
    textColor: '#ffffff',
    accentColor: '#ea580c',
    preview: {
      gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    },
  },
  {
    id: 'onnplay-dark',
    name: 'OnnPlay Dark',
    backgroundColor: '#1f2937',
    textColor: '#ffffff',
    accentColor: '#f97316',
    preview: {
      gradient: 'linear-gradient(135deg, #1f2937, #111827)',
      borderColor: '#f97316',
    },
  },

  // Blues
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    backgroundColor: '#0ea5e9',
    textColor: '#ffffff',
    accentColor: '#0284c7',
    preview: {
      gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    },
  },
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    backgroundColor: '#2563eb',
    textColor: '#ffffff',
    accentColor: '#1d4ed8',
    preview: {
      gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    },
  },
  {
    id: 'navy',
    name: 'Navy',
    backgroundColor: '#1e3a5f',
    textColor: '#ffffff',
    accentColor: '#3b82f6',
    preview: {
      gradient: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
      borderColor: '#3b82f6',
    },
  },

  // Greens
  {
    id: 'forest-green',
    name: 'Forest Green',
    backgroundColor: '#16a34a',
    textColor: '#ffffff',
    accentColor: '#15803d',
    preview: {
      gradient: 'linear-gradient(135deg, #16a34a, #15803d)',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    accentColor: '#059669',
    preview: {
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    backgroundColor: '#14b8a6',
    textColor: '#ffffff',
    accentColor: '#0d9488',
    preview: {
      gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    },
  },

  // Reds & Pinks
  {
    id: 'crimson',
    name: 'Crimson',
    backgroundColor: '#dc2626',
    textColor: '#ffffff',
    accentColor: '#b91c1c',
    preview: {
      gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    backgroundColor: '#f43f5e',
    textColor: '#ffffff',
    accentColor: '#e11d48',
    preview: {
      gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
    },
  },
  {
    id: 'pink',
    name: 'Pink',
    backgroundColor: '#ec4899',
    textColor: '#ffffff',
    accentColor: '#db2777',
    preview: {
      gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    },
  },

  // Purples
  {
    id: 'purple',
    name: 'Purple',
    backgroundColor: '#9333ea',
    textColor: '#ffffff',
    accentColor: '#7c3aed',
    preview: {
      gradient: 'linear-gradient(135deg, #9333ea, #7c3aed)',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    backgroundColor: '#8b5cf6',
    textColor: '#ffffff',
    accentColor: '#7c3aed',
    preview: {
      gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    },
  },
  {
    id: 'indigo',
    name: 'Indigo',
    backgroundColor: '#6366f1',
    textColor: '#ffffff',
    accentColor: '#4f46e5',
    preview: {
      gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    },
  },

  // Neutrals
  {
    id: 'slate',
    name: 'Slate',
    backgroundColor: '#475569',
    textColor: '#ffffff',
    accentColor: '#64748b',
    preview: {
      gradient: 'linear-gradient(135deg, #475569, #334155)',
    },
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    backgroundColor: '#27272a',
    textColor: '#ffffff',
    accentColor: '#f97316',
    preview: {
      gradient: 'linear-gradient(135deg, #27272a, #18181b)',
      borderColor: '#f97316',
    },
  },
  {
    id: 'white',
    name: 'White',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    accentColor: '#f97316',
    preview: {
      gradient: 'linear-gradient(135deg, #ffffff, #f3f4f6)',
      borderColor: '#e5e7eb',
    },
  },

  // Special / Gradients
  {
    id: 'sunset',
    name: 'Sunset',
    backgroundColor: '#f97316',
    textColor: '#ffffff',
    accentColor: '#ec4899',
    preview: {
      gradient: 'linear-gradient(135deg, #f97316, #ec4899)',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    backgroundColor: '#06b6d4',
    textColor: '#ffffff',
    accentColor: '#8b5cf6',
    preview: {
      gradient: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    },
  },
  {
    id: 'fire',
    name: 'Fire',
    backgroundColor: '#ef4444',
    textColor: '#ffffff',
    accentColor: '#f97316',
    preview: {
      gradient: 'linear-gradient(135deg, #ef4444, #f97316)',
    },
  },
  {
    id: 'ocean-night',
    name: 'Ocean Night',
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    accentColor: '#06b6d4',
    preview: {
      gradient: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
      borderColor: '#06b6d4',
    },
  },
];

// ==================== ESTILOS DE BANNER ====================

export const BANNER_STYLES: BannerStyle[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Estilo tradicional com borda lateral',
    borderRadius: '0',
    padding: '12px 20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    border: '4px solid',
  },
  {
    id: 'bubble',
    name: 'Bubble',
    description: 'Arredondado e suave',
    borderRadius: '9999px',
    padding: '12px 28px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simples com transparência',
    borderRadius: '4px',
    padding: '8px 16px',
    boxShadow: 'none',
    backdropFilter: 'blur(8px)',
  },
  {
    id: 'block',
    name: 'Block',
    description: 'Sólido e impactante',
    borderRadius: '8px',
    padding: '16px 24px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
  },
  {
    id: 'gradient',
    name: 'Gradient',
    description: 'Com gradiente de cores',
    borderRadius: '12px',
    padding: '14px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    gradient: true,
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Efeito brilhante neon',
    borderRadius: '8px',
    padding: '12px 24px',
    boxShadow: '0 0 20px',
    glow: true,
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'Efeito vidro translúcido',
    borderRadius: '16px',
    padding: '14px 24px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  {
    id: 'sharp',
    name: 'Sharp',
    description: 'Cantos retos e moderno',
    borderRadius: '0',
    padding: '14px 24px',
    boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
  },
];

// ==================== PRESETS COMBINADOS ====================

export interface BannerPreset {
  id: string;
  name: string;
  category: 'professional' | 'creative' | 'news' | 'gaming' | 'social';
  colorTheme: string;
  style: string;
  position: string;
}

export const BANNER_PRESETS: BannerPreset[] = [
  // Professional
  {
    id: 'pro-presenter',
    name: 'Apresentador Pro',
    category: 'professional',
    colorTheme: 'onnplay-orange',
    style: 'classic',
    position: 'bottom-left',
  },
  {
    id: 'pro-corporate',
    name: 'Corporativo',
    category: 'professional',
    colorTheme: 'navy',
    style: 'block',
    position: 'bottom-left',
  },
  {
    id: 'pro-elegant',
    name: 'Elegante',
    category: 'professional',
    colorTheme: 'charcoal',
    style: 'glass',
    position: 'bottom-left',
  },

  // Creative
  {
    id: 'creative-sunset',
    name: 'Pôr do Sol',
    category: 'creative',
    colorTheme: 'sunset',
    style: 'gradient',
    position: 'bottom-left',
  },
  {
    id: 'creative-aurora',
    name: 'Aurora',
    category: 'creative',
    colorTheme: 'aurora',
    style: 'neon',
    position: 'bottom-left',
  },
  {
    id: 'creative-bubble',
    name: 'Bolha Colorida',
    category: 'creative',
    colorTheme: 'pink',
    style: 'bubble',
    position: 'bottom-left',
  },

  // News
  {
    id: 'news-breaking',
    name: 'Breaking News',
    category: 'news',
    colorTheme: 'crimson',
    style: 'sharp',
    position: 'bottom',
  },
  {
    id: 'news-ticker',
    name: 'Ticker de Notícias',
    category: 'news',
    colorTheme: 'royal-blue',
    style: 'classic',
    position: 'bottom',
  },
  {
    id: 'news-headline',
    name: 'Manchete',
    category: 'news',
    colorTheme: 'white',
    style: 'block',
    position: 'top',
  },

  // Gaming
  {
    id: 'gaming-neon',
    name: 'Neon Gamer',
    category: 'gaming',
    colorTheme: 'purple',
    style: 'neon',
    position: 'bottom-left',
  },
  {
    id: 'gaming-fire',
    name: 'Fire',
    category: 'gaming',
    colorTheme: 'fire',
    style: 'gradient',
    position: 'bottom-left',
  },
  {
    id: 'gaming-cyber',
    name: 'Cyber',
    category: 'gaming',
    colorTheme: 'ocean-night',
    style: 'glass',
    position: 'bottom-left',
  },

  // Social
  {
    id: 'social-friendly',
    name: 'Amigável',
    category: 'social',
    colorTheme: 'emerald',
    style: 'bubble',
    position: 'bottom-left',
  },
  {
    id: 'social-minimal',
    name: 'Minimalista',
    category: 'social',
    colorTheme: 'slate',
    style: 'minimal',
    position: 'bottom-left',
  },
  {
    id: 'social-vibrant',
    name: 'Vibrante',
    category: 'social',
    colorTheme: 'rose',
    style: 'block',
    position: 'bottom-left',
  },
];

// ==================== HELPERS ====================

export function getColorTheme(id: string): ColorTheme | undefined {
  return COLOR_THEMES.find(theme => theme.id === id);
}

export function getBannerStyle(id: string): BannerStyle | undefined {
  return BANNER_STYLES.find(style => style.id === id);
}

export function getBannerPreset(id: string): BannerPreset | undefined {
  return BANNER_PRESETS.find(preset => preset.id === id);
}

export function getPresetsByCategory(category: BannerPreset['category']): BannerPreset[] {
  return BANNER_PRESETS.filter(preset => preset.category === category);
}

export function applyPreset(presetId: string): {
  colorTheme: ColorTheme;
  style: BannerStyle;
  position: string;
} | null {
  const preset = getBannerPreset(presetId);
  if (!preset) return null;

  const colorTheme = getColorTheme(preset.colorTheme);
  const style = getBannerStyle(preset.style);

  if (!colorTheme || !style) return null;

  return {
    colorTheme,
    style,
    position: preset.position,
  };
}
