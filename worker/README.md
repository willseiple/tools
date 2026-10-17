# slop-feedback

Comments and likes for the site, running as a Cloudflare Worker at
`https://slop-feedback.wgseiple.workers.dev` with a D1 database.

- Anyone can comment with just a name and like comments (one like per browser).
- Comments go through a Cloudflare Turnstile bot check and are rate limited per network.
- IP addresses are never stored, only a salted hash used for rate limits.

## Hide a comment

Find its id, then hide it:

```bash
npx wrangler d1 execute slop-feedback --remote --command "SELECT id, app, name, body FROM comments ORDER BY ts DESC LIMIT 20"
```

```bash
curl -X DELETE "https://slop-feedback.wgseiple.workers.dev/comment?id=ID" -H "Authorization: Bearer $(cat ~/.config/slop-feedback/admin-token)"
```

## Deploy

```bash
npx wrangler deploy
```

Secrets: `TURNSTILE_SECRET`, `ADMIN_TOKEN`, `IP_SALT` (set with `npx wrangler secret put`).
To add an app, add its id to `APPS` in `src/index.js` and a `<div class="fb" data-app="id">` to its card.
