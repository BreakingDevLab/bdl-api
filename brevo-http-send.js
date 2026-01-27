/*
  brevo-http-send.js
  Minimal Brevo HTTP send helper. Reads BREVO_API_KEY from env.
*/
async function sendViaBrevo({ to, subject, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not set');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: { name: 'BDL', email: 'a02174001@smtp-brevo.com' },
      to: [{ email: to }],
      subject,
      textContent: text
    })
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error('Brevo API error'), { status: res.status, body });
  return body;
}
module.exports = { sendViaBrevo };
