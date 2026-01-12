/**
 * UnifiedChatService
 * 
 * Serviço central que agrega mensagens de chat de múltiplas plataformas:
 * - YouTube Live Chat (via OAuth - automático)
 * - Twitch Chat (via OAuth - automático)
 * - Facebook (futuro)
 * 
 * Funciona igual ao StreamYard - conecta automaticamente quando o usuário
 * tem contas vinculadas e está ao vivo.
 */

import { twitchChatService, TwitchMessage } from './TwitchChatService';
import { commentOverlayService } from './CommentOverlayService';
import { liveDetectionService, LiveDetectionService } from './LiveDetectionService';
import type { Comment } from '../types/comments';

export interface UnifiedMessage {
  id: string;
  platform: 'youtube' | 'twitch' | 'facebook' | 'custom';
  username: string;
  displayName: string;
  avatarUrl?: string;
  message: string;
  timestamp: Date;
  color?: string;
  badges?: string[];
  isSubscriber?: boolean;
  isMod?: boolean;
  isVip?: boolean;
  isBroadcaster?: boolean;
  isSuperChat?: boolean;
  superChatAmount?: string;
}

export interface ConnectedAccount {
  id: string;
  platform: 'youtube' | 'twitch';
  displayName: string;
  channelId?: string;
  profileImage?: string;
  isConnected: boolean;
}

interface PlatformConnection {
  platform: 'youtube' | 'twitch' | 'facebook';
  identifier: string; // videoId, channel name, etc.
  isConnected: boolean;
  accountId?: string;
  displayName?: string;
}

interface YouTubeAccount {
  id: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail?: string;
}

interface TwitchAccount {
  id: string;
  twitchId: string;
  login: string;
  displayName: string;
  profileImageUrl?: string;
}

interface YouTubeBroadcast {
  id: string;
  title: string;
  liveChatId?: string;
  watchUrl?: string;
}

type MessageCallback = (message: UnifiedMessage) => void;
type ConnectionCallback = (connections: PlatformConnection[]) => void;
type AccountsCallback = (accounts: ConnectedAccount[]) => void;

class UnifiedChatService {
  private messages: UnifiedMessage[] = [];
  private maxMessages: number = 100;
  private connections: PlatformConnection[] = [];
  private connectedAccounts: ConnectedAccount[] = [];
  
  private messageCallbacks: Set<MessageCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private accountsCallbacks: Set<AccountsCallback> = new Set();
  
  // YouTube polling
  private youtubePollingInterval: NodeJS.Timeout | null = null;
  private youtubeVideoId: string | null = null;
  private youtubeLiveChatId: string | null = null;
  private youtubeAccountId: string | null = null;
  private youtubeNextPageToken: string | null = null;
  
  // Twitch OAuth
  private twitchAccountId: string | null = null;
  
  // Auto-show settings
  private autoShowOnScreen: boolean = false;
  
  // Auto-connect polling
  private autoConnectInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('[UnifiedChat] Service initialized');
    
    // Subscribe to Twitch messages
    twitchChatService.onMessage((msg) => this.handleTwitchMessage(msg));
    twitchChatService.onConnection((connected) => this.updateConnection('twitch', connected));
    
    // Subscribe to live detection - auto-connect when live is detected
    liveDetectionService.onLiveDetected((videoId, platform) => {
      console.log('[UnifiedChat] Live detected:', platform, videoId);
      if (platform === 'youtube') {
        this.connectYouTube(videoId);
      } else if (platform === 'twitch') {
        this.connectTwitch(videoId);
      }
    });
    
    // Listen for broadcast:live event from RTMPStreamService
    // This is the PRIMARY way to detect when a live starts
    window.addEventListener('broadcast:live', ((event: CustomEvent) => {
      console.log('[UnifiedChat] 🎬 Broadcast LIVE event received:', event.detail);
      const { broadcastId, liveChatId, platform, accountId } = event.detail;
      
      if (platform === 'youtube' && liveChatId) {
        console.log('[UnifiedChat] Auto-connecting to YouTube chat via broadcast event...');
        this.connectYouTubeOAuthChat(accountId, broadcastId, liveChatId);
      }
    }) as EventListener);
    
    // Start polling for active lives (fallback)
    liveDetectionService.startPolling(15000);
    
    // Load connected accounts on init
    this.loadConnectedAccounts();
  }

  /**
   * Load connected OAuth accounts from server
   */
  async loadConnectedAccounts(): Promise<void> {
    console.log('[UnifiedChat] Loading connected accounts...');
    
    try {
      // Load YouTube accounts
      const ytResponse = await fetch('/api/youtube/oauth/accounts');
      if (ytResponse.ok) {
        const ytData = await ytResponse.json();
        for (const account of ytData.accounts || []) {
          this.connectedAccounts.push({
            id: account.id,
            platform: 'youtube',
            displayName: account.channelTitle,
            channelId: account.channelId,
            profileImage: account.channelThumbnail,
            isConnected: false,
          });
        }
      }

      // Load Twitch accounts
      const twResponse = await fetch('/api/twitch/oauth/accounts');
      if (twResponse.ok) {
        const twData = await twResponse.json();
        for (const account of twData.accounts || []) {
          this.connectedAccounts.push({
            id: account.id,
            platform: 'twitch',
            displayName: account.displayName,
            channelId: account.login,
            profileImage: account.profileImageUrl,
            isConnected: false,
          });
        }
      }

      console.log('[UnifiedChat] Loaded', this.connectedAccounts.length, 'accounts');
      this.notifyAccounts();
    } catch (error) {
      console.error('[UnifiedChat] Error loading accounts:', error);
    }
  }

  /**
   * Get connected OAuth accounts
   */
  getConnectedAccounts(): ConnectedAccount[] {
    return [...this.connectedAccounts];
  }

  /**
   * Connect YouTube account via OAuth (redirect to Google)
   */
  connectYouTubeOAuth(): void {
    console.log('[UnifiedChat] Starting YouTube OAuth...');
    window.location.href = '/api/youtube/oauth/connect';
  }

  /**
   * Connect Twitch account via OAuth (redirect to Twitch)
   */
  connectTwitchOAuth(): void {
    console.log('[UnifiedChat] Starting Twitch OAuth...');
    window.location.href = '/api/twitch/oauth/connect';
  }

  /**
   * Disconnect a connected account
   */
  async disconnectAccount(accountId: string): Promise<boolean> {
    const account = this.connectedAccounts.find(a => a.id === accountId);
    if (!account) return false;

    try {
      const platform = account.platform;
      const response = await fetch(`/api/${platform}/oauth/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        this.connectedAccounts = this.connectedAccounts.filter(a => a.id !== accountId);
        this.notifyAccounts();
        
        // Disconnect chat if this account was connected
        if (platform === 'youtube' && this.youtubeAccountId === accountId) {
          this.disconnectYouTube();
        } else if (platform === 'twitch' && this.twitchAccountId === accountId) {
          this.disconnectTwitch();
        }
        
        return true;
      }
    } catch (error) {
      console.error('[UnifiedChat] Error disconnecting account:', error);
    }
    return false;
  }

  /**
   * Auto-connect to chat for all connected accounts
   * Detects active broadcasts and connects automatically
   */
  async autoConnect(): Promise<void> {
    console.log('[UnifiedChat] Auto-connecting to chats...');

    // Auto-connect YouTube
    const ytAccounts = this.connectedAccounts.filter(a => a.platform === 'youtube');
    for (const account of ytAccounts) {
      await this.autoConnectYouTube(account.id);
    }

    // Auto-connect Twitch
    const twAccounts = this.connectedAccounts.filter(a => a.platform === 'twitch');
    for (const account of twAccounts) {
      await this.autoConnectTwitch(account.id);
    }
  }

  /**
   * Auto-connect to YouTube chat for a specific account
   */
  private async autoConnectYouTube(accountId: string): Promise<boolean> {
    try {
      // Get active broadcasts for this account
      const response = await fetch(`/api/youtube/oauth/active-broadcasts?accountId=${accountId}`);
      
      if (!response.ok) {
        console.log('[UnifiedChat] No active YouTube broadcasts found');
        return false;
      }

      const data = await response.json();
      const broadcasts: YouTubeBroadcast[] = data.broadcasts || [];

      if (broadcasts.length === 0) {
        console.log('[UnifiedChat] No active YouTube broadcasts');
        return false;
      }

      // Connect to the first active broadcast
      const broadcast = broadcasts[0];
      console.log('[UnifiedChat] Found active YouTube broadcast:', broadcast.title);

      if (broadcast.liveChatId) {
        return await this.connectYouTubeOAuthChat(accountId, broadcast.id, broadcast.liveChatId);
      } else {
        // Use video ID if no liveChatId
        return await this.connectYouTube(broadcast.id);
      }
    } catch (error) {
      console.error('[UnifiedChat] Error auto-connecting YouTube:', error);
      return false;
    }
  }

  /**
   * Connect to YouTube chat using OAuth (automatic)
   */
  async connectYouTubeOAuthChat(accountId: string, videoId: string, liveChatId: string): Promise<boolean> {
    console.log('[UnifiedChat] Connecting to YouTube OAuth chat:', videoId);
    
    this.disconnectYouTube();
    
    this.youtubeAccountId = accountId;
    this.youtubeVideoId = videoId;
    this.youtubeLiveChatId = liveChatId;
    
    const success = await this.fetchYouTubeOAuthComments();
    
    if (success) {
      const account = this.connectedAccounts.find(a => a.id === accountId);
      this.updateConnection('youtube', true, videoId, accountId, account?.displayName);
      
      // Update account status
      const accountIndex = this.connectedAccounts.findIndex(a => a.id === accountId);
      if (accountIndex >= 0) {
        this.connectedAccounts[accountIndex].isConnected = true;
        this.notifyAccounts();
      }
      
      // Poll every 5 seconds
      this.youtubePollingInterval = setInterval(() => {
        this.fetchYouTubeOAuthComments();
      }, 5000);
      
      return true;
    }
    
    return false;
  }

  /**
   * Fetch YouTube comments using OAuth
   */
  private async fetchYouTubeOAuthComments(): Promise<boolean> {
    if (!this.youtubeLiveChatId || !this.youtubeAccountId) return false;

    try {
      let url = `/api/youtube/oauth/chat/${this.youtubeLiveChatId}?accountId=${this.youtubeAccountId}`;
      if (this.youtubeNextPageToken) {
        url += `&pageToken=${this.youtubeNextPageToken}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('[UnifiedChat] YouTube OAuth API error:', response.status);
        return false;
      }

      const data = await response.json();
      
      if (data.nextPageToken) {
        this.youtubeNextPageToken = data.nextPageToken;
      }

      if (data.messages && Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          // Check if message already exists
          if (this.messages.some(m => m.id === msg.id)) continue;

          const message: UnifiedMessage = {
            id: msg.id,
            platform: 'youtube',
            username: msg.authorChannelId || msg.authorDisplayName,
            displayName: msg.authorDisplayName,
            avatarUrl: msg.authorProfileImageUrl,
            message: msg.displayMessage || msg.textMessageDetails?.messageText || '',
            timestamp: new Date(msg.publishedAt),
            isSuperChat: !!msg.superChatDetails,
            superChatAmount: msg.superChatDetails?.amountDisplayString,
          };

          this.addMessage(message);
        }
      }

      return true;
    } catch (error) {
      console.error('[UnifiedChat] Error fetching YouTube OAuth comments:', error);
      return false;
    }
  }

  /**
   * Auto-connect to Twitch chat for a specific account
   */
  private async autoConnectTwitch(accountId: string): Promise<boolean> {
    try {
      // Get chat token for this account
      const response = await fetch(`/api/twitch/oauth/chat-token?accountId=${accountId}`);
      
      if (!response.ok) {
        console.log('[UnifiedChat] Could not get Twitch chat token');
        return false;
      }

      const data = await response.json();
      
      if (data.token && data.channel) {
        console.log('[UnifiedChat] Connecting to Twitch channel:', data.channel);
        
        this.twitchAccountId = accountId;
        
        // Connect using OAuth token
        twitchChatService.connectWithOAuth(data.channel, data.username, data.token);
        
        // Update account status
        const accountIndex = this.connectedAccounts.findIndex(a => a.id === accountId);
        if (accountIndex >= 0) {
          this.connectedAccounts[accountIndex].isConnected = true;
          this.notifyAccounts();
        }
        
        return true;
      }
    } catch (error) {
      console.error('[UnifiedChat] Error auto-connecting Twitch:', error);
    }
    return false;
  }

  /**
   * Start auto-connect polling (checks for active broadcasts periodically)
   */
  startAutoConnect(intervalMs: number = 30000): void {
    this.stopAutoConnect();
    
    // Connect immediately
    this.autoConnect();
    
    // Then poll periodically
    this.autoConnectInterval = setInterval(() => {
      this.autoConnect();
    }, intervalMs);
  }

  /**
   * Stop auto-connect polling
   */
  stopAutoConnect(): void {
    if (this.autoConnectInterval) {
      clearInterval(this.autoConnectInterval);
      this.autoConnectInterval = null;
    }
  }

  /**
   * Connect to YouTube Live Chat (manual - by video ID)
   */
  async connectYouTube(videoId: string): Promise<boolean> {
    console.log('[UnifiedChat] Connecting to YouTube:', videoId);
    
    // Disconnect existing YouTube connection
    this.disconnectYouTube();
    
    this.youtubeVideoId = videoId;
    
    // Start polling for YouTube comments
    const success = await this.fetchYouTubeComments();
    
    if (success) {
      this.updateConnection('youtube', true, videoId);
      
      // Poll every 5 seconds
      this.youtubePollingInterval = setInterval(() => {
        this.fetchYouTubeComments();
      }, 5000);
      
      return true;
    }
    
    return false;
  }

  /**
   * Disconnect from YouTube Live Chat
   */
  disconnectYouTube(): void {
    if (this.youtubePollingInterval) {
      clearInterval(this.youtubePollingInterval);
      this.youtubePollingInterval = null;
    }
    
    // Update account status
    if (this.youtubeAccountId) {
      const accountIndex = this.connectedAccounts.findIndex(a => a.id === this.youtubeAccountId);
      if (accountIndex >= 0) {
        this.connectedAccounts[accountIndex].isConnected = false;
        this.notifyAccounts();
      }
    }
    
    this.youtubeVideoId = null;
    this.youtubeLiveChatId = null;
    this.youtubeAccountId = null;
    this.youtubeNextPageToken = null;
    this.updateConnection('youtube', false);
  }

  /**
   * Fetch YouTube comments from API (manual - by video ID)
   */
  private async fetchYouTubeComments(): Promise<boolean> {
    if (!this.youtubeVideoId) return false;

    try {
      let url = `/api/youtube/comments/${this.youtubeVideoId}`;
      if (this.youtubeNextPageToken) {
        url += `?pageToken=${this.youtubeNextPageToken}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('[UnifiedChat] YouTube API error:', response.status);
        return false;
      }

      const data = await response.json();
      
      if (data.nextPageToken) {
        this.youtubeNextPageToken = data.nextPageToken;
      }

      if (data.comments && Array.isArray(data.comments)) {
        for (const comment of data.comments) {
          // Check if message already exists
          if (this.messages.some(m => m.id === comment.id)) continue;

          const message: UnifiedMessage = {
            id: comment.id,
            platform: 'youtube',
            username: comment.authorChannelId || comment.authorDisplayName,
            displayName: comment.authorDisplayName,
            avatarUrl: comment.authorProfileImageUrl,
            message: comment.textDisplay,
            timestamp: new Date(comment.publishedAt),
            isSuperChat: comment.isSuperChat,
            superChatAmount: comment.superChatAmount,
          };

          this.addMessage(message);
        }
      }

      return true;
    } catch (error) {
      console.error('[UnifiedChat] Error fetching YouTube comments:', error);
      return false;
    }
  }

  /**
   * Connect to Twitch Chat (manual - by channel name)
   */
  connectTwitch(channel: string): void {
    console.log('[UnifiedChat] Connecting to Twitch:', channel);
    twitchChatService.connect(channel);
  }

  /**
   * Disconnect from Twitch Chat
   */
  disconnectTwitch(): void {
    twitchChatService.disconnect();
    
    // Update account status
    if (this.twitchAccountId) {
      const accountIndex = this.connectedAccounts.findIndex(a => a.id === this.twitchAccountId);
      if (accountIndex >= 0) {
        this.connectedAccounts[accountIndex].isConnected = false;
        this.notifyAccounts();
      }
    }
    
    this.twitchAccountId = null;
    this.updateConnection('twitch', false);
  }

  /**
   * Handle incoming Twitch message
   */
  private handleTwitchMessage(msg: TwitchMessage): void {
    const message: UnifiedMessage = {
      id: msg.id,
      platform: 'twitch',
      username: msg.username,
      displayName: msg.displayName,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`,
      message: msg.message,
      timestamp: msg.timestamp,
      color: msg.color,
      badges: msg.badges,
      isSubscriber: msg.isSubscriber,
      isMod: msg.isMod,
      isVip: msg.isVip,
      isBroadcaster: msg.isBroadcaster,
    };

    this.addMessage(message);
  }

  /**
   * Add a message to the unified chat
   */
  private addMessage(message: UnifiedMessage): void {
    // Add to messages array
    this.messages.push(message);
    
    // Trim to max messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    // Notify subscribers
    this.notifyMessage(message);

    // Add to comment overlay service if auto-show is enabled
    if (this.autoShowOnScreen) {
      this.sendToOverlay(message);
    }
  }

  /**
   * Send message to comment overlay
   */
  sendToOverlay(message: UnifiedMessage): void {
    const comment: Comment = {
      id: message.id,
      platform: message.platform,
      author: {
        id: message.username,
        name: message.displayName,
        avatarUrl: message.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.username}`,
        badges: message.badges?.map(b => ({ type: b, label: b })) || [],
      },
      message: message.message,
      timestamp: message.timestamp.getTime(),
      isPinned: false,
      isStarred: false,
      isRead: false,
    };

    commentOverlayService.addComment(comment);
  }

  /**
   * Pin a message to the overlay
   */
  pinToOverlay(messageId: string): void {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) return;

    const comment: Comment = {
      id: message.id,
      platform: message.platform,
      author: {
        id: message.username,
        name: message.displayName,
        avatarUrl: message.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.username}`,
        badges: message.badges?.map(b => ({ type: b, label: b })) || [],
      },
      message: message.message,
      timestamp: message.timestamp.getTime(),
      isPinned: true,
      isStarred: false,
      isRead: false,
    };

    commentOverlayService.addComment(comment);
    commentOverlayService.pinComment(comment.id);
  }

  /**
   * Clear pinned comment from overlay
   */
  clearPinnedOverlay(): void {
    commentOverlayService.clearPinned();
  }

  /**
   * Update connection status
   */
  private updateConnection(
    platform: 'youtube' | 'twitch' | 'facebook', 
    connected: boolean, 
    identifier?: string,
    accountId?: string,
    displayName?: string
  ): void {
    const existingIndex = this.connections.findIndex(c => c.platform === platform);
    
    if (connected) {
      const connection: PlatformConnection = {
        platform,
        identifier: identifier || '',
        isConnected: true,
        accountId,
        displayName,
      };
      
      if (existingIndex >= 0) {
        this.connections[existingIndex] = connection;
      } else {
        this.connections.push(connection);
      }
    } else {
      if (existingIndex >= 0) {
        this.connections[existingIndex].isConnected = false;
      }
    }

    this.notifyConnections();
  }

  /**
   * Get all messages
   */
  getMessages(): UnifiedMessage[] {
    return [...this.messages];
  }

  /**
   * Get messages filtered by platform
   */
  getMessagesByPlatform(platform: string): UnifiedMessage[] {
    if (platform === 'all') return this.getMessages();
    return this.messages.filter(m => m.platform === platform);
  }

  /**
   * Get connection status
   */
  getConnections(): PlatformConnection[] {
    return [...this.connections];
  }

  /**
   * Check if connected to a specific platform
   */
  isConnected(platform: 'youtube' | 'twitch' | 'facebook'): boolean {
    const connection = this.connections.find(c => c.platform === platform);
    return connection?.isConnected || false;
  }

  /**
   * Set auto-show on screen
   */
  setAutoShow(enabled: boolean): void {
    this.autoShowOnScreen = enabled;
    commentOverlayService.setAutoShow(enabled);
  }

  /**
   * Get auto-show status
   */
  getAutoShow(): boolean {
    return this.autoShowOnScreen;
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messages = [];
  }

  /**
   * Disconnect from all platforms
   */
  disconnectAll(): void {
    this.disconnectYouTube();
    this.disconnectTwitch();
    this.stopAutoConnect();
    this.clearMessages();
  }

  /**
   * Add a custom/local message
   */
  addCustomMessage(username: string, message: string): void {
    const customMessage: UnifiedMessage = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      platform: 'custom',
      username,
      displayName: username,
      message,
      timestamp: new Date(),
    };

    this.addMessage(customMessage);
  }

  /**
   * Subscribe to new messages
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Subscribe to connection changes
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Subscribe to account changes
   */
  onAccountsChange(callback: AccountsCallback): () => void {
    this.accountsCallbacks.add(callback);
    return () => this.accountsCallbacks.delete(callback);
  }

  private notifyMessage(message: UnifiedMessage): void {
    this.messageCallbacks.forEach(cb => cb(message));
  }

  private notifyConnections(): void {
    this.connectionCallbacks.forEach(cb => cb(this.getConnections()));
  }

  private notifyAccounts(): void {
    this.accountsCallbacks.forEach(cb => cb(this.getConnectedAccounts()));
  }
}

export const unifiedChatService = new UnifiedChatService();
