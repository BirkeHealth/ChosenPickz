#!/usr/bin/env node
/**
 * transfer-picks-posts-to-user.js
 *
 * One-time migration: reassign all posts and picks in the database to a
 * specific user, identified by their display name.
 *
 * Usage:
 *   DATABASE_URL=<your-db-url> node scripts/transfer-picks-posts-to-user.js "Edwin Reed"
 *
 * The script will:
 *   1. Look up the user whose `name` matches the given display name (case-insensitive).
 *   2. Update every row in the `posts` table: set user_id and author_name.
 *   3. Update every row in the `picks` table: set user_id and handicapper_name.
 *
 * No rows are deleted. The script is idempotent — running it again is safe.
 */

'use strict';

const { Pool } = require('pg');

const TARGET_NAME = process.argv[2] || 'Edwin Reed';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find the target user
    const userResult = await client.query(
      'SELECT id, name, email, username, role FROM users WHERE lower(name) = lower($1) LIMIT 1',
      [TARGET_NAME]
    );

    if (userResult.rows.length === 0) {
      console.error(`ERROR: No user found with name "${TARGET_NAME}".`);
      console.error('       Ensure the account exists before running this migration.');
      await client.query('ROLLBACK');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`Found user: "${user.name}" (id=${user.id}, username=${user.username}, role=${user.role})`);

    const now = Date.now();

    // 2. Reassign all posts
    const postsResult = await client.query(
      `UPDATE posts
          SET user_id     = $1,
              author_name = $2,
              updated_at  = $3
        WHERE user_id IS DISTINCT FROM $1
           OR author_name IS DISTINCT FROM $2
       RETURNING id`,
      [user.id, user.name, now]
    );
    console.log(`Posts updated: ${postsResult.rowCount}`);

    // 3. Reassign all picks
    const picksResult = await client.query(
      `UPDATE picks
          SET user_id          = $1,
              handicapper_name = $2,
              updated_at       = $3
        WHERE user_id IS DISTINCT FROM $1
           OR handicapper_name IS DISTINCT FROM $2
       RETURNING id`,
      [user.id, user.name, now]
    );
    console.log(`Picks updated: ${picksResult.rowCount}`);

    await client.query('COMMIT');
    console.log('Migration complete. All posts and picks now belong to:', user.name);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
