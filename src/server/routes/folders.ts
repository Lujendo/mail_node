/**
 * Folder routes
 */

import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/connection';
import { authMiddleware, getAuthUser, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

/**
 * Get all folders
 * GET /api/folders
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);

    const folders = await query(
      `SELECT f.*, COUNT(e.id) as email_count, SUM(CASE WHEN e.is_read = 0 THEN 1 ELSE 0 END) as unread_count
       FROM folders f
       LEFT JOIN emails e ON f.id = e.folder_id
       WHERE f.user_id = ?
       GROUP BY f.id
       ORDER BY f.type ASC, f.name ASC`,
      [user.userId]
    );

    res.json({ folders });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create folder
 * POST /api/folders
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { name, color } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Folder name is required' });
      return;
    }

    const result = await execute(
      'INSERT INTO folders (user_id, name, color, created_at) VALUES (?, ?, ?, ?)',
      [user.userId, name, color || null, Math.floor(Date.now() / 1000)]
    );

    res.json({
      success: true,
      folder_id: result.insertId,
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update folder
 * PATCH /api/folders/:id
 */
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const folderId = parseInt(req.params.id);
    const { name, color } = req.body;

    await execute(
      'UPDATE folders SET name = ?, color = ? WHERE id = ? AND user_id = ?',
      [name, color, folderId, user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete folder
 * DELETE /api/folders/:id
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const folderId = parseInt(req.params.id);

    // Check if it's a system folder
    const folder = await queryOne(
      'SELECT type FROM folders WHERE id = ? AND user_id = ?',
      [folderId, user.userId]
    );

    if (folder?.type) {
      res.status(400).json({ error: 'Cannot delete system folders' });
      return;
    }

    await execute(
      'DELETE FROM folders WHERE id = ? AND user_id = ?',
      [folderId, user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

