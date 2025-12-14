import express, { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { GoogleOAuthService } from '../services/GoogleOAuthService';
import { authMiddleware } from '../middleware/auth';
import { authLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import { isValidEmail, isValidName, getPasswordValidationError, sanitizeString } from '../middleware/validation';

export function createAuthRoutes(authService: AuthService) {
  const router = express.Router();

  /**
   * POST /api/auth/register
   * Register new user
   */
  router.post('/register', registerLimiter, async (req: Request, res: Response) => {
    try {
      let { email, password, name } = req.body;

      // Validation
      if (!email || !password || !name) {
        return res.status(400).json({
          error: 'Missing required fields',
        });
      }

      // Sanitize inputs
      email = sanitizeString(email).toLowerCase();
      name = sanitizeString(name);

      // Validate email
      if (!isValidEmail(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
        });
      }

      // Validate name
      if (!isValidName(name)) {
        return res.status(400).json({
          error: 'Name must be 2-100 characters and contain only letters',
        });
      }

      // Validate password
      const passwordError = getPasswordValidationError(password);
      if (passwordError) {
        return res.status(400).json({
          error: passwordError,
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
  router.post('/login', authLimiter, async (req: Request, res: Response) => {
    try {
      let { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Missing email or password',
        });
      }

      // Sanitize email
      email = sanitizeString(email).toLowerCase();

      // Validate email
      if (!isValidEmail(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
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
   * GET /api/auth/google
   * Get Google OAuth URL
   */
  router.get('/google', (req: Request, res: Response) => {
    try {
      const googleOAuth = new GoogleOAuthService();
      const authUrl = googleOAuth.getAuthUrl();
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('Google OAuth URL error:', error);
      res.status(500).json({
        error: error.message || 'Failed to get Google OAuth URL',
      });
    }
  });

  /**
   * GET /api/auth/google/callback
   * Google OAuth callback
   */
  router.get('/google/callback', async (req: Request, res: Response) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).send('Missing authorization code');
      }

      const googleOAuth = new GoogleOAuthService();
      const userInfo = await googleOAuth.getUserInfo(code);

      const result = await authService.oauthLogin(
        'google',
        userInfo.id,
        userInfo.email,
        userInfo.name,
        userInfo.picture
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/?token=${result.token}&isNewUser=${result.isNewUser}`);
    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error.message || 'OAuth login failed')}`);
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

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response) => {
    try {
      let { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email is required',
        });
      }

      // Sanitize email
      email = sanitizeString(email).toLowerCase();

      // Validate email
      if (!isValidEmail(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
        });
      }

      const token = await authService.requestPasswordReset(email);

      // In development, return token (in production, only send via email)
      if (process.env.NODE_ENV === 'development') {
        res.json({
          success: true,
          message: 'Password reset link sent to your email',
          token, // Only for development!
        });
      } else {
        res.json({
          success: true,
          message: 'If this email exists, a reset link has been sent',
        });
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      // Don't reveal if email exists or not
      res.json({
        success: true,
        message: 'If this email exists, a reset link has been sent',
      });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  router.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: 'Token and new password are required',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters',
        });
      }

      await authService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(400).json({
        error: error.message || 'Failed to reset password',
      });
    }
  });

  return router;
}
