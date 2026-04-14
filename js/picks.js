const PicksManager = (() => {
  const KEY = 'cpz_picks';

  function getAll() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  }

  function getByUser(userId) {
    return getAll()
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function init(userId) {
    // No-op: picks start empty and are only populated by user-created entries.
  }

  function create(userId, data) {
    const all = getAll();
    const pick = {
      id: 'pick_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      userId,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    all.push(pick);
    localStorage.setItem(KEY, JSON.stringify(all));
    return pick;
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

  function getStats(userId) {
    const picks = getByUser(userId);
    const wins = picks.filter(p => p.status === 'Win').length;
    const losses = picks.filter(p => p.status === 'Loss').length;
    const pending = picks.filter(p => p.status === 'Pending').length;
    const settled = wins + losses;
    const winRate = settled > 0 ? ((wins / settled) * 100).toFixed(1) : '0.0';

    let units = 0;
    picks.forEach(p => {
      const u = parseFloat(p.units) || 1;
      const odds = parseInt(p.odds) || -110;
      if (p.status === 'Win') {
        units += odds < 0 ? u * (100 / Math.abs(odds)) : u * (odds / 100);
      } else if (p.status === 'Loss') {
        units -= u;
      }
    });

    return { total: picks.length, wins, losses, pending, winRate, units: units.toFixed(2) };
  }

  return { init, create, update, remove, getById, getByUser, getStats };
})();
