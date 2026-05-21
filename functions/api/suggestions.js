export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.SUGGESTIONS) {
      return json({ ok: false, error: 'Missing SUGGESTIONS KV binding.' }, 500);
    }

    const body = await request.json();
    const entry = {
      name: String(body?.name || '').trim(),
      notes: String(body?.notes || '').trim(),
      page: String(body?.page || '').trim(),
      when: String(body?.when || new Date().toISOString()).trim(),
      ua: request.headers.get('user-agent') || '',
      ip: request.headers.get('cf-connecting-ip') || ''
    };

    if (!entry.name && !entry.notes) {
      return json({ ok: false, error: 'Suggestion is empty.' }, 400);
    }

    const list = await readList(env);
    list.unshift(entry);

    await env.SUGGESTIONS.put('suggestions', JSON.stringify(list));

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: err?.message || 'Failed to save suggestion.' }, 500);
  }
}

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const list = await readList(env);
    return json({ ok: true, suggestions: list });
  } catch (err) {
    return json({ ok: false, error: err?.message || 'Failed to load suggestions.' }, 500);
  }
}

async function readList(env) {
  if (!env.SUGGESTIONS) return [];
  const existing = await env.SUGGESTIONS.get('suggestions', { type: 'json' });
  return Array.isArray(existing) ? existing : [];
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
