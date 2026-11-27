// CYOA M2 - the slice's state rules. Pure functions over (content, state): no DOM, no timers.
// The browser game and the Node route validator (qa/validate_route.js) both use this file, so
// what the validator proves is what the game does.
//
// Deliberately small. It knows about exactly what the reception slice needs: nodes, choices,
// flags, an inventory, per-item marks, READ/SHOW/USE and one optional context action (docs/64).
// It is not a narrative engine.
(function (root) {
  'use strict';

  var MARKS = ['inspected', 'read', 'shown', 'used'];
  var COND_KEYS = ['flag', 'notFlag', 'flagIs', 'has', 'lacks', 'item', 'itemNot'];
  var EFFECT_KEYS = ['set', 'give', 'take', 'mark'];

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }
  // The same result as clone() for JSON data (a state, built only from JSON and effects), without
  // the text round trip: undefined object members and functions are dropped as JSON drops them.
  // Used by the route validator, which copies a state for every transition it explores.
  function copyJson(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) {
      var a = new Array(v.length);
      for (var i = 0; i < v.length; i++) a[i] = v[i] === undefined || typeof v[i] === 'function' ? null : copyJson(v[i]);
      return a;
    }
    var o = {};
    var ks = Object.keys(v);
    for (var j = 0; j < ks.length; j++) {
      var x = v[ks[j]];
      if (x !== undefined && typeof x !== 'function') o[ks[j]] = copyJson(x);
    }
    return o;
  }

  function newState(content) {
    var s = clone(content.initialState);
    s.node = null;
    s.objective = '';
    s.transcript = []; // { who: 'npc' | 'player' | 'thought', text }
    // Ids of `once` context actions already taken this encounter (docs/64). Encounter state only:
    // it is not a flag, never in a condition, and not part of the route validator's state key, so
    // a flavour observation never branches the route. A restart starts a fresh state, clearing it.
    s.contextDone = [];
    return s;
  }

  function itemMarks(state, id) {
    return state.items[id] || [];
  }

  // Every key present must hold.
  function test(cond, state) {
    if (!cond) return true;
    return Object.keys(cond).every(function (k) {
      var v = cond[k];
      switch (k) {
        case 'flag': return !!state.flags[v];
        case 'notFlag': return !state.flags[v];
        case 'flagIs': return state.flags[v[0]] === v[1];
        case 'has': return state.inventory.indexOf(v) !== -1;
        case 'lacks': return state.inventory.indexOf(v) === -1;
        case 'item': return itemMarks(state, v[0]).indexOf(v[1]) !== -1;
        case 'itemNot': return itemMarks(state, v[0]).indexOf(v[1]) === -1;
        default: throw new Error('Unknown condition: ' + k);
      }
    });
  }

  function mark(state, id, what) {
    var list = state.items[id] || (state.items[id] = []);
    if (list.indexOf(what) === -1) list.push(what);
  }

  function apply(effects, state) {
    if (!effects) return;
    Object.keys(effects).forEach(function (k) {
      var v = effects[k];
      if (k === 'set') Object.keys(v).forEach(function (f) { state.flags[f] = v[f]; });
      else if (k === 'give') v.forEach(function (id) { if (state.inventory.indexOf(id) === -1) state.inventory.push(id); });
      else if (k === 'take') v.forEach(function (id) { state.inventory = state.inventory.filter(function (x) { return x !== id; }); });
      else if (k === 'mark') v.forEach(function (pair) { mark(state, pair[0], pair[1]); });
      else throw new Error('Unknown effect: ' + k);
    });
  }

  // A text field is a string or a list of { if, text } variants: the first that holds wins.
  function pick(field, state) {
    if (typeof field === 'string') return field;
    for (var i = 0; i < field.length; i++) {
      var v = field[i];
      if (typeof v === 'string') return v;
      if (test(v.if, state)) return v.text;
    }
    return '';
  }

  function node(content, state) {
    return content.nodes[state.node];
  }

  // Arrive at a node: apply its effects, set its objective, and return the NPC's line.
  function enter(content, state, id) {
    var n = content.nodes[id];
    if (!n) throw new Error('Unknown node: ' + id);
    state.node = id;
    apply(n.effects, state);
    if (n.objective) state.objective = n.objective;
    var line = pick(n.npc, state);
    state.transcript.push({ who: 'npc', text: line });
    return line;
  }

  function start(content) {
    var s = newState(content);
    enter(content, s, content.start);
    return s;
  }

  function choices(content, state) {
    return node(content, state).choices.filter(function (c) { return test(c.if, state); });
  }

  // Take a choice. Returns what the player says and where it leads; the caller enters the next
  // node after its beat, so the player's line can land before the NPC answers.
  function choose(content, state, choiceId) {
    var c = choices(content, state).filter(function (x) { return x.id === choiceId; })[0];
    if (!c) throw new Error('Choice not available: ' + choiceId + ' at ' + state.node);
    apply(c.effects, state);
    var say = c.say || c.text;
    state.transcript.push({ who: 'player', text: say });
    return { say: say, to: c.to || null, restart: !!c.restart };
  }

  // What the three inspector buttons may do with an item at the current node.
  function itemActions(content, state, id) {
    var n = node(content, state);
    var item = content.items[id];
    var held = state.inventory.indexOf(id) !== -1;
    function entry(kind) {
      var e = held && n[kind] && n[kind][id];
      return e && test(e.if, state) ? e : null;
    }
    return { read: held && !!item.read, show: entry('show'), use: entry('use') };
  }

  function inspect(content, state, id) {
    mark(state, id, 'inspected');
  }

  // READ changes only item state. SHOW and USE are spoken actions, taken like a choice.
  function itemAction(content, state, id, kind) {
    var acts = itemActions(content, state, id);
    if (kind === 'read') {
      if (!acts.read) throw new Error('Cannot read ' + id);
      apply(content.items[id].read.effects, state);
      mark(state, id, 'read');
      return null;
    }
    var e = acts[kind];
    if (!e) throw new Error('Cannot ' + kind + ' ' + id + ' at ' + state.node);
    mark(state, id, kind === 'show' ? 'shown' : 'used');
    apply(e.effects, state);
    state.transcript.push({ who: 'player', text: e.say });
    return { say: e.say, to: e.to, restart: false };
  }

  // Context action (docs/64) -----------------------------------------------------------------
  // The optional thing the player can do in the current situation: the first utility button in
  // conversation. Defined as data, for the whole location (content.contextAction) or per node
  // (node.contextAction; null there means none at that node):
  //   { id, label, glyph, text, once, spentWhy }
  // M2 proves one effect only: it adds `text` to the transcript as the player's unspoken
  // observation (who: 'thought'). It never advances the node, consumes a choice or changes the
  // choices. Later kinds of consequence (knowledge, flags, choice changes) are not built.
  function contextAction(content, state) {
    var n = node(content, state);
    var a = n && Object.prototype.hasOwnProperty.call(n, 'contextAction') ? n.contextAction : content.contextAction;
    return a || null;
  }

  function contextSpent(content, state) {
    var a = contextAction(content, state);
    return !!a && !!a.once && state.contextDone.indexOf(a.id) !== -1;
  }

  function takeContextAction(content, state) {
    var a = contextAction(content, state);
    if (!a) throw new Error('No context action at ' + state.node);
    if (contextSpent(content, state)) throw new Error('Context action already taken: ' + a.id);
    if (state.contextDone.indexOf(a.id) === -1) state.contextDone.push(a.id);
    state.transcript.push({ who: 'thought', text: a.text });
    return a.text;
  }

  function description(content, state, id) {
    return pick(content.items[id].description, state);
  }

  // The FILES view: every case-file entry whose condition holds.
  function files(content, state) {
    return (content.files || []).filter(function (f) { return test(f.if, state); }).map(function (f) { return f.text; });
  }

  // Route validation ------------------------------------------------------------------------
  // Walks every state the slice can reach (it is small) and reports anything that is not an
  // intentional continuation: dead ends, missing targets, unreachable nodes, choices or text
  // variants that can never be seen, and text the pixel fonts cannot draw.
  function validate(content, charset) {
    var errors = [];
    var nodes = content.nodes;
    var ids = Object.keys(nodes);
    var knownFlags = Object.keys(content.initialState.flags);
    var chars = charset ? new Set(charset) : null;

    function checkText(where, text) {
      if (typeof text !== 'string' || !text.trim()) errors.push(where + ': empty text');
      else if (chars) {
        var bad = Array.from(new Set(text.replace(/\n/g, '').split(''))).filter(function (ch) { return !chars.has(ch); });
        if (bad.length) errors.push(where + ': characters the fonts cannot draw: ' + bad.join(' '));
      }
    }
    function checkCond(where, cond) {
      if (!cond) return;
      Object.keys(cond).forEach(function (k) {
        if (COND_KEYS.indexOf(k) === -1) return errors.push(where + ': unknown condition ' + k);
        var v = cond[k];
        var flag = k === 'flagIs' ? v[0] : (k === 'flag' || k === 'notFlag') ? v : null;
        if (flag !== null && knownFlags.indexOf(flag) === -1) errors.push(where + ': unknown flag ' + flag);
        var item = k === 'item' || k === 'itemNot' ? v[0] : (k === 'has' || k === 'lacks') ? v : null;
        if (item !== null && !content.items[item]) errors.push(where + ': unknown item ' + item);
        if ((k === 'item' || k === 'itemNot') && MARKS.indexOf(v[1]) === -1) errors.push(where + ': unknown item mark ' + v[1]);
      });
    }
    function checkEffects(where, fx) {
      if (!fx) return;
      Object.keys(fx).forEach(function (k) {
        if (EFFECT_KEYS.indexOf(k) === -1) return errors.push(where + ': unknown effect ' + k);
        if (k === 'set') Object.keys(fx.set).forEach(function (f) { if (knownFlags.indexOf(f) === -1) errors.push(where + ': sets unknown flag ' + f); });
        if (k === 'give' || k === 'take') fx[k].forEach(function (id) { if (!content.items[id]) errors.push(where + ': unknown item ' + id); });
        if (k === 'mark') fx.mark.forEach(function (p) {
          if (!content.items[p[0]]) errors.push(where + ': unknown item ' + p[0]);
          if (MARKS.indexOf(p[1]) === -1) errors.push(where + ': unknown item mark ' + p[1]);
        });
      });
    }
    function checkField(where, field) {
      if (typeof field === 'string') return checkText(where, field);
      if (!Array.isArray(field) || !field.length) return errors.push(where + ': must be text or a list of variants');
      field.forEach(function (v, i) {
        checkText(where + '[' + i + ']', typeof v === 'string' ? v : v.text);
        if (typeof v !== 'string') checkCond(where + '[' + i + ']', v.if);
      });
      var last = field[field.length - 1];
      if (typeof last !== 'string' && last.if) errors.push(where + ': last variant must have no condition, so something is always said');
    }

    // Static shape.
    if (!nodes[content.start]) errors.push('start node ' + content.start + ' does not exist');
    Object.keys(content.items).forEach(function (id) {
      var item = content.items[id];
      checkText('item ' + id + ' name', item.name);
      checkField('item ' + id + ' description', item.description);
      if (item.read) checkEffects('item ' + id + ' read', item.read.effects);
    });
    (content.files || []).forEach(function (f, i) {
      checkText('files[' + i + ']', f.text);
      checkCond('files[' + i + ']', f.if);
    });
    function checkContext(where, a) {
      if (a === null) return;
      if (!a || typeof a !== 'object') return errors.push(where + ': must be an object or null');
      Object.keys(a).forEach(function (k) {
        if (['id', 'label', 'glyph', 'text', 'once', 'spentWhy'].indexOf(k) === -1) errors.push(where + ': unknown field ' + k);
      });
      if (typeof a.id !== 'string' || !a.id) errors.push(where + ': needs an id');
      checkText(where + ' label', a.label);
      if (typeof a.glyph !== 'string' || !/^[a-z0-9_]+$/.test(a.glyph)) errors.push(where + ': needs an action glyph name');
      checkText(where + ' text', a.text);
      if (a.once !== undefined && typeof a.once !== 'boolean') errors.push(where + ': once must be true or false');
      if (a.spentWhy !== undefined) checkText(where + ' spentWhy', a.spentWhy);
      if (a.once && a.spentWhy === undefined) errors.push(where + ': a once action needs spentWhy for its spent tooltip');
    }
    if (content.contextAction !== undefined) checkContext('contextAction', content.contextAction);
    var endings = ids.filter(function (id) { return nodes[id].end; });
    if (!endings.length) errors.push('no node is marked end: true');
    ids.forEach(function (id) {
      var n = nodes[id];
      var where = 'node ' + id;
      checkField(where + ' npc', n.npc);
      if (n.objective) checkText(where + ' objective', n.objective);
      checkEffects(where + ' effects', n.effects);
      if (Object.prototype.hasOwnProperty.call(n, 'contextAction')) checkContext(where + ' contextAction', n.contextAction);
      if (!Array.isArray(n.choices) || !n.choices.length) errors.push(where + ': has no choices (every node needs at least a CONTINUE-style card)');
      var seen = {};
      (n.choices || []).forEach(function (c) {
        var cw = where + ' choice ' + c.id;
        if (!c.id) errors.push(where + ': a choice has no id');
        if (seen[c.id]) errors.push(cw + ': duplicate id');
        seen[c.id] = true;
        checkText(cw + ' text', c.text);
        if (c.say) checkText(cw + ' say', c.say);
        checkCond(cw, c.if);
        checkEffects(cw, c.effects);
        if (c.restart) { if (!n.end) errors.push(cw + ': restart is only allowed on an end node'); }
        else if (!c.to) errors.push(cw + ': has no destination');
        else if (!nodes[c.to]) errors.push(cw + ': leads to missing node ' + c.to);
      });
      ['show', 'use'].forEach(function (kind) {
        Object.keys(n[kind] || {}).forEach(function (item) {
          var e = n[kind][item];
          var ew = where + ' ' + kind + ' ' + item;
          if (!content.items[item]) errors.push(ew + ': unknown item');
          checkText(ew + ' say', e.say);
          checkCond(ew, e.if);
          checkEffects(ew, e.effects);
          if (!nodes[e.to]) errors.push(ew + ': leads to missing node ' + e.to);
        });
      });
    });
    if (errors.length) return { ok: false, errors: errors };

    // Walk every reachable state.
    function key(s) {
      return JSON.stringify([s.node, s.flags, s.inventory.slice().sort(), Object.keys(s.items).sort().map(function (k) { return [k, s.items[k].slice().sort()]; })]);
    }
    function bare(s) {
      var c = clone(s);
      c.transcript = [];
      return c;
    }
    var first = start(content);
    var states = {};
    var edges = {};
    var queue = [bare(first)];
    states[key(first)] = queue[0];
    var used = { nodes: {}, choices: {}, variants: {}, items: {} };
    var restartFrom = [];

    function variantIndex(field, s) {
      if (typeof field === 'string') return 0;
      for (var i = 0; i < field.length; i++) if (typeof field[i] === 'string' || test(field[i].if, s)) return i;
      return -1;
    }
    function follow(from, s, label) {
      var k = key(s);
      (edges[key(from)] = edges[key(from)] || []).push(k);
      if (!states[k]) { states[k] = s; queue.push(s); }
      return k;
    }

    while (queue.length) {
      var s = queue.shift();
      var n = nodes[s.node];
      used.nodes[s.node] = true;
      // The variant the player heard on arrival is decided by the state at arrival, which is this one.
      used.variants['node ' + s.node + ' npc[' + variantIndex(n.npc, s) + ']'] = true;
      (content.files || []).forEach(function (f, i) { if (test(f.if, s)) used.variants['files[' + i + ']'] = true; });
      var avail = choices(content, s);
      if (!avail.length) errors.push('dead end: no choice is available at ' + s.node + ' with state ' + key(s));
      avail.forEach(function (c) {
        used.choices[s.node + ':' + c.id] = true;
        var t = bare(s);
        var r = choose(content, t, c.id);
        if (r.restart) { restartFrom.push(key(s)); return; }
        enter(content, t, r.to);
        follow(s, bare(t));
      });
      s.inventory.forEach(function (id) {
        used.variants['item ' + id + ' description[' + variantIndex(content.items[id].description, s) + ']'] = true;
        var acts = itemActions(content, s, id);
        if (itemMarks(s, id).indexOf('inspected') === -1) {
          var looked = bare(s);
          inspect(content, looked, id);
          follow(s, looked);
        }
        if (acts.read && itemMarks(s, id).indexOf('read') === -1) {
          var t = bare(s);
          itemAction(content, t, id, 'read');
          follow(s, t);
        }
        ['show', 'use'].forEach(function (kind) {
          if (!acts[kind]) return;
          used.items[s.node + ':' + kind + ':' + id] = true;
          var t = bare(s);
          var r = itemAction(content, t, id, kind);
          enter(content, t, r.to);
          follow(s, bare(t));
        });
      });
    }

    // Everything authored must be reachable.
    ids.forEach(function (id) {
      var n = nodes[id];
      if (!used.nodes[id]) errors.push('unreachable node: ' + id);
      n.choices.forEach(function (c) { if (!used.choices[id + ':' + c.id]) errors.push('choice never available: ' + id + ':' + c.id); });
      ['show', 'use'].forEach(function (kind) {
        Object.keys(n[kind] || {}).forEach(function (item) { if (!used.items[id + ':' + kind + ':' + item]) errors.push(kind + ' never available: ' + id + ':' + item); });
      });
      if (Array.isArray(n.npc)) n.npc.forEach(function (v, i) { if (!used.variants['node ' + id + ' npc[' + i + ']']) errors.push('npc variant never heard: ' + id + '[' + i + ']'); });
    });
    Object.keys(content.items).forEach(function (id) {
      var d = content.items[id].description;
      if (Array.isArray(d)) d.forEach(function (v, i) { if (!used.variants['item ' + id + ' description[' + i + ']']) errors.push('description variant never seen: ' + id + '[' + i + ']'); });
    });

    (content.files || []).forEach(function (f, i) { if (!used.variants['files[' + i + ']']) errors.push('case-file entry never shown: files[' + i + ']'); });

    // From every reachable state an ending must still be reachable.
    var canFinish = {};
    restartFrom.forEach(function (k) { canFinish[k] = true; });
    var changed = true;
    while (changed) {
      changed = false;
      Object.keys(edges).forEach(function (k) {
        if (canFinish[k]) return;
        if (edges[k].some(function (to) { return canFinish[to]; })) { canFinish[k] = changed = true; }
      });
    }
    var stuck = Object.keys(states).filter(function (k) { return !canFinish[k]; });
    stuck.forEach(function (k) { errors.push('cannot reach an ending from state ' + k); });

    return {
      ok: !errors.length,
      errors: errors,
      stats: {
        nodes: ids.length,
        choices: ids.reduce(function (n, id) { return n + nodes[id].choices.length; }, 0),
        reachableStates: Object.keys(states).length,
        endings: endings.length,
        endingStates: restartFrom.length
      }
    };
  }

  // =============================================================================================
  // Story v2 (docs/72 S1 + S2; API in docs/74). Everything above this line is the v1 reception API,
  // unchanged: the game and the polish lab still run on it until the renderer moves to events
  // (S4). Everything below is new and is used by nothing in the browser yet.
  //
  //   story  = { schema: 'cyoa-story-v2', chapters: { id: { nodes: { id: NODE } } }, ... }
  //   begin(story, opts)        -> { state, events }   a fresh playthrough
  //   step(story, state, input) -> { state, events }   one atomic, committed action
  //   view(story, state)        -> what the renderer draws (cards, verbs, portrait, windows)
  //   fromV1(content)           -> the reception's v1 content as a one-chapter v2 story
  //   validateStory(story, charset) -> { ok, errors, stats }: shape, then every reachable state
  //   serialize(story, state, meta) / restore(story, saved) / resume(story, state, cursor): S2 saves
  //
  // begin() and step() never modify their arguments: they return a new state, so a step either
  // commits completely or (when it throws) not at all. Events are plain data, in commit order.
  // Text is never re-derived from state by the renderer: every paragraph the player is shown is
  // stored once in state.transcript, tagged with the step that produced it (`n`).
  // =============================================================================================

  var STORY_SCHEMA = 'cyoa-story-v2';
  var STATE_VERSION = 2;
  var YOU = 'you';
  var MODES = ['dialogue', 'narrative', 'focus'];
  var KINDS = ['spoken', 'action', 'continue', 'system'];
  // A run object has exactly one of these keys (plus `who`, with `say` only).
  var RUN_ROLES = { say: 'speech', act: 'action', desc: 'direction', think: 'thought' };
  var CHECK_CONDS = ['passed', 'failed', 'untried'];
  var COND_KEYS_V2 = COND_KEYS.concat(CHECK_CONDS);
  var EFFECT_KEYS_V2 = EFFECT_KEYS.concat(['objective']);
  var STORY_KEYS = ['schema', 'id', 'version', 'profile', 'save', 'compat', 'start', 'initialState', 'cast', 'items', 'files',
    'contextAction', 'assets', 'chapters', 'marks'];
  // Item marks: the engine's own (MARKS) plus any the story declares in `marks` (story import,
  // docs/84: e.g. a notice marked 'signed'). Only effects set a declared mark.
  function marksOf(story) {
    return MARKS.concat(story && Array.isArray(story.marks) ? story.marks : []);
  }
  var CHAPTER_KEYS = ['title', 'start', 'scene', 'nodes'];
  var NODE_KEYS = ['mode', 'scene', 'speaker', 'pose', 'backdrop', 'focus', 'scenePickup', 'objective', 'effects', 'text', 'choices', 'show', 'use',
    'contextAction', 'end'];
  var CHOICE_KEYS = ['id', 'kind', 'text', 'say', 'if', 'effects', 'once', 'result', 'check', 'pass', 'fail', 'to', 'back', 'chapter', 'restart'];
  var ENTRY_KEYS = ['kind', 'say', 'if', 'effects', 'once', 'result', 'check', 'pass', 'fail', 'to', 'back', 'chapter'];
  var CHECK_KEYS = ['id', 'sides', 'need', 'fumble', 'mods', 'cap', 'certain'];
  var OUTCOME_KEYS = ['result', 'effects', 'to', 'back', 'chapter'];
  var SIDES = [6, 100];
  var SAVE_SCHEMA = 'cyoa-save-v1';
  var STATE_FIELDS = ['flags', 'inventory', 'items', 'v', 'story', 'chapter', 'node', 'returnTo', 'objective', 'transcript', 'presentFrom',
    'steps', 'taken', 'contextDone', 'checks', 'seed'];
  var SOURCES = ['text', 'echo', 'result', 'thought'];
  var ROLES = ['narration', 'speech', 'action', 'direction', 'thought'];
  var DESTINATIONS = ['to', 'back', 'chapter', 'restart'];
  // Which part of the one transcript each surface shows (docs/72 section 3.6). Dialogue and B
  // read the current scene, Focus A the current visit; NOTES is the whole playthrough (owner lock
  // [76], S2.1). A restart begins a new playthrough, so it begins a new NOTES too.
  var HISTORY = { dialogue: 'scene', narrative: 'scene', focus: 'visit', notes: 'all' };

  // The reception's art as v2 asset ids. These paths are the ones stage.js registers today
  // (G.RECEPTION_ART); validate_story.js fails if the two ever differ. S3 makes this the only copy.
  var V1_RECEPTION = {
    scene: 'conference_hall/reception',
    cast: 'receptionist',
    title: 'RECEPTION',
    assets: {
      scenes: { 'conference_hall/reception': 'art/scenes/conference_hall/reception/reception_scene.png' },
      portraits: {
        receptionist: {
          backgrounds: { reception: 'art/portraits/receptionist/reception_background.png' },
          poses: { idle: 'art/portraits/receptionist/receptionist_idle.png' },
          background: 'reception',
          pose: 'idle'
        }
      },
      focus: {}
    }
  };

  function has(o, k) {
    return !!o && Object.prototype.hasOwnProperty.call(o, k);
  }

  // v1 -> v2 -----------------------------------------------------------------------------------
  // The reception, unchanged, as a one-chapter v2 story: npc -> text, every node a dialogue with
  // the receptionist, every choice and SHOW/USE entry kind 'spoken' (its words are kept exactly,
  // brackets included: docs/73 forbids reclassifying action-like cards before S9), save: false.
  function fromV1(content, opts) {
    var o = opts || {};
    var cast = o.cast || V1_RECEPTION.cast;
    var nodes = {};
    Object.keys(content.nodes).forEach(function (id) {
      var n = content.nodes[id];
      var out = { mode: 'dialogue', speaker: cast };
      if (n.objective) out.objective = n.objective;
      if (n.effects) out.effects = clone(n.effects);
      out.text = Array.isArray(n.npc)
        ? n.npc.map(function (v) { return typeof v === 'string' ? { text: v } : clone(v); })
        : n.npc;
      out.choices = n.choices.map(function (c) {
        var x = { id: c.id, kind: c.restart ? 'system' : 'spoken', text: c.text };
        ['say', 'if', 'effects', 'to', 'restart'].forEach(function (k) { if (has(c, k)) x[k] = clone(c[k]); });
        return x;
      });
      ['show', 'use'].forEach(function (verb) {
        if (!n[verb]) return;
        out[verb] = {};
        Object.keys(n[verb]).forEach(function (item) {
          var e = clone(n[verb][item]);
          e.kind = 'spoken';
          out[verb][item] = e;
        });
      });
      if (has(n, 'contextAction')) out.contextAction = clone(n.contextAction);
      if (n.end) out.end = true;
      nodes[id] = out;
    });
    var chapterId = content.location || 'v1';
    var castEntry = {};
    castEntry[cast] = { name: content.speaker, portrait: cast };
    var story = {
      schema: STORY_SCHEMA,
      id: content.location || 'v1',
      version: 1,
      profile: 'production',
      save: false,
      compat: 'v1',
      start: chapterId,
      initialState: clone(content.initialState),
      cast: castEntry,
      items: clone(content.items),
      files: clone(content.files || []),
      assets: clone(o.assets || V1_RECEPTION.assets),
      chapters: {}
    };
    if (has(content, 'contextAction')) story.contextAction = clone(content.contextAction);
    story.chapters[chapterId] = { title: o.title || V1_RECEPTION.title, scene: o.scene || V1_RECEPTION.scene, start: content.start, nodes: nodes };
    return story;
  }

  // Lookups ------------------------------------------------------------------------------------
  function requireStory(story) {
    if (!story || story.schema !== STORY_SCHEMA) throw new Error('Not a ' + STORY_SCHEMA + ' story (wrap v1 content with Rules.fromV1)');
  }
  function nodeOf(story, chapter, id) {
    var ch = story.chapters[chapter];
    var n = ch && ch.nodes[id];
    if (!n) throw new Error('Unknown node: ' + chapter + ':' + id);
    return n;
  }
  function here(story, state) {
    return nodeOf(story, state.chapter, state.node);
  }
  function sceneOf(story, chapter, id) {
    return nodeOf(story, chapter, id).scene || story.chapters[chapter].scene;
  }
  // Presentation capabilities (docs/137 C1/C2, owner-approved 2026-11-24). Presentation only: every
  // rule (echo, returnTo / back, checks, effects, destinations) still reads the node's own mode.
  // C2: a dialogue node led by a cast member without a portrait (a voice-only speaker or incidental
  // voice) is presented on Narrative B: no portrait aperture, its lines labelled by name.
  function voiceLed(story, n) {
    return n.mode === 'dialogue' && !!story.cast[n.speaker] && !has(story.cast[n.speaker], 'portrait');
  }
  // The surface a node's text is written to and shown on: its mode, except a voice-led dialogue (B).
  function surfaceOf(story, n) {
    return voiceLed(story, n) ? 'narrative' : n.mode;
  }
  // C1: a text-led scene has no image of its own; the previous scene image stays on screen.
  function textLed(story, scene) {
    var l = story.assets && story.assets.textLedScenes;
    return Array.isArray(l) && l.indexOf(scene) !== -1;
  }
  // The scene a text-led scene holds: the latest earlier transcript entry on a scene with its own
  // image (the transcript is saved, so a restore holds exactly what play would). null: none yet.
  function heldScene(story, state) {
    var t = state.transcript;
    for (var i = t.length - 1; i >= 0; i--) if (t[i].scene && !textLed(story, t[i].scene)) return t[i].scene;
    return null;
  }
  function at(state) {
    return state.chapter + ':' + state.node;
  }

  // Conditions: v1's keys (test) plus the check outcomes. untried = not yet resolved.
  function holds(cond, state) {
    if (!cond) return true;
    var rest = null;
    var ok = Object.keys(cond).every(function (k) {
      var r = (state.checks || {})[cond[k]];
      if (k === 'passed') return !!r && r.ok === true;
      if (k === 'failed') return !!r && r.ok === false;
      if (k === 'untried') return !r;
      (rest = rest || {})[k] = cond[k];
      return true;
    });
    return ok && test(rest, state);
  }

  // Checks (S2) ----------------------------------------------------------------------------------
  // CHECK = { id, sides: 6 | 100, need, fumble?, mods?: [{ if?, add }], cap?, certain? }
  // success  <=>  raw > fumble  AND  raw + clamp(sum of the adds whose `if` holds, -cap, cap) >= need
  // raw = 1 + (FNV-1a 32-bit of seed + ':' + check id) mod sides. The roll depends only on the
  // playthrough's seed and the check's id: not on the order of play, the time, or how many
  // times the state has been saved and restored. A resolved check is stored in state.checks and
  // its choice is gone, so nothing can roll it again. A deliberate retry is a new check id.
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  // attempt (docs/96): 0 / absent for every ordinary roll, exactly as before. A check resolved after
  // a RETRY or CHECKPOINT restore (state.attempt = k >= 1) rolls in its own namespace, so a check
  // attempted again gets an independent roll, reproducible for that attempt across saves.
  //
  // An attempt roll is additionally passed through murmur3's 32-bit finalizer (fmix32). FNV-1a alone
  // keeps the low bit a plain XOR of the input characters' low bits, so with an even number of
  // sides the namespaced roll's parity would be locked to the original roll's (measured: the same
  // d6 face 36% of the time instead of 1/6). The finalizer mixes every bit; ordinary rolls do not
  // use it and are unchanged bit for bit.
  function fmix32(h) {
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
  function rollFor(seed, id, sides, attempt) {
    if (!attempt) return 1 + (fnv1a(seed + ':' + id) % sides);
    return 1 + (fmix32(fnv1a(seed + ':attempt' + attempt + ':' + id)) % sides);
  }
  function checkBonus(check, state) {
    var sum = 0;
    (check.mods || []).forEach(function (m) { if (holds(m.if, state)) sum += m.add; });
    return check.cap ? Math.max(-check.cap, Math.min(check.cap, sum)) : sum;
  }
  function passes(check, raw, bonus) {
    return raw > (check.fumble || 0) && raw + bonus >= check.need;
  }
  // The exact chance of success with this bonus, as a fraction (for any later presentation).
  function chanceOf(check, bonus) {
    var n = 0;
    for (var raw = 1; raw <= check.sides; raw++) if (passes(check, raw, bonus)) n++;
    return n / check.sides;
  }
  // The highest bonus any combination of mods can give (every positive add, capped).
  function maxBonus(check) {
    var sum = 0;
    (check.mods || []).forEach(function (m) { if (m.add > 0) sum += m.add; });
    return check.cap ? Math.min(check.cap, sum) : sum;
  }
  // Every check in a story, by id (the validator rejects duplicates; restore() needs the index).
  function checksOf(story) {
    var out = {};
    Object.keys(story.chapters || {}).forEach(function (ch) {
      var nodes = story.chapters[ch].nodes || {};
      Object.keys(nodes).forEach(function (id) {
        var n = nodes[id];
        (n.choices || []).forEach(function (c) { if (c && c.check) (out[c.check.id] = out[c.check.id] || []).push({ check: c.check, at: ch + ':' + id + ' choice ' + c.id }); });
        ['show', 'use'].forEach(function (verb) {
          Object.keys(n[verb] || {}).forEach(function (item) {
            var e = n[verb][item];
            if (e && e.check) (out[e.check.id] = out[e.check.id] || []).push({ check: e.check, at: ch + ':' + id + ' ' + verb + ' ' + item });
          });
        });
      });
    });
    return out;
  }
  function nextSeed(seed) {
    return fnv1a(seed + ':restart').toString(36);
  }

  // Effects ------------------------------------------------------------------------------------
  // One object, or a list applied in order; each entry's `if` is tested against the state as it
  // stands at that entry (so it sees what the entries before it did).
  function applyEffects(effects, state) {
    if (!effects) return;
    (Array.isArray(effects) ? effects : [effects]).forEach(function (e) {
      if (!holds(e.if, state)) return;
      Object.keys(e).forEach(function (k) {
        if (k === 'if') return;
        if (k === 'objective') { state.objective = pickText(e.objective, state); return; }
        var one = {};
        one[k] = e[k];
        apply(one, state);
      });
    });
  }

  // Typed text ---------------------------------------------------------------------------------
  // TEXT = 'STRING' | [RUN, ...] | [{ if?, text }, ...]. A list is variants when every element is
  // an object with a `text` key; otherwise it is runs.
  function isVariants(field) {
    return Array.isArray(field) && field.length > 0 && field.every(function (v) {
      return !!v && typeof v === 'object' && !Array.isArray(v) && has(v, 'text');
    });
  }
  function variantIndex2(field, state) {
    if (!isVariants(field)) return 0;
    for (var i = 0; i < field.length; i++) if (holds(field[i].if, state)) return i;
    return -1;
  }
  function pickText(field, state) {
    if (!isVariants(field)) return field;
    var i = variantIndex2(field, state);
    return i === -1 ? '' : field[i].text;
  }
  function runKey(run) {
    return Object.keys(run).filter(function (k) { return has(RUN_ROLES, k); })[0];
  }
  // Text (a string or runs) -> paragraphs of { role, who, text }. `ctx` gives the role and speaker
  // of a plain string where it appears (docs/72 section 2.3); `\n` starts a new paragraph. A
  // paragraph's runs are joined by single spaces when drawn. Roles are authored, never inferred.
  // A run object may carry its own condition (`if`, game issue #27): with a `state` it is kept only
  // when the condition holds there; `seen(i, shown)` notes each conditional run's outcome (route
  // coverage). The paragraphs are written to the transcript once, at the step that shows them, so
  // NOTES, saves and replay keep exactly the runs that were shown. Without a state every run is kept.
  function toParas(text, ctx, state, seen) {
    var paras = [[]];
    (typeof text === 'string' ? [text] : text).forEach(function (r, ri) {
      var role, who, s;
      if (state && r && typeof r === 'object' && has(r, 'if')) {
        var on = holds(r.if, state);
        if (seen) seen(ri, on);
        if (!on) return;
      }
      if (typeof r === 'string') {
        role = ctx.role; who = ctx.who; s = r;
      } else {
        var k = runKey(r);
        role = RUN_ROLES[k]; s = r[k];
        who = role === 'speech' ? (r.who || ctx.speaker) : role === 'direction' ? null : YOU;
      }
      s.split('\n').forEach(function (part, i) {
        if (i > 0) paras.push([]);
        if (part !== '') paras[paras.length - 1].push({ role: role, who: who, text: part });
      });
    });
    return paras;
  }
  // Where a plain string's role comes from.
  function arrivalCtx(n) {
    return n.mode === 'dialogue' ? { role: 'speech', who: n.speaker, speaker: n.speaker } : { role: 'narration', who: null, speaker: YOU };
  }
  function echoCtx(kind) {
    return { role: kind === 'action' ? 'action' : 'speech', who: YOU, speaker: YOU };
  }
  function resultCtx(dest) {
    return dest.mode === 'dialogue' ? { role: 'direction', who: null, speaker: dest.speaker } : { role: 'narration', who: null, speaker: YOU };
  }
  function cardText(c) {
    return c.text || (c.kind === 'continue' ? 'CONTINUE' : '');
  }

  // State --------------------------------------------------------------------------------------
  function freshState(story, opts) {
    var s = clone(story.initialState);
    s.v = STATE_VERSION;
    s.story = story.id;
    s.chapter = null;
    s.node = null;
    s.returnTo = null; // the narrative node that opened the current focus/dialogue excursion
    s.objective = '';
    s.transcript = []; // one entry per paragraph shown: { n, src, mode, chapter, scene, node, runs }
    s.presentFrom = 0; // first transcript entry produced by the latest step (not yet presented)
    s.steps = 0; // committed steps so far; transcript entries carry the step number `n`
    s.taken = []; // decision log: { n, at, c } for choices, { n, at, item, verb } for SHOW/USE
    s.contextDone = [];
    s.checks = {}; // resolved checks: { id: { roll, bonus, ok } }; never rolled again
    // Rolls derive from this. The caller supplies a fresh random seed per playthrough (S8);
    // QA passes fixed ones. Rules never read a clock or a random source.
    s.seed = opts && opts.seed !== undefined ? String(opts.seed) : '0';
    return s;
  }

  function wasTaken(state, where, id) {
    return state.taken.some(function (t) { return t.at === where && t.c === id; });
  }
  function entryTaken(state, where, item, verb) {
    return state.taken.some(function (t) { return t.at === where && t.item === item && t.verb === verb; });
  }

  // Availability: the one definition the view, step() and the validator share.
  function choiceOpen(story, state, c) {
    if (!holds(c.if, state)) return false;
    if (c.once && wasTaken(state, at(state), c.id)) return false;
    if (c.check && state.checks[c.check.id]) return false;
    if (c.back && !state.returnTo) return false;
    return true;
  }
  function openChoices(story, state) {
    return here(story, state).choices.filter(function (c) { return choiceOpen(story, state, c); });
  }
  function entryKind(verb, e) {
    return e.kind || (verb === 'show' ? 'spoken' : 'action');
  }
  function openEntry(story, state, item, verb) {
    var n = here(story, state);
    if (state.inventory.indexOf(item) === -1) return null;
    if (verb === 'show' && n.mode !== 'dialogue') return null; // nobody to show it to
    var e = n[verb] && n[verb][item];
    if (!e || !holds(e.if, state)) return null;
    if (e.once && entryTaken(state, at(state), item, verb)) return null;
    if (e.check && state.checks[e.check.id]) return null;
    if (e.back && !state.returnTo) return null;
    return e;
  }
  function contextOf(story, state) {
    var n = here(story, state);
    if (n.mode !== 'dialogue') return null; // dialogue only until the thought contract (docs/72 section 8.3)
    var a = has(n, 'contextAction') ? n.contextAction : story.contextAction;
    return a || null;
  }
  function contextUsed(story, state) {
    var a = contextOf(story, state);
    return !!a && !!a.once && state.contextDone.indexOf(a.id) !== -1;
  }

  // Scene states (docs/92 section 3) -----------------------------------------------------------
  // assets.sceneStates: { <scene>: [{ id, layer: 'replace' | 'overlay', path, at?, focus?, if? }] }.
  // A 'replace' state is an opaque alternate of the whole scene; an 'overlay' is one transparent
  // layer on it, sharing its origin. A state shows when every selector it names holds: `at` (the
  // current node, as chapter:node), `focus` (the close-up on show) and `if` (an ordinary condition
  // over the real state: flags, inventory, marks, checks). Nothing here is remembered: the same
  // state always selects the same art, so a restore, a return or a page change can never leave a
  // stale layer behind. validateStory proves at most one state per layer matches in every
  // reachable state, and that every state shows in some reachable state.
  function stateSelected(st, state, n) {
    if (st.at && st.at.indexOf(at(state)) === -1) return false;
    if (st.focus !== undefined && !(n.mode === 'focus' && n.focus === st.focus)) return false;
    return holds(st.if, state);
  }
  function sceneStatesOf(story, state) {
    var n = here(story, state);
    var all = (story.assets && story.assets.sceneStates) || {};
    var list = all[sceneOf(story, state.chapter, state.node)] || [];
    var out = { replace: [], overlay: [] };
    list.forEach(function (st) { if (stateSelected(st, state, n)) out[st.layer].push(st.id); });
    return out;
  }

  // Conditional art (game issue #27; public docs/152 section 4) --------------------------------------
  // assets.artStates: { '<surface>:<base>': [STATE, ...] } with surface 'scene' (a main scene id), 'background'
  // (a portrait background id: the scene whose closer view it is) or 'focus' (a Focus A id), listed in priority
  // order. STATE = { id, path, at: ['chapter:node', ...], if?, beat?, until?, after?: { node, beat }, region? }.
  // A state holds when the current node is one of `at`, `if` holds over the real state, and its text beats
  // agree with what has been presented: `beat` = the presented text of this node has reached the paragraph or
  // run that begins with that text; `until` = it has not yet; `after` = that node's text from `beat` on has
  // been presented in this playthrough (now, or on an earlier visit). The first holding state without a
  // region replaces the base image; every holding state with a region [x, y, w, h] (native pixels) draws that
  // rectangle of its own opaque image over it, in order. `presented(nodeKey, text)` answers the beats; without
  // one, every text the transcript holds counts as presented (a settled view). Nothing is remembered: the same
  // state and presentation always select the same art.
  function runsBegin(runs, text) {
    return runs.some(function (r) { return typeof r.text === 'string' && r.text.indexOf(text) === 0; });
  }
  function settledPresented(state) {
    return function (nodeKey, text) {
      return state.transcript.some(function (e) { return e.src === 'text' && e.chapter + ':' + e.node === nodeKey && runsBegin(e.runs, text); });
    };
  }
  function artStateHolds(st, state, presented) {
    var w = at(state);
    if (st.at.indexOf(w) === -1) return false;
    if (st.if && !holds(st.if, state)) return false;
    if (st.beat !== undefined && !presented(w, st.beat)) return false;
    if (st.until !== undefined && presented(w, st.until)) return false;
    if (st.after && !presented(st.after.node, st.after.beat)) return false;
    return true;
  }
  function artFor(list, state, presented) {
    var out = { id: null, regions: [] };
    (list || []).forEach(function (st) {
      if (!artStateHolds(st, state, presented)) return;
      if (st.region) out.regions.push(st.id);
      else if (out.id === null) out.id = st.id;
    });
    return out;
  }
  // The conditional art for the state as presented: { scene, background, focus }, each { id, regions } (ids of
  // assets.artStates entries for that surface's base; id null = the base image itself).
  function artAt(story, state, presented) {
    var all = (story.assets && story.assets.artStates) || {};
    var n = here(story, state);
    var p = presented || settledPresented(state);
    var out = { scene: artFor(all['scene:' + sceneOf(story, state.chapter, state.node)], state, p), background: { id: null, regions: [] }, focus: { id: null, regions: [] } };
    if (n.mode === 'dialogue' && !voiceLed(story, n)) {
      var reg = story.assets.portraits[story.cast[n.speaker].portrait];
      if (!reg.views) out.background = artFor(all['background:' + (n.backdrop || reg.background)], state, p);
    }
    if (n.mode === 'focus') out.focus = artFor(all['focus:' + n.focus], state, p);
    return out;
  }

  // The cause of the ending the state stands on (docs/93 death brief section 4) ----------------
  // An authored ending can be reached by several choices (and by either outcome of a check), so the
  // ending node alone does not say why it was reached. The decision log already records it: the
  // step that arrived here is the latest `taken` entry made at another node, with its choice and,
  // for a checked choice, the check id and outcome. Read-only; null unless the state is on an end
  // node reached by a choice or SHOW / USE. No new state, no save change.
  function endCause(story, state) {
    requireStory(story);
    if (!here(story, state).end) return null;
    // The arriving entry: the latest one made elsewhere (an item step taken at the ending itself,
    // after it was reached, is not how it was reached).
    var w = at(state);
    var last = null;
    for (var i = state.taken.length - 1; i >= 0 && !last; i--) if (state.taken[i].at !== w) last = state.taken[i];
    if (!last) return null;
    var out = { end: at(state), from: last.at };
    if (last.c !== undefined) out.choice = last.c;
    else { out.item = last.item; out.verb = last.verb; }
    if (last.check !== undefined) { out.check = last.check; out.ok = last.ok; }
    return out;
  }

  // The view: everything the renderer needs to draw the current state ----------------------------
  function view(story, state) {
    requireStory(story);
    var n = here(story, state);
    var ch = story.chapters[state.chapter];
    var portrait = null;
    if (n.mode === 'dialogue' && !voiceLed(story, n)) {
      var pid = story.cast[n.speaker].portrait;
      var reg = story.assets.portraits[pid];
      // An opaque-complete portrait (docs/92 section 1) is one whole image per location: `view`,
      // chosen by the node's backdrop, instead of a background and a pose layer.
      portrait = reg.views ? { cast: n.speaker, id: pid, view: n.backdrop || reg.view }
        : { cast: n.speaker, id: pid, background: n.backdrop || reg.background, pose: n.pose || reg.pose };
    }
    var sel = sceneStatesOf(story, state);
    var ctx = contextOf(story, state);
    var out = {
      story: story.id,
      chapter: state.chapter,
      title: ch.title,
      node: state.node,
      mode: surfaceOf(story, n),
      scene: sceneOf(story, state.chapter, state.node),
      // The scene state ids on show (null: the scene's own art, no overlay).
      sceneArt: { replace: sel.replace[0] || null, overlay: sel.overlay[0] || null },
      speaker: n.mode === 'dialogue' ? n.speaker : null,
      portrait: portrait,
      focus: n.mode === 'focus' ? n.focus : null,
      scenePickup: n.mode === 'focus' ? (n.scenePickup || null) : null,
      returnTo: state.returnTo,
      end: !!n.end,
      // hasCheck: the outcome depends on a hidden roll (owner lock [74]: a risk marker). It comes
      // only from the authored check, never from kind or wording, and is the only check data in
      // the view: no die, odds, target, bonus, seed or roll (a marker that vanished when the bonus
      // reached 100% would leak odds, so a `certain` check is still marked).
      cards: openChoices(story, state).map(function (c) { return { id: c.id, kind: c.kind, text: cardText(c), hasCheck: !!c.check }; }),
      items: state.inventory.map(function (id) {
        var show = openEntry(story, state, id, 'show');
        var use = openEntry(story, state, id, 'use');
        return { id: id, read: !!story.items[id].read, show: !!show, use: !!use,
          showHasCheck: !!(show && show.check), useHasCheck: !!(use && use.check) };
      }),
      context: ctx ? { id: ctx.id, label: ctx.label, glyph: ctx.glyph, spent: contextUsed(story, state), spentWhy: ctx.spentWhy || null } : null,
      objective: state.objective,
      files: filesOf(story, state),
      history: history(story, state)
    };
    if (voiceLed(story, n)) out.voiceLed = true;
    if (textLed(story, out.scene)) out.sceneHeld = heldScene(story, state);
    if (story.assets && story.assets.artStates) out.artStates = artAt(story, state);
    return out;
  }

  function filesOf(story, state) {
    return (story.files || []).filter(function (f) { return holds(f.if, state); }).map(function (f) { return f.text; });
  }
  function describe(story, state, id) {
    return pickText(story.items[id].description, state);
  }

  // Transcript windows (indices into state.transcript), per HISTORY.
  function history(story, state) {
    var t = state.transcript;
    var scene = sceneOf(story, state.chapter, state.node);
    var mode = here(story, state).mode;
    var chapterFrom = t.length;
    while (chapterFrom > 0 && t[chapterFrom - 1].chapter === state.chapter) chapterFrom--;
    var sceneFrom = t.length;
    while (sceneFrom > chapterFrom && t[sceneFrom - 1].scene === scene) sceneFrom--;
    var visitFrom = t.length;
    if (mode === 'focus') {
      while (visitFrom > 0 && t[visitFrom - 1].mode === 'focus' && t[visitFrom - 1].node === state.node) visitFrom--;
      // A `back` return writes nothing, so leaving a close-up and opening it again leaves two visits
      // side by side in the transcript. The visit is the latest arrival (the step that wrote the
      // node's own text) and everything after it.
      for (var vi = t.length - 1; vi >= visitFrom; vi--) {
        if (t[vi].src !== 'text') continue;
        while (vi > visitFrom && t[vi - 1].n === t[vi].n) vi--;
        visitFrom = vi;
        break;
      }
    }
    var from = { all: 0, scene: sceneFrom, chapter: chapterFrom, visit: visitFrom };
    var out = {};
    Object.keys(HISTORY).forEach(function (surface) {
      out[surface] = [];
      for (var i = from[HISTORY[surface]]; i < t.length; i++) {
        if (surface === 'notes' || t[i].mode === surface) out[surface].push(i);
      }
    });
    return out;
  }

  // One atomic step ------------------------------------------------------------------------------
  // input: { choice: id } | { item: id, verb: 'inspect' | 'read' | 'show' | 'use' } | { context: true }.
  // Normative order (docs/72 section 3.3): availability, check (S2), effects, record, echo,
  // destination, result, arrival, mark. Nothing outside the returned state is changed.
  function Tx(story, state, obs, copy) {
    this.story = story;
    this.s = (copy || clone)(state);
    this.events = [];
    this.obs = obs || null;
    this.n = state.steps + 1;
  }
  Tx.prototype.see = function (key) {
    if (this.obs) this.obs[key] = true;
  };
  // Pick a TEXT against the current state, noting which variant was used (route coverage).
  Tx.prototype.pick = function (key, field) {
    this.see(key + '[' + variantIndex2(field, this.s) + ']');
    return pickText(field, this.s);
  };
  // A TEXT as paragraphs for the state as it stands: the variant (pick), then its conditional runs.
  Tx.prototype.paras = function (key, field, ctx) {
    var self = this;
    var vi = variantIndex2(field, this.s);
    var t = this.pick(key, field);
    return toParas(t, ctx, this.s, function (ri, on) { self.see(key + '[' + vi + '] run ' + ri + (on ? ':shown' : ':hidden')); });
  };
  Tx.prototype.write = function (src, mode, paras, event) {
    var s = this.s;
    var n = this.n;
    var scene = sceneOf(this.story, s.chapter, s.node);
    paras.forEach(function (p) {
      s.transcript.push({ n: n, src: src, mode: mode, chapter: s.chapter, scene: scene, node: s.node, runs: p });
    });
    event.paras = paras;
    this.events.push(event);
  };
  // Effects, announcing what they changed: an items event per change (the item slip) and an
  // objective event when the plaque text changes. Emitted where they happen, so the slip for an
  // item given on arrival comes with the arrival, as in v1.
  Tx.prototype.effects = function (fx) {
    var s = this.s;
    var inv = s.inventory.slice();
    var obj = s.objective;
    applyEffects(fx, s);
    this.announce(inv, obj);
  };
  Tx.prototype.announce = function (inv, obj) {
    var s = this.s;
    var gained = s.inventory.filter(function (x) { return inv.indexOf(x) === -1; });
    var lost = inv.filter(function (x) { return s.inventory.indexOf(x) === -1; });
    if (gained.length || lost.length) this.events.push({ t: 'items', gained: gained, lost: lost });
    if (s.objective !== obj) this.events.push({ t: 'objective', text: s.objective });
  };
  // Move to a node, announcing chapter, scene and mode changes (in that order).
  Tx.prototype.move = function (chapter, node) {
    var s = this.s;
    var was = s.node === null ? null : { chapter: s.chapter, scene: sceneOf(this.story, s.chapter, s.node), mode: surfaceOf(this.story, here(this.story, s)) };
    s.chapter = chapter;
    s.node = node;
    var n = here(this.story, s);
    var scene = sceneOf(this.story, chapter, node);
    if (!was || was.chapter !== chapter) this.events.push({ t: 'chapter', id: chapter, title: this.story.chapters[chapter].title });
    if (!was || was.scene !== scene) this.events.push({ t: 'scene', id: scene });
    if (!was || was.mode !== surfaceOf(this.story, n)) this.events.push({ t: 'mode', from: was ? was.mode : null, to: surfaceOf(this.story, n) });
  };
  // Arrival: node effects, objective, then the text variant chosen by the state after them.
  Tx.prototype.arrive = function () {
    var s = this.s;
    var n = here(this.story, s);
    var key = 'text ' + at(s);
    var inv = s.inventory.slice();
    var obj = s.objective;
    applyEffects(n.effects, s);
    if (n.objective) s.objective = this.pick('objective ' + at(s), n.objective);
    this.announce(inv, obj);
    this.see('node ' + at(s));
    this.write('text', surfaceOf(this.story, n), this.paras(key, n.text, arrivalCtx(n)), { t: 'text', surface: surfaceOf(this.story, n) });
    if (n.end) this.events.push({ t: 'end' });
  };
  Tx.prototype.done = function (from) {
    this.s.presentFrom = from;
    this.s.steps = this.n;
    return { state: this.s, events: this.events };
  };

  function begin(story, opts) {
    requireStory(story);
    var tx = new Tx(story, freshState(story, opts), opts && opts.obs);
    var ch = story.chapters[story.start];
    if (!ch) throw new Error('Unknown start chapter: ' + story.start);
    tx.move(story.start, ch.start);
    tx.arrive();
    return tx.done(0);
  }

  // Resolve an input to what it would do, or throw (nothing is changed when a step throws).
  function resolve(story, state, input) {
    if (!input || typeof input !== 'object') throw new Error('A step needs an input object');
    if (has(input, 'continue')) throw new Error('CONTINUE between reading groups is presentation only: it is never a rules step');
    var keys = Object.keys(input).sort().join();
    if (keys === 'choice') {
      var c = openChoices(story, state).filter(function (x) { return x.id === input.choice; })[0];
      if (!c) throw new Error('Choice not available: ' + input.choice + ' at ' + at(state));
      return { type: 'choice', e: c, kind: c.kind };
    }
    if (keys === 'item,verb') {
      var id = input.item;
      if (state.inventory.indexOf(id) === -1) throw new Error('Not holding ' + id);
      if (input.verb === 'inspect') return { type: 'inspect', item: id };
      if (input.verb === 'read') {
        if (!story.items[id].read) throw new Error('Cannot read ' + id);
        return { type: 'read', item: id };
      }
      if (input.verb === 'show' || input.verb === 'use') {
        var e = openEntry(story, state, id, input.verb);
        if (!e) throw new Error('Cannot ' + input.verb + ' ' + id + ' at ' + at(state));
        return { type: 'entry', e: e, kind: entryKind(input.verb, e), item: id, verb: input.verb };
      }
      throw new Error('Unknown item verb: ' + input.verb);
    }
    if (keys === 'context' && input.context === true) {
      var a = contextOf(story, state);
      if (!a) throw new Error('No context action at ' + at(state));
      if (contextUsed(story, state)) throw new Error('Context action already taken: ' + a.id);
      return { type: 'context', a: a };
    }
    throw new Error('Unknown step input: ' + JSON.stringify(input));
  }

  function step(story, state, input) {
    return stepCore(story, state, input, null);
  }

  // opts (validator only): { obs } coverage notes, { force: 'pass' | 'fail' } to explore a check's
  // outcome without rolling (the raw used is the lowest that gives that outcome).
  function stepCore(story, state, input, opts) {
    requireStory(story);
    var r = resolve(story, state, input);
    var tx = new Tx(story, state, opts && opts.obs, opts && opts.copy);
    var s = tx.s;
    var from = s.transcript.length;

    if (r.type === 'inspect') {
      // An item's own inspect behaviour (story import, docs/84): effects that run when the player
      // opens it, e.g. a sealed box that unpacks. `once` (the default when authored) runs them only
      // the first time, i.e. while the item is not yet marked inspected.
      var insp = story.items[r.item].inspect;
      var first = itemMarks(s, r.item).indexOf('inspected') === -1;
      mark(s, r.item, 'inspected');
      if (insp && insp.effects && (first || insp.once === false)) tx.effects(insp.effects);
      return tx.done(from);
    }
    if (r.type === 'read') {
      tx.effects(story.items[r.item].read.effects);
      mark(s, r.item, 'read');
      return tx.done(from);
    }
    if (r.type === 'context') {
      if (s.contextDone.indexOf(r.a.id) === -1) s.contextDone.push(r.a.id);
      var ts = voiceLed(story, here(story, s)) ? 'narrative' : 'dialogue';
      tx.write('thought', ts, toParas(r.a.text, { role: 'thought', who: YOU, speaker: YOU }), { t: 'text', surface: ts });
      return tx.done(from);
    }

    var e = r.e;
    var fromNode = here(story, s);
    var where = at(s);
    var outcome = null;
    var which = null;

    // 2. Check: the bonus comes from the state BEFORE this step's effects (so an attempt that
    // uses up an item still gets its bonus); then the roll; then the outcome is recorded.
    if (e.check) {
      var ck = e.check;
      var bonus = checkBonus(ck, s);
      var attempt = s.attempt || 0;
      var raw = rollFor(s.seed, ck.id, ck.sides, attempt);
      if (opts && opts.force) {
        raw = 0;
        for (var x = 1; x <= ck.sides && !raw; x++) if (passes(ck, x, bonus) === (opts.force === 'pass')) raw = x;
        if (!raw) throw new Error('Check ' + ck.id + ' cannot ' + opts.force + ' here');
      }
      var ok = passes(ck, raw, bonus);
      s.checks[ck.id] = { roll: raw, bonus: bonus, ok: ok };
      if (attempt) s.checks[ck.id].attempt = attempt; // which roll namespace (restore re-derives it)
      which = ok ? 'pass' : 'fail';
      outcome = e[which];
      tx.see('outcome ' + ck.id + ':' + which);
      tx.events.push({ t: 'check', id: ck.id, sides: ck.sides, roll: raw, bonus: bonus, need: ck.need, ok: ok, chance: chanceOf(ck, bonus) });
    }

    // 3. Effects: the verb's mark, the entry's effects, then the outcome's.
    if (r.type === 'entry') mark(s, r.item, r.verb === 'show' ? 'shown' : 'used');
    tx.effects(e.effects);
    if (outcome) tx.effects(outcome.effects);

    // 4. Record.
    var rec = r.type === 'choice' ? { n: tx.n, at: where, c: e.id } : { n: tx.n, at: where, item: r.item, verb: r.verb };
    if (e.check) { rec.check = e.check.id; rec.ok = s.checks[e.check.id].ok; }
    s.taken.push(rec);

    // 5. Echo: spoken and action kinds, in dialogue mode; and (game issue #27, docs/140) an action whose
    // `say` is authored on a Focus A node, written on the Focus A surface (no one is addressed there).
    if ((fromNode.mode === 'dialogue' && (r.kind === 'spoken' || r.kind === 'action'))
      || (fromNode.mode === 'focus' && r.kind === 'action' && e.say !== undefined)) {
      var said = e.say || e.text;
      var es = surfaceOf(story, fromNode);
      tx.write('echo', es, toParas(said, echoCtx(r.kind)), { t: 'echo', role: echoCtx(r.kind).role, who: YOU, surface: es });
    }

    // 6. Destination: chapter, then to, then back, then stay. restart starts a new playthrough.
    var dest = outcome || e;
    if (e.restart) {
      var again = begin(story, { seed: nextSeed(s.seed) });
      again.events.unshift({ t: 'restart' });
      return again;
    }
    var arriving = false;
    if (dest.chapter) {
      s.returnTo = null;
      tx.move(dest.chapter, story.chapters[dest.chapter].start);
      arriving = true;
    } else if (dest.to) {
      var target = nodeOf(story, s.chapter, dest.to);
      if (target.mode === 'narrative') s.returnTo = null;
      else if (fromNode.mode === 'narrative') s.returnTo = s.node;
      tx.move(s.chapter, dest.to);
      arriving = true;
    } else if (dest.back) {
      var opener = s.returnTo;
      s.returnTo = null;
      tx.move(s.chapter, opener);
    }

    // 7. Result, on the destination surface.
    var result = outcome ? outcome.result : e.result;
    if (result !== undefined) {
      var dn = here(story, s);
      var rkey = 'result ' + where + ':' + (r.type === 'choice' ? e.id : r.verb + ':' + r.item) + (which ? ':' + which : '');
      tx.write('result', surfaceOf(story, dn), tx.paras(rkey, result, resultCtx(dn)), { t: 'text', surface: surfaceOf(story, dn) });
    }

    // 8. Arrival (not for back or stay: a return is not an entry).
    if (arriving) tx.arrive();

    // 9. Mark.
    return tx.done(from);
  }

  // Saves (S2) -----------------------------------------------------------------------------------
  // The rules only turn a state into text and back. Where the text is kept, and when it is
  // written, is the browser's business (S8).
  //
  // The data contract for presentation (docs/73 C3):
  // - A step commits once, before anything is animated: the saved state is always a whole
  //   committed state, never half a step. Saving happens after a commit, never on a
  //   presentation-only CONTINUE, a scroll or an overlay.
  // - Every paragraph the player is shown is stored once, in order, in state.transcript, with the
  //   step number (n) and source that produced it. Restoring never adds to it.
  // - state.presentFrom is the first entry the latest step produced. Entries before it were
  //   presented before that step was taken. An optional cursor { presented } (saved beside the
  //   state, never inside it) says how far the renderer got through the latest step's text.
  // - resume() replays from the safe point max(presentFrom, presented), whole paragraphs only,
  //   on the surface now showing. It replays text and echoes only: never effects, checks, item
  //   slips or objective changes, which the restored state already holds.
  // - Not a retry checkpoint (docs/73 C1): a save is the state after its step. A recoverable
  //   state before a terminal choice, if the owner wants one, is a separate, later contract.
  function serialize(story, state, meta) {
    requireStory(story);
    var env = { schema: SAVE_SCHEMA, story: story.id, version: story.version };
    if (meta && meta.savedAt !== undefined) env.savedAt = meta.savedAt;
    env.state = state;
    if (meta && meta.presented !== undefined) env.cursor = { presented: meta.presented };
    // Restore points (docs/96): written only by a caller that tracks them (the review-gated death
    // controls). Absent otherwise, so an ordinary save is byte-for-byte as before.
    if (meta && meta.points) env.points = meta.points;
    return JSON.stringify(env);
  }

  // A save from another story or version, or one that does not fit this story exactly, is
  // refused ({ ok: false, reason }), never half-migrated and never thrown.
  function restore(story, saved) {
    try {
      requireStory(story);
      var env = typeof saved === 'string' ? JSON.parse(saved) : clone(saved);
      var s = env && env.state;
      var fail = function (why) { throw new Error(why); };
      var obj = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
      var whole = function (v, lo, hi) { return typeof v === 'number' && v % 1 === 0 && v >= lo && v <= hi; };
      if (!obj(env) || env.schema !== SAVE_SCHEMA) fail('not a ' + SAVE_SCHEMA + ' save');
      if (env.story !== story.id) fail('save is for another story (' + env.story + ')');
      if (env.version !== story.version) fail('save is for version ' + env.version + ' of this story, not ' + story.version);
      if (!obj(s) || s.v !== STATE_VERSION || s.story !== story.id) fail('state is not a v' + STATE_VERSION + ' state of this story');
      // `attempt` (docs/96) is the one optional field: present only after a RETRY / CHECKPOINT.
      var keys = Object.keys(s).filter(function (k) { return k !== 'attempt'; }).sort().join();
      if (keys !== STATE_FIELDS.slice().sort().join()) fail('state fields differ: ' + Object.keys(s).sort().join());
      if (has(s, 'attempt') && !whole(s.attempt, 1, Infinity)) fail('attempt must be a whole number from 1');
      var ch = story.chapters[s.chapter];
      if (!ch || !ch.nodes[s.node]) fail('unknown node ' + s.chapter + ':' + s.node);
      var n = ch.nodes[s.node];
      if (s.returnTo !== null) {
        var opener = ch.nodes[s.returnTo];
        if (!opener || opener.mode !== 'narrative' || n.mode === 'narrative') fail('returnTo ' + s.returnTo + ' is not an opener of this excursion');
      }
      var flags = Object.keys(story.initialState.flags).sort().join();
      if (!obj(s.flags) || Object.keys(s.flags).sort().join() !== flags) fail('flags are not exactly the declared flags');
      Object.keys(s.flags).forEach(function (f) { if (s.flags[f] !== null && typeof s.flags[f] === 'object') fail('flag ' + f + ' is not a plain value'); });
      if (!Array.isArray(s.inventory) || s.inventory.some(function (id, i) { return !story.items[id] || s.inventory.indexOf(id) !== i; })) fail('inventory has an unknown or repeated item');
      if (!obj(s.items)) fail('items must be an object');
      Object.keys(s.items).forEach(function (id) {
        var m = s.items[id];
        if (!story.items[id] || !Array.isArray(m) || m.some(function (x, i) { return marksOf(story).indexOf(x) === -1 || m.indexOf(x) !== i; })) fail('bad marks on item ' + id);
      });
      if (typeof s.objective !== 'string') fail('objective must be text');
      if (typeof s.seed !== 'string' || !s.seed) fail('missing seed');
      if (!whole(s.steps, 1, Infinity)) fail('steps must be a whole number from 1');
      if (!Array.isArray(s.transcript)) fail('transcript must be a list');
      var lastN = 0;
      s.transcript.forEach(function (e, i) {
        var ok = obj(e) && whole(e.n, lastN, s.steps) && SOURCES.indexOf(e.src) !== -1 && MODES.indexOf(e.mode) !== -1
          && !!story.chapters[e.chapter] && typeof e.scene === 'string' && typeof e.node === 'string' && Array.isArray(e.runs)
          && e.runs.every(function (r) { return obj(r) && ROLES.indexOf(r.role) !== -1 && typeof r.text === 'string' && (r.who === null || typeof r.who === 'string'); });
        if (!ok) fail('transcript entry ' + i + ' is malformed');
        lastN = e.n;
      });
      if (!whole(s.presentFrom, 0, s.transcript.length)) fail('presentFrom is outside the transcript');
      if (!Array.isArray(s.taken) || s.taken.some(function (t) { return !obj(t) || !whole(t.n, 1, s.steps) || typeof t.at !== 'string' || (typeof t.c !== 'string' && typeof t.item !== 'string'); })) fail('decision log is malformed');
      if (!Array.isArray(s.contextDone) || s.contextDone.some(function (x) { return typeof x !== 'string'; })) fail('contextDone must be a list of ids');
      // Every resolved check must be a check of this story, with the roll this seed gives it.
      if (!obj(s.checks)) fail('checks must be an object');
      var known = checksOf(story);
      Object.keys(s.checks).forEach(function (id) {
        var r = s.checks[id];
        if (!known[id] || known[id].length !== 1) fail('unknown check ' + id);
        var ck = known[id][0].check;
        if (!obj(r) || !whole(r.roll, 1, ck.sides) || !whole(r.bonus, -Infinity, Infinity) || typeof r.ok !== 'boolean') fail('check ' + id + ' is malformed');
        if (has(r, 'attempt') && (!whole(r.attempt, 1, s.attempt || 0))) fail('check ' + id + ' names an attempt this state has not reached');
        if (r.roll !== rollFor(s.seed, id, ck.sides, r.attempt || 0) || r.ok !== passes(ck, r.roll, r.bonus)) fail('check ' + id + ' does not match its seed: refusing a changed roll');
      });
      var presented = s.presentFrom;
      if (env.cursor !== undefined) {
        if (!obj(env.cursor) || !whole(env.cursor.presented, 0, Infinity)) fail('cursor is malformed');
        presented = Math.max(s.presentFrom, Math.min(s.transcript.length, env.cursor.presented));
      }
      var out = { ok: true, state: s, cursor: { presented: presented } };
      if (env.points !== undefined) {
        var pv = checkPoints(story, env, s);
        out.points = pv.points;
        if (pv.dropped.length) out.pointsDropped = pv.dropped;
      }
      return out;
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  // Restore points (docs/96) -----------------------------------------------------------------------
  // points = { checkpoint: { chapter, state, cursor } | null, retry: { at, input, state, cursor } | null }
  //   checkpoint  the state as it stood on entering the current chapter (with everything earlier
  //               chapters left in it), and how far its text had been presented (none of it);
  //   retry       the state immediately before the latest decision (a choice, or SHOW / USE), fully
  //               presented, with the decision it preceded.
  // Each is a complete, genuine state, recorded atomically with the step that made it (trackPoints)
  // and saved in the same envelope as the live state. A point is validated exactly like a save
  // (restore), and must share the live state's seed and precede its attempt; an invalid point is
  // dropped (its control becomes unavailable), never fatal to the save itself.
  function checkPoints(story, env, live) {
    var kept = { checkpoint: null, retry: null };
    var dropped = [];
    var obj = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
    var P = obj(env.points) ? env.points : {};
    if (!obj(env.points)) dropped.push('points is not an object');
    ['checkpoint', 'retry'].forEach(function (kind) {
      var p = P[kind];
      if (p === null || p === undefined) return;
      var why = null;
      if (!obj(p) || !obj(p.state) || !obj(p.cursor)) why = 'malformed';
      else {
        var r = restore(story, { schema: SAVE_SCHEMA, story: story.id, version: story.version, state: p.state, cursor: p.cursor });
        if (!r.ok) why = r.reason;
        else if (p.state.seed !== live.seed) why = 'another playthrough (seed)';
        else if ((p.state.attempt || 0) > (live.attempt || 0)) why = 'a later attempt than the live state';
        else if (kind === 'checkpoint' && (p.chapter !== p.state.chapter || p.state.node !== story.chapters[p.state.chapter].start)) why = 'not a chapter entry';
        else if (kind === 'retry' && (p.at !== at(p.state) || !obj(p.input))) why = 'not a decision point';
        if (!why) kept[kind] = { state: r.state, cursor: r.cursor };
        if (!why && kind === 'checkpoint') kept.checkpoint.chapter = p.chapter;
        if (!why && kind === 'retry') { kept.retry.at = p.at; kept.retry.input = clone(p.input); }
      }
      if (why) dropped.push(kind + ': ' + why);
    });
    return { points: kept, dropped: dropped };
  }
  // The points after one committed step: `before` is the state the step was taken from (null for
  // begin), `result` what step() / begin() returned. A new playthrough (restart) starts with none;
  // entering a chapter records its entry; a decision records the state just before it.
  function trackPoints(story, points, before, input, result) {
    requireStory(story);
    var p = { checkpoint: (points && points.checkpoint) || null, retry: (points && points.retry) || null };
    var evs = result.events || [];
    var restarted = evs.some(function (e) { return e.t === 'restart'; });
    if (restarted) p = { checkpoint: null, retry: null };
    if (evs.some(function (e) { return e.t === 'chapter'; })) {
      p.checkpoint = { chapter: result.state.chapter, state: result.state, cursor: { presented: result.state.presentFrom } };
    }
    if (before && input && !restarted && (input.choice !== undefined || input.verb === 'show' || input.verb === 'use')) {
      p.retry = { at: at(before), input: clone(input), state: before, cursor: { presented: before.transcript.length } };
    }
    return p;
  }
  // Is the `kind` point usable for the ending `cause` (Rules.endCause) the state stands on?
  //   retry       its decision is exactly the one that caused the ending, at the node it came from;
  //   checkpoint  it is the entry of the chapter the state is in.
  function canRestore(story, state, points, kind, cause) {
    var p = points && points[kind];
    if (!p || !p.state || p.state.seed !== state.seed) return false;
    if (kind === 'retry') return !!cause && p.at === cause.from && (cause.choice !== undefined ? p.input.choice === cause.choice : p.input.item === cause.item && p.input.verb === cause.verb);
    if (kind === 'checkpoint') return p.chapter === state.chapter;
    return false;
  }
  // The restore itself: the point's state, exactly, in a NEW attempt. attempt is always the live
  // state's + 1, never the point's, so no restore (however old the point) can reuse a namespace,
  // and every check resolved from here on rolls fresh. Checks the point already holds (earlier
  // chapters, earlier decisions) are kept as they are. A checkpoint drops the retry point (it
  // belongs to the abandoned course of play); a retry keeps the checkpoint.
  function restoreFrom(story, state, points, kind) {
    requireStory(story);
    var p = points && points[kind];
    if (!p || !p.state) return { ok: false, reason: 'no ' + kind + ' point' };
    if (p.state.seed !== state.seed) return { ok: false, reason: kind + ' point belongs to another playthrough' };
    var s = copyJson(p.state);
    s.attempt = (state.attempt || 0) + 1;
    return { ok: true, state: s, cursor: { presented: p.cursor.presented }, points: { checkpoint: points.checkpoint || null, retry: kind === 'checkpoint' ? null : points.retry || null } };
  }

  // A save written by another content revision of the same story (docs/84 section 6). The story's
  // `version` changes with every content change, so restore() alone would refuse every older save.
  // migrate() keeps a save only when everything it refers to still exists with the same meaning:
  //   - its chapter, node, excursion opener and every transcript chapter (restore() checks these);
  //   - every decision-log entry: the node it was taken at and the choice or item entry it names;
  //   - every resolved check, with the same sides (restore() re-derives the roll from the seed);
  //   - its flags: newly declared flags are added with their initial value (the one migration
  //     performed); a flag the save holds that is no longer declared makes it incompatible;
  //   - its items and marks (restore()).
  // Otherwise it returns { ok: false, reason } and the caller starts fresh. It never half-migrates.
  function migrate(story, saved) {
    try {
      requireStory(story);
      var env = typeof saved === 'string' ? JSON.parse(saved) : clone(saved);
      if (!env || env.schema !== SAVE_SCHEMA) return { ok: false, reason: 'not a ' + SAVE_SCHEMA + ' save' };
      if (env.story !== story.id) return { ok: false, reason: 'save is for another story (' + env.story + ')' };
      if (env.version === story.version) return restore(story, env);
      var s = env.state;
      if (!s || typeof s !== 'object' || !s.flags || typeof s.flags !== 'object') return { ok: false, reason: 'state is malformed' };
      var notes = [];
      var declared = story.initialState.flags;
      var gone = Object.keys(s.flags).filter(function (f) { return !has(declared, f); });
      if (gone.length) return { ok: false, reason: 'incompatible content revision: flags no longer declared: ' + gone.join(', ') };
      Object.keys(declared).forEach(function (f) {
        if (!has(s.flags, f)) { s.flags[f] = clone(declared[f]); notes.push('added flag ' + f); }
      });
      var bad = (Array.isArray(s.taken) ? s.taken : []).filter(function (t) {
        var parts = String(t.at).split(':');
        var ch = story.chapters[parts[0]];
        var n = ch && ch.nodes[parts.slice(1).join(':')];
        if (!n) return true;
        if (typeof t.c === 'string') return !n.choices.some(function (c) { return c.id === t.c; });
        return !(n[t.verb] && n[t.verb][t.item]);
      });
      if (bad.length) return { ok: false, reason: 'incompatible content revision: decisions refer to removed nodes or choices: ' + bad.map(function (t) { return t.at + ' ' + (t.c || t.verb + ' ' + t.item); }).join('; ') };
      if (env.points && typeof env.points === 'object') {
        ['checkpoint', 'retry'].forEach(function (kind) {
          var p = env.points[kind];
          if (!p || typeof p !== 'object') return;
          var m = migrate(story, { schema: SAVE_SCHEMA, story: env.story, version: env.version, state: p.state, cursor: p.cursor });
          if (m.ok) p.state = m.state; else env.points[kind] = null;
        });
      }
      env.version = story.version;
      var r = restore(story, env);
      if (!r.ok) return { ok: false, reason: 'incompatible content revision: ' + r.reason };
      r.migrated = { from: saved && (typeof saved === 'string' ? JSON.parse(saved).version : saved.version), to: story.version, notes: notes };
      return r;
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  // What to present after a restore: the latest step's paragraphs from the safe point on, as the
  // text and echo events step() gave, on the surface now showing. Earlier unpresented entries
  // that belong to another surface (an echo in the dialogue box before the step moved to B) are
  // not replayed there; they are already in the history (`elsewhere`). Nothing else is replayed.
  function resume(story, state, cursor) {
    requireStory(story);
    var t = state.transcript;
    var from = state.presentFrom;
    if (cursor && typeof cursor.presented === 'number') from = Math.max(from, Math.min(t.length, cursor.presented));
    var mode = surfaceOf(story, here(story, state));
    var elsewhere = [];
    while (from < t.length && t[from].mode !== mode) elsewhere.push(from++);
    var events = [];
    var last = null;
    for (var i = from; i < t.length; i++) {
      var e = t[i];
      if (last && last.n === e.n && last.src === e.src && last.mode === e.mode) { last.ev.paras.push(e.runs); continue; }
      var ev = e.src === 'echo' ? { t: 'echo', role: e.runs[0].role, who: YOU, surface: e.mode, paras: [e.runs] } : { t: 'text', surface: e.mode, paras: [e.runs] };
      events.push(ev);
      last = { n: e.n, src: e.src, mode: e.mode, ev: ev };
    }
    return { from: from, elsewhere: elsewhere, events: events };
  }

  // Validation of a v2 story --------------------------------------------------------------------
  // Shape first (every authored field), then a walk of every reachable state (as v1's validate):
  // no dead end, everything authored is reachable, an ending is reachable from everywhere.
  function validateStory(story, charset, opts) {
    var o = opts || {};
    var errors = [];
    // charset: the characters every face draws (an array), or { locked, text } (docs/104 section 5):
    // `locked` = the locked face (choice cards, the player's own lines and actions, item names; every
    // field is checked against it as before), `text` = what the baked Dialogue/Labels/Objective faces
    // draw, used only for narration, NPC speech and directions in node text and results.
    var chars = charset ? new Set(Array.isArray(charset) ? charset : charset.locked) : null;
    var textChars = charset ? new Set(Array.isArray(charset) ? charset : charset.text) : null;
    var compat = story && story.compat === 'v1';
    function err(where, msg) { errors.push(where + ': ' + msg); }
    function obj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
    function onlyKeys(where, v, keys) {
      Object.keys(v).forEach(function (k) { if (keys.indexOf(k) === -1) err(where, 'unknown field ' + k); });
    }

    if (!obj(story) || story.schema !== STORY_SCHEMA) return { ok: false, errors: ['story: schema must be ' + STORY_SCHEMA] };
    onlyKeys('story', story, STORY_KEYS);
    if (typeof story.id !== 'string' || !/^[a-z0-9_-]+$/.test(story.id)) err('story', 'id must be a lower-case identifier');
    if (!(story.version >= 1 && story.version % 1 === 0)) err('story', 'version must be a whole number from 1');
    if (['production', 'fixture'].indexOf(story.profile) === -1) err('story', 'profile must be production or fixture');
    if (typeof story.save !== 'boolean') err('story', 'save must be true or false');
    if (has(story, 'compat') && story.compat !== 'v1') err('story', 'compat may only be v1 (set by Rules.fromV1)');
    var init = story.initialState;
    if (!obj(init) || !obj(init.flags) || !Array.isArray(init.inventory) || !obj(init.items)) {
      return { ok: false, errors: errors.concat(['story: initialState needs flags {}, inventory [] and items {}']) };
    }
    onlyKeys('initialState', init, ['flags', 'inventory', 'items']);
    if (!obj(story.chapters) || !Object.keys(story.chapters).length) return { ok: false, errors: errors.concat(['story: needs chapters']) };
    var items = obj(story.items) ? story.items : {};
    var cast = obj(story.cast) ? story.cast : {};
    var assets = obj(story.assets) ? story.assets : {};
    if (!obj(story.items)) err('story', 'items must be an object');
    if (!obj(story.cast)) err('story', 'cast must be an object');
    if (!obj(story.assets)) err('story', 'assets must be an object');
    var knownFlags = Object.keys(init.flags);
    var allMarks = marksOf(story);
    if (story.marks !== undefined) {
      if (!Array.isArray(story.marks)) err('story', 'marks must be a list of mark names');
      else story.marks.forEach(function (m, i) {
        if (typeof m !== 'string' || !/^[a-z0-9_]+$/.test(m)) err('story', 'marks[' + i + '] must be a lower-case name');
        else if (MARKS.indexOf(m) !== -1 || story.marks.indexOf(m) !== i) err('story', 'mark ' + m + ' is declared twice or is an engine mark');
      });
    }
    init.inventory.forEach(function (id) { if (!items[id]) err('initialState', 'unknown item ' + id); });
    // Check ids are unique across the whole story (every chapter, choice and SHOW/USE entry):
    // the roll and state.checks are keyed by id alone (docs/73 C2).
    var allChecks = checksOf(story);
    Object.keys(allChecks).forEach(function (id) {
      if (allChecks[id].length > 1) err('check ' + id, 'id is used more than once (' + allChecks[id].map(function (c) { return c.at; }).join('; ') + '); check ids must be unique across the story');
    });

    function text(where, s, face) {
      if (typeof s !== 'string' || !s.trim()) return err(where, 'empty text');
      var set = face === 'text' ? textChars : chars;
      if (set) {
        var bad = Array.from(new Set(s.replace(/\n/g, '').split(''))).filter(function (ch) { return !set.has(ch); });
        if (bad.length) err(where, 'characters the fonts cannot draw: ' + bad.join(' '));
      }
    }
    function cond(where, c) {
      if (c === undefined) return;
      if (!obj(c)) return err(where, 'a condition must be an object');
      Object.keys(c).forEach(function (k) {
        if (COND_KEYS_V2.indexOf(k) === -1) return err(where, 'unknown condition ' + k);
        var v = c[k];
        if (CHECK_CONDS.indexOf(k) !== -1) { if (!allChecks[v]) err(where, k + ' names an unknown check ' + v); return; }
        var flag = k === 'flagIs' ? v[0] : (k === 'flag' || k === 'notFlag') ? v : null;
        if (flag !== null && knownFlags.indexOf(flag) === -1) err(where, 'unknown flag ' + flag);
        var item = k === 'item' || k === 'itemNot' ? v[0] : (k === 'has' || k === 'lacks') ? v : null;
        if (item !== null && !items[item]) err(where, 'unknown item ' + item);
        if ((k === 'item' || k === 'itemNot') && allMarks.indexOf(v[1]) === -1) err(where, 'unknown item mark ' + v[1]);
      });
    }
    function plainField(where, f) {
      // A string or variants of strings (objectives, item descriptions): no runs.
      if (typeof f === 'string') return text(where, f);
      if (!isVariants(f)) return err(where, 'must be text or a list of { if, text } variants');
      variants(where, f, function (w, t) { if (typeof t !== 'string') err(w, 'must be plain text here'); else text(w, t); });
    }
    function variants(where, f, each) {
      f.forEach(function (v, i) {
        onlyKeys(where + '[' + i + ']', v, ['if', 'text']);
        cond(where + '[' + i + ']', v.if);
        each(where + '[' + i + ']', v.text);
      });
      if (f[f.length - 1].if) err(where, 'last variant must have no condition, so something is always said');
    }
    // face 'text' (node text and results): plain strings, directions and a named cast member's speech
    // are drawn in the Dialogue face; the player's actions and own speech always in the locked face.
    function runs(where, t, face) {
      if (typeof t === 'string') return text(where, t, face);
      if (!Array.isArray(t) || !t.length) return err(where, 'must be text, runs or variants');
      t.forEach(function (r, i) {
        var w = where + ' run ' + i;
        if (typeof r === 'string') return text(w, r, face);
        if (!obj(r)) return err(w, 'a run is a string or one { say | act | desc | think } object');
        var roles = Object.keys(r).filter(function (k) { return has(RUN_ROLES, k); });
        Object.keys(r).forEach(function (k) { if (!has(RUN_ROLES, k) && k !== 'who' && k !== 'if') err(w, 'unknown run key ' + k); });
        // A conditional run (game issue #27): shown only where its condition holds (proved by the walk).
        if (has(r, 'if')) { if (!obj(r.if) || !Object.keys(r.if).length) err(w, 'a run condition must be a non-empty condition object'); else cond(w + ' if', r.if); }
        if (roles.length !== 1) return err(w, 'a run needs exactly one of say, act, desc, think (has ' + (roles.join(' ') || 'none') + ')');
        if (roles[0] === 'think') err(w, 'think runs are reserved for the thought contract (docs/72 section 8.3)');
        if (has(r, 'who') && roles[0] !== 'say') err(w, 'who is only for say runs');
        if (has(r, 'who') && r.who !== YOU && !cast[r.who]) err(w, 'unknown speaker ' + r.who);
        var npcFace = face === 'text' && (roles[0] === 'desc' || (roles[0] === 'say' && has(r, 'who') && r.who !== YOU));
        text(w, r[roles[0]], npcFace ? 'text' : undefined);
      });
    }
    function textField(where, f, face) {
      if (isVariants(f)) return variants(where, f, function (w, t) { runs(w, t, face); });
      if (Array.isArray(f) && f.some(function (v) { return obj(v) && has(v, 'text'); })) return err(where, 'mixes runs and { if, text } variants');
      runs(where, f, face);
    }
    function effects(where, fx) {
      if (fx === undefined) return;
      var list = Array.isArray(fx) ? fx : [fx];
      if (!list.length) err(where, 'an effects list must not be empty');
      list.forEach(function (e, i) {
        var w = Array.isArray(fx) ? where + ' effects[' + i + ']' : where + ' effects';
        if (!obj(e)) return err(w, 'must be an object');
        cond(w, e.if);
        var keys = Object.keys(e).filter(function (k) { return k !== 'if'; });
        if (!keys.length) err(w, 'does nothing');
        keys.forEach(function (k) {
          var v = e[k];
          if (EFFECT_KEYS_V2.indexOf(k) === -1) return err(w, 'unknown effect ' + k);
          if (k === 'set') Object.keys(v).forEach(function (f) { if (knownFlags.indexOf(f) === -1) err(w, 'sets unknown flag ' + f); });
          if (k === 'give' || k === 'take') v.forEach(function (id) { if (!items[id]) err(w, 'unknown item ' + id); });
          if (k === 'mark') v.forEach(function (p) {
            if (!items[p[0]]) err(w, 'unknown item ' + p[0]);
            if (allMarks.indexOf(p[1]) === -1) err(w, 'unknown item mark ' + p[1]);
          });
          if (k === 'objective') plainField(w + ' objective', v);
        });
      });
    }
    function context(where, a) {
      if (a === null) return;
      if (!obj(a)) return err(where, 'must be an object or null');
      onlyKeys(where, a, ['id', 'label', 'glyph', 'text', 'once', 'spentWhy']);
      if (typeof a.id !== 'string' || !a.id) err(where, 'needs an id');
      text(where + ' label', a.label);
      if (typeof a.glyph !== 'string' || !/^[a-z0-9_]+$/.test(a.glyph)) err(where, 'needs an action glyph name');
      text(where + ' text', a.text);
      if (a.once !== undefined && typeof a.once !== 'boolean') err(where, 'once must be true or false');
      if (a.spentWhy !== undefined) text(where + ' spentWhy', a.spentWhy);
      if (a.once && a.spentWhy === undefined) err(where, 'a once action needs spentWhy for its spent tooltip');
    }

    function checkSpec(where, ck) {
      if (!obj(ck)) return err(where, 'check must be an object');
      var before = errors.length;
      onlyKeys(where, ck, CHECK_KEYS);
      if (typeof ck.id !== 'string' || !/^[a-z0-9_-]+$/.test(ck.id)) err(where, 'check needs a lower-case id');
      if (SIDES.indexOf(ck.sides) === -1) return err(where, 'sides must be 6 or 100');
      var whole = function (v) { return typeof v === 'number' && v % 1 === 0; };
      if (!whole(ck.need)) return err(where, 'need must be a whole number');
      if (ck.fumble !== undefined && !(whole(ck.fumble) && ck.fumble >= 0 && ck.fumble < ck.sides)) err(where, 'fumble must be a whole number from 0 below sides');
      if (ck.cap !== undefined && !(whole(ck.cap) && ck.cap > 0)) err(where, 'cap must be a whole number above 0');
      if (ck.certain !== undefined && ck.certain !== true) err(where, 'certain must be true when present');
      if (ck.mods !== undefined) {
        if (!Array.isArray(ck.mods)) err(where, 'mods must be a list');
        else ck.mods.forEach(function (m, i) {
          var w = where + ' mods[' + i + ']';
          if (!obj(m)) return err(w, 'must be an object');
          onlyKeys(w, m, ['if', 'add']);
          if (!whole(m.add) || m.add === 0) err(w, 'add must be a whole number other than 0');
          cond(w, m.if);
        });
      }
      if (errors.length > before) return; // odds are only meaningful for a well-formed check
      if (chanceOf(ck, 0) === 0) err(where, 'base chance is 0% (gate the choice with if instead)');
      if (!ck.certain && chanceOf(ck, maxBonus(ck)) === 1) err(where, 'mods can make it certain (100%); an item must not be a guaranteed bypass unless the check is marked certain');
    }
    function outcomeSpec(where, o, n, chId) {
      if (!obj(o)) return err(where, 'needs a pass and a fail outcome');
      onlyKeys(where, o, OUTCOME_KEYS);
      if (o.result !== undefined) textField(where + ' result', o.result, 'text');
      effects(where, o.effects);
      destinations(where, o, n, chId, false);
    }
    // A choice or SHOW/USE entry with a check: its consequences live in pass and fail.
    function checked(where, c, n, chId) {
      if (!c.check) {
        if (has(c, 'pass') || has(c, 'fail')) err(where, 'pass and fail are only for a choice with a check');
        return;
      }
      checkSpec(where + ' check', c.check);
      DESTINATIONS.concat(['result']).forEach(function (k) { if (has(c, k)) err(where, k + ' goes in pass and fail when there is a check'); });
      outcomeSpec(where + ' pass', c.pass, n, chId);
      outcomeSpec(where + ' fail', c.fail, n, chId);
    }

    // Assets: registered ids, and every registered id referenced (nothing orphaned).
    var refs = { scenes: {}, portraits: {}, focus: {}, layers: {}, textLed: {} };
    function assetPath(where, p) {
      if (p === null) { if (story.profile !== 'fixture') err(where, 'null art is only allowed in a fixture story'); return; }
      if (typeof p !== 'string' || !/\.png$/.test(p)) return err(where, 'must be a .png path or null');
      if (story.profile === 'production' && /(^|\/)(source|originals|review)\//.test(p)) err(where, 'production art may not come from source/, originals/ or review/');
    }
    var scenes = obj(assets.scenes) ? assets.scenes : {};
    var portraits = obj(assets.portraits) ? assets.portraits : {};
    var focusArt = obj(assets.focus) ? assets.focus : {};
    onlyKeys('assets', assets, ['scenes', 'portraits', 'focus', 'sceneStates', 'textLedScenes', 'artStates']);
    // docs/137 C1: text-led scenes are listed ids with no image (the previous scene image is held).
    var textLedList = [];
    if (has(assets, 'textLedScenes')) {
      if (!Array.isArray(assets.textLedScenes)) err('assets.textLedScenes', 'must be a list of scene ids');
      else assets.textLedScenes.forEach(function (id, i) {
        if (typeof id !== 'string' || !/^[a-z0-9_]+\/[a-z0-9_]+$/.test(id)) err('assets.textLedScenes[' + i + ']', 'id must be location/scene');
        else if (textLedList.indexOf(id) !== -1) err('assets.textLedScenes', 'lists ' + id + ' twice');
        else if (has(obj(assets.scenes) ? assets.scenes : {}, id)) err('assets.textLedScenes', id + ' is also registered as scene art');
        else textLedList.push(id);
      });
    }
    Object.keys(scenes).forEach(function (id) {
      if (!/^[a-z0-9_]+\/[a-z0-9_]+$/.test(id)) err('assets.scenes ' + id, 'id must be location/scene');
      assetPath('assets.scenes ' + id, scenes[id]);
    });
    // A close-up is one image, or semantic pages (docs/92 section 2): { pages: [{ path, paragraphs }] },
    // each picture paired with that many paragraphs of the focus node's text, in order.
    Object.keys(focusArt).forEach(function (id) {
      // location/scene/target, or (game issue #27, docs/140 WP-1) the canonical two-part location/target.
      if (!/^[a-z0-9_]+(\/[a-z0-9_]+){1,2}$/.test(id)) err('assets.focus ' + id, 'id must be location/target or location/scene/target');
      var f = focusArt[id];
      if (!obj(f)) return assetPath('assets.focus ' + id, f);
      onlyKeys('assets.focus ' + id, f, ['pages']);
      if (!Array.isArray(f.pages) || f.pages.length < 2) return err('assets.focus ' + id, 'pages must list two or more { path, paragraphs }');
      f.pages.forEach(function (pg, i) {
        var pw = 'assets.focus ' + id + ' page ' + (i + 1);
        if (!obj(pg)) return err(pw, 'must be an object');
        onlyKeys(pw, pg, ['path', 'paragraphs']);
        assetPath(pw, pg.path);
        if (typeof pg.paragraphs !== 'number' || pg.paragraphs < 1 || Math.floor(pg.paragraphs) !== pg.paragraphs) err(pw, 'paragraphs must be a whole number, 1 or more');
      });
    });
    Object.keys(portraits).forEach(function (id) {
      var p = portraits[id];
      var w = 'assets.portraits ' + id;
      if (obj(p) && has(p, 'views')) {
        // Opaque-complete (docs/92 section 1): one whole image per location, no layers.
        if (!obj(p.views) || !Object.keys(p.views).length) return err(w, 'views must name one complete image per location');
        onlyKeys(w, p, ['views', 'view']);
        Object.keys(p.views).forEach(function (v) { assetPath(w + ' view ' + v, p.views[v]); });
        if (!has(p.views, p.view)) err(w, 'default view ' + p.view + ' is not registered');
        refs.layers[id + ':view:' + p.view] = true;
        return;
      }
      if (!obj(p) || !obj(p.backgrounds) || !obj(p.poses)) return err(w, 'needs backgrounds {} and poses {} (or views {} for an opaque-complete portrait)');
      onlyKeys(w, p, ['backgrounds', 'poses', 'background', 'pose']);
      Object.keys(p.backgrounds).forEach(function (b) { assetPath(w + ' background ' + b, p.backgrounds[b]); });
      Object.keys(p.poses).forEach(function (b) { assetPath(w + ' pose ' + b, p.poses[b]); });
      if (!has(p.backgrounds, p.background)) err(w, 'default background ' + p.background + ' is not registered');
      if (!has(p.poses, p.pose)) err(w, 'default pose ' + p.pose + ' is not registered');
      refs.layers[id + ':background:' + p.background] = true;
      refs.layers[id + ':pose:' + p.pose] = true;
    });
    function sceneRef(where, id) {
      if (textLedList.indexOf(id) !== -1) { refs.textLed[id] = true; return; }
      if (!has(scenes, id)) return err(where, 'unregistered scene ' + id);
      refs.scenes[id] = true;
    }

    // Cast, items, files, context action.
    Object.keys(cast).forEach(function (id) {
      var c = cast[id];
      if (id === YOU) err('cast ' + id, 'you is reserved for the player');
      if (!obj(c)) return err('cast ' + id, 'must be an object');
      onlyKeys('cast ' + id, c, ['name', 'portrait']);
      text('cast ' + id + ' name', c.name);
      // A cast member without a portrait is an incidental voice (docs/104 section 4) or a voice-only
      // speaker (docs/137 C2). It speaks in `say` runs ({ say, who }); when it leads a dialogue node
      // that node is presented on Narrative B.
      if (!has(c, 'portrait')) return;
      if (!has(portraits, c.portrait)) err('cast ' + id, 'unregistered portrait ' + c.portrait);
      else refs.portraits[c.portrait] = true;
    });
    Object.keys(items).forEach(function (id) {
      var it = items[id];
      var w = 'item ' + id;
      onlyKeys(w, it, ['name', 'slotArt', 'inspectArt', 'description', 'read', 'inspect']);
      text(w + ' name', it.name);
      plainField(w + ' description', it.description);
      if (it.read !== undefined) {
        if (!obj(it.read)) err(w, 'read must be an object');
        else { onlyKeys(w + ' read', it.read, ['effects']); effects(w + ' read', it.read.effects); }
      }
      if (it.inspect !== undefined) {
        if (!obj(it.inspect)) err(w, 'inspect must be an object');
        else {
          onlyKeys(w + ' inspect', it.inspect, ['effects', 'once']);
          if (it.inspect.once !== undefined && typeof it.inspect.once !== 'boolean') err(w + ' inspect', 'once must be true or false');
          if (it.inspect.effects === undefined) err(w + ' inspect', 'needs effects');
          effects(w + ' inspect', it.inspect.effects);
        }
      }
    });
    (story.files || []).forEach(function (f, i) {
      onlyKeys('files[' + i + ']', f, ['if', 'text']);
      text('files[' + i + ']', f.text);
      cond('files[' + i + ']', f.if);
    });
    if (story.contextAction !== undefined) context('contextAction', story.contextAction);

    // Chapters, nodes, choices.
    var chapterIds = Object.keys(story.chapters);
    if (!story.chapters[story.start]) err('story', 'start chapter ' + story.start + ' does not exist');
    var endings = 0;
    var onceKeys = {};
    var counts = { nodes: 0, choices: 0 };
    function destinations(where, d, n, chId, allowRestart) {
      var ds = DESTINATIONS.filter(function (k) { return has(d, k); });
      if (ds.length > 1) err(where, 'has more than one destination (' + ds.join(' ') + ')');
      if (has(d, 'to') && !story.chapters[chId].nodes[d.to]) err(where, 'leads to missing node ' + d.to);
      if (has(d, 'chapter') && !story.chapters[d.chapter]) err(where, 'leads to missing chapter ' + d.chapter);
      if (has(d, 'back')) {
        if (d.back !== true) err(where, 'back must be true');
        if (n.mode !== 'focus' && n.mode !== 'dialogue') err(where, 'back is only for focus or dialogue nodes (a return from an excursion)');
      }
      if (has(d, 'restart') && !allowRestart) err(where, 'restart is not allowed here');
      return ds;
    }
    chapterIds.forEach(function (chId) {
      var ch = story.chapters[chId];
      var cw = 'chapter ' + chId;
      if (!obj(ch) || !obj(ch.nodes)) return err(cw, 'needs nodes');
      onlyKeys(cw, ch, CHAPTER_KEYS);
      text(cw + ' title', ch.title);
      sceneRef(cw, ch.scene);
      var start = ch.nodes[ch.start];
      if (!start) err(cw, 'start node ' + ch.start + ' does not exist');
      else if (start.mode !== 'narrative' && start.mode !== 'dialogue') err(cw, 'start node must be narrative or dialogue');
      Object.keys(ch.nodes).forEach(function (id) {
        var n = ch.nodes[id];
        var w = 'node ' + chId + ':' + id;
        counts.nodes++;
        if (!obj(n)) return err(w, 'must be an object');
        onlyKeys(w, n, NODE_KEYS);
        if (MODES.indexOf(n.mode) === -1) err(w, 'mode must be dialogue, narrative or focus');
        if (n.scene !== undefined) sceneRef(w, n.scene);
        if (n.mode === 'dialogue') {
          if (!cast[n.speaker]) err(w, 'a dialogue node needs a speaker from the cast');
          else if (!has(cast[n.speaker], 'portrait')) {
            // docs/137 C2: a speaker without a portrait may lead a dialogue node; it is presented on
            // Narrative B with its lines labelled. It has no pose or backdrop to choose.
            ['pose', 'backdrop'].forEach(function (k) { if (has(n, k)) err(w, k + ' is not available to ' + n.speaker + ', which has no portrait'); });
          } else {
            var reg = portraits[cast[n.speaker].portrait] || { backgrounds: {}, poses: {} };
            if (obj(reg.views)) {
              if (n.pose !== undefined) err(w, 'an opaque-complete portrait has no poses (pose ' + n.pose + ')');
              if (n.backdrop !== undefined) { if (!has(reg.views, n.backdrop)) err(w, 'unregistered complete view ' + n.backdrop); else refs.layers[cast[n.speaker].portrait + ':view:' + n.backdrop] = true; }
            } else {
              if (n.pose !== undefined) { if (!has(reg.poses, n.pose)) err(w, 'unregistered pose ' + n.pose); else refs.layers[cast[n.speaker].portrait + ':pose:' + n.pose] = true; }
              if (n.backdrop !== undefined) { if (!has(reg.backgrounds, n.backdrop)) err(w, 'unregistered backdrop ' + n.backdrop); else refs.layers[cast[n.speaker].portrait + ':background:' + n.backdrop] = true; }
            }
          }
        } else {
          ['speaker', 'pose', 'backdrop', 'show'].forEach(function (k) { if (has(n, k)) err(w, k + ' is for dialogue nodes only'); });
          if (has(n, 'contextAction') && n.contextAction !== null) err(w, 'the context action is dialogue-only until the thought contract');
        }
        if (n.mode === 'focus') {
          if (typeof n.focus !== 'string') err(w, 'a focus node needs a focus id');
          else if (!has(focusArt, n.focus)) err(w, 'unregistered focus ' + n.focus);
          else {
            refs.focus[n.focus] = true;
            var paged = obj(focusArt[n.focus]) && Array.isArray(focusArt[n.focus].pages) ? focusArt[n.focus].pages : null;
            if (paged) {
              // Each picture is paired with its own paragraphs: the node's one text must have exactly
              // as many paragraphs as the pages claim, or a picture would show beside the wrong text.
              var want = paged.reduce(function (a, pg) { return a + (obj(pg) ? pg.paragraphs : 0); }, 0);
              if (isVariants(n.text)) err(w, 'a paged focus node needs one text, not variants');
              else if (Array.isArray(n.text) && n.text.some(function (r) { return obj(r) && has(r, 'if'); })) err(w, 'a paged focus node cannot have conditional runs (each picture is paired with fixed paragraphs)');
              else if (typeof n.text === 'string' || Array.isArray(n.text)) {
                var got = toParas(n.text, arrivalCtx(n)).filter(function (p) { return p.length; }).length;
                if (got !== want) err(w, 'its text has ' + got + ' paragraphs; the pages of ' + n.focus + ' pair ' + want);
              }
            }
          }
        } else if (has(n, 'focus')) err(w, 'focus is for focus nodes only');
        if (has(n, 'scenePickup')) {
          var pickup = n.scenePickup;
          if (n.mode !== 'focus') err(w, 'scenePickup requires focus mode');
          if (!obj(pickup)) err(w, 'scenePickup must be an object');
          else {
            onlyKeys(w + ' scenePickup', pickup, ['id', 'title', 'item', 'readChoice', 'useChoice', 'closeChoice']);
            if (typeof pickup.id !== 'string' || !/^[a-z0-9_]+$/.test(pickup.id)) err(w + ' scenePickup', 'id must be a stable lower-case identifier');
            text(w + ' scenePickup title', pickup.title);
            if (!items[pickup.item]) err(w + ' scenePickup', 'unregistered source-specific item ' + pickup.item);
            ['readChoice', 'useChoice', 'closeChoice'].forEach(function (key) {
              if (pickup[key] == null) {
                if (key === 'closeChoice' || key === 'useChoice') err(w + ' scenePickup', key + ' must be declared');
                return;
              }
              if (typeof pickup[key] !== 'string' || !n.choices.some(function (c) { return c.id === pickup[key]; }))
                err(w + ' scenePickup', key + ' must name a real authored card on this node');
            });
          }
        }
        if (n.objective !== undefined) plainField(w + ' objective', n.objective);
        effects(w, n.effects);
        textField(w + ' text', n.text, 'text');
        if (has(n, 'contextAction')) context(w + ' contextAction', n.contextAction);
        if (n.end !== undefined && n.end !== true) err(w, 'end must be true when present');
        if (n.end) endings++;
        if (!Array.isArray(n.choices) || !n.choices.length) return err(w, 'has no choices (every node needs at least one card)');
        var seen = {};
        n.choices.forEach(function (c, i) {
          counts.choices++;
          var x = w + ' choice ' + (c && c.id !== undefined ? c.id : '#' + i);
          if (!obj(c)) return err(x, 'must be an object');
          onlyKeys(x, c, CHOICE_KEYS);
          if (typeof c.id !== 'string' || !c.id) err(x, 'needs an id');
          if (seen[c.id]) err(x, 'duplicate id');
          seen[c.id] = true;
          if (KINDS.indexOf(c.kind) === -1) err(x, 'kind must be spoken, action, continue or system');
          if (c.kind !== 'continue' || c.text !== undefined) {
            if (typeof c.text !== 'string') err(x, 'needs card text');
            else {
              text(x + ' text', c.text);
              if (!compat && /["[\]]/.test(c.text)) err(x, 'card text may not author quotes or brackets (marking is presentation)');
            }
          }
          if (c.say !== undefined) {
            if (c.kind !== 'spoken' && c.kind !== 'action') err(x, 'only spoken and action choices have a say echo');
            if (n.mode === 'focus' ? c.kind !== 'action' : n.mode !== 'dialogue') err(x, 'say is only echoed in dialogue nodes (and, for an action, on a Focus A node)');
            textField(x + ' say', c.say);
          }
          cond(x, c.if);
          effects(x, c.effects);
          if (c.once !== undefined && c.once !== true) err(x, 'once must be true when present');
          if (c.once) onceKeys[chId + ':' + id + ':' + c.id] = true;
          if (c.result !== undefined) textField(x + ' result', c.result, 'text');
          var ds = destinations(x, c, n, chId, true);
          checked(x, c, n, chId);
          if (has(c, 'restart')) {
            if (c.restart !== true) err(x, 'restart must be true');
            if (c.kind !== 'system') err(x, 'restart is a system choice');
            if (!n.end) err(x, 'restart is only allowed on an end node');
          } else if (c.kind === 'system') err(x, 'a system choice must restart');
          if (!ds.length && !c.once && !c.check && c.effects === undefined) err(x, 'stays here and changes nothing (needs once or effects, or a destination)');
        });
        ['show', 'use'].forEach(function (verb) {
          if (n[verb] === undefined) return;
          if (!obj(n[verb])) return err(w, verb + ' must be an object');
          Object.keys(n[verb]).forEach(function (item) {
            var e = n[verb][item];
            var x = w + ' ' + verb + ' ' + item;
            if (!items[item]) err(x, 'unknown item');
            if (!obj(e)) return err(x, 'must be an object');
            onlyKeys(x, e, ENTRY_KEYS);
            var kind = entryKind(verb, e);
            if (kind !== 'spoken' && kind !== 'action') err(x, 'kind must be spoken or action');
            if (n.mode === 'dialogue') {
              if (e.say === undefined) err(x, 'needs say: the line echoed in the dialogue box');
              else textField(x + ' say', e.say);
            } else if (e.say !== undefined) {
              // game issue #27 (docs/140): an action's say on a Focus A node is echoed on the Focus A surface.
              if (n.mode !== 'focus' || kind !== 'action') err(x, 'say is only echoed in dialogue nodes (and, for an action, on a Focus A node)');
              else textField(x + ' say', e.say);
            }
            cond(x, e.if);
            effects(x, e.effects);
            if (e.once !== undefined && e.once !== true) err(x, 'once must be true when present');
            if (e.once) onceKeys[chId + ':' + id + ':' + item + ':' + verb] = true;
            if (e.result !== undefined) textField(x + ' result', e.result, 'text');
            var ds = destinations(x, e, n, chId, false);
            checked(x, e, n, chId);
            if (!ds.length && !e.once && !e.check && e.effects === undefined) err(x, 'stays here and changes nothing (needs once or effects, or a destination)');
          });
        });
      });
    });
    if (!endings) err('story', 'no node is marked end: true');
    Object.keys(scenes).forEach(function (id) { if (!refs.scenes[id]) err('assets.scenes ' + id, 'registered but never used'); });
    textLedList.forEach(function (id) { if (!refs.textLed[id]) err('assets.textLedScenes ' + id, 'listed but never used'); });
    // A text-led scene holds the previous image, so the story cannot open on one.
    if (story.chapters[story.start] && story.chapters[story.start].nodes[story.chapters[story.start].start]) {
      var openN = story.chapters[story.start].nodes[story.chapters[story.start].start];
      if (textLedList.indexOf(openN.scene || story.chapters[story.start].scene) !== -1) err('story', 'the opening node is on a text-led scene: there is no previous image to hold');
    }
    Object.keys(focusArt).forEach(function (id) { if (!refs.focus[id]) err('assets.focus ' + id, 'registered but never used'); });
    // Scene states: on a registered scene, valid selectors, and (after the walk) each one shown.
    var sceneStates = obj(assets.sceneStates) ? assets.sceneStates : {};
    if (has(assets, 'sceneStates') && !obj(assets.sceneStates)) err('assets.sceneStates', 'must be an object');
    Object.keys(sceneStates).forEach(function (sid) {
      var w = 'assets.sceneStates ' + sid;
      if (!has(scenes, sid)) err(w, 'unregistered scene');
      var list = sceneStates[sid];
      if (!Array.isArray(list) || !list.length) return err(w, 'must be a non-empty list');
      var ids = {};
      list.forEach(function (st, i) {
        var x = w + '[' + i + ']';
        if (!obj(st)) return err(x, 'must be an object');
        onlyKeys(x, st, ['id', 'layer', 'path', 'at', 'focus', 'if']);
        if (typeof st.id !== 'string' || !/^[a-z0-9_]+$/.test(st.id)) err(x, 'id must be a lower-case id');
        else if (ids[st.id]) err(x, 'duplicate state id ' + st.id);
        else ids[st.id] = true;
        if (st.layer !== 'replace' && st.layer !== 'overlay') err(x, 'layer must be replace or overlay');
        assetPath(x, st.path);
        if (!has(st, 'at') && !has(st, 'focus') && !has(st, 'if')) err(x, 'selects nothing: it needs at, focus or if');
        if (has(st, 'at')) {
          if (!Array.isArray(st.at) || !st.at.length) err(x, 'at must be a list of chapter:node');
          else st.at.forEach(function (a) {
            var m = /^([a-z0-9_-]+):([a-z0-9_-]+)$/.exec(a);
            if (!m || !story.chapters[m[1]] || !obj(story.chapters[m[1]].nodes) || !story.chapters[m[1]].nodes[m[2]]) err(x, 'at names an unknown node ' + a);
            else if (sceneOf(story, m[1], m[2]) !== sid) err(x, 'at ' + a + ' is not in scene ' + sid);
          });
        }
        if (has(st, 'focus') && !has(focusArt, st.focus)) err(x, 'focus names an unregistered close-up ' + st.focus);
        cond(x, st.if);
      });
    });
    // Conditional art (game issue #27): bases exist, at-nodes show that base, beats begin authored text.
    var artStates = obj(assets.artStates) ? assets.artStates : {};
    if (has(assets, 'artStates') && !obj(assets.artStates)) err('assets.artStates', 'must be an object');
    var bgIds = {};
    Object.keys(portraits).forEach(function (pid) { if (obj(portraits[pid]) && obj(portraits[pid].backgrounds)) Object.keys(portraits[pid].backgrounds).forEach(function (b) { bgIds[b] = true; }); });
    function nodeBegins(chId, nid, text) {
      var t = story.chapters[chId].nodes[nid].text;
      var all = isVariants(t) ? t.map(function (v) { return v.text; }) : [t];
      return all.some(function (x) { return toParas(x, arrivalCtx(story.chapters[chId].nodes[nid])).some(function (pp) { return runsBegin(pp, text); }); });
    }
    function nodeAt(where, a) {
      var m = /^([a-z0-9_-]+):([a-z0-9_-]+)$/.exec(a);
      if (!m || !story.chapters[m[1]] || !obj(story.chapters[m[1]].nodes) || !story.chapters[m[1]].nodes[m[2]]) { err(where, 'names an unknown node ' + a); return null; }
      return m;
    }
    Object.keys(artStates).forEach(function (sk) {
      var w = 'assets.artStates ' + sk;
      var m = /^(scene|background|focus):(.+)$/.exec(sk);
      if (!m) return err(w, 'key must be scene:<id>, background:<id> or focus:<id>');
      var surface = m[1], base = m[2];
      if (surface === 'scene' && !has(scenes, base)) err(w, 'unregistered scene');
      if (surface === 'background' && !bgIds[base]) err(w, 'no portrait has this background');
      if (surface === 'focus' && !has(focusArt, base)) err(w, 'unregistered close-up');
      var list = artStates[sk];
      if (!Array.isArray(list) || !list.length) return err(w, 'must be a non-empty list');
      var ids = {};
      list.forEach(function (st, i) {
        var x = w + '[' + i + ']';
        if (!obj(st)) return err(x, 'must be an object');
        onlyKeys(x, st, ['id', 'ref', 'path', 'at', 'if', 'beat', 'until', 'after', 'region']);
        if (typeof st.id !== 'string' || !/^[a-z0-9_]+$/.test(st.id)) err(x, 'id must be a lower-case id');
        else if (ids[st.id]) err(x, 'duplicate state id ' + st.id);
        else ids[st.id] = true;
        assetPath(x, st.path);
        if (!Array.isArray(st.at) || !st.at.length) return err(x, 'at must be a list of chapter:node');
        st.at.forEach(function (a) {
          var nm = nodeAt(x + ' at', a);
          if (!nm) return;
          var nn = story.chapters[nm[1]].nodes[nm[2]];
          if (surface === 'scene' && sceneOf(story, nm[1], nm[2]) !== base) err(x, 'at ' + a + ' is not in scene ' + base);
          if (surface === 'focus' && !(nn.mode === 'focus' && nn.focus === base)) err(x, 'at ' + a + ' does not show close-up ' + base);
          if (surface === 'background' && nn.mode !== 'dialogue') err(x, 'at ' + a + ' is not a conversation (no portrait background)');
          ['beat', 'until'].forEach(function (k) {
            if (st[k] === undefined) return;
            if (typeof st[k] !== 'string' || !st[k]) err(x, k + ' must be text');
            else if (!nodeBegins(nm[1], nm[2], st[k])) err(x, k + ' "' + st[k] + '" begins no paragraph or run of ' + a);
          });
        });
        if (st.after !== undefined) {
          if (!obj(st.after) || typeof st.after.beat !== 'string') err(x, 'after must be { node, beat }');
          else { var am = nodeAt(x + ' after', st.after.node); if (am && !nodeBegins(am[1], am[2], st.after.beat)) err(x, 'after beat "' + st.after.beat + '" begins no paragraph or run of ' + st.after.node); }
        }
        if (st.region !== undefined && !(Array.isArray(st.region) && st.region.length === 4 && st.region.every(function (v) { return typeof v === 'number' && v >= 0 && v % 1 === 0; }) && st.region[2] > 0 && st.region[3] > 0)) err(x, 'region must be [x, y, w, h] in whole native pixels');
        cond(x, st.if);
      });
    });
    Object.keys(portraits).forEach(function (id) {
      if (!refs.portraits[id]) err('assets.portraits ' + id, 'registered but no cast member uses it');
      var p = portraits[id];
      if (obj(p) && obj(p.views)) {
        Object.keys(p.views).forEach(function (v) { if (!refs.layers[id + ':view:' + v]) err('assets.portraits ' + id, 'view ' + v + ' is never shown'); });
        return;
      }
      if (!obj(p) || !obj(p.backgrounds) || !obj(p.poses)) return;
      Object.keys(p.backgrounds).forEach(function (b) { if (!refs.layers[id + ':background:' + b]) err('assets.portraits ' + id, 'background ' + b + ' is never shown'); });
      Object.keys(p.poses).forEach(function (b) { if (!refs.layers[id + ':pose:' + b]) err('assets.portraits ' + id, 'pose ' + b + ' is never shown'); });
    });
    if (errors.length) return { ok: false, errors: errors };
    if (o.shapeOnly) return { ok: true, errors: [], stats: { shapeOnly: true } }; // development builds only

    // Walk every reachable state ------------------------------------------------------------
    // The key is v1's (node, flags, inventory, item marks) plus what v2 adds to the route:
    // chapter, the excursion opener, which `once` entries are spent and each resolved check's
    // outcome (not its roll). The transcript, the objective and the context action are
    // presentation history, not route state.
    // opts.routeMarks (the story importer, docs/84): only item marks that can change the route are
    // part of the key: a mark some condition tests, 'inspected' where an item's inspect effects
    // depend on it, 'read' where READ does more than mark the item read. Reading or opening an item
    // whose mark nothing tests cannot change what happens, so those states are one state. Off by
    // default, so the reception and fixture walks (and their asserted counts) are unchanged.
    var routeMark = null;
    if (o.routeMarks) {
      routeMark = {};
      var noteCond = function (c) {
        if (!obj(c)) return;
        ['item', 'itemNot'].forEach(function (k) { if (Array.isArray(c[k])) routeMark[c[k][0] + ':' + c[k][1]] = true; });
      };
      var noteRuns = function (t) { if (Array.isArray(t)) t.forEach(function (r) { if (obj(r) && has(r, 'if')) noteCond(r.if); }); };
      var noteText = function (t) { if (isVariants(t)) t.forEach(function (v) { noteCond(v.if); noteRuns(v.text); }); else noteRuns(t); };
      var noteFx = function (fx) { (Array.isArray(fx) ? fx : fx ? [fx] : []).forEach(function (e) { if (obj(e)) noteCond(e.if); }); };
      var noteEntry = function (c) {
        if (!obj(c)) return;
        noteCond(c.if); noteFx(c.effects); noteText(c.result);
        if (c.check) (c.check.mods || []).forEach(function (m) { noteCond(m.if); });
        ['pass', 'fail'].forEach(function (k) { if (obj(c[k])) { noteFx(c[k].effects); noteText(c[k].result); } });
      };
      Object.keys(story.chapters).forEach(function (chId) {
        var ns = story.chapters[chId].nodes;
        Object.keys(ns).forEach(function (id) {
          var n = ns[id];
          noteFx(n.effects); noteText(n.text); noteText(n.objective);
          (n.choices || []).forEach(noteEntry);
          ['show', 'use'].forEach(function (verb) { Object.keys(n[verb] || {}).forEach(function (it) { noteEntry(n[verb][it]); }); });
        });
      });
      (story.files || []).forEach(function (f) { noteCond(f.if); });
      Object.keys(items).forEach(function (id) {
        var it = items[id];
        noteText(it.description);
        if (it.inspect) { routeMark[id + ':inspected'] = true; noteFx(it.inspect.effects); }
        if (it.read) {
          noteFx(it.read.effects);
          var fx = Array.isArray(it.read.effects) ? it.read.effects : it.read.effects ? [it.read.effects] : [];
          var onlyMarksRead = fx.every(function (e) {
            return Object.keys(e).every(function (k) { return k === 'mark' && e.mark.every(function (m) { return m[0] === id && m[1] === 'read'; }); });
          });
          if (!onlyMarksRead) routeMark[id + ':read'] = true;
        }
      });
    }
    // opts.liveKeys (the story importer): a flag, a resolved check or a spent `once` entry is part of
    // the key only while something still ahead can read it. Ahead = every node statically reachable
    // from the current node (by `to`, `chapter`, or `back` to the recorded opener), plus everything
    // read outside the chapters (item descriptions and effects, case files, context actions), which
    // can show at any node. Two states that differ only in values nothing ahead can read have the
    // same future, choice for choice and outcome for outcome, so they are one state: this merges
    // provably identical futures and never caps, skips or weakens a condition. It turns the
    // multi-chapter walk from the product of every chapter's histories into their sum (Chapter 2
    // never reads most Prologue and House flags or any of their checks). The scan is deliberately
    // generous: any object key that looks like a condition counts as a read, so an over-approximation
    // can only keep extra state, never drop a live one. Off by default, so the reception and fixture
    // walks (and their asserted counts) are unchanged.
    var liveOf = null;
    if (o.liveKeys) {
      var READ_FLAG = { flag: 1, notFlag: 1 };
      var READ_CHECK = { passed: 1, failed: 1, untried: 1 };
      // Inventory reads (game issue #27): holding an item matters only where something ahead can read it:
      // has / lacks / item / itemNot conditions, a SHOW or USE entry for it, or a scene pickup naming it.
      var READ_ITEM = { has: 1, lacks: 1 };
      var READ_MARK = { item: 1, itemNot: 1 };
      var scanReads = function (v, acc, chId, succ) {
        if (Array.isArray(v)) { v.forEach(function (x) { scanReads(x, acc, chId, succ); }); return; }
        if (!v || typeof v !== 'object') return;
        Object.keys(v).forEach(function (k) {
          var x = v[k];
          if (READ_ITEM[k] && typeof x === 'string') acc.items[x] = true;
          else if (READ_MARK[k] && Array.isArray(x) && typeof x[0] === 'string') { acc.items[x[0]] = true; if (acc.marks) acc.marks[x[0] + ':' + x[1]] = true; }
          else if ((k === 'show' || k === 'use') && obj(x)) Object.keys(x).forEach(function (it) { acc.items[it] = true; });
          else if (k === 'scenePickup' && obj(x) && typeof x.item === 'string') acc.items[x.item] = true;
          if (READ_FLAG[k] && typeof x === 'string') acc.flags[x] = true;
          else if (k === 'flagIs' && Array.isArray(x) && typeof x[0] === 'string') acc.flags[x[0]] = true;
          else if (READ_CHECK[k] && typeof x === 'string') acc.checks[x] = true;
          else if (k === 'check' && obj(x) && typeof x.id === 'string') acc.checks[x.id] = true;
          if (succ && k === 'to' && typeof x === 'string' && story.chapters[chId].nodes[x]) succ[chId + ':' + x] = true;
          if (succ && k === 'chapter' && typeof x === 'string' && story.chapters[x]) succ[x + ':' + story.chapters[x].start] = true;
          scanReads(x, acc, chId, succ);
        });
      };
      var globalReads = { flags: {}, checks: {}, nodes: {}, items: {} };
      var gateMarks = {}; // marks that decide whether an item's effectful READ / inspect can still run
      // An item whose own READ or inspect does more than mark it read can change the route from any node.
      Object.keys(items).forEach(function (id) {
        var it = items[id];
        var fx = [];
        if (it.inspect) fx = fx.concat(Array.isArray(it.inspect.effects) ? it.inspect.effects : it.inspect.effects ? [it.inspect.effects] : []);
        if (it.read) fx = fx.concat(Array.isArray(it.read.effects) ? it.read.effects : it.read.effects ? [it.read.effects] : []);
        var onlySelfRead = fx.every(function (e) { return obj(e) && Object.keys(e).every(function (k) { return k === 'mark' && e.mark.every(function (m) { return m[0] === id && m[1] === 'read'; }); }); });
        if (it.inspect || !onlySelfRead) { globalReads.items[id] = true; gateMarks[id + ':' + (it.inspect ? 'inspected' : 'read')] = true; if (it.inspect && it.read && !onlySelfRead) gateMarks[id + ':read'] = true; }
      });
      // Scene-state selections (assets.sceneStates) are read only where their scene shows, so they
      // count as reads of that scene's nodes, not as global reads (a stored-item flag stays live in
      // the storage room, not for the rest of the game). Nothing else in assets reads state.
      // Presentation-only reads (game issue #27): item description variants and case files decide what is shown,
      // never where play can go. Such a condition can produce a new observation only where one of its inputs can
      // still change: a flag it reads is set, an item it reads (or the item it describes) is given or taken, or a
      // mark it reads is set, at or after the node. Elsewhere every observation it can make is already made (the
      // walk notes descriptions and case files for every reachable state before any merge), so its reads are part
      // of the key only where it is active (below). Everything else at story level still reads everywhere.
      Object.keys(story).forEach(function (k) { if (k !== 'chapters' && k !== 'assets' && k !== 'items' && k !== 'files') scanReads(story[k], globalReads, null, null); });
      Object.keys(items).forEach(function (id) { scanReads(items[id].read, globalReads, null, null); scanReads(items[id].inspect, globalReads, null, null); });
      var presConds = [];
      var condReads = function (c) {
        var r = { flags: {}, items: {}, marks: {}, engineMark: false };
        Object.keys(c || {}).forEach(function (k) {
          var v = c[k];
          if (k === 'flag' || k === 'notFlag') r.flags[v] = true;
          else if (k === 'flagIs') r.flags[v[0]] = true;
          else if (k === 'has' || k === 'lacks') r.items[v] = true;
          else if (k === 'item' || k === 'itemNot') { r.items[v[0]] = true; r.marks[v[0] + ':' + v[1]] = true; if (MARKS.indexOf(v[1]) !== -1) r.engineMark = true; }
          else r.engineMark = true; // a check outcome: treat as always able to change (conservative)
        });
        return r;
      };
      Object.keys(items).forEach(function (id) {
        var d = items[id].description;
        if (isVariants(d)) d.forEach(function (v) { if (v.if) { var r = condReads(v.if); r.item = id; presConds.push(r); } });
      });
      (story.files || []).forEach(function (f) { if (f.if) presConds.push(condReads(f.if)); });
      // What can be written (flags set, items given or taken, marks set) by a node; items' own READ / inspect
      // effects can run wherever the item is held, so they count as written everywhere.
      var scanWrites = function (v, wr) {
        if (Array.isArray(v)) { v.forEach(function (x) { scanWrites(x, wr); }); return; }
        if (!v || typeof v !== 'object') return;
        Object.keys(v).forEach(function (k) {
          var x = v[k];
          if (k === 'set' && obj(x)) Object.keys(x).forEach(function (f) { wr.wflags[f] = true; });
          else if ((k === 'give' || k === 'take') && Array.isArray(x)) x.forEach(function (it) { if (typeof it === 'string') wr.witems[it] = true; });
          else if (k === 'mark' && Array.isArray(x)) x.forEach(function (m) { if (Array.isArray(m)) wr.wmarks[m[0] + ':' + m[1]] = true; });
          else if ((k === 'show' || k === 'use') && obj(x)) Object.keys(x).forEach(function (it) { wr.wmarks[it + ':' + (k === 'show' ? 'shown' : 'used')] = true; });
          scanWrites(x, wr);
        });
      };
      var globalWrites = { wflags: {}, witems: {}, wmarks: {} };
      Object.keys(items).forEach(function (id) {
        scanWrites(items[id].read, globalWrites); scanWrites(items[id].inspect, globalWrites);
        // An item marking itself (read / inspected) writes only while it is held: counted through its gives ahead.
        delete globalWrites.wmarks[id + ':read']; delete globalWrites.wmarks[id + ':inspected'];
      });
      var artReads = (obj(story.assets) && obj(story.assets.sceneStates)) ? story.assets.sceneStates : {};
      // Conditional art (game issue #27): each state's condition is read only at its own nodes.
      var artAt2 = {};
      Object.keys(obj(story.assets) && obj(story.assets.artStates) ? story.assets.artStates : {}).forEach(function (sk) {
        story.assets.artStates[sk].forEach(function (st) { if (st.if) st.at.forEach(function (a) { (artAt2[a] = artAt2[a] || []).push(st.if); }); });
      });
      var live = {};
      var succOf = {};
      chapterIds.forEach(function (chId) {
        Object.keys(story.chapters[chId].nodes).forEach(function (id) {
          var w = chId + ':' + id;
          var acc = { flags: Object.assign({}, globalReads.flags), checks: Object.assign({}, globalReads.checks), nodes: {}, items: Object.assign({}, globalReads.items),
            wflags: Object.assign({}, globalWrites.wflags), witems: Object.assign({}, globalWrites.witems), wmarks: Object.assign({}, globalWrites.wmarks), marks: {} };
          acc.nodes[w] = true;
          succOf[w] = {};
          scanReads(story.chapters[chId].nodes[id], acc, chId, succOf[w]);
          scanWrites(story.chapters[chId].nodes[id], acc);
          scanReads(artReads[sceneOf(story, chId, id)] || [], acc, chId, null);
          (artAt2[w] || []).forEach(function (c) { scanReads(c, acc, chId, null); });
          live[w] = acc;
        });
      });
      // Backward propagation to a fixpoint: live(n) = reads(n) + live(every successor of n).
      var merge = function (into, from) {
        var grew = false;
        ['flags', 'checks', 'nodes', 'items', 'wflags', 'witems', 'wmarks', 'marks'].forEach(function (f) {
          if (!from[f]) return;
          into[f] = into[f] || {};
          Object.keys(from[f]).forEach(function (k) { if (!into[f][k]) { into[f][k] = true; grew = true; } });
        });
        return grew;
      };
      for (var grew = true; grew;) {
        grew = false;
        Object.keys(live).forEach(function (w) {
          Object.keys(succOf[w]).forEach(function (t) { if (merge(live[w], live[t])) grew = true; });
        });
      }
      // Active presentation conditions add their reads (and the item they describe) where they are active.
      // Activity only shrinks along a route (writes ahead of a node include those ahead of its successors), so
      // this needs no second propagation.
      var someIn = function (a, b) { return Object.keys(a).some(function (k) { return !!b[k]; }); };
      Object.keys(live).forEach(function (w) {
        var L0 = live[w];
        presConds.forEach(function (pc) {
          // An engine mark (read / inspected) changes only while its item is held: it counts as written ahead
          // where that item can still be given. A merge can at most hide an observation (reported as never seen,
          // never a false pass); it can never change a route, which presentation does not decide.
          var engineAhead = Object.keys(pc.marks).some(function (m) { var it = m.split(':')[0], mk = m.split(':')[1]; return MARKS.indexOf(mk) !== -1 && (L0.witems[it] || L0.wmarks[m]); });
          var active = engineAhead || someIn(pc.flags, L0.wflags) || someIn(pc.items, L0.witems) || someIn(pc.marks, L0.wmarks) || (pc.item && L0.witems[pc.item]);
          if (!active) return;
          Object.keys(pc.flags).forEach(function (f) { L0.flags[f] = true; });
          Object.keys(pc.items).forEach(function (it) { L0.items[it] = true; });
          Object.keys(pc.marks).forEach(function (m) { L0.marks[m] = true; });
          if (pc.item) L0.items[pc.item] = true;
        });
      });
      var liveCache = {};
      liveOf = function (s) {
        var w = at(s);
        var cacheKey = s.returnTo ? w + '<' + s.returnTo : w;
        if (liveCache[cacheKey]) return liveCache[cacheKey];
        var acc = { flags: {}, checks: {}, nodes: {}, items: {}, marks: {}, witems: {} };
        merge(acc, live[w]);
        if (s.returnTo) merge(acc, live[s.chapter + ':' + s.returnTo]);
        acc.flagList = Object.keys(acc.flags).sort();
        acc.gate = gateMarks;
        return (liveCache[cacheKey] = acc);
      };
    }
    function keyMarks(s, L) {
      return Object.keys(s.items).sort().filter(function (k) { return !L || L.items[k]; }).map(function (k) {
        // liveKeys: a mark is kept only where something ahead reads it, or where it gates an effectful READ /
        // inspect of an item that is held or can still be given.
        return [k, s.items[k].filter(function (m) { return (!routeMark || routeMark[k + ':' + m]) && (!L || L.marks[k + ':' + m] || (L.gate[k + ':' + m] && (s.inventory.indexOf(k) !== -1 || L.witems[k]))); }).sort()];
      }).filter(function (e) { return !routeMark || e[1].length; });
    }
    function key(s) {
      if (liveOf) {
        var L = liveOf(s);
        var flags = {};
        for (var fi = 0; fi < L.flagList.length; fi++) {
          var fname = L.flagList[fi];
          if (Object.prototype.hasOwnProperty.call(s.flags, fname)) flags[fname] = s.flags[fname];
        }
        var liveSpent = s.taken.filter(function (t) { return L.nodes[t.at]; })
          .map(function (t) { return t.at + ':' + (t.c || t.item + ':' + t.verb); })
          .filter(function (k) { return onceKeys[k]; }).sort();
        return JSON.stringify([s.chapter, s.node, s.returnTo, flags, s.inventory.filter(function (id) { return L.items[id]; }).sort(),
          keyMarks(s, L), liveSpent,
          Object.keys(s.checks).filter(function (k) { return L.checks[k]; }).sort().map(function (k) { return [k, s.checks[k].ok]; })]);
      }
      var spent = s.taken.map(function (t) { return t.at + ':' + (t.c || t.item + ':' + t.verb); })
        .filter(function (k) { return onceKeys[k]; }).sort();
      return JSON.stringify([s.chapter, s.node, s.returnTo, s.flags, s.inventory.slice().sort(),
        keyMarks(s), spent,
        Object.keys(s.checks).sort().map(function (k) { return [k, s.checks[k].ok]; })]);
    }
    // Strips presentation history in place. Every caller passes a state the walk has just made
    // (begin() or a step's own copy, which nothing else holds), so a second deep copy here only
    // doubled the walk's cost.
    function bare(s) {
      s.transcript = [];
      s.taken = s.taken.filter(function (t) { return onceKeys[t.at + ':' + (t.c || t.item + ':' + t.verb)]; });
      return s;
    }
    var seen = {};
    var anyStates = obj(assets.sceneStates) && Object.keys(assets.sceneStates).length > 0;
    var stacked = {};
    var first = begin(story, { obs: seen }).state;
    // Full canonical state keys remain collision-free; edges and endings use
    // compact numeric ids. Processed states no longer stay alive for the
    // entire exhaustive multi-chapter walk.
    // opts.chapterSplit (the story importer, game issue #27): every state key names its chapter and no
    // chapter leads back to an earlier one, so the key map is kept per chapter and freed once that
    // chapter's walk is complete. Chapters are walked in story order; the numeric edge graph is kept whole,
    // so reachability of an ending (below) is computed over the same graph as one walk. Exactly the same
    // states, transitions and observations; only the peak memory differs. A state that enters a chapter
    // whose walk is already complete is refused (the chapters would not be a sequence).
    var split = !!o.chapterSplit;
    var maps = Object.create(null); // map name ('*' or a chapter) -> canonical key -> numeric id
    var queues = Object.create(null); // map name -> { list, index }
    var walked = Object.create(null); // chapters whose walk is complete (split only)
    var wantKeys = o._wantKeys || null; // ids whose keys a report needs (split only; see below)
    var keyOfId = Object.create(null);
    function mapName(ch) { return split ? ch : '*'; }
    function mapFor(ch) { var m = mapName(ch); return maps[m] || (maps[m] = Object.create(null)); }
    function queueFor(ch) { var m = mapName(ch); return queues[m] || (queues[m] = { list: [], index: 0 }); }
    var edges = Object.create(null); // numeric id -> successor ids
    var firstKey = key(first);
    mapFor(first.chapter)[firstKey] = 0;
    queueFor(first.chapter).list.push({ id: 0, state: bare(first) });
    if (wantKeys && wantKeys[0]) keyOfId[0] = firstKey;
    var stateCount = 1;
    var REENTERED = { reentered: true };
    var used = { choices: {}, entries: {} };
    var restartFrom = [];
    var endAt = {}; // reachable states standing on an authored ending (end: true), by node
    var backless = {};
    function follow(fromId, s) {
      // Item coverage is noted for every reachable state before any merge (a liveKeys merge may keep a
      // representative that does not hold an item nothing ahead reads; the item was still held here).
      s.inventory.forEach(function (id) { seen['item ' + id + ' description[' + variantIndex2(items[id].description, s) + ']'] = true; });
      (story.files || []).forEach(function (f, i) { if (holds(f.if, s)) seen['files[' + i + ']'] = true; });
      var k = key(s);
      if (split && walked[s.chapter]) throw REENTERED; // not a sequence: the single walk is used instead (below)
      var map = mapFor(s.chapter);
      var toId = map[k];
      if (toId === undefined) {
        toId = stateCount++;
        map[k] = toId;
        queueFor(s.chapter).list.push({ id: toId, state: s });
        if (wantKeys && wantKeys[toId]) keyOfId[toId] = k;
      }
      (edges[fromId] = edges[fromId] || []).push(toId);
    }
    // The next state to process: one walk queue; or (split) the current chapter's, then the next chapter
    // in story order that has states waiting, freeing each completed chapter's key map.
    var current = null;
    var currentMap = mapName(first.chapter);
    function nextState() {
      for (;;) {
        var q = queues[currentMap];
        if (q && q.index < q.list.length) {
          var item = q.list[q.index];
          q.list[q.index++] = null; // processed state can be garbage-collected
          return item;
        }
        if (!split) return null;
        walked[currentMap] = true;
        delete maps[currentMap];
        delete queues[currentMap];
        var nextCh = chapterIds.filter(function (c) { return queues[c] && queues[c].index < queues[c].list.length; })[0];
        if (!nextCh) return null;
        currentMap = nextCh;
        if (o.progress) o.progress({ chapterStart: nextCh, entries: queues[nextCh].list.length - queues[nextCh].index, states: stateCount, sample: queues[nextCh].list.slice(queues[nextCh].index).map(function (x) { return x.state; }), key: key }); // QA only
      }
    }
    function walkStep(s, input) {
      return stepCore(story, s, input, { obs: seen, copy: copyJson }).state;
    }
    // Every outcome an input can have here: one, or each possible outcome of its check.
    function walkAll(s, input, entry) {
      if (!entry.check) return [walkStep(s, input)];
      var p = chanceOf(entry.check, checkBonus(entry.check, s));
      var out = [];
      if (p > 0) out.push(stepCore(story, s, input, { obs: seen, force: 'pass', copy: copyJson }).state);
      if (p < 1) out.push(stepCore(story, s, input, { obs: seen, force: 'fail', copy: copyJson }).state);
      return out;
    }
    // Indexed FIFO traversal avoids repeated O(N) array shifts as authored stories grow.
    try { walkLoop(); } catch (e) {
      if (e !== REENTERED) throw e;
      // A chapter is entered again after its walk: the chapters are not a sequence, so the exact single walk runs.
      return validateStory(story, charset, Object.assign({}, o, { chapterSplit: false, _wantKeys: null }));
    }
    function walkLoop() {
    while ((current = nextState())) {
      var s = current.state;
      // QA only (opts.progress): a periodic report of the walk's size; it never changes the walk.
      if (o.progress && current.id % 50000 === 0) o.progress({ states: stateCount, chapter: s.chapter, node: s.node });
      var fromId = current.id;
      var n = here(story, s);
      var where = at(s);
      if (anyStates) {
        var sel = sceneStatesOf(story, s);
        var sid = sceneOf(story, s.chapter, s.node);
        ['replace', 'overlay'].forEach(function (layer) {
          sel[layer].forEach(function (id) { seen['scene state ' + sid + '#' + id] = true; });
          if (sel[layer].length > 1 && !stacked[where + ' ' + layer]) {
            stacked[where + ' ' + layer] = true;
            errors.push('scene ' + sid + ' at ' + where + ': ' + sel[layer].join(' and ') + ' (' + layer + ') select at once; at most one ' + layer + ' state may show');
          }
        });
      }
      (story.files || []).forEach(function (f, i) { if (holds(f.if, s)) seen['files[' + i + ']'] = true; });
      Object.keys(artStates).forEach(function (sk) {
        artStates[sk].forEach(function (st) { if (st.at.indexOf(where) !== -1 && (!st.if || holds(st.if, s))) seen['art state ' + sk + '#' + st.id] = true; });
      });
      if (!s.returnTo && n.choices.some(function (c) { return c.back; }) && !backless[where]) {
        backless[where] = true;
        errors.push('a back choice at ' + where + ' is reachable with no opener to return to (enter it from a narrative node, or split the node)');
      }
      if (n.end) (endAt[where] = endAt[where] || []).push(fromId);
      var avail = openChoices(story, s);
      if (!avail.length) errors.push('dead end: no choice is available at ' + where + ' with state ' + key(s));
      avail.forEach(function (c) {
        used.choices[where + ':' + c.id] = true;
        if (c.restart) { restartFrom.push(fromId); return; }
        walkAll(s, { choice: c.id }, c).forEach(function (t) { follow(fromId, bare(t)); });
      });
      s.inventory.forEach(function (id) {
        seen['item ' + id + ' description[' + variantIndex2(items[id].description, s) + ']'] = true;
        if (itemMarks(s, id).indexOf('inspected') === -1) follow(fromId, bare(walkStep(s, { item: id, verb: 'inspect' })));
        if (items[id].read && itemMarks(s, id).indexOf('read') === -1) follow(fromId, bare(walkStep(s, { item: id, verb: 'read' })));
        ['show', 'use'].forEach(function (verb) {
          if (!openEntry(story, s, id, verb)) return;
          used.entries[where + ':' + verb + ':' + id] = true;
          walkAll(s, { item: id, verb: verb }, openEntry(story, s, id, verb)).forEach(function (t) { follow(fromId, bare(t)); });
        });
      });
    }
    }

    // Everything authored must be reachable.
    var runsAlwaysShown = [];
    function runsSeen(t, prefix, label) {
      if (!Array.isArray(t)) return;
      t.forEach(function (r, ri) {
        if (!obj(r) || !has(r, 'if')) return;
        if (!seen[prefix + ' run ' + ri + ':shown']) errors.push(label + ' conditional run ' + ri + ' is never shown in any reachable state');
        else if (!seen[prefix + ' run ' + ri + ':hidden']) runsAlwaysShown.push(label + ' run ' + ri);
      });
    }
    function variantsSeen(field, prefix, label) {
      if (!isVariants(field)) { if (!seen[prefix + '[0]']) errors.push(label + ' never shown'); else runsSeen(field, prefix + '[0]', label); return; }
      field.forEach(function (v, i) { if (!seen[prefix + '[' + i + ']']) errors.push(label + ' variant ' + i + ' never shown'); else runsSeen(v.text, prefix + '[' + i + ']', label + ' variant ' + i); });
    }
    // Both outcomes of every check must happen in some reachable state.
    function outcomesSeen(c, label) {
      if (!c.check) return;
      ['pass', 'fail'].forEach(function (which) {
        if (!seen['outcome ' + c.check.id + ':' + which]) return errors.push('check ' + c.check.id + ' (' + label + '): ' + which + ' never happens in any reachable state');
        if (c[which].result !== undefined) variantsSeen(c[which].result, 'result ' + label + ':' + which, 'result of ' + label + ' ' + which);
      });
    }
    chapterIds.forEach(function (chId) {
      Object.keys(story.chapters[chId].nodes).forEach(function (id) {
        var n = story.chapters[chId].nodes[id];
        var w = chId + ':' + id;
        if (!seen['node ' + w]) return errors.push('unreachable node: ' + w);
        variantsSeen(n.text, 'text ' + w, 'text of ' + w);
        if (n.objective !== undefined) variantsSeen(n.objective, 'objective ' + w, 'objective of ' + w);
        n.choices.forEach(function (c) {
          if (!used.choices[w + ':' + c.id]) return errors.push('choice never available: ' + w + ':' + c.id);
          if (c.result !== undefined) variantsSeen(c.result, 'result ' + w + ':' + c.id, 'result of ' + w + ':' + c.id);
          outcomesSeen(c, w + ':' + c.id);
        });
        ['show', 'use'].forEach(function (verb) {
          Object.keys(n[verb] || {}).forEach(function (item) {
            if (!used.entries[w + ':' + verb + ':' + item]) return errors.push(verb + ' never available: ' + w + ':' + item);
            var e = n[verb][item];
            if (e.result !== undefined) variantsSeen(e.result, 'result ' + w + ':' + verb + ':' + item, 'result of ' + w + ' ' + verb + ' ' + item);
            outcomesSeen(e, w + ':' + verb + ':' + item);
          });
        });
      });
    });
    Object.keys(items).forEach(function (id) {
      var d = items[id].description;
      if (isVariants(d)) d.forEach(function (v, i) { if (!seen['item ' + id + ' description[' + i + ']']) errors.push('description variant never seen: ' + id + '[' + i + ']'); });
    });
    (story.files || []).forEach(function (f, i) { if (!seen['files[' + i + ']']) errors.push('case-file entry never shown: files[' + i + ']'); });
    Object.keys(artStates).forEach(function (sk) {
      artStates[sk].forEach(function (st) {
        if (!seen['art state ' + sk + '#' + st.id]) errors.push('conditional art never shown: ' + sk + '#' + st.id);
        else if (st.after && !seen['node ' + st.after.node]) errors.push('conditional art ' + sk + '#' + st.id + ': its after-node ' + st.after.node + ' is unreachable');
      });
    });
    Object.keys(anyStates ? assets.sceneStates : {}).forEach(function (sid) {
      assets.sceneStates[sid].forEach(function (st) { if (!seen['scene state ' + sid + '#' + st.id]) errors.push('scene state never shown: ' + sid + '#' + st.id); });
    });
    Object.keys(items).forEach(function (id) {
      if (!Object.keys(seen).some(function (k) { return k.indexOf('item ' + id + ' description[') === 0; })) errors.push('item never held: ' + id);
    });

    // From every reachable state an authored ending (a node marked end: true) must still be
    // reachable. Reaching one is finishing: it does not depend on BEGIN AGAIN, and there is no
    // fatal / retry outcome in the rules yet (owner lock [75] is a later, separate contract).
    var canFinish = {};
    Object.keys(endAt).forEach(function (w) { endAt[w].forEach(function (k) { canFinish[k] = true; }); });
    // Equivalent backwards reachability, O(states + transitions) instead of rescanning
    // every edge until convergence. This changes validation cost, not route semantics.
    var predecessors = {};
    Object.keys(edges).forEach(function (k) {
      edges[k].forEach(function (to) {
        (predecessors[to] = predecessors[to] || []).push(k);
      });
    });
    var endingQueue = Object.keys(canFinish);
    for (var endingIndex = 0; endingIndex < endingQueue.length; endingIndex++) {
      (predecessors[endingQueue[endingIndex]] || []).forEach(function (k) {
        if (!canFinish[k]) { canFinish[k] = true; endingQueue.push(k); }
      });
    }
    if (!split) {
      var allStates = maps['*'] || {};
      Object.keys(allStates).filter(function (k) { return !canFinish[allStates[k]]; }).forEach(function (k) { errors.push('cannot reach an ending from state ' + k); });
    } else {
      // The key maps are gone: the same deterministic walk is repeated once, keeping only the keys of the
      // states that cannot finish, so the report names exactly the states a single walk would.
      var stuckIds = [];
      for (var sid2 = 0; sid2 < stateCount; sid2++) if (!canFinish[sid2]) stuckIds.push(sid2);
      if (stuckIds.length) {
        if (wantKeys) stuckIds.forEach(function (id) { errors.push('cannot reach an ending from state ' + keyOfId[id]); });
        else {
          var want = {};
          stuckIds.forEach(function (id) { want[id] = true; });
          return validateStory(story, charset, Object.assign({}, o, { _wantKeys: want }));
        }
      }
    }
    // QA only: what the walk observed, so a test can prove two key strategies see the same story.
    if (o.observe) { o.observe.seen = Object.keys(seen).sort(); o.observe.used = Object.keys(used.choices).concat(Object.keys(used.entries)).sort(); }

    return {
      ok: !errors.length,
      errors: errors,
      stats: {
        chapters: chapterIds.length,
        nodes: counts.nodes,
        choices: counts.choices,
        reachableStates: stateCount,
        endings: endings,
        endingStates: restartFrom.length,
        endingsReached: Object.keys(endAt).length,
        checks: Object.keys(allChecks).length,
        // Conditional runs whose condition held in every reachable state that showed them (reported, not an error).
        runsAlwaysShown: runsAlwaysShown
      }
    };
  }

  var Rules = {
    MARKS: MARKS,
    surfaceOf: surfaceOf,
    heldScene: heldScene,
    newState: newState,
    start: start,
    enter: enter,
    test: test,
    apply: apply,
    pick: pick,
    choices: choices,
    choose: choose,
    itemActions: itemActions,
    inspect: inspect,
    itemAction: itemAction,
    description: description,
    files: files,
    contextAction: contextAction,
    contextSpent: contextSpent,
    takeContextAction: takeContextAction,
    validate: validate,
    clone: clone,
    copyJson: copyJson,
    // Story v2 (docs/72 S1, docs/74).
    STORY_SCHEMA: STORY_SCHEMA,
    STATE_VERSION: STATE_VERSION,
    MODES: MODES,
    KINDS: KINDS,
    HISTORY: HISTORY,
    fromV1: fromV1,
    begin: begin,
    step: step,
    view: view,
    endCause: endCause,
    artAt: artAt,
    trackPoints: trackPoints,
    canRestore: canRestore,
    restoreFrom: restoreFrom,
    paras: toParas,
    applyEffects: applyEffects,
    holds: holds,
    describe: describe,
    validateStory: validateStory,
    // Checks and saves (docs/72 S2, docs/74).
    SAVE_SCHEMA: SAVE_SCHEMA,
    roll: rollFor,
    chance: chanceOf,
    serialize: serialize,
    restore: restore,
    migrate: migrate,
    resume: resume
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Rules;
  else root.CYOA_RULES = Rules;
})(this);
