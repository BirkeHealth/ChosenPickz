const AuthManager = (() => {
  // Cached session (populated on first call to getSession / init)
  let _session = null;
  let _sessionFetched = false;

  /**
   * Fetch the current user from the server.
   * Returns the session object or null if not authenticated.
   */
  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  }

  /**
   * Log in using the server-side API.
   * Returns { success, session?, message? }.
   */
  async function login(identifier, password, remember = false) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ identifier, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Login failed.' };
      }
      _session = data.user;
      _sessionFetched = true;
      return { success: true, session: data.user };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  }

  /**
   * Log out by calling the server-side API, then redirect to login page.
   */
  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      // Proceed with redirect even if the server call fails
    }
    _session = null;
    _sessionFetched = false;
    window.location.href = 'login.html';
  }

  /**
   * Return the cached session, or null if not authenticated.
   * NOTE: This returns the cached value synchronously.
   * Use initSession() / requireAuth() on page load to prime the cache.
   */
  function getSession() {
    return _session;
  }

  /** Returns true if the cached session is set. */
  function isLoggedIn() {
    return Boolean(_session);
  }

  /**
   * Initialise the session by calling /api/auth/me.
   * Must be awaited on page load before using getSession().
   * Returns the session or null.
   */
  async function initSession() {
    if (_sessionFetched) return _session;
    _session = await fetchMe();
    _sessionFetched = true;
    return _session;
  }

  /**
   * Ensure the user is authenticated; redirect to login if not.
   * Always await this at the top of any protected page's DOMContentLoaded.
   * Returns the session object on success.
   */
  async function requireAuth() {
    const session = await initSession();
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  }

  return { login, logout, getSession, isLoggedIn, initSession, requireAuth };
})();

