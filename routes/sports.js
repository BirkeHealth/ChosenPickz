const axios = require('axios');

/**
 * routes/sports.js — Secure backend proxy for The Odds API /v4/sports endpoint
 *
 * Returns the full list of sports supported by The Odds API. The result is
 * cached for CACHE_TTL_MS milliseconds to avoid burning quota on repeated
 * requests (the sport catalogue rarely changes within a session).
 *
 * The API key is injected server-side; the browser never sees it.
 */

const BASE_URL     = 'https://api.the-odds-api.com/v4';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedSports = null;
let cacheExpires = 0;

async function sportsHandler(req, res) {
  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey) {
    console.error('[sports] ODDS_API_KEY environment variable is not set');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Odds API key is not configured on the server' }));
    return;
  }

  // Serve from cache while still valid
  if (cachedSports && Date.now() < cacheExpires) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cachedSports));
    return;
  }

  try {
    const response = await axios.get(`${BASE_URL}/sports`, { params: { apiKey } });
    cachedSports = response.data;
    cacheExpires = Date.now() + CACHE_TTL_MS;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cachedSports));
  } catch (error) {
    const status  = (error.response && error.response.status) || 500;
    const message = (error.response && error.response.data && error.response.data.message)
      || error.message
      || 'Failed to fetch sports list';
    console.error(`[sports] Sports API request failed (HTTP ${status}):`, message);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message, status }));
  }
}

module.exports = sportsHandler;
