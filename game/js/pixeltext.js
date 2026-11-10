// Asset paths, image loading and bitmap text for the slice.
// The text routines are ported from tools/layout-lab/js/core.js (the lab stays untouched):
// glyphs go down at whole pixels with smoothing off, baked faces are tinted to the two inks,
// and each role (dialogue, choices, labels, objective) uses the face the lab's working layout
// assigns to it.
(function () {
  'use strict';

  var DATA = window.M1_LAB_DATA; // the lab's bundle: working layout, fonts, glyph maps, action glyphs
  var SHEET = window.M1_SPRITE_SHEET;
  // game/index.html sits one folder below the repository root. A page elsewhere that loads these
  // same scripts (the polish lab's stage, docs/62) sets window.CYOA_ROOT first; the game does not.
  var ROOT = window.CYOA_ROOT || '../';

  var G = (window.CYOA_GAME = window.CYOA_GAME || {});
  G.layout = JSON.parse(JSON.stringify(DATA.placementDefault));
  G.measured = DATA.measured;

  // Lab data names files relative to tools/layout-lab/; content names them from the repo root.
  G.url = function (p) {
    return ROOT + String(p).replace(/^(\.\.\/)+/, '');
  };
  G.spriteUrl = function (name) {
    var entry = SHEET.sprites[name];
    if (!entry) throw new Error('Unknown sprite: ' + name);
    return ROOT + 'art/ui/' + entry.package_path;
  };
  G.glyphUrl = function (name) {
    var g = DATA.actionGlyphs[name];
    if (!g) throw new Error('Unknown action glyph: ' + name);
    return G.url(g.file);
  };
  G.glyphSize = function (name) {
    return DATA.actionGlyphs[name].size;
  };

  var images = {};
  var bound = {}; // image name -> the url it is (being) decoded from: one name, one file
  var pending = {}; // image name -> its decode, while in flight
  G.image = function (name) {
    return images[name];
  };

  // Decodes exactly `list` ([{ name, url }]) into the one image cache that G.image reads (engine S3,
  // docs/83). A name already decoded, or still decoding, from the same url is reused and never
  // requested again; a name already bound to a different url is refused. Resolves with
  // { requested, reused } (image names) once every image has decoded. If any image cannot be
  // used, it waits for the rest and then rejects once, with every failure in `err.failures`
  // ([{ name, url, reason }]) and in the message ('Missing image: <url>' as before for one).
  G.decodeImages = function (list) {
    var requested = [];
    var reused = [];
    return Promise.all(list.map(function (item) {
      if (has(bound, item.name) && bound[item.name] !== item.url) {
        return { name: item.name, url: item.url, reason: 'already bound to ' + bound[item.name] };
      }
      if (images[item.name] && !pending[item.name]) {
        reused.push(item.name);
        return null;
      }
      if (pending[item.name]) {
        reused.push(item.name);
        return pending[item.name];
      }
      requested.push(item.name);
      bound[item.name] = item.url;
      pending[item.name] = new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () {
          images[item.name] = img;
          img.decode().then(done, done);
        };
        img.onerror = function () {
          delete bound[item.name]; // a later call may try again
          done({ name: item.name, url: item.url, reason: 'missing' });
        };
        function done(failure) {
          delete pending[item.name];
          resolve(failure && failure.reason ? failure : null);
        }
        img.src = item.url;
      });
      return pending[item.name];
    })).then(function (results) {
      var failures = results.filter(Boolean);
      if (failures.length) {
        var err = new Error(failures.length === 1 && failures[0].reason === 'missing'
          ? 'Missing image: ' + failures[0].url
          : 'Images not loaded: ' + failures.map(function (f) { return f.name + ' (' + f.url + ': ' + f.reason + ')'; }).join('; '));
        err.failures = failures;
        throw err;
      }
      return { requested: requested, reused: reused };
    });
  };
  function has(o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
  }

  // Everything drawn to canvas is decoded before the first frame: the sprite package and fonts,
  // plus `extra` (js/main.js's boot list).
  G.loadImages = function (extra) {
    var list = Object.keys(SHEET.sprites)
      .filter(function (n) { return n !== 'locked_pixel_font_atlas'; }) // obsolete atlas, never requested
      .map(function (n) { return { name: n, url: G.spriteUrl(n) }; })
      .concat(Object.keys(DATA.fonts).map(function (id) { return { name: 'font:' + id, url: G.url(DATA.fonts[id].atlas) }; }))
      .concat(extra || []);
    return G.decodeImages(list);
  };

  // Bitmap text ------------------------------------------------------------------------------
  var INK = { dark: '#203037', light: '#f1d898' };
  var LOCKED = {
    id: 'locked',
    mapping: DATA.glyphs.mapping,
    lineHeight: DATA.glyphs.lineHeight,
    capHeight: DATA.glyphs.mapping.A.bearingY + DATA.glyphs.mapping.A.h
  };
  var faces = { locked: LOCKED };
  Object.keys(DATA.fonts).forEach(function (id) { faces[id] = Object.assign({ id: id }, DATA.fonts[id]); });

  var T = (G.text = {});
  T.charset = Object.keys(LOCKED.mapping);

  T.face = function (role) {
    return faces[G.layout.typeface[role]] || LOCKED;
  };

  function glyph(ch, face) {
    return face.mapping[ch] || face.mapping['?'];
  }

  T.advance = function (text, role) {
    var face = T.face(role);
    var w = 0;
    for (var i = 0; i < text.length; i++) w += glyph(text[i], face).advance;
    return w;
  };

  T.inkWidth = function (text, role) {
    if (!text) return 0;
    var last = glyph(text[text.length - 1], T.face(role));
    return T.advance(text.slice(0, -1), role) + (last.bearingX || 0) + last.w;
  };

  T.lineHeight = function (role) {
    return T.face(role).lineHeight;
  };
  T.capHeight = function (role) {
    return T.face(role).capHeight;
  };

  // Paragraphs split on \n; an empty paragraph keeps its blank line.
  T.wrap = function (text, maxWidth, role) {
    var out = [];
    text.split('\n').forEach(function (para) {
      var line = '';
      para.split(' ').forEach(function (word) {
        var candidate = line ? line + ' ' + word : word;
        if (line && T.advance(candidate, role) > maxWidth) {
          out.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      out.push(line);
    });
    return out;
  };

  // A line is a string in `role`, or { text, role, gap }. maxChars counts across lines in order
  // for the typewriter.
  T.draw = function (canvas, lines, ink, lineHeight, width, height, maxChars, role) {
    canvas.width = width;
    canvas.height = height;
    var left = maxChars === undefined ? Infinity : maxChars;
    var rows = lines.map(function (line) {
      var text = typeof line === 'string' ? line : line.text;
      var n = Math.max(0, Math.min(text.length, left));
      left -= n;
      return { text: text.slice(0, n), role: typeof line === 'string' ? role : line.role, ink: (typeof line !== 'string' && line.ink) || ink };
    });
    var tops = [];
    lines.reduce(function (y, line, i) {
      tops[i] = y + ((typeof line !== 'string' && line.gap) || 0);
      return tops[i] + lineHeight;
    }, 0);
    var ctx = canvas.getContext('2d');
    var layers = {};
    rows.forEach(function (r) { layers[r.role + '|' + r.ink] = { role: r.role, ink: r.ink }; });
    Object.keys(layers).forEach(function (k) {
      // Each face and ink is tinted on its own layer, so one tint never touches another's pixels.
      var layer = document.createElement('canvas');
      layer.width = width;
      layer.height = height;
      paint(layer.getContext('2d'), rows.map(function (r) { return r.role + '|' + r.ink === k ? r.text : ''; }), tops, layers[k].ink, width, height, T.face(layers[k].role));
      ctx.drawImage(layer, 0, 0);
    });
  };

  function paint(ctx, rows, tops, ink, width, height, face) {
    var atlas = face === LOCKED
      ? images[ink === 'light' ? 'locked_pixel_font_atlas_light' : 'locked_pixel_font_atlas_dark']
      : images['font:' + face.id];
    ctx.imageSmoothingEnabled = false;
    rows.forEach(function (line, row) {
      var x = 0;
      for (var i = 0; i < line.length; i++) {
        var g = glyph(line[i], face);
        if (g.w && g.h) ctx.drawImage(atlas, g.x, g.y, g.w, g.h, x + (g.bearingX || 0), tops[row] + (g.bearingY || 0), g.w, g.h);
        x += g.advance;
      }
    });
    if (face !== LOCKED) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = INK[ink === 'light' ? 'light' : 'dark'];
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // One line of text on a fresh canvas sized to its ink.
  T.label = function (canvas, text, ink, role) {
    var w = Math.max(1, T.inkWidth(text, role));
    var lh = T.lineHeight(role);
    T.draw(canvas, [text], ink, lh, w, lh, undefined, role);
    return [w, lh];
  };
})();
