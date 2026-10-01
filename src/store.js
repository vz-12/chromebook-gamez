/* ===========================================================================
   THE STORE — a small key/value blob store over Cloudflare D1.

   The leaderboard was written against Netlify Blobs, and everything it does
   rests on two promises that store made: a read sees the last write, and a
   write can be made conditional on nobody else having written since. D1 keeps
   both — it has one primary and read replication is off, so every query sees
   the latest commit, and an UPDATE ... WHERE etag = ? is a compare-and-swap
   that SQLite applies atomically.

   So this module speaks exactly the dialect the callers already used —
   get, getWithMetadata, setJSON with onlyIfMatch / onlyIfNew, delete — and
   none of the code above it had to learn a new way of being careful.

   One table holds every store; `store` is part of the key so the rooms and
   the leaderboard never see each other's rows. A D1 row tops out at 2 MB,
   which is far more than any document here needs.
   ========================================================================= */
const SCHEMA = `CREATE TABLE IF NOT EXISTS blobs (
  store   TEXT    NOT NULL,
  key     TEXT    NOT NULL,
  value   TEXT    NOT NULL,
  etag    TEXT    NOT NULL,
  updated INTEGER NOT NULL,
  PRIMARY KEY (store, key)
)`;

/* The table is made on first use rather than by a separate setup step, so a
   fresh database — or a local one under `wrangler dev` — just works. Once per
   isolate: after the first success every later call is a resolved promise. */
let ready = null;
function ensureTable(db) {
  if (!ready) ready = db.prepare(SCHEMA).run().catch(e => { ready = null; throw e; });
  return ready;
}

const newEtag = () => '"' + crypto.randomUUID() + '"';

const decode = (text, opts) =>
  opts && opts.type === 'json' ? JSON.parse(text) : text;

export function getStore(env, name) {
  const db = env && env.DB;
  if (!db) throw new Error('no D1 database is bound as DB');

  const row = async key => {
    await ensureTable(db);
    return db.prepare('SELECT value, etag FROM blobs WHERE store = ?1 AND key = ?2')
      .bind(name, key).first();
  };

  return {
    async get(key, opts) {
      const r = await row(key);
      return r ? decode(r.value, opts) : null;
    },

    async getWithMetadata(key, opts) {
      const r = await row(key);
      return r ? { data: decode(r.value, opts), etag: r.etag } : null;
    },

    /* Unconditional, onlyIfNew (create, never overwrite) or onlyIfMatch
       (overwrite only the version you read). `modified` says whether it
       landed; a refused conditional write is not an error, it is the signal
       to re-read and try again. */
    async setJSON(key, value, opts = {}) {
      await ensureTable(db);
      const text = JSON.stringify(value);
      const etag = newEtag();
      const now = Date.now();
      let stmt;
      if (opts.onlyIfMatch) {
        stmt = db.prepare(`UPDATE blobs SET value = ?1, etag = ?2, updated = ?3
                           WHERE store = ?4 AND key = ?5 AND etag = ?6`)
          .bind(text, etag, now, name, key, String(opts.onlyIfMatch));
      } else if (opts.onlyIfNew) {
        stmt = db.prepare(`INSERT INTO blobs (store, key, value, etag, updated)
                           VALUES (?1, ?2, ?3, ?4, ?5)
                           ON CONFLICT (store, key) DO NOTHING`)
          .bind(name, key, text, etag, now);
      } else {
        stmt = db.prepare(`INSERT INTO blobs (store, key, value, etag, updated)
                           VALUES (?1, ?2, ?3, ?4, ?5)
                           ON CONFLICT (store, key) DO UPDATE SET
                             value = excluded.value, etag = excluded.etag,
                             updated = excluded.updated`)
          .bind(name, key, text, etag, now);
      }
      const res = await stmt.run();
      const modified = !!(res && res.meta && res.meta.changes > 0);
      return { modified, etag: modified ? etag : undefined };
    },

    async delete(key) {
      await ensureTable(db);
      await db.prepare('DELETE FROM blobs WHERE store = ?1 AND key = ?2').bind(name, key).run();
    },

    /* Drops every row in this store not written for `ms`. Blobs never needed
       this; a database with a size allowance does, for data like signalling
       rooms that is worthless minutes after it was written. */
    async prune(ms) {
      await ensureTable(db);
      await db.prepare('DELETE FROM blobs WHERE store = ?1 AND updated < ?2')
        .bind(name, Date.now() - ms).run();
    }
  };
}
