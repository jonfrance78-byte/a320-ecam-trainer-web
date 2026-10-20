/* A320 ECAM Trainer: exploded flight deck overview (home page).
 *
 * The overhead, glareshield and pedestal panels are drawn from the panel
 * library (js/panels.js), so the home view and the expanded panel view show
 * the same panel. Each such panel is a tappable <g class="hot" data-panel>.
 * The E/WD and SD show live ECAM output passed in by the app.
 */
(function () {
  'use strict';

  var PN = window.ECAM_PANELS, PHOTO = window.ECAM_PHOTO_PANELS;
  var out;
  function add(s) { out.push(s); }
  function r(x, y, w, h, cls, rx) { add('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" class="' + cls + '"' + (rx ? ' rx="' + rx + '"' : '') + '/>'); }
  function c(x, y, rad, cls) { add('<circle cx="' + x + '" cy="' + y + '" r="' + rad + '" class="' + cls + '"/>'); }
  function l(x1, y1, x2, y2, cls) { add('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + cls + '"/>'); }
  function tx(x, y, s, cls, size, anchor) {
    add('<text x="' + x + '" y="' + y + '" class="' + cls + '"' + (size ? ' font-size="' + size + '"' : '') + ' text-anchor="' + (anchor || 'middle') + '">' + s + '</text>');
  }
  function screws(x, y, w, h) { add(PN.screw(x + 4, y + 4, 30) + PN.screw(x + w - 4, y + 4, 75) + PN.screw(x + 4, y + h - 4, 115) + PN.screw(x + w - 4, y + h - 4, 160)); }
  function plate(x, y, w, h) { r(x, y, w, h, 'pn-bg', 2.5); r(x + 0.6, y + 0.6, w - 1.2, h - 1.2, 'pn-bevel', 2.2); screws(x, y, w, h); }
  function glass(x, y, w, h) { r(x, y, w, h, 'glass', 1); }

  function panel(id, x, y, scale) {
    var p = PN.P[id], s = scale || 1, label = p.name || p.title || p.desc.split(':')[0];
    if (p.blank || p.deco) {
      add('<g transform="translate(' + x + ' ' + y + ')' + (s !== 1 ? ' scale(' + s + ')' : '') + '">' + PN.render(id) + '</g>');
      return p.h * s;
    }
    add('<g class="hot" data-panel="' + id + '" tabindex="0" role="button" aria-label="Expand ' + label + ' panel" transform="translate(' + x + ' ' + y + ')' + (s !== 1 ? ' scale(' + s + ')' : '') + '">');
    add(PN.render(id));
    add('<rect width="' + p.w + '" height="' + p.h + '" rx="3" class="hot-ring"/>');
    add('</g>');
    return p.h * s;
  }
  /* -------------------------------------------------------------- overhead */
  // Overhead geometry: centre column 300 wide, side columns 168, 3 between plates.
  var G = 3, CW = 300, SW = 168, CX = 300, LX = CX - G - SW, RX = CX + CW + G;
  var at = {};
  function place(id, x, y) { at[id] = y; return panel(id, x, y); }
  function column(ids, x, y) { ids.forEach(function (id) { y += place(id, x, y) + G; }); return y; }
  function blank(x, y, w, h) { if (h > 6) plate(x, y, w, h); }
  function frame(y0, y1) { add('<rect x="' + (LX - 7) + '" y="' + y0 + '" width="' + (SW * 2 + CW + G * 2 + 14) + '" height="' + (y1 - y0) + '" rx="7" class="dk-frame"/>'); }

  // Aft overhead: ELT and cockpit door, circuit breakers, maintenance panel.
  function aftOverhead() {
    var top = 18, start = out.length;
    add('');
    var yl = column(['ELT', 'READL'], LX, top);
    var yc = column(['CB'], CX, top);
    place('AFTBOTTOM', CX, yc);
    panel('AUDIOSW', CX + CW - 74, yc + 3);
    yc += PN.P.AFTBOTTOM.h + G;
    var yr = column(['MAINT', 'READR', 'DLS'], RX, top);
    var bottom = Math.max(yl, yc, yr);
    blank(LX, yl, SW, bottom - G - yl); blank(RX, yr, SW, bottom - G - yr);
    out[start] = '<rect x="' + (LX - 7) + '" y="' + (top - 7) + '" width="' + (SW * 2 + CW + G * 2 + 14) + '" height="' + (bottom - top + 11) + '" rx="7" class="dk-frame"/>';
    // the red HIGH VOLTAGE strip above the breakers
    r(CX + 105, top + 2, 90, 7, 'dk-red-strip', 1.5); tx(CX + 150, top + 7.4, 'HIGH VOLTAGE INSIDE', 'dk-warnlbl', 4.2);
    return bottom;
  }

  // Forward overhead, laid out as on the aircraft. Returns the bottom edge.
  function fwdOverhead(top) {
    var start = out.length;
    add('');
    var yc = column(['BLANKC', 'FIRE', 'HYD', 'FUEL', 'ELEC', 'AIR'], CX, top);
    place('ANTIICE', CX, yc); place('CABPRESS', CX + PN.P.ANTIICE.w, yc);
    yc += PN.P.ANTIICE.h + G;
    yc = column(['LOWER'], CX, yc);
    var yl = column(['PA', 'ADIRS', 'BLANKL', 'FLTCTL1', 'EVAC', 'EMERELEC', 'GPWS', 'RCDR', 'OXY', 'CALLS'], LX, top);
    var wl = PN.P.WIPERL.h, bottom = Math.max(yc, yl + wl + G);
    blank(LX, yl, SW, bottom - wl - 2 * G - yl);
    place('WIPERL', LX, bottom - G - wl);
    // Right column: ACP 3 at the top, FLT CTL level with ELEC, CARGO SMOKE within AIR COND, wiper at the bottom.
    var yr = column(['ACP3'], RX, top);
    blank(RX, yr, SW, at.ELEC + 8 - G - yr);
    yr = column(['FLTCTL2'], RX, at.ELEC + 8);
    var cy = at.AIR + 18;
    blank(RX, yr, SW, cy - G - yr);
    yr = column(['CARGO', 'VENT', 'MANSTART'], RX, cy);
    var wr = PN.P.WIPERR.h;
    blank(RX, yr, SW, bottom - wr - 2 * G - yr);
    place('WIPERR', RX, bottom - G - wr);
    out[start] = '<rect x="' + (LX - 7) + '" y="' + (top - 7) + '" width="' + (SW * 2 + CW + G * 2 + 14) + '" height="' + (bottom - top + 11) + '" rx="7" class="dk-frame"/>';
    return bottom;
  }

  /* ----------------------------------------------------- glareshield + MIP */
  function pfd(x, y, s, uid) {
    var cx = x + s / 2, cy = y + s * 0.47, id = 'pfdclip' + uid;
    r(x - 5, y - 5, s + 10, s + 10, 'dk-bezel', 3); r(x, y, s, s, 'dk-screen', 1);
    add('<clipPath id="' + id + '"><rect x="' + (x + 24) + '" y="' + (y + 18) + '" width="' + (s - 50) + '" height="' + (s - 40) + '" rx="10"/></clipPath>');
    add('<g clip-path="url(#' + id + ')">');
    r(x, y, s, cy - y, 'dk-sky'); r(x, cy, s, s, 'dk-ground');
    l(x, cy, x + s, cy, 'dk-horizon');
    [-20, -10, 10, 20].forEach(function (p) { var py = cy - p * 1.2, hw = Math.abs(p) === 10 ? 9 : 13; l(cx - hw, py, cx + hw, py, 'dk-ladder'); tx(cx - hw - 4, py + 1.4, Math.abs(p), 'dk-ladtxt', 3.4); });
    [-5, 5, -15, 15].forEach(function (p) { var py = cy - p * 1.2; l(cx - 4, py, cx + 4, py, 'dk-ladder'); });
    add('</g>');
    add('<path d="M' + (cx - 28) + ' ' + (y + 22) + ' A 34 34 0 0 1 ' + (cx + 28) + ' ' + (y + 22) + '" class="dk-arc"/>');
    add('<path d="M' + cx + ' ' + (y + 16) + ' l-3 -5 l6 0 z" class="dk-yellow"/>');
    r(cx - 22, cy - 1.2, 13, 2.4, 'dk-aplane'); r(cx + 9, cy - 1.2, 13, 2.4, 'dk-aplane'); r(cx - 1.5, cy - 1.5, 3, 3, 'dk-aplane');
    r(x + 3, y + 18, 17, s - 40, 'dk-tape');
    [0, 1, 2, 3].forEach(function (i) { var py = y + 30 + i * 16; tx(x + 13, py, 300 - i * 20, 'dk-tapetxt', 4, 'end'); l(x + 15, py - 1.5, x + 20, py - 1.5, 'dk-tick'); });
    l(x + 2, cy, x + 24, cy, 'dk-yline');
    add('<path d="M' + (x + 20) + ' ' + (cy - 3) + ' l4 3 l-4 3 z" class="dk-yellow"/>');
    r(x + s - 26, y + 18, 18, s - 40, 'dk-tape');
    [0, 1, 2].forEach(function (i) { tx(x + s - 10, y + 32 + i * 24, ['360', '350', '340'][i], 'dk-tapetxt', 4, 'end'); });
    r(x + s - 30, cy - 5, 24, 10, 'dk-altbox'); tx(x + s - 9, cy + 2, '35000', 'dk-alttxt', 4.4, 'end');
    l(x + s - 4, y + 26, x + s - 4, y + s - 26, 'dk-tick');
    for (var i = 1; i < 5; i++) l(x + 4 + i * (s - 8) / 5, y + 2, x + 4 + i * (s - 8) / 5, y + 13, 'dk-fmaline');
    tx(x + 15, y + 9, 'MACH', 'dk-fma', 3.6); tx(x + 37, y + 9, 'ALT CRZ', 'dk-fma', 3.6); tx(x + 60, y + 9, 'NAV', 'dk-fma', 3.6); tx(x + 82, y + 9, 'CAT3', 'dk-fmaw', 3.6); tx(x + 104, y + 9, 'AP1', 'dk-fmaw', 3.6);
    r(cx - 30, y + s - 18, 60, 12, 'dk-tape');
    ['31', '32', '33', '34', '35'].forEach(function (h, i) { tx(cx - 24 + i * 12, y + s - 9, h, 'dk-tapetxt', 3.8); });
    l(cx, y + s - 20, cx, y + s - 6, 'dk-yline');
    glass(x, y, s, s);
  }
  function nd(x, y, s) {
    var cx = x + s / 2, cy = y + s - 16, R = s * 0.62;
    r(x - 5, y - 5, s + 10, s + 10, 'dk-bezel', 3); r(x, y, s, s, 'dk-screen', 1);
    add('<path d="M' + (cx - R * 0.94) + ' ' + (cy - R * 0.34) + ' A ' + R + ' ' + R + ' 0 0 1 ' + (cx + R * 0.94) + ' ' + (cy - R * 0.34) + '" class="dk-arc"/>');
    add('<path d="M' + (cx - R * 0.47) + ' ' + (cy - R * 0.17) + ' A ' + R / 2 + ' ' + R / 2 + ' 0 0 1 ' + (cx + R * 0.47) + ' ' + (cy - R * 0.17) + '" class="dk-arc dk-arc-dash"/>');
    for (var a = -60; a <= 60; a += 10) {
      var rad = (a - 90) * Math.PI / 180, len = a % 30 ? 3 : 5;
      l(cx + R * Math.cos(rad), cy + R * Math.sin(rad), cx + (R - len) * Math.cos(rad), cy + (R - len) * Math.sin(rad), 'dk-tick');
      if (a % 30 === 0) tx(cx + (R - 10) * Math.cos(rad), cy + (R - 10) * Math.sin(rad) + 1.5, String((33 + a / 10 + 36) % 36 || 36), 'dk-ndtxt', 4.4);
    }
    add('<path d="M' + cx + ' ' + (cy - R - 2) + ' l-3 -4 l6 0 z" class="dk-yellow"/>');
    add('<polyline points="' + cx + ',' + cy + ' ' + (cx + 6) + ',' + (cy - 30) + ' ' + (cx + 18) + ',' + (cy - 58) + ' ' + (cx - 4) + ',' + (cy - 86) + '" class="dk-route"/>');
    add('<path d="M' + (cx + 18) + ' ' + (cy - 62) + ' l4 4 l-4 4 l-4 -4 z" class="dk-wpt"/>'); tx(cx + 25, cy - 56, 'BIBOS', 'dk-ndtxtw', 3.6, 'start');
    add('<path d="M' + (cx - 4) + ' ' + (cy - 90) + ' l4 4 l-4 4 l-4 -4 z" class="dk-wpt"/>');
    add('<path d="M' + (cx - 7) + ' ' + (cy + 1) + ' l7 -3 l7 3 M' + cx + ' ' + (cy - 7) + ' L' + cx + ' ' + (cy + 6) + '" class="dk-acft"/>');
    tx(x + 4, y + 8, 'GS 452 TAS 468', 'dk-ndtxtw', 3.4, 'start'); tx(x + 4, y + 14, '275/42', 'dk-ndtxtg', 3.4, 'start');
    tx(x + s - 4, y + 8, 'BIBOS', 'dk-ndtxtw', 3.6, 'end'); tx(x + s - 4, y + 14, '036° 21NM', 'dk-ndtxtg', 3.4, 'end');
    glass(x, y, s, s);
  }
  function ecamScreen(x, y, s, svgStr) {
    r(x - 5, y - 5, s + 10, s + 10, 'dk-bezel', 3);
    add(svgStr.replace('<svg ', '<svg x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" '));
    glass(x, y, s, s);
  }

  // Displays are drawn at 116 units and scaled to the screen size used here.
  var DS = 96;
  function screen(fn, x, y, uid) {
    add('<g transform="translate(' + x + ' ' + y + ') scale(' + (DS / 116).toFixed(4) + ')">'); fn(0, 0, 116, uid); add('</g>');
  }

  /* Glareshield and main instrument panel, laid out from photos/lower. */
  function mainPanel(ecam) {
    add('<path d="M14 1222 L14 1150 Q16 1128 60 1124 L840 1124 Q884 1128 886 1150 L886 1222 Z" class="dk-glare"/>');
    panel('GSL', 29, 1132); panel('EFISL', 142, 1132); panel('FCU', 315, 1132); panel('EFISR', 588, 1132); panel('GSR', 761, 1132);
    add('<path d="M12 1222 L888 1222 L888 1460 L12 1460 Z" class="dk-mip"/>');
    l(12, 1223, 888, 1223, 'dk-mip-edge');
    panel('LATL', 18, 1228, 74 / 120); panel('LATR', 808, 1228, 74 / 120);
    screen(pfd, 99, 1233, 'l'); screen(nd, 205, 1233, 'l');
    screen(nd, 599, 1233, 'r'); screen(pfd, 705, 1233, 'r');
    ecamScreen(402, 1233, DS, ecam.ewd);
    ecamScreen(402, 1346, DS, ecam.sd);
    panel('ISISP', 309, 1228); panel('DCDU1', 309, 1401);
    panel('AUTOBRK', 507, 1228); panel('CLOCK', 507, 1293, 0.7); panel('LGLEVER', 507, 1343); panel('DCDU2', 507, 1401);
    // Knee panels under the PFD and ND: pull-out table and air outlet, loudspeaker grille.
    [[94, 212], [594, 212]].forEach(function (q) {
      r(q[0] + 10, 1352, q[1] - 20, 8, 'dk-recess', 3); r(q[0] + 18, 1354, q[1] - 36, 3, 'dk-rail', 1.5);
      r(q[0] + 4, 1376, q[1] - 8, 76, 'dk-knee', 4);
    });
    c(52, 1340, 13, 'dk-vent'); c(52, 1340, 8, 'dk-vent-in'); c(848, 1340, 13, 'dk-vent'); c(848, 1340, 8, 'dk-vent-in');
    grille(20, 1372, 62, 80); grille(818, 1372, 62, 80);
  }
  function grille(x, y, w, h) {
    r(x, y, w, h, 'dk-grille', 4);
    for (var gy = y + 4; gy < y + h - 2; gy += 3.2) for (var gx = x + 4 + ((gy - y) % 6.4 ? 1.6 : 0); gx < x + w - 2; gx += 3.2) c(gx, gy, 0.8, 'dk-grille-hole');
  }

  /* -------------------------------------------------------------- pedestal */
  function pedestal() {
    add('<path d="M266 1456 L634 1456 L634 1830 L596 1834 L596 2056 L304 2056 L304 1834 L266 1830 Z" class="dk-frame"/>');
    panel('MCDU1', 272, 1462); panel('MCDU2', 524, 1462);
    panel('SWITCHING', 380, 1462); panel('ECP', 380, 1510);
    plate(380, 1564, 140, 12);
    panel('THR', 389, 1579, 0.87);
    panel('RMP1', 272, 1621, 1.04); panel('RMP2', 524, 1621, 1.04);
    panel('ACP1', 272, 1688.5, 104 / 168); panel('ACP2', 524, 1688.5, 104 / 168);
    panel('FLOODL', 272, 1731); panel('WXR', 272, 1768);
    panel('FLOODR', 494, 1731); panel('ATC', 494, 1768);
    add('<path d="M410 1731 L490 1731 L486 1759 L414 1759 Z" class="dk-quadbase"/>');
    panel('ENGPED', 408, 1762);
    panel('SPDBRK', 312, 1832); panel('RUDTRIM', 413, 1832); panel('FLAPS', 490, 1832);
    panel('DOOR', 312, 1903); panel('PRINTER', 490, 1903);
    panel('BLANKP1', 312, 1948); panel('PARKBRK', 413, 1943); panel('BLANKP1', 490, 1948);
    panel('BLANKP1', 312, 1991); panel('GRAVITY', 413, 1986); panel('STOW', 490, 1991);
    r(312, 2036, 132, 14, 'dk-footrest', 3); r(456, 2036, 132, 14, 'dk-footrest', 3);
    for (var i = 0; i < 2; i++) for (var k = 0; k < 12; k++) l(318 + i * 144 + k * 10, 2039, 318 + i * 144 + k * 10, 2047, 'dk-footrest-rib');
  }

  // The pedestal is drawn larger than the panels above it, so its small
  // controls read well; the side consoles sit beside its lower part.
  var PED_SCALE = 1.45, PED_TOP = 1456;
  function build(opts) {
    out = [];
    add('');
    add(PN.defs());
    var aftBottom = aftOverhead();
    var shift = fwdOverhead(aftBottom + 18) + 12 - 1128;
    var bottom = PED_TOP + (2058 - PED_TOP) * PED_SCALE + shift;
    add('<g transform="translate(0 ' + shift.toFixed(1) + ')">');
    mainPanel(opts.ecam);
    add('<g transform="translate(450 ' + PED_TOP + ') scale(' + PED_SCALE + ') translate(-450 -' + PED_TOP + ')">');
    pedestal();
    add('</g>');
    var consY = PED_TOP + (1838 - PED_TOP) * PED_SCALE;
    panel('CONSL', 18, consY, 0.95); panel('CONSR', 663.5, consY, 0.95);
    add('</g>');
    add('</svg>');
    out[0] = '<svg viewBox="16 6 868 ' + bottom.toFixed(0) + '" class="deck" role="group" aria-label="A320 flight deck overview. Tap a panel to expand it.">';
    return out.join('');
  }

  window.ECAM_DECK = { build: build };
})();
