const AuthManager = (() => {
  const USERS_KEY = 'cpz_users';
  const SESSION_KEY = 'cpz_session';

  const defaultUsers = [
    {
      id: 1,
      username: 'admin',
      email: 'admin@chosenpickz.com',
      password: 'Picks2024!',
      name: 'Pro Handicapper',
      role: 'admin'
    }
  ];

  function init() {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    }
  }

  function login(identifier, password, remember = false) {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u =>
      (u.username.toLowerCase() === identifier.toLowerCase() ||
       u.email.toLowerCase() === identifier.toLowerCase()) &&
      u.password === password
    );

    if (!user) {
      return { success: false, message: 'Invalid username or password. Please try again.' };
    }

    const session = {
      userId: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      loginTime: Date.now()
    };

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, session };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  init();
  return { login, logout, getSession, isLoggedIn, requireAuth };
})();
