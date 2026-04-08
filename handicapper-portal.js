/**
 * handicapper-portal.js — CH0SEN1 PICKZ Handicapper Board Management Portal
 *
 * Provides:
 *  - Auth guard: redirects non-handicapper/non-admin users back to the landing page.
 *    Admin is always treated as handicapper for all features.
 *  - Left panel: live odds board fetched from /api/odds, filterable by sport,
 *    sportsbook, and team/matchup text. Clicking any odds pill adds it to the
 *    pick slip.
 *  - Right panel: pick slip with per-pick notes, confidence, visibility, and
 *    a "Post Pick" button. Also supports manual entry for picks not sourced
 *    from the live odds board.
 *  - Pick history: view, update result, and delete past picks.
 *  - Stats bar showing total, wins, losses, and win %.
 */

// ── STORAGE HELPERS ────────────────────────────────────────────────────────

const SESSION_KEY  = 'cp_session';
const HCP_PICKS_KEY = 'cp_handicapper_picks';

// ── ADMIN ROLE OVERRIDE ────────────────────────────────────────────────────
// Mirrors the key used in app.js. When set, the admin simulates a given role.
const ADMIN_ROLE_OVERRIDE_KEY = 'adminRoleOverride';

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  // Also clear any admin role override so the next session starts without a stale override.
  localStorage.removeItem(ADMIN_ROLE_OVERRIDE_KEY);
}

/**
 * Returns the role the session should be treated as for access/display decisions.
 * For admin users, checks localStorage[ADMIN_ROLE_OVERRIDE_KEY] first.
 */
function getEffectiveRole(session) {
  if (!session) return null;
  if (session.isAdmin) {
    const override = localStorage.getItem(ADMIN_ROLE_OVERRIDE_KEY);
    if (override === 'handicapper' || override === 'sports_bettor') return override;
    return null;
  }
  return session.role || null;
}

function getHandicapperPicks() {
  try { return JSON.parse(localStorage.getItem(HCP_PICKS_KEY) || '[]'); }
  catch { return []; }
}

function saveHandicapperPicks(picks) {
  localStorage.setItem(HCP_PICKS_KEY, JSON.stringify(picks));
}

// ── HTML ESCAPE ────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── ODDS HELPERS ───────────────────────────────────────────────────────────

function formatOdds(price) {
  if (typeof price !== 'number') return 'N/A';
  return price >= 0 ? `+${price}` : String(price);
}

function formatGameTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function sportDisplayName(sportKey) {
  const map = {
    baseball_mlb:           'MLB',
    americanfootball_ncaaf: 'NCAAF',
    basketball_ncaab:       'NCAAB',
    basketball_ncaaw:       'NCAAW',
    americanfootball_nfl:   'NFL',
    icehockey_nhl:          'NHL',
    basketball_nba:         'NBA',
  };
  return map[sportKey] || sportKey.toUpperCase();
}

// ── STATE ──────────────────────────────────────────────────────────────────

const SPORTS_TO_FETCH = [
  'baseball_mlb',
  'americanfootball_nfl',
  'americanfootball_ncaaf',
  'basketball_nba',
  'basketball_ncaab',
  'basketball_ncaaw',
  'icehockey_nhl',
];

let allGames       = [];   // all fetched games (unfiltered)
let selectedSport  = 'all';
let selectedBook   = 'all';
let searchQuery    = '';

// Pick slip: array of { id, matchup, sport, pickType, pickDetails, note, confidence, lock, gameTime }
let slipItems = [];
let slipIdCounter = 0;

function nextSlipId() {
  return ++slipIdCounter;
}

// ── AUTH GUARD ─────────────────────────────────────────────────────────────
// Admin is always treated as handicapper for all portal features.
// When an admin has set the override to 'sports_bettor', they can still
// access the portal (they are still admin) but their greeting reflects the override.

function isHandicapperOrAdmin(session) {
  if (!session) return false;
  if (session.isAdmin) return true;
  return session.role === 'handicapper';
}

function initAuth() {
  const session = getSession();
  if (!isHandicapperOrAdmin(session)) {
    // Not a handicapper or admin — redirect to home
    window.location.replace('index.html');
    return null;
  }

  const navUser = document.getElementById('nav-user');
  if (navUser) navUser.style.display = 'flex';
  updatePortalGreeting(session);

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // Clear role override on logout so next session starts fresh.
      localStorage.removeItem(ADMIN_ROLE_OVERRIDE_KEY);
      clearSession();
      window.location.replace('index.html');
    });
  }

  // Render the admin role-switcher in the portal nav (admin-only).
  renderPortalRoleSwitcher(session);

  return session;
}

/**
 * Updates the nav greeting text to reflect the current override (for admin)
 * or the user's role (for regular handicappers).
 */
function updatePortalGreeting(session) {
  const navGreeting = document.getElementById('nav-greeting');
  if (!navGreeting) return;
  if (session.isAdmin) {
    const override = localStorage.getItem(ADMIN_ROLE_OVERRIDE_KEY);
    navGreeting.textContent = override === 'handicapper'
      ? '⚙️ Admin [as 🏆 Handicapper]'
      : override === 'sports_bettor'
        ? '⚙️ Admin [as 🎯 Sports Bettor]'
        : '⚙️ Admin';
  } else {
    const firstName = (session.name && typeof session.name === 'string')
      ? session.name.split(' ')[0]
      : 'Handicapper';
    navGreeting.textContent = `Hi, ${firstName} · 🏆 Handicapper`;
  }
}

/**
 * Injects the admin role-switcher buttons into #admin-role-switcher inside the
 * handicapper portal nav.  Only visible when session.isAdmin === true.
 * Switching roles updates the greeting and persists the choice in localStorage.
 * Uses event delegation on the container to avoid duplicate listeners on re-renders.
 */
function renderPortalRoleSwitcher(session) {
  const switcher = document.getElementById('admin-role-switcher');
  if (!switcher || !session || !session.isAdmin) {
    if (switcher) switcher.style.display = 'none';
    return;
  }

  const current = localStorage.getItem(ADMIN_ROLE_OVERRIDE_KEY) || '';
  switcher.style.display = 'inline-flex';
  switcher.innerHTML =
    '<span style="font-size:0.72rem;color:var(--muted);margin-right:0.3rem;white-space:nowrap;align-self:center;">View as:</span>' +
    '<button id="role-sw-hcp"  class="role-sw-btn' + (current === 'handicapper'   ? ' role-sw-active' : '') + '" title="Simulate Handicapper view">🏆 Handicapper</button>' +
    '<button id="role-sw-sb"   class="role-sw-btn' + (current === 'sports_bettor' ? ' role-sw-active' : '') + '" title="Simulate Sports Bettor view">🎯 Bettor</button>' +
    '<button id="role-sw-none" class="role-sw-btn' + (!current                    ? ' role-sw-active' : '') + '" title="Reset to admin-only view">⚙️ Admin</button>';

  // Use event delegation so re-renders don't accumulate listeners.
  switcher.onclick = function (e) {
    const btn = e.target.closest('.role-sw-btn');
    if (!btn) return;
    if (btn.id === 'role-sw-hcp')       localStorage.setItem(ADMIN_ROLE_OVERRIDE_KEY, 'handicapper');
    else if (btn.id === 'role-sw-sb')   localStorage.setItem(ADMIN_ROLE_OVERRIDE_KEY, 'sports_bettor');
    else if (btn.id === 'role-sw-none') localStorage.removeItem(ADMIN_ROLE_OVERRIDE_KEY);
    renderPortalRoleSwitcher(session);
    updatePortalGreeting(session);
  };
}

// ── STATS BAR ──────────────────────────────────────────────────────────────

function renderStats(session) {
  const statsEl = document.getElementById('portal-stats');
  if (!statsEl || !session) return;

  const allPicks = getHandicapperPicks();
  const myPicks  = allPicks.filter(p => p.handicapperId === session.id);
  const wins     = myPicks.filter(p => p.result === 'win').length;
  const losses   = myPicks.filter(p => p.result === 'loss').length;
  const total    = myPicks.length;
  const winPct   = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  statsEl.innerHTML = `
    <div class="portal-stat-card">
      <div class="portal-stat-value">${total}</div>
      <div class="portal-stat-label">Total Picks</div>
    </div>
    <div class="portal-stat-card">
      <div class="portal-stat-value" style="color:var(--success);">${wins}</div>
      <div class="portal-stat-label">Wins</div>
    </div>
    <div class="portal-stat-card">
      <div class="portal-stat-value" style="color:#f87171;">${losses}</div>
      <div class="portal-stat-label">Losses</div>
    </div>
    <div class="portal-stat-card">
      <div class="portal-stat-value">${winPct}%</div>
      <div class="portal-stat-label">Win %</div>
    </div>`;
}

// ── ODDS BOARD ─────────────────────────────────────────────────────────────

async function fetchAllOdds() {
  const board = document.getElementById('portal-odds-board');
  if (!board) return;
  board.innerHTML = '<p class="loading-msg">Loading live odds…</p>';

  const results = [];
  try {
    for (const sport of SPORTS_TO_FETCH) {
      const params = new URLSearchParams({ sport, mode: 'upcoming' });
      const res = await fetch('/api/odds?' + params.toString());
      if (!res.ok) continue;
      const games = await res.json();
      if (!Array.isArray(games)) continue;
      games.forEach(g => { g._sport = sport; results.push(g); });
    }
  } catch (err) {
    board.innerHTML = '<p class="error-msg">Unable to load odds. Please try again later.</p>';
    console.error('Portal odds error:', err);
    return;
  }

  if (results.length === 0) {
    board.innerHTML = '<p class="loading-msg">No upcoming games found. Check back soon.</p>';
    return;
  }

  allGames = results;
  renderOddsBoard();
}

function getFilteredGames() {
  return allGames.filter(game => {
    // Sport filter
    if (selectedSport !== 'all' && game._sport !== selectedSport) return false;
    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchup = `${game.away_team || ''} ${game.home_team || ''}`.toLowerCase();
      if (!matchup.includes(q)) return false;
    }
    return true;
  });
}

function getBestBookmaker(game) {
  const bookmakers = game.bookmakers || [];
  if (selectedBook === 'all') {
    return (
      bookmakers.find(b => b.key === 'draftkings') ||
      bookmakers.find(b => b.key === 'fanduel')    ||
      bookmakers[0]
    );
  }
  return bookmakers.find(b => b.key === selectedBook);
}

function renderOddsBoard() {
  const board = document.getElementById('portal-odds-board');
  if (!board) return;

  const games = getFilteredGames();
  if (games.length === 0) {
    board.innerHTML = '<p class="loading-msg">No games match your filters.</p>';
    return;
  }

  board.innerHTML = games.map(game => buildGameCard(game)).join('');
}

function buildGameCard(game) {
  const away    = game.away_team || 'Away';
  const home    = game.home_team || 'Home';
  const sport   = sportDisplayName(game._sport || game.sport_key);
  const gameTime = formatGameTime(game.commence_time);
  const bk      = getBestBookmaker(game);
  const bookName = bk ? (bk.title || bk.key) : '';

  if (!bk) {
    return `
      <div class="portal-game-card">
        <div class="portal-game-header">
          <span class="portal-game-sport">${escapeHtml(sport)}</span>
          <span class="portal-game-time">🕐 ${escapeHtml(gameTime)}</span>
        </div>
        <div class="portal-game-matchup">${escapeHtml(away)} <span class="vs-text">@</span> ${escapeHtml(home)}</div>
        <p class="loading-msg" style="font-size:0.8rem;margin-top:0.5rem;">No odds available for selected sportsbook.</p>
      </div>`;
  }

  const h2h     = (bk.markets || []).find(m => m.key === 'h2h');
  const spreads = (bk.markets || []).find(m => m.key === 'spreads');
  const totals  = (bk.markets || []).find(m => m.key === 'totals');

  function mlPill(team, outcomes) {
    if (!outcomes) return '';
    const o = outcomes.find(x => x.name === team);
    if (!o || typeof o.price !== 'number') return '';
    const odds = formatOdds(o.price);
    return `<div class="portal-odds-pill" data-matchup="${escapeHtml(away + ' @ ' + home)}" data-sport="${escapeHtml(sport)}" data-type="MoneyLine" data-pick="${escapeHtml(team + ' ML ' + odds)}" data-odds="${escapeHtml(odds)}" role="button" tabindex="0" title="Add ${escapeHtml(team)} ML to slip">
      <span class="portal-odds-label">${escapeHtml(team)}</span>
      <span class="portal-odds-value">${escapeHtml(odds)}</span>
      <span class="portal-odds-type-tag">ML</span>
    </div>`;
  }

  function spreadPill(team, outcomes) {
    if (!outcomes) return '';
    const o = outcomes.find(x => x.name === team);
    if (!o || typeof o.price !== 'number') return '';
    const pt    = o.point !== undefined ? o.point : '';
    const ptStr = typeof pt === 'number' ? (pt > 0 ? `+${pt}` : String(pt)) : '';
    const pr    = formatOdds(o.price);
    const display = ptStr ? `${ptStr} (${pr})` : pr;
    const pickStr = `${team} ${display}`;
    return `<div class="portal-odds-pill" data-matchup="${escapeHtml(away + ' @ ' + home)}" data-sport="${escapeHtml(sport)}" data-type="Spread" data-pick="${escapeHtml(pickStr)}" data-odds="${escapeHtml(pr)}" role="button" tabindex="0" title="Add ${escapeHtml(team)} Spread to slip">
      <span class="portal-odds-label">${escapeHtml(team)}</span>
      <span class="portal-odds-value">${escapeHtml(display)}</span>
      <span class="portal-odds-type-tag">SPR</span>
    </div>`;
  }

  function totalPill(side, outcomes) {
    if (!outcomes) return '';
    const o = outcomes.find(x => x.name === side);
    if (!o || typeof o.price !== 'number') return '';
    const pt = o.point !== undefined ? ` ${o.point}` : '';
    const pr = formatOdds(o.price);
    const display = `${side}${pt} (${pr})`;
    const pickStr = `${side}${pt} ${pr}`;
    return `<div class="portal-odds-pill" data-matchup="${escapeHtml(away + ' @ ' + home)}" data-sport="${escapeHtml(sport)}" data-type="Over/Under" data-pick="${escapeHtml(pickStr)}" data-odds="${escapeHtml(pr)}" role="button" tabindex="0" title="Add ${escapeHtml(side)}${pt} to slip">
      <span class="portal-odds-label">${escapeHtml(side)}${escapeHtml(pt)}</span>
      <span class="portal-odds-value">${escapeHtml(pr)}</span>
      <span class="portal-odds-type-tag">O/U</span>
    </div>`;
  }

  const mlSection = (h2h && h2h.outcomes) ? `
    <div class="portal-odds-row-label">MoneyLine</div>
    <div class="portal-odds-row">
      ${mlPill(away, h2h.outcomes)}
      ${mlPill(home, h2h.outcomes)}
    </div>` : '';

  const spreadSection = (spreads && spreads.outcomes) ? `
    <div class="portal-odds-row-label">Spread</div>
    <div class="portal-odds-row">
      ${spreadPill(away, spreads.outcomes)}
      ${spreadPill(home, spreads.outcomes)}
    </div>` : '';

  const totalSection = (totals && totals.outcomes) ? `
    <div class="portal-odds-row-label">Over / Under</div>
    <div class="portal-odds-row">
      ${totalPill('Over', totals.outcomes)}
      ${totalPill('Under', totals.outcomes)}
    </div>` : '';

  return `
    <div class="portal-game-card">
      <div class="portal-game-header">
        <span class="portal-game-sport">${escapeHtml(sport)}</span>
        <span class="portal-game-time">🕐 ${escapeHtml(gameTime)}</span>
        ${bookName ? `<span class="portal-game-book">📊 ${escapeHtml(bookName)}</span>` : ''}
      </div>
      <div class="portal-game-matchup">${escapeHtml(away)} <span class="vs-text">@</span> ${escapeHtml(home)}</div>
      <div class="portal-game-odds">
        ${mlSection}
        ${spreadSection}
        ${totalSection}
      </div>
    </div>`;
}

// ── PICK SLIP ──────────────────────────────────────────────────────────────

function addToSlip(matchup, sport, pickType, pickDetails, odds) {
  // Prevent duplicate (same matchup + type + pick)
  const exists = slipItems.some(s => s.matchup === matchup && s.pickType === pickType && s.pickDetails === pickDetails);
  if (exists) {
    flashFeedback('Pick already in your slip.', 'info');
    return;
  }
  slipItems.push({
    id:          nextSlipId(),
    matchup,
    sport,
    pickType,
    pickDetails,
    odds,
    note:        '',
    confidence:  3,
    lock:        'free',
  });
  renderSlip();
  // scroll right panel slip into view
  const slipList = document.getElementById('portal-slip-list');
  if (slipList) slipList.scrollTop = slipList.scrollHeight;
}

function renderSlip() {
  const container = document.getElementById('portal-slip-list');
  if (!container) return;

  if (slipItems.length === 0) {
    container.innerHTML = `
      <div class="slip-empty">
        <p>No picks selected yet.</p>
        <p class="slip-empty-hint">Click any odds pill from the board on the left to add a pick, or use Manual Entry below.</p>
      </div>`;
    return;
  }

  container.innerHTML = slipItems.map((item, idx) => `
    <div class="slip-item" data-idx="${idx}">
      <div class="slip-item-header">
        <div>
          <span class="slip-sport-badge">${escapeHtml(item.sport)}</span>
          <span class="slip-type-badge">${escapeHtml(item.pickType)}</span>
        </div>
        <button class="slip-remove-btn" data-idx="${idx}" title="Remove from slip">✕</button>
      </div>
      <div class="slip-matchup">${escapeHtml(item.matchup)}</div>
      <div class="slip-pick">🏆 ${escapeHtml(item.pickDetails)}</div>
      <div class="slip-controls">
        <div class="slip-field">
          <label class="slip-label">Confidence</label>
          <select class="slip-confidence" data-idx="${idx}">
            <option value="1" ${item.confidence == 1 ? 'selected' : ''}>⭐ Very Low</option>
            <option value="2" ${item.confidence == 2 ? 'selected' : ''}>⭐⭐ Low</option>
            <option value="3" ${item.confidence == 3 ? 'selected' : ''}>⭐⭐⭐ Medium</option>
            <option value="4" ${item.confidence == 4 ? 'selected' : ''}>⭐⭐⭐⭐ High</option>
            <option value="5" ${item.confidence == 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ Very High</option>
          </select>
        </div>
        <div class="slip-field">
          <label class="slip-label">Visibility</label>
          <select class="slip-visibility" data-idx="${idx}">
            <option value="free"   ${item.lock === 'free'   ? 'selected' : ''}>🆓 Free</option>
            <option value="locked" ${item.lock === 'locked' ? 'selected' : ''}>🔒 Subscribers</option>
          </select>
        </div>
      </div>
      <div class="slip-note-row">
        <input type="text" class="slip-note-input" data-idx="${idx}" placeholder="Add analysis or note (optional)…" value="${escapeHtml(item.note || '')}" />
      </div>
      <button class="btn-primary slip-post-btn" data-idx="${idx}">📤 Post This Pick</button>
    </div>`).join('');

  // Wire remove buttons
  container.querySelectorAll('.slip-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      slipItems.splice(Number(btn.dataset.idx), 1);
      renderSlip();
    });
  });

  // Wire confidence selects
  container.querySelectorAll('.slip-confidence').forEach(sel => {
    sel.addEventListener('change', () => {
      slipItems[Number(sel.dataset.idx)].confidence = Number(sel.value);
    });
  });

  // Wire visibility selects
  container.querySelectorAll('.slip-visibility').forEach(sel => {
    sel.addEventListener('change', () => {
      slipItems[Number(sel.dataset.idx)].lock = sel.value;
    });
  });

  // Wire note inputs
  container.querySelectorAll('.slip-note-input').forEach(input => {
    input.addEventListener('input', () => {
      slipItems[Number(input.dataset.idx)].note = input.value;
    });
  });

  // Wire post buttons
  container.querySelectorAll('.slip-post-btn').forEach(btn => {
    btn.addEventListener('click', () => postPick(Number(btn.dataset.idx)));
  });
}

// ── POST PICK ──────────────────────────────────────────────────────────────

function postPick(idx) {
  const session = getSession();
  // Admin is always treated as handicapper for all features.
  if (!isHandicapperOrAdmin(session)) {
    window.location.replace('index.html');
    return;
  }

  const item = slipItems[idx];
  if (!item) return;

  const picks = getHandicapperPicks();
  picks.unshift({
    id:              Date.now(),
    handicapperId:   session.id,
    handicapperName: session.name,
    sport:           item.sport,
    matchup:         item.matchup,
    pickType:        item.pickType,
    pickDetails:     item.pickDetails,
    note:            item.note || '',
    confidence:      item.confidence || 3,
    lock:            item.lock || 'free',
    date:            new Date().toISOString().slice(0, 10),
    result:          'pending',
    postedAt:        new Date().toISOString(),
  });
  saveHandicapperPicks(picks);

  // Remove from slip
  slipItems.splice(idx, 1);
  renderSlip();
  renderStats(session);
  renderHistory(session);
  flashFeedback(`✅ Pick posted: ${item.matchup}`, 'success');
}

// ── MANUAL ENTRY ───────────────────────────────────────────────────────────

function initManualEntry() {
  const manualBtn    = document.getElementById('portal-manual-btn');
  const manualForm   = document.getElementById('portal-manual-form');
  const addBtn       = document.getElementById('portal-manual-add-btn');
  const cancelBtn    = document.getElementById('portal-manual-cancel-btn');

  if (!manualBtn || !manualForm) return;

  manualBtn.addEventListener('click', () => {
    manualForm.style.display = manualForm.style.display === 'none' ? 'block' : 'none';
    if (manualForm.style.display === 'block') {
      document.getElementById('man-matchup').focus();
    }
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      manualForm.style.display = 'none';
      clearManualForm();
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const matchup    = (document.getElementById('man-matchup')?.value || '').trim();
      const sport      = document.getElementById('man-sport')?.value || 'Other';
      const pickType   = document.getElementById('man-type')?.value || 'MoneyLine';
      const pickDetails= (document.getElementById('man-pick')?.value || '').trim();
      const confidence = Number(document.getElementById('man-confidence')?.value || 3);
      const lock       = document.getElementById('man-visibility')?.value || 'free';
      const note       = (document.getElementById('man-note')?.value || '').trim();

      if (!matchup || !pickDetails) {
        flashFeedback('Please fill in Matchup and Pick Details.', 'error');
        return;
      }

      slipItems.push({
        id:         nextSlipId(),
        matchup,
        sport,
        pickType,
        pickDetails,
        odds:       '',
        note,
        confidence,
        lock,
      });
      renderSlip();
      manualForm.style.display = 'none';
      clearManualForm();
    });
  }
}

function clearManualForm() {
  ['man-matchup', 'man-pick', 'man-note'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const conf = document.getElementById('man-confidence');
  if (conf) conf.value = '3';
  const vis = document.getElementById('man-visibility');
  if (vis) vis.value = 'free';
}

// ── PICK HISTORY ───────────────────────────────────────────────────────────

function renderHistory(session) {
  const listEl   = document.getElementById('portal-history-list');
  const countEl  = document.getElementById('portal-history-count');
  if (!listEl || !session) return;

  const allPicks = getHandicapperPicks();
  const myPicks  = allPicks.filter(p => p.handicapperId === session.id);

  if (countEl) countEl.textContent = `(${myPicks.length})`;

  if (myPicks.length === 0) {
    listEl.innerHTML = '<p class="loading-msg">No picks posted yet.</p>';
    return;
  }

  listEl.innerHTML = myPicks.map(pick => {
    const postedDate = pick.postedAt
      ? new Date(pick.postedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    const confidence = pick.confidence ? '⭐'.repeat(pick.confidence) : '';
    return `
      <div class="history-pick-item">
        <div class="history-pick-info">
          <div class="history-pick-matchup">${escapeHtml(pick.matchup)}</div>
          <div class="history-pick-meta">${escapeHtml(pick.sport)} · ${escapeHtml(pick.pickType)} · ${postedDate} ${confidence ? '· ' + confidence : ''}</div>
          <div class="history-pick-value">🏆 ${escapeHtml(pick.pickDetails)}</div>
          ${pick.note ? `<div class="history-pick-note">${escapeHtml(pick.note)}</div>` : ''}
          <span class="result-badge ${pick.result}">${pick.result}</span>
        </div>
        <div class="history-pick-actions">
          <select class="result-select" data-pick-id="${pick.id}">
            <option value="pending" ${pick.result === 'pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="win"     ${pick.result === 'win'     ? 'selected' : ''}>✅ Win</option>
            <option value="loss"    ${pick.result === 'loss'    ? 'selected' : ''}>❌ Loss</option>
          </select>
          <button class="btn-delete-pick" data-pick-id="${pick.id}">🗑 Delete</button>
        </div>
      </div>`;
  }).join('');

  // Wire result selectors
  listEl.querySelectorAll('.result-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const id    = Number(sel.dataset.pickId);
      const picks = getHandicapperPicks();
      const idx   = picks.findIndex(p => p.id === id);
      if (idx !== -1) {
        picks[idx].result = sel.value;
        saveHandicapperPicks(picks);
        renderHistory(session);
        renderStats(session);
      }
    });
  });

  // Wire delete buttons
  listEl.querySelectorAll('.btn-delete-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const id    = Number(btn.dataset.pickId);
      const picks = getHandicapperPicks().filter(p => p.id !== id);
      saveHandicapperPicks(picks);
      renderHistory(session);
      renderStats(session);
    });
  });
}

// ── FEEDBACK FLASH ─────────────────────────────────────────────────────────

let feedbackTimer = null;
function flashFeedback(msg, type) {
  const el = document.getElementById('portal-post-feedback');
  if (!el) return;
  el.textContent = msg;
  el.className   = `portal-post-feedback portal-post-feedback--${type} show`;
  el.style.display = 'block';
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    el.style.display = 'none';
    el.className = 'portal-post-feedback';
  }, 3500);
}

// ── SPORT FILTER TABS ──────────────────────────────────────────────────────

function initSportTabs() {
  const tabsEl = document.getElementById('portal-sport-tabs');
  if (!tabsEl) return;
  tabsEl.addEventListener('click', e => {
    const btn = e.target.closest('.portal-sport-tab');
    if (!btn) return;
    tabsEl.querySelectorAll('.portal-sport-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    selectedSport = btn.dataset.sport;
    renderOddsBoard();
  });
}

// ── SPORTSBOOK FILTER ──────────────────────────────────────────────────────

function initBookTabs() {
  const tabsEl = document.getElementById('portal-book-tabs');
  if (!tabsEl) return;
  tabsEl.addEventListener('click', e => {
    const btn = e.target.closest('.portal-book-btn');
    if (!btn) return;
    tabsEl.querySelectorAll('.portal-book-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedBook = btn.dataset.book;
    renderOddsBoard();
  });
}

// ── SEARCH ─────────────────────────────────────────────────────────────────

function initSearch() {
  const searchEl = document.getElementById('portal-search');
  if (!searchEl) return;
  searchEl.addEventListener('input', () => {
    searchQuery = searchEl.value.trim();
    renderOddsBoard();
  });
}

// ── ODDS BOARD CLICK DELEGATION ────────────────────────────────────────────

function initOddsBoard() {
  const board = document.getElementById('portal-odds-board');
  if (!board) return;

  board.addEventListener('click', e => {
    const pill = e.target.closest('.portal-odds-pill');
    if (!pill) return;
    const matchup    = pill.dataset.matchup    || '';
    const sport      = pill.dataset.sport      || '';
    const pickType   = pill.dataset.type       || '';
    const pickDetails= pill.dataset.pick       || '';
    const odds       = pill.dataset.odds       || '';
    addToSlip(matchup, sport, pickType, pickDetails, odds);
    // Visual flash
    pill.classList.add('portal-odds-pill--added');
    setTimeout(() => pill.classList.remove('portal-odds-pill--added'), 1000);
  });

  // Keyboard: Enter/Space on pill also adds it
  board.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const pill = e.target.closest('.portal-odds-pill');
      if (!pill) return;
      e.preventDefault();
      pill.click();
    }
  });
}

// ── HISTORY TOGGLE ─────────────────────────────────────────────────────────

function initHistoryToggle(session) {
  const toggleBtn = document.getElementById('portal-history-toggle');
  const historyEl = document.getElementById('portal-history-list');
  if (!toggleBtn || !historyEl) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = historyEl.style.display !== 'none';
    historyEl.style.display = isOpen ? 'none' : 'block';
    const chevron = toggleBtn.querySelector('.history-chevron');
    if (chevron) chevron.textContent = isOpen ? '▼' : '▲';
    if (!isOpen) renderHistory(session);
  });
}

// ── INIT ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const session = initAuth();
  if (!session) return;

  renderStats(session);
  renderSlip();
  renderHistory(session);

  initSportTabs();
  initBookTabs();
  initSearch();
  initOddsBoard();
  initManualEntry();
  initHistoryToggle(session);

  fetchAllOdds();
});
