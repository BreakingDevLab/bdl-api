module.exports = async function sendQuoteEmailVerbose(transporter, payload, res) {
  const { name, email, phone, details } = payload || {};
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const to = process.env.EMAIL_TO || 'www.breakingdevlab@gmail.com';
  const subject = `New quote request from ${name || 'unknown'}`;
  const text = `Name: ${name || ''}\nEmail: ${email || ''}\nPhone: ${phone || ''}\n\nDetails:\n${details || ''}`;

  try {
    await transporter.verify();
    console.log('SMTP transporter verified', {
      host: process.env.SMTP_HOST || null,
      port: process.env.SMTP_PORT || null,
      userSet: !!process.env.SMTP_USER,
    });

    const info = await transporter.sendMail({ from, to, subject, text });
    console.log('Email sent', { to, messageId: info.messageId, response: info.response });
    res.status(201).json({ status: 'ok', message: 'Quote request received and emailed.' });
  } catch (err) {
    console.error('Error sending quote email:', err && err.stack ? err.stack : err);
    console.error('Env presence:', {
      SMTP_HOST: !!process.env.SMTP_HOST,
      SMTP_PORT: !!process.env.SMTP_PORT,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASS: !!process.env.SMTP_PASS,
      EMAIL_FROM: !!process.env.EMAIL_FROM,
      EMAIL_TO: !!process.env.EMAIL_TO
    });
    res.status(500).json({ error: 'Failed to process quote request' });
  }
};
