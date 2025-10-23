/**
 * Webhook routes for incoming emails
 */

import { Router, Response, Request } from 'express';
import { queryOne, execute, query } from '../db/connection';

const router = Router();

/**
 * Health check endpoint
 * GET /api/webhook/test
 */
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Handle incoming email webhook
 * This endpoint receives emails from the mail server
 * POST /api/webhook/email
 */
router.post('/email', async (req: Request, res: Response) => {
  try {
    const {
      from,
      to,
      subject,
      text,
      html,
      messageId,
      inReplyTo,
      references,
      attachments,
    } = req.body;

    if (!to || !from) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Find user by recipient email
    const user = await queryOne(
      'SELECT id FROM users WHERE email = ?',
      [to.toLowerCase()]
    );

    if (!user) {
      console.log('User not found for recipient:', to);
      // Return 200 to acknowledge receipt
      res.json({ success: true, message: 'User not found' });
      return;
    }

    // Get inbox folder
    const inboxFolder = await queryOne(
      'SELECT id FROM folders WHERE user_id = ? AND type = ?',
      [user.id, 'inbox']
    );

    if (!inboxFolder) {
      console.error('Inbox folder not found for user:', user.id);
      res.status(500).json({ error: 'Inbox folder not found' });
      return;
    }

    // Insert email
    const emailResult = await execute(
      `INSERT INTO emails (user_id, folder_id, message_id, from_email, to_email, subject, body_plaintext, body_html, received_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        inboxFolder.id,
        messageId || '',
        from,
        to,
        subject || '(No Subject)',
        text || '',
        html || '',
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000),
      ]
    );

    const emailId = emailResult.insertId;

    // Store attachments if any
    if (attachments && Array.isArray(attachments)) {
      for (const attachment of attachments) {
        await execute(
          `INSERT INTO attachments (email_id, filename, content_type, size, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            emailId,
            attachment.filename || 'attachment',
            attachment.contentType || 'application/octet-stream',
            attachment.size || 0,
            Math.floor(Date.now() / 1000),
          ]
        );
      }

      // Update email to mark it has attachments
      await execute(
        'UPDATE emails SET has_attachments = 1 WHERE id = ?',
        [emailId]
      );
    }

    res.json({
      success: true,
      email_id: emailId,
      message: 'Email processed successfully',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

