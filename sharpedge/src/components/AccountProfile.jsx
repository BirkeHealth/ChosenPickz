import { useState, useEffect } from 'react';

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function Row({ label, value }) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-4"
      style={{ borderBottom: '1px solid #2a2a3a' }}
    >
      <span className="text-xs font-dm font-semibold uppercase tracking-wide w-36 shrink-0" style={{ color: '#8888a0' }}>
        {label}
      </span>
      <span className="text-sm font-dm" style={{ color: '#e8e8f0' }}>
        {value}
      </span>
    </div>
  );
}

export default function AccountProfile({ session, onChangePassword }) {
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    // TODO: Pass an Authorization header once real server-side auth is implemented.
    //   fetch('/api/users/me', { headers: { Authorization: `Bearer ${session.token}` } })
    fetch('/api/users/me')
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(data => {
        // Merge API data with any available session data so local fields
        // (e.g. name) are used as a fallback if the API still returns mock values.
        // TODO: Remove the session fallback once /api/users/me returns real user data.
        const nameParts = (session?.name || '').trim().split(' ');
        setProfile({
          firstName:   data.firstName   || nameParts[0] || '—',
          lastName:    data.lastName    || nameParts.slice(1).join(' ') || '—',
          email:       data.email       || session?.email || '—',
          createdAt:   data.createdAt   || null,
          accountType: data.accountType || session?.role || '—',
        });
      })
      .catch(err => {
        setFetchError(err.message);
        // Graceful fallback: populate from session data if API call fails
        // TODO: Remove fallback once real API is available
        const nameParts = (session?.name || '').trim().split(' ');
        setProfile({
          firstName:   nameParts[0]              || '—',
          lastName:    nameParts.slice(1).join(' ') || '—',
          email:       session?.email            || '—',
          createdAt:   null,
          accountType: session?.role             || '—',
        });
      })
      .finally(() => setLoading(false));
  }, [session]);

  const accountTypeLabel = type => {
    const map = { member: 'Member', admin: 'Admin', handicapper: 'Handicapper', sports_bettor: 'Sports Bettor' };
    return map[type] || type;
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bebas tracking-wider mb-2" style={{ color: '#e8e8f0' }}>
        Account <span style={{ color: '#d4a843' }}>Profile</span>
      </h1>
      <p className="text-sm font-dm mb-8" style={{ color: '#8888a0' }}>
        Your account information and settings.
      </p>

      {fetchError && (
        <p
          className="text-xs font-dm px-3 py-2 rounded-lg mb-6"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {/* TODO: This warning will disappear once /api/users/me is connected to real user data */}
          Could not load profile from server ({fetchError}). Showing available data.
        </p>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#111118', border: '1px solid #2a2a3a' }}
      >
        {loading ? (
          <div className="py-16 text-center font-dm" style={{ color: '#8888a0' }}>
            Loading profile…
          </div>
        ) : (
          <div className="px-6">
            <Row label="First Name"       value={profile?.firstName} />
            <Row label="Last Name"        value={profile?.lastName} />
            <Row label="Email"            value={profile?.email} />
            <Row label="Account Created"  value={profile?.createdAt ? formatDate(profile.createdAt) : '—'} />
            <Row label="Account Type"     value={accountTypeLabel(profile?.accountType)} />

            {/* Change Password */}
            <div className="py-5">
              <button
                onClick={onChangePassword}
                className="px-5 py-2.5 rounded-lg font-dm font-semibold text-sm transition-all duration-200"
                style={{ background: 'rgba(212,168,67,0.1)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.3)', cursor: 'pointer' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(212,168,67,0.2)';
                  e.currentTarget.style.borderColor = '#d4a843';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(212,168,67,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.3)';
                }}
              >
                🔑 Change Password
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
