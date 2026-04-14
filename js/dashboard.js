const App = (() => {
  let session = null;
  let quill = null;
  let editingPickId = null;
  let editingPostId = null;
  let currentFilter = 'All';

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const sportIcons = {
    NFL: '🏈', NBA: '🏀', MLB: '⚾', NHL: '🏒',
    NCAAF: '🏈', NCAAB: '🏀', Soccer: '⚽', Tennis: '🎾',
    Golf: '⛳', Boxing: '🥊', MMA: '🥋', Other: '🎯'
  };

  const sportColors = {
    NFL: '#ef4444', NBA: '#f97316', MLB: '#3b82f6', NHL: '#6366f1',
    NCAAF: '#dc2626', NCAAB: '#ea580c', Soccer: '#22c55e', Tennis: '#84cc16',
    Golf: '#14b8a6', Boxing: '#ec4899', MMA: '#a855f7', Other: '#64748b'
  };

  function sportBadge(sport) {
    const color = sportColors[sport] || '#64748b';
    const icon = sportIcons[sport] || '🎯';
    return `<span class="sport-badge" style="background:${color}20;color:${color};border-color:${color}40">${icon} ${sport}</span>`;
  }

  function statusBadge(status) {
    const map = {
      Win: 'badge-win', Loss: 'badge-loss',
      Pending: 'badge-pending', Push: 'badge-push', Void: 'badge-void'
    };
    return `<span class="badge ${map[status] || 'badge-pending'}">${status}</span>`;
  }

  function postStatusBadge(status) {
    return `<span class="badge ${status === 'Published' ? 'badge-win' : 'badge-pending'}">${status}</span>`;
  }

  function stars(n) {
    const filled = '★'.repeat(n);
    const empty = '☆'.repeat(5 - n);
    return `<span class="stars">${filled}</span><span class="stars-empty">${empty}</span>`;
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────

  function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast toast-' + type + ' show';
    setTimeout(() => el.classList.remove('show'), 3200);
  }

  // ─── Confirm Modal ─────────────────────────────────────────────────────────

  function confirm(msg, onYes) {
    document.getElementById('modal-msg').textContent = msg;
    const modal = document.getElementById('modal');
    modal.classList.add('show');
    document.getElementById('modal-confirm').onclick = () => {
      modal.classList.remove('show');
      onYes();
    };
    document.getElementById('modal-cancel').onclick = () => modal.classList.remove('show');
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  function navigate(view, data = {}) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('[data-nav]').forEach(n => n.classList.remove('active'));

    const viewEl = document.getElementById('view-' + view);
    if (viewEl) viewEl.classList.add('active');

    const navEl = document.querySelector(`[data-nav="${view}"]`);
    if (navEl) navEl.classList.add('active');

    // Update page title
    const titles = {
      overview: 'Overview', picks: 'My Picks',
      'pick-form': editingPickId ? 'Edit Pick' : 'New Pick',
      blog: 'Blog Posts',
      'blog-form': editingPostId ? 'Edit Post' : 'New Post',
      'blog-preview': 'Preview Post'
    };
    const h = document.getElementById('page-title');
    if (h) h.textContent = titles[view] || 'Dashboard';

    // Close mobile sidebar
    document.querySelector('.sidebar').classList.remove('open');

    switch (view) {
      case 'overview':     renderOverview(); break;
      case 'picks':        renderPicks(); break;
      case 'pick-form':    renderPickForm(data.id); break;
      case 'blog':         renderBlog(); break;
      case 'blog-form':    renderBlogForm(data.id); break;
      case 'blog-preview': renderBlogPreview(data.id); break;
    }
  }

  // ─── Overview ──────────────────────────────────────────────────────────────

  function renderOverview() {
    const stats = PicksManager.getStats(session.userId);
    const recentPicks = PicksManager.getByUser(session.userId).slice(0, 5);
    const recentPosts = BlogManager.getByUser(session.userId).slice(0, 3);

    const unitsColor = parseFloat(stats.units) >= 0 ? 'var(--green)' : 'var(--red)';

    document.getElementById('view-overview').innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title-inner">Welcome back, ${escHtml(session.name)} 👋</h2>
          <p class="page-sub">Here's a snapshot of your handicapping activity.</p>
        </div>
        <button class="btn btn-primary" onclick="App.newPick()">+ New Pick</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:#3b82f620;color:#3b82f6">📋</div>
          <div class="stat-body">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total Picks</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--green-bg);color:var(--green)">✅</div>
          <div class="stat-body">
            <div class="stat-value" style="color:var(--green)">${stats.wins}</div>
            <div class="stat-label">Wins</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--red-bg);color:var(--red)">❌</div>
          <div class="stat-body">
            <div class="stat-value" style="color:var(--red)">${stats.losses}</div>
            <div class="stat-label">Losses</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--accent-bg);color:var(--accent)">📈</div>
          <div class="stat-body">
            <div class="stat-value" style="color:var(--accent)">${stats.winRate}%</div>
            <div class="stat-label">Win Rate</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#f59e0b20;color:#f59e0b">💰</div>
          <div class="stat-body">
            <div class="stat-value" style="color:${unitsColor}">${parseFloat(stats.units) >= 0 ? '+' : ''}${stats.units}u</div>
            <div class="stat-label">Units P/L</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#a855f720;color:#a855f7">⏳</div>
          <div class="stat-body">
            <div class="stat-value" style="color:#a855f7">${stats.pending}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <div class="card-header">
            <h3>Recent Picks</h3>
            <a href="#" class="link-small" onclick="App.goPicks()">View all</a>
          </div>
          <div class="card-body">
            ${recentPicks.length ? `
              <div class="mini-picks">
                ${recentPicks.map(p => `
                  <div class="mini-pick-row">
                    <div class="mini-pick-left">
                      ${sportBadge(p.sport)}
                      <div>
                        <div class="mini-pick-name">${escHtml(p.pick)}</div>
                        <div class="mini-pick-game">${escHtml(p.game)}</div>
                      </div>
                    </div>
                    <div class="mini-pick-right">
                      ${statusBadge(p.status)}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : '<p class="empty-state">No picks yet. <a href="#" onclick="App.newPick()">Add your first pick</a>.</p>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Recent Posts</h3>
            <a href="#" class="link-small" onclick="App.goBlog()">View all</a>
          </div>
          <div class="card-body">
            ${recentPosts.length ? `
              <div class="mini-posts">
                ${recentPosts.map(p => `
                  <div class="mini-post-row" onclick="App.previewPost('${p.id}')">
                    <div class="mini-post-title">${escHtml(p.title)}</div>
                    <div class="mini-post-meta">${sportBadge(p.category)} ${postStatusBadge(p.status)} <span class="date-dim">${formatDate(p.createdAt)}</span></div>
                  </div>
                `).join('')}
              </div>
            ` : '<p class="empty-state">No posts yet. <a href="#" onclick="App.newPost()">Write your first post</a>.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  // ─── Picks List ────────────────────────────────────────────────────────────

  function renderPicks() {
    const allPicks = PicksManager.getByUser(session.userId);
    const filters = ['All', 'Pending', 'Win', 'Loss', 'Push'];
    const filtered = currentFilter === 'All' ? allPicks : allPicks.filter(p => p.status === currentFilter);

    document.getElementById('view-picks').innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title-inner">My Picks</h2>
          <p class="page-sub">${allPicks.length} total picks</p>
        </div>
        <button class="btn btn-primary" onclick="App.newPick()">+ New Pick</button>
      </div>

      <div class="filter-bar">
        ${filters.map(f => `
          <button class="filter-btn ${currentFilter === f ? 'active' : ''}" onclick="App.setFilter('${f}')">${f}</button>
        `).join('')}
      </div>

      ${filtered.length ? `
        <div class="card">
          <div class="table-wrap">
            <table class="picks-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sport</th>
                  <th>Game</th>
                  <th>Pick</th>
                  <th>Type</th>
                  <th>Odds</th>
                  <th>Units</th>
                  <th>Conf.</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(p => `
                  <tr>
                    <td class="td-date">${p.date || '—'}</td>
                    <td>${sportBadge(p.sport)}</td>
                    <td class="td-game"><span class="game-text">${escHtml(p.game)}</span></td>
                    <td class="td-pick"><strong>${escHtml(p.pick)}</strong></td>
                    <td class="td-type">${escHtml(p.betType)}</td>
                    <td class="td-odds">${escHtml(p.odds)}</td>
                    <td class="td-units">${p.units}u</td>
                    <td class="td-conf">${stars(parseInt(p.confidence) || 1)}</td>
                    <td>${statusBadge(p.status)}</td>
                    <td class="td-actions">
                      <button class="icon-btn" title="Edit" onclick="App.editPick('${p.id}')">✏️</button>
                      <button class="icon-btn icon-btn-danger" title="Delete" onclick="App.deletePick('${p.id}')">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="empty-card">
          <div class="empty-icon">🎯</div>
          <h3>${currentFilter === 'All' ? 'No picks yet' : `No ${currentFilter} picks`}</h3>
          <p>${currentFilter === 'All' ? 'Start tracking your picks to see your performance.' : `You don't have any ${currentFilter} picks.`}</p>
          ${currentFilter === 'All' ? `<button class="btn btn-primary mt-1" onclick="App.newPick()">Add Your First Pick</button>` : ''}
        </div>
      `}
    `;
  }

  // ─── Pick Form ─────────────────────────────────────────────────────────────

  function renderPickForm(pickId = null) {
    editingPickId = pickId || null;
    const pick = pickId ? PicksManager.getById(pickId) : null;
    const v = (field, def = '') => pick ? escHtml(pick[field] || def) : def;

    const sports = ['NFL','NBA','MLB','NHL','NCAAF','NCAAB','Soccer','Tennis','Golf','Boxing','MMA','Other'];
    const betTypes = ['Spread','Moneyline','Over/Under','Parlay','Prop','Futures','Other'];
    const statuses = ['Pending','Win','Loss','Push','Void'];

    document.getElementById('view-pick-form').innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title-inner">${pick ? 'Edit Pick' : 'New Pick'}</h2>
          <p class="page-sub">${pick ? 'Update your pick details.' : 'Log a new pick to track your performance.'}</p>
        </div>
        <button class="btn btn-ghost" onclick="App.goPicks()">← Back to Picks</button>
      </div>

      <div class="card form-card">
        <div class="form-grid">
          <div class="form-group">
            <label>Sport *</label>
            <select id="f-sport">
              ${sports.map(s => `<option ${v('sport') === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Bet Type *</label>
            <select id="f-betType">
              ${betTypes.map(t => `<option ${v('betType') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group span-2">
            <label>Game / Matchup *</label>
            <input type="text" id="f-game" value="${v('game')}" placeholder="e.g., Kansas City Chiefs vs Baltimore Ravens">
          </div>
          <div class="form-group">
            <label>Pick *</label>
            <input type="text" id="f-pick" value="${v('pick')}" placeholder="e.g., Chiefs -3, Over 47.5">
          </div>
          <div class="form-group">
            <label>Odds *</label>
            <input type="text" id="f-odds" value="${v('odds')}" placeholder="e.g., -110, +150">
          </div>
          <div class="form-group">
            <label>Units (0.5 – 5)</label>
            <input type="number" id="f-units" value="${v('units','1')}" min="0.5" max="5" step="0.5">
          </div>
          <div class="form-group">
            <label>Confidence (1 – 5)</label>
            <input type="number" id="f-confidence" value="${v('confidence','3')}" min="1" max="5" step="1">
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="f-status">
              ${statuses.map(s => `<option ${v('status','Pending') === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="date" id="f-date" value="${v('date', new Date().toISOString().split('T')[0])}">
          </div>
          <div class="form-group span-2">
            <label>Analysis / Notes</label>
            <textarea id="f-notes" rows="4" placeholder="Reasoning behind this pick...">${pick ? (pick.notes || '') : ''}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" onclick="App.goPicks()">Cancel</button>
          <button class="btn btn-primary" onclick="App.savePick()">${pick ? 'Update Pick' : 'Save Pick'}</button>
        </div>
      </div>
    `;
  }

  function savePick() {
    const data = {
      sport:      document.getElementById('f-sport').value,
      betType:    document.getElementById('f-betType').value,
      game:       document.getElementById('f-game').value.trim(),
      pick:       document.getElementById('f-pick').value.trim(),
      odds:       document.getElementById('f-odds').value.trim(),
      units:      parseFloat(document.getElementById('f-units').value) || 1,
      confidence: parseInt(document.getElementById('f-confidence').value) || 3,
      status:     document.getElementById('f-status').value,
      date:       document.getElementById('f-date').value,
      notes:      document.getElementById('f-notes').value.trim()
    };

    if (!data.game || !data.pick || !data.odds) {
      toast('Please fill in Game, Pick, and Odds.', 'error'); return;
    }

    if (editingPickId) {
      PicksManager.update(editingPickId, data);
      toast('Pick updated successfully!');
    } else {
      PicksManager.create(session.userId, data);
      toast('Pick saved successfully!');
    }
    editingPickId = null;
    navigate('picks');
  }

  function deletePick(id) {
    const pick = PicksManager.getById(id);
    confirm(`Delete pick "${pick ? pick.pick : ''}"? This cannot be undone.`, () => {
      PicksManager.remove(id);
      toast('Pick deleted.', 'info');
      renderPicks();
    });
  }

  // ─── Blog List ─────────────────────────────────────────────────────────────

  function renderBlog() {
    const posts = BlogManager.getByUser(session.userId);

    document.getElementById('view-blog').innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title-inner">Blog Posts</h2>
          <p class="page-sub">${posts.length} article${posts.length !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn btn-primary" onclick="App.newPost()">+ New Post</button>
      </div>

      ${posts.length ? `
        <div class="posts-grid">
          ${posts.map(p => `
            <div class="post-card">
              <div class="post-card-header">
                <div class="post-card-meta">
                  ${sportBadge(p.category)}
                  ${postStatusBadge(p.status)}
                </div>
                <div class="post-card-date">${formatDate(p.createdAt)}</div>
              </div>
              <h3 class="post-card-title">${escHtml(p.title)}</h3>
              <p class="post-card-excerpt">${escHtml(p.excerpt || '')}</p>
              ${p.tags ? `<div class="post-card-tags">${p.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('')}</div>` : ''}
              <div class="post-card-actions">
                <button class="btn btn-sm btn-ghost" onclick="App.previewPost('${p.id}')">👁 Preview</button>
                <button class="btn btn-sm btn-ghost" onclick="App.editPost('${p.id}')">✏️ Edit</button>
                <button class="btn btn-sm btn-danger-ghost" onclick="App.deletePost('${p.id}')">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-card">
          <div class="empty-icon">✍️</div>
          <h3>No posts yet</h3>
          <p>Share your analysis and insights with well-formatted articles.</p>
          <button class="btn btn-primary mt-1" onclick="App.newPost()">Write Your First Post</button>
        </div>
      `}
    `;
  }

  // ─── Blog Editor ───────────────────────────────────────────────────────────

  function renderBlogForm(postId = null) {
    editingPostId = postId || null;
    const post = postId ? BlogManager.getById(postId) : null;
    const v = (field, def = '') => post ? (post[field] || def) : def;

    const categories = ['NFL','NBA','MLB','NHL','NCAAF','NCAAB','Soccer','Tennis','Golf','Boxing','MMA','General'];

    document.getElementById('view-blog-form').innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title-inner">${post ? 'Edit Post' : 'New Post'}</h2>
          <p class="page-sub">${post ? 'Update your analysis article.' : 'Write and publish a new analysis article.'}</p>
        </div>
        <button class="btn btn-ghost" onclick="App.goBlog()">← Back to Posts</button>
      </div>

      <div class="blog-editor-layout">
        <div class="blog-editor-main">
          <div class="card editor-card">
            <div class="form-group">
              <label>Article Title *</label>
              <input type="text" id="b-title" value="${escHtml(v('title'))}" placeholder="e.g., Week 14 NFL Picks: Breaking Down the Best Lines" class="title-input">
            </div>
            <div class="form-group">
              <label>Content *</label>
              <div id="quill-editor" style="min-height:320px;">${v('content')}</div>
            </div>
          </div>
        </div>

        <div class="blog-editor-sidebar">
          <div class="card">
            <div class="card-section-title">Publish</div>
            <div class="form-actions-vert">
              <button class="btn btn-ghost btn-full" onclick="App.savePost('Draft')">💾 Save Draft</button>
              <button class="btn btn-primary btn-full" onclick="App.savePost('Published')">🚀 Publish</button>
            </div>
          </div>

          <div class="card mt-1">
            <div class="card-section-title">Details</div>
            <div class="form-group">
              <label>Category</label>
              <select id="b-category">
                ${categories.map(c => `<option ${v('category') === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Tags <span class="label-hint">(comma separated)</span></label>
              <input type="text" id="b-tags" value="${escHtml(v('tags'))}" placeholder="NFL, Picks, Week 14">
            </div>
            <div class="form-group">
              <label>Excerpt</label>
              <textarea id="b-excerpt" rows="3" placeholder="Brief summary of this article...">${v('excerpt')}</textarea>
            </div>
            <div class="form-group">
              <label>Featured Image URL</label>
              <input type="url" id="b-image" value="${escHtml(v('featuredImage'))}" placeholder="https://...">
            </div>
          </div>
        </div>
      </div>
    `;

    // Init Quill
    quill = new Quill('#quill-editor', {
      theme: 'snow',
      placeholder: 'Write your analysis here...',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['link'],
          ['clean']
        ]
      }
    });

    if (post && post.content) {
      quill.clipboard.dangerouslyPasteHTML(0, post.content);
    }
  }

  function savePost(status) {
    const title = document.getElementById('b-title').value.trim();
    if (!title) { toast('Please enter a title.', 'error'); return; }

    const content = quill ? quill.root.innerHTML : '';
    if (!content || content === '<p><br></p>') {
      toast('Please write some content.', 'error'); return;
    }

    const data = {
      title,
      category:      document.getElementById('b-category').value,
      tags:          document.getElementById('b-tags').value.trim(),
      excerpt:       document.getElementById('b-excerpt').value.trim(),
      featuredImage: document.getElementById('b-image').value.trim(),
      content,
      status
    };

    if (editingPostId) {
      BlogManager.update(editingPostId, data);
      toast(`Post ${status === 'Published' ? 'published' : 'saved as draft'}!`);
    } else {
      BlogManager.create(session.userId, data);
      toast(`Post ${status === 'Published' ? 'published' : 'saved as draft'}!`);
    }
    editingPostId = null;
    navigate('blog');
  }

  function deletePost(id) {
    const post = BlogManager.getById(id);
    confirm(`Delete "${post ? post.title : 'this post'}"? This cannot be undone.`, () => {
      BlogManager.remove(id);
      toast('Post deleted.', 'info');
      renderBlog();
    });
  }

  // ─── Blog Preview ──────────────────────────────────────────────────────────

  function renderBlogPreview(postId) {
    const post = BlogManager.getById(postId);
    if (!post) { navigate('blog'); return; }

    const tags = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    document.getElementById('view-blog-preview').innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost" onclick="App.goBlog()">← Back to Posts</button>
        <button class="btn btn-primary" onclick="App.editPost('${postId}')">✏️ Edit Post</button>
      </div>

      <article class="article-preview">
        <div class="article-meta">
          ${sportBadge(post.category)}
          ${postStatusBadge(post.status)}
          <span class="date-dim">${formatDate(post.createdAt)}</span>
        </div>
        ${post.featuredImage ? `<img src="${escHtml(post.featuredImage)}" alt="Featured" class="article-image" onerror="this.style.display='none'">` : ''}
        <h1 class="article-title">${escHtml(post.title)}</h1>
        ${post.excerpt ? `<p class="article-excerpt">${escHtml(post.excerpt)}</p>` : ''}
        <div class="article-divider"></div>
        <div class="article-body">
          ${post.content || ''}
        </div>
        ${tags.length ? `
          <div class="article-tags">
            ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
        ` : ''}
        <div class="article-footer">
          <div class="article-author">
            <div class="author-avatar">${session.name.charAt(0).toUpperCase()}</div>
            <div>
              <div class="author-name">${escHtml(session.name)}</div>
              <div class="author-title">Handicapper · ChosenPickz</div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // ─── Public helpers used by inline onclick ──────────────────────────────────

  function newPick()         { editingPickId = null; navigate('pick-form'); }
  function editPick(id)      { navigate('pick-form', { id }); }
  function goPicks()         { navigate('picks'); }
  function newPost()         { editingPostId = null; navigate('blog-form'); }
  function editPost(id)      { navigate('blog-form', { id }); }
  function previewPost(id)   { navigate('blog-preview', { id }); }
  function goBlog()          { navigate('blog'); }
  function setFilter(f)      { currentFilter = f; renderPicks(); }

  // ─── Init ──────────────────────────────────────────────────────────────────

  function init() {
    if (!AuthManager.requireAuth()) return;
    session = AuthManager.getSession();

    PicksManager.init(session.userId);
    BlogManager.init(session.userId);

    // Populate header
    document.getElementById('user-display-name').textContent = session.name;
    document.getElementById('user-avatar-initial').textContent = session.name.charAt(0).toUpperCase();

    // Nav links
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        navigate(el.dataset.nav);
      });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      confirm('Are you sure you want to log out?', () => AuthManager.logout());
    });

    // Mobile sidebar toggle
    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });

    navigate('overview');
  }

  return {
    init,
    navigate,
    newPick, editPick, deletePick, savePick, goPicks, setFilter,
    newPost, editPost, deletePost, savePost, previewPost, goBlog
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
