// Contacts routes
import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth';

const contacts = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all routes
contacts.use('/*', authMiddleware);

/**
 * Get all contacts for the authenticated user
 * GET /api/contacts?search=query&favorite=true
 */
contacts.get('/', async (c) => {
  try {
    const user = getAuthUser(c);
    const search = c.req.query('search');
    const favorite = c.req.query('favorite') === 'true';
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    let query = 'SELECT * FROM contacts WHERE user_id = ?';
    const params: any[] = [user.userId];

    if (favorite) {
      query += ' AND is_favorite = 1';
    }

    if (search) {
      query += ' AND (email LIKE ? OR full_name LIKE ? OR company LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY last_contacted DESC, full_name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ contacts: result.results });
  } catch (error) {
    console.error('Get contacts error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Get a single contact
 * GET /api/contacts/:id
 */
contacts.get('/:id', async (c) => {
  try {
    const user = getAuthUser(c);
    const contactId = parseInt(c.params.id);

    const contact = await c.env.DB.prepare(
      'SELECT * FROM contacts WHERE id = ? AND user_id = ?'
    )
      .bind(contactId, user.userId)
      .first();

    if (!contact) {
      return c.json({ error: 'Contact not found' }, 404);
    }

    return c.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Create a new contact
 * POST /api/contacts
 */
contacts.post('/', async (c) => {
  try {
    const user = getAuthUser(c);
    const { email, fullName, firstName, lastName, company, phone, notes, avatarUrl } = await c.req.json<{
      email: string;
      fullName?: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      phone?: string;
      notes?: string;
      avatarUrl?: string;
    }>();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Check if contact already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM contacts WHERE user_id = ? AND email = ?'
    )
      .bind(user.userId, email.toLowerCase())
      .first();

    if (existing) {
      return c.json({ error: 'Contact already exists' }, 409);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO contacts (user_id, email, full_name, first_name, last_name, company, phone, notes, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        user.userId,
        email.toLowerCase(),
        fullName || null,
        firstName || null,
        lastName || null,
        company || null,
        phone || null,
        notes || null,
        avatarUrl || null
      )
      .run();

    return c.json({
      success: true,
      contact_id: result.meta.last_row_id,
    }, 201);
  } catch (error) {
    console.error('Create contact error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Update a contact
 * PATCH /api/contacts/:id
 */
contacts.patch('/:id', async (c) => {
  try {
    const user = getAuthUser(c);
    const contactId = parseInt(c.params.id);
    const { fullName, firstName, lastName, company, phone, notes, avatarUrl, isFavorite } = await c.req.json<{
      fullName?: string;
      firstName?: string;
      lastName?: string;
      company?: string;
      phone?: string;
      notes?: string;
      avatarUrl?: string;
      isFavorite?: boolean;
    }>();

    // Verify ownership
    const contact = await c.env.DB.prepare(
      'SELECT id FROM contacts WHERE id = ? AND user_id = ?'
    )
      .bind(contactId, user.userId)
      .first();

    if (!contact) {
      return c.json({ error: 'Contact not found' }, 404);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      params.push(fullName);
    }
    if (firstName !== undefined) {
      updates.push('first_name = ?');
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      params.push(lastName);
    }
    if (company !== undefined) {
      updates.push('company = ?');
      params.push(company);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatarUrl);
    }
    if (isFavorite !== undefined) {
      updates.push('is_favorite = ?');
      params.push(isFavorite ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json({ error: 'No updates provided' }, 400);
    }

    updates.push('updated_at = strftime(\'%s\', \'now\')');
    params.push(contactId);

    await c.env.DB.prepare(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...params)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Update contact error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Delete a contact
 * DELETE /api/contacts/:id
 */
contacts.delete('/:id', async (c) => {
  try {
    const user = getAuthUser(c);
    const contactId = parseInt(c.params.id);

    // Verify ownership
    const contact = await c.env.DB.prepare(
      'SELECT id FROM contacts WHERE id = ? AND user_id = ?'
    )
      .bind(contactId, user.userId)
      .first();

    if (!contact) {
      return c.json({ error: 'Contact not found' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM contacts WHERE id = ?')
      .bind(contactId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default contacts;

