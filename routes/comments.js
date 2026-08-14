'use strict';

const crypto = require('crypto');
const db = require('../db');
const { loadUserFromRequest, sendJson, readJsonBody } = require('./auth');

/**
 * routes/comments.js — Discussion threads on picks.
 *
 * GET    /api/comments?pickId=xxx  — list comments for a pick (signed-in members only)
 * POST   /api/comments             — post a comment { pickId, content }
 * DELETE /api/comments/:id         — remove own comment (or any, if admin)
 */

function mapCommentRow(row) {
  return {
    id: row.id,
    pickId: row.pick_id,
    userId: row.user_id,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function handleCommentsApi(req, res) {
  if (!db.isConfigured()) {
    return sendJson(res, 503, { error: 'Database is not configured.' });
  }

  const urlObj = new URL(req.url, 'http://localhost');
  const pathParts = urlObj.pathname.split('/').filter(Boolean); // ['api', 'comments', maybe id]

  const user = await loadUserFromRequest(req);
  if (!user) {
    return sendJson(res, 401, { error: 'You must be signed in to view or post comments.' });
  }

  if (req.method === 'GET' && pathParts.length === 2) {
    const pickId = urlObj.searchParams.get('pickId');
    if (!pickId) {
      return sendJson(res, 400, { error: 'Missing required query parameter: pickId' });
    }
    const result = await db.query(
      'SELECT * FROM comments WHERE pick_id = $1 ORDER BY created_at ASC',
      [pickId]
    );
    return sendJson(res, 200, result.rows.map(mapCommentRow));
  }

  if (req.method === 'POST' && pathParts.length === 2) {
    const body = await readJsonBody(req);
    const pickId = body.pickId;
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!pickId || !content) {
      return sendJson(res, 400, { error: 'pickId and content are required.' });
    }
    if (content.length > 2000) {
      return sendJson(res, 400, { error: 'Comment is too long (max 2000 characters).' });
    }

    const pickCheck = await db.query('SELECT id FROM picks WHERE id = $1 LIMIT 1', [pickId]);
    if (!pickCheck.rows.length) {
      return sendJson(res, 404, { error: 'Pick not found.' });
    }

    const now = Date.now();
    const id = `cmt_${now}_${crypto.randomBytes(4).toString('hex')}`;

    await db.query(
      `INSERT INTO comments (id, pick_id, user_id, author_name, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, pickId, user.id, user.name, content, now]
    );

    return sendJson(res, 201, mapCommentRow({
      id, pick_id: pickId, user_id: user.id, author_name: user.name, content, created_at: now,
    }));
  }

  if (req.method === 'DELETE' && pathParts.length === 3) {
    const id = decodeURIComponent(pathParts[2]);
    const existing = await db.query('SELECT user_id FROM comments WHERE id = $1 LIMIT 1', [id]);
    if (!existing.rows.length) {
      return sendJson(res, 404, { error: 'Comment not found.' });
    }
    if (existing.rows[0].user_id !== user.id && user.role !== 'admin') {
      return sendJson(res, 403, { error: 'You can only delete your own comments.' });
    }
    await db.query('DELETE FROM comments WHERE id = $1', [id]);
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 404, { error: 'Not found' });
}

module.exports = { handleCommentsApi };
