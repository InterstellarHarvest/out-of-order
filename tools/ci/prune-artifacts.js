#!/usr/bin/env node
// Historical GitHub Actions artifact cleanup for InterstellarHarvest/CYOA (docs/100 section 5).
//
// DRY RUN BY DEFAULT. It deletes nothing unless --apply is given, and the owner authorises each class
// separately. Input is the dated inventory (docs/100_ci_artifact_inventory_20261117.tsv); only rows of
// the requested class are considered, and every row is re-checked LIVE before it is touched:
//   - the artifact still exists, with the same name and size as in the inventory;
//   - its commit is not the head of PR #16, of main, or (for --class SAFE) of any open pull request
//     at the moment of the run (a branch that moved back onto an old commit is protected again).
// Rows that fail a check are skipped and reported, never deleted.
//
// Usage (needs the GitHub CLI, logged in with repo scope):
//   node tools/ci/prune-artifacts.js --class SAFE                 # dry run: what would be deleted
//   node tools/ci/prune-artifacts.js --class SAFE --apply         # delete those, after owner approval
//   node tools/ci/prune-artifacts.js --class OWNER --ids 1,2,3    # dry run for chosen OWNER rows only
// The KEEP class can never be deleted by this script.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = 'InterstellarHarvest/CYOA';
const INVENTORY = path.resolve(__dirname, '..', '..', 'docs', '100_ci_artifact_inventory_20261117.tsv');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const cls = opt('--class');
const apply = args.includes('--apply');
const only = opt('--ids') ? new Set(opt('--ids').split(',').map(s => s.trim())) : null;
if (!['SAFE', 'OWNER'].includes(cls)) { console.error('usage: --class SAFE|OWNER [--ids a,b,c] [--apply]   (KEEP is never deleted)'); process.exit(2); }
if (cls === 'OWNER' && !only) { console.error('--class OWNER needs an explicit --ids list chosen by the owner'); process.exit(2); }

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const rows = fs.readFileSync(INVENTORY, 'utf8').trim().split('\n').slice(1).map(l => {
  const [klass, id, name, mb, created, expires, branch, sha] = l.split('\t');
  return { klass, id, name, mb: Number(mb), created, branch, sha };
}).filter(r => r.klass === cls && (!only || only.has(r.id)));
if (only) for (const id of only) if (!rows.some(r => r.id === id)) console.log(`skip ${id}: not a ${cls} row of the inventory`);

const openHeads = new Map(JSON.parse(gh('pr', 'list', '-R', REPO, '--state', 'open', '--limit', '200', '--json', 'number,headRefOid'))
  .map(p => [p.headRefOid.slice(0, 7), p.number]));
const mainHead = gh('api', `repos/${REPO}/commits/main`, '--jq', '.sha').trim().slice(0, 7);

let n = 0, bytes = 0;
for (const r of rows) {
  let live;
  try { live = JSON.parse(gh('api', `repos/${REPO}/actions/artifacts/${r.id}`)); }
  catch (_) { console.log(`skip ${r.id} ${r.name}: no longer exists`); continue; }
  const why = [];
  if (live.name !== r.name) why.push(`name is now ${live.name}`);
  if (Math.abs(live.size_in_bytes / 1e6 - r.mb) > 0.1) why.push(`size is now ${(live.size_in_bytes / 1e6).toFixed(1)} MB`);
  const sha = (live.workflow_run && live.workflow_run.head_sha || '').slice(0, 7);
  if (sha === mainHead) why.push('commit is the head of main');
  if (openHeads.get(sha) === 16) why.push('commit is the head of PR #16');
  else if (cls === 'SAFE' && openHeads.has(sha)) why.push(`commit is now the head of open PR #${openHeads.get(sha)}`);
  if (live.expired) why.push('already expired');
  if (why.length) { console.log(`skip ${r.id} ${r.name}: ${why.join('; ')}`); continue; }
  console.log(`${apply ? 'DELETE' : 'would delete'} ${r.id} ${r.name} ${r.mb} MB ${r.branch} ${r.sha} (${r.created})`);
  if (apply) gh('api', '-X', 'DELETE', `repos/${REPO}/actions/artifacts/${r.id}`);
  n++; bytes += live.size_in_bytes;
}
console.log(`${apply ? 'deleted' : 'dry run: would delete'} ${n} artifact(s), ${(bytes / 1e6).toFixed(1)} MB${apply ? '' : '  (add --apply to delete, after owner authorisation)'}`);
