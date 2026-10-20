/* A320 ECAM Trainer: failure catalogue and drills.
 *
 * The menu follows the owner's list of categories. A drill runs on the flight
 * deck itself: the failure lights MASTER WARN or MASTER CAUT, shows its ECAM
 * procedure on the E/WD and its page on the SD, and lights FAULT on the
 * overhead. The trainee works the procedure on the real panels.
 *
 * Procedures follow the structure of the A320 ECAM but are simplified for
 * training. They are not a substitute for the FCOM, QRH or operator procedures.
 *
 * Step kinds:
 *   master  press the lit MASTER WARN or MASTER CAUT
 *   act     an ECAM action line, done by setting panel controls
 *           (ctls: [[panel, control name, nth]...], sel: the selection legend lit, e.g. OFF;
 *           press: a momentary control to press, e.g. RAT MAN ON)
 *   note    an ECAM line that needs no action
 *   task    a lesson task (want: { sd: page } or { panel: id } or { ctl, sel })
 *   quiz    a knowledge check (the correct answer first; options are shuffled)
 */
(function () {
  'use strict';

  // ctls: the panel controls that make up the action (all set for it to count). press: a
  // momentary control that only has to be pressed.
  function A(item, val, ctls, o) { return Object.assign({ k: 'act', item: item, val: val, ctls: Array.isArray(ctls[0]) ? ctls : [ctls], sel: true }, o || {}); }
  function N(text, c) { return { k: 'note', text: text, c: c || 'c' }; }
  function T(text, want, info) { return { k: 'task', text: text, want: want, info: info }; }
  function Q(q, correct, wrong, explain) { return { k: 'quiz', q: q, options: [correct].concat(wrong), explain: explain }; }
  var MASTER = { k: 'master' };

  // HYD overhead panel controls
  var RAT = ['HYD', 'RAT MAN ON', 1];
  var G_PUMP = ['HYD', 'ENG 1\nPUMP', 1], B_PUMP = ['HYD', 'ELEC\nPUMP', 1], PTU = ['HYD', 'PTU', 1], Y_PUMP = ['HYD', 'ENG 2\nPUMP', 1], Y_ELEC = ['HYD', 'ELEC\nPUMP', 2];
  function ptuOff(s) { s.hyd.ptu = 'off'; s.hyd.ptuActive = false; }

  var HYD_LEARN = [
    'Three independent systems at 3000 psi. Green: engine 1 pump and the PTU. Blue: an electric pump and the RAT. Yellow: engine 2 pump, an electric pump and a hand pump (cargo doors).',
    'The PTU links green and yellow. It runs on its own when their pressures differ by more than 500 psi, and transfers power, never fluid.',
    'Flight controls: ailerons G+B, left elevator B+G, right elevator Y+B, rudder G+B+Y, THS G+Y, slats G+B, flaps G+Y. Spoilers 1 and 5 green, 2 and 4 yellow, 3 blue.',
    'Green also drives the landing gear, normal brakes and reverser 1. Yellow drives the alternate brakes (with the accumulator) and reverser 2.'
  ];

  var DRILLS = {
    'hyd-overview': {
      title: 'HYD SYSTEM OVERVIEW', level: 1, sd: null, phase: 'Cruise · FL350',
      brief: 'A guided look at the hydraulic system: where its controls and indications are, and what each system powers. Nothing fails.',
      learn: HYD_LEARN,
      steps: [
        T('Press HYD on the ECAM control panel to show the hydraulic page.', { sd: 'HYD' },
          'The HYD page shows the three systems with their pressure, pumps, fire shut-off valves (green and yellow), the PTU and the reservoir levels at the bottom.'),
        Q('Which system can be pressurised by the RAT?', 'Blue', ['Green', 'Yellow', 'Green and yellow'],
          'The RAT drives a pump on the blue system only. It deploys automatically when AC BUS 1 and 2 are lost above 100 kt, or with RAT MAN ON.'),
        T('Open the overhead HYD panel.', { panel: 'HYD' },
          'Top row of the panel, from left: green ENG 1 PUMP, RAT MAN ON, blue ELEC PUMP, PTU, yellow ENG 2 PUMP and the yellow ELEC PUMP.'),
        T('Switch the yellow ELEC PUMP ON.', { ctl: Y_ELEC, sel: true },
          'The yellow electric pump is normally off. It is used on the ground (with the engines stopped) and in some failures. It also runs automatically when a cargo door is operated.'),
        T('Switch the yellow ELEC PUMP back off.', { ctl: Y_ELEC, sel: false }, 'Back to the normal cruise configuration.'),
        Q('When does the PTU run on its own?', 'When the green and yellow pressures differ by more than 500 psi', ['Whenever an engine is stopped', 'Only when selected ON by the crew', 'When the blue system is lost'],
          'The PTU is in AUTO in normal operation. On the ground it is inhibited during the first engine start and while the cargo doors are operated.'),
        Q('Which system drives the A320 normal brakes?', 'Green', ['Yellow', 'Blue', 'Blue and yellow'],
          'Normal braking is green. Alternate braking is yellow, with the brake accumulator as a back-up.'),
        Q('Which surfaces have only one hydraulic system?', 'The spoilers', ['The ailerons', 'The elevators', 'The rudder'],
          'Each spoiler pair has one system: 1 and 5 green, 2 and 4 yellow, 3 blue. Ailerons and elevators have two systems each, the rudder three.')
      ]
    },

    'hyd-g-rsvr': {
      title: 'HYD G RSVR LO LVL', sysWord: 'HYD', level: 2, sd: 'HYD', phase: 'Cruise · FL370',
      brief: 'Cruise at FL370. The green reservoir level drops quickly: a leak. Green pressure follows.',
      learn: HYD_LEARN.concat(['With green lost: normal brakes and autobrake, gear retraction and normal extension, spoilers 1 and 5 and reverser 1 are lost. The gear is gravity extended.']),
      setup: function (s) { var g = s.hyd.G; g.rsvr = 'lo'; g.qty = 0.05; g.leak = true; g.p = 0; },
      lights: [G_PUMP, PTU],
      memo: [],
      steps: [
        MASTER,
        A('PTU', 'OFF', PTU, { clears: true, fx: ptuOff,
          why: 'With the green fluid gone, the PTU would run unloaded and overheat, and could take power from yellow.' }),
        Q('Why is the PTU switched off first?', 'It would run against an empty green system and overheat', ['It transfers fluid from yellow into the leak', 'It is needed to power the RAT', 'It only works on the ground'],
          'The PTU transfers power, not fluid. With no green fluid it runs unloaded and overheats.'),
        A('GREEN ENG 1 PUMP', 'OFF', G_PUMP, { clears: true, fx: function (s) { s.hyd.G.pump = 'off'; }, why: 'Stops the pump running dry.' }),
        Q('Green is now lost. Which wheel braking is still available?', 'Alternate braking (yellow), without autobrake', ['Normal braking with autobrake', 'Normal braking without autobrake', 'No wheel braking'],
          'Normal brakes and autobrake are green, so they are lost (NORM BRK and AUTO BRK on INOP SYS). The alternate brakes are yellow: the STATUS shows ALTN BRK ONLY.')
      ],
      sts: { left: [['APPR PROC', 'w'], ['L/G.......GRVTY EXTN', 'c'], ['SLATS SLOW', 'g'], ['FLAPS SLOW', 'g'], ['ALTN BRK ONLY', 'g']],
        inop: ['G HYD', 'NORM BRK', 'AUTO BRK', 'SPLR 1+5', 'REVERSER 1', 'L/G RETRACT'] },
      statusQ: Q('With green lost, how is the landing gear extended?', 'Gravity extension, using the handcrank', ['Normal extension, powered by yellow', 'Normal extension, powered by blue', 'It cannot be extended'],
        'The gear uses green only. The gravity extension handcrank releases the uplocks and the gear free-falls.')
    },

    'hyd-b-lopr': {
      title: 'HYD B SYS LO PR', sysWord: 'HYD', level: 2, sd: 'HYD', phase: 'Cruise · FL350',
      brief: 'Cruise at FL350. The blue electric pump fails and blue pressure is lost. Green and yellow are normal.',
      learn: HYD_LEARN.concat(['Blue powers one aileron and one elevator actuator each side, spoiler 3, the slats (with green) and the emergency generator when the RAT is out.']),
      setup: function (s) { s.hyd.B.fail = true; s.hyd.B.p = 0; },
      lights: [B_PUMP],
      memo: [],
      steps: [
        MASTER,
        A('BLUE ELEC PUMP', 'OFF', B_PUMP, { clears: true, fx: function (s) { s.hyd.B.pump = 'off'; }, why: 'Switching off a pump that has lost pressure protects it and confirms the failure.' }),
        Q('Can the PTU help the blue system?', 'No: it only links green and yellow', ['Yes, automatically', 'Yes, when selected ON', 'Only on the ground'],
          'The PTU sits between green and yellow. Blue has its own electric pump and the RAT.'),
        Q('With blue lost, how do the slats move?', 'Slowly, on green only', ['Normally', 'Not at all', 'Slowly, on yellow'],
          'Slats are powered by green and blue. With blue lost they still work on green, but slowly: SLATS SLOW on the STATUS.')
      ],
      sts: { left: [['SLATS SLOW', 'g']], inop: ['B HYD', 'SPLR 3'] },
      statusQ: Q('Which spoiler is lost with the blue system?', 'Spoiler 3 on each wing', ['Spoilers 1 and 5', 'Spoilers 2 and 4', 'All spoilers'],
        'Spoiler 3 is blue. 1 and 5 are green, 2 and 4 yellow.')
    },

    'hyd-y-pump': {
      title: 'HYD Y ENG 2 PUMP LO PR', sysWord: 'HYD', level: 2, sd: 'HYD', phase: 'Cruise · FL360',
      brief: 'Cruise at FL360. The yellow engine-driven pump loses pressure. The PTU takes over and keeps yellow pressurised from green.',
      learn: HYD_LEARN,
      setup: function (s) { s.hyd.Y.fail = true; s.hyd.ptuActive = true; },
      lights: [Y_PUMP],
      memo: [],
      steps: [
        MASTER,
        A('YELLOW ENG 2 PUMP', 'OFF', Y_PUMP, { clears: true, fx: function (s) { s.hyd.Y.pump = 'off'; }, why: 'Protects the failed pump. The PTU keeps the yellow system pressurised.' }),
        Q('What keeps the yellow system pressurised now?', 'The PTU, powered by green', ['The RAT', 'The blue electric pump', 'Nothing: yellow is lost'],
          'With more than 500 psi difference between green and yellow, the PTU runs and the SD shows its arrows. The yellow electric pump is also available.')
      ],
      sts: { left: [], inop: ['Y ENG 2 PUMP'] },
      statusQ: Q('If the PTU now failed as well, what could still pressurise yellow?', 'The yellow electric pump', ['The RAT', 'The blue electric pump', 'The green engine pump'],
        'The yellow electric pump (overhead, normally off) can be switched ON. The RAT is blue only.')
    },

    'hyd-by': {
      title: 'HYD B+Y SYS LO PR', sysWord: 'HYD', level: 3, sd: 'HYD', phase: 'Cruise · FL350',
      brief: 'In cruise. A yellow leak empties the yellow reservoir, and the blue electric pump fails. Only green remains.',
      learn: HYD_LEARN.concat(['With B+Y lost: alternate law, right elevator and spoilers 2, 3 and 4 lost, slats and flaps slow (green only), alternate braking and reverser 2 lost. The gear and normal brakes (green) still work.']),
      setup: function (s) { var y = s.hyd.Y; y.rsvr = 'lo'; y.qty = 0.05; y.leak = true; y.p = 0; s.hyd.B.fail = true; s.hyd.B.p = 0; s.fctl.law = 'ALTN'; },
      lights: [Y_PUMP, B_PUMP, PTU],
      memo: [{ t: 'LAND ASAP', c: 'a' }],
      steps: [
        MASTER,
        A('PTU', 'OFF', PTU, { clears: true, fx: ptuOff, why: 'With the yellow reservoir empty the PTU would only overheat.' }),
        A('YELLOW ENG 2 PUMP', 'OFF', Y_PUMP, { clears: true, fx: function (s) { s.hyd.Y.pump = 'off'; }, why: 'Protects the engine pump from running dry.' }),
        A('BLUE ELEC PUMP', 'OFF', B_PUMP, { clears: true, fx: function (s) { s.hyd.B.pump = 'off'; }, why: 'Protects the failed pump.' }),
        N('MANEUVER WITH CARE'),
        Q('Which elevator remains available?', 'The left elevator (green)', ['The right elevator', 'Both elevators', 'Neither'],
          'Left elevator B+G keeps green. Right elevator Y+B is lost. The THS (G+Y) still works on green.'),
        Q('Which law do the flight controls revert to?', 'Alternate law', ['Normal law', 'Direct law at all times', 'Mechanical backup'],
          'Any dual hydraulic failure gives alternate law. It reverts to direct law when the gear is extended.')
      ],
      sts: { left: [['MAX SPEED.........320 KT', 'c'], ['MANEUVER WITH CARE', 'c'], ['APPR PROC', 'w'], ['SLATS SLOW', 'g'], ['FLAPS SLOW', 'g']],
        inop: ['B+Y HYD', 'F/CTL PROT', 'SPLR 2+3+4', 'ALTN BRK', 'REVERSER 2', 'CAT 2'] },
      statusQ: Q('Can the landing gear be extended normally?', 'Yes: the gear is green, which still works', ['No: gravity extension is needed', 'Only with the yellow electric pump', 'Only with the RAT'],
        'The landing gear uses green only, so normal extension and normal braking are available.')
    },

    // HYD G+B and G+Y follow the FCOM procedures the owner supplied (PRO-ABN-HYD).
    'hyd-gb': {
      title: 'HYD G+B SYS LO PR', sysWord: 'HYD', level: 3, sd: 'HYD', phase: 'Cruise · FL350',
      brief: 'In cruise. The green reservoir empties (a leak) and the blue electric pump fails. Green and blue pressure fall below 1450 PSI; only yellow remains.',
      learn: HYD_LEARN.concat([
        'The alert triggers when green and blue are both at or below 1450 PSI, and resets at 1750 PSI.',
        'With G+B lost: alternate law (protections lost), both ailerons, the left elevator, spoilers 1, 3 and 5 and the slats are lost; flaps are slow, the gear is gravity extended and only yellow (alternate) braking remains.',
        'Green lost by low level may also bring a separate HYD PTU FAULT alert asking for the PTU off.']),
      setup: function (s) { var g = s.hyd.G; g.rsvr = 'lo'; g.qty = 0.05; g.leak = true; g.p = 0; s.hyd.B.fail = true; s.hyd.B.p = 0; s.fctl.law = 'ALTN'; },
      lights: [G_PUMP, B_PUMP],
      steps: [
        MASTER,
        N('LAND ASAP', 'a'),
        A('RAT', 'MAN ON', [RAT], { press: true, hint: 'RAT MAN ON is guarded: lift the guard, then press it.',
          fx: function (s) { s.elec.rat = true; },
          why: 'With the blue electric pump lost, the RAT is the other way to pressurise blue. Keep at least 140 kt with the RAT out.' }),
        A('AFFECTED PUMPS', 'OFF', [G_PUMP, B_PUMP], { clears: true, hint: 'GREEN ENG 1 PUMP and BLUE ELEC PUMP, overhead HYD panel.',
          fx: function (s) { s.hyd.G.pump = 'off'; s.hyd.B.pump = 'off'; },
          why: 'Switching off the pumps of the lost systems protects them.' }),
        N('MANEUVER WITH CARE'), N('FOR GO-AROUND:', 'w'), N(' MAX PITCH 15 DEG'), N(' THR LVR.......TOGA THEN MCT'), N('FUEL CONSUMPT INCRSD'), N('FMS PRED UNRELIABLE'),
        Q('Why is the RAT deployed in this procedure?', 'The blue electric pump has failed, so the RAT is the other source for blue',
          ['To power the green system', 'To supply the emergency generator only', 'It is always deployed with a dual hydraulic failure'],
          'The line only appears if HYD B ELEC PUMP LO PR. With the RAT out, keep the speed above 140 kt (MIN RAT SPD).'),
        Q('With the RAT out, what is the minimum speed shown on the STATUS?', '140 kt', ['100 kt', '180 kt', 'VLS'],
          'STATUS: MIN RAT SPD 140 KT (if the RAT is out), so that the RAT keeps enough output.'),
        Q('At what pressure does HYD G+B SYS LO PR trigger?', 'Green and blue both at or below 1450 PSI', ['Both below 3000 PSI', 'Both below 500 PSI', 'When either reservoir is low'],
          'It triggers when green and blue are at or below 1450 PSI, and resets when the pressure is back at 1750 PSI or more.'),
        Q('How is roll controlled with green and blue lost?', 'By spoilers 2 and 4 (yellow)', ['By the ailerons on yellow', 'By the rudder only', 'By spoiler 3'],
          'Both ailerons are G+B, so they are lost (L+R AIL on INOP SYS). Spoilers 2 and 4 are yellow and give roll control.')
      ],
      sts: { left: [['MIN RAT SPD.........140 KT', 'c'], ['MAX SPEED........320/.77', 'c'], ['MANEUVER WITH CARE', 'c'], ['SPD BRK.......DO NOT USE', 'c'],
        ['FOR GA: MAX PITCH 15 DEG', 'c'], ['FUEL CONSUMPT INCRSD', 'c'], ['APPR PROC DUAL HYD LO PR', 'w'], ['-A/THR...............OFF', 'c'], ['FOR LDG.......FLAP LVR 3', 'c'],
        ['GPWS LDG FLAP 3.......ON', 'c'], ['WHEN SPD 200 KT:', 'w'], ['-L/G GRVTY PROC...APPLY', 'c'], ['APPR SPD.....VREF+30 KT', 'c'], ['LDG DIST PROC.....APPLY', 'c'],
        ['ALTN LAW: PROT LOST', 'a'], ['WHEN L/G DN: DIRECT LAW', 'a'], ['FMS PRED UNRELIABLE', 'c'], ['FLAPS SLOW', 'g']],
        inop: ['G+B HYD', 'F/CTL PROT', 'L ELEV', 'L+R AIL', 'SPLR 1+3+5', 'SLATS', 'AP 1+2', 'AUTO BRK', 'NORM BRK', 'L/G RETRACT', 'REVERSER 1', 'G ENG 1 PUMP', 'B ELEC PUMP', 'YAW DAMPER 1', 'CAT 2', 'GLS AUTOLAND'] },
      statusQ: Q('Why does the STATUS ask for the gear to be extended at 200 kt?', 'To revert sooner to direct law, which gives better pitch control below 200 kt',
        ['Because the gear is slow to extend by gravity', 'To reduce the landing distance', 'Because flaps cannot be extended with the gear up'],
        'With one elevator and all slats lost, direct law (from gear extension) gives better pitch control than alternate law below 200 kt. The gear uses L/G GRVTY PROC, and APPR SPD is VREF + 30 kt.')
    },

    'hyd-gy': {
      title: 'HYD G+Y SYS LO PR', sysWord: 'HYD', level: 3, sd: 'HYD', phase: 'Cruise · FL350',
      brief: 'In cruise. The green and yellow reservoirs both empty: green and yellow pressure fall below 1450 PSI. Only blue remains.',
      learn: HYD_LEARN.concat([
        'The alert triggers when green and yellow are both at or below 1450 PSI, and resets at 1750 PSI.',
        'With G+Y lost: alternate law (protections lost), stabilizer and flaps lost, slats slow, spoilers 1, 2, 4 and 5 and both reversers lost, no anti-skid or nose wheel steering, gear by gravity, braking on the yellow accumulator only (7 full applications).',
        'If the yellow loss is only its engine pump (HYD Y ENG 2 PUMP LO PR), ECAM also asks for the YELLOW ELEC PUMP ON.']),
      setup: function (s) { var g = s.hyd.G, y = s.hyd.Y; g.rsvr = y.rsvr = 'lo'; g.qty = y.qty = 0.05; g.leak = y.leak = true; g.p = y.p = 0; s.fctl.law = 'ALTN'; },
      lights: [G_PUMP, Y_PUMP, PTU],
      steps: [
        MASTER,
        N('LAND ASAP', 'a'),
        A('PTU', 'OFF', [PTU], { clears: true, fx: ptuOff, why: 'Nothing to transfer between two depressurised systems; the PTU would only overheat.' }),
        A('AFFECTED PUMPS', 'OFF', [G_PUMP, Y_PUMP], { clears: true, hint: 'GREEN ENG 1 PUMP and YELLOW ENG 2 PUMP, overhead HYD panel.',
          fx: function (s) { s.hyd.G.pump = 'off'; s.hyd.Y.pump = 'off'; }, why: 'Protects the engine pumps of the lost systems.' }),
        Q('At what pressure does HYD G+Y SYS LO PR trigger?', 'Green and yellow both at or below 1450 PSI', ['Both below 3000 PSI', 'Both below 500 PSI', 'When either reservoir is low'],
          'It triggers when green and yellow are at or below 1450 PSI, and resets when the pressure is back at 1750 PSI or more.'),
        N('MANEUVER WITH CARE'), N('FOR GO-AROUND:', 'w'), N(' MAX PITCH 15 DEG'), N(' THR LVR.......TOGA THEN MCT'), N('FUEL CONSUMPT INCRSD'), N('FMS PRED UNRELIABLE'),
        Q('Which pitch control is lost when green and yellow are both lost?', 'The stabilizer (THS)', ['The left elevator', 'The right elevator', 'Both elevators'],
          'The THS is powered by green and yellow, so it is lost (STABILIZER on INOP SYS). Both elevators remain on blue.'),
        Q('What is the go-around technique with this failure?', 'Max pitch 15 deg, thrust levers TOGA then MCT', ['Normal go-around, TOGA only', 'Max pitch 10 deg, FLX/MCT', 'Go-around is not allowed'],
          'The procedure limits pitch to 15 degrees and asks for TOGA then MCT. The line is not shown with one engine inoperative.'),
        Q('Braking is now on the yellow accumulator only. How many full brake applications does it give?', '7', ['3', '12', 'Unlimited, with the yellow electric pump'],
          'STATUS: BRK Y ACCU PR ONLY (7 full brake applications) and MAX BRK PR 1000 PSI. Normal brakes, anti-skid and nose wheel steering are lost.')
      ],
      sts: { left: [['MAX SPEED........320/.77', 'c'], ['MAX BRK PR........1000 PSI', 'c'], ['MANEUVER WITH CARE', 'c'], ['FOR GA: MAX PITCH 15 DEG', 'c'], ['APPR PROC DUAL HYD LO PR', 'w'],
        ['FOR LDG.......FLAP LVR 3', 'c'], ['GPWS FLAP MODE.......OFF', 'c'], ['WHEN CONF 3 AND VAPP:', 'w'], ['-L/G GRVTY PROC...APPLY', 'c'], ['APPR SPD.....VREF+30 KT', 'c'],
        ['LDG DIST PROC.....APPLY', 'c'], ['ALTN LAW: PROT LOST', 'a'], ['WHEN L/G DN: DIRECT LAW', 'a'], ['BRK Y ACCU PR ONLY', 'c'], ['FUEL CONSUMPT INCRSD', 'c'], ['FMS PRED UNRELIABLE', 'c'], ['SLATS SLOW', 'g']],
        inop: ['G+Y HYD', 'F/CTL PROT', 'STABILIZER', 'REVERSER 1+2', 'SPLR 1+2+4+5', 'FLAPS', 'YAW DAMPER', 'AP 1+2', 'ANTI SKID', 'N/W STRG', 'NORM BRK', 'AUTO BRK', 'L/G RETRACT', 'CARGO DOOR', 'CAT 2', 'GLS AUTOLAND'] },
      statusQ: Q('When does the STATUS ask for the gravity gear extension?', 'When in CONF 3 and stabilised at VAPP', ['At 200 kt', 'Before descent', 'At 1000 ft AGL'],
        'Being stabilised at VAPP before selecting the gear down lets the aircraft be trimmed for the approach (the stabilizer is lost). APPR SPD is VREF + 30 kt on the A319/A320, VREF + 35 kt on the A321.')
    }
  };
  Object.keys(DRILLS).forEach(function (id) { DRILLS[id].id = id; });

  // Menu: categories and entries. lvl: w overview, a caution, r warning.
  // drill: the drill id, or several to choose from. Entries without one are still to come.
  function E(title, lvl, drill) { return { title: title, lvl: lvl, drill: drill || null }; }
  var CATEGORIES = [
    ['MEMORY ITEMS', [E('EMER DESCENT [MEM]', 'r'), E('UNRELIABLE SPEED [MEM]', 'a'), E('STALL RECOVERY [MEM]', 'r'), E('STALL WARNING AT LIFTOFF [MEM]', 'r'),
      E('GPWS [MEM]', 'r'), E('TCAS [MEM]', 'r'), E('REACTIVE WINDSHEAR [MEM]', 'r'), E('LOSS OF BRAKING [MEM]', 'r')]],
    ['AIR', [E('BLEED 1+2 FAULT', 'a'), E('PACK 1+2 FAULT', 'a')]],
    ['AUTO FLT', [E('FMGC SYSTEM OVERVIEW', 'w'), E('FAC FAULTS', 'a'), E('FCU FAULTS', 'a'), E('FMGC SINGLE FAULT', 'a'), E('DUAL FMGC FAILURE', 'a')]],
    ['BRAKES', [E('BRAKES SYS OVERVIEW', 'w'), E('BRAKES SYS 1(2) FAULT', 'a'), E('LOSS OF BRAKING [MEM]', 'r')]],
    ['CAB PRESS', [E('EXCESSIVE CAB ALT', 'r'), E('CPC FAULTS', 'a')]],
    ['ELEC', [E('ELECTRICAL SYSTEM OVERVIEW', 'w'), E('C/B TRIPPED', 'a'), E('DC ESS BUS FAULT', 'a'), E('ELEC EMER CONFIG', 'r')]],
    ['ENG', [E('ABN/NON-STD ENG START', 'a'), E('ENGINE MALFUNCTIONS', 'a'), E('ALL ENG FAIL', 'r'), E('ENG FAIL IN CRUISE', 'a'), E('ENG FAIL AFTER V1', 'a'),
      E('OEI APP AND LANDING', 'a'), E('OEI GO AROUND', 'a'), E('OEI BLEED MANAGEMENT', 'a'), E('TAILPIPE FIRE', 'a'), E('THRUST LOCKED', 'a'), E('TOGA LK', 'a'), E('THR LEVERS MANAGEMENT', 'a')]],
    ['F/CTL', [E('F/CTL LAWS OVERVIEW', 'w'), E('ELAC FAULTS', 'a'), E('ELEVATOR FAULTS', 'a'), E('RUDDER JAM', 'a'), E('SEC FAULTS', 'a'), E('SLATS OR FLAPS JAMMED', 'a'), E('STABILISER JAM', 'a'), E('TAKEOVER PB', 'w')]],
    ['FUEL', [E('FUEL IMBALANCE', 'a'), E('FUEL LEAK', 'a'), E('FUEL OVERREAD', 'a'), E('FUEL TEMPERATURE', 'a'), E('GRAVITY FUEL FEEDING', 'a')]],
    ['HYD', [E('HYD SYSTEM OVERVIEW', 'w', 'hyd-overview'), E('HYD SINGLE FAILURES', 'a', ['hyd-g-rsvr', 'hyd-b-lopr', 'hyd-y-pump']),
      E('HYD B+Y', 'r', 'hyd-by'), E('HYD G+B', 'r', 'hyd-gb'), E('HYD G+Y', 'r', 'hyd-gy')]],
    ['LG', [E('L/G GRAVITY EXTENSION', 'a'), E('LANDING WITH ABNORMAL L/G', 'a'), E('LGCIU FAULTS', 'a'), E('NWS FAULT', 'a'), E('TAXI WITH DEFLATED TIRE', 'a')]],
    ['MISC', [E('EMER DESCENT [MEM]', 'r'), E('EMER EVAC', 'r'), E('EMER LANDING ALL ENG FAILURE', 'r'), E('OVERWEIGHT LANDING', 'a'), E('REJECTED TAKEOFF', 'a'),
      E('STALL RECOVERY [MEM]', 'r'), E('STALL WARNING AT LIFTOFF [MEM]', 'r'), E('SYSTEM RESET', 'a'), E('VOLCANIC ASH ENCOUNTER', 'a')]],
    ['NAV', [E('ADIRS SYSTEM OVERVIEW', 'w'), E('ADR FAULTS', 'a'), E('IR FAULTS', 'a'), E('UNRELIABLE SPEED [MEM]', 'a'), E('RA FAULTS', 'a')]],
    ['SMOKE', [E('SMOKE/FUMES/AVNCS SMOKE', 'r'), E('CARGO SMOKE', 'r')]],
    ['SURV', [E('GPWS [MEM]', 'r'), E('TCAS [MEM]', 'r'), E('PREDICTIVE WINDSHEAR', 'a'), E('REACTIVE WINDSHEAR [MEM]', 'r')]],
    ['WHEEL', [E('WHEEL TIRE DAMAGE SUSPECTED', 'a')]]
  ];

  window.ECAM_FAILURES = { DRILLS: DRILLS, CATEGORIES: CATEGORIES };
})();
