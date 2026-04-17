# CH0SEN1PICKZ

Premium sports picks & analysis platform with member-only access.

## Site Structure

This repository contains a single Node.js-served site centered on the CH0SEN1 PICKZ experience.

| Section | Description | URL |
|---------|-------------|-----|
| **CH0SEN1 PICKZ** | Public landing page with live odds, news, picks, pricing, auth, and member tools | `/` |

---

## Running Locally

```bash
npm install
cp .env.example .env
# Edit .env and set NEWS_API_KEY, ODDS_API_KEY, and SMTP_* variables
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Render / similar)

1. Set environment variables in your host's dashboard:
   - `NEWS_API_KEY`, `ODDS_API_KEY`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
2. No separate frontend build step is required.
3. Set the **Start Command**: `node index.js`
4. The root URL (`/`) serves the CH0SEN1 PICKZ site.

---

## CH0SEN1 PICKZ

Located at the project root (`index.html`). Served at `/`.

### Features

- Responsive hero section with brand colors (Black, Gold, Orange, Royal Blue)
- Live Odds — real-time game odds from [The Odds API](https://the-odds-api.com/) with a sportsbook toggle
- Sports News — latest headlines from [NewsAPI.org](https://newsapi.org/)
- Pricing section — Starter / Pro / Elite / Ch0sen1 plans
- Authentication modal — Login + Sign Up with email confirmation
- Best Available Odds page (`best-odds.html`)
- Handicapper dashboard and board portal access for authenticated users

### Related HTML Pages

| Page | URL |
|------|-----|
| Homepage | `/` |
| Best Odds | `/best-odds.html` |
| Today's Picks | `/todays-picks.html` |
| News | `/news.html` |
| Analysis | `/analysis.html` |
| Pick of the Week | `/pick.html` |
| About | `/about.html` |
| Handicapper Portal | `/handicapper-portal.html` |

### API Key Setup

All API keys are configured via environment variables (`.env`). See `.env.example` for details.

For the client-side config (optional fallback), open `config.js` and set:

```js
window.APP_CONFIG = {
  ODDS_API_KEY:        'YOUR_ODDS_API_KEY',
  NEWS_API_KEY:        'YOUR_NEWS_API_KEY',
  EMAILJS_SERVICE_ID:  'YOUR_EMAILJS_SERVICE_ID',
  EMAILJS_TEMPLATE_ID: 'YOUR_EMAILJS_TEMPLATE_ID',
  EMAILJS_PUBLIC_KEY:  'YOUR_EMAILJS_PUBLIC_KEY',
};
```

### Authentication Notes

User accounts are stored in the browser's `localStorage` (client-side demo).
Passwords are hashed with SHA-256 via the native Web Crypto API before storage.
For a production deployment, replace this with a secure server-side auth system.

---

## Handicapper Dashboard & Today's Picks

Role-based features for users who sign up as **Handicapper** (`handicapper`).
Pick and blog post data are persisted through server API routes backed by PostgreSQL (`DATABASE_URL`).

## Admin Role-Switcher (Developer / QA Tool)

The landing page and associated pages include a built-in role-simulation widget that is only visible to the admin account.
