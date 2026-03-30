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

async function loadNews() {
  const list = document.getElementById('news-list');
  if (!list) return;

  if (!NEWS_API_KEY || NEWS_API_KEY === 'YOUR_NEWS_API_KEY') {
    list.innerHTML =
      '<li class="loading-msg">Add your NewsAPI key in <strong>config.js</strong> to load sports headlines. ' +
      'Get a free key at <a href="https://newsapi.org/" target="_blank" rel="noopener" ' +
      'style="color:var(--orange)">newsapi.org</a>.</li>';
    return;
  }

  try {
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

  if (emailSent) {
    showAlert('signup', 'success',
      `✓ Account created! A confirmation email has been sent to <strong>${escapeHtml(email)}</strong>. ` +
      `Check your inbox and confirm your address to activate your account.`);
  } else {
    showAlert('signup', 'info',
      `✓ Account created for <strong>${escapeHtml(name)}</strong>! ` +
      `EmailJS is not configured, so your confirmation code is shown below. ` +
      `<a href="https://www.emailjs.com/" target="_blank" rel="noopener" style="color:var(--gold)">Set up EmailJS</a> in config.js to receive real emails.`);
    const box = document.getElementById('confirm-box');
    const codeDisplay = document.getElementById('confirm-code-display');
    if (box && codeDisplay) {
      codeDisplay.textContent = code;
      box.style.display = 'block';
    }
  }
}

// ── HANDLE LOGIN ───────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  clearAlerts();

  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showAlert('login', 'error', 'Please enter your email and password.');
    return;
  }

  const btn = document.getElementById('login-submit');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const hash  = await hashPassword(password);
  const users = getUsers();
  const user  = users.find(u => u.email === email);

  btn.disabled = false;
  btn.textContent = 'Log In';

  if (!user || user.hash !== hash) {
    showAlert('login', 'error', 'Incorrect email or password. Please try again.');
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
    return;
  }

  // Successful login
  saveSession({ id: user.id, name: user.name, email: user.email });
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

  if (user) {
    if (navUser)     navUser.style.display     = 'flex';
    if (navGreeting) navGreeting.textContent   = `Hi, ${user.name.split(' ')[0]}`;
    if (loginBtn)    loginBtn.style.display    = 'none';
    if (signupBtn)   signupBtn.style.display   = 'none';
  } else {
    if (navUser)   navUser.style.display   = 'none';
    if (loginBtn)  loginBtn.style.display  = 'inline-block';
    if (signupBtn) signupBtn.style.display = 'inline-block';
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
  if (loginForm)  loginForm.addEventListener('submit',  handleLogin);
  if (signupForm) signupForm.addEventListener('submit', handleSignup);

  // Close when clicking outside the modal box
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeModal();
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

  // Restore session
  const session = getSession();
  updateNavForUser(session);

  // Load live data
  loadOdds();
  loadNews();
});
