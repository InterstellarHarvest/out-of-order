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
    clone: clone
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Rules;
  else root.CYOA_RULES = Rules;
})(this);
