// Email routes
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { MailerooClient } from '../email/maileroo';
import { searchEmails, getEmailThread, markEmailAsRead, moveEmailToFolder, deleteEmail } from '../db/init';

const emails = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
emails.use('/*', authMiddleware);

/**
 * Get emails for a folder
 * GET /api/emails?folder_id=1&page=1&limit=50
 */
emails.get('/', async (c) => {
  try {
    const user = getAuthUser(c);
    const folderId = c.req.query('folder_id');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, 
             (SELECT COUNT(*) FROM attachments WHERE email_id = e.id) as attachment_count
      FROM emails e
      WHERE e.user_id = ?
    `;
    const params: any[] = [user.userId];

    if (folderId) {
      query += ' AND e.folder_id = ?';
      params.push(parseInt(folderId));
    }

    query += ' ORDER BY e.received_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM emails WHERE user_id = ?';
    const countParams: any[] = [user.userId];
    
    if (folderId) {
      countQuery += ' AND folder_id = ?';
      countParams.push(parseInt(folderId));
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();

    return c.json({
      emails: result.results,
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Get emails error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Get a single email by ID
 * GET /api/emails/:id
 */
emails.get('/:id', async (c) => {
  try {
    const user = getAuthUser(c);
    const emailId = parseInt(c.req.param('id'));

    const email = await c.env.DB.prepare(
      'SELECT * FROM emails WHERE id = ? AND user_id = ?'
    )
      .bind(emailId, user.userId)
      .first();

    if (!email) {
      return c.json({ error: 'Email not found' }, 404);
    }

    // Get attachments
    const attachments = await c.env.DB.prepare(
      'SELECT * FROM attachments WHERE email_id = ?'
    )
      .bind(emailId)
      .all();

    // Mark as read if not already
    if (!(email as any).is_read) {
      await markEmailAsRead(c.env.DB, emailId, true);
    }

    return c.json({
      ...email,
      attachments: attachments.results,
    });
  } catch (error) {
    console.error('Get email error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Send an email
 * POST /api/emails/send
 */
emails.post('/send', async (c) => {
  try {
    const user = getAuthUser(c);
    const { from, to, cc, bcc, subject, html, text, attachments } = await c.req.json<{
      from?: { email: string; name?: string };
      to: Array<{ email: string; name?: string }>;
      cc?: Array<{ email: string; name?: string }>;
      bcc?: Array<{ email: string; name?: string }>;
      subject: string;
      html?: string;
      text?: string;
      attachments?: Array<{
        filename: string;
        content: string;
        contentType?: string;
      }>;
    }>();

    // Determine sender
    let senderEmail: string;
    let senderName: string | undefined;

    if (from?.email) {
      // Verify the user owns this email account
      const account = await c.env.DB.prepare(
        'SELECT email, username FROM email_accounts WHERE user_id = ? AND email = ?'
      )
        .bind(user.userId, from.email)
        .first<{ email: string; username: string }>();

      if (account) {
        senderEmail = account.email;
        senderName = from.name;
      } else {
        // Fall back to user's primary email
        const userInfo = await c.env.DB.prepare('SELECT email, full_name FROM users WHERE id = ?')
          .bind(user.userId)
          .first<{ email: string; full_name: string | null }>();

        if (!userInfo) {
          return c.json({ error: 'User not found' }, 404);
        }

        senderEmail = userInfo.email;
        senderName = userInfo.full_name || undefined;
      }
    } else {
      // Use user's primary email
      const userInfo = await c.env.DB.prepare('SELECT email, full_name FROM users WHERE id = ?')
        .bind(user.userId)
        .first<{ email: string; full_name: string | null }>();

      if (!userInfo) {
        return c.json({ error: 'User not found' }, 404);
      }

      senderEmail = userInfo.email;
      senderName = userInfo.full_name || undefined;
    }

    // Send email via Maileroo
    const maileroo = new MailerooClient({
      apiKey: c.env.MAILEROO_API_KEY,
      smtpUsername: c.env.MAILEROO_SMTP_USERNAME,
    });

    const result = await maileroo.sendEmail({
      from: {
        email: senderEmail,
        name: senderName,
      },
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
    });

    if (!result.success) {
      return c.json({ error: result.error }, 500);
    }

    // Get sent folder
    const sentFolder = await c.env.DB.prepare(
      'SELECT id FROM folders WHERE user_id = ? AND type = ?'
    )
      .bind(user.userId, 'sent')
      .first<{ id: number }>();

    // Save to sent folder
    const emailResult = await c.env.DB.prepare(
      `INSERT INTO emails (
        user_id, folder_id, message_id, from_email, from_name, to_email, subject,
        body_plaintext, body_html, is_read, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, strftime('%s', 'now'))`
    )
      .bind(
        user.userId,
        sentFolder?.id,
        result.message_id,
        senderEmail,
        senderName,
        to[0].email,
        subject,
        text || '',
        html || '',
      )
      .run();

    return c.json({
      success: true,
      message_id: result.message_id,
      email_id: emailResult.meta.last_row_id,
    });
  } catch (error) {
    console.error('Send email error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Search emails
 * GET /api/emails/search?q=query
 */
emails.get('/search', async (c) => {
  try {
    const user = getAuthUser(c);
    const query = c.req.query('q');
    const limit = parseInt(c.req.query('limit') || '50');

    if (!query) {
      return c.json({ error: 'Search query is required' }, 400);
    }

    const results = await searchEmails(c.env.DB, user.userId, query, limit);

    return c.json({ emails: results });
  } catch (error) {
    console.error('Search emails error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Get email thread
 * GET /api/emails/:id/thread
 */
emails.get('/:id/thread', async (c) => {
  try {
    const user = getAuthUser(c);
    const emailId = parseInt(c.req.param('id'));

    // Get the email to find its thread_id
    const email = await c.env.DB.prepare(
      'SELECT thread_id FROM emails WHERE id = ? AND user_id = ?'
    )
      .bind(emailId, user.userId)
      .first<{ thread_id: string }>();

    if (!email || !email.thread_id) {
      return c.json({ error: 'Email not found' }, 404);
    }

    const thread = await getEmailThread(c.env.DB, user.userId, email.thread_id);

    return c.json({ emails: thread });
  } catch (error) {
    console.error('Get thread error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Mark email as read/unread
 * PATCH /api/emails/:id/read
 */
emails.patch('/:id/read', async (c) => {
  try {
    const user = getAuthUser(c);
    const emailId = parseInt(c.req.param('id'));
    const { isRead } = await c.req.json<{ isRead: boolean }>();

    // Verify ownership
    const email = await c.env.DB.prepare('SELECT id FROM emails WHERE id = ? AND user_id = ?')
      .bind(emailId, user.userId)
      .first();

    if (!email) {
      return c.json({ error: 'Email not found' }, 404);
    }

    await markEmailAsRead(c.env.DB, emailId, isRead);

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Move email to folder
 * PATCH /api/emails/:id/move
 */
emails.patch('/:id/move', async (c) => {
  try {
    const user = getAuthUser(c);
    const emailId = parseInt(c.req.param('id'));
    const { folderId } = await c.req.json<{ folderId: number }>();

    // Verify email ownership
    const email = await c.env.DB.prepare('SELECT id FROM emails WHERE id = ? AND user_id = ?')
      .bind(emailId, user.userId)
      .first();

    if (!email) {
      return c.json({ error: 'Email not found' }, 404);
    }

    // Verify folder ownership
    const folder = await c.env.DB.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?')
      .bind(folderId, user.userId)
      .first();

    if (!folder) {
      return c.json({ error: 'Folder not found' }, 404);
    }

    await moveEmailToFolder(c.env.DB, emailId, folderId);

    return c.json({ success: true });
  } catch (error) {
    console.error('Move email error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Delete email
 * DELETE /api/emails/:id
 */
emails.delete('/:id', async (c) => {
  try {
    const user = getAuthUser(c);
    const emailId = parseInt(c.req.param('id'));
    const permanent = c.req.query('permanent') === 'true';

    await deleteEmail(c.env.DB, user.userId, emailId, permanent);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete email error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Star/unstar email
 * PATCH /api/emails/:id/star
 */
emails.patch('/:id/star', async (c) => {
  try {
    const user = getAuthUser(c);
    const emailId = parseInt(c.req.param('id'));
    const { isStarred } = await c.req.json<{ isStarred: boolean }>();

    // Verify ownership
    const email = await c.env.DB.prepare('SELECT id FROM emails WHERE id = ? AND user_id = ?')
      .bind(emailId, user.userId)
      .first();

    if (!email) {
      return c.json({ error: 'Email not found' }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE emails SET is_starred = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?'
    )
      .bind(isStarred ? 1 : 0, emailId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Star email error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default emails;

