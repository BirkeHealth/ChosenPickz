import { useState } from 'react';
import BoardPortal from './BoardPortal';
import HandicapperPortal from './HandicapperPortal';

/**
 * AdminPortal — accessible only to admin@birkehealth.net.
 *
 * Shows a role-switcher toggle so the admin can simulate the
 * Handicapper and Sports Bettor portal views for testing/evaluation.
 */
export default function AdminPortal({ session, onLogout }) {
  // 'sports_bettor' | 'handicapper'
  const [simulatedRole, setSimulatedRole] = useState('sports_bettor');

  // Build a synthetic session that matches the simulated role so the
  // child portals display role-specific labels/features correctly.
  const simulatedSession = {
    ...session,
    role: simulatedRole,
    isAdmin: true,
    _adminEmail: session?.email,
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Admin role-switcher banner ── */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 20px',
          borderRadius: '9999px',
          background: '#1c1c28',
          border: '2px solid rgba(212,168,67,0.5)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '0.8rem',
          color: '#e8e8f0',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Admin badge */}
        <span
          style={{
            padding: '3px 10px',
            borderRadius: '9999px',
            background: 'rgba(212,168,67,0.15)',
            color: '#d4a843',
            border: '1px solid rgba(212,168,67,0.4)',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          ⚙️ Admin View
        </span>

        <span style={{ color: '#555570' }}>Simulating:</span>

        {/* Toggle buttons */}
        <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #2a2a3a' }}>
          <button
            onClick={() => setSimulatedRole('sports_bettor')}
            style={{
              padding: '5px 14px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ...(simulatedRole === 'sports_bettor'
                ? { background: '#d4a843', color: '#0a0a0f' }
                : { background: '#111118', color: '#8888a0' }),
            }}
          >
            🎯 Sports Bettor
          </button>
          <button
            onClick={() => setSimulatedRole('handicapper')}
            style={{
              padding: '5px 14px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: 'none',
              borderLeft: '1px solid #2a2a3a',
              cursor: 'pointer',
              transition: 'all 0.2s',
              ...(simulatedRole === 'handicapper'
                ? { background: '#d4a843', color: '#0a0a0f' }
                : { background: '#111118', color: '#8888a0' }),
            }}
          >
            🏆 Handicapper
          </button>
        </div>
      </div>

      {/* ── Render the simulated portal ── */}
      {simulatedRole === 'handicapper' ? (
        <HandicapperPortal session={simulatedSession} onLogout={onLogout} />
      ) : (
        <BoardPortal session={simulatedSession} onLogout={onLogout} />
      )}
    </div>
  );
}
