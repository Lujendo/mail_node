/**
 * Email routes
 */

import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/connection';
import { IMAPSMTPClient } from '../email/imap-smtp-client';
import { authMiddleware, getAuthUser, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * Get emails for a folder
 * GET /api/emails?folder_id=1&page=1&limit=50
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const folderId = req.query.folder_id ? parseInt(req.query.folder_id as string) : null;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT e.*, 
             (SELECT COUNT(*) FROM attachments WHERE email_id = e.id) as attachment_count
      FROM emails e
      WHERE e.user_id = ?
    `;
    const params: any[] = [user.userId];

    if (folderId) {
      sql += ' AND e.folder_id = ?';
      params.push(folderId);
    }

    sql += ' ORDER BY e.received_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const emails = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM emails WHERE user_id = ?';
    const countParams: any[] = [user.userId];

    if (folderId) {
      countSql += ' AND folder_id = ?';
      countParams.push(folderId);
    }

    const countResult = await queryOne(countSql, countParams);

    res.json({
      emails,
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get single email
 * GET /api/emails/:id
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const emailId = parseInt(req.params.id);

    const email = await queryOne(
      'SELECT * FROM emails WHERE id = ? AND user_id = ?',
      [emailId, user.userId]
    );

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    // Get attachments
    const attachments = await query(
      'SELECT id, filename, content_type, size FROM attachments WHERE email_id = ?',
      [emailId]
    );

    res.json({ ...email, attachments });
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send email
 * POST /api/emails/send
 */
router.post('/send', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { to, cc, bcc, subject, html, text, attachments } = req.body;

    if (!to || !subject) {
      res.status(400).json({ error: 'Recipient and subject are required' });
      return;
    }

    // Get user email
    const userData = await queryOne('SELECT email FROM users WHERE id = ?', [user.userId]);

    // Create mail client
    const mailClient = new IMAPSMTPClient({
      imapServer: process.env.MAIL_IMAP_SERVER || 'mail.ventrucci.online',
      imapPort: parseInt(process.env.MAIL_IMAP_PORT || '993'),
      smtpServer: process.env.MAIL_SMTP_SERVER || 'mail.ventrucci.online',
      smtpPort: parseInt(process.env.MAIL_SMTP_PORT || '587'),
      username: process.env.MAIL_USERNAME || '',
      password: process.env.MAIL_PASSWORD || '',
      email: userData.email,
    });

    await mailClient.initializeSMTP();

    const result = await mailClient.sendEmail({
      from: { email: userData.email },
      to: Array.isArray(to) ? to : [{ email: to }],
      cc,
      bcc,
      subject,
      html,
      text,
      attachments: attachments?.map((a: any) => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'base64'),
        contentType: a.contentType,
      })),
    });

    await mailClient.close();

    if (!result.success) {
      res.status(500).json({ error: result.error });
      return;
    }

    // Save to sent folder
    const sentFolder = await queryOne(
      'SELECT id FROM folders WHERE user_id = ? AND type = ?',
      [user.userId, 'sent']
    );

    const toEmail = Array.isArray(to) ? to[0].email : to;
    const emailResult = await execute(
      `INSERT INTO emails (user_id, folder_id, message_id, from_email, to_email, subject, body_plaintext, body_html, is_read, sent_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        user.userId,
        sentFolder?.id,
        result.messageId || '',
        userData.email,
        toEmail,
        subject,
        text || '',
        html || '',
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
      ]
    );

    res.json({
      success: true,
      message_id: result.messageId,
      email_id: emailResult.insertId,
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Mark email as read
 * PATCH /api/emails/:id/read
 */
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const emailId = parseInt(req.params.id);
    const { isRead } = req.body;

    await execute(
      'UPDATE emails SET is_read = ? WHERE id = ? AND user_id = ?',
      [isRead ? 1 : 0, emailId, user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Star/unstar email
 * PATCH /api/emails/:id/star
 */
router.patch('/:id/star', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const emailId = parseInt(req.params.id);
    const { isStarred } = req.body;

    await execute(
      'UPDATE emails SET is_starred = ? WHERE id = ? AND user_id = ?',
      [isStarred ? 1 : 0, emailId, user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Star error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete email
 * DELETE /api/emails/:id
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const emailId = parseInt(req.params.id);

    await execute(
      'DELETE FROM emails WHERE id = ? AND user_id = ?',
      [emailId, user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

