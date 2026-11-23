// Presentation: builds the 1920x1080 stage and draws it from G.ui (presentation state) and
// G.state (narrative state). It never decides what happens next; game/js/flow.js does.
// Card motion, inventory weight, the speech box and the thumb are ported from
// tools/layout-lab/js/stage.js, which stays as it is.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var T = G.text;
  var L = G.layout;
  var P = G.placeholders;
  var R = G.measured.regions;
  var stage;
  var els = (G.els = { slots: [], cards: [], utility: [] });
  var SPARE = 3; // slots sliding in or out beyond those on show
  var CAP_ROWS = 20;
  var THUMB_INSPECTOR = 'inspector';
  // Choices carry no focus or hover marker of any kind (owner ruling after the playtest, docs/53):
  // keyboard navigation still moves real focus between the cards, unseen.
  var TU = G.TUNING; // production presentation constants (js/tuning.js); values unchanged

  // What the stage reads about the story, through one port: the reception's v1 content and rules
  // by default (exactly the calls this file always made), or a story-v2 adapter that
  // js/story-flow.js installs for an imported story (docs/84). Presentation never reads content
  // any other way.
  var V1_PORT = {
    item: function (id) { return G.content.items[id]; },
    itemActions: function (id) { return G.rules.itemActions(G.content, G.state, id); },
    description: function (id) { return G.rules.description(G.content, G.state, id); },
    contextAction: function () { return G.rules.contextAction(G.content, G.state); },
    contextSpent: function () { return G.rules.contextSpent(G.content, G.state); },
    files: function () { return G.rules.files(G.content, G.state); },
    notesTitle: 'NOTES: EVERYTHING SAID AT RECEPTION',
    // NOTES lines: add(text, role, gap). A thought (docs/64) keeps its own treatment here too:
    // parentheses, the player's face, no label.
    notes: function (add) {
      G.state.transcript.forEach(function (line, i) {
        if (line.who === 'thought') return add(G.thoughtText(line.text), SPEECH_FACE.thought, i === 0 ? 18 : 14);
        add(line.who === 'npc' ? G.content.speaker + ':' : 'YOU:', 'labels', i === 0 ? 18 : 14);
        add(line.text, SPEECH_FACE[line.who], 4);
      });
    }
  };
  function port() {
    return G.port || V1_PORT;
  }

  var ui = (G.ui = {
    speech: { parts: [], lines: [], key: '', base: 0, revealed: 0, typing: false, typeStart: 0, scrollLine: 0, newRow: 0 },
    cards: [], // the choice set on show, laid out
    motion: null, // { kind: 'in' | 'send' | 'clear', start, index, vanishedAt }
    choiceScroll: 0,
    thumbOn: false,
    inv: { start: 0, slide: null },
    pressed: {},
    inspector: null, // { id, scroll }
    selected: null, // the inventory item last clicked or focused (UI only; nothing acts on it implicitly)
    overlay: null, // 'notes' | 'files'
    overlayScroll: 0,
    tooltip: null,
    notice: null, // { id, start, until, fadeIn, fadeOut, out }: the item-received slip on show
    noticeQueue: [], // items received while a slip was already up
    noticeLog: [] // every item announced since load, in order (read by QA)
  });

  // DOM helpers ---------------------------------------------------------------------------
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
  // The stage's two full-size static images (shell, item overlay) are made once and reused if the
  // stage is rebuilt (G.rebuildStage), so a rebuild never re-requests them.
  var kept = {};
  function keptImg(key, cls, parent, attrs) {
    if (kept[key]) parent.appendChild(kept[key]);
    else kept[key] = el('img', cls, parent, attrs);
    return kept[key];
  }

  function show(node, on) {
    node.style.display = on ? '' : 'none';
  }
  function clamp(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }
  G.clamp = clamp;

  // Physical press: down on press, up on release, activate only if released on the control.
  function bindPress(node, id, onChange, onActivate, enabled) {
    function set(down) {
      if (!!ui.pressed[id] === down) return;
      if (down) ui.pressed[id] = true;
      else delete ui.pressed[id];
      onChange();
    }
    node.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || (enabled && !enabled())) return;
      node.setPointerCapture(e.pointerId);
      set(true);
    });
    node.addEventListener('pointerup', function (e) {
      if (!ui.pressed[id]) return;
      var r = node.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom;
      set(false);
      if (inside) onActivate();
    });
    node.addEventListener('pointercancel', function () { set(false); });
    node.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (!e.repeat && (!enabled || enabled())) set(true);
    });
    node.addEventListener('keyup', function (e) {
      if ((e.key !== 'Enter' && e.key !== ' ') || !ui.pressed[id]) return;
      set(false);
      onActivate();
    });
    node.addEventListener('blur', function () { set(false); });
  }

  // Scene and portrait art (docs/54 locked densities, docs/57 integration) ------------------
  // Scene: 314x206 logical, shown at exactly 4x nearest neighbour (1256x824) from the aperture's
  // top-left; the 1255x822 aperture clips 1 px right and 2 px bottom. Never resized to fit.
  // Portrait: separate 564x278 layers drawn 1:1, in this order:
  //   background -> rear/mid FX (empty) -> receptionist NPC -> foreground FX (empty)
  // and the shell, built after the apertures, stays on top. The layers are never flattened, so
  // the NPC and the background can later animate or change independently.
  // The <img> elements are the very images js/main.js preloaded and decoded before boot, so the
  // page never announces ready with art still to pop in.
  //
  // The art registry (engine S3, docs/72 section 4, docs/83). Story art is declared once, in the
  // story's `assets` and its items' slotArt / inspectArt; the reception's declaration is
  // Rules.fromV1's. G.registerArt(story) turns it into G.ART, one entry per image, keyed by the
  // stable image name that G.image and the preload use:
  //   scene:<location>/<scene>                   scene, 314x206, drawn at 4x
  //   portrait:<portrait>:background:<id>        portrait background, 564x278 at 1x
  //   portrait:<portrait>:pose:<id>              portrait pose (the character), 564x278 at 1x
  //   focus:<location>/<scene>/<target>          Focus A close-up, 564x278 at 1x (drawn from S6)
  //   item:<id>  /  inspect:<id>                 item slot 96x96 / inspect 565x451 (names as in M2)
  // and, for the art that follows the state (docs/92):
  //   scene:<location>/<scene>#<state>           a scene state: an opaque alternate scene (class
  //                                              scene) or one transparent overlay on it (class
  //                                              overlay), 314x206 at 4x from the same origin
  //   portrait:<portrait>:view:<location/scene>  an opaque-complete conversation view, 564x278 at 1x:
  //                                              one whole image, no background or pose layer
  //   focus:<location>/<scene>/<target>:page:<n> one semantic page of a paged close-up
  // UI art (shell, item overlay, panels, slip, sprites, glyphs) is engine-owned and stays out of it.
  var ART_CLASS = (G.ART_CLASS = {
    scene: { size: [314, 206], scale: 4 },
    background: { size: [564, 278], scale: 1, offset: function () { return [TU.portrait.backgroundX, TU.portrait.backgroundY]; } },
    pose: { size: [564, 278], scale: 1, offset: function () { return [TU.portrait.npcX, TU.portrait.npcY]; } },
    focus: { size: [564, 278], scale: 1 },
    overlay: { size: [314, 206], scale: 4 },
    view: { size: [564, 278], scale: 1, offset: function () { return [TU.portrait.backgroundX, TU.portrait.backgroundY]; } },
    slot: { size: [96, 96] },
    inspect: { size: [565, 451] }
  });
  var artKey = (G.artKey = {
    scene: function (id) { return 'scene:' + id; },
    background: function (portrait, id) { return 'portrait:' + portrait + ':background:' + id; },
    pose: function (portrait, id) { return 'portrait:' + portrait + ':pose:' + id; },
    focus: function (id) { return 'focus:' + id; },
    sceneState: function (scene, state) { return 'scene:' + scene + '#' + state; },
    view: function (portrait, id) { return 'portrait:' + portrait + ':view:' + id; },
    focusPage: function (id, n) { return 'focus:' + id + ':page:' + n; },
    slot: function (id) { return 'item:' + id; },
    inspect: function (id) { return G.inspectImageName(id); }
  });

  // One story's registry: { key: { key, cls, id, path, portrait? } }. `path` null is a fixture's
  // DEV PLACEHOLDER art: registered, never requested (game/qa/validate_assets.js refuses it in a
  // production story). A key claimed twice is an error.
  G.artRegistry = function (story) {
    var reg = {};
    var a = story.assets || {};
    function add(key, cls, id, path, portrait) {
      if (Object.prototype.hasOwnProperty.call(reg, key)) throw new Error('Art registered twice: ' + key);
      if (path !== null && typeof path !== 'string') throw new Error('Art path must be a string or null: ' + key);
      reg[key] = { key: key, cls: cls, id: id, path: path };
      if (portrait) reg[key].portrait = portrait;
    }
    Object.keys(a.scenes || {}).forEach(function (id) { add(artKey.scene(id), 'scene', id, a.scenes[id]); });
    Object.keys(a.sceneStates || {}).forEach(function (id) {
      a.sceneStates[id].forEach(function (st) { add(artKey.sceneState(id, st.id), st.layer === 'overlay' ? 'overlay' : 'scene', id + '#' + st.id, st.path); });
    });
    Object.keys(a.portraits || {}).forEach(function (pid) {
      var p = a.portraits[pid];
      Object.keys(p.backgrounds || {}).forEach(function (id) { add(artKey.background(pid, id), 'background', id, p.backgrounds[id], pid); });
      Object.keys(p.poses || {}).forEach(function (id) { add(artKey.pose(pid, id), 'pose', id, p.poses[id], pid); });
      Object.keys(p.views || {}).forEach(function (id) { add(artKey.view(pid, id), 'view', id, p.views[id], pid); });
    });
    Object.keys(a.focus || {}).forEach(function (id) {
      var f = a.focus[id];
      if (f && typeof f === 'object') f.pages.forEach(function (pg, i) { add(artKey.focusPage(id, i + 1), 'focus', id + ':page:' + (i + 1), pg.path); });
      else add(artKey.focus(id), 'focus', id, f);
    });
    Object.keys(story.items || {}).forEach(function (id) {
      var it = story.items[id];
      if (it.slotArt !== undefined) add(artKey.slot(id), 'slot', id, it.slotArt);
      if (it.inspectArt !== undefined) add(artKey.inspect(id), 'inspect', id, it.inspectArt);
    });
    return reg;
  };

  // The image keys one chapter shows, in first-use order: its scenes, the portrait layers of
  // everyone who speaks in it (each portrait's default background and pose, plus any node's
  // backdrop / pose), and its focus targets. Items are story-wide (G.itemArtKeys).
  G.chapterArtKeys = function (story, chapterId) {
    var ch = story.chapters && story.chapters[chapterId];
    if (!ch) throw new Error('Unknown chapter: ' + chapterId);
    var keys = [];
    var states = (story.assets && story.assets.sceneStates) || {};
    function use(k) { if (keys.indexOf(k) === -1) keys.push(k); }
    // A scene, then every state of it: whichever the state selects is decoded before any fade.
    function useScene(id) {
      use(artKey.scene(id));
      (states[id] || []).forEach(function (st) { use(artKey.sceneState(id, st.id)); });
    }
    useScene(ch.scene);
    Object.keys(ch.nodes).forEach(function (nid) {
      var n = ch.nodes[nid];
      if (n.scene) useScene(n.scene);
      if (n.mode === 'dialogue') {
        var cast = story.cast && story.cast[n.speaker];
        var p = cast && story.assets.portraits && story.assets.portraits[cast.portrait];
        if (!p) throw new Error('No registered portrait for speaker ' + n.speaker + ' (' + chapterId + ':' + nid + ')');
        if (p.views) {
          use(artKey.view(cast.portrait, p.view));
          if (n.backdrop) use(artKey.view(cast.portrait, n.backdrop));
        } else {
          use(artKey.background(cast.portrait, p.background));
          use(artKey.pose(cast.portrait, p.pose));
          if (n.backdrop) use(artKey.background(cast.portrait, n.backdrop));
          if (n.pose) use(artKey.pose(cast.portrait, n.pose));
        }
      }
      if (n.mode === 'focus') {
        var f = story.assets.focus && story.assets.focus[n.focus];
        if (f && typeof f === 'object') f.pages.forEach(function (pg, i) { use(artKey.focusPage(n.focus, i + 1)); });
        else use(artKey.focus(n.focus));
      }
    });
    return keys;
  };
  G.itemArtKeys = function (story) {
    var keys = [];
    Object.keys(story.items || {}).forEach(function (id) {
      if (story.items[id].slotArt !== undefined) keys.push(artKey.slot(id));
      if (story.items[id].inspectArt !== undefined) keys.push(artKey.inspect(id));
    });
    return keys;
  };

  // Accessible names for the two art apertures. cyoa-story-v2 has no human-readable scene or cast
  // label yet, so the reception keeps its Round 2 names through this adapter (keyed by scene id
  // and cast id); anything else falls back to the scene id / the cast member's name. Future
  // metadata need (docs/83): a label on each assets.scenes entry and on each cast entry.
  var LEGACY_LABELS = {
    scene: { 'conference_hall/reception': 'The reception lobby' },
    cast: { receptionist: 'The receptionist' }
  };

  // What the apertures show. S3 still plays the reception on the v1 rules (js/flow.js), so this is
  // the story's opening: its first chapter's scene and the first speaker's portrait layers. From S4
  // the scene / portrait the v2 events announce replaces it.
  function openingArt(story) {
    var ch = story.chapters[story.start];
    var node = ch.nodes[ch.start];
    if (node.mode !== 'dialogue') {
      // An imported story may open in Narrative B: no portrait yet (js/story-flow.js sets the
      // apertures from Rules.view from then on).
      var sid = node.scene || ch.scene;
      return { scene: artKey.scene(sid), sceneLabel: LEGACY_LABELS.scene[sid] || sid, background: null, pose: null, castLabel: '' };
    }
    var pid = story.cast[node.speaker].portrait;
    var p = story.assets.portraits[pid];
    var scene = node.scene || ch.scene;
    // An opaque-complete speaker opens on its one complete view (docs/92 section 1).
    if (p.views) return { scene: artKey.scene(scene), sceneLabel: LEGACY_LABELS.scene[scene] || scene, background: null, pose: null,
      view: artKey.view(pid, node.backdrop || p.view), castLabel: LEGACY_LABELS.cast[node.speaker] || story.cast[node.speaker].name };
    return {
      scene: artKey.scene(scene),
      sceneLabel: LEGACY_LABELS.scene[scene] || scene,
      background: artKey.background(pid, node.backdrop || p.background),
      pose: artKey.pose(pid, node.pose || p.pose),
      castLabel: LEGACY_LABELS.cast[node.speaker] || story.cast[node.speaker].name
    };
  }

  // Makes `story` the one the stage draws from (js/main.js calls it at boot, before preloading).
  G.registerArt = function (story) {
    G.ART = G.artRegistry(story);
    G.ART_ON_SHOW = openingArt(story);
    return G.ART;
  };

  function artLayer(parent, key, id) {
    var spec = G.ART[key];
    if (spec && spec.path === null) return placeholderLayer(parent, spec, id);
    var cls = spec && ART_CLASS[spec.cls];
    var img = G.image(key);
    if (!img) throw new Error('Art not decoded before the stage was built: ' + key);
    img.id = id;
    img.className = 'layer art';
    img.alt = '';
    img.draggable = false;
    img.setAttribute('aria-hidden', 'true');
    // Whole-number scale of the file's own pixels.
    img.width = img.naturalWidth * cls.scale;
    img.height = img.naturalHeight * cls.scale;
    var off = cls.offset ? cls.offset() : [0, 0];
    place(img, off[0], off[1], img.width, img.height);
    parent.appendChild(img);
    return img;
  }

  // A registered image with no file yet (a fixture's or a draft build's DEV PLACEHOLDER, docs/72
  // section 4.2): the labelled placeholder at the class's native size, never a guess at the art.
  function placeholderLayer(parent, spec, id) {
    var cls = ART_CLASS[spec.cls];
    var c = document.createElement('canvas');
    c.id = id;
    c.className = 'layer art';
    c.setAttribute('aria-hidden', 'true');
    var w = cls.size[0] * (cls.scale || 1);
    var h = cls.size[1] * (cls.scale || 1);
    P.art(c, w, h, spec.cls, spec.id);
    place(c, 0, 0, w, h);
    parent.appendChild(c);
    return c;
  }

  function fxLayer(parent, id, r) {
    var fx = el('div', 'layer fx', parent, { id: id, 'aria-hidden': 'true' });
    place(fx, 0, 0, r[2], r[3]);
    return fx;
  }

  function buildApertures() {
    var sc = R.sceneAperture.rect;
    var on = G.ART_ON_SHOW;
    els.scene = el('div', 'aperture art-aperture', stage, { id: 'scene', role: 'img', 'aria-label': on.sceneLabel });
    place(els.scene, sc[0], sc[1], sc[2], sc[3]);
    els.sceneArt = artLayer(els.scene, on.scene, 'sceneArt');
    var pr = R.portraitAperture.rect;
    els.portrait = el('div', 'aperture art-aperture', stage, { id: 'portrait', role: 'img', 'aria-label': on.castLabel });
    place(els.portrait, pr[0], pr[1], pr[2], pr[3]);
    els.portraitBackground = on.background ? artLayer(els.portrait, on.background, 'portraitBackground') : null;
    // An opaque-complete view takes the background's place (and offset); it has no pose layer.
    els.portraitView = on.view ? artLayer(els.portrait, on.view, 'portraitView') : null;
    if (els.portraitView) els.portraitView.dataset.art = on.view;
    els.portraitRearFx = fxLayer(els.portrait, 'portraitRearFx', pr);
    els.portraitNpc = on.pose ? artLayer(els.portrait, on.pose, 'portraitNpc') : null;
    if (els.portraitBackground) els.portraitBackground.dataset.art = on.background;
    if (els.portraitNpc) els.portraitNpc.dataset.art = on.pose;
    els.sceneArt.dataset.art = on.scene;
    els.portraitFrontFx = fxLayer(els.portrait, 'portraitFrontFx', pr);
    els.overlay = el('div', 'aperture overlay', stage, { id: 'overlay', tabindex: '-1' });
    place(els.overlay, sc[0], sc[1], sc[2], sc[3]);
    // NOTES/FILES (docs/60, docs/63): the static panel image for the overlay on show, 1:1 at the
    // overlay's origin (renderOverlay puts it in), with a transparent canvas above it that draws
    // only the dynamic title and text.
    els.overlayPanel = null;
    els.overlayCanvas = el('canvas', 'layer', els.overlay, { id: 'overlayCanvas', 'aria-hidden': 'true' });
    place(els.overlayCanvas, 0, 0, sc[2], sc[3]);
    show(els.overlay, false);
    els.overlay.addEventListener('wheel', function (e) {
      e.preventDefault();
      G.setOverlayScroll(ui.overlayScroll + 3 * Math.sign(e.deltaY));
    }, { passive: false });
    els.overlay.addEventListener('keydown', function (e) {
      var keys = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      G.setOverlayScroll(ui.overlayScroll + keys[e.key]);
    });
  }

  // Runtime swaps for an imported story (js/story-flow.js, docs/84): the scene, the portrait's
  // layers, or a Focus A close-up in the portrait aperture. Each image is the decoded image itself.
  function swapLayer(parent, old, key, id, before) {
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (!key) return null;
    var node = artLayer(parent, key, id);
    if (before) parent.insertBefore(node, before);
    node.dataset.art = key;
    return node;
  }
  // key: the scene, or its opaque alternate (a 'replace' scene state); overlay: at most one
  // transparent scene state drawn over it from the same origin, or null. Each layer is compared
  // on its own, so a change of state within one scene swaps exactly the layer that changed, and an
  // overlay never outlives the state that selected it.
  G.setSceneArt = function (key, label, overlay) {
    if (!(els.sceneArt && els.sceneArt.dataset.art === key)) {
      els.sceneArt = swapLayer(els.scene, els.sceneArt, key, 'sceneArt', els.sceneOverlay);
      els.scene.setAttribute('aria-label', label || key);
    }
    if ((els.sceneOverlay ? els.sceneOverlay.dataset.art : null) !== (overlay || null)) {
      els.sceneOverlay = swapLayer(els.scene, els.sceneOverlay, overlay || null, 'sceneOverlay');
    }
    els.scene.dataset.art = key + (overlay ? ' + ' + overlay : '');
  };
  // which: { background, pose, label } | { view, label } (an opaque-complete portrait) |
  // { focus, label } | null (nothing: Narrative B covers it).
  G.setPortraitArt = function (which) {
    var w = which || {};
    show(els.portrait, !!which);
    if ((els.portraitView && els.portraitView.dataset.art) !== w.view) {
      els.portraitView = swapLayer(els.portrait, els.portraitView, w.view, 'portraitView', els.portraitRearFx);
    }
    if ((els.portraitBackground && els.portraitBackground.dataset.art) !== w.background) {
      els.portraitBackground = swapLayer(els.portrait, els.portraitBackground, w.background, 'portraitBackground', els.portraitRearFx);
    }
    if ((els.portraitNpc && els.portraitNpc.dataset.art) !== w.pose) {
      els.portraitNpc = swapLayer(els.portrait, els.portraitNpc, w.pose, 'portraitNpc', els.portraitFrontFx);
    }
    if ((els.focusArt && els.focusArt.dataset.art) !== w.focus) {
      els.focusArt = swapLayer(els.portrait, els.focusArt, w.focus, 'focusArt', els.portraitFrontFx);
    }
    els.portrait.dataset.mode = w.focus ? 'focus' : which ? 'portrait' : 'none';
    els.portrait.dataset.layers = w.view ? 'complete' : w.background || w.pose ? 'layered' : '';
    if (which) els.portrait.setAttribute('aria-label', w.label || '');
  };

  // NPC speech and history ----------------------------------------------------------------
  // Every line of the conversation stays in the box: the player's in the Choices face, the
  // receptionist's in the Dialogue face, with the speaker gap where the speaker changes. A
  // `thought` (the player's unspoken observation, docs/64) is its own role: drawn in the player's
  // Choices face, in parentheses, with no speaker label, and it never types.
  var SPEECH_FACE = { npc: 'dialogue', player: 'choices', thought: 'choices', action: 'choices' };
  // An imported story's dialogue box (docs/72 section 3.5, docs/70): the player's actions in the
  // Choices face and the action ink, never bracketed. NPC speech and stage directions are 'npc'.
  var SPEECH_INK = { action: 'action' };
  var SPEAKER = { npc: 'npc', player: 'you', thought: 'you', action: 'you' };
  G.thoughtText = function (text) {
    return '(' + text + ')';
  };
  function S() {
    return L.speech.text;
  }

  // An incidental voice (docs/104 section 4) is its own speaker: its NAME: label and line sit together,
  // with the usual speaker gap before and after them.
  function speakerOf(line) {
    return line.voice ? 'voice:' + line.voice : SPEAKER[line.who];
  }
  function speakerGap(lines, start, i) {
    return i > start && speakerOf(lines[i]) !== speakerOf(lines[i - 1]) ? S().speakerGap : 0;
  }

  function linesFrom(start) {
    var t = S();
    var lines = ui.speech.lines;
    var n = 0;
    for (var y = 0, i = start; i < lines.length; i++) {
      y += speakerGap(lines, start, i);
      if (y + t.lineHeight > t.height) break;
      y += t.lineHeight;
      n++;
    }
    // An incidental voice's NAME: label (docs/104 section 4) is never stranded as the last line of the panel
    // with its words below it: it moves down with them. Only incidental-voice labels carry `voice`, so no
    // Prologue-Chapter 2 view changes.
    if (i < lines.length && n > 1 && lines[start + n - 1].role === 'labels' && lines[start + n - 1].voice) n--;
    return i >= lines.length ? n : Math.max(1, n);
  }

  function speechMaxScroll() {
    var start = 0;
    while (start < ui.speech.lines.length - 1 && start + linesFrom(start) < ui.speech.lines.length) start++;
    return start;
  }
  G.speechMaxScroll = speechMaxScroll;

  function charsBefore(lines, row) {
    var n = 0;
    for (var i = 0; i < row; i++) n += lines[i].text.length;
    return n;
  }

  function rewrap() {
    var s = ui.speech;
    var width = S().width;
    s.lines = [];
    s.parts.forEach(function (p, pi) {
      T.wrap(p.text, width, p.role).forEach(function (text) { s.lines.push({ text: text, role: p.role, who: p.who, voice: p.voice, part: pi }); });
    });
  }

  // Adds a line to the history. NPC lines type; the player's line or thought is there at once.
  G.addSpeech = function (text, who) {
    var s = ui.speech;
    if (!SPEECH_FACE[who]) throw new Error('Unknown speaker role: ' + who);
    s.parts.push({ text: who === 'thought' ? G.thoughtText(text) : text, role: SPEECH_FACE[who], who: who });
    rewrap();
    var first = 0;
    while (first < s.lines.length && s.lines[first].part !== s.parts.length - 1) first++;
    s.newRow = first;
    s.base = charsBefore(s.lines, first);
    if (who !== 'npc') {
      s.typing = false;
      s.revealed = charsBefore(s.lines, s.lines.length);
      s.scrollLine = speechMaxScroll();
    } else {
      s.typing = true;
      s.typeStart = performance.now();
      s.revealed = s.base;
    }
    renderSpeech();
  };

  // Several parts at once (an imported story's paragraph runs, docs/84): [{ text, who, voice?, label? }].
  // The new parts type from the first one that types (npc), as one passage; the player's own lines and
  // thoughts before it are there at once. opts.instant shows them all at once (history rebuilds).
  // A part with a label (an incidental voice, docs/104 section 4) gets its NAME: line in the Labels face.
  G.addSpeechParts = function (parts, opts) {
    var s = ui.speech;
    if (!parts.length) return;
    var firstNew = s.parts.length;
    parts.forEach(function (p) {
      if (!SPEECH_FACE[p.who]) throw new Error('Unknown speaker role: ' + p.who);
      if (p.label) s.parts.push({ text: p.label + ':', role: 'labels', who: p.who, voice: p.voice });
      s.parts.push({ text: p.who === 'thought' ? G.thoughtText(p.text) : p.text, role: SPEECH_FACE[p.who], who: p.who, voice: p.voice });
    });
    rewrap();
    var typesFrom = -1;
    if (!(opts && opts.instant)) for (var k = firstNew; k < s.parts.length; k++) if (s.parts[k].who === 'npc') { typesFrom = k; break; }
    var anchor = typesFrom === -1 ? firstNew : typesFrom;
    var first = 0;
    while (first < s.lines.length && s.lines[first].part < anchor) first++;
    s.newRow = first;
    s.base = charsBefore(s.lines, first);
    if (typesFrom === -1) {
      s.typing = false;
      s.revealed = charsBefore(s.lines, s.lines.length);
      s.scrollLine = speechMaxScroll();
    } else {
      s.typing = true;
      s.typeStart = performance.now();
      s.revealed = s.base;
    }
    renderSpeech();
  };

  G.clearSpeech = function () {
    ui.speech = { parts: [], lines: [], key: '', base: 0, revealed: 0, typing: false, typeStart: 0, scrollLine: 0, newRow: 0 };
    renderSpeech();
  };

  // Called every frame while typing. Returns true when the line has finished.
  G.typeTick = function (now) {
    var s = ui.speech;
    if (!s.typing) return true;
    var total = charsBefore(s.lines, s.lines.length);
    s.revealed = Math.min(total, s.base + Math.floor(((now - s.typeStart) * S().charsPerSecond) / 1000));
    // Follow the newest row while typing.
    var row = 0;
    for (var chars = 0; row < s.lines.length; row++) {
      chars += s.lines[row].text.length;
      if (chars >= s.revealed) break;
    }
    var top = s.scrollLine;
    while (row >= top + linesFrom(top)) top++;
    s.scrollLine = clamp(top, 0, speechMaxScroll());
    if (s.revealed >= total) s.typing = false;
    renderSpeech();
    return !s.typing;
  };

  // Click to finish: the whole line appears, scrolled so its first row is in view.
  G.finishTyping = function () {
    var s = ui.speech;
    s.typing = false;
    s.revealed = charsBefore(s.lines, s.lines.length);
    var lead = s.newRow > 0 && s.lines[s.newRow - 1].role !== s.lines[s.newRow].role ? s.newRow - 1 : s.newRow;
    s.scrollLine = clamp(Math.min(lead, speechMaxScroll()), 0, speechMaxScroll());
    if (s.newRow + linesFrom(s.newRow) > s.lines.length) s.scrollLine = speechMaxScroll();
    renderSpeech();
  };

  G.setSpeechScroll = function (line) {
    ui.speech.scrollLine = clamp(line, 0, speechMaxScroll());
    renderSpeech();
  };

  function buildSpeech() {
    var t = S();
    els.speech = el('div', 'hit-area', stage, { id: 'speechText', tabindex: '0', role: 'log', 'aria-label': 'Dialogue. Click to finish the line; scroll to read back.' });
    els.speechCanvas = el('canvas', '', els.speech, { 'aria-hidden': 'true' });
    els.indicator = el('div', 'speech-indicator', stage, { id: 'speechIndicator' });
    place(els.speech, t.x, t.y, t.width, t.height);
    els.speech.addEventListener('click', function () { G.flow.skip(); });
    els.speech.addEventListener('wheel', function (e) {
      e.preventDefault();
      G.setSpeechScroll(ui.speech.scrollLine + Math.sign(e.deltaY));
    }, { passive: false });
    els.speech.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') G.setSpeechScroll(ui.speech.scrollLine + 1);
      else if (e.key === 'ArrowUp') G.setSpeechScroll(ui.speech.scrollLine - 1);
      else if (e.key === 'Enter' || e.key === ' ') G.flow.skip();
      else return;
      e.preventDefault();
    });
  }

  function renderSpeech() {
    var t = S();
    var s = ui.speech;
    s.scrollLine = clamp(s.scrollLine, 0, speechMaxScroll());
    var view = linesFrom(s.scrollLine);
    var shown = s.lines.slice(s.scrollLine, s.scrollLine + view).map(function (line, i) {
      var out = { text: line.text, role: line.role, gap: speakerGap(s.lines, s.scrollLine, s.scrollLine + i) };
      if (SPEECH_INK[line.who]) out.ink = SPEECH_INK[line.who];
      return out;
    });
    var budget = s.typing ? s.revealed - charsBefore(s.lines, s.scrollLine) : undefined;
    T.draw(els.speechCanvas, shown, t.font, t.lineHeight, t.width, t.height, budget, 'dialogue');
    place(els.speechCanvas, 0, 0, t.width, t.height);
    els.speech.dataset.lines = s.lines.length;
    els.speech.dataset.scroll = s.scrollLine;
    els.speech.dataset.view = view;
    els.speech.dataset.typing = s.typing ? 'true' : 'false';
    els.speech.setAttribute('aria-label', s.parts.length ? s.parts[s.parts.length - 1].text : 'Dialogue');

    var ind = L.speech.indicator;
    var max = speechMaxScroll();
    var needed = max > 0 && !s.typing;
    els.indicator.classList.toggle('on', needed);
    var h = clamp(Math.round((ind.height * view) / (s.lines.length || 1)), 12, ind.height);
    var y = ind.y + (max ? Math.round(((ind.height - h) * s.scrollLine) / max) : 0);
    place(els.indicator, ind.x, y, ind.width, h);
  }

  // Choices -------------------------------------------------------------------------------
  function C() {
    return L.choices;
  }

  // Lays out a choice set: one card per choice, the card sprite chosen by its wrapped lines.
  G.layoutCards = function (list) {
    var c = C();
    var y = 0;
    return list.map(function (choice, i) {
      // Marking is presentation (docs/70, docs/72 section 3.5): a spoken card shows its words in
      // quotation marks, an action card is in the action ink; the words themselves are unchanged
      // (aria-label and the dialogue-box echo carry no quotes). The reception's cards have no kind.
      var shown = choice.kind === 'spoken' ? '"' + choice.text + '"' : choice.text;
      var wrapped = T.wrap(shown, c.text.maxWidth, 'choices');
      var lines = clamp(wrapped.length, 1, 4);
      var card = {
        index: i,
        id: choice.id,
        text: choice.text,
        wrapped: wrapped.slice(0, 4),
        overflowLines: Math.max(0, wrapped.length - 4),
        lines: lines,
        sprite: 'choice_' + lines + 'line_' + 'abc'[i % 3],
        kind: choice.kind,
        ink: choice.kind === 'action' ? 'action' : undefined,
        height: c.cardHeights[lines],
        y: y
      };
      y += card.height + c.gap;
      return card;
    });
  };

  function contentHeight(cards) {
    if (!cards.length) return 0;
    var last = cards[cards.length - 1];
    return last.y + last.height;
  }

  function choiceMaxScroll() {
    return Math.max(0, contentHeight(ui.cards) - C().viewport.height);
  }
  G.choiceMaxScroll = choiceMaxScroll;

  G.setChoiceScroll = function (v) {
    ui.choiceScroll = clamp(Math.round(v), 0, choiceMaxScroll());
    renderChoices(performance.now());
  };

  G.setChoices = function (list, motion) {
    ui.cards = G.layoutCards(list);
    ui.choiceScroll = 0;
    ui.motion = motion || null;
    ui.thumbOn = false;
    renderChoices(performance.now());
  };

  function buildChoices() {
    var vp = C().viewport;
    els.viewport = el('div', 'hit-area', stage, { id: 'choiceViewport', role: 'group', 'aria-label': 'What you can say' });
    place(els.viewport, vp.x, vp.y, vp.width, vp.height);
    els.viewport.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (ui.inspector) G.setInspectorScroll(ui.inspector.scroll + Math.sign(e.deltaY) * 24);
      else G.setChoiceScroll(ui.choiceScroll + Math.sign(e.deltaY) * 28);
    }, { passive: false });
    els.inspectText = el('canvas', '', els.viewport, { id: 'inspectText', 'aria-hidden': 'true' });
    show(els.inspectText, false);
  }

  function focusCard(i) {
    var card = ui.cards[i];
    if (!card) return;
    var vp = C().viewport;
    if (card.y < ui.choiceScroll) G.setChoiceScroll(card.y);
    else if (card.y + card.height > ui.choiceScroll + vp.height) G.setChoiceScroll(card.y + card.height - vp.height);
    els.cards[i].node.focus({ preventScroll: true });
  }
  G.focusCard = focusCard;

  function makeCard(i) {
    var btn = el('button', 'hit choice', els.viewport, { type: 'button', 'data-index': i });
    var parts = {
      node: btn,
      art: el('canvas', 'sprite', btn, { 'aria-hidden': 'true' }),
      text: el('canvas', 'card-text', btn, { 'aria-hidden': 'true' })
    };
    // A choice is a spoken line, not a push-button: it never presses. It is taken on click,
    // Enter or Space, and only while the flow is waiting for a choice.
    btn.addEventListener('click', function () { G.flow.choose(Number(btn.dataset.index)); });
    btn.addEventListener('keydown', function (e) {
      var idx = Number(btn.dataset.index);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (G.flow.phase === 'choosing') focusCard(clamp(idx + (e.key === 'ArrowDown' ? 1 : -1), 0, ui.cards.length - 1));
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        if (G.flow.phase === 'choosing') focusCard(e.key === 'Home' ? 0 : ui.cards.length - 1);
      }
    });
    els.cards[i] = parts;
    return parts;
  }

  function drawCardArt(canvas, sprite, width, height) {
    var img = G.image(sprite);
    var w = img.width;
    var h = img.height;
    var cw = Math.min(width, w);
    var ch = Math.min(height, h);
    var left = Math.ceil(cw / 2);
    var right = cw - left;
    var top = Math.ceil(ch / 2);
    var bottom = ch - top;
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, left, top, 0, 0, left, top);
    ctx.drawImage(img, w - right, 0, right, top, left, 0, right, top);
    ctx.drawImage(img, 0, h - bottom, left, bottom, 0, top, left, bottom);
    ctx.drawImage(img, w - right, h - bottom, right, bottom, left, top, right, bottom);
  }


  // How far each card is from rest. `away` 0..1 slides right (out or in), `rise` 0..1 is the
  // chosen card sending behind the divider. Returns null for a card that is gone.
  function cardMotion(i, now) {
    var f = C().feedback;
    var m = ui.motion;
    var move = Math.max(1, f.awayMs);
    if (!m) return { away: 0, rise: 0 };
    var t = now - m.start;
    if (m.kind === 'in') {
      var u = clamp((t - i * TU.timing.cardStaggerMs) / move, 0, 1);
      return { away: 1 - u, rise: 0, entering: true };
    }
    if (m.kind === 'clear') return { away: clamp(t / move, 0, 1), rise: 0 };
    // send
    if (i !== m.index) return { away: clamp(t / move, 0, 1), rise: 0 };
    if (m.vanishedAt) return null;
    return { away: 0, rise: clamp((t - move - f.send.delayMs) / Math.max(1, f.send.durationMs), 0, 1) };
  }

  // When the current motion is over. For a send, the moment the chosen card vanishes.
  G.motionDone = function (now) {
    var m = ui.motion;
    if (!m) return true;
    var f = C().feedback;
    var move = Math.max(1, f.awayMs);
    var t = now - m.start;
    if (m.kind === 'in') return t >= move + TU.timing.cardStaggerMs * Math.max(0, ui.cards.length - 1);
    if (m.kind === 'clear') return t >= move;
    return !!m.vanishedAt;
  };

  function renderChoices(now) {
    var c = C();
    var vp = c.viewport;
    var f = c.feedback;
    var m = ui.motion;
    var inspecting = !!ui.inspector;
    ui.choiceScroll = clamp(ui.choiceScroll, 0, choiceMaxScroll());
    els.cards.forEach(function (parts, i) { if (i >= ui.cards.length) show(parts.node, false); });
    ui.cards.forEach(function (card, i) {
      var parts = els.cards[i] || makeCard(i);
      var mo = cardMotion(i, now);
      var top = card.y - ui.choiceScroll;
      var away = 0;
      var rise = 0;
      if (mo) {
        // Ease: arriving decelerates into place; leaving starts fast, as in the lab.
        var eased = mo.entering ? mo.away * mo.away : 1 - (1 - mo.away) * (1 - mo.away);
        away = mo.away ? Math.round((eased * c.cardWidth) / 2) * 2 : 0;
        if (mo.rise) rise = Math.round((Math.pow(mo.rise, f.send.pull) * (top - f.send.edgeOffset + card.height)) / 2) * 2;
      }
      var edge = f.send.edgeOffset;
      var sending = m && m.kind === 'send' && i === m.index;
      var gone = !mo || (sending && rise > 0 && top - rise + card.height <= edge);
      if (sending && gone && !m.vanishedAt) m.vanishedAt = now;
      var on = !inspecting && !gone && top < vp.height && top + card.height > 0 && away < c.cardWidth;
      show(parts.node, on);
      parts.node.dataset.index = i;
      parts.node.dataset.choice = card.id;
      parts.node.dataset.sprite = card.sprite;
      if (card.kind) parts.node.dataset.kind = card.kind;
      else delete parts.node.dataset.kind;
      parts.node.setAttribute('aria-label', card.text);
      parts.node.tabIndex = G.flow && G.flow.phase === 'choosing' ? 0 : -1;
      place(parts.node, away, top - rise, c.cardWidth, card.height);
      var clipTop = sending ? Math.max(0, edge - (top - rise)) : Math.max(0, -top);
      var clipBottom = Math.max(0, top - rise + card.height - vp.height);
      parts.node.style.clipPath = clipTop || clipBottom || away ? 'inset(' + clipTop + 'px ' + away + 'px ' + clipBottom + 'px 0)' : '';
      var artKey = card.sprite + '|' + c.cardWidth + '|' + card.height;
      if (parts.artKey !== artKey) {
        drawCardArt(parts.art, card.sprite, c.cardWidth, card.height);
        parts.artKey = artKey;
      }
      var lh = c.text.lineHeight;
      var textH = card.wrapped.length * lh;
      var textTop = Math.max(6, Math.floor((card.height - textH) / 2)) + c.text.offsetY;
      var key = card.text + '|' + card.lines + (card.kind ? '|' + card.kind : '');
      if (parts.key !== key) {
        T.draw(parts.text, card.wrapped, card.ink || c.text.font, lh, c.text.maxWidth, textH + 8, undefined, 'choices');
        parts.key = key;
      }
      place(parts.text, c.text.offsetX, textTop, c.text.maxWidth, textH + 8);
    });
    renderThumb();
  }
  G.renderChoices = renderChoices;

  // Scrollbar thumb -----------------------------------------------------------------------
  // The same thumb serves the choices and, while inspecting, the item's description.
  function scrollModel() {
    if (ui.inspector) return { total: ui.inspector.height, scroll: ui.inspector.scroll, max: inspectorMaxScroll() };
    return { total: contentHeight(ui.cards), scroll: ui.choiceScroll, max: choiceMaxScroll() };
  }

  G.thumbMetrics = function () {
    var sb = L.scrollbar;
    var vp = C().viewport;
    var m = scrollModel();
    var minH = Math.max(sb.thumb.minHeight, sb.thumb.capHeight * 2);
    var height = m.max === 0 ? sb.track.height : clamp(Math.round((sb.track.height * vp.height) / m.total), minH, sb.track.height);
    var y = sb.track.y + (m.max === 0 ? 0 : Math.round(((sb.track.height - height) * m.scroll) / m.max));
    return { x: sb.thumb.x, y: y, width: sb.thumb.displayWidth, height: height, overflow: m.max > 0 };
  };

  function buildThumb() {
    els.thumb = el('canvas', 'hit-area', stage, { id: 'choiceThumb' });
    var drag = null;
    els.thumb.addEventListener('pointerdown', function (e) {
      if (!G.thumbMetrics().overflow) return;
      els.thumb.setPointerCapture(e.pointerId);
      drag = { y: e.clientY, scroll: scrollModel().scroll };
    });
    els.thumb.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var m = G.thumbMetrics();
      var range = L.scrollbar.track.height - m.height;
      var d = (e.clientY - drag.y) / G.viewScale();
      var next = drag.scroll + (range ? (d * scrollModel().max) / range : 0);
      if (ui.inspector) G.setInspectorScroll(next);
      else G.setChoiceScroll(next);
    });
    els.thumb.addEventListener('pointerup', function () { drag = null; });
    els.thumb.addEventListener('pointercancel', function () { drag = null; });
  }

  function renderThumb() {
    var t = L.scrollbar.thumb;
    var m = G.thumbMetrics();
    var on = ui.thumbOn || !!ui.inspector;
    show(els.thumb, on);
    els.thumb.dataset.overflow = m.overflow ? 'true' : 'false';
    if (!on) return;
    var key = [m.y, m.height, m.width].join('|');
    place(els.thumb, m.x, m.y, m.width, m.height);
    if (els.thumb.dataset.key === key) return;
    els.thumb.dataset.key = key;
    els.thumb.width = m.width;
    els.thumb.height = m.height;
    var ctx = els.thumb.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    blit(ctx, G.image('choice_scroll_thumb_top'), 1, CAP_ROWS, 0, t.capHeight, m.width);
    blit(ctx, G.image('choice_scroll_thumb_middle'), 0, 1, t.capHeight, 1, m.width);
    for (var y = t.capHeight + 1; y < m.height - t.capHeight; y++) ctx.drawImage(els.thumb, 0, t.capHeight, m.width, 1, 0, y, m.width, 1);
    blit(ctx, G.image('choice_scroll_thumb_bottom'), 0, CAP_ROWS, m.height - t.capHeight, t.capHeight, m.width);
  }

  // Pixel-centre nearest sampling, so Chromium and Firefox choose the same source pixels.
  function blit(ctx, img, srcY, srcRows, dstY, dstRows, dstCols) {
    for (var row = 0; row < dstRows; row++) {
      var sy = srcY + Math.floor(((row + 0.5) * srcRows) / dstRows);
      for (var col = 0; col < dstCols; col++) {
        var sx = Math.floor(((col + 0.5) * img.width) / dstCols);
        ctx.drawImage(img, sx, sy, 1, 1, col, dstY + row, 1, 1);
      }
    }
  }

  // Inventory -----------------------------------------------------------------------------
  function INV() {
    return L.inventory;
  }

  function buildInventory() {
    var layer = el('div', 'layer', stage, { id: 'layer-inventory' });
    els.invWindow = el('div', 'inv-window', layer, { id: 'invWindow', role: 'group', 'aria-label': 'Inventory' });
    for (var i = 0; i < 7 + SPARE; i++) {
      var slot = el('button', 'hit slot', els.invWindow, { type: 'button', 'data-slot': i });
      el('img', 'sprite', slot, { src: G.spriteUrl('inventory_slot'), alt: '', draggable: 'false' });
      var art = el('img', 'sprite item-art', slot, { alt: '', draggable: 'false' });
      var stand = el('canvas', 'sprite item-art', slot, { 'aria-hidden': 'true' });
      els.slots.push({ node: slot, art: art, stand: stand });
      slot.addEventListener('click', function (e) {
        var id = e.currentTarget.dataset.item;
        if (!id) return;
        G.selectItem(id);
        G.flow.toggleInspect(id);
      });
      slot.addEventListener('focus', function (e) {
        var id = e.currentTarget.dataset.item;
        if (id) G.selectItem(id);
      });
    }
    ['left', 'right'].forEach(function (side) {
      var id = 'inv-' + side;
      var btn = el('button', 'hit arrow', layer, { id: id, type: 'button', 'aria-label': (side === 'left' ? 'Previous' : 'Next') + ' inventory item' });
      el('img', 'sprite', btn, { alt: '', draggable: 'false' });
      els[id] = btn;
      bindPress(btn, id, renderInventory, function () { G.stepInventory(side === 'left' ? -1 : 1); });
    });
  }

  function itemCount() {
    return G.state ? G.state.inventory.length : 0;
  }

  function maxInvStart() {
    return Math.max(0, itemCount() - INV().slotCount);
  }

  G.stepInventory = function (direction) {
    var inv = INV();
    var before = ui.inv.start;
    ui.inv.start = clamp(before + direction * inv.stepPerPress, 0, maxInvStart());
    var moved = ui.inv.start - before;
    if (moved && inv.motion.slide) {
      var limit = 2 * inv.pitch;
      ui.inv.slide = { from: clamp(slideShift(performance.now()) + moved * inv.pitch, -limit, limit), start: performance.now() };
    }
    renderInventory();
  };

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
    var s = ui.inv.slide;
    return s ? Math.round(slideCurve(now - s.start, s.from, INV().motion)) : 0;
  }

  function slotShift(now, row, last) {
    var s = ui.inv.slide;
    var m = INV().motion;
    var order = s.from > 0 ? row : last - row;
    return Math.round(slideCurve(now - s.start - clamp(order, 0, last) * m.lagMs, s.from, m));
  }

  G.inventoryBusy = function (now) {
    var s = ui.inv.slide;
    var m = INV().motion;
    if (s && now - s.start >= m.durationMs + m.lagMs * (INV().slotCount - 1)) ui.inv.slide = null;
    return !!ui.inv.slide;
  };

  function renderArrow(id, comp) {
    var node = els[id];
    var down = !!ui.pressed[id];
    place(node, comp.x, comp.y, comp.displayWidth, comp.displayHeight);
    node.dataset.state = down ? 'down' : 'up';
    var img = node.firstChild;
    var src = G.spriteUrl(comp.spriteFamily + (down ? '_down' : '_up'));
    if (img.getAttribute('src') !== src) img.setAttribute('src', src);
  }

  function renderInventory() {
    var inv = INV();
    var layout = inv.slotLayouts[inv.slotCount];
    var count = inv.slotCount;
    var width = (count - 1) * inv.pitch + inv.slotSize[0];
    var pad = inv.motion.overshoot + inv.motion.settle;
    var left = Math.max(pad, layout.x - (inv.leftArrow.x + inv.leftArrow.displayWidth));
    var right = Math.max(pad, inv.rightArrow.x - (layout.x + width));
    var now = performance.now();
    var sliding = !!ui.inv.slide;
    var items = G.state ? G.state.inventory : [];
    ui.inv.start = clamp(ui.inv.start, 0, maxInvStart());
    place(els.invWindow, layout.x - left, layout.y, left + width + right, inv.slotSize[1]);
    // Every slot position shows its slot; the strip is as long as the items, at least a row.
    var length = Math.max(count, items.length);
    var used = 0;
    var first = sliding ? -SPARE : 0;
    var last = sliding ? count + SPARE - 1 : count - 1;
    for (var row = first; row <= last && used < els.slots.length; row++) {
      var index = ui.inv.start + row;
      if (index < 0 || index >= length) continue;
      var x = left + row * inv.pitch + (sliding ? slotShift(now, row, count - 1) : 0);
      if (x + inv.slotSize[0] <= 0 || x >= left + width + right) continue;
      var slot = els.slots[used++];
      var id = items[index];
      show(slot.node, true);
      place(slot.node, x, 0, inv.slotSize[0], inv.slotSize[1]);
      slot.node.dataset.index = index;
      slot.node.dataset.item = id || '';
      slot.node.tabIndex = id ? 0 : -1;
      slot.node.setAttribute('aria-label', id ? port().item(id).name : 'Empty slot');
      slot.node.dataset.open = ui.inspector && ui.inspector.id === id ? 'true' : 'false';
      slot.node.dataset.selected = id && G.selectedItem() === id ? 'true' : 'false';
      var def = id && port().item(id);
      var src = def && def.slotArt ? G.url(def.slotArt) : '';
      show(slot.art, !!src);
      if (src && slot.art.getAttribute('src') !== src) slot.art.setAttribute('src', src);
      show(slot.stand, !!def && !src);
      if (def && !src && slot.stand.dataset.item !== id) {
        P.slotItem(slot.stand, def.name);
        slot.stand.dataset.item = id;
      }
    }
    els.slots.slice(used).forEach(function (s) { show(s.node, false); });
    renderArrow('inv-left', inv.leftArrow);
    renderArrow('inv-right', inv.rightArrow);
  }
  G.renderInventory = renderInventory;

  // The item last clicked or focused (UI only: it marks the slot, data-selected). Nothing opens it
  // implicitly: an item is inspected only when the player activates its slot (docs/64), and
  // holding a single item never makes it a target.
  G.selectItem = function (id) {
    ui.selected = id;
    renderInventory();
  };
  G.selectedItem = function () {
    var inv = G.state ? G.state.inventory : [];
    return ui.selected && inv.indexOf(ui.selected) !== -1 ? ui.selected : null;
  };

  // Utility buttons -----------------------------------------------------------------------
  // Three physical buttons. In conversation: the CONTEXT ACTION, NOTES, FILES. The first is the
  // optional thing to do in the current situation, read from content (G.rules.contextAction,
  // docs/64): its label and glyph are data (reception: OBSERVE with the WATCH glyph); with none
  // defined it is the bare button. It is live only while the player could choose, and a `once`
  // action already taken stays on show, inactive, saying why. While inspecting an item:
  // READ, SHOW or USE (whichever this moment allows), and a blank third button: the X, Escape and
  // a second click on the item close the inspector, so no button does (docs/53). An action that belongs here but
  // cannot be taken now keeps its glyph in an inactive treatment, does not press, and its tooltip
  // says why (docs/49 section 2.1). Hover never changes any of this.
  function utilityActions() {
    if (ui.inspector && ui.inspector.scenePickup) {
      // The wall kit is not inventory. Its own authored rules cards supply the
      // medical checks; these are just the existing three contextual buttons.
      var pickup = ui.inspector.scenePickup;
      return [
        { action: 'pickup-read', glyph: 'read', label: 'READ LABEL', enabled: !!pickup.readChoice && G.flow.phase === 'choosing', why: 'LABEL ALREADY READ' },
        { action: 'pickup-use', glyph: 'use', label: 'USE ANTIDOTE', enabled: !!pickup.useChoice && G.flow.phase === 'choosing', why: 'NOT AVAILABLE HERE' },
        { action: 'none', glyph: null, label: '', enabled: false, blank: true }
      ];
    }
    if (ui.inspector) {
      var acts = port().itemActions(ui.inspector.id);
      var mid = acts.use ? { action: 'use', glyph: 'use', label: 'USE', enabled: true }
        : { action: 'show', glyph: 'show_badge', label: 'SHOW', enabled: !!acts.show, why: 'NOT AVAILABLE HERE' };
      if (G.flow.phase !== 'choosing') mid.enabled = false;
      return [
        { action: 'read', glyph: 'read', label: 'READ', enabled: acts.read, why: 'NOTHING TO READ' },
        mid,
        { action: 'none', glyph: null, label: '', enabled: false, blank: true }
      ];
    }
    var ctx = G.state ? port().contextAction() : null;
    var first = { action: 'none', glyph: null, label: '', enabled: false, blank: true };
    if (ctx) {
      var spent = port().contextSpent();
      first = { action: 'context', glyph: ctx.glyph, label: ctx.label, enabled: !spent && G.flow.phase === 'choosing', why: spent ? ctx.spentWhy : 'NOT NOW' };
    }
    return [
      first,
      { action: 'notes', glyph: 'notes', label: 'NOTES', enabled: true },
      { action: 'files', glyph: 'files', label: 'FILES', enabled: true }
    ];
  }
  G.utilityActions = utilityActions;

  function buildUtility() {
    var layer = el('div', 'layer', stage, { id: 'layer-utility' });
    L.utility.buttons.forEach(function (comp, i) {
      var id = 'util-' + i;
      var btn = el('button', 'hit utility', layer, { id: id, type: 'button' });
      var parts = {
        node: btn,
        img: el('img', 'sprite', btn, { alt: '', draggable: 'false' }),
        glyph: el('img', 'glyph', btn, { alt: '', draggable: 'false' }),
        glyphOff: el('canvas', 'glyph', btn, { 'aria-hidden': 'true' })
      };
      els.utility[i] = parts;
      bindPress(btn, id, renderUtility, function () {
        var a = utilityActions()[i];
        if (a.enabled) G.flow.utility(a.action);
      }, function () { return utilityActions()[i].enabled; });
      btn.addEventListener('pointerenter', function () { tipRequest(i); });
      btn.addEventListener('pointerleave', function () { tipRelease(i); });
      btn.addEventListener('focus', function () { tipRequest(i); });
      btn.addEventListener('blur', function () { tipRelease(i); });
    });
    els.tooltip = el('div', 'tooltip', stage, { id: 'tooltip', role: 'tooltip' });
    els.tooltipText = el('canvas', '', els.tooltip, { 'aria-hidden': 'true' });
    els.tooltipWhy = el('canvas', '', els.tooltip, { id: 'tooltipWhy', 'aria-hidden': 'true' });
    show(els.tooltip, false);
  }

  function renderUtility() {
    var u = L.utility;
    var acts = utilityActions();
    u.buttons.forEach(function (comp, i) {
      var id = 'util-' + i;
      var parts = els.utility[i];
      var a = acts[i];
      var down = !!ui.pressed[id];
      place(parts.node, comp.x, comp.y, comp.displayWidth, comp.displayHeight);
      parts.node.dataset.state = down ? 'down' : 'up';
      parts.node.dataset.action = a.action;
      parts.node.setAttribute('aria-label', a.blank ? 'No action' : a.label);
      parts.node.setAttribute('aria-disabled', a.enabled ? 'false' : 'true');
      parts.node.tabIndex = a.blank ? -1 : 0;
      var src = G.spriteUrl(comp.spriteFamily + (down ? '_down' : '_up'));
      if (parts.img.getAttribute('src') !== src) parts.img.setAttribute('src', src);
      // A blank button is the bare physical button: no glyph, no tooltip, it never presses.
      parts.node.dataset.glyph = a.blank ? 'none' : a.enabled ? 'on' : 'inactive';
      if (a.blank) {
        show(parts.glyph, false);
        show(parts.glyphOff, false);
        return;
      }
      show(parts.glyph, a.enabled);
      show(parts.glyphOff, !a.enabled);
      var gsrc = G.glyphUrl(a.glyph);
      if (parts.glyph.getAttribute('src') !== gsrc) parts.glyph.setAttribute('src', gsrc);
      if (!a.enabled && parts.glyphOff.dataset.glyph !== a.glyph) {
        inactiveGlyph(parts.glyphOff, a.glyph);
        parts.glyphOff.dataset.glyph = a.glyph;
      }
      var size = G.glyphSize(a.glyph);
      var d = down ? u.pressedLabelOffset : { dx: 0, dy: 0 };
      var gx = Math.floor((comp.displayWidth - size[0]) / 2) + comp.labelOffset.dx + d.dx;
      var gy = Math.floor((comp.displayHeight - size[1]) / 2) + comp.labelOffset.dy + d.dy;
      place(parts.glyph, gx, gy, size[0], size[1]);
      place(parts.glyphOff, gx, gy, size[0], size[1]);
    });
    if (ui.tooltip) G.showTooltip(ui.tooltip.index, ui.tooltip.text);
  }
  G.renderUtility = renderUtility;

  // The inactive treatment: the same glyph, desaturated and darkened, as if unlit. Composited
  // once per glyph from the approved file with no pixel readback (file:// pages cannot read a
  // canvas back), no CSS filter, and nothing that depends on hover. Temporary until the owner
  // chooses a treatment.
  function inactiveGlyph(canvas, name) {
    var img = G.image('glyph:' + name);
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(14, 20, 22, 0.6)';
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Tooltip: a separate element beside the button. The button itself never changes on hover.
  // Its box is CSS (docs/61); its face is Press Start 2P 2x, the Labels role. Hover and focus show
  // it after TU.tooltip.showDelayMs and leaving hides it after hideDelayMs; both are 0 in
  // production, so it shows and hides at once, exactly as before.
  var tipTimer = null;
  function tipRequest(i) {
    clearTimeout(tipTimer);
    tipTimer = null;
    if (TU.tooltip.showDelayMs > 0) tipTimer = setTimeout(function () { tipTimer = null; G.showTooltip(i); }, TU.tooltip.showDelayMs);
    else G.showTooltip(i);
  }
  function tipRelease(i) {
    clearTimeout(tipTimer);
    tipTimer = null;
    if (TU.tooltip.hideDelayMs > 0) tipTimer = setTimeout(function () { tipTimer = null; G.hideTooltip(i); }, TU.tooltip.hideDelayMs);
    else G.hideTooltip(i);
  }

  // The reason line of an unavailable action, in a smaller face (TU.tooltip.reasonFace). Face 1
  // is the Labels face drawn at exactly half size: every glyph pixel of the 2x face is a 2x2
  // block on even coordinates, so a nearest-neighbour halving gives the same face at 1x.
  var REASON_ROLE = { 1: 'labels', 2: 'dialogue', 3: 'objective' };
  function reasonLabel(canvas, text) {
    var face = TU.tooltip.reasonFace;
    var role = REASON_ROLE[face] || 'labels';
    if (face !== 1) return T.label(canvas, text, 'light', role);
    var full = document.createElement('canvas');
    var size = T.label(full, text, 'light', role);
    canvas.width = Math.ceil(size[0] / 2);
    canvas.height = Math.ceil(size[1] / 2);
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(full, 0, 0, canvas.width * 2, canvas.height * 2, 0, 0, canvas.width, canvas.height);
    return [canvas.width, canvas.height];
  }

  // The label as is on the first line; an unavailable action's reason on a second, smaller line.
  // Both lines are centred in the box. `text` (a fixed one-line text) is for the polish lab.
  G.showTooltip = function (i, text) {
    var a = utilityActions()[i];
    if (a.blank) return G.hideTooltip();
    var label = text || a.label;
    var why = (text || a.enabled) ? '' : (a.why || 'NOT AVAILABLE HERE');
    ui.tooltip = { index: i, text: text };
    var tt = TU.tooltip;
    var size = T.label(els.tooltipText, label, 'light', 'labels');
    var wsize = why ? reasonLabel(els.tooltipWhy, why) : [0, 0];
    var inner = Math.max(size[0], wsize[0]);
    var comp = L.utility.buttons[i];
    var w = inner + 2 * tt.padX;
    var h = size[1] + (why ? tt.reasonGapY + wsize[1] : 0) + 2 * tt.padY;
    var x = clamp(comp.x + Math.floor((comp.displayWidth - w) / 2) + tt.offsetX, 8, 1920 - 8 - w);
    place(els.tooltip, x, comp.y - h - tt.gapY, w, h);
    place(els.tooltipText, tt.padX + Math.floor((inner - size[0]) / 2), tt.padY, size[0], size[1]);
    if (why) place(els.tooltipWhy, tt.padX + Math.floor((inner - wsize[0]) / 2), tt.padY + size[1] + tt.reasonGapY, wsize[0], wsize[1]);
    show(els.tooltipWhy, !!why);
    els.tooltip.dataset.text = why ? label + '\n' + why : label;
    els.tooltip.dataset.label = label;
    els.tooltip.dataset.why = why;
    show(els.tooltip, true);
  };
  G.hideTooltip = function (i) {
    if (ui.tooltip && (i === undefined || ui.tooltip.index === i)) {
      ui.tooltip = null;
      show(els.tooltip, false);
    }
  };

  // Item inspector ------------------------------------------------------------------------
  // docs/45 section 7: the portrait window grows down to the dialogue box's bottom edge and the
  // item fills it; the choices box holds the item's text; the buttons change; an X closes it.
  // The owner-provided item column overlay is production art. An item's inspect art comes from its
  // content entry (`inspectArt`, authored at 565x451 and drawn 1:1); an item without one falls back
  // to the labelled development placeholder. The X is one static sprite (owner ruling, docs/64):
  // centred, symmetrical, with no press look and no DOWN state.
  // The overlay's see-through window is hand-drawn (about x1332-1894, y51-499). The art fills a
  // rectangle just inside the frame and sits UNDER the overlay, so the frame's ragged inner edge
  // always wins and no rail is overpainted.
  var INSPECT_RECT = [1331, 50, 565, 451];
  var CLOSE = 44;
  G.INSPECTOR_ART = {
    close: { image: 'ui:inspect_close', path: 'art/ui/sprites/inspect_close.png' }
  };
  // The preloaded image name for an item's inspect art (js/main.js decodes it before ready; it is
  // also the item's G.ART key, G.artKey.inspect).
  G.inspectImageName = function (id) {
    return 'inspect:' + id;
  };

  function buildInspector() {
    els.inspector = el('div', 'layer', stage, { id: 'inspector' });
    // The art area: holds either the item's own inspect image or the placeholder canvas.
    els.inspectArt = el('div', 'sprite-abs art-aperture', els.inspector, { id: 'inspectArt', 'aria-hidden': 'true' });
    place(els.inspectArt, INSPECT_RECT[0] + TU.inspector.artDx, INSPECT_RECT[1] + TU.inspector.artDy, INSPECT_RECT[2], INSPECT_RECT[3]);
    els.inspectPlaceholder = document.createElement('canvas');
    els.inspectPlaceholder.id = 'inspectPlaceholder';
    els.inspectPlaceholder.className = 'sprite-abs';
    // Full-canvas RGBA overlay: transparent everywhere except the replacement right-column frame.
    // Keep it at 1:1 stage coordinates; never crop/rescale it into the old placeholder rectangle.
    els.inspectColumn = keptImg('inspectColumn', 'sprite-abs', els.inspector, {
      id: 'inspectColumn',
      src: G.url('art/ui/shell/item-overlay.png'),
      width: '1920',
      height: '1080',
      alt: '',
      draggable: 'false',
      'aria-hidden': 'true'
    });
    place(els.inspectColumn, 0, 0, 1920, 1080);
    els.inspectClose = el('button', 'hit', els.inspector, { id: 'inspectClose', type: 'button', 'aria-label': 'Close the item' });
    // The 44x44 button is the hit area; the one static sprite inside it (the preloaded image) is
    // passive (pointer-events: none) and never changes. A release on the button, Enter / Space,
    // Escape or activating the open item again closes the inspector.
    els.inspectCloseImg = closeSprite('close', 'inspectCloseImg');
    place(els.inspectClose, INSPECT_RECT[0] + INSPECT_RECT[2] - CLOSE - 8 + TU.inspector.closeDx, INSPECT_RECT[1] + 8 + TU.inspector.closeDy, CLOSE, CLOSE);
    bindPress(els.inspectClose, 'inspect-close', function () {}, function () { G.flow.closeInspector(); });
    show(els.inspector, false);
  }

  function closeSprite(key, id) {
    var img = G.image(G.INSPECTOR_ART[key].image);
    img.id = id;
    img.className = 'sprite';
    img.alt = '';
    img.draggable = false;
    img.setAttribute('aria-hidden', 'true');
    img.width = CLOSE;
    img.height = CLOSE;
    els.inspectClose.appendChild(img);
    return img;
  }

  // Shows the item's inspect art 1:1 at the art area's origin, or the placeholder when it has none.
  function showInspectArt(id) {
    delete els.inspectArt.dataset.art;
    if (ui.inspector && ui.inspector.scenePickup) {
      // The scene pickup's own 565x451 window covers the portrait aperture. PMO ruling 2026-11-18
      // (docs/103): it shows the node's owner-approved Focus A close-up, the same native 564x278
      // image at 1:1 (never scaled), at the window's origin where the Focus A layer stands, over a
      // flat fill in the palette's dark plate. Title, text, cards and pickup behaviour are unchanged.
      var fk = G.flow.view().focus;
      var focusPath = fk && G.story && G.story.assets && G.story.assets.focus ? G.story.assets.focus[fk] : null;
      var focusImg = typeof focusPath === 'string' ? G.image(artKey.focus(fk)) : null;
      if (focusImg && focusImg.complete && focusImg.naturalWidth > 0) {
        var fill = els.inspectPickupFill || (els.inspectPickupFill = document.createElement('canvas'));
        fill.width = INSPECT_RECT[2];
        fill.height = INSPECT_RECT[3];
        var fc = fill.getContext('2d');
        fc.fillStyle = '#0e1b20';
        fc.fillRect(0, 0, fill.width, fill.height);
        fill.className = 'sprite-abs';
        fill.setAttribute('aria-hidden', 'true');
        place(fill, 0, 0, INSPECT_RECT[2], INSPECT_RECT[3]);
        var shown = focusImg.cloneNode(false);
        shown.id = 'inspectImage';
        shown.className = 'sprite-abs';
        shown.alt = '';
        shown.draggable = false;
        shown.setAttribute('aria-hidden', 'true');
        shown.width = focusImg.naturalWidth;
        shown.height = focusImg.naturalHeight;
        place(shown, 0, 0, focusImg.naturalWidth, focusImg.naturalHeight);
        els.inspectArt.replaceChildren(fill, shown);
        els.inspectArt.dataset.kind = 'scene-pickup-art';
        els.inspectArt.dataset.art = artKey.focus(fk);
        return;
      }
      // No approved Focus A for this pickup: the labelled scene-owned placeholder, as before.
      P.inspectArt(els.inspectPlaceholder, INSPECT_RECT[2], INSPECT_RECT[3], null,
        ui.inspector.scenePickup.title + ' - OPEN WALL KIT - ART NOT YET APPROVED',
        ['CLOSE-UP OF THE OPENED KIT. NOT IN YOUR INVENTORY UNTIL YOU CLOSE IT.']);
      place(els.inspectPlaceholder, 0, 0, INSPECT_RECT[2], INSPECT_RECT[3]);
      els.inspectArt.replaceChildren(els.inspectPlaceholder);
      els.inspectArt.dataset.kind = 'scene-pickup-placeholder';
      return;
    }
    var def = port().item(id);
    var img = def.inspectArt ? G.image(G.inspectImageName(id)) : null;
    if (img) {
      img.id = 'inspectImage';
      img.className = 'sprite-abs';
      img.alt = '';
      img.draggable = false;
      img.setAttribute('aria-hidden', 'true');
      img.width = img.naturalWidth;
      img.height = img.naturalHeight;
      place(img, 0, 0, img.naturalWidth, img.naturalHeight);
      els.inspectArt.replaceChildren(img);
      els.inspectArt.dataset.kind = 'art';
    } else {
      P.inspectArt(els.inspectPlaceholder, INSPECT_RECT[2], INSPECT_RECT[3], def.slotArt ? G.image('item:' + id) : null, def.name + ' - INSPECT ART NOT YET APPROVED');
      place(els.inspectPlaceholder, 0, 0, INSPECT_RECT[2], INSPECT_RECT[3]);
      els.inspectArt.replaceChildren(els.inspectPlaceholder);
      els.inspectArt.dataset.kind = 'placeholder';
    }
  }

  function inspectorLines() {
    var id = ui.inspector.id;
    var pickup = ui.inspector.scenePickup;
    var width = C().viewport.width - C().text.offsetX - 24;
    // A scene-owned kit is only granted to inventory on X/Escape close. Its
    // physical source, title and narration come from the current authored node.
    var lines = [{ text: pickup ? pickup.title : port().item(id).name, role: 'labels', ink: 'dark' }];
    T.wrap(pickup ? pickup.description : port().description(id), width, 'dialogue').forEach(function (t, i) {
      lines.push({ text: t, role: 'dialogue', ink: 'dark', gap: i === 0 ? 10 : 0 });
    });
    return lines;
  }

  function inspectorMaxScroll() {
    return Math.max(0, ui.inspector.height - C().viewport.height);
  }

  G.setInspectorScroll = function (v) {
    if (!ui.inspector) return;
    ui.inspector.scroll = clamp(Math.round(v), 0, inspectorMaxScroll());
    renderInspector();
    renderThumb();
  };

  function renderInspector() {
    var on = !!ui.inspector;
    show(els.inspector, on);
    show(els.inspectText, on);
    if (!on) return;
    var id = ui.inspector.id;
    if (els.inspectArt.dataset.item !== (ui.inspector.scenePickup ? 'scene:' + ui.inspector.scenePickup.id : id)) {
      showInspectArt(id);
      els.inspectArt.dataset.item = ui.inspector.scenePickup ? 'scene:' + ui.inspector.scenePickup.id : id;
    }
    var lines = inspectorLines();
    var lh = 24;
    var gaps = lines.reduce(function (n, l) { return n + (l.gap || 0); }, 0);
    ui.inspector.height = lines.length * lh + gaps + 24;
    ui.inspector.scroll = clamp(ui.inspector.scroll, 0, inspectorMaxScroll());
    var vp = C().viewport;
    var key = JSON.stringify(lines);
    if (els.inspectText.dataset.key !== key) {
      T.draw(els.inspectText, lines, 'dark', lh, vp.width - C().text.offsetX - 24, ui.inspector.height, undefined, 'dialogue');
      els.inspectText.dataset.key = key;
    }
    els.inspectText.dataset.item = id;
    place(els.inspectText, C().text.offsetX + TU.inspector.textDx, TU.inspector.textY - ui.inspector.scroll, vp.width - C().text.offsetX - 24, ui.inspector.height);
  }
  G.renderInspector = renderInspector;

  // NOTES (transcript) and FILES (case file) ---------------------------------------------
  // Shown over the scene window, which they never leave, each on its own production panel
  // (1255x822, the scene aperture, docs/60 and docs/63): NOTES on the records panel, FILES on the
  // case-file panel. Text regions, in panel coordinates, fit both panels' blank areas: the NOTES
  // title on the teal band (y 11-108), the FILES title in its label plate, the body on the cream reading area (NOTES x 31-1222 y 122-776, FILES
  // x 28-1225 y 133-767). The body keeps the previous left edge and wrap width, so lines break
  // exactly as before.
  G.OVERLAY_ART = {
    notes: { image: 'ui:notes_files_panel', path: 'art/ui/overlays/notes_files_panel.png' },
    files: { image: 'ui:files_panel', path: 'art/ui/overlays/files_panel.png' },
    // NOTES v2 (docs/63; production since Round 2, docs/82): loaded when TU.overlay.notesPanel is 2,
    // which is production; the earlier `notes` panel only when it is 1 (the polish lab can pick it).
    notesV2: { image: 'ui:notes_panel_v2', path: 'art/ui/overlays/notes_panel_v2.png' }
  };
  // The OVERLAY_ART key of the panel behind an overlay ('notes' | 'files').
  G.overlayPanelKey = function (kind) {
    if (kind === 'files') return 'files';
    return TU.overlay.notesPanel === 2 ? 'notesV2' : 'notes';
  };

  // Puts the overlay's own panel image (the preloaded image itself) under the text canvas.
  function showOverlayPanel(kind) {
    var art = G.OVERLAY_ART[G.overlayPanelKey(kind)];
    if (els.overlayPanel && els.overlayPanel.dataset.art === art.path) return;
    var panel = G.image(art.image);
    panel.id = 'overlayPanel';
    panel.className = 'layer art';
    panel.alt = '';
    panel.draggable = false;
    panel.setAttribute('aria-hidden', 'true');
    panel.width = panel.naturalWidth;
    panel.height = panel.naturalHeight;
    panel.dataset.art = art.path;
    place(panel, 0, 0, panel.naturalWidth, panel.naturalHeight);
    if (els.overlayPanel) els.overlay.replaceChild(panel, els.overlayPanel);
    else els.overlay.insertBefore(panel, els.overlayCanvas);
    els.overlayPanel = panel;
  }

  // Title x / centre row, body box and line height come from TU.overlay (js/tuning.js).
  function OV() {
    return TU.overlay;
  }

  function overlayTitle() {
    return ui.overlay === 'notes' ? port().notesTitle : 'YOUR FILES';
  }

  function overlayLines() {
    var width = OV().bodyWidth;
    var lines = [];
    function add(text, role, gap) {
      T.wrap(text, width, role).forEach(function (t, i) { lines.push({ text: t, role: role, gap: i === 0 ? gap || 0 : 0 }); });
    }
    if (ui.overlay === 'notes') {
      port().notes(add);
    } else {
      port().files().forEach(function (t) { add(t, 'dialogue', 16); });
    }
    return lines;
  }

  function overlayView(lines) {
    // How many rows fit from `start`, with gaps.
    var h = OV().bodyHeight;
    return function (start) {
      var y = 0;
      var n = 0;
      for (var i = start; i < lines.length; i++) {
        y += (i > start ? lines[i].gap || 0 : 0) + OV().lineHeight;
        if (y > h) break;
        n++;
      }
      return Math.max(1, n);
    };
  }

  function overlayMax(lines) {
    var fit = overlayView(lines);
    var s = 0;
    while (s < lines.length - 1 && s + fit(s) < lines.length) s++;
    return s;
  }

  G.setOverlayScroll = function (v) {
    if (!ui.overlay) return;
    ui.overlayScroll = clamp(v, 0, overlayMax(overlayLines()));
    renderOverlay();
  };

  G.overlayMaxScroll = function () {
    return ui.overlay ? overlayMax(overlayLines()) : 0;
  };

  function renderOverlay() {
    show(els.overlay, !!ui.overlay);
    if (!ui.overlay) return;
    var sc = R.sceneAperture.rect;
    var lines = overlayLines();
    ui.overlayScroll = clamp(ui.overlayScroll, 0, overlayMax(lines));
    var fit = overlayView(lines)(ui.overlayScroll);
    var shown = lines.slice(ui.overlayScroll, ui.overlayScroll + fit);
    showOverlayPanel(ui.overlay);
    var c = els.overlayCanvas;
    c.width = sc[2]; // also clears it: the canvas holds only text over the panel image
    c.height = sc[3];
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var title = overlayTitle();
    var head = document.createElement('canvas');
    if (ui.overlay === 'files') {
      // Dark ink, centred in the FILES panel's label plate.
      var size = T.label(head, title, 'dark', 'labels');
      var rows = inkRows(head);
      ctx.drawImage(head, OV().filesTitleCenterX - Math.floor(size[0] / 2), OV().filesTitleCenterY - Math.round((rows[0] + rows[1]) / 2));
    } else {
      T.draw(head, [{ text: title, role: 'labels' }], 'light', OV().lineHeight, OV().bodyWidth, OV().lineHeight, undefined, 'labels');
      ctx.drawImage(head, OV().titleX, OV().titleCenterY - Math.floor(T.capHeight('labels') / 2));
    }
    var text = document.createElement('canvas');
    // Dark ink on the cream reading surface.
    T.draw(text, shown.map(function (l, i) { return { text: l.text, role: l.role, gap: i ? l.gap : 0 }; }), 'dark', OV().lineHeight, OV().bodyWidth, OV().bodyHeight, undefined, 'dialogue');
    ctx.drawImage(text, OV().bodyX, OV().bodyY);
    c.dataset.kind = ui.overlay;
    c.dataset.title = title;
    c.dataset.lines = lines.length;
    c.dataset.scroll = ui.overlayScroll;
    c.dataset.text = [title].concat(lines.map(function (l) { return l.text; })).join('\n');
    els.overlay.setAttribute('aria-label', ui.overlay === 'notes' ? 'Notes: transcript' : 'Files: your files');
  }
  G.renderOverlay = renderOverlay;

  // Objective -----------------------------------------------------------------------------
  function buildObjective() {
    els.objTitle = el('canvas', 'hit-area', stage, { id: 'objectiveTitle', 'aria-hidden': 'true' });
    els.objBody = el('canvas', 'hit-area', stage, { id: 'objectiveBody', role: 'status' });
  }

  function renderObjective() {
    var title = L.objective.title;
    var body = L.objective.body;
    var lh = T.lineHeight('objective');
    var ink = Math.max(1, T.inkWidth(title.text, 'objective'));
    var x = title.centered ? title.plaque.x + Math.floor((title.plaque.width - ink) / 2) + title.alignOffsetX : title.x;
    T.draw(els.objTitle, [title.text], title.font, lh, ink, lh, undefined, 'objective');
    place(els.objTitle, x, title.y, ink, lh);
    var text = (G.state && G.state.objective) || '';
    if (els.objBody.dataset.text === text) return;
    var lines = T.wrap(text, body.width, 'objective');
    var h = Math.max(1, lines.length * body.lineHeight);
    T.draw(els.objBody, lines, body.font, body.lineHeight, body.width, h, undefined, 'objective');
    place(els.objBody, body.x, body.y, body.width, h);
    els.objBody.dataset.text = text;
    els.objBody.dataset.lines = lines.length;
    els.objBody.setAttribute('aria-label', 'Objective: ' + text);
  }

  // ---------------------------------------------------------------------------------------
  // Item received ---------------------------------------------------------------------------
  // A slip that says an item was just added: label, item name and its slot art. It sits in the
  // scene window just above the inventory, clear of the dialogue and the choices, and goes by
  // itself after TU.notice.durationMs (3.6 s) or at a click. The slip is production art (docs/61);
  // only the item art and the two text lines are drawn at runtime, in the locked fonts.
  // Fades (owner-approved, docs/62 §12): the whole slip fades by opacity only, linearly, driven from the
  // frame loop (no CSS transition). durationMs is the WHOLE lifecycle: 0 -> fadeInMs rises 0 -> 1,
  // then exactly 1, then the last fadeOutMs falls 1 -> 0, then the slip is removed and the next
  // queued one starts with its own fade-in (never a crossfade). A click starts the fade-out at once,
  // from the current opacity.
  var NOTICE_SIZE = [560, 116]; // the slip art's own size; its position is TU.notice.x / y
  // Production slip (docs/61): art/ui/overlays/item_received_slip.png, 560x116, shown 1:1 as its own
  // image. A transparent canvas above it draws only the item's slot art and the two lines of text,
  // into the slip's blank regions (slip coordinates): the item compartment (x 8-115, y 7-105), the
  // upper text band (x 121-549, y 8-48) and the lower band (y 50-103). Generic for any item.
  G.NOTICE_ART = { slip: { image: 'ui:item_received_slip', path: 'art/ui/overlays/item_received_slip.png' } };
  // Item art at (TU.notice.itemX, itemY), centred in the compartment; ITEM RECEIVED at titleX,
  // centred on titleMidY (the upper band's middle); the name at nameX, centred on nameMidY.

  function buildNotice() {
    els.notice = el('div', 'notice', stage, { id: 'itemNotice', role: 'status', 'aria-live': 'polite' });
    place(els.notice, TU.notice.x, TU.notice.y, NOTICE_SIZE[0], NOTICE_SIZE[1]);
    var bg = G.image(G.NOTICE_ART.slip.image);
    bg.id = 'itemNoticeBackground';
    bg.className = 'sprite-abs';
    bg.alt = '';
    bg.draggable = false;
    bg.setAttribute('aria-hidden', 'true');
    bg.width = bg.naturalWidth;
    bg.height = bg.naturalHeight;
    place(bg, 0, 0, bg.naturalWidth, bg.naturalHeight);
    els.notice.appendChild(bg);
    els.noticeBackground = bg;
    els.noticeArt = el('canvas', 'sprite', els.notice, { id: 'itemNoticeContent', 'aria-hidden': 'true' });
    els.notice.addEventListener('click', function () { G.dismissNotice(); });
    show(els.notice, false);
  }

  // Rows [top, bottom) that hold ink in a text canvas, so a line can be centred on its band
  // whatever the face's cap offset.
  function inkRows(canvas) {
    var d;
    try {
      d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    } catch (e) {
      // Opened from file:// (Chromium treats each file as its own origin, so a canvas drawn from the
      // font atlases cannot be read back): the same rows from the glyph boxes (T.inkRows).
      // Pre-existing on the M2 line: the item slip threw here from file:// (docs/84 section 7).
      if (canvas.dataset.labelText !== undefined) return T.inkRows(canvas.dataset.labelText, canvas.dataset.labelRole);
      return [0, canvas.height];
    }
    var top = -1;
    var bottom = 0;
    for (var y = 0; y < canvas.height; y++) {
      for (var x = 0; x < canvas.width; x++) {
        if (d[(y * canvas.width + x) * 4 + 3]) {
          if (top < 0) top = y;
          bottom = y + 1;
          break;
        }
      }
    }
    return top < 0 ? [0, canvas.height] : [top, bottom];
  }

  function drawNotice(canvas, id) {
    canvas.width = NOTICE_SIZE[0]; // also clears it: the canvas holds only the item and the text
    canvas.height = NOTICE_SIZE[1];
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var art = port().item(id).slotArt ? G.image('item:' + id) : null;
    if (art) ctx.drawImage(art, TU.notice.itemX, TU.notice.itemY, 96, 96);
    [['ITEM RECEIVED', 'labels', TU.notice.titleX, TU.notice.titleMidY], [port().item(id).name, 'choices', TU.notice.nameX, TU.notice.nameMidY]].forEach(function (line) {
      var c = document.createElement('canvas');
      T.label(c, line[0], 'dark', line[1]);
      var rows = inkRows(c);
      ctx.drawImage(c, line[2], line[3] - Math.round((rows[0] + rows[1]) / 2));
    });
  }

  // The slip's opacity at `now`: the lower of the rise and the fall, so a lifecycle shorter than
  // both fades never holds a negative time. After a click (`out`) it falls linearly from the opacity
  // it had then to 0 at `until`.
  function noticeOpacity(n, now) {
    if (n.out) return clamp(n.until > n.out.at ? (n.out.from * (n.until - now)) / (n.until - n.out.at) : 0, 0, 1);
    var rise = n.fadeIn > 0 ? (now - n.start) / n.fadeIn : 1;
    var fall = n.fadeOut > 0 ? (n.until - now) / n.fadeOut : 1;
    return clamp(Math.min(rise, fall), 0, 1);
  }
  G.noticeOpacity = function (now) {
    return ui.notice ? noticeOpacity(ui.notice, now === undefined ? performance.now() : now) : 0;
  };
  // Opacity only: no transform, filter or transition. At 1 the slip is drawn exactly as before.
  function applyNoticeOpacity(now) {
    if (!ui.notice || !els.notice) return;
    var o = String(noticeOpacity(ui.notice, now));
    if (els.notice.style.opacity !== o) els.notice.style.opacity = o;
  }

  function showNextNotice(now) {
    var id = ui.noticeQueue.shift();
    ui.notice = id ? { id: id, start: now, until: now + TU.notice.durationMs, fadeIn: TU.notice.fadeInMs, fadeOut: TU.notice.fadeOutMs, out: null } : null;
    show(els.notice, !!id);
    if (!id) return;
    applyNoticeOpacity(now);
    drawNotice(els.noticeArt, id);
    var text = 'ITEM RECEIVED: ' + port().item(id).name;
    els.notice.dataset.item = id;
    els.notice.dataset.text = text;
    els.notice.setAttribute('aria-label', text);
  }

  G.notifyItem = function (id) {
    ui.noticeLog.push(id);
    ui.noticeQueue.push(id);
    if (!ui.notice) showNextNotice(performance.now());
  };
  // A click: the fade-out starts now, from the current opacity, at the fade-out's own rate. A slip
  // already leaving early is left to finish.
  G.dismissNotice = function () {
    var n = ui.notice;
    if (!n || n.out) return;
    var now = performance.now();
    var from = noticeOpacity(n, now);
    n.out = { at: now, from: from };
    n.until = now + n.fadeOut * from;
    if (now >= n.until) return finishNotice(now);
    applyNoticeOpacity(now);
  };
  // The slip has faded out: remove it, and the next queued slip (if any) starts its own fade-in.
  function finishNotice(now) {
    ui.notice = null;
    showNextNotice(now);
  }
  G.clearNotices = function () {
    ui.noticeQueue = [];
    ui.notice = null;
    if (els.notice) {
      show(els.notice, false);
      els.notice.style.opacity = '';
    }
  };
  G.noticeTick = function (now) {
    if (!ui.notice) return;
    if (now >= ui.notice.until) finishNotice(now);
    else applyNoticeOpacity(now);
  };

  G.renderObjective = renderObjective;

  G.renderAll = function () {
    var now = performance.now();
    renderSpeech();
    renderChoices(now);
    renderInventory();
    renderUtility();
    renderInspector();
    renderOverlay();
    renderObjective();
  };

  // Rebuilds the stage from the current G.layout / G.TUNING and redraws it exactly where the game
  // is: the history, the choices, the inventory, the inspector, NOTES/FILES, the slip and the
  // tooltip on show all stay. The game never calls it; the polish lab does, so a value it changes
  // shows at once (tools/m2-reception-polish-lab, docs/62).
  G.rebuildStage = function () {
    clearTimeout(tipTimer);
    tipTimer = null;
    var tip = ui.tooltip;
    stage.replaceChildren();
    Object.keys(els).forEach(function (k) { delete els[k]; });
    els.slots = [];
    els.cards = [];
    els.utility = [];
    G.buildStage();
    // The history rewraps to the (maybe new) width; the newest line keeps its place.
    var s = ui.speech;
    rewrap();
    var first = 0;
    while (first < s.lines.length && s.lines[first].part !== s.parts.length - 1) first++;
    s.newRow = first;
    s.base = charsBefore(s.lines, first);
    if (!s.typing) s.revealed = charsBefore(s.lines, s.lines.length);
    s.scrollLine = clamp(s.scrollLine, 0, speechMaxScroll());
    ui.cards = G.layoutCards(ui.cards);
    ui.choiceScroll = clamp(ui.choiceScroll, 0, choiceMaxScroll());
    G.renderAll();
    if (ui.notice) {
      show(els.notice, true);
      drawNotice(els.noticeArt, ui.notice.id);
      els.notice.dataset.item = ui.notice.id;
      els.notice.dataset.text = 'ITEM RECEIVED: ' + port().item(ui.notice.id).name;
      els.notice.setAttribute('aria-label', els.notice.dataset.text);
      applyNoticeOpacity(performance.now());
    }
    ui.tooltip = null;
    if (tip) G.showTooltip(tip.index, tip.text);
  };

  G.buildStage = function () {
    stage = document.getElementById('stage');
    buildApertures();
    var shell = keptImg('shell', '', stage, { id: 'shell', src: G.url('art/ui/shell/layout-final.png'), width: '1920', height: '1080', alt: '', draggable: 'false' });
    shell.style.position = 'absolute';
    buildSpeech();
    buildChoices();
    buildThumb();
    buildInventory();
    buildUtility();
    buildObjective();
    buildInspector();
    buildNotice();
  };
})();
