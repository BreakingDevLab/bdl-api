(async () => {
  try {
    const { sendEmail } = require('./email-adapter');
    const res = await sendEmail({ to: process.env.TEST_TO || 'you@domain.com', subject: 'Integration test', text: 'Hello from Brevo adapter' });
    console.log('TEST OK', res);
  } catch (err) {
    console.error('TEST ERR', err && err.body ? err.body : err.message);
    process.exit(2);
  }
})();
