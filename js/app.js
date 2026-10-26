/* A320 ECAM Trainer: app shell.
 * Home is the flight deck overview; tapping a panel expands it full screen.
 * The menu lists the failure drills (js/failures.js) and the panels.
 */
(function () {
  'use strict';

  // Shown in the menu; the APK build takes its version name from here too.
  var VERSION = '0.7.75';
  var DISP = window.ECAM_DISPLAYS, DECK = window.ECAM_DECK, PN = window.ECAM_PANELS, PHOTO = window.ECAM_PHOTO_PANELS, FMGC = window.ECAM_FMGC;
  var esc = DISP.esc;

  // Panels by area of the flight deck.
  var GROUPS = [
    ['Aft overhead', ['ELT', 'CB', 'AFTBOTTOM', 'AUDIOSW', 'MAINT', 'DLS']],
    ['Overhead panel', ['FIRE', 'HYD', 'FUEL', 'ELEC', 'AIR', 'ANTIICE', 'CABPRESS', 'LOWER', 'PA', 'ADIRS', 'FLTCTL1', 'EVAC', 'EMERELEC', 'GPWS', 'RCDR', 'OXY', 'CALLS', 'WIPERL', 'ACP3', 'FLTCTL2', 'CARGO', 'VENT', 'MANSTART', 'WIPERR']],
    ['Glareshield', ['GSL', 'EFISL', 'FCU', 'EFISR', 'GSR']],
    ['Main instrument panel', ['LATL', 'ISISP', 'AUTOBRK', 'CLOCK', 'LGLEVER', 'DCDU1', 'DCDU2']],
    ['Pedestal', ['MCDU1', 'SWITCHING', 'ECP', 'MCDU2', 'RMP1', 'RMP2', 'ACP1', 'ACP2', 'THR', 'ENGPED', 'FLOODL', 'WXR', 'FLOODR', 'ATC', 'SPDBRK', 'RUDTRIM', 'FLAPS', 'DOOR', 'PRINTER', 'PARKBRK', 'GRAVITY']],
    ['Displays', ['PFD', 'ND', 'EWD', 'SD']],
    ['Side consoles', ['CONSL', 'CONSR']]
  ];
  // The display units open full screen like panels. parts: what each area shows.
  var DISPLAYS = {
    PFD: { name: 'Primary flight display (PFD)', desc: 'Captain\'s primary flight display: the main flight instrument.', parts: [
      ['FMA', 'Flight mode annunciator along the top: autothrust mode, vertical and lateral modes, approach capability, and the AP, FD and A/THR engagement status.'],
      ['Speed scale', 'Left: airspeed with the speed trend, the red and black barber pole (VMAX), green dot and the amber VLS strip, and the Mach number below.'],
      ['Attitude', 'Centre: pitch and bank against the horizon, with the yellow aircraft symbol, the bank scale and the roll index.'],
      ['Altitude and V/S', 'Right: the altitude scale with the yellow box showing the current altitude, the FCU selected altitude in cyan, and the vertical speed scale and needle.'],
      ['Heading', 'Bottom: the heading scale with the yellow heading reference line.']] },
    ND: { name: 'Navigation display (ND)', desc: 'Captain\'s navigation display in ARC mode, set on the EFIS control panel.', parts: [
      ['GS, TAS, wind', 'Top left: ground speed and true airspeed in knots, the wind direction and speed, and a wind arrow.'],
      ['Compass arc', 'Heading under the yellow lubber line, the green track line, and the range rings with their distances in cyan.'],
      ['Bearing pointers', 'VOR or ADF pointers selected on the EFIS panel, with the station name and distance at the bottom corners.'],
      ['GPS PRIMARY', 'Shows that the GPS is the primary source of position (until cleared on the MCDU).']] },
    EWD: { name: 'Engine/warning display (E/WD)', desc: 'Upper ECAM display: engine indications, fuel on board and slat/flap position, with the warning, caution and memo area below.', parts: [
      ['Engines', 'N1, EGT, N2 and fuel flow for both engines.'],
      ['FOB and FLAP', 'Fuel on board and the slat and flap position.'],
      ['Messages', 'Lower area: warnings and cautions with their actions on the left, and memos and secondary failures on the right.']] },
    SD: { name: 'System display (SD)', desc: 'Lower ECAM display: shows the system page selected on the ECAM control panel, or the page chosen for the flight phase (CRUISE in flight). Change the page with the keys below or the ECAM control panel keys on the flight deck.', parts: [] }
  };
  function getP(id) { return PN.P[id] || DISPLAYS[id]; }
  function panelName(id) { var p = getP(id); return (p && (p.name || p.title)) || id; }

  // System display page selected on the ECAM control panel (null: automatic, CRUISE).
  var SD_ORDER = ['ENG', 'BLEED', 'PRESS', 'ELEC', 'HYD', 'FUEL', 'APU', 'COND', 'DOOR', 'WHEEL', 'F/CTL'];
  var SD_NAMES = { ENG: 'engine', BLEED: 'bleed', PRESS: 'cabin pressure', ELEC: 'electrical', HYD: 'hydraulic', FUEL: 'fuel', APU: 'APU', COND: 'air conditioning', DOOR: 'door/oxygen', WHEEL: 'wheel', 'F/CTL': 'flight controls', STS: 'STATUS' };
  var sdPage = null;
  function sdSvg() {
    var sts = DR && DR.s && (DR.phase === 'stsq' || DR.phase === 'clr2' || DR.phase === 'done') ? DR.f.sts : null;
    if (DR && DR.phase === 'seq' && DR.f.seq[DR.si].sts) sts = DR.f.seq[DR.si].sts;
    return DISP.renderSD(liveState(), sdPage || 'CRUISE', sts);
  }
  function setSd(key) {
    if (key === 'ALL') sdPage = SD_ORDER[(SD_ORDER.indexOf(sdPage) + 1) % SD_ORDER.length];
    else sdPage = sdPage === key ? null : key;
    PN.LIVE.sdPage = sdPage;
    var y = window.scrollY;
    renderHome();
    window.scrollTo(0, y);
    if (PV) renderStage();
    drillCheck();
    return sdPage ? 'The system display shows the ' + SD_NAMES[sdPage] + ' page.' : 'Back to the automatic page (CRUISE).';
  }

  // A normal cruise state for the E/WD and SD on the main instrument panel.
  function cruiseState() {
    function eng(i) {
      return { n1: 84.2 + i * 0.3, egt: 612 + i * 6, n2: 96.0 + i * 0.4, ff: 1240 + i * 10, oilP: 52 + i, oilT: 96, oilQ: 15.2 - i * 0.4, vib1: 0.6, vib2: 0.9, nacT: 120, fuelUsed: 3420 + i * 30, running: true, master: true, firePb: false };
    }
    return {
      onGround: false, alt: 35000, phaseLabel: 'CRZ', ign: false, spdBrk: false, fob: 12400, gw: 64300, eng: [eng(0), eng(1)],
      hyd: { G: { p: 3000, rsvr: 'ok', pump: 'on', qty: 0.9 }, B: { p: 3000, rsvr: 'ok', pump: 'on', qty: 0.85 }, Y: { p: 3000, rsvr: 'ok', pump: 'on', qty: 0.9, elec: 'off' }, ptu: 'auto' },
      elec: { idg: ['ok', 'ok'], apu: false, apuGen: false, acEssFeed: 'norm', rat: false, ac: [true, true], acEss: true, dc: [true, true], dcEss: true, genView: [{ on: true, load: 34 }, { on: true, load: 36 }], tie: false },
      bleed: { pack: ['on', 'on'], packFlow: [true, true], engBleed: [true, true], outT: [12, 13], compT: [170, 172] },
      press: { cabAlt: 7200, vs: 0, dp: 7.9, mode: 'auto', sys: ['ok', 'ok'], active: 0, ofv: 12 },
      fctl: { elac: ['ok', 'ok'], sec: ['ok', 'ok', 'ok'], law: 'NORMAL' },
      cargo: { fwdSmoke: false, isol: 'on', agent: 'full' },
      fuel: { lo: 690, li: 4880, ctr: 1260, ri: 4880, ro: 690 }
    };
  }

  var ICON = {
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  var drawerOpen = false, searchOpen = false, searchTerm = '';
  // Guided drills (owner's request, 0.7.49): the trainer opens the panel for each step in turn.
  var guideT = null;
  var PV = null; // expanded panel: { id, states, selected }

  /* ----------------------------------------------------------------- home */
  var VIEW = 'start', DECK_MODE = null, QZ = null;
  // The flight deck has no bar title and a slim bar (owner's request, 0.7.8: more room for the panels).
  var BARTITLE = { start: 'A320 ECAM Trainer', normal: '', abnormal: '', quiz: 'ECAM drill quiz' };
  function setView(v, mode) {
    VIEW = v; DECK_MODE = mode || null;
    var bar = document.querySelector('.appbar');
    bar.classList.remove('away');
    bar.classList.toggle('slim', v === 'deck');
    bar.querySelector('.appbar-title').textContent = BARTITLE[v === 'deck' ? mode : v];
    bar.querySelector('[data-act=home]').hidden = v === 'start';
    bar.querySelector('[data-act=search]').hidden = v !== 'deck';
    window.scrollTo(0, 0);
    renderHome();
  }
  function goHome() { if (DR) stopDrill(true); hideModal(); if (PV) PV = null, renderPanelView(); QZ = null; setView('start'); renderDrill(); }
  // Normal procedure flows, checklists and approach guides are their own page in this app (normal.html).
  var NORMAL_APP = 'normal.html?v=' + VERSION;
  // The Questions Bank is its own page in this app (qbank.html): procedures, abnormal,
  // technical knowledge and the Safety First flight, with briefings and referenced answers.
  var QBANK = 'qbank.html?v=' + VERSION;
  // First page: the three parts of the trainer. Colour follows the ECAM meaning:
  // green for normal, amber for abnormal, cyan for knowledge.
  var START_ICON = {
    normal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8"/></svg>',
    abnormal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5M12 17.2v.1"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.3-.9.8-.9 1.5v.4M12 16.8v.1"/></svg>'
  };
  function renderStart() {
    var live = FAIL.CATEGORIES.filter(function (c) { return c[1].some(function (e) { return e.drill; }); }).map(function (c) { return c[0]; });
    var items = [
      ['normal', 'g', 'Normal', 'Normal Procedures', 'Interactive flows from power-up to securing, the normal checklists and approach guides.', 'Flows · checklists · approach guides', NORMAL_APP, true],
      ['abnormal', 'a', 'Abnormal', 'Abnormal Procedures', 'ECAM failures by system, worked on the flight deck: actions, secondary failures and STATUS.', (live.length ? live.join(', ') + ' drills ready' : 'Drills coming') + ' · more systems coming'],
      ['quiz', 'c', 'Knowledge', 'Questions Bank', 'Procedures, abnormal procedures, technical knowledge and a gate-to-gate Safety First flight, with FCOM-referenced answers.', 'Procedures · Abnormal · Technical · Safety First flight', QBANK, true]
    ];
    document.getElementById('view').innerHTML = '<section class="start start-home">' +
      '<header class="start-hero"><p class="eyebrow">A320 family · Flight deck trainer</p><h2 class="start-h">ECAM Trainer</h2>' +
      '<p class="start-lede">Work the flight deck the way you do in the aircraft: normal flows, ECAM failures on the real panels, and system knowledge.</p></header>' +
      '<ul class="tlist tgrid">' + items.map(function (t) {
        var body = '<span class="titem-ico">' + START_ICON[t[0]] + '</span><span class="titem-k">' + esc(t[2]) + '</span>' +
          '<span class="titem-t">' + esc(t[3]) + '</span><span class="titem-d">' + esc(t[4]) + '</span>' +
          '<span class="titem-m">' + esc(t[5]) + '<span class="titem-go" aria-hidden="true">' + (t[6] && !t[7] ? '\u2197' : '\u2192') + '</span></span>';
        // An item with a link opens a separate app in a new tab, or a page of this app in place (t[7]).
        if (t[6]) return '<li><a class="titem" data-tone="' + t[1] + '" href="' + t[6] + '"' + (t[7] ? '' : ' target="_blank" rel="noopener"') + '>' + body + '</a></li>';
        return '<li><button class="titem" data-tone="' + t[1] + '" data-act="choose" data-v="' + t[0] + '">' + body + '</button></li>';
      }).join('') + '</ul>' +
      '<footer class="start-foot"><span class="ver-pill">Version ' + VERSION + '</span><span>Training aid only, simplified. Follow the FCOM, QRH and your operator\'s procedures.</span></footer></section>';
  }
  /* Deck windows: each part of the flight deck sits in a window with no title bar
   * (owner's request, 0.7.7: bars took too much room). Dragging its bottom-right
   * corner sets the width (w, %) and height (h, px); the drawing stretches to fill
   * the window. Sizes are saved; "Reset window sizes" restores the defaults. */
  var WIN_DEFAULT = { aft: 60, fwd: 68, main: 100, pedU: 72, pedL: 57, cons: 60 };
  var WIN = {};
  try { WIN = JSON.parse(localStorage.getItem('ecam-win') || '{}'); } catch (e) { WIN = {}; }
  function win(id) { return WIN[id] || (WIN[id] = { w: WIN_DEFAULT[id] || 100 }); }
  function saveWin() { try { localStorage.setItem('ecam-win', JSON.stringify(WIN)); } catch (e) { /* not saved */ } }
  function winHtml(sec) {
    var w = win(sec.id);
    return '<div class="win' + (w.h ? ' stretch' : '') + '" data-win="' + sec.id + '" style="width:' + w.w + '%" aria-label="' + esc(sec.title) + '">' +
      '<div class="win-body"' + (w.h ? ' style="height:' + w.h + 'px"' : '') + '>' + sec.svg.replace('<svg ', '<svg preserveAspectRatio="none" ') + '</div>' +
      '<div class="win-grip" data-grip="' + sec.id + '" aria-hidden="true"></div></div>';
  }
  // Drag a window's bottom-right corner to resize it, sideways and up or down.
  var DRAG = null;
  document.addEventListener('pointerdown', function (e) {
    var g = e.target.closest && e.target.closest('.win-grip');
    if (!g) return;
    var el = g.closest('.win'), box = el.parentNode.getBoundingClientRect();
    var body = el.querySelector('.win-body');
    DRAG = { id: g.getAttribute('data-grip'), el: el, body: body, x: e.clientX, y: e.clientY, w0: el.getBoundingClientRect().width, h0: body.getBoundingClientRect().height, cw: box.width };
    g.setPointerCapture(e.pointerId); e.preventDefault();
  });
  document.addEventListener('pointermove', function (e) {
    if (!DRAG) return;
    var pct = Math.max(25, Math.min(100, (DRAG.w0 + (e.clientX - DRAG.x)) / DRAG.cw * 100));
    DRAG.el.style.width = pct + '%'; DRAG.pct = pct;
    DRAG.h = Math.max(60, DRAG.h0 + e.clientY - DRAG.y);
    DRAG.body.style.height = DRAG.h + 'px'; DRAG.el.classList.add('stretch');
  });
  document.addEventListener('pointerup', function () {
    if (!DRAG) return;
    if (DRAG.pct) { var w = win(DRAG.id); w.w = DRAG.pct; w.h = DRAG.h; saveWin(); }
    DRAG = null;
  });
  function renderHome() {
    if (VIEW === 'start') return renderStart();
    if (VIEW === 'quiz') return renderQuiz();
    var s = liveState();
    var cap = captDisplays(s), ecam = { ewd: DISP.renderEWD(s, ewdView()), sd: sdSvg(), pfd: cap.pfd, nd: cap.nd };
    document.getElementById('view').innerHTML =
      '<section class="home">' +
      '<p class="home-hint">' + (DECK_MODE === 'normal' ? 'Tap any panel to explore it. Normal procedure flows are in the <a href="' + NORMAL_APP + '">Normal Procedures</a>. ' : 'Tap any panel to expand it. Failures are in the menu. ') + '<span class="ver-pill">Version ' + VERSION + '</span> <button class="linkbtn" data-act="winReset">Reset window sizes</button></p>' +
      '<div class="wins">' + DECK.build({ ecam: ecam, states: PSTATE }).map(winHtml).join('') + '</div>' +
      '<p class="disclaimer">Training aid only. Panels are drawings of the A320 flight deck; some overhead panels also offer a real A319 photo (Linus Follert, CC BY-SA 2.0).</p>' +
      '</section>';
  }

  /* ------------------------------------------------------ expanded panel */
  function norm(s) { return String(s || '').replace(/\s+/g, '').toUpperCase(); }
  // The controls of a photo panel, merged with the matching control of the drawn
  // panel (its name, legends, function text and links such as fire -> agents).
  var resolved = {};
  function photoItems(id) {
    if (resolved[id]) return resolved[id];
    var drawn = PN.P[id] ? PN.P[id].items : [];
    var items = PHOTO.panels[id].controls.map(function (c) {
      var base = null;
      if (c.ref) {
        var m = /^(fire:)?(.*?)(?:#(\d+))?$/.exec(c.ref), want = norm(m[2]), n = +(m[3] || 1);
        base = drawn.filter(function (it) { return m[1] ? it.k === 'fire' && norm(it.label) === want : norm(it.name) === want; })[n - 1];
      }
      var it = Object.assign({ k: 'pb' }, base || {}, { x: c.x, y: c.y, s: c.s, w: c.w, photoLit: c.lit || null });
      ['k', 'name', 'info', 'pos', 'cur', 'guard'].forEach(function (key) { if (c[key] != null) it[key] = c[key]; });
      if (c.lo) it.lo = PN.legend(c.lo);
      if (c.up) it.up = PN.legend(c.up);
      delete it.lit;
      return it;
    });
    resolved[id] = items;
    return items;
  }
  function legendGlow(x, y, L, fs) {
    return '<text x="' + x + '" y="' + y + '" class="lg-glow lg-' + L.c + '" font-size="' + fs + '" text-anchor="middle" filter="url(#f-glow)">' + esc(L.s) + '</text>' +
      '<text x="' + x + '" y="' + y + '" class="lg lg-' + L.c + ' on" font-size="' + fs + '" text-anchor="middle">' + esc(L.s) + '</text>';
  }
  // Lights drawn over the photo where the panel state differs from what the photo shows.
  function photoOverlay(it, st) {
    var o = '', s = it.s, x = it.x;
    if (it.k === 'pb' || it.k === 'ann') {
      var now = PN.litBits(st.lit, it), was = PN.litBits(it.photoLit, it);
      [['up', it.y - s * 0.19], ['lo', it.y + s * 0.24]].forEach(function (q) {
        var L = it[q[0]], ly = q[1];
        if (!L) return;
        if (now[q[0]] && !was[q[0]]) o += legendGlow(x, ly, L, s * 0.2);
        if (!now[q[0]] && was[q[0]]) o += '<rect x="' + (x - s * 0.36) + '" y="' + (ly - s * 0.17) + '" width="' + (s * 0.72) + '" height="' + (s * 0.26) + '" rx="' + (s * 0.03) + '" class="photo-mask"/>';
      });
      if (st.down) o += '<rect x="' + (x - s / 2) + '" y="' + (it.y - s / 2) + '" width="' + s + '" height="' + s + '" rx="' + (s * 0.06) + '" class="pb-down"/>';
    }
    return o;
  }
  function renderPhotoStage(ph) {
    var o = '<svg viewBox="0 0 ' + ph.w + ' ' + ph.h + '" class="pv-svg pv-photo" role="group" aria-label="' + esc(panelName(PV.id)) + ' panel">' + PN.defs() +
      '<image href="' + ph.img + '" width="' + ph.w + '" height="' + ph.h + '"/>';
    PV.items.forEach(function (it, i) {
      var st = PV.states[i] || {}, w = (it.w || it.s) + it.s * 0.24, h = it.s * 1.24;
      o += '<g class="ctl' + (PV.selected === i ? ' sel' : '') + '" data-ctl="' + i + '" tabindex="0" role="button" aria-label="' + esc(PN.ctlName(it)) + '">' +
        '<rect x="' + (it.x - w / 2) + '" y="' + (it.y - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + (it.s * 0.12) + '" class="ctl-hit photo-hit"/>' +
        photoOverlay(it, st) + '</g>';
    });
    return o + '</svg>';
  }
  function openPanel(id, fromEl) {
    if (!getP(id) && !(PHOTO && PHOTO.panels[id])) return;
    PV = { id: id, disp: !!DISPLAYS[id] };
    setPanelMode(PN.P[id] ? 'draw' : 'photo');
    drawerOpen = false; searchOpen = false; renderDrawer(); renderSearch();
    renderPanelView();
    drillCheck();
    var stage = document.querySelector('#pv .pv-svg');
    if (fromEl && stage && stage.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var a = fromEl.getBoundingClientRect(), b = stage.getBoundingClientRect();
      if (a.width && b.width) {
        stage.animate([
          { transformOrigin: '0 0', transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ')', opacity: 0.6 },
          { transformOrigin: '0 0', transform: 'none', opacity: 1 }
        ], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
  }
  function closePanel() { PV = null; renderPanelView(); refreshHome(); applyPendingUpdate(); }
  // Drawing (default) or the real photo, where one exists for this panel.
  function setPanelMode(mode) {
    var photo = mode === 'photo' && PHOTO && PHOTO.panels[PV.id];
    PV.photo = photo || null; PV.selected = null; PV.note = null;
    // Drawn panels keep their switch positions (and failure lights) between visits.
    PV.states = photo || PV.disp ? {} : (PSTATE[PV.id] || (PSTATE[PV.id] = {}));
    PV.items = photo ? photoItems(PV.id) : (PV.disp ? [] : PN.P[PV.id].items);
    if (photo) PV.items.forEach(function (it, i) { if (it.photoLit) PV.states[i] = { lit: it.photoLit }; });
  }

  function legendChip(L) { return L ? '<span class="lchip lchip-' + L.c + '">' + esc(L.s) + '</span>' : ''; }
  function infoHtml(p) {
    if (PV.disp) return (p.parts || []).map(function (q) { return '<p><b>' + esc(q[0]) + '.</b> ' + esc(q[1]) + '</p>'; }).join('');
    if (PV.selected == null) return '<p class="pv-hint">Tap any pushbutton, guard, selector or switch to work it and see what it does.</p>';
    var it = PV.items[PV.selected], st = PV.states[PV.selected] || {};
    var k = PN.kindOf(it);
    var kind = it.kindName || { latching: 'Pushbutton', momentary: 'Momentary pushbutton', indicator: 'Indicator light', fire: 'Fire pushbutton', sel: 'Selector', knob: 'Rotary knob', tog: 'Switch', lever: 'Lever', slide: 'Lever', part: 'Part', disp: 'Display', win: 'FCU window', ring: 'Selector ring' }[k] || 'Control';
    var status = PN.statusLegends(it), note = '';
    if (k === 'indicator') note = 'Indicator only: it lights when the system triggers it and can\'t be selected.';
    else if (k === 'momentary') note = 'Momentary: it springs back after each press.';
    if (status.length && k !== 'indicator') note += (note ? ' ' : '') + status.join(' and ') + ' ' + (status.length > 1 ? 'are' : 'is') + ' driven by the system and never lit by a press.';
    if (it.k === 'fire') note = 'Tap once to lift the guard, then again to push the button: it releases out and arms the squibs (SQUIB lights on the AGENT pushbuttons). The red light comes on only with a fire warning.';
    var chips = legendChip(it.up) + legendChip(it.lo);
    if (it.k === 'fire') chips = '<span class="lchip lchip-r">FIRE</span>';
    if (it.k === 'sel' || it.k === 'tog' || it.k === 'slide' || it.k === 'crank') chips = it.pos.map(function (q, i) { return '<span class="lchip' + (i === (st.cur != null ? st.cur : it.cur) ? ' lchip-cur' : '') + '">' + esc(q) + '</span>'; }).join('');
    return '<p class="eyebrow">' + kind + (it.guard || it.k === 'fire' ? ' · guarded' : '') + '</p>' +
      '<h3 class="pv-ctl">' + esc(PN.ctlName(it)) + '</h3>' +
      (chips ? '<div class="lchips">' + chips + '</div>' : '') +
      (it.fcu ? '<div class="fcu-btns">' + [['l', '\u27F2 Turn left'], ['push', 'Push'], ['pull', 'Pull'], ['r', 'Turn right \u27F3']].map(function (b) { return '<button class="btn sm" data-act="fcu" data-how="' + b[0] + '">' + b[1] + '</button>'; }).join('') + '</div>' : '') +
      '<p>' + esc(it.info || '') + '</p>' +
      (PV.note ? '<p class="pv-note">' + esc(PV.note) + '</p>' : '') +
      (note ? '<p class="small">' + esc(note) + '</p>' : '') +
      (it.guard ? '<p class="small">' + (st.guardOpen ? 'Guard lifted. Tap again to work the pushbutton.' : 'Tap again to lift the guard.') + '</p>' : '');
  }
  // What the Captain's PFD and ND show from the left EFIS panel (owner's request, 0.7.20).
  function efisNd() {
    var P = PN.P.EFISL.items, st = PSTATE.EFISL || {}, e = {};
    P.forEach(function (it, i) {
      var c = st[i] || {}, cur = c.cur != null ? c.cur : it.cur;
      if (it.k === 'pb') e[it.name] = PN.litBits(c.lit, it).lo;
      else if (it.k === 'sel' || it.k === 'tog') e[it.name] = it.pos[cur];
      else if (it.k === 'win') e.baro = c.val || it.val;
    });
    return { fd: e.FD, ls: e.LS, baro: e.baro, mode: e['ND MODE'], range: +e['ND RANGE'], cstr: e.CSTR,
      opt: ['WPT', 'VOR.D', 'NDB', 'ARPT'].filter(function (k) { return e[k]; })[0] || null, n1: e['ADF/VOR 1'], n2: e['ADF/VOR 2'] };
  }
  // What the PFD shows from the FCU (owner's request, 0.7.16): the aircraft cruises
  // level at s.alt with managed speed (Mach) and NAV; the FCU knobs change the
  // targets and, once pushed or pulled, the FMA modes.
  function fcuPfd(s) {
    var P = PN.P.FCU.items, st = PSTATE.FCU || {}, w = {};
    P.forEach(function (it, i) { if (it.k === 'win' && it.fcu) w[it.fcu] = st[i] || {}; });
    var alt = w.alt.n != null ? w.alt.n : 35000, vsN = w.vs.n || 0, mach = w.spd.mach !== false, f = { spdSel: !!w.spd.sel, spd: w.spd.n == null ? null : mach ? Math.round(w.spd.n * 2.974) : w.spd.n, spdTxt: w.spd.val, mach: mach, hdgSel: !!w.hdg.sel, hdg: w.hdg.n, fcuAlt: alt, vs: 0, arm: '' };
    // The last of the ALT and V/S knobs to be pushed or pulled sets the vertical mode.
    var last = (w.vs.seq || 0) > (w.alt.seq || 0) ? 'vs' : w.alt.seq ? 'alt' : '';
    if (last === 'vs') { f.vert = 'V/S'; f.vs = w.vs.how === 'push' ? 0 : vsN; if (f.vs) f.vert += ' ' + (f.vs > 0 ? '+' : '') + f.vs; }
    else if (last === 'alt' && alt !== s.alt) { var up = alt > s.alt; f.vert = (w.alt.how === 'pull' ? 'OP ' : '') + (up ? 'CLB' : 'DES'); f.vs = up ? 1800 : -1500; }
    else f.vert = 'ALT CRZ';
    if (f.vert !== 'ALT CRZ' && alt !== s.alt) f.arm = 'ALT';
    f.thr = /CLB/.test(f.vert) ? 'THR CLB' : /DES/.test(f.vert) ? 'THR IDLE' : f.spdSel && !mach ? 'SPEED' : 'MACH';
    f.lat = f.hdgSel ? 'HDG' : 'NAV';
    f.ap = apLit();
    var e = efisNd(); f.fd = e.fd; f.ls = e.ls; f.baro = e.baro;
    f.brk = autoBrk();
    return f;
  }
  // A press on the FCU or an EFIS panel drawn on the flight deck (the panel is not expanded).
  // The ECAM control panel under an expanded E/WD or SD (owner's request, 0.7.27), so CLR,
  // STS, RCL and the page keys work without leaving the display.
  function ecpHtml() {
    var p = PN.P.ECP;
    return '<svg viewBox="-4 -4 ' + (p.w + 8) + ' ' + (p.h + 8) + '" class="pv-svg pv-ecp" role="group" aria-label="ECAM control panel">' +
      PN.defs() + PN.render('ECP', { interactive: true, states: PSTATE.ECP || (PSTATE.ECP = {}) }) + '</svg>';
  }
  function pressEcp(i) {
    var it = PN.P.ECP.items[i], st = PSTATE.ECP || (PSTATE.ECP = {});
    drillPress('ECP', i);
    PN.pressItems(PN.P.ECP.items, i, st);
    if (it.clrKey && (DR && DR.s || APOFF)) pressClr();
    if (it.sdPage || it.sdAll) setSd(it.sdAll ? 'ALL' : it.sdPage);
    drillCheck();
    if (PV) renderStage();
    if (st[i] && st[i].down) setTimeout(function () { st[i].down = false; if (PV && PV.disp) renderStage(); }, 180);
  }
  function deckFcu(pid, i, dir) {
    var apBefore = apLit().length, abBefore = JSON.stringify(PSTATE.AUTOBRK || {}), abMode = autoBrk();
    PN.pressItems(PN.P[pid].items, i, PSTATE[pid] || (PSTATE[pid] = {}), dir);
    if (pid === 'FCU' && apLit().length < apBefore) apOff();
    var st = PSTATE[pid][i];
    if (pid === 'LGLEVER') gearMoved();
    abrkKeep(abBefore);
    if (autoBrk() && autoBrk() !== abMode) showAbrkTip();
    refreshHome();
    if (st && st.down) setTimeout(function () { st.down = false; if (!PV) refreshHome(); }, 180);
  }
  function dispSvg(id) {
    var s = liveState();
    return id === 'PFD' || id === 'ND' ? captDisplays(s)[id.toLowerCase()] : id === 'EWD' ? DISP.renderEWD(s, ewdView()) : sdSvg();
  }
  // Captain's PFD and ND, dimmed by the brightness knobs on the lateral panel (LATL).
  // 0 is OFF, 1 full bright. PFD/ND XFR swaps the images; with the PFD display off
  // the PFD image moves to the ND display.
  function dimLevel(which) {
    var items = PN.P.LATL.items, st = PSTATE.LATL || {};
    for (var i = 0; i < items.length; i++) if (items[i].dim === which) { var a = st[i] && st[i].angle != null ? st[i].angle : items[i].a0 || 0; return (a + 120) / 240; }
    return 1;
  }
  function dimmed(svg, b) {
    return b >= 1 ? svg : svg.replace(/<\/svg>\s*$/, '<rect width="100%" height="100%" fill="#000" opacity="' + (b <= 0 ? 1 : (0.85 * (1 - b)).toFixed(2)) + '" pointer-events="none"/></svg>');
  }
  function xfrSwapped() {
    var items = PN.P.LATL.items, st = PSTATE.LATL || {};
    for (var i = 0; i < items.length; i++) if (items[i].xfr) return !!(st[i] && st[i].swap);
    return false;
  }
  function captDisplays(s) {
    var bp = dimLevel('PFD'), bn = dimLevel('ND'), pfd = DISP.renderPFD(s, fcuPfd(s));
    if (bp <= 0) return { pfd: dimmed(pfd, 0), nd: dimmed(pfd, bn) };
    var nd = DISP.renderND(s, efisNd()), sw = xfrSwapped();
    return { pfd: dimmed(sw ? nd : pfd, bp), nd: dimmed(sw ? pfd : nd, bn) };
  }
  function renderStage() {
    var p = getP(PV.id);
    if (PV.disp) {
      document.getElementById('pv-stage').innerHTML = '<div class="pv-screen">' + dispSvg(PV.id) + '</div>' + (PV.id === 'EWD' || PV.id === 'SD' ? ecpHtml() : '');
      document.getElementById('pv-info').innerHTML = infoHtml(p);
      return;
    }
    var fm = FMGC && /^MCDU[12]$/.test(PV.id), ecp = PV.id === 'ECP' && !guidedOn(); // guided: the SD is beside the E/WD instead
    // ECP: the SD sits on top of the panel, the same width, with no gap (no top margin in the viewBox).
    document.getElementById('pv-stage').innerHTML = PV.photo ? renderPhotoStage(PV.photo) :
      (fm ? '<div class="fm-wrap">' + FMGC.guideHtml() : '') + (ecp ? '<div class="ecp-wrap"><div class="pv-sdtop" aria-label="System display">' + sdSvg() + '</div>' : '') +
      '<svg viewBox="-4 ' + (ecp ? 0 : -4) + ' ' + (p.w + 8) + ' ' + (p.h + (ecp ? 4 : 8)) + '" class="pv-svg' + (/^MCDU[12]$/.test(PV.id) ? ' pv-mcdu' : '') + (PV.id === 'ATC' ? ' pv-atc' : '') + (/^(FCU|EFIS[LR])$/.test(PV.id) ? ' pv-fcu' : '') + '" style="--ar: ' + ((p.h + (ecp ? 4 : 8)) / (p.w + 8)).toFixed(4) + '" role="group" aria-label="' + esc(panelName(PV.id)) + ' panel">' +
      PN.defs() + PN.render(PV.id, { interactive: true, states: PV.states, selected: PV.selected }) + '</svg>' + (fm || ecp ? '</div>' : '') +
      (FMGC && /^MCDU[12]$/.test(PV.id) ? FMGC.simHtml() : '');
    document.getElementById('pv-info').innerHTML = infoHtml(p);
    // Guided: the SD and E/WD side by side above the step's panel, on every step (owner's request, 0.7.75).
    var ec = document.getElementById('pv-ecam');
    if (ec) ec.innerHTML = '<div class="pv-screen" aria-label="System display">' + sdSvg() + '</div><div class="pv-screen" aria-label="E/WD">' + DISP.renderEWD(liveState(), ewdView()) + '</div>';
  }
  // Guided drills: the back arrow goes one step back in the procedure (owner's request,
  // 0.7.70), in place of closing the panel to the flight deck. HIST holds the state at the
  // start of each step (questions and cards are not steps of their own here).
  var HIST = [];
  function stepKey() { return [DR.phase, DR.i, DR.si, DR.preClr, DR.stTask].join('|'); }
  function snapStep() {
    if (!DR || !DR.s || DR.phase === 'quiz' || DR.phase === 'done' || MODAL.kind) return;
    var k = stepKey();
    if (HIST.length && HIST[HIST.length - 1].k === k) return;
    var d = {}; Object.keys(DR).forEach(function (n) { if (n !== 'f') d[n] = DR[n]; });
    HIST.push({ k: k, dr: JSON.stringify(d), ps: JSON.stringify(PSTATE), sd: sdPage, live: JSON.stringify(PN.LIVE) });
  }
  function stepBack() {
    if (HIST.length < 2) { DR.flash = 'This is the first step.'; renderDrill(); return; }
    HIST.pop();
    var h = HIST[HIST.length - 1];
    Object.assign(DR, JSON.parse(h.dr)); PSTATE = JSON.parse(h.ps); sdPage = h.sd; Object.assign(PN.LIVE, JSON.parse(h.live));
    DR.flash = 'Back one step.';
    if (guideT) { clearTimeout(guideT.id); guideT = null; }
    stopChime(); if (masterLit()) chime(DR.f.level, JSON.stringify(DR.f.pre || []).indexOf('AP OFF') >= 0);
    PV = null; openPanel(guidePanel()); renderDrill(); refreshHome();
  }
  function guidedOn() { return DECK_MODE === 'abnormal' && !!(DR && DR.s) && DR.phase !== 'done'; }
  // The panel the current step is worked on: MASTER on the glareshield, an action's panel,
  // a task's panel; otherwise (CLR, STATUS, SD pages) the ECAM control panel (owner's request, 0.7.50).
  function guidePanel() {
    var f = DR.f, t = null;
    if (DR.phase === 'run') {
      var st = f.steps[DR.i];
      if (st && st.k === 'master') return 'GSL';
      if (DR.f.pre && DR.f.pre.length && !DR.preClr) return 'ECP';
      if (st && st.k === 'act') return st.ctls[0][0];
      if (st && st.k === 'task') t = st.want;
    } else if (DR.phase === 'seq') t = f.seq[DR.si].task && !DR.stTask ? f.seq[DR.si].task.want : null;
    return t && (t.panel || t.ctl) ? t.panel || t.ctl[0] : 'ECP';
  }
  // After each change, open the next step's panel (a short pause first, so the result shows).
  function guideSync() {
    if (!guidedOn() || DR.phase === 'quiz' || MODAL.kind) return;
    var want = guidePanel();
    if (!want || PV && PV.id === want) return;
    if (guideT && guideT.want === want) return; // already on its way: redraws must not restart the pause
    clearTimeout(guideT && guideT.id);
    guideT = { want: want, id: setTimeout(function () { guideT = null; if (guidedOn() && !MODAL.kind && guidePanel() === want && (!PV || PV.id !== want)) openPanel(want); }, PV ? 900 : 250) };
    if (!PV) openPanel('ECP');
  }
  function creditHtml() {
    var c = PHOTO.credit;
    return 'Photo: <a href="' + c.source + '" target="_blank" rel="noopener">' + esc(c.title) + '</a> by ' + esc(c.author) +
      ', <a href="' + c.licenseUrl + '" target="_blank" rel="noopener">' + esc(c.license) + '</a>. Straightened and cropped. A319 overhead, same layout as the A320.';
  }
  function renderPanelView() {
    var el = document.getElementById('pv'), dr = document.getElementById('drill');
    if (dr.parentNode !== el.parentNode) el.after(dr); // back from a drill panel layout before the card is redrawn
    if (!PV) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('pv-open', 'pv-disp-open', 'pv-guide-open'); return; }
    var p = getP(PV.id) || { desc: '' }, dims = PV.photo || (PV.disp ? { w: 1, h: 1 } : p);
    var gate = PV.photo && PV.items.some(function (it) { return it.photoLit; });
    // An expanded display (PFD, ND, E/WD, SD; owner's request): no title bar, only a small
    // back arrow; the description goes left of the screen and the drill bar right of it.
    document.body.classList.toggle('pv-disp-open', !!PV.disp);
    // A panel expanded during a drill (owner's request): a small title bar; below the panel,
    // the information left, the mini E/WD in the middle and the drill bar right.
    var drill = !PV.disp && !!(DR && DR.s), guide = drill && guidedOn();
    document.body.classList.toggle('pv-guide-open', guide);
    el.innerHTML = '<div class="pv-card' + (PV.disp ? ' pv-disp' : guide ? ' pv-guide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(panelName(PV.id)) + ' panel">' +
      (PV.disp ? '<button class="icon-btn sm pv-back" data-act="closePanel" aria-label="' + (guidedOn() ? 'One step back' : 'Back to flight deck') + '">' + ICON.back + '</button>' :
      '<header class="pv-bar"><button class="icon-btn" data-act="closePanel" aria-label="' + (guidedOn() ? 'One step back' : 'Back to flight deck') + '">' + ICON.back + '</button>' +
      '<h2 class="appbar-title">' + esc(panelName(PV.id)) + '</h2><span class="icon-btn-spacer"></span></header>') +
      '<div class="pv-stage" id="pv-stage"></div>' + (guide ? '<div class="pv-ecam" id="pv-ecam"></div>' : '') +
      (PHOTO && PHOTO.panels[PV.id] && PN.P[PV.id] && !DR ? '<div class="seg pv-switch" role="radiogroup" aria-label="View">' +
        '<button role="radio" aria-checked="' + !PV.photo + '" class="seg-btn' + (PV.photo ? '' : ' on') + '" data-act="pvmode" data-mode="draw">Drawing</button>' +
        '<button role="radio" aria-checked="' + !!PV.photo + '" class="seg-btn' + (PV.photo ? ' on' : '') + '" data-act="pvmode" data-mode="photo">Photo (A319)</button></div>' : '') +
      (PV.photo ? '<p class="pv-credit">' + creditHtml() + '</p>' : '') +
      (dims.w / dims.h > 2.2 ? '<p class="pv-rotate">Turn your phone sideways for a bigger panel.</p>' : '') +
      '<div class="pv-body"><p class="pv-desc">' + esc(p.desc) + '</p>' +
      (PV.id === 'AUTOBRK' && !PV.photo ? '<p><button class="btn sm flash3" data-act="abrkInfo">Autobrake: general and arming conditions</button></p>' : '') +
      (gate ? '<p class="small">The photo was taken on the ground with the engines stopped and the APU running, so some lights are already on (for example GEN FAULT, fuel pumps OFF, APU BLEED ON).</p>' : '') +
      '<div class="pv-info" id="pv-info" aria-live="polite"></div></div></div>';
    el.hidden = false; document.body.classList.add('pv-open');
    if (drill) el.firstChild.appendChild(dr); // the drill bar takes the right column (wide screens)
    renderStage();
  }
  function pressCtl(i, dir) {
    var it = PV.items[i];
    if (!it) return;
    if (!PV.photo) drillPress(PV.id, i);
    var apBefore = apLit().length, abBefore = JSON.stringify(PSTATE.AUTOBRK || {}), abMode = autoBrk();
    if (it.master && !PV.photo) PV.note = pressMaster(it.master) || 'Lights only with a warning or caution.';
    else if (it.clrKey && DR && DR.s) { PN.pressItems(PV.items, i, PV.states); pressClr(); PV.note = DR && DR.flash; }
    else if (it.clrKey && APOFF && !PV.photo) { PN.pressItems(PV.items, i, PV.states); pressClr(); PV.note = 'AUTO FLT AP OFF cleared from the E/WD.'; }
    else PV.note = PN.pressItems(PV.items, i, PV.states, dir);
    if (!PV.photo && !DR && (PV.id === 'FCU' && apLit().length < apBefore || it.name === 'Takeover pushbutton' && apBefore)) {
      if (it.name === 'Takeover pushbutton') ['AP1', 'AP2'].forEach(function (n) { PSTATE.FCU[apIdx(n)] = {}; });
      apOff(); PV.note = 'Autopilot disconnected: AUTO FLT AP OFF (red) on the E/WD, MASTER WARN and the AP OFF aural. MASTER WARN silences it; CLR removes the message.';
    }
    if (PV.id === 'LGLEVER' && !PV.photo && it.k === 'slide') PV.note = gearMoved();
    if (!PV.photo) { var dis = abrkKeep(abBefore); if (dis) PV.note = dis; if (autoBrk() && autoBrk() !== abMode) showAbrkTip(); }
    if (it.sdPage || it.sdAll) PV.note = setSd(it.sdAll ? 'ALL' : it.sdPage);
    if (FMGC && /^MCDU[12]$/.test(PV.id) && it.k === 'pb' && it.name) FMGC.key(PV.id, it.name.replace(/\n/g, ' '));
    if (!PV) return;
    if (!PV.photo) drillCheck();
    PV.selected = i;
    renderStage();
    if (PV.states[i] && PV.states[i].down) {
      var pv = PV;
      var spring = PV.states[i].springTo;
      setTimeout(function () {
        if (PV !== pv || !PV.states[i]) return;
        PV.states[i].down = false;
        // Spring-loaded switches return to their rest position.
        if (spring != null) { PV.states[i].cur = spring; delete PV.states[i].springTo; }
        renderStage();
      }, spring != null ? 700 : 180);
    }
    var g = document.querySelector('#pv-stage [data-ctl="' + i + '"]');
    if (g) g.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------ failure drills */
  // A drill runs on the flight deck: the failure lights the master light and
  // FAULT lights, shows its procedure on the E/WD and its page on the SD, and
  // the trainee works it on the real panels. See js/failures.js.
  var FAIL = window.ECAM_FAILURES;
  var PSTATE = {};   // control states of the drawn panels, kept between visits
  // AUTO FLT AP OFF outside the drills (owner's request, 0.7.23): disconnecting the
  // autopilot with AP1/AP2 on the FCU or a sidestick takeover pushbutton shows the red
  // warning on the E/WD, lights MASTER WARN and loops the owner's AP OFF sound.
  // MASTER WARN only silences it; the message stays until CLR. In cruise AP1 is engaged.
  var APOFF = false, AP_OFF_LINE = { parts: [{ s: 'AUTO FLT', u: true, c: 'r' }, { s: ' AP OFF', c: 'r' }] };
  function apIdx(n) { return PN.P.FCU.items.findIndex(function (x) { return x.name === n; }); }
  function apLit() {
    var st = PSTATE.FCU || {};
    return ['AP1', 'AP2'].filter(function (n) { var i = apIdx(n); return PN.litBits((st[i] || {}).lit, PN.P.FCU.items[i]).lo; });
  }
  function seedAp() { (PSTATE.FCU || (PSTATE.FCU = {}))[apIdx('AP1')] = { lit: 'lo' }; }
  function apOff() { if (DR) return; APOFF = true; PN.LIVE.clr = true; masters('W', true); chime(3, true); }
  seedAp();
  var DR = null;     // the running drill
  var BEST = {};
  try { BEST = JSON.parse(localStorage.getItem('ecam-best') || '{}'); } catch (e) { BEST = {}; }
  function liveState() { var s = DR && DR.s ? DR.s : cruiseState(); s.gear = gearView(s); s.gearCtl = gearCtl(s.gear); s.askidOff = askidOff(); s.autoBrk = autoBrk();
    // Brake triple indicator: the yellow accumulator stays charged; brake pressure shows only
    // with the parking brake ON (yellow/accumulator), none with normal or unused alternate braking.
    var pk = parkOn() ? 2 : 0; PN.LIVE.brk = { accu: 3, l: pk, r: pk };
    // Gear lever red arrow: flaps 3 or FULL with any gear not locked down.
    var fl = PN.P.FLAPS.items.findIndex(function (it) { return it.k === 'slide'; }), fs = (PSTATE.FLAPS || {})[fl];
    PN.LIVE.gearRed = (fs && fs.cur != null ? fs.cur : PN.P.FLAPS.items[fl].cur) >= 3 && s.gear.some(function (g) { return !g.dnLock; });
    return s; }
  function parkOn() {
    var items = PN.P.PARKBRK.items, st = PSTATE.PARKBRK || {};
    for (var i = 0; i < items.length; i++) if (items[i].park) return (st[i] && st[i].cur != null ? st[i].cur : items[i].cur) === 1;
    return false;
  }
  // Armed autobrake mode (LO, MED or MAX: its blue ON is lit), or null.
  function autoBrk() {
    var st = PSTATE.AUTOBRK || {}, mode = null;
    PN.P.AUTOBRK.items.forEach(function (it, i) { if (it.group === 'abrk' && PN.litBits((st[i] || {}).lit, it).lo) mode = it.name; });
    return mode;
  }
  // Autobrake arming conditions (FCOM DSC-32-30-10): green pressure and anti-skid (A/SKID &
  // N/W STRG ON); MAX cannot be armed in flight. A mode whose conditions are lost disarms
  // (its ON goes out). Returns a note when it disarmed something, or null.
  function abrkCheck() {
    var s = DR && DR.s ? DR.s : cruiseState(), st = PSTATE.AUTOBRK || {}, why = null;
    PN.P.AUTOBRK.items.forEach(function (it, i) {
      if (it.group !== 'abrk' || !PN.litBits((st[i] || {}).lit, it).lo) return;
      var w = !greenOk(s) ? 'Autobrake not armed: no green hydraulic pressure.' : askidOff() ? 'Autobrake not armed: A/SKID & N/W STRG is OFF.' :
        it.name === 'MAX' && !s.onGround ? 'MAX autobrake cannot be armed in flight.' : null;
      if (w) { st[i] = Object.assign({}, st[i], { lit: null }); why = w; }
    });
    return why;
  }
  // After a press: a MAX that cannot arm in flight leaves the panel as it was (an armed LO or
  // MED stays armed); other lost conditions disarm.
  function abrkKeep(before) {
    var w = abrkCheck();
    if (w && /MAX/.test(w)) PSTATE.AUTOBRK = JSON.parse(before);
    return w;
  }
  function refreshHome() { var y = window.scrollY; renderHome(); window.scrollTo(0, y); }

  /* ------------------------------------------------------- landing gear */
  // Normal extension and retraction (owner's request, 0.7.25), on the green system.
  // Each leg (left main, nose, right main) opens its doors, moves, locks, then closes
  // its doors. The LDG GEAR indicator and the SD WHEEL page follow it.
  var DOOR_T = 3, LEG_T = [8, 7, 8.4]; // seconds: doors open or close, each leg travels
  var GEAR = { legs: [], timer: null, sig: '', t0: 0, ctlT: null };
  function gearReset() {
    GEAR.legs = [0, 1, 2].map(function () { return { pos: 0, door: 0 }; });
    if (GEAR.timer) clearInterval(GEAR.timer);
    clearTimeout(GEAR.ctlT);
    GEAR.timer = null; GEAR.sig = ''; GEAR.t0 = 0;
  }
  gearReset();
  function gearLeverIdx() { var items = PN.P.LGLEVER.items; for (var i = 0; i < items.length; i++) if (items[i].k === 'slide') return i; return -1; }
  function gearLever() {
    var i = gearLeverIdx(), st = PSTATE.LGLEVER && PSTATE.LGLEVER[i];
    return st && st.cur != null ? st.cur : PN.P.LGLEVER.items[i].cur; // 0 UP, 1 DOWN
  }
  function greenOk(s) { return s.hyd.G.p >= 1450; }
  // tri: 'g' down and locked, 'r' unlocked or in transit, null up and locked.
  function gearView(s) {
    var down = gearLever() === 1, g = greenOk(s);
    return GEAR.legs.map(function (L) {
      var dnLock = L.pos >= 1 && (down || !g), upLock = L.pos <= 0 && (!down || L.door < 1);
      return { tri: dnLock ? 'g' : upLock ? null : 'r', door: L.door <= 0 ? 'closed' : L.door >= 1 ? 'open' : 'transit', unlk: !(dnLock && down) && !(upLock && !down), dnLock: dnLock };
    });
  }
  // L/G CTL (WHEEL page): a gear still not locked where the lever selects, 30 s after it moved.
  function gearCtl(v) { return GEAR.t0 > 0 && Date.now() - GEAR.t0 >= 30000 && v.some(function (g) { return g.unlk; }); }
  // A/SKID & N/W STRG switch OFF (WHEEL page: ANTI SKID and N/W STEERING lost, alternate braking).
  function askidOff() {
    var items = PN.P.AUTOBRK.items, st = PSTATE.AUTOBRK || {};
    for (var i = 0; i < items.length; i++) if (items[i].name === 'A/SKID & N/W STRG') return (st[i] && st[i].cur != null ? st[i].cur : items[i].cur) === 1;
    return false;
  }
  function gearTick(dt) {
    var s = liveState(), target = gearLever(), busy = false;
    if (greenOk(s)) GEAR.legs.forEach(function (L, k) {
      if (L.pos !== target) {
        busy = true;
        if (L.door < 1) L.door = Math.min(1, L.door + dt / DOOR_T);
        else L.pos = target ? Math.min(1, L.pos + dt / LEG_T[k]) : Math.max(0, L.pos - dt / LEG_T[k]);
      } else if (L.door > 0) { busy = true; L.door = Math.max(0, L.door - dt / DOOR_T); }
    });
    gearLights();
    if (!busy && GEAR.timer) { clearInterval(GEAR.timer); GEAR.timer = null; }
  }
  // LDG GEAR indicator: green triangle when down and locked, red UNLK when not
  // locked in the position the lever selects. Redraws only when an indication changes.
  function gearLights() {
    var ls = liveState(), v = ls.gear, sig = JSON.stringify([v, ls.gearCtl]);
    if (sig === GEAR.sig) return;
    GEAR.sig = sig;
    ['LDG GEAR left main', 'LDG GEAR nose', 'LDG GEAR right main'].forEach(function (n, k) { setBits(['AUTOBRK', n, 1], { up: v[k].unlk, lo: v[k].dnLock }); });
    refreshHome();
    if (PV) renderStage();
  }
  // The lever has moved: start the sequence. Without green the gear stays where it is.
  function gearMoved() {
    leverClick();
    // The SD shows the WHEEL page while it is on its automatic page.
    if (!DR && !sdPage) { sdPage = 'WHEEL'; PN.LIVE.sdPage = sdPage; }
    GEAR.t0 = Date.now(); clearTimeout(GEAR.ctlT); GEAR.ctlT = setTimeout(gearLights, 30100);
    if (!GEAR.timer) GEAR.timer = setInterval(function () { gearTick(0.2); }, 200);
    gearTick(0);
    if (!greenOk(liveState())) return 'No green hydraulic pressure: the gear does not move. Use the gravity extension.';
    return gearLever() ? 'Gear down: the doors open, the gear extends and locks down, then the doors close.' : 'Gear up: the gear unlocks, retracts and locks up, then the doors close.';
  }

  function ctlIndex(c) {
    var items = PN.P[c[0]].items, n = 0;
    for (var i = 0; i < items.length; i++) if (items[i].name === c[1] && ++n === c[2]) return i;
    return -1;
  }
  function ctlState(c) { var p = PSTATE[c[0]] || (PSTATE[c[0]] = {}), i = ctlIndex(c); return p[i] || (p[i] = {}); }
  function bits(c) { return PN.litBits(ctlState(c).lit, PN.P[c[0]].items[ctlIndex(c)]); }
  function setBits(c, b) {
    var it = PN.P[c[0]].items[ctlIndex(c)];
    ctlState(c).lit = b.up && b.lo ? 'both' : b.up ? 'up' : b.lo ? 'lo' : (it.lit ? 'none' : null);
  }
  function setFault(c, on) { var b = bits(c); b.up = on; setBits(c, b); }
  function masters(type, on) {
    ['GSL', 'GSR'].forEach(function (id) {
      PN.P[id].items.forEach(function (it, i) {
        if (it.master !== type) return;
        var p = PSTATE[id] || (PSTATE[id] = {});
        p[i] = Object.assign({}, p[i], { lit: on ? 'both' : null });
      });
    });
  }
  function masterLit() {
    return ['GSL', 'GSR'].some(function (id) {
      return PN.P[id].items.some(function (it, i) { return it.master && PSTATE[id] && PSTATE[id][i] && PSTATE[id][i].lit === 'both'; });
    });
  }

  // Aural alerts: continuous repetitive chime (warnings) and single chime (cautions).
  var audio = null, crcTimer = null, muted = false;
  try { muted = localStorage.getItem('ecam-mute') === '1'; } catch (e) { muted = false; }
  function tone(f, t0, d) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + t0;
      o.frequency.value = f; o.type = 'sine'; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o.stop(t + d + 0.05);
    } catch (e) { /* no audio */ }
  }
  // Gear lever click (owner's request, 0.7.41): a short mechanical clack, two noise bursts
  // (pull out, then the detent), made in the browser; the mute setting applies.
  function leverClick() {
    if (muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [[0, 0.5], [0.09, 0.8]].forEach(function (c) {
        var n = Math.floor(audio.sampleRate * 0.035), buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
        var src = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
        f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.9; g.gain.value = c[1];
        src.buffer = buf; src.connect(f); f.connect(g); g.connect(audio.destination);
        src.start(audio.currentTime + c[0]);
      });
    } catch (e) { /* no audio */ }
  }
  // AUTO FLT AP OFF (owner's request, 0.7.21): the owner's recording, looped until MASTER WARN.
  var apOffSnd = null;
  function chime(level, apOff) {
    stopChime();
    if (muted) return;
    if (apOff) { try { apOffSnd = apOffSnd || new Audio('sounds/ap-off.mp3'); apOffSnd.loop = true; apOffSnd.currentTime = 0; var pr = apOffSnd.play(); if (pr) pr.catch(function () {}); } catch (e) { /* no audio */ } return; }
    if (level === 3) { var ring = function () { tone(988, 0, 0.35); tone(784, 0.4, 0.45); }; ring(); crcTimer = setInterval(ring, 1100); }
    else tone(880, 0, 0.9);
  }
  function stopChime() { if (crcTimer) clearInterval(crcTimer); crcTimer = null; if (apOffSnd) apOffSnd.pause(); }

  function fmtAct(item, val) {
    var base = '-' + item, dots = 29 - base.length - val.length;
    return dots >= 2 ? base + new Array(dots + 1).join('.') + val : base + ' ' + val;
  }
  // E/WD memos from the brake controls (owner's FCOM pages, 0.7.38): AUTO BRK LO/MED/MAX and
  // BRK FAN in green, after the drill's memos.
  function ewdView() {
    var v = ewdCore(), m = autoBrk();
    v.memo = (v.memo || []).concat(m ? [{ t: 'AUTO BRK ' + m, c: 'g' }] : [], brkFan() ? [{ t: 'BRK FAN', c: 'g' }] : []);
    return v;
  }
  function brkFan() {
    var items = PN.P.AUTOBRK.items, st = PSTATE.AUTOBRK || {};
    for (var i = 0; i < items.length; i++) if (items[i].name === 'BRK FAN') return PN.litBits((st[i] || {}).lit, items[i]).lo;
    return false;
  }
  function ewdCore() {
    if (!DR || !DR.s) return { lines: APOFF ? [AP_OFF_LINE] : [], memo: [] };
    var f = DR.f, out = [], cls = f.level === 3 ? 'r' : 'a';
    if (f.level >= 2 && (DR.phase === 'run' || DR.phase === 'clr1' || DR.phase === 'quiz')) {
      var w = f.sysWord, rest = f.title.indexOf(w) === 0 ? f.title.slice(w.length) : ' ' + f.title;
      // MASTER WARN only silences the chime (owner's request, 0.7.25): lines above the
      // failure (AUTO FLT AP OFF) stay until CLR.
      if (!DR.preClr) (f.pre || []).forEach(function (l) { out.push(l); });
      // The failure being worked has its title boxed, as on the E/WD.
      out.push({ parts: [{ s: w, u: true, c: cls }, { s: rest, c: cls }], box: w.length + 1 });
      var allDone = DR.phase === 'clr1';
      f.steps.forEach(function (st, i) {
        // gone: lines that clear by themselves once the actions are done; after: lines that only then appear
        if (st.k === 'note' && ((st.gone && allDone) || (st.after && !allDone))) return;
        if (st.k === 'act' && !DR.done[i]) out.push({ text: fmtAct(st.item, st.val), cls: 'c' });
        if (st.k === 'note' && st.word) out.push({ parts: [{ s: st.word, u: true, c: st.c }, { s: st.text.slice(st.word.length), c: st.c }] });
        else if (st.k === 'note') out.push({ text: st.text, cls: st.c });
      });
    }
    if (DR.phase === 'seq') {
      var sg = f.seq[DR.si];
      return { lines: (sg.lines || []).map(ewdLine), memo: sg.memo || [], sts: sg.sd === 'STS' };
    }
    var showSts = !!f.sts && (DR.phase === 'stsq' || DR.phase === 'clr2' || DR.phase === 'done');
    var memo = DR.phase === 'clr1' && f.memoDone ? f.memoDone : (f.memo || []);
    return { lines: out, memo: f.level >= 2 ? memo : [], sts: showSts };
  }
  // A clear-sequence line: a note (with an underlined system word) or a boxed title.
  function ewdLine(l) {
    if (l.k === 'note' && l.word) {
      var p = { parts: [{ s: l.word, u: true, c: l.c }, { s: l.text.slice(l.word.length), c: l.c }] };
      if (l.boxed) p.box = l.word.length + 1;
      return p;
    }
    return l.k === 'note' ? { text: l.text, cls: l.c } : l;
  }

  function startEntry(entry) {
    drawerOpen = false; renderDrawer();
    if (VIEW !== 'deck' || DECK_MODE !== 'abnormal') setView('deck', 'abnormal');
    var ids = Array.isArray(entry.drill) ? entry.drill : [entry.drill];
    if (ids.length > 1) { showModal('choose', { entry: entry, ids: ids }); return; }
    brief(ids[0]);
  }
  function brief(id) {
    stopDrill(true);
    DR = { f: FAIL.DRILLS[id], phase: 'brief' };
    showModal('brief');
  }
  function begin() {
    var f = DR.f;
    PSTATE = {}; gearReset(); APOFF = false;
    if (JSON.stringify(f.pre || []).indexOf('AP OFF') < 0) seedAp();
    if (PV) closePanel();
    HIST = [];
    DR.s = cruiseState(); DR.i = 0; DR.done = {}; DR.mist = []; DR.right = 0; DR.asked = 0; DR.flash = null; DR.t0 = Date.now();
    if (f.setup) f.setup(DR.s);
    (f.lights || []).forEach(function (c) { setFault(c, true); });
    if (f.level >= 2) { masters(f.level === 3 ? 'W' : 'C', true); chime(f.level, JSON.stringify(f.pre || []).indexOf('AP OFF') >= 0); }
    sdPage = f.sd || null; PN.LIVE.sdPage = sdPage; PN.LIVE.clr = f.level >= 2 && !!(f.pre && f.pre.length);
    DR.preClr = false;
    DR.phase = 'run';
    hideModal();
    advance();
  }
  // Moves past steps that need nothing from the trainee; opens quizzes.
  function advance() {
    var f = DR.f;
    while (DR.i < f.steps.length && f.steps[DR.i].k === 'note') { DR.done[DR.i] = true; DR.i++; }
    if (DR.i >= f.steps.length) {
      if (f.level >= 2) { DR.phase = 'clr1'; PN.LIVE.clr = true; DR.flash = DR.flash || 'All actions done.'; }
      else return finish();
    } else if (f.steps[DR.i].k === 'quiz') { DR.phase = 'quiz'; showModal('quiz', { q: f.steps[DR.i] }); }
    else if (f.steps[DR.i].k === 'card') { DR.phase = 'quiz'; showModal('card', { c: f.steps[DR.i] }); }
    renderDrill(); refreshHome();
    if (PV && !PV.disp) renderStage();
  }
  // Alerts above the failure (AUTO FLT AP OFF) are cleared with CLR before any of its
  // actions count (owner's request: the top alert is cleared first, in every drill).
  function preOpen() { return !!(DR.f.pre && DR.f.pre.length && !DR.preClr); }
  function preName() { return DR.f.pre.map(function (l) { return l.text || l.parts.map(function (p) { return p.s; }).join(''); }).join(', '); }
  function stepMet(st) {
    if ((st.k === 'act' || st.k === 'task') && preOpen()) return false;
    if (st.k === 'master') return !masterLit();
    if (st.k === 'act') return st.ctls.every(function (c) { return st.press ? !!ctlState(c).down : bits(c).lo === st.sel; });
    if (st.k === 'task') {
      var w = st.want;
      if (w.sd) return sdPage === w.sd;
      if (w.panel) return !!PV && PV.id === w.panel;
      if (w.ctl) return bits(w.ctl).lo === w.sel;
    }
    return false;
  }
  // Called after anything the trainee does.
  function drillCheck() {
    if (DR && DR.phase === 'seq') {
      var sg = DR.f.seq[DR.si];
      if (sg.task && !DR.stTask && stepMet(sg.task)) { DR.stTask = true; DR.flash = sg.task.info || null; stageReady(); }
      return;
    }
    if (!DR || DR.phase !== 'run') return;
    var st = DR.f.steps[DR.i], moved = false;
    while (st && (st.k === 'master' || st.k === 'act' || st.k === 'task') && stepMet(st)) {
      DR.done[DR.i] = true;
      if (st.k === 'act') { if (st.fx) st.fx(DR.s); if (st.clears) st.ctls.forEach(function (c) { setFault(c, false); }); DR.flash = st.item + ' ' + st.val + ': ' + (st.why || 'done.'); }
      if (st.k === 'master') { DR.masterDone = true; DR.flash = 'Warning acknowledged: light out, chime silenced. ' + (preOpen() ? 'Now press CLR to clear ' + preName() + ', the first alert on the E/WD.' : 'Now read the ECAM procedure on the E/WD.'); }
      if (st.k === 'task') DR.flash = st.info || null;
      DR.i++; moved = true;
      st = DR.f.steps[DR.i];
    }
    if (moved) advance(); else renderDrill();
  }
  // A press on a procedure control before its turn is a sequence error.
  function drillPress(panel, i) {
    if (!DR || DR.phase !== 'run') return;
    var f = DR.f, cur = f.steps[DR.i], pre = preOpen();
    f.steps.forEach(function (st, k) {
      if (st.k !== 'act' || DR.done[k] || k === DR.i && !pre || !st.ctls.some(function (c) { return c[0] === panel && ctlIndex(c) === i; })) return;
      var msg = st.item + ' before ' + (cur.k === 'master' ? 'acknowledging the warning' : pre ? 'clearing ' + preName() : cur.k === 'act' ? cur.item + ' ' + cur.val : 'the step before it');
      if (DR.mist.indexOf(msg) < 0) DR.mist.push(msg);
      DR.flash = 'Out of sequence: ' + msg + '. Follow the ECAM order.';
    });
  }
  function pressMaster(type) {
    var lit = masterLit();
    if (lit) { masters('W', false); masters('C', false); stopChime(); }
    drillCheck();
    return lit ? 'Light out' + (type === 'W' ? ' and the chime silenced.' : '.') : null;
  }
  function pressClr() {
    if (!DR && APOFF) { APOFF = false; PN.LIVE.clr = false; refreshHome(); return true; }
    if (!DR || !DR.s) return null;
    var f = DR.f;
    if (DR.phase === 'run' && preOpen()) {
      DR.flash = preName() + ' cleared. Now the ' + f.title + ' procedure.';
      DR.preClr = true; PN.LIVE.clr = false;
      drillCheck();
    } else if (DR.phase === 'run') {
      var msg = 'CLR pressed before the actions were complete';
      if (DR.mist.indexOf(msg) < 0) DR.mist.push(msg);
      DR.flash = 'Not yet: finish the ECAM actions, then clear.';
    } else if (DR.phase === 'clr1') {
      PN.LIVE.clr = false;
      if (f.seq) startStage(0);
      else if (f.sts) { sdPage = 'STS'; PN.LIVE.sdPage = 'STS'; DR.phase = 'stsq'; DR.flash = 'STATUS shows on the SD. Review it.'; if (f.statusQ) showModal('quiz', { q: f.statusQ }); else afterStatusQ(); }
      else finish();
    } else if (DR.phase === 'clr2') finish();
    else if (DR.phase === 'seq') {
      if (!PN.LIVE.clr) DR.flash = 'Not yet: ' + (DR.f.seq[DR.si].task && !DR.stTask ? 'do the action on this page first.' : 'answer the question first.');
      else if (DR.si + 1 < f.seq.length) startStage(DR.si + 1);
      else finish();
    }
    renderDrill(); refreshHome(); if (PV) renderStage();
    return 'CLR';
  }
  // After the procedure, each CLR moves the ECAM on: the next alert, each secondary
  // failure's page (*WHEEL, *F/CTL), then STATUS. A stage can hold a question and an action.
  function startStage(i) {
    var sg = DR.f.seq[i];
    DR.phase = 'seq'; DR.si = i; DR.stQ = !sg.q; DR.stTask = !sg.task;
    sdPage = sg.sd || null; PN.LIVE.sdPage = sdPage; PN.LIVE.clr = false;
    DR.flash = sg.note || null;
    if (sg.q) showModal('quiz', { q: sg.q });
    stageReady();
  }
  function stageReady() {
    if (DR.stQ && DR.stTask) PN.LIVE.clr = true;
    renderDrill(); refreshHome(); if (PV && !PV.disp) renderStage();
  }
  function afterStatusQ() { DR.phase = 'clr2'; PN.LIVE.clr = true; renderDrill(); refreshHome(); }
  function answer(k) {
    var m = MODAL.data, correct = m.order[k] === 0;
    if (m.answered != null) return;
    m.answered = k; DR.asked++; if (correct) DR.right++;
    showModal('quiz', m);
  }
  function quizSkip() {
    if (DR.phase === 'quiz') while (DR.f.steps[DR.i + 1] && DR.f.steps[DR.i + 1].k === 'quiz') { DR.done[DR.i] = true; DR.i++; }
    quizDone();
  }
  function quizDone() {
    hideModal();
    if (DR.phase === 'quiz') { DR.done[DR.i] = true; DR.i++; DR.phase = 'run'; advance(); drillCheck(); }
    else if (DR.phase === 'stsq') afterStatusQ();
    else if (DR.phase === 'seq') { DR.stQ = true; stageReady(); }
  }
  function finish() {
    var f = DR.f, acts = f.steps.filter(function (s) { return s.k === 'act' || s.k === 'task'; }).length + (f.seq || []).filter(function (g) { return g.task; }).length;
    var total = acts + DR.asked, score = acts - Math.min(acts, DR.mist.length) + DR.right;
    DR.pct = total ? Math.round(score / total * 100) : 100;
    DR.phase = 'done'; PN.LIVE.clr = false; stopChime();
    if (f.sts) { sdPage = null; PN.LIVE.sdPage = null; }
    BEST[f.id] = Math.max(BEST[f.id] || 0, DR.pct);
    try { localStorage.setItem('ecam-best', JSON.stringify(BEST)); } catch (e) { /* not saved */ }
    renderDrill(); refreshHome();
    showModal('debrief');
  }
  // Back to a normal aircraft.
  function stopDrill(quiet) {
    stopChime();
    DR = null; PSTATE = {}; gearReset(); seedAp(); PN.LIVE.clr = false; sdPage = null; PN.LIVE.sdPage = null;
    if (!quiet) { hideModal(); if (PV) closePanel(); renderDrill(); refreshHome(); }
  }

  function taskText() {
    var f = DR.f, st = f.steps[DR.i];
    if (DR.phase === 'seq') {
      var sg = f.seq[DR.si];
      if (sg.task && !DR.stTask) return sg.task.text;
      return sg.text + ' Then press CLR' + (DR.si + 1 < f.seq.length ? '.' : ' to finish.');
    }
    if (DR.phase === 'clr1') return 'Actions complete. Press CLR on the ECAM control panel (pedestal) to clear the ' + (f.level === 3 ? 'warning' : 'caution') + '.';
    if (DR.phase === 'stsq') return 'Review the STATUS page on the SD.';
    if (DR.phase === 'clr2') return 'STATUS reviewed. Press CLR again to clear it.';
    if (DR.phase === 'done') return 'Drill complete.';
    if (!st) return '';
    if (st.k === 'master') return 'Press the flashing MASTER ' + (f.level === 3 ? 'WARN' : 'CAUT') + ' on the glareshield to ' + (f.level === 3 ? 'silence the chime' : 'acknowledge the caution') + '.';
    if (st.k === 'card') return 'Confirm the failure, then aviate, navigate, communicate. Press Continue.';
    if (preOpen()) return 'Press CLR on the ECAM control panel (pedestal) to clear ' + preName() + ' first: it is the top alert on the E/WD, and the procedure below starts once it is cleared.';
    if (st.k === 'act') return 'ECAM action: ' + st.item + ' ' + st.val + '. ' + (st.hint || 'Overhead ' + panelName(st.ctls[0][0]) + ' panel.');
    if (st.k === 'task') return st.text;
    return '';
  }
  function renderDrill() {
    var el = document.getElementById('drill');
    if (!DR || !DR.s) { el.hidden = true; document.body.classList.remove('drill-on'); return; }
    snapStep();
    var f = DR.f, acts = f.steps.filter(function (s) { return s.k === 'act' || s.k === 'task' || s.k === 'master'; }).length + (f.pre ? 1 : 0);
    var done = f.steps.filter(function (s, i) { return DR.done[i] && (s.k === 'act' || s.k === 'task' || s.k === 'master'); }).length + (f.pre && DR.preClr ? 1 : 0);
    el.innerHTML = '<div class="drill-top"><span class="dot dot-' + ['w', 'w', 'a', 'r'][f.level] + '"></span><b class="drill-title">' + esc(f.title) + '</b>' +
      '<span class="drill-prog">' + done + '/' + acts + '</span>' +
      '<button class="icon-btn sm" data-act="mute" aria-label="' + (muted ? 'Unmute' : 'Mute') + ' aural alerts">' + (muted ? '🔇' : '🔊') + '</button>' +
      '<button class="icon-btn sm" data-act="stopDrill" aria-label="Stop the drill">' + ICON.close + '</button></div>' +
      '<p class="drill-task">' + esc(taskText()) + '</p>' +
      (DR.flash ? '<p class="drill-flash">' + esc(DR.flash) + '</p>' : '');
    el.hidden = false; document.body.classList.add('drill-on');
    guideSync();
  }

  // Briefing, chooser, questions and debrief share one modal.
  var MODAL = { kind: null, data: null };
  function shuffle(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); for (var j = n - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)), t = a[j]; a[j] = a[r]; a[r] = t; } return a; }
  function showModal(kind, data) {
    MODAL.kind = kind; MODAL.data = data || null;
    var el = document.getElementById('modal'), f = DR && DR.f, h = '';
    if (kind === 'choose') {
      h = '<p class="eyebrow">Choose a failure</p><h2 class="m-title">' + esc(data.entry.title) + '</h2><ul class="plist">' + data.ids.map(function (id) {
        var d = FAIL.DRILLS[id];
        return '<li><button class="plink" data-act="brief" data-id="' + id + '"><span><span class="dot dot-' + ['w', 'w', 'a', 'r'][d.level] + '"></span> ' + esc(d.title) + '</span><small>' + esc(d.brief) + '</small></button></li>';
      }).join('') + '</ul><div class="m-btns"><button class="btn" data-act="closeModal">Cancel</button></div>';
    } else if (kind === 'brief') {
      h = '<p class="eyebrow">' + (f.level === 1 ? 'Lesson' : f.level === 3 ? 'Warning · level 3' : 'Caution · level 2') + ' · ' + esc(f.phase || '') + '</p>' +
        '<h2 class="m-title">' + esc(f.title) + '</h2><p>' + esc(f.brief) + '</p>' +
        '<h3 class="m-h">Background</h3><ul class="m-list">' + f.learn.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
        '<p class="small">' + (f.level === 1 ? 'Follow the tasks in the bar at the bottom of the screen.' : 'The failure appears on the flight deck. Work it as the PM: acknowledge the master light, read the procedure on the E/WD, do each action on the real panel, then clear with CLR on the ECAM control panel.') + ' Simplified for training; follow the FCOM and your operator\'s procedures.</p>' +
        (BEST[f.id] != null ? '<p class="small">Your best: ' + BEST[f.id] + '%</p>' : '') +
        '<div class="m-btns"><button class="btn" data-act="cancelDrill">Cancel</button><button class="btn primary" data-act="beginDrill">Start</button></div>';
    } else if (kind === 'quiz') {
      var q = data.q;
      data.order = data.order || shuffle(q.options.length);
      var ans = data.answered;
      // A small x skips the questions (owner's request, 0.7.30): this one and any that follow
      // it before the next action. The drill goes on; skipped questions are not scored.
      h = '<button class="icon-btn sm m-x" data-act="quizSkip" aria-label="Skip the questions">' + ICON.close + '</button>' +
        '<p class="eyebrow">Question · ' + esc(f.title) + '</p><h2 class="m-title q">' + esc(q.q) + '</h2><div class="m-opts">' + data.order.map(function (oi, k) {
        var c = ans == null ? '' : oi === 0 ? ' right' : k === ans ? ' wrong' : ' dim';
        return '<button class="opt' + c + '" data-act="answer" data-k="' + k + '"' + (ans != null ? ' disabled' : '') + '>' + esc(q.options[oi]) + '</button>';
      }).join('') + '</div>' +
        (ans != null ? '<p class="m-explain"><b>' + (data.order[ans] === 0 ? 'Correct.' : 'Not quite.') + '</b> ' + esc(q.explain) + '</p><div class="m-btns"><button class="btn primary" data-act="quizDone">Continue</button></div>' : '');
    } else if (kind === 'card') {
      // A card read before going on, e.g. confirm the failure and ANC (closes like a question).
      h = '<p class="eyebrow">PF and PM · ' + esc(f.title) + '</p><h2 class="m-title">' + esc(data.c.title) + '</h2>' +
        data.c.sections.map(function (sec) { return '<h3 class="m-h">' + esc(sec[0]) + '</h3><ul class="m-list">' + sec[1].map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'; }).join('') +
        '<div class="m-btns"><button class="btn primary" data-act="quizDone">Continue</button></div>';
    } else if (kind === 'debrief') {
      var secs = Math.round((Date.now() - DR.t0) / 1000);
      h = '<p class="eyebrow">Debrief</p><h2 class="m-title">' + esc(f.title) + '</h2>' +
        '<p class="m-score">' + DR.pct + '%</p>' +
        '<ul class="m-list"><li>Questions: ' + DR.right + ' of ' + DR.asked + ' right</li>' +
        '<li>' + (DR.mist.length ? 'Sequence errors: ' + DR.mist.length : f.level === 1 ? 'All tasks done' : 'Actions done in the ECAM order') + '</li>' +
        DR.mist.map(function (m) { return '<li class="bad">' + esc(m) + '</li>'; }).join('') +
        '<li>Time: ' + Math.floor(secs / 60) + ' min ' + (secs % 60) + ' s</li></ul>' +
        '<div class="m-btns"><button class="btn" data-act="stopDrill">Back to normal</button><button class="btn primary" data-act="againDrill">Run again</button></div>';
    }
    el.innerHTML = '<div class="m-card" role="dialog" aria-modal="true">' + h + '</div>';
    el.hidden = false;
  }
  // Autobrake card (owner's request, 0.7.42-0.7.43), from the owner's FCOM page DSC-32-30-10:
  // shown when a mode is armed (and from the panel's button), floating at the top so the
  // panels stay usable; it closes with its x or by itself after 20 s.
  var abrkTipT = null;
  function showAbrkTip() {
    var el = document.getElementById('abrk-tip');
    el.innerHTML = '<div class="m-card" role="dialog" aria-label="Auto brake">' + '<button class="icon-btn sm m-x" data-act="abrkTipClose" aria-label="Close">' + ICON.close + '</button>' +
        '<p class="eyebrow">FCOM DSC-32-30-10</p><h2 class="m-title">Auto brake</h2>' +
        '<h3 class="m-h">General</h3><p>The purposes of the autobrake system are to:</p><ul class="m-list">' +
        '<li>Reduce the braking distance in case of an aborted takeoff.</li>' +
        '<li>Establish and maintain a selected deceleration rate during landing, improving passenger comfort and reducing crew workload.</li></ul>' +
        '<h3 class="m-h">System arming</h3><p>The crew may arm the system by pressing the LO, MED or MAX pushbutton, provided all the following arming conditions are met:</p><ul class="m-list">' +
        '<li>Green pressure available</li><li>Anti-skid electrically powered</li><li>No failure in the braking system</li><li>At least one ADIRU available</li></ul>' +
        '<p class="small">Note: 1. Auto brake may be armed with the parking brake on. 2. MAX autobrake mode cannot be armed in flight.</p>' +
        '<p>The armed AUTO BRK mode is displayed in blue on the FMA.</p>' +
        '<p class="small">In this trainer: green pressure and the A/SKID &amp; N/W STRG switch are checked, a mode disarms when they are lost, and MAX cannot be armed in flight. Due to differences between fleet and airlines - refer to own OMs</p>' + '</div>';
    el.hidden = false;
    clearTimeout(abrkTipT); abrkTipT = setTimeout(hideAbrkTip, 20000);
  }
  function hideAbrkTip() { clearTimeout(abrkTipT); var el = document.getElementById('abrk-tip'); el.hidden = true; el.innerHTML = ''; }
  function hideModal() { MODAL.kind = null; var el = document.getElementById('modal'); el.hidden = true; el.innerHTML = ''; }

  function failureMenu() {
    return '<h3 class="drawer-h">Failures</h3>' + FAIL.CATEGORIES.map(function (c, ci) {
      var live = c[1].filter(function (e) { return e.drill; }).length;
      return '<details class="cat"' + (DR && FAIL.CATEGORIES[ci][1].some(function (e) { return e.drill && [].concat(e.drill).indexOf(DR.f.id) >= 0; }) ? ' open' : '') + '><summary>' + esc(c[0]) + (live ? '' : ' <small>coming soon</small>') + '</summary><ul class="flist">' + c[1].map(function (e, ei) {
        var best = e.drill ? [].concat(e.drill).map(function (id) { return BEST[id]; }).filter(function (v) { return v != null; }) : [];
        return '<li><button class="fitem' + (e.drill ? '' : ' off') + '" data-act="entry" data-c="' + ci + '" data-e="' + ei + '"' + (e.drill ? '' : ' disabled') + '><span class="dot dot-' + e.lvl + '"></span>' + esc(e.title) +
          (best.length ? '<small>' + Math.max.apply(null, best) + '%</small>' : '') + '</button></li>';
      }).join('') + '</ul></details>';
    }).join('');
  }

  /* ------------------------------------------------------ questions bank */
  var QBEST = {};
  try { QBEST = JSON.parse(localStorage.getItem('ecam-qbest') || '{}'); } catch (e) { QBEST = {}; }
  function renderQuiz() {
    var v = document.getElementById('view'), bank = FAIL.questions();
    if (!QZ) {
      var all = bank.reduce(function (n, c) { return n + c[1].length; }, 0);
      v.innerHTML = '<section class="start"><p class="start-intro">Choose a topic. Each set is in random order, with an explanation after every answer.</p><ul class="tlist">' +
        '<li><button class="titem titem-row" data-tone="c" data-act="qzStart" data-c="*"><span class="titem-t">All topics</span><span class="titem-d">' + all + ' questions, 10 picked at random' + (QBEST['*'] != null ? ' · best ' + QBEST['*'] + '%' : '') + '</span><span class="titem-go" aria-hidden="true">\u2192</span></button></li>' +
        bank.map(function (c) {
          return '<li><button class="titem titem-row" data-tone="c" data-act="qzStart" data-c="' + esc(c[0]) + '"><span class="titem-t">' + esc(c[0]) + '</span><span class="titem-d">' + c[1].length + ' question' + (c[1].length > 1 ? 's' : '') + (QBEST[c[0]] != null ? ' · best ' + QBEST[c[0]] + '%' : '') + '</span><span class="titem-go" aria-hidden="true">\u2192</span></button></li>';
        }).join('') + '</ul><p class="small center">More topics appear as each system\'s drills are built.</p></section>';
      return;
    }
    var q = QZ.list[QZ.i];
    if (!q) {
      var pct = Math.round(QZ.right / QZ.list.length * 100);
      v.innerHTML = '<section class="start"><div class="qcard"><p class="eyebrow">' + esc(QZ.cat === '*' ? 'All topics' : QZ.cat) + '</p><p class="m-score">' + pct + '%</p>' +
        '<p>' + QZ.right + ' of ' + QZ.list.length + ' right.</p><div class="m-btns"><button class="btn" data-act="qzBack">Topics</button><button class="btn primary" data-act="qzStart" data-c="' + esc(QZ.cat) + '">Again</button></div></div></section>';
      return;
    }
    var ans = QZ.ans;
    v.innerHTML = '<section class="start"><div class="qcard"><p class="eyebrow">' + esc(QZ.cat === '*' ? 'All topics' : QZ.cat) + (q.from ? ' · ' + esc(q.from) : '') + ' · ' + (QZ.i + 1) + ' of ' + QZ.list.length + '</p>' +
      '<h2 class="m-title q">' + esc(q.q) + '</h2><div class="m-opts">' + QZ.order.map(function (oi, k) {
        var c = ans == null ? '' : oi === 0 ? ' right' : k === ans ? ' wrong' : ' dim';
        return '<button class="opt' + c + '" data-act="qzAns" data-k="' + k + '"' + (ans != null ? ' disabled' : '') + '>' + esc(q.options[oi]) + '</button>';
      }).join('') + '</div>' +
      (ans != null ? '<p class="m-explain"><b>' + (QZ.order[ans] === 0 ? 'Correct.' : 'Not quite.') + '</b> ' + esc(q.explain) + '</p><div class="m-btns"><button class="btn primary" data-act="qzNext">' + (QZ.i + 1 < QZ.list.length ? 'Next' : 'Finish') + '</button></div>' : '') +
      '</div></section>';
  }
  function startQuiz(cat) {
    var bank = FAIL.questions(), list = [];
    bank.forEach(function (c) { if (cat === '*' || c[0] === cat) list = list.concat(c[1]); });
    list = shuffle(list.length).map(function (i) { return list[i]; }).slice(0, cat === '*' ? 10 : list.length);
    QZ = { cat: cat, list: list, i: 0, right: 0, ans: null };
    QZ.order = shuffle(list[0].options.length);
    renderQuiz(); window.scrollTo(0, 0);
  }
  function qzAnswer(k) {
    if (QZ.ans != null) return;
    QZ.ans = k; if (QZ.order[k] === 0) QZ.right++;
    renderQuiz();
  }
  function qzNext() {
    QZ.i++; QZ.ans = null;
    if (QZ.list[QZ.i]) QZ.order = shuffle(QZ.list[QZ.i].options.length);
    else {
      var pct = Math.round(QZ.right / QZ.list.length * 100);
      QBEST[QZ.cat] = Math.max(QBEST[QZ.cat] || 0, pct);
      try { localStorage.setItem('ecam-qbest', JSON.stringify(QBEST)); } catch (e) { /* not saved */ }
    }
    renderQuiz(); window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------ menu and search */
  function panelLinks(ids) {
    return '<ul class="plist">' + ids.map(function (id) {
      return '<li><button class="plink" data-act="open" data-id="' + id + '"><span>' + esc(panelName(id)) + '</span><small>' + esc(getP(id).desc) + '</small></button></li>';
    }).join('') + '</ul>';
  }
  function renderDrawer() {
    var el = document.getElementById('drawer');
    document.getElementById('scrim').hidden = !drawerOpen && !searchOpen;
    if (!drawerOpen) { el.hidden = true; return; }
    el.innerHTML = '<nav class="drawer-card" aria-label="Menu">' +
      '<div class="drawer-top"><span class="drawer-brand">A320 ECAM Trainer</span><button class="icon-btn" data-act="closeDrawer" aria-label="Close menu">' + ICON.close + '</button></div>' +
      // Abnormal procedures: the failures only; drills are always guided (owner's decision, 0.7.73: Non-guided removed).
      (DECK_MODE === 'abnormal' ? '<p class="drawer-note">Each panel opens in turn as you work the failure.</p>' :
      '<button class="drawer-link" data-act="home">Start page</button>' +
      '<button class="drawer-link" data-act="choose" data-v="normal">Flight deck overview</button>' +
      '<button class="drawer-link" data-act="choose" data-v="quiz">ECAM drill quiz</button>') +
      failureMenu() + '<h3 class="drawer-h">Panels</h3>' +
      GROUPS.map(function (g) { return '<h3 class="drawer-h">' + esc(g[0]) + '</h3>' + panelLinks(g[1]); }).join('') +
      '<h3 class="drawer-h">Photo credits</h3><p class="drawer-note">Overhead panels: ' + creditHtml() + ' The straightened crops are shared under the same licence.</p>' +
      '<p class="drawer-note">Training aid only. Other panels are simplified drawings; follow the FCOM and your operator\'s procedures.</p>' +
      '<p class="drawer-note">Version ' + VERSION + '</p>' +
      '</nav>';
    el.hidden = false;
  }
  function renderSearch() {
    var el = document.getElementById('search');
    document.getElementById('scrim').hidden = !drawerOpen && !searchOpen;
    if (!searchOpen) { el.hidden = true; return; }
    if (!el.firstChild) {
      el.innerHTML = '<div class="search-card" role="dialog" aria-label="Search panels">' +
        '<div class="search-row"><input id="search-input" type="search" placeholder="Search panels and switches, e.g. PTU, IDG, RAT" autocomplete="off">' +
        '<button class="icon-btn" data-act="closeSearch" aria-label="Close search">' + ICON.close + '</button></div>' +
        '<div id="search-results"></div></div>';
      el.querySelector('#search-input').addEventListener('input', function (e) { searchTerm = e.target.value; renderResults(); });
    }
    el.hidden = false;
    var inp = el.querySelector('#search-input'); inp.value = searchTerm; inp.focus();
    renderResults();
  }
  function renderResults() {
    var box = document.getElementById('search-results'), q = searchTerm.trim().toLowerCase();
    if (!q) { box.innerHTML = '<p class="empty">Type a panel, switch or system name.</p>'; return; }
    var ids = [];
    GROUPS.forEach(function (g) {
      g[1].forEach(function (id) {
        var p = getP(id);
        var hay = (panelName(id) + ' ' + p.desc + ' ' + (p.items || p.parts.map(function (q) { return { name: q[0], info: q[1] }; })).map(function (it) { return (it.name || it.label || '') + ' ' + (it.info || ''); }).join(' ')).toLowerCase();
        if (hay.indexOf(q) >= 0) ids.push(id);
      });
    });
    box.innerHTML = ids.length ? panelLinks(ids) : '<p class="empty">Nothing matches “' + esc(searchTerm) + '”.</p>';
  }

  /* ------------------------------------------------------------- events */
  // FCU knobs turn: drag round the knob (one click every 20 degrees), or tap its
  // left side (anticlockwise) or right side (clockwise).
  var TURN = null;
  document.addEventListener('pointerdown', function (e) {
    var c = e.target.closest && e.target.closest(PV ? '.ctl.turn' : '.fcukey.turn');
    if (!c) { TURN = null; return; }
    var b = c.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    TURN = { i: +c.getAttribute(PV ? 'data-ctl' : 'data-fcu'), pid: c.getAttribute('data-pid'), deck: !PV, cx: cx, cy: cy, a: Math.atan2(e.clientY - cy, e.clientX - cx), moved: false };
  });
  document.addEventListener('pointermove', function (e) {
    if (!TURN || !(e.buttons & 1) && e.pointerType === 'mouse') return;
    var a = Math.atan2(e.clientY - TURN.cy, e.clientX - TURN.cx), d = a - TURN.a;
    if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) < 0.35) return;
    TURN.a = a; TURN.moved = true;
    if (TURN.deck) deckFcu(TURN.pid, TURN.i, d > 0 ? 1 : -1); else if (PV) pressCtl(TURN.i, d > 0 ? 1 : -1);
  });
  document.addEventListener('click', function (e) {
    var ctlEl = e.target.closest('.ctl');
    if (ctlEl && PV && TURN && TURN.moved) { TURN = null; return; }
    if (ctlEl && PV && (PV.disp || guidedOn()) && ctlEl.closest('.pv-ecp')) { pressEcp(+ctlEl.getAttribute('data-ctl')); return; }
    if (ctlEl && PV && ctlEl.classList.contains('turn')) {
      var r = ctlEl.getBoundingClientRect();
      // The centre of the knob pushes it, a second tap pulls it; either side turns it.
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      TURN = null; pressCtl(+ctlEl.getAttribute('data-ctl'), Math.hypot(dx, dy) < r.width * 0.18 ? 'tap' : dx < 0 ? -1 : 1); return;
    }
    if (ctlEl && PV) { pressCtl(+ctlEl.getAttribute('data-ctl')); return; }
    // FCU knobs and buttons on the deck: the centre of a knob pushes, then pulls; either side turns it.
    var fk = !PV && e.target.closest('.fcukey');
    if (fk) {
      if (TURN && TURN.moved) { TURN = null; return; }
      var fr = fk.getBoundingClientRect(), fdx = e.clientX - (fr.left + fr.width / 2), fdy = e.clientY - (fr.top + fr.height / 2);
      TURN = null; deckFcu(fk.getAttribute('data-pid'), +fk.getAttribute('data-fcu'), fk.classList.contains('turn') ? (Math.hypot(fdx, fdy) < fr.width * 0.18 ? 'tap' : fdx < 0 ? -1 : 1) : undefined); return;
    }
    var sdKey = e.target.closest('.sdkey');
    if (sdKey && !PV) {
      var key = sdKey.getAttribute('data-sd'), hot = sdKey.closest('.hot');
      // Master lights and CLR act on the deck during a drill; otherwise the tap opens the panel.
      if (key === 'MW' || key === 'MC') { if (masterLit()) { pressMaster(key === 'MW' ? 'W' : 'C'); refreshHome(); } else openPanel(hot.getAttribute('data-panel'), hot); return; }
      if (key === 'CLR') { if (!pressClr()) openPanel(hot.getAttribute('data-panel'), hot); return; }
      setSd(key); return;
    }
    var hotEl = e.target.closest('.hot');
    if (hotEl) { openPanel(hotEl.getAttribute('data-panel'), hotEl); return; }
    if (e.target.id === 'scrim') { drawerOpen = false; searchOpen = false; renderDrawer(); renderSearch(); return; }
    var el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.getAttribute('data-act')) {
      case 'menu': drawerOpen = true; renderDrawer(); break;
      case 'home': goHome(); break;
      case 'winReset': WIN = {}; saveWin(); refreshHome(); break;
      case 'choose': var v = el.getAttribute('data-v'); if (v === 'quiz') { QZ = null; setView('quiz'); } else setView('deck', v); break;
      case 'failures': drawerOpen = true; renderDrawer(); break;
      case 'qzStart': startQuiz(el.getAttribute('data-c')); break;
      case 'qzAns': qzAnswer(+el.getAttribute('data-k')); break;
      case 'qzNext': qzNext(); break;
      case 'qzBack': QZ = null; renderQuiz(); break;
      case 'closeDrawer': drawerOpen = false; renderDrawer(); applyPendingUpdate(); break;
      case 'search': searchOpen = true; renderSearch(); break;
      case 'closeSearch': searchOpen = false; renderSearch(); break;
      case 'open': openPanel(el.getAttribute('data-id'), null); break;
      case 'closePanel': if (guidedOn()) stepBack(); else closePanel(); break;
      case 'entry': startEntry(FAIL.CATEGORIES[+el.getAttribute('data-c')][1][+el.getAttribute('data-e')]); break;
      case 'brief': brief(el.getAttribute('data-id')); break;
      case 'beginDrill': begin(); break;
      case 'cancelDrill': stopDrill(); break;
      case 'closeModal': hideModal(); break;
      case 'abrkInfo': showAbrkTip(); break;
      case 'abrkTipClose': hideAbrkTip(); break;
      case 'answer': answer(+el.getAttribute('data-k')); break;
      case 'quizDone': quizDone(); break;
      case 'quizSkip': quizSkip(); break;
      case 'againDrill': var id = DR.f.id; brief(id); begin(); break;
      case 'stopDrill': stopDrill(); break;
      case 'mute': muted = !muted; try { localStorage.setItem('ecam-mute', muted ? '1' : '0'); } catch (err) { /* ignore */ } if (muted) stopChime(); renderDrill(); break;
      case 'pvmode': if (PV) { setPanelMode(el.getAttribute('data-mode')); renderPanelView(); } break;
      case 'fcu': if (PV && PV.selected != null) { var how = el.getAttribute('data-how'); pressCtl(PV.selected, how === 'l' ? -1 : how === 'r' ? 1 : how); } break;
      case 'fmsim': FMGC.sim(el.getAttribute('data-sim')); if (PV) renderStage(); break;
      case 'fmguide': FMGC.guide(el.getAttribute('data-g'), PV && PV.id); if (PV) renderStage(); break;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (MODAL.kind && MODAL.kind !== 'quiz') { if (MODAL.kind === 'brief') stopDrill(); else hideModal(); return; }
      if (searchOpen || drawerOpen) { searchOpen = false; drawerOpen = false; renderSearch(); renderDrawer(); }
      else if (PV) closePanel();
      return;
    }
    // On an open MCDU the computer keyboard types into the scratchpad.
    if (FMGC && PV && /^MCDU[12]$/.test(PV.id) && !e.ctrlKey && !e.metaKey && !e.altKey && /^([a-zA-Z0-9./+-]|Backspace)$/.test(e.key)) {
      e.preventDefault(); FMGC.key(PV.id, e.key === 'Backspace' ? 'CLR' : e.key === '+' || e.key === '-' ? '±' : e.key.toUpperCase()); renderStage(); return;
    }
    var turnEl = e.target.closest && e.target.closest('.ctl.turn');
    var turnKey = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 'pull', ArrowDown: 'push', Enter: 'tap' }[e.key];
    if (turnEl && PV && turnKey != null) { e.preventDefault(); pressCtl(+turnEl.getAttribute('data-ctl'), turnKey); return; }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var ctlEl = e.target.closest && e.target.closest('.ctl');
    if (ctlEl && PV) { e.preventDefault(); pressCtl(+ctlEl.getAttribute('data-ctl')); return; }
    var hotEl = e.target.closest && e.target.closest('.hot');
    if (hotEl) { e.preventDefault(); openPanel(hotEl.getAttribute('data-panel'), hotEl); }
  });

  // Android Back button (see android/): close what is open; false means leave the app.
  window.appBack = function () {
    if (MODAL.kind && MODAL.kind !== 'quiz') { if (MODAL.kind === 'brief') stopDrill(); else hideModal(); return true; }
    if (searchOpen || drawerOpen) { searchOpen = false; drawerOpen = false; renderSearch(); renderDrawer(); return true; }
    if (PV) { if (guidedOn()) stepBack(); else closePanel(); return true; }
    if (VIEW !== 'start') { if (QZ && VIEW === 'quiz') { QZ = null; renderQuiz(); } else goHome(); return true; }
    return false;
  };

  /* -------------------------------------------------------- auto update */
  // The published site carries version.json. When it names a newer version
  // than the one running, the page reloads itself (waiting until no panel,
  // menu or search is open). Script URLs carry ?v=VERSION, so the reload
  // fetches the new files rather than cached ones.
  var pendingUpdate = null;
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function checkUpdate() {
    if (!/^https?:/.test(location.protocol) || !window.fetch) return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.version || j.version === VERSION) return;
      // Already reloaded for this version in the last 11 minutes: the site's
      // cached copy (up to 10 minutes) is still catching up.
      var last = (store('ecam-reload-for') || '').split('|');
      if (last[0] === j.version && Date.now() - +last[1] < 11 * 60 * 1000) return;
      pendingUpdate = j.version;
      applyPendingUpdate();
    }).catch(function () {});
  }
  function applyPendingUpdate() {
    if (!pendingUpdate || PV || drawerOpen || searchOpen || DR) return;
    store('ecam-reload-for', pendingUpdate + '|' + Date.now()); store('ecam-updated-from', VERSION);
    location.reload();
  }
  function showUpdatedNote() {
    var from = store('ecam-updated-from');
    if (!from || from === VERSION) return;
    store('ecam-updated-from', null); store('ecam-reload-for', null);
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status');
    t.textContent = 'Updated to version ' + VERSION;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 3500);
    setTimeout(function () { t.remove(); }, 4200);
  }

  // The title bar slides away while scrolling down the deck and comes back on
  // scrolling up (or near the top), leaving more room for the panels.
  function hideBarOnScroll() {
    var bar = document.querySelector('.appbar'), lastY = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY, dy = y - lastY;
        if (y < 60 || drawerOpen || searchOpen) bar.classList.remove('away');
        else if (dy > 6) bar.classList.add('away');
        else if (dy < -6) bar.classList.remove('away');
        if (Math.abs(dy) > 6 || y < 60) lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }

  function boot() {
    document.getElementById('app').innerHTML =
      '<header class="appbar">' +
      '<button class="icon-btn" data-act="home" aria-label="Back to the start" hidden>' + ICON.back + '</button>' +
      '<button class="icon-btn" data-act="menu" aria-label="Open menu">' + ICON.menu + '</button>' +
      '<h1 class="appbar-title">A320 ECAM Trainer</h1>' +
      '<button class="icon-btn" data-act="search" aria-label="Search panels" hidden>' + ICON.search + '</button>' +
      '</header>' +
      '<main id="view"></main>' +
      '<div id="scrim" class="scrim" hidden></div>' +
      '<div id="drawer" class="drawer" hidden></div>' +
      '<div id="search" class="search" hidden></div>' +
      '<div id="pv" class="pv" hidden></div>' +
      '<div id="drill" class="drill" hidden aria-live="polite"></div>' +
      '<div id="modal" class="modal" hidden></div>' +
      '<div id="abrk-tip" class="abrk-tip" hidden></div>';
    setView('start');
    showUpdatedNote();
    hideBarOnScroll();
    setTimeout(checkUpdate, 1500);
    setInterval(checkUpdate, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkUpdate(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
