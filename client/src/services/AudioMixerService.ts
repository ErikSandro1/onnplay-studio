/**
 * AudioMixerService - Serviço de Mixagem de Áudio Profissional
 * 
 * Este serviço gerencia todas as fontes de áudio do OnnPlay Studio,
 * permitindo controle individual de volume, mute, e mixagem para a saída final.
 */

export interface AudioSource {
  id: string;
  name: string;
  type: 'video' | 'camera' | 'mic' | 'screen' | 'participant' | 'music';
  volume: number; // 0-100
  isMuted: boolean;
  isActive: boolean;
  peakLevel: number; // 0-100
  mediaStream?: MediaStream;
  audioElement?: HTMLAudioElement | HTMLVideoElement;
}

export interface AudioMixerConfig {
  masterVolume: number; // 0-100
  masterMuted: boolean;
}

class AudioMixerService {
  private static instance: AudioMixerService;
  
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  
  private sources: Map<string, {
    source: AudioSource;
    sourceNode: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null;
    gainNode: GainNode | null;
    analyserNode: AnalyserNode | null;
  }> = new Map();
  
  private config: AudioMixerConfig = {
    masterVolume: 100,
    masterMuted: false,
  };
  
  private listeners: Set<(sources: AudioSource[]) => void> = new Set();
  private peakLevelInterval: number | null = null;

  private constructor() {}

  public static getInstance(): AudioMixerService {
    if (!AudioMixerService.instance) {
      AudioMixerService.instance = new AudioMixerService();
    }
    return AudioMixerService.instance;
  }

  /**
   * Inicializa o contexto de áudio e os nós de processamento
   */
  public async initialize(): Promise<void> {
    if (this.audioContext) {
      console.log('[AudioMixerService] Already initialized');
      return;
    }

    try {
      this.audioContext = new AudioContext();
      
      // Criar o nó de ganho master
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = this.config.masterVolume / 100;
      
      // Criar o nó de destino para captura do stream mixado
      this.destinationNode = this.audioContext.createMediaStreamDestination();
      
      // Conectar master gain ao destino
      this.masterGainNode.connect(this.destinationNode);
      
      // Também conectar ao destino padrão para monitoramento local
      this.masterGainNode.connect(this.audioContext.destination);
      
      // Iniciar monitoramento de níveis de pico
      this.startPeakLevelMonitoring();
      
      console.log('[AudioMixerService] Initialized successfully');
    } catch (error) {
      console.error('[AudioMixerService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Adiciona uma fonte de áudio ao mixer
   */
  public addSource(source: AudioSource): void {
    if (!this.audioContext || !this.masterGainNode) {
      console.error('[AudioMixerService] Not initialized');
      return;
    }

    // Remover fonte existente com o mesmo ID
    if (this.sources.has(source.id)) {
      this.removeSource(source.id);
    }

    try {
      let sourceNode: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
      
      // Criar o nó de fonte baseado no tipo de entrada
      if (source.mediaStream) {
        const audioTracks = source.mediaStream.getAudioTracks();
        if (audioTracks.length > 0) {
          sourceNode = this.audioContext.createMediaStreamSource(source.mediaStream);
          console.log(`[AudioMixerService] Created MediaStreamSource for ${source.name} with ${audioTracks.length} audio tracks`);
        } else {
          console.log(`[AudioMixerService] No audio tracks in MediaStream for ${source.name}`);
        }
      } else if (source.audioElement) {
        sourceNode = this.audioContext.createMediaElementSource(source.audioElement);
        console.log(`[AudioMixerService] Created MediaElementSource for ${source.name}`);
      }

      // Criar nó de ganho individual
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = source.isMuted ? 0 : source.volume / 100;
      
      // Criar nó de análise para medição de níveis
      const analyserNode = this.audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      
      // Conectar: source -> gain -> analyser -> master
      if (sourceNode) {
        sourceNode.connect(gainNode);
        gainNode.connect(analyserNode);
        analyserNode.connect(this.masterGainNode);
      }
      
      this.sources.set(source.id, {
        source,
        sourceNode,
        gainNode,
        analyserNode,
      });
      
      console.log(`[AudioMixerService] Added source: ${source.name} (${source.type})`);
      this.notifyListeners();
    } catch (error) {
      console.error(`[AudioMixerService] Failed to add source ${source.name}:`, error);
    }
  }

  /**
   * Remove uma fonte de áudio do mixer
   */
  public removeSource(id: string): void {
    const entry = this.sources.get(id);
    if (!entry) return;

    try {
      // Desconectar todos os nós
      if (entry.sourceNode) {
        entry.sourceNode.disconnect();
      }
      if (entry.gainNode) {
        entry.gainNode.disconnect();
      }
      if (entry.analyserNode) {
        entry.analyserNode.disconnect();
      }
      
      this.sources.delete(id);
      console.log(`[AudioMixerService] Removed source: ${entry.source.name}`);
      this.notifyListeners();
    } catch (error) {
      console.error(`[AudioMixerService] Failed to remove source ${id}:`, error);
    }
  }

  /**
   * Atualiza o volume de uma fonte
   */
  public setSourceVolume(id: string, volume: number): void {
    const entry = this.sources.get(id);
    if (!entry || !entry.gainNode) return;

    entry.source.volume = Math.max(0, Math.min(100, volume));
    if (!entry.source.isMuted) {
      entry.gainNode.gain.setValueAtTime(
        entry.source.volume / 100,
        this.audioContext?.currentTime || 0
      );
    }
    
    this.notifyListeners();
  }

  /**
   * Muta/desmuta uma fonte
   */
  public setSourceMuted(id: string, muted: boolean): void {
    const entry = this.sources.get(id);
    if (!entry || !entry.gainNode) return;

    entry.source.isMuted = muted;
    entry.gainNode.gain.setValueAtTime(
      muted ? 0 : entry.source.volume / 100,
      this.audioContext?.currentTime || 0
    );
    
    this.notifyListeners();
  }

  /**
   * Define o volume master
   */
  public setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(100, volume));
    if (this.masterGainNode && !this.config.masterMuted) {
      this.masterGainNode.gain.setValueAtTime(
        this.config.masterVolume / 100,
        this.audioContext?.currentTime || 0
      );
    }
  }

  /**
   * Muta/desmuta o master
   */
  public setMasterMuted(muted: boolean): void {
    this.config.masterMuted = muted;
    if (this.masterGainNode) {
      this.masterGainNode.gain.setValueAtTime(
        muted ? 0 : this.config.masterVolume / 100,
        this.audioContext?.currentTime || 0
      );
    }
  }

  /**
   * Retorna o stream de áudio mixado
   */
  public getMixedAudioStream(): MediaStream | null {
    return this.destinationNode?.stream || null;
  }

  /**
   * Retorna todas as fontes de áudio
   */
  public getSources(): AudioSource[] {
    return Array.from(this.sources.values()).map(entry => entry.source);
  }

  /**
   * Retorna a configuração do mixer
   */
  public getConfig(): AudioMixerConfig {
    return { ...this.config };
  }

  /**
   * Adiciona um listener para mudanças nas fontes
   */
  public addListener(callback: (sources: AudioSource[]) => void): void {
    this.listeners.add(callback);
  }

  /**
   * Remove um listener
   */
  public removeListener(callback: (sources: AudioSource[]) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Notifica todos os listeners sobre mudanças
   */
  private notifyListeners(): void {
    const sources = this.getSources();
    this.listeners.forEach(callback => callback(sources));
  }

  /**
   * Inicia o monitoramento de níveis de pico
   */
  private startPeakLevelMonitoring(): void {
    if (this.peakLevelInterval) return;

    this.peakLevelInterval = window.setInterval(() => {
      this.sources.forEach((entry) => {
        if (entry.analyserNode) {
          const dataArray = new Uint8Array(entry.analyserNode.frequencyBinCount);
          entry.analyserNode.getByteFrequencyData(dataArray);
          
          // Calcular o nível de pico
          const peak = Math.max(...dataArray);
          entry.source.peakLevel = Math.round((peak / 255) * 100);
        }
      });
      
      this.notifyListeners();
    }, 100); // Atualizar a cada 100ms
  }

  /**
   * Para o monitoramento de níveis de pico
   */
  private stopPeakLevelMonitoring(): void {
    if (this.peakLevelInterval) {
      clearInterval(this.peakLevelInterval);
      this.peakLevelInterval = null;
    }
  }

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    this.stopPeakLevelMonitoring();
    
    // Remover todas as fontes
    this.sources.forEach((_, id) => this.removeSource(id));
    
    // Fechar o contexto de áudio
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.masterGainNode = null;
    this.destinationNode = null;
    this.listeners.clear();
    
    console.log('[AudioMixerService] Disposed');
  }
}

export default AudioMixerService;
