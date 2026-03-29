# CH0SEN1PICKZ

Premium sports picks & analysis platform with member-only access.

## Repository Structure

This repository contains **two separate apps** that work independently:

| App | Description | Entry Point |
|-----|-------------|-------------|
| **CH0SEN1PICKZ** (root) | Main member portal — picks, records, admin panel | `chosepickz.html` |
| **SharpEdge UI** (`sharpedge/`) | Premium dark sports-lines React app | `sharpedge/src/App.jsx` |

> The two apps share no code and are deployed separately. Do **not** merge them — run each one independently following the instructions below.

---

## CH0SEN1PICKZ — Main App

### Features

- **KPI Dashboard** — Win/loss record, win rate, current streak, live bets, pending picks.
- **Color Scheme** — Orange, Blue, and Black throughout the interface.
- **Member Portal** — Restricted to registered/logged-in users, with three sections:
  - **Chosen Picks** — All picks with filterable view (sport, result, live).
  - **Analysis Reports** — Detailed reasoning behind each pick.
  - **Live & Placed Bets** — Currently live bets and a full placed-bets record table.
- **Authentication** — Login and user registration (sign-up) modal.
- **Admin Panel** — Post new picks, grade results (Live / Win / Loss), and delete picks.

### Running Locally

```bash
npm start
```

The server starts on port 3000 (or `$PORT` if set).  
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Admin Credentials

| Username | Password |
|----------|----------|
| admin    | 123456   |

> **Note:** Credentials are stored in `localStorage` for this client-side demo. A production deployment should use a secure backend with hashed passwords.
>
> **To change the admin password in the future:** open `chosepickz.html`, find the `initUsers()` function, and update the `password` value. On the next page load every browser will pick up the new credentials from that seed. For a production app, never store plain-text passwords in client-side code; use a server-side auth system with hashed passwords instead.

---

## SharpEdge UI — Premium Sports Lines

> **SharpEdge** is a separate React + Vite + Tailwind CSS app located in the `sharpedge/` directory.  
> It displays premium sports lines, sharp picks, and live odds in a sleek dark interface.

### Preview SharpEdge Locally

```bash
# 1. Navigate into the sharpedge directory
cd sharpedge

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to view the SharpEdge sports UI.

### Environment Variables (optional — for live odds)

Copy `.env.example` to `.env` and add your API key:

```bash
cp sharpedge/.env.example sharpedge/.env
```

| Variable | Description |
|----------|-------------|
| `VITE_ODDS_API_KEY` | Your API key from [the-odds-api.com](https://the-odds-api.com/) |

Without the API key the app runs with mock/sample data.

### Build for Production

```bash
cd sharpedge
npm run build
```

The compiled output is placed in `sharpedge/dist/`. Deploy the contents of that folder to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

### SharpEdge Tech Stack

- **React** (Vite) — functional components + hooks
- **Tailwind CSS** — all styling
- **Google Fonts** — Bebas Neue (headings) + DM Sans (body)