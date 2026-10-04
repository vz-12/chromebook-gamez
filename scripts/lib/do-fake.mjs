/* ===========================================================================
   A Durable Object namespace for the tests, in plain Node: only the part of
   the platform PvP's objects use (pvp/src/objects.js).

     idFromName, get(id).fetch    one instance per name, made on first use,
                                  requests handed to its fetch() one at a time
                                  (as the platform's input gate does)
     ctx.storage                  get, put, delete, deleteAll, and the alarm:
                                  setAlarm, getAlarm, deleteAlarm. Values are
                                  copied in and out, as storage would.
     ns.alarms(now)               fire every alarm due by `now` (the tests
                                  move Date.now themselves)

   Like scripts/lib/d1-sqlite.mjs: the objects' own code runs untouched; only
   the platform underneath is a stand-in.
   ========================================================================= */
const copy = v => (v === undefined ? undefined : structuredClone(v));

export function makeNamespace(Cls, env) {
  const inst = new Map();

  function make(name) {
    const data = new Map();
    const o = { name, data, alarm: null, queue: Promise.resolve() };
    const ctx = {
      id: { name, toString: () => name },
      storage: {
        get: async k => copy(data.get(k)),
        put: async (k, v) => { data.set(k, copy(v)); },
        delete: async k => data.delete(k),
        deleteAll: async () => { data.clear(); o.alarm = null; },
        getAlarm: async () => o.alarm,
        setAlarm: async t => { o.alarm = +t; },
        deleteAlarm: async () => { o.alarm = null; }
      },
      blockConcurrencyWhile: async f => f(),
      waitUntil() {}
    };
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
    async alarms(now = Date.now()) {
      let n = 0;
      for (const o of inst.values())
        if (o.alarm !== null && o.alarm <= now) { o.alarm = null; n++; await serial(o, () => o.obj.alarm()); }
      return n;
    }
  };
}
