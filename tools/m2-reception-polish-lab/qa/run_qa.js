#!/usr/bin/env node
// QA for the M2 reception polish lab (docs/62). From the repository root:
//   NODE_PATH="$(npm root -g)" node tools/m2-reception-polish-lab/qa/run_qa.js
// QA_BROWSERS=chromium,firefox (default). Writes qa/qa_results.json and qa/screenshots/.
'use strict';

const { execFileSync } = require('child_process');
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

  // Narrative Study (docs/68): an experimental, lab-only preview kept apart from production.
  const nsStage = fs.readFileSync(path.join(dir, 'narrative-study-stage.js'), 'utf8');
  const nsReg = fs.readFileSync(path.join(dir, 'narrative-study.js'), 'utf8');
  check(s, 'Narrative Study: the review overlays are pinned (column-1919 fix) and live outside the lab folder (review/)',
    Object.entries(NARR_OVERLAYS).every(([p, h]) => fs.existsSync(path.join(ROOT, p)) && sha256(fs.readFileSync(path.join(ROOT, p))) === h && !p.startsWith('tools/')),
    Object.keys(NARR_OVERLAYS).map((p) => fs.existsSync(path.join(ROOT, p)) && sha256(fs.readFileSync(path.join(ROOT, p)))));
  const src = Object.keys(NARR_OVERLAYS).map((p) => { try { return sha256(execFileSync('git', ['show', NARR_SOURCE_REF + ':' + p], { cwd: ROOT, maxBuffer: 1 << 26 })); } catch (e) { return 'missing: ' + e.message.split('\n')[0]; } });
  check(s, 'Narrative Study: their sources are the art-study branch files (' + NARR_SOURCE_REF + ')', JSON.stringify(src) === JSON.stringify(Object.values(NARR_SOURCES)), src);
  check(s, 'Narrative Study: the production game neither loads nor names it (no narrative script, no identifier)',
    !/NARRATIVE_STUDY|NARRATIVE_LAB|NARRATIVE_STAGE|narrative-study/.test(game) && !/narrative-study/.test(html));
  check(s, 'Narrative Study: no stage-frame code reads browser storage (values arrive from the lab page in memory)',
    ['lab-apply.js', 'lab-stage.js', 'narrative-study.js', 'narrative-study-stage.js'].every((f) => !/localStorage|sessionStorage|indexedDB/.test(fs.readFileSync(path.join(dir, f), 'utf8'))));
  check(s, 'Narrative Study: the adapter never writes story state or production values (G.state, G.TUNING, G.layout)',
    !/G\.state\s*=|G\.state\.[a-z]+\s*=(?!=)|state\.flags\.[a-z]+\s*=(?!=)|G\.TUNING[\w.[\]]*\s*=(?!=)|G\.layout[\w.[\]]*\s*=(?!=)/i.test(nsStage) && !/G\.TUNING|G\.layout/.test(nsReg.replace(/\/\/.*$/gm, '')));
}
// The two review overlays: the art-study branch files with one correction (owner, 2026-11-08): a stray
// cream column at x 1919, outside the frame's dark edge, now repeats column 1918 (checked by pixel below).
const NARR_OVERLAYS = {
  'review/narrative-mode-b-art-study/narrative-mode-b-candidate-a-overlay.png': 'ebc7ccd00f4e5575673ad5e404f31453985ef24d34a64662166ab4370c65514c',
  'review/narrative-mode-b-art-study/narrative-mode-b-candidate-b-overlay.png': 'dddb6be4d1d5f5c03eff0f0a82c3e3377109ec6bdb28f2c5eaaa5a496b8769c4'
};
const NARR_SOURCE_REF = 'origin/agent/narrative-mode-b-art-study';
const NARR_SOURCES = {
  'review/narrative-mode-b-art-study/narrative-mode-b-candidate-a-overlay.png': '0dca8af319f3c67ca4f382f365d4ab642ec5cced0f81031ca34e36d9efdd88f7',
  'review/narrative-mode-b-art-study/narrative-mode-b-candidate-b-overlay.png': '3b163752dcb6da269c4dd46376e75efbdd364831f18b16a36955a5593476c340'
};
const NARR_STORE = 'cyoa-m2-reception-polish-lab-narrative-study-v1';

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
  // Owner, 2026-11-08: a lab starts with two LAB values of the owner's on top of production.
  const fresh = await lab(() => window.POLISH_LAB.changes());
  const others = Object.keys(prod).filter((k) => !(k in fresh) && vals[k] !== prod[k]);
  c('a fresh lab opens on production values plus only the owner\'s lab defaults (item slip fade-in 500 ms, NOTES background v2)',
    JSON.stringify(fresh) === JSON.stringify({ 'notice.fadeInMs': 500, 'overlay.notesPanel': 2 }) && others.length === 0 && prod['notice.fadeInMs'] === 180 && prod['overlay.notesPanel'] === 1, { fresh, others });
  const seeded = await lab((k) => JSON.parse(localStorage.getItem(k)).ownerDefaults, STORE);
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  c('RESET ALL TO PRODUCTION clears the owner defaults (the lab records that it added them, so a reload does not add them again)',
    seeded === 'owner-2026-11-08' && JSON.stringify(await lab(() => window.POLISH_LAB.values())) === JSON.stringify(prod) && (await lab(() => Object.keys(window.POLISH_LAB.changes()).length)) === 0, seeded);
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
  c('the lab opens with the production slip values: y 730, fade in 180, fade out 220, lifecycle 3600', pn === '730,180,220,3600', pn);
  await lab(() => window.POLISH_LAB.setState('three-choices'));
  await lab(() => { window.POLISH_LAB.setValue('notice.fadeInMs', 500); window.POLISH_LAB.setValue('notice.fadeOutMs', 400); });
  await ready();
  const fadeVals = await lab(() => ['frameLab', 'frameProduction'].map((id) => { const n = document.getElementById(id).contentWindow.CYOA_GAME.TUNING.notice; return n.fadeInMs + '/' + n.fadeOutMs; }).join());
  const hrefF = await labWin((w) => w.location.href);
  c('fade sliders apply live to the LAB frame only (production keeps 180/220, no reload)', fadeVals === '500/400,180/220' && hrefF === href0, fadeVals);
  await labG((w, G) => { G.clearNotices(); });
  await lab(() => window.POLISH_LAB.trigger('item-received'));
  const trig = await lab(() => new Promise((r) => { const w = document.getElementById('frameLab').contentWindow; const G = w.CYOA_GAME;
    setTimeout(() => r([G.ui.notice && G.ui.notice.fadeIn, G.ui.notice && G.ui.notice.fadeOut, G.noticeOpacity(), w.document.getElementById('itemNotice').style.top].join()), 250); }));
  const tparts = trig.split(',');
  c('ITEM RECEIVED uses the current LAB fade values (500 ms fade-in still rising at 250 ms) at y 730', tparts[0] === '500' && tparts[1] === '400' && Number(tparts[2]) > 0.3 && Number(tparts[2]) < 0.7 && tparts[3] === '730px', trig);
  c('COPY CHANGES carries the changed fade values', /"notice.fadeInMs": 500/.test(await lab(() => window.POLISH_LAB.exportChanges())) && /"notice.fadeOutMs": 400/.test(await lab(() => window.POLISH_LAB.exportChanges())));
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
  c('lab UI state is kept apart from the tunable values', await lab((k) => { const v = JSON.parse(localStorage.getItem(k[0])); const u = JSON.parse(localStorage.getItem(k[1])); return Object.keys(v).sort().join() === 'changes,ownerDefaults,schema' && !!u.folded && !!u.scrolls; }, [STORE, STORE_UI]));
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

  await narrativeStudy({ c, page, lab, labG, labWin, wrap, ready, freezeBoth, bodies, name, prod });

  c('no console or page errors in the lab', errors.length === 0, errors);
  await lab((ks) => ks.forEach((k) => localStorage.removeItem(k)), [STORE, STORE_UI]);
  await browser.close();
}

// Narrative Study (docs/68) -----------------------------------------------------------------------
// The experimental Narrative B / Focus A preview added to this lab. Runs after every reception check
// above, then proves the reception states are as they were. Owner corrections of 2026-11-08: the
// narration types on and scrolls like the dialogue box (same thumb), a choice's result continues it,
// second person, and talking vs action candidates on the narration and the reception dialogue.
async function narrativeStudy({ c, page, lab, labG, labWin, wrap, ready, freezeBoth, bodies, name, prod }) {
  const NS_STATES = ['ns-b-short', 'ns-b-long', 'ns-b-continue', 'ns-b-final', 'ns-a-keypad', 'ns-bab', 'ns-b-return', 'ns-spoken', 'ns-talk-dialogue', 'ns-talk-door', 'ns-dialogue'];
  const info = (mode) => lab((m) => document.getElementById(m === 'production' ? 'frameProduction' : 'frameLab').contentWindow.NARRATIVE_STAGE.info(), mode || 'lab');
  const setState = async (s) => { await lab((x) => window.POLISH_LAB.setState(x), s); await page.waitForTimeout(250); };
  const shoot = async () => page.screenshot({ clip: await wrap() });
  const save = (buf, file) => { if (name === 'chromium') fs.writeFileSync(path.join(SHOTS, file), buf); };
  const restOn = (test, ms) => lab(([t, limit]) => new Promise((res) => {
    const w = document.getElementById('frameLab').contentWindow;
    const f = new Function('w', 'G', 'i', 'return (' + t + ');');
    const t0 = Date.now();
    (function p() { const G = w.CYOA_GAME; const i = w.NARRATIVE_STAGE.info(); if (G.flow.phase === 'choosing' && !G.ui.motion && f(w, G, i)) res(true); else if (Date.now() - t0 > limit) res(false); else setTimeout(p, 30); })();
  }), [test, ms || 10000]);
  const words = (t) => t.replace(/"/g, '').replace(/\s+/g, ' ').trim();
  await lab(() => window.POLISH_LAB.resetAll());
  await lab(() => window.NARRATIVE_LAB.reset());
  await ready();
  await lab(() => window.POLISH_LAB.setView('lab'));

  // The reception opening before any preview has been on show (compared again at the end).
  await setState('opening');
  await freezeBoth(true);
  const openingBefore = await shoot();
  await freezeBoth(false);

  // The state list: the study's states in their own, clearly labelled group.
  const groups = await lab(() => Array.from(document.querySelectorAll('#stateSelect optgroup')).map((g) => [g.label, Array.from(g.children).map((o) => o.value)]));
  const nsGroup = groups.find((g) => /Narrative Study/.test(g[0]));
  c('Narrative Study: its states sit in their own group, labelled experimental and not the production game', !!nsGroup && /experimental/i.test(nsGroup[0]) && /not the production game/i.test(nsGroup[0])
    && JSON.stringify(nsGroup[1]) === JSON.stringify(NS_STATES) && groups.some((g) => /reception/.test(g[0]) && g[1].includes('opening')), groups.map((g) => g[0]));
  c('Narrative Study: the registry shares no key with the production tunables', await lab(() => window.NARRATIVE_STUDY.LIST.every((t) => !(t.key in window.POLISH_TUNABLES.byKey))));
  const voice = await labG((w) => { const S = w.NARRATIVE_STAGE; return Object.keys(S.NODES).map((id) => [id, S.passage(id)]).concat([1, 2, 3].map((k) => ['fixture ' + k, null])); });
  const firstPerson = voice.filter((v) => v[1] && /\b(I|ME|MY|MYSELF|MINE)\b/.test(v[1].replace(/"[^"]*"/g, ''))).map((v) => v[0]);
  const results = voice.filter((v) => v[1] && ['hall-return', 'hall-after-try', 'lever', 'wait', 'called-out', 'knocked'].includes(v[0]) && !/^YOU [A-Z]+ /.test(v[1])).map((v) => v[0]);
  c('Narrative Study: the narration is in the second person, present tense (no I / me / my; an action\'s result opens "YOU ...")', firstPerson.length === 0 && results.length === 0, { firstPerson, results });

  // Narrative B, short: frame, overlay, layers, labels -------------------------------------------
  await setState('ns-b-short');
  const hdr = await lab(() => [document.getElementById('viewProduction').textContent, document.getElementById('viewLab').textContent, !document.getElementById('narrBadge').hidden, document.getElementById('status').textContent]);
  c('Narrative Study: in a preview the header says STUDY DEFAULTS / LAB + STUDY VALUES and shows the EXPERIMENTAL badge (never PRODUCTION)',
    hdr[0] === 'STUDY DEFAULTS' && hdr[1] === 'LAB + STUDY VALUES' && hdr[2] && /experimental/i.test(hdr[3]) && !/PRODUCTION/.test(hdr[0] + hdr[1]), hdr);
  const b0 = await labG((w, G) => {
    const d = w.document;
    const i = w.NARRATIVE_STAGE.info();
    const kids = Array.from(d.getElementById('stage').children).map((e) => e.id);
    const ov = d.getElementById('labNarrativeOverlay');
    const vis = (id) => w.getComputedStyle(d.getElementById(id)).visibility;
    return { i, order: [kids.indexOf('portrait'), kids.indexOf('labFocusArt'), kids.indexOf('shell'), kids.indexOf('labNarrativeB'), kids.indexOf('choiceViewport')],
      ov: ov && [ov.getAttribute('src'), ov.naturalWidth, ov.naturalHeight, ov.style.left, ov.style.top, ov.width, ov.height].join(),
      hidden: [vis('portrait'), vis('speechText'), vis('speechIndicator')].join(), state: [G.state.node, G.state.transcript.length, G.ui.speech.parts.length].join() };
  });
  c('Narrative B: Candidate 1 overlay at 1:1 (0,0 1920x1080), above the shell and below the choices; portrait and dialogue box hidden',
    b0.i.mode === 'B' && b0.ov === '../../review/narrative-mode-b-art-study/narrative-mode-b-candidate-a-overlay.png,1920,1080,0px,0px,1920,1080'
    && b0.order[0] < b0.order[1] && b0.order[1] < b0.order[2] && b0.order[3] === b0.order[2] + 1 && b0.order[3] < b0.order[4] && b0.hidden === 'hidden,hidden,hidden', b0);
  c('Narrative B: the overlay served is the pinned review file (Candidate 1 bytes)', bodies['review/narrative-mode-b-art-study/narrative-mode-b-candidate-a-overlay.png'] === NARR_OVERLAYS['review/narrative-mode-b-art-study/narrative-mode-b-candidate-a-overlay.png']);
  c('Narrative B short: one top-aligned passage (starts at y 77), three ACTION choices, nothing in the transcript',
    b0.i.node === 'hall' && b0.i.pages === 1 && b0.i.lines >= 1 && b0.i.lines <= 5 && /^1350,77,522,/.test(b0.i.box) && b0.i.maxScroll === 0 && !b0.i.thumb
    && b0.i.kinds === JSON.stringify([['examine-keypad', 'action'], ['pull-lever', 'action'], ['wait', 'action']]) && b0.state === 'opening,1,1', b0);
  // The corrected overlays: the art-study files, except the stray cream column at x 1919, which now
  // repeats column 1918 (owner, 2026-11-08). Pixel-compared against the branch's own bytes.
  const srcB64 = Object.keys(NARR_OVERLAYS).map((p) => execFileSync('git', ['show', NARR_SOURCE_REF + ':' + p], { cwd: ROOT, maxBuffer: 1 << 26 }).toString('base64'));
  const col = await lab(async ([paths, srcs]) => {
    const load = (src) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error('load')); i.src = src; });
    const px = (img) => { const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1080; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, 1920, 1080).data; };
    const out = [];
    for (let n = 0; n < paths.length; n++) {
      const a = px(await load('data:image/png;base64,' + srcs[n])), b = px(await load('../../' + paths[n]));
      let elsewhere = 0, fixed = 0, wrong = 0, cream = 0;
      for (let y = 0; y < 1080; y++) for (let x = 0; x < 1920; x++) {
        const k = (y * 1920 + x) * 4;
        const same = a[k] === b[k] && a[k + 1] === b[k + 1] && a[k + 2] === b[k + 2] && a[k + 3] === b[k + 3];
        if (x !== 1919) { if (!same) elsewhere++; continue; }
        if (b[k + 3] && b[k] > 200 && b[k + 1] > 185) cream++;
        if (same) continue;
        const l = k - 4;
        if (b[k] === b[l] && b[k + 1] === b[l + 1] && b[k + 2] === b[l + 2] && b[k + 3] === b[l + 3] && a[k] > 200) fixed++; else wrong++;
      }
      out.push({ elsewhere, fixed, wrong, cream });
    }
    return out;
  }, [Object.keys(NARR_OVERLAYS), srcB64]);
  c('the stray 1 px cream line at the panel\'s right edge is gone: in both overlays only column 1919 changed (459 px), each now repeating column 1918; no cream left there',
    col.every((r) => r.elsewhere === 0 && r.fixed === 459 && r.wrong === 0 && r.cream === 0), col);
  await freezeBoth(true);
  const shotB = await shoot();
  save(shotB, 'narrative_b_short.png');
  // Pixels of the right column above the choices: wherever the overlay is opaque the screen is the
  // overlay; elsewhere where the shell is opaque, the shell (top hardware intact, no divider showing).
  const pix = (buf, mode, overlayPath, excl) => lab(async ([b64, m, ovp, ex]) => {
    const load = (src) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error('load ' + src.slice(0, 60))); i.src = src; });
    const imgs = await Promise.all([load('data:image/png;base64,' + b64), load('../../art/ui/shell/layout-final.png')].concat(ovp ? [load('../../' + ovp)] : []));
    const px = (img) => { const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1080; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, 1920, 1080).data; };
    const [s, sh, ov] = imgs.map(px);
    let n = 0, bad = 0, ovN = 0, first = null;
    for (let y = 0; y < 525; y++) for (let x = 1296; x < 1920; x++) {
      if (ex.some((r) => x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3])) continue;
      const k = (y * 1920 + x) * 4;
      let e = null;
      if (ov && ov[k + 3] === 255) { e = ov; ovN++; } else if (sh[k + 3] === 255) e = sh;
      if (!e) continue;
      n++;
      if (s[k] !== e[k] || s[k + 1] !== e[k + 1] || s[k + 2] !== e[k + 2]) { bad++; if (!first) first = [x, y, s[k], s[k + 1], s[k + 2], e[k], e[k + 1], e[k + 2]]; }
    }
    return { n, bad, ovN, first, m };
  }, [buf.toString('base64'), mode, overlayPath, excl]);
  const boxOf = (i) => { const b = i.box.split(',').map(Number); return [b[0] - 2, b[1] - 2, b[2] + 4, b[3] + 4]; };
  const pB = await pix(shotB, 'B', 'review/narrative-mode-b-art-study/narrative-mode-b-candidate-a-overlay.png', [boxOf(b0.i)]);
  c('Narrative B pixels: right column = Candidate 1 overlay where it is opaque, the owner shell elsewhere (frame, top hardware, no divider)', pB.bad === 0 && pB.n > 80000 && pB.ovN > 50000, pB);
  await freezeBoth(false);

  // Choices, scrollbar, footer and scene do not move -------------------------------------------
  const geo = (w, G) => {
    const d = w.document;
    const r = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].join(); };
    const c0 = d.querySelector('#choiceViewport .choice').getBoundingClientRect();
    // A card's height follows its own line count (production cardHeights); its place and width do not.
    return { vp: r(d.getElementById('choiceViewport')), card0: [c0.left, c0.top, c0.width].join(), heights: JSON.stringify(G.layout.choices.cardHeights),
      thumb: [d.getElementById('choiceThumb').style.left, d.getElementById('choiceThumb').style.top].join(), util: Array.from(d.querySelectorAll('.utility')).map(r).join('|'), inv: r(d.getElementById('invWindow')) };
  };
  const gB = await labG(geo);
  await freezeBoth(true);
  const footB = await page.screenshot({ clip: Object.assign(await wrap(), { height: 1080 }) });
  await freezeBoth(false);
  await setState('three-choices');
  const gR = await labG(geo);
  await setState('opening');
  await freezeBoth(true);
  const footR = await shoot();
  await freezeBoth(false);
  const region = (buf) => lab(async ([b64]) => {
    const i = await new Promise((r) => { const m = new Image(); m.onload = () => r(m); m.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas'); cv.width = 1920; cv.height = 1080; const x = cv.getContext('2d'); x.drawImage(i, 0, 0);
    // The scene (x < 1296) and the whole footer (y >= 870): everything outside the right column above the footer.
    return [x.getImageData(0, 0, 1296, 870).data, x.getImageData(0, 870, 1920, 210).data].map((d) => { let h = 0; for (let k = 0; k < d.length; k++) h = (h * 31 + d[k]) >>> 0; return h; }).join('/');
  }, [buf.toString('base64')]);
  c('Narrative B: choice viewport, first card, scrollbar thumb, utility buttons and inventory are exactly where reception has them',
    gB.vp === gR.vp && gB.card0 === gR.card0 && gB.heights === gR.heights && gB.thumb === gR.thumb && gB.util === gR.util && gB.inv === gR.inv, { gB, gR });
  c('Narrative B: scene and footer pixels are identical to the reception opening', (await region(footB)) === (await region(footR)));

  // Long passage: CONTINUE between paragraph groups; text adds on and scrolls ---------------------
  await setState('ns-b-continue');
  const p1 = await info();
  const cards1 = await labG((w, G) => G.ui.cards.map((k) => k.id + ':' + k.lines).join());
  const passageA = await labG((w) => w.NARRATIVE_STAGE.passage('announce'));
  const parasA = passageA.split('\n\n');
  c('Long passage, first part: only one 1-line CONTINUE card; whole paragraphs that fit the panel together (no scroll yet)', p1.page === 0 && p1.pages >= 2 && cards1 === 'continue:1'
    && p1.kinds === JSON.stringify([['continue', 'continue']]) && p1.lines <= p1.capacity && p1.maxScroll === 0 && parasA.some((p, k) => k > 0 && words(p1.all) === words(parasA.slice(0, k).join(' '))), { p1, cards1 });
  await freezeBoth(true);
  save(await shoot(), 'narrative_b_continue_page1.png');
  await freezeBoth(false);
  await lab(() => window.NARRATIVE_LAB.take('continue'));
  await restOn('i.page === 1');
  const p2 = await info();
  const thumb2 = await labG((w) => { const t = w.document.getElementById('labNarrationThumb'); return { cls: t.className, on: t.classList.contains('on'), r: [t.style.left, t.style.top, t.style.width, t.style.height].map((v) => parseInt(v)), op: w.getComputedStyle(t).opacity }; });
  c('CONTINUE adds the next part BELOW the first (nothing replaced); the box scrolls to it; with more than fits, the dialogue\'s scroll thumb shows once the text has stopped',
    p2.page === 1 && p2.page === p2.pages - 1 && words(p2.all) === words(passageA) && p2.all.startsWith(p1.all) && p2.lines > p2.capacity && p2.maxScroll > 0 && p2.scroll === p2.maxScroll
    && p2.revealed && thumb2.on && thumb2.cls === 'speech-indicator on' && thumb2.r[0] === 1899 && thumb2.r[2] === 8, { p2, thumb2 });
  c('only the last part reveals the decisions (three actions)', JSON.parse(p2.kinds).length === 3 && JSON.parse(p2.kinds).every((k) => k[1] === 'action'), p2.kinds);
  await setState('ns-b-final');
  const pf = await info();
  c('the final state is reached by taking CONTINUE (part 2 of 2, the whole passage in the narration, three actions)', pf.page === pf.pages - 1 && pf.pages === 2 && JSON.parse(pf.kinds).length === 3 && words(pf.all) === words(passageA), pf);
  await freezeBoth(true);
  save(await shoot(), 'narrative_b_continue_final.png');
  await freezeBoth(false);
  // The wheel scrolls the narration back, a line at a time, and the thumb follows (production rule).
  const tb = await wrap();
  await page.mouse.move(tb.x + 1600, tb.y + 250);
  for (let k = 0; k < pf.maxScroll + 3; k++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(20); }
  const top = await info();
  const thumbTop = await labG((w) => parseInt(w.document.getElementById('labNarrationThumb').style.top));
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(50);
  const one = await info();
  c('the wheel scrolls the narration back to its first line (clamped at the top) and on again a line at a time; the thumb sits at the top of its rail',
    top.scroll === 0 && top.text.split('\n')[0] === p1.all.split('\n')[0] && thumbTop === 83 && one.scroll === 1, { top: top.scroll, thumbTop, one: one.scroll });
  // Every intermediate part of the extreme fixture shows CONTINUE only, and the narration only grows.
  await lab(() => window.NARRATIVE_LAB.setValue('paging.fixture', 3));
  await setState('ns-b-continue');
  const seen = [];
  let prevAll = '';
  for (let k = 0; k < 8; k++) {
    const i = await info();
    seen.push([i.page, i.pages, JSON.parse(i.kinds).map((x) => x[0]).join('+'), i.all.startsWith(prevAll)]);
    prevAll = i.all;
    if (i.page === i.pages - 1) break;
    await lab(() => window.NARRATIVE_LAB.take('continue'));
    await restOn('i.page === ' + (i.page + 1));
  }
  c('a 3+ part passage: CONTINUE alone on every part but the last; each part adds on; the decisions appear only on the last', seen.length >= 3 && seen.slice(0, -1).every((s) => s[2] === 'continue')
    && seen[seen.length - 1][2] === 'reclassify+examine-keypad+pull-lever' && seen.every((s) => s[3]), seen);
  await lab(() => window.NARRATIVE_LAB.reset());

  // Text past a full panel types on and scrolls, like the dialogue box (owner, 2026-11-08) ----------
  await lab(() => { const L = window.NARRATIVE_LAB; L.setValue('paging.fixture', 2); L.setValue('timing.revealCps', 400); });
  await setState('ns-bab');
  await labG((w) => { w.NARRATIVE_STAGE.enter('announce'); });
  const typing = [];
  for (let k = 0; k < 40; k++) {
    const i = await info();
    typing.push([i.revealed, i.scroll, i.thumb, i.pages]);
    if (i.revealed) break;
    await page.waitForTimeout(80);
  }
  await restOn('true', 8000);
  const tl = await info();
  const during = typing.filter((t) => !t[0]);
  c('a paragraph longer than the panel is one part (no CONTINUE): it types on, the box follows the newest line, the thumb waits until it stops, then shows',
    during.length >= 3 && during.some((t) => t[1] > 0) && during.every((t) => !t[2]) && during.every((t, k) => k === 0 || t[1] >= during[k - 1][1])
    && tl.pages === 1 && tl.revealed && tl.thumb && tl.scroll === tl.maxScroll && tl.maxScroll > 0 && words(tl.all) === words(await labG((w) => w.NARRATIVE_STAGE.passage('announce'))), { during: during.length, last: typing[typing.length - 1], tl: [tl.pages, tl.scroll, tl.maxScroll, tl.thumb] });
  await lab(() => window.NARRATIVE_LAB.reset());

  // No clipping, no lost words: every flow x fixture x face x line spacing --------------------------
  const clipping = await lab(async () => {
    const L = window.NARRATIVE_LAB;
    const out = [];
    for (const font of [1, 2, 3, 4]) for (const fx of [1, 2, 3]) for (const lh of [16, 26, 44]) for (const fl of [[1, 1], [2, 1], [3, 1], [3, 2], [3, 3]]) {
      L.setValue('text.font', font, true); L.setValue('paging.fixture', fx, true); L.setValue('text.lineHeight', lh, true); L.setValue('paging.flow', fl[0], true); L.setValue('paging.breakAt', fl[1], true);
      const w = document.getElementById('frameLab').contentWindow;
      w.NARRATIVE_STAGE.applyValues(L.values());
      const S = w.NARRATIVE_STAGE, T = w.CYOA_GAME.text;
      const role = window.NARRATIVE_STUDY.FONT_ROLE[font];
      const v = L.values();
      const faceH = T.lineHeight(role);
      const cap = Math.max(1, Math.floor((window.NARRATIVE_STUDY.SAFE_B.bottom - v['text.bottomMargin'] - v['text.y'] - faceH) / lh) + 1);
      const bottom = v['text.y'] + (cap - 1) * lh + faceH; // the last visible line's glyphs end here
      const src = S.passage('announce').replace(/"/g, '').replace(/\s+/g, ' ').trim();
      const paras = S.passage('announce').split('\n\n').map((p) => S.marked(p, v['marking.style']));
      let ok = bottom <= window.NARRATIVE_STUDY.SAFE_B.bottom - v['text.bottomMargin'];
      let parts;
      if (fl[0] === 3) {
        const pages = S.pagesOf('announce', 'B');
        const got = pages.map((p) => p.join(' ')).join(' ').replace(/"/g, '').replace(/\s+/g, ' ').trim();
        const okEnds = fx !== 2 || fl[1] !== 1 || pages.slice(0, -1).every((p) => /[.!?]"?$/.test(p[p.length - 1]));
        ok = ok && got === src && pages.every((p) => p.length <= cap && p[0] !== '') && pages.flat().every((l) => T.inkWidth(l, role) <= v['text.width']) && okEnds;
        parts = pages.length;
      } else {
        const groups = S.beatsOf('announce');
        const flat = groups.flat();
        const lens = groups.map((g) => g.reduce((n, k, j) => n + (j ? 1 : 0) + T.wrap(paras[k], v['text.width'], role).length, 0));
        // No CONTINUE (flow 2): one part, which types on and scrolls; with CONTINUE, a part of several
        // paragraphs fits the panel (a single paragraph longer than the panel scrolls).
        ok = ok && JSON.stringify(flat) === JSON.stringify(paras.map((p, k) => k))
          && (fl[0] === 2 ? groups.length === 1 : groups.every((g, j) => g.length === 1 || lens[j] <= cap)) && paras.every((p) => T.wrap(p, v['text.width'], role).every((l) => T.inkWidth(l.split('\u0001').join(''), role) <= v['text.width']));
        parts = groups.length;
      }
      out.push({ font, fx, lh, fl: fl.join('/'), ok, parts, cap });
    }
    L.reset();
    return out;
  });
  const clipBad = clipping.filter((r) => !r.ok);
  c('no clipping or lost text: 4 faces x 3 fixtures x 3 line spacings x 5 continuation rules fit the panel budget and the parchment (180 cases)', clipBad.length === 0 && clipping.length === 180, clipBad.slice(0, 5));
  c('separate pages (the earlier study, still selectable): a single paragraph longer than a page breaks at sentence ends', clipping.filter((r) => r.fx === 2 && r.fl === '3/1').every((r) => r.ok)
    && clipping.filter((r) => r.fx === 2 && r.fl === '3/1' && r.parts >= 2).length >= 6, clipping.filter((r) => r.fx === 2 && r.fl === '3/1').map((r) => [r.font, r.lh, r.parts, r.ok]));
  await ready();

  // B -> A -> B, by real clicks on the stage --------------------------------------------------------
  await setState('ns-bab');
  await lab(() => window.POLISH_LAB.setView('lab'));
  const box = await wrap();
  const clickCard = async (id) => {
    const r = await labWin((w, d, a) => { const e = d.querySelector('#choiceViewport .choice[data-choice="' + a + '"]'); const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; }, id);
    await page.mouse.click(box.x + r[0] + Math.round(r[2] / 2), box.y + r[1] + Math.round(r[3] / 2));
  };
  const base = await labG((w, G) => [G.state.node, G.state.transcript.length, G.ui.speech.parts.length, JSON.stringify(G.state.flags)].join('|'));
  const b1 = await info();
  await freezeBoth(true);
  save(await shoot(), 'narrative_bab_1_b.png');
  await freezeBoth(false);
  await clickCard('examine-keypad');
  const motion1 = await labG((w, G) => G.ui.motion && G.ui.motion.kind);
  const inA = await restOn('i.mode === "A"');
  const a = await info();
  const aDom = await labG((w) => { const d = w.document; return [d.getElementById('labNarrativeB').style.display, d.getElementById('labFocusArt').style.display, d.getElementById('labFocusPlaceholder').dataset.placeholder,
    d.getElementById('labFocusPlaceholder').width, d.getElementById('labFocusPlaceholder').height, d.getElementById('labFocusArt').style.left, d.getElementById('labFocusArt').style.top].join(); });
  c('B -> A: clicking EXAMINE THE KEYPAD (an action: every card slides away, no speech send) opens Focus A', inA && motion1 === 'clear' && a.node === 'keypad' && a.mode === 'A', { motion1, a });
  c('Focus A: overlay gone, a labelled LAB PLACEHOLDER close-up fills the normal portrait aperture (564x278 at 1333,44), object choices', aDom === 'none,,FOCUS A: KEYPAD,564,278,1333px,44px'
    && a.kinds === JSON.stringify([['press-keys', 'action'], ['stop', 'action']]) && /^1342,360,540,/.test(a.box) && a.lines <= a.capacity, { aDom, a });
  await freezeBoth(true);
  const shotA = await shoot();
  save(shotA, 'narrative_bab_2_a.png');
  save(shotA, 'narrative_a_keypad.png');
  const pA = await pix(shotA, 'A', null, [boxOf(a), [1333, 44, 564, 278]]);
  c('Focus A pixels: the right column above the choices is the owner shell (no B overlay, no stray divider or hardware)', pA.bad === 0 && pA.n > 60000, pA);
  await freezeBoth(false);
  const followA = (await info('production')).node;
  await clickCard('stop');
  const backB = await restOn('i.mode === "B"');
  const b2 = await info();
  c('A -> B: STOP EXAMINING returns to Narrative B and the narration CONTINUES: the earlier passage stays, the new one is added below it (the description is not)', backB && b2.node === 'hall-return'
    && b2.all.startsWith(b1.all) && /YOU STEP BACK FROM THE DOORS/.test(b2.all.slice(b1.all.length)) && !b2.all.includes('BRASS KEYPAD, TWELVE KEYS') && b2.lines <= b2.capacity, { b1: b1.all, b2: b2.all });
  await freezeBoth(true);
  save(await shoot(), 'narrative_bab_3_b.png');
  await freezeBoth(false);
  await page.waitForTimeout(600);
  c('a card taken by hand in the LAB frame is taken in the STUDY DEFAULTS frame too (same point for P / L flips)', followA === 'keypad' && (await info('production')).node === 'hall-return');
  const after = await labG((w, G) => [G.state.node, G.state.transcript.length, G.ui.speech.parts.length, JSON.stringify(G.state.flags)].join('|'));
  c('actions are not spoken lines: nothing entered the transcript or the dialogue history, no story state changed', after === base && base.startsWith('opening|1|1|'), { base, after });
  await setState('ns-b-return');
  const ret = await info();
  c('the NB-6 state shows the same continued narration (the hallway, then stepping back)', ret.node === 'hall-return' && ret.all === b2.all, ret.all);
  // The earlier study's replacing result stays selectable for comparison.
  await lab(() => window.NARRATIVE_LAB.setValue('choices.result', 2));
  await setState('ns-b-return');
  const repl = await info();
  c('"Replaces the narration" (earlier study, selectable): back from A, only the new passage is on show', repl.node === 'hall-return' && /^YOU STEP BACK/.test(repl.all) && !repl.all.includes('BUSY WITH A FORM'), repl.all);
  await lab(() => window.NARRATIVE_LAB.reset());

  // Spoken vs action; talking vs action marking ---------------------------------------------------
  await setState('ns-spoken');
  const sp = await info();
  c('the comparison state offers ACTION and SPOKEN cards on the same approved card art, plain wording, no "A:" marker', sp.kinds === JSON.stringify([['examine-keypad', 'action'], ['call-out', 'spoken'], ['knock', 'action']])
    && (await labG((w, G) => G.ui.cards.map((k) => k.text).join('|'))) === 'EXAMINE THE KEYPAD|HELLO? IS ANYONE BACK THERE?|KNOCK ON THE DOUBLE DOORS', sp);
  await freezeBoth(true);
  save(await shoot(), 'narrative_spoken_vs_action.png');
  await freezeBoth(false);
  const spoken = await labG(async (w, G) => { const S = w.NARRATIVE_STAGE; const p = S.take('call-out'); const kind = G.ui.motion && G.ui.motion.kind; await p; return [kind, S.info().node, G.state.transcript.length, G.ui.speech.parts.length].join(); });
  c('a spoken line uses the production send, but its result is narrated: no transcript or dialogue-history entry', spoken === 'send,called-out,1,1', spoken);
  const said = await info();
  c('the result continues the narration, and what you said is told as speech: in quotation marks (the default candidate), the narration around it plain',
    said.all.startsWith(sp.all) && said.all.includes('YOU CALL OUT, "HELLO? IS ANYONE BACK THERE?" YOUR') && /"NOT FOR VISITORS, THERE ISN'T\."/.test(said.all.replace(/\n/g, ' ')), said.all);
  await freezeBoth(true);
  save(await shoot(), 'narrative_spoken_result.png');
  await freezeBoth(false);
  // The narration's marking, by pixel: one dark ink whatever the style or the action ink (owner,
  // 2026-11-08: the narration never takes the dialogue's red).
  const inks = () => labG((w) => { const c = w.document.getElementById('labNarrationText'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const s = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3]) s.add('#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')); return [...s].sort().join(); });
  const mk = {};
  for (const [st, ink] of [[1, 1], [2, 1], [2, 2], [2, 3]]) {
    await lab((x) => { window.NARRATIVE_LAB.setValue('marking.style', x[0]); window.NARRATIVE_LAB.setValue('marking.ink', x[1]); }, [st, ink]);
    await page.waitForTimeout(150);
    mk[st + '/' + ink] = { inks: await inks(), quotes: /"HELLO\?/.test((await info()).all) && /"NOT FOR VISITORS/.test((await info()).all.replace(/\n/g, ' ')) };
  }
  c('narration: dark ink only under every style and every action ink; the owner\'s rule quotes both the player\'s and the man\'s speech, style 1 (the game today) marks nothing',
    Object.values(mk).every((m) => m.inks === '#203037') && !mk['1/1'].quotes && mk['2/1'].quotes && mk['2/2'].quotes && mk['2/3'].quotes, mk);
  await lab(() => window.NARRATIVE_LAB.reset());
  await lab(() => window.NARRATIVE_LAB.setValue('choices.spokenQuotes', 2));
  await setState('ns-spoken');
  c('spoken quotation marks on the card are only a selectable candidate (lab frame only)', (await labG((w, G) => G.ui.cards[1].text)) === '"HELLO? IS ANYONE BACK THERE?"'
    && (await lab(() => document.getElementById('frameProduction').contentWindow.CYOA_GAME.ui.cards[1].text)) === 'HELLO? IS ANYONE BACK THERE?');
  await lab(() => window.NARRATIVE_LAB.reset());

  // NB-8 / NB-9: the owner's rule on the real reception dialogue -------------------------------------
  await setState('ns-talk-dialogue');
  const talk = (mode) => lab((m) => { const w = document.getElementById(m === 'production' ? 'frameProduction' : 'frameLab').contentWindow; const G = w.CYOA_GAME;
    return { t: w.NARRATIVE_STAGE.talkInfo(), node: G.state.node, transcript: G.state.transcript.map((x) => x.text), phase: G.flow.phase, scroll: G.ui.speech.scrollLine, max: G.speechMaxScroll(),
      topPart: (G.ui.speech.lines[G.ui.speech.scrollLine] || {}).part }; }, mode || 'lab');
  const speechInks = () => labG((w) => { const c = w.document.querySelector('#speechText canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const s = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3]) s.add('#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')); return [...s].sort().join(); });
  const t2 = await talk();
  const byWho = (t, who) => t.t.parts.filter((p) => p.who === who).map((p) => p.text);
  c('NB-8 is the real conversation through the production flow (directions, the player\'s [SIGH.] and an OBSERVE thought), story state untouched',
    t2.node === 'facilities' && t2.phase === 'choosing' && t2.t.on && t2.t.parts.length === 10 && t2.transcript.some((x) => /\[SIGH\.\]/.test(x)) && t2.transcript.some((x) => /\[STAMP\.\]/.test(x)), t2.t.parts.map((p) => p.who));
  const marked8 = t2.t.parts.map((p, k) => (p.marked ? k : -1)).filter((k) => k >= 0);
  const sighAt = t2.t.origs.indexOf('[SIGH.] AND THE BATHROOM?');
  c('NB-8, owner\'s rule (default): no quotation marks in the dialogue box; only the player\'s action takes the ink (SIGH.), without brackets; her directions read as plain descriptions (SHE STAMPS SOMETHING.); the thought keeps the game\'s parentheses; transcript keeps the production text',
    JSON.stringify(marked8) === JSON.stringify([sighAt]) && t2.t.parts[sighAt].inked === 'SIGH.' && byWho(t2, 'player').includes('SIGH. AND THE BATHROOM?')
    && byWho(t2, 'npc').some((x) => /^ONE MOMENT\. SHE STAMPS SOMETHING\. THE FACILITIES/.test(x)) && byWho(t2, 'npc').some((x) => /CONDITIONS\. SHE WAITS FOR YOU TO WORK OUT WHO THAT IS\.$/.test(x))
    && byWho(t2, 'thought').length === 1 && byWho(t2, 'thought').every((x) => /^\(.*\)$/.test(x))
    && t2.t.parts.every((p) => !/"/.test(p.text) && (p.who === 'thought' || !/[[\]()]/.test(p.text))) && t2.transcript.every((x) => !/^"/.test(x)), t2.t.parts.map((p) => [p.text.slice(0, 50), p.inked]));
  c('NB-8 opens where the history mixes most (at the player\'s SIGH. line), scrollable like any dialogue; the box shows the dark ink and the red ribbon',
    t2.scroll > 0 && t2.scroll <= t2.max && t2.topPart === sighAt && (await speechInks()) === '#203037,#8e2c1f', { scroll: t2.scroll, max: t2.max, topPart: t2.topPart, sighAt });
  await freezeBoth(true);
  save(await shoot(), 'narrative_talk_dialogue_owner_rule.png');
  await freezeBoth(false);
  const href8 = await labWin((w) => w.location.href);
  await lab(() => window.NARRATIVE_LAB.setValue('marking.ink', 2));
  await page.waitForTimeout(200);
  const brown8 = await speechInks();
  await lab(() => window.NARRATIVE_LAB.setValue('marking.style', 1));
  await page.waitForTimeout(200);
  const t1 = await talk();
  const prodParts = t1.t.origs;
  c('NB-8, the action ink switches live (faded brown); style 1 is the production text exactly (brackets, parentheses, one ink), re-marked live in the LAB frame only (no reload)',
    brown8 === '#203037,#6b5536' && JSON.stringify(t1.t.parts.map((p) => p.text)) === JSON.stringify(prodParts) && t1.t.parts.every((p) => !p.marked) && prodParts.some((x) => x === '[SIGH.] AND THE BATHROOM?') && prodParts.some((x) => /^\(.*\)$/.test(x))
    && (await speechInks()) === '#203037' && (await labWin((w) => w.location.href)) === href8 && byWho(await talk('production'), 'player').includes('SIGH. AND THE BATHROOM?'), t1.t.parts.map((p) => p.text.slice(0, 40)));
  const refused8 = await lab(async () => [await window.POLISH_LAB.trigger('npc-typing'), await window.POLISH_LAB.trigger('context-action')]);
  c('NB-8 refuses the reception triggers that would re-add a line (NPC typing, context action)', refused8.every((r) => /not in a Narrative Study state/.test(r)), refused8);
  await lab(() => window.NARRATIVE_LAB.reset());

  await setState('ns-talk-door');
  const t9 = await talk();
  const goAt = t9.t.origs.indexOf('GO TO THE EXAMINERS DOOR.');
  const unlockAt = t9.t.origs.indexOf('UNLOCK THE EXAMINERS DOOR WITH THE KEY.');
  const drawerAt = t9.t.origs.findIndex((x) => /\[SHE OPENS A DRAWER\. IT IS FULL\.\]$/.test(x));
  const spokenPlayer = t9.t.parts.filter((p, k) => p.who === 'player' && k !== goAt && k !== unlockAt);
  c('NB-9 reaches the door through the production flow; every action choice the study names exists in the content (unlock, unlock-after, to-door, enter-corridor)',
    t9.node === 'door' && t9.phase === 'choosing' && goAt > 0 && unlockAt > goAt && drawerAt > 0 && drawerAt < goAt && JSON.stringify(t9.t.actionChoices) === JSON.stringify(['unlock', 'unlock-after', 'to-door', 'enter-corridor']),
    { node: t9.node, goAt, unlockAt, drawerAt, actionChoices: t9.t.actionChoices });
  c('NB-9: the player\'s action choices land in the dialogue wholly in the ink (GO TO..., UNLOCK...); the player\'s spoken lines and every NPC line stay dark; her drawer is a plain description',
    t9.t.parts[goAt].inked === 'GO TO THE EXAMINERS DOOR.' && t9.t.parts[unlockAt].inked === 'UNLOCK THE EXAMINERS DOOR WITH THE KEY.' && spokenPlayer.length >= 5 && spokenPlayer.every((p) => !p.marked)
    && t9.t.parts.filter((p) => p.who === 'npc').every((p) => !p.marked && !/[[\]"]/.test(p.text)) && /OTHERS\. SHE OPENS A DRAWER\. IT IS FULL\.$/.test(t9.t.parts[drawerAt].text),
    t9.t.parts.map((p) => [p.who, p.text.slice(0, 40), p.inked]));
  c('NB-9 opens on her drawer line, with both actions and her replies below it', t9.topPart === drawerAt && t9.scroll <= t9.max && (await speechInks()) === '#203037,#8e2c1f', { scroll: t9.scroll, max: t9.max, topPart: t9.topPart, drawerAt });
  await freezeBoth(true);
  save(await shoot(), 'narrative_talk_door_owner_rule.png');
  await freezeBoth(false);
  await lab(() => window.NARRATIVE_LAB.reset());

  // Tuning, live, LAB frame only; candidate 2; timings --------------------------------------------
  await setState('ns-b-short');
  const href0 = await labWin((w) => w.location.href);
  await lab(() => { const L = window.NARRATIVE_LAB; L.setValue('text.y', 97); L.setValue('text.x', 1360); L.setValue('text.lineHeight', 30); });
  await page.waitForTimeout(150);
  const tuned = [(await info()).box, (await info('production')).box];
  c('narration X / Y / spacing apply live in the LAB frame only (no reload); the STUDY DEFAULTS frame keeps 1350,77', /^1360,97,522,/.test(tuned[0]) && /^1350,77,522,/.test(tuned[1])
    && (await labWin((w) => w.location.href)) === href0, tuned);
  await lab(() => window.NARRATIVE_LAB.setValue('text.width', 600));
  c('wrap width is clamped so the box stays on the parchment (x + width <= 1908)', (await lab(() => window.NARRATIVE_LAB.values()['text.width'])) === 548);
  await lab(() => window.NARRATIVE_LAB.setValue('surface.candidate', 2));
  await page.waitForTimeout(400);
  const cand = await labG((w) => w.document.getElementById('labNarrativeOverlay').getAttribute('src'));
  c('Candidate 2 switches live in the LAB frame (served bytes pinned); the defaults frame keeps Candidate 1', /candidate-b-overlay\.png$/.test(cand)
    && bodies['review/narrative-mode-b-art-study/narrative-mode-b-candidate-b-overlay.png'] === NARR_OVERLAYS['review/narrative-mode-b-art-study/narrative-mode-b-candidate-b-overlay.png']
    && /candidate-a-overlay\.png$/.test(await lab(() => document.getElementById('frameProduction').contentWindow.document.getElementById('labNarrativeOverlay').getAttribute('src'))), cand);
  c('every image the lab loads is a production art file under art/ or one of the two pinned review overlays', Object.keys(bodies).every((p) => /^art\//.test(p) || p in NARR_OVERLAYS), Object.keys(bodies).filter((p) => !/^art\//.test(p)));
  await lab(() => window.NARRATIVE_LAB.setValue('text.font', 3));
  await page.waitForTimeout(150);
  const f3 = await info();
  c('the narration face can be switched to another baked face (Labels) and still fits', f3.lines <= f3.capacity && f3.maxInk <= f3.width, f3);
  await lab(() => window.NARRATIVE_LAB.reset());
  await page.waitForTimeout(150);
  // A production tunable changed during a preview rebuilds the production stage in place: the
  // preview layers come back on it at once, and the cards follow the production value.
  const beforeRebuild = await info();
  await lab(() => window.POLISH_LAB.setValue('choices.listY', window.POLISH_LAB.production()['choices.listY'] + 10));
  await ready();
  const rb = await labWin((w, d) => [!!d.getElementById('labNarrativeB') && d.getElementById('labNarrativeB').parentNode === d.getElementById('stage'),
    d.getElementById('shell').nextElementSibling.id, d.getElementById('labNarrativeOverlay').getAttribute('src').split('/').pop(), d.querySelector('#choiceViewport').getBoundingClientRect().top, w.location.href].join('|'));
  const afterRebuild = await info();
  c('a production tunable changed during a preview rebuilds the stage live: overlay and passage stay, the cards follow the value', rb === 'true|labNarrativeB|narrative-mode-b-candidate-a-overlay.png|537|' + href0
    && afterRebuild.node === beforeRebuild.node && afterRebuild.text === beforeRebuild.text, rb);
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  // Timings: typing speed, choices pause, cross-fade.
  c('the narration types at the dialogue\'s own speed by default (40 chars / s = G.layout.speech.text.charsPerSecond)',
    (await lab(() => window.NARRATIVE_LAB.values()['timing.revealCps'])) === 40 && (await labG((w, G) => G.layout.speech.text.charsPerSecond)) === 40);
  await lab(() => { const L = window.NARRATIVE_LAB; L.setValue('timing.revealCps', 30); L.setValue('timing.transitionMs', 800); });
  await setState('ns-b-short');
  await labG((w) => { w.NARRATIVE_STAGE.take('examine-keypad'); });
  await page.waitForTimeout(450);
  const mid = await labG((w, G) => [Number(w.document.getElementById('labNarrativeB').style.opacity), w.document.getElementById('labFocusArt').style.display, G.ui.cards.length].join());
  const midP = mid.split(',');
  c('the B -> A cross-fade runs over the set time (overlay part-faded mid-way, close-up beneath, no cards yet)', Number(midP[0]) > 0 && Number(midP[0]) < 1 && midP[1] === '' && midP[2] === '0', mid);
  await page.waitForTimeout(800);
  const rev = await info();
  await labG((w) => { w.document.getElementById('labFocusText').click(); });
  await page.waitForTimeout(100);
  const revDone = await info();
  c('the text types at the set speed, a click on it finishes it, and the choices follow only then', !rev.revealed && rev.mode === 'A' && revDone.revealed
    && (await restOn('i.node === "keypad"', 4000)), { rev: rev.revealed, done: revDone.revealed });
  await lab(() => window.NARRATIVE_LAB.reset());

  // Export / import / reset / persistence: apart from the production tunables ---------------------
  await lab(() => window.POLISH_LAB.setValue('portrait.npcY', 3));
  await lab(() => { const L = window.NARRATIVE_LAB; L.setValue('text.y', 90); L.setValue('timing.transitionMs', 400); });
  const nx = JSON.parse(await lab(() => window.NARRATIVE_LAB.exportChanges()));
  c('COPY NARRATIVE STUDY JSON: its own schema, an EXPERIMENTAL note, only the changed study keys', nx.schema === 'cyoa-m2-narrative-study-v1' && /EXPERIMENTAL/.test(nx.note)
    && JSON.stringify(nx.changes) === JSON.stringify({ 'text.y': 90, 'timing.transitionMs': 400 }), nx);
  const px1 = await lab(() => window.POLISH_LAB.exportChanges());
  const pxAll = await lab(() => window.POLISH_LAB.exportAll());
  c('the production exports never carry a narrative value (COPY CHANGES / COPY ALL)', JSON.stringify(JSON.parse(px1).changes) === JSON.stringify({ 'portrait.npcY': 3 })
    && !/text\.y|timing\.transition|surface\.|paging\.|focus\.|marking\.|narrative/i.test(px1 + pxAll), JSON.parse(px1));
  await lab(() => window.NARRATIVE_LAB.reset());
  c('RESET NARRATIVE STUDY clears only the study values (the production lab change stays)', (await lab(() => Object.keys(window.NARRATIVE_LAB.changes()).length)) === 0
    && JSON.stringify(await lab(() => window.POLISH_LAB.changes())) === JSON.stringify({ 'portrait.npcY': 3 }));
  const nImp = await lab((t) => window.NARRATIVE_LAB.importJSON(t), JSON.stringify(nx));
  c('IMPORT NARRATIVE JSON round-trips its own export', nImp.ok && JSON.stringify(await lab(() => window.NARRATIVE_LAB.changes())) === JSON.stringify(nx.changes), nImp);
  const nBad = {};
  nBad.prodSchema = await lab((t) => window.NARRATIVE_LAB.importJSON(t), px1);
  nBad.unknown = await lab((t) => window.NARRATIVE_LAB.importJSON(t), JSON.stringify({ schema: 'cyoa-m2-narrative-study-v1', changes: { 'portrait.npcY': 3 } }));
  nBad.range = await lab((t) => window.NARRATIVE_LAB.importJSON(t), JSON.stringify({ schema: 'cyoa-m2-narrative-study-v1', changes: { 'text.lineHeight': 400 } }));
  nBad.offParchment = await lab((t) => window.NARRATIVE_LAB.importJSON(t), JSON.stringify({ schema: 'cyoa-m2-narrative-study-v1', changes: { 'text.x': 1420, 'text.width': 580 } }));
  nBad.fraction = await lab((t) => window.NARRATIVE_LAB.importJSON(t), JSON.stringify({ schema: 'cyoa-m2-narrative-study-v1', changes: { 'text.y': 80.5 } }));
  nBad.style = await lab((t) => window.NARRATIVE_LAB.importJSON(t), JSON.stringify({ schema: 'cyoa-m2-narrative-study-v1', changes: { 'marking.style': 3 } })); // a retired candidate
  const prodImp = await lab((t) => window.POLISH_LAB.importJSON(t), JSON.stringify(nx));
  c('imports stay apart: a production export is refused by the study import and a study export by the production import; bad values refused',
    Object.values(nBad).every((r) => !r.ok) && !prodImp.ok && JSON.stringify(await lab(() => window.NARRATIVE_LAB.changes())) === JSON.stringify(nx.changes),
    Object.fromEntries(Object.entries(nBad).map(([k, r]) => [k, r.errors && r.errors[0]])));
  await lab(() => window.POLISH_LAB.resetAll());
  await ready();
  c('RESET ALL TO PRODUCTION leaves the study values alone', JSON.stringify(await lab(() => window.NARRATIVE_LAB.changes())) === JSON.stringify(nx.changes)
    && Object.keys(await lab(() => window.POLISH_LAB.changes())).length === 0);
  await lab(() => window.POLISH_LAB.setValue('portrait.npcY', 3));
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.labReady, null, { timeout: 60000 });
  const persisted = await lab((k) => [JSON.stringify(window.NARRATIVE_LAB.changes()), JSON.stringify(window.POLISH_LAB.changes()), Object.keys(JSON.parse(localStorage.getItem(k)).changes).join(),
    JSON.stringify(document.getElementById('frameLab').contentWindow.NARRATIVE_STAGE.values()['text.y'])], NARR_STORE);
  c('study values persist under their own storage key, apart from the production values; the LAB frame gets them at boot', persisted[0] === JSON.stringify(nx.changes)
    && persisted[1] === JSON.stringify({ 'portrait.npcY': 3 }) && persisted[2] === 'text.y,timing.transitionMs' && persisted[3] === '90', persisted);
  // The production game reads none of it.
  const g = await page.context().newPage();
  await g.goto(page.url().replace(/tools\/m2-reception-polish-lab\/index\.html.*/, 'game/index.html'));
  await g.waitForFunction(() => document.body.dataset.ready, null, { timeout: 20000 });
  const gState = await g.evaluate((k) => [!!localStorage.getItem(k), typeof window.NARRATIVE_STAGE, typeof window.NARRATIVE_STUDY, !!document.getElementById('labNarrativeOverlay'), window.CYOA_GAME.TUNING.portrait.npcY, window.CYOA_GAME.state.node].join(), NARR_STORE);
  c('the production game ignores the study (storage present, never read; no narrative code or layer; production values)', gState === 'true,undefined,undefined,false,0,opening', gState);
  await g.close();
  await lab(() => { window.NARRATIVE_LAB.reset(); window.POLISH_LAB.resetAll(); });
  await ready();

  // Reception-only triggers are refused in a preview; reception states unchanged after the study ----
  await setState('ns-b-short');
  const refusals = await lab(async () => [await window.POLISH_LAB.trigger('npc-typing'), await window.POLISH_LAB.trigger('context-action')]);
  c('reception-only triggers (NPC typing, context action) are refused in a preview, with the reason', refusals.every((r) => /not in a Narrative Study state/.test(r)), refusals);
  await setState('ns-dialogue');
  const ref = await labG((w, G) => [G.state.node, G.ui.cards.map((k) => k.id).join('+'), w.getComputedStyle(w.document.getElementById('portrait')).visibility, !!w.document.getElementById('labNarrativeB') && !!w.document.getElementById('labNarrativeB').parentNode, w.document.body.dataset.narrMode || '',
    G.ui.speech.parts.map((p) => p.text).join('|') === G.state.transcript.map((t) => t.text).join('|')].join('|'));
  const refHdr = await lab(() => [document.getElementById('viewProduction').textContent, document.getElementById('narrBadge').hidden].join());
  c('the reference state is the real reception dialogue (production flow and text, receptionist on show, no preview layer, PRODUCTION / LAB labels)',
    ref === 'misassign|correct+cooperate+practical|visible|false||true' && refHdr === 'PRODUCTION,true', { ref, refHdr });
  await setState('opening');
  await freezeBoth(true);
  const openingAfter = await shoot();
  await freezeBoth(false);
  c('after every preview, the reception opening is pixel-identical to before (no layer, overlay, marking or style left behind)', openingAfter.equals(openingBefore));
  if (name === 'chromium') {
    await setState('ns-b-final');
    await page.screenshot({ path: path.join(SHOTS, 'narrative_lab_overview.png') });
  }
  await setState('opening');
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
