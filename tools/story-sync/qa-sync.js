#!/usr/bin/env node
// Self-test for tools/story-sync/sync.js (docs/97). Offline and dependency-free: it builds a
// throwaway "public storyboard" git repository from this game's own story/ files (plus a Chapter 3
// stub, storyboard-only annotations and a Chapter 3 item), and a minimal copy of the game tools, then
// proves the projection, the pinning, and every refusal. The real story/ is never touched.
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const { importerFields, deriveDeathExport } = require('./sync.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-story-sync-qa-'));
const PUB = path.join(tmp, 'public'), GAME = path.join(tmp, 'game');
const results = [];
const ok = (name) => results.push(name);
const git = (dir, ...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'qa', GIT_AUTHOR_EMAIL: 'qa@example.invalid', GIT_COMMITTER_NAME: 'qa', GIT_COMMITTER_EMAIL: 'qa@example.invalid' } }).trim();
const J = (dir, p) => JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8'));
const W = (dir, p, v) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), JSON.stringify(v, null, 2) + '\n'); };
function sync(...args) {
  try { return { code: 0, out: execFileSync(process.execPath, [path.join(GAME, 'tools/story-sync/sync.js'), ...args], { cwd: GAME, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr || '') }; }
}
function commit(msg) { git(PUB, 'add', '-A'); git(PUB, 'commit', '-q', '-m', msg); return git(PUB, 'rev-parse', 'HEAD'); }

try {
  // A public repository shaped like InterstellarHarvest/CYOA-storyboard.
  fs.mkdirSync(PUB, { recursive: true });
  git(PUB, 'init', '-q');
  for (const f of ['storyboard-manifest.json', 'items.draft.json', 'artwork.draft.json', 'storyboard-layout.json']) fs.cpSync(path.join(ROOT, 'story', f), path.join(PUB, 'story', f));
  fs.cpSync(path.join(ROOT, 'story/chapters'), path.join(PUB, 'story/chapters'), { recursive: true });
  const m = J(PUB, 'story/storyboard-manifest.json');
  m.chapters.push({ id: 'chapter-03', title: 'Chapter 3 — QA stub', file: 'chapters/chapter-03.draft.json', status: 'draft' });
  W(PUB, 'story/storyboard-manifest.json', m);
  W(PUB, 'story/chapters/chapter-03.draft.json', { title: 'QA stub', start: 'a', scene: 'pavilion/x', nodes: { a: { mode: 'narrative', text: 'Uses qa_pavilion_item.', choices: [], end: true, notes: 'n',
    deathPopup: { title: 'QA STUB.', subtitle: 'STUB', description: 'Stub death.', status: 'proposed', artRef: 'pavilion/a_model_citizen' }, endingArt: 'pavilion/a_model_citizen' } } });
  const items = J(PUB, 'story/items.draft.json');
  items.qa_pavilion_item = { name: 'QA PAVILION ITEM', description: 'Only Chapter 3 mentions it.', slotArt: null, inspectArt: null };
  W(PUB, 'story/items.draft.json', items);
  const ch2 = J(PUB, 'story/chapters/chapter-02.draft.json');
  const endId = Object.keys(ch2.nodes).find((id) => ch2.nodes[id].end);
  ch2.nodes[endId].storyboardNextChapter = 'chapter-03';
  ch2.nodes[endId].notes = 'STORYBOARD-ONLY handoff';
  W(PUB, 'story/chapters/chapter-02.draft.json', ch2);
  // Death popups (docs/98): put the storyboard-only deathPopup / endingArt back on the consumed
  // fatal nodes (the game's projection stripped them), then export exactly as the public tool does.
  const realExport = J(ROOT, 'story/death-presentations.export.json');
  for (const e of realExport.entries) {
    const [chap, nodeId] = e.id.split(':');
    const f = 'story/chapters/' + chap + '.draft.json', c = J(PUB, f);
    c.nodes[nodeId].deathPopup = { title: e.title, subtitle: e.subtitle, description: e.narrativeBeat, status: e.popupStatus, artRef: e.artwork.id };
    c.nodes[nodeId].endingArt = e.artwork.id;
    W(PUB, f, c);
  }
  const exportNow = () => {
    const man = J(PUB, 'story/storyboard-manifest.json'), pub = {};
    man.chapters.forEach((c) => { pub[c.id] = J(PUB, 'story/' + c.file); });
    W(PUB, 'story/death-presentations.export.json', deriveDeathExport(man, pub, J(PUB, 'story/artwork.draft.json')));
  };
  exportNow();
  const fields = importerFields();
  const contract = { schema: 'cyoa-storyboard-sync-contract-v1', requiredChapters: m.chapters.map((c) => c.id), runtimeFields: fields,
    storyboardOnlyFields: { node: ['notes', 'comment', 'position', 'layout', 'storyboardNextChapter', 'deathPopup', 'endingArt'], choice: ['notes', 'displayGroup', 'missingReason'], entry: ['notes'] } };
  W(PUB, 'story/sync-contract.json', contract);
  const A = commit('A');

  // A minimal game checkout: the sync tool, the importer's field lists and the game-owned settings.
  for (const p of ['tools/story-sync/sync.js', 'tools/story-sync/config.json', 'tools/story-import/convert.js', 'story/runtime-settings.json', 'art/deaths/rest_assured_voluntary.png']) fs.cpSync(path.join(ROOT, p), path.join(GAME, p));

  // 1. Pull a pinned revision.
  let r = sync('pull', '--rev', A, '--from-git', PUB);
  assert.equal(r.code, 0, r.out); ok('pull pinned revision');
  const lock = J(GAME, 'story/canon.lock.json');
  assert.equal(lock.revision, A);
  assert.deepEqual(lock.notConsumed.chapters, ['chapter-03']); ok('Chapter 3 not consumed (config.json)');
  assert.ok(lock.notConsumed.items.includes('qa_pavilion_item')); ok('Chapter-3-only item not consumed');
  assert.ok(!fs.existsSync(path.join(GAME, 'story/chapters/chapter-03.draft.json')));
  assert.equal(J(GAME, 'story/storyboard-manifest.json').chapters.some((c) => c.id === 'chapter-03'), false);
  const gameEnd = J(GAME, 'story/chapters/chapter-02.draft.json').nodes[endId];
  assert.equal(gameEnd.storyboardNextChapter, undefined); assert.equal(gameEnd.notes, undefined);
  assert.equal(JSON.stringify(gameEnd), JSON.stringify(J(ROOT, 'story/chapters/chapter-02.draft.json').nodes[endId])); ok('storyboard-only hand-off stripped; ending behaviour unchanged');
  for (const f of ['prologue-00', 'chapter-01', 'chapter-02']) assert.equal(fs.readFileSync(path.join(GAME, 'story/chapters', f + '.draft.json'), 'utf8'), fs.readFileSync(path.join(ROOT, 'story/chapters', f + '.draft.json'), 'utf8'), f);
  assert.equal(fs.readFileSync(path.join(GAME, 'story/items.draft.json'), 'utf8'), fs.readFileSync(path.join(ROOT, 'story/items.draft.json'), 'utf8'));
  ok('projection reproduces the real story/ byte for byte');
  assert.equal(fs.readFileSync(path.join(GAME, 'story/runtime-settings.json'), 'utf8'), fs.readFileSync(path.join(ROOT, 'story/runtime-settings.json'), 'utf8')); ok('game-owned runtime-settings untouched');

  // 2. Verify offline and against the source.
  r = sync('verify'); assert.equal(r.code, 0, r.out);
  r = sync('verify', '--from-git', PUB); assert.equal(r.code, 0, r.out); ok('verify offline + re-projected');

  // 2b. Death popups: projected for consumed chapters, compiled for the runtime (docs/98).
  assert.equal(fs.readFileSync(path.join(GAME, 'story/death-presentations.export.json'), 'utf8'), fs.readFileSync(path.join(ROOT, 'story/death-presentations.export.json'), 'utf8'));
  assert.ok(lock.notConsumed.deathPresentations.includes('chapter-03:a'));
  const rt = require(path.join(GAME, 'game/content/death-presentations.generated.js'));
  assert.equal(rt.storyboard.revision, A);
  assert.ok(!rt.entries.some((e) => /^chapter-03:/.test(e.id)) && rt.entries.filter((e) => e.art).map((e) => e.id).join() === 'chapter-01:exit_chair_fatal');
  ok('death export: consumed chapters only (Chapter 3 excluded), byte-identical to the real projection; runtime module pinned to the revision; only selected art handed over');
  const gfile = path.join(GAME, 'game/content/death-presentations.generated.js'), gorig = fs.readFileSync(gfile);
  fs.writeFileSync(gfile, gorig.toString().replace('PERMANENTLY SATISFIED.', 'PERMANENTLY SATISFIED!'));
  r = sync('verify'); assert.equal(r.code, 1); assert.match(r.out, /death-presentations\.generated\.js was edited by hand or is stale/); ok('verify catches a hand-edited runtime popup module');
  fs.writeFileSync(gfile, gorig);

  // 3. Hand edits are detected and block a pull; --force overrides.
  const f1 = path.join(GAME, 'story/chapters/chapter-01.draft.json'), orig = fs.readFileSync(f1);
  const c1 = JSON.parse(orig); c1.nodes[c1.start].text = 'LOCAL EDIT'; fs.writeFileSync(f1, JSON.stringify(c1, null, 2) + '\n');
  r = sync('verify'); assert.equal(r.code, 1); assert.match(r.out, /edited by hand/); ok('verify catches a hand edit');
  r = sync('pull', '--rev', A, '--from-git', PUB); assert.equal(r.code, 1); assert.match(r.out, /Refusing to pull over local story\/ changes/); ok('pull refuses to overwrite local edits');
  r = sync('pull', '--rev', A, '--from-git', PUB, '--force'); assert.equal(r.code, 0, r.out); assert.ok(fs.readFileSync(f1).equals(orig)); ok('--force restores canon');

  // 4. A stray chapter copied in by hand is rejected.
  fs.writeFileSync(path.join(GAME, 'story/chapters/chapter-03.draft.json'), '{}\n');
  r = sync('verify'); assert.equal(r.code, 1); assert.match(r.out, /not part of the canonical projection/); ok('stray local canon rejected');
  fs.rmSync(path.join(GAME, 'story/chapters/chapter-03.draft.json'));

  // 5. Branch names are not pins.
  r = sync('pull', '--rev', 'main', '--from-git', PUB); assert.equal(r.code, 2); ok('pull requires a full commit SHA');

  // 6. Drift report names the changed node; consuming it is an explicit pull.
  const c1p = J(PUB, 'story/chapters/chapter-01.draft.json'); c1p.nodes[c1p.start].text = 'NEW APPROVED PROSE'; W(PUB, 'story/chapters/chapter-01.draft.json', c1p);
  const art = J(PUB, 'story/artwork.draft.json'); const sid = Object.keys(art.scenes)[0]; art.scenes[sid].status = 'integrated'; W(PUB, 'story/artwork.draft.json', art);
  const B = commit('B');
  r = sync('status', '--rev', B, '--from-git', PUB); assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp('~ story/chapters/chapter-01.draft.json node ' + c1p.start));
  assert.match(r.out, /published but not consumed by this game.*chapter-03/); ok('status reports node + art drift and unconsumed chapters');
  r = sync('status', '--rev', B, '--from-git', PUB, '--fail-on-drift'); assert.equal(r.code, 1); ok('status --fail-on-drift');
  r = sync('verify', '--from-git', PUB); assert.equal(r.code, 0, r.out); ok('pinned build still verifies while public moves on');
  r = sync('pull', '--rev', B, '--from-git', PUB); assert.equal(r.code, 0, r.out);
  assert.equal(J(GAME, 'story/chapters/chapter-01.draft.json').nodes[c1p.start].text, 'NEW APPROVED PROSE'); ok('pull consumes the new revision');

  // 7. Storyboard-only metadata on public commits does not count as drift.
  W(PUB, 'story/game-integration.json', { schema: 'cyoa-game-integration-v1' });
  const C = commit('C');
  r = sync('status', '--rev', C, '--from-git', PUB); assert.match(r.out, /in sync/); ok('storyboard-only files are not drift');

  // 7b. Death export drift and provenance refuse the pull.
  const goodExport = fs.readFileSync(path.join(PUB, 'story/death-presentations.export.json'), 'utf8');
  fs.writeFileSync(path.join(PUB, 'story/death-presentations.export.json'), goodExport.replace('PERMANENTLY SATISFIED.', 'PERMANENTLY SATISFIED!'));
  const X1 = commit('X1 hand-edited export');
  r = sync('pull', '--rev', X1, '--from-git', PUB); assert.equal(r.code, 1); assert.match(r.out, /death-presentations\.export\.json is stale or hand-edited/); ok('a stale or hand-edited death export refuses the pull');
  const artGood = fs.readFileSync(path.join(PUB, 'story/artwork.draft.json'), 'utf8');
  const artBad = JSON.parse(artGood); artBad.deathScreens['house_of_tomorrow/rest_assured'].selectedSource.sha256 = '0'.repeat(64);
  W(PUB, 'story/artwork.draft.json', artBad); exportNow();
  const X2 = commit('X2 wrong provenance');
  r = sync('pull', '--rev', X2, '--from-git', PUB); assert.equal(r.code, 1); assert.match(r.out, /sha256 .* differs from the selected source/); ok('death art provenance must match the game file byte for byte');
  fs.writeFileSync(path.join(PUB, 'story/artwork.draft.json'), artGood); fs.rmSync(path.join(PUB, 'story/death-presentations.export.json'));
  const X3 = commit('X3 export missing');
  r = sync('pull', '--rev', X3, '--from-git', PUB); assert.equal(r.code, 1); assert.match(r.out, /death-presentations\.export\.json is not published/); ok('a missing death export refuses the pull');
  fs.writeFileSync(path.join(PUB, 'story/death-presentations.export.json'), goodExport);
  commit('X4 restored');

  // 8. An undeclared field refuses the pull (never silently dropped or imported).
  const c2 = J(PUB, 'story/chapters/chapter-02.draft.json'); c2.nodes[c2.start].directorComment = 'x'; W(PUB, 'story/chapters/chapter-02.draft.json', c2);
  const D = commit('D');
  r = sync('pull', '--rev', D, '--from-git', PUB); assert.equal(r.code, 1); assert.match(r.out, /directorComment.*neither runtime nor storyboard-only/); ok('undeclared field refused');

  // 9. Contract vs importer drift refuses the pull.
  delete c2.nodes[c2.start].directorComment; W(PUB, 'story/chapters/chapter-02.draft.json', c2);
  const k = J(PUB, 'story/sync-contract.json'); k.runtimeFields.node = k.runtimeFields.node.filter((x) => x !== 'scenePickup'); W(PUB, 'story/sync-contract.json', k);
  const E = commit('E');
  r = sync('pull', '--rev', E, '--from-git', PUB); assert.equal(r.code, 1); assert.match(r.out, /runtimeFields.node .* differs from the importer/); ok('contract/importer field drift refused');

  // 10. A consumed chapter disappearing upstream refuses the pull.
  const k2 = J(PUB, 'story/sync-contract.json'); k2.runtimeFields.node = fields.node; W(PUB, 'story/sync-contract.json', k2);
  const m2 = J(PUB, 'story/storyboard-manifest.json'); m2.chapters = m2.chapters.filter((c) => c.id !== 'chapter-02'); W(PUB, 'story/storyboard-manifest.json', m2);
  const F = commit('F');
  r = sync('pull', '--rev', F, '--from-git', PUB); assert.equal(r.code, 1); assert.match(r.out, /chapter chapter-02 is not published/); ok('missing consumed chapter refused');

  // 11. The integration report on the real build: every used image keyed, plus review-gated end art.
  const rep = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'tools/story-sync/sync.js'), 'report'], { cwd: ROOT, encoding: 'utf8' }));
  const { build } = require(path.join(ROOT, 'game/content/story.generated.js'));
  const paths = new Set(rep.images.map((i) => i.path));
  assert.ok(build.art.every((a) => paths.has(a.path)), 'every build image is reported');
  assert.ok(rep.images.every((i) => /^[a-zA-Z]+:/.test(i.key) && /^[0-9a-f]{64}$/.test(i.sha256)));
  assert.ok(rep.images.some((i) => i.gate === 'deathproof' && /^deathScreens:/.test(i.key)), 'review-gated death art is reported');
  ok('integration report covers every build image + gated end-presentation art');

  console.log(JSON.stringify({ result: 'PASS', checks: results.length, results }, null, 1));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
