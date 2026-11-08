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

// Approved reception production art (docs/56 approval, docs/57 integration), pinned by hash. These
// are the ONLY files the art/ allowlist admits beyond OWNER_ART; anything else under art/ fails.
const PRODUCTION_ART = {
  'art/scenes/conference_hall/reception/reception_scene.png': 'fb010301d2df0c06d0cedaff6e35e60661e18764c9e5d9ed755ad78b0ac5fd53', // 314x206 RGB
  // Revised 2026-11-07 (docs/59): tighter workstation framing; was 2f23075f... (docs/56/57).
  'art/portraits/receptionist/reception_background.png': '16fe3a96d4304efdbd820981ae8d24039b176d30e28b6c0feee8b2baa08c3c74', // 564x278 RGB
  // Owner edit 2026-11-07 (docs/59 section 7): moved down 22 px to sit on the frame bottom; was 66c4f32a...
  'art/portraits/receptionist/receptionist_idle.png': '761a45d4aa3037173684b815fde75d8d7a7694d541aff6d55dbd863f7e312e2d', // 564x278 RGBA
  // receptionist_idle2/idle3: separate alternate NPC design candidates (docs/59 sections 7-8), NOT frames,
  // expressions or poses of receptionist_idle. Committed and pinned; never loaded by the game.
  'art/portraits/receptionist/receptionist_idle2.png': '38488a228d237650c7b2fe7a0eb2cee74f1549cef63c1767376eb899b714ee35', // 564x278 RGBA
  'art/portraits/receptionist/receptionist_idle3.png': '95ead2a6de3b28061b77775ea12cb9abf25035e76590b4ff33322abfe69e6376', // 564x278 RGBA
  // Inspector art pass (docs/58): FACILITIES KEY inspect art and the inspector X up/down.
  'art/items/bathroom_pass_inspect.png': '9c8527a3fd85cfeddc01ce4a85b74b04cb54063ffc30100be19497e73e7fa722', // 565x451 RGB
  'art/ui/sprites/inspect_close_up.png': '8247d4b6b23aac803debb405c3549054ea066d54e7561117499f0deb917dc530', // 44x44 RGBA
  'art/ui/sprites/inspect_close_down.png': '576b4fbc5f50f5d6fcb57065dd350dcf7d81fd4442831cb2509a76f5008c41ba', // 44x44 RGBA
  // NOTES/FILES pass (docs/60): the records panel, now behind NOTES only.
  'art/ui/overlays/notes_files_panel.png': 'bc9c35a880874a5f290dc3174b88fb46cd982bd1321502f39d2781dcbe94e783', // 1255x822 RGB
  // Owner art 2026-11-07 (docs/63): FILES gets its own case-file panel (files_records_background.png).
  'art/ui/overlays/files_panel.png': 'e1107f217c4a5281bd6ecdc731db64e06cb9e3919d8385744d40de7ea3f92baa', // 1255x822 RGB
  // Owner NOTES v2 candidate (docs/63, notes_files_records_background_v2.png): committed and pinned;
  // the game loads it only if G.TUNING.overlay.notesPanel is 2 (production: 1). The polish lab toggles it.
  'art/ui/overlays/notes_panel_v2.png': '4bc4bf47809fd1e5cc9a9e560fa689a48addf5d6d18a6548ad6da5c3e29c3fa2', // 1255x822 RGB
  // Transient UI pass (docs/61): the item-received slip.
  'art/ui/overlays/item_received_slip.png': '993ecdb6fb11e27b41c0eec07221a3421398458fa1a06d82aae22e8eb423797c' // 560x116 RGBA, hard alpha
};
const PANEL_ART = 'art/ui/overlays/notes_files_panel.png'; // NOTES
const FILES_PANEL = 'art/ui/overlays/files_panel.png';
const NOTES_V2 = 'art/ui/overlays/notes_panel_v2.png';
const SLIP_ART = 'art/ui/overlays/item_received_slip.png';
const NOTICE_RECT = [56, 738, 560, 116]; // game/js/stage.js, unchanged
const NOTICE_ITEM = [14, 9]; // the 96x96 slot art inside the slip
const INSPECT_ART = 'art/items/bathroom_pass_inspect.png';
const CLOSE_UP = 'art/ui/sprites/inspect_close_up.png';
const CLOSE_DOWN = 'art/ui/sprites/inspect_close_down.png';
const INSPECT_RECT = [1331, 50, 565, 451]; // game/js/stage.js, unchanged
const CLOSE_RECT = [1331 + 565 - 44 - 8, 50 + 8, 44, 44]; // the X, unchanged
const SCENE_ART = 'art/scenes/conference_hall/reception/reception_scene.png';
const BG_ART = 'art/portraits/receptionist/reception_background.png';
const NPC_ART = 'art/portraits/receptionist/receptionist_idle.png';
const OVERLAY_ART = 'art/ui/shell/item-overlay.png';
// M1 surfaces the slice must not change: runtime art, design contracts and the lab. Mutable project
// documentation (README, docs/) is governed by PMO review, not pinned to the M2 starting bytes.
const M1_PROTECTED = ['art/ui', 'art/actions', 'art/items', 'design', 'tools/layout-lab'];

// Minimal PNG decoder (8-bit grey/RGB/RGBA, non-interlaced: Pillow exports, the shell and browser
// screenshots), so pixel checks never depend on a browser's canvas colour handling.
function decodePng(buf) {
  let pos = 8, width, height, depth, type, interlace;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), t = buf.toString('ascii', pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (t === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    if (t === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  if (depth !== 8 || !ch || interlace) throw new Error(`unsupported PNG (depth ${depth}, type ${type}, interlace ${interlace})`);
  const raw = require('zlib').inflateSync(Buffer.concat(idat)), stride = width * ch, px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? px[y * stride + i - ch] : 0, b = y ? px[(y - 1) * stride + i] : 0, c = y && i >= ch ? px[(y - 1) * stride + i - ch] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + i] = v & 255;
    }
  }
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const k = i * ch;
    if (ch <= 2) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = px[k]; data[i * 4 + 3] = ch === 2 ? px[k + 1] : 255; }
    else { data[i * 4] = px[k]; data[i * 4 + 1] = px[k + 1]; data[i * 4 + 2] = px[k + 2]; data[i * 4 + 3] = ch === 4 ? px[k + 3] : 255; }
  }
  return { width, height, type, data };
}
const pngCache = {};
const png = (rel) => (pngCache[rel] = pngCache[rel] || decodePng(fs.readFileSync(path.join(ROOT, rel))));
const pxAt = (img, x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; };
const sameRgb = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// Compares a 1920x1080 screenshot with the exact expected art wherever the canonical shell is fully
// transparent: the scene as a 4x nearest-neighbour upscale of its 314x206 file, the portrait as the
// 1:1 background with the binary-alpha NPC over it. Also checks the scene's 1 px / 2 px overflow is
// clipped (only the shell over the stage colour shows just outside the aperture).
function compareScreen(buf, regions, opts = {}) {
  const shot = decodePng(buf), shell = png(SHELL_PATH), scene = png(SCENE_ART), bg = png(BG_ART), npc = png(NPC_ART);
  const [sx, sy, sw, sh] = regions.sceneAperture.rect, [px, py, pw, ph] = regions.portraitAperture.rect;
  const out = { width: shot.width, height: shot.height, sceneChecked: 0, sceneBad: 0, portraitChecked: 0, portraitBad: 0, npcShown: 0, clipChecked: 0, clipBad: 0, first: null };
  for (let y = sy; y < sy + sh; y++) for (let x = sx; x < sx + sw; x++) {
    if (pxAt(shell, x, y)[3] !== 0) continue;
    out.sceneChecked++;
    const want = pxAt(scene, (x - sx) >> 2, (y - sy) >> 2), got = pxAt(shot, x, y);
    if (!sameRgb(want, got)) { out.sceneBad++; out.first = out.first || { x, y, want, got }; }
  }
  for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) {
    if (pxAt(shell, x, y)[3] !== 0) continue;
    out.portraitChecked++;
    const n = pxAt(npc, x - px, y - py), useNpc = opts.npc !== false && n[3] === 255;
    if (useNpc) out.npcShown++;
    const want = useNpc ? n : pxAt(bg, x - px, y - py), got = pxAt(shot, x, y);
    if (!sameRgb(want, got)) { out.portraitBad++; out.first = out.first || { x, y, want, got }; }
  }
  const edge = [];
  for (let x = sx; x <= sx + sw; x++) for (let y = sy + sh; y < sy + sh + 2; y++) edge.push([x, y]);
  for (let y = sy; y < sy + sh; y++) edge.push([sx + sw, y]);
  edge.forEach(([x, y]) => {
    const s = pxAt(shell, x, y), a = s[3] / 255, got = pxAt(shot, x, y);
    out.clipChecked++;
    if ([0, 1, 2].some((i) => Math.abs(s[i] * a + STAGE_BG[i] * (1 - a) - got[i]) > 2)) out.clipBad++;
  });
  return out;
}
// The stage colour the shell composites over just outside the apertures (game/game.css #stage).
const STAGE_BG = (() => {
  const m = /#stage\s*\{[^}]*background:\s*#([0-9a-f]{6})/i.exec(fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8'));
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
})();
// Pixels that differ between two screenshots, inside / outside a rectangle.
function diffInRect(a, b, r) {
  const A = decodePng(a), B = decodePng(b);
  let inside = 0, outside = 0;
  for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
    if (sameRgb(pxAt(A, x, y), pxAt(B, x, y))) continue;
    if (x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) inside++; else outside++;
  }
  return { inside, outside };
}

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
  // Repaired 2026-11-07 (docs/57): the guard used to pin README.md and docs/ too, but approved PMO
  // documentation (docs/45 section 6A, README) has since changed on main, so it failed for reasons
  // unrelated to M1. It now pins exactly the M1 runtime art, design contracts and lab (M1_PROTECTED).
  const changedSinceStart = git('diff', '--name-only', '--diff-filter=MDRTC', START_SHA, '--', ...M1_PROTECTED).split('\n').filter(Boolean);
  // The lab's own regenerated QA results and screenshots are output, not M1 source.
  const outside = changedSinceStart.filter((f) => !MAINTENANCE.includes(f) && !/^tools\/layout-lab\/qa\/(qa_results\.json|screenshots\/)/.test(f));
  check(b, 'M1 UI art, actions, items, design and lab are unchanged since M2 began, apart from the owner\'s recorded edits', outside.length === 0, outside);
  // The owner's item-inspector column overlay (docs/45 section 7) is pinned by hash and used
  // directly by the reception inspector. Remaining unapproved art is drawn as DEV placeholders.
  const added = git('diff', '--name-only', '--diff-filter=A', START_SHA, '--', 'art', 'design', 'tools/layout-lab').split('\n').filter(Boolean);
  // Repaired 2026-11-07 (docs/57): the approved reception production art is now admitted by exact
  // path and hash (PRODUCTION_ART). No folder wildcard: any other new file under art/ still fails.
  const unexpected = added.filter((f) => !(f in OWNER_ART) && !(f in PRODUCTION_ART));
  check(b, 'nothing was added to art/, design/ or the lab except the owner\'s pinned art and the approved reception art', unexpected.length === 0, unexpected);
  const prodBad = Object.keys(PRODUCTION_ART).filter((f) => !fs.existsSync(path.join(ROOT, f)) || sha256(fs.readFileSync(path.join(ROOT, f))) !== PRODUCTION_ART[f]);
  check(b, 'the three approved reception art files exist at their production paths with their approved hashes', prodBad.length === 0, prodBad);
  const sc = png(SCENE_ART), bgi = png(BG_ART), npc = png(NPC_ART);
  check(b, 'scene art is 314x206 opaque RGB', sc.width === 314 && sc.height === 206 && sc.type === 2, [sc.width, sc.height, sc.type]);
  check(b, 'portrait background is 564x278 opaque RGB', bgi.width === 564 && bgi.height === 278 && bgi.type === 2, [bgi.width, bgi.height, bgi.type]);
  const alphas = new Set();
  let hiddenRgb = 0;
  for (let i = 0; i < npc.width * npc.height; i++) {
    const a = npc.data[i * 4 + 3];
    alphas.add(a);
    if (a === 0 && (npc.data[i * 4] || npc.data[i * 4 + 1] || npc.data[i * 4 + 2])) hiddenRgb++;
  }
  check(b, 'receptionist NPC is 564x278 RGBA with binary alpha {0,255}, real transparency and no RGB hidden under alpha 0',
    npc.width === 564 && npc.height === 278 && npc.type === 6 && [...alphas].sort((x, y) => x - y).join() === '0,255' && pxAt(npc, 0, 0)[3] === 0 && hiddenRgb === 0,
    { size: [npc.width, npc.height], type: npc.type, alphas: [...alphas].slice(0, 6), hiddenRgb });
  for (const f of ['receptionist_idle2.png', 'receptionist_idle3.png']) {
    const alt = png('art/portraits/receptionist/' + f), altAlpha = new Set();
    let altHidden = 0;
    for (let i = 0; i < alt.width * alt.height; i++) {
      const a = alt.data[i * 4 + 3];
      altAlpha.add(a);
      if (a === 0 && (alt.data[i * 4] || alt.data[i * 4 + 1] || alt.data[i * 4 + 2])) altHidden++;
    }
    check(b, `alternate NPC design candidate (${f}) is 564x278 RGBA with binary alpha and no RGB hidden under alpha 0`, alt.width === 564 && alt.height === 278
      && alt.type === 6 && [...altAlpha].sort((x, y) => x - y).join() === '0,255' && altHidden === 0, { size: [alt.width, alt.height], altHidden });
  }
  const candidates = git('ls-files', 'art').split('\n').filter((f) => /_candidate_/.test(f));
  check(b, 'no duplicate candidate PNGs remain beside the production files', candidates.length === 0, candidates);
  const ins = png(INSPECT_ART);
  check(b, 'FACILITIES KEY inspect art is 565x451 opaque RGB, the exact inspector art rectangle', ins.width === INSPECT_RECT[2] && ins.height === INSPECT_RECT[3] && ins.type === 2,
    [ins.width, ins.height, ins.type]);
  check(b, 'the FACILITIES KEY content entry points at its approved inspect art', content.items.wc_key.inspectArt === INSPECT_ART, content.items.wc_key.inspectArt);
  const xs = [CLOSE_UP, CLOSE_DOWN].map((f) => {
    const im = png(f), al = new Set();
    for (let i = 0; i < im.width * im.height; i++) al.add(im.data[i * 4 + 3]);
    return { f, size: [im.width, im.height], type: im.type, alpha: [...al].sort((x, y) => x - y).join() };
  });
  check(b, 'inspector X up/down sprites are 44x44 RGBA with hard alpha {0,255} and differ (a real pressed state)',
    xs.every((x) => x.size.join() === '44,44' && x.type === 6 && x.alpha === '0,255') && !png(CLOSE_UP).data.equals(png(CLOSE_DOWN).data), xs);
  const ph = fs.readFileSync(path.join(ROOT, 'game/js/placeholders.js'), 'utf8');
  check(b, 'the drawn X placeholder is retired (no caller remained); the inspect-art fallback placeholder stays', !/closeButton/.test(ph + fs.readFileSync(path.join(ROOT, 'game/js/stage.js'), 'utf8'))
    && /P\.inspectArt = function/.test(ph));
  const panels = [PANEL_ART, FILES_PANEL, NOTES_V2].map((f) => { const im = png(f); return [f, im.width, im.height, im.type]; });
  check(b, 'NOTES, FILES and NOTES v2 panels are each 1255x822 opaque RGB, exactly the scene aperture', panels.every((x) => x[1] === 1255 && x[2] === 822 && x[3] === 2), panels);
  check(b, 'the FILES panel is its own art, not the NOTES panel', !png(FILES_PANEL).data.equals(png(PANEL_ART).data) && !png(NOTES_V2).data.equals(png(PANEL_ART).data));
  const tuningSrc = fs.readFileSync(path.join(ROOT, 'game/js/tuning.js'), 'utf8');
  check(b, 'production NOTES panel is v1 (G.TUNING.overlay.notesPanel: 1)', /notesPanel: 1\b/.test(tuningSrc));
  const stageSrc = fs.readFileSync(path.join(ROOT, 'game/js/stage.js'), 'utf8');
  check(b, 'NOTES/FILES no longer use the P.panel placeholder; P.panel stays for the inspect-art fallback', !/P\.panel\(/.test(stageSrc)
    && /P\.panel = function/.test(ph) && /P\.panel\(canvas/.test(ph));
  const sl = png(SLIP_ART), slAlpha = new Set();
  let slHidden = 0;
  for (let i = 0; i < sl.width * sl.height; i++) {
    const a = sl.data[i * 4 + 3];
    slAlpha.add(a);
    if (a === 0 && (sl.data[i * 4] || sl.data[i * 4 + 1] || sl.data[i * 4 + 2])) slHidden++;
  }
  check(b, 'item-received slip is 560x116 RGBA, hard alpha {0,255}, no RGB hidden under alpha 0', sl.width === 560 && sl.height === 116 && sl.type === 6
    && [...slAlpha].sort((x, y) => x - y).join() === '0,255' && slHidden === 0, { size: [sl.width, sl.height], slHidden });
  check(b, 'the provisional code-drawn slip is gone (no paper/ink/rule fills or stepped corners in stage.js)',
    !/NOTICE_INK|NOTICE_PAPER|NOTICE_RULE|Stepped \(2px\) corners/.test(stageSrc));
  const gameCss = fs.readFileSync(path.join(ROOT, 'game/game.css'), 'utf8');
  const tip = (/\.tooltip \{[\s\S]*?\n\}/.exec(gameCss) || [''])[0];
  check(b, 'tooltip box is hard-edged CSS: chamfered, no blur/glow/gradient/filter/transition, not a bitmap',
    /clip-path:\s*polygon/.test(tip) && !/filter|transition|gradient|url\(/.test(tip)
    && (tip.match(/inset [^,;]+/g) || []).every((sh) => /inset -?\d+p?x? -?\d+p?x? 0 /.test(sh.replace(/\s+/g, ' '))), tip.slice(0, 400));
  check(b, 'inspector rendering is generic: stage.js names no specific item (no wc_key / FACILITIES / bathroom_pass logic)',
    !/wc_key|facilities|bathroom_pass/i.test(fs.readFileSync(path.join(ROOT, 'game/js/stage.js'), 'utf8')));
  const ownerArtBad = Object.keys(OWNER_ART).filter((f) => !fs.existsSync(path.join(ROOT, f)) || sha256(fs.readFileSync(path.join(ROOT, f))) !== OWNER_ART[f]);
  check(b, 'the owner\'s added art matches its pinned hash', ownerArtBad.length === 0, ownerArtBad);
  const working = git('status', '--porcelain', '--', ...M1_PROTECTED, ...Object.keys(PRODUCTION_ART)).split('\n')
    .filter((l) => l && !/tools\/layout-lab\/qa\/(qa_results\.json|screenshots\/)/.test(l)).join('\n');
  check(b, 'no uncommitted change to M1 art, design, lab or the reception production art', working === '', working);
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
  check(b, 'only the fitted glyph boxes (a c e l r v w x [ ]) changed, same characters and advances',
    boxChanged.sort().join('') === '[]acelrvwx' && Object.keys(newMap).join('') === Object.keys(oldMap).join('')
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

// Production reception art (docs/57) ------------------------------------------------------------
// A fresh page: the opening line finishes and the choices arrive, so nothing but the art and the
// shell occupies the two apertures. Geometry, layer order and exact pixels; then a QA-only hide of
// the NPC layer (a mutation made here, not a shipped control).
async function artChecks(browser, base, measured, c) {
  const { page, context, errors } = await openGame(browser, base);
  await skipToChoices(page);
  await page.waitForTimeout(300);
  const g = await page.evaluate(() => {
    const box = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
    const style = (e) => { const s = getComputedStyle(e); return { t: s.transform, r: s.imageRendering, o: s.opacity, f: s.filter, tr: s.transitionDuration }; };
    const sc = document.getElementById('scene'), img = sc.querySelector('img'), pr = document.getElementById('portrait');
    const anc = [];
    for (let e = img; e; e = e.parentElement) { const t = getComputedStyle(e).transform; if (t !== 'none') anc.push(e.id || e.tagName); }
    return {
      dpr: window.devicePixelRatio,
      sceneBox: box(sc), sceneClip: getComputedStyle(sc).overflowX + '/' + getComputedStyle(sc).overflowY,
      sceneImg: { id: img.id, natural: [img.naturalWidth, img.naturalHeight], box: box(img), src: img.getAttribute('src'), st: style(img), kids: sc.children.length },
      portraitBox: box(pr), portraitClip: getComputedStyle(pr).overflowX + '/' + getComputedStyle(pr).overflowY,
      layers: Array.from(pr.children).map((e) => ({ id: e.id, tag: e.tagName, box: box(e), natural: e.tagName === 'IMG' ? [e.naturalWidth, e.naturalHeight] : null,
        src: e.getAttribute('src'), st: style(e), kids: e.children.length })),
      stageOrder: Array.from(document.getElementById('stage').children).map((e) => e.id).slice(0, 4),
      transforms: anc
    };
  });
  const S = measured.sceneAperture.rect, P = measured.portraitAperture.rect;
  const nn = (r) => r === 'pixelated' || r === 'crisp-edges';
  c('art proof runs at canonical 1920x1080, devicePixelRatio 1, with no transform above the scene art', g.dpr === 1 && g.transforms.length === 0, g.transforms);
  c('scene aperture is the committed 1255x822 rectangle and clips its content', JSON.stringify(g.sceneBox) === JSON.stringify(S) && /^(hidden|clip)\/(hidden|clip)$/.test(g.sceneClip), g);
  c('scene art: 314x206 natural, displayed at exactly 4x (1256x824) from the aperture origin, nearest neighbour, no transform/filter/opacity/transition',
    g.sceneImg.kids === 1 && g.sceneImg.id === 'sceneArt' && /reception_scene\.png$/.test(g.sceneImg.src) && g.sceneImg.natural.join() === '314,206'
    && JSON.stringify(g.sceneImg.box) === JSON.stringify([S[0], S[1], 1256, 824]) && g.sceneImg.box[2] / 314 === 4 && g.sceneImg.box[3] / 206 === 4
    && g.sceneImg.st.t === 'none' && nn(g.sceneImg.st.r) && g.sceneImg.st.o === '1' && g.sceneImg.st.f === 'none' && parseFloat(g.sceneImg.st.tr) === 0, g.sceneImg);
  c('portrait aperture is the committed 564x278 rectangle and clips its content', JSON.stringify(g.portraitBox) === JSON.stringify(P) && /^(hidden|clip)\/(hidden|clip)$/.test(g.portraitClip), g);
  c('portrait layers, in order: background -> rear/mid FX -> NPC -> foreground FX (four separate elements, no canvas)',
    g.layers.map((l) => l.id + ':' + l.tag).join() === 'portraitBackground:IMG,portraitRearFx:DIV,portraitNpc:IMG,portraitFrontFx:DIV', g.layers.map((l) => l.id + ':' + l.tag));
  const [bgL, rearL, npcL, frontL] = g.layers;
  c('portrait background and NPC: 564x278 natural, displayed at exactly 1x (564x278) at the aperture origin, no transform/filter/opacity/transition',
    [bgL, npcL].every((l) => l.natural.join() === '564,278' && JSON.stringify(l.box) === JSON.stringify(P) && l.st.t === 'none' && nn(l.st.r)
      && l.st.o === '1' && l.st.f === 'none' && parseFloat(l.st.tr) === 0)
    && /reception_background\.png$/.test(bgL.src) && /receptionist_idle\.png$/.test(npcL.src), [bgL, npcL]);
  c('FX layers are present, empty and cover the aperture', [rearL, frontL].every((l) => l.kids === 0 && JSON.stringify(l.box) === JSON.stringify(P)), [rearL, frontL]);
  c('stage order: scene, portrait, overlay, then the shell on top', g.stageOrder.join() === 'scene,portrait,overlay,shell', g.stageOrder);
  const dupIds = await page.evaluate(() => { const seen = {}; document.querySelectorAll('[id]').forEach((e) => { seen[e.id] = (seen[e.id] || 0) + 1; }); return Object.keys(seen).filter((k) => seen[k] > 1); });
  c('every element id on the page is unique', dupIds.length === 0, dupIds);

  const on = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  await shot(page, '00_reception_art_dialogue.png');
  const cmp = compareScreen(on, measured);
  c('every clear-shell scene pixel is the exact 4x nearest-neighbour block of the 314x206 file', cmp.sceneChecked > 900000 && cmp.sceneBad === 0, cmp);
  c('every clear-shell portrait pixel equals the 1:1 background + binary-alpha NPC composite', cmp.portraitChecked > 140000 && cmp.portraitBad === 0 && cmp.npcShown > 10000, cmp);
  c('the scene\'s 1 px right / 2 px bottom overflow is clipped by the aperture', cmp.clipBad === 0, { clipChecked: cmp.clipChecked, clipBad: cmp.clipBad });

  // QA-only mutation: hide the NPC layer. The background must show alone, exactly, and nothing
  // outside the portrait aperture may change.
  await page.evaluate(() => { document.getElementById('portraitNpc').style.visibility = 'hidden'; });
  const off = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  fs.writeFileSync(path.join(SHOTS, '00a_reception_art_npc_hidden_qa_only.png'), off);
  const cmpOff = compareScreen(off, measured, { npc: false });
  const d = diffInRect(on, off, P);
  c('QA-only NPC hide: the portrait background stays intact and exact', cmpOff.portraitBad === 0 && cmpOff.npcShown === 0, cmpOff);
  c('QA-only NPC hide changes only portrait-aperture pixels', d.inside > 10000 && d.outside === 0, d);
  await page.evaluate(() => { document.getElementById('portraitNpc').style.visibility = ''; });
  c('the game ships no NPC toggle or debug control for the portrait layers', await page.evaluate(() => !document.querySelector('[id*="npcToggle"], [data-npc-toggle]')
    && !(window.CYOA_GAME.debug && Object.keys(window.CYOA_GAME.debug).some((k) => /npc|portrait/i.test(k)))));
  c('no errors while proving the art', errors.length === 0, errors);
  await context.close();
}

// The suite ------------------------------------------------------------------------------------
async function suite(name, base, requests) {
  const browser = await playwright[name].launch();
  const c = (n, ok, d) => check(name, n, ok, d);
  const { page, context, errors, bodies } = await openGame(browser, base, { hashes: true });

  // Load, assets, geometry -----------------------------------------------------------------
  c('page loads ready', (await page.evaluate(() => document.body.dataset.ready)) === 'true');
  c('FACILITIES KEY inspect art and both X sprites are loaded and decoded before ready', await page.evaluate(() =>
    ['inspect:wc_key', 'ui:inspect_close_up', 'ui:inspect_close_down'].every((n) => { const i = window.CYOA_GAME.image(n); return i && i.complete && i.naturalWidth > 0; })));
  c('the NOTES and FILES panels are loaded and decoded before ready, and served as the approved bytes', (await page.evaluate(() =>
    ['ui:notes_files_panel', 'ui:files_panel'].every((n) => { const i = window.CYOA_GAME.image(n); return !!(i && i.complete && i.naturalWidth === 1255); })))
    && bodies[PANEL_ART] === PRODUCTION_ART[PANEL_ART] && bodies[FILES_PANEL] === PRODUCTION_ART[FILES_PANEL], [bodies[PANEL_ART], bodies[FILES_PANEL]]);
  c('the NOTES v2 candidate is never requested by the production game', !requests.some((r) => /notes_panel_v2\.png$/.test(r))
    && !(await page.evaluate(() => window.CYOA_GAME.image('ui:notes_panel_v2'))));
  c('the production game exposes no live-rebuild caller (G.rebuildStage is the polish lab\'s only)', !/rebuildStage/.test(['flow.js', 'main.js'].map((f) => fs.readFileSync(path.join(ROOT, 'game/js', f), 'utf8')).join('')));
  c('the item-received slip is loaded and decoded before ready, and served as the approved bytes', (await page.evaluate(() => {
    const i = window.CYOA_GAME.image('ui:item_received_slip'); return !!(i && i.complete && i.naturalWidth === 560);
  })) && bodies[SLIP_ART] === PRODUCTION_ART[SLIP_ART], bodies[SLIP_ART]);
  c('served inspector art bytes are the approved files', [INSPECT_ART, CLOSE_UP, CLOSE_DOWN].every((f) => bodies[f] === PRODUCTION_ART[f]),
    [INSPECT_ART, CLOSE_UP, CLOSE_DOWN].map((f) => [f, bodies[f]]));
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
  c('scene aperture container sits exactly on the committed scene aperture', JSON.stringify(await rect('#scene')) === JSON.stringify(measured.sceneAperture.rect));
  c('portrait aperture container sits exactly on the committed portrait aperture', JSON.stringify(await rect('#portrait')) === JSON.stringify(measured.portraitAperture.rect));
  c('scene and portrait sit beneath the shell, so no frame pixel is covered',
    await page.evaluate(() => {
      const kids = Array.from(document.getElementById('stage').children);
      const shell = kids.indexOf(document.getElementById('shell'));
      return kids.indexOf(document.getElementById('scene')) < shell && kids.indexOf(document.getElementById('portrait')) < shell;
    }));
  c('no scene or portrait placeholder remains (no canvas, no placeholder label)', await page.evaluate(() => ['scene', 'portrait'].every((id) => {
    const e = document.getElementById(id);
    return e.tagName === 'DIV' && !e.querySelector('canvas') && !e.dataset.placeholder && !/placeholder|COMMISSIONED/i.test(e.outerHTML);
  })));
  // The three files the game loads (idle2 is pinned but deliberately not loaded).
  c('served reception art bytes are the approved files', [SCENE_ART, BG_ART, NPC_ART].every((f) => bodies[f] === PRODUCTION_ART[f]),
    [SCENE_ART, BG_ART, NPC_ART].map((f) => [f, bodies[f]]));
  c('the game loads only receptionist_idle.png; the alternate NPC designs (idle2, idle3) are never requested', !requests.some((r) => /receptionist_idle[23]\.png$/.test(r)));
  await artChecks(browser, base, measured, c);
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
  await page.screenshot({ path: path.join(SHOTS, '00m_tooltip_disabled_reason.png'), clip: { x: 1000, y: 700, width: 920, height: 380 } });
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
  const slip = await page.evaluate((it) => {
    const cv = document.getElementById('itemNoticeContent');
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let soft = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] !== 0 && d[i] !== 255) soft++;
    const icon = cv.getContext('2d').getImageData(it[0], it[1], 96, 96).data;
    let iconInk = 0;
    for (let i = 0; i < icon.length; i += 4) if (icon[i] < 150 && icon[i + 3] === 255) iconInk++;
    return { soft, iconInk, w: cv.width, h: cv.height, smoothing: getComputedStyle(cv).imageRendering };
  }, NOTICE_ITEM);
  c('the slip carries the item\'s slot art, drawn crisp at 1:1 with hard alpha', slip.soft === 0 && slip.iconInk > 200 && slip.w === notice.w && /pixelated|crisp-edges/.test(slip.smoothing), slip);
  await shot(page, '05b_item_received.png');
  await shot(page, '00j_item_received_slip.png');
  {
    const g = await page.evaluate(() => {
      const box = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
      const n = document.getElementById('itemNotice'), bg = document.getElementById('itemNoticeBackground'), s = getComputedStyle(bg);
      const anc = [];
      for (let e = bg; e; e = e.parentElement) { const st = getComputedStyle(e); if (st.transform !== 'none' || st.filter !== 'none' || st.opacity !== '1') anc.push(e.id || e.tagName); }
      return { kids: Array.from(n.children).map((k) => k.tagName + '#' + k.id), natural: [bg.naturalWidth, bg.naturalHeight], bgBox: box(bg), nBox: box(n),
        st: [s.transform, s.imageRendering, s.opacity, s.filter, s.transitionDuration], anc };
    });
    c('slip = img#itemNoticeBackground (production art) under canvas#itemNoticeContent (item + text only)', g.kids.join() === 'IMG#itemNoticeBackground,CANVAS#itemNoticeContent', g.kids);
    c('slip art: 560x116 natural, displayed 1:1 exactly on NOTICE_RECT, no transform/filter/opacity/transition, smoothing off',
      g.natural.join() === '560,116' && JSON.stringify(g.bgBox) === JSON.stringify(NOTICE_RECT) && JSON.stringify(g.nBox) === JSON.stringify(NOTICE_RECT)
      && g.st[0] === 'none' && /pixelated|crisp-edges/.test(g.st[1]) && g.st[2] === '1' && g.st[3] === 'none' && parseFloat(g.st[4]) === 0 && g.anc.length === 0, g);
    const scr = decodePng(await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } }));
    const cv = decodePng(Buffer.from((await page.$eval('#itemNoticeContent', (c2) => c2.toDataURL('image/png'))).split(',')[1], 'base64'));
    const slipPng = png(SLIP_ART), slot = png(PASS_PATH);
    let checked = 0, bad = 0, itemPx = 0, itemBad = 0;
    const inks = { label: new Set(), name: new Set() };
    for (let y = 0; y < 116; y++) for (let x = 0; x < 560; x++) {
      const t = pxAt(cv, x, y);
      const inItem = x >= NOTICE_ITEM[0] && x < NOTICE_ITEM[0] + 96 && y >= NOTICE_ITEM[1] && y < NOTICE_ITEM[1] + 96;
      if (t[3] !== 0) {
        if (inItem) { itemPx++; const sp = pxAt(slot, x - NOTICE_ITEM[0], y - NOTICE_ITEM[1]); if (!sameRgb(sp, t) || sp[3] !== 255) itemBad++; }
        else (y < 49 ? inks.label : inks.name).add(t.slice(0, 3).join());
        continue;
      }
      if (pxAt(slipPng, x, y)[3] !== 255) continue;
      checked++;
      if (!sameRgb(pxAt(slipPng, x, y), pxAt(scr, NOTICE_RECT[0] + x, NOTICE_RECT[1] + y))) bad++;
    }
    c('every item- and text-free slip pixel equals the 560x116 file 1:1', checked > 50000 && bad === 0, { checked, bad });
    c('the item\'s 96x96 slot art sits 1:1 in the slip\'s item compartment', itemPx > 1000 && itemBad === 0, { itemPx, itemBad });
    c('ITEM RECEIVED (upper band) and the item name (lower band) are drawn dynamically in one dark ink', inks.label.size === 1 && inks.name.size === 1
      && [...inks.label][0] === '32,48,55' && [...inks.name][0] === '32,48,55', { label: [...inks.label], name: [...inks.name] });
  }
  await page.click('#itemNotice');
  c('clicking the slip dismisses it early', (await page.$eval('#itemNotice', (e) => e.style.display)) === 'none' && !(await game(page, () => window.CYOA_GAME.ui.notice)));
  c('the slot shows the approved bathroom pass art', await page.$eval('#invWindow .slot[data-item="wc_key"] img.item-art', (i) => /bathroom_pass_slot\.png$/.test(i.src) && i.naturalWidth === 96));
  await shot(page, '00k_after_slip_dismissed.png');
  {
    // Tooltip: separate box beside the button, inside the stage, never over the button; baked Labels face.
    const tipInfo = () => page.evaluate(() => {
      const t = document.getElementById('tooltip'), cvs = t.querySelector('canvas');
      const shown = t.style.display !== 'none';
      const r = [parseInt(t.style.left), parseInt(t.style.top), parseInt(t.style.width), parseInt(t.style.height)];
      const b = document.getElementById('util-0'), br = [parseInt(b.style.left), parseInt(b.style.top), parseInt(b.style.width), parseInt(b.style.height)];
      const s = getComputedStyle(t);
      const d = cvs.getContext('2d').getImageData(0, 0, cvs.width, cvs.height).data, ink = new Set();
      for (let i = 0; i < d.length; i += 4) if (d[i + 3]) ink.add([d[i], d[i + 1], d[i + 2], d[i + 3]].join());
      return { shown, text: t.dataset.text, r, br, filter: s.filter, transition: s.transitionDuration, opacity: s.opacity, ch: cvs.height,
        lh: window.CYOA_GAME.text.lineHeight('labels'), ink: [...ink] };
    });
    await page.mouse.move(600, 400);
    await page.hover('#util-0');
    const t1 = await tipInfo();
    const overlap = (a, b2) => a[0] < b2[0] + b2[2] && b2[0] < a[0] + a[2] && a[1] < b2[1] + b2[3] && b2[1] < a[1] + a[3];
    c('INSPECT tooltip shows on hover with the enabled label', t1.shown && t1.text === 'INSPECT', t1.text);
    c('the tooltip stays inside the 1920x1080 stage and never covers its button', t1.r[0] >= 0 && t1.r[1] >= 0 && t1.r[0] + t1.r[2] <= 1920 && t1.r[1] + t1.r[3] <= 1080
      && !overlap(t1.r, t1.br), { r: t1.r, br: t1.br });
    c('tooltip text is the baked Labels face in one light ink; box has no filter, transition or opacity change',
      t1.ch === t1.lh && t1.ink.length === 1 && t1.filter === 'none' && parseFloat(t1.transition) === 0 && t1.opacity === '1', t1);
    await page.screenshot({ path: path.join(SHOTS, '00l_tooltip_inspect_enabled.png'), clip: { x: 1000, y: 700, width: 920, height: 380 } });
    await page.mouse.move(600, 400);
    c('the tooltip disappears when the pointer leaves', (await page.$eval('#tooltip', (t) => t.style.display)) === 'none');
    await page.focus('#util-0');
    const tf = await tipInfo();
    await page.evaluate(() => document.activeElement.blur());
    c('keyboard focus shows the tooltip, and losing focus hides it', tf.shown && tf.text === 'INSPECT' && (await page.$eval('#tooltip', (t) => t.style.display)) === 'none', tf.text);
  }
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
  await shot(page, '00b_reception_art_inspector_open.png');
  await shot(page, '00c_inspector_facilities_key_before_read.png');
  {
    const g = await page.evaluate(() => {
      const box = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
      const a = document.getElementById('inspectArt'), img = a.querySelector('img'), s = img && getComputedStyle(img);
      const anc = [];
      for (let e = img; e; e = e.parentElement) if (getComputedStyle(e).transform !== 'none') anc.push(e.id || e.tagName);
      return { kind: a.dataset.kind, kids: Array.from(a.children).map((k) => k.tagName + '#' + k.id), box: box(a),
        img: img && { natural: [img.naturalWidth, img.naturalHeight], box: box(img), src: img.getAttribute('src'), complete: img.complete,
          st: [s.transform, s.imageRendering, s.opacity, s.filter, s.transitionDuration] },
        anc, colAfter: (a.compareDocumentPosition(document.getElementById('inspectColumn')) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 };
    });
    c('FACILITIES KEY inspector shows its real art image, not the placeholder canvas', g.kind === 'art' && g.kids.join() === 'IMG#inspectImage', g);
    c('inspect art: 565x451 natural, displayed 1:1 exactly on INSPECT_RECT, no transform/filter/opacity/transition, smoothing off, under the item overlay',
      g.img && g.img.natural.join() === '565,451' && JSON.stringify(g.img.box) === JSON.stringify(INSPECT_RECT) && JSON.stringify(g.box) === JSON.stringify(INSPECT_RECT)
      && /bathroom_pass_inspect\.png$/.test(g.img.src) && g.img.st[0] === 'none' && /pixelated|crisp-edges/.test(g.img.st[1]) && g.img.st[2] === '1'
      && g.img.st[3] === 'none' && parseFloat(g.img.st[4]) === 0 && g.anc.length === 0 && g.colAfter, g);
    // Every inspect-art pixel the overlay and the X leave visible is the file's own pixel, 1:1.
    const scr = decodePng(await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } }));
    const ov = png(OVERLAY_ART), art = png(INSPECT_ART), up = png(CLOSE_UP);
    let artChecked = 0, artBad = 0, xChecked = 0, xBad = 0;
    for (let y = INSPECT_RECT[1]; y < INSPECT_RECT[1] + INSPECT_RECT[3]; y++) for (let x = INSPECT_RECT[0]; x < INSPECT_RECT[0] + INSPECT_RECT[2]; x++) {
      const inX = x >= CLOSE_RECT[0] && x < CLOSE_RECT[0] + 44 && y >= CLOSE_RECT[1] && y < CLOSE_RECT[1] + 44;
      if (inX) {
        const u = pxAt(up, x - CLOSE_RECT[0], y - CLOSE_RECT[1]);
        if (u[3] === 255) { xChecked++; if (!sameRgb(u, pxAt(scr, x, y))) xBad++; }
        continue;
      }
      if (pxAt(ov, x, y)[3] !== 0) continue;
      artChecked++;
      if (!sameRgb(pxAt(art, x - INSPECT_RECT[0], y - INSPECT_RECT[1]), pxAt(scr, x, y))) artBad++;
    }
    c('every inspect-art pixel left visible by the overlay and the X equals the 565x451 file 1:1', artChecked > 200000 && artBad === 0, { artChecked, artBad });
    c('the X shows its approved UP sprite, pixel for pixel, at its unchanged 44x44 place', xChecked > 1000 && xBad === 0
      && (await page.evaluate(() => {
        const b = document.getElementById('inspectClose'), r = b.getBoundingClientRect();
        return [r.left, r.top, r.width, r.height].join() + '|' + b.dataset.state + '|' + document.getElementById('inspectCloseUp').style.display + '|' + document.getElementById('inspectCloseDown').style.display
          + '|' + !b.querySelector('canvas');
      })) === CLOSE_RECT.join() + '|up||none|true', { xChecked, xBad });
  }
  {
    // The owner's item-column overlay still wins over the right column: wherever it is opaque the
    // screen shows the overlay, and the layered portrait no longer shows anywhere in its aperture.
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    const scr = decodePng(buf), ov = png(OVERLAY_ART), shell = png(SHELL_PATH), bgi = png(BG_ART), npc = png(NPC_ART);
    const [px, py, pw, ph] = measured.portraitAperture.rect;
    let ovChecked = 0, ovBad = 0, portraitStill = 0, clear = 0;
    for (let y = 0; y < 1080; y++) for (let x = 1300; x < 1920; x++) {
      const o = pxAt(ov, x, y);
      if (o[3] === 255) { ovChecked++; if (!sameRgb(o, pxAt(scr, x, y))) ovBad++; }
    }
    for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) {
      if (pxAt(shell, x, y)[3] !== 0) continue;
      clear++;
      const n = pxAt(npc, x - px, y - py), want = n[3] === 255 ? n : pxAt(bgi, x - px, y - py);
      if (sameRgb(want, pxAt(scr, x, y))) portraitStill++;
    }
    const order = await page.evaluate(() => {
      const kids = Array.from(document.getElementById('stage').children).map((e) => e.id);
      return { portrait: kids.indexOf('portrait'), shell: kids.indexOf('shell'), inspector: kids.indexOf('inspector') };
    });
    c('inspector open: the item overlay covers the right column exactly where it is opaque', ovChecked > 40000 && ovBad === 0, { ovChecked, ovBad });
    c('inspector open: the layered portrait is fully covered (drawn above portrait and shell)', order.inspector > order.shell && order.shell > order.portrait
      && portraitStill / clear < 0.01, { order, portraitStill, clear });
  }
  await page.hover('#util-1');
  c('a disabled button explains itself in its tooltip', (await page.$eval('#tooltip', (t) => t.style.display !== 'none' && t.dataset.text)) === 'SHOW - NOT AVAILABLE HERE');
  await page.screenshot({ path: path.join(SHOTS, '00n_tooltip_inspector_show_disabled.png'), clip: { x: 1000, y: 700, width: 920, height: 380 } });
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
  {
    const cmp = compareScreen(await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } }), measured);
    c('closing the inspector restores the exact layered receptionist portrait and scene', cmp.portraitBad === 0 && cmp.npcShown > 10000 && cmp.sceneBad === 0, cmp);
  }
  // Re-open with INSPECT, close with X, then SHOW.
  await page.click('#util-0');
  c('INSPECT opens the held item', (await game(page, () => window.CYOA_GAME.ui.inspector && window.CYOA_GAME.ui.inspector.id)) === 'wc_key');
  {
    // No hover look on the X; a press shows the DOWN sprite; a release on it closes; off it does not.
    const cx = CLOSE_RECT[0] + 22, cy = CLOSE_RECT[1] + 22, clip = { x: CLOSE_RECT[0], y: CLOSE_RECT[1], width: 44, height: 44 };
    await page.mouse.move(600, 400);
    const idleLook = await lookOf(page, '#inspectClose'), idlePx = await page.screenshot({ clip });
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(150);
    c('hovering the X changes nothing (no hover styling)', (await lookOf(page, '#inspectClose')) === idleLook && idlePx.equals(await page.screenshot({ clip })));
    await page.screenshot({ path: path.join(SHOTS, '00d_inspector_close_up.png'), clip: { x: CLOSE_RECT[0] - 38, y: CLOSE_RECT[1] - 8, width: 120, height: 120 } });
    await page.mouse.down();
    const st = () => page.evaluate(() => [document.getElementById('inspectClose').dataset.state, document.getElementById('inspectCloseUp').style.display,
      document.getElementById('inspectCloseDown').style.display, !!window.CYOA_GAME.ui.inspector].join());
    const pressed = await st();
    const downShot = decodePng(await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } })), dn = png(CLOSE_DOWN);
    let dChecked = 0, dBad = 0;
    for (let y = 0; y < 44; y++) for (let x = 0; x < 44; x++) {
      const d = pxAt(dn, x, y);
      if (d[3] === 255) { dChecked++; if (!sameRgb(d, pxAt(downShot, CLOSE_RECT[0] + x, CLOSE_RECT[1] + y))) dBad++; }
    }
    await page.screenshot({ path: path.join(SHOTS, '00e_inspector_close_down.png'), clip: { x: CLOSE_RECT[0] - 38, y: CLOSE_RECT[1] - 8, width: 120, height: 120 } });
    c('pressing the X swaps to its DOWN sprite (pixel for pixel) and keeps the item open', pressed === 'down,none,,true' && dChecked > 1000 && dBad === 0, { pressed, dChecked, dBad });
    await page.mouse.move(600, 400);
    await page.mouse.up();
    c('a press released off the X does not close the item and returns it to UP', (await st()) === 'up,,none,true', await st());
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.up();
  }
  c('the X closes the inspector', !(await game(page, () => window.CYOA_GAME.ui.inspector)));
  await page.click('#util-0');
  await page.focus('#inspectClose');
  await page.keyboard.down('Enter');
  const kDown = await page.evaluate(() => document.getElementById('inspectClose').dataset.state + ',' + !!window.CYOA_GAME.ui.inspector);
  await page.keyboard.up('Enter');
  c('the X works from the keyboard: Enter presses it (DOWN) and closes on release', kDown === 'down,true' && !(await game(page, () => window.CYOA_GAME.ui.inspector)), kDown);
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

  // Pixels: where the text canvas is empty and the shell is clear, the screen is the overlay's own
  // panel file, 1:1 (NOTES: notes_files_panel.png, FILES: files_panel.png).
  async function panelPixels(label, art, plate) {
    const S = measured.sceneAperture.rect;
    c(label + ' shows its own panel image', (await page.$eval('#overlayPanel', (e) => e.dataset.art)) === art, art);
    const scr = decodePng(await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } }));
    const cvPng = decodePng(Buffer.from((await page.$eval('#overlayCanvas', (c2) => c2.toDataURL('image/png'))).split(',')[1], 'base64'));
    const panel = png(art), shell = png(SHELL_PATH);
    let checked = 0, bad = 0, textPx = 0, first = null;
    const inks = { title: new Set(), body: new Set() };
    const tb = [1e9, 1e9, -1, -1];
    for (let y = 0; y < 822; y++) for (let x = 0; x < 1255; x++) {
      const t = pxAt(cvPng, x, y);
      if (t[3] !== 0) {
        textPx++;
        (y < 116 ? inks.title : inks.body).add(t.slice(0, 3).join());
        if (y < 116) { tb[0] = Math.min(tb[0], x); tb[1] = Math.min(tb[1], y); tb[2] = Math.max(tb[2], x); tb[3] = Math.max(tb[3], y); }
        continue;
      }
      if (pxAt(shell, S[0] + x, S[1] + y)[3] !== 0) continue;
      checked++;
      if (!sameRgb(pxAt(panel, x, y), pxAt(scr, S[0] + x, S[1] + y))) { bad++; first = first || { x, y }; }
    }
    c(label + ': every clear-shell, text-free overlay pixel equals its 1255x822 panel file 1:1', checked > 800000 && bad === 0 && textPx > 1000, { checked, bad, textPx, first });
    if (!plate) {
      c(label + ' ink: light title on the teal band, dark text on the cream reading area (one ink each, hard-edged)',
        inks.title.size === 1 && [...inks.title][0] !== '32,48,55' && inks.body.size === 1 && [...inks.body][0] === '32,48,55', { title: [...inks.title], body: [...inks.body] });
    } else {
      // plate = [x0, y0, x1, y1] inside the label plate's border, inclusive; centre [cx, cy].
      const cx = (tb[0] + tb[2] + 1) / 2, cy = (tb[1] + tb[3] + 1) / 2;
      c(label + ' ink: dark title and dark text (one ink each, hard-edged)', inks.title.size === 1 && [...inks.title][0] === '32,48,55'
        && inks.body.size === 1 && [...inks.body][0] === '32,48,55', { title: [...inks.title], body: [...inks.body] });
      c(label + ' title sits wholly inside the label plate, centred on it (within 1 px)', tb[0] > plate[0] && tb[1] > plate[1] && tb[2] < plate[2] && tb[3] < plate[3]
        && Math.abs(cx - plate[4]) <= 1 && Math.abs(cy - plate[5]) <= 1, { inkBox: tb, centre: [cx, cy], plate });
    }
  }

  // Transcript: NOTES and FILES ---------------------------------------------------------------
  await page.click('#util-1');
  c('NOTES opens the transcript over the scene', (await page.$eval('#overlay', (e) => e.style.display !== 'none')) && (await page.$eval('#overlay canvas', (c2) => c2.dataset.kind)) === 'notes');
  const notesText = await page.$eval('#overlay canvas', (c2) => c2.dataset.text);
  c('the transcript holds both speakers\' lines', /YOU:/.test(notesText) && /RECEPTIONIST:/.test(notesText) && /WHERE IS THE BATHROOM, PLEASE\?/.test(notesText));
  const notesMax = await game(page, () => window.CYOA_GAME.overlayMaxScroll());
  c('the transcript opens at its latest lines', (await page.$eval('#overlay canvas', (c2) => c2.dataset.scroll)) === String(notesMax), { notesMax });
  c('the transcript is long enough here to scroll (proof 00g is genuinely scrolled)', notesMax > 0, { notesMax });
  await shot(page, '00g_notes_scrolled_to_latest.png');
  {
    // Structure: the production panel image at 1x under a transparent text-only canvas.
    const g = await page.evaluate(() => {
      const box = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
      const o = document.getElementById('overlay'), img = document.getElementById('overlayPanel'), cv = document.getElementById('overlayCanvas'), s = getComputedStyle(img);
      const anc = [];
      for (let e = img; e; e = e.parentElement) if (getComputedStyle(e).transform !== 'none') anc.push(e.id || e.tagName);
      return { kids: Array.from(o.children).map((k) => k.tagName + '#' + k.id), natural: [img.naturalWidth, img.naturalHeight], imgBox: box(img), cvBox: box(cv),
        cvSize: [cv.width, cv.height], st: [s.transform, s.imageRendering, s.opacity, s.filter, s.transitionDuration], anc, title: cv.dataset.title };
    });
    const S = measured.sceneAperture.rect;
    c('NOTES/FILES overlay = img#overlayPanel under canvas#overlayCanvas (text only)', g.kids.join() === 'IMG#overlayPanel,CANVAS#overlayCanvas', g.kids);
    c('panel: 1255x822 natural, displayed 1:1 at the scene-aperture origin, no transform/filter/opacity/transition, smoothing off',
      g.natural.join() === '1255,822' && JSON.stringify(g.imgBox) === JSON.stringify(S) && JSON.stringify(g.cvBox) === JSON.stringify(S) && g.cvSize.join() === '1255,822'
      && g.st[0] === 'none' && /pixelated|crisp-edges/.test(g.st[1]) && g.st[2] === '1' && g.st[3] === 'none' && parseFloat(g.st[4]) === 0 && g.anc.length === 0, g);
    c('the NOTES title sits on the panel, fixed outside the scrolled body', g.title === 'NOTES: EVERYTHING SAID AT RECEPTION'
      && notesText.split('\n')[0] === g.title, g.title);
    await panelPixels('NOTES', PANEL_ART);
  }
  await page.mouse.move(600, 400);
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -100);
  await page.waitForTimeout(50);
  c('the transcript scrolls back to the start', (await page.$eval('#overlay canvas', (c2) => c2.dataset.scroll)) === '0');
  await shot(page, '09_notes_transcript.png');
  await shot(page, '00f_notes_open_start.png');
  {
    const r = measured.sceneAperture.rect;
    const ov = await page.evaluate(() => {
      const kids = Array.from(document.getElementById('stage').children).map((e) => e.id);
      const o = document.getElementById('overlay');
      return { order: [kids.indexOf('scene'), kids.indexOf('overlay'), kids.indexOf('shell')], rect: [parseInt(o.style.left), parseInt(o.style.top), parseInt(o.style.width), parseInt(o.style.height)] };
    });
    const cmp = compareScreen(await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } }), measured);
    c('NOTES still covers the scene: same aperture, above the scene art, under the shell; portrait untouched',
      JSON.stringify(ov.rect) === JSON.stringify(r) && ov.order[0] < ov.order[1] && ov.order[1] < ov.order[2]
      && cmp.sceneBad / cmp.sceneChecked > 0.9 && cmp.portraitBad === 0, { ov, sceneBad: cmp.sceneBad, sceneChecked: cmp.sceneChecked, portraitBad: cmp.portraitBad });
  }
  await page.click('#util-2');
  c('FILES shows the case file', (await page.$eval('#overlay canvas', (c2) => c2.dataset.kind)) === 'files'
    && /APPOINTMENT: EXAMINER/.test(await page.$eval('#overlay canvas', (c2) => c2.dataset.text))
    && /RETURNED AT 4:52/.test(await page.$eval('#overlay canvas', (c2) => c2.dataset.text)));
  await shot(page, '10_files_case_file.png');
  await shot(page, '00h_files_open.png');
  await panelPixels('FILES', FILES_PANEL, [512, 52, 748, 87, 630, 70]);
  c('the FILES title is YOUR FILES, fixed outside the scrolled body', (await page.$eval('#overlayCanvas', (c2) => c2.dataset.title)) === 'YOUR FILES'
    && /^YOUR FILES\nAPPOINTMENT: EXAMINER/.test(await page.$eval('#overlayCanvas', (c2) => c2.dataset.text)));
  await page.click('#util-2');
  c('pressing FILES again closes the overlay', await page.$eval('#overlay', (e) => e.style.display === 'none'));
  await page.click('#util-2');
  c('pressing FILES once more reopens it', await page.$eval('#overlay', (e) => e.style.display !== 'none' && e.querySelector('canvas').dataset.kind === 'files'));
  await page.keyboard.press('Escape');
  c('Esc closes the overlay', await page.$eval('#overlay', (e) => e.style.display === 'none'));
  {
    const cmp = compareScreen(await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 } }), measured);
    c('closing NOTES/FILES restores the exact scene and layered portrait', cmp.sceneBad === 0 && cmp.portraitBad === 0 && cmp.npcShown > 10000, cmp);
    await shot(page, '00i_overlay_closed_restored.png');
  }
  c('the conversation carried on underneath', ['typing', 'beat', 'arriving', 'choosing'].includes(await phase(page)));

  // Slip queue (QA-only grants through the same generic path): two at once show one after the other.
  {
    const before = await game(page, () => window.CYOA_GAME.ui.noticeLog.length);
    await game(page, () => { window.CYOA_GAME.notifyItem('wc_key'); window.CYOA_GAME.notifyItem('wc_key'); });
    const q1 = await game(page, () => [!!window.CYOA_GAME.ui.notice, window.CYOA_GAME.ui.noticeQueue.length].join());
    await page.click('#itemNotice');
    const q2 = await game(page, () => [!!window.CYOA_GAME.ui.notice, window.CYOA_GAME.ui.noticeQueue.length].join());
    await page.click('#itemNotice');
    const q3 = await game(page, () => [!!window.CYOA_GAME.ui.notice, window.CYOA_GAME.ui.noticeQueue.length, document.getElementById('itemNotice').style.display].join());
    c('queued grants show one slip after another, each dismissed in turn', q1 === 'true,1' && q2 === 'true,0' && q3 === 'false,0,none'
      && (await game(page, () => window.CYOA_GAME.ui.noticeLog.length)) === before + 2, { q1, q2, q3 });
  }

  // Ending and restart ---------------------------------------------------------------------
  await play(page, ['enter-corridor']);
  await skipToChoices(page);
  c('the ending offers one card: BEGIN AGAIN', JSON.stringify(await game(page, () => window.CYOA_GAME.ui.cards.map((x) => x.text))) === '["BEGIN AGAIN."]');
  c('the ending objective points beyond reception', /ROOM FOUR/.test(await page.$eval('#objectiveBody', (e) => e.dataset.text)));
  await shot(page, '11_ending.png');
  await game(page, () => { window.CYOA_GAME.notifyItem('wc_key'); window.CYOA_GAME.notifyItem('wc_key'); }); // QA-only: a slip up and one queued
  await chooseById(page, 'restart');
  c('restart clears the slip and its queue', await game(page, () => !window.CYOA_GAME.ui.notice && window.CYOA_GAME.ui.noticeQueue.length === 0
    && document.getElementById('itemNotice').style.display === 'none'));
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
  {
    const fb = await page.evaluate((id) => {
      const a = document.getElementById('inspectArt'), cv = a.querySelector('canvas');
      return { item: id, hasArt: !!window.CYOA_GAME.content.items[id].inspectArt, kind: a.dataset.kind, kids: Array.from(a.children).map((k) => k.tagName + '#' + k.id),
        size: cv && [cv.width, cv.height], label: cv && cv.dataset.placeholder };
    }, clickedItem);
    c('an item without inspectArt (QA-only synthetic item) still falls back to the labelled development placeholder', /^qa_item_/.test(clickedItem) && !fb.hasArt
      && fb.kind === 'placeholder' && fb.kids.join() === 'CANVAS#inspectPlaceholder' && fb.size.join() === '565,451' && /INSPECT ART NOT YET APPROVED/.test(fb.label), fb);
  }
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
