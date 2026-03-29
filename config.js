/**
 * config.js — CH0SEN1 PICKZ API Configuration
 *
 * Copy this file (or edit it directly) and replace the placeholder values
 * with your real API keys before deploying.
 *
 * ⚠️  Never commit real API keys to a public repository.
 *     Add `config.js` to .gitignore when using real keys.
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
  NEWS_API_KEY: 'YOUR_NEWS_API_KEY',

  // ── EmailJS (signup email confirmation) ───────────────────────────────────
  EMAILJS_SERVICE_ID:  'YOUR_EMAILJS_SERVICE_ID',
  EMAILJS_TEMPLATE_ID: 'YOUR_EMAILJS_TEMPLATE_ID',
  EMAILJS_PUBLIC_KEY:  'YOUR_EMAILJS_PUBLIC_KEY',
};
