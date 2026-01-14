const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

// Read allowed origins from environment variable CORS_ORIGINS (comma separated)
const raw = process.env.CORS_ORIGINS || '';
const allowedOrigins = raw.split(',').map(s => s.trim()).filter(Boolean);

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests like curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
}));

let quotes = [
  { id: 1, text: "The only limit to our realization of tomorrow is our doubts of today.", author: "F. D. Roosevelt" },
  { id: 2, text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" }
];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/quotes', (req, res) => {
  res.json(quotes);
});

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

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;
app.listen(PORT, HOST, () => console.log(`BDL API listening on ${HOST}:${PORT}`));
