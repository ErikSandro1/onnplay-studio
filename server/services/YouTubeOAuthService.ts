/**
 * YouTubeOAuthService - OAuth para YouTube Live
 * 
 * Permite conectar conta do YouTube via OAuth e criar lives automaticamente
 * sem necessidade de Stream Key manual (igual StreamYard)
 */
import { OAuth2Client } from 'google-auth-library';
import { query, execute, queryOne } from '../db/connection';
import { PreWarmService } from './PreWarmService';

interface YouTubeChannel {
  id: string;
  title: string;
  thumbnail: string;
  subscriberCount?: string;
}

interface YouTubeLiveBroadcast {
  id: string;
  title: string;
  description: string;
  scheduledStartTime: string;
  privacyStatus: 'public' | 'private' | 'unlisted';
  liveChatId?: string;
  streamKey?: string;
  rtmpUrl?: string;
  watchUrl?: string;
  streamId?: string; // ID do stream para verificar status
}

// Store active broadcasts to track streamId
const activeBroadcasts: Map<string, { broadcastId: string; streamId: string; accountId: string; userId: string }> = new Map();

interface ConnectedYouTubeAccount {
  id: string;
  channelId: string;
  channelTitle: string;
  channelThumbnail: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  connectedAt: number;
}

// Store connected accounts in memory as cache, with database persistence
const connectedAccounts: Map<string, ConnectedYouTubeAccount[]> = new Map();

// Database helper functions for OAuth accounts persistence
async function saveAccountToDb(userId: string, account: ConnectedYouTubeAccount): Promise<void> {
  try {
    const id = `${userId}-youtube-${account.channelId}`;
    await execute(
      `INSERT INTO connected_oauth_accounts 
       (id, user_id, platform, platform_account_id, account_name, account_thumbnail, access_token, refresh_token, expires_at, is_active, created_at, updated_at)
       VALUES (?, ?, 'youtube', ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())
       ON DUPLICATE KEY UPDATE 
       account_name = VALUES(account_name),
       account_thumbnail = VALUES(account_thumbnail),
       access_token = VALUES(access_token),
       refresh_token = VALUES(refresh_token),
       expires_at = VALUES(expires_at),
       is_active = TRUE,
       updated_at = NOW()`,
      [id, userId, account.channelId, account.channelTitle, account.channelThumbnail, 
       account.accessToken, account.refreshToken, account.expiresAt]
    );
    console.log('[YouTubeOAuth] Account saved to database:', account.channelTitle);
  } catch (error) {
    console.error('[YouTubeOAuth] Failed to save account to database:', error);
  }
}

async function loadAccountsFromDb(userId: string): Promise<ConnectedYouTubeAccount[]> {
  try {
    const rows = await query<any>(
      `SELECT * FROM connected_oauth_accounts WHERE user_id = ? AND platform = 'youtube' AND is_active = TRUE`,
      [userId]
    );
    return rows.map((row: any) => ({
      id: `yt-${row.platform_account_id}-${new Date(row.created_at).getTime()}`,
      channelId: row.platform_account_id,
      channelTitle: row.account_name,
      channelThumbnail: row.account_thumbnail || '',
      accessToken: row.access_token,
      refreshToken: row.refresh_token || '',
      expiresAt: row.expires_at || Date.now() + 3600000,
      connectedAt: new Date(row.created_at).getTime(),
    }));
  } catch (error) {
    console.error('[YouTubeOAuth] Failed to load accounts from database:', error);
    return [];
  }
}

async function deleteAccountFromDb(userId: string, channelId: string): Promise<boolean> {
  try {
    const result = await execute(
      `UPDATE connected_oauth_accounts SET is_active = FALSE, updated_at = NOW() 
       WHERE user_id = ? AND platform = 'youtube' AND platform_account_id = ?`,
      [userId, channelId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('[YouTubeOAuth] Failed to delete account from database:', error);
    return false;
  }
}

export class YouTubeOAuthService {
  private client: OAuth2Client;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI || 
                       process.env.OAUTH_SERVER_URL + '/api/youtube/oauth/callback' ||
                       'https://www.onnplay.com/api/youtube/oauth/callback';

    console.log('[YouTubeOAuth] Initializing...');
    console.log('[YouTubeOAuth] Client ID present:', !!this.clientId);
    console.log('[YouTubeOAuth] Redirect URI:', this.redirectUri);

    this.client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri);
  }

  /**
   * Get OAuth URL for YouTube with required scopes for live streaming
   */
  getAuthUrl(state?: string): string {
    if (!this.clientId) {
      throw new Error('YouTube OAuth not configured - missing GOOGLE_CLIENT_ID');
    }

    const scopes = [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    // Use URL manual para garantir todos os parâmetros corretos
    const scopeString = scopes.join(' ');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopeString,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    });
    
    if (state) {
      params.append('state', state);
    }
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens and get channel info
   */
  async handleCallback(code: string, userId: string): Promise<ConnectedYouTubeAccount> {
    console.log('[YouTubeOAuth] Handling callback for user:', userId);

    // Exchange code for tokens
    const { tokens } = await this.client.getToken(code);
    console.log('[YouTubeOAuth] Got tokens, access_token present:', !!tokens.access_token);
    console.log('[YouTubeOAuth] Got tokens, refresh_token present:', !!tokens.refresh_token);

    this.client.setCredentials(tokens);

    // Get channel info
    const channelInfo = await this.getChannelInfo(tokens.access_token!);
    console.log('[YouTubeOAuth] Got channel info:', channelInfo.title);

    // Create connected account
    const account: ConnectedYouTubeAccount = {
      id: `yt-${channelInfo.id}-${Date.now()}`,
      channelId: channelInfo.id,
      channelTitle: channelInfo.title,
      channelThumbnail: channelInfo.thumbnail,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || '',
      expiresAt: tokens.expiry_date || Date.now() + 3600000,
      connectedAt: Date.now(),
    };

    // Store account in memory cache
    const userAccounts = connectedAccounts.get(userId) || [];
    
    // Remove existing account for same channel
    const filteredAccounts = userAccounts.filter(a => a.channelId !== channelInfo.id);
    filteredAccounts.push(account);
    connectedAccounts.set(userId, filteredAccounts);

    // Persist to database
    await saveAccountToDb(userId, account);

    console.log('[YouTubeOAuth] Account connected successfully');
    return account;
  }

  /**
   * Get YouTube channel info
   */
  private async getChannelInfo(accessToken: string): Promise<YouTubeChannel> {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[YouTubeOAuth] Failed to get channel info:', error);
      throw new Error('Failed to get YouTube channel info');
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('No YouTube channel found for this account');
    }

    const channel = data.items[0];
    return {
      id: channel.id,
      title: channel.snippet.title,
      thumbnail: channel.snippet.thumbnails?.default?.url || '',
      subscriberCount: channel.statistics?.subscriberCount,
    };
  }

  /**
   * Get connected accounts for a user (loads from database if not in cache)
   */
  getConnectedAccounts(userId: string): ConnectedYouTubeAccount[] {
    return connectedAccounts.get(userId) || [];
  }

  /**
   * Get connected accounts for a user (async version that loads from database)
   */
  async getConnectedAccountsAsync(userId: string): Promise<ConnectedYouTubeAccount[]> {
    // Check memory cache first
    let accounts = connectedAccounts.get(userId);
    
    // If not in cache, load from database
    if (!accounts || accounts.length === 0) {
      accounts = await loadAccountsFromDb(userId);
      if (accounts.length > 0) {
        connectedAccounts.set(userId, accounts);
        console.log('[YouTubeOAuth] Loaded', accounts.length, 'accounts from database for user:', userId);
      }
    }
    
    return accounts;
  }

  /**
   * Remove a connected account
   */
  async removeAccount(userId: string, accountId: string): Promise<boolean> {
    const accounts = connectedAccounts.get(userId) || [];
    const accountToRemove = accounts.find(a => a.id === accountId);
    const filtered = accounts.filter(a => a.id !== accountId);
    
    if (filtered.length !== accounts.length) {
      connectedAccounts.set(userId, filtered);
      
      // Also remove from database
      if (accountToRemove) {
        await deleteAccountFromDb(userId, accountToRemove.channelId);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Refresh access token if expired
   */
  private async refreshAccessToken(account: ConnectedYouTubeAccount): Promise<string> {
    if (Date.now() < account.expiresAt - 60000) {
      // Token still valid (with 1 minute buffer)
      return account.accessToken;
    }

    if (!account.refreshToken) {
      throw new Error('No refresh token available - user needs to reconnect');
    }

    console.log('[YouTubeOAuth] Refreshing access token...');
    
    this.client.setCredentials({
      refresh_token: account.refreshToken,
    });

    const { credentials } = await this.client.refreshAccessToken();
    
    // Update stored account
    account.accessToken = credentials.access_token!;
    account.expiresAt = credentials.expiry_date || Date.now() + 3600000;

    return account.accessToken;
  }

  /**
   * Create a live broadcast on YouTube
   */
  async createLiveBroadcast(
    userId: string,
    accountId: string,
    options: {
      title: string;
      description?: string;
      privacyStatus?: 'public' | 'private' | 'unlisted';
      scheduledStartTime?: string;
    }
  ): Promise<YouTubeLiveBroadcast> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('YouTube account not found');
    }

    // Refresh token if needed
    const accessToken = await this.refreshAccessToken(account);

    const scheduledTime = options.scheduledStartTime || new Date().toISOString();
    const privacyStatus = options.privacyStatus || 'public';

    console.log('[YouTubeOAuth] Creating live broadcast:', options.title);

    // Step 0: Check for existing active broadcasts and end them
    const existingBroadcasts = Array.from(activeBroadcasts.entries())
      .filter(([_, info]) => info.accountId === accountId && info.userId === userId);
    
    for (const [broadcastId, info] of existingBroadcasts) {
      console.log('[YouTubeOAuth] Found existing broadcast, ending it:', broadcastId);
      try {
        await this.endBroadcast(userId, accountId, broadcastId);
        console.log('[YouTubeOAuth] Successfully ended previous broadcast:', broadcastId);
      } catch (err) {
        console.warn('[YouTubeOAuth] Failed to end previous broadcast (may already be ended):', broadcastId, err);
        // Remove from active broadcasts anyway
        activeBroadcasts.delete(broadcastId);
      }
    }

    // Step 1: Create the broadcast
    const broadcastResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title: options.title,
            description: options.description || '',
            scheduledStartTime: scheduledTime,
          },
          status: {
            privacyStatus: privacyStatus,
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: true,  // Auto-start when stream is received
            enableAutoStop: true,
            enableDvr: true,
            enableContentEncryption: false,
            enableEmbed: true,
            recordFromStart: true,
            startWithSlate: false,
            latencyPreference: 'normal',
          },
        }),
      }
    );

    if (!broadcastResponse.ok) {
      const error = await broadcastResponse.text();
      console.error('[YouTubeOAuth] Failed to create broadcast:', error);
      throw new Error(`Failed to create YouTube broadcast: ${error}`);
    }

    const broadcast = await broadcastResponse.json();
    console.log('[YouTubeOAuth] Broadcast created:', broadcast.id);

    // Step 2: Create the stream
    const streamResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            title: options.title + ' - Stream',
          },
          cdn: {
            frameRate: '30fps',
            ingestionType: 'rtmp',
            resolution: '720p',
          },
        }),
      }
    );

    if (!streamResponse.ok) {
      const error = await streamResponse.text();
      console.error('[YouTubeOAuth] Failed to create stream:', error);
      throw new Error(`Failed to create YouTube stream: ${error}`);
    }

    const stream = await streamResponse.json();
    console.log('[YouTubeOAuth] Stream created:', stream.id);

    // Step 3: Bind broadcast to stream
    const bindResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcast.id}&part=id,contentDetails&streamId=${stream.id}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!bindResponse.ok) {
      const error = await bindResponse.text();
      console.error('[YouTubeOAuth] Failed to bind stream:', error);
      throw new Error(`Failed to bind YouTube stream: ${error}`);
    }

    console.log('[YouTubeOAuth] Stream bound to broadcast');

    // Extract stream key and RTMP URL
    const ingestionInfo = stream.cdn?.ingestionInfo;
    const streamKey = ingestionInfo?.streamName || '';
    const rtmpUrl = ingestionInfo?.ingestionAddress || 'rtmp://a.rtmp.youtube.com/live2';

    // Store broadcast info for later transition to live
    activeBroadcasts.set(broadcast.id, {
      broadcastId: broadcast.id,
      streamId: stream.id,
      accountId: accountId,
      userId: userId,
    });

    console.log('[YouTubeOAuth] Broadcast stored for transition. Stream ID:', stream.id);

    // Start pre-warming the stream so it becomes active faster
    // This sends a placeholder stream to YouTube so the stream status becomes 'active'
    console.log('[YouTubeOAuth] Starting pre-warm for instant go-live...');
    PreWarmService.startPreWarm(
      broadcast.id,
      stream.id,
      rtmpUrl,
      streamKey,
      userId,
      accountId
    );

    return {
      id: broadcast.id,
      title: broadcast.snippet.title,
      description: broadcast.snippet.description,
      scheduledStartTime: broadcast.snippet.scheduledStartTime,
      privacyStatus: broadcast.status.privacyStatus,
      liveChatId: broadcast.snippet.liveChatId,
      streamKey: streamKey,
      rtmpUrl: rtmpUrl,
      watchUrl: `https://youtube.com/watch?v=${broadcast.id}`,
      streamId: stream.id,
    };
  }

  /**
   * Get live chat messages for a broadcast
   */
  async getLiveChatMessages(
    userId: string,
    accountId: string,
    liveChatId: string,
    pageToken?: string
  ): Promise<{
    messages: any[];
    nextPageToken?: string;
    pollingIntervalMillis: number;
  }> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('YouTube account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&maxResults=50`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get live chat: ${error}`);
    }

    const data = await response.json();

    return {
      messages: data.items || [],
      nextPageToken: data.nextPageToken,
      pollingIntervalMillis: data.pollingIntervalMillis || 5000,
    };
  }

  /**
   * End a live broadcast
   */
  async endBroadcast(userId: string, accountId: string, broadcastId: string): Promise<void> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('YouTube account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    // Transition to complete
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=complete&id=${broadcastId}&part=status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[YouTubeOAuth] Failed to end broadcast:', error);
      // Don't throw - broadcast might already be ended
    }

    console.log('[YouTubeOAuth] Broadcast ended:', broadcastId);
    
    // Remove from active broadcasts
    activeBroadcasts.delete(broadcastId);
  }

  /**
   * Check stream status - returns 'active' when ready to go live
   */
  async getStreamStatus(userId: string, accountId: string, streamId: string): Promise<string> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('YouTube account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/liveStreams?part=status&id=${streamId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[YouTubeOAuth] Failed to get stream status:', error);
      throw new Error(`Failed to get stream status: ${error}`);
    }

    const data = await response.json();
    const status = data.items?.[0]?.status?.streamStatus || 'unknown';
    console.log('[YouTubeOAuth] Stream status:', status);
    return status;
  }

  /**
   * Transition broadcast to LIVE status
   * This makes the broadcast visible to viewers
   */
  async transitionToLive(userId: string, accountId: string, broadcastId: string): Promise<boolean> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('YouTube account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    console.log('[YouTubeOAuth] Transitioning broadcast to LIVE:', broadcastId);

    // First check if stream is active
    const broadcastInfo = activeBroadcasts.get(broadcastId);
    if (broadcastInfo) {
      const streamStatus = await this.getStreamStatus(userId, accountId, broadcastInfo.streamId);
      console.log('[YouTubeOAuth] Stream status before transition:', streamStatus);
      
      if (streamStatus !== 'active') {
        console.log('[YouTubeOAuth] Stream not active yet, waiting...');
        // Wait a bit and check again
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newStatus = await this.getStreamStatus(userId, accountId, broadcastInfo.streamId);
        if (newStatus !== 'active') {
          console.log('[YouTubeOAuth] Stream still not active:', newStatus);
          return false;
        }
      }
    }

    // Transition to testing first (required step)
    const testingResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=testing&id=${broadcastId}&part=status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!testingResponse.ok) {
      const error = await testingResponse.text();
      console.error('[YouTubeOAuth] Failed to transition to testing:', error);
      // Continue anyway - might already be in testing
    } else {
      console.log('[YouTubeOAuth] Broadcast transitioned to testing');
      // Wait a moment for testing to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Now transition to live
    const liveResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=live&id=${broadcastId}&part=status`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!liveResponse.ok) {
      const error = await liveResponse.text();
      console.error('[YouTubeOAuth] Failed to transition to live:', error);
      return false;
    }

    console.log('[YouTubeOAuth] 🔴 Broadcast is now LIVE!');
    return true;
  }

  /**
   * Get broadcast status
   */
  async getBroadcastStatus(userId: string, accountId: string, broadcastId: string): Promise<string> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('YouTube account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/liveBroadcasts?part=status&id=${broadcastId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get broadcast status: ${error}`);
    }

    const data = await response.json();
    return data.items?.[0]?.status?.lifeCycleStatus || 'unknown';
  }

  /**
   * Auto-transition to live when stream becomes active
   * Call this after starting RTMP streaming
   */
  async waitAndGoLive(userId: string, accountId: string, broadcastId: string, maxWaitMs: number = 30000): Promise<boolean> {
    const broadcastInfo = activeBroadcasts.get(broadcastId);
    if (!broadcastInfo) {
      console.error('[YouTubeOAuth] Broadcast not found in active broadcasts');
      return false;
    }

    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    console.log('[YouTubeOAuth] Waiting for stream to become active...');

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const streamStatus = await this.getStreamStatus(userId, accountId, broadcastInfo.streamId);
        
        if (streamStatus === 'active') {
          console.log('[YouTubeOAuth] Stream is active! Transitioning to live...');
          return await this.transitionToLive(userId, accountId, broadcastId);
        }

        console.log(`[YouTubeOAuth] Stream status: ${streamStatus}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error('[YouTubeOAuth] Error checking stream status:', error);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    console.error('[YouTubeOAuth] Timeout waiting for stream to become active');
    return false;
  }

  /**
   * Get active live broadcasts for a user's account
   * Returns broadcasts that are currently live or ready to go live
   */
  async getActiveBroadcasts(userId: string, accountId: string): Promise<YouTubeLiveBroadcast[]> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('YouTube account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    console.log('[YouTubeOAuth] Fetching active broadcasts...');

    // Get broadcasts that are live or ready
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails&broadcastStatus=active&maxResults=10',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[YouTubeOAuth] Failed to get broadcasts:', error);
      throw new Error(`Failed to get broadcasts: ${error}`);
    }

    const data = await response.json();
    
    const broadcasts: YouTubeLiveBroadcast[] = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      scheduledStartTime: item.snippet.scheduledStartTime,
      privacyStatus: item.status.privacyStatus,
      liveChatId: item.snippet.liveChatId,
      watchUrl: `https://youtube.com/watch?v=${item.id}`,
    }));

    console.log('[YouTubeOAuth] Found', broadcasts.length, 'active broadcasts');
    return broadcasts;
  }

  /**
   * Get all broadcasts (including upcoming and completed)
   */
  async getAllBroadcasts(userId: string, accountId: string, status?: 'all' | 'active' | 'upcoming' | 'completed'): Promise<YouTubeLiveBroadcast[]> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('YouTube account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    const broadcastStatus = status || 'all';
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails&broadcastStatus=${broadcastStatus}&maxResults=25`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get broadcasts: ${error}`);
    }

    const data = await response.json();
    
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      scheduledStartTime: item.snippet.scheduledStartTime,
      privacyStatus: item.status.privacyStatus,
      liveChatId: item.snippet.liveChatId,
      watchUrl: `https://youtube.com/watch?v=${item.id}`,
    }));
  }
}

// Export singleton
export const youtubeOAuthService = new YouTubeOAuthService();
