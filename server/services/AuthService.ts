import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 10;

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  plan: 'free' | 'pro' | 'enterprise';
  oauth_provider?: 'google' | 'github';
  oauth_id?: string;
  stripe_customer_id?: string;
  created_at: Date;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  plan: string;
}

export class AuthService {
  private db: any; // Database connection

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Register new user with email/password
   */
  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const { email, password, name } = data;

    console.log(`[AUTH] Register attempt for email: ${email}`);

    // Check if user already exists
    const existingUser = await this.db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    console.log(`[AUTH] Existing user query result:`, existingUser);
    console.log(`[AUTH] Existing user count: ${existingUser.length}`);

    if (existingUser.length > 0) {
      console.log(`[AUTH] Email ${email} already exists! Rejecting registration.`);
      throw new Error('Email already registered');
    }

    console.log(`[AUTH] Email ${email} is new! Proceeding with registration...`);

    // Hash password
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const userId = uuidv4();
    await this.db.query(
      `INSERT INTO users (id, email, password_hash, name, plan) 
       VALUES (?, ?, ?, ?, 'free')`,
      [userId, email, password_hash, name]
    );

    // Create initial usage record
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    await this.db.query(
      `INSERT INTO user_usage (id, user_id, month) VALUES (?, ?, ?)`,
      [uuidv4(), userId, currentMonth]
    );

    // Get created user
    const [user] = await this.db.query(
      'SELECT id, email, name, avatar_url, plan, created_at FROM users WHERE id = ?',
      [userId]
    );

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    return { user, token };
  }

  /**
   * Login with email/password
   */
  async login(data: LoginData): Promise<{ user: User; token: string }> {
    const { email, password } = data;

    // Get user
    const [user] = await this.db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    // Remove sensitive data
    delete user.password_hash;

    return { user, token };
  }

  /**
   * OAuth login/register (Google, GitHub)
   */
  async oauthLogin(
    provider: 'google' | 'github',
    oauthId: string,
    email: string,
    name: string,
    avatar_url?: string
  ): Promise<{ user: User; token: string; isNewUser: boolean }> {
    // Check if user exists
    let [user] = await this.db.query(
      'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?',
      [provider, oauthId]
    );

    let isNewUser = false;

    if (!user) {
      // Create new user
      const userId = uuidv4();
      await this.db.query(
        `INSERT INTO users (id, email, name, avatar_url, oauth_provider, oauth_id, plan) 
         VALUES (?, ?, ?, ?, ?, ?, 'free')`,
        [userId, email, name, avatar_url, provider, oauthId]
      );

      // Create initial usage record
      const currentMonth = new Date().toISOString().slice(0, 7);
      await this.db.query(
        `INSERT INTO user_usage (id, user_id, month) VALUES (?, ?, ?)`,
        [uuidv4(), userId, currentMonth]
      );

      [user] = await this.db.query(
        'SELECT id, email, name, avatar_url, plan, oauth_provider, created_at FROM users WHERE id = ?',
        [userId]
      );

      isNewUser = true;
    }

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    return { user, token, isNewUser };
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const [user] = await this.db.query(
      'SELECT id, email, name, avatar_url, plan, oauth_provider, stripe_customer_id, created_at FROM users WHERE id = ?',
      [userId]
    );
    return user || null;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: { name?: string; avatar_url?: string }
  ): Promise<User> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.avatar_url) {
      updates.push('avatar_url = ?');
      values.push(data.avatar_url);
    }

    if (updates.length > 0) {
      values.push(userId);
      await this.db.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }

    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const [user] = await this.db.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (!user || !user.password_hash) {
      throw new Error('Cannot change password for OAuth users');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.db.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [newPasswordHash, userId]
    );
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    // Cascade delete will handle related records
    await this.db.query('DELETE FROM users WHERE id = ?', [userId]);
  }
}
