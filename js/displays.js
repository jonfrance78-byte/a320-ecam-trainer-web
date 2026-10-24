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
      if (l.box != null) {
        // box around the title from character l.box (monospace, 6.6 units per character at 10.5)
        var len = l.parts.reduce(function (n, p) { return n + p.s.length; }, 0);
        o += rc(6 + l.box * 6.6 - 1.5, y - 9.2, (len - l.box) * 6.6 + 3, 12, 's' + l.parts[1].c, 1);
      }
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
  // Laid out from the owner's screenshots of the A320neo system display pages.

  function valveH(cx, cy, open, cls) {
    return circ(cx, cy, 7, cls, 1.5) + (open ? ln(cx - 7, cy, cx + 7, cy, cls, 1.8) : ln(cx, cy - 7, cx, cy + 7, cls, 1.8));
  }
  // Outline triangle: dir 'u' up, 'l' left, 'r' right.
  function tri(x, y, dir, cls) {
    var d = dir === 'u' ? 'M' + x + ' ' + (y - 5) + ' l-4 7 h8 z' : dir === 'l' ? 'M' + (x - 5) + ' ' + y + ' l7 -4 v8 z' : 'M' + (x + 5) + ' ' + y + ' l-7 -4 v8 z';
    return '<path d="' + d + '" class="' + (cls || 'sw') + '" fill="none" stroke-width="1.2"/>';
  }
  // Round gauge: arc from angle a0 down to a1, needle at frac (0..1) of the way.
  function dial(cx, cy, r, a0, a1, frac, needle, redHi) {
    var o = arc(cx, cy, r, a0, a1, 'sw', 1.4);
    if (redHi) o += arc(cx, cy, r, a1 + (a0 - a1) * 0.1, a1, 'sr', 2.4);
    var a = a0 - (a0 - a1) * Math.max(0, Math.min(1, frac)), p0 = pt(cx, cy, r * 0.35, a), p1 = pt(cx, cy, r + 3, a);
    if (needle) o += ln(p0[0], p0[1], p1[0], p1[1], needle, 2.2);
    return o;
  }
  function dash(x1, y, x2) { return ln(x1, y, x2, y, 'sw', 1); }

  function footer(s) {
    var o = ln(4, 287, 316, 287, 'sw', 1.2) + ln(106, 287, 106, 318, 'sw', 1.2) + ln(212, 287, 212, 318, 'sw', 1.2);
    var tat = s.onGround ? '+15' : '-27', sat = s.onGround ? '+15' : '-55';
    o += t(12, 301, 'TAT', 'w', 9) + t(66, 301, tat, 'g', 10, 'end') + t(70, 301, '°C', 'c', 9);
    o += t(12, 314, 'SAT', 'w', 9) + t(66, 314, sat, 'g', 10, 'end') + t(70, 314, '°C', 'c', 9);
    var d = new Date(), hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
    o += t(152, 308, hh, 'g', 11, 'end') + t(159, 308, 'H', 'c', 9, 'middle') + t(166, 308, mm, 'g', 11);
    o += t(220, 301, 'GW', 'w', 9) + t(294, 301, round10(s.gw), 'g', 11, 'end') + t(298, 301, 'KG', 'c', 8);
    return o;
  }

  function pageCRUISE(s) {
    var o = ul(160, 18, 'CRUISE', 'w', 13, 'middle') + ul(10, 40, 'ENG', 'w', 11), p = s.press, e = s.eng;
    o += t(160, 38, 'F.USED', 'w', 10, 'middle') + t(160, 49, '1+2', 'w', 9, 'middle') + t(160, 61, round10(e[0].fuelUsed + e[1].fuelUsed), 'g', 11, 'middle') + t(160, 71, 'KG', 'c', 8, 'middle');
    o += t(98, 50, round10(e[0].fuelUsed), 'g', 12, 'middle') + t(222, 50, round10(e[1].fuelUsed), 'g', 12, 'middle') + dash(116, 46, 128) + dash(192, 46, 204);
    o += t(160, 92, 'OIL', 'w', 10, 'middle') + t(160, 102, 'QT', 'c', 8, 'middle');
    o += t(98, 98, fmt(e[0].oilQ, 1), 'g', 12, 'middle') + t(222, 98, fmt(e[1].oilQ, 1), 'g', 12, 'middle') + dash(116, 94, 132) + dash(188, 94, 204);
    o += t(160, 124, 'VIB N1', 'w', 10, 'middle') + t(160, 138, 'N2', 'w', 10, 'middle');
    o += t(98, 124, fmt(e[0].vib1, 1), 'g', 11, 'middle') + t(222, 124, fmt(e[1].vib1, 1), 'g', 11, 'middle');
    o += t(98, 138, fmt(e[0].vib2, 1), 'g', 11, 'middle') + t(222, 138, fmt(e[1].vib2, 1), 'g', 11, 'middle');
    o += dash(116, 120, 128) + dash(192, 120, 204) + dash(116, 134, 136) + dash(184, 134, 204);
    o += ul(10, 172, 'AIR', 'w', 11);
    o += t(150, 172, 'LDG ELEV', 'w', 10) + t(226, 172, p.mode === 'man' ? 'MAN' : 'AUTO', 'g', 10) + t(288, 172, '0', 'g', 10, 'end') + t(292, 172, 'FT', 'c', 8);
    o += t(128, 192, 'ΔP', 'w', 10, 'end') + t(176, 192, fmt(p.dp, 1), 'g', 11, 'end') + t(180, 192, 'PSI', 'c', 8);
    o += t(262, 192, 'CAB V/S', 'w', 10, 'middle') + t(264, 206, Math.round(p.vs / 10) * 10, 'g', 11, 'end') + t(268, 206, 'FT/MIN', 'c', 8);
    o += t(262, 230, 'CAB ALT', 'w', 10, 'middle') + t(264, 244, Math.round(p.cabAlt / 10) * 10, p.cabAlt >= 9550 ? 'r' : 'g', 11, 'end') + t(268, 244, 'FT', 'c', 8);
    o += '<path d="M24 256 Q26 238 46 236 L196 236 L196 266 L40 266 Q26 266 24 256 Z" class="sw" fill="none" stroke-width="1.2"/>' + ln(86, 236, 86, 266, 'sw', 1) + ln(140, 236, 140, 266, 'sw', 1);
    o += t(58, 248, 'CKPT', 'w', 9, 'middle') + t(58, 261, '22', 'g', 11, 'middle') + t(113, 248, 'FWD', 'w', 9, 'middle') + t(113, 261, '23', 'g', 11, 'middle') + t(168, 248, 'AFT', 'w', 9, 'middle') + t(168, 261, '24', 'g', 11, 'middle') + t(206, 261, '°C', 'c', 9);
    return o + footer(s);
  }

  function pageENG(s) {
    var o = ul(10, 22, 'ENGINE', 'w', 12);
    o += t(160, 30, 'F.USED', 'w', 10, 'middle') + t(160, 41, 'KG', 'c', 8, 'middle') + dash(118, 28, 132) + dash(188, 28, 202);
    o += t(160, 66, 'OIL', 'w', 10, 'middle') + t(160, 80, 'QT', 'c', 8, 'middle') + t(160, 120, 'PSI', 'c', 8, 'middle') + t(160, 162, '°C', 'c', 8, 'middle');
    o += t(160, 200, 'VIB N1', 'w', 10, 'middle') + t(160, 214, 'N2', 'w', 10, 'middle');
    for (var i = 0; i < 2; i++) {
      var e = s.eng[i], x = i ? 222 : 98, lowOil = e.oilP < 13;
      o += t(x + (i ? -8 : 8), 34, round10(e.fuelUsed), 'g', 12, 'middle');
      o += dial(x, 92, 22, 200, -20, e.oilQ / 25, 'sg') + t(x, 98, fmt(e.oilQ, 1), 'g', 11, 'middle');
      o += dial(x, 134, 22, 200, -20, e.oilP / 100, lowOil ? 'sr' : 'sg') + arc(x, 134, 22, 200, 186, 'sr', 2.4) + t(x, 140, Math.round(e.oilP), lowOil ? 'r' : 'g', 11, 'middle');
      o += t(x + (i ? -10 : 10), 166, Math.round(e.oilT), 'g', 11, 'middle') + dash(i ? 186 : 118, 162, i ? 202 : 134);
      o += t(x, 200, fmt(e.vib1, 1), 'g', 11, 'middle') + t(x, 214, fmt(e.vib2, 1), 'g', 11, 'middle');
      o += dash(i ? 188 : 118, 196, i ? 202 : 132) + dash(i ? 186 : 118, 210, i ? 202 : 134);
      if (s.ign && e.n2 < 60) o += t(x, 244, 'IGN A B', 'w', 10, 'middle');
      if (!e.running) o += t(x, 262, e.master ? 'FLAMEOUT' : 'SHUTDOWN', 'a', 10, 'middle');
      if (e.firePb) o += t(x, 276, 'FIRE P/B OUT', 'r', 8, 'middle');
    }
    return o + footer(s);
  }

  function pageBLEED(s) {
    var o = ul(8, 46, 'BLEED', 'w', 12), b = s.bleed;
    o += ln(82, 28, 238, 28, 'sg', 1.5) + tri(110, 26, 'u', 'sg') + tri(160, 26, 'u', 'sg') + tri(210, 26, 'u', 'sg');
    for (var i = 0; i < 2; i++) {
      var x = i ? 238 : 82, flow = b.packFlow[i], eb = b.engBleed[i], c = flow ? 'sg' : 'sa';
      o += ln(x, 28, x, 38, 'sg', 1.5);
      o += '<path d="M' + (x - 30) + ' 44 L' + (x - 24) + ' 38 L' + (x + 24) + ' 38 L' + (x + 30) + ' 44 L' + (x + 30) + ' 116 L' + (x - 30) + ' 116 Z" class="sw" fill="none" stroke-width="1.2"/>';
      o += t(x + 4, 52, Math.round(b.outT[i]), b.outT[i] > 95 ? 'a' : 'g', 10, 'end') + t(x + 8, 52, '°C', 'c', 8);
      o += dial(x, 78, 16, 160, 20, 0.35, 'sg') + t(x - 26, 72, 'C', 'w', 8, 'middle') + t(x + 26, 72, 'H', 'w', 8, 'middle');
      o += t(x + 4, 92, Math.round(b.compT[i]), b.compT[i] > 230 ? 'a' : 'g', 10, 'end') + t(x + 8, 92, '°C', 'c', 8);
      o += dial(x, 120, 16, 160, 20, flow ? 0.5 : 0, flow ? 'sg' : 'sa') + t(x - 26, 116, 'LO', 'w', 8, 'middle') + t(x + 28, 116, 'HI', 'w', 8, 'middle');
      o += ln(x, 120, x, 140, c, 1.5) + valve(x, 147, flow, c) + ln(x, 154, x, 186, eb ? 'sg' : 'sa', 1.5);
      o += rc(x - 16, 186, 32, 30, 'sw', 1.2) + t(x, 199, eb ? '46' : '0', eb ? 'g' : 'a', 11, 'middle') + t(x, 212, eb ? '190' : 'XX', eb ? 'g' : 'a', 11, 'middle');
      o += t(i ? x - 20 : x + 20, 199, 'PSI', 'c', 8, i ? 'end' : 'start') + t(i ? x - 20 : x + 20, 212, '°C', 'c', 8, i ? 'end' : 'start');
      o += ln(x, 216, x, 240, eb ? 'sg' : 'sa', 1.5) + valve(x, 247, eb, eb ? 'sg' : 'sa') + ln(x, 254, x, 270, 'sg', 1.5) + t(x, 280, 'IP', 'w', 8, 'middle');
      var hx = i ? x - 30 : x + 30, d = i ? -1 : 1;
      o += valveH(hx, 262, false, 'sg') + ln(hx + 7 * d, 262, hx + 16 * d, 262, 'sg', 1.5) + ln(hx + 16 * d, 262, hx + 16 * d, 270, 'sg', 1.5) + t(hx + 16 * d, 280, 'HP', 'w', 8, 'middle');
      o += t(i ? x + 32 : x - 32, 254, String(i + 1), 'w', 13, 'middle');
    }
    o += valve(160, 66, false, 'sg') + t(160, 92, 'RAM', 'w', 9, 'middle') + t(160, 102, 'AIR', 'w', 9, 'middle');
    o += valveH(160, 168, false, 'sg');
    o += valve(160, 208, false, 'sg') + t(160, 232, 'APU', 'w', 10, 'middle');
    return o + footer(s);
  }

  function pagePRESS(s) {
    var o = ul(10, 30, 'CAB PRESS', 'w', 12), p = s.press;
    o += t(124, 24, 'LDG ELEV', 'w', 9) + t(206, 24, p.mode === 'man' ? 'MAN' : 'AUTO', 'g', 9) + t(296, 14, '0', 'g', 10, 'end') + t(300, 14, 'FT', 'c', 8);
    o += t(62, 54, 'ΔP', 'w', 10, 'middle') + t(62, 64, 'PSI', 'c', 8, 'middle') + dial(58, 100, 24, 225, 0, (p.dp + 1) / 10, 'sg', true) + t(40, 118, '0', 'w', 8) + t(86, 122, fmt(p.dp, 1), 'g', 11, 'end');
    var vsCls = Math.abs(p.vs) > 1800 ? 'a' : 'g';
    o += t(160, 54, 'V/S', 'w', 10, 'middle') + t(160, 64, 'FT/MIN', 'c', 8, 'middle') + dial(150, 100, 24, 270, 90, 0.5 - p.vs / 4000, 's' + vsCls);
    o += t(160, 82, '2', 'w', 8, 'middle') + t(160, 124, '2', 'w', 8, 'middle') + t(134, 103, '0', 'w', 8, 'middle') + t(200, 104, Math.round(p.vs / 10) * 10, vsCls, 11, 'end');
    var caCls = p.cabAlt >= 9550 ? 'r' : 'g';
    o += t(258, 54, 'CAB ALT', 'w', 10, 'middle') + t(258, 64, 'FT', 'c', 8, 'middle') + dial(250, 100, 24, 225, 0, (p.cabAlt + 625) / 12500, 's' + caCls, true) + t(232, 118, '0', 'w', 8) + t(268, 92, '10', 'w', 8);
    o += t(306, 124, Math.round(p.cabAlt / 10) * 10, caCls, 11, 'end');
    o += '<path d="M30 168 L272 156 L272 200 L262 200 L262 238 L196 238 L196 252 L30 252 Z" class="sw" fill="none" stroke-width="1.2"/>';
    for (var i = 0; i < 2; i++) {
      var f = p.sys[i] === 'fault', active = !f && p.active === i && p.mode !== 'man';
      if (active || f) o += t(i ? 196 : 110, 192, 'SYS ' + (i + 1), f ? 'a' : 'g', 10, 'middle');
    }
    if (p.mode === 'man') o += t(110, 206, 'MAN', 'g', 10, 'middle');
    o += t(262, 150, 'SAFETY', 'w', 9, 'middle') + ln(268, 156, 268, 168, 'sg', 1.5) + circ(268, 170, 2, 'sw', 1);
    o += t(126, 228, 'VENT', 'w', 9, 'middle') + t(88, 268, 'INLET', 'w', 8, 'middle') + t(148, 262, 'OUTLET', 'w', 8, 'middle');
    o += ln(80, 252, 96, 252, 'sg', 1.5) + circ(80, 252, 2, 'sw', 1) + ln(140, 252, 156, 252, 'sg', 1.5) + circ(140, 252, 2, 'sw', 1);
    var q = pt(230, 238, 20, 180 - (p.ofv / 100) * 90);
    o += ln(212, 238, 230, 238, 'sw', 1) + ln(230, 238, q[0], q[1], p.ofv > 95 ? 'sa' : 'sg', 2) + circ(230, 238, 2, 'sw', 1);
    o += t(64, 280, 'PACK 1', s.bleed.packFlow[0] ? 'g' : 'a', 9, 'middle') + t(262, 262, 'PACK 2', s.bleed.packFlow[1] ? 'g' : 'a', 9, 'middle');
    return o + footer(s);
  }

  function bar(x, y, w, label, on) {
    return fillRect(x, y, w, 15, 'fb') + t(x + w / 2, y + 12, label, on ? 'g' : 'a', 11, 'middle');
  }
  function unitBox(x, y, label, rows, on) {
    var o = rc(x, y, 46, 12 + rows.length * 12, on ? 'sw' : 'sa', 1.2) + t(x + 23, y + 11, label, on ? 'w' : 'a', 9, 'middle');
    rows.forEach(function (r, i) { o += t(x + 30, y + 23 + i * 12, on ? r[0] : 'XX', on ? 'g' : 'a', 10, 'end') + t(x + 33, y + 23 + i * 12, r[1], 'c', 8); });
    return o;
  }
  function pageELEC(s) {
    var o = ul(8, 30, 'ELEC', 'w', 12), e = s.elec;
    o += unitBox(52, 6, 'BAT 1', [['29', 'V'], ['0', 'A']], true) + unitBox(214, 2, 'BAT 2', [['28', 'V'], ['0', 'A']], true);
    o += bar(128, 12, 70, 'DC BAT', true) + ln(150, 27, 150, 46, 'sg', 1.5);
    o += bar(10, 56, 52, 'DC 1', e.dc[0]) + ln(62, 63, 128, 52, 'sg', 1.5) + bar(128, 44, 64, 'DC ESS', e.dcEss);
    o += bar(256, 44, 54, 'DC 2', e.dc[1]);
    o += t(150, 86, 'ESS TR', 'w', 9, 'middle') + tri(142, 96, 'u') + t(214, 104, 'EMER GEN', e.rat ? 'g' : 'w', 9, 'middle') + tri(250, 101, 'r');
    o += ln(36, 71, 36, 98, e.dc[0] ? 'sg' : 'sa', 1.5) + unitBox(13, 98, 'TR 1', [['28', 'V'], ['45', 'A']], e.ac[0]);
    o += ln(282, 59, 282, 72, e.dc[1] ? 'sg' : 'sa', 1.5) + unitBox(259, 72, 'TR 2', [['28', 'V'], ['34', 'A']], e.ac[1]);
    o += ln(36, 134, 36, 160, e.ac[0] ? 'sg' : 'sa', 1.5) + bar(8, 160, 60, 'AC 1', e.ac[0]);
    o += ln(68, 167, 132, 160, 'sg', 1.5) + bar(132, 152, 72, 'AC ESS', e.acEss);
    o += ln(282, 108, 282, 130, e.ac[1] ? 'sg' : 'sa', 1.5) + bar(252, 130, 60, 'AC 2', e.ac[1]);
    if (e.acEssFeed === 'altn') o += t(168, 182, 'ALTN FEED', 'g', 8, 'middle');
    for (var i = 0; i < 2; i++) {
      var g = e.genView[i], gx = i ? 259 : 13, gy = i ? 168 : 200;
      o += ln(gx + 23, gy, gx + 23, i ? 145 : 175, g.on ? 'sg' : 'sd', 1.5) + tri(gx + 23, gy - 4, 'u', g.on ? 'sg' : 'sd');
      o += g.on ? unitBox(gx, gy, 'GEN ' + (i + 1), [[String(g.load), '%'], ['116', 'V'], ['400', 'HZ']], true)
        : rc(gx, gy, 46, 48, 'sa', 1.2) + t(gx + 23, gy + 11, 'GEN ' + (i + 1), 'a', 9, 'middle') + t(gx + 23, gy + 32, 'OFF', 'a', 10, 'middle');
      var disc = e.idg[i] === 'disc', oil = i === 0 && e.idgOil && !disc, bad = oil || disc, iy = i ? 232 : 266;
      o += t(i ? 256 : 24, iy, 'IDG ' + (i + 1), bad ? 'a' : 'w', 9) + t(i ? 236 : 104, iy, oil ? 'LO PR' : (disc ? 'DISC' : '76'), bad ? 'a' : 'g', 9, 'end') + (bad ? '' : t(i ? 239 : 107, iy, '°C', 'c', 8));
    }
    if (e.apu) o += e.apuGen ? unitBox(137, 200, 'APU GEN', [['38', '%'], ['115', 'V'], ['400', 'HZ']], true) : rc(137, 200, 46, 30, 'sw') + t(160, 211, 'APU GEN', 'w', 8, 'middle');
    return o + footer(s);
  }

  function pageHYD(s) {
    var o = ul(160, 18, 'HYD', 'w', 13, 'middle'), h = s.hyd;
    var cols = [['GREEN', 'G', 62], ['BLUE', 'B', 160], ['YELLOW', 'Y', 258]];
    o += t(110, 52, 'PSI', 'c', 8, 'middle') + t(210, 52, 'PSI', 'c', 8, 'middle');
    cols.forEach(function (c) {
      var sys = h[c[1]], ok = sys.p >= 1450, x = c[2], lc = ok ? 'sg' : 'sa';
      o += t(x, 40, c[0], ok ? 'w' : 'a', 11, 'middle') + t(x, 56, round10(sys.p), ok ? 'g' : 'a', 12, 'middle');
      o += ln(x, 62, x, 240, lc, 1.5);
      var lo = sys.rsvr === 'lo', lvl = Math.max(0, Math.min(1, sys.qty));
      o += rc(x - 4, 240, 8, 44, 'sw', 1) + fillRect(x - 2.5, 276, 5, 7, 'fa') + ln(x, 274, x, 274 - 32 * lvl, lo ? 'sa' : 'sg', 2.4);
      if (lo) o += t(x + 10, 270, 'LO', 'a', 9);
    });
    var gPump = h.G.pump === 'off' ? 'off' : (s.eng[0].running && !s.eng[0].firePb && h.G.rsvr !== 'lo' && !h.G.leak && !h.G.fail ? 'on' : 'lo');
    var yPump = h.Y.pump === 'off' ? 'off' : (s.eng[1].running && !s.eng[1].firePb && h.Y.rsvr !== 'lo' && !h.Y.leak && !h.Y.fail ? 'on' : 'lo');
    var bPump = h.B.pump === 'off' ? 'off' : (!h.B.fail && h.B.rsvr !== 'lo' && (s.elec.ac[0] || s.elec.ac[1]) ? 'on' : 'lo');
    function pump(x, y, st) {
      var c = st === 'on' ? 'sg' : 'sa', b = fillRect(x - 10, y, 20, 20, 'screen') + rc(x - 10, y, 20, 20, c, 1.4);
      return b + (st === 'on' ? ln(x, y + 2, x, y + 18, 'sg', 2) : st === 'lo' ? t(x, y + 14, 'LO', 'a', 9, 'middle') : ln(x - 7, y + 10, x + 7, y + 10, 'sa', 2));
    }
    o += pump(62, 160, gPump) + t(84, 176, '1', 'w', 11, 'middle') + pump(160, 166, bPump) + pump(258, 136, yPump) + t(236, 152, '2', 'w', 11, 'middle');
    o += fillRect(55, 196, 14, 14, 'screen') + valve(62, 203, !s.eng[0].firePb, s.eng[0].firePb ? 'sa' : 'sg');
    o += fillRect(251, 170, 14, 14, 'screen') + valve(258, 177, !s.eng[1].firePb, s.eng[1].firePb ? 'sa' : 'sg');
    var pc = h.ptu === 'off' ? 'sa' : 'sg';
    o += '<path d="M92 92 L150 92 Q160 82 170 92 L190 92" class="' + pc + '" fill="none" stroke-width="1.4"/>' + tri(90, 92, 'l', pc) + tri(194, 92, 'l', pc);
    o += t(218, 96, 'PTU', h.ptu === 'off' ? 'a' : 'w', 10, 'middle') + tri(240, 92, 'r', pc) + ln(244, 92, 258, 92, pc, 1.4);
    if (h.ptuActive) o += '<path d="M90 92 l7 -4 v8 z" class="fg"/>';
    o += t(138, 130, 'RAT', 'g', 9, 'end') + tri(146, 126, 'r', s.elec.rat ? 'sg' : 'sw');
    if (s.elec.rat) o += '<path d="M151 126 l-7 -4 v8 z" class="fg"/>';
    o += tri(268, 106, 'l', h.Y.elec === 'on' ? 'sg' : 'sw') + t(276, 110, 'ELEC', 'w', 9);
    return o + footer(s);
  }

  function pageFUEL(s) {
    var o = ul(10, 46, 'FUEL', 'w', 12), f = s.fuel, e = s.eng;
    o += t(160, 22, 'F.USED', 'w', 9, 'middle') + t(160, 32, '1+2', 'w', 9, 'middle') + t(160, 46, round10(e[0].fuelUsed + e[1].fuelUsed), 'g', 11, 'middle') + t(160, 56, 'KG', 'c', 8, 'middle');
    for (var i = 0; i < 2; i++) {
      var x = i ? 228 : 92, lp = !e[i].firePb && e[i].master;
      o += t(x, 14, String(i + 1), 'w', 12, 'middle') + t(x, 28, round10(e[i].fuelUsed), 'g', 11, 'middle');
      o += valve(x, 46, lp, lp ? 'sg' : 'sa') + ln(x, 53, x, 104, lp ? 'sg' : 'sa', 1.4);
      o += rc(x - 14, 104, 28, 10, 'sg', 1.2) + rc(x - 15, 114, 14, 16, 'sg', 1.2) + ln(x - 8, 116, x - 8, 128, 'sg', 1.6) + rc(x + 1, 114, 14, 16, 'sg', 1.2) + ln(x + 8, 116, x + 8, 128, 'sg', 1.6);
    }
    o += t(70, 78, 'APU', 'w', 9, 'end') + tri(78, 74, 'l') + ln(83, 74, 92, 74, 'sw', 1);
    o += ln(146, 72, 153, 72, 'sg', 1.4) + valveH(160, 72, false, 'sg') + ln(167, 72, 174, 72, 'sg', 1.4);
    o += rc(138, 118, 20, 14, 'sw', 1.2) + ln(142, 125, 154, 125, 'sw', 1.6) + rc(162, 118, 20, 14, 'sw', 1.2) + ln(166, 125, 178, 125, 'sw', 1.6);
    function top(x) { return x < 124 ? 158 - (x - 8) * 26 / 116 : x > 196 ? 132 + (x - 196) * 26 / 116 : 132; }
    function bot(x) { return x < 124 ? 188 - (x - 8) * 14 / 116 : x > 196 ? 174 + (x - 196) * 14 / 116 : 174; }
    o += '<path d="M8 158 L8 188 L124 174 L196 174 L312 188 L312 158 L196 132 Q160 124 124 132 Z" class="sw" fill="none" stroke-width="1.2"/>';
    [58, 124, 196, 262].forEach(function (x) { o += ln(x, top(x), x, bot(x), 'sw', 1.2); });
    o += t(33, 178, round10(f.lo), 'g', 11, 'middle') + t(92, 164, round10(f.li), 'g', 11, 'middle') + t(160, 160, round10(f.ctr), 'g', 11, 'middle') + t(228, 164, round10(f.ri), 'g', 11, 'middle') + t(287, 178, round10(f.ro), 'g', 11, 'middle');
    o += t(36, 204, '-27', 'g', 9, 'end') + t(40, 204, '°C', 'c', 8) + t(80, 204, '-27', 'g', 9) + t(240, 196, '-27', 'g', 9, 'end') + t(244, 196, '°C', 'c', 8) + t(284, 196, '-27', 'g', 9);
    o += t(14, 252, 'F.FLOW', 'w', 9) + t(14, 262, '1+2', 'w', 9) + t(44, 262, ':', 'w', 9) + t(134, 256, round10((e[0].ff + e[1].ff) / 60), 'g', 11, 'end') + t(140, 256, 'KG/MIN', 'c', 8);
    o += rc(14, 266, 160, 17, 'sw', 1.2) + t(20, 279, 'FOB', 'w', 10) + t(50, 279, ':', 'w', 10) + t(136, 279, round10(s.fob), 'g', 11, 'end') + t(142, 279, 'KG', 'c', 8);
    return o + footer(s);
  }

  function pageAPU(s) {
    var o = ul(160, 18, 'APU', 'w', 13, 'middle'), on = s.elec.apu;
    o += tri(60, 40, 'u', on ? 'sg' : 'sw') + t(60, 56, 'APU GEN', 'w', 9, 'middle');
    o += valve(232, 28, false, 'sg') + ln(232, 35, 232, 44, 'sg', 1.4) + rc(204, 44, 56, 30, 'sw', 1.2) + t(232, 56, 'BLEED', 'w', 9, 'middle') + t(228, 69, on ? '35' : '0', 'g', 10, 'end') + t(232, 69, 'PSI', 'c', 8);
    o += '<path d="M40 128 L40 116 L272 100 L272 90" class="sw" fill="none" stroke-width="1.2"/>';
    o += dial(70, 170, 22, 220, 20, on ? 0.95 : 0, on ? 'sg' : null, true) + t(56, 186, '0', 'w', 8) + t(86, 156, '10', 'w', 8) + t(110, 182, on ? '100' : 'XX', on ? 'g' : 'a', 11, 'end');
    o += t(132, 150, 'N', 'w', 10, 'middle') + t(132, 162, '%', 'c', 8, 'middle');
    o += dial(78, 236, 22, 220, 20, on ? 0.45 : 0, on ? 'sg' : null, true) + t(64, 252, '3', 'w', 8) + t(78, 222, '7', 'w', 8) + t(98, 234, '10', 'w', 8) + t(118, 250, on ? '400' : 'XX', on ? 'g' : 'a', 11, 'end');
    o += t(132, 214, 'EGT', 'w', 10, 'middle') + t(132, 226, '°C', 'c', 8, 'middle');
    return o + footer(s);
  }

  function pageCOND(s) {
    var o = ul(10, 30, 'COND', 'w', 12), c = s.cargo;
    o += t(296, 14, 'TEMP :', 'w', 9, 'end') + t(300, 14, '°C', 'c', 9);
    o += '<path d="M30 88 Q38 66 72 64 L290 52 Q298 52 302 58" class="sw" fill="none" stroke-width="1.2"/>';
    o += '<path d="M34 94 Q44 100 70 100 M104 98 L190 94 M216 92 L282 88 Q292 86 298 80" class="sw" fill="none" stroke-width="1.2"/>';
    o += ln(112, 62, 112, 96, 'sw', 1.2) + ln(206, 76, 206, 92, 'sw', 1.2);
    var zones = [['CKPT', 72, 78, '22'], ['FWD', 156, 70, '23'], ['AFT', 246, 64, '24']];
    zones.forEach(function (z) {
      var x = z[1], y = z[2];
      o += t(x, y, z[0], 'w', 9, 'middle') + t(x, y + 13, z[3], 'g', 11, 'middle');
      var ty = y + 46;
      o += t(x, ty - 12, '38', 'g', 9, 'middle') + arc(x, ty, 9, 160, 20, 'sw', 1.2) + t(x - 15, ty + 4, 'C', 'w', 8, 'middle') + t(x + 15, ty + 4, 'H', 'w', 8, 'middle');
      o += ln(x, ty + 2, x + 3, ty - 8, 'sg', 1.6) + ln(x, ty + 2, x, 150, 'sg', 1.5);
    });
    o += ln(72, 150, 256, 150, 'sg', 1.5) + valveH(263, 150, true, 'sg') + ln(270, 150, 280, 150, 'sg', 1.5) + t(284, 148, 'HOT', 'g', 9) + t(284, 158, 'AIR', 'g', 9);
    if (c.fwdSmoke) {
      o += rc(70, 200, 180, 56, c.agent !== 'disch' ? 'sr' : 'sw', 1.2) + t(160, 216, 'FWD CRG', 'w', 10, 'middle');
      o += t(160, 240, c.agent === 'disch' ? 'AGENT DISCH' : 'SMOKE', c.agent === 'disch' ? 'w' : 'r', 10, 'middle');
    }
    return o + footer(s);
  }

  function pageDOOR(s) {
    var o = ul(160, 18, 'DOOR/OXY', 'w', 12, 'middle');
    o += t(266, 14, 'CKPT OXY', 'w', 9, 'middle') + t(242, 28, '1850', 'g', 10, 'end') + t(246, 28, 'PSI', 'c', 8);
    o += t(160, 52, 'V/S', 'w', 10) + t(262, 50, Math.round(s.press.vs / 10) * 10, 'g', 11, 'end') + t(266, 50, 'FT/MIN', 'c', 8);
    o += '<path d="M112 278 L112 66 Q112 42 128 32 Q144 42 144 66 L144 278" class="sw" fill="none" stroke-width="1.4"/>';
    o += ln(112, 186, 64, 206, 'sw', 1.2) + ln(144, 186, 192, 196, 'sw', 1.2);
    function door(x, y, w, h) { return rc(x, y, w, h, 'sg', 1.2); }
    o += door(124, 44, 8, 5) + door(118, 60, 5, 8) + door(133, 60, 5, 8);
    o += door(114, 82, 5, 10) + t(108, 90, 'SLIDE', 'w', 8, 'end') + door(137, 82, 5, 10) + t(148, 90, 'SLIDE', 'w', 8);
    o += door(127, 104, 8, 5) + door(132, 116, 6, 10);
    o += door(114, 176, 5, 8) + door(114, 188, 5, 8) + t(108, 192, 'SLIDE', 'w', 8, 'end') + door(137, 176, 5, 8) + door(137, 188, 5, 8) + t(148, 186, 'SLIDE', 'w', 8);
    o += door(132, 214, 6, 10) + door(132, 228, 6, 10);
    o += door(114, 254, 5, 10) + t(108, 262, 'SLIDE', 'w', 8, 'end') + door(137, 254, 5, 10) + t(148, 262, 'SLIDE', 'w', 8);
    return o + footer(s);
  }

  // Spoilers 1-5 each side: green dash when available, amber underlined number when its
  // hydraulic system is lost (1 and 5 green, 2 and 4 yellow, 3 blue).
  var SPL_SYS = ['G', 'Y', 'B', 'Y', 'G'];
  function hydOk(s) { var h = s.hyd; return { G: h.G.p >= 1450, B: h.B.p >= 1450, Y: h.Y.p >= 1450 }; }
  function spoiler(x, y, k, ok, ext) {
    if (!ok[SPL_SYS[k]]) return t(x, y + 3, String(k + 1), 'a', 10, 'middle') + ln(x - 4, y + 5, x + 4, y + 5, 'sa', 1);
    return ext ? '<path d="M' + (x - 5) + ' ' + y + ' l5 -8 l5 8 z" class="fg"/>' : ln(x - 7, y, x + 7, y, 'sg', 2.6);
  }
  function sysBox(x, y, L, ok) { return fillRect(x - 5, y - 9, 10, 11, 'fb') + t(x, y, L, ok ? 'g' : 'a', 9, 'middle'); }
  function pageWHEEL(s) {
    var o = ul(10, 78, 'WHEEL', 'w', 12), ok = hydOk(s);
    [[50, 54], [74, 50], [98, 46], [122, 42], [146, 38]].forEach(function (q, i) { o += spoiler(q[0], q[1], 4 - i, ok); });
    [[174, 38], [198, 42], [222, 46], [246, 50], [270, 54]].forEach(function (q, i) { o += spoiler(q[0], q[1], i, ok); });
    // Lost wheel functions, shown only when degraded
    if (!ok.Y) o += sysBox(116, 130, 'Y', false) + t(126, 130, 'N/W STEERING', 'a', 10);
    if (!ok.G && !ok.Y) o += t(118, 152, 'ANTI SKID', 'a', 10) + rc(176, 143, 10, 11, 'sg', 1) + t(181, 152, '1', 'a', 9, 'middle') + rc(188, 143, 10, 11, 'sg', 1) + t(193, 152, '2', 'a', 9, 'middle');
    if (!ok.G) {
      o += sysBox(136, 222, 'G', false) + t(146, 222, 'NORM BRK', 'a', 10);
      o += sysBox(136, 238, 'Y', ok.Y) + t(146, 238, 'ALTN BRK', 'g', 10);
      if (!ok.Y) o += '<path d="M152 242 v8 h6" class="sg" fill="none" stroke-width="1"/>' + t(160, 254, 'ACCU ONLY', 'g', 10);
      o += t(160, 274, 'AUTO BRK', 'a', 10, 'middle');
    }
    // Landing gear (left main, nose, right main). Doors: green line when closed, amber
    // and open otherwise. Below, one triangle per LGCIU: green down and locked, red
    // unlocked or in transit, none when up and locked.
    function gear(x, y, v) {
      var r = '';
      [-1, 1].forEach(function (d) {
        var hx = x + 15 * d;
        r += v.doorOpen ? ln(hx, y, hx - 7 * d, y + 12, 'sa', 2) : ln(hx, y, x + 1 * d, y, 'sg', 2);
        if (v.tri) r += '<path d="M' + (x + 8 * d - 6) + ' ' + (y + 17) + ' h12 l-6 11 z" class="' + (v.tri === 'g' ? 'fg' : 'fr') + '"/>';
      });
      return r;
    }
    var lg = s.gear || [{}, {}, {}];
    o += gear(85, 110, lg[0]) + gear(160, 76, lg[1]) + gear(235, 110, lg[2]);
    function brake(x, y, n) {
      return arc(x, y, 16, 140, 40, 'sw', 1.4) + arc(x, y, 16, -40, -140, 'sw', 1.4) + t(x, y - 2, '0', 'g', 11, 'middle') + t(x, y + 11, String(n), 'w', 10, 'middle');
    }
    o += brake(66, 206, 1) + brake(104, 206, 2) + t(85, 202, '°C', 'c', 8, 'middle') + t(85, 214, 'REL', 'w', 8, 'middle');
    o += brake(216, 206, 3) + brake(254, 206, 4) + t(235, 202, '°C', 'c', 8, 'middle') + t(235, 214, 'REL', 'w', 8, 'middle');
    if (s.autoBrk && ok.G) o += t(160, 220, 'AUTO BRK', 'g', 10, 'middle') + t(160, 232, s.autoBrk, 'g', 10, 'middle');
    return o + footer(s);
  }

  function pageFCTL(s) {
    var o = ul(10, 40, 'F/CTL', 'w', 12), h = s.hyd;
    var ok = { G: h.G.p >= 1450, B: h.B.p >= 1450, Y: h.Y.p >= 1450 };
    function letters(x, y, list) {
      var out = '';
      list.forEach(function (L, idx) { out += t(x + idx * 11, y, L, ok[L] ? 'g' : 'a', 11, 'middle'); });
      return out;
    }
    o += letters(149, 20, ['G', 'B', 'Y']);
    o += ln(56, 50, 148, 30, 'sw', 1) + ln(172, 30, 264, 50, 'sw', 1) + ln(80, 76, 142, 64, 'sw', 1) + ln(178, 64, 240, 76, 'sw', 1);
    for (var k = 0; k < 5; k++) { var y = 54 + k * 3; o += spoiler(132 - k * 18, y, k, ok, s.spdBrk) + spoiler(188 + k * 18, y, k, ok, s.spdBrk); }
    o += t(160, 76, 'SPD BRK', 'w', 9, 'middle');
    function surf(x, y0, y1, ay, side) {
      var r = ln(x, y0, x, y1, 'sw', 1);
      for (var yy = y0; yy <= y1; yy += (y1 - y0) / 4) r += circ(x, yy, 1.4, 'sw', 1);
      return r + '<path d="M' + (x + 4 * side) + ' ' + ay + ' l' + (6 * side) + ' -4 v8 z" class="fg"/>';
    }
    o += t(36, 114, 'L', 'w', 10, 'middle') + t(36, 126, 'AIL', 'w', 10, 'middle') + surf(60, 100, 160, 130, 1) + letters(82, 176, ['B', 'G']);
    o += t(286, 84, 'R', 'w', 10, 'middle') + t(286, 96, 'AIL', 'w', 10, 'middle') + surf(262, 80, 140, 110, -1) + letters(228, 150, ['G', 'B']);
    o += t(108, 118, 'ELAC', 'w', 10) + ln(104, 122, 142, 122, 'sw', 1) + ln(114, 134, 150, 134, 'sw', 1);
    s.fctl.elac.forEach(function (st, idx) { o += t(146 + idx * 8, 120 + idx * 12, String(idx + 1), st === 'ok' ? 'g' : 'a', 11, 'middle'); });
    o += t(186, 110, 'SEC', 'w', 10) + ln(182, 114, 212, 114, 'sw', 1) + ln(192, 126, 222, 126, 'sw', 1) + ln(202, 138, 232, 138, 'sw', 1);
    s.fctl.sec.forEach(function (st, idx) { o += t(216 + idx * 8, 112 + idx * 12, String(idx + 1), st === 'ok' ? 'g' : 'a', 11, 'middle'); });
    var ths = ok.G || ok.Y;
    o += t(140, 180, 'PITCH TRIM', 'w', 10, 'middle') + letters(196, 180, ['G', 'Y']) + t(150, 194, '0.8', ths ? 'g' : 'a', 10, 'end') + t(154, 194, '°', 'c', 10) + t(162, 194, 'UP', ths ? 'g' : 'a', 9);
    o += t(82, 206, 'L', 'w', 10, 'middle') + t(82, 218, 'ELEV', 'w', 10, 'middle') + surf(106, 190, 254, 226, -1) + letters(76, 244, ['B', 'G']);
    o += t(256, 182, 'R', 'w', 10, 'middle') + t(256, 194, 'ELEV', 'w', 10, 'middle') + surf(226, 174, 238, 214, 1) + letters(246, 220, ['Y', 'B']);
    o += '<path d="M120 216 L146 200 M200 200 L222 216" class="sw" fill="none" stroke-width="1"/>';
    o += t(160, 212, 'RUD', 'w', 10, 'middle') + letters(149, 226, ['G', 'B', 'Y']);
    o += arc(160, 244, 26, -30, -150, 'sw', 1.2) + '<path d="M156 270 L160 236 L164 270 Q160 276 156 270 Z" class="sg" fill="none" stroke-width="1.4"/>' + ln(160, 272, 160, 280, 'sc', 2);
    if (s.fctl.law !== 'NORMAL') o += t(312, 18, s.fctl.law + ' LAW', 'a', 9, 'end');
    return o + footer(s);
  }

  function pageSTATUS(s, sts) {
    var o = ul(160, 18, 'STATUS', 'w', 13, 'middle');
    if (!sts || (!sts.left.length && !sts.inop.length)) {
      return o + t(96, 150, 'NORMAL', 'g', 12, 'middle') + ln(196, 34, 196, 272, 'sw', 1.5) + footer(s);
    }
    // Long STATUS pages (dual failures) are spaced closer to fit above the footer.
    var dl = Math.min(14, 236 / Math.max(1, sts.left.length)), di = Math.min(14, 220 / Math.max(1, sts.inop.length));
    sts.left.forEach(function (l, i) { o += t(6, 42 + i * dl, l[0], l[1], dl < 13 ? 9 : 10, null, ' xml:space="preserve"'); });
    o += ln(196, 30, 196, 272, 'sw', 1.5);
    if (sts.inop.length) {
      o += ul(204, 44, 'INOP SYS', 'w', 10);
      sts.inop.forEach(function (l, i) { var it = Array.isArray(l) ? l : [l, 'a']; o += t(204, 60 + i * di, it[0], it[1], di < 13 ? 9 : 10); });
    }
    return o + footer(s);
  }

  var PAGES = { ENG: pageENG, HYD: pageHYD, ELEC: pageELEC, BLEED: pageBLEED, PRESS: pagePRESS, FCTL: pageFCTL, 'F/CTL': pageFCTL, COND: pageCOND, FUEL: pageFUEL, APU: pageAPU, DOOR: pageDOOR, WHEEL: pageWHEEL, CRUISE: pageCRUISE };

  function renderSD(s, page, sts) {
    if (page === 'STATUS' || page === 'STS') return svg(pageSTATUS(s, sts));
    return svg((PAGES[page] || pageCRUISE)(s));
  }

  /* ---------------------------------------------------------- PFD and ND */
  // Drawn on a 200 x 200 grid, laid out from the owner's A320neo screenshot.
  function svg200(body, cls) {
    return '<svg viewBox="0 0 200 200" class="ecam ' + cls + '" role="img" preserveAspectRatio="xMidYMid meet">' +
      '<rect width="200" height="200" class="screen"/>' + body + '</svg>';
  }
  function pts(list) { return list.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }

  // f: what the FCU sets (fcuPfd in js/app.js): FMA modes and the targets, blue
  // when selected and magenta when managed.
  function renderPFD(s, f) {
    f = f || { thr: 'MACH', vert: 'ALT CRZ', lat: 'NAV', fcuAlt: s.alt, vs: 0, arm: '' };
    var o = '', cy = 95, cx = 100, spd = 232, alt = s.alt;
    // FMA
    for (var i = 1; i < 5; i++) o += ln(i * 40, 2, i * 40, 22, 'sw', 0.8);
    [f.thr, f.vert, f.lat].forEach(function (m, k) { o += t(20 + k * 40, 10, m, 'g', m.length > 7 ? 6 : 7, 'middle'); });
    if (f.arm) o += t(60, 19, f.arm, 'c', 6.5, 'middle');
    // Armed autobrake: column 4, third line, blue
    if (f.brk) o += t(140, 23, 'BRK ' + f.brk, 'c', 6.5, 'middle');
    o += t(180, 9, 'AP1', 'w', 6.5, 'middle') + t(180, 16, f.fd === false ? '-FD2' : '1FD2', 'w', 6.5, 'middle') + t(180, 23, 'A/THR', 'w', 6.5, 'middle');
    // attitude
    o += '<clipPath id="pfd-att"><path d="M64 60 Q66 46 100 44 Q134 46 136 60 L136 132 Q134 148 100 150 Q66 148 64 132 Z"/></clipPath><g clip-path="url(#pfd-att)">';
    var hz = cy + 5;
    o += '<rect x="40" y="0" width="120" height="' + hz + '" class="sky"/><rect x="40" y="' + hz + '" width="120" height="120" class="gnd"/>' + ln(40, hz, 160, hz, 'sw', 1);
    [[-20, 22], [-10, 22], [10, 22], [20, 22]].forEach(function (p) {
      var y = hz + p[0] * 2.2;
      o += ln(cx - p[1] / 2, y, cx + p[1] / 2, y, 'sw', 1) + t(cx - p[1] / 2 - 8, y + 2.5, Math.abs(p[0]), 'w', 6.5, 'middle') + t(cx + p[1] / 2 + 8, y + 2.5, Math.abs(p[0]), 'w', 6.5, 'middle');
    });
    [-15, -5, 5, 15].forEach(function (p) { var y = hz + p * 2.2; o += ln(cx - 6, y, cx + 6, y, 'sw', 1); });
    [-7.5, -2.5, 2.5, 7.5].forEach(function (p) { var y = hz + p * 2.2; o += ln(cx - 3, y, cx + 3, y, 'sw', 0.8); });
    o += '</g>';
    // bank scale and indices
    [-45, -30, -20, -10, 10, 20, 30, 45].forEach(function (b) {
      var a = 90 - b, p0 = pt(cx, cy, 48, a), p1 = pt(cx, cy, Math.abs(b) % 30 === 0 || Math.abs(b) === 45 ? 54 : 51, a);
      o += ln(p0[0], p0[1], p1[0], p1[1], 'sw', 1);
    });
    o += '<path d="M' + cx + ' 47 l-4 -7 h8 z" class="sy" fill="none" stroke-width="1.2"/><path d="M' + cx + ' 49 l-4 6 h8 z" class="sy" fill="none" stroke-width="1.2"/>';
    // flight director bars (FD pushbutton on the EFIS panel), green, on the target
    if (f.fd !== false) o += ln(cx - 30, cy + 3, cx + 30, cy + 3, 'sg', 1.8) + ln(cx - 3, cy - 30, cx - 3, cy + 30, 'sg', 1.8);
    // ILS deviation scales (LS pushbutton): no ILS tuned in cruise, so no diamonds
    if (f.ls) {
      [-24, -12, 12, 24].forEach(function (d) { o += circ(cx + d, 146, 1.6, 'sw', 0.9) + circ(141, cy + d, 1.6, 'sw', 0.9); });
      o += ln(cx, 142, cx, 150, 'sy', 1.2) + ln(137, cy, 145, cy, 'sy', 1.2);
    }
    // aircraft symbol
    o += '<path d="M66 ' + (cy - 3) + ' h22 v10 h-6 v-5 h-16 z M134 ' + (cy - 3) + ' h-22 v10 h6 v-5 h16 z" class="fk sy" stroke-width="1.4"/>' + rc(cx - 2.5, cy - 2.5, 5, 5, 'sy', 1.2);
    // speed tape
    o += '<rect x="22" y="40" width="26" height="112" class="tape"/>';
    for (var v = 190; v <= 270; v += 10) {
      var y = cy - (v - spd) * 1.6;
      if (y < 42 || y > 150) continue;
      o += ln(40, y, 48, y, 'sw', 1);
      if (v % 20 === 0) o += t(37, y + 3, String(v), 'w', 8, 'end');
    }
    for (var b2 = 40; b2 < 64; b2 += 4) o += '<rect x="46" y="' + b2 + '" width="3" height="2" class="fr"/>';
    o += '<rect x="46" y="130" width="3" height="20" class="fa"/>' + circ(50, 118, 2, 'sg', 1.2);
    o += ln(14, cy, 54, cy, 'sy', 1.6) + '<path d="M54 ' + cy + ' l6 -4 v8 z" class="fy"/>';
    // speed target: managed magenta at the current speed, selected blue (its value above or below the tape when off it)
    if (f.spdSel && f.spd != null) {
      var ys = cy - (f.spd - spd) * 1.6;
      if (ys < 42) o += t(35, 37, f.spdTxt || String(f.spd), 'c', 8, 'middle'); else if (ys > 150) o += t(35, 158, f.spdTxt || String(f.spd), 'c', 8, 'middle');
      else o += '<path d="M48 ' + ys + ' l6 -4 v8 z" class="c"/>';
    } else o += '<path d="M48 ' + cy + ' l6 -4 v8 z" class="m"/>';
    o += t(28, 166, '.798', 'g', 9, 'middle');
    // altitude tape
    o += '<rect x="152" y="40" width="24" height="112" class="tape"/>';
    for (var a2 = alt - 600; a2 <= alt + 600; a2 += 100) {
      var ya = cy - (a2 - alt) * 0.4;
      if (ya < 42 || ya > 150) continue;
      o += ln(152, ya, 158, ya, 'sw', 1);
      if (a2 % 500 === 0 && a2 !== alt) o += t(164, ya + 3, String(a2 / 100), 'w', 7.5, 'middle');
    }
    o += ln(138, cy, 152, cy, 'sy', 1.6);
    o += '<rect x="150" y="' + (cy - 8) + '" width="32" height="16" class="screen sy" stroke-width="1.2"/>' + t(170, cy + 4, String(Math.floor(alt / 100)), 'g', 11, 'end') + t(181, cy + 3, '00', 'g', 7, 'end');
    // FCU altitude: blue, above or below the tape (on it when within 600 ft), magenta dot when managed is not shown
    var fa = f.fcuAlt, yf = cy - (fa - alt) * 0.4;
    if (fa > alt + 600) o += t(164, 36, String(fa), 'c', 8, 'middle'); else if (fa < alt - 600) o += t(164, 162, String(fa), 'c', 8, 'middle');
    else if (fa !== alt) o += rc(153, yf - 4, 22, 8, 'sc', 1) + t(164, yf + 2.5, String(fa / 100), 'c', 6.5, 'middle');
    // vertical speed
    o += '<path d="M184 46 L194 52 L194 138 L184 144 Z" class="tape"/>';
    [['6', 50], ['2', 64], ['1', 78], ['1', 112], ['2', 126], ['6', 140]].forEach(function (q) { o += t(186, q[1] + 2.5, q[0], 'w', 6, 'start') + ln(190, q[1], 193, q[1], 'sw', 1); });
    // V/S needle: 1000 and 2000 ft/min at 17 and 31 units from level, 6000 at 45
    var av = Math.abs(f.vs), dv = av <= 1000 ? av * 0.017 : av <= 2000 ? 17 + (av - 1000) * 0.014 : 31 + Math.min(av - 2000, 4000) * 0.0035, yv = cy - (f.vs >= 0 ? dv : -dv);
    o += ln(199, cy, 191, yv, 'sg', 1.6);
    if (av >= 200) o += rc(186, f.vs > 0 ? 36 : 145, 12, 9, 'sg', 0.8) + t(192, f.vs > 0 ? 43 : 152, String(Math.round(av / 100)), 'g', 6.5, 'middle');
    // heading tape
    o += '<rect x="60" y="168" width="80" height="14" class="tape"/>';
    [['34', 68], ['35', 84], ['0', 100], ['1', 116], ['2', 132]].forEach(function (q) { o += t(q[1], 180, q[0], 'w', 7, 'middle') + ln(q[1] + 8, 168, q[1] + 8, 171, 'sw', 1); });
    o += ln(100, 160, 100, 172, 'sy', 1.6);
    // baro reference under the altitude scale: STD boxed, or QNH and its value
    if (f.baro === 'Std') o += rc(152, 180, 24, 11, 'sy', 1) + t(164, 188.5, 'STD', 'c', 8, 'middle');
    else if (f.baro) o += t(150, 189, 'QNH', 'w', 6.5, 'start') + t(196, 189, f.baro, 'c', 7.5, 'end');
    // selected heading: blue triangle on the tape (current heading 360, 1.6 units per degree), or its value at the side
    if (f.hdgSel && f.hdg != null) {
      var dh = ((f.hdg + 540) % 360) - 180;
      if (Math.abs(dh) <= 24) o += '<path d="M' + (100 + dh * 1.6) + ' 168 l-3.5 -6 h7 z" class="c"/>';
      else o += t(dh < 0 ? 56 : 144, 180, ('00' + f.hdg).slice(-3), 'c', 7.5, dh < 0 ? 'end' : 'start');
    }
    return svg200(o, 'pfd');
  }

  // ND from the Captain's EFIS panel (owner's request, 0.7.20): e = { mode: LS | VOR | NAV |
  // ARC | PLAN, range (NM), cstr, opt: WPT | VOR.D | NDB | ARPT | null, n1, n2: ADF | OFF | VOR }.
  // Heading and track 360, so north is up in every mode. Positions are NM east and north of
  // the aircraft, invented for training. ARC: the arc is the full range; ROSE and PLAN: the
  // outer circle is half the range.
  var ROUTE = [['MAMOL', 3, 22, 'FL350'], ['TIRSO', -8, 58], ['KUKOR', 6, 105, 'FL350'], ['ARGUS', 22, 190], ['BERUS', 15, 300]];
  var OPTS = {
    WPT: [['ODINA', -14, 30], ['PELIX', 18, 46], ['SURAK', -24, 92], ['VAMEN', 30, 140]],
    'VOR.D': [['POL', -20, 12], ['TRN', 26, 70], ['ALB', -40, 150]],
    NDB: [['GO', 12, 8], ['KR', -30, 60], ['LZ', 34, 120]],
    ARPT: [['LSZH', -18, 40], ['LIMC', 24, 96], ['LFLL', -46, 180]]
  };
  function renderND(s, e) {
    e = e || { mode: 'ARC', range: 40, cstr: false, opt: null, n1: 'VOR', n2: 'VOR' };
    var mode = e.mode, rose = mode === 'LS' || mode === 'VOR' || mode === 'NAV', plan = mode === 'PLAN';
    var cx = mode === 'ARC' ? 104 : 100, cy = mode === 'ARC' ? 176 : 102, R = mode === 'ARC' ? 124 : 70;
    var ppn = mode === 'ARC' ? R / e.range : R / (e.range / 2), o = '';
    var P = function (q) { return [cx + q[1] * ppn, cy - q[2] * ppn]; }, rng = function (f) { var v = e.range * f; return v % 1 ? v.toFixed(1) : String(v); };
    o += t(6, 12, 'GS', 'w', 7) + t(19, 12, '480', 'g', 9) + t(42, 12, 'TAS', 'w', 7) + t(58, 12, '458', 'g', 9);
    o += t(6, 24, '163/23', 'g', 8) + '<path d="M10 40 L10 30 M7 33 L10 29 L13 33" class="sg" fill="none" stroke-width="1"/>';
    o += '<clipPath id="nd-clip"><rect x="0" y="30" width="200" height="150"/></clipPath><g clip-path="url(#nd-clip)">';
    if (mode === 'ARC') {
      o += arc(cx, cy, R, 150, 30, 'sw', 1.4);
      for (var d = -60; d <= 60; d += 5) {
        var a = 90 - d, p0 = pt(cx, cy, R, a), p1 = pt(cx, cy, R + (d % 10 ? 3 : 6), a);
        o += ln(p0[0], p0[1], p1[0], p1[1], 'sw', 1);
        if (d % 10 === 0 && Math.abs(d) <= 40) { var lp = pt(cx, cy, R + 13, a); o += t(lp[0], lp[1] + 3, String((360 + d) % 360 / 10), 'w', d === 0 ? 10 : 7.5, 'middle'); }
      }
      [0.25, 0.5, 0.75].forEach(function (f) {
        var rr = R * f, q1 = pt(cx, cy, rr, 158), q2 = pt(cx, cy, rr, 22);
        o += '<path d="M' + pts([pt(cx, cy, rr, 160)]) + ' A' + rr + ' ' + rr + ' 0 0 1 ' + pts([pt(cx, cy, rr, 20)]) + '" class="sw" fill="none" stroke-width="1" stroke-dasharray="4 3"/>';
        o += t(q1[0] + 6, q1[1] - 2, rng(f), 'c', 7) + t(q2[0] - 6, q2[1] - 2, rng(f), 'c', 7, 'end');
      });
    } else {
      if (!plan) for (var b = 0; b < 360; b += 5) {
        var ab = 90 - b, b0 = pt(cx, cy, R, ab), b1 = pt(cx, cy, R + (b % 10 ? 3 : 5), ab);
        o += ln(b0[0], b0[1], b1[0], b1[1], 'sw', 1);
        if (b % 30 === 0) { var bl = pt(cx, cy, R + 11, ab); o += t(bl[0], bl[1] + 3, String(b / 10), 'w', b === 0 ? 9 : 7, 'middle'); }
      }
      o += circ(cx, cy, R, 'sw', plan ? 1 : 1.4) + '<circle cx="' + cx + '" cy="' + cy + '" r="' + R / 2 + '" class="sw" fill="none" stroke-width="1" stroke-dasharray="4 3"/>';
      var rl = pt(cx, cy, R / 2, 135); o += t(rl[0] - 3, rl[1] - 2, rng(0.25), 'c', 7, 'end');
      if (plan) { o += t(cx, cy - R - 4, 'N', 'w', 8, 'middle') + t(cx + R + 4, cy + 3, 'E', 'w', 7) + t(cx - R - 9, cy + 3, 'W', 'w', 7) + t(cx, cy + R + 10, 'S', 'w', 7, 'middle'); var rl2 = pt(cx, cy, R, 135); o += t(rl2[0] - 3, rl2[1] - 2, rng(0.5), 'c', 7, 'end'); }
    }
    if (mode === 'LS' || mode === 'VOR') {
      // course pointer and deviation bar: magenta for the ILS, cyan for the VOR; no signal in cruise
      var cc = mode === 'LS' ? 'sm' : 'sc', ct = mode === 'LS' ? 'm' : 'c';
      o += ln(cx, cy - R + 2, cx, cy - 22, cc, 2.2) + '<path d="M' + cx + ' ' + (cy - R + 2) + ' l-4 7 h8 z" class="' + ct + '"/>' + ln(cx, cy + 22, cx, cy + R - 2, cc, 2.2);
      [-28, -14, 14, 28].forEach(function (d) { o += circ(cx + d, cy, 2, 'sw', 1); });
    } else {
      // flight plan: green, the TO waypoint white; constraints (CSTR) magenta; EFIS options magenta
      var path = [[cx, cy]].concat(ROUTE.map(P));
      o += '<polyline points="' + pts(path) + '" class="sg" fill="none" stroke-width="1.4"/>';
      ROUTE.forEach(function (w, k) {
        var q = P(w), c = k === 0 ? 'sw' : 'sg';
        o += '<path d="M' + q[0] + ' ' + (q[1] - 3.5) + ' l3.5 3.5 l-3.5 3.5 l-3.5 -3.5 z" class="' + c + '" fill="none" stroke-width="1.2"/>' + t(q[0] + 6, q[1] + 3, w[0], k === 0 ? 'w' : 'g', 7);
        if (e.cstr && w[3]) o += circ(q[0], q[1], 6, 'sm', 1) + t(q[0] + 6, q[1] + 11, w[3], 'm', 6.5);
      });
      (OPTS[e.opt] || []).forEach(function (w) {
        var q = P(w), sym = e.opt === 'WPT' ? '<path d="M' + q[0] + ' ' + (q[1] - 3) + ' l3 3 l-3 3 l-3 -3 z" class="sm" fill="none" stroke-width="1"/>'
          : e.opt === 'VOR.D' ? circ(q[0], q[1], 3, 'sm', 1) + ln(q[0] - 5, q[1], q[0] + 5, q[1], 'sm', 1) + ln(q[0], q[1] - 5, q[0], q[1] + 5, 'sm', 1)
          : e.opt === 'NDB' ? '<path d="M' + q[0] + ' ' + (q[1] - 4) + ' l4 6.5 h-8 z" class="sm" fill="none" stroke-width="1"/>'
          : ln(q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4, 'sm', 1.2) + ln(q[0] - 4, q[1] + 4, q[0] + 4, q[1] - 4, 'sm', 1.2) + ln(q[0], q[1] - 5, q[0], q[1] + 5, 'sm', 1.2);
        o += sym + t(q[0] + 6, q[1] + 3, w[0], 'm', 6.5);
      });
    }
    // bearing pointers: VOR white, ADF green; 1 single, 2 double
    [[e.n1, 1, 330, 20], [e.n2, 2, 60, 300]].forEach(function (n) {
      if (!n[0] || n[0] === 'OFF' || plan) return;
      var brg = n[0] === 'VOR' ? n[2] : n[3], c = n[0] === 'VOR' ? 'sw' : 'sg', rr = mode === 'ARC' ? R : R - 4, h = pt(cx, cy, rr, 90 - brg), tl = pt(cx, cy, rr, 270 - brg), m = pt(cx, cy, rr - 18, 90 - brg);
      o += n[1] === 1 ? ln(tl[0], tl[1], h[0], h[1], c, 1.2) : ln(tl[0] - 1.5, tl[1], h[0] - 1.5, h[1], c, 1) + ln(tl[0] + 1.5, tl[1], h[0] + 1.5, h[1], c, 1);
      var ux = (h[0] - m[0]) / 18, uy = (h[1] - m[1]) / 18;
      o += ln(h[0], h[1], h[0] - ux * 6 - uy * 3.5, h[1] - uy * 6 + ux * 3.5, c, 1) + ln(h[0], h[1], h[0] - ux * 6 + uy * 3.5, h[1] - uy * 6 - ux * 3.5, c, 1);
    });
    o += '</g>';
    if (mode !== 'ARC' && !plan) o += ln(cx, cy - R - 5, cx, cy - R + 5, 'sy', 2);
    else if (mode === 'ARC') o += ln(cx, cy - R - 6, cx, cy - R + 6, 'sy', 2);
    // aircraft symbol (yellow); in PLAN a small one on the route
    o += plan ? '<path d="M' + (cx - 4) + ' ' + cy + ' h8 M' + cx + ' ' + (cy - 5) + ' v9" class="sy" fill="none" stroke-width="1.6"/>'
      : '<path d="M' + (cx - 10) + ' ' + (cy - 4) + ' h20 M' + cx + ' ' + (cy - 14) + ' v18 M' + (cx - 4) + ' ' + (cy + 2) + ' h8" class="sy" fill="none" stroke-width="2.2"/>';
    if (mode === 'LS') o += t(196, 12, 'ILS1 109.50', 'm', 7.5, 'end') + t(196, 22, 'CRS 360°', 'm', 7.5, 'end');
    else if (mode === 'VOR') o += t(196, 12, 'VOR1 115.10', 'w', 7.5, 'end') + t(196, 22, 'CRS 360°', 'c', 7.5, 'end');
    else o += t(196, 12, 'MAMOL', 'w', 7.5, 'end') + t(196, 22, '008° ' + 22 + 'NM', 'g', 7.5, 'end');
    o += t(184, 160, mode === 'PLAN' ? '' : 'WX+T+H', 'g', 6, 'end');
    // bottom: the needle sources (left 1, right 2), or nothing when OFF
    if (e.n1 && e.n1 !== 'OFF') { var v1 = e.n1 === 'VOR', c1 = v1 ? 'w' : 'g'; o += '<path d="M10 186 L10 176 M7 179 L10 175 L13 179" class="' + (v1 ? 'sw' : 'sg') + '" fill="none" stroke-width="1"/>' + t(16, 180, e.n1 + '1', c1, 7.5) + t(16, 188, v1 ? 'POL' : 'GO', c1, 7.5) + (v1 ? t(8, 197, '15.3', 'g', 7.5) + t(28, 197, 'NM', 'c', 6) : ''); }
    if (e.n2 && e.n2 !== 'OFF') { var v2 = e.n2 === 'VOR', c2 = v2 ? 'w' : 'g'; o += '<path d="M190 186 L190 176 M187 179 L190 175 L193 179 M194 186 L194 176" class="' + (v2 ? 'sw' : 'sg') + '" fill="none" stroke-width="1"/>' + t(184, 180, e.n2 + '2', c2, 7.5, 'end') + t(184, 188, v2 ? 'TRN' : 'KR', c2, 7.5, 'end') + (v2 ? t(176, 197, '71.0', 'g', 7.5, 'end') + t(190, 197, 'NM', 'c', 6, 'end') : ''); }
    o += rc(56, 186, 92, 9, 'sw', 1) + t(102, 193.5, 'GPS PRIMARY', 'w', 7, 'middle');
    return svg200(o, 'nd');
  }

  window.ECAM_DISPLAYS = { renderEWD: renderEWD, renderSD: renderSD, renderPFD: renderPFD, renderND: renderND, esc: esc };
})();
