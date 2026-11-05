// Live Tuning: slider groups for everyday layout work.
// Each control reads and writes the placement through a pure get(s)/set(s, v) pair. That is what
// lets one row work for a stored value or a derived one such as padding, and lets the same
// getter run on the baseline to show what has been modified and to reset a single property.
(function () {
  'use strict';

  var lab = window.M1Lab;
  var R = lab.measured.regions;
  var ARROW_NATIVE = [83, 128];
  var UTILITY_NATIVE = [243, 205];
  var THUMB_NATIVE_WIDTH = 40;

  // Measured edges that the derived controls are relative to.
  var BAY = R.inventoryBay.floor;
  var PANEL = R.objectivePanel.clearBelowPlaque;
  var PANEL_RIGHT = PANEL[0] + PANEL[2];
  var PARCHMENT = R.speechPanel.parchment;
  var CHANNEL_TOP = R.choiceTrack.channel[1];
  var CHANNEL_END = CHANNEL_TOP + R.choiceTrack.channel[3];

  function slider(id, label, min, max, get, set, opts) {
    return Object.assign({ type: 'slider', id: id, label: label, min: min, max: max, get: get, set: set }, opts);
  }

  function toggle(id, label, get, set) {
    return { type: 'toggle', id: id, label: label, get: get, set: set };
  }

  function heading(text) {
    return { type: 'heading', text: text };
  }

  function readout(id, text) {
    return { type: 'readout', id: id, text: text };
  }

  function advanced(label, rows) {
    return { type: 'advanced', label: label, rows: rows };
  }

  // Keeps an element's centre fixed while its size changes. Rounding would otherwise walk it a
  // pixel on every odd step, so the centre is held from the first change until something else
  // moves the element.
  var anchors = new WeakMap();

  function keepCentre(obj, axis, oldSize, newSize) {
    var centreTwice = 2 * obj[axis] + oldSize;
    var held = anchors.get(obj) || {};
    if (held[axis] === undefined || Math.abs(held[axis] - centreTwice) > 1) held[axis] = centreTwice;
    anchors.set(obj, held);
    obj[axis] = Math.floor((held[axis] - newSize) / 2);
  }

  // Inventory -------------------------------------------------------------------------
  function rowOf(s) {
    var inv = s.inventory;
    var layout = inv.slotLayouts[inv.slotCount];
    var width = (inv.slotCount - 1) * inv.pitch + inv.slotSize[0];
    return { x: layout.x, y: layout.y, right: layout.x + width, width: width };
  }

  function moveInventory(s, dx, dy) {
    var inv = s.inventory;
    ['6', '7'].forEach(function (n) {
      inv.slotLayouts[n].x += dx;
      inv.slotLayouts[n].y += dy;
    });
    [inv.leftArrow, inv.rightArrow].forEach(function (a) {
      a.x += dx;
      a.y += dy;
    });
  }

  function resizeArrow(inv, key, width) {
    var a = inv[key];
    var oldW = a.displayWidth;
    var oldH = a.displayHeight;
    lab.setScale(a, ARROW_NATIVE, lab.scaleForWidth(width, ARROW_NATIVE[0]));
    if (key === 'leftArrow') a.x += oldW - a.displayWidth; // inner edges stay put, so spacing does too
    keepCentre(a, 'y', oldH, a.displayHeight);
  }

  function spreadOf(s) {
    var inv = s.inventory;
    var row = rowOf(s);
    var left = row.x - (inv.leftArrow.x + inv.leftArrow.displayWidth);
    var right = inv.rightArrow.x - row.right;
    return Math.round((left + right) / 2);
  }

  function setRowGap(s, write) {
    var inv = s.inventory;
    var layout = inv.slotLayouts[inv.slotCount];
    var before = rowOf(s).width;
    write(inv);
    if (inv.pitchLocked) inv.pitch = inv.slotSize[0] + inv.gap;
    keepCentre(layout, 'x', before, rowOf(s).width);
  }

  function slides(s) {
    return s.inventory.motion.slide;
  }

  var inventoryGroup = {
    id: 'inventory',
    label: 'Inventory',
    open: true,
    reset: function (s, b) { s.inventory = lab.clone(b.inventory); },
    rows: [
      {
        type: 'choice',
        id: 'inv.slots',
        label: 'Visible slots',
        options: [[6, '6 slots'], [7, '7 slots']],
        fixedBaseline: true,
        get: function (s) { return s.inventory.slotCount; },
        set: function (s, v) { s.inventory.slotCount = v; }
      },
      {
        type: 'buttons',
        label: 'Starting points',
        buttons: Object.keys(lab.presets.inventoryStarters).map(function (key) {
          return {
            id: 'starter:' + key,
            label: lab.presets.inventoryStarters[key].label,
            run: function () { lab.applyPreset('inventoryStarters', key); }
          };
        })
      },
      heading('Layout'),
      slider('inv.x', 'Group X', 0, 260, function (s) { return rowOf(s).x; }, function (s, v) {
        s.inventory.centerGroup = false;
        moveInventory(s, v - rowOf(s).x, 0);
      }),
      slider('inv.y', 'Group Y', 890, 960, function (s) { return rowOf(s).y; }, function (s, v) {
        moveInventory(s, 0, v - rowOf(s).y);
      }),
      slider('inv.gap', 'Slot gap', 0, 40, function (s) { return s.inventory.gap; }, function (s, v) {
        setRowGap(s, function (inv) { inv.gap = v; });
      }, { enabled: function (s) { return s.inventory.pitchLocked; } }),
      toggle('inv.pitchUnlock', 'Unlock slot pitch', function (s) { return !s.inventory.pitchLocked; }, function (s, v) {
        s.inventory.pitchLocked = !v;
      }),
      slider('inv.pitch', 'Slot pitch', 96, 140, function (s) { return s.inventory.pitch; }, function (s, v) {
        setRowGap(s, function (inv) { inv.pitch = v; });
      }, { enabled: function (s) { return !s.inventory.pitchLocked; } }),
      toggle('inv.center', 'Centre group in bay', function (s) { return s.inventory.centerGroup; }, function (s, v) {
        s.inventory.centerGroup = v;
      }),
      heading('Arrows'),
      slider('arrow.size', 'Both arrows, width', 24, 83, function (s) { return s.inventory.leftArrow.displayWidth; }, function (s, v) {
        resizeArrow(s.inventory, 'leftArrow', v);
        resizeArrow(s.inventory, 'rightArrow', v);
      }),
      readout('arrow.readout', function (s) {
        var a = s.inventory.leftArrow;
        var b = s.inventory.rightArrow;
        var text = a.displayWidth + '×' + a.displayHeight + ' at scale ' + a.scale;
        return b.displayWidth === a.displayWidth ? 'Both ' + text : 'Left ' + text + ', right ' + b.displayWidth + '×' + b.displayHeight;
      }),
      slider('arrow.spread', 'Outward spacing', -20, 110, spreadOf, function (s, v) {
        var d = v - spreadOf(s);
        s.inventory.leftArrow.x -= d;
        s.inventory.rightArrow.x += d;
      }),
      slider('arrow.y', 'Arrow Y', 900, 1010, function (s) { return s.inventory.leftArrow.y; }, function (s, v) {
        s.inventory.leftArrow.y = v;
        s.inventory.rightArrow.y = v;
      }),
      slider('arrow.leftX', 'Left arrow X', 0, 130, function (s) { return s.inventory.leftArrow.x; }, function (s, v) {
        s.inventory.leftArrow.x = v;
      }),
      slider('arrow.rightX', 'Right arrow X', 700, 860, function (s) { return s.inventory.rightArrow.x; }, function (s, v) {
        var inv = s.inventory;
        inv.rightArrow.x = v;
        if (inv.arrowsSymmetric || inv.centerGroup) {
          var row = rowOf(s);
          inv.leftArrow.x = row.x + row.right - v - inv.rightArrow.displayWidth;
        }
      }),
      toggle('arrow.symmetric', 'Keep arrows symmetric', function (s) { return s.inventory.arrowsSymmetric; }, function (s, v) {
        s.inventory.arrowsSymmetric = v;
      }),
      advanced('Independent arrows', [
        toggle('arrow.unlink', 'Separate left and right sizes', function (s) { return !s.inventory.arrowSizeLinked; }, function (s, v) {
          s.inventory.arrowSizeLinked = !v;
        }),
        slider('arrow.leftSize', 'Left width', 24, 83, function (s) { return s.inventory.leftArrow.displayWidth; }, function (s, v) {
          resizeArrow(s.inventory, 'leftArrow', v);
        }, { enabled: function (s) { return !s.inventory.arrowSizeLinked; } }),
        slider('arrow.rightSize', 'Right width', 24, 83, function (s) { return s.inventory.rightArrow.displayWidth; }, function (s, v) {
          resizeArrow(s.inventory, 'rightArrow', v);
        }, { enabled: function (s) { return !s.inventory.arrowSizeLinked; } }),
        slider('arrow.leftY', 'Left arrow Y', 900, 1010, function (s) { return s.inventory.leftArrow.y; }, function (s, v) {
          s.inventory.leftArrow.y = v;
        }),
        slider('arrow.rightY', 'Right arrow Y', 900, 1010, function (s) { return s.inventory.rightArrow.y; }, function (s, v) {
          s.inventory.rightArrow.y = v;
        })
      ]),
      heading('Scroll motion'),
      toggle('inv.slide', 'Slots slide when scrolling', function (s) { return s.inventory.motion.slide; }, function (s, v) {
        s.inventory.motion.slide = v;
      }),
      slider('inv.slideMs', 'Slide time ms', 60, 500, function (s) { return s.inventory.motion.durationMs; }, function (s, v) {
        s.inventory.motion.durationMs = v;
      }, { enabled: slides }),
      slider('inv.overshoot', 'Overshoot', 0, 12, function (s) { return s.inventory.motion.overshoot; }, function (s, v) {
        s.inventory.motion.overshoot = v;
      }, { enabled: slides }),
      slider('inv.settle', 'Settle back', 0, 6, function (s) { return s.inventory.motion.settle; }, function (s, v) {
        s.inventory.motion.settle = v;
      }, { enabled: slides }),
      slider('inv.lag', 'Trailing lag ms', 0, 12, function (s) { return s.inventory.motion.lagMs; }, function (s, v) {
        s.inventory.motion.lagMs = v;
      }, { enabled: slides }),
      {
        type: 'buttons',
        label: 'Try it',
        buttons: [
          { id: 'inv.tryLeft', label: 'Scroll left', run: function () { lab.stepInventory(-1); } },
          { id: 'inv.tryRight', label: 'Scroll right', run: function () { lab.stepInventory(1); } }
        ]
      }
    ]
  };

  // Utility buttons ---------------------------------------------------------------------
  function buttonsOf(s) {
    return s.utility.buttons;
  }

  function setButtonWidth(s, button, width) {
    var oldH = button.displayHeight;
    lab.setScale(button, UTILITY_NATIVE, lab.scaleForWidth(width, UTILITY_NATIVE[0]));
    if (!s.utility.centerVertically) keepCentre(button, 'y', oldH, button.displayHeight);
  }

  // Buttons to the right of a resized one slide along, so the gaps do not change.
  function resizeButtons(s, write) {
    var buttons = buttonsOf(s);
    var shift = 0;
    buttons.forEach(function (b) {
      var before = b.displayWidth;
      b.x += shift;
      write(b);
      shift += b.displayWidth - before;
    });
  }

  function individualRows() {
    var rows = [];
    lab.baseline.utility.buttons.forEach(function (base, i) {
      var name = base.label.charAt(0) + base.label.slice(1).toLowerCase();
      function free(s) {
        s.utility.align = 'free';
        s.utility.centerVertically = false;
      }
      rows.push(
        slider('util.' + base.id + '.x', name + ' X', 1400, 1900, function (s) { return buttonsOf(s)[i].x; }, function (s, v) {
          free(s);
          buttonsOf(s)[i].x = v;
        }),
        slider('util.' + base.id + '.y', name + ' Y', 850, 1000, function (s) { return buttonsOf(s)[i].y; }, function (s, v) {
          free(s);
          buttonsOf(s)[i].y = v;
        }),
        slider('util.' + base.id + '.w', name + ' width', 60, 243, function (s) { return buttonsOf(s)[i].displayWidth; }, function (s, v) {
          free(s);
          lab.setScale(buttonsOf(s)[i], UTILITY_NATIVE, lab.scaleForWidth(v, UTILITY_NATIVE[0]));
        }, { enabled: function (s) { return !s.utility.sizeLinked; } })
      );
    });
    return rows;
  }

  var utilityGroup = {
    id: 'utility',
    label: 'Utility Buttons',
    open: true,
    reset: function (s, b) { s.utility = lab.clone(b.utility); },
    rows: [
      slider('util.width', 'All buttons, width', 60, 243, function (s) { return buttonsOf(s)[0].displayWidth; }, function (s, v) {
        resizeButtons(s, function (b) { setButtonWidth(s, b, v); });
      }),
      readout('util.readout', function (s) {
        var b = buttonsOf(s)[0];
        return b.displayWidth + '×' + b.displayHeight + ' at scale ' + b.scale;
      }),
      slider('util.gap', 'Gap between', -10, 60, function (s) {
        var b = buttonsOf(s);
        return b[1].x - (b[0].x + b[0].displayWidth);
      }, function (s, v) {
        var b = buttonsOf(s);
        var d = v - (b[1].x - (b[0].x + b[0].displayWidth));
        b.forEach(function (button, i) { button.x += i * d; });
      }),
      {
        type: 'choice',
        id: 'util.align',
        label: 'Alignment in bay',
        options: [['free', 'Free'], ['left', 'Left'], ['center', 'Centre'], ['right', 'Right']],
        get: function (s) { return s.utility.align; },
        set: function (s, v) { s.utility.align = v; }
      },
      toggle('util.centerY', 'Centre vertically in bay', function (s) { return s.utility.centerVertically; }, function (s, v) {
        s.utility.centerVertically = v;
      }),
      slider('util.x', 'Group X', 1400, 1700, function (s) { return buttonsOf(s)[0].x; }, function (s, v) {
        var d = v - buttonsOf(s)[0].x;
        s.utility.align = 'free';
        buttonsOf(s).forEach(function (b) { b.x += d; });
      }),
      slider('util.y', 'Group Y', 860, 1000, function (s) { return buttonsOf(s)[0].y; }, function (s, v) {
        var d = v - buttonsOf(s)[0].y;
        s.utility.centerVertically = false;
        buttonsOf(s).forEach(function (b) { b.y += d; });
      }),
      heading('Label or glyph'),
      {
        type: 'choice',
        id: 'util.show',
        label: 'Buttons show',
        options: [['label', 'Label'], ['glyph', 'Glyph']],
        get: function (s) { return s.utility.show; },
        set: function (s, v) { s.utility.show = v; }
      },
      { type: 'note', text: 'Glyphs are the chosen action sprites in art/actions, drawn 1:1. The offsets below move the label or the glyph.' }
    ].concat(lab.baseline.utility.buttons.map(function (base, i) {
      return {
        type: 'select',
        id: 'util.' + base.id + '.glyph',
        label: base.label.charAt(0) + base.label.slice(1).toLowerCase() + ' glyph',
        options: Object.keys(lab.actionGlyphs).map(function (n) { return [n, lab.actionGlyphs[n].label]; }),
        get: function (s) { return buttonsOf(s)[i].glyph; },
        set: function (s, v) { buttonsOf(s)[i].glyph = v; }
      };
    })).concat([
      slider('util.labelX', 'X offset', -50, 50, function (s) { return buttonsOf(s)[0].labelOffset.dx; }, function (s, v) {
        buttonsOf(s).forEach(function (b) { b.labelOffset.dx = v; });
      }),
      slider('util.labelY', 'Y offset', -50, 50, function (s) { return buttonsOf(s)[0].labelOffset.dy; }, function (s, v) {
        buttonsOf(s).forEach(function (b) { b.labelOffset.dy = v; });
      }),
      slider('util.pressX', 'Pressed X', -6, 8, function (s) { return s.utility.pressedLabelOffset.dx; }, function (s, v) {
        s.utility.pressedLabelOffset.dx = v;
      }),
      slider('util.pressY', 'Pressed Y', -6, 8, function (s) { return s.utility.pressedLabelOffset.dy; }, function (s, v) {
        s.utility.pressedLabelOffset.dy = v;
      }),
      advanced('Individual buttons', [
        toggle('util.unlink', 'Separate button sizes', function (s) { return !s.utility.sizeLinked; }, function (s, v) {
          s.utility.sizeLinked = !v;
        })
      ].concat(individualRows()))
    ])
  };

  // Choices ---------------------------------------------------------------------------------
  function text(s) {
    return s.choices.text;
  }

  function nativeCardHeight(lines) {
    return lab.spriteSize('choice_' + lines + 'line_a')[1];
  }

  function feedback(s) {
    return s.choices.feedback;
  }

  function hasMarker(s) {
    return feedback(s).hover === 'marker';
  }

  function clickIs(kind) {
    return function (s) { return feedback(s).click === kind; };
  }

  function pickReacts(s) {
    return feedback(s).click !== 'press';
  }

  var choicesGroup = {
    id: 'choices',
    label: 'Choices',
    reset: function (s, b) {
      s.choices = lab.clone(b.choices);
      ['choiceSet', 'choiceCount', 'variantMode'].forEach(function (k) { s.demo[k] = b.demo[k]; });
      s.demo.cardOverrides = {};
    },
    rows: [
      slider('choice.x', 'Viewport X', 1280, 1340, function (s) { return s.choices.viewport.x; }, function (s, v) { s.choices.viewport.x = v; }),
      slider('choice.y', 'Viewport Y', 490, 560, function (s) { return s.choices.viewport.y; }, function (s, v) { s.choices.viewport.y = v; }),
      slider('choice.width', 'Card width', 420, 548, function (s) { return s.choices.cardWidth; }, function (s, v) {
        var right = s.choices.cardWidth - text(s).offsetX - text(s).maxWidth;
        s.choices.cardWidth = v;
        s.choices.viewport.width = v;
        text(s).maxWidth = v - text(s).offsetX - right;
      }),
      slider('choice.cardHeight', 'Card height %', 70, 100, function (s) {
        return Math.round((s.choices.cardHeights['2'] * 100) / nativeCardHeight(2));
      }, function (s, v) {
        // Every line count together, each from its own art height.
        [1, 2, 3, 4].forEach(function (n) { s.choices.cardHeights[n] = Math.round((nativeCardHeight(n) * v) / 100); });
      }),
      readout('choice.heights', function (s) {
        var h = s.choices.cardHeights;
        return 'Cards ' + h['1'] + ' / ' + h['2'] + ' / ' + h['3'] + ' / ' + h['4'] + 'px for 1-4 lines';
      }),
      slider('choice.height', 'Viewport height', 200, 400, function (s) { return s.choices.viewport.height; }, function (s, v) { s.choices.viewport.height = v; }),
      slider('choice.gap', 'Card gap', 0, 40, function (s) { return s.choices.gap; }, function (s, v) { s.choices.gap = v; }),
      heading('Text'),
      slider('choice.padLeft', 'Left padding', 0, 90, function (s) { return text(s).offsetX; }, function (s, v) {
        var right = s.choices.cardWidth - text(s).offsetX - text(s).maxWidth;
        text(s).offsetX = v;
        text(s).maxWidth = s.choices.cardWidth - v - right;
      }),
      slider('choice.padRight', 'Right padding', 0, 140, function (s) {
        return s.choices.cardWidth - text(s).offsetX - text(s).maxWidth;
      }, function (s, v) {
        text(s).maxWidth = s.choices.cardWidth - text(s).offsetX - v;
      }),
      slider('choice.wrap', 'Wrap width', 300, 540, function (s) { return text(s).maxWidth; }, function (s, v) { text(s).maxWidth = v; }),
      slider('choice.textTop', 'Text top offset', -24, 24, function (s) { return text(s).offsetY; }, function (s, v) { text(s).offsetY = v; }),
      slider('choice.lineHeight', 'Line height', 16, 72, function (s) { return text(s).lineHeight; }, function (s, v) { text(s).lineHeight = v; }),
      heading('Hover and click'),
      {
        type: 'choice',
        id: 'choice.hover',
        label: 'On hover',
        options: [['none', 'Nothing'], ['marker', 'Brass tab']],
        get: function (s) { return feedback(s).hover; },
        set: function (s, v) { feedback(s).hover = v; }
      },
      {
        type: 'choice',
        id: 'choice.click',
        label: 'On click',
        options: [['press', 'Presses'], ['dim', 'Others dim'], ['slide', 'Others slide'], ['send', 'Choice sends']],
        get: function (s) { return feedback(s).click; },
        set: function (s, v) { feedback(s).click = v; }
      },
      slider('choice.markerX', 'Tab X', 0, 30, function (s) { return feedback(s).marker.x; }, function (s, v) { feedback(s).marker.x = v; }, { enabled: hasMarker }),
      slider('choice.markerY', 'Tab Y', -40, 40, function (s) { return feedback(s).marker.y; }, function (s, v) { feedback(s).marker.y = v; }, { enabled: hasMarker }),
      slider('choice.markerClip', 'Tab hides at X', 0, 24, function (s) { return feedback(s).marker.clipX; }, function (s, v) { feedback(s).marker.clipX = v; }, { enabled: hasMarker }),
      slider('choice.markerMs', 'Tab travel ms', 0, 300, function (s) { return feedback(s).marker.travelMs; }, function (s, v) { feedback(s).marker.travelMs = v; }, { enabled: hasMarker }),
      slider('choice.pressX', 'Pressed X', -2, 8, function (s) { return s.choices.pressedOffset.dx; }, function (s, v) { s.choices.pressedOffset.dx = v; }, { enabled: clickIs('press') }),
      slider('choice.pressY', 'Pressed Y', -2, 8, function (s) { return s.choices.pressedOffset.dy; }, function (s, v) { s.choices.pressedOffset.dy = v; }, { enabled: clickIs('press') }),
      slider('choice.dim', 'Dim amount %', 10, 90, function (s) { return feedback(s).dimPercent; }, function (s, v) { feedback(s).dimPercent = v; }, { enabled: clickIs('dim') }),
      slider('choice.awayMs', 'Reaction time ms', 40, 500, function (s) { return feedback(s).awayMs; }, function (s, v) { feedback(s).awayMs = v; }, { enabled: pickReacts }),
      slider('choice.sendDelay', 'Send delay ms', 0, 800, function (s) { return feedback(s).send.delayMs; }, function (s, v) { feedback(s).send.delayMs = v; }, { enabled: clickIs('send') }),
      slider('choice.sendMs', 'Send time ms', 80, 800, function (s) { return feedback(s).send.durationMs; }, function (s, v) { feedback(s).send.durationMs = v; }, { enabled: clickIs('send') }),
      slider('choice.pull', 'Pull-in strength', 1, 8, function (s) { return feedback(s).send.pull; }, function (s, v) { feedback(s).send.pull = v; }, { enabled: clickIs('send') }),
      slider('choice.vanish', 'Vanish line, from top', -60, 40, function (s) { return feedback(s).send.edgeOffset; }, function (s, v) { feedback(s).send.edgeOffset = v; }, { enabled: clickIs('send') }),
      toggle('choice.reply', 'Show reply in dialogue box', function (s) { return feedback(s).send.showReply; }, function (s, v) { feedback(s).send.showReply = v; }),
      slider('choice.beat', 'Beat before NPC answer ms', 0, 1500, function (s) { return feedback(s).send.beatMs; }, function (s, v) { feedback(s).send.beatMs = v; }, { enabled: function (s) { return feedback(s).click === 'send' && feedback(s).send.showReply; } }),
      slider('choice.holdMs', 'Hold before return ms', 100, 2000, function (s) { return feedback(s).holdMs; }, function (s, v) { feedback(s).holdMs = v; }, { enabled: pickReacts }),
      {
        type: 'buttons',
        label: 'Try it on card 1',
        buttons: [
          { id: 'choice.tryTab', label: 'Tab out / in', run: function () { lab.previewMarker(); } },
          { id: 'choice.tryPick', label: 'Pick', run: function () { lab.previewPick(0); } }
        ]
      },
      heading('Sample content'),
      slider('choice.count', 'Choice count', 1, 12, function (s) { return s.demo.choiceCount; }, function (s, v) { s.demo.choiceCount = v; }),
      { type: 'cardText', id: 'choice.text' }
    ]
  };

  // Scrollbar -------------------------------------------------------------------------------
  function track(s) {
    return s.scrollbar.track;
  }

  var scrollbarGroup = {
    id: 'scrollbar',
    label: 'Scrollbar',
    reset: function (s, b) { s.scrollbar = lab.clone(b.scrollbar); },
    rows: [
      slider('thumb.width', 'Thumb width', 8, 40, function (s) { return s.scrollbar.thumb.displayWidth; }, function (s, v) {
        var t = s.scrollbar.thumb;
        var before = t.displayWidth;
        lab.setThumbScale(t, lab.scaleForWidth(v, THUMB_NATIVE_WIDTH));
        keepCentre(t, 'x', before, t.displayWidth);
      }),
      readout('thumb.readout', function (s) {
        var t = s.scrollbar.thumb;
        return t.displayWidth + 'px wide, ' + t.capHeight + 'px caps, scale ' + t.scale;
      }),
      slider('thumb.x', 'Thumb X', 1860, 1900, function (s) { return s.scrollbar.thumb.x; }, function (s, v) { s.scrollbar.thumb.x = v; }),
      slider('track.top', 'Track top inset', 0, 60, function (s) { return track(s).y - CHANNEL_TOP; }, function (s, v) {
        var bottom = track(s).y + track(s).height;
        track(s).y = CHANNEL_TOP + v;
        track(s).height = bottom - track(s).y;
      }),
      slider('track.bottom', 'Track bottom inset', 0, 60, function (s) {
        return CHANNEL_END - (track(s).y + track(s).height);
      }, function (s, v) {
        track(s).height = CHANNEL_END - v - track(s).y;
      }),
      slider('thumb.min', 'Minimum height', 8, 200, function (s) { return s.scrollbar.thumb.minHeight; }, function (s, v) {
        s.scrollbar.thumb.minHeight = v;
      }),
      heading('Demonstrate'),
      {
        type: 'buttons',
        label: 'Thumb position',
        buttons: [
          { id: 'tune-scroll:top', label: 'Top', run: function () { lab.scrollDemo(0); } },
          { id: 'tune-scroll:middle', label: 'Middle', run: function () { lab.scrollDemo(0.5); } },
          { id: 'tune-scroll:bottom', label: 'Bottom', run: function () { lab.scrollDemo(1); } }
        ]
      },
      { type: 'note', text: 'These switch to the long list if the current one has nothing to scroll.' }
    ]
  };

  // Objective -------------------------------------------------------------------------------
  function body(s) {
    return s.objective.body;
  }

  function title(s) {
    return s.objective.title;
  }

  function plainTitleY(s) {
    return title(s).plaque.y + Math.floor((title(s).plaque.height - lab.capHeight('objective')) / 2);
  }

  var objectiveGroup = {
    id: 'objective',
    label: 'Objective',
    reset: function (s, b) { s.objective = lab.clone(b.objective); },
    rows: [
      slider('title.x', 'Title X offset', -60, 60, function (s) {
        var t = lab.clone(title(s));
        t.alignOffsetX = 0;
        return t.x - lab.centeredTitleX(t);
      }, function (s, v) {
        title(s).centered = true;
        title(s).alignOffsetX = v;
      }),
      slider('title.y', 'Title Y offset', -12, 12, function (s) { return title(s).y - plainTitleY(s); }, function (s, v) {
        title(s).y = plainTitleY(s) + v;
      }),
      slider('body.left', 'Text left padding', 0, 120, function (s) { return body(s).x - PANEL[0]; }, function (s, v) {
        var right = PANEL_RIGHT - (body(s).x + body(s).width);
        body(s).x = PANEL[0] + v;
        body(s).width = PANEL_RIGHT - right - body(s).x;
      }),
      slider('body.right', 'Text right padding', 0, 160, function (s) {
        return PANEL_RIGHT - (body(s).x + body(s).width);
      }, function (s, v) {
        body(s).width = PANEL_RIGHT - v - body(s).x;
      }),
      slider('body.top', 'Text top padding', 0, 60, function (s) { return body(s).y - PANEL[1]; }, function (s, v) {
        body(s).y = PANEL[1] + v;
      }),
      slider('body.line', 'Line spacing', 16, 72, function (s) { return body(s).lineHeight; }, function (s, v) {
        body(s).lineHeight = v;
      })
    ]
  };

  // NPC speech -------------------------------------------------------------------------------
  function speechText(s) {
    return s.speech.text;
  }

  function indicator(s) {
    return s.speech.indicator;
  }

  var speechGroup = {
    id: 'speech',
    label: 'NPC Speech',
    reset: function (s, b) {
      s.speech = lab.clone(b.speech);
      s.demo.speechSample = b.demo.speechSample;
      s.demo.speechOverride = '';
    },
    rows: [
      {
        type: 'select',
        id: 'speech.sample',
        label: 'Box shows',
        options: Object.keys(lab.samples.speech).map(function (k) { return [k, lab.samples.speech[k].label]; }),
        get: function (s) { return s.demo.speechSample; },
        set: function (s, v) { s.demo.speechSample = v; s.demo.speechOverride = ''; },
        after: function () { lab.startSpeech(); }
      },
      { type: 'note', text: 'Your line uses the Choices face, the NPC line the Dialogue face.' },
      slider('speech.left', 'Text left offset', 0, 90, function (s) { return speechText(s).x - PARCHMENT[0]; }, function (s, v) {
        speechText(s).x = PARCHMENT[0] + v;
      }),
      slider('speech.top', 'Text top offset', 0, 60, function (s) { return speechText(s).y - PARCHMENT[1]; }, function (s, v) {
        speechText(s).y = PARCHMENT[1] + v;
      }),
      slider('speech.width', 'Text width', 300, 576, function (s) { return speechText(s).width; }, function (s, v) {
        speechText(s).width = v;
      }),
      slider('speech.line', 'Line height', 16, 72, function (s) { return speechText(s).lineHeight; }, function (s, v) {
        speechText(s).lineHeight = v;
      }),
      slider('speech.gap', 'Gap between speakers', 0, 24, function (s) { return speechText(s).speakerGap; }, function (s, v) {
        speechText(s).speakerGap = v;
      }),
      heading('Overflow indicator'),
      slider('ind.x', 'Indicator X', 1880, 1912, function (s) { return indicator(s).x; }, function (s, v) { indicator(s).x = v; }),
      slider('ind.y', 'Indicator Y', 340, 430, function (s) { return indicator(s).y; }, function (s, v) { indicator(s).y = v; }),
      slider('ind.w', 'Indicator width', 2, 16, function (s) { return indicator(s).width; }, function (s, v) { indicator(s).width = v; }),
      slider('ind.h', 'Indicator track', 40, 150, function (s) { return indicator(s).height; }, function (s, v) { indicator(s).height = v; })
    ]
  };

  // Typeface ---------------------------------------------------------------------------------
  function faceOptions() {
    return Object.keys(lab.faces).map(function (id) { return [id, lab.faces[id].label]; });
  }

  function faceSummary(role, covers) {
    return function () {
      var f = lab.face(role);
      return covers + ': capitals ' + f.capHeight + 'px, natural line ' + f.lineHeight + 'px';
    };
  }

  var typefaceGroup = {
    id: 'typeface',
    label: 'Typeface',
    reset: function (s, b) { s.typeface = lab.clone(b.typeface); },
    rows: [
      { type: 'note', text: 'Each kind of text has its own face. Line height sliders stay in their own groups.' }
    ].concat([
      ['dialogue', 'Dialogue', 'NPC speech'],
      ['choices', 'Choices', 'choice cards and your lines'],
      ['labels', 'Labels', 'buttons and item names'],
      ['objective', 'Objective', 'title and text']
    ].reduce(function (rows, role) {
      return rows.concat([
        {
          type: 'select',
          id: 'type.' + role[0],
          label: role[1],
          options: faceOptions(),
          get: function (s) { return s.typeface[role[0]]; },
          set: function (s, v) { s.typeface[role[0]] = v; }
        },
        readout('type.' + role[0] + 'Info', faceSummary(role[0], role[2]))
      ]);
    }, []))
  };

  var groups = [typefaceGroup, inventoryGroup, utilityGroup, choicesGroup, scrollbarGroup, objectiveGroup, speechGroup];

  // Building -------------------------------------------------------------------------------
  var syncers = [];

  function el(tag, cls, parent, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }

  function button(parent, label, title, onClick) {
    var b = el('button', '', parent, label);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    return b;
  }

  function apply(row, value) {
    row.set(lab.state, value);
    lab.commit();
    if (row.after) row.after();
  }

  // What a row counts as "unchanged" against. The baseline has a layout for each slot count,
  // so six slots compare with the six-slot baseline, not the seven-slot default.
  function reference() {
    var count = lab.state.inventory.slotCount;
    if (!referenceFor[count]) {
      var saved = lab.state;
      lab.state = lab.clone(lab.baseline);
      lab.state.inventory.slotCount = count;
      lab.normalize();
      referenceFor[count] = lab.state;
      lab.state = saved;
    }
    return referenceFor[count];
  }
  var referenceFor = {};

  function buildSlider(parent, row) {
    var line = el('div', 'tune', parent);
    line.dataset.tune = row.id;
    var label = el('label', '', line, row.label);
    var range = el('input', '', line);
    range.type = 'range';
    range.min = row.min;
    range.max = row.max;
    range.step = 1;
    range.setAttribute('aria-label', row.label);
    label.addEventListener('click', function () { range.focus(); });

    var number = el('input', '', line);
    number.type = 'number';
    number.min = row.min;
    number.max = row.max;
    number.step = 1;
    number.setAttribute('aria-label', row.label + ' value');

    var minus = button(line, '−', 'Down 1', function () { step(-1); });
    var plus = button(line, '+', 'Up 1', function () { step(1); });
    var reset = button(line, '↺', 'Reset ' + row.label, function () {
      apply(row, row.get(reference()));
    });
    reset.className = 'reset';

    function step(delta) {
      apply(row, lab.clamp(row.get(lab.state) + delta, row.min, row.max));
    }

    range.addEventListener('input', function () { apply(row, Number(range.value)); });

    // While typing, a partial number such as the 1 of 14 must not be forced into range.
    number.addEventListener('input', function () {
      var value = Number(number.value);
      if (number.value !== '' && Number.isInteger(value) && value >= row.min && value <= row.max) apply(row, value);
    });
    number.addEventListener('change', function () {
      var value = Math.round(Number(number.value));
      apply(row, Number.isFinite(value) && number.value !== '' ? lab.clamp(value, row.min, row.max) : row.get(lab.state));
      number.value = row.get(lab.state);
    });

    syncers.push(function () {
      var value = row.get(lab.state);
      var on = !row.enabled || row.enabled(lab.state);
      range.value = value;
      if (document.activeElement !== number) number.value = value;
      range.disabled = number.disabled = minus.disabled = plus.disabled = !on;
      line.classList.toggle('off', !on);
      line.classList.toggle('modified', on && value !== row.get(reference()));
    });
    return row;
  }

  function buildToggle(parent, row) {
    var label = el('label', 'tune-toggle', parent);
    label.dataset.tune = row.id;
    var box = el('input', '', label);
    box.type = 'checkbox';
    label.appendChild(document.createTextNode(row.label));
    box.addEventListener('change', function () { apply(row, box.checked); });
    syncers.push(function () {
      box.checked = row.get(lab.state);
      label.classList.toggle('modified', box.checked !== row.get(reference()));
    });
  }

  function buildChoice(parent, row) {
    var line = el('div', 'tune-choice', parent);
    line.dataset.tune = row.id;
    el('span', '', line, row.label);
    var seg = el('div', 'seg', line);
    var buttons = row.options.map(function (option) {
      var b = button(seg, option[1], '', function () { apply(row, option[0]); });
      b.dataset.value = option[0];
      return b;
    });
    syncers.push(function () {
      var value = row.get(lab.state);
      buttons.forEach(function (b, i) { b.setAttribute('aria-pressed', row.options[i][0] === value); });
      var unchanged = row.fixedBaseline ? row.get(lab.baseline) : row.get(reference());
      line.classList.toggle('modified', value !== unchanged);
    });
  }

  function buildSelect(parent, row) {
    var line = el('label', 'tune-choice', parent);
    line.dataset.tune = row.id;
    el('span', '', line, row.label);
    var select = el('select', '', line);
    row.options.forEach(function (option) {
      var o = el('option', '', select, option[1]);
      o.value = option[0];
    });
    select.addEventListener('change', function () { apply(row, select.value); });
    syncers.push(function () {
      var value = row.get(lab.state);
      if (select.value !== value) select.value = value;
      line.classList.toggle('modified', value !== row.get(reference()));
    });
  }

  function buildButtons(parent, row) {
    el('p', 'note', parent, row.label);
    var line = el('div', 'row', parent);
    row.buttons.forEach(function (b) {
      button(line, b.label, '', b.run).dataset.tuneAction = b.id;
    });
  }

  function buildReadout(parent, row) {
    var line = el('p', 'note tune-readout', parent);
    line.dataset.tune = row.id;
    syncers.push(function () { line.textContent = row.text(lab.state); });
  }

  // One text box per visible card. Rebuilt only when the number of cards changes, and the
  // choice-count slider that causes that lives outside this list.
  function buildCardText(parent) {
    var box = el('details', 'tune-advanced', parent);
    el('summary', '', box, 'Edit card text');
    var list = el('div', '', box);
    list.dataset.cardList = 'true';
    var inputs = [];
    syncers.push(function () {
      var cards = lab.cardLayout();
      if (cards.length !== inputs.length) {
        list.textContent = '';
        inputs = cards.map(function (card, i) {
          var input = el('textarea', '', list);
          input.rows = 2;
          input.dataset.cardText = i;
          input.setAttribute('aria-label', 'Choice ' + (i + 1) + ' text');
          input.addEventListener('input', function () {
            var demo = lab.state.demo;
            var key = demo.choiceSet + ':' + i;
            demo.cardOverrides[key] = Object.assign({}, demo.cardOverrides[key], { text: input.value });
            lab.commit();
          });
          return input;
        });
      }
      cards.forEach(function (card, i) {
        if (document.activeElement !== inputs[i]) inputs[i].value = card.text;
      });
    });
  }

  function buildRow(parent, row) {
    if (row.type === 'slider') buildSlider(parent, row);
    else if (row.type === 'toggle') buildToggle(parent, row);
    else if (row.type === 'choice') buildChoice(parent, row);
    else if (row.type === 'select') buildSelect(parent, row);
    else if (row.type === 'buttons') buildButtons(parent, row);
    else if (row.type === 'readout') buildReadout(parent, row);
    else if (row.type === 'cardText') buildCardText(parent);
    else if (row.type === 'heading') el('h4', '', parent, row.text);
    else if (row.type === 'note') el('p', 'note', parent, row.text);
    else if (row.type === 'advanced') {
      var box = el('details', 'tune-advanced', parent);
      el('summary', '', box, row.label);
      row.rows.forEach(function (r) { buildRow(box, r); });
    }
  }

  function buildGroup(host, group) {
    var box = el('details', 'tune-group', host);
    box.open = !!group.open;
    box.dataset.group = group.id;
    var summary = el('summary', '', box, group.label);
    var badge = el('span', 'badge', summary);
    var body = el('div', 'tune-body', box);
    var resetGroup = button(body, 'Reset group', '', function () {
      group.reset(lab.state, lab.baseline);
      lab.startSpeechIfReset(group.id);
      lab.commit();
    });
    resetGroup.className = 'reset-group';
    resetGroup.dataset.resetGroup = group.id;
    group.rows.forEach(function (row) { buildRow(body, row); });
    syncers.push(function () {
      var count = body.querySelectorAll('.tune.modified, .tune-toggle.modified, .tune-choice.modified').length;
      badge.textContent = count ? count + ' changed' : '';
    });
  }

  lab.startSpeechIfReset = function (groupId) {
    if (groupId === 'speech') lab.startSpeech();
  };

  lab.buildTuning = function () {
    var host = document.getElementById('tuningGroups');
    groups.forEach(function (group) { buildGroup(host, group); });
  };

  lab.syncTuning = function () {
    syncers.forEach(function (run) { run(); });
  };

  // Every slider definition, for QA to walk.
  lab.tuningRows = function () {
    var out = [];
    (function walk(rows) {
      rows.forEach(function (r) {
        if (r.type === 'slider') out.push({ id: r.id, min: r.min, max: r.max });
        if (r.rows) walk(r.rows);
      });
    })(groups.reduce(function (all, g) { return all.concat(g.rows); }, []));
    return out;
  };
})();
