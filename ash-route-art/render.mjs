// Renders one of this folder's sheets to a PNG, at 2x (3840x2160).
//   node ash-route-art/render.mjs ash-route-art/crawlers.html crawlers.png
// Needs Playwright with Chromium: a local install, or a global one on NODE_PATH.
import { createRequire } from 'module';
import { resolve } from 'path';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.error('Playwright not found: npm i -D playwright && npx playwright install chromium'); process.exit(1);
}
const [, , src, out] = process.argv;
if (!src || !out) { console.error('usage: node render.mjs <sheet.html> <out.png>'); process.exit(1); }
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.error('page error:', e.message));
await p.goto('file://' + resolve(src));
await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
await p.locator('canvas').screenshot({ path: out });
await b.close();
console.log('wrote', out);
