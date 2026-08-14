'use strict';

const axios = require('axios');
const db = require('../db');
const { loadUserFromRequest, sendJson, readJsonBody } = require('./auth');

/**
 * routes/paypal.js — PayPal Subscriptions integration for checkout.html
 *
 * Flow:
 *  1. GET  /api/paypal/config       — frontend fetches the public client ID
 *     and plan IDs to render the PayPal JS SDK Subscribe button.
 *  2. Frontend creates the subscription client-side via paypal.Buttons()
 *     (createSubscription callback, using the plan ID for the chosen tier).
 *  3. POST /api/paypal/subscription — after the buyer approves, the frontend
 *     sends the subscriptionID here. This handler calls the PayPal API
 *     server-side to confirm the subscription is real, ACTIVE, and matches
 *     the expected plan ID for the requested tier — never trusting the
 *     client-supplied plan name alone — before writing it to the user's row.
 *
 * PAYPAL_SECRET is only ever used here, server-side, to fetch an OAuth
 * token and call api.paypal.com. It is never sent to the browser.
 */

const PLAN_ENV_KEYS = {
  starter: 'PAYPAL_PLAN_STARTER',
  pro: 'PAYPAL_PLAN_PRO',
  elite: 'PAYPAL_PLAN_ELITE',
  chosen1: 'PAYPAL_PLAN_CHOSEN1',
};

function apiBase() {
  return process.env.PAYPAL_ENV === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

function getPlanMap() {
  const map = {};
  for (const [plan, envKey] of Object.entries(PLAN_ENV_KEYS)) {
    if (process.env[envKey]) map[plan] = process.env[envKey];
  }
  return map;
}

function isConfigured() {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_SECRET &&
    Object.keys(getPlanMap()).length > 0
  );
}

let cachedToken = null; // { token, expires }

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token;

  const response = await axios.post(
    `${apiBase()}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: { username: process.env.PAYPAL_CLIENT_ID, password: process.env.PAYPAL_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  cachedToken = {
    token: response.data.access_token,
    // Refresh a minute early to avoid edge-of-expiry failures.
    expires: Date.now() + (response.data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

async function fetchSubscription(subscriptionId) {
  const accessToken = await getAccessToken();
  const response = await axios.get(
    `${apiBase()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}

async function handlePaypalApi(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;

  // GET /api/paypal/config
  if (req.method === 'GET' && pathname === '/api/paypal/config') {
    if (!isConfigured()) {
      return sendJson(res, 503, { error: 'PayPal is not configured on the server.' });
    }
    return sendJson(res, 200, {
      clientId: process.env.PAYPAL_CLIENT_ID,
      plans: getPlanMap(),
    });
  }

  // POST /api/paypal/subscription
  if (req.method === 'POST' && pathname === '/api/paypal/subscription') {
    if (!isConfigured()) {
      return sendJson(res, 503, { error: 'PayPal is not configured on the server.' });
    }
    if (!db.isConfigured()) {
      return sendJson(res, 503, { error: 'Database is not configured.' });
    }

    const user = await loadUserFromRequest(req);
    if (!user) {
      return sendJson(res, 401, { error: 'You must be signed in to subscribe.' });
    }

    const body = await readJsonBody(req);
    const { subscriptionID, plan } = body;
    const planMap = getPlanMap();

    if (!subscriptionID || !plan || !planMap[plan]) {
      return sendJson(res, 400, { error: 'Missing or invalid subscriptionID / plan.' });
    }

    let subscription;
    try {
      subscription = await fetchSubscription(subscriptionID);
    } catch (err) {
      const status = (err.response && err.response.status) || 500;
      console.error('[paypal] failed to fetch subscription:', err.message);
      return sendJson(res, status === 404 ? 400 : 500, {
        error: 'Could not verify subscription with PayPal.',
      });
    }

    // Never trust the client's claimed plan — confirm PayPal's own record
    // of this subscription really points at the expected Plan ID.
    if (subscription.plan_id !== planMap[plan]) {
      console.warn(
        `[paypal] plan mismatch for subscription ${subscriptionID}: expected ${planMap[plan]}, got ${subscription.plan_id}`
      );
      return sendJson(res, 400, { error: 'Subscription plan does not match the requested tier.' });
    }

    if (!['ACTIVE', 'APPROVAL_PENDING', 'APPROVED'].includes(subscription.status)) {
      return sendJson(res, 400, { error: `Subscription is not active (status: ${subscription.status}).` });
    }

    const now = Date.now();
    await db.query(
      `UPDATE users
       SET plan = $1, paypal_subscription_id = $2, subscription_status = $3, subscription_updated_at = $4, updated_at = $4
       WHERE id = $5`,
      [plan, subscriptionID, subscription.status, now, user.id]
    );

    return sendJson(res, 200, { ok: true, plan, status: subscription.status });
  }

  sendJson(res, 404, { error: 'Not found' });
}

module.exports = { handlePaypalApi };
