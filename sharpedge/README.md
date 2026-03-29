# SharpEdge UI

Premium dark sports picks landing page built with React + Tailwind CSS.

## Tech Stack

- **React** (Vite) — functional components + hooks
- **Tailwind CSS** — all styling
- **Google Fonts** — Bebas Neue (headings) + DM Sans (body)

## Getting Started

```bash
cd sharpedge
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_ODDS_API_KEY` | Your API key from [the-odds-api.com](https://the-odds-api.com/) |

## The Odds API Integration

The app ships with mock pick data. To use live odds:

1. Get an API key at [the-odds-api.com](https://the-odds-api.com/)
2. Set `VITE_ODDS_API_KEY` in your `.env` file
3. In `src/App.jsx`, uncomment the `useOddsApi` hook import and usage

Supported endpoints (see `src/hooks/useOddsApi.js`):
- `basketball_ncaab` — College Basketball
- `americanfootball_ncaaf` — College Football  
- `americanfootball_nfl` — NFL
- `basketball_nba` — NBA
- `baseball_mlb` — MLB

## Project Structure

```
sharpedge/
├── src/
│   ├── App.jsx          # Main app (all sections)
│   ├── main.jsx         # Entry point
│   ├── index.css        # Global styles + Tailwind + Google Fonts
│   ├── data/
│   │   └── mockPicks.js # Mock pick data (TODO: replace with API)
│   └── hooks/
│       └── useOddsApi.js # The Odds API integration hook
├── .env.example
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## Build

```bash
npm run build
```

Output goes to `sharpedge/dist/`.
