// The polish lab's tunable registry (docs/62). Loaded by the lab page AND by each stage frame, so
// both sides use one definition of every value.
//
// Every entry reads its PRODUCTION value from the running production game (G.TUNING from
// game/js/tuning.js, or G.layout from tools/layout-lab/data/placement.default.json): nothing here
// copies a production number. `range` is [min, max] around the production value when `rel` is true,
// otherwise absolute. Every value is an integer (whole pixels, whole milliseconds).
(function () {
  'use strict';

  function lay(G) { return G.layout; }
  function tun(G) { return G.TUNING; }
  function slots(G) { var inv = G.layout.inventory; return inv.slotLayouts[inv.slotCount]; }
  function btn(G, i) { return G.layout.utility.buttons[i]; }

  var SECTIONS = [
    { id: 'portrait', title: 'Portrait' },
    { id: 'dialogue', title: 'Dialogue' },
    { id: 'choices', title: 'Choices + scrollbar' },
    { id: 'inventory', title: 'Inventory' },
    { id: 'utility', title: 'Utility buttons' },
    { id: 'tooltip', title: 'Tooltip' },
    { id: 'notice', title: 'Item-received slip' },
    { id: 'inspector', title: 'Inspector' },
    { id: 'overlay', title: 'NOTES / FILES' },
    { id: 'objective', title: 'Objective' },
    { id: 'timing', title: 'Interaction timing' }
  ];

  // key, section, label, unit, source (documentation), range, rel, read(G), write(G, v, all)
  var T = [
    // Portrait (whole-pixel layer offsets; both layers stay native 564x278 at 1x).
    { key: 'portrait.npcX', s: 'portrait', label: 'Receptionist X offset', unit: 'px', src: 'G.TUNING.portrait.npcX', range: [-40, 40], rel: true,
      read: function (G) { return tun(G).portrait.npcX; }, write: function (G, v) { tun(G).portrait.npcX = v; } },
    { key: 'portrait.npcY', s: 'portrait', label: 'Receptionist Y offset', unit: 'px', src: 'G.TUNING.portrait.npcY', range: [-40, 40], rel: true,
      read: function (G) { return tun(G).portrait.npcY; }, write: function (G, v) { tun(G).portrait.npcY = v; } },
    { key: 'portrait.backgroundX', s: 'portrait', label: 'Background X offset', unit: 'px', src: 'G.TUNING.portrait.backgroundX', range: [-20, 20], rel: true,
      read: function (G) { return tun(G).portrait.backgroundX; }, write: function (G, v) { tun(G).portrait.backgroundX = v; } },
    { key: 'portrait.backgroundY', s: 'portrait', label: 'Background Y offset', unit: 'px', src: 'G.TUNING.portrait.backgroundY', range: [-20, 20], rel: true,
      read: function (G) { return tun(G).portrait.backgroundY; }, write: function (G, v) { tun(G).portrait.backgroundY = v; } },

    // Dialogue text box (the frame itself is the shell and stays locked).
    { key: 'dialogue.textX', s: 'dialogue', label: 'Text box X (left inset)', unit: 'px', src: 'G.layout.speech.text.x', range: [-40, 40], rel: true,
      read: function (G) { return lay(G).speech.text.x; }, write: function (G, v) { lay(G).speech.text.x = v; } },
    { key: 'dialogue.textY', s: 'dialogue', label: 'Text box Y (top inset)', unit: 'px', src: 'G.layout.speech.text.y', range: [-40, 40], rel: true,
      read: function (G) { return lay(G).speech.text.y; }, write: function (G, v) { lay(G).speech.text.y = v; } },
    { key: 'dialogue.textWidth', s: 'dialogue', label: 'Text box width (right padding)', unit: 'px', src: 'G.layout.speech.text.width', range: [-60, 30], rel: true,
      read: function (G) { return lay(G).speech.text.width; }, write: function (G, v) { lay(G).speech.text.width = v; } },
    { key: 'dialogue.textHeight', s: 'dialogue', label: 'Visible history height (bottom padding)', unit: 'px', src: 'G.layout.speech.text.height', range: [-60, 30], rel: true,
      read: function (G) { return lay(G).speech.text.height; }, write: function (G, v) { lay(G).speech.text.height = v; } },
    { key: 'dialogue.lineHeight', s: 'dialogue', label: 'Line height', unit: 'px', src: 'G.layout.speech.text.lineHeight', range: [16, 40], rel: false,
      read: function (G) { return lay(G).speech.text.lineHeight; }, write: function (G, v) { lay(G).speech.text.lineHeight = v; } },
    { key: 'dialogue.speakerGap', s: 'dialogue', label: 'Gap between speakers', unit: 'px', src: 'G.layout.speech.text.speakerGap', range: [0, 32], rel: false,
      read: function (G) { return lay(G).speech.text.speakerGap; }, write: function (G, v) { lay(G).speech.text.speakerGap = v; } },

    // Choices (card width / heights and the scrollbar width stay locked; no arrows).
    { key: 'choices.listY', s: 'choices', label: 'Choice list top (viewport Y)', unit: 'px', src: 'G.layout.choices.viewport.y', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).choices.viewport.y; }, write: function (G, v) { lay(G).choices.viewport.y = v; } },
    { key: 'choices.gap', s: 'choices', label: 'Gap between cards', unit: 'px', src: 'G.layout.choices.gap', range: [0, 30], rel: false,
      read: function (G) { return lay(G).choices.gap; }, write: function (G, v) { lay(G).choices.gap = v; } },
    { key: 'choices.textX', s: 'choices', label: 'Card text X inset', unit: 'px', src: 'G.layout.choices.text.offsetX', range: [0, 80], rel: false,
      read: function (G) { return lay(G).choices.text.offsetX; }, write: function (G, v) { lay(G).choices.text.offsetX = v; } },
    { key: 'choices.textY', s: 'choices', label: 'Card text Y inset', unit: 'px', src: 'G.layout.choices.text.offsetY', range: [-20, 20], rel: false,
      read: function (G) { return lay(G).choices.text.offsetY; }, write: function (G, v) { lay(G).choices.text.offsetY = v; } },
    { key: 'scrollbar.x', s: 'choices', label: 'Scrollbar indicator X', unit: 'px', src: 'G.layout.scrollbar.thumb.x (= track.x)', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).scrollbar.thumb.x; }, write: function (G, v) { lay(G).scrollbar.thumb.x = v; lay(G).scrollbar.track.x = v; } },
    { key: 'scrollbar.top', s: 'choices', label: 'Scrollbar track top', unit: 'px', src: 'G.layout.scrollbar.track.y', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).scrollbar.track.y; },
      write: function (G, v, all) { var t = lay(G).scrollbar.track; t.y = v; t.height = all['scrollbar.bottom'] - v; } },
    { key: 'scrollbar.bottom', s: 'choices', label: 'Scrollbar track bottom', unit: 'px', src: 'G.layout.scrollbar.track.y + height', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).scrollbar.track.y + lay(G).scrollbar.track.height; },
      write: function (G, v, all) { var t = lay(G).scrollbar.track; t.y = all['scrollbar.top']; t.height = v - all['scrollbar.top']; } },

    // Inventory (slot count, slot size and the arrows' art are settled).
    { key: 'inventory.slotsX', s: 'inventory', label: 'Slot group X', unit: 'px', src: 'G.layout.inventory.slotLayouts[slotCount].x', range: [-40, 40], rel: true,
      read: function (G) { return slots(G).x; }, write: function (G, v) { slots(G).x = v; } },
    { key: 'inventory.slotsY', s: 'inventory', label: 'Slot group Y', unit: 'px', src: 'G.layout.inventory.slotLayouts[slotCount].y', range: [-30, 30], rel: true,
      read: function (G) { return slots(G).y; }, write: function (G, v) { slots(G).y = v; } },
    { key: 'inventory.slotGap', s: 'inventory', label: 'Slot gap (pitch = 96 + gap)', unit: 'px', src: 'G.layout.inventory.gap / pitch', range: [0, 40], rel: false,
      read: function (G) { return lay(G).inventory.gap; }, write: function (G, v) { var inv = lay(G).inventory; inv.gap = v; inv.pitch = inv.slotSize[0] + v; } },
    { key: 'inventory.leftArrowX', s: 'inventory', label: 'Left arrow X', unit: 'px', src: 'G.layout.inventory.leftArrow.x', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).inventory.leftArrow.x; }, write: function (G, v) { lay(G).inventory.leftArrow.x = v; } },
    { key: 'inventory.leftArrowY', s: 'inventory', label: 'Left arrow Y', unit: 'px', src: 'G.layout.inventory.leftArrow.y', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).inventory.leftArrow.y; }, write: function (G, v) { lay(G).inventory.leftArrow.y = v; } },
    { key: 'inventory.rightArrowX', s: 'inventory', label: 'Right arrow X', unit: 'px', src: 'G.layout.inventory.rightArrow.x', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).inventory.rightArrow.x; }, write: function (G, v) { lay(G).inventory.rightArrow.x = v; } },
    { key: 'inventory.rightArrowY', s: 'inventory', label: 'Right arrow Y', unit: 'px', src: 'G.layout.inventory.rightArrow.y', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).inventory.rightArrow.y; }, write: function (G, v) { lay(G).inventory.rightArrow.y = v; } },

    // Utility buttons (size, sprites, glyphs and the no-hover rule are locked).
    { key: 'utility.groupX', s: 'utility', label: 'Group X (first button)', unit: 'px', src: 'G.layout.utility.buttons[0].x', range: [-60, 60], rel: true,
      read: function (G) { return btn(G, 0).x; },
      write: function (G, v, all) { G.layout.utility.buttons.forEach(function (b, i) { b.x = v + i * (b.displayWidth + all['utility.spacing']); }); } },
    { key: 'utility.spacing', s: 'utility', label: 'Spacing between buttons', unit: 'px', src: 'buttons[1].x - buttons[0].x - width', range: [0, 30], rel: false,
      read: function (G) { return btn(G, 1).x - btn(G, 0).x - btn(G, 0).displayWidth; },
      write: function (G, v, all) { G.layout.utility.buttons.forEach(function (b, i) { b.x = all['utility.groupX'] + i * (b.displayWidth + v); }); } },
    { key: 'utility.rowY', s: 'utility', label: 'Row Y', unit: 'px', src: 'G.layout.utility.buttons[*].y', range: [-30, 30], rel: true,
      read: function (G) { return btn(G, 0).y; }, write: function (G, v) { G.layout.utility.buttons.forEach(function (b) { b.y = v; }); } },

    // Tooltip box (CSS treatment and the baked Labels face are locked).
    { key: 'tooltip.offsetX', s: 'tooltip', label: 'X offset from the button centre', unit: 'px', src: 'G.TUNING.tooltip.offsetX', range: [-40, 40], rel: true,
      read: function (G) { return tun(G).tooltip.offsetX; }, write: function (G, v) { tun(G).tooltip.offsetX = v; } },
    { key: 'tooltip.gapY', s: 'tooltip', label: 'Gap above the button', unit: 'px', src: 'G.TUNING.tooltip.gapY', range: [0, 40], rel: false,
      read: function (G) { return tun(G).tooltip.gapY; }, write: function (G, v) { tun(G).tooltip.gapY = v; } },
    { key: 'tooltip.padX', s: 'tooltip', label: 'Horizontal padding', unit: 'px', src: 'G.TUNING.tooltip.padX', range: [2, 30], rel: false,
      read: function (G) { return tun(G).tooltip.padX; }, write: function (G, v) { tun(G).tooltip.padX = v; } },
    { key: 'tooltip.padY', s: 'tooltip', label: 'Vertical padding', unit: 'px', src: 'G.TUNING.tooltip.padY', range: [2, 20], rel: false,
      read: function (G) { return tun(G).tooltip.padY; }, write: function (G, v) { tun(G).tooltip.padY = v; } },

    // Item-received slip (560x116 art at 1x; generic for any item).
    { key: 'notice.x', s: 'notice', label: 'Slip X', unit: 'px', src: 'G.TUNING.notice.x', range: [-60, 60], rel: true,
      read: function (G) { return tun(G).notice.x; }, write: function (G, v) { tun(G).notice.x = v; } },
    { key: 'notice.y', s: 'notice', label: 'Slip Y', unit: 'px', src: 'G.TUNING.notice.y', range: [-60, 60], rel: true,
      read: function (G) { return tun(G).notice.y; }, write: function (G, v) { tun(G).notice.y = v; } },
    { key: 'notice.itemX', s: 'notice', label: 'Item art X (in slip)', unit: 'px', src: 'G.TUNING.notice.itemX', range: [-12, 12], rel: true,
      read: function (G) { return tun(G).notice.itemX; }, write: function (G, v) { tun(G).notice.itemX = v; } },
    { key: 'notice.itemY', s: 'notice', label: 'Item art Y (in slip)', unit: 'px', src: 'G.TUNING.notice.itemY', range: [-12, 12], rel: true,
      read: function (G) { return tun(G).notice.itemY; }, write: function (G, v) { tun(G).notice.itemY = v; } },
    { key: 'notice.titleX', s: 'notice', label: 'ITEM RECEIVED X', unit: 'px', src: 'G.TUNING.notice.titleX', range: [-30, 30], rel: true,
      read: function (G) { return tun(G).notice.titleX; }, write: function (G, v) { tun(G).notice.titleX = v; } },
    { key: 'notice.titleY', s: 'notice', label: 'ITEM RECEIVED middle row Y', unit: 'px', src: 'G.TUNING.notice.titleMidY', range: [-12, 12], rel: true,
      read: function (G) { return tun(G).notice.titleMidY; }, write: function (G, v) { tun(G).notice.titleMidY = v; } },
    { key: 'notice.nameX', s: 'notice', label: 'Item name X', unit: 'px', src: 'G.TUNING.notice.nameX', range: [-30, 30], rel: true,
      read: function (G) { return tun(G).notice.nameX; }, write: function (G, v) { tun(G).notice.nameX = v; } },
    { key: 'notice.nameY', s: 'notice', label: 'Item name middle row Y', unit: 'px', src: 'G.TUNING.notice.nameMidY', range: [-12, 12], rel: true,
      read: function (G) { return tun(G).notice.nameMidY; }, write: function (G, v) { tun(G).notice.nameMidY = v; } },

    // Inspector (frame, item overlay and the 565x451 art size are locked).
    { key: 'inspector.artX', s: 'inspector', label: 'Inspect art X nudge', unit: 'px', src: 'G.TUNING.inspector.artDx', range: [-20, 20], rel: true,
      read: function (G) { return tun(G).inspector.artDx; }, write: function (G, v) { tun(G).inspector.artDx = v; } },
    { key: 'inspector.artY', s: 'inspector', label: 'Inspect art Y nudge', unit: 'px', src: 'G.TUNING.inspector.artDy', range: [-20, 20], rel: true,
      read: function (G) { return tun(G).inspector.artDy; }, write: function (G, v) { tun(G).inspector.artDy = v; } },
    { key: 'inspector.closeX', s: 'inspector', label: 'Close X nudge X', unit: 'px', src: 'G.TUNING.inspector.closeDx', range: [-20, 20], rel: true,
      read: function (G) { return tun(G).inspector.closeDx; }, write: function (G, v) { tun(G).inspector.closeDx = v; } },
    { key: 'inspector.closeY', s: 'inspector', label: 'Close X nudge Y', unit: 'px', src: 'G.TUNING.inspector.closeDy', range: [-20, 20], rel: true,
      read: function (G) { return tun(G).inspector.closeDy; }, write: function (G, v) { tun(G).inspector.closeDy = v; } },
    { key: 'inspector.textX', s: 'inspector', label: 'Item text X (vs card text inset)', unit: 'px', src: 'G.TUNING.inspector.textDx', range: [-20, 20], rel: true,
      read: function (G) { return tun(G).inspector.textDx; }, write: function (G, v) { tun(G).inspector.textDx = v; } },
    { key: 'inspector.textY', s: 'inspector', label: 'Item text top', unit: 'px', src: 'G.TUNING.inspector.textY', range: [0, 40], rel: false,
      read: function (G) { return tun(G).inspector.textY; }, write: function (G, v) { tun(G).inspector.textY = v; } },

    // NOTES / FILES text (1255x822 panel art at 1x, scene-only, no scrollbar).
    { key: 'overlay.titleX', s: 'overlay', label: 'Title X', unit: 'px', src: 'G.TUNING.overlay.titleX', range: [-60, 60], rel: true,
      read: function (G) { return tun(G).overlay.titleX; }, write: function (G, v) { tun(G).overlay.titleX = v; } },
    { key: 'overlay.titleY', s: 'overlay', label: 'Title middle row Y', unit: 'px', src: 'G.TUNING.overlay.titleCenterY', range: [-30, 30], rel: true,
      read: function (G) { return tun(G).overlay.titleCenterY; }, write: function (G, v) { tun(G).overlay.titleCenterY = v; } },
    { key: 'overlay.bodyX', s: 'overlay', label: 'Body X', unit: 'px', src: 'G.TUNING.overlay.bodyX', range: [-30, 40], rel: true,
      read: function (G) { return tun(G).overlay.bodyX; }, write: function (G, v) { tun(G).overlay.bodyX = v; } },
    { key: 'overlay.bodyY', s: 'overlay', label: 'Body Y', unit: 'px', src: 'G.TUNING.overlay.bodyY', range: [-30, 40], rel: true,
      read: function (G) { return tun(G).overlay.bodyY; }, write: function (G, v) { tun(G).overlay.bodyY = v; } },
    { key: 'overlay.bodyWidth', s: 'overlay', label: 'Body width', unit: 'px', src: 'G.TUNING.overlay.bodyWidth', range: [-120, 30], rel: true,
      read: function (G) { return tun(G).overlay.bodyWidth; }, write: function (G, v) { tun(G).overlay.bodyWidth = v; } },
    { key: 'overlay.bodyHeight', s: 'overlay', label: 'Body height', unit: 'px', src: 'G.TUNING.overlay.bodyHeight', range: [-120, 30], rel: true,
      read: function (G) { return tun(G).overlay.bodyHeight; }, write: function (G, v) { tun(G).overlay.bodyHeight = v; } },
    { key: 'overlay.lineHeight', s: 'overlay', label: 'Line height', unit: 'px', src: 'G.TUNING.overlay.lineHeight', range: [18, 40], rel: false,
      read: function (G) { return tun(G).overlay.lineHeight; }, write: function (G, v) { tun(G).overlay.lineHeight = v; } },
    // An art choice, not a measurement: which NOTES panel to show (FILES always has its own).
    { key: 'overlay.notesPanel', s: 'overlay', label: 'NOTES background', unit: '', src: 'G.TUNING.overlay.notesPanel', range: [1, 2], rel: false,
      options: { 1: 'v1: notes_files_panel.png', 2: 'v2: notes_panel_v2.png (new)' },
      read: function (G) { return tun(G).overlay.notesPanel; }, write: function (G, v) { tun(G).overlay.notesPanel = v; } },

    // Objective text (the frame and plate are locked).
    { key: 'objective.titleAlignX', s: 'objective', label: 'Title centring adjustment', unit: 'px', src: 'G.layout.objective.title.alignOffsetX', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).objective.title.alignOffsetX; }, write: function (G, v) { lay(G).objective.title.alignOffsetX = v; } },
    { key: 'objective.titleY', s: 'objective', label: 'Title Y', unit: 'px', src: 'G.layout.objective.title.y', range: [-20, 20], rel: true,
      read: function (G) { return lay(G).objective.title.y; }, write: function (G, v) { lay(G).objective.title.y = v; } },
    { key: 'objective.bodyX', s: 'objective', label: 'Body X', unit: 'px', src: 'G.layout.objective.body.x', range: [-30, 30], rel: true,
      read: function (G) { return lay(G).objective.body.x; }, write: function (G, v) { lay(G).objective.body.x = v; } },
    { key: 'objective.bodyY', s: 'objective', label: 'Body Y', unit: 'px', src: 'G.layout.objective.body.y', range: [-20, 20], rel: true,
      read: function (G) { return lay(G).objective.body.y; }, write: function (G, v) { lay(G).objective.body.y = v; } },
    { key: 'objective.bodyWidth', s: 'objective', label: 'Body width', unit: 'px', src: 'G.layout.objective.body.width', range: [-60, 30], rel: true,
      read: function (G) { return lay(G).objective.body.width; }, write: function (G, v) { lay(G).objective.body.width = v; } },

    // Interaction timing. (The player's line has no typing: it appears at once by design, docs/45.)
    { key: 'timing.npcCharsPerSecond', s: 'timing', label: 'NPC typing speed (chars / s)', unit: 'cps', src: 'G.layout.speech.text.charsPerSecond', range: [5, 200], rel: false,
      read: function (G) { return lay(G).speech.text.charsPerSecond; }, write: function (G, v) { lay(G).speech.text.charsPerSecond = v; } },
    { key: 'timing.beforeChoicesMs', s: 'timing', label: 'Pause after a line, before choices', unit: 'ms', src: 'G.TUNING.timing.beforeChoicesMs', range: [0, 2000], rel: false,
      read: function (G) { return tun(G).timing.beforeChoicesMs; }, write: function (G, v) { tun(G).timing.beforeChoicesMs = v; } },
    { key: 'timing.cardSlideMs', s: 'timing', label: 'Card arrival / leave slide', unit: 'ms', src: 'G.layout.choices.feedback.awayMs', range: [1, 1000], rel: false,
      read: function (G) { return lay(G).choices.feedback.awayMs; }, write: function (G, v) { lay(G).choices.feedback.awayMs = v; } },
    { key: 'timing.cardStaggerMs', s: 'timing', label: 'Stagger between arriving cards', unit: 'ms', src: 'G.TUNING.timing.cardStaggerMs', range: [0, 300], rel: false,
      read: function (G) { return tun(G).timing.cardStaggerMs; }, write: function (G, v) { tun(G).timing.cardStaggerMs = v; } },
    { key: 'timing.sendDelayMs', s: 'timing', label: 'Send: wait before the chosen card rises', unit: 'ms', src: 'G.layout.choices.feedback.send.delayMs', range: [0, 1000], rel: false,
      read: function (G) { return lay(G).choices.feedback.send.delayMs; }, write: function (G, v) { lay(G).choices.feedback.send.delayMs = v; } },
    { key: 'timing.sendRiseMs', s: 'timing', label: 'Send: chosen card rise', unit: 'ms', src: 'G.layout.choices.feedback.send.durationMs', range: [1, 2000], rel: false,
      read: function (G) { return lay(G).choices.feedback.send.durationMs; }, write: function (G, v) { lay(G).choices.feedback.send.durationMs = v; } },
    { key: 'timing.replyBeatMs', s: 'timing', label: 'Reply beat (your line, then the reply)', unit: 'ms', src: 'G.layout.choices.feedback.send.beatMs', range: [0, 3000], rel: false,
      read: function (G) { return lay(G).choices.feedback.send.beatMs; }, write: function (G, v) { lay(G).choices.feedback.send.beatMs = v; } },
    { key: 'timing.inventorySlideMs', s: 'timing', label: 'Inventory slide', unit: 'ms', src: 'G.layout.inventory.motion.durationMs', range: [1, 1000], rel: false,
      read: function (G) { return lay(G).inventory.motion.durationMs; }, write: function (G, v) { lay(G).inventory.motion.durationMs = v; } },
    { key: 'notice.durationMs', s: 'timing', label: 'Item-received slip duration', unit: 'ms', src: 'G.TUNING.notice.durationMs', range: [1000, 10000], rel: false,
      read: function (G) { return tun(G).notice.durationMs; }, write: function (G, v) { tun(G).notice.durationMs = v; } },
    { key: 'tooltip.showDelayMs', s: 'timing', label: 'Tooltip appearance delay', unit: 'ms', src: 'G.TUNING.tooltip.showDelayMs', range: [0, 1000], rel: false,
      read: function (G) { return tun(G).tooltip.showDelayMs; }, write: function (G, v) { tun(G).tooltip.showDelayMs = v; } },
    { key: 'tooltip.hideDelayMs', s: 'timing', label: 'Tooltip hide delay', unit: 'ms', src: 'G.TUNING.tooltip.hideDelayMs', range: [0, 1000], rel: false,
      read: function (G) { return tun(G).tooltip.hideDelayMs; }, write: function (G, v) { tun(G).tooltip.hideDelayMs = v; } }
  ];

  var byKey = {};
  T.forEach(function (t) { byKey[t.key] = t; });

  // Bounds for a key given the production values map.
  function bounds(t, prod) {
    return t.rel ? [prod[t.key] + t.range[0], prod[t.key] + t.range[1]] : [t.range[0], t.range[1]];
  }

  // Production values, read from a pristine production game.
  function readAll(G) {
    var out = {};
    T.forEach(function (t) { out[t.key] = t.read(G); });
    return out;
  }

  // Applies a full values map to a game before it builds its stage.
  function writeAll(G, all) {
    T.forEach(function (t) { t.write(G, all[t.key], all); });
  }

  // Validates a { key: value } map against the registry and production bounds. Returns
  // { ok, errors }. Rejects unknown keys, non-integers and out-of-range values.
  function validate(map, prod) {
    var errors = [];
    if (!map || typeof map !== 'object' || Array.isArray(map)) return { ok: false, errors: ['values must be an object of key: integer'] };
    Object.keys(map).forEach(function (k) {
      var t = byKey[k];
      var v = map[k];
      if (!t) { errors.push('unknown key: ' + k); return; }
      if (typeof v !== 'number' || !Number.isInteger(v)) { errors.push(k + ': must be a whole number (got ' + JSON.stringify(v) + ')'); return; }
      var b = bounds(t, prod);
      if (v < b[0] || v > b[1]) errors.push(k + ': ' + v + ' is outside ' + b[0] + '..' + b[1]);
    });
    return { ok: errors.length === 0, errors: errors };
  }

  window.POLISH_TUNABLES = { SECTIONS: SECTIONS, LIST: T, byKey: byKey, bounds: bounds, readAll: readAll, writeAll: writeAll, validate: validate,
    SCHEMA: 'cyoa-m2-reception-polish-lab-v1', BASE_SHA: '6472cecb377a6e00484f92cdee55f6500858daa3' };
})();
