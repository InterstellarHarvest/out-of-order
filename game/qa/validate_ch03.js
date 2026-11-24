#!/usr/bin/env node
// Chapter 3 (The People's Pavilion, approved reboot) gameplay integration (docs/104). Node only.
//
//   1. intake      the 29 approved images: byte-identical to the approved SHA-256 (public storyboard registry
//                  at main 622ad87, incl. the current A04/A05 v04 replacements and Paper Emergency v04), git blob
//                  and provenance;
//                  native contract size; scenes and backgrounds fully opaque; poses 564x278 with binary alpha
//   2. registry    reconciled (docs/104 section 8): each canonical record is integrated at its production assetPath =
//                  its suggestedFilename = the pinned file, with the current approved SHA-256 its notes name
//                  first; no pending binding remains; the build uses exactly those bytes there
//   3. narrative   chapter-03 is the locked approved narrative (source sha256 of blob 857ffdf), projected
//                  unchanged into the runtime: every node, text, choice, check, SHOW / USE and ending
//   4. bindings    every Chapter 3 scene, conversation background and pose resolves to its pinned file
//   5. routes      every authored route variant (game/qa/ch03_routes.js: 28 + 4 inherited-item routes) from
//                  real Chapter 2 living endings with real dice: arrival variant, endings, inventory and flag
//                  carry-over, the clicker modifier, item gating, art on every state
//   6. coverage    every node, choice, SHOW / USE, both outcomes of both checks, all 7 endings, every scene
//                  and conversation pair, all 29 images shown on a real route
//   7. endings     7 surviving endings, BEGIN AGAIN only, no death popup; restart begins a new playthrough
//   8. transition  the five Chapter 2 living endings continue into Chapter 3 with the whole state; the five
//                  fatal endings are unchanged; the Chapter 3 entry is a CHECKPOINT
//   9. presentation dialogue/narrative modes, speakers and poses, card kinds, hidden check markers,
//                  incidental voices (no portrait), the '%' glyph rule
//  10. saves       real saves written by game main 9a0ca4a migrate into this build; Chapter 3 saves restore
//  11. scope       no legacy pavilion/* art, no Chapter 4, no Chapter 3 death entry
// Writes game/qa/ch03_results.json. Exit code 1 on any failure.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../..');
const C = require('./ch03_routes.js');
const Rules = C.Rules;
const { story, build } = require('../content/story.generated.js');
const DEATHS = require('../content/death-presentations.generated.js');
const REVIEW = require('../content/end-presentations.review.js');

const results = [];
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + group + '] ' + name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 700)));
}
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gitBlob = (b) => crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const PROV = J('art/pavilion_reboot.provenance.json');
const ART = J('story/artwork.draft.json');
const LOCK = J('story/canon.lock.json');
const CH3 = story.chapters['chapter-03'];

// The approved selections (public storyboard story/artwork-preview.json at main 622ad87; docs/103,
// docs/113, docs/119 (A04/A05 v04 current), docs/122 and the 2026-11-22 Paper Emergency v04 addendum).
// Never edit to make a test pass.
const APPROVED = {
  'scenes:pavilion_reboot/arrival': '37d0b189fda18ad6659b0fae1f214145acd4ec67595c5e5a520917d6a7cbd478',
  'scenes:pavilion_reboot/backstage': 'aa90896023a59454887e9b3bd5b1745cb8b95a5d9737829119abddd9176f4889',
  'scenes:pavilion_reboot/courtesy_stage': '0b413a7b9a669365f114fda8765a242fc3ce00fc9c1ea3bd535c7a2b3d1cdb98',
  'scenes:pavilion_reboot/exit_vestibule': 'cc2d2ce27e1e2cbf609fcae2210d3c46c57b749e8850be2219ad6de7f7f807c8',
  'scenes:pavilion_reboot/exterior_exit': '76b3232f685fd392f981f0c846382e3ddccd61ed94d44e09ea1bc5cf032c3e8a',
  'scenes:pavilion_reboot/human_verification_stage': '8df7e5dd2fffb17449fd43f4d9e7df167d75347efc53b0bde1771fd6d8d001ca',
  'scenes:pavilion_reboot/locomotion_stage': 'be99d790754951bcbcd1c26b94a94ff4e84280f5385735951b0f024b322e13c5',
  'scenes:pavilion_reboot/paper_emergency': '93a48082124600b1afeb45e5ea54856bf253e858e55111295e9d9c26919bc978',
  'scenes:pavilion_reboot/record_printer': '1f80f8f17359c07fd24c74741be72bfa6ad941da67bb1622931e3b429bb0a722',
  'scenes:pavilion_reboot/record_scanner': '4afe7d0b1898c1e29443d45aba20614b14951bbf91c40e9508a62dc607fcd1b3',
  'scenes:pavilion_reboot/restroom_entrance': '117dd9d00b6c9d32b4b153f71aaf51c2546ade70b803d45a748728f8d1a1f8b4',
  'scenes:pavilion_reboot/service_exit': '4a736b2d7b5fd7dea50fe9d93fe36e7465674ce0b8e38e7f2d6517fca73df392',
  'scenes:pavilion_reboot/surprise_stage': '8a85f438b734930985140851d38d2d691c8326e71d1aae7891e37b453a03412d',
  'scenes:pavilion_reboot/urgency_stage': '368134fe2363134d3b63e7a7eae3a7b71b393a9d59484c4b3c456296239a7d2c',
  'scenes:pavilion_reboot/courtesy_stage#portraitBackground': 'b0786ebd4147c6b0e6441838c725751a794db04fa9bcce4341aa1a3a7f1e7623',
  'scenes:pavilion_reboot/human_verification_stage#portraitBackground': 'd09e2a7cf13c6382cd8d726a8852f32cfe359651f4c6c9538f4f7825d41844ef',
  'scenes:pavilion_reboot/record_printer#portraitBackground': '46e79ce63fb0bda0af2695393a92c9c7ae064edddedbab0e0f4a5f6e9ad01473',
  'scenes:pavilion_reboot/record_scanner#portraitBackground': '9099383613c587c3e2e10bcc33d839f75d2aaf685f20de7e47acc21e04c877ea',
  'scenes:pavilion_reboot/restroom_entrance#portraitBackground': 'e4967d1f0e4bc2497fb0ce6e59891d1a25a2e1854b8bf395515cd8d0cc4b5260',
  'scenes:pavilion_reboot/service_exit#portraitBackground': '241bfb8e817cf7c42508c218c188a1ac2706bad2e5f577484ce10a359b9a88e9',
  'scenes:pavilion_reboot/surprise_stage#portraitBackground': '90f29651222b62bca461c0c33f09092290b374fd0cf10094c40267202515e255',
  'scenes:pavilion_reboot/urgency_stage#portraitBackground': '7d89b7d7c2ee22e6b324076ce988b3e5520e84be5b4068e79fe8d759ab529714',
  'portraits:pavilion_attendant:alarmed': '51c2556b865ede1a997977c66e4f79cc1c0b271334a35aba36ef73555d40a43f',
  'portraits:pavilion_attendant:idle': '28fdf5523454ea2ccdb397bd4d7006fc1fb8f04109046b7646361692422c3ef2',
  'portraits:pavilion_attendant:quiet': '7f00208a3a96628f18fd23f079913dcb706e0e220db081d4cb438107f15bdf90',
  'portraits:pavilion_presenter:alarmed': '4bc10c1b0ceb997d0ae51831f4368a60d35b74a59f8c1e24f1772553d638b887',
  'portraits:pavilion_presenter:excited': 'd5aafddc9792a9e294b5f8793cef4d3c629354911a732a64a4976e1ed9acdd95',
  'portraits:pavilion_presenter:idle': 'da33e42a723c8f1a5fe82a2ecaa5cd1e22281caa3ee4abc26db8e81569cd6784',
  'portraits:pavilion_presenter:relieved': '29a349c7bcdfe32d2885709dc91977beb7e3869d2461913cfd89afdacebbda9b'
};
// Superseded approved selections: must never be installed. A04/A05 (docs/119) and Paper Emergency v03
// (ac0f7c44, superseded by Nate's v04 on 2026-11-22; storyboard PR #18).
const SUPERSEDED = ['9207bfdc140dd115783adba2f042ce756d51a288c053a3113f9a46f479e6e3c5', 'beb64cc6e9c3c0dc48f6dbe341e98762556b8e9ef4261fe132c8093c5e63b382',
  'ac0f7c44d267dd54897507ae3b8b02959a5b76f4fcd9d0418b77b8fdb777ba7e'];
// The locked approved narrative (docs/111): blob 857ffdf1bc94 of story/chapters/chapter-03.reboot-candidate.json.
const NARRATIVE_SHA256 = '36ae178d05a9db7dd318c441e4d8681eaa674c28ced81df97dcaba6c1c5c0253';

// A PNG decoder for the 8-bit, non-interlaced RGB / RGBA files used here (the alpha contract needs pixels).
function decodePng(buf) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), depth = buf[24], ct = buf[25], interlace = buf[28];
  if (depth !== 8 || interlace !== 0 || (ct !== 2 && ct !== 6)) return { w, h, ct, unsupported: true };
  const chunks = [];
  for (let o = 8; o < buf.length;) { const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8); if (type === 'IDAT') chunks.push(buf.subarray(o + 8, o + 8 + len)); o += 12 + len; }
  let raw;
  try { raw = zlib.inflateSync(Buffer.concat(chunks)); } catch (e) { return { w, h, ct, error: 'corrupt image data: ' + e.message }; }
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, px = Buffer.alloc(h * stride);
  if (raw.length !== h * (stride + 1)) return { w, h, ct, error: 'truncated image data' };
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      px[y * stride + x] = (line[x] + pred) & 255;
    }
  }
  const alpha = new Set();
  if (ct === 6) for (let i = 3; i < px.length; i += 4) alpha.add(px[i]);
  return { w, h, ct, alpha: ct === 6 ? [...alpha].sort((x, y) => x - y) : [255] };
}

// 1. Intake ----------------------------------------------------------------------------------------
const byKey = new Map(PROV.images.map((r) => [r.key, r]));
check('intake', 'the provenance file pins exactly the 29 approved Chapter 3 selections (14 scenes, 8 backgrounds, 7 poses)',
  PROV.schema === 'cyoa-art-provenance-v1' && PROV.images.length === 29 && JSON.stringify([...byKey.keys()].sort()) === JSON.stringify(Object.keys(APPROVED).sort()), [...byKey.keys()]);
check('intake', 'the provenance file records the unresolved original native-grid authorship limitation (not presented as resolved)',
  /NOT proven/.test(PROV.limitation || '') && /unresolved/.test(PROV.limitation || ''), PROV.limitation);
const KIND = (k) => (k.startsWith('portraits:') ? 'pose' : k.endsWith('#portraitBackground') ? 'background' : 'scene');
for (const [key, want] of Object.entries(APPROVED)) {
  const r = byKey.get(key);
  if (!r) { check('intake', key + ' pinned', false); continue; }
  const f = path.join(ROOT, r.path);
  if (!fs.existsSync(f)) { check('intake', r.path + ' exists', false); continue; }
  const b = fs.readFileSync(f), png = decodePng(b), kind = KIND(key);
  check('intake', r.path + ': decodes as a whole PNG', !png.error && !png.unsupported, png.error);
  check('intake', r.path + ': byte-identical to the approved SHA-256 ' + want.slice(0, 12) + ' (and its provenance, git blob, size)',
    sha256(b) === want && r.sha256 === want && gitBlob(b) === r.gitBlob && r.source.gitBlob === r.gitBlob && b.length === r.bytes && !SUPERSEDED.includes(sha256(b)), { sha: sha256(b) });
  check('intake', r.path + ': copied from its immutable registered selection (full commit in the public storyboard; no originals/source masters)',
    r.source.repo === 'InterstellarHarvest/CYOA-storyboard' && /^[0-9a-f]{40}$/.test(r.source.commit) && !/(^|\/)(originals|source)\//.test(r.source.path), r.source);
  if (kind === 'scene') check('intake', r.path + ': native 314x206, fully opaque', png.w === 314 && png.h === 206 && !png.unsupported && JSON.stringify(png.alpha) === '[255]', png);
  if (kind === 'background') check('intake', r.path + ': native 564x278, fully opaque', png.w === 564 && png.h === 278 && !png.unsupported && JSON.stringify(png.alpha) === '[255]', png);
  if (kind === 'pose') check('intake', r.path + ': separate 564x278 RGBA layer with binary alpha (0/255 only)', png.w === 564 && png.h === 278 && png.ct === 6 && JSON.stringify(png.alpha) === '[0,255]', png);
}
// A04/A05: the current v04 continuity replacements.
check('intake', 'Paper Emergency is Nate\'s approved v04 (93a48082, source d1600a3), not the superseded v03 (ac0f7c44, recorded as superseded)',
  (() => { const r = byKey.get('scenes:pavilion_reboot/paper_emergency'); return r.sha256 === '93a48082124600b1afeb45e5ea54856bf253e858e55111295e9d9c26919bc978'
    && r.source.commit === 'd1600a34a58497b4886518c6aa9feeaa205d8426' && /CH3-B06-paper-emergency-local-v04\.png$/.test(r.source.path)
    && r.supersedes && r.supersedes.sha256 === 'ac0f7c44d267dd54897507ae3b8b02959a5b76f4fcd9d0418b77b8fdb777ba7e'; })());
check('intake', 'no installed Chapter 3 image is a superseded selection (A04/A05 earlier versions, Paper Emergency v03)',
  PROV.images.every((r) => fs.existsSync(path.join(ROOT, r.path)) && !SUPERSEDED.includes(sha256(fs.readFileSync(path.join(ROOT, r.path))))));
check('intake', 'A04/A05 are the current v04 replacements, not their superseded versions',
  byKey.get('scenes:pavilion_reboot/human_verification_stage').source.commit === '7bf1f426f3a1d5dba14e7a1bd56ece86a4d23bdb'
  && /CH3-A04-verification-continuity-v04\.png$/.test(byKey.get('scenes:pavilion_reboot/human_verification_stage').source.path)
  && /CH3-A05-verification-bg-continuity-v04\.png$/.test(byKey.get('scenes:pavilion_reboot/human_verification_stage#portraitBackground').source.path));

// 2. Registry --------------------------------------------------------------------------------------
function record(key) {
  const g = key.slice(0, key.indexOf(':')), rest = key.slice(key.indexOf(':') + 1);
  if (g === 'scenes') { const [id, v] = rest.split('#'); return v ? ART.scenes[id] && ART.scenes[id][v] : ART.scenes[id]; }
  return ART.portraits[rest];
}
// Integration-status reconciliation (docs/104 section 8): the storyboard assigned each record its production assetPath
// (= suggestedFilename = the pinned file), and the game's temporary pending binding is gone. Game build abaf917 used
// exactly these bytes there and was published (sync.js publish): the records are `integrated` at those paths.
const SETTINGS = J('story/runtime-settings.json');
const REG_STATUS = 'integrated';
check('registry', 'story/runtime-settings.json has no pending art binding; the provenance file records the reconciliation',
  !('pendingArtBindings' in SETTINGS) && /^RECONCILED/.test(PROV.binding || ''), SETTINGS.pendingArtBindings);
const firstSha = (rec) => { const m = /SHA-256[^0-9a-f]{0,3}([0-9a-f]{64})/.exec(String(rec.notes || '')); return m && m[1]; };
const builtArt = new Map(build.art.map((a) => [a.path, a]));
for (const [key, want] of Object.entries(APPROVED)) {
  const rec = record(key), r = byKey.get(key), b = r && builtArt.get(r.path);
  check('registry', key + ': canonical record ' + REG_STATUS + ' at its production assetPath ' + (r && r.path) + ' (= suggestedFilename), with the approved SHA-256 its notes name first; built from that path, no pending binding',
    rec && r && rec.status === REG_STATUS && rec.assetPath === r.path && rec.suggestedFilename === r.path && /^art\/(scenes|portraits)\/pavilion_reboot\//.test(r.path)
    && firstSha(rec) === want && b && b.sha256 === want && !b.binding && b.status === REG_STATUS,
    rec && { status: rec.status, assetPath: rec.assetPath, firstSha: firstSha(rec), built: b });
}
check('registry', 'the canonical Paper Emergency record names v04 first and keeps v03 only as history',
  (() => { const n = String(record('scenes:pavilion_reboot/paper_emergency').notes); return firstSha(record('scenes:pavilion_reboot/paper_emergency')) === APPROVED['scenes:pavilion_reboot/paper_emergency']
    && /HISTORICAL V03 APPROVAL/.test(n) && n.indexOf('ac0f7c44') > n.indexOf('93a48082'); })());

// 3. Narrative fidelity ----------------------------------------------------------------------------
const lockEntry = LOCK.files['story/chapters/chapter-03.reboot-candidate.json'];
check('narrative', 'Chapter 3 is consumed from the locked approved narrative (source sha256 of blob 857ffdf1bc94), not the archived 62-node legacy file or the review-only layout',
  LOCK.chapters.includes('chapter-03') && lockEntry && lockEntry.source === 'story/chapters/chapter-03.reboot-candidate.json' && lockEntry.sourceSha256 === NARRATIVE_SHA256
  && !lockEntry.strippedStoryboardOnly && !LOCK.files['story/chapters/chapter-03.draft.json'] && !LOCK.files['story/chapter-03.reboot-review-layout.json'], lockEntry);
const proj = J('story/chapters/chapter-03.reboot-candidate.json');
check('narrative', 'the projection is the whole approved chapter: 34 nodes, start pavilion_arrival, title and scene', Object.keys(proj.nodes).length === 34 && proj.start === 'pavilion_arrival'
  && CH3.start === 'pavilion_arrival' && CH3.title === proj.title && CH3.scene === proj.scene && Object.keys(CH3.nodes).length === 34);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fidelity = [];
for (const [id, n] of Object.entries(proj.nodes)) {
  const g = CH3.nodes[id];
  if (!g) { fidelity.push(id + ' missing'); continue; }
  for (const k of ['mode', 'scene', 'speaker', 'objective', 'effects', 'text', 'choices', 'show', 'use', 'end']) if (!same(n[k], g[k])) fidelity.push(id + '.' + k);
  // The importer re-emits a pose only where it differs from the speaker's default (alphabetical first).
  if (n.mode === 'dialogue') { const p = story.assets.portraits[story.cast[n.speaker].portrait]; if ((g.pose || p.pose) !== n.pose) fidelity.push(id + '.pose'); }
}
check('narrative', 'every node\'s mode, scene, speaker, pose, objective, text runs, choices, checks, SHOW / USE and ending is projected and built unchanged (no rewritten dialogue, choice or outcome)', !fidelity.length, fidelity);

// 4. Bindings --------------------------------------------------------------------------------------
const A = story.assets;
const scenes3 = [...new Set(Object.values(CH3.nodes).map((n) => n.scene).concat(CH3.scene))].sort();
check('bindings', '14 Chapter 3 scenes, each bound to its pinned production file', scenes3.length === 14 && scenes3.every((s) => A.scenes[s] === (byKey.get('scenes:' + s) || {}).path), scenes3.filter((s) => A.scenes[s] !== (byKey.get('scenes:' + s) || {}).path));
for (const sid of ['pavilion_attendant', 'pavilion_presenter']) {
  const p = A.portraits[sid];
  const poses = sid === 'pavilion_attendant' ? ['alarmed', 'idle', 'quiet'] : ['alarmed', 'excited', 'idle', 'relieved'];
  check('bindings', sid + ': poses ' + poses.join('/') + ' bound to their pinned 564x278 layers', p && same(Object.keys(p.poses).sort(), poses) && poses.every((x) => p.poses[x] === byKey.get('portraits:' + sid + ':' + x).path), p && p.poses);
  const bgScenes = [...new Set(Object.values(CH3.nodes).filter((n) => n.speaker === sid).map((n) => n.scene))].sort();
  check('bindings', sid + ': each conversation location (' + bgScenes.length + ') uses that scene\'s own closer 564x278 background', p && same(Object.keys(p.backgrounds).sort(), bgScenes)
    && bgScenes.every((s) => p.backgrounds[s] === byKey.get('scenes:' + s + '#portraitBackground').path), p && p.backgrounds);
}
check('bindings', 'the build has no DEV PLACEHOLDER: production profile, every image in build.art exists', story.profile === 'production' && build.art.every((a) => fs.existsSync(path.join(ROOT, a.path))), story.profile);
const built = new Set(build.art.map((a) => a.path));
check('bindings', 'all 29 pinned images are in the build (none installed unused)', PROV.images.every((r) => built.has(r.path)), PROV.images.filter((r) => !built.has(r.path)).map((r) => r.path));
check('bindings', 'Chapter 3 needs no Focus A, item or death art (docs/111): no Chapter 3 node is a focus node and no new item exists',
  !Object.values(CH3.nodes).some((n) => n.mode === 'focus' || n.focus) && !Object.keys(story.items).some((id) => /^pavilion_/.test(id)));

// 5. Routes ------------------------------------------------------------------------------------------
function shows(s) {
  const v = Rules.view(story, s), out = [A.scenes[v.scene]];
  if (v.mode === 'dialogue') { const p = A.portraits[v.portrait.id]; out.push(p.backgrounds[v.portrait.background], p.poses[v.portrait.pose]); }
  return out;
}
const visited = new Set(), taken = new Set(), endsSeen = new Set(), shown = new Set(), outcomes = new Set(), pairs = new Set();
const runs = [];
for (const r of C.ROUTES) {
  const f = C.findSeed(story, r);
  if (!f) { check('routes', r.name + ': a real seed plays it', false); continue; }
  runs.push({ r, f });
  const e = C.ENTRIES[r.entry];
  const pre = f.ch2End, s0 = f.entry;
  check('routes', r.name + ': enters from a real Chapter 2 ' + e.end + ' (' + e.group + ') through its CONTINUE card, at pavilion_arrival',
    pre.node === e.end && pre.flags.chapter3_entry_group === e.group && s0.chapter === 'chapter-03' && s0.node === 'pavilion_arrival');
  check('routes', r.name + ': whole state carried into Chapter 3 (inventory, item marks, flags, checks, seed)',
    same(s0.inventory, pre.inventory) && same(s0.items, pre.items) && same(s0.flags, pre.flags) && same(s0.checks, pre.checks) && s0.seed === pre.seed);
  const arrival = s0.transcript.filter((t) => t.chapter === 'chapter-03' && t.node === 'pavilion_arrival').map((t) => t.runs.map((x) => x.text).join(' ')).join(' ');
  const want = C.ARRIVAL[pre.flags.ch2_exit_route === 'tram_robot_crash' ? 'tram_robot_crash' : e.group];
  check('routes', r.name + ': arrival narration is the ' + (pre.flags.ch2_exit_route === 'tram_robot_crash' ? 'tram crash' : e.group) + ' variant', want.test(arrival), arrival.slice(0, 160));
  // Walk it again, step by step.
  let s = s0; visited.add(s.node); shows(s).forEach((p) => shown.add(p));
  for (const st of r.steps) {
    const input = typeof st === 'string' ? { choice: st } : st;
    const v = Rules.view(story, s);
    if (input.choice) taken.add(s.node + ':' + input.choice);
    else {
      const it = v.items.find((x) => x.id === input.item);
      check('routes', r.name + ': ' + input.verb.toUpperCase() + ' ' + input.item + ' is offered at ' + s.node + ' only because it is held', s.inventory.includes(input.item) && it && it[input.verb]);
      taken.add(s.node + ':' + input.verb + ':' + input.item);
    }
    if (v.mode === 'dialogue') pairs.add(v.portrait.id + '@' + v.portrait.background + ':' + v.portrait.pose);
    s = Rules.step(story, s, input).state;
    visited.add(s.node); shows(s).forEach((p) => shown.add(p));
    const v2 = Rules.view(story, s);
    if (v2.mode === 'dialogue') pairs.add(v2.portrait.id + '@' + v2.portrait.background + ':' + v2.portrait.pose);
  }
  endsSeen.add(s.node);
  Object.entries(r.checks || {}).forEach(([id, ok]) => outcomes.add(id + ':' + ok));
  check('routes', r.name + ': reaches ' + r.end + ' with the named check outcomes', s.node === r.end && Object.entries(r.checks).every(([id, ok]) => s.checks[id].ok === ok));
  const lost = pre.inventory.filter((i) => !s.inventory.includes(i)), gained = s.inventory.filter((i) => !pre.inventory.includes(i));
  check('routes', r.name + ': inventory: nothing gained in Chapter 3; only ' + (r.takes.length ? r.takes.join(', ') + ' (stapler USE)' : 'nothing') + ' lost',
    !gained.length && same(lost, r.takes), { lost, gained });
  const flagDiff = Object.keys(s.flags).filter((k) => !same(s.flags[k], pre.flags[k]));
  check('routes', r.name + ': Chapter 3 changes no earlier flag (contamination, credentials, exit route and entry group persist)', !flagDiff.length, flagDiff);
  for (const [id, b] of Object.entries(r.bonus || {})) check('routes', r.name + ': ' + id + ' bonus ' + b + ' (clicker ' + (s.inventory.includes('timing_clicker') ? 'held' : 'not held') + ')', s.checks[id].bonus === b, s.checks[id]);
  if (s.checks.ch3_restroom_dash) check('routes', r.name + ': the door dash is unmodified (bonus 0, need 4)', s.checks.ch3_restroom_dash.bonus === 0);
  if (r.noUse) {
    const at = R2state(f.entry, r.steps, 'record_choices');
    check('routes', r.name + ': ' + r.noUse + ' spent in Chapter 2: no USE at record_choices, the record choices remain', at && !at.inventory.includes(r.noUse) && Rules.view(story, at).items.every((x) => !x.use) && Rules.view(story, at).cards.length === 3);
  }
}
function R2state(start, steps, node) {
  let s = start;
  for (const st of steps) { if (s.node === node) return s; s = Rules.step(story, s, typeof st === 'string' ? { choice: st } : st).state; }
  return s.node === node ? s : null;
}
check('routes', 'all ' + C.ROUTES.length + ' Chapter 3 routes play from real seeds', runs.length === C.ROUTES.length);

// The clicker is a +1 only while held (never consumed by the leap); the dash is never modified.
const leapCk = Object.values(CH3.nodes.human_locomotion.choices).find((c) => c.check).check;
check('checks', 'ch3_locomotion_leap: hidden d6, need 4, +1 only while timing_clicker is held', same(leapCk, { id: 'ch3_locomotion_leap', sides: 6, need: 4, mods: [{ if: { has: 'timing_clicker' }, add: 1 }] }), leapCk);
const dashCk = CH3.nodes.door_choices.choices.find((c) => c.check).check;
check('checks', 'ch3_restroom_dash: hidden d6, need 4, no modifier', same(dashCk, { id: 'ch3_restroom_dash', sides: 6, need: 4 }), dashCk);
const clickRun = runs.find((x) => x.r.name === 'clicker_leap_raw3_pass');
check('checks', 'held clicker: a raw 3 passes the leap (3 + 1 >= 4) and the clicker is kept', clickRun && clickRun.f.end.checks.ch3_locomotion_leap.roll === 3 && clickRun.f.end.checks.ch3_locomotion_leap.ok && clickRun.f.end.inventory.includes('timing_clicker'));
const spentRun = runs.find((x) => x.r.name === 'clicker_spent_leap_raw3_fails');
check('checks', 'clicker spent in Chapter 2 (sabotage jam): the same raw 3 fails (no modifier from a once-owned item)', spentRun && spentRun.f.end.checks.ch3_locomotion_leap.roll === 3 && !spentRun.f.end.checks.ch3_locomotion_leap.ok && !spentRun.f.entry.inventory.includes('timing_clicker'));
// Deterministic: the same save gives the same roll; a different seed may not.
if (clickRun) {
  const again = C.R.stepAll(story, clickRun.f.entry, clickRun.r.steps);
  check('checks', 'deterministic: replaying the same real state gives the same rolls', same(again.checks.ch3_locomotion_leap, clickRun.f.end.checks.ch3_locomotion_leap));
}

// Item gating on constructed states (the Facilities Key is held on every real route, measured in docs/104).
const refusal = R2state(runs[0].f.entry, C.OPEN, 'attendant_refusal');
const noKey = Object.assign({}, refusal, { inventory: refusal.inventory.filter((i) => i !== 'wc_key') });
check('items', 'wc_key held: SHOW the Facilities Key is offered at attendant_refusal', Rules.view(story, refusal).items.some((x) => x.id === 'wc_key' && x.show));
check('items', 'wc_key not held: no SHOW, the three approved choices stay', !Rules.view(story, noKey).items.some((x) => x.id === 'wc_key') && Rules.view(story, noKey).cards.length === 3);
let refused = false;
try { Rules.step(story, noKey, { item: 'wc_key', verb: 'show' }); } catch (e) { refused = true; }
check('items', 'the engine refuses SHOW of an item that is not held', refused);
const keyRun = runs.find((x) => x.r.name === 'key_urgency');
check('items', 'SHOW wc_key does not consume the key; it leads to attendant_key_callback with the same three intents', keyRun && keyRun.f.end.inventory.includes('wc_key')
  && same(CH3.nodes.attendant_key_callback.choices.map((c) => [c.kind, c.text]), CH3.nodes.attendant_refusal.choices.map((c) => [c.kind, c.text])));
const noPhoto = runs.find((x) => x.r.name === 'urgency');
const pv = R2state(noPhoto.f.entry, noPhoto.r.steps, 'presenter_verification');
check('items', 'photo not held: no SHOW at presenter_verification', pv && !pv.inventory.includes('family_portrait_photo') && !Rules.view(story, pv).items.some((x) => x.show));
const photoRun = runs.find((x) => x.r.name === 'photo');
check('items', 'SHOW the family photo returns it (retained after Chapter 3)', photoRun && photoRun.f.end.inventory.includes('family_portrait_photo'));
const stRun = runs.find((x) => x.r.name === 'stapler'), stRun2 = runs.find((x) => x.r.name === 'key_stapler');
check('items', 'USE red_stapler consumes it exactly once and leads backstage', stRun && !stRun.f.end.inventory.includes('red_stapler') && stRun.f.end.node === 'backstage_exit' && stRun2 && !stRun2.f.end.inventory.includes('red_stapler'));
// Six VISIBLE slots, never a six-item capacity: the fullest real inventory (9) crosses into Chapter 3 whole.
const pack2 = C.fullPackEnd(story), pack3 = C.enterChapter3(story, pack2);
check('items', 'a real playthrough reaches the Chapter 2 customs ending holding 9 items (no capacity limit; six slots are only what is visible)',
  pack2.chapter === 'chapter-02' && pack2.node === C.FULL_PACK.end && JSON.stringify(pack2.inventory) === JSON.stringify(C.FULL_PACK.inventory), pack2.inventory);
check('items', 'all 9 items cross into Chapter 3 (public-concourse arrival), in order', pack3.chapter === 'chapter-03' && pack3.node === 'pavilion_arrival'
  && JSON.stringify(pack3.inventory) === JSON.stringify(C.FULL_PACK.inventory) && C.ARRIVAL.public_concourse.test(pack3.transcript.slice(-4).map((e) => (e.runs || []).map((r) => r.text).join(' ')).join(' ')), pack3.inventory);
{
  let s = pack3; const inspected = [];
  for (const id of s.inventory) { s = Rules.step(story, s, { item: id, verb: 'inspect' }).state; if ((s.items[id] || []).includes('inspected')) inspected.push(id); }
  check('items', 'every one of the 9 items, including the 7th-9th beyond the visible six, can be inspected in Chapter 3', inspected.length === 9, inspected);
  let k = pack3; for (const st of C.OPEN.concat(C.KEY, C.BRANCHES.photo.via(true), C.BRANCHES.photo.steps)) k = Rules.step(story, k, typeof st === 'string' ? { choice: st } : st).state;
  check('items', 'with 9 items: SHOW the key and SHOW the photo work and the route ends backstage still holding all 9', k.node === 'backstage_exit' && JSON.stringify(k.inventory) === JSON.stringify(C.FULL_PACK.inventory), { node: k.node, inv: k.inventory });
}

// 6. Coverage ----------------------------------------------------------------------------------------
const allNodes = Object.keys(CH3.nodes);
check('coverage', 'every Chapter 3 node is reached on a real route (' + visited.size + '/34)', allNodes.every((n) => visited.has(n)), allNodes.filter((n) => !visited.has(n)));
const allChoices = [];
for (const [id, n] of Object.entries(CH3.nodes)) {
  (n.choices || []).forEach((c) => { if (!c.restart) allChoices.push(id + ':' + c.id); });
  ['show', 'use'].forEach((verb) => Object.keys(n[verb] || {}).forEach((item) => allChoices.push(id + ':' + verb + ':' + item)));
}
check('coverage', 'every Chapter 3 choice, SHOW and USE is taken on a real route (' + allChoices.length + ')', allChoices.every((c) => taken.has(c)), allChoices.filter((c) => !taken.has(c)));
check('coverage', 'both outcomes of both hidden checks', ['ch3_locomotion_leap:true', 'ch3_locomotion_leap:false', 'ch3_restroom_dash:true', 'ch3_restroom_dash:false'].every((o) => outcomes.has(o)), [...outcomes]);
check('coverage', 'all 7 surviving endings reached', C.ENDINGS.every((x) => endsSeen.has(x)) && endsSeen.size === 7, [...endsSeen]);
check('coverage', 'all 29 images shown on real routes (14 scenes + 8 backgrounds + 7 poses)', PROV.images.every((r) => shown.has(r.path)), PROV.images.filter((r) => !shown.has(r.path)).map((r) => r.path));
const wantPairs = new Set();
// The built node names its pose only where it differs from the speaker's default.
Object.values(CH3.nodes).filter((n) => n.mode === 'dialogue').forEach((n) => wantPairs.add(n.speaker + '@' + n.scene + ':' + (n.pose || A.portraits[story.cast[n.speaker].portrait].pose)));
check('coverage', 'every authored conversation (speaker, location, pose) combination is shown (' + wantPairs.size + ')', [...wantPairs].every((p) => pairs.has(p)), [...wantPairs].filter((p) => !pairs.has(p)));

// 7. Endings -----------------------------------------------------------------------------------------
for (const id of C.ENDINGS) {
  const n = CH3.nodes[id];
  check('endings', id + ': a surviving chapter ending: end, BEGIN AGAIN (restart) only, no death popup or death art',
    n.end === true && n.choices.length === 1 && n.choices[0].kind === 'system' && n.choices[0].text === 'BEGIN AGAIN' && n.choices[0].restart === true && !n.choices[0].chapter
    && !DEATHS.entries.some((e) => e.when.end === 'chapter-03:' + id));
}
check('endings', 'exactly 7 Chapter 3 endings; none hands off to an unapproved Chapter 4', Object.values(CH3.nodes).filter((n) => n.end).length === 7
  && !Object.values(CH3.nodes).some((n) => (n.choices || []).some((c) => c.chapter)) && !story.chapters['chapter-04']);
const endRun = runs.find((x) => x.r.name === 'pull');
const restarted = Rules.step(story, endRun.f.end, { choice: 'restart_after_paper_emergency' });
check('endings', 'BEGIN AGAIN begins a new playthrough at the Prologue with the initial state', restarted.state.chapter === story.start && restarted.state.node === story.chapters[story.start].start
  && same(restarted.state.inventory, story.initialState.inventory) && restarted.events.some((e) => e.t === 'restart'));
check('endings', 'Rules.endCause names each Chapter 3 ending; no canonical or review death entry matches it', runs.filter((x) => C.ENDINGS.includes(x.f.end.node)).every((x) => {
  const cause = Rules.endCause(story, x.f.end);
  return cause && cause.end === 'chapter-03:' + x.f.end.node && !DEATHS.entries.some((e) => Object.keys(e.when).every((k) => cause[k] === e.when[k]));
}) && (REVIEW.entries || []).every((e) => e.canonical === '*' || !/^chapter-03:/.test(e.canonical)));
check('endings', 'every ending leaves the Pavilion without restroom access and the Original unexplained (no restroom success, no reveal)',
  C.ENDINGS.every((id) => !/you use the (rest|bath)room|you finally use/i.test(JSON.stringify(CH3.nodes[id].text))));

// 8. Chapter 2 -> 3 transition ------------------------------------------------------------------------
const CH2 = story.chapters['chapter-02'];
for (const id of ['end_concourse_robot', 'end_public', 'end_customs', 'end_maintenance', 'end_underground_station']) {
  const n = CH2.nodes[id];
  check('transition', 'Chapter 2 ' + id + ': CONTINUE into chapter-03 (no longer an ending; text and effects as before)',
    !n.end && n.choices.length === 1 && same(n.choices[0], { id: 'continue_to_chapter_03_' + id, kind: 'continue', text: 'CONTINUE', chapter: 'chapter-03' }) && n.effects && n.effects.set && n.effects.set.chapter3_entry_group);
}
for (const id of ['fatal_sorter', 'fatal_hopper', 'fatal_transformation', 'fatal_planting', 'fatal_roots']) {
  const n = CH2.nodes[id];
  check('transition', 'Chapter 2 ' + id + ': still a fatal ending (BEGIN AGAIN, own death popup), never enters Chapter 3', n.end === true && n.choices.length === 1 && n.choices[0].restart && !n.choices[0].chapter
    && DEATHS.entries.some((e) => e.when.end === 'chapter-02:' + id));
}
check('transition', 'every Chapter 1 exit into Chapter 2 is unchanged', Object.values(story.chapters['chapter-01'].nodes).filter((n) => (n.choices || []).some((c) => c.chapter)).length === 5);
// The Chapter 3 entry is a CHECKPOINT (tracked as in the death-control suites).
const pts = Rules.trackPoints(story, null, runs[0].f.ch2End, { choice: Rules.view(story, runs[0].f.ch2End).cards[0].id }, Rules.step(story, runs[0].f.ch2End, { choice: Rules.view(story, runs[0].f.ch2End).cards[0].id }));
check('transition', 'entering Chapter 3 records its chapter-entry restore point (CHECKPOINT) at pavilion_arrival', pts.checkpoint && pts.checkpoint.chapter === 'chapter-03' && pts.checkpoint.state.node === 'pavilion_arrival');

// 9. Presentation ------------------------------------------------------------------------------------
const nodes = Object.entries(CH3.nodes);
check('presentation', 'dialogue nodes are attendant / presenter conversations with a portrait; narrative nodes have no speaker',
  nodes.every(([, n]) => (n.mode === 'dialogue' ? ['pavilion_attendant', 'pavilion_presenter'].includes(n.speaker) : n.mode === 'narrative' && !n.speaker)));
check('presentation', '20 dialogue nodes (attendant / presenter), 14 Narrative B nodes', nodes.filter(([, n]) => n.mode === 'dialogue').length === 20 && nodes.filter(([, n]) => n.mode === 'narrative').length === 14);
const cards = nodes.flatMap(([, n]) => (n.choices || []).concat(Object.values(n.show || {}), Object.values(n.use || {})));
check('presentation', 'card kinds: spoken lines and actions are authored cards, CONTINUE for beats, BEGIN AGAIN at endings; no literal quotes on cards',
  cards.every((c) => ['spoken', 'action', 'continue', 'system'].includes(c.kind) && !/["[\]]/.test(c.text || c.say || '')), cards.filter((c) => /["[\]]/.test(c.text || c.say || '')));
const ck = runs.find((x) => x.r.name === 'leap_pass');
const atLeap = R2state(ck.f.entry, ck.r.steps, 'human_locomotion'), atDash = R2state(runs.find((x) => x.r.name === 'dash_pass').f.entry, runs.find((x) => x.r.name === 'dash_pass').r.steps, 'door_choices');
check('presentation', 'the two hidden checks show only the standard risk marker (hasCheck), no odds or roll in the view',
  Rules.view(story, atLeap).cards.find((c) => c.id === 'leap_from_locomotion_stage').hasCheck === true && Rules.view(story, atDash).cards.find((c) => c.id === 'dash_through_restroom_exit').hasCheck === true
  && !/roll|need|odds|sides/.test(JSON.stringify(Rules.view(story, atLeap).cards)));
check('presentation', 'incidental voices visitor and restroom_system are portrait-less cast members with display names; the two speakers have portraits',
  same(story.cast.visitor, { name: 'VISITOR' }) && same(story.cast.restroom_system, { name: 'RESTROOM SYSTEM' }) && story.cast.pavilion_attendant.portrait === 'pavilion_attendant' && story.cast.pavilion_presenter.portrait === 'pavilion_presenter');
const whoRuns = [];
nodes.forEach(([id, n]) => (Array.isArray(n.text) ? n.text : []).forEach((r) => { if (r && r.who) whoRuns.push(id + ':' + r.who); }));
const incidental = whoRuns.filter((w) => !story.cast[w.split(':')[1]].portrait);
check('presentation', 'who runs only inside dialogue nodes: 12 incidental-voice lines (visitor, restroom system) plus the presenter\'s own AAH!', whoRuns.length === 13 && incidental.length === 12
  && whoRuns.every((w) => CH3.nodes[w.split(':')[0]].mode === 'dialogue'), whoRuns);
// The '%' rule (docs/104 section 5): Dialogue / Labels / Objective faces draw it; the locked face does not.
const fonts = J('tools/layout-lab/data/fonts.json'), locked = J('art/ui/sprites/fonts/locked_pixel_font_atlas.json').mapping;
check('presentation', "'%' is in every baked face (Jersey 15, Press Start 2P, Tiny5) and still not in the locked face", Object.values(fonts).every((f) => f.mapping['%'] && f.mapping['%'].w > 0) && !locked['%']);
check('presentation', "the two approved readouts keep their '%' exactly (0% / 100%)", /AUDIENCE PARTICIPATION: 0%/.test(JSON.stringify(CH3.nodes.authentic_urgency_reply.text)) && /AUTHENTIC HUMAN RESPONSE: 100%/.test(JSON.stringify(CH3.nodes.genuine_surprise.text)));
const charset = { locked: Object.keys(locked), text: Object.keys(fonts['jersey15-1x'].mapping).filter((ch) => Object.values(fonts).every((f) => f.mapping[ch])) };
const mutant = (fn) => { const s = JSON.parse(JSON.stringify(story)); fn(s); return Rules.validateStory(s, charset).errors; };
// (The built story's own full validation, reachable states included, is import.js --check / --verify.)
check('presentation', "validator: '%' on a choice card (locked face) is refused", mutant((s) => { s.chapters['chapter-03'].nodes.door_choices.choices[1].text = 'HOLD IT 100%'; }).some((e) => /cannot draw: %/.test(e)));
check('presentation', "validator: '%' in the player's action run (locked face) is refused", mutant((s) => { s.chapters['chapter-03'].nodes.attendant_refusal.text.push({ act: 'You nod 100%.' }); }).some((e) => /cannot draw: %/.test(e)));
check('presentation', "validator: a plain-array charset (the locked set) still refuses '%' anywhere", !Rules.validateStory(story, charset.locked).ok);
// docs/137 C2 (Nate, 2026-11-24) replaces the old docs/104 rule: a voice without a portrait may lead a dialogue
// node (presented on Narrative B, labelled), but never with a pose or backdrop. Chapter 3 itself has none.
check('presentation', 'validator (docs/137 C2): an incidental voice may lead a dialogue node, with no pose or backdrop', (function () {
  // A sentinel shape error elsewhere stops the validator before its reachable-state walk (which would need the
  // whole Prologue-Chapter 3 graph in memory); the sentinel must then be the ONLY error.
  const errs = mutant((s) => { const n = s.chapters['chapter-03'].nodes.door_choices; n.speaker = 'visitor'; delete n.pose; delete n.backdrop; s.chapters['chapter-03'].nodes.door_courtesy.qaSentinel = 1; });
  return errs.length === 1 && /door_courtesy/.test(errs[0]) && /qaSentinel/.test(errs[0]);
})());
check('presentation', 'validator (docs/137 C2): a voice-led node given a pose is refused', mutant((s) => { const n = s.chapters['chapter-03'].nodes.door_choices; n.speaker = 'visitor'; n.pose = 'default'; }).some((e) => /pose is not available to visitor/.test(e)));
check('presentation', 'Chapter 3 content has no voice-led dialogue (every dialogue speaker has a portrait)', Object.values(CH3.nodes).filter((n) => n.mode === 'dialogue').every((n) => story.cast[n.speaker] && story.cast[n.speaker].portrait));
check('presentation', 'validator: an unknown who is refused', mutant((s) => { s.chapters['chapter-03'].nodes.door_choices.text[0].who = 'stranger'; }).some((e) => /unknown speaker stranger/.test(e)));

// 10. Saves ------------------------------------------------------------------------------------------
const FIX = 'game/qa/fixtures/ch03_save_compat/';
const idx = J(FIX + 'index.json');
for (const [k, v] of Object.entries(idx.saves)) {
  const raw = fs.readFileSync(path.join(ROOT, FIX + v.file), 'utf8').trim();
  const m = Rules.migrate(story, raw);
  const ok = m.ok && m.state.chapter === v.chapter && m.state.node === v.node && same(m.state.inventory, v.inventory);
  check('saves', 'a real save from game main 9a0ca4a (' + k + ' at ' + v.chapter + ':' + v.node + ') migrates into this build unchanged', ok && JSON.parse(raw).version !== story.version, m.reason);
  if (ok && /end_/.test(v.node)) {
    const cards = Rules.view(story, m.state).cards;
    const next = cards.length === 1 && Rules.step(story, m.state, { choice: cards[0].id }).state;
    check('saves', k + ': the old ending save now offers CONTINUE into Chapter 3 and arrives with its inventory', next && next.chapter === 'chapter-03' && next.node === 'pavilion_arrival' && same(next.inventory, v.inventory));
  }
}
const mid = R2state(runs[0].f.entry, runs[0].r.steps, 'authentic_urgency');
const env = Rules.serialize(story, mid, { presented: mid.transcript.length });
const back = Rules.restore(story, env);
check('saves', 'a Chapter 3 save restores exactly (node, inventory, flags, transcript)', back.ok && same(back.state, mid), back.reason);

// 11. Scope ------------------------------------------------------------------------------------------
check('scope', 'no legacy pavilion/* scene, Registrar portrait or legacy Chapter 3 item is used', !Object.keys(A.scenes).some((s) => /^pavilion\//.test(s)) && !A.portraits.registrar
  && !Object.keys(story.items).some((id) => /^pavilion_/.test(id) || id === 'certificate_fulfilled_requirements'));
check('scope', 'no Chapter 3 death presentation (canonical export or runtime)', !DEATHS.entries.some((e) => /^chapter-03:/.test(e.id)) && !J('story/death-presentations.export.json').entries.some((e) => /^chapter-03:/.test(e.id)));
check('scope', 'consumed chapters are exactly Prologue, Chapter 1, Chapter 2 and Chapter 3', same(LOCK.chapters, ['prologue-00', 'chapter-01', 'chapter-02', 'chapter-03']) && same(build.chapters.map((c) => c.id), LOCK.chapters));

const failed = results.filter((r) => !r.ok);
const by = {};
results.forEach((r) => { by[r.group] = by[r.group] || [0, 0]; by[r.group][1]++; if (r.ok) by[r.group][0]++; });
fs.writeFileSync(path.join(__dirname, 'ch03_results.json'), JSON.stringify({ schema: 'cyoa-ch03-validation-v1', total: results.length, passed: results.length - failed.length,
  routes: runs.map((x) => ({ name: x.r.name, entry: x.r.entry, seed: x.f.seed, end: x.f.end.node, checks: Object.fromEntries(Object.entries(x.f.end.checks).filter(([k]) => /^ch3_/.test(k))) })), groups: by, results }, null, 1) + '\n');
console.log('Chapter 3 validation: ' + (results.length - failed.length) + '/' + results.length + ' passed (' + Object.keys(by).map((g) => g + ' ' + by[g][0] + '/' + by[g][1]).join(', ') + ')');
if (failed.length) process.exitCode = 1;
