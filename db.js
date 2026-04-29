const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
let initError = null;

if (!DATABASE_URL) {
  console.warn('[startup] WARNING: DATABASE_URL is not set. Picks/posts API will be unavailable.');
  console.warn('[startup]   Add a PostgreSQL database and set DATABASE_URL in your environment.');
} else {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
}

const initPromise = (async () => {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS picks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      sport TEXT,
      pick_type TEXT,
      matchup TEXT,
      pick_details TEXT,
      odds TEXT,
      units REAL,
      confidence INT,
      status TEXT,
      date TEXT,
      note TEXT,
      handicapper_name TEXT,
      posted_at BIGINT,
      created_at BIGINT,
      updated_at BIGINT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      author_name TEXT,
      title TEXT,
      category TEXT,
      tags TEXT,
      excerpt TEXT,
      featured_image TEXT,
      content TEXT,
      status TEXT,
      published_at BIGINT,
      created_at BIGINT,
      updated_at BIGINT
    )
  `);

  await pool.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_name TEXT');
  await pool.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at BIGINT');

  // ── Users & Sessions (server-side auth) ──────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      username TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      password_hash TEXT NOT NULL,
      disabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      CONSTRAINT users_email_unique UNIQUE (email),
      CONSTRAINT users_username_unique UNIQUE (username)
    )
  `);

  // Migration: add disabled column to existing tables
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT FALSE');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL
    )
  `);

  await pool.query(
    'CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions (token_hash)'
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)'
  );

  console.log('[startup] PostgreSQL tables ready (picks, posts, users, sessions).');

  // ── Admin seeding ─────────────────────────────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminName     = process.env.ADMIN_NAME     || 'Admin';

  if (adminEmail && adminPassword) {
    const existing = await pool.query(
      'SELECT id, role FROM users WHERE lower(email) = lower($1) LIMIT 1',
      [adminEmail]
    );
    if (existing.rows.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      const now = Date.now();
      const id = `usr_${now}_${crypto.randomBytes(4).toString('hex')}`;
      await pool.query(
        `INSERT INTO users (id, email, username, name, role, password_hash, disabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'admin', $5, FALSE, $6, $7)`,
        [id, adminEmail.toLowerCase(), adminUsername.toLowerCase(), adminName, passwordHash, now, now]
      );
      console.log(`[startup] Admin user created: ${adminEmail}`);
    } else if (existing.rows[0].role !== 'admin') {
      await pool.query(
        'UPDATE users SET role = $1, updated_at = $2 WHERE lower(email) = lower($3)',
        ['admin', Date.now(), adminEmail]
      );
      console.log(`[startup] Existing user promoted to admin: ${adminEmail}`);
    } else {
      console.log(`[startup] Admin user already exists: ${adminEmail}`);
    }
  }
})().catch((err) => {
  initError = err;
  console.error('[startup] PostgreSQL initialization failed:', err.message);
});

async function query(text, params = []) {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }
  await initPromise;
  if (initError) throw initError;
  return pool.query(text, params);
}

function isConfigured() {
  return Boolean(pool);
}

module.exports = {
  query,
  isConfigured,
  initPromise,
};
