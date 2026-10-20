/* A320 ECAM Trainer: E/WD and SD rendering.
 * Both display units are drawn as 320x320 SVG. Colours come from CSS classes:
 * g green, a amber, r red, c cyan, w white, m magenta, d dim.
 * Stroke classes: sg sa sr sc sw sd.
 */
(function () {
  'use strict';

  function esc(v) {
    return String(v).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
  }
  function t(x, y, s, cls, size, anchor, extra) {
    return '<text x="' + x + '" y="' + y + '" class="' + (cls || 'g') + '"' +
      (size ? ' font-size="' + size + '"' : '') +
      (anchor ? ' text-anchor="' + anchor + '"' : '') + (extra || '') + '>' + esc(s) + '</text>';
  }
  function ul(x, y, s, cls, size, anchor) {
    return t(x, y, s, cls || 'w', size, anchor, ' text-decoration="underline"');
  }
  function ln(x1, y1, x2, y2, cls, w) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (cls || 'sg') + '" stroke-width="' + (w || 1.5) + '"/>';
  }
  function rc(x, y, w, h, cls, sw) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" class="' + (cls || 'sw') + '" fill="none" stroke-width="' + (sw || 1.2) + '"/>';
  }
  function fillRect(x, y, w, h, cls) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" class="' + cls + '"/>';
  }
  function circ(cx, cy, r, cls, sw) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="' + (cls || 'sg') + '" fill="none" stroke-width="' + (sw || 1.5) + '"/>';
  }
  function pt(cx, cy, r, a) {
    var rad = a * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
  }
  // Arc drawn clockwise on screen from angle a0 down to a1 (degrees, 0 = east).
  function arc(cx, cy, r, a0, a1, cls, w) {
    var p0 = pt(cx, cy, r, a0), p1 = pt(cx, cy, r, a1);
    var large = (a0 - a1) > 180 ? 1 : 0;
    return '<path d="M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' +
      p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + '" class="' + (cls || 'sw') + '" fill="none" stroke-width="' + (w || 1.5) + '"/>';
  }
  function valve(cx, cy, open, cls) {
    return circ(cx, cy, 7, cls, 1.5) +
      (open ? ln(cx, cy - 7, cx, cy + 7, cls, 1.8) : ln(cx - 7, cy, cx + 7, cy, cls, 1.8));
  }
  function svg(body) {
    return '<svg viewBox="0 0 320 320" class="ecam" role="img" preserveAspectRatio="xMidYMid meet">' +
      '<rect width="320" height="320" class="screen"/>' + body + '</svg>';
  }
  function fmt(n, d) { return (Math.round(n * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toFixed(d || 0); }
  function round10(n) { return Math.round(n / 10) * 10; }

  /* ------------------------------------------------------------------ E/WD */

  function gaugeN1(cx, cy, v, active) {
    var r = 30, o = '';
    o += arc(cx, cy, r, 210, -12, 'sw', 1.6);
    o += arc(cx, cy, r, -12, -30, 'sr', 2.6);
    for (var i = 0; i <= 10; i += 5) {
      var a = 210 - (i * 10 / 110) * 240, p = pt(cx, cy, r, a), q = pt(cx, cy, r - 5, a);
      o += ln(p[0], p[1], q[0], q[1], 'sw', 1.3);
    }
    var av = 210 - (Math.max(0, Math.min(110, v)) / 110) * 240, n = pt(cx, cy, r + 3, av);
    o += ln(cx, cy, n[0], n[1], active ? 'sg' : 'sa', 2.4);
    o += t(cx + 34, cy + 22, fmt(v, 1), active ? 'g' : 'a', 15, 'end');
    return o;
  }
  function gaugeEGT(cx, cy, v, active) {
    var r = 20, o = '';
    o += arc(cx, cy, r, 180, 15, 'sw', 1.4);
    o += arc(cx, cy, r, 15, 0, 'sr', 2.4);
    var av = 180 - (Math.max(0, Math.min(1100, v)) / 1100) * 180, n = pt(cx, cy, r + 2, av);
    o += ln(cx, cy, n[0], n[1], active ? 'sg' : 'sa', 2);
    o += t(cx, cy + 14, round10(v), active ? 'g' : 'a', 12, 'middle');
    return o;
  }

  // view: { lines:[{text|parts, cls, cur, hidden}], memo:[{t,c}], sts:bool, flaps, fob }
  function renderEWD(s, view) {
    var o = '', eng = s.eng, cx = [52, 168];
    for (var i = 0; i < 2; i++) {
      var e = eng[i], live = e.running;
      o += gaugeN1(cx[i], 46, e.n1, live || e.n1 > 2);
      o += gaugeEGT(cx[i], 112, e.egt, live || e.egt > 20);
      o += t(cx[i] + 12, 156, fmt(e.n2, 1), 'g', 12, 'end');
      o += t(cx[i] + 12, 174, round10(e.ff), 'g', 12, 'end');
    }
    o += t(110, 44, 'N1', 'w', 11, 'middle') + t(110, 56, '%', 'c', 9, 'middle');
    o += t(110, 108, 'EGT', 'w', 11, 'middle') + t(110, 120, '°C', 'c', 9, 'middle');
    o += t(110, 156, 'N2', 'w', 11, 'middle') + t(126, 156, '%', 'c', 9);
    o += t(110, 174, 'FF', 'w', 11, 'middle');
    o += t(110, 186, 'KG/H', 'c', 8, 'middle');
    if (s.ign) {
      o += t(52, 140, 'IGN', 'w', 9, 'middle') + t(168, 140, 'IGN', 'w', 9, 'middle');
    }
    // Right block: fuel on board and flaps
    o += t(226, 24, 'FOB :', 'w', 11) + t(312, 24, round10(s.fob), 'g', 13, 'end') + t(312, 36, 'KG', 'c', 9, 'end');
    o += t(270, 82, s.onGround ? 'F' : '', 'w', 10, 'middle');
    o += t(240, 96, 'S', 'w', 10, 'middle') + t(300, 96, 'F', 'w', 10, 'middle');
    o += t(270, 112, 'FLAP', 'w', 10, 'middle');
    o += fillRect(234, 70, 8, 4, 'fw') + fillRect(296, 70, 8, 4, 'fw');
    o += t(270, 136, s.phaseLabel || '', 'g', 9, 'middle');
    o += ln(224, 150, 316, 150, 'sd', 1);
    o += t(270, 166, s.onGround ? 'GND' : 'FL' + Math.round(s.alt / 100), 'g', 10, 'middle');

    // Lower message area
    o += ln(4, 190, 316, 190, 'sw', 1.2);
    o += ln(216, 196, 216, 316, 'sw', 1);
    var lines = view.lines || [], max = 9, start = 0;
    var curIdx = lines.findIndex(function (l) { return l.cur; });
    if (lines.length > max && curIdx > 5) start = Math.min(curIdx - 4, lines.length - max);
    var shown = lines.slice(start, start + max);
    shown.forEach(function (l, k) {
      var y = 205 + k * 12.4;
      if (l.cur && view.highlight) o += fillRect(3, y - 9.5, 211, 12, 'hl');
      if (l.parts) {
        o += '<text x="6" y="' + y + '" font-size="10.5">' + l.parts.map(function (p) {
          return '<tspan class="' + p.c + '"' + (p.u ? ' text-decoration="underline"' : '') + '>' + esc(p.s) + '</tspan>';
        }).join('') + '</text>';
      } else {
        o += t(6, y, l.text, l.cls, 10.5, null, ' xml:space="preserve"');
      }
    });
    if (start + max < lines.length) o += '<path d="M206 306 l5 8 l5 -8 z" class="fg"/>';
    if (start > 0) o += '<path d="M206 206 l5 -8 l5 8 z" class="fg"/>';
    (view.memo || []).forEach(function (m, k) { o += t(222, 205 + k * 12.4, m.t, m.c, 10.5); });
    if (view.sts) o += t(266, 314, 'STS', 'w', 10.5, 'middle') + rc(252, 304, 28, 13, 'sw', 1);
    if (view.adv) o += t(300, 314, 'ADV', 'w', 10.5, 'middle');
    return svg(o);
  }

  /* ------------------------------------------------------------- SD pages */

  function footer(s) {
    var o = ln(4, 292, 316, 292, 'sw', 1);
    var tat = s.onGround ? '+15' : '-24', sat = s.onGround ? '+15' : '-52';
    o += t(8, 304, 'TAT', 'w', 9) + t(56, 304, tat, 'g', 9, 'end') + t(60, 304, '°C', 'c', 9);
    o += t(8, 315, 'SAT', 'w', 9) + t(56, 315, sat, 'g', 9, 'end') + t(60, 315, '°C', 'c', 9);
    var d = new Date(), hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
    o += t(150, 311, hh, 'g', 12, 'end') + t(158, 311, 'H', 'c', 9, 'middle') + t(166, 311, mm, 'g', 12);
    o += t(232, 311, 'GW', 'w', 9) + t(300, 311, round10(s.gw), 'g', 12, 'end') + t(312, 311, 'KG', 'c', 8, 'end');
    return o;
  }

  function pageENG(s) {
    var o = ul(8, 18, 'ENG', 'w', 13);
    var X = [70, 250];
    var rows = [['F.USED', 'KG', 48], ['OIL QT', 'QT', 80], ['OIL PSI', '', 108], ['OIL °C', '', 136], ['VIB N1', '', 172], ['VIB N2', '', 190], ['NAC °C', '', 226]];
    rows.forEach(function (r) {
      o += t(160, r[2], r[0], 'w', 10, 'middle');
      if (r[1]) o += t(160, r[2] + 11, r[1], 'c', 8, 'middle');
    });
    o += ln(110, 92, 210, 92, 'sd', 0.8) + ln(110, 156, 210, 156, 'sd', 0.8);
    for (var i = 0; i < 2; i++) {
      var e = s.eng[i], x = X[i];
      o += t(x, 48, round10(e.fuelUsed), 'g', 13, 'middle');
      o += t(x, 80, fmt(e.oilQ, 1), 'g', 13, 'middle');
      var lowOil = e.oilP < 13;
      o += t(x, 108, Math.round(e.oilP), lowOil ? (e.running || e.oilFail ? 'r' : 'a') : 'g', 13, 'middle');
      if (lowOil && e.oilFail) o += rc(x - 16, 96, 32, 15, 'sr', 1.2);
      o += t(x, 136, Math.round(e.oilT), 'g', 13, 'middle');
      o += t(x, 172, fmt(e.vib1, 1), 'g', 12, 'middle');
      o += t(x, 190, fmt(e.vib2, 1), 'g', 12, 'middle');
      o += t(x, 226, Math.round(e.nacT), 'g', 12, 'middle');
      if (s.ign && e.n2 < 60) o += t(x, 252, 'IGN A B', 'w', 10, 'middle');
      if (!e.running) o += t(x, 272, e.master ? 'FLAMEOUT' : 'SHUTDOWN', 'a', 10, 'middle');
      if (e.firePb) o += t(x, 286, 'FIRE P/B OUT', 'r', 8, 'middle');
    }
    o += t(8, 32, '1', 'w', 10) + t(312, 32, '2', 'w', 10, 'end');
    return o + footer(s);
  }

  function pumpBox(x, y, st, label) {
    var cls = st === 'on' ? 'sg' : 'sa', o = rc(x - 13, y, 26, 22, cls, 1.4);
    if (st === 'on') o += ln(x, y + 3, x, y + 19, 'sg', 2);
    else if (st === 'lo') o += t(x, y + 15, 'LO', 'a', 10, 'middle');
    else o += ln(x - 8, y + 11, x + 8, y + 11, 'sa', 2);
    if (label) o += t(x, y + 34, label, 'w', 8, 'middle');
    return o;
  }

  function pageHYD(s) {
    var o = ul(8, 18, 'HYD', 'w', 13), h = s.hyd;
    var cols = [['GREEN', 'G', 62], ['BLUE', 'B', 160], ['YELLOW', 'Y', 258]];
    cols.forEach(function (c) {
      var sys = h[c[1]], ok = sys.p >= 1450, x = c[2];
      o += t(x, 40, c[0], ok ? 'w' : 'a', 12, 'middle');
      o += t(x, 58, round10(sys.p), ok ? 'g' : 'a', 13, 'middle');
      o += ln(x, 64, x, 182, ok ? 'sg' : 'sa', 2);
      // reservoir
      var lo = sys.rsvr === 'lo', lvl = Math.max(0, Math.min(1, sys.qty));
      o += ln(x - 8, 248, x - 8, 284, 'sw', 1.2) + ln(x - 8, 284, x + 8, 284, 'sw', 1.2) + ln(x + 8, 248, x + 8, 284, 'sw', 1.2);
      o += fillRect(x - 6, 284 - 34 * lvl, 12, 34 * lvl, lo ? 'fa' : 'fg');
      if (lo) o += t(x + 12, 270, 'LO', 'a', 9);
    });
    // pumps
    var gPump = h.G.pump === 'off' ? 'off' : (s.eng[0].running && !s.eng[0].firePb && h.G.rsvr !== 'lo' && !h.G.leak ? 'on' : 'lo');
    var yPump = h.Y.pump === 'off' ? 'off' : (s.eng[1].running && !s.eng[1].firePb && h.Y.rsvr !== 'lo' && !h.Y.leak ? 'on' : 'lo');
    var bPump = h.B.p >= 1450 && !s.elec.rat ? 'on' : (s.elec.ac[0] || s.elec.ac[1] ? 'on' : 'lo');
    o += pumpBox(62, 182, gPump, '1') + pumpBox(160, 182, bPump, 'ELEC') + pumpBox(258, 182, yPump, '2');
    // fire shut-off valves on G and Y
    o += valve(62, 228, !s.eng[0].firePb, s.eng[0].firePb ? 'sa' : 'sg');
    o += valve(258, 228, !s.eng[1].firePb, s.eng[1].firePb ? 'sa' : 'sg');
    // PTU
    var ptuCls = h.ptu === 'off' ? 'a' : 'g';
    o += ln(62, 104, 136, 104, 's' + ptuCls, 1.5) + ln(184, 104, 258, 104, 's' + ptuCls, 1.5);
    o += fillRect(138, 96, 44, 16, 'screen') + t(160, 108, 'PTU', ptuCls === 'a' ? 'a' : 'w', 10, 'middle');
    if (h.ptuActive) o += '<path d="M188 99 l10 5 l-10 5 z" class="fg"/><path d="M132 99 l-10 5 l10 5 z" class="fg"/>';
    // RAT on blue
    o += t(116, 146, 'RAT', 'w', 9, 'middle');
    o += s.elec.rat ? '<path d="M128 140 l14 0 l-7 8 z" class="fg"/>' + ln(142, 144, 160, 144, 'sg', 1.4) : '';
    // yellow electric pump
    o += t(296, 132, 'ELEC', 'w', 8, 'middle');
    o += rc(286, 138, 20, 16, h.Y.elec === 'on' ? 'sg' : 'sw', 1.2);
    o += h.Y.elec === 'on' ? ln(296, 140, 296, 152, 'sg', 1.6) + ln(258, 146, 286, 146, 'sg', 1.4) : '';
    o += t(8, 244, 'RSVR', 'w', 8) + t(8, 214, 'FIRE', 'w', 8) + t(8, 224, 'VALVE', 'w', 8);
    return o + footer(s);
  }

  function bar(x, y, w, label, on) {
    return rc(x, y, w, 16, on ? 'sg' : 'sa', 1.2) + t(x + w / 2, y + 12, label, on ? 'g' : 'a', 10, 'middle');
  }
  function genBox(x, y, label, st) {
    // st: {on, fault, load, sw}
    var o = rc(x, y, 72, 50, st.on ? 'sw' : 'sa', 1.2);
    o += t(x + 36, y + 13, label, st.on ? 'w' : 'a', 10, 'middle');
    if (st.on) {
      o += t(x + 50, y + 26, st.load, 'g', 10, 'end') + t(x + 54, y + 26, '%', 'c', 8);
      o += t(x + 50, y + 37, '115', 'g', 10, 'end') + t(x + 54, y + 37, 'V', 'c', 8);
      o += t(x + 50, y + 48, '400', 'g', 10, 'end') + t(x + 54, y + 48, 'HZ', 'c', 8);
    } else {
      o += t(x + 36, y + 32, st.sw === false ? 'OFF' : (st.fault ? 'FAULT' : 'OFF'), 'a', 10, 'middle');
    }
    return o;
  }

  function pageELEC(s) {
    var o = ul(8, 18, 'ELEC', 'w', 13), e = s.elec;
    // batteries and DC
    o += rc(18, 26, 62, 30, 'sw') + t(49, 38, 'BAT 1', 'w', 9, 'middle') + t(49, 51, '28 V', 'g', 9, 'middle');
    o += rc(240, 26, 62, 30, 'sw') + t(271, 38, 'BAT 2', 'w', 9, 'middle') + t(271, 51, '28 V', 'g', 9, 'middle');
    o += bar(126, 32, 68, 'DC BAT', true);
    o += bar(10, 72, 76, 'DC 1', e.dc[0]);
    o += bar(122, 72, 76, 'DC ESS', e.dcEss);
    o += bar(234, 72, 76, 'DC 2', e.dc[1]);
    o += rc(22, 100, 52, 24, e.ac[0] ? 'sw' : 'sa') + t(48, 116, 'TR 1', e.ac[0] ? 'w' : 'a', 9, 'middle');
    o += rc(134, 100, 52, 24, e.acEss ? 'sw' : 'sa') + t(160, 116, 'ESS TR', e.acEss ? 'w' : 'a', 9, 'middle');
    o += rc(246, 100, 52, 24, e.ac[1] ? 'sw' : 'sa') + t(272, 116, 'TR 2', e.ac[1] ? 'w' : 'a', 9, 'middle');
    o += bar(10, 140, 76, 'AC 1', e.ac[0]);
    o += bar(122, 140, 76, 'AC ESS', e.acEss);
    o += bar(234, 140, 76, 'AC 2', e.ac[1]);
    if (e.acEssFeed === 'altn') o += t(160, 170, 'ALTN FEED', 'g', 8, 'middle');
    // generators
    o += genBox(12, 196, 'GEN 1', e.genView[0]);
    o += genBox(236, 196, 'GEN 2', e.genView[1]);
    if (e.apu) o += genBox(124, 196, 'APU GEN', { on: e.apuGen, sw: true, fault: false, load: 38 });
    else o += rc(124, 196, 72, 50, 'sw', 1.2) + t(160, 209, 'APU GEN', 'w', 10, 'middle') + t(160, 232, 'APU OFF', 'w', 9, 'middle');
    // connection lines
    if (e.genView[0].on) o += ln(48, 196, 48, 156, 'sg', 1.5);
    if (e.genView[1].on) o += ln(272, 196, 272, 156, 'sg', 1.5);
    if (e.tie) o += ln(86, 182, 234, 182, 'sg', 1.5) + ln(48, 182, 86, 182, 'sg', 1.5) + ln(234, 182, 272, 182, 'sg', 1.5);
    // IDG and emergency generator
    for (var i = 0; i < 2; i++) {
      var x = i ? 272 : 48, disc = e.idg[i] === 'disc', oil = i === 0 && e.idgOil && !disc;
      o += t(x - 14, 266, 'IDG ' + (i + 1), oil || disc ? 'a' : 'w', 9, 'middle');
      o += t(x + 22, 266, oil ? 'LO PR' : (disc ? 'DISC' : '76'), oil || disc ? 'a' : 'g', 9, 'middle');
    }
    if (e.rat) {
      o += rc(126, 254, 68, 30, 'sw') + t(160, 266, 'EMER GEN', 'w', 9, 'middle') + t(160, 279, '115 V 400 HZ', 'g', 8, 'middle');
    }
    return o + footer(s);
  }

  function pageBLEED(s) {
    var o = ul(8, 18, 'BLEED', 'w', 13), b = s.bleed;
    for (var i = 0; i < 2; i++) {
      var x = i ? 240 : 80, pk = b.pack[i], flow = b.packFlow[i];
      var ovht = pk === 'ovht';
      o += rc(x - 42, 28, 84, 78, pk === 'on' || flow ? 'sw' : 'sa');
      o += t(x, 42, 'PACK ' + (i + 1), pk === 'on' ? 'w' : 'a', 10, 'middle');
      o += t(x - 32, 60, 'OUT', 'w', 8) + t(x + 34, 60, Math.round(b.outT[i]), b.outT[i] > 95 ? 'a' : 'g', 11, 'end');
      o += t(x - 32, 78, 'COMP', 'w', 8) + t(x + 34, 78, Math.round(b.compT[i]), b.compT[i] > 230 ? 'a' : 'g', 11, 'end');
      o += t(x - 32, 96, 'FLOW', 'w', 8) + t(x + 34, 96, flow ? 'NORM' : '---', flow ? 'g' : 'a', 9, 'end');
      if (ovht) o += t(x, 120, 'OVHT', 'a', 10, 'middle');
      o += valve(x, 140, flow, flow ? 'sg' : 'sa');
      o += ln(x, 147, x, 172, flow ? 'sg' : 'sd', 1.5);
      var eb = b.engBleed[i];
      o += valve(x, 212, eb, eb ? 'sg' : 'sa');
      o += ln(x, 172, x, 205, eb ? 'sg' : 'sd', 1.5);
      o += t(x, 240, eb ? '44' : '0', eb ? 'g' : 'a', 11, 'middle') + t(x + 16, 240, 'PSI', 'c', 8);
      o += t(x, 254, eb ? '190' : '---', eb ? 'g' : 'a', 11, 'middle') + t(x + 16, 254, '°C', 'c', 8);
      o += t(x, 278, String(i + 1), 'w', 13, 'middle');
    }
    o += ln(80, 172, 240, 172, 'sg', 1.5);
    o += fillRect(150, 162, 20, 20, 'screen') + valve(160, 172, false, 'sg');
    o += t(160, 194, 'X BLEED', 'w', 8, 'middle');
    o += valve(160, 230, false, 'sg') + t(160, 256, 'APU', 'w', 10, 'middle');
    o += ln(160, 179, 160, 223, 'sd', 1);
    return o + footer(s);
  }

  function gaugeArc(cx, cy, r, frac, cls, label, value, unit, valCls) {
    var o = arc(cx, cy, r, 200, -20, 'sw', 1.4);
    var a = 200 - Math.max(0, Math.min(1, frac)) * 220, p = pt(cx, cy, r + 3, a);
    o += ln(cx, cy, p[0], p[1], cls, 2.2);
    o += t(cx, cy - r - 8, label, 'w', 10, 'middle');
    o += t(cx, cy + 22, value, valCls || 'g', 13, 'middle');
    o += t(cx, cy + 34, unit, 'c', 8, 'middle');
    return o;
  }

  function pagePRESS(s) {
    var o = ul(8, 18, 'CAB PRESS', 'w', 13), p = s.press;
    o += t(312, 18, 'LDG ELEV', 'w', 9, 'end') + t(312, 30, (p.mode === 'man' ? 'MAN ' : 'AUTO ') + '500 FT', 'g', 9, 'end');
    o += gaugeArc(56, 96, 32, p.dp / 9, 'sg', 'ΔP', fmt(p.dp, 1), 'PSI');
    var vsCls = Math.abs(p.vs) > 1800 ? 'a' : 'g';
    o += gaugeArc(160, 96, 32, (p.vs + 2000) / 4000, 's' + vsCls, 'V/S', Math.round(p.vs / 50) * 50, 'FT/MIN', vsCls);
    var caCls = p.cabAlt >= 9550 ? 'r' : 'g';
    o += gaugeArc(264, 96, 32, p.cabAlt / 16000, 's' + caCls, 'CAB ALT', Math.round(p.cabAlt / 50) * 50, 'FT', caCls);
    // controllers
    for (var i = 0; i < 2; i++) {
      var f = p.sys[i] === 'fault', active = !f && p.active === i && p.mode !== 'man';
      o += t(i ? 230 : 40, 172, 'SYS ' + (i + 1), f ? 'a' : (active ? 'g' : 'w'), 11, 'middle');
      if (f) o += t(i ? 230 : 40, 186, 'FAULT', 'a', 9, 'middle');
    }
    if (p.mode === 'man') o += t(135, 172, 'MAN', 'g', 11, 'middle') + rc(116, 160, 38, 16, 'sg', 1);
    // outflow valve
    var cx = 160, cy = 250, r = 26, frac = p.ofv / 100;
    o += arc(cx, cy, r, 180, 90, 'sw', 1.4);
    var a = 180 - frac * 90, q = pt(cx, cy, r + 2, a);
    o += ln(cx, cy, q[0], q[1], frac > 0.95 ? 'sa' : 'sg', 2.2);
    o += t(cx + 34, cy - 4, 'OUTFLOW', 'w', 8) + t(cx + 34, cy + 8, Math.round(p.ofv) + ' %', 'g', 9);
    o += t(40, 240, 'SAFETY', 'w', 9, 'middle') + t(40, 254, 'CLOSED', 'g', 9, 'middle');
    o += t(222, 276, 'PACK 1', s.bleed.packFlow[0] ? 'w' : 'a', 9, 'middle') + t(288, 276, 'PACK 2', s.bleed.packFlow[1] ? 'w' : 'a', 9, 'middle');
    return o + footer(s);
  }

  function pageFCTL(s) {
    var o = ul(8, 18, 'F/CTL', 'w', 13), h = s.hyd;
    var ok = { G: h.G.p >= 1450, B: h.B.p >= 1450, Y: h.Y.p >= 1450 };
    var spl = { 1: 'G', 2: 'Y', 3: 'B', 4: 'Y', 5: 'G' };
    o += t(160, 40, 'SPD BRK', 'w', 9, 'middle');
    for (var k = 1; k <= 5; k++) {
      var c = ok[spl[k]] ? 'g' : 'a';
      var xl = 130 - k * 20, xr = 190 + k * 20;
      [xl, xr].forEach(function (x) {
        o += t(x, 52, String(k), c, 9, 'middle');
        o += s.spdBrk && c === 'g' ? '<path d="M' + (x - 5) + ' 40 l5 -8 l5 8 z" class="fg"/>' : ln(x - 6, 38, x + 6, 38, 's' + c, 2);
      });
    }
    function letters(x, y, list) {
      var out = '';
      list.forEach(function (L, idx) { out += t(x + idx * 12, y, L, ok[L] ? 'g' : 'a', 10, 'middle'); });
      return out;
    }
    o += t(40, 90, 'L AIL', 'w', 10, 'middle') + letters(28, 104, ['G', 'B']);
    o += t(280, 90, 'R AIL', 'w', 10, 'middle') + letters(268, 104, ['G', 'B']);
    o += t(40, 210, 'L ELEV', 'w', 10, 'middle') + letters(28, 224, ['B', 'G']);
    o += t(280, 210, 'R ELEV', 'w', 10, 'middle') + letters(268, 224, ['Y', 'B']);
    var ths = ok.G || ok.Y;
    o += t(160, 176, 'PITCH TRIM', 'w', 10, 'middle') + t(160, 190, ths ? '0.6° UP' : 'XX', ths ? 'g' : 'a', 10, 'middle') + letters(148, 204, ['G', 'Y']);
    o += t(160, 250, 'RUD', 'w', 10, 'middle') + letters(148, 264, ['G', 'B', 'Y']);
    // computers
    o += rc(78, 112, 76, 40, 'sw') + t(116, 126, 'ELAC', 'w', 10, 'middle');
    s.fctl.elac.forEach(function (st, idx) { o += t(102 + idx * 28, 145, String(idx + 1), st === 'ok' ? 'g' : 'a', 11, 'middle'); });
    o += rc(166, 112, 76, 40, 'sw') + t(204, 126, 'SEC', 'w', 10, 'middle');
    s.fctl.sec.forEach(function (st, idx) { o += t(184 + idx * 20, 145, String(idx + 1), st === 'ok' ? 'g' : 'a', 11, 'middle'); });
    o += t(312, 18, s.fctl.law + ' LAW', s.fctl.law === 'NORMAL' ? 'g' : 'a', 9, 'end');
    return o + footer(s);
  }

  function pageCOND(s) {
    var o = ul(8, 18, 'COND', 'w', 13), c = s.cargo;
    o += t(312, 18, 'TEMP : °C', 'w', 9, 'end');
    // cabin outline
    o += '<path d="M24 120 Q30 70 70 70 L292 70 L300 120 Z" class="sw" fill="none" stroke-width="1.2"/>';
    o += ln(110, 70, 110, 120, 'sw', 1) + ln(206, 70, 206, 120, 'sw', 1);
    o += t(64, 92, 'CKPT', 'w', 10, 'middle') + t(64, 110, '22', 'g', 12, 'middle');
    o += t(158, 92, 'FWD', 'w', 10, 'middle') + t(158, 110, '23', 'g', 12, 'middle');
    o += t(252, 92, 'AFT', 'w', 10, 'middle') + t(252, 110, '24', 'g', 12, 'middle');
    o += t(160, 150, 'HOT AIR', 'w', 9, 'middle') + valve(160, 166, true, 'sg');
    // forward cargo
    o += rc(70, 200, 180, 56, c.fwdSmoke && c.agent !== 'disch' ? 'sr' : 'sw', 1.2);
    o += t(160, 216, 'FWD CRG', 'w', 10, 'middle') + t(160, 232, '18', 'g', 12, 'middle');
    if (c.fwdSmoke) o += t(160, 250, c.agent === 'disch' ? 'AGENT DISCH' : 'SMOKE', c.agent === 'disch' ? 'w' : 'r', 10, 'middle');
    var open = c.isol !== 'off';
    o += valve(46, 228, open, open ? 'sg' : 'sa') + t(46, 252, 'INLET', 'w', 8, 'middle');
    o += valve(274, 228, open, open ? 'sg' : 'sa') + t(274, 252, 'OUTLET', 'w', 8, 'middle');
    o += ln(53, 228, 70, 228, open ? 'sg' : 'sa', 1.4) + ln(250, 228, 267, 228, open ? 'sg' : 'sa', 1.4);
    return o + footer(s);
  }

  function pageFUEL(s) {
    var o = ul(8, 18, 'FUEL', 'w', 13), f = s.fuel;
    o += t(160, 30, 'F.USED', 'w', 10, 'middle') + t(160, 42, '1+2', 'w', 9, 'middle');
    o += t(160, 56, round10(s.eng[0].fuelUsed + s.eng[1].fuelUsed), 'g', 12, 'middle') + t(196, 56, 'KG', 'c', 8);
    for (var i = 0; i < 2; i++) {
      var x = i ? 232 : 88, lp = !s.eng[i].firePb && s.eng[i].master;
      o += t(x, 34, String(i + 1), 'w', 13, 'middle') + valve(x, 58, lp, lp ? 'sg' : 'sa');
      o += ln(x, 65, x, 120, lp ? 'sg' : 'sa', 1.4);
    }
    o += t(64, 74, 'LP VALVE', 'w', 8, 'middle');
    var tank = function (x, w, label, v) { return rc(x, 120, w, 70, 'sw') + t(x + w / 2, 160, round10(v), 'g', 12, 'middle') + t(x + w / 2, 206, label, 'w', 8, 'middle'); };
    o += tank(8, 46, 'L OUTER', f.lo) + tank(54, 66, 'L INNER', f.li) + tank(120, 80, 'CTR', f.ctr) + tank(200, 66, 'R INNER', f.ri) + tank(266, 46, 'R OUTER', f.ro);
    o += t(160, 240, 'FOB :', 'w', 11, 'end') + t(220, 240, round10(s.fob), 'g', 13, 'end') + t(226, 240, 'KG', 'c', 8);
    o += t(160, 268, 'X FEED', 'w', 9, 'middle');
    return o + footer(s);
  }

  function pageSTATUS(s, sts) {
    var o = ul(160, 18, 'STATUS', 'w', 13, 'middle');
    if (!sts || (!sts.left.length && !sts.inop.length)) {
      o += t(160, 120, 'NORMAL', 'g', 13, 'middle');
      return o + footer(s);
    }
    sts.left.forEach(function (l, i) { o += t(8, 44 + i * 14, l[0], l[1], 10, null, ' xml:space="preserve"'); });
    o += ln(178, 30, 178, 286, 'sd', 1);
    if (sts.inop.length) {
      o += ul(188, 44, 'INOP SYS', 'w', 10);
      sts.inop.forEach(function (l, i) { o += t(188, 60 + i * 14, l, 'a', 10); });
    }
    return o + footer(s);
  }

  function pageCRUISE(s) {
    var o = ul(8, 18, 'ENG', 'w', 13);
    o += t(160, 34, 'F.USED', 'w', 10, 'middle') + t(160, 46, 'KG', 'c', 8, 'middle');
    o += t(96, 40, round10(s.eng[0].fuelUsed), 'g', 12, 'middle') + t(224, 40, round10(s.eng[1].fuelUsed), 'g', 12, 'middle');
    o += t(160, 66, 'OIL', 'w', 10, 'middle') + t(160, 78, 'QT', 'c', 8, 'middle');
    o += t(96, 72, fmt(s.eng[0].oilQ, 1), 'g', 12, 'middle') + t(224, 72, fmt(s.eng[1].oilQ, 1), 'g', 12, 'middle');
    o += t(160, 98, 'VIB N1', 'w', 10, 'middle') + t(160, 112, 'N2', 'w', 10, 'middle');
    o += t(96, 98, fmt(s.eng[0].vib1, 1), 'g', 11, 'middle') + t(224, 98, fmt(s.eng[1].vib1, 1), 'g', 11, 'middle');
    o += t(96, 112, fmt(s.eng[0].vib2, 1), 'g', 11, 'middle') + t(224, 112, fmt(s.eng[1].vib2, 1), 'g', 11, 'middle');
    o += ln(4, 126, 316, 126, 'sd', 0.8);
    o += ul(8, 146, 'AIR', 'w', 13);
    o += t(312, 146, 'LDG ELEV AUTO 500 FT', 'g', 9, 'end');
    var p = s.press;
    o += t(140, 172, 'ΔP', 'w', 10, 'end') + t(200, 172, fmt(p.dp, 1), 'g', 12, 'end') + t(206, 172, 'PSI', 'c', 8);
    o += t(140, 194, 'CAB V/S', 'w', 10, 'end') + t(200, 194, Math.round(p.vs / 50) * 50, 'g', 12, 'end') + t(206, 194, 'FT/MIN', 'c', 8);
    o += t(140, 216, 'CAB ALT', 'w', 10, 'end') + t(200, 216, Math.round(p.cabAlt / 50) * 50, p.cabAlt >= 9550 ? 'r' : 'g', 12, 'end') + t(206, 216, 'FT', 'c', 8);
    o += '<path d="M40 250 Q46 236 70 236 L292 236 L298 266 L40 266 Z" class="sw" fill="none" stroke-width="1"/>';
    o += t(78, 258, 'CKPT 22', 'g', 9, 'middle') + t(170, 258, 'FWD 23', 'g', 9, 'middle') + t(256, 258, 'AFT 24', 'g', 9, 'middle');
    return o + footer(s);
  }

  var PAGES = { ENG: pageENG, HYD: pageHYD, ELEC: pageELEC, BLEED: pageBLEED, PRESS: pagePRESS, FCTL: pageFCTL, COND: pageCOND, FUEL: pageFUEL, CRUISE: pageCRUISE };

  function renderSD(s, page, sts) {
    if (page === 'STATUS') return svg(pageSTATUS(s, sts));
    return svg((PAGES[page] || pageCRUISE)(s));
  }

  window.ECAM_DISPLAYS = { renderEWD: renderEWD, renderSD: renderSD, esc: esc };
})();
