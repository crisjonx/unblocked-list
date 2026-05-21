const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const SITE_NAME = process.env.SITE_NAME || 'unblocked-list';

const suggestionsFile = path.join(__dirname, 'suggestions.jsonl');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function appendSuggestion(entry) {
  fs.appendFileSync(suggestionsFile, JSON.stringify(entry) + '\n', 'utf8');
}

app.post('/api/suggestions', (req, res) => {
  try {
    const { name = '', notes = '', page = '', when = new Date().toISOString() } = req.body || {};

    const cleaned = {
      name: String(name).trim(),
      notes: String(notes).trim(),
      page: String(page).trim(),
      when: String(when).trim(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    };

    if (!cleaned.name && !cleaned.notes) {
      return res.status(400).json({ ok: false, error: 'Suggestion is empty.' });
    }

    appendSuggestion(cleaned);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Suggestion save failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to save suggestion.' });
  }
});

app.get('/api/suggestions', (req, res) => {
  try {
    if (!fs.existsSync(suggestionsFile)) {
      return res.json({ ok: true, suggestions: [] });
    }

    const lines = fs
      .readFileSync(suggestionsFile, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        try { return JSON.parse(line); }
        catch { return null; }
      })
      .filter(Boolean);

    return res.json({ ok: true, suggestions: lines });
  } catch (err) {
    console.error('Suggestion read failed:', err);
    return res.status(500).json({ ok: false, error: 'Failed to read suggestions.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: 'Missing OPENROUTER_API_KEY environment variable.'
      });
    }

    const { messages, model } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array.' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-OpenRouter-Title': SITE_NAME
      },
      body: JSON.stringify({
        model: model || OPENROUTER_MODEL,
        messages,
        stream: false
      })
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text };
    }

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (err) {
    console.error('Chat proxy failed:', err);
    return res.status(500).json({ error: 'Chat proxy failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
