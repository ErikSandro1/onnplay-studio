/**
 * YouTube API Routes
 * Handles YouTube Live Chat integration
 */
import { Router, Request, Response } from 'express';

const router = Router();

// YouTube Data API v3 key (should be in environment variables)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

interface YouTubeComment {
  id: string;
  authorDisplayName: string;
  authorProfileImageUrl: string;
  authorChannelId: string;
  textDisplay: string;
  publishedAt: string;
  likeCount: number;
  isSuperChat?: boolean;
  superChatAmount?: string;
}

// Cache for liveChatId to avoid repeated API calls
const liveChatIdCache: Map<string, { chatId: string; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get live chat ID from video ID
 */
async function getLiveChatId(videoId: string): Promise<string | null> {
  // Check cache first
  const cached = liveChatIdCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.chatId;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const liveChatId = data.items[0].liveStreamingDetails?.activeLiveChatId;
      
      if (liveChatId) {
        // Cache the result
        liveChatIdCache.set(videoId, { chatId: liveChatId, timestamp: Date.now() });
        return liveChatId;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting live chat ID:', error);
    return null;
  }
}

/**
 * Fetch live chat messages
 */
async function fetchLiveChatMessages(liveChatId: string, pageToken?: string): Promise<{
  comments: YouTubeComment[];
  nextPageToken?: string;
  pollingIntervalMillis?: number;
}> {
  try {
    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&maxResults=50&key=${YOUTUBE_API_KEY}`;
    
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    const comments: YouTubeComment[] = (data.items || []).map((item: any) => ({
      id: item.id,
      authorDisplayName: item.authorDetails?.displayName || 'Unknown',
      authorProfileImageUrl: item.authorDetails?.profileImageUrl || '',
      authorChannelId: item.authorDetails?.channelId || '',
      textDisplay: item.snippet?.displayMessage || item.snippet?.textMessageDetails?.messageText || '',
      publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
      likeCount: 0,
      isSuperChat: item.snippet?.type === 'superChatEvent',
      superChatAmount: item.snippet?.superChatDetails?.amountDisplayString,
    }));

    return {
      comments,
      nextPageToken: data.nextPageToken,
      pollingIntervalMillis: data.pollingIntervalMillis,
    };
  } catch (error) {
    console.error('Error fetching live chat messages:', error);
    return { comments: [] };
  }
}

/**
 * GET /api/youtube/comments/:videoId
 * Fetch live chat comments for a YouTube video
 */
router.get('/comments/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { pageToken } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  // Check if API key is configured
  if (!YOUTUBE_API_KEY) {
    // Return mock data for testing when API key is not configured
    console.log('YouTube API key not configured, returning mock data');
    
    const mockComments: YouTubeComment[] = [
      {
        id: `mock-${Date.now()}-1`,
        authorDisplayName: 'TestUser1',
        authorProfileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestUser1',
        authorChannelId: 'UC123',
        textDisplay: 'Olá! Teste de comentário ao vivo!',
        publishedAt: new Date().toISOString(),
        likeCount: 0,
      },
      {
        id: `mock-${Date.now()}-2`,
        authorDisplayName: 'TestUser2',
        authorProfileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestUser2',
        authorChannelId: 'UC456',
        textDisplay: 'Ótima transmissão! 🔥',
        publishedAt: new Date(Date.now() - 30000).toISOString(),
        likeCount: 5,
      },
    ];

    return res.json({
      comments: mockComments,
      source: 'mock',
      message: 'API key not configured - using mock data',
    });
  }

  try {
    // Get live chat ID
    const liveChatId = await getLiveChatId(videoId);

    if (!liveChatId) {
      return res.status(404).json({ 
        error: 'Live chat not found',
        message: 'This video may not be a live stream or the live chat is not available'
      });
    }

    // Fetch messages
    const result = await fetchLiveChatMessages(liveChatId, pageToken as string);

    return res.json({
      comments: result.comments,
      nextPageToken: result.nextPageToken,
      pollingIntervalMillis: result.pollingIntervalMillis,
      liveChatId,
    });
  } catch (error) {
    console.error('Error in YouTube comments route:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch comments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/youtube/status/:videoId
 * Check if a video has an active live chat
 */
router.get('/status/:videoId', async (req: Request, res: Response) => {
  const { videoId } = req.params;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  if (!YOUTUBE_API_KEY) {
    return res.json({
      isLive: true,
      hasChat: true,
      source: 'mock',
    });
  }

  try {
    const liveChatId = await getLiveChatId(videoId);

    return res.json({
      isLive: !!liveChatId,
      hasChat: !!liveChatId,
      liveChatId,
    });
  } catch (error) {
    console.error('Error checking video status:', error);
    return res.status(500).json({ error: 'Failed to check video status' });
  }
});

export default router;
