/**
 * AI Studio Assistant Types
 * 
 * Tipos para o operador de IA que entende comandos em linguagem natural
 * e controla o studio durante transmissões ao vivo.
 */

// ============================================================================
// Command Types
// ============================================================================

export type CommandCategory = 
  | 'audio'      // Controle de áudio (volume, mute, etc.)
  | 'camera'     // Controle de câmeras (zoom, pan, ativar/desativar)
  | 'layout'     // Mudança de layouts (PIP, Split, Grid, etc.)
  | 'transition' // Transições (fade, wipe, cut, TAKE)
  | 'comment'    // Gerenciamento de comentários (pin, hide, etc.)
  | 'overlay'    // Overlays (lower thirds, banners, logos)
  | 'broadcast'  // Controle de transmissão (GO LIVE, STOP, etc.)
  | 'recording'  // Controle de gravação (START, STOP, PAUSE)
  | 'general';   // Comandos gerais (help, status, etc.)

export type CommandAction =
  // Audio actions
  | 'increase_volume' | 'decrease_volume' | 'set_volume'
  | 'mute' | 'unmute' | 'toggle_mute'
  | 'adjust_master'
  
  // Camera actions
  | 'zoom_in' | 'zoom_out' | 'set_zoom' | 'reset_zoom'
  | 'pan_left' | 'pan_right' | 'pan_up' | 'pan_down'
  | 'activate_camera' | 'deactivate_camera'
  | 'switch_camera'
  
  // Layout actions
  | 'change_layout' | 'set_single' | 'set_pip' | 'set_split' | 'set_grid'
  
  // Transition actions
  | 'apply_transition' | 'fade' | 'wipe' | 'cut' | 'take'
  
  // Comment actions
  | 'pin_comment' | 'unpin_comment' | 'hide_comment'
  | 'show_comment' | 'auto_show_on' | 'auto_show_off'
  
  // Overlay actions
  | 'show_overlay' | 'hide_overlay' | 'show_lower_third'
  
  // Broadcast actions
  | 'go_live' | 'stop_broadcast' | 'start_recording' | 'stop_recording'
  
  // General actions
  | 'help' | 'status' | 'unknown';

export interface CommandIntent {
  category: CommandCategory;
  action: CommandAction;
  target?: string;           // Alvo do comando (ex: "convidado 2", "CAM 1")
  value?: number | string;   // Valor (ex: volume 80, zoom 2x)
  confidence: number;        // Confiança na interpretação (0-1)
}

export interface ParsedCommand {
  raw: string;               // Comando original
  intent: CommandIntent;     // Intenção interpretada
  params: Record<string, any>; // Parâmetros extraídos
  timestamp: Date;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'success' | 'error';

export interface AIMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  command?: ParsedCommand;   // Comando associado (se for do usuário)
  result?: CommandResult;    // Resultado da execução
}

export interface CommandResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  error?: string;
}

// ============================================================================
// Pattern Matching
// ============================================================================

export interface CommandPattern {
  pattern: RegExp;
  category: CommandCategory;
  action: CommandAction;
  extract?: (match: RegExpMatchArray) => Record<string, any>;
}

// ============================================================================
// AI Config
// ============================================================================

export interface AIAssistantConfig {
  mode: 'pattern' | 'llm' | 'hybrid';  // Modo de parsing
  llmProvider?: 'openai' | 'gemini';   // Provider do LLM (se mode = llm/hybrid)
  llmModel?: string;                    // Modelo do LLM
  fallbackToPattern: boolean;           // Fallback para pattern se LLM falhar
  autoExecute: boolean;                 // Executar comandos automaticamente
  confirmBeforeExecute: boolean;        // Pedir confirmação antes de executar
  maxHistorySize: number;               // Máximo de mensagens no histórico
}

// ============================================================================
// Service State
// ============================================================================

export interface AIAssistantState {
  messages: AIMessage[];
  isProcessing: boolean;
  lastCommand?: ParsedCommand;
  config: AIAssistantConfig;
}

// ============================================================================
// Presets de Comandos
// ============================================================================

export const COMMAND_EXAMPLES = {
  audio: [
    "Aumenta o áudio do convidado 2",
    "Diminui o volume do João",
    "Muta o participante 1",
    "Ajusta master para 80%",
    "Desmuta todos",
  ],
  camera: [
    "Zoom 2x na CAM 1",
    "Reseta zoom da CAM 2",
    "Ativa CAM 3",
    "Desativa screen share",
    "Pan esquerda na câmera 1",
  ],
  layout: [
    "Muda para PIP",
    "Layout grid 2x2",
    "Single screen",
    "Split screen",
  ],
  transition: [
    "Aplica fade",
    "TAKE agora",
    "Transição wipe",
    "Corte direto",
  ],
  comment: [
    "Mostra comentário do João",
    "Esconde comentários",
    "Ativa auto-show",
    "Pin último comentário",
  ],
  overlay: [
    "Mostra lower third do João Silva",
    "Esconde logo",
    "Banner de promoção",
  ],
  broadcast: [
    "GO LIVE",
    "Para transmissão",
    "Inicia gravação",
    "Para gravação",
  ],
};

// ============================================================================
// Helper Types
// ============================================================================

export type CommandHandler = (params: Record<string, any>) => Promise<CommandResult>;

export interface CommandRegistry {
  [key: string]: CommandHandler;
}
