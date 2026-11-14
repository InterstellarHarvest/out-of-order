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
    // Delays are 0: the tooltip shows and hides at once. An unavailable action keeps its label as
    // is on the first line; the reason (NOT NOW, NOT AVAILABLE HERE...) sits on a second line,
    // reasonGapY px below, in a smaller face: reasonFace 1 = the Labels face (Press Start 2P) at
    // half size, 2 = the Dialogue face (Jersey 15), 3 = the Objective face (Tiny5). Owner, 2026-11-08.
    tooltip: { offsetX: 0, gapY: 4, padX: 10, padY: 7, showDelayMs: 0, hideDelayMs: 0, reasonFace: 1, reasonGapY: 5 },

    // Item-received slip (js/stage.js): stage position of the 560x116 slip and, in slip
    // coordinates, the 96x96 item art and the two text lines (each centred on a middle row).
    // Owner-approved notice polish (docs/62 §12): y 738 -> 730; opacity fades of fadeInMs / fadeOutMs
    // inside the unchanged durationMs, which is the whole on-screen lifecycle. Round 2 (owner,
    // 2026-11-08; docs/82): fade-in 180 -> 500 ms.
    notice: { x: 56, y: 730, durationMs: 3600, fadeInMs: 500, fadeOutMs: 220, itemX: 14, itemY: 9, titleX: 134, titleMidY: 28, nameX: 134, nameMidY: 77 },

    // Item inspector (js/stage.js): whole-pixel nudges of the inspect art (565x451) and the X,
    // the item text's x relative to the choice text inset, and its top.
    inspector: { artDx: 0, artDy: 0, closeDx: 0, closeDy: 0, textDx: 0, textY: 12 },

    // NOTES / FILES overlay (js/stage.js), in panel coordinates: the NOTES title at (titleX, centred
    // on titleCenterY) in light ink on the teal band; the FILES title (YOUR FILES, owner ruling
    // 2026-11-07, docs/63) in dark ink centred on (filesTitleCenterX, filesTitleCenterY), the middle
    // of the FILES panel's label plate (inside x 512-748, y 52-87); the body box on the cream
    // reading area, and the body line height.
    // notesPanel picks the NOTES panel art: 2 = notes_panel_v2.png (production since Round 2, owner
    // 2026-11-08; docs/63, docs/82), 1 = the earlier notes_files_panel.png. FILES always uses its own
    // files_panel.png.
    overlay: { titleX: 100, titleCenterY: 60, bodyX: 48, bodyY: 140, bodyWidth: 1159, bodyHeight: 620, lineHeight: 26, notesPanel: 2,
      filesTitleCenterX: 630, filesTitleCenterY: 70 },

    // Dialogue-turn timing not held in the layout bundle: the beat between a finished line and
    // the choices arriving (js/flow.js), and the stagger between arriving cards (js/stage.js).
    timing: { beforeChoicesMs: 200, cardStaggerMs: 40 }
  };
})();
