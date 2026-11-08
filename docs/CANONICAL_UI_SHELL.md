# Canonical UI shell (living record)

This page names the one authoritative UI frame. Update it whenever the shell bytes change. Keep the
history table: older hashes remain valid provenance for the commits and review evidence made with them.

## Current

| Field | Value |
| --- | --- |
| Runtime path | `art/ui/shell/layout-final.png` |
| Size / mode | 1920 × 1080, RGBA, 8-bit |
| SHA-256 | `79c891e1875b0a6f6cb2006cc2bffded5dbff1a762fd3d91f5ff0806febb9625` |
| Git blob | `bd28ac18b210de2a0d1b79bdbef82dc89f865766` |
| Alpha census | 1,162,132 transparent · 879,691 opaque · 31,777 partial |
| Since | 2026-11-08, owner top-frame pixel fix |

The runtime file is a byte-for-byte copy of the owner's Photoshop export. Nothing re-encodes, resizes,
quantizes or normalizes it. The PNG carries the owner's `pHYs` (72 dpi) and XMP `iTXt` chunks. It has no
`gAMA`, `sRGB` or `iCCP` chunk, so browsers draw it without colour conversion, as before.

## Source and provenance

- The owner's master is `art/source/layout-final.png`, next to `art/source/layout final.psd`. It stays
  local only: `.gitignore` excludes `source/` under the rule that originals and masters never go into git.
  The committed runtime file is the recoverable copy of those exact bytes. A dated safety copy is kept
  outside the repository, at `~/CYOA-owner-source-backups/2026-11-08/layout-final.owner-corrected.png`.
- To change the frame, edit the master and copy the bytes over `art/ui/shell/layout-final.png`. Then run
  `python3 tools/layout-lab/scripts/measure_shell.py` and `python3 tools/layout-lab/scripts/build_lab_data.py`,
  repin the hash in the QA scripts listed below, and add a row to the history table.

## 2026-11-08 change: owner top-frame fix

Compared with the previous shell (`813e0884…`), 2,376 pixels changed. All of them are opaque in both
files, and all of them lie in the top frame bar above the portrait window: x 1325–1897, y 25–47.
The alpha channel is byte-identical, and `measure_shell.py` reproduces every measured region exactly:
scene, portrait, speech, choice panel and track, objective, inventory and utility bays.

| Area (x, y inclusive) | Pixels |
| --- | --- |
| 1357–1462, 26–44 (grille plate) | 1,463 |
| 1866–1888, 25–44 (right corner screw) | 249 |
| 1605–1629, 28–44 (centre bracket) | 233 |
| 1826–1863, 28–33 (rivet row) | 204 |
| 1631–1640, 30–36 | 63 |
| 1325–1331, 37–47 (left corner) | 62 |
| 1779–1784, 30–37 (rod end) | 43 |
| 1890–1897, 28–35 | 34 |
| 1818–1822, 28–33 | 25 |

Two kinds of saved data stay compatible. Placement-lab saves made against the previous shell still open,
because `tools/layout-lab/js/core.js` lists it in `PREVIOUS_SHELLS`. The game QA also checks that the
shell regions and the alpha census still equal those at the M2 start.

## Hash pins (update together)

- `game/qa/run_qa.js` (`SHELL_SHA256`)
- `tools/layout-lab/qa/run_qa.js` (`SHELL_BLOB`, `SHELL_SHA256`)
- `tools/layout-lab/data/measured_shell_regions.json`, `lab_data.js` and `snapshot_assets.js` (generated)
- `tools/layout-lab/data/placement.default.json` and `qa/fixtures/placement.qa_baseline.json` (`shell`)
- On branches that have them: `tools/m2-reception-polish-lab/qa/run_qa.js`, and
  `review/narrative-mode-b-art-study/build_review.py` (`SHELL_SHA`)

`design/m1_sprite_manifest.json`, `design/ui_component_geometry_proposed_v2.json`, docs 36–43 and the
later dated docs still record `813e0884…`/`1849c8ec…`. Those records describe the frame used at the time,
so they are left unchanged.

## History

| From | SHA-256 | Git blob | Note |
| --- | --- | --- | --- |
| 2026-11-08 | `79c891e1875b0a6f6cb2006cc2bffded5dbff1a762fd3d91f5ff0806febb9625` | `bd28ac18b210de2a0d1b79bdbef82dc89f865766` | Owner top-frame pixel fix (current) |
| M1 (docs/36) | `813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6` | `1849c8ec192cd639dd8550de0dcdda1aa88d2e4f` | Owner-final M1 shell |
