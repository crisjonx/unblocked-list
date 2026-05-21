export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
    const OPENROUTER_MODEL = env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    const SITE_URL = env.SITE_URL || 'https://crisjonks.github.io/unblocked-list';
    const SITE_NAME = env.SITE_NAME || 'unblocked-list';

    if (!OPENROUTER_API_KEY) {
      return json({ error: 'Missing OPENROUTER_API_KEY binding.' }, 500);
    }

    const body = await request.json();
    const messages = body?.messages;
    const model = body?.model || OPENROUTER_MODEL;

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'messages must be a non-empty array.' }, 400);
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
        model,
        messages,
        stream: false
      })
    });

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || 'Invalid JSON from OpenRouter.' };
    }

    return json(data, response.status);
  } catch (err) {
    return json({ error: err?.message || 'Chat proxy failed.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}
