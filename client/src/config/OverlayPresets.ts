/**
 * OverlayPresets - Molduras/frames decorativos pré-definidos
 * 
 * Overlays são imagens PNG/JPG transparentes que ficam por cima do vídeo,
 * criando molduras temáticas como no StreamYard.
 */

export interface OverlayPreset {
  id: string;
  name: string;
  category: OverlayCategory;
  thumbnail: string;  // URL da miniatura
  imageUrl: string;   // URL da imagem em alta resolução
  isPremium?: boolean;
  hasTransparency?: boolean; // Se true, funciona como moldura (PNG transparente)
}

export type OverlayCategory = 
  | 'none'
  | 'christmas'
  | 'halloween'
  | 'birthday'
  | 'wedding'
  | 'valentines'
  | 'gaming'
  | 'neon'
  | 'news'
  | 'minimal'
  | 'custom';

export const OVERLAY_CATEGORIES: { id: OverlayCategory; name: string; icon: string }[] = [
  { id: 'none', name: 'Nenhum', icon: '🚫' },
  { id: 'christmas', name: 'Natal', icon: '🎄' },
  { id: 'halloween', name: 'Halloween', icon: '🎃' },
  { id: 'birthday', name: 'Aniversário', icon: '🎂' },
  { id: 'wedding', name: 'Casamento', icon: '💒' },
  { id: 'valentines', name: 'Dia dos Namorados', icon: '💕' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'neon', name: 'Neon', icon: '✨' },
  { id: 'news', name: 'Notícias', icon: '📰' },
  { id: 'minimal', name: 'Minimalista', icon: '◻️' },
  { id: 'custom', name: 'Meus Overlays', icon: '📤' },
];

// Overlays pré-definidos com imagens reais
export const OVERLAY_PRESETS: OverlayPreset[] = [
  // ========== NATAL / CHRISTMAS ==========
  {
    id: 'christmas-lights',
    name: 'Luzes de Natal',
    category: 'christmas',
    thumbnail: '/overlays/christmas-lights.jpg',
    imageUrl: '/overlays/christmas-lights.jpg',
  },
  {
    id: 'christmas-candy',
    name: 'Natal Candy',
    category: 'christmas',
    thumbnail: '/overlays/christmas-candy.jpg',
    imageUrl: '/overlays/christmas-candy.jpg',
  },

  // ========== HALLOWEEN ==========
  {
    id: 'halloween-ghost',
    name: 'Halloween Ghost',
    category: 'halloween',
    thumbnail: '/overlays/halloween-ghost.png',
    imageUrl: '/overlays/halloween-ghost.png',
    hasTransparency: true,
  },
  {
    id: 'halloween-bones',
    name: 'Halloween Bones',
    category: 'halloween',
    thumbnail: '/overlays/halloween-bones.png',
    imageUrl: '/overlays/halloween-bones.png',
    hasTransparency: true,
  },

  // ========== ANIVERSÁRIO / BIRTHDAY ==========
  {
    id: 'birthday-balloons',
    name: 'Balões de Aniversário',
    category: 'birthday',
    thumbnail: '/overlays/birthday-balloons.jpg',
    imageUrl: '/overlays/birthday-balloons.jpg',
  },

  // ========== CASAMENTO / WEDDING ==========
  {
    id: 'wedding-frame',
    name: 'Moldura Casamento',
    category: 'wedding',
    thumbnail: '/overlays/wedding-frame.jpg',
    imageUrl: '/overlays/wedding-frame.jpg',
  },
  {
    id: 'wedding-elegant',
    name: 'Casamento Elegante',
    category: 'wedding',
    thumbnail: '/overlays/wedding-elegant.jpg',
    imageUrl: '/overlays/wedding-elegant.jpg',
  },

  // ========== DIA DOS NAMORADOS / VALENTINES ==========
  {
    id: 'valentines-hearts',
    name: 'Corações',
    category: 'valentines',
    thumbnail: '/overlays/valentines-hearts.jpg',
    imageUrl: '/overlays/valentines-hearts.jpg',
  },

  // ========== GAMING ==========
  {
    id: 'gaming-red',
    name: 'Gaming Red',
    category: 'gaming',
    thumbnail: '/overlays/gaming-red.jpg',
    imageUrl: '/overlays/gaming-red.jpg',
  },
  {
    id: 'gaming-blue',
    name: 'Gaming Blue',
    category: 'gaming',
    thumbnail: '/overlays/gaming-blue.jpg',
    imageUrl: '/overlays/gaming-blue.jpg',
  },
  {
    id: 'facecam-cyan',
    name: 'Facecam Cyan',
    category: 'gaming',
    thumbnail: '/overlays/facecam-cyan.jpg',
    imageUrl: '/overlays/facecam-cyan.jpg',
  },
  {
    id: 'facecam-red',
    name: 'Facecam Red',
    category: 'gaming',
    thumbnail: '/overlays/facecam-red.jpg',
    imageUrl: '/overlays/facecam-red.jpg',
  },
  {
    id: 'stream-overlay',
    name: 'Stream Pro',
    category: 'gaming',
    thumbnail: '/overlays/stream-overlay.jpg',
    imageUrl: '/overlays/stream-overlay.jpg',
  },
  {
    id: 'facecam-frame',
    name: 'Facecam Frame',
    category: 'gaming',
    thumbnail: '/overlays/facecam-frame.jpg',
    imageUrl: '/overlays/facecam-frame.jpg',
  },

  // ========== NEON ==========
  {
    id: 'pink-glow-frame',
    name: 'Pink Glow',
    category: 'neon',
    thumbnail: '/overlays/pink-glow-frame.png',
    imageUrl: '/overlays/pink-glow-frame.png',
    hasTransparency: true,
  },
  {
    id: 'neon-frame',
    name: 'Neon Gradient',
    category: 'neon',
    thumbnail: '/overlays/neon-frame.jpg',
    imageUrl: '/overlays/neon-frame.jpg',
  },
  {
    id: 'mint-overlay',
    name: 'Mint Stream',
    category: 'neon',
    thumbnail: '/overlays/mint-overlay.jpg',
    imageUrl: '/overlays/mint-overlay.jpg',
  },

  // ========== NOTÍCIAS / NEWS ==========
  {
    id: 'breaking-news',
    name: 'Breaking News',
    category: 'news',
    thumbnail: '/overlays/breaking-news.png',
    imageUrl: '/overlays/breaking-news.png',
    hasTransparency: true,
  },
  {
    id: 'news-broadcast',
    name: 'News Broadcast',
    category: 'news',
    thumbnail: '/overlays/news-broadcast.png',
    imageUrl: '/overlays/news-broadcast.png',
    hasTransparency: true,
  },

  // ========== MINIMALISTA ==========
  {
    id: 'webcam-overlay',
    name: 'Webcam Clean',
    category: 'minimal',
    thumbnail: '/overlays/webcam-overlay.jpg',
    imageUrl: '/overlays/webcam-overlay.jpg',
  },
];

// Função para obter overlays por categoria
export function getOverlaysByCategory(category: OverlayCategory): OverlayPreset[] {
  if (category === 'none') return [];
  if (category === 'custom') return [];
  return OVERLAY_PRESETS.filter(o => o.category === category);
}

// Função para obter overlay por ID
export function getOverlayById(id: string): OverlayPreset | undefined {
  return OVERLAY_PRESETS.find(o => o.id === id);
}
