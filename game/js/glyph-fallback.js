// Typographic glyph fallbacks for the approved bitmap faces (game issue #27). PRESENTATION ONLY.
//
// The approved faces (the locked atlas and the baked Dialogue / Labels / Objective faces) draw printable
// ASCII only. Canonical text keeps its own characters everywhere it is stored (story, transcript, saves);
// when a face has no glyph for one of these characters, the renderer draws the listed ASCII glyph instead,
// exactly as the death popups already do for dashes (game/content/end-presentations.review.js
// glyphFallback, docs/98). The story importer accepts a character only if every face it is drawn in has it
// or has its fallback. No glyph is invented and no approved font art changes.
(function (root) {
  'use strict';
  var FALLBACK = {
    '—': '-', // em dash
    '–': '-', // en dash
    '’': "'", // right single quotation mark (typographic apostrophe)
    '‘': "'", // left single quotation mark
    'è': 'e' // e grave (boutonniere)
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FALLBACK;
  else root.CYOA_GLYPH_FALLBACK = FALLBACK;
})(this);
