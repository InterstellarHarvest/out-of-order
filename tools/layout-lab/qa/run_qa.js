#!/usr/bin/env node
// Playwright QA for the placement lab, in Chromium and Firefox.
//   NODE_PATH="$(npm root -g)" node tools/layout-lab/qa/run_qa.js
// Assets are hashed from the bytes the browser actually received. A passing run shows the
// lab behaves as specified; it says nothing about whether the placement looks right.
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');
const playwright = require('playwright');

const LAB = path.resolve(__dirname, '..');
const ROOT = path.resolve(LAB, '../..');
const LAB_URL = 'tools/layout-lab/index.html';
const PKG = 'art/ui';
const SHELL_PATH = 'art/ui/shell/layout-final.png';
const SHOTS = path.join(__dirname, 'screenshots');
const START_SHA = 'ca049418ccdf4607acc99fe421de80da4c2bd7f5'; // the accepted sprite package (tag archive/agent/m1-approved-spritesheet-toggle-demo)
const MARKER_PATH = 'art/ui/sprites/choice_cards/choice_marker_tab.png';
const MARKER_SHA256 = '982ed250b40d661340d09d569b5cf437884223816afe28be68e28c4053ee05b8';
const SHELL_BLOB = '1849c8ec192cd639dd8550de0dcdda1aa88d2e4f';
const SHELL_SHA256 = '813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6';

const sheet = JSON.parse(fs.readFileSync(path.join(ROOT, PKG, 'm1_approved_sprite_sheet.json')));
// The behaviour checks run against a fixed test layout, not the owner's current defaults, which
// change as the owner experiments. shippedDefaults() checks the real defaults separately.
const shipped = JSON.parse(fs.readFileSync(path.join(LAB, 'data/placement.default.json')));
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/placement.qa_baseline.json')));
const measured = JSON.parse(fs.readFileSync(path.join(LAB, 'data/measured_shell_regions.json')));

const results = [];
function check(browser, name, ok, detail) {
  results.push({ browser, name, ok: !!ok, detail: detail === undefined ? undefined : detail });
  if (!ok) console.log(`FAIL [${browser}] ${name}`, detail === undefined ? '' : JSON.stringify(detail));
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

// Static checks ---------------------------------------------------------------------
function staticChecks() {
  const b = 'static';
  check(b, 'shell Git blob unchanged', git('hash-object', SHELL_PATH) === SHELL_BLOB);
  check(b, 'shell tracked blob unchanged', git('ls-files', '-s', SHELL_PATH).split(/\s+/)[1] === SHELL_BLOB);
  check(b, 'shell SHA-256 unchanged', sha256(fs.readFileSync(path.join(ROOT, SHELL_PATH))) === SHELL_SHA256);

  const names = Object.keys(sheet.sprites);
  check(b, 'package still lists 29 sprites', names.length === 29, names.length);
  const bad = names.filter((n) => {
    const entry = sheet.sprites[n];
    return sha256(fs.readFileSync(path.join(ROOT, PKG, entry.package_path))) !== entry.sha256;
  });
  check(b, 'all 29 package PNGs match manifest hashes', bad.length === 0, bad);
  check(b, 'atlas matches manifest hash', sha256(fs.readFileSync(path.join(ROOT, PKG, sheet.image))) === sheet.image_sha256);

  // The package's history (build scripts, source cutouts, locked ZIP) lives in the archive tags; on
  // main its files are pinned by hash instead.
  const PINNED = {
    'design/ui_locked_component_contract_v1.json': 'f44a5b60236e6ff34a61e75daad654f74b5743d291f6f5a1d0b84f6c67c5fae3',
    'design/m1_sprite_manifest.json': '05b3f28289be6230e760e60e58a5a2cb813291a0869fec7f89edfb4827d4e26f',
    [MARKER_PATH]: MARKER_SHA256
  };
  const drifted = Object.keys(PINNED).filter((f) => sha256(fs.readFileSync(path.join(ROOT, f))) !== PINNED[f]);
  check(b, 'immutable files match their pinned hashes', drifted.length === 0, drifted);
  const listed = new Set(names.map((n) => sheet.sprites[n].package_path).concat(['sprites/fonts/locked_pixel_font_atlas.png', 'sprites/fonts/locked_pixel_font_atlas.json',
    'sprites/choice_cards/choice_marker_tab.png', sheet.image, 'm1_approved_sprite_sheet.json', 'm1_approved_sprite_sheet.manifest.js']));
  const onDisk = (dir) => fs.readdirSync(path.join(ROOT, PKG, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? onDisk(dir + '/' + e.name) : [dir + '/' + e.name])).filter((f) => !/\.DS_Store$/.test(f));
  const strays = onDisk('sprites').filter((f) => !listed.has(f));
  check(b, 'the sprite package holds no unlisted files', strays.length === 0, strays);
  const corrected = Object.keys(sheet.sprites).filter((n) => sheet.sprites[n].correction).sort();
  check(b, 'manifest records the correction on exactly the two cards', corrected.join() === 'choice_2line_c,choice_4line_b', corrected);

  const bundle = fs.readFileSync(path.join(LAB, 'data/lab_data.js'), 'utf8').replace(/^[^]*?window\.M1_LAB_DATA = /, '').replace(/;\s*$/, '');
  const data = JSON.parse(bundle);
  const same = (a, c) => JSON.stringify(a) === JSON.stringify(c);
  check(b, 'bundled baseline equals placement.default.json', same(data.placementDefault, shipped));
  const shape = (v, p = '') => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).flatMap((k) => [p + '.' + k, ...shape(v[k], p + '.' + k)]) : []);
  check(b, 'QA test layout has the same fields as the shipped defaults', same(shape(baseline).sort(), shape(shipped).sort()));
  check(b, 'bundled glyphs equal approved glyph JSON',
    same(data.glyphs, JSON.parse(fs.readFileSync(path.join(ROOT, PKG, 'sprites/fonts/locked_pixel_font_atlas.json')))));
  check(b, 'bundled measurements are current', same(data.measured, measured));
  const assets = JSON.parse(fs.readFileSync(path.join(LAB, 'data/snapshot_assets.js'), 'utf8').replace(/^[^]*?window\.M1_SNAPSHOT_ASSETS = /, '').replace(/;\s*$/, ''));
  const bytesOf = (url) => sha256(Buffer.from(url.split(',')[1], 'base64'));
  check(b, 'snapshot bundle holds the exact shell bytes', bytesOf(assets['layout-final.png']) === SHELL_SHA256);
  const spriteKeys = Object.keys(assets).filter((n) => n !== 'layout-final.png' && !n.startsWith('font:') && !n.startsWith('glyph:'));
  const assetBad = spriteKeys.filter((n) => bytesOf(assets[n]) !== sheet.sprites[n].sha256);
  check(b, 'snapshot bundle holds the exact sprite bytes', assetBad.length === 0 && spriteKeys.length === 28, assetBad);
  const fonts = JSON.parse(fs.readFileSync(path.join(LAB, 'data/fonts.json')));
  check(b, 'bundled fonts equal data/fonts.json', same(data.fonts, fonts));
  const fontBad = Object.keys(fonts).filter((id) => bytesOf(assets['font:' + id]) !== sha256(fs.readFileSync(path.join(LAB, fonts[id].atlas))));
  check(b, 'snapshot bundle holds the exact baked font bytes', fontBad.length === 0 && Object.keys(assets).filter((n) => n.startsWith('font:')).length === Object.keys(fonts).length, fontBad);
  const charset = Object.keys(data.glyphs.mapping);
  const gaps = Object.keys(fonts).filter((id) => charset.some((ch) => !fonts[id].mapping[ch]));
  check(b, 'every baked face covers the locked font\'s characters', gaps.length === 0, gaps);
  // Font files are sources and stay local (art/ui/fonts/source/); their licence texts are in git.
  const unlicensed = Object.keys(fonts).filter((id) => !fs.existsSync(path.join(LAB, fonts[id].licenseFile)));
  check(b, 'every baked face ships its licence file', unlicensed.length === 0, unlicensed);
  check(b, 'obsolete atlas absent from snapshot bundle', !assets.locked_pixel_font_atlas);
  const glyphNames = Object.keys(data.actionGlyphs);
  const glyphBad = glyphNames.filter((n) => bytesOf(assets['glyph:' + n]) !== sha256(fs.readFileSync(path.join(LAB, data.actionGlyphs[n].file))));
  check(b, 'snapshot bundle holds the exact candidate glyph bytes', glyphNames.length === 21 && glyphBad.length === 0
    && Object.keys(assets).filter((n) => n.startsWith('glyph:')).length === glyphNames.length, glyphBad);
  check(b, 'glyph list holds current files only, no saved versions or sheet', glyphNames.every((n) => !/_v\d+$/.test(n) && !n.startsWith('_')), glyphNames);
  const glyphSizes = glyphNames.filter((n) => fs.readFileSync(path.join(LAB, data.actionGlyphs[n].file)).readUInt32BE(16) !== data.actionGlyphs[n].size[0]);
  check(b, 'bundled glyph sizes match the files', glyphSizes.length === 0, glyphSizes);
  check(b, 'buttons default to their labels, each with a known glyph', shipped.utility.show === 'label'
    && shipped.utility.buttons.every((x) => data.actionGlyphs[x.glyph]));
  check(b, 'measured shell identity', measured.shell.sha256 === SHELL_SHA256 && measured.shell.git_blob === SHELL_BLOB);
  check(b, 'placement is marked unapproved', shipped.approvedForProduction === false && /PROPOSED/.test(shipped.status));

  const ints = [];
  (function walk(v, p) {
    if (typeof v === 'number' && !Number.isInteger(v) && !/\.scale$/.test(p)) ints.push(p);
    if (v && typeof v === 'object') Object.keys(v).forEach((k) => walk(v[k], p + '.' + k));
  })(shipped, 'placement');
  check(b, 'all baseline coordinates are integers', ints.length === 0, ints);
}

// Static file server, so response bytes can be hashed ------------------------------
function startServer() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Helpers ------------------------------------------------------------------------------
const openPanels = (page) => page.$$eval('details', (all) => all.forEach((d) => { d.open = true; }));

async function qaContext(browser, options) {
  const context = await browser.newContext(options);
  await context.addInitScript((fixture) => { window.M1_LAB_QA_BASELINE = fixture; }, baseline);
  return context;
}

async function openLab(browser, base, viewport, watch) {
  const context = await qaContext(browser, { viewport: viewport || { width: 1920, height: 1080 }, acceptDownloads: true });
  const page = await context.newPage();
  const log = { errors: [], failed: [], responses: [] };
  page.on('console', (m) => { if (m.type() === 'error') log.errors.push(m.text()); });
  page.on('pageerror', (e) => log.errors.push(String(e)));
  page.on('requestfailed', (r) => log.failed.push(r.url()));
  page.on('response', (r) => {
    log.responses.push(r);
    if (r.status() >= 400) log.failed.push(r.url());
  });
  await page.goto(base + '/' + LAB_URL);
  await page.waitForFunction(() => document.body.dataset.ready);
  await openPanels(page);
  if (watch) watch(page);
  return { context, page, log };
}

const rectOf = (page, sel) => page.$eval(sel, (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});

async function stageRect(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    const stage = document.getElementById('stage').getBoundingClientRect();
    const k = M1Lab.viewScale();
    const r = el.getBoundingClientRect();
    return { x: (r.x - stage.x) / k, y: (r.y - stage.y) / k, w: r.width / k, h: r.height / k };
  }, sel);
}

async function centre(page, sel) {
  const r = await rectOf(page, sel);
  return [r.x + r.w / 2, r.y + r.h / 2];
}

async function pressAndHold(page, sel) {
  const [x, y] = await centre(page, sel);
  await page.mouse.move(x, y);
  await page.mouse.down();
}

const demo = (page, id) => page.click(`[data-demo="${id}"]`);
const setSelect = (page, id, value) => page.selectOption('#' + id, value);

async function reset(page) {
  await page.click('#resetAll');
}

function pngPixels(page, png) {
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, data: Array.from(ctx.getImageData(0, 0, img.width, img.height).data) };
  }, png.toString('base64'));
}

async function shot(page) {
  await page.evaluate(() => M1Lab.finishSpeech());
  await page.mouse.move(5, 5);
  await page.waitForTimeout(260);
  return page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

// Sidebar-open checks need room for a 1:1 stage beside the 396px sidebar.
const WORK_VIEWPORT = { width: 2340, height: 1120 };
const REVIEW_VIEWPORT = { width: 1920, height: 1080 };

async function enterClean1x(page) {
  await page.setViewportSize(REVIEW_VIEWPORT);
  await page.click('#view1x');
  await page.click('#cleanReview');
}

async function leaveClean(page) {
  await page.keyboard.press('Escape');
  await page.click('#viewFit');
  await page.setViewportSize(WORK_VIEWPORT);
  await page.waitForTimeout(100); // let the resize settle before reading rectangles
}

// Browser suite ------------------------------------------------------------------------
async function suite(name, base) {
  const browser = await playwright[name].launch();
  const { context, page, log } = await openLab(browser, base);
  const c = (n, ok, d) => check(name, n, ok, d);

  await page.waitForLoadState('networkidle');

  // Assets ---------------------------------------------------------------------------
  const seen = {};
  for (const r of log.responses) {
    const u = decodeURI(new URL(r.url()).pathname).slice(1);
    if (u.endsWith('.png')) seen[u] = sha256(await r.body());
  }
  const expected = Object.keys(sheet.sprites).filter((n) => n !== 'locked_pixel_font_atlas');
  c('28 sprites requested', expected.every((n) => seen[`${PKG}/${sheet.sprites[n].package_path}`]), Object.keys(seen).length);
  const hashBad = expected.filter((n) => seen[`${PKG}/${sheet.sprites[n].package_path}`] !== sheet.sprites[n].sha256);
  c('loaded sprites match approved hashes', hashBad.length === 0, hashBad);
  c('loaded shell matches SHA-256', seen[SHELL_PATH] === SHELL_SHA256);
  c('obsolete 364x78 atlas never requested', !Object.keys(seen).some((u) => /locked_pixel_font_atlas\.png$/.test(u)));
  c('nothing loaded from outside shell, package and the marker candidate',
    Object.keys(seen).every((u) => u === SHELL_PATH || u === MARKER_PATH || u.startsWith(PKG + '/sprites/') || u.startsWith('art/ui/fonts/')), Object.keys(seen));
  c('marker candidate matches its approved hash', seen[MARKER_PATH] === MARKER_SHA256, seen[MARKER_PATH]);
  c('no missing assets', log.failed.length === 0, log.failed);

  const allImagesOk = await page.$$eval('img', (imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0));
  c('every stage image decoded', allImagesOk);
  const shellInfo = await page.$eval('#shell', (s) => ({ w: s.naturalWidth, h: s.naturalHeight, dw: s.offsetWidth, dh: s.offsetHeight }));
  c('shell renders 1920x1080', shellInfo.w === 1920 && shellInfo.h === 1080 && shellInfo.dw === 1920 && shellInfo.dh === 1080, shellInfo);

  // No browser font: every piece of game text is a canvas, and the stage holds no text nodes.
  const textNodes = await page.$$eval('#stage', ([s]) => {
    const walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
    const out = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.textContent.trim() && !n.parentElement.closest('.tool')) out.push(n.textContent.trim());
    }
    return out;
  });
  c('no browser text on stage', textNodes.length === 0, textNodes);
  const rendering = await page.$$eval('#stage img, #stage canvas', (els) => [...new Set(els.map((e) => getComputedStyle(e).imageRendering))]);
  c('smoothing off on all stage pixels', rendering.every((v) => v === 'pixelated' || v === 'crisp-edges'), rendering);

  // Layout ----------------------------------------------------------------------------
  for (const vp of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 1100, height: 700 }]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(50);
    const a = await rectOf(page, '#sidebar');
    const b = await rectOf(page, '#stage');
    c(`devtools docked to the right edge at ${vp.width}x${vp.height}`, Math.abs(a.x + a.w - vp.width) <= 0.5, a);
    c(`inspector clear of stage at ${vp.width}x${vp.height}`, b.x + b.w <= a.x + 0.5, { sidebar: a, stage: b });
    c(`stage fits window at ${vp.width}x${vp.height}`, b.x >= -0.5 && b.h <= vp.height + 0.5, b);
    const logical = await page.$eval('#stage', (s) => [s.offsetWidth, s.offsetHeight]);
    c(`stage stays 1920x1080 logical at ${vp.width}x${vp.height}`, logical[0] === 1920 && logical[1] === 1080, logical);
  }
  await page.setViewportSize(WORK_VIEWPORT);

  await page.click('#view1x');
  await page.waitForTimeout(50);
  const t = await rectOf(page, '#stage');
  c('1:1 view gives a true 1920x1080 stage', t.w === 1920 && t.h === 1080, t);
  await page.click('#viewFit');

  // Integer positions at logical scale.
  await enterClean1x(page);
  await setSelectViaLab(page, 'mixed-overflow');
  const fractional = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('#stage img, #stage canvas, #stage .hit, #stage .hit-area, #stage .slot').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.width && [r.x, r.y, r.width, r.height].some((v) => !Number.isInteger(v))) bad.push([e.id || e.className, r.x, r.y, r.width, r.height]);
    });
    return bad;
  });
  c('no fractional positions at 1:1', fractional.length === 0, fractional.slice(0, 5));
  await setSelectViaLab(page, 'three-two-line');
  await leaveClean(page);

  // All visible controls clickable.
  const controls = await page.$$eval('#stage .hit', (els) => els.filter((e) => e.offsetParent !== null).map((e) => e.id || `[data-comp="${e.dataset.comp}"]`));
  for (const s of controls) {
    const [x, y] = await centre(page, s.startsWith('[') ? s : '#' + s);
    const hit = await page.evaluate(([px, py]) => {
      const e = document.elementFromPoint(px, py);
      const b = e && e.closest('.hit');
      return b ? b.id || `[data-comp="${b.dataset.comp}"]` : null;
    }, [x, y]);
    c(`control reachable: ${s}`, hit === s, hit);
  }

  // Utility buttons -------------------------------------------------------------------
  await page.click('#view1x');
  for (const b of baseline.utility.buttons) {
    const id = '#util-' + b.id;
    const fam = b.spriteFamily;
    const srcOf = () => page.$eval(id + ' img', (i) => i.getAttribute('src'));
    const labelBefore = await rectOf(page, id + ' canvas');
    const up = await srcOf();
    await pressAndHold(page, id);
    const down = await srcOf();
    const state = await page.$eval(id, (e) => e.dataset.state);
    const labelDown = await rectOf(page, id + ' canvas');
    const body = await rectOf(page, id);
    if (b.id === 'notes') await shotClip(page, name, 'detail_utility_notes_down', body);
    await page.mouse.up();
    const after = await srcOf();
    const labelAfter = await rectOf(page, id + ' canvas');
    const activations = await page.$eval(id, (e) => e.dataset.activations);
    c(`${b.id}: pointer down shows DOWN sprite`, up.endsWith(fam + '_up.png') && down.endsWith(fam + '_down.png') && state === 'down', { up, down });
    c(`${b.id}: release returns to UP`, after.endsWith(fam + '_up.png'));
    c(`${b.id}: label moves with pressed face`,
      labelDown.x - labelBefore.x === baseline.utility.pressedLabelOffset.dx && labelDown.y - labelBefore.y === baseline.utility.pressedLabelOffset.dy,
      { labelBefore, labelDown });
    c(`${b.id}: label returns on release`, labelAfter.x === labelBefore.x && labelAfter.y === labelBefore.y);
    c(`${b.id}: pointer click activates once`, activations === '1', activations);

    await page.focus(id);
    await page.keyboard.down('Enter');
    const kd = await srcOf();
    const kLabel = await rectOf(page, id + ' canvas');
    await page.keyboard.up('Enter');
    await page.keyboard.down(' ');
    const sd = await srcOf();
    await page.keyboard.up(' ');
    const ku = await srcOf();
    const k = await page.$eval(id, (e) => e.dataset.activations);
    c(`${b.id}: keyboard presses and releases`, kd.endsWith('_down.png') && sd.endsWith('_down.png') && ku.endsWith('_up.png'));
    c(`${b.id}: keyboard label moves`, kLabel.x !== labelBefore.x && kLabel.y !== labelBefore.y);
    c(`${b.id}: Enter and Space each activate`, k === '3', k);
    await page.evaluate(() => document.activeElement.blur());
  }

  // Sliding off before release cancels.
  await pressAndHold(page, '#util-notes');
  await page.mouse.move(10, 10);
  await page.mouse.up();
  c('release outside does not activate', (await page.$eval('#util-notes', (e) => e.dataset.activations)) === '3');

  // No recolour: the DOWN state is only the approved DOWN image plus the label offset.
  const css = await page.$$eval('#stage img, #stage canvas, #stage .hit', (els) => els.filter((e) => {
    const s = getComputedStyle(e);
    return s.filter !== 'none' || s.opacity !== '1' || s.mixBlendMode !== 'normal';
  }).length);
  c('no filters, opacity or blends on controls', css === 0, css);

  // Inventory -------------------------------------------------------------------------
  const items = async () => {
    await page.evaluate(() => M1Lab.settleMotion());
    return page.$$eval('.item-label', (ls) => ls.filter((l) => l.offsetParent).map((l) => l.dataset.item));
  };
  const seven = await items();
  c('seven slots by default', seven.length === 7, seven);
  const slotRects = await page.$$eval('.slot', (ss) => ss.filter((s) => s.offsetParent).map((s) => {
    const r = s.getBoundingClientRect();
    return [r.x, r.width, r.height];
  }));
  c('slots are 96x96 at 102 pitch', slotRects.every((r, i) => r[1] === 96 && r[2] === 96 && r[0] - slotRects[0][0] === 102 * i), slotRects);

  await pressAndHold(page, '#inv-right');
  const arrowDown = await page.$eval('#inv-right img', (i) => i.getAttribute('src'));
  await page.mouse.up();
  const stepped = await items();
  c('right arrow DOWN sprite', arrowDown.endsWith('inv_right_down.png'), arrowDown);
  c('right arrow shifts window by one item', stepped[0] === seven[1] && stepped[5] === seven[6], stepped);
  const itemX = await page.$$eval('.item-label', (ls) => ls.filter((l) => l.offsetParent).map((l) => [l.dataset.item, l.closest('.slot').getBoundingClientRect().x]));
  c('an item moves exactly one 102px slot', itemX[0][1] === slotRects[0][0] && itemX[0][0] === seven[1], itemX[0]);
  await pressAndHold(page, '#inv-left');
  const leftDown = await page.$eval('#inv-left img', (i) => i.getAttribute('src'));
  await page.mouse.up();
  c('left arrow DOWN sprite', leftDown.endsWith('inv_left_down.png'), leftDown);
  c('left arrow shifts back one item', (await items()).join() === seven.join());
  await page.click('#inv-left');
  c('window clamps at the first item', (await items()).join() === seven.join());
  for (let i = 0; i < 12; i++) await page.click('#inv-right');
  const end = await items();
  c('window clamps at the last item', end[end.length - 1] === 'CARD', end);
  await page.evaluate(() => { M1Lab.rt.inventoryStart = 0; M1Lab.renderAll(); });

  await demo(page, 'slots:6');
  const arrowsSix = [await rectOf(page, '#inv-left'), await rectOf(page, '#inv-right')];
  const six = await page.$$eval('.slot', (ss) => ss.filter((s) => s.offsetParent).map((s) => s.getBoundingClientRect().width));
  c('six-slot toggle shows six unresized slots', six.length === 6 && six.every((w) => w === 96), six);
  await demo(page, 'slots:7');
  const arrowsSeven = [await rectOf(page, '#inv-left'), await rectOf(page, '#inv-right')];
  c('slot count leaves the arrows alone', JSON.stringify(arrowsSix) === JSON.stringify(arrowsSeven));

  // Native versus fit arrows.
  await demo(page, 'arrows:native');
  const nativeArrow = await rectOf(page, '#inv-left');
  c('native arrow preset is 83x128', nativeArrow.w === 83 && nativeArrow.h === 128, nativeArrow);
  c('fit report flags native arrows with seven slots',
    (await page.$eval('[data-fit="inventory-arrows"] td:last-child', (e) => e.textContent)) === 'overflow');
  await demo(page, 'slots:6');
  c('native arrows clear six slots', (await page.$eval('[data-fit="inventory-arrows"] td:last-child', (e) => e.textContent)) === 'fits');
  await reset(page);

  // Choices -----------------------------------------------------------------------------
  const vp = baseline.choices.viewport;
  const firstCard = '[data-comp="choice-0"]';
  const defaultMax = await page.evaluate(() => M1Lab.maxChoiceScroll());
  const cards = await page.evaluate(() => M1Lab.cardLayout().map((k) => [k.lines, k.height, k.y]));
  c('default viewport holds three 2-line cards exactly', defaultMax === 0 && cards.length === 3 && cards.every((k) => k[1] === 108) && cards[2][2] + 108 === vp.height, cards);

  const noOverflow = await page.evaluate(() => M1Lab.thumbMetrics());
  c('no overflow: thumb fills usable track', noOverflow.y === baseline.scrollbar.track.y && noOverflow.height === baseline.scrollbar.track.height, noOverflow);

  await page.evaluate(() => { M1Lab.state.choices.feedback.click = 'press'; M1Lab.commit(); });
  const before = await rectOf(page, firstCard);
  const textBefore = await rectOf(page, firstCard + ' canvas');
  await pressAndHold(page, firstCard);
  const pressed = await rectOf(page, firstCard);
  const textPressed = await rectOf(page, firstCard + ' canvas');
  await page.mouse.up();
  const released = await rectOf(page, firstCard);
  c('pressed card moves +3/+3', pressed.x - before.x === 3 && pressed.y - before.y === 3, { before, pressed });
  c('card text moves with it', textPressed.x - textBefore.x === 3 && textPressed.y - textBefore.y === 3);
  c('card returns on release', released.x === before.x && released.y === before.y);
  c('card keeps the same sprite when pressed', (await page.$eval(firstCard, (e) => e.dataset.sprite)) === 'choice_2line_a');

  await page.focus(firstCard);
  await page.keyboard.down('Enter');
  const kbCard = await rectOf(page, firstCard);
  await page.keyboard.up('Enter');
  c('keyboard press moves card', kbCard.x - before.x === 3 && kbCard.y - before.y === 3);
  await page.evaluate(() => document.activeElement.blur());
  await page.evaluate(() => { M1Lab.state.choices.feedback.click = M1Lab.baseline.choices.feedback.click; M1Lab.commit(); });

  // Every card sprite, all three variants.
  await setSelect(page, 'choiceSet', 'all-sprites');
  const layout = await page.evaluate(() => M1Lab.cardLayout().map((k) => ({ s: k.sprite, l: k.lines, e: k.expectedLines, h: k.height })));
  c('sample text wraps to the expected line count', layout.every((k) => k.l === k.e), layout);
  c('all 12 card sprites reachable', new Set(layout.map((k) => k.s)).size === 12, layout.map((k) => k.s));
  c('card heights are 80/108/136/164', layout.every((k) => k.h === { 1: 80, 2: 108, 3: 136, 4: 164 }[k.l]));
  c('12px card gaps', await page.evaluate(() => {
    const k = M1Lab.cardLayout();
    return k.every((v, i) => i === 0 || v.y === k[i - 1].y + k[i - 1].height + 12);
  }));

  // Scroll boundaries.
  await setSelect(page, 'choiceSet', 'long-list');
  await page.waitForTimeout(30);
  const outside = async () => {
    await page.mouse.move(5, 5);
    return page.screenshot({ clip: { x: 0, y: 0, width: 1300, height: 900 } });
  };
  await page.evaluate(() => M1Lab.finishSpeech());
  await enterClean1x(page);
  await page.waitForTimeout(220);
  const portraitBefore = await page.screenshot({ clip: { x: 1300, y: 0, width: 620, height: 520 } });
  const sceneBefore = await outside();
  await leaveClean(page);
  await page.click('#view1x');

  const trackTop = baseline.scrollbar.track.y;
  const trackBottom = trackTop + baseline.scrollbar.track.height;
  const max = await page.evaluate(() => M1Lab.maxChoiceScroll());
  const sample = async (label, id) => {
    await demo(page, id);
    const m = await page.evaluate(() => ({ t: M1Lab.thumbMetrics(), s: M1Lab.rt.choiceScroll }));
    return { label, ...m };
  };
  const top = await sample('top', 'scroll:top');
  const mid = await sample('middle', 'scroll:middle');
  const bot = await sample('bottom', 'scroll:bottom');
  c('overflow thumb is shorter than the track', top.t.overflow && top.t.height < baseline.scrollbar.track.height, top);
  c('thumb at track top when scrolled to top', top.t.y === trackTop, top);
  c('thumb at track bottom when scrolled to end', bot.t.y + bot.t.height === trackBottom && bot.s === max, bot);
  const midExpected = trackTop + (baseline.scrollbar.track.height - mid.t.height) * (mid.s / max);
  c('thumb moves proportionally', Math.abs(mid.t.y - midExpected) <= 1, { mid, midExpected });
  c('thumb height is unchanged by scrolling', top.t.height === mid.t.height && mid.t.height === bot.t.height);

  await demo(page, 'scroll:top');
  await page.hover('#choiceViewport');
  for (let i = 0; i < 80; i++) await page.mouse.wheel(0, 200);
  await page.waitForTimeout(100);
  const wheelEnd = await page.evaluate(() => ({ s: M1Lab.rt.choiceScroll, t: M1Lab.thumbMetrics() }));
  c('wheel stops at the last card', wheelEnd.s === max, wheelEnd);
  c('thumb never passes track bottom', wheelEnd.t.y + wheelEnd.t.height <= trackBottom, wheelEnd);
  for (let i = 0; i < 80; i++) await page.mouse.wheel(0, -200);
  await page.waitForTimeout(100);
  const wheelTop = await page.evaluate(() => ({ s: M1Lab.rt.choiceScroll, t: M1Lab.thumbMetrics() }));
  c('wheel stops at the first card', wheelTop.s === 0 && wheelTop.t.y >= trackTop, wheelTop);

  // Dragging the thumb past both ends must clamp.
  const thumbBox = await rectOf(page, '#choiceThumb');
  await page.mouse.move(thumbBox.x + 10, thumbBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(thumbBox.x + 10, 1110, { steps: 4 });
  const dragEnd = await page.evaluate(() => ({ s: M1Lab.rt.choiceScroll, t: M1Lab.thumbMetrics() }));
  await page.mouse.move(thumbBox.x + 10, 5, { steps: 4 });
  const dragTop = await page.evaluate(() => ({ s: M1Lab.rt.choiceScroll, t: M1Lab.thumbMetrics() }));
  await page.mouse.up();
  c('thumb drag clamps at the bottom', dragEnd.s === max && dragEnd.t.y + dragEnd.t.height === trackBottom, dragEnd);
  c('thumb drag clamps at the top', dragTop.s === 0 && dragTop.t.y === trackTop, dragTop);

  const scrollbars = await page.$eval('#choiceViewport', (v) => {
    const s = getComputedStyle(v);
    return { overflowX: s.overflowX, overflowY: s.overflowY, sw: v.offsetWidth - v.clientWidth };
  });
  c('no native scrollbar on the choice list', scrollbars.sw === 0 && scrollbars.overflowY !== 'scroll' && scrollbars.overflowY !== 'auto', scrollbars);

  await demo(page, 'scroll:bottom');
  await page.click('#viewFit');
  await enterClean1x(page);
  const sceneAfter = await outside();
  const portraitAfter = await page.screenshot({ clip: { x: 1300, y: 0, width: 620, height: 520 } });
  c('scrolling leaves the scene and footer identical', sceneBefore.equals(sceneAfter));
  c('scrolling leaves the portrait and speech identical', portraitBefore.equals(portraitAfter));
  await leaveClean(page);
  await reset(page);

  // Thumb assembly at both widths: caps fixed, only the middle grows.
  await setSelect(page, 'choiceSet', 'long-list');
  const pieces = await page.evaluate(() => {
    const p = M1Lab.state.scrollbar.thumb;
    return { cap: p.capHeight, w: p.displayWidth, h: M1Lab.thumbMetrics().height };
  });
  c('fit thumb is 20 wide with 10px caps', pieces.cap === 10 && pieces.w === 20 && pieces.h >= 20, pieces);
  await demo(page, 'thumb:native');
  const native = await page.evaluate(() => {
    const p = M1Lab.state.scrollbar.thumb;
    return { cap: p.capHeight, w: p.displayWidth, x: p.x };
  });
  c('native thumb keeps 40 wide with 20px caps', native.cap === 20 && native.w === 40, native);
  c('fit report flags the native thumb', (await page.$eval('[data-fit="thumb"] td:last-child', (e) => e.textContent)) === 'overflow');
  await reset(page);

  // The fit thumb stays inside the measured channel, row by row, at both ends of travel.
  await setSelect(page, 'choiceSet', 'long-list');
  await page.click('#view1x');
  const ch = measured.regions.choiceTrack;
  const channelCheck = await page.evaluate(() => {
    const t = M1Lab.thumbMetrics();
    return { x0: t.x, x1: t.x + t.width - 1 };
  });
  c('fit thumb within channel width', channelCheck.x0 >= ch.channel[0] && channelCheck.x1 <= ch.channel[0] + ch.channel[2] - 1, channelCheck);
  const usable = ch.usableHalfScale;
  c('track bounds sit inside the measured usable rows',
    baseline.scrollbar.track.y >= usable.y && trackBottom <= usable.y + usable.height, { usable, track: baseline.scrollbar.track });
  await page.click('#viewFit');
  await reset(page);

  // Speech ------------------------------------------------------------------------------
  await setSelect(page, 'speechSample', 'long');
  const typing = await page.evaluate(() => M1Lab.rt.speech.typing);
  c('speech types out', typing);
  await page.waitForTimeout(120);
  const partial = await page.evaluate(() => M1Lab.rt.speech.revealed);
  await page.click('#speechText');
  const done = await page.evaluate(() => ({ t: M1Lab.rt.speech.typing, r: M1Lab.rt.speech.revealed, l: M1Lab.rt.speech.lines.map((x) => x.text).join('').length, top: M1Lab.rt.speech.scrollLine }));
  c('click finishes the message', partial > 0 && !done.t && done.r === done.l, { partial, done });
  c('finished long message opens at its first line', done.top === 0);
  await page.waitForTimeout(220);
  const ind = () => page.$eval('#speechIndicator', (e) => {
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return { on: e.dataset.overflow, vis: s.visibility, op: s.opacity, x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight };
  });
  const longInd = await ind();
  c('speech overflow shows the indicator', longInd.on === 'true' && longInd.vis === 'visible' && longInd.op === '1', longInd);
  c('indicator sits in the x1899-1906 gutter', longInd.x === 1899 && longInd.x + longInd.w === 1907, longInd);
  const textRight = baseline.speech.text.x + baseline.speech.text.width;
  c('speech text stops short of the gutter', textRight <= 1899, textRight);
  const speechScroll = await page.$eval('#speechText', (e) => getComputedStyle(e).overflowY);
  c('no native scrollbar on speech', speechScroll === 'visible' || speechScroll === 'hidden' || speechScroll === 'clip', speechScroll);

  await page.hover('#speechText');
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 100);
  await page.waitForTimeout(100);
  const sp = await page.evaluate(() => ({ line: M1Lab.rt.speech.scrollLine, max: M1Lab.speechMaxScroll() }));
  const bottomInd = await ind();
  c('speech scrolls to its last line', sp.line === sp.max && sp.max > 0, sp);
  c('indicator stays inside its track', bottomInd.y + bottomInd.h === baseline.speech.indicator.y + baseline.speech.indicator.height, bottomInd);

  // Independence, both directions.
  const choiceBefore = await page.evaluate(() => [M1Lab.rt.choiceScroll, M1Lab.maxChoiceScroll()]);
  c('speech overflow creates no choice overflow', choiceBefore[1] === 0, choiceBefore);
  const thumbStill = await page.evaluate(() => M1Lab.thumbMetrics());
  c('speech overflow leaves the thumb full', !thumbStill.overflow && thumbStill.height === baseline.scrollbar.track.height, thumbStill);
  await setSelect(page, 'speechSample', 'short');
  await page.click('#speechText');
  await page.waitForTimeout(220);
  await setSelect(page, 'choiceSet', 'long-list');
  await page.waitForTimeout(220);
  const shortInd = await ind();
  c('choice overflow shows no speech indicator', shortInd.on === 'false' && shortInd.vis === 'hidden', shortInd);
  c('short speech has no overflow', (await page.evaluate(() => M1Lab.speechMaxScroll())) === 0);
  await demo(page, 'scroll:bottom');
  const spLine = await page.evaluate(() => M1Lab.rt.speech.scrollLine);
  c('choice scroll leaves speech scroll alone', spLine === 0);
  await setSelect(page, 'speechSample', 'long');
  await page.click('#speechText');
  const bothScroll = await page.evaluate(() => M1Lab.rt.choiceScroll);
  c('speech change leaves choice scroll alone', bothScroll > 0, bothScroll);
  await reset(page);

  // Objective -----------------------------------------------------------------------------
  await page.click('#view1x');
  const title = await page.evaluate(() => {
    const t = M1Lab.state.objective.title;
    return { x: t.x, ink: M1Lab.inkWidth(t.text), plaque: t.plaque, text: t.text, y: t.y };
  });
  const titleBox = await stageRect(page, '#objectiveTitle');
  const leftGap = titleBox.x - title.plaque.x;
  const rightGap = title.plaque.x + title.plaque.width - (titleBox.x + title.ink);
  c('objective title centred in plaque', Math.abs(leftGap - rightGap) <= 1, { leftGap, rightGap, ink: title.ink });
  c('plaque bounds match the measurement',
    JSON.stringify([title.plaque.x, title.plaque.y, title.plaque.width, title.plaque.height]) === JSON.stringify(measured.regions.objectivePlaque.opening));
  const inkTop = title.y + 1;
  const topGap = inkTop - title.plaque.y;
  const bottomGap = title.plaque.y + title.plaque.height - (inkTop + 17);
  c('objective title centred vertically', Math.abs(topGap - bottomGap) <= 1, { topGap, bottomGap });
  const objBody = baseline.objective.body;
  const panel = measured.regions.objectivePanel.clearBelowPlaque;
  c('objective body has added left padding', objBody.x - panel[0] > 25, objBody.x - panel[0]);
  const bodyLines = Number(await page.$eval('#objectiveBody', (e) => e.dataset.lines));
  c('objective body stays in its panel', objBody.y + bodyLines * objBody.lineHeight <= panel[1] + panel[3] && objBody.x + objBody.width <= panel[0] + panel[2], bodyLines);
  await page.click('#viewFit');

  // Inspector ---------------------------------------------------------------------------
  await page.click('[data-select="util-notes"]');
  const xBefore = (await rectOf(page, '#util-notes')).x;
  await page.click('[data-nudge="x:5"]');
  await page.click('[data-nudge="x:1"]');
  await page.click('[data-nudge="y:-1"]');
  const moved = await page.evaluate(() => [M1Lab.state.utility.buttons[1].x, M1Lab.state.utility.buttons[1].y]);
  c('inspector nudges +5, +1, -1', moved[0] === 1617 + 6 && moved[1] === 930 - 1, moved);
  await page.fill('#inspector [data-field="x"]', '1650.7');
  await page.dispatchEvent('#inspector [data-field="x"]', 'change');
  c('typed coordinates become integers', (await page.evaluate(() => M1Lab.state.utility.buttons[1].x)) === 1651);
  await page.selectOption('#inspector [data-field="heldState"]', 'down');
  c('held DOWN state', (await page.$eval('#util-notes', (e) => e.dataset.state)) === 'down');
  await page.selectOption('#inspector [data-field="Sprite variant"]', 'utility_c');
  c('sprite variant switch', (await page.$eval('#util-notes img', (i) => i.getAttribute('src'))).endsWith('utility_c_down.png'));
  await page.selectOption('#inspector [data-field="heldState"]', 'up');
  await page.fill('#inspector [data-field="text"]', 'FILES');
  await page.dispatchEvent('#inspector [data-field="text"]', 'change');
  c('label text is dynamic', (await page.evaluate(() => M1Lab.state.utility.buttons[1].label)) === 'FILES');
  await page.uncheck('#inspector [data-field="visible"]');
  c('visibility toggle', (await page.$eval('#util-notes', (e) => e.style.display)) === 'none');
  await reset(page);

  await page.click('[data-select="inventory"]');
  await page.click('[data-group-nudge="X:5"]');
  const groupMove = await page.evaluate(() => {
    const i = M1Lab.state.inventory;
    return [i.slotLayouts['7'].x, i.leftArrow.x, i.rightArrow.x];
  });
  c('group nudge moves all members', groupMove.join() === '81,28,790', groupMove);
  await reset(page);

  await page.click('#modePosition');
  await page.click('#view1x');
  const dragStart = await centre(page, '#util-inspect');
  await page.mouse.move(dragStart[0], dragStart[1]);
  await page.mouse.down();
  await page.mouse.move(dragStart[0] + 7, dragStart[1] - 4, { steps: 3 });
  await page.mouse.up();
  const dragged = await page.evaluate(() => [M1Lab.selected, M1Lab.state.utility.buttons[0].x, M1Lab.state.utility.buttons[0].y]);
  c('position mode drags in whole pixels', dragged.join() === 'util-inspect,1485,926', dragged);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  const keyed = await page.evaluate(() => [M1Lab.state.utility.buttons[0].x, M1Lab.state.utility.buttons[0].y]);
  c('arrow keys nudge in position mode', keyed.join() === '1486,931', keyed);
  await page.click('#modeInteract');
  await page.click('#viewFit');
  await reset(page);

  // Placement JSON ----------------------------------------------------------------------
  const snapshot = () => page.evaluate(() => {
    const out = {};
    document.querySelectorAll('#stage img, #stage canvas, #stage .hit, #stage .slot').forEach((e, i) => {
      out[i] = [e.id, e.dataset.comp, e.style.left, e.style.top, e.style.width, e.style.height, e.style.display, e.getAttribute('src')];
    });
    return JSON.stringify(out);
  });
  c('fresh export equals the baseline file',
    JSON.stringify(JSON.parse(await page.evaluate(() => M1Lab.exportJson()))) === JSON.stringify(baseline));

  await demo(page, 'slots:6');
  await demo(page, 'utility:half');
  await demo(page, 'thumb:native');
  await page.click('[data-select="util-notes"]');
  await page.click('[data-nudge="x:5"]');
  await setSelect(page, 'choiceSet', 'mixed-overflow');
  await setSelect(page, 'variantMode', 'b');
  await page.click('#copyJson');
  const exported = await page.$eval('#jsonBox', (b) => b.value);
  const stageA = await snapshot();
  await enterClean1x(page);
  const pngA = await shot(page);
  await leaveClean(page);

  await reset(page);
  c('reset restores the baseline', JSON.stringify(JSON.parse(await page.evaluate(() => M1Lab.exportJson()))) === JSON.stringify(baseline));
  await page.fill('#jsonBox', exported);
  await page.click('#importJson');
  await page.waitForTimeout(50);
  c('import reports success', /imported/i.test(await page.$eval('#jsonStatus', (e) => e.textContent)));
  const reexported = await page.evaluate(() => M1Lab.exportJson());
  c('export, import, export is byte-identical', exported === reexported);
  c('import reproduces the stage geometry', stageA === (await snapshot()));
  await enterClean1x(page);
  const pngB = await shot(page);
  await leaveClean(page);
  c('import reproduces the stage pixels', pngA.equals(pngB));

  await page.fill('#jsonBox', '{"schema":"nope"}');
  await page.click('#importJson');
  c('wrong schema is refused', /schema/i.test(await page.$eval('#jsonStatus', (e) => e.textContent)));
  const wrongShell = JSON.parse(exported);
  wrongShell.shell.gitBlob = 'deadbeef';
  await page.fill('#jsonBox', JSON.stringify(wrongShell));
  await page.click('#importJson');
  c('wrong shell is refused', /different shell/.test(await page.$eval('#jsonStatus', (e) => e.textContent)));
  const fractionalImport = JSON.parse(exported);
  fractionalImport.inventory.leftArrow.x = 10.5;
  await page.fill('#jsonBox', JSON.stringify(fractionalImport));
  await page.click('#importJson');
  c('fractional coordinates are refused', /whole number/.test(await page.$eval('#jsonStatus', (e) => e.textContent)));
  c('a refused import changes nothing', exported === (await page.evaluate(() => M1Lab.exportJson())));

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#downloadJson')]);
  const dlPath = await download.path();
  c('download matches the export', fs.readFileSync(dlPath, 'utf8') === exported);
  await page.fill('#jsonBox', '');
  await reset(page);

  // Session survives a reload.
  await demo(page, 'slots:6');
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready);
  await openPanels(page);
  c('session restored after reload', (await page.evaluate(() => M1Lab.state.inventory.slotCount)) === 6);
  await reset(page);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready);
  await openPanels(page);
  c('reset clears the saved session', (await page.evaluate(() => M1Lab.state.inventory.slotCount)) === 7);

  await liveTuning(page, name, base, c);
  await motionAndFeedback(page, name, c);
  await typefaces(page, c);
  await actionGlyphs(page, name, c);

  // Clean Review --------------------------------------------------------------------------
  await page.check('#toggleGrid');
  await page.check('#toggleGuides');
  await page.click('[data-select="util-notes"]');
  await enterClean1x(page);
  const hidden = await page.evaluate(() => ['sidebar', 'grid', 'guides', 'selection'].map((id) => {
    const e = document.getElementById(id);
    return [id, getComputedStyle(e).display, e.getBoundingClientRect().width];
  }));
  c('Clean Review hides all tooling', hidden.every((h) => h[1] === 'none'), hidden);
  c('Clean Review hides Live Tuning', await page.$eval('#liveTuning', (e) => !e.getClientRects().length));
  c('Clean Review hides warning marks', await page.$eval('#warningMarks', (e) => getComputedStyle(e).display === 'none'));
  c('exit control is invisible until hovered', (await page.$eval('#exitClean', (e) => getComputedStyle(e).opacity)) === '0');
  const cleanStage = await rectOf(page, '#stage');
  c('Clean Review stage is full resolution', cleanStage.w === 1920 && cleanStage.h === 1080 && cleanStage.x === 0 && cleanStage.y === 0, cleanStage);
  const cleanElementShot = await (await page.$('#stage')).screenshot();
  const decoded = await pngPixels(page, cleanElementShot);
  c('stage screenshot is exactly 1920x1080', decoded.w === 1920 && decoded.h === 1080, [decoded.w, decoded.h]);
  await page.keyboard.press('Escape');
  c('Esc leaves Clean Review', await page.$eval('#sidebar', (e) => getComputedStyle(e).display !== 'none'));
  await page.click('#cleanReview');
  await page.mouse.move(1880, 20);
  await page.click('#exitClean');
  c('exit control leaves Clean Review', await page.$eval('#sidebar', (e) => getComputedStyle(e).display !== 'none'));
  await page.uncheck('#toggleGrid');
  await page.uncheck('#toggleGuides');
  await page.click('[data-select="utility"]');
  await page.setViewportSize(WORK_VIEWPORT);

  // Pixels ----------------------------------------------------------------------------------
  // A nearest-neighbour downscale can only show colours already in the source. A smoothed one
  // invents new ones, so the opaque face of a scaled button proves which we got.
  await reset(page);
  await enterClean1x(page);
  await page.waitForTimeout(200);
  const face = await page.screenshot({ clip: { x: 1490, y: 945, width: 108, height: 30 } });
  const facePixels = await pngPixels(page, face);
  const source = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = document.createElement('canvas');
    k.width = img.width;
    k.height = img.height;
    const ctx = k.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    const set = new Set();
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return Array.from(set);
  }, base + `/${PKG}/sprites/controls/utility_a_up.png`);
  const palette = new Set(source);
  let invented = 0;
  for (let i = 0; i < facePixels.data.length; i += 4) {
    if (!palette.has((facePixels.data[i] << 16) | (facePixels.data[i + 1] << 8) | facePixels.data[i + 2])) invented++;
  }
  c('scaled button shows no interpolated colours', invented === 0, invented);

  // Shell pixels survive: sample a region no overlay covers against the PNG itself.
  const shellClip = await page.screenshot({ clip: { x: 200, y: 8, width: 300, height: 30 } });
  const shellPixels = await pngPixels(page, shellClip);
  const shellSource = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = document.createElement('canvas');
    k.width = 300;
    k.height = 30;
    const ctx = k.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#0e1b20';
    ctx.fillRect(0, 0, 300, 30);
    ctx.drawImage(img, -200, -8);
    return Array.from(ctx.getImageData(0, 0, 300, 30).data);
  }, base + '/' + SHELL_PATH);
  let shellDiff = 0;
  for (let i = 0; i < shellPixels.data.length; i++) if (Math.abs(shellPixels.data[i] - shellSource[i]) > 1) shellDiff++;
  c('rendered shell matches its PNG', shellDiff === 0, shellDiff);

  // Screenshots -----------------------------------------------------------------------------
  const save = async (file) => {
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    if (name === 'chromium') fs.writeFileSync(path.join(SHOTS, file + '.png'), png);
    return png;
  };
  await page.waitForTimeout(2500);
  const pngDefault = await save('01_default_seven_slots_fit');
  await page.evaluate(() => { M1Lab.state.utility.buttons[1].heldState = 'down'; M1Lab.state.inventory.rightArrow.heldState = 'down'; M1Lab.commit(); });
  await pressAndHold(page, '[data-comp="choice-1"]');
  await page.waitForTimeout(50);
  await save('02_pressed_notes_right_arrow_and_card');
  await page.mouse.up();
  await page.mouse.move(5, 5);
  await page.evaluate(() => {
    const s = M1Lab.state;
    s.utility.buttons[1].heldState = 'up';
    s.inventory.rightArrow.heldState = 'up';
    M1Lab.setChoiceSet('mixed-overflow');
    s.demo.speechSample = 'long';
    M1Lab.commit();
    M1Lab.startSpeech();
    M1Lab.finishSpeech();
    M1Lab.setChoiceScroll(Math.round(M1Lab.maxChoiceScroll() / 2));
  });
  await page.waitForTimeout(260);
  await save('03_overflow_choices_middle_and_speech');
  await page.evaluate(() => M1Lab.setChoiceScroll(M1Lab.maxChoiceScroll()));
  await page.waitForTimeout(50);
  await save('04_overflow_choices_bottom');
  await page.evaluate(() => {
    const s = M1Lab.state;
    s.inventory.slotCount = 6;
    M1Lab.setChoiceSet('three-two-line');
    s.demo.speechSample = 'short';
    M1Lab.commit();
    M1Lab.startSpeech();
    M1Lab.finishSpeech();
    M1Lab.applyPreset('arrows', 'native');
  });
  await page.waitForTimeout(260);
  await save('05_six_slots_native_arrows');
  await page.evaluate(() => { M1Lab.state.inventory.slotCount = 7; M1Lab.commit(); });
  await page.waitForTimeout(50);
  await save('06_seven_slots_native_arrows_overlap');
  await page.evaluate(() => {
    M1Lab.applyPreset('arrows', 'fit');
    M1Lab.applyPreset('utility', 'native');
    M1Lab.applyPreset('thumb', 'native');
  });
  await page.waitForTimeout(50);
  await save('07_native_utility_and_thumb_overflow');
  await page.evaluate(() => {
    M1Lab.applyPreset('utility', 'half');
    M1Lab.applyPreset('thumb', 'fit');
  });
  await page.waitForTimeout(50);
  await save('08_utility_half_scale_alternative');
  await page.keyboard.press('Escape');
  await reset(page);
  await page.waitForTimeout(50);

  c('no console errors', log.errors.length === 0, log.errors);
  await context.close();
  await browser.close();
  return pngDefault;
}

// Live Tuning --------------------------------------------------------------------------------
// Every slider and the exported paths it may change. A slider missing from here fails QA.
const SLIDER_PATHS = {
  'inv.x': /^inventory\.(slotLayouts\.\d\.x|leftArrow\.x|rightArrow\.x)$/,
  'inv.y': /^inventory\.(slotLayouts\.\d\.y|leftArrow\.y|rightArrow\.y)$/,
  'inv.gap': /^inventory\.(gap|pitch|slotLayouts\.\d\.x)$/,
  'inv.pitch': /^inventory\.(gap|pitch|slotLayouts\.\d\.x)$/,
  'arrow.size': /^inventory\.(left|right)Arrow\.(scale|displayWidth|displayHeight|x|y)$/,
  'arrow.spread': /^inventory\.(left|right)Arrow\.x$/,
  'arrow.y': /^inventory\.(left|right)Arrow\.y$/,
  'arrow.leftX': /^inventory\.leftArrow\.x$/,
  'arrow.rightX': /^inventory\.rightArrow\.x$/,
  'arrow.leftSize': /^inventory\.leftArrow\.(scale|displayWidth|displayHeight|x|y)$/,
  'arrow.rightSize': /^inventory\.rightArrow\.(scale|displayWidth|displayHeight|y)$/,
  'arrow.leftY': /^inventory\.leftArrow\.y$/,
  'arrow.rightY': /^inventory\.rightArrow\.y$/,
  'util.width': /^utility\.buttons\.\d\.(scale|displayWidth|displayHeight|x|y)$/,
  'util.gap': /^utility\.buttons\.\d\.x$/,
  'util.x': /^utility\.(align|buttons\.\d\.x)$/,
  'util.y': /^utility\.(centerVertically|buttons\.\d\.y)$/,
  'util.labelX': /^utility\.buttons\.\d\.labelOffset\.dx$/,
  'util.labelY': /^utility\.buttons\.\d\.labelOffset\.dy$/,
  'util.pressX': /^utility\.pressedLabelOffset\.dx$/,
  'util.pressY': /^utility\.pressedLabelOffset\.dy$/,
  'util.inspect.x': /^utility\.(align|centerVertically|buttons\.0\.x)$/,
  'util.inspect.y': /^utility\.(align|centerVertically|buttons\.0\.y)$/,
  'util.inspect.w': /^utility\.(align|centerVertically|buttons\.0\.(scale|displayWidth|displayHeight))$/,
  'util.notes.x': /^utility\.(align|centerVertically|buttons\.1\.x)$/,
  'util.notes.y': /^utility\.(align|centerVertically|buttons\.1\.y)$/,
  'util.notes.w': /^utility\.(align|centerVertically|buttons\.1\.(scale|displayWidth|displayHeight))$/,
  'util.journal.x': /^utility\.(align|centerVertically|buttons\.2\.x)$/,
  'util.journal.y': /^utility\.(align|centerVertically|buttons\.2\.y)$/,
  'util.journal.w': /^utility\.(align|centerVertically|buttons\.2\.(scale|displayWidth|displayHeight))$/,
  'choice.x': /^choices\.viewport\.x$/,
  'choice.y': /^choices\.viewport\.y$/,
  'choice.width': /^choices\.(cardWidth|viewport\.width|text\.maxWidth)$/,
  'choice.cardHeight': /^choices\.cardHeights\.[1-4]$/,
  'choice.height': /^choices\.viewport\.height$/,
  'choice.gap': /^choices\.gap$/,
  'choice.padLeft': /^choices\.text\.(offsetX|maxWidth)$/,
  'choice.padRight': /^choices\.text\.maxWidth$/,
  'choice.wrap': /^choices\.text\.maxWidth$/,
  'choice.textTop': /^choices\.text\.offsetY$/,
  'choice.lineHeight': /^choices\.text\.lineHeight$/,
  'inv.slideMs': /^inventory\.motion\.durationMs$/,
  'inv.overshoot': /^inventory\.motion\.overshoot$/,
  'inv.settle': /^inventory\.motion\.settle$/,
  'inv.lag': /^inventory\.motion\.lagMs$/,
  'choice.markerX': /^choices\.feedback\.marker\.x$/,
  'choice.markerY': /^choices\.feedback\.marker\.y$/,
  'choice.markerClip': /^choices\.feedback\.marker\.clipX$/,
  'choice.markerMs': /^choices\.feedback\.marker\.travelMs$/,
  'choice.dim': /^choices\.feedback\.dimPercent$/,
  'choice.sendDelay': /^choices\.feedback\.send\.delayMs$/,
  'choice.sendMs': /^choices\.feedback\.send\.durationMs$/,
  'choice.pull': /^choices\.feedback\.send\.pull$/,
  'choice.vanish': /^choices\.feedback\.send\.edgeOffset$/,
  'choice.beat': /^choices\.feedback\.send\.beatMs$/,
  'speech.gap': /^speech\.text\.speakerGap$/,
  'choice.awayMs': /^choices\.feedback\.awayMs$/,
  'choice.holdMs': /^choices\.feedback\.holdMs$/,
  'choice.pressX': /^choices\.pressedOffset\.dx$/,
  'choice.pressY': /^choices\.pressedOffset\.dy$/,
  'choice.count': /^demo\.choiceCount$/,
  'thumb.width': /^scrollbar\.thumb\.(scale|displayWidth|capHeight|x)$/,
  'thumb.x': /^scrollbar\.thumb\.x$/,
  'track.top': /^scrollbar\.track\.(y|height)$/,
  'track.bottom': /^scrollbar\.track\.height$/,
  'thumb.min': /^scrollbar\.thumb\.minHeight$/,
  'title.x': /^objective\.title\.(x|alignOffsetX)$/,
  'title.y': /^objective\.title\.y$/,
  'body.left': /^objective\.body\.(x|width)$/,
  'body.right': /^objective\.body\.width$/,
  'body.top': /^objective\.body\.y$/,
  'body.line': /^objective\.body\.lineHeight$/,
  'speech.left': /^speech\.text\.x$/,
  'speech.top': /^speech\.text\.y$/,
  'speech.width': /^speech\.text\.width$/,
  'speech.line': /^speech\.text\.lineHeight$/,
  'ind.x': /^speech\.indicator\.x$/,
  'ind.y': /^speech\.indicator\.y$/,
  'ind.w': /^speech\.indicator\.width$/,
  'ind.h': /^speech\.indicator\.height$/
};

// Press offsets only show during a press; they are checked by pressing, further down.
const NO_VISIBLE_CHANGE_AT_REST = new Set(['util.pressX', 'util.pressY', 'choice.pressX', 'choice.pressY',
  'inv.slideMs', 'inv.overshoot', 'inv.settle', 'inv.lag',
  'choice.markerX', 'choice.markerY', 'choice.markerClip', 'choice.markerMs', 'choice.dim', 'choice.awayMs', 'choice.holdMs',
  'choice.sendDelay', 'choice.sendMs', 'choice.pull', 'choice.vanish', 'choice.beat',
  // Moves pixels inside the dialogue canvas only, which the geometry signature cannot see; the
  // typeface checks measure the gap in the canvas itself.
  'speech.gap']);

function flatten(value, prefix, out) {
  Object.keys(value).forEach((k) => {
    const p = prefix ? prefix + '.' + k : k;
    if (value[k] && typeof value[k] === 'object') flatten(value[k], p, out);
    else out[p] = value[k];
  });
  return out;
}

function changedPaths(a, b) {
  const fa = flatten(JSON.parse(a), '', {});
  const fb = flatten(JSON.parse(b), '', {});
  return Object.keys(fb).filter((k) => fa[k] !== fb[k]);
}

// Records what is true at the moment of each input event, after the lab has handled it.
const installRecorder = (page) => page.evaluate(() => {
  const record = { events: [], removed: [] };
  window.__rec = record;
  const stageSig = () => Array.from(document.querySelectorAll('#stage img, #stage canvas, #stage .hit, #stage .hit-area, #stage .slot, #stage .speech-indicator'))
    .map((e) => [e.style.left, e.style.top, e.style.width, e.style.height, e.style.display, e.width, e.height].join()).join('|');
  window.__stageSig = stageSig;
  if (!window.__recorderOn) {
    window.__recorderOn = true;
    document.getElementById('liveTuning').addEventListener('input', (e) => {
      if (e.target.type !== 'range') return;
      const line = e.target.closest('.tune');
      window.__rec.events.push({
        target: e.target,
        connected: e.target.isConnected,
        value: Number(e.target.value),
        number: Number(line.querySelector('input[type=number]').value),
        sig: stageSig(),
        exported: M1Lab.exportJson(),
        active: document.activeElement === e.target
      });
    });
    new MutationObserver((list) => list.forEach((m) => m.removedNodes.forEach((n) => {
      // Result tables and warning text may be replaced. Anything you can operate may not.
      const operable = 'input, button, select, textarea, details, .tune';
      if (n.nodeType === 1 && !m.target.closest('[data-card-list]') && (n.matches(operable) || n.querySelector(operable))) {
        window.__rec.removed.push(n.tagName);
      }
    }))).observe(document.getElementById('sidebar'), { childList: true, subtree: true });
  }
});

async function dragSlider(page, id) {
  const range = await page.$(`[data-tune="${id}"] input[type=range]`);
  await range.scrollIntoViewIfNeeded();
  const box = await range.boundingBox();
  const fraction = await range.evaluate((r) => (Number(r.value) - Number(r.min)) / (Number(r.max) - Number(r.min)));
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8 + (box.width - 16) * fraction, y);
  await page.mouse.down();
  for (const f of [0.2, 0.4, 0.6, 0.8]) await page.mouse.move(box.x + 8 + (box.width - 16) * f, y, { steps: 3 });
  await page.mouse.up();
}

async function setRange(page, id, value) {
  await page.$eval(`[data-tune="${id}"] input[type=range]`, (r, v) => {
    r.value = v;
    r.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

const numberOf = (page, id) => page.$eval(`[data-tune="${id}"] input[type=number]`, (n) => Number(n.value));
const sliderOf = (page, id) => page.$eval(`[data-tune="${id}"] input[type=range]`, (n) => Number(n.value));
const isModified = (page, id) => page.$eval(`[data-tune="${id}"]`, (e) => e.classList.contains('modified'));

// Runs a step in the page and records one reading per animation frame until it ends.
function framesOf(page, start, read, ms) {
  return page.evaluate(([startText, readText, duration]) => new Promise((resolve) => {
    const startFn = new Function(`return (${startText})`)();
    const readFn = new Function(`return (${readText})`)();
    const out = [];
    const end = performance.now() + duration;
    startFn();
    requestAnimationFrame(function loop(now) {
      out.push(readFn());
      if (now < end) requestAnimationFrame(loop);
      else resolve(out);
    });
  }), [start.toString(), read.toString(), ms]);
}

async function motionAndFeedback(page, name, c) {
  await reset(page);
  await page.setViewportSize(WORK_VIEWPORT);
  await page.mouse.move(5, 5);
  await page.evaluate(() => M1Lab.finishSpeech());
  const baseSlotX = await page.$eval('[data-slot="0"]', (e) => e.getBoundingClientRect().x);

  // Inventory slide --------------------------------------------------------------------------
  const pitch = await page.evaluate(() => M1Lab.state.inventory.pitch);
  const trackItem = await page.$eval('[data-slot="1"] .item-label', (l) => l.dataset.item);
  await page.evaluate((item) => { window.__track = item; }, trackItem);
  const step = await framesOf(page, () => M1Lab.stepInventory(1), () => {
    const label = [...document.querySelectorAll('.item-label')].find((l) => l.dataset.item === window.__track && l.offsetParent);
    const slot = label && label.closest('.slot');
    return { raw: slot ? slot.style.left : null, shown: [...document.querySelectorAll('.slot')].filter((e) => e.offsetParent).length, moving: !!M1Lab.rt.inventorySlide };
  }, 420);
  const lefts = step.filter((f) => f.raw !== null).map((f) => parseFloat(f.raw));
  const rest = await page.$eval('[data-slot="0"]', (e) => parseFloat(e.style.left));
  c('the tracked item stays on screen through the whole slide', step.every((f) => f.raw !== null), step.length);
  c('slots slide through many positions instead of swapping', new Set(lefts).size >= 5, [...new Set(lefts)]);
  c('slide positions are whole pixels', lefts.every(Number.isInteger), lefts);
  c('slide starts one pitch away from rest', Math.max(...lefts) - rest <= pitch && Math.max(...lefts) - rest >= pitch - 40, { max: Math.max(...lefts), rest });
  c('slide overshoots, by no more than the setting', [1, 2].includes(rest - Math.min(...lefts)), { min: Math.min(...lefts), rest });
  c('slide settles back past rest by at most the setting', lefts.slice(lefts.indexOf(Math.min(...lefts))).every((x) => x - rest <= 1), lefts);
  c('slide ends exactly at rest', lefts[lefts.length - 1] === rest && !step[step.length - 1].moving, lefts.slice(-3));
  c('slide finishes in about the set time', step.filter((f) => f.moving).length * 16.7 < 400, step.filter((f) => f.moving).length);
  c('a neighbour slides in during the motion', Math.max(...step.map((f) => f.shown)) >= 8, step.map((f) => f.shown));
  c('only the row shows at rest', step[step.length - 1].shown === 7, step[step.length - 1]);

  const slotX = await page.$eval('[data-slot="0"]', (e) => e.getBoundingClientRect().x);
  c('row returns to its exact resting position', slotX === baseSlotX, { slotX, baseSlotX });
  await page.evaluate(() => { M1Lab.rt.inventoryStart = 0; M1Lab.settleMotion(); });

  const fast = await framesOf(page, () => { M1Lab.stepInventory(1); M1Lab.stepInventory(1); M1Lab.stepInventory(1); M1Lab.stepInventory(1); }, () => M1Lab.rt.inventoryStart, 500);
  const fastEnd = await page.evaluate(() => [...document.querySelectorAll('.item-label')].filter((l) => l.offsetParent).map((l) => l.dataset.item));
  const fastWant = await page.evaluate(() => M1Lab.samples.items.slice(4, 11));
  c('rapid presses land on the right items', fast[fast.length - 1] === 4 && fastEnd.join() === fastWant.join(), { fastEnd, fastWant });

  await page.evaluate(() => { M1Lab.rt.inventoryStart = 0; M1Lab.settleMotion(); });
  const stuck = await framesOf(page, () => M1Lab.stepInventory(-1), () => !!M1Lab.rt.inventorySlide, 60);
  c('no motion at the end of the list', stuck.every((f) => !f));

  await page.click('[data-tune="inv.slide"] input');
  const off = await framesOf(page, () => M1Lab.stepInventory(1), () => ({ moving: !!M1Lab.rt.inventorySlide, shown: [...document.querySelectorAll('.slot')].filter((e) => e.offsetParent).length }), 60);
  c('slide toggle off swaps at once', off.every((f) => !f.moving && f.shown === 7), off);
  await reset(page);
  await page.click('[data-tune-action="inv.tryRight"]');
  c('Try it scrolls the row', (await page.evaluate(() => M1Lab.rt.inventoryStart)) === 1);
  await page.evaluate(() => { M1Lab.rt.inventoryStart = 0; M1Lab.settleMotion(); });

  // The slide window stays out of the way at rest, in both slot counts.
  for (const count of [6, 7]) {
    await page.click(`[data-tune="inv.slots"] button[data-value="${count}"]`);
    const fit = await page.evaluate(() => {
      const box = document.getElementById('invWindow').getBoundingClientRect();
      return [...document.querySelectorAll('.slot')].filter((e) => e.offsetParent).every((e) => {
        const r = e.getBoundingClientRect();
        return r.left >= box.left && r.right <= box.right + 0.01;
      });
    });
    c(`every resting slot sits inside the slide window with ${count} slots`, fit);
  }
  await reset(page);

  // Hover --------------------------------------------------------------------------------------
  const card = '[data-comp="choice-0"]';
  await page.click('[data-tune="choice.click"] button[data-value="slide"]');
  const look = () => page.$eval(card, (e) => {
    const s = getComputedStyle(e);
    const i = getComputedStyle(e.querySelector('.sprite'));
    const r = e.getBoundingClientRect();
    return [s.outlineStyle, s.borderStyle, s.boxShadow, s.filter, s.backgroundColor, s.opacity, i.filter, i.boxShadow, r.x, r.y, r.width, r.height].join('|');
  });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(160);
  const lookIdle = await look();
  const markerShown = () => page.$eval(card + ' .marker-clip', (e) => getComputedStyle(e).display !== 'none');
  c('tab is hidden at rest', !(await markerShown()));
  const [cx, cy] = await centre(page, card);
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(220);
  c('hover brings out the tab', await markerShown());
  c('hover adds no outline, border, shadow, filter or fill, and does not move the card', (await look()) === lookIdle, await look());
  const tab = await page.$eval(card + ' .card-marker', (e) => {
    const r = e.getBoundingClientRect();
    return { left: e.style.left, w: e.offsetWidth, h: e.offsetHeight, nw: e.naturalWidth, nh: e.naturalHeight, src: e.getAttribute('src'), rendering: getComputedStyle(e).imageRendering };
  });
  c('tab draws the candidate sprite at native size', tab.nw === 14 && tab.nh === 12 && tab.w === 14 && tab.h === 12 && tab.src.endsWith('choice_marker_tab.png'), tab);
  c('tab rests at the set position', tab.left === '-2px', tab);
  c('tab is not smoothed', tab.rendering === 'pixelated' || tab.rendering === 'crisp-edges', tab);
  const steps = await framesOf(page, () => { M1Lab.rt.choiceHover = {}; document.querySelector('[data-comp="choice-0"]').dispatchEvent(new PointerEvent('pointerleave')); }, () => {
    const e = document.querySelector('[data-comp="choice-0"] .card-marker');
    return e.parentNode.style.display === 'none' ? null : parseFloat(e.style.left);
  }, 200);
  const seen = steps.filter((v) => v !== null);
  c('tab travels on its own 2px grid', seen.every((v) => Number.isInteger(v) && (v + 2) % 2 === 0), seen);
  c('tab retracts behind the frame', steps[steps.length - 1] === null, steps.slice(-3));
  await page.mouse.move(5, 5);
  await page.waitForTimeout(160);
  await page.evaluate(() => document.querySelector('[data-comp="choice-0"]').blur());

  await page.click('[data-tune="choice.hover"] button[data-value="none"]');
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(160);
  c('hover set to Nothing shows no tab', !(await markerShown()));
  await page.mouse.move(5, 5);
  await page.click('[data-tune="choice.hover"] button[data-value="marker"]');
  await page.evaluate(() => M1Lab.setMode('position'));
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(160);
  c('Position mode shows no tab', !(await markerShown()));
  await page.evaluate(() => M1Lab.setMode('interact'));
  await page.mouse.move(5, 5);

  await page.focus('[data-comp="choice-1"]');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await page.waitForTimeout(160);
  c('keyboard focus brings out the tab', await page.$eval('[data-comp="choice-1"] .marker-clip', (e) => getComputedStyle(e).display !== 'none'));
  await page.evaluate(() => document.activeElement.blur());
  await page.waitForTimeout(160);

  await page.click('[data-tune-action="choice.tryTab"]');
  await page.waitForTimeout(160);
  c('Tab out previews without hovering', await markerShown());
  await setRange(page, 'choice.markerX', 6);
  c('tab follows its slider', (await page.$eval(card + ' .card-marker', (e) => e.style.left)) === '-6px');
  await page.click('[data-tune-action="choice.tryTab"]');
  await page.waitForTimeout(160);
  c('Tab in clears the preview', !(await markerShown()));
  await reset(page);

  // Clicking -------------------------------------------------------------------------------------
  const pickFrames = () => framesOf(page, () => M1Lab.previewPick(0), () => {
    const read = (id) => { const e = document.querySelector(`[data-comp="${id}"]`); return { left: e.style.left, filter: e.style.filter, clip: e.style.clipPath, shown: e.style.display !== 'none' }; };
    return { a: read('choice-0'), b: read('choice-1') };
  }, 1250);
  const leftBefore = await rectOf(page, card);
  await pressAndHold(page, card);
  const held = await rectOf(page, card);
  await page.mouse.up();
  c('default click keeps the card still while held', held.x === leftBefore.x && held.y === leftBefore.y, { held, leftBefore });
  c('a click still activates the card', (await page.$eval(card, (e) => e.dataset.activations)) === '1');
  await page.mouse.move(5, 5);
  await page.evaluate(() => M1Lab.settleMotion());

  const slid = await pickFrames();
  c('Others slide: the chosen card does not move', slid.every((f) => f.a.left === '0px' && !f.a.filter), slid[0].a);
  const away = slid.map((f) => parseInt(f.b.left, 10));
  c('Others slide: other cards leave and come back', Math.max(...away) >= 540 && away[away.length - 1] === 0, Math.max(...away));
  c('Others slide: positions are whole and on the 2px grid', away.every((v) => v % 2 === 0), away);
  c('Others slide: other cards stay clipped to the viewport', slid.every((f) => { const m = /inset\(0px (\d+)px/.exec(f.b.clip); return parseInt(f.b.left, 10) === 0 ? !f.b.clip : !!m && Number(m[1]) === parseInt(f.b.left, 10); }), slid.find((f) => f.b.clip));
  c('Others slide: no dimming', slid.every((f) => !f.b.filter));
  c('Others slide: everything back at rest', !(await page.evaluate(() => M1Lab.rt.choicePick)));

  await page.click('[data-tune="choice.click"] button[data-value="dim"]');
  await setRange(page, 'choice.dim', 60);
  const dimmed = await pickFrames();
  const filters = new Set(dimmed.map((f) => f.b.filter));
  c('Others dim: two hard steps only', [...filters].sort().join() === ',brightness(40%),brightness(70%)', [...filters]);
  c('Others dim: the chosen card stays as it is', dimmed.every((f) => !f.a.filter && f.a.left === '0px'));
  c('Others dim: other cards stay in place', dimmed.every((f) => f.b.left === '0px'));
  c('Others dim: clears afterwards', !dimmed[dimmed.length - 1].b.filter);

  // Choice sends ------------------------------------------------------------------------------
  await page.click('[data-tune="choice.click"] button[data-value="send"]');
  const npcLine = await page.evaluate(() => M1Lab.speechText());
  const sendTimes = { awayMs: 60, holdMs: 120, send: { delayMs: 40, durationMs: 200, pull: 2, edgeOffset: 0, showReply: true, beatMs: 100 } };
  const sendFrames = (times) => framesOf(page, `() => {
    const f = M1Lab.state.choices.feedback;
    const t = ${JSON.stringify(times)};
    f.awayMs = t.awayMs; f.holdMs = t.holdMs; Object.assign(f.send, t.send);
    M1Lab.state.speech.text.charsPerSecond = 600;
    M1Lab.previewPick(2);
  }`, () => {
    const read = (id) => { const e = document.querySelector(`[data-comp="${id}"]`); return { top: parseInt(e.style.top, 10), left: parseInt(e.style.left, 10), clip: e.style.clipPath, shown: e.style.display !== 'none' }; };
    const sp = M1Lab.rt.speech;
    return { c: read('choice-2'), a: read('choice-0'), speech: M1Lab.speechText(), pick: !!M1Lab.rt.choicePick, at: performance.now(),
      roles: sp.lines.map((x) => x.role).join(), typing: sp.typing, revealed: sp.revealed,
      own: sp.lines.slice(0, sp.lines.map((x) => x.role).lastIndexOf('choices') + 1).reduce((n, x) => n + x.text.length, 0),
      scroll: sp.scrollLine, max: M1Lab.speechMaxScroll() };
  }, 1600);
  const sent = await sendFrames(sendTimes);
  const restTop = sent[0].c.top;
  const cardText = await page.evaluate(() => M1Lab.cardLayout()[2].text);
  const rising = sent.filter((f) => f.c.shown && f.c.top < restTop);
  const beforeRise = sent.slice(0, sent.findIndex((f) => f.c.top < restTop));
  c('Choice sends: the chosen card holds still while the others leave', beforeRise.some((f) => f.a.left > 0) && beforeRise.every((f) => f.c.left === 0 && f.c.top === restTop && f.c.shown), beforeRise.length);
  c('Choice sends: the others slide away', Math.max(...sent.map((f) => f.a.left)) >= 400, Math.max(...sent.map((f) => f.a.left)));
  c('Choice sends: the chosen card rises', rising.length >= 3, rising.length);
  c('Choice sends: it only ever moves up, on the 2px grid', rising.every((f, i) => (restTop - f.c.top) % 2 === 0 && (i === 0 || f.c.top <= rising[i - 1].c.top)), rising.map((f) => f.c.top));
  const travelled = rising.map((f) => restTop - f.c.top);
  const riseSteps = travelled.slice(1).map((v, i) => v - travelled[i]);
  c('Choice sends: it speeds up as it goes', riseSteps.length >= 2 && riseSteps[riseSteps.length - 1] > riseSteps[0], riseSteps);
  c('Choice sends: it is clipped at the vanish line', rising.every((f) => { const m = /inset\((\d+)px/.exec(f.c.clip || ''); return Math.max(0, -f.c.top) === (m ? Number(m[1]) : 0); }), rising.map((f) => [f.c.top, f.c.clip]));
  const goneAt = sent.findIndex((f, i) => i > 0 && !f.c.shown && sent[i - 1].c.shown);
  c('Choice sends: it disappears behind the divider', goneAt > 0);
  const replyFrames = sent.filter((f) => f.speech === npcLine + '\n' + cardText);
  c('Choice sends: its line appears in the dialogue box after it disappears', replyFrames.length > 0 && sent.indexOf(replyFrames[0]) >= goneAt, { first: sent.indexOf(replyFrames[0]), goneAt });
  const npcAnswer = await page.evaluate(() => M1Lab.samples.npcAnswer);
  const answerFrames = sent.filter((f) => f.speech === npcLine + '\n' + cardText + '\n' + npcAnswer);
  const firstAnswer = sent.indexOf(answerFrames[0]);
  c('Choice sends: your line is added below the NPC line at once, untyped', replyFrames.length > 0 && replyFrames.every((f) => !f.typing && /^(dialogue,)+(choices,?)+$/.test(f.roles)), replyFrames.map((f) => [f.roles, f.typing]));
  c('Choice sends: the box scrolls to your line, and the NPC line is above it to scroll back to', replyFrames.length > 0 && replyFrames.every((f) => f.scroll === f.max), replyFrames.map((f) => [f.scroll, f.max]));
  c('Choice sends: the NPC answer follows after the beat', answerFrames.length > 0 && answerFrames[0].at - replyFrames[0].at >= 90, answerFrames.length && answerFrames[0].at - replyFrames[0].at);
  c('Choice sends: the answer types in below your line, in the dialogue face', answerFrames.some((f) => f.typing) && answerFrames.every((f) => /^(dialogue,)+(choices,)+(dialogue,?)+$/.test(f.roles)), answerFrames.map((f) => f.roles));
  c('Choice sends: your line is never retyped', answerFrames.length > 0 && answerFrames.every((f) => f.revealed >= f.own), answerFrames[0]);
  c('Choice sends: the cards stay away until the answer has typed', sent.slice(firstAnswer).filter((f) => f.typing).every((f) => f.a.left >= 400));
  c('Choice sends: the dialogue box goes back to the NPC line afterwards', sent[sent.length - 1].speech === npcLine, sent[sent.length - 1].speech);
  const last = sent[sent.length - 1];
  c('Choice sends: every card comes back to rest', !last.pick && last.c.shown && last.c.top === restTop && last.c.left === 0 && last.a.left === 0 && !last.c.clip, last);

  const quiet = await sendFrames(Object.assign({}, sendTimes, { send: Object.assign({}, sendTimes.send, { showReply: false }) }));
  c('Choice sends with the reply off leaves the dialogue box alone', quiet.every((f) => f.speech === npcLine) && !quiet[quiet.length - 1].pick);
  const higher = await sendFrames(Object.assign({}, sendTimes, { send: Object.assign({}, sendTimes.send, { edgeOffset: -20 }) }));
  const lastVisible = higher.filter((f) => f.c.shown && f.c.top < restTop).pop();
  c('Choice sends: the vanish line follows its slider', !!lastVisible && lastVisible.c.top + 108 > -20 && lastVisible.c.top < 0, lastVisible);
  await page.evaluate(() => M1Lab.settleMotion());

  await page.click('[data-tune="choice.click"] button[data-value="press"]');
  const pressedOff = await pickFramesNone(page);
  c('Card presses: no reaction from the others', pressedOff === null);
  await reset(page);

  // Snapshots show the placement, never a moment ---------------------------------------------------
  const settled = await page.evaluate(async () => {
    M1Lab.stepInventory(1);
    M1Lab.previewPick(0);
    M1Lab.previewMarker();
    await new Promise((r) => setTimeout(r, 40));
    const canvas = await M1Lab.renderSnapshot();
    return { w: canvas.width, moving: !!M1Lab.rt.inventorySlide, pick: !!M1Lab.rt.choicePick, shown: [...document.querySelectorAll('.slot')].filter((e) => e.offsetParent).length };
  });
  c('a snapshot taken mid-motion settles first', settled.w === 1920 && !settled.moving && !settled.pick && settled.shown === 7, settled);
  await reset(page);

  // Saves from before these controls ------------------------------------------------------------------
  const older = await page.evaluate(() => {
    const s = JSON.parse(M1Lab.exportJson());
    s.inventory.gap = 11;
    delete s.inventory.motion;
    delete s.choices.feedback;
    return JSON.stringify(s);
  });
  c('a layout saved before these controls still imports', await page.evaluate((t) => M1Lab.importText(t), older));
  const kept = await page.evaluate(() => ({ gap: M1Lab.state.inventory.gap, motion: M1Lab.state.inventory.motion, fb: M1Lab.state.choices.feedback }));
  c('it keeps its values and gains the defaults', kept.gap === 11 && kept.motion.durationMs === 190 && kept.fb.click === 'slide', kept);
  await page.evaluate((t) => localStorage.setItem('m1-ui-placement-lab/v1', t), older);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready);
  await openPanels(page);
  c('an autosaved session from before survives a reload', (await page.evaluate(() => M1Lab.state.inventory.gap)) === 11);
  await reset(page);
}

// A card press on its own must not start a pick.
async function pickFramesNone(page) {
  const [x, y] = await centre(page, '[data-comp="choice-0"]');
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.up();
  await page.mouse.move(5, 5);
  return page.evaluate(() => M1Lab.rt.choicePick);
}

async function liveTuning(page, name, base, c) {
  await reset(page);
  await page.setViewportSize(WORK_VIEWPORT);
  await page.click('#viewFit');

  // Every slider, driven with a real mouse -----------------------------------------------
  const rows = await page.evaluate(() => M1Lab.tuningRows());
  c('at least 55 live sliders', rows.length >= 55, rows.length);
  const unmapped = rows.filter((r) => !SLIDER_PATHS[r.id]).map((r) => r.id);
  c('every slider has a checked property', unmapped.length === 0, unmapped);
  c('no stale slider expectations', Object.keys(SLIDER_PATHS).every((id) => rows.some((r) => r.id === id)));
  const badRange = rows.filter((r) => !(r.max > r.min));
  c('every slider has a sensible range', badRange.length === 0, badRange);

  // Overflow on and independent controls unlocked, so every slider has something to do.
  await page.evaluate(() => {
    M1Lab.setChoiceSet('long-list');
    M1Lab.state.demo.speechSample = 'long';
    M1Lab.commit();
    M1Lab.startSpeech();
    M1Lab.finishSpeech();
  });
  const startingPoint = await page.evaluate(() => M1Lab.exportJson());
  const setupFor = (id) => page.evaluate(([sliderId, text]) => {
    const s = JSON.parse(text);
    s.inventory.arrowSizeLinked = false;
    s.utility.sizeLinked = false;
    s.inventory.pitchLocked = sliderId !== 'inv.pitch';
    if (sliderId === 'speech.gap') s.demo.speechSample = 'turn';
    s.choices.feedback.click = /^choice\.press/.test(sliderId) ? 'press' : sliderId === 'choice.dim' ? 'dim'
      : ['choice.sendDelay', 'choice.sendMs', 'choice.pull', 'choice.vanish', 'choice.beat'].includes(sliderId) ? 'send' : 'slide';
    M1Lab.importText(JSON.stringify(s));
    M1Lab.finishSpeech();
  }, [id, startingPoint]);
  await installRecorder(page);

  for (const { id } of rows) {
    await setupFor(id);
    await page.evaluate(() => { window.__rec.events = []; window.__rec.removed = []; });
    await dragSlider(page, id);
    const r = await page.evaluate(() => {
      const ev = window.__rec.events;
      return {
        count: ev.length,
        values: ev.map((e) => e.value),
        sameElement: ev.every((e) => e.target === ev[0].target),
        connected: ev.every((e) => e.connected),
        synced: ev.every((e) => e.value === e.number),
        sigs: new Set(ev.map((e) => e.sig)).size,
        exports: ev.map((e) => e.exported),
        removed: window.__rec.removed
      };
    });
    const distinct = new Set(r.values).size;
    c(`${id}: updates continuously during a drag`, distinct >= 3, r.values);
    c(`${id}: same slider element throughout`, r.sameElement && r.connected);
    c(`${id}: number stays synchronised on every event`, r.synced);
    if (id !== 'choice.count') c(`${id}: no sidebar element removed during the drag`, r.removed.length === 0, r.removed);
    if (!NO_VISIBLE_CHANGE_AT_REST.has(id)) c(`${id}: stage changes during the drag`, r.sigs >= 2, r.sigs);
    const changed = new Set();
    for (let i = 1; i < r.exports.length; i++) changedPaths(r.exports[i - 1], r.exports[i]).forEach((p) => changed.add(p));
    const wrong = [...changed].filter((p) => !SLIDER_PATHS[id].test(p));
    c(`${id}: changes the correct property`, changed.size > 0 && wrong.length === 0, { wrong, changed: [...changed] });
    const fractional = r.exports.some((text) => Object.entries(flatten(JSON.parse(text), '', {}))
      .some(([k, v]) => typeof v === 'number' && !/scale$/.test(k) && !Number.isInteger(v)));
    c(`${id}: values stay whole numbers`, !fractional);
  }
  await page.evaluate(() => { window.__rec.events = []; });
  await reset(page);

  // Keyboard, numbers and ±1 ------------------------------------------------------------------
  const gapRange = '[data-tune="inv.gap"] input[type=range]';
  await page.focus(gapRange);
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  c('arrow keys step a focused slider', (await sliderOf(page, 'inv.gap')) === 10);
  c('slider keeps keyboard focus through updates', await page.$eval(gapRange, (r) => document.activeElement === r));
  c('slot pitch follows the gap', (await page.evaluate(() => M1Lab.state.inventory.pitch)) === 106);

  await page.fill('[data-tune="inv.gap"] input[type=number]', '12');
  c('typing a number moves the slider', (await sliderOf(page, 'inv.gap')) === 12);
  c('typing a number updates the stage live', (await page.evaluate(() => M1Lab.state.inventory.pitch)) === 108);
  c('number input keeps focus while typing', await page.$eval('[data-tune="inv.gap"] input[type=number]', (n) => document.activeElement === n));
  await page.fill('[data-tune="inv.gap"] input[type=number]', '999');
  await page.keyboard.press('Tab');
  c('out-of-range numbers clamp to the slider', (await numberOf(page, 'inv.gap')) === 40 && (await sliderOf(page, 'inv.gap')) === 40);
  await page.click('[data-tune="inv.gap"] button[title="Down 1"]');
  c('minus button steps down one', (await numberOf(page, 'inv.gap')) === 39 && (await sliderOf(page, 'inv.gap')) === 39);
  await page.click('[data-tune="inv.gap"] button[title="Up 1"]');
  c('plus button steps up one', (await numberOf(page, 'inv.gap')) === 40);

  c('changed value is marked', await isModified(page, 'inv.gap'));
  await page.click('[data-tune="inv.gap"] button.reset');
  c('property reset restores the value', (await numberOf(page, 'inv.gap')) === 6);
  c('reset value loses its mark', !(await isModified(page, 'inv.gap')));

  await page.click('[data-tune="arrow.unlink"] input');
  c('pitch stays locked by default', await page.$eval('[data-tune="inv.pitch"] input[type=range]', (r) => r.disabled));
  await page.click('[data-tune="inv.pitchUnlock"] input');
  c('unlocking enables slot pitch', await page.$eval('[data-tune="inv.pitch"] input[type=range]', (r) => !r.disabled));
  c('unlocking disables the derived gap', await page.$eval('[data-tune="inv.gap"] input[type=range]', (r) => r.disabled));
  await reset(page);

  // Six and seven -----------------------------------------------------------------------------
  await setRange(page, 'arrow.size', 40);
  const sizeBefore = await page.evaluate(() => [M1Lab.state.inventory.leftArrow.displayWidth, M1Lab.state.inventory.rightArrow.displayWidth]);
  await page.click('[data-tune="inv.slots"] button[data-value="6"]');
  const six = await page.$$eval('.slot', (ss) => ss.filter((e) => e.offsetParent).length);
  const sizeSix = await page.evaluate(() => [M1Lab.state.inventory.leftArrow.displayWidth, M1Lab.state.inventory.rightArrow.displayWidth]);
  await page.click('[data-tune="inv.slots"] button[data-value="7"]');
  const seven = await page.$$eval('.slot', (ss) => ss.filter((e) => e.offsetParent).length);
  c('six-slot switch', six === 6);
  c('seven-slot switch', seven === 7);
  c('arrows do not grow when switching to six', sizeSix.join() === sizeBefore.join() && sizeBefore[0] === 40, sizeSix);
  await reset(page);

  // One slider shrinks both, one slider spreads both.
  await page.click('[data-tune="inv.slots"] button[data-value="6"]');
  c('six-slot row is not marked as modified', !(await isModified(page, 'inv.x')));
  const a0 = await page.evaluate(() => {
    const i = M1Lab.state.inventory;
    return { lw: i.leftArrow.displayWidth, rw: i.rightArrow.displayWidth, lh: i.leftArrow.displayHeight, lx: i.leftArrow.x, rx: i.rightArrow.x };
  });
  await setRange(page, 'arrow.size', 40);
  const a1 = await page.evaluate(() => {
    const i = M1Lab.state.inventory;
    return { lw: i.leftArrow.displayWidth, rw: i.rightArrow.displayWidth, lh: i.leftArrow.displayHeight, ri: i.rightArrow.y };
  });
  c('one slider shrinks both arrows', a1.lw === 40 && a1.rw === 40 && a1.lh < a0.lh, a1);
  const domArrow = await page.$eval('#inv-right', (e) => [e.style.width, e.style.height]);
  c('arrow element takes the displayed size', domArrow[0] === '40px' && domArrow[1] === `${a1.lh}px`, domArrow);
  const spread0 = await numberOf(page, 'arrow.spread');
  const pos0 = await page.evaluate(() => [M1Lab.state.inventory.leftArrow.x, M1Lab.state.inventory.rightArrow.x]);
  await setRange(page, 'arrow.spread', spread0 + 10);
  const pos1 = await page.evaluate(() => [M1Lab.state.inventory.leftArrow.x, M1Lab.state.inventory.rightArrow.x]);
  c('outward spacing moves left arrow left', pos1[0] === pos0[0] - 10, { pos0, pos1 });
  c('outward spacing moves right arrow right', pos1[1] === pos0[1] + 10, { pos0, pos1 });
  await setRange(page, 'arrow.size', 41);
  await setRange(page, 'arrow.size', 40);
  await setRange(page, 'arrow.size', 41);
  await setRange(page, 'arrow.size', 40);
  c('resizing back and forth does not walk the arrows', (await page.evaluate(() => M1Lab.state.inventory.leftArrow.y)) === a1.ri);
  c('spacing is unaffected by arrow size', (await numberOf(page, 'arrow.spread')) === spread0 + 10);

  await reset(page);
  await page.click('[data-tune="arrow.symmetric"] input');
  await setRange(page, 'arrow.leftX', 30);
  const sym = await page.evaluate(() => {
    const i = M1Lab.state.inventory;
    const l = i.slotLayouts[i.slotCount];
    const right = l.x + (i.slotCount - 1) * i.pitch + 96;
    return [l.x - (i.leftArrow.x + i.leftArrow.displayWidth), i.rightArrow.x - right];
  });
  c('symmetric toggle mirrors the arrows', sym[0] === sym[1], sym);
  await reset(page);
  await page.click('[data-tune="inv.center"] input');
  await setRange(page, 'inv.gap', 20);
  const centred = await page.evaluate(() => {
    const i = M1Lab.state.inventory;
    const l = i.slotLayouts[i.slotCount];
    return Math.abs(l.x + ((i.slotCount - 1) * i.pitch + 96) / 2 - 430);
  });
  c('group centring holds the row in the bay', centred <= 0.5, centred);
  await reset(page);

  // Starter preset.
  const starter = await page.$('[data-tune-action="starter:six-small-wide"]');
  c('starter preset has the requested name', (await starter.textContent()) === '6 slots · Small arrows · Wider spacing');
  await starter.click();
  const st = await page.evaluate(() => {
    const i = M1Lab.state.inventory;
    return { n: i.slotCount, lw: i.leftArrow.displayWidth, rw: i.rightArrow.displayWidth, lx: i.leftArrow.x, rx: i.rightArrow.x, slot: i.slotLayouts['6'].x };
  });
  c('starter gives six slots', st.n === 6, st);
  c('starter arrows are smaller than the seven-slot baseline', st.lw < 52 && st.rw < 52, st);
  c('starter arrows sit wider than the baseline six-slot gap', st.slot - (st.lx + st.lw) > 12, st);
  const slotSrc = await page.$eval('.slot img', (i) => [i.getAttribute('src').split('/').pop(), i.getBoundingClientRect().width / M1Lab.viewScale()]);
  c('starter keeps the 96x96 slot', slotSrc[0] === 'inventory_slot.png' && slotSrc[1] === 96, slotSrc);
  await page.click('[data-tune-action="starter:seven-baseline"]');
  const back = await page.evaluate(() => {
    const i = M1Lab.state.inventory;
    const b = M1Lab.baseline.inventory;
    return ['slotCount', 'gap', 'pitch'].every((k) => i[k] === b[k]) && i.leftArrow.x === b.leftArrow.x && i.rightArrow.x === b.rightArrow.x && i.leftArrow.displayWidth === b.leftArrow.displayWidth;
  });
  c('seven-slot preset returns to the original layout', back);
  await reset(page);

  // Utility -------------------------------------------------------------------------------------
  const buttons = () => page.evaluate(() => M1Lab.state.utility.buttons.map((b) => ({ x: b.x, y: b.y, w: b.displayWidth, h: b.displayHeight, s: b.scale })));
  await setRange(page, 'util.width', 110);
  const small = await buttons();
  c('width slider updates all three buttons', small.every((b) => b.w === 110 && b.h === small[0].h), small);
  const dom = await page.$$eval('.utility', (e) => e.map((n) => n.style.width));
  c('all three button elements resize', dom.every((w) => w === '110px'), dom);
  c('resizing keeps the gap', small[1].x - (small[0].x + 110) === 4, small);
  c('resized group stays centred', Math.abs(small[0].x + (small[2].x + 110 - small[0].x) / 2 - 1684.5) <= 0.5, small);
  await setRange(page, 'util.gap', 20);
  const spaced = await buttons();
  c('gap slider spaces all three buttons', spaced[1].x - (spaced[0].x + 110) === 20 && spaced[2].x - (spaced[1].x + 110) === 20, spaced);
  await page.click('[data-tune="util.align"] button[data-value="left"]');
  c('left alignment reaches the bay edge', (await buttons())[0].x === 1474);
  await page.click('[data-tune="util.align"] button[data-value="right"]');
  const rightAligned = await buttons();
  c('right alignment reaches the bay edge', rightAligned[2].x + 110 === 1895, rightAligned);
  await setRange(page, 'util.x', 1500);
  c('moving the group frees its alignment', (await page.evaluate(() => M1Lab.state.utility.align)) === 'free');
  await setRange(page, 'util.pressX', 4);
  await setRange(page, 'util.pressY', 5);
  await page.click('#view1x');
  const lb = await rectOf(page, '#util-notes canvas');
  await pressAndHold(page, '#util-notes');
  const ld = await rectOf(page, '#util-notes canvas');
  await page.mouse.up();
  await page.click('#viewFit');
  c('pressed label travel follows its sliders', ld.x - lb.x === 4 && ld.y - lb.y === 5, { lb, ld });
  await reset(page);

  await page.click('[data-tune="util.unlink"] input');
  await setRange(page, 'util.notes.w', 100);
  const own = await buttons();
  c('unlocked size changes one button only', own[1].w === 100 && own[0].w === 135 && own[2].w === 135, own);
  await reset(page);

  // Choices -------------------------------------------------------------------------------------
  await setRange(page, 'choice.count', 5);
  c('choice count slider changes the list', (await page.evaluate(() => M1Lab.cardLayout().length)) === 5);
  const heights = await page.evaluate(() => M1Lab.cardLayout().map((k) => k.height));
  c('cards keep their native heights', heights.every((h) => [80, 108, 136, 164].includes(h)), heights);
  await page.fill('[data-card-text="1"]', 'A NEW LINE TYPED IN THE PANEL.');
  c('card text edits live', (await page.evaluate(() => M1Lab.cardLayout()[1].text)) === 'A NEW LINE TYPED IN THE PANEL.');
  c('card text box keeps focus', await page.$eval('[data-card-text="1"]', (t) => document.activeElement === t));
  await page.evaluate(() => document.activeElement.blur());
  await reset(page);
  await setRange(page, 'choice.padRight', 90);
  c('right padding narrows the wrap width', (await numberOf(page, 'choice.wrap')) === 548 - 29 - 90);
  await setRange(page, 'choice.padLeft', 40);
  c('left padding holds the right padding', (await numberOf(page, 'choice.padRight')) === 90 && (await numberOf(page, 'choice.wrap')) === 548 - 40 - 90);
  await page.click('[data-tune="choice.click"] button[data-value="press"]');
  await setRange(page, 'choice.pressX', 5);
  await setRange(page, 'choice.pressY', 1);
  await page.click('#view1x');
  const cb = await rectOf(page, '[data-comp="choice-0"]');
  await pressAndHold(page, '[data-comp="choice-0"]');
  const cd = await rectOf(page, '[data-comp="choice-0"]');
  await page.mouse.up();
  await page.click('#viewFit');
  c('choice press offset follows its sliders', cd.x - cb.x === 5 && cd.y - cb.y === 1, { cb, cd });
  await reset(page);

  // Scrollbar -----------------------------------------------------------------------------------
  await page.click('[data-tune-action="tune-scroll:bottom"]');
  const atBottom = await page.evaluate(() => ({ t: M1Lab.thumbMetrics(), s: M1Lab.state.scrollbar.track, max: M1Lab.maxChoiceScroll(), at: M1Lab.rt.choiceScroll }));
  c('thumb demonstration reaches the bottom', atBottom.at === atBottom.max && atBottom.max > 0 && atBottom.t.y + atBottom.t.height === atBottom.s.y + atBottom.s.height, atBottom);
  await setRange(page, 'track.top', 20);
  await setRange(page, 'track.bottom', 30);
  await page.click('[data-tune-action="tune-scroll:top"]');
  const inset = await page.evaluate(() => M1Lab.thumbMetrics());
  c('track top inset moves the thumb limit', inset.y === 536 + 20, inset);
  await page.click('[data-tune-action="tune-scroll:bottom"]');
  const insetEnd = await page.evaluate(() => M1Lab.thumbMetrics());
  c('track bottom inset moves the thumb limit', insetEnd.y + insetEnd.height === 852 - 30, insetEnd);
  await setRange(page, 'thumb.min', 180);
  c('minimum height holds the thumb', (await page.evaluate(() => M1Lab.thumbMetrics().height)) === 180);
  await setRange(page, 'thumb.width', 30);
  const capped = await page.evaluate(() => M1Lab.state.scrollbar.thumb);
  c('thumb caps scale with its width', capped.displayWidth === 30 && capped.capHeight === 15, capped);
  await reset(page);

  // Group and global reset -----------------------------------------------------------------------
  const groupReset = async (group, sliderId, value, paths) => {
    await setRange(page, sliderId, value);
    const other = group === 'inventory' ? 'util.gap' : 'inv.gap';
    await setRange(page, other, 15);
    await page.click(`[data-reset-group="${group}"]`);
    const b = JSON.stringify(baseline);
    const left = changedPaths(b, await page.evaluate(() => M1Lab.exportJson()));
    c(`${group} group reset restores its values`, !left.some((p) => paths.test(p)), left);
    c(`${group} group reset leaves other groups alone`, left.length > 0, left);
    await reset(page);
  };
  await groupReset('inventory', 'arrow.size', 40, /^inventory/);
  await groupReset('utility', 'util.width', 120, /^utility/);
  await groupReset('choices', 'choice.gap', 20, /^choices/);
  await groupReset('scrollbar', 'thumb.x', 1870, /^scrollbar/);
  await groupReset('objective', 'body.top', 30, /^objective/);
  await groupReset('speech', 'speech.left', 40, /^speech/);

  await setRange(page, 'arrow.size', 40);
  await setRange(page, 'util.gap', 20);
  await setRange(page, 'body.line', 30);
  const beforeUndo = await page.evaluate(() => M1Lab.exportJson());
  c('group badge counts changes', /changed/.test(await page.$eval('[data-group="inventory"] .badge', (b) => b.textContent)));
  await reset(page);
  c('Reset everything restores the baseline', JSON.stringify(JSON.parse(await page.evaluate(() => M1Lab.exportJson()))) === JSON.stringify(baseline));
  c('Reset everything clears every mark', (await page.$$eval('#liveTuning .modified', (m) => m.length)) === 0);
  c('sliders return to baseline values', (await sliderOf(page, 'arrow.size')) === 52 && (await sliderOf(page, 'util.gap')) === 4);
  await page.click('#undoReset');
  c('a reset can be undone', (await page.evaluate(() => M1Lab.exportJson())) === beforeUndo);
  await reset(page);

  // Import restores sliders ----------------------------------------------------------------------
  await page.click('[data-tune="inv.slots"] button[data-value="6"]');
  await setRange(page, 'arrow.size', 40);
  await setRange(page, 'util.width', 118);
  await setRange(page, 'body.left', 50);
  await setRange(page, 'thumb.width', 24);
  const saved = await page.evaluate(() => M1Lab.exportJson());
  const savedSliders = await page.$$eval('#liveTuning .tune', (t) => t.map((l) => l.querySelector('input[type=range]').value).join());
  const savedStage = await page.evaluate(() => window.__stageSig());
  await reset(page);
  await page.fill('#jsonBox', saved);
  await page.click('#importJson');
  await page.waitForTimeout(30);
  c('import restores all slider values', savedSliders === (await page.$$eval('#liveTuning .tune', (t) => t.map((l) => l.querySelector('input[type=range]').value).join())));
  c('import restores numeric inputs', (await numberOf(page, 'arrow.size')) === 40 && (await numberOf(page, 'body.left')) === 50);
  c('import restores rendered placements', savedStage === (await page.evaluate(() => window.__stageSig())));
  await page.fill('#jsonBox', '');
  await reset(page);

  // A file saved by the previous lab still opens.
  const v1 = fs.readFileSync(path.join(__dirname, 'fixtures/placement.v1_222e781.json'), 'utf8'); // the v1 lab's defaults, commit 222e781
  const v1Edited = JSON.parse(v1);
  v1Edited.utility.buttons[1].x = 1640;
  v1Edited.inventory.leftArrow.x = 30;
  await page.fill('#jsonBox', JSON.stringify(v1Edited));
  await page.click('#importJson');
  await page.waitForTimeout(30);
  const upgraded = await page.evaluate(() => ({ schema: JSON.parse(M1Lab.exportJson()).schema, x: M1Lab.state.utility.buttons[1].x, left: M1Lab.state.inventory.leftArrow.x, gap: M1Lab.state.inventory.gap }));
  c('v1 placement imports and upgrades', upgraded.schema === 'm1-ui-placement-v2' && upgraded.x === 1640 && upgraded.left === 30 && upgraded.gap === 6, upgraded);
  await page.fill('#jsonBox', '');
  await reset(page);

  // Unsaved versus exported, autosave ----------------------------------------------------------
  const saveState = () => page.$eval('#saveState', (e) => e.dataset.state);
  c('baseline state is shown', (await saveState()) === 'baseline');
  await setRange(page, 'inv.gap', 9);
  c('an edit shows as not exported', (await saveState()) === 'unexported');
  await page.click('#copyJson');
  c('copying shows as exported', (await saveState()) === 'exported');
  await setRange(page, 'inv.gap', 10);
  c('a later edit shows as not exported again', (await saveState()) === 'unexported');
  c('edits autosave immediately',
    (await page.evaluate(() => JSON.parse(localStorage.getItem('m1-ui-placement-lab/v1')).inventory.gap)) === 10);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.ready);
  await openPanels(page);
  c('autosaved slider value returns after reload', (await sliderOf(page, 'inv.gap')) === 10);
  c('unexported status survives reload', (await saveState()) === 'unexported');
  await installRecorder(page);
  await reset(page);

  // Overflow warnings --------------------------------------------------------------------------
  const warned = () => page.$$eval('#warningsList [data-warning]', (w) => w.map((e) => e.dataset.warning));
  c('baseline raises no warnings', (await warned()).length === 0, await warned());
  await setRange(page, 'arrow.spread', -10);
  c('overlap raises a warning', (await warned()).some((w) => w.startsWith('arrow-slots')), await warned());
  c('warning is marked on the stage', (await page.$$eval('.warning-mark', (m) => m.length)) > 0);
  await page.uncheck('#toggleWarnings');
  c('warnings can be switched off', (await page.$eval('#warningsList', (e) => e.hidden)) && (await page.$eval('#warningMarks', (e) => e.hidden)));
  await page.check('#toggleWarnings');
  await reset(page);

  // Save Layout Snapshot ------------------------------------------------------------------------
  await page.click('[data-tune-action="starter:six-small-wide"]');
  await page.click('#view1x');
  await page.evaluate(() => M1Lab.finishSpeech());
  const downloads = [];
  const onDownload = (d) => downloads.push(d);
  page.on('download', onDownload);
  await page.click('#saveSnapshot');
  await page.waitForFunction(() => /Saved/.test(document.getElementById('jsonStatus').textContent));
  await page.waitForTimeout(300);
  page.off('download', onDownload);
  const names = downloads.map((d) => d.suggestedFilename()).sort();
  c('snapshot downloads JSON and PNG', names.length === 2 && /\.json$/.test(names[0]) && /\.png$/.test(names[1]), names);
  c('snapshot marks the layout exported', (await saveState()) === 'exported');
  const jsonDl = downloads.find((d) => /\.json$/.test(d.suggestedFilename()));
  const pngDl = downloads.find((d) => /\.png$/.test(d.suggestedFilename()));
  c('snapshot JSON is the placement', fs.readFileSync(await jsonDl.path(), 'utf8') === (await page.evaluate(() => M1Lab.exportJson())));
  const pngBytes = fs.readFileSync(await pngDl.path());
  const snapPixels = await pngPixels(page, pngBytes);
  c('snapshot PNG is 1920x1080', snapPixels.w === 1920 && snapPixels.h === 1080, [snapPixels.w, snapPixels.h]);
  await enterClean1x(page);
  await page.waitForTimeout(260);
  await page.mouse.move(5, 5);
  const screen = await pngPixels(page, await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } }));
  await page.keyboard.press('Escape');
  await page.click('#viewFit');
  await page.setViewportSize(WORK_VIEWPORT);
  let differ = 0;
  for (let i = 0; i < screen.data.length; i += 4) {
    if (Math.max(Math.abs(screen.data[i] - snapPixels.data[i]), Math.abs(screen.data[i + 1] - snapPixels.data[i + 1]), Math.abs(screen.data[i + 2] - snapPixels.data[i + 2])) > 8) differ++;
  }
  c('snapshot PNG matches the stage', differ < 400, differ);
  check(name, 'snapshot differing pixels (information)', true, differ);
  if (name === 'chromium') fs.writeFileSync(path.join(SHOTS, '09_snapshot_png_six_small_wide.png'), pngBytes);

  // The owner's whole session, start to finish -----------------------------------------------------
  await reset(page);
  await page.click('[data-tune="inv.slots"] button[data-value="6"]');
  await dragSlider(page, 'arrow.size');
  await setRange(page, 'arrow.size', 42);
  await setRange(page, 'arrow.spread', 50);
  await setRange(page, 'inv.gap', 10);
  await setRange(page, 'inv.y', 930);
  await setRange(page, 'util.width', 124);
  await setRange(page, 'util.gap', 12);
  await setRange(page, 'choice.padRight', 70);
  await setRange(page, 'body.left', 44);
  const finalLayout = await page.evaluate(() => M1Lab.exportJson());
  await page.waitForTimeout(100);
  if (name === 'chromium') {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.$$eval('#sidebar details', (all) => all.forEach((d) => { d.open = d.classList.contains('tune-group') && ['inventory', 'utility'].includes(d.dataset.group); }));
    await page.evaluate(() => { M1Lab.finishSpeech(); document.getElementById('sidebar').scrollTop = 0; });
    await page.waitForTimeout(100);
    fs.writeFileSync(path.join(SHOTS, '10_live_tuning_panel_in_use.png'), await page.screenshot());
    await openPanels(page);
    await page.setViewportSize(WORK_VIEWPORT);
  }
  await page.click('#copyJson');
  c('whole owner session exports without code or JSON edits', (await page.$eval('#jsonBox', (b) => b.value)) === finalLayout);
  const session = JSON.parse(finalLayout);
  c('session result holds every requested change',
    session.inventory.slotCount === 6 && session.inventory.gap === 10 && session.inventory.leftArrow.displayWidth === 42 && session.utility.buttons[2].displayWidth === 124 && session.objective.body.x === 859 + 44,
    session.inventory.slotCount);
  await page.fill('#jsonBox', '');
  await reset(page);
}

async function shotClip(page, browserName, file, box) {
  if (browserName !== 'chromium') return;
  const pad = 12;
  const png = await page.screenshot({ clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + pad * 2, height: box.h + pad * 2 } });
  fs.writeFileSync(path.join(SHOTS, file + '.png'), png);
}

async function setSelectViaLab(page, set) {
  await page.evaluate((s) => M1Lab.setChoiceSet(s), set);
}

// file:// smoke, since that is how the owner opens it --------------------------------------
// Typefaces -----------------------------------------------------------------------------------------
async function typefaces(page, c) {
  await reset(page);
  const ROLES = ['dialogue', 'choices', 'labels', 'objective'];
  const faces = await page.evaluate(() => Object.keys(M1Lab.faces));
  c('typeface menus list the locked font and every baked face', faces[0] === 'locked' && faces.length === 4, faces);
  const inksIn = () => page.evaluate(() => {
    M1Lab.finishSpeech();
    const inks = (canvas, want) => {
      const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      let bad = 0;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        ink++;
        sum = (sum * 31 + i) % 1000000007;
        const hex = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        if (d[i + 3] !== 255 || hex !== want) bad++;
      }
      return { ink, bad, sig: canvas.width + 'x' + canvas.height + ':' + sum };
    };
    return {
      state: Object.assign({}, M1Lab.state.typeface),
      dialogue: inks(document.querySelector('#speechText canvas'), '#203037'),
      choices: inks(document.querySelector('[data-comp="choice-0"] .card-text'), '#203037'),
      labels: inks(document.querySelector('#util-notes .label'), '#f1d898'),
      item: inks(document.querySelector('.slot .item-label'), '#f1d898'),
      objective: inks(document.getElementById('objectiveBody'), '#f1d898'),
      title: inks(document.getElementById('objectiveTitle'), '#f1d898'),
      notesLabelW: document.querySelector('#util-notes .label').width,
      notesInk: M1Lab.inkWidth('NOTES', 'labels')
    };
  });
  const before = await inksIn();
  c('the Typeface group has a menu for each of the four kinds of text', (await page.$$eval('[data-tune^="type."] select', (s) => s.map((e) => e.closest('[data-tune]').dataset.tune))).join() === 'type.dialogue,type.choices,type.labels,type.objective');

  // Each menu changes its own text and nothing else.
  const parts = { dialogue: ['dialogue'], choices: ['choices'], labels: ['labels', 'item'], objective: ['objective', 'title'] };
  for (const role of ROLES) {
    await page.selectOption(`[data-tune="type.${role}"] select`, 'jersey15-1x');
    const after = await inksIn();
    const changed = Object.keys(parts).flatMap((k) => parts[k]).filter((p) => after[p].sig !== before[p].sig);
    c(`${role} menu changes only its own text`, changed.sort().join() === parts[role].slice().sort().join(), changed);
    c(`${role} menu marks itself modified`, await page.$eval(`[data-tune="type.${role}"]`, (e) => e.classList.contains('modified')));
    await page.selectOption(`[data-tune="type.${role}"] select`, 'locked');
  }

  // Your line and the NPC's together in the dialogue box, each in its own face.
  await page.selectOption('[data-tune="speech.sample"] select', 'turn');
  const halves = () => page.evaluate(() => {
    M1Lab.finishSpeech();
    const canvas = document.querySelector('#speechText canvas');
    const lh = M1Lab.state.speech.text.lineHeight;
    const own = M1Lab.rt.speech.lines.filter((x) => x.role === 'choices').length;
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const sig = (y0, y1) => { let h = 0; let ink = 0; let bad = 0; for (let i = y0 * canvas.width * 4; i < Math.min(d.length, y1 * canvas.width * 4); i += 4) { if (!d[i + 3]) continue; ink++; h = (h * 31 + i) % 1000000007; if (d[i + 3] !== 255 || d[i] !== 0x20 || d[i + 1] !== 0x30 || d[i + 2] !== 0x37) bad++; } return { h, ink, bad }; };
    return { own, roles: M1Lab.rt.speech.lines.map((x) => x.role).join(), you: sig(0, own * lh), npc: sig(own * lh, canvas.height) };
  });
  const turn0 = await halves();
  c('Box shows "Your line + NPC reply": your line first, then the NPC line', turn0.own > 0 && /^(choices,)+(dialogue,?)+$/.test(turn0.roles), turn0.roles);
  c('Box shows "Your line + NPC reply": your line is on screen at once, untyped', await page.evaluate(() => { M1Lab.startSpeech(); const s = M1Lab.rt.speech; return s.typing && s.revealed === s.lines.filter((x) => x.role === 'choices').reduce((n, x) => n + x.text.length, 0); }));
  await page.selectOption('[data-tune="type.choices"] select', 'pressstart2p-2x');
  const turnYou = await halves();
  const gapped = await page.evaluate(() => {
    const canvas = document.querySelector('#speechText canvas');
    const t = M1Lab.state.speech.text;
    const own = M1Lab.rt.speech.lines.filter((x) => x.role === 'choices').length;
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const inkRow = (y) => { for (let x = 0; x < canvas.width; x++) if (d[(y * canvas.width + x) * 4 + 3]) return true; return false; };
    let first = -1;
    for (let y = own * t.lineHeight; y < canvas.height && first < 0; y++) if (inkRow(y)) first = y;
    return { first, start: own * t.lineHeight, gap: t.speakerGap };
  });
  c('the NPC line sits one speaker gap below your line', gapped.gap > 0 && gapped.first >= gapped.start + gapped.gap, gapped);
  c('the Choices face changes your line in the dialogue box and not the NPC line', turnYou.you.h !== turn0.you.h && turnYou.npc.h === turn0.npc.h, [turn0, turnYou]);
  await page.selectOption('[data-tune="type.dialogue"] select', 'jersey15-1x');
  const turnBoth = await halves();
  c('the Dialogue face changes the NPC line and not yours', turnBoth.npc.h !== turnYou.npc.h && turnBoth.you.h === turnYou.you.h, [turnYou, turnBoth]);
  c('two faces in one box: every pixel exactly the dark ink, fully opaque', turnBoth.you.ink > 30 && turnBoth.npc.ink > 30 && turnBoth.you.bad + turnBoth.npc.bad === 0, turnBoth);
  await reset(page);

  for (const id of faces.filter((f) => f !== 'locked')) {
    for (const role of ROLES) await page.selectOption(`[data-tune="type.${role}"] select`, id);
    const r = await inksIn();
    const all = ['dialogue', 'choices', 'labels', 'item', 'objective', 'title'];
    c(`${id}: chosen from all four menus`, ROLES.every((role) => r.state[role] === id), r.state);
    c(`${id}: every kind of text draws`, all.every((k) => r[k].ink > 30), all.map((k) => r[k].ink));
    c(`${id}: every text pixel is exactly its ink, fully opaque`, all.every((k) => r[k].bad === 0), all.map((k) => r[k].bad));
    c(`${id}: label canvas is measured in this face`, r.notesLabelW === r.notesInk, r);
  }
  await reset(page);
  const wrapSig = () => page.evaluate(() => M1Lab.wrap(M1Lab.speechText(), M1Lab.state.speech.text.width, 'dialogue')
    .map((l) => M1Lab.inkWidth(l, 'dialogue')).join());
  const lockedWrap = await wrapSig();
  await page.selectOption('[data-tune="type.dialogue"] select', 'pressstart2p-2x');
  const bigWrap = await wrapSig();
  c('dialogue wrapping follows the dialogue face', bigWrap !== lockedWrap, { lockedWrap, bigWrap });
  await page.selectOption('[data-tune="type.labels"] select', 'pressstart2p-2x');
  await setRange(page, 'util.width', 100);
  const warned = await page.evaluate(() => M1Lab.warnings().map((w) => w.id));
  c('a label face too wide for its button raises the warning', warned.some((w) => /-label$/.test(w)), warned);
  const shot = await page.evaluate(async () => (await M1Lab.renderSnapshot()).width);
  c('snapshot renders with baked faces', shot === 1920);
  await reset(page);
  c('reset returns all four to the locked font', JSON.stringify(await page.evaluate(() => M1Lab.state.typeface)) === '{"dialogue":"locked","choices":"locked","labels":"locked","objective":"locked"}');

  // A save from the two-menu trial keeps its body choice for all three body roles.
  const twoMenu = await page.evaluate(() => {
    const s = JSON.parse(M1Lab.exportJson());
    s.typeface = { body: 'jersey15-1x', labels: 'tiny5-3x' };
    return JSON.stringify(s);
  });
  c('a save with the earlier Body and Labels menus still imports', await page.evaluate((t) => M1Lab.importText(t), twoMenu));
  const dropped = await page.evaluate(() => {
    const s = JSON.parse(M1Lab.exportJson());
    s.typeface = { dialogue: 'kenneyblocks-2x', choices: 'jersey15-1x', labels: 'locked', objective: 'locked' };
    return JSON.stringify(s);
  });
  const droppedOk = await page.evaluate((t) => M1Lab.importText(t), dropped);
  const droppedState = await page.evaluate(() => Object.assign({}, M1Lab.state.typeface));
  c('a save naming a dropped face imports with that role on the locked font', droppedOk && droppedState.dialogue === 'locked' && droppedState.choices === 'jersey15-1x', droppedState);
  await page.evaluate((t) => M1Lab.importText(t), twoMenu);
  c('its Body choice carries to dialogue, choices and objective', JSON.stringify(await page.evaluate(() => M1Lab.state.typeface)) === '{"dialogue":"jersey15-1x","choices":"jersey15-1x","labels":"tiny5-3x","objective":"jersey15-1x"}', await page.evaluate(() => M1Lab.state.typeface));
  await reset(page);
}

// Label or glyph on the utility buttons ------------------------------------------------------------
async function actionGlyphs(page, name, c) {
  await reset(page);
  await openPanels(page);
  c('label mode makes no glyph images', (await page.$$eval('#layer-utility img.glyph', (g) => g.length)) === 0);
  await page.click('[data-tune="util.show"] button[data-value="glyph"]');
  const state = () => page.evaluate(() => [...document.querySelectorAll('#layer-utility .hit')].map((btn) => {
    const g = btn.querySelector('img.glyph');
    const stage = document.getElementById('stage').getBoundingClientRect();
    const k = M1Lab.viewScale();
    const r = g && g.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    return {
      glyph: btn.dataset.glyph,
      src: g && g.getAttribute('src'),
      natural: g && [g.naturalWidth, g.naturalHeight],
      shown: !!(g && g.getClientRects().length),
      label: btn.querySelector('canvas.label').getClientRects().length > 0,
      dx: r && Math.round((r.x - b.x) / k),
      dy: r && Math.round((r.y - b.y) / k),
      w: r && Math.round(r.width / k),
      h: r && Math.round(r.height / k),
      state: btn.dataset.state,
      bw: Math.round(b.width / k),
      bh: Math.round(b.height / k)
    };
  }));
  await page.waitForFunction(() => [...document.querySelectorAll('#layer-utility img.glyph')].every((g) => g.complete && g.naturalWidth));
  let s = await state();
  const glyphs = await page.evaluate(() => M1Lab.actionGlyphs);
  c('glyph mode shows each button\'s glyph and hides its label',
    s.length === 3 && s.every((b, i) => b.shown && !b.label && b.glyph === baseline.utility.buttons[i].glyph && b.src === glyphs[b.glyph].file), s);
  c('glyphs are drawn 1:1 at the file size',
    s.every((b) => b.w === b.natural[0] && b.h === b.natural[1] && b.w === glyphs[b.glyph].size[0]), s);
  const offs = baseline.utility.buttons.map((b) => b.labelOffset);
  c('glyphs sit centred on their buttons, moved by the label offsets',
    s.every((b, i) => b.dx === Math.floor((b.bw - b.w) / 2) + offs[i].dx && b.dy === Math.floor((b.bh - b.h) / 2) + offs[i].dy), s);
  const warned = await page.$$eval('#warningsList [data-warning]', (w) => w.map((e) => e.dataset.warning));
  c('glyph mode at baseline raises no warnings', warned.length === 0, warned);

  await page.selectOption('[data-tune="util.notes.glyph"] select', 'wait_1');
  s = await state();
  c('a button\'s glyph menu changes only that button', s[1].glyph === 'wait_1' && s[1].src === glyphs.wait_1.file && s[0].glyph === baseline.utility.buttons[0].glyph && s[2].glyph === baseline.utility.buttons[2].glyph, s);
  const options = await page.$$eval('[data-tune="util.inspect.glyph"] option', (o) => o.map((x) => x.value));
  c('glyph menus list every candidate', JSON.stringify(options) === JSON.stringify(Object.keys(glyphs)), options);

  await setRange(page, 'util.labelX', 6);
  await setRange(page, 'util.labelY', -4);
  const moved = await state();
  c('the X and Y offsets move the glyph', moved.every((b, i) => b.dx === s[i].dx + 6 - offs[i].dx && b.dy === s[i].dy - 4 - offs[i].dy), moved);
  await pressAndHold(page, '#util-inspect');
  const held = await state();
  const press = await page.evaluate(() => M1Lab.state.utility.pressedLabelOffset);
  c('pressing swaps to the DOWN sprite and moves the glyph by the pressed offset',
    held[0].state === 'down' && held[0].dx === moved[0].dx + press.dx && held[0].dy === moved[0].dy + press.dy && held[1].dx === moved[1].dx, held[0]);
  await page.mouse.up();
  c('releasing puts the glyph back', (await state())[0].dx === moved[0].dx);

  const snap = await page.evaluate(async () => {
    const canvas = await M1Lab.renderSnapshot();
    const ctx = canvas.getContext('2d');
    const stage = document.getElementById('stage').getBoundingClientRect();
    const k = M1Lab.viewScale();
    const out = [];
    for (const g of document.querySelectorAll('#layer-utility img.glyph')) {
      if (!g.getClientRects().length) continue;
      const r = g.getBoundingClientRect();
      const x = Math.round((r.x - stage.x) / k);
      const y = Math.round((r.y - stage.y) / k);
      const name = g.closest('.hit').dataset.glyph;
      const img = new Image();
      img.src = window.M1_SNAPSHOT_ASSETS['glyph:' + name];
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      const want = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const got = ctx.getImageData(x, y, c.width, c.height).data;
      let opaque = 0;
      let bad = 0;
      for (let i = 0; i < want.length; i += 4) {
        if (want[i + 3] !== 255) continue;
        opaque++;
        if (want[i] !== got[i] || want[i + 1] !== got[i + 1] || want[i + 2] !== got[i + 2]) bad++;
      }
      out.push({ name, opaque, bad });
    }
    return out;
  });
  c('the snapshot paints each glyph with its exact pixels', snap.length === 3 && snap.every((g) => g.opaque > 500 && g.bad === 0), snap);

  const saved = await page.evaluate(() => JSON.parse(M1Lab.exportJson()).utility);
  c('the export records glyph mode and each button\'s glyph', saved.show === 'glyph' && saved.buttons[1].glyph === 'wait_1');
  const odd = await page.evaluate(() => {
    const v = JSON.parse(M1Lab.exportJson());
    v.utility.buttons[0].glyph = 'teapot';
    delete v.utility.show;
    v.utility.buttons.forEach((b) => { delete b.glyph; });
    v.utility.buttons[2].glyph = 'call';
    const ok = M1Lab.importText(JSON.stringify(v));
    return { ok, show: M1Lab.state.utility.show, glyphs: M1Lab.state.utility.buttons.map((b) => b.glyph) };
  });
  c('a save from before glyphs imports in label mode with the default glyphs, keeping any it names',
    odd.ok && odd.show === 'label' && odd.glyphs[0] === baseline.utility.buttons[0].glyph && odd.glyphs[2] === 'call', odd);
  const teapot = await page.evaluate(() => {
    const v = JSON.parse(M1Lab.exportJson());
    v.utility.buttons[0].glyph = 'teapot';
    const ok = M1Lab.importText(JSON.stringify(v));
    return { ok, glyph: M1Lab.state.utility.buttons[0].glyph };
  });
  c('a save naming a dropped glyph falls back to the button\'s default', teapot.ok && teapot.glyph === baseline.utility.buttons[0].glyph, teapot);
  await page.click('[data-tune="util.show"] button[data-value="glyph"]');
  await shotClip(page, name, '11_utility_glyphs', await rectOf(page, '#layer-utility .hit:first-child').then(async (a) => {
    const z = await rectOf(page, '#layer-utility .hit:last-child');
    return { x: a.x, y: a.y, w: z.x + z.w - a.x, h: z.h };
  }));
  await reset(page);
  c('reset returns the buttons to labels', (await state()).every((b) => b.label && !b.shown));
}

// The owner's real defaults, loaded without the QA test layout ---------------------------------
async function shippedDefaults(name, base) {
  const c = (label, ok, detail) => check(name, label, ok, detail);
  const browser = await playwright[name].launch();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => errors.push(r.url()));
  await page.goto(base + '/' + LAB_URL);
  await page.waitForFunction(() => document.body.dataset.ready);
  c('shipped defaults: the lab loads without errors', (await page.evaluate(() => document.body.dataset.ready)) === 'true' && errors.length === 0, errors);
  c('shipped defaults: the lab starts on placement.default.json', JSON.stringify(JSON.parse(await page.evaluate(() => M1Lab.exportJson()))) === JSON.stringify(shipped));
  c('shipped defaults: shown as the baseline', (await page.$eval('#saveState', (e) => e.dataset.state)) === 'baseline');

  // Card art: both ends pixel for pixel, a strip dropped from the middle, detached rows undrawn.
  const art = (width, percent = 100) => page.evaluate(([w, pct]) => {
    M1Lab.setChoiceSet('all-sprites');
    M1Lab.state.choices.cardWidth = w;
    [1, 2, 3, 4].forEach((n) => { M1Lab.state.choices.cardHeights[n] = Math.round((M1Lab.spriteSize('choice_' + n + 'line_a')[1] * pct) / 100); });
    M1Lab.commit();
    const out = [];
    document.querySelectorAll('#choiceViewport .choice').forEach((node) => {
      const canvas = node.querySelector('.card-art');
      const name = node.dataset.sprite;
      const img = M1Lab.image(name);
      const src = document.createElement('canvas');
      src.width = img.width;
      src.height = img.height;
      src.getContext('2d').drawImage(img, 0, 0);
      const a = src.getContext('2d').getImageData(0, 0, img.width, img.height).data;
      const b = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const left = Math.ceil(canvas.width / 2);
      const topHalf = Math.ceil(canvas.height / 2);
      let bad = 0;
      for (let y = 0; y < canvas.height; y++) {
        const sy = y < topHalf ? y : img.height - canvas.height + y;
        for (let x = 0; x < canvas.width; x++) {
          const sx = x < left ? x : img.width - canvas.width + x;
          const i = (y * canvas.width + x) * 4;
          const j = (sy * img.width + sx) * 4;
          for (let k = 0; k < 4; k++) {
            const want = a[j + k];
            if (b[i + k] !== want) { bad++; break; }
          }
        }
      }
      const rows = [];
      for (let y = 0; y < Math.min(8, img.height); y++) {
        let opaque = false;
        for (let x = 0; x < img.width && !opaque; x++) opaque = a[(y * img.width + x) * 4 + 3] > 0;
        rows.push(opaque);
      }
      const detached = rows.some((opaque, y) => !opaque && rows.slice(0, y).some(Boolean));
      out.push({ name, width: canvas.width, height: canvas.height, detached, bad });
    });
    return out;
  }, [width, percent]);
  for (const [width, percent] of [[548, 100], [532, 100], [420, 100], [535, 96], [500, 80]]) {
    const cards = await art(width, percent);
    const tall = await page.evaluate(() => M1Lab.state.choices.cardHeights);
    c(`card art at ${width}px, ${percent}% height: every card pixel-exact to the approved sprite`,
      cards.length >= 12 && cards.every((k) => k.bad === 0 && k.width === width && k.height === tall[k.name[7]]), cards.filter((k) => k.bad || k.width !== width));
  }
  const stray = (await art(532)).filter((k) => k.detached).map((k) => k.name);
  c('no card sprite has a stray line detached from its top', stray.length === 0, stray);
  const older = await page.evaluate((text) => { const s = JSON.parse(text); return M1Lab.importText(JSON.stringify(s)); },
    JSON.stringify(Object.assign({}, shipped, { spritePackage: Object.assign({}, shipped.spritePackage, { atlasSha256: '25e96344eba4d09b84d4e4baf85ef11f34fd3bba3f83f4ca5ab88343a0b237ee' }) })));
  c('a placement saved before the card correction still imports', older === true && JSON.parse(await page.evaluate(() => M1Lab.exportJson())).spritePackage.atlasSha256 === shipped.spritePackage.atlasSha256);
  await browser.close();
}

async function fileSmoke(name) {
  const browser = await playwright[name].launch();
  const context = await qaContext(browser, { viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('failed ' + r.url()));
  await page.goto('file://' + path.join(LAB, 'index.html'));
  await page.waitForFunction(() => document.body.dataset.ready);
  await openPanels(page);
  const ready = await page.evaluate(() => document.body.dataset.ready);
  check(name, 'opens from file:// with no server', ready === 'true', ready);
  await page.click('#util-notes');
  check(name, 'controls work from file://', (await page.$eval('#util-notes', (e) => e.dataset.activations)) === '1');
  check(name, 'bitmap text draws from file://', await page.$eval('#objectiveTitle', (c) => c.width > 200));
  await page.click('[data-tune="inv.slots"] button[data-value="6"]');
  await page.$eval('[data-tune="arrow.size"] input[type=range]', (r) => {
    r.value = 40;
    r.dispatchEvent(new Event('input', { bubbles: true }));
  });
  check(name, 'sliders work from file://', (await page.$eval('#inv-left', (e) => e.style.width)) === '40px');
  const files = [];
  page.on('download', (d) => files.push(d));
  await page.click('#saveSnapshot');
  await page.waitForFunction(() => /Saved/.test(document.getElementById('jsonStatus').textContent));
  await page.waitForTimeout(300);
  const fileNames = files.map((d) => d.suggestedFilename()).sort();
  check(name, 'snapshot saves JSON and PNG from file://', fileNames.length === 2 && /\.png$/.test(fileNames[1]), fileNames);
  const pngFile = files.find((d) => /\.png$/.test(d.suggestedFilename()));
  const header = pngFile ? fs.readFileSync(await pngFile.path()).subarray(16, 24) : Buffer.alloc(8);
  check(name, 'file:// snapshot is 1920x1080', header.readUInt32BE(0) === 1920 && header.readUInt32BE(4) === 1080, [header.readUInt32BE(0), header.readUInt32BE(4)]);
  check(name, 'file:// snapshot status is clean', /and \.png/.test(await page.$eval('#jsonStatus', (e) => e.textContent)));
  check(name, 'no errors from file://', errors.length === 0, errors);
  await browser.close();
}

// Screen-pixel behaviour on a 2x display such as a Retina panel.
async function retinaCheck(base) {
  const browser = await playwright.chromium.launch();
  const context = await qaContext(browser, { viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(base + '/' + LAB_URL);
  await page.waitForFunction(() => document.body.dataset.ready);
  await page.click('#view1x');
  const r = await rectOf(page, '#stage');
  check('chromium', '1:1 on a 2x display maps one shell pixel to one device pixel', r.w === 960 && r.h === 540, r);
  await browser.close();
}

async function compareBrowsers(base, a, b) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.goto(base + '/' + LAB_URL);
  const [pa, pb] = [await pngPixels(page, a), await pngPixels(page, b)];
  await browser.close();
  let differing = 0;
  let maxDelta = 0;
  const box = [1920, 1080, -1, -1];
  for (let i = 0; i < pa.data.length; i += 4) {
    const delta = Math.max(Math.abs(pa.data[i] - pb.data[i]), Math.abs(pa.data[i + 1] - pb.data[i + 1]), Math.abs(pa.data[i + 2] - pb.data[i + 2]));
    if (!delta) continue;
    differing++;
    maxDelta = Math.max(maxDelta, delta);
    const x = (i / 4) % 1920;
    const y = Math.floor(i / 4 / 1920);
    box[0] = Math.min(box[0], x);
    box[1] = Math.min(box[1], y);
    box[2] = Math.max(box[2], x);
    box[3] = Math.max(box[3], y);
  }
  return { differingPixels: differing, maxChannelDelta: maxDelta, boundingBox: box };
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  staticChecks();
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const defaults = {};
  const versions = {};
  const names = (process.env.QA_BROWSERS || 'chromium,firefox').split(',');
  for (const name of names) {
    const b = await playwright[name].launch();
    versions[name] = b.version();
    await b.close();
    defaults[name] = await suite(name, base);
    await fileSmoke(name);
    await shippedDefaults(name, base);
  }
  await retinaCheck(base);
  const crossBrowser = defaults.firefox && defaults.chromium ? await compareBrowsers(base, defaults.chromium, defaults.firefox) : null;
  if (crossBrowser) check('both', 'Chromium and Firefox agree within 1 colour level', crossBrowser.maxChannelDelta <= 1, crossBrowser);
  server.close();
  staticChecks();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const summary = {
    schema: 'm1-placement-lab-qa-v2',
    note: 'Technical checks only. A pass is not visual approval.',
    startingCommit: START_SHA,
    browsers: versions,
    playwright: require('playwright/package.json').version,
    total: results.length,
    passed,
    failed: failed.length,
    failures: failed,
    defaultScreenChromiumVersusFirefox: crossBrowser,
    checks: results
  };
  fs.writeFileSync(path.join(__dirname, 'qa_results.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`${passed}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
