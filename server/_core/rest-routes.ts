import express from 'express';
import { getDbPool } from '../db/connection';
import { AuthService } from '../services/AuthService';
import { StripeService } from '../services/StripeService';
import { UsageLimitService } from '../services/UsageLimitService';
import { BroadcastTrackingService } from '../services/BroadcastTrackingService';
import { createAuthRoutes } from '../routes/auth';
import { createPaymentRoutes } from '../routes/payments';
import { createUsageRoutes } from '../routes/usage';
import { createBroadcastRoutes } from '../routes/broadcast';
import youtubeRoutes from '../routes/youtube';
import youtubeOAuthRoutes from '../routes/youtubeOAuth';

/**
 * Setup REST API routes
 * Integrates authentication, payments, usage tracking, and broadcast routes
 */
export function setupRestRoutes(app: express.Application) {
  // Get database connection
  const db = getDbPool();

  // Initialize services with database
  const authService = new AuthService(db);
  const stripeService = new StripeService(db);
  const usageLimitService = new UsageLimitService(db);
  const broadcastTrackingService = new BroadcastTrackingService(db);

  // Create routers
  const authRoutes = createAuthRoutes(authService);
  const paymentRoutes = createPaymentRoutes(stripeService, authService);
  const usageRoutes = createUsageRoutes(usageLimitService, authService);
  const broadcastRoutes = createBroadcastRoutes(broadcastTrackingService, authService);

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/usage', usageRoutes);
  app.use('/api/broadcast', broadcastRoutes);
  app.use('/api/youtube', youtubeRoutes);
  app.use('/api/youtube', youtubeOAuthRoutes);

  console.log('✅ REST API routes configured');
  console.log('   - /api/auth/*');
  console.log('   - /api/payments/*');
  console.log('   - /api/usage/*');
  console.log('   - /api/broadcast/*');
  console.log('   - /api/youtube/*');
  console.log('   - /api/youtube/oauth/*');
}
