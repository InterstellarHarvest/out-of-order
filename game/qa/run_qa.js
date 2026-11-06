#!/usr/bin/env node
// Browser QA for the reception slice (Playwright). From the repository root:
//   NODE_PATH="$(npm root -g)" node game/qa/run_qa.js
// QA_BROWSERS=chromium,firefox (the default) picks the browsers. A browser that cannot launch is
// recorded as a failure, never skipped silently.
// A pass shows the slice behaves as specified. It is not visual or narrative approval.
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');
const playwright = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const GAME_URL = 'game/index.html?qa';
const SHOTS = path.join(__dirname, 'screenshots');
const START_SHA = '5d42b524e8499c7ef3da724ba02f439c1cc660ff'; // main when M2 began
const SHELL_PATH = 'art/ui/shell/layout-final.png';
const SHELL_SHA256 = '813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6';
const PASS_PATH = 'art/items/bathroom_pass_slot.png';
// New owner art added on this branch, pinned by hash.
const OWNER_ART = {
  'art/ui/shell/item-overlay.png': '4566079c985b7efaeeba0140dd5c6b8b8b371713391604118e3de123738a8dfb' // inspector column, 1920x1080
};
// The changes to M1 art since M2 began: the owner's hand edit of ten choice-card outlines
// (2026-11-05), which superseded the PMO-authorised rows-0-1 cleanup (docs/49 section 2.7), and the
// owner's hand cleanup of the three font atlases (2026-11-06), with two glyph boxes widened to fit.
const CLEANED = ['choice_1line_a', 'choice_1line_b', 'choice_2line_a', 'choice_2line_b', 'choice_2line_c', 'choice_3line_b',
  'choice_3line_c', 'choice_4line_a', 'choice_4line_b', 'choice_4line_c'];
const FONT_EDIT = ['locked_pixel_font_atlas', 'locked_pixel_font_atlas_dark', 'locked_pixel_font_atlas_light'];
const OWNER_EDITED = CLEANED.concat(FONT_EDIT).sort();
const GLYPH_JSON = 'art/ui/sprites/fonts/locked_pixel_font_atlas.json';
const MAINTENANCE = CLEANED.map((n) => `art/ui/sprites/choice_cards/${n}.png`).concat(FONT_EDIT.map((n) => `art/ui/sprites/fonts/${n}.png`), [GLYPH_JSON,
  'art/ui/m1_approved_sprite_sheet.png', 'art/ui/m1_approved_sprite_sheet.json', 'art/ui/m1_approved_sprite_sheet.manifest.js',
  'tools/layout-lab/data/placement.default.json', 'tools/layout-lab/data/lab_data.js', 'tools/layout-lab/data/snapshot_assets.js',
  'tools/layout-lab/qa/fixtures/placement.qa_baseline.json', 'tools/layout-lab/js/core.js', 'tools/layout-lab/qa/run_qa.js',
  'tools/layout-lab/README.md']);

const content = require('../content/reception.js');
const Rules = require('../js/rules.js');
const sheet = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/ui/m1_approved_sprite_sheet.json')));
const actions = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/actions/actions.json')));
const labDefaults = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/layout-lab/data/placement.default.json')));

const results = [];
function check(browser, name, ok, detail) {
  results.push({ browser, name, ok: !!ok, detail: detail === undefined ? undefined : detail });
  if (!ok) console.log(`FAIL [${browser}] ${name}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 400));
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

// Static checks ------------------------------------------------------------------------------
function staticChecks() {
  const b = 'static';
  // M1 is untouched since M2 began, except the one maintenance change the PMO authorised in
  // docs/49 section 2.7: six choice cards lose their stray rows-0-1 pixels, with the atlas, manifest
  // and lab pins that follow from that. New M2 notes may be added under docs/.
  const protectedPaths = ['art', 'design', 'tools/layout-lab', 'README.md', 'docs'];
  const changedSinceStart = git('diff', '--name-only', '--diff-filter=MDRTC', START_SHA, '--', ...protectedPaths).split('\n').filter(Boolean);
  // The lab's own regenerated QA results and screenshots are output, not M1 source.
  const outside = changedSinceStart.filter((f) => !MAINTENANCE.includes(f) && !/^tools\/layout-lab\/qa\/(qa_results\.json|screenshots\/)/.test(f));
  check(b, 'M1 art, design, lab and docs are unchanged since M2 began, apart from the owner\'s card-outline edit', outside.length === 0, outside);
  // The owner's item-inspector column overlay (docs/45 section 7) is pinned by hash and used
  // directly by the reception inspector. Remaining unapproved art is drawn as DEV placeholders.
  const added = git('diff', '--name-only', '--diff-filter=A', START_SHA, '--', 'art', 'design', 'tools/layout-lab').split('\n').filter(Boolean);
  const unexpected = added.filter((f) => !(f in OWNER_ART));
  check(b, 'nothing was added to art/, design/ or the lab except the owner\'s pinned art', unexpected.length === 0, unexpected);
  const ownerArtBad = Object.keys(OWNER_ART).filter((f) => !fs.existsSync(path.join(ROOT, f)) || sha256(fs.readFileSync(path.join(ROOT, f))) !== OWNER_ART[f]);
  check(b, 'the owner\'s added art matches its pinned hash', ownerArtBad.length === 0, ownerArtBad);
  const working = git('status', '--porcelain', '--', ...protectedPaths).split('\n')
    .filter((l) => l && !/^\?\? docs\//.test(l) && !/tools\/layout-lab\/qa\/(qa_results\.json|screenshots\/)/.test(l)).join('\n');
  check(b, 'no uncommitted change to M1 art, design, lab or docs', working === '', working);
  const blobSha = (rev, f) => sha256(execFileSync('git', ['show', `${rev}:${f}`], { cwd: ROOT }));
  const cardFix = Object.keys(sheet.sprites).filter((n) => sheet.sprites[n].correction && sheet.sprites[n].correction.owner_edit);
  check(b, 'exactly the ten edited cards and three font atlases record an owner edit', cardFix.sort().join() === OWNER_EDITED.join(), cardFix);
  const before = OWNER_EDITED.filter((n) => {
    const e = sheet.sprites[n].correction.owner_edit;
    return e.sha256_before !== blobSha(START_SHA, 'art/ui/' + sheet.sprites[n].package_path) || e.sha256_after !== sheet.sprites[n].sha256;
  });
  check(b, 'each owner-edited sprite records its exact before- and after-hash', before.length === 0, before);
  const untouched = Object.keys(sheet.sprites).filter((n) => !OWNER_EDITED.includes(n)
    && sha256(fs.readFileSync(path.join(ROOT, 'art/ui', sheet.sprites[n].package_path))) !== blobSha(START_SHA, 'art/ui/' + sheet.sprites[n].package_path));
  check(b, 'the other 16 package sprites are byte-identical to the M2 start', untouched.length === 0, untouched);
  const glyphFile = sheet.data_files.find((d) => d.name === 'locked_pixel_font_atlas.json');
  check(b, 'glyph JSON matches its manifest hash and records the box fit against the M2 start',
    sha256(fs.readFileSync(path.join(ROOT, GLYPH_JSON))) === glyphFile.sha256 && glyphFile.correction.box_fit.sha256_before === blobSha(START_SHA, GLYPH_JSON)
    && glyphFile.correction.box_fit.sha256_after === glyphFile.sha256);
  const oldMap = JSON.parse(execFileSync('git', ['show', `${START_SHA}:${GLYPH_JSON}`], { cwd: ROOT })).mapping;
  const newMap = JSON.parse(fs.readFileSync(path.join(ROOT, GLYPH_JSON))).mapping;
  const boxChanged = Object.keys(newMap).filter((ch) => JSON.stringify(newMap[ch]) !== JSON.stringify(oldMap[ch]));
  check(b, 'only the colon and l glyph boxes changed, same characters and advances',
    boxChanged.sort().join('') === ':l' && Object.keys(newMap).join('') === Object.keys(oldMap).join('')
    && Object.keys(newMap).every((ch) => newMap[ch].advance === oldMap[ch].advance), boxChanged);
  check(b, 'shell SHA-256 unchanged', sha256(fs.readFileSync(path.join(ROOT, SHELL_PATH))) === SHELL_SHA256);
  const bad = Object.keys(sheet.sprites).filter((n) => sha256(fs.readFileSync(path.join(ROOT, 'art/ui', sheet.sprites[n].package_path))) !== sheet.sprites[n].sha256);
  check(b, 'all 29 approved package sprites match their manifest hashes', Object.keys(sheet.sprites).length === 29 && bad.length === 0, bad);
  check(b, 'approved atlas matches its manifest hash', sha256(fs.readFileSync(path.join(ROOT, 'art/ui', sheet.image))) === sheet.image_sha256);
  const glyphBad = [];
  Object.values(actions.actions).flat().forEach((a) => {
    if (sha256(fs.readFileSync(path.join(ROOT, 'art/actions', a.file))) !== a.sha256) glyphBad.push(a.file);
  });
  check(b, 'all action glyphs match actions.json hashes', glyphBad.length === 0, glyphBad);
  check(b, 'bathroom pass slot art is byte-identical to the M2 start commit',
    git('rev-parse', `${START_SHA}:${PASS_PATH}`) === git('hash-object', PASS_PATH));
  check(b, 'the locked geometry contract is unchanged', git('rev-parse', `${START_SHA}:design/ui_locked_component_contract_v1.json`)
    === git('hash-object', 'design/ui_locked_component_contract_v1.json'));
  const route = Rules.validate(content, Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'art/ui/sprites/fonts/locked_pixel_font_atlas.json'))).mapping));
  check(b, 'route validation passes', route.ok, route.errors);
  const css = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  check(b, 'the slice stylesheet has no :hover rule', !/:hover/.test(css));
  const js = ['stage.js', 'flow.js', 'main.js', 'pixeltext.js', 'placeholders.js'].map((f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8')).join('\n');
  check(b, 'presentation code holds no narrative text of its own', !/EXAMINER|BATHROOM|RECEPTIONIST:/.test(js.replace(/RECEPTIONIST PORTRAIT|THE RECEPTIONIST\.|RECEPTION SCENE|RECEPTION LOBBY[^']*|EXAMINERS DOOR BEHIND THE DESK/g, '')));
}

// Server ---------------------------------------------------------------------------------------
function startServer(requests) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.normalize(path.join(ROOT, rel));
    requests.push(rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Page helpers ---------------------------------------------------------------------------------
async function openGame(browser, base, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const bodies = {};
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('failed ' + r.url()));
  if (opts.hashes) {
    page.on('response', async (r) => {
      if (/\.png$/.test(r.url())) {
        try { bodies[new URL(r.url()).pathname.slice(1)] = sha256(await r.body()); } catch (e) { /* ignore */ }
      }
    });
  }
  await page.addInitScript(() => {
    window.__phases = [];
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(() => {
        const p = document.body.dataset.phase;
        const last = window.__phases[window.__phases.length - 1];
        if (!last || last.p !== p) window.__phases.push({ p, t: performance.now() });
      }).observe(document.body, { attributes: true, attributeFilter: ['data-phase'] });
    });
  });
  await page.goto(base + '/' + GAME_URL);
  await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 15000 });
  return { page, context, errors, bodies };
}

const phase = (page) => page.evaluate(() => document.body.dataset.phase);
const waitPhase = (page, p, timeout = 10000) => page.waitForFunction((x) => document.body.dataset.phase === x, p, { timeout });
const game = (page, fn, arg) => page.evaluate(fn, arg);

async function skipToChoices(page) {
  if ((await phase(page)) === 'typing') await page.click('#speechText');
  await waitPhase(page, 'choosing');
}

async function chooseById(page, id) {
  await skipToChoices(page);
  const index = await game(page, (x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), id);
  if (index < 0) throw new Error('choice not offered: ' + id + ' at ' + (await game(page, () => window.CYOA_GAME.state.node)));
  await game(page, (i) => window.CYOA_GAME.focusCard(i), index);
  await page.click(`#choiceViewport button[data-index="${index}"]`);
  await waitPhase(page, 'typing');
}

async function play(page, ids) {
  for (const id of ids) await chooseById(page, id);
}

async function shot(page, name, clip) {
  await page.screenshot({ path: path.join(SHOTS, name), clip });
}

async function restart(page) {
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready);
}

// Style snapshot for the hover rule: everything that would show a web-style hover.
async function lookOf(page, sel) {
  return page.$eval(sel, (e) => {
    const s = getComputedStyle(e);
    const own = ['outline-style', 'outline-width', 'outline-color', 'border-top-width', 'border-top-color', 'box-shadow', 'filter', 'background-color', 'background-image', 'opacity', 'transform']
      .map((k) => k + ':' + s.getPropertyValue(k)).join(';');
    const kids = Array.from(e.querySelectorAll('*')).map((k) => {
      const c = getComputedStyle(k);
      return [c.filter, c.opacity, c.transform, c.boxShadow, c.outlineStyle, c.left, c.top].join(',');
    }).join('|');
    return own + '#' + kids;
  });
}

// The suite ------------------------------------------------------------------------------------
async function suite(name, base, requests) {
  const browser = await playwright[name].launch();
  const c = (n, ok, d) => check(name, n, ok, d);
  const { page, context, errors, bodies } = await openGame(browser, base, { hashes: true });

  // Load, assets, geometry -----------------------------------------------------------------
  c('page loads ready', (await page.evaluate(() => document.body.dataset.ready)) === 'true');
  c('obsolete 364x78 font atlas is never requested', !requests.some((r) => /locked_pixel_font_atlas\.png$/.test(r)));
  c('neither the brass tab nor the RETURN glyph is ever requested', !requests.some((r) => /choice_marker_tab\.png$|\/return\.png$/.test(r)), requests.filter((r) => /marker|return/.test(r)));
  c('served shell bytes are canonical', bodies[SHELL_PATH] === SHELL_SHA256, bodies[SHELL_PATH]);
  const served = Object.keys(sheet.sprites).filter((n) => n !== 'locked_pixel_font_atlas' && bodies['art/ui/' + sheet.sprites[n].package_path]);
  const servedBad = served.filter((n) => bodies['art/ui/' + sheet.sprites[n].package_path] !== sheet.sprites[n].sha256);
  c('served package sprites match manifest hashes', served.length >= 20 && servedBad.length === 0, { served: served.length, servedBad });
  const glyphBad = ['inspect', 'notes', 'files'].filter((g) => bodies['art/actions/' + g + '.png'] !== actions.actions[g][0].sha256);
  c('served action glyphs match actions.json', glyphBad.length === 0, glyphBad);
  c('served bathroom pass bytes match the repository', bodies[PASS_PATH] === sha256(fs.readFileSync(path.join(ROOT, PASS_PATH))));
  const rect = (sel) => page.$eval(sel, (e) => [parseInt(e.style.left), parseInt(e.style.top), parseInt(e.style.width), parseInt(e.style.height)]);
  const vp = labDefaults.choices.viewport;
  c('choice viewport uses the lab working geometry', JSON.stringify(await rect('#choiceViewport')) === JSON.stringify([vp.x, vp.y, vp.width, vp.height]));
  const st = labDefaults.speech.text;
  c('dialogue box uses the lab working geometry', JSON.stringify(await rect('#speechText')) === JSON.stringify([st.x, st.y, st.width, st.height]));
  const ub = labDefaults.utility.buttons.map((u) => [u.x, u.y, u.displayWidth, u.displayHeight]);
  c('utility buttons use the lab working geometry', JSON.stringify(await Promise.all([0, 1, 2].map((i) => rect('#util-' + i)))) === JSON.stringify(ub));
  const measured = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/layout-lab/data/measured_shell_regions.json'))).regions;
  c('scene placeholder fills the scene aperture exactly', JSON.stringify(await rect('#scene')) === JSON.stringify(measured.sceneAperture.rect));
  c('portrait placeholder fills the portrait aperture exactly', JSON.stringify(await rect('#portrait')) === JSON.stringify(measured.portraitAperture.rect));
  c('scene and portrait sit beneath the shell, so no frame pixel is covered',
    await page.evaluate(() => {
      const kids = Array.from(document.getElementById('stage').children);
      const shell = kids.indexOf(document.getElementById('shell'));
      return kids.indexOf(document.getElementById('scene')) < shell && kids.indexOf(document.getElementById('portrait')) < shell;
    }));
  c('placeholders are labelled as placeholders', await page.evaluate(() => ['scene', 'portrait'].every((id) => /COMMISSIONED|PORTRAIT/.test(document.getElementById(id).dataset.placeholder))));
  const cleanup = await page.evaluate(async (pairs) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const px = (img) => { const c2 = document.createElement('canvas'); c2.width = img.width; c2.height = img.height; const x = c2.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data; };
    const out = [];
    for (const [name, oldUrl, newUrl] of pairs) {
      const a = px(await load(oldUrl));
      const b2 = px(await load(newUrl));
      const w = (await load(newUrl)).width;
      const h = (await load(newUrl)).height;
      let changed = 0;
      let parchment = 0;
      let deep = 0;
      let soft = 0;
      for (let i = 0; i < b2.length; i += 4) {
        if (b2[i + 3] !== 0 && b2[i + 3] !== 255) soft++;
        const same = a[i + 3] === 0 && b2[i + 3] === 0 ? true : a[i] === b2[i] && a[i + 1] === b2[i + 1] && a[i + 2] === b2[i + 2] && a[i + 3] === b2[i + 3];
        if (same) continue;
        changed++;
        const x = (i / 4) % w;
        const y = Math.floor(i / 4 / w);
        if (Math.min(x, w - 1 - x, y, h - 1 - y) > 8) deep++;
        // A change either removes a pixel or paints outline-dark; parchment is never repainted.
        if (b2[i + 3] !== 0 && Math.max(b2[i], b2[i + 1], b2[i + 2]) > 96) parchment++;
      }
      out.push({ name, changed, parchment, deep, soft });
    }
    return out;
  }, CLEANED.map((n) => [n, 'data:image/png;base64,' + execFileSync('git', ['show', `${START_SHA}:art/ui/sprites/choice_cards/${n}.png`], { cwd: ROOT }).toString('base64'),
    '/art/ui/sprites/choice_cards/' + n + '.png']));
  c('card edit: each of the ten cards visibly changed', cleanup.every((k) => k.changed > 0), cleanup);
  c('card edit: changes stay on the outline, within 8px of the card edge', cleanup.every((k) => k.deep === 0), cleanup);
  c('card edit: every change removes a pixel or paints it outline-dark; no parchment pixel repainted', cleanup.every((k) => k.parchment === 0), cleanup);
  c('card edit: no soft (partial-alpha) pixels', cleanup.every((k) => k.soft === 0), cleanup);
  // The owner's font cleanup: one ink colour, hard alpha, identical dark/light shapes, and every
  // inked pixel inside its glyph box, so the renderer never clips part of a letter.
  const fontCheck = await page.evaluate(async (mapping) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const px = (img) => { const c2 = document.createElement('canvas'); c2.width = img.width; c2.height = img.height; const x = c2.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data; };
    const boxes = Object.values(mapping);
    const out = {};
    const masks = {};
    for (const face of ['dark', 'light']) {
      const img = await load('/art/ui/sprites/fonts/locked_pixel_font_atlas_' + face + '.png');
      const d = px(img);
      const inks = new Set();
      let soft = 0;
      let outside = 0;
      const mask = [];
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) { mask.push(0); continue; }
        mask.push(1);
        if (d[i + 3] !== 255) soft++;
        inks.add([d[i], d[i + 1], d[i + 2]].join());
        const x = (i / 4) % img.width;
        const y = Math.floor(i / 4 / img.width);
        if (!boxes.some((g) => x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h)) outside++;
      }
      masks[face] = mask.join('');
      out[face] = { inks: Array.from(inks), soft, outside };
    }
    out.sameShape = masks.dark === masks.light;
    return out;
  }, JSON.parse(fs.readFileSync(path.join(ROOT, GLYPH_JSON))).mapping);
  c('font edit: one ink colour per atlas (#203037 dark, #f1d898 light), no soft alpha',
    fontCheck.dark.inks.join('|') === '32,48,55' && fontCheck.light.inks.join('|') === '241,216,152' && fontCheck.dark.soft + fontCheck.light.soft === 0, fontCheck);
  c('font edit: dark and light atlases carry identical glyph shapes', fontCheck.sameShape);
  c('font edit: every inked pixel lies inside its glyph box', fontCheck.dark.outside + fontCheck.light.outside === 0, fontCheck);
  c('pixel art renders without smoothing', await page.evaluate(() => Array.from(document.querySelectorAll('#stage img, #stage canvas'))
    .every((e) => /pixelated|crisp-edges/.test(getComputedStyle(e).imageRendering))));
  c('utility buttons show the owner\'s glyphs in conversation', JSON.stringify(await page.$$eval('.utility', (bs) => bs.map((b) => b.dataset.action)))
    === JSON.stringify(['inspect', 'notes', 'files']));

  // With nothing held, INSPECT keeps its glyph, unlit, does not press, and says why.
  c('INSPECT is inactive while nothing is held', (await page.$eval('#util-0', (b) => [b.dataset.glyph, b.getAttribute('aria-disabled')].join())) === 'inactive,true');
  c('an inactive button keeps its glyph, in the inactive treatment', await page.$eval('#util-0', (b) => b.querySelector('img.glyph').style.display === 'none'
    && b.querySelector('canvas.glyph').style.display !== 'none' && b.querySelector('canvas.glyph').width === 96));
  await page.hover('#util-0');
  c('the inactive button\'s tooltip says why', (await page.$eval('#tooltip', (t) => t.dataset.text)) === 'INSPECT - NO ITEMS');
  await page.mouse.down();
  c('an inactive button does not press', (await page.$eval('#util-0', (b) => b.dataset.state)) === 'up');
  await page.mouse.up();
  await page.mouse.move(600, 400);

  // Every authored card fits the four card sizes.
  const tooLong = await game(page, (all) => all.filter((t) => window.CYOA_GAME.layoutCards([{ id: 'x', text: t }])[0].overflowLines > 0),
    Object.values(content.nodes).flatMap((n) => n.choices.map((ch) => ch.text)));
  c('every authored choice fits on a card (four lines at most)', tooLong.length === 0, tooLong);

  // Opening turn: typewriter, beat, arrival ---------------------------------------------------
  c('the slice opens with the receptionist typing', (await phase(page)) === 'typing' && (await page.$eval('#speechText', (e) => e.dataset.typing)) === 'true');
  c('no choice is on show while the NPC types', (await page.$$eval('#choiceViewport .choice', (bs) => bs.filter((b) => b.style.display !== 'none').length)) === 0);
  const r0 = await game(page, () => window.CYOA_GAME.ui.speech.revealed);
  await page.waitForTimeout(300);
  const r1 = await game(page, () => window.CYOA_GAME.ui.speech.revealed);
  c('the NPC line types character by character', r1 > r0 && r1 < (await game(page, () => window.CYOA_GAME.ui.speech.lines.reduce((n, l) => n + l.text.length, 0))), { r0, r1 });
  await shot(page, '01_opening_typing.png');
  await waitPhase(page, 'choosing', 15000);
  const log = await page.evaluate(() => window.__phases.map((x) => x.p));
  c('turn order: typing, beat, cards arrive, then choosing', log.slice(-4).join() === 'typing,beat,arriving,choosing', log);
  const times = await page.evaluate(() => window.__phases.slice(-4).map((x) => x.t));
  c('a short beat (150-350ms) between the line and the cards', times[2] - times[1] >= 150 && times[2] - times[1] <= 350, times[2] - times[1]);
  c('keyboard focus lands on the first choice', await page.evaluate(() => document.activeElement && document.activeElement.dataset.index === '0'));
  c('the thumb appears once the cards have arrived', await page.$eval('#choiceThumb', (e) => e.style.display !== 'none'));
  c('opening offers the bathroom request', (await game(page, () => window.CYOA_GAME.ui.cards.map((x) => x.id))).includes('ask-politely'));
  c('no hidden pointer target: cards are real buttons', (await page.$$eval('#choiceViewport .choice', (bs) => bs.filter((b) => b.tagName === 'BUTTON').length)) >= 2);

  // Keyboard navigation and send ------------------------------------------------------------
  await page.keyboard.press('ArrowDown');
  c('ArrowDown moves focus to the next choice', await page.evaluate(() => document.activeElement.dataset.index === '1'));
  await page.keyboard.press('ArrowUp');
  c('ArrowUp moves focus back', await page.evaluate(() => document.activeElement.dataset.index === '0'));
  await page.waitForTimeout(200);
  // Owner ruling after the playtest (docs/53): no brass tab, and nothing else in its place.
  const noMarker = () => page.evaluate(() => ({
    els: document.querySelectorAll('#stage .marker-clip, #stage .card-marker, #stage img[src*="choice_marker_tab"]').length,
    attrs: Array.from(document.querySelectorAll('#choiceViewport .choice')).filter((b) => 'marker' in b.dataset).length
  }));
  const focusLook = await page.evaluate(() => {
    const b = document.activeElement;
    const text = b.querySelector('.card-text');
    const st = getComputedStyle(b);
    return { outline: st.outlineStyle, shadow: st.boxShadow, filter: st.filter, bg: st.backgroundColor, w: b.style.width, kids: b.children.length,
      textLeft: text.style.left, textTransform: getComputedStyle(text).transform };
  });
  const marker = await noMarker();
  c('keyboard focus shows no brass tab or any marker element', marker.els === 0 && marker.attrs === 0, marker);
  c('keyboard focus adds no outline, shadow, filter, fill, shift or extra element', focusLook.outline === 'none' && focusLook.shadow === 'none'
    && focusLook.filter === 'none' && focusLook.bg === 'rgba(0, 0, 0, 0)' && focusLook.kids === 2 && focusLook.w === labDefaults.choices.cardWidth + 'px'
    && focusLook.textLeft === labDefaults.choices.text.offsetX + 'px' && focusLook.textTransform === 'none', focusLook);
  await page.hover('#choiceViewport .choice[data-index="1"]');
  await page.waitForTimeout(150);
  c('mouse hover over another card brings out no marker', (await noMarker()).els === 0);
  // Sample every frame of the send in the page itself.
  await page.evaluate(() => {
    window.__send = [];
    const t0 = performance.now();
    (function loop() {
      const row = Array.from(document.querySelectorAll('#choiceViewport .choice')).map((b) => [b.style.display, parseInt(b.style.left), parseInt(b.style.top)]);
      window.__send.push({ t: performance.now() - t0, p: document.body.dataset.phase, row });
      if (performance.now() - t0 < 1500) requestAnimationFrame(loop);
    })();
  });
  const sendStart = await page.evaluate(() => performance.now());
  await page.keyboard.press('Enter');
  await waitPhase(page, 'sending', 2000);
  // Rapid input while cards move: every further click and key is ignored.
  const before = await game(page, () => window.CYOA_GAME.state.transcript.length);
  for (let i = 0; i < 6; i++) await page.mouse.click(1600, 640);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  await shot(page, '02_send_in_flight.png');
  await waitPhase(page, 'reply-beat', 3000);
  const allFrames = await page.evaluate(() => window.__send);
  const frames = allFrames.filter((f) => f.p === 'sending').map((f) => f.row);
  c('the other card slides away to the right', frames.some((f) => f[1] && f[1][0] !== 'none' && f[1][1] > 0) && frames.some((f) => f[1] && f[1][0] === 'none'), frames.length);
  c('the chosen card rises until it disappears behind the divider', frames.some((f) => f[0][0] !== 'none' && f[0][2] < 0) && allFrames[allFrames.length - 1].row[0][0] === 'none', frames.map((f) => f[0][2]));
  c('the chosen card waits for the others before it rises', frames.slice(0, 3).every((f) => f[0][2] === 0));
  const atBeat = await game(page, () => {
    const s = window.CYOA_GAME.ui.speech;
    return { last: s.parts[s.parts.length - 1], typing: s.typing, cards: window.CYOA_GAME.ui.cards.length,
      whole: s.revealed === s.lines.reduce((n, l) => n + l.text.length, 0) };
  });
  c('the player\'s line is shown whole, not typed', atBeat.whole && !atBeat.typing, atBeat);
  c('the player\'s line is in the dialogue box at once, in the Choices face', atBeat.last.role === 'choices' && atBeat.last.text === 'WHERE IS THE BATHROOM, PLEASE?', atBeat.last);
  c('the choice panel is empty while waiting for the reply', atBeat.cards === 0);
  c('input during the send was ignored (one player line only)', (await game(page, () => window.CYOA_GAME.state.transcript.length)) === before);
  const beatStart = await page.evaluate(() => window.__phases[window.__phases.length - 1].t);
  await shot(page, '03_player_line_before_reply.png');
  await waitPhase(page, 'typing', 3000);
  const beatEnd = await page.evaluate(() => window.__phases[window.__phases.length - 1].t);
  c('a beat (about 400ms) before the reply types', beatEnd - beatStart >= 350 && beatEnd - beatStart <= 700, beatEnd - beatStart);
  const reply = await game(page, () => window.CYOA_GAME.ui.speech.parts.slice(-1)[0]);
  c('the reply types below in the Dialogue face', reply.role === 'dialogue' && /EXAMINER/.test(reply.text), reply);
  c('the whole send took a sensible time', beatEnd - sendStart < 2500, beatEnd - sendStart);

  // Skip typing ---------------------------------------------------------------------------
  await page.click('#speechText');
  c('clicking the dialogue finishes the line at once', (await page.$eval('#speechText', (e) => e.dataset.typing)) === 'false'
    && (await game(page, () => { const s = window.CYOA_GAME.ui.speech; return s.revealed === s.lines.reduce((n, l) => n + l.text.length, 0); })));
  c('after a skip, the cards follow after the beat (not at once)', ['beat', 'arriving'].includes(await phase(page)));
  // Rapid input while cards arrive.
  const nodeBefore = await game(page, () => window.CYOA_GAME.state.node);
  await page.waitForFunction(() => document.body.dataset.phase === 'arriving');
  c('the thumb stays hidden while cards arrive', await page.$eval('#choiceThumb', (e) => e.style.display === 'none'));
  for (let i = 0; i < 5; i++) await page.mouse.click(1600, 560);
  c('clicks on arriving cards are ignored', (await game(page, () => window.CYOA_GAME.state.node)) === nodeBefore
    && (await game(page, () => window.CYOA_GAME.state.transcript.length)) === before + 1);
  await waitPhase(page, 'choosing');

  // Choice overflow, independence from speech overflow, reset to top -------------------------
  const ov = await game(page, () => ({ max: window.CYOA_GAME.choiceMaxScroll(), thumb: window.CYOA_GAME.thumbMetrics() }));
  c('the misassignment\'s three choices overflow the box', ov.max > 0 && ov.thumb.overflow, ov);
  await shot(page, '04_choices_overflow_and_history.png');
  const speechScroll0 = await game(page, () => window.CYOA_GAME.ui.speech.scrollLine);
  await page.mouse.move(1600, 700);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(50);
  const afterWheel = await game(page, () => ({ c: window.CYOA_GAME.ui.choiceScroll, s: window.CYOA_GAME.ui.speech.scrollLine }));
  c('the wheel scrolls the choices', afterWheel.c > 0, afterWheel);
  c('scrolling choices leaves the dialogue where it was', afterWheel.s === speechScroll0, afterWheel);
  const thumbMoved = await game(page, () => window.CYOA_GAME.thumbMetrics().y);
  c('the thumb tracks the choice scroll', thumbMoved > labDefaults.scrollbar.track.y, thumbMoved);
  await page.mouse.move(1600, 420);
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -100);
  await page.waitForTimeout(50);
  const afterSpeech = await game(page, () => ({ c: window.CYOA_GAME.ui.choiceScroll, s: window.CYOA_GAME.ui.speech.scrollLine }));
  c('dialogue scroll-back reaches the first line', afterSpeech.s === 0, afterSpeech);
  c('scrolling the dialogue leaves the choices where they were', afterSpeech.c === afterWheel.c, afterSpeech);
  await shot(page, '05_dialogue_scrolled_back.png');
  // Keyboard reaches an overflowed card and scrolls to it.
  await game(page, () => window.CYOA_GAME.focusCard(0));
  await page.keyboard.press('End');
  const endState = await game(page, () => ({ idx: document.activeElement.dataset.index, scroll: window.CYOA_GAME.ui.choiceScroll, max: window.CYOA_GAME.choiceMaxScroll() }));
  c('End focuses the last card and scrolls it into view', endState.idx === '2' && endState.scroll === endState.max, endState);
  await page.keyboard.press('Enter');
  await waitPhase(page, 'typing');
  await page.click('#speechText');
  await waitPhase(page, 'choosing');
  c('a new choice set starts at the top', (await game(page, () => window.CYOA_GAME.ui.choiceScroll)) === 0);
  c('the third card took the practical route', (await game(page, () => window.CYOA_GAME.state.flags.approach)) === 'practical');
  c('a single choice still arrives as a card', (await game(page, () => window.CYOA_GAME.ui.cards.length)) === 1);

  // Item: issued, inspected, read, shown ------------------------------------------------------
  c('no item-received slip before any item is granted', (await page.$eval('#itemNotice', (e) => e.style.display)) === 'none'
    && (await game(page, () => window.CYOA_GAME.ui.noticeLog.length)) === 0);
  await chooseById(page, 'ask-key');
  c('the key enters the inventory when the receptionist issues it', JSON.stringify(await game(page, () => window.CYOA_GAME.state.inventory)) === '["wc_key"]');
  const notice = await page.$eval('#itemNotice', (e) => ({ shown: e.style.display !== 'none', item: e.dataset.item, text: e.dataset.text, label: e.getAttribute('aria-label'),
    role: e.getAttribute('role'), live: e.getAttribute('aria-live'), x: parseInt(e.style.left), y: parseInt(e.style.top), w: parseInt(e.style.width), h: parseInt(e.style.height) }));
  c('an item-received slip appears the moment the key is granted', notice.shown && notice.item === 'wc_key' && (await phase(page)) === 'typing', notice);
  c('the slip names the item: ITEM RECEIVED: FACILITIES KEY', notice.text === 'ITEM RECEIVED: FACILITIES KEY' && notice.label === notice.text
    && notice.role === 'status' && notice.live === 'polite', notice);
  const sceneRect = measured.sceneAperture.rect;
  const overlaps = await page.evaluate((n) => ['#choiceViewport', '#speechText', '#invWindow', '#layer-utility .utility'].filter((sel) => Array.from(document.querySelectorAll(sel)).some((e) => {
    const r = e.getBoundingClientRect();
    const s = document.getElementById('stage').getBoundingClientRect();
    const k = 1920 / s.width;
    const x = (r.left - s.left) * k; const y = (r.top - s.top) * k; const w = r.width * k; const h = r.height * k;
    return x < n.x + n.w && n.x < x + w && y < n.y + n.h && n.y < y + h;
  })), notice);
  c('the slip sits inside the scene window, clear of the dialogue, choices, inventory and buttons',
    notice.x >= sceneRect[0] && notice.y >= sceneRect[1] && notice.x + notice.w <= sceneRect[0] + sceneRect[2] && notice.y + notice.h <= sceneRect[1] + sceneRect[3]
    && overlaps.length === 0, overlaps);
  const slip = await page.evaluate(() => {
    const cv = document.querySelector('#itemNotice canvas');
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let soft = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0 && d[i] !== 255) soft++;
    const icon = cv.getContext('2d').getImageData(10, 10, 96, 96).data;
    let iconInk = 0;
    for (let i = 0; i < icon.length; i += 4) if (icon[i] < 150 && icon[i + 3] === 255) iconInk++;
    return { soft, iconInk, w: cv.width, h: cv.height, smoothing: getComputedStyle(cv).imageRendering };
  });
  c('the slip carries the item\'s slot art, drawn crisp at 1:1 with hard alpha', slip.soft === 0 && slip.iconInk > 200 && slip.w === notice.w && /pixelated|crisp-edges/.test(slip.smoothing), slip);
  await shot(page, '05b_item_received.png');
  await page.click('#itemNotice');
  c('clicking the slip dismisses it early', (await page.$eval('#itemNotice', (e) => e.style.display)) === 'none' && !(await game(page, () => window.CYOA_GAME.ui.notice)));
  c('the slot shows the approved bathroom pass art', await page.$eval('#invWindow .slot[data-item="wc_key"] img.item-art', (i) => /bathroom_pass_slot\.png$/.test(i.src) && i.naturalWidth === 96));
  await page.click('#invWindow .slot[data-item="wc_key"]');
  c('the inventory is ignored while the NPC is typing', !(await game(page, () => window.CYOA_GAME.ui.inspector)));
  await skipToChoices(page);
  await page.waitForTimeout(150);
  c('focus that follows a mouse action shows no marker', await page.evaluate(() => document.activeElement.dataset.index === '0') && (await noMarker()).els === 0);
  c('before reading: only the blind confirmation is offered', JSON.stringify(await game(page, () => window.CYOA_GAME.ui.cards.map((x) => x.id))) === '["confirm-unread"]');
  await page.click('#invWindow .slot[data-item="wc_key"]');
  const insp = await game(page, () => ({ open: !!window.CYOA_GAME.ui.inspector, acts: window.CYOA_GAME.utilityActions().map((a) => a.action + ':' + a.enabled) }));
  c('clicking the item opens the inspector', insp.open);
  c('the buttons become READ, SHOW (disabled) and a blank; RETURN is gone', JSON.stringify(insp.acts) === '["read:true","show:false","none:false"]', insp.acts);
  const blank = await page.$eval('#util-2', (b) => ({ glyph: b.dataset.glyph, on: b.querySelector('img.glyph').style.display, off: b.querySelector('canvas.glyph').style.display,
    tab: b.tabIndex, disabled: b.getAttribute('aria-disabled'), action: b.dataset.action }));
  c('the third button is bare: no glyph, not focusable, inactive', blank.glyph === 'none' && blank.on === 'none' && blank.off === 'none' && blank.tab === -1
    && blank.disabled === 'true' && blank.action === 'none', blank);
  await page.hover('#util-2');
  c('the bare button shows no tooltip', (await page.$eval('#tooltip', (t) => t.style.display)) === 'none');
  await page.click('#util-2', { force: true });
  c('the bare button neither presses nor closes the item', (await page.$eval('#util-2', (b) => b.dataset.state)) === 'up' && !!(await game(page, () => window.CYOA_GAME.ui.inspector)));
  await page.mouse.move(600, 400);
  const ink = await page.evaluate(() => {
    const cv = document.getElementById('inspectText');
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    const seen = {};
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) seen[[d[i], d[i + 1], d[i + 2], d[i + 3]].join()] = (seen[[d[i], d[i + 1], d[i + 2], d[i + 3]].join()] || 0) + 1;
    return seen;
  });
  c('the item name and description are in dark ink (#203037), hard-edged, nothing light', Object.keys(ink).length === 1 && Object.keys(ink)[0] === '32,48,55,255', ink);
  c('the unavailable SHOW keeps its glyph, unlit', await page.$eval('#util-1', (b) => b.dataset.glyph === 'inactive'
    && b.querySelector('img.glyph').style.display === 'none' && b.querySelector('canvas.glyph').style.display !== 'none'));
  c('the choice cards give way to the item text', (await page.$$eval('#choiceViewport .choice', (bs) => bs.filter((b) => b.style.display !== 'none').length)) === 0
    && (await page.$eval('#inspectText', (e) => e.style.display !== 'none')));
  c('the owner item-column overlay replaces the portrait/dialogue shell in inspector mode, drawn over the inspect art', await page.evaluate(() => {
    const col = document.getElementById('inspectColumn');
    const art = document.getElementById('inspectArt');
    return col && col.tagName === 'IMG'
      && /art\/ui\/shell\/item-overlay\.png$/.test(col.getAttribute('src'))
      && parseInt(col.style.left) === 0 && parseInt(col.style.top) === 0
      && parseInt(col.style.width) === 1920 && parseInt(col.style.height) === 1080
      && art.style.display !== 'none'
      && parseInt(art.style.left) === 1331 && parseInt(art.style.top) === 50
      && parseInt(art.style.width) === 565 && parseInt(art.style.height) === 451
      && (art.compareDocumentPosition(col) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      && document.getElementById('inspectClose').offsetWidth === 44;
  }));
  c('the item is marked inspected', (await game(page, () => window.CYOA_GAME.state.items.wc_key)).includes('inspected'));
  await shot(page, '06_inspector_before_read.png');
  await page.hover('#util-1');
  c('a disabled button explains itself in its tooltip', (await page.$eval('#tooltip', (t) => t.style.display !== 'none' && t.dataset.text)) === 'SHOW - NOT AVAILABLE HERE');
  await page.click('#util-1', { force: true }); // aria-disabled: Playwright would otherwise refuse
  c('pressing the disabled button does not press', (await page.$eval('#util-1', (b) => b.dataset.state)) === 'up');
  c('pressing the disabled button does nothing', (await phase(page)) === 'choosing' && !!(await game(page, () => window.CYOA_GAME.ui.inspector)));
  await page.click('#util-0');
  c('READ reveals the tag', /4:52/.test(await page.$eval('#inspectText', (e) => e.dataset.key)));
  c('after READ, SHOW is enabled here', (await game(page, () => window.CYOA_GAME.utilityActions()[1])).enabled === true);
  await shot(page, '07_inspector_after_read.png');
  await page.keyboard.press('Escape');
  await waitPhase(page, 'choosing');
  c('closing the inspector brings a new set reflecting the tag', JSON.stringify(await game(page, () => window.CYOA_GAME.ui.cards.map((x) => x.id))) === '["confirm-read","question-tag"]');
  await shot(page, '08_choices_changed_by_item.png');
  // Re-open with INSPECT, close with X, then SHOW.
  await page.click('#util-0');
  c('INSPECT opens the held item', (await game(page, () => window.CYOA_GAME.ui.inspector && window.CYOA_GAME.ui.inspector.id)) === 'wc_key');
  await page.click('#inspectClose');
  c('the X closes the inspector', !(await game(page, () => window.CYOA_GAME.ui.inspector)));
  const isOpen = () => game(page, () => !!window.CYOA_GAME.ui.inspector);
  await page.click('#invWindow .slot[data-item="wc_key"]');
  const open1 = await isOpen();
  await page.click('#invWindow .slot[data-item="wc_key"]');
  const closed1 = !(await isOpen());
  await page.click('#invWindow .slot[data-item="wc_key"]');
  c('clicking the inspected item again closes it, and again reopens it', open1 && closed1 && (await isOpen()), { open1, closed1 });
  const transcriptBeforeShow = await game(page, () => window.CYOA_GAME.state.transcript.length);
  await page.click('#util-1');
  await waitPhase(page, 'reply-beat', 3000);
  c('SHOW speaks the player\'s line as a turn', (await game(page, () => window.CYOA_GAME.ui.speech.parts.slice(-1)[0].text)) === '[HOLD UP THE TAG.] THIS SAYS I ALREADY RETURNED THE KEY. AT 4:52.');
  await waitPhase(page, 'typing');
  c('SHOW leads to the receptionist\'s answer about the tag', (await game(page, () => window.CYOA_GAME.state.node)) === 'tag_question'
    && (await game(page, () => window.CYOA_GAME.state.transcript.length)) === transcriptBeforeShow + 2);
  await play(page, ['onward-tag']);
  await skipToChoices(page);
  c('the practical route gets its own send-off line', /PLEASE DO NOT CONFUSE THEM/.test(await game(page, () => window.CYOA_GAME.ui.speech.parts.slice(-1)[0].text)));
  await page.click('#invWindow .slot[data-item="wc_key"]');
  c('at the door the middle button becomes USE', (await game(page, () => window.CYOA_GAME.utilityActions()[1].action)) === 'use');
  await page.click('#util-1');
  await waitPhase(page, 'typing');
  c('USE on the key opens the door', (await game(page, () => window.CYOA_GAME.state.node)) === 'door');
  c('the closing line remembers the tag', /ACCORDING TO THE RECORD YOU ALREADY HAVE/.test(await game(page, () => window.CYOA_GAME.ui.speech.parts.slice(-1)[0].text)));
  c('INSPECT, READ, SHOW and USE never re-announce the key', JSON.stringify(await game(page, () => window.CYOA_GAME.ui.noticeLog)) === '["wc_key"]'
    && (await page.$eval('#itemNotice', (e) => e.style.display)) === 'none');
  // The slip goes by itself: time one through the same path a grant takes.
  const timed = await page.evaluate(() => new Promise((res) => {
    const G = window.CYOA_GAME;
    const t0 = performance.now();
    G.notifyItem('wc_key');
    const shown = document.getElementById('itemNotice').style.display !== 'none';
    (function poll() {
      if (document.getElementById('itemNotice').style.display === 'none') return res({ shown, ms: Math.round(performance.now() - t0) });
      if (performance.now() - t0 > 8000) return res({ shown, ms: -1 });
      requestAnimationFrame(poll);
    })();
  }));
  c('an unclicked slip dismisses itself after about 3.6 s', timed.shown && timed.ms >= 3500 && timed.ms < 4500, timed);

  // Transcript: NOTES and FILES ---------------------------------------------------------------
  await page.click('#util-1');
  c('NOTES opens the transcript over the scene', (await page.$eval('#overlay', (e) => e.style.display !== 'none')) && (await page.$eval('#overlay canvas', (c2) => c2.dataset.kind)) === 'notes');
  const notesText = await page.$eval('#overlay canvas', (c2) => c2.dataset.text);
  c('the transcript holds both speakers\' lines', /YOU:/.test(notesText) && /RECEPTIONIST:/.test(notesText) && /WHERE IS THE BATHROOM, PLEASE\?/.test(notesText));
  c('the transcript opens at its latest lines', (await page.$eval('#overlay canvas', (c2) => c2.dataset.scroll)) === String(await game(page, () => window.CYOA_GAME.overlayMaxScroll())));
  await page.mouse.move(600, 400);
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -100);
  await page.waitForTimeout(50);
  c('the transcript scrolls back to the start', (await page.$eval('#overlay canvas', (c2) => c2.dataset.scroll)) === '0');
  await shot(page, '09_notes_transcript.png');
  await page.click('#util-2');
  c('FILES shows the case file', (await page.$eval('#overlay canvas', (c2) => c2.dataset.kind)) === 'files'
    && /APPOINTMENT: EXAMINER/.test(await page.$eval('#overlay canvas', (c2) => c2.dataset.text))
    && /RETURNED AT 4:52/.test(await page.$eval('#overlay canvas', (c2) => c2.dataset.text)));
  await shot(page, '10_files_case_file.png');
  await page.keyboard.press('Escape');
  c('Esc closes the overlay', await page.$eval('#overlay', (e) => e.style.display === 'none'));
  c('the conversation carried on underneath', ['typing', 'beat', 'arriving', 'choosing'].includes(await phase(page)));

  // Ending and restart ---------------------------------------------------------------------
  await play(page, ['enter-corridor']);
  await skipToChoices(page);
  c('the ending offers one card: BEGIN AGAIN', JSON.stringify(await game(page, () => window.CYOA_GAME.ui.cards.map((x) => x.text))) === '["BEGIN AGAIN."]');
  c('the ending objective points beyond reception', /ROOM FOUR/.test(await page.$eval('#objectiveBody', (e) => e.dataset.text)));
  await shot(page, '11_ending.png');
  await chooseById(page, 'restart');
  c('BEGIN AGAIN restarts the slice cleanly', (await game(page, () => window.CYOA_GAME.state.node)) === 'opening'
    && (await game(page, () => window.CYOA_GAME.state.transcript.length)) === 1
    && (await game(page, () => window.CYOA_GAME.state.inventory.length)) === 0
    && (await game(page, () => window.CYOA_GAME.ui.speech.parts.length)) === 1);

  // Replay: a materially different consequence -------------------------------------------------
  await play(page, ['ask-politely', 'correct', 'rule', 'sigh', 'ask-key', 'confirm-unread', 'onward-blind']);
  await skipToChoices(page);
  const disputedLine = await game(page, () => window.CYOA_GAME.ui.speech.parts.slice(-1)[0].text);
  c('replay: correcting the mistake changes the later send-off', /YOUR DISPUTE IS ALREADY ON THE DESK/.test(disputedLine), disputedLine);
  c('replay: a blind confirmation gets its own answer', (await game(page, () => window.CYOA_GAME.state.transcript.map((t) => t.text).join('\n'))).includes('NOBODY EVER READS THE TAG'));
  c('replay: protest is offered (not yet used)', (await game(page, () => window.CYOA_GAME.ui.cards.map((x) => x.id))).includes('protest'));
  await shot(page, '12_send_off_after_dispute.png');
  await play(page, ['protest', 'to-door', 'unlock-after']);
  await skipToChoices(page);
  c('replay: without the tag, the closing line differs', /YOU HAVE ALWAYS BEEN HERE/.test(await game(page, () => window.CYOA_GAME.ui.speech.parts.slice(-1)[0].text)));

  // Inventory: one item per press, with weight ------------------------------------------------
  await game(page, () => window.CYOA_GAME.debug.addItems(8));
  const invCount = await game(page, () => window.CYOA_GAME.state.inventory.length);
  c('QA overflow items fill the inventory past one row', invCount === 9, invCount);
  const firstShown = () => page.$$eval('#invWindow .slot', (ss) => ss.filter((s) => s.style.display !== 'none').map((s) => [Number(s.dataset.index), parseInt(s.style.left)]));
  await page.mouse.move(805, 982);
  await page.mouse.down();
  c('the right arrow presses (DOWN sprite) while held', (await page.$eval('#inv-right', (b) => b.dataset.state)) === 'down');
  await page.mouse.up();
  c('the right arrow comes back up', (await page.$eval('#inv-right', (b) => b.dataset.state)) === 'up');
  c('one press moves the strip by exactly one item', (await game(page, () => window.CYOA_GAME.ui.inv.start)) === 1);
  const slideFrames = [];
  for (let i = 0; i < 6; i++) { slideFrames.push(await firstShown()); await page.waitForTimeout(30); }
  await page.waitForTimeout(400);
  const rest = await firstShown();
  c('the strip slides rather than jumping', slideFrames.some((f) => JSON.stringify(f) !== JSON.stringify(rest)), { first: slideFrames[0], rest });
  c('at rest, six slots show items 2-7', rest.length === 6 && rest[0][0] === 1 && rest[5][0] === 6, rest);
  await page.click('#inv-left');
  await page.waitForTimeout(400);
  c('the left arrow steps back one item', (await game(page, () => window.CYOA_GAME.ui.inv.start)) === 0);
  for (let i = 0; i < 10; i++) await page.click('#inv-right');
  c('the strip stops at the last item', (await game(page, () => window.CYOA_GAME.ui.inv.start)) === 3);
  await page.waitForTimeout(400);
  await shot(page, '13_inventory_overflow_qa_items.png', { x: 0, y: 900, width: 860, height: 180 });
  // INSPECT acts on the selected item, never on whichever slot happens to be leftmost.
  const sel0 = await game(page, () => [window.CYOA_GAME.selectedItem(), window.CYOA_GAME.ui.selected, document.activeElement.outerHTML.slice(0, 80)]);
  c('with several items and none selected, INSPECT is inactive', (await page.$eval('#util-0', (b) => b.dataset.glyph)) === 'inactive'
    && sel0[0] === null, sel0);
  await page.focus('#invWindow .slot[data-index="6"]');
  const focusedItem = await page.$eval('#invWindow .slot[data-index="6"]', (sl) => sl.dataset.item);
  c('focusing a slot selects its item', (await game(page, () => window.CYOA_GAME.selectedItem())) === focusedItem && (await page.$eval('#util-0', (b) => b.dataset.glyph)) === 'on');
  await page.click('#util-0');
  c('INSPECT opens the selected item, not the leftmost one', (await game(page, () => window.CYOA_GAME.ui.inspector && window.CYOA_GAME.ui.inspector.id)) === focusedItem
    && focusedItem !== (await page.$eval('#invWindow .slot[data-index="3"]', (sl) => sl.dataset.item)), focusedItem);
  await page.keyboard.press('Escape');
  await page.click('#invWindow .slot[data-index="4"]');
  const clickedItem = await page.$eval('#invWindow .slot[data-index="4"]', (sl) => sl.dataset.item);
  c('clicking a slot selects and opens its item', (await game(page, () => window.CYOA_GAME.ui.inspector.id)) === clickedItem && (await game(page, () => window.CYOA_GAME.selectedItem())) === clickedItem);
  await page.keyboard.press('Escape');
  await page.click('#util-0');
  c('INSPECT then reopens the last selected item', (await game(page, () => window.CYOA_GAME.ui.inspector.id)) === clickedItem);
  c('an item with nothing to read shows READ unlit', (await page.$eval('#util-0', (b) => b.dataset.glyph)) === 'inactive');
  await page.keyboard.press('Escape');

  // Hover never changes a control ------------------------------------------------------------
  const hoverTargets = ['#util-0', '#util-1', '#util-2', '#inv-left', '#inv-right', '#invWindow .slot[data-index="4"]', '#choiceViewport .choice[data-index="0"]'];
  await page.mouse.move(600, 400);
  const changed = [];
  const decorated = [];
  for (const sel of hoverTargets) {
    const box = await page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }; });
    const idleLook = await lookOf(page, sel);
    const idlePx = await page.screenshot({ clip: box });
    await page.hover(sel);
    await page.waitForTimeout(80);
    const hoverLook = await lookOf(page, sel);
    const hoverPx = await page.screenshot({ clip: box });
    if (idleLook !== hoverLook || !idlePx.equals(hoverPx)) changed.push(sel);
    // Absolute, not only relative: a hovered control carries no web-style decoration at all.
    const deco = await page.$eval(sel, (e) => [e].concat(Array.from(e.querySelectorAll('*'))).map((n) => {
      const st2 = getComputedStyle(n);
      return [st2.filter, st2.outlineStyle, st2.boxShadow, st2.opacity, n === e ? st2.backgroundColor : 'rgba(0, 0, 0, 0)', st2.backgroundImage].join(',');
    }).filter((v) => v !== 'none,none,none,1,rgba(0, 0, 0, 0),none'));
    if (deco.length) decorated.push([sel, deco]);
    await page.mouse.move(600, 400);
  }
  c('hover adds no border, outline, glow, fill or brightening to any control (styles and pixels)', changed.length === 0, changed);
  c('a hovered control has no filter, outline, shadow, fill or opacity at all', decorated.length === 0, decorated);
  c('no stylesheet on the page has a :hover rule', await page.evaluate(() => Array.from(document.styleSheets).every((s) => Array.from(s.cssRules).every((r) => !/:hover/.test(r.cssText)))));
  await page.hover('#util-1');
  c('hovering a utility shows a separate tooltip naming it', (await page.$eval('#tooltip', (t) => t.style.display !== 'none' && t.dataset.text)) === 'NOTES');

  c('no console errors or failed requests', errors.length === 0, errors);
  await context.close();

  // file:// -----------------------------------------------------------------------------------
  const fctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const fpage = await fctx.newPage();
  const ferr = [];
  fpage.on('pageerror', (e) => ferr.push(String(e)));
  fpage.on('requestfailed', (r) => ferr.push('failed ' + r.url()));
  await fpage.goto('file://' + path.join(ROOT, 'game/index.html'));
  await fpage.waitForFunction(() => document.body.dataset.ready, null, { timeout: 15000 });
  c('opens from file:// with no server', (await fpage.evaluate(() => document.body.dataset.ready)) === 'true', ferr);
  c('fits a smaller window by scaling the whole stage', await fpage.evaluate(() => /scale\(0\.66/.test(document.getElementById('stage').style.transform)));
  await fpage.click('#speechText');
  await fpage.waitForFunction(() => document.body.dataset.phase === 'choosing');
  await fpage.click('#choiceViewport .choice[data-index="0"]');
  await fpage.waitForFunction(() => document.body.dataset.phase === 'typing');
  c('a scaled stage still takes clicks on the right card', (await fpage.evaluate(() => window.CYOA_GAME.state.transcript[1].text)) === 'WHERE IS THE BATHROOM, PLEASE?');
  c('no errors from file://', ferr.length === 0, ferr);
  await fctx.close();
  const version = browser.version();
  await browser.close();
  return version;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  staticChecks();
  const requests = [];
  const server = await startServer(requests);
  const base = `http://127.0.0.1:${server.address().port}`;
  const versions = {};
  for (const name of (process.env.QA_BROWSERS || 'chromium,firefox').split(',')) {
    try {
      versions[name] = await suite(name, base, requests);
    } catch (err) {
      versions[name] = 'NOT RUN: ' + String(err.message).split('\n')[0];
      console.log(err.stack.split('\n').slice(0, 6).join('\n'));
      check(name, 'browser suite ran to completion', false, versions[name]);
    }
  }
  server.close();
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const byBrowser = {};
  results.forEach((r) => {
    byBrowser[r.browser] = byBrowser[r.browser] || { total: 0, passed: 0 };
    byBrowser[r.browser].total++;
    if (r.ok) byBrowser[r.browser].passed++;
  });
  fs.writeFileSync(path.join(__dirname, 'qa_results.json'), JSON.stringify({
    schema: 'cyoa-m2-reception-qa-v1',
    note: 'Technical checks only. A pass is not visual or narrative approval.',
    startingCommit: START_SHA,
    browsers: versions,
    playwright: require('playwright/package.json').version,
    total: results.length,
    passed,
    failed: failed.length,
    byBrowser,
    failures: failed,
    checks: results
  }, null, 2) + '\n');
  console.log(`${passed}/${results.length} passed`, JSON.stringify(byBrowser));
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
