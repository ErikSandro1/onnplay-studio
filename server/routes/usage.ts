import express, { Request, Response } from 'express';
import { UsageLimitService } from '../services/UsageLimitService';
import { AuthService } from '../services/AuthService';
import { authMiddleware } from '../middleware/auth';

export function createUsageRoutes(
  usageLimitService: UsageLimitService,
  authService: AuthService
) {
  const router = express.Router();

  /**
   * GET /api/usage/summary
   * Get usage summary with limits
   */
  router.get(
    '/summary',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const userPlan = (req as any).userPlan;

        const summary = await usageLimitService.getUsageSummary(userId, userPlan);

        res.json({
          success: true,
          summary,
        });
      } catch (error: any) {
        console.error('Get usage summary error:', error);
        res.status(500).json({
          error: 'Failed to get usage summary',
        });
      }
    }
  );

  /**
   * GET /api/usage/limits
   * Get plan limits
   */
  router.get(
    '/limits',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userPlan = (req as any).userPlan;
        const limits = usageLimitService.getPlanLimits(userPlan);

        res.json({
          success: true,
          limits,
        });
      } catch (error: any) {
        console.error('Get limits error:', error);
        res.status(500).json({
          error: 'Failed to get limits',
        });
      }
    }
  );

  /**
   * POST /api/usage/check/streaming
   * Check if user can start streaming
   */
  router.post(
    '/check/streaming',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const userPlan = (req as any).userPlan;

        const result = await usageLimitService.canStartStreaming(userId, userPlan);

        if (!result.allowed) {
          return res.status(403).json({
            success: false,
            allowed: false,
            reason: result.reason,
            upgradeRequired: result.upgradeRequired,
          });
        }

        res.json({
          success: true,
          allowed: true,
          remainingMinutes: result.remainingMinutes,
        });
      } catch (error: any) {
        console.error('Check streaming error:', error);
        res.status(500).json({
          error: 'Failed to check streaming permission',
        });
      }
    }
  );

  /**
   * POST /api/usage/check/recording
   * Check if user can start recording
   */
  router.post(
    '/check/recording',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const userPlan = (req as any).userPlan;

        const result = await usageLimitService.canStartRecording(userId, userPlan);

        if (!result.allowed) {
          return res.status(403).json({
            success: false,
            allowed: false,
            reason: result.reason,
            upgradeRequired: result.upgradeRequired,
          });
        }

        res.json({
          success: true,
          allowed: true,
          remainingMinutes: result.remainingMinutes,
        });
      } catch (error: any) {
        console.error('Check recording error:', error);
        res.status(500).json({
          error: 'Failed to check recording permission',
        });
      }
    }
  );

  /**
   * POST /api/usage/check/ai
   * Check if user can use AI Assistant
   */
  router.post(
    '/check/ai',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userPlan = (req as any).userPlan;

        const result = usageLimitService.canUseAI(userPlan);

        if (!result.allowed) {
          return res.status(403).json({
            success: false,
            allowed: false,
            reason: result.reason,
            upgradeRequired: result.upgradeRequired,
          });
        }

        res.json({
          success: true,
          allowed: true,
        });
      } catch (error: any) {
        console.error('Check AI error:', error);
        res.status(500).json({
          error: 'Failed to check AI permission',
        });
      }
    }
  );

  /**
   * POST /api/usage/check/quality
   * Check if quality is allowed
   */
  router.post(
    '/check/quality',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userPlan = (req as any).userPlan;
        const { quality } = req.body;

        if (!quality) {
          return res.status(400).json({
            error: 'Quality is required',
          });
        }

        const result = usageLimitService.isQualityAllowed(userPlan, quality);

        if (!result.allowed) {
          return res.status(403).json({
            success: false,
            allowed: false,
            reason: result.reason,
            upgradeRequired: result.upgradeRequired,
          });
        }

        res.json({
          success: true,
          allowed: true,
        });
      } catch (error: any) {
        console.error('Check quality error:', error);
        res.status(500).json({
          error: 'Failed to check quality permission',
        });
      }
    }
  );

  /**
   * POST /api/usage/check/participants
   * Check if participant count is allowed
   */
  router.post(
    '/check/participants',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userPlan = (req as any).userPlan;
        const { count } = req.body;

        if (!count) {
          return res.status(400).json({
            error: 'Participant count is required',
          });
        }

        const result = usageLimitService.isParticipantCountAllowed(userPlan, count);

        if (!result.allowed) {
          return res.status(403).json({
            success: false,
            allowed: false,
            reason: result.reason,
            upgradeRequired: result.upgradeRequired,
          });
        }

        res.json({
          success: true,
          allowed: true,
        });
      } catch (error: any) {
        console.error('Check participants error:', error);
        res.status(500).json({
          error: 'Failed to check participants permission',
        });
      }
    }
  );

  /**
   * POST /api/usage/increment/streaming
   * Increment streaming minutes
   */
  router.post(
    '/increment/streaming',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const { minutes } = req.body;

        if (!minutes || minutes <= 0) {
          return res.status(400).json({
            error: 'Valid minutes value is required',
          });
        }

        await usageLimitService.incrementStreamingMinutes(userId, minutes);

        res.json({
          success: true,
          message: 'Streaming minutes incremented',
        });
      } catch (error: any) {
        console.error('Increment streaming error:', error);
        res.status(500).json({
          error: 'Failed to increment streaming minutes',
        });
      }
    }
  );

  /**
   * POST /api/usage/increment/recording
   * Increment recording minutes
   */
  router.post(
    '/increment/recording',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const { minutes } = req.body;

        if (!minutes || minutes <= 0) {
          return res.status(400).json({
            error: 'Valid minutes value is required',
          });
        }

        await usageLimitService.incrementRecordingMinutes(userId, minutes);

        res.json({
          success: true,
          message: 'Recording minutes incremented',
        });
      } catch (error: any) {
        console.error('Increment recording error:', error);
        res.status(500).json({
          error: 'Failed to increment recording minutes',
        });
      }
    }
  );

  /**
   * POST /api/usage/increment/ai
   * Increment AI commands count
   */
  router.post(
    '/increment/ai',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const { count = 1 } = req.body;

        await usageLimitService.incrementAICommands(userId, count);

        res.json({
          success: true,
          message: 'AI commands count incremented',
        });
      } catch (error: any) {
        console.error('Increment AI error:', error);
        res.status(500).json({
          error: 'Failed to increment AI commands',
        });
      }
    }
  );

  return router;
}
