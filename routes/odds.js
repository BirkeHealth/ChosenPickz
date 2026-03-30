const axios = require('axios');

/**
 * routes/odds.js — Secure backend proxy for The Odds API
 *
 * All requests to the Odds API are made server-side so that the API key
 * is never exposed to the browser. The frontend calls /api/odds with query
 * parameters; this handler injects the API key and calls the upstream API.
 *
 * Security note: Keeping the key server-side prevents it from being read
 * from page source or browser dev-tools network tabs. Set ODDS_API_KEY as
 * an environment variable on your host (never hard-code it in source).
 *
 * Supported query parameters:
 *   sport   – sport key (e.g. "americanfootball_nfl"). Use "upcoming" for
 *             all-sports upcoming games.  Defaults to "upcoming".
 *   mode    – "live" | "today" | "upcoming" | "date". Defaults to "upcoming".
 *   from    – ISO 8601 commenceTimeFrom (only for "today" / "date" modes).
 *   to      – ISO 8601 commenceTimeTo   (only for "today" / "date" modes).
 *   markets – comma-separated markets. Defaults to "h2h,spreads,totals".
 *
 * API best-practices implemented:
 *  • "live" mode omits date filters — commenceTimeFrom/commenceTimeTo cause
 *    a 422 on some endpoints when past dates are supplied.
 *  • "/upcoming/odds" is used when no specific sport is requested, per API docs.
 *  • Simple in-memory cache (60-second TTL) reduces quota consumption.
 *  • Upstream HTTP status codes (422, 429, etc.) are forwarded so the
 *    frontend can display specific, actionable error messages.
 */

const BASE_URL = 'https://api.the-odds-api.com/v4';

// ── In-memory cache ──────────────────────────────────────────────────────────
// Key → { data, expires }. Each entry lives for CACHE_TTL_MS milliseconds.
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

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

async function oddsHandler(req, res) {
  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    console.error('[odds] ODDS_API_KEY environment variable is not set');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Odds API key is not configured on the server' }));
    return;
  }

  // Parse query parameters from the request URL
  const urlObj  = new URL(req.url, 'http://localhost');
  const sport   = urlObj.searchParams.get('sport')   || 'upcoming';
  const mode    = urlObj.searchParams.get('mode')    || 'upcoming';
  const from    = urlObj.searchParams.get('from');
  const to      = urlObj.searchParams.get('to');
  const markets = urlObj.searchParams.get('markets') || 'h2h,spreads,totals';

  // Build upstream endpoint and params based on mode
  let endpoint;
  const params = { regions: 'us', markets, oddsFormat: 'american', apiKey };

  if (sport === 'upcoming') {
    // Use the /upcoming/odds convenience endpoint — no date filters accepted
    endpoint = `${BASE_URL}/sports/upcoming/odds`;
  } else if (mode === 'live') {
    // Live odds: omit date filters entirely.
    // Adding commenceTimeFrom/commenceTimeTo with past dates causes a 422.
    endpoint = `${BASE_URL}/sports/${encodeURIComponent(sport)}/odds`;
  } else {
    // today / date / upcoming (sport-specific): add date range when provided
    endpoint = `${BASE_URL}/sports/${encodeURIComponent(sport)}/odds`;
    if (from) params.commenceTimeFrom = from;
    if (to)   params.commenceTimeTo   = to;
  }

  // Serve from cache when available (cache key excludes the secret API key)
  const cacheKey = JSON.stringify({ endpoint, sport, mode, from, to, markets });
  const cached = getCached(cacheKey);
  if (cached) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cached));
    return;
  }

  try {
    const response = await axios.get(endpoint, { params });
    setCache(cacheKey, response.data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response.data));
  } catch (error) {
    // Forward the upstream status code so the frontend can react specifically
    // (e.g. 422 = bad params, 429 = rate-limited, 401/403 = key problem).
    const status  = (error.response && error.response.status) || 500;
    const message = (error.response && error.response.data && error.response.data.message)
      || error.message
      || 'Failed to fetch odds data';
    console.error(`[odds] Odds API request failed (HTTP ${status}):`, message);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message, status }));
  }
}

module.exports = oddsHandler;
