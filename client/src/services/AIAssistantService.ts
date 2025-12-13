/**
 * AI Studio Assistant Service
 * 
 * Operador de IA que entende comandos em linguagem natural e controla
 * o studio durante transmissões ao vivo.
 * 
 * Suporta dois modos:
 * - Pattern Matching: Regex patterns (grátis, rápido, offline)
 * - LLM: OpenAI/Gemini (inteligente, flexível, requer API key)
 * - Hybrid: Tenta pattern primeiro, fallback para LLM
 */

import type {
  AIMessage,
  AIAssistantConfig,
  AIAssistantState,
  CommandIntent,
  ParsedCommand,
  CommandResult,
  CommandPattern,
  CommandRegistry,
  CommandHandler,
} from '../types/ai-assistant';

type Observer = (state: AIAssistantState) => void;

export class AIAssistantService {
  private static instance: AIAssistantService;
  
  private state: AIAssistantState = {
    messages: [],
    isProcessing: false,
    config: {
      mode: 'pattern', // Começar com pattern matching (grátis)
      fallbackToPattern: true,
      autoExecute: true,
      confirmBeforeExecute: false,
      maxHistorySize: 100,
    },
  };
  
  private observers: Observer[] = [];
  private commandHandlers: CommandRegistry = {};
  
  // Pattern matching rules
  private patterns: CommandPattern[] = [
    // ========================================================================
    // AUDIO COMMANDS
    // ========================================================================
    {
      pattern: /(?:aumenta|sobe|eleva|up)\s+(?:o\s+)?(?:áudio|audio|volume|som)\s+(?:do|da)\s+(.+)/i,
      category: 'audio',
      action: 'increase_volume',
      extract: (match) => ({ target: match[1].trim(), amount: 20 }),
    },
    {
      pattern: /(?:diminui|abaixa|baixa|down)\s+(?:o\s+)?(?:áudio|audio|volume|som)\s+(?:do|da)\s+(.+)/i,
      category: 'audio',
      action: 'decrease_volume',
      extract: (match) => ({ target: match[1].trim(), amount: 20 }),
    },
    {
      pattern: /(?:ajusta|seta|coloca)\s+(?:o\s+)?(?:áudio|audio|volume)\s+(?:do|da)\s+(.+?)\s+(?:para|em|pra)\s+(\d+)/i,
      category: 'audio',
      action: 'set_volume',
      extract: (match) => ({ target: match[1].trim(), value: parseInt(match[2]) }),
    },
    {
      pattern: /(?:muta|silencia|cala)\s+(?:o\s+)?(.+)/i,
      category: 'audio',
      action: 'mute',
      extract: (match) => ({ target: match[1].trim() }),
    },
    {
      pattern: /(?:desmuta|ativa\s+áudio|ativa\s+audio)\s+(?:do|da)?\s*(.+)/i,
      category: 'audio',
      action: 'unmute',
      extract: (match) => ({ target: match[1].trim() }),
    },
    {
      pattern: /(?:ajusta|seta)\s+master\s+(?:para|em|pra)\s+(\d+)/i,
      category: 'audio',
      action: 'adjust_master',
      extract: (match) => ({ value: parseInt(match[1]) }),
    },
    
    // ========================================================================
    // CAMERA COMMANDS
    // ========================================================================
    {
      pattern: /zoom\s+(\d+(?:\.\d+)?)[x×]\s+(?:na|no)\s+(.+)/i,
      category: 'camera',
      action: 'set_zoom',
      extract: (match) => ({ value: parseFloat(match[1]), target: match[2].trim() }),
    },
    {
      pattern: /(?:aumenta|da)\s+zoom\s+(?:na|no)\s+(.+)/i,
      category: 'camera',
      action: 'zoom_in',
      extract: (match) => ({ target: match[1].trim() }),
    },
    {
      pattern: /(?:diminui|reduz)\s+zoom\s+(?:na|no)\s+(.+)/i,
      category: 'camera',
      action: 'zoom_out',
      extract: (match) => ({ target: match[1].trim() }),
    },
    {
      pattern: /(?:reseta|reset|zera)\s+zoom\s+(?:da|do)\s+(.+)/i,
      category: 'camera',
      action: 'reset_zoom',
      extract: (match) => ({ target: match[1].trim() }),
    },
    {
      pattern: /(?:ativa|liga|ativar)\s+(.+)/i,
      category: 'camera',
      action: 'activate_camera',
      extract: (match) => ({ target: match[1].trim() }),
    },
    {
      pattern: /(?:desativa|desliga|desativar)\s+(.+)/i,
      category: 'camera',
      action: 'deactivate_camera',
      extract: (match) => ({ target: match[1].trim() }),
    },
    
    // ========================================================================
    // LAYOUT COMMANDS
    // ========================================================================
    {
      pattern: /(?:muda|troca|altera|vai)\s+(?:para|pra|pro)\s+(?:layout\s+)?pip/i,
      category: 'layout',
      action: 'set_pip',
      extract: () => ({ layout: 'pip' }),
    },
    {
      pattern: /(?:muda|troca|altera|vai)\s+(?:para|pra|pro)\s+(?:layout\s+)?split/i,
      category: 'layout',
      action: 'set_split',
      extract: () => ({ layout: 'split' }),
    },
    {
      pattern: /(?:muda|troca|altera|vai)\s+(?:para|pra|pro)\s+(?:layout\s+)?(?:grid|grade)\s*(?:2x2)?/i,
      category: 'layout',
      action: 'set_grid',
      extract: () => ({ layout: 'grid-2x2' }),
    },
    {
      pattern: /(?:muda|troca|altera|vai)\s+(?:para|pra|pro)\s+(?:layout\s+)?(?:single|único|unico|tela\s+cheia)/i,
      category: 'layout',
      action: 'set_single',
      extract: () => ({ layout: 'single' }),
    },
    
    // ========================================================================
    // TRANSITION COMMANDS
    // ========================================================================
    {
      pattern: /(?:aplica|faz|executa)\s+(?:transição\s+)?fade/i,
      category: 'transition',
      action: 'fade',
      extract: () => ({ type: 'fade' }),
    },
    {
      pattern: /(?:aplica|faz|executa)\s+(?:transição\s+)?wipe/i,
      category: 'transition',
      action: 'wipe',
      extract: () => ({ type: 'wipe' }),
    },
    {
      pattern: /(?:aplica|faz|executa)\s+(?:transição\s+)?(?:cut|corte)/i,
      category: 'transition',
      action: 'cut',
      extract: () => ({ type: 'cut' }),
    },
    {
      pattern: /take(?:\s+agora)?/i,
      category: 'transition',
      action: 'take',
      extract: () => ({}),
    },
    
    // ========================================================================
    // COMMENT COMMANDS
    // ========================================================================
    {
      pattern: /(?:mostra|exibe|pin|fixa)\s+(?:o\s+)?comentário\s+(?:do|da)\s+(.+)/i,
      category: 'comment',
      action: 'pin_comment',
      extract: (match) => ({ author: match[1].trim() }),
    },
    {
      pattern: /(?:esconde|oculta|remove)\s+(?:o\s+)?comentário/i,
      category: 'comment',
      action: 'hide_comment',
      extract: () => ({}),
    },
    {
      pattern: /(?:ativa|liga)\s+auto[\s-]?show/i,
      category: 'comment',
      action: 'auto_show_on',
      extract: () => ({}),
    },
    {
      pattern: /(?:desativa|desliga)\s+auto[\s-]?show/i,
      category: 'comment',
      action: 'auto_show_off',
      extract: () => ({}),
    },
    
    // ========================================================================
    // BROADCAST COMMANDS
    // ========================================================================
    {
      pattern: /(?:go\s+live|vai\s+ao\s+vivo|inicia\s+transmissão)/i,
      category: 'broadcast',
      action: 'go_live',
      extract: () => ({}),
    },
    {
      pattern: /(?:para|stop|encerra)\s+(?:a\s+)?transmissão/i,
      category: 'broadcast',
      action: 'stop_broadcast',
      extract: () => ({}),
    },
    {
      pattern: /(?:inicia|start|começa)\s+(?:a\s+)?gravação/i,
      category: 'broadcast',
      action: 'start_recording',
      extract: () => ({}),
    },
    {
      pattern: /(?:para|stop|encerra)\s+(?:a\s+)?gravação/i,
      category: 'broadcast',
      action: 'stop_recording',
      extract: () => ({}),
    },
  ];
  
  private constructor() {
    this.initializeDefaultHandlers();
  }
  
  static getInstance(): AIAssistantService {
    if (!AIAssistantService.instance) {
      AIAssistantService.instance = new AIAssistantService();
    }
    return AIAssistantService.instance;
  }
  
  // ==========================================================================
  // Public API
  // ==========================================================================
  
  subscribe(observer: Observer): () => void {
    this.observers.push(observer);
    observer(this.state);
    return () => {
      this.observers = this.observers.filter(obs => obs !== observer);
    };
  }
  
  async processCommand(text: string): Promise<CommandResult> {
    // Add user message
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      status: 'pending',
    };
    
    this.addMessage(userMessage);
    this.setState({ isProcessing: true });
    
    try {
      // Parse command
      const parsed = await this.parseCommand(text);
      
      // Update user message with parsed command
      userMessage.command = parsed;
      userMessage.status = 'success';
      this.updateMessage(userMessage);
      
      // Execute command
      const result = await this.executeCommand(parsed);
      
      // Add assistant response
      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        status: result.success ? 'success' : 'error',
        result,
      };
      
      this.addMessage(assistantMessage);
      this.setState({ isProcessing: false, lastCommand: parsed });
      
      return result;
      
    } catch (error) {
      const errorMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date(),
        status: 'error',
      };
      
      this.addMessage(errorMessage);
      this.setState({ isProcessing: false });
      
      return {
        success: false,
        message: 'Não consegui processar esse comando',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
  
  registerHandler(action: string, handler: CommandHandler): void {
    this.commandHandlers[action] = handler;
  }
  
  updateConfig(config: Partial<AIAssistantConfig>): void {
    this.setState({
      config: { ...this.state.config, ...config },
    });
  }
  
  clearHistory(): void {
    this.setState({ messages: [] });
  }
  
  getState(): AIAssistantState {
    return { ...this.state };
  }
  
  // ==========================================================================
  // Private Methods
  // ==========================================================================
  
  private async parseCommand(text: string): Promise<ParsedCommand> {
    const mode = this.state.config.mode;
    
    if (mode === 'pattern' || mode === 'hybrid') {
      const patternResult = this.parseWithPatterns(text);
      if (patternResult) {
        return patternResult;
      }
    }
    
    if (mode === 'llm' || (mode === 'hybrid' && this.state.config.fallbackToPattern)) {
      // TODO: Implement LLM parsing
      // For now, return unknown
    }
    
    // Fallback: unknown command
    return {
      raw: text,
      intent: {
        category: 'general',
        action: 'unknown',
        confidence: 0,
      },
      params: {},
      timestamp: new Date(),
    };
  }
  
  private parseWithPatterns(text: string): ParsedCommand | null {
    for (const pattern of this.patterns) {
      const match = text.match(pattern.pattern);
      if (match) {
        const params = pattern.extract ? pattern.extract(match) : {};
        
        return {
          raw: text,
          intent: {
            category: pattern.category,
            action: pattern.action,
            confidence: 0.9, // High confidence for pattern matching
          },
          params,
          timestamp: new Date(),
        };
      }
    }
    
    return null;
  }
  
  private async executeCommand(parsed: ParsedCommand): Promise<CommandResult> {
    const { action } = parsed.intent;
    const handler = this.commandHandlers[action];
    
    if (!handler) {
      return {
        success: false,
        message: `Comando "${action}" não implementado ainda`,
      };
    }
    
    try {
      return await handler(parsed.params);
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao executar comando',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
  
  private initializeDefaultHandlers(): void {
    // Default handler for unknown commands
    this.registerHandler('unknown', async () => ({
      success: false,
      message: 'Não entendi esse comando. Digite "help" para ver exemplos.',
    }));
    
    // Help command
    this.registerHandler('help', async () => ({
      success: true,
      message: 'Comandos disponíveis:\n\n' +
        '**Áudio:**\n' +
        '- "Aumenta o áudio do convidado 2"\n' +
        '- "Muta o participante 1"\n\n' +
        '**Câmeras:**\n' +
        '- "Zoom 2x na CAM 1"\n' +
        '- "Ativa CAM 3"\n\n' +
        '**Layouts:**\n' +
        '- "Muda para PIP"\n' +
        '- "Layout grid 2x2"\n\n' +
        '**Transições:**\n' +
        '- "Aplica fade"\n' +
        '- "TAKE agora"',
    }));
  }
  
  private addMessage(message: AIMessage): void {
    const messages = [...this.state.messages, message];
    
    // Limit history size
    if (messages.length > this.state.config.maxHistorySize) {
      messages.shift();
    }
    
    this.setState({ messages });
  }
  
  private updateMessage(message: AIMessage): void {
    const messages = this.state.messages.map(msg =>
      msg.id === message.id ? message : msg
    );
    this.setState({ messages });
  }
  
  private setState(partial: Partial<AIAssistantState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyObservers();
  }
  
  private notifyObservers(): void {
    this.observers.forEach(observer => observer(this.state));
  }
}

export const aiAssistantService = AIAssistantService.getInstance();
