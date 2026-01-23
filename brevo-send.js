/**
 * brevo-send.js - lazy require and 10s timeout for Brevo HTTP sends
 */
function promiseWithTimeout(promise, ms, errorMessage = 'Operation timed out') {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timeout)), timeoutPromise]);
}

module.exports = async function sendBrevoEmail(payload) {
  let SibApiV3Sdk;
  try {
    // lazy require so missing module doesn't break startup
    SibApiV3Sdk = require('@sendinblue/client');
  } catch (err) {
    console.warn('Brevo HTTP client not available. Skipping Brevo send.');
    return;
  }

  if (!process.env.BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not set. Skipping Brevo send.');
    return;
  }

  try {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = {
      to: [{ email: payload.to }],
      sender: { email: process.env.EMAIL_FROM || 'no-reply@yourdomain.com' },
      subject: payload.subject,
      htmlContent: payload.html || payload.text
    };

    await promiseWithTimeout(apiInstance.sendTransacEmail(sendSmtpEmail), 10000, 'Brevo HTTP send timed out');
    console.log('Quote email sent via Brevo HTTP API');
  } catch (err) {
    console.error('Error sending quote email via Brevo:', err && err.message);
  }
};
