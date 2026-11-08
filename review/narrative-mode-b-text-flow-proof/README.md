# Narrative Mode B — text-flow proof

**Review only.** This is a static comparison on
`agent/narrative-mode-b-art-study`, using the approved-for-review Candidate 1
overlay **unchanged** (SHA-256
`0dca8af319f3c67ca4f382f365d4ab642ec5cced0f81031ca34e36d9efdd88f7`).
The exact current `art/ui/shell/layout-final.png` is composited underneath.
No game runtime, M2 code, canonical shell, or choice sprite was edited.

## Turn sequence

| Turn | Action and result | Exact-shell proof | Comparison |
| --- | --- | --- | --- |
| 0 | Hallway observation; **Examine the keypad** is available | [shared initial view](turn-0-hallway-exact-shell.png) | Both approaches are identical here. |
| 1 | After selecting **Examine the keypad**; its display prints a queue number | [cumulative](turn-1-result-cumulative-exact-shell.png) · [current only](turn-1-result-current-exact-shell.png) | [side by side](compare-turn-1-result.png) |
| 2 | After selecting **Step away from the keypad and return to the hall** | [cumulative](turn-2-return-cumulative-exact-shell.png) · [current only](turn-2-return-current-exact-shell.png) | [side by side](compare-turn-2-return.png) |
| 3 | Long speaker notice after returning; overflow stress | [cumulative](turn-3-overflow-cumulative-exact-shell.png) · [current only](turn-3-overflow-current-exact-shell.png) | [side by side](compare-turn-3-overflow.png) |

All full frames are **1920×1080** composites. The scene is a neutral matte;
the unchanged footer comes from the current QA capture as context. That capture
shows six runtime inventory slots and does not revise the M1 seven-slot design
lock. Each turn uses the same three approved two-line choice-card sprites at
`x1324`, `y527/639/751`, the existing Choices bitmap atlas, plain imperative
action text, and the existing full-height choice thumb. No `A:` marker or new
font is used. Choice and footer pixels match between approaches at each turn.

## Text-flow comparison

The reading viewport shows sixteen complete 26-pixel lines at `x1350 y77`.
Only proof text is clipped; the Candidate 1 overlay contains no prose.
For this comparison, cumulative narration follows the newest lines while a
replacement passage begins at its first line. Those are proof assumptions,
not approved runtime behavior.

| State | Cumulative total | Current-passage total | Visible effect |
| --- | ---: | ---: | --- |
| Initial hallway | 5 lines | 5 lines | Same view. |
| Keypad result | 11 lines | 5 lines | Cumulative retains the initial observation above the result. |
| Return to hallway | 16 lines | 4 lines | Cumulative fills the panel but retains the complete observation; current only leaves room around the new passage. |
| Long notice | 34 lines | 17 lines | Cumulative follows the newest sixteen lines, losing the notice's opening from view; current only starts at the notice's beginning and leaves its final line below the viewport. Both need an overflow interaction. |

**Recommendation:** use **current passage only** as the default Narrative Mode B
reading behavior. It keeps each action/result legible and the panel intentional
at normal passage lengths. Restate any persistent fact needed for the next
decision in the new passage or objective, and keep history elsewhere if the
story requires it. Cumulative narration is useful for immediate context but
fills the panel after only this three-turn exchange; at the long-text stress
point auto-follow hides the start of the current notice while retaining much
older prose in scrollback. A long passage still needs an explicit internal
scroll or continuation design. These static images
do not approve either mechanism or a narration scrollbar.

Run `python3 review/narrative-mode-b-text-flow-proof/build_text_flow.py` from
the repository root to rebuild. The script checks the Candidate 1 overlay hash
and verifies that each paired proof has identical scene, choice, and footer
pixels.
