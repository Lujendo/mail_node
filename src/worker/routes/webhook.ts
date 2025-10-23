// Webhook handler for incoming emails from Maileroo
import { Hono } from 'hono';
import type { InboundEmailWebhook } from '../email/maileroo';
import { MailerooClient, parseEmailHeaders, generateThreadId } from '../email/maileroo';
import { getOrCreateContact, applyEmailFilters } from '../db/init';

const webhook = new Hono<{ Bindings: Env }>();

/**
 * Handle incoming email webhook from Maileroo
 * POST /api/webhook/email
 */
webhook.post('/email', async (c) => {
  try {
    const payload = await c.req.json<InboundEmailWebhook>();

    // Validate webhook authenticity
    const maileroo = new MailerooClient({
      apiKey: c.env.MAILEROO_API_KEY,
      smtpUsername: c.env.MAILEROO_SMTP_USERNAME,
    });

    const isValid = await maileroo.validateWebhook(payload.validation_url);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return c.json({ error: 'Invalid webhook signature' }, 401);
    }

    // Parse email headers
    const parsedHeaders = parseEmailHeaders(payload.headers);

    // Find user by recipient email
    // In a real implementation, you'd map the recipient to a user
    // For now, we'll extract the local part and find the user
    const recipientEmail = payload.recipients[0];
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(recipientEmail.toLowerCase())
      .first<{ id: number }>();

    if (!user) {
      console.error('User not found for recipient:', recipientEmail);
      // Still return 200 to acknowledge receipt
      return c.json({ success: true, message: 'User not found' });
    }

    // Get inbox folder
    const inboxFolder = await c.env.DB.prepare(
      'SELECT id FROM folders WHERE user_id = ? AND type = ?'
    )
      .bind(user.id, 'inbox')
      .first<{ id: number }>();

    if (!inboxFolder) {
      console.error('Inbox folder not found for user:', user.id);
      return c.json({ error: 'Inbox folder not found' }, 500);
    }

    // Apply email filters
    const filterResult = await applyEmailFilters(c.env.DB, user.id, {
      from_email: parsedHeaders.from.email,
      to_email: parsedHeaders.to.email,
      subject: parsedHeaders.subject,
      body_plaintext: payload.body.plaintext,
    });

    const targetFolderId = filterResult.folderId || inboxFolder.id;

    // Generate thread ID
    const threadId = generateThreadId(
      parsedHeaders.messageId || payload.message_id,
      parsedHeaders.inReplyTo,
      parsedHeaders.references
    );

    // Check if email is spam
    const isSpam = payload.is_spam ? 1 : 0;
    let finalFolderId = targetFolderId;

    if (isSpam) {
      // Move to spam folder
      const spamFolder = await c.env.DB.prepare(
        'SELECT id FROM folders WHERE user_id = ? AND type = ?'
      )
        .bind(user.id, 'spam')
        .first<{ id: number }>();
      
      if (spamFolder) {
        finalFolderId = spamFolder.id;
      }
    }

    // Store raw MIME in R2 if available
    let rawMimeUrl = payload.body.raw_mime.url;
    if (payload.body.raw_mime.url) {
      try {
        // Download raw MIME
        const rawMimeResponse = await fetch(payload.body.raw_mime.url);
        if (rawMimeResponse.ok) {
          const rawMimeData = await rawMimeResponse.arrayBuffer();
          
          // Store in R2
          const r2Key = `emails/${user.id}/${payload._id}/raw.mime`;
          await c.env.R2_ATTACHMENTS.put(r2Key, rawMimeData, {
            httpMetadata: {
              contentType: 'message/rfc822',
            },
          });
          
          rawMimeUrl = r2Key;
        }
      } catch (error) {
        console.error('Error storing raw MIME:', error);
      }
    }

    // Insert email into database
    const emailResult = await c.env.DB.prepare(
      `INSERT INTO emails (
        user_id, folder_id, message_id, thread_id, from_email, from_name, to_email, to_name,
        subject, body_plaintext, body_html, stripped_plaintext, stripped_html,
        has_attachments, is_spam, raw_mime_url, maileroo_id,
        spf_result, dkim_result, is_dmarc_aligned, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        user.id,
        finalFolderId,
        parsedHeaders.messageId || payload.message_id,
        threadId,
        parsedHeaders.from.email,
        parsedHeaders.from.name || null,
        parsedHeaders.to.email,
        parsedHeaders.to.name || null,
        parsedHeaders.subject,
        payload.body.plaintext,
        payload.body.html,
        payload.body.stripped_plaintext,
        payload.body.stripped_html,
        payload.attachments && payload.attachments.length > 0 ? 1 : 0,
        isSpam,
        rawMimeUrl,
        payload._id,
        payload.spf_result,
        payload.dkim_result ? 1 : 0,
        payload.is_dmarc_aligned ? 1 : 0,
        payload.processed_at
      )
      .run();

    const emailId = emailResult.meta.last_row_id as number;

    // Store attachments
    if (payload.attachments && payload.attachments.length > 0) {
      for (const attachment of payload.attachments) {
        try {
          // Download attachment
          const attachmentData = await maileroo.downloadAttachment(attachment.url);
          
          if (attachmentData) {
            // Store in R2
            const r2Key = `emails/${user.id}/${payload._id}/attachments/${attachment.filename}`;
            await c.env.R2_ATTACHMENTS.put(r2Key, attachmentData, {
              httpMetadata: {
                contentType: attachment.content_type,
              },
            });

            // Insert attachment record
            await c.env.DB.prepare(
              `INSERT INTO attachments (email_id, filename, content_type, content_id, size_bytes, r2_key, url)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
              .bind(
                emailId,
                attachment.filename,
                attachment.content_type,
                attachment.content_id,
                attachment.size,
                r2Key,
                attachment.url
              )
              .run();
          }
        } catch (error) {
          console.error('Error storing attachment:', error);
        }
      }
    }

    // Create or update contact
    await getOrCreateContact(c.env.DB, user.id, parsedHeaders.from.email, parsedHeaders.from.name);

    // Apply labels from filters
    if (filterResult.labels && filterResult.labels.length > 0) {
      const currentLabels = JSON.parse((await c.env.DB.prepare('SELECT labels FROM emails WHERE id = ?').bind(emailId).first<{ labels: string }>())?.labels || '[]');
      const updatedLabels = [...new Set([...currentLabels, ...filterResult.labels])];
      
      await c.env.DB.prepare('UPDATE emails SET labels = ? WHERE id = ?')
        .bind(JSON.stringify(updatedLabels), emailId)
        .run();
    }

    // Delete email from Maileroo storage (optional)
    // await maileroo.deleteEmail(payload.deletion_url);

    // Cache invalidation - clear email list cache for this user
    await c.env.KV_CACHE.delete(`emails:${user.id}:${finalFolderId}`);

    return c.json({
      success: true,
      email_id: emailId,
      message: 'Email processed successfully',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Return 200 to prevent retries for unrecoverable errors
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Test webhook endpoint
 * GET /api/webhook/test
 */
webhook.get('/test', async (c) => {
  return c.json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
  });
});

export default webhook;

