'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

// ── Constants ────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;
const SESSION_TOKEN_BYTES = 32;
const SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const VALID_ROLES = ['admin', 'handicapper', 'member'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateToken() {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse cookies from the Cookie header into a key/value object.
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx < 0) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

/**
 * Build the Set-Cookie header value for the session cookie.
 */
function buildSessionCookie(token, remember) {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    `cpz_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
  ];
  if (isProduction) {
    parts.push('Secure');
  }
  if (remember) {
    const expires = new Date(Date.now() + SESSION_REMEMBER_MS);
    parts.push(`Expires=${expires.toUTCString()}`);
    parts.push(`Max-Age=${Math.floor(SESSION_REMEMBER_MS / 1000)}`);
  }
  return parts.join('; ');
}

/**
 * Clear the session cookie.
 */
function buildClearCookie() {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    'cpz_session=',
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0',
  ];
  if (isProduction) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    const err = new Error('Invalid JSON body');
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Load the authenticated user from the request's session cookie.
 * Returns the user row (without password_hash) or null.
 * Returns null (treating as unauthenticated) if the user account is disabled.
 */
async function loadUserFromRequest(req) {
  if (!db.isConfigured()) return null;
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.cpz_session;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = Date.now();

  const result = await db.query(
    `SELECT u.id, u.email, u.username, u.name, u.role, u.disabled, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > $2
     LIMIT 1`,
    [tokenHash, now]
  );

  const user = result.rows[0] || null;
  // Treat disabled accounts as unauthenticated
  if (user && user.disabled) return null;
  return user;
}

// ── Route handler ────────────────────────────────────────────────────────────

/**
 * Handles all /api/auth/* requests.
 */
async function handleAuthApi(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;

  // POST /api/auth/register
  if (req.method === 'POST' && pathname === '/api/auth/register') {
    if (!db.isConfigured()) {
      return sendJson(res, 503, { error: 'Database is not configured.' });
    }

    const body = await readJsonBody(req);
    const { email, username, password, name } = body;

    // Input validation
    if (!email || !username || !password || !name) {
      return sendJson(res, 400, {
        error: 'Missing required fields: email, username, password, name',
      });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendJson(res, 400, { error: 'Invalid email address.' });
    }
    if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
      return sendJson(res, 400, { error: 'Username must be 3–50 characters.' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return sendJson(res, 400, { error: 'Password must be at least 8 characters.' });
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      return sendJson(res, 400, { error: 'Name is required.' });
    }

    const role = VALID_ROLES.includes(body.role) ? body.role : 'member';

    // Check for duplicate email/username
    const existing = await db.query(
      'SELECT id FROM users WHERE lower(email) = lower($1) OR lower(username) = lower($2) LIMIT 1',
      [email, username]
    );
    if (existing.rows.length) {
      return sendJson(res, 409, { error: 'Email or username already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = Date.now();
    const id = `usr_${now}_${crypto.randomBytes(4).toString('hex')}`;

    await db.query(
      `INSERT INTO users (id, email, username, name, role, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, email.toLowerCase(), username.toLowerCase(), name.trim(), role, passwordHash, now, now]
    );

    return sendJson(res, 201, {
      user: { id, email: email.toLowerCase(), username: username.toLowerCase(), name: name.trim(), role },
    });
  }

  // POST /api/auth/login
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    if (!db.isConfigured()) {
      return sendJson(res, 503, { error: 'Database is not configured.' });
    }

    const body = await readJsonBody(req);
    const { identifier, password, remember } = body;

    if (!identifier || !password) {
      return sendJson(res, 400, { error: 'identifier and password are required.' });
    }

    // Look up user by username or email (case-insensitive)
    const result = await db.query(
      `SELECT * FROM users WHERE lower(email) = lower($1) OR lower(username) = lower($1) LIMIT 1`,
      [identifier]
    );
    const user = result.rows[0];

    // Constant-time comparison: always run bcrypt even if user not found
    const dummyHash = '$2a$12$invalidhashfortimingnormalization0000000000000000000';
    const hashToCheck = user ? user.password_hash : dummyHash;
    const passwordOk = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordOk) {
      return sendJson(res, 401, { error: 'Invalid username or password.' });
    }

    if (user.disabled) {
      return sendJson(res, 403, { error: 'This account has been disabled. Please contact support.' });
    }

    // Create session
    const token = generateToken();
    const tokenHash = hashToken(token);
    const now = Date.now();
    const sessionId = `ses_${now}_${crypto.randomBytes(4).toString('hex')}`;
    const expiresAt = now + (remember ? SESSION_REMEMBER_MS : 24 * 60 * 60 * 1000); // 30d or 1d

    await db.query(
      `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, user.id, tokenHash, now, expiresAt]
    );

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(token, remember),
    });
    res.end(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      })
    );
    return;
  }

  // POST /api/auth/logout
  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    if (db.isConfigured()) {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.cpz_session;
      if (token) {
        const tokenHash = hashToken(token);
        await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]).catch(() => {});
      }
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': buildClearCookie(),
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // GET /api/auth/me
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    if (!db.isConfigured()) {
      return sendJson(res, 503, { error: 'Database is not configured.' });
    }
    const user = await loadUserFromRequest(req);
    if (!user) {
      return sendJson(res, 401, { error: 'Not authenticated.' });
    }
    return sendJson(res, 200, { user });
  }

  // Unknown route under /api/auth
  sendJson(res, 404, { error: 'Not found' });
}

module.exports = { handleAuthApi, loadUserFromRequest, sendJson, readJsonBody };
