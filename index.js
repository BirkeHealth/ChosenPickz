const http = require('http');
const fs = require('fs');
const path = require('path');
const oddsHandler   = require('./routes/odds');
const sportsHandler = require('./routes/sports');
const newsHandler   = require('./routes/news');
const { handleAuthApi } = require('./routes/auth');
const { handleAdminApi } = require('./routes/admin');
const db = require('./db');

const PORT = process.env.PORT || 3000;

// ── Startup environment checks ────────────────────────────────────────────────
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'CHANGE_ME_TO_A_RANDOM_STRING') {
  console.warn('[startup] WARNING: SESSION_SECRET is not set or is still the default value.');
  console.warn('[startup]   Generate a strong random secret and set SESSION_SECRET in your .env file.');
}
if (!process.env.NEWS_API_KEY || process.env.NEWS_API_KEY === 'YOUR_NEWS_API_KEY_HERE') {
  console.warn('[startup] WARNING: NEWS_API_KEY is not set. Sports news will be unavailable.');
  console.warn('[startup]   Set NEWS_API_KEY in your .env file or as a server environment variable.');
  console.warn('[startup]   See .env.example for details.');
}
if (!process.env.ODDS_API_KEY || process.env.ODDS_API_KEY === 'YOUR_ODDS_API_KEY_HERE') {
  console.warn('[startup] WARNING: ODDS_API_KEY is not set. Live odds will be unavailable.');
  console.warn('[startup]   Set ODDS_API_KEY in your .env file or as a server environment variable.');
}

const ROOT_DIR = __dirname;
// Root-level static files served directly from the project root (the landing page app)
const ROOT_STATIC_FILES = new Set([
  // ── HTML pages ──
  'index.html',
  'chosepickz.html',
  'live-bets.html',
  'all-odds.html',
  'news.html',
  'analysis.html',
  'blog-post.html',
  'pick.html',
  'about.html',
  'todays-picks.html',
  'handicapper-portal.html',
  // ── Root scripts & styles ──
  'styles.css',
  'components/ScoreboardCarousel/ScoreboardCarousel.css',
  'app.js',
  'config.js',
  'picks.js',
  // ── Sportsbook scaffold styles ──
  'styles/main.css',
  'styles/theme.css',
  // ── Sportsbook scaffold scripts ──
  'scripts/odds.js',
  'scripts/news.js',
  'scripts/sportsNews.js',
  'scripts/analysis.js',
  'scripts/blogPost.js',
  'scripts/pick.js',
  // ── Handicapper portal ──
  'login.html',
  'register.html',
  'dashboard.html',
  'all-odds.html',
  'css/style.css',
  'css/dashboard.css',
  'js/auth.js',
  'js/picks.js',
  'js/blog.js',
  'js/dashboard.js',
  // ── Admin ──
  'admin.html',
  'js/admin.js',
]);

const HTML_404 = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 – Not Found | CH0SEN1 PICKZ</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0f;
      color: #e8e8f0;
      font-family: 'DM Sans', system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem;
    }
    .code {
      font-size: clamp(6rem, 20vw, 10rem);
      font-weight: 700;
      line-height: 1;
      color: #d4a843;
      letter-spacing: -4px;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-top: 1rem;
      color: #e8e8f0;
    }
    p {
      margin-top: 0.5rem;
      color: #8888a0;
      font-size: 1rem;
    }
    a {
      display: inline-block;
      margin-top: 2rem;
      padding: 0.6rem 1.5rem;
      background: #d4a843;
      color: #0a0a0f;
      border-radius: 0.5rem;
      font-weight: 600;
      text-decoration: none;
      font-size: 0.95rem;
    }
    a:hover { background: #f0c060; }
  </style>
</head>
<body>
  <div class="code">404</div>
  <h1>Page Not Found</h1>
  <p>The page you're looking for doesn't exist or has been moved.</p>
  <a href="/">Go Home</a>
</body>
</html>`;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseUrl(req) {
  return new URL(req.url, 'http://localhost');
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

function mapPickRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    sport: row.sport,
    pickType: row.pick_type,
    matchup: row.matchup,
    pickDetails: row.pick_details,
    odds: row.odds,
    units: row.units,
    confidence: row.confidence,
    status: row.status,
    date: row.date,
    note: row.note,
    handicapperName: row.handicapper_name,
    postedAt: row.posted_at,
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

function ensureDbConfigured(res) {
  if (db.isConfigured()) return true;
  sendJson(res, 503, { error: 'Database is not configured. Set DATABASE_URL.' });
  return false;
}

async function handlePicksApi(req, res, urlObj) {
  if (!ensureDbConfigured(res)) return;

  const pathParts = urlObj.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && pathParts[2] === 'stats') {
    const userId = urlObj.searchParams.get('userId');
    if (!userId) {
      sendJson(res, 400, { error: 'Missing required query parameter: userId' });
      return;
    }

    const result = await db.query(
      'SELECT status, units, odds FROM picks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const picks = result.rows;
    const wins = picks.filter((p) => p.status === 'Win').length;
    const losses = picks.filter((p) => p.status === 'Loss').length;
    const pending = picks.filter((p) => p.status === 'Pending').length;
    const settled = wins + losses;
    const winRate = settled > 0 ? ((wins / settled) * 100).toFixed(1) : '0.0';

    let units = 0;
    picks.forEach((p) => {
      const u = parseFloat(p.units) || 1;
      const odds = parseInt(p.odds, 10) || -110;
      if (p.status === 'Win') {
        units += odds < 0 ? u * (100 / Math.abs(odds)) : u * (odds / 100);
      } else if (p.status === 'Loss') {
        units -= u;
      }
    });

    sendJson(res, 200, {
      total: picks.length,
      wins,
      losses,
      pending,
      winRate,
      units: units.toFixed(2),
    });
    return;
  }

  if (req.method === 'GET' && pathParts.length === 2) {
    const userId = urlObj.searchParams.get('userId');
    const result = userId
      ? await db.query('SELECT * FROM picks WHERE user_id = $1 ORDER BY created_at DESC', [userId])
      : await db.query('SELECT * FROM picks ORDER BY created_at DESC');

    sendJson(res, 200, result.rows.map(mapPickRow));
    return;
  }

  if (req.method === 'POST' && pathParts.length === 2) {
    const body = await readJsonBody(req);
    if (!body.userId) {
      sendJson(res, 400, { error: 'Missing required field: userId' });
      return;
    }

    const now = Date.now();
    const pick = {
      id: body.id || makeId('pick'),
      userId: body.userId,
      sport: body.sport || '',
      pickType: body.pickType || '',
      matchup: body.matchup || '',
      pickDetails: body.pickDetails || '',
      odds: body.odds || '',
      units: body.units,
      confidence: Math.max(1, Math.min(5, parseInt(body.confidence) || 3)),
      status: body.status || 'Pending',
      date: body.date || '',
      note: body.note || '',
      handicapperName: body.handicapperName || '',
      postedAt: Number.isFinite(Number(body.postedAt)) ? Number(body.postedAt) : now,
      createdAt: Number.isFinite(Number(body.createdAt)) ? Number(body.createdAt) : now,
      updatedAt: now,
    };

    await db.query(
      `INSERT INTO picks (
        id, user_id, sport, pick_type, matchup, pick_details, odds, units,
        confidence, status, date, note, handicapper_name, posted_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16
      )`,
      [
        pick.id, pick.userId, pick.sport, pick.pickType, pick.matchup, pick.pickDetails,
        pick.odds, pick.units, pick.confidence, pick.status, pick.date, pick.note,
        pick.handicapperName, pick.postedAt, pick.createdAt, pick.updatedAt,
      ]
    );

    sendJson(res, 201, pick);
    return;
  }

  if (pathParts.length === 3) {
    const id = decodeURIComponent(pathParts[2]);

    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM picks WHERE id = $1 LIMIT 1', [id]);
      if (!result.rows.length) {
        sendJson(res, 404, { error: 'Pick not found' });
        return;
      }
      sendJson(res, 200, mapPickRow(result.rows[0]));
      return;
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const clampedConfidence = body.confidence !== undefined
        ? Math.max(1, Math.min(5, parseInt(body.confidence) || 3))
        : undefined;
      const updates = [
        ['user_id', body.userId],
        ['sport', body.sport],
        ['pick_type', body.pickType],
        ['matchup', body.matchup],
        ['pick_details', body.pickDetails],
        ['odds', body.odds],
        ['units', body.units],
        ['confidence', clampedConfidence],
        ['status', body.status],
        ['date', body.date],
        ['note', body.note],
        ['handicapper_name', body.handicapperName],
        ['posted_at', body.postedAt],
        ['created_at', body.createdAt],
      ].filter(([, value]) => value !== undefined);

      updates.push(['updated_at', Date.now()]);

      const setClause = updates.map(([col], i) => `${col} = $${i + 1}`).join(', ');
      const values = updates.map(([, value]) => value);
      values.push(id);

      const result = await db.query(
        `UPDATE picks SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (!result.rows.length) {
        sendJson(res, 404, { error: 'Pick not found' });
        return;
      }

      sendJson(res, 200, mapPickRow(result.rows[0]));
      return;
    }

    if (req.method === 'DELETE') {
      const result = await db.query('DELETE FROM picks WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) {
        sendJson(res, 404, { error: 'Pick not found' });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  sendJson(res, 404, { error: 'Not found' });
}

async function handlePostsApi(req, res, urlObj) {
  if (!ensureDbConfigured(res)) return;

  const pathParts = urlObj.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && pathParts.length === 2) {
    const userId = urlObj.searchParams.get('userId');
    const result = userId
      ? await db.query('SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC', [userId])
      : await db.query('SELECT * FROM posts ORDER BY created_at DESC');

    sendJson(res, 200, result.rows.map(mapPostRow));
    return;
  }

  if (req.method === 'POST' && pathParts.length === 2) {
    const body = await readJsonBody(req);
    if (!body.userId) {
      sendJson(res, 400, { error: 'Missing required field: userId' });
      return;
    }

    const now = Date.now();
    const post = {
      id: body.id || makeId('post'),
      userId: body.userId,
      authorName: body.authorName || 'Handicapper',
      title: body.title || '',
      category: body.category || '',
      tags: body.tags || '',
      excerpt: body.excerpt || '',
      featuredImage: body.featuredImage || '',
      content: body.content || '',
      status: body.status || 'Draft',
      publishedAt: (body.status || 'Draft') === 'Published'
        ? (Number.isFinite(Number(body.publishedAt)) ? Number(body.publishedAt) : now)
        : (Number.isFinite(Number(body.publishedAt)) ? Number(body.publishedAt) : null),
      createdAt: Number.isFinite(Number(body.createdAt)) ? Number(body.createdAt) : now,
      updatedAt: now,
    };

    await db.query(
      `INSERT INTO posts (
        id, user_id, author_name, title, category, tags, excerpt,
        featured_image, content, status, published_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      )`,
      [
        post.id, post.userId, post.authorName, post.title, post.category, post.tags, post.excerpt,
        post.featuredImage, post.content, post.status, post.publishedAt, post.createdAt, post.updatedAt,
      ]
    );

    sendJson(res, 201, post);
    return;
  }

  if (pathParts.length === 3) {
    const id = decodeURIComponent(pathParts[2]);

    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM posts WHERE id = $1 LIMIT 1', [id]);
      if (!result.rows.length) {
        sendJson(res, 404, { error: 'Post not found' });
        return;
      }
      sendJson(res, 200, mapPostRow(result.rows[0]));
      return;
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const updates = [
        ['user_id', body.userId],
        ['author_name', body.authorName],
        ['title', body.title],
        ['category', body.category],
        ['tags', body.tags],
        ['excerpt', body.excerpt],
        ['featured_image', body.featuredImage],
        ['content', body.content],
        ['status', body.status],
        ['published_at', body.publishedAt],
        ['created_at', body.createdAt],
      ].filter(([, value]) => value !== undefined);

      if (body.status === 'Published' && body.publishedAt === undefined) {
        updates.push(['published_at', Date.now()]);
      }
      updates.push(['updated_at', Date.now()]);

      const setClause = updates.map(([col], i) => `${col} = $${i + 1}`).join(', ');
      const values = updates.map(([, value]) => value);
      values.push(id);

      const result = await db.query(
        `UPDATE posts SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (!result.rows.length) {
        sendJson(res, 404, { error: 'Post not found' });
        return;
      }

      sendJson(res, 200, mapPostRow(result.rows[0]));
      return;
    }

    if (req.method === 'DELETE') {
      const result = await db.query('DELETE FROM posts WHERE id = $1 RETURNING id', [id]);
      if (!result.rows.length) {
        sendJson(res, 404, { error: 'Post not found' });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const urlObj = parseUrl(req);
  const urlPath = urlObj.pathname;

  // ── Odds API proxy ─────────────────────────────────────────────────────────
  // Fetches ML (h2h), spread, and O/U (totals) odds server-side so the API
  // key is never exposed to the frontend.
  if (urlPath === '/api/odds') {
    oddsHandler(req, res);
    return;
  }

  // ── Sports list proxy ──────────────────────────────────────────────────────
  // Returns the full list of sports from The Odds API, cached for 5 minutes.
  if (urlPath === '/api/sports') {
    sportsHandler(req, res);
    return;
  }

  // ── News proxy ─────────────────────────────────────────────────────────────
  // Fetches top sports headlines from NewsAPI.org server-side so the API key
  // is never exposed to the browser.
  if (urlPath === '/api/news') {
    newsHandler(req, res);
    return;
  }

  // ── Picks API ───────────────────────────────────────────────────────────────
  if (urlPath === '/api/picks' || urlPath.startsWith('/api/picks/')) {
    try {
      await handlePicksApi(req, res, urlObj);
    } catch (err) {
      const code = err.statusCode || 500;
      sendJson(res, code, { error: code === 500 ? 'Internal server error' : err.message });
      if (code === 500) console.error('[api/picks] error:', err);
    }
    return;
  }

  // ── Posts API ───────────────────────────────────────────────────────────────
  if (urlPath === '/api/posts' || urlPath.startsWith('/api/posts/')) {
    try {
      await handlePostsApi(req, res, urlObj);
    } catch (err) {
      const code = err.statusCode || 500;
      sendJson(res, code, { error: code === 500 ? 'Internal server error' : err.message });
      if (code === 500) console.error('[api/posts] error:', err);
    }
    return;
  }

  // ── Auth API ────────────────────────────────────────────────────────────────
  if (urlPath.startsWith('/api/auth')) {
    try {
      await handleAuthApi(req, res);
    } catch (err) {
      const code = err.statusCode || 500;
      sendJson(res, code, { error: code === 500 ? 'Internal server error' : err.message });
      if (code === 500) console.error('[api/auth] error:', err);
    }
    return;
  }

  // ── Admin API ───────────────────────────────────────────────────────────────
  if (urlPath.startsWith('/api/admin')) {
    try {
      await handleAdminApi(req, res);
    } catch (err) {
      const code = err.statusCode || 500;
      sendJson(res, code, { error: code === 500 ? 'Internal server error' : err.message });
      if (code === 500) console.error('[api/admin] error:', err);
    }
    return;
  }

  // ── Root — static CHOSEN1 PICKZ homepage ──────────────────────────────────
  // Serve the original static landing page at "/" (the primary entry point).
  if (urlPath === '/' || urlPath === '/index.html') {
    const indexPath = path.join(ROOT_DIR, 'index.html');
    fs.readFile(indexPath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(HTML_404);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }
  // ── Root-level static assets ───────────────────────────────────────────────
  // Serve landing page app files (CSS, JS, other HTML pages) from the project root.
  // Uses an explicit allowlist — only files in ROOT_STATIC_FILES are served from root,
  // which also prevents any path-traversal access to server-side files.
  const rootFileName = urlPath.replace(/^\/+/, '');
  if (ROOT_STATIC_FILES.has(rootFileName)) {
    const rootFilePath = path.join(ROOT_DIR, rootFileName);
    fs.readFile(rootFilePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(HTML_404);
        return;
      }
      const ext = path.extname(rootFilePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
    return;
  }
  // ── Fallback: 404 ──────────────────────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(HTML_404);
});

server.listen(PORT, () => {
  console.log(`CH0SEN1 PICKZ server running on port ${PORT}`);
});
