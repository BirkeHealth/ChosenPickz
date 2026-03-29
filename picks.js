/**
 * picks.js — Chosen1 Picks data & rendering logic
 *
 * Dummy data that can be swapped for a fetch() call to a real backend.
 * startTime values for ML picks are set relative to Date.now() so they
 * stay "upcoming" when the page is opened.
 */

const picks = [
  // ── ML (MoneyLine) picks — upcoming ─────────────────────────────────────
  {
    id: 1,
    title: "Lakers vs Warriors",
    type: "ml",
    pick: "Lakers ML",
    odds: "-115",
    startTime: new Date(Date.now() + 20 * 60 * 1000), // 20 min from now
    status: "upcoming",
  },
  {
    id: 2,
    title: "Celtics vs Heat",
    type: "ml",
    pick: "Celtics ML",
    odds: "-130",
    startTime: new Date(Date.now() + 45 * 60 * 1000), // 45 min from now
    status: "upcoming",
  },
  {
    id: 3,
    title: "Yankees vs Red Sox",
    type: "ml",
    pick: "Yankees ML",
    odds: "+105",
    startTime: new Date(Date.now() + 55 * 60 * 1000), // 55 min from now
    status: "upcoming",
  },
  {
    id: 4,
    title: "Chiefs vs Ravens",
    type: "ml",
    pick: "Chiefs ML",
    odds: "-140",
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours — outside window
    status: "upcoming",
  },
  // ── Live bets ─────────────────────────────────────────────────────────────
  {
    id: 5,
    title: "Nuggets vs Suns",
    type: "bet",
    pick: "Nuggets -4.5",
    odds: "-110",
    status: "live",
    score: "Nuggets 58 – Suns 52 (3Q)",
  },
  {
    id: 6,
    title: "Cowboys vs Eagles",
    type: "bet",
    pick: "Eagles ML",
    odds: "+120",
    status: "live",
    score: "Cowboys 14 – Eagles 17 (Q4)",
  },
  {
    id: 7,
    title: "Man City vs Arsenal",
    type: "bet",
    pick: "Over 2.5 Goals",
    odds: "-105",
    status: "live",
    score: "Man City 1 – Arsenal 1 (72')",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function minutesUntil(date) {
  const mins = Math.round((date - Date.now()) / 60000);
  return mins > 0 ? mins : 0;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Renderers ──────────────────────────────────────────────────────────────

/**
 * Renders ML picks that start within the next 60 minutes.
 * Targets the <ul id="ml-picks-list"> element on index.html.
 */
function renderMLPicks() {
  const ul = document.getElementById("ml-picks-list");
  if (!ul) return;

  const now = Date.now();
  const oneHour = now + 60 * 60 * 1000;

  const filtered = picks.filter(
    (p) =>
      p.type === "ml" &&
      p.startTime &&
      p.startTime.getTime() > now &&
      p.startTime.getTime() <= oneHour
  );

  if (!filtered.length) {
    ul.innerHTML = '<li class="empty-msg">No ML picks starting in the next hour.</li>';
    return;
  }

  ul.innerHTML = filtered
    .map(
      (p) => `
    <li class="pick-card">
      <div>
        <div class="pick-title">${escapeHtml(p.title)}</div>
        <div class="pick-pick">Pick: ${escapeHtml(p.pick)} &nbsp;(${escapeHtml(p.odds)})</div>
        <div class="pick-meta">Starts at ${formatTime(p.startTime)} &mdash; in ${minutesUntil(p.startTime)} min</div>
      </div>
      <span class="badge badge-ml">ML</span>
    </li>`
    )
    .join("");
}

/**
 * Renders all live bets.
 * Targets the <ul id="live-bets-list"> element on live-bets.html.
 */
function renderLiveBets() {
  const ul = document.getElementById("live-bets-list");
  if (!ul) return;

  const live = picks.filter((p) => p.type === "bet" && p.status === "live");

  if (!live.length) {
    ul.innerHTML = '<li class="empty-msg">No live bets right now.</li>';
    return;
  }

  ul.innerHTML = live
    .map(
      (p) => `
    <li class="pick-card">
      <div>
        <div class="pick-title">${escapeHtml(p.title)}</div>
        <div class="pick-pick">Pick: ${escapeHtml(p.pick)} &nbsp;(${escapeHtml(p.odds)})</div>
        ${p.score ? `<div class="pick-meta">${escapeHtml(p.score)}</div>` : ""}
      </div>
      <span class="badge badge-live">&#9679; LIVE</span>
    </li>`
    )
    .join("");
}

// ── Auto-initialize ────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("ml-picks-list")) {
    renderMLPicks();
  }
  if (document.getElementById("live-bets-list")) {
    renderLiveBets();
  }
});
