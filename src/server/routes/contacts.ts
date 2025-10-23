/**
 * Contact routes
 */

import { Router, Response } from 'express';
import { query, queryOne, execute } from '../db/connection';
import { authMiddleware, getAuthUser, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

/**
 * Get contacts
 * GET /api/contacts?search=query&favorite=true
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const search = req.query.search as string;
    const favorite = req.query.favorite === 'true';

    let sql = 'SELECT * FROM contacts WHERE user_id = ?';
    const params: any[] = [user.userId];

    if (favorite) {
      sql += ' AND is_favorite = 1';
    }

    if (search) {
      sql += ' AND (email LIKE ? OR full_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY contact_count DESC, full_name ASC';

    const contacts = await query(sql, params);

    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get single contact
 * GET /api/contacts/:id
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const contactId = parseInt(req.params.id);

    const contact = await queryOne(
      'SELECT * FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, user.userId]
    );

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create contact
 * POST /api/contacts
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { email, fullName, company, phone } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const result = await execute(
      `INSERT INTO contacts (user_id, email, full_name, company, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.userId, email, fullName || null, company || null, phone || null, Math.floor(Date.now() / 1000)]
    );

    res.json({
      success: true,
      contact_id: result.insertId,
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update contact
 * PATCH /api/contacts/:id
 */
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const contactId = parseInt(req.params.id);
    const { email, fullName, company, phone, isFavorite } = req.body;

    await execute(
      `UPDATE contacts SET email = ?, full_name = ?, company = ?, phone = ?, is_favorite = ?
       WHERE id = ? AND user_id = ?`,
      [email, fullName, company, phone, isFavorite ? 1 : 0, contactId, user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete contact
 * DELETE /api/contacts/:id
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    const contactId = parseInt(req.params.id);

    await execute(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

