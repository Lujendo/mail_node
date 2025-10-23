// Folders routes
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth';

const folders = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
folders.use('/*', authMiddleware);

/**
 * Get all folders for the authenticated user
 * GET /api/folders
 */
folders.get('/', async (c) => {
  try {
    const user = getAuthUser(c);

    const result = await c.env.DB.prepare(
      `SELECT f.*, 
              (SELECT COUNT(*) FROM emails WHERE folder_id = f.id) as email_count,
              (SELECT COUNT(*) FROM emails WHERE folder_id = f.id AND is_read = 0) as unread_count
       FROM folders f
       WHERE f.user_id = ?
       ORDER BY f.sort_order ASC, f.name ASC`
    )
      .bind(user.userId)
      .all();

    return c.json({ folders: result.results });
  } catch (error) {
    console.error('Get folders error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Create a new folder
 * POST /api/folders
 */
folders.post('/', async (c) => {
  try {
    const user = getAuthUser(c);
    const { name, parentFolderId, color, icon } = await c.req.json<{
      name: string;
      parentFolderId?: number;
      color?: string;
      icon?: string;
    }>();

    if (!name) {
      return c.json({ error: 'Folder name is required' }, 400);
    }

    // Check if parent folder exists and belongs to user
    if (parentFolderId) {
      const parent = await c.env.DB.prepare(
        'SELECT id FROM folders WHERE id = ? AND user_id = ?'
      )
        .bind(parentFolderId, user.userId)
        .first();

      if (!parent) {
        return c.json({ error: 'Parent folder not found' }, 404);
      }
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO folders (user_id, name, type, parent_folder_id, color, icon)
       VALUES (?, ?, 'custom', ?, ?, ?)`
    )
      .bind(user.userId, name, parentFolderId || null, color || null, icon || null)
      .run();

    return c.json({
      success: true,
      folder_id: result.meta.last_row_id,
    }, 201);
  } catch (error) {
    console.error('Create folder error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Update a folder
 * PATCH /api/folders/:id
 */
folders.patch('/:id', async (c) => {
  try {
    const user = getAuthUser(c);
    const folderId = parseInt(c.params.id);
    const { name, color, icon, sortOrder } = await c.req.json<{
      name?: string;
      color?: string;
      icon?: string;
      sortOrder?: number;
    }>();

    // Verify ownership
    const folder = await c.env.DB.prepare(
      'SELECT id, type FROM folders WHERE id = ? AND user_id = ?'
    )
      .bind(folderId, user.userId)
      .first<{ id: number; type: string }>();

    if (!folder) {
      return c.json({ error: 'Folder not found' }, 404);
    }

    // Don't allow renaming system folders
    if (folder.type !== 'custom' && name) {
      return c.json({ error: 'Cannot rename system folders' }, 400);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(sortOrder);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400);
    }

    params.push(folderId);

    await c.env.DB.prepare(
      `UPDATE folders SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...params)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Update folder error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Delete a folder
 * DELETE /api/folders/:id
 */
folders.delete('/:id', async (c) => {
  try {
    const user = getAuthUser(c);
    const folderId = parseInt(c.params.id);

    // Verify ownership and type
    const folder = await c.env.DB.prepare(
      'SELECT id, type FROM folders WHERE id = ? AND user_id = ?'
    )
      .bind(folderId, user.userId)
      .first<{ id: number; type: string }>();

    if (!folder) {
      return c.json({ error: 'Folder not found' }, 404);
    }

    // Don't allow deleting system folders
    if (folder.type !== 'custom') {
      return c.json({ error: 'Cannot delete system folders' }, 400);
    }

    // Move emails to inbox before deleting folder
    const inbox = await c.env.DB.prepare(
      'SELECT id FROM folders WHERE user_id = ? AND type = ?'
    )
      .bind(user.userId, 'inbox')
      .first<{ id: number }>();

    if (inbox) {
      await c.env.DB.prepare(
        'UPDATE emails SET folder_id = ? WHERE folder_id = ?'
      )
        .bind(inbox.id, folderId)
        .run();
    }

    // Delete folder
    await c.env.DB.prepare('DELETE FROM folders WHERE id = ?')
      .bind(folderId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default folders;

