/**
 * app.js — CH0SEN1 PICKZ Landing Page
 *
 * Handles:
 *  - API-key configuration (loaded from config.js → window.APP_CONFIG)
 *  - Fetching upcoming game odds from The Odds API (up to 5 games)
 *  - Fetching top sports headlines from NewsAPI.org
 *  - Auth: signup (create user), login (validate user), logout
 *  - Email confirmation via EmailJS (or on-screen code fallback)
 *
 * User data is persisted in localStorage (client-side demo).
 * For production use a secure server-side auth system with hashed passwords.
 */

// ── CONFIG ─────────────────────────────────────────────────────────────────

const CFG = window.APP_CONFIG || {};
// NOTE: ODDS_API_KEY is no longer used in app.js — all Odds API calls now go
// through the server-side proxy at /api/odds so the key is never sent to the
// browser.  Set ODDS_API_KEY as a server environment variable (see .env.example).
const NEWS_API_KEY = CFG.NEWS_API_KEY  || '';

// ── SPORTSBOOK TOGGLE STATE ────────────────────────────────────────────────
// Tracks which bookmaker the user has selected for the live-preview cards.
// 'all'  → pick the first available book (DraftKings preferred, then FanDuel)
// Other values match a bookmaker key returned by The Odds API (e.g. 'fanduel')
let currentBookmaker = 'all';
let cachedGames = []; // last-fetched games; re-rendered on bookmaker switch

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

// ── STORAGE HELPERS ────────────────────────────────────────────────────────

const USERS_KEY   = 'cp_users';
const SESSION_KEY = 'cp_session';
const PICKS_KEY   = 'cp_admin_picks';
const BETSLIP_KEY = 'cp_betslip_legs';

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getAdminPicks() {
  try { return JSON.parse(localStorage.getItem(PICKS_KEY) || '[]'); }
  catch { return []; }
}

function saveAdminPicks(picks) {
  localStorage.setItem(PICKS_KEY, JSON.stringify(picks));
}

function saveBetSlip() {
  localStorage.setItem(BETSLIP_KEY, JSON.stringify(betSlipLegs));
}

// ── SIMPLE HASH (SHA-256 via SubtleCrypto) ─────────────────────────────────

async function hashPassword(plain) {
  const enc = new TextEncoder().encode(plain);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── RANDOM CODE GENERATOR ─────────────────────────────────────────────────

// Omit visually ambiguous characters (I, O, 0, 1) to reduce misreading
function randomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ── UTILITIES ─────────────────────────────────────────────────────────────

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
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function sportLabel(sportKey) {
  const labels = {
    americanfootball_nfl:   'NFL',
    americanfootball_ncaaf: 'NCAAF',
    basketball_nba:         'NBA',
    basketball_ncaab:       'NCAAB',
    baseball_mlb:           'MLB',
    icehockey_nhl:          'NHL',
    soccer_usa_mls:         'MLS',
  };
  return labels[sportKey] || sportKey.toUpperCase();
}

function getOdds(outcomes, name) {
  if (!Array.isArray(outcomes)) return 'N/A';
  const o = outcomes.find(x => x.name === name);
  if (!o) return 'N/A';
  const price = o.price;
  if (typeof price !== 'number') return 'N/A';
  return price >= 0 ? `+${price}` : String(price);
}

function getSpread(outcomes, name) {
  if (!Array.isArray(outcomes)) return 'N/A';
  const o = outcomes.find(x => x.name === name);
  if (!o) return 'N/A';
  const pt     = o.point !== undefined ? o.point : '';
  const ptSign = typeof pt === 'number' ? (pt > 0 ? '+' : '') : '';
  const pr     = typeof o.price === 'number'
    ? (o.price >= 0 ? `+${o.price}` : String(o.price))
    : '';
  if (pt === '' && !pr) return 'N/A';
  return `${ptSign}${pt} (${pr})`;
}

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

/**
 * Build the HTML for one bet-preview card.
 * @param {Object} game          - A single event from The Odds API.
 * @param {string} bookmakerKey  - Which bookmaker to display. 'all' uses the
 *                                 first available (DraftKings preferred).
 */
function renderBetCard(game, bookmakerKey = 'all') {
  const homeTeam = game.home_team || 'Home';
  const awayTeam = game.away_team || 'Away';
  const gameTime = formatGameTime(game.commence_time);
  const sport    = sportLabel(game.sport_key);

  const bookmakers = game.bookmakers || [];

  // Select the requested bookmaker.
  // When 'all' is chosen we pick the first available (DraftKings preferred).
  // When a specific book is chosen we only use it — no silent fallback —
  // so users can see when their preferred book doesn't cover a game.
  let bk;
  if (bookmakerKey === 'all') {
    bk =
      bookmakers.find(b => b.key === 'draftkings') ||
      bookmakers.find(b => b.key === 'fanduel')    ||
      bookmakers[0];
  } else {
    bk = bookmakers.find(b => b.key === bookmakerKey);
  }

  const bookmakerName = bk ? (bk.title || bk.key) : 'N/A';

  // If the requested book isn't available for this game, show a notice instead
  // of silently displaying a different book's odds.
  if (!bk) {
    return `
      <div class="bet-card">
        <div class="bet-sport">${escapeHtml(sport)}</div>
        <div class="bet-matchup">${escapeHtml(awayTeam)} @ ${escapeHtml(homeTeam)}</div>
        <div class="bet-time">&#128336; ${escapeHtml(gameTime)}</div>
        <p class="loading-msg" style="margin-top:0.75rem;text-align:left;">
          ${escapeHtml(bookmakerName === 'N/A' ? 'Selected sportsbook' : bookmakerName)} does not have odds for this game.
        </p>
      </div>`;
  }

  let mlHome = 'N/A', mlAway = 'N/A';
  let spreadHome = 'N/A', spreadAway = 'N/A';
  let total = 'N/A';

  if (bk && Array.isArray(bk.markets)) {
    const h2h     = bk.markets.find(m => m.key === 'h2h');
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
      <div class="bet-source">📊 Source: ${escapeHtml(bookmakerName)}</div>
    </div>`;
}

// ── RENDER CACHED GAMES ────────────────────────────────────────────────────

/**
 * Re-renders the bets grid from the cached games using the currently
 * selected bookmaker.  Called by loadOdds() and by the toggle buttons.
 */
function renderBets() {
  const container = document.getElementById('bets-container');
  if (!container || cachedGames.length === 0) return;
  container.innerHTML = cachedGames.map(g => renderBetCard(g, currentBookmaker)).join('');
}

// ── FETCH ODDS ─────────────────────────────────────────────────────────────
// Odds are fetched through the server-side proxy at /api/odds so that the
// API key is never exposed to the browser.  Each sport is queried in turn
// until we have enough games for the preview cards.

async function loadOdds() {
  const container = document.getElementById('bets-container');
  if (!container) return;

  try {
    const results = [];

    for (const sport of SPORTS) {
      if (results.length >= 5) break;

      // Use the backend proxy — API key is injected server-side
      const params = new URLSearchParams({ sport: sport, mode: 'upcoming' });
      const res    = await fetch('/api/odds?' + params.toString());
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

    cachedGames = results;
    renderBets();
  } catch (err) {
    container.innerHTML = '<p class="error-msg">Unable to load live odds. Please try again later.</p>';
    console.error('Odds API error:', err);
  }
}

// ── FETCH NEWS ─────────────────────────────────────────────────────────────
// News is fetched through the server-side proxy at /api/news so that the
// API key is never exposed to the browser.  Falls back to a direct call
// using the browser-side key if the proxy is not configured.
// This function is only called when scripts/sportsNews.js is not loaded.

async function loadNews() {
  const list = document.getElementById('news-list');
  if (!list) return;

  try {
    // Try the server-side proxy first
    const proxyRes = await fetch('/api/news?category=sports&language=en&pageSize=5');

    if (proxyRes.ok) {
      const data = await proxyRes.json();
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
      return;
    }

    // Proxy not configured — fall back to the client-side key
    if (proxyRes.status === 503) {
      if (!NEWS_API_KEY || NEWS_API_KEY === 'YOUR_NEWS_API_KEY') {
        list.innerHTML =
          '<li class="loading-msg">Add your NewsAPI key in <strong>config.js</strong> to load sports headlines. ' +
          'Get a free key at <a href="https://newsapi.org/" target="_blank" rel="noopener" ' +
          'style="color:var(--orange)">newsapi.org</a>.</li>';
        return;
      }
      const url =
        `https://newsapi.org/v2/top-headlines` +
        `?category=sports&language=en&pageSize=5&apiKey=${encodeURIComponent(NEWS_API_KEY)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
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
      return;
    }

    throw new Error(`News proxy HTTP ${proxyRes.status}`);
  } catch (err) {
    list.innerHTML = '<li class="error-msg">Unable to load sports news. Please try again later.</li>';
    console.error('NewsAPI error:', err);
  }
}

// ── AUTH MODAL HELPERS ─────────────────────────────────────────────────────

function openModal(tab) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  switchTab(tab || 'login');
  setTimeout(() => {
    const first = modal.querySelector('.form-panel.active input');
    if (first) first.focus();
  }, 50);
}

function closeModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  clearAlerts();
  // Reset confirm code box
  const box = document.getElementById('confirm-box');
  if (box) box.style.display = 'none';
  // Re-focus the trigger button
  const btn = document.getElementById('login-btn');
  if (btn) btn.focus();
}

function switchTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(t => {
    t.classList.toggle('active', t.id === `tab-${tab}`);
    t.setAttribute('aria-selected', t.id === `tab-${tab}` ? 'true' : 'false');
  });
  document.querySelectorAll('.form-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${tab}`);
  });
  clearAlerts();
}

function showAlert(panelId, type, msg) {
  const el = document.getElementById(`${panelId}-alert`);
  if (!el) return;
  el.className = `form-alert ${type} show`;
  el.innerHTML = msg;
}

function clearAlerts() {
  document.querySelectorAll('.form-alert').forEach(el => {
    el.className = 'form-alert';
    el.textContent = '';
  });
}

// ── EMAIL CONFIRMATION (EmailJS) ───────────────────────────────────────────

async function sendConfirmationEmail(toEmail, toName, code) {
  const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } = CFG;

  if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === 'YOUR_EMAILJS_SERVICE_ID'
    || !EMAILJS_TEMPLATE_ID || EMAILJS_TEMPLATE_ID === 'YOUR_EMAILJS_TEMPLATE_ID'
    || !EMAILJS_PUBLIC_KEY  || EMAILJS_PUBLIC_KEY  === 'YOUR_EMAILJS_PUBLIC_KEY') {
    return false; // EmailJS not configured — caller will show on-screen code
  }

  // Dynamically load EmailJS SDK if not already present
  if (typeof emailjs === 'undefined') {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email:     toEmail,
      to_name:      toName,
      confirm_code: code,
    });
    return true;
  } catch (err) {
    console.warn('EmailJS send failed:', err);
    return false;
  }
}

// ── HANDLE SIGNUP ──────────────────────────────────────────────────────────

async function handleSignup(e) {
  e.preventDefault();
  clearAlerts();

  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;

  if (!name || !email || !password || !confirm) {
    showAlert('signup', 'error', 'Please fill in all fields.');
    return;
  }

  if (password !== confirm) {
    showAlert('signup', 'error', 'Passwords do not match.');
    return;
  }

  if (password.length < 8) {
    showAlert('signup', 'error', 'Password must be at least 8 characters.');
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    showAlert('signup', 'error', 'An account with that email already exists. <a href="#" id="alert-goto-login" style="color:var(--orange)">Log in instead.</a>');
    // Wire the dynamic link after it's inserted into the DOM
    setTimeout(() => {
      const link = document.getElementById('alert-goto-login');
      if (link) link.addEventListener('click', e => { e.preventDefault(); switchTab('login'); });
    }, 0);
    return;
  }

  const btn = document.getElementById('signup-submit');
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  const hash = await hashPassword(password);
  const code = randomCode(6);

  const newUser = {
    id:        Date.now(),
    name,
    email,
    hash,
    confirmCode:      code,
    emailConfirmed:   false,
    createdAt:        new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Attempt to send confirmation email via EmailJS
  const emailSent = await sendConfirmationEmail(email, name, code);

  // Reset button
  btn.disabled = false;
  btn.textContent = 'Create Account';

  // Hide the form, show result
  document.getElementById('signup-form').style.display = 'none';

  const box = document.getElementById('confirm-box');
  const codeDisplay = document.getElementById('confirm-code-display');

  if (emailSent) {
    showAlert('signup', 'success',
      `✓ Account created! A confirmation email has been sent to <strong>${escapeHtml(email)}</strong>. ` +
      `Check your inbox and enter the code below to activate your account.`);
  } else {
    showAlert('signup', 'info',
      `✓ Account created for <strong>${escapeHtml(name)}</strong>! ` +
      `Enter the verification code below to activate your account. ` +
      `<a href="https://www.emailjs.com/" target="_blank" rel="noopener" style="color:var(--gold)">Set up EmailJS</a> to receive codes by email.`);
  }

  if (box && codeDisplay) {
    codeDisplay.textContent = code;
    box.style.display = 'block';
    box.dataset.pendingEmail = email;
  }
}

// ── HANDLE LOGIN ───────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  clearAlerts();

  const emailOrUser = document.getElementById('login-email').value.trim().toLowerCase();
  const password    = document.getElementById('login-password').value;

  if (!emailOrUser || !password) {
    showAlert('login', 'error', 'Please enter your email/username and password.');
    return;
  }

  const btn = document.getElementById('login-submit');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  // ── Admin shortcut (username: admin, password: 123456) ──
  if (emailOrUser === 'admin' && password === '123456') {
    const adminUser = { id: 0, name: 'Admin', email: 'admin', isAdmin: true };
    saveSession(adminUser);
    updateNavForUser(adminUser);
    closeModal();
    btn.disabled = false;
    btn.textContent = 'Log In';
    return;
  }

  const hash  = await hashPassword(password);
  const users = getUsers();
  const user  = users.find(u => u.email === emailOrUser);

  btn.disabled = false;
  btn.textContent = 'Log In';

  if (!user || user.hash !== hash) {
    showAlert('login', 'error', 'Incorrect email or password. Please try again.');
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
    return;
  }

  // Warn if email not yet verified (but still allow login)
  if (!user.emailConfirmed) {
    showAlert('login', 'info',
      '⚠️ Your email is not yet verified. Please check your confirmation code. ' +
      '<a href="#" id="alert-goto-verify" style="color:var(--orange)">Verify now</a>.');
    setTimeout(() => {
      const link = document.getElementById('alert-goto-verify');
      if (link) link.addEventListener('click', e => {
        e.preventDefault();
        switchTab('signup');
        // Restore confirmation box for this user
        const box = document.getElementById('confirm-box');
        const codeDisplay = document.getElementById('confirm-code-display');
        if (box && codeDisplay) {
          codeDisplay.textContent = user.confirmCode || 'N/A';
          box.style.display = 'block';
          // Store pending verification user email
          box.dataset.pendingEmail = user.email;
        }
      });
    }, 0);
    return;
  }

  // Successful login
  saveSession({ id: user.id, name: user.name, email: user.email, isAdmin: false });
  updateNavForUser(user);
  closeModal();
}

// ── LOGOUT ────────────────────────────────────────────────────────────────

function handleLogout() {
  clearSession();
  updateNavForUser(null);
}

// ── UPDATE NAV ─────────────────────────────────────────────────────────────

function updateNavForUser(user) {
  const navUser     = document.getElementById('nav-user');
  const navGreeting = document.getElementById('nav-greeting');
  const loginBtn    = document.getElementById('login-btn');
  const signupBtn   = document.getElementById('signup-btn');
  const adminPanel  = document.getElementById('admin-panel');

  if (user) {
    if (navUser)     navUser.style.display     = 'flex';
    if (navGreeting) navGreeting.textContent   = user.isAdmin ? '⚙️ Admin' : `Hi, ${user.name.split(' ')[0]}`;
    if (loginBtn)    loginBtn.style.display    = 'none';
    if (signupBtn)   signupBtn.style.display   = 'none';
    // Show admin panel only for admin user
    if (adminPanel)  adminPanel.style.display  = user.isAdmin ? 'block' : 'none';
    if (user.isAdmin) renderAdminPicksList();
  } else {
    if (navUser)    navUser.style.display    = 'none';
    if (loginBtn)   loginBtn.style.display   = 'inline-block';
    if (signupBtn)  signupBtn.style.display  = 'inline-block';
    if (adminPanel) adminPanel.style.display = 'none';
  }
}

// ── ADMIN PICKS MANAGEMENT ────────────────────────────────────────────────

function renderAdminPicksList() {
  const container = document.getElementById('admin-picks-list');
  if (!container) return;
  const picks = getAdminPicks();
  if (picks.length === 0) {
    container.innerHTML = '<p class="loading-msg">No picks posted yet.</p>';
    return;
  }
  container.innerHTML = picks.map(function(pick) {
    const starsHtml = '⭐'.repeat(pick.confidence || 3);
    return `
      <div class="admin-pick-item">
        <div class="admin-pick-info">
          <div class="admin-pick-matchup">${escapeHtml(pick.matchup)}</div>
          <div class="admin-pick-meta">${escapeHtml(pick.sport)} · ${escapeHtml(pick.type)} · ${pick.lock === 'locked' ? '🔒 Subscribers' : '🆓 Free'} · ${starsHtml}</div>
          <div class="admin-pick-value">${escapeHtml(pick.value)}</div>
          ${pick.note ? `<div class="admin-pick-meta" style="font-style:italic;">${escapeHtml(pick.note)}</div>` : ''}
        </div>
        <button class="btn-delete-pick" data-pick-id="${pick.id}">🗑 Delete</button>
      </div>`;
  }).join('');

  // Wire delete buttons
  container.querySelectorAll('.btn-delete-pick').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const id = Number(this.dataset.pickId);
      const picks = getAdminPicks().filter(p => p.id !== id);
      saveAdminPicks(picks);
      renderAdminPicksList();
      renderPicksSection();
    });
  });
}

function handleAdminPickSubmit(e) {
  e.preventDefault();
  const matchup    = document.getElementById('pick-matchup').value.trim();
  const sport      = document.getElementById('pick-sport').value;
  const type       = document.getElementById('pick-type').value;
  const value      = document.getElementById('pick-value').value.trim();
  const confidence = Number(document.getElementById('pick-confidence').value);
  const lock       = document.getElementById('pick-lock').value;
  const note       = document.getElementById('pick-note').value.trim();

  if (!matchup || !value) return;

  const picks = getAdminPicks();
  picks.unshift({
    id:         Date.now(),
    matchup,
    sport,
    type,
    value,
    confidence,
    lock,
    note,
    postedAt: new Date().toISOString(),
  });
  saveAdminPicks(picks);

  // Reset form
  document.getElementById('admin-pick-form').reset();
  renderAdminPicksList();
  renderPicksSection();
}

// ── RENDER PICKS SECTION (visible to all users) ──────────────────────────

function renderPicksSection() {
  const container = document.getElementById('picks-display');
  if (!container) return;

  const picks = getAdminPicks();
  if (picks.length === 0) {
    container.innerHTML = '<p class="loading-msg">No picks posted yet — check back soon!</p>';
    return;
  }

  const session = getSession();
  const isSubscriber = session && !session.isAdmin; // in a real app, check subscription tier

  container.innerHTML = picks.map(function(pick) {
    const starsHtml = '⭐'.repeat(pick.confidence || 3);
    const isLocked  = pick.lock === 'locked' && !session;
    const postedDate = pick.postedAt ? new Date(pick.postedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    if (isLocked) {
      return `
        <div class="pick-card-new">
          <div class="pick-left">
            <span class="pick-sport-badge">${escapeHtml(pick.sport)}</span>
            <div class="pick-matchup-new">${escapeHtml(pick.matchup)}</div>
            <div class="pick-meta-new">${escapeHtml(pick.type)} · ${postedDate}</div>
            <div class="pick-value-new" style="filter:blur(5px);user-select:none;">🔒🔒🔒🔒🔒🔒</div>
          </div>
          <span class="pick-lock-badge locked">🔒 Members Only</span>
        </div>`;
    }

    return `
      <div class="pick-card-new">
        <div class="pick-left">
          <span class="pick-sport-badge">${escapeHtml(pick.sport)}</span>
          <div class="pick-matchup-new">${escapeHtml(pick.matchup)}</div>
          <div class="pick-meta-new">${escapeHtml(pick.type)} · ${starsHtml} · ${postedDate}</div>
          <div class="pick-value-new">🏆 ${escapeHtml(pick.value)}</div>
          ${pick.note ? `<div class="pick-note-new">${escapeHtml(pick.note)}</div>` : ''}
        </div>
        <span class="pick-lock-badge ${pick.lock === 'locked' ? 'locked' : 'free'}">${pick.lock === 'locked' ? '🔒 Members' : '🆓 Free'}</span>
      </div>`;
  }).join('');
}

// ── EMAIL VERIFICATION ────────────────────────────────────────────────────

function handleVerifyCode(e) {
  e.preventDefault();
  const input    = document.getElementById('verify-code-input');
  const alertEl  = document.getElementById('verify-alert');
  const box      = document.getElementById('confirm-box');
  const entered  = (input ? input.value.trim().toUpperCase() : '');
  const email    = box ? box.dataset.pendingEmail : '';

  if (!entered || !email) return;

  const users = getUsers();
  const idx   = users.findIndex(u => u.email === email);
  if (idx === -1) {
    if (alertEl) {
      alertEl.className = 'form-alert error show';
      alertEl.textContent = 'Account not found. Please sign up again.';
    }
    return;
  }

  if (users[idx].confirmCode !== entered) {
    if (alertEl) {
      alertEl.className = 'form-alert error show';
      alertEl.textContent = 'Incorrect code. Please try again.';
    }
    if (input) { input.value = ''; input.focus(); }
    return;
  }

  // Mark as confirmed
  users[idx].emailConfirmed = true;
  saveUsers(users);

  if (alertEl) {
    alertEl.className = 'form-alert success show';
    alertEl.textContent = '✓ Email verified! You can now log in.';
  }
  if (input) input.disabled = true;

  // Auto-login after verification
  setTimeout(function() {
    const user = users[idx];
    saveSession({ id: user.id, name: user.name, email: user.email, isAdmin: false });
    updateNavForUser(user);
    closeModal();
  }, 1200);
}

// ── BET SLIP CALCULATOR ───────────────────────────────────────────────────

// American-odds → decimal multiplier
function americanToDecimal(american) {
  const n = Number(american);
  if (isNaN(n)) return null;
  if (n >= 100)  return 1 + n / 100;
  if (n <= -100) return 1 + 100 / Math.abs(n);
  return null; // invalid
}

// Potential payout for a single bet (returns winnings, not total)
function calcSingleWin(odds, wager) {
  const dec = americanToDecimal(odds);
  if (!dec || !wager || wager <= 0) return 0;
  return (dec - 1) * wager;
}

let betSlipLegs = (function () {
  try { return JSON.parse(localStorage.getItem(BETSLIP_KEY) || '[]'); } catch { return []; }
}());

function updateBetSlipUI() {
  const legsEl        = document.getElementById('bs-legs');
  const isParlay      = document.getElementById('bs-parlay-toggle')?.checked;
  const parlayWagerEl = document.getElementById('bs-parlay-wager');
  const riskEl        = document.getElementById('bs-total-risk');
  const payoutEl      = document.getElementById('bs-total-payout');
  const profitEl      = document.getElementById('bs-total-profit');

  if (!legsEl) return;

  saveBetSlip();

  if (betSlipLegs.length === 0) {
    legsEl.innerHTML = '<p class="loading-msg" style="font-size:0.8rem;padding:0.5rem 0;">No bets added yet. Tap any odds pill to add a leg, or use the form above.</p>';
    if (riskEl)   riskEl.textContent   = '$0.00';
    if (payoutEl) payoutEl.textContent = '$0.00';
    if (profitEl) profitEl.textContent = '$0.00';
    return;
  }

  legsEl.innerHTML = betSlipLegs.map(function(leg, idx) {
    const dec    = americanToDecimal(leg.odds);
    const winAmt = dec && leg.wager > 0 ? ((dec - 1) * leg.wager).toFixed(2) : '—';
    const total  = dec && leg.wager > 0 ? (dec * leg.wager).toFixed(2) : '—';
    return `
      <div class="bs-leg">
        <div class="bs-leg-info">
          <div class="bs-leg-matchup">${escapeHtml(leg.matchup || 'Game')}</div>
          <div class="bs-leg-pick">${escapeHtml(leg.pick || '')} &nbsp;·&nbsp; Odds: <strong>${leg.odds >= 0 ? '+' : ''}${leg.odds}</strong></div>
          ${!isParlay ? `
          <div class="bs-leg-stake-row">
            <span class="bs-stake-label">Stake ($):</span>
            <input type="number" class="bs-input bs-wager bs-leg-stake" data-idx="${idx}" value="${Number(leg.wager).toFixed(2)}" min="0" step="0.01" />
          </div>
          <div class="bs-leg-calc" id="bs-leg-calc-${idx}">Payout: $${total} (Win: $${winAmt})</div>` : ''}
        </div>
        <button class="bs-leg-remove" data-idx="${idx}" title="Remove">✕</button>
      </div>`;
  }).join('');

  legsEl.querySelectorAll('.bs-leg-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      betSlipLegs.splice(Number(this.dataset.idx), 1);
      updateBetSlipUI();
    });
  });

  if (isParlay) {
    const parlayWager = parseFloat(parlayWagerEl?.value || 0) || 0;
    // Parlay decimal = product of all leg decimals
    const parlayDecimal = betSlipLegs.reduce(function(acc, leg) {
      const dec = americanToDecimal(leg.odds);
      return dec ? acc * dec : acc;
    }, 1);
    const parlayPayout = parlayDecimal * parlayWager;
    const parlayProfit = parlayPayout - parlayWager;
    if (riskEl)   riskEl.textContent   = `$${parlayWager.toFixed(2)}`;
    if (payoutEl) payoutEl.textContent = `$${parlayPayout.toFixed(2)}`;
    if (profitEl) profitEl.textContent = `$${parlayProfit.toFixed(2)}`;
  } else {
    const totalRisk   = betSlipLegs.reduce((s, l) => s + (parseFloat(l.wager) || 0), 0);
    const totalPayout = betSlipLegs.reduce(function(s, l) {
      const dec = americanToDecimal(l.odds);
      return s + (dec && l.wager > 0 ? dec * l.wager : 0);
    }, 0);
    const totalProfit = totalPayout - totalRisk;
    if (riskEl)   riskEl.textContent   = `$${totalRisk.toFixed(2)}`;
    if (payoutEl) payoutEl.textContent = `$${totalPayout.toFixed(2)}`;
    if (profitEl) profitEl.textContent = `$${totalProfit.toFixed(2)}`;
  }
}

// ── INIT ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  // Wire up nav buttons
  const loginBtn  = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const closeBtn  = document.getElementById('modal-close');
  const modal     = document.getElementById('auth-modal');

  if (loginBtn)  loginBtn.addEventListener('click',  () => openModal('login'));
  if (signupBtn) signupBtn.addEventListener('click', () => openModal('signup'));
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (closeBtn)  closeBtn.addEventListener('click',  closeModal);

  // Tab switch links
  const tabLoginBtn  = document.getElementById('tab-login');
  const tabSignupBtn = document.getElementById('tab-signup');
  const gotoSignup   = document.getElementById('goto-signup');
  const gotoLogin    = document.getElementById('goto-login');
  if (tabLoginBtn)  tabLoginBtn.addEventListener('click',  () => switchTab('login'));
  if (tabSignupBtn) tabSignupBtn.addEventListener('click', () => switchTab('signup'));
  if (gotoSignup)   gotoSignup.addEventListener('click',   e => { e.preventDefault(); switchTab('signup'); });
  if (gotoLogin)    gotoLogin.addEventListener('click',    e => { e.preventDefault(); switchTab('login'); });

  // Form submissions
  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const verifyForm = document.getElementById('verify-form');
  if (loginForm)  loginForm.addEventListener('submit',  handleLogin);
  if (signupForm) signupForm.addEventListener('submit', handleSignup);
  if (verifyForm) verifyForm.addEventListener('submit', handleVerifyCode);

  // Close when clicking outside the modal box
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (modal && modal.classList.contains('open')) closeModal();
      const bsModal = document.getElementById('betslip-modal');
      if (bsModal && bsModal.classList.contains('open')) closeBetSlip();
    }
  });

  // Bookmaker toggle buttons
  document.querySelectorAll('.bookmaker-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentBookmaker = btn.dataset.bookmaker;
      // Update active styling
      document.querySelectorAll('.bookmaker-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderBets();
    });
  });

  // Admin panel pick form
  const adminPickForm = document.getElementById('admin-pick-form');
  if (adminPickForm) adminPickForm.addEventListener('submit', handleAdminPickSubmit);

  // ── Bet Slip Calculator wiring ──
  const fab          = document.getElementById('betslip-fab');
  const bsModal      = document.getElementById('betslip-modal');
  const bsCloseBtn   = document.getElementById('betslip-close');
  const bsAddBtn     = document.getElementById('bs-add-btn');
  const bsClearBtn   = document.getElementById('bs-clear-btn');
  const bsParlayChk  = document.getElementById('bs-parlay-toggle');
  const bsParlayWRow = document.getElementById('bs-parlay-wager-row');
  const bsParlayWager= document.getElementById('bs-parlay-wager');

  function openBetSlip() {
    if (bsModal) { bsModal.classList.add('open'); bsModal.setAttribute('aria-hidden', 'false'); }
    updateBetSlipUI();
  }
  function closeBetSlip() {
    if (bsModal) { bsModal.classList.remove('open'); bsModal.setAttribute('aria-hidden', 'true'); }
  }

  if (fab)        fab.addEventListener('click', openBetSlip);
  if (bsCloseBtn) bsCloseBtn.addEventListener('click', closeBetSlip);
  if (bsModal)    bsModal.addEventListener('click', e => { if (e.target === bsModal) closeBetSlip(); });

  // Event delegation: clicking an odds pill on the live bets grid adds it to the slip
  const betsContainer = document.getElementById('bets-container');
  if (betsContainer) {
    betsContainer.addEventListener('click', function (e) {
      const pill = e.target.closest('.odds-pill');
      if (!pill) return;
      const oddsText = (pill.querySelector('.odds-value')?.textContent || '').trim();
      if (!oddsText || oddsText === 'N/A') return;
      const oddsNum = Number(oddsText.replace(/^\+/, ''));
      if (isNaN(oddsNum) || !americanToDecimal(oddsNum)) return;
      const card    = pill.closest('.bet-card');
      const matchup = (card?.querySelector('.bet-matchup')?.textContent || '').trim();
      const label   = (pill.querySelector('.odds-label')?.textContent || '').trim();
      betSlipLegs.push({ matchup, pick: label, odds: oddsNum, wager: 50 });
      openBetSlip();
      const bsBox = document.querySelector('.betslip-box');
      if (bsBox) bsBox.scrollTop = 0;
      // Visual feedback: briefly highlight the pill
      pill.classList.add('odds-pill--added');
      setTimeout(function () { pill.classList.remove('odds-pill--added'); }, 1200);
    });
  }

  // Event delegation for per-leg stake editing in singles mode
  const bsLegsEl = document.getElementById('bs-legs');
  if (bsLegsEl) {
    bsLegsEl.addEventListener('input', function(e) {
      const input = e.target.closest('.bs-leg-stake');
      if (!input) return;
      const idx = Number(input.dataset.idx);
      if (isNaN(idx) || idx < 0 || idx >= betSlipLegs.length) return;
      betSlipLegs[idx].wager = parseFloat(input.value) || 0;
      saveBetSlip();
      // Update per-leg calc display
      const dec = americanToDecimal(betSlipLegs[idx].odds);
      const w = betSlipLegs[idx].wager;
      const winAmt = dec && w > 0 ? ((dec - 1) * w).toFixed(2) : '—';
      const total  = dec && w > 0 ? (dec * w).toFixed(2) : '—';
      const calcEl = document.getElementById('bs-leg-calc-' + idx);
      if (calcEl) calcEl.textContent = 'Payout: $' + total + ' (Win: $' + winAmt + ')';
      // Update summary totals
      const totalRisk   = betSlipLegs.reduce((s, l) => s + (parseFloat(l.wager) || 0), 0);
      const totalPayout = betSlipLegs.reduce((s, l) => {
        const d = americanToDecimal(l.odds);
        return s + (d && l.wager > 0 ? d * l.wager : 0);
      }, 0);
      const totalProfit = totalPayout - totalRisk;
      const rEl  = document.getElementById('bs-total-risk');
      const pEl  = document.getElementById('bs-total-payout');
      const prEl = document.getElementById('bs-total-profit');
      if (rEl)  rEl.textContent  = '$' + totalRisk.toFixed(2);
      if (pEl)  pEl.textContent  = '$' + totalPayout.toFixed(2);
      if (prEl) prEl.textContent = '$' + totalProfit.toFixed(2);
    });
  }

  if (bsAddBtn) {
    bsAddBtn.addEventListener('click', function() {
      const matchup = (document.getElementById('bs-matchup')?.value || '').trim();
      const pick    = (document.getElementById('bs-pick')?.value    || '').trim();
      const odds    = Number(document.getElementById('bs-odds')?.value  || 0);
      const wager   = parseFloat(document.getElementById('bs-wager')?.value || 0);
      if (!odds || wager <= 0) {
        alert('Please enter valid odds and a wager amount.');
        return;
      }
      betSlipLegs.push({ matchup, pick, odds, wager });
      // Clear input fields
      ['bs-matchup','bs-pick','bs-odds','bs-wager'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      updateBetSlipUI();
    });
  }

  if (bsClearBtn) {
    bsClearBtn.addEventListener('click', function() {
      betSlipLegs = [];
      updateBetSlipUI();
    });
  }

  if (bsParlayChk) {
    bsParlayChk.addEventListener('change', function() {
      if (bsParlayWRow) bsParlayWRow.style.display = this.checked ? 'block' : 'none';
      updateBetSlipUI();
    });
  }
  if (bsParlayWager) {
    bsParlayWager.addEventListener('input', updateBetSlipUI);
  }

  // Restore session
  const session = getSession();
  updateNavForUser(session);

  // Render picks section for all users
  renderPicksSection();

  // Load live data
  loadOdds();
  // Only call loadNews() when sportsNews.js is not loaded (avoids double render
  // since SportsNewsModule auto-initialises on DOMContentLoaded and targets the
  // same #news-list element that loadNews() would populate)
  if (!window.SportsNewsModule) loadNews();
});
