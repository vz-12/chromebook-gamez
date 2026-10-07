/* ===========================================================================
   A Durable Object namespace for the tests, in plain Node: only the part of
   the platform PvP's objects use (pvp/src/objects.js).

     idFromName, get(id).fetch    one instance per name, made on first use,
                                  requests handed to its fetch() one at a time
                                  (as the platform's input gate does)
     ctx.storage                  get (a key, or up to 128 of them: a Map of
                                  those it has), put, delete, deleteAll, and
                                  the alarm: setAlarm, getAlarm, deleteAlarm.
                                  Values are copied in and out, as storage
                                  would.
     ns.reads, ns.writes          keys read and written, all objects together
                                  (the relay answers viewers from memory)
     ns.alarms(now)               fire every alarm due by `now` (the tests
                                  move Date.now themselves)
     ns.evict(name)               the object goes out of memory, as the
                                  platform's do when idle: the next request
                                  meets a new one over the same storage

   Like scripts/lib/d1-sqlite.mjs: the objects' own code runs untouched; only
   the platform underneath is a stand-in.
   ========================================================================= */
const copy = v => (v === undefined ? undefined : structuredClone(v));

export function makeNamespace(Cls, env) {
  const inst = new Map();
  const count = { reads: 0, writes: 0 };

  function make(name) {
    const data = new Map();
    const o = { name, data, alarm: null, queue: Promise.resolve() };
    const ctx = {
      id: { name, toString: () => name },
      storage: {
        get: async k => {
          if (!Array.isArray(k)) { count.reads++; return copy(data.get(k)); }
          if (k.length > 128) throw new Error('get: 128 keys at most');
          count.reads += k.length;
          return new Map(k.filter(x => data.has(x)).map(x => [x, copy(data.get(x))]));
        },
        put: async (k, v) => { count.writes++; data.set(k, copy(v)); },
        delete: async k => data.delete(k),
        deleteAll: async () => { data.clear(); o.alarm = null; },
        getAlarm: async () => o.alarm,
        setAlarm: async t => { o.alarm = +t; },
        deleteAlarm: async () => { o.alarm = null; }
      },
      blockConcurrencyWhile: async f => f(),
      waitUntil() {}
    };
    o.ctx = ctx;
    o.obj = new Cls(ctx, typeof env === 'function' ? env() : env);
    inst.set(name, o);
    return o;
  }
  // one request or alarm at a time per object
  const serial = (o, f) => (o.queue = o.queue.then(f, f));

  return {
    idFromName: name => ({ name, toString: () => name }),
    get(id) {
      const name = String(id);
      return {
        fetch: (input, init) => {
          const o = inst.get(name) || make(name);
          const req = input instanceof Request ? input : new Request(input, init);
          return serial(o, () => o.obj.fetch(req));
        }
      };
    },
    instances: inst,
    evict(name) {
      const o = inst.get(String(name));
      if (o) o.obj = new Cls(o.ctx, typeof env === 'function' ? env() : env);
    },
    get reads() { return count.reads; },
    get writes() { return count.writes; },
    async alarms(now = Date.now()) {
      let n = 0;
      for (const o of inst.values())
        if (o.alarm !== null && o.alarm <= now) { o.alarm = null; n++; await serial(o, () => o.obj.alarm()); }
      return n;
    }
  };
}
