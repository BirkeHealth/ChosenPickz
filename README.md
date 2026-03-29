# CH0SEN1PICKZ

Premium sports picks & analysis platform with member-only access.

## Repository Structure

This repository contains **two separate apps** that work independently:

| App | Description | Entry Point |
|-----|-------------|-------------|
| **Landing Page** (root) | Public-facing landing page — live odds, news, pricing, auth | `index.html` |
| **CH0SEN1PICKZ** (root) | Main member portal — picks, records, admin panel | `chosepickz.html` |
| **SharpEdge UI** (`sharpedge/`) | Premium dark sports-lines React app | `sharpedge/src/App.jsx` |

> The apps share no code and are deployed separately. Do **not** merge them — run each one independently following the instructions below.

---

## Landing Page (`index.html`)

The public landing page includes:

- **Responsive hero section** with brand colors (Black, Gold, Orange, Royal Blue)
- **Live Odds** — real-time game odds from [The Odds API](https://the-odds-api.com/)
- **Sports News** — latest headlines from [NewsAPI.org](https://newsapi.org/)
- **Pricing section** — Starter / Pro / Elite plans
- **Authentication modal** — Login + Sign Up with email confirmation

### API Key Setup

All API keys are configured in **`config.js`** (root of the repo).  
Open `config.js` and replace the placeholder values:

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
3. Set `ODDS_API_KEY` in `config.js`.

#### NewsAPI.org

1. Sign up for free at <https://newsapi.org/register>
2. Copy your API key from your account page.
3. Set `NEWS_API_KEY` in `config.js`.

> ⚠️ **CORS note:** NewsAPI restricts browser (client-side) requests on the free Developer plan.  
> For production either proxy requests through a server-side endpoint or upgrade to a paid plan.

#### EmailJS (signup email confirmation)

Email confirmation on the Sign Up flow is powered by [EmailJS](https://www.emailjs.com/) (free tier available).

1. Sign up at <https://www.emailjs.com/>
2. **Create an Email Service** (Gmail, Outlook, etc.) and note its *Service ID*.
3. **Create an Email Template** with the following variables:
   - `{{to_email}}` — recipient's email address
   - `{{to_name}}`  — recipient's name
   - `{{confirm_code}}` — the 6-character confirmation code
4. Note the *Template ID* and your *Public Key* (Account → API Keys).
5. Set all three values in `config.js`.

If EmailJS is **not** configured the sign-up flow still works — the confirmation code is displayed on screen so you can test the flow locally without any email service.

> ⚠️ **Security:** Never commit `config.js` with real API keys to a public repository.  
> Add it to `.gitignore` before deploying with real keys.

### Running the Landing Page Locally

The landing page is served by the Node.js server at the root URL. Run:

```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser to see the landing page.

You can also open `index.html` directly in your browser, or use any static file server:

```bash
# Python 3
python3 -m http.server 8080
# Then open http://localhost:8080/index.html
```

### Authentication Notes

User accounts are stored in the browser's `localStorage` (client-side demo).  
Passwords are hashed with SHA-256 via the native Web Crypto API before storage.  
For a production deployment, replace this with a secure server-side auth system (e.g., Node.js + bcrypt + a database).

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
- **Landing page** → [http://localhost:3000](http://localhost:3000)  
- **Member portal** → [http://localhost:3000/chosepickz.html](http://localhost:3000/chosepickz.html)  
- **SharpEdge UI** → [http://localhost:3000/app](http://localhost:3000/app)

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