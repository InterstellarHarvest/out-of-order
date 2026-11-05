// Component registry, inspector fields, group moves, compare presets and the live fit report.
(function () {
  'use strict';

  var lab = window.M1Lab;

  function st() {
    return lab.state;
  }

  function intOf(value, fallback) {
    var n = Math.round(Number(value));
    return Number.isFinite(n) ? n : fallback;
  }

  // Display size always comes from the unchanged native size and a scale, and is kept whole.
  function setScale(comp, native, scale) {
    var value = Number(scale);
    if (!(value > 0)) return;
    var size = lab.displaySize(native, value);
    comp.scale = value;
    comp.displayWidth = size[0];
    comp.displayHeight = size[1];
  }

  lab.setScale = setScale;

  // Scales stay to four places, which is enough to land every width on a whole pixel.
  lab.scaleForWidth = function (width, nativeWidth) {
    return Math.round((width / nativeWidth) * 10000) / 10000;
  };

  function setThumbScale(thumb, scale) {
    var value = Number(scale);
    if (!(value > 0)) return;
    thumb.scale = value;
    thumb.displayWidth = Math.max(1, Math.round(40 * value));
    thumb.capHeight = Math.max(1, Math.round(20 * value));
  }

  lab.setThumbScale = setThumbScale;

  function freeUtility() {
    st().utility.align = 'free';
    st().utility.centerVertically = false;
  }

  function arrowNative(comp) {
    return lab.spriteSize(comp.spriteFamily + '_up');
  }

  var fieldXY = function (obj) {
    return [
      { key: 'x', label: 'X', type: 'pos', get: function () { return obj().x; }, set: function (v) { obj().x = v; } },
      { key: 'y', label: 'Y', type: 'pos', get: function () { return obj().y; }, set: function (v) { obj().y = v; } }
    ];
  };

  function fieldVisible(obj) {
    return { key: 'visible', label: 'Visible', type: 'bool', get: function () { return obj().visible; }, set: function (v) { obj().visible = v; } };
  }

  function fieldState(obj) {
    return {
      key: 'heldState',
      label: 'UP/DOWN',
      type: 'select',
      options: [['up', 'UP (live press works)'], ['down', 'Held DOWN']],
      get: function () { return obj().heldState; },
      set: function (v) { obj().heldState = v; }
    };
  }

  function fieldScale(obj, native) {
    return {
      key: 'scale',
      label: 'Display scale',
      type: 'scale',
      get: function () { return obj().scale; },
      set: function (v) { setScale(obj(), native(), v); },
      size: function () { return obj().displayWidth + '×' + obj().displayHeight + ' (native ' + native().join('×') + ')'; },
      setWidth: function (w) { setScale(obj(), native(), w / native()[0]); }
    };
  }

  function fieldNumber(label, get, set) {
    return { label: label, type: 'number', get: get, set: set };
  }

  function arrowComponent(name, key) {
    var obj = function () { return st().inventory[key]; };
    return {
      label: name,
      group: 'inventory',
      rect: function () { var c = obj(); return [c.x, c.y, c.displayWidth, c.displayHeight]; },
      move: function (dx, dy) { var c = obj(); c.x += dx; c.y += dy; },
      fields: function () {
        return fieldXY(obj).concat([fieldVisible(obj), fieldState(obj), fieldScale(obj, function () { return arrowNative(obj()); })]);
      },
      reset: function () { st().inventory[key] = lab.clone(lab.baseline.inventory[key]); }
    };
  }

  function utilityComponent(index) {
    var obj = function () { return st().utility.buttons[index]; };
    return {
      label: lab.baseline.utility.buttons[index].label + ' button',
      group: 'utility',
      rect: function () { var c = obj(); return [c.x, c.y, c.displayWidth, c.displayHeight]; },
      move: function (dx, dy) { var c = obj(); c.x += dx; c.y += dy; freeUtility(); },
      fields: function () {
        var native = function () { return lab.spriteSize(obj().spriteFamily + '_up'); };
        var xy = fieldXY(obj).map(function (f) {
          var set = f.set;
          f.set = function (v) { set(v); freeUtility(); };
          return f;
        });
        var scale = fieldScale(obj, native);
        var setSize = scale.set;
        scale.set = function (v) { setSize(v); st().utility.sizeLinked = false; };
        return xy.concat([
          fieldVisible(obj),
          {
            label: 'Sprite variant',
            type: 'select',
            options: [['utility_a', 'A blue'], ['utility_b', 'B grey'], ['utility_c', 'C sage']],
            get: function () { return obj().spriteFamily; },
            set: function (v) { obj().spriteFamily = v; }
          },
          fieldState(obj),
          scale,
          { label: 'Label text', type: 'text', get: function () { return obj().label; }, set: function (v) { obj().label = v; } },
          fieldNumber('Label offset X', function () { return obj().labelOffset.dx; }, function (v) { obj().labelOffset.dx = v; }),
          fieldNumber('Label offset Y', function () { return obj().labelOffset.dy; }, function (v) { obj().labelOffset.dy = v; })
        ]);
      },
      reset: function () { st().utility.buttons[index] = lab.clone(lab.baseline.utility.buttons[index]); }
    };
  }

  function cardRef(id) {
    return lab.cardLayout()[Number(id.slice(7))];
  }

  function cardOverride(id) {
    var key = st().demo.choiceSet + ':' + id.slice(7);
    if (!st().demo.cardOverrides[key]) st().demo.cardOverrides[key] = {};
    return st().demo.cardOverrides[key];
  }

  function choiceCardComponent(id) {
    return {
      label: 'Choice card ' + (Number(id.slice(7)) + 1),
      group: 'choices',
      rect: function () {
        var v = st().choices.viewport;
        var c = cardRef(id) || { y: 0, height: 0 };
        return [v.x, v.y + c.y - lab.rt.choiceScroll, st().choices.cardWidth, c.height];
      },
      move: function () {},
      fields: function () {
        return [
          { type: 'info', text: 'Cards take their position from the choice viewport. The line count picks the sprite height.' },
          {
            label: 'Sprite variant',
            type: 'select',
            options: [['a', 'A'], ['b', 'B'], ['c', 'C']],
            get: function () { return cardRef(id).variant; },
            set: function (v) { cardOverride(id).variant = v; }
          },
          { label: 'Text', type: 'textarea', get: function () { return cardRef(id).text; }, set: function (v) { cardOverride(id).text = v; } }
        ];
      },
      reset: function () { delete st().demo.cardOverrides[st().demo.choiceSet + ':' + id.slice(7)]; }
    };
  }

  var components = {
    shell: {
      label: 'Canonical shell (locked)',
      group: 'shell',
      rect: function () { return [0, 0, 1920, 1080]; },
      move: function () {},
      fields: function () {
        return [{ type: 'info', text: 'layout-final.png, blob ' + st().shell.gitBlob.slice(0, 12) + '. Immutable, so nothing here can move it.' }];
      },
      reset: function () {}
    },
    'inv-slots': {
      label: 'Inventory slots',
      group: 'inventory',
      rect: function () {
        var inv = st().inventory;
        var l = inv.slotLayouts[inv.slotCount];
        return [l.x, l.y, (inv.slotCount - 1) * inv.pitch + inv.slotSize[0], inv.slotSize[1]];
      },
      move: function (dx, dy) {
        var inv = st().inventory;
        var l = inv.slotLayouts[inv.slotCount];
        l.x += dx;
        l.y += dy;
        inv.centerGroup = false;
      },
      fields: function () {
        var layout = function () { var inv = st().inventory; return inv.slotLayouts[inv.slotCount]; };
        return fieldXY(layout).concat([
          { label: 'Visible', type: 'bool', get: function () { return st().inventory.visible; }, set: function (v) { st().inventory.visible = v; } },
          {
            label: 'Slot count',
            type: 'select',
            options: [['7', '7 slots (baseline)'], ['6', '6 slots (comparison)']],
            get: function () { return String(st().inventory.slotCount); },
            set: function (v) { st().inventory.slotCount = Number(v); }
          },
          fieldNumber('Pitch', function () { return st().inventory.pitch; }, function (v) { st().inventory.pitch = v; }),
          { type: 'info', text: 'The approved 96×96 slot is never resized. Six slots keep the same sprite.' }
        ]);
      },
      reset: function () {
        var b = lab.baseline.inventory;
        var inv = st().inventory;
        inv.slotLayouts = lab.clone(b.slotLayouts);
        inv.slotCount = b.slotCount;
        inv.pitch = b.pitch;
        inv.visible = b.visible;
      }
    },
    'inv-left': arrowComponent('Left arrow', 'leftArrow'),
    'inv-right': arrowComponent('Right arrow', 'rightArrow'),
    'util-inspect': utilityComponent(0),
    'util-notes': utilityComponent(1),
    'util-journal': utilityComponent(2),
    'choice-viewport': {
      label: 'Choice viewport',
      group: 'choices',
      rect: function () { var v = st().choices.viewport; return [v.x, v.y, v.width, v.height]; },
      move: function (dx, dy) { var v = st().choices.viewport; v.x += dx; v.y += dy; },
      fields: function () {
        var v = function () { return st().choices.viewport; };
        var c = function () { return st().choices; };
        return fieldXY(v).concat([
          { label: 'Visible', type: 'bool', get: function () { return c().visible; }, set: function (x) { c().visible = x; } },
          fieldNumber('Viewport H', function () { return v().height; }, function (x) { v().height = x; }),
          fieldNumber('Card gap', function () { return c().gap; }, function (x) { c().gap = x; }),
          fieldNumber('Text offset X', function () { return c().text.offsetX; }, function (x) { c().text.offsetX = x; }),
          fieldNumber('Text width', function () { return c().text.maxWidth; }, function (x) { c().text.maxWidth = x; }),
          fieldNumber('Text line height', function () { return c().text.lineHeight; }, function (x) { c().text.lineHeight = x; }),
          fieldNumber('Press X', function () { return c().pressedOffset.dx; }, function (x) { c().pressedOffset.dx = x; }),
          fieldNumber('Press Y', function () { return c().pressedOffset.dy; }, function (x) { c().pressedOffset.dy = x; })
        ]);
      },
      reset: function () { st().choices = lab.clone(lab.baseline.choices); }
    },
    'scroll-thumb': {
      label: 'Scrollbar thumb',
      group: 'choices',
      rect: function () { var m = lab.thumbMetrics(); return [m.x, m.y, m.width, m.height]; },
      move: function (dx, dy) {
        var sb = st().scrollbar;
        sb.thumb.x += dx;
        sb.track.y += dy;
      },
      fields: function () {
        var t = function () { return st().scrollbar.thumb; };
        var tr = function () { return st().scrollbar.track; };
        return [
          { type: 'info', text: 'The thumb x is independent; y comes from scroll position within the track bounds below.' },
          { label: 'X', type: 'pos', get: function () { return t().x; }, set: function (v) { t().x = v; } },
          fieldVisible(t),
          {
            label: 'Display scale',
            type: 'scale',
            get: function () { return t().scale; },
            set: function (v) { setThumbScale(t(), v); },
            size: function () { return t().displayWidth + 'px wide, ' + t().capHeight + 'px caps (native 40px, 20px visible caps)'; },
            setWidth: function (w) { setThumbScale(t(), w / 40); }
          },
          fieldNumber('Track X', function () { return tr().x; }, function (v) { tr().x = v; }),
          fieldNumber('Track Y', function () { return tr().y; }, function (v) { tr().y = v; }),
          fieldNumber('Track W', function () { return tr().width; }, function (v) { tr().width = v; }),
          fieldNumber('Track H', function () { return tr().height; }, function (v) { tr().height = v; })
        ];
      },
      reset: function () { st().scrollbar = lab.clone(lab.baseline.scrollbar); }
    },
    'speech-text': {
      label: 'NPC speech text',
      group: 'speech',
      rect: function () { var t = st().speech.text; return [t.x, t.y, t.width, t.height]; },
      move: function (dx, dy) { var t = st().speech.text; t.x += dx; t.y += dy; },
      fields: function () {
        var t = function () { return st().speech.text; };
        return fieldXY(t).concat([
          fieldVisible(t),
          fieldNumber('Width', function () { return t().width; }, function (v) { t().width = v; }),
          fieldNumber('Height', function () { return t().height; }, function (v) { t().height = v; }),
          fieldNumber('Line height', function () { return t().lineHeight; }, function (v) { t().lineHeight = v; }),
          {
            label: 'Text',
            type: 'textarea',
            get: function () { return lab.npcText(); },
            set: function (v) { st().demo.speechOverride = v; lab.startSpeech(); }
          }
        ]);
      },
      reset: function () {
        st().speech.text = lab.clone(lab.baseline.speech.text);
        st().demo.speechOverride = '';
        lab.startSpeech();
      }
    },
    'speech-indicator': {
      label: 'Speech overflow indicator',
      group: 'speech',
      rect: function () { var i = st().speech.indicator; return [i.x, i.y, i.width, i.height]; },
      move: function (dx, dy) { var i = st().speech.indicator; i.x += dx; i.y += dy; },
      fields: function () {
        var i = function () { return st().speech.indicator; };
        return fieldXY(i).concat([
          fieldNumber('Width', function () { return i().width; }, function (v) { i().width = v; }),
          fieldNumber('Track H', function () { return i().height; }, function (v) { i().height = v; }),
          { type: 'info', text: 'No approved sprite exists for this indicator. It is a code-drawn placeholder.' }
        ]);
      },
      reset: function () { st().speech.indicator = lab.clone(lab.baseline.speech.indicator); }
    },
    'obj-title': {
      label: 'Objective title',
      group: 'objective',
      rect: function () {
        var t = st().objective.title;
        return [t.x, t.y, lab.inkWidth(t.text, 'objective'), lab.lineHeightOf('objective')];
      },
      move: function (dx, dy) {
        var t = st().objective.title;
        t.x += dx;
        t.y += dy;
        if (dx) t.centered = false;
      },
      fields: function () {
        var t = function () { return st().objective.title; };
        return [
          { label: 'X', type: 'pos', get: function () { return t().x; }, set: function (v) { t().x = v; t().centered = false; } },
          { label: 'Y', type: 'pos', get: function () { return t().y; }, set: function (v) { t().y = v; } },
          fieldVisible(t),
          { label: 'Auto-centre', type: 'bool', get: function () { return t().centered; }, set: function (v) { t().centered = v; } },
          { label: 'Text', type: 'text', get: function () { return t().text; }, set: function (v) { t().text = v; } },
          { type: 'info', text: 'Centred on the measured plaque opening, x' + t().plaque.x + ' width ' + t().plaque.width + ', using glyph widths.' }
        ];
      },
      reset: function () { st().objective.title = lab.clone(lab.baseline.objective.title); }
    },
    'obj-body': {
      label: 'Objective body',
      group: 'objective',
      rect: function () {
        var b = st().objective.body;
        return [b.x, b.y, b.width, lab.wrap(b.text, b.width, 'objective').length * b.lineHeight];
      },
      move: function (dx, dy) { var b = st().objective.body; b.x += dx; b.y += dy; },
      fields: function () {
        var b = function () { return st().objective.body; };
        return fieldXY(b).concat([
          fieldVisible(b),
          fieldNumber('Width', function () { return b().width; }, function (v) { b().width = v; }),
          { label: 'Text', type: 'textarea', get: function () { return b().text; }, set: function (v) { b().text = v; } }
        ]);
      },
      reset: function () { st().objective.body = lab.clone(lab.baseline.objective.body); }
    }
  };

  var groups = {
    shell: { label: 'Shell', members: ['shell'] },
    inventory: { label: 'Inventory', members: ['inv-slots', 'inv-left', 'inv-right'] },
    utility: { label: 'Utility buttons', members: ['util-inspect', 'util-notes', 'util-journal'] },
    choices: { label: 'Choices', members: ['choice-viewport', 'scroll-thumb'] },
    speech: { label: 'NPC speech', members: ['speech-text', 'speech-indicator'] },
    objective: { label: 'Objective', members: ['obj-title', 'obj-body'] }
  };

  function componentFor(id) {
    if (components[id]) return components[id];
    if (/^choice-\d+$/.test(id) && cardRef(id)) return choiceCardComponent(id);
    return null;
  }

  function groupRect(id) {
    var rects = groups[id].members.map(function (m) { return components[m].rect(); });
    var x0 = Math.min.apply(null, rects.map(function (r) { return r[0]; }));
    var y0 = Math.min.apply(null, rects.map(function (r) { return r[1]; }));
    var x1 = Math.max.apply(null, rects.map(function (r) { return r[0] + r[2]; }));
    var y1 = Math.max.apply(null, rects.map(function (r) { return r[1] + r[3]; }));
    return [x0, y0, x1 - x0, y1 - y0];
  }

  lab.rectOf = function (id) {
    if (groups[id]) return groupRect(id);
    var c = componentFor(id);
    return c ? c.rect() : null;
  };

  lab.moveSelected = function (dx, dy) {
    var id = lab.selected;
    if (groups[id]) groups[id].members.forEach(function (m) { components[m].move(dx, dy); });
    else if (componentFor(id)) componentFor(id).move(dx, dy);
    lab.commit();
  };

  lab.select = function (id) {
    lab.selected = id;
    renderTree();
    renderInspector();
    lab.renderSelection();
  };

  function groupFields(id) {
    if (id === 'utility') {
      var u = function () { return st().utility; };
      return [
        {
          label: 'Display scale',
          type: 'scale',
          get: function () { return u().buttons[0].scale; },
          set: function (v) {
            u().buttons.forEach(function (b) { setScale(b, lab.spriteSize(b.spriteFamily + '_up'), v); });
            freeUtility();
          },
          size: function () { return u().buttons[0].displayWidth + '×' + u().buttons[0].displayHeight + ' (native 243×205)'; },
          setWidth: function (w) {
            u().buttons.forEach(function (b) { setScale(b, [243, 205], w / 243); });
            freeUtility();
          }
        },
        fieldNumber('Button pitch', function () { return u().buttons[1].x - u().buttons[0].x; }, function (v) {
          freeUtility();
          u().buttons.forEach(function (b, i) { b.x = u().buttons[0].x + i * v; });
        }),
        fieldNumber('Press label X', function () { return u().pressedLabelOffset.dx; }, function (v) { u().pressedLabelOffset.dx = v; }),
        fieldNumber('Press label Y', function () { return u().pressedLabelOffset.dy; }, function (v) { u().pressedLabelOffset.dy = v; }),
        {
          type: 'action',
          label: 'Distribute evenly in bay',
          run: function () {
            var band = lab.measured.regions.utilityBay.clearBandH114;
            var w = u().buttons[0].displayWidth;
            var gap = Math.floor((band[2] - 3 * w) / 4);
            freeUtility();
            u().buttons.forEach(function (b, i) { b.x = band[0] + gap + i * (w + gap); });
          }
        }
      ];
    }
    return [{ type: 'info', text: 'Moves every member of this group together.' }];
  }

  // Tree ---------------------------------------------------------------------------
  function treeButton(parent, id, text, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.dataset.select = id;
    if (cls) b.className = cls;
    if (lab.selected === id) b.setAttribute('aria-current', 'true');
    parent.appendChild(b);
  }

  var treeKey = null;

  function cardLabel(card) {
    return 'Choice card ' + (card.index + 1) + ' (' + card.lines + ' line ' + card.variant.toUpperCase() + ')';
  }

  function renderTree() {
    var tree = document.getElementById('tree');
    var cards = lab.cardLayout();
    var key = lab.selected + '|' + cards.length;
    if (key === treeKey) {
      // A wrap change alters a card's line count, not the list, so only its label needs updating.
      cards.forEach(function (card) {
        tree.querySelector('[data-select="' + card.id + '"]').textContent = cardLabel(card);
      });
      return;
    }
    treeKey = key;
    tree.textContent = '';
    Object.keys(groups).forEach(function (gid) {
      var box = document.createElement('div');
      box.className = 'group';
      if (gid !== 'shell') treeButton(box, gid, groups[gid].label, 'group-head');
      groups[gid].members.forEach(function (m) { treeButton(box, m, components[m].label); });
      if (gid === 'choices') {
        lab.cardLayout().forEach(function (card) {
          treeButton(box, card.id, cardLabel(card));
        });
      }
      tree.appendChild(box);
    });
  }

  // Inspector ---------------------------------------------------------------------
  // Built once per selection. Edits only push values into these elements through `syncers`,
  // so a control being dragged or typed in is never removed from under the pointer.
  var syncers = [];

  function fieldRow(parent, label) {
    var row = document.createElement('div');
    row.className = 'field';
    var title = document.createElement('span');
    title.textContent = label;
    row.appendChild(title);
    parent.appendChild(row);
    return row;
  }

  function setUnlessEditing(input, value) {
    if (document.activeElement !== input) input.value = value;
  }

  function nudgeButtons(host, f) {
    [[-5, '-5'], [-1, '-1'], [1, '+1'], [5, '+5']].forEach(function (step) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = step[1];
      b.dataset.nudge = (f.key || 'x') + ':' + step[0];
      b.addEventListener('click', function () {
        f.set(f.get() + step[0]);
        lab.commit();
      });
      host.appendChild(b);
    });
  }

  function addField(parent, f) {
    if (f.type === 'info') {
      var p = document.createElement('p');
      p.className = 'note';
      p.textContent = f.text;
      parent.appendChild(p);
      return;
    }
    if (f.type === 'action') {
      var a = document.createElement('button');
      a.type = 'button';
      a.textContent = f.label;
      a.addEventListener('click', function () {
        f.run();
        lab.commit();
      });
      parent.appendChild(a);
      return;
    }
    var row = fieldRow(parent, f.label);
    var host = document.createElement('div');
    host.className = 'nudges';
    row.appendChild(host);
    if (f.type === 'pos' || f.type === 'number') {
      var num = document.createElement('input');
      num.type = 'number';
      num.step = '1';
      num.dataset.field = f.key || f.label;
      num.addEventListener('change', function () {
        f.set(intOf(num.value, f.get()));
        num.value = f.get();
        lab.commit();
      });
      host.appendChild(num);
      if (f.type === 'pos') nudgeButtons(host, f);
      syncers.push(function () { setUnlessEditing(num, f.get()); });
    } else if (f.type === 'bool') {
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.dataset.field = f.key || f.label;
      box.addEventListener('change', function () {
        f.set(box.checked);
        lab.commit();
      });
      host.appendChild(box);
      syncers.push(function () { box.checked = f.get(); });
    } else if (f.type === 'select') {
      var select = document.createElement('select');
      select.dataset.field = f.key || f.label;
      f.options.forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o[0];
        opt.textContent = o[1];
        select.appendChild(opt);
      });
      select.addEventListener('change', function () {
        f.set(select.value);
        lab.commit();
      });
      host.appendChild(select);
      syncers.push(function () { select.value = f.get(); });
    } else if (f.type === 'scale') {
      var scale = document.createElement('input');
      scale.type = 'number';
      scale.step = '0.0001';
      scale.min = '0.05';
      scale.dataset.field = 'scale';
      scale.addEventListener('change', function () {
        f.set(scale.value);
        lab.commit();
      });
      host.appendChild(scale);
      var size = fieldRow(parent, 'Display size');
      var label = document.createElement('span');
      size.appendChild(label);
      syncers.push(function () {
        setUnlessEditing(scale, f.get());
        label.textContent = f.size();
      });
    } else {
      var text = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
      if (f.type === 'text') text.type = 'text';
      else text.rows = 4;
      text.dataset.field = 'text';
      text.addEventListener('change', function () {
        f.set(text.value);
        lab.commit();
      });
      host.style.flex = '1';
      host.appendChild(text);
      var warn = document.createElement('p');
      warn.className = 'note bad';
      parent.appendChild(warn);
      syncers.push(function () {
        setUnlessEditing(text, f.get());
        var missing = lab.unmappedChars(f.get());
        warn.hidden = !missing.length;
        warn.textContent = 'No glyph for: ' + missing.join(' ') + '. These draw as "?".';
      });
    }
  }

  function renderInspector() {
    var box = document.getElementById('inspector');
    box.textContent = '';
    syncers = [];
    var id = lab.selected;
    var head = document.createElement('p');
    var group = groups[id];
    var comp = componentFor(id);
    if (!group && !comp) {
      lab.selected = 'utility';
      renderInspector();
      return;
    }
    var isSingleGroup = group && !comp;
    var strong = document.createElement('strong');
    strong.textContent = isSingleGroup ? group.label + ' (group)' : comp.label;
    head.appendChild(strong);
    box.appendChild(head);
    if (isSingleGroup) {
      var delta = fieldRow(box, '');
      syncers.push(function () {
        var r = groupRect(id);
        delta.firstChild.textContent = 'Group at ' + r[0] + ', ' + r[1];
      });
      var moves = document.createElement('div');
      moves.className = 'nudges';
      [['X', 1, 0], ['Y', 0, 1]].forEach(function (axis) {
        [-5, -1, 1, 5].forEach(function (step) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = axis[0] + (step > 0 ? '+' : '') + step;
          b.dataset.groupNudge = axis[0] + ':' + step;
          b.addEventListener('click', function () { lab.moveSelected(axis[1] * step, axis[2] * step); });
          moves.appendChild(b);
        });
      });
      moves.style.flexWrap = 'wrap';
      delta.appendChild(moves);
      groupFields(id).forEach(function (f) { addField(box, f); });
    } else {
      comp.fields().forEach(function (f) { addField(box, f); });
      var reset = document.createElement('button');
      reset.type = 'button';
      reset.textContent = 'Reset this element';
      reset.addEventListener('click', function () {
        comp.reset();
        lab.commit();
      });
      box.appendChild(reset);
    }
    var note = document.createElement('p');
    note.className = 'note';
    note.id = 'selectionRect';
    box.appendChild(note);
    syncers.push(function () {
      var r = lab.rectOf(lab.selected);
      if (r) note.textContent = 'x ' + r[0] + '  y ' + r[1] + '  w ' + r[2] + '  h ' + r[3];
    });
    syncers.forEach(function (run) { run(); });
  }

  // Compare presets ---------------------------------------------------------------
  lab.applyPreset = function (kind, key) {
    var p = lab.presets[kind][key];
    var s = st();
    if (kind === 'inventoryStarters') {
      var inv = s.inventory;
      inv.slotCount = p.slotCount;
      inv.gap = p.gap;
      inv.pitchLocked = true;
      inv.centerGroup = false;
      inv.arrowsSymmetric = p.symmetric;
      inv.arrowSizeLinked = true;
      inv.slotLayouts = lab.clone(lab.baseline.inventory.slotLayouts);
      [['leftArrow', p.leftX], ['rightArrow', p.rightX]].forEach(function (pair) {
        var c = inv[pair[0]];
        setScale(c, arrowNative(c), lab.scaleForWidth(p.arrowWidth, arrowNative(c)[0]));
        c.x = pair[1];
        c.y = p.y;
      });
    } else if (kind === 'arrows') {
      s.inventory.centerGroup = false;
      s.inventory.arrowsSymmetric = false;
      [['leftArrow', p.left], ['rightArrow', p.right]].forEach(function (pair) {
        var c = s.inventory[pair[0]];
        c.x = pair[1].x;
        c.y = pair[1].y;
        setScale(c, arrowNative(c), pair[1].scale);
      });
    } else if (kind === 'utility') {
      freeUtility();
      s.utility.sizeLinked = true;
      s.utility.buttons.forEach(function (b, i) {
        b.x = p.x[i];
        b.y = p.y;
        setScale(b, lab.spriteSize(b.spriteFamily + '_up'), p.scale);
      });
    } else if (kind === 'thumb') {
      s.scrollbar.thumb.x = p.x;
      setThumbScale(s.scrollbar.thumb, p.scale);
    }
    lab.commit();
  };

  function demoRow(parent, title, buttons) {
    var label = document.createElement('p');
    label.className = 'note';
    label.textContent = title;
    parent.appendChild(label);
    var row = document.createElement('div');
    row.className = 'row';
    buttons.forEach(function (b) {
      var node = document.createElement('button');
      node.type = 'button';
      node.textContent = b.label;
      if (b.id) node.dataset.demo = b.id;
      node.addEventListener('click', b.run);
      row.appendChild(node);
    });
    parent.appendChild(row);
  }

  var demoSyncers = [];

  function selectRow(parent, title, id, options, value, onChange) {
    var row = fieldRow(parent, title);
    var select = document.createElement('select');
    select.id = id;
    options.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o[0];
      opt.textContent = o[1];
      select.appendChild(opt);
    });
    select.addEventListener('change', function () { onChange(select.value); });
    row.appendChild(select);
    demoSyncers.push(function () { select.value = value(); });
  }

  function presetButtons(kind) {
    return Object.keys(lab.presets[kind])
      .filter(function (k) { return k !== 'note'; })
      .map(function (k) {
        return { id: kind + ':' + k, label: lab.presets[kind][k].label, run: function () { lab.applyPreset(kind, k); } };
      });
  }

  lab.setChoiceSet = function (id) {
    st().demo.choiceSet = id;
    st().demo.choiceCount = lab.samples.choiceSets[id].cards.length;
    lab.rt.choiceScroll = 0;
    lab.commit();
  };

  function buildDemos() {
    var box = document.getElementById('demos');
    demoRow(box, 'Inventory slot count (arrows stay where they are)', [
      { id: 'slots:7', label: 'Seven slots', run: function () { st().inventory.slotCount = 7; lab.commit(); } },
      { id: 'slots:6', label: 'Six slots', run: function () { st().inventory.slotCount = 6; lab.commit(); } }
    ]);
    demoRow(box, 'Arrows: native or fit-to-bay', presetButtons('arrows'));
    demoRow(box, 'Utility buttons: native or fit-to-bay', presetButtons('utility'));
    demoRow(box, 'Scrollbar thumb: native or fit-to-channel', presetButtons('thumb'));
    selectRow(box, 'Choice list', 'choiceSet',
      Object.keys(lab.samples.choiceSets).map(function (k) { return [k, lab.samples.choiceSets[k].label]; }),
      function () { return st().demo.choiceSet; },
      lab.setChoiceSet);
    selectRow(box, 'Card variants', 'variantMode', [['cycle', 'A, B, C in turn'], ['a', 'All A'], ['b', 'All B'], ['c', 'All C']],
      function () { return st().demo.variantMode; },
      function (v) {
        st().demo.variantMode = v;
        lab.commit();
      });
    demoRow(box, 'Choice scroll position', [
      { id: 'scroll:top', label: 'Top', run: function () { lab.scrollDemo(0); } },
      { id: 'scroll:middle', label: 'Middle', run: function () { lab.scrollDemo(0.5); } },
      { id: 'scroll:bottom', label: 'Bottom', run: function () { lab.scrollDemo(1); } }
    ]);
    selectRow(box, 'Speech sample', 'speechSample',
      Object.keys(lab.samples.speech).map(function (k) { return [k, lab.samples.speech[k].label]; }),
      function () { return st().demo.speechSample; },
      function (v) {
        st().demo.speechSample = v;
        st().demo.speechOverride = '';
        lab.commit();
        lab.startSpeech();
      });
    demoRow(box, 'Speech playback', [{ id: 'speech:replay', label: 'Replay typewriter', run: function () { lab.startSpeech(); } }]);
  }

  // Scroll demonstrations need an overflowing list, so a list that fits switches to one.
  lab.scrollDemo = function (fraction) {
    if (!lab.maxChoiceScroll()) lab.setChoiceSet('long-list');
    lab.setChoiceScroll(Math.round(lab.maxChoiceScroll() * fraction));
    lab.renderSelection();
  };

  // Fit report ----------------------------------------------------------------------
  // Recomputed from the live placement, so it always describes what is on the stage.
  function overlap(a, b) {
    return Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]));
  }

  lab.fitReport = function () {
    var s = st();
    var r = lab.measured.regions;
    var inv = s.inventory;
    var slots = components['inv-slots'].rect();
    var left = components['inv-left'].rect();
    var right = components['inv-right'].rect();
    var arrowOverlap = overlap(left, slots) + overlap(right, slots);
    var u = s.utility.buttons;
    var uFirst = components['util-inspect'].rect();
    var uLast = components['util-journal'].rect();
    var uSpan = uLast[0] + uLast[2] - uFirst[0];
    var uBay = r.utilityBay.floor;
    var uOverlap = 0;
    u.slice(1).forEach(function (b, i) {
      uOverlap += Math.max(0, u[i].x + u[i].displayWidth - b.x);
    });
    var uFits = uFirst[0] >= uBay[0] && uLast[0] + uLast[2] <= uBay[0] + uBay[2] && u[0].displayHeight <= uBay[3] && !uOverlap;
    var ch = r.choiceTrack;
    var thumb = s.scrollbar.thumb;
    var tRight = thumb.x + thumb.displayWidth;
    var tFits = thumb.x >= ch.channel[0] && tRight <= ch.channel[0] + ch.channel[2];
    var vp = s.choices.viewport;

    function tag(fits, scale) {
      if (!fits) return 'overflow';
      return scale === 1 ? 'fits' : 'experiment';
    }

    return [
      {
        id: 'inventory-slots',
        item: inv.slotCount + ' slots',
        native: '96×96',
        display: '96×96',
        scale: 1,
        room: slots[2] + ' of ' + r.inventoryBay.floor[2] + ' wide',
        result: 'fits'
      },
      {
        id: 'inventory-arrows',
        item: 'Arrows',
        native: '83×128',
        display: inv.leftArrow.displayWidth + '×' + inv.leftArrow.displayHeight,
        scale: inv.leftArrow.scale,
        room: arrowOverlap ? arrowOverlap + 'px over the slots' : 'clear of slots',
        result: tag(!arrowOverlap, inv.leftArrow.scale)
      },
      {
        id: 'utility',
        item: 'Utility x3',
        native: '243×205',
        display: u[0].displayWidth + '×' + u[0].displayHeight,
        scale: u[0].scale,
        room: uSpan + ' of ' + uBay[2] + ' wide, ' + u[0].displayHeight + ' of ' + uBay[3] + ' high',
        result: tag(uFits, u[0].scale)
      },
      {
        id: 'choices',
        item: 'Choice viewport',
        native: '548 wide',
        display: vp.width + '×' + vp.height,
        scale: 1,
        room: vp.height + ' high, panel ' + r.choicePanel.outer[3] + ', free band ' + (r.choicePanel.freeVertical[1] - r.choicePanel.freeVertical[0] + 1),
        result: vp.y >= r.choicePanel.freeVertical[0] && vp.y + vp.height - 1 <= r.choicePanel.freeVertical[1] ? 'fits' : 'overflow'
      },
      {
        id: 'thumb',
        item: 'Thumb',
        native: '40 wide',
        display: thumb.displayWidth + ' wide',
        scale: thumb.scale,
        room: 'channel ' + ch.channel[2] + ', housing ' + (ch.housingX[1] - ch.housingX[0] + 1),
        result: tag(tFits, thumb.scale)
      }
    ];
  };

  function renderFitReport() {
    var box = document.getElementById('fitReport');
    var rows = lab.fitReport();
    var html = '<table class="fit"><tr><th>Item</th><th>Native</th><th>Shown</th><th>Scale</th><th>Room</th><th>Result</th></tr>';
    html += rows.map(function (r) {
      return '<tr data-fit="' + r.id + '"><td>' + r.item + '</td><td>' + r.native + '</td><td>' + r.display + '</td><td>' + r.scale +
        '</td><td>' + r.room + '</td><td class="tag-' + r.result + '">' + r.result + '</td></tr>';
    }).join('');
    box.innerHTML = html + '</table><p class="note">"experiment" means it fits only at a display scale, which is an owner decision. The PNG itself is never changed.</p>';
  }

  // Guides ---------------------------------------------------------------------------
  lab.buildGuides = function () {
    var host = document.getElementById('guides');
    var r = lab.measured.regions;
    [
      ['Inventory floor', r.inventoryBay.floor, ''],
      ['Inventory clear', r.inventoryBay.clear, 'clear'],
      ['Objective plaque opening', r.objectivePlaque.opening, 'clear'],
      ['Objective floor', r.objectivePanel.clearBelowPlaque, ''],
      ['Utility floor', r.utilityBay.floor, ''],
      ['Utility clear band', r.utilityBay.clearBandH114, 'clear'],
      ['Choice panel', r.choicePanel.outer, ''],
      ['Track channel', r.choiceTrack.channel, 'clear'],
      ['Speech parchment', r.speechPanel.parchment, ''],
      ['Scene aperture', r.sceneAperture.rect, ''],
      ['Portrait aperture', r.portraitAperture.rect, '']
    ].forEach(function (g) {
      var d = document.createElement('div');
      d.className = 'guide ' + g[2];
      d.style.left = g[1][0] + 'px';
      d.style.top = g[1][1] + 'px';
      d.style.width = g[1][2] + 'px';
      d.style.height = g[1][3] + 'px';
      var s = document.createElement('span');
      s.textContent = g[0] + ' ' + g[1].join(' ');
      d.appendChild(s);
      host.appendChild(d);
    });
  };

  lab.buildSidebar = function () {
    renderTree();
    renderInspector();
    buildDemos();
    lab.syncSidebar();
  };

  // Every edit lands here. It writes values into existing controls and rebuilds nothing,
  // apart from the component tree when the list of cards itself has changed.
  lab.syncSidebar = function () {
    renderTree();
    if (!componentFor(lab.selected) && !groups[lab.selected]) lab.select('utility');
    syncers.forEach(function (run) { run(); });
    demoSyncers.forEach(function (run) { run(); });
    renderFitReport();
    if (lab.syncTuning) lab.syncTuning();
  };
})();
