require('dotenv').config();

const express = require('express');
require('dotenv').config();

const { sendQuoteNotification } = require('./lib/sendEmailBrevo');

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/quote', async (req, res) => {
  const { name, details, email } = req.body;
  if (!name || !details || !email) {
    return res.status(400).json({ error: 'name and details are required' });
  }

  try {
    const htmlContent = '<p>Hi ' + name + ',</p><p>Thanks - we received your quote request:</p><pre>' + details + '</pre>';
    await sendQuoteNotification({ toEmail: email, toName: name, htmlContent });
    return res.status(201).json({ message: 'quote received' });
  } catch (err) {
    console.error('Brevo send error:', err);
    return res.status(502).json({ error: 'failed to send notification' });
  }
});

const server = app.listen(process.env.PORT || 3001, function () {
  console.log('BDL API listening on port ' + (process.env.PORT || 3001));
});

server.on('error', function (err) {
  if (err && err.code === 'EADDRINUSE') {
    console.error('Port ' + (process.env.PORT || 3001) + ' is already in use.');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

function shutdown(signal) {
  console.log('Received ' + signal + '. Shutting down...');
  server.close(function () {
    console.log('Server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', function () { shutdown('SIGINT'); });
process.on('SIGTERM', function () { shutdown('SIGTERM'); });



