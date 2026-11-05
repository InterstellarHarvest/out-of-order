# CYOA M1 — Sprite Preflight QA 01 (owner-final intake)

**Date:** 2026-10-31  
**Branch:** `review/m1-ui-shell-v2`  
**Status:** Approved-binary intake **PASS**; replacement art **NOT YET OWNER-APPROVED**.

## Authority and binary intake
The owner-final source and locked component ZIP were installed at commit `59b62c34c63c13eb69502cc1a886015e28c7dbf2`.

| Binary | SHA-256 | Result |
|---|---|---|
| `layout-final.png` | `813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6` | PASS |
| `review/m1-ui-shell-v2/CYOA_M1_locked_components_v1.zip` | `58c71b660f87a83400c80d0e75c2037af67827b00e2f4918cff794500050f302` | PASS |

The shell was measured directly in GitHub Actions: **1920×1080, RGBA**; transparent **1,162,132**; opaque **879,691**; partially transparent **31,777**. There were no changes to the original source PNG.

## First QA run and resolved verifier typo
The first script check reported **15/16** locked component matches because the older preflight script contained an incomplete SHA-256 for `choice_2line_b.png`; the SHA was missing its final `a`. The actual ZIP member matched the original authoritative `design/ui_locked_component_contract_v1.json` identity. The verifier was corrected in commit `c902ca76`; **no binary was changed**.

## Baseline assembly
Final GitHub Actions evidence: [M1 sprite intake and baseline assembly](https://github.com/InterstellarHarvest/CYOA/actions/runs/41260703240).

Automated results:
- All **16/16** owner-locked component hashes: PASS.
- All **12** choice-card shapes and 548px width: PASS.
- All choice sprites have transparent exterior corners: PASS.
- One inventory sprite at **96×96**: PASS.
- Three 108px cards + two 12px gaps = **348px**: PASS.
- Seven 96px slots + six 6px gaps = **708px**: PASS.
- No source binaries modified: PASS.

Evidence contains `audit.json`, `qa_intake_report.json`, and three full 1920×1080 assembly screenshots (three standard 2-line choices, five mixed choices at top, five choices scrolled). These are **sprite fit proofs** with no baked dynamic labels, not gameplay-final screenshots.

## Production rulings
1. **REUSE** all 12 approved A/B/C choice cards at original hashes. Do not redraw as a default response.
2. **REUSE** the approved single 96×96 inventory slot. Retain 7 visible, pitch 102px.
3. Inventory arrows and all three utility buttons are explicitly reopened for new art, in UP and DOWN only. Any study remains an unapproved review candidate until owner checks the physical press and style.
4. Scrollbar track is fixed in shell. Only three-part tan/gold thumb is dynamic.
5. NPC speech and objective wording are dynamic; use the included, hash-locked atlas. No browser font substitution for a production candidate.

## Remaining visual QA / owner approval
- Visually compare candidate arrow UP and DOWN in the final shell; full button must flatten/recess while preserving material and proportions.
- Compare the three utility siblings for restrained mismatched micro-fasteners; no pre-baked text.
- Review three-part scrollbar thumb in overflow and full-track states.
- Exercise bitmap glyph wrapping and speech click-to-complete in a runtime lab before promoting art.
- Keep `layout-final.png` immutable and do not merge this review branch as a production runtime release.

## Git records
- `review/m1-ui-shell-v2/preflight/assemble_approved.py` — original approved sprite compositor.
- `.github/workflows/m1-sprite-preflight.yml` — reproducible GitHub Actions validation and evidence upload.
- `review/m1-ui-shell-v2/preflight/verify.py` — exact SHA and geometry checks.

All visual examples and sprite studies must report their source, changes, preserved elements, QA/rejections, and explicit approval scope.
