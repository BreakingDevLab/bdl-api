const SibApiV3Sdk = require('@sendinblue/client');
const client = SibApiV3Sdk.ApiClient.instance;
client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendViaBrevo({ toEmail, subject, htmlContent, senderName, senderEmail }) {
  const sendSmtpEmail = {
    sender: { name: senderName || 'BDL', email: senderEmail || process.env.EMAIL_FROM },
    to: [{ email: toEmail }],
    subject,
    htmlContent
  };
  return apiInstance.sendTransacEmail(sendSmtpEmail);
}

module.exports = { sendViaBrevo };
