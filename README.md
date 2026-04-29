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
# Edit .env and fill in:
#   DATABASE_URL  — PostgreSQL connection string
#   SESSION_SECRET — random string (see .env.example for generation command)
#   ADMIN_EMAIL / ADMIN_PASSWORD — create the first admin on startup
#   NEWS_API_KEY, ODDS_API_KEY, and SMTP_* — optional API integrations
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

To access the admin panel, navigate to [http://localhost:3000/admin.html](http://localhost:3000/admin.html) and log in with the admin credentials you set via `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

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

Authentication is now server-side and backed by PostgreSQL.  Passwords are hashed
with **bcrypt** (12 rounds) and sessions are stored in the `sessions` table using
only a SHA-256 hash of the session token (the raw token is never stored).  A
`HttpOnly; SameSite=Lax` cookie (`cpz_session`) carries the token.

#### Required environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required for auth, picks & posts) |
| `SESSION_SECRET` | Long random string – used for startup warnings only (actual tokens use `crypto.randomBytes`) |
| `NODE_ENV` | Set to `production` to enable `Secure` flag on session cookies |

Generate `SESSION_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

#### Database migration

The `users`, `sessions`, `picks`, and `posts` tables are created automatically on
first start via `db.js` (`CREATE TABLE IF NOT EXISTS …`).  A `disabled` column is
added to `users` automatically on upgrade.  No separate migration step is needed.

#### Creating the first admin — environment variables (recommended)

Set the following environment variables before starting the server:

```bash
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=a-very-strong-password-here
ADMIN_USERNAME=siteadmin   # optional, defaults to "admin"
ADMIN_NAME="Site Owner"    # optional, defaults to "Admin"
```

On startup, the server will:
- Create the admin user if the email does not exist yet.
- Promote the user to `admin` role if the email already exists with a different role.
- Skip silently if an admin with that email already exists.

After the admin is created you can **remove or unset** `ADMIN_PASSWORD` from the environment — the hash is already stored in the database.

#### Auth API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new user (`email`, `username`, `password`, `name`) |
| `POST` | `/api/auth/login` | Login (`identifier`, `password`, `remember`) → sets `cpz_session` cookie |
| `POST` | `/api/auth/logout` | Clear cookie and delete server-side session |
| `GET` | `/api/auth/me` | Return current user or 401 |

#### Admin API endpoints (require admin session)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/users` | List all users |
| `PATCH` | `/api/admin/users/:id` | Update user `role` and/or `disabled` flag |
| `GET` | `/api/admin/posts` | List all posts (optional `?status=` and `?userId=` filters) |
| `PATCH` | `/api/admin/posts/:id` | Update post `status` (Draft / Published / Archived) |
| `DELETE` | `/api/admin/posts/:id` | Permanently delete a post |

---

## Admin Panel

Accessible at `/admin.html`.  Requires an active session with `role = 'admin'`.
Non-admin users are automatically redirected to the dashboard.

### Features

- **Users** — view all registered users; change role (member / handicapper / admin);
  enable or disable accounts.  Disabled users are immediately logged out and cannot
  log in until re-enabled.
- **Posts** — list all posts with status/author filters; change post status
  (Draft / Published / Archived); permanently delete posts.

---

## Handicapper Dashboard & Today's Picks

Role-based features for users who sign up as **Handicapper** (`handicapper`).
Pick and blog post data are persisted through server API routes backed by PostgreSQL (`DATABASE_URL`).

## Admin Role-Switcher (Developer / QA Tool)

The landing page and associated pages include a built-in role-simulation widget that is only visible to the admin account.
