
























/* Cleaned index.js: single Brevo require, fixed /api/quote handler, timeout wrapper */
const { sendViaBrevo } = require('./brevo-send');
const sendQuoteEmailVerbose = require('./verbose-email.js');
const express = require('express');
const cors = require('cors');
// 
const { sendEmail } = require('./email-adapter');
const dns = require('dns');
const net = require('net');

const app = express();
app.use(express.json());

// Promise timeout helper
function promiseWithTimeout(promise, ms, errMsg = 'Operation timed out') {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(errMsg)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timeout)), timeoutPromise]);
}

// CORS
const raw = process.env.CORS_ORIGINS || '';
const allowedOrigins = raw.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
}));

let quotes = [
  { id: 1, text: "The only limit to our realization of tomorrow is our doubts of today.", author: "F. D. Roosevelt" },
  { id: 2, text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" }
];

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/api/quotes', (req, res) => res.json(quotes));
app.get('/api/quotes/:id', (req, res) => {
  const id = Number(req.params.id);
  const q = quotes.find(x => x.id === id);
  if (!q) return res.status(404).json({ error: 'Quote not found' });
  res.json(q);
});
app.post('/api/quotes', (req, res) => {
  const { text, author } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const newQuote = { id: Date.now(), text, author: author || 'Unknown' };
  quotes.push(newQuote);
  res.status(201).json(newQuote);
});
app.put('/api/quotes/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = quotes.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Quote not found' });
  const { text, author } = req.body;
  quotes[idx] = { ...quotes[idx], text: text || quotes[idx].text, author: author || quotes[idx].author };
  res.json(quotes[idx]);
});
app.delete('/api/quotes/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = quotes.length;
  quotes = quotes.filter(x => x.id !== id);
  if (quotes.length === before) return res.status(404).json({ error: 'Quote not found' });
  res.status(204).send();
});

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('SMTP not configured. Email sending will be skipped until SMTP_HOST/SMTP_USER/SMTP_PASS are set.');
    return null;
  }
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

app.use(express.urlencoded({ extended: true }));

app.post('/api/quote', async (req, res) => {
  try {
    const { name, email, phone, details } = req.body || {};
    if (!name || !details) return res.status(400).json({ error: 'name and details are required' });

    const to = process.env.EMAIL_TO || process.env.EMAIL_FROM || 'www.thapza@gmail.com';
    const text = [
      `Name: ${name}`,
      `Email: ${email || 'N/A'}`,
      `Phone: ${phone || 'N/A'}`,
      '',
      'Request details:',
      details
    ].join('\n');

    const subject = `New quote request from ${name}`;
    const htmlContent = `<h3>New quote request</h3>
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email || 'N/A'}</p>
  <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
  <h4>Details</h4><p>${(details || '').replace(/\n/g, '<br>')}</p>`;

    // Build transporter (may be null) but do not block the response on it
    const transporter = createTransporter();
    if (!transporter) console.warn('No SMTP transporter configured; will still attempt Brevo if BREVO_API_KEY is set.');

    // Persist quote and respond immediately
    const newQuote = { id: Date.now(), name, email, phone, details };
    quotes.push(newQuote);
    res.status(201).json({ status: 'ok', quote: newQuote });

    // Fire-and-forget: Brevo send (with timeout wrapper)
    if (process.env.BREVO_API_KEY) {
      promiseWithTimeout(sendViaBrevo({
        toEmail: to,
        subject,
        htmlContent,
        senderEmail: process.env.EMAIL_FROM,
        senderName: 'BDL'
      }), 10000, 'Brevo send timed out')
        .then(() => console.log('Quote email sent via Brevo HTTP API'))
        .catch(err => console.error('Error sending quote email via Brevo:', err && (err.body || err.message || err)));
    } else {
      console.warn('BREVO_API_KEY not set; skipping Brevo send.');
    }

    // Fire-and-forget: SMTP send
    if (transporter) {
      try {
        await sendEmail({ to, subject, text, html });
        console.log('Quote email sent via SMTP transporter');
      } catch (err) {
        console.error('Error sending quote email via SMTP transporter:', err && err.message);
      }
    }
});
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;
app.listen(PORT, HOST, () => console.log(`BDL API listening on ${HOST}:${PORT}`));

if (!process.env.SKIP_SMTP_CHECK) {
  /* --- SMTP connectivity check (auto-logs on startup) --- */
  (function smtpConnectivityCheck() {
    try {
      const host = process.env.SMTP_HOST || 'smtp-relay.sendinblue.com';
      const port = Number(process.env.SMTP_PORT) || 587;
      console.log('SMTP connectivity check: resolving', host);
      dns.lookup(host, { all: true }, (err, addresses) => {
        if (err) { console.error('SMTP DNS lookup failed:', err && err.message); return; }
        console.log('SMTP DNS addresses:', addresses.map(a => a.address).join(', '));
        const socket = new net.Socket();
        let connected = false;
        socket.setTimeout(10000);
        socket.on('connect', () => { connected = true; console.log(`SMTP TCP connect OK to ${host}:${port}`); socket.end(); });
        socket.on('timeout', () => { console.error(`SMTP TCP connect timed out to ${host}:${port}`); socket.destroy(); });
        socket.on('error', (e) => { if (!connected) console.error(`SMTP TCP connect error to ${host}:${port}:`, e && e.message); });
        socket.connect(port, host);
      });
    } catch (e) {
      console.error('SMTP connectivity check unexpected error:', e && e.message);
    }
  })();
} else {
  console.log('Skipping SMTP connectivity check due to SKIP_SMTP_CHECK=1');
}
