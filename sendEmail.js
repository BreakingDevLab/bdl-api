/**
 * sendEmail.js
 * Minimal Brevo HTTP helper and a fallback SMTP wrapper.
 * Uses global fetch (Node 18+). If your Node version lacks fetch, install node-fetch and adjust.
 */

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

async function sendViaBrevoHttp({ to, subject, text, html, senderName, senderEmail }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('no-brevo-key');
  }

  const body = {
    sender: { name: senderName || 'BDL', email: senderEmail || process.env.EMAIL_FROM },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text
  };

  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify(body),
    timeout: 30000
  });

  const data = await res.text().catch(() => null);
  let parsed = data;
  try { parsed = JSON.parse(data); } catch (e) {}

  if (!res.ok) {
    const err = new Error('brevo-error');
    err.status = res.status;
    err.body = parsed;
    throw err;
  }

  return { status: res.status, body: parsed };
}

module.exports = { sendViaBrevoHttp };
