#!/usr/bin/env node
// Bounded QA for the reception density test (docs/55). From the repository root:
//   NODE_PATH="$(npm root -g)" node tools/reception-density-test/qa/run_qa.js
// QA_BROWSERS=chromium,firefox (the default) picks the browsers; one that cannot launch is a failure.
// Writes qa/qa_results.json and the proof screenshots (Chromium, 1920x1080, devicePixelRatio 1).
// A pass shows the test page renders the exports honestly. It is not art or density approval.
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const TOOL = 'tools/reception-density-test';
const PAGE = TOOL + '/index.html';
const SHOTS = path.join(__dirname, 'screenshots');
const BASE_SHA = 'b9f81d8beccdf59771f068b3bd822adc3961ae60'; // main when this test began
const SHELL_PATH = 'art/ui/shell/layout-final.png';
const SHELL_SHA256 = '813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6';
const SCENE = 'art/scenes/conference_hall/reception/density_test/reception_scene_314x206.png'; // v2, first test
// Scene 02 A/B (docs/55 section 13): one raw source, reduced with BOX (+256-colour cleanup) and NEAREST (nothing else).
const SCENE_A = 'art/scenes/conference_hall/reception/density_test/reception_scene_02_box_314x206.png';
const SCENE_B = 'art/scenes/conference_hall/reception/density_test/reception_scene_02_nearest_314x206.png';
const SCENE_FILES = { v2: SCENE, a: SCENE_A, b: SCENE_B };
const BACKGROUND = 'art/portraits/receptionist/density_test/reception_background_282x139.png';
const NPC = 'art/portraits/receptionist/density_test/receptionist_282x139.png';
const RAWS = ['receptionist_portrait_v1_raw.png', 'reception_background_v2_raw.png', 'reception_world_scene_v2_raw.png',
  'reception_world_scene_density_test_02_raw.png']
  .map((f) => 'source/reception_density/' + f);
// The only paths this branch may add or change relative to main.
const ALLOWED = [/^tools\/reception-density-test\//, /^art\/scenes\/conference_hall\/reception\/density_test\/[^/]+\.png$/,
  /^art\/portraits\/receptionist\/density_test\/[^/]+\.png$/, /^docs\/55_M2_RECEPTION_ART_DENSITY_TEST\.md$/];
// Production and M1 paths that must be byte-identical to main.
const PROTECTED = ['game', 'art/ui', 'art/actions', 'art/items', 'design', 'tools/layout-lab', 'README.md'];

const results = [];
function check(scope, name, ok, detail) {
  results.push({ scope, name, ok: !!ok, detail: detail === undefined ? undefined : detail });
  console.log(`${ok ? 'pass' : 'FAIL'} [${scope}] ${name}${!ok && detail !== undefined ? ' ' + JSON.stringify(detail).slice(0, 400) : ''}`);
}
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const lines = (s) => s.split('\n').filter(Boolean);

// Minimal PNG decoder: 8-bit greyscale, RGB or RGBA, non-interlaced (what Pillow and the browsers
// write). Returns { width, height, colorType, channels, data } with RGBA data.
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, width, height, depth, colorType, interlace;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); depth = body[8]; colorType = body[9]; interlace = body[12]; }
    if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (depth !== 8 || !channels || interlace) throw new Error(`unsupported PNG (depth ${depth}, type ${colorType}, interlace ${interlace})`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * channels, px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? px[y * stride + i - channels] : 0, b = y ? px[(y - 1) * stride + i] : 0;
      const c = y && i >= channels ? px[(y - 1) * stride + i - channels] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + i] = v & 255;
    }
  }
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels;
    if (channels <= 2) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = px[s]; data[i * 4 + 3] = channels === 2 ? px[s + 1] : 255; }
    else { data[i * 4] = px[s]; data[i * 4 + 1] = px[s + 1]; data[i * 4 + 2] = px[s + 2]; data[i * 4 + 3] = channels === 4 ? px[s + 3] : 255; }
  }
  return { width, height, colorType, channels, data };
}
const readPng = (rel) => decodePng(fs.readFileSync(path.join(ROOT, rel)));
const at = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; };

function stats(img) {
  const alpha = new Map(), rgbVisible = new Set();
  for (let i = 0; i < img.width * img.height; i++) {
    const a = img.data[i * 4 + 3];
    alpha.set(a, (alpha.get(a) || 0) + 1);
    if (a === 255) rgbVisible.add((img.data[i * 4] << 16) | (img.data[i * 4 + 1] << 8) | img.data[i * 4 + 2]);
  }
  return { alphaValues: [...alpha.keys()].sort((a, b) => a - b), transparent: alpha.get(0) || 0, opaque: alpha.get(255) || 0, uniqueRgb: rgbVisible.size };
}

// Static checks ----------------------------------------------------------------------------------
const report = {};
function staticChecks() {
  const s = 'static';
  const scene = readPng(SCENE), bg = readPng(BACKGROUND), npc = readPng(NPC);
  check(s, 'scene PNG is exactly 314x206', scene.width === 314 && scene.height === 206, [scene.width, scene.height]);
  check(s, 'portrait background PNG is exactly 282x139', bg.width === 282 && bg.height === 139, [bg.width, bg.height]);
  check(s, 'receptionist PNG is exactly 282x139', npc.width === 282 && npc.height === 139, [npc.width, npc.height]);
  check(s, 'receptionist PNG is stored as RGBA (colour type 6)', npc.colorType === 6, npc.colorType);
  const sceneA = readPng(SCENE_A), sceneB = readPng(SCENE_B);
  check(s, 'scene 02 A (BOX) and B (NEAREST) PNGs are exactly 314x206 RGB', [sceneA, sceneB].every((im) => im.width === 314 && im.height === 206 && im.colorType === 2),
    [sceneA, sceneB].map((im) => [im.width, im.height, im.colorType]));
  const ns = stats(npc), ss = stats(scene), bs = stats(bg), as = stats(sceneA), bsn = stats(sceneB);
  check(s, 'scene 02 A and B are fully opaque', as.alphaValues.join() === '255' && bsn.alphaValues.join() === '255');
  check(s, 'receptionist alpha values are exactly {0, 255}', ns.alphaValues.join() === '0,255', ns.alphaValues);
  check(s, 'receptionist has genuine transparent pixels (and opaque ones)', ns.transparent > 0 && ns.opaque > 0, ns);
  const corners = [[0, 0], [281, 0], [0, 138], [281, 138]].map(([x, y]) => at(npc, x, y)[3]);
  check(s, 'receptionist canvas corners are transparent (character only, no backdrop)', corners.every((a) => a === 0), corners);
  let hiddenRgb = 0;
  for (let i = 0; i < npc.width * npc.height; i++) if (npc.data[i * 4 + 3] === 0 && (npc.data[i * 4] || npc.data[i * 4 + 1] || npc.data[i * 4 + 2])) hiddenRgb++;
  check(s, 'no colour hides under the receptionist\'s transparent pixels', hiddenRgb === 0, hiddenRgb);
  check(s, 'scene and portrait background are fully opaque', ss.alphaValues.join() === '255' && bs.alphaValues.join() === '255');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, TOOL, 'density_test_manifest.json')));
  const hashes = {};
  [SCENE, SCENE_A, SCENE_B, BACKGROUND, NPC].forEach((f) => { hashes[f] = sha256(fs.readFileSync(path.join(ROOT, f))); });
  const byFile = {};
  Object.values(manifest.assets).forEach((a) => { byFile[a.output.file] = a.output; });
  check(s, 'export hashes match density_test_manifest.json', Object.keys(hashes).every((f) => byFile[f] && byFile[f].sha256 === hashes[f]));
  check(s, 'unique visible RGB counts match the manifest and stay within the 256-colour cleanup target',
    ss.uniqueRgb === byFile[SCENE].unique_rgb && bs.uniqueRgb === byFile[BACKGROUND].unique_rgb && ns.uniqueRgb === byFile[NPC].unique_rgb
    && as.uniqueRgb === byFile[SCENE_A].unique_rgb && [ss, bs, ns, as].every((x) => x.uniqueRgb <= 256), [ss.uniqueRgb, bs.uniqueRgb, ns.uniqueRgb, as.uniqueRgb]);
  const nearest = Object.values(manifest.assets).find((a) => a.output.file === SCENE_B);
  check(s, 'scene 02 B is NEAREST only, with no colour cleanup, and its unique RGB count matches the manifest',
    nearest.resample === 'NEAREST' && nearest.color_reduction === null && bsn.uniqueRgb === nearest.output.unique_rgb, { resample: nearest.resample, unique: bsn.uniqueRgb });
  const boxA = Object.values(manifest.assets).find((a) => a.output.file === SCENE_A);
  check(s, 'scene 02 A and B come from the same raw with the same crop box', boxA.source.sha256 === nearest.source.sha256
    && boxA.crop_box.join() === nearest.crop_box.join() && boxA.resample === 'BOX', [boxA.crop_box, nearest.crop_box]);
  report.assets = {
    [SCENE]: { size: [scene.width, scene.height], uniqueRgb: ss.uniqueRgb, sha256: hashes[SCENE] },
    [SCENE_A]: { size: [sceneA.width, sceneA.height], uniqueRgb: as.uniqueRgb, sha256: hashes[SCENE_A] },
    [SCENE_B]: { size: [sceneB.width, sceneB.height], uniqueRgb: bsn.uniqueRgb, sha256: hashes[SCENE_B] },
    [BACKGROUND]: { size: [bg.width, bg.height], uniqueRgb: bs.uniqueRgb, sha256: hashes[BACKGROUND] },
    [NPC]: { size: [npc.width, npc.height], uniqueRgb: ns.uniqueRgb, alpha: { values: ns.alphaValues, transparent: ns.transparent, opaque: ns.opaque }, sha256: hashes[NPC] }
  };

  // Shell and production files.
  check(s, 'shell SHA-256 is the canonical 813e0884...', sha256(fs.readFileSync(path.join(ROOT, SHELL_PATH))) === SHELL_SHA256);
  check(s, 'shell blob is identical to main', git('rev-parse', `${BASE_SHA}:${SHELL_PATH}`) === git('hash-object', SHELL_PATH));
  const changed = lines(git('diff', '--name-only', BASE_SHA, '--', ...PROTECTED));
  check(s, 'production gameplay, M1 UI art, fonts, design and the layout lab are byte-identical to main', changed.length === 0, changed);
  const dirty = lines(git('status', '--porcelain', '--', ...PROTECTED));
  check(s, 'no uncommitted change under the protected paths', dirty.length === 0, dirty);
  const branchFiles = lines(git('diff', '--name-only', BASE_SHA)).concat(lines(git('ls-files', '--others', '--exclude-standard')));
  const outside = branchFiles.filter((f) => !ALLOWED.some((re) => re.test(f)));
  check(s, 'every change on the branch is inside the density-test paths or docs/55', outside.length === 0, outside);

  // Masters stay local.
  const tracked = lines(git('ls-files'));
  check(s, 'nothing under source/ or originals/ is tracked', !tracked.some((f) => /(^|\/)(source|originals)\//.test(f)));
  const historical = lines(git('log', '--format=', '--name-only', `${BASE_SHA}..HEAD`));
  check(s, 'no *_raw.png generator master is tracked or was committed on this branch',
    !tracked.concat(historical).some((f) => /_raw\.png$/i.test(f)));
  const present = RAWS.filter((f) => fs.existsSync(path.join(ROOT, f)));
  report.rawsPresent = present.length;
  if (present.length) {
    const ignored = present.filter((f) => { try { execFileSync('git', ['check-ignore', '-q', f], { cwd: ROOT }); return true; } catch (e) { return false; } });
    check(s, 'the local raw sources are git-ignored and untracked', ignored.length === present.length && !present.some((f) => tracked.includes(f)), { present, ignored });
    const rawHashes = new Set(present.map((f) => sha256(fs.readFileSync(path.join(ROOT, f)))));
    const leaked = tracked.filter((f) => /\.png$/i.test(f) && rawHashes.has(sha256(fs.readFileSync(path.join(ROOT, f)))));
    check(s, 'no tracked file is byte-identical to a raw source', leaked.length === 0, leaked);
  } else {
    check(s, 'raw sources present locally for the ignore and reproducibility checks', false, 'source/reception_density/ missing (local-only)');
  }
  const onDisk = ['art/scenes/conference_hall/reception/density_test', 'art/portraits/receptionist/density_test']
    .flatMap((d) => fs.readdirSync(path.join(ROOT, d)).map((f) => d + '/' + f));
  check(s, 'the density-test art folders hold exactly the five exports', onDisk.sort().join() === [BACKGROUND, NPC, SCENE, SCENE_A, SCENE_B].sort().join(), onDisk);
  const big = onDisk.filter((f) => /\.png$/.test(f)).map((f) => [f, readPng(f)])
    .filter(([, im]) => im.width > 314 || im.height > 206).map(([f]) => f);
  check(s, 'no density-test art file is larger than its logical canvas (no pre-upscaled or master-size exports)', big.length === 0, big);

  // Reproducibility: re-run the normalizer into a temp folder and compare bytes.
  if (present.length === RAWS.length) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'density-'));
    execFileSync('python3', ['-I', path.join(ROOT, TOOL, 'normalize.py'), '--out', tmp], { cwd: ROOT });
    const same = Object.keys(hashes).filter((f) => sha256(fs.readFileSync(path.join(tmp, f))) === hashes[f]);
    fs.rmSync(tmp, { recursive: true, force: true });
    check(s, 'normalize.py reproduces all five exports byte for byte from the local sources', same.length === 5, same);
  }
  return { scene, sceneA, sceneB, bg, npc };
}

// Server -----------------------------------------------------------------------------------------
function startServer() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// Exact pixel comparison of a 1920x1080 screenshot. Where the shell is fully transparent inside an
// aperture, the screen pixel must equal the nearest-neighbour source pixel exactly. Just outside
// the scene aperture, where the 1256x824 scene would overflow, the screen must show only the shell
// over the black stage (+-2 for the browser's alpha blending): the overflow is clipped.
function comparePixels(shot, art, shell, rects, npcOn) {
  const [sx, sy, sw, sh] = rects.scene, [px, py, pw, ph] = rects.portrait;
  const out = { sceneChecked: 0, sceneBad: 0, portraitChecked: 0, portraitBad: 0, npcPixelsShown: 0, clipChecked: 0, clipBad: 0, firstBad: null };
  const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) {
    if (at(shell, x, y)[3] !== 0) continue;
    out.sceneChecked++;
    const want = at(art.scene, (x - sx) >> 2, (y - sy) >> 2), got = at(shot, x, y);
    if (!same(want, got)) { out.sceneBad++; out.firstBad = out.firstBad || { x, y, want, got }; }
  }
  for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) {
    if (at(shell, x, y)[3] !== 0) continue;
    out.portraitChecked++;
    const n = at(art.npc, (x - px) >> 1, (y - py) >> 1), useNpc = npcOn && n[3] === 255;
    if (useNpc) out.npcPixelsShown++;
    const want = useNpc ? n : at(art.bg, (x - px) >> 1, (y - py) >> 1), got = at(shot, x, y);
    if (!same(want, got)) { out.portraitBad++; out.firstBad = out.firstBad || { x, y, want, got }; }
  }
  const overflow = [];
  for (let x = sx; x < sx + sw + 1; x++) for (let y = sy + sh; y < sy + sh + 2; y++) overflow.push([x, y]);
  for (let y = sy; y < sy + sh; y++) overflow.push([sx + sw, y]);
  overflow.forEach(([x, y]) => {
    const s = at(shell, x, y), a = s[3] / 255, want = [s[0] * a, s[1] * a, s[2] * a], got = at(shot, x, y);
    out.clipChecked++;
    if (want.some((v, i) => Math.abs(v - got[i]) > 2)) out.clipBad++;
  });
  return out;
}

// Browser checks ---------------------------------------------------------------------------------
async function browserChecks(name, base, art, shell) {
  const playwright = require('playwright');
  let browser;
  try { browser = await playwright[name].launch(); } catch (e) { check(name, 'browser launches', false, e.message); return; }
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [], served = {};
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', async (r) => { try { served[new URL(r.url()).pathname.slice(1)] = sha256(await r.body()); } catch (e) { /* ignore */ } });

  const open = async (query) => {
    await page.goto(`${base}/${PAGE}${query}`);
    await page.waitForFunction(() => document.body.dataset.ready);
  };
  await open('?shot&scene=v2');
  check(name, 'page is ready with no load problems', await page.evaluate(() => document.body.dataset.ready) === 'true', await page.evaluate(() => window.DENSITY_TEST && window.DENSITY_TEST.problems));

  const g = await page.evaluate(() => {
    const box = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
    const cs = (id, p) => getComputedStyle(document.getElementById(id))[p];
    const img = (id) => { const e = document.getElementById(id); return { natural: [e.naturalWidth, e.naturalHeight], box: box(id), rendering: cs(id, 'imageRendering'), src: e.getAttribute('src') }; };
    const stage = document.getElementById('stage'), pa = document.getElementById('portraitAperture');
    const transforms = [];
    for (let e = document.getElementById('scene'); e; e = e.parentElement) if (getComputedStyle(e).transform !== 'none') transforms.push(e.id || e.tagName);
    return {
      dpr: window.devicePixelRatio,
      lab: { scene: window.M1_LAB_DATA.measured.regions.sceneAperture.rect, portrait: window.M1_LAB_DATA.measured.regions.portraitAperture.rect },
      stage: box('stage'),
      scrollSize: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      sceneAperture: box('sceneAperture'), sceneOverflow: cs('sceneAperture', 'overflowX') + '/' + cs('sceneAperture', 'overflowY'),
      portraitAperture: box('portraitAperture'), portraitOverflow: cs('portraitAperture', 'overflowX') + '/' + cs('portraitAperture', 'overflowY'),
      scene: img('scene'), bg: img('portraitBackground'), npc: img('portraitNpc'), shell: img('shell'),
      stageOrder: [...stage.children].map((e) => e.id),
      portraitOrder: [...pa.children].map((e) => e.id),
      zIndexes: ['sceneAperture', 'portraitAperture', 'portraitBackground', 'portraitRearFx', 'portraitNpc', 'portraitFrontFx', 'shell'].map((id) => cs(id, 'zIndex')),
      transforms,
      devHidden: getComputedStyle(document.getElementById('dev')).display === 'none',
      gameCode: !!(window.CYOA_GAME || document.querySelector('script[src*="game/"]')),
      dialogueOrChoices: !!document.querySelector('#speech, #choiceViewport, .card, .hit')
    };
  });
  const rects = { scene: g.lab.scene, portrait: g.lab.portrait };
  check(name, 'devicePixelRatio is 1 (screenshots are 1:1 stage pixels)', g.dpr === 1, g.dpr);
  check(name, 'stage is the canonical 1920x1080 at the page origin, with nothing scrolling in proof mode',
    g.stage.join() === '0,0,1920,1080' && g.scrollSize.join() === '1920,1080', { stage: g.stage, scroll: g.scrollSize });
  check(name, 'no transform or fit scale anywhere above the art', g.transforms.length === 0, g.transforms);
  check(name, 'scene aperture uses the committed lab geometry (32,44 1255x822) and clips', g.sceneAperture.join() === g.lab.scene.join()
    && g.lab.scene.join() === '32,44,1255,822' && /^(hidden|clip)\/(hidden|clip)$/.test(g.sceneOverflow), { box: g.sceneAperture, overflow: g.sceneOverflow });
  check(name, 'portrait aperture uses the committed lab geometry (1333,44 564x278) and clips', g.portraitAperture.join() === g.lab.portrait.join()
    && g.lab.portrait.join() === '1333,44,564,278' && /^(hidden|clip)\/(hidden|clip)$/.test(g.portraitOverflow), { box: g.portraitAperture, overflow: g.portraitOverflow });
  check(name, 'scene is 314x206 shown at exactly 4x: 1256x824 from the aperture origin (overflow 1 px right, 2 px bottom)',
    g.scene.natural.join() === '314,206' && g.scene.box.join() === '32,44,1256,824' && g.scene.box[2] / g.scene.natural[0] === 4 && g.scene.box[3] / g.scene.natural[1] === 4, g.scene);
  check(name, 'portrait background is 282x139 shown at exactly 2x: 564x278', g.bg.natural.join() === '282,139' && g.bg.box.join() === '1333,44,564,278', g.bg);
  check(name, 'receptionist is a separate 282x139 layer shown at exactly 2x: 564x278', g.npc.natural.join() === '282,139' && g.npc.box.join() === '1333,44,564,278'
    && g.npc.src !== g.bg.src, g.npc);
  const pixelated = (r) => r === 'pixelated' || r === 'crisp-edges';
  check(name, 'image smoothing is off on every image (image-rendering pixelated/crisp-edges)',
    [g.scene, g.bg, g.npc, g.shell].every((i) => pixelated(i.rendering)), [g.scene, g.bg, g.npc, g.shell].map((i) => i.rendering));
  check(name, 'shell is the unchanged canonical file, 1920x1080 at 0,0', /art\/ui\/shell\/layout-final\.png$/.test(g.shell.src)
    && g.shell.natural.join() === '1920,1080' && g.shell.box.join() === '0,0,1920,1080' && served[SHELL_PATH] === SHELL_SHA256, g.shell);
  check(name, 'served exports are the committed bytes', [SCENE, BACKGROUND, NPC].every((f) => served[f] === sha256(fs.readFileSync(path.join(ROOT, f)))));
  check(name, 'draw order: scene and portrait under the shell; background -> rear/mid FX -> NPC -> foreground FX',
    g.stageOrder.join() === 'sceneAperture,portraitAperture,shell' && g.portraitOrder.join() === 'portraitBackground,portraitRearFx,portraitNpc,portraitFrontFx'
    && g.zIndexes.every((z) => z === 'auto'), { stage: g.stageOrder, portrait: g.portraitOrder, z: g.zIndexes });
  check(name, 'no gameplay, dialogue or production-route code on the page', !g.gameCode && !g.dialogueOrChoices);
  check(name, 'developer readout is hidden in proof mode (?shot)', g.devHidden);

  const shotOn = path.join(SHOTS, `density_test_${name}_npc_on.png`);
  const onBuf = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  const on = decodePng(onBuf);
  const cOn = comparePixels(on, art, shell, rects, true);
  check(name, 'screen pixels equal the 4x nearest-neighbour scene exactly wherever the shell is clear', cOn.sceneChecked > 900000 && cOn.sceneBad === 0, cOn);
  check(name, 'screen pixels equal background + NPC at exact 2x nearest-neighbour, binary alpha, wherever the shell is clear',
    cOn.portraitChecked > 140000 && cOn.portraitBad === 0 && cOn.npcPixelsShown > 10000, cOn);
  check(name, 'the scene\'s 1 px / 2 px overflow is clipped by the aperture (shell over black only beyond it)', cOn.clipBad === 0, cOn);

  await open('?shot&scene=v2&npc=off');
  const offBuf = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  const off = decodePng(offBuf);
  const cOff = comparePixels(off, art, shell, rects, false);
  check(name, 'with the NPC hidden the portrait shows the background alone, exactly', cOff.portraitBad === 0 && cOff.npcPixelsShown === 0 && cOff.sceneBad === 0, cOff);
  let diffOutside = 0, diffInside = 0;
  const [px, py, pw, ph] = rects.portrait;
  for (let y = 0; y < 1080; y++) for (let x = 0; x < 1920; x++) {
    const i = (y * 1920 + x) * 4;
    if (on.data[i] !== off.data[i] || on.data[i + 1] !== off.data[i + 1] || on.data[i + 2] !== off.data[i + 2]) {
      if (x >= px && x < px + pw && y >= py && y < py + ph) diffInside++; else diffOutside++;
    }
  }
  check(name, 'hiding the NPC changes only portrait-aperture pixels', diffInside > 10000 && diffOutside === 0, { diffInside, diffOutside });

  // Scene 02 A/B: each variant, in the identical shell, must be its own exact 4x nearest-neighbour image.
  const abShots = {};
  for (const k of ['a', 'b']) {
    await open(`?shot&scene=${k}`);
    const src = await page.evaluate(() => document.getElementById('scene').getAttribute('src'));
    abShots[k] = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    const c = comparePixels(decodePng(abShots[k]), Object.assign({}, art, { scene: k === 'a' ? art.sceneA : art.sceneB }), shell, rects, true);
    check(name, `scene ${k.toUpperCase()} (${k === 'a' ? 'BOX' : 'NEAREST'}) shows at exact 4x nearest neighbour, portrait unchanged, overflow clipped`,
      src.endsWith(SCENE_FILES[k]) && c.sceneChecked > 900000 && c.sceneBad === 0 && c.portraitBad === 0 && c.clipBad === 0, c);
  }
  check(name, 'served A/B exports are the committed bytes', [SCENE_A, SCENE_B].every((f) => served[f] === sha256(fs.readFileSync(path.join(ROOT, f)))));
  const sa = decodePng(abShots.a), sb = decodePng(abShots.b);
  let abOutside = 0, abInside = 0;
  const [qx, qy, qw, qh] = rects.scene;
  for (let y = 0; y < 1080; y++) for (let x = 0; x < 1920; x++) {
    const i = (y * 1920 + x) * 4;
    if (sa.data[i] !== sb.data[i] || sa.data[i + 1] !== sb.data[i + 1] || sa.data[i + 2] !== sb.data[i + 2]) {
      if (x >= qx && x < qx + qw && y >= qy && y < qy + qh) abInside++; else abOutside++;
    }
  }
  check(name, 'switching A <-> B changes only scene-aperture pixels (shell and portrait identical)', abInside > 100000 && abOutside === 0, { abInside, abOutside });

  // The developer toggles (buttons and keys) in the normal, non-proof view; B is the default scene.
  await open('');
  const sceneNow = () => page.evaluate(() => [document.body.dataset.scene, document.getElementById('scene').getAttribute('src').split('/').pop()]);
  const s0 = await sceneNow();
  await page.keyboard.press('a');
  const s1 = await sceneNow();
  await page.click('#scene_b');
  const s2 = await sceneNow();
  await page.keyboard.press('v');
  const s3 = await sceneNow();
  await page.click('#scene_a');
  const s4 = await sceneNow();
  check(name, 'scene switch: default B, then A / B / v2 by key and button', [s0, s1, s2, s3, s4].map((x) => x.join(':')).join() ===
    ['b:reception_scene_02_nearest_314x206.png', 'a:reception_scene_02_box_314x206.png', 'b:reception_scene_02_nearest_314x206.png',
      'v2:reception_scene_314x206.png', 'a:reception_scene_02_box_314x206.png'].join(), [s0, s1, s2, s3, s4]);
  await open('');
  const t = await page.evaluate(() => ({ dev: getComputedStyle(document.getElementById('dev')).display !== 'none', npc: document.body.dataset.npc,
    readout: document.getElementById('readout').textContent }));
  await page.click('#npcToggle');
  const afterClick = await page.evaluate(() => [document.body.dataset.npc, getComputedStyle(document.getElementById('portraitNpc')).visibility,
    getComputedStyle(document.getElementById('portraitBackground')).visibility]);
  await page.keyboard.press('n');
  const afterKey = await page.evaluate(() => [document.body.dataset.npc, getComputedStyle(document.getElementById('portraitNpc')).visibility]);
  check(name, 'developer NPC toggle hides and shows only the NPC layer (button and N key)',
    t.dev && t.npc === 'on' && afterClick.join() === 'off,hidden,visible' && afterKey.join() === 'on,visible', { t: t.npc, afterClick, afterKey });
  check(name, 'readout states logical and display sizes', /314x206 logical\s+x4 nearest\s+= 1256x824/.test(t.readout) && /282x139 logical\s+x2 nearest\s+= 564x278/.test(t.readout), t.readout);
  check(name, 'no console or page errors', errors.length === 0, errors);

  if (name === 'chromium') {
    fs.writeFileSync(shotOn, onBuf);
    fs.writeFileSync(path.join(SHOTS, `density_test_${name}_npc_off.png`), offBuf);
    fs.writeFileSync(path.join(SHOTS, `density_test_${name}_scene02_A_box.png`), abShots.a);
    fs.writeFileSync(path.join(SHOTS, `density_test_${name}_scene02_B_nearest.png`), abShots.b);
  }
  await browser.close();
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const art = staticChecks();
  const shell = readPng(SHELL_PATH);
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const name of (process.env.QA_BROWSERS || 'chromium,firefox').split(',')) await browserChecks(name, base, art, shell);
  server.close();
  const failed = results.filter((r) => !r.ok);
  const out = { tool: PAGE, base: BASE_SHA, head: git('rev-parse', 'HEAD'), date: new Date().toISOString(), passed: results.length - failed.length,
    total: results.length, report, results };
  fs.writeFileSync(path.join(__dirname, 'qa_results.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`\n${out.passed}/${out.total} passed`);
  process.exit(failed.length ? 1 : 0);
})();
