// Ratings and comments for the Vibecoded Slop site (willseiple.github.io/tools).
// Anyone can comment with just a name and like comments. Comments pass a Turnstile check.

const APPS = new Set(['guitarhud', 'drafter']);
const ORIGINS = [/^https:\/\/willseiple\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.some(r => r.test(origin)) ? origin : 'https://willseiple.github.io',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const json = (data, status = 200) => Response.json(data, { status, headers: cors });

    try {
      const url = new URL(req.url);
      const ip = req.headers.get('CF-Connecting-IP') || '';
      const iph = await hash(env.IP_SALT + ip);
      const now = Date.now();

      if (req.method === 'GET' && url.pathname === '/summary') {
        const out = {};
        for (const app of APPS) out[app] = { comments: 0 };
        const c = await env.DB.prepare('SELECT app, COUNT(*) n FROM comments WHERE hidden = 0 GROUP BY app').all();
        for (const row of c.results) if (out[row.app]) out[row.app].comments = row.n;
        return json(out);
      }

      if (req.method === 'GET' && url.pathname === '/comments') {
        const app = url.searchParams.get('app');
        if (!APPS.has(app)) return json({ error: 'Unknown app.' }, 400);
        const client = clean(url.searchParams.get('client') || '', 64);
        const voter = client ? await hash('v' + client) : '';
        const r = await env.DB.prepare(`SELECT c.id, c.name, c.body, c.ts,
            (SELECT COUNT(*) FROM likes l WHERE l.comment_id = c.id) likes,
            EXISTS(SELECT 1 FROM likes l WHERE l.comment_id = c.id AND l.voter = ?) liked
          FROM comments c WHERE c.app = ? AND c.hidden = 0 ORDER BY c.ts DESC LIMIT 200`).bind(voter, app).all();
        return json(r.results.map(x => ({ ...x, liked: !!x.liked })));
      }

      if (req.method === 'POST' && url.pathname === '/like') {
        const { id, client, on } = await req.json();
        const cid = Number(id);
        if (!Number.isInteger(cid) || typeof client !== 'string' || client.length < 8) return json({ error: 'Bad like.' }, 400);
        const voter = await hash('v' + clean(client, 64));
        if (on) {
          const exists = await env.DB.prepare('SELECT 1 FROM comments WHERE id = ? AND hidden = 0').bind(cid).first();
          if (!exists) return json({ error: 'That comment is gone.' }, 404);
          // One network can add at most 60 likes an hour.
          const recent = await env.DB.prepare('SELECT COUNT(*) n FROM likes WHERE iph = ? AND ts > ?').bind(iph, now - 3600000).first();
          if (recent.n >= 60) return json({ error: 'Too many likes from your network. Try later.' }, 429);
          await env.DB.prepare('INSERT OR IGNORE INTO likes (comment_id, voter, iph, ts) VALUES (?, ?, ?, ?)').bind(cid, voter, iph, now).run();
        } else {
          await env.DB.prepare('DELETE FROM likes WHERE comment_id = ? AND voter = ?').bind(cid, voter).run();
        }
        const r = await env.DB.prepare('SELECT COUNT(*) n FROM likes WHERE comment_id = ?').bind(cid).first();
        return json({ id: cid, likes: r.n, liked: !!on });
      }

      if (req.method === 'POST' && url.pathname === '/comment') {
        const { app, name, body, token } = await req.json();
        const n = clean(name || '', 40) || 'Anonymous';
        const b = clean(body || '', 2000, true);
        if (!APPS.has(app) || !b) return json({ error: 'Write a comment first.' }, 400);
        const ok = await verifyTurnstile(env, token, ip);
        if (!ok) return json({ error: "The bot check didn't pass. Reload the page and try again." }, 403);
        const recent = await env.DB.prepare('SELECT COUNT(*) n FROM comments WHERE iph = ? AND ts > ?').bind(iph, now - 600000).first();
        if (recent.n >= 4) return json({ error: 'Slow down a little. Try again in a few minutes.' }, 429);
        const r = await env.DB.prepare('INSERT INTO comments (app, name, body, iph, ts) VALUES (?, ?, ?, ?, ?) RETURNING id, name, body, ts, 0 AS likes')
          .bind(app, n, b, iph, now).first();
        return json(r);
      }

      if (req.method === 'DELETE' && url.pathname === '/comment') {
        if (!env.ADMIN_TOKEN || req.headers.get('Authorization') !== 'Bearer ' + env.ADMIN_TOKEN) return json({ error: 'Not allowed.' }, 401);
        const id = Number(url.searchParams.get('id'));
        await env.DB.prepare('UPDATE comments SET hidden = 1 WHERE id = ?').bind(id).run();
        return json({ hidden: id });
      }

      return json({ error: 'Not found.' }, 404);
    } catch (e) {
      return json({ error: 'Something went wrong. Try again.' }, 500);
    }
  },
};

function clean(s, max, multiline = false) {
  s = String(s).replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, '');
  if (multiline) s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim().slice(0, max);
}

async function hash(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyTurnstile(env, token, ip) {
  if (!token) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const d = await r.json();
  return d.success === true;
}
