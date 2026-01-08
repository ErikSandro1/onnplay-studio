/**
 * ChunkQueue - Fila Local de Chunks com Limite
 * 
 * Implementa a solução do Relatório Técnico Backup24:
 * - Fila local de chunks com limite (2-5MB ou 50 chunks)
 * - Política: drop dos mais antigos quando exceder
 * - Logs determinísticos: queue_len, bytes_pending, chunks_sent/sec
 * 
 * Objetivo: Evitar crescimento infinito de memória e aplicar backpressure local.
 */

interface QueuedChunk {
  data: ArrayBuffer;
  timestamp: number;
  size: number;
}

interface QueueStats {
  queueLength: number;
  bytesPending: number;
  chunksDropped: number;
  chunksSent: number;
  chunksPerSecond: number;
}

export class ChunkQueue {
  private queue: QueuedChunk[] = [];
  private maxQueueSize: number; // bytes
  private maxQueueChunks: number;
  private currentBytes = 0;
  private chunksDropped = 0;
  private chunksSent = 0;
  private lastStatsTime = 0;
  private chunksInLastSecond = 0;

  constructor(maxSizeMB: number = 5, maxChunks: number = 50) {
    this.maxQueueSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    this.maxQueueChunks = maxChunks;
    this.lastStatsTime = Date.now();
  }

  /**
   * Adiciona um chunk à fila
   * Se exceder o limite, dropa os chunks mais antigos (continuidade > qualidade)
   */
  enqueue(data: ArrayBuffer): void {
    const chunk: QueuedChunk = {
      data,
      timestamp: Date.now(),
      size: data.byteLength,
    };

    // Check if we need to drop old chunks
    while (
      (this.currentBytes + chunk.size > this.maxQueueSize ||
        this.queue.length >= this.maxQueueChunks) &&
      this.queue.length > 0
    ) {
      const dropped = this.queue.shift()!;
      this.currentBytes -= dropped.size;
      this.chunksDropped++;
      console.warn(
        `[ChunkQueue] ⚠️ DROPPED old chunk (${(dropped.size / 1024).toFixed(2)} KB) - Queue full`
      );
    }

    // Add new chunk
    this.queue.push(chunk);
    this.currentBytes += chunk.size;
  }

  /**
   * Remove e retorna o próximo chunk da fila
   */
  dequeue(): ArrayBuffer | null {
    if (this.queue.length === 0) {
      return null;
    }

    const chunk = this.queue.shift()!;
    this.currentBytes -= chunk.size;
    this.chunksSent++;
    this.chunksInLastSecond++;

    return chunk.data;
  }

  /**
   * Retorna o tamanho atual da fila
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * Retorna o total de bytes pendentes
   */
  getBytesPending(): number {
    return this.currentBytes;
  }

  /**
   * Retorna estatísticas da fila
   */
  getStats(): QueueStats {
    const now = Date.now();
    const elapsed = (now - this.lastStatsTime) / 1000; // seconds

    let chunksPerSecond = 0;
    if (elapsed >= 1.0) {
      chunksPerSecond = this.chunksInLastSecond / elapsed;
      this.chunksInLastSecond = 0;
      this.lastStatsTime = now;
    }

    return {
      queueLength: this.queue.length,
      bytesPending: this.currentBytes,
      chunksDropped: this.chunksDropped,
      chunksSent: this.chunksSent,
      chunksPerSecond,
    };
  }

  /**
   * Limpa a fila
   */
  clear(): void {
    this.queue = [];
    this.currentBytes = 0;
    console.log('[ChunkQueue] Queue cleared');
  }

  /**
   * Verifica se a fila está cheia (acima de 80% da capacidade)
   */
  isFull(): boolean {
    return (
      this.currentBytes > this.maxQueueSize * 0.8 ||
      this.queue.length > this.maxQueueChunks * 0.8
    );
  }

  /**
   * Verifica se a fila está vazia
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

export default ChunkQueue;
