/**
 * scripts/sportsNews.js — Sports Headlines Module
 *
 * Fetches top sports headlines from the server-side proxy at /api/news
 * (which reads NEWS_API_KEY from the server's .env file so the key is never
 * sent to the browser).
 *
 * If the proxy is not configured (503 response), falls back to a direct
 * NewsAPI call using window.APP_CONFIG.NEWS_API_KEY from config.js.
 * Direct calls are subject to CORS restrictions on the NewsAPI free plan;
 * prefer configuring the server-side proxy for production use.
 *
 * Renders headlines into:
 *   #news-list  — compact <li> widget used in the ▼ Sports News section of
 *                 index.html
 *   #news-feed  — full news-card layout used on news.html (Top Headlines)
 *
 * Usage:
 *   <script src="config.js"></script>          <!-- provides APP_CONFIG      -->
 *   <script src="scripts/sportsNews.js"></script> <!-- auto-inits on load    -->
 *
 * Public API:  window.SportsNewsModule.init()
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function SportsNewsModule() {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d)) return dateStr || '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getSourceName(article) {
    return article && article.source && article.source.name ? article.source.name : '';
  }

  // ── Renderers ─────────────────────────────────────────────────────────────

  /**
   * Render articles into #news-list as compact <li> items (index.html widget).
   */
  function renderNewsList(articles, listEl) {
    if (!articles || articles.length === 0) {
      listEl.innerHTML = '<li class="loading-msg">No headlines available right now.</li>';
      return;
    }
    listEl.innerHTML = articles.map(function (a) {
      return '<li class="news-item">' +
        '<a href="' + escHtml(a.url || '#') + '" target="_blank" rel="noopener noreferrer">' +
          escHtml(a.title || '') +
        '</a>' +
        '<div class="news-meta">' +
          escHtml(getSourceName(a)) +
          (a.publishedAt ? ' &mdash; ' + escHtml(fmtDate(a.publishedAt)) : '') +
        '</div>' +
      '</li>';
    }).join('');
  }

  /**
   * Render articles into #news-feed as news-card elements (news.html full page).
   */
  function renderNewsFeed(articles, feedEl) {
    if (!articles || articles.length === 0) {
      feedEl.innerHTML = '<p class="loading-msg">No headlines available right now.</p>';
      return;
    }
    feedEl.innerHTML = articles.map(function (a) {
      return '<div class="news-card">' +
        '<div class="news-card-sport">Sports</div>' +
        '<a class="news-card-headline" href="' + escHtml(a.url || '#') + '" ' +
            'target="_blank" rel="noopener noreferrer">' +
          escHtml(a.title || '') +
        '</a>' +
        (a.description
          ? '<p class="news-card-summary">' + escHtml(a.description) + '</p>'
          : '') +
        '<div class="news-card-meta">' +
          '<span class="source">' + escHtml(getSourceName(a)) + '</span>' +
          '<span>' + escHtml(fmtDate(a.publishedAt || '')) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function showMissingKeyMessage(el, isListMode) {
    var msg =
      'Add your NewsAPI key in <strong>config.js</strong> to load sports headlines. ' +
      'Get a free key at ' +
      '<a href="https://newsapi.org/" target="_blank" rel="noopener" ' +
         'style="color:var(--orange)">newsapi.org</a>.';
    el.innerHTML = isListMode
      ? '<li class="loading-msg">' + msg + '</li>'
      : '<p class="loading-msg">' + msg + '</p>';
  }

  function showError(el, isListMode) {
    var msg = 'Unable to load sports news. Please try again later.';
    el.innerHTML = isListMode
      ? '<li class="error-msg">' + msg + '</li>'
      : '<p class="error-msg">' + msg + '</p>';
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  /**
   * Fetch articles via the server-side proxy.  Falls back to a direct
   * NewsAPI call with the browser-side key if the proxy returns 503.
   * @param {number} pageSize
   * @returns {Promise<Array>} articles array
   */
  async function fetchArticles(pageSize) {
    // 1. Try the server-side proxy (API key stays on the server)
    var proxyRes = await fetch(
      '/api/news?category=sports&language=en&pageSize=' + pageSize
    );

    if (proxyRes.ok) {
      var data = await proxyRes.json();
      return data.articles || [];
    }

    // 2. Proxy not configured — fall back to the client-side key from config.js
    if (proxyRes.status === 503) {
      var cfg = (typeof window !== 'undefined' && window.APP_CONFIG) || {};
      var key = cfg.NEWS_API_KEY || '';
      if (!key || key === 'YOUR_NEWS_API_KEY') {
        throw new Error('NO_KEY');
      }
      var directUrl =
        'https://newsapi.org/v2/top-headlines' +
        '?category=sports&language=en&pageSize=' + pageSize +
        '&apiKey=' + encodeURIComponent(key);
      var directRes = await fetch(directUrl);
      if (!directRes.ok) throw new Error('NewsAPI ' + directRes.status);
      var directData = await directRes.json();
      return directData.articles || [];
    }

    throw new Error('News proxy returned HTTP ' + proxyRes.status);
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    var listEl = document.getElementById('news-list');   // index.html widget
    var feedEl = document.getElementById('news-feed');   // news.html full page
    if (!listEl && !feedEl) return;

    try {
      var pageSize = feedEl ? 10 : 5;
      var articles = await fetchArticles(pageSize);
      if (listEl) renderNewsList(articles, listEl);
      if (feedEl) renderNewsFeed(articles, feedEl);
    } catch (err) {
      if (err.message === 'NO_KEY') {
        if (listEl) showMissingKeyMessage(listEl, true);
        if (feedEl) showMissingKeyMessage(feedEl, false);
      } else {
        console.error('[sportsNews] Failed to load news:', err);
        if (listEl) showError(listEl, true);
        if (feedEl) showError(feedEl, false);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  // ── Public API ────────────────────────────────────────────────────────────
  window.SportsNewsModule = { init: init, escHtml: escHtml };
}());
