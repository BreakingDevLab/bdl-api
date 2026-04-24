const nodemailer = require('nodemailer');
(async () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) { console.error('Missing SMTP env vars'); process.exit(1); }
  const transporter = nodemailer.createTransport({ host, port, secure: port===465, auth:{user,pass}, tls:{rejectUnauthorized:false} });
  try {
    const info = await transporter.sendMail({ from: user, to: user, subject: 'BDL SMTP test', text: 'SMTP test' });
    console.log('SMTP test success', info.response || info);
  } catch (err) {
    console.error('SMTP test failed', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
