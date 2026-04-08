const http = require('http');
const fs = require('fs');
const path = require('path');
const oddsHandler   = require('./routes/odds');
const sportsHandler = require('./routes/sports');
const newsHandler   = require('./routes/news');
const emailHandler  = require('./routes/email');
const usersHandler  = require('./routes/users');

const PORT = process.env.PORT || 3000;

// ── Startup environment checks ────────────────────────────────────────────────
if (!process.env.NEWS_API_KEY || process.env.NEWS_API_KEY === 'YOUR_NEWS_API_KEY_HERE') {
  console.warn('[startup] WARNING: NEWS_API_KEY is not set. Sports news will be unavailable.');
  console.warn('[startup]   Set NEWS_API_KEY in your .env file or as a server environment variable.');
  console.warn('[startup]   See .env.example for details.');
}
if (!process.env.ODDS_API_KEY || process.env.ODDS_API_KEY === 'YOUR_ODDS_API_KEY_HERE') {
  console.warn('[startup] WARNING: ODDS_API_KEY is not set. Live odds will be unavailable.');
  console.warn('[startup]   Set ODDS_API_KEY in your .env file or as a server environment variable.');
}

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('[startup] WARNING: SMTP_* variables are not set. Signup confirmation emails will be unavailable.');
  console.warn('[startup]   Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally SMTP_FROM) in your .env file.');
  console.warn('[startup]   See .env.example for details.');
}

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(__dirname, 'sharpedge', 'dist');

// Root-level static files served directly from the project root (the landing page app)
const ROOT_STATIC_FILES = new Set([
  // ── HTML pages ──
  'index.html',
  'chosepickz.html',
  'live-bets.html',
  'best-odds.html',
  'news.html',
  'analysis.html',
  'pick.html',
  'about.html',
  'todays-picks.html',
  'handicapper-portal.html',
  // ── Root scripts & styles ──
  'styles.css',
  'app.js',
  'handicapper-portal.js',
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
  'scripts/pick.js',
]);

const HTML_404 = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 – Not Found | SharpEdge</title>
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

const server = http.createServer((req, res) => {
  let urlPath = req.url;
  // Strip query strings
  urlPath = urlPath.split('?')[0];

  // ── User account info ──────────────────────────────────────────────────────
  // Returns the authenticated user's profile. Currently returns mock data;
  // TODO: connect to real auth and user database (see routes/users.js).
  if (urlPath === '/api/users/me') {
    usersHandler(req, res);
    return;
  }

  // ── Email confirmation ─────────────────────────────────────────────────────
  // Sends a signup-verification email via server-side SMTP so credentials
  // never reach the browser.
  if (urlPath === '/api/send-confirmation-email') {
    emailHandler(req, res);
    return;
  }

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

  // ── SharpEdge React SPA ────────────────────────────────────────────────────
  // Serve the SharpEdge React SPA at /sharpedge/ (and /home, /app for backward compat).
  if (urlPath === '/sharpedge' || urlPath === '/sharpedge/' || urlPath === '/home' || urlPath === '/home/' || urlPath === '/app' || urlPath === '/app/') {
    const indexPath = path.join(DIST_DIR, 'index.html');
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

  // ── SharpEdge React app assets ────────────────────────────────────────────
  // Serve static assets (JS, CSS, images, etc.) from sharpedge/dist/ for
  // requests under /sharpedge/*. Strip the /sharpedge/ prefix to get the asset
  // filename, then serve it with the correct Content-Type. Only fall back to
  // index.html for SPA router paths (i.e. when no matching file exists in dist/).
  // Also handle legacy /home/* paths for backward compatibility.
  if (urlPath.startsWith('/sharpedge/') || urlPath.startsWith('/home/')) {
    const prefix = urlPath.startsWith('/sharpedge/') ? '/sharpedge/' : '/home/';
    const assetName = urlPath.slice(prefix.length);
    const ext = path.extname(assetName);
    if (ext && MIME_TYPES[ext]) {
      // Request looks like a static asset — try to serve it from dist/
      const assetPath = path.resolve(DIST_DIR, assetName);
      const rel = path.relative(DIST_DIR, assetPath);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }
      fs.readFile(assetPath, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          } else {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
          }
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] });
        res.end(data);
      });
      return;
    }
    // No file extension — treat as an SPA route and serve index.html
    const indexPath = path.join(DIST_DIR, 'index.html');
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

  // ── Fallback: 404 ──────────────────────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(HTML_404);
});

server.listen(PORT, () => {
  console.log(`SharpEdge server running on port ${PORT}`);
});
