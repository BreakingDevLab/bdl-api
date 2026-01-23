/**
 * brevo-send.js
 * Guarded Brevo HTTP send with timeout
 */
let SibApiV3Sdk = null;
try {
  SibApiV3Sdk = require('@sendinblue/client');
} catch (err) {
  console.warn('@sendinblue/client require failed at startup:', err && err.message);
  SibApiV3Sdk = null;
}

function promiseWithTimeout(promise, ms, errorMessage = 'Operation timed out') {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timeout)), timeoutPromise]);
}

module.exports = async function sendBrevoEmail(payload) {
  if (!SibApiV3Sdk || !process.env.BREVO_API_KEY) {
    console.warn('Brevo HTTP client not available. Skipping Brevo send.');
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

    // enforce a 10s timeout on the HTTP send so it cannot hang the request
    await promiseWithTimeout(apiInstance.sendTransacEmail(sendSmtpEmail), 10000, 'Brevo HTTP send timed out');
    console.log('Quote email sent via Brevo HTTP API');
  } catch (err) {
    console.error('Error sending quote email via Brevo:', err && err.message);
  }
};
