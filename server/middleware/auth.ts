import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export function authMiddleware(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const payload = authService.verifyToken(token);

      // Attach user info to request
      (req as any).userId = payload.userId;
      (req as any).userEmail = payload.email;
      (req as any).userPlan = payload.plan;

      next();
    } catch (error: any) {
      console.error('Auth middleware error:', error);
      res.status(401).json({
        error: 'Invalid or expired token',
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
