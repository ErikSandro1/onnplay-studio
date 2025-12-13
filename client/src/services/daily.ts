/**
 * Daily.co Integration Service
 * 
 * Este serviço gerencia a integração com Daily.co para videochamadas em tempo real
 * no OnnPlay Studio Pro Live.
 * 
 * Funcionalidades:
 * - Criar salas de videochamada
 * - Gerar links de convite
 * - Gerenciar participantes
 * - Controlar permissões de acesso
 */

interface DailyRoom {
  name: string;
  privacy: 'public' | 'private';
  properties?: {
    max_participants?: number;
    enable_recording?: boolean;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
  };
}

interface DailyParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  joined_at: Date;
  role: 'host' | 'guest';
  audio_enabled: boolean;
  video_enabled: boolean;
}

interface DailyInviteLink {
  url: string;
  room_name: string;
  created_at: Date;
  expires_at?: Date;
}

class DailyService {
  private apiKey: string = '';
  private roomName: string = '';
  private participants: Map<string, DailyParticipant> = new Map();
  private listeners: { [key: string]: Function[] } = {};

  constructor() {
    this.initializeListeners();
  }

  private initializeListeners() {
    this.listeners = {
      'participant-joined': [],
      'participant-left': [],
      'participant-updated': [],
      'room-created': [],
      'room-deleted': [],
      'error': [],
    };
  }

  /**
   * Inicializar o serviço Daily.co
   * @param apiKey Chave de API do Daily.co
   */
  public initialize(apiKey: string) {
    this.apiKey = apiKey;
    console.log('Daily.co service initialized');
  }

  /**
   * Criar uma nova sala de videochamada
   */
  public async createRoom(roomConfig: DailyRoom): Promise<string> {
    try {
      // Simular criação de sala (em produção, fazer chamada à API Daily.co)
      this.roomName = roomConfig.name;
      
      const room = {
        name: roomConfig.name,
        privacy: roomConfig.privacy,
        url: `https://onnplay.daily.co/${roomConfig.name}`,
        created_at: new Date(),
        properties: roomConfig.properties || {},
      };

      this.emit('room-created', room);
      console.log('Room created:', room.name);
      
      return room.url;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Gerar link de convite para a sala
   */
  public generateInviteLink(expiresIn?: number): DailyInviteLink {
    const inviteLink: DailyInviteLink = {
      url: `https://onnplay.daily.co/${this.roomName}?token=${this.generateToken()}`,
      room_name: this.roomName,
      created_at: new Date(),
    };

    if (expiresIn) {
      inviteLink.expires_at = new Date(Date.now() + expiresIn);
    }

    return inviteLink;
  }

  /**
   * Gerar token de acesso para participante
   */
  private generateToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Adicionar participante à sala
   */
  public addParticipant(participant: DailyParticipant) {
    this.participants.set(participant.id, participant);
    this.emit('participant-joined', participant);
    console.log(`Participant joined: ${participant.name}`);
  }

  /**
   * Remover participante da sala
   */
  public removeParticipant(participantId: string) {
    const participant = this.participants.get(participantId);
    if (participant) {
      this.participants.delete(participantId);
      this.emit('participant-left', participant);
      console.log(`Participant left: ${participant.name}`);
    }
  }

  /**
   * Atualizar estado do participante
   */
  public updateParticipant(participantId: string, updates: Partial<DailyParticipant>) {
    const participant = this.participants.get(participantId);
    if (participant) {
      const updated = { ...participant, ...updates };
      this.participants.set(participantId, updated);
      this.emit('participant-updated', updated);
    }
  }

  /**
   * Obter lista de participantes
   */
  public getParticipants(): DailyParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Obter participante específico
   */
  public getParticipant(participantId: string): DailyParticipant | undefined {
    return this.participants.get(participantId);
  }

  /**
   * Contar participantes
   */
  public getParticipantCount(): number {
    return this.participants.size;
  }

  /**
   * Mutar/desmutar áudio de participante
   */
  public toggleParticipantAudio(participantId: string, enabled: boolean) {
    this.updateParticipant(participantId, { audio_enabled: enabled });
  }

  /**
   * Ativar/desativar vídeo de participante
   */
  public toggleParticipantVideo(participantId: string, enabled: boolean) {
    this.updateParticipant(participantId, { video_enabled: enabled });
  }

  /**
   * Remover participante da sala (kick)
   */
  public kickParticipant(participantId: string) {
    this.removeParticipant(participantId);
  }

  /**
   * Obter nome da sala atual
   */
  public getRoomName(): string {
    return this.roomName;
  }

  /**
   * Obter URL da sala
   */
  public getRoomUrl(): string {
    return `https://onnplay.daily.co/${this.roomName}`;
  }

  /**
   * Registrar listener para evento
   */
  public on(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    
    // Retornar função para desinscrever
    return () => {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    };
  }

  /**
   * Emitir evento
   */
  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Limpar todos os listeners
   */
  public clearListeners() {
    this.initializeListeners();
  }

  /**
   * Fechar sala
   */
  public async closeRoom() {
    this.participants.clear();
    this.emit('room-deleted', { name: this.roomName });
    this.roomName = '';
    console.log('Room closed');
  }
}

// Exportar instância singleton
export const dailyService = new DailyService();

// Exportar tipos
export type { DailyRoom, DailyParticipant, DailyInviteLink };
