// GAME-OWNED REVIEW CONFIGURATION for ending presentations (docs/94, docs/96, docs/98). Read by
// js/end-presentation.js, which is generic: it knows no chapter, node, choice, art path or prose.
//
// What the popup SAYS and SHOWS is not here. Title, subtitle, narrative, artwork and the ending it
// belongs to come from the canonical storyboard: content/death-presentations.generated.js, compiled
// by tools/story-sync/sync.js from the pinned public story/death-presentations.export.json (public
// docs/104). This file only opts canonical entries into the review build and holds what the game
// owns: the gate, the approved A1 geometry and palette, the RETRY / CHECKPOINT / EXIT controls,
// the review notice, the frozen-backdrop effect and the typography fallbacks of the game's faces.
//
// An opted-in entry opens at its canonical ending whatever the cause (owner ruling, public docs/104:
// the voluntary Rest Assured treatment, the failed stapler escape and the failed bare-handed escape
// share ONE popup and ONE approved illustration). The real cause (Rules.endCause: choice, check,
// outcome) is still what RETRY and CHECKPOINT restore from (docs/96). An entry whose canonical art
// is not selected never opens (no unproduced art is ever displayed).
//
// Owner status: the VISUAL DESIGN is locked (docs/93). The canonical copy is a DRAFT
// (popupStatus approved-art-copy-draft, readyForGameplay false): the whole facility stays OFF unless
// the page is opened with ?<gate> (here ?deathproof); ordinary play keeps the authored ending and its
// BEGIN AGAIN card exactly as before. Control labels, positions and destinations are locked by the
// owner rulings on PR #11 (2026-11-16).
(function (root) {
  'use strict';
  var DATA = {
    schema: 'cyoa-end-presentations-review-v2',
    gate: 'deathproof',
    entries: [{
      // The canonical death-popup entry this presentation renders (its `when`, copy and art).
      canonical: 'chapter-01:exit_chair_fatal',
      status: 'review-proof',
      controls: [
        { label: 'RETRY', action: 'retry', unavailable: 'RETRY UNAVAILABLE - NO SAVED STATE BEFORE THIS DECISION' },
        { label: 'CHECKPOINT', action: 'checkpoint', unavailable: 'CHECKPOINT UNAVAILABLE - NO CHAPTER-ENTRY SNAPSHOT' },
        { label: 'EXIT', action: null, unavailable: 'EXIT LEADS TO THE MAIN MENU, WHICH DOES NOT EXIST YET' }
      ],
      notice: 'REVIEW BUILD - RETRY AND CHECKPOINT ARE LIVE - EXIT AWAITS THE MAIN MENU - ESC CLOSES',
      // The frozen backdrop: the real game frame in hard blocks, each RGB channel multiplied.
      backdrop: { block: 10, multiply: 0.35 },
      // The approved A1 composition at canonical 1920x1080 stage coordinates (the study's lab
      // geometry with its approved -85px offset applied: popup 280,135 1360x640, centre y=455).
      // The canonical subtitle opens the text column, above the narrative (docs/98 section 3).
      layout: {
        popup: [280, 135, 1360, 640], shadow: 12,
        title: { y: 167, role: 'labels', scale: 1 },
        artFrame: [304, 197, 644, 428], artMat: [308, 201, 636, 420], art: [312, 205],
        subtitle: { role: 'labels', scale: 1, lineStep: 30, gap: 22 },
        body: { x: 972, y: 257, width: 604, lineStep: 44, paragraphGap: 18, role: 'dialogue', scale: 2, bottom: 615 },
        separator: [328, 639, 1264],
        controls: { x: 570, y: 669, w: 240, h: 62, step: 270, shadow: 4, labelY: 22, role: 'labels', scale: 1 },
        notice: { x: 280, y: 86, role: 'labels', scale: 1 }
      },
      palette: {
        shadow: '#101e22', edge: '#19393e', bevel: '#abc3b9', light: '#f9f0d9', face: '#e8dfc6', lowerBorder: '#ab9e85',
        artFrame: '#24484a', artMat: '#f6edd5', separator: '#b4aa92', separatorLight: '#f9f0d9',
        controlShadow: '#9d927d', controlEdge: '#244348', controlFace: '#bacdc0', controlHighlight: '#f4efda',
        ink: '#233a3b', inkUnavailable: '#7d9189', noticePlate: '#0e1b20', noticeInk: '#f1d898'
      }
    }],
    // Typography: characters the game's bitmap faces do not carry, drawn as the listed fallback.
    // Only these; any other missing glyph is still an error. The canonical text is kept unchanged in
    // the data (data-text); what was drawn is recorded beside it (data-rendered).
    glyphFallback: { '—': '-', '–': '-' }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.CYOA_END_PRESENTATIONS = DATA;
})(this);
