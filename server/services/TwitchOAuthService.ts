/**
 * TwitchOAuthService - OAuth para Twitch
 * 
 * Permite conectar conta do Twitch via OAuth para:
 * - Chat automático (sem precisar digitar nome do canal)
 * - Stream automático via RTMP
 */

interface TwitchUser {
  id: string;
  login: string;
  displayName: string;
  profileImageUrl: string;
  broadcasterType: string;
}

interface ConnectedTwitchAccount {
  id: string;
  twitchId: string;
  login: string;
  displayName: string;
  profileImageUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  connectedAt: number;
  scopes: string[];
}

interface TwitchStream {
  id: string;
  title: string;
  viewerCount: number;
  startedAt: string;
  thumbnailUrl: string;
  isLive: boolean;
}

// Store connected accounts in memory (in production, use database)
const connectedAccounts: Map<string, ConnectedTwitchAccount[]> = new Map();

export class TwitchOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.TWITCH_CLIENT_ID || '';
    this.clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
    this.redirectUri = process.env.TWITCH_OAUTH_REDIRECT_URI || 
                       process.env.OAUTH_SERVER_URL + '/api/twitch/oauth/callback' ||
                       'https://www.onnplay.com/api/twitch/oauth/callback';

    console.log('[TwitchOAuth] Initializing...');
    console.log('[TwitchOAuth] Client ID present:', !!this.clientId);
    console.log('[TwitchOAuth] Redirect URI:', this.redirectUri);
  }

  /**
   * Check if Twitch OAuth is configured
   */
  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  /**
   * Get OAuth URL for Twitch with required scopes
   */
  getAuthUrl(state?: string): string {
    if (!this.clientId) {
      throw new Error('Twitch OAuth not configured - missing TWITCH_CLIENT_ID');
    }

    const scopes = [
      'user:read:email',
      'chat:read',
      'chat:edit',
      'channel:read:stream_key',
      'channel:manage:broadcast',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
    });

    if (state) {
      params.append('state', state);
    }

    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens and get user info
   */
  async handleCallback(code: string, userId: string): Promise<ConnectedTwitchAccount> {
    console.log('[TwitchOAuth] Handling callback for user:', userId);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[TwitchOAuth] Token exchange failed:', error);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();
    console.log('[TwitchOAuth] Got tokens, access_token present:', !!tokens.access_token);

    // Get user info
    const userInfo = await this.getUserInfo(tokens.access_token);
    console.log('[TwitchOAuth] Got user info:', userInfo.displayName);

    // Create connected account
    const account: ConnectedTwitchAccount = {
      id: `twitch-${userInfo.id}-${Date.now()}`,
      twitchId: userInfo.id,
      login: userInfo.login,
      displayName: userInfo.displayName,
      profileImageUrl: userInfo.profileImageUrl,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      connectedAt: Date.now(),
      scopes: tokens.scope || [],
    };

    // Store account
    const userAccounts = connectedAccounts.get(userId) || [];
    
    // Remove existing account for same Twitch user
    const filteredAccounts = userAccounts.filter(a => a.twitchId !== userInfo.id);
    filteredAccounts.push(account);
    connectedAccounts.set(userId, filteredAccounts);

    console.log('[TwitchOAuth] Account connected successfully');
    return account;
  }

  /**
   * Get Twitch user info
   */
  private async getUserInfo(accessToken: string): Promise<TwitchUser> {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[TwitchOAuth] Failed to get user info:', error);
      throw new Error('Failed to get Twitch user info');
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No Twitch user found');
    }

    const user = data.data[0];
    return {
      id: user.id,
      login: user.login,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url,
      broadcasterType: user.broadcaster_type,
    };
  }

  /**
   * Get connected accounts for a user
   */
  getConnectedAccounts(userId: string): ConnectedTwitchAccount[] {
    return connectedAccounts.get(userId) || [];
  }

  /**
   * Remove a connected account
   */
  removeAccount(userId: string, accountId: string): boolean {
    const accounts = connectedAccounts.get(userId) || [];
    const filtered = accounts.filter(a => a.id !== accountId);
    
    if (filtered.length !== accounts.length) {
      connectedAccounts.set(userId, filtered);
      return true;
    }
    return false;
  }

  /**
   * Refresh access token if expired
   */
  private async refreshAccessToken(account: ConnectedTwitchAccount): Promise<string> {
    if (Date.now() < account.expiresAt - 60000) {
      // Token still valid (with 1 minute buffer)
      return account.accessToken;
    }

    if (!account.refreshToken) {
      throw new Error('No refresh token available - user needs to reconnect');
    }

    console.log('[TwitchOAuth] Refreshing access token...');

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token - user needs to reconnect');
    }

    const tokens = await response.json();
    
    // Update stored account
    account.accessToken = tokens.access_token;
    account.refreshToken = tokens.refresh_token || account.refreshToken;
    account.expiresAt = Date.now() + (tokens.expires_in * 1000);

    return account.accessToken;
  }

  /**
   * Get stream key for the connected account
   */
  async getStreamKey(userId: string, accountId: string): Promise<string> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('Twitch account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    const response = await fetch(
      `https://api.twitch.tv/helix/streams/key?broadcaster_id=${account.twitchId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get stream key: ${error}`);
    }

    const data = await response.json();
    return data.data?.[0]?.stream_key || '';
  }

  /**
   * Check if user is currently streaming
   */
  async getStreamStatus(userId: string, accountId: string): Promise<TwitchStream | null> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('Twitch account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_id=${account.twitchId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get stream status: ${error}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return null; // Not streaming
    }

    const stream = data.data[0];
    return {
      id: stream.id,
      title: stream.title,
      viewerCount: stream.viewer_count,
      startedAt: stream.started_at,
      thumbnailUrl: stream.thumbnail_url,
      isLive: true,
    };
  }

  /**
   * Get OAuth token for IRC chat connection
   * Returns the access token that can be used as IRC password
   */
  async getChatToken(userId: string, accountId: string): Promise<{ token: string; username: string }> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('Twitch account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    return {
      token: accessToken,
      username: account.login,
    };
  }

  /**
   * Update stream title and game
   */
  async updateStreamInfo(
    userId: string, 
    accountId: string, 
    options: { title?: string; gameId?: string }
  ): Promise<boolean> {
    const accounts = connectedAccounts.get(userId) || [];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('Twitch account not found');
    }

    const accessToken = await this.refreshAccessToken(account);

    const body: any = {};
    if (options.title) body.title = options.title;
    if (options.gameId) body.game_id = options.gameId;

    const response = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${account.twitchId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': this.clientId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    return response.ok;
  }
}

// Export singleton
export const twitchOAuthService = new TwitchOAuthService();
