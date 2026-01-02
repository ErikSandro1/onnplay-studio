/**
 * YouTube OAuth Routes
 * 
 * Endpoints para conectar conta YouTube via OAuth e criar lives automaticamente
 * igual StreamYard - sem necessidade de Stream Key manual
 */
import { Router, Request, Response } from 'express';
import { youtubeOAuthService } from '../services/YouTubeOAuthService';

const router = Router();

/**
 * GET /api/youtube/oauth/connect
 * Redirect to YouTube OAuth consent screen
 */
router.get('/oauth/connect', (req: Request, res: Response) => {
  try {
    // Get user ID from query or session (for demo, use query param)
    const userId = req.query.userId as string || 'default-user';
    
    console.log('[YouTube OAuth] Starting OAuth flow for user:', userId);
    
    // Generate state with user ID for callback
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const authUrl = youtubeOAuthService.getAuthUrl(state);
    console.log('[YouTube OAuth] Redirecting to:', authUrl);
    
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('[YouTube OAuth] Error starting OAuth:', error);
    res.status(500).json({
      error: 'Failed to start YouTube OAuth',
      message: error.message,
    });
  }
});

/**
 * GET /api/youtube/oauth/callback
 * Handle OAuth callback from YouTube
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('[YouTube OAuth] OAuth error:', error);
      return res.redirect('/?youtube_error=' + encodeURIComponent(error as string));
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
        console.warn('[YouTube OAuth] Failed to decode state');
      }
    }

    console.log('[YouTube OAuth] Handling callback for user:', userId);

    // Exchange code for tokens and get account info
    const account = await youtubeOAuthService.handleCallback(code, userId);

    console.log('[YouTube OAuth] Account connected:', account.channelTitle);

    // Redirect back to app with success
    res.redirect(`/?youtube_connected=true&channel=${encodeURIComponent(account.channelTitle)}`);
  } catch (error: any) {
    console.error('[YouTube OAuth] Callback error:', error);
    res.redirect('/?youtube_error=' + encodeURIComponent(error.message || 'OAuth failed'));
  }
});

/**
 * GET /api/youtube/oauth/accounts
 * Get list of connected YouTube accounts
 */
router.get('/oauth/accounts', (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || 'default-user';
    
    const accounts = youtubeOAuthService.getConnectedAccounts(userId);
    
    // Return safe account info (without tokens)
    const safeAccounts = accounts.map(a => ({
      id: a.id,
      channelId: a.channelId,
      channelTitle: a.channelTitle,
      channelThumbnail: a.channelThumbnail,
      connectedAt: a.connectedAt,
    }));

    res.json({
      accounts: safeAccounts,
      count: safeAccounts.length,
    });
  } catch (error: any) {
    console.error('[YouTube OAuth] Error getting accounts:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

/**
 * DELETE /api/youtube/oauth/accounts/:accountId
 * Disconnect a YouTube account
 */
router.delete('/oauth/accounts/:accountId', (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const userId = req.query.userId as string || 'default-user';

    const removed = youtubeOAuthService.removeAccount(userId, accountId);

    if (removed) {
      res.json({ success: true, message: 'Account disconnected' });
    } else {
      res.status(404).json({ error: 'Account not found' });
    }
  } catch (error: any) {
    console.error('[YouTube OAuth] Error removing account:', error);
    res.status(500).json({ error: 'Failed to remove account' });
  }
});

/**
 * POST /api/youtube/oauth/create-live
 * Create a new live broadcast on YouTube
 */
router.post('/oauth/create-live', async (req: Request, res: Response) => {
  try {
    const { accountId, title, description, privacyStatus } = req.body;
    const userId = req.query.userId as string || req.body.userId || 'default-user';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    console.log('[YouTube OAuth] Creating live for account:', accountId);

    const broadcast = await youtubeOAuthService.createLiveBroadcast(userId, accountId, {
      title,
      description: description || '',
      privacyStatus: privacyStatus || 'public',
    });

    console.log('[YouTube OAuth] Live created:', broadcast.id);
    console.log('[YouTube OAuth] Stream Key:', broadcast.streamKey);
    console.log('[YouTube OAuth] RTMP URL:', broadcast.rtmpUrl);

    res.json({
      success: true,
      broadcast: {
        id: broadcast.id,
        title: broadcast.title,
        description: broadcast.description,
        privacyStatus: broadcast.privacyStatus,
        watchUrl: broadcast.watchUrl,
        streamKey: broadcast.streamKey,
        rtmpUrl: broadcast.rtmpUrl,
        liveChatId: broadcast.liveChatId,
      },
    });
  } catch (error: any) {
    console.error('[YouTube OAuth] Error creating live:', error);
    res.status(500).json({
      error: 'Failed to create live broadcast',
      message: error.message,
    });
  }
});

/**
 * POST /api/youtube/oauth/end-live
 * End a live broadcast
 */
router.post('/oauth/end-live', async (req: Request, res: Response) => {
  try {
    const { accountId, broadcastId } = req.body;
    const userId = req.query.userId as string || req.body.userId || 'default-user';

    if (!accountId || !broadcastId) {
      return res.status(400).json({ error: 'Account ID and Broadcast ID are required' });
    }

    await youtubeOAuthService.endBroadcast(userId, accountId, broadcastId);

    res.json({ success: true, message: 'Broadcast ended' });
  } catch (error: any) {
    console.error('[YouTube OAuth] Error ending live:', error);
    res.status(500).json({
      error: 'Failed to end broadcast',
      message: error.message,
    });
  }
});

/**
 * POST /api/youtube/oauth/go-live
 * Transition broadcast to LIVE status (makes it visible to viewers)
 */
router.post('/oauth/go-live', async (req: Request, res: Response) => {
  try {
    const { accountId, broadcastId } = req.body;
    const userId = req.query.userId as string || req.body.userId || 'default-user';

    if (!accountId || !broadcastId) {
      return res.status(400).json({ error: 'Account ID and Broadcast ID are required' });
    }

    console.log('[YouTube OAuth] Transitioning to LIVE:', broadcastId);

    // Wait for stream to become active and then transition to live
    const success = await youtubeOAuthService.waitAndGoLive(userId, accountId, broadcastId, 60000);

    if (success) {
      res.json({ success: true, message: 'Broadcast is now LIVE!' });
    } else {
      res.status(500).json({ 
        error: 'Failed to go live', 
        message: 'Stream may not be active yet. Make sure video is being sent.' 
      });
    }
  } catch (error: any) {
    console.error('[YouTube OAuth] Error going live:', error);
    res.status(500).json({
      error: 'Failed to go live',
      message: error.message,
    });
  }
});

/**
 * GET /api/youtube/oauth/broadcast-status/:broadcastId
 * Get current broadcast status
 */
router.get('/oauth/broadcast-status/:broadcastId', async (req: Request, res: Response) => {
  try {
    const { broadcastId } = req.params;
    const { accountId } = req.query;
    const userId = req.query.userId as string || 'default-user';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const status = await youtubeOAuthService.getBroadcastStatus(userId, accountId as string, broadcastId);

    res.json({ broadcastId, status });
  } catch (error: any) {
    console.error('[YouTube OAuth] Error getting broadcast status:', error);
    res.status(500).json({
      error: 'Failed to get broadcast status',
      message: error.message,
    });
  }
});

/**
 * GET /api/youtube/oauth/chat/:liveChatId
 * Get live chat messages
 */
router.get('/oauth/chat/:liveChatId', async (req: Request, res: Response) => {
  try {
    const { liveChatId } = req.params;
    const { accountId, pageToken } = req.query;
    const userId = req.query.userId as string || 'default-user';

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const result = await youtubeOAuthService.getLiveChatMessages(
      userId,
      accountId as string,
      liveChatId,
      pageToken as string
    );

    res.json(result);
  } catch (error: any) {
    console.error('[YouTube OAuth] Error getting chat:', error);
    res.status(500).json({
      error: 'Failed to get chat messages',
      message: error.message,
    });
  }
});

export default router;
