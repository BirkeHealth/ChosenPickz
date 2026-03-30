import { useState, useEffect } from 'react';

// Route through the server-side proxy — API key is never sent to the browser.
// Set ODDS_API_KEY as a server environment variable (see .env.example).
const ODDS_PROXY_URL = '/api/odds?sport=upcoming&mode=upcoming';

// Sportsbooks available for toggling in the preview
const BOOKMAKERS = [
  { key: 'all',        label: 'All Books' },
  { key: 'fanduel',   label: 'FanDuel' },
  { key: 'draftkings', label: 'DraftKings' },
  { key: 'betmgm',    label: 'BetMGM' },
  { key: 'caesars',   label: 'Caesars' },
];

function formatCommenceTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatOdds(price) {
  return price > 0 ? `+${price}` : `${price}`;
}

export default function SportsLinesPreview() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Which bookmaker to show odds from ('all' = first available)
  const [selectedBook, setSelectedBook] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(ODDS_PROXY_URL)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch odds (${res.status})`);
        }
        return res.json();
      })
      .then(data => {
        if (!cancelled) {
          setEvents(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 font-dm" style={{ color: '#8888a0' }}>
        <span
          className="w-4 h-4 rounded-full animate-pulse mr-3"
          style={{ background: '#d4a843', display: 'inline-block' }}
        />
        Loading live lines…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="text-center py-16 font-dm rounded-xl mx-auto max-w-md"
        style={{ color: '#f87171', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}
      >
        <div className="text-2xl mb-2">⚠️</div>
        <p className="font-semibold">Unable to load lines</p>
        <p className="text-sm mt-1" style={{ color: '#8888a0' }}>{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16 font-dm" style={{ color: '#8888a0' }}>
        No upcoming lines found right now. Check back soon.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Sportsbook toggle ── */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Select sportsbook">
        {BOOKMAKERS.map(bm => (
          <button
            key={bm.key}
            onClick={() => setSelectedBook(bm.key)}
            className="px-3 py-1.5 rounded-lg text-sm font-dm font-semibold transition-all duration-200"
            style={
              selectedBook === bm.key
                ? {
                    background: 'rgba(212,168,67,0.15)',
                    color: '#d4a843',
                    border: '1px solid rgba(212,168,67,0.4)',
                  }
                : {
                    background: '#111118',
                    color: '#8888a0',
                    border: '1px solid #2a2a3a',
                  }
            }
          >
            {bm.label}
          </button>
        ))}
      </div>

      {/* ── Event cards ── */}
      {events.map(event => {
        const bookmakers = event.bookmakers || [];

        // Select the requested book; only fall back when showing 'all'
        const bk =
          selectedBook === 'all'
            ? bookmakers.find(b => b.key === 'draftkings') ||
              bookmakers.find(b => b.key === 'fanduel') ||
              bookmakers[0]
            : bookmakers.find(b => b.key === selectedBook);

        const h2hMarket = bk?.markets?.find(m => m.key === 'h2h');

        return (
          <div
            key={event.id}
            className="rounded-xl p-5"
            style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}
          >
            {/* Event header */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-1 font-dm"
                  style={{ color: '#d4a843' }}
                >
                  {event.sport_title}
                </div>
                <div className="text-lg font-bebas tracking-wider" style={{ color: '#e8e8f0' }}>
                  {event.away_team} <span style={{ color: '#8888a0' }}>@</span> {event.home_team}
                </div>
              </div>
              <div className="text-xs font-dm" style={{ color: '#8888a0' }}>
                🕐 {formatCommenceTime(event.commence_time)}
              </div>
            </div>

            {/* Odds from selected bookmaker */}
            {bk && h2hMarket ? (
              <div
                className="rounded-lg px-4 py-3"
                style={{ background: '#111118', border: '1px solid #2a2a3a' }}
              >
                {/* Bookmaker source label */}
                <div
                  className="text-xs font-dm font-semibold uppercase tracking-widest mb-2"
                  style={{ color: '#8888a0' }}
                >
                  📊 {bk.title}
                </div>
                <div className="flex flex-wrap gap-3">
                  {h2hMarket.outcomes.map(outcome => (
                    <div
                      key={outcome.name}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-dm text-sm"
                      style={{
                        background: 'rgba(212,168,67,0.07)',
                        border: '1px solid rgba(212,168,67,0.2)',
                      }}
                    >
                      <span style={{ color: '#e8e8f0' }}>{outcome.name}</span>
                      <span
                        className="font-bold"
                        style={{ color: outcome.price > 0 ? '#22c55e' : '#f87171' }}
                      >
                        {formatOdds(outcome.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs font-dm" style={{ color: '#8888a0' }}>
                No odds available from{' '}
                {selectedBook === 'all' ? 'any bookmaker' : BOOKMAKERS.find(b => b.key === selectedBook)?.label || selectedBook}{' '}
                for this event.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
