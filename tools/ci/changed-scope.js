#!/usr/bin/env node
// Which expensive QA a change needs (docs/105). Used by .github/workflows/qa.yml on pull requests and
// pushes; runnable locally the same way.
//
//   node tools/ci/changed-scope.js <base-sha> [<head-sha>]
//
// Prints `story_import=true|false` and `browser_full=true|false`, and appends them to
// $GITHUB_OUTPUT when set. The story-import
// acceptance suite (game/qa/validate_story_import.js, ~15-19 min: every case re-walks every reachable
// state) runs when the change can affect the importer or what it imports. When the base cannot be
// resolved (first push, force-push, shallow history), both gates are `true`: unknown means run it.
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');

// A changed path matching any of these needs the story-import acceptance suite.
const STORY_IMPORT = [
  /^tools\/story-import\//,          // the importer itself
  /^game\/js\/rules\.js$/,            // the rules it validates with (reachability, charset, schema)
  /^story\//,                         // the imported canon, the lock and the game-owned settings
  /^art\/[^/]+\.provenance\.json$/,  // pending art bindings are build sources (docs/104 section 3)
  /^art\/ui\/sprites\/fonts\//,       // the locked face's charset
  /^tools\/layout-lab\/data\/fonts\.json$/, // the baked faces' charset
  /^game\/qa\/validate_story_import\.js$/,
  /^game\/qa\/fixtures\/story-import\//,
  /^\.github\/workflows\/qa\.yml$/,   // a QA change always runs the whole QA it changes
  /^tools\/ci\//
];

// Full Chromium + Firefox browser regression is automatic for non-draft PRs changing game behavior,
// artwork, playable canon, the labs, or the QA gates themselves. Routine infrastructure changes only
// get the quick content checks. Version-tag releases and manual full runs are handled in qa.yml.
const BROWSER_FULL = [
  /^game\//,
  /^art\//,
  /^story\//,
  /^tools\/(?:story-import|story-sync|glyph-ink|layout-lab|m2-reception-polish-lab)\//,
  /^tools\/ci\//,
  /^\.github\/workflows\/qa\.yml$/
];

function scope(files) {
  return {
    story_import: files.some((f) => STORY_IMPORT.some((re) => re.test(f))),
    browser_full: files.some((f) => BROWSER_FULL.some((re) => re.test(f)))
  };
}

function main(argv) {
  const [base, head = 'HEAD'] = argv.slice(2);
  let files = null;
  if (base && !/^0+$/.test(base)) {
    try { files = execFileSync('git', ['diff', '--name-only', base + '...' + head], { encoding: 'utf8' }).split('\n').filter(Boolean); } catch (e) { files = null; }
  }
  const out = files ? scope(files) : { story_import: true, browser_full: true };
  const lines = Object.entries(out).map(([k, v]) => k + '=' + v);
  console.log((files ? files.length + ' changed file(s) since ' + base.slice(0, 12) : 'base unknown: run everything') + '\n' + lines.join('\n'));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + '\n');
}

if (require.main === module) main(process.argv);
module.exports = { scope, STORY_IMPORT, BROWSER_FULL };
