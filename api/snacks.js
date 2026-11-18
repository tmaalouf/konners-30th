// Shared Snack Attack leaderboard: how many snacks each party sea creature has eaten, across everyone's games.
// GET  /api/snacks          -> { counts: { [characterId]: number } }
// POST /api/snacks {add:{}} -> adds a small batch of eats, returns the new counts

const CHARS = ['bday', 'helbot', 'perales', 'bones', 'sav', 'kimmy', 'rachel', 'susy', 'gierts', 'teb'];
const KEY = 'konner30:snacks';
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
async function counts() {
  const arr = (await redis(['HGETALL', KEY])) || [];
  const out = {};
  for (let i = 0; i < arr.length; i += 2) out[arr[i]] = Number(arr[i + 1]) || 0;
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) return res.status(503).json({ error: 'storage_not_configured' });
  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body || '{}');
      const add = (body && body.add) || {};
      for (const [c, n] of Object.entries(add)) {
        const k = Math.min(25, Math.max(0, Math.floor(Number(n) || 0)));   // small batches only, no cheating the board
        if (CHARS.includes(c) && k > 0) await redis(['HINCRBY', KEY, c, k]);
      }
    } else if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }
    return res.status(200).json({ counts: await counts() });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
