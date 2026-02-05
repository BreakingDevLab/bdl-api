/*
  safe-mail.js
  Tries Brevo HTTP first (if BREVO_API_KEY), falls back to SMTP sendEmail adapter.
  Returns { ok: true } on success, { ok: false, reason } on failure.
*/
const { sendViaBrevoHttp } = require('./sendEmail'); // existing Brevo HTTP helper
const { sendEmail } = require('./email-adapter');    // existing SMTP adapter

function withTimeout(promise, ms, errMsg = 'Operation timed out') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(errMsg)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

async function safeSendMail({ to, subject, text, html }) {
  // Try Brevo HTTP API first
  if (process.env.BREVO_API_KEY) {
    try {
      // sendViaBrevoHttp expects an object; adapt if your implementation differs
      await withTimeout(sendViaBrevoHttp({
        toEmail: to,
        subject,
        htmlContent: html,
        senderEmail: process.env.EMAIL_FROM,
        senderName: process.env.SENDER_NAME || 'BDL'
      }), 10000, 'Brevo send timed out');
      console.log('safe-mail: sent via Brevo HTTP API');
      return { ok: true, via: 'brevo' };
    } catch (err) {
      console.error('safe-mail: Brevo send failed:', err && (err.message || err));
      // fall through to SMTP fallback
    }
  } else {
    console.warn('safe-mail: BREVO_API_KEY not set; skipping Brevo send.');
  }

  // Fallback to SMTP adapter if configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('safe-mail: SMTP not configured; skipping SMTP send');
    return { ok: false, reason: 'no-mail-provider-configured' };
  }

  try {
    // sendEmail is expected to return a Promise
    await withTimeout(sendEmail({ to, subject, text, html }), 15000, 'SMTP send timed out');
    console.log('safe-mail: sent via SMTP adapter');
    return { ok: true, via: 'smtp' };
  } catch (err) {
    console.error('safe-mail: SMTP send failed:', err && (err.message || err));
    return { ok: false, reason: err && (err.message || 'smtp-failed') };
  }
}

module.exports = { safeSendMail };
