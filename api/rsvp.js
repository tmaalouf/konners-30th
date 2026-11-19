// Vercel serverless function: stores RSVPs in Upstash Redis (added from Vercel → Storage).
// GET  /api/rsvp            -> { data: { [characterId]: { [stopId]: entry } } }
// POST /api/rsvp {c,s,entry} -> saves one character's answer for one stop

const CHARS = ['bday', 'helbot', 'perales', 'bones', 'sav', 'kimmy', 'rachel', 'susy', 'gierts', 'teb'];
const STOPS = ['brunch', 'ggp', 'secret', 'movie', 'nap', 'concert', 'dance', 'done'];
const STATUSES = ['yes', 'maybe', 'no', 'sober'];
const VOTES = ['fiorella', 'marnee', 'whatever', 'beach', 'shrooms', 'either'];
const KEY = 'konner30:rsvps';

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

function clean(entry) {
  const out = { t: Date.now() };
  if (entry && STATUSES.includes(entry.s)) out.s = entry.s;
  const x = (entry && entry.x) || {};
  const cx = {};
  if (typeof x.watched === 'boolean') cx.watched = x.watched;
  if (typeof x.ticket === 'boolean') cx.ticket = x.ticket;
  if (VOTES.includes(x.vote)) cx.vote = x.vote;
  if (Object.keys(cx).length) out.x = cx;
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(503).json({ error: 'storage_not_configured' });
  }
  try {
    if (req.method === 'GET') {
      const arr = (await redis(['HGETALL', KEY])) || [];
      const data = {};
      for (let i = 0; i < arr.length; i += 2) {
        const [c, s] = String(arr[i]).split('|');
        try {
          (data[c] = data[c] || {})[s] = JSON.parse(arr[i + 1]);
        } catch (_) { /* skip bad row */ }
      }
      return res.status(200).json({ data });
    }
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body || '{}');
      const { c, s, entry } = body || {};
      if (!CHARS.includes(c) || !STOPS.includes(s)) {
        return res.status(400).json({ error: 'bad_request' });
      }
      // Once a character submits ('done'), their answers are locked for good.
      const done = await redis(['HGET', KEY, `${c}|done`]);
      if (done) {
        if (s === 'done') return res.status(200).json({ ok: true, entry: JSON.parse(done) });
        return res.status(409).json({ error: 'locked' });
      }
      const saved = clean(entry);
      if (s === 'done') saved.s = 'yes';
      await redis(['HSET', KEY, `${c}|${s}`, JSON.stringify(saved)]);
      return res.status(200).json({ ok: true, entry: saved });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
