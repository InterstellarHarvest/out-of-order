#!/usr/bin/env node
// CI artifact index for the browser QA job (docs/100).
//
// The browser suites write small JSON results and several hundred MB of screenshots per run. CI now
// keeps the JSON results on every run (7 days) and uploads the screenshots only when the job fails
// or a manual visual-review run asks for them (1 day). This script records, on EVERY run, what the
// job produced, so a green run without uploaded screenshots still says exactly which screenshots
// existed (name, size, SHA-256) and whether each results file was rewritten by this run or is the
// committed copy left untouched (a suite that did not run).
//
// It only reads; it never changes, deletes or regenerates QA output. It writes one file,
// game/qa/ci_artifact_index_browsers.json (ignored by git), and a short table to the job summary
// when GITHUB_STEP_SUMMARY is set. The path lists below must match the upload steps in
// .github/workflows/qa.yml; tools/ci/check-qa-artifacts.js (run by the content job) fails if they drift.
//
// Usage: node tools/ci/qa-artifact-index.js
//   env JOB_STATUS     job.status at the time of the step (success | failure | cancelled)
//   env VISUAL_REVIEW  'true' when this is a manual visual-review run
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = 'game/qa/ci_artifact_index_browsers.json';

// Small JSON results (uploaded on every run as qa-browsers-summary).
const RESULTS = [
  'game/qa/asset_results.json',
  'game/qa/story_qa_results.json',
  'game/qa/ch01_art_qa_results.json',
  'game/qa/end_presentation_results.json',
  'game/qa/death_controls_qa_results.json',
  'game/qa/ch02_route_results_browser.json',
  'game/qa/qa_results.json',
  'tools/m2-reception-polish-lab/qa/qa_results.json',
  'tools/layout-lab/qa/qa_results.json'
];
// Screenshot folders (PNG only; uploaded as qa-browsers-screenshots on failure or visual review).
const SCREENSHOTS = [
  'game/qa/screenshots',
  'game/qa/story_screenshots',
  'game/qa/ch01_route_screenshots',
  'game/qa/ch01_art_screenshots',
  'game/qa/end_presentation_screenshots',
  'game/qa/death_controls_screenshots',
  'game/qa/ch02_route_screenshots',
  'tools/m2-reception-polish-lab/qa/screenshots',
  'tools/layout-lab/qa/screenshots'
];

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
  } catch (_) { /* not a git checkout: every file is reported as untracked */ }
  return map;
}
function gitBlob(file) {
  const data = fs.readFileSync(file);
  return crypto.createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
}
function origin(rel, abs, committed) {
  const blob = committed.get(rel);
  if (!blob) return 'written-this-run';
  return gitBlob(abs) === blob ? 'same-as-committed' : 'rewritten-this-run';
}

function main() {
  const committed = committedBlobs();
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
  const uploaded = status === 'failure' || visual;
  const index = {
    schema: 'cyoa-ci-artifact-index-v1',
    job: 'browsers',
    sha: process.env.GITHUB_SHA || null,
    run: process.env.GITHUB_RUN_ID ? { id: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT || null } : null,
    jobStatusAtIndex: status,
    visualReview: visual,
    screenshotsUploaded: uploaded,
    screenshotsReason: visual ? 'manual visual-review run' : status === 'failure' ? 'job failed' : 'not uploaded: job passing and no visual review requested',
    totals: {
      results: results.filter(r => r.present).length,
      screenshots: screenshots.reduce((s, d) => s + d.count, 0),
      screenshotBytes: screenshots.reduce((s, d) => s + d.bytes, 0)
    },
    results,
    screenshots
  };
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(index, null, 2) + '\n');

  const mb = n => (n / 1e6).toFixed(1) + ' MB';
  const lines = [
    '### QA artifacts',
    '',
    `Screenshots: **${index.totals.screenshots}** files, ${mb(index.totals.screenshotBytes)} — ` +
      (uploaded ? `uploaded as \`qa-browsers-screenshots\` (${index.screenshotsReason}, kept 1 day).`
                : 'not uploaded (job passing). Re-run with **Run workflow → visual_review** to keep them for 1 day.'),
    '',
    '| Results file | Origin | Passed / total |', '|---|---|---|',
    ...results.map(r => `| \`${r.path}\` | ${r.present ? r.origin : 'missing'} | ${r.total != null ? (r.passed != null ? r.passed : '?') + ' / ' + r.total : ''} |`),
    '',
    '| Screenshot folder | Files | Size |', '|---|---|---|',
    ...screenshots.map(d => `| \`${d.dir}\` | ${d.count} | ${mb(d.bytes)} |`),
    ''
  ];
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  console.log(`artifact index: ${index.totals.results} results files, ${index.totals.screenshots} screenshots (${mb(index.totals.screenshotBytes)}); screenshots ${uploaded ? 'UPLOADED' : 'not uploaded'} (${index.screenshotsReason}) -> ${OUT}`);
}

if (require.main === module) main();
module.exports = { RESULTS, SCREENSHOTS, OUT };
