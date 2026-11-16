#!/usr/bin/env node
// Asset contract QA (engine S3: docs/72 section 4, docs/83). From the repository root:
//   node game/qa/validate_assets.js
//       EF-A1 registration, EF-A2 files and PNG class sizes, EF-A3 production paths, for the
//       reception (Rules.fromV1) and both QA fixtures; the game's real boot list; layering and
//       pins; and a negative control for every rule.
//   NODE_PATH="$(npm root -g)" node game/qa/validate_assets.js --browser
//       also the runtime: G.ART, the layered apertures and their labels, the requests the game
//       makes, and G.preloadChapter (reuse, next-chapter preload, failures), in Chromium and
//       Firefox (QA_BROWSERS=chromium,firefox is the default).
// Writes game/qa/asset_results.json. The registry and the boot list are taken from the game's own
// scripts (game/js/*.js, loaded in index.html order in a Node sandbox), not re-implemented here.
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../..');
const BROWSER = process.argv.includes('--browser');
const OUT = path.join(__dirname, 'asset_results.json');

const results = [];
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok, detail });
  if (!ok) console.log('FAIL', group + ':', name, detail === undefined ? '' : JSON.stringify(detail).slice(0, 600));
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

// The art classes of docs/72 section 4.1, written out here so the runtime's G.ART_CLASS is checked
// against the contract rather than against itself.
// docs/92 adds two: overlay (a transparent scene state, a whole 314x206 scene layer) and view (an
// opaque-complete conversation view, one whole 564x278 portrait image).
const CLASS_SIZE = { scene: [314, 206], background: [564, 278], pose: [564, 278], focus: [564, 278], overlay: [314, 206], view: [564, 278], slot: [96, 96], inspect: [565, 451] };
const OVERLAY_SIZE = [1920, 1080];
const UNAPPROVED = /(^|\/)(source|originals|review)\//;

// The approved production files the reception registers, by SHA-256 (the same pins as
// game/qa/run_qa.js; the slot art is pinned there by its git blob at M2 start).
const PINS = {
  'art/scenes/conference_hall/reception/reception_scene.png': 'fb010301d2df0c06d0cedaff6e35e60661e18764c9e5d9ed755ad78b0ac5fd53',
  'art/portraits/receptionist/reception_background.png': '16fe3a96d4304efdbd820981ae8d24039b176d30e28b6c0feee8b2baa08c3c74',
  'art/portraits/receptionist/receptionist_idle.png': '761a45d4aa3037173684b815fde75d8d7a7694d541aff6d55dbd863f7e312e2d',
  'art/items/bathroom_pass_slot.png': '5ad9b6f94328d645173b4f0476f4bdde0bac07d4415ab2c7afcba36e8494355d',
  'art/items/bathroom_pass_inspect.png': '9c8527a3fd85cfeddc01ce4a85b74b04cb54063ffc30100be19497e73e7fa722'
};

// PNG size from the header: signature, then IHDR width and height.
function pngSize(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('hex', 0, 8) !== '89504e470d0a1a0a' || b.toString('ascii', 12, 16) !== 'IHDR') return 'not a PNG';
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

// The game's scripts in a sandbox ------------------------------------------------------------
// Loaded in game/index.html order. Nothing is drawn: G.decodeImages is replaced (after
// pixeltext.js defines it) by a recorder, so main.js's boot hands over its list and stops there.
const SCRIPTS = ['tools/layout-lab/data/lab_data.js', 'art/ui/m1_approved_sprite_sheet.manifest.js', 'game/content/reception.js',
  'game/js/rules.js', 'game/js/pixeltext.js', 'game/js/tuning.js', 'game/js/placeholders.js', 'game/js/stage.js', 'game/js/flow.js',
  'game/js/main.js'];
function loadGame() {
  // flow.js binds its keyboard listener at load; nothing else touches the page before boot.
  const ctx = { console, location: { search: '' }, document: { addEventListener() {}, body: { dataset: {} } } };
  ctx.window = ctx;
  vm.createContext(ctx);
  const boot = [];
  for (const rel of SCRIPTS) {
    if (rel === 'game/js/main.js') {
      ctx.CYOA_GAME.decodeImages = (list) => { boot.push(...list); return new Promise(() => {}); };
    }
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), ctx, { filename: rel });
  }
  return { G: ctx.CYOA_GAME, boot };
}
const { G, boot } = loadGame();
// URLs in the game are relative to game/index.html (G.url adds '../').
const repoPath = (url) => url.replace(/^(\.\.\/)+/, '');

const Rules = require('../js/rules.js');
const reception = Rules.fromV1(require('../content/reception.js'));
const STORIES = {
  reception,
  'engine-fixture': require('./fixtures/engine_fixture.js'),
  'endings-fixture': require('./fixtures/endings_fixture.js'),
  // The imported story (docs/84): the same contract applies to generated content.
  imported: require('../content/story.generated.js').story
};

// The contract, for one story ---------------------------------------------------------------
// Every rule returns its own findings, so a negative control can show which rule caught it.
function audit(story) {
  const out = { A1: [], A2: [], A3: [] };
  let reg;
  try {
    reg = G.artRegistry(story);
  } catch (e) {
    out.A1.push('registry: ' + e.message);
    return out;
  }
  const keys = Object.keys(reg);
  // EF-A1: every referenced id registered, every registered id referenced, one file per key.
  const refs = new Set(G.itemArtKeys(story));
  Object.keys(story.chapters).forEach((ch) => {
    try {
      G.chapterArtKeys(story, ch).forEach((k) => refs.add(k));
    } catch (e) {
      out.A1.push('chapter ' + ch + ': ' + e.message);
    }
  });
  refs.forEach((k) => { if (!reg[k]) out.A1.push('referenced but not registered: ' + k); });
  keys.forEach((k) => { if (!refs.has(k)) out.A1.push('registered but never shown: ' + k); });
  const byPath = {};
  keys.forEach((k) => { if (reg[k].path !== null) (byPath[reg[k].path] = byPath[reg[k].path] || []).push(k); });
  Object.keys(byPath).forEach((p) => { if (byPath[p].length > 1) out.A1.push('one file registered under ' + byPath[p].length + ' keys: ' + byPath[p].join(', ') + ' (' + p + ')'); });
  // EF-A2: the file exists and its PNG size is its class's.
  keys.forEach((k) => {
    const e = reg[k];
    if (e.path === null) return;
    const size = pngSize(e.path);
    const want = CLASS_SIZE[e.cls];
    if (size === null) out.A2.push('missing file: ' + k + ' -> ' + e.path);
    else if (typeof size === 'string') out.A2.push(size + ': ' + k + ' -> ' + e.path);
    else if (size.join('x') !== want.join('x')) out.A2.push(k + ' (' + e.cls + ') is ' + size.join('x') + ', needs ' + want.join('x') + ': ' + e.path);
  });
  // EF-A3: production art is never null and never from source/, originals/ or review/; null art
  // (a DEV PLACEHOLDER) only in a fixture story; every path is a .png under art/.
  keys.forEach((k) => {
    const p = reg[k].path;
    if (p === null) {
      if (story.profile !== 'fixture') out.A3.push('null art in a ' + story.profile + ' story: ' + k);
      return;
    }
    if (UNAPPROVED.test(p)) out.A3.push('unapproved source path: ' + k + ' -> ' + p);
    if (!/^art\/.+\.png$/.test(p)) out.A3.push('not a .png under art/: ' + k + ' -> ' + p);
  });
  if (!['production', 'fixture'].includes(story.profile)) out.A3.push('unknown profile ' + story.profile);
  return out;
}
const clean = (a) => !a.A1.length && !a.A2.length && !a.A3.length;

// 1. The registry is the contract's ------------------------------------------------------------
{
  const g = 'registry';
  check(g, 'G.ART_CLASS sizes are the docs/72 section 4.1 art classes', Object.keys(CLASS_SIZE).every((c) => G.ART_CLASS[c] && G.ART_CLASS[c].size.join() === CLASS_SIZE[c].join())
    && Object.keys(G.ART_CLASS).length === Object.keys(CLASS_SIZE).length, Object.keys(G.ART_CLASS).map((c) => [c, G.ART_CLASS[c].size]));
  check(g, 'scene and scene overlay drawn at 4x; portrait background, pose, complete view and focus at 1x', G.ART_CLASS.scene.scale === 4 && G.ART_CLASS.overlay.scale === 4
    && ['background', 'pose', 'view', 'focus'].every((c) => G.ART_CLASS[c].scale === 1));
  check(g, 'image keys: scene:<id>, portrait:<portrait>:background|pose:<id>, focus:<id>, item:<id>, inspect:<id>',
    G.artKey.scene('a/b') === 'scene:a/b' && G.artKey.background('p', 'x') === 'portrait:p:background:x' && G.artKey.pose('p', 'y') === 'portrait:p:pose:y'
    && G.artKey.focus('a/b/c') === 'focus:a/b/c' && G.artKey.slot('k') === 'item:k' && G.artKey.inspect('k') === 'inspect:k' && G.inspectImageName('k') === 'inspect:k');
  check(g, 'the game\'s story is Rules.fromV1 of the reception content, and G.ART is its registry',
    JSON.stringify(G.story) === JSON.stringify(reception) && JSON.stringify(G.ART) === JSON.stringify(G.artRegistry(reception)));
  const want = {
    'item:wc_key': { key: 'item:wc_key', cls: 'slot', id: 'wc_key', path: 'art/items/bathroom_pass_slot.png' },
    'inspect:wc_key': { key: 'inspect:wc_key', cls: 'inspect', id: 'wc_key', path: 'art/items/bathroom_pass_inspect.png' },
    'scene:conference_hall/reception': { key: 'scene:conference_hall/reception', cls: 'scene', id: 'conference_hall/reception', path: 'art/scenes/conference_hall/reception/reception_scene.png' },
    'portrait:receptionist:background:reception': { key: 'portrait:receptionist:background:reception', cls: 'background', id: 'reception', path: 'art/portraits/receptionist/reception_background.png', portrait: 'receptionist' },
    'portrait:receptionist:pose:idle': { key: 'portrait:receptionist:pose:idle', cls: 'pose', id: 'idle', path: 'art/portraits/receptionist/receptionist_idle.png', portrait: 'receptionist' }
  };
  const sorted = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
  check(g, 'the reception registers exactly its five approved images under stable keys', sorted(G.ART) === sorted(want), G.ART);
  check(g, 'what the apertures show: the reception scene and the receptionist\'s background + idle pose, with the Round 2 labels',
    JSON.stringify(G.ART_ON_SHOW) === JSON.stringify({ scene: 'scene:conference_hall/reception', sceneLabel: 'The reception lobby',
      background: 'portrait:receptionist:background:reception', pose: 'portrait:receptionist:pose:idle', castLabel: 'The receptionist' }), G.ART_ON_SHOW);
  check(g, 'the reception chapter shows scene, background, pose (first-use order); item art is story-wide',
    G.chapterArtKeys(reception, 'reception').join() === 'scene:conference_hall/reception,portrait:receptionist:background:reception,portrait:receptionist:pose:idle'
    && G.itemArtKeys(reception).join() === 'item:wc_key,inspect:wc_key', [G.chapterArtKeys(reception, 'reception'), G.itemArtKeys(reception)]);
  const fx = STORIES['engine-fixture'];
  check(g, 'per chapter: the engine fixture\'s chapters each name their own scenes, portrait layers and focus targets',
    // fx_one: room_a, the keypad close-up, the attendant's two layers, room_b; fx_two is narrative only.
    G.chapterArtKeys(fx, 'fx_one').join() === 'scene:fixture/room_a,focus:fixture/room_a/keypad,portrait:attendant:background:booth,portrait:attendant:pose:idle,scene:fixture/room_b'
    && G.chapterArtKeys(fx, 'fx_two').join() === 'scene:fixture/room_c',
    Object.keys(fx.chapters).map((c) => [c, G.chapterArtKeys(fx, c)]));
  let unknown = '';
  try { G.chapterArtKeys(reception, 'nope'); } catch (e) { unknown = e.message; }
  check(g, 'an unknown chapter is a clear error', unknown === 'Unknown chapter: nope', unknown);
  let twice = '';
  try { G.artRegistry({ assets: { scenes: { 'a/b': null } }, items: { b: { slotArt: null } }, chapters: {} }); } catch (e) { twice = e.message; }
  check(g, 'distinct registrations never share a key (prefixes keep scene, portrait, focus and item art apart)', twice === '', twice);
}

// 2. EF-A1..A3 on every story ------------------------------------------------------------------
for (const id of Object.keys(STORIES)) {
  const s = STORIES[id];
  const a = audit(s);
  check('EF-A1', id + ' (' + s.profile + '): every referenced asset registered, every registration referenced, one key per file', !a.A1.length, a.A1);
  check('EF-A2', id + ' (' + s.profile + '): every file exists at its art class\'s PNG size', !a.A2.length, a.A2);
  check('EF-A3', id + ' (' + s.profile + '): ' + (s.profile === 'fixture' ? 'null placeholders only in a fixture; any path approved' : 'no null art, no source/originals/review path'), !a.A3.length, a.A3);
}
{
  const fixtureNull = ['engine-fixture', 'endings-fixture'].every((id) => Object.values(G.artRegistry(STORIES[id])).every((e) => e.path === null));
  check('EF-A3', 'the QA fixtures use only approved null placeholders (no art is commissioned for them)', fixtureNull);
  check('EF-A3', 'the reception is a production story with no null art', reception.profile === 'production' && Object.values(G.ART).every((e) => e.path !== null));
  const pinBad = Object.values(G.ART).filter((e) => PINS[e.path] !== sha256(fs.readFileSync(path.join(ROOT, e.path))));
  check('EF-A3', 'every registered production image is the approved file, byte for byte (SHA-256 pins)', !pinBad.length && Object.keys(PINS).length === Object.keys(G.ART).length, pinBad);
}

// 3. The game's boot list ------------------------------------------------------------------------
{
  const g = 'boot';
  const names = boot.map((i) => i.name);
  const byName = Object.fromEntries(boot.map((i) => [i.name, repoPath(i.url)]));
  const storyKeys = G.chapterArtKeys(G.story, G.story.start).concat(G.itemArtKeys(G.story));
  check(g, 'boot decodes the opening chapter and every item\'s slot and inspect art, from G.ART', storyKeys.every((k) => byName[k] === G.ART[k].path), storyKeys.map((k) => [k, byName[k]]));
  check(g, 'boot still decodes the engine-owned UI art: sprite package, fonts, slip, NOTES v2 + FILES panels, the inspector X, glyphs',
    ['ui:item_received_slip', 'ui:notes_panel_v2', 'ui:files_panel', 'ui:inspect_close', 'glyph:notes', 'glyph:files', 'glyph:read', 'glyph:use', 'glyph:show_badge', 'glyph:watch']
      .every((n) => names.includes(n)) && names.some((n) => /^font:/.test(n)) && !names.includes('ui:notes_files_panel') && !names.includes('locked_pixel_font_atlas'),
    names.filter((n) => /^(ui|glyph|font):/.test(n)));
  check(g, 'boot names are unique, and no story key collides with an engine-owned image name', new Set(names).size === names.length
    && names.filter((n) => !storyKeys.includes(n)).every((n) => !/^(scene|portrait|focus|item|inspect):/.test(n)), names.filter((n, i) => names.indexOf(n) !== i));
  const order = names.filter((n) => storyKeys.includes(n));
  check(g, 'boot keeps the M2 order: slot art, then scene, portrait background, pose, then (after slip and panels) inspect art',
    order.join() === 'item:wc_key,scene:conference_hall/reception,portrait:receptionist:background:reception,portrait:receptionist:pose:idle,inspect:wc_key'
    && names.indexOf('inspect:wc_key') > names.indexOf('ui:files_panel') && names.indexOf('ui:item_received_slip') > names.indexOf('portrait:receptionist:pose:idle'), order);
  const missing = boot.filter((i) => pngSize(repoPath(i.url)) === null || typeof pngSize(repoPath(i.url)) === 'string');
  check(g, 'every boot image is an existing PNG in the repository', !missing.length, missing);
  check(g, 'no boot image comes from source/, originals/ or review/', !boot.some((i) => UNAPPROVED.test(repoPath(i.url))), boot.filter((i) => UNAPPROVED.test(repoPath(i.url))));
  check(g, 'the alternate receptionist designs (idle2, idle3) stay unregistered and unloaded', !boot.some((i) => /receptionist_idle[23]\.png$/.test(i.url))
    && !Object.values(G.ART).some((e) => /idle[23]/.test(e.path)));
  // UI overlays: every full-stage overlay the stage names (the shell and the inspector column).
  const stageSrc = fs.readFileSync(path.join(ROOT, 'game/js/stage.js'), 'utf8');
  const overlays = [...new Set((stageSrc.match(/art\/ui\/shell\/[a-z0-9_-]+\.png/g) || []))];
  const ovBad = overlays.filter((p) => (pngSize(p) || []).join('x') !== OVERLAY_SIZE.join('x'));
  check(g, 'every full-stage UI overlay the stage names is a 1920x1080 PNG (shell, item overlay)', overlays.length === 2 && !ovBad.length, { overlays, ovBad });
  check(g, 'stage.js and main.js hold no story art path and no RECEPTION_ART: the story declares the art once',
    !/art\/(scenes|portraits|items)\//.test(stageSrc) && !/RECEPTION_ART/.test(stageSrc + fs.readFileSync(path.join(ROOT, 'game/js/main.js'), 'utf8')));
  const order4 = ['portraitBackground', 'portraitRearFx', 'portraitNpc', 'portraitFrontFx'].map((id) => stageSrc.indexOf('els.' + id + ' = '));
  check(g, 'portrait layering in buildApertures: background -> rear FX -> pose -> front FX, then the shell above', order4.every((x, i) => x > 0 && (i === 0 || x > order4[i - 1]))
    && stageSrc.indexOf("keptImg('shell'") > order4[3], order4);
}

// 4. Negative controls: each mutation must be caught by its rule ---------------------------------
{
  const g = 'negative';
  const mut = (base, f) => { const s = clone(base); f(s); return s; };
  const caught = (name, rule, story, pattern) => {
    const a = audit(story);
    const hit = a[rule].some((m) => pattern.test(m));
    check(g, name + ' -> ' + rule, hit, a);
  };
  const R = reception;
  caught('missing scene file', 'A2', mut(R, (s) => { s.assets.scenes['conference_hall/reception'] = 'art/scenes/conference_hall/reception/qa_missing.png'; }), /missing file: scene:conference_hall\/reception/);
  caught('missing inspect file', 'A2', mut(R, (s) => { s.items.wc_key.inspectArt = 'art/items/qa_missing_inspect.png'; }), /missing file: inspect:wc_key/);
  caught('scene with portrait dimensions', 'A2', mut(R, (s) => { s.assets.scenes['conference_hall/reception'] = 'art/portraits/receptionist/reception_background.png'; }), /is 564x278, needs 314x206/);
  caught('pose with scene dimensions', 'A2', mut(R, (s) => { s.assets.portraits.receptionist.poses.idle = 'art/scenes/conference_hall/reception/reception_scene.png'; }), /pose.*is 314x206, needs 564x278/);
  caught('inspect art with slot dimensions', 'A2', mut(R, (s) => { s.items.wc_key.inspectArt = 'art/items/bathroom_pass_slot.png'; }), /inspect:wc_key \(inspect\) is 96x96, needs 565x451/);
  caught('slot art with inspect dimensions', 'A2', mut(R, (s) => { s.items.wc_key.slotArt = 'art/items/bathroom_pass_inspect.png'; }), /item:wc_key \(slot\) is 565x451, needs 96x96/);
  caught('a file that is not a PNG', 'A2', mut(R, (s) => { s.assets.scenes['conference_hall/reception'] = 'art/actions/actions.json'; }), /not a PNG/);
  caught('chapter scene not registered', 'A1', mut(R, (s) => { s.chapters.reception.scene = 'conference_hall/lobby'; }), /referenced but not registered: scene:conference_hall\/lobby/);
  caught('node pose override not registered', 'A1', mut(R, (s) => { s.chapters.reception.nodes.opening.pose = 'smile'; }), /referenced but not registered: portrait:receptionist:pose:smile/);
  caught('speaker with no registered portrait', 'A1', mut(R, (s) => { s.cast.receptionist.portrait = 'clerk'; }), /No registered portrait for speaker receptionist/);
  caught('registered pose never shown (orphan)', 'A1', mut(R, (s) => { s.assets.portraits.receptionist.poses.idle2 = 'art/portraits/receptionist/receptionist_idle2.png'; }), /registered but never shown: portrait:receptionist:pose:idle2/);
  caught('registered scene never shown (orphan)', 'A1', mut(R, (s) => { s.assets.scenes['conference_hall/annex'] = null; }), /registered but never shown: scene:conference_hall\/annex/);
  caught('one file registered twice (duplicate registration)', 'A1', mut(R, (s) => { s.assets.focus['conference_hall/reception/desk'] = 'art/scenes/conference_hall/reception/reception_scene.png'; }), /one file registered under 2 keys/);
  caught('production null art', 'A3', mut(R, (s) => { s.assets.portraits.receptionist.backgrounds.reception = null; }), /null art in a production story: portrait:receptionist:background:reception/);
  caught('production null item art', 'A3', mut(R, (s) => { s.items.wc_key.inspectArt = null; }), /null art in a production story: inspect:wc_key/);
  for (const dir of ['review', 'source', 'originals']) {
    caught('production art from ' + dir + '/', 'A3', mut(R, (s) => { s.assets.scenes['conference_hall/reception'] = 'art/scenes/conference_hall/reception/' + dir + '/reception_scene.png'; }), /unapproved source path/);
  }
  caught('production art outside art/', 'A3', mut(R, (s) => { s.assets.scenes['conference_hall/reception'] = 'review/narrative-mode-b-art-study/scene.png'; }), /not a \.png under art\//);
  const FX = STORIES['engine-fixture'];
  caught('fixture with a non-null file that does not exist', 'A2', mut(FX, (s) => { s.assets.scenes['fixture/room_a'] = 'art/scenes/fixture/room_a/qa_missing.png'; }), /missing file: scene:fixture\/room_a/);
  caught('fixture focus target never shown', 'A1', mut(FX, (s) => { s.assets.focus['fixture/room_a/drawer'] = null; }), /registered but never shown: focus:fixture\/room_a\/drawer/);
  const ok = audit(mut(FX, (s) => { s.assets.scenes['fixture/room_c'] = 'art/scenes/conference_hall/reception/reception_scene.png'; }));
  check(g, 'positive control: a fixture may mix null placeholders with a registered approved file', clean(ok), ok);
  const ov = ['art/ui/shell/item-overlay.png', 'art/ui/overlays/notes_panel_v2.png'].map((p) => (pngSize(p) || []).join('x') === OVERLAY_SIZE.join('x'));
  check(g, 'overlay size rule: the item overlay passes, a 1255x822 panel would fail as a full-stage overlay', ov[0] === true && ov[1] === false, ov);
  check(g, 'unmutated reception passes all three rules (controls are not vacuous)', clean(audit(R)), audit(R));
}

// 5. The runtime, in real browsers --------------------------------------------------------------
async function browserSuite() {
  const playwright = require('playwright');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
  const requests = [];
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.normalize(path.join(ROOT, rel));
    requests.push(rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  for (const name of (process.env.QA_BROWSERS || 'chromium,firefox').split(',')) {
    const g = 'browser:' + name;
    let browser;
    try {
      browser = await playwright[name].launch();
    } catch (e) {
      check(g, 'browser launches', false, String(e).slice(0, 300));
      continue;
    }
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    // The deliberate qa_missing_* files below 404; their own load errors are expected.
    page.on('console', (m) => { if (m.type() === 'error' && !/qa_missing_/.test((m.location() || {}).url || '') && !/qa_missing_/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    requests.length = 0;
    await page.goto(base + '/game/index.html?story=reception&qa'); // the reception fixture (docs/84)
    await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 30000 });
    check(g, 'the game boots (ready=true)', await page.evaluate(() => document.body.dataset.ready) === 'true', await page.evaluate(() => document.body.dataset.error));
    const rt = await page.evaluate(() => {
      const G = window.CYOA_GAME;
      const on = G.ART_ON_SHOW;
      const pr = document.getElementById('portrait'), sc = document.getElementById('scene');
      return {
        art: G.ART, on,
        same: { scene: document.getElementById('sceneArt') === G.image(on.scene), background: document.getElementById('portraitBackground') === G.image(on.background),
          pose: document.getElementById('portraitNpc') === G.image(on.pose) },
        layers: Array.from(pr.children).map((e) => e.id + ':' + e.tagName + ':' + e.getAttribute('aria-hidden')),
        aria: [sc.getAttribute('role'), sc.getAttribute('aria-label'), pr.getAttribute('role'), pr.getAttribute('aria-label'), document.getElementById('sceneArt').getAttribute('aria-hidden'), document.getElementById('sceneArt').alt],
        decoded: Object.keys(G.ART).map((k) => { const i = G.image(k); return [k, !!(i && i.complete && i.naturalWidth > 0)]; }),
        sizes: [on.scene, on.background, on.pose].map((k) => { const i = G.image(k); return [i.naturalWidth, i.naturalHeight, i.width, i.height]; }),
        dom: sc.outerHTML + pr.outerHTML
      };
    });
    check(g, 'G.ART in the page is the Node registry (same keys, classes and paths)', JSON.stringify(rt.art) === JSON.stringify(G.ART), rt.art);
    check(g, 'the scene and portrait <img> elements are the very images decoded under their G.ART keys', rt.same.scene && rt.same.background && rt.same.pose, rt.same);
    check(g, 'portrait layers: background -> rear FX -> pose -> front FX, all hidden from assistive tech', rt.layers.join() === 'portraitBackground:IMG:true,portraitRearFx:DIV:true,portraitNpc:IMG:true,portraitFrontFx:DIV:true', rt.layers);
    check(g, 'aperture roles and labels are the Round 2 ones (img, "The reception lobby"; img, "The receptionist"); art alt empty', rt.aria.join('|') === 'img|The reception lobby|img|The receptionist|true|', rt.aria);
    check(g, 'every registered image is decoded before ready; scene drawn 4x, portrait layers 1x', rt.decoded.every((d) => d[1]) && JSON.stringify(rt.sizes) === JSON.stringify([[314, 206, 1256, 824], [564, 278, 564, 278], [564, 278, 564, 278]]), rt);
    const art = Object.values(G.ART).map((e) => '/' + e.path);
    check(g, 'boot requests each registered image exactly once, and nothing from source/, originals/ or review/',
      art.every((p) => requests.filter((r) => r === p).length === 1) && !requests.some((r) => UNAPPROVED.test(r.slice(1))), requests.filter((r) => /\.png$/.test(r)));
    check(g, 'the alternate receptionist designs are never requested', !requests.some((r) => /receptionist_idle[23]\.png$/.test(r)));

    // Preload: the current chapter is already decoded, so nothing is requested again.
    let before = requests.length;
    const cur = await page.evaluate(() => window.CYOA_GAME.preloadChapter('reception'));
    check(g, 'preloadChapter(current chapter) reuses the boot images: nothing requested', cur.requested.length === 0 && cur.reused.join() === cur.keys.join()
      && cur.keys.length === 3 && requests.length === before, { cur, extra: requests.slice(before) });

    // A next chapter, in a QA-only story built on the reception's (fixture profile; approved files
    // under new ids, one null placeholder). Nothing on the stage may change. The two new images get
    // a query string (the server ignores it): browsers serve a URL they already hold from their own
    // image cache without a request, so only a distinct URL shows on the wire.
    const qa = clone(reception);
    qa.id = 'qa-next-chapter';
    qa.profile = 'fixture';
    qa.assets.scenes['qa/next_room'] = 'art/scenes/conference_hall/reception/reception_scene.png?qa=next';
    qa.assets.portraits.receptionist.poses.qa_alt = 'art/portraits/receptionist/receptionist_idle.png?qa=next';
    qa.assets.focus['qa/next_room/desk'] = null;
    qa.chapters.qa_two = { title: 'QA', start: 'a', scene: 'qa/next_room', nodes: {
      a: { mode: 'dialogue', speaker: 'receptionist', pose: 'qa_alt', text: 'QA.', choices: [] },
      b: { mode: 'focus', focus: 'qa/next_room/desk', text: 'QA.', choices: [] } } };
    before = requests.length;
    const nx = await page.evaluate(async (s) => {
      const G = window.CYOA_GAME;
      const dom = document.getElementById('scene').outerHTML + document.getElementById('portrait').outerHTML;
      const art = JSON.stringify(G.ART) + JSON.stringify(G.ART_ON_SHOW);
      const first = await G.preloadChapter('qa_two', s);
      const again = await G.preloadChapter('qa_two', s);
      return { first, again, sameDom: dom === document.getElementById('scene').outerHTML + document.getElementById('portrait').outerHTML,
        sameArt: art === JSON.stringify(G.ART) + JSON.stringify(G.ART_ON_SHOW),
        decoded: first.keys.filter((k) => first.placeholders.indexOf(k) === -1).every((k) => { const i = G.image(k); return i && i.complete && i.naturalWidth > 0; }) };
    }, qa);
    const added = requests.slice(before);
    check(g, 'preloadChapter(next chapter) decodes only its new images, reuses shared ones and skips null placeholders',
      nx.first.requested.join() === 'scene:qa/next_room,portrait:receptionist:pose:qa_alt' && nx.first.reused.join() === 'portrait:receptionist:background:reception,portrait:receptionist:pose:idle'
      && nx.first.placeholders.join() === 'focus:qa/next_room/desk' && nx.decoded && added.length === 2, { nx, added });
    check(g, 'a second preload of the same chapter is served from the cache (no request)', nx.again.requested.length === 0 && nx.again.reused.length === 4 && added.length === 2, nx.again);
    check(g, 'preloading changes nothing on the stage (scene/portrait DOM, G.ART and what is on show)', nx.sameDom && nx.sameArt);

    // Failures are reported clearly, and nothing half-loaded is cached.
    const fails = await page.evaluate(async (s) => {
      const G = window.CYOA_GAME;
      const run = async (story, ch) => { try { await G.preloadChapter(ch, story); return { ok: true }; } catch (e) { return { message: e.message, failures: e.failures || null }; } };
      const cp = () => JSON.parse(JSON.stringify(s));
      const two = cp();
      two.assets.scenes['qa/missing_room'] = 'art/scenes/qa/qa_missing_scene.png';
      two.assets.portraits.receptionist.poses.qa_missing = 'art/portraits/receptionist/qa_missing_pose.png';
      two.chapters.qa_miss = { title: 'QA', start: 'a', scene: 'qa/missing_room', nodes: { a: { mode: 'dialogue', speaker: 'receptionist', pose: 'qa_missing', text: 'QA.', choices: [] } } };
      const one = cp();
      one.assets.scenes['qa/missing_one'] = 'art/scenes/qa/qa_missing_one.png';
      one.chapters.qa_one = { title: 'QA', start: 'a', scene: 'qa/missing_one', nodes: { a: { mode: 'dialogue', speaker: 'receptionist', text: 'QA.', choices: [] } } };
      const clash = cp();
      clash.assets.scenes['conference_hall/reception'] = 'art/portraits/receptionist/reception_background.png';
      const unreg = cp();
      unreg.chapters.qa_two.scene = 'qa/unregistered';
      return {
        two: await run(two, 'qa_miss'),
        one: await run(one, 'qa_one'),
        notCached: !G.image('scene:qa/missing_room') && !G.image('portrait:receptionist:pose:qa_missing') && !G.image('scene:qa/missing_one'),
        unknown: await run(s, 'nope'),
        unreg: await run(unreg, 'qa_two'),
        clash: await run(clash, 'reception'),
        clashKept: G.image('scene:conference_hall/reception') === document.getElementById('sceneArt') && /reception_scene\.png$/.test(document.getElementById('sceneArt').src),
        ready: document.body.dataset.ready
      };
    }, qa);
    check(g, 'two missing files: one rejection naming both keys and URLs; err.failures lists each as missing; neither is cached',
      fails.two.failures && fails.two.failures.length === 2 && fails.two.failures.every((f) => f.reason === 'missing')
      && /^Images not loaded: /.test(fails.two.message) && /scene:qa\/missing_room \(.*qa_missing_scene\.png: missing\)/.test(fails.two.message)
      && /portrait:receptionist:pose:qa_missing \(.*qa_missing_pose\.png: missing\)/.test(fails.two.message) && fails.notCached, fails.two);
    check(g, 'one missing file: "Missing image: <url>", as boot has always reported it', /^Missing image: \.\.\/art\/scenes\/qa\/qa_missing_one\.png$/.test(fails.one.message || '')
      && fails.one.failures && fails.one.failures.length === 1, fails.one);
    check(g, 'an unknown chapter and unregistered art are rejected by name', fails.unknown.message === 'Unknown chapter: nope'
      && fails.unreg.message === 'Unregistered art: scene:qa/unregistered', [fails.unknown, fails.unreg]);
    check(g, 'a key already bound to another file is refused, and the image on show is kept', /scene:conference_hall\/reception \(.*reception_background\.png: already bound to .*reception_scene\.png\)/.test(fails.clash.message || '')
      && fails.clashKept, fails.clash);
    check(g, 'the game is still ready after every failed preload', fails.ready === 'true');

    // The engine fixture (all null placeholders) preloads per chapter without a request.
    before = requests.length;
    const fxr = await page.evaluate(async (s) => Promise.all(Object.keys(s.chapters).map((c) => window.CYOA_GAME.preloadChapter(c, s))), STORIES['engine-fixture']);
    check(g, 'the engine fixture preloads chapter by chapter: every image a labelled placeholder, nothing requested',
      fxr.every((r) => r.requested.length === 0 && r.placeholders.length === r.keys.length && r.keys.length > 0) && requests.length === before, fxr);
    check(g, 'no console or page errors', errors.length === 0, errors);
    await context.close();
    await browser.close();
  }
  server.close();
}

(async () => {
  if (BROWSER) await browserSuite();
  const groups = {};
  results.forEach((r) => {
    const g = (groups[r.group] = groups[r.group] || { total: 0, passed: 0 });
    g.total++;
    if (r.ok) g.passed++;
  });
  const passed = results.filter((r) => r.ok).length;
  fs.writeFileSync(OUT, JSON.stringify({ schema: 'cyoa-asset-validation-v1', browser: BROWSER, total: results.length, passed, groups, results }, null, 2) + '\n');
  console.log('asset validation' + (BROWSER ? ' (with browsers)' : '') + ' ' + passed + '/' + results.length + ' passed', JSON.stringify(groups));
  process.exit(passed === results.length ? 0 : 1);
})();
