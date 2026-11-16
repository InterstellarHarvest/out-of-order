// REVIEW PROOF DATA, NOT PRODUCTION CONTENT (death brief docs/93 on
// agent/design-deaths-transitions-ch01-art-audit-20261115 @ 8301daa; record: docs/94).
//
// Cause-specific ending presentations, read by js/end-presentation.js. That module is generic: it
// knows no chapter, node, choice or prose. Every story-specific fact lives here. The whole facility
// is OFF unless the page is opened with ?<gate> (here ?deathproof): ordinary play keeps the authored
// ending and its BEGIN AGAIN card exactly as before.
//
// An entry applies when the game reaches an authored ending and every field of `when` equals the
// cause Rules.endCause reports (the ending node, the node it was reached from, the choice taken
// there and, for a checked choice, the check id and outcome). The ending node alone is never
// enough: three choices share this ending, and only the voluntary one has approved art.
//
// Owner status (docs/93 sections 2 and 5): the VISUAL DESIGN is locked; the body copy is
// provisional; the three control positions are approved, but their labels and behaviour are NOT.
// The labels below are the A1 mockup's placeholders, shown only as provisional preview controls
// that perform no game action.
(function (root) {
  'use strict';
  var DATA = {
    schema: 'cyoa-end-presentations-review-v1',
    gate: 'deathproof',
    entries: [{
      id: 'rest_assured_voluntary',
      status: 'review-proof',
      when: { end: 'chapter-01:exit_chair_fatal', from: 'chapter-01:chair_locked', choice: 'accept_permanent_rest' },
      // Byte-identical copy of the approved native export (death study @ 000f096,
      // review/death-screen-layout-study-2026-11-15/approved-default/native-314x206.png).
      art: { path: 'art/deaths/rest_assured_voluntary.png', sha256: '7f469efa40548568af5dfe3c11602b9c6293282d9574caa5f36fc37113e72d9c', size: [314, 206], scale: 2 },
      title: 'PERMANENTLY SATISFIED.',
      body: ['You have achieved permanent relaxation.', 'The House is delighted to report that its newest customer has stopped complaining.'],
      controls: ['RETRY', 'BEGIN AGAIN', 'EXIT'],
      notice: 'REVIEW PROOF - PROVISIONAL CONTROLS: LABELS NOT APPROVED, NO GAME ACTION - ESC CLOSES',
      // The frozen backdrop: the real game frame in hard blocks, each RGB channel multiplied.
      backdrop: { block: 10, multiply: 0.35 },
      // The approved A1 composition at canonical 1920x1080 stage coordinates (the study's lab
      // geometry with its approved -85px offset applied: popup 280,135 1360x640, centre y=455).
      layout: {
        popup: [280, 135, 1360, 640], shadow: 12,
        title: { y: 167, role: 'labels', scale: 1 },
        artFrame: [304, 197, 644, 428], artMat: [308, 201, 636, 420], art: [312, 205],
        body: { x: 972, y: 257, width: 604, lineStep: 44, paragraphGap: 18, role: 'dialogue', scale: 2 },
        separator: [328, 639, 1264],
        controls: { x: 570, y: 669, w: 240, h: 62, step: 270, shadow: 4, labelY: 22, role: 'labels', scale: 1 },
        notice: { x: 280, y: 86, role: 'labels', scale: 1 }
      },
      palette: {
        shadow: '#101e22', edge: '#19393e', bevel: '#abc3b9', light: '#f9f0d9', face: '#e8dfc6', lowerBorder: '#ab9e85',
        artFrame: '#24484a', artMat: '#f6edd5', separator: '#b4aa92', separatorLight: '#f9f0d9',
        controlShadow: '#9d927d', controlEdge: '#244348', controlFace: '#bacdc0', controlHighlight: '#f4efda',
        ink: '#233a3b', noticePlate: '#0e1b20', noticeInk: '#f1d898'
      }
    }]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.CYOA_END_PRESENTATIONS = DATA;
})(this);
