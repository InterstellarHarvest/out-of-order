# Narrative Mode B — final behavior proof

**Static owner-review material only.** This follows the PMO request in
[doc 66 on `docs/story-gameplay-study-v01`](https://github.com/InterstellarHarvest/CYOA/blob/docs/story-gameplay-study-v01/docs/66_NARRATIVE_MODE_B_TEXT_FLOW_REVIEW_V01.md).
Candidate 1's existing overlay is read
unchanged (SHA-256
`0dca8af319f3c67ca4f382f365d4ab642ec5cced0f81031ca34e36d9efdd88f7`).
No production integration or artwork edit is included.

## Sequence 1 — paragraph continuation

The announcement is **24 wrapped prose lines** in one continuous source text.
It is divided after paragraph two, a natural pause. Each page has 12 prose
lines plus one blank separator, within the 16-line Narrative B reading area.

| Page | Native 1920×1080 proof | Choice state |
| --- | --- | --- |
| 1 | [CONTINUE only](long-01-continue-exact-shell.png) | One existing 1-line `CONTINUE` card at `x1324 y527`. No authored action choices appear yet. |
| 2 | [final passage and choices](long-02-final-choices-exact-shell.png) | Three existing 2-line action cards at `y527/639/751`. |

[Side-by-side page comparison](long-passage-comparison.png)

## Sequence 2 — B → A → B

| Turn | Native 1920×1080 proof | Presentation |
| --- | --- | --- |
| 1 | [hallway in Narrative B](focus-01-hallway-b-exact-shell.png) | Tall Candidate 1 panel; `Examine the keypad` is an action choice. |
| 2 | [keypad in Focus A](focus-02-keypad-a-exact-shell.png) | Existing portrait aperture and smaller speech panel; a **proof-only neutral keypad placeholder** occupies the image aperture. Object-specific actions include stepping back. |
| 3 | [fresh return in Narrative B](focus-03-return-b-exact-shell.png) | Candidate 1 returns with a new four-line passage and no accumulated log. |

[Three-frame focus comparison](focus-sequence-comparison.png)

## QA notes

- The shell is the exact committed `art/ui/shell/layout-final.png` (SHA-256
  `813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6`).
  All five native proofs are 1920×1080 RGBA. The scene remains a neutral matte.
- Narrative B text uses the existing dialogue face at `x1350 y77`, 522px wrap
  width, 26px leading. Both continuation pages use 13 of 16 available lines;
  the fresh return uses four. No text clips or shifts the choice area.
- Focus A uses the approved portrait aperture `x1333 y44 w564 h278` and the
  original speech panel below it. Its four-line description starts at
  `x1342 y360`, 540px wrap width, 24px leading. The B overlay is absent in A.
- Existing choice-card PNGs and the locked Choices bitmap atlas supply every
  card. Action wording is plain imperative; no `A:` marker, new font, card
  artwork, or narration scrollbar appears. The single CONTINUE occupies the
  normal choice area, and the existing choice track remains reserved.
- All frames have identical scene and footer pixels. The proof-only footer is
  copied from the current QA capture, which shows six runtime inventory slots;
  it does not revise the M1 seven-slot design lock. The Focus A keypad drawing
  is generated directly into its screenshot and is **not** a reusable art
  asset or proposed final object sprite.
- Rebuild checks the unchanged Candidate 1 overlay hash, line budgets, card
  line counts, native dimensions, and stable scene/footer regions. Run
  `python3 review/narrative-mode-b-final-behavior-proof/build_final_proof.py`
  from the repository root.

## Recommendation

Use **current passage only** for ordinary Narrative B turns. For an unusually
long authored passage, continue at a paragraph boundary with one `CONTINUE`
card; reveal decision cards only on the final page. An authored close-up choice
such as examining the keypad should enter Focus A, then return to B with a
fresh passage. This proof leaves earlier-page review, history access,
transition animation, and final keypad art open for owner decision.
