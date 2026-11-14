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
// The production page the lab tunes is the M2 reception (docs/84: game/index.html plays the imported
// story by default, which autosaves; the reception never does).
const GAME = 'game/index.html?story=reception';
const SHOTS = path.join(__dirname, 'screenshots');
const SHELL_PATH = 'art/ui/shell/layout-final.png';
const SHELL_SHA256 = '79c891e1875b0a6f6cb2006cc2bffded5dbff1a762fd3d91f5ff0806febb9625';
const STORE = 'cyoa-m2-reception-polish-lab-v1';
const STORE_UI = 'cyoa-m2-reception-polish-lab-ui-v1';

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
  await lab((ks) => ks.forEach((k) => localStorage.removeItem(k)), [STORE, STORE_UI]);
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
  const abStates = ['opening', 'three-choices', 'long-history', 'item-received', 'inspector-before-read', 'inspector-after-read', 'notes', 'files', 'observed', 'tooltip-disabled', 'tooltip-show', 'ending', 'choices-1-2-3', 'choices-three-2'];
  const abCompare = async (states, shots) => {
    const bad = [];
    for (const s of states) {
      await lab((x) => window.POLISH_LAB.setState(x), s);
      await page.waitForTimeout(400); // let the production CSS transitions (speech indicator, 0.15 s) settle
      // Round 2 (docs/82): the slip's production fade-in is 500 ms, longer than that wait; compare a
      // slip in its hold (opacity exactly 1 in both frames), never mid-fade.
      await lab(() => new Promise((r) => { const t0 = performance.now(); (function p() {
        const ok = ['frameProduction', 'frameLab'].every((id) => { const G = document.getElementById(id).contentWindow.CYOA_GAME; return !G.ui.notice || G.noticeOpacity() === 1; });
        if (ok || performance.now() - t0 > 2000) r(); else setTimeout(p, 20); })(); }));
      await freezeBoth(true);
      await both('production');
      const a = await page.screenshot({ clip: await wrap() });
      await both('lab');
      const b2 = await page.screenshot({ clip: await wrap() });
      if (!a.equals(b2)) bad.push(s);
      if (shots && name === 'chromium' && ['opening', 'inspector-before-read', 'notes', 'files', 'observed', 'item-received', 'choices-1-2-3'].includes(s)) fs.writeFileSync(path.join(SHOTS, `state_${s}.png`), b2);
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
    files: ['tag_question', null, 'files'], observed: ['misassign', null, null], ending: ['ending', null, null]
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
  await lab(() => window.POLISH_LAB.setState('observed'));
  const obs = await lab(() => { const G = document.getElementById('frameLab').contentWindow.CYOA_GAME; return [G.state.transcript.filter((t) => t.who === 'thought').length, G.ui.speech.parts.slice(-1)[0].who, G.utilityActions()[0].action, G.utilityActions()[0].enabled]; });
  c('the OBSERVE state shows the thought, taken through the real first utility button (now spent)', obs.join() === '1,thought,context,false', obs);
  await lab(() => window.POLISH_LAB.setState('files'));
  c('FILES state shows the 4:52 record', /RETURNED AT 4:52/.test(await lab(() => document.getElementById('frameLab').contentWindow.document.getElementById('overlayCanvas').dataset.text)));
  const tips = {};
  for (const s of ['tooltip-enabled', 'tooltip-disabled', 'tooltip-read', 'tooltip-show']) {
    await lab((x) => window.POLISH_LAB.setState(x), s);
    tips[s] = await lab(() => { const t = document.getElementById('frameLab').contentWindow.document.getElementById('tooltip'); return t.style.display !== 'none' && t.dataset.text; });
  }
  c('tooltip states show OBSERVE / OBSERVE + NOTHING NEW TO NOTICE / READ / SHOW + NOT AVAILABLE HERE (the reason on its own line)',
    JSON.stringify(tips) === JSON.stringify({ 'tooltip-enabled': 'OBSERVE', 'tooltip-disabled': 'OBSERVE\nNOTHING NEW TO NOTICE', 'tooltip-read': 'READ', 'tooltip-show': 'SHOW\nNOT AVAILABLE HERE' }), tips);
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

  // NOTES background v1 / v2 (Round 2, docs/82: v2 is production): a lab choice, live, exported like any
  // value; FILES has its own panel.
  const art = (id) => lab((f) => document.getElementById(f).contentWindow.document.getElementById('overlayPanel').dataset.art, id);
  c('Round 2: NOTES shows the v2 panel in both frames by default (production notesPanel 2, no lab change needed)', (await art('frameProduction')) === 'art/ui/overlays/notes_panel_v2.png'
    && /notes_panel_v2\.png$/.test(ov1.split('|')[3]) && (await lab(() => window.POLISH_LAB.production()['overlay.notesPanel'])) === 2
    && !('overlay.notesPanel' in (await lab(() => window.POLISH_LAB.changes()))), [await art('frameProduction'), ov1.split('|')[3]]);
  await lab(() => window.POLISH_LAB.setValue('overlay.notesPanel', 1));
  await ready();
  c('NOTES background v1 can still be picked live in the lab frame only', (await art('frameLab')) === 'art/ui/overlays/notes_files_panel.png'
    && (await art('frameProduction')) === 'art/ui/overlays/notes_panel_v2.png' && (await labWin((w) => w.location.href)) === href0, [await art('frameLab'), await art('frameProduction')]);
  c('the NOTES background choice is exported with the changes', JSON.parse(await lab(() => window.POLISH_LAB.exportChanges())).changes['overlay.notesPanel'] === 1);
  await lab(() => window.POLISH_LAB.setState('files'));
  c('FILES shows its own panel (files_panel.png) in both frames, whatever the NOTES choice', (await art('frameLab')) === 'art/ui/overlays/files_panel.png'
    && (await art('frameProduction')) === 'art/ui/overlays/files_panel.png', [await art('frameLab'), await art('frameProduction')]);
  c('both NOTES panels are served as their committed bytes (v2 production, v1 the lab option)', bodies['art/ui/overlays/notes_panel_v2.png'] === sha256(fs.readFileSync(path.join(ROOT, 'art/ui/overlays/notes_panel_v2.png')))
    && bodies['art/ui/overlays/notes_files_panel.png'] === sha256(fs.readFileSync(path.join(ROOT, 'art/ui/overlays/notes_files_panel.png'))));
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  await lab(() => window.POLISH_LAB.setState('notes'));
  c('reset returns NOTES to production v2 live', (await art('frameLab')) === 'art/ui/overlays/notes_panel_v2.png' && (await labWin((w) => w.location.href)) === href0);
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
  c('the hold-X UP/DOWN aid is gone (the X has no DOWN state)', await lab(() => !document.getElementById('holdClose') && !window.frames[0].LAB_STAGE.holdClose));
  await lab(() => { ['tg-hideShell', 'tg-boundsScene', 'tg-boundsUtility', 'tg-boundsClose'].forEach((id) => document.getElementById(id).click()); document.getElementById('freeze').click(); });
  c('visual helper toggles do not change the exported changes', (await lab(() => window.POLISH_LAB.exportChanges())) === JSON.stringify(ex, null, 2));
  c('hide-shell and bounds toggles act on the stage frames only', await lab(() => { const d = document.getElementById('frameLab').contentWindow.document; return getComputedStyle(d.getElementById('shell')).visibility === 'hidden' && d.querySelectorAll('#labBounds .lab-bound').length >= 4; }));
  const xBox = await lab(() => { const d = document.getElementById('frameLab').contentWindow.document; const b = Array.from(d.querySelectorAll('#labBounds .lab-bound')).find((e) => e.title === 'inspector X hit area'); const x = d.getElementById('inspectClose'); return b && [b.style.left, b.style.top, b.style.width, b.style.height].join() === [x.style.left, x.style.top, x.style.width, x.style.height].join() && b.style.width === '44px'; });
  c('SHOW X HITBOX outlines the inspector X\'s 44x44 button', xBox);
  await lab(() => { ['tg-hideShell', 'tg-boundsScene', 'tg-boundsUtility', 'tg-boundsClose'].forEach((id) => document.getElementById(id).click()); document.getElementById('freeze').click(); });
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
  c('no story state is persisted: storage holds only the lab\'s values and UI keys, and a fresh game starts at the opening', g2s[1].split(',').sort().join() === [STORE, STORE_UI].sort().join() && g2s[2] === 'opening' && g2s[3] === 1, g2s);
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
  // The tooltip's reason line (owner, 2026-11-08): its face and gap are lab values, live, LAB frame only.
  await lab(() => window.POLISH_LAB.setState('tooltip-disabled'));
  const why = (id) => lab((f) => { const t = document.getElementById(f).contentWindow.document.getElementById('tooltip'); const b = t.querySelectorAll('canvas')[1]; return [b.height, parseInt(b.style.top), parseInt(t.style.height)].join(); }, id);
  const why0 = await why('frameLab');
  await lab(() => { window.POLISH_LAB.setValue('tooltip.reasonFace', 2); window.POLISH_LAB.setValue('tooltip.reasonGapY', 8); });
  await ready();
  const why2 = [await why('frameLab'), await why('frameProduction')];
  c('tooltip reason line: production is the Labels face at half size (9 px rows) 5 px below the label; the lab can switch it live to the Dialogue face and another gap (LAB frame only)',
    why0 === '9,30,46' && why2[0] === '21,33,61' && why2[1] === '9,30,46', { why0, why2 });
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  if (name === 'chromium') await page.screenshot({ path: path.join(SHOTS, 'lab_overview.png') });

  // TRIGGER EVENTS (docs/64): LAB frame only, repeatable, no value or export change ----------------
  const exportBefore = await lab(() => window.POLISH_LAB.exportChanges());
  const valuesBefore = JSON.stringify(await lab(() => window.POLISH_LAB.values()));
  const prodWin = (fn) => lab(new Function('const w = document.getElementById("frameProduction").contentWindow; return (' + fn + ')(w, w.CYOA_GAME);'));
  const labG = (fn) => lab(new Function('const w = document.getElementById("frameLab").contentWindow; return (' + fn + ')(w, w.CYOA_GAME);'));
  const prodSnap = () => prodWin((w, G) => [G.state.node, G.state.transcript.length, G.flow.phase, !!G.ui.notice, G.ui.noticeLog.length, w.location.href].join('|'));
  await lab(() => window.POLISH_LAB.setState('three-choices'));
  const p0 = await prodSnap();
  const log0 = await labG((w, G) => G.ui.noticeLog.length);
  const rItem = [await lab(() => window.POLISH_LAB.trigger('item-received'))];
  const shown1 = await labG((w, G) => !!G.ui.notice && w.document.getElementById('itemNotice').style.display !== 'none' && w.document.getElementById('itemNotice').dataset.item);
  await labG((w, G) => G.dismissNotice());
  rItem.push(await lab(() => window.POLISH_LAB.trigger('item-received')));
  const shown2 = await labG((w, G) => !!G.ui.notice && w.document.getElementById('itemNotice').dataset.item);
  c('ITEM RECEIVED replays the production FACILITIES KEY slip, repeatedly, in the LAB view', rItem.join() === 'ok,ok' && shown1 === 'wc_key' && shown2 === 'wc_key'
    && (await labG((w, G) => G.ui.noticeLog.length)) === log0 + 2 && (await lab(() => document.getElementById('stageWrap').dataset.view)) === 'lab', { rItem, shown1, shown2 });
  if (name === 'chromium') await page.screenshot({ path: path.join(SHOTS, 'trigger_item_received.png') });
  const rType = await lab(() => window.POLISH_LAB.trigger('npc-typing'));
  const typing = await labG((w, G) => [G.flow.phase, G.ui.speech.typing, G.ui.cards.length, G.ui.speech.parts.slice(-1)[0].who].join());
  await lab(() => new Promise((r) => { const w = document.getElementById('frameLab').contentWindow; (function p() { if (w.CYOA_GAME.flow.phase === 'choosing') r(); else setTimeout(p, 50); })(); }));
  c('REPLAY NPC TYPING retypes the latest line with the production typing, then the same choices arrive', rType === 'ok' && typing === 'typing,true,0,npc'
    && (await labG((w, G) => G.ui.cards.map((k) => k.id).join())) === 'correct,cooperate,practical', { rType, typing });
  const rArrive = await lab(() => window.POLISH_LAB.trigger('choice-arrival'));
  const arriving = await labG((w, G) => [G.flow.phase, G.ui.motion && G.ui.motion.kind].join());
  await lab(() => new Promise((r) => { const w = document.getElementById('frameLab').contentWindow; (function p() { if (w.CYOA_GAME.flow.phase === 'choosing' && !w.CYOA_GAME.ui.motion) r(); else setTimeout(p, 50); })(); }));
  c('REPLAY CHOICE ARRIVAL runs the production card arrival and returns to choosing', rArrive === 'ok' && arriving === 'arriving,in'
    && (await labG((w, G) => G.ui.cards.map((k) => k.id).join())) === 'correct,cooperate,practical', { rArrive, arriving });
  // Record the first slot's x on every frame of the lab frame while the slide runs.
  await labG((w) => {
    const slot = () => w.document.querySelector('#invWindow .slot');
    w.__slideLog = { xs: [slot().style.left], done: false };
    const t0 = w.performance.now();
    (function rec() { w.__slideLog.xs.push(slot().style.left); if (w.performance.now() - t0 < 1500) w.requestAnimationFrame(rec); else w.__slideLog.done = true; })();
  });
  const rSlide = await lab(() => window.POLISH_LAB.trigger('inventory-slide'));
  await lab(() => new Promise((r) => { const w = document.getElementById('frameLab').contentWindow; (function p() { if (w.__slideLog.done) r(); else setTimeout(p, 50); })(); }));
  const slideXs = await labG((w) => w.__slideLog.xs);
  const sliding = new Set(slideXs).size > 1 && slideXs[slideXs.length - 1] === slideXs[0];
  c('REPLAY INVENTORY SLIDE runs the production slide and settles back', rSlide === 'ok' && sliding && (await labG((w, G) => !G.ui.inv.slide && G.ui.inv.start === 0)), { rSlide, xs: [...new Set(slideXs)].slice(0, 12) });
  await lab(() => window.POLISH_LAB.setState('opening'));
  const rCtx = [await lab(() => window.POLISH_LAB.trigger('context-action'))];
  const th1 = await labG((w, G) => [G.state.transcript.filter((t) => t.who === 'thought').length, G.state.node, G.flow.phase].join());
  rCtx.push(await lab(() => window.POLISH_LAB.trigger('context-action')));
  const th2 = await labG((w, G) => [G.state.transcript.filter((t) => t.who === 'thought').length, G.state.node, G.flow.phase].join());
  c('TRIGGER CONTEXT ACTION takes the real OBSERVE, and again on repeat (the state reloads first, so one thought each time)', rCtx.join() === 'ok,ok' && th1 === '1,opening,choosing' && th2 === th1, { rCtx, th1, th2 });
  if (name === 'chromium') await page.screenshot({ path: path.join(SHOTS, 'trigger_context_action.png') });
  await lab(() => window.POLISH_LAB.setState('three-choices'));
  const p1 = await prodSnap();
  c('the triggers leave the PRODUCTION comparison frame untouched (same node, transcript, phase, no slip, never reloaded)', p0 === p1 && !/\|true\|/.test(p1), { p0, p1 });
  c('the triggers create no tunable change and nothing in COPY CHANGES', (await lab(() => window.POLISH_LAB.exportChanges())) === exportBefore
    && JSON.stringify(await lab(() => window.POLISH_LAB.values())) === valuesBefore);

  // Item-received slip: production Y / fades as the lab defaults; fade tunables live in the LAB frame only.
  const pn = await lab(() => { const p = window.POLISH_LAB.production(); return [p['notice.y'], p['notice.fadeInMs'], p['notice.fadeOutMs'], p['notice.durationMs']].join(); });
  c('Round 2: the lab opens with the production slip values: y 730, fade in 500, fade out 220, lifecycle 3600 (production, not a lab change)', pn === '730,500,220,3600'
    && !Object.keys(await lab(() => window.POLISH_LAB.changes())).some((k) => /^notice\./.test(k)), pn);
  await lab(() => window.POLISH_LAB.setState('three-choices'));
  await lab(() => { window.POLISH_LAB.setValue('notice.fadeInMs', 600); window.POLISH_LAB.setValue('notice.fadeOutMs', 400); });
  await ready();
  const fadeVals = await lab(() => ['frameLab', 'frameProduction'].map((id) => { const n = document.getElementById(id).contentWindow.CYOA_GAME.TUNING.notice; return n.fadeInMs + '/' + n.fadeOutMs; }).join());
  const hrefF = await labWin((w) => w.location.href);
  c('fade sliders apply live to the LAB frame only (production keeps 500/220, no reload)', fadeVals === '600/400,500/220' && hrefF === href0, fadeVals);
  await labG((w, G) => { G.clearNotices(); });
  await lab(() => window.POLISH_LAB.trigger('item-received'));
  const trig = await lab(() => new Promise((r) => { const w = document.getElementById('frameLab').contentWindow; const G = w.CYOA_GAME;
    setTimeout(() => r([G.ui.notice && G.ui.notice.fadeIn, G.ui.notice && G.ui.notice.fadeOut, G.noticeOpacity(), w.document.getElementById('itemNotice').style.top].join()), 250); }));
  const tparts = trig.split(',');
  c('ITEM RECEIVED uses the current LAB fade values (600 ms fade-in still rising at 250 ms) at y 730', tparts[0] === '600' && tparts[1] === '400' && Number(tparts[2]) > 0.3 && Number(tparts[2]) < 0.7 && tparts[3] === '730px', trig);
  c('COPY CHANGES carries the changed fade values', /"notice.fadeInMs": 600/.test(await lab(() => window.POLISH_LAB.exportChanges())) && /"notice.fadeOutMs": 400/.test(await lab(() => window.POLISH_LAB.exportChanges())));
  await lab(() => { window.POLISH_LAB.setValue('notice.durationMs', 1000); window.POLISH_LAB.setValue('notice.fadeInMs', 600); window.POLISH_LAB.setValue('notice.fadeOutMs', 600); });
  const clamped = await lab(() => { const ch = window.POLISH_LAB.values(); return [ch['notice.durationMs'], ch['notice.fadeInMs'], ch['notice.fadeOutMs']].join(); });
  c('the lab keeps fade-in + fade-out within the lifecycle (clamped, never a negative hold)', clamped === '1000,600,400', clamped);
  const badFade = await lab(() => window.POLISH_LAB.importJSON(JSON.stringify({ schema: 'cyoa-m2-reception-polish-lab-v1', changes: { 'notice.durationMs': 1000, 'notice.fadeInMs': 600, 'notice.fadeOutMs': 600 } })));
  c('IMPORT rejects fades longer than the lifecycle, with a clear error', !badFade.ok && badFade.errors.some((e) => /fadeInMs \+ notice\.fadeOutMs .*must not exceed notice\.durationMs/.test(e)), badFade.errors);
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  await labG((w, G) => { G.clearNotices(); });

  // Collapsible sections and remembered lab UI (STORE_UI; never exported; RESET leaves it) -------------
  await lab(() => { document.querySelector('[data-fold="sec-portrait"] .fold').click(); document.querySelector('[data-fold="io"] .fold').click(); });
  const foldNow = await lab(() => [document.querySelector('[data-fold="sec-portrait"]').classList.contains('folded'),
    getComputedStyle(document.querySelector('[data-fold="sec-portrait"] .row')).display, document.querySelector('[data-fold="sec-portrait"] .fold').getAttribute('aria-expanded'),
    document.querySelector('[data-fold="io"]').classList.contains('folded')].join());
  c('a section folds from its heading (rows hidden, aria-expanded false)', foldNow === 'true,none,false,true', foldNow);
  await lab(() => { document.querySelector('[data-fold="io"] .fold').click(); });
  c('and opens again', await lab(() => !document.querySelector('[data-fold="io"]').classList.contains('folded')));
  c('every lab section is collapsible (panels, every tunable section, trigger events)', await lab(() => {
    const ids = Array.from(document.querySelectorAll('[data-fold]')).map((e) => e.dataset.fold);
    return ['stage', 'triggers', 'io', 'values', 'locked'].every((k) => ids.includes(k)) && window.POLISH_TUNABLES.SECTIONS.every((sec) => ids.includes('sec-' + sec.id));
  }));
  await lab(() => window.POLISH_LAB.setState('files'));
  await lab(() => window.POLISH_LAB.setView('production'));
  await lab(() => { document.getElementById('side').scrollTop = 700; });
  await page.waitForTimeout(400);
  const ui0 = await lab(() => window.POLISH_LAB.uiState());
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  c('RESET ALL leaves the devtool UI preferences alone', JSON.stringify(await lab(() => window.POLISH_LAB.uiState())) === JSON.stringify(ui0));
  const exUi = await lab(() => window.POLISH_LAB.exportChanges());
  c('lab UI state is never in COPY CHANGES (or COPY ALL)', !/folded|scrolls|toggles|"view"|"state"|"fit"/.test(exUi + (await lab(() => window.POLISH_LAB.exportAll()))));
  c('lab UI state is kept apart from the tunable values', await lab((k) => { const v = JSON.parse(localStorage.getItem(k[0])); const u = JSON.parse(localStorage.getItem(k[1])); return Object.keys(v).sort().join() === 'changes,schema' && !!u.folded && !!u.scrolls; }, [STORE, STORE_UI]));
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.labReady, null, { timeout: 60000 });
  await page.waitForTimeout(200);
  const ui1 = await lab(() => ({ s: window.POLISH_LAB.uiState(), scroll: document.getElementById('side').scrollTop, folded: document.querySelector('[data-fold="sec-portrait"]').classList.contains('folded'),
    sel: document.getElementById('stateSelect').value, overlay: document.getElementById('frameLab').contentWindow.CYOA_GAME.ui.overlay, view: document.getElementById('stageWrap').dataset.view,
    fit: document.getElementById('fitToggle').textContent }));
  c('after a reload: folded sections stay folded', ui1.folded && ui1.s.folded['sec-portrait'] === true, ui1.s.folded);
  c('after a reload: the sidebar scroll position is restored', Math.abs(ui1.scroll - ui0.scrolls.side) <= 2 && ui0.scrolls.side > 300, { now: ui1.scroll, was: ui0.scrolls.side });
  c('after a reload: the representative state is restored (FILES open in the frames)', ui1.sel === 'files' && ui1.overlay === 'files', ui1);
  c('after a reload: the PRODUCTION / LAB choice and the 1:1 preview mode are restored', ui1.view === 'production' && ui1.s.fit === false && /1:1/.test(ui1.fit), ui1);
  c('a reload restores no narrative state from a trigger (no thought, no slip)', await lab(() => { const G = document.getElementById('frameLab').contentWindow.CYOA_GAME; return !G.ui.notice && !G.state.transcript.some((t) => t.who === 'thought'); }));
  c('a reload keeps the values and the export as they were', (await lab(() => window.POLISH_LAB.exportChanges())) === exUi);
  await lab(() => { document.querySelector('[data-fold="sec-portrait"] .fold').click(); });

  c('no console or page errors in the lab', errors.length === 0, errors);
  await lab((ks) => ks.forEach((k) => localStorage.removeItem(k)), [STORE, STORE_UI]);
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
