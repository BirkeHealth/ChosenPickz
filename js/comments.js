const CommentsManager = (() => {
  async function request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...options
    });

    let payload = null;
    try { payload = await res.json(); } catch (_) {}

    if (!res.ok) {
      const msg = payload && payload.error ? payload.error : `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }

    return payload;
  }

  async function getByPick(pickId) {
    return request(`/api/comments?pickId=${encodeURIComponent(pickId)}`);
  }

  async function create(pickId, content) {
    return request('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ pickId, content })
    });
  }

  async function remove(id) {
    return request(`/api/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  return { getByPick, create, remove };
})();
