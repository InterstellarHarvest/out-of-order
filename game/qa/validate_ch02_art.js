#!/usr/bin/env node
// Chapter 2 (Biology Park) production art (docs/102; public docs/108): the 50 approved images, their
// provenance, their registration, and the art the engine shows on every real Chapter 2 route.
//
//   1. intake     every image in art/biology_park.provenance.json exists and is byte-identical to its
//                 recorded sha256 / git blob, to the git blob of its registered selection (when that
//                 commit is in the local clone), and has its contract size and colour type
//   2. registry   each is registered at exactly its production path in story/artwork.draft.json (the
//                 pinned canonical projection) with a selected status (approved / integrated), is the
//                 path the generated story or the death runtime uses, and no review/ path is used
//   3. bindings   no Chapter 2 art key (scenes, scene states, portraits, Focus A, death screens) and no
//                 item Chapter 2 hands out is a DEV PLACEHOLDER: every one resolves to a pinned file
//   4. routes     every state of every real Chapter 2 route (game/qa/ch02_routes.js: 33 routes + 24
//                 antidote-kit routes, real Prologue and House playthroughs, real dice) shows only
//                 pinned production art: scene, overlay, conversation background + pose, Focus A and the
//                 inventory slots; each fatal route ends on its death popup with its own image; and
//                 all 50 images are actually shown on at least one real route (nothing installed unused)
//   5. scope      Chapter 3 is not consumed (canon lock, generated story, death runtime)
// Node only; no browser. Writes game/qa/ch02_art_results.json. Exit code 1 on any failure.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const R = require('./ch02_routes.js');
const Rules = R.Rules;
const story = require('../content/story.generated.js').story;
const DEATHS = require('../content/death-presentations.generated.js');

const results = [];
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + group + '] ' + name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 600)));
}
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gitBlob = (b) => crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const PROV = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/biology_park.provenance.json'), 'utf8'));
const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'story/artwork.draft.json'), 'utf8'));
const LOCK = JSON.parse(fs.readFileSync(path.join(ROOT, 'story/canon.lock.json'), 'utf8'));
const SIZE = { scene: [314, 206], 'portrait-background': [564, 278], portrait: [564, 278], focus: [564, 278], 'item-slot': [96, 96], 'item-inspect': [565, 451], 'death-screen': [314, 206] };
const COLOR = { scene: 'RGB', 'portrait-background': 'RGB', focus: 'RGB', 'item-inspect': 'RGB', 'death-screen': 'RGB', portrait: 'RGBA', 'item-slot': 'RGBA' };
const byPath = new Map(PROV.images.map((r) => [r.path, r]));

// 1. Intake ----------------------------------------------------------------------------------------
check('intake', 'the provenance record pins 50 images (docs/108: 50 approved Chapter 2 records)', PROV.schema === 'cyoa-art-provenance-v1' && PROV.images.length === 50 && byPath.size === 50, PROV.images.length);
const kinds = {};
PROV.images.forEach((r) => { kinds[r.kind] = (kinds[r.kind] || 0) + 1; });
check('intake', '28 scenes, 2 portrait backgrounds, 2 portraits, 5 item slots, 5 item inspects, 3 Focus A, 5 death screens',
  JSON.stringify(kinds) === JSON.stringify({ 'death-screen': 5, focus: 3, 'item-inspect': 5, 'item-slot': 5, 'portrait-background': 2, portrait: 2, scene: 28 }), kinds);
const localCommit = (c) => { try { execFileSync('git', ['-C', ROOT, 'cat-file', '-e', c + '^{commit}'], { stdio: 'ignore' }); return true; } catch (_) { return false; } };
let sourceChecked = 0;
for (const r of PROV.images) {
  const f = path.join(ROOT, r.path);
  if (!fs.existsSync(f)) { check('intake', r.path + ' exists', false); continue; }
  const b = fs.readFileSync(f);
  const ct = { 2: 'RGB', 6: 'RGBA', 3: 'palette' }[b[25]];
  check('intake', r.path + ': sha256, git blob, bytes, size and colour type as recorded and as the contract requires',
    sha256(b) === r.sha256 && gitBlob(b) === r.gitBlob && b.length === r.bytes && b.readUInt32BE(16) === r.width && b.readUInt32BE(20) === r.height
      && JSON.stringify([r.width, r.height]) === JSON.stringify(SIZE[r.kind]) && ct === r.colorType && ct === COLOR[r.kind], { path: r.path, ct, w: b.readUInt32BE(16), h: b.readUInt32BE(20) });
  check('intake', r.path + ': copied from an immutable registered selection (full commit, review path, no originals/source masters)',
    /^[0-9a-f]{40}$/.test(r.source.commit) && !/(^|\/)(originals|source)\//.test(r.source.path) && r.source.gitBlob === r.gitBlob, r.source);
  if (localCommit(r.source.commit)) {
    const src = execFileSync('git', ['-C', ROOT, 'show', r.source.commit + ':' + r.source.path]);
    check('intake', r.path + ': byte-identical to its selection ' + r.source.commit.slice(0, 7) + ':' + path.basename(r.source.path), Buffer.compare(src, b) === 0);
    sourceChecked++;
  }
}
check('intake', 'every source selection was available and compared byte for byte (' + sourceChecked + '/50)', sourceChecked === 50, sourceChecked);

// 2. Registry --------------------------------------------------------------------------------------
function record(key) {
  const [group, rest] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  if (group === 'scenes') { const [id, v] = rest.split('#'); const s = ART.scenes[id]; return v === 'portraitBackground' ? s && s.portraitBackground : s; }
  if (group === 'portraits') return ART.portraits[rest];
  if (group === 'items') { const [id, v] = rest.split('#'); return ART.items[id] && ART.items[id][v]; }
  if (group === 'focus') return ART.focus[rest];
  if (group === 'deathScreens') return ART.deathScreens[rest];
  return null;
}
for (const r of PROV.images) {
  const rec = record(r.key);
  check('registry', r.key + ' is registered at ' + r.path + ' with a selected status', rec && rec.assetPath === r.path && ['approved', 'integrated'].includes(rec.status) && rec.dimensions === r.width + 'x' + r.height,
    rec && { assetPath: rec.assetPath, status: rec.status, dimensions: rec.dimensions });
}
const a = story.assets;
const used = new Set();
const pathOf = {}; // art key (stage.js G.artKey) -> file
Object.entries(a.scenes).forEach(([id, p]) => { pathOf['scene:' + id] = p; });
Object.entries(a.sceneStates || {}).forEach(([id, list]) => list.forEach((st) => { pathOf['scene:' + id + '#' + st.id] = st.path; }));
Object.entries(a.portraits).forEach(([pid, p]) => {
  Object.entries(p.backgrounds || {}).forEach(([id, f]) => { pathOf['portrait:' + pid + ':background:' + id] = f; });
  Object.entries(p.poses || {}).forEach(([id, f]) => { pathOf['portrait:' + pid + ':pose:' + id] = f; });
  Object.entries(p.views || {}).forEach(([id, f]) => { pathOf['portrait:' + pid + ':view:' + id] = f; });
});
Object.entries(a.focus).forEach(([id, f]) => { if (f && typeof f === 'object') f.pages.forEach((pg, i) => { pathOf['focus:' + id + ':page:' + (i + 1)] = pg.path; }); else pathOf['focus:' + id] = f; });
Object.entries(story.items).forEach(([id, it]) => { pathOf['item:' + id] = it.slotArt; pathOf['inspect:' + id] = it.inspectArt; });
const storyPaths = new Set(Object.values(pathOf).filter(Boolean));
const deathCh2 = DEATHS.entries.filter((e) => e.id.startsWith('chapter-02:'));
for (const r of PROV.images) {
  if (r.kind === 'death-screen') {
    const e = deathCh2.find((x) => x.artId === r.key.slice('deathScreens:'.length));
    check('registry', r.key + ': the death runtime hands the popup exactly this file and hash', e && e.art && e.art.path === r.path && e.art.sha256 === r.sha256 && e.art.scale === 2 && JSON.stringify(e.art.size) === '[314,206]', e);
  } else check('registry', r.path + ' is used by the generated story', storyPaths.has(r.path));
}
check('registry', 'no review/ or pending-integration path is used at runtime', [...storyPaths].concat(DEATHS.entries.map((e) => e.art && e.art.path).filter(Boolean)).every((p) => /^art\//.test(p) && !/review\/|pending-integration/.test(p)));

// 3. Bindings: Chapter 2's art keys (as stage.js G.chapterArtKeys) and the items it hands out --------
const ch2 = story.chapters['chapter-02'];
const keys = new Set();
const useScene = (id) => { keys.add('scene:' + id); ((a.sceneStates || {})[id] || []).forEach((st) => keys.add('scene:' + id + '#' + st.id)); };
useScene(ch2.scene);
for (const n of Object.values(ch2.nodes)) {
  if (n.scene) useScene(n.scene);
  if (n.mode === 'dialogue') {
    const cast = story.cast[n.speaker]; const p = a.portraits[cast.portrait];
    if (p.views) { keys.add('portrait:' + cast.portrait + ':view:' + p.view); if (n.backdrop) keys.add('portrait:' + cast.portrait + ':view:' + n.backdrop); }
    else { keys.add('portrait:' + cast.portrait + ':background:' + p.background); keys.add('portrait:' + cast.portrait + ':pose:' + p.pose); if (n.backdrop) keys.add('portrait:' + cast.portrait + ':background:' + n.backdrop); if (n.pose) keys.add('portrait:' + cast.portrait + ':pose:' + n.pose); }
  }
  if (n.mode === 'focus') keys.add('focus:' + n.focus);
}
const unbound = [...keys].filter((k) => !pathOf[k]);
check('bindings', 'every Chapter 2 scene, scene state, conversation layer and Focus A key resolves to production art (' + keys.size + ' keys)', unbound.length === 0, unbound);
const handedOut = new Set();
JSON.stringify(ch2.nodes).replace(/"(?:give|take|add|receive|item)"\s*:\s*"([a-z0-9_]+)"/g, (_, id) => { if (story.items[id]) handedOut.add(id); return _; });
['botanical_antidote_public', 'botanical_antidote_maintenance', 'botanical_antidote_customs', 'certified_seed_canister', 'acting_director_badge'].forEach((id) => handedOut.add(id));
const itemGaps = [...handedOut].filter((id) => !story.items[id] || !story.items[id].slotArt || !story.items[id].inspectArt);
check('bindings', 'every Chapter 2 item has slot and inspect art (' + handedOut.size + ' items)', itemGaps.length === 0, itemGaps);
const notPinned = [...keys].map((k) => pathOf[k]).filter((p) => p && /biology_park|courtesy_conductor|groundskeeper/.test(p) && !byPath.has(p));
check('bindings', 'every Biology Park file the story uses is pinned in the provenance record', notPinned.length === 0, notPinned);
check('bindings', 'all five Chapter 2 deaths carry selected art in the runtime (no empty frame left)', deathCh2.length === 5 && deathCh2.every((e) => e.art && e.artStatus !== 'not-started'), deathCh2.map((e) => [e.id, !!e.art]));
check('bindings', 'death popup copy is the canonical copy, unchanged by integration (popupStatus, readyForGameplay)', deathCh2.every((e) => e.popupStatus === 'existing-ending-popup-copy-draft' && e.readyForGameplay === false), deathCh2.map((e) => e.popupStatus));

// 4. Real routes -------------------------------------------------------------------------------------
const shown = new Set();
const fileOk = (p) => p && fs.existsSync(path.join(ROOT, p)) && (byPath.has(p) || !/biology_park/.test(p));
function visit(s, where) {
  const v = Rules.view(story, s);
  const want = [];
  const sa = v.sceneArt || {};
  want.push(sa.replace ? 'scene:' + v.scene + '#' + sa.replace : 'scene:' + v.scene);
  if (sa.overlay) want.push('scene:' + v.scene + '#' + sa.overlay);
  if (v.mode === 'dialogue' && v.portrait) {
    if (v.portrait.view) want.push('portrait:' + v.portrait.id + ':view:' + v.portrait.view);
    else { want.push('portrait:' + v.portrait.id + ':background:' + v.portrait.background); want.push('portrait:' + v.portrait.id + ':pose:' + v.portrait.pose); }
  }
  if (v.mode === 'focus' && v.focus) want.push('focus:' + v.focus);
  (s.inventory || []).forEach((id) => { want.push('item:' + id); want.push('inspect:' + id); });
  const bad = want.filter((k) => !fileOk(pathOf[k]));
  want.forEach((k) => pathOf[k] && shown.add(pathOf[k]));
  return bad.length ? where + ' ' + s.chapter + ':' + s.node + ' -> ' + bad.join(', ') : null;
}
let routes = 0, states = 0;
const fatalEnds = {};
for (const route of R.ROUTES.concat(R.KIT_ROUTES)) {
  const found = R.findSeed(story, route);
  if (!found) { check('routes', route.name + ': a real seed plays it end to end', false); continue; }
  let s = found.entry, problems = [];
  const p0 = visit(s, route.name); if (p0) problems.push(p0);
  for (const st of route.steps) {
    s = Rules.step(story, s, typeof st === 'string' ? { choice: st } : st).state;
    states++;
    const p = visit(s, route.name); if (p) problems.push(p);
  }
  routes++;
  check('routes', route.name + ': every state shows only pinned production art (' + (route.steps.length + 1) + ' states)', problems.length === 0, problems.slice(0, 4));
  if (route.fatal) {
    const e = DEATHS.entries.find((x) => x.when.end === s.chapter + ':' + s.node);
    const ok = s.chapter === 'chapter-02' && e && e.art && byPath.has(e.art.path) && byPath.get(e.art.path).sha256 === e.art.sha256;
    check('routes', route.name + ': ends at ' + s.node + ' with its own popup image', ok, e && e.art);
    if (e && e.art) { shown.add(e.art.path); fatalEnds[s.node] = e.art.path; }
  }
}
check('routes', 'every real route was played (33 + 24)', routes === R.ROUTES.length + R.KIT_ROUTES.length && routes === 57, routes);
check('routes', 'all five deaths are reached on real routes, each with a different image', Object.keys(fatalEnds).length === 5 && new Set(Object.values(fatalEnds)).size === 5, fatalEnds);
const unseen = PROV.images.map((r) => r.path).filter((p) => !shown.has(p));
check('routes', 'every one of the 50 images is shown on at least one real route (nothing installed unused)', unseen.length === 0, unseen);

// 5. Scope -------------------------------------------------------------------------------------------
check('scope', 'Chapter 3 is not consumed (lock, story, death runtime)', LOCK.chapters.join() === 'prologue-00,chapter-01,chapter-02' && (LOCK.notConsumed.chapters || []).includes('chapter-03')
  && !story.chapters['chapter-03'] && !DEATHS.entries.some((e) => e.id.startsWith('chapter-03')), { lock: LOCK.chapters, story: Object.keys(story.chapters) });

const failed = results.filter((r) => !r.ok);
const groups = {};
results.forEach((r) => { groups[r.group] = groups[r.group] || { total: 0, passed: 0 }; groups[r.group].total++; if (r.ok) groups[r.group].passed++; });
fs.writeFileSync(path.join(__dirname, 'ch02_art_results.json'), JSON.stringify({ schema: 'cyoa-ch02-art-validation-v1', total: results.length, passed: results.length - failed.length, groups, routes, states, results }, null, 2) + '\n');
console.log('Chapter 2 art (provenance, registry, bindings, ' + routes + ' real routes / ' + states + ' states): ' + (results.length - failed.length) + '/' + results.length + ' passed');
if (failed.length) process.exitCode = 1;
