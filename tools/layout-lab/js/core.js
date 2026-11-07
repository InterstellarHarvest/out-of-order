// Shared lab state, sprite lookup, bitmap text and placement JSON handling.
(function () {
  'use strict';

  var DATA = window.M1_LAB_DATA;
  var SHEET = window.M1_SPRITE_SHEET;
  var PACKAGE_ROOT = '../../art/ui/';
  var STORAGE_KEY = 'm1-ui-placement-lab/v1';
  var EXPORT_KEY = STORAGE_KEY + ':exported';
  var PREVIOUS_ATLASES = ['25e96344eba4d09b84d4e4baf85ef11f34fd3bba3f83f4ca5ab88343a0b237ee', 'bf636c757c30fa33b45f8ae370374d0349fb615a0d64a23cde873099b64a7013', '1c5990ba16a88c4986709187628d7ba81460c985bcd0b290c83cdca540bd8d2e', '1f7094a543124dda679382b0ad3eebf06876d3173108126b2c5ad3113a911826', '002786f60dec4929cf0120b6c399105c0420a7414c1a48a69a4f10bda7192cb5', '15572035d8d2c39acad00bee31f74837d8cda1a3912eb1e985b1a9da5ec9a844'];

  // QA pins a baseline of its own, so its expectations do not move each time the owner's
  // defaults change. Nothing else sets this.
  var BASELINE = window.M1_LAB_QA_BASELINE || DATA.placementDefault;

  var lab = (window.M1Lab = {
    state: clone(BASELINE),
    baseline: BASELINE,
    presets: DATA.comparePresets,
    measured: DATA.measured,
    glyphs: DATA.glyphs,
    actionGlyphs: DATA.actionGlyphs,
    samples: window.M1_LAB_SAMPLES,
    SHEET: SHEET,
    selected: 'utility',
    lastExport: '',
    mode: 'interact', // interact | position
    // Interaction state. Never exported: it describes a moment, not a placement.
    rt: {
      pressed: {},
      inventoryStart: 0,
      inventorySlide: null,
      choiceScroll: 0,
      choiceHover: {},
      markerPreview: false,
      choicePick: null,
      speechReply: null,
      speech: { revealed: 0, typing: false, scrollLine: 0, lines: [] }
    }
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  lab.clone = clone;

  lab.clamp = function (v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  };

  // Sprites ------------------------------------------------------------------
  lab.spriteUrl = function (name) {
    var entry = SHEET.sprites[name];
    if (!entry) throw new Error('Unknown sprite: ' + name);
    return PACKAGE_ROOT + entry.package_path;
  };

  lab.spriteFileName = function (name) {
    return SHEET.sprites[name].package_path.split('/').pop();
  };

  lab.spriteSize = function (name) {
    var entry = SHEET.sprites[name];
    return [entry.width, entry.height];
  };

  // The obsolete 364x78 base atlas stays out of this list, so the lab never requests it.
  lab.requiredSprites = function () {
    return Object.keys(SHEET.sprites).filter(function (name) {
      return name !== 'locked_pixel_font_atlas';
    });
  };

  var images = {};
  lab.image = function (name) {
    return images[name];
  };

  // Draws with another image set, for the snapshot's readable copies of the same bytes.
  lab.withImages = function (replacement, draw) {
    var original = images;
    images = replacement;
    try {
      return draw();
    } finally {
      images = original;
    }
  };

  lab.loadSprites = function () {
    var fonts = Object.keys(DATA.fonts).map(function (id) {
      return { name: 'font:' + id, url: DATA.fonts[id].atlas };
    });
    return Promise.all(
      lab.requiredSprites().map(function (name) {
        return { name: name, url: lab.spriteUrl(name) };
      }).concat(fonts).map(function (item) {
        var name = item.name;
        return new Promise(function (resolve, reject) {
          var img = new Image();
          // Decoded up front: Chromium can otherwise leave the first canvas draw of an image that
          // has never been on screen empty when read straight back.
          img.onload = function () {
            images[name] = img;
            img.decode().then(resolve, resolve);
          };
          img.onerror = function () {
            reject(new Error('Missing sprite: ' + name));
          };
          img.src = item.url;
        });
      })
    );
  };

  lab.displaySize = function (native, scale) {
    return [Math.max(1, Math.round(native[0] * scale)), Math.max(1, Math.round(native[1] * scale))];
  };

  // Bitmap text --------------------------------------------------------------
  // Four roles, each set to its own face: dialogue (NPC speech), choices (choice cards, and the
  // player's lines when they reach the dialogue box), labels
  // (utility buttons and item names) and objective (the objective title and text). The locked font
  // is the default. Baked faces come from scripts/bake_fonts.py as white glyphs and are tinted to
  // the same two inks.
  var INK = { dark: '#203037', light: '#f1d898' };
  var LOCKED = {
    id: 'locked',
    label: 'Current (locked)',
    mapping: DATA.glyphs.mapping,
    lineHeight: DATA.glyphs.lineHeight,
    capHeight: DATA.glyphs.mapping.A.bearingY + DATA.glyphs.mapping.A.h
  };
  lab.faces = { locked: LOCKED };
  Object.keys(DATA.fonts).forEach(function (id) {
    lab.faces[id] = Object.assign({ id: id }, DATA.fonts[id]);
  });

  lab.face = function (role) {
    var id = lab.state.typeface && lab.state.typeface[role];
    return lab.faces[id] || LOCKED;
  };

  function glyph(ch, face) {
    return face.mapping[ch] || face.mapping['?'];
  }

  lab.textAdvance = function (text, role) {
    var face = lab.face(role);
    var w = 0;
    for (var i = 0; i < text.length; i++) w += glyph(text[i], face).advance;
    return w;
  };

  // Width of the drawn pixels: the last glyph contributes its ink, not its advance.
  lab.inkWidth = function (text, role) {
    if (!text) return 0;
    var last = glyph(text[text.length - 1], lab.face(role));
    return lab.textAdvance(text.slice(0, -1), role) + (last.bearingX || 0) + last.w;
  };

  lab.unmappedChars = function (text) {
    return Array.from(new Set(text.replace(/\n/g, '').split(''))).filter(function (c) {
      return !LOCKED.mapping[c];
    });
  };

  lab.wrap = function (text, maxWidth, role) {
    var out = [];
    text.split('\n').forEach(function (para) {
      var line = '';
      para.split(' ').forEach(function (word) {
        var candidate = line ? line + ' ' + word : word;
        if (line && lab.textAdvance(candidate, role) > maxWidth) {
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

  // Glyphs go down at whole pixels with smoothing off, on a canvas exactly its layout size.
  // A line may be a string, drawn in `role`, or { text, role } to carry its own face: the dialogue
  // box holds the player's line in the choices face above the NPC's line in the dialogue face.
  // A line's `gap` is extra space above it, between speakers. `maxChars` counts across every
  // line in order, for the typewriter.
  lab.drawLines = function (canvas, lines, font, lineHeight, width, height, maxChars, role) {
    canvas.width = width;
    canvas.height = height;
    canvas.redraw = function (target) {
      lab.drawLines(target, lines, font, lineHeight, width, height, maxChars, role);
    };
    var left = maxChars === undefined ? Infinity : maxChars;
    var rows = lines.map(function (line) {
      var text = typeof line === 'string' ? line : line.text;
      var n = Math.max(0, Math.min(text.length, left));
      left -= n;
      return { text: text.slice(0, n), role: typeof line === 'string' ? role : line.role };
    });
    var tops = [];
    lines.reduce(function (y, line, i) {
      tops[i] = y + (line.gap || 0);
      return tops[i] + lineHeight;
    }, 0);
    var roles = rows.map(function (r) { return r.role; }).filter(function (r, i, all) { return all.indexOf(r) === i; });
    var ctx = canvas.getContext('2d');
    roles.forEach(function (r) {
      // Each face is tinted on its own layer, so one face's tint never touches another's pixels.
      var layer = roles.length === 1 ? canvas : document.createElement('canvas');
      layer.width = width;
      layer.height = height;
      paintRows(layer.getContext('2d'), rows.map(function (row) { return row.role === r ? row.text : ''; }), tops, font, width, height, lab.face(r));
      if (layer !== canvas) ctx.drawImage(layer, 0, 0);
    });
  };

  function paintRows(ctx, rows, tops, font, width, height, face) {
    var atlas = face === LOCKED
      ? images[font === 'light' ? 'locked_pixel_font_atlas_light' : 'locked_pixel_font_atlas_dark']
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
      // Every glyph pixel is fully opaque white, so this gives exactly one ink colour.
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = INK[font === 'light' ? 'light' : 'dark'];
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // A role's natural single-line height, and the height of its capitals for centring.
  lab.lineHeightOf = function (role) {
    return lab.face(role).lineHeight;
  };

  lab.capHeight = function (role) {
    return lab.face(role).capHeight;
  };

  // Placement JSON -----------------------------------------------------------
  function sameShape(template, value, path, errors) {
    if (Array.isArray(template)) {
      if (!Array.isArray(value)) errors.push(path + ' must be an array');
      else if (template.length !== value.length) errors.push(path + ' must have ' + template.length + ' entries');
      else value.forEach(function (v, i) { sameShape(template[i], v, path + '[' + i + ']', errors); });
      return;
    }
    if (template && typeof template === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push(path + ' must be an object');
        return;
      }
      Object.keys(template).forEach(function (k) {
        if (!(k in value)) errors.push(path + '.' + k + ' is missing');
        else sameShape(template[k], value[k], path + '.' + k, errors);
      });
      return;
    }
    if (typeof template !== typeof value) errors.push(path + ' must be a ' + typeof template);
    else if (typeof value === 'number' && !Number.isInteger(value) && !/scale$/i.test(path)) {
      errors.push(path + ' must be a whole number');
    }
  }

  // Rebuild in the baseline's key order so an export is stable however it was edited.
  function ordered(template, value) {
    if (Array.isArray(template)) {
      return value.map(function (v, i) { return ordered(template[i], v); });
    }
    if (template && typeof template === 'object') {
      // An empty template marks a free-form map, such as per-card text overrides.
      if (!Object.keys(template).length) return value;
      var out = {};
      Object.keys(template).forEach(function (k) { out[k] = ordered(template[k], value[k]); });
      return out;
    }
    return value;
  }

  // Applies the live relationships between values. Safe to run any number of times.
  lab.normalize = function () {
    var s = lab.state;
    var regions = lab.measured.regions;
    var inv = s.inventory;
    if (inv.pitchLocked) inv.pitch = inv.slotSize[0] + inv.gap;
    else inv.gap = inv.pitch - inv.slotSize[0];

    var layout = inv.slotLayouts[inv.slotCount];
    var rowWidth = (inv.slotCount - 1) * inv.pitch + inv.slotSize[0];
    if (inv.centerGroup) {
      var bay = regions.inventoryBay.floor;
      layout.x = Math.floor(bay[0] + bay[2] / 2 - rowWidth / 2);
    }
    if (inv.centerGroup || inv.arrowsSymmetric) {
      inv.rightArrow.x = 2 * layout.x + rowWidth - inv.leftArrow.x - inv.rightArrow.displayWidth;
    }

    var u = s.utility;
    var band = regions.utilityBay.clearBandH114;
    var first = u.buttons[0];
    var last = u.buttons[u.buttons.length - 1];
    var span = last.x + last.displayWidth - first.x;
    var targetX = first.x;
    if (u.align === 'left') targetX = band[0];
    else if (u.align === 'right') targetX = band[0] + band[2] - span;
    else if (u.align === 'center') targetX = Math.floor(band[0] + band[2] / 2 - span / 2);
    var targetY = u.centerVertically ? Math.floor(band[1] + band[3] / 2 - first.displayHeight / 2) : first.y;
    var dx = targetX - first.x;
    var dy = targetY - first.y;
    u.buttons.forEach(function (b) {
      b.x += dx;
      b.y += dy;
    });
  };

  lab.ordered = function (value) {
    return ordered(lab.baseline, value);
  };

  lab.exportJson = function () {
    return JSON.stringify(ordered(lab.baseline, lab.state), null, 2) + '\n';
  };

  function fillMissing(template, value) {
    if (!template || typeof template !== 'object' || Array.isArray(template)) return;
    Object.keys(template).forEach(function (k) {
      if (!(k in value)) value[k] = clone(template[k]);
      else if (value[k] && typeof value[k] === 'object') fillMissing(template[k], value[k]);
    });
  }

  // A v1 file holds absolute positions only, so nothing in it may be re-aligned on import.
  function upgradeV1(value) {
    var old = clone(value);
    fillMissing(lab.baseline, old);
    old.schema = lab.baseline.schema;
    if (!old.inventory || !old.utility || !old.demo || !old.scrollbar) return old;
    var inv = old.inventory;
    inv.gap = inv.pitch - inv.slotSize[0];
    inv.pitchLocked = inv.gap >= 0;
    inv.arrowSizeLinked = inv.leftArrow.displayWidth === inv.rightArrow.displayWidth;
    old.utility.align = 'free';
    old.utility.centerVertically = false;
    old.utility.sizeLinked = old.utility.buttons.every(function (b) {
      return b.displayWidth === old.utility.buttons[0].displayWidth;
    });
    old.scrollbar.thumb.minHeight = old.scrollbar.thumb.capHeight * 2;
    var set = lab.samples.choiceSets[old.demo.choiceSet];
    old.demo.choiceCount = set ? set.cards.length : 3;
    return old;
  }

  lab.parsePlacement = function (text) {
    var value;
    try {
      value = JSON.parse(text);
    } catch (err) {
      throw new Error('Not valid JSON: ' + err.message);
    }
    if (value && value.schema === 'm1-ui-placement-v1') value = upgradeV1(value);
    // The trial briefly had one Body choice for dialogue, choices and the objective.
    if (value && value.typeface && value.typeface.body !== undefined) {
      ['dialogue', 'choices', 'objective'].forEach(function (role) {
        if (value.typeface[role] === undefined) value.typeface[role] = value.typeface.body;
      });
      delete value.typeface.body;
    }
    // Saves from before glyphs, or naming a glyph since dropped from the candidate batch, take
    // the button's default glyph. fillMissing does not reach into the buttons array.
    if (value && value.utility && Array.isArray(value.utility.buttons)) {
      value.utility.buttons.forEach(function (b, i) {
        var base = lab.baseline.utility.buttons[i];
        if (b && base && !lab.actionGlyphs[b.glyph]) b.glyph = base.glyph;
      });
    }
    // A face dropped from the trial falls back to the locked font.
    if (value && value.typeface) {
      Object.keys(value.typeface).forEach(function (role) {
        if (!lab.faces[value.typeface[role]]) value.typeface[role] = 'locked';
      });
    }
    if (!value || value.schema !== lab.baseline.schema) {
      throw new Error('Expected schema ' + lab.baseline.schema + '.');
    }
    if (!value.shell || value.shell.gitBlob !== lab.baseline.shell.gitBlob) {
      throw new Error('This placement was made for a different shell.');
    }
    // Saved before a choice-card correction (two cards 2026-11-02; the owner's outline edit of
    // ten cards 2026-11-05). No card changed size, so those placements still apply.
    if (value.spritePackage && PREVIOUS_ATLASES.indexOf(value.spritePackage.atlasSha256) !== -1) {
      value.spritePackage.atlasSha256 = lab.baseline.spritePackage.atlasSha256;
    }
    if (!value.spritePackage || value.spritePackage.atlasSha256 !== lab.baseline.spritePackage.atlasSha256) {
      throw new Error('This placement was made for a different sprite package.');
    }
    // Saves made before a field existed keep every value they have and gain the new default.
    fillMissing(lab.baseline, value);
    var errors = [];
    sameShape(lab.baseline, value, 'placement', errors);
    if (errors.length) throw new Error(errors.slice(0, 4).join('; '));
    return ordered(lab.baseline, value);
  };

  // Written on every edit. A deferred write is not safe: Firefox drops storage writes made
  // while a page unloads, so the last edit before a reload would be lost.
  lab.save = function () {
    try {
      localStorage.setItem(STORAGE_KEY, lab.exportJson());
      if (lab.lastExport) localStorage.setItem(EXPORT_KEY, lab.lastExport);
    } catch (err) {
      // Private windows can refuse storage; the session simply won't persist.
    }
  };

  lab.markExported = function () {
    lab.lastExport = lab.exportJson();
    lab.save();
  };

  lab.restore = function () {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      lab.state = lab.parsePlacement(saved);
      lab.lastExport = localStorage.getItem(EXPORT_KEY) || '';
      return true;
    } catch (err) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
  };

  lab.clearSaved = function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXPORT_KEY);
    } catch (err) {
      // Nothing was stored.
    }
  };
})();
