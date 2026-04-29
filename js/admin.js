/* global AuthManager */
'use strict';

const AdminPanel = (() => {
  // ── State ──────────────────────────────────────────────────────────────────
  let _session = null;
  let _allUsers = [];
  let _allPosts = [];

  // ── Helpers ────────────────────────────────────────────────────────────────

  let _toastTimer = null;
  function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast toast-${type} show`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function showError(elId, msg) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 6000);
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(Number(ts)).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  function roleBadge(role) {
    const cls = { admin: 'badge-admin', handicapper: 'badge-handicapper', member: 'badge-member' }[role] || 'badge-member';
    return `<span class="badge ${cls}">${role}</span>`;
  }

  function statusBadge(status, type) {
    if (type === 'user') {
      return status
        ? `<span class="badge badge-disabled">Disabled</span>`
        : `<span class="badge badge-active">Active</span>`;
    }
    const cls = { Published: 'badge-published', Draft: 'badge-draft', Archived: 'badge-archived' }[status] || 'badge-draft';
    return `<span class="badge ${cls}">${status || 'Draft'}</span>`;
  }

  // ── Confirm Modal ──────────────────────────────────────────────────────────

  function confirm(title, msg) {
    return new Promise((resolve) => {
      const modal   = document.getElementById('modal');
      const titleEl = document.getElementById('modal-title');
      const msgEl   = document.getElementById('modal-msg');
      const cancel  = document.getElementById('modal-cancel');
      const ok      = document.getElementById('modal-confirm');

      titleEl.textContent = title;
      msgEl.textContent   = msg;
      modal.classList.add('show');

      function done(result) {
        modal.classList.remove('show');
        cancel.removeEventListener('click', onCancel);
        ok.removeEventListener('click', onOk);
        resolve(result);
      }
      function onCancel() { done(false); }
      function onOk()     { done(true); }

      cancel.addEventListener('click', onCancel);
      ok.addEventListener('click', onOk);
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function showView(name) {
    document.getElementById('view-users').style.display = name === 'users' ? '' : 'none';
    document.getElementById('view-posts').style.display = name === 'posts' ? '' : 'none';
    document.getElementById('page-title').textContent = name === 'users' ? 'Users' : 'Posts';
    document.querySelectorAll('.sidebar-nav a[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === name);
    });
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users.');
      _allUsers = data;
      renderUsers(_allUsers);
    } catch (err) {
      showError('users-error', err.message);
    }
  }

  function renderUsers(users) {
    const tbody = document.getElementById('users-tbody');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr data-user-id="${u.id}">
        <td>${escHtml(u.name)}</td>
        <td style="color:var(--text-muted);font-size:0.825rem;">${escHtml(u.email)}</td>
        <td style="color:var(--text-muted);font-size:0.825rem;">@${escHtml(u.username)}</td>
        <td>${roleBadge(u.role)}</td>
        <td>${statusBadge(u.disabled, 'user')}</td>
        <td style="color:var(--text-muted);font-size:0.8rem;white-space:nowrap;">${formatDate(u.createdAt)}</td>
        <td style="white-space:nowrap;">
          ${u.role !== 'admin' ? `
            <select class="action-btn" style="cursor:pointer;" onchange="AdminPanel.changeUserRole('${u.id}', this.value, this)">
              <option value="member"      ${u.role === 'member'      ? 'selected' : ''}>Member</option>
              <option value="handicapper" ${u.role === 'handicapper' ? 'selected' : ''}>Handicapper</option>
              <option value="admin"       ${u.role === 'admin'       ? 'selected' : ''}>Admin</option>
            </select>
            <button class="action-btn ${u.disabled ? 'btn-success-sm' : 'btn-danger-sm'}"
              onclick="AdminPanel.toggleUserDisabled('${u.id}', ${!u.disabled})">
              ${u.disabled ? 'Enable' : 'Disable'}
            </button>
          ` : '<span style="color:var(--text-dim);font-size:0.8rem;">—</span>'}
        </td>
      </tr>
    `).join('');
  }

  async function changeUserRole(userId, newRole, selectEl) {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role.');
      // Update local state
      const user = _allUsers.find(u => u.id === userId);
      if (user) user.role = newRole;
      showToast(`Role updated to ${newRole}.`);
      // Re-render to update badge
      renderUsers(filterUsers());
    } catch (err) {
      showToast(err.message, 'error');
      // Re-render to revert select to current state
      renderUsers(filterUsers());
    }
  }

  async function toggleUserDisabled(userId, disabled) {
    const action = disabled ? 'disable' : 'enable';
    const user = _allUsers.find(u => u.id === userId);
    const name = user ? user.name : 'this user';
    const ok = await confirm(
      disabled ? 'Disable User' : 'Enable User',
      `Are you sure you want to ${action} ${name}?`
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} user.`);
      if (user) user.disabled = disabled;
      showToast(`User ${action}d.`);
      renderUsers(filterUsers());
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function filterUsers() {
    const q = (document.getElementById('user-search')?.value || '').toLowerCase();
    if (!q) return _allUsers;
    return _allUsers.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  }

  // ── Posts ──────────────────────────────────────────────────────────────────

  async function loadPosts() {
    const status = document.getElementById('post-filter-status')?.value || '';
    const url = '/api/admin/posts' + (status ? `?status=${encodeURIComponent(status)}` : '');
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load posts.');
      _allPosts = data;
      renderPosts(_allPosts);
    } catch (err) {
      showError('posts-error', err.message);
    }
  }

  function renderPosts(posts) {
    const tbody = document.getElementById('posts-tbody');
    if (!posts.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No posts found.</td></tr>';
      return;
    }
    tbody.innerHTML = posts.map(p => `
      <tr data-post-id="${p.id}">
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
            title="${escHtml(p.title || '')}">${escHtml(p.title || '(Untitled)')}</td>
        <td style="color:var(--text-muted);font-size:0.825rem;">${escHtml(p.authorName || '—')}</td>
        <td style="color:var(--text-muted);font-size:0.825rem;">${escHtml(p.category || '—')}</td>
        <td>${statusBadge(p.status, 'post')}</td>
        <td style="color:var(--text-muted);font-size:0.8rem;white-space:nowrap;">${formatDate(p.createdAt)}</td>
        <td style="white-space:nowrap;">
          <select class="action-btn" style="cursor:pointer;" onchange="AdminPanel.changePostStatus('${p.id}', this.value, this)">
            <option value="Draft"     ${p.status === 'Draft'     ? 'selected' : ''}>Draft</option>
            <option value="Published" ${p.status === 'Published' ? 'selected' : ''}>Published</option>
            <option value="Archived"  ${p.status === 'Archived'  ? 'selected' : ''}>Archived</option>
          </select>
          <button class="action-btn btn-danger-sm"
            onclick="AdminPanel.deletePost('${p.id}')">
            Delete
          </button>
        </td>
      </tr>
    `).join('');
  }

  async function changePostStatus(postId, newStatus, selectEl) {
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update post status.');
      const post = _allPosts.find(p => p.id === postId);
      if (post) post.status = newStatus;
      showToast(`Post status set to ${newStatus}.`);
      renderPosts(filterPosts());
    } catch (err) {
      showToast(err.message, 'error');
      renderPosts(filterPosts());
    }
  }

  async function deletePost(postId) {
    const post = _allPosts.find(p => p.id === postId);
    const title = post ? (post.title || 'Untitled') : 'this post';
    const ok = await confirm('Delete Post', `Permanently delete "${title}"? This cannot be undone.`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete post.');
      _allPosts = _allPosts.filter(p => p.id !== postId);
      showToast('Post deleted.');
      renderPosts(filterPosts());
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function filterPosts() {
    const q = (document.getElementById('post-search')?.value || '').toLowerCase();
    if (!q) return _allPosts;
    return _allPosts.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.authorName || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  // ── XSS safety ────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init(session) {
    _session = session;

    // Sidebar nav
    document.querySelectorAll('.sidebar-nav a[data-nav]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const view = a.dataset.nav;
        showView(view);
        if (view === 'users') loadUsers();
        else if (view === 'posts') loadPosts();
      });
    });

    // Menu toggle (mobile)
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => AuthManager.logout());

    // User search
    document.getElementById('user-search')?.addEventListener('input', () => renderUsers(filterUsers()));

    // Post search
    document.getElementById('post-search')?.addEventListener('input', () => renderPosts(filterPosts()));

    // Post status filter
    document.getElementById('post-filter-status')?.addEventListener('change', loadPosts);

    // Load initial view
    showView('users');
    loadUsers();
  }

  return { init, changeUserRole, toggleUserDisabled, changePostStatus, deletePost };
})();
