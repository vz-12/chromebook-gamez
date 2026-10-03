/* ===========================================================================
   A D1 database for tests, over Node's own SQLite (node:sqlite, Node 22.5+).

   Only the part of D1's API the Workers use: prepare, bind, first, run, all
   and batch. It is a real SQL engine, so constraints, ON CONFLICT and
   compare-and-swap UPDATEs behave as they do on Cloudflare (D1 is SQLite);
   only the network in between is missing. A batch runs as one transaction,
   as D1's does.
   ========================================================================= */
import { DatabaseSync } from 'node:sqlite';

export function makeD1(file = ':memory:') {
  const sql = new DatabaseSync(file);
  const stmt = (text, args = []) => ({
    bind: (...a) => stmt(text, a),
    _run() {
      const s = sql.prepare(text);
      const r = s.run(...args);
      return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
    async first(col) {
      const row = sql.prepare(text).get(...args);
      if (!row) return null;
      return col ? row[col] : { ...row };
    },
    async run() { return this._run(); },
    async all() { return { success: true, results: sql.prepare(text).all(...args).map(r => ({ ...r })) }; }
  });
  return {
    sql,
    prepare: text => stmt(text),
    async batch(list) {
      sql.exec('BEGIN');
      try {
        const out = list.map(s => s._run());
        sql.exec('COMMIT');
        return out;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
    async exec(text) { sql.exec(text); return { count: 1 }; }
  };
}
