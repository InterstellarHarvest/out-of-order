// Runs inside a stage frame AFTER game/js/tuning.js and the layout bundle are loaded and BEFORE
// game/js/stage.js builds anything (docs/62).
//
//   ?mode=production  touches nothing: the frame is the production game as committed. It records the
//                     pristine production values, which the lab page reads as its defaults.
//   ?mode=lab         writes the lab page's current values into G.TUNING / G.layout first. Later
//                     changes arrive live through LAB_STAGE.applyValues (lab-stage.js).
//
// The game itself never loads this file and never reads the lab's storage.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var TUN = window.POLISH_TUNABLES;
  var mode = /[?&]mode=lab\b/.test(location.search) ? 'lab' : 'production';
  var production = TUN.readAll(G);
  window.LAB_FRAME = { mode: mode, production: production, applied: null };

  if (mode !== 'lab') return;
  // The lab frame also decodes every NOTES/FILES panel variant (G.OVERLAY_ART, js/stage.js), so a
  // switch between them applies live; the production frame loads only what the game loads.
  var loadImages = G.loadImages;
  G.loadImages = function (extra) {
    var art = G.OVERLAY_ART || {};
    return loadImages.call(G, (extra || []).concat(Object.keys(art).map(function (k) { return { name: art[k].image, url: G.url(art[k].path) }; })));
  };
  var lab = null;
  try {
    lab = window.parent && window.parent !== window && window.parent.POLISH_LAB ? window.parent.POLISH_LAB.labValues() : null;
  } catch (e) {
    lab = null;
  }
  if (!lab) return;
  var check = TUN.validate(lab, production);
  if (!check.ok) {
    window.LAB_FRAME.error = check.errors;
    return;
  }
  var all = {};
  TUN.LIST.forEach(function (t) { all[t.key] = t.key in lab ? lab[t.key] : production[t.key]; });
  TUN.writeAll(G, all);
  window.LAB_FRAME.applied = all;
})();
