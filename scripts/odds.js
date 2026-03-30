/**
 * scripts/odds.js — Live Odds integration placeholder
 *
 * This script is loaded on pages that display odds data (index.html, best-odds.html).
 * It is intentionally a no-op until a data source is wired in.
 *
 * ── Future integration guide ──────────────────────────────────────────────────
 * 1. Odds API (The Odds API): https://the-odds-api.com/
 *    - GET /v4/sports/{sport}/odds?apiKey=...&regions=us&markets=h2h,spreads,totals
 *    - Use the existing server-side proxy at /api/odds to keep the API key hidden.
 *
 * 2. Replace the placeholder innerHTML calls below with real API responses.
 *
 * 3. Helper functions below (fmtOdds, fmtTime) are shared utilities ready to use.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* global APP_CONFIG */

(function OddsModule() {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const API_BASE = '/api/odds';   // server-side proxy — keeps API key off the client

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Format an American odds number as a signed string.
   * @param {number} price
   * @returns {string}
   */
  function fmtOdds(price) {
    if (typeof price !== 'number') return 'N/A';
    return price >= 0 ? '+' + price : String(price);
  }

  /**
   * Format an ISO timestamp to a human-readable local string.
   * @param {string} iso
   * @returns {string}
   */
  function fmtTime(iso) {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  /**
   * Escape a string for safe HTML insertion.
   * @param {string} str
   * @returns {string}
   */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Placeholder renderer ──────────────────────────────────────────────────

  /**
   * Show a placeholder message in all odds containers on the page
   * until real API data is connected.
   */
  function showPlaceholder() {
    const containers = [
      document.getElementById('odds-table'),
      document.getElementById('best-odds-table'),
      document.getElementById('bets-container'),
    ];
    containers.forEach(function (el) {
      if (!el) return;
      el.innerHTML =
        '<p class="loading-msg">Live odds will appear here once the Odds API is connected. ' +
        'See <code>scripts/odds.js</code> for integration instructions.</p>';
    });
  }

  // ── Main: fetch live odds (TODO: wire up to real endpoint) ─────────────────
  //
  // Uncomment and adapt this block when you are ready to integrate:
  //
  // async function loadOdds(sport) {
  //   const url = API_BASE + '?sport=' + encodeURIComponent(sport);
  //   const res = await fetch(url);
  //   if (!res.ok) throw new Error('Odds API error ' + res.status);
  //   const data = await res.json();
  //   // TODO: render data into the page
  //   console.log('[odds.js] Loaded odds:', data);
  // }

  // ── Init ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    showPlaceholder();
    // TODO: call loadOdds('americanfootball_nfl') or the selected sport
  });

  // ── Public API (for use by other scripts if needed) ───────────────────────
  window.OddsModule = { fmtOdds: fmtOdds, fmtTime: fmtTime, escHtml: escHtml };
}());
