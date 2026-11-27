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
  // Restore points for the review-gated death controls (docs/96): tracked ONLY when the ending
  // presentation's gate is on. Off (the default), nothing is tracked and saves are exactly as before.
  var tracking = false;
  var points = null;

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
          var who = p.who === 'npc' ? (p.label || speakerName(e)) : 'YOU';
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
  // An incidental voice (docs/104 section 4: a cast member with no portrait, e.g. a passer-by or a
  // machine announcer) speaking inside another speaker's conversation is attributed by name, so its
  // line never reads as the portrait speaker's. Portrait speakers are never labelled (unchanged).
  function voiceOf(r) {
    var c = r.role === 'speech' && r.who && r.who !== 'you' ? story.cast[r.who] : null;
    return c && !c.portrait ? r.who : null;
  }
  function dialogueParts(runs) {
    var out = [];
    runs.forEach(function (r) {
      var who = styleOf(r);
      var voice = voiceOf(r);
      var lastPart = out[out.length - 1];
      if (lastPart && lastPart.who === who && (lastPart.voice || null) === voice) lastPart.text += ' ' + r.text;
      else out.push(voice ? { text: r.text, who: who, voice: voice, label: story.cast[voice].name } : { text: r.text, who: who });
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
    // One write: the state, its cursor and (when tracked) its restore points, atomically together.
    try { ls.setItem(storageKey, Rules.serialize(story, G.state, { presented: shown, points: tracking ? points : undefined })); } catch (e) { /* storage full or blocked */ }
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
  // Everything here comes from the view (js/rules.js): the scene or the opaque alternate its state
  // selects, at most one overlay (docs/92 section 3), the portrait as layers or as one complete
  // view (section 1), and a paged close-up's picture for the semantic page on show (section 2).
  // It is called again whenever what is presented can change (a node's text, a Focus A page, an
  // item or context step in place, a transition, a restore), and re-derives everything each time:
  // nothing art-related is remembered, so no layer can go stale.
  // Conditional art (game issue #27; public docs/152 section 4) ---------------------------------------
  // Rules.artAt decides; the flow tells it which authored text beats have been presented: everything the
  // transcript holds before the passage now typing, and, within that passage, the beats its typed text has
  // already revealed. So a state appears when its words are typed, never earlier, and a reload or replay
  // presents it at exactly the same words.
  var beats = { step: -1, reached: {} };
  var norm = function (t) { return String(t).replace(/\s+/g, ''); };
  function beatsHere() {
    var out = [], w = G.state.chapter + ':' + G.state.node;
    var all = (story.assets && story.assets.artStates) || {};
    Object.keys(all).forEach(function (sk) {
      all[sk].forEach(function (st) {
        if (st.at.indexOf(w) !== -1) ['beat', 'until'].forEach(function (k) { if (st[k] !== undefined && out.indexOf(st[k]) === -1) out.push(st[k]); });
        if (st.after && st.after.node === w && out.indexOf(st.after.beat) === -1) out.push(st.after.beat);
      });
    });
    return out;
  }
  function typedNow() {
    if (F.phase !== 'typing') return '';
    return G.surfaces.mode() ? G.surfaces.revealedNew() : G.speechRevealedNew();
  }
  // Notes the beats the passage now typing has revealed; true when one was newly reached.
  function checkBeats() {
    if (beats.step !== G.state.steps) beats = { step: G.state.steps, reached: {} };
    var typed = norm(typedNow());
    if (!typed) return false;
    var grew = false;
    // A beat is reached as its opening words appear (its first 12 letters; the validator proves them unique in the node).
    beatsHere().forEach(function (b) { if (!beats.reached[b] && typed.indexOf(norm(b).slice(0, 12)) !== -1) { beats.reached[b] = true; grew = true; } });
    return grew;
  }
  var typingFrom = 0; // transcript index of the first paragraph of the passage now typing
  function presented() {
    var t = G.state.transcript, here = G.state.chapter + ':' + G.state.node;
    var limit = Math.min(t.length, F.phase === 'typing' ? typingFrom : shown);
    if (beats.step !== G.state.steps) beats = { step: G.state.steps, reached: {} };
    return function (nodeKey, text) {
      if (nodeKey === here && beats.reached[text]) return true;
      for (var i = 0; i < limit; i++) {
        var e = t[i];
        if (e.src === 'text' && e.chapter + ':' + e.node === nodeKey && e.runs.some(function (r) { return r.text.indexOf(text) === 0; })) return true;
      }
      return false;
    };
  }
  function condKey(surfaceKey, sel) {
    if (!sel || !sel.id) return null;
    var st = story.assets.artStates[surfaceKey].filter(function (x) { return x.id === sel.id; })[0];
    return G.artKey.artState(surfaceKey, st.ref);
  }
  function condRegions(surfaceKey, sel) {
    return (sel && sel.regions || []).map(function (id) {
      var st = story.assets.artStates[surfaceKey].filter(function (x) { return x.id === id; })[0];
      return { key: G.artKey.artState(surfaceKey, st.ref), rect: st.region };
    });
  }

  function applyArt(v) {
    var sa = v.sceneArt || {};
    var cond = story.assets && story.assets.artStates ? Rules.artAt(story, G.state, presented()) : null;
    if (v.sceneHeld !== undefined) {
      // docs/137 C1: a text-led scene keeps the previous scene image exactly as it is on screen. Only a
      // cold load (nothing of the held scene showing yet) draws the held scene's own image.
      var shownArt = document.getElementById('scene') && document.getElementById('scene').dataset.art || '';
      var heldKey = v.sceneHeld ? G.artKey.scene(v.sceneHeld) : null;
      var showing = heldKey && (shownArt === heldKey || shownArt.indexOf(heldKey + '#') === 0 || shownArt.indexOf(heldKey + ' + ') === 0);
      if (heldKey && !showing) {
        G.setSceneArt(G.artKey.scene(v.sceneHeld), sceneLabel(v.sceneHeld), null);
      }
    } else {
      var sk = 'scene:' + v.scene;
      var condScene = cond && condKey(sk, cond.scene);
      G.setSceneArt(condScene || (sa.replace ? G.artKey.sceneState(v.scene, sa.replace) : G.artKey.scene(v.scene)), sceneLabel(v.scene),
        sa.overlay ? G.artKey.sceneState(v.scene, sa.overlay) : null);
      G.setSceneRegions(cond ? condRegions(sk, cond.scene) : []);
    }
    if (v.mode === 'dialogue') {
      var label = story.cast[v.speaker].name;
      if (v.portrait.view) G.setPortraitArt({ view: G.artKey.view(v.portrait.id, v.portrait.view), label: label });
      else {
        var bk = 'background:' + v.portrait.background;
        G.setPortraitArt({ background: (cond && condKey(bk, cond.background)) || G.artKey.background(v.portrait.id, v.portrait.background),
          backgroundRegions: cond ? condRegions(bk, cond.background) : [], pose: G.artKey.pose(v.portrait.id, v.portrait.pose), label: label });
      }
    } else if (v.mode === 'focus') {
      var pages = focusPages(v.focus);
      var fk = 'focus:' + v.focus;
      var key = (cond && condKey(fk, cond.focus)) || (pages ? G.artKey.focusPage(v.focus, Math.min(G.surfaces.segmentA(), pages.length - 1) + 1) : G.artKey.focus(v.focus));
      G.setPortraitArt({ focus: key, label: v.focus });
    } else {
      G.setPortraitArt(null);
    }
  }
  function focusPages(id) {
    var f = story.assets.focus[id];
    return f && typeof f === 'object' ? f.pages : null;
  }
  // Where each semantic page of a paged close-up starts, in the visit's paragraphs.
  function focusBreaks(id) {
    var pages = focusPages(id);
    if (!pages) return null;
    var at = 0;
    return pages.map(function (pg) { var b = at; at += pg.paragraphs; return b; });
  }
  function refreshArt() { applyArt(view()); }
  function applyView(v) {
    // Scene pickups open only once their authored description has finished
    // typing. Transitions never preserve an overlay from the previous node.
    if (G.ui.inspector && G.ui.inspector.scenePickup) G.ui.inspector = null;
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
      G.surfaces.setA(idx.map(function (i) { return G.narrationText(t[i].runs); }), focusBreaks(v.focus));
      G.surfaces.show('focus');
    }
    // After the surfaces: a paged close-up's picture follows the page Focus A now shows.
    applyArt(v);
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
        restarting = true; // BEGIN AGAIN starts a new playthrough: never a chapter transition
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
        // docs/137 C2: an echo from a voice-led dialogue is shown where that dialogue is, on Narrative B.
        if (ev.surface && ev.surface !== 'dialogue') return present({ t: 'text', surface: ev.surface, paras: ev.paras });
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
    var afterRestart = restarting;
    restarting = false;
    // A genuine chapter boundary (a committed CONTINUE / result into another chapter): the Form 27B-6
    // printer (js/chapter-transition.js, game issue #27). Never after BEGIN AGAIN, and RETRY / CHECKPOINT
    // restores and loads never produce a chapter event.
    if (chapter && !afterRestart && printerOn()) return printChapter(chapter);
    setPhase('transition');
    var ms = G.TUNING.story.transitionMs;
    var ready = chapter ? preloadView(chapter) : preloadHeld();
    // docs/137 C1: entering a text-led scene keeps the scene image steady (no fade); everything else fades.
    var hold = view().sceneHeld !== undefined;
    ready.then(function () {
      fade(1, 0, ms / 2, function () {
        applyView(view());
        fade(0, 1, ms / 2, next, hold);
      }, hold);
    }, failed);
  }
  // Form 27B-6 (game issue #27) ------------------------------------------------------------------
  var restarting = false;
  function printerOn() { return !!G.chapterTransition && !/[?&]noprinter\b/.test(location.search); }
  // Every chapter this playthrough has entered, in arrival order (the incoming one last), from the transcript
  // the rules keep: only encountered chapters are ever printed. Titles and numbers are canonical metadata.
  function registerRows() {
    var ids = [];
    G.state.transcript.forEach(function (e) { if (ids.indexOf(e.chapter) === -1) ids.push(e.chapter); });
    if (ids.indexOf(G.state.chapter) === -1) ids.push(G.state.chapter);
    return ids.map(function (id) {
      var m = /-(\d+)$/.exec(id);
      return { id: id, number: m ? ('0' + m[1]).slice(-2) : '--', title: story.chapters[id].title };
    });
  }
  // The incoming chapter's first frame, laid out under the printer and frozen for its cross-dissolve.
  function freezeIncoming(chapter) {
    return function (root) {
      return preloadView(chapter).then(function () {
        applyView(view());
        return G.captureStage({ exclude: [root] });
      });
    };
  }
  function printChapter(chapter) {
    setPhase('transition');
    var rows = registerRows();
    var from = G.captureStage();
    document.body.dataset.printer = 'playing';
    G.chapterTransition.play({ rows: rows, scenario: rows.length - 1, from: from, next: freezeIncoming(chapter), onDone: printed });
  }
  // Menu -> Prologue: a new playthrough, after the new game is set up and saved; no cross-out or advance.
  function printNewGame(then) {
    setPhase('transition');
    document.body.dataset.printer = 'playing';
    G.chapterTransition.play({ rows: registerRows(), scenario: 0, from: 'menu',
      next: function (root) { return G.captureStage({ exclude: [root] }); }, onDone: function (r) { printed(r); then(); } });
  }
  function printed(r) {
    document.body.dataset.printer = r && r.skipped ? 'skipped' : 'done';
    document.body.dataset.printerCount = String((+document.body.dataset.printerCount || 0) + 1);
    if (G.state && view().chapter) applyView(view());
    if (!pendingNewGame) next();
  }
  var pendingNewGame = false;

  var fading = null;
  function fade(from, to, ms, done, holdScene) {
    fading = { from: from, to: to, start: performance.now(), ms: Math.max(1, ms), done: done, holdScene: !!holdScene };
  }
  // The chapter's art, plus (docs/137 C1) the scene a text-led node holds, which may belong to an
  // earlier chapter on a cold load or restore.
  function preloadHeld() {
    var h = view().sceneHeld;
    return h ? G.preloadKeys([G.artKey.scene(h)]) : Promise.resolve();
  }
  function preloadView(chapter) {
    return G.preloadChapter(chapter).then(preloadHeld);
  }
  function fadeTick(now) {
    if (!fading) return;
    var u = Math.min(1, (now - fading.start) / fading.ms);
    var o = fading.from + (fading.to - fading.from) * u;
    (fading.holdScene ? ['portrait', 'narrativeLayer', 'focusLayer'] : ['scene', 'portrait', 'narrativeLayer', 'focusLayer']).forEach(function (id) {
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
    typingFrom = shown;
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
      refreshArt();
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
      refreshArt();
      after = afterFocusPage;
    }
    setPhase('typing');
  }

  function typingDone() {
    var fn = after;
    after = null;
    if (fn) fn();
  }
  // While an ending presentation is open nothing underneath takes input (js/end-presentation.js).
  function modal() { return !!(G.endPresentation && G.endPresentation.isOpen()); }
  F.skip = function () {
    if (F.phase !== 'typing' || modal()) return;
    if (G.surfaces.mode()) G.surfaces.finish();
    else G.finishTyping();
    if (checkBeats()) refreshArt();
    typingDone();
  };

  // The node's choices, after the beat.
  function beat() {
    setPhase('beat');
    later(G.TUNING.timing.beforeChoicesMs, presentCards);
  }
  function presentCards() {
    document.body.dataset.node = G.state.chapter + ':' + G.state.node;
    // A scene pickup's own cards (READ / USE / CLOSE AND TAKE) are driven only through its
    // inspector: they never slide in as ordinary choice cards first.
    if (view().scenePickup) { G.setChoices([]); ready(); return; }
    var cards = view().cards.map(function (c) { return { id: c.id, kind: c.kind, text: c.text }; });
    G.setChoices(cards, { kind: 'in', start: performance.now() });
    setPhase('arriving');
  }
  function ready() {
    G.ui.thumbOn = true;
    setPhase('choosing');
    var v = view();
    // A settled authored ending: a cause-specific presentation may open over it (feature-gated
    // review proof, js/end-presentation.js; off by default). It never steps the rules or saves.
    if (v.end && G.endPresentation) {
      G.renderChoices(performance.now());
      // The key names the attempt too: dying again after a RETRY is a new ending to present.
      if (G.endPresentation.reached(Rules.endCause(story, G.state), (G.state.attempt || 0) + ':' + G.state.steps + '@' + v.chapter + ':' + v.node)) return;
    }
    if (v.scenePickup) {
      var n = story.chapters[v.chapter].nodes[v.node];
      var pickup = Object.assign({}, v.scenePickup);
      pickup.description = typeof n.text === 'string' ? n.text : pickup.title;
      G.ui.inspector = { id: pickup.item, scenePickup: pickup, scroll: 0, height: 0 };
      G.hideTooltip();
      G.renderAll();
      var first = G.utilityActions()[0].enabled ? 'util-0' : 'util-1';
      document.getElementById(first).focus({ preventScroll: true });
      return;
    }
    G.renderChoices(performance.now());
    G.focusCard(0);
  }

  // Taking a card ---------------------------------------------------------------------------------
  var pendingEvents = null;
  F.choose = function (index) {
    if (F.phase !== 'choosing' || G.ui.inspector || modal()) return;
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
    var before = G.state;
    var r = Rules.step(story, G.state, input);
    G.state = r.state;
    if (tracking) points = Rules.trackPoints(story, points, before, input, r);
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
    if (F.phase !== 'choosing' || (G.ui.inspector && G.ui.inspector.scenePickup) || modal()) return;
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
    refreshArt(); // an item step in place can change what the scene's state selects
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
    if (!G.ui.inspector || modal()) return;
    if (G.ui.inspector.scenePickup) {
      if (F.phase !== 'choosing') return;
      // Exactly one close action: the author's existing back/return choice
      // awards the source-specific injector atomically, then the normal
      // item-gained event triggers the standard item-received slip.
      var choice = G.ui.inspector.scenePickup.closeChoice;
      if (!view().cards.some(function (c) { return c.id === choice; })) return;
      G.ui.inspector = null;
      commit({ choice: choice });
      G.ui.thumbOn = false;
      G.ui.motion = { kind: 'clear', start: performance.now() };
      setPhase('sending');
      G.renderAll();
      return;
    }
    G.ui.inspector = null;
    G.renderAll();
    refreshCards();
  };

  F.utility = function (action) {
    if (modal()) return;
    if (action === 'notes' || action === 'files') {
      G.ui.overlay = G.ui.overlay === action ? null : action;
      G.ui.overlayScroll = action === 'notes' ? 1e9 : 0;
      G.renderOverlay();
      if (G.ui.overlay) G.els.overlay.focus({ preventScroll: true });
      return;
    }
    if (F.phase !== 'choosing') return;
    // Presentation-only INSPECT (game issue #27; public docs/145, docs/152 section 5): opens the node's approved
    // square image in the inspector window. No rules step, no save, no state change; X / Escape close it
    // (F.closeInspector) back to the same Focus A node and the same cards.
    if (action === 'inspect-view') {
      var iv = view().inspectView;
      if (!iv || G.ui.inspector) return;
      G.ui.inspector = { id: null, presentation: iv, scroll: 0, height: 0 };
      G.hideTooltip();
      G.renderAll();
      document.getElementById('inspectClose').focus({ preventScroll: true });
      return;
    }
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
      refreshArt();
      G.renderUtility();
      G.renderOverlay();
      return;
    }
    if (!G.ui.inspector) return;
    if (G.ui.inspector.scenePickup) {
      // READ and USE are driven by real Focus A choice IDs, not a duplicate
      // UI dice implementation. The open box never enters inventory.
      var pickup = G.ui.inspector.scenePickup;
      var choice = action === 'pickup-read' ? pickup.readChoice
        : action === 'pickup-use' ? pickup.useChoice : null;
      if (!choice || !view().cards.some(function (c) { return c.id === choice; })) return;
      G.ui.inspector = null;
      commit({ choice: choice });
      G.ui.thumbOn = false;
      G.ui.motion = { kind: 'clear', start: performance.now() };
      setPhase('sending');
      G.renderAll();
      return;
    }
    var id = G.ui.inspector.id;
    if (action === 'read') {
      var rr = commit({ item: id, verb: 'read' });
      pendingEvents = null;
      rr.events.forEach(function (ev) { if (ev.t === 'items') ev.gained.forEach(function (x) { G.notifyItem(x); }); });
      refreshArt();
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
      if (checkBeats()) refreshArt();
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
    tracking = !!(G.endPresentation && G.endPresentation.enabled);
    var loaded = loadSave();
    var events;
    if (loaded) {
      G.state = loaded.state;
      points = tracking ? loaded.points || null : null;
      if (loaded.pointsDropped) console.info('Restore points not kept: ' + loaded.pointsDropped.join('; '));
      var res = Rules.resume(story, G.state, loaded.cursor);
      shown = res.from;
      events = res.events;
    } else {
      var b = Rules.begin(story, { seed: freshSeed() });
      G.state = b.state;
      if (tracking) points = Rules.trackPoints(story, null, null, null, b);
      shown = 0;
      // The opening's chapter / scene / mode are set up directly, without a fade.
      events = b.events.filter(function (e) { return ['chapter', 'scene', 'mode'].indexOf(e.t) === -1; });
      save();
    }
    var fresh = !loaded;
    return preloadView(G.state.chapter).then(function () {
      applyView(view());
      requestAnimationFrame(tick);
      // Menu -> Prologue (game issue #27): only a new game (no save loaded) at the story's opening chapter.
      if (fresh && printerOn() && G.state.chapter === story.start) {
        pendingNewGame = true;
        printNewGame(function () { pendingNewGame = false; run(events); });
        return;
      }
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

  // RETRY / CHECKPOINT (docs/96; owner rulings on PR #11), review-gated. kind: 'retry' | 'checkpoint'.
  // Available only for the ending the state stands on (Rules.canRestore). The restore is one atomic
  // swap to the point's genuine state in a new attempt (Rules.restoreFrom), saved at once with its
  // points, then presented as a load is: the chapter's art decoded, the view rebuilt, and the
  // point's not-yet-presented text (a chapter entry's arrival narration) typed again.
  F.restoreAvailable = function (kind) {
    return tracking && !!view().end && Rules.canRestore(story, G.state, points, kind, Rules.endCause(story, G.state));
  };
  F.restore = function (kind) {
    if (!F.restoreAvailable(kind)) return false;
    var r = Rules.restoreFrom(story, G.state, points, kind);
    if (!r.ok) return false;
    if (G.endPresentation && G.endPresentation.isOpen()) G.endPresentation.close(kind);
    queue = [];
    timer = null;
    after = null;
    group = null;
    pendingEvents = null;
    G.ui.motion = null;
    G.ui.inspector = null;
    G.ui.overlay = null;
    G.ui.inv.start = 0;
    G.clearNotices();
    G.setChoices([]);
    G.state = r.state;
    points = r.points;
    var res = Rules.resume(story, G.state, r.cursor);
    shown = res.from;
    save();
    setPhase('transition');
    var ms = G.TUNING.story.transitionMs;
    preloadView(G.state.chapter).then(function () {
      fade(1, 0, ms / 2, function () {
        applyView(view());
        G.renderAll();
        fade(0, 1, ms / 2, function () { run(res.events); });
      });
    }, failed);
    return true;
  };
  // QA only: the restore points (read-only copies).
  F.points = function () { return points ? JSON.parse(JSON.stringify(points)) : null; };

  // QA only: the rules state and the view, read-only.
  F.view = view;

  document.addEventListener('keydown', function (e) {
    if (G.flow !== F || modal()) return;
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
