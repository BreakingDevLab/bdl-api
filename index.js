/**
 * Merged index.js - single requires, CORS, /api/quote handler, SMTP check
 */
const express = require('express');
const cors = require('cors');
// 
const { sendEmail } = require('./email-adapter');
const dns = require('dns');
const net = require('net');

const { sendViaBrevo } = require('./brevo-send');
const { sendViaBrevoHttp } = require('./sendEmail');
const sendQuoteEmailVerbose = require('./verbose-email.js');
const { safeSendMail } = require('./safe-mail');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function promiseWithTimeout(promise, ms, errMsg = 'Operation timed out') {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(errMsg)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timeout)), timeoutPromise]);
}

const frontendOrigin = process.env.FRONTEND_ORIGIN && process.env.FRONTEND_ORIGIN.trim();
const raw = process.env.CORS_ORIGINS || '';
const allowedOrigins = raw.split(',').map(s => s.trim()).filter(Boolean);
if (frontendOrigin) allowedOrigins.push(frontendOrigin);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
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
if (!process.env.SKIP_SMTP_CHECK) {
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

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;
app.listen(PORT, HOST, () => console.log(`BDL API listening on ${HOST}:${PORT}`));

/**
 * Temporary test route to verify /api/quote exists and verbose-email builds payload.
 * Remove this after you restore the original route.
 */
app.post('/api/quote', async (req, res) => {
  try {
    const { name, email, phone, details } = req.body || {};
    const senderName = process.env.SENDER_NAME || 'BDL';
    const senderEmail = process.env.EMAIL_FROM || 'no-reply@example.com';

    // verbose-email exports a default sendQuote function and buildQuoteEmail
    const sendQuote = require('./verbose-email.js');
    const result = await sendQuote({
      to: process.env.EMAIL_FROM || 'you@example.com',
      name, email, phone, details, senderName, senderEmail
    });

    // Return the built payload and send result for inspection
    return res.status(201).json({ ok: true, result });
  } catch (err) {
    console.error('Quote route error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});
/**
 * Production /api/quote route
 * Prefers Brevo HTTP when BREVO_API_KEY is present, falls back to verbose-email (safeSendMail).
 */
app.post('/api/quote', async (req, res) => {
  try {
    const { name, email, phone, details } = req.body || {};
    const senderName = process.env.SENDER_NAME || 'BDL';
    const senderEmail = process.env.EMAIL_FROM || 'no-reply@example.com';
    const to = process.env.EMAIL_FROM || 'you@example.com';

    // Build payload using verbose-email helper
    const sendQuote = require('./verbose-email.js');
    const built = await sendQuote.buildQuoteEmail
      ? sendQuote.buildQuoteEmail({ name, email, phone, details, senderName, senderEmail })
      : (await sendQuote({ to, name, email, phone, details, senderName, senderEmail })).payload;

    // Prefer Brevo HTTP
    if (process.env.BREVO_API_KEY) {
      const { sendViaBrevoHttp } = require('./sendEmail');
      try {
        const result = await sendViaBrevoHttp({
          to,
          subject: built.subject,
          text: built.text,
          html: built.html,
          senderName,
          senderEmail
        });
        return res.status(201).json({ ok: true, via: 'brevo', result });
      } catch (err) {
        console.error('Brevo send error', err && (err.body || err.message || err));
        // fall through to SMTP fallback if available
      }
    }

    // SMTP / safeSendMail fallback
    const sendResult = await require('./verbose-email.js')({
      to,
      name, email, phone, details, senderName, senderEmail
    });

    return res.status(201).json({ ok: !!sendResult.ok, via: 'smtp', result: sendResult });
  } catch (err) {
    console.error('Quote route error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', brevo: !!process.env.BREVO_API_KEY });
});

// POST /api/lead — reuse the same logic as /api/quote
app.post('/api/lead', async (req, res) => {
  try {
    const { name, email, phone, details } = req.body || {};
    const senderName = process.env.SENDER_NAME || 'BDL';
    const senderEmail = process.env.EMAIL_FROM || 'no-reply@example.com';
    const to = process.env.EMAIL_FROM || 'you@example.com';

    const sendQuote = require('./verbose-email.js');
    const built = await sendQuote.buildQuoteEmail
      ? sendQuote.buildQuoteEmail({ name, email, phone, details, senderName, senderEmail })
      : (await sendQuote({ to, name, email, phone, details, senderName, senderEmail })).payload;

    if (process.env.BREVO_API_KEY) {
      const { trySendEmail } = require('./sendEmail');
      try {
        const result = await trySendEmail({
          to,
          subject: built.subject,
          text: built.text,
          html: built.html,
          senderName,
          senderEmail
        });
        return res.status(201).json({ ok: true, via: 'brevo', result });
      } catch (err) {
        console.error('Brevo send error (lead)', err && (err.body || err.message || err));
      }
    }

    const sendResult = await require('./verbose-email.js')({
      to,
      name, email, phone, details, senderName, senderEmail
    });

    return res.status(201).json({ ok: !!sendResult.ok, via: 'smtp', result: sendResult });
  } catch (err) {
    console.error('Lead route error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});
