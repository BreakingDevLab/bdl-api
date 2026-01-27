/*
  email-adapter.js
  Single adapter to switch between transports easily.
  By default it uses the Brevo HTTP helper above.
*/
const { sendViaBrevo } = require('./brevo-http-send');

async function sendEmail({ to, subject, text }) {
  // normalize single recipient string or array
  const recipient = Array.isArray(to) ? to[0] : to;
  return sendViaBrevo({ to: recipient, subject, text });
}

module.exports = { sendEmail };
