import express, { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { authMiddleware } from '../middleware/auth';

export function createAuthRoutes(authService: AuthService) {
  const router = express.Router();

  /**
   * POST /api/auth/register
   * Register new user
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({
          error: 'Missing required fields',
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters',
        });
      }

      const result = await authService.register({ email, password, name });

      res.status(201).json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(400).json({
        error: error.message || 'Registration failed',
      });
    }
  });

  /**
   * POST /api/auth/login
   * Login with email/password
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing email or password',
        });
      }

      const result = await authService.login({ email, password });

      res.json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({
        error: error.message || 'Login failed',
      });
    }
  });

  /**
   * POST /api/auth/oauth/google
   * OAuth login with Google
   */
  router.post('/oauth/google', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      // TODO: Verify Google token and extract user info
      // For now, accepting user info directly (implement proper OAuth flow in production)
      const { email, name, picture, sub } = req.body;

      if (!email || !name || !sub) {
        return res.status(400).json({
          error: 'Missing required OAuth data',
        });
      }

      const result = await authService.oauthLogin(
        'google',
        sub,
        email,
        name,
        picture
      );

      res.json({
        success: true,
        user: result.user,
        token: result.token,
        isNewUser: result.isNewUser,
      });
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      res.status(400).json({
        error: error.message || 'OAuth login failed',
      });
    }
  });

  /**
   * POST /api/auth/oauth/github
   * OAuth login with GitHub
   */
  router.post('/oauth/github', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      // TODO: Verify GitHub token and extract user info
      // For now, accepting user info directly (implement proper OAuth flow in production)
      const { email, name, avatar_url, id } = req.body;

      if (!email || !name || !id) {
        return res.status(400).json({
          error: 'Missing required OAuth data',
        });
      }

      const result = await authService.oauthLogin(
        'github',
        String(id),
        email,
        name,
        avatar_url
      );

      res.json({
        success: true,
        user: result.user,
        token: result.token,
        isNewUser: result.isNewUser,
      });
    } catch (error: any) {
      console.error('GitHub OAuth error:', error);
      res.status(400).json({
        error: error.message || 'OAuth login failed',
      });
    }
  });

  /**
   * GET /api/auth/me
   * Get current user (protected route)
   */
  router.get('/me', authMiddleware(authService), async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const user = await authService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({
        error: 'Failed to get user',
      });
    }
  });

  /**
   * PUT /api/auth/profile
   * Update user profile (protected route)
   */
  router.put('/profile', authMiddleware(authService), async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { name, avatar_url } = req.body;

      const user = await authService.updateProfile(userId, {
        name,
        avatar_url,
      });

      res.json({
        success: true,
        user,
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(400).json({
        error: error.message || 'Failed to update profile',
      });
    }
  });

  /**
   * POST /api/auth/change-password
   * Change password (protected route)
   */
  router.post('/change-password', authMiddleware(authService), async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Missing required fields',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'New password must be at least 8 characters',
        });
      }

      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      res.status(400).json({
        error: error.message || 'Failed to change password',
      });
    }
  });

  /**
   * DELETE /api/auth/account
   * Delete user account (protected route)
   */
  router.delete('/account', authMiddleware(authService), async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;

      await authService.deleteAccount(userId);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete account error:', error);
      res.status(500).json({
        error: 'Failed to delete account',
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout (client-side token removal, server just confirms)
   */
  router.post('/logout', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });

  return router;
}
