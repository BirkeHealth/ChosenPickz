const BlogManager = (() => {
  async function request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
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

  async function init() {
    // No-op: data is loaded from server APIs.
  }

  async function create(userId, data) {
    return request('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ userId, ...data })
    });
  }

  async function update(id, data) {
    return request(`/api/posts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async function remove(id) {
    return request(`/api/posts/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  async function getById(id) {
    try {
      return await request(`/api/posts/${encodeURIComponent(id)}`);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  async function getByUser(userId) {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request(`/api/posts${query}`);
  }

  return { init, create, update, remove, getById, getByUser };
})();
