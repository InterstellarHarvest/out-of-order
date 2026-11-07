// Labelled developer placeholders for art the owner has not yet commissioned or approved.
// They are drawn at runtime, so no placeholder image enters art/. Every one is neutral grey,
// hatched, and says DEV PLACEHOLDER on its face, so none can be mistaken for approved art.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var T = G.text;
  var P = (G.placeholders = {});

  var BASE = '#34393b';
  var HATCH = '#3c4244';
  var EDGE = '#5b6366';

  function hatch(ctx, w, h) {
    ctx.fillStyle = BASE;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = HATCH;
    // 45-degree stripes on a 16px pitch, drawn as whole pixels.
    for (var y = 0; y < h; y++) {
      for (var x0 = -h; x0 < w; x0 += 16) {
        var x = x0 + y;
        if (x + 6 > 0 && x < w) ctx.fillRect(Math.max(0, x), y, Math.min(6, w - Math.max(0, x)), 1);
      }
    }
    ctx.fillStyle = EDGE;
    ctx.fillRect(0, 0, w, 2);
    ctx.fillRect(0, h - 2, w, 2);
    ctx.fillRect(0, 0, 2, h);
    ctx.fillRect(w - 2, 0, 2, h);
  }

  // Lines of { text, role } in light ink, as a block at (x, y). Returns the block's height.
  function block(ctx, x, y, width, items) {
    var lines = [];
    items.forEach(function (it) {
      T.wrap(it.text, width, it.role).forEach(function (t, i) {
        lines.push({ text: t, role: it.role, gap: i === 0 && lines.length ? (it.gap || 0) : 0 });
      });
    });
    var lh = 26;
    var h = lines.reduce(function (n, l) { return n + lh + (l.gap || 0); }, 0);
    var c = document.createElement('canvas');
    T.draw(c, lines, 'light', lh, width, Math.max(1, h), undefined, 'labels');
    ctx.drawImage(c, x, y);
    return h;
  }

  P.panel = function (canvas, w, h, title, notes) {
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    hatch(ctx, w, h);
    var items = [{ text: 'DEV PLACEHOLDER', role: 'labels' }, { text: title, role: 'labels', gap: 10 }];
    (notes || []).forEach(function (n, i) { items.push({ text: n, role: 'dialogue', gap: i === 0 ? 14 : 0 }); });
    block(ctx, 24, 24, w - 48, items);
    canvas.dataset.placeholder = title;
  };

  // The item's slot art at a whole-number scale, on the placeholder ground, with a caption.
  // Stands in for <item>_inspect.png until that art is approved.
  P.inspectArt = function (canvas, w, h, slotImage, title) {
    P.panel(canvas, w, h, title, ['THE SLOT SPRITE IS SHOWN AT 3X UNTIL THE INSPECT ART EXISTS.']);
    var ctx = canvas.getContext('2d');
    if (slotImage) {
      var s = 3;
      var iw = slotImage.width * s;
      var ih = slotImage.height * s;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(slotImage, Math.floor((w - iw) / 2), Math.max(140, Math.floor((h - ih) / 2) + 40), iw, ih);
    }
  };

  // A slot-sized stand-in for an item without slot art (QA's overflow items only).
  P.slotItem = function (canvas, label) {
    canvas.width = 96;
    canvas.height = 96;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = EDGE;
    ctx.fillRect(18, 18, 60, 60);
    ctx.fillStyle = BASE;
    ctx.fillRect(20, 20, 56, 56);
    var c = document.createElement('canvas');
    var size = T.label(c, label, 'light', 'labels');
    ctx.drawImage(c, Math.floor((96 - size[0]) / 2), Math.floor((96 - T.capHeight('labels')) / 2));
  };

})();
