(function BlogListPage() {
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

  function renderCard(post) {
    const date = fmtDate(post.publishedAt || post.createdAt);
    const imgHtml = post.featuredImage
      ? '<img class="article-card-img" src="' + escHtml(post.featuredImage) + '" alt="' + escHtml(post.title) + '" loading="lazy" />'
      : '<div class="article-card-img-placeholder">&#128202;</div>';
    const category = post.category
      ? '<div class="article-category">' + escHtml(post.category) + '</div>'
      : '';
    const excerpt = post.excerpt
      ? '<p class="article-excerpt">' + escHtml(post.excerpt) + '</p>'
      : '';
    const meta = '<div class="article-meta">By ' + escHtml(post.authorName || 'Handicapper') +
      (date ? ' &mdash; ' + escHtml(date) : '') + '</div>';

    return '<article class="article-card">' +
      imgHtml +
      '<div class="article-card-body">' +
        category +
        '<div class="article-title">' + escHtml(post.title || 'Untitled') + '</div>' +
        excerpt +
        meta +
        '<a class="article-read-btn" href="blog-post.html?id=' + encodeURIComponent(post.id) + '">Read Article</a>' +
      '</div>' +
    '</article>';
  }

  async function loadPosts() {
    var grid = document.getElementById('blog-grid');
    if (!grid) return;

    try {
      var res = await fetch('/api/posts');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var posts = await res.json();

      if (!Array.isArray(posts) || !posts.length) {
        grid.innerHTML = '<div class="blog-notice">No articles published yet. Check back soon.</div>';
        return;
      }

      grid.innerHTML = posts.map(renderCard).join('');
    } catch (err) {
      console.error('[blogList] Failed to load posts:', err);
      grid.innerHTML = '<div class="blog-notice">Unable to load articles right now. Please try again later.</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', loadPosts);
}());