import express, { Request, Response } from 'express';
import { BroadcastTrackingService } from '../services/BroadcastTrackingService';
import { AuthService } from '../services/AuthService';
import { authMiddleware } from '../middleware/auth';

export function createBroadcastRoutes(
  broadcastService: BroadcastTrackingService,
  authService: AuthService
) {
  const router = express.Router();

  /**
   * POST /api/broadcast/start
   * Start a broadcast session
   */
  router.post(
    '/start',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const { platform, quality, participantsCount } = req.body;

        if (!platform || !quality) {
          return res.status(400).json({
            error: 'Platform and quality are required',
          });
        }

        const broadcastId = await broadcastService.startBroadcast(
          userId,
          platform,
          quality,
          participantsCount || 1
        );

        res.json({
          success: true,
          broadcastId,
        });
      } catch (error: any) {
        console.error('Start broadcast error:', error);
        res.status(500).json({
          error: 'Failed to start broadcast',
        });
      }
    }
  );

  /**
   * POST /api/broadcast/end
   * End a broadcast session
   */
  router.post(
    '/end',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const { broadcastId, peakViewers } = req.body;

        if (!broadcastId) {
          return res.status(400).json({
            error: 'Broadcast ID is required',
          });
        }

        await broadcastService.endBroadcast(broadcastId, peakViewers);

        res.json({
          success: true,
          message: 'Broadcast ended successfully',
        });
      } catch (error: any) {
        console.error('End broadcast error:', error);
        res.status(500).json({
          error: 'Failed to end broadcast',
        });
      }
    }
  );

  /**
   * POST /api/broadcast/fail
   * Mark broadcast as failed
   */
  router.post(
    '/fail',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const { broadcastId } = req.body;

        if (!broadcastId) {
          return res.status(400).json({
            error: 'Broadcast ID is required',
          });
        }

        await broadcastService.failBroadcast(broadcastId);

        res.json({
          success: true,
          message: 'Broadcast marked as failed',
        });
      } catch (error: any) {
        console.error('Fail broadcast error:', error);
        res.status(500).json({
          error: 'Failed to mark broadcast as failed',
        });
      }
    }
  );

  /**
   * POST /api/broadcast/viewers
   * Update peak viewers
   */
  router.post(
    '/viewers',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const { broadcastId, viewers } = req.body;

        if (!broadcastId || typeof viewers !== 'number') {
          return res.status(400).json({
            error: 'Broadcast ID and viewers count are required',
          });
        }

        await broadcastService.updatePeakViewers(broadcastId, viewers);

        res.json({
          success: true,
        });
      } catch (error: any) {
        console.error('Update viewers error:', error);
        res.status(500).json({
          error: 'Failed to update viewers',
        });
      }
    }
  );

  /**
   * GET /api/broadcast/history
   * Get user's broadcast history
   */
  router.get(
    '/history',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const limit = parseInt(req.query.limit as string) || 10;

        const broadcasts = await broadcastService.getUserBroadcasts(userId, limit);

        res.json({
          success: true,
          broadcasts,
        });
      } catch (error: any) {
        console.error('Get broadcast history error:', error);
        res.status(500).json({
          error: 'Failed to get broadcast history',
        });
      }
    }
  );

  /**
   * GET /api/broadcast/active
   * Get active broadcasts
   */
  router.get(
    '/active',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;

        const broadcasts = await broadcastService.getActiveBroadcasts(userId);

        res.json({
          success: true,
          broadcasts,
        });
      } catch (error: any) {
        console.error('Get active broadcasts error:', error);
        res.status(500).json({
          error: 'Failed to get active broadcasts',
        });
      }
    }
  );

  /**
   * POST /api/broadcast/recording/start
   * Start a recording session
   */
  router.post(
    '/recording/start',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const { filename, quality } = req.body;

        if (!filename || !quality) {
          return res.status(400).json({
            error: 'Filename and quality are required',
          });
        }

        const recordingId = await broadcastService.startRecording(
          userId,
          filename,
          quality
        );

        res.json({
          success: true,
          recordingId,
        });
      } catch (error: any) {
        console.error('Start recording error:', error);
        res.status(500).json({
          error: 'Failed to start recording',
        });
      }
    }
  );

  /**
   * POST /api/broadcast/recording/end
   * End a recording session
   */
  router.post(
    '/recording/end',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const { recordingId, fileSizeMb } = req.body;

        if (!recordingId || typeof fileSizeMb !== 'number') {
          return res.status(400).json({
            error: 'Recording ID and file size are required',
          });
        }

        await broadcastService.endRecording(recordingId, fileSizeMb);

        res.json({
          success: true,
          message: 'Recording ended successfully',
        });
      } catch (error: any) {
        console.error('End recording error:', error);
        res.status(500).json({
          error: 'Failed to end recording',
        });
      }
    }
  );

  /**
   * GET /api/broadcast/recordings
   * Get user's recordings
   */
  router.get(
    '/recordings',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const limit = parseInt(req.query.limit as string) || 10;

        const recordings = await broadcastService.getUserRecordings(userId, limit);

        res.json({
          success: true,
          recordings,
        });
      } catch (error: any) {
        console.error('Get recordings error:', error);
        res.status(500).json({
          error: 'Failed to get recordings',
        });
      }
    }
  );

  /**
   * GET /api/broadcast/stats
   * Get user's total stats
   */
  router.get(
    '/stats',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;

        const stats = await broadcastService.getUserStats(userId);

        res.json({
          success: true,
          stats,
        });
      } catch (error: any) {
        console.error('Get stats error:', error);
        res.status(500).json({
          error: 'Failed to get stats',
        });
      }
    }
  );

  return router;
}
