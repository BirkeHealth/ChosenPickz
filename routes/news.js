const axios = require('axios');

/**
 * routes/news.js — Secure backend proxy for NewsAPI.org
 *
 * All requests to NewsAPI are made server-side so that the API key is never
 * exposed to the browser.  The frontend calls /api/news with optional query
 * parameters; this handler injects the API key and calls the upstream API.
 *
 * Set NEWS_API_KEY as an environment variable in .env (see .env.example).
 *
 * Supported query parameters:
 *   category – news category (default: "sports")
 *   language – ISO 639-1 language code (default: "en")
 *   pageSize – number of articles 1-20 (default: 10)
 *
 * Responses are cached for 5 minutes to reduce quota usage.
 */

const NEWS_BASE_URL = 'https://newsapi.org/v2/top-headlines';

// ── In-memory cache ──────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// ── Handler ──────────────────────────────────────────────────────────────────

async function newsHandler(req, res) {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey || apiKey === 'YOUR_NEWS_API_KEY_HERE') {
    console.warn('[news] NEWS_API_KEY environment variable is not set');
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'News API key is not configured on the server' }));
    return;
  }

  const urlObj   = new URL(req.url, 'http://localhost');
  const category = urlObj.searchParams.get('category') || 'sports';
  const language = urlObj.searchParams.get('language') || 'en';
  const pageSize = Math.min(parseInt(urlObj.searchParams.get('pageSize') || '10', 10), 20);

  const cacheKey = `${category}:${language}:${pageSize}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cached));
    return;
  }

  try {
    const response = await axios.get(NEWS_BASE_URL, {
      params: { category, language, pageSize, apiKey },
    });
    setCache(cacheKey, response.data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response.data));
  } catch (error) {
    const status  = (error.response && error.response.status) || 500;
    const message = (error.response && error.response.data && error.response.data.message)
      || error.message
      || 'Failed to fetch news';
    console.error(`[news] NewsAPI request failed (HTTP ${status}):`, message);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message, status }));
  }
}

module.exports = newsHandler;
