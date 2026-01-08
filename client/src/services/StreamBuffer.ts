/**
 * StreamBuffer - "Capacitor" para streaming suave
 * 
 * Funciona como um buffer que acumula dados antes de enviar,
 * garantindo uma taxa de envio constante mesmo quando os dados
 * chegam de forma irregular.
 * 
 * Conceito:
 * [Dados irregulares] → [BUFFER] → [Dados constantes]
 *      entrada           acumula       saída suave
 */

export interface StreamBufferConfig {
  // Tamanho mínimo do buffer antes de começar a enviar (em bytes)
  minBufferSize: number;
  // Tamanho máximo do buffer (em bytes) - descarta dados antigos se exceder
  maxBufferSize: number;
  // Intervalo de envio em ms (ex: 100ms = 10 envios por segundo)
  sendInterval: number;
  // Tamanho do chunk a enviar por vez (em bytes)
  chunkSize: number;
  // Callback para enviar dados
  onSend: (data: ArrayBuffer) => void;
  // Callback para status/debug
  onStatus?: (status: BufferStatus) => void;
}

export interface BufferStatus {
  bufferSize: number;
  bufferPercent: number;
  isBuffering: boolean;
  bytesSent: number;
  bytesReceived: number;
  sendRate: number; // bytes por segundo
}

export class StreamBuffer {
  private config: StreamBufferConfig;
  private buffer: ArrayBuffer[] = [];
  private bufferSize = 0;
  private isBuffering = true; // Começa em modo buffering
  private sendTimer: NodeJS.Timeout | null = null;
  private bytesSent = 0;
  private bytesReceived = 0;
  private startTime = 0;
  private isRunning = false;

  constructor(config: Partial<StreamBufferConfig> & { onSend: (data: ArrayBuffer) => void }) {
    this.config = {
      minBufferSize: 512 * 1024,  // 512KB antes de começar a enviar
      maxBufferSize: 5 * 1024 * 1024, // 5MB máximo
      sendInterval: 50, // 50ms = 20 envios por segundo
      chunkSize: 32 * 1024, // 32KB por envio
      onStatus: undefined,
      ...config,
    };
  }

  /**
   * Inicia o buffer
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isBuffering = true;
    this.buffer = [];
    this.bufferSize = 0;
    this.bytesSent = 0;
    this.bytesReceived = 0;
    this.startTime = Date.now();

    console.log('[StreamBuffer] 🚀 Started - buffering mode');
    console.log(`[StreamBuffer] Config: minBuffer=${this.config.minBufferSize/1024}KB, maxBuffer=${this.config.maxBufferSize/1024/1024}MB, interval=${this.config.sendInterval}ms`);

    // Inicia o timer de envio
    this.sendTimer = setInterval(() => this.processSend(), this.config.sendInterval);
  }

  /**
   * Para o buffer
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
      this.sendTimer = null;
    }

    // Envia dados restantes no buffer
    this.flush();

    console.log('[StreamBuffer] 🛑 Stopped');
    console.log(`[StreamBuffer] Stats: received=${(this.bytesReceived/1024/1024).toFixed(2)}MB, sent=${(this.bytesSent/1024/1024).toFixed(2)}MB`);
  }

  /**
   * Adiciona dados ao buffer (chamado pelo MediaRecorder)
   */
  push(data: ArrayBuffer): void {
    if (!this.isRunning) return;

    this.buffer.push(data);
    this.bufferSize += data.byteLength;
    this.bytesReceived += data.byteLength;

    // Se excedeu o tamanho máximo, remove dados antigos
    while (this.bufferSize > this.config.maxBufferSize && this.buffer.length > 1) {
      const removed = this.buffer.shift();
      if (removed) {
        this.bufferSize -= removed.byteLength;
        console.warn('[StreamBuffer] ⚠️ Buffer overflow - dropped old data');
      }
    }

    // Verifica se saiu do modo buffering
    if (this.isBuffering && this.bufferSize >= this.config.minBufferSize) {
      this.isBuffering = false;
      console.log('[StreamBuffer] ✅ Buffer filled - starting to send');
    }

    this.reportStatus();
  }

  /**
   * Processa o envio de dados (chamado pelo timer)
   */
  private processSend(): void {
    // Se ainda está em modo buffering, não envia
    if (this.isBuffering) {
      return;
    }

    // Se não tem dados, não faz nada
    if (this.buffer.length === 0 || this.bufferSize === 0) {
      return;
    }

    // Coleta dados para enviar (até chunkSize)
    let toSend: ArrayBuffer[] = [];
    let toSendSize = 0;

    while (this.buffer.length > 0 && toSendSize < this.config.chunkSize) {
      const chunk = this.buffer[0];
      
      if (toSendSize + chunk.byteLength <= this.config.chunkSize) {
        // Chunk inteiro cabe
        toSend.push(this.buffer.shift()!);
        toSendSize += chunk.byteLength;
        this.bufferSize -= chunk.byteLength;
      } else if (toSendSize === 0) {
        // Chunk maior que chunkSize - envia inteiro mesmo assim
        toSend.push(this.buffer.shift()!);
        toSendSize += chunk.byteLength;
        this.bufferSize -= chunk.byteLength;
      } else {
        // Não cabe mais nada
        break;
      }
    }

    if (toSend.length === 0) return;

    // Concatena os chunks em um único ArrayBuffer
    const combined = this.concatenateArrayBuffers(toSend);
    
    // Envia
    try {
      this.config.onSend(combined);
      this.bytesSent += combined.byteLength;
    } catch (error) {
      console.error('[StreamBuffer] Error sending data:', error);
    }

    this.reportStatus();
  }

  /**
   * Envia todos os dados restantes no buffer
   */
  private flush(): void {
    while (this.buffer.length > 0) {
      const chunk = this.buffer.shift()!;
      this.bufferSize -= chunk.byteLength;
      
      try {
        this.config.onSend(chunk);
        this.bytesSent += chunk.byteLength;
      } catch (error) {
        console.error('[StreamBuffer] Error flushing data:', error);
      }
    }
  }

  /**
   * Concatena múltiplos ArrayBuffers em um só
   */
  private concatenateArrayBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const buffer of buffers) {
      result.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    
    return result.buffer;
  }

  /**
   * Reporta status atual do buffer
   */
  private reportStatus(): void {
    if (!this.config.onStatus) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const sendRate = elapsed > 0 ? this.bytesSent / elapsed : 0;

    this.config.onStatus({
      bufferSize: this.bufferSize,
      bufferPercent: (this.bufferSize / this.config.maxBufferSize) * 100,
      isBuffering: this.isBuffering,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      sendRate,
    });
  }

  /**
   * Retorna o status atual
   */
  getStatus(): BufferStatus {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const sendRate = elapsed > 0 ? this.bytesSent / elapsed : 0;

    return {
      bufferSize: this.bufferSize,
      bufferPercent: (this.bufferSize / this.config.maxBufferSize) * 100,
      isBuffering: this.isBuffering,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      sendRate,
    };
  }
}

export default StreamBuffer;
