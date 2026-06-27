import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware, generateToken, AuthRequest, AuthUser } from '../../middleware/auth.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  unauthorizedResponse,
} from '../../utils/response.js';
import pool from '../../db.js';

export const authRouter = Router();

// In-memory verification code store
const verificationCodes: Map<string, { code: string; expiresAt: number }> = new Map();

// Generate a 4-digit verification code
function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * POST /api/auth/send-code
 * Send a verification code to the given email address
 */
authRouter.post('/send-code', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    errorResponse(res, 'Email is required');
    return;
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorResponse(res, 'Invalid email format');
    return;
  }

  // Rate limit: don't allow re-send within 60 seconds
  const existing = verificationCodes.get(email);
  if (existing && existing.expiresAt > Date.now() + 50 * 60 * 1000) {
    errorResponse(res, 'Please wait before requesting another code', 429);
    return;
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  verificationCodes.set(email, { code, expiresAt });

  // Try to send email via nodemailer if SMTP is configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: '日报系统 - 验证码',
        html: `<p>您的验证码是：<strong>${code}</strong>，10分钟内有效。</p>`,
      });

      console.log(`[send-code] Verification code sent to ${email}`);
    } catch (err) {
      console.error('[send-code] Failed to send email:', err);
      // Still return success with code in dev mode so registration works
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[send-code] DEV MODE - Code for ${email}: ${code}`);
      } else {
        errorResponse(res, 'Failed to send verification email. Please try again later.');
        return;
      }
    }
  } else {
    // No SMTP configured — log code for development
    console.log(`[send-code] No SMTP configured. DEV MODE - Code for ${email}: ${code}`);
  }

  successResponse(res, { message: 'Verification code sent' }, 'Verification code sent');
});

/**
 * POST /api/auth/verify-code
 * Verify a verification code for the given email
 */
authRouter.post('/verify-code', (req: AuthRequest, res: Response): void => {
  const { email, code } = req.body;

  if (!email || !code) {
    errorResponse(res, 'Email and code are required');
    return;
  }

  const stored = verificationCodes.get(email);
  if (!stored) {
    errorResponse(res, 'No verification code found for this email');
    return;
  }

  if (stored.expiresAt < Date.now()) {
    verificationCodes.delete(email);
    errorResponse(res, 'Verification code has expired');
    return;
  }

  if (stored.code !== code) {
    errorResponse(res, 'Invalid verification code');
    return;
  }

  // Code is valid — remove it so it can't be reused
  verificationCodes.delete(email);
  successResponse(res, { verified: true }, 'Verification code verified');
});

/**
 * POST /api/auth/logout
 * Logout the current user (client-side token removal)
 */
authRouter.post('/logout', (_req: AuthRequest, res: Response): void => {
  // With JWT-based auth, logout is primarily client-side
  // Just return success so the client can clear its token
  successResponse(res, null, 'Logged out successfully');
});

/**
 * GET /api/auth/wechat/qrcode
 * Get WeChat login QR code URL
 */
authRouter.get('/wechat/qrcode', (_req: AuthRequest, res: Response): void => {
  const appId = process.env.WECHAT_APP_ID;
  const redirectUri = encodeURIComponent(process.env.WECHAT_REDIRECT_URI || 'http://localhost:5000/api/auth/wechat/callback');

  if (!appId) {
    successResponse(res, { qrcodeUrl: '' }, 'WeChat login not configured');
    return;
  }

  const qrcodeUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=random#wechat_redirect`;
  successResponse(res, { qrcodeUrl });
});

/**
 * GET /api/auth/wechat/callback
 * Handle WeChat OAuth callback
 */
authRouter.get('/wechat/callback', (req: AuthRequest, res: Response): void => {
  // Stub — in production this would exchange the code for user info
  const code = req.query.code as string;
  if (!code) {
    res.redirect('/login?error=wechat_no_code');
    return;
  }
  // For now, redirect to login with an error since WeChat integration is not fully implemented
  res.redirect('/login?error=wechat_token_error');
});
/**
 * POST /api/auth/register
 * Register a new user
 */
authRouter.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    errorResponse(res, 'Email, username, and password are required');
    return;
  }

  if (password.length < 6) {
    errorResponse(res, 'Password must be at least 6 characters');
    return;
  }

  // Check for existing user in database
  const [existing] = await pool.execute(
    'SELECT id FROM users WHERE email = ? OR username = ?',
    [email, username]
  );
  if ((existing as any[]).length > 0) {
    const row = (existing as any[])[0];
    // Check which field matched
    const [emailCheck] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if ((emailCheck as any[]).length > 0) {
      errorResponse(res, 'Email already registered', 409);
      return;
    }
    errorResponse(res, 'Username already taken', 409);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    'INSERT INTO users (email, username, password_hash, login_type) VALUES (?, ?, ?, ?)',
    [email, username, passwordHash, 'email']
  );
  const insertId = (result as any).insertId;

  const authUser: AuthUser = { id: insertId, email, username };
  const token = await generateToken(authUser);

  createdResponse(res, { user: authUser, token }, 'Registration successful');
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
authRouter.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    errorResponse(res, 'Email and password are required');
    return;
  }

  // Query user from MySQL database
  const [rows] = await pool.execute(
    'SELECT id, email, username, password_hash FROM users WHERE email = ?',
    [email]
  );
  const users = rows as any[];

  if (users.length === 0) {
    unauthorizedResponse(res, 'Invalid email or password');
    return;
  }

  const user = users[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    unauthorizedResponse(res, 'Invalid email or password');
    return;
  }

  const authUser: AuthUser = { id: user.id, email: user.email, username: user.username };
  const token = await generateToken(authUser);

  successResponse(res, { user: authUser, token }, 'Login successful');
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
authRouter.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
  successResponse(res, { user: req.user }, 'User info retrieved');
});

/**
 * PUT /api/auth/profile
 * Update current user's profile
 */
authRouter.put('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { username } = req.body;
  const userId = req.user!.id;

  if (username) {
    // Check username uniqueness
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );
    if ((existing as any[]).length > 0) {
      errorResponse(res, 'Username already taken', 409);
      return;
    }

    await pool.execute('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
  }

  // Fetch updated user
  const [rows] = await pool.execute('SELECT id, email, username FROM users WHERE id = ?', [userId]);
  const user = (rows as any[])[0];
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const updated: AuthUser = { id: user.id, email: user.email, username: user.username };
  successResponse(res, { user: updated }, 'Profile updated');
});

/**
 * PUT /api/auth/password
 * Change current user's password
 */
authRouter.put('/password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  if (!currentPassword || !newPassword) {
    errorResponse(res, 'Current password and new password are required');
    return;
  }

  if (newPassword.length < 6) {
    errorResponse(res, 'New password must be at least 6 characters');
    return;
  }

  // Get current password hash
  const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
  const users = rows as any[];
  if (users.length === 0) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const isValid = await bcrypt.compare(currentPassword, users[0].password_hash);
  if (!isValid) {
    unauthorizedResponse(res, 'Current password is incorrect');
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

  successResponse(res, null, 'Password updated');
});
