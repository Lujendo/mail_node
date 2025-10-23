/**
 * Authentication routes
 */

import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { query, queryOne, execute } from '../db/connection';
import { IMAPSMTPClient } from '../email/imap-smtp-client';
import {
  authMiddleware,
  getAuthUser,
  generateToken,
  generateVerificationToken,
  getTokenExpiry,
  AuthRequest,
} from '../middleware/auth';

const router = Router();

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Check if user exists
    const existingUser = await queryOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken();
    const verificationExpiry = getTokenExpiry(24);

    // Create user
    const result = await execute(
      `INSERT INTO users (email, password_hash, full_name, verification_token, verification_token_expires, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email.toLowerCase(), passwordHash, fullName || null, verificationToken, verificationExpiry, Math.floor(Date.now() / 1000)]
    );

    const userId = result.insertId;

    // Initialize user folders
    const folders = [
      { name: 'Inbox', type: 'inbox' },
      { name: 'Sent', type: 'sent' },
      { name: 'Drafts', type: 'drafts' },
      { name: 'Trash', type: 'trash' },
      { name: 'Spam', type: 'spam' },
    ];

    for (const folder of folders) {
      await execute(
        'INSERT INTO folders (user_id, name, type, created_at) VALUES (?, ?, ?, ?)',
        [userId, folder.name, folder.type, Math.floor(Date.now() / 1000)]
      );
    }

    // Send verification email
    const mailClient = new IMAPSMTPClient({
      imapServer: process.env.MAIL_IMAP_SERVER || 'mail.ventrucci.online',
      imapPort: parseInt(process.env.MAIL_IMAP_PORT || '993'),
      smtpServer: process.env.MAIL_SMTP_SERVER || 'mail.ventrucci.online',
      smtpPort: parseInt(process.env.MAIL_SMTP_PORT || '587'),
      username: process.env.MAIL_USERNAME || '',
      password: process.env.MAIL_PASSWORD || '',
      email: process.env.MAIL_FROM_EMAIL || 'noreply@ventrucci.online',
    });

    await mailClient.initializeSMTP();

    const verificationUrl = `${process.env.FRONTEND_URL || 'https://mail.ventrucci.online'}/verify-email?token=${verificationToken}`;

    await mailClient.sendEmail({
      from: {
        email: process.env.MAIL_FROM_EMAIL || 'noreply@ventrucci.online',
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

    await mailClient.close();

    res.json({
      success: true,
      userId,
      message: 'Registration successful! Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Login
 * POST /api/auth/login
 */
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await queryOne(
      'SELECT id, email, password_hash, is_verified FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.is_verified) {
      res.status(401).json({ error: 'Please verify your email first' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Verify email
 * POST /api/auth/verify-email
 */
router.post('/verify-email', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const user = await queryOne(
      'SELECT id FROM users WHERE verification_token = ? AND verification_token_expires > ?',
      [token, Math.floor(Date.now() / 1000)]
    );

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    await execute(
      'UPDATE users SET is_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?',
      [user.id]
    );

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const userData = await queryOne(
      'SELECT id, email, full_name FROM users WHERE id = ?',
      [user.userId]
    );

    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

