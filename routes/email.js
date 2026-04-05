/**
 * routes/email.js
 *
 * POST /api/send-confirmation-email
 *
 * Sends a signup-confirmation email via SMTP (nodemailer).
 * SMTP credentials must be set as server environment variables — they are
 * never exposed to the browser.
 *
 * Required env vars:
 *   SMTP_HOST   — SMTP server hostname  (e.g. smtp.gmail.com)
 *   SMTP_PORT   — SMTP port             (defaults to 587)
 *   SMTP_USER   — SMTP username / email address
 *   SMTP_PASS   — SMTP password / app password
 *
 * Optional env vars:
 *   SMTP_FROM   — "From" display string (defaults to SMTP_USER)
 *                 e.g. '"ChosenPickz" <noreply@chosenpickz.com>'
 *
 * Expected JSON body:
 *   { to_email, to_name, confirm_code }
 *
 * Response:
 *   200  { ok: true }
 *   400  { ok: false, error: '...' }   — bad request
 *   503  { ok: false, error: '...' }   — SMTP not configured
 *   500  { ok: false, error: '...' }   — send failure
 */

'use strict';

const nodemailer = require('nodemailer');

// Re-use a single transporter instance across requests (connection pooling).
let _transporter = null;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  if (!_transporter) {
    const port = parseInt(SMTP_PORT || '587', 10);
    _transporter = nodemailer.createTransport({
      host:   SMTP_HOST,
      port,
      secure: port === 465,   // true for 465 (TLS), false for 587 (STARTTLS)
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return _transporter;
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = function emailHandler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'Method not allowed' });
    return;
  }

  // Collect request body (hard limit: 10 KB)
  const MAX_BODY = 10 * 1024;
  let raw = '';
  let tooLarge = false;
  req.on('data', chunk => {
    if (tooLarge) return;
    raw += chunk;
    if (raw.length > MAX_BODY) {
      tooLarge = true;
      json(res, 413, { ok: false, error: 'Request body too large' });
      req.destroy();
    }
  });
  req.on('end', async () => {
    if (tooLarge) return;
    // Parse JSON
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      json(res, 400, { ok: false, error: 'Invalid JSON body' });
      return;
    }

    const { to_email, to_name, confirm_code } = data || {};

    if (!to_email || !to_name || !confirm_code) {
      json(res, 400, { ok: false, error: 'Missing required fields: to_email, to_name, confirm_code' });
      return;
    }

    // Basic email format guard
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) {
      json(res, 400, { ok: false, error: 'Invalid email address' });
      return;
    }

    const transporter = getTransporter();
    if (!transporter) {
      // SMTP not configured — caller will display the code on-screen
      json(res, 503, { ok: false, error: 'Email not configured on server' });
      return;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const safeName = escapeHtml(String(to_name).slice(0, 200));
    const safeCode = escapeHtml(String(confirm_code).slice(0, 20));

    try {
      await transporter.sendMail({
        from,
        to: to_email,
        subject: 'Your ChosenPickz verification code',
        text: [
          `Hi ${safeName},`,
          '',
          `Your ChosenPickz verification code is: ${safeCode}`,
          '',
          'Enter this code on the sign-up page to activate your account.',
          '',
          '— ChosenPickz',
        ].join('\n'),
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#d4a843;margin-bottom:8px">ChosenPickz</h2>
            <p>Hi <strong>${safeName}</strong>,</p>
            <p>Your verification code is:</p>
            <div style="font-size:2rem;font-weight:700;letter-spacing:0.2em;
                        background:#0a0a0f;color:#d4a843;padding:16px 24px;
                        border-radius:8px;display:inline-block;margin:8px 0">
              ${safeCode}
            </div>
            <p>Enter this code on the sign-up page to activate your account.</p>
            <p style="color:#888;font-size:0.85rem;margin-top:24px">— ChosenPickz</p>
          </div>
        `,
      });

      json(res, 200, { ok: true });
    } catch (err) {
      console.warn('[email] Send failed:', err.message);
      json(res, 500, { ok: false, error: 'Failed to send email' });
    }
  });
};
