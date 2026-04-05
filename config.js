/**
 * config.js — CH0SEN1 PICKZ API Configuration
 *
 * Copy this file (or edit it directly) and replace the placeholder values
 * with your real API keys before deploying.
 *
 * ⚠️  This file contains browser-side keys for a client app.
 *     Keys placed here are visible to end users.  For production,
 *     prefer using the server-side proxy so the key stays in .env
 *     and is never sent to the browser.
 *
 * ─── API KEY SETUP ──────────────────────────────────────────────────────────
 *
 *  THE ODDS API
 *    1. Sign up for free at https://the-odds-api.com/
 *    2. Copy your API key from the dashboard.
 *    3. Paste it as the value of ODDS_API_KEY below.
 *
 *  NEWSAPI.ORG
 *    1. Sign up for free at https://newsapi.org/register
 *    2. Copy your API key from your account page.
 *    3. Paste it as the value of NEWS_API_KEY below.
 *    ⚠️  Note: NewsAPI restricts browser (CORS) access on the free tier.
 *        For production use a server-side proxy or upgrade to a paid plan.
 *
 *  EMAIL CONFIRMATION
 *    Signup confirmation emails are sent server-side via SMTP.
 *    No keys are needed here — configure SMTP_HOST, SMTP_PORT, SMTP_USER,
 *    SMTP_PASS (and optionally SMTP_FROM) in your server's .env file.
 *    See .env.example for details.
 *    If SMTP is not configured the app will display the confirmation
 *    code directly on screen so you can test the sign-up flow locally.
 */

window.APP_CONFIG = {
  // ── The Odds API ───────────────────────────────────────────────────────────
  ODDS_API_KEY: '378d22c76a76769fa0078d2d9e88fb60',

  // ── NewsAPI.org ───────────────────────────────────────────────────────────
  // To update this key: sign in at https://newsapi.org/, copy your API key,
  // and replace the value below.  Then save this file and restart the app.
  NEWS_API_KEY: 'a387f4253113414cbde66602bfecc96f',
};
