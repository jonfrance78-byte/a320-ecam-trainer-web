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
  var out, STATES = {};
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
    add(PN.render(id, { states: STATES[id] }));
    add('<rect width="' + p.w + '" height="' + p.h + '" rx="3" class="hot-ring"/>');
    // Keys that work on the deck itself (drawn above the highlight, so clicks reach them):
    // the ECAM page keys change the SD page; MASTER WARN/CAUT and CLR serve the failure drills.
    // FCU (owner's request, 0.7.18): its knobs and buttons work on the deck too; a tap
    // on the windows still expands the panel.
    if (id === 'FCU') p.items.forEach(function (it, i) {
      var b = it.k === 'knob' ? [it.x - it.r - 2, it.y - it.r - 2, it.r * 2 + 4, it.r * 2 + 4] : it.k === 'ring' ? [it.x - 15, it.y - it.r - 11, 30, 9] :
        it.k === 'pb' ? [it.x - (it.w || it.s) / 2 - 2, it.y - it.s / 2 - 2, (it.w || it.s) + 4, it.s + 4] : null;
      if (b) add('<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" rx="2" class="fcukey' + (it.fcu ? ' turn' : '') + '" data-fcu="' + i + '"><title>' + PN.ctlName(it) + '</title></rect>');
    });
    p.items.forEach(function (it) {
      if (!it.sdPage && !it.sdAll && !it.deckKey) return;
      var key = it.deckKey || (it.sdAll ? 'ALL' : it.sdPage), w = it.w || it.s;
      add('<rect x="' + (it.x - w / 2 - 1) + '" y="' + (it.y - it.s / 2 - 1) + '" width="' + (w + 2) + '" height="' + (it.s + 2) + '" rx="1" class="sdkey" data-sd="' + key + '"><title>' + (it.deckKey ? (it.name || key) : it.sdAll ? 'ALL pages' : it.sdPage + ' page') + '</title></rect>');
    });
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
  // A display unit (PFD, ND, E/WD, SD): bezel, the screen's SVG and glass. Tapping it
  // opens the display full screen.
  function screen(id, x, y, s, svgStr, label) {
    add('<g class="hot" data-panel="' + id + '" tabindex="0" role="button" aria-label="Expand ' + label + '">');
    r(x - 5, y - 5, s + 10, s + 10, 'dk-bezel', 3);
    add(svgStr.replace('<svg ', '<svg x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" data-screen="' + id + '" '));
    glass(x, y, s, s);
    add('<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" rx="1" class="hot-ring"/>');
    add('</g>');
  }

  /* Glareshield and main instrument panel, laid out from photos/lower. The
   * Captain's PFD and ND fill the left half; the centre panel (ISIS, E/WD, SD,
   * gear, autobrake, clock, DCDUs) is drawn larger on the right, in place of
   * the F/O's displays. Returns the bottom edge of the main panel. */
  var EFIS_S = 150, CTR_SCALE = 1.45, CTR_X = 466;
  function mainPanel(ecam) {
    add('<path d="M14 1222 L14 1150 Q16 1128 60 1124 L840 1124 Q884 1128 886 1150 L886 1222 Z" class="dk-glare"/>');
    panel('GSL', 29, 1132); panel('EFISL', 142, 1132); panel('FCU', 315, 1132); panel('EFISR', 588, 1132); panel('GSR', 761, 1132);
    var bottom = 1228 + 219 * CTR_SCALE + 8;
    add('<path d="M12 1222 L888 1222 L888 ' + bottom + ' L12 ' + bottom + ' Z" class="dk-mip"/>');
    l(12, 1223, 888, 1223, 'dk-mip-edge');
    panel('LATL', 18, 1228, 0.8);
    screen('PFD', 123, 1233, EFIS_S, ecam.pfd, 'PFD'); screen('ND', 287, 1233, EFIS_S, ecam.nd, 'ND');
    c(66, 1350, 14, 'dk-vent'); c(66, 1350, 9, 'dk-vent-in');
    // Centre panel, scaled up about its own layout (drawn from x 309, y 1228)
    add('<g transform="translate(' + CTR_X + ' 1228) scale(' + CTR_SCALE + ') translate(-309 -1228)">');
    screen('EWD', 402, 1233, 96, ecam.ewd, 'E/WD'); screen('SD', 402, 1346, 96, ecam.sd, 'system display');
    panel('ISISP', 309, 1228); panel('DCDU1', 309, 1401);
    panel('AUTOBRK', 507, 1228); panel('CLOCK', 507, 1293, 0.7); panel('LGLEVER', 507, 1343); panel('DCDU2', 507, 1401);
    add('</g>');
    // Knee panel under the Captain's displays: pull-out table, air outlet, loudspeaker grille.
    r(30, 1400, 404, 9, 'dk-recess', 3); r(44, 1403, 376, 3, 'dk-rail', 1.5);
    r(110, 1420, 330, bottom - 1434, 'dk-knee', 5);
    c(60, bottom - 52, 18, 'dk-vent'); c(60, bottom - 52, 11, 'dk-vent-in');
    grille(22, 1420, 78, bottom - 1500);
    return bottom;
  }
  function grille(x, y, w, h) {
    r(x, y, w, h, 'dk-grille', 4);
    for (var gy = y + 4; gy < y + h - 2; gy += 3.2) for (var gx = x + 4 + ((gy - y) % 6.4 ? 1.6 : 0); gx < x + w - 2; gx += 3.2) c(gx, gy, 0.8, 'dk-grille-hole');
  }

  /* -------------------------------------------------------------- pedestal */
  // Two windows (owner's request): the upper pedestal down to the ENG and ATC panels,
  // and the lower pedestal from the speed brake and flaps down.
  function pedUpper() {
    add('<path d="M266 1456 L634 1456 L634 1830 L266 1830 Z" class="dk-frame"/>');
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
  }
  function pedLower() {
    add('<path d="M304 1826 L596 1826 L596 2056 L304 2056 Z" class="dk-frame"/>');
    panel('SPDBRK', 312, 1832); panel('RUDTRIM', 413, 1832); panel('FLAPS', 490, 1832);
    panel('DOOR', 312, 1903); panel('PRINTER', 490, 1903);
    panel('BLANKP1', 312, 1948); panel('PARKBRK', 413, 1943); panel('BLANKP1', 490, 1948);
    panel('BLANKP1', 312, 1991); panel('GRAVITY', 413, 1986); panel('STOW', 490, 1991);
    r(312, 2036, 132, 14, 'dk-footrest', 3); r(456, 2036, 132, 14, 'dk-footrest', 3);
    for (var i = 0; i < 2; i++) for (var k = 0; k < 12; k++) l(318 + i * 144 + k * 10, 2039, 318 + i * 144 + k * 10, 2047, 'dk-footrest-rib');
  }

  // The pedestal is drawn larger than the panels above it, so its small controls read well.
  var PED_SCALE = 1.45, PED_Y = 1456;
  // The deck is drawn as separate windows (aft overhead, forward overhead, main
  // panel, upper and lower pedestal, side consoles), each its own SVG, so the app can size each one.
  function section(id, title, vb, draw) {
    out = [];
    add(PN.defs());
    draw();
    return { id: id, title: title, w: vb[2], h: vb[3],
      svg: '<svg viewBox="' + vb.join(' ') + '" class="deck" role="group" aria-label="' + title + '. Tap a panel to expand it.">' + out.join('') + '</svg>' };
  }
  function build(opts) {
    STATES = opts.states || {};
    var aftBottom, fwdTop, fwdBottom, mainBottom;
    var secs = [];
    secs.push(section('aft', 'Aft overhead', [116, 5, 668, 0], function () { aftBottom = aftOverhead(); }));
    secs[0].svg = secs[0].svg.replace('viewBox="116 5 668 0"', 'viewBox="116 5 668 ' + (aftBottom + 1).toFixed(0) + '"'); secs[0].h = aftBottom + 1;
    fwdTop = 18;
    secs.push(section('fwd', 'Forward overhead', [116, 5, 668, 0], function () { fwdBottom = fwdOverhead(fwdTop); }));
    secs[1].svg = secs[1].svg.replace('viewBox="116 5 668 0"', 'viewBox="116 5 668 ' + (fwdBottom + 1).toFixed(0) + '"'); secs[1].h = fwdBottom + 1;
    secs.push(section('main', 'Glareshield and main panel', [8, 1118, 884, 0], function () { mainBottom = mainPanel(opts.ecam); }));
    var mh = mainBottom - 1118 + 6;
    secs[2].svg = secs[2].svg.replace('viewBox="8 1118 884 0"', 'viewBox="8 1118 884 ' + mh.toFixed(0) + '"'); secs[2].h = mh;
    // y0, y1, half width of each pedestal window, before scaling
    [['pedU', 'Upper pedestal', 1456, 1830, 184, pedUpper], ['pedL', 'Lower pedestal', 1826, 2056, 146, pedLower]].forEach(function (d) {
      var S = PED_SCALE, pw = d[4] * 2 * S + 12, ph = (d[3] - d[2]) * S + 12;
      secs.push(section(d[0], d[1], [450 - pw / 2, PED_Y + (d[2] - PED_Y) * S - 6, pw, ph], function () {
        add('<g transform="translate(450 ' + PED_Y + ') scale(' + S + ') translate(-450 -' + PED_Y + ')">');
        d[5]();
        add('</g>');
      }));
    });
    secs.push(section('cons', 'Side consoles', [-6, -6, 482, 198], function () { panel('CONSL', 0, 0); panel('CONSR', 246, 0); }));
    return secs;
  }

  window.ECAM_DECK = { build: build };
})();
