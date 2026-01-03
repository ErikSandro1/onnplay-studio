/**
 * TwitchChatService
 * 
 * Serviço para conectar ao chat da Twitch via IRC/WebSocket
 * Permite receber mensagens em tempo real de qualquer canal
 */

export interface TwitchMessage {
  id: string;
  platform: 'twitch';
  username: string;
  displayName: string;
  message: string;
  timestamp: Date;
  color?: string;
  badges?: string[];
  emotes?: { id: string; positions: string }[];
  isSubscriber?: boolean;
  isMod?: boolean;
  isVip?: boolean;
  isBroadcaster?: boolean;
}

type MessageCallback = (message: TwitchMessage) => void;
type ConnectionCallback = (connected: boolean) => void;
type ErrorCallback = (error: string) => void;

class TwitchChatService {
  private ws: WebSocket | null = null;
  private channel: string | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  
  private messageCallbacks: Set<MessageCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  
  // Twitch IRC WebSocket URL (anonymous connection)
  private readonly TWITCH_IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';
  
  constructor() {
    console.log('[TwitchChat] Service initialized');
  }

  /**
   * Connect to a Twitch channel chat (anonymous - read only)
   */
  connect(channel: string): void {
    if (this.isConnected && this.channel === channel.toLowerCase()) {
      console.log('[TwitchChat] Already connected to', channel);
      return;
    }

    // Disconnect from previous channel if any
    if (this.ws) {
      this.disconnect();
    }

    this.channel = channel.toLowerCase().replace('#', '');
    console.log('[TwitchChat] Connecting to channel:', this.channel);

    try {
      this.ws = new WebSocket(this.TWITCH_IRC_URL);

      this.ws.onopen = () => {
        console.log('[TwitchChat] WebSocket connected');
        this.authenticate();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[TwitchChat] WebSocket error:', error);
        this.notifyError('Erro de conexão com Twitch');
      };

      this.ws.onclose = () => {
        console.log('[TwitchChat] WebSocket closed');
        this.isConnected = false;
        this.notifyConnection(false);
        
        // Try to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.channel) {
          this.reconnectAttempts++;
          console.log(`[TwitchChat] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => {
            if (this.channel) {
              this.connect(this.channel);
            }
          }, this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error('[TwitchChat] Failed to create WebSocket:', error);
      this.notifyError('Falha ao conectar com Twitch');
    }
  }

  // OAuth credentials for authenticated connection
  private oauthToken: string | null = null;
  private oauthUsername: string | null = null;

  /**
   * Connect to a Twitch channel chat with OAuth (authenticated - can send messages)
   */
  connectWithOAuth(channel: string, username: string, token: string): void {
    if (this.isConnected && this.channel === channel.toLowerCase()) {
      console.log('[TwitchChat] Already connected to', channel);
      return;
    }

    // Disconnect from previous channel if any
    if (this.ws) {
      this.disconnect();
    }

    this.channel = channel.toLowerCase().replace('#', '');
    this.oauthToken = token;
    this.oauthUsername = username;
    console.log('[TwitchChat] Connecting to channel with OAuth:', this.channel);

    try {
      this.ws = new WebSocket(this.TWITCH_IRC_URL);

      this.ws.onopen = () => {
        console.log('[TwitchChat] WebSocket connected (OAuth)');
        this.authenticateOAuth();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[TwitchChat] WebSocket error:', error);
        this.notifyError('Erro de conexão com Twitch');
      };

      this.ws.onclose = () => {
        console.log('[TwitchChat] WebSocket closed');
        this.isConnected = false;
        this.notifyConnection(false);
        
        // Try to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.channel) {
          this.reconnectAttempts++;
          console.log(`[TwitchChat] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => {
            if (this.channel && this.oauthToken && this.oauthUsername) {
              this.connectWithOAuth(this.channel, this.oauthUsername, this.oauthToken);
            } else if (this.channel) {
              this.connect(this.channel);
            }
          }, this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error('[TwitchChat] Failed to create WebSocket:', error);
      this.notifyError('Falha ao conectar com Twitch');
    }
  }

  /**
   * Authenticate with Twitch IRC using OAuth token
   */
  private authenticateOAuth(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!this.oauthToken || !this.oauthUsername) {
      this.authenticate();
      return;
    }

    // Request capabilities for badges, colors, etc.
    this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
    
    // OAuth login
    this.ws.send(`PASS oauth:${this.oauthToken}`);
    this.ws.send(`NICK ${this.oauthUsername}`);
    
    // Join channel
    if (this.channel) {
      this.ws.send(`JOIN #${this.channel}`);
    }
  }

  /**
   * Send a message to the chat (requires OAuth)
   */
  sendMessage(message: string): boolean {
    if (!this.ws || !this.isConnected || !this.channel || !this.oauthToken) {
      console.error('[TwitchChat] Cannot send message - not authenticated');
      return false;
    }

    this.ws.send(`PRIVMSG #${this.channel} :${message}`);
    return true;
  }

  /**
   * Authenticate with Twitch IRC (anonymous)
   */
  private authenticate(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Request capabilities for badges, colors, etc.
    this.ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
    
    // Anonymous login (justinfan + random number)
    const anonymousNick = `justinfan${Math.floor(Math.random() * 99999)}`;
    this.ws.send(`NICK ${anonymousNick}`);
    
    // Join channel
    if (this.channel) {
      this.ws.send(`JOIN #${this.channel}`);
    }
  }

  /**
   * Handle incoming IRC messages
   */
  private handleMessage(data: string): void {
    const lines = data.split('\r\n').filter(line => line.length > 0);

    for (const line of lines) {
      // Respond to PING to keep connection alive
      if (line.startsWith('PING')) {
        this.ws?.send('PONG :tmi.twitch.tv');
        continue;
      }

      // Check for successful join
      if (line.includes('JOIN') && line.includes(this.channel || '')) {
        console.log('[TwitchChat] Successfully joined channel:', this.channel);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnection(true);
        continue;
      }

      // Parse PRIVMSG (chat messages)
      if (line.includes('PRIVMSG')) {
        const message = this.parsePrivMsg(line);
        if (message) {
          this.notifyMessage(message);
        }
      }
    }
  }

  /**
   * Parse a PRIVMSG IRC message into TwitchMessage
   */
  private parsePrivMsg(line: string): TwitchMessage | null {
    try {
      // Example format:
      // @badge-info=;badges=broadcaster/1;color=#FF0000;display-name=Username;emotes=;... :username!username@username.tmi.twitch.tv PRIVMSG #channel :message text

      const tagsMatch = line.match(/^@([^ ]+)/);
      const userMatch = line.match(/:([^!]+)!/);
      const messageMatch = line.match(/PRIVMSG #[^ ]+ :(.+)$/);

      if (!messageMatch) return null;

      const tags: Record<string, string> = {};
      if (tagsMatch) {
        tagsMatch[1].split(';').forEach(tag => {
          const [key, value] = tag.split('=');
          tags[key] = value || '';
        });
      }

      const username = userMatch ? userMatch[1] : 'unknown';
      const displayName = tags['display-name'] || username;
      const messageText = messageMatch[1];

      // Parse badges
      const badges: string[] = [];
      if (tags['badges']) {
        tags['badges'].split(',').forEach(badge => {
          const [badgeName] = badge.split('/');
          if (badgeName) badges.push(badgeName);
        });
      }

      // Parse emotes
      const emotes: { id: string; positions: string }[] = [];
      if (tags['emotes']) {
        tags['emotes'].split('/').forEach(emote => {
          const [id, positions] = emote.split(':');
          if (id && positions) {
            emotes.push({ id, positions });
          }
        });
      }

      const message: TwitchMessage = {
        id: tags['id'] || `twitch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        platform: 'twitch',
        username,
        displayName,
        message: messageText,
        timestamp: new Date(parseInt(tags['tmi-sent-ts']) || Date.now()),
        color: tags['color'] || '#9146FF',
        badges,
        emotes,
        isSubscriber: badges.includes('subscriber'),
        isMod: badges.includes('moderator'),
        isVip: badges.includes('vip'),
        isBroadcaster: badges.includes('broadcaster'),
      };

      return message;
    } catch (error) {
      console.error('[TwitchChat] Error parsing message:', error);
      return null;
    }
  }

  /**
   * Disconnect from Twitch chat
   */
  disconnect(): void {
    console.log('[TwitchChat] Disconnecting...');
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.notifyConnection(false);
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current channel
   */
  getChannel(): string | null {
    return this.channel;
  }

  /**
   * Subscribe to messages
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Subscribe to connection status changes
   */
  onConnection(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Subscribe to errors
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  private notifyMessage(message: TwitchMessage): void {
    this.messageCallbacks.forEach(cb => cb(message));
  }

  private notifyConnection(connected: boolean): void {
    this.connectionCallbacks.forEach(cb => cb(connected));
  }

  private notifyError(error: string): void {
    this.errorCallbacks.forEach(cb => cb(error));
  }
}

export const twitchChatService = new TwitchChatService();
