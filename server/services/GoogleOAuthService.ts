import { OAuth2Client } from 'google-auth-library';

export class GoogleOAuthService {
  private client: OAuth2Client;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/auth/google/callback';

    if (!clientId || !clientSecret) {
      console.warn('[Google OAuth] WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
      console.warn('[Google OAuth] Google Sign-In will not work until these are set');
    }

    this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  /**
   * Get Google OAuth authorization URL
   */
  getAuthUrl(): string {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth not configured');
    }

    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
  }

  /**
   * Exchange authorization code for user info
   */
  async getUserInfo(code: string): Promise<{
    id: string;
    email: string;
    name: string;
    picture?: string;
  }> {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Google OAuth not configured');
    }

    // Exchange code for tokens
    const { tokens } = await this.client.getToken(code);
    this.client.setCredentials(tokens);

    // Get user info
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Failed to get user info from Google');
    }

    return {
      id: payload.sub,
      email: payload.email!,
      name: payload.name || payload.email!,
      picture: payload.picture,
    };
  }
}
