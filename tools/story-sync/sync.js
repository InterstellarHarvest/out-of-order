#!/usr/bin/env node
// Canonical storyboard -> game synchronisation (docs/97). The public InterstellarHarvest/CYOA-storyboard
// repository is the ONLY editable source of narrative, items, checks and art records. This game's
// story/ folder (except the game-owned runtime-settings.json) is a generated projection of one pinned
// public revision, recorded in story/canon.lock.json. Nothing here ever writes story data back.
//
//   node tools/story-sync/sync.js pull --rev <40-hex sha> [--from-git <public clone>] [--force]
//        Project the pinned public revision into story/: keep config.chapters only, strip the
//        storyboard-only fields named by the public story/sync-contract.json, keep the items those
//        chapters use, copy artwork + layout verbatim. Refuses if story/ was hand-edited (--force overrides).
//        Then run: node tools/story-import/import.js (preview build) and the QA suites.
//   node tools/story-sync/sync.js verify [--online] [--from-git <dir>]
//        Offline: story/ matches the lock byte for byte (no hand edits, no stray files) and the
//        contract's runtime field lists still equal the importer's. --online: re-project the pinned
//        revision from the public repository and compare.
//   node tools/story-sync/sync.js status [--rev <branch|sha>] [--from-git <dir>]
//        Drift report against the public storyboard (default main): new / changed / removed nodes,
//        items and art records; chapters published but not consumed. Informational (exit 0) unless
//        --fail-on-drift.
//   node tools/story-sync/sync.js report [--out <file>]
//        The integration report: the exact images the current build uses, with record keys + hashes.
//   node tools/story-sync/sync.js publish --storyboard <public worktree> [--allow-unpushed]
//        Integration verification: registers every image the build uses as `integrated` (or `reused`)
//        in the public storyboard through its tools/sync/register-art.mjs, with this commit as the
//        provenance, and writes its story/game-integration.json. Commit + push the public repo after
//        `node tools/sync/check-canon.mjs` passes there.
// Exit codes: 0 ok, 1 refused / drift / invalid, 2 usage or environment.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const LOCK = 'story/canon.lock.json';
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const json = (v) => JSON.stringify(v, null, 2) + '\n';
const git = (args, cwd) => execFileSync('git', args, { cwd: cwd || ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).trim();

// Source access ----------------------------------------------------------------------------------
function source(opts) {
  if (opts.fromGit) {
    const dir = path.resolve(opts.fromGit);
    return {
      describe: 'git ' + dir,
      resolve: async (rev) => git(['rev-parse', rev + '^{commit}'], dir),
      read: async (rev, p) => execFileSync('git', ['show', rev + ':' + p], { cwd: dir, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] })
    };
  }
  return {
    describe: 'https://github.com/' + CONFIG.repo,
    resolve: async (rev) => {
      if (/^[0-9a-f]{40}$/.test(rev)) return rev;
      const r = await fetch('https://api.github.com/repos/' + CONFIG.repo + '/commits/' + encodeURIComponent(rev), { headers: { accept: 'application/vnd.github.sha' } });
      if (!r.ok) throw Error('cannot resolve ' + rev + ' (HTTP ' + r.status + ')');
      return (await r.text()).trim();
    },
    read: async (rev, p) => {
      const r = await fetch('https://raw.githubusercontent.com/' + CONFIG.repo + '/' + rev + '/' + p);
      if (!r.ok) throw Error('cannot fetch ' + p + ' @ ' + rev.slice(0, 12) + ' (HTTP ' + r.status + ')');
      return Buffer.from(await r.arrayBuffer());
    }
  };
}

// The importer's own field lists, read from its source so the contract cannot silently diverge.
function importerFields() {
  const src = fs.readFileSync(path.join(ROOT, 'tools/story-import/convert.js'), 'utf8');
  const get = (name) => {
    const m = src.match(new RegExp('const ' + name + " = (\\[[^\\]]*\\]);"));
    if (!m) throw Error('convert.js: ' + name + ' not found');
    return JSON.parse(m[1].replace(/'/g, '"'));
  };
  return { manifest: get('MANIFEST_KEYS'), manifestChapter: get('MANIFEST_CHAPTER_KEYS'), chapter: get('CHAPTER_KEYS'), node: get('NODE_KEYS'),
    choice: get('CHOICE_KEYS'), entry: get('ENTRY_KEYS'), item: get('ITEM_KEYS') };
}
function contractProblems(contract) {
  const mine = importerFields(), out = [];
  for (const [level, list] of Object.entries(mine)) {
    const theirs = (contract.runtimeFields || {})[level] || [];
    const a = [...list].sort().join(','), b = [...theirs].sort().join(',');
    if (a !== b) out.push('sync-contract runtimeFields.' + level + ' [' + b + '] differs from the importer [' + a + ']');
  }
  return out;
}

// Projection: public revision -> game story/ files -------------------------------------------------
async function project(src, rev) {
  const read = async (p) => src.read(rev, p);
  const parse = async (p) => JSON.parse((await read(p)).toString('utf8'));
  const contract = await parse('story/sync-contract.json');
  const errors = contractProblems(contract);
  const manifestRaw = await read('story/storyboard-manifest.json');
  const manifest = JSON.parse(manifestRaw.toString('utf8'));
  const published = (manifest.chapters || []).map((c) => c.id);
  CONFIG.chapters.forEach((id) => { if (!published.includes(id)) errors.push('chapter ' + id + ' is not published at ' + rev.slice(0, 12)); });
  const files = {}; // story path -> { source, sourceSha256, bytes, stripped? }
  const rt = contract.runtimeFields, so = contract.storyboardOnlyFields;
  const keep = (level, obj, where, stripped) => {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (rt[level].includes(k)) out[k] = v;
      else if ((so[level] || []).includes(k)) stripped[level + '.' + k] = (stripped[level + '.' + k] || 0) + 1;
      else errors.push(where + ': field "' + k + '" is neither runtime nor storyboard-only in the sync contract');
    }
    return out;
  };
  const chapters = {};
  for (const entry of manifest.chapters.filter((c) => CONFIG.chapters.includes(c.id))) {
    const p = 'story/' + entry.file, raw = await read(p), ch = JSON.parse(raw.toString('utf8')), stripped = {};
    // A narrative-only chapter (public check-canon: development.notForGameplay must stay true until its
    // artwork and engine integration are complete) is never consumed, whatever config.json says.
    if (ch.development && ch.development.notForGameplay === true) errors.push(entry.id + ' is published as narrative only (development.notForGameplay) and cannot be consumed by a game build');
    const out = keep('chapter', ch, entry.id, stripped);
    out.nodes = {};
    for (const [nid, n] of Object.entries(ch.nodes)) {
      const node = keep('node', n, entry.id + ':' + nid, stripped);
      if (Array.isArray(node.choices)) node.choices = node.choices.map((c, i) => keep('choice', c, entry.id + ':' + nid + ' choice ' + (c.id || i), stripped));
      for (const verb of ['show', 'use']) if (node[verb]) node[verb] = Object.fromEntries(Object.entries(node[verb]).map(([item, e]) => [item, e && typeof e === 'object' ? keep('entry', e, entry.id + ':' + nid + ' ' + verb + ' ' + item, stripped) : e]));
      out.nodes[nid] = node;
    }
    chapters[entry.id] = out;
    files[p] = { source: p, sourceSha256: sha256(raw), bytes: Buffer.from(json(out)), stripped };
  }
  // Items: those the consumed chapters (or their kept items) mention, by exact id.
  const itemsPath = 'story/' + manifest.items, itemsRaw = await read(itemsPath), items = JSON.parse(itemsRaw.toString('utf8'));
  const tokens = new Set();
  const scan = (v) => { if (typeof v === 'string') tokens.add(v); else if (Array.isArray(v)) v.forEach(scan); else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { tokens.add(k); scan(x); }); };
  Object.values(chapters).forEach(scan);
  const kept = new Set();
  let grew = true;
  while (grew) { grew = false; for (const id of Object.keys(items)) if (!kept.has(id) && tokens.has(id)) { kept.add(id); scan(items[id]); grew = true; } }
  const outItems = {}, excludedItems = [];
  for (const [id, it] of Object.entries(items)) { if (kept.has(id)) outItems[id] = keep('item', it, 'item ' + id, {}); else excludedItems.push(id); }
  files[itemsPath] = { source: itemsPath, sourceSha256: sha256(itemsRaw), bytes: Buffer.from(json(outItems)) };
  const outManifest = { ...manifest, chapters: manifest.chapters.filter((c) => CONFIG.chapters.includes(c.id)) };
  files['story/storyboard-manifest.json'] = { source: 'story/storyboard-manifest.json', sourceSha256: sha256(manifestRaw), bytes: Buffer.from(json(outManifest)) };
  for (const p of ['story/' + manifest.artwork, 'story/' + manifest.layout]) { const raw = await read(p); files[p] = { source: p, sourceSha256: sha256(raw), bytes: raw }; }
  // Death popups (docs/98; public docs/104): the canonical engine export, validated and projected.
  let deaths = null, runtime = null;
  if (CONFIG.deathPresentations) {
    const exp = CONFIG.deathPresentations.export;
    let raw = null;
    try { raw = await read(exp); } catch (e) { errors.push(exp + ' is not published at ' + rev.slice(0, 12) + ' (public docs/104 requires it)'); }
    if (raw) {
      const pub = {};
      for (const c of manifest.chapters) pub[c.id] = JSON.parse((await read('story/' + c.file)).toString('utf8'));
      const art = JSON.parse(files['story/' + manifest.artwork].bytes.toString('utf8'));
      deaths = projectDeaths(raw, manifest, pub, art, chapters, errors);
      files[exp] = { source: exp, sourceSha256: sha256(raw), bytes: Buffer.from(json(deaths.projected)) };
      runtime = { path: CONFIG.deathPresentations.runtime, bytes: deathRuntime(files[exp].bytes, rev) };
    }
  }
  const lock = {
    schema: 'cyoa-story-canon-lock-v1',
    about: 'GENERATED by tools/story-sync/sync.js (docs/97). story/ except runtime-settings.json is a projection of the canonical public storyboard at `revision`. Never edit it here: change the public storyboard, then pull a new pinned revision.',
    repo: CONFIG.repo,
    revision: rev,
    chapters: CONFIG.chapters.slice(),
    notConsumed: { chapters: published.filter((id) => !CONFIG.chapters.includes(id)), items: excludedItems, ...(deaths ? { deathPresentations: deaths.excluded } : {}) },
    files: Object.fromEntries(Object.keys(files).sort().map((p) => [p, { source: files[p].source, sourceSha256: files[p].sourceSha256, sha256: sha256(files[p].bytes),
      ...(files[p].stripped && Object.keys(files[p].stripped).length ? { strippedStoryboardOnly: files[p].stripped } : {}) }])),
    ...(runtime ? { generated: { [runtime.path]: { from: CONFIG.deathPresentations.export, sha256: sha256(runtime.bytes) } } } : {})
  };
  return { errors, files, lock, runtime };
}

// Death popups ------------------------------------------------------------------------------------
// The public tools/storyboard/export-death-presentations.mjs, re-derived here so the pinned export
// is proved byte-exact against the chapters and artwork catalog of the same revision: a stale or
// hand-edited export, or a change to the exporter's rules, refuses the pull instead of drifting.
const DEATH_SCHEMA = 'cyoa-death-presentations-export-v1';
const SELECTED = ['approved', 'integrated', 'reused'];
const gitBlob = (buf) => crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');
function deriveDeathExport(manifest, pub, art) {
  const entries = [];
  for (const chap of manifest.chapters) {
    // Public tools/storyboard/export-death-presentations.mjs (storyboard 34a2607+): a chapter published
    // as narrative only (development.notForGameplay, e.g. Chapter 4) keeps its fatal briefs in the
    // story but stays out of the game export, before any of its popups is examined.
    if (pub[chap.id].development && pub[chap.id].development.notForGameplay === true) continue;
    for (const [nodeId, node] of Object.entries(pub[chap.id].nodes || {})) {
      if (!node.deathPopup) continue;
      if (node.end !== true) throw Error('Death popup on nonterminal node ' + chap.id + ':' + nodeId);
      const p = node.deathPopup, artRef = p.artRef, illustration = art.deathScreens && art.deathScreens[artRef];
      if (!artRef || !illustration) throw Error('Missing death-screen art catalog record ' + chap.id + ':' + nodeId);
      if (!p.title || !p.description || !p.subtitle) throw Error('Fatal popup needs title, subtitle, and narrative beat ' + chap.id + ':' + nodeId);
      if (illustration.dimensions !== '314x206') throw Error('Unexpected death-screen image size ' + artRef);
      if (node.endingArt !== artRef) throw Error('End-node art ref diverges from popup ' + chap.id + ':' + nodeId);
      const selected = illustration.assetPath || (illustration.selectedSource && illustration.selectedSource.path) || null;
      entries.push({
        id: chap.id + ':' + nodeId, when: { end: chap.id + ':' + nodeId }, title: p.title, subtitle: p.subtitle, body: [p.description], narrativeBeat: p.description,
        artwork: { id: artRef, status: illustration.status, dimensions: [314, 206], scale: 2, selectedPath: selected, generatedPath: illustration.assetPath || null,
          proposedPath: illustration.suggestedFilename || null, selectedSource: illustration.selectedSource || null },
        popupStatus: p.status,
        readyForGameplay: (SELECTED.includes(illustration.status) && p.status === 'owner-approved')
      });
    }
  }
  return { schema: DEATH_SCHEMA, source: 'InterstellarHarvest/CYOA-storyboard', authority: 'story/chapters/*.draft.json nodes[].deathPopup + story/artwork.draft.json deathScreens', entries };
}
function projectDeaths(raw, manifest, pub, art, consumed, errors) {
  const where = CONFIG.deathPresentations.export;
  let exp;
  try { exp = JSON.parse(raw.toString('utf8')); } catch (e) { errors.push(where + ': not valid JSON'); return { projected: { entries: [] }, excluded: [] }; }
  if (exp.schema !== DEATH_SCHEMA) errors.push(where + ': schema must be ' + DEATH_SCHEMA + ' (got ' + exp.schema + ')');
  if (exp.source !== CONFIG.repo) errors.push(where + ': source must be ' + CONFIG.repo + ' (got ' + exp.source + ')');
  try {
    if (json(deriveDeathExport(manifest, pub, art)) !== raw.toString('utf8')) errors.push(where + ' is stale or hand-edited: it is not the deterministic export of the chapters and artwork catalog of this revision');
  } catch (e) { errors.push(where + ' cannot be re-derived: ' + e.message); }
  const kept = [], excluded = [];
  for (const e of exp.entries || []) {
    const [chap, nodeId] = String(e.id).split(':');
    if (!CONFIG.chapters.includes(chap)) { excluded.push(e.id); continue; }
    const w = where + ' ' + e.id;
    const node = consumed[chap] && consumed[chap].nodes[nodeId];
    if (!e.when || e.when.end !== e.id || Object.keys(e.when).length !== 1) errors.push(w + ': when must be exactly { end: "' + e.id + '" }');
    if (!node || node.end !== true) errors.push(w + ': not an authored ending of a consumed chapter');
    if (typeof e.title !== 'string' || !e.title || typeof e.subtitle !== 'string' || !Array.isArray(e.body) || !e.body.length) errors.push(w + ': title, subtitle and body are required');
    const a = e.artwork || {};
    if (JSON.stringify(a.dimensions) !== '[314,206]' || a.scale !== 2) errors.push(w + ': death art must be 314x206 drawn at 2x');
    // Public docs/105: `approved` = selected, not yet integrated. An approved picture with no production
    // path yet is pending integration (e.g. the Chapter 2 deaths, approved 2026-11-17 before any Chapter 2
    // art integration): it is projected with no art, so the runtime draws the owner-accepted empty frame
    // (docs/99), exactly as for unselected art. Integrated / reused art, and any named path, stay strict.
    const pendingIntegration = a.status === 'approved' && !a.selectedPath;
    if (SELECTED.includes(a.status) && !pendingIntegration) {
      const src = a.selectedSource || {}, file = a.selectedPath && path.join(ROOT, a.selectedPath);
      if (!a.selectedPath || !/^art\/[a-z0-9_./-]+\.png$/.test(a.selectedPath)) errors.push(w + ': selected art needs a production path under art/');
      else if (!fs.existsSync(file)) errors.push(w + ': selected art ' + a.selectedPath + ' is not in this game');
      else {
        const buf = fs.readFileSync(file);
        if (sha256(buf) !== src.sha256) errors.push(w + ': ' + a.selectedPath + ' sha256 ' + sha256(buf).slice(0, 12) + ' differs from the selected source ' + String(src.sha256).slice(0, 12));
        if (src.gitBlob && gitBlob(buf) !== src.gitBlob) errors.push(w + ': ' + a.selectedPath + ' git blob differs from the selected source');
        if (buf.readUInt32BE(16) !== 314 || buf.readUInt32BE(20) !== 206) errors.push(w + ': ' + a.selectedPath + ' is not 314x206');
      }
    }
    kept.push(e);
  }
  return { projected: { ...exp, entries: kept }, excluded };
}
// The runtime module the game loads (file:// can not fetch JSON): the projected export, unchanged in
// meaning, plus where it came from. Only selected art is ever handed to the runtime.
function deathRuntime(exportBytes, revision) {
  const exp = JSON.parse(exportBytes.toString('utf8'));
  const entries = exp.entries.map((e) => ({
    id: e.id, when: e.when, title: e.title, subtitle: e.subtitle, body: e.body,
    popupStatus: e.popupStatus, readyForGameplay: e.readyForGameplay, artId: e.artwork.id, artStatus: e.artwork.status,
    art: SELECTED.includes(e.artwork.status) && e.artwork.selectedPath
      ? { path: e.artwork.selectedPath, sha256: e.artwork.selectedSource.sha256, size: e.artwork.dimensions, scale: e.artwork.scale } : null
  }));
  const data = { schema: 'cyoa-death-presentations-runtime-v1', storyboard: { repo: CONFIG.repo, revision }, export: { path: CONFIG.deathPresentations.export, sha256: sha256(exportBytes) }, entries };
  return Buffer.from('// GENERATED by tools/story-sync/sync.js (docs/98) from ' + CONFIG.deathPresentations.export + ', the canonical storyboard\n'
    + '// death-popup export at ' + revision + '. Do not edit: change the public storyboard and pull.\n'
    + '(function (root) {\n  var DATA = ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n  ') + ';\n'
    + "  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;\n  else root.CYOA_DEATH_PRESENTATIONS = DATA;\n})(this);\n");
}
// The generated runtime module against the local projected export and the lock.
function runtimeProblems(lock) {
  if (!CONFIG.deathPresentations) return [];
  const rp = CONFIG.deathPresentations.runtime, ep = path.join(ROOT, CONFIG.deathPresentations.export), out = [];
  if (!fs.existsSync(ep)) return [CONFIG.deathPresentations.export + ' is missing'];
  const want = deathRuntime(fs.readFileSync(ep), lock.revision);
  const f = path.join(ROOT, rp);
  if (!fs.existsSync(f)) out.push(rp + ' is missing');
  else if (!fs.readFileSync(f).equals(want)) out.push(rp + ' was edited by hand or is stale (regenerate with sync.js pull)');
  if (!lock.generated || !lock.generated[rp] || lock.generated[rp].sha256 !== sha256(want)) out.push(LOCK + ' does not record ' + rp);
  return out;
}

function readLock() {
  const f = path.join(ROOT, LOCK);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}
// Local story/ against the lock: hand edits and stray files.
function localProblems(lock) {
  const out = [];
  for (const [p, rec] of Object.entries(lock.files)) {
    const f = path.join(ROOT, p);
    if (!fs.existsSync(f)) out.push(p + ' is missing');
    else if (sha256(fs.readFileSync(f)) !== rec.sha256) out.push(p + ' was edited by hand (it no longer matches canonical revision ' + lock.revision.slice(0, 12) + ')');
  }
  const allowed = new Set([...Object.keys(lock.files), ...CONFIG.gameOwned, LOCK]);
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]));
  walk('story').filter((p) => !/\.DS_Store$/.test(p)).forEach((p) => { if (!allowed.has(p)) out.push(p + ' is not part of the canonical projection (story data belongs in the public storyboard)'); });
  return out;
}

async function cmdPull(opts) {
  if (!/^[0-9a-f]{40}$/.test(opts.rev || '')) { console.log('pull needs --rev <full 40-hex public storyboard commit> (a pinned revision, never a branch)'); return 2; }
  const lock = readLock();
  if (lock && !opts.force) {
    const p = localProblems(lock);
    if (p.length) { console.log('Refusing to pull over local story/ changes (edit the public storyboard instead, or pass --force):'); p.forEach((m) => console.log('  x ' + m)); return 1; }
  }
  const src = source(opts);
  const r = await project(src, opts.rev);
  if (r.errors.length) { console.log('Refusing: the pinned revision cannot be projected:'); r.errors.forEach((m) => console.log('  x ' + m)); return 1; }
  let changed = 0;
  for (const [p, f] of Object.entries(r.files)) {
    const dest = path.join(ROOT, p);
    const before = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
    if (!before || !before.equals(f.bytes)) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, f.bytes); changed++; console.log('  ~ ' + p); }
  }
  if (r.runtime) {
    const dest = path.join(ROOT, r.runtime.path);
    if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(r.runtime.bytes)) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, r.runtime.bytes); changed++; console.log('  ~ ' + r.runtime.path + ' (generated)'); }
  }
  fs.writeFileSync(path.join(ROOT, LOCK), json(r.lock));
  console.log('Pinned ' + CONFIG.repo + ' @ ' + opts.rev + ' (' + src.describe + '): ' + changed + ' file(s) changed; consumed ' + r.lock.chapters.join(', ')
    + (r.lock.notConsumed.chapters.length ? '; NOT consumed: ' + r.lock.notConsumed.chapters.join(', ') : ''));
  console.log('Next: node tools/story-import/import.js && the QA suites (docs/97 section 4).');
  return 0;
}

async function cmdVerify(opts) {
  const lock = readLock();
  if (!lock) { console.log('FAIL no ' + LOCK + ': story/ was never pulled from a pinned canonical revision'); return 1; }
  const problems = localProblems(lock).concat(runtimeProblems(lock));
  if (opts.online || opts.fromGit) {
    const r = await project(source(opts), lock.revision);
    problems.push(...r.errors);
    for (const [p, f] of Object.entries(r.files)) {
      const local = path.join(ROOT, p);
      if (!fs.existsSync(local) || !fs.readFileSync(local).equals(f.bytes)) problems.push(p + ' differs from the projection of ' + lock.revision.slice(0, 12));
    }
    if (r.runtime && (!fs.existsSync(path.join(ROOT, r.runtime.path)) || !fs.readFileSync(path.join(ROOT, r.runtime.path)).equals(r.runtime.bytes))) problems.push(r.runtime.path + ' differs from the projection of ' + lock.revision.slice(0, 12));
    if (json(r.lock) !== fs.readFileSync(path.join(ROOT, LOCK), 'utf8')) problems.push(LOCK + ' differs from the projection of ' + lock.revision.slice(0, 12));
  }
  problems.forEach((m) => console.log('  x ' + m));
  console.log((problems.length ? 'FAIL ' : 'OK ') + 'story/ = canonical ' + lock.repo + ' @ ' + lock.revision.slice(0, 12) + (opts.online || opts.fromGit ? ' (re-projected and compared)' : ' (lock hashes)'));
  return problems.length ? 1 : 0;
}

// Node / item / art-record level difference between two projections.
function diffProjection(localFiles, remoteFiles) {
  const lines = [];
  const parse = (b) => (b ? JSON.parse(b.toString('utf8')) : null);
  for (const p of [...new Set([...Object.keys(localFiles), ...Object.keys(remoteFiles)])].sort()) {
    const a = localFiles[p], b = remoteFiles[p];
    if (a && b && a.equals(b)) continue;
    const A = parse(a), B = parse(b);
    if (!A || !B) { lines.push((A ? '- ' : '+ ') + p); continue; }
    if (A.nodes || B.nodes) {
      const ids = new Set([...Object.keys(A.nodes || {}), ...Object.keys(B.nodes || {})]);
      ids.forEach((id) => { const x = JSON.stringify((A.nodes || {})[id]), y = JSON.stringify((B.nodes || {})[id]); if (x !== y) lines.push((x === undefined ? '+ ' : y === undefined ? '- ' : '~ ') + p + ' node ' + id); });
      if (JSON.stringify({ ...A, nodes: 0 }) !== JSON.stringify({ ...B, nodes: 0 })) lines.push('~ ' + p + ' chapter header');
    } else if (/artwork/.test(p)) {
      for (const g of new Set([...Object.keys(A), ...Object.keys(B)])) {
        if (JSON.stringify(A[g]) === JSON.stringify(B[g])) continue;
        if (!A[g] || !B[g] || typeof A[g] !== 'object') { lines.push('~ ' + p + ' ' + g); continue; }
        for (const id of new Set([...Object.keys(A[g]), ...Object.keys(B[g])])) {
          const x = A[g][id], y = B[g][id];
          if (JSON.stringify(x) === JSON.stringify(y)) continue;
          const st = (r) => (r && r.status) || '-';
          lines.push((x === undefined ? '+ ' : y === undefined ? '- ' : '~ ') + 'art ' + g + ':' + id + (st(x) !== st(y) ? ' (status ' + st(x) + ' -> ' + st(y) + ')' : ''));
        }
      }
    } else if (/layout/.test(p)) lines.push('~ ' + p + ' (viewer layout only)');
    else {
      for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) lines.push((A[k] === undefined ? '+ ' : B[k] === undefined ? '- ' : '~ ') + p + ' ' + k);
    }
  }
  return lines;
}

async function cmdStatus(opts) {
  const lock = readLock(), src = source(opts);
  const rev = await src.resolve(opts.rev || 'main');
  const r = await project(src, rev);
  const local = {}, remote = {};
  Object.keys(r.files).forEach((p) => { remote[p] = r.files[p].bytes; const f = path.join(ROOT, p); if (fs.existsSync(f)) local[p] = fs.readFileSync(f); });
  const lines = diffProjection(local, remote);
  console.log('Canonical ' + CONFIG.repo + ' ' + (opts.rev || 'main') + ' = ' + rev.slice(0, 12) + '; game pinned at ' + (lock ? lock.revision.slice(0, 12) : 'NOTHING'));
  r.errors.forEach((m) => console.log('  x ' + m));
  if (r.lock.notConsumed.chapters.length) console.log('  published but not consumed by this game (config.json): ' + r.lock.notConsumed.chapters.join(', '));
  if (!lines.length) console.log('  in sync: the projection of ' + rev.slice(0, 12) + ' is byte-identical to story/' + (lock && lock.revision !== rev ? ' (newer public commits change storyboard-only data only)' : ''));
  else { console.log('  DRIFT (' + lines.length + '): pull --rev ' + rev + ' to consume'); lines.forEach((l) => console.log('    ' + l)); }
  return (lines.length || r.errors.length) && opts.failOnDrift ? 1 : 0;
}

// Integration report ------------------------------------------------------------------------------
function artKeysByPath(art) {
  const m = new Map(), add = (key, p) => { if (p) { if (!m.has(p)) m.set(p, []); m.get(p).push(key); } };
  for (const [id, r] of Object.entries(art.scenes || {})) {
    add('scenes:' + id, r.assetPath);
    if (r.portraitBackground) add('scenes:' + id + '#portraitBackground', r.portraitBackground.assetPath);
    (r.states || []).forEach((s) => add('scenes:' + id + '#states:' + s.id, s.assetPath));
  }
  for (const [id, r] of Object.entries(art.portraits || {})) {
    add('portraits:' + id, r.assetPath);
    Object.entries(r.views || {}).forEach(([s, v]) => add('portraits:' + id + '#views:' + s, v.assetPath));
    (r.layers || []).forEach((l) => add('portraits:' + id + '#layers:' + l.role, l.path));
  }
  for (const [id, r] of Object.entries(art.items || {})) for (const v of Object.keys(r)) if (r[v] && typeof r[v] === 'object') add('items:' + id + '#' + v, r[v].assetPath);
  for (const [id, r] of Object.entries(art.focus || {})) { add('focus:' + id, r.assetPath); (r.pages || []).forEach((p, i) => add('focus:' + id + '#pages:' + (i + 1), p.assetPath)); }
  for (const [id, r] of Object.entries(art.deathScreens || {})) add('deathScreens:' + id, r.assetPath);
  // Pending-integration bindings (docs/104 section 3): an approved record whose canonical assetPath is
  // still null, bound by the game's own provenance to its suggestedFilename (the importer has already
  // proved the bytes against the record's approved SHA-256).
  for (const b of pendingBindings()) {
    const r = recordAt(art, b.key);
    if (r && r.assetPath === null && r.status === 'approved' && r.suggestedFilename === b.path) add(b.key, b.path);
  }
  return m;
}
function pendingBindings() {
  const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'story/runtime-settings.json'), 'utf8'));
  return (settings.pendingArtBindings || []).flatMap((f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')).images.map((i) => ({ key: i.key, path: i.path })));
}

// The record a key names (see the key grammar in the public tools/sync/lib.mjs).
function recordAt(art, key) {
  const group = key.slice(0, key.indexOf(':')), [id, variant] = key.slice(key.indexOf(':') + 1).split('#');
  const r = (art[group] || {})[id];
  if (!r || !variant) return r || null;
  const [kind, name] = variant.includes(':') ? [variant.slice(0, variant.indexOf(':')), variant.slice(variant.indexOf(':') + 1)] : [variant, null];
  if (name === null) return r[kind] || null;
  if (kind === 'states') return (r.states || []).find((s) => s.id === name) || null;
  if (kind === 'views') return (r.views || {})[name] || null;
  if (kind === 'pages') return (r.pages || [])[Number(name) - 1] || null;
  if (kind === 'layers') return (r.layers || []).find((l) => l.role === name) || null;
  return null;
}

function buildReport() {
  const lock = readLock();
  if (!lock) throw Error('no ' + LOCK);
  const { build } = require(path.join(ROOT, 'game/content/story.generated.js'));
  const art = JSON.parse(fs.readFileSync(path.join(ROOT, 'story/artwork.draft.json'), 'utf8'));
  const byPath = artKeysByPath(art), images = [], problems = [];
  const add = (p, kind, gate) => {
    const keys = byPath.get(p);
    if (!keys) { problems.push(p + ' is used by the game but no canonical art record names it'); return; }
    const hash = sha256(fs.readFileSync(path.join(ROOT, p)));
    keys.forEach((key) => images.push({ key, path: p, sha256: hash, kind, ...(gate ? { gate } : {}) }));
  };
  build.art.forEach((a) => add(a.path, a.kind));
  // Review-gated end presentations (docs/94, docs/96): real game code, off unless ?<gate>.
  const ep = path.join(ROOT, 'game/content/end-presentations.review.js');
  if (fs.existsSync(ep)) {
    // docs/98: the review file opts canonical entries in; their art comes from the canonical module.
    const data = require(ep);
    const canon = CONFIG.deathPresentations ? require(path.join(ROOT, CONFIG.deathPresentations.runtime)) : { entries: [] };
    if (!data || !Array.isArray(data.entries)) problems.push('game/content/end-presentations.review.js: no entries');
    else data.entries.forEach((r) => {
      const list = r.canonical === '*' ? canon.entries : canon.entries.filter((x) => x.id === r.canonical);
      if (!list.length) problems.push('end-presentations.review.js opts in ' + r.canonical + ', which the canonical death export does not have');
      list.forEach((c) => { if (c.art) add(c.art.path, 'death-screen', data.activation === 'always' ? null : data.gate); });
    });
  }
  const seen = new Set();
  const unique = images.filter((i) => (seen.has(i.key) ? false : seen.add(i.key))).sort((a, b) => (a.key < b.key ? -1 : 1));
  let branch = null, commit = null;
  try { commit = git(['rev-parse', 'HEAD']); branch = git(['rev-parse', '--abbrev-ref', 'HEAD']); } catch (e) { /* not a git checkout */ }
  return {
    problems,
    report: {
      schema: 'cyoa-game-integration-v1',
      about: 'Storyboard-only. Written by the game repository (tools/story-sync/sync.js publish): the exact images one game build uses. The public check requires every `integrated` art record to appear here with the same SHA-256.',
      game: { repo: CONFIG.gameRepo, branch, commit },
      storyboard: { repo: lock.repo, revision: lock.revision },
      build: { channel: build.channel, contentHash: build.contentHash, chapters: build.chapters.map((c) => c.id) },
      images: unique
    }
  };
}

function cmdReport(opts) {
  const { problems, report } = buildReport();
  problems.forEach((m) => console.log('  x ' + m));
  if (opts.out) fs.writeFileSync(path.resolve(opts.out), json(report)); else process.stdout.write(json(report));
  return problems.length ? 1 : 0;
}

function cmdPublish(opts) {
  if (!opts.storyboard) { console.log('publish needs --storyboard <public CYOA-storyboard worktree>'); return 2; }
  const sb = path.resolve(opts.storyboard), tool = path.join(sb, 'tools/sync/register-art.mjs');
  if (!fs.existsSync(tool)) { console.log('not a canonical storyboard worktree (no tools/sync/register-art.mjs): ' + sb); return 2; }
  const dirty = git(['status', '--porcelain', '--untracked-files=no']);
  if (dirty) { console.log('Refusing: commit the game build first (provenance must be a real commit):\n' + dirty); return 1; }
  const v = localProblems(readLock());
  if (v.length) { v.forEach((m) => console.log('  x ' + m)); return 1; }
  const { problems, report } = buildReport();
  if (problems.length) { problems.forEach((m) => console.log('  x ' + m)); return 1; }
  if (!opts.allowUnpushed) {
    const remote = git(['branch', '-r', '--contains', report.game.commit]);
    if (!remote) { console.log('Refusing: ' + report.game.commit.slice(0, 12) + ' is not on origin yet; push it first so the provenance resolves (or --allow-unpushed).'); return 1; }
  }
  // A record that is `reused` (approved art reused from elsewhere) stays reused; everything else the
  // build uses becomes `integrated`. A layer's status is its portrait's.
  const sbArt = JSON.parse(fs.readFileSync(path.join(sb, 'story/artwork.draft.json'), 'utf8'));
  const entries = report.images.map((i) => {
    const r = recordAt(sbArt, i.key), owner = /#layers:/.test(i.key) ? recordAt(sbArt, i.key.split('#')[0]) : r;
    return { key: i.key, file: path.join(ROOT, i.path), status: owner && owner.status === 'reused' ? 'reused' : 'integrated',
      source: { repo: CONFIG.gameRepo, ref: report.game.branch, commit: report.game.commit, path: i.path } };
  });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cyoa-publish-'));
  fs.writeFileSync(path.join(tmp, 'batch.json'), json({ entries }));
  fs.writeFileSync(path.join(tmp, 'game-integration.json'), json(report));
  try {
    const out = execFileSync(process.execPath, [tool, '--batch', path.join(tmp, 'batch.json'), '--integration', path.join(tmp, 'game-integration.json')], { cwd: sb, encoding: 'utf8' });
    process.stdout.write(out);
  } catch (e) { process.stdout.write((e.stdout || '') + (e.stderr || '')); return 1; }
  console.log('Published game ' + report.game.commit.slice(0, 12) + ' (' + report.images.length + ' image records) into ' + sb + '. Next there: node tools/sync/check-canon.mjs, then commit + push.');
  return 0;
}

async function main(argv) {
  const args = argv.slice(2), cmd = args[0];
  const val = (f) => { const i = args.indexOf(f); return i === -1 ? undefined : args[i + 1]; };
  const opts = { rev: val('--rev'), fromGit: val('--from-git'), out: val('--out'), storyboard: val('--storyboard'), force: args.includes('--force'),
    online: args.includes('--online'), failOnDrift: args.includes('--fail-on-drift'), allowUnpushed: args.includes('--allow-unpushed') };
  try {
    if (cmd === 'pull') return await cmdPull(opts);
    if (cmd === 'verify') return await cmdVerify(opts);
    if (cmd === 'status') return await cmdStatus(opts);
    if (cmd === 'report') return cmdReport(opts);
    if (cmd === 'publish') return cmdPublish(opts);
  } catch (e) { console.log('ERROR ' + e.message); return 2; }
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 28).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  return cmd ? 2 : 0;
}

module.exports = { project, diffProjection, artKeysByPath, importerFields, recordAt, deriveDeathExport, deathRuntime };
if (require.main === module) main(process.argv).then((code) => { process.exitCode = code; });
