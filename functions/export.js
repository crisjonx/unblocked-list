export async function onRequestGet(context) {
  const { env } = context;

  try {
    const list = await readList(env);
    const text = list.map(v => JSON.stringify(v)).join('\n') + (list.length ? '\n' : '');

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="suggestions.jsonl"',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(err?.message || 'Failed to export suggestions.', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });
  }
}

async function readList(env) {
  if (!env.SUGGESTIONS) return [];
  const existing = await env.SUGGESTIONS.get('suggestions', { type: 'json' });
  return Array.isArray(existing) ? existing : [];
}
