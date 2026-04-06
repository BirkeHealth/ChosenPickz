// Shared auth constants used across login, session management, and password change.
// TODO: Remove these once real server-side authentication replaces the
//       localStorage-based demo auth.
export const SESSION_KEY = 'cp_session';
export const USERS_KEY   = 'cp_users';

/**
 * Hash a password with SHA-256 using the Web Crypto API.
 * NOTE: This is a client-side demo only. Production auth must use a proper
 * server-side hashing strategy (e.g., bcrypt via a POST /api/auth/login call).
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data    = encoder.encode(password);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
