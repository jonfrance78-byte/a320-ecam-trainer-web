/* A320 Normal Procedures: app.
 * Home lists the flows and the approach guides. A flow runs on the trainer's
 * panel drawings: the current item is highlighted and is done by working the
 * control itself. Recall mode hides the item so the flow is flown from memory.
 */
(function () {
  'use strict';

  var TRAINER = 'index.html';
  var PN = window.ECAM_PANELS, NP = window.NP_CORE, D = window.NP_FLOWS, AP = window.NP_APPROACHES;
  var esc = PN.MK.esc;

  var ICON = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
  };

  function store(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem('np-' + k)); localStorage.setItem('np-' + k, JSON.stringify(v)); } catch (e) { return null; }
  }
  var DONE = store('done') || {};
  var MODE = store('mode') || 'guided';

  // Inline markup for FMA modes and operator-dependent items.
  function fmt(s) {
    return esc(s).replace(/\[([gbcmaw]):([^\]]+)\]/g, '<span class="fma fma-$1">$2</span>').replace(/◆/g, '<span class="op" title="Operator-dependent: check the Jet2 OM">◆</span>');
  }
  function flowById(id) {
    var all = D.FLOWS.concat(D.PRACTICE);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function panelName(id) { var p = PN.P[id]; return (p && (p.name || p.title)) || id; }
  function ctlLabel(ref) { return D.LABELS[ref] || PN.ctlName(NP.resolve(ref).it); }
  // Item list label: the say text alone when it already names the item ("ENG 2 — ON").
  function itemLabel(st) {
    var c = ctlLabel(st.ref), say = st.say;
    if ((/ — /.test(say) && !/ — check$/.test(say)) || say.toUpperCase().indexOf(c.toUpperCase()) === 0) return say;
    return c + ' — ' + say;
  }

  /* ------------------------------------------------------------- app bar */
  // The app's slim dark bar (owner's request, 0.7.78): back only, no title. Back goes one step
  // back, as Android Back does: a flow or approach to the procedures, the procedures to the trainer.
  function bar() {
    return '<header class="appbar"><button class="icon-btn" data-act="back" aria-label="Back">' + ICON.back + '</button><span class="appbar-title"></span></header>';
  }

  /* ---------------------------------------------------------------- home */
  var VIEW = 'home', R = null, APV = null, AUTO_T = 0, SPEAK_T = 0;
  function renderHome() {
    var groups = [];
    D.FLOWS.forEach(function (f, i) {
      var g = groups[groups.length - 1];
      if (!g || g.name !== f.group) groups.push(g = { name: f.group, flows: [] });
      g.flows.push({ f: f, n: i + 1 });
    });
    var total = D.FLOWS.length, done = D.FLOWS.filter(function (f) { return DONE[f.id]; }).length;
    var h = bar() +
      '<main class="np-home">' +
      '<section class="np-hero">' +
      '<p class="eyebrow">A320 family · Airbus SOP</p>' +
      '<h2 class="np-h1">Fly the flows on the panels</h2>' +
      '<p class="np-lede">Every normal procedure from power-up to securing the aircraft, worked on the flight deck panels from the ECAM Trainer, with the normal checklists where they fall. Then the technique for each approach type.</p>' +
      '<div class="np-hero-act">' +
      '<button class="btn primary" data-act="flow" data-id="' + D.FLOWS[0].id + '" data-chain="1">Fly the full sector</button>' +
      '<a class="btn" href="' + TRAINER + '">Open the ECAM Trainer for failures</a>' +
      '</div>' +
      modeSeg() +
      '<dl class="np-stats">' + stats().map(function (x) { return '<div><dt>' + esc(x[1]) + '</dt><dd>' + x[0] + '</dd></div>'; }).join('') + '</dl>' +
      '</section>' +
      // Flows left, approaches right on a wide screen (owner's request, 0.7.33).
      '<div class="np-cols">' +
      '<section class="np-sec" id="flows" aria-labelledby="flows-h">' +
      '<div class="np-sec-head"><h2 id="flows-h" class="np-h2">Flows and checklists</h2><span class="np-count">' + done + ' of ' + total + ' flown</span></div>' +
      groups.map(function (g) {
        return '<h3 class="np-h3">' + esc(g.name) + '</h3><ol class="np-flows" start="' + g.flows[0].n + '">' + g.flows.map(function (x) {
          var f = x.f, sets = f.steps.filter(function (s) { return s.k === 'set'; }).length;
          var lists = f.steps.filter(function (s) { return s.k === 'list'; }).map(function (s) { return s.name; });
          return '<li><button class="np-flow" data-act="flow" data-id="' + f.id + '">' +
            '<span class="np-flow-n">' + x.n + '</span>' +
            '<span class="np-flow-b"><span class="np-flow-t">' + esc(f.title) + '</span>' +
            '<span class="np-flow-m">' + esc(f.phase) + ' · ' + sets + ' panel items' + (lists.length ? ' · <span class="np-cl">' + esc(lists.join(', ')) + '</span>' : '') + '</span></span>' +
            (DONE[f.id] ? '<span class="np-pill ok">Flown</span>' : '') + '</button></li>';
        }).join('') + '</ol>';
      }).join('') +
      '</section>' +
      '<section class="np-sec" id="approaches" aria-labelledby="appr-h">' +
      '<div class="np-sec-head"><h2 id="appr-h" class="np-h2">Approaches</h2></div>' +
      '<ul class="np-appr">' + AP.APPROACHES.map(function (a) {
        return '<li><button class="np-acard" data-act="appr" data-id="' + a.id + '">' +
          '<span class="np-acard-t">' + esc(a.title) + '</span>' +
          '<span class="np-acard-d">' + esc(a.short) + '</span>' +
          '<span class="np-tags">' + a.tags.map(function (t) { return '<span class="np-tag">' + esc(t) + '</span>'; }).join('') + '</span>' +
          (a.practise ? '<span class="np-acard-p">' + flyLabel(a) + '<span aria-hidden="true">\u2192</span></span>' : '') +
          '</button></li>';
      }).join('') + '</ul>' +
      '</section>' +
      '</div>' +
      '<section class="np-sec np-notes">' +
      '<h2 class="np-h2">Sources and conventions</h2>' +
      '<p>Built from the Airbus A320 family FCOM standard operating procedures, the Airbus standard normal checklist and the FCTM, simplified for training. <span class="op">◆</span> marks an item where Jet2 procedures, approvals or values apply: check the OM-A, OM-B and OM-C. Training aid only: follow the FCOM, QRH and the operator\'s procedures.</p>' +
      '<p>Panel drawings and controls come from the A320 ECAM Trainer.</p>' +
      '<details class="np-gloss"><summary>Abbreviations</summary><dl>' + AP.GLOSSARY.map(function (g) { return '<dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd>'; }).join('') + '</dl></details>' +
      '</section>' +
      '</main>';
    document.getElementById('app').innerHTML = h;
  }
  function stats() {
    var all = D.FLOWS.map(function (f) { return f.steps; }), n = function (k) { return all.reduce(function (t, st) { return t + st.filter(function (x) { return x.k === k; }).length; }, 0); };
    return [[D.FLOWS.length, 'Flows'], [n('set'), 'Panel items'], [n('list'), 'Checklists'], [AP.APPROACHES.length, 'Approach guides']];
  }
  function modeSeg() {
    return '<div class="np-mode"><span class="np-mode-l" id="mode-l">Flows</span><div class="seg" role="radiogroup" aria-labelledby="mode-l">' +
      [['guided', 'Guided'], ['recall', 'Recall']].map(function (m) {
        return '<button role="radio" aria-checked="' + (MODE === m[0]) + '" class="seg-btn' + (MODE === m[0] ? ' on' : '') + '" data-act="mode" data-mode="' + m[0] + '">' + m[1] + '</button>';
      }).join('') + '</div><span class="np-mode-h">' + (MODE === 'guided' ? 'Each item is shown and highlighted on its panel.' : 'Find each item from memory. Wrong controls are counted.') + '</span></div>';
  }

  /* ---------------------------------------------------------- flow runner */
  function startFlow(id, chain) {
    var f = flowById(id);
    R = { f: f, k: 0, states: presets(f, NP.stateAt(D, f, 0)), errors: 0, reveal: false, note: null, ticks: {}, chain: !!chain, panel: null, t0: Date.now(), pre: false };
    VIEW = 'run';
    enterStep();
  }
  // An approach practice starts level at 3000 ft: the FCU altitude window shows it (the panel's own default is 35000).
  function presets(f, states) {
    if (!f.sim0) return states;
    var i = PN.P.FCU.items.findIndex(function (x) { return x.k === 'win' && x.fcu === 'alt'; });
    states.FCU = states.FCU || {}; states.FCU[i] = Object.assign({}, states.FCU[i], { val: String(f.sim0.fcuAlt) });
    return states;
  }
  // A callout through the speakers (the browser's own voice). A list is spoken in turn, 2 seconds apart.
  // Cancelling only when something is queued, resuming a paused engine, choosing an English voice when the
  // device has one and speaking a moment after the cancel are the usual cures for a browser that stays silent.
  function speak(w) {
    var list = [].concat(w), ss = window.speechSynthesis;
    clearTimeout(SPEAK_T);
    if (!ss) return;
    var say = function (x) {
      try {
        var u = new SpeechSynthesisUtterance(x), vs = ss.getVoices ? ss.getVoices() : [], v = vs.filter(function (q) { return /^en[-_]GB/i.test(q.lang); })[0] || vs.filter(function (q) { return /^en/i.test(q.lang); })[0];
        if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = 0.9;
        if (ss.resume) ss.resume();
        ss.speak(u);
      } catch (e) { /* no speech: silent */ }
    };
    try { if (ss.speaking || ss.pending) ss.cancel(); } catch (e) { /* no speech: silent */ }
    var rr = R, kk = R.k;
    SPEAK_T = setTimeout(function () {
      if (R !== rr || R.k !== kk || VIEW !== 'run') return;
      say(list[0]);
      if (list.length > 1) SPEAK_T = setTimeout(function () { if (R === rr && R.k === kk && VIEW === 'run') say(list[1]); }, 2000);
    }, 80);
  }
  function step() { return R.f.steps[R.k]; }
  // Before the step: remember whether its target is already met (then it is a check).
  function enterStep() {
    var st = step();
    R.reveal = false; R.ticks = {};
    clearTimeout(AUTO_T); clearTimeout(SPEAK_T); if (R) { clearTimeout(R.holdT); R.held = false; }
    if (st && st.speak) speak(st.speak);
    if (st) {
      R.pre = st.k === 'set' && NP.met(R.states, st);
      if (st.k === 'set') R.panel = NP.resolve(st.ref).panel;
      else if (st.panel) R.panel = st.panel;
      if (st.k === 'set' && st.ref) {
        // Slides and selectors move towards the target, whichever way that is.
        var r = NP.resolve(st.ref), s = R.states[r.panel] && R.states[r.panel][r.i];
        if (s) delete s.dir;
      }
    }
    render();
    // A step with auto has nothing for the user to do: the next item follows after that many ms.
    if (st && st.auto) { var kk = R.k, rr = R; AUTO_T = setTimeout(function () { if (R === rr && R.k === kk && VIEW === 'run') complete('Checked.'); }, st.auto); }
  }
  function jumpTo(k) {
    R.k = k; R.states = presets(R.f, NP.stateAt(D, R.f, k)); R.note = null; R.boxes = []; R.anim = null;
    enterStep();
  }
  function complete(msg) {
    var st = step();
    if (st.k === 'check' || st.k === 'set') NP.applyAfter(R.states, st.after);
    markFma(R.f, R.k);
    R.note = { ok: true, s: msg };
    R.k++;
    if (R.k >= R.f.steps.length) { DONE[R.f.id] = true; store('done', DONE); }
    enterStep();
  }
  function pressCtl(i) {
    var st = step();
    if (!st || st.k !== 'set' || R.held) return;
    var r = NP.resolve(st.ref), it = PN.P[R.panel].items[i];
    var also = st.also ? NP.resolve(st.also) : null;
    if (R.panel !== r.panel || (i !== r.i && !(also && R.panel === also.panel && i === also.i))) {
      if (MODE === 'recall') R.errors++;
      R.note = { ok: false, s: 'Not this one: that is ' + PN.ctlName(it) + '.' + (MODE === 'recall' ? ' The next item is on this panel.' : ' The item is highlighted.') };
      render();
      return;
    }
    if (R.pre) { complete(ctlLabel(st.ref) + ': checked, ' + st.say.replace(/ — check$/, '') + '.'); return; }
    NP.pressToward(R.states, st);
    var s = R.states[r.panel][r.i];
    if (s && s.down) setTimeout(function () { if (s) { s.down = false; if (VIEW === 'run') renderStage(); } }, 180);
    if (NP.kind(st) === 'press' || NP.met(R.states, st)) {
      var done = ctlLabel(st.ref) + ': ' + st.say + '.';
      // hold: the result stays on show for that many ms before the next action (R.held: the page and displays already show the step done)
      if (st.hold) { R.held = true; R.note = { ok: true, s: st.say + ' entered.' }; render(); clearTimeout(R.holdT); var rr = R, kk = R.k; R.holdT = setTimeout(function () { if (R === rr && R.k === kk && VIEW === 'run') { R.held = false; complete(done); } }, st.hold); }
      else complete(done);
    }
    else { R.note = { ok: true, s: 'Keep going: ' + ctlLabel(st.ref) + ' is moving to ' + st.say + '.' }; render(); }
  }

  function roleChip(who) { return who ? '<span class="np-who">' + esc(who) + '</span>' : ''; }
  function stepCard() {
    var st = step(), f = R.f;
    if (!st) return doneCard();
    var hide = MODE === 'recall' && !R.reveal && st.k === 'set';
    var h = '<div class="np-card" aria-live="polite">';
    if (st.k === 'set') {
      var r = NP.resolve(st.ref);
      h += '<p class="eyebrow">' + esc(panelName(r.panel)) + roleChip(st.who) + '</p>';
      if (hide) h += '<h3 class="np-act">Next item?</h3><p class="np-why">Tap the control the flow works next on this panel.</p>';
      else h += '<h3 class="np-act"><span class="np-ctl">' + esc(ctlLabel(st.ref)) + '</span><span class="np-dots" aria-hidden="true"></span><span class="np-val">' + fmt(st.say) + '</span></h3>' +
        (st.why ? '<p class="np-why">' + fmt(st.why) + '</p>' : '') +
        '<p class="np-do">' + (R.pre ? 'Already set: tap it on the panel to check it.' : 'Work the highlighted control on the panel.') + '</p>';
    } else if (st.k === 'check') {
      h += '<p class="eyebrow">Check' + roleChip(st.who) + '</p><h3 class="np-act np-act-c">' + fmt(st.say) + '</h3>' + (st.why ? '<p class="np-why">' + fmt(st.why) + '</p>' : '');
    } else {
      h += '<p class="eyebrow">Normal checklist</p><h3 class="np-act np-act-c">' + esc(st.name) + '</h3>' + checklist(st);
    }
    if (R.note) h += '<p class="np-note' + (R.note.ok ? ' ok' : ' bad') + '">' + esc(R.note.s) + '</p>';
    h += '<div class="np-btns">';
    if (st.k === 'check' && st.auto) h += '<span class="np-why">Nothing to do: the next item follows in a moment.</span>';
    else if (st.k === 'check') h += '<button class="btn primary" data-act="checked" id="np-go">Checked</button>';
    if (st.k === 'list') {
      var all = st.items.every(function (it, j) { return !it[1] || R.ticks[j]; });
      h += '<button class="btn primary" data-act="listdone" id="np-go"' + (all ? '' : ' disabled') + '>' + esc(st.name) + ' checklist complete</button>';
    }
    if (hide) h += '<button class="btn" data-act="reveal">Show the item</button>';
    h += '<span class="np-sp"></span>' +
      (R.k > 0 ? '<button class="btn sm" data-act="prev">Back</button>' : '') +
      '<button class="btn sm" data-act="skip">Next</button></div>';
    return h + '</div>';
  }
  function checklist(st) {
    return '<ul class="np-list">' + st.items.map(function (it, j) {
      if (!it[1]) return '<li class="np-list-sub">' + esc(it[0].replace(/^— /, '')) + '</li>';
      var on = !!R.ticks[j];
      return '<li><button class="np-li' + (on ? ' on' : '') + '" data-act="tick" data-j="' + j + '" aria-pressed="' + on + '">' +
        '<span class="np-box" aria-hidden="true"></span><span class="np-li-c">' + esc(it[0]) + '</span><span class="np-dots" aria-hidden="true"></span><span class="np-li-r">' + fmt(it[1]) + '</span></button></li>';
    }).join('') + '</ul>';
  }
  function doneCard() {
    var f = R.f, i = D.FLOWS.indexOf(f), next = i >= 0 ? D.FLOWS[i + 1] : null, secs = Math.round((Date.now() - R.t0) / 1000);
    var practice = !!f.from;
    return '<div class="np-card np-done">' +
      '<p class="eyebrow">Flow complete</p><h3 class="np-act np-act-c">' + esc(f.title) + '</h3>' +
      '<p class="np-why">' + f.steps.length + ' items in ' + Math.floor(secs / 60) + ' min ' + (secs % 60) + ' s' +
      (MODE === 'recall' ? ' · ' + R.errors + (R.errors === 1 ? ' wrong control' : ' wrong controls') : '') + '.</p>' +
      '<div class="np-btns">' +
      (next ? '<button class="btn primary" data-act="flow" data-id="' + next.id + '"' + (R.chain ? ' data-chain="1"' : '') + ' id="np-go">Next: ' + esc(next.title) + '</button>' : '') +
      (practice ? '<button class="btn primary" data-act="appr" data-id="' + esc(apprFor(f.id)) + '" id="np-go">Back to the approach guide</button>' : '') +
      '<button class="btn" data-act="flow" data-id="' + f.id + '">Fly it again</button>' +
      '<button class="btn" data-act="home">All procedures</button></div></div>';
  }
  // The practice link on an approach: "Fly the approach", with the PFD and ND where the flow has them.
  function flyLabel(a) { return 'Fly the approach' + (flowById(a.practise).sim0 ? ' with PFD and ND' : ''); }
  function apprFor(pid) { for (var i = 0; i < AP.APPROACHES.length; i++) if (AP.APPROACHES[i].practise === pid) return AP.APPROACHES[i].id; return ''; }

  // The MCDU page the last step that sets one has put on the screen (mcdu: in js/flows.js).
  function mcduPageAt(f, k) {
    var pg = null;
    for (var i = 0; i < k && i < f.steps.length; i++) if (f.steps[i].mcdu) pg = D.MCDU[f.steps[i].mcdu];
    return pg;
  }
  function stageSvg() {
    var id = R.panel || 'LOWER', p = PN.P[id], st = step();
    PN.LIVE.mcduPage = mcduPageAt(R.f, R.k + (R.held ? 1 : 0));
    var target = st && st.k === 'set' && !st.nohl && !(MODE === 'recall' && !R.reveal) ? NP.resolve(st.ref).i : null;
    var aspect = p.w / p.h;
    return '<div class="np-stage' + (aspect > 2.2 ? ' wide' : '') + '"><p class="np-stage-l">' + esc(panelName(id)) + '</p>' +
      '<svg viewBox="-4 -4 ' + (p.w + 8) + ' ' + (p.h + 8) + '" class="pv-svg np-svg" role="group" aria-label="' + esc(panelName(id)) + ' panel">' +
      PN.defs() + PN.render(id, { interactive: true, states: R.states[id] || {}, selected: target }) + '</svg></div>';
  }
  function stepList() {
    var f = R.f;
    return '<ol class="np-steps">' + f.steps.map(function (st, k) {
      var label = st.k === 'set' ? (MODE === 'recall' && k >= R.k ? panelName(NP.resolve(st.ref).panel) + ' · …' : itemLabel(st)) : st.k === 'list' ? st.name + ' checklist' : st.say;
      var cls = k < R.k ? 'done' : k === R.k ? 'now' : '';
      return '<li class="' + cls + '"><button data-act="jump" data-k="' + k + '"' + (k === R.k ? ' aria-current="step"' : '') + '>' +
        '<span class="np-st-i" aria-hidden="true">' + (k < R.k ? '✓' : st.k === 'list' ? '☰' : st.k === 'check' ? '○' : '●') + '</span><span class="np-st-t">' + fmt(label) + '</span></button></li>';
    }).join('') + '</ol>';
  }
  function renderRun() {
    var f = R.f, n = f.steps.length, k = Math.min(R.k, n), i = D.FLOWS.indexOf(f);
    var h = bar() +
      '<main class="np-run">' +
      '<div class="np-run-head">' +
      '<p class="eyebrow">' + (i >= 0 ? 'Flow ' + (i + 1) + ' of ' + D.FLOWS.length + ' · ' : 'Approach practice · ') + esc(f.phase) + '</p>' +
      (R.k === 0 && f.intro ? '<p class="np-intro">' + fmt(f.intro) + '</p>' : '') +
      '<div class="np-prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + k + '"><span style="width:' + (100 * k / n) + '%"></span></div>' +
      '<div class="np-run-meta"><span>' + k + ' / ' + n + '</span>' + modeSeg() + '</div>' +
      '</div>' +
      '<div class="np-grid"><div class="np-main"><div class="np-stagerow' + (f.sim0 ? ' has-disp' : '') + '"><div class="np-left">' + stepCard() + '<div id="np-stage">' + stageSvg() + '</div></div>' + dispHtml() + '</div></div>' +
      '<aside class="np-side"><details class="np-side-d" open><summary>Items in this flow</summary>' + stepList() + '</details></aside></div>' +
      '</main>';
    document.getElementById('app').innerHTML = h;
    var cur = document.querySelector('.np-steps li.now');
    if (cur && cur.scrollIntoView && window.matchMedia('(min-width: 900px)').matches) cur.scrollIntoView({ block: 'nearest' });
  }
  /* The PFD and ND beside the panels in the ILS and FLS practice flows. The state is the
   * flow's sim0 plus the sim of every step done so far (js/flows.js). Layout of the PFD
   * data after the Airbus Safety first #40 article on the FLS. */
  function simAt(f, k) {
    var m = Object.assign({}, f.sim0);
    for (var i = 0; i < k && i < f.steps.length; i++) if (f.steps[i].sim) Object.assign(m, f.steps[i].sim);
    return m;
  }
  /* A new engaged FMA mode (or approach capability) is boxed in white for 10 s: "white box on FMA"
   * and "guidance mode boxing on the FMA", Airbus Safety first #37. */
  function markFma(f, k) {
    if (!f.sim0) return;
    var a = simAt(f, k), b = simAt(f, k + 1), now = Date.now();
    R.boxes = (R.boxes || []).filter(function (x) { return x.until > now; });
    [['thr', 0], ['vert', 1], ['lat', 2], ['cap', 3], ['cap2', 3]].forEach(function (kc) { var key = kc[0], col = kc[1]; if (b[key] && b[key] !== a[key]) R.boxes = R.boxes.filter(function (x) { return x.col !== col; }).concat([{ col: col, until: now + 10000 }]); });
    var rr = R;
    setTimeout(function () { if (R === rr && VIEW === 'run') { var el = document.querySelector('.np-disp'); if (el) el.outerHTML = dispHtml(); } }, 10100);
  }
  /* The ILS and FLS course and glidepath bars (and the heading they bring) glide to their new place at 24
   * frames a second over 2.5 s instead of jumping: R.anim holds the values on show, where they started and
   * where they are going. */
  var FPS = 24, GLIDE_MS = 3000, GLIDE = ['loc', 'gs', 'hdgNow', 'alt', 'dme', 'cas', 'vs', 'fpa', 'vls', 'vmax', 'vfen'], ANIM_T = 0;
  function pick(m) { var o = {}; GLIDE.forEach(function (k) { o[k] = m[k]; }); return o; }
  function animAt(f) {
    var m = simAt(f, R.k + (R.held ? 1 : 0)), tg = pick(m), A = R.anim;
    if (!A) A = R.anim = { cur: tg, from: tg, tgt: tg, t0: 0 };
    else if (GLIDE.some(function (k) { return A.tgt[k] !== tg[k]; })) { A.from = Object.assign({}, A.cur); A.tgt = tg; A.t0 = Date.now(); }
    if (GLIDE.some(function (k) { return A.cur[k] !== A.tgt[k]; }) && !ANIM_T) {
      var rr = R;
      ANIM_T = setInterval(function () {
        var p = Math.min(1, (Date.now() - A.t0) / GLIDE_MS), e = p * p * (3 - 2 * p);
        if (R !== rr || VIEW !== 'run' || R.anim !== A) { clearInterval(ANIM_T); ANIM_T = 0; return; }
        GLIDE.forEach(function (k) { var a = A.from[k], b = A.tgt[k]; A.cur[k] = p >= 1 || typeof a !== 'number' || typeof b !== 'number' ? b : a + (b - a) * e; });
        var el = document.querySelector('.np-disp'); if (el) el.outerHTML = dispHtml();
        if (p >= 1) { clearInterval(ANIM_T); ANIM_T = 0; }
      }, 1000 / FPS);
    }
    return Object.assign({}, m, A.cur);
  }
  // The ND (ARC, the mode used most of the time) shows the final approach as the flight plan, in NM east and north of the aircraft: the
  // final track is 143°, the aircraft is d NM from the threshold and xt NM left of the final track (the FDP is 9.4 NM out, the missed
  // approach point 4.5 NM past the runway).
  function appRoute(d, xt) {
    var th = 143 * Math.PI / 180, u = [Math.sin(th), Math.cos(th)], rv = [Math.cos(th), -Math.sin(th)];
    return [['ELBEK', 9.4], ['RW14L', 0], ['NIVRO', -4.5, 'sc']].filter(function (w) { return d - w[1] > -0.3; }).map(function (w) { return [w[0], (d - w[1]) * u[0] + xt * rv[0], (d - w[1]) * u[1] + xt * rv[1], w[1], w[2]]; });
  }
  // The missed approach holds at NIVRO: a racetrack on the final track, right turns, 4 NM legs (inbound, then outbound 2.4 NM to the right).
  function holdPts(d, xt) {
    var th = 143 * Math.PI / 180, u = [Math.sin(th), Math.cos(th)], rv = [Math.cos(th), -Math.sin(th)], s0 = -4.5, pts = [], i, ph;
    var add = function (s, r) { var fw = d - s; pts.push(['', fw * u[0] + (r + xt) * rv[0], fw * u[1] + (r + xt) * rv[1]]); };
    add(s0 + 4, 0); add(s0, 0);
    for (i = 1; i <= 12; i++) { ph = i * Math.PI / 12; add(s0 - 1.2 * Math.sin(ph), 1.2 - 1.2 * Math.cos(ph)); }
    add(s0 + 4, 2.4);
    for (i = 1; i <= 12; i++) { ph = i * Math.PI / 12; add(s0 + 4 + 1.2 * Math.sin(ph), 1.2 + 1.2 * Math.cos(ph)); }
    return pts;
  }
  function dispHtml() {
    var f = R.f, DS = window.ECAM_DISPLAYS;
    if (!f.sim0 || !DS) return '';
    var m = animAt(f), ty = m.type, fls = ty === 'FLS', xls = ty === 'ILS' || fls, dme = m.dme.toFixed(1) + 'NM';
    var lsTxt = fls ? ['RWY14L', '3.0°', dme] : ['IBX', '109.50', dme], rt = appRoute(m.dme, (m.loc || 0) * 0.6);
    var pfd = DS.renderPFD({ alt: m.alt }, { thr: m.thr, vert: m.vert, lat: m.lat, arm: m.arm, armLat: m.armLat, cap: m.cap, cap2: m.cap2, min: m.min,
      ap: m.ap, fd: m.fd !== false, bird: m.bird, fpa: m.fpa, cas: m.cas, tgt: m.tgt != null ? m.tgt : m.cas, trend: m.tgt != null ? Math.max(-20, Math.min(20, m.tgt - m.cas)) : 0, vls: m.vls, vap: m.vls ? m.vls - 11 : null, vam: m.vls ? m.vls - 18 : null, vmax: m.vmax, vfen: m.vfen, box: (R.boxes || []).filter(function (x) { return x.until > Date.now(); }).map(function (x) { return x.col; }), fcuAlt: m.fcuAlt, fcuTop: true, vs: m.vs, hdgNow: m.hdgNow, hdgSel: m.hdgSel, hdg: m.hdgSel ? 113 : null,
      baro: '1013', ls: m.ls && xls, dev: m.ls && xls ? { loc: m.loc, gs: m.gs, dbl: fls } : null, lsTxt: m.ls && xls ? lsTxt : null, fls: fls && m.ls, ra: m.alt < 2500 ? Math.max(0, Math.round(m.alt)) : null });
    var nxt = rt[0];
    var nd = DS.renderND({ alt: m.alt }, { mode: 'ARC', range: 20, cstr: false, opt: null, n1: ty === 'NPA' && m.vor ? 'VOR' : 'OFF', brg1: 143, n2: 'OFF', hdg: m.hdgNow, crs: m.crs, gs: String(Math.round(m.cas) + 4 - 21), tas: String(Math.round(m.cas) + 4),
      hdgBug: m.hdgSel ? 113 : null, route: rt, hold: holdPts(m.dme, (m.loc || 0) * 0.6), ls: m.ls && xls ? { rwy: fls ? 'FLS14L' : 'ILS14L' } : null,
      to: nxt ? { name: nxt[0], brg: '143°', dist: Math.max(0, m.dme - nxt[3]).toFixed(1) } : null });
    return '<div class="np-disp" aria-label="PFD and ND">' + pfd + nd + '</div>';
  }
  function renderStage() { var el = document.getElementById('np-stage'); if (el) el.innerHTML = stageSvg(); }

  /* ---------------------------------------------------------- approaches */
  function openAppr(id, tab) {
    var a = null;
    AP.APPROACHES.forEach(function (x) { if (x.id === id) a = x; });
    if (!a) return;
    APV = { a: a, tab: tab || 0 }; VIEW = 'appr';
    render(); window.scrollTo(0, 0);
  }
  function block(b) {
    if (b.p) return '<p class="np-p">' + fmt(b.p) + '</p>';
    if (b.h) return '<h4 class="np-h4">' + fmt(b.h) + '</h4>';
    if (b.warn) return '<p class="np-warn">' + fmt(b.warn) + '</p>';
    if (b.list) return '<ul class="np-ul">' + b.list.map(function (l) { return '<li>' + fmt(l) + '</li>'; }).join('') + '</ul>';
    if (b.table) return '<div class="np-tw"><table class="np-t"><thead><tr>' + b.table.cols.map(function (c) { return '<th scope="col">' + fmt(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      b.table.rows.map(function (r) { return '<tr>' + r.map(function (c, j) { return j === 0 ? '<th scope="row">' + fmt(c) + '</th>' : '<td>' + fmt(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    if (b.seq) return '<ol class="np-seq">' + b.seq.map(function (r) {
      return '<li><div class="np-seq-w">' + fmt(r[0]) + '</div><div class="np-seq-d">' + fmt(r[1]) + '</div>' + (r[2] ? '<div class="np-seq-f">' + fmt(r[2]) + '</div>' : '') + '</li>';
    }).join('') + '</ol>';
    return '';
  }
  function renderAppr() {
    var a = APV.a, t = a.tabs[APV.tab];
    var h = bar() +
      '<main class="np-apv">' +
      '<p class="eyebrow">Approach guide</p><h2 class="np-h1 sm">' + esc(a.title) + '</h2>' +
      '<p class="np-lede">' + esc(a.short) + '</p>' +
      '<p class="np-tags">' + a.tags.map(function (x) { return '<span class="np-tag">' + esc(x) + '</span>'; }).join('') + '</p>' +
      '<div class="np-tabs" role="tablist" aria-label="' + esc(a.title) + '">' + a.tabs.map(function (x, i) {
        return '<button role="tab" id="tab-' + i + '" aria-selected="' + (i === APV.tab) + '" aria-controls="tabp" class="np-tab' + (i === APV.tab ? ' on' : '') + '" data-act="tab" data-i="' + i + '">' + esc(x.t) + '</button>';
      }).join('') +
      (a.practise ? '<button class="np-tab np-tab-p" data-act="flow" data-id="' + a.practise + '">' + flyLabel(a) + '</button>' : '') + '</div>' +
      '<section id="tabp" role="tabpanel" aria-labelledby="tab-' + APV.tab + '" class="np-tabp">' + t.blocks.map(block).join('') + '</section>' +
      '<p class="np-foot"><span class="op">◆</span> Operator-dependent: check the Jet2 OM. Training aid only.</p>' +
      '</main>';
    document.getElementById('app').innerHTML = h;
  }

  function render() {
    if (VIEW === 'run') renderRun();
    else if (VIEW === 'appr') renderAppr();
    else renderHome();
  }
  function goHome() { VIEW = 'home'; R = null; APV = null; render(); window.scrollTo(0, 0); }

  /* -------------------------------------------------------------- events */
  document.addEventListener('click', function (e) {
    var ctl = e.target.closest('.ctl');
    if (ctl && VIEW === 'run') { pressCtl(+ctl.getAttribute('data-ctl')); return; }
    var el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.getAttribute('data-act')) {
      case 'home': goHome(); break;
      case 'back': window.appBack(); break;
      case 'mode': MODE = el.getAttribute('data-mode'); store('mode', MODE); if (R) R.note = null; render(); break;
      case 'flow': startFlow(el.getAttribute('data-id'), el.hasAttribute('data-chain')); window.scrollTo(0, 0); break;
      case 'appr': openAppr(el.getAttribute('data-id')); break;
      case 'tab': APV.tab = +el.getAttribute('data-i'); render(); var tb = document.getElementById('tab-' + APV.tab); if (tb) tb.focus(); break;
      case 'checked': complete('Checked.'); break;
      case 'tick': R.ticks[+el.getAttribute('data-j')] = !R.ticks[+el.getAttribute('data-j')]; render(); break;
      case 'listdone': complete(step().name + ' checklist complete.'); break;
      case 'reveal': R.reveal = true; render(); break;
      case 'skip': if (step()) { var st = step(); NP.apply(R.states, st); R.k++; R.note = { ok: true, s: 'Next item.' }; if (R.k >= R.f.steps.length) { DONE[R.f.id] = true; store('done', DONE); } enterStep(); } break;
      case 'prev': jumpTo(Math.max(0, R.k - 1)); break;
      case 'jump': jumpTo(+el.getAttribute('data-k')); break;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && VIEW !== 'home') { goHome(); return; }
    var ctl = e.target.closest && e.target.closest('.ctl');
    if (ctl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pressCtl(+ctl.getAttribute('data-ctl')); }
  });

  function boot() {
    var h = (location.hash || '').slice(1);
    if (h && flowById(h)) startFlow(h);
    else if (h && AP.APPROACHES.some(function (a) { return a.id === h; })) openAppr(h);
    else render();
  }
  window.addEventListener('hashchange', boot);
  // Android Back in the ECAM Trainer app calls this: a flow or approach goes home, home goes to the trainer.
  window.appBack = function () {
    if (VIEW !== 'home') { goHome(); return true; }
    location.href = TRAINER; return true;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
