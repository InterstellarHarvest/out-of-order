// Production tuning values for the reception slice (docs/62).
//
// These are the presentation constants that used to sit as literals inside js/stage.js and
// js/flow.js, gathered in one place with their values UNCHANGED, so the polish lab
// (tools/m2-reception-polish-lab/) can read the production defaults from the same source the game
// uses. Geometry that already lives in the lab's layout bundle (G.layout, from
// tools/layout-lab/data/placement.default.json) stays there and is not repeated here.
//
// The game never reads browser storage or the lab: these literals are the production values.
(function () {
  'use strict';

  var G = window.CYOA_GAME;

  G.TUNING = {
    // Portrait layers (js/stage.js artLayer): whole-pixel offsets of the 564x278 layers inside the
    // portrait aperture. Both art files are native 564x278 and drawn 1:1.
    portrait: { npcX: 0, npcY: 0, backgroundX: 0, backgroundY: 0 },

    // Utility-button tooltip (js/stage.js showTooltip): centred over its button, offsetX from that
    // centre, gapY px above the button; the box is the text plus padX / padY on each side.
    // Delays are 0: the tooltip shows and hides at once.
    tooltip: { offsetX: 0, gapY: 4, padX: 10, padY: 7, showDelayMs: 0, hideDelayMs: 0 },

    // Item-received slip (js/stage.js): stage position of the 560x116 slip and, in slip
    // coordinates, the 96x96 item art and the two text lines (each centred on a middle row).
    notice: { x: 56, y: 738, durationMs: 3600, itemX: 14, itemY: 9, titleX: 134, titleMidY: 28, nameX: 134, nameMidY: 77 },

    // Item inspector (js/stage.js): whole-pixel nudges of the inspect art (565x451) and the X,
    // the item text's x relative to the choice text inset, and its top.
    inspector: { artDx: 0, artDy: 0, closeDx: 0, closeDy: 0, textDx: 0, textY: 12 },

    // NOTES / FILES overlay (js/stage.js), in panel coordinates: title on the teal plate, body on
    // the cream reading area, and the body line height.
    overlay: { titleX: 100, titleCenterY: 60, bodyX: 48, bodyY: 140, bodyWidth: 1159, bodyHeight: 620, lineHeight: 26 },

    // Dialogue-turn timing not held in the layout bundle: the beat between a finished line and
    // the choices arriving (js/flow.js), and the stagger between arriving cards (js/stage.js).
    timing: { beforeChoicesMs: 200, cardStaggerMs: 40 }
  };
})();
