#!/usr/bin/env node
// Story importer: storyboard JSON (story/) -> game/content/story.generated.js (docs/84).
//
//   node tools/story-import/import.js --check      A. validate only: full report, writes nothing
//   node tools/story-import/import.js              B. preview build (drafts allowed) -> generated file
//   node tools/story-import/import.js --promote    C. approved build: no drafts, no missing art, only
//                                                     story/ + the generated file may differ from HEAD
//   node tools/story-import/import.js --verify     is the generated file up to date with story/?
//
// Options: --from <dir> reads another folder laid out like story/ (e.g. a fresh export) with --check;
// --out <file> writes elsewhere (tests); --quiet prints only the verdict; --verbose lists unapproved art.
// Exit code 0 = ok, 1 = invalid content or stale output, 2 = usage / environment error.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { convert } = require('./convert');

const ROOT = path.resolve(__dirname, '../..');
const Rules = require(path.join(ROOT, 'game/js/rules.js'));
const DEFAULT_FROM = path.join(ROOT, 'story');
const DEFAULT_OUT = path.join(ROOT, 'game/content/story.generated.js');
const BUILD_SCHEMA = 'cyoa-story-build-v1';
const IMPORTER_VERSION = 1;
// Native sizes per art kind (docs/54, docs/72 section 4.1).
// scene-replace / scene-overlay: a scene state (docs/92 section 3) is a whole 314x206 scene, an
// overlay sharing its origin; portrait-view: an opaque-complete conversation view (docs/92 section 1).
const ART_SIZE = { scene: [314, 206], 'scene-replace': [314, 206], 'scene-overlay': [314, 206], 'portrait-pose': [564, 278], 'portrait-background': [564, 278],
  'portrait-view': [564, 278], focus: [564, 278], 'item-slot': [96, 96], 'item-inspect': [565, 451], 'scene-state': [314, 206] };

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const gitBlob = (buf) => crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');

// Keys sorted at every level: the content hash depends only on content, never on authoring order.
function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

function readJson(file, label) {
  let text;
  try { text = fs.readFileSync(file); } catch (e) { return { error: label + ': cannot read ' + file }; }
  try { return { json: JSON.parse(text.toString('utf8')), bytes: text }; } catch (e) { return { error: label + ': not valid JSON (' + e.message + ')' }; }
}

function pngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

// Reads the export folder: the manifest names every other file.
function readSources(fromDir) {
  const errors = [];
  const sources = []; // { path (repo-relative or absolute), bytes }
  const rel = (f) => (f.startsWith(ROOT + path.sep) ? path.relative(ROOT, f) : f).split(path.sep).join('/');
  const load = (file, label) => {
    const r = readJson(file, label);
    if (r.error) { errors.push(r.error); return null; }
    sources.push({ path: rel(file), bytes: r.bytes });
    return r.json;
  };
  const manifest = load(path.join(fromDir, 'storyboard-manifest.json'), 'manifest');
  let settingsFile = path.join(fromDir, 'runtime-settings.json');
  if (!fs.existsSync(settingsFile)) settingsFile = path.join(DEFAULT_FROM, 'runtime-settings.json');
  const settings = load(settingsFile, 'runtime-settings');
  const chapters = {};
  let items = null;
  let artwork = null;
  if (manifest) {
    (Array.isArray(manifest.chapters) ? manifest.chapters : []).forEach((c) => {
      if (c && typeof c.file === 'string' && typeof c.id === 'string') chapters[c.id] = load(path.join(fromDir, c.file), 'chapter ' + c.id);
    });
    if (typeof manifest.items === 'string') items = load(path.join(fromDir, manifest.items), 'items');
    else errors.push('manifest: items must name the items file');
    if (typeof manifest.artwork === 'string') artwork = load(path.join(fromDir, manifest.artwork), 'artwork');
    else errors.push('manifest: artwork must name the artwork file');
  }
  sources.sort((a, b) => (a.path < b.path ? -1 : 1));
  return { errors, sources, input: { manifest, settings, chapters, items, artwork } };
}

// The whole build, in memory: { ok, text, report }.
function build(opts) {
  const o = Object.assign({ from: DEFAULT_FROM, mode: 'preview' }, opts || {});
  const report = { mode: o.mode, errors: [], warnings: [], info: [], draftStops: [], artPending: [], stats: null, art: [], contentHash: null, version: null };
  const src = readSources(o.from);
  report.errors.push(...src.errors);
  if (src.errors.length) return { ok: false, text: null, report };

  const c = convert(src.input, { mode: o.mode });
  report.errors.push(...c.errors);
  report.warnings.push(...c.warnings);
  report.info.push(...c.info);
  report.draftStops = c.draftStops;
  report.artPending = c.artPending || [];
  if (!c.story) return { ok: false, text: null, report };
  const story = c.story;

  // Content revision: the hash of the story itself (version excluded), so identical content always
  // gives the identical revision, and any content change gives a new one (saves then go through
  // Rules.migrate). version is that hash as a whole number, as the v2 schema requires.
  const body = Object.assign({}, story);
  delete body.version;
  const contentHash = sha256(canonical(body));
  story.version = parseInt(contentHash.slice(0, 7), 16) + 1;
  report.contentHash = contentHash;
  report.version = story.version;

  // Rules validation: shape, then every reachable state (Rules.validateStory, docs/74 section 3).
  const charset = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'art/ui/sprites/fonts/locked_pixel_font_atlas.json'))).mapping);
  if (!c.errors.length) {
    const v = Rules.validateStory(story, charset, { routeMarks: true, liveKeys: true });
    // The schema requires every variant list to end with an unconditional fallback. When the
    // conditions above it already cover every reachable case, that fallback can never show: report
    // it, but do not block on it (every other never-shown variant is still an error).
    const fallback = (e) => {
      let m = /^description variant never seen: ([a-z0-9_]+)\[(\d+)\]$/.exec(e);
      if (m) { const d = story.items[m[1]] && story.items[m[1]].description; return Array.isArray(d) && +m[2] === d.length - 1 && !d[d.length - 1].if; }
      m = /^(text|objective) of ([^:]+):([a-z0-9_-]+) variant (\d+) never shown$/.exec(e);
      if (m) { const n = story.chapters[m[2]] && story.chapters[m[2]].nodes[m[3]]; const f = n && n[m[1]]; return Array.isArray(f) && +m[4] === f.length - 1 && !f[f.length - 1].if; }
      return false;
    };
    v.errors.forEach((e) => (fallback(e) ? report.warnings.push('rules: unreachable fallback (allowed): ' + e) : report.errors.push('rules: ' + e)));
    report.stats = v.stats || null;
  }

  // Art files: exist, are PNGs of their class's native size; recorded with status and hash.
  const seen = {};
  c.art.forEach((a) => {
    const key = a.kind + ' ' + a.id;
    if (seen[key]) return;
    seen[key] = true;
    const file = path.join(ROOT, a.path);
    const entry = { kind: a.kind, id: a.id, path: a.path, status: a.status };
    if (!fs.existsSync(file)) {
      const msg = a.kind + ' ' + a.id + ': art file missing: ' + a.path;
      if (o.mode === 'approved') report.errors.push(msg); else report.errors.push(msg + ' (fix the path or the file; a missing file is never a placeholder)');
    } else {
      const buf = fs.readFileSync(file);
      const size = pngSize(buf);
      const want = ART_SIZE[a.kind];
      if (!size) report.errors.push(a.kind + ' ' + a.id + ': not a PNG: ' + a.path);
      else if (want && (size[0] !== want[0] || size[1] !== want[1])) report.errors.push(a.kind + ' ' + a.id + ': ' + a.path + ' is ' + size.join('x') + ', must be ' + want.join('x'));
      entry.sha256 = sha256(buf);
    }
    report.art.push(entry);
  });
  report.art.sort((x, y) => (x.kind + x.id < y.kind + y.id ? -1 : 1));
  // Installed art bound to no authored view (a scene state with selection null): never in the
  // story, but its file must still exist at its class's size.
  (c.artUnbound || []).forEach((a) => {
    const file = path.join(ROOT, a.path);
    if (!fs.existsSync(file)) return report.errors.push(a.kind + ' ' + a.id + ': art file missing: ' + a.path);
    const size = pngSize(fs.readFileSync(file));
    const want = ART_SIZE[a.kind];
    if (!size || size[0] !== want[0] || size[1] !== want[1]) report.errors.push(a.kind + ' ' + a.id + ': ' + a.path + ' is ' + (size ? size.join('x') : 'not a PNG') + ', must be ' + want.join('x'));
  });

  const ok = !report.errors.length;
  if (!ok) return { ok, text: null, report };

  const meta = {
    schema: BUILD_SCHEMA,
    importer: IMPORTER_VERSION,
    channel: o.mode,
    story: story.id,
    storySchema: story.schema,
    contentHash,
    version: story.version,
    sources: src.sources.map((s) => ({ path: s.path, sha256: sha256(s.bytes), gitBlob: gitBlob(s.bytes) })),
    // The manifest's own chapter titles and statuses, for the draft stamp (docs/84 section 4.1).
    chapters: src.input.manifest.chapters.map((ch) => ({ id: ch.id, title: ch.title, status: ch.status })),
    draftStops: c.draftStops,
    art: report.art,
    stats: report.stats
  };
  const text = '// GENERATED by tools/story-import/import.js from story/ (docs/84). Do not edit: change the\n'
    + '// storyboard JSON and run `node tools/story-import/import.js` again.\n'
    + '(function (root) {\n'
    + '  var BUILD = ' + JSON.stringify(meta, null, 2).replace(/\n/g, '\n  ') + ';\n'
    + '  var STORY = ' + JSON.stringify(story, null, 2).replace(/\n/g, '\n  ') + ';\n'
    + "  if (typeof module !== 'undefined' && module.exports) module.exports = { build: BUILD, story: STORY };\n"
    + '  else { root.CYOA_STORY_BUILD = BUILD; root.CYOA_STORY = STORY; }\n'
    + '})(this);\n';
  return { ok, text, report, story, meta };
}

// Is `out` exactly what the sources build now (in the channel it was built for)?
function verify(opts) {
  const o = Object.assign({ from: DEFAULT_FROM, out: DEFAULT_OUT }, opts || {});
  if (!fs.existsSync(o.out)) return { ok: false, why: 'no generated file at ' + o.out };
  const current = fs.readFileSync(o.out, 'utf8');
  const m = /"channel": "(preview|approved)"/.exec(current);
  const b = build({ from: o.from, mode: m ? m[1] : 'preview' });
  if (!b.ok) return { ok: false, why: 'the sources do not build: ' + b.report.errors.slice(0, 3).join(' | '), report: b.report };
  if (b.text !== current) return { ok: false, why: 'STALE: ' + path.relative(ROOT, o.out) + ' does not match story/ (run node tools/story-import/import.js)', report: b.report };
  return { ok: true, why: 'up to date (' + b.meta.channel + ', content ' + b.meta.contentHash.slice(0, 12) + ')', report: b.report };
}

function printReport(r, quiet, verbose) {
  const line = (s) => console.log(s);
  if (!quiet) {
    line('Story import (' + r.mode + ')');
    if (r.stats) line('  ' + r.stats.chapters + ' chapter(s), ' + r.stats.nodes + ' nodes, ' + r.stats.choices + ' choices, ' + r.stats.reachableStates + ' reachable states, ' + r.stats.endingsReached + ' ending(s) reached, ' + r.stats.checks + ' dice check(s)');
    if (r.contentHash) line('  content ' + r.contentHash.slice(0, 12) + ' (version ' + r.version + ')');
    const byStatus = {};
    r.art.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
    if (r.art.length) line('  art: ' + r.art.length + ' images (' + Object.keys(byStatus).sort().map((k) => byStatus[k] + ' ' + k).join(', ') + ')');
    if (r.artPending.length) line('  art not yet approved (' + r.artPending.length + ', reported only; art approval is a separate owner gate): see --verbose');
    if (r.draftStops.length) line('  DRAFT STOPS (unfinished, shown as "DRAFT ENDS HERE"): ' + r.draftStops.join(', '));
    if (verbose && r.artPending.length) { line('  art not yet approved:'); r.artPending.forEach((s) => line('    ~ ' + s)); }
    if (r.info.length) { line('  notes (' + r.info.length + '):'); r.info.forEach((s) => line('    - ' + s)); }
    if (r.warnings.length) { line('  WARNINGS (' + r.warnings.length + '):'); r.warnings.forEach((s) => line('    ! ' + s)); }
  }
  if (r.errors.length) { line('  ERRORS (' + r.errors.length + '):'); r.errors.forEach((s) => line('    x ' + s)); }
}

function main(argv) {
  const args = argv.slice(2);
  const flag = (f) => args.indexOf(f) !== -1;
  const val = (f) => { const i = args.indexOf(f); return i === -1 ? undefined : args[i + 1]; };
  const known = ['--check', '--promote', '--verify', '--from', '--out', '--quiet', '--verbose', '--help'];
  const unknown = args.filter((a, i) => a.startsWith('--') && known.indexOf(a) === -1 && !(i > 0 && ['--from', '--out'].indexOf(args[i - 1]) !== -1));
  if (flag('--help') || unknown.length) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 13).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return unknown.length ? 2 : 0;
  }
  const from = val('--from') ? path.resolve(val('--from')) : DEFAULT_FROM;
  const out = val('--out') ? path.resolve(val('--out')) : DEFAULT_OUT;
  const quiet = flag('--quiet');

  if (flag('--verify')) {
    const v = verify({ from, out });
    console.log((v.ok ? 'OK ' : 'FAIL ') + v.why);
    return v.ok ? 0 : 1;
  }
  const mode = flag('--promote') ? 'approved' : 'preview';
  if (flag('--promote') && from === DEFAULT_FROM) {
    // Content promotion never carries engine, UI or art changes along with it.
    let dirty = [];
    try {
      dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
        .map((l) => l.slice(3)).filter((f) => !/^story\//.test(f) && f !== 'game/content/story.generated.js');
    } catch (e) { console.log('git is needed for --promote'); return 2; }
    if (dirty.length) {
      console.log('Refusing to promote: these files outside story/ are changed. Commit or set them aside first, so the');
      console.log('content commit carries only story/ and game/content/story.generated.js:');
      dirty.forEach((f) => console.log('  ' + f));
      return 1;
    }
  }
  const b = build({ from, mode });
  printReport(b.report, quiet, flag('--verbose'));
  if (!b.ok) { console.log('RESULT: INVALID - nothing was written.'); return 1; }
  if (flag('--check')) { console.log('RESULT: VALID (' + mode + ') - check only, nothing was written.'); return 0; }
  const before = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
  if (before !== b.text) fs.writeFileSync(out, b.text);
  console.log('RESULT: ' + (before === b.text ? 'UNCHANGED ' : 'WROTE ') + path.relative(ROOT, out) + ' (' + mode + ', content ' + b.meta.contentHash.slice(0, 12) + ')');
  if (mode === 'approved') {
    const tag = b.meta.story + '-' + b.meta.contentHash.slice(0, 8);
    console.log('\nNext (normal Git review; nothing was committed):');
    console.log('  git switch -c content/' + tag);
    console.log('  git add story game/content/story.generated.js');
    console.log('  git commit -m "Content: ' + b.meta.story + ' ' + b.meta.contentHash.slice(0, 12) + '"');
    console.log('  git push -u origin content/' + tag + '   # then open a pull request for review');
  }
  return 0;
}

module.exports = { build, verify, canonical, ROOT, DEFAULT_OUT };
if (require.main === module) process.exitCode = main(process.argv);
