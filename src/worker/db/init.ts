// Database initialization utilities
import type { D1Database } from '@cloudflare/workers-types';

/**
 * Initialize default folders for a new user
 */
export async function initializeUserFolders(db: D1Database, userId: number): Promise<void> {
  const defaultFolders = [
    { name: 'Inbox', type: 'inbox', icon: '📥', color: '#3b82f6' },
    { name: 'Sent', type: 'sent', icon: '📤', color: '#10b981' },
    { name: 'Drafts', type: 'drafts', icon: '📝', color: '#f59e0b' },
    { name: 'Trash', type: 'trash', icon: '🗑️', color: '#ef4444' },
    { name: 'Spam', type: 'spam', icon: '⚠️', color: '#f97316' },
  ];

  const stmt = db.prepare(
    'INSERT INTO folders (user_id, name, type, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const batch = defaultFolders.map((folder, index) =>
    stmt.bind(userId, folder.name, folder.type, folder.icon, folder.color, index)
  );

  await db.batch(batch);
}

/**
 * Initialize default settings for a new user
 */
export async function initializeUserSettings(db: D1Database, userId: number): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_settings (user_id, theme, language, timezone, email_per_page)
       VALUES (?, 'light', 'en', 'UTC', 50)`
    )
    .bind(userId)
    .run();
}

/**
 * Get or create a contact from an email address
 */
export async function getOrCreateContact(
  db: D1Database,
  userId: number,
  email: string,
  name?: string
): Promise<number> {
  // Try to find existing contact
  const existing = await db
    .prepare('SELECT id FROM contacts WHERE user_id = ? AND email = ?')
    .bind(userId, email)
    .first<{ id: number }>();

  if (existing) {
    // Update contact count and last contacted
    await db
      .prepare(
        `UPDATE contacts 
         SET contact_count = contact_count + 1, 
             last_contacted = strftime('%s', 'now'),
             updated_at = strftime('%s', 'now')
         WHERE id = ?`
      )
      .bind(existing.id)
      .run();
    return existing.id;
  }

  // Create new contact
  const result = await db
    .prepare(
      `INSERT INTO contacts (user_id, email, full_name, contact_count, last_contacted)
       VALUES (?, ?, ?, 1, strftime('%s', 'now'))`
    )
    .bind(userId, email, name || null)
    .run();

  return result.meta.last_row_id as number;
}

/**
 * Apply email filters to an incoming email
 */
export async function applyEmailFilters(
  db: D1Database,
  userId: number,
  email: {
    from_email: string;
    to_email: string;
    subject: string;
    body_plaintext: string;
  }
): Promise<{ folderId?: number; labels?: number[] }> {
  const filters = await db
    .prepare(
      `SELECT id, conditions, actions 
       FROM email_filters 
       WHERE user_id = ? AND is_enabled = 1 
       ORDER BY priority DESC`
    )
    .bind(userId)
    .all<{ id: number; conditions: string; actions: string }>();

  let targetFolderId: number | undefined;
  const labels: number[] = [];

  for (const filter of filters.results) {
    const conditions = JSON.parse(filter.conditions);
    const actions = JSON.parse(filter.actions);

    // Check if all conditions match
    const allMatch = conditions.every((condition: any) => {
      const fieldValue = email[condition.field as keyof typeof email] || '';
      
      switch (condition.operator) {
        case 'contains':
          return fieldValue.toLowerCase().includes(condition.value.toLowerCase());
        case 'equals':
          return fieldValue.toLowerCase() === condition.value.toLowerCase();
        case 'starts_with':
          return fieldValue.toLowerCase().startsWith(condition.value.toLowerCase());
        case 'ends_with':
          return fieldValue.toLowerCase().endsWith(condition.value.toLowerCase());
        case 'regex':
          return new RegExp(condition.value, 'i').test(fieldValue);
        default:
          return false;
      }
    });

    if (allMatch) {
      // Apply actions
      for (const action of actions) {
        if (action.action === 'move_to_folder') {
          targetFolderId = action.folder_id;
        } else if (action.action === 'add_label') {
          labels.push(action.label_id);
        }
      }
    }
  }

  return { folderId: targetFolderId, labels };
}

/**
 * Search emails using full-text search
 */
export async function searchEmails(
  db: D1Database,
  userId: number,
  query: string,
  limit: number = 50
): Promise<any[]> {
  const results = await db
    .prepare(
      `SELECT e.* 
       FROM emails e
       JOIN emails_fts fts ON e.id = fts.rowid
       WHERE e.user_id = ? AND emails_fts MATCH ?
       ORDER BY e.received_at DESC
       LIMIT ?`
    )
    .bind(userId, query, limit)
    .all();

  return results.results;
}

/**
 * Get email thread
 */
export async function getEmailThread(
  db: D1Database,
  userId: number,
  threadId: string
): Promise<any[]> {
  const results = await db
    .prepare(
      `SELECT * FROM emails 
       WHERE user_id = ? AND thread_id = ?
       ORDER BY received_at ASC`
    )
    .bind(userId, threadId)
    .all();

  return results.results;
}

/**
 * Mark email as read/unread
 */
export async function markEmailAsRead(
  db: D1Database,
  emailId: number,
  isRead: boolean
): Promise<void> {
  await db
    .prepare('UPDATE emails SET is_read = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?')
    .bind(isRead ? 1 : 0, emailId)
    .run();
}

/**
 * Move email to folder
 */
export async function moveEmailToFolder(
  db: D1Database,
  emailId: number,
  folderId: number
): Promise<void> {
  await db
    .prepare('UPDATE emails SET folder_id = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?')
    .bind(folderId, emailId)
    .run();
}

/**
 * Delete email (move to trash or permanent delete)
 */
export async function deleteEmail(
  db: D1Database,
  userId: number,
  emailId: number,
  permanent: boolean = false
): Promise<void> {
  if (permanent) {
    await db.prepare('DELETE FROM emails WHERE id = ? AND user_id = ?').bind(emailId, userId).run();
  } else {
    // Move to trash
    const trashFolder = await db
      .prepare('SELECT id FROM folders WHERE user_id = ? AND type = ?')
      .bind(userId, 'trash')
      .first<{ id: number }>();

    if (trashFolder) {
      await moveEmailToFolder(db, emailId, trashFolder.id);
    }
  }
}

/**
 * Log audit event
 */
export async function logAudit(
  db: D1Database,
  userId: number | null,
  action: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: any
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_log (user_id, action, ip_address, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      userId,
      action,
      ipAddress || null,
      userAgent || null,
      metadata ? JSON.stringify(metadata) : null
    )
    .run();
}

