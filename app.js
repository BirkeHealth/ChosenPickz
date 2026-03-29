/**
 * app.js — ChosenPickz Landing Page
 *
 * Handles:
 *  - Login modal open / close
 *  - Fetching upcoming game odds from The Odds API (up to 5 games)
 *  - Fetching top sports headlines from NewsAPI.org
 */

// ── CONFIG ─────────────────────────────────────────────────────────────────

// NOTE: For production, proxy API calls through a server-side endpoint to avoid
// exposing API keys in client-side code.
const ODDS_API_KEY  = '378d22c76a76769fa0078d2d9e88fb60';
const NEWS_API_KEY  = 'YOUR_NEWS_API_KEY'; // Replace with your NewsAPI.org key

// Popular US sports to check (in priority order)
const SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'baseball_mlb',
  'icehockey_nhl',
  'americanfootball_ncaaf',
  'basketball_ncaab',
  'soccer_usa_mls',
];

// ── HELPERS ────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatGameTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sportLabel(sportKey) {
  const labels = {
    americanfootball_nfl:  'NFL',
    americanfootball_ncaaf: 'NCAAF',
    basketball_nba:        'NBA',
    basketball_ncaab:      'NCAAB',
    baseball_mlb:          'MLB',
    icehockey_nhl:         'NHL',
    soccer_usa_mls:        'MLS',
  };
  return labels[sportKey] || sportKey.toUpperCase();
}

/**
 * Extract American-format odds value from an outcomes array by team name.
 * Returns the price as a string like "+150" or "-110", or "N/A".
 */
function getOdds(outcomes, name) {
  if (!Array.isArray(outcomes)) return 'N/A';
  const o = outcomes.find(x => x.name === name);
  if (!o) return 'N/A';
  const price = o.price;
  if (typeof price !== 'number') return 'N/A';
  return price >= 0 ? `+${price}` : String(price);
}

/**
 * Extract spread point and price for a team.
 * Returns a string like "-3.5 (-110)" or "N/A".
 */
function getSpread(outcomes, name) {
  if (!Array.isArray(outcomes)) return 'N/A';
  const o = outcomes.find(x => x.name === name);
  if (!o) return 'N/A';
  const pt = o.point !== undefined ? o.point : '';
  const ptSign = typeof pt === 'number' ? (pt > 0 ? '+' : '') : '';
  const pr = typeof o.price === 'number'
    ? (o.price >= 0 ? `+${o.price}` : String(o.price))
    : '';
  if (pt === '' && !pr) return 'N/A';
  return `${ptSign}${pt} (${pr})`;
}

/**
 * Extract Over/Under total and price.
 * Returns e.g. "O 224.5 (-110) / U 224.5 (-110)" or "N/A".
 */
function getTotals(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length < 2) return 'N/A';
  const over  = outcomes.find(x => x.name === 'Over');
  const under = outcomes.find(x => x.name === 'Under');
  if (!over && !under) return 'N/A';
  const fmt = o => {
    if (!o) return '–';
    const pt = o.point !== undefined ? ` ${o.point}` : '';
    const pr = typeof o.price === 'number'
      ? ` (${o.price >= 0 ? '+' : ''}${o.price})`
      : '';
    return `${o.name}${pt}${pr}`;
  };
  return `${fmt(over)} / ${fmt(under)}`;
}

// ── RENDER BET CARD ────────────────────────────────────────────────────────

function renderBetCard(game) {
  const homeTeam = game.home_team || 'Home';
  const awayTeam = game.away_team || 'Away';
  const gameTime = formatGameTime(game.commence_time);
  const sport    = sportLabel(game.sport_key);

  // Find bookmaker (prefer DraftKings, then FanDuel, then first available)
  const bookmakers = game.bookmakers || [];
  const bk =
    bookmakers.find(b => b.key === 'draftkings') ||
    bookmakers.find(b => b.key === 'fanduel')    ||
    bookmakers[0];

  let mlHome = 'N/A', mlAway = 'N/A';
  let spreadHome = 'N/A', spreadAway = 'N/A';
  let total = 'N/A';

  if (bk && Array.isArray(bk.markets)) {
    const h2h    = bk.markets.find(m => m.key === 'h2h');
    const spreads = bk.markets.find(m => m.key === 'spreads');
    const totals  = bk.markets.find(m => m.key === 'totals');

    if (h2h) {
      mlHome = getOdds(h2h.outcomes, homeTeam);
      mlAway = getOdds(h2h.outcomes, awayTeam);
    }
    if (spreads) {
      spreadHome = getSpread(spreads.outcomes, homeTeam);
      spreadAway = getSpread(spreads.outcomes, awayTeam);
    }
    if (totals) {
      total = getTotals(totals.outcomes);
    }
  }

  return `
    <div class="bet-card">
      <div class="bet-sport">${escapeHtml(sport)}</div>
      <div class="bet-matchup">${escapeHtml(awayTeam)} @ ${escapeHtml(homeTeam)}</div>
      <div class="bet-time">&#128336; ${escapeHtml(gameTime)}</div>
      <div class="bet-odds-row">
        <div class="odds-pill">
          <span class="odds-label">ML (Away)</span>
          <span class="odds-value">${escapeHtml(mlAway)}</span>
        </div>
        <div class="odds-pill">
          <span class="odds-label">ML (Home)</span>
          <span class="odds-value">${escapeHtml(mlHome)}</span>
        </div>
      </div>
      <div class="bet-odds-row" style="margin-top:0.5rem;">
        <div class="odds-pill">
          <span class="odds-label">Spread (Away)</span>
          <span class="odds-value">${escapeHtml(spreadAway)}</span>
        </div>
        <div class="odds-pill">
          <span class="odds-label">Spread (Home)</span>
          <span class="odds-value">${escapeHtml(spreadHome)}</span>
        </div>
      </div>
      <div class="bet-odds-row" style="margin-top:0.5rem;">
        <div class="odds-pill" style="flex:unset;width:100%;">
          <span class="odds-label">O/U (Totals)</span>
          <span class="odds-value">${escapeHtml(total)}</span>
        </div>
      </div>
    </div>`;
}

// ── FETCH ODDS ─────────────────────────────────────────────────────────────

async function loadOdds() {
  const container = document.getElementById('bets-container');
  if (!container) return;

  try {
    // Fetch from multiple sports in parallel, stop once we have 5 games
    const results = [];

    for (const sport of SPORTS) {
      if (results.length >= 5) break;

      const url =
        `https://api.the-odds-api.com/v4/sports/${sport}/odds/` +
        `?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;

      const res = await fetch(url);
      if (!res.ok) continue;

      const games = await res.json();
      if (!Array.isArray(games)) continue;

      for (const game of games) {
        if (results.length >= 5) break;
        results.push(game);
      }
    }

    if (results.length === 0) {
      container.innerHTML = '<p class="loading-msg">No upcoming games found. Check back soon.</p>';
      return;
    }

    container.innerHTML = results.map(renderBetCard).join('');
  } catch (err) {
    container.innerHTML = '<p class="error-msg">Unable to load live odds. Please try again later.</p>';
    console.error('Odds API error:', err);
  }
}

// ── FETCH NEWS ─────────────────────────────────────────────────────────────

async function loadNews() {
  const list = document.getElementById('news-list');
  if (!list) return;

  if (NEWS_API_KEY === 'YOUR_NEWS_API_KEY') {
    list.innerHTML = '<li class="loading-msg">Add your NewsAPI.org key in app.js to load headlines.</li>';
    return;
  }

  try {
    const url =
      `https://newsapi.org/v2/top-headlines` +
      `?category=sports&language=en&pageSize=5&apiKey=${NEWS_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`NewsAPI error ${res.status}`);

    const data = await res.json();
    const articles = (data.articles || []).slice(0, 5);

    if (!articles.length) {
      list.innerHTML = '<li class="loading-msg">No headlines available right now.</li>';
      return;
    }

    list.innerHTML = articles.map(a => `
      <li class="news-item">
        <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(a.title)}
        </a>
        <div class="news-meta">
          ${escapeHtml(a.source && a.source.name ? a.source.name : '')}
          ${a.publishedAt ? ' &mdash; ' + escapeHtml(new Date(a.publishedAt).toLocaleDateString()) : ''}
        </div>
      </li>`).join('');
  } catch (err) {
    list.innerHTML = '<li class="error-msg">Unable to load sports news. Please try again later.</li>';
    console.error('NewsAPI error:', err);
  }
}

// ── MODAL ──────────────────────────────────────────────────────────────────

function initModal() {
  const overlay  = document.getElementById('login-modal');
  const openBtn  = document.getElementById('login-btn');
  const closeBtn = document.getElementById('modal-close');

  if (!overlay || !openBtn) return;

  function openModal() {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    const firstInput = overlay.querySelector('input');
    if (firstInput) firstInput.focus();
  }

  function closeModal() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    openBtn.focus();
  }

  openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close when clicking outside the modal box
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });
}

// ── INIT ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  initModal();
  loadOdds();
  loadNews();
});
