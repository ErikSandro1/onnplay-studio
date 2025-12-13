// OnnPlay Studio - Modern Dark Theme
// Design baseado no mockup Modern Dark aprovado

export const theme = {
  colors: {
    // Background
    background: {
      primary: '#0A0E1A',      // Azul escuro profundo
      secondary: '#141B2E',    // Azul escuro médio
      tertiary: '#1E2842',     // Azul escuro claro
      card: '#1A2235',         // Cards e painéis
    },
    
    // Brand Colors
    brand: {
      orange: '#FF6B00',       // Laranja vibrante principal
      orangeHover: '#FF8533',  // Laranja hover
      orangeDark: '#CC5500',   // Laranja escuro
      blue: '#00D9FF',         // Azul neon
      blueHover: '#33E0FF',    // Azul neon hover
      blueDark: '#00A8CC',     // Azul neon escuro
    },
    
    // Status Colors
    status: {
      success: '#00FF88',      // Verde sucesso
      error: '#FF3366',        // Vermelho erro
      warning: '#FFAA00',      // Amarelo aviso
      info: '#00D9FF',         // Azul info
      live: '#00FF88',         // Verde live
      recording: '#FF3366',    // Vermelho gravando
    },
    
    // Text Colors
    text: {
      primary: '#FFFFFF',      // Branco principal
      secondary: '#B8C5D6',    // Cinza claro
      tertiary: '#7A8BA3',     // Cinza médio
      disabled: '#4A5568',     // Cinza escuro
    },
    
    // Border Colors
    border: {
      primary: '#2D3748',      // Borda padrão
      secondary: '#1A202C',    // Borda secundária
      neon: '#00D9FF',         // Borda neon
      orange: '#FF6B00',       // Borda laranja
    },
    
    // Glow Effects
    glow: {
      blue: '0 0 20px rgba(0, 217, 255, 0.5)',
      orange: '0 0 20px rgba(255, 107, 0, 0.5)',
      green: '0 0 20px rgba(0, 255, 136, 0.5)',
      red: '0 0 20px rgba(255, 51, 102, 0.5)',
    },
  },
  
  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  // Border Radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    neon: '0 0 20px rgba(0, 217, 255, 0.3)',
    orange: '0 0 20px rgba(255, 107, 0, 0.3)',
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out',
  },
  
  // Z-Index
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

export type Theme = typeof theme;
