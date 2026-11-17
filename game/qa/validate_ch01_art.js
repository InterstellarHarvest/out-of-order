#!/usr/bin/env node
// Chapter 1 production art (docs/92, docs/93): the 29 selected House of Tomorrow images, their
// provenance, their registration, and the state-dependent art the engine selects on real routes.
//
//   1. intake      every image in art/house_of_tomorrow.provenance.json exists, is byte-identical to
//                  its recorded sha256 / git blob (and to its pinned source blob when that commit is
//                  in the local clone), has its recorded size and colour type
//   2. registry    each is registered exactly where docs/92 says (artwork.draft.json), status
//                  integrated (selected AND used; the unbound chair state: approved) under the owner
//                  ruling of 2026-11-16 (public docs/102-103, docs/97), no review/ path; the generated story uses
//                  all of them except the one documented unbound state, with matching sha256
//   3. selection   Rules.view on real Prologue -> House routes (game/qa/ch02_routes.js): the storage
//                  overlays, plant pedestal, album-removed gallery, album pages, RETURNS display,
//                  House complete views and the chair; plus negative controls, save/restore and the
//                  Chapter 2 hand-off
// Node only; no browser. Exit code 1 on any failure.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const Rules = require('../js/rules.js');
const gen = require('../content/story.generated.js');
const story = gen.story;
const R = require('./ch02_routes.js');

const results = [];
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + group + '] ' + name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 600)));
}
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gitBlob = (b) => crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const PROV = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/house_of_tomorrow.provenance.json'), 'utf8'));
const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'story/artwork.draft.json'), 'utf8'));
const SOURCE = 'cf575552fc729b952d99d25bea56dbc81b40619d';

// 1. Intake ------------------------------------------------------------------------------------
{
  const g = 'intake';
  const imgs = PROV.images;
  const count = (k) => imgs.filter((r) => r.kind === k).length;
  check(g, 'exactly the 29 docs/92 images: 14 scenes, 2 House views, 3 album pages, 2 photo views, 8 scene states (7 bound + default chair)',
    imgs.length === 29 && count('scene') === 14 && count('portrait-view') === 2 && count('focus-page') === 3
    && count('item-slot') === 1 && count('item-inspect') === 1 && count('scene-state') === 8, imgs.map((r) => r.kind));
  check(g, 'pinned to the docs/92 art commit', PROV.sourceCommit === SOURCE && PROV.sourceBranch === 'agent/ch01-art-batch05-interactive-states');
  check(g, '29 distinct files and 29 distinct images', new Set(imgs.map((r) => r.path)).size === 29 && new Set(imgs.map((r) => r.sha256)).size === 29);
  check(g, 'the superseded first-pass plant overlay is not used', !imgs.some((r) => r.source === 'review/chapter-01-batch05-2026-11-15/assets/B-plant-adoption.png')
    && imgs.some((r) => r.source === 'review/chapter-01-batch05-2026-11-15/pedestal-foreground-v02/B-plant-adoption-v02.png'));
  const SIZE = { scene: '314x206', 'scene-state': '314x206', 'portrait-view': '564x278', 'focus-page': '564x278', 'item-slot': '96x96', 'item-inspect': '565x451' };
  imgs.forEach((r) => {
    const file = path.join(ROOT, r.path);
    if (!fs.existsSync(file)) return check(g, r.path + ' exists', false);
    const b = fs.readFileSync(file);
    const w = b.readUInt32BE(16);
    const h = b.readUInt32BE(20);
    const ct = { 2: 'RGB', 6: 'RGBA' }[b[25]];
    check(g, r.path + ': sha256, git blob, ' + r.width + 'x' + r.height + ' ' + r.colorType + ' as recorded',
      sha256(b) === r.sha256 && gitBlob(b) === r.sourceGitBlob && b.length === r.bytes && w === r.width && h === r.height && ct === r.colorType, { sha: sha256(b), w, h, ct });
    check(g, r.path + ': native size of its class (' + SIZE[r.kind] + ')', w + 'x' + h === SIZE[r.kind]);
    // Overlays and the photo slot are transparent; scenes, views, pages and the inspect art opaque RGB.
    const wantAlpha = r.kind === 'item-slot' || (r.kind === 'scene-state' && !/#(album_removed|default_unrestrained)$/.test(r.id));
    check(g, r.path + ': ' + (wantAlpha ? 'RGBA (transparent layer)' : 'RGB (opaque)'), (ct === 'RGBA') === wantAlpha, ct);
    check(g, r.path + ': production path (no review/, source/, originals/)', /^art\/[a-z0-9_./-]+\.png$/.test(r.path) && !/(^|\/)(review|source|originals)\//.test(r.path));
  });
  // The pinned source itself, when this clone has the art commit (local review; CI may not).
  let have = false;
  try { execFileSync('git', ['cat-file', '-e', SOURCE + '^{commit}'], { cwd: ROOT, stdio: 'ignore' }); have = true; } catch (e) { have = false; }
  if (have) {
    const bad = imgs.filter((r) => execFileSync('git', ['rev-parse', SOURCE + ':' + r.source], { cwd: ROOT, encoding: 'utf8' }).trim() !== r.sourceGitBlob);
    check(g, 'every production file is byte-identical to its pinned source blob at ' + SOURCE.slice(0, 8), !bad.length, bad.map((r) => r.source));
  } else {
    console.log('SKIP [intake] pinned source commit ' + SOURCE.slice(0, 8) + ' is not in this clone: source blobs compared only through the recorded hashes');
  }
}

// 2. Registry and generated story ---------------------------------------------------------------
{
  const g = 'registry';
  const at = {}; // provenance id -> registry record
  Object.keys(ART.scenes).forEach((sid) => {
    const sc = ART.scenes[sid];
    if (sid.startsWith('house_of_tomorrow/')) at['scene ' + sid] = sc;
    (sc.states || []).forEach((st) => { at['scene-state ' + sid + '#' + st.id] = st; });
  });
  const hv = ART.portraits['house:idle'];
  Object.keys(hv.views || {}).forEach((sid) => { at['portrait-view house@' + sid] = hv.views[sid]; });
  (ART.focus['house_of_tomorrow/portrait_gallery/album'].pages || []).forEach((pg, i) => { at['focus-page house_of_tomorrow/portrait_gallery/album:page:' + (i + 1)] = pg; });
  at['item-slot family_portrait_photo'] = ART.items.family_portrait_photo.slot;
  at['item-inspect family_portrait_photo'] = ART.items.family_portrait_photo.inspect;
  // Owner ruling 2026-11-16: selected + used art is approved; used in this build = integrated. The one
  // selected-but-unbound state is approved, never displayed, so never integrated.
  const want = (r) => (r.id === 'house_of_tomorrow/chair#default_unrestrained' ? 'approved' : 'integrated');
  PROV.images.forEach((r) => {
    const rec = at[r.kind + ' ' + r.id];
    check(g, r.kind + ' ' + r.id + ' registered at ' + r.path + ' (status ' + want(r) + ': selected, owner-approved by the 2026-11-16 ruling)',
      rec && rec.assetPath === r.path && rec.status === want(r), rec && { assetPath: rec.assetPath, status: rec.status });
  });
  const houseRecords = Object.keys(at).length;
  check(g, 'every House art record in the registry is one of the 29 (none left as a placeholder)', houseRecords === 29, Object.keys(at).filter((k) => !PROV.images.some((r) => r.kind + ' ' + r.id === k)));
  check(g, 'House intercom is the opaque-complete exception; layered NPC records unchanged',
    hv.format === 'opaque-complete' && !hv.layers && !hv.foregroundFormat && !hv.portraitBackgroundScene
    && ART.portraits['receptionist:default'].foregroundFormat === 'transparent-rgba-png' && Array.isArray(ART.portraits['receptionist:default'].layers));
  check(g, 'no layered portrait background is registered for the two House talking rooms',
    !ART.scenes['house_of_tomorrow/foyer'].portraitBackground && !ART.scenes['house_of_tomorrow/portrait_gallery'].portraitBackground);
  // The generated story uses each (BUILD.art carries the hash it was built from).
  const built = {};
  gen.build.art.forEach((a) => { built[a.path] = a; });
  PROV.images.forEach((r) => {
    if (r.id === 'house_of_tomorrow/chair#default_unrestrained') {
      check(g, 'the default chair state is installed but deliberately unbound (docs/92 section 4: no authored view needs it)', !built[r.path]
        && !JSON.stringify(story.assets).includes(r.path) && ART.scenes['house_of_tomorrow/chair'].states[0].selection === null);
      return;
    }
    check(g, 'generated story uses ' + r.path + ' with the provenance sha256', built[r.path] && built[r.path].sha256 === r.sha256 && built[r.path].status === 'integrated', built[r.path]);
  });
  const hs = Object.keys(story.assets.scenes).filter((k) => k.startsWith('house_of_tomorrow/'));
  check(g, 'all 14 House scenes have production art (no DEV PLACEHOLDER left in Chapter 1)', hs.length === 14 && hs.every((k) => typeof story.assets.scenes[k] === 'string'));
  check(g, 'House portrait is { views, view } with one complete view per talking room; no poses or backgrounds',
    JSON.stringify(Object.keys(story.assets.portraits.house).sort()) === '["view","views"]'
    && Object.keys(story.assets.portraits.house.views).sort().join() === 'house_of_tomorrow/foyer,house_of_tomorrow/portrait_gallery');
  check(g, 'album close-up is three semantic pages pairing 1 + 1 + 2 paragraphs',
    JSON.stringify(story.assets.focus['house_of_tomorrow/portrait_gallery/album'].pages.map((p) => p.paragraphs)) === '[1,1,2]');
  check(g, 'scene states: album_removed (replace), pedestal, 4 storage items, RETURNS (overlays)',
    JSON.stringify(Object.keys(story.assets.sceneStates).sort().map((k) => [k, story.assets.sceneStates[k].map((s) => s.id + ':' + s.layer)])) === JSON.stringify([
      ['house_of_tomorrow/foyer', ['named_plant_pedestal:overlay']],
      ['house_of_tomorrow/portrait_gallery', ['album_removed:replace']],
      ['house_of_tomorrow/storage', ['stored_desk_plant:overlay', 'stored_red_stapler:overlay', 'stored_rubber_band_ball:overlay', 'stored_timing_clicker:overlay']],
      ['house_of_tomorrow/utility_exit', ['returns_display:overlay']]]));
  check(g, 'no Chapter 2 or Prologue art changed by this integration', ['biology_park/', 'workplace/', 'exposition/', 'street/'].every((p) =>
    Object.keys(story.assets.scenes).filter((k) => k.startsWith(p)).every((k) => !String(story.assets.scenes[k]).includes('house_of_tomorrow'))));
}

// 3. Selection on real routes ----------------------------------------------------------------------
const view = (s) => Rules.view(story, s);
const art = (s) => { const v = view(s); return [v.scene, v.sceneArt.replace, v.sceneArt.overlay].join('|'); };
const step = (s, c) => R.stepAll(story, s, [c]);
const steps = (s, list) => R.stepAll(story, s, list);
function seedFor(item, path, accept) {
  for (let seed = 1; seed <= 3000; seed++) {
    let s;
    try { s = steps(R.prologue(story, item, seed), path); } catch (e) { if (e.missing) continue; throw e; }
    if (!accept || accept(s)) return s;
  }
  throw new Error('no seed for ' + item + ' ' + path.join(','));
}
const ENTRY = ['enter_show_home', 'hear_house_greeting'];
const TO_STORAGE = ENTRY.concat(['permit_housekeeping', 'ask_for_bathroom_after_storage', 'recover_belongings_now']);
const restoreSame = (s) => {
  const saved = Rules.serialize(story, s, { presented: s.transcript.length });
  const r = Rules.migrate(story, saved);
  return r.ok && JSON.stringify(view(r.state).sceneArt) === JSON.stringify(view(s).sceneArt) && JSON.stringify(view(r.state).portrait) === JSON.stringify(view(s).portrait);
};
{
  const g = 'storage';
  ['desk_plant', 'red_stapler', 'rubber_band_ball', 'timing_clicker'].forEach((item) => {
    const s = seedFor(item, TO_STORAGE);
    check(g, item + ': the House took the real held item (not a Prologue memory)', s.node === 'storage_cabinet' && !s.inventory.includes(item) && s.flags.house_stored_item === item);
    check(g, item + ': exactly its own drawer overlay', art(s) === 'house_of_tomorrow/storage||stored_' + item, art(s));
    check(g, item + ': overlay survives save/restore', restoreSame(s));
    const back = step(s, 'take_back_house_item');
    check(g, item + ': retrieved -> drawer empty, item held once', back.node === 'storage_reclaimed' && art(back) === 'house_of_tomorrow/storage||'
      && back.inventory.filter((x) => x === item).length === 1, { art: art(back), inv: back.inventory });
    const left = step(s, 'leave_stored_object');
    check(g, item + ': left in storage -> scene moves on with no phantom item', left.node === 'refused_both' && !left.inventory.includes(item) && view(left).sceneArt.overlay === null);
    // Negative controls on the real storage state: the flag alone never conjures the object.
    const held = JSON.parse(JSON.stringify(s)); held.inventory.push(item);
    check(g, item + ': negative control - recorded as stored but actually held -> no overlay', view(held).sceneArt.overlay === null);
    const rec = JSON.parse(JSON.stringify(s)); rec.flags.house_storage_recovered = true;
    check(g, item + ': negative control - already recovered -> no overlay', view(rec).sceneArt.overlay === null);
  });
  // Nothing held -> nothing taken -> no storage visit at all.
  const none = seedFor(null, ENTRY.concat(['permit_housekeeping', 'ask_for_bathroom_after_storage']));
  check(g, 'negative control - deposited everything in the Prologue: nothing stored, no storage visit offered',
    !none.flags.house_stored_any && !view(none).cards.some((c) => c.id === 'recover_belongings_now'));
}
{
  const g = 'plant';
  const s = seedFor('desk_plant', R.HOUSE.plant.path.slice(0, -1));
  check(g, 'plant_adoption with the real held plant -> foyer + rug-hatch pedestal v02', s.node === 'plant_adoption' && s.inventory.includes('desk_plant')
    && art(s) === 'house_of_tomorrow/foyer||named_plant_pedestal', art(s));
  check(g, 'pedestal survives save/restore', restoreSame(s));
  const lacking = JSON.parse(JSON.stringify(s)); lacking.inventory = lacking.inventory.filter((x) => x !== 'desk_plant');
  check(g, 'negative control - same node without the plant -> no pedestal', view(lacking).sceneArt.overlay === null);
  const done = step(s, 'give_named_plant_to_house');
  check(g, 'handover consumes the plant once, registers the resident, next scene has no pedestal', done.node === 'exit_named_plant' && !done.inventory.includes('desk_plant')
    && done.flags.plant_registered_as_resident === true && art(done) === 'house_of_tomorrow/public_exit||', art(done));
  const foyer = seedFor('desk_plant', ENTRY);
  check(g, 'negative control - holding the plant in the foyer elsewhere (welcome) -> no pedestal', foyer.node === 'welcome_home' && view(foyer).sceneArt.overlay === null);
}
{
  const g = 'album';
  const pre = seedFor(null, R.HOUSE.showroom.path.slice(0, R.HOUSE.showroom.path.indexOf('inspect_album')));
  check(g, 'portrait_print: gallery with album on the cabinet; photo item added once', pre.node === 'portrait_print' && art(pre) === 'house_of_tomorrow/portrait_gallery||'
    && pre.inventory.filter((x) => x === 'family_portrait_photo').length === 1);
  const open = step(pre, 'inspect_album');
  check(g, 'album open (Focus A) -> album-removed gallery, close-up in the portrait aperture', view(open).mode === 'focus' && art(open) === 'house_of_tomorrow/portrait_gallery|album_removed|', art(open));
  check(g, 'album-removed survives save/restore', restoreSame(open));
  check(g, 'album is never an inventory item', !open.inventory.some((x) => /album/.test(x)));
  const text = story.chapters['chapter-01'].nodes.album_closeup.text.split('\n').filter(Boolean);
  const pages = story.assets.focus['house_of_tomorrow/portrait_gallery/album'].pages;
  check(g, 'pages pair: 1 "Page one", 2 "Page two", 3 "Page three" + the closing paragraph',
    text.length === 4 && /^Page one/.test(text[0]) && /^Page two/.test(text[1]) && /^Page three/.test(text[2]) && pages[0].paragraphs === 1 && pages[1].paragraphs === 1 && pages[2].paragraphs === 2
    && /album_page_1/.test(pages[0].path) && /album_page_2/.test(pages[1].path) && /album_page_3/.test(pages[2].path));
  const closed = step(open, 'close_album');
  check(g, 'close -> the identical gallery with album restored, though family_album_inspected is now set',
    closed.node === 'portrait_print' && closed.flags.family_album_inspected === true && art(closed) === 'house_of_tomorrow/portrait_gallery||', art(closed));
  const again = step(closed, 'inspect_album');
  check(g, 'repeat visit -> album removed again; close restores again', art(again) === 'house_of_tomorrow/portrait_gallery|album_removed|'
    && art(step(again, 'close_album')) === 'house_of_tomorrow/portrait_gallery||');
  const talk = step(closed, 'confront_house_about_album');
  check(g, 'House speaks in the gallery through its complete gallery view (no layers)', JSON.stringify(view(talk).portrait) === JSON.stringify({ cast: 'house', id: 'house', view: 'house_of_tomorrow/portrait_gallery' })
    && art(talk) === 'house_of_tomorrow/portrait_gallery||');
  check(g, 'confrontation is unlocked only after the album was actually opened', !view(pre).cards.some((c) => c.id === 'confront_house_about_album') && view(closed).cards.some((c) => c.id === 'confront_house_about_album'));
}
{
  const g = 'portraits';
  const s = seedFor(null, ['enter_show_home']);
  const w = step(s, 'hear_house_greeting');
  check(g, 'welcome_home: House complete foyer view', JSON.stringify(view(w).portrait) === JSON.stringify({ cast: 'house', id: 'house', view: 'house_of_tomorrow/foyer' }));
  check(g, 'House view survives save/restore', restoreSame(w));
  check(g, 'arrival and badge registration are Narrative B (no portrait)', view(R.prologue(story, null, 1)).portrait === null && view(s).portrait === null);
  const reception = Object.keys(story.chapters['prologue-00'].nodes).find((id) => story.chapters['prologue-00'].nodes[id].speaker === 'receptionist');
  const fake = JSON.parse(JSON.stringify(s)); fake.chapter = 'prologue-00'; fake.node = reception;
  check(g, 'receptionist stays layered (background + pose)', JSON.stringify(view(fake).portrait) === JSON.stringify({ cast: 'receptionist', id: 'receptionist', background: 'exposition/reception', pose: 'default' }));
}
{
  const g = 'exits';
  const clean = R.houseExit(story, 'clean', [...Array(400).keys()].find((k) => R.houseExit(story, 'clean', k + 1)) + 1);
  const reg = R.houseExit(story, 'registered', [...Array(400).keys()].find((k) => R.houseExit(story, 'registered', k + 1)) + 1);
  check(g, 'clean maintenance exit: neutral display (no RETURNS), not registered', clean.node === 'exit_service_clean' && !clean.flags.equipment_registered && art(clean) === 'house_of_tomorrow/utility_exit||');
  check(g, 'registered exit: RETURNS display over the equipment corridor', reg.node === 'exit_service_registered' && reg.flags.equipment_registered === true
    && art(reg) === 'house_of_tomorrow/utility_exit||returns_display', art(reg));
  check(g, 'both share the mechanical route flag: the overlay follows equipment_registered, not the route', clean.flags.house_exit_route === 'mechanical' && reg.flags.house_exit_route === 'mechanical');
  check(g, 'RETURNS survives save/restore', restoreSame(reg));
  check(g, 'no wristband inventory item', !reg.inventory.some((x) => /band|wrist|equipment/.test(x) && x !== 'rubber_band_ball'));
  const c2 = R.enterChapter2(story, reg);
  check(g, 'equipment_registered carries into Chapter 2', c2.chapter === 'chapter-02' && c2.flags.equipment_registered === true);
  const fatal = R.houseExit(story, 'chair_fatal', [...Array(400).keys()].find((k) => R.houseExit(story, 'chair_fatal', k + 1)) + 1);
  check(g, 'fatal chair: in-use chair scene, end node, BEGIN AGAIN only', fatal.node === 'exit_chair_fatal' && art(fatal) === 'house_of_tomorrow/chair||'
    && story.assets.scenes['house_of_tomorrow/chair'] === 'art/scenes/house_of_tomorrow/chair.png' && view(fatal).end === true
    && view(fatal).cards.map((c) => c.id).join() === 'restart_chair_death');
  ['plant', 'martin', 'showroom', 'clean', 'registered'].forEach((k) => {
    let exit = null;
    for (let seed = 1; seed <= 400 && !exit; seed++) exit = R.houseExit(story, k, seed);
    const into = exit && R.enterChapter2(story, exit);
    check(g, k + ': surviving exit hands off to Chapter 2 with flags, inventory and checks intact', into && into.chapter === 'chapter-02'
      && JSON.stringify(into.flags) === JSON.stringify(Object.assign({}, exit.flags, into.flags)) && JSON.stringify(into.inventory) === JSON.stringify(exit.inventory)
      && JSON.stringify(into.checks) === JSON.stringify(exit.checks));
  });
}
{
  const g = 'engine';
  // Mutants: the validator refuses broken art states, so a typo can never ship silently.
  const mut = (fn) => { const s = JSON.parse(JSON.stringify(story)); fn(s); return Rules.validateStory(s, null, { routeMarks: true, liveKeys: true }); };
  const has = (v, re) => !v.ok && v.errors.some((e) => re.test(e));
  check(g, 'mutant: two storage overlays that can show together are refused', has(mut((s) => { s.assets.sceneStates['house_of_tomorrow/storage'][1].if = { flag: 'house_stored_any' }; }), /select at once; at most one overlay/));
  check(g, 'mutant: a state that never shows is refused', has(mut((s) => { s.assets.sceneStates['house_of_tomorrow/utility_exit'][0].if = { flag: 'equipment_registered', notFlag: 'equipment_registered' }; }), /scene state never shown: house_of_tomorrow\/utility_exit#returns_display/));
  check(g, 'mutant: album pages that do not cover the text are refused', has(mut((s) => { s.assets.focus['house_of_tomorrow/portrait_gallery/album'].pages[2].paragraphs = 1; }), /text has 4 paragraphs; the pages .* pair 3/));
  check(g, 'mutant: a pose on an opaque-complete speaker is refused', has(mut((s) => { s.chapters['chapter-01'].nodes.welcome_home.pose = 'idle'; }), /opaque-complete portrait has no poses/));
  check(g, 'mutant: an unregistered complete view is refused', has(mut((s) => { s.chapters['chapter-01'].nodes.welcome_home.backdrop = 'house_of_tomorrow/dining'; }), /unregistered complete view/));
  check(g, 'mutant: an at selector outside its scene is refused', has(mut((s) => { s.assets.sceneStates['house_of_tomorrow/foyer'][0].at = ['chapter-01:storage_cabinet']; }), /is not in scene house_of_tomorrow\/foyer/));
  check(g, 'mutant: an unknown flag in a selection is refused', has(mut((s) => { s.assets.sceneStates['house_of_tomorrow/utility_exit'][0].if = { flag: 'equipment_registred' }; }), /unknown flag equipment_registred/));
}

const failed = results.filter((r) => !r.ok);
console.log('Chapter 1 art (provenance, registry, state selection): ' + (results.length - failed.length) + '/' + results.length + ' passed');
fs.writeFileSync(path.join(__dirname, 'ch01_art_results.json'), JSON.stringify({ passed: results.length - failed.length, total: results.length, results }, null, 1) + '\n');
if (failed.length) process.exitCode = 1;
