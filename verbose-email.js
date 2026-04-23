module.exports = async function sendQuoteEmailVerbose({ to, subject, html, text, transporter }) {
  try {
    if (transporter && typeof transporter.sendMail === 'function') {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: text || '',
        html: html || ''
      });
      console.log('verbose-email: sent via transporter', info && info.response ? info.response : info);
      return info;
    } else {
      console.log('verbose-email: transporter not provided, logging email instead', { to, subject });
      return null;
    }
  } catch (err) {
    console.error('verbose-email: send failed', err && err.message ? err.message : err);
    throw err;
  }
};
