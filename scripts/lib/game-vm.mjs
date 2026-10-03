/* The game, without a browser: index.html's script loaded into a bare
   JavaScript context where the canvas, the DOM, audio, storage and the
   network are stubs. Enough of a browser for the game to load, step and draw
   (to nowhere), so the tests can play it in plain Node with no packages.

     const g = loadGame('index.html', { w: 1280, h: 720, search: '?beta=1' });
     g.run('update(1 / 60)');            // code in the game's own scope
     g.ctx.someGlobal                     // its globals (lexical ones through run())
     canvasCalls()                        // how many canvas calls drawing has made */
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const noop = () => {};
let ctxCalls = 0;                                // canvas calls made: proof the drawing really ran
export const canvasCalls = () => ctxCalls;
const CTX_DEFAULTS = {
  globalAlpha: 1, lineWidth: 1, font: '10px sans-serif', fillStyle: '#000', strokeStyle: '#000',
  globalCompositeOperation: 'source-over', textAlign: 'start', textBaseline: 'alphabetic',
  letterSpacing: '0px', filter: 'none', imageSmoothingEnabled: true, shadowBlur: 0, shadowColor: '#000',
  shadowOffsetX: 0, shadowOffsetY: 0, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, lineDashOffset: 0,
  direction: 'ltr', fontKerning: 'auto',
};
const gradient = { addColorStop: noop };
const matrix = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, invertSelf() { return this; }, inverse() { return this; },
  multiply() { return this; }, translate() { return this; }, scale() { return this; }, rotate() { return this; },
  transformPoint: p => ({ x: p.x, y: p.y }) });
function makeCtx(canvas) {
  const t = Object.assign({}, CTX_DEFAULTS);
  const fns = {
    measureText: s => ({ width: String(s).length * 7, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2,
                         actualBoundingBoxLeft: 0, actualBoundingBoxRight: String(s).length * 7 }),
    getImageData: (x, y, w, h) => { w = Math.max(1, w | 0); h = Math.max(1, h | 0); return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    createImageData: (w, h) => { if (typeof w === 'object') { h = w.height; w = w.width; } w = Math.max(1, w | 0); h = Math.max(1, h | 0); return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    createLinearGradient: () => gradient, createRadialGradient: () => gradient, createConicGradient: () => gradient,
    createPattern: () => ({ setTransform: noop }),
    getTransform: matrix, isPointInPath: () => false, isPointInStroke: () => false, getLineDash: () => [],
  };
  return new Proxy(t, {
    get(o, k) { if (k === 'canvas') return canvas; if (k in fns) { ctxCalls++; return fns[k]; } if (k in o) return o[k]; ctxCalls++; return noop; },
    set(o, k, v) { o[k] = v; return true; },
  });
}
function makeEl(tag = 'div') {
  return { tagName: String(tag).toUpperCase(), style: {}, children: [], dataset: {},
    appendChild(c) { this.children.push(c); return c; }, removeChild: noop, remove: noop, insertBefore(c) { return c; },
    setAttribute: noop, getAttribute: () => null, addEventListener: noop, removeEventListener: noop,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    focus: noop, blur: noop, click: noop, querySelector: () => null, querySelectorAll: () => [] };
}
function makeCanvas() {
  const c = makeEl('canvas');
  c.width = 300; c.height = 150;
  const ctx = makeCtx(c);
  c.getContext = () => ctx;
  c.toDataURL = () => 'data:,';
  c.toBlob = cb => cb && cb(null);
  c.getBoundingClientRect = () => ({ left: 0, top: 0, right: c.width, bottom: c.height, width: c.width, height: c.height });
  return c;
}
function makeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); },
           clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } };
}
export function makeWindow(w, h, search = '') {
  const els = {};
  const document = {
    getElementById: id => els[id] || (els[id] = id === 'c' ? makeCanvas() : makeEl()),
    createElement: tag => (String(tag).toLowerCase() === 'canvas' ? makeCanvas() : makeEl(tag)),
    createElementNS: (ns, tag) => makeEl(tag), createTextNode: () => makeEl('#text'),
    body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
    addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
    fonts: { load: () => Promise.resolve([]), ready: Promise.resolve(), add: noop, check: () => true, forEach: noop },
    hidden: false, visibilityState: 'visible', title: '', cookie: '', referrer: '',
  };
  class Img { constructor() { this.width = 0; this.height = 0; this.complete = false; } set src(v) { this._src = v; } get src() { return this._src; } addEventListener() {} decode() { return Promise.resolve(); } }
  class FontFace { constructor(n) { this.family = n; } load() { return Promise.resolve(this); } }
  class Obs { observe() {} unobserve() {} disconnect() {} }
  const win = {
    document, innerWidth: w, innerHeight: h, devicePixelRatio: 1, screen: { width: 1920, height: 1080 },
    localStorage: makeStorage(), sessionStorage: makeStorage(),
    navigator: { userAgent: 'node test', language: 'en-US', languages: ['en-US'], maxTouchPoints: 0, onLine: true,
                 clipboard: { writeText: async () => {} }, getGamepads: () => [] },
    location: { hostname: 'localhost', host: 'localhost', origin: 'http://localhost', href: 'http://localhost/' + search,
                protocol: 'http:', pathname: '/', search, hash: '', replace: noop, reload: noop, assign: noop },
    history: { replaceState: noop, pushState: noop },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true,
    requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
    requestIdleCallback: () => 0, cancelIdleCallback: noop,
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,   // nothing runs on the wall clock here
    fetch: () => Promise.reject(new Error('offline')),
    Image: Img, FontFace, ResizeObserver: Obs, IntersectionObserver: Obs, MutationObserver: Obs,
    OffscreenCanvas: class { constructor(w2, h2) { const c = makeCanvas(); c.width = w2; c.height = h2; return c; } },
    Event: class { constructor(type, o) { this.type = type; Object.assign(this, o || {}); } preventDefault() {} stopPropagation() {} },
    performance: globalThis.performance, crypto: webcrypto, console,
    URL, URLSearchParams, Blob, TextEncoder, TextDecoder, atob, btoa, structuredClone, queueMicrotask,
    Promise, Math, JSON, Date, Intl,
  };
  win.KeyboardEvent = win.MouseEvent = win.TouchEvent = win.Event;
  win.window = win.self = win.globalThis = win.top = win.parent = win;
  return win;
}

const cache = new Map();
// the game's script, compiled once, and its text (the game reads its own: buildId, snapScan)
export function gameScript(idx) {
  if (!cache.has(idx)) {
    const html = fs.readFileSync(idx, 'utf8').replace(/\r\n/g, '\n');
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    const code = scripts.reduce((a, b) => (b.length > a.length ? b : a));
    cache.set(idx, { code, script: new vm.Script(code, { filename: 'index.html' }) });
  }
  return cache.get(idx);
}
// one copy of the game, in a context of its own
export function loadGame(idx, { w = 1280, h = 720, search = '' } = {}) {
  const win = makeWindow(w, h, search);
  const ctx = vm.createContext(win);
  const t0 = Date.now();
  const g = gameScript(idx);
  win.document.currentScript = { text: g.code, textContent: g.code };   // as a browser has it while the script runs
  g.script.runInContext(ctx);
  win.document.currentScript = null;
  return { win, ctx, loadMs: Date.now() - t0, run: (code, name) => vm.runInContext(code, ctx, { filename: name || 'test' }) };
}
