#!/usr/bin/env node
// Browser acceptance of Chapter 3 (The People's Pavilion, approved reboot; docs/104) in the real game,
// Chromium and Firefox. Every save is a real playthrough (game/qa/ch03_routes.js: real Prologue, House
// and Chapter 2 routes, real dice): no invented inventory, flags or dice.
//
//   tour     real Chapter 3 routes chosen to cover every scene and every conversation (background + pose)
//            pair. Each starts on a real Chapter 2 living ending; the game itself takes that ending's
//            CONTINUE into Chapter 3. At every settled step the DOM art equals Rules.view for the game's
//            own state; the first time each scene / pair appears its pixels on screen are compared with
//            the source PNGs (scene 4x NEAREST, conversation 1:1). Cards and SHOW / USE are taken through
//            the real UI (cards, inventory inspector). Each route ends on its surviving ending: BEGIN
//            AGAIN only, no death popup, no RETRY / CHECKPOINT.
//   voices   the incidental visitor and restroom-system lines carry their NAME: label in the dialogue box
//            and in NOTES; the attendant's own lines carry none
//   glyph    the approved '0%' / '100%' readouts draw a real '%' glyph (ink on the canvas)
//   reload   a mid-Chapter-3 conversation survives a reload (node, art, history with labels)
//   restart  BEGIN AGAIN starts a new playthrough at the Prologue
//   items    missing-item behaviour in the inventory (no photo slot, no SHOW where none is authored)
//   NODE_PATH=<playwright install> node game/qa/run_ch03_qa.js
// Writes game/qa/ch03_qa_results.json and game/qa/ch03_screenshots/ (not committed).
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createRequire } = require('module');
const ROOT = path.resolve(__dirname, '../..');
const C = require('./ch03_routes.js');
const Rules = C.Rules;
const story = require('../content/story.generated.js').story;
const PROV = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/pavilion_reboot.provenance.json'), 'utf8'));
let pw;
try { pw = createRequire(__filename)('playwright'); } catch (_) { console.error('Playwright required; set NODE_PATH to its installation directory'); process.exit(2); }
const OUT = path.join(__dirname, 'ch03_screenshots');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'cyoa-save:' + story.id;
const results = [];
function check(browser, scenario, name, ok, detail) {
  results.push({ browser, scenario, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + browser + ' / ' + scenario + '] ' + name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 700)));
}
const save = (s) => Rules.serialize(story, s, { presented: s.transcript.length });
const A = story.assets;
const input = (st) => (typeof st === 'string' ? { choice: st } : st);

// Planning (Node, rules only) ------------------------------------------------------------------------
function targets(s) {
  const v = Rules.view(story, s), out = [A.scenes[v.scene]];
  if (v.mode === 'dialogue') out.push('pair:' + v.portrait.id + '|' + v.portrait.background + '|' + v.portrait.pose);
  return out;
}
const ALL = new Set();
Object.values(story.chapters['chapter-03'].nodes).forEach((n) => {
  ALL.add(A.scenes[n.scene]);
  if (n.mode === 'dialogue') { const p = A.portraits[story.cast[n.speaker].portrait]; ALL.add('pair:' + n.speaker + '|' + n.scene + '|' + (n.pose || p.pose)); }
});
const planned = C.ROUTES.map((r) => {
  const f = C.findSeed(story, r);
  if (!f) throw new Error('no seed for ' + r.name);
  let s = f.entry; const covers = new Set(targets(s));
  for (const st of r.steps) { s = Rules.step(story, s, input(st)).state; targets(s).forEach((t) => covers.add(t)); }
  return { r, f, covers: [...covers] };
});
const TOUR = [];
const left = new Set(ALL);
// Always tour both hidden-check outcomes and an item SHOW / USE route, then cover the rest greedily.
for (const name of ['leap_fail', 'key_dash_pass', 'photo', 'stapler']) { const p = planned.find((x) => x.r.name === name); TOUR.push(p); p.covers.forEach((t) => left.delete(t)); }
while (left.size) {
  const best = planned.filter((p) => !TOUR.includes(p)).map((p) => ({ p, n: p.covers.filter((t) => left.has(t)).length })).sort((a, b) => b.n - a.n)[0];
  if (!best || !best.n) throw new Error('tour cannot cover: ' + [...left].join(', '));
  TOUR.push(best.p); best.p.covers.forEach((t) => left.delete(t));
}
const at = (name, node) => { const p = planned.find((x) => x.r.name === name); let s = p.f.entry; for (const st of p.r.steps) { if (s.node === node) return s; s = Rules.step(story, s, input(st)).state; } return s.node === node ? s : null; };

// Browser helpers (as run_ch02_art_qa.js) --------------------------------------------------------------
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
async function settle(page) {
  for (let i = 0; i < 60; i++) {
    await page.waitForFunction(() => {
      const p = document.body.dataset.phase;
      if (p === 'typing') window.CYOA_GAME.flow.skip();
      return p === 'choosing';
    }, null, { timeout: 30000, polling: 40 });
    const cont = await page.evaluate(() => !window.CYOA_GAME.ui.inspector && window.CYOA_GAME.ui.cards.length === 1 && window.CYOA_GAME.ui.cards[0].id === '__continue');
    if (!cont) return;
    await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
  }
  throw new Error('presentation CONTINUE never ended');
}
// A card, or SHOW / USE through the inventory inspector (the player's own path).
async function take(page, st) {
  await settle(page);
  const inp = input(st);
  if (inp.choice) {
    const i = await page.evaluate((x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), inp.choice);
    if (i < 0) throw new Error('no card ' + inp.choice + ' at ' + await page.evaluate(() => document.body.dataset.node + ' ' + window.CYOA_GAME.ui.cards.map((c) => c.id)));
    await page.evaluate((k) => window.CYOA_GAME.flow.choose(k), i);
  } else {
    await page.evaluate((id) => window.CYOA_GAME.flow.toggleInspect(id), inp.item);
    await page.waitForFunction((id) => { const G = window.CYOA_GAME; return G.ui.inspector && G.ui.inspector.id === id; }, inp.item, { timeout: 10000 });
    const offered = await page.evaluate((x) => { const it = window.CYOA_GAME.flow.view().items.find((i) => i.id === x.item); return !!(it && it[x.verb]); }, inp);
    if (!offered) throw new Error(inp.verb + ' ' + inp.item + ' not offered at ' + await page.evaluate(() => document.body.dataset.node));
    await page.evaluate((v) => window.CYOA_GAME.flow.utility(v), inp.verb);
  }
  await settle(page);
}
async function load(page, base, raw) {
  await page.goto(base + '/story/storyboard-manifest.json');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, raw]);
  await page.goto(base + '/game/index.html');
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
  await settle(page);
}
async function art(page) {
  return page.evaluate(() => {
    const G = window.CYOA_GAME;
    const d = (id) => { const n = document.getElementById(id); return n && n.parentNode ? n.dataset.art || null : null; };
    const portrait = document.getElementById('portrait');
    const dom = { scene: d('sceneArt'), overlay: d('sceneOverlay'), view: d('portraitView'), background: d('portraitBackground'), pose: d('portraitNpc'), focus: d('focusArt'),
      portraitShown: portrait.style.display !== 'none' && getComputedStyle(portrait).display !== 'none' };
    const v = G.flow.view();
    const want = { scene: G.artKey.scene(v.scene), overlay: null, view: null, background: null, pose: null, focus: null, portraitShown: v.mode !== 'narrative' };
    if (v.mode === 'dialogue') { want.background = G.artKey.background(v.portrait.id, v.portrait.background); want.pose = G.artKey.pose(v.portrait.id, v.portrait.pose); }
    const imgs = Array.from(document.querySelectorAll('#scene img.art, #portrait img.art'));
    const sized = imgs.every((i) => i.complete && i.naturalWidth > 0 && i.width === i.naturalWidth * (i.closest('#scene') ? 4 : 1) && i.height === i.naturalHeight * (i.closest('#scene') ? 4 : 1));
    const placeholders = document.querySelectorAll('#scene [data-kind*="placeholder"], #portrait [data-kind*="placeholder"], #scene canvas.placeholder, #portrait canvas.placeholder').length;
    return { node: document.body.dataset.node, mode: v.mode, scene: v.scene, portrait: v.portrait, dom, want, sized, placeholders };
  });
}
const same = (a) => ['scene', 'overlay', 'view', 'background', 'pose', 'focus', 'portraitShown'].every((x) => a.dom[x] === a.want[x]) && a.sized && !a.placeholders;
async function pixels(page, region, layers) {
  await page.waitForFunction(() => { const n = document.getElementById('itemNotice'); return !n || getComputedStyle(n).display === 'none'; }, null, { timeout: 20000 });
  const box = await page.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, region);
  const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
  return page.evaluate(async ({ b64, layers, box }) => {
    const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('load ' + src.slice(0, 60))); i.src = src; });
    const s = await load('data:image/png;base64,' + b64);
    const W = s.naturalWidth, H = s.naturalHeight;
    const a = document.createElement('canvas'); a.width = W; a.height = H; const ac = a.getContext('2d'); ac.drawImage(s, 0, 0);
    const e = document.createElement('canvas'); e.width = W; e.height = H; const ec = e.getContext('2d'); ec.imageSmoothingEnabled = false;
    for (const l of layers) { const im = await load(l.url + '?px'); ec.drawImage(im, l.x, l.y, im.naturalWidth * l.scale, im.naturalHeight * l.scale); }
    const st = document.getElementById('draftStamp');
    const sr = st && st.style.display !== 'none' ? st.getBoundingClientRect() : null;
    const m = document.createElement('canvas'); m.width = W; m.height = H; const mc = m.getContext('2d');
    const shell = document.getElementById('shell'); const shr = shell.getBoundingClientRect(); mc.drawImage(await load(shell.currentSrc || shell.src), shr.x - box.x, shr.y - box.y, shr.width, shr.height);
    const M = mc.getImageData(0, 0, W, H).data, P = ac.getImageData(0, 0, W, H).data, E = ec.getImageData(0, 0, W, H).data;
    let n = 0, bad = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (sr && box.x + x >= sr.left - 1 && box.x + x < sr.right + 1 && box.y + y >= sr.top - 1 && box.y + y < sr.bottom + 1) continue;
      const i = (y * W + x) * 4;
      if (M[i + 3] !== 0) continue;
      n++;
      if (Math.abs(P[i] - E[i]) > 3 || Math.abs(P[i + 1] - E[i + 1]) > 3 || Math.abs(P[i + 2] - E[i + 2]) > 3) bad++;
    }
    return { n, bad, W, H };
  }, { b64: shot.toString('base64'), layers, box });
}
const url = (p) => '/' + p;
const speech = (page) => page.evaluate(() => window.CYOA_GAME.ui.speech.parts.map((p) => ({ text: p.text, role: p.role, who: p.who, voice: p.voice || null })));
const notesText = async (page) => { await page.evaluate(() => window.CYOA_GAME.flow.utility('notes')); const t = await page.evaluate(() => document.getElementById('overlayCanvas').dataset.text); await page.evaluate(() => window.CYOA_GAME.flow.utility('notes')); return t; };

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
    const Ck = (n, ok, d) => check(b, id, n, ok, d);
    const px = async (label, region, layers) => { const r = await pixels(page, region, layers); Ck('pixels: ' + label + ' (' + r.n + ' px compared)', r.n > 1000 && r.bad === 0, r); };
    const shot = (n) => page.screenshot({ path: path.join(OUT, b + '_' + id + (n ? '_' + n : '') + '.png') });
    try { await fn({ page, C: Ck, px, shot }); } catch (e) { Ck('scenario completed', false, e.stack || String(e)); }
    Ck('no browser or console errors, no failed requests', !errors.length, errors);
    await page.close();
  }
  const offset = (page) => page.evaluate(() => [window.CYOA_GAME.TUNING.portrait.backgroundX, window.CYOA_GAME.TUNING.portrait.backgroundY]);

  // 1. Tour ---------------------------------------------------------------------------------------------
  for (const t of TOUR) {
    await scenario(t.r.name, async ({ page, C: Ck, px, shot }) => {
      await load(page, base, save(t.f.ch2End));
      const pre = await page.evaluate(() => ({ cards: window.CYOA_GAME.ui.cards.map((c) => c.id), chapter: window.CYOA_GAME.state.chapter, inv: window.CYOA_GAME.state.inventory.slice(), flags: JSON.stringify(window.CYOA_GAME.state.flags) }));
      Ck('the real Chapter 2 living ending ' + t.f.ch2End.node + ' offers one CONTINUE into Chapter 3', pre.chapter === 'chapter-02' && pre.cards.length === 1 && pre.cards[0] === 'continue_to_chapter_03_' + t.f.ch2End.node, pre);
      await take(page, pre.cards[0]);
      const in3 = await page.evaluate(() => ({ chapter: window.CYOA_GAME.state.chapter, node: window.CYOA_GAME.state.node, inv: window.CYOA_GAME.state.inventory.slice(), flags: JSON.stringify(window.CYOA_GAME.state.flags),
        slots: Array.from(document.querySelectorAll('[data-item]')).map((n) => n.dataset.item) }));
      Ck('Chapter 3 begins at pavilion_arrival with the whole Chapter 2 inventory and flags; every held item has its inventory slot', in3.chapter === 'chapter-03' && in3.node === 'pavilion_arrival'
        && JSON.stringify(in3.inv) === JSON.stringify(pre.inv) && in3.flags === pre.flags && pre.inv.every((i) => in3.slots.includes(i)), in3);
      let steps = 0; const mismatches = [];
      const probe = async () => {
        const a = await art(page); steps++;
        if (!same(a)) mismatches.push(a);
        const sceneFile = A.scenes[a.scene];
        if (!seen.has(sceneFile)) { seen.add(sceneFile); await px(sceneFile + ' at 4x', 'scene', [{ url: url(sceneFile), scale: 4, x: 0, y: 0 }]); await shot(path.basename(sceneFile, '.png')); }
        if (a.mode === 'dialogue') {
          const key = 'pair:' + a.portrait.id + '|' + a.portrait.background + '|' + a.portrait.pose;
          if (!seen.has(key)) {
            seen.add(key);
            const p = A.portraits[a.portrait.id], off = await offset(page);
            await px(a.portrait.id + ' at ' + a.portrait.background.split('/')[1] + ' (' + a.portrait.pose + '): background + pose 1:1', 'portrait',
              [{ url: url(p.backgrounds[a.portrait.background]), scale: 1, x: off[0], y: off[1] }, { url: url(p.poses[a.portrait.pose]), scale: 1, x: off[0], y: off[1] }]);
            await shot(a.portrait.id + '_' + a.portrait.background.split('/')[1] + '_' + a.portrait.pose);
          }
        }
      };
      await probe();
      for (const st of t.r.steps) { await take(page, st); await probe(); }
      Ck('every settled step: scene and conversation layers are exactly the engine\'s selection, decoded at scale, no placeholder (' + steps + ' steps)', !mismatches.length, mismatches.slice(0, 2));
      // RETRY / CHECKPOINT exist only inside a death popup (docs/96, docs/99); a surviving ending opens none.
      const end = await page.evaluate(() => { const G = window.CYOA_GAME, r = document.getElementById('endPresentation');
        return { node: G.state.node, cards: G.ui.cards.map((c) => c.id + ':' + c.kind), popup: !!document.body.dataset.endPresentation,
          controls: r ? Array.from(r.querySelectorAll('button')).filter((x) => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden').length : 0,
          inv: G.state.inventory.slice(), checks: JSON.stringify(G.state.checks) }; });
      Ck('reaches the surviving ending ' + t.r.end + ': BEGIN AGAIN only, no death popup, no RETRY / CHECKPOINT on screen', end.node === t.r.end && end.cards.length === 1 && /:system$/.test(end.cards[0]) && !end.popup && !end.controls, end);
      Ck('the real dice gave the planned outcomes and the inventory matches the engine', end.checks === JSON.stringify(t.f.end.checks) && JSON.stringify(end.inv) === JSON.stringify(t.f.end.inventory));
      await shot('ending');
    });
  }
  const missed = [...ALL].filter((p) => !seen.has(p));
  check(b, 'tour', 'every Chapter 3 scene (14) and conversation pair (' + [...ALL].filter((x) => /^pair:/.test(x)).length + ') shown and pixel-compared in this browser', !missed.length, missed);
  const images = new Set(); [...seen].forEach((k) => { if (/^pair:/.test(k)) { const [id, bg, pose] = k.slice(5).split('|'); images.add(A.portraits[id].backgrounds[bg]); images.add(A.portraits[id].poses[pose]); } else images.add(k); });
  check(b, 'tour', 'all 29 approved Chapter 3 images displayed in this browser', PROV.images.every((r) => images.has(r.path)), PROV.images.filter((r) => !images.has(r.path)).map((r) => r.path));

  // 2. Incidental voices: dialogue box and NOTES ---------------------------------------------------------
  await scenario('voices', async ({ page, C: Ck, shot }) => {
    await load(page, base, save(at('hold', 'door_wait')));
    await take(page, 'respond_to_open_door');
    const parts = await speech(page);
    const labels = parts.filter((p) => p.role === 'labels').map((p) => p.text);
    Ck('door_choices: each visitor / restroom-system line has its NAME: label (Labels face); the attendant\'s lines have none', JSON.stringify(labels) === JSON.stringify(['VISITOR:', 'VISITOR:', 'VISITOR:', 'RESTROOM SYSTEM:', 'VISITOR:'])
      && parts.some((p) => p.text === 'After you.' && p.voice === 'visitor') && parts.some((p) => p.text === "Sir! That gentleman hasn't been cleared!" && !p.voice)
      && parts.some((p) => p.text === 'PLEASE COMPLETE ALL EXPERIENCES IN THE ORDER APPROVED.' && p.voice === 'restroom_system'), parts);
    await shot('door_choices_voices');
    const notes = await notesText(page);
    Ck('NOTES attributes each speaker: ATTENDANT:, VISITOR:, RESTROOM SYSTEM:', /VISITOR:\nAfter you\./.test(notes) && /ATTENDANT:\nSir! That gentleman/.test(notes) && /RESTROOM SYSTEM:\nPLEASE COMPLETE ALL EXPERIENCES/.test(notes), notes.slice(-900));
    // Reload in the middle of the conversation: same node, same art, the history keeps its labels.
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
    await settle(page);
    const again = await speech(page);
    const a = await art(page);
    Ck('reload mid-Chapter 3: same node, same art, the conversation history with its labels restored', a.node === 'chapter-03:door_choices' && same(a)
      && JSON.stringify(again.filter((p) => p.role === 'labels').map((p) => p.text)) === JSON.stringify(labels), { node: a.node, again });
  });

  // 3. The '%' glyph -----------------------------------------------------------------------------------------
  await scenario('glyph', async ({ page, C: Ck, shot }) => {
    await load(page, base, save(at('urgency', 'authentic_urgency_visitor')));
    await take(page, 'say_you_need_it_too');
    const parts = await speech(page);
    Ck("authentic_urgency_reply: the readout 'AUDIENCE PARTICIPATION: 0%' is in the dialogue box", parts.some((p) => /AUDIENCE PARTICIPATION: 0%\. DEMONSTRATION COMPLETE\./.test(p.text)), parts.map((p) => p.text));
    const ink = await page.evaluate(() => ['dialogue', 'labels', 'objective'].map((role) => {
      const T = window.CYOA_GAME.text, c = document.createElement('canvas');
      T.draw(c, [{ text: '%', role }], 'dark', 40, 60, 40, undefined, role);
      const d = c.getContext('2d').getImageData(0, 0, 60, 40).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
      return role + ':' + n;
    }));
    Ck("the '%' glyph draws real ink in the Dialogue, Labels and Objective faces", ink.every((x) => Number(x.split(':')[1]) > 10), ink);
    await shot('percent_readout');
  });

  // 4. BEGIN AGAIN ---------------------------------------------------------------------------------------
  await scenario('restart', async ({ page, C: Ck }) => {
    await load(page, base, save(planned.find((p) => p.r.name === 'back').f.end));
    await take(page, 'restart_after_zero_second_visit');
    const s = await page.evaluate(() => ({ chapter: window.CYOA_GAME.state.chapter, node: window.CYOA_GAME.state.node, inv: window.CYOA_GAME.state.inventory.slice() }));
    Ck('BEGIN AGAIN at a Chapter 3 ending starts a new playthrough at the Prologue with the initial inventory', s.chapter === story.start && JSON.stringify(s.inv) === JSON.stringify(story.initialState.inventory), s);
  });

  // 5. Missing items ------------------------------------------------------------------------------------
  await scenario('missing_items', async ({ page, C: Ck }) => {
    await load(page, base, save(at('urgency', 'presenter_verification')));
    const v = await page.evaluate(() => ({ slots: Array.from(document.querySelectorAll('[data-item]')).map((n) => n.dataset.item), items: window.CYOA_GAME.flow.view().items }));
    Ck('no photo held: no photo slot and no SHOW at presenter_verification; the held key offers no SHOW here', !v.slots.includes('family_portrait_photo') && v.slots.includes('wc_key') && v.items.every((i) => !i.show && !i.use), v);
    await load(page, base, save(at('stapler_spent_record', 'record_choices')));
    const w = await page.evaluate(() => ({ slots: Array.from(document.querySelectorAll('[data-item]')).map((n) => n.dataset.item), cards: window.CYOA_GAME.ui.cards.map((c) => c.id), items: window.CYOA_GAME.flow.view().items }));
    Ck('stapler spent in Chapter 2: no stapler slot, no USE; the three record choices remain', !w.slots.includes('red_stapler') && w.items.every((i) => !i.use) && w.cards.length === 3, w);
  });
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
  fs.writeFileSync(path.join(__dirname, 'ch03_qa_results.json'), JSON.stringify({ schema: 'cyoa-ch03-browser-v1', total: results.length, passed: results.length - failed.length,
    tour: TOUR.map((t) => ({ route: t.r.name, seed: t.f.seed, entry: t.r.entry, end: t.r.end })), results }, null, 1) + '\n');
  console.log('Chapter 3 in the browser: ' + (results.length - failed.length) + '/' + results.length + ' passed (' + Object.keys(by).map((x) => x + ' ' + by[x][0] + '/' + by[x][1]).join(', ') + ')');
  if (failed.length) process.exitCode = 1;
})().catch((e) => { console.error(e.stack || String(e)); process.exitCode = 1; });
