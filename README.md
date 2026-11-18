# KONNER'S 30TH · Player 1 Levels Up

A mobile-first, undersea video-game party site. Guests pick a sea creature, swim through the dive collecting birthday "treats"
(one per itinerary stop), RSVP to each, then submit for a certificate and a finishing place (Konner is always 1st 👑).

```
index.html     ← the whole game (edit the CONFIG block near the top of the <script> to change text, times, homes)
api/rsvp.js    ← saves RSVPs to Upstash Redis (and locks a creature once they submit)
api/snacks.js  ← shared Snack Attack leaderboard
api/reset.js   ← host-only "wipe everything" button (needs ADMIN_KEY)
```

## Deploy to Vercel (about 10 minutes; easiest from a computer)

**1. Put the files on GitHub**
1. github.com → **New repository** → name it `konner30` → **Private** → Create.
2. Click **uploading an existing file** and drag in `index.html`, `README.md` **and the whole `api` folder**. Commit.

**2. Create the Vercel project**
1. vercel.com → **Add New… → Project** → import `konner30`. Framework preset: **Other**. **Deploy**.
2. You'll get a link like `konner30.vercel.app` (rename under Settings → Domains if you like).

**3. Turn on saving (required for 2+ phones to see each other)**
1. Project → **Storage** → **Create Database** → **Upstash → Redis** (free) → **Connect** to the project.
2. Project → **Settings → Environment Variables** → add `ADMIN_KEY` = any secret word (e.g. `bubbles4konner`). This turns on the reset button.
3. **Deployments** → latest → **⋯ → Redeploy**.
4. Open the site and pick a creature. No orange "Preview mode" banner = saving is live. ✅

## Test with two phones
- Open the link on phone A and phone B. Pick different creatures, RSVP, throw snacks.
- Phone B should see phone A's creature hovering around the treats it said yes to, its RSVPs on 📋 Party board, and shared snack scores.
- Finish a dive on phone A and submit: phone B's creature list shows phone A's medal, and tapping it opens the certificate (read-only).

## Wipe all test data before sending to friends
1. Open `https://<your-site>/api/reset?key=<your ADMIN_KEY>` → tap **🧹 Yes, wipe everything**.
   This deletes every RSVP, every submitted dive/award (so places start fresh) and the snack leaderboard.
2. On each phone you tested with, open `https://<your-site>/?fresh` once. That clears the phone's own leftovers
   (last-picked creature, mini-game progress, intro "seen" flag).
3. Optional: delete the `ADMIN_KEY` variable afterwards so the reset link stops working.

(Manual alternative: Vercel → Storage → your Redis DB → Data Browser → delete `konner30:rsvps` and `konner30:snacks`.)

## Editing later
Edit `index.html` on GitHub (pencil icon) → Commit. Vercel redeploys in ~30 seconds.
- **Homes:** in `CHARS`, add `home:{label:'Hayes & Steiner', lat:37.7757, lng:-122.4337}`. Use cross streets, not exact addresses: the site is public.
- **Times / descriptions:** edit the `STOPS` list. If you add or rename a stop or creature, also update the lists at the top of `api/rsvp.js` and `api/snacks.js`.

## Notes
- Honor system: anyone with the link can pick any creature. Fine for friends; just don't post it publicly.
- Music starts on the first tap (browsers block sound before that). 🔊 buttons mute it.
