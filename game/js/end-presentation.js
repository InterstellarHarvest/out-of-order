// Cause-specific ending presentation: a FEATURE-GATED REVIEW PROOF (docs/94; death brief docs/93).
//
// Generic: this file knows no chapter, node, choice, art path or prose. What to show, and for which
// cause, comes from window.CYOA_END_PRESENTATIONS (game/content/end-presentations.review.js). It is
// OFF unless the page is opened with ?<gate>; then, when the game reaches an authored ending,
// js/story-flow.js hands it Rules.endCause, and an entry whose `when` matches every field of that
// cause opens once:
//
//   1. the real rendered frame is captured (G.captureStage, js/stage-capture.js) and frozen;
//   2. the frozen frame becomes the backdrop: hard blocks sampled at each block's centre
//      (nearest neighbour, no smoothing, blur or dithering), each RGB channel multiplied;
//   3. the composition is drawn sharp on top, at canonical stage coordinates: popup frame, the
//      art at an exact integer scale, title, body copy (the game's own bitmap faces) and the
//      control slots.
//
// Everything sits inside #stage, so the game's fit-to-window scale applies to it uniformly; it is
// never re-centred on the physical window.
//
// Controls (owner rulings on PR #11; docs/96): each slot names an `action` from a fixed list, never
// a free behaviour. 'retry' and 'checkpoint' ask the flow to restore that point (G.flow.restore);
// a slot whose action is null, or whose point is not available for this ending, is drawn
// unavailable (muted label, aria-disabled) and activating it only shows its explanation (EXIT: the
// main menu does not exist yet). Escape (review only) closes the proof and returns to the authored
// ending exactly as it was (its BEGIN AGAIN card still works). Opening or closing never commits a
// rules step, saves, or changes the state; only an available RETRY / CHECKPOINT does, through the
// flow.
//
// While open: every other stage element is `inert` (no pointer or focus); keys other than Tab,
// Shift+Tab, Enter, Space and Escape are swallowed before the game sees them; the flow's own input
// entry points also refuse (G.endPresentation.isOpen()); nothing underneath animates on screen,
// because the backdrop is a frozen image covering the whole stage.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var DATA = window.CYOA_END_PRESENTATIONS || { entries: [] };
  var W = 1920;
  var H = 1080;
  var enabled = !!DATA.gate && new RegExp('[?&]' + DATA.gate + '(=|&|$)').test(location.search);
  var open = null; // { entry, root, buttons, before, key, keyHandler }
  var shownFor = {}; // state step key -> true: an ending opens its presentation once per page
  var log = []; // QA: what opened and closed, and why
  var ACTIONS = ['retry', 'checkpoint']; // the only actions a control may name
  function available(c) {
    return !!c.action && ACTIONS.indexOf(c.action) !== -1 && !!(G.flow && G.flow.restoreAvailable && G.flow.restoreAvailable(c.action));
  }

  function matches(when, cause) {
    return !!cause && Object.keys(when).every(function (k) { return cause[k] === when[k]; });
  }
  function find(cause) {
    return DATA.entries.filter(function (e) { return matches(e.when, cause); })[0] || null;
  }
  function artKey(e) { return 'end:' + e.id; }

  // Images to decode at boot when the gate is on (js/main.js): drawn the instant an ending opens.
  function bootImages() {
    if (!enabled) return [];
    return DATA.entries.map(function (e) { return { name: artKey(e), url: G.url(e.art.path) }; });
  }

  // Drawing ---------------------------------------------------------------------------------------
  function el(tag, attrs, parent) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function place(n, x, y, w, h) {
    n.style.position = 'absolute';
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    n.style.width = w + 'px';
    n.style.height = h + 'px';
  }
  function canvas(id, w, h, parent) {
    var c = el('canvas', { id: id, 'aria-hidden': 'true' }, parent);
    c.width = w;
    c.height = h;
    c.className = 'sprite-abs';
    return c;
  }
  function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

  // Bitmap text in one of the game's own faces (the role's face, js/pixeltext.js), at an integer
  // scale, in one ink: glyphs placed at whole pixels with smoothing off, then tinted.
  function face(role) { return G.text.face(role); }
  function measure(text, role, scale) {
    var f = face(role);
    var n = 0;
    for (var i = 0; i < text.length; i++) n += ((f.mapping[text[i]] || f.mapping['?']).advance || 0) * scale;
    return n;
  }
  function wrap(text, width, role, scale) {
    var out = [];
    var line = '';
    text.split(' ').forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      if (line && measure(next, role, scale) > width) { out.push(line); line = word; } else line = next;
    });
    if (line) out.push(line);
    return out;
  }
  // Draws `lines` ([{ text, x, y }] in canvas coordinates) and tints them `ink`.
  function textCanvas(id, parent, x, y, w, h, lines, role, scale, ink) {
    var c = canvas(id, w, h, parent);
    place(c, x, y, w, h);
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var f = face(role);
    var atlas = G.image('font:' + f.id);
    if (!atlas) throw new Error('Font not decoded: ' + f.id);
    lines.forEach(function (l) {
      var cx = l.x;
      for (var i = 0; i < l.text.length; i++) {
        var g = f.mapping[l.text[i]];
        if (!g) throw new Error('No glyph for ' + JSON.stringify(l.text[i]) + ' in ' + f.id);
        if (g.w) ctx.drawImage(atlas, g.x, g.y, g.w, g.h, cx + (g.bearingX || 0) * scale, l.y + g.bearingY * scale, g.w * scale, g.h * scale);
        cx += g.advance * scale;
      }
    });
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, w, h);
    c.dataset.text = lines.map(function (l) { return l.text; }).join('\n');
    return c;
  }

  // The frozen backdrop: centre-sampled blocks, multiplied, enlarged with hard edges. The block
  // values are computed exactly from the captured pixels when the canvas can be read; a page opened
  // from file:// cannot read back its own images, and then the same centre samples come from a
  // nearest-neighbour reduction and the darkening from a multiply fill (within one level per
  // channel; recorded in data-method).
  function backdrop(frame, spec, parent) {
    var b = spec.block;
    var cols = Math.ceil(W / b);
    var rows = Math.ceil(H / b);
    var tiny = document.createElement('canvas');
    tiny.width = cols;
    tiny.height = rows;
    var tc = tiny.getContext('2d');
    var method = 'exact';
    try {
      var src = frame.getContext('2d').getImageData(0, 0, W, H).data;
      var px = tc.createImageData(cols, rows);
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var sx = Math.min(W - 1, x * b + Math.floor(b / 2));
          var sy = Math.min(H - 1, y * b + Math.floor(b / 2));
          var i = (sy * W + sx) * 4;
          var o = (y * cols + x) * 4;
          for (var ch = 0; ch < 3; ch++) px.data[o + ch] = Math.round(src[i + ch] * spec.multiply);
          px.data[o + 3] = 255;
        }
      }
      tc.putImageData(px, 0, 0);
    } catch (e) {
      method = 'reduced';
      tc.imageSmoothingEnabled = false;
      tc.drawImage(frame, 0, 0, cols * b, rows * b, 0, 0, cols, rows);
      tc.globalCompositeOperation = 'multiply';
      var v = Math.round(255 * spec.multiply);
      tc.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
      tc.fillRect(0, 0, cols, rows);
    }
    var c = canvas('endBackdrop', W, H, parent);
    place(c, 0, 0, W, H);
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tiny, 0, 0, cols * b, rows * b);
    c.dataset.method = method;
    c.dataset.block = String(b);
    c.dataset.multiply = String(spec.multiply);
    return c;
  }

  function compose(e, root) {
    var L = e.layout;
    var C = e.palette;
    var p = L.popup;
    // Frame, art mat, separator and control boxes: one canvas, exact fills.
    var panel = canvas('endPanel', W, H, root);
    place(panel, 0, 0, W, H);
    var ctx = panel.getContext('2d');
    var x = p[0], y = p[1], w = p[2], h = p[3], s = L.shadow;
    rect(ctx, x + s, y + s, w, h, C.shadow); rect(ctx, x, y, w, h, C.edge);
    rect(ctx, x + 4, y + 4, w - 8, h - 8, C.bevel); rect(ctx, x + 8, y + 8, w - 16, h - 16, C.light);
    rect(ctx, x + 12, y + 12, w - 24, h - 24, C.face); rect(ctx, x + 12, y + h - 16, w - 24, 4, C.lowerBorder);
    var f = L.artFrame, m = L.artMat;
    rect(ctx, f[0], f[1], f[2], f[3], C.artFrame); rect(ctx, m[0], m[1], m[2], m[3], C.artMat);
    var sp = L.separator;
    rect(ctx, sp[0], sp[1], sp[2], 4, C.separator); rect(ctx, sp[0], sp[1] + 4, sp[2], 2, C.separatorLight);
    var K = L.controls;
    e.controls.forEach(function (c, i) {
      var bx = K.x + i * K.step;
      rect(ctx, bx + K.shadow, K.y + K.shadow, K.w, K.h, C.controlShadow); rect(ctx, bx, K.y, K.w, K.h, C.controlEdge);
      rect(ctx, bx + 4, K.y + 4, K.w - 8, K.h - 8, C.controlFace); rect(ctx, bx + 8, K.y + 8, K.w - 16, 4, C.controlHighlight);
    });
    // The art: the decoded native image itself, at its exact integer scale.
    var img = G.image(artKey(e));
    if (!img || !img.complete || img.naturalWidth !== e.art.size[0] || img.naturalHeight !== e.art.size[1]) throw new Error('End art not decoded at its native size: ' + e.art.path);
    var art = img.cloneNode(false);
    art.id = 'endArt';
    art.alt = '';
    art.setAttribute('aria-hidden', 'true');
    art.className = 'sprite-abs';
    art.width = e.art.size[0] * e.art.scale;
    art.height = e.art.size[1] * e.art.scale;
    place(art, L.art[0], L.art[1], art.width, art.height);
    root.appendChild(art);
    // Title and body: independent text canvases in the game's faces.
    var T = L.title;
    var tw = measure(e.title, T.role, T.scale);
    var title = textCanvas('endTitle', root, Math.round(W / 2 - tw / 2), T.y, tw, face(T.role).lineHeight * T.scale, [{ text: e.title, x: 0, y: 0 }], T.role, T.scale, C.ink);
    title.setAttribute('role', 'heading');
    var B = L.body;
    var lines = [];
    var by = 0;
    e.body.forEach(function (para) {
      wrap(para, B.width, B.role, B.scale).forEach(function (t) { lines.push({ text: t, x: 0, y: by }); by += B.lineStep; });
      by += B.paragraphGap;
    });
    textCanvas('endBody', root, B.x, B.y, B.width + 32, by, lines, B.role, B.scale, C.ink);
    // Controls: real buttons. An available one restores its point; an unavailable one is drawn
    // in the muted ink and only explains why (never a silent no-op, never a fake action).
    var buttons = e.controls.map(function (c, i) {
      var bx = K.x + i * K.step;
      var ok = available(c);
      var btn = el('button', { type: 'button', id: 'endControl' + i, class: 'hit', 'aria-disabled': ok ? 'false' : 'true',
        'aria-label': c.label + (ok ? '' : ': unavailable. ' + c.unavailable) }, root);
      place(btn, bx, K.y, K.w, K.h);
      btn.style.background = 'none';
      btn.style.border = '0';
      btn.style.padding = '0';
      btn.dataset.label = c.label;
      btn.dataset.action = c.action || '';
      btn.dataset.available = ok ? 'true' : 'false';
      var lw = measure(c.label, K.role, K.scale);
      var lc = textCanvas('endControlLabel' + i, btn, Math.round((K.w - lw) / 2), K.labelY, lw, face(K.role).lineHeight * K.scale, [{ text: c.label, x: 0, y: 0 }], K.role, K.scale, ok ? C.ink : C.inkUnavailable);
      lc.style.pointerEvents = 'none';
      btn.addEventListener('click', function () { activate(i); });
      return btn;
    });
    // The review notice, on the backdrop above the popup (never inside the approved composition).
    var N = L.notice;
    var nw = measure(e.notice, N.role, N.scale);
    var lh = face(N.role).lineHeight * N.scale;
    var plate = el('div', { id: 'endNotice', role: 'status', 'aria-live': 'polite' }, root);
    place(plate, N.x, N.y, nw + 20, lh + 16);
    plate.style.background = C.noticePlate;
    var nt = textCanvas('endNoticeText', plate, 10, 8, nw, lh, [{ text: e.notice, x: 0, y: 0 }], N.role, N.scale, C.noticeInk);
    nt.style.pointerEvents = 'none';
    plate.setAttribute('aria-label', e.notice);
    return buttons;
  }

  // A control was activated: an available one restores its point through the flow (which closes
  // this presentation); an unavailable one shows its explanation and does nothing else.
  function activate(i) {
    if (!open) return;
    var c = open.entry.controls[i];
    if (available(c)) {
      log.push({ t: 'control', label: c.label, action: c.action });
      if (!G.flow.restore(c.action)) note(c.label + ' FAILED - NOTHING WAS CHANGED');
      return;
    }
    log.push({ t: 'control', label: c.label, action: null });
    note(c.unavailable);
  }
  function note(msg) {
    if (!open) return;
    var plate = open.root.querySelector('#endNotice');
    var N = open.entry.layout.notice;
    var nw = measure(msg, N.role, N.scale);
    var lh = face(N.role).lineHeight * N.scale;
    plate.textContent = '';
    place(plate, N.x, N.y, nw + 20, lh + 16);
    textCanvas('endNoticeText', plate, 10, 8, nw, lh, [{ text: msg, x: 0, y: 0 }], N.role, N.scale, open.entry.palette.noticeInk).style.pointerEvents = 'none';
    plate.setAttribute('aria-label', msg);
  }

  // Open / close ---------------------------------------------------------------------------------
  function openFor(entry, key) {
    var stage = document.getElementById('stage');
    var frame = G.captureStage();
    var root = el('div', { id: 'endPresentation', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'endTitle', tabindex: '-1' });
    place(root, 0, 0, W, H);
    root.dataset.entry = entry.id;
    root.dataset.capture = frame.dataset.capture;
    backdrop(frame, entry.backdrop, root);
    var buttons = compose(entry, root);
    root.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
    root.addEventListener('wheel', function (ev) { ev.preventDefault(); ev.stopPropagation(); }, { passive: false });
    var before = document.activeElement;
    var siblings = Array.prototype.slice.call(stage.children).filter(function (n) { return !n.inert; });
    siblings.forEach(function (n) { n.inert = true; });
    stage.appendChild(root);
    // Keys act on keydown only; their keyup is swallowed too, so the game never sees either half.
    var onKey = function (ev) {
      if (!open) return;
      if (ev.type !== 'keydown') { ev.preventDefault(); ev.stopPropagation(); return; }
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close('escape'); return; }
      if (ev.key === 'Tab') {
        ev.preventDefault();
        ev.stopPropagation();
        var i = buttons.indexOf(document.activeElement);
        var n = ev.shiftKey ? (i <= 0 ? buttons.length - 1 : i - 1) : (i + 1) % buttons.length;
        buttons[n].focus({ preventScroll: true });
        return;
      }
      if ((ev.key === 'Enter' || ev.key === ' ') && buttons.indexOf(document.activeElement) !== -1) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!ev.repeat) activate(buttons.indexOf(document.activeElement));
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    open = { entry: entry, root: root, buttons: buttons, before: before, key: key, keyHandler: onKey, inerted: siblings };
    document.body.dataset.endPresentation = entry.id;
    root.focus({ preventScroll: true });
    log.push({ t: 'open', id: entry.id, key: key });
  }
  function close(why) {
    if (!open) return;
    var o = open;
    open = null;
    window.removeEventListener('keydown', o.keyHandler, true);
    window.removeEventListener('keyup', o.keyHandler, true);
    if (o.root.parentNode) o.root.parentNode.removeChild(o.root);
    o.inerted.forEach(function (n) { n.inert = false; });
    delete document.body.dataset.endPresentation;
    if (o.before && document.contains(o.before) && o.before.focus) o.before.focus({ preventScroll: true });
    log.push({ t: 'close', id: o.entry.id, why: why });
  }

  G.endPresentation = {
    enabled: enabled,
    bootImages: bootImages,
    isOpen: function () { return !!open; },
    // js/story-flow.js: the game is at an authored ending, settled, with its cards on show.
    // stepKey identifies the state (its step count and node); an ending opens once per page.
    reached: function (cause, stepKey) {
      if (!enabled || open || !cause) return null;
      var entry = find(cause);
      if (!entry || shownFor[stepKey]) return null;
      shownFor[stepKey] = true;
      openFor(entry, stepKey);
      return entry.id;
    },
    // Dismissal (Escape does the same, review only): back to the authored ending, unchanged. The
    // flow also closes it, with the action's name, just before a RETRY / CHECKPOINT restore.
    close: function (why) { close(why || 'api'); },
    log: function () { return log.slice(); },
    entries: function () { return DATA.entries.slice(); }
  };
})();
