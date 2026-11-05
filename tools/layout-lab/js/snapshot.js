// Overflow warnings, and Save Layout Snapshot.
(function () {
  'use strict';

  var lab = window.M1Lab;

  // Warnings ------------------------------------------------------------------------------
  // Facts about the current placement measured against the shell. They inform, never block.
  function overlaps(a, b) {
    return a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  }

  function outside(rect, box) {
    return rect[0] < box[0] || rect[1] < box[1] || rect[0] + rect[2] > box[0] + box[2] || rect[1] + rect[3] > box[1] + box[3];
  }

  lab.warnings = function () {
    var s = lab.state;
    var r = lab.measured.regions;
    var bay = r.inventoryBay.floor;
    var utilityBay = r.utilityBay.floor;
    var out = [];
    function warn(id, text, rect) {
      out.push({ id: id, text: text, rect: rect });
    }

    var slots = lab.rectOf('inv-slots');
    if (s.inventory.visible && outside(slots, bay)) warn('slots-bay', 'Slots extend past the inventory bay.', slots);
    ['left', 'right'].forEach(function (side) {
      var arrow = lab.rectOf('inv-' + side);
      if (overlaps(arrow, slots)) warn('arrow-slots-' + side, 'The ' + side + ' arrow overlaps the slots.', arrow);
      if (outside(arrow, bay)) warn('arrow-bay-' + side, 'The ' + side + ' arrow extends past the inventory bay.', arrow);
    });

    var ids = s.utility.buttons.map(function (b) { return 'util-' + b.id; });
    ids.forEach(function (id, i) {
      var rect = lab.rectOf(id);
      var button = s.utility.buttons[i];
      if (outside(rect, utilityBay)) warn(id + '-bay', button.label + ' extends past the utility bay.', rect);
      if (i && overlaps(rect, lab.rectOf(ids[i - 1]))) warn(id + '-overlap', button.label + ' overlaps its neighbour.', rect);
      var glyph = s.utility.show === 'glyph' && lab.actionGlyphs[button.glyph];
      if (glyph && (glyph.size[0] > button.displayWidth || glyph.size[1] > button.displayHeight)) {
        warn(id + '-glyph', button.label + ' glyph is larger than its button.', rect);
      }
      if (!glyph && lab.inkWidth(button.label, 'labels') > button.displayWidth) warn(id + '-label', button.label + ' label is wider than its button.', rect);
    });

    var thumb = s.scrollbar.thumb;
    var channel = r.choiceTrack.channel;
    var thumbRect = lab.rectOf('scroll-thumb');
    if (thumb.x < channel[0] || thumb.x + thumb.displayWidth > channel[0] + channel[2]) {
      warn('thumb-channel', 'The thumb is wider than the track channel.', thumbRect);
    }
    if (s.scrollbar.track.height < Math.max(thumb.minHeight, thumb.capHeight * 2)) {
      warn('thumb-track', 'The track is shorter than the minimum thumb.', thumbRect);
    }

    var vp = lab.rectOf('choice-viewport');
    var free = r.choicePanel.freeVertical;
    if (vp[1] < free[0] || vp[1] + vp[3] - 1 > free[1]) warn('choice-band', 'The choice viewport leaves the free band around its panel.', vp);
    lab.cardLayout().forEach(function (card) {
      if (card.overflowLines) warn('card-' + card.index, 'Card ' + (card.index + 1) + ' text needs more than four lines and is cut off.', vp);
    });

    var title = lab.rectOf('obj-title');
    var opening = s.objective.title.plaque;
    if (title[0] < opening.x || title[0] + title[2] > opening.x + opening.width) {
      warn('title-plaque', 'The objective title leaves the plaque opening.', title);
    }
    var body = lab.rectOf('obj-body');
    var panel = r.objectivePanel.clearBelowPlaque;
    if (outside(body, panel)) warn('objective-body', 'The objective text leaves its panel.', body);

    var speech = lab.rectOf('speech-text');
    if (speech[0] + speech[2] > s.speech.indicator.x) warn('speech-gutter', 'Speech text runs into the indicator gutter.', speech);
    return out;
  };

  lab.renderWarnings = function () {
    var on = document.getElementById('toggleWarnings').checked;
    var list = lab.warnings();
    var box = document.getElementById('warningsList');
    var overlay = document.getElementById('warningMarks');
    box.textContent = '';
    overlay.textContent = '';
    box.hidden = !on || !list.length;
    overlay.hidden = !on;
    if (!on) return;
    list.forEach(function (w) {
      var line = document.createElement('p');
      line.textContent = w.text;
      line.dataset.warning = w.id;
      box.appendChild(line);
      var mark = document.createElement('div');
      mark.className = 'warning-mark';
      mark.style.left = w.rect[0] + 'px';
      mark.style.top = w.rect[1] + 'px';
      mark.style.width = w.rect[2] + 'px';
      mark.style.height = w.rect[3] + 'px';
      overlay.appendChild(mark);
    });
  };

  // Snapshot -------------------------------------------------------------------------------
  // The approved bytes as data URLs, loaded on first use. See scripts/build_lab_data.py.
  var readable = null;

  function loadReadableImages() {
    if (readable) return readable;
    readable = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'data/snapshot_assets.js';
      script.onerror = function () { reject(new Error('data/snapshot_assets.js is missing')); };
      script.onload = function () {
        var assets = window.M1_SNAPSHOT_ASSETS;
        var map = {};
        Promise.all(Object.keys(assets).map(function (name) {
          var img = new Image();
          map[name] = img;
          img.src = assets[name];
          return img.decode();
        })).then(function () { resolve(map); }, reject);
      };
      document.head.appendChild(script);
    });
    return readable;
  }

  function imageForSrc(map, src) {
    if (/layout-final\.png$/.test(src)) return map['layout-final.png'];
    var glyph = Object.keys(lab.actionGlyphs).filter(function (n) { return lab.actionGlyphs[n].file === src; })[0];
    if (glyph) return map['glyph:' + glyph];
    var file = src.split('/').pop();
    var name = Object.keys(lab.SHEET.sprites).filter(function (n) { return lab.spriteFileName(n) === file; })[0];
    return map[name];
  }

  function paintBackdrop(ctx) {
    var kind = document.getElementById('stage').dataset.backdrop;
    if (kind === 'checker') {
      for (var y = 0; y < 1080; y += 16) {
        for (var x = 0; x < 1920; x += 16) {
          ctx.fillStyle = (x / 16 + y / 16) % 2 ? '#333' : '#555';
          ctx.fillRect(x, y, 16, 16);
        }
      }
      return;
    }
    ctx.fillStyle = { dark: '#0e1b20', black: '#000', magenta: '#f0f' }[kind];
    ctx.fillRect(0, 0, 1920, 1080);
  }

  function paintIndicator(ctx, r) {
    ctx.fillStyle = '#06191c';
    ctx.fillRect(r.x + 1, r.y, r.w - 2, r.h);
    ctx.fillRect(r.x, r.y + 1, r.w, r.h - 2);
    ctx.fillStyle = '#25363a';
    ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  }

  // Same pixel-centre rule as the thumb. A scaled drawImage is not guaranteed to pick the same
  // pixels as the on-screen CSS scaling, and in Firefox it does not.
  function scaledCopy(img, w, h) {
    var source = document.createElement('canvas');
    source.width = img.naturalWidth;
    source.height = img.naturalHeight;
    var sourceCtx = source.getContext('2d');
    sourceCtx.drawImage(img, 0, 0);
    var from = sourceCtx.getImageData(0, 0, source.width, source.height).data;
    var copy = document.createElement('canvas');
    copy.width = w;
    copy.height = h;
    var ctx = copy.getContext('2d');
    var out = ctx.createImageData(w, h);
    for (var y = 0; y < h; y++) {
      var sy = Math.floor(((y + 0.5) * source.height) / h);
      for (var x = 0; x < w; x++) {
        var sx = Math.floor(((x + 0.5) * source.width) / w);
        var a = (sy * source.width + sx) * 4;
        var b = (y * w + x) * 4;
        for (var c = 0; c < 4; c++) out.data[b + c] = from[a + c];
      }
    }
    ctx.putImageData(out, 0, 0);
    return copy;
  }

  // Walks the live stage in paint order, so the file shows exactly what is on screen now.
  function compose(map) {
    var stage = document.getElementById('stage');
    var origin = stage.getBoundingClientRect();
    var k = lab.viewScale();
    var canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    paintBackdrop(ctx);

    function rectOf(node) {
      var r = node.getBoundingClientRect();
      return {
        x: Math.round((r.left - origin.left) / k),
        y: Math.round((r.top - origin.top) / k),
        w: Math.round(r.width / k),
        h: Math.round(r.height / k)
      };
    }

    stage.querySelectorAll('img, canvas, .speech-indicator').forEach(function (node) {
      if (node.closest('.tool') || !node.getClientRects().length) return;
      var r = rectOf(node);
      ctx.save();
      var card = node.closest('.choice');
      var clip = card && /inset\((\d+)px 0(?:px)? (\d+)px/.exec(card.style.clipPath);
      if (clip) {
        var c = rectOf(card);
        ctx.beginPath();
        ctx.rect(c.x, c.y + Number(clip[1]), c.w, c.h - Number(clip[1]) - Number(clip[2]));
        ctx.clip();
      }
      if (node.tagName === 'IMG') {
        var img = imageForSrc(map, node.getAttribute('src'));
        ctx.drawImage(r.w === img.naturalWidth && r.h === img.naturalHeight ? img : scaledCopy(img, r.w, r.h), r.x, r.y);
      } else if (node.tagName === 'CANVAS') {
        var copy = document.createElement('canvas');
        lab.withImages(map, function () { node.redraw(copy); });
        ctx.drawImage(copy, r.x, r.y);
      } else if (node.classList.contains('on')) {
        paintIndicator(ctx, r);
      }
      ctx.restore();
    });
    return canvas;
  }

  function download(name, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  lab.download = download;

  function stamp() {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  lab.renderSnapshot = function () {
    return loadReadableImages().then(function (map) {
      lab.settleMotion();
      return compose(map);
    });
  };

  // The JSON goes first, so a failed preview can never cost the layout itself.
  lab.saveSnapshot = function () {
    var base = 'm1-layout-' + stamp();
    download(base + '.json', new Blob([lab.exportJson()], { type: 'application/json' }));
    lab.markExported();
    lab.updateSaveState();
    return lab.renderSnapshot().then(function (canvas) {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error('the browser returned no image'));
            return;
          }
          download(base + '.png', blob);
          resolve(base);
        }, 'image/png');
      });
    }).then(function () {
      return 'Saved ' + base + '.json and .png.';
    }, function (err) {
      return 'Saved ' + base + '.json. The preview PNG failed: ' + err.message;
    });
  };
})();
