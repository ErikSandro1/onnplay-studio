/**
 * BackgroundPresets - Configurações pré-definidas de fundos para o stream
 * 
 * Similar ao StreamYard mas com design único do OnnPlay
 */

export type BackgroundType = 'solid' | 'gradient' | 'image' | 'pattern' | 'video';

export interface BackgroundPreset {
  id: string;
  name: string;
  type: BackgroundType;
  category: 'brand' | 'professional' | 'creative' | 'nature' | 'abstract' | 'custom';
  value: string; // CSS value (color, gradient, url, pattern)
  thumbnail?: string; // Preview thumbnail
}

// ==================== CORES SÓLIDAS ====================

export const SOLID_BACKGROUNDS: BackgroundPreset[] = [
  // OnnPlay Brand
  {
    id: 'solid-onnplay-orange',
    name: 'OnnPlay Orange',
    type: 'solid',
    category: 'brand',
    value: '#f97316',
  },
  {
    id: 'solid-onnplay-dark',
    name: 'OnnPlay Dark',
    type: 'solid',
    category: 'brand',
    value: '#1f2937',
  },

  // Professional
  {
    id: 'solid-black',
    name: 'Preto',
    type: 'solid',
    category: 'professional',
    value: '#000000',
  },
  {
    id: 'solid-white',
    name: 'Branco',
    type: 'solid',
    category: 'professional',
    value: '#ffffff',
  },
  {
    id: 'solid-navy',
    name: 'Azul Marinho',
    type: 'solid',
    category: 'professional',
    value: '#1e3a5f',
  },
  {
    id: 'solid-charcoal',
    name: 'Carvão',
    type: 'solid',
    category: 'professional',
    value: '#27272a',
  },
  {
    id: 'solid-slate',
    name: 'Ardósia',
    type: 'solid',
    category: 'professional',
    value: '#475569',
  },

  // Creative
  {
    id: 'solid-blue',
    name: 'Azul',
    type: 'solid',
    category: 'creative',
    value: '#2563eb',
  },
  {
    id: 'solid-green',
    name: 'Verde',
    type: 'solid',
    category: 'creative',
    value: '#16a34a',
  },
  {
    id: 'solid-purple',
    name: 'Roxo',
    type: 'solid',
    category: 'creative',
    value: '#9333ea',
  },
  {
    id: 'solid-pink',
    name: 'Rosa',
    type: 'solid',
    category: 'creative',
    value: '#ec4899',
  },
  {
    id: 'solid-red',
    name: 'Vermelho',
    type: 'solid',
    category: 'creative',
    value: '#dc2626',
  },
  {
    id: 'solid-teal',
    name: 'Turquesa',
    type: 'solid',
    category: 'creative',
    value: '#14b8a6',
  },
  {
    id: 'solid-yellow',
    name: 'Amarelo',
    type: 'solid',
    category: 'creative',
    value: '#eab308',
  },
];

// ==================== GRADIENTES ====================

export const GRADIENT_BACKGROUNDS: BackgroundPreset[] = [
  // OnnPlay Brand Gradients
  {
    id: 'gradient-onnplay-sunset',
    name: 'OnnPlay Sunset',
    type: 'gradient',
    category: 'brand',
    value: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
  },
  {
    id: 'gradient-onnplay-dark',
    name: 'OnnPlay Dark',
    type: 'gradient',
    category: 'brand',
    value: 'linear-gradient(135deg, #1f2937 0%, #111827 50%, #030712 100%)',
  },

  // Professional Gradients
  {
    id: 'gradient-corporate-blue',
    name: 'Corporativo Azul',
    type: 'gradient',
    category: 'professional',
    value: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
  },
  {
    id: 'gradient-elegant-dark',
    name: 'Elegante Escuro',
    type: 'gradient',
    category: 'professional',
    value: 'linear-gradient(180deg, #27272a 0%, #18181b 50%, #09090b 100%)',
  },
  {
    id: 'gradient-subtle-gray',
    name: 'Cinza Sutil',
    type: 'gradient',
    category: 'professional',
    value: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
  },

  // Creative Gradients
  {
    id: 'gradient-aurora',
    name: 'Aurora',
    type: 'gradient',
    category: 'creative',
    value: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)',
  },
  {
    id: 'gradient-sunset',
    name: 'Pôr do Sol',
    type: 'gradient',
    category: 'creative',
    value: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
  },
  {
    id: 'gradient-ocean',
    name: 'Oceano',
    type: 'gradient',
    category: 'creative',
    value: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #7c3aed 100%)',
  },
  {
    id: 'gradient-forest',
    name: 'Floresta',
    type: 'gradient',
    category: 'creative',
    value: 'linear-gradient(135deg, #16a34a 0%, #0d9488 100%)',
  },
  {
    id: 'gradient-fire',
    name: 'Fogo',
    type: 'gradient',
    category: 'creative',
    value: 'linear-gradient(135deg, #ef4444 0%, #f97316 50%, #eab308 100%)',
  },
  {
    id: 'gradient-neon',
    name: 'Neon',
    type: 'gradient',
    category: 'creative',
    value: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%)',
  },
  {
    id: 'gradient-midnight',
    name: 'Meia-Noite',
    type: 'gradient',
    category: 'creative',
    value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
  },

  // Nature Gradients
  {
    id: 'gradient-sky',
    name: 'Céu',
    type: 'gradient',
    category: 'nature',
    value: 'linear-gradient(180deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)',
  },
  {
    id: 'gradient-dawn',
    name: 'Amanhecer',
    type: 'gradient',
    category: 'nature',
    value: 'linear-gradient(180deg, #1e3a5f 0%, #f97316 50%, #fbbf24 100%)',
  },
  {
    id: 'gradient-dusk',
    name: 'Entardecer',
    type: 'gradient',
    category: 'nature',
    value: 'linear-gradient(180deg, #7c3aed 0%, #ec4899 50%, #f97316 100%)',
  },

  // Abstract Gradients
  {
    id: 'gradient-mesh-1',
    name: 'Mesh Colorido',
    type: 'gradient',
    category: 'abstract',
    value: 'radial-gradient(at 40% 20%, #f97316 0px, transparent 50%), radial-gradient(at 80% 0%, #8b5cf6 0px, transparent 50%), radial-gradient(at 0% 50%, #06b6d4 0px, transparent 50%), radial-gradient(at 80% 50%, #ec4899 0px, transparent 50%), radial-gradient(at 0% 100%, #16a34a 0px, transparent 50%), #1f2937',
  },
  {
    id: 'gradient-mesh-2',
    name: 'Mesh Suave',
    type: 'gradient',
    category: 'abstract',
    value: 'radial-gradient(at 0% 0%, #1e3a5f 0px, transparent 50%), radial-gradient(at 100% 0%, #7c3aed 0px, transparent 50%), radial-gradient(at 100% 100%, #0ea5e9 0px, transparent 50%), radial-gradient(at 0% 100%, #06b6d4 0px, transparent 50%), #0f172a',
  },
];

// ==================== PADRÕES ====================

export const PATTERN_BACKGROUNDS: BackgroundPreset[] = [
  {
    id: 'pattern-dots',
    name: 'Pontos',
    type: 'pattern',
    category: 'abstract',
    value: 'radial-gradient(circle, #ffffff10 1px, transparent 1px)',
  },
  {
    id: 'pattern-grid',
    name: 'Grade',
    type: 'pattern',
    category: 'abstract',
    value: 'linear-gradient(#ffffff10 1px, transparent 1px), linear-gradient(90deg, #ffffff10 1px, transparent 1px)',
  },
  {
    id: 'pattern-diagonal',
    name: 'Diagonal',
    type: 'pattern',
    category: 'abstract',
    value: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #ffffff08 10px, #ffffff08 20px)',
  },
  {
    id: 'pattern-waves',
    name: 'Ondas',
    type: 'pattern',
    category: 'abstract',
    value: 'repeating-linear-gradient(0deg, transparent, transparent 20px, #ffffff05 20px, #ffffff05 40px)',
  },
];

// ==================== TODOS OS BACKGROUNDS ====================

export const ALL_BACKGROUNDS: BackgroundPreset[] = [
  ...SOLID_BACKGROUNDS,
  ...GRADIENT_BACKGROUNDS,
  ...PATTERN_BACKGROUNDS,
];

// ==================== HELPERS ====================

export function getBackgroundById(id: string): BackgroundPreset | undefined {
  return ALL_BACKGROUNDS.find(bg => bg.id === id);
}

export function getBackgroundsByCategory(category: BackgroundPreset['category']): BackgroundPreset[] {
  return ALL_BACKGROUNDS.filter(bg => bg.category === category);
}

export function getBackgroundsByType(type: BackgroundType): BackgroundPreset[] {
  return ALL_BACKGROUNDS.filter(bg => bg.type === type);
}

export function getBackgroundCSS(preset: BackgroundPreset): React.CSSProperties {
  if (preset.type === 'solid') {
    return { backgroundColor: preset.value };
  }
  
  if (preset.type === 'gradient' || preset.type === 'pattern') {
    return { background: preset.value };
  }
  
  if (preset.type === 'image') {
    return {
      backgroundImage: `url(${preset.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  
  return {};
}

// Pattern backgrounds need a base color
export function getPatternWithBase(patternId: string, baseColor: string): string {
  const pattern = PATTERN_BACKGROUNDS.find(p => p.id === patternId);
  if (!pattern) return baseColor;
  
  return `${pattern.value}, ${baseColor}`;
}
