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

