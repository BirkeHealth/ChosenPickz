// /api/users/me — Returns the authenticated user's account info.
//
// TODO: Wire up to real authentication (e.g., JWT tokens, server-side sessions,
//       or a third-party auth provider). Currently returns mock data for
//       frontend scaffolding purposes only.
//
// TODO: Replace the mock user object below with a real database lookup, e.g.:
//   const token = req.headers['authorization']?.split(' ')[1];
//   const user  = await db.users.findByToken(token);

module.exports = function usersHandler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // TODO: Validate session token / cookie and look up the real user record.
  //       For now we return static mock data so the frontend can be built out.
  const mockUser = {
    id: 'mock-user-1',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex@example.com',
    createdAt: '2024-01-15T10:30:00Z',
    accountType: 'member', // 'member' | 'admin' | 'handicapper'
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(mockUser));
};
