import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from '../types';
import { authMiddleware, getAuthUser } from '../middleware/auth';

const app = new Hono<{ Bindings: Env }>();

// Simple encryption/decryption for passwords (in production, use proper encryption)
function encryptPassword(password: string, secret: string): string {
  // In production, use a proper encryption library
  // For now, we'll use base64 encoding with a simple XOR cipher
  const key = secret.substring(0, 32);
  let encrypted = '';
  for (let i = 0; i < password.length; i++) {
    encrypted += String.fromCharCode(password.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(encrypted).toString('base64');
}

function decryptPassword(encrypted: string, secret: string): string {
  const key = secret.substring(0, 32);
  const decoded = Buffer.from(encrypted, 'base64').toString();
  let decrypted = '';
  for (let i = 0; i < decoded.length; i++) {
    decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return decrypted;
}

// Get all email accounts for the authenticated user
app.get('/', authMiddleware, async (c: Context) => {
  const user = getAuthUser(c);
  const db = c.env.DB;

  try {
    const result = await db
      .prepare(
        `SELECT id, email, username, imap_server, smtp_server, smtp_port, is_default, created_at
         FROM email_accounts
         WHERE user_id = ?
         ORDER BY is_default DESC, created_at DESC`
      )
      .bind(user.userId)
      .all();

    return c.json({ accounts: result.results || [] });
  } catch (error) {
    console.error('Failed to fetch email accounts:', error);
    return c.json({ error: 'Failed to fetch email accounts' }, 500);
  }
});

// Add a new email account
app.post('/', authMiddleware, async (c: Context) => {
  const user = getAuthUser(c);
  const db = c.env.DB;
  const jwtSecret = c.env.JWT_SECRET;

  try {
    const body = await c.req.json();
    const { email, username, password, imap_server, smtp_server, smtp_port } = body;

    // Validate required fields
    if (!email || !username || !password || !imap_server || !smtp_server) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Encrypt the password
    const encryptedPassword = encryptPassword(password, jwtSecret);

    // Check if this is the first account for the user
    const existingAccounts = await db
      .prepare('SELECT COUNT(*) as count FROM email_accounts WHERE user_id = ?')
      .bind(user.userId)
      .first();

    const isFirstAccount = existingAccounts?.count === 0;

    // Insert the new account
    const result = await db
      .prepare(
        `INSERT INTO email_accounts (user_id, email, username, password, imap_server, smtp_server, smtp_port, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        user.userId,
        email,
        username,
        encryptedPassword,
        imap_server,
        smtp_server,
        smtp_port || 587,
        isFirstAccount ? 1 : 0
      )
      .run();

    if (!result.success) {
      return c.json({ error: 'Failed to add email account' }, 500);
    }

    // Fetch the newly created account
    const newAccount = await db
      .prepare(
        `SELECT id, email, username, imap_server, smtp_server, smtp_port, is_default, created_at
         FROM email_accounts
         WHERE id = ?`
      )
      .bind(result.meta.last_row_id)
      .first();

    return c.json({ account: newAccount }, 201);
  } catch (error) {
    console.error('Failed to add email account:', error);
    return c.json({ error: 'Failed to add email account' }, 500);
  }
});

// Delete an email account
app.delete('/:id', authMiddleware, async (c: Context) => {
  const user = getAuthUser(c);
  const accountId = c.req.param('id');
  const db = c.env.DB;

  try {
    // Verify the account belongs to the user
    const account = await db
      .prepare('SELECT id, is_default FROM email_accounts WHERE id = ? AND user_id = ?')
      .bind(accountId, user.userId)
      .first();

    if (!account) {
      return c.json({ error: 'Email account not found' }, 404);
    }

    // Delete the account
    const result = await db
      .prepare('DELETE FROM email_accounts WHERE id = ? AND user_id = ?')
      .bind(accountId, user.userId)
      .run();

    if (!result.success) {
      return c.json({ error: 'Failed to delete email account' }, 500);
    }

    // If this was the default account, set another account as default
    if (account.is_default) {
      await db
        .prepare(
          `UPDATE email_accounts
           SET is_default = 1
           WHERE user_id = ? AND id = (
             SELECT id FROM email_accounts WHERE user_id = ? LIMIT 1
           )`
        )
        .bind(user.userId, user.userId)
        .run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to delete email account:', error);
    return c.json({ error: 'Failed to delete email account' }, 500);
  }
});

// Set an account as default
app.post('/:id/set-default', authMiddleware, async (c: Context) => {
  const user = getAuthUser(c);
  const accountId = c.req.param('id');
  const db = c.env.DB;

  try {
    // Verify the account belongs to the user
    const account = await db
      .prepare('SELECT id FROM email_accounts WHERE id = ? AND user_id = ?')
      .bind(accountId, user.userId)
      .first();

    if (!account) {
      return c.json({ error: 'Email account not found' }, 404);
    }

    // Unset all other accounts as default
    await db
      .prepare('UPDATE email_accounts SET is_default = 0 WHERE user_id = ?')
      .bind(user.userId)
      .run();

    // Set this account as default
    const result = await db
      .prepare('UPDATE email_accounts SET is_default = 1 WHERE id = ? AND user_id = ?')
      .bind(accountId, user.userId)
      .run();

    if (!result.success) {
      return c.json({ error: 'Failed to set default account' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to set default account:', error);
    return c.json({ error: 'Failed to set default account' }, 500);
  }
});

// Get decrypted credentials for an account (internal use only)
export async function getAccountCredentials(
  db: D1Database,
  userId: number,
  accountId: number,
  jwtSecret: string
): Promise<{
  email: string;
  username: string;
  password: string;
  imap_server: string;
  smtp_server: string;
  smtp_port: number;
} | null> {
  const account = await db
    .prepare(
      `SELECT email, username, password, imap_server, smtp_server, smtp_port
       FROM email_accounts
       WHERE id = ? AND user_id = ?`
    )
    .bind(accountId, userId)
    .first();

  if (!account) {
    return null;
  }

  return {
    email: account.email as string,
    username: account.username as string,
    password: decryptPassword(account.password as string, jwtSecret),
    imap_server: account.imap_server as string,
    smtp_server: account.smtp_server as string,
    smtp_port: account.smtp_port as number,
  };
}

// Get default account for a user
export async function getDefaultAccount(
  db: D1Database,
  userId: number,
  jwtSecret: string
): Promise<{
  id: number;
  email: string;
  username: string;
  password: string;
  imap_server: string;
  smtp_server: string;
  smtp_port: number;
} | null> {
  const account = await db
    .prepare(
      `SELECT id, email, username, password, imap_server, smtp_server, smtp_port
       FROM email_accounts
       WHERE user_id = ? AND is_default = 1
       LIMIT 1`
    )
    .bind(userId)
    .first();

  if (!account) {
    return null;
  }

  return {
    id: account.id as number,
    email: account.email as string,
    username: account.username as string,
    password: decryptPassword(account.password as string, jwtSecret),
    imap_server: account.imap_server as string,
    smtp_server: account.smtp_server as string,
    smtp_port: account.smtp_port as number,
  };
}

export default app;

