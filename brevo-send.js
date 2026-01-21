/* brevo-send.js - safe Brevo (Sendinblue) HTTP sender with SDK guard and HTTP fallback */
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
 * Tries SDK path first, falls back to direct HTTP POST to Sendinblue API.
 */
async function sendViaBrevo({ toEmail, subject, htmlContent, senderName, senderEmail }) {
  return new Promise(async (resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return reject(new Error('BREVO_API_KEY not set. Skipping Brevo send.'));

    // Try SDK path if available and shaped as expected
    try {
      if (SibApiV3Sdk && SibApiV3Sdk.ApiClient && SibApiV3Sdk.TransactionalEmailsApi) {
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        defaultClient.authentications['api-key'].apiKey = apiKey;
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        const sendSmtpEmail = {
          to: [{ email: toEmail }],
          sender: { name: senderName || 'BDL', email: senderEmail || process.env.EMAIL_FROM },
          subject,
          htmlContent
        };
        const resp = await apiInstance.sendTransacEmail(sendSmtpEmail);
        return resolve(resp);
      }
    } catch (sdkErr) {
      console.warn('Brevo SDK path failed, falling back to HTTP send:', sdkErr && (sdkErr.message || sdkErr));
    }

    // HTTP fallback using global fetch (Node 18+)
    try {
      const url = 'https://api.sendinblue.com/v3/smtp/email';
      const body = {
        sender: { name: senderName || 'BDL', email: senderEmail || process.env.EMAIL_FROM },
        to: [{ email: toEmail }],
        subject,
        htmlContent
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return reject(new Error(`Brevo HTTP error ${res.status}: ${text || res.statusText}`));
      }
      const json = await res.json().catch(() => ({}));
      return resolve(json);
    } catch (err) {
      return reject(new Error(err && (err.message || err)));
    }
  });
}

module.exports = { sendViaBrevo };
