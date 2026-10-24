/* A320 ECAM Trainer: cockpit panel library.
 *
 * Each panel is data: a size in panel units and a list of controls. The same
 * definition draws the panel small inside the flight deck overview and full
 * screen when the panel is expanded. Layouts follow the A320 panels but are
 * simplified; legends and functions are summarised for training.
 *
 * Control kinds:
 *   pb      pushbutton with an upper and lower legend
 *   ann     annunciator light (no switch)
 *   fire    ENG/APU FIRE pushbutton
 *   sel     rotary selector with named positions
 *   knob    continuous rotary knob (temperature, brightness)
 *   tog     toggle switch with named positions
 *   lever   ENG MASTER lever (ON/OFF)
 *   disp    digital display
 *   win     FCU window (label + value)
 *   slide   lever moving between detents (flaps, speed brake, thrust, gear)
 *   crank   gravity gear extension hand crank: stowed, pulled out, then whole turns
 *   part    drawn part with an info card (screens, sidestick, handles)
 *   raw     decoration drawn as given
 *   line    white flow line
 *   label   white legend text
 */
(function () {
  'use strict';

  // Legend colours by word, overridable with "TEXT:c" (a amber, w white, b blue, g green, r red).
  var LEGEND_COLOUR = { FAULT: 'a', OFF: 'w', ON: 'b', AVAIL: 'g', OPEN: 'g', ALTN: 'w', MAN: 'w', SQUIB: 'w', DISCH: 'a', SMOKE: 'a', OVRD: 'w', 'SYS ON': 'w', EVAC: 'r', 'LO PR': 'a', AUTO: 'w', ARM: 'w' };
  function legend(s) {
    if (!s) return null;
    var m = /^(.*):([awbgr])$/.exec(s);
    return m ? { s: m[1], c: m[2] } : { s: s, c: LEGEND_COLOUR[s] || 'w' };
  }
  function pb(x, y, name, up, lo, info, o) { return Object.assign({ k: 'pb', x: x, y: y, name: name, up: legend(up), lo: legend(lo), info: info }, o || {}); }
  function gpb(x, y, name, up, lo, info, o) { return pb(x, y, name, up, lo, info, Object.assign({ guard: 'r' }, o || {})); }
  function ann(x, y, name, up, lo, info, o) { return Object.assign({ k: 'ann', x: x, y: y, name: name, up: legend(up), lo: legend(lo), info: info }, o || {}); }
  function sel(x, y, name, pos, cur, info, o) { return Object.assign({ k: 'sel', x: x, y: y, name: name, pos: pos, cur: cur, info: info }, o || {}); }
  function knob(x, y, name, lo, hi, info, o) { return Object.assign({ k: 'knob', x: x, y: y, name: name, lo: lo, hi: hi, info: info }, o || {}); }
  function tog(x, y, name, pos, cur, info, o) { return Object.assign({ k: 'tog', x: x, y: y, name: name, pos: pos, cur: cur, info: info }, o || {}); }
  function disp(x, y, w, val, name, info, o) { return Object.assign({ k: 'disp', x: x, y: y, w: w, val: val, name: name, info: info }, o || {}); }
  function ln(pts) { return { k: 'line', pts: pts }; }
  function lb(x, y, s, size, c) { return { k: 'label', x: x, y: y, s: s, size: size || 5.4, c: c || 'w' }; }

  var P = {};
  // Live state shared with the app (the system display page shown).
  var LIVE = { sdPage: null, clr: false };

  /* Forward and aft overhead panels. Layouts follow reference photos of the
   * A320 overhead (centre column 300 units wide, side columns 168). */
  function box(x, y, s, size) { return { k: 'box', x: x, y: y, s: s, size: size || 4.2 }; }
  function vt(x, y, s, size) { return { k: 'vtext', x: x, y: y, s: s, size: size || 5.4 }; }
  function rnd(x, y, name, info, o) { return Object.assign({ k: 'pb', shape: 'round', x: x, y: y, name: name, info: info, s: 11 }, o || {}); }
  function ogpb(x, y, name, up, lo, info, o) { return pb(x, y, name, up, lo, info, Object.assign({ guard: 'o' }, o || {})); }
  function dec(kind, x, y, r, o) { return Object.assign({ k: 'dec', kind: kind, x: x, y: y, r: r }, o || {}); }

  /* ------------------------------------------------------- centre column */
  P.FIRE = {
    title: '', name: 'FIRE', w: 300, h: 60, sys: 'FIRE',
    desc: 'Engine and APU fire protection: fire pushbuttons under their guards, extinguisher agents and test.',
    items: [
      vt(8, 30, 'FIRE'), vt(292, 30, 'FIRE'),
      ln([[106, 7], [106, 56]]), ln([[194, 7], [194, 56]]),
      lb(58, 13, 'ENG 1', 8.5), lb(150, 11, 'APU', 8.5), lb(244, 14, 'ENG 2', 8.5),
      { k: 'fire', x: 58, y: 36, label: 'ENG 1', arms: 'E1', info: 'ENG 1 FIRE pushbutton, under a guard. Lights red with an engine 1 fire warning. Lifting the guard and pushing it (it then stays released out) silences the aural warning, arms the agent squibs, closes the LP fuel, hydraulic fire shut-off, engine bleed and pack flow control valves, and deactivates IDG 1.' },
      { k: 'fire', x: 150, y: 28, label: 'APU', arms: 'APU', info: 'APU FIRE pushbutton, under a guard. Lights red with an APU fire. Pushing it shuts the APU down, silences the aural warning, arms the squib, and closes the APU LP fuel valve and APU bleed valve. On the ground an APU fire shuts the APU down and discharges the agent automatically.' },
      { k: 'fire', x: 242, y: 38, label: 'ENG 2', arms: 'E2', info: 'ENG 2 FIRE pushbutton, under a guard. Same functions as ENG 1, for engine 2: aural silenced, squibs armed, fuel, hydraulic, bleed and pack valves closed, IDG 2 deactivated.' },
      pb(24, 26, 'AGENT 1', 'SQUIB', 'DISCH', 'Discharges extinguisher bottle 1 into engine 1. SQUIB (white): squib armed after the fire pushbutton is pushed. DISCH (amber): the bottle has been discharged.', { agent: 'E1', s: 16 }),
      rnd(24, 48, 'TEST', 'Tests engine 1 fire detection and extinguishing circuits: the fire pushbutton, SQUIB and DISCH lights, MASTER WARN, the fire bell and the FIRE light on the ENG panel come on.', { s: 8, nameSide: true }),
      pb(92, 24, 'AGENT 2', 'SQUIB', 'DISCH', 'Discharges bottle 2 into engine 1. Used if the fire is still detected 30 s after AGENT 1 in flight; on the ground both agents are used straight away.', { agent: 'E1', s: 16 }),
      pb(122, 50, 'AGENT', 'SQUIB', 'DISCH', 'Discharges the APU bottle. SQUIB: armed after the APU FIRE pushbutton is pushed. DISCH: bottle discharged.', { agent: 'APU', s: 14, nameBelow: true }),
      rnd(178, 50, 'TEST', 'Tests the APU fire detection and extinguishing circuits.', { s: 8, nameSide: true }),
      pb(208, 25, 'AGENT 1', 'SQUIB', 'DISCH', 'Discharges extinguisher bottle 1 into engine 2.', { agent: 'E2', s: 16 }),
      pb(278, 23, 'AGENT 2', 'SQUIB', 'DISCH', 'Discharges bottle 2 into engine 2.', { agent: 'E2', s: 16 }),
      rnd(278, 46, 'TEST', 'Tests engine 2 fire detection and extinguishing circuits.', { s: 8, nameSide: true })
    ]
  };

  // Laid out from the owner's HYD panel photo (owner's request, 0.7.29; buttons smaller in
  // 0.7.31 so they sit inside the panel): one row of
  // pushbuttons with one-line names under green brackets, the flow lines with their arrows,
  // the PTU on the green-yellow line and the RAT feeding the blue line.
  function arrow(x, y, d) { return { k: 'raw', svg: '<path d="M' + x + ' ' + y + ' l' + (-3 * d) + ' -1.8 v3.6 z" class="pn-flow-fill"/>' }; }
  function hname(x, y, s) { return { k: 'raw', svg: text(x, y, s, 'pn-name', 3.7) }; }
  P.HYD = {
    title: '', name: 'HYD', flow: true, w: 300, h: 56, sys: 'HYD',
    desc: 'Green, blue and yellow hydraulic systems: engine pumps, electric pumps, PTU and RAT.',
    items: [
      vt(8, 30, 'HYD'), vt(292, 30, 'HYD'),
      ln([[62, 10], [62, 29.6]]), ln([[50, 31], [50, 29.6], [74, 29.6], [74, 31]]),
      ln([[150, 10], [150, 28.1]]), ln([[138, 29.5], [138, 28.1], [162, 28.1], [162, 29.5]]),
      ln([[238, 10], [238, 29.6]]), ln([[226, 31], [226, 29.6], [250, 29.6], [250, 31]]),
      ln([[238, 17], [268, 17], [268, 23.6]]), ln([[257, 25], [257, 23.6], [279, 23.6], [279, 25]]),
      ln([[62, 12], [146, 12]]), { k: 'path', d: 'M146 12 Q150 6 154 12' }, ln([[154, 12], [238, 12]]),
      ln([[190, 12], [190, 15.4]]), ln([[202, 12], [202, 15.4]]),
      ln([[118, 15], [121, 15], [121, 19], [118, 19]]), ln([[121, 17], [149, 17]]),
      arrow(85, 12, -1), arrow(149, 17, 1), arrow(180, 12, -1), arrow(214, 12, 1), arrow(245, 17, -1),
      box(62, 7, 'GREEN'), box(150, 7, 'BLUE'), box(238, 7, 'YELLOW'), box(196, 19, 'PTU'),
      hname(62, 34.6, 'ENG 1 PUMP'), hname(150, 33.1, 'ELEC PUMP'), hname(238, 34.6, 'ENG 2 PUMP'), hname(268, 28.6, 'ELEC PUMP'),
      pb(62, 44, 'ENG 1\nPUMP', 'FAULT', 'OFF', 'Green engine-driven pump. FAULT (amber): low pump pressure, or green reservoir overheat, low level or low air pressure (not shown with the engine stopped). OFF (white): pump depressurised.', { s: 12, noname: true }),
      ogpb(106, 38, 'RAT MAN ON', '', '', 'Guarded. Deploys the RAT manually to pressurise the blue system. The RAT also deploys automatically when AC BUS 1 and 2 are lost above 100 kt. It can only be stowed on the ground.', { s: 12 }),
      pb(150, 42.5, 'ELEC\nPUMP', 'FAULT', 'OFF', 'Blue electric pump. In AUTO it runs in flight, and on the ground once one engine is running. FAULT: low pressure, reservoir overheat, low level or low air pressure. OFF: pump off.', { s: 12, auto: true, noname: true }),
      pb(196, 29, 'PTU', 'FAULT', 'OFF', 'Power Transfer Unit between green and yellow. In AUTO it runs automatically when the pressure difference between them exceeds 500 psi. It transfers power, not fluid. FAULT: green or yellow reservoir overheat, low air pressure or low level. OFF: PTU inhibited.', { s: 12, auto: true, noname: true }),
      pb(238, 44, 'ENG 2\nPUMP', 'FAULT', 'OFF', 'Yellow engine-driven pump. FAULT: low pump pressure, or yellow reservoir overheat, low level or low air pressure. OFF: pump depressurised.', { s: 12, noname: true }),
      pb(268, 38, 'ELEC\nPUMP', 'FAULT', 'ON', 'Yellow electric pump, normally off. ON (blue): pump running. It also runs automatically when a cargo door is operated on the ground. FAULT: low pressure, reservoir overheat, low level or low air pressure.', { s: 12, noname: true })
    ]
  };

  P.FUEL = {
    title: '', name: 'FUEL', flow: true, w: 300, h: 54, sys: null,
    desc: 'Wing tank pumps, centre tank transfer, mode selector and engine crossfeed.',
    items: [
      vt(8, 28, 'FUEL'), vt(292, 28, 'FUEL'),
      ln([[62, 13], [62, 26]]), ln([[36, 26], [88, 26], [88, 30]]), ln([[36, 26], [36, 30]]),
      ln([[62, 19], [146, 19]]), ln([[164, 19], [242, 19]]), ln([[122, 13], [122, 19]]),
      ln([[242, 15], [242, 28]]), ln([[218, 28], [266, 28], [266, 32]]), ln([[218, 28], [218, 32]]),
      ln([[88, 30], [114, 30]]), ln([[194, 30], [218, 30]]),
      box(62, 9, 'ENG 1'), box(122, 9, 'APU'), box(242, 11, 'ENG 2'),
      lb(62, 31, 'L TK PUMPS', 3.6), lb(242, 33, 'R TK PUMPS', 3.6),
      pb(48, 43, '1', 'FAULT', 'OFF', 'Left wing tank pump 1. FAULT: low delivery pressure. OFF: pump off. Each wing tank has two pumps; either one can feed its engine.', { s: 17, noname: true }),
      pb(76, 43, '2', 'FAULT', 'OFF', 'Left wing tank pump 2. FAULT: low delivery pressure. OFF: pump off.', { s: 17, noname: true }),
      pb(128, 43, 'CTR TK\nL XFR', 'FAULT', 'OFF', 'Centre tank left transfer. With MODE SEL in AUTO, fuel is transferred from the centre tank to the left wing tank automatically and stops when the centre tank is empty. FAULT: transfer failure. OFF: transfer off.', { s: 17 }),
      pb(156, 43, 'MODE SEL', 'FAULT', 'MAN', 'AUTO: centre tank transfer controlled automatically. MAN: the crew controls it with the CTR TK pushbuttons. FAULT: more than 250 kg in the centre tank while a wing tank holds less than 5000 kg.', { s: 17, auto: true }),
      pb(182, 43, 'CTR TK\nR XFR', 'FAULT', 'OFF', 'Centre tank right transfer. Same logic as the left side.', { s: 17 }),
      pb(156, 17, 'X FEED', 'ON', 'OPEN', 'Engine crossfeed valve. ON (white): crossfeed selected. OPEN (green): valve fully open, so either side\'s pumps can feed both engines.', { s: 17, follow: true }),
      pb(230, 44, '1', 'FAULT', 'OFF', 'Right wing tank pump 1. FAULT: low delivery pressure. OFF: pump off.', { s: 17, noname: true }),
      pb(256, 44, '2', 'FAULT', 'OFF', 'Right wing tank pump 2. FAULT: low delivery pressure. OFF: pump off.', { s: 17, noname: true })
    ]
  };

  P.ELEC = {
    title: '', name: 'ELEC', flow: true, w: 300, h: 90, sys: 'ELEC',
    desc: 'Batteries, generators, IDGs, bus tie, external power and AC ESS feed.',
    items: [
      vt(8, 46, 'ELEC'), vt(292, 46, 'ELEC'),
      ln([[64, 13], [64, 58]]), ln([[244, 14], [244, 58]]),
      ln([[64, 58], [143, 58]]), ln([[160, 58], [244, 58]]),
      ln([[76, 35], [138, 35]]), ln([[178, 35], [231, 35]]),
      ln([[61, 58], [61, 66]]), ln([[244, 58], [244, 66]]),
      ln([[38, 74], [53, 74]]), ln([[253, 74], [266, 74]]),
      ln([[124, 76], [143, 76], [143, 70]]), ln([[180, 76], [160, 76], [160, 70]]),
      box(64, 9, 'DC BUS 1'), box(62, 35, 'AC BUS 1'), box(158, 35, 'AC ESS BUS'), box(243, 35, 'AC BUS 2'), box(244, 10, 'DC BUS 2'),
      pb(33, 18, 'COMMERCIAL', '', 'OFF', 'OFF: cuts power to the commercial loads (cabin lighting, galleys, in-flight entertainment).', { s: 17 }),
      pb(33, 48, 'GALY & CAB', 'FAULT', 'OFF', 'AUTO: galleys and cabin supplied, shed automatically when only one generator is available in flight. FAULT: a generator is overloaded. OFF: galleys and cabin loads off.', { s: 17, auto: true }),
      disp(106, 22, 30, '28.5', 'BAT 1 V', 'Battery 1 voltage.', { lbl: 'BAT 1', amber: true }),
      pb(135, 22, 'BAT 1', 'FAULT', 'OFF', 'AUTO: battery 1 connects to the DC BAT bus to charge or supply it as needed. OFF: battery line contactor open (the hot bus stays powered). FAULT: charging current out of limits.', { s: 17, noname: true }),
      pb(155, 22, 'BAT 2', 'FAULT', 'OFF', 'Battery 2, same logic as battery 1.', { s: 17, noname: true }),
      lb(145, 10, '1   BAT   2', 4),
      disp(185, 22, 30, '28.5', 'BAT 2 V', 'Battery 2 voltage.', { lbl: 'BAT 2', amber: true }),
      pb(214, 27, 'AC ESS\nFEED', 'FAULT', 'ALTN', 'NORM: AC ESS bus fed from AC BUS 1. ALTN: fed from AC BUS 2. FAULT: AC ESS bus not powered.', { s: 17 }),
      { k: 'pb', x: 30, y: 74, s: 18, name: 'IDG 1', up: legend('FAULT'), lo: null, guard: 'g', info: 'Guarded. Disconnects IDG 1 from the engine gearbox. Hold no more than 3 s. It cannot be reconnected in flight. FAULT: IDG oil outlet overheat or low oil pressure (not shown with the engine stopped).' },
      pb(61, 76, 'GEN 1', 'FAULT', 'OFF', 'ON: generator energised and connected if its parameters are normal. OFF: field off, line contactor open. FAULT: protection trip, or line contactor open with GEN 1 on. OFF then ON resets the GCU.', { s: 17, nameBar: true }),
      pb(115, 76, 'APU\nGEN', 'FAULT', 'OFF', 'APU generator (90 kVA). It can replace either engine generator. FAULT: protection trip. OFF: line contactor open.', { s: 17 }),
      pb(151, 63, 'BUS\nTIE', '', 'OFF', 'AUTO: the bus tie contactors open or close automatically so one generator can supply both AC buses. OFF: both bus tie contactors open.', { s: 17, auto: true }),
      pb(189, 76, 'EXT\nPWR', 'AVAIL', 'ON', 'AVAIL (green): ground power connected with normal parameters. ON (blue): ground power is supplying the aircraft. Push to connect or disconnect.', { s: 17 }),
      pb(244, 76, 'GEN 2', 'FAULT', 'OFF', 'Engine 2 generator. Same logic as GEN 1.', { s: 17, nameBar: true }),
      { k: 'pb', x: 274, y: 74, s: 18, name: 'IDG 2', up: legend('FAULT'), lo: null, guard: 'g', info: 'Guarded. Disconnects IDG 2. Hold no more than 3 s; cannot be reconnected in flight.' }
    ]
  };

  P.AIR = {
    title: '', name: 'AIR COND', flow: true, w: 300, h: 106, sys: 'AIR',
    desc: 'Pack flow, zone temperatures, packs, bleed air, ram air and crossbleed.',
    items: [
      vt(8, 54, 'AIRCOND', 5), vt(292, 54, 'AIRCOND', 5),
      ln([[76, 44], [241, 44]]), ln([[115, 38], [115, 44]]), ln([[157, 38], [157, 44]]), ln([[197, 38], [197, 44]]),
      ln([[76, 44], [76, 76]]), ln([[241, 44], [241, 78]]),
      ln([[76, 57], [112, 57]]), ln([[124, 57], [188, 57]]), ln([[202, 57], [241, 57]]),
      { k: 'path', d: 'M112 57 Q118 50 124 57' },
      ln([[118, 44], [118, 78]]), ln([[134, 57], [134, 66]]), ln([[156, 57], [156, 76]]),
      ln([[96, 57], [96, 64]]), ln([[216, 57], [216, 64]]),
      { k: 'valve', x: 195, y: 57, r: 4 },
      box(78, 49, 'PACK 1'), box(240, 53, 'PACK 2'),
      lb(195, 52, 'X BLEED', 3.8), lb(96, 69, 'START', 3.6), lb(216, 69, 'START', 3.6), lb(136, 71, 'GND HP', 3.6),
      box(115, 6, 'COCKPIT'), box(157, 6, 'FWD CABIN'), box(197, 6, 'AFT CABIN'),
      sel(38, 24, 'PACK FLOW', ['LO', 'NORM', 'HI'], 1, 'Selects pack flow: LO about 80 %, NORM 100 %, HI about 120 %. HI flow is given automatically with one pack or with APU bleed.', { r: 10, light: true }),
      knob(115, 24, 'COCKPIT', 'COLD', 'HOT', 'Cockpit temperature selector, from about 18 °C (COLD) to 30 °C (HOT). The 12 o\'clock position is about 24 °C.', { r: 10, light: true, noname: true }),
      knob(157, 24, 'FWD CABIN', 'COLD', 'HOT', 'Forward cabin temperature selector, about 18 °C to 30 °C.', { r: 10, light: true, noname: true }),
      knob(197, 24, 'AFT CABIN', 'COLD', 'HOT', 'Aft cabin temperature selector, about 18 °C to 30 °C.', { r: 10, light: true, noname: true }),
      pb(266, 21, 'HOT AIR', 'FAULT', 'OFF', 'Hot air pressure-regulating valve feeding the trim air valves. FAULT: duct overheat; the valve and trim air valves close. OFF: valve closed.', { s: 17 }),
      pb(34, 56, 'PACK 1', 'FAULT', 'OFF', 'Pack 1 flow control valve. FAULT: valve position disagrees with the selection, or compressor outlet or pack outlet overheat. OFF: valve closed.', { s: 17 }),
      pb(264, 61, 'PACK 2', 'FAULT', 'OFF', 'Pack 2 flow control valve. Same logic as PACK 1.', { s: 17 }),
      pb(78, 88, 'ENG 1\nBLEED', 'FAULT', 'OFF', 'Engine 1 bleed valve. FAULT: overpressure, overheat, bleed leak, or valve not closed when commanded. OFF: valve closed.', { s: 17, nameBar: true }),
      pb(118, 90, 'RAM AIR', '', 'ON', 'Guarded. Opens the ram air inlet to ventilate the cabin and cockpit after the loss of both packs, below FL100. The outflow valve opens if differential pressure is below 1 psi.', { s: 18, guard: 'c', nameBar: true }),
      pb(156, 88, 'APU\nBLEED', 'FAULT', 'ON', 'ON (blue): the APU bleed valve opens when the APU is running; the crossbleed opens if X BLEED is in AUTO. FAULT: APU bleed leak.', { s: 17, nameBar: true }),
      sel(196, 90, 'X BLEED', ['SHUT', 'AUTO', 'OPEN'], 1, 'Crossbleed valve. AUTO: opens when the APU bleed is in use and closes automatically with a wing, pylon or APU bleed leak. SHUT and OPEN set it manually.', { r: 10, light: true, noname: true }),
      pb(238, 90, 'ENG 2\nBLEED', 'FAULT', 'OFF', 'Engine 2 bleed valve. Same logic as ENG 1 BLEED.', { s: 17, nameBar: true })
    ]
  };

  P.ANTIICE = {
    title: '', name: 'ANTI ICE', w: 174, h: 44, sys: 'AIR',
    desc: 'Wing and engine anti-ice, probe and window heat.',
    items: [
      lb(82, 8, 'ANTI ICE', 6), lb(152, 7, 'PROBE/WINDOW', 4.4), lb(152, 12.5, 'HEAT', 5),
      ln([[48, 12], [48, 40]]), ln([[129, 4], [129, 42]]),
      pb(27, 29, 'WING', 'FAULT', 'ON', 'ON: opens the wing anti-ice valves; bleed air heats the outboard slats. FAULT: valve position disagrees or low pressure. On the ground the valves open for a 30 s test only.', { s: 17 }),
      pb(90, 30, 'ENG 1', 'FAULT', 'ON', 'ON: opens the engine 1 nacelle anti-ice valve. FAULT: valve position disagrees with the selection.', { s: 17 }),
      pb(114, 30, 'ENG 2', 'FAULT', 'ON', 'ON: opens the engine 2 nacelle anti-ice valve. FAULT: valve position disagrees with the selection.', { s: 17 }),
      pb(152, 30, 'PROBE/\nWINDOW HEAT', '', 'ON', 'AUTO: probes and windows are heated automatically once an engine is running. ON: heating forced on the ground.', { s: 17, noname: true })
    ]
  };

  P.CABPRESS = {
    title: '', name: 'CABIN PRESS', w: 126, h: 44, sys: 'AIR',
    desc: 'Cabin pressure mode, manual vertical speed, landing elevation and ditching.',
    items: [
      lb(48, 8, 'CABIN PRESS', 5.4),
      tog(13, 30, 'MAN V/S\nCTL', ['UP', 'DN'], -1, 'Spring-loaded. In MAN mode, UP opens and DN closes the outflow valve through its third (manual) motor.', { round: true }),
      pb(42, 30, 'MODE SEL', 'FAULT', 'MAN', 'AUTO: the active cabin pressure controller drives the outflow valve. MAN: manual control with MAN V/S CTL. FAULT: both controllers have failed.', { s: 16, auto: true }),
      sel(73, 30, 'LDG ELEV', ['-2', '0', '2', '4', '6', '8', '10', '12', '14'], 0, 'AUTO: landing elevation comes from the FMGS. Turning the knob out of AUTO sets the landing elevation manually, in thousands of feet from -2000 to 14 000 ft.', { r: 7, light: true, scale: true }),
      ogpb(108, 30, 'DITCHING', '', 'ON', 'Guarded. Before ditching, closes the outflow valve, ram air inlet, avionics ventilation inlet and extract valves and pack flow control valves.', { s: 16, guard: 'c' })
    ]
  };

  P.LOWER = {
    title: '', name: 'EXT LT · APU · INT LT · SIGNS', w: 300, h: 82, sys: null,
    desc: 'Exterior lights, APU master switch and start, interior lights and cabin signs.',
    items: [
      lb(66, 7, 'EXT LT', 6), lb(151, 7, 'APU', 6), lb(232, 7, 'INT LT', 6), lb(232, 47, 'SIGNS', 5.6),
      ln([[133, 4], [133, 80]]), ln([[169, 4], [169, 80]]), ln([[176, 43], [296, 43]]),
      ln([[44, 47], [56, 47]]), ln([[74, 47], [86, 47]]), lb(65, 48.5, 'LAND', 4),
      tog(19, 27, 'STROBE', ['ON', 'AUTO', 'OFF'], 1, 'Strobe lights. AUTO: on when the main gear is not compressed (in flight).', { round: true }),
      tog(48, 27, 'BEACON', ['ON', 'OFF'], 0, 'Red anti-collision beacons, on whenever an engine is running.', { round: true }),
      tog(80, 27, 'WING', ['ON', 'OFF'], 1, 'Wing and engine nacelle scan lights, used to check for ice.', { round: true }),
      tog(111, 27, 'NAV & LOGO', ['2', '1', 'OFF'], 0, 'Navigation and logo lights (two systems).', { round: true }),
      tog(21, 65, 'RWY TURN OFF', ['ON', 'OFF'], 1, 'Runway turn-off lights on the nose gear.', { round: true }),
      tog(50, 65, 'L', ['ON', 'OFF', 'RETRACT'], 2, 'Left landing light. RETRACT stows it; OFF extends it unlit.', { round: true, bar3: true }),
      tog(80, 65, 'R', ['ON', 'OFF', 'RETRACT'], 2, 'Right landing light.', { round: true, bar3: true }),
      tog(111, 65, 'NOSE', ['T.O', 'TAXI', 'OFF'], 2, 'Nose gear lights: T.O (bright) or TAXI.', { round: true }),
      pb(151, 28, 'MASTER SW', 'FAULT', 'ON', 'ON (blue): powers the APU control unit and opens the air inlet flap. FAULT (amber): automatic APU shutdown. Pushing it off shuts the APU down after a cooling period.', { s: 17 }),
      pb(151, 64, 'START', 'ON', 'AVAIL', 'Starts the APU once the air inlet is open. ON (blue): start in progress. AVAIL (green): APU running and available for bleed and electrical power.', { s: 17 }),
      knob(186, 28, 'OVHD\nINTEG LT', 'OFF', 'BRT', 'Overhead panel integral lighting brightness.', { r: 8, light: true }),
      tog(212, 28, 'ICE IND &\nSTBY COMPASS', ['ON', 'OFF'], 1, 'Ice indicator and standby compass lights.', { round: true }),
      tog(238, 28, 'DOME', ['BRT', 'DIM', 'OFF'], 2, 'Cockpit dome light.', { round: true }),
      tog(266, 28, 'ANN LT', ['TEST', 'BRT', 'DIM'], 1, 'TEST lights every annunciator in the cockpit to check the bulbs. BRT or DIM sets their brightness.', { round: true }),
      tog(185, 66, 'SEAT BELTS', ['ON', 'AUTO', 'OFF'], 0, 'Fasten seat belt signs and chime in the cabin.', { round: true }),
      tog(212, 66, 'NO SMOKING', ['ON', 'AUTO', 'OFF'], 1, 'No smoking and portable electronic device signs. AUTO: on when the landing gear is down.', { round: true }),
      ann(237, 64, 'EMER EXIT LT OFF', 'OFF:a', '', 'Amber OFF: the emergency exit lighting is switched off.', { s: 12, noname: true }),
      tog(262, 66, 'EMER EXIT LT', ['ON', 'ARM', 'OFF'], 1, 'ARM: emergency lighting comes on automatically if normal power is lost. ON: forces it on.', { round: true })
    ]
  };

  P.BLANKC = { title: '', name: '', w: 300, h: 50, sys: null, blank: true, desc: '', items: [] };

  /* --------------------------------------------------------- left column */
  P.PA = {
    title: '', name: 'PA · COCKPIT DOOR VIDEO', w: 168, h: 44, sys: null,
    desc: 'Cockpit PA key and cockpit door video.',
    items: [
      ln([[106, 6], [106, 40]]),
      pb(56, 28, 'PA', '', '', 'Push and hold to make a PA announcement through the boom or mask microphone.', { s: 17 }),
      pb(134, 28, 'COCKPIT\nDOOR VIDEO', '', 'OFF', 'OFF: switches off the cockpit door video surveillance.', { s: 17 })
    ]
  };

  P.ADIRS = {
    title: '', name: 'ADIRS', w: 168, h: 122, sys: null,
    desc: 'Air data and inertial reference units 1, 2 and 3.',
    items: [
      lb(84, 9, 'ADIRS', 6.4),
      ann(84, 21, 'ON BAT', 'ON BAT:a', '', 'Amber ON BAT: at least one IR is supplied by the aircraft battery only.', { s: 12, w: 30, noname: true }),
      pb(36, 48, 'IR1', 'FAULT', 'OFF', 'IR 1 outputs. FAULT steady: IR failed. FAULT flashing: attitude and heading may be recovered in ATT mode. OFF: IR outputs disconnected.', { s: 18 }),
      pb(84, 48, 'IR3', 'FAULT', 'OFF', 'IR 3 outputs, the standby that can replace IR 1 or IR 2 by switching.', { s: 18 }),
      pb(132, 48, 'IR2', 'FAULT', 'OFF', 'IR 2 outputs.', { s: 18 }),
      sel(36, 80, 'IR 1 MODE', ['OFF', 'NAV', 'ATT'], 1, 'IR 1 mode. NAV: normal mode with full navigation data. ATT: attitude and heading only (heading entered manually). OFF: IR not powered.', { r: 10, light: true, noname: true }),
      sel(84, 80, 'IR 3 MODE', ['OFF', 'NAV', 'ATT'], 1, 'IR 3 mode selector.', { r: 10, light: true, noname: true }),
      sel(132, 80, 'IR 2 MODE', ['OFF', 'NAV', 'ATT'], 1, 'IR 2 mode selector.', { r: 10, light: true, noname: true }),
      pb(40, 109, 'ADR1', 'FAULT', 'OFF', 'ADR 1 outputs (airspeed, altitude, angle of attack, temperature). FAULT: ADR failed. OFF: outputs disconnected.', { s: 18 }),
      pb(86, 109, 'ADR3', 'FAULT', 'OFF', 'ADR 3 outputs, the standby air data source.', { s: 18 }),
      pb(134, 109, 'ADR2', 'FAULT', 'OFF', 'ADR 2 outputs.', { s: 18 })
    ]
  };

  P.BLANKL = { title: '', name: '', w: 168, h: 30, sys: null, blank: true, desc: '', items: [] };

  P.FLTCTL1 = {
    title: '', name: 'FLT CTL (Captain)', w: 168, h: 36, sys: 'FCTL',
    desc: 'Captain-side flight control computers: ELAC 1, SEC 1, FAC 1.',
    items: [
      pb(90, 22, 'ELAC 1', 'FAULT', 'OFF', 'Elevator Aileron Computer 1: normal pitch and roll control. FAULT: failure detected. OFF: computer off. A reset is OFF then ON. ELAC 2 takes over if it is lost.', { s: 18 }),
      pb(117, 22, 'SEC 1', 'FAULT', 'OFF', 'Spoiler Elevator Computer 1: spoilers and standby elevator and THS control. FAULT: failure. OFF: computer off.', { s: 18 }),
      pb(144, 22, 'FAC 1', 'FAULT', 'OFF', 'Flight Augmentation Computer 1: yaw damper, rudder trim, rudder travel limit and flight envelope. FAULT: failure. OFF: computer off.', { s: 18 })
    ]
  };

  P.EVAC = {
    title: '', name: 'EVAC', w: 168, h: 30, sys: null,
    desc: 'Evacuation command.',
    items: [
      lb(110, 6.5, 'EVAC', 5.6),
      pb(66, 20, 'COMMAND', 'EVAC', 'ON', 'Triggers the evacuation alert in the cabin and cockpit; EVAC flashes red and the horn sounds. The Captain uses it with the PA "Evacuate".', { s: 15, guard: 'c' }),
      rnd(110, 20, 'HORN SHUT OFF', 'Silences the evacuation horn in the cockpit.', { s: 9 }),
      sel(148, 20, 'CAPT & PURS', ['CAPT', 'CAPT & PURS'], 1, 'CAPT: only the cockpit can start the evacuation alert. CAPT & PURS: the cockpit or the purser can.', { r: 6, key: true, noname: true })
    ]
  };

  P.EMERELEC = {
    title: '', name: 'EMER ELEC PWR', w: 168, h: 38, sys: 'ELEC',
    desc: 'Emergency generator test, GEN 1 line, RAT and emergency generator.',
    items: [
      lb(98, 6.5, 'EMER ELEC PWR', 5.6),
      pb(30, 25, 'EMER GEN TEST', '', '', 'Guarded. On the ground with blue pressure available, tests the emergency generator.', { s: 17, guard: 'k' }),
      pb(80, 27, 'GEN 1\nLINE', 'SMOKE', 'OFF', 'OFF: opens the GEN 1 line contactor (used in the smoke procedure); GEN 1 then supplies only one fuel pump per wing. SMOKE (amber): smoke detected in the avionics ventilation.', { s: 15 }),
      ann(113, 27, 'RAT &\nEMER GEN', 'FAULT:r', '', 'Red FAULT: the emergency generator is not supplying the network although AC BUS 1 and 2 are lost.', { s: 15 }),
      ogpb(142, 25, 'MAN ON', '', '', 'Guarded. Deploys the RAT and couples the emergency generator to the network. Used in ELEC EMER CONFIG and ENG DUAL FAILURE.', { s: 17, auto: true })
    ]
  };

  P.GPWS = {
    title: '', name: 'GPWS', w: 168, h: 46, sys: null,
    desc: 'Ground proximity warning system inhibits.',
    items: [
      lb(84, 8.6, 'GPWS', 5.2), ln([[10, 6.6], [70, 6.6]]), ln([[98, 6.6], [158, 6.6]]),
      ln([[42, 13], [42, 42]]),
      pb(24, 34, 'TERR', 'FAULT', 'OFF', 'OFF inhibits terrain awareness and the predictive terrain alerts.', { s: 14 }),
      pb(62, 34, 'SYS', 'FAULT', 'OFF', 'OFF inhibits all GPWS basic mode warnings. FAULT: GPWS failure.', { s: 14 }),
      pb(92, 34, 'G/S\nMODE', '', 'OFF', 'OFF inhibits the glide slope mode alert.', { s: 14 }),
      pb(122, 34, 'FLAP\nMODE', '', 'OFF', 'OFF inhibits the "too low flaps" warning, used for landing with abnormal flaps (for example CONF 3 with the flaps lost).', { s: 14 }),
      pb(152, 34, 'LDG\nFLAP 3', '', 'ON', 'ON: tells the GPWS that FLAP 3 is the landing configuration.', { s: 14 })
    ]
  };


  P.RCDR = {
    title: '', name: 'RCDR', w: 168, h: 38, sys: null,
    desc: 'Cockpit voice and flight data recorders.',
    items: [
      lb(110, 6.5, 'RCDR', 5.6),
      pb(46, 25, 'GND CTL', '', 'ON', 'ON: powers the voice and data recorders on the ground before engine start.', { s: 16, auto: true }),
      rnd(92, 25, 'CVR ERASE', 'Erases the cockpit voice recorder, on the ground with the parking brake set.', { s: 10 }),
      rnd(136, 25, 'CVR TEST', 'Tests the cockpit voice recorder.', { s: 10 })
    ]
  };

  P.OXY = {
    title: '', name: 'OXYGEN', w: 168, h: 50, sys: 'AIR',
    desc: 'Passenger masks and crew oxygen supply.',
    items: [
      lb(98, 7, 'OXYGEN', 5.8),
      ln([[124, 18], [124, 44]]),
      ogpb(52, 32, 'MASK\nMAN ON', '', '', 'Guarded. Deploys the passenger oxygen masks manually. They also drop automatically at 14 000 ft cabin altitude.', { s: 20, auto: true }),
      ann(103, 34, 'PASSENGER', 'SYS ON', '', 'SYS ON (white): the passenger oxygen system has been activated.', { s: 16 }),
      pb(146, 34, 'CREW\nSUPPLY', '', 'OFF', 'Crew oxygen supply valve. OFF: the low-pressure supply to the crew masks is shut.', { s: 16 })
    ]
  };

  P.CALLS = {
    title: '', name: 'CALLS', w: 168, h: 44, sys: null,
    desc: 'Cabin and ground crew calls.',
    items: [
      lb(98, 8, 'CALLS', 5.8),
      rnd(38, 28, 'MECH', 'Calls the ground mechanic (horn in the nose gear bay).', { s: 11 }),
      rnd(100, 28, 'FWD', 'Calls the forward cabin crew station.', { s: 11 }),
      rnd(122, 28, 'AFT', 'Calls the aft cabin crew station.', { s: 11 }),
      pb(149, 28, 'EMER', 'CALL:a', 'ON', 'Emergency call to all cabin crew stations.', { s: 18, guard: 'c' })
    ]
  };

  P.WIPERL = {
    title: '', name: 'WIPER · RAIN RPLNT (Captain)', w: 168, h: 74, sys: null,
    desc: 'Captain windshield wiper and rain repellent.',
    items: [
      rnd(74, 34, 'RAIN RPLNT', 'Rain repellent (where fitted): one push sprays repellent on the windshield.', { s: 12 }),
      sel(130, 36, 'WIPER', ['OFF', 'SLOW', 'FAST'], 0, 'Windshield wiper speed.', { r: 11, light: true, wiper: true })
    ]
  };

  /* -------------------------------------------------------- right column */
  P.ACP3 = {
    title: '', name: 'ACP 3', w: 168, h: 64, sys: null,
    desc: 'Audio control panel 3, for the third occupant.',
    items: [
      { k: 'acp', x: 0, y: 0 }
    ]
  };
  P.BLANKR = { title: '', name: '', w: 168, h: 70, sys: null, blank: true, desc: '', items: [] };
  P.BLANKR2 = { title: '', name: '', w: 168, h: 86, sys: null, blank: true, desc: '', items: [] };

  P.FLTCTL2 = {
    title: '', name: 'FLT CTL (First Officer)', w: 168, h: 44, sys: 'FCTL',
    desc: 'First Officer-side flight control computers: ELAC 2, SEC 2, SEC 3, FAC 2.',
    items: [
      pb(42, 26, 'ELAC 2', 'FAULT', 'OFF', 'Elevator Aileron Computer 2. Takes over normal law if ELAC 1 is lost. FAULT: failure. OFF: computer off.', { s: 18 }),
      pb(74, 26, 'SEC 2', 'FAULT', 'OFF', 'Spoiler Elevator Computer 2.', { s: 18 }),
      pb(106, 26, 'SEC 3', 'FAULT', 'OFF', 'Spoiler Elevator Computer 3.', { s: 18 }),
      pb(138, 26, 'FAC 2', 'FAULT', 'OFF', 'Flight Augmentation Computer 2.', { s: 18 })
    ]
  };
  P.BLANKR3 = { title: '', name: '', w: 168, h: 70, sys: null, blank: true, desc: '', items: [] };

  P.CARGO = {
    title: '', name: 'CARGO SMOKE', w: 168, h: 40, sys: 'FIRE',
    desc: 'Cargo smoke detection and extinguishing.',
    items: [
      lb(92, 7, 'CARGO SMOKE', 5.6),
      ogpb(26, 25, 'DISCH', '', 'DISCH', 'Guarded. Discharges the cargo bottle into the forward compartment. DISCH (amber): agent discharged. One bottle serves both compartments.', { s: 17 }),
      ann(52, 27, 'FWD', 'SMOKE:r', '', 'Red SMOKE: smoke detected in the forward cargo compartment.', { s: 13 }),
      rnd(84, 27, 'TEST', 'Tests the cargo smoke detection and lights.', { s: 10 }),
      ann(116, 27, 'AFT', 'SMOKE:r', '', 'Red SMOKE: smoke detected in the aft cargo compartment.', { s: 13 }),
      ogpb(142, 25, 'DISCH', '', 'DISCH', 'Guarded. Discharges the cargo bottle into the aft compartment.', { s: 17 })
    ]
  };

  P.VENT = {
    title: '', name: 'VENTILATION', w: 168, h: 40, sys: null,
    desc: 'Avionics ventilation and cabin fans.',
    items: [
      lb(84, 7, 'VENTILATION', 5.6),
      pb(26, 26, 'BLOWER', 'FAULT', 'OVRD', 'Avionics blower fan. FAULT: low flow or duct overheat. OVRD: ventilation in closed configuration using air conditioning air.', { s: 16, auto: true }),
      pb(62, 26, 'EXTRACT', 'FAULT', 'OVRD', 'Avionics extract fan. FAULT: low flow. OVRD: extract valve forced partly open.', { s: 16, auto: true }),
      pb(144, 26, 'CAB\nFANS', '', 'OFF', 'Cabin recirculation fans.', { s: 16 })
    ]
  };

  P.MANSTART = {
    title: '', name: 'ENG MAN START', w: 168, h: 36, sys: 'ENG',
    desc: 'Manual engine start.',
    items: [
      lb(114, 6.5, 'ENG', 5.6), lb(46, 10, 'MAN START', 4), ln([[24, 11], [32, 11]]), ln([[60, 11], [68, 11]]),
      ln([[94, 8], [94, 34]]),
      pb(32, 24, 'ENG 1', '', 'ON', 'ON (blue): opens the engine 1 start valve for a manual start, with MODE SEL at IGN/START.', { s: 16, noname: true }),
      pb(62, 24, 'ENG 2', '', 'ON', 'ON (blue): opens the engine 2 start valve for a manual start.', { s: 16, noname: true }),
      lb(32, 15, '1', 4), lb(62, 15, '2', 4)
    ]
  };

  P.WIPERR = {
    title: '', name: 'WIPER · RAIN RPLNT (First Officer)', w: 168, h: 74, sys: null,
    desc: 'First Officer windshield wiper and rain repellent.',
    items: [
      sel(40, 36, 'WIPER', ['OFF', 'SLOW', 'FAST'], 0, 'Windshield wiper speed.', { r: 11, light: true, wiper: true }),
      rnd(112, 34, 'RAIN RPLNT', 'Rain repellent (where fitted): one push sprays repellent on the windshield.', { s: 12 })
    ]
  };

  /* ---------------------------------------------------------- aft overhead */
  P.ELT = {
    title: '', name: 'ELT · CKPT DOOR CONT', w: 168, h: 92, sys: null,
    desc: 'Emergency locator transmitter and cockpit door control.',
    items: [
      lb(84, 8, 'ELT', 5.6),
      tog(40, 22, 'ELT', ['ON', 'ARM'], 1, 'Emergency locator transmitter. ARM: transmits automatically after a crash. ON: transmits now.', { guardRed: true, noname: true }),
      ann(84, 22, 'ELT TX', 'TX:r', '', 'Red: the ELT is transmitting.', { s: 8, noname: true, round: true }),
      rnd(126, 22, 'TEST/RESET', 'Tests the ELT, or resets it after an inadvertent activation.', { s: 10 }),
      ln([[8, 38], [160, 38]]),
      lb(84, 58, 'CKPT DOOR CONT', 5.4),
      ann(24, 50, 'TEST', 'TEST:a', '', 'Cockpit door system test light.', { s: 6, noname: true, round: true }),
      ann(24, 60, 'MID', 'MID:a', '', 'Cockpit door locking light.', { s: 6, noname: true, round: true }),
      ann(24, 70, 'NOT', 'NOT:a', '', 'Cockpit door locking light.', { s: 6, noname: true, round: true }),
      ann(142, 52, 'CHAN 1', 'CHAN 1:a', '', 'Cockpit door controller channel 1 fault light.', { s: 6, noname: true, round: true }),
      ann(142, 64, 'CHAN 2', 'CHAN 2:a', '', 'Cockpit door controller channel 2 fault light.', { s: 6, noname: true, round: true }),
      rnd(70, 76, 'CKPT DOOR TEST 1', 'Cockpit door control panel test.', { s: 8, noname: true }),
      rnd(98, 76, 'CKPT DOOR TEST 2', 'Cockpit door control panel test.', { s: 8, noname: true })
    ]
  };

  P.MAINT = {
    title: '', name: 'MAINTENANCE PANEL', w: 168, h: 160, sys: null,
    desc: 'Aft overhead maintenance panel: oxygen, hydraulic, APU and FADEC ground controls.',
    items: [
      rnd(84, 14, 'CVR HEADSET', 'Jack for listening to the CVR test tone with a headset.', { s: 10, jack: true }),
      lb(36, 31, 'OXYGEN', 5),
      pb(36, 50, 'TMR RESET', 'FAULT', 'ON', 'Resets the passenger oxygen timer after the masks have been deployed.', { s: 17 }),
      pb(84, 50, 'SVCE INT\nOVRD', '', 'ON', 'ON: forces the service interphone on (normally automatic on the ground).', { s: 17 }),
      pb(140, 50, 'AVIONICS\nCOMPT LT', '', 'ON', 'Avionics compartment light.', { s: 17, auto: true }),
      ln([[8, 66], [160, 66]]),
      lb(110, 73, 'HYD', 5), lb(110, 79, 'LEAK MEASUREMENT VALVES', 3.4),
      pb(32, 92, 'BLUE PUMP\nOVRD', '', 'ON', 'On the ground, runs the blue electric pump with no engine running (for maintenance).', { s: 17 }),
      pb(84, 94, 'G', '', 'OFF', 'Green leak measurement valve. OFF: closed, for leak checks on the ground.', { s: 17 }),
      pb(112, 94, 'B', '', 'OFF', 'Blue leak measurement valve.', { s: 17 }),
      pb(140, 94, 'Y', '', 'OFF', 'Yellow leak measurement valve.', { s: 17 }),
      ln([[8, 110], [160, 110]]),
      lb(52, 117, 'APU', 5), lb(52, 122, 'AUTO EXTING', 3.4), lb(128, 117, 'ENG', 5), lb(128, 122, 'FADEC GND PWR', 3.4),
      pb(34, 140, 'APU AUTO EXTING TEST', '', 'OK', 'Tests the APU automatic fire extinguishing on the ground.', { s: 16, nameBelow: true, noname: true }),
      rnd(70, 140, 'APU AUTO EXTING RESET', 'Resets the APU automatic extinguishing after a test.', { s: 9, noname: true }),
      pb(114, 140, 'FADEC GND PWR 1', '', 'ON', 'ON: powers FADEC 1 on the ground with the engine stopped, for maintenance.', { s: 16, noname: true }),
      pb(142, 140, 'FADEC GND PWR 2', '', 'ON', 'ON: powers FADEC 2 on the ground with the engine stopped.', { s: 16, noname: true })
    ]
  };

  P.AUDIOSW = {
    title: '', name: 'AUDIO SWITCHING', w: 70, h: 52, sys: null,
    desc: 'Audio switching: transfers the Captain or First Officer audio to ACP 3.',
    items: [
      lb(35, 8, 'AUDIO SWITCHING', 4),
      sel(35, 32, 'AUDIO SWITCHING', ['CAPT 3', 'NORM', 'F/O 3'], 1, 'NORM: each pilot uses their own audio control panel. CAPT 3 or F/O 3: that pilot\'s audio is moved to ACP 3, if their ACP fails.', { r: 10, light: true, noname: true })
    ]
  };

  P.DLS = {
    title: '', name: 'DATA LOADING SELECTOR', w: 168, h: 44, sys: null,
    desc: 'Data loading selector for loading avionics databases on the ground.',
    items: [
      lb(98, 8, 'DATA LOADING SELECTOR', 4.6),
      pb(24, 18, 'NEXT', '', '', 'Selects the next system to load.', { s: 9, rect: true }),
      pb(24, 28, 'PREV', '', '', 'Selects the previous system.', { s: 9, rect: true }),
      pb(24, 38, 'SEL CTL', '', '', 'Selects the system shown.', { s: 9, rect: true }),
      disp(92, 27, 64, 'FMGC 1', 'DLS', 'Shows the selected system.', { lbl: ' ' }),
      tog(150, 27, 'DLS POWER', ['ON', 'OFF'], 1, 'Data loading selector power.', { noname: true })
    ]
  };

  P.READL = { title: '', name: '', w: 168, h: 186, sys: null, desc: '', deco: true, items: [
    dec('light', 60, 52, 22), sel(126, 52, 'READING LT', ['OFF', 'BRT'], 0, 'Reading light brightness.', { r: 8, light: true }),
    dec('hole', 70, 120, 14), dec('hole', 70, 158, 14) ] };
  P.READR = { title: '', name: '', w: 168, h: 76, sys: null, desc: '', deco: true, items: [
    lb(84, 14, 'DATA LOADING', 4.6), dec('light', 62, 48, 18), sel(128, 48, 'READING LT', ['OFF', 'BRT'], 0, 'Reading light brightness.', { r: 7, light: true }) ] };

  /* Circuit breaker panel: rows HA to A, columns 1 to 14. */
  var CB_ROWS = [
    ['HA', 'OXYGEN · COM', ['OXY SPLY', 'CTL & WARN', 'PASS 1', 'PASS 2', 'ACTUATION', 'CIDS DEU A', 'L FWD', 'R FWD', 'L AFT', 'R AFT', 'ESS', '', '', '']],
    ['H', 'COM · LIGHTING · ELEC · NAV', ['CIDS ESS', 'FWD ATTND', 'XFMR', 'ICE IND', 'EMER LT', 'CABIN', 'CKPT DOME', '', 'LT CTL', 'AC BUS', 'SYS MONG', '', '', 'ADF 1']],
    ['G', 'COM · NAV', ['DIR ESS 1', 'DIR ESS 2', 'DEU B ESS', '', '', 'SELCAL', 'AUDIO 1', 'AUDIO 2', 'VHF 1', 'RMP 1', 'ATC 1', 'MMR 1', 'VOR 1', 'DME 1']],
    ['F', 'FWS · SDAC · NAV & PROBES', ['FWC1', 'SDAC 1', 'SDAC 2', 'SDAC SPLY', 'ESS BUS', 'ADIRU 1', 'AOA 1', '', 'ADIRU 3', 'CAPT LOUD', 'CLOCK', 'STBY INST', '', '']],
    ['E', 'EIS · COM', ['ND CAPT', 'ND SWTG', 'PFD CAPT', 'PFD SWTG', 'ECAM DU', 'ECAM SWTG', 'DMC3 SWTG', '', 'DMC1 SWTG', 'DMC3 STBY', 'DMC1 SPLY', 'ECAM CTL', 'CVR CTL', 'CVR DC']],
    ['D', 'ANTI ICE · AIR COND · AIRBLEED · HYD', ['RAIN RPLNT', 'PITOT 1', 'PROBES 1', 'AOA 1', 'AVNCS VENT', 'TEMP IND', 'TEMP CTL', 'CHAN B', 'CAB PRESS', 'RAM AIR', 'ENG 1 MONG', 'ENG 1 CTL', 'X FEED VLV', 'RAT CTL']],
    ['C', 'ANTI ICE · AIR COND · L/G · HYD', ['WING MONG', 'WING CTL', '', '', 'CIDS SDF', 'AFT CRG VENT', 'CRG MONG', '', 'LGCIU 1', 'ABCU', 'HYD XMTR', 'B WARN', 'FIRE VLV G', 'FIRE VLV Y']],
    ['B', 'AUTO FLT · FLIGHT CONTROLS · APU', ['MCDU 1', 'FMGC 1', 'FAC 1 AC', 'FAC 1 DC', 'FCU 1', 'SLT CTL 1', 'FLP CTL 1', 'SEC 1 NORM', 'THS MOT 2', 'FCDC 1', 'ELAC 1 NORM', 'SLT FLP POS', '', 'FUEL BLOW']],
    ['A', 'ENGINE · FUEL', ['HP SOV 1', 'HP SOV 2', 'IGN A', 'FADEC A1', 'FADEC A2', 'LOOP A', 'LOOP B', 'LP VLV 1', 'LP VLV 2', 'XFR L', 'XFR R', 'X FEED MOT', 'FQI 1', 'SMOKE PUMP']]
  ];
  (function () {
    var items = [lb(150, 7, 'CIRCUIT BREAKERS', 5)];
    CB_ROWS.forEach(function (row, r) {
      var y = 26 + r * 21;
      items.push(lb(10, y + 1.5, row[0], 4.4), lb(290, y + 1.5, row[0], 4.4), lb(150, y - 9, row[1], 3.4));
      row[2].forEach(function (label, c) {
        var x = 30 + c * 18.5, green = /FIRE|LOOP|HP SOV|IGN|ELAC|SEC|FAC|ADIRU|SDAC|FWC|DMC|PITOT|AOA/.test(label);
        if (!label) items.push({ k: 'cbempty', x: x, y: y });
        else items.push({ k: 'cb', x: x, y: y, name: label + ' (' + row[0] + (c + 1) + ')', green: green, info: 'Circuit breaker ' + row[0] + (c + 1) + ', ' + label + '. Pull to open the circuit, push to reset. ' + (green ? 'Green collar: monitored, so ECAM shows C/B TRIPPED if it pops.' : 'Black collar: not monitored by ECAM.') });
      });
    });
    for (var c = 0; c < 14; c++) items.push(lb(30 + c * 18.5, 214, String(c + 1), 4));
    P.CB = { title: '', name: 'CIRCUIT BREAKERS', w: 300, h: 220, sys: null, desc: 'Aft overhead circuit breaker panel, rows HA to A and columns 1 to 14. Green-collared breakers are monitored by ECAM.', items: items };
  })();

  P.AFTBOTTOM = {
    title: '', name: 'LOUDSPEAKER · TOILET · AUDIO', w: 300, h: 58, sys: null,
    desc: 'Overhead loudspeaker, toilet occupied light and reading light.',
    items: [
      dec('speaker', 40, 30, 16),
      pb(84, 22, 'TOILET', '', '', 'Lights when the forward toilet is occupied.', { s: 13, rect: false }),
      dec('light', 150, 30, 22)
    ]
  };

  // Glareshield, main panel, pedestal and side console panels: js/panels-lower.js

  /* ------------------------------------------------------------ renderer */
  // Gradients and filters used by the lifelike rendering. Included once in
  // every SVG that draws panels (the deck and the expanded view).
  function defs() {
    return '<defs>' +
      '<linearGradient id="g-panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d9fb7"/><stop offset=".55" stop-color="#7c8fa8"/><stop offset="1" stop-color="#6f829b"/></linearGradient>' +
      '<linearGradient id="g-panel-dk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76899f"/><stop offset="1" stop-color="#62758b"/></linearGradient>' +
      '<linearGradient id="g-bezel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4248"/><stop offset=".25" stop-color="#14181b"/><stop offset="1" stop-color="#050607"/></linearGradient>' +
      '<linearGradient id="g-cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f363c"/><stop offset=".5" stop-color="#1c2125"/><stop offset="1" stop-color="#121518"/></linearGradient>' +
      '<linearGradient id="g-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity=".04"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="g-metal" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#f7f9fa"/><stop offset=".35" stop-color="#c3ccd3"/><stop offset=".8" stop-color="#7d8890"/><stop offset="1" stop-color="#58626a"/></radialGradient>' +
      '<radialGradient id="g-knob" cx=".38" cy=".28" r=".8"><stop offset="0" stop-color="#5b646c"/><stop offset=".55" stop-color="#22282d"/><stop offset="1" stop-color="#0b0d0f"/></radialGradient>' +
      '<linearGradient id="g-wing" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1f23"/><stop offset=".45" stop-color="#4d565e"/><stop offset=".55" stop-color="#3b434a"/><stop offset="1" stop-color="#121518"/></linearGradient>' +
      '<linearGradient id="g-chrome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f8a92"/><stop offset=".4" stop-color="#f4f7f9"/><stop offset=".7" stop-color="#a9b4bc"/><stop offset="1" stop-color="#5d676f"/></linearGradient>' +
      '<radialGradient id="g-screw" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#eef2f5"/><stop offset=".7" stop-color="#9eabb6"/><stop offset="1" stop-color="#5f6c77"/></radialGradient>' +
      '<linearGradient id="g-fire" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f1710"/><stop offset="1" stop-color="#4a0905"/></linearGradient>' +
      '<linearGradient id="g-fire-lit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a45"/><stop offset=".6" stop-color="#e3261b"/><stop offset="1" stop-color="#a5140c"/></linearGradient>' +
      '<linearGradient id="g-guard-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2463d" stop-opacity=".8"/><stop offset="1" stop-color="#8f1710" stop-opacity=".7"/></linearGradient>' +
      '<linearGradient id="g-guard-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f1f7" stop-opacity=".45"/><stop offset="1" stop-color="#9fb2c1" stop-opacity=".2"/></linearGradient>' +
      '<linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".13"/><stop offset=".4" stop-color="#fff" stop-opacity=".02"/><stop offset=".41" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="g-guard-o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a6a"/><stop offset=".5" stop-color="#ec5a3c"/><stop offset="1" stop-color="#b8381f"/></linearGradient>' +
      '<radialGradient id="g-knob-light" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#fbfbf9"/><stop offset=".55" stop-color="#d9dbdc"/><stop offset="1" stop-color="#8f969c"/></radialGradient>' +
      '<linearGradient id="g-wing-light" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b9bdc1"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#a7acb1"/></linearGradient>' +
      '<radialGradient id="g-boss" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#3d444b"/><stop offset=".7" stop-color="#15191c"/><stop offset="1" stop-color="#050607"/></radialGradient>' +
      '<radialGradient id="g-grille" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e9ecef"/><stop offset=".8" stop-color="#9aa3ab"/><stop offset="1" stop-color="#5d666e"/></radialGradient>' +
      '<linearGradient id="g-panel-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c596e"/><stop offset=".6" stop-color="#424e62"/><stop offset="1" stop-color="#394457"/></linearGradient>' +
      '<linearGradient id="g-leather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f4a5a"/><stop offset=".5" stop-color="#2f3946"/><stop offset="1" stop-color="#232b35"/></linearGradient>' +
      '<linearGradient id="g-cs-wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9c4d4"/><stop offset=".6" stop-color="#97a3b5"/><stop offset="1" stop-color="#76839a"/></linearGradient>' +
      '<linearGradient id="g-cs-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55627a"/><stop offset="1" stop-color="#8592a6"/></linearGradient>' +
      '<linearGradient id="g-cs-arm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c899e"/><stop offset="1" stop-color="#56627a"/></linearGradient>' +
      '<linearGradient id="g-stick" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a424b"/><stop offset=".35" stop-color="#20262c"/><stop offset="1" stop-color="#0f1216"/></linearGradient>' +
      '<radialGradient id="g-tiller" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#4a525a"/><stop offset=".6" stop-color="#1c2025"/><stop offset="1" stop-color="#0b0d0f"/></radialGradient>' +
      '<linearGradient id="g-mic" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6c747d"/><stop offset=".4" stop-color="#a7afb8"/><stop offset="1" stop-color="#5a626b"/></linearGradient>' +
      '<pattern id="p-knurl" width="1.4" height="1.4" patternUnits="userSpaceOnUse"><rect width="1.4" height="1.4" fill="#16191c"/><circle cx=".7" cy=".7" r=".42" fill="#2f353a"/></pattern>' +
      '<filter id="f-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".9"/></filter>' +
      '<filter id="f-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>' +
      '</defs>';
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function text(x, y, s, cls, size, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + cls + '" font-size="' + size + '" text-anchor="' + (anchor || 'middle') + '">' + esc(s) + '</text>';
  }
  function nameLines(x, yTop, name, size) {
    if (!name) return '';
    var lines = name.split('\n'), o = '';
    for (var i = 0; i < lines.length; i++) o += text(x, yTop - (lines.length - 1 - i) * (size + 0.6), lines[i], 'pn-name', size);
    return o;
  }
  function polar(x, y, r, deg) { var a = (deg - 90) * Math.PI / 180; return [x + r * Math.cos(a), y + r * Math.sin(a)]; }

  function glowText(x, y, L, fs) {
    return '<text x="' + x + '" y="' + y + '" class="lg-glow lg-' + L.c + '" font-size="' + fs + '" text-anchor="middle" filter="url(#f-glow)">' + esc(L.s) + '</text>';
  }
  function vletters(x, y, s, size, cls) {
    var o = '', n = s.length, step = size * 1.05;
    for (var i = 0; i < n; i++) o += text(x, y - (n - 1) * step / 2 + i * step + size * 0.35, s[i], cls || 'pn-label', size);
    return o;
  }
  function drawRound(it, st) {
    var r = (it.s || 11) / 2, x = it.x, y = it.y, o = '';
    o += '<circle cx="' + (x + 0.5) + '" cy="' + (y + 0.9) + '" r="' + (r + 1.4) + '" class="shadow"/>';
    o += '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 1.2) + '" class="rnd-rim"/>';
    o += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="rnd-btn' + (it.red ? ' red' : '') + (st.down ? ' down' : '') + '"/>';
    o += it.jack ? '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.35) + '" class="rnd-jack"/>' : '<circle cx="' + (x - r * 0.25) + '" cy="' + (y - r * 0.25) + '" r="' + (r * 0.35) + '" class="rnd-hi"/>';
    if (it.noname) return o;
    if (it.nameSide) o += text(x, y - r - 2.6, it.name, 'pn-name', 3.6);
    else o += nameLines(x, y - r - 3, it.name, Math.max(3.2, Math.min(4.6, r * 0.8)));
    return o;
  }
  function drawGuard(it, x, y, s, h, st) {
    var o = '', g = it.guard;
    if (st.guardOpen) {
      return '<rect x="' + (x - h - 2.5) + '" y="' + (y - h - 4.4) + '" width="' + (s + 5) + '" height="2.6" rx="1" class="guard guard-' + g + ' open"/>';
    }
    if (g === 'o') {
      o += '<path d="M' + (x - h - 2) + ' ' + (y - h - 1) + ' h' + (s * 0.22) + ' v-2 h' + (s * 0.56 + 4) + ' v2 h' + (s * 0.22) + ' v' + (s + 2) + ' h-' + (s * 0.22) + ' v2 h-' + (s * 0.56 + 4) + ' v-2 h-' + (s * 0.22) + ' z" class="guard guard-o"/>';
      o += '<rect x="' + (x - h + 1) + '" y="' + (y - h + 1) + '" width="' + (s - 2) + '" height="' + (s * 0.3) + '" rx="1" class="gloss"/>';
    } else if (g === 'g') {
      o += '<rect x="' + (x - h - 2.2) + '" y="' + (y - h - 2.2) + '" width="' + (s + 4.4) + '" height="' + (s + 4.4) + '" rx="1.6" class="guard guard-g"/>';
      var q = s / 2 - 1.4;
      o += '<rect x="' + (x - h + 0.6) + '" y="' + (y - h + 0.6) + '" width="' + q + '" height="' + q + '" class="guard-win"/>' +
        '<rect x="' + (x + 0.8) + '" y="' + (y - h + 0.6) + '" width="' + q + '" height="' + q + '" class="guard-win"/>' +
        '<rect x="' + (x - h + 0.6) + '" y="' + (y + 0.8) + '" width="' + q + '" height="' + q + '" class="guard-win"/>' +
        '<rect x="' + (x + 0.8) + '" y="' + (y + 0.8) + '" width="' + q + '" height="' + q + '" class="guard-win"/>';
    } else {
      o += '<rect x="' + (x - h - 3) + '" y="' + (y - h - 3) + '" width="' + (s + 6) + '" height="' + (s + 6) + '" rx="2" class="guard guard-' + g + '"/>';
      o += '<line x1="' + (x - h - 3) + '" y1="' + (y - h - 2) + '" x2="' + (x + h + 3) + '" y2="' + (y - h - 2) + '" class="guard-hinge"/>';
    }
    return o;
  }
  function drawPb(it, st) {
    if (it.shape === 'round') return drawRound(it, st);
    if (it.k === 'ann' && it.round) {
      var rr = (it.s || 6) / 2, on = st.lit === 'up' || st.lit === 'both';
      return '<circle cx="' + it.x + '" cy="' + it.y + '" r="' + (rr + 0.8) + '" class="rnd-rim"/><circle cx="' + it.x + '" cy="' + it.y + '" r="' + rr + '" class="ann-dot' + (on ? ' on' : '') + '"/>' +
        text(it.x + rr + 2.4, it.y + 1.3, it.up ? it.up.s : '', 'pn-pos', 3, 'start');
    }
    var s = it.s || 20, h = s / 2, x = it.x, y = it.y, o = '', bw = it.w || s, bh = bw / 2;
    var lit = st.lit === 'none' ? null : (st.lit != null ? st.lit : (it.lit ? 'lo' : null));
    if (it.sdPage) lit = LIVE.sdPage === it.sdPage ? 'lo' : null; // ECAM page key: lit while its page shows
    if (it.clrKey) lit = LIVE.clr ? 'lo' : null; // CLR: lit while there is something to clear
    o += '<rect x="' + (x - bh - 1.2) + '" y="' + (y - h - 0.4) + '" width="' + (bw + 3.6) + '" height="' + (s + 3.6) + '" rx="2" class="shadow"/>';
    if (!it.rect && !it.noFrame) o += '<rect x="' + (x - bh - 2.3) + '" y="' + (y - h - 2.3) + '" width="' + (bw + 4.6) + '" height="' + (s + 4.6) + '" rx="2.2" class="pb-frame"/>';
    if (it.k === 'pb' || it.guard) o += '<rect x="' + (x - bh - 1.4) + '" y="' + (y - h - 1.4) + '" width="' + (bw + 2.8) + '" height="' + (s + 2.8) + '" rx="1.8" class="pb-bezel"/>';
    o += '<rect x="' + (x - bh) + '" y="' + (y - h) + '" width="' + bw + '" height="' + s + '" rx="1.4" class="pb-cap' + (it.k === 'ann' ? ' ann' : '') + '"/>';
    var lfs = Math.max(2.6, s * 0.23);
    if (it.k === 'pb' && it.lo && !it.bar && !it.rect && !isStatus(it.lo)) o += '<rect x="' + (x - s * 0.33) + '" y="' + (y + s * 0.3 - lfs * 0.95) + '" width="' + (s * 0.66) + '" height="' + (lfs * 1.3) + '" rx="0.6" class="lg-box"/>';
    if (it.up && it.lo && !it.bar && !it.rect) o += '<line x1="' + (x - h + 1.5) + '" y1="' + (y + s * 0.06) + '" x2="' + (x + h - 1.5) + '" y2="' + (y + s * 0.06) + '" class="pb-split"/>';
    var fs = Math.max(2.6, s * 0.23);
    if (it.bar && it.capText) {
      // Legend printed on the cap with the light bar above it (FCU, EFIS, RMP).
      o += '<rect x="' + (x - bh + 2.4) + '" y="' + (y - h + 1.2) + '" width="' + (bw - 4.8) + '" height="1.5" rx=".7" class="pb-bar' + (lit ? ' on' : '') + '"/>';
      var cl = it.name.split('\n'), cs = it.cs || Math.min(3.4, s * 0.34);
      cl.forEach(function (t, i) { o += text(x, y + 1.6 + cs * 0.3 + (i - (cl.length - 1) / 2) * (cs + 0.4), t, 'pb-rect on', cs); });
    } else if (it.bar) {
      o += '<rect x="' + (x - h + 3) + '" y="' + (y - 1) + '" width="' + (s - 6) + '" height="2" rx="1" class="pb-bar' + (lit ? ' on' : '') + '"/>';
    } else if (it.rect && it.blankCap) {
      // no legend (MCDU line select keys)
    } else if (it.rect) {
      if ((it.sdPage || it.clrKey) && lit) o += '<rect x="' + (x - bh + 0.6) + '" y="' + (y - h + 0.6) + '" width="' + (bw - 1.2) + '" height="' + (s - 1.2) + '" rx="1" class="ecp-glow"/>';
      var rl = it.name.split('\n'), rs = Math.min(fs * 0.95, 3.4);
      rl.forEach(function (t, i) { o += text(x, y + rs * 0.36 + (i - (rl.length - 1) / 2) * (rs + 0.5), t, 'pb-rect' + (lit ? ' on' : ''), rs); });
    } else if (it.up && it.lo) {
      if (lit === 'up') o += glowText(x, y - s * 0.12, it.up, fs);
      if (lit === 'lo') o += glowText(x, y + s * 0.3, it.lo, fs);
      o += text(x, y - s * 0.12, it.up.s, 'lg lg-' + it.up.c + (lit === 'up' || lit === 'both' ? ' on' : ''), fs);
      o += text(x, y + s * 0.3, it.lo.s, 'lg lg-' + it.lo.c + (lit === 'lo' || lit === 'both' ? ' on' : ''), fs);
    } else if (it.up || it.lo) {
      var L = it.up || it.lo, ly = it.lo && !it.up ? y + s * 0.3 : (it.up && !it.lo && it.k === 'pb' ? y - s * 0.12 : y + fs * 0.36);
      if (lit) o += glowText(x, ly, L, fs);
      o += text(x, ly, L.s, 'lg lg-' + L.c + (lit ? ' on' : ''), fs);
    }
    o += '<rect x="' + (x - bh + 0.6) + '" y="' + (y - h + 0.6) + '" width="' + (bw - 1.2) + '" height="' + (s - 1.2) + '" rx="1" class="gloss"/>';
    if (st.down) o += '<rect x="' + (x - bh) + '" y="' + (y - h) + '" width="' + bw + '" height="' + s + '" rx="1.4" class="pb-down"/>';
    if (it.guard) o += drawGuard(it, x, y, s, h, st);
    if (it.auto) o += vletters(x + bh + 4.2, y, 'AUTO', 3.4);
    var ns = Math.max(3.2, Math.min(4.8, s * 0.25));
    if (!it.noname && !it.rect && !it.capText) {
      if (it.nameBelow) o += text(x + bh + 2, y + h + 1, it.name.replace(/\n/g, ' '), 'pn-name', ns, 'start');
      else o += nameLines(x, y - h - (it.guard ? 4.8 : 3.4), it.name, ns);
    }
    return o;
  }
  // ENG/APU FIRE pushbutton in its well, under a hinged red guard (as in the
  // owner's photos): first tap lifts the guard, the next pushes the button,
  // which then stays released out and arms the agent squibs.
  function drawFire(it, st) {
    var x = it.x, y = it.y, w = 44, h = 26, lit = !!st.lit, o = '', l = x - w / 2, t = y - h / 2, out = st.pushed ? 1.8 : 0;
    o += '<rect x="' + (l - 1.6) + '" y="' + (t - 1.6) + '" width="' + (w + 3.2) + '" height="' + (h + 3.2) + '" rx="2" class="fire-well"/>';
    if (lit) o += '<rect x="' + (l - 2) + '" y="' + (t - 2) + '" width="' + (w + 4) + '" height="' + (h + 4) + '" rx="4" class="fire-halo" filter="url(#f-soft)"/>';
    if (out) o += '<rect x="' + (l + 2) + '" y="' + (t + h - 5) + '" width="' + (w - 4) + '" height="4" class="fire-out"/>';
    o += '<rect x="' + (l + 1.4) + '" y="' + (t + 1.4 - out) + '" width="' + (w - 2.8) + '" height="' + (h - 2.8) + '" rx="2" class="fire-cap' + (lit ? ' on' : '') + '"/>';
    o += '<rect x="' + (l + 2.4) + '" y="' + (t + 2.2 - out) + '" width="' + (w - 4.8) + '" height="' + (h * 0.35) + '" rx="1.6" class="gloss"/>';
    o += text(x, y + 1.6 - out, 'FIRE', 'fire-txt' + (lit ? ' on' : ''), 7.4) + text(x, y + 8 - out, 'PUSH', 'fire-txt sm' + (lit ? ' on' : ''), 3.6);
    [l + 4.4, l + w - 4.4].forEach(function (sx) { o += '<ellipse cx="' + sx + '" cy="' + (y - out) + '" rx="1.8" ry="1.1" class="fire-slot"/>'; });
    var gl = l - 2.4, gw = w + 4.8;
    if (st.guardOpen) {
      // guard hinged up: seen nearly edge-on above the button, tab at the top
      var gt = t - 15;
      o += '<path d="M' + gl + ' ' + (t - 1) + ' L' + (gl + 3) + ' ' + gt + ' L' + (gl + gw - 3) + ' ' + gt + ' L' + (gl + gw) + ' ' + (t - 1) + ' Z M' + (gl + 3.6) + ' ' + (t - 3) + ' L' + (gl + 5.4) + ' ' + (gt + 2.4) + ' L' + (gl + gw - 5.4) + ' ' + (gt + 2.4) + ' L' + (gl + gw - 3.6) + ' ' + (t - 3) + ' Z" class="fire-guard" fill-rule="evenodd"/>';
      o += '<path d="M' + (x - 5) + ' ' + gt + ' l5 -5 l5 5 z" class="fire-guard"/><circle cx="' + x + '" cy="' + (gt - 1.8) + '" r="1.1" class="guard-hole"/>';
    } else {
      // guard closed over the button: red frame with a window, tab at the bottom
      var gt2 = t - 2.4, gh = h + 4.8;
      o += '<path d="M' + gl + ' ' + gt2 + ' h' + gw + ' v' + gh + ' h-' + gw + ' Z M' + (gl + 3) + ' ' + (gt2 + 3) + ' v' + (gh - 6) + ' h' + (gw - 6) + ' v-' + (gh - 6) + ' Z" class="fire-guard" fill-rule="evenodd"/>';
      o += '<rect x="' + (gl + 3) + '" y="' + (gt2 + 3) + '" width="' + (gw - 6) + '" height="' + (gh - 6) + '" class="fire-guard-glass"/>';
      o += '<path d="M' + (x - 5) + ' ' + (gt2 + gh) + ' l5 5 l5 -5 z" class="fire-guard"/><circle cx="' + x + '" cy="' + (gt2 + gh + 1.8) + '" r="1.1" class="guard-hole"/>';
    }
    return o;
  }
  function selAngles(n) {
    if (n === 2) return [-40, 40];
    var span = n <= 3 ? 90 : (n > 6 ? 270 : 150), out = [];
    for (var i = 0; i < n; i++) out.push(-span / 2 + i * span / (n - 1));
    return out;
  }
  /* Parking brake handle (owner's photo): a black bar with PARK BRK along it and a
   * grey flared pointer on its side. Drawn at ON (bar upright, pointer to ON on the
   * right) and turned a quarter turn anticlockwise for OFF (pointer up). */
  function drawPark(it, st) {
    var x = it.x, y = it.y, cur = st.cur != null ? st.cur : it.cur, a = (it.angs[cur] || 0) - 90;
    var o = text(x - 3, y - 15.6, 'OFF', 'pn-pos' + (cur === 0 ? ' cur' : ''), 3.4) + text(x + 17.5, y + 5.6, 'ON', 'pn-pos' + (cur === 1 ? ' cur' : ''), 3.4);
    var bar = function (dx, dy, cls) { return '<rect x="' + (x - 3.8 + dx) + '" y="' + (y - 15 + dy) + '" width="7.6" height="30.5" rx="1.6" class="' + cls + '"/>'; };
    o += '<g transform="rotate(' + a + ' ' + x + ' ' + y + ')">' + bar(0.9, 1.3, 'shadow') + bar(0, 0, 'park-bar') +
      '<path d="M' + (x + 3.8) + ' ' + (y - 5.2) + ' C' + (x + 7) + ' ' + (y - 4.6) + ' ' + (x + 9) + ' ' + (y - 1.2) + ' ' + (x + 15) + ' ' + (y - 0.3) +
      ' L' + (x + 15) + ' ' + (y + 0.3) + ' C' + (x + 9) + ' ' + (y + 1.2) + ' ' + (x + 7) + ' ' + (y + 4.6) + ' ' + (x + 3.8) + ' ' + (y + 5.2) + ' Z" class="park-ptr"/>' +
      '<g transform="rotate(90 ' + x + ' ' + y + ')">' + text(x, y + 1.6, 'PARK BRK', 'park-txt', 4.4) + '</g></g>';
    return o;
  }
  function drawSel(it, st) {
    if (it.park) return drawPark(it, st);
    var r = it.r || 8, x = it.x, y = it.y, cur = st.cur != null ? st.cur : it.cur, angs = it.angs || selAngles(it.pos.length), o = '';
    it.pos.forEach(function (p, i) {
      var q = polar(x, y, r + 5.5, angs[i]), tick = polar(x, y, r + 1.6, angs[i]), t2 = polar(x, y, r + 0.2, angs[i]);
      o += '<line x1="' + t2[0] + '" y1="' + t2[1] + '" x2="' + tick[0] + '" y2="' + tick[1] + '" class="pn-tick"/>';
      o += text(q[0], q[1] + 1.4, p, 'pn-pos' + (i === cur ? ' cur' : ''), it.fs || Math.max(2.8, r * 0.42));
    });
    var a = angs[cur] || 0, rot = ' transform="rotate(' + a + ' ' + x + ' ' + y + ')"';
    o += '<circle cx="' + (x + 0.7) + '" cy="' + (y + 1.3) + '" r="' + (r + 0.6) + '" class="shadow"/>';
    if (it.key) {
      o += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="rnd-rim"/><circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.8) + '" class="key-body"/>';
      o += '<rect x="' + (x - r * 0.12) + '" y="' + (y - r * 0.6) + '" width="' + (r * 0.24) + '" height="' + (r * 1.2) + '" class="key-slot"' + rot + '/>';
    } else if (it.light) {
      o += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="sel-skirt"/>';
      o += '<rect x="' + (x - r * 0.42 + 0.7) + '" y="' + (y - r * 1.02 + 1.2) + '" width="' + (r * 0.84) + '" height="' + (r * 1.95) + '" rx="' + (r * 0.36) + '" class="shadow"' + rot + '/>';
      o += '<rect x="' + (x - r * 0.42) + '" y="' + (y - r * 1.02) + '" width="' + (r * 0.84) + '" height="' + (r * 1.95) + '" rx="' + (r * 0.36) + '" class="sel-wing"' + rot + '/>';
      o += '<line x1="' + x + '" y1="' + (y - r * 0.92) + '" x2="' + x + '" y2="' + (y + r * 0.1) + '" class="sel-index"' + rot + '/>';
    } else {
      o += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="sel-body"/>';
      o += '<rect x="' + (x - r * 0.3 + 0.6) + '" y="' + (y - r * 1.12 + 1.1) + '" width="' + (r * 0.6) + '" height="' + (r * 2.24) + '" rx="' + (r * 0.26) + '" class="shadow"' + rot + '/>';
      o += '<rect x="' + (x - r * 0.3) + '" y="' + (y - r * 1.12) + '" width="' + (r * 0.6) + '" height="' + (r * 2.24) + '" rx="' + (r * 0.26) + '" class="sel-bar"' + rot + '/>';
      var tip = polar(x, y, r * 0.78, a);
      o += '<circle cx="' + tip[0] + '" cy="' + tip[1] + '" r="' + (r * 0.13) + '" class="sel-dot"/>';
    }
    if (!it.noname) o += nameLines(x, y - r - 9.5, it.name, Math.max(3.2, Math.min(5.2, r * 0.6)));
    return o;
  }
  function drawKnob(it, st) {
    var r = (it.r || 9) * (st.down ? (st.out ? 1.08 : 0.94) : 1), x = it.x, y = it.y, a = st.angle != null ? st.angle : it.a0 || 0, o = '';
    if (it.lo || it.hi) {
      for (var d = -120; d <= 120; d += 30) {
        var p1 = polar(x, y, r + 1.4, d), p2 = polar(x, y, r + 3.4, d);
        o += '<line x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" class="pn-tick"/>';
      }
      var lq = polar(x, y, r + 7.5, -125), rq = polar(x, y, r + 7.5, 125);
      o += text(lq[0], lq[1] + 2, it.lo, 'pn-pos', 3.6) + text(rq[0], rq[1] + 2, it.hi, 'pn-pos', 3.6);
    }
    o += '<circle cx="' + (x + 0.8) + '" cy="' + (y + 1.4) + '" r="' + (r + 0.6) + '" class="shadow"/>';
    if (it.light) {
      o += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="knob-light"/>';
      o += '<path d="M' + (x - r * 0.55) + ' ' + (y - r * 0.55) + ' Q' + x + ' ' + (y - r * 1.1) + ' ' + (x + r * 0.55) + ' ' + (y - r * 0.55) + '" class="knob-light-hi"/>';
      var lm = polar(x, y, r * 0.85, a), lm0 = polar(x, y, r * 0.05, a);
      o += '<line x1="' + lm0[0] + '" y1="' + lm0[1] + '" x2="' + lm[0] + '" y2="' + lm[1] + '" class="sel-index"/>';
      if (!it.noname) o += nameLines(x, y - r - 5, it.name, 4.2);
      return o;
    }
    o += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="knob-body"/>';
    for (var kd = 0; kd < 360; kd += 15) {
      var k1 = polar(x, y, r - 0.2, kd), k2 = polar(x, y, r * 0.78, kd);
      o += '<line x1="' + k1[0] + '" y1="' + k1[1] + '" x2="' + k2[0] + '" y2="' + k2[1] + '" class="knurl"/>';
    }
    o += '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.62) + '" class="knob-cap"/>';
    var m = polar(x, y, r * 0.9, a), m0 = polar(x, y, r * 0.3, a);
    o += '<line x1="' + m0[0] + '" y1="' + m0[1] + '" x2="' + m[0] + '" y2="' + m[1] + '" class="knob-mark"/>';
    if (!it.noname) o += nameLines(x, y - r - 5, it.name, 4.8);
    return o;
  }
  // ENG MASTER lever (owner's FCOM picture, 0.7.44): a square cap marked ENG 1/2 over a round
  // base, up at ON and down at OFF; ON and OFF on the outer side.
  function drawEngMaster(it, cur) {
    var x = it.x, y = it.y, d = it.labelsLeft ? -1 : 1, cy = cur === 0 ? y - 3 : y + 2.6, o = '';
    o += text(x + d * 9.5, y - 4.2, 'ON', 'pn-pos' + (cur === 0 ? ' cur' : ''), 3.2, d < 0 ? 'end' : 'start');
    o += text(x + d * 9.5, y + 7.4, 'OFF', 'pn-pos' + (cur === 1 ? ' cur' : ''), 3.2, d < 0 ? 'end' : 'start');
    o += '<circle cx="' + (x + 0.6) + '" cy="' + (y + 4.6) + '" r="6.6" class="shadow"/><circle cx="' + x + '" cy="' + (y + 4) + '" r="6.4" class="eng-base"/><circle cx="' + x + '" cy="' + (y + 4) + '" r="4.8" class="eng-well"/>';
    o += '<rect x="' + (x - 4.6) + '" y="' + (cy - 4) + '" width="10" height="9.4" rx="0.8" class="shadow"/>';
    o += '<rect x="' + (x - 5) + '" y="' + (cy - 4.7) + '" width="10" height="9.4" rx="0.8" class="eng-cap"/>';
    o += text(x, cy - 0.6, 'ENG', 'eng-cap-t', 3.2) + text(x, cy + 3.5, it.engCap, 'eng-cap-t', 3.4);
    return o;
  }
  // A/SKID & N/W STRG switch (owner's FCOM picture, 0.7.46): a grey tapered knob on a short
  // stem through a hex nut on a round base; up at ON, down at OFF; OFF underlined.
  function drawKnobTog(it, cur) {
    var x = it.x, y = it.y, d = cur === 0 ? -1 : 1, o = '', hex = [];
    o += text(x + 6, y - 5.4, 'ON', 'pn-pos' + (cur === 0 ? ' cur' : ''), 3.2, 'start');
    o += text(x + 5.6, y + 7.2, 'OFF', 'pn-pos' + (cur === 1 ? ' cur' : ''), 3.2, 'start') + '<line x1="' + (x - 6) + '" y1="' + (y + 8.4) + '" x2="' + (x + 12) + '" y2="' + (y + 8.4) + '" class="pn-arc"/>';
    o += '<circle cx="' + (x + 0.6) + '" cy="' + (y + 1) + '" r="5.2" class="shadow"/><circle cx="' + x + '" cy="' + y + '" r="5" class="ask-base"/>';
    for (var hd = 0; hd < 360; hd += 60) hex.push(polar(x, y, 3.6, hd).join(','));
    o += '<polygon points="' + hex.join(' ') + '" class="ask-nut"/><circle cx="' + x + '" cy="' + y + '" r="1.3" class="tog-hole"/>';
    var ky = y + d * 8.6;
    o += '<rect x="' + (x - 0.6) + '" y="' + Math.min(y, y + d * 3) + '" width="1.2" height="3" class="ask-stem"/>';
    o += '<path d="M' + (x - 1.3) + ' ' + (y + d * 2.6) + ' L' + (x - 2.6) + ' ' + ky + ' Q' + x + ' ' + (ky + d * 2.4) + ' ' + (x + 2.6) + ' ' + ky + ' L' + (x + 1.3) + ' ' + (y + d * 2.6) + ' Z" class="ask-knob"/>';
    return o;
  }
  function drawTog(it, st) {
    var x = it.x, y = it.y, n = it.pos.length, cur = st.cur != null ? st.cur : it.cur, o = '';
    if (it.vee) {
      // Three-way lever: left, down (centre) and right, like the EFIS ADF/VOR switches.
      var tip = [[-4.6, -3.2], [0, 5.2], [4.6, -3.2]][cur];
      o += text(x - 6, y - 2.4, it.pos[0], 'pn-pos' + (cur === 0 ? ' cur' : ''), 3.2, 'end') + text(x + 6, y - 2.4, it.pos[2], 'pn-pos' + (cur === 2 ? ' cur' : ''), 3.2, 'start') + text(x, y + 10.4, it.pos[1], 'pn-pos' + (cur === 1 ? ' cur' : ''), 3.2);
      if (it.num) o += text(x, y - 5.6, it.num, 'pn-name', 3.6);
      o += '<circle cx="' + (x + 0.5) + '" cy="' + (y + 1) + '" r="3.4" class="shadow"/><circle cx="' + x + '" cy="' + y + '" r="3.2" class="tog-base"/>';
      o += '<line x1="' + x + '" y1="' + y + '" x2="' + (x + tip[0]) + '" y2="' + (y + tip[1]) + '" class="tog-lever"/><circle cx="' + (x + tip[0]) + '" cy="' + (y + tip[1]) + '" r="1.7" class="tog-tip"/>';
      return o;
    }
    if (it.engCap) return drawEngMaster(it, cur);
    if (it.knobTog) return drawKnobTog(it, cur);
    var span = it.round ? 11 : 13, top = y - span / 2;
    it.pos.forEach(function (p, i) {
      var py = n === 1 ? y : top + i * span / (n - 1);
      o += text(x + (it.round ? 9 : 7), py + 1.3, p, 'pn-pos' + (i === cur ? ' cur' : (it.bat ? ' dim' : '')), 3.2, 'start');
    });
    var ty = cur < 0 ? y : (n === 1 ? y : top + cur * span / (n - 1));
    if (it.bat) {
      // Bat-handle toggle: a chrome lever that points clearly at the selected position.
      var up = ty < y, ly = y + (up ? -1 : 1) * 6.4;
      o += '<circle cx="' + (x + 0.5) + '" cy="' + (y + 0.9) + '" r="3.6" class="shadow"/><circle cx="' + x + '" cy="' + y + '" r="3.4" class="tog-base"/><circle cx="' + x + '" cy="' + y + '" r="1.6" class="tog-hole"/>';
      o += '<path d="M' + (x - 1.1) + ' ' + y + ' L' + (x - 1.7) + ' ' + ly + ' L' + (x + 1.7) + ' ' + ly + ' L' + (x + 1.1) + ' ' + y + ' Z" class="tog-chrome"/>';
      o += '<ellipse cx="' + x + '" cy="' + ly + '" rx="2.2" ry="1.6" class="tog-chrome-tip"/>';
      if (!it.noname) o += nameLines(x, y - span / 2 - 4.5, it.name, 4.2);
      return o;
    }
    if (it.round) {
      o += '<circle cx="' + (x + 0.6) + '" cy="' + (y + 1.2) + '" r="7.4" class="shadow"/>';
      o += '<circle cx="' + x + '" cy="' + y + '" r="7.2" class="rnd-rim"/><circle cx="' + x + '" cy="' + y + '" r="6.2" class="tog-boss"/>';
      if (it.bar3) {
        o += '<rect x="' + (x - 9) + '" y="' + (ty - 2.6) + '" width="12" height="5.2" rx="2.6" class="tog-bar3"/>';
        for (var bi = 0; bi < 3; bi++) o += '<circle cx="' + (x - 6.5 + bi * 3.6) + '" cy="' + ty + '" r="1.1" class="tog-hole"/>';
      } else {
        o += '<rect x="' + (x - 1.6 + 0.6) + '" y="' + (Math.min(y, ty) + 1) + '" width="3.2" height="' + (Math.abs(ty - y) + 2) + '" rx="1.2" class="tog-shadow-r"/>';
        o += '<rect x="' + (x - 1.6) + '" y="' + (Math.min(y, ty) - 1) + '" width="3.2" height="' + (Math.abs(ty - y) + 2) + '" rx="1.2" class="tog-bat' + (it.guardRed ? ' red' : '') + '"/>';
        o += '<rect x="' + (x - 2.4) + '" y="' + (ty - 1.6) + '" width="4.8" height="3.2" rx="1.2" class="tog-bat-tip' + (it.guardRed ? ' red' : '') + '"/>';
      }
      if (!it.noname) o += nameLines(x, y - span / 2 - 5, it.name, 3.8);
      return o;
    }
    var hex = [];
    for (var hd = 30; hd < 390; hd += 60) hex.push(polar(x, y, 4.2, hd).join(','));
    o += '<circle cx="' + (x + 0.6) + '" cy="' + (y + 1.1) + '" r="4.4" class="shadow"/>';
    o += '<polygon points="' + hex.join(' ') + '" class="tog-base"/>';
    o += '<circle cx="' + x + '" cy="' + y + '" r="2.4" class="tog-hole"/>';
    o += '<line x1="' + (x + 0.8) + '" y1="' + (y + 1) + '" x2="' + (x + 0.8) + '" y2="' + (ty + 1) + '" class="tog-shadow"/>';
    o += '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + ty + '" class="tog-lever"/>';
    o += '<circle cx="' + x + '" cy="' + ty + '" r="1.9" class="tog-tip"/>';
    if (!it.noname) o += nameLines(x, y - span / 2 - 4.5, it.name, 4.2);
    return o;
  }
  function drawLever(it, st) {
    var x = it.x, y = it.y, on = st.on != null ? st.on : true, o = '';
    o += text(x, y - 18, 'ON', 'pn-pos' + (on ? ' cur' : ''), 4.2) + text(x, y + 22, 'OFF', 'pn-pos' + (!on ? ' cur' : ''), 4.2);
    o += '<rect x="' + (x - 3) + '" y="' + (y - 14) + '" width="6" height="28" rx="3" class="slot"/>';
    o += '<rect x="' + (x - 7) + '" y="' + (on ? y - 15 : y + 3) + '" width="14" height="12" rx="3" class="lever-hd"/>';
    o += '<line x1="' + (x - 5) + '" y1="' + (on ? y - 11 : y + 7) + '" x2="' + (x + 5) + '" y2="' + (on ? y - 11 : y + 7) + '" class="lever-grip"/>';
    return o;
  }
  function drawDisp(it, off, st) {
    var w = it.w, h = 11, o = '', val = st && st.typed != null ? st.typed : st && st.val != null ? st.val : it.val;
    o += '<rect x="' + (it.x - w / 2) + '" y="' + (it.y - h / 2) + '" width="' + w + '" height="' + h + '" rx="1" class="disp"/>';
    if (!off) o += text(it.x, it.y + 2.6, val, 'disp-txt' + (it.amber ? ' amber' : ''), 7);
    o += '<rect x="' + (it.x - w / 2) + '" y="' + (it.y - h / 2) + '" width="' + w + '" height="' + h + '" rx="1" class="glass"/>';
    o += text(it.x, it.y - h / 2 - 2, it.lbl || it.name, 'pn-name', 3.8);
    return o;
  }
  function drawWin(it, st) {
    var w = it.w, h = 12, o = '', val = st && st.val != null ? st.val : it.val;
    if (it.inl) {
      // FCU style: labels and value inside one window
      h = 22;
      o += '<rect x="' + (it.x - w / 2) + '" y="' + (it.y - h / 2) + '" width="' + w + '" height="' + h + '" rx="1" class="disp"/>';
      it.label.split('|').forEach(function (t, i, a) { if (it.fcu === 'spd' && i === (st && st.mach === false ? 1 : 0)) return; o += text(it.x - w / 2 + (i + 0.5) * w / a.length, it.y - 4.4, t, 'fcu-lbl', 4.2); });
      o += text(it.x, it.y + 7, val, 'fcu-txt', 10);
      return o + '<rect x="' + (it.x - w / 2) + '" y="' + (it.y - h / 2) + '" width="' + w + '" height="' + h + '" rx="1" class="glass"/>';
    }
    o += text(it.x, it.y - h / 2 - 2, it.label, 'pn-name', 3.6);
    o += '<rect x="' + (it.x - w / 2) + '" y="' + (it.y - h / 2) + '" width="' + w + '" height="' + h + '" rx="1" class="disp"/>';
    o += text(it.x, it.y + 2.8, val, 'fcu-txt', 7.4);
    o += '<rect x="' + (it.x - w / 2) + '" y="' + (it.y - h / 2) + '" width="' + w + '" height="' + h + '" rx="1" class="glass"/>';
    return o;
  }

  // Lever in a slot with detents from y0 (first position) to y1 (last).
  function slidePos(it, i) { return it.ys ? it.ys[i] : it.pos.length < 2 ? it.y0 : it.y0 + i * (it.y1 - it.y0) / (it.pos.length - 1); }
  function drawSlide(it, st) {
    var x = it.x, cur = st.cur != null ? st.cur : it.cur, o = '', hw = it.hw || 9, side = it.side || 'r';
    if (it.style !== 'gear') o += '<rect x="' + (x - 2.4) + '" y="' + (it.y0 - 4) + '" width="4.8" height="' + (it.y1 - it.y0 + 8) + '" rx="2.4" class="slot"/>';
    it.pos.forEach(function (p, i) {
      var py = slidePos(it, i), lbl = it.labels ? it.labels[i] : p;
      if (side !== 'n') {
        if (side === 'r' || side === 'b') o += '<line x1="' + (x + hw * 0.5 + 2) + '" y1="' + py + '" x2="' + (x + hw * 0.5 + 5.5) + '" y2="' + py + '" class="pn-tick"/>' + text(x + hw * 0.5 + 7, py + 1.4, lbl, 'pn-pos' + (i === cur ? ' cur' : ''), it.fs || 3.8, 'start');
        if (side === 'l' || side === 'b') o += '<line x1="' + (x - hw * 0.5 - 2) + '" y1="' + py + '" x2="' + (x - hw * 0.5 - 5.5) + '" y2="' + py + '" class="pn-tick"/>' + text(x - hw * 0.5 - 7, py + 1.4, lbl, 'pn-pos' + (i === cur ? ' cur' : ''), it.fs || 3.8, 'end');
      }
    });
    var y = slidePos(it, cur);
    if (it.style === 'gear') {
      // A320 gear lever handle: two knurled discs side by side (a wheel seen
      // edge on) on a knurled stem that runs down to the pivot.
      var hh2 = 23, top2 = y - hh2 / 2, stemTop = y + hh2 / 2 - 3, stemBot = it.y1 + hh2 / 2;
      if (stemBot - stemTop > 2) o += '<rect x="' + (x - 2.6) + '" y="' + stemTop + '" width="6.4" height="' + (stemBot - stemTop) + '" rx="1" class="gear-stem"/>' +
        '<line x1="' + (x + 0.6) + '" y1="' + (stemTop + 2) + '" x2="' + (x + 0.6) + '" y2="' + (stemBot - 1) + '" class="gear-stem-line"/>';
      o += '<rect x="' + (x - 5) + '" y="' + (top2 + 1.6) + '" width="12" height="' + hh2 + '" rx="2.8" class="shadow"/>';
      o += '<rect x="' + (x - 1.4) + '" y="' + (top2 + 3) + '" width="2.8" height="' + (hh2 - 6) + '" class="gear-hub2"/>';
      [x - 6.4, x + 0.9].forEach(function (dx) {
        o += '<rect x="' + dx + '" y="' + top2 + '" width="5.5" height="' + hh2 + '" rx="2.75" class="gear-disc"/>';
        o += '<path d="M' + (dx + 0.9) + ' ' + (top2 + 3) + ' Q' + (dx + 0.5) + ' ' + (top2 + hh2 / 2) + ' ' + (dx + 0.9) + ' ' + (top2 + hh2 - 3) + '" class="gear-disc-hi"/>';
      });
    } else if (it.style === 'thr') {
      o += '<rect x="' + (x - hw / 2 + 0.8) + '" y="' + (y - 7) + '" width="' + hw + '" height="16" rx="2.4" class="shadow"/>';
      o += '<path d="M' + (x - hw / 2) + ' ' + (y + 6) + ' v-12 q0 -3 3 -3 h' + (hw - 6) + ' q3 0 3 3 v12 z" class="thr-hd"/>';
      o += '<rect x="' + (x - hw / 2 + 1.6) + '" y="' + (y + 4.2) + '" width="' + (hw - 3.2) + '" height="2.4" rx="1" class="thr-rev"/>';
      o += '<circle cx="' + (x + (it.athr || 0)) + '" cy="' + (y - 4.6) + '" r="2" class="athr-pb"/>';
    } else {
      var hh = it.hh || 7;
      o += '<rect x="' + (x - hw / 2 + 0.8) + '" y="' + (y - hh / 2 + 1.4) + '" width="' + hw + '" height="' + hh + '" rx="2" class="shadow"/>';
      o += '<rect x="' + (x - hw / 2) + '" y="' + (y - hh / 2) + '" width="' + hw + '" height="' + hh + '" rx="2" class="lever-hd"/>';
      o += '<line x1="' + (x - hw / 2 + 2) + '" y1="' + (y - 1) + '" x2="' + (x + hw / 2 - 2) + '" y2="' + (y - 1) + '" class="lever-grip"/>';
      if (it.mark) o += '<rect x="' + (x - hw / 2 + 1.4) + '" y="' + (y + 0.8) + '" width="' + (hw - 2.8) + '" height="1.4" class="lever-mark"/>';
    }
    if (it.name && !it.noname) o += nameLines(it.nx != null ? it.nx : x, it.ny != null ? it.ny : it.y0 - 8, it.name, it.ns || 4.4);
    return o;
  }
  /* Gravity gear extension hand crank, seen from above (owner's photos). Stowed:
   * the handle lies folded in its slot across the recess, red PULL & TURN placard
   * up. Pulled out: it unfolds into a black arm with a red knob, which then turns
   * clockwise about the hub, one whole turn per position. A press animates from
   * the previous position (st.from, st.t); the resting drawing is the same for
   * every turn, as on the aircraft. */
  var CRANK_TURN = 900, CRANK_FOLD = 450;
  function crankAngle(i) { return i < 2 ? 0 : (i - 1) * 360; }
  function drawCrank(it, st) {
    var x = it.x, y = it.y, cur = st.cur != null ? st.cur : it.cur, age = st.t ? Date.now() - st.t : Infinity, from = st.from;
    var o = '<circle cx="' + x + '" cy="' + y + '" r="15" class="grav-boss"/><circle cx="' + x + '" cy="' + y + '" r="12.6" class="crank-well"/>';
    if (cur === 0) {
      var stow = from === 1 && age < CRANK_FOLD ? ' style="animation: crank-stow ' + CRANK_FOLD + 'ms ease-out both; animation-delay: -' + age + 'ms"' : '';
      o += '<g class="crank-stowed"' + stow + '>' +
        '<rect x="' + (x - 10.5) + '" y="' + (y - 15.5) + '" width="21" height="' + (it.h - y + 14) + '" rx="3" class="crank-body"/>' +
        '<rect x="' + (x - 9) + '" y="' + (y - 14) + '" width="18" height="26" rx="2.2" class="grav-handle"/>' +
        text(x, y - 8, 'GRAVITY', 'grav-txt', 2.8) + text(x, y - 3, 'GEAR', 'grav-txt big', 3.6) + text(x, y + 1.6, 'EXTN', 'grav-txt big', 3.6) +
        text(x, y + 7, 'PULL &', 'grav-txt', 2.6) + text(x, y + 10.4, 'TURN', 'grav-txt', 2.6) +
        '<rect x="' + (x - 3) + '" y="' + (y + 14.5) + '" width="6" height="2.4" rx="1.2" class="crank-notch"/></g>';
      return o;
    }
    // Pulled out. The invisible ring centres the arm's box on the hub so it turns about it.
    var anim = '';
    if (from === 0 && cur === 1 && age < CRANK_FOLD) anim = 'animation: crank-unfold ' + CRANK_FOLD + 'ms ease-out both; animation-delay: -' + age + 'ms';
    else if (from != null && from > 0 && age < CRANK_TURN) anim = '--a0: ' + (crankAngle(from) - crankAngle(cur)) + 'deg; animation: crank-turn ' + CRANK_TURN + 'ms ease-in-out both; animation-delay: -' + age + 'ms';
    var kx = x - 27;
    o += '<g class="crank-arm"' + (anim ? ' style="' + anim + '"' : '') + '>' +
      '<circle cx="' + x + '" cy="' + y + '" r="34" fill="none" stroke="none"/>' +
      '<rect x="' + (kx - 1) + '" y="' + (y - 3) + '" width="' + (x - kx + 6) + '" height="9" rx="4.5" class="shadow"/>' +
      '<rect x="' + (kx - 2) + '" y="' + (y - 4.5) + '" width="' + (x - kx + 7) + '" height="9" rx="4.5" class="crank-bar"/>' +
      '<line x1="' + (kx + 2) + '" y1="' + (y - 3.4) + '" x2="' + (x + 2) + '" y2="' + (y - 3.4) + '" class="crank-bar-hi"/>' +
      '<path d="M' + (x - 19) + ' ' + (y + 1.6) + ' Q' + (x - 15.5) + ' ' + (y - 2.6) + ' ' + (x - 11.5) + ' ' + (y + 0.6) + '" class="crank-arrow"/>' +
      '<path d="M' + (x - 11.4) + ' ' + (y - 1.4) + ' L' + (x - 10.6) + ' ' + (y + 1.6) + ' L' + (x - 13.4) + ' ' + (y + 1.4) + ' Z" class="crank-arrow-hd"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="6.2" class="crank-hub"/>' +
      '<line x1="' + x + '" y1="' + y + '" x2="' + (x + 5.4) + '" y2="' + y + '" class="crank-index"/>' +
      '<circle cx="' + kx + '" cy="' + (y + 1.4) + '" r="5.4" class="shadow"/>' +
      '<circle cx="' + kx + '" cy="' + y + '" r="5.4" class="crank-knob"/>' +
      '<ellipse cx="' + (kx - 1.6) + '" cy="' + (y - 1.8) + '" rx="2.2" ry="1.3" class="crank-knob-hi"/>' +
      '</g>';
    return o;
  }
  function drawCb(it, st) {
    var x = it.x, y = it.y, o = '';
    o += '<circle cx="' + (x + 0.4) + '" cy="' + (y + 0.8) + '" r="5" class="shadow"/>';
    o += '<circle cx="' + x + '" cy="' + y + '" r="4.6" class="cb-collar' + (it.green ? ' green' : '') + '"/>';
    if (st.pulled) o += '<circle cx="' + x + '" cy="' + y + '" r="3.8" class="cb-white"/>';
    o += '<circle cx="' + x + '" cy="' + y + '" r="' + (st.pulled ? 2.6 : 3.2) + '" class="cb-cap"/>';
    o += '<circle cx="' + (x - 1) + '" cy="' + (y - 1) + '" r="1" class="rnd-hi"/>';
    o += text(x, y - 6.4, it.name.replace(/ \(.*\)$/, ''), 'cb-lbl', 2.4);
    return o;
  }
  function drawDec(it) {
    var x = it.x, y = it.y, r = it.r, o = '<circle cx="' + (x + 0.8) + '" cy="' + (y + 1.4) + '" r="' + (r + 1) + '" class="shadow"/>';
    if (it.kind === 'hole') return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="dec-hole"/><circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.7) + '" class="dec-hole-in"/>';
    if (it.kind === 'speaker') {
      o += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="dec-speaker"/>';
      for (var a = 0; a < 360; a += 30) for (var k = 1; k <= 3; k++) { var q = polar(x, y, r * k / 3.6, a + k * 12); o += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="0.8" class="dec-dot"/>'; }
    } else {
      o += '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 2) + '" class="dec-ring"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" class="dec-grille"/>';
      for (var gx = -r; gx <= r; gx += 3) for (var gy = -r; gy <= r; gy += 3) if (gx * gx + gy * gy < r * r * 0.8) o += '<circle cx="' + (x + gx) + '" cy="' + (y + gy) + '" r="0.9" class="dec-cell"/>';
    }
    return o;
  }
  function drawAcp() {
    var o = '', keys = ['VHF1', 'VHF2', 'VHF3', 'HF1', 'HF2', 'INT', 'CAB'];
    keys.forEach(function (k, i) {
      var x = 16 + i * 22.5;
      o += '<rect x="' + (x - 8) + '" y="8" width="16" height="9" rx="1" class="pb-cap"/>' + text(x, 14.2, 'CALL', 'acp-call', 3);
      o += '<circle cx="' + (x + 0.5) + '" cy="27.6" r="4.6" class="shadow"/><circle cx="' + x + '" cy="27" r="4.4" class="knob-light"/>' + text(x, 20.6, k, 'pn-name', 2.8);
    });
    o += '<circle cx="18" cy="44" r="5" class="rnd-rim"/><circle cx="18" cy="44" r="3.6" class="key-body"/>' + text(18, 37.4, 'INT/RAD', 'pn-name', 2.8);
    o += '<rect x="44" y="40" width="16" height="8" rx="1" class="pb-cap"/>' + text(52, 45.4, 'VOICE', 'pb-rect', 2.8);
    o += '<rect x="64" y="40" width="16" height="8" rx="1" class="pb-cap"/>' + text(72, 45.4, 'RESET', 'pb-rect', 2.8);
    o += '<circle cx="118" cy="44" r="4.4" class="knob-light"/>' + text(118, 37.4, 'PA', 'pn-name', 2.8);
    o += '<rect x="128" y="38" width="20" height="12" rx="1.4" class="pb-cap"/>' + text(138, 45.6, 'PA', 'pb-rect', 3);
    ['VOR1', 'VOR2', 'MKR', 'ILS', 'MLS', 'ADF1', 'ADF2'].forEach(function (k, i) {
      var x = 16 + i * 22.5;
      o += '<circle cx="' + x + '" cy="58" r="4" class="knob-light"/>' + text(x, 52, k, 'pn-name', 2.6);
    });
    return o;
  }
  function screw(x, y, deg) {
    var a = polar(x, y, 1.1, deg), b = polar(x, y, 1.1, deg + 180);
    return '<circle cx="' + x + '" cy="' + y + '" r="1.6" class="pn-screw"/><line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" class="pn-slot"/>';
  }
  function screws(w, h) { return screw(4, 4, 20) + screw(w - 4, 4, 70) + screw(4, h - 4, 120) + screw(w - 4, h - 4, 160); }

  // opts: { states: {i: state}, interactive: bool, selected: index }
  function render(id, opts) {
    var p = P[id], o = '', states = (opts && opts.states) || {};
    o += '<rect width="' + p.w + '" height="' + p.h + '" rx="2.5" class="pn-bg' + (p.tone ? ' pn-' + p.tone : '') + '"/>';
    o += '<rect x="0.6" y="0.6" width="' + (p.w - 1.2) + '" height="' + (p.h - 1.2) + '" rx="2.2" class="pn-bevel"/>';
    o += '<line x1="2" y1="' + (p.h - 0.7) + '" x2="' + (p.w - 2) + '" y2="' + (p.h - 0.7) + '" class="pn-lowedge"/>';
    if (!p.noScrews) o += screws(p.w, p.h);
    if (p.title) {
      var tw = p.title.length * 3.9 + 8, cx = p.w / 2;
      o += '<line x1="9" y1="8" x2="' + (cx - tw / 2) + '" y2="8" class="pn-rule"/>';
      o += '<line x1="' + (cx + tw / 2) + '" y1="8" x2="' + (p.w - 9) + '" y2="8" class="pn-rule"/>';
      o += text(cx, 10, p.title, 'pn-title', 6.2);
    }
    if (p.blank) return o;
    var off = poweredOff(p.items, states);
    p.items.forEach(function (it, i) {
      var st = states[i] || {}, g = '';
      // Panel switched off: its lights and displays are dark.
      if (off && (it.k === 'pb' || it.k === 'ann')) st = Object.assign({}, st, { lit: 'none' });
      switch (it.k) {
        case 'line': o += '<polyline points="' + it.pts.map(function (q) { return q.join(','); }).join(' ') + '" class="' + (p.flow ? 'pn-flow' : 'pn-div') + '"/>'; return;
        case 'label': o += text(it.x, it.y, it.s, 'pn-label', it.size); return;
        case 'box':
          var bw2 = it.s.length * it.size * 0.66 + 4;
          o += '<rect x="' + (it.x - bw2 / 2) + '" y="' + (it.y - it.size * 0.85) + '" width="' + bw2 + '" height="' + (it.size * 1.5) + '" class="pn-boxlbl"/>' + text(it.x, it.y + it.size * 0.36, it.s, 'pn-label', it.size); return;
        case 'vtext': o += vletters(it.x, it.y, it.s, it.size); return;
        case 'path': o += '<path d="' + it.d + '" class="pn-flow"/>'; return;
        case 'valve': o += '<circle cx="' + it.x + '" cy="' + it.y + '" r="' + it.r + '" class="pn-flow pn-valve"/>'; return;
        case 'cbempty': o += '<circle cx="' + it.x + '" cy="' + it.y + '" r="4.2" class="cb-hole"/>'; return;
        case 'dec': o += drawDec(it); return;
        case 'acp': o += drawAcp(); return;
        case 'raw': o += it.svg; return;
        case 'part': g = it.artFn ? it.artFn() : it.art; break;
        case 'slide': g = drawSlide(it, st); break;
        case 'crank': g = drawCrank(it, st); break;
        case 'cb': g = drawCb(it, st); break;
        case 'pb': case 'ann': g = drawPb(it, st); break;
        case 'fire': g = drawFire(it, st); break;
        case 'sel': g = drawSel(it, st); break;
        case 'knob': g = drawKnob(it, st); break;
        case 'tog': g = drawTog(it, st); break;
        case 'lever': g = drawLever(it, st); break;
        case 'disp': g = drawDisp(it, off, st); break;
        case 'win': g = drawWin(it, st); break;
        case 'ring': g = drawRing(it, st); break;
      }
      if (opts && opts.interactive) {
        o += '<g class="ctl' + (it.fcu || it.dim ? ' turn' : '') + (opts.selected === i ? ' sel' : '') + '" data-ctl="' + i + '" tabindex="0" role="button" aria-label="' + esc(ctlName(it)) + '">' + hitRect(it) + g + '</g>';
      } else o += g;
    });
    return o;
  }
  function hitRect(it) {
    var w = 26, h = 26;
    if (it.k === 'fire') { w = 56; h = 42; }
    else if (it.k === 'pb' || it.k === 'ann') { w = (it.w || it.s || 20) + 8; h = (it.s || 20) + 8; }
    else if (it.k === 'cb') { w = h = 11; }
    else if (it.k === 'sel' || it.k === 'knob') { w = h = (it.r || 8) * 2 + 10; }
    else if (it.k === 'lever') { w = 18; h = 44; }
    else if (it.k === 'win' || it.k === 'disp') { w = it.w + 4; h = it.inl ? 26 : 16; }
    else if (it.k === 'part') { w = it.w; h = it.h; }
    if (it.hit) { w = it.hit[0]; h = it.hit[1]; }
    if (it.k === 'ring') return '<rect x="' + (it.x - 15) + '" y="' + (it.y - it.r - 11) + '" width="30" height="9" rx="3" class="ctl-hit"/>';
    else if (it.k === 'slide') { var pad = it.style === 'gear' ? 12 : 8; w = (it.hw || 9) + 10; h = Math.abs(it.y1 - it.y0) + 2 * pad; return '<rect x="' + (it.x - w / 2) + '" y="' + (Math.min(it.y0, it.y1) - pad) + '" width="' + w + '" height="' + h + '" rx="3" class="ctl-hit"/>'; }
    return '<rect x="' + (it.x - w / 2) + '" y="' + (it.y - h / 2) + '" width="' + w + '" height="' + h + '" rx="3" class="ctl-hit"/>';
  }
  function ctlName(it) {
    if (it.k === 'fire') return it.label + ' FIRE pushbutton';
    return (it.name || it.label || '').replace(/\n/g, ' ');
  }

  // Legends driven by the aircraft systems. A press never lights these: they
  // come on only when the system detects the condition (a failure, smoke,
  // an armed squib, a discharged bottle, power available, a valve open).
  var STATUS = { FAULT: 1, SMOKE: 1, SQUIB: 1, DISCH: 1, AVAIL: 1, OPEN: 1, CALL: 1, EVAC: 1, 'SYS ON': 1, 'LO PR': 1, DECEL: 1, UNLK: 1, '\u25bc': 1, MASTER: 1, WARN: 1, CAUT: 1, AUTO: 1, LAND: 1, CAPT: 1, 'F/O': 1, FIRE: 1 };
  function isStatus(L) { return !!(L && STATUS[L.s]); }
  // The legend that shows the crew's selection (OFF, ON, ALTN, MAN...), or null.
  function selLegend(it) {
    if (it.k !== 'pb') return null;
    if (it.bar) return 'lo';
    if (it.rect) return null;
    if (it.lo && !isStatus(it.lo)) return 'lo';
    if (it.up && !isStatus(it.up)) return 'up';
    return null;
  }
  function kindOf(it) {
    if (it.k === 'ann') return 'indicator';
    if (it.k === 'pb') return selLegend(it) ? 'latching' : 'momentary';
    if (it.k === 'cb') return 'cb';
    return it.k;
  }
  function statusLegends(it) { return [it.up, it.lo].filter(isStatus).map(function (L) { return L.s; }); }

  // What tapping one control does in the expanded view. Pushbuttons latch
  // between their two selections only; momentary ones spring back.
  function press(it, st) {
    st = Object.assign({}, st);
    if (it.k === 'ann') return st;
    if (it.k === 'pb') {
      if (it.guard && !st.guardOpen) { st.guardOpen = true; return st; }
      var leg = selLegend(it);
      if (!leg) { st.down = true; return st; }
      // Toggle only the selection legend; a lit status legend (say FAULT) stays as it is.
      var b = litBits(st.lit, it);
      b[leg] = !b[leg];
      if (it.follow) b.lo = b.up;
      st.lit = bitsToLit(b, it);
    } else if (it.k === 'fire') {
      if (!st.guardOpen) st.guardOpen = true;
      else st.pushed = !st.pushed;
    } else if (it.k === 'sel' || it.k === 'tog') {
      var cur = st.cur != null ? st.cur : it.cur;
      st.cur = (cur + 1) % it.pos.length;
    } else if (it.k === 'ring') {
      st.cur = (st.cur != null ? st.cur : it.cur) ? 0 : 1;
    } else if (it.k === 'knob') {
      st.angle = ((st.angle || 0) + 40 + 120) % 240 - 120;
    } else if (it.k === 'lever') {
      st.on = st.on === false;
    } else if (it.k === 'slide' || it.k === 'crank') {
      // Steps one detent at a time, back and forth between the end stops.
      var c0 = st.cur != null ? st.cur : it.cur, dir = st.dir || (c0 >= it.pos.length - 1 ? -1 : 1);
      if (c0 + dir < 0 || c0 + dir >= it.pos.length) dir = -dir;
      st.cur = c0 + dir; st.dir = dir;
      // The crank animates from where it was (see drawCrank).
      if (it.k === 'crank') { st.from = c0; st.t = Date.now(); }
    } else if (it.k === 'cb') {
      st.pulled = !st.pulled;
    }
    return st;
  }

  function litBits(lit, it) {
    if (lit === 'none') return { up: false, lo: false };
    if (lit == null) return { up: false, lo: !!it.lit };
    return { up: lit === 'up' || lit === 'both', lo: lit === 'lo' || lit === 'both' };
  }
  function bitsToLit(b, it) {
    if (b.up && b.lo) return 'both';
    if (b.up) return 'up';
    if (b.lo) return 'lo';
    return it.lit ? 'none' : null;
  }

  // Press control i of a panel, including effects on other controls (the fire
  // pushbutton arms its agents' squibs; an armed agent lights DISCH when pressed).
  // Returns a short note about what happened, or null.
  function pressPanel(id, i, states) { return pressItems(P[id].items, i, states); }
  // A panel with its own power switch (RMP ON/OFF) is off when that switch is
  // at its OFF position (the item's power index).
  function poweredOff(items, states) {
    return items.some(function (it, i) {
      if (it.power == null) return false;
      var st = states[i] || {};
      return (st.cur != null ? st.cur : it.cur) === it.power;
    });
  }
  // FCU knobs (owner's request, 0.7.14): turning a knob changes the number in its
  // window: SPD 1 kt, HDG 1 degree, V/S 100 ft/min and ALT 100 or 1000 ft, chosen
  // with the ring around the ALT knob. dir is +1 clockwise, -1 anticlockwise.
  var FCU_START = { spd: 250, hdg: 360, alt: 35000, vs: 0, baro: 1013 }, FCU_SEQ = 0;
  // EFIS baro (owner's request, 0.7.20): kept in hPa; the ring shows it in hPa or inHg (0.01 inHg per click).
  function baroText(n, hpa) { return hpa ? String(Math.round(n)) : (n * 0.02953).toFixed(2); }
  // Mach is kept in hundredths (78 = .78); in this cruise 1 Mach hundredth is about 2.974 kt.
  function fcuText(k, n, mach) {
    if (k === 'spd' && mach) return '.' + ('0' + n).slice(-2);
    if (k === 'hdg') return ('00' + n).slice(-3);
    if (k === 'vs') return n === 0 ? '00oo' : (n > 0 ? '+' : '-') + ('0' + Math.abs(n) / 100).slice(-2) + 'oo';
    return String(n);
  }
  function turnFcu(items, i, states, dir) {
    var it = items[i], k = it.fcu, st = Object.assign({}, states[i]);
    st.angle = (st.angle || 0) + dir * 24;
    states[i] = st;
    var wi = items.findIndex(function (x) { return x.k === 'win' && x.fcu === k; }), ws = Object.assign({}, states[wi]);
    var ri = items.findIndex(function (x) { return x.k === 'ring'; }), ring = ri < 0 ? 1 : ((states[ri] || {}).cur != null ? states[ri].cur : items[ri].cur);
    if (k === 'baro') {
      var hpa = ri < 0 || ((states[ri] || {}).cur != null ? states[ri].cur : items[ri].cur) === 1;
      ws.n = Math.min(1080, Math.max(940, (ws.n != null ? ws.n : 1013) + dir * (hpa ? 1 : 0.3386)));
      ws.val = ws.std ? 'Std' : baroText(ws.n, hpa); states[wi] = ws;
      return ws.std ? 'Preset QNH ' + baroText(ws.n, hpa) + ': push the knob to use it (the window shows Std until then).' : 'QNH ' + ws.val + (hpa ? ' hPa.' : ' inHg.');
    }
    var mach = k === 'spd' && ws.mach !== false, n = ws.n != null ? ws.n : mach ? 78 : FCU_START[k];
    if (k === 'spd') n = mach ? Math.min(99, Math.max(10, n + dir)) : Math.min(399, Math.max(100, n + dir));
    else if (k === 'hdg') n = ((n + dir + 359) % 360) + 1;
    else if (k === 'alt') { var step = ring ? 1000 : 100; n = Math.min(49000, Math.max(100, Math.round((n + dir * step) / step) * step)); }
    else n = Math.min(6000, Math.max(-6000, n + dir * 100));
    // SPD and HDG managed: the turned value is a preset; the dot stays lit until pulled.
    ws.n = n; ws.val = fcuText(k, n, mach) + ((k === 'spd' || k === 'hdg') && !ws.sel ? '•' : k === 'alt' && ws.man ? '•' : ''); states[wi] = ws;
    return { spd: 'Speed ', hdg: 'Heading ', alt: 'Altitude ', vs: 'Vertical speed ' }[k] + ws.val + (k === 'alt' ? ' ft (' + (ring ? 1000 : 100) + ' ft steps)' : '') + '.';
  }
  // The 100/1000 ring around the FCU ALT knob: a pointer at 100 or 1000.
  function drawRing(it, st) {
    var cur = st.cur != null ? st.cur : it.cur, r = it.r + 3.2, o = '';
    o += '<circle cx="' + it.x + '" cy="' + it.y + '" r="' + r + '" class="knob-body"/>';
    var p = polar(it.x, it.y, r - 1.2, cur ? 30 : -30);
    o += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1" class="sel-dot"/>';
    return o;
  }
  // Push and pull (owner's request, 0.7.15). SPD and HDG: push = managed (dashes and
  // the managed dot), pull = selected (the value shows). ALT: push = managed CLB or DES
  // (dot lit), pull = OPEN CLB or OPEN DES. V/S: push = level off (V/S zero), pull =
  // V/S engaged at the value shown. The knob shows pushed in or pulled out briefly.
  var FCU_MSG = {
    spd: ['Pushed: managed speed. The FMGS sets the target (magenta on the PFD); the window shows dashes and the managed dot.', 'Pulled: selected speed '],
    hdg: ['Pushed: NAV, managed lateral guidance along the flight plan. Dashes and the managed dot.', 'Pulled: selected heading '],
    alt: ['Pushed: managed climb or descent (CLB or DES), keeping to the flight plan constraints. The managed dot lights.', 'Pulled: OPEN CLB or OPEN DES towards '],
    vs: ['Pushed: level off. V/S engages at zero.', 'Pulled: V/S engaged at ']
  };
  function pushFcu(items, i, states, how) {
    // A tap on the knob's centre alternates (owner's request, 0.7.19): push, then pull, then push...
    if (how === 'tap') how = items[i].fcu === 'baro' ? (efisWin(items, states).std ? 'push' : 'pull') : (states[i] || {}).last === 'push' ? 'pull' : 'push';
    var it = items[i], k = it.fcu, pull = how === 'pull';
    states[i] = Object.assign({}, states[i], { down: true, out: pull, last: how });
    // how and when the knob was last pushed or pulled: the PFD reads it for the FMA
    var wi = items.findIndex(function (x) { return x.k === 'win' && x.fcu === k; }), ws = Object.assign({}, states[wi]);
    if (k === 'baro') {
      var ri2 = items.findIndex(function (x) { return x.k === 'ring'; }), hp = ((states[ri2] || {}).cur != null ? states[ri2].cur : items[ri2].cur) === 1;
      ws.std = pull; ws.n = ws.n != null ? ws.n : 1013; ws.val = pull ? 'Std' : baroText(ws.n, hp); states[wi] = ws;
      return pull ? 'Pulled: STD, the standard setting (1013 hPa, 29.92 inHg) for flight levels. STD shows on the PFD.' : 'Pushed: QNH ' + ws.val + '. The PFD altitude is now height above sea level; QNH shows under the altitude scale.';
    }
    var mach = k === 'spd' && ws.mach !== false, n = ws.n != null ? ws.n : mach ? 78 : FCU_START[k];
    if (k === 'spd' || k === 'hdg') {
      ws.sel = pull; ws.n = n; ws.val = pull ? fcuText(k, n, mach) : '---•';
    } else if (k === 'alt') {
      ws.man = !pull; ws.n = n; ws.val = fcuText(k, n) + (pull ? '' : '•');
    } else {
      ws.n = pull ? n : 0; ws.val = fcuText(k, ws.n);
    }
    ws.how = how; ws.seq = ++FCU_SEQ;
    states[wi] = ws;
    var m = FCU_MSG[k];
    if (!pull) return m[0];
    if (k === 'spd' && mach) return 'Pulled: selected Mach ' + ws.val + ' (blue target on the PFD).';
    return m[1] + (k === 'vs' ? (ws.n > 0 ? '+' : '') + ws.n : ws.val) + { spd: ' kt (blue target on the PFD).', hdg: ' degrees (HDG mode).', alt: ' ft, ignoring the flight plan constraints.', vs: ' ft/min (V/S mode).' }[k];
  }
  // SPD/MACH pushbutton (owner's request, 0.7.17): swaps the SPD window between
  // IAS (kt) and Mach, converting the value shown (250 kt = .84, .78 = 232 kt here).
  function fcuMach(items, states) {
    var wi = items.findIndex(function (x) { return x.k === 'win' && x.fcu === 'spd'; }), ws = Object.assign({}, states[wi]);
    var mach = ws.mach !== false, n = ws.n != null ? ws.n : mach ? 78 : FCU_START.spd;
    n = mach ? Math.min(399, Math.max(100, Math.round(n * 2.974))) : Math.min(99, Math.max(10, Math.round(n / 2.974)));
    ws.mach = !mach; ws.n = n;
    if (ws.val && ws.val !== '---•') ws.val = fcuText('spd', n, !mach) + (ws.sel ? '' : '•');
    states[wi] = ws;
    return (mach ? 'IAS: the target is now in knots' : 'Mach: the target is now a Mach number') + (ws.sel ? ', ' + fcuText('spd', n, !mach) + '.' : '. The speed is managed, so the window keeps its dashes; the label shows ' + (mach ? 'SPD' : 'MACH') + '.');
  }
  function efisWin(items, states) { return states[items.findIndex(function (x) { return x.k === 'win' && x.fcu === 'baro'; })] || {}; }
  function pressItems(items, i, states, dir) {
    var it = items[i], st = states[i] || {};
    if (it.fcu) return typeof dir === 'string' ? pushFcu(items, i, states, dir) : turnFcu(items, i, states, dir || 1);
    // PFD and ND brightness knobs (owner's request, 0.7.23): one step per tap or drag, OFF to BRT.
    if (it.dim) {
      if (typeof dir !== 'number') return 'Tap the left side of the knob to dim, the right side to brighten.';
      var a = Math.max(-120, Math.min(120, (st.angle != null ? st.angle : it.a0 || 0) + 20 * dir));
      states[i] = Object.assign({}, st, { angle: a });
      return a <= -120 ? it.dim + ' off.' + (it.dim === 'PFD' ? ' The PFD image moves to the ND display.' : '') : it.dim + ' brightness ' + Math.round((a + 120) / 2.4) + '%.';
    }
    // PFD/ND XFR: each press swaps the two images over.
    if (it.xfr) {
      states[i] = Object.assign({}, st, { swap: !st.swap, down: true });
      return states[i].swap ? 'PFD and ND swapped: the ND shows on the outer display, the PFD on the inner one.' : 'PFD and ND back on their normal displays.';
    }
    if (it.power == null && poweredOff(items, states) && (it.k === 'pb' || it.k === 'ann' || it.k === 'knob' || it.k === 'disp'))
      return 'Nothing happens: the panel is switched off. Switch it ON first.';
    if (it.agent && !(it.guard && !st.guardOpen)) {
      var bb = litBits(st.lit, it);
      if (bb.up && !bb.lo) { states[i] = Object.assign({}, st, { lit: 'both', down: true }); return 'Agent discharged: DISCH is lit.'; }
      if (bb.lo) { states[i] = Object.assign({}, st, { down: true }); return 'This bottle is already discharged.'; }
      states[i] = Object.assign({}, st, { down: true });
      return 'Nothing happens: the squib is not armed. Push the fire pushbutton first.';
    }
    states[i] = press(it, st);
    if (it.fcuMach) return fcuMach(items, states);
    if (it.k === 'ring' && it.baro) {
      var bw = items.findIndex(function (x) { return x.k === 'win' && x.fcu === 'baro'; }), bs = Object.assign({}, states[bw]), hp2 = states[i].cur === 1;
      if (!bs.std) bs.val = baroText(bs.n != null ? bs.n : 1013, hp2);
      states[bw] = bs;
      return 'Baro units: ' + (hp2 ? 'hPa' : 'inHg') + '.';
    }
    // Code keypad (ATC squawk): digits type into the panel's code display; after
    // four digits that is the new code. CLR always removes the right-hand digit
    // shown (owner's request), whether typing or not; the next digits refill it.
    if (it.code) {
      var di = items.findIndex(function (x) { return x.k === 'disp' && x.code; }), ds = Object.assign({}, states[di] || {});
      if (it.code === 'CLR') ds.typed = (ds.typed != null ? ds.typed : ds.val || items[di].val).slice(0, -1);
      else { ds.typed = (ds.typed || '') + it.code; if (ds.typed.length === 4) { ds.val = ds.typed; ds.typed = null; } }
      states[di] = ds;
      return ds.typed != null ? 'Typing: ' + (ds.typed || '-') + ' (' + (4 - ds.typed.length) + ' more)' : 'Code ' + (ds.val || items[di].val) + '.';
    }
    if (it.k === 'fire' && !st.guardOpen) return 'Guard lifted. Tap again to push the ' + it.label + ' FIRE pushbutton.';
    // Radio groups (AUTO BRK LO/MED/MAX): selecting one deselects the others.
    if (it.group && litBits(states[i].lit, it).lo) {
      items.forEach(function (o, j) {
        if (j === i || o.group !== it.group) return;
        var bj = litBits((states[j] || {}).lit, o);
        if (bj.lo) { bj.lo = false; states[j] = Object.assign({}, states[j], { lit: bitsToLit(bj, o) }); }
      });
    }
    if ((it.k === 'tog' || it.k === 'sel') && it.spring != null) {
      var st2 = states[i];
      if (st2.cur !== it.spring) { st2.down = true; st2.springTo = it.spring; }
    }
    if (it.k === 'fire') {
      var pushed = states[i].pushed;
      items.forEach(function (o, j) {
        if (o.agent !== it.arms) return;
        var s2 = states[j] || {}, b2 = litBits(s2.lit, o);
        if (pushed && !b2.up) { b2.up = true; states[j] = Object.assign({}, s2, { lit: bitsToLit(b2, o) }); }
        if (!pushed && b2.up && !b2.lo) states[j] = Object.assign({}, s2, { lit: null });
      });
      return pushed ? 'Fire pushbutton released out: SQUIB lights on its agents show the squibs are armed.' : 'Fire pushbutton reset.';
    }
    return null;
  }

  var MK = { legend: legend, pb: pb, gpb: gpb, ann: ann, sel: sel, knob: knob, tog: tog, disp: disp, ln: ln, lb: lb, box: box, vt: vt, rnd: rnd, ogpb: ogpb, dec: dec, text: text, polar: polar, esc: esc };
  window.ECAM_PANELS = { MK: MK, LIVE: LIVE, P: P, render: render, press: press, pressPanel: pressPanel, pressItems: pressItems, litBits: litBits, legend: legend, kindOf: kindOf, statusLegends: statusLegends, ctlName: ctlName, defs: defs, screw: screw };
})();
