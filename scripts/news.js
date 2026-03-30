/**
 * scripts/news.js — Sports news & injury report integration placeholder
 *
 * Loaded on news.html (and optionally index.html for the news feed widget).
 *
 * ── Future integration guide ──────────────────────────────────────────────────
 * 1. NewsAPI: https://newsapi.org/
 *    - GET https://newsapi.org/v2/everything?q=sports&apiKey=...
 *    - IMPORTANT: Route through a server-side proxy to avoid exposing keys.
 *
 * 2. SportsDataIO: https://sportsdata.io/
 *    - Provides injury reports, news feeds, and player stats per sport.
 *
 * 3. ESPN API (unofficial): https://gist.github.com/nntrn/ee26cb2a0716de0947a0a4e9a157bc1c
 *    - Free, no key required, good for headlines and scores.
 *
 * 4. Replace placeholder content in #news-feed and #injury-table-body with
 *    real API responses using the helper functions below.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function NewsModule() {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────────────────

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

  /**
   * Format a date string or ISO timestamp to a relative or absolute label.
   * @param {string} dateStr
   * @returns {string}
   */
  function fmtDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Placeholder renderer ──────────────────────────────────────────────────

  /**
   * Insert a placeholder message in all news containers until API is wired.
   */
  function showNewsPlaceholder() {
    const containers = [
      document.getElementById('news-list'),       // landing page widget
      document.getElementById('sports-news-list'), // alternate ID
    ];
    containers.forEach(function (el) {
      if (!el) return;
      el.innerHTML =
        '<li class="loading-msg">Latest sports news will appear here once a news API is connected. ' +
        'See <code>scripts/news.js</code> for integration options.</li>';
    });
  }

  // ── Render helpers (ready for real data) ─────────────────────────────────

  /**
   * Render a single news article object into a .news-card element string.
   * @param {{ sport: string, headline: string, summary: string, source: string, url: string, publishedAt: string }} article
   * @returns {string}
   */
  function renderNewsCard(article) {
    return '<div class="news-card">' +
      '<div class="news-card-sport">' + escHtml(article.sport || 'Sports') + '</div>' +
      '<a class="news-card-headline" href="' + escHtml(article.url || '#') + '" target="_blank" rel="noopener noreferrer">' +
        escHtml(article.headline) +
      '</a>' +
      (article.summary
        ? '<p class="news-card-summary">' + escHtml(article.summary) + '</p>'
        : '') +
      '<div class="news-card-meta">' +
        '<span class="source">' + escHtml(article.source || '') + '</span>' +
        '<span>' + escHtml(fmtDate(article.publishedAt || '')) + '</span>' +
      '</div>' +
    '</div>';
  }

  /**
   * Render an array of article objects into the #news-feed container.
   * @param {Array} articles
   */
  function renderNewsFeed(articles) {
    const feed = document.getElementById('news-feed');
    if (!feed) return;
    if (!articles || articles.length === 0) {
      feed.innerHTML = '<p class="loading-msg">No news articles found.</p>';
      return;
    }
    feed.innerHTML = articles.map(renderNewsCard).join('');
  }

  // ── Main: fetch news (TODO: wire up to real endpoint) ─────────────────────
  //
  // Example using ESPN unofficial feed (no key required):
  //
  // async function loadESPNHeadlines(sport) {
  //   const url = 'https://site.api.espn.com/apis/site/v2/sports/' + sport + '/news';
  //   const res = await fetch(url);
  //   if (!res.ok) throw new Error('ESPN API error ' + res.status);
  //   const data = await res.json();
  //   const articles = (data.articles || []).map(function (a) {
  //     return {
  //       sport: sport.toUpperCase(),
  //       headline: a.headline,
  //       summary: a.description,
  //       source: 'ESPN',
  //       url: a.links && a.links.web && a.links.web.href,
  //       publishedAt: a.published,
  //     };
  //   });
  //   renderNewsFeed(articles);
  // }

  // ── Sport filter tab interaction ─────────────────────────────────────────

  function initSportFilters() {
    const btns = document.querySelectorAll('.news-filter-btn');
    if (!btns.length) return;
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var sport = btn.dataset.sport;
        // TODO: re-fetch or re-filter news cards by sport
        console.log('[news.js] Filter selected:', sport);
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    showNewsPlaceholder();
    initSportFilters();
    // TODO: call loadESPNHeadlines('football/nfl') or your preferred API
  });

  // ── Public API ────────────────────────────────────────────────────────────
  window.NewsModule = { renderNewsCard: renderNewsCard, renderNewsFeed: renderNewsFeed, escHtml: escHtml };
}());
