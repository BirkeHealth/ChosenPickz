const PicksManager = (() => {
  const KEY = 'cpz_picks';

  function seedData(userId) {
    return [
      {
        id: 'seed_p1', userId,
        sport: 'NFL',
        game: 'Kansas City Chiefs vs Baltimore Ravens',
        pick: 'Chiefs -3',
        betType: 'Spread',
        odds: '-110',
        units: 2,
        confidence: 4,
        status: 'Win',
        date: '2024-12-01',
        notes: 'Chiefs at home, Ravens missing key defensive personnel. Strong lean on KC covering the spread.',
        createdAt: Date.now() - 7 * 86400000
      },
      {
        id: 'seed_p2', userId,
        sport: 'NBA',
        game: 'Los Angeles Lakers vs Boston Celtics',
        pick: 'Celtics ML',
        betType: 'Moneyline',
        odds: '-135',
        units: 1.5,
        confidence: 3,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        notes: 'Celtics on a 5-game win streak, Lakers playing back-to-back. Fade the tired legs.',
        createdAt: Date.now() - 2 * 86400000
      },
      {
        id: 'seed_p3', userId,
        sport: 'NHL',
        game: 'Colorado Avalanche vs Vegas Golden Knights',
        pick: 'Over 6',
        betType: 'Over/Under',
        odds: '-115',
        units: 1,
        confidence: 3,
        status: 'Loss',
        date: '2024-11-28',
        notes: 'Both teams averaging over 3.5 goals/game. Goaltending matchup favors the over.',
        createdAt: Date.now() - 10 * 86400000
      },
      {
        id: 'seed_p4', userId,
        sport: 'NCAAF',
        game: 'Michigan vs Ohio State',
        pick: 'Ohio State -7',
        betType: 'Spread',
        odds: '-110',
        units: 3,
        confidence: 5,
        status: 'Win',
        date: '2024-11-30',
        notes: 'The Game. Ohio State at home, Michigan struggling offensively. Heavy lean on the Buckeyes.',
        createdAt: Date.now() - 12 * 86400000
      },
      {
        id: 'seed_p5', userId,
        sport: 'MLB',
        game: 'New York Yankees vs Houston Astros',
        pick: 'Yankees ML',
        betType: 'Moneyline',
        odds: '-120',
        units: 2,
        confidence: 4,
        status: 'Push',
        date: '2024-11-20',
        notes: 'Cole on the mound at home. Astros rotation thinned by injury.',
        createdAt: Date.now() - 20 * 86400000
      }
    ];
  }

  function getAll() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  }

  function getByUser(userId) {
    return getAll()
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function init(userId) {
    const all = getAll();
    if (!all.some(p => p.userId === userId)) {
      localStorage.setItem(KEY, JSON.stringify([...all, ...seedData(userId)]));
    }
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
