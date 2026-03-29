# CH0SEN1PICKZ

Premium sports picks & analysis platform with member-only access.

## Features

- **KPI Dashboard** — Win/loss record, win rate, current streak, live bets, pending picks.
- **Color Scheme** — Orange, Blue, and Black throughout the interface.
- **Member Portal** — Restricted to registered/logged-in users, with three sections:
  - **Chosen Picks** — All picks with filterable view (sport, result, live).
  - **Analysis Reports** — Detailed reasoning behind each pick.
  - **Live & Placed Bets** — Currently live bets and a full placed-bets record table.
- **Authentication** — Login and user registration (sign-up) modal.
- **Admin Panel** — Post new picks, grade results (Live / Win / Loss), and delete picks.

## Running Locally

```bash
npm start
```

The server starts on port 3000 (or `$PORT` if set).  
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Admin Credentials

| Username | Password   |
|----------|------------|
| admin    | pickz123$  |

> **Note:** Credentials are stored in `localStorage` for this client-side demo. A production deployment should use a secure backend with hashed passwords.