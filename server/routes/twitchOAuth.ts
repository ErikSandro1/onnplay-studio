/**
 * Twitch OAuth Routes
 * 
 * Endpoints para conectar conta Twitch via OAuth
 * Permite chat automático e streaming sem configuração manual
 */
import { Router, Request, Response } from 'express';
import { twitchOAuthService } from '../services/TwitchOAuthService';

const router = Router();

/**
 * GET /api/twitch/oauth/connect
 * Redirect to Twitch OAuth consent screen
 */
router.get('/oauth/connect', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || 'default-user';
    
    console.log('[Twitch OAuth] Starting OAuth flow for user:', userId);
    
    // Generate state with user ID for callback
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const authUrl = twitchOAuthService.getAuthUrl(state);
    console.log('[Twitch OAuth] Redirecting to:', authUrl);
    
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('[Twitch OAuth] Error starting OAuth:', error);
    res.status(500).json({
      error: 'Failed to start Twitch OAuth',
      message: error.message,
    });
  }
});

/**
 * GET /api/twitch/oauth/callback
 * Handle OAuth callback from Twitch
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('[Twitch OAuth] OAuth error:', error, error_description);
      return res.redirect('/?twitch_error=' + encodeURIComponent(error as string));
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Decode state to get user ID
    let userId = 'default-user';
    if (state && typeof state === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        userId = decoded.userId || 'default-user';
      } catch (e) {
        console.warn('[Twitch OAuth] Failed to decode state');
      }
    }

    console.log('[Twitch OAuth] Handling callback for user:', userId);

    // Exchange code for tokens and get account info
    const account = await twitchOAuthService.handleCallback(code, userId);

    console.log('[Twitch OAuth] Account connected:', account.displayName);

    // Redirect back to app with success
    res.redirect(`/?twitch_connected=true&channel=${encodeURIComponent(account.displayName)}`);
  } catch (error: any) {
    console.error('[Twitch OAuth] Callback error:', error);
    res.redirect('/?twitch_error=' + encodeURIComponent(error.message || 'OAuth failed'));
  }
});

/**
 * GET /api/twitch/oauth/accounts
 * Get list of connected Twitch accounts
 */
router.get('/oauth/accounts', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || 'default-user';
    
    const accounts = twitchOAuthService.getConnectedAccounts(userId);
    
    // Return safe account info (without tokens)
    const safeAccounts = accounts.map(a => ({
      id: a.id,
      twitchId: a.twitchId,
      login: a.login,
      displayName: a.displayName,
      profileImageUrl: a.profileImageUrl,
      connectedAt: a.connectedAt,
    }));

    res.json({
      accounts: safeAccounts,
      count: safeAccounts.length,
    });
  } catch (error: any) {
    console.error('[Twitch OAuth] Error getting accounts:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

/**
 * DELETE /api/twitch/oauth/accounts/:accountId
 * Disconnect a Twitch account
 */
router.delete('/oauth/accounts/:accountId', (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.query.userId as string || 'default-user';

    const removed = twitchOAuthService.removeAccount(userId, accountId);

    if (removed) {
      res.json({ success: true, message: 'Account disconnected' });
    } else {
      res.status(404).json({ error: 'Account not found' });
    }
  } catch (error: any) {
    console.error('[Twitch OAuth] Error removing account:', error);
    res.status(500).json({ error: 'Failed to remove account' });
  }
});

/**
 * GET /api/twitch/oauth/stream-key
 * Get stream key for a connected account
 */
router.get('/oauth/stream-key', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.query;
    const userId = req.query.userId as string || 'default-user';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const streamKey = await twitchOAuthService.getStreamKey(userId, accountId as string);

    res.json({
      streamKey,
      rtmpUrl: 'rtmp://live.twitch.tv/app',
    });
  } catch (error: any) {
    console.error('[Twitch OAuth] Error getting stream key:', error);
    res.status(500).json({
      error: 'Failed to get stream key',
      message: error.message,
    });
  }
});

/**
 * GET /api/twitch/oauth/stream-status
 * Check if user is currently streaming
 */
router.get('/oauth/stream-status', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.query;
    const userId = req.query.userId as string || 'default-user';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const stream = await twitchOAuthService.getStreamStatus(userId, accountId as string);

    res.json({
      isLive: !!stream,
      stream,
    });
  } catch (error: any) {
    console.error('[Twitch OAuth] Error getting stream status:', error);
    res.status(500).json({
      error: 'Failed to get stream status',
      message: error.message,
    });
  }
});

/**
 * GET /api/twitch/oauth/chat-token
 * Get OAuth token for IRC chat connection
 */
router.get('/oauth/chat-token', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.query;
    const userId = req.query.userId as string || 'default-user';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const chatInfo = await twitchOAuthService.getChatToken(userId, accountId as string);

    res.json({
      token: chatInfo.token,
      username: chatInfo.username,
      channel: chatInfo.username, // Connect to own channel by default
    });
  } catch (error: any) {
    console.error('[Twitch OAuth] Error getting chat token:', error);
    res.status(500).json({
      error: 'Failed to get chat token',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/twitch/oauth/stream-info
 * Update stream title and game
 */
router.patch('/oauth/stream-info', async (req: Request, res: Response) => {
  try {
    const { accountId, title, gameId } = req.body;
    const userId = req.query.userId as string || req.body.userId || 'default-user';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const success = await twitchOAuthService.updateStreamInfo(userId, accountId, { title, gameId });

    if (success) {
      res.json({ success: true, message: 'Stream info updated' });
    } else {
      res.status(500).json({ error: 'Failed to update stream info' });
    }
  } catch (error: any) {
    console.error('[Twitch OAuth] Error updating stream info:', error);
    res.status(500).json({
      error: 'Failed to update stream info',
      message: error.message,
    });
  }
});

/**
 * GET /api/twitch/oauth/status
 * Check if Twitch OAuth is configured
 */
router.get('/oauth/status', (req: Request, res: Response) => {
  res.json({
    configured: twitchOAuthService.isConfigured(),
  });
});

export default router;
