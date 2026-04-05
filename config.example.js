/**
 * config.example.js — CH0SEN1 PICKZ API Configuration Template
 *
 * Copy this file to config.js and replace the placeholder values with your
 * real API keys before running the app.
 *
 * ⚠️  config.js is listed in .gitignore — never commit real API keys.
 *
 * ─── API KEY SETUP ──────────────────────────────────────────────────────────
 *
 *  THE ODDS API
 *    1. Sign up for free at https://the-odds-api.com/
 *    2. Copy your API key from the dashboard.
 *    3. Paste it as ODDS_API_KEY below (or set it as a server env variable).
 *
 *  NEWSAPI.ORG
 *    1. Sign up for free at https://newsapi.org/register
 *    2. Copy your API key from your account page.
 *    3. Set NEWS_API_KEY as a server environment variable in .env (recommended)
 *       so the key is never sent to the browser.
 *    4. Optionally paste it below as a browser-side fallback (local dev only).
 *    ⚠️  Note: NewsAPI restricts browser (CORS) access on the free Developer plan.
 *        For production use the server-side proxy (/api/news) which keeps the
 *        key in .env and never exposes it to the browser.
 *
 *  EMAILJS (for signup email confirmation)
 *    1. Sign up for free at https://www.emailjs.com/
 *    2. Create an Email Service and an Email Template.
 *       Template variables used: {{to_email}}, {{to_name}}, {{confirm_code}}
 *    3. Copy your Service ID, Template ID, and Public Key.
 *    4. Paste them below.
 *    If EmailJS keys are absent the app will display the confirmation
 *    code directly on screen so you can test the sign-up flow locally.
 */

window.APP_CONFIG = {
  // ── The Odds API ───────────────────────────────────────────────────────────
  ODDS_API_KEY: 'YOUR_ODDS_API_KEY',

  // ── NewsAPI.org ───────────────────────────────────────────────────────────
  // The app uses the server-side proxy (/api/news) when NEWS_API_KEY is set
  // in .env.  The value below is only used as a browser-side fallback for
  // local development when the proxy key is not configured.
  NEWS_API_KEY: 'YOUR_NEWS_API_KEY',

  // ── EmailJS (signup email confirmation) ───────────────────────────────────
  EMAILJS_SERVICE_ID:  'YOUR_EMAILJS_SERVICE_ID',
  EMAILJS_TEMPLATE_ID: 'YOUR_EMAILJS_TEMPLATE_ID',
  EMAILJS_PUBLIC_KEY:  'YOUR_EMAILJS_PUBLIC_KEY',
};
