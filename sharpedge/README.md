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

## Features

### Sportsbook Toggle (Live Lines)
The **Live Lines** section includes a row of toggle buttons so users can choose which sportsbook's odds to display: All Books, FanDuel, DraftKings, BetMGM, or Caesars. The active sportsbook name is shown at the bottom of each event card.

### Best Available Odds Page
Click **🏆 Best Odds** in the navbar (or call `setCurrentPage('best-odds')`) to open the odds search page:
- Select a sport from the dropdown
- Pick a date up to 30 days in the future  
- Click **Search Odds** to fetch all moneyline data across every supported sportsbook
- Each event card highlights the **best (highest payout) odds** per team and names the sportsbook, with an expandable section listing every book's odds

## Project Structure

```
sharpedge/
├── src/
│   ├── App.jsx                       # Main app — includes page routing
│   ├── main.jsx                      # Entry point
│   ├── index.css                     # Global styles + Tailwind + Google Fonts
│   ├── components/
│   │   ├── SportsLinesPreview.jsx    # Live lines preview with sportsbook toggle
│   │   └── BestOddsPage.jsx          # Best Available Odds search page
│   ├── data/
│   │   └── mockPicks.js              # Mock pick data (TODO: replace with API)
│   └── hooks/
│       └── useOddsApi.js             # The Odds API integration hook
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
