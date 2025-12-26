/**
 * CanvasCaptureService - Captura o canvas PROGRAM e prepara para streaming
 * 
 * Este serviço:
 * 1. Captura o canvas do PROGRAM monitor
 * 2. Usa MediaRecorder para codificar em WebM/VP8
 * 3. Envia chunks via WebSocket para o backend
 * 4. O backend converte para RTMP usando FFmpeg
 */

export interface CaptureConfig {
  width: number;
  height: number;
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
}

export interface StreamTarget {
  id: string;
  platform: string;
  rtmpUrl: string;
  streamKey: string;
}

type CaptureStatus = 'idle' | 'capturing' | 'streaming' | 'error';

export class CanvasCaptureService {
  private canvas: HTMLCanvasElement | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private websocket: WebSocket | null = null;
  private status: CaptureStatus = 'idle';
  private listeners: Set<(status: CaptureStatus, error?: string) => void> = new Set();
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  
  private config: CaptureConfig = {
    width: 1920,
    height: 1080,
    frameRate: 30,
    videoBitrate: 4500000, // 4.5 Mbps
    audioBitrate: 128000,  // 128 Kbps
  };

  /**
   * Define o canvas do PROGRAM monitor para captura
   */
  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    console.log('[CanvasCaptureService] Canvas set:', canvas.width, 'x', canvas.height);
  }

  /**
   * Adiciona uma fonte de áudio ao stream
   */
  addAudioSource(audioTrack: MediaStreamTrack) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.audioDestination = this.audioContext.createMediaStreamDestination();
    }

    const source = this.audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
    source.connect(this.audioDestination!);
    console.log('[CanvasCaptureService] Audio source added');
  }

  /**
   * Inicia a captura e streaming para os destinos
   */
  async startStreaming(targets: StreamTarget[]): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas not set. Call setCanvas() first.');
    }

    if (targets.length === 0) {
      throw new Error('No streaming targets configured.');
    }

    this.updateStatus('capturing');

    try {
      // 1. Capturar stream do canvas
      const videoStream = this.canvas.captureStream(this.config.frameRate);
      console.log('[CanvasCaptureService] Canvas stream captured');

      // 2. Combinar vídeo com áudio (se disponível)
      const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
      
      if (this.audioDestination) {
        tracks.push(...this.audioDestination.stream.getAudioTracks());
      } else {
        // Criar áudio silencioso se não houver fonte de áudio
        const silentAudio = this.createSilentAudio();
        if (silentAudio) {
          tracks.push(silentAudio);
        }
      }

      this.mediaStream = new MediaStream(tracks);

      // 3. Conectar ao backend via WebSocket
      await this.connectWebSocket(targets);

      // 4. Iniciar MediaRecorder
      this.startRecording();

      this.updateStatus('streaming');
      console.log('[CanvasCaptureService] Streaming started to', targets.length, 'destinations');

    } catch (error) {
      console.error('[CanvasCaptureService] Error starting stream:', error);
      this.updateStatus('error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Para o streaming
   */
  async stopStreaming(): Promise<void> {
    console.log('[CanvasCaptureService] Stopping stream...');

    // Parar MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Fechar WebSocket
    if (this.websocket) {
      // Enviar comando de stop
      this.websocket.send(JSON.stringify({ type: 'stop' }));
      this.websocket.close();
      this.websocket = null;
    }

    // Parar todas as tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.mediaRecorder = null;
    this.updateStatus('idle');
    console.log('[CanvasCaptureService] Stream stopped');
  }

  /**
   * Conecta ao backend via WebSocket
   */
  private async connectWebSocket(targets: StreamTarget[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // Determinar URL do WebSocket baseado no ambiente
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/stream/ws`;
      
      console.log('[CanvasCaptureService] Connecting to WebSocket:', wsUrl);
      
      this.websocket = new WebSocket(wsUrl);
      this.websocket.binaryType = 'arraybuffer';

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      this.websocket.onopen = () => {
        clearTimeout(timeout);
        console.log('[CanvasCaptureService] WebSocket connected');
        
        // Enviar configuração inicial
        this.websocket!.send(JSON.stringify({
          type: 'start',
          config: this.config,
          targets: targets.map(t => ({
            id: t.id,
            platform: t.platform,
            rtmpUrl: t.rtmpUrl,
            streamKey: t.streamKey,
          })),
        }));

        resolve();
      };

      this.websocket.onerror = (error) => {
        clearTimeout(timeout);
        console.error('[CanvasCaptureService] WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };

      this.websocket.onclose = () => {
        console.log('[CanvasCaptureService] WebSocket closed');
        if (this.status === 'streaming') {
          this.updateStatus('error', 'Connection lost');
        }
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[CanvasCaptureService] Server message:', message);
          
          if (message.type === 'error') {
            this.updateStatus('error', message.error);
          } else if (message.type === 'status') {
            // Atualizar status baseado na resposta do servidor
            console.log('[CanvasCaptureService] Server status:', message.status);
          }
        } catch (e) {
          // Mensagem binária ou não-JSON
        }
      };
    });
  }

  /**
   * Inicia o MediaRecorder para capturar e enviar chunks
   */
  private startRecording() {
    if (!this.mediaStream || !this.websocket) {
      throw new Error('MediaStream or WebSocket not ready');
    }

    // Determinar codec suportado
    const mimeType = this.getSupportedMimeType();
    console.log('[CanvasCaptureService] Using codec:', mimeType);

    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: this.config.videoBitrate,
      audioBitsPerSecond: this.config.audioBitrate,
    };

    this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.websocket?.readyState === WebSocket.OPEN) {
        // Enviar chunk de vídeo para o backend
        this.websocket.send(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[CanvasCaptureService] MediaRecorder error:', event);
      this.updateStatus('error', 'Recording error');
    };

    // Capturar em intervalos de 1 segundo
    this.mediaRecorder.start(1000);
    console.log('[CanvasCaptureService] MediaRecorder started');
  }

  /**
   * Retorna o MIME type suportado pelo navegador
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }

  /**
   * Cria uma track de áudio silencioso
   */
  private createSilentAudio(): MediaStreamTrack | null {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const destination = ctx.createMediaStreamDestination();
      
      gain.gain.value = 0; // Silencioso
      oscillator.connect(gain);
      gain.connect(destination);
      oscillator.start();
      
      return destination.stream.getAudioTracks()[0];
    } catch (e) {
      console.warn('[CanvasCaptureService] Could not create silent audio:', e);
      return null;
    }
  }

  /**
   * Atualiza o status e notifica listeners
   */
  private updateStatus(status: CaptureStatus, error?: string) {
    this.status = status;
    this.listeners.forEach(listener => listener(status, error));
  }

  /**
   * Retorna o status atual
   */
  getStatus(): CaptureStatus {
    return this.status;
  }

  /**
   * Inscreve para receber atualizações de status
   */
  subscribe(listener: (status: CaptureStatus, error?: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Atualiza configuração de captura
   */
  setConfig(config: Partial<CaptureConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Retorna configuração atual
   */
  getConfig(): CaptureConfig {
    return { ...this.config };
  }
}

// Singleton
export const canvasCaptureService = new CanvasCaptureService();
