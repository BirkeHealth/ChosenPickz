/* global AuthManager */
'use strict';

const AdminPanel = (() => {
  // ── State ──────────────────────────────────────────────────────────────────
  let _session = null;
  let _allUsers = [];
  let _allPosts = [];
  let _allPicks = [];
  let _editingPickId = null;

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
    document.getElementById('view-users').style.display = name === 'users' ? 'block' : 'none';
    document.getElementById('view-posts').style.display = name === 'posts' ? 'block' : 'none';
    document.getElementById('view-picks').style.display = name === 'picks' ? 'block' : 'none';
    const titles = { users: 'Users', posts: 'Posts', picks: 'Picks' };
    document.getElementById('page-title').textContent = titles[name] || name;
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

  // ── Picks ──────────────────────────────────────────────────────────────────

  async function loadPicks() {
    const status = document.getElementById('pick-filter-status')?.value || '';
    const url = '/api/admin/picks' + (status ? `?status=${encodeURIComponent(status)}` : '');
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load picks.');
      _allPicks = data;
      renderPicks(_allPicks);
    } catch (err) {
      showError('picks-error', err.message);
    }
  }

  function pickStatusBadge(status) {
    const cls = {
      Win: 'badge-win', Loss: 'badge-loss',
      Pending: 'badge-pending', Push: 'badge-push', Void: 'badge-void'
    }[status] || 'badge-pending';
    return `<span class="badge ${cls}">${status || 'Pending'}</span>`;
  }

  function renderPicks(picks) {
    const tbody = document.getElementById('picks-tbody');
    if (!picks.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:2rem;">No picks found.</td></tr>';
      return;
    }
    tbody.innerHTML = picks.map(p => `
      <tr data-pick-id="${p.id}">
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
            title="${escHtml(p.matchup || '')}">${escHtml(p.matchup || '—')}</td>
        <td style="color:var(--text-muted);font-size:0.825rem;">${escHtml(p.sport || '—')}</td>
        <td style="color:var(--text-muted);font-size:0.825rem;">${escHtml(p.pickType || '—')}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
            title="${escHtml(p.pickDetails || '')}">${escHtml(p.pickDetails || '—')}</td>
        <td style="font-size:0.825rem;white-space:nowrap;">${escHtml(p.odds || '—')}</td>
        <td style="font-size:0.825rem;">${p.units != null ? escHtml(String(p.units)) : '—'}</td>
        <td>${pickStatusBadge(p.status)}</td>
        <td style="color:var(--text-muted);font-size:0.8rem;white-space:nowrap;">${escHtml(p.date || '—')}</td>
        <td style="color:var(--text-muted);font-size:0.825rem;">${escHtml(p.handicapperName || '—')}</td>
        <td style="white-space:nowrap;">
          <select class="action-btn" style="cursor:pointer;" onchange="AdminPanel.changePickStatus('${p.id}', this.value, this)">
            <option value="Pending" ${p.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Win"     ${p.status === 'Win'     ? 'selected' : ''}>Win</option>
            <option value="Loss"    ${p.status === 'Loss'    ? 'selected' : ''}>Loss</option>
            <option value="Push"    ${p.status === 'Push'    ? 'selected' : ''}>Push</option>
            <option value="Void"    ${p.status === 'Void'    ? 'selected' : ''}>Void</option>
          </select>
          <button class="action-btn" onclick="AdminPanel.openPickForm('${p.id}')">Edit</button>
          <button class="action-btn btn-danger-sm" onclick="AdminPanel.deletePick('${p.id}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  async function changePickStatus(pickId, newStatus) {
    try {
      const res = await fetch(`/api/admin/picks/${encodeURIComponent(pickId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pick status.');
      const pick = _allPicks.find(p => p.id === pickId);
      if (pick) pick.status = newStatus;
      showToast(`Pick status set to ${newStatus}.`);
      renderPicks(filterPicks());
    } catch (err) {
      showToast(err.message, 'error');
      renderPicks(filterPicks());
    }
  }

  async function deletePick(pickId) {
    const pick = _allPicks.find(p => p.id === pickId);
    const label = pick ? (pick.matchup || pick.pickDetails || 'this pick') : 'this pick';
    const ok = await confirm('Delete Pick', `Permanently delete "${label}"? This cannot be undone.`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/picks/${encodeURIComponent(pickId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete pick.');
      _allPicks = _allPicks.filter(p => p.id !== pickId);
      showToast('Pick deleted.');
      renderPicks(filterPicks());
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function filterPicks() {
    const q = (document.getElementById('pick-search')?.value || '').toLowerCase();
    if (!q) return _allPicks;
    return _allPicks.filter(p =>
      (p.matchup || '').toLowerCase().includes(q) ||
      (p.pickDetails || '').toLowerCase().includes(q) ||
      (p.sport || '').toLowerCase().includes(q) ||
      (p.handicapperName || '').toLowerCase().includes(q)
    );
  }

  function openPickForm(pickId) {
    _editingPickId = pickId || null;
    const modal = document.getElementById('pick-modal');
    const title = document.getElementById('pick-modal-title');
    const form  = document.getElementById('pick-form');
    const err   = document.getElementById('pick-form-error');

    form.reset();
    err.classList.add('hidden');

    if (pickId) {
      title.textContent = 'Edit Pick';
      const pick = _allPicks.find(p => p.id === pickId);
      if (pick) {
        document.getElementById('pf-sport').value         = pick.sport || '';
        document.getElementById('pf-pick-type').value     = pick.pickType || '';
        document.getElementById('pf-matchup').value       = pick.matchup || '';
        document.getElementById('pf-pick-details').value  = pick.pickDetails || '';
        document.getElementById('pf-odds').value          = pick.odds || '';
        document.getElementById('pf-units').value         = pick.units != null ? pick.units : '';
        document.getElementById('pf-confidence').value    = pick.confidence || '';
        document.getElementById('pf-status').value        = pick.status || 'Pending';
        document.getElementById('pf-date').value          = pick.date || '';
        document.getElementById('pf-handicapper').value   = pick.handicapperName || '';
        document.getElementById('pf-note').value          = pick.note || '';
      }
    } else {
      title.textContent = 'Add Pick';
      document.getElementById('pf-date').value = new Date().toISOString().slice(0, 10);
    }

    modal.classList.add('show');
  }

  async function savePickForm(e) {
    e.preventDefault();
    const err = document.getElementById('pick-form-error');
    err.classList.add('hidden');

    const matchup = document.getElementById('pf-matchup').value.trim();
    const pickDetails = document.getElementById('pf-pick-details').value.trim();
    if (!matchup || !pickDetails) {
      err.textContent = 'Matchup and Pick Details are required.';
      err.classList.remove('hidden');
      return;
    }

    const payload = {
      sport:          document.getElementById('pf-sport').value,
      pickType:       document.getElementById('pf-pick-type').value,
      matchup,
      pickDetails,
      odds:           document.getElementById('pf-odds').value.trim(),
      units:          parseFloat(document.getElementById('pf-units').value) || 1,
      confidence:     parseInt(document.getElementById('pf-confidence').value) || 3,
      status:         document.getElementById('pf-status').value,
      date:           document.getElementById('pf-date').value,
      handicapperName: document.getElementById('pf-handicapper').value.trim(),
      note:           document.getElementById('pf-note').value.trim(),
    };

    const submitBtn = document.getElementById('pick-modal-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      let res, data;
      if (_editingPickId) {
        res  = await fetch(`/api/admin/picks/${encodeURIComponent(_editingPickId)}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update pick.');
        const idx = _allPicks.findIndex(p => p.id === _editingPickId);
        if (idx !== -1) _allPicks[idx] = data;
        showToast('Pick updated.');
      } else {
        res  = await fetch('/api/admin/picks', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create pick.');
        _allPicks.unshift(data);
        showToast('Pick created.');
      }
      document.getElementById('pick-modal').classList.remove('show');
      renderPicks(filterPicks());
    } catch (e) {
      err.textContent = e.message;
      err.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Pick';
    }
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
        else if (view === 'picks') loadPicks();
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

    // Pick search and filter
    document.getElementById('pick-search')?.addEventListener('input', () => renderPicks(filterPicks()));
    document.getElementById('pick-filter-status')?.addEventListener('change', loadPicks);

    // Pick form modal
    document.getElementById('pick-form')?.addEventListener('submit', savePickForm);
    document.getElementById('pick-modal-cancel')?.addEventListener('click', () => {
      document.getElementById('pick-modal').classList.remove('show');
    });

    // Load initial view
    showView('users');
    loadUsers();
  }

  return { init, changeUserRole, toggleUserDisabled, changePostStatus, deletePost, openPickForm, changePickStatus, deletePick };
})();
