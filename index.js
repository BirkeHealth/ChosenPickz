const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const DIST_DIR = path.join(__dirname, 'sharpedge', 'dist');

// Root-level static files served directly from the project root (the landing page app)
const ROOT_STATIC_FILES = new Set([
  'index.html',
  'chosepickz.html',
  'live-bets.html',
  'styles.css',
  'app.js',
  'config.js',
  'picks.js',
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

  // ── Root landing page ──────────────────────────────────────────────────────
  // Serve the landing page (root index.html) for "/" and "/index.html"
  if (urlPath === '/' || urlPath === '/index.html') {
    const landingPath = path.join(ROOT_DIR, 'index.html');
    fs.readFile(landingPath, (err, data) => {
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

  // ── SharpEdge React app ────────────────────────────────────────────────────
  // Serve the SharpEdge SPA at /app (and /app/*)
  if (urlPath === '/app' || urlPath === '/app/') {
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

  // ── SharpEdge compiled assets ──────────────────────────────────────────────
  // Serve JS/CSS bundles, favicon, icons, etc. from sharpedge/dist/.
  // The path.relative check below guards against directory traversal.
  const assetFileName = urlPath.replace(/^\/+/, '');
  const filePath = path.resolve(DIST_DIR, assetFileName);
  const rel = path.relative(DIST_DIR, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // For SPA deep-link routing under /app/*: serve SharpEdge index.html
      const indexPath = path.join(DIST_DIR, 'index.html');
      fs.readFile(indexPath, (indexErr, indexData) => {
        if (indexErr) {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end(HTML_404);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`SharpEdge server running on port ${PORT}`);
});
