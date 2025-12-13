/**
 * WebSocket Service para OnnPlay Studio
 * Sincroniza estado em tempo real entre múltiplos operadores
 */

export interface StudioState {
  sceneActive: string;
  mixerLevels: { [key: string]: number };
  masterLevel: number;
  isLive: boolean;
  isRecording: boolean;
  isStreaming: boolean;
  selectedCamera: number;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'state-update' | 'take' | 'scene-change' | 'mixer-update' | 'recording-start' | 'recording-stop' | 'streaming-start' | 'streaming-stop' | 'operator-join' | 'operator-leave';
  payload: any;
  operatorId: string;
  timestamp: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private operatorId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;

  constructor(url: string = 'wss://3001-ii69ub1jsmfd0twmxib9p-eddde895.manusvm.computer') {
    this.url = url;
    this.operatorId = `operator-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Conectar ao servidor WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket conectado');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.notifyListeners('connected', { operatorId: this.operatorId });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Erro ao processar mensagem WebSocket:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ Erro WebSocket:', error);
          this.isConnected = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket desconectado');
          this.isConnected = false;
          this.notifyListeners('disconnected', {});
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Tentar reconectar ao servidor
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Tentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay);
    } else {
      console.error('❌ Falha ao reconectar após múltiplas tentativas');
      this.notifyListeners('connection-failed', {});
    }
  }

  /**
   * Enviar mensagem ao servidor
   */
  send(type: WebSocketMessage['type'], payload: any) {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket não conectado');
      return;
    }

    const message: WebSocketMessage = {
      type,
      payload,
      operatorId: this.operatorId,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Processar mensagem recebida
   */
  private handleMessage(message: WebSocketMessage) {
    this.notifyListeners(message.type, message.payload);
  }

  /**
   * Registrar listener para um tipo de evento
   */
  on(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Retornar função para remover listener
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * Notificar todos os listeners de um evento
   */
  private notifyListeners(type: string, data: any) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro ao executar listener para ${type}:`, error);
        }
      });
    }
  }

  /**
   * Notificar TAKE (alternar Preview para Program)
   */
  notifyTake() {
    this.send('take', { action: 'take' });
  }

  /**
   * Notificar mudança de cena
   */
  notifySceneChange(sceneId: string) {
    this.send('scene-change', { sceneId });
  }

  /**
   * Notificar atualização de mixer
   */
  notifyMixerUpdate(channels: { [key: string]: number }, master: number) {
    this.send('mixer-update', { channels, master });
  }

  /**
   * Notificar início de gravação
   */
  notifyRecordingStart() {
    this.send('recording-start', { timestamp: Date.now() });
  }

  /**
   * Notificar parada de gravação
   */
  notifyRecordingStop() {
    this.send('recording-stop', { timestamp: Date.now() });
  }

  /**
   * Notificar início de stream
   */
  notifyStreamingStart() {
    this.send('streaming-start', { timestamp: Date.now() });
  }

  /**
   * Notificar parada de stream
   */
  notifyStreamingStop() {
    this.send('streaming-stop', { timestamp: Date.now() });
  }

  /**
   * Desconectar
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * Verificar se está conectado
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Obter ID do operador
   */
  getOperatorId(): string {
    return this.operatorId;
  }
}

// Exportar instância singleton
export const wsService = new WebSocketService(
  process.env.VITE_WEBSOCKET_URL || 'wss://3001-ii69ub1jsmfd0twmxib9p-eddde895.manusvm.computer'
);
