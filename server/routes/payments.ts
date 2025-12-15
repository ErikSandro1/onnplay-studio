import express, { Request, Response } from 'express';
import { StripeService, PLANS } from '../services/StripeService';
import { AuthService } from '../services/AuthService';
import { authMiddleware } from '../middleware/auth';

export function createPaymentRoutes(
  stripeService: StripeService,
  authService: AuthService
) {
  const router = express.Router();

  /**
   * GET /api/payments/plans
   * Get available pricing plans
   */
  router.get('/plans', (req: Request, res: Response) => {
    res.json({
      success: true,
      plans: Object.values(PLANS).map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price / 100, // Convert to dollars
        features: plan.features,
      })),
    });
  });

  /**
   * POST /api/payments/create-checkout
   * Create Stripe checkout session
   */
  router.post(
    '/create-checkout',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const { plan } = req.body;

        if (!plan || (plan !== 'pro' && plan !== 'enterprise')) {
          return res.status(400).json({
            error: 'Invalid plan',
          });
        }

        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const successUrl = `${baseUrl}/dashboard?checkout=success`;
        const cancelUrl = `${baseUrl}/pricing?checkout=canceled`;

        const session = await stripeService.createCheckoutSession(
          userId,
          plan,
          successUrl,
          cancelUrl
        );

        res.json({
          success: true,
          sessionId: session.sessionId,
          url: session.url,
        });
      } catch (error: any) {
        console.error('Create checkout error:', error);
        res.status(500).json({
          error: error.message || 'Failed to create checkout session',
        });
      }
    }
  );



  /**
   * POST /api/payments/create-portal
   * Create Stripe customer portal session
   */
  router.post(
    '/create-portal',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;

        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const returnUrl = `${baseUrl}/dashboard`;

        const session = await stripeService.createPortalSession(
          userId,
          returnUrl
        );

        res.json({
          success: true,
          url: session.url,
        });
      } catch (error: any) {
        console.error('Create portal error:', error);
        res.status(500).json({
          error: error.message || 'Failed to create portal session',
        });
      }
    }
  );

  /**
   * POST /api/payments/webhook
   * Handle Stripe webhook events
   */
  router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      try {
        const signature = req.headers['stripe-signature'] as string;

        if (!signature) {
          return res.status(400).json({
            error: 'Missing stripe-signature header',
          });
        }

        await stripeService.handleWebhook(req.body, signature);

        res.json({ received: true });
      } catch (error: any) {
        console.error('Webhook error:', error);
        res.status(400).json({
          error: error.message || 'Webhook handling failed',
        });
      }
    }
  );

  /**
   * GET /api/payments/subscription
   * Get user's current subscription
   */
  router.get(
    '/subscription',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;

        const subscription = await stripeService.getUserSubscription(userId);

        res.json({
          success: true,
          subscription,
        });
      } catch (error: any) {
        console.error('Get subscription error:', error);
        res.status(500).json({
          error: 'Failed to get subscription',
        });
      }
    }
  );

  /**
   * POST /api/payments/cancel
   * Cancel subscription
   */
  router.post(
    '/cancel',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;

        await stripeService.cancelSubscription(userId);

        res.json({
          success: true,
          message: 'Subscription will be canceled at the end of the billing period',
        });
      } catch (error: any) {
        console.error('Cancel subscription error:', error);
        res.status(400).json({
          error: error.message || 'Failed to cancel subscription',
        });
      }
    }
  );

  /**
   * POST /api/payments/reactivate
   * Reactivate canceled subscription
   */
  router.post(
    '/reactivate',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;

        await stripeService.reactivateSubscription(userId);

        res.json({
          success: true,
          message: 'Subscription reactivated successfully',
        });
      } catch (error: any) {
        console.error('Reactivate subscription error:', error);
        res.status(400).json({
          error: error.message || 'Failed to reactivate subscription',
        });
      }
    }
  );

  /**
   * GET /api/payments/history
   * Get payment history
   */
  router.get(
    '/history',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;

        const history = await stripeService.getPaymentHistory(userId);

        res.json({
          success: true,
          history,
        });
      } catch (error: any) {
        console.error('Get payment history error:', error);
        res.status(500).json({
          error: 'Failed to get payment history',
        });
      }
    }
  );

  /**
   * POST /api/payments/change-plan
   * Change subscription plan (upgrade/downgrade)
   */
  router.post(
    '/change-plan',
    authMiddleware(authService),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).userId;
        const { plan } = req.body;

        if (!plan || (plan !== 'pro' && plan !== 'enterprise')) {
          return res.status(400).json({
            error: 'Invalid plan',
          });
        }

        await stripeService.changeSubscriptionPlan(userId, plan);

        res.json({
          success: true,
          message: 'Plan changed successfully',
        });
      } catch (error: any) {
        console.error('Change plan error:', error);
        res.status(400).json({
          error: error.message || 'Failed to change plan',
        });
      }
    }
  );

  return router;
}
