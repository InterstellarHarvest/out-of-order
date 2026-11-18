// Stage capture: the game's real rendered frame as a 1920x1080 canvas (docs/94).
//
// The stage is a tree of absolutely positioned <img> and <canvas> elements (scene and portrait art,
// the shell, every text surface, cards, inventory, utility controls) plus a few CSS-drawn boxes.
// G.captureStage() draws exactly those elements, in paint order, from their own pixels:
//   - an <img> or <canvas> is drawn at its on-screen box, smoothing off;
//   - a background colour and inset box-shadows (the only CSS painting the stage uses) are filled;
//   - opacity multiplies down the tree; display:none / visibility:hidden paint nothing;
//   - an element with overflow other than visible clips its descendants (the apertures, the card
//     viewport).
// Boxes are measured with getBoundingClientRect and divided by the stage's own fit-to-window scale,
// so the result is always in canonical 1920x1080 stage coordinates, whatever the window size.
// Not reproduced: CSS clip-path chamfers (1-2 px corners of the scroll thumbs and tooltip), which
// game/qa/run_end_presentation_qa.js measures against a real browser screenshot.
//
// The capture reads only the DOM: it never changes it, the game state or the save.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var W = 1920;
  var H = 1080;

  function parseColor(c) {
    var m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    var p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { css: c, a: p.length > 3 ? p[3] : 1 };
  }
  // Inset box-shadows with no blur: "rgb(r, g, b) Xpx Ypx 0px SPREADpx inset", listed top first.
  function insetShadows(v) {
    var out = [];
    var re = /(rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+inset/g;
    var m;
    while ((m = re.exec(v || ''))) out.push({ color: m[1], x: +m[2], y: +m[3], blur: +m[4], spread: +m[5] });
    return out;
  }

  G.captureStage = function (opts) {
    var o = opts || {};
    var stage = document.getElementById('stage');
    var sr = stage.getBoundingClientRect();
    var k = sr.width / W || 1;
    var c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var box = function (el) {
      var r = el.getBoundingClientRect();
      return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
    };
    var skip = o.exclude || [];
    var stats = { images: 0, canvases: 0, fills: 0, shadows: 0 };

    function paint(el, alpha) {
      if (skip.indexOf(el) !== -1) return;
      var cs = getComputedStyle(el);
      if (cs.display === 'none') return;
      var a = alpha * (parseFloat(cs.opacity) || 0);
      if (a <= 0) return;
      var b = box(el);
      var visible = cs.visibility !== 'hidden' && b.w > 0 && b.h > 0;
      ctx.save();
      ctx.globalAlpha = a;
      if (visible) {
        var bg = parseColor(cs.backgroundColor);
        if (bg && bg.a > 0) { ctx.fillStyle = bg.css; ctx.fillRect(b.x, b.y, b.w, b.h); stats.fills++; }
        insetShadows(cs.boxShadow).reverse().forEach(function (s) {
          if (s.blur) return;
          ctx.save();
          ctx.beginPath();
          ctx.rect(b.x, b.y, b.w, b.h);
          ctx.clip();
          ctx.beginPath();
          ctx.rect(b.x, b.y, b.w, b.h);
          ctx.rect(b.x + s.spread + s.x, b.y + s.spread + s.y, b.w - 2 * s.spread, b.h - 2 * s.spread);
          ctx.fillStyle = s.color;
          ctx.fill('evenodd');
          ctx.restore();
          stats.shadows++;
        });
        if (el.tagName === 'IMG' && el.complete && el.naturalWidth) { ctx.drawImage(el, b.x, b.y, b.w, b.h); stats.images++; }
        else if (el.tagName === 'CANVAS' && el.width && el.height) { ctx.drawImage(el, b.x, b.y, b.w, b.h); stats.canvases++; }
      }
      if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        ctx.beginPath();
        ctx.rect(b.x, b.y, b.w, b.h);
        ctx.clip();
      }
      for (var i = 0; i < el.children.length; i++) paint(el.children[i], a);
      ctx.restore();
    }

    var sb = parseColor(getComputedStyle(stage).backgroundColor);
    ctx.fillStyle = sb && sb.a > 0 ? sb.css : '#000';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < stage.children.length; i++) paint(stage.children[i], 1);
    c.dataset.capture = JSON.stringify(stats);
    return c;
  };
})();
