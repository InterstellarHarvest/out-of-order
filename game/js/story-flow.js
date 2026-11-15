// The flow for an imported story (docs/84; docs/72 section 3.4): the same phase machine as the
// reception's js/flow.js, driven by the story-v2 rules (Rules.begin / step / view and the events a
// step returns) instead of the v1 functions.
//
//   typing -> beat -> arriving -> choosing -> sending -> [reply-beat] -> [transition] -> typing ...
//
//   typing      the newest text types on its surface: the dialogue box, the Narrative B narration
//               or the Focus A description (click / Enter / Space finishes it)
//   beat        a pause, then the cards: the node's choices, or a presentation-only CONTINUE when a
//               B passage has more paragraph groups or an A description more pages
//   arriving    cards slide in; choosing: the only phase that takes a card, an item or a verb
//   sending     a spoken card is sent (it rises behind the divider); an action, CONTINUE or system
//               card, or SHOW / USE, clears every card
//   reply-beat  after the player's own line (the echo) is in the dialogue box
//   transition  the mode, scene or chapter changes: a short fade, art preloaded first
//
// Everything that happens is decided by js/rules.js. This file presents its events in order, saves
// after every committed step (story.save; ?nosave / ?new for development), and restores or
// migrates a save on load. It never holds narrative text of its own.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var Rules = window.CYOA_RULES;
  var F = { phase: 'boot', story: true };
  var story = null;
  var queue = [];
  var timer = null;
  var sliding = false;
  var shown = 0; // transcript entries presented so far (the save cursor)
  var group = null; // B CONTINUE groups still to present: { texts, groups, next }
  var after = null; // what the current typing / motion leads to
  var storageKey = null;
  var saving = true;

  // The port js/stage.js reads the story through (story-v2) -------------------------------------
  function view() { return Rules.view(story, G.state); }
  function itemView(id) { return view().items.filter(function (x) { return x.id === id; })[0] || { read: false, show: false, use: false }; }
  // Installed only when this flow starts (an imported story); the reception keeps the v1 port.
  var PORT = {
    item: function (id) { return story.items[id]; },
    itemActions: function (id) { var v = itemView(id); return { read: v.read, show: v.show, use: v.use }; },
    description: function (id) { return Rules.describe(story, G.state, id); },
    contextAction: function () { var c = view().context; return c && { glyph: c.glyph, label: c.label, spentWhy: c.spentWhy }; },
    contextSpent: function () { var c = view().context; return !!(c && c.spent); },
    files: function () { return view().files; },
    notesTitle: 'NOTES',
    // NOTES: the whole playthrough (owner lock [76]): narration in the Dialogue face; speech as
    // NAME: / YOU: lines as in the reception; the player's actions under YOU: in the Choices face.
    notes: function (add) {
      var last = null;
      G.state.transcript.forEach(function (e, i) {
        var lead = i === 0 ? 18 : 14;
        var runs = e.runs;
        if (!runs.length) return;
        if (e.mode !== 'dialogue') { last = null; return add(G.narrationText(runs), 'dialogue', lead); }
        dialogueParts(runs).forEach(function (p, k) {
          var who = p.who === 'npc' ? speakerName(e) : 'YOU';
          if (p.who === 'thought') { last = null; return add(G.thoughtText(p.text), 'choices', k ? 4 : lead); }
          if (who !== last) add(who + ':', 'labels', k ? 8 : lead);
          last = who;
          add(p.text, p.who === 'npc' ? 'dialogue' : 'choices', 4);
        });
      });
    }
  };
  function speakerName(e) {
    var n = story.chapters[e.chapter] && story.chapters[e.chapter].nodes[e.node];
    return n && n.speaker && story.cast[n.speaker] ? story.cast[n.speaker].name : '';
  }

  // A dialogue paragraph's runs as dialogue-box parts: consecutive runs of one style are one part.
  // NPC speech and directions in the Dialogue face; the player's speech in the Choices face; the
  // player's actions in the Choices face and the action ink (docs/70 section 1).
  function styleOf(r) {
    if (r.role === 'thought') return 'thought';
    if (r.role === 'action') return 'action';
    if (r.role === 'speech' && r.who === 'you') return 'player';
    return 'npc';
  }
  function dialogueParts(runs) {
    var out = [];
    runs.forEach(function (r) {
      var who = styleOf(r);
      var lastPart = out[out.length - 1];
      if (lastPart && lastPart.who === who) lastPart.text += ' ' + r.text;
      else out.push({ text: r.text, who: who });
    });
    return out;
  }

  // Phases and timers -----------------------------------------------------------------------------
  function setPhase(p) {
    F.phase = p;
    document.body.dataset.phase = p;
    G.renderUtility();
  }
  function later(ms, fn) {
    timer = { at: performance.now() + ms, fn: fn };
  }
  function failed(err) {
    document.body.dataset.ready = 'error';
    document.body.dataset.error = err && err.message ? err.message : String(err);
    console.error(err);
  }

  // Saves ---------------------------------------------------------------------------------------
  function storage() {
    try { return window.localStorage; } catch (e) { return null; }
  }
  function save() {
    if (!saving || !story.save) return;
    var ls = storage();
    if (!ls) return;
    try { ls.setItem(storageKey, Rules.serialize(story, G.state, { presented: shown })); } catch (e) { /* storage full or blocked */ }
  }
  // { state, cursor, how } from the autosave, or null for a fresh start. A save that does not fit
  // this content is never loaded: it is kept aside under a separate key and the reason reported.
  function loadSave() {
    var q = location.search;
    var ls = storage();
    document.body.dataset.save = 'new';
    if (!story.save || /[?&]nosave\b/.test(q)) { saving = !!story.save && !/[?&]nosave\b/.test(q); document.body.dataset.save = 'off'; return null; }
    if (!ls) { document.body.dataset.save = 'unavailable'; return null; }
    var raw = null;
    try { raw = ls.getItem(storageKey); } catch (e) { raw = null; }
    if (/[?&]new\b/.test(q)) { try { ls.removeItem(storageKey); } catch (e) { /* ignore */ } return null; }
    if (!raw) return null;
    var r = Rules.migrate(story, raw);
    if (!r.ok) {
      try { ls.setItem(storageKey + ':refused', raw); ls.removeItem(storageKey); } catch (e) { /* ignore */ }
      document.body.dataset.save = 'refused';
      document.body.dataset.saveReason = r.reason;
      console.warn('Saved game not loaded: ' + r.reason + ' (kept as ' + storageKey + ':refused). Starting fresh.');
      return null;
    }
    document.body.dataset.save = r.migrated ? 'migrated' : 'restored';
    if (r.migrated) console.info('Saved game carried over from content version ' + r.migrated.from + ' to ' + r.migrated.to + (r.migrated.notes.length ? ': ' + r.migrated.notes.join(', ') : ''));
    return r;
  }

  // Presenting the current node -------------------------------------------------------------------
  function sceneLabel(id) { return id; }
  // Apertures and surface for the state as it stands (the view), with the history windows filled
  // with everything already presented (transcript entries before `shown`).
  // The apertures alone, for the node as it stands: a node in the same scene and mode can still
  // change the portrait (another pose or backdrop) or the close-up.
  function applyArt(v) {
    G.setSceneArt(G.artKey.scene(v.scene), sceneLabel(v.scene));
    if (v.mode === 'dialogue') {
      G.setPortraitArt({ background: G.artKey.background(v.portrait.id, v.portrait.background), pose: G.artKey.pose(v.portrait.id, v.portrait.pose), label: story.cast[v.speaker].name });
    } else if (v.mode === 'focus') {
      G.setPortraitArt({ focus: G.artKey.focus(v.focus), label: v.focus });
    } else {
      G.setPortraitArt(null);
    }
  }
  function applyView(v) {
    applyArt(v);
    var t = G.state.transcript;
    var idx = v.history[v.mode].filter(function (i) { return i < shown; });
    if (v.mode === 'dialogue') {
      G.clearSpeech();
      var parts = [];
      idx.forEach(function (i) { parts = parts.concat(dialogueParts(t[i].runs)); });
      G.addSpeechParts(parts, { instant: true });
      G.surfaces.show(null);
    } else if (v.mode === 'narrative') {
      G.surfaces.setB(idx.map(function (i) { return G.narrationText(t[i].runs); }));
      G.surfaces.show('narrative');
    } else {
      G.surfaces.setA(idx.map(function (i) { return G.narrationText(t[i].runs); }));
      G.surfaces.show('focus');
    }
    document.body.dataset.node = v.chapter + ':' + v.node;
    document.body.dataset.scene = v.scene;
    G.surfaces.draftStamp(v.chapter);
    G.renderAll();
  }

  // The event queue -------------------------------------------------------------------------------
  function run(events) {
    queue = events.slice();
    next();
  }
  function next() {
    if (!queue.length) return beat();
    var ev = queue.shift();
    switch (ev.t) {
      case 'check': // hidden in v0 (docs/72 section 5.1): the outcome is narrated
      case 'end':
        return next();
      case 'items':
        ev.gained.forEach(function (id) { G.notifyItem(id); });
        if (G.ui.inspector && ev.lost.indexOf(G.ui.inspector.id) !== -1) G.ui.inspector = null;
        G.renderAll();
        return next();
      case 'objective':
        G.renderObjective();
        return next();
      case 'restart':
        G.clearNotices();
        G.ui.inspector = null;
        G.ui.overlay = null;
        G.ui.inv.start = 0;
        shown = 0;
        return next();
      case 'chapter':
      case 'scene':
      case 'mode':
        return transition(ev);
      case 'echo':
        G.addSpeechParts(ev.paras.reduce(function (a, p) { return a.concat(dialogueParts(p)); }, []));
        shown += ev.paras.length;
        setPhase('reply-beat');
        return later(G.layout.choices.feedback.send.beatMs, next);
      case 'text':
        applyArt(view());
        return present(ev);
      default:
        return next();
    }
  }

  // Mode, scene or chapter changes (consecutive ones are one transition): the next chapter's art is
  // decoded first, then a short fade out, the view applied, a fade in.
  function transition(first) {
    var chapter = first.t === 'chapter' ? first.id : null;
    while (queue[0] && ['chapter', 'scene', 'mode'].indexOf(queue[0].t) !== -1) {
      var e = queue.shift();
      if (e.t === 'chapter') chapter = e.id;
    }
    setPhase('transition');
    var ms = G.TUNING.story.transitionMs;
    var ready = chapter ? G.preloadChapter(chapter) : Promise.resolve();
    ready.then(function () {
      fade(1, 0, ms / 2, function () {
        applyView(view());
        fade(0, 1, ms / 2, next);
      });
    }, failed);
  }
  var fading = null;
  function fade(from, to, ms, done) {
    fading = { from: from, to: to, start: performance.now(), ms: Math.max(1, ms), done: done };
  }
  function fadeTick(now) {
    if (!fading) return;
    var u = Math.min(1, (now - fading.start) / fading.ms);
    var o = fading.from + (fading.to - fading.from) * u;
    ['scene', 'portrait', 'narrativeLayer', 'focusLayer'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.style.opacity = o >= 1 ? '' : String(o);
    });
    if (u >= 1) {
      var d = fading.done;
      fading = null;
      d();
    }
  }

  // A text event: on its surface, typed. A B passage longer than the panel comes in CONTINUE groups.
  function present(ev) {
    var mode = G.surfaces.mode() || 'dialogue';
    var surface = ev.surface;
    if (surface !== (mode === 'dialogue' ? 'dialogue' : mode)) {
      // Text for a surface that is not on show (cannot happen with rules-ordered events; kept safe).
      shown += ev.paras.length;
      return next();
    }
    if (surface === 'dialogue') {
      G.addSpeechParts(ev.paras.reduce(function (a, p) { return a.concat(dialogueParts(p)); }, []));
      shown += ev.paras.length;
      after = next;
      return setPhase('typing');
    }
    var texts = ev.paras.map(G.narrationText);
    shown += ev.paras.length;
    if (surface === 'focus') {
      G.surfaces.appendA(texts);
      after = afterFocusPage;
      return setPhase('typing');
    }
    texts = texts.filter(function (t) { return t !== ''; });
    var groups = G.surfaces.groupsB(texts);
    group = { texts: texts, groups: groups, next: 1 };
    G.surfaces.appendB(groups[0].map(function (i) { return texts[i]; }));
    after = afterGroup;
    setPhase('typing');
  }
  function afterGroup() {
    if (group && group.next < group.groups.length) return continueCard();
    group = null;
    next();
  }
  function afterFocusPage() {
    if (G.surfaces.hasMoreA()) return continueCard();
    next();
  }
  // A presentation-only CONTINUE (never a rules step, never saved).
  function continueCard() {
    setPhase('beat');
    later(G.TUNING.timing.beforeChoicesMs, function () {
      G.setChoices([{ id: '__continue', kind: 'continue', text: 'CONTINUE', presentation: true }], { kind: 'in', start: performance.now() });
      setPhase('arriving');
    });
  }
  function takeContinue() {
    if (group && group.next < group.groups.length) {
      var g = group.groups[group.next++];
      G.surfaces.appendB(g.map(function (i) { return group.texts[i]; }));
      after = afterGroup;
    } else {
      G.surfaces.nextPageA();
      after = afterFocusPage;
    }
    setPhase('typing');
  }

  function typingDone() {
    var fn = after;
    after = null;
    if (fn) fn();
  }
  F.skip = function () {
    if (F.phase !== 'typing') return;
    if (G.surfaces.mode()) G.surfaces.finish();
    else G.finishTyping();
    typingDone();
  };

  // The node's choices, after the beat.
  function beat() {
    setPhase('beat');
    later(G.TUNING.timing.beforeChoicesMs, presentCards);
  }
  function presentCards() {
    document.body.dataset.node = G.state.chapter + ':' + G.state.node;
    var cards = view().cards.map(function (c) { return { id: c.id, kind: c.kind, text: c.text }; });
    G.setChoices(cards, { kind: 'in', start: performance.now() });
    setPhase('arriving');
  }
  function ready() {
    G.ui.thumbOn = true;
    setPhase('choosing');
    G.renderChoices(performance.now());
    G.focusCard(0);
  }

  // Taking a card ---------------------------------------------------------------------------------
  var pendingEvents = null;
  F.choose = function (index) {
    if (F.phase !== 'choosing' || G.ui.inspector) return;
    var card = G.ui.cards[index];
    if (!card) return;
    G.ui.thumbOn = false;
    if (card.id === '__continue') {
      pendingEvents = null;
      G.ui.motion = { kind: 'clear', start: performance.now() };
    } else {
      commit({ choice: card.id });
      G.ui.motion = card.kind === 'spoken' ? { kind: 'send', index: index, start: performance.now() } : { kind: 'clear', start: performance.now() };
    }
    setPhase('sending');
    G.renderChoices(performance.now());
  };
  // One committed rules step: the new state replaces the old at once and is saved; its events are
  // presented once the cards have gone.
  function commit(input) {
    var r = Rules.step(story, G.state, input);
    G.state = r.state;
    pendingEvents = r.events;
    save();
    return r;
  }
  function delivered() {
    G.setChoices([]);
    if (!pendingEvents) return takeContinue();
    var ev = pendingEvents;
    pendingEvents = null;
    run(ev);
  }

  // Items -----------------------------------------------------------------------------------------
  F.toggleInspect = function (id) {
    if (F.phase !== 'choosing') return;
    if (G.ui.inspector && G.ui.inspector.id === id) F.closeInspector();
    else openInspector(id);
  };
  function openInspector(id) {
    var r = commit({ item: id, verb: 'inspect' });
    pendingEvents = null;
    G.ui.inspector = { id: id, scroll: 0, height: 0 };
    G.hideTooltip();
    // Opening an item can change things (a sealed box unpacks): its slips and inventory now.
    r.events.forEach(function (ev) {
      if (ev.t === 'items') {
        ev.gained.forEach(function (x) { G.notifyItem(x); });
        if (ev.lost.indexOf(id) !== -1) G.ui.inspector = null;
      }
    });
    G.renderAll();
    if (!G.ui.inspector) return refreshCards();
    var first = G.utilityActions()[0].enabled ? 'util-0' : 'inspectClose';
    document.getElementById(first).focus({ preventScroll: true });
  }
  // The choices on show, re-read: a new set arrives as any set does; the same set stays.
  function refreshCards() {
    if (F.phase !== 'choosing') return;
    var now = view().cards.map(function (c) { return c.id; }).join();
    var was = G.ui.cards.map(function (c) { return c.id; }).join();
    if (now !== was && G.ui.cards[0] && G.ui.cards[0].id !== '__continue') {
      G.ui.thumbOn = false;
      presentCards();
    } else {
      G.focusCard(0);
    }
  }
  F.closeInspector = function () {
    if (!G.ui.inspector) return;
    G.ui.inspector = null;
    G.renderAll();
    refreshCards();
  };

  F.utility = function (action) {
    if (action === 'notes' || action === 'files') {
      G.ui.overlay = G.ui.overlay === action ? null : action;
      G.ui.overlayScroll = action === 'notes' ? 1e9 : 0;
      G.renderOverlay();
      if (G.ui.overlay) G.els.overlay.focus({ preventScroll: true });
      return;
    }
    if (F.phase !== 'choosing') return;
    if (action === 'context') {
      if (G.ui.inspector || PORT.contextSpent() || !PORT.contextAction()) return;
      var r = commit({ context: true });
      pendingEvents = null;
      r.events.forEach(function (ev) {
        if (ev.t === 'text') {
          G.addSpeechParts(ev.paras.reduce(function (a, p) { return a.concat(dialogueParts(p)); }, []));
          shown += ev.paras.length;
        }
      });
      G.renderUtility();
      G.renderOverlay();
      return;
    }
    if (!G.ui.inspector) return;
    var id = G.ui.inspector.id;
    if (action === 'read') {
      var rr = commit({ item: id, verb: 'read' });
      pendingEvents = null;
      rr.events.forEach(function (ev) { if (ev.t === 'items') ev.gained.forEach(function (x) { G.notifyItem(x); }); });
      G.renderAll();
      return;
    }
    if (action === 'show' || action === 'use') {
      commit({ item: id, verb: action });
      G.ui.inspector = null;
      G.ui.thumbOn = false;
      G.ui.motion = { kind: 'clear', start: performance.now() };
      setPhase('sending');
      G.renderAll();
    }
  };

  // Frame loop ------------------------------------------------------------------------------------
  function tick(now) {
    G.noticeTick(now);
    fadeTick(now);
    if (F.phase === 'typing') {
      var done = G.surfaces.mode() ? G.surfaces.typeTick(now) : G.typeTick(now);
      if (done) typingDone();
    }
    if (timer && now >= timer.at) {
      var fn = timer.fn;
      timer = null;
      fn();
    }
    if (G.ui.motion) {
      G.renderChoices(now);
      if (G.motionDone(now)) {
        G.ui.motion = null;
        if (F.phase === 'arriving') ready();
        else if (F.phase === 'sending') delivered();
      }
    }
    var busy = G.inventoryBusy(now);
    if (busy || sliding) G.renderInventory();
    sliding = busy;
    requestAnimationFrame(tick);
  }

  F.syncInventory = function () {};

  // Start: a saved game (restored, or carried over from an earlier content revision), or a new one.
  F.start = function () {
    story = G.story;
    G.port = PORT;
    storageKey = 'cyoa-save:' + story.id;
    var loaded = loadSave();
    var events;
    if (loaded) {
      G.state = loaded.state;
      var res = Rules.resume(story, G.state, loaded.cursor);
      shown = res.from;
      events = res.events;
    } else {
      var b = Rules.begin(story, { seed: freshSeed() });
      G.state = b.state;
      shown = 0;
      // The opening's chapter / scene / mode are set up directly, without a fade.
      events = b.events.filter(function (e) { return ['chapter', 'scene', 'mode'].indexOf(e.t) === -1; });
      save();
    }
    return G.preloadChapter(G.state.chapter).then(function () {
      applyView(view());
      requestAnimationFrame(tick);
      run(events);
    });
  };
  F.begin = F.start;
  // A fresh seed per playthrough (docs/72 section 5.1); ?seed=<x> fixes it for QA.
  function freshSeed() {
    var m = /[?&]seed=([a-z0-9]+)/i.exec(location.search);
    if (m) return m[1];
    try {
      var a = new Uint32Array(2);
      window.crypto.getRandomValues(a);
      return a[0].toString(36) + a[1].toString(36);
    } catch (e) {
      return String(Date.now());
    }
  }

  // QA only: the rules state and the view, read-only.
  F.view = view;

  document.addEventListener('keydown', function (e) {
    if (G.flow !== F) return;
    if (e.key === 'Escape') {
      if (G.ui.inspector) F.closeInspector();
      else if (G.ui.overlay) F.utility(G.ui.overlay);
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && F.phase === 'typing' && !e.target.closest('button')) {
      e.preventDefault();
      F.skip();
    }
  });

  G.storyFlow = F;
})();
