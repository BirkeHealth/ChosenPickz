(function BlogPostPage() {
  'use strict';

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function sanitizePostHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
    const root = doc.body.firstElementChild || doc.body;

    root.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((node) => node.remove());

    root.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || '').trim().toLowerCase();
        const hasUnsafeScheme = /^(javascript|data|vbscript):/.test(value);
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          return;
        }
        if ((name === 'href' || name === 'src') && hasUnsafeScheme) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return root.innerHTML;
  }

  async function loadPost() {
    const host = document.getElementById('blog-post-content');
    if (!host) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
      host.innerHTML = '<p class="error-msg">No post selected.</p>';
      return;
    }

    try {
      const res = await fetch('/api/posts/' + encodeURIComponent(id));
      if (!res.ok) {
        if (res.status === 404) {
          host.innerHTML = '<p class="error-msg">Post not found.</p>';
          return;
        }
        throw new Error('HTTP ' + res.status);
      }

      const post = await res.json();
      if (String(post.status || '').toLowerCase() !== 'published') {
        host.innerHTML = '<p class="error-msg">This post is not publicly available.</p>';
        return;
      }

      const author = post.authorName || 'Handicapper';
      const publishedDate = fmtDate(post.publishedAt || post.createdAt);
      const safeBody = sanitizePostHtml(post.content || '');
      const title = post.title || 'Handicapper Update';

      document.title = title + ' — CH0SEN1 PICKZ';
      host.innerHTML =
        '<article>' +
          '<h1 class="blog-post-title">' + escHtml(title) + '</h1>' +
          '<div class="blog-post-meta">By ' + escHtml(author) + (publishedDate ? ' &mdash; ' + escHtml(publishedDate) : '') + '</div>' +
          '<div class="blog-post-body">' + (safeBody || '<p>' + escHtml(post.excerpt || '') + '</p>') + '</div>' +
        '</article>';
    } catch (err) {
      console.error('[blogPost] Failed to load post:', err);
      host.innerHTML = '<p class="error-msg">Unable to load this post right now.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', loadPost);
}());
