// Builds and updates everything on the 1920x1080 stage. Nothing here touches the shell PNG.
// Positions are integer left/top in shell pixels; the only transform is the view zoom on #stage.
(function () {
  'use strict';

  var lab = window.M1Lab;
  var rt = lab.rt;
  var stage;
  var els = { slots: [], itemLabels: [], utility: [], cards: [] };
  var MARKER_SRC = '../../art/ui/sprites/choice_cards/choice_marker_tab.png';
  var MARKER_SIZE = [14, 12];
  var MARKER_PIXEL = 2; // the sprite is drawn on a 2px grid, so it travels on that grid too
  var SPARE_SLOTS = 3; // items sliding in or out, on top of the seven a row can show

  function st() {
    return lab.state;
  }

  function el(tag, cls, parent, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function place(node, x, y, w, h) {
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    if (w !== undefined) {
      node.style.width = w + 'px';
      node.style.height = h + 'px';
    }
  }

  function show(node, visible) {
    node.style.display = visible ? '' : 'none';
  }

  // Press handling ------------------------------------------------------------
  // The same rules for every physical control: down on press, up on release,
  // activate only if the release lands on the control.
  function bindPress(node, id, onChange, onActivate) {
    function set(down) {
      if (!!rt.pressed[id] === down) return;
      if (down) rt.pressed[id] = true;
      else delete rt.pressed[id];
      onChange();
    }

    node.addEventListener('pointerdown', function (e) {
      if (lab.mode !== 'interact' || e.button !== 0) return;
      node.setPointerCapture(e.pointerId);
      set(true);
    });
    node.addEventListener('pointerup', function (e) {
      if (!rt.pressed[id]) return;
      var r = node.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom;
      set(false);
      if (inside && onActivate) onActivate();
    });
    node.addEventListener('pointercancel', function () { set(false); });
    node.addEventListener('keydown', function (e) {
      if (lab.mode !== 'interact' || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      if (!e.repeat) set(true);
    });
    node.addEventListener('keyup', function (e) {
      if ((e.key !== 'Enter' && e.key !== ' ') || !rt.pressed[id]) return;
      set(false);
      if (onActivate) onActivate();
    });
    node.addEventListener('blur', function () { set(false); });
  }

  function isDown(id, comp) {
    return !!rt.pressed[id] || comp.heldState === 'down';
  }

  // Inventory -------------------------------------------------------------------
  function buildInventory() {
    var layer = el('div', 'layer', stage, { id: 'layer-inventory' });
    els.inventory = layer;
    els.invWindow = el('div', 'inv-window', layer, { id: 'invWindow' });
    for (var i = 0; i < 7 + SPARE_SLOTS; i++) {
      var slot = el('div', 'slot', els.invWindow, { 'data-comp': 'inv-slots', 'data-slot': i });
      el('img', 'sprite', slot, { src: lab.spriteUrl('inventory_slot'), alt: '', draggable: 'false' });
      els.itemLabels.push(el('canvas', 'item-label', slot, { 'aria-hidden': 'true' }));
      els.slots.push(slot);
    }
    ['left', 'right'].forEach(function (side) {
      var id = 'inv-' + side;
      var btn = el('button', 'hit arrow', layer, { id: id, type: 'button', 'data-comp': id, 'aria-label': side + ' inventory arrow' });
      el('img', 'sprite', btn, { alt: '', draggable: 'false' });
      els[id] = btn;
      bindPress(btn, id, renderInventory, function () {
        stepInventory(side === 'left' ? -1 : 1);
      });
    });
  }

  function maxInventoryStart() {
    return Math.max(0, lab.samples.items.length - st().inventory.slotCount);
  }

  function stepInventory(direction) {
    var inv = st().inventory;
    var before = rt.inventoryStart;
    rt.inventoryStart = lab.clamp(before + direction * inv.stepPerPress, 0, maxInventoryStart());
    var moved = rt.inventoryStart - before;
    if (moved && inv.motion.slide) {
      // The strip jumps by the step and eases back, so the items never appear to swap in place.
      var limit = 2 * inv.pitch;
      var from = lab.clamp(slideShift(performance.now()) + moved * inv.pitch, -limit, limit);
      rt.inventorySlide = { from: from, start: performance.now() };
      wake();
    }
    renderInventory();
  }

  // Slide position in pixels at a time since the slide began: past the target by the overshoot,
  // back the other way by the settle, then at rest.
  function slideCurve(elapsed, from, m) {
    var u = elapsed / Math.max(1, m.durationMs);
    if (u <= 0) return from;
    if (u >= 1) return 0;
    var sign = from < 0 ? -1 : 1;
    var past = -sign * m.overshoot;
    var back = sign * m.settle;
    if (u < 0.6) {
      var q = 1 - u / 0.6;
      return past + (from - past) * q * q * q;
    }
    if (u < 0.85) return past + ((back - past) * (u - 0.6)) / 0.25;
    return (back * (1 - u)) / 0.15;
  }

  function slideShift(now) {
    var slide = rt.inventorySlide;
    return slide ? Math.round(slideCurve(now - slide.start, slide.from, st().inventory.motion)) : 0;
  }

  // Slots further from the direction of travel start later, so the row moves with some weight.
  function slotShift(now, row, last) {
    var slide = rt.inventorySlide;
    var m = st().inventory.motion;
    var order = slide.from > 0 ? row : last - row;
    return Math.round(slideCurve(now - slide.start - lab.clamp(order, 0, last) * m.lagMs, slide.from, m));
  }

  function renderArrow(id, comp) {
    var node = els[id];
    var down = isDown(id, comp);
    var w = comp.displayWidth;
    var h = comp.displayHeight;
    show(node, comp.visible && st().inventory.visible);
    place(node, comp.x, comp.y, w, h);
    node.dataset.state = down ? 'down' : 'up';
    var img = node.firstChild;
    var src = lab.spriteUrl(comp.spriteFamily + (down ? '_down' : '_up'));
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
  }

  // The window reaches the arrows where it can, so a sliding slot passes behind them.
  function inventoryWindow(inv, layout) {
    var pad = inv.motion.overshoot + inv.motion.settle;
    var width = (inv.slotCount - 1) * inv.pitch + inv.slotSize[0];
    var left = Math.max(pad, layout.x - (inv.leftArrow.x + inv.leftArrow.displayWidth));
    var right = Math.max(pad, inv.rightArrow.x - (layout.x + width));
    return { x: layout.x - left, width: left + width + right, left: left };
  }

  function renderInventory() {
    var inv = st().inventory;
    var layout = inv.slotLayouts[inv.slotCount];
    var box = inventoryWindow(inv, layout);
    var count = inv.slotCount;
    var now = performance.now();
    var sliding = !!rt.inventorySlide && inv.motion.slide;
    if (!sliding) rt.inventorySlide = null;
    rt.inventoryStart = lab.clamp(rt.inventoryStart, 0, maxInventoryStart());
    show(els.invWindow, inv.visible);
    place(els.invWindow, box.x, layout.y, box.width, inv.slotSize[1]);

    var used = 0;
    var first = sliding ? -SPARE_SLOTS : 0;
    var last = sliding ? count + SPARE_SLOTS - 1 : count - 1;
    for (var row = first; row <= last && used < els.slots.length; row++) {
      var item = lab.samples.items[rt.inventoryStart + row];
      if (item === undefined) continue;
      var x = box.left + row * inv.pitch + (sliding ? slotShift(now, row, count - 1) : 0);
      if (x + inv.slotSize[0] <= 0 || x >= box.width) continue;
      var slot = els.slots[used];
      var label = els.itemLabels[used];
      used++;
      show(slot, true);
      place(slot, x, 0, inv.slotSize[0], inv.slotSize[1]);
      var w = lab.inkWidth(item, 'labels');
      var lh = lab.lineHeightOf('labels');
      var key = item + '|' + lab.face('labels').id;
      if (label.dataset.key !== key) {
        lab.drawLines(label, [item], 'light', lh, w, lh, undefined, 'labels');
        label.dataset.item = item;
        label.dataset.key = key;
      }
      place(label, Math.floor((inv.slotSize[0] - w) / 2), Math.floor((inv.slotSize[1] - lab.capHeight('labels')) / 2), w, lh);
    }
    els.slots.slice(used).forEach(function (slot) { show(slot, false); });
    renderArrow('inv-left', inv.leftArrow);
    renderArrow('inv-right', inv.rightArrow);
  }

  // Utility buttons -----------------------------------------------------------
  function buildUtility() {
    var layer = el('div', 'layer', stage, { id: 'layer-utility' });
    st().utility.buttons.forEach(function (comp, i) {
      var id = 'util-' + comp.id;
      var btn = el('button', 'hit utility', layer, { id: id, type: 'button', 'data-comp': id });
      var parts = {
        node: btn,
        img: el('img', 'sprite', btn, { alt: '', draggable: 'false' }),
        label: el('canvas', 'label', btn, { 'aria-hidden': 'true' }),
        glyph: null, // made on first use, so label mode never requests a candidate file
        activations: 0
      };
      els.utility[i] = parts;
      bindPress(btn, id, renderUtility, function () {
        parts.activations++;
        btn.dataset.activations = parts.activations;
      });
    });
  }

  function renderUtility() {
    var u = st().utility;
    u.buttons.forEach(function (comp, i) {
      var id = 'util-' + comp.id;
      var parts = els.utility[i];
      var down = isDown(id, comp);
      show(parts.node, comp.visible);
      place(parts.node, comp.x, comp.y, comp.displayWidth, comp.displayHeight);
      parts.node.dataset.state = down ? 'down' : 'up';
      parts.node.setAttribute('aria-label', comp.label);
      var src = lab.spriteUrl(comp.spriteFamily + (down ? '_down' : '_up'));
      if (parts.img.getAttribute('src') !== src) parts.img.setAttribute('src', src);

      var pdx = down ? u.pressedLabelOffset.dx : 0;
      var pdy = down ? u.pressedLabelOffset.dy : 0;
      var glyph = u.show === 'glyph' && lab.actionGlyphs[comp.glyph];
      show(parts.label, !glyph);
      if (glyph && !parts.glyph) parts.glyph = el('img', 'glyph', parts.node, { alt: '', draggable: 'false' });
      if (parts.glyph) show(parts.glyph, !!glyph);
      parts.node.dataset.glyph = glyph ? comp.glyph : '';
      if (glyph) {
        // Drawn 1:1 at the file's own size, centred, and moved by the same offsets as a label.
        if (parts.glyph.getAttribute('src') !== glyph.file) parts.glyph.setAttribute('src', glyph.file);
        var gx = Math.floor((comp.displayWidth - glyph.size[0]) / 2) + comp.labelOffset.dx;
        var gy = Math.floor((comp.displayHeight - glyph.size[1]) / 2) + comp.labelOffset.dy;
        place(parts.glyph, gx + pdx, gy + pdy, glyph.size[0], glyph.size[1]);
        return;
      }

      var ink = lab.inkWidth(comp.label, 'labels');
      var lh = lab.lineHeightOf('labels');
      lab.drawLines(parts.label, [comp.label], u.labelFont, lh, ink, lh, undefined, 'labels');
      var cx = Math.floor((comp.displayWidth - ink) / 2) + comp.labelOffset.dx;
      var cy = Math.floor((comp.displayHeight - lab.capHeight('labels')) / 2) + comp.labelOffset.dy;
      place(parts.label, cx + pdx, cy + pdy, ink, lh);
    });
  }

  // Choices ---------------------------------------------------------------------
  function cardLayout() {
    var c = st().choices;
    var set = lab.samples.choiceSets[st().demo.choiceSet];
    var refs = [];
    for (var n = 0; n < st().demo.choiceCount; n++) refs.push(set.cards[n % set.cards.length]);
    var y = 0;
    return refs.map(function (ref, i) {
      var override = st().demo.cardOverrides[st().demo.choiceSet + ':' + i] || {};
      var text = override.text !== undefined ? override.text : lab.samples.choiceTexts[ref[0]][ref[1]];
      var wrapped = lab.wrap(text, c.text.maxWidth, 'choices');
      var lines = lab.clamp(wrapped.length, 1, 4);
      var mode = st().demo.variantMode;
      var variant = override.variant || (mode === 'cycle' ? 'abc'[i % 3] : mode);
      var card = {
        index: i,
        id: 'choice-' + i,
        text: text,
        wrapped: wrapped.slice(0, 4),
        overflowLines: Math.max(0, wrapped.length - 4),
        lines: lines,
        expectedLines: ref[0],
        variant: variant,
        sprite: 'choice_' + lines + 'line_' + variant,
        height: c.cardHeights[lines],
        y: y
      };
      y += card.height + c.gap;
      return card;
    });
  }
  lab.cardLayout = cardLayout;

  function contentHeight(cards) {
    if (!cards.length) return 0;
    var last = cards[cards.length - 1];
    return last.y + last.height;
  }

  function maxScroll(cards) {
    return Math.max(0, contentHeight(cards || cardLayout()) - st().choices.viewport.height);
  }
  lab.maxChoiceScroll = maxScroll;

  function buildChoiceViewport() {
    var vp = el('div', 'hit-area', stage, { id: 'choiceViewport', tabindex: '0', 'data-comp': 'choice-viewport', 'aria-label': 'Player choices' });
    els.viewport = vp;
    vp.addEventListener('wheel', function (e) {
      if (lab.mode !== 'interact') return;
      e.preventDefault();
      setChoiceScroll(rt.choiceScroll + Math.sign(e.deltaY) * 28);
    }, { passive: false });
    vp.addEventListener('keydown', function (e) {
      if (e.target !== vp) return;
      var page = st().choices.viewport.height;
      var keys = { ArrowDown: 28, ArrowUp: -28, PageDown: page, PageUp: -page };
      if (e.key in keys) setChoiceScroll(rt.choiceScroll + keys[e.key]);
      else if (e.key === 'Home') setChoiceScroll(0);
      else if (e.key === 'End') setChoiceScroll(maxScroll());
      else return;
      e.preventDefault();
    });
  }

  function makeCardElement(index) {
    var btn = el('button', 'hit choice', els.viewport, { type: 'button', 'data-index': index });
    var parts = {
      node: btn,
      art: el('canvas', 'sprite card-art', btn, { 'aria-hidden': 'true' }),
      text: el('canvas', 'card-text', btn, { 'aria-hidden': 'true' }),
      markerClip: el('div', 'marker-clip', btn),
      markerOut: 0
    };
    parts.marker = el('img', 'card-marker', parts.markerClip, { src: MARKER_SRC, alt: '', draggable: 'false' });
    bindPress(btn, 'choice-' + index, renderChoices, function () {
      btn.dataset.activations = Number(btn.dataset.activations || 0) + 1;
      if (st().choices.feedback.click !== 'press') lab.previewPick(index);
    });
    // Keyboard focus counts as hover. Focus from a mouse click does not, or the tab would stay
    // out after the pointer had left.
    var pointerOver = false;
    var keyFocus = false;
    function updateHover() {
      if (pointerOver || keyFocus) rt.choiceHover[index] = true;
      else delete rt.choiceHover[index];
      wake();
    }
    btn.addEventListener('pointerenter', function () { pointerOver = true; updateHover(); });
    btn.addEventListener('pointerleave', function () { pointerOver = false; updateHover(); });
    btn.addEventListener('focus', function () { keyFocus = btn.matches(':focus-visible'); updateHover(); });
    btn.addEventListener('blur', function () { keyFocus = false; updateHover(); });
    els.cards[index] = parts;
    return parts;
  }

  // A narrower or shorter card keeps all four corners of the approved art pixel for pixel and
  // drops strips from the middle of the parchment. Nothing is scaled.
  function drawCardArt(canvas, sprite, width, height) {
    canvas.redraw = function (target) {
      var img = lab.image(sprite);
      var w = img.width;
      var h = img.height;
      var cw = Math.min(width, w);
      var ch = Math.min(height, h);
      var left = Math.ceil(cw / 2);
      var right = cw - left;
      var top = Math.ceil(ch / 2);
      var bottom = ch - top;
      target.width = cw;
      target.height = ch;
      var ctx = target.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, left, top, 0, 0, left, top);
      ctx.drawImage(img, w - right, 0, right, top, left, 0, right, top);
      ctx.drawImage(img, 0, h - bottom, left, bottom, 0, top, left, bottom);
      ctx.drawImage(img, w - right, h - bottom, right, bottom, left, top, right, bottom);
    };
    canvas.redraw(canvas);
  }

  // Where the demo pick is. others and chosenAway run 0 at rest to 1 fully slid away. With
  // Choice sends, the chosen card then rises behind the divider (chosenRise 0 to 1), its line
  // types into the dialogue box, and after the hold every card slides back in. There is no
  // conversation here to carry on into, so the lab always returns to where it started.
  function pickState(now) {
    var f = st().choices.feedback;
    var pick = rt.choicePick;
    if (!pick) return { others: 0 };
    var t = now - pick.start;
    var move = Math.max(1, f.awayMs);
    if (pick.mode !== 'send') {
      if (t < move) return { others: t / move };
      if (t < move + f.holdMs) return { others: 1 };
      return { others: Math.max(0, 1 - (t - move - f.holdMs) / move) };
    }
    if (pick.returnAt) {
      var back = Math.max(0, 1 - (now - pick.returnAt) / move);
      return { others: back, chosenAway: back };
    }
    if (pick.sentAt) return { others: 1, chosenGone: true };
    var rise = (t - move - f.send.delayMs) / Math.max(1, f.send.durationMs);
    return { others: Math.min(1, t / move), chosenRise: lab.clamp(rise, 0, 1) };
  }

  // Moves a send along. Returns true once the pick has finished.
  function advancePick(now) {
    var f = st().choices.feedback;
    var pick = rt.choicePick;
    var move = Math.max(1, f.awayMs);
    if (pick.mode !== 'send') return now - pick.start >= 2 * move + f.holdMs;
    if (!pick.sentAt && now - pick.start >= move + f.send.delayMs + Math.max(1, f.send.durationMs)) {
      pick.sentAt = now;
      var card = cardLayout()[pick.index];
      if (f.send.showReply && card) startReply(card.text);
      else pick.replyDoneAt = now;
    }
    if (rt.speechReply && !pick.answerAt && now - pick.sentAt >= f.send.beatMs) {
      pick.answerAt = now;
      answerReply();
    }
    if (pick.answerAt && !pick.replyDoneAt && !rt.speech.typing) pick.replyDoneAt = now;
    if (pick.replyDoneAt && !pick.returnAt && now - pick.replyDoneAt >= f.holdMs) pick.returnAt = now;
    if (pick.returnAt && now - pick.returnAt >= move) {
      clearReply();
      return true;
    }
    return false;
  }

  // Slides out from under the card's frame in steps of the sprite's own pixels.
  function renderMarker(parts, card) {
    var f = st().choices.feedback;
    var m = f.marker;
    var on = f.hover === 'marker' && parts.markerOut > 0;
    show(parts.markerClip, on);
    if (!on) return;
    var hidden = m.clipX - MARKER_SIZE[0];
    var left = m.x - Math.round(((1 - parts.markerOut) * (m.x - hidden)) / MARKER_PIXEL) * MARKER_PIXEL;
    var y = Math.floor((card.height - MARKER_SIZE[1]) / 2) + m.y;
    place(parts.markerClip, m.clipX, y, Math.max(0, m.x + MARKER_SIZE[0] - m.clipX), MARKER_SIZE[1]);
    place(parts.marker, left - m.clipX, 0, MARKER_SIZE[0], MARKER_SIZE[1]);
  }

  // Each card carries its own clip, which travels with it, so a moved card stays held to the
  // viewport edge without letting its neighbours peek past it.
  function renderChoices(skipThumb) {
    var c = st().choices;
    var vp = c.viewport;
    var f = c.feedback;
    var cards = cardLayout();
    var pick = rt.choicePick;
    var state = pickState(performance.now());
    show(els.viewport, c.visible);
    place(els.viewport, vp.x, vp.y, vp.width, vp.height);
    rt.choiceScroll = lab.clamp(rt.choiceScroll, 0, maxScroll(cards));

    els.cards.forEach(function (parts, i) {
      if (i >= cards.length) parts.node.style.display = 'none';
    });
    cards.forEach(function (card, i) {
      var parts = els.cards[i] || makeCardElement(i);
      var pressed = !!rt.pressed[card.id] && f.click === 'press';
      var chosen = !!pick && pick.index === i;
      var other = !!pick && !chosen;
      var slides = !!pick && (pick.mode === 'slide' || pick.mode === 'send');
      var amount = other ? state.others : chosen && state.chosenAway !== undefined ? state.chosenAway : 0;
      var away = slides && amount ? Math.round((1 - (1 - amount) * (1 - amount)) * c.cardWidth / 2) * 2 : 0;
      var dimSteps = other && pick.mode === 'dim' ? Math.ceil(state.others * 2) : 0;
      var top = card.y - rt.choiceScroll;
      // The chosen card rises until its bottom edge passes the vanish line, speeding up as it goes.
      var sending = chosen && state.chosenRise !== undefined;
      var edge = f.send.edgeOffset;
      var rise = sending ? Math.round((Math.pow(state.chosenRise, f.send.pull) * (top - edge + card.height)) / 2) * 2 : 0;
      var dx = (pressed ? c.pressedOffset.dx : 0) + away;
      var dy = (pressed ? c.pressedOffset.dy : 0) - rise;
      var gone = chosen && (state.chosenGone || (sending && top - rise + card.height <= edge));
      var cardOn = top < vp.height && top + card.height > 0 && away < c.cardWidth && !gone;

      parts.node.style.display = cardOn ? '' : 'none';
      parts.node.dataset.comp = card.id;
      parts.node.dataset.sprite = card.sprite;
      parts.node.dataset.state = pressed ? 'down' : 'up';
      parts.node.setAttribute('aria-label', card.text);
      place(parts.node, dx, top + dy, c.cardWidth, card.height);
      parts.node.style.filter = dimSteps ? 'brightness(' + (100 - (f.dimPercent * dimSteps) / 2) + '%)' : '';

      var clipTop = sending ? Math.max(0, edge - (top - rise)) : Math.max(0, -top);
      var clipBottom = Math.max(0, top - rise + card.height - vp.height);
      parts.node.style.clipPath = clipTop || clipBottom || away
        ? 'inset(' + clipTop + 'px ' + away + 'px ' + clipBottom + 'px 0)'
        : '';

      var artKey = card.sprite + '|' + c.cardWidth + '|' + card.height;
      if (parts.artKey !== artKey) {
        drawCardArt(parts.art, card.sprite, c.cardWidth, card.height);
        parts.artKey = artKey;
      }

      var lh = c.text.lineHeight;
      var textHeight = card.wrapped.length * lh;
      var textTop = Math.max(6, Math.floor((card.height - textHeight) / 2)) + c.text.offsetY;
      var canvasH = textHeight + 8;
      var key = [card.text, c.text.font, lab.face('choices').id, lh, c.text.maxWidth, card.lines].join('|');
      if (parts.key !== key) {
        lab.drawLines(parts.text, card.wrapped, c.text.font, lh, c.text.maxWidth, canvasH, undefined, 'choices');
        parts.key = key;
      }
      place(parts.text, c.text.offsetX, textTop, c.text.maxWidth, canvasH);
      renderMarker(parts, card);
    });
    if (!skipThumb) renderThumb(cards);
  }

  // Motion ------------------------------------------------------------------------------
  // One frame loop for everything transient. It stops itself when nothing is moving.
  var ticking = false;
  var lastFrame = 0;

  function wake() {
    if (ticking) return;
    ticking = true;
    lastFrame = performance.now();
    requestAnimationFrame(tick);
  }

  function tick(now) {
    var dt = now - lastFrame;
    var f = st().choices.feedback;
    var busy = false;
    lastFrame = now;

    var slide = rt.inventorySlide;
    var m = st().inventory.motion;
    if (slide && now - slide.start >= m.durationMs + m.lagMs * (st().inventory.slotCount - 1)) rt.inventorySlide = null;
    if (rt.inventorySlide) busy = true;

    if (rt.choicePick && advancePick(now)) rt.choicePick = null;
    if (rt.choicePick) busy = true;

    els.cards.forEach(function (parts, i) {
      var held = rt.choiceHover[i] || (rt.markerPreview && i === 0);
      var want = held && lab.mode === 'interact' && f.hover === 'marker' ? 1 : 0;
      if (parts.markerOut === want) return;
      var step = dt / Math.max(1, f.marker.travelMs);
      parts.markerOut = want ? Math.min(1, parts.markerOut + step) : Math.max(0, parts.markerOut - step);
      if (parts.markerOut !== want) busy = true;
    });

    renderInventory();
    renderChoices(true);
    if (busy) requestAnimationFrame(tick);
    else ticking = false;
  }

  // Back to rest at once, for a snapshot: a saved layout shows the placement, not a moment.
  lab.settleMotion = function () {
    rt.inventorySlide = null;
    rt.choicePick = null;
    clearReply();
    rt.choiceHover = {};
    rt.markerPreview = false;
    els.cards.forEach(function (parts) { parts.markerOut = 0; });
    renderInventory();
    renderChoices();
  };

  // Live Tuning's previews, so a card can be judged without hovering it.
  lab.previewMarker = function () {
    rt.markerPreview = !rt.markerPreview;
    wake();
  };

  lab.previewPick = function (index) {
    clearReply();
    rt.choicePick = { index: index, start: performance.now(), mode: st().choices.feedback.click };
    wake();
  };

  function setChoiceScroll(value) {
    rt.choiceScroll = lab.clamp(Math.round(value), 0, maxScroll());
    renderChoices();
    if (lab.onChoiceScroll) lab.onChoiceScroll();
  }
  lab.setChoiceScroll = setChoiceScroll;

  // Scrollbar thumb ------------------------------------------------------------
  // Assembled from the three approved pieces: fixed top, 1px middle repeated, fixed bottom.
  // The caps' empty outer row is skipped, so the bounds below are the visible thumb.
  var CAP_ROWS = 20;

  function thumbMetrics(cards) {
    var sb = st().scrollbar;
    var vp = st().choices.viewport;
    var list = cards || cardLayout();
    var total = contentHeight(list);
    var max = maxScroll(list);
    var minH = Math.max(sb.thumb.minHeight, sb.thumb.capHeight * 2);
    var height = max === 0 ? sb.track.height : lab.clamp(Math.round((sb.track.height * vp.height) / total), minH, sb.track.height);
    var y = sb.track.y + (max === 0 ? 0 : Math.round(((sb.track.height - height) * rt.choiceScroll) / max));
    return { x: sb.thumb.x, y: y, width: sb.thumb.displayWidth, height: height, overflow: max > 0 };
  }
  lab.thumbMetrics = thumbMetrics;

  function buildThumb() {
    els.thumb = el('canvas', 'hit-area', stage, { id: 'choiceThumb', 'data-comp': 'scroll-thumb' });
    var drag = null;
    els.thumb.addEventListener('pointerdown', function (e) {
      if (lab.mode !== 'interact' || !thumbMetrics().overflow) return;
      els.thumb.setPointerCapture(e.pointerId);
      drag = { y: e.clientY, scroll: rt.choiceScroll };
    });
    els.thumb.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var m = thumbMetrics();
      var range = st().scrollbar.track.height - m.height;
      var deltaStage = (e.clientY - drag.y) / lab.viewScale();
      setChoiceScroll(drag.scroll + (range ? (deltaStage * maxScroll()) / range : 0));
    });
    els.thumb.addEventListener('pointerup', function () { drag = null; });
    els.thumb.addEventListener('pointercancel', function () { drag = null; });
  }

  function renderThumb(cards) {
    var t = st().scrollbar.thumb;
    var m = thumbMetrics(cards);
    var canvas = els.thumb;
    show(canvas, t.visible && st().choices.visible);
    place(canvas, m.x, m.y, m.width, m.height);
    canvas.dataset.overflow = m.overflow ? 'true' : 'false';
    canvas.redraw = function (target) {
      paintThumb(target, m.width, m.height, t.capHeight);
    };
    canvas.redraw(canvas);
  }

  function paintThumb(canvas, w, h, cap) {
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    blit(ctx, lab.image('choice_scroll_thumb_top'), 1, CAP_ROWS, 0, cap, w);
    blit(ctx, lab.image('choice_scroll_thumb_middle'), 0, 1, cap, 1, w);
    for (var y = cap + 1; y < h - cap; y++) ctx.drawImage(canvas, 0, cap, w, 1, 0, y, w, 1);
    blit(ctx, lab.image('choice_scroll_thumb_bottom'), 0, CAP_ROWS, h - cap, cap, w);
  }

  // Pixel-centre nearest sampling, one source pixel at a time. A scaled drawImage would leave
  // the choice of pixels to the browser, and Chromium and Firefox choose differently.
  function blit(ctx, img, srcY, srcRows, dstY, dstRows, dstCols) {
    for (var row = 0; row < dstRows; row++) {
      var sy = srcY + Math.floor(((row + 0.5) * srcRows) / dstRows);
      for (var col = 0; col < dstCols; col++) {
        var sx = Math.floor(((col + 0.5) * img.width) / dstCols);
        ctx.drawImage(img, sx, sy, 1, 1, col, dstY + row, 1, 1);
      }
    }
  }

  // NPC speech --------------------------------------------------------------------
  var typeTimer = null;

  // What the dialogue box holds, as parts that each keep their own face: the player's lines use
  // the choices face, the NPC's the dialogue face.
  function npcText() {
    var d = st().demo;
    return d.speechOverride !== '' ? d.speechOverride : lab.samples.speech[d.speechSample].text;
  }
  lab.npcText = npcText;

  function speechParts() {
    if (rt.speechReply) return rt.speechReply.parts;
    var d = st().demo;
    var sample = lab.samples.speech[d.speechSample];
    var parts = [];
    if (sample.player && d.speechOverride === '') parts.push({ text: sample.player, role: 'choices' });
    parts.push({ text: npcText(), role: 'dialogue' });
    return parts;
  }
  lab.speechParts = speechParts;

  function speechText() {
    return speechParts().map(function (p) { return p.text; }).join('\n');
  }
  lab.speechText = speechText;

  function wrapSpeech(width) {
    return speechParts().reduce(function (lines, p) {
      return lines.concat(lab.wrap(p.text, width, p.role).map(function (text) { return { text: text, role: p.role }; }));
    }, []);
  }

  function speechKey(width) {
    return [width, lab.face('dialogue').id, lab.face('choices').id, JSON.stringify(speechParts())].join('|');
  }

  // When the speaker changes, the new speaker's first line drops by the speaker gap. A gap at the
  // top of the box is not drawn, so how many lines fit depends on where the view starts.
  function speakerGapBefore(lines, start, i) {
    return i > start && lines[i].role !== lines[i - 1].role ? st().speech.text.speakerGap : 0;
  }

  function linesFrom(start) {
    var t = st().speech.text;
    var lines = rt.speech.lines;
    var n = 0;
    for (var y = 0, i = start; i < lines.length; i++) {
      y += speakerGapBefore(lines, start, i);
      if (y + t.lineHeight > t.height) break;
      y += t.lineHeight;
      n++;
    }
    return i >= lines.length ? n : Math.max(1, n);
  }

  function visibleLines() {
    return linesFrom(rt.speech.scrollLine);
  }

  function speechMaxScroll() {
    var start = 0;
    while (start < rt.speech.lines.length - 1 && start + linesFrom(start) < rt.speech.lines.length) start++;
    return start;
  }
  lab.speechMaxScroll = speechMaxScroll;

  function buildSpeech() {
    var box = el('div', 'hit-area', stage, { id: 'speechText', 'data-comp': 'speech-text' });
    els.speech = box;
    els.speechCanvas = el('canvas', '', box, { 'aria-hidden': 'true' });
    els.indicator = el('div', 'speech-indicator', stage, { id: 'speechIndicator', 'data-comp': 'speech-indicator' });
    box.addEventListener('click', function () {
      if (lab.mode === 'interact' && rt.speech.typing) finishSpeech();
    });
    box.addEventListener('wheel', function (e) {
      if (lab.mode !== 'interact') return;
      e.preventDefault();
      setSpeechScroll(rt.speech.scrollLine + Math.sign(e.deltaY));
    }, { passive: false });
  }

  function setSpeechScroll(line) {
    rt.speech.scrollLine = lab.clamp(line, 0, speechMaxScroll());
    renderSpeech();
  }
  lab.setSpeechScroll = setSpeechScroll;

  function charsBefore(lines, row) {
    return lines.slice(0, row).reduce(function (n, line) { return n + line.text.length; }, 0);
  }

  // Width and line-height sliders must reflow the message, not replay it from the start.
  function rewrapSpeech() {
    var s = rt.speech;
    var width = st().speech.text.width;
    var key = speechKey(width);
    if (s.key === key) return;
    s.key = key;
    s.lines = wrapSpeech(width);
    if (!s.typing) s.revealed = charsBefore(s.lines, s.lines.length);
    s.scrollLine = lab.clamp(s.scrollLine, 0, speechMaxScroll());
  }

  function renderSpeech() {
    var t = st().speech.text;
    var s = rt.speech;
    rewrapSpeech();
    s.scrollLine = lab.clamp(s.scrollLine, 0, speechMaxScroll());
    show(els.speech, t.visible);
    place(els.speech, t.x, t.y, t.width, t.height);
    var view = visibleLines();
    var shown = s.lines.slice(s.scrollLine, s.scrollLine + view).map(function (line, i) {
      return { text: line.text, role: line.role, gap: speakerGapBefore(s.lines, s.scrollLine, s.scrollLine + i) };
    });
    var budget = s.typing ? s.revealed - charsBefore(s.lines, s.scrollLine) : undefined;
    lab.drawLines(els.speechCanvas, shown, t.font, t.lineHeight, t.width, t.height, budget, 'dialogue');
    place(els.speechCanvas, 0, 0, t.width, t.height);

    var ind = st().speech.indicator;
    var overflow = speechMaxScroll() > 0 && t.visible;
    var revealedLines = 0;
    for (var chars = 0; revealedLines < s.lines.length && chars < s.revealed; revealedLines++) chars += s.lines[revealedLines].text.length;
    var needed = overflow && (!s.typing || revealedLines > view);
    els.indicator.classList.toggle('on', needed);
    els.indicator.dataset.overflow = needed ? 'true' : 'false';
    var total = s.lines.length || 1;
    var h = lab.clamp(Math.round((ind.height * view) / total), 12, ind.height);
    var max = speechMaxScroll();
    var y = ind.y + (max ? Math.round(((ind.height - h) * s.scrollLine) / max) : 0);
    place(els.indicator, ind.x, y, ind.width, h);
  }

  function finishSpeech() {
    clearInterval(typeTimer);
    var s = rt.speech;
    s.typing = false;
    s.revealed = charsBefore(s.lines, s.lines.length);
    s.scrollLine = 0;
    renderSpeech();
  }
  lab.finishSpeech = finishSpeech;

  // The player's own line is never typed: everything up to the player's last line is on screen at
  // once, and only the NPC's lines after it type.
  function startSpeech() {
    clearInterval(typeTimer);
    var t = st().speech.text;
    var s = rt.speech;
    s.lines = wrapSpeech(t.width);
    s.key = speechKey(t.width);
    var own = 0;
    s.lines.forEach(function (line, i) { if (line.role === 'choices') own = i + 1; });
    s.revealed = charsBefore(s.lines, own);
    s.scrollLine = 0;
    while (own > s.scrollLine + linesFrom(s.scrollLine)) s.scrollLine++;
    s.typing = true;
    typeTimer = setInterval(function () {
      var total = charsBefore(s.lines, s.lines.length);
      s.revealed++;
      if (s.revealed >= total) {
        clearInterval(typeTimer);
        s.typing = false;
      }
      // Follow the newest line while typing; the finished message stays where it landed.
      var row = 0;
      for (var chars = 0; row < s.lines.length; row++) {
        chars += s.lines[row].text.length;
        if (chars >= s.revealed) break;
      }
      var top = 0;
      while (row >= top + linesFrom(top)) top++;
      s.scrollLine = lab.clamp(top, 0, speechMaxScroll());
      renderSpeech();
    }, 1000 / t.charsPerSecond);
    renderSpeech();
  }
  lab.startSpeech = startSpeech;

  // After a send, the owner's turn flow: the player's line is added below the NPC's at once,
  // pushing it up (scroll back to read it), and after a beat the NPC's answer types in below.
  function startReply(text) {
    rt.speechReply = { parts: speechParts().concat([{ text: text, role: 'choices' }]) };
    finishSpeech();
    setSpeechScroll(speechMaxScroll());
  }

  function answerReply() {
    rt.speechReply.parts = rt.speechReply.parts.concat([{ text: lab.samples.npcAnswer, role: 'dialogue' }]);
    startSpeech();
  }

  function clearReply() {
    if (!rt.speechReply) return;
    rt.speechReply = null;
    finishSpeech();
  }

  // Objective -----------------------------------------------------------------------
  function buildObjective() {
    els.objTitle = el('canvas', 'hit-area', stage, { id: 'objectiveTitle', 'data-comp': 'obj-title' });
    els.objBody = el('canvas', 'hit-area', stage, { id: 'objectiveBody', 'data-comp': 'obj-body' });
  }

  // Centred by the drawn pixels of the text, using the glyph map rather than a browser font.
  function centeredTitleX(title) {
    return title.plaque.x + Math.floor((title.plaque.width - lab.inkWidth(title.text, 'objective')) / 2) + title.alignOffsetX;
  }
  lab.centeredTitleX = centeredTitleX;

  function renderObjective() {
    var title = st().objective.title;
    var body = st().objective.body;
    if (title.centered) title.x = centeredTitleX(title);
    var lh = lab.lineHeightOf('objective');
    var ink = lab.inkWidth(title.text, 'objective');
    show(els.objTitle, title.visible);
    lab.drawLines(els.objTitle, [title.text], title.font, lh, Math.max(1, ink), lh, undefined, 'objective');
    place(els.objTitle, title.x, title.y, Math.max(1, ink), lh);

    var lines = lab.wrap(body.text, body.width, 'objective');
    var bodyH = Math.max(1, lines.length * body.lineHeight);
    show(els.objBody, body.visible);
    lab.drawLines(els.objBody, lines, body.font, body.lineHeight, body.width, bodyH, undefined, 'objective');
    place(els.objBody, body.x, body.y, body.width, bodyH);
    els.objBody.dataset.lines = lines.length;
  }

  // ------------------------------------------------------------------------------------
  lab.renderAll = function () {
    renderInventory();
    renderUtility();
    renderChoices();
    renderSpeech();
    renderObjective();
  };

  lab.buildStage = function () {
    stage = document.getElementById('stage');
    buildInventory();
    buildUtility();
    buildChoiceViewport();
    buildThumb();
    buildSpeech();
    buildObjective();
    els.guides = document.getElementById('guides');
    lab.renderAll();
    startSpeech();
  };

  lab.stepInventory = stepInventory;
  lab.stageEls = els;
})();
