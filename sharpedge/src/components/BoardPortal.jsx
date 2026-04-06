import { useState, useEffect } from 'react';
import { mockPicks, mockPicksHistory, sportColors } from '../data/mockPicks';
import AccountProfile from './AccountProfile';
import ChangePassword from './ChangePassword';

// ── Sub-components ──────────────────────────────────────────────────────────

function ConfidenceMeter({ level }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: i <= level ? '#d4a843' : '#2a2a3a' }}
        />
      ))}
    </div>
  );
}

function LeagueBadge({ sport }) {
  const colors = sportColors[sport] || sportColors.default;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded font-dm"
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
    >
      {sport}
    </span>
  );
}

// Active pick card — all picks are unlocked for authenticated members
function ActivePickCard({ pick }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}
    >
      <div className="flex items-center justify-between">
        <LeagueBadge sport={pick.sport} />
        <span className="text-xs font-dm" style={{ color: '#8888a0' }}>
          {pick.gameTime}
        </span>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bebas tracking-wider" style={{ color: '#e8e8f0' }}>
          {pick.awayTeam.abbr} <span style={{ color: '#8888a0' }}>@</span> {pick.homeTeam.abbr}
        </div>
        <div className="text-xs font-dm mt-0.5" style={{ color: '#8888a0' }}>
          {pick.awayTeam.name} @ {pick.homeTeam.name}
        </div>
      </div>

      <div className="flex items-end justify-between mt-auto">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-dm uppercase tracking-wide" style={{ color: '#8888a0' }}>
              {pick.betType}
            </span>
            {/* All picks are fully visible for logged-in members */}
            <span className="text-sm font-bebas tracking-wide" style={{ color: '#d4a843' }}>
              {pick.pickValue}
            </span>
          </div>
          <ConfidenceMeter level={pick.confidence} />
        </div>

        <span
          className="text-xs font-bold px-2 py-1 rounded font-dm"
          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          ACTIVE
        </span>
      </div>
    </div>
  );
}

// History row card
function HistoryCard({ pick }) {
  const resultColors = {
    WIN:  { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.3)' },
    LOSS: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)' },
    PUSH: { color: '#8888a0', bg: 'rgba(136,136,160,0.1)', border: 'rgba(136,136,160,0.3)' },
  };
  const rc = resultColors[pick.result] || resultColors.PUSH;

  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}
    >
      {/* Date + sport */}
      <div className="flex items-center gap-3 sm:w-36 shrink-0">
        <span className="text-xs font-dm" style={{ color: '#8888a0' }}>
          {pick.date}
        </span>
        <LeagueBadge sport={pick.sport} />
      </div>

      {/* Matchup + pick */}
      <div className="flex-1">
        <div className="text-sm font-bebas tracking-wider" style={{ color: '#e8e8f0' }}>
          {pick.awayTeam.abbr} @ {pick.homeTeam.abbr}
        </div>
        <div className="text-xs font-dm mt-0.5" style={{ color: '#8888a0' }}>
          {pick.betType} — <span style={{ color: '#d4a843' }}>{pick.pickValue}</span>
        </div>
      </div>

      {/* Confidence + result */}
      <div className="flex items-center gap-4">
        <ConfidenceMeter level={pick.confidence} />
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-1 rounded font-dm"
            style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}
          >
            {pick.result}
          </span>
          <span
            className="text-xs font-dm font-semibold"
            style={{ color: pick.result === 'WIN' ? '#22c55e' : pick.result === 'LOSS' ? '#ef4444' : '#8888a0' }}
          >
            {pick.result === 'WIN' ? `+${pick.profit}` : pick.profit}u
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Board Portal ────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'active-picks',   icon: '📋', label: 'Active Picks' },
  { id: 'picks-history',  icon: '📜', label: 'Picks History' },
  { id: 'account-profile', icon: '👤', label: 'Account Profile' },
];

export default function BoardPortal({ session, onLogout }) {
  const [view, setView] = useState('active-picks');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Determine if we're on a wide enough screen to show the sidebar statically.
  // We use JS-based detection instead of Tailwind breakpoints to ensure reliability.
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navigateTo = id => {
    setView(id);
    setSidebarOpen(false);
  };

  const sidebarVisible = isDesktop || sidebarOpen;

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-5 py-4"
        style={{ background: '#111118', borderBottom: '1px solid #2a2a3a' }}
      >
        {/* Hamburger (mobile only) + Logo */}
        <div className="flex items-center gap-3">
          {!isDesktop && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{ color: '#8888a0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '4px' }}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          )}
          <span className="text-2xl font-bebas tracking-widest" style={{ color: '#d4a843' }}>
            SharpEdge
          </span>
          <span
            className="text-xs font-dm px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(212,168,67,0.1)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)' }}
          >
            Board Portal
          </span>
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-dm" style={{ color: '#8888a0' }}>
            {session?.name || session?.email || 'Member'}
          </span>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg text-sm font-dm font-semibold transition-all duration-200"
            style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>

        {/* Mobile overlay backdrop */}
        {!isDesktop && sidebarOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 30,
              background: 'rgba(0,0,0,0.6)',
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        {sidebarVisible && (
          <aside
            style={{
              width: '220px',
              flexShrink: 0,
              background: '#111118',
              borderRight: '1px solid #2a2a3a',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.5rem 0.75rem',
              // On mobile, draw as fixed overlay above content
              ...(isDesktop ? {} : {
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                zIndex: 40,
                paddingTop: '4.5rem',
              }),
            }}
          >
            <p className="text-xs font-dm font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: '#555570' }}>
              Navigation
            </p>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-dm font-medium transition-all duration-150"
                  style={
                    view === item.id
                      ? { background: 'rgba(212,168,67,0.1)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.25)', cursor: 'pointer', textAlign: 'left' }
                      : { background: 'transparent', color: '#8888a0', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left' }
                  }
                  onMouseEnter={e => { if (view !== item.id) e.currentTarget.style.color = '#e8e8f0'; }}
                  onMouseLeave={e => { if (view !== item.id) e.currentTarget.style.color = '#8888a0'; }}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: 'auto' }}>

          {/* Active Picks */}
          {view === 'active-picks' && (
            <div className="px-6 py-8 max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-3xl font-bebas tracking-wider" style={{ color: '#e8e8f0' }}>
                  Active <span style={{ color: '#d4a843' }}>Picks</span>
                </h2>
                <span
                  className="flex items-center gap-1.5 text-xs font-dm px-3 py-1 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
                  Live
                </span>
              </div>
              <p className="text-sm font-dm mb-8" style={{ color: '#8888a0' }}>
                Your current active picks — all picks are unlocked for members.
              </p>

              {mockPicks.length === 0 ? (
                <div className="text-center py-16 font-dm" style={{ color: '#8888a0' }}>
                  No active picks right now. Check back soon!
                </div>
              ) : (
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                >
                  {mockPicks.map(pick => (
                    <ActivePickCard key={pick.id} pick={pick} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Picks History */}
          {view === 'picks-history' && (
            <div className="px-6 py-8 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bebas tracking-wider mb-2" style={{ color: '#e8e8f0' }}>
                Picks <span style={{ color: '#d4a843' }}>History</span>
              </h2>
              <p className="text-sm font-dm mb-8" style={{ color: '#8888a0' }}>
                {/* TODO: Replace with real historical data from the backend */}
                A record of all past picks and their outcomes.
              </p>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total Picks', value: mockPicksHistory.length },
                  { label: 'Wins', value: mockPicksHistory.filter(p => p.result === 'WIN').length },
                  {
                    label: 'Win Rate',
                    value: (() => {
                      const decided = mockPicksHistory.filter(p => p.result !== 'PUSH').length;
                      if (decided === 0) return 'N/A';
                      return `${Math.round((mockPicksHistory.filter(p => p.result === 'WIN').length / decided) * 100)}%`;
                    })(),
                  },
                ].map(s => (
                  <div
                    key={s.label}
                    className="rounded-xl p-4 text-center"
                    style={{ background: '#111118', border: '1px solid #2a2a3a' }}
                  >
                    <div className="text-2xl font-bebas" style={{ color: '#d4a843' }}>{s.value}</div>
                    <div className="text-xs font-dm mt-1" style={{ color: '#8888a0' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {mockPicksHistory.map(pick => (
                  <HistoryCard key={pick.id} pick={pick} />
                ))}
              </div>
            </div>
          )}

          {/* Account Profile */}
          {view === 'account-profile' && (
            <AccountProfile
              session={session}
              onChangePassword={() => setView('change-password')}
            />
          )}

          {/* Change Password */}
          {view === 'change-password' && (
            <ChangePassword
              session={session}
              onBack={() => setView('account-profile')}
            />
          )}

        </main>
      </div>
    </div>
  );
}
