/* brevo-send.js - safe Brevo (Sendinblue) HTTP sender with guards */
let SibApiV3Sdk = null;
try {
  const mod = require('@sendinblue/client');
  SibApiV3Sdk = mod && (mod.default || mod);
} catch (e) {
  console.warn('Warning: @sendinblue/client require failed at startup:', e && (e.message || e));
  SibApiV3Sdk = null;
}

/**
 * sendViaBrevo({ toEmail, subject, htmlContent, senderName, senderEmail })
 * Returns a Promise that resolves with the API response or rejects with an Error.
 * Fails fast with clear messages if the SDK or API key is missing.
 */
function sendViaBrevo({ toEmail, subject, htmlContent, senderName, senderEmail }) {
  return new Promise(async (resolve, reject) => {
    if (!SibApiV3Sdk) return reject(new Error('Brevo HTTP client not available. Skipping Brevo send.'));
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return reject(new Error('BREVO_API_KEY not set. Skipping Brevo send.'));

    try {
      const defaultClient = SibApiV3Sdk.ApiClient && SibApiV3Sdk.ApiClient.instance;
      const Api = SibApiV3Sdk.TransactionalEmailsApi;
      if (!defaultClient || !Api) return reject(new Error('Brevo client shape unexpected.'));

      // Configure API key
      defaultClient.authentications['api-key'].apiKey = apiKey;

      const apiInstance = new Api();
      const sendSmtpEmail = {
        to: [{ email: toEmail }],
        sender: { name: senderName || 'BDL', email: senderEmail || process.env.EMAIL_FROM },
        subject,
        htmlContent
      };

      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      resolve(response);
    } catch (err) {
      // Normalize error message
      const msg = err && (err.message || (err.body && JSON.stringify(err.body)) || err);
      reject(new Error(msg || 'Unknown error from Brevo client'));
    }
  });
}

module.exports = { sendViaBrevo };
