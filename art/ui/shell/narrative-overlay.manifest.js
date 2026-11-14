// The Narrative B overlay: the one place the game, its tuning and its QA learn which image to draw
// and where narration goes on it (docs/84 section 4.2).
//
// STATUS: PROVISIONAL. Candidate 1 from agent/narrative-study-lab 7544c5d (with the x1919 fix),
// kept so the draft can be played (PMO gate 2026-11-14). Its visual design is not owner-final.
//
// To replace it, no game or narrative code changes:
//   1. put the new full-frame PNG (1920x1080, transparent outside the panel) in art/ui/shell/;
//   2. set `image` and `sha256` below (shasum -a 256 <file>), and `status`/`note`;
//   3. if its paper area differs, set `textBox` (the narration's left x, first-line top y, wrap
//      width, line spacing, and the lowest y text may reach, all in 1920x1080 stage pixels);
//   4. run the story browser QA (node game/qa/run_story_qa.js) and look at its screenshots.
window.CYOA_NARRATIVE_OVERLAY = {
  schema: 'cyoa-ui-art-v1',
  id: 'narrative_overlay',
  status: 'provisional',
  note: 'Candidate 1 (narrative-study-lab 7544c5d, x1919 fix); not owner-final',
  image: 'narrative-overlay.png',
  sha256: 'ebc7ccd00f4e5575673ad5e404f31453985ef24d34a64662166ab4370c65514c',
  width: 1920,
  height: 1080,
  textBox: { x: 1350, y: 77, width: 522, lineHeight: 26, safeBottom: 513, bottomMargin: 20 }
};
