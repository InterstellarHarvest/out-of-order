// Boot: load every image the slice draws, build the stage, fit it to the window, start the flow.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var scale = 1;

  G.viewScale = function () {
    return scale;
  };

  // The 1920x1080 stage, scaled down to fit the window (never up), centred.
  function fit() {
    var frame = document.getElementById('stageFrame');
    var stage = document.getElementById('stage');
    scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1);
    stage.style.transform = scale === 1 ? '' : 'scale(' + scale + ')';
    frame.style.width = Math.floor(1920 * scale) + 'px';
    frame.style.height = Math.floor(1080 * scale) + 'px';
  }

  // QA only (?qa in the URL): read-only access to state, and items to overflow the inventory.
  function qaHooks() {
    if (!/[?&]qa\b/.test(location.search)) return;
    G.debug = {
      addItems: function (n) {
        for (var i = 1; i <= n; i++) {
          var id = 'qa_item_' + i;
          G.content.items[id] = { name: 'QA ' + i, slotArt: null, description: 'QA OVERFLOW ITEM ' + i + '. NOT PART OF THE SLICE.' };
          if (G.state.inventory.indexOf(id) === -1) G.state.inventory.push(id);
        }
        G.flow.syncInventory();
        G.renderAll();
      }
    };
  }

  // Story art (engine S3, docs/72 section 4, docs/83). The game still plays the reception on the
  // v1 rules (js/flow.js) until S4; its story-v2 form (Rules.fromV1) supplies only the asset
  // declaration, which is the one copy of the reception's art paths. Boot (below) sets G.story and
  // js/stage.js registers its art as G.ART.

  // The decode list for registry keys. A null path (a fixture's DEV PLACEHOLDER) is never
  // requested; a key the registry does not hold is an error.
  function artList(keys, reg) {
    var missing = keys.filter(function (k) { return !reg[k]; });
    if (missing.length) throw new Error('Unregistered art: ' + missing.join(', '));
    return keys.filter(function (k) { return reg[k].path !== null; })
      .map(function (k) { return { name: k, url: G.url(reg[k].path) }; });
  }

  // Chapter preload: decodes every image chapter `chapterId` of `story` (default G.story) shows,
  // before it is presented, reusing whatever is already decoded. Resolves with
  // { story, chapter, keys, placeholders, requested, reused }; rejects with a clear error for an
  // unknown chapter, unregistered art or an image that cannot load (err.failures lists each one).
  // It only loads: nothing on the stage changes. S4's chapter transition will call it for the
  // next chapter; boot decodes the opening chapter's same list inside its one G.loadImages call.
  G.preloadChapter = function (chapterId, story) {
    var s = story || G.story;
    try {
      var reg = s === G.story ? G.ART : G.artRegistry(s);
      var keys = G.chapterArtKeys(s, chapterId);
      var list = artList(keys, reg);
    } catch (e) {
      return Promise.reject(e);
    }
    return G.decodeImages(list).then(function (r) {
      return {
        story: s.id, chapter: chapterId, keys: keys,
        placeholders: keys.filter(function (k) { return reg[k].path === null; }),
        requested: r.requested, reused: r.reused
      };
    });
  };

  // The boot list: everything the stage draws, decoded in the one G.loadImages call (with the
  // sprite package and fonts) before the stage is built, so ready never comes with art still to
  // appear. Item art comes from G.ART; the opening chapter's art is exactly what
  // G.preloadChapter(G.story.start) would decode.
  function bootList() {
    var itemKeys = G.itemArtKeys(G.story);
    var byClass = function (cls) { return itemKeys.filter(function (k) { return G.ART[k].cls === cls; }); };
    // Item slot art first, as before.
    var items = artList(byClass('slot'), G.ART);

    // The opening chapter's art: for the reception, its scene and the layered receptionist
    // portrait (js/stage.js).
    items = items.concat(artList(G.chapterArtKeys(G.story, G.story.start), G.ART));

    // The item-received slip (js/stage.js, docs/61).
    items.push({ name: G.NOTICE_ART.slip.image, url: G.url(G.NOTICE_ART.slip.path) });

    // The NOTES and FILES panels (js/stage.js, docs/60, docs/63): each overlay's own, as chosen.
    ['notes', 'files'].forEach(function (kind) {
      var art = G.OVERLAY_ART[G.overlayPanelKey(kind)];
      items.push({ name: art.image, url: G.url(art.path) });
    });

    // Approved item inspect art (an item's own `inspectArt`, if any) and the inspector's one
    // static X sprite (js/stage.js), decoded before ready like everything else.
    items = items.concat(artList(byClass('inspect'), G.ART));
    Object.keys(G.INSPECTOR_ART).forEach(function (k) {
      items.push({ name: G.INSPECTOR_ART[k].image, url: G.url(G.INSPECTOR_ART[k].path) });
    });

    // An imported story's Narrative B overlay (js/surfaces.js), decoded before ready like the rest.
    if (G.storyMode) items.push({ name: G.NARRATIVE_ART.image, url: G.url(G.NARRATIVE_ART.path) });

    // Glyphs are also drawn to canvas for their inactive treatment, so they are decoded up front:
    // NOTES, FILES, the inspector's READ / USE / SHOW, and every context action's glyph named in
    // the content (docs/64; reception: watch).
    var glyphs = ['notes', 'files', 'read', 'use', 'show_badge'];
    var actions = [];
    if (G.storyMode) {
      actions.push(G.story.contextAction);
      Object.keys(G.story.chapters).forEach(function (c) {
        var ns = G.story.chapters[c].nodes;
        Object.keys(ns).forEach(function (id) { actions.push(ns[id].contextAction); });
      });
    } else {
      actions = [G.content.contextAction].concat(Object.keys(G.content.nodes).map(function (id) { return G.content.nodes[id].contextAction; }));
    }
    actions.forEach(function (a) { if (a && glyphs.indexOf(a.glyph) === -1) glyphs.push(a.glyph); });
    glyphs.forEach(function (g) {
      items.push({ name: 'glyph:' + g, url: G.glyphUrl(g) });
    });
    return items;
  }

  function failed(err) {
    document.body.dataset.ready = 'error';
    document.body.dataset.error = err.message;
    throw err;
  }

  // Which story plays (docs/84): the imported one (game/content/story.generated.js, built from the
  // storyboard JSON by tools/story-import) by default; the M2 reception slice, the regression
  // fixture, with ?story=reception, or on any page that does not load generated content (the
  // polish lab). The reception keeps its own v1 flow (js/flow.js) exactly as before.
  G.storyMode = !!window.CYOA_STORY && !/[?&]story=reception\b/.test(location.search);

  var list;
  try {
    if (G.storyMode) {
      G.story = window.CYOA_STORY;
      G.storyBuild = window.CYOA_STORY_BUILD || null;
      G.flow = G.storyFlow;
      document.body.dataset.story = G.story.id;
      document.body.dataset.content = G.storyBuild ? G.storyBuild.contentHash.slice(0, 12) : '';
      document.body.dataset.channel = G.storyBuild ? G.storyBuild.channel : '';
    } else {
      G.story = G.rules.fromV1(G.content);
      document.body.dataset.story = 'reception';
    }
    G.registerArt(G.story);
    list = bootList();
  } catch (err) {
    failed(err);
  }
  G.loadImages(list).then(function () {
    G.buildStage();
    fit();
    window.addEventListener('resize', fit);
    qaHooks();
    return Promise.resolve(G.flow.start()).then(function () {
      document.body.dataset.ready = 'true';
    });
  }).catch(failed);
})();
