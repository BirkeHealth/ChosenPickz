import { useState } from 'react';
import { USERS_KEY, hashPassword } from '../utils/auth';

export default function ChangePassword({ session, onBack }) {
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [status, setStatus]         = useState(null); // { type: 'success'|'error', msg }
  const [loading, setLoading]       = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus(null);

    if (newPw.length < 8) {
      setStatus({ type: 'error', msg: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPw !== confirmPw) {
      setStatus({ type: 'error', msg: 'New passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with a real server-side password change call, e.g.:
      //   const res = await fetch('/api/auth/change-password', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       'Authorization': `Bearer ${session.token}`,
      //     },
      //     body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      //   });
      //   if (!res.ok) throw new Error('Password change failed.');

      // Demo: update the user record in localStorage
      const currentHash = await hashPassword(currentPw);
      const newHash     = await hashPassword(newPw);

      const users  = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      const idx    = users.findIndex(u => u.email === session?.email);

      if (idx !== -1 && users[idx].passwordHash !== currentHash) {
        setStatus({ type: 'error', msg: 'Current password is incorrect.' });
        setLoading(false);
        return;
      }

      if (idx !== -1) {
        users[idx].passwordHash = newHash;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      // For demo users that don't exist in cp_users, we skip the hash check above.

      setStatus({ type: 'success', msg: 'Password updated successfully!' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Something went wrong.' });
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
    <div className="max-w-lg mx-auto px-6 py-10">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-dm mb-6 transition-colors duration-200"
        style={{ color: '#8888a0', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
        onMouseLeave={e => (e.currentTarget.style.color = '#8888a0')}
      >
        ← Back to Account Profile
      </button>

      <h1 className="text-3xl font-bebas tracking-wider mb-2" style={{ color: '#e8e8f0' }}>
        Change <span style={{ color: '#d4a843' }}>Password</span>
      </h1>
      <p className="text-sm font-dm mb-8" style={{ color: '#8888a0' }}>
        Update your login password below.
        {/* TODO: Remove this note once real server-side auth is implemented */}
        <span className="block mt-1" style={{ color: '#555570', fontSize: '0.75rem' }}>
          (Demo: changes are stored in browser localStorage only)
        </span>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-dm font-semibold uppercase tracking-wide" style={{ color: '#8888a0' }}>
            Current Password
          </label>
          <input
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            placeholder="••••••••"
            required
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-dm font-semibold uppercase tracking-wide" style={{ color: '#8888a0' }}>
            New Password
          </label>
          <input
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-dm font-semibold uppercase tracking-wide" style={{ color: '#8888a0' }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            placeholder="••••••••"
            required
            style={inputStyle}
            onFocus={e => (e.currentTarget.style.borderColor = '#d4a843')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
          />
        </div>

        {status && (
          <p
            className="text-sm font-dm px-3 py-2 rounded-lg"
            style={
              status.type === 'success'
                ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }
                : { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }
            }
          >
            {status.msg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-dm font-semibold text-sm transition-all duration-200"
          style={{ background: loading ? '#a07830' : '#d4a843', color: '#0a0a0f', cursor: loading ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#f0c060'; }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#d4a843'; }}
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
