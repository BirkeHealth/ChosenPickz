const BlogManager = (() => {
  const KEY = 'cpz_posts';

  function getAll() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  }

  function getByUser(userId) {
    return getAll()
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function init(userId) {
    // No-op: posts start empty and are only populated by user-created entries.
  }

  function create(userId, data) {
    const all = getAll();
    const post = {
      id: 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      userId,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    all.push(post);
    localStorage.setItem(KEY, JSON.stringify(all));
    return post;
  }

  function update(id, data) {
    const all = getAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...data, updatedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(all));
    return all[idx];
  }

  function remove(id) {
    localStorage.setItem(KEY, JSON.stringify(getAll().filter(p => p.id !== id)));
  }

  function getById(id) {
    return getAll().find(p => p.id === id) || null;
  }

  return { init, create, update, remove, getById, getByUser };
})();
