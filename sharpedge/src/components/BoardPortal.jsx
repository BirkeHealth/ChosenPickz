import { useState, useEffect } from 'react';
import { mockPicks, mockPicksHistory, sportColors } from '../data/mockPicks';
import AccountProfile from './AccountProfile';
import ChangePassword from './ChangePassword';

const SPORT_TABS = [
  { label: 'All Picks', value: 'ALL' },
  { label: '⚾ MLB',    value: 'MLB' },
  { label: '🏈 College Football', value: 'NCAAF' },
  { label: '🏀 College Basketball (Men)', value: 'NCAAB' },
  { label: '🏀 College Basketball (Women)', value: 'NCAAW' },
  { label: '🏈 NFL',   value: 'NFL' },
  { label: '🏒 NHL',   value: 'NHL' },
  { label: '🏀 NBA',   value: 'NBA' },
];

// ── Sub-components (all layout via inline styles — Tailwind v4 classes unreliable) ──

function ConfidenceMeter({ level }) {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: i <= level ? '#d4a843' : '#2a2a3a',
          }}
        />
      ))}
    </div>
  );
}

function LeagueBadge({ sport }) {
  const colors = sportColors[sport] || sportColors.default;
  return (
    <span
      style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: '4px',
        fontFamily: 'DM Sans, sans-serif',
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {sport}
    </span>
  );
}

// Active pick card — all picks are unlocked for authenticated members.
// Uses inline styles to match the home page PickCard visual exactly.
function ActivePickCard({ pick }) {
  return (
    <div
      style={{
        background: '#1c1c28',
        border: '1px solid #2a2a3a',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '160px',
      }}
    >
      {/* Top row: league badge + game time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <LeagueBadge sport={pick.sport} />
        <span style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', color: '#8888a0' }}>
          {pick.gameTime}
        </span>
      </div>

      {/* Teams */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', color: '#e8e8f0' }}>
          {pick.awayTeam.abbr} <span style={{ color: '#8888a0' }}>@</span> {pick.homeTeam.abbr}
        </div>
        <div style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginTop: '2px', color: '#8888a0' }}>
          {pick.awayTeam.name} @ {pick.homeTeam.name}
        </div>
      </div>

      {/* Bottom row: bet type, pick value, confidence, ACTIVE badge */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8888a0' }}>
              {pick.betType}
            </span>
            {/* All picks visible for logged-in members */}
            <span style={{ fontSize: '0.875rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', color: '#d4a843' }}>
              {pick.pickValue}
            </span>
          </div>
          <ConfidenceMeter level={pick.confidence} />
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '4px',
            fontFamily: 'DM Sans, sans-serif',
            background: 'rgba(34,197,94,0.15)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)',
          }}
        >
          ACTIVE
        </span>
      </div>
    </div>
  );
}

// History row card — also uses inline styles for reliability
function HistoryCard({ pick }) {
  const resultColors = {
    WIN:  { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.3)' },
    LOSS: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)' },
    PUSH: { color: '#8888a0', bg: 'rgba(136,136,160,0.1)', border: 'rgba(136,136,160,0.3)' },
  };
  const rc = resultColors[pick.result] || resultColors.PUSH;

  return (
    <div
      style={{
        background: '#1c1c28',
        border: '1px solid #2a2a3a',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      {/* Date + sport */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '140px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', color: '#8888a0' }}>
          {pick.date}
        </span>
        <LeagueBadge sport={pick.sport} />
      </div>

      {/* Matchup + pick */}
      <div style={{ flex: 1, minWidth: '160px' }}>
        <div style={{ fontSize: '0.875rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', color: '#e8e8f0' }}>
          {pick.awayTeam.abbr} @ {pick.homeTeam.abbr}
        </div>
        <div style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginTop: '2px', color: '#8888a0' }}>
          {pick.betType} — <span style={{ color: '#d4a843' }}>{pick.pickValue}</span>
        </div>
      </div>

      {/* Confidence + result */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <ConfidenceMeter level={pick.confidence} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: '4px',
              fontFamily: 'DM Sans, sans-serif',
              background: rc.bg,
              color: rc.color,
              border: `1px solid ${rc.border}`,
            }}
          >
            {pick.result}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              color: pick.result === 'WIN' ? '#22c55e' : pick.result === 'LOSS' ? '#ef4444' : '#8888a0',
            }}
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
  const [activeTab, setActiveTab] = useState('ALL');
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
            Sports Bettor Portal
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
            <p style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 12px', marginBottom: '12px', color: '#555570' }}>
              Navigation
            </p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '8px',
                    fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                    transition: 'all 0.15s', textAlign: 'left', width: '100%',
                    ...(view === item.id
                      ? { background: 'rgba(212,168,67,0.1)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.25)', cursor: 'pointer' }
                      : { background: 'transparent', color: '#8888a0', border: '1px solid transparent', cursor: 'pointer' }),
                  }}
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
            <div style={{ padding: '32px 24px', maxWidth: '1024px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.875rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', color: '#e8e8f0', margin: 0 }}>
                  Active <span style={{ color: '#d4a843' }}>Picks</span>
                </h2>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif',
                    padding: '4px 12px', borderRadius: '9999px',
                    background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  Live
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', marginBottom: '24px', color: '#8888a0' }}>
                Your current active picks — all picks are unlocked for members.
              </p>

              {/* Sport filter tabs — same as home page */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    padding: '4px',
                    borderRadius: '9999px',
                    background: '#111118',
                    border: '1px solid #2a2a3a',
                  }}
                >
                  {SPORT_TABS.map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        ...(activeTab === tab.value
                          ? { background: '#16161f', color: '#d4a843', border: '1px solid rgba(212,168,67,0.4)' }
                          : { background: 'transparent', color: '#8888a0', border: '1px solid transparent' }),
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const filtered = activeTab === 'ALL' ? mockPicks : mockPicks.filter(p => p.sport === activeTab);
                return filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px 0', fontFamily: 'DM Sans, sans-serif', color: '#8888a0' }}>
                    No picks available for this sport right now.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gap: '16px',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    }}
                  >
                    {filtered.map(pick => (
                      <ActivePickCard key={pick.id} pick={pick} />
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Picks History */}
          {view === 'picks-history' && (
            <div style={{ padding: '32px 24px', maxWidth: '896px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.875rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', color: '#e8e8f0', margin: '0 0 8px' }}>
                Picks <span style={{ color: '#d4a843' }}>History</span>
              </h2>
              <p style={{ fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', marginBottom: '32px', color: '#8888a0' }}>
                {/* TODO: Replace with real historical data from the backend */}
                A record of all past picks and their outcomes.
              </p>

              {/* Summary stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
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
                    style={{
                      background: '#111118',
                      border: '1px solid #2a2a3a',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', fontFamily: 'Bebas Neue, sans-serif', color: '#d4a843' }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginTop: '4px', color: '#8888a0' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
