#!/usr/bin/env node
// Browser acceptance of the Chapter 2 (Biology Park) production art (docs/102; public docs/108) in the
// real game, Chromium and Firefox. Every save is a real playthrough (game/qa/ch02_routes.js: real
// Prologue and House routes, real dice): no invented inventory, flags or dice.
//
//   tour   real Chapter 2 routes chosen to cover every scene, both conversation layer pairs and all
//          five deaths. At every settled step the DOM art layers equal what Rules.view selects for the
//          game's own state; the first time each image appears its pixels on screen are compared with
//          the source PNG (scene 4x NEAREST; conversation background + pose 1:1 at the portrait
//          offset); each fatal ending opens its death popup with its own image, native 314x206 drawn
//          at exactly 2x, pixel-compared, with RETRY / CHECKPOINT available.
//   kits   each antidote kit's Focus A close-up (564x278) when the kit is opened: bound in the portrait layer
//          and shown, visible and unscaled, in the 565x451 Scene Pickup window (docs/103).
//   items  each Chapter 2 item's 96x96 inventory slot and 565x451 inspect art, from real saves.
//   NODE_PATH=<playwright install> node game/qa/run_ch02_art_qa.js
// Writes game/qa/ch02_art_qa_results.json and game/qa/ch02_art_screenshots/ (not committed).
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createRequire } = require('module');
const ROOT = path.resolve(__dirname, '../..');
const R = require('./ch02_routes.js');
const Rules = R.Rules;
const story = require('../content/story.generated.js').story;
const DEATHS = require('../content/death-presentations.generated.js');
const PROV = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/biology_park.provenance.json'), 'utf8'));
let pw;
try { pw = createRequire(__filename)('playwright'); } catch (_) { console.error('Playwright required; set NODE_PATH to its installation directory'); process.exit(2); }
const OUT = path.join(__dirname, 'ch02_art_screenshots');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'cyoa-save:' + story.id;
const results = [];
function check(browser, scenario, name, ok, detail) {
  results.push({ browser, scenario, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + browser + ' / ' + scenario + '] ' + name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 700)));
}
const save = (s) => Rules.serialize(story, s, { presented: s.transcript.length });
const A = story.assets;

// Planning (Node, rules only) ------------------------------------------------------------------------
// The images a state shows: scene (or its replacement state) + overlay, conversation layers.
function shows(s) {
  const v = Rules.view(story, s), out = [], sa = v.sceneArt || {};
  out.push(sa.replace ? A.sceneStates[v.scene].find((x) => x.id === sa.replace).path : A.scenes[v.scene]);
  if (sa.overlay) out.push(A.sceneStates[v.scene].find((x) => x.id === sa.overlay).path);
  if (v.mode === 'dialogue' && v.portrait && !v.portrait.view) { const p = A.portraits[v.portrait.id]; out.push(p.backgrounds[v.portrait.background], p.poses[v.portrait.pose]); }
  return out;
}
const TOUR_TARGET = new Set(PROV.images.filter((r) => ['scene', 'portrait-background', 'portrait', 'death-screen'].includes(r.kind)).map((r) => r.path));
const candidates = [];
for (const r of R.ROUTES) {
  if (r.steps.some((x) => typeof x !== 'string')) continue;
  const f = R.findSeed(story, r);
  if (!f) throw new Error('no seed for ' + r.name);
  let s = f.entry; const covers = new Set(shows(s));
  for (const st of r.steps) { s = Rules.step(story, s, { choice: st }).state; shows(s).forEach((p) => covers.add(p)); }
  const death = r.fatal ? DEATHS.entries.find((e) => e.when.end === s.chapter + ':' + s.node) : null;
  if (death && death.art) covers.add(death.art.path);
  candidates.push({ r, f, covers: [...covers].filter((p) => TOUR_TARGET.has(p)), death });
}
const TOUR = [];
const left = new Set(TOUR_TARGET);
while (left.size) {
  const best = candidates.map((c) => ({ c, n: c.covers.filter((p) => left.has(p)).length })).sort((a, b) => b.n - a.n)[0];
  if (!best || !best.n) throw new Error('tour cannot cover: ' + [...left].join(', '));
  TOUR.push(best.c); best.c.covers.forEach((p) => left.delete(p));
}
// Kits: the real state just before the kit is opened (spore-infected, take lifecycle, cured).
const KITS = ['public', 'maintenance', 'customs'].map((src) => {
  const r = R.KIT_ROUTES.find((x) => x.kit === src && x.lifecycle === 'take' && x.infection === 'spore' && x.cure);
  const f = R.findSeed(story, r); const k = R.KIT[src];
  return { src, r, k, pre: R.stepAll(story, f.entry, r.steps.slice(0, r.steps.indexOf(k.open))), focus: A.focus[Rules.view(story, R.stepAll(story, f.entry, r.steps.slice(0, r.steps.indexOf(k.open) + 1))).focus] };
});
// Items: the first real state, on any route, that holds the item at a node where the player can act.
const CH2_ITEMS = ['botanical_antidote_public', 'botanical_antidote_maintenance', 'botanical_antidote_customs', 'certified_seed_canister', 'acting_director_badge'];
const ITEMS = CH2_ITEMS.map((id) => {
  for (const r of R.ROUTES.concat(R.KIT_ROUTES)) {
    const f = R.findSeed(story, r); if (!f) continue;
    let s = f.entry;
    for (const st of r.steps) {
      s = Rules.step(story, s, typeof st === 'string' ? { choice: st } : st).state;
      const v = Rules.view(story, s);
      if (s.inventory.includes(id) && !v.end && v.cards.length && !v.scenePickup) return { id, route: r.name, s };
    }
  }
  throw new Error('no real route holds ' + id);
});

// Browser helpers -------------------------------------------------------------------------------------
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const file = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}
// Until the player can act (or, with allowOpen, the death popup is up). Typing is skipped and
// presentation-only CONTINUE cards are taken.
async function settle(page, allowOpen) {
  for (let i = 0; i < 60; i++) {
    await page.waitForFunction((open) => {
      if (open && document.body.dataset.endPresentation) return true;
      const p = document.body.dataset.phase;
      if (p === 'typing') window.CYOA_GAME.flow.skip();
      return p === 'choosing';
    }, !!allowOpen, { timeout: 30000, polling: 40 });
    if (allowOpen && await page.evaluate(() => !!document.body.dataset.endPresentation)) return;
    const cont = await page.evaluate(() => !window.CYOA_GAME.ui.inspector && window.CYOA_GAME.ui.cards.length === 1 && window.CYOA_GAME.ui.cards[0].id === '__continue');
    if (!cont) return;
    await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
  }
  throw new Error('presentation CONTINUE never ended');
}
async function take(page, id, allowOpen) {
  await settle(page);
  const i = await page.evaluate((x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), id);
  if (i < 0) throw new Error('no card ' + id + ' at ' + await page.evaluate(() => document.body.dataset.node + ' ' + window.CYOA_GAME.ui.cards.map((c) => c.id)));
  await page.evaluate((k) => window.CYOA_GAME.flow.choose(k), i);
  await settle(page, allowOpen);
}
async function load(page, base, raw) {
  await page.goto(base + '/story/storyboard-manifest.json');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, raw]);
  await page.goto(base + '/game/index.html');
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
  await settle(page);
}
// The art layers on screen, and what Rules.view selects for the game's own state (as run_ch01_art_qa).
async function art(page) {
  return page.evaluate(() => {
    const G = window.CYOA_GAME;
    const d = (id) => { const n = document.getElementById(id); return n && n.parentNode ? n.dataset.art || null : null; };
    const portrait = document.getElementById('portrait');
    const dom = { scene: d('sceneArt'), overlay: d('sceneOverlay'), view: d('portraitView'), background: d('portraitBackground'), pose: d('portraitNpc'), focus: d('focusArt'),
      portraitShown: portrait.style.display !== 'none' && getComputedStyle(portrait).display !== 'none' };
    const v = G.flow.view();
    const sa = v.sceneArt;
    const want = { scene: sa.replace ? G.artKey.sceneState(v.scene, sa.replace) : G.artKey.scene(v.scene), overlay: sa.overlay ? G.artKey.sceneState(v.scene, sa.overlay) : null,
      view: null, background: null, pose: null, focus: null, portraitShown: v.mode !== 'narrative' };
    if (v.mode === 'dialogue') {
      if (v.portrait.view) want.view = G.artKey.view(v.portrait.id, v.portrait.view);
      else { want.background = G.artKey.background(v.portrait.id, v.portrait.background); want.pose = G.artKey.pose(v.portrait.id, v.portrait.pose); }
    }
    if (v.mode === 'focus') want.focus = G.artKey.focus(v.focus);
    const imgs = Array.from(document.querySelectorAll('#scene img.art, #portrait img.art'));
    const sized = imgs.every((i) => i.complete && i.naturalWidth > 0 && i.width === i.naturalWidth * (i.closest('#scene') ? 4 : 1) && i.height === i.naturalHeight * (i.closest('#scene') ? 4 : 1));
    const placeholders = document.querySelectorAll('#scene [data-kind*="placeholder"], #portrait [data-kind*="placeholder"], #scene canvas.placeholder, #portrait canvas.placeholder').length;
    return { node: document.body.dataset.node, mode: v.mode, scene: v.scene, portrait: v.portrait, dom, want, sized, placeholders, overlays: document.querySelectorAll('#sceneOverlay').length };
  });
}
const same = (a) => ['scene', 'overlay', 'view', 'background', 'pose', 'focus', 'portraitShown'].every((x) => a.dom[x] === a.want[x]) && a.sized && a.overlays <= 1 && !a.placeholders;
// Pixels on screen vs the source PNGs composited at their display scale (as run_ch01_art_qa): masked by
// the shell frame's own alpha and the development draft stamp. region is an element id.
async function pixels(page, region, layers, exclude) {
  await page.waitForFunction(() => { const n = document.getElementById('itemNotice'); return !n || getComputedStyle(n).display === 'none'; }, null, { timeout: 20000 });
  const box = await page.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, region);
  const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
  return page.evaluate(async ({ b64, layers, box, maskShell, exclude }) => {
    const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('load ' + src.slice(0, 60))); i.src = src; });
    const s = await load('data:image/png;base64,' + b64);
    const W = s.naturalWidth, H = s.naturalHeight;
    const a = document.createElement('canvas'); a.width = W; a.height = H; const ac = a.getContext('2d'); ac.drawImage(s, 0, 0);
    const e = document.createElement('canvas'); e.width = W; e.height = H; const ec = e.getContext('2d'); ec.imageSmoothingEnabled = false;
    for (const l of layers) { const im = await load(l.url + '?px'); ec.drawImage(im, l.x, l.y, im.naturalWidth * l.scale, im.naturalHeight * l.scale); }
    const st = document.getElementById('draftStamp');
    const sr = st && st.style.display !== 'none' ? st.getBoundingClientRect() : null;
    // Controls drawn over the art by design (e.g. the inspector's close button), by their own box.
    const xr = (exclude || []).map((id) => document.getElementById(id)).filter((n) => n && n.getClientRects().length).map((n) => n.getBoundingClientRect());
    const m = document.createElement('canvas'); m.width = W; m.height = H; const mc = m.getContext('2d');
    if (maskShell) { const shell = document.getElementById('shell'); const shr = shell.getBoundingClientRect(); mc.drawImage(await load(shell.currentSrc || shell.src), shr.x - box.x, shr.y - box.y, shr.width, shr.height); }
    const M = mc.getImageData(0, 0, W, H).data, P = ac.getImageData(0, 0, W, H).data, E = ec.getImageData(0, 0, W, H).data;
    let n = 0, bad = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (sr && box.x + x >= sr.left - 1 && box.x + x < sr.right + 1 && box.y + y >= sr.top - 1 && box.y + y < sr.bottom + 1) continue;
      if (xr.some((r) => box.x + x >= r.left - 1 && box.x + x < r.right + 1 && box.y + y >= r.top - 1 && box.y + y < r.bottom + 1)) continue;
      const i = (y * W + x) * 4;
      if (M[i + 3] !== 0) continue;
      n++;
      if (Math.abs(P[i] - E[i]) > 3 || Math.abs(P[i + 1] - E[i + 1]) > 3 || Math.abs(P[i + 2] - E[i + 2]) > 3) bad++;
    }
    return { n, bad, W, H };
  }, { b64: shot.toString('base64'), layers, box, maskShell: region !== 'endArt', exclude });
}
const url = (p) => '/' + p;

async function run(b, base) {
  const browser = await pw[b].launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const seen = new Set();
  async function scenario(id, fn) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
    const C = (n, ok, d) => check(b, id, n, ok, d);
    const px = async (label, region, layers) => { const r = await pixels(page, region, layers); C('pixels: ' + label + ' (' + r.n + ' px compared)', r.n > 1000 && r.bad === 0, r); };
    const shot = (n) => page.screenshot({ path: path.join(OUT, b + '_' + id + (n ? '_' + n : '') + '.png') });
    try { await fn({ page, C, px, shot }); } catch (e) { C('scenario completed', false, e.stack || String(e)); }
    C('no browser or console errors, no failed requests', !errors.length, errors);
    await page.close();
  }
  const offset = (page) => page.evaluate(() => [window.CYOA_GAME.TUNING.portrait.backgroundX, window.CYOA_GAME.TUNING.portrait.backgroundY]);

  // 1. Tour --------------------------------------------------------------------------------------------
  for (const t of TOUR) {
    await scenario(t.r.name, async ({ page, C, px, shot }) => {
      // From the House exit: the game itself crosses into Chapter 2 and records its entry restore point (CHECKPOINT).
      await load(page, base, save(t.f.exit));
      const cont = await page.evaluate(() => window.CYOA_GAME.ui.cards.map((c) => c.id));
      if (cont.length !== 1) throw new Error('House exit save should offer one card, has ' + cont);
      await take(page, cont[0]);
      C('the House exit CONTINUE enters Chapter 2', await page.evaluate(() => window.CYOA_GAME.state.chapter) === 'chapter-02');
      let steps = 0; const mismatches = [];
      const probe = async () => {
        const a = await art(page); steps++;
        if (!same(a)) mismatches.push(a);
        const sceneFile = a.want.scene && (a.want.scene.indexOf('#') === -1 ? A.scenes[a.scene] : A.sceneStates[a.scene].find((x) => 'scene:' + a.scene + '#' + x.id === a.want.scene).path);
        if (sceneFile && TOUR_TARGET.has(sceneFile) && !seen.has(sceneFile) && !a.want.overlay) {
          seen.add(sceneFile);
          await px(sceneFile + ' at 4x', 'scene', [{ url: url(sceneFile), scale: 4, x: 0, y: 0 }]);
          await shot(path.basename(sceneFile, '.png'));
        }
        if (a.mode === 'dialogue' && a.portrait && !a.portrait.view) {
          const p = A.portraits[a.portrait.id], bg = p.backgrounds[a.portrait.background], pose = p.poses[a.portrait.pose];
          if (TOUR_TARGET.has(pose) && !seen.has(pose)) {
            seen.add(pose); seen.add(bg);
            const off = await offset(page);
            await px(a.portrait.id + ' conversation: background + pose 1:1', 'portrait', [{ url: url(bg), scale: 1, x: off[0], y: off[1] }, { url: url(pose), scale: 1, x: off[0], y: off[1] }]);
            await shot(a.portrait.id + '_conversation');
          }
        }
      };
      await probe();
      for (let i = 0; i < t.r.steps.length; i++) { await take(page, t.r.steps[i], t.death && i === t.r.steps.length - 1); if (!(t.death && i === t.r.steps.length - 1)) await probe(); }
      C('every settled step: scene, overlay and conversation layers are exactly the engine\'s selection, decoded at scale, no placeholder (' + steps + ' steps)', !mismatches.length, mismatches.slice(0, 2));
      if (t.death) {
        const d = await page.evaluate(() => { const r = document.getElementById('endPresentation'), i = document.getElementById('endArt');
          return { open: !!document.body.dataset.endPresentation, entry: r && r.dataset.entry, art: r && r.dataset.art, src: i && i.getAttribute('src'), nw: i && i.naturalWidth, nh: i && i.naturalHeight, w: i && i.width, h: i && i.height,
            controls: Array.from(document.querySelectorAll('#endPresentation button')).map((x) => x.dataset.label + ':' + x.dataset.available) }; });
        C(t.death.id + ': death popup opens with its own selected image, native 314x206 drawn at 2x', d.open && d.entry === t.death.id && d.art === 'selected' && /\/?art\/deaths\//.test(d.src || '') && (d.src || '').endsWith(t.death.art.path)
          && d.nw === 314 && d.nh === 206 && d.w === 628 && d.h === 412, d);
        C(t.death.id + ': RETRY and CHECKPOINT available, EXIT unavailable', JSON.stringify(d.controls) === JSON.stringify(['RETRY:true', 'CHECKPOINT:true', 'EXIT:false']), d.controls);
        await px(t.death.art.path + ' at exactly 2x in the popup', 'endArt', [{ url: url(t.death.art.path), scale: 2, x: 0, y: 0 }]);
        seen.add(t.death.art.path);
        await shot('death');
      }
    });
  }
  const tourMissed = [...TOUR_TARGET].filter((p) => !seen.has(p));
  check(b, 'tour', 'every scene, conversation layer and death image was shown and pixel-compared in this browser (' + TOUR_TARGET.size + ')', !tourMissed.length, tourMissed);

  // 2. Kits: Focus A close-up when the kit is opened --------------------------------------------------
  for (const k of KITS) {
    await scenario('kit_' + k.src, async ({ page, C, px, shot }) => {
      await load(page, base, save(k.pre));
      const i = await page.evaluate((x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), k.k.open);
      if (i < 0) throw new Error('no open card at ' + await page.evaluate(() => document.body.dataset.node));
      await page.evaluate((n) => window.CYOA_GAME.flow.choose(n), i);
      await page.waitForFunction(() => { const G = window.CYOA_GAME; if (document.body.dataset.phase === 'typing') G.flow.skip(); return document.body.dataset.mode === 'focus' && document.body.dataset.phase === 'choosing'; }, null, { timeout: 30000, polling: 40 });
      const a = await art(page);
      const img = await page.evaluate(() => { const n = document.getElementById('focusArt'); return n ? { src: n.getAttribute('src'), nw: n.naturalWidth, nh: n.naturalHeight, w: n.width, h: n.height, complete: n.complete } : null; });
      C(k.src + ' kit: the approved Focus A close-up ' + k.focus + ' is the bound portrait layer, decoded native 564x278 at 1:1', a.dom.focus === a.want.focus && img && (img.src || '').endsWith(k.focus) && img.complete && img.nw === 564 && img.nh === 278 && img.w === 564 && img.h === 278 && !a.placeholders, { a: a.dom, want: a.want, img });
      // docs/103 (PMO ruling 2026-11-18): the 565x451 Scene Pickup window shows this approved Focus A close-up,
      // actually visible to the player: no placeholder anywhere, the native image unscaled, and its pixels on
      // screen equal to the source 1:1 over (nearly) its whole area.
      const pk = await page.evaluate(() => { const G = window.CYOA_GAME, a = document.getElementById('inspectArt'), i = document.getElementById('inspectImage');
        return { pickup: !!(G.ui.inspector && G.ui.inspector.scenePickup), kind: a && a.dataset.kind, art: a && a.dataset.art, src: i && i.getAttribute('src'), nw: i && i.naturalWidth, nh: i && i.naturalHeight, w: i && i.width, h: i && i.height,
          placeholders: document.querySelectorAll('[data-kind="scene-pickup-placeholder"], #inspector canvas[data-placeholder]').length }; });
      C(k.src + ' kit: the Scene Pickup window shows the approved Focus A close-up (native 564x278, unscaled), no placeholder', pk.pickup && pk.kind === 'scene-pickup-art' && pk.art === a.want.focus
        && (pk.src || '').endsWith(k.focus) && pk.nw === 564 && pk.nh === 278 && pk.w === 564 && pk.h === 278 && pk.placeholders === 0, pk);
      // Only the inspector's close button (drawn over every inspector's art by design) is excluded, by its own box.
      const vis = await pixels(page, 'inspectImage', [{ url: url(k.focus), scale: 1, x: 0, y: 0 }], ['inspectClose']);
      C(k.src + ' kit: visible on screen: pixels equal the source 1:1 over at least 90% of the image (' + vis.n + ' px compared)', vis.W === 564 && vis.H === 278 && vis.n >= 0.9 * 564 * 278 && vis.bad === 0, vis);
      await shot('focus');
    });
  }

  // 3. Items: inventory slot + inspect art --------------------------------------------------------------
  for (const it of ITEMS) {
    await scenario('item_' + it.id, async ({ page, C, shot }) => {
      await load(page, base, save(it.s));
      const def = story.items[it.id];
      const slot = await page.evaluate(([id, def]) => { const n = document.querySelector('[data-item="' + id + '"]'); const i = n && Array.from(n.querySelectorAll('img')).find((x) => (x.getAttribute('src') || '').endsWith(def));
        return i ? { src: i.getAttribute('src'), nw: i.naturalWidth, nh: i.naturalHeight, complete: i.complete, shown: i.style.display !== 'none' && getComputedStyle(i).display !== 'none' } : null; }, [it.id, def.slotArt]);
      C(it.id + ': inventory slot shows ' + def.slotArt + ' (96x96, displayed)', slot && slot.shown && slot.complete && slot.nw === 96 && slot.nh === 96, slot);
      await page.evaluate((id) => window.CYOA_GAME.flow.toggleInspect(id), it.id);
      await page.waitForFunction(() => { const a = document.getElementById('inspectArt'); return a && a.dataset.kind; }, null, { timeout: 10000 });
      const insp = await page.evaluate(() => { const a = document.getElementById('inspectArt'), i = a.querySelector('img'); return { kind: a.dataset.kind, src: i && i.getAttribute('src'), nw: i && i.naturalWidth, nh: i && i.naturalHeight, complete: i && i.complete }; });
      C(it.id + ': inspector shows ' + def.inspectArt + ' (565x451 art, not a placeholder)', insp.kind === 'art' && (insp.src || '').endsWith(def.inspectArt) && insp.complete && insp.nw === 565 && insp.nh === 451, insp);
      await shot('inspect');
      await page.evaluate(() => window.CYOA_GAME.flow.closeInspector());
    });
  }
  await context.close();
  await browser.close();
}

(async () => {
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browsers = (process.env.BROWSERS || 'chromium,firefox').split(',');
  try { for (const b of browsers) await run(b, base); } finally { server.close(); }
  const failed = results.filter((x) => !x.ok);
  const by = {};
  results.forEach((r) => { by[r.browser] = by[r.browser] || [0, 0]; by[r.browser][1]++; if (r.ok) by[r.browser][0]++; });
  fs.writeFileSync(path.join(__dirname, 'ch02_art_qa_results.json'), JSON.stringify({ schema: 'cyoa-ch02-art-browser-v1', total: results.length, passed: results.length - failed.length,
    tour: TOUR.map((t) => t.r.name), kits: KITS.map((k) => k.r.name), items: ITEMS.map((i) => [i.id, i.route]), results }, null, 1) + '\n');
  console.log('Chapter 2 art in the browser: ' + (results.length - failed.length) + '/' + results.length + ' passed (' + Object.keys(by).map((x) => x + ' ' + by[x][0] + '/' + by[x][1]).join(', ') + ')');
  if (failed.length) process.exitCode = 1;
})().catch((e) => { console.error(e.stack || String(e)); process.exitCode = 1; });
