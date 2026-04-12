const BlogManager = (() => {
  const KEY = 'cpz_posts';

  function seedData(userId) {
    return [
      {
        id: 'seed_b1', userId,
        title: 'Week 14 NFL Picks: Breaking Down the Best Lines',
        category: 'NFL',
        tags: 'NFL, Week 14, Picks, Analysis',
        excerpt: 'A deep dive into the best value plays of Week 14, with analysis of key matchups, injuries, and line movement.',
        content: `<h2>Week 14 Overview</h2>
<p>Week 14 presents some of the best betting value we've seen all season. With playoff implications on the line, several teams are showing significant motivation disparities that sharp money has been targeting all week.</p>
<h3>Top Pick: Chiefs -3 at Home</h3>
<p>The Kansas City Chiefs have been <strong>dominant</strong> at Arrowhead Stadium this season, going 6-1 ATS as home favorites. The Baltimore Ravens, while talented, are dealing with a nagging offensive line injury that could hamper Lamar Jackson's effectiveness in the pocket.</p>
<blockquote>Line movement has been telling — this game opened at Chiefs -2.5 and has been bet up to -3.5 at some books. Follow the sharp action.</blockquote>
<h3>Key Metrics</h3>
<ul>
<li>Chiefs' home ATS record: <strong>6-1 (86%)</strong></li>
<li>Ravens' road ATS record: <strong>3-5 (38%)</strong></li>
<li>Weather: Clear skies, 32°F — neutral factor</li>
<li>Injuries: Ravens starting LG listed as questionable</li>
</ul>
<h3>Secondary Play: Rams-Cardinals Under 47.5</h3>
<p>Both offenses have been inconsistent in cold weather, and the Rams' run-heavy scheme in late-season games historically keeps totals low. The under has hit in 5 of the last 7 meetings in this divisional rivalry.</p>
<h3>Final Thoughts</h3>
<p>This is a <em>high-confidence</em> week overall. Take the Chiefs at home and consider sprinkling on the Rams-Cardinals under as a supplementary play. Manage your units responsibly — never chase.</p>`,
        status: 'Published',
        featuredImage: '',
        createdAt: Date.now() - 5 * 86400000,
        updatedAt: Date.now() - 5 * 86400000
      },
      {
        id: 'seed_b2', userId,
        title: 'NBA Western Conference: Early Season Betting Trends',
        category: 'NBA',
        tags: 'NBA, Western Conference, Trends, Analysis',
        excerpt: 'Breaking down the early season trends in the Western Conference and what they mean for value bettors this December.',
        content: `<h2>Western Conference Early Season Analysis</h2>
<p>Through the first 20 games of the NBA season, several clear trends have emerged in the Western Conference that savvy bettors should be aware of heading into December.</p>
<h3>Teams Beating the Spread</h3>
<p>The <strong>Oklahoma City Thunder</strong> have been the biggest ATS overperformer, covering at a 65% clip — largely due to their depth and hustle points. Meanwhile, the <strong>Lakers continue to underperform</strong> against the number, covering just 35% of the time as LeBron manages through a hamstring issue.</p>
<h3>Key Trends to Watch</h3>
<ul>
<li><strong>Back-to-backs:</strong> Western Conference teams on the second night of B2Bs are 8-18 ATS this season</li>
<li><strong>Home favorites:</strong> Teams favored by 8+ at home are covering at 62%</li>
<li><strong>Pace matchups:</strong> Fast-vs-slow pace games are trending under 55% of the time</li>
</ul>
<h3>Fading the Lakers</h3>
<p>Until LeBron returns to full health, the Lakers present excellent fade opportunities — particularly on the road. The roster is thin and the coaching staff appears to be managing minutes heavily ahead of the playoff push.</p>
<blockquote>Recommendation: Fade LAL on the road vs. top-10 defenses until the injury report clears.</blockquote>
<h3>Conclusion</h3>
<p>The Western Conference this season rewards patient, data-driven bettors. Avoid public narratives, track line movement, and always check the injury wire before game time.</p>`,
        status: 'Draft',
        featuredImage: '',
        createdAt: Date.now() - 2 * 86400000,
        updatedAt: Date.now() - 2 * 86400000
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
