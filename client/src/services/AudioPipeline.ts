/**
 * AudioPipeline - Pipeline de Áudio Profissional
 * 
 * OnnPlay Studio - A Melhor Plataforma de Streaming do Mundo
 * Primeiro Estúdio 100% Criado por IA
 * 
 * Este é o coração do sistema de áudio. Funciona completamente independente
 * do pipeline de vídeo, garantindo:
 * - Zero travamentos
 * - Sincronização perfeita
 * - Controle profissional de múltiplas fontes
 * - Performance superior a OBS, StreamYard e vMix
 * 
 * Arquitetura:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     AUDIO PIPELINE                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
 * │  │ Video   │  │ Music   │  │  Mic    │  │ System  │       │
 * │  │ Audio   │  │ Track   │  │         │  │ Audio   │       │
 * │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
 * │       │            │            │            │             │
 * │       ▼            ▼            ▼            ▼             │
 * │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
 * │  │GainNode │  │GainNode │  │GainNode │  │GainNode │       │
 * │  │(Volume) │  │(Volume) │  │(Volume) │  │(Volume) │       │
 * │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
 * │       │            │            │            │             │
 * │       └────────────┴─────┬──────┴────────────┘             │
 * │                          │                                 │
 * │                          ▼                                 │
 * │                   ┌─────────────┐                         │
 * │                   │ Master Gain │                         │
 * │                   └──────┬──────┘                         │
 * │                          │                                 │
 * │            ┌─────────────┼─────────────┐                  │
 * │            ▼             ▼             ▼                  │
 * │     ┌──────────┐  ┌──────────┐  ┌──────────┐             │
 * │     │ Monitor  │  │ Analyser │  │  Output  │             │
 * │     │ (Local)  │  │(VU Meter)│  │ (Stream) │             │
 * │     └──────────┘  └──────────┘  └──────────┘             │
 * └─────────────────────────────────────────────────────────────┘
 */

export interface AudioChannel {
  id: string;
  name: string;
  type: 'video' | 'music' | 'microphone' | 'system' | 'silence';
  sourceNode: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | OscillatorNode | null;
  gainNode: GainNode;
  analyserNode: AnalyserNode;
  pannerNode: StereoPannerNode;
  volume: number;        // 0.0 - 1.0
  pan: number;           // -1.0 (left) to 1.0 (right)
  muted: boolean;
  solo: boolean;
  level: number;         // Current audio level (0.0 - 1.0)
  element?: HTMLVideoElement | HTMLAudioElement;
}

export interface AudioPipelineStats {
  isActive: boolean;
  channelCount: number;
  sampleRate: number;
  masterVolume: number;
  masterMuted: boolean;
  latency: number;
}

type ChannelCallback = (channels: AudioChannel[]) => void;
type LevelCallback = (levels: Map<string, number>) => void;
type StatsCallback = (stats: AudioPipelineStats) => void;

class AudioPipeline {
  // Core Audio Nodes
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private outputDestination: MediaStreamAudioDestinationNode | null = null;
  private monitorDestination: AudioNode | null = null;
  
  // Channels
  private channels: Map<string, AudioChannel> = new Map();
  private silenceChannel: AudioChannel | null = null;
  
  // State
  private isActive: boolean = false;
  private masterVolume: number = 1.0;
  private masterMuted: boolean = false;
  private soloChannels: Set<string> = new Set();
  
  // Monitoring
  private levelMonitorId: number | null = null;
  private levelUpdateRate: number = 60; // 60 FPS for smooth VU meters
  
  // Callbacks
  private channelCallbacks: Set<ChannelCallback> = new Set();
  private levelCallbacks: Set<LevelCallback> = new Set();
  private statsCallbacks: Set<StatsCallback> = new Set();

  /**
   * Inicializa o pipeline de áudio
   * DEVE ser chamado após interação do usuário (click) devido a políticas de autoplay
   */
  async initialize(): Promise<void> {
    if (this.isActive) {
      console.log('[AudioPipeline] Already active');
      return;
    }

    console.log('[AudioPipeline] ╔════════════════════════════════════════════╗');
    console.log('[AudioPipeline] ║     INITIALIZING PROFESSIONAL AUDIO       ║');
    console.log('[AudioPipeline] ║         PIPELINE - OnnPlay Studio         ║');
    console.log('[AudioPipeline] ╚════════════════════════════════════════════╝');

    try {
      // Criar AudioContext com configurações profissionais
      this.context = new AudioContext({
        sampleRate: 48000,        // Padrão broadcast
        latencyHint: 'interactive' // Baixa latência
      });

      // Aguardar contexto estar pronto
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      // Criar nó de destino para output (vai para o stream)
      this.outputDestination = this.context.createMediaStreamDestination();

      // Criar analyser master para VU meter geral
      this.masterAnalyser = this.context.createAnalyser();
      this.masterAnalyser.fftSize = 2048;
      this.masterAnalyser.smoothingTimeConstant = 0.8;

      // Criar master gain
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.masterVolume;

      // Conectar: masterGain -> masterAnalyser -> outputDestination
      this.masterGain.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.outputDestination);

      // Também conectar ao destino local para monitoramento
      this.monitorDestination = this.context.destination;
      this.masterGain.connect(this.monitorDestination);

      // Criar canal de silêncio (mantém o stream ativo mesmo sem fontes)
      await this.createSilenceChannel();

      // Iniciar monitoramento de níveis
      this.startLevelMonitoring();

      this.isActive = true;

      console.log('[AudioPipeline] ✅ Sample Rate:', this.context.sampleRate, 'Hz');
      console.log('[AudioPipeline] ✅ Base Latency:', (this.context.baseLatency * 1000).toFixed(2), 'ms');
      console.log('[AudioPipeline] ✅ Output Latency:', (this.context.outputLatency * 1000).toFixed(2), 'ms');
      console.log('[AudioPipeline] ════════════════════════════════════════════');
      console.log('[AudioPipeline] ✅ AUDIO PIPELINE READY');

      this.notifyStats();

    } catch (error) {
      console.error('[AudioPipeline] ❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Cria canal de silêncio para manter o stream estável
   */
  private async createSilenceChannel(): Promise<void> {
    if (!this.context || !this.masterGain) return;

    const oscillator = this.context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 0; // DC offset, inaudível

    const gainNode = this.context.createGain();
    gainNode.gain.value = 0.00001; // Praticamente silencioso

    const analyserNode = this.context.createAnalyser();
    analyserNode.fftSize = 256;

    const pannerNode = this.context.createStereoPanner();
    pannerNode.pan.value = 0;

    // Conectar: oscillator -> gain -> panner -> master
    oscillator.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(this.masterGain);
    
    oscillator.start();

    this.silenceChannel = {
      id: '__silence__',
      name: 'Silence Generator',
      type: 'silence',
      sourceNode: oscillator,
      gainNode,
      analyserNode,
      pannerNode,
      volume: 0.00001,
      pan: 0,
      muted: false,
      solo: false,
      level: 0,
    };

    console.log('[AudioPipeline] ✅ Silence channel created');
  }

  /**
   * Adiciona áudio de um vídeo ao pipeline
   */
  addVideoAudio(videoElement: HTMLVideoElement, name: string): AudioChannel | null {
    if (!this.context || !this.masterGain) {
      console.error('[AudioPipeline] Not initialized');
      return null;
    }

    // Gerar ID único
    const id = `video-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    try {
      // Verificar se já existe uma fonte para este vídeo
      let sourceNode: MediaElementAudioSourceNode;
      
      if ((videoElement as any).__audioPipelineSource) {
        sourceNode = (videoElement as any).__audioPipelineSource;
        console.log('[AudioPipeline] Reusing existing source for:', name);
      } else {
        // Garantir que o vídeo não está mudo para capturar áudio
        videoElement.muted = false;
        videoElement.volume = 1.0;
        
        sourceNode = this.context.createMediaElementSource(videoElement);
        (videoElement as any).__audioPipelineSource = sourceNode;
        console.log('[AudioPipeline] Created new source for:', name);
      }

      // Criar nós de processamento
      const gainNode = this.context.createGain();
      gainNode.gain.value = 1.0;

      const analyserNode = this.context.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;

      const pannerNode = this.context.createStereoPanner();
      pannerNode.pan.value = 0;

      // Conectar cadeia: source -> gain -> analyser -> panner -> master
      sourceNode.connect(gainNode);
      gainNode.connect(analyserNode);
      analyserNode.connect(pannerNode);
      pannerNode.connect(this.masterGain);

      // Também conectar ao monitor local (para ouvir no Studio)
      if (this.monitorDestination) {
        sourceNode.connect(this.monitorDestination);
      }

      const channel: AudioChannel = {
        id,
        name,
        type: 'video',
        sourceNode,
        gainNode,
        analyserNode,
        pannerNode,
        volume: 1.0,
        pan: 0,
        muted: false,
        solo: false,
        level: 0,
        element: videoElement,
      };

      this.channels.set(id, channel);
      this.updateSoloState();
      this.notifyChannels();

      console.log('[AudioPipeline] ✅ Video audio added:', name, '(ID:', id, ')');
      return channel;

    } catch (error) {
      console.error('[AudioPipeline] ❌ Error adding video audio:', error);
      return null;
    }
  }

  /**
   * Adiciona música ao pipeline
   */
  addMusic(audioElement: HTMLAudioElement, name: string): AudioChannel | null {
    if (!this.context || !this.masterGain) {
      console.error('[AudioPipeline] Not initialized');
      return null;
    }

    const id = `music-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    try {
      let sourceNode: MediaElementAudioSourceNode;
      
      if ((audioElement as any).__audioPipelineSource) {
        sourceNode = (audioElement as any).__audioPipelineSource;
      } else {
        sourceNode = this.context.createMediaElementSource(audioElement);
        (audioElement as any).__audioPipelineSource = sourceNode;
      }

      const gainNode = this.context.createGain();
      gainNode.gain.value = 0.5; // Música mais baixa por padrão

      const analyserNode = this.context.createAnalyser();
      analyserNode.fftSize = 256;

      const pannerNode = this.context.createStereoPanner();
      pannerNode.pan.value = 0;

      sourceNode.connect(gainNode);
      gainNode.connect(analyserNode);
      analyserNode.connect(pannerNode);
      pannerNode.connect(this.masterGain);

      if (this.monitorDestination) {
        sourceNode.connect(this.monitorDestination);
      }

      const channel: AudioChannel = {
        id,
        name,
        type: 'music',
        sourceNode,
        gainNode,
        analyserNode,
        pannerNode,
        volume: 0.5,
        pan: 0,
        muted: false,
        solo: false,
        level: 0,
        element: audioElement,
      };

      this.channels.set(id, channel);
      this.updateSoloState();
      this.notifyChannels();

      console.log('[AudioPipeline] ✅ Music added:', name);
      return channel;

    } catch (error) {
      console.error('[AudioPipeline] ❌ Error adding music:', error);
      return null;
    }
  }

  /**
   * Adiciona microfone ao pipeline
   */
  async addMicrophone(deviceId?: string): Promise<AudioChannel | null> {
    if (!this.context || !this.masterGain) {
      console.error('[AudioPipeline] Not initialized');
      return null;
    }

    const id = `mic-${Date.now()}`;

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const sourceNode = this.context.createMediaStreamSource(stream);

      const gainNode = this.context.createGain();
      gainNode.gain.value = 1.0;

      const analyserNode = this.context.createAnalyser();
      analyserNode.fftSize = 256;

      const pannerNode = this.context.createStereoPanner();
      pannerNode.pan.value = 0;

      sourceNode.connect(gainNode);
      gainNode.connect(analyserNode);
      analyserNode.connect(pannerNode);
      pannerNode.connect(this.masterGain);

      // NÃO conectar microfone ao monitor local para evitar feedback

      const channel: AudioChannel = {
        id,
        name: 'Microphone',
        type: 'microphone',
        sourceNode,
        gainNode,
        analyserNode,
        pannerNode,
        volume: 1.0,
        pan: 0,
        muted: false,
        solo: false,
        level: 0,
      };

      this.channels.set(id, channel);
      this.updateSoloState();
      this.notifyChannels();

      console.log('[AudioPipeline] ✅ Microphone added');
      return channel;

    } catch (error) {
      console.error('[AudioPipeline] ❌ Error adding microphone:', error);
      return null;
    }
  }

  /**
   * Remove um canal do pipeline
   */
  removeChannel(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    try {
      // Desconectar nós
      channel.gainNode.disconnect();
      channel.analyserNode.disconnect();
      channel.pannerNode.disconnect();
      
      // Não desconectar sourceNode de vídeo/música (pode ser reutilizado)
      if (channel.type === 'microphone' && channel.sourceNode) {
        channel.sourceNode.disconnect();
      }
    } catch (e) {
      // Ignorar erros de desconexão
    }

    this.channels.delete(channelId);
    this.soloChannels.delete(channelId);
    this.updateSoloState();
    this.notifyChannels();

    console.log('[AudioPipeline] Channel removed:', channelId);
  }

  /**
   * Define o volume de um canal (0.0 - 1.0)
   */
  setChannelVolume(channelId: string, volume: number): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    channel.volume = clampedVolume;

    if (!channel.muted && this.isChannelAudible(channelId)) {
      channel.gainNode.gain.setTargetAtTime(
        clampedVolume,
        this.context?.currentTime || 0,
        0.01 // Smooth transition
      );
    }

    this.notifyChannels();
  }

  /**
   * Define o pan de um canal (-1.0 left, 0 center, 1.0 right)
   */
  setChannelPan(channelId: string, pan: number): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    const clampedPan = Math.max(-1, Math.min(1, pan));
    channel.pan = clampedPan;
    channel.pannerNode.pan.setTargetAtTime(
      clampedPan,
      this.context?.currentTime || 0,
      0.01
    );

    this.notifyChannels();
  }

  /**
   * Muta/desmuta um canal
   */
  setChannelMute(channelId: string, muted: boolean): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    channel.muted = muted;
    this.updateChannelGain(channel);
    this.notifyChannels();
  }

  /**
   * Solo um canal (muta todos os outros)
   */
  setChannelSolo(channelId: string, solo: boolean): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    channel.solo = solo;
    
    if (solo) {
      this.soloChannels.add(channelId);
    } else {
      this.soloChannels.delete(channelId);
    }

    this.updateSoloState();
    this.notifyChannels();
  }

  /**
   * Define o volume master (0.0 - 1.0)
   */
  setMasterVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterVolume = clampedVolume;

    if (this.masterGain && !this.masterMuted) {
      this.masterGain.gain.setTargetAtTime(
        clampedVolume,
        this.context?.currentTime || 0,
        0.01
      );
    }

    this.notifyStats();
  }

  /**
   * Muta/desmuta o master
   */
  setMasterMute(muted: boolean): void {
    this.masterMuted = muted;

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : this.masterVolume,
        this.context?.currentTime || 0,
        0.01
      );
    }

    this.notifyStats();
  }

  /**
   * Retorna o track de áudio para o stream de saída
   */
  getOutputTrack(): MediaStreamTrack | null {
    if (!this.outputDestination) return null;
    const tracks = this.outputDestination.stream.getAudioTracks();
    return tracks.length > 0 ? tracks[0] : null;
  }

  /**
   * Retorna o MediaStream de áudio
   */
  getOutputStream(): MediaStream | null {
    return this.outputDestination?.stream || null;
  }

  /**
   * Retorna todos os canais (exceto silêncio)
   */
  getChannels(): AudioChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Retorna estatísticas do pipeline
   */
  getStats(): AudioPipelineStats {
    return {
      isActive: this.isActive,
      channelCount: this.channels.size,
      sampleRate: this.context?.sampleRate || 0,
      masterVolume: this.masterVolume,
      masterMuted: this.masterMuted,
      latency: (this.context?.baseLatency || 0) * 1000,
    };
  }

  /**
   * Verifica se um canal está audível (considerando solo)
   */
  private isChannelAudible(channelId: string): boolean {
    if (this.soloChannels.size === 0) return true;
    return this.soloChannels.has(channelId);
  }

  /**
   * Atualiza o gain de um canal baseado em mute e solo
   */
  private updateChannelGain(channel: AudioChannel): void {
    const shouldBeAudible = !channel.muted && this.isChannelAudible(channel.id);
    const targetGain = shouldBeAudible ? channel.volume : 0;

    channel.gainNode.gain.setTargetAtTime(
      targetGain,
      this.context?.currentTime || 0,
      0.01
    );
  }

  /**
   * Atualiza o estado de solo de todos os canais
   */
  private updateSoloState(): void {
    this.channels.forEach(channel => {
      this.updateChannelGain(channel);
    });
  }

  /**
   * Inicia monitoramento de níveis de áudio
   */
  private startLevelMonitoring(): void {
    const updateLevels = () => {
      if (!this.isActive) return;

      const levels = new Map<string, number>();

      this.channels.forEach((channel, id) => {
        const dataArray = new Uint8Array(channel.analyserNode.frequencyBinCount);
        channel.analyserNode.getByteFrequencyData(dataArray);

        // Calcular RMS para nível mais preciso
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        // Aplicar curva logarítmica para melhor visualização
        const level = Math.min(1, rms * 2);
        channel.level = level;
        levels.set(id, level);
      });

      // Nível master
      if (this.masterAnalyser) {
        const dataArray = new Uint8Array(this.masterAnalyser.frequencyBinCount);
        this.masterAnalyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        levels.set('master', Math.min(1, rms * 2));
      }

      this.notifyLevels(levels);
      this.levelMonitorId = requestAnimationFrame(updateLevels);
    };

    this.levelMonitorId = requestAnimationFrame(updateLevels);
  }

  /**
   * Para monitoramento de níveis
   */
  private stopLevelMonitoring(): void {
    if (this.levelMonitorId !== null) {
      cancelAnimationFrame(this.levelMonitorId);
      this.levelMonitorId = null;
    }
  }

  // ==================== CALLBACKS ====================

  subscribeChannels(callback: ChannelCallback): () => void {
    this.channelCallbacks.add(callback);
    callback(this.getChannels());
    return () => this.channelCallbacks.delete(callback);
  }

  subscribeLevels(callback: LevelCallback): () => void {
    this.levelCallbacks.add(callback);
    return () => this.levelCallbacks.delete(callback);
  }

  subscribeStats(callback: StatsCallback): () => void {
    this.statsCallbacks.add(callback);
    callback(this.getStats());
    return () => this.statsCallbacks.delete(callback);
  }

  private notifyChannels(): void {
    const channels = this.getChannels();
    this.channelCallbacks.forEach(cb => cb(channels));
  }

  private notifyLevels(levels: Map<string, number>): void {
    this.levelCallbacks.forEach(cb => cb(levels));
  }

  private notifyStats(): void {
    const stats = this.getStats();
    this.statsCallbacks.forEach(cb => cb(stats));
  }

  // ==================== CLEANUP ====================

  /**
   * Limpa todos os recursos do pipeline
   */
  async cleanup(): Promise<void> {
    console.log('[AudioPipeline] Cleaning up...');

    this.stopLevelMonitoring();

    // Remover todos os canais
    this.channels.forEach((channel, id) => {
      try {
        channel.gainNode.disconnect();
        channel.analyserNode.disconnect();
        channel.pannerNode.disconnect();
      } catch (e) {}
    });
    this.channels.clear();

    // Parar silêncio
    if (this.silenceChannel?.sourceNode instanceof OscillatorNode) {
      try {
        this.silenceChannel.sourceNode.stop();
        this.silenceChannel.sourceNode.disconnect();
      } catch (e) {}
    }
    this.silenceChannel = null;

    // Fechar contexto
    if (this.context) {
      try {
        await this.context.close();
      } catch (e) {}
      this.context = null;
    }

    this.masterGain = null;
    this.masterAnalyser = null;
    this.outputDestination = null;
    this.monitorDestination = null;
    this.soloChannels.clear();
    this.isActive = false;

    console.log('[AudioPipeline] ✅ Cleanup complete');
  }

  /**
   * Verifica se o pipeline está ativo
   */
  isReady(): boolean {
    return this.isActive;
  }
}

// Singleton export
export const audioPipeline = new AudioPipeline();
