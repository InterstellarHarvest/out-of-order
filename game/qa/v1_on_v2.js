// QA only (docs/74, EF-N1): the v1 reception API of game/js/rules.js re-implemented over the v2
// engine (Rules.fromV1 + begin/step/view), so that `node game/qa/validate_route.js --v2` runs the
// route suite's unchanged checks against the new rules. The game never loads this file.
//
// v1 splits a turn in two (choose, then enter after the beat); v2 commits it in one step. So
// choose() commits the whole step here, and enter() hands back the arrival line that step
// already produced. A state is a holder whose v1 fields read through to the v2 state; its
// transcript is v2's paragraphs regrouped into v1 lines ({ who: 'npc' | 'player' | 'thought', text }).
'use strict';

const Rules = require('../js/rules.js');

const stories = new WeakMap();
function storyFor(content) {
  let s = stories.get(content);
  if (!s) { s = Rules.fromV1(content); stories.set(content, s); }
  return s;
}

// v2 transcript entries -> v1 lines: one line per (step, source), paragraphs joined by \n and
// runs by single spaces.
function lines(entries) {
  const out = [];
  let last = null;
  entries.forEach((e) => {
    const text = e.runs.map((r) => r.text).join(' ');
    if (last && last.n === e.n && last.src === e.src) { last.line.text += '\n' + text; return; }
    const who = e.src === 'thought' ? 'thought' : e.src === 'echo' ? 'player' : 'npc';
    last = { n: e.n, src: e.src, line: { who, text } };
    out.push(last.line);
  });
  return out;
}

function holder(v2) {
  const h = {};
  Object.defineProperty(h, 'v2', { value: v2, writable: true, enumerable: true });
  Object.defineProperty(h, 'pending', { value: null, writable: true, enumerable: false });
  ['node', 'flags', 'inventory', 'items', 'objective', 'contextDone'].forEach((k) => {
    Object.defineProperty(h, k, { enumerable: true, get() { return this.v2[k]; }, set(v) { this.v2[k] = v; } });
  });
  Object.defineProperty(h, 'transcript', { enumerable: true, get() { return lines(this.v2.transcript); } });
  return h;
}
const v2Of = (h) => h.v2;

// Commit a step and remember its arrival line for enter().
function commit(content, h, input) {
  const story = storyFor(content);
  const r = Rules.step(story, v2Of(h), input);
  if (r.events.some((e) => e.t === 'restart')) return { say: null, to: null, restart: true };
  const before = v2Of(h).transcript.length;
  const added = r.state.transcript.slice(before);
  const echo = lines(added.filter((e) => e.src === 'echo'))[0];
  const arrival = lines(added.filter((e) => e.src === 'text'))[0];
  h.v2 = r.state;
  h.pending = { to: r.state.node, line: arrival ? arrival.text : null };
  return { say: echo ? echo.text : null, to: r.state.node, restart: false };
}

const API = {
  MARKS: Rules.MARKS,
  clone: Rules.clone,
  test: (cond, h) => Rules.test(cond, v2Of(h)),
  start(content) {
    return holder(Rules.begin(storyFor(content)).state);
  },
  choices(content, h) {
    const story = storyFor(content);
    const node = story.chapters[v2Of(h).chapter].nodes[v2Of(h).node];
    return Rules.view(story, v2Of(h)).cards.map((c) => node.choices.find((x) => x.id === c.id));
  },
  choose(content, h, id) {
    return commit(content, h, { choice: id });
  },
  enter(content, h, id) {
    if (!h.pending || h.pending.to !== id) throw new Error('v1_on_v2: enter(' + id + ') without the step that leads there');
    const line = h.pending.line;
    h.pending = null;
    return line;
  },
  itemActions(content, h, id) {
    const v = Rules.view(storyFor(content), v2Of(h)).items.find((i) => i.id === id);
    return v ? { read: v.read, show: v.show || null, use: v.use || null } : { read: false, show: null, use: null };
  },
  inspect(content, h, id) {
    h.v2 = Rules.step(storyFor(content), v2Of(h), { item: id, verb: 'inspect' }).state;
  },
  itemAction(content, h, id, kind) {
    if (kind === 'read') {
      h.v2 = Rules.step(storyFor(content), v2Of(h), { item: id, verb: 'read' }).state;
      return null;
    }
    return commit(content, h, { item: id, verb: kind });
  },
  description: (content, h, id) => Rules.description(storyFor(content), v2Of(h), id),
  files: (content, h) => Rules.files(storyFor(content), v2Of(h)),
  // The same object every time (v1 callers compare identity).
  contextAction(content, h) {
    const story = storyFor(content);
    const v = Rules.view(story, v2Of(h)).context;
    if (!v) return null;
    const node = story.chapters[v2Of(h).chapter].nodes[v2Of(h).node];
    return Object.prototype.hasOwnProperty.call(node, 'contextAction') ? node.contextAction : story.contextAction;
  },
  contextSpent(content, h) {
    const v = Rules.view(storyFor(content), v2Of(h)).context;
    return !!v && v.spent;
  },
  takeContextAction(content, h) {
    const r = Rules.step(storyFor(content), v2Of(h), { context: true });
    h.v2 = r.state;
    return lines(r.state.transcript.slice(-1))[0].text;
  },
  validate(content, charset) {
    return Rules.validateStory(Rules.fromV1(content), charset);
  }
};

module.exports = API;
module.exports.lines = lines;
