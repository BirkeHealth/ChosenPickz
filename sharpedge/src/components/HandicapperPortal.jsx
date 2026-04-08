import { useState, useEffect } from 'react';
import AccountProfile from './AccountProfile';
import ChangePassword from './ChangePassword';

const SPORT_OPTIONS = [
  { value: 'MLB',   label: '⚾ MLB' },
  { value: 'NCAAF', label: '🏈 NCAAF' },
  { value: 'NCAAB', label: '🏀 NCAAB (Men)' },
  { value: 'NCAAW', label: '🏀 NCAAW (Women)' },
  { value: 'NFL',   label: '🏈 NFL' },
  { value: 'NHL',   label: '🏒 NHL' },
  { value: 'NBA',   label: '🏀 NBA' },
];

const PICK_TYPE_OPTIONS = ['MoneyLine', 'Spread', 'Over/Under', 'Parlay'];

const NAV_ITEMS = [
  { id: 'submit-pick',     icon: '➕', label: 'Submit Pick' },
  { id: 'my-picks',        icon: '📋', label: 'My Picks' },
  { id: 'account-profile', icon: '👤', label: 'Account Profile' },
];

const STORAGE_KEY = 'hcp_picks';

function loadPicks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePicks(picks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
}

const RESULT_OPTIONS = ['', 'WIN', 'LOSS', 'PUSH'];

export default function HandicapperPortal({ session, onLogout }) {
  const [view, setView] = useState('submit-pick');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [picks, setPicks] = useState(loadPicks);

  // Pick form state
  const [matchup, setMatchup] = useState('');
  const [sport, setSport] = useState('NFL');
  const [pickType, setPickType] = useState('MoneyLine');
  const [pickValue, setPickValue] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [note, setNote] = useState('');
  const [formStatus, setFormStatus] = useState(null);

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

  const handleSubmitPick = e => {
    e.preventDefault();
    if (!matchup.trim() || !pickValue.trim()) {
      setFormStatus({ type: 'error', msg: 'Matchup and pick value are required.' });
      return;
    }
    const newPick = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      matchup: matchup.trim(),
      sport,
      pickType,
      pickValue: pickValue.trim(),
      gameDate,
      note: note.trim(),
      result: '',
      submittedAt: new Date().toISOString(),
    };
    const updated = [newPick, ...picks];
    setPicks(updated);
    savePicks(updated);
    setMatchup('');
    setPickValue('');
    setGameDate('');
    setNote('');
    setFormStatus({ type: 'success', msg: 'Pick submitted successfully!' });
    setTimeout(() => setFormStatus(null), 3000);
  };

  const handleResultChange = (id, result) => {
    const updated = picks.map(p => p.id === id ? { ...p, result } : p);
    setPicks(updated);
    savePicks(updated);
  };

  const handleDeletePick = id => {
    const updated = picks.filter(p => p.id !== id);
    setPicks(updated);
    savePicks(updated);
  };

  const wins  = picks.filter(p => p.result === 'WIN').length;
  const losses = picks.filter(p => p.result === 'LOSS').length;
  const pushes = picks.filter(p => p.result === 'PUSH').length;
  const decided = wins + losses;
  const winRate = decided > 0 ? `${Math.round((wins / decided) * 100)}%` : '—';

  const inputStyle = {
    background: '#1c1c28',
    border: '1px solid #2a2a3a',
    borderRadius: '0.5rem',
    color: '#e8e8f0',
    padding: '0.6rem 0.85rem',
    width: '100%',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.9rem',
    outline: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
  };

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: '#111118', borderBottom: '1px solid #2a2a3a',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!isDesktop && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{ color: '#8888a0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '4px' }}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          )}
          <span style={{ fontSize: '1.5rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.1em', color: '#d4a843' }}>
            SharpEdge
          </span>
          <span style={{
            fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif',
            padding: '2px 8px', borderRadius: '9999px',
            background: 'rgba(212,168,67,0.1)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)',
          }}>
            Handicapper Portal
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="/"
            style={{ fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#8888a0', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8888a0')}
          >
            ← CH0SEN1 PICKZ
          </a>
          <span style={{ fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', color: '#8888a0' }}>
            {session?.name || session?.email || 'Handicapper'}
          </span>
          <button
            onClick={onLogout}
            style={{
              padding: '6px 12px', borderRadius: '8px',
              fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Log Out
          </button>
        </div>
      </nav>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>

        {/* Mobile overlay */}
        {!isDesktop && sidebarOpen && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        {sidebarVisible && (
          <aside style={{
            width: '220px', flexShrink: 0,
            background: '#111118', borderRight: '1px solid #2a2a3a',
            display: 'flex', flexDirection: 'column', padding: '1.5rem 0.75rem',
            ...(isDesktop ? {} : {
              position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40, paddingTop: '4.5rem',
            }),
          }}>
            <p style={{
              fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '0 12px', marginBottom: '12px', color: '#555570',
            }}>
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

          {/* ── Submit Pick ── */}
          {view === 'submit-pick' && (
            <div style={{ padding: '32px 24px', maxWidth: '680px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.875rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', color: '#e8e8f0', margin: '0 0 8px' }}>
                Submit a <span style={{ color: '#d4a843' }}>Pick</span>
              </h2>
              <p style={{ fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', marginBottom: '28px', color: '#8888a0' }}>
                Post your latest pick for the community.
              </p>

              <form onSubmit={handleSubmitPick} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Matchup */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8888a0' }}>
                    Matchup / Teams *
                  </label>
                  <input
                    type="text"
                    value={matchup}
                    onChange={e => setMatchup(e.target.value)}
                    placeholder="e.g. Lakers vs Celtics"
                    required
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                  />
                </div>

                {/* Sport + Pick Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8888a0' }}>
                      Sport
                    </label>
                    <select value={sport} onChange={e => setSport(e.target.value)} style={selectStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                    >
                      {SPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8888a0' }}>
                      Pick Type
                    </label>
                    <select value={pickType} onChange={e => setPickType(e.target.value)} style={selectStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                    >
                      {PICK_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* Pick Value + Game Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8888a0' }}>
                      Pick Details *
                    </label>
                    <input
                      type="text"
                      value={pickValue}
                      onChange={e => setPickValue(e.target.value)}
                      placeholder="e.g. Lakers -5.5 (-110)"
                      required
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8888a0' }}>
                      Game Date
                    </label>
                    <input
                      type="date"
                      value={gameDate}
                      onChange={e => setGameDate(e.target.value)}
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                    />
                  </div>
                </div>

                {/* Note */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8888a0' }}>
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Analysis or extra context…"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
                  />
                </div>

                {formStatus && (
                  <p style={{
                    fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif',
                    padding: '10px 14px', borderRadius: '8px',
                    ...(formStatus.type === 'success'
                      ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }
                      : { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }),
                  }}>
                    {formStatus.msg}
                  </p>
                )}

                <button
                  type="submit"
                  style={{
                    padding: '12px', borderRadius: '8px',
                    fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                    background: '#d4a843', color: '#0a0a0f', border: 'none', cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0c060')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#d4a843')}
                >
                  ➕ Post Pick
                </button>
              </form>
            </div>
          )}

          {/* ── My Picks ── */}
          {view === 'my-picks' && (
            <div style={{ padding: '32px 24px', maxWidth: '896px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.875rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', color: '#e8e8f0', margin: '0 0 8px' }}>
                My <span style={{ color: '#d4a843' }}>Picks</span>
              </h2>
              <p style={{ fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', marginBottom: '24px', color: '#8888a0' }}>
                Your submitted picks and outcomes.
              </p>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
                {[
                  { label: 'Total',    value: picks.length },
                  { label: 'Wins',     value: wins },
                  { label: 'Losses',   value: losses },
                  { label: 'Win Rate', value: winRate },
                ].map(s => (
                  <div key={s.label} style={{
                    background: '#111118', border: '1px solid #2a2a3a', borderRadius: '12px',
                    padding: '16px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', fontFamily: 'Bebas Neue, sans-serif', color: '#d4a843' }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', marginTop: '4px', color: '#8888a0' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {picks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', fontFamily: 'DM Sans, sans-serif', color: '#8888a0' }}>
                  No picks submitted yet. Use the Submit Pick tab to add your first pick.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {picks.map(pick => {
                    const rc = pick.result === 'WIN'
                      ? { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' }
                      : pick.result === 'LOSS'
                      ? { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' }
                      : pick.result === 'PUSH'
                      ? { color: '#8888a0', bg: 'rgba(136,136,160,0.1)', border: 'rgba(136,136,160,0.3)' }
                      : { color: '#8888a0', bg: 'rgba(136,136,160,0.05)', border: 'rgba(136,136,160,0.2)' };

                    return (
                      <div key={pick.id} style={{
                        background: '#1c1c28', border: '1px solid #2a2a3a', borderRadius: '12px',
                        padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
                      }}>
                        {/* Sport badge */}
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                          fontFamily: 'DM Sans, sans-serif', background: 'rgba(212,168,67,0.1)',
                          color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)',
                        }}>
                          {pick.sport}
                        </span>

                        {/* Matchup + pick */}
                        <div style={{ flex: 1, minWidth: '180px' }}>
                          <div style={{ fontSize: '0.9rem', fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em', color: '#e8e8f0' }}>
                            {pick.matchup}
                          </div>
                          <div style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', color: '#8888a0', marginTop: '2px' }}>
                            {pick.pickType} — <span style={{ color: '#d4a843' }}>{pick.pickValue}</span>
                            {pick.gameDate && <span style={{ marginLeft: '8px' }}>· {pick.gameDate}</span>}
                          </div>
                          {pick.note && (
                            <div style={{ fontSize: '0.75rem', fontFamily: 'DM Sans, sans-serif', color: '#555570', marginTop: '2px', fontStyle: 'italic' }}>
                              {pick.note}
                            </div>
                          )}
                        </div>

                        {/* Result selector */}
                        <select
                          value={pick.result}
                          onChange={e => handleResultChange(pick.id, e.target.value)}
                          style={{
                            background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                            borderRadius: '6px', padding: '4px 8px',
                            fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600,
                            cursor: 'pointer', outline: 'none',
                          }}
                        >
                          {RESULT_OPTIONS.map(r => (
                            <option key={r} value={r}>{r || 'Pending'}</option>
                          ))}
                        </select>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeletePick(pick.id)}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: '#555570', fontSize: '1rem', padding: '4px',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#555570')}
                          title="Remove pick"
                          aria-label="Remove pick"
                        >
                          🗑
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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
