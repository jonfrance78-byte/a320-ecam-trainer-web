/* A320 ECAM Trainer: glareshield, main instrument panel, pedestal and side
 * console panels. Laid out from the owner's reference photos of the A320neo
 * flight deck (photos/lower). Added to the panel library in js/panels.js and
 * drawn by the same renderer.
 */
(function () {
  'use strict';

  var PN = window.ECAM_PANELS, P = PN.P, M = PN.MK;
  var pb = M.pb, ann = M.ann, sel = M.sel, knob = M.knob, tog = M.tog, disp = M.disp, ln = M.ln, lb = M.lb, vt = M.vt, rnd = M.rnd, text = M.text, polar = M.polar;

  function raw(svg) { return { k: 'raw', svg: svg }; }
  function part(x, y, w, h, name, info, art, o) { return Object.assign({ k: 'part', x: x, y: y, w: w, h: h, name: name, info: info, art: art }, o || {}); }
  // Pushbutton with its legend on the cap and a light bar above (FCU, EFIS, RMP).
  function cap(x, y, name, info, o) { return pb(x, y, name, '', '', info, Object.assign({ bar: true, capText: true, noFrame: true, s: 9, w: 16 }, o || {})); }
  // Momentary key with its legend on the cap (MCDU, ECAM control panel).
  function key(x, y, name, info, o) { return pb(x, y, name, '', '', info, Object.assign({ rect: true, s: 7, w: 11 }, o || {})); }
  function rect(x, y, w, h, cls, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" class="' + cls + '"/>'; }
  function line(x1, y1, x2, y2, cls) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (cls || 'pn-div') + '"/>'; }
  function t(x, y, s, size, cls, anchor) { return text(x, y, s, cls || 'pn-name', size || 3.6, anchor); }
  /* --------------------------------------------------------- glareshield */
  // Captain's end: MASTER WARN and MASTER CAUT stacked, CHRONO, SIDE STICK PRIORITY.
  function glareEnd(side) {
    var capt = side === 'L', lx = capt ? 30 : 80, cx = capt ? 80 : 30;
    return [
      ann(lx, 27, 'MASTER WARN', 'MASTER:r', 'WARN:r', 'Flashes red with a level 3 warning (a red ECAM warning), with the continuous repetitive chime or a specific aural. Press it to silence the aural and put the light out. The overspeed and stall warnings carry on until the condition ends.', { s: 20, noname: true, master: 'W', deckKey: 'MW' }),
      ann(lx, 53, 'MASTER CAUT', 'MASTER:a', 'CAUT:a', 'Steady amber with a level 2 caution (an amber ECAM caution) and a single chime. Press it to put the light out.', { s: 20, noname: true, master: 'C', deckKey: 'MC' }),
      rnd(cx, 26, 'CHRONO', 'Starts, stops and resets the chronometer shown at the bottom left of the ' + (capt ? 'Captain\'s' : 'F/O\'s') + ' ND.', { s: 13 }),
      lb(cx, 46, 'SIDE STICK PRIORITY', 3.6),
      ann(cx, 62, 'SIDE STICK PRIORITY', capt ? 'CAPT:g' : 'F/O:g', capt ? '→:r' : '←:r',
        'Green ' + (capt ? 'CAPT' : 'F/O') + ': this pilot has priority (takeover pushbutton held or latched) while the other sidestick is out of neutral. Red arrow: the other pilot has taken priority; the arrow points at the pilot who has it. Both green lights flash with DUAL INPUT when both sticks are moved at once.', { s: 15, noname: true })
    ];
  }
  P.GSL = { title: '', name: 'Captain master lights', w: 110, h: 86, tone: 'dark', sys: 'ECAM', desc: 'Captain\'s end of the glareshield: MASTER WARN and MASTER CAUT, CHRONO and the side stick priority light.', items: glareEnd('L') };
  P.GSR = { title: '', name: 'F/O master lights', w: 110, h: 86, tone: 'dark', sys: 'ECAM', desc: 'F/O\'s end of the glareshield: MASTER WARN and MASTER CAUT, CHRONO and the side stick priority light.', items: glareEnd('R') };

  function efis(side) {
    var L = side === 'L', X = function (x) { return L ? x : 170 - x; };
    var btn = [['CSTR', 'Shows the altitude and speed constraints at the flight plan waypoints on the ND (magenta or amber circles).', null],
      ['WPT', 'Shows the database waypoints near the aircraft on the ND. Only one of WPT, VOR.D, NDB and ARPT can be on.', 'efis'],
      ['VOR.D', 'Shows VORs and DMEs from the database on the ND.', 'efis'],
      ['NDB', 'Shows NDBs from the database on the ND.', 'efis'],
      ['ARPT', 'Shows airports from the database on the ND.', 'efis']];
    var items = [];
    btn.forEach(function (b, i) { items.push(cap(X(74 + i * 21), 17, b[0], b[2] ? b[1] : b[1] + ' It can be on together with one of WPT, VOR.D, NDB or ARPT.', { group: b[2], lit: L && i === 0 })); });
    items.push(
      { k: 'win', inl: true, x: X(40), y: 24, w: 38, label: 'QNH', val: '1013', info: 'Barometric reference for the ' + (L ? 'Captain\'s' : 'F/O\'s') + ' PFD, in hPa or inHg. Shows Std when the knob is pulled.' },
      raw(t(X(40) - 11, 47, 'in Hg', 3.4) + t(X(40) + 11, 47, 'hPa', 3.4) + '<path d="M' + (X(40) - 8) + ' 49.5 Q' + X(40) + ' 46 ' + (X(40) + 8) + ' 49.5" class="pn-arc"/>'),
      knob(X(40), 61, 'BARO', '', '', 'Baro reference knob. Turn to set QNH. Pull: standard setting (STD, 1013 hPa / 29.92 inHg). Push: back to QNH. The outer ring changes the units between inHg and hPa.', { r: 9, noname: true }),
      raw(t(L ? 82 : 60, 31, 'ROSE', 3.4)),
      sel(X(96), 49, 'ND MODE', ['LS', 'VOR', 'NAV', 'ARC', 'PLAN'], 3, 'ND mode: ROSE LS, ROSE VOR or ROSE NAV (compass rose, aircraft in the centre), ARC (forward 90° sector), or PLAN (flight plan, north up, centred on the selected waypoint).', { r: 8, light: true, noname: true }),
      sel(X(148), 49, 'ND RANGE', ['10', '20', '40', '80', '160', '320'], 2, 'ND range in nautical miles.', { r: 8, light: true, noname: true }),
      cap(X(30), 79, 'FD', 'Shows or hides the flight director bars on the ' + (L ? 'Captain\'s' : 'F/O\'s') + ' PFD. The green bar is lit while the FD is on.', { s: 8, w: 16, lit: true }),
      cap(X(50), 79, 'LS', 'Shows the ILS localiser and glide slope deviation scales on the PFD (green bar lit).', { s: 8, w: 16 })
    );
    [1, 2].forEach(function (n) {
      items.push(tog(X(L ? (n === 1 ? 100 : 146) : (n === 1 ? 146 : 100)), 71, 'ADF/VOR ' + n, ['ADF', 'OFF', 'VOR'], 1, 'Shows the ' + (n === 1 ? 'single' : 'double') + ' bearing needle for ADF ' + n + ' or VOR ' + n + ' on the ND, or OFF.', { vee: true, num: String(n) }));
    });
    return items;
  }
  P.EFISL = { title: '', name: 'Captain EFIS', w: 170, h: 86, tone: 'dark', sys: null, desc: 'Captain\'s EFIS control panel: baro setting, flight director and ILS display, and the ND mode, range and display options.', items: efis('L') };
  P.EFISR = { title: '', name: 'F/O EFIS', w: 170, h: 86, tone: 'dark', sys: null, desc: 'F/O\'s EFIS control panel: baro setting, flight director and ILS display, and the ND mode, range and display options.', items: efis('R') };

  P.FCU = {
    title: '', name: 'FCU', w: 270, h: 86, tone: 'dark', sys: null,
    desc: 'Flight Control Unit: autopilot, flight director and autothrust engagement, and the speed, heading, altitude and vertical speed targets.',
    items: [
      raw(rect(18, 3, 242, 22, 'disp', 1)),
      { k: 'win', inl: true, x: 41, y: 14, w: 44, label: 'SPD|MACH', val: '---•', fcu: 'spd', info: 'Selected speed (kt) or Mach. Dashes and a dot: speed managed by the FMGS, and the target shows in magenta on the PFD. Pull the SPD knob for a selected speed, push it for managed speed.' },
      { k: 'win', inl: true, x: 89, y: 14, w: 46, label: 'HDG|LAT', val: '---•', fcu: 'hdg', info: 'Selected heading or track. Dashes and a dot: lateral navigation managed (NAV), following the flight plan. LAT shows when NAV is armed or engaged.' },
      { k: 'win', inl: true, x: 138, y: 14, w: 46, label: 'HDG|V/S', val: '', info: 'Shows which references the FCU uses: HDG and V/S, or TRK and FPA, set with the HDG-V/S / TRK-FPA pushbutton.' },
      { k: 'win', inl: true, x: 189, y: 14, w: 52, label: 'ALT|LVL/CH', val: '35000', fcu: 'alt', info: 'FCU selected altitude: the clearance altitude the aircraft climbs or descends to and levels off at. The window always shows a value.' },
      { k: 'win', inl: true, x: 237, y: 14, w: 42, label: 'V/S|FPA', val: '-----', fcu: 'vs', info: 'Selected vertical speed (in 100 ft/min) or flight path angle. Dashes when V/S or FPA is not engaged.' },
      ln([[114, 29], [114, 84]]), ln([[164, 29], [164, 84]]),
      rnd(19, 38, 'SPD MACH', 'Changes the speed target between airspeed and Mach.', { s: 9, noname: true }),
      raw(t(19, 50, 'SPD', 3.2) + t(19, 54, 'MACH', 3.2)),
      knob(45, 52, 'SPD knob', '', '', 'Speed knob. Turn to set a speed. Pull: selected speed (the value shows in the window). Push: managed speed from the FMGS. Here: drag round the knob or tap its left or right side to turn it; tap its centre to push it, or use the buttons below to push or pull.', { r: 11, light: true, noname: true, fcu: 'spd' }),
      knob(89, 52, 'HDG knob', '', '', 'Heading or track knob. Turn to set a heading. Pull: selected HDG or TRK mode. Push: NAV mode (managed lateral guidance along the flight plan). Here: drag round the knob or tap its left or right side to turn it; tap its centre to push it, or use the buttons below to push or pull.', { r: 11, light: true, noname: true, fcu: 'hdg' }),
      cap(89, 78, 'LOC', 'Arms or engages the localiser mode (lateral guidance only, no glide slope).', { s: 8 }),
      raw(t(128, 34, 'HDG', 3.2) + t(128, 38, 'TRK', 3.2) + t(152, 34, 'V/S', 3.2) + t(152, 38, 'FPA', 3.2)),
      rnd(140, 36, 'HDG-V/S / TRK-FPA', 'Switches the FCU references between heading with vertical speed and track with flight path angle. In TRK-FPA the flight path vector (the bird) shows on the PFD.', { s: 9, noname: true }),
      cap(129, 57, 'AP1', 'Engages or disengages autopilot 1 (green bar lit when engaged). Both autopilots can be engaged together only when LOC and G/S (APPR) are armed or engaged, for autoland.', { s: 10, w: 18 }),
      cap(151, 57, 'AP2', 'Engages or disengages autopilot 2 (green bar lit when engaged).', { s: 10, w: 18 }),
      cap(140, 77, 'A/THR', 'Arms or activates autothrust (green bar lit). Push again to disconnect it, though the instinctive disconnect pushbuttons on the thrust levers are the normal way.', { s: 9, w: 18 }),
      raw(t(180, 33, '100', 3.4) + t(200, 33, '1000', 3.4) + '<path d="M182 36 Q190 33 197 36" class="pn-arc"/>'),
      { k: 'ring', x: 189, y: 52, r: 11, cur: 1, name: 'ALT 100/1000', info: 'Ring around the ALT knob: sets whether each click of the knob changes the altitude by 100 ft or 1000 ft. Tap the 100 / 1000 labels to switch.' },
      knob(189, 52, 'ALT knob', '', '', 'Altitude knob. Turn to set the altitude, in 100 or 1000 ft steps chosen with the outer 100/1000 ring. Pull: OPEN CLB or OPEN DES (selected, ignoring the flight plan constraints). Push: CLB or DES (managed, keeping to the constraints). Here: drag round the knob or tap its left or right side to turn it; tap its centre to push it, or use the buttons below to push or pull.', { r: 11, light: true, noname: true, fcu: 'alt' }),
      cap(189, 78, 'EXPED', 'Expedite: climb at green dot speed or descend at 340 kt / M .80, for the highest rate.', { s: 8 }),
      rnd(215, 36, 'METRIC ALT', 'Shows the FCU selected altitude and the aircraft altitude in metres on the PFD as well as in feet.', { s: 9, noname: true }),
      raw(t(215, 48, 'METRIC', 3.2) + t(215, 52, 'ALT', 3.2) + t(246, 34, 'UP', 3.4) + t(246, 73, 'DN', 3.4) + t(263, 46, 'PUSH', 2.6) + t(263, 49.4, 'TO', 2.6) + t(263, 52.8, 'LEVEL', 2.6) + t(263, 56.2, 'OFF', 2.6)),
      knob(242, 53, 'V/S knob', '', '', 'Vertical speed or FPA knob. Turn to set a rate and pull to engage V/S or FPA. Push: level off immediately (V/S zero). Here: drag round the knob or tap its left or right side to turn it; tap its centre to push it, or use the buttons below to push or pull.', { r: 11, light: true, noname: true, fcu: 'vs' }),
      cap(237, 78, 'APPR', 'Arms the approach modes: LOC and G/S for an ILS, or FINAL APP for a non-precision approach from the database. Then the second autopilot can be engaged.', { s: 8 })
    ]
  };

  /* --------------------------------------------- main instrument panel */
  // Lateral panel beside the PFD: AUTO LAND light and display/audio controls.
  function lateral(side) {
    var L = side === 'L', items = [
      ann(95, 17, 'AUTO LAND', 'AUTO:r', 'LAND:r', 'Red AUTO LAND warning light. Flashes in an automatic landing below 200 ft radio altitude if both autopilots disengage, the localiser or glide slope deviation becomes excessive, or the LOC or G/S signal is lost (and in some other failure cases). Go around unless visual.', { s: 16, noname: true }),
      ln([[4, 35], [116, 35]]), ln([[36, 37], [36, 76]]), ln([[78, 37], [78, 76]]), ln([[4, 78], [116, 78]]), ln([[44, 80], [44, 112]]),
      knob(18, 58, 'PFD', 'OFF', 'BRT', 'PFD brightness. OFF switches the PFD off, and the PFD image then moves to the ND display automatically.', { r: 9, light: true }),
      rnd(57, 60, 'PFD/ND\nXFR', 'Swaps the PFD and ND images between the two displays on this side.', { s: 12, jack: true }),
      knob(99, 58, 'ND', 'OFF', 'BRT', 'ND brightness (inner knob). The outer ring sets the brightness of the weather radar or terrain image. OFF switches the ND off.', { r: 9, light: true }),
      knob(21, 96, 'LOUD SPEAKER', 'OFF', 'MAX', 'Cockpit loudspeaker volume. Aural alerts and callouts sound at a fixed level whatever the setting.', { r: 7.5, light: true }),
      tog(62, 97, 'CONSOLE/FLOOR', ['BRT', 'DIM', 'OFF'], 2, 'Console and floor lighting on this side: bright, dim or off.')
    ];
    return L ? items : items.map(function (it) {
      var c = Object.assign({}, it);
      if (c.k === 'ann' || c.k === 'pb' || c.k === 'knob') c.x = 120 - c.x;
      if (c.k === 'tog') c.x = 120 - c.x - 8;
      if (c.pts) c.pts = c.pts.map(function (q) { return [120 - q[0], q[1]]; });
      return c;
    });
  }
  P.LATL = { title: '', name: 'Captain lighting panel', w: 120, h: 114, sys: null, desc: 'Captain\'s lateral main panel: AUTO LAND light, PFD and ND brightness, PFD/ND transfer, loudspeaker and console lighting.', items: lateral('L') };
  P.LATR = { title: '', name: 'F/O lighting panel', w: 120, h: 114, sys: null, desc: 'F/O\'s lateral main panel: AUTO LAND light, PFD and ND brightness, PFD/ND transfer, loudspeaker and console lighting.', items: lateral('R') };

  function isisArt(x, y, w, h) {
    var cx = x + w / 2, cy = y + h * 0.5, o = '';
    o += rect(x, y, w, h, 'scr-bezel', 2) + rect(x + 6, y + 7, w - 12, h - 13, 'dk-screen', 1);
    o += '<clipPath id="isisclip"><rect x="' + (x + 6) + '" y="' + (y + 7) + '" width="' + (w - 12) + '" height="' + (h - 13) + '"/></clipPath><g clip-path="url(#isisclip)">';
    o += rect(x + 6, y + 7, w - 12, cy - y - 7, 'dk-sky') + rect(x + 6, cy, w - 12, h, 'dk-ground-isis');
    o += line(x + 6, cy, x + w - 6, cy, 'dk-horizon');
    [-6, 6].forEach(function (d) { o += line(cx - 4, cy + d, cx + 4, cy + d, 'dk-ladder'); });
    o += '</g>';
    o += rect(x + 7, y + 9, 6, h - 17, 'dk-tape') + rect(x + w - 13, y + 9, 6, h - 17, 'dk-tape');
    o += t(x + 10, cy + 1, '240', 2.2, 'dk-tapetxt') + t(x + w - 10, cy + 1, '370', 2.2, 'dk-tapetxt');
    o += rect(cx - 8, cy - 0.8, 6, 1.6, 'dk-aplane') + rect(cx + 2, cy - 0.8, 6, 1.6, 'dk-aplane');
    o += t(cx, y + 11, '12950 M', 2.4, 'dk-ndtxtg') + t(cx, y + h - 7.5, '1013/29.92', 2.2, 'dk-ndtxt');
    return o;
  }
  var LIMITS = [['LIMIT', 'SPD (IAS)'], ['VLE', '280KT/M.67'], ['VLO EXT', '250KT'], ['RET', '220KT'], ['VFE 1', '230KT'], ['1+F', '215KT'], ['2', '200KT'], ['3', '185KT'], ['FULL', '177KT']];
  function limitPlacard(x, y, w) {
    var o = rect(x, y, w, 40, 'placard', 1);
    LIMITS.forEach(function (r, i) {
      var yy = y + 5 + i * 4.2;
      o += text(x + 2, yy, r[0], 'placard-txt', 3, 'start') + text(x + w - 2, yy, r[1], 'placard-txt', 3, 'end');
      if (i === 3) o += line(x + 2, yy + 1.4, x + w - 2, yy + 1.4, 'placard-rule');
    });
    return o;
  }
  P.ISISP = {
    title: '', name: 'ISIS and limits', w: 84, h: 168, sys: null,
    desc: 'Centre panel, left of the E/WD: SELCAL code plate, the speed limits placard, the ISIS standby instrument and the Captain\'s TERR ON ND pushbutton.',
    items: [
      raw(rect(4, 4, 76, 12, 'plate-in', 1) + t(42, 12, 'SELCAL CODE', 3.8)),
      raw(limitPlacard(32, 20, 48)),
      part(58, 86, 44, 44, 'ISIS', 'Integrated standby instrument system: attitude, airspeed, altitude, Mach and heading, with ILS deviations when LS is on. It has its own air data and inertial sensors and is powered from the DC essential bus (and the hot battery bus), so it keeps working after a total loss of the main displays.', isisArt(36, 64, 44, 44), { kindName: 'Standby instrument' }),
      key(45, 68, 'BUGS', 'Opens the BUGS menu on the ISIS to set speed and altitude reminder bugs.', { s: 4.6, w: 10 }),
      key(71, 68, 'LS', 'Shows the localiser and glide slope deviation scales on the ISIS.', { s: 4.6, w: 10 }),
      key(45, 105, 'RST', 'Attitude reset: hold for 2 s in straight and level flight to realign the ISIS attitude.', { s: 4.6, w: 10 }),
      knob(75, 104, 'ISIS BARO', '', '', 'Sets the ISIS barometric reference. Push for standard (STD).', { r: 4.2, light: true, noname: true }),
      key(39, 80, '+', 'Increases the ISIS brightness.', { s: 6, w: 4 }),
      key(39, 92, '−', 'Decreases the ISIS brightness.', { s: 6, w: 4 }),
      raw(rect(3, 92, 28, 36, 'plate-in', 2) + t(17, 99, 'TERR ON ND', 3.4)),
      pb(17, 112, 'TERR ON ND', '', 'ON:w', 'Shows the EGPWS terrain picture on the Captain\'s ND instead of the weather radar (ON lit). Terrain shows automatically with a terrain caution or warning.', { s: 12, noname: true }),
      raw(rect(38, 116, 40, 44, 'plate-in', 6))
    ]
  };
  function dcduArt(x, y, w, h) {
    return rect(x, y, w, h, 'scr-bezel', 2) + rect(x + 12, y + 4, w - 24, h - 9, 'dk-screen', 1) + line(x + 14, y + h - 14, x + w - 14, y + h - 14, 'dk-scrline') +
      line(x + w / 2 - 10, y + h - 14, x + w / 2 - 10, y + h - 6, 'dk-scrline') + line(x + w / 2 + 10, y + h - 14, x + w / 2 + 10, y + h - 6, 'dk-scrline');
  }
  function dcdu(side) {
    var info = 'Datalink control and display unit (DCDU): shows CPDLC messages exchanged with ATC through the ATSU, and the crew answers them with the keys on its sides.';
    return [
      part(42, 23, 60, 40, 'DCDU', info, dcduArt(12, 3, 60, 40), { kindName: 'Display' }),
      key(6, 9, 'BRT', 'DCDU brightness up.', { s: 5, w: 9 }), key(6, 16, 'DIM', 'DCDU brightness down.', { s: 5, w: 9 }),
      key(6, 26, 'MSG+', 'Next message.', { s: 5, w: 9 }), key(6, 33, 'MSG−', 'Previous message.', { s: 5, w: 9 }),
      key(78, 9, 'PRINT', 'Prints the displayed message.', { s: 5, w: 9 }),
      key(78, 26, 'PGE+', 'Next page of the message.', { s: 5, w: 9 }), key(78, 33, 'PGE−', 'Previous page of the message.', { s: 5, w: 9 })
    ];
  }
  P.DCDU1 = { title: '', name: 'DCDU 1', w: 84, h: 46, sys: null, desc: 'Captain\'s datalink control and display unit (CPDLC messages).', items: dcdu('L') };
  P.DCDU2 = { title: '', name: 'DCDU 2', w: 84, h: 46, sys: null, desc: 'F/O\'s datalink control and display unit (CPDLC messages).', items: dcdu('R') };

  P.AUTOBRK = {
    title: '', name: 'LDG GEAR · AUTO BRK', w: 84, h: 62, sys: 'WHEEL',
    desc: 'Landing gear indicator, autobrake selection and the anti-skid and nose wheel steering switch.',
    items: [
      lb(30, 7, 'LDG GEAR', 4.2),
      ann(14, 17, 'LDG GEAR left main', 'UNLK:r', '▼:g', 'Left main gear. Green triangle: down and locked. Red UNLK: not locked in the position the lever selects. Off: up and locked.', { s: 13, noname: true }),
      ann(30, 17, 'LDG GEAR nose', 'UNLK:r', '▼:g', 'Nose gear. Green triangle: down and locked. Red UNLK: not locked in the position the lever selects. Off: up and locked.', { s: 13, noname: true }),
      ann(46, 17, 'LDG GEAR right main', 'UNLK:r', '▼:g', 'Right main gear. Green triangle: down and locked. Red UNLK: not locked in the position the lever selects. Off: up and locked.', { s: 13, noname: true }),
      lb(30, 31, 'AUTO BRK', 4.2),
      pb(13, 49, 'LO', 'DECEL:g', 'ON', 'Arms LO autobrake for landing: braking starts 4 s after the ground spoilers extend, for a deceleration of 1.7 m/s². Blue ON: armed. Green DECEL: the actual deceleration is at least 80% of the selected rate.', { s: 13, group: 'abrk' }),
      pb(30, 49, 'MED', 'DECEL:g', 'ON', 'Arms MED autobrake for landing: braking starts 2 s after the ground spoilers extend, for 3 m/s². Blue ON: armed. Green DECEL: the deceleration is being achieved.', { s: 13, group: 'abrk' }),
      pb(47, 49, 'MAX', 'DECEL:g', 'ON', 'Arms MAX autobrake for take-off. In a rejected take-off above 72 kt, maximum braking starts as soon as the ground spoilers extend. Blue ON: armed.', { s: 13, group: 'abrk' }),
      ln([[59, 10], [59, 58]]),
      raw(t(71, 11, 'A/SKID &', 3.4) + t(71, 15, 'N/W STRG', 3.4)),
      tog(68, 33, 'A/SKID & N/W STRG', ['ON', 'OFF'], 0, 'ON: anti-skid and nose wheel steering available. OFF: no anti-skid and no nose wheel steering; braking moves to the alternate (yellow) system and the brake pressure has to be watched on the triple indicator.', { noname: true })
    ]
  };

  function clockArt() {
    var o = rect(20, 3, 58, 62, 'scr-bezel', 3);
    o += rect(29, 8, 40, 11, 'lcd', 1) + t(49, 6.5, 'CHR', 3, 'pn-name') + t(39, 22, 'MIN', 2.2) + t(59, 22, 'SEC', 2.2);
    o += t(49, 27, 'UTC', 3) + rect(25, 29, 48, 13, 'lcd', 1) + text(49, 39.4, '08:51 56', 'lcd-txt', 8.4);
    o += t(32, 46, 'HR/MO', 2.2) + t(49, 46, 'MIN/DY', 2.2) + t(66, 46, 'SEC/Y', 2.2);
    o += rect(29, 49, 40, 11, 'lcd', 1) + t(49, 64, 'HR  ET  MIN', 2.4);
    return o;
  }
  P.CLOCK = {
    title: '', name: 'Clock', w: 120, h: 68, sys: null,
    desc: 'Cockpit clock: UTC, date, chronometer and elapsed time.',
    items: [
      part(49, 34, 58, 62, 'Clock displays', 'Top: chronometer (minutes and seconds). Middle: UTC time, or the date while DATE is pressed. Bottom: elapsed time (hours and minutes), often used for flight time.', clockArt(), { kindName: 'Display' }),
      rnd(10, 12, 'RST', 'Resets the chronometer.', { s: 8, noname: true }), raw(t(10, 22, 'RST', 3.2)),
      rnd(88, 12, 'CHR', 'Starts, stops and resets the chronometer (CHR window). The CHRONO pushbutton on the glareshield controls the ND chrono.', { s: 9, noname: true }), raw(t(88, 23, 'CHR', 3.2)),
      rnd(10, 40, 'DATE', 'Shows the date in the UTC window: day and month, then the year.', { s: 8, noname: true }), raw(t(10, 50, 'DATE', 3.2)),
      sel(100, 36, 'UTC source', ['GPS', 'INT', 'SET'], 0, 'GPS: UTC from the GPS. INT: the clock\'s internal time. SET: lets the time be set by hand.', { r: 4.5, noname: true, fs: 2.8 }),
      sel(100, 57, 'ET', ['RUN', 'STP', 'RST'], 1, 'Elapsed time: RUN starts it, STP stops it, RST resets it to zero.', { r: 4.5, noname: true, fs: 2.8 })
    ]
  };

  // Brake triple indicator as in photos/lower: octagonal plate, round dial,
  // ACCU PRESS scale on top (0-4) and the two BRAKES scales below (3-0-3).
  function brakeArt(x, y) {
    var o = '', R = 12.6, arc = function (cx, cy, r, a0, a1, cls) {
      var p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
      return '<path d="M' + p0[0] + ' ' + p0[1] + ' A' + r + ' ' + r + ' 0 0 ' + (a1 > a0 ? 1 : 0) + ' ' + p1[0] + ' ' + p1[1] + '" class="' + cls + '"/>';
    };
    o += '<path d="M' + (x - 8) + ' ' + (y - 15) + ' h16 l7 7 v16 l-7 7 h-16 l-7 -7 v-16 z" class="gauge-plate"/>';
    o += '<circle cx="' + x + '" cy="' + y + '" r="' + R + '" class="gauge-face"/>';
    // ACCU PRESS: arc about a centre below the dial, 0 at the left, 4 at the right
    var ax = x, ay = y + 6, ar = 11;
    o += arc(ax, ay, ar, -38, 38, 'gauge-arc') + arc(ax, ay, ar, 14, 22, 'gauge-green');
    for (var k = 0; k <= 4; k++) { var a = -38 + k * 19, p1 = polar(ax, ay, ar, a), p2 = polar(ax, ay, ar - 1.4, a); o += line(p1[0], p1[1], p2[0], p2[1], 'gauge-tick'); }
    var l0 = polar(ax, ay, ar + 1.8, -40), l4 = polar(ax, ay, ar + 1.8, 40);
    o += t(l0[0], l0[1] + 0.8, '0', 1.9, 'gauge-num') + t(l4[0], l4[1] + 0.8, '4', 1.9, 'gauge-num');
    o += t(x - 6, y - 7, 'ACCU', 1.9, 'gauge-num') + t(x + 6, y - 7, 'PRESS', 1.9, 'gauge-num');
    var an = polar(ax, ay, ar - 0.6, 18);
    o += line(ax, ay - 7.5, an[0], an[1], 'gauge-needle');
    // BRAKES: left 3 .. 0 and right 0 .. 3, zero at the bottom centre
    [[-1, x - 4.6], [1, x + 4.6]].forEach(function (q) {
      var s2 = q[0], cx = q[1], cy = y + 3, r = 6;
      o += arc(cx, cy, r, s2 < 0 ? -80 : 80, s2 < 0 ? -160 : 160, 'gauge-arc');
      o += arc(cx, cy, r, s2 < 0 ? -130 : 130, s2 < 0 ? -160 : 160, 'gauge-green');
      var e3 = polar(cx, cy, r + 1.6, s2 < 0 ? -78 : 78);
      o += t(e3[0], e3[1] + 0.8, '3', 1.9, 'gauge-num');
      var n = polar(cx, cy, r - 0.5, s2 < 0 ? -158 : 158);
      o += line(cx, cy, n[0], n[1], 'gauge-needle');
    });
    o += t(x, y + 9.4, '0', 1.9, 'gauge-num') + t(x, y + 11.4, 'BRAKES', 1.7, 'gauge-num') + t(x, y + 13, 'PSI x 1000', 1.2, 'gauge-num');
    return o;
  }
  P.LGLEVER = {
    title: '', name: 'Gear lever', w: 84, h: 56, sys: 'WHEEL',
    desc: 'Landing gear lever, the F/O\'s TERR ON ND pushbutton and the brake pressure triple indicator.',
    items: [
      raw(rect(8, 4, 34, 49, 'plate-in', 3) + t(33, 10, 'UP', 3.4, 'pn-pos') +
        '<path d="M33 12 l-2.6 4 h1.6 v9 h2 v-9 h1.6 z" class="pn-arrow"/>' +
        '<path d="M33 46 l-2.6 -4 h1.6 v-11 h2 v11 h1.6 z" class="pn-arrow"/>' + t(33, 50.6, 'DOWN', 3.4, 'pn-pos')),
      { k: 'slide', x: 18, y0: 17, y1: 39, pos: ['UP', 'DOWN'], cur: 0, side: 'n', style: 'gear', hw: 14, name: 'Landing gear lever', noname: true, info: 'Landing gear lever. UP retracts and DOWN extends the gear with the green hydraulic system, through the LGCIUs. On the ground a safety interlock stops it being moved up.' },
      raw(t(66, 7, 'TERR ON ND', 3)),
      pb(66, 17, 'TERR ON ND', '', 'ON:w', 'Shows the EGPWS terrain picture on the F/O\'s ND instead of the weather radar (ON lit). Terrain shows automatically with a terrain caution or warning.', { s: 10, noname: true }),
      part(64, 40, 32, 28, 'Brake triple indicator', 'Brake pressure triple indicator for the alternate (yellow) brakes: accumulator pressure on top, left and right brake pressure below, in PSI x 1000. It shows the parking brake pressure on the ground and reads zero with normal braking.', brakeArt(64, 40), { kindName: 'Indicator' })
    ]
  };

  /* ------------------------------------------------------------ pedestal */
  var MENU = [['MCDU MENU', 'w', 1], ['', 'w'], ['<FMGC', 'w'], ['', 'w'], ['<ATSU', 'w'], ['', 'w'], ['<AIDS', 'w'], ['', 'w'], ['<CFDS', 'w'], ['', 'w'], ['', 'w'], ['INITIALIZE WEIGHT/CG', 'a', 1]];
  function mcduScreen(x, y, w, h) {
    var o = rect(x - 1.5, y - 1.5, w + 3, h + 3, 'scr-bezel', 1.5) + rect(x, y, w, h, 'dk-screen', 1);
    MENU.forEach(function (L, i) { if (L[0]) o += text(L[2] ? x + w / 2 : x + 3, y + 6 + i * 4.6, L[0], 'mcdu-' + L[1], 3.5, L[2] ? 'middle' : 'start'); });
    o += text(x + w - 3, y + 10.6, 'SELECT', 'mcdu-w', 2.8, 'end') + text(x + w - 3, y + 14.6, 'NAV B/UP>', 'mcdu-w', 3.2, 'end');
    return o;
  }
  var FKEYS = [['DIR', 'Direct to: fly direct to a waypoint.'], ['PROG', 'Progress page: flight phase, cruise level, distance to destination and navigation accuracy.'], ['PERF', 'Performance pages for the flight phases: speeds, flap retraction, cost index and so on.'], ['INIT', 'Initialisation pages: route, cost index, cruise level, zero fuel weight and block fuel.'], ['DATA', 'Data index: sensor positions, stored waypoints and navaids, and A/C status.'], ['', 'Blank key.'],
    ['F-PLN', 'Flight plan pages: the active route with waypoints, constraints and times.'], ['RAD\nNAV', 'Radio navigation page: VOR, ILS and ADF tuning.'], ['FUEL\nPRED', 'Fuel prediction page: fuel at destination and alternate, and extra fuel.'], ['SEC\nF-PLN', 'Secondary flight plan.'], ['ATC\nCOMM', 'ATC datalink communications.'], ['MCDU\nMENU', 'MCDU menu: choose the system using the MCDU (FMGC, ATSU, AIDS, CFDS).']];
  function mcdu(side) {
    var id = side === 'L' ? 'MCDU1' : 'MCDU2';
    // With js/fmgc.js loaded the screen shows the live FMGC pages.
    var live = function () { var F = window.ECAM_FMGC; return F ? rect(15.5, 9.5, 73, 63, 'scr-bezel', 1.5) + rect(17, 11, 70, 60, 'dk-screen', 1) + F.screen(id, 17.6, 11.4, 68.8, 59.2) : mcduScreen(17, 11, 70, 60); };
    var items = [part(52, 41, 70, 60, 'MCDU screen', 'MCDU screen. Shows the pages of the FMGC, or the ATSU, AIDS or CFDS chosen through MCDU MENU. The bottom line is the scratchpad, where entries are typed before being put into a field with a line select key.', mcduScreen(17, 11, 70, 60), { kindName: 'Display', artFn: live })];
    for (var i = 0; i < 6; i++) {
      items.push(key(7, 21.8 + i * 8.46, 'LSK ' + (i + 1) + 'L', 'Line select key: puts the scratchpad into the field beside it, or selects the prompt there.', { s: 3.6, w: 7, noname: true, blankCap: true }));
      items.push(key(97, 21.8 + i * 8.46, 'LSK ' + (i + 1) + 'R', 'Line select key: puts the scratchpad into the field beside it, or selects the prompt there.', { s: 3.6, w: 7, noname: true, blankCap: true }));
    }
    FKEYS.forEach(function (f, k) { items.push(key(16 + (k % 6) * 12, 81 + Math.floor(k / 6) * 8.4, f[0], f[1], { s: 7, w: 11 })); });
    items.push(key(91, 81, 'BRT', 'Brightens the MCDU screen.', { s: 7, w: 8 }), key(91, 89.4, 'DIM', 'Dims the MCDU screen.', { s: 7, w: 8 }));
    items.push(key(16, 97.8, 'AIR\nPORT', 'Scrolls the flight plan to the next airport.', { s: 7, w: 11 }), key(28, 97.8, '', 'Blank key.', { s: 7, w: 11 }));
    [['←', 'Slew left: previous page of a multi-page set.'], ['↑', 'Slew up: scrolls the page up.'], ['→', 'Slew right: next page.'], ['↓', 'Slew down: scrolls the page down.']].forEach(function (a, k) {
      items.push(key(16 + (k % 2) * 12, 106 + Math.floor(k / 2) * 8, a[0], a[1], { s: 7, w: 11 }));
    });
    var L = 'ABCDEFGHIJKLMNOPQRSTUVWXY'.split('').concat(['Z', '/', 'SP', 'OVFY', 'CLR']);
    L.forEach(function (c, k) {
      var info = c === 'CLR' ? 'Clear: erases the scratchpad, or a field when the scratchpad is empty.' : c === 'OVFY' ? 'Overfly: makes the next waypoint a fly-over waypoint.' : c === 'SP' ? 'Space.' : 'Types ' + c + ' in the scratchpad.';
      items.push(key(51 + (k % 5) * 10, 101.8 + Math.floor(k / 5) * 9.4, c, info, { s: 7, w: 8 }));
    });
    '123456789.0±'.split('').forEach(function (c, k) {
      items.push(key(15.5 + (k % 3) * 10, 123 + Math.floor(k / 3) * 8.6, c, c === '±' ? 'Changes the sign of the entry (+/-).' : 'Types ' + c + ' in the scratchpad.', { s: 7, w: 8 }));
    });
    return items;
  }
  P.MCDU1 = { title: '', name: 'MCDU 1', w: 104, h: 156, tone: 'dark', sys: null, desc: 'Captain\'s multipurpose control and display unit: the crew\'s interface with the flight management system.', items: mcdu('L') };
  P.MCDU2 = { title: '', name: 'MCDU 2', w: 104, h: 156, tone: 'dark', sys: null, desc: 'F/O\'s multipurpose control and display unit: the crew\'s interface with the flight management system.', items: mcdu('R') };

  var SW3 = ['CAPT 3', 'NORM', 'F/O 3'];
  P.SWITCHING = {
    title: 'SWITCHING', w: 140, h: 45, tone: 'dark', sys: null,
    desc: 'Switching panel: replaces a failed ADIRU or display management computer with number 3, and moves the ECAM system display to an ND.',
    items: [
      sel(22, 31, 'ATT HDG', SW3, 1, 'Attitude and heading source. NORM: ADIRU 1 for the Captain, 2 for the F/O. CAPT 3: the Captain\'s displays use ADIRU 3. F/O 3: the F/O\'s displays use ADIRU 3.', { r: 6.5, light: true, fs: 2.8 }),
      sel(54, 31, 'AIR DATA', SW3, 1, 'Air data source. NORM: ADR 1 for the Captain, ADR 2 for the F/O. CAPT 3 or F/O 3: that side uses ADR 3.', { r: 6.5, light: true, fs: 2.8 }),
      sel(86, 31, 'EIS DMC', SW3, 1, 'Display management computer. NORM: DMC 1 drives the Captain\'s displays, DMC 2 the F/O\'s. CAPT 3 or F/O 3: DMC 3 replaces it.', { r: 6.5, light: true, fs: 2.8 }),
      sel(118, 31, 'ECAM/ND XFR', ['CAPT', 'NORM', 'F/O'], 1, 'Moves the ECAM system display (or the E/WD, if it has moved to the lower screen) to the Captain\'s or the F/O\'s ND display.', { r: 6.5, light: true, fs: 2.8 })
    ]
  };

  var PAGES = [['ENG', 'engine'], ['BLEED', 'bleed air'], ['PRESS', 'cabin pressure'], ['ELEC', 'electrical'], ['HYD', 'hydraulic'], ['FUEL', 'fuel'],
    ['APU', 'APU'], ['COND', 'air conditioning'], ['DOOR', 'doors and oxygen'], ['WHEEL', 'wheel, brakes and landing gear'], ['F/CTL', 'flight controls']];
  P.ECP = {
    title: '', name: 'ECAM control panel', w: 140, h: 51, tone: 'dark', sys: 'ECAM',
    desc: 'ECAM control panel: display brightness, system page selection, CLR, STS, RCL and EMER CANC.',
    items: [
      lb(17, 6, 'ECAM', 4.2),
      knob(17, 16, 'UPPER DISPLAY', 'OFF', 'BRT', 'E/WD brightness. OFF switches the upper ECAM display off; the E/WD then moves to the lower display.', { r: 5, light: true, noname: true }),
      knob(17, 38, 'LOWER DISPLAY', 'OFF', 'BRT', 'System display brightness. OFF switches the lower ECAM display off; a system page can then be seen only by holding its key (on the E/WD).', { r: 5, light: true, noname: true }),
      raw(t(17, 10.4, 'UPPER DISPLAY', 2.2) + t(17, 32.4, 'LOWER DISPLAY', 2.2)),
      key(52, 9, 'T.O\nCONFIG', 'Take-off configuration test: simulates take-off power so that a wrong configuration (slats/flaps, pitch trim, speed brakes, parking brake, brake temperature) triggers its warning. T.O CONFIG NORMAL shows on the E/WD if all is correct.', { s: 7, w: 11 }),
      key(93, 9, 'EMER\nCANC', 'For spurious alerts. Warnings: silences the aural for the present warning; the ECAM message and MASTER WARN stay. Cautions: cancels the present caution for the rest of the flight; STATUS then shows CANCELLED CAUTION. RCL brings it back.', { s: 7, w: 11 })
    ].concat(PAGES.map(function (q, i) {
      return key(38 + (i % 6) * 14, 23 + Math.floor(i / 6) * 10, q[0], 'Shows the ' + q[1] + ' system page on the system display (it lights while that page shows). Press again to go back to the automatic page.', { s: 7, w: 11, sdPage: q[0] });
    })).concat([
      key(108, 33, 'ALL', 'Hold to scroll through all the system pages, one per second, and release on the page wanted. Here each press shows the next page.', { s: 7, w: 11, sdAll: true }),
      key(38, 44, 'CLR', 'Clears the ECAM warning or caution once its actions are done, then the STATUS page. Lit while there is something to clear.', { s: 7, w: 11, deckKey: 'CLR', clrKey: true }),
      key(66, 44, 'STS', 'Shows the STATUS page: limitations, inoperative systems and approach procedures. Press again to clear it.', { s: 7, w: 11, sdPage: 'STS' }),
      key(80, 44, 'RCL', 'Recall: shows warnings and cautions that were cleared with CLR or cancelled with EMER CANC. With nothing to recall, NORMAL shows for 5 s.', { s: 7, w: 11 }),
      key(108, 44, 'CLR', 'Second CLR pushbutton, same function.', { s: 7, w: 11, deckKey: 'CLR', clrKey: true })
    ])
  };

  function rmp(n) {
    var items = [
      raw(t(26, 5.4, 'ACTIVE', 3.4) + t(76, 5.4, 'STBY/CRS', 3.4) + line(8, 44.6, 34, 44.6) + t(46, 45.6, 'STBY NAV', 3) + line(58, 44.6, 74, 44.6)),
      disp(26, 13, 34, '118.775', 'ACTIVE', 'Frequency in use on the selected radio.', { amber: true, lbl: ' ' }),
      disp(76, 13, 34, '124.850', 'STBY/CRS', 'Standby frequency, set with the knob. With STBY NAV in use, it shows the course.', { amber: true, lbl: ' ' }),
      key(51, 13, '⇄', 'Transfer: swaps the active and standby frequencies.', { s: 7, w: 10 }),
      cap(15, 26, 'VHF1', 'Selects VHF 1 for tuning on this RMP (green light on).', { s: 7, w: 11, group: 'rmp', lit: n === 1 }),
      cap(28, 26, 'VHF2', 'Selects VHF 2 for tuning on this RMP.', { s: 7, w: 11, group: 'rmp', lit: n === 2 }),
      cap(41, 26, 'VHF3', 'Selects VHF 3 (normally the datalink radio) for tuning.', { s: 7, w: 11, group: 'rmp' }),
      cap(15, 36, 'HF1', 'Selects HF 1 for tuning.', { s: 7, w: 11, group: 'rmp' }),
      ann(28, 36, 'SEL', 'SEL:w', '', 'SEL lights on both RMPs when a radio normally tuned by one RMP is selected on another.', { s: 6, w: 9, noname: true }),
      cap(41, 36, 'HF2', 'Selects HF 2 for tuning.', { s: 7, w: 11, group: 'rmp' }),
      cap(54, 36, 'AM', 'Selects amplitude modulation for HF.', { s: 7, w: 11 }),
      knob(78, 32, 'Tuning knob', '', '', 'Tuning knob for the standby window: outer knob MHz, inner knob kHz.', { r: 7.5, light: true, noname: true }),
      cap(15, 53, 'NAV', 'Back-up radio navigation (under a clear guard on the aircraft): lets the RMPs tune the VOR, ILS and ADF if both FMGCs fail. The green light shows it is selected.', { s: 7, w: 11 }),
      cap(30, 53, 'VOR', 'With NAV selected: the standby window tunes a VOR, and shows its course.', { s: 7, w: 11, group: 'nav' }),
      cap(43, 53, 'ILS', 'With NAV selected: the standby window tunes the ILS, and shows its course.', { s: 7, w: 11, group: 'nav' }),
      cap(64, 53, 'ADF', 'With NAV selected: the standby window tunes the ADF.', { s: 7, w: 11, group: 'nav' }),
      tog(80, 53, 'RMP ' + n, ['ON', 'OFF'], 0, 'Switches RMP ' + n + ' on or off. At OFF the panel goes dark: the frequency windows and the selection lights go out, and its keys do nothing.', { noname: true, power: 1, bat: true, hit: [16, 24] })
    ];
    // RMP keys sit flush in the panel, without the white frame of overhead pushbuttons.
    return items.map(function (it) { return it.k === 'pb' || it.k === 'ann' ? Object.assign({ noFrame: true }, it) : it; });
  }
  P.RMP1 = { title: '', name: 'RMP 1', w: 100, h: 62, tone: 'dark', sys: null, desc: 'Radio management panel 1: tunes the VHF and HF radios, and the navaids as a back-up.', items: rmp(1) };
  P.RMP2 = { title: '', name: 'RMP 2', w: 100, h: 62, tone: 'dark', sys: null, desc: 'Radio management panel 2: tunes the VHF and HF radios, and the navaids as a back-up.', items: rmp(2) };
  P.ACP1 = { title: '', name: 'ACP 1', w: 168, h: 64, tone: 'dark', sys: null, desc: 'Captain\'s audio control panel: transmitter selection, receiver volumes, interphone and PA.', items: [{ k: 'acp', x: 0, y: 0 }] };
  P.ACP2 = { title: '', name: 'ACP 2', w: 168, h: 64, tone: 'dark', sys: null, desc: 'F/O\'s audio control panel: transmitter selection, receiver volumes, interphone and PA.', items: [{ k: 'acp', x: 0, y: 0 }] };

  /* Thrust levers and pitch trim wheels. Detents: TO GA, FLX MCT, CL, 0 (idle), reverse. */
  var THR_POS = ['TO GA', 'FLX MCT', 'CL', 'IDLE', 'REV IDLE', 'MAX REV'], THR_Y = [26, 44, 66, 112, 132, 154];
  function trimArt(x) {
    var o = rect(x - 8, 20, 16, 140, 'trim-well', 4) + rect(x - 6, 22, 12, 136, 'trim-wheel', 5);
    for (var i = 0; i < 19; i++) o += line(x - 6, 26 + i * 7, x + 6, 26 + i * 7, 'trim-grip');
    o += rect(x - 1, 22, 2, 136, 'trim-stripe', 1);
    return o;
  }
  function thrScale() {
    var o = '<path d="M30 168 L30 30 Q30 14 46 12 L94 12 Q110 14 110 30 L110 168 Z" class="thr-body"/>';
    o += '<path d="M40 166 L40 34 Q40 22 52 21 L88 21 Q100 22 100 34 L100 166 Z" class="thr-face"/>';
    o += rect(46, 20, 12, 150, 'thr-gate', 3) + rect(82, 20, 12, 150, 'thr-gate', 3);
    THR_Y.forEach(function (y, i) {
      var lbl = ['TO\nGA', 'FLX\nMCT', 'CL', '0', 'REV', 'FULL'][i].split('\n');
      lbl.forEach(function (s, k) { o += text(70, y + 1.2 + (k - (lbl.length - 1) / 2) * 3.6, s, 'thr-lbl', 3.2); });
      o += line(60, y, 64, y, 'thr-tick') + line(76, y, 80, y, 'thr-tick');
      o += '<path d="M' + 43 + ' ' + (y - 1.5) + ' l2.4 1.5 l-2.4 1.5 z M' + 97 + ' ' + (y - 1.5) + ' l-2.4 1.5 l2.4 1.5 z" class="thr-arrow"/>';
    });
    o += '<path d="M44 66 L44 112 M96 66 L96 112" class="thr-athr-band"/>';
    o += vletters(36, 90, 'A/THR') + vletters(104, 90, 'A/THR');
    for (var d = 0; d < 10; d++) o += text(70, 74 + d * 3.8, String(45 - d * 5), 'thr-deg', 2.4);
    return o;
  }
  function vletters(x, y, s, size, cls) {
    var o = '', n = s.length, step = (size || 3.4) * 1.1;
    for (var i = 0; i < n; i++) o += text(x, y - (n - 1) * step / 2 + i * step + 1.2, s[i], cls || 'thr-athr', size || 3.4);
    return o;
  }
  function thrLever(n, x) {
    return { k: 'slide', x: x, y0: THR_Y[0], y1: THR_Y[5], ys: THR_Y, pos: THR_POS, cur: 2, side: 'n', style: 'thr', hw: 18, athr: n === 1 ? -6 : 6, name: 'Thrust lever ' + n, noname: true,
      info: 'Thrust lever, engine ' + n + '. Detents: TO GA (maximum take-off and go-around thrust), FLX MCT (flexible take-off, or maximum continuous), CL (climb: the normal position with autothrust active, which then sets thrust between idle and climb), 0 (idle), and the reverse range (lift the latch) from reverse idle to full reverse. The red instinctive disconnect pushbutton on the lever disconnects the autothrust.' };
  }
  P.THR = {
    title: '', name: 'Thrust levers', w: 140, h: 172, tone: 'dark', sys: 'ENG', noScrews: true,
    desc: 'Thrust levers with their detents and autothrust range, and the two linked pitch trim wheels.',
    items: [
      raw(thrScale()),
      thrLever(1, 52), thrLever(2, 88),
      part(15, 90, 16, 140, 'Pitch trim wheel', 'Pitch trim wheel (one each side of the levers, linked together). It turns with the automatic pitch trim in flight. Turn it by hand to set the take-off trim from the load sheet, or in mechanical back-up. Using it overrides the electric trim and disconnects the autopilot.', trimArt(15), { kindName: 'Trim wheel' }),
      part(125, 90, 16, 140, 'Pitch trim wheel', 'Pitch trim wheel, linked to the other one. Turn by hand to set the take-off trim; it moves on its own with the automatic trim in flight.', trimArt(125), { kindName: 'Trim wheel' }),
      raw(t(15, 15, 'UP', 3) + t(15, 168, 'DN', 3) + t(125, 15, 'UP', 3) + t(125, 168, 'DN', 3))
    ]
  };

  P.ENGPED = {
    title: '', name: 'ENG panel', w: 84, h: 52, tone: 'dark', sys: 'ENG',
    desc: 'ENG MASTER levers, engine fire and fault lights, and the engine mode selector.',
    items: [
      raw(rect(9, 3, 16, 8, 'eng-tag', 1) + t(17, 6.6, 'ENG', 2.8) + t(17, 10, '1', 3) + rect(59, 3, 16, 8, 'eng-tag', 1) + t(67, 6.6, 'ENG', 2.8) + t(67, 10, '2', 3) + t(42, 9, 'ENG', 4.2) + t(14, 48, '1', 3.4) + t(70, 48, '2', 3.4)),
      tog(16, 22, 'ENG MASTER 1', ['ON', 'OFF'], 0, 'ENG MASTER 1. ON: opens the LP and HP fuel valves and, with the mode selector at IGN/START, begins the automatic start. OFF: closes the fuel valves and resets the FADEC. Lift the lever to move it.', { noname: true, round: true }),
      tog(66, 22, 'ENG MASTER 2', ['ON', 'OFF'], 0, 'ENG MASTER 2. Same function for engine 2.', { noname: true, round: true }),
      sel(42, 30, 'MODE', ['CRANK', 'NORM', 'IGN'], 1, 'Engine mode selector. CRANK: dry or wet crank, no ignition. NORM: ignition selected automatically when needed. IGN/START: starts the engines on the ground; in flight it gives continuous ignition.', { r: 6, light: true, fs: 2.6, noname: true }),
      raw(t(42, 17, 'MODE', 3)),
      ann(24, 43, 'ENG 1 FIRE / FAULT', 'FIRE:r', 'FAULT:a', 'Red FIRE: engine 1 fire warning (with the overhead fire pushbutton). Amber FAULT: engine 1 start fault, or the HP fuel valve position disagrees with the ENG MASTER.', { s: 11, noname: true }),
      ann(60, 43, 'ENG 2 FIRE / FAULT', 'FIRE:r', 'FAULT:a', 'Red FIRE: engine 2 fire warning. Amber FAULT: engine 2 start fault or HP fuel valve disagreement.', { s: 11, noname: true })
    ]
  };

  P.FLOODL = {
    title: '', name: 'Flood and integral lights', w: 134, h: 34, tone: 'dark', sys: null,
    desc: 'Captain\'s side of the pedestal: main panel flood light and integral lighting.',
    items: [
      knob(22, 21, 'FLOOD LT\nMAIN PNL', 'OFF', 'BRT', 'Flood lighting of the main instrument panel, from under the glareshield.', { r: 6.5, light: true }),
      knob(60, 21, 'INTEG LT\nMAIN PNL & PED', 'OFF', 'BRT', 'Integral lighting of the main panel and pedestal panels: their legends and markings.', { r: 6.5, light: true })
    ]
  };
  P.FLOODR = {
    title: '', name: 'Flood light · AIDS · DFDR', w: 134, h: 34, tone: 'dark', sys: null,
    desc: 'F/O\'s side of the pedestal: pedestal flood light, AIDS print and DFDR event.',
    items: [
      knob(31, 21, 'FLOOD LT\nPED', 'OFF', 'BRT', 'Pedestal flood lighting.', { r: 6.5, light: true }),
      rnd(64, 22, 'AIDS\nPRINT', 'Prints the AIDS (aircraft integrated data system) report on the cockpit printer.', { s: 9, jack: true }),
      rnd(98, 22, 'DFDR\nEVENT', 'Puts an event mark on the flight data recorder, for maintenance or incident analysis.', { s: 9, jack: true })
    ]
  };

  P.WXR = {
    title: '', name: 'Weather radar', w: 134, h: 52, tone: 'dark', sys: null,
    desc: 'Weather radar and predictive windshear control panel.',
    items: [
      vt(5, 26, 'WXR', 3.6), vt(101, 26, 'WXR', 3.6),
      sel(20, 15, 'CAPT DISPLAY', ['OFF', 'ALL', 'PATH', 'MAP'], 1, 'Radar picture on the Captain\'s ND. ALL: all weather. PATH: only weather on the flight path. MAP: ground mapping. OFF: no radar picture.', { r: 4.5, light: true, fs: 2.4 }),
      knob(20, 36, 'ELEVN', 'UP', '', 'Antenna elevation (tilt) for the Captain\'s picture, used in manual mode.', { r: 4, light: true, noname: true }),
      raw(t(28, 33, 'ELEVN', 2.4)),
      sel(51, 13, 'WXR/PWS', ['OFF', '1', '2'], 1, 'Selects radar system 1 or 2, with predictive windshear (PWS), or OFF.', { r: 3.8, fs: 2.6, light: true }),
      cap(42, 28, 'TURB', 'Shows turbulence areas (magenta) on the ND, within 40 NM.', { s: 6, w: 12, cs: 2.6 }),
      cap(58, 28, 'HZD', 'Shows predicted weather hazards (hail and lightning) on the ND.', { s: 6, w: 12, cs: 2.6 }),
      knob(50, 39, 'GAIN', 'MIN', 'MAX', 'Radar receiver gain. Calibrated (CAL or AUTO) for normal use.', { r: 4, light: true, noname: true }),
      sel(84, 15, 'F/O DISPLAY', ['OFF', 'ALL', 'PATH', 'MAP'], 1, 'Radar picture on the F/O\'s ND: ALL, PATH, MAP or OFF.', { r: 4.5, light: true, fs: 2.4 }),
      knob(84, 36, 'ELEVN F/O', 'UP', '', 'Antenna elevation (tilt) for the F/O\'s picture.', { r: 4, light: true, noname: true })
    ]
  };

  var KP = ['1', '2', '3', '4', '5', '6', '7', '0', 'CLR'];
  P.ATC = {
    title: '', name: 'ATC / TCAS', w: 134, h: 52, tone: 'dark', sys: null,
    desc: 'ATC transponder and TCAS control panel.',
    items: [
      sel(13, 14, 'ATC mode', ['STBY', 'AUTO', 'ON'], 1, 'Transponder mode. AUTO: replies when airborne. ON: always replies. STBY: no replies.', { r: 3.6, fs: 2.4, noname: true, light: true }),
      sel(13, 36, 'ATC SYS', ['1', '2'], 0, 'Selects transponder 1 or 2.', { r: 3.4, fs: 2.4, noname: true, light: true }),
      raw(t(13, 46.5, 'ATC', 2.6) + t(34, 7, 'ALT RPTG', 2.4) + t(34, 37, 'IDENT', 2.4)),
      tog(32, 19, 'ALT RPTG', ['ON', 'OFF'], 0, 'Altitude reporting by the transponder (mode C/S).', { noname: true }),
      rnd(34, 43, 'IDENT', 'Sends the identification pulse (SPI) for about 18 s when ATC asks you to squawk ident.', { s: 7, noname: true }),
      ann(64, 6.5, 'ATC FAIL', 'FAIL:a', '', 'Amber: the selected transponder has failed.', { s: 5, w: 11, noname: true }),
      disp(106, 12, 26, '2000', 'Code', 'Squawk code of the selected transponder. Type a new code with the keypad: four digits.', { amber: true, lbl: ' ', code: true })
    ].concat(KP.map(function (d, i) {
      return key(54 + (i % 3) * 10, 17 + Math.floor(i / 3) * 10, d, d === 'CLR' ? 'Clears the code being typed.' : 'Types ' + d + ' into the squawk code (digits 0 to 7).', { s: 7, w: 8, code: d });
    })).concat([
      raw(t(106, 26, 'TCAS', 2.8)),
      sel(95, 42, 'TCAS traffic', ['THRT', 'ALL', 'ABV', 'BLW'], 1, 'TCAS traffic shown on the ND. THRT: only intruders that cause a TA or RA. ALL: traffic within 2700 ft above and below. ABV: 9900 ft above to 2700 ft below. BLW: 2700 ft above to 9900 ft below.', { r: 3.8, fs: 2.4, noname: true, light: true }),
      sel(120, 42, 'TCAS mode', ['STBY', 'TA', 'TA/RA'], 2, 'TCAS mode. TA/RA: normal, with traffic and resolution advisories. TA: traffic advisories only (for example with an engine out). STBY: TCAS off.', { r: 3.8, fs: 2.4, noname: true, light: true })
    ])
  };

  /* ------------------------------------------------------ lower pedestal */
  P.SPDBRK = {
    title: '', name: 'Speed brake', w: 98, h: 68, tone: 'dark', sys: 'F/CTL',
    desc: 'Speed brake lever: in-flight speed brakes and ground spoiler arming.',
    items: [
      raw(t(40, 34, 'SPEED', 4.4) + t(40, 39.4, 'BRAKE', 4.4)),
      { k: 'slide', x: 78, y0: 12, y1: 58, pos: ['RET', '1/2', 'FULL'], cur: 0, side: 'b', hw: 12, hh: 9, fs: 3.2, name: 'SPEED BRAKE', noname: true,
        info: 'Speed brake lever. RET: retracted; pull the lever up at RET to ARM the ground spoilers for take-off and landing. Moving it back towards FULL extends the speed brakes in flight (spoilers 2 to 4) in proportion.' }
    ]
  };
  P.FLAPS = {
    title: '', name: 'Flaps', w: 98, h: 68, tone: 'dark', sys: 'F/CTL',
    desc: 'Slats and flaps control lever.',
    items: [
      raw(t(62, 37, 'FLAPS', 4.4)),
      { k: 'slide', x: 26, y0: 12, y1: 58, pos: ['0', '1', '2', '3', 'FULL'], cur: 0, side: 'b', hw: 14, hh: 10, fs: 3.2, name: 'FLAPS', noname: true,
        info: 'Flaps lever: 0, 1, 2, 3 and FULL. Pull the lever out of its detent to move it. In position 1 the configuration is 1+F (slats and flaps) below 100 kt and for take-off, and 1 (slats only) in flight. The slats and flaps move together on each selection.' }
    ]
  };
  P.RUDTRIM = {
    title: '', name: 'Rudder trim', w: 74, h: 108, tone: 'dark', sys: 'F/CTL',
    desc: 'Rudder trim display, rotary switch and reset.',
    items: [
      ln([[4, 42], [70, 42]]), ln([[4, 88], [70, 88]]),
      disp(23, 54, 24, 'R 0.0', 'Rudder trim', 'Rudder trim position in degrees, left or right.', { amber: true, lbl: ' ' }),
      raw(t(51, 50, 'RUD TRIM', 3.6) + t(41, 57, 'NOSE', 2.6) + t(41, 60, 'L', 2.6) + t(61, 57, 'NOSE', 2.6) + t(61, 60, 'R', 2.6)),
      sel(51, 72, 'RUD TRIM', ['L', '', 'R'], 1, 'Rudder trim rotary switch, spring-loaded to neutral. Turn it left or right to trim the rudder at 1° per second. It has no effect with the autopilot engaged.', { r: 7.5, light: true, noname: true, spring: 1, angs: [-50, 0, 50] }),
      rnd(23, 77, 'RESET', 'Returns the rudder trim to zero. It has no effect with the autopilot engaged.', { s: 9 })
    ]
  };
  P.DOOR = {
    title: '', name: 'Cockpit door', w: 98, h: 42, tone: 'dark', sys: null,
    desc: 'Cockpit door control switch and door video.',
    items: [
      lb(36, 7, 'COCKPIT DOOR', 4.2),
      raw(rect(18, 13, 24, 26, 'plate-in', 2)),
      tog(26, 26, 'COCKPIT DOOR', ['UNLOCK', 'NORM', 'LOCK'], 1, 'Spring-loaded to NORM. UNLOCK (hold): unlocks the door to let someone in. NORM: the door stays locked, and an emergency entry code from the keypad unlocks it after a delay unless the crew denies it. LOCK: denies entry and locks out the keypad for a set time.', { noname: true, spring: 1 }),
      rnd(70, 27, 'VIDEO', 'Shows the cockpit door video on the ECAM system display.', { s: 9 })
    ]
  };
  P.PARKBRK = {
    title: '', name: 'Parking brake', w: 74, h: 40, tone: 'dark', sys: 'WHEEL',
    desc: 'Parking brake handle.',
    items: [
      raw(t(24, 9, 'PARKING BRK', 3.8) + t(22, 15, 'PULL & TURN', 2.8) + '<path d="M58 9.2 A16 16 0 0 1 68 24 h2.5" class="pn-arc"/>'),
      sel(52, 24, 'PARKING BRK', ['OFF', 'ON'], 0, 'Parking brake handle: pull and turn. ON: the parking brake is set with the yellow hydraulic system (accumulator pressure), and the normal brakes are disabled. Check the pressure on the brake triple indicator.', { park: true, noname: true, angs: [0, 90], hit: [36, 34] })
    ]
  };
  // Side markings; the crank itself is drawn by drawCrank in js/panels.js.
  function gravityArt() {
    return '<path d="M14 34 A22 22 0 0 1 14 12 M60 12 A22 22 0 0 1 60 34" class="pn-arc"/>' + vletters(8, 23, 'GEAR', 3, 'grav-side') + vletters(66, 23, 'GEAR', 3, 'grav-side');
  }
  P.GRAVITY = {
    title: '', name: 'Gravity gear extension', w: 74, h: 45, tone: 'dark', sys: 'WHEEL',
    desc: 'Landing gear gravity extension hand crank.',
    items: [
      raw(gravityArt()),
      { k: 'crank', x: 37, y: 24, h: 45, name: 'GRAVITY GEAR EXTN', pos: ['STOWED', 'PULLED OUT', '1 TURN', '2 TURNS', '3 TURNS'], cur: 0, kindName: 'Handle', hit: [62, 42],
        info: 'Gravity extension hand crank. Pull the handle up and fold it out, then turn it clockwise three turns when the normal extension fails. It isolates the gear from the green hydraulic system and unlocks the doors and gear, which then fall by gravity and lock down. Turning it back three turns anticlockwise and folding it away resets it. Each tap moves it one step.' }
    ]
  };
  P.PRINTER = {
    title: '', name: 'Printer', w: 98, h: 42, tone: 'dark', sys: null,
    desc: 'Cockpit printer.',
    items: [
      part(49, 21, 90, 34, 'Printer', 'Cockpit printer: prints ACARS messages, AIDS reports and FMS data, such as the take-off data or a weather report.', rect(8, 8, 82, 9, 'prn-slot', 2) + rect(10, 11, 78, 2, 'prn-paper') + rect(8, 24, 82, 8, 'prn-slot', 2), { kindName: 'Printer' })
    ]
  };
  P.BLANKP1 = { title: '', name: '', w: 98, h: 40, tone: 'dark', blank: true, desc: '', items: [] };
  P.BLANKP2 = { title: '', name: '', w: 74, h: 30, tone: 'dark', blank: true, desc: '', items: [] };
  P.STOW = {
    title: '', name: '', w: 98, h: 40, tone: 'dark', deco: true, desc: '', items: [
      raw('<path d="M24 18 Q24 12 30 12 L68 12 Q74 12 74 18" class="stow-handle"/>' + rect(26, 28, 9, 6, 'pb-cap', 1) + t(30.5, 32.2, 'SLEW', 2.2) + '<circle cx="54" cy="31" r="3" class="knob-light"/>')
    ]
  };

  /* --------------------------------------------------------- side consoles */
  // Drawn for the F/O's console as seen from the seat (sidestick outboard on
  // the right, tiller forward of it, hand mic clipped to the front face, as in
  // photos/lower/08) and mirrored for the Captain.
  function consoleScene() {
    var o = '';
    o += rect(0, 0, 230, 186, 'cs-wall', 4);
    o += '<path d="M0 186 L0 116 L84 122 L90 140 L140 140 L146 186 Z" class="cs-floor"/>';
    // console top (leather) and padded front face
    o += '<path d="M0 82 L140 33 L196 33 Q200 34 200 40 L198 108 L0 98 Z" class="cs-top"/>';
    o += '<path d="M0 98 L198 108 L199 134 Q199 140 193 140 L136 140 L132 126 L88 124 L84 110 L0 108 Z" class="cs-face"/>';
    o += '<path d="M0 98.4 L198 108.4" class="cs-edge"/>';
    o += '<path d="M14 86 Q40 80 60 78 M110 52 Q124 49 132 46 M30 112 Q60 116 80 114" class="cs-crease"/>';
    o += rect(151, 112, 13, 28, 'cs-slot', 1.5) + rect(153, 114, 3, 24, 'cs-slot-hi', 1);
    // seat armrest in front of the console
    o += '<path d="M146 186 L141 140 Q140 132 148 130 L204 136 Q212 138 212 146 L214 186 Z" class="cs-arm"/>';
    o += '<path d="M150 136 L206 141" class="cs-edge"/>';
    return o;
  }
  function tillerArt() {
    var o = '<ellipse cx="97" cy="86" rx="14" ry="4.4" class="tiller-disc"/>';
    for (var a = -70; a <= 70; a += 14) { var x = 97 + 11.5 * Math.sin(a * Math.PI / 180), y = 86 + 3.4 * Math.cos(a * Math.PI / 180); o += line(x, y - 1.6, x, y + 0.2, 'tiller-tick'); }
    o += '<path d="M90 84 Q92 78 96 77 Q101 78 103 84" class="tiller-post"/>';
    o += '<ellipse cx="93" cy="71" rx="15" ry="9" class="tiller-hub"/><ellipse cx="92" cy="66" rx="7" ry="2.6" class="tiller-cap"/>';
    o += '<path d="M82 72 Q68 66 69 55 Q70 46 80 44 L101 41" class="tiller"/>';
    o += '<path d="M70 54 Q71 47 80 45.4 L99 42.6" class="tiller-hi"/>';
    o += '<path d="M98 37 Q103 36 103.6 41 Q103 46 98 45.6 Z" class="tiller-end"/>';
    return o;
  }
  function stickArt() {
    var o = '', steps = [[136, 188, 90, 107], [141, 187, 82, 98], [144, 185, 76, 92], [148, 184, 70, 86]];
    steps.forEach(function (b, i) {
      o += '<path d="M' + (b[0] + 3) + ' ' + b[2] + ' L' + (b[1] - 2) + ' ' + b[2] + ' Q' + b[1] + ' ' + b[2] + ' ' + b[1] + ' ' + (b[2] + 3) + ' L' + (b[1] + 0.5) + ' ' + (b[3] - 2) + ' Q' + (b[1] + 0.5) + ' ' + b[3] + ' ' + (b[1] - 2) + ' ' + b[3] +
        ' L' + (b[0] + 1) + ' ' + b[3] + ' Q' + (b[0] - 1) + ' ' + b[3] + ' ' + b[0] + ' ' + (b[3] - 2) + ' Z" class="boot boot' + i + '"/>';
      o += '<path d="M' + (b[0] + 3) + ' ' + (b[2] + 0.6) + ' L' + (b[1] - 2) + ' ' + (b[2] + 0.6) + '" class="boot-hi"/>';
    });
    o += '<path d="M153 66 L180 66 Q182 66 182 69 L182 75 Q182 77 179 77 L154 77 Q151 77 151 75 L151 69 Q151 66 153 66 Z" class="stick-collar"/>';
    o += '<path d="M161 68 C162 52 164 42 165 32 C165 20 163 10 167 5 C171 1 180 3 184 8 L190 15 C194 19 193 26 188 29 C182 33 178 42 177 52 L176 68 Z" class="stick"/>';
    o += '<path d="M166 30 C166 18 165 10 168 7" class="stick-hi"/>';
    o += '<path d="M172 10 L180 9 L182 15 L176 21 L171 16 Z" class="stick-emblem"/>';
    return o;
  }
  function micArt() {
    var o = '<path d="M99 110 L103 112 L104 131 Q104 134 107 134 L117 134 Q120 134 120 131 L121 112 L125 110" class="mic-clip"/>';
    o += '<path d="M102 111 L122 111 L121 133 L103 133 Z" class="mic-clip-plate"/><circle cx="112" cy="129" r="2" class="mic-eye"/>';
    o += '<path d="M111 130 Q106 134 104 140" class="mic-cord"/>';
    o += '<g transform="rotate(-28 106 158)">' + rect(98, 144, 16, 34, 'mic', 7) + rect(96.5, 151, 19, 4, 'mic-band', 1.5) + rect(110, 162, 3, 9, 'mic-ptt', 1) + '</g>';
    o += '<ellipse cx="99" cy="146" rx="8.6" ry="8" class="mic-rim"/><ellipse cx="99" cy="146" rx="6.2" ry="5.8" class="mic-grille"/>';
    for (var gx = -4; gx <= 4; gx += 2) for (var gy = -4; gy <= 4; gy += 2) if (gx * gx + gy * gy < 20) o += '<circle cx="' + (99 + gx) + '" cy="' + (146 + gy) + '" r=".6" class="mic-dot"/>';
    o += '<path d="M120 172 q3 2 1 4 q-2 2 1 4 q3 2 1 4" class="mic-coil"/>';
    return o;
  }
  function consoleItems() {
    return [
      raw(consoleScene()),
      part(88, 62, 44, 50, 'Tiller', 'Nose wheel steering tiller: turns the nose wheel up to 75° either way for taxiing (the rudder pedals give only about 6°). Its authority reduces as speed increases. Steering uses the yellow hydraulic system through the BSCU and needs A/SKID & N/W STRG ON.', tillerArt(), { kindName: 'Tiller' }),
      part(170, 54, 44, 104, 'Sidestick', 'Sidestick. In normal law it commands load factor in pitch and roll rate; released to neutral, the aircraft holds its flight path, and its bank up to 33°. It is spring-loaded to neutral with no feedback, and the two sidesticks are not coupled: if both pilots move them, the inputs add up (DUAL INPUT), up to the deflection of one stick.', stickArt(), { kindName: 'Sidestick' }),
      rnd(189.5, 21, 'Takeover pushbutton', 'Red takeover pushbutton, also the autopilot disconnect. A press disconnects the autopilot. Holding it takes priority: the other sidestick is deactivated, with the aural PRIORITY LEFT or RIGHT. Held for more than 40 s, the priority latches until the other pilot presses theirs.', { s: 6, red: true, noname: true }),
      part(162, 42, 8, 20, 'Radio transmit trigger', 'Radio push-to-talk trigger on the sidestick grip: transmits on the radio selected on the audio control panel.', rect(160.4, 34, 4, 16, 'stick-trigger', 1.6), { kindName: 'Switch' }),
      part(110, 152, 34, 60, 'Hand microphone', 'Hand microphone, clipped to the front of the console, for use instead of the headset boom mic. Its push-to-talk switch transmits on the radio selected on the audio control panel.', micArt(), { kindName: 'Microphone' })
    ];
  }
  function flip(items, w) {
    return items.map(function (it) {
      var c = Object.assign({}, it);
      if (c.k === 'raw') c.svg = '<g transform="translate(' + w + ' 0) scale(-1 1)">' + c.svg + '</g>';
      else if (c.k === 'part') { c.art = '<g transform="translate(' + w + ' 0) scale(-1 1)">' + c.art + '</g>'; c.x = w - c.x; }
      else if (c.x != null) c.x = w - c.x;
      return c;
    });
  }
  P.CONSR = { title: '', name: 'F/O side console', w: 230, h: 186, tone: 'console', noScrews: true, sys: null, desc: 'F/O\'s side console: sidestick with its takeover pushbutton, nose wheel steering tiller and hand microphone.', items: consoleItems() };
  P.CONSL = { title: '', name: 'Captain side console', w: 230, h: 186, tone: 'console', noScrews: true, sys: null, desc: 'Captain\'s side console: sidestick with its takeover pushbutton, nose wheel steering tiller and hand microphone.', items: flip(consoleItems(), 230) };
})();
