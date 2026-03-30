/**
 * BestOddsPage.jsx
 *
 * Full-page component that lets users search for the best available
 * moneyline (head-to-head) odds across ALL bookmakers for a chosen sport
 * and any upcoming date.
 *
 * For each event it scans every bookmaker returned by The Odds API and
 * highlights the single best (highest-payout) odds for each outcome,
 * showing which sportsbook to use.  Spread and O/U best odds are also shown.
 *
 * API calls are routed through /api/odds (server-side proxy) so that the
 * Odds API key is never exposed in the browser.
 */

import { useState } from 'react';

// Backend proxy endpoint — the server injects the API key server-side.
// Set ODDS_API_KEY as a server environment variable (see .env.example).
const PROXY_BASE = '/api/odds';

// Sports supported by The Odds API that we expose in the dropdown
const SPORTS = [
  { key: 'americanfootball_nfl',   label: '🏈 NFL' },
  { key: 'basketball_nba',         label: '🏀 NBA' },
  { key: 'baseball_mlb',           label: '⚾ MLB' },
  { key: 'icehockey_nhl',          label: '🏒 NHL' },
  { key: 'americanfootball_ncaaf', label: '🏈 NCAAF' },
  { key: 'basketball_ncaab',       label: '🏀 NCAAB' },
  { key: 'soccer_usa_mls',         label: '⚽ MLS' },
  { key: 'soccer_epl',             label: '⚽ EPL' },
  { key: 'tennis_atp_french_open', label: '🎾 Tennis (ATP)' },
  { key: 'mma_mixed_martial_arts', label: '🥊 MMA' },
];

/** Return ISO date string (YYYY-MM-DD) offset by `days` from today. */
function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Format american-style odds price with sign. */
function fmtOdds(price) {
  if (typeof price !== 'number') return 'N/A';
  return price >= 0 ? `+${price}` : String(price);
}

/** Format an ISO date string to a readable local date/time. */
function fmtTime(isoString) {
  return new Date(isoString).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

/**
 * Given an event's bookmakers array, find the single best (highest payout)
 * odds for each outcome in the specified market.
 *
 * Returns an array of { name, price, point, bookmakerTitle } objects.
 */
function getBestOddsForMarket(bookmakers, marketKey) {
  const best = {};

  for (const bm of bookmakers) {
    const market = bm.markets?.find(m => m.key === marketKey);
    if (!market) continue;
    for (const outcome of market.outcomes) {
      const prev = best[outcome.name];
      const isBetter = !prev || outcome.price > prev.price;
      if (isBetter) {
        best[outcome.name] = {
          name: outcome.name,
          price: outcome.price,
          point: outcome.point,
          bookmakerTitle: bm.title || bm.key,
        };
      }
    }
  }

  return Object.values(best);
}

export default function BestOddsPage({ onBack }) {
  const today    = isoDate(0);

  const [sport,    setSport]    = useState(SPORTS[0].key);
  const [date,     setDate]     = useState(today);
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setSearched(true);

    // Route the request through the backend proxy so the API key is never
    // sent to the browser.  Use "date" mode with a midnight→midnight window.
    const from = `${date}T00:00:00Z`;
    const to   = `${date}T23:59:59Z`;
    const params = new URLSearchParams({ sport, mode: 'date', from, to });

    try {
      const res  = await fetch(`${PROXY_BASE}?${params}`);
      const data = await res.json();
      if (!res.ok) {
        const msg = (data && data.error) || `API error ${res.status}`;
        throw new Error(msg);
      }
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>

      {/* ── Page header ── */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-dm mb-8 transition-colors duration-200"
          style={{ color: '#8888a0' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8888a0')}
        >
          ← Back to SharpEdge
        </button>

        <h1
          className="text-4xl md:text-5xl font-bebas tracking-wider mb-3"
          style={{ color: '#e8e8f0' }}
        >
          Best Available <span style={{ color: '#d4a843' }}>Odds</span>
        </h1>
        <p className="font-dm mb-10" style={{ color: '#8888a0' }}>
          Compare moneyline, spread &amp; O/U odds across all sportsbooks for any upcoming event.
          We highlight the best payout for each team.
        </p>

        {/* ── Search controls ── */}
        <div
          className="flex flex-wrap gap-4 items-end p-5 rounded-xl mb-10"
          style={{ background: '#111118', border: '1px solid #2a2a3a' }}
        >
          {/* Sport selector */}
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs font-dm font-semibold uppercase tracking-widest" style={{ color: '#8888a0' }}>
              Sport
            </label>
            <select
              value={sport}
              onChange={e => setSport(e.target.value)}
              className="rounded-lg px-3 py-2 font-dm text-sm"
              style={{
                background: '#1c1c28',
                border: '1px solid #2a2a3a',
                color: '#e8e8f0',
                outline: 'none',
              }}
            >
              {SPORTS.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Date picker */}
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-xs font-dm font-semibold uppercase tracking-widest" style={{ color: '#8888a0' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              className="rounded-lg px-3 py-2 font-dm text-sm"
              style={{
                background: '#1c1c28',
                border: '1px solid #2a2a3a',
                color: '#e8e8f0',
                outline: 'none',
                colorScheme: 'dark',
              }}
            />
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 rounded-lg font-dm font-semibold text-sm transition-all duration-200"
            style={{
              background: loading ? '#2a2a3a' : '#d4a843',
              color: loading ? '#8888a0' : '#0a0a0f',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => {
              if (!loading) e.currentTarget.style.background = '#f0c060';
            }}
            onMouseLeave={e => {
              if (!loading) e.currentTarget.style.background = '#d4a843';
            }}
          >
            {loading ? 'Searching…' : '🔍 Search Odds'}
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-5xl mx-auto px-6 pb-16">

        {/* Error */}
        {error && (
          <div
            className="text-center py-10 rounded-xl mb-8 font-dm"
            style={{ color: '#f87171', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}
          >
            <div className="text-2xl mb-2">⚠️</div>
            <p className="font-semibold">Failed to load odds</p>
            <p className="text-sm mt-1" style={{ color: '#8888a0' }}>{error}</p>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="flex items-center justify-center py-16 font-dm" style={{ color: '#8888a0' }}>
            <span
              className="w-4 h-4 rounded-full animate-pulse mr-3"
              style={{ background: '#d4a843', display: 'inline-block' }}
            />
            Fetching best odds…
          </div>
        )}

        {/* No results */}
        {!loading && searched && !error && events.length === 0 && (
          <div className="text-center py-16 font-dm" style={{ color: '#8888a0' }}>
            No events found for the selected sport and date. Try a different date or sport.
          </div>
        )}

        {/* Event cards */}
        {!loading && events.length > 0 && (
          <div className="flex flex-col gap-6">
            {events.map(event => {
              const bestH2H    = getBestOddsForMarket(event.bookmakers || [], 'h2h');
              const bestSpread = getBestOddsForMarket(event.bookmakers || [], 'spreads');
              const bestTotals = getBestOddsForMarket(event.bookmakers || [], 'totals');

              return (
                <div
                  key={event.id}
                  className="rounded-xl p-5"
                  style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}
                >
                  {/* Event header */}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
                    <div>
                      <div
                        className="text-xs font-bold uppercase tracking-widest mb-1 font-dm"
                        style={{ color: '#d4a843' }}
                      >
                        {event.sport_title}
                      </div>
                      <div className="text-xl font-bebas tracking-wider" style={{ color: '#e8e8f0' }}>
                        {event.away_team} <span style={{ color: '#8888a0' }}>@</span> {event.home_team}
                      </div>
                      <div className="text-xs font-dm mt-1" style={{ color: '#8888a0' }}>
                        🕐 {fmtTime(event.commence_time)}
                      </div>
                    </div>
                    <div
                      className="text-xs font-dm px-2 py-1 rounded font-semibold"
                      style={{
                        background: 'rgba(34,197,94,0.1)',
                        color: '#22c55e',
                        border: '1px solid rgba(34,197,94,0.3)',
                      }}
                    >
                      {(event.bookmakers || []).length} books
                    </div>
                  </div>

                  {/* Best h2h moneyline */}
                  {bestH2H.length > 0 && (
                    <div className="mb-4">
                      <p
                        className="text-xs font-dm font-semibold uppercase tracking-widest mb-3"
                        style={{ color: '#8888a0' }}
                      >
                        🏆 Best Moneyline (h2h)
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {bestH2H.map(o => (
                          <div
                            key={o.name}
                            className="flex-1 min-w-48 rounded-lg px-4 py-3"
                            style={{ background: '#111118', border: '1px solid #2a2a3a' }}
                          >
                            <div className="font-dm text-sm font-semibold mb-1" style={{ color: '#e8e8f0' }}>
                              {o.name}
                            </div>
                            <div
                              className="text-2xl font-bebas tracking-wide"
                              style={{ color: o.price > 0 ? '#22c55e' : '#f87171' }}
                            >
                              {fmtOdds(o.price)}
                            </div>
                            <div className="text-xs font-dm mt-1" style={{ color: '#8888a0' }}>
                              via {o.bookmakerTitle}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Best Spread */}
                  {bestSpread.length > 0 && (
                    <div className="mb-4">
                      <p
                        className="text-xs font-dm font-semibold uppercase tracking-widest mb-3"
                        style={{ color: '#8888a0' }}
                      >
                        📈 Best Spread
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {bestSpread.map(o => {
                          const ptLabel = o.point !== undefined && o.point !== null
                            ? ` (${o.point > 0 ? '+' : ''}${o.point})`
                            : '';
                          return (
                            <div
                              key={o.name}
                              className="flex-1 min-w-48 rounded-lg px-4 py-3"
                              style={{ background: '#111118', border: '1px solid #2a2a3a' }}
                            >
                              <div className="font-dm text-sm font-semibold mb-1" style={{ color: '#e8e8f0' }}>
                                {o.name}{ptLabel}
                              </div>
                              <div
                                className="text-2xl font-bebas tracking-wide"
                                style={{ color: o.price > 0 ? '#22c55e' : '#f87171' }}
                              >
                                {fmtOdds(o.price)}
                              </div>
                              <div className="text-xs font-dm mt-1" style={{ color: '#8888a0' }}>
                                via {o.bookmakerTitle}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Best O/U (Totals) */}
                  {bestTotals.length > 0 && (
                    <div className="mb-4">
                      <p
                        className="text-xs font-dm font-semibold uppercase tracking-widest mb-3"
                        style={{ color: '#8888a0' }}
                      >
                        ⚖️ Best O/U (Totals)
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {bestTotals.map(o => {
                          const ptLabel = o.point !== undefined && o.point !== null
                            ? ` ${o.point}`
                            : '';
                          return (
                            <div
                              key={o.name}
                              className="flex-1 min-w-48 rounded-lg px-4 py-3"
                              style={{ background: '#111118', border: '1px solid #2a2a3a' }}
                            >
                              <div className="font-dm text-sm font-semibold mb-1" style={{ color: '#e8e8f0' }}>
                                {o.name}{ptLabel}
                              </div>
                              <div
                                className="text-2xl font-bebas tracking-wide"
                                style={{ color: o.price > 0 ? '#22c55e' : '#f87171' }}
                              >
                                {fmtOdds(o.price)}
                              </div>
                              <div className="text-xs font-dm mt-1" style={{ color: '#8888a0' }}>
                                via {o.bookmakerTitle}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {bestH2H.length === 0 && bestSpread.length === 0 && bestTotals.length === 0 && (
                    <p className="text-xs font-dm" style={{ color: '#8888a0' }}>
                      No odds available yet for this event.
                    </p>
                  )}

                  {/* All bookmaker odds (collapsible reference) — collapsed by default */}
                  {(event.bookmakers || []).length > 0 && (
                    <details className="mt-4">
                      <summary
                        className="text-xs font-dm font-semibold cursor-pointer select-none"
                        style={{ color: '#F97316' }}
                      >
                        View all {event.bookmakers.length} bookmaker(s) ▾
                      </summary>
                      <div className="mt-3 flex flex-col gap-2">
                        {event.bookmakers
                          .filter(bm => bm.markets?.some(m => m.key === 'h2h'))
                          .map(bm => {
                            const h2h = bm.markets.find(m => m.key === 'h2h');
                            return (
                              <div
                                key={bm.key}
                                className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a3a' }}
                              >
                                <span
                                  className="text-xs font-dm font-semibold w-28 shrink-0"
                                  style={{ color: '#d4a843' }}
                                >
                                  {bm.title}
                                </span>
                                {h2h.outcomes.map(o => (
                                  <span
                                    key={o.name}
                                    className="text-xs font-dm"
                                    style={{ color: '#e8e8f0' }}
                                  >
                                    {o.name}: <span style={{ color: o.price > 0 ? '#22c55e' : '#f87171' }}>{fmtOdds(o.price)}</span>
                                  </span>
                                ))}
                              </div>
                            );
                          })}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
