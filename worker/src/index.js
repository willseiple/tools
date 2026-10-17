// Ratings and comments for the Vibecoded Slop site (willseiple.github.io/tools).
// Anyone can rate 1-5 stars and comment with just a name. Comments pass a Turnstile check.

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
        const client = clean(url.searchParams.get('client') || '', 64);
        const voter = client ? await hash('v' + client) : '';
        const out = {};
        for (const app of APPS) out[app] = { avg: 0, count: 0, comments: 0, mine: 0 };
        const r = await env.DB.prepare('SELECT app, AVG(stars) avg, COUNT(*) n FROM ratings GROUP BY app').all();
        for (const row of r.results) if (out[row.app]) Object.assign(out[row.app], { avg: Math.round(row.avg * 10) / 10, count: row.n });
        const c = await env.DB.prepare('SELECT app, COUNT(*) n FROM comments WHERE hidden = 0 GROUP BY app').all();
        for (const row of c.results) if (out[row.app]) out[row.app].comments = row.n;
        if (voter) {
          const m = await env.DB.prepare('SELECT app, stars FROM ratings WHERE voter = ?').bind(voter).all();
          for (const row of m.results) if (out[row.app]) out[row.app].mine = row.stars;
        }
        return json(out);
      }

      if (req.method === 'GET' && url.pathname === '/comments') {
        const app = url.searchParams.get('app');
        if (!APPS.has(app)) return json({ error: 'Unknown app.' }, 400);
        const r = await env.DB.prepare('SELECT id, name, body, ts FROM comments WHERE app = ? AND hidden = 0 ORDER BY ts DESC LIMIT 200').bind(app).all();
        return json(r.results);
      }

      if (req.method === 'POST' && url.pathname === '/rate') {
        const { app, stars, client } = await req.json();
        const s = Math.round(Number(stars));
        if (!APPS.has(app) || !(s >= 1 && s <= 5) || typeof client !== 'string' || client.length < 8) return json({ error: 'Bad rating.' }, 400);
        const voter = await hash('v' + clean(client, 64));
        // One network can add at most 5 new voters per app per day; changing your own rating is always fine.
        const existing = await env.DB.prepare('SELECT 1 FROM ratings WHERE app = ? AND voter = ?').bind(app, voter).first();
        if (!existing) {
          const recent = await env.DB.prepare('SELECT COUNT(*) n FROM ratings WHERE app = ? AND iph = ? AND ts > ?').bind(app, iph, now - 86400000).first();
          if (recent.n >= 5) return json({ error: 'Too many ratings from your network today.' }, 429);
        }
        await env.DB.prepare('INSERT INTO ratings (app, voter, stars, iph, ts) VALUES (?, ?, ?, ?, ?) ON CONFLICT(app, voter) DO UPDATE SET stars = excluded.stars, ts = excluded.ts')
          .bind(app, voter, s, iph, now).run();
        const r = await env.DB.prepare('SELECT AVG(stars) avg, COUNT(*) n FROM ratings WHERE app = ?').bind(app).first();
        return json({ avg: Math.round(r.avg * 10) / 10, count: r.n, mine: s });
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
        const r = await env.DB.prepare('INSERT INTO comments (app, name, body, iph, ts) VALUES (?, ?, ?, ?, ?) RETURNING id, name, body, ts')
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
