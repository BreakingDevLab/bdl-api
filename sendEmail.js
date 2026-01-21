/**
 * sendEmail.js
 * Brevo (Sendinblue) HTTP sender with timeout using AbortController.
 * Exports: sendViaBrevoHttp(toEmail, subject, htmlContent, timeoutMs)
 *
 * NOTE: Keep BREVO_API_KEY in environment variables (do not commit keys).
 */
async function sendViaBrevoHttp(toEmail, subject, htmlContent, timeoutMs = 15000) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY not configured in environment');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.sendinblue.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'BDL', email: process.env.EMAIL_FROM || 'no-reply@breakingdevlab.com' },
        to: [{ email: toEmail }],
        subject,
        htmlContent
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Brevo API error ${res.status}: ${text}`);
    }
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err && err.name === 'AbortError') throw new Error('Brevo request timed out');
    throw err;
  }
}

module.exports = { sendViaBrevoHttp };
