/* ===========================================================================
   MATCHES ON NOW: every match being played, for dev accounts to watch
   (watch.js: GET ?live=1, and POST op air)

   A match notes itself here as it starts (objects.js, Match: a queued one at
   once, a friend's when its guest joins, a practice put on air when it
   opens) and goes when it is decided or expires; one older than NOW_KEEP
   goes too, whatever became of it. A dev watching one that is not on air
   asks its host to start sending (Match, op air), and only then does it
   (onair.js): nothing is sent for a match nobody watches.
   ========================================================================= */
const SCHEMA = `CREATE TABLE IF NOT EXISTS pvp_now (
     match    TEXT    PRIMARY KEY,
     queue    TEXT    NOT NULL,           -- ranked, casual, friend, practice
     league   TEXT,
     names    TEXT    NOT NULL,           -- the two players as they named themselves (JSON); a practice's second is its bot, ''
     pilots   TEXT    NOT NULL,           -- what each flies (JSON)
     hidden   INTEGER NOT NULL DEFAULT 0, -- a hidden pilot in it (hidden.js)
     practice INTEGER NOT NULL DEFAULT 0, -- one player against a bot, put on air to try the broadcast
     started  INTEGER NOT NULL
   )`;
export const NOW_KEEP = 60 * 60 * 1000;
const ready = new WeakSet();
async function ensureNow(db) {
  if (ready.has(db)) return;
  await db.prepare(SCHEMA).run();
  ready.add(db);
}

export async function nowNote(db, m) {
  await ensureNow(db);
  const names = JSON.stringify(m.sides.map(s => (s ? String(s.name || '').slice(0, 24) : '')));
  const pilots = JSON.stringify(m.sides.map(s => (s ? String(s.pilot || '') : '')));
  await db.prepare(`INSERT OR IGNORE INTO pvp_now (match, queue, league, names, pilots, hidden, practice, started)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`)
    .bind(m.id, m.queue || 'friend', m.league || null, names, pilots, m.hidden ? 1 : 0, m.practice ? 1 : 0, m.started || Date.now()).run();
}

export async function nowDrop(db, id) {
  await ensureNow(db);
  await db.prepare('DELETE FROM pvp_now WHERE match = ?1').bind(id).run();
}

// what is on now, newest first: [{ match, queue, league, names, pilots, hidden, practice, started }]
export async function nowList(db, now = Date.now()) {
  await ensureNow(db);
  await db.prepare('DELETE FROM pvp_now WHERE started < ?1').bind(now - NOW_KEEP).run();
  const json = t => { try { const v = JSON.parse(t); return Array.isArray(v) ? v.map(String) : []; } catch (e) { return []; } };
  return ((await db.prepare('SELECT * FROM pvp_now ORDER BY started DESC LIMIT 50').all()).results || [])
    .map(r => ({ match: r.match, queue: r.queue, league: r.league || null, names: json(r.names), pilots: json(r.pilots),
                 hidden: !!r.hidden, practice: !!r.practice, started: r.started }));
}
