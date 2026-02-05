/**
 * verbose-email.js
 * Build quote email payloads and optionally send via safeSendMail if available.
 */

let safeSendMail;
try {
  safeSendMail = require('./safe-mail').safeSendMail;
} catch (e) {
  safeSendMail = null;
}

function buildQuoteEmail({ name, email, phone, details, senderName, senderEmail }) {
  const subject = `New quote request from ${name || 'Unknown'}`;
  const text = [
    `Name: ${name || 'N/A'}`,
    `Email: ${email || 'N/A'}`,
    `Phone: ${phone || 'N/A'}`,
    '',
    details || ''
  ].join('\n');

  const html = `<h3>New quote request</h3>
    <p><strong>Name:</strong> ${name || 'N/A'}</p>
    <p><strong>Email:</strong> ${email || 'N/A'}</p>
    <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
    <h4>Details</h4><p>${(details || '').replace(/\n/g, '<br>')}</p>
    <hr>
    <p style="font-size:12px;color:#666">Sent by ${senderName || 'BDL'} &lt;${senderEmail || 'no-reply@example.com'}&gt;</p>`;

  return { subject, text, html };
}

async function sendQuoteEmail({ to, name, email, phone, details, senderName, senderEmail }) {
  const { subject, text, html } = buildQuoteEmail({ name, email, phone, details, senderName, senderEmail });
  const payload = { to, subject, text, html, senderEmail, senderName };

  if (typeof safeSendMail === 'function') {
    try {
      const res = await safeSendMail(payload);
      return Object.assign({ ok: true }, res || {}, { payload });
    } catch (err) {
      return { ok: false, reason: err && (err.message || err), payload };
    }
  }

  return { ok: false, reason: 'safeSendMail not available', payload };
}

module.exports = sendQuoteEmail;
module.exports.buildQuoteEmail = buildQuoteEmail;
