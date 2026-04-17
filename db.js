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

  console.log('[startup] PostgreSQL tables ready (picks, posts).');
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
