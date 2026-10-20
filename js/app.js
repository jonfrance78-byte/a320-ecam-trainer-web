/* A320 ECAM Trainer: app shell.
 * Home is the flight deck overview; tapping a panel expands it full screen.
 * The menu and search list the panels. Training content comes later.
 */
(function () {
  'use strict';

  // Shown in the menu; the APK build takes its version name from here too.
  var VERSION = '0.3.1';
  var DISP = window.ECAM_DISPLAYS, DECK = window.ECAM_DECK, PN = window.ECAM_PANELS, PHOTO = window.ECAM_PHOTO_PANELS;
  var esc = DISP.esc;

  // Panels by area of the flight deck.
  var GROUPS = [
    ['Aft overhead', ['ELT', 'CB', 'AFTBOTTOM', 'AUDIOSW', 'MAINT', 'DLS']],
    ['Overhead panel', ['FIRE', 'HYD', 'FUEL', 'ELEC', 'AIR', 'ANTIICE', 'CABPRESS', 'LOWER', 'PA', 'ADIRS', 'FLTCTL1', 'EVAC', 'EMERELEC', 'GPWS', 'RCDR', 'OXY', 'CALLS', 'WIPERL', 'ACP3', 'FLTCTL2', 'CARGO', 'VENT', 'MANSTART', 'WIPERR']],
    ['Glareshield', ['GSL', 'EFISL', 'FCU', 'EFISR', 'GSR']],
    ['Main instrument panel', ['LATL', 'ISISP', 'AUTOBRK', 'CLOCK', 'LGLEVER', 'DCDU1', 'DCDU2', 'LATR']],
    ['Pedestal', ['MCDU1', 'SWITCHING', 'ECP', 'MCDU2', 'RMP1', 'RMP2', 'ACP1', 'ACP2', 'THR', 'ENGPED', 'FLOODL', 'WXR', 'FLOODR', 'ATC', 'SPDBRK', 'RUDTRIM', 'FLAPS', 'DOOR', 'PRINTER', 'PARKBRK', 'GRAVITY']],
    ['Side consoles', ['CONSL', 'CONSR']]
  ];
  function panelName(id) { var p = PN.P[id]; return (p && (p.name || p.title)) || id; }

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
  var PV = null; // expanded panel: { id, states, selected }

  /* ----------------------------------------------------------------- home */
  function renderHome() {
    var s = cruiseState();
    var ecam = { ewd: DISP.renderEWD(s, { lines: [], memo: [] }), sd: DISP.renderSD(s, 'CRUISE', null) };
    document.getElementById('view').innerHTML =
      '<section class="home">' +
      '<p class="home-hint">Tap any panel to expand it.</p>' +
      '<div class="deck-wrap">' + DECK.build({ ecam: ecam }) + '</div>' +
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
    if (!PN.P[id] && !(PHOTO && PHOTO.panels[id])) return;
    PV = { id: id };
    setPanelMode(PN.P[id] ? 'draw' : 'photo');
    drawerOpen = false; searchOpen = false; renderDrawer(); renderSearch();
    renderPanelView();
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
  function closePanel() { PV = null; renderPanelView(); }
  // Drawing (default) or the real photo, where one exists for this panel.
  function setPanelMode(mode) {
    var photo = mode === 'photo' && PHOTO && PHOTO.panels[PV.id];
    PV.photo = photo || null; PV.states = {}; PV.selected = null; PV.note = null;
    PV.items = photo ? photoItems(PV.id) : PN.P[PV.id].items;
    if (photo) PV.items.forEach(function (it, i) { if (it.photoLit) PV.states[i] = { lit: it.photoLit }; });
  }

  function legendChip(L) { return L ? '<span class="lchip lchip-' + L.c + '">' + esc(L.s) + '</span>' : ''; }
  function infoHtml(p) {
    if (PV.selected == null) return '<p class="pv-hint">Tap any pushbutton, guard, selector or switch to work it and see what it does.</p>';
    var it = PV.items[PV.selected], st = PV.states[PV.selected] || {};
    var k = PN.kindOf(it);
    var kind = it.kindName || { latching: 'Pushbutton', momentary: 'Momentary pushbutton', indicator: 'Indicator light', fire: 'Fire pushbutton', sel: 'Selector', knob: 'Rotary knob', tog: 'Switch', lever: 'Lever', slide: 'Lever', part: 'Part', disp: 'Display', win: 'FCU window' }[k] || 'Control';
    var status = PN.statusLegends(it), note = '';
    if (k === 'indicator') note = 'Indicator only: it lights when the system triggers it and can\'t be selected.';
    else if (k === 'momentary') note = 'Momentary: it springs back after each press.';
    if (status.length && k !== 'indicator') note += (note ? ' ' : '') + status.join(' and ') + ' ' + (status.length > 1 ? 'are' : 'is') + ' driven by the system and never lit by a press.';
    if (it.k === 'fire') note = 'The red light comes on only with a fire warning. Pushing releases the pushbutton out.';
    var chips = legendChip(it.up) + legendChip(it.lo);
    if (it.k === 'fire') chips = '<span class="lchip lchip-r">FIRE</span>';
    if (it.k === 'sel' || it.k === 'tog' || it.k === 'slide') chips = it.pos.map(function (q, i) { return '<span class="lchip' + (i === (st.cur != null ? st.cur : it.cur) ? ' lchip-cur' : '') + '">' + esc(q) + '</span>'; }).join('');
    return '<p class="eyebrow">' + kind + (it.guard ? ' · guarded' : '') + '</p>' +
      '<h3 class="pv-ctl">' + esc(PN.ctlName(it)) + '</h3>' +
      (chips ? '<div class="lchips">' + chips + '</div>' : '') +
      '<p>' + esc(it.info || '') + '</p>' +
      (PV.note ? '<p class="pv-note">' + esc(PV.note) + '</p>' : '') +
      (note ? '<p class="small">' + esc(note) + '</p>' : '') +
      (it.guard ? '<p class="small">' + (st.guardOpen ? 'Guard lifted. Tap again to work the pushbutton.' : 'Tap again to lift the guard.') + '</p>' : '');
  }
  function renderStage() {
    var p = PN.P[PV.id];
    document.getElementById('pv-stage').innerHTML = PV.photo ? renderPhotoStage(PV.photo) :
      '<svg viewBox="-4 -4 ' + (p.w + 8) + ' ' + (p.h + 8) + '" class="pv-svg" role="group" aria-label="' + esc(panelName(PV.id)) + ' panel">' +
      PN.defs() + PN.render(PV.id, { interactive: true, states: PV.states, selected: PV.selected }) + '</svg>';
    document.getElementById('pv-info').innerHTML = infoHtml(p);
  }
  function creditHtml() {
    var c = PHOTO.credit;
    return 'Photo: <a href="' + c.source + '" target="_blank" rel="noopener">' + esc(c.title) + '</a> by ' + esc(c.author) +
      ', <a href="' + c.licenseUrl + '" target="_blank" rel="noopener">' + esc(c.license) + '</a>. Straightened and cropped. A319 overhead, same layout as the A320.';
  }
  function renderPanelView() {
    var el = document.getElementById('pv');
    if (!PV) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('pv-open'); return; }
    var p = PN.P[PV.id] || { desc: '' }, dims = PV.photo || p;
    var gate = PV.photo && PV.items.some(function (it) { return it.photoLit; });
    el.innerHTML = '<div class="pv-card" role="dialog" aria-modal="true" aria-label="' + esc(panelName(PV.id)) + ' panel">' +
      '<header class="pv-bar"><button class="icon-btn" data-act="closePanel" aria-label="Back to flight deck">' + ICON.back + '</button>' +
      '<h2 class="appbar-title">' + esc(panelName(PV.id)) + '</h2><span class="icon-btn-spacer"></span></header>' +
      '<div class="pv-stage" id="pv-stage"></div>' +
      (PHOTO && PHOTO.panels[PV.id] && PN.P[PV.id] ? '<div class="seg pv-switch" role="radiogroup" aria-label="View">' +
        '<button role="radio" aria-checked="' + !PV.photo + '" class="seg-btn' + (PV.photo ? '' : ' on') + '" data-act="pvmode" data-mode="draw">Drawing</button>' +
        '<button role="radio" aria-checked="' + !!PV.photo + '" class="seg-btn' + (PV.photo ? ' on' : '') + '" data-act="pvmode" data-mode="photo">Photo (A319)</button></div>' : '') +
      (PV.photo ? '<p class="pv-credit">' + creditHtml() + '</p>' : '') +
      (dims.w / dims.h > 2.2 ? '<p class="pv-rotate">Turn your phone sideways for a bigger panel.</p>' : '') +
      '<div class="pv-body"><p class="pv-desc">' + esc(p.desc) + '</p>' +
      (gate ? '<p class="small">The photo was taken on the ground with the engines stopped and the APU running, so some lights are already on (for example GEN FAULT, fuel pumps OFF, APU BLEED ON).</p>' : '') +
      '<div class="pv-info" id="pv-info" aria-live="polite"></div></div></div>';
    el.hidden = false; document.body.classList.add('pv-open');
    renderStage();
  }
  function pressCtl(i) {
    var it = PV.items[i];
    if (!it) return;
    PV.note = PN.pressItems(PV.items, i, PV.states);
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

  /* ------------------------------------------------------ menu and search */
  function panelLinks(ids) {
    return '<ul class="plist">' + ids.map(function (id) {
      return '<li><button class="plink" data-act="open" data-id="' + id + '"><span>' + esc(panelName(id)) + '</span><small>' + esc(PN.P[id].desc) + '</small></button></li>';
    }).join('') + '</ul>';
  }
  function renderDrawer() {
    var el = document.getElementById('drawer');
    document.getElementById('scrim').hidden = !drawerOpen && !searchOpen;
    if (!drawerOpen) { el.hidden = true; return; }
    el.innerHTML = '<nav class="drawer-card" aria-label="Menu">' +
      '<div class="drawer-top"><span class="drawer-brand">A320 ECAM Trainer</span><button class="icon-btn" data-act="closeDrawer" aria-label="Close menu">' + ICON.close + '</button></div>' +
      '<button class="drawer-link" data-act="closeDrawer">Flight deck overview</button>' +
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
        var p = PN.P[id];
        var hay = (panelName(id) + ' ' + p.desc + ' ' + p.items.map(function (it) { return (it.name || it.label || '') + ' ' + (it.info || ''); }).join(' ')).toLowerCase();
        if (hay.indexOf(q) >= 0) ids.push(id);
      });
    });
    box.innerHTML = ids.length ? panelLinks(ids) : '<p class="empty">Nothing matches “' + esc(searchTerm) + '”.</p>';
  }

  /* ------------------------------------------------------------- events */
  document.addEventListener('click', function (e) {
    var ctlEl = e.target.closest('.ctl');
    if (ctlEl && PV) { pressCtl(+ctlEl.getAttribute('data-ctl')); return; }
    var hotEl = e.target.closest('.hot');
    if (hotEl) { openPanel(hotEl.getAttribute('data-panel'), hotEl); return; }
    if (e.target.id === 'scrim') { drawerOpen = false; searchOpen = false; renderDrawer(); renderSearch(); return; }
    var el = e.target.closest('[data-act]');
    if (!el) return;
    switch (el.getAttribute('data-act')) {
      case 'menu': drawerOpen = true; renderDrawer(); break;
      case 'closeDrawer': drawerOpen = false; renderDrawer(); break;
      case 'search': searchOpen = true; renderSearch(); break;
      case 'closeSearch': searchOpen = false; renderSearch(); break;
      case 'open': openPanel(el.getAttribute('data-id'), null); break;
      case 'closePanel': closePanel(); break;
      case 'pvmode': if (PV) { setPanelMode(el.getAttribute('data-mode')); renderPanelView(); } break;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (searchOpen || drawerOpen) { searchOpen = false; drawerOpen = false; renderSearch(); renderDrawer(); }
      else if (PV) closePanel();
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var ctlEl = e.target.closest && e.target.closest('.ctl');
    if (ctlEl && PV) { e.preventDefault(); pressCtl(+ctlEl.getAttribute('data-ctl')); return; }
    var hotEl = e.target.closest && e.target.closest('.hot');
    if (hotEl) { e.preventDefault(); openPanel(hotEl.getAttribute('data-panel'), hotEl); }
  });

  // Android Back button (see android/): close what is open; false means leave the app.
  window.appBack = function () {
    if (searchOpen || drawerOpen) { searchOpen = false; drawerOpen = false; renderSearch(); renderDrawer(); return true; }
    if (PV) { closePanel(); return true; }
    return false;
  };

  function boot() {
    document.getElementById('app').innerHTML =
      '<header class="appbar">' +
      '<button class="icon-btn" data-act="menu" aria-label="Open menu">' + ICON.menu + '</button>' +
      '<h1 class="appbar-title">A320 Flight Deck Overview</h1>' +
      '<button class="icon-btn" data-act="search" aria-label="Search panels">' + ICON.search + '</button>' +
      '</header>' +
      '<main id="view"></main>' +
      '<div id="scrim" class="scrim" hidden></div>' +
      '<div id="drawer" class="drawer" hidden></div>' +
      '<div id="search" class="search" hidden></div>' +
      '<div id="pv" class="pv" hidden></div>';
    renderHome();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
