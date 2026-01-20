/**
 * sendEmail.js
 * Minimal Brevo HTTP sender using fetch (Node 18+ has fetch built in).
 */
async function sendViaBrevoHttp(toEmail, subject, htmlContent) {
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
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(\`Brevo API error \${res.status}: \${text}\`);
  }
  return res.json();
}

module.exports = { sendViaBrevoHttp };
