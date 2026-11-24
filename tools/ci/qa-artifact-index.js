#!/usr/bin/env node
// CI artifact index for the browser QA job (docs/100).
//
// The browser suites write small JSON results and about 300 MB of screenshots per run. CI keeps:
//   - the JSON results and this index on every run (qa-browsers-summary, 7 days);
//   - on a FAILED run, only the screenshot folders of the suites that failed
//     (qa-browsers-failure-screenshots, 1 day), staged here into qa-failure-screenshots/;
//   - on a manual visual-review run, every screenshot (qa-browsers-screenshots, 1 day).
// This script runs on every run and records what the job produced: every screenshot (name, size,
// SHA-256), every results file (pass / total, and whether this run wrote it), and the outcome of every
// QA step. A green run without uploaded screenshots still says exactly what existed.
//
// It never changes, deletes or regenerates QA output; it only reads it, copies the failed suites'
// PNGs into qa-failure-screenshots/ (ignored by git), and writes game/qa/ci_artifact_index_browsers.json
// (ignored by git) and a table on the run's summary page. It always exits 0 unless it crashes, and the
// job's result comes only from the QA steps. SUITES must match the browser steps of
// .github/workflows/qa.yml; tools/ci/check-qa-artifacts.js (content job) fails if they drift.
//
// Usage: node tools/ci/qa-artifact-index.js
//   env JOB_STATUS     job.status at the time of the step (success | failure | cancelled)
//   env VISUAL_REVIEW  'true' on a manual visual-review run
//   env STEP_OUTCOMES  toJSON(steps): { <step id>: { outcome, conclusion } }
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = 'game/qa/ci_artifact_index_browsers.json';
const STAGE = 'qa-failure-screenshots';

// One row per QA step of the browser job: its step id in qa.yml, the script it runs, and what it writes.
const SUITES = [
  { id: 'assets_browser', script: 'game/qa/validate_assets.js', results: ['game/qa/asset_results.json'], screenshots: [] },
  { id: 'story', script: 'game/qa/run_story_qa.js', results: ['game/qa/story_qa_results.json'], screenshots: ['game/qa/story_screenshots'] },
  { id: 'ch01_routes', script: 'game/qa/run_ch01_routes_qa.js', results: [], screenshots: ['game/qa/ch01_route_screenshots'] },
  { id: 'ch01_art', script: 'game/qa/run_ch01_art_qa.js', results: ['game/qa/ch01_art_qa_results.json'], screenshots: ['game/qa/ch01_art_screenshots'] },
  { id: 'end_presentation', script: 'game/qa/run_end_presentation_qa.js', results: ['game/qa/end_presentation_results.json'], screenshots: ['game/qa/end_presentation_screenshots'] },
  { id: 'death_controls', script: 'game/qa/run_death_controls_qa.js', results: ['game/qa/death_controls_qa_results.json'], screenshots: ['game/qa/death_controls_screenshots'] },
  { id: 'ch02_art', script: 'game/qa/run_ch02_art_qa.js', results: ['game/qa/ch02_art_qa_results.json'], screenshots: ['game/qa/ch02_art_screenshots'] },
  { id: 'ch02_routes', script: 'game/qa/run_ch02_routes_qa.js', results: ['game/qa/ch02_route_results_browser.json'], screenshots: ['game/qa/ch02_route_screenshots'] },
  { id: 'ch03', script: 'game/qa/run_ch03_qa.js', results: ['game/qa/ch03_qa_results.json'], screenshots: ['game/qa/ch03_screenshots'] },
  { id: 'presentation', script: 'game/qa/run_presentation_qa.js', results: ['game/qa/presentation_qa_results.json'], screenshots: ['game/qa/presentation_screenshots'] },
  { id: 'm2_reception', script: 'game/qa/run_qa.js', results: ['game/qa/qa_results.json'], screenshots: ['game/qa/screenshots'] },
  { id: 'polish_lab', script: 'tools/m2-reception-polish-lab/qa/run_qa.js', results: ['tools/m2-reception-polish-lab/qa/qa_results.json'], screenshots: ['tools/m2-reception-polish-lab/qa/screenshots'] },
  { id: 'layout_lab', script: 'tools/layout-lab/qa/run_qa.js', results: ['tools/layout-lab/qa/qa_results.json'], screenshots: ['tools/layout-lab/qa/screenshots'] }
];
const RESULTS = SUITES.flatMap(s => s.results);
const SCREENSHOTS = SUITES.flatMap(s => s.screenshots);

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

// Blob ids of the committed copies, to tell a rewritten file from an untouched one.
function committedBlobs() {
  const map = new Map();
  try {
    const out = execFileSync('git', ['ls-files', '-s', '--', ...RESULTS, ...SCREENSHOTS], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    for (const line of out.split('\n')) {
      const m = /^\d+ ([0-9a-f]+) \d+\t(.+)$/.exec(line);
      if (m) map.set(m[2], m[1]);
    }
  } catch (_) { /* not a git checkout: every file is reported as written this run */ }
  return map;
}
function gitBlob(file) {
  const data = fs.readFileSync(file);
  return crypto.createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
}
// A suite that writes the same result as the committed copy leaves identical bytes, so content alone
// cannot tell "rewritten" from "untouched". The checkout time can: the workflow file is written by the
// checkout, before any suite runs, so a file modified more than a second later was written by the job.
const CHECKOUT_MS = (() => { try { return fs.statSync(path.join(ROOT, '.github/workflows/qa.yml')).mtimeMs; } catch (_) { return 0; } })();
function origin(rel, abs, committed) {
  const blob = committed.get(rel);
  if (!blob) return 'written-this-run';
  if (gitBlob(abs) !== blob) return 'rewritten-this-run';
  return fs.statSync(abs).mtimeMs > CHECKOUT_MS + 1000 ? 'rewritten-identical' : 'untouched-committed-copy';
}

function main() {
  const committed = committedBlobs();
  let steps = {};
  try { steps = JSON.parse(process.env.STEP_OUTCOMES || '{}') || {}; } catch (_) { steps = {}; }
  const outcomeOf = id => (steps[id] && steps[id].outcome) || 'not-run';

  const results = RESULTS.map(rel => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return { path: rel, present: false };
    const entry = { path: rel, present: true, bytes: fs.statSync(abs).size, origin: origin(rel, abs, committed) };
    try {
      const j = JSON.parse(fs.readFileSync(abs, 'utf8'));
      for (const k of ['total', 'passed', 'failed']) if (typeof j[k] === 'number') entry[k] = j[k];
    } catch (_) { entry.parseError = true; }
    return entry;
  });
  const screenshots = SCREENSHOTS.map(rel => {
    const abs = path.join(ROOT, rel);
    const files = fs.existsSync(abs)
      ? fs.readdirSync(abs).filter(f => f.endsWith('.png')).sort().map(f => {
          const p = path.join(abs, f);
          return { name: f, bytes: fs.statSync(p).size, sha256: sha256(p), origin: origin(rel + '/' + f, p, committed) };
        })
      : [];
    return { dir: rel, count: files.length, bytes: files.reduce((s, f) => s + f.bytes, 0), files };
  });

  const status = process.env.JOB_STATUS || 'unknown';
  const visual = process.env.VISUAL_REVIEW === 'true';
  const suites = SUITES.map(s => ({ id: s.id, script: s.script, outcome: outcomeOf(s.id), screenshots: s.screenshots }));
  const failedSuites = suites.filter(s => s.outcome === 'failure');
  // Any failed step of the job, QA or not (e.g. the Playwright install), for the record.
  const failedSteps = Object.entries(steps).filter(([, v]) => v && v.outcome === 'failure').map(([k]) => k);

  // Stage the failed suites' screenshots for qa-browsers-failure-screenshots (failed runs only).
  const stageRoot = path.join(ROOT, STAGE);
  fs.rmSync(stageRoot, { recursive: true, force: true });
  let staged = 0, stagedBytes = 0;
  if (status === 'failure' && !visual) {
    for (const s of failedSuites) for (const rel of s.screenshots) {
      const d = screenshots.find(x => x.dir === rel);
      if (!d || !d.count) continue;
      fs.mkdirSync(path.join(stageRoot, rel), { recursive: true });
      for (const f of d.files) {
        fs.copyFileSync(path.join(ROOT, rel, f.name), path.join(stageRoot, rel, f.name));
        staged++; stagedBytes += f.bytes;
      }
    }
  }

  const upload = visual ? 'all screenshots (manual visual-review run)'
    : status === 'failure' ? (staged ? `screenshots of the failed suites only (${failedSuites.map(s => s.id).join(', ')})`
                                     : 'none: the failed steps write no screenshots (' + (failedSteps.join(', ') || 'unknown') + ')')
    : 'none: job passing and no visual review requested';
  const index = {
    schema: 'cyoa-ci-artifact-index-v2',
    job: 'browsers',
    sha: process.env.GITHUB_SHA || null,
    run: process.env.GITHUB_RUN_ID ? { id: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT || null } : null,
    jobStatusAtIndex: status,
    visualReview: visual,
    screenshotUpload: upload,
    failedSuites: failedSuites.map(s => s.id),
    failedSteps,
    staged: { files: staged, bytes: stagedBytes },
    totals: {
      results: results.filter(r => r.present).length,
      screenshots: screenshots.reduce((s, d) => s + d.count, 0),
      screenshotBytes: screenshots.reduce((s, d) => s + d.bytes, 0)
    },
    suites,
    results,
    screenshots
  };
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(index, null, 2) + '\n');

  const mb = n => (n / 1e6).toFixed(1) + ' MB';
  const lines = [
    '### QA artifacts',
    '',
    `Screenshots produced: **${index.totals.screenshots}** files, ${mb(index.totals.screenshotBytes)}. Uploaded: ${upload}` +
      (staged ? ` — ${staged} files, ${mb(stagedBytes)}, kept 1 day.` : visual ? ', kept 1 day.' : '.') +
      (visual ? '' : ' For every screenshot, re-run with **Run workflow → visual_review**.'),
    '',
    '| QA step | Outcome | Screenshot folder |', '|---|---|---|',
    ...suites.map(s => `| \`${s.id}\` | ${s.outcome} | ${s.screenshots.map(d => '`' + d + '`').join(' ')} |`),
    '',
    '| Results file | Origin | Passed / total |', '|---|---|---|',
    ...results.map(r => `| \`${r.path}\` | ${r.present ? r.origin : 'missing'} | ${r.total != null ? (r.passed != null ? r.passed : '?') + ' / ' + r.total : ''} |`),
    ''
  ];
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  console.log(`artifact index: ${index.totals.results} results files, ${index.totals.screenshots} screenshots (${mb(index.totals.screenshotBytes)}); ` +
    `failed suites: ${index.failedSuites.join(', ') || 'none'}; upload: ${upload}; staged ${staged} files (${mb(stagedBytes)}) -> ${OUT}`);
}

if (require.main === module) main();
module.exports = { SUITES, RESULTS, SCREENSHOTS, OUT, STAGE };
