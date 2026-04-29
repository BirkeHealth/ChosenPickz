'use strict';

const db = require('../db');
const { loadUserFromRequest, sendJson, readJsonBody } = require('./auth');

const VALID_ROLES = ['admin', 'handicapper', 'member'];
const VALID_POST_STATUSES = ['Draft', 'Published', 'Archived'];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Require that the request comes from an authenticated admin user.
 * Returns the user object if allowed, or sends a 401/403 and returns null.
 */
async function requireAdmin(req, res) {
  if (!db.isConfigured()) {
    sendJson(res, 503, { error: 'Database is not configured.' });
    return null;
  }
  const user = await loadUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return null;
  }
  if (user.role !== 'admin') {
    sendJson(res, 403, { error: 'Admin access required.' });
    return null;
  }
  return user;
}

function mapUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    role: row.role,
    disabled: row.disabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPostRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    title: row.title,
    category: row.category,
    tags: row.tags,
    excerpt: row.excerpt,
    featuredImage: row.featured_image,
    content: row.content,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

/**
 * Handles all /api/admin/* requests.
 */
async function handleAdminApi(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;
  const pathParts = pathname.split('/').filter(Boolean);
  // pathParts: ['api', 'admin', <resource>, <id>?]

  const resource = pathParts[2]; // 'users' | 'posts'
  const resourceId = pathParts[3] ? decodeURIComponent(pathParts[3]) : null;

  // ── Users ─────────────────────────────────────────────────────────────────

  // GET /api/admin/users
  if (req.method === 'GET' && resource === 'users' && !resourceId) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const result = await db.query(
      'SELECT id, email, username, name, role, disabled, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return sendJson(res, 200, result.rows.map(mapUserRow));
  }

  // PATCH /api/admin/users/:id
  if (req.method === 'PATCH' && resource === 'users' && resourceId) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    // Prevent admin from disabling/demoting their own account
    if (resourceId === admin.id) {
      return sendJson(res, 400, { error: 'You cannot modify your own admin account via this endpoint.' });
    }

    const body = await readJsonBody(req);
    const updates = [];
    const values = [];

    if (body.role !== undefined) {
      if (!VALID_ROLES.includes(body.role)) {
        return sendJson(res, 400, { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
      }
      updates.push(`role = $${updates.length + 1}`);
      values.push(body.role);
    }

    if (body.disabled !== undefined) {
      updates.push(`disabled = $${updates.length + 1}`);
      values.push(Boolean(body.disabled));
    }

    if (updates.length === 0) {
      return sendJson(res, 400, { error: 'No updatable fields provided (role, disabled).' });
    }

    updates.push(`updated_at = $${updates.length + 1}`);
    values.push(Date.now());
    values.push(resourceId);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, email, username, name, role, disabled, created_at, updated_at`,
      values
    );

    if (!result.rows.length) {
      return sendJson(res, 404, { error: 'User not found.' });
    }

    // If user was disabled, delete all their sessions so they are logged out immediately
    if (body.disabled === true) {
      await db.query('DELETE FROM sessions WHERE user_id = $1', [resourceId]).catch((err) => {
        console.error('[admin] Failed to delete sessions for disabled user:', err.message);
      });
    }

    return sendJson(res, 200, mapUserRow(result.rows[0]));
  }

  // ── Posts ─────────────────────────────────────────────────────────────────

  // GET /api/admin/posts
  if (req.method === 'GET' && resource === 'posts' && !resourceId) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const status = urlObj.searchParams.get('status');
    const userId = urlObj.searchParams.get('userId');

    const conditions = [];
    const values = [];

    if (status) {
      conditions.push(`status = $${conditions.length + 1}`);
      values.push(status);
    }
    if (userId) {
      conditions.push(`user_id = $${conditions.length + 1}`);
      values.push(userId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT * FROM posts ${where} ORDER BY created_at DESC`,
      values
    );
    return sendJson(res, 200, result.rows.map(mapPostRow));
  }

  // PATCH /api/admin/posts/:id
  if (req.method === 'PATCH' && resource === 'posts' && resourceId) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const body = await readJsonBody(req);
    const updates = [];
    const values = [];

    if (body.status !== undefined) {
      if (!VALID_POST_STATUSES.includes(body.status)) {
        return sendJson(res, 400, { error: `Invalid status. Must be one of: ${VALID_POST_STATUSES.join(', ')}` });
      }
      updates.push(`status = $${updates.length + 1}`);
      values.push(body.status);
      if (body.status === 'Published') {
        updates.push(`published_at = $${updates.length + 1}`);
        values.push(Date.now());
      }
    }

    if (updates.length === 0) {
      return sendJson(res, 400, { error: 'No updatable fields provided (status).' });
    }

    updates.push(`updated_at = $${updates.length + 1}`);
    values.push(Date.now());
    values.push(resourceId);

    const result = await db.query(
      `UPDATE posts SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (!result.rows.length) {
      return sendJson(res, 404, { error: 'Post not found.' });
    }

    return sendJson(res, 200, mapPostRow(result.rows[0]));
  }

  // DELETE /api/admin/posts/:id
  if (req.method === 'DELETE' && resource === 'posts' && resourceId) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const result = await db.query('DELETE FROM posts WHERE id = $1 RETURNING id', [resourceId]);
    if (!result.rows.length) {
      return sendJson(res, 404, { error: 'Post not found.' });
    }
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 404, { error: 'Not found.' });
}

module.exports = { handleAdminApi };
