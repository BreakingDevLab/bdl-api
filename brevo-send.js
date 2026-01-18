/* brevo-send.js — safe no-op fallback that keeps require('@sendinblue/client') */
let SibApiV3Sdk;
try {
  const mod = require('@sendinblue/client');
  SibApiV3Sdk = mod && (mod.default || mod);
} catch (e) {
  console.warn('Warning: @sendinblue/client require failed at startup:', e && (e.message || e));
  SibApiV3Sdk = null;
}

function sendViaBrevo({ toEmail, subject, htmlContent, senderName, senderEmail }) {
  return new Promise((resolve, reject) => {
    if (!SibApiV3Sdk) return reject(new Error('Brevo HTTP client not available. Skipping Brevo send.'));
    try {
      const client = SibApiV3Sdk.ApiClient && SibApiV3Sdk.ApiClient.instance;
      const Api = SibApiV3Sdk.TransactionalEmailsApi;
      if (!client || !Api) return reject(new Error('Brevo client shape unexpected. Skipping Brevo send.'));
      if (!process.env.BREVO_API_KEY) return reject(new Error('BREVO_API_KEY not set'));
      client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
      const apiInstance = new Api();
      const sendSmtpEmail = {
        sender: { name: senderName || 'BDL', email: senderEmail || process.env.EMAIL_FROM },
        to: [{ email: toEmail }],
        subject,
        htmlContent
      };
      apiInstance.sendTransacEmail(sendSmtpEmail).then(resolve).catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { sendViaBrevo };
