import { useState } from 'react';
import { SESSION_KEY, USERS_KEY, hashPassword } from '../utils/auth';

const ADMIN_EMAIL = 'admin@birkehealth.net';

export default function LoginPage({ onLoginSuccess, onBack }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const hash = await hashPassword(password);

      // TODO: Replace localStorage auth with a real server-side login call, e.g.:
      //   const res = await fetch('/api/auth/login', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ email, password }),
      //   });
      //   if (!res.ok) throw new Error('Invalid credentials');
      //   const session = await res.json();

      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const user  = users.find(u => u.email === email && u.passwordHash === hash);

      if (!user) {
        // Demo fallback: allow any login so the portals can be explored
        // Admin email gets admin role; otherwise defaults to sports_bettor.
        // TODO: Remove this fallback once real auth is wired up.
        const demoSession = {
          id:      'demo-1',
          email:   email,
          name:    'Demo User',
          role:    email === ADMIN_EMAIL ? 'admin' : 'sports_bettor',
          isAdmin: email === ADMIN_EMAIL,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(demoSession));
        onLoginSuccess(demoSession);
        return;
      }

      // Build session object (omit password hash); ensure admin email always gets admin role
      const { passwordHash: _h, ...sessionData } = user;
      if (sessionData.email === ADMIN_EMAIL) {
        sessionData.role = 'admin';
        sessionData.isAdmin = true;
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      onLoginSuccess(sessionData);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: '#1c1c28',
    border: '1px solid #2a2a3a',
    borderRadius: '0.5rem',
    color: '#e8e8f0',
    padding: '0.75rem 1rem',
    width: '100%',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.9rem',
    outline: 'none',
  };

  return (
    <div
      style={{
        background: '#0a0a0f',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          background: '#111118',
          border: '1px solid #2a2a3a',
          borderRadius: '1rem',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bebas tracking-widest mb-2" style={{ color: '#d4a843' }}>
            SharpEdge
          </div>
          <h1 className="text-xl font-bebas tracking-wide" style={{ color: '#e8e8f0' }}>
            Member Login
          </h1>
          <p className="text-sm font-dm mt-1" style={{ color: '#8888a0' }}>
            Sign in to access your picks and account.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-dm font-semibold uppercase tracking-wide" style={{ color: '#8888a0' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
              onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-dm font-semibold uppercase tracking-wide" style={{ color: '#8888a0' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
              onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
            />
          </div>

          {error && (
            <p
              className="text-sm font-dm px-3 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-dm font-semibold text-sm transition-all duration-200 mt-2"
            style={{ background: loading ? '#a07830' : '#d4a843', color: '#0a0a0f', cursor: loading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#f0c060'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#d4a843'; }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Back link */}
        <div className="text-center mt-6">
          <button
            onClick={onBack}
            className="text-sm font-dm transition-colors duration-200"
            style={{ color: '#8888a0', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8888a0')}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
