import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export function authMiddleware(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('[authMiddleware] Request to:', req.method, req.path);
      
      // Check if authService is defined
      if (!authService) {
        console.error('[authMiddleware] ERROR: authService is undefined!');
        return res.status(500).json({
          error: 'Authentication service not available',
        });
      }

      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      console.log('[authMiddleware] Auth header present:', !!authHeader);

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[authMiddleware] Missing or invalid auth header');
        return res.status(401).json({
          error: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log('[authMiddleware] Token length:', token.length);

      // Verify token
      console.log('[authMiddleware] Verifying token...');
      const payload = authService.verifyToken(token);
      console.log('[authMiddleware] Token verified successfully:', { userId: payload.userId, email: payload.email, plan: payload.plan });

      // Attach user info to request
      (req as any).userId = payload.userId;
      (req as any).userEmail = payload.email;
      (req as any).userPlan = payload.plan;

      next();
    } catch (error: any) {
      console.error('[authMiddleware] Token verification failed:', error.message);
      console.error('[authMiddleware] Error stack:', error.stack);
      res.status(401).json({
        error: 'Invalid or expired token',
        details: error.message,
      });
    }
  };
}

/**
 * Plan requirement middleware
 * Checks if user has required plan level
 */
export function requirePlan(...allowedPlans: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPlan = (req as any).userPlan;

    if (!allowedPlans.includes(userPlan)) {
      return res.status(403).json({
        error: 'Upgrade required',
        message: `This feature requires ${allowedPlans.join(' or ')} plan`,
        requiredPlans: allowedPlans,
      });
    }

    next();
  };
}
