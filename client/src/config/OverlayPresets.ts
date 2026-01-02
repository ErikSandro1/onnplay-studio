/**
 * OverlayPresets - Molduras/frames decorativos pré-definidos
 * 
 * Overlays são imagens PNG transparentes que ficam por cima do vídeo,
 * criando molduras temáticas como no StreamYard.
 */

export interface OverlayPreset {
  id: string;
  name: string;
  category: OverlayCategory;
  thumbnail: string;  // URL da miniatura
  imageUrl: string;   // URL da imagem em alta resolução
  isPremium?: boolean;
}

export type OverlayCategory = 
  | 'none'
  | 'holidays'
  | 'social'
  | 'gaming'
  | 'business'
  | 'news'
  | 'podcast'
  | 'custom';

export const OVERLAY_CATEGORIES: { id: OverlayCategory; name: string; icon: string }[] = [
  { id: 'none', name: 'Nenhum', icon: '🚫' },
  { id: 'holidays', name: 'Festivos', icon: '🎄' },
  { id: 'social', name: 'Social', icon: '💬' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'business', name: 'Negócios', icon: '💼' },
  { id: 'news', name: 'Notícias', icon: '📰' },
  { id: 'podcast', name: 'Podcast', icon: '🎙️' },
  { id: 'custom', name: 'Customizado', icon: '✨' },
];

// Overlays pré-definidos (usando SVG inline para não depender de arquivos externos)
// Em produção, esses seriam URLs de imagens PNG reais
export const OVERLAY_PRESETS: OverlayPreset[] = [
  // Festivos / Holidays
  {
    id: 'christmas-lights',
    name: 'Luzes de Natal',
    category: 'holidays',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <circle cx="20" cy="10" r="5" fill="#ff0000"/>
        <circle cx="40" cy="8" r="5" fill="#00ff00"/>
        <circle cx="60" cy="10" r="5" fill="#ffff00"/>
        <circle cx="80" cy="8" r="5" fill="#ff0000"/>
        <circle cx="100" cy="10" r="5" fill="#00ff00"/>
        <circle cx="120" cy="8" r="5" fill="#ffff00"/>
        <circle cx="140" cy="10" r="5" fill="#ff0000"/>
        <circle cx="160" cy="8" r="5" fill="#00ff00"/>
        <circle cx="180" cy="10" r="5" fill="#ffff00"/>
        <path d="M10,10 Q30,20 50,10 Q70,0 90,10 Q110,20 130,10 Q150,0 170,10 Q190,20 200,10" stroke="#228B22" fill="none" stroke-width="2"/>
      </svg>
    `),
    imageUrl: 'christmas-lights',
  },
  {
    id: 'snowflakes',
    name: 'Flocos de Neve',
    category: 'holidays',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <text x="10" y="20" font-size="12" fill="white">❄</text>
        <text x="50" y="15" font-size="10" fill="white">❄</text>
        <text x="90" y="25" font-size="14" fill="white">❄</text>
        <text x="130" y="12" font-size="11" fill="white">❄</text>
        <text x="170" y="22" font-size="13" fill="white">❄</text>
        <text x="30" y="140" font-size="12" fill="white">❄</text>
        <text x="80" y="135" font-size="10" fill="white">❄</text>
        <text x="120" y="142" font-size="14" fill="white">❄</text>
        <text x="160" y="138" font-size="11" fill="white">❄</text>
      </svg>
    `),
    imageUrl: 'snowflakes',
  },
  {
    id: 'new-year',
    name: 'Ano Novo',
    category: 'holidays',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <text x="10" y="20" font-size="10" fill="gold">✨</text>
        <text x="50" y="15" font-size="12" fill="gold">🎆</text>
        <text x="100" y="20" font-size="14" fill="gold">🎉</text>
        <text x="150" y="15" font-size="12" fill="gold">🎆</text>
        <text x="180" y="20" font-size="10" fill="gold">✨</text>
        <text x="30" y="140" font-size="10" fill="gold">✨</text>
        <text x="80" y="135" font-size="12" fill="gold">🥂</text>
        <text x="120" y="140" font-size="10" fill="gold">✨</text>
        <text x="160" y="135" font-size="12" fill="gold">🎊</text>
      </svg>
    `),
    imageUrl: 'new-year',
  },

  // Social
  {
    id: 'like-subscribe',
    name: 'Like & Subscribe',
    category: 'social',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <rect x="5" y="120" width="60" height="25" rx="5" fill="#ff0000"/>
        <text x="15" y="137" font-size="10" fill="white" font-weight="bold">INSCREVA</text>
        <rect x="135" y="120" width="60" height="25" rx="5" fill="#065fd4"/>
        <text x="155" y="137" font-size="10" fill="white" font-weight="bold">👍</text>
      </svg>
    `),
    imageUrl: 'like-subscribe',
  },
  {
    id: 'social-icons',
    name: 'Ícones Sociais',
    category: 'social',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <circle cx="15" cy="75" r="10" fill="#1877f2"/>
        <circle cx="15" cy="100" r="10" fill="#e4405f"/>
        <circle cx="15" cy="125" r="10" fill="#1da1f2"/>
        <text x="10" y="79" font-size="10" fill="white">f</text>
        <text x="10" y="104" font-size="10" fill="white">📷</text>
        <text x="10" y="129" font-size="10" fill="white">𝕏</text>
      </svg>
    `),
    imageUrl: 'social-icons',
  },

  // Gaming
  {
    id: 'neon-frame',
    name: 'Moldura Neon',
    category: 'gaming',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#0a0a0a" width="200" height="150"/>
        <rect x="5" y="5" width="190" height="140" fill="none" stroke="#00ffff" stroke-width="3"/>
        <rect x="10" y="10" width="180" height="130" fill="none" stroke="#ff00ff" stroke-width="2"/>
      </svg>
    `),
    imageUrl: 'neon-frame',
  },
  {
    id: 'gaming-hud',
    name: 'Gaming HUD',
    category: 'gaming',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#0a0a0a" width="200" height="150"/>
        <polygon points="0,0 30,0 20,20 0,20" fill="#ff0000" opacity="0.8"/>
        <polygon points="200,0 170,0 180,20 200,20" fill="#ff0000" opacity="0.8"/>
        <polygon points="0,150 30,150 20,130 0,130" fill="#00ff00" opacity="0.8"/>
        <polygon points="200,150 170,150 180,130 200,130" fill="#00ff00" opacity="0.8"/>
        <rect x="70" y="5" width="60" height="15" rx="3" fill="#333"/>
        <text x="85" y="15" font-size="8" fill="#0f0">LIVE</text>
      </svg>
    `),
    imageUrl: 'gaming-hud',
  },
  {
    id: 'cyber-frame',
    name: 'Cyber Frame',
    category: 'gaming',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#0a0a0a" width="200" height="150"/>
        <path d="M0,20 L20,0 L180,0 L200,20 L200,130 L180,150 L20,150 L0,130 Z" fill="none" stroke="#00ffff" stroke-width="2"/>
        <path d="M5,25 L25,5 L175,5 L195,25" fill="none" stroke="#ff00ff" stroke-width="1"/>
        <path d="M5,125 L25,145 L175,145 L195,125" fill="none" stroke="#ff00ff" stroke-width="1"/>
      </svg>
    `),
    imageUrl: 'cyber-frame',
  },

  // Business
  {
    id: 'corporate-clean',
    name: 'Corporativo Clean',
    category: 'business',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <rect x="0" y="0" width="200" height="5" fill="#f97316"/>
        <rect x="0" y="145" width="200" height="5" fill="#f97316"/>
        <rect x="0" y="0" width="5" height="150" fill="#f97316" opacity="0.5"/>
        <rect x="195" y="0" width="5" height="150" fill="#f97316" opacity="0.5"/>
      </svg>
    `),
    imageUrl: 'corporate-clean',
  },
  {
    id: 'professional-frame',
    name: 'Moldura Profissional',
    category: 'business',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <rect x="0" y="0" width="200" height="3" fill="#2563eb"/>
        <rect x="0" y="147" width="200" height="3" fill="#2563eb"/>
        <rect x="0" y="130" width="80" height="20" fill="#2563eb" opacity="0.9"/>
        <text x="10" y="144" font-size="10" fill="white" font-weight="bold">EMPRESA</text>
      </svg>
    `),
    imageUrl: 'professional-frame',
  },

  // News
  {
    id: 'breaking-news',
    name: 'Breaking News',
    category: 'news',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <rect x="0" y="0" width="200" height="25" fill="#cc0000"/>
        <text x="10" y="17" font-size="12" fill="white" font-weight="bold">BREAKING NEWS</text>
        <rect x="0" y="125" width="200" height="25" fill="#cc0000"/>
        <rect x="0" y="130" width="200" height="15" fill="#222"/>
      </svg>
    `),
    imageUrl: 'breaking-news',
  },
  {
    id: 'news-ticker',
    name: 'News Ticker',
    category: 'news',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <rect x="0" y="130" width="200" height="20" fill="#1a1a2e"/>
        <rect x="0" y="130" width="50" height="20" fill="#cc0000"/>
        <text x="5" y="144" font-size="10" fill="white" font-weight="bold">AO VIVO</text>
        <rect x="50" y="130" width="150" height="20" fill="#222"/>
      </svg>
    `),
    imageUrl: 'news-ticker',
  },

  // Podcast
  {
    id: 'podcast-wave',
    name: 'Podcast Wave',
    category: 'podcast',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <rect x="10" y="135" width="3" height="10" fill="#f97316"/>
        <rect x="16" y="130" width="3" height="15" fill="#f97316"/>
        <rect x="22" y="125" width="3" height="20" fill="#f97316"/>
        <rect x="28" y="130" width="3" height="15" fill="#f97316"/>
        <rect x="34" y="135" width="3" height="10" fill="#f97316"/>
        <rect x="40" y="128" width="3" height="17" fill="#f97316"/>
        <rect x="46" y="132" width="3" height="13" fill="#f97316"/>
        <text x="60" y="143" font-size="10" fill="#f97316">🎙️ PODCAST</text>
      </svg>
    `),
    imageUrl: 'podcast-wave',
  },
  {
    id: 'microphone-frame',
    name: 'Moldura Microfone',
    category: 'podcast',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
        <rect fill="#1a1a2e" width="200" height="150"/>
        <circle cx="15" cy="15" r="10" fill="#333"/>
        <text x="10" y="19" font-size="10">🎙️</text>
        <rect x="0" y="0" width="200" height="3" fill="#9333ea"/>
        <rect x="0" y="147" width="200" height="3" fill="#9333ea"/>
      </svg>
    `),
    imageUrl: 'microphone-frame',
  },
];

// Função para obter overlays por categoria
export function getOverlaysByCategory(category: OverlayCategory): OverlayPreset[] {
  if (category === 'none') return [];
  return OVERLAY_PRESETS.filter(o => o.category === category);
}

// Função para obter overlay por ID
export function getOverlayById(id: string): OverlayPreset | undefined {
  return OVERLAY_PRESETS.find(o => o.id === id);
}
