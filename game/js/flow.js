// The dialogue turn, as a small phase machine (docs/45 section 4, docs/47 section 4):
//
//   typing -> beat -> arriving -> choosing -> sending -> reply-beat -> typing ...
//
//   typing      the receptionist's line types into the dialogue box (click/Enter finishes it)
//   beat        a short pause after the line is complete
//   arriving    the next choice cards slide in; input is ignored
//   choosing    the only phase that accepts a choice, an item or the context action
//   sending     the other cards slide away and the chosen card rises behind the divider
//               (or, for SHOW/USE, every card leaves); input is ignored
//   reply-beat  the player's line is already in the box; a beat before the reply types
//
// Narrative state changes only through game/js/rules.js. Drawing is game/js/stage.js.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var Rules = (G.rules = window.CYOA_RULES);
  var content = (G.content = window.CYOA_RECEPTION);
  var F = (G.flow = { phase: 'boot' });
  var timer = null;
  var pending = null;
  var sliding = false;
  var known = []; // the inventory as last announced, so only new items get an item-received slip

  // Announce every item that has entered the inventory since the last look. Called after each
  // rules step; opening an item, READ, SHOW, USE and the context action add nothing, so they never
  // announce.
  function announceNew() {
    var inv = G.state.inventory;
    inv.forEach(function (id) { if (known.indexOf(id) === -1) G.notifyItem(id); });
    known = inv.slice();
  }
  // QA only: take the inventory as it stands without announcing (debug.addItems).
  F.syncInventory = function () {
    known = G.state.inventory.slice();
  };

  function setPhase(p) {
    F.phase = p;
    document.body.dataset.phase = p;
    G.renderUtility();
  }

  function later(ms, fn) {
    timer = { at: performance.now() + ms, fn: fn };
  }

  function lastLine() {
    return G.state.transcript[G.state.transcript.length - 1].text;
  }

  F.begin = function () {
    timer = null;
    pending = null;
    known = content.initialState.inventory.slice();
    G.clearNotices();
    G.state = Rules.start(content);
    G.ui.inv.start = 0;
    G.ui.inv.slide = null;
    G.ui.inspector = null;
    G.ui.selected = null;
    G.ui.overlay = null;
    G.hideTooltip();
    G.clearSpeech();
    G.setChoices([]);
    G.addSpeech(lastLine(), 'npc');
    setPhase('typing');
    G.renderAll();
    announceNew();
    G.els.speech.focus({ preventScroll: true });
  };

  function afterTyping() {
    setPhase('beat');
    later(G.TUNING.timing.beforeChoicesMs, present);
  }

  // Click or Enter on the dialogue box finishes the line; the choices follow after the beat.
  F.skip = function () {
    if (F.phase !== 'typing') return;
    G.finishTyping();
    afterTyping();
  };

  function present() {
    var list = Rules.choices(content, G.state).map(function (c) { return { id: c.id, text: c.text }; });
    G.setChoices(list, { kind: 'in', start: performance.now() });
    setPhase('arriving');
  }

  function ready() {
    G.ui.thumbOn = true;
    setPhase('choosing');
    G.renderChoices(performance.now());
    G.focusCard(0);
  }

  F.choose = function (index) {
    if (F.phase !== 'choosing' || G.ui.inspector) return;
    var card = G.ui.cards[index];
    if (!card) return;
    pending = Rules.choose(content, G.state, card.id);
    announceNew();
    G.ui.thumbOn = false;
    G.ui.motion = { kind: 'send', index: index, start: performance.now() };
    setPhase('sending');
    G.renderChoices(performance.now());
  };

  // The card is gone: the player's line is in the box at once, then a beat, then the reply.
  function delivered() {
    G.addSpeech(pending.say, 'player');
    G.setChoices([]);
    setPhase('reply-beat');
    G.renderOverlay();
    later(G.layout.choices.feedback.send.beatMs, answer);
  }

  function answer() {
    var p = pending;
    pending = null;
    if (p.restart) {
      F.begin();
      return;
    }
    G.addSpeech(Rules.enter(content, G.state, p.to), 'npc');
    setPhase('typing');
    G.renderAll();
    announceNew();
  }

  // Items -------------------------------------------------------------------------------------
  // An item is inspected only because the player activated it: a click, or Enter / Space, on its
  // own inventory slot (js/stage.js). Activating the item already open closes it.
  F.toggleInspect = function (id) {
    if (F.phase !== 'choosing') return;
    if (G.ui.inspector && G.ui.inspector.id === id) F.closeInspector();
    else openInspector(id);
  };

  function openInspector(id) {
    Rules.inspect(content, G.state, id);
    announceNew();
    G.ui.inspector = { id: id, scroll: 0, height: 0 };
    G.hideTooltip();
    G.renderAll();
    var first = G.utilityActions()[0].enabled ? 'util-0' : 'inspectClose';
    document.getElementById(first).focus({ preventScroll: true });
  }

  // Closing restores the conversation. If what the item revealed changed the choices, the new
  // set arrives as any set does; otherwise the old one is back where it was.
  F.closeInspector = function () {
    if (!G.ui.inspector) return;
    G.ui.inspector = null;
    var now = Rules.choices(content, G.state).map(function (c) { return c.id; }).join();
    var was = G.ui.cards.map(function (c) { return c.id; }).join();
    G.renderAll();
    if (F.phase === 'choosing' && now !== was) {
      G.ui.thumbOn = false;
      present();
    } else if (F.phase === 'choosing') {
      G.focusCard(0);
    }
  };

  function itemSpoken(kind) {
    if (F.phase !== 'choosing' || !G.ui.inspector) return;
    pending = Rules.itemAction(content, G.state, G.ui.inspector.id, kind);
    announceNew();
    G.ui.inspector = null;
    G.ui.thumbOn = false;
    G.ui.motion = { kind: 'clear', start: performance.now() };
    setPhase('sending');
    G.renderAll();
  }

  F.utility = function (action) {
    if (action === 'notes' || action === 'files') {
      G.ui.overlay = G.ui.overlay === action ? null : action;
      G.ui.overlayScroll = action === 'notes' ? 1e9 : 0; // the transcript opens at the latest line
      G.renderOverlay();
      if (G.ui.overlay) G.els.overlay.focus({ preventScroll: true });
      return;
    }
    // The context action (docs/64): an optional observation into the history. The node, the
    // choices on show and the phase all stay as they are.
    if (action === 'context') {
      if (F.phase !== 'choosing' || G.ui.inspector) return;
      var a = Rules.contextAction(content, G.state);
      if (!a || Rules.contextSpent(content, G.state)) return;
      G.addSpeech(Rules.takeContextAction(content, G.state), 'thought');
      G.renderUtility();
      G.renderOverlay();
      return;
    }
    if (action === 'read') {
      Rules.itemAction(content, G.state, G.ui.inspector.id, 'read');
      announceNew();
      G.renderAll();
      return;
    }
    if (action === 'show' || action === 'use') return itemSpoken(action);
  };

  // Frame loop ---------------------------------------------------------------------------------
  function tick(now) {
    G.noticeTick(now);
    if (F.phase === 'typing' && G.typeTick(now)) afterTyping();
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

  F.start = function () {
    F.begin();
    requestAnimationFrame(tick);
  };

  document.addEventListener('keydown', function (e) {
    if (G.flow !== F) return; // an imported story is playing (js/story-flow.js handles its keys)
    if (e.key === 'Escape') {
      if (G.ui.inspector) F.closeInspector();
      else if (G.ui.overlay) F.utility(G.ui.overlay);
      return;
    }
    // Enter or Space anywhere but a control finishes the typing line.
    if ((e.key === 'Enter' || e.key === ' ') && F.phase === 'typing' && !e.target.closest('button')) {
      e.preventDefault();
      F.skip();
    }
  });
})();
