# CH0SEN1PICKZ

Premium sports picks & analysis platform with member-only access.

## Site Structure

This repository contains **two site sections** that are unified under a single Node.js server and navigate between each other:

| Section | Description | URL |
|---------|-------------|-----|
| **CH0SEN1 PICKZ** (static) | Public landing page — live odds, news, picks, pricing, auth | `/` (root) |
| **SharpEdge** (React) | Premium dark sports-lines React app — sharp picks, odds, member portal | `/sharpedge/` |

### Navigation

- From the **CH0SEN1 PICKZ** homepage, click **⚡ SharpEdge** in the nav bar to go to the React app.
- From any **SharpEdge** view, click **← CH0SEN1 PICKZ** in the nav bar to return to the static homepage.

> **Note:** The legacy `/home` and `/app` routes still redirect to the SharpEdge React app for backward compatibility.

---

## Running Locally (Unified Server)

Both sections are served by the same Node.js server.

### 1. Build the SharpEdge React app

```bash
cd sharpedge
npm install
npm run build
cd ..
```

### 2. Start the server

```bash
# Install root dependencies (first time only)
yarn install   # or: npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env and set NEWS_API_KEY, ODDS_API_KEY, and SMTP_* variables

# Start the server
yarn start   # or: node index.js
```

Then open [http://localhost:3000](http://localhost:3000) — you will see the **CH0SEN1 PICKZ** homepage.  
Navigate to [http://localhost:3000/sharpedge/](http://localhost:3000/sharpedge/) for the **SharpEdge** React app.

### Developing SharpEdge with Hot Reload

During development you can run the React app standalone with Vite's dev server:

```bash
cd sharpedge
npm run dev
```

Open [http://localhost:5173/sharpedge/](http://localhost:5173/sharpedge/) in your browser.

> The Vite dev server uses `base: '/sharpedge/'` so asset paths match the production server.

---

## Deployment (Render / similar)

Both sections deploy together as one service:

1. Set environment variables in your host's dashboard:
   - `NEWS_API_KEY`, `ODDS_API_KEY` — API keys (see below)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — email sending
2. Set the **Build Command**: `cd sharpedge && npm install && npm run build`
3. Set the **Start Command**: `node index.js`
4. The root URL (`/`) serves the CH0SEN1 PICKZ static homepage.
5. `/sharpedge/` serves the SharpEdge React SPA.

---

## CH0SEN1 PICKZ — Static Landing Page

Located at the project root (`index.html`). Served at `/`.

### Features

- **Responsive hero section** with brand colors (Black, Gold, Orange, Royal Blue)
- **Live Odds** — real-time game odds from [The Odds API](https://the-odds-api.com/) with a **sportsbook toggle**
- **Sports News** — latest headlines from [NewsAPI.org](https://newsapi.org/)
- **Pricing section** — Starter / Pro / Elite plans
- **Authentication modal** — Login + Sign Up with email confirmation
- **Best Available Odds page** (`best-odds.html`) — compare odds across all sportsbooks
- **⚡ SharpEdge** link in the top nav — navigates to the SharpEdge React app

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
  ODDS_API_KEY:        'YOUR_ODDS_API_KEY',       // The Odds API
  NEWS_API_KEY:        'YOUR_NEWS_API_KEY',        // NewsAPI.org
  EMAILJS_SERVICE_ID:  'YOUR_EMAILJS_SERVICE_ID',  // EmailJS
  EMAILJS_TEMPLATE_ID: 'YOUR_EMAILJS_TEMPLATE_ID',
  EMAILJS_PUBLIC_KEY:  'YOUR_EMAILJS_PUBLIC_KEY',
};
```

#### The Odds API

1. Sign up for free at <https://the-odds-api.com/>
2. Copy your API key from the dashboard.
3. Set `ODDS_API_KEY` in `.env`.

#### NewsAPI.org

1. Sign up for free at <https://newsapi.org/register>
2. Copy your API key from your account page.
3. Set `NEWS_API_KEY` as a server environment variable (see `.env.example`).

> ⚠️ **CORS note:** NewsAPI restricts browser (client-side) requests on the free Developer plan.
> The server-side proxy (`/api/news`) must have `NEWS_API_KEY` set for sports news to load in production.

#### EmailJS (signup email confirmation)

1. Sign up at <https://www.emailjs.com/>
2. Create an Email Service and note its *Service ID*.
3. Create an Email Template with `{{to_email}}`, `{{to_name}}`, `{{confirm_code}}` variables.
4. Set all three values in `config.js`.

> ⚠️ **Security:** Never commit `config.js` with real API keys to a public repository.
> Add it to `.gitignore` before deploying with real keys.

### Authentication Notes

User accounts are stored in the browser's `localStorage` (client-side demo).
Passwords are hashed with SHA-256 via the native Web Crypto API before storage.
For a production deployment, replace this with a secure server-side auth system (e.g., Node.js + bcrypt + a database).

---

## Handicapper Dashboard & Today's Picks

### Overview

Role-based features for users who sign up as **Handicapper** (role: `handicapper`).
All pick data is stored in `localStorage` under the key `cp_handicapper_picks`.

### Handicapper Dashboard (`index.html#handicapper-panel`)

Visible **only** to logged-in users with the `handicapper` role. Features:

- **Stats bar** — Total picks, Wins, Losses, and Win % calculated from all submitted picks.
- **Submit Pick form** — Fields: Matchup/Teams, Sport, Pick Type, Pick Details, Game Date, and an optional Note.
- **Pick history** — All the handicapper's own picks with an inline result selector and a delete button.

Navigation: a **My Dashboard** link appears in the top nav bar only when a handicapper is logged in.

#### Pick Object Schema (`cp_handicapper_picks` array)

```json
{
  "id":              1234567890,
  "handicapperId":   123,
  "handicapperName": "Jane Smith",
  "sport":           "NBA",
  "matchup":         "Lakers vs Celtics",
  "pickType":        "Spread",
  "pickDetails":     "Lakers -5.5 (-110)",
  "note":            "Home court advantage",
  "date":            "2026-04-06",
  "result":          "pending",
  "postedAt":        "2026-04-06T10:00:00.000Z"
}
```

`result` is one of `"pending"` | `"win"` | `"loss"` (manual entry; automation can be added later).

### Today's Picks Public Page (`todays-picks.html`)

A **public page** — no login required — showing all picks for the current date.

---

## CH0SEN1PICKZ — Main Member App

### Features

- **KPI Dashboard** — Win/loss record, win rate, current streak, live bets, pending picks.
- **Color Scheme** — Orange, Blue, and Black throughout the interface.
- **Member Portal** — Restricted to registered/logged-in users.
- **Authentication** — Login and user registration (sign-up) modal.
- **Admin Panel** — Post new picks, grade results, and delete picks.

### Default Admin Credentials

| Username | Password |
|----------|----------|
| admin    | 123456   |

> **Note:** Credentials are stored in `localStorage` for this client-side demo. A production deployment should use a secure backend with hashed passwords.

---

## SharpEdge — Premium Sports Lines React App

Located in `sharpedge/`. Served at `/sharpedge/`.

> **SharpEdge** is a React + Vite + Tailwind CSS app.
> It displays premium sports lines, sharp picks, and live odds in a sleek dark interface.
> The **← CH0SEN1 PICKZ** link in its nav bar returns users to the static homepage.

### Features

- **Live Lines preview** with sportsbook toggle (All Books / FanDuel / DraftKings / BetMGM / Caesars)
- **Best Available Odds page** — search any sport by date up to 30 days out
- Sharp picks dashboard, pricing plans, member portal (Board Portal, Handicapper Portal, Admin Portal)

### Build for Production

```bash
cd sharpedge
npm run build
```

The compiled output is placed in `sharpedge/dist/`. The Node.js server (`index.js`) serves this automatically at `/sharpedge/`.

### Environment Variables (optional — for live odds)

Copy `.env.example` to `.env` and add your API key:

```bash
cp sharpedge/.env.example sharpedge/.env
```

| Variable | Description |
|----------|-------------|
| `VITE_ODDS_API_KEY` | Your API key from [the-odds-api.com](https://the-odds-api.com/) |

Without the API key the app runs with mock/sample data.

### SharpEdge Tech Stack

- **React** (Vite) — functional components + hooks
- **Tailwind CSS** — utility-class styling
- **Google Fonts** — Bebas Neue (headings) + DM Sans (body)

---

## Admin Role-Switcher (Developer / QA Tool)

The landing page and associated pages include a built-in role-simulation widget that is **only visible to the admin account**.

### Purpose

The admin can use this widget to instantly preview what a **Handicapper** or **Sports Bettor** user would see — without creating separate test accounts.

### How It Works

| What | Where |
|------|-------|
| UI widget | Top-right of the nav bar (visible only when `isAdmin === true`) |
| localStorage key | `adminRoleOverride` |
| Valid values | `'handicapper'` · `'sports_bettor'` · absent/empty (admin-only view) |
| Clears on | Logout (or manually via "⚙️ Admin" reset button) |

### Using the Switcher

1. Log in with the admin shortcut (`admin` / `123456`).
2. Click **🏆 Handicapper** to see the page as a Handicapper user.
3. Click **🎯 Bettor** to see the page as a Sports Bettor.
4. Click **⚙️ Admin** to reset to the default admin view.
5. Log out — the override is cleared automatically.
