// Host-only reset: wipes every RSVP, submission/award and the snack leaderboard.
// Turn it on by adding an ADMIN_KEY environment variable in Vercel (any secret word you choose), then open:
//   https://<your-site>/api/reset?key=<ADMIN_KEY>
// It shows a confirm button first; nothing is deleted until you press it.

const KEYS = ['konner30:rsvps', 'konner30:snacks'];
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}
const page = (body) => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset</title>
<style>body{font-family:system-ui,sans-serif;background:#05213d;color:#f0f8ff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:20px}
button{font-size:18px;padding:14px 22px;background:#ff5a5f;color:#fff;border:0;border-radius:10px}a{color:#5ad1ff}</style></head><body><div>${body}</div></body></html>`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const adminKey = process.env.ADMIN_KEY;
  const given = (req.query && req.query.key) || '';
  if (!adminKey) return res.status(404).send(page('<h2>Reset is turned off</h2><p>Add an ADMIN_KEY environment variable in Vercel to turn it on.</p>'));
  if (given !== adminKey) return res.status(401).send(page('<h2>Wrong key</h2>'));
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).send(page('<h2>Storage not connected yet</h2>'));
  try {
    if (req.method === 'POST') {
      for (const k of KEYS) await redis(['DEL', k]);
      return res.status(200).send(page('<h2>🧹 All clear!</h2><p>Every RSVP, award and snack score is gone. The site is fresh for your friends.</p><p><a href="/?fresh">Open the site (and clear this phone too)</a></p>'));
    }
    const rows = (await redis(['HLEN', 'konner30:rsvps'])) || 0;
    return res.status(200).send(page(`<h2>Reset Konner's 30th?</h2><p>This deletes all ${rows} saved answers, every submitted dive and award, and the snack leaderboard. It can't be undone.</p>
      <form method="post"><button type="submit">🧹 Yes, wipe everything</button></form>`));
  } catch (e) {
    return res.status(500).send(page('<h2>Something went wrong</h2><p>Try again in a minute.</p>'));
  }
};
