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
 *   act     an ECAM action line, done by setting a panel control
 *           (ctl: [panel, control name, nth], sel: the selection legend lit, e.g. OFF)
 *   note    an ECAM line that needs no action
 *   task    a lesson task (want: { sd: page } or { panel: id } or { ctl, sel })
 *   quiz    a knowledge check (the correct answer first; options are shuffled)
 */
(function () {
  'use strict';

  function A(item, val, ctl, o) { return Object.assign({ k: 'act', item: item, val: val, ctl: ctl, sel: true }, o || {}); }
  function N(text, c) { return { k: 'note', text: text, c: c || 'c' }; }
  function T(text, want, info) { return { k: 'task', text: text, want: want, info: info }; }
  function Q(q, correct, wrong, explain) { return { k: 'quiz', q: q, options: [correct].concat(wrong), explain: explain }; }
  var MASTER = { k: 'master' };

  // HYD overhead panel controls
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
        A('GREEN ENG 1 PUMP', 'OFF', G_PUMP, { clears: true, fx: function (s) { s.hyd.G.pump = 'off'; }, why: 'Stops the pump running dry.' })
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
          'The PTU sits between green and yellow. Blue has its own electric pump and the RAT.')
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

    'hyd-gb': {
      title: 'HYD G+B SYS LO PR', sysWord: 'HYD', level: 3, sd: 'HYD', phase: 'Cruise · FL350',
      brief: 'In cruise. A green leak empties the green reservoir, and the blue electric pump fails. Only yellow remains.',
      learn: HYD_LEARN.concat(['With G+B lost: alternate law, both ailerons and the left elevator lost (roll by spoilers 2 and 4), slats lost, flaps slow, gear by gravity, braking on the yellow (alternate) system.']),
      setup: function (s) { var g = s.hyd.G; g.rsvr = 'lo'; g.qty = 0.05; g.leak = true; g.p = 0; s.hyd.B.fail = true; s.hyd.B.p = 0; s.fctl.law = 'ALTN'; },
      lights: [G_PUMP, B_PUMP, PTU],
      memo: [{ t: 'LAND ASAP', c: 'a' }],
      steps: [
        MASTER,
        A('PTU', 'OFF', PTU, { clears: true, fx: ptuOff, why: 'With the green reservoir empty the PTU would only overheat.' }),
        A('GREEN ENG 1 PUMP', 'OFF', G_PUMP, { clears: true, fx: function (s) { s.hyd.G.pump = 'off'; }, why: 'Protects the engine pump from running dry.' }),
        A('BLUE ELEC PUMP', 'OFF', B_PUMP, { clears: true, fx: function (s) { s.hyd.B.pump = 'off'; }, why: 'Protects the failed pump.' }),
        N('MANEUVER WITH CARE'),
        Q('How is roll controlled with green and blue lost?', 'By spoilers 2 and 4 (yellow)', ['By the ailerons on yellow', 'By the rudder only', 'By spoiler 3'],
          'The ailerons are G+B, so both are lost. Spoilers 2 and 4 are yellow and give roll control.'),
        Q('Which high-lift devices are still available?', 'Flaps only, slowly', ['Slats only, slowly', 'Slats and flaps, slowly', 'Neither'],
          'Slats are G+B, so they are lost. Flaps are G+Y, so they move slowly on yellow.')
      ],
      sts: { left: [['MAX SPEED.........320 KT', 'c'], ['MANEUVER WITH CARE', 'c'], ['APPR PROC', 'w'], ['L/G.......GRVTY EXTN', 'c'], ['FLAPS SLOW', 'g'], ['ALTN BRK ONLY', 'g']],
        inop: ['G+B HYD', 'F/CTL PROT', 'AILERONS', 'L ELEV', 'SLATS', 'SPLR 1+3+5', 'NORM BRK', 'REVERSER 1'] },
      statusQ: Q('How will the gear be extended?', 'Gravity extension (green is lost)', ['Normally, on yellow', 'Normally, on blue', 'With the RAT'],
        'The gear is green only. Use the gravity extension handcrank.')
    },

    'hyd-gy': {
      title: 'HYD G+Y SYS LO PR', sysWord: 'HYD', level: 3, sd: 'HYD', phase: 'Cruise · FL350',
      brief: 'In cruise. Green and yellow pressure are lost together. Only blue remains.',
      learn: HYD_LEARN.concat(['With G+Y lost: alternate law, THS frozen, flaps lost, slats slow, gear by gravity, braking on the yellow accumulator only.']),
      setup: function (s) { var g = s.hyd.G, y = s.hyd.Y; g.rsvr = y.rsvr = 'lo'; g.qty = y.qty = 0.05; g.leak = y.leak = true; g.p = y.p = 0; s.fctl.law = 'ALTN'; },
      lights: [G_PUMP, Y_PUMP, PTU],
      memo: [{ t: 'LAND ASAP', c: 'a' }],
      steps: [
        MASTER,
        A('PTU', 'OFF', PTU, { clears: true, fx: ptuOff, why: 'Nothing to transfer between two depressurised systems; the PTU would only overheat.' }),
        A('GREEN ENG 1 PUMP', 'OFF', G_PUMP, { clears: true, fx: function (s) { s.hyd.G.pump = 'off'; }, why: 'Protects the engine pump.' }),
        A('YELLOW ENG 2 PUMP', 'OFF', Y_PUMP, { clears: true, fx: function (s) { s.hyd.Y.pump = 'off'; }, why: 'Protects the engine pump.' }),
        N('MANEUVER WITH CARE'),
        Q('Which pitch control is lost when green and yellow are both lost?', 'The THS (stabiliser)', ['The left elevator', 'The right elevator', 'Both elevators'],
          'The THS is powered by green and yellow, so it freezes. Both elevators remain on blue.'),
        Q('How many spoilers per wing remain available?', 'One (spoiler 3, blue)', ['None', 'Two', 'All five'],
          'Spoilers 1 and 5 are green and 2 and 4 are yellow, so only spoiler 3 (blue) remains on each wing.')
      ],
      sts: { left: [['MAX SPEED.........320 KT', 'c'], ['MANEUVER WITH CARE', 'c'], ['APPR PROC', 'w'], ['L/G.......GRVTY EXTN', 'c'], ['SLATS SLOW', 'g'], ['BRK Y ACCU ONLY', 'g']],
        inop: ['G+Y HYD', 'F/CTL PROT', 'FLAPS', 'STABILIZER', 'NORM BRK', 'AUTO BRK', 'SPLR 1+2+4+5', 'REVERSERS'] },
      statusQ: Q('Which flight control law applies with green and yellow lost?', 'Alternate law, then direct law with the gear down', ['Normal law', 'Direct law at all times', 'Mechanical backup'],
        'G+Y loss leads to alternate law. As usual in alternate law, it reverts to direct law when the landing gear is extended.')
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
