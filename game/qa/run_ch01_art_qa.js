#!/usr/bin/env node
// Browser acceptance of the Chapter 1 production art (docs/92, docs/93) in the real game, Chromium
// and Firefox. Every scenario starts from a real Prologue playthrough (game/qa/ch02_routes.js: no
// invented inventory, flags or dice) saved at the House arrival, then plays the production UI.
//
// At every settled step the DOM art layers must equal what Rules.view selects for the game's own
// state (no stale or duplicated layer). At the key states the expected image is also named
// explicitly, and the pixels on screen are compared with the source PNGs composited exactly as
// docs/92 requires (opaque scene or alternate, then at most one overlay; 4x NEAREST from the same
// origin; portrait art 1:1). Reloads restore from the game's own autosave.
//   NODE_PATH=<playwright install> node game/qa/run_ch01_art_qa.js
// Writes game/qa/ch01_art_qa_results.json and game/qa/ch01_art_screenshots/ (not committed).
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createRequire } = require('module');
const ROOT = path.resolve(__dirname, '../..');
const Rules = require('../js/rules.js');
const story = require('../content/story.generated.js').story;
const R = require('./ch02_routes.js');
let pw;
try { pw = createRequire(__filename)('playwright'); } catch (_) { console.error('Playwright required; set NODE_PATH to its installation directory'); process.exit(2); }
const OUT = path.join(__dirname, 'ch01_art_screenshots');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'cyoa-save:' + story.id;

const results = [];
function check(browser, scenario, name, ok, detail) {
  results.push({ browser, scenario, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + browser + ' / ' + scenario + '] ' + name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 700)));
}

// Real saves at chapter-01:house_arrival -------------------------------------------------------------
function arrivalSave(item, seed) {
  const s = R.prologue(story, item, seed);
  if (s.chapter !== 'chapter-01' || s.node !== 'house_arrival') throw new Error('Prologue did not reach the House');
  return Rules.serialize(story, s, { presented: s.transcript.length });
}
// The first seed whose real rolls finish `path` at `end` (dice depend only on seed + check id).
function seedFor(item, path, end, accept) {
  for (let seed = 1; seed <= 3000; seed++) {
    let s;
    try { s = R.stepAll(story, R.prologue(story, item, seed), path); } catch (e) { if (e.missing) continue; throw e; }
    if (s.node === end && (!accept || accept(s))) return seed;
  }
  throw new Error('no seed reaches ' + end);
}
const P = R.HOUSE;
const TO_STORAGE = ['enter_show_home', 'hear_house_greeting', 'permit_housekeeping', 'ask_for_bathroom_after_storage', 'recover_belongings_now'];
const ALBUM_PRE = P.showroom.path.slice(0, P.showroom.path.indexOf('inspect_album'));
const PLANT_PRE = P.plant.path.slice(0, -1);
const SC = (id) => 'scene:house_of_tomorrow/' + id;

// The page -------------------------------------------------------------------------------------------
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
// Until the player can act; typing is skipped. Presentation-only CONTINUE cards are taken unless
// `stopAtContinue` (the album pages are inspected one by one).
async function settle(page, stopAtContinue) {
  for (let i = 0; i < 40; i++) {
    await page.waitForFunction(() => {
      const p = document.body.dataset.phase;
      if (p === 'typing') window.CYOA_GAME.flow.skip();
      return p === 'choosing';
    }, null, { timeout: 25000, polling: 40 });
    const cont = await page.evaluate(() => window.CYOA_GAME.ui.cards.length === 1 && window.CYOA_GAME.ui.cards[0].id === '__continue');
    if (!cont || stopAtContinue) return cont;
    await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
  }
  throw new Error('presentation CONTINUE never ended');
}
async function take(page, id, stopAtContinue) {
  await settle(page);
  const i = await page.evaluate((x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), id);
  if (i < 0) throw new Error('no card ' + id + ' at ' + await page.evaluate(() => document.body.dataset.node));
  await page.evaluate((k) => window.CYOA_GAME.flow.choose(k), i);
  return settle(page, stopAtContinue);
}
// The art layers on screen, and what Rules.view selects for the game's own state.
async function art(page) {
  return page.evaluate(() => {
    const G = window.CYOA_GAME;
    const d = (id) => { const n = document.getElementById(id); return n && n.parentNode ? n.dataset.art || null : null; };
    const portrait = document.getElementById('portrait');
    const dom = { scene: d('sceneArt'), overlay: d('sceneOverlay'), view: d('portraitView'), background: d('portraitBackground'), pose: d('portraitNpc'), focus: d('focusArt'),
      portraitShown: portrait.style.display !== 'none' && getComputedStyle(portrait).display !== 'none', layers: portrait.dataset.layers || '' };
    const v = G.flow.view();
    const sa = v.sceneArt;
    const want = { scene: sa.replace ? G.artKey.sceneState(v.scene, sa.replace) : G.artKey.scene(v.scene), overlay: sa.overlay ? G.artKey.sceneState(v.scene, sa.overlay) : null,
      view: null, background: null, pose: null, focus: null, portraitShown: v.mode !== 'narrative' };
    if (v.mode === 'dialogue') {
      if (v.portrait.view) want.view = G.artKey.view(v.portrait.id, v.portrait.view);
      else { want.background = G.artKey.background(v.portrait.id, v.portrait.background); want.pose = G.artKey.pose(v.portrait.id, v.portrait.pose); }
    }
    const fa = document.getElementById('focusDescription');
    if (v.mode === 'focus') {
      const f = G.story.assets.focus[v.focus];
      want.focus = f && typeof f === 'object' ? G.artKey.focusPage(v.focus, Math.min(+fa.dataset.segment, f.pages.length - 1) + 1) : G.artKey.focus(v.focus);
    }
    // Every drawn layer is a decoded image at its class's integer scale (no first-frame flash).
    const imgs = Array.from(document.querySelectorAll('#scene img.art, #portrait img.art'));
    const sized = imgs.every((i) => i.complete && i.naturalWidth > 0 && i.width === i.naturalWidth * (i.closest('#scene') ? 4 : 1) && i.height === i.naturalHeight * (i.closest('#scene') ? 4 : 1));
    return { node: document.body.dataset.node, mode: v.mode, dom, want, sized, overlays: document.querySelectorAll('#sceneOverlay').length,
      segment: fa ? fa.dataset.segment : null, pageText: fa ? fa.getAttribute('aria-label') : null, inv: G.state.inventory.slice(), flags: Object.assign({}, G.state.flags) };
  });
}
function same(a) {
  const k = ['scene', 'overlay', 'view', 'background', 'pose', 'focus', 'portraitShown'];
  return k.every((x) => a.dom[x] === a.want[x]) && a.sized && a.overlays <= 1;
}
// Pixels on screen vs the source PNGs composited as docs/92 says. region: 'scene' | 'portrait'.
// Compared wherever nothing is drawn above the art by design: the shell frame (one 1920x1080 PNG,
// on top of the apertures) is masked by its own alpha, and the development draft stamp by its box.
// The item-received slip must have gone first.
async function pixels(page, region, layers) {
  await page.waitForFunction(() => { const n = document.getElementById('itemNotice'); return !n || getComputedStyle(n).display === 'none'; }, null, { timeout: 20000 });
  const box = await page.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, region);
  const shot = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
  return page.evaluate(async ({ b64, layers, box }) => {
    const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('load ' + src.slice(0, 60))); i.src = src; });
    const s = await load('data:image/png;base64,' + b64);
    const W = s.naturalWidth;
    const H = s.naturalHeight;
    const a = document.createElement('canvas'); a.width = W; a.height = H;
    const ac = a.getContext('2d'); ac.drawImage(s, 0, 0);
    const e = document.createElement('canvas'); e.width = W; e.height = H;
    const ec = e.getContext('2d'); ec.imageSmoothingEnabled = false;
    for (const l of layers) { const im = await load(l.url + '?px'); ec.drawImage(im, l.x, l.y, im.naturalWidth * l.scale, im.naturalHeight * l.scale); }
    const st = document.getElementById('draftStamp');
    const sr = st && st.style.display !== 'none' ? st.getBoundingClientRect() : null;
    const shell = document.getElementById('shell');
    const shr = shell.getBoundingClientRect();
    const m = document.createElement('canvas'); m.width = W; m.height = H;
    const mc = m.getContext('2d');
    mc.drawImage(await load(shell.currentSrc || shell.src), shr.x - box.x, shr.y - box.y, shr.width, shr.height);
    const M = mc.getImageData(0, 0, W, H).data;
    const A = ac.getImageData(0, 0, W, H).data;
    const E = ec.getImageData(0, 0, W, H).data;
    let n = 0;
    let bad = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (sr && box.x + x >= sr.left - 1 && box.x + x < sr.right + 1 && box.y + y >= sr.top - 1 && box.y + y < sr.bottom + 1) continue;
        const i = (y * W + x) * 4;
        if (M[i + 3] !== 0) continue;
        n++;
        if (Math.abs(A[i] - E[i]) > 3 || Math.abs(A[i + 1] - E[i + 1]) > 3 || Math.abs(A[i + 2] - E[i + 2]) > 3) bad++;
      }
    }
    return { n, bad, W, H };
  }, { b64: shot.toString('base64'), layers, box });
}
const url = (p) => '/' + p;
const sceneLayers = (base, overlay) => [{ url: url(base), scale: 4, x: 0, y: 0 }].concat(overlay ? [{ url: url(overlay), scale: 4, x: 0, y: 0 }] : []);
async function portraitLayers(page, file) {
  const off = await page.evaluate(() => [window.CYOA_GAME.TUNING.portrait.backgroundX, window.CYOA_GAME.TUNING.portrait.backgroundY]);
  return [{ url: url(file), scale: 1, x: off[0], y: off[1] }];
}
const ST = 'art/scenes/house_of_tomorrow/';

async function run(name, base) {
  const browser = await pw[name].launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  async function scenario(id, item, seed, fn) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
    const C = (n, ok, d) => check(name, id, n, ok, d);
    let steps = 0;
    let mismatches = [];
    // Every settled step: DOM layers == the engine's selection.
    const probe = async () => { const a = await art(page); steps++; if (!same(a)) mismatches.push(a); return a; };
    const go = async (choices) => { for (const c of choices) { await take(page, c); await probe(); } };
    const shot = (n) => page.screenshot({ path: path.join(OUT, name + '_' + id + '_' + n + '.png') });
    const px = async (label, region, layers) => { const r = await pixels(page, region, layers); C('pixels: ' + label + ' (' + r.n + ' px compared)', r.n > 1000 && r.bad === 0, r); };
    const reload = async () => {
      await page.reload();
      await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
      await settle(page);
      return probe();
    };
    try {
      await page.goto(base + '/story/storyboard-manifest.json');
      await page.evaluate(([k, raw]) => localStorage.setItem(k, raw), [SAVE_KEY, arrivalSave(item, seed)]);
      await page.goto(base + '/game/index.html');
      await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
      await settle(page);
      await probe();
      await fn({ page, C, go, probe, shot, px, reload });
      C('every settled step: scene, overlay and portrait layers are exactly the engine\'s selection (' + steps + ' steps)', !mismatches.length, mismatches.slice(0, 2));
      C('no browser or console errors, no failed requests', !errors.length, errors);
    } catch (e) {
      C('scenario completed', false, e.stack || String(e));
    }
    await page.close();
  }

  // 1. Arrival, House intercom in the foyer, family album pages, gallery intercom ------------------
  await scenario('album', null, seedFor(null, ALBUM_PRE, 'portrait_print'), async ({ page, C, go, probe, shot, px, reload }) => {
    let a = await probe();
    C('arrival: single-door arrival scene, Narrative B (no portrait)', a.dom.scene === SC('arrival') && !a.dom.overlay && !a.dom.portraitShown, a.dom);
    await px('arrival scene 4x', 'scene', sceneLayers(ST + 'arrival.png'));
    await shot('01_arrival');
    await go(['enter_show_home']);
    a = await probe();
    C('badge registration: closed single-door foyer', a.dom.scene === SC('foyer') && !a.dom.overlay, a.dom);
    await go(['hear_house_greeting']);
    a = await probe();
    C('welcome_home: House complete foyer view; no background or pose layer', a.mode === 'dialogue' && a.dom.view === 'portrait:house:view:house_of_tomorrow/foyer'
      && !a.dom.background && !a.dom.pose && a.dom.layers === 'complete' && a.dom.portraitShown, a.dom);
    await px('House foyer conversation view 1:1', 'portrait', await portraitLayers(page, 'art/portraits/house/foyer_conversation.png'));
    await shot('02_house_foyer_view');
    await go(ALBUM_PRE.slice(2));
    a = await probe();
    C('portrait_print: gallery with album on cabinet; photo held once', a.node === 'chapter-01:portrait_print' && a.dom.scene === SC('portrait_gallery') && !a.dom.overlay
      && a.inv.filter((x) => x === 'family_portrait_photo').length === 1, a);
    // The family photograph item: slot and inspect art.
    const slot = await page.evaluate(() => { const n = document.querySelector('[data-item="family_portrait_photo"]'); const i = n && Array.from(n.querySelectorAll('img')).find((x) => /family_portrait_photo_slot\.png/.test(x.getAttribute('src') || '')); return i ? { src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight } : null; });
    C('photo slot art in the inventory (96x96)', slot && /family_portrait_photo_slot\.png/.test(slot.src) && slot.w === 96 && slot.h === 96, slot);
    await page.evaluate(() => window.CYOA_GAME.flow.toggleInspect('family_portrait_photo'));
    const insp = await page.evaluate(() => { const i = document.querySelector('#inspectArt img'); return i ? { src: i.getAttribute('src') || '', key: i.dataset.art || '', w: i.naturalWidth, h: i.naturalHeight } : null; });
    C('photo inspect art in the inspector (565x451)', insp && insp.w === 565 && insp.h === 451, insp);
    await shot('03_photo_inspect');
    await page.evaluate(() => window.CYOA_GAME.flow.closeInspector());
    a = await probe();
    C('inspector closed: gallery unchanged', a.dom.scene === SC('portrait_gallery') && !a.dom.overlay, a.dom);
    // Album: three semantic pages, gallery without the album throughout.
    const pages = [];
    let cont = await take(page, 'inspect_album', true);
    for (;;) {
      a = await probe();
      pages.push({ seg: a.segment, focus: a.dom.focus, scene: a.dom.scene, text: a.pageText });
      if (pages.length <= 3) {
        await px('album page ' + pages.length + ' close-up 1:1', 'portrait', [{ url: url('art/focus/house_of_tomorrow/album_page_' + (+a.segment + 1) + '.png'), scale: 1, x: 0, y: 0 }]);
        await px('album-removed gallery 4x (page ' + pages.length + ')', 'scene', sceneLayers(ST + 'states/portrait_gallery_album_removed.png'));
        await shot('04_album_page_' + pages.length);
      }
      if (!cont) break;
      await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
      cont = await settle(page, true);
    }
    const segs = pages.map((p) => p.seg);
    C('album pages appear in order 1, 2, 3 and never go back', segs[0] === '0' && segs.includes('1') && segs.includes('2') && segs.every((s, i) => !i || +s >= +segs[i - 1]), pages);
    C('each picture is paired with its own text (Page one / two / three)', pages.every((p) => p.focus === 'focus:house_of_tomorrow/portrait_gallery/album:page:' + (+p.seg + 1)
      && (p.seg === '0' ? /Page one/.test(p.text) && !/Page two/.test(p.text) : p.seg === '1' ? /Page two/.test(p.text) && !/Page (one|three)/.test(p.text) : !/Page (one|two)/.test(p.text))), pages);
    C('album removed from the gallery on every page', pages.every((p) => p.scene === 'scene:house_of_tomorrow/portrait_gallery#album_removed'), pages.map((p) => p.scene));
    C('album never enters inventory', !a.inv.some((x) => /album/.test(x)));
    await go(['close_album']);
    a = await probe();
    C('close: identical gallery with the album restored immediately', a.node === 'chapter-01:portrait_print' && a.dom.scene === SC('portrait_gallery') && !a.dom.focus, a.dom);
    await px('gallery restored 4x', 'scene', sceneLayers(ST + 'portrait_gallery.png'));
    await shot('05_album_closed');
    // Repeat visit, then a reload in the middle of it.
    await take(page, 'inspect_album', true);
    a = await probe();
    C('repeat visit: album removed again, page 1 first', a.dom.scene === 'scene:house_of_tomorrow/portrait_gallery#album_removed' && a.segment === '0', a);
    await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
    await settle(page, true);
    a = await reload();
    C('reload mid-album: still album-removed, picture matches the restored text page', a.mode === 'focus' && a.dom.scene === 'scene:house_of_tomorrow/portrait_gallery#album_removed'
      && a.dom.focus === 'focus:house_of_tomorrow/portrait_gallery/album:page:' + (+a.segment + 1), a);
    await shot('06_album_reloaded');
    await go(['close_album']);
    a = await probe();
    C('after the reload, close still restores the album', a.dom.scene === SC('portrait_gallery') && !a.dom.focus, a.dom);
    a = await reload();
    C('reload after closing: no stale album-less gallery', a.dom.scene === SC('portrait_gallery') && a.mode === 'narrative', a.dom);
    await go(['confront_house_about_album']);
    a = await probe();
    C('gallery conversation: House complete gallery view over the normal gallery', a.dom.view === 'portrait:house:view:house_of_tomorrow/portrait_gallery'
      && a.dom.scene === SC('portrait_gallery') && !a.dom.background && !a.dom.pose, a.dom);
    await px('House gallery conversation view 1:1', 'portrait', await portraitLayers(page, 'art/portraits/house/portrait_gallery_conversation.png'));
    await shot('07_house_gallery_view');
    await go(P.showroom.path.slice(P.showroom.path.indexOf('let_house_change_subject')));
    a = await probe();
    C('showroom reset exit: public exit, photo carried', a.node === 'chapter-01:exit_showroom_reset' && a.dom.scene === SC('public_exit') && a.inv.includes('family_portrait_photo'), a);
    await shot('08_showroom_exit');
  });

  // 2. Storage drawer: each real confiscated item, retrieve vs leave ------------------------------------
  for (const item of ['desk_plant', 'red_stapler', 'rubber_band_ball', 'timing_clicker']) {
    await scenario('storage_' + item, item, seedFor(item, TO_STORAGE, 'storage_cabinet'), async ({ C, go, probe, shot, px, reload }) => {
      await go(TO_STORAGE);
      let a = await probe();
      const want = 'scene:house_of_tomorrow/storage#stored_' + item;
      C('storage: exactly the ' + item + ' drawer overlay', a.dom.scene === SC('storage') && a.dom.overlay === want && a.overlays === 1 && !a.inv.includes(item), a);
      await px('storage + ' + item + ' overlay 4x', 'scene', sceneLayers(ST + 'storage.png', ST + 'states/storage_stored_' + item + '.png'));
      await shot('stored');
      a = await reload();
      C('reload: the same drawer overlay', a.dom.overlay === want && a.overlays === 1, a.dom);
      if (item === 'red_stapler') {
        await go(['leave_stored_object']);
        a = await probe();
        C('leave it: next room has no overlay and the item is not held', a.node === 'chapter-01:refused_both' && !a.dom.overlay && !a.inv.includes(item), a);
        return;
      }
      await go(['take_back_house_item']);
      a = await probe();
      C('retrieved: drawer empty, item held once', a.node === 'chapter-01:storage_reclaimed' && a.dom.scene === SC('storage') && !a.dom.overlay && a.inv.filter((x) => x === item).length === 1, a);
      await shot('retrieved');
      a = await reload();
      C('reload after retrieval: still empty', !a.dom.overlay, a.dom);
    });
  }

  // 3. Named plant: real held plant, handover -------------------------------------------------------------
  await scenario('named_plant', 'desk_plant', seedFor('desk_plant', PLANT_PRE, 'plant_adoption'), async ({ C, go, probe, shot, px, reload }) => {
    await go(PLANT_PRE);
    let a = await probe();
    C('plant_adoption: rug-hatch pedestal v02 over the closed foyer while the plant is held', a.dom.scene === SC('foyer')
      && a.dom.overlay === 'scene:house_of_tomorrow/foyer#named_plant_pedestal' && a.inv.includes('desk_plant'), a);
    await px('foyer + pedestal 4x', 'scene', sceneLayers(ST + 'foyer.png', ST + 'states/foyer_named_plant_pedestal.png'));
    await shot('pedestal');
    a = await reload();
    C('reload: pedestal again', a.dom.overlay === 'scene:house_of_tomorrow/foyer#named_plant_pedestal', a.dom);
    await go(['give_named_plant_to_house']);
    a = await probe();
    C('handover: plant gone once, resident registered, public exit with no pedestal', a.node === 'chapter-01:exit_named_plant' && !a.inv.includes('desk_plant')
      && a.flags.plant_registered_as_resident === true && a.dom.scene === SC('public_exit') && !a.dom.overlay, a);
    await px('public exit (single door open) 4x', 'scene', sceneLayers(ST + 'public_exit.png'));
    await shot('public_exit');
  });

  // 4. Equipment-service exits and the chair --------------------------------------------------------------
  const exitSeed = (k) => { for (let s = 1; s <= 400; s++) if (R.houseExit(story, k, s)) return s; throw new Error('no seed ' + k); };
  await scenario('exit_registered', null, exitSeed('registered'), async ({ C, go, probe, shot, px, reload }) => {
    await go(P.registered.path.slice(0, P.registered.path.indexOf('enter_rest_assured') + 1));
    let a = await probe();
    C('chair_locked: in-use Rest Assured scene', a.node === 'chapter-01:chair_locked' && a.dom.scene === SC('chair') && !a.dom.overlay, a.dom);
    await px('chair in use 4x', 'scene', sceneLayers(ST + 'chair.png'));
    await shot('chair_locked');
    await go(P.registered.path.slice(P.registered.path.indexOf('enter_rest_assured') + 1));
    a = await probe();
    C('registered exit: RETURNS display over the equipment corridor', a.node === 'chapter-01:exit_service_registered' && a.flags.equipment_registered === true
      && a.dom.overlay === 'scene:house_of_tomorrow/utility_exit#returns_display', a);
    await px('utility exit + RETURNS 4x', 'scene', sceneLayers(ST + 'utility_exit.png', ST + 'states/utility_exit_returns_display.png'));
    await shot('returns');
    a = await reload();
    C('reload: RETURNS again', a.dom.overlay === 'scene:house_of_tomorrow/utility_exit#returns_display', a.dom);
    C('no wristband item', !a.inv.some((x) => /wrist/.test(x)));
  });
  await scenario('exit_clean', null, exitSeed('clean'), async ({ C, go, probe, shot, px }) => {
    await go(P.clean.path);
    const a = await probe();
    C('clean exit: neutral display, no RETURNS', a.node === 'chapter-01:exit_service_clean' && !a.flags.equipment_registered && a.dom.scene === SC('utility_exit') && !a.dom.overlay, a);
    await px('utility exit neutral 4x', 'scene', sceneLayers(ST + 'utility_exit.png'));
    await shot('neutral');
  });
  await scenario('chair_fatal', null, exitSeed('chair_fatal'), async ({ C, go, probe, shot }) => {
    await go(P.chair_fatal.path);
    const a = await probe();
    C('fatal chair: in-use chair, ending stays fatal', a.node === 'chapter-01:exit_chair_fatal' && a.dom.scene === SC('chair') && !a.dom.overlay, a.dom);
    await shot('fatal');
  });
  // 5. The other House rooms on the Martin route (dining, bedroom, passage, service hatch) ----------------
  await scenario('martin', null, exitSeed('martin'), async ({ C, go, probe, shot }) => {
    const seen = {};
    for (const c of P.martin.path) { await go([c]); const a = await probe(); seen[a.dom.scene] = true; }
    C('Martin route shows dining, bedroom, passage and service hatch art', ['dining', 'bedroom', 'passage', 'service_hatch', 'lounge'].every((s) => seen[SC(s)]), Object.keys(seen));
    await shot('service_hatch');
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
  console.log('Chapter 1 art in the browser: ' + (results.length - failed.length) + '/' + results.length + ' passed (' + Object.keys(by).map((b) => b + ' ' + by[b][0] + '/' + by[b][1]).join(', ') + ')');
  fs.writeFileSync(path.join(__dirname, 'ch01_art_qa_results.json'), JSON.stringify({ passed: results.length - failed.length, total: results.length, results }, null, 1) + '\n');
  if (failed.length) process.exitCode = 1;
})().catch((e) => { console.error(e.stack || String(e)); process.exitCode = 1; });
