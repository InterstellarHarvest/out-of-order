#!/usr/bin/env node
// QA for the M2 reception polish lab (docs/62). From the repository root:
//   NODE_PATH="$(npm root -g)" node tools/m2-reception-polish-lab/qa/run_qa.js
// QA_BROWSERS=chromium,firefox (default). Writes qa/qa_results.json and qa/screenshots/.
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const playwright = require('playwright');

const ROOT = path.resolve(__dirname, '../../..');
const LAB = 'tools/m2-reception-polish-lab/index.html';
const GAME = 'game/index.html';
const SHOTS = path.join(__dirname, 'screenshots');
const SHELL_PATH = 'art/ui/shell/layout-final.png';
const SHELL_SHA256 = '813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6';
const STORE = 'cyoa-m2-reception-polish-lab-v1';

const results = [];
function check(browser, name, ok, detail) {
  results.push({ browser, name, ok: !!ok, detail: detail === undefined ? undefined : detail });
  console.log(`${ok ? 'pass' : 'FAIL'} [${browser}] ${name}${ok || detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 400)}`);
}
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

function startServer() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// Static ---------------------------------------------------------------------------------------
function staticChecks() {
  const s = 'static';
  const dir = path.join(ROOT, 'tools/m2-reception-polish-lab');
  const files = fs.readdirSync(dir, { recursive: true }).map(String);
  const images = files.filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f) && !/^qa[/\\]screenshots/.test(f));
  check(s, 'the lab holds no art of its own (no copied or generated images)', images.length === 0, images);
  const game = ['main.js', 'stage.js', 'flow.js', 'pixeltext.js', 'tuning.js', 'rules.js', 'placeholders.js'].map((f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8')).join('\n');
  check(s, 'the production game never touches browser storage or the lab (no storage API, no lab identifier)',
    !/localStorage|sessionStorage|indexedDB|POLISH_LAB|POLISH_TUNABLES|LAB_FRAME|LAB_STAGE/.test(game));
  const html = fs.readFileSync(path.join(ROOT, 'game/index.html'), 'utf8');
  check(s, 'game/index.html loads no lab script', !/m2-reception-polish-lab|lab-apply|lab-stage|tunables/.test(html));
  const stageHtml = fs.readFileSync(path.join(dir, 'stage.html'), 'utf8');
  const prodScripts = ['content/reception.js', 'js/rules.js', 'js/pixeltext.js', 'js/tuning.js', 'js/placeholders.js', 'js/stage.js', 'js/flow.js', 'js/main.js'];
  check(s, 'the lab stage loads the production game scripts and stylesheet from game/ (no copies)',
    prodScripts.every((f) => stageHtml.includes('../../game/' + f)) && stageHtml.includes('../../game/game.css') && !fs.existsSync(path.join(dir, 'stage.js')));
  const labStage = fs.readFileSync(path.join(dir, 'lab-stage.js'), 'utf8');
  check(s, 'state shortcuts never assign narrative state directly (they drive the real flow)', !/G\.state\s*=|G\.state\.[a-z]+\s*=(?!=)|state\.flags\.[a-z]+\s*=(?!=)/i.test(labStage));
}

// Browser --------------------------------------------------------------------------------------
async function suite(name, base) {
  const c = (n, ok, d) => check(name, n, ok, d);
  const browser = await playwright[name].launch();
  const context = await browser.newContext({ viewport: { width: 2460, height: 1260 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const bodies = {};
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', async (r) => { if (/\.png$/.test(r.url())) { try { bodies[new URL(r.url()).pathname.slice(1)] = sha256(await r.body()); } catch (e) { /* ignore */ } } });
  const openLab = async () => {
    await page.goto(`${base}/${LAB}`);
    await page.waitForFunction(() => document.body.dataset.labReady, null, { timeout: 60000 });
  };
  const lab = (fn, arg) => page.evaluate(fn, arg);
  const ready = () => lab(() => window.POLISH_LAB.ready());
  await page.goto(`${base}/${LAB}`);
  await lab((k) => localStorage.removeItem(k), STORE);
  await openLab();
  c('the lab opens and both stage frames load', (await lab(() => document.body.dataset.labReady)) === 'true', await lab(() => document.getElementById('status').textContent));

  // Production defaults: the registry read on a plain game/index.html must equal the lab's defaults.
  const gpage = await context.newPage();
  await gpage.goto(`${base}/${GAME}`);
  await gpage.waitForFunction(() => document.body.dataset.ready, null, { timeout: 20000 });
  await gpage.addScriptTag({ url: `${base}/tools/m2-reception-polish-lab/tunables.js` });
  const gameValues = await gpage.evaluate(() => window.POLISH_TUNABLES.readAll(window.CYOA_GAME));
  const prod = await lab(() => window.POLISH_LAB.production());
  const vals = await lab(() => window.POLISH_LAB.values());
  const n = await lab(() => window.POLISH_TUNABLES.LIST.length);
  c('lab defaults equal the values read from the actual production game (game/index.html)', JSON.stringify(prod) === JSON.stringify(gameValues) && Object.keys(prod).length === n, { prod, gameValues });
  c('the lab opens on exact production values (no changes)', JSON.stringify(vals) === JSON.stringify(prod) && (await lab(() => Object.keys(window.POLISH_LAB.changes()).length)) === 0);
  c('every tunable has a production value that is a whole number', Object.values(prod).every((v) => Number.isInteger(v)));
  await gpage.close();

  // PRODUCTION vs LAB at defaults: pixel-identical across representative states.
  await lab(() => { document.getElementById('fitToggle').click(); }); // 1:1
  const wrap = async () => {
    const r = await page.$eval('#stageWrap', (e) => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top }; });
    return { x: Math.round(r.x), y: Math.round(r.y), width: 1920, height: 1080 };
  };
  const both = async (v) => lab((x) => { window.POLISH_LAB.setView(x); }, v);
  const freezeBoth = (on) => lab((x) => ['frameProduction', 'frameLab'].forEach((id) => document.getElementById(id).contentWindow.LAB_STAGE.freeze(x)), on);
  const abStates = ['opening', 'three-choices', 'long-history', 'item-received', 'inspector-before-read', 'inspector-after-read', 'notes', 'files', 'tooltip-disabled', 'tooltip-show', 'ending', 'choices-1-2-3', 'choices-three-2'];
  const abCompare = async (states, shots) => {
    const bad = [];
    for (const s of states) {
      await lab((x) => window.POLISH_LAB.setState(x), s);
      await page.waitForTimeout(400); // let the production CSS transitions (speech indicator, 0.15 s) settle
      await freezeBoth(true);
      await both('production');
      const a = await page.screenshot({ clip: await wrap() });
      await both('lab');
      const b2 = await page.screenshot({ clip: await wrap() });
      if (!a.equals(b2)) bad.push(s);
      if (shots && name === 'chromium' && ['opening', 'inspector-before-read', 'notes', 'files', 'item-received', 'choices-1-2-3'].includes(s)) fs.writeFileSync(path.join(SHOTS, `state_${s}.png`), b2);
      await freezeBoth(false);
    }
    return bad;
  };
  const abBad = await abCompare(abStates, true);
  c('PRODUCTION and LAB are pixel-identical at defaults in every representative state', abBad.length === 0, abBad);

  // Representative states reach the right place through the real flow.
  const expect = {
    opening: ['opening', null, null], 'three-choices': ['misassign', null, null], 'long-history': ['facilities', null, null], 'item-received': ['issue', null, null],
    'inspector-before-read': ['issue', 'wc_key', null], 'inspector-after-read': ['issue', 'wc_key', null], notes: ['tag_question', null, 'notes'],
    files: ['tag_question', null, 'files'], ending: ['ending', null, null]
  };
  const stBad = [];
  for (const s of Object.keys(expect)) {
    await lab((x) => window.POLISH_LAB.setState(x), s);
    const got = await lab(() => { const G = document.getElementById('frameLab').contentWindow.CYOA_GAME; return [G.state.node, G.ui.inspector && G.ui.inspector.id, G.ui.overlay, G.flow.phase, !!G.ui.notice, (G.state.items.wc_key || []).join()]; });
    const want = expect[s];
    if (got[0] !== want[0] || got[1] !== want[1] || got[2] !== want[2] || got[3] !== 'choosing' || (s === 'item-received') !== got[4]
      || (s === 'inspector-after-read' && !/read/.test(got[5]))) stBad.push([s, got]);
  }
  c('every representative state loads where it should (node, inspector, overlay, slip, READ mark)', stBad.length === 0, stBad);
  await lab(() => window.POLISH_LAB.setState('files'));
  c('FILES state shows the 4:52 record', /RETURNED AT 4:52/.test(await lab(() => document.getElementById('frameLab').contentWindow.document.getElementById('overlayCanvas').dataset.text)));
  const tips = {};
  for (const s of ['tooltip-enabled', 'tooltip-disabled', 'tooltip-read', 'tooltip-show']) {
    await lab((x) => window.POLISH_LAB.setState(x), s);
    tips[s] = await lab(() => { const t = document.getElementById('frameLab').contentWindow.document.getElementById('tooltip'); return t.style.display !== 'none' && t.dataset.text; });
  }
  c('tooltip states show INSPECT / INSPECT - NO ITEMS / READ / SHOW - NOT AVAILABLE HERE',
    JSON.stringify(tips) === JSON.stringify({ 'tooltip-enabled': 'INSPECT', 'tooltip-disabled': 'INSPECT - NO ITEMS', 'tooltip-read': 'READ', 'tooltip-show': 'SHOW - NOT AVAILABLE HERE' }), tips);
  await lab(() => window.POLISH_LAB.setState('choices-1-2-3'));
  const lines = await lab(() => { const G = document.getElementById('frameLab').contentWindow.CYOA_GAME; return G.ui.cards.map((k) => k.lines); });
  c('choice samples show a 1-, 2- and 3-line card (display only)', JSON.stringify(lines) === '[1,2,3]' && (await lab(() => document.getElementById('frameLab').contentWindow.CYOA_GAME.flow.phase)) === 'lab-sample', lines);
  await lab(() => window.POLISH_LAB.setState('choices-three-2'));
  c('choice samples show three 2-line cards', JSON.stringify(await lab(() => document.getElementById('frameLab').contentWindow.CYOA_GAME.ui.cards.map((k) => k.lines))) === '[2,2,2]');

  // Shell canonical, art = production files only, scene 4x, portrait 1x, lab change applied.
  c('the stage shell is the canonical file (served bytes)', bodies[SHELL_PATH] === SHELL_SHA256, bodies[SHELL_PATH]);
  const imgs = Object.keys(bodies);
  c('every image the lab loads is a production art file under art/', imgs.length > 20 && imgs.every((p) => /^art\//.test(p)), imgs.filter((p) => !/^art\//.test(p)));
  await lab(() => window.POLISH_LAB.setValue('portrait.npcY', 3));
  await ready();
  await lab(() => window.POLISH_LAB.setState('opening'));
  const geo = await lab(() => {
    const d = document.getElementById('frameLab').contentWindow.document;
    const r = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; };
    const sc = d.getElementById('sceneArt'), np = d.getElementById('portraitNpc'), bg = d.getElementById('portraitBackground');
    return { scene: [sc.naturalWidth, sc.naturalHeight].concat(r(sc)), npc: [np.naturalWidth, np.naturalHeight].concat(r(np)), bg: [bg.naturalWidth, bg.naturalHeight].concat(r(bg)) };
  });
  c('scene stays exactly 4x (314x206 -> 1256x824) in the lab frame', geo.scene.join() === '314,206,32,44,1256,824', geo.scene);
  c('portrait stays native 1x (564x278) and a lab nudge moves only the NPC layer by whole pixels', geo.npc.join() === '564,278,1333,47,564,278' && geo.bg.join() === '564,278,1333,44,564,278', geo);
  c('the PRODUCTION frame is untouched by the lab change', (await lab(() => { const b = document.getElementById('frameProduction').contentWindow.document.getElementById('portraitNpc').getBoundingClientRect(); return [b.left, b.top].join(); })) === '1333,44');

  // Live values: a change rebuilds the lab frame's production stage in place, at once, with no
  // frame reload, and keeps the state on show.
  const labWin = (fn, arg) => lab(new Function('arg', 'const w = document.getElementById("frameLab").contentWindow; const d = w.document; return (' + fn + ')(w, d, arg);'), arg);
  const href0 = await labWin((w) => w.location.href);
  const applied0 = Number(await labWin((w, d) => d.body.dataset.labApplied || 0));
  const drag = await lab(async () => {
    // A slider drag: input events, one per frame; the NPC must follow every step.
    const w = document.getElementById('frameLab').contentWindow;
    const sl = document.querySelector('.row[data-key="portrait.npcY"] .slider');
    const tops = [];
    const t0 = performance.now();
    for (const v of [4, 5, 6, 7, 8]) {
      sl.value = String(v);
      sl.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      tops.push(w.document.getElementById('portraitNpc').getBoundingClientRect().top);
    }
    return { tops, ms: Math.round(performance.now() - t0) };
  });
  c('a slider drag updates the lab stage live, step by step (no debounce, no reload)', drag.tops.join() === '48,49,50,51,52'
    && (await labWin((w) => w.location.href)) === href0 && Number(await labWin((w, d) => d.body.dataset.labApplied)) >= applied0 + 5, { drag, href0 });
  await lab(() => window.POLISH_LAB.setState('notes'));
  const ov0 = await labWin((w, d) => { const cv = d.getElementById('overlayCanvas'); return [w.CYOA_GAME.ui.overlay, cv.dataset.text, cv.dataset.scroll, d.getElementById('overlayPanel').dataset.art].join('|'); });
  await lab(() => window.POLISH_LAB.setValue('overlay.bodyX', window.POLISH_LAB.production()['overlay.bodyX'] + 20));
  await ready();
  const ov1 = await labWin((w, d) => { const cv = d.getElementById('overlayCanvas'); return [w.CYOA_GAME.ui.overlay, cv.dataset.text, cv.dataset.scroll, d.getElementById('overlayPanel').dataset.art].join('|'); });
  c('a live change keeps the state on show (NOTES stays open on the same lines and scroll)', ov0 === ov1 && /^notes\|/.test(ov1) && (await labWin((w) => w.location.href)) === href0, [ov0.slice(0, 60), ov1.slice(0, 60)]);

  // NOTES background v1 / v2: a lab choice, live, exported like any value; FILES has its own panel.
  const art = (id) => lab((f) => document.getElementById(f).contentWindow.document.getElementById('overlayPanel').dataset.art, id);
  c('NOTES shows the v1 panel in both frames by default', (await art('frameProduction')) === 'art/ui/overlays/notes_files_panel.png'
    && /notes_files_panel\.png$/.test(ov1.split('|')[3]), [await art('frameProduction'), ov1.split('|')[3]]);
  await lab(() => window.POLISH_LAB.setValue('overlay.notesPanel', 2));
  await ready();
  c('NOTES background v2 switches live in the lab frame only', (await art('frameLab')) === 'art/ui/overlays/notes_panel_v2.png'
    && (await art('frameProduction')) === 'art/ui/overlays/notes_files_panel.png' && (await labWin((w) => w.location.href)) === href0, [await art('frameLab'), await art('frameProduction')]);
  c('the NOTES background choice is exported with the changes', JSON.parse(await lab(() => window.POLISH_LAB.exportChanges())).changes['overlay.notesPanel'] === 2);
  await lab(() => window.POLISH_LAB.setState('files'));
  c('FILES shows its own panel (files_panel.png) in both frames, whatever the NOTES choice', (await art('frameLab')) === 'art/ui/overlays/files_panel.png'
    && (await art('frameProduction')) === 'art/ui/overlays/files_panel.png', [await art('frameLab'), await art('frameProduction')]);
  c('the lab frame shows the v2 panel 1:1 (served bytes are the committed candidate)', bodies['art/ui/overlays/notes_panel_v2.png'] === sha256(fs.readFileSync(path.join(ROOT, 'art/ui/overlays/notes_panel_v2.png'))));
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  await lab(() => window.POLISH_LAB.setState('notes'));
  c('reset returns NOTES to v1 live', (await art('frameLab')) === 'art/ui/overlays/notes_files_panel.png' && (await labWin((w) => w.location.href)) === href0);
  const abLive = await abCompare(['long-history', 'item-received', 'inspector-after-read', 'notes', 'files']);
  c('after live changes and a reset, PRODUCTION and LAB are pixel-identical again (same frame, never reloaded)', abLive.length === 0
    && (await labWin((w) => w.location.href)) === href0, abLive);
  await lab(() => window.POLISH_LAB.setValue('portrait.npcY', 3));
  await ready();

  // Integer rules, export, reset.
  await lab(() => window.POLISH_LAB.setValue('tooltip.gapY', 6.6));
  c('spatial controls store whole numbers (6.6 -> 7)', (await lab(() => window.POLISH_LAB.changes()['tooltip.gapY'])) === 7);
  await lab(() => window.POLISH_LAB.setValue('notice.durationMs', 3200));
  const ex = JSON.parse(await lab(() => window.POLISH_LAB.exportChanges()));
  c('COPY CHANGES contains only the changed keys, with schema and base SHA', ex.schema === 'cyoa-m2-reception-polish-lab-v1' && ex.baseSha === '6472cecb377a6e00484f92cdee55f6500858daa3'
    && JSON.stringify(ex.changes) === JSON.stringify({ 'portrait.npcY': 3, 'tooltip.gapY': 7, 'notice.durationMs': 3200 }), ex);
  const all = JSON.parse(await lab(() => window.POLISH_LAB.exportAll()));
  c('COPY ALL contains every declared tunable', Object.keys(all.values).length === n && all.values['portrait.npcY'] === 3, Object.keys(all.values).length);
  // Toggles do not leak into exports.
  await lab(() => { ['tg-hideShell', 'tg-boundsScene', 'tg-boundsUtility'].forEach((id) => document.getElementById(id).click()); document.getElementById('freeze').click(); document.getElementById('holdClose').value = 'down'; document.getElementById('holdClose').dispatchEvent(new Event('change')); });
  c('visual helper toggles do not change the exported changes', (await lab(() => window.POLISH_LAB.exportChanges())) === JSON.stringify(ex, null, 2));
  c('hide-shell and bounds toggles act on the stage frames only', await lab(() => { const d = document.getElementById('frameLab').contentWindow.document; return getComputedStyle(d.getElementById('shell')).visibility === 'hidden' && d.querySelectorAll('#labBounds .lab-bound').length >= 4; }));
  await lab(() => { ['tg-hideShell', 'tg-boundsScene', 'tg-boundsUtility'].forEach((id) => document.getElementById(id).click()); document.getElementById('freeze').click(); document.getElementById('holdClose').value = 'auto'; document.getElementById('holdClose').dispatchEvent(new Event('change')); });
  // Persistence.
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.labReady, null, { timeout: 60000 });
  c('lab values persist in localStorage across a reload', JSON.stringify(await lab(() => window.POLISH_LAB.changes())) === JSON.stringify(ex.changes));
  // The production game ignores the lab's storage.
  const g2 = await context.newPage();
  await g2.goto(`${base}/${GAME}`);
  await g2.waitForFunction(() => document.body.dataset.ready, null, { timeout: 20000 });
  await g2.addScriptTag({ url: `${base}/tools/m2-reception-polish-lab/tunables.js` });
  const g2v = await g2.evaluate(() => window.POLISH_TUNABLES.readAll(window.CYOA_GAME));
  const g2s = await g2.evaluate((k) => [!!localStorage.getItem(k), Object.keys(localStorage).join(), window.CYOA_GAME.state.node, window.CYOA_GAME.state.transcript.length], STORE);
  c('the production game ignores the lab storage (production values while lab changes are saved)', JSON.stringify(g2v) === JSON.stringify(prod) && g2s[0], g2s);
  c('no story state is persisted: storage holds only the lab key, and a fresh game starts at the opening', g2s[1] === STORE && g2s[2] === 'opening' && g2s[3] === 1, g2s);
  await g2.close();
  // Reset field / section / all.
  await lab(() => window.POLISH_LAB.resetField('notice.durationMs'));
  c('RESET FIELD restores one value', !('notice.durationMs' in (await lab(() => window.POLISH_LAB.changes()))));
  await lab(() => { window.POLISH_LAB.setValue('portrait.npcX', -2); window.POLISH_LAB.resetSection('portrait'); });
  const afterSec = await lab(() => window.POLISH_LAB.changes());
  c('RESET SECTION restores only that section', JSON.stringify(afterSec) === JSON.stringify({ 'tooltip.gapY': 7 }), afterSec);
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  c('RESET ALL restores every production value', JSON.stringify(await lab(() => window.POLISH_LAB.values())) === JSON.stringify(prod) && (await lab(() => Object.keys(window.POLISH_LAB.changes()).length)) === 0);
  // Import.
  const rt = await lab((txt) => window.POLISH_LAB.importJSON(txt), JSON.stringify(ex));
  c('IMPORT round-trips exported changes', rt.ok && JSON.stringify(await lab(() => window.POLISH_LAB.changes())) === JSON.stringify(ex.changes), rt);
  const before = JSON.stringify(await lab(() => window.POLISH_LAB.changes()));
  const bad = {
    unknown: { schema: 'cyoa-m2-reception-polish-lab-v1', changes: { 'portrait.hatSize': 3 } },
    nonInteger: { schema: 'cyoa-m2-reception-polish-lab-v1', changes: { 'portrait.npcY': 2.5 } },
    outOfRange: { schema: 'cyoa-m2-reception-polish-lab-v1', changes: { 'portrait.npcY': 400 } },
    timingRange: { schema: 'cyoa-m2-reception-polish-lab-v1', changes: { 'notice.durationMs': 999999 } },
    wrongSchema: { schema: 'something-else', changes: { 'portrait.npcY': 1 } },
    stringValue: { changes: { 'portrait.npcY': '3' } }
  };
  const rej = {};
  for (const k of Object.keys(bad)) rej[k] = await lab((t) => window.POLISH_LAB.importJSON(t), JSON.stringify(bad[k]));
  rej.malformed = await lab(() => window.POLISH_LAB.importJSON('{not json'));
  c('IMPORT rejects unknown keys, non-integers, out-of-range spatial/timing values, a wrong schema and malformed JSON',
    Object.values(rej).every((r) => !r.ok && r.errors.length > 0), Object.fromEntries(Object.entries(rej).map(([k, r]) => [k, r.errors && r.errors[0]])));
  c('a rejected import leaves the lab values unchanged', JSON.stringify(await lab(() => window.POLISH_LAB.changes())) === before);
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();

  // A lab timing change works in the lab frame only: tooltip appearance delay.
  await lab(() => window.POLISH_LAB.setValue('tooltip.showDelayMs', 400));
  await ready();
  await lab(() => window.POLISH_LAB.setState('opening'));
  await lab(() => window.POLISH_LAB.setView('lab'));
  const box = await wrap();
  await page.mouse.move(box.x + 1482 + 60, box.y + 930 + 50);
  await page.waitForTimeout(120);
  const early = await lab(() => document.getElementById('frameLab').contentWindow.document.getElementById('tooltip').style.display);
  await page.waitForTimeout(600);
  const late = await lab(() => document.getElementById('frameLab').contentWindow.document.getElementById('tooltip').style.display);
  c('a lab tooltip delay applies in the lab frame (hidden at 120 ms, shown after 400 ms)', early === 'none' && late !== 'none', { early, late });
  await page.mouse.move(box.x + 600, box.y + 400);
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  if (name === 'chromium') await page.screenshot({ path: path.join(SHOTS, 'lab_overview.png') });
  c('no console or page errors in the lab', errors.length === 0, errors);
  await lab((k) => localStorage.removeItem(k), STORE);
  await browser.close();
}

(async () => {
  // Watchdog: a hung page must fail the run, not stall it.
  setTimeout(() => { console.log('FAIL [watchdog] lab QA exceeded 15 minutes'); process.exit(3); }, 15 * 60 * 1000).unref();
  fs.mkdirSync(SHOTS, { recursive: true });
  staticChecks();
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const name of (process.env.QA_BROWSERS || 'chromium,firefox').split(',')) {
    try { await suite(name, base); } catch (e) { check(name, 'suite ran to completion', false, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); }
  }
  server.close();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(__dirname, 'qa_results.json'), JSON.stringify({ schema: 'cyoa-m2-reception-polish-lab-qa-v1', passed: results.length - failed.length, total: results.length, failures: failed, checks: results }, null, 2) + '\n');
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
