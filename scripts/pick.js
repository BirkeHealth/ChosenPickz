/**
 * scripts/pick.js — Pick of the Week integration placeholder
 *
 * Loaded on pick.html (and optionally index.html for the pick widget).
 * Handles the featured pick display, confidence meter, pick history table,
 * and season record stats.
 *
 * ── Future integration guide ──────────────────────────────────────────────────
 * 1. Static JSON file (simplest):
 *    - Create /data/picks.json with your weekly picks.
 *    - Fetch it with: fetch('/data/picks.json')
 *
 * 2. Google Sheets (no backend needed):
 *    - Publish your picks sheet as CSV or JSON.
 *    - Fetch via the public Google Sheets CSV export URL.
 *
 * 3. CMS / Headless API:
 *    - Contentful, Sanity, or Notion API for rich pick content.
 *
 * 4. Call renderFeaturedPick(pick) and renderPickHistory(picks) below with
 *    real data once you have a data source.
 *
 * ── Expected pick object shape ────────────────────────────────────────────────
 * {
 *   sport:      'NFL',
 *   matchup:    'Team A @ Team B',
 *   pick:       'Team B -3.5',
 *   odds:       '-110',
 *   bestBook:   'FanDuel',
 *   gameTime:   'Sun, Jan 5 · 4:25 PM ET',
 *   confidence: 78,           // 0-100
 *   rationale:  'Full text…',
 *   atsRecord:  '8-4',
 *   h2hRecord:  '4-1',
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function PickModule() {
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

  // ── Confidence meter ──────────────────────────────────────────────────────

  /**
   * Animate the confidence meter bar to the given percentage.
   * @param {number} pct  0-100
   */
  function setConfidence(pct) {
    var fill = document.querySelector('.confidence-bar-fill');
    var label = document.querySelector('.confidence-pct');
    if (!fill || !label) return;
    fill.style.width = '0%';
    setTimeout(function () {
      fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
      label.textContent = pct + '% Confidence';
    }, 150);
  }

  // ── Featured pick renderer ────────────────────────────────────────────────

  /**
   * Populate the featured pick card with a pick object.
   * @param {Object} pick
   */
  function renderFeaturedPick(pick) {
    var setEl = function (sel, html) {
      var el = document.querySelector(sel);
      if (el) el.innerHTML = html;
    };

    setEl('.featured-pick-sport',   escHtml(pick.sport || ''));
    setEl('.featured-pick-matchup', escHtml(pick.matchup || ''));
    setEl('.featured-pick-line',    '&#127942; ' + escHtml(pick.pick || '') + (pick.bestBook ? ' &middot; Best Line: ' + escHtml(pick.bestBook) : ''));
    setEl('.featured-pick-time',    '&#128336; ' + escHtml(pick.gameTime || ''));

    // Stats
    var statEls = document.querySelectorAll('.pick-stat-value');
    var statValues = [pick.odds, pick.pick, pick.atsRecord, pick.h2hRecord];
    statEls.forEach(function (el, i) {
      if (statValues[i] != null) el.textContent = statValues[i];
    });

    // Rationale
    if (pick.rationale) {
      var rationaleEl = document.getElementById('pick-rationale');
      if (rationaleEl) {
        rationaleEl.innerHTML =
          '<p><strong>Why we like this pick:</strong> ' + escHtml(pick.rationale) + '</p>' +
          '<p style="color:var(--muted); font-size:0.82rem; margin-top:1rem;">' +
          '&#9432; Picks are for entertainment only. Please gamble responsibly. ' +
          'See <a href="about.html" style="color:var(--gold);">About &amp; Legal</a>.</p>';
      }
    }

    if (pick.confidence != null) {
      setConfidence(pick.confidence);
    }
  }

  // ── Pick history renderer ─────────────────────────────────────────────────

  /**
   * Render an array of historical pick objects into the pick history table.
   * @param {Array<{ date, sport, matchup, pick, odds, result }>} picks
   */
  function renderPickHistory(picks) {
    var tbody = document.getElementById('picks-history-body');
    if (!tbody) return;
    if (!picks || picks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--muted);">No pick history yet.</td></tr>';
      return;
    }
    tbody.innerHTML = picks.map(function (p) {
      var resultClass = {
        win:     'result-win',
        loss:    'result-loss',
        push:    'result-push',
        pending: 'result-pending',
      }[String(p.result || '').toLowerCase()] || 'result-pending';
      var resultLabel = {
        win:     'WIN ✓',
        loss:    'LOSS ✗',
        push:    'PUSH →',
        pending: 'Pending',
      }[String(p.result || '').toLowerCase()] || p.result;
      return '<tr>' +
        '<td>' + escHtml(p.date || '') + '</td>' +
        '<td>' + escHtml(p.sport || '') + '</td>' +
        '<td>' + escHtml(p.matchup || '') + '</td>' +
        '<td>' + escHtml(p.pick || '') + '</td>' +
        '<td>' + escHtml(p.odds || '') + '</td>' +
        '<td><span class="' + resultClass + '">' + escHtml(resultLabel) + '</span></td>' +
      '</tr>';
    }).join('');
  }

  // ── Season record stats ───────────────────────────────────────────────────

  /**
   * Update the season record stat boxes.
   * @param {{ wins, losses, pushes, units }} record
   */
  function renderSeasonRecord(record) {
    var setEl = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setEl('rec-wins',   String(record.wins));
    setEl('rec-losses', String(record.losses));
    setEl('rec-pushes', String(record.pushes));
    setEl('rec-units',  (record.units >= 0 ? '+' : '') + record.units + 'u');
  }

  // ── Main: load picks (TODO: wire up to real data source) ──────────────────
  //
  // async function loadPicks() {
  //   const res = await fetch('/data/picks.json');
  //   if (!res.ok) throw new Error('Failed to load picks');
  //   const data = await res.json();
  //   if (data.featured) renderFeaturedPick(data.featured);
  //   if (data.history)  renderPickHistory(data.history);
  //   if (data.record)   renderSeasonRecord(data.record);
  // }

  // ── Init ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Animate the confidence bar with the placeholder value already in the HTML
    var fill = document.querySelector('.confidence-bar-fill');
    if (fill) {
      var targetWidth = fill.style.width;
      fill.style.width = '0%';
      setTimeout(function () { fill.style.width = targetWidth; }, 150);
    }

    // Populate landing page pick widget if present
    var pickContent = document.getElementById('pick-content');
    if (pickContent) {
      pickContent.innerHTML =
        '<p class="loading-msg">Pick of the Week will appear here. ' +
        'Connect <code>scripts/pick.js</code> to a data source or ' +
        '<a href="pick.html" style="color:var(--gold);">view the full pick page</a>.</p>';
    }

    // TODO: call loadPicks() once /data/picks.json exists
  });

  // ── Public API ────────────────────────────────────────────────────────────
  window.PickModule = {
    renderFeaturedPick: renderFeaturedPick,
    renderPickHistory: renderPickHistory,
    renderSeasonRecord: renderSeasonRecord,
    setConfidence: setConfidence,
    escHtml: escHtml,
  };
}());
