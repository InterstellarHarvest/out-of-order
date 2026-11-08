// NARRATIVE STUDY value registry (docs/64-68). EXPERIMENTAL PREVIEW VALUES ONLY.
//
// Loaded by the lab page AND by each stage frame, like tunables.js, but deliberately separate from it:
//   - nothing here is read from or written to the production game (G.TUNING / G.layout);
//   - these values never appear in the production tunables, COPY CHANGES or COPY ALL;
//   - they persist under their own storage key and export with their own schema (lab.js).
// The defaults are the study's starting point (the static proofs on agent/narrative-mode-b-art-study,
// docs/67), NOT production values: the production game has no narrative mode.
// Every value is a whole number; enumerations use `options` (value -> label).
(function () {
  'use strict';

  // The Narrative B reading surface measured on both review overlays (opaque cream inside the frame):
  // x 1324..1908, y 69..513 at its tightest. Text boxes are clamped inside it.
  var SAFE_B = { left: 1324, top: 62, right: 1908, bottom: 513 };
  // The existing speech panel's text area (layout-final.png): Focus A's description stays inside it,
  // clear of the speech indicator rail at x 1899.
  var SAFE_A = { left: 1326, top: 349, right: 1896, bottom: 512 };

  var SECTIONS = [
    { id: 'surface', title: 'Narrative B surface' },
    { id: 'text', title: 'Narrative B text' },
    { id: 'paging', title: 'Passage length + continuation' },
    { id: 'focus', title: 'Focus A description' },
    { id: 'timing', title: 'Typing + transitions' },
    { id: 'marking', title: 'Talking vs action (narration and dialogue)' }
  ];

  // The second ink for the player's actions in the dialogue box (never in the narration); the first
  // ink is the production dark ink.
  var INKS = { 1: '#8e2c1f', 2: '#6b5536', 3: '#3f5f6b' };

  var FONTS = { 1: 'Dialogue face (Jersey 15 1x)', 2: 'Choices face (locked atlas)', 3: 'Labels face (Press Start 2P 2x)', 4: 'Objective face (Tiny5 3x)' };
  // The text role whose baked face draws the narration (G.layout.typeface maps role -> face).
  var FONT_ROLE = { 1: 'dialogue', 2: 'choices', 3: 'labels', 4: 'objective' };

  // `control` picks the widget (controls.js): 'nudge' (- box +, whole steps), 'slider' (for wide
  // ranges such as timings), 'radio' (one of a few), 'select' (one of many), 'check' (on / off, 0 / 1).
  var LIST = [
    { key: 'surface.candidate', s: 'surface', label: 'Narrative B overlay', def: 1, min: 1, max: 2, control: 'radio',
      options: { 1: 'Candidate 1 (dialogue cream, PMO preferred)', 2: 'Candidate 2 (warmer paper)' } },

    { key: 'text.x', s: 'text', label: 'Narration X', unit: 'px', def: 1350, min: SAFE_B.left + 2, max: 1420, control: 'nudge' },
    { key: 'text.y', s: 'text', label: 'Narration Y (top)', unit: 'px', def: 77, min: SAFE_B.top + 2, max: 180, control: 'nudge' },
    { key: 'text.width', s: 'text', label: 'Wrap width', unit: 'px', def: 522, min: 320, max: SAFE_B.right - SAFE_B.left - 4, control: 'nudge' },
    { key: 'text.bottomMargin', s: 'text', label: 'Bottom safe margin', unit: 'px', def: 20, min: 0, max: 160, control: 'nudge' },
    { key: 'text.font', s: 'text', label: 'Narration face', def: 1, min: 1, max: 4, options: FONTS, control: 'select' },
    { key: 'text.lineHeight', s: 'text', label: 'Line spacing', unit: 'px', def: 26, min: 16, max: 44, control: 'nudge' },

    // Owner, 2026-11-08: text past a full panel types on and scrolls, like the dialogue box, with the
    // same scroll thumb; CONTINUE paces a long passage between groups of whole paragraphs ("works
    // fine, timing good"). Separate replacing pages were retired.
    { key: 'paging.continue', s: 'paging', label: 'CONTINUE between paragraph groups (off: the whole passage types on and scrolls)', def: 1, min: 0, max: 1, control: 'check' },
    { key: 'paging.maxLines', s: 'paging', label: 'Max lines per CONTINUE group (0 = all that fit)', unit: 'lines', def: 0, min: 0, max: 24, control: 'nudge' },
    { key: 'paging.fixture', s: 'paging', label: 'Long-passage test text', def: 1, min: 1, max: 3, control: 'radio',
      options: { 1: 'Announcement, 4 paragraphs', 2: 'One very long paragraph', 3: 'Extreme: 6 long paragraphs' } },

    { key: 'focus.x', s: 'focus', label: 'Description X', unit: 'px', def: 1342, min: SAFE_A.left, max: 1400, control: 'nudge' },
    { key: 'focus.y', s: 'focus', label: 'Description Y (top)', unit: 'px', def: 360, min: SAFE_A.top, max: 420, control: 'nudge' },
    { key: 'focus.width', s: 'focus', label: 'Description wrap width', unit: 'px', def: 540, min: 300, max: SAFE_A.right - SAFE_A.left, control: 'nudge' },
    { key: 'focus.lineHeight', s: 'focus', label: 'Description line spacing', unit: 'px', def: 24, min: 16, max: 40, control: 'nudge' },

    // 40 = the dialogue's own typing speed (G.layout.speech.text.charsPerSecond).
    { key: 'timing.revealCps', s: 'timing', label: 'Typing speed (0 = whole text at once)', unit: 'cps', def: 40, min: 0, max: 400, control: 'slider' },
    { key: 'timing.choicesDelayMs', s: 'timing', label: 'Pause after the text, before choices', unit: 'ms', def: 200, min: 0, max: 2000, control: 'slider' },
    { key: 'timing.transitionMs', s: 'timing', label: 'B <-> A cross-fade (0 = cut)', unit: 'ms', def: 200, min: 0, max: 1500, control: 'slider' },

    // How talking is told apart from action. The owner's rule (2026-11-08): narration is dark
    // throughout, with anyone's speech in quotation marks; in the dialogue box nobody is quoted, the
    // player's actions take the action ink (a sigh or other sound is speech) and the NPC's stage
    // directions read as plain descriptions ("SHE STAMPS SOMETHING."). Brackets are today's game.
    { key: 'marking.style', s: 'marking', label: 'Talking vs action', def: 2, min: 1, max: 2, control: 'radio', order: [2, 1],
      options: { 2: "Owner's rule (narration: speech in quotes; dialogue: the player's actions in ink)", 1: 'Brackets / parentheses (the game today)' } },
    { key: 'marking.ink', s: 'marking', label: "Action ink (the player's actions, never the narration)", def: 1, min: 1, max: 3, control: 'radio', swatches: INKS,
      options: { 1: 'Red ribbon', 2: 'Faded brown', 3: 'Slate' } },
    { key: 'marking.actionCards', s: 'marking', label: 'Action choice cards in the action ink too', def: 0, min: 0, max: 1, control: 'check' }
  ];

  // Saved or imported values from retired study options (2026-11-08): what still means something
  // is carried over; the rest is dropped, without losing the other values.
  function migrate(map) {
    var out = {};
    Object.keys(map || {}).forEach(function (k) { out[k] = map[k]; });
    if (out['paging.flow'] === 2) out['paging.continue'] = 0;
    ['paging.flow', 'paging.breakAt', 'choices.result', 'choices.actionMotion', 'choices.spokenQuotes'].forEach(function (k) { delete out[k]; });
    if (out['marking.style'] > 2) delete out['marking.style'];
    return out;
  }

  var byKey = {};
  LIST.forEach(function (t) { byKey[t.key] = t; });

  function defaults() {
    var o = {};
    LIST.forEach(function (t) { o[t.key] = t.def; });
    return o;
  }

  // Cross-constraints: the narration box stays on the parchment, the description inside the speech
  // panel. Returns the clamped value for `key` given the other current values.
  function constrain(key, v, get) {
    if (key === 'text.width') v = Math.min(v, SAFE_B.right - get('text.x'));
    if (key === 'text.x') v = Math.min(v, SAFE_B.right - get('text.width'));
    if (key === 'focus.width') v = Math.min(v, SAFE_A.right - get('focus.x'));
    if (key === 'focus.x') v = Math.min(v, SAFE_A.right - get('focus.width'));
    return v;
  }

  // { key: integer } -> { ok, errors }. Rejects unknown keys, non-integers, out-of-range values and a
  // box that would leave its surface.
  function validate(map) {
    var errors = [];
    if (!map || typeof map !== 'object' || Array.isArray(map)) return { ok: false, errors: ['values must be an object of key: integer'] };
    Object.keys(map).forEach(function (k) {
      var t = byKey[k];
      var v = map[k];
      if (!t) { errors.push('unknown narrative study key: ' + k); return; }
      if (typeof v !== 'number' || !Number.isInteger(v)) { errors.push(k + ': must be a whole number (got ' + JSON.stringify(v) + ')'); return; }
      if (v < t.min || v > t.max) errors.push(k + ': ' + v + ' is outside ' + t.min + '..' + t.max);
    });
    var all = Object.assign(defaults(), map);
    if (all['text.x'] + all['text.width'] > SAFE_B.right) errors.push('text.x + text.width (' + (all['text.x'] + all['text.width']) + ') must stay inside the parchment (<= ' + SAFE_B.right + ')');
    if (all['focus.x'] + all['focus.width'] > SAFE_A.right) errors.push('focus.x + focus.width (' + (all['focus.x'] + all['focus.width']) + ') must stay inside the speech panel (<= ' + SAFE_A.right + ')');
    return { ok: errors.length === 0, errors: errors };
  }

  window.NARRATIVE_STUDY = {
    SCHEMA: 'cyoa-m2-narrative-study-v1',
    STORE: 'cyoa-m2-reception-polish-lab-narrative-study-v1',
    SECTIONS: SECTIONS, LIST: LIST, byKey: byKey, defaults: defaults, validate: validate, migrate: migrate, constrain: constrain,
    SAFE_B: SAFE_B, SAFE_A: SAFE_A, FONT_ROLE: FONT_ROLE, INKS: INKS,
    // The review overlays from agent/narrative-mode-b-art-study (same paths). Review assets, never
    // production art. Both arrived with a stray cream column at x 1919, outside the frame's dark edge
    // (owner, 2026-11-08); there, and only there, each now repeats column 1918.
    OVERLAYS: {
      1: { path: 'review/narrative-mode-b-art-study/narrative-mode-b-candidate-a-overlay.png', sha256: 'ebc7ccd00f4e5575673ad5e404f31453985ef24d34a64662166ab4370c65514c',
        source: '0dca8af319f3c67ca4f382f365d4ab642ec5cced0f81031ca34e36d9efdd88f7' },
      2: { path: 'review/narrative-mode-b-art-study/narrative-mode-b-candidate-b-overlay.png', sha256: 'dddb6be4d1d5f5c03eff0f0a82c3e3377109ec6bdb28f2c5eaaa5a496b8769c4',
        source: '3b163752dcb6da269c4dd46376e75efbdd364831f18b16a36955a5593476c340' }
    }
  };
})();
