#!/usr/bin/env node
// Death popups (docs/94 design, docs/98 canonical data, docs/99 ordinary play): the CANONICAL
// storyboard popup appears when a death occurs (owner ruling 2026-11-17; ?nodeathpopups turns it off
// for comparison). Rest Assured: one shared popup and illustration for all three causes (public
// docs/104); Chapter 2 deaths: their popups with an empty picture frame until their art is selected.
// Real game, Chromium and Firefox, 1920x1080 at device scale 1.
//
// Every scenario starts from a real Prologue playthrough (game/qa/ch02_routes.js) saved at the
// Rest Assured chair, then takes the real choice in the production UI. Measured from real
// browser screenshots:
//   - geometry: popup 280,135 1360x640 (centre y=455), 12px shadow, art at 312,205 drawn 628x412
//     equal to the native PNG at exact 2x, separator, three control footprints (+4px shadow) with
//     24px clear above and below;
//   - the composition against the approved A1 reference (pinned study commit, when this clone has
//     it): every popup pixel identical except the title row, the control label faces and the text
//     column, which now carries the canonical draft copy (subtitle + one-paragraph narrative): its
//     difference is measured and reported for owner review;
//   - backdrop: the real ending frame (the same state with ?nodeathpopups) in 10x10 blocks, each block
//     uniform and equal to that frame's block-centre pixel x 0.35; the capture itself against the
//     real screenshot;
//   - freeze and isolation: frames stable, no input/focus/keyboard reaches the game, Tab stays on
//     the unavailable EXIT control, which only explains itself (RETRY / CHECKPOINT restores are
//     run_death_controls_qa.js's); no save, state, inventory, flag or dice change; Escape returns
//     to the identical ending frame, whose BEGIN AGAIN still works;
//   - resize (uniform scale, then restored exactly), reduced motion, reload;
//   - cause selection: the voluntary choice, the failed stapler check and the failed unarmed check
//     all open the SAME canonical popup (pixel-identical popup region) while the real cause (choice,
//     check id, ok:false) is kept; a successful escape, other endings (incl. Chapter 2 fatal endings,
//     opens their own art-pending popup) and the ?nodeathpopups game (also for a failed cause) do not.
// Writes game/qa/end_presentation_results.json and game/qa/end_presentation_screenshots/ (not
// committed; CI keeps them as an artifact).
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');
const ROOT = path.resolve(__dirname, '../..');
const Rules = require('../js/rules.js');
const story = require('../content/story.generated.js').story;
const R = require('./ch02_routes.js');
let pw;
try { pw = createRequire(__filename)('playwright'); } catch (_) { console.error('Playwright required; set NODE_PATH to its installation directory'); process.exit(2); }
const DATA = require('../content/end-presentations.review.js');
const CANON = require('../content/death-presentations.generated.js');
const EXPORT = JSON.parse(fs.readFileSync(path.join(ROOT, 'story/death-presentations.export.json'), 'utf8'));
// The opted-in entry as the runtime merges it (js/end-presentation.js): game-owned config + canonical copy and art.
const mergeOne = (r, c) => Object.assign({}, r, { id: c.id, when: c.when, title: c.title, subtitle: c.subtitle, body: c.body, art: c.art || null });
const ENTRIES = [].concat(...DATA.entries.map((r) => (r.canonical === '*' ? CANON.entries : CANON.entries.filter((c) => c.id === r.canonical)).map((c) => mergeOne(r, c))));
const ENTRY = ENTRIES.find((e) => e.id === 'chapter-01:exit_chair_fatal');
const DASH = (t) => t.replace(/[\u2014\u2013]/g, '-');
const OUT = path.join(__dirname, 'end_presentation_screenshots');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'cyoa-save:' + story.id;
const STUDY = '000f096d7699b8205affd783332a8d2aa446bf93';
const A1_PATH = 'review/death-screen-layout-study-2026-11-15/approved-default/A1-1920x1080.png';
const A1_SHA = 'f38c8031b896d365bab060c2d3e073ff70f4bc5c4029b71a654b639e11d5b07d';

const results = [];
const measures = {};
function check(browser, scenario, name, ok, detail) {
  results.push({ browser, scenario, name, ok: !!ok, detail: ok ? undefined : detail });
  if (!ok) console.error('FAIL [' + browser + ' / ' + scenario + '] ' + name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 700)));
}
let A1 = null;
try {
  const buf = execFileSync('git', ['show', STUDY + ':' + A1_PATH], { cwd: ROOT, maxBuffer: 64 << 20 });
  if (require('crypto').createHash('sha256').update(buf).digest('hex') === A1_SHA) A1 = buf;
} catch (e) { A1 = null; }
if (!A1) console.log('SKIP A1 parity: the pinned study commit ' + STUDY.slice(0, 8) + ' is not in this clone (geometry is still measured directly)');

// Real states --------------------------------------------------------------------------------------
const CHAIR = R.HOUSE.chair_fatal.path.slice(0, -1); // ... enter_rest_assured: at chair_locked
// The save the gated game would have written at the chair (state + restore points, docs/96).
function chairSave(item) {
  const t = require('./tracked_routes.js').tracked(story, item, 1).steps(item ? require('./tracked_routes.js').STAPLER_CHAIR : CHAIR);
  if (t.state.node !== 'chair_locked') throw new Error('not at the chair');
  return t.save();
}
// A seed whose real roll gives `ok` for `check` when taking `choice` at the chair. The save is the
// one the gated game writes (tracked: state + restore points, docs/96), as for the voluntary case,
// so every cause is presented with the same control availability.
function seedFor(item, choice, checkId, ok) {
  const T = require('./tracked_routes.js');
  for (let seed = 1; seed < 500; seed++) {
    const t = T.tracked(story, item, seed).steps(item ? T.STAPLER_CHAIR : CHAIR);
    const s = Rules.step(story, t.state, { choice }).state;
    if (s.checks[checkId] && s.checks[checkId].ok === ok) return { seed, save: t.save() };
  }
  throw new Error('no seed for ' + choice + ' ' + ok);
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/__a1.png' && A1) { res.writeHead(200, { 'content-type': 'image/png' }); res.end(A1); return; }
    if (u === '/__blank.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><body></body>'); return; }
    const file = path.normalize(path.join(ROOT, u));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}
async function settle(page) {
  for (let i = 0; i < 40; i++) {
    await page.waitForFunction(() => {
      const p = document.body.dataset.phase;
      if (p === 'typing') window.CYOA_GAME.flow.skip();
      return p === 'choosing';
    }, null, { timeout: 25000, polling: 40 });
    const cont = await page.evaluate(() => window.CYOA_GAME.ui.cards.length === 1 && window.CYOA_GAME.ui.cards[0].id === '__continue');
    if (!cont) return;
    await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
  }
  throw new Error('presentation CONTINUE never ended');
}
async function take(page, id) {
  await settle(page);
  const i = await page.evaluate((x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), id);
  if (i < 0) throw new Error('no card ' + id + ' at ' + await page.evaluate(() => document.body.dataset.node));
  await page.evaluate((k) => window.CYOA_GAME.flow.choose(k), i);
  await settle(page);
}
const snapshot = (page) => page.evaluate((k) => ({ state: JSON.stringify(window.CYOA_GAME.state), save: localStorage.getItem(k) }), SAVE_KEY);

// Pixel analysis runs in a separate blank page: decode PNG buffers, compare regions.
async function analysis(context, base) {
  const p = await context.newPage();
  await p.goto(base + '/__blank.html');
  return {
    run: (fn, arg) => p.evaluate(fn, arg),
    close: () => p.close()
  };
}
const b64 = (buf) => 'data:image/png;base64,' + buf.toString('base64');
const PIXEL_LIB = `
  window.load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('decode ' + src.slice(0, 40))); i.src = src; });
  window.pixels = async (src, w, h) => { const im = await load(src); const c = document.createElement('canvas'); c.width = w || im.naturalWidth; c.height = h || im.naturalHeight; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, c.width, c.height); return { w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data }; };
  window.at = (P, x, y) => { const i = (y * P.w + x) * 4; return [P.d[i], P.d[i + 1], P.d[i + 2]]; };
  window.hex = (P, x, y) => '#' + at(P, x, y).map((v) => v.toString(16).padStart(2, '0')).join('');
`;

async function run(name, base) {
  const browser = await pw[name].launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const A = await analysis(context, base);
  await A.run(new Function(PIXEL_LIB));
  const M = (measures[name] = {});

  async function game(id, save, on, fn) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
    const C = (n, ok, d) => check(name, id, n, ok, d);
    try {
      await page.goto(base + '/story/storyboard-manifest.json');
      await page.evaluate(([k, raw]) => localStorage.setItem(k, raw), [SAVE_KEY, save]);
      await page.goto(base + '/game/index.html' + (on ? '' : '?nodeathpopups')); // ordinary URL = popups on
      await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
      await settle(page);
      await fn(page, C);
      C('no browser or console errors, no failed requests', !errors.length, errors);
    } catch (e) { C('scenario completed', false, e.stack || String(e)); }
    await page.close();
  }
  const shot = async (page, file) => { const buf = await page.screenshot(); fs.writeFileSync(path.join(OUT, name + '_' + file + '.png'), buf); return buf; };
  const isOpen = (page) => page.evaluate(() => !!document.body.dataset.endPresentation);

  // 1. Gate OFF: the authored ending exactly as before; also the reference ending frame. ------------
  let endingFrame = null;
  let voluntaryShot = null;
  await game('gate_off_voluntary', chairSave(null), false, async (page, C) => {
    const before = await page.evaluate(() => JSON.parse(JSON.stringify(window.CYOA_GAME.state)));
    await take(page, 'accept_permanent_rest');
    const s = await page.evaluate(() => ({ node: document.body.dataset.node, cards: window.CYOA_GAME.ui.cards.map((c) => c.id + ':' + c.kind), open: !!document.body.dataset.endPresentation, el: !!document.getElementById('endPresentation'),
      enabled: window.CYOA_GAME.endPresentation.enabled, art: !!window.CYOA_GAME.image('end:chapter-01:exit_chair_fatal') }));
    C('?nodeathpopups: the authored fatal ending with only BEGIN AGAIN, no presentation, its art not even decoded',
      s.node === 'chapter-01:exit_chair_fatal' && s.cards.join() === 'restart_chair_death:system' && !s.open && !s.el && s.enabled === false && !s.art, s);
    endingFrame = await shot(page, '00_gate_off_ending');
    const st = await page.evaluate(() => JSON.parse(JSON.stringify(window.CYOA_GAME.state)));
    const want = Rules.step(story, before, { choice: 'accept_permanent_rest' }).state;
    C('?nodeathpopups: state equals the pure rules step (flags, inventory, checks, seed)', JSON.stringify([st.flags, st.inventory, st.checks, st.seed, st.node]) === JSON.stringify([want.flags, want.inventory, want.checks, want.seed, want.node]));
    await take(page, 'restart_chair_death');
    const r = await page.evaluate(() => ({ node: document.body.dataset.node, inv: window.CYOA_GAME.state.inventory }));
    C('?nodeathpopups: BEGIN AGAIN restarts at the Prologue start as before', /^prologue-00:/.test(r.node) && r.inv.length === 0, r);
  });

  // 2. Gate ON, voluntary: the proof. ---------------------------------------------------------------
  await game('voluntary', chairSave(null), true, async (page, C) => {
    const pre = await snapshot(page);
    const preState = JSON.parse(pre.state);
    await take(page, 'accept_permanent_rest').catch(() => {});
    await page.waitForFunction(() => !!document.body.dataset.endPresentation, null, { timeout: 15000 });
    const canonical = await shot(page, '01_voluntary_canonical_1920x1080');
    voluntaryShot = canonical;
    const atOpen = await snapshot(page);
    const want = Rules.step(story, preState, { choice: 'accept_permanent_rest' }).state;
    const st = JSON.parse(atOpen.state);
    C('opens on accept_permanent_rest, at the authored ending, once', st.node === 'exit_chair_fatal' && (await page.evaluate(() => window.CYOA_GAME.endPresentation.log().filter((x) => x.t === 'open').length)) === 1);
    C('no extra item, flag, check or seed change: the state is the pure rules step', JSON.stringify([st.flags, st.inventory, st.items, st.checks, st.seed, st.steps]) === JSON.stringify([want.flags, want.inventory, want.items, want.checks, want.seed, want.steps]));
    const dom = await page.evaluate(() => {
      const q = (id) => document.getElementById(id);
      const r = (id) => { const b = q(id).getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; };
      const art = q('endArt');
      const root = q('endPresentation');
      return { art: r('endArt'), natural: [art.naturalWidth, art.naturalHeight], src: art.getAttribute('src'), title: q('endTitle').dataset.text, body: q('endBody').dataset.text,
        subtitle: q('endSubtitle').dataset.text, subtitleRendered: q('endSubtitle').dataset.rendered, subtitleBox: r('endSubtitle'), bodyBox: r('endBody'), titleRendered: q('endTitle').dataset.rendered,
        textBottom: +root.dataset.textBottom, textOverflow: root.dataset.textOverflow, copyStatus: root.dataset.copyStatus, revision: root.dataset.revision, entry: root.dataset.entry,
        titleTag: q('endTitle').tagName, bodyTag: q('endBody').tagName, controls: [0, 1, 2].map((i) => ({ r: r('endControl' + i), label: q('endControl' + i).dataset.label, aria: q('endControl' + i).getAttribute('aria-label'), disabled: q('endControl' + i).getAttribute('aria-disabled') })),
        notice: q('endNotice').getAttribute('aria-label'), noticeHidden: q('endNotice').hidden, method: q('endBackdrop').dataset.method, capture: JSON.parse(q('endPresentation').dataset.capture),
        rendering: getComputedStyle(art).imageRendering, top: document.getElementById('stage').lastElementChild.id,
        inert: Array.from(document.getElementById('stage').children).filter((n) => n.id !== 'endPresentation').every((n) => n.inert), focus: document.activeElement && document.activeElement.closest('#endPresentation') ? document.activeElement.id : 'outside' };
    });
    C('art element: the native 314x206 image drawn at 312,205 as 628x412 (exact 2x), pixelated', JSON.stringify(dom.art) === '[312,205,628,412]' && dom.natural.join() === '314,206'
      && /art\/deaths\/rest_assured_voluntary\.png$/.test(dom.src) && /pixelated|crisp-edges/.test(dom.rendering), dom);
    const CE = EXPORT.entries.find((x) => x.id === 'chapter-01:exit_chair_fatal');
    C('title, subtitle and body are independent text canvases (never baked into the art) carrying the CANONICAL storyboard copy exactly',
      dom.entry === CE.id && dom.title === CE.title && dom.titleRendered === CE.title && dom.subtitle === CE.subtitle && dom.body.replace(/\n/g, ' ') === CE.body.join(' ')
      && dom.titleTag === 'CANVAS' && dom.bodyTag === 'CANVAS', dom);
    C('the canonical em dash, which no game face carries, is drawn as the listed fallback "-" only (data keeps the canonical text)',
      /\u2014/.test(dom.subtitle) && dom.subtitleRendered === DASH(dom.subtitle) && dom.titleRendered === dom.title, [dom.subtitle, dom.subtitleRendered]);
    C('copy provenance: the canonical approval status (owner-approved, ready for gameplay; docs/103) and the pinned storyboard revision travel with the popup', dom.copyStatus === CE.popupStatus && CE.popupStatus === 'owner-approved' && CE.readyForGameplay === true
      && dom.revision === JSON.parse(fs.readFileSync(path.join(ROOT, 'story/canon.lock.json'), 'utf8')).revision, [dom.copyStatus, dom.revision]);
    C('text column: subtitle at 972,257, the narrative below it, ending above the separator (no overflow, nothing cut)', dom.subtitleBox[0] === 972 && dom.subtitleBox[1] === 257
      && dom.bodyBox[0] === 972 && dom.bodyBox[1] > dom.subtitleBox[1] + dom.subtitleBox[3] && dom.textOverflow === 'false' && dom.textBottom <= 615, [dom.subtitleBox, dom.bodyBox, dom.textBottom]);
    C('the owner-locked controls at the approved footprints: RETRY and CHECKPOINT available, EXIT unavailable (main menu pending)', dom.controls.map((c) => c.r.join()).join('|') === '570,669,240,62|840,669,240,62|1110,669,240,62'
      && dom.controls.map((c) => c.label + ':' + c.disabled).join() === 'RETRY:false,CHECKPOINT:false,EXIT:true' && /MAIN MENU, WHICH DOES NOT EXIST YET/.test(dom.controls[2].aria)
      && dom.notice === '' && dom.noticeHidden, dom.controls);
    C('ordinary play: no review banner (the notice plate is hidden until a control needs explaining)', dom.notice === '' && dom.noticeHidden, dom);
    C('topmost layer of the stage; everything beneath inert; focus inside the dialog', dom.top === 'endPresentation' && dom.inert && dom.focus !== 'outside', dom);
    C('backdrop computed exactly from readable captured pixels (images, canvases, fills)', dom.method === 'exact' && dom.capture.images >= 15 && dom.capture.canvases >= 5, dom.capture);

    // Stage images the game itself draws DOWNSCALED by a non-integer factor (the utility buttons and
    // inventory arrows, e.g. 243x205 shown at 135x114 with image-rendering: pixelated). Chromium
    // scales those nearest-neighbour, like canvas; Firefox's CSS downscale filter does not match its
    // canvas nearest-neighbour, so in Firefox exactly these boxes cannot be reproduced bit for bit.
    // They are measured separately; everything else must match exactly.
    const downscaled = await page.evaluate(() => Array.from(document.querySelectorAll('#stage img')).filter((i) => !i.closest('#endPresentation') && i.naturalWidth && getComputedStyle(i).display !== 'none'
      && (i.getBoundingClientRect().width < i.naturalWidth || i.getBoundingClientRect().height < i.naturalHeight) && i.getBoundingClientRect().width > 0).map((i) => { const b = i.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }));
    M.downscaledBoxes = downscaled.length;
    // Pixel measurements on the canonical screenshot.
    const px = await A.run(async ({ shot, a1, art, frame, popup, downscaled }) => {
      const inDown = (x, y) => downscaled.some((d) => x >= d[0] && x < d[0] + d[2] && y >= d[1] && y < d[1] + d[3]);
      const S = await pixels(shot); const N = await pixels(art); const F = await pixels(frame);
      const out = {};
      // Geometry by colour: edge #19393e at the popup corners; shadow #101e22 to +12.
      out.corners = [hex(S, 280, 135), hex(S, 1639, 135), hex(S, 280, 774), hex(S, 1639, 774)];
      out.outside = [hex(S, 279, 300), hex(S, 1640, 140)];
      out.shadow = [hex(S, 1651, 786), hex(S, 1645, 780), hex(S, 1652, 787) !== '#101e22'];
      out.centreY = (135 + 775) / 2;
      // Art: every pixel equals the native pixel at (x>>1, y>>1).
      let artBad = 0;
      for (let y = 0; y < 412; y++) for (let x = 0; x < 628; x++) { const a = at(S, 312 + x, 205 + y), n = at(N, x >> 1, y >> 1); if (a[0] !== n[0] || a[1] !== n[1] || a[2] !== n[2]) artBad++; }
      out.artBad = artBad;
      // Separator rows 639-644 and the control column x=571: find the control box and shadow.
      out.separator = [hex(S, 700, 639), hex(S, 700, 642), hex(S, 700, 643), hex(S, 700, 644), hex(S, 700, 645)];
      const col = []; for (let y = 640; y < 765; y++) col.push(hex(S, 600, y));
      const firstEdge = col.indexOf('#244348') + 640;
      let lastShadow = 0; for (let y = 640; y < 765; y++) if (hex(S, 812, y) === '#9d927d') lastShadow = y;
      let lower = 0; for (let y = 740; y < 775; y++) if (hex(S, 700, y) === '#ab9e85') { lower = y; break; }
      out.controls = { top: firstEdge, shadowBottom: lastShadow, separatorEnd: 645, lowerBorder: lower, gapAbove: firstEdge - 645, gapBelow: lower - (lastShadow + 1) };
      out.controlColours = [570, 840, 1110].map((x) => [hex(S, x, 669), hex(S, x + 4 + 240 - 1, 669 + 4 + 62 - 1), hex(S, x + 10, 690)]);
      // Backdrop: every 10x10 block entirely outside the popup (+shadow) and the review notice is one
      // colour, equal to the real ending frame's block-centre pixel x 0.35 (rounded).
      const nr = popup.notice;
      const inside = (x, y) => (x >= 280 && x < 1652 && y >= 135 && y < 787) || (x >= nr[0] && x < nr[0] + nr[2] && y >= nr[1] && y < nr[1] + nr[3]);
      let blocks = 0, uniform = 0, exact = 0, within1 = 0, maxDev = 0, lighter = 0, dsBlocks = 0, dsInexact = 0, otherInexact = 0;
      for (let by = 0; by < 108; by++) for (let bx = 0; bx < 192; bx++) {
        const x0 = bx * 10, y0 = by * 10;
        let skip = false; for (let y = y0; y < y0 + 10 && !skip; y++) for (let x = x0; x < x0 + 10; x++) if (inside(x, y)) { skip = true; break; }
        if (skip) continue;
        blocks++;
        const c = at(S, x0, y0); let same = true;
        for (let y = y0; y < y0 + 10 && same; y++) for (let x = x0; x < x0 + 10; x++) { const v = at(S, x, y); if (v[0] !== c[0] || v[1] !== c[1] || v[2] !== c[2]) { same = false; break; } }
        if (same) uniform++;
        const f = at(F, x0 + 5, y0 + 5).map((v) => Math.round(v * 0.35));
        const dev = Math.max(...[0, 1, 2].map((k) => Math.abs(f[k] - c[k])));
        if (dev === 0) exact++; if (dev <= 1) within1++; maxDev = Math.max(maxDev, dev);
        const ds = inDown(x0 + 5, y0 + 5);
        if (ds) dsBlocks++;
        if (dev > 0) { if (ds) dsInexact++; else otherInexact++; }
        if (!ds && (c[0] > f[0] + 1 || c[1] > f[1] + 1 || c[2] > f[2] + 1)) lighter++;
      }
      out.backdrop = { blocks, uniform, exact, within1, maxDev, lighter, downscaledSpriteBlocks: dsBlocks, inexactInDownscaledSprites: dsInexact, inexactElsewhere: otherInexact };
      // Mean luminance ratio backdrop / real frame over those blocks (65% darkening -> 0.35).
      let sb = 0, sf = 0;
      for (let by = 0; by < 108; by += 3) for (let bx = 0; bx < 192; bx += 3) { const x = bx * 10 + 5, y = by * 10 + 5; if (inside(x, y)) continue; const a = at(S, x, y), f = at(F, x, y); sb += a[0] + a[1] + a[2]; sf += f[0] + f[1] + f[2]; }
      out.darkRatio = +(sb / sf).toFixed(4);
      // A1 parity: the popup region (incl. shadow) pixel for pixel, title rows reported apart.
      if (a1) {
        const A1 = await pixels(a1);
        // The control label faces (owner-locked labels RETRY / CHECKPOINT / EXIT replace the
        // mockup's; EXIT is drawn in the unavailable ink) are reported apart, like the title row.
        const label = (x, y) => [570, 840, 1110].some((bx) => x >= bx + 8 && x < bx + 232 && y >= 669 + 13 && y < 669 + 58);
        // The text column (canonical subtitle + narrative, docs/98): right of the art frame, above the separator.
        const textCol = (x, y) => x >= 960 && x < 1620 && y >= 245 && y < 639;
        let n = 0, diff = 0, titleDiff = 0, labelDiff = 0, textDiff = 0, diffOutsideTitle = [];
        for (let y = 135; y < 787; y++) for (let x = 280; x < 1652; x++) {
          const a = at(S, x, y), b = at(A1, x, y); n++;
          if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) {
            if (y >= 160 && y < 190) titleDiff++; else if (label(x, y)) labelDiff++; else if (textCol(x, y)) textDiff++; else { diff++; if (diffOutsideTitle.length < 5) diffOutsideTitle.push([x, y]); }
          }
        }
        let bg = 0, bgDiff = 0;
        for (let y = 0; y < 1080; y += 2) for (let x = 0; x < 1920; x += 2) { if (inside(x, y)) continue; bg++; const a = at(S, x, y), b = at(A1, x, y); if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) bgDiff++; }
        out.a1 = { popupPixels: n, diffOutsideTitle: diff, sample: diffOutsideTitle, titleRowDiff: titleDiff, controlLabelDiff: labelDiff, textColumnDiff: textDiff, backdropSampled: bg, backdropDiffer: bgDiff };
      }
      return out;
    }, { downscaled, shot: b64(canonical), a1: A1 ? b64(A1) : null, art: b64(fs.readFileSync(path.join(ROOT, ENTRY.art.path))), frame: b64(endingFrame), popup: { notice: await page.evaluate(() => { const b = document.getElementById('endNotice').getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }) } });
    M.canonical = px;
    C('popup frame edge at 280,135 .. 1639,774 (1360x640), nothing of it outside; centre y=455', px.corners.every((c) => c === '#19393e') && px.outside.every((c) => c !== '#19393e') && px.centreY === 455, px);
    C('12px popup shadow to 1651,786', px.shadow[0] === '#101e22' && px.shadow[1] === '#101e22' && px.shadow[2], px.shadow);
    C('art on screen equals the native PNG at exact 2x nearest neighbour (0 of 258,736 pixels differ): sharp, undimmed', px.artBad === 0, px.artBad);
    C('separator rows 639-644, panel face below', px.separator.join() === '#b4aa92,#b4aa92,#f9f0d9,#f9f0d9,#e8dfc6', px.separator);
    C('controls: top y=669, shadow to y=734, 24px clear above (separator ends 645) and below (lower border 759)', px.controls.top === 669 && px.controls.shadowBottom === 734
      && px.controls.gapAbove === 24 && px.controls.gapBelow === 24 && px.controls.lowerBorder === 759, px.controls);
    C('each control: edge, shadow and face colours at its footprint (undimmed)', px.controlColours.every((c) => c[0] === '#244348' && c[1] === '#9d927d' && c[2] === '#bacdc0'), px.controlColours);
    C('backdrop: every 10x10 block outside the popup is one colour (hard blocks, no smoothing)', px.backdrop.uniform === px.backdrop.blocks && px.backdrop.blocks > 10000, px.backdrop);
    C('backdrop: every block = the real ending frame\'s block-centre pixel x 0.35, exactly, outside the browser-downscaled sprite boxes (never lighter)',
      px.backdrop.inexactElsewhere === 0 && px.backdrop.lighter === 0 && px.backdrop.exact / px.backdrop.blocks >= 0.97, px.backdrop);
    C('backdrop darkened to 35% of the real frame (65% darker): luminance ratio 0.35 +- 0.01', Math.abs(px.darkRatio - 0.35) <= 0.01, px.darkRatio);
    if (px.a1) {
      C('A1 parity: every popup pixel (frame, shadow, art, separator, control boxes) identical to the approved A1 except the title row, the control label faces and the canonical text column', px.a1.diffOutsideTitle === 0, px.a1);
      C('A1 parity: the text column differs (canonical draft subtitle + narrative replace the mockup copy; measured for owner review)', px.a1.textColumnDiff > 0, px.a1);
      C('A1 parity: the control label faces differ only because the owner-locked labels / EXIT\'s unavailable ink replace the mockup\'s', px.a1.controlLabelDiff > 0 && px.a1.controlLabelDiff < 12000, px.a1);
      C('A1 parity: the title row differs only because the brief\'s title adds a period (re-centred)', px.a1.titleRowDiff > 0 && px.a1.titleRowDiff < 4000, px.a1);
    }
    // The capture against the real browser frame (same state, gate off).
    const cap = await page.evaluate(() => { const c = window.CYOA_GAME.captureStage({ exclude: [document.getElementById('endPresentation')] }); return c.toDataURL('image/png'); });
    const capCmp = await A.run(async ({ cap, frame, downscaled }) => {
      const C2 = await pixels(cap); const F = await pixels(frame); let n = 0, same = 0, near = 0, outN = 0, outSame = 0, inN = 0, inSame = 0;
      for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) {
        const i = (y * F.w + x) * 4; n++;
        const d = Math.max(Math.abs(F.d[i] - C2.d[i]), Math.abs(F.d[i + 1] - C2.d[i + 1]), Math.abs(F.d[i + 2] - C2.d[i + 2]));
        if (d === 0) same++; if (d <= 2) near++;
        const ds = downscaled.some((b) => x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3]);
        if (ds) { inN++; if (!d) inSame++; } else { outN++; if (!d) outSame++; }
      }
      return { pixels: n, identical: same, within2: near, identicalPct: +(100 * same / n).toFixed(4), outsideDownscaled: { pixels: outN, identical: outSame, pct: +(100 * outSame / outN).toFixed(4) }, downscaledSprites: { pixels: inN, identical: inSame, pct: +(100 * inSame / inN).toFixed(2) } };
    }, { cap, frame: b64(endingFrame), downscaled });
    M.capture = capCmp;
    C('the frozen capture is the real game frame: >=99.99% of pixels identical to the browser\'s own screenshot, outside the ' + downscaled.length + ' browser-downscaled sprite boxes',
      downscaled.length > 0 && capCmp.outsideDownscaled.identical / capCmp.outsideDownscaled.pixels >= 0.9999, capCmp);

    // Freeze and isolation.
    await page.waitForTimeout(700);
    const later = await page.screenshot();
    C('frozen: the frame is unchanged 0.7s later (no typing, motion or card transition shows)', later.equals(canonical));
    const box = await page.evaluate(() => { const b = document.getElementById('choiceViewport').getBoundingClientRect(); return [b.left + 40, b.top + 30]; });
    await page.mouse.click(box[0], box[1]);
    await page.mouse.click(120, 980);
    await page.mouse.wheel(0, 400);
    for (const k of ['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'n', 'f']) await page.keyboard.press(k);
    await page.evaluate(() => { const F = window.CYOA_GAME.flow; F.choose(0); F.toggleInspect('expo_examiner_badge'); F.utility('notes'); F.skip(); });
    await page.evaluate(() => document.getElementById('endControl2').focus());
    await page.keyboard.press('Enter');
    await page.keyboard.press(' ');
    const after = await snapshot(page);
    const ui = await page.evaluate(() => ({ overlay: window.CYOA_GAME.ui.overlay, inspector: window.CYOA_GAME.ui.inspector, phase: document.body.dataset.phase, open: !!document.body.dataset.endPresentation, log: window.CYOA_GAME.endPresentation.log() }));
    C('no click, wheel, key or flow call reaches the game: state and save unchanged, no NOTES/inspector, still the one proof',
      after.state === atOpen.state && after.save === atOpen.save && !ui.overlay && !ui.inspector && ui.open && ui.log.filter((x) => x.t === 'open').length === 1, ui);
    C('the unavailable EXIT does nothing but say so (Enter/Space on it only updates the review notice)', ui.log.filter((x) => x.t === 'control' && x.label === 'EXIT' && x.action === null).length >= 1
      && after.state === atOpen.state, ui.log);
    await page.evaluate(() => document.getElementById('endPresentation').focus());
    const tabs = [];
    for (let i = 0; i < 5; i++) { await page.keyboard.press('Tab'); tabs.push(await page.evaluate(() => document.activeElement.id)); }
    await page.keyboard.press('Shift+Tab');
    tabs.push(await page.evaluate(() => document.activeElement.id));
    C('Tab / Shift+Tab cycle only the three controls (focus never leaves the dialog)', tabs.join() === 'endControl0,endControl1,endControl2,endControl0,endControl1,endControl0', tabs);
    await page.mouse.click(1110 + 120, 669 + 31); // a real pointer click on EXIT (aria-disabled: Playwright's click() refuses it)
    const clicked = await page.evaluate(() => document.getElementById('endNotice').getAttribute('aria-label'));
    C('clicking EXIT explains the pending main menu and performs no game action (no fake quit, no save change)', /EXIT LEADS TO THE MAIN MENU, WHICH DOES NOT EXIST YET/.test(clicked)
      && (await snapshot(page)).state === atOpen.state && (await snapshot(page)).save === atOpen.save, clicked);
    await shot(page, '02_voluntary_control_clicked');

    // Resize: uniform scale with the stage, then restored exactly.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(150);
    const small = await shot(page, '03_voluntary_1280x720');
    const geo = await page.evaluate(() => { const b = document.getElementById('endArt').getBoundingClientRect(); const p = document.getElementById('endPanel').getBoundingClientRect(); const st = document.getElementById('stage').getBoundingClientRect(); return { art: [b.left - st.left, b.top - st.top, b.width, b.height], panel: [p.width, p.height], k: st.width / 1920 }; });
    const k = 1280 / 1920;
    C('1280x720: the whole composition scales uniformly with the stage (no re-centring on the window)', Math.abs(geo.k - k) < 1e-6 && Math.abs(geo.art[0] - 312 * k) < 0.01 && Math.abs(geo.art[1] - 205 * k) < 0.01
      && Math.abs(geo.art[2] - 628 * k) < 0.01 && Math.abs(geo.art[3] - 412 * k) < 0.01, geo);
    const smallCheck = await A.run(async ({ s }) => { const S = await pixels(s); return hex(S, Math.round(1645 * 2 / 3), Math.round(780 * 2 / 3)); }, { s: b64(small) });
    C('1280x720: still the pixelated, darkened backdrop and the popup shadow (no stale live frame)', smallCheck === '#101e22', smallCheck);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(150);
    const restored = await page.screenshot();
    const same1 = await A.run(async ({ a, b }) => { const A2 = await pixels(a); const B = await pixels(b); let d = 0; for (let i = 0; i < A2.d.length; i += 4) if (A2.d[i] !== B.d[i] || A2.d[i + 1] !== B.d[i + 1] || A2.d[i + 2] !== B.d[i + 2]) d++; return d; }, { a: b64(restored), b: b64(clicked ? fs.readFileSync(path.join(OUT, name + '_02_voluntary_control_clicked.png')) : canonical) });
    C('back at 1920x1080: the identical frame as before the resize', same1 === 0, same1);

    // Reduced motion: the same static result.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const rm = await page.screenshot();
    C('reduced motion: same static pixelated, darkened proof', rm.equals(restored));
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // Escape: back to the authored ending, identical to the gate-off frame; BEGIN AGAIN still works.
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => ({ open: !!document.body.dataset.endPresentation, el: !!document.getElementById('endPresentation'), inert: Array.from(document.getElementById('stage').children).some((n) => n.inert), cards: window.CYOA_GAME.ui.cards.map((c) => c.id), node: document.body.dataset.node }));
    C('Escape closes it: no dialog, nothing inert, the ending and its BEGIN AGAIN card as authored', !closed.open && !closed.el && !closed.inert && closed.cards.join() === 'restart_chair_death' && closed.node === 'chapter-01:exit_chair_fatal', closed);
    const back = await shot(page, '04_voluntary_after_escape');
    const vs = await A.run(async ({ a, b }) => { const A2 = await pixels(a); const B = await pixels(b); let d = 0; for (let i = 0; i < A2.d.length; i += 4) if (A2.d[i] !== B.d[i] || A2.d[i + 1] !== B.d[i + 1] || A2.d[i + 2] !== B.d[i + 2]) d++; return d; }, { a: b64(back), b: b64(endingFrame) });
    M.afterEscapeDiffPixels = vs;
    C('after Escape the screen is the real ending frame again (identical to the gate-off game)', vs === 0, vs);
    const end = await snapshot(page);
    C('opening and closing never saved or changed state', end.state === atOpen.state && end.save === atOpen.save);
    // Reload at the ending (gate on): the proof shows again for that state, once.
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
    await page.waitForFunction(() => !!document.body.dataset.endPresentation, null, { timeout: 15000 });
    const rl = await page.evaluate(() => ({ log: window.CYOA_GAME.endPresentation.log(), save: document.body.dataset.save, node: document.body.dataset.node }));
    C('reload at the ending: restored save, the proof once again over the real frame', rl.save === 'restored' && rl.node === 'chapter-01:exit_chair_fatal' && rl.log.filter((x) => x.t === 'open').length === 1, rl);
    await shot(page, '05_voluntary_after_reload');
    await page.keyboard.press('Escape');
    await take(page, 'restart_chair_death');
    const rs = await page.evaluate(() => ({ node: document.body.dataset.node, open: !!document.body.dataset.endPresentation }));
    C('after closing, the authored BEGIN AGAIN restarts as before (no proof on the new playthrough)', /^prologue-00:/.test(rs.node) && !rs.open, rs);
  });

  // 3. Cause selection: the other ways into the same ending share ONE popup; a successful escape never. -----
  // The popup and its 12px shadow are opaque, so they must be pixel-identical to the voluntary popup.
  // (The shadow is offset +12,+12: the corners it leaves uncovered show the cause-specific backdrop.)
  const samePopup = (a, b) => A.run(async ({ a, b }) => { const P = await pixels(a), Q = await pixels(b); let d = 0, n = 0;
    const covered = (x, y) => (x < 1640 && y < 775) || (x >= 292 && y >= 147);
    for (let y = 135; y < 787; y++) for (let x = 280; x < 1652; x++) { if (!covered(x, y)) continue; n++; const u = at(P, x, y), v = at(Q, x, y); if (u[0] !== v[0] || u[1] !== v[1] || u[2] !== v[2]) d++; }
    return n > 890000 ? d : -1; }, { a: b64(a), b: b64(b) });
  const failedCause = async (scenario, item, choice, checkId, file) => {
    const f = seedFor(item, choice, checkId, false);
    await game(scenario, f.save, true, async (page, C) => {
      await take(page, choice).catch(() => {});
      await page.waitForFunction(() => !!document.body.dataset.endPresentation, null, { timeout: 15000 });
      const s = await page.evaluate(() => ({ node: document.body.dataset.node, entry: document.getElementById('endPresentation').dataset.entry, src: document.getElementById('endArt').getAttribute('src'),
        title: document.getElementById('endTitle').dataset.text, body: document.getElementById('endBody').dataset.text, log: window.CYOA_GAME.endPresentation.log(),
        controls: Array.from(document.querySelectorAll('#endPresentation button')).map((b) => b.dataset.label + ':' + b.dataset.available),
        cause: window.CYOA_RULES.endCause(window.CYOA_GAME.story, window.CYOA_GAME.state) }));
      const opens = s.log.filter((x) => x.t === 'open');
      C('failed ' + checkId + ': the same ending opens the SAME canonical popup (entry, art, title, copy), once', s.node === 'chapter-01:exit_chair_fatal' && opens.length === 1 && s.entry === ENTRY.id
        && /art\/deaths\/rest_assured_voluntary\.png$/.test(s.src) && s.title === ENTRY.title && s.body.replace(/\n/g, ' ') === ENTRY.body.join(' '), s);
      C('failed ' + checkId + ': the real cause is kept (choice, check id, ok:false), distinct from voluntary acceptance', s.cause.choice === choice && s.cause.check === checkId && s.cause.ok === false
        && JSON.stringify(opens[0].cause) === JSON.stringify(s.cause), s.cause);
      C('failed ' + checkId + ': RETRY (back before this checked decision) and CHECKPOINT available, EXIT unavailable', s.controls.join() === 'RETRY:true,CHECKPOINT:true,EXIT:false', s.controls);
      const shotBuf = await shot(page, file);
      const d = await samePopup(shotBuf, voluntaryShot);
      M['popupDiff_' + checkId] = d;
      C('failed ' + checkId + ': the popup region is pixel-identical to the voluntary popup (one shared presentation)', d === 0, d);
    });
  };
  await failedCause('stapler_failed', 'red_stapler', 'stapler_breakout', 'house_chair_stapler', '06_stapler_failed');
  await failedCause('unarmed_failed', null, 'physical_chair_breakout', 'house_chair_unarmed', '07_unarmed_failed');
  const stapler = seedFor('red_stapler', 'stapler_breakout', 'house_chair_stapler', false);
  await game('stapler_failed_gate_off', stapler.save, false, async (page, C) => {
    await take(page, 'stapler_breakout');
    const s = await page.evaluate(() => ({ node: document.body.dataset.node, open: !!document.body.dataset.endPresentation, cards: window.CYOA_GAME.ui.cards.map((c) => c.id), log: window.CYOA_GAME.endPresentation.log() }));
    C('?nodeathpopups, failed stapler: the authored ending with only BEGIN AGAIN, no popup', s.node === 'chapter-01:exit_chair_fatal' && !s.open && !s.log.length && s.cards.join() === 'restart_chair_death', s);
  });
  const escape = seedFor(null, 'physical_chair_breakout', 'house_chair_unarmed', true);
  await game('chair_escape', escape.save, true, async (page, C) => {
    await take(page, 'physical_chair_breakout');
    await take(page, 'go_direct_service_exit');
    await take(page, 'force_service_release');
    const s = await page.evaluate(() => ({ node: document.body.dataset.node, open: !!document.body.dataset.endPresentation, log: window.CYOA_GAME.endPresentation.log() }));
    C('successful chair escape: service exit, never the presentation', /exit_service_(clean|registered)$/.test(s.node) && !s.open && !s.log.length, s);
  });
  await A.close();
  await context.close();
  await browser.close();
}

// Engine-level cause selection over every catalogued ending (no browser) -----------------------------
function engineCauses() {
  const g = 'engine';
  const match = (cause) => ENTRIES.filter((e) => cause && Object.keys(e.when).every((k) => cause[k] === e.when[k])).map((e) => e.id);
  const base = R.stepAll(story, R.prologue(story, null, 1), CHAIR);
  const vol = Rules.endCause(story, Rules.step(story, base, { choice: 'accept_permanent_rest' }).state);
  check('node', g, 'voluntary: endCause names the choice and its origin, no check; matches the shared canonical entry', JSON.stringify(vol) === JSON.stringify({ end: 'chapter-01:exit_chair_fatal', from: 'chapter-01:chair_locked', choice: 'accept_permanent_rest' })
    && match(vol).join() === 'chapter-01:exit_chair_fatal', vol);
  let fails = 0, passes = 0, sfails = 0, bad = [];
  for (let seed = 1; seed <= 60; seed++) {
    const b = R.stepAll(story, R.prologue(story, null, seed), CHAIR);
    const t = Rules.step(story, b, { choice: 'physical_chair_breakout' }).state;
    const c = Rules.endCause(story, t);
    if (t.node === 'exit_chair_fatal') { fails++; if (match(c).join() !== 'chapter-01:exit_chair_fatal' || c.ok !== false || c.check !== 'house_chair_unarmed') bad.push(c); } else { passes++; if (c !== null) bad.push(c); }
    const sb = R.stepAll(story, R.prologue(story, 'red_stapler', seed), R.HOUSE.stapler_clean.path.slice(0, R.HOUSE.stapler_clean.path.indexOf('enter_rest_assured') + 1));
    const st = Rules.step(story, sb, { choice: 'stapler_breakout' }).state;
    const sc = Rules.endCause(story, st);
    if (st.node === 'exit_chair_fatal') { sfails++; if (match(sc).join() !== 'chapter-01:exit_chair_fatal' || sc.check !== 'house_chair_stapler' || sc.ok !== false) bad.push(sc); }
    else if (match(sc).length) bad.push(sc);
  }
  check('node', g, 'unarmed and stapler failures (60 seeds each): cause carries the check id and ok:false; every failure matches the ONE shared entry; passes are not endings and never match', fails > 0 && passes > 0 && sfails > 0 && !bad.length, { fails, sfails, passes, bad: bad.slice(0, 3) });
  // Every catalogued Chapter 2 route ending: a fatal ending matches exactly its own entry, every other
  // ending none; no House exit matches.
  // Since Chapter 3 integration (docs/104) the five living endings CONTINUE into Chapter 3 (no longer terminal):
  // they are counted as `living` and must select no popup, exactly like any other non-fatal state.
  let ends = 0, fatalEnds = 0, living = 0; const hits = [];
  for (const route of R.ROUTES) {
    const f = R.findSeed(story, route, 400);
    if (!f) continue;
    const c = Rules.endCause(story, f.end);
    if (c) ends++;
    if (!route.fatal && f.end.node === route.end && story.chapters['chapter-02'].nodes[route.end].choices.some((x) => x.chapter === 'chapter-03')) living++;
    const want = route.fatal ? ['chapter-02:' + route.end] : [];
    if (route.fatal) fatalEnds++;
    if (match(c).join() !== want.join()) hits.push(route.name + ':' + match(c).join());
  }
  for (const k of ['plant', 'martin', 'showroom', 'clean', 'registered']) { let e = null; for (let s = 1; s <= 400 && !e; s++) e = R.houseExit(story, k, s); if (match(Rules.endCause(story, e)).length) hits.push(k); }
  check('node', g, 'Chapter 2: every fatal route ending (' + fatalEnds + ') selects exactly its own popup; no living ending (' + living + ' routes, CONTINUE into Chapter 3), no other ending (' + ends + ' terminal reached) and no House exit does',
    ends + living > 20 && living > 15 && fatalEnds >= 5 && ends >= fatalEnds && !hits.length, { hits, ends, living, fatalEnds });
  // One opted-in entry, the shared canonical one; its art is the pinned approved file, byte-identical.
  const buf = fs.readFileSync(path.join(ROOT, ENTRY.art.path));
  check('node', g, 'every canonical death entry is opted in (canonical *: 6); the shared chapter-01:exit_chair_fatal art is the approved native PNG (sha256 7f469efa..., 314x206, 2x)', ENTRIES.length === CANON.entries.length && ENTRIES.length === 6 && !!ENTRY
    && JSON.stringify(ENTRY.when) === JSON.stringify({ end: 'chapter-01:exit_chair_fatal' })
    && require('crypto').createHash('sha256').update(buf).digest('hex') === ENTRY.art.sha256 && ENTRY.art.sha256 === '7f469efa40548568af5dfe3c11602b9c6293282d9574caa5f36fc37113e72d9c'
    && buf.readUInt32BE(16) === 314 && buf.readUInt32BE(20) === 206 && ENTRY.art.scale === 2);
  check('node', g, 'the game keeps NO story-authored popup field: no title, subtitle, body, art or when in end-presentations.review.js', DATA.entries.every((r) => ['title', 'subtitle', 'body', 'art', 'when'].every((k) => !(k in r))));
  const ce = CANON.entries.map((e) => JSON.stringify([e.id, e.when, e.title, e.subtitle, e.body])).join(), ee = EXPORT.entries.map((e) => JSON.stringify([e.id, e.when, e.title, e.subtitle, e.body])).join();
  check('node', g, 'the runtime module carries exactly the projected canonical export (ids, when, title, subtitle, body) at the pinned revision', ce === ee
    && CANON.storyboard.revision === JSON.parse(fs.readFileSync(path.join(ROOT, 'story/canon.lock.json'), 'utf8')).revision);
  // docs/102 (public docs/108): the five approved Chapter 2 death images are integrated; the owner-accepted empty
  // frame (docs/99) applied only until then. Each entry now hands the popup its own selected file and hash.
  const ch2Deaths = CANON.entries.filter((e) => /^chapter-02:/.test(e.id));
  check('node', g, 'Chapter 2 fatal entries carry their own selected art (native 314x206 at 2x, file sha256 = recorded); all six copies approved and ready; no Chapter 3 entry is consumed',
    ch2Deaths.length === 5 && new Set(ch2Deaths.map((e) => e.art && e.art.path)).size === 5 && ch2Deaths.every((e) => e.art && /^art\/deaths\/[a-z_]+\.png$/.test(e.art.path)
      && JSON.stringify(e.art.size) === '[314,206]' && e.art.scale === 2 && fs.existsSync(path.join(ROOT, e.art.path))
      && require('crypto').createHash('sha256').update(fs.readFileSync(path.join(ROOT, e.art.path))).digest('hex') === e.art.sha256)
    && !CANON.entries.some((e) => /^chapter-03:/.test(e.id)) && CANON.entries.every((e) => e.popupStatus === 'owner-approved' && e.readyForGameplay === true));
  check('node', g, 'ordinary play: activation always, ?nodeathpopups turns it off; no standing notice; backdrop 10px x 0.35', DATA.activation === 'always' && DATA.disableWith === 'nodeathpopups' && !('gate' in DATA)
    && ENTRY.notice === null && ENTRY.backdrop.block === 10 && ENTRY.backdrop.multiply === 0.35);
  check('node', g, 'glyph fallback is explicit and narrow (only em/en dash -> "-")', JSON.stringify(DATA.glyphFallback) === JSON.stringify({ '\u2014': '-', '\u2013': '-' }));
  const code = ['game/js/end-presentation.js', 'game/js/stage-capture.js'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  check('node', g, 'the generic modules name no chapter, node, choice, art path or copy', !/chapter-0|exit_chair|accept_permanent|rest_assured|art\/deaths|PERMANENTLY|relaxation|TREATMENT/.test(code.replace(/\/\/.*$/gm, '')));
}

(async () => {
  engineCauses();
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browsers = (process.env.QA_BROWSERS || process.env.BROWSERS || 'chromium,firefox').split(',');
  try { for (const b of browsers) await run(b, base); } finally { server.close(); }
  const failed = results.filter((x) => !x.ok);
  const by = {};
  results.forEach((r) => { by[r.browser] = by[r.browser] || [0, 0]; by[r.browser][1]++; if (r.ok) by[r.browser][0]++; });
  console.log('End presentation proof: ' + (results.length - failed.length) + '/' + results.length + ' passed (' + Object.keys(by).map((b) => b + ' ' + by[b][0] + '/' + by[b][1]).join(', ') + ')');
  console.log('measures ' + JSON.stringify(measures));
  fs.writeFileSync(path.join(__dirname, 'end_presentation_results.json'), JSON.stringify({ passed: results.length - failed.length, total: results.length, measures, results }, null, 1) + '\n');
  if (failed.length) process.exitCode = 1;
})().catch((e) => { console.error(e.stack || String(e)); process.exitCode = 1; });
