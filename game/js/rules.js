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
  // Story v2 (docs/72 S1; API in docs/74). Everything above this line is the v1 reception API,
  // unchanged: the game and the polish lab still run on it until the renderer moves to events
  // (S4). Everything below is new and is used by nothing in the browser yet.
  //
  //   story  = { schema: 'cyoa-story-v2', chapters: { id: { nodes: { id: NODE } } }, ... }
  //   begin(story, opts)        -> { state, events }   a fresh playthrough
  //   step(story, state, input) -> { state, events }   one atomic, committed action
  //   view(story, state)        -> what the renderer draws (cards, verbs, portrait, windows)
  //   fromV1(content)           -> the reception's v1 content as a one-chapter v2 story
  //   validateStory(story, charset) -> { ok, errors, stats }: shape, then every reachable state
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
  var COND_KEYS_V2 = COND_KEYS.concat([]);
  var EFFECT_KEYS_V2 = EFFECT_KEYS.concat(['objective']);
  var STORY_KEYS = ['schema', 'id', 'version', 'profile', 'save', 'compat', 'start', 'initialState', 'cast', 'items', 'files',
    'contextAction', 'assets', 'chapters'];
  var CHAPTER_KEYS = ['title', 'start', 'scene', 'nodes'];
  var NODE_KEYS = ['mode', 'scene', 'speaker', 'pose', 'backdrop', 'focus', 'objective', 'effects', 'text', 'choices', 'show', 'use',
    'contextAction', 'end'];
  var CHOICE_KEYS = ['id', 'kind', 'text', 'say', 'if', 'effects', 'once', 'result', 'to', 'back', 'chapter', 'restart'];
  var ENTRY_KEYS = ['kind', 'say', 'if', 'effects', 'once', 'result', 'to', 'back', 'chapter'];
  var DESTINATIONS = ['to', 'back', 'chapter', 'restart'];
  // Which part of the one transcript each surface shows (docs/72 section 3.6; owner decision O3
  // may change it, here only).
  var HISTORY = { dialogue: 'scene', narrative: 'scene', focus: 'visit', notes: 'chapter' };

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
  function at(state) {
    return state.chapter + ':' + state.node;
  }

  // Effects ------------------------------------------------------------------------------------
  // One object, or a list applied in order; each entry's `if` is tested against the state as it
  // stands at that entry (so it sees what the entries before it did).
  function applyEffects(effects, state) {
    if (!effects) return;
    (Array.isArray(effects) ? effects : [effects]).forEach(function (e) {
      if (!test(e.if, state)) return;
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
    for (var i = 0; i < field.length; i++) if (test(field[i].if, state)) return i;
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
  function toParas(text, ctx) {
    var paras = [[]];
    (typeof text === 'string' ? [text] : text).forEach(function (r) {
      var role, who, s;
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
  function freshState(story) {
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
    if (!test(c.if, state)) return false;
    if (c.once && wasTaken(state, at(state), c.id)) return false;
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
    if (!e || !test(e.if, state)) return null;
    if (e.once && entryTaken(state, at(state), item, verb)) return null;
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

  // The view: everything the renderer needs to draw the current state ----------------------------
  function view(story, state) {
    requireStory(story);
    var n = here(story, state);
    var ch = story.chapters[state.chapter];
    var portrait = null;
    if (n.mode === 'dialogue') {
      var pid = story.cast[n.speaker].portrait;
      var reg = story.assets.portraits[pid];
      portrait = { cast: n.speaker, id: pid, background: n.backdrop || reg.background, pose: n.pose || reg.pose };
    }
    var ctx = contextOf(story, state);
    return {
      story: story.id,
      chapter: state.chapter,
      title: ch.title,
      node: state.node,
      mode: n.mode,
      scene: sceneOf(story, state.chapter, state.node),
      speaker: n.mode === 'dialogue' ? n.speaker : null,
      portrait: portrait,
      focus: n.mode === 'focus' ? n.focus : null,
      returnTo: state.returnTo,
      end: !!n.end,
      cards: openChoices(story, state).map(function (c) { return { id: c.id, kind: c.kind, text: cardText(c) }; }),
      items: state.inventory.map(function (id) {
        return { id: id, read: !!story.items[id].read, show: !!openEntry(story, state, id, 'show'), use: !!openEntry(story, state, id, 'use') };
      }),
      context: ctx ? { id: ctx.id, label: ctx.label, glyph: ctx.glyph, spent: contextUsed(story, state), spentWhy: ctx.spentWhy || null } : null,
      objective: state.objective,
      files: files(story, state),
      history: history(story, state)
    };
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
    if (mode === 'focus') while (visitFrom > 0 && t[visitFrom - 1].mode === 'focus' && t[visitFrom - 1].node === state.node) visitFrom--;
    var from = { scene: sceneFrom, chapter: chapterFrom, visit: visitFrom };
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
  function Tx(story, state, obs) {
    this.story = story;
    this.s = clone(state);
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
    var was = s.node === null ? null : { chapter: s.chapter, scene: sceneOf(this.story, s.chapter, s.node), mode: here(this.story, s).mode };
    s.chapter = chapter;
    s.node = node;
    var n = here(this.story, s);
    var scene = sceneOf(this.story, chapter, node);
    if (!was || was.chapter !== chapter) this.events.push({ t: 'chapter', id: chapter, title: this.story.chapters[chapter].title });
    if (!was || was.scene !== scene) this.events.push({ t: 'scene', id: scene });
    if (!was || was.mode !== n.mode) this.events.push({ t: 'mode', from: was ? was.mode : null, to: n.mode });
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
    this.write('text', n.mode, toParas(this.pick(key, n.text), arrivalCtx(n)), { t: 'text', surface: n.mode });
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

  // opts (validator only): { obs } coverage notes.
  function stepCore(story, state, input, opts) {
    requireStory(story);
    var r = resolve(story, state, input);
    var tx = new Tx(story, state, opts && opts.obs);
    var s = tx.s;
    var from = s.transcript.length;

    if (r.type === 'inspect') {
      mark(s, r.item, 'inspected');
      return tx.done(from);
    }
    if (r.type === 'read') {
      tx.effects(story.items[r.item].read.effects);
      mark(s, r.item, 'read');
      return tx.done(from);
    }
    if (r.type === 'context') {
      if (s.contextDone.indexOf(r.a.id) === -1) s.contextDone.push(r.a.id);
      tx.write('thought', 'dialogue', toParas(r.a.text, { role: 'thought', who: YOU, speaker: YOU }), { t: 'text', surface: 'dialogue' });
      return tx.done(from);
    }

    var e = r.e;
    var fromNode = here(story, s);
    var where = at(s);
    var outcome = null;

    // 3. Effects: the verb's mark, the entry's effects, then the outcome's.
    if (r.type === 'entry') mark(s, r.item, r.verb === 'show' ? 'shown' : 'used');
    tx.effects(e.effects);

    // 4. Record.
    if (r.type === 'choice') s.taken.push({ n: tx.n, at: where, c: e.id });
    else s.taken.push({ n: tx.n, at: where, item: r.item, verb: r.verb });

    // 5. Echo: dialogue mode only, spoken and action kinds only.
    if (fromNode.mode === 'dialogue' && (r.kind === 'spoken' || r.kind === 'action')) {
      var said = e.say || e.text;
      tx.write('echo', 'dialogue', toParas(said, echoCtx(r.kind)), { t: 'echo', role: echoCtx(r.kind).role, who: YOU });
    }

    // 6. Destination: chapter, then to, then back, then stay. restart starts a new playthrough.
    var dest = outcome || e;
    if (e.restart) {
      var again = begin(story, {});
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
      var rkey = 'result ' + where + ':' + (r.type === 'choice' ? e.id : r.verb + ':' + r.item) + (outcome ? ':' + outcome.which : '');
      tx.write('result', dn.mode, toParas(tx.pick(rkey, result), resultCtx(dn)), { t: 'text', surface: dn.mode });
    }

    // 8. Arrival (not for back or stay: a return is not an entry).
    if (arriving) tx.arrive();

    // 9. Mark.
    return tx.done(from);
  }

  // Validation of a v2 story --------------------------------------------------------------------
  // Shape first (every authored field), then a walk of every reachable state (as v1's validate):
  // no dead end, everything authored is reachable, an ending is reachable from everywhere.
  function validateStory(story, charset, opts) {
    var o = opts || {};
    var errors = [];
    var chars = charset ? new Set(charset) : null;
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
    init.inventory.forEach(function (id) { if (!items[id]) err('initialState', 'unknown item ' + id); });

    function text(where, s) {
      if (typeof s !== 'string' || !s.trim()) return err(where, 'empty text');
      if (chars) {
        var bad = Array.from(new Set(s.replace(/\n/g, '').split(''))).filter(function (ch) { return !chars.has(ch); });
        if (bad.length) err(where, 'characters the fonts cannot draw: ' + bad.join(' '));
      }
    }
    function cond(where, c) {
      if (c === undefined) return;
      if (!obj(c)) return err(where, 'a condition must be an object');
      Object.keys(c).forEach(function (k) {
        if (COND_KEYS_V2.indexOf(k) === -1) return err(where, 'unknown condition ' + k);
        var v = c[k];
        var flag = k === 'flagIs' ? v[0] : (k === 'flag' || k === 'notFlag') ? v : null;
        if (flag !== null && knownFlags.indexOf(flag) === -1) err(where, 'unknown flag ' + flag);
        var item = k === 'item' || k === 'itemNot' ? v[0] : (k === 'has' || k === 'lacks') ? v : null;
        if (item !== null && !items[item]) err(where, 'unknown item ' + item);
        if ((k === 'item' || k === 'itemNot') && MARKS.indexOf(v[1]) === -1) err(where, 'unknown item mark ' + v[1]);
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
    function runs(where, t) {
      if (typeof t === 'string') return text(where, t);
      if (!Array.isArray(t) || !t.length) return err(where, 'must be text, runs or variants');
      t.forEach(function (r, i) {
        var w = where + ' run ' + i;
        if (typeof r === 'string') return text(w, r);
        if (!obj(r)) return err(w, 'a run is a string or one { say | act | desc | think } object');
        var roles = Object.keys(r).filter(function (k) { return has(RUN_ROLES, k); });
        Object.keys(r).forEach(function (k) { if (!has(RUN_ROLES, k) && k !== 'who') err(w, 'unknown run key ' + k); });
        if (roles.length !== 1) return err(w, 'a run needs exactly one of say, act, desc, think (has ' + (roles.join(' ') || 'none') + ')');
        if (roles[0] === 'think') err(w, 'think runs are reserved for the thought contract (docs/72 section 8.3)');
        if (has(r, 'who') && roles[0] !== 'say') err(w, 'who is only for say runs');
        if (has(r, 'who') && r.who !== YOU && !cast[r.who]) err(w, 'unknown speaker ' + r.who);
        text(w, r[roles[0]]);
      });
    }
    function textField(where, f) {
      if (isVariants(f)) return variants(where, f, runs);
      if (Array.isArray(f) && f.some(function (v) { return obj(v) && has(v, 'text'); })) return err(where, 'mixes runs and { if, text } variants');
      runs(where, f);
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
            if (MARKS.indexOf(p[1]) === -1) err(w, 'unknown item mark ' + p[1]);
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

    // Assets: registered ids, and every registered id referenced (nothing orphaned).
    var refs = { scenes: {}, portraits: {}, focus: {}, layers: {} };
    function assetPath(where, p) {
      if (p === null) { if (story.profile !== 'fixture') err(where, 'null art is only allowed in a fixture story'); return; }
      if (typeof p !== 'string' || !/\.png$/.test(p)) return err(where, 'must be a .png path or null');
      if (story.profile === 'production' && /(^|\/)(source|originals|review)\//.test(p)) err(where, 'production art may not come from source/, originals/ or review/');
    }
    var scenes = obj(assets.scenes) ? assets.scenes : {};
    var portraits = obj(assets.portraits) ? assets.portraits : {};
    var focusArt = obj(assets.focus) ? assets.focus : {};
    onlyKeys('assets', assets, ['scenes', 'portraits', 'focus']);
    Object.keys(scenes).forEach(function (id) {
      if (!/^[a-z0-9_]+\/[a-z0-9_]+$/.test(id)) err('assets.scenes ' + id, 'id must be location/scene');
      assetPath('assets.scenes ' + id, scenes[id]);
    });
    Object.keys(focusArt).forEach(function (id) {
      if (!/^[a-z0-9_]+\/[a-z0-9_]+\/[a-z0-9_]+$/.test(id)) err('assets.focus ' + id, 'id must be location/scene/target');
      assetPath('assets.focus ' + id, focusArt[id]);
    });
    Object.keys(portraits).forEach(function (id) {
      var p = portraits[id];
      var w = 'assets.portraits ' + id;
      if (!obj(p) || !obj(p.backgrounds) || !obj(p.poses)) return err(w, 'needs backgrounds {} and poses {}');
      onlyKeys(w, p, ['backgrounds', 'poses', 'background', 'pose']);
      Object.keys(p.backgrounds).forEach(function (b) { assetPath(w + ' background ' + b, p.backgrounds[b]); });
      Object.keys(p.poses).forEach(function (b) { assetPath(w + ' pose ' + b, p.poses[b]); });
      if (!has(p.backgrounds, p.background)) err(w, 'default background ' + p.background + ' is not registered');
      if (!has(p.poses, p.pose)) err(w, 'default pose ' + p.pose + ' is not registered');
      refs.layers[id + ':background:' + p.background] = true;
      refs.layers[id + ':pose:' + p.pose] = true;
    });
    function sceneRef(where, id) {
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
      if (!has(portraits, c.portrait)) err('cast ' + id, 'unregistered portrait ' + c.portrait);
      else refs.portraits[c.portrait] = true;
    });
    Object.keys(items).forEach(function (id) {
      var it = items[id];
      var w = 'item ' + id;
      onlyKeys(w, it, ['name', 'slotArt', 'inspectArt', 'description', 'read']);
      text(w + ' name', it.name);
      plainField(w + ' description', it.description);
      if (it.read !== undefined) {
        if (!obj(it.read)) err(w, 'read must be an object');
        else { onlyKeys(w + ' read', it.read, ['effects']); effects(w + ' read', it.read.effects); }
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
          else {
            var reg = portraits[cast[n.speaker].portrait] || { backgrounds: {}, poses: {} };
            if (n.pose !== undefined) { if (!has(reg.poses, n.pose)) err(w, 'unregistered pose ' + n.pose); else refs.layers[cast[n.speaker].portrait + ':pose:' + n.pose] = true; }
            if (n.backdrop !== undefined) { if (!has(reg.backgrounds, n.backdrop)) err(w, 'unregistered backdrop ' + n.backdrop); else refs.layers[cast[n.speaker].portrait + ':background:' + n.backdrop] = true; }
          }
        } else {
          ['speaker', 'pose', 'backdrop', 'show'].forEach(function (k) { if (has(n, k)) err(w, k + ' is for dialogue nodes only'); });
          if (has(n, 'contextAction') && n.contextAction !== null) err(w, 'the context action is dialogue-only until the thought contract');
        }
        if (n.mode === 'focus') {
          if (typeof n.focus !== 'string') err(w, 'a focus node needs a focus id');
          else if (!has(focusArt, n.focus)) err(w, 'unregistered focus ' + n.focus);
          else refs.focus[n.focus] = true;
        } else if (has(n, 'focus')) err(w, 'focus is for focus nodes only');
        if (n.objective !== undefined) plainField(w + ' objective', n.objective);
        effects(w, n.effects);
        textField(w + ' text', n.text);
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
            if (n.mode !== 'dialogue') err(x, 'say is only echoed in dialogue nodes');
            textField(x + ' say', c.say);
          }
          cond(x, c.if);
          effects(x, c.effects);
          if (c.once !== undefined && c.once !== true) err(x, 'once must be true when present');
          if (c.once) onceKeys[chId + ':' + id + ':' + c.id] = true;
          if (c.result !== undefined) textField(x + ' result', c.result);
          var ds = destinations(x, c, n, chId, true);
          if (has(c, 'restart')) {
            if (c.restart !== true) err(x, 'restart must be true');
            if (c.kind !== 'system') err(x, 'restart is a system choice');
            if (!n.end) err(x, 'restart is only allowed on an end node');
          } else if (c.kind === 'system') err(x, 'a system choice must restart');
          if (!ds.length && !c.once && c.effects === undefined) err(x, 'stays here and changes nothing (needs once or effects, or a destination)');
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
            } else if (e.say !== undefined) err(x, 'say is only echoed in dialogue nodes');
            cond(x, e.if);
            effects(x, e.effects);
            if (e.once !== undefined && e.once !== true) err(x, 'once must be true when present');
            if (e.once) onceKeys[chId + ':' + id + ':' + item + ':' + verb] = true;
            if (e.result !== undefined) textField(x + ' result', e.result);
            var ds = destinations(x, e, n, chId, false);
            if (!ds.length && !e.once && e.effects === undefined) err(x, 'stays here and changes nothing (needs once or effects, or a destination)');
          });
        });
      });
    });
    if (!endings) err('story', 'no node is marked end: true');
    Object.keys(scenes).forEach(function (id) { if (!refs.scenes[id]) err('assets.scenes ' + id, 'registered but never used'); });
    Object.keys(focusArt).forEach(function (id) { if (!refs.focus[id]) err('assets.focus ' + id, 'registered but never used'); });
    Object.keys(portraits).forEach(function (id) {
      if (!refs.portraits[id]) err('assets.portraits ' + id, 'registered but no cast member uses it');
      var p = portraits[id];
      if (!obj(p) || !obj(p.backgrounds) || !obj(p.poses)) return;
      Object.keys(p.backgrounds).forEach(function (b) { if (!refs.layers[id + ':background:' + b]) err('assets.portraits ' + id, 'background ' + b + ' is never shown'); });
      Object.keys(p.poses).forEach(function (b) { if (!refs.layers[id + ':pose:' + b]) err('assets.portraits ' + id, 'pose ' + b + ' is never shown'); });
    });
    if (errors.length) return { ok: false, errors: errors };

    // Walk every reachable state ------------------------------------------------------------
    // The key is v1's (node, flags, inventory, item marks) plus what v2 adds to the route:
    // chapter, the excursion opener and which `once` entries are spent. The transcript, the
    // objective and the context action are presentation history, not route state.
    function key(s) {
      var spent = s.taken.map(function (t) { return t.at + ':' + (t.c || t.item + ':' + t.verb); })
        .filter(function (k) { return onceKeys[k]; }).sort();
      return JSON.stringify([s.chapter, s.node, s.returnTo, s.flags, s.inventory.slice().sort(),
        Object.keys(s.items).sort().map(function (k) { return [k, s.items[k].slice().sort()]; }), spent]);
    }
    function bare(s) {
      var c = clone(s);
      c.transcript = [];
      c.taken = c.taken.filter(function (t) { return onceKeys[t.at + ':' + (t.c || t.item + ':' + t.verb)]; });
      return c;
    }
    var seen = {};
    var first = begin(story, { obs: seen }).state;
    var states = {};
    var edges = {};
    var queue = [bare(first)];
    states[key(first)] = queue[0];
    var used = { choices: {}, entries: {} };
    var restartFrom = [];
    var backless = {};
    function follow(from, s) {
      var k = key(s);
      (edges[key(from)] = edges[key(from)] || []).push(k);
      if (!states[k]) { states[k] = s; queue.push(s); }
    }
    function walkStep(s, input) {
      return stepCore(story, s, input, { obs: seen }).state;
    }
    while (queue.length) {
      var s = queue.shift();
      var n = here(story, s);
      var where = at(s);
      (story.files || []).forEach(function (f, i) { if (test(f.if, s)) seen['files[' + i + ']'] = true; });
      if (!s.returnTo && n.choices.some(function (c) { return c.back; }) && !backless[where]) {
        backless[where] = true;
        errors.push('a back choice at ' + where + ' is reachable with no opener to return to (enter it from a narrative node, or split the node)');
      }
      var avail = openChoices(story, s);
      if (!avail.length) errors.push('dead end: no choice is available at ' + where + ' with state ' + key(s));
      avail.forEach(function (c) {
        used.choices[where + ':' + c.id] = true;
        if (c.restart) { restartFrom.push(key(s)); return; }
        follow(s, bare(walkStep(s, { choice: c.id })));
      });
      s.inventory.forEach(function (id) {
        seen['item ' + id + ' description[' + variantIndex2(items[id].description, s) + ']'] = true;
        if (itemMarks(s, id).indexOf('inspected') === -1) follow(s, walkStep(s, { item: id, verb: 'inspect' }));
        if (items[id].read && itemMarks(s, id).indexOf('read') === -1) follow(s, walkStep(s, { item: id, verb: 'read' }));
        ['show', 'use'].forEach(function (verb) {
          if (!openEntry(story, s, id, verb)) return;
          used.entries[where + ':' + verb + ':' + id] = true;
          follow(s, bare(walkStep(s, { item: id, verb: verb })));
        });
      });
    }

    // Everything authored must be reachable.
    function variantsSeen(field, prefix, label) {
      if (!isVariants(field)) { if (!seen[prefix + '[0]']) errors.push(label + ' never shown'); return; }
      field.forEach(function (v, i) { if (!seen[prefix + '[' + i + ']']) errors.push(label + ' variant ' + i + ' never shown'); });
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
        });
        ['show', 'use'].forEach(function (verb) {
          Object.keys(n[verb] || {}).forEach(function (item) {
            if (!used.entries[w + ':' + verb + ':' + item]) return errors.push(verb + ' never available: ' + w + ':' + item);
            var e = n[verb][item];
            if (e.result !== undefined) variantsSeen(e.result, 'result ' + w + ':' + verb + ':' + item, 'result of ' + w + ' ' + verb + ' ' + item);
          });
        });
      });
    });
    Object.keys(items).forEach(function (id) {
      var d = items[id].description;
      if (isVariants(d)) d.forEach(function (v, i) { if (!seen['item ' + id + ' description[' + i + ']']) errors.push('description variant never seen: ' + id + '[' + i + ']'); });
    });
    (story.files || []).forEach(function (f, i) { if (!seen['files[' + i + ']']) errors.push('case-file entry never shown: files[' + i + ']'); });

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
    Object.keys(states).filter(function (k) { return !canFinish[k]; }).forEach(function (k) { errors.push('cannot reach an ending from state ' + k); });

    return {
      ok: !errors.length,
      errors: errors,
      stats: {
        chapters: chapterIds.length,
        nodes: counts.nodes,
        choices: counts.choices,
        reachableStates: Object.keys(states).length,
        endings: endings,
        endingStates: restartFrom.length
      }
    };
  }

  var Rules = {
    MARKS: MARKS,
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
    paras: toParas,
    applyEffects: applyEffects,
    validateStory: validateStory
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Rules;
  else root.CYOA_RULES = Rules;
})(this);
