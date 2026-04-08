import { useState, useEffect } from 'react';

const NEWS_PROXY_URL = '/api/news?category=sports&pageSize=6';

function formatPublishedAt(isoString) {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function SportsNewsSection() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(NEWS_PROXY_URL)
      .then(res => {
        if (!res.ok) throw new Error(`News API error (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (!cancelled) {
          setArticles(Array.isArray(data.articles) ? data.articles : []);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 0', fontFamily: 'DM Sans, sans-serif', color: '#8888a0',
          gap: '10px',
        }}
      >
        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#d4a843', display: 'inline-block' }} />
        Loading sports news…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          textAlign: 'center', padding: '32px 0',
          fontFamily: 'DM Sans, sans-serif', color: '#8888a0', fontSize: '0.875rem',
        }}
      >
        Sports news temporarily unavailable. Check back soon.
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'DM Sans, sans-serif', color: '#8888a0' }}>
        No headlines available right now.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: '16px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      }}
    >
      {articles.map((article, idx) => (
        <a
          key={idx}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            background: '#1c1c28',
            border: '1px solid #2a2a3a',
            borderRadius: '12px',
            overflow: 'hidden',
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,168,67,0.4)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
        >
          {article.urlToImage && (
            <img
              src={article.urlToImage}
              alt={article.title}
              style={{ width: '100%', height: '160px', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div style={{ padding: '14px 16px' }}>
            <div
              style={{
                fontSize: '0.65rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: '#d4a843', marginBottom: '6px',
              }}
            >
              {article.source?.name || 'News'} · {formatPublishedAt(article.publishedAt)}
            </div>
            <div
              style={{
                fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                color: '#e8e8f0', lineHeight: '1.4',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {article.title}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
