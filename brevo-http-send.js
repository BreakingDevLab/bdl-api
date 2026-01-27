/*
  brevo-http-send.js
  sendViaBrevo({ to, subject, text, htmlContent, htmlUrl })
  - If htmlContent is empty and htmlUrl provided, fetch htmlUrl
  - Normalizes to into [{ email }]
*/
async function sendViaBrevo({ to, subject, text, htmlContent, htmlUrl }) {
  if (!process.env.BREVO_API_KEY) throw new Error('BREVO_API_KEY not set');

  const effectiveTo = to || process.env.EMAIL_TO;
  if (!effectiveTo) throw new Error('sendViaBrevo: missing "to" and EMAIL_TO not set');

  const toList = Array.isArray(effectiveTo)
    ? effectiveTo.map(t => (typeof t === 'string' ? { email: t } : t))
    : [{ email: effectiveTo }];

  let bodyHtml = (htmlContent && String(htmlContent).trim()) || (text && String(text).trim()) || '';

  if (!bodyHtml && htmlUrl) {
    try {
      const r = await fetch(htmlUrl, { method: 'GET' });
      if (r.ok) bodyHtml = await r.text();
      else console.warn('sendViaBrevo: fetch htmlUrl returned', r.status);
    } catch (err) {
      console.warn('sendViaBrevo: failed to fetch htmlUrl', err && err.message);
    }
  }

  if (!bodyHtml) bodyHtml = '<div>(no message body)</div>';

  const payload = {
    sender: { email: process.env.EMAIL_FROM || '' },
    to: toList,
    subject: subject || '',
    htmlContent: bodyHtml
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || JSON.stringify(data);
    throw new Error(`Brevo error: ${msg}`);
  }
  return data;
}

module.exports = { sendViaBrevo };
