/* brevo-send.js — robust loader for @sendinblue/client (keeps require) */
let SibApiV3Sdk;
try {
  const mod = require('@sendinblue/client');
  // handle both CommonJS and ESM default export shapes
  SibApiV3Sdk = mod && (mod.default || mod);
} catch (e) {
  console.error('Failed to require @sendinblue/client:', e && (e.message || e));
  // rethrow so the caller sees a clear error, or comment out the throw to allow app to continue without Brevo
  throw e;
}

// Validate the expected API
if (!SibApiV3Sdk || !SibApiV3Sdk.ApiClient || !SibApiV3Sdk.TransactionalEmailsApi) {
  throw new Error('@sendinblue/client did not export expected ApiClient/TransactionalEmailsApi. Check installed package version.');
}

// Configure API key if present
const client = SibApiV3Sdk.ApiClient.instance;
if (process.env.BREVO_API_KEY) {
  client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
} else {
  console.warn('BREVO_API_KEY not set. Brevo sends will fail if attempted.');
}

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendViaBrevo({ toEmail, subject, htmlContent, senderName, senderEmail }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY not set');
  }
  const sendSmtpEmail = {
    sender: { name: senderName || 'BDL', email: senderEmail || process.env.EMAIL_FROM },
    to: [{ email: toEmail }],
    subject,
    htmlContent
  };
  return apiInstance.sendTransacEmail(sendSmtpEmail);
}

module.exports = { sendViaBrevo };
