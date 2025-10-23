/**
 * Email accounts routes
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, execute } from '../db/connection';
import { authMiddleware, getAuthUser, AuthRequest } from '../middleware/auth';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function encryptPassword(password: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptPassword(encrypted: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const router = Router();

router.use(authMiddleware);

/**
 * Get email accounts
 * GET /api/email-accounts
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);

    const accounts = await query(
      'SELECT id, email, username, imap_server, imap_port, smtp_server, smtp_port, is_default FROM email_accounts WHERE user_id = ?',
      [user.userId]
    );

    res.json({ accounts });
  } catch (error) {
    console.error('Get email accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create email account
 * POST /api/email-accounts
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { email, username, password, imapServer, imapPort, smtpServer, smtpPort, isDefault } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: 'Email, username, and password are required' });
      return;
    }

    const encryptedPassword = encryptPassword(password);

    const result = await execute(
      `INSERT INTO email_accounts (user_id, email, username, password_encrypted, imap_server, imap_port, smtp_server, smtp_port, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.userId,
        email,
        username,
        encryptedPassword,
        imapServer || 'mail.ventrucci.online',
        imapPort || 993,
        smtpServer || 'mail.ventrucci.online',
        smtpPort || 587,
        isDefault ? 1 : 0,
        Math.floor(Date.now() / 1000),
      ]
    );

    res.json({
      success: true,
      account_id: result.insertId,
    });
  } catch (error) {
    console.error('Create email account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update email account
 * PATCH /api/email-accounts/:id
 */
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const accountId = parseInt(req.params.id);
    const { email, username, password, imapServer, imapPort, smtpServer, smtpPort, isDefault } = req.body;

    const encryptedPassword = password ? encryptPassword(password) : undefined;

    let sql = 'UPDATE email_accounts SET ';
    const params: any[] = [];

    if (email) {
      sql += 'email = ?, ';
      params.push(email);
    }
    if (username) {
      sql += 'username = ?, ';
      params.push(username);
    }
    if (encryptedPassword) {
      sql += 'password_encrypted = ?, ';
      params.push(encryptedPassword);
    }
    if (imapServer) {
      sql += 'imap_server = ?, ';
      params.push(imapServer);
    }
    if (imapPort) {
      sql += 'imap_port = ?, ';
      params.push(imapPort);
    }
    if (smtpServer) {
      sql += 'smtp_server = ?, ';
      params.push(smtpServer);
    }
    if (smtpPort) {
      sql += 'smtp_port = ?, ';
      params.push(smtpPort);
    }
    if (isDefault !== undefined) {
      sql += 'is_default = ?, ';
      params.push(isDefault ? 1 : 0);
    }

    sql = sql.slice(0, -2); // Remove trailing comma
    sql += ' WHERE id = ? AND user_id = ?';
    params.push(accountId, user.userId);

    await execute(sql, params);

    res.json({ success: true });
  } catch (error) {
    console.error('Update email account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete email account
 * DELETE /api/email-accounts/:id
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const accountId = parseInt(req.params.id);

    await execute(
      'DELETE FROM email_accounts WHERE id = ? AND user_id = ?',
      [accountId, user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete email account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

