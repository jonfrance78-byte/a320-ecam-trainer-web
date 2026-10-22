/* A320 Normal Procedures: flow engine.
 *
 * Panel states use the ECAM Trainer's panel library (js/panels.js): states[panel][index]
 * holds { lit, cur, ... } for each control. A flow step names one control and the
 * state it must reach. The aircraft state at the start of any flow is rebuilt from
 * the secured aircraft (INITIAL) by applying every earlier step, so flows can be
 * started in any order and the panels always match the phase of flight.
 *
 * Step targets (step.to):
 *   true / false   latching pushbutton: its selection legend (OFF, ON, ALTN...) lit or not
 *   'press'        momentary pushbutton or knob: one press
 *   'NAV' / [...]  selector, toggle or lever: one position, or any of several
 */
(function () {
  'use strict';

  var PN = window.ECAM_PANELS, P = PN.P;
  var cache = {};

  // 'PANEL/control name#n' -> { panel, i, it }. Panel ids never contain '/'.
  function resolve(ref) {
    if (cache[ref]) return cache[ref];
    var k = ref.indexOf('/'), id = ref.slice(0, k), name = ref.slice(k + 1), n = 1, m = /#(\d+)$/.exec(name);
    if (m) { n = +m[1]; name = name.slice(0, m.index); }
    var p = P[id];
    if (!p) throw new Error('No panel ' + id);
    for (var i = 0, c = 0; i < p.items.length; i++) {
      var it = p.items[i];
      if ((it.k === 'fire' ? it.label : it.name) === name && ++c === n) return (cache[ref] = { panel: id, i: i, it: it });
    }
    throw new Error('No control ' + ref);
  }

  // The legend that shows the crew's selection, as in the panel library.
  function selLeg(it) {
    if (it.k !== 'pb') return null;
    if (it.bar) return 'lo';
    if (it.rect) return null;
    var status = PN.statusLegends(it);
    if (it.lo && status.indexOf(it.lo.s) < 0) return 'lo';
    if (it.up && status.indexOf(it.up.s) < 0) return 'up';
    return null;
  }

  function stOf(states, r) { var p = states[r.panel] || (states[r.panel] = {}); return p[r.i] || (p[r.i] = {}); }
  function peek(states, r) { return (states[r.panel] || {})[r.i] || {}; }
  function cur(states, r) { var s = peek(states, r); return s.cur != null ? s.cur : r.it.cur; }
  function bits(states, r) { return PN.litBits(peek(states, r).lit, r.it); }
  function setBits(states, r, b) { stOf(states, r).lit = b.up && b.lo ? 'both' : b.up ? 'up' : b.lo ? 'lo' : (r.it.lit ? 'none' : null); }
  function wanted(r, to) {
    return [].concat(to).map(function (v) {
      var i = r.it.pos ? r.it.pos.indexOf(v) : -1;
      if (i < 0) throw new Error('No position ' + v + ' on ' + r.panel + '/' + r.it.name);
      return i;
    });
  }
  function kind(step) { return step.to === 'press' ? 'press' : typeof step.to === 'boolean' ? 'pb' : 'pos'; }

  function met(states, step) {
    var r = resolve(step.ref);
    switch (kind(step)) {
      case 'press': return false;
      case 'pb': return bits(states, r)[selLeg(r.it)] === step.to;
      default: return wanted(r, step.to).indexOf(cur(states, r)) >= 0;
    }
  }

  // Radio groups (AUTO BRK LO/MED/MAX): selecting one deselects the others.
  function clearGroup(states, r) {
    P[r.panel].items.forEach(function (o, j) {
      if (j === r.i || o.group !== r.it.group) return;
      var q = { panel: r.panel, i: j, it: o }, b = bits(states, q);
      if (b.lo) { b.lo = false; setBits(states, q, b); }
    });
  }

  // Side effects of a step on other controls: [[ref, { up: bool } | { lo: bool } | { cur: n }]...]
  function applyAfter(states, after) {
    (after || []).forEach(function (a) {
      var r = resolve(a[0]), v = a[1];
      if ('up' in v || 'lo' in v) {
        var b = bits(states, r);
        if ('up' in v) b.up = v.up;
        if ('lo' in v) b.lo = v.lo;
        setBits(states, r, b);
      } else Object.assign(stOf(states, r), v);
    });
  }

  // Put the control straight into the step's target state (used to rebuild a phase).
  function apply(states, step) {
    if (step.ref && kind(step) !== 'press') {
      var r = resolve(step.ref);
      if (kind(step) === 'pb') {
        var b = bits(states, r);
        b[selLeg(r.it)] = step.to;
        setBits(states, r, b);
        if (r.it.group && step.to) clearGroup(states, r);
      } else stOf(states, r).cur = wanted(r, step.to)[0];
    }
    applyAfter(states, step.after);
  }

  // One press on the step's control, moving it towards the target.
  function pressToward(states, step) {
    var r = resolve(step.ref), it = r.it;
    switch (kind(step)) {
      case 'press':
        var s = stOf(states, r);
        if (it.k === 'knob') s.angle = ((s.angle || 0) + 40 + 120) % 240 - 120;
        else s.down = true;
        return;
      case 'pb':
        PN.pressItems(P[r.panel].items, r.i, states[r.panel] || (states[r.panel] = {}));
        return;
      default:
        var c = cur(states, r), ws = wanted(r, step.to);
        var best = ws.reduce(function (a, b) { return Math.abs(b - c) < Math.abs(a - c) ? b : a; });
        if (c !== best) stOf(states, r).cur = c + (best > c ? 1 : -1);
    }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // State at step k of flow fi. Practice flows (flow.from) start from the state
  // before the named normal flow, plus their own presets (flow.pre).
  function stateAt(D, flow, k) {
    var s = {};
    D.INITIAL.forEach(function (st) { apply(s, st); });
    var upto = flow.from ? indexOf(D, flow.from) : D.FLOWS.indexOf(flow);
    for (var f = 0; f < upto; f++) D.FLOWS[f].steps.forEach(function (st) { apply(s, st); });
    (flow.pre || []).forEach(function (st) { apply(s, st); });
    flow.steps.slice(0, k || 0).forEach(function (st) { apply(s, st); });
    return s;
  }
  function indexOf(D, id) {
    for (var i = 0; i < D.FLOWS.length; i++) if (D.FLOWS[i].id === id) return i;
    throw new Error('No flow ' + id);
  }

  window.NP_CORE = { resolve: resolve, selLeg: selLeg, met: met, apply: apply, applyAfter: applyAfter, pressToward: pressToward, stateAt: stateAt, kind: kind, cur: cur, bits: bits, clone: clone };
})();
