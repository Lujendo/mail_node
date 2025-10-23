// Authentication routes
import { Hono } from 'hono';
import { hashPassword, verifyPassword, generateJWT, generateRandomToken } from '../auth/jwt';
import { initializeUserFolders, initializeUserSettings, logAudit } from '../db/init';
import { MailerooClient } from '../email/maileroo';

const auth = new Hono<{ Bindings: Env }>();

/**
 * Register a new user
 * POST /api/auth/register
 */
auth.post('/register', async (c) => {
  try {
    const { email, password, fullName } = await c.req.json<{
      email: string;
      password: string;
      fullName?: string;
    }>();

    // Validate input
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Check if user already exists
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first();

    if (existing) {
      return c.json({ error: 'User already exists' }, 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateRandomToken();
    const verificationExpires = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours

    // Create user
    const result = await c.env.DB.prepare(
      `INSERT INTO users (email, password_hash, full_name, verification_token, verification_token_expires)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(email.toLowerCase(), passwordHash, fullName || null, verificationToken, verificationExpires)
      .run();

    const userId = result.meta.last_row_id as number;

    // Initialize user folders and settings
    await initializeUserFolders(c.env.DB, userId);
    await initializeUserSettings(c.env.DB, userId);

    // Send verification email
    const maileroo = new MailerooClient({
      apiKey: c.env.MAILEROO_API_KEY,
      smtpUsername: c.env.MAILEROO_SMTP_USERNAME,
    });

    const verificationUrl = `${new URL(c.req.url).origin}/verify-email?token=${verificationToken}`;
    
    await maileroo.sendEmail({
      from: {
        email: 'noreply@yourdomain.com',
        name: 'My Mail',
      },
      to: [{ email: email.toLowerCase() }],
      subject: 'Verify your email address',
      html: `
        <h1>Welcome to My Mail!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, please ignore this email.</p>
      `,
      text: `Welcome to My Mail! Please verify your email address by visiting: ${verificationUrl}`,
    });

    // Log audit event
    await logAudit(c.env.DB, userId, 'user_registered', c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'));

    return c.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      userId,
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Verify email address
 * POST /api/auth/verify-email
 */
auth.post('/verify-email', async (c) => {
  try {
    const { token } = await c.req.json<{ token: string }>();

    if (!token) {
      return c.json({ error: 'Verification token is required' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    // Find user with valid token
    const user = await c.env.DB.prepare(
      `SELECT id, email FROM users 
       WHERE verification_token = ? AND verification_token_expires > ? AND is_verified = 0`
    )
      .bind(token, now)
      .first<{ id: number; email: string }>();

    if (!user) {
      return c.json({ error: 'Invalid or expired verification token' }, 400);
    }

    // Mark user as verified
    await c.env.DB.prepare(
      `UPDATE users 
       SET is_verified = 1, verification_token = NULL, verification_token_expires = NULL, updated_at = strftime('%s', 'now')
       WHERE id = ?`
    )
      .bind(user.id)
      .run();

    // Log audit event
    await logAudit(c.env.DB, user.id, 'email_verified', c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'));

    return c.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Verification error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Login
 * POST /api/auth/login
 */
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json<{
      email: string;
      password: string;
    }>();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Find user
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, full_name, is_verified FROM users WHERE email = ?'
    )
      .bind(email.toLowerCase())
      .first<{
        id: number;
        email: string;
        password_hash: string;
        full_name: string | null;
        is_verified: number;
      }>();

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Check if email is verified
    if (!user.is_verified) {
      return c.json({ error: 'Please verify your email address before logging in' }, 403);
    }

    // Generate JWT
    const token = await generateJWT(
      {
        userId: user.id,
        email: user.email,
      },
      c.env.JWT_SECRET
    );

    // Update last login
    await c.env.DB.prepare('UPDATE users SET last_login = strftime(\'%s\', \'now\') WHERE id = ?')
      .bind(user.id)
      .run();

    // Log audit event
    await logAudit(c.env.DB, user.id, 'user_login', c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'));

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
auth.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json<{ email: string }>();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Find user
    const user = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first<{ id: number; email: string }>();

    // Always return success to prevent email enumeration
    if (!user) {
      return c.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const resetExpires = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour

    // Save reset token
    await c.env.DB.prepare(
      'UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?'
    )
      .bind(resetToken, resetExpires, user.id)
      .run();

    // Send reset email
    const maileroo = new MailerooClient({
      apiKey: c.env.MAILEROO_API_KEY,
      smtpUsername: c.env.MAILEROO_SMTP_USERNAME,
    });

    const resetUrl = `${new URL(c.req.url).origin}/reset-password?token=${resetToken}`;
    
    await maileroo.sendEmail({
      from: {
        email: 'noreply@yourdomain.com',
        name: 'My Mail',
      },
      to: [{ email: user.email }],
      subject: 'Reset your password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Reset your password by visiting: ${resetUrl}`,
    });

    // Log audit event
    await logAudit(c.env.DB, user.id, 'password_reset_requested', c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'));

    return c.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Reset password
 * POST /api/auth/reset-password
 */
auth.post('/reset-password', async (c) => {
  try {
    const { token, password } = await c.req.json<{
      token: string;
      password: string;
    }>();

    if (!token || !password) {
      return c.json({ error: 'Token and password are required' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    const now = Math.floor(Date.now() / 1000);

    // Find user with valid reset token
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?'
    )
      .bind(token, now)
      .first<{ id: number }>();

    if (!user) {
      return c.json({ error: 'Invalid or expired reset token' }, 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password and clear reset token
    await c.env.DB.prepare(
      `UPDATE users 
       SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = strftime('%s', 'now')
       WHERE id = ?`
    )
      .bind(passwordHash, user.id)
      .run();

    // Log audit event
    await logAudit(c.env.DB, user.id, 'password_reset', c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'));

    return c.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default auth;

