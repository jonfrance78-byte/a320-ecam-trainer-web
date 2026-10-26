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
 *           press: a momentary control to press, e.g. RAT MAN ON; reset: OFF THEN ON;
 *           move: a lever moved out of its detent; top: shown above the failure's title)
 *   note    an ECAM line that needs no action
 *   task    a lesson task (want: { sd: page } or { panel: id } or { ctl, sel })
 *   quiz    a knowledge check (the correct answer first; options are shuffled)
 */
(function () {
  'use strict';

  // ctls: the panel controls that make up the action (all set for it to count). press: a
  // momentary control that only has to be pressed.
  function A(item, val, ctls, o) { return Object.assign({ k: 'act', item: item, val: val, ctls: Array.isArray(ctls[0]) ? ctls : [ctls], sel: true }, o || {}); }
  function N(text, c, o) { return Object.assign({ k: 'note', text: text, c: c || 'c' }, o || {}); }
  // A following ECAM alert title on the E/WD (system word underlined), e.g. HYD PTU FAULT.
  function TITLE(word, rest, c) { return N(word + ' ' + rest, c || 'a', { word: word }); }
  var AP_OFF = [{ parts: [{ s: 'AUTO FLT', u: true, c: 'r' }, { s: ' AP OFF', c: 'r' }] }];
  function T(text, want, info) { return { k: 'task', text: text, want: want, info: info }; }
  function Q(q, correct, wrong, explain) { return { k: 'quiz', q: q, options: [correct].concat(wrong), explain: explain }; }
  var MASTER = { k: 'master' };
  // A card the trainee reads before going on (sections: [[heading, [lines]]]).
  function CARD(title, sections) { return { k: 'card', title: title, sections: sections }; }
  // Confirm the failure, then ANC: in every abnormal drill, after MASTER WARN or CAUT
  // (owner's rule, 0.7.74). The PF asks the PM to confirm the failure, then flies ANC.
  // pm: what the PM reads out. o.apLost: both autopilots lost; o.land: 'r' or 'a' for a red
  // or amber LAND ASAP; o.care: MANEUVER WITH CARE. The AP-lost, red LAND ASAP lines are the
  // owner's text (HYD G+B, G+Y); the others are our own wording, approved by the owner (0.7.74).
  function ANC(pm, o) {
    o = o || { apLost: true, land: 'r' };
    return CARD('Confirm the failure, then ANC', [
      ['Confirm', ['PF: "Confirm the failure."', 'PM reads the E/WD and says what it shows: "' + pm + '"']],
      ['Aviate', (o.apLost ? ['PF flies the aircraft by hand: both autopilots are lost.', 'Below MSA, keep terrain separation in mind.', 'RVSM airspace cannot be continued.'] :
        ['PF keeps flying the aircraft and controls the flight path.']).concat(o.care && !o.apLost ? ['Maneuver with care: the flight control protections are lost.'] : [])],
      ['Navigate', o.land === 'r' ? ['On a Tango route, start turning towards land.', 'Navigate towards several likely airports.'] :
        o.land === 'a' ? ['Consider the nearest suitable airports.'] : ['Continue on the cleared route.']],
      ['Communicate', o.land === 'r' ? ['Red LAND ASAP is a MAYDAY situation: tell ATC.'] :
        o.land === 'a' ? ['Amber LAND ASAP: consider a PAN call to ATC.'] : ['Tell ATC if the failure affects the flight.']]
    ]);
  }
  // Every abnormal drill (level 2 or 3) gets the card straight after MASTER, built from its
  // own data, unless it has its own card (HYD G+B and G+Y, owner's wording for the PM).
  function addAnc(d) {
    if (d.level < 2 || d.steps.some(function (s) { return s.k === 'card'; })) return;
    var m = d.steps.findIndex(function (s) { return s.k === 'master'; }), land = (d.memo || []).filter(function (x) { return x.t === 'LAND ASAP'; })[0];
    d.steps.splice(m + 1, 0, ANC(d.title, { apLost: JSON.stringify(d.pre || []).indexOf('AP OFF') >= 0, land: land && land.c,
      care: d.steps.some(function (s) { return s.k === 'note' && s.text === 'MANEUVER WITH CARE'; }) }));
  }

  // HYD overhead panel controls
  var RAT = ['HYD', 'RAT MAN ON', 1];
  var G_PUMP = ['HYD', 'ENG 1\nPUMP', 1], B_PUMP = ['HYD', 'ELEC\nPUMP', 1], PTU = ['HYD', 'PTU', 1], Y_PUMP = ['HYD', 'ENG 2\nPUMP', 1], Y_ELEC = ['HYD', 'ELEC\nPUMP', 2];
  function ptuOff(s) { s.hyd.ptu = 'off'; s.hyd.ptuActive = false; }
  // AUTO FLT controls: the FACs (overhead FLT CTL panels), the thrust levers, GPWS TERR
  var FAC1 = ['FLTCTL1', 'FAC 1', 1], FAC2 = ['FLTCTL2', 'FAC 2', 1], THR1 = ['THR', 'Thrust lever 1', 1], THR2 = ['THR', 'Thrust lever 2', 1], GPWS_TERR = ['GPWS', 'TERR', 1];
  var AUDIO_SW = ['AUDIOSW', 'AUDIO SWITCHING', 1], GPWS_SYS = ['GPWS', 'SYS', 1];
  var PRESS_MODE = ['CABPRESS', 'MODE SEL', 1], ASKID = ['AUTOBRK', 'A/SKID & N/W STRG', 1], PARK_BRK = ['PARKBRK', 'PARKING BRK', 1];
  var ELAC1 = ['FLTCTL1', 'ELAC 1', 1], SEC1 = ['FLTCTL1', 'SEC 1', 1], ELAC2 = ['FLTCTL2', 'ELAC 2', 1], SEC2 = ['FLTCTL2', 'SEC 2', 1], SEC3 = ['FLTCTL2', 'SEC 3', 1];
  // A computer's reset lines: -X....OFF THEN ON, .IF UNSUCCESSFUL :, -X....OFF (the reset fails in the drill).
  function RESET_OFF(name, ctl, side, offWhy) {
    var hint = 'Overhead FLT CTL panel (' + side + ' side): ' + name + ' OFF, then ON again.';
    return [A(name, 'OFF THEN ON', ctl, { reset: true, sel: false, hint: hint, why: 'Reset tried: the FAULT light stays on.' }),
      N('.IF UNSUCCESSFUL :', 'w'),
      A(name, 'OFF', ctl, { clears: true, hint: 'Overhead FLT CTL panel (' + side + ' side): ' + name + ' OFF.', why: offWhy })];
  }
  var ALTN_LAW = [{ parts: [{ s: 'F/CTL', u: true, c: 'a' }, { s: ' ALTN LAW', c: 'a' }] }, { text: '     (PROT LOST)', cls: 'a' }];
  function ATHR_OFF(why) {
    return [Object.assign(TITLE('AUTO FLT', 'A/THR OFF'), { top: true }),
      A('THR LEVERS', 'MOVE', [THR1, THR2], { move: true, top: true, hint: 'Pedestal, thrust levers: move them out of the CL detent to the thrust needed.', why: why })];
  }

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

    // HYD G RSVR LO LVL, HYD B ELEC PUMP LO PR and HYD Y ENG 2 PUMP LO PR: E/WD, SD pages and
    // STATUS checked against ReadECAM's slides (displays only; questions and notes are our own). 0.7.85.
    'hyd-g-rsvr': {
      title: 'HYD G RSVR LO LVL', sysWord: 'HYD', level: 2, sd: 'HYD', phase: 'Cruise · FL370',
      brief: 'Cruise at FL370. The green reservoir level drops quickly: a leak. Green pressure follows.',
      learn: HYD_LEARN.concat(['With green lost: normal brakes and autobrake, gear retraction and normal extension, spoilers 1 and 5 and reverser 1 are lost. The gear is gravity extended.']),
      setup: function (s) { var g = s.hyd.G; g.rsvr = 'lo'; g.qty = 0.05; g.leak = true; g.p = 0; },
      lights: [G_PUMP, PTU],
      memo: [{ t: '*WHEEL', c: 'a' }, { t: '*F/CTL', c: 'a' }],
      steps: [
        MASTER,
        A('PTU', 'OFF', PTU, { clears: true, fx: ptuOff,
          why: 'With the green fluid gone, the PTU would run unloaded and overheat, and could take power from yellow.' }),
        Q('Why is the PTU switched off first?', 'It would run against an empty green system and overheat', ['It transfers fluid from yellow into the leak', 'It is needed to power the RAT', 'It only works on the ground'],
          'The PTU transfers power, not fluid. With no green fluid it runs unloaded and overheats.'),
        A('GREEN ENG 1 PUMP', 'OFF', G_PUMP, { clears: true, fx: function (s) { s.hyd.G.pump = 'off'; }, why: 'Stops the pump running dry.' }),
        N('G ENG 1 PUMP LO PR', 'a'),
        N('G SYS LO PR', 'a'),
        Q('Green is now lost. Which wheel braking is still available?', 'Alternate braking (yellow), without autobrake', ['Normal braking with autobrake', 'Normal braking without autobrake', 'No wheel braking'],
          'Normal brakes and autobrake are green, so they are lost (NORM BRK and AUTO BRK on INOP SYS). The alternate brakes are yellow: the STATUS shows ALTN BRK ONLY.')
      ],
      seq: [
        { lines: [], memo: [{ t: '*WHEEL', c: 'a' }, { t: '*F/CTL', c: 'a' }], sd: 'WHEEL',
          text: 'Secondary failure *WHEEL: the SD shows the WHEEL page. Check what is left for stopping.', note: 'ECAM shows the WHEEL page for the secondary failure.',
          q: Q('On the WHEEL page, which ground spoilers are lost with green?', 'Spoilers 1 and 5', ['Spoilers 2 and 4', 'Spoiler 3', 'All of them'],
            'Spoilers 1 and 5 are green. The others still extend on landing, so the ground spoiler function is reduced, not lost.') },
        { lines: [], memo: [{ t: '*F/CTL', c: 'a' }], sd: 'F/CTL',
          text: 'Secondary failure *F/CTL: the SD shows the F/CTL page. Check what is left to fly the aircraft.', note: 'ECAM shows the F/CTL page for the secondary failure.',
          q: Q('Which flight control law applies with green lost?', 'Normal law', ['Alternate law', 'Direct law', 'Mechanical backup'],
            'Each surface still has blue or yellow, so the protections stay. Only a dual hydraulic failure costs normal law.') },
        { lines: [], memo: [], sd: 'STS',
          sts: { left: [['-L/G.........GRVTY EXTN', 'c'], ['LDG DIST PROC......APPLY', 'c'], ['ALTN Y BRK WITH A/SKID', 'g'], ['SLATS/FLAPS SLOW', 'g'], ['CAT 3 SINGLE ONLY', 'g']],
            inop: ['G HYD', 'SPLR 1+5', 'CAT 3 DUAL', 'NORM BRK', 'AUTO BRK', 'L/G RETRACT', 'REVERSER 1', 'G ENG 1 PUMP', 'YAW DAMPER 1'] },
          text: 'STATUS is shown. Review it with the other pilot.', note: 'Secondary failures reviewed. STATUS is shown.',
          q: Q('With green lost, how is the landing gear extended?', 'Gravity extension, using the handcrank', ['Normal extension, powered by yellow', 'Normal extension, powered by blue', 'It cannot be extended'],
            'The gear uses green only, and it cannot be raised again once down, so plan the extension late: fuel burn rises sharply with the gear out.') }
      ]
    },

    'hyd-b-lopr': {
      title: 'HYD B ELEC PUMP LO PR', sysWord: 'HYD', level: 2, sd: 'HYD', phase: 'Cruise · FL350',
      brief: 'Cruise at FL350. The blue electric pump fails and blue pressure is lost. Green and yellow are normal.',
      learn: HYD_LEARN.concat(['Blue powers one aileron and one elevator actuator each side, spoiler 3, the slats (with green) and the emergency generator when the RAT is out.']),
      setup: function (s) { s.hyd.B.fail = true; s.hyd.B.p = 0; },
      lights: [B_PUMP],
      memo: [{ t: '*F/CTL', c: 'a' }],
      steps: [
        MASTER,
        A('BLUE ELEC PUMP', 'OFF', B_PUMP, { clears: true, fx: function (s) { s.hyd.B.pump = 'off'; }, why: 'Switching off a pump that has lost pressure protects it and confirms the failure.' }),
        N('B SYS LO PR', 'a'),
        Q('Can the PTU help the blue system?', 'No: it only links green and yellow', ['Yes, automatically', 'Yes, when selected ON', 'Only on the ground'],
          'The PTU sits between green and yellow. Blue has its own electric pump and the RAT.'),
        Q('With blue lost, how do the slats move?', 'Slowly, on green only', ['Normally', 'Not at all', 'Slowly, on yellow'],
          'Slats are powered by green and blue. With blue lost they still work on green, but slowly: SLATS SLOW on the STATUS.')
      ],
      seq: [
        { lines: [], memo: [{ t: '*F/CTL', c: 'a' }], sd: 'F/CTL',
          text: 'Secondary failure *F/CTL: the SD shows the F/CTL page. Check what is left to fly the aircraft.', note: 'ECAM shows the F/CTL page for the secondary failure.',
          q: Q('Which spoiler is lost with the blue system?', 'Spoiler 3 on each wing', ['Spoilers 1 and 5', 'Spoilers 2 and 4', 'All spoilers'],
            'Spoiler 3 is blue. 1 and 5 are green, 2 and 4 yellow.') },
        { lines: [], memo: [], sd: 'STS',
          sts: { left: [['LDG DIST PROC......APPLY', 'c'], ['SLATS SLOW', 'g'], ['CAT 3 SINGLE ONLY', 'g']], inop: ['B HYD', 'SPLR 3', 'CAT 3 DUAL', 'B ELEC PUMP'] },
          text: 'STATUS is shown. Review it with the other pilot.', note: 'Secondary failure reviewed. STATUS is shown.',
          q: Q('Why does the STATUS ask for the landing distance procedure?', 'Spoiler 3 is lost, so the ground spoilers are less effective', ['The normal brakes are lost', 'Both reversers are lost', 'The flaps cannot extend'],
            'The brakes and reversers are unaffected, but one ground spoiler pair less means a longer landing roll.') }
      ]
    },

    'hyd-y-pump': {
      title: 'HYD Y ENG 2 PUMP LO PR', sysWord: 'HYD', level: 2, sd: 'HYD', phase: 'Cruise · FL360',
      brief: 'Cruise at FL360. The yellow engine-driven pump loses pressure. The PTU takes over and keeps yellow pressurised from green.',
      learn: HYD_LEARN,
      setup: function (s) { s.hyd.Y.fail = true; s.hyd.ptuActive = true; },
      lights: [Y_PUMP],
      memo: [{ t: 'HYD PTU', c: 'g' }],
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

    // HYD B+Y: the ECAM display sequence (E/WD, SD pages, STATUS) laid out from ReadECAM's
    // B+Y slides, which the owner has permission to use as a reference (displays only;
    // questions, notes and explanations are our own). 0.7.84.
    'hyd-by': {
      title: 'HYD B+Y SYS LO PR', sysWord: 'HYD', level: 3, sd: 'HYD', phase: 'Cruise · FL350',
      brief: 'In cruise. The blue reservoir empties (a leak), then the yellow system loses its fluid too. Blue and yellow pressure fall; only green remains, and the autopilot disconnects.',
      learn: HYD_LEARN.concat([
        'Of the three dual hydraulic failures, B+Y is the least demanding: the flight controls stay in normal law, and the slats, flaps and normal brakes (green) remain, though slowly.',
        'Lost with B+Y: both autopilots, the right elevator, spoilers 2, 3 and 4 (so no speed brakes, and a longer landing distance), nose wheel steering, reverser 2, yaw damper 2 and the emergency generator (the RAT drives blue).',
        'The gear is still lowered by gravity if the hydraulics are not recovered, to spare green, the only system left.']),
      pre: AP_OFF,
      memo: [{ t: 'LAND ASAP', c: 'r' }, { t: '*F/CTL', c: 'a' }],
      setup: function (s) { var b = s.hyd.B, y = s.hyd.Y; b.rsvr = y.rsvr = 'lo'; b.qty = y.qty = 0.05; b.leak = y.leak = true; b.p = y.p = 0; },
      lights: [B_PUMP, Y_PUMP, PTU],
      steps: [
        MASTER,
        A('BLUE ELEC PUMP', 'OFF', B_PUMP, { clears: true, fx: function (s) { s.hyd.B.pump = 'off'; }, why: 'Blue has lost its fluid: switching its pump off stops it running dry.' }),
        A('YELLOW ENG 2 PUMP', 'OFF', Y_PUMP, { clears: true, fx: function (s) { s.hyd.Y.pump = 'off'; }, why: 'The same for yellow: its engine pump would otherwise run with no fluid.' }),
        Q('Which flight control law applies with blue and yellow lost?', 'Normal law: the protections remain',
          ['Alternate law, protections lost', 'Direct law', 'Mechanical backup'],
          'B+Y is the one dual hydraulic failure that keeps normal law: green still powers enough of the flight controls for the computers to keep their protections. Fly with care all the same: the right elevator and three spoilers on each wing are gone.'),
        N('MAX SPEED.......320/.77'),
        N('MANEUVER WITH CARE'),
        N('HYD PTU FAULT', 'a', { word: 'HYD' }),
        N('-PTU......................OFF')
      ],
      seq: [
        { lines: [N('HYD PTU FAULT', 'a', { word: 'HYD', boxed: true }), N('-PTU......................OFF')], memo: [{ t: 'LAND ASAP', c: 'r' }, { t: '*F/CTL', c: 'a' }],
          sd: 'HYD', text: 'HYD PTU FAULT is now shown.', note: 'HYD B+Y cleared. The next alert is HYD PTU FAULT.',
          task: T('HYD PTU FAULT: PTU OFF (overhead HYD panel).', { ctl: PTU, sel: true }, 'PTU OFF: the PTU links green and yellow; with yellow empty it could only overheat, and green is now the one system to protect.'),
          q: Q('Why does HYD PTU FAULT follow, and what does PTU OFF protect?', 'Yellow has no fluid, so the PTU cannot work properly; switching it off protects green, the only system left',
            ['The PTU needs blue to run', 'It restores yellow pressure', 'It powers the RAT'],
            'The PTU only transfers power between green and yellow. With yellow empty it can do nothing useful and could overheat, putting green at risk.') },
        { lines: [], memo: [{ t: 'LAND ASAP', c: 'r' }], sd: 'F/CTL',
          text: 'Secondary failure *F/CTL: the SD shows the F/CTL page. Check what is left to fly the aircraft.', note: 'ECAM shows the F/CTL page for the secondary failure.',
          q: Q('From the F/CTL page, what is lost for roll and pitch?', 'Spoilers 2, 3 and 4 and the right elevator; the ailerons, left elevator, stabilizer and rudder remain on green',
            ['Both ailerons and both elevators', 'The stabilizer and the rudder', 'Nothing: all surfaces have green'],
            'Each spoiler pair has one system: 2 and 4 are yellow and 3 is blue, so only 1 and 5 (green) are left. The right elevator is yellow and blue. Everything with a green actuator still works.') },
        { lines: [], memo: [{ t: 'LAND ASAP', c: 'r' }], sd: 'STS',
          sts: { left: [['MAX SPEED........320/.77', 'c'], ['MANEUVER WITH CARE', 'c'], ['SPD BRK.......DO NOT USE', 'c'], ['', 'c'],
            ['.IF HYD NOT RECOVERED:', 'w'], [' -L/G.........GRVTY EXTN', 'c'], ['LDG DIST PROC......APPLY', 'c'], ['', 'c'], ['SLATS/FLAPS SLOW', 'g']],
            inop: [['B+Y HYD', 'r'], 'R ELEV', 'SPLR 2+3+4', 'SPD BRK', 'AP 1+2', 'CAT 2', 'N/W STRG', 'REVERSER 2', 'CARGO DOOR', 'EMER GEN', 'Y ENG 2 PUMP', 'B ELEC PUMP', 'YAW DAMPER 2'] },
          text: 'STATUS is shown. Review it with the other pilot.', note: 'Secondary failure reviewed. STATUS is shown.',
          q: Q('Green still works. Why does STATUS ask for the gear to be lowered by gravity?', 'To spare green, the only hydraulic system left: the gear takes a lot from it',
            ['Because the gear is powered by yellow', 'Because normal extension needs blue', 'To keep normal law'],
            'Gear extension puts a large demand on a hydraulic system. With green the last one left, gravity extension keeps it for the flight controls and brakes. Expect no nose wheel steering after landing, and a longer landing distance without spoilers 2, 3 and 4.') }
      ]
    },

    // HYD G+B and G+Y follow the FCOM procedures the owner supplied (PRO-ABN-HYD).
    'hyd-gb': {
      title: 'HYD G+B SYS LO PR', sysWord: 'HYD', level: 3, sd: 'HYD', phase: 'Cruise · FL350',
      brief: 'In cruise. The green reservoir empties (a leak) and the blue electric pump fails. Green and blue pressure fall below 1450 PSI; only yellow remains.',
      learn: HYD_LEARN.concat([
        'The alert triggers when green and blue are both at or below 1450 PSI, and resets at 1750 PSI.',
        'With G+B lost: alternate law (protections lost), both ailerons, the left elevator, spoilers 1, 3 and 5 and the slats are lost; flaps are slow, the gear is gravity extended and only yellow (alternate) braking remains.',
        'Green lost by low level may also bring a separate HYD PTU FAULT alert asking for the PTU off.']),
      pre: AP_OFF,
      memo: [{ t: 'LAND ASAP', c: 'r' }, { t: '*WHEEL', c: 'a' }, { t: '*F/CTL', c: 'a' }],
      setup: function (s) { var g = s.hyd.G; g.rsvr = 'lo'; g.qty = 0.05; g.leak = true; g.p = 0; s.hyd.B.fail = true; s.hyd.B.p = 0; s.fctl.law = 'ALTN'; },
      lights: [G_PUMP, B_PUMP, PTU],
      steps: [
        MASTER,
        ANC('AP OFF, dual hydraulic failure: green and blue.'),
        A('RAT', 'MAN ON', [RAT], { press: true, hint: 'RAT MAN ON is guarded: lift the guard, then press it.',
          fx: function (s) { s.elec.rat = true; },
          why: 'With the blue electric pump lost, the RAT is the other way to pressurise blue. Keep at least 140 kt with the RAT out.' }),
        A('GREEN ENG 1 PUMP', 'OFF', [G_PUMP], { clears: true, fx: function (s) { s.hyd.G.pump = 'off'; }, why: 'Protects the green engine pump: its system is lost.' }),
        A('BLUE ELEC PUMP', 'OFF', [B_PUMP], { clears: true, fx: function (s) { s.hyd.B.pump = 'off'; }, why: 'Protects the failed blue electric pump.' }),
        N('MANEUVER WITH CARE'),
        TITLE('HYD', 'PTU FAULT'),
        A('PTU', 'OFF', [PTU], { clears: true, fx: ptuOff, why: 'Green was lost by low level, so HYD PTU FAULT follows and asks for the PTU off: with no green fluid it would only overheat.' }),
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

    // ECAM display sequence for G+Y: laid out from the owner's ReadECAM slides of the
    // E/WD, SD and STATUS pages (displays only; questions and notes are our own).
    'hyd-gy': {
      title: 'HYD G+Y SYS LO PR', sysWord: 'HYD', level: 3, sd: 'HYD', phase: 'Climb · FL350',
      brief: 'Climbing. The green and yellow reservoirs both empty: green and yellow pressure fall below 1450 PSI. Only blue remains, and the autopilot disconnects.',
      learn: HYD_LEARN.concat([
        'The alert triggers when green and yellow are both at or below 1450 PSI, and resets at 1750 PSI.',
        'With G+Y lost: alternate law (protections lost), stabilizer and flaps lost, slats slow, spoilers 1, 2, 4 and 5 and both reversers lost, no anti-skid or nose wheel steering, gear by gravity, braking on the yellow accumulator only.',
        'After the procedure, ECAM shows the F/CTL ALTN LAW alert, then the secondary failures (*WHEEL, *F/CTL) one page at a time, then STATUS. Each is reviewed and cleared with CLR.']),
      pre: AP_OFF,
      memo: [{ t: 'LAND ASAP', c: 'r' }, { t: 'F/CTL', c: 'a' }, { t: '*WHEEL', c: 'a' }, { t: '*F/CTL', c: 'a' }],
      memoDone: [{ t: 'LAND ASAP', c: 'r' }, { t: '*WHEEL', c: 'a' }, { t: '*F/CTL', c: 'a' }],
      setup: function (s) { var g = s.hyd.G, y = s.hyd.Y; g.rsvr = y.rsvr = 'lo'; g.qty = y.qty = 0.05; g.leak = y.leak = true; g.p = y.p = 0; s.fctl.law = 'ALTN'; },
      lights: [G_PUMP, Y_PUMP, PTU],
      steps: [
        MASTER,
        ANC('AP OFF, dual hydraulic failure: green and yellow.'),
        Q('The autopilot has disconnected with the warning. What comes first?', 'Fly the aircraft: aviate, then navigate, then communicate',
          ['Start the ECAM actions straight away', 'Re-engage the autopilot', 'Call ATC and declare an emergency'],
          'Both autopilots are lost with G+Y (AP 1+2 on INOP SYS). The PF flies manually and keeps control of the flight path; the ECAM actions come once the aircraft is under control.'),
        A('PTU', 'OFF', [PTU], { clears: true, fx: ptuOff, why: 'Nothing to transfer between two depressurised systems; the PTU would only overheat.' }),
        A('GREEN ENG 1 PUMP', 'OFF', [G_PUMP], { clears: true, fx: function (s) { s.hyd.G.pump = 'off'; }, why: 'Protects the green engine pump: its system is lost.' }),
        A('YELLOW ENG 2 PUMP', 'OFF', [Y_PUMP], { clears: true, fx: function (s) { s.hyd.Y.pump = 'off'; }, why: 'Protects the yellow engine pump: its system is lost.' }),
        Q('At what pressure does HYD G+Y SYS LO PR trigger?', 'Green and yellow both at or below 1450 PSI', ['Both below 3000 PSI', 'Both below 500 PSI', 'When either reservoir is low'],
          'It triggers when green and yellow are at or below 1450 PSI, and resets when the pressure is back at 1750 PSI or more.'),
        N('MANEUVER WITH CARE'),
        N('HYD PTU FAULT', 'a', { word: 'HYD', gone: true }),
        N('F/CTL ALTN LAW', 'a', { word: 'F/CTL', after: true }),
        N('     (PROT LOST)', 'a', { after: true }),
        N('MAX SPEED.......320/.77', 'c', { after: true })
      ],
      seq: [
        { lines: [N('F/CTL ALTN LAW', 'a', { word: 'F/CTL', boxed: true }), N('     (PROT LOST)', 'a'), N('MAX SPEED.......320/.77')], memo: [{ t: 'LAND ASAP', c: 'r' }, { t: '*WHEEL', c: 'a' }, { t: '*F/CTL', c: 'a' }],
          sd: 'HYD', text: 'F/CTL ALTN LAW is now shown: note the protections lost and the maximum speed.', note: 'HYD G+Y cleared. The next alert is F/CTL ALTN LAW.',
          q: Q('Why is the maximum speed limited to 320 kt / M .77?', 'In alternate law the high-speed protection is lost', ['To save fuel', 'Because the flaps are lost', 'To keep the RAT out'],
            'With the protections lost (PROT LOST), the aircraft is no longer protected against overspeed, so the speed is limited to 320 kt / M .77.') },
        { lines: [], memo: [{ t: 'LAND ASAP', c: 'r' }, { t: '*WHEEL', c: 'a' }, { t: '*F/CTL', c: 'a' }], sd: 'WHEEL',
          text: 'Secondary failure *WHEEL: the SD shows the WHEEL page. Check what is left for stopping.', note: 'ECAM shows the WHEEL page for the secondary failure.',
          q: Q('From the WHEEL page, what is left for stopping after landing?', 'Alternate braking on the yellow accumulator only, no anti-skid, no autobrake, ground spoiler 3 only',
            ['Normal braking with anti-skid', 'Autobrake LO and both reversers', 'No braking at all'],
            'NORM BRK, ANTI SKID and AUTO BRK are amber; ALTN BRK shows ACCU ONLY. Only spoiler 3 (blue) extends and both reversers are lost. Nose wheel steering is lost too, so the aircraft cannot be taxied off the runway.') },
        { lines: [], memo: [{ t: 'LAND ASAP', c: 'r' }, { t: '*F/CTL', c: 'a' }], sd: 'F/CTL',
          text: 'Secondary failure *F/CTL: the SD shows the F/CTL page. Check what is left to fly the aircraft.', note: 'ECAM shows the F/CTL page for the secondary failure.',
          q: Q('From the F/CTL page, is the aircraft still trimmable in pitch?', 'No: the THS (G+Y) is frozen; pitch is by the elevators on blue',
            ['Yes, with the trim wheel on blue', 'Yes, the THS moves slowly on blue', 'Only with the autopilot'],
            'PITCH TRIM shows G and Y amber and the trim value amber: the stabilizer is lost at its last position. Both elevators work on blue, the ailerons on blue, spoiler 3 for roll, and the rudder on blue.') },
        { lines: [], memo: [{ t: 'LAND ASAP', c: 'r' }], sd: 'STS',
          sts: { left: [['MAX SPEED........320/.77', 'c'], ['MAX BRK PR.......1000PSI', 'c'], ['MANEUVER WITH CARE', 'c'], ['', 'c'], [' -FOR LDG.....USE FLAP 3', 'c'], [' -GPWS FLAP MODE.....OFF', 'c'],
            [' .WHEN CONF 3 AND VAPP:', 'w'], [' -L/G.........GRVTY EXTN', 'c'], ['APPR SPD : VREF + 25 KT', 'c'], ['LDG DIST PROC......APPLY', 'c'], ['', 'c'],
            ['ALTN LAW : PROT LOST', 'g'], ['WHEN L/G DN : DIRECT LAW', 'g'], ['BRK Y ACCU PR ONLY', 'g'], ['SLATS SLOW', 'g']],
            inop: [['G+Y HYD', 'r'], 'F/CTL PROT', 'STABILIZER', 'REVERSER 1+2', 'SPLR 1+2+4+5', 'FLAPS', 'YAW DAMPER', 'AP 1+2', 'CAT 2', 'ANTI SKID', 'N/W STRG', 'NORM BRK', 'AUTO BRK', 'L/G RETRACT', 'CARGO DOOR', 'G ENG 1 PUMP', 'Y ENG 2 PUMP'] },
          text: 'STATUS is shown. Review it with the other pilot.', note: 'Secondary failures reviewed. STATUS is shown.',
          task: T('STATUS: GPWS FLAP MODE OFF (overhead GPWS panel, left side).', { ctl: ['GPWS', 'FLAP\nMODE', 1], sel: true },
            'GPWS FLAP MODE OFF: the landing is made in CONF 3 with the flaps lost, so the "too low flaps" warning is inhibited.'),
          q: Q('When does the STATUS ask for the gravity gear extension?', 'When in CONF 3 and stabilised at VAPP', ['At 200 kt', 'Before descent', 'At 1000 ft AGL'],
            'Being stabilised at VAPP before the gear goes down lets the aircraft be trimmed for the approach, because the stabilizer is lost. APPR SPD is VREF + 25 kt.') }
      ]
    },

    // AUTO FLT: the E/WD lines and STATUS follow ReadECAM's slides (displays only; questions
    // and notes are our own). Where a STATUS picture could not be read, the drill says so. 0.7.86.
    'afl-fac1': {
      title: 'AUTO FLT FAC 1 FAULT', sysWord: 'AUTO FLT', level: 2, sd: null, phase: 'Cruise · FL350',
      brief: 'In cruise, FAC 1 fails. FAC 2 takes over everything it did, so both PFDs now show speeds from the same computer.',
      learn: ['Each FAC (Flight Augmentation Computer) does yaw damping and turn coordination, rudder trim, the rudder travel limit, and computes the speeds on the PFD: VLS, VFE, VMAX, green dot, S and F, and the alpha protection speeds.',
        'Normally FAC 1 feeds PFD 1 and FAC 2 feeds PFD 2. With one FAC lost, the other does it all.',
        'A FAC is reset by switching it OFF, then ON. If the FAULT light stays, it is left OFF.'],
      lights: [FAC1],
      memo: [],
      steps: [
        MASTER,
        A('FAC 1', 'OFF THEN ON', FAC1, { reset: true, sel: false, hint: 'Overhead FLT CTL panel (Captain side): FAC 1 OFF, then ON again.',
          why: 'A reset: a passing fault can clear. Here the FAULT light stays on.' }),
        Q('Why is FAC 1 switched OFF and then ON first?', 'To reset it, in case the fault was only passing', ['To test the FAULT light', 'To hand the yaw damper to the ELACs', 'To make FAC 2 take over'],
          'Many computer faults clear with a reset. FAC 2 takes over on its own anyway; the reset is a chance to get FAC 1 back.'),
        N('.IF UNSUCCESSFUL :', 'w'),
        A('FAC 1', 'OFF', FAC1, { clears: true, why: 'The reset did not work, so FAC 1 is left off. FAC 2 does all its work.' })
      ],
      // The STATUS INOP SYS column could not be read on ReadECAM's picture: own knowledge.
      sts: { left: [['BOTH PFD ON SAME FAC', 'g'], ['CAT 3 SINGLE ONLY', 'g']], inop: ['FAC 1', 'CAT 3 DUAL'] },
      statusQ: Q('What does BOTH PFD ON SAME FAC tell the crew?', 'Both PFDs show speeds computed by FAC 2 alone', ['Both PFDs have lost their speed scales', 'The F/O must fly the approach', 'FAC 1 still feeds the Captain\'s PFD'],
        'With one FAC the two PFDs no longer cross-check each other\'s speeds: an error in FAC 2 would show on both sides.')
    },

    'afl-fac12': {
      title: 'AUTO FLT FAC 1+2 FAULT', sysWord: 'AUTO FLT', level: 3, tc: 'a', sd: 'F/CTL', phase: 'Cruise · FL350',
      brief: 'In cruise, both FACs fail. The autopilot and autothrust drop out, the flight controls go to alternate law, and the PFD speed scales lose their limit speeds.',
      learn: ['With both FACs lost: no autopilot or autothrust, alternate law without protections, no yaw damper beyond the ELACs\' basic function, and no characteristic speeds (VLS, VFE, VMAX, alpha speeds) on the PFDs.',
        'The rudder travel limit is frozen where it was: rudder inputs above 160 kt must be made with care.',
        'The approach is flown at VREF + 10 kt, and the landing is made in direct law once the gear is down.'],
      pre: AP_OFF.concat(ALTN_LAW, [{ text: 'MAX SPEED........320 KT', cls: 'c' }]),
      setup: function (s) { s.fctl.law = 'ALTN'; },
      lights: [FAC1, FAC2],
      memo: [],
      steps: [
        MASTER
      ].concat(ATHR_OFF('With autothrust lost, thrust stays locked where it was until the levers are moved: the pilot now sets thrust by hand.'), [
        Q('Why must the thrust levers be moved after A/THR OFF?', 'Thrust is locked at its last value until the levers are moved', ['To reset the FACs', 'To re-engage the autothrust', 'To select the alternate law'],
          'The FMA shows THR LK. Moving the levers gives the pilot manual thrust from that point.'),
        N('RUD WITH CARE ABV 160 KT'),
        A('FAC 1', 'OFF THEN ON', FAC1, { reset: true, sel: false, hint: 'Overhead FLT CTL panel (Captain side): FAC 1 OFF, then ON again.', why: 'Reset tried: FAULT stays on.' }),
        A('FAC 2', 'OFF THEN ON', FAC2, { reset: true, sel: false, hint: 'Overhead FLT CTL panel (F/O side): FAC 2 OFF, then ON again.', why: 'Reset tried: FAULT stays on.' }),
        N('.IF UNSUCCESSFUL :', 'w'),
        A('FAC 1', 'OFF', FAC1, { clears: true, why: 'Both resets failed: the FACs are left off.' }),
        A('FAC 2', 'OFF', FAC2, { clears: true, why: 'Both FACs are now off.' }),
        Q('Why "RUD WITH CARE ABV 160 KT"?', 'The rudder travel limit is frozen and no longer reduces with speed', ['The rudder has no hydraulic power', 'The yaw damper moves the rudder fully', 'The rudder trim runs away'],
          'The FACs set how far the rudder may move for the speed. Lost, the limit stays where it was, so a large input at high speed could overstress the fin.')
      ]),
      sts: { left: [['MAX SPEED........320/.77', 'c'], ['RUD WITH CARE ABV 160 KT', 'c'], ['APPR SPD: VREF + 10 KT', 'c'], ['LDG DIST PROC......APPLY', 'c'], ['ALTN LAW : PROT LOST', 'a'], ['WHEN L/G DN : DIRECT LAW', 'a']],
        inop: ['REAC W/S DET', 'F/CTL PROT', 'FAC 1+2', 'AP 1+2', 'A/THR', 'CAT 2'] },
      statusQ: Q('What changes once the gear is down?', 'The flight controls revert to direct law', ['Alternate law protections come back', 'The autothrust can be re-engaged', 'The FACs can be reset again'],
        'Direct law with the gear down means no auto trim: the PFD shows USE MAN PITCH TRIM and the pilot trims by hand.')
    },

    'afl-fcu1': {
      title: 'AUTO FLT FCU 1 FAULT', sysWord: 'AUTO FLT', level: 2, sd: null, phase: 'Cruise · FL350',
      brief: 'In cruise, one of the two FCU channels fails. The FCU keeps working on the other channel.',
      learn: ['The FCU has two independent channels. With one lost, the other runs the whole FCU; the autopilot and flight directors stay.',
        'The barometric reference settings on the EFIS panels go through the FCU, so the crew checks them against the PFDs.'],
      memo: [],
      steps: [
        MASTER,
        N('-BARO REF.............CHECK'),
        Q('Why check the BARO REF after an FCU channel fault?', 'The baro settings pass through the FCU, so they may no longer agree with the PFDs', ['The standby altimeter has failed', 'The altitude alert is lost', 'The autopilot uses QNH only'],
          'Compare the setting on each EFIS panel with both PFDs and the standby altimeter.')
      ]
    },

    'afl-fcu12': {
      title: 'AUTO FLT FCU 1+2 FAULT', sysWord: 'AUTO FLT', level: 3, tc: 'a', sd: null, phase: 'Cruise · FL350',
      brief: 'In cruise, both FCU channels fail. The autopilot and autothrust drop out and the FCU can no longer be used.',
      learn: ['With the FCU lost: no autopilot, autothrust or flight directors, and no FCU target selection. The aircraft is flown by hand.',
        'The PFD altimeters revert to STD (1013 hPa). Only the standby altimeter can be set to QNH, so it is used near the ground, and the PM makes the minimum callouts from it.'],
      pre: AP_OFF,
      memo: [],
      steps: [
        MASTER,
        Object.assign(TITLE('AUTO FLT', 'A/THR OFF'), { top: true }),
        N('-PFD BARO REF: STD ONLY'),
        Q('With both FCU channels lost, how is QNH flown on the approach?', 'On the standby altimeter, set to QNH', ['On the PFDs, set to QNH on the EFIS panel', 'On the radio altimeter only', 'Through the MCDU PERF page'],
          'The PFDs stay on STD. The PM makes the "hundred above" and "minimum" callouts from the standby altimeter, so no MDA is entered in the MCDU.')
      ]
    },

    'afl-dual-fmgc': {
      title: 'NAV GPWS TERR DET FAULT', name: 'DUAL FMGC FAILURE', sysWord: 'NAV', level: 3, tc: 'a', sd: null, phase: 'Cruise · FL350',
      brief: 'Dual FMGC failure in cruise. The autopilot and autothrust drop out, and the terrain functions that use the FMGC position are lost. There is no "FMGC" ECAM title: the E/WD shows what follows from it.',
      learn: ['The two FMGCs give the autopilot, flight directors, autothrust and the flight plan. With both lost, the aircraft is flown by hand with raw data.',
        'The terrain awareness (TERR) mode uses the FMGC position, so it is switched off.',
        'After the ECAM, both FMGCs may be recovered from the MCDU MENU (QRH), on each MCDU.'],
      pre: AP_OFF,
      memo: [],
      steps: [
        MASTER,
        A('GPWS TERR', 'OFF', GPWS_TERR, { hint: 'Overhead GPWS panel: TERR off.', why: 'Without a valid FMGC position, the terrain display and alerts could be wrong.' }),
        Q('Why is GPWS TERR switched off?', 'The terrain mode needs the FMGC position, which is lost', ['To stop nuisance stall warnings', 'Because the radio altimeters have failed', 'To silence the AP OFF warning'],
          'The basic GPWS modes using the radio altimeter still work; only the predictive terrain function is lost.'),
        TITLE('AUTO FLT', 'A/THR OFF'),
        A('THR LEVERS', 'MOVE', [THR1, THR2], { move: true, hint: 'Pedestal, thrust levers: move them out of the CL detent to the thrust needed.', why: 'Thrust is now set by hand.' }),
        Q('After the ECAM, how can the FMGCs be recovered?', 'From the MCDU MENU on each MCDU (QRH)', ['By pulling the FAC circuit breakers', 'With the FCU AP pushbuttons', 'They cannot be recovered in flight'],
          'The QRH reset is done from the MCDU MENU page, on both MCDUs for a dual failure.')
      ]
    },

    // BRAKES and CAB PRESS: E/WD lines from ReadECAM's slides (displays only; questions and
    // notes are our own). No STATUS picture for either, so the drills end after CLR. 0.7.87.
    'brk-sys1': {
      title: 'BRAKES SYS 1 FAULT', sysWord: 'BRAKES', level: 2, sd: 'WHEEL', phase: 'Taxi',
      brief: 'Taxiing out, BSCU channel 1 fails. Channel 2 takes over the braking and steering; the crew stops and tries a reset of the BSCU (QRH).',
      learn: ['The BSCU (Brake and Steering Control Unit) has two channels. With one lost, the other controls normal braking, anti-skid and nose wheel steering.',
        'On the ground the QRH allows a BSCU reset: stop, set the parking brake, then A/SKID & N/W STRG OFF and back ON.',
        'While A/SKID & N/W STRG is OFF there is no nose wheel steering or anti-skid, and the brake pressure is limited (the ECAM asks for max 1000 PSI).'],
      setup: function (s) { s.onGround = true; s.alt = 0; s.phaseLabel = ''; },
      memo: [],
      steps: [
        MASTER,
        Q('With BSCU channel 1 lost, what still controls the brakes?', 'BSCU channel 2', ['The alternate brakes with the accumulator only', 'Nothing until the reset', 'The parking brake'],
          'The second channel takes over normal braking and steering. The reset tries to get channel 1 back.'),
        T('QRH reset: stop the aircraft and set the PARKING BRK ON (pedestal).', { ctl: PARK_BRK, pos: 'ON' },
          'Parking brake set, so the aircraft stays still while the steering and anti-skid are off.'),
        T('A/SKID & N/W STRG OFF (main panel, next to the autobrake).', { ctl: ASKID, pos: 'OFF' },
          'With it OFF there is no steering or anti-skid: the reset is only done stopped.'),
        T('A/SKID & N/W STRG back ON: the BSCU is reset.', { ctl: ASKID, pos: 'ON' }, 'The BSCU restarts. If the fault comes back, it stays with channel 2.'),
        Q('Why is the BSCU reset done only with the aircraft stopped and the parking brake on?', 'Steering and anti-skid are lost while the switch is OFF', ['The engines must be shut down for it', 'The parking brake powers the BSCU', 'It needs the autobrake set to MAX'],
          'Without nose wheel steering the aircraft could not be steered, and the brakes would work without anti-skid.')
      ]
    },

    'press-sys12': {
      title: 'CAB PR SYS 1+2 FAULT', sysWord: 'CAB PR', level: 2, sd: 'PRESS', phase: 'Cruise · FL350',
      brief: 'In cruise, both cabin pressure controllers fail. The crew takes manual control of the outflow valve.',
      learn: ['Two cabin pressure controllers (CPC) work the outflow valve; one is active, the other on standby. With both lost, MODE SEL MAN gives direct control of the valve through its manual motor.',
        'MAN V/S CTL is spring-loaded: UP opens the valve (cabin climbs), DN closes it (cabin descends). The valve moves slowly in MAN.',
        'Aim to keep the cabin altitude below 8000 ft in cruise, the cabin V/S gentle (around 1000 ft/min or less), and the differential pressure at zero for landing.'],
      setup: function (s) { s.press.sys = ['fault', 'fault']; },
      lights: [PRESS_MODE],
      memo: [],
      steps: [
        MASTER,
        A('MODE SEL', 'MAN', PRESS_MODE, { fx: function (s) { s.press.mode = 'man'; }, hint: 'Overhead CABIN PRESS panel: MODE SEL to MAN (MAN lit).',
          why: 'MAN lit: the outflow valve now answers MAN V/S CTL. The PRESS page shows MAN.' }),
        Q('What does MODE SEL MAN do?', 'Gives the crew direct control of the outflow valve with MAN V/S CTL', ['Resets both controllers', 'Opens the outflow valve fully', 'Closes the packs'],
          'In MAN the third motor of the outflow valve is driven by the MAN V/S CTL switch.'),
        N('-MAN V/S CTL........AS RQRD'),
        Q('Holding MAN V/S CTL to DN does what to the cabin?', 'Closes the outflow valve, so the cabin descends', ['Opens the outflow valve, so the cabin descends', 'Closes the valve, so the cabin climbs', 'Lowers the landing elevation'],
          'Less air out means more pressure: the cabin altitude goes down. UP opens the valve and the cabin climbs. The valve is slow in MAN, so small inputs and patience.')
      ]
    },

    // ELEC: E/WD, secondary pages and STATUS from ReadECAM's slides (displays only; questions
    // and notes are our own). 0.7.88.
    'elec-dc-ess': {
      title: 'ELEC DC ESS BUS FAULT', sysWord: 'ELEC', level: 3, tc: 'a', sd: 'ELEC', phase: 'Cruise · FL350',
      brief: 'In cruise, the DC ESS bus is lost. Many Captain-side and essential items go with it: VHF 1, both audio control panels, AP 1, FAC 1, the blue electric pump, one pressure controller and the hydraulic pressure indications.',
      learn: ['The DC ESS bus is normally fed from DC BAT bus. Losing it takes out items on the Captain side and some essential ones, while the aircraft keeps both engines\' generators.',
        'With ACP 1 and 2 lost, communication goes through ACP 3 (overhead AUDIO SWITCHING to CAPT 3 or F/O 3) and VHF 2 or 3. Many crews think they have lost all radios here when only the selections are wrong.',
        'The blue electric pump is lost (spoiler 3, slow slats); the other hydraulic systems work but their pressures show XX.'],
      pre: AP_OFF,
      setup: function (s) { s.elec.dcEss = false; s.hyd.xx = true; s.hyd.B.fail = true; s.hyd.B.p = 0; s.press.sys = ['fault', 'ok']; s.press.active = 1; },
      lights: [GPWS_SYS],
      memo: [{ t: '*CAB PRESS', c: 'a' }, { t: '*HYD', c: 'a' }, { t: '*F/CTL', c: 'a' }],
      steps: [
        MASTER,
        N('-VHF 2 OR 3...........USE'),
        Q('Why VHF 2 or 3?', 'VHF 1 is lost with the DC ESS bus', ['VHF 2 has the better range', 'VHF 3 is for data only', 'To keep VHF 1 free for the cabin'],
          'VHF 1 is powered through the essential buses. VHF 2 or 3 are used, through ACP 3 since ACP 1 and 2 are lost too.'),
        A('AUDIO SWTG', 'SELECT', AUDIO_SW, { pos: ['CAPT 3', 'F/O 3'], hint: 'Overhead AUDIO SWITCHING selector: CAPT 3 (or F/O 3).',
          why: 'That pilot\'s headset, microphone and PTT now go through ACP 3.' }),
        N('-BARO REF.............CHECK'),
        A('GPWS SYS', 'OFF', GPWS_SYS, { clears: true, hint: 'Overhead GPWS panel: SYS off.', why: 'The GPWS has lost its supply; switching it off stops false alerts.' })
      ].concat(ATHR_OFF('Autothrust is lost: thrust is now set by hand.').map(function (st) { return Object.assign({}, st, { top: false }); }), [
        Q('After AUDIO SWTG to CAPT 3, how does the Captain transmit?', 'Through ACP 3, with VHF 2 or 3 selected on it, or the sidestick PTT', ['Through ACP 1 as before', 'Only through the F/O\'s ACP 2', 'Only on the cabin interphone'],
          'ACP 3 normally only monitors. Select the VHF 2 or 3 transmission key and its receiver on it.')
      ]),
      seq: [
        { lines: [N('NAV GPWS FAULT', 'a', { word: 'NAV', boxed: true }), N('-GPWS SYS..............OFF'), N('FUEL L TK PUMP 1 LO PR', 'a', { word: 'FUEL' }), N('     R TK PUMP 1 LO PR', 'a')],
          memo: [{ t: '*CAB PRESS', c: 'a' }, { t: '*HYD', c: 'a' }, { t: '*F/CTL', c: 'a' }], sd: 'FUEL',
          text: 'Following alerts: GPWS FAULT (its action is already done) and the No 1 wing tank pumps.', note: 'DC ESS BUS FAULT cleared. The alerts that follow from it are shown.',
          q: Q('Why does -GPWS SYS OFF show again under NAV GPWS FAULT?', 'The ECAM cannot sense that it was done, so it shows it again', ['It must be pressed a second time', 'The first selection did not work', 'It is a different GPWS switch'],
            'Some actions are not monitored by the ECAM. Already done: check and clear.') },
        { lines: [], memo: [{ t: '*CAB PRESS', c: 'a' }, { t: '*HYD', c: 'a' }, { t: '*F/CTL', c: 'a' }], sd: 'PRESS',
          text: 'Secondary failure *CAB PRESS: the PRESS page shows SYS 1 lost. SYS 2 controls the cabin.', note: 'ECAM shows the CAB PRESS page for the secondary failure.' },
        { lines: [], memo: [{ t: '*HYD', c: 'a' }, { t: '*F/CTL', c: 'a' }], sd: 'HYD',
          text: 'Secondary failure *HYD: the blue electric pump is lost; the other pressures show XX.', note: 'ECAM shows the HYD page for the secondary failure.',
          q: Q('Green and yellow show XX. Are they lost?', 'No: their titles stay white, so they are above 1450 PSI', ['Yes: XX means no pressure', 'Only yellow is lost', 'It cannot be known'],
            'Only the pressure readout is lost. A white title and green lines still mean the system is pressurised.') },
        { lines: [], memo: [{ t: '*F/CTL', c: 'a' }], sd: 'F/CTL',
          text: 'Secondary failure *F/CTL: spoiler 3 is lost with blue; the hydraulic letters are missing.', note: 'ECAM shows the F/CTL page for the secondary failure.' },
        { lines: [], memo: [], sd: 'STS',
          sts: { left: [['AVOID ICING CONDITIONS', 'c'], ['.IF SEVERE ICE ACCRETION:', 'w'], [' MIN SPD.....VLS+10/G DOT', 'c'], [' MANEUVER WITH CARE', 'c'], ['LDG DIST PROC......APPLY', 'c'],
            ['ENG 1 APPR IDLE ONLY', 'g'], ['ENG 2 APPR IDLE ONLY', 'g'], ['BOTH PFD ON SAME FAC', 'g'], ['PACK 2 AT FIXED TEMP', 'g'], ['SLATS/FLAPS SLOW', 'g'], ['CAT 3 SINGLE ONLY', 'g']],
            inop: ['B HYD', 'SPLR 3', 'VHF 1', 'ACP 1+2', 'WING A.ICE', 'AP 1', 'A/THR', 'FCU 1', 'CAT 3 DUAL', 'FAC 1', 'L TK PUMP 1', 'R TK PUMP 1', 'AUTO BRK', 'ALTN BRK', 'REVERSER 2', 'ENG 2 START', 'CAB PR 1'] },
          text: 'STATUS is shown. Review it with the other pilot.', note: 'Secondary failures reviewed. STATUS is shown.',
          q: Q('Why AVOID ICING CONDITIONS?', 'The wing anti-ice is lost', ['The engine anti-ice is lost', 'The probes are no longer heated', 'The windshield heat is lost'],
            'WING A.ICE is on the INOP list. If ice builds up anyway, fly at least VLS + 10 kt or green dot and manoeuvre with care.') }
      ]
    },

    // F/CTL: E/WD lines and STATUS from ReadECAM's slides (displays only; questions and notes
    // are our own). The single SEC STATUS pictures could not be read, so those drills end after CLR. 0.7.89.
    'fctl-elac1': {
      title: 'F/CTL ELAC 1 FAULT', sysWord: 'F/CTL', level: 2, sd: 'F/CTL', phase: 'Cruise · FL350',
      brief: 'In cruise, ELAC 1 fails. ELAC 2 takes over pitch and roll; the aircraft stays in normal law.',
      learn: ['The two ELACs (Elevator Aileron Computers) give normal law for pitch and roll. ELAC 1 is normally active for the elevators, ailerons and the stabilizer; ELAC 2 takes over when it fails.',
        'A reset is OFF then ON. Do not reset an ELAC if the aircraft made uncommanded manoeuvres.'],
      setup: function (s) { s.fctl.elac[0] = 'fault'; },
      lights: [ELAC1],
      memo: [],
      steps: [MASTER].concat(RESET_OFF('ELAC 1', ELAC1, 'Captain', 'The reset did not work: ELAC 1 is left off and ELAC 2 does everything.'), [
        Q('When must an ELAC not be reset?', 'After uncommanded manoeuvres', ['Above FL 250', 'With the autopilot engaged', 'Within 10 minutes of take-off'],
          'If the ELAC moved the controls on its own, a reset could bring the fault back. Leave it off.'),
        Q('With ELAC 1 off, which law applies?', 'Normal law, with ELAC 2', ['Alternate law', 'Direct law', 'Mechanical backup'],
          'One ELAC is enough for normal law. Only with both lost does the aircraft go to alternate law.')
      ]),
      sts: { left: [], inop: ['ELAC 1'] },
      statusQ: Q('What does the STATUS show after ELAC 1 FAULT?', 'Only ELAC 1 under INOP SYS', ['ALTN LAW : PROT LOST', 'MAX SPEED 320 KT', 'LDG DIST PROC APPLY'],
        'Nothing else is lost: ELAC 2 does the job, and all the protections remain.')
    },

    'fctl-elac12': {
      title: 'F/CTL ELAC 1 FAULT', name: 'F/CTL ELAC 1+2 FAULT', sysWord: 'F/CTL', level: 3, tc: 'a', sd: 'F/CTL', phase: 'Cruise · FL350',
      brief: 'In cruise, both ELACs fail. The autopilot drops out, pitch goes to alternate law through the SECs, and roll is on the spoilers only: both ailerons are lost.',
      learn: ['With both ELACs lost, the SECs control the elevators and stabilizer (alternate law) and roll is done by the spoilers alone; the ailerons go to their neutral position.',
        'Protections are lost; the maximum speed is 320 kt. The landing is made with FLAP 3, at VREF + 10 kt, in direct law once the gear is down.'],
      pre: AP_OFF,
      setup: function (s) { s.fctl.elac = ['fault', 'fault']; s.fctl.law = 'ALTN'; s.fctl.ail = false; },
      lights: [ELAC1, ELAC2],
      memo: [],
      steps: [MASTER].concat(RESET_OFF('ELAC 1', ELAC1, 'Captain', 'ELAC 1 left off.'), [
        N('ELAC 2 FAULT', 'a')
      ], RESET_OFF('ELAC 2', ELAC2, 'F/O', 'ELAC 2 left off: the SECs fly the aircraft in alternate law.'), [
        Q('With both ELACs lost, what gives roll control?', 'The spoilers only', ['The ailerons through the SECs', 'The rudder only', 'The ailerons in direct law'],
          'Both ailerons are lost. The SECs use the roll spoilers, so roll is a little less crisp.')
      ]),
      seq: [
        { lines: [N('F/CTL ALTN LAW', 'a', { word: 'F/CTL', boxed: true }), N('     (PROT LOST)', 'a'), N('MAX SPEED........320 KT')], memo: [], sd: 'F/CTL',
          text: 'F/CTL ALTN LAW: the F/CTL page shows both ELACs and both ailerons lost.', note: 'ELAC faults cleared. The next alert is F/CTL ALTN LAW.',
          q: Q('Why is the maximum speed 320 kt?', 'The high-speed protection is lost in alternate law', ['The ailerons are lost', 'The stabilizer is jammed', 'The autothrust is lost'],
            'Without protection, staying well below VMO keeps the aircraft away from an overspeed it can no longer prevent on its own.') },
        { lines: [], memo: [], sd: 'STS',
          sts: { left: [['MAX SPEED........320 KT', 'c'], ['APPR PROC:', 'w'], [' -FOR LDG.......USE FLAP 3', 'c'], ['APPR SPD: VREF + 10 KT', 'c'], ['LDG DIST PROC......APPLY', 'c'],
            ['ALTN LAW : PROT LOST', 'a'], ['WHEN L/G DN : DIRECT LAW', 'a'], ['CAT 1 ONLY', 'g']], inop: ['F/CTL PROT', 'L+R AIL', 'ELAC 1+2', 'AP 1+2'] },
          text: 'STATUS is shown. Review it with the other pilot.', note: 'STATUS is shown.',
          q: Q('Why FLAP 3 for landing?', 'With the ailerons lost, roll control is reduced, so the landing is made in CONF 3', ['FLAP FULL is lost with the ELACs', 'To keep the speed below 320 kt', 'To save fuel on the go-around'],
            'CONF 3 keeps more margin in roll and pitch for a direct-law landing. The approach speed is VREF + 10 kt.') }
      ]
    },

    'fctl-sec1': {
      title: 'F/CTL SEC 1 FAULT', sysWord: 'F/CTL', level: 2, sd: 'F/CTL', phase: 'Cruise · FL350',
      brief: 'In cruise, SEC 1 fails. The spoilers it drives are lost, and the speed brakes must not be used.',
      learn: ['The three SECs (Spoiler Elevator Computers) drive the spoilers and are the standby for the elevators and stabilizer.',
        'SEC 1 also sends the speed brake position to the FACs: with it lost, VLS would not be corrected for extended speed brakes, so they are not used.'],
      setup: function (s) { s.fctl.sec[0] = 'fault'; },
      lights: [SEC1],
      memo: [],
      steps: [MASTER].concat(RESET_OFF('SEC 1', SEC1, 'Captain', 'SEC 1 left off.'), [
        N('-SPD BRK.........DO NOT USE'),
        Q('Why DO NOT USE the speed brakes after SEC 1 FAULT?', 'VLS would not be corrected for extended speed brakes', ['The speed brake lever is jammed', 'The spoilers would extend only on one wing', 'The ELACs would go to alternate law'],
          'The speed brake position reaches the FACs through SEC 1. Without it the PFD VLS would be too low with speed brakes out.')
      ])
    },

    'fctl-sec2': {
      title: 'F/CTL SEC 2 FAULT', sysWord: 'F/CTL', level: 2, sd: 'F/CTL', phase: 'Cruise · FL350',
      brief: 'In cruise, SEC 2 fails. The spoilers it drives are lost; the others still work.',
      learn: ['Each SEC drives some of the spoilers. A single SEC fault costs only its own spoiler pairs; roll, speed brakes and ground spoilers still work with the others.'],
      setup: function (s) { s.fctl.sec[1] = 'fault'; },
      lights: [SEC2],
      memo: [],
      steps: [MASTER].concat(RESET_OFF('SEC 2', SEC2, 'F/O', 'SEC 2 left off.'), [
        Q('Why is a SEC reset worth trying?', 'A passing fault can clear, giving back its spoilers', ['It moves the ELACs to normal law', 'It is required before landing', 'It tests the FAULT light'],
          'If the FAULT light stays after the reset, the SEC is left off.')
      ])
    },

    'fctl-sec3': {
      title: 'F/CTL SEC 3 FAULT', sysWord: 'F/CTL', level: 2, sd: 'F/CTL', phase: 'Cruise · FL350',
      brief: 'In cruise, SEC 3 fails. The spoilers it drives are lost; the others still work.',
      learn: ['Each SEC drives some of the spoilers. A single SEC fault costs only its own spoiler pairs.'],
      setup: function (s) { s.fctl.sec[2] = 'fault'; },
      lights: [SEC3],
      memo: [],
      steps: [MASTER].concat(RESET_OFF('SEC 3', SEC3, 'F/O', 'SEC 3 left off.'), [
        Q('Where is SEC 3 on the overhead?', 'On the F/O side FLT CTL panel, with ELAC 2 and SEC 2', ['On the Captain side, with ELAC 1', 'On the pedestal', 'On the maintenance panel'],
          'ELAC 1, SEC 1 and FAC 1 are on the Captain side; ELAC 2, SEC 2, SEC 3 and FAC 2 on the F/O side.')
      ])
    }
  };
  Object.keys(DRILLS).forEach(function (id) { DRILLS[id].id = id; addAnc(DRILLS[id]); });

  // Menu: categories and entries. lvl: w overview, a caution, r warning.
  // drill: the drill id, or several to choose from. Entries without one are still to come.
  function E(title, lvl, drill) { return { title: title, lvl: lvl, drill: drill || null }; }
  var CATEGORIES = [
    ['MEMORY ITEMS', [E('EMER DESCENT [MEM]', 'r'), E('UNRELIABLE SPEED [MEM]', 'a'), E('STALL RECOVERY [MEM]', 'r'), E('STALL WARNING AT LIFTOFF [MEM]', 'r'),
      E('GPWS [MEM]', 'r'), E('TCAS [MEM]', 'r'), E('REACTIVE WINDSHEAR [MEM]', 'r'), E('LOSS OF BRAKING [MEM]', 'r')]],
    ['AIR', [E('BLEED 1+2 FAULT', 'a'), E('PACK 1+2 FAULT', 'a')]],
    ['AUTO FLT', [E('FMGC SYSTEM OVERVIEW', 'w'), E('FAC FAULTS', 'a', ['afl-fac1', 'afl-fac12']), E('FCU FAULTS', 'a', ['afl-fcu1', 'afl-fcu12']), E('FMGC SINGLE FAULT', 'a'), E('DUAL FMGC FAILURE', 'a', 'afl-dual-fmgc')]],
    ['BRAKES', [E('BRAKES SYS OVERVIEW', 'w'), E('BRAKES SYS 1(2) FAULT', 'a', 'brk-sys1'), E('LOSS OF BRAKING [MEM]', 'r')]],
    ['CAB PRESS', [E('EXCESSIVE CAB ALT', 'r'), E('CPC FAULTS', 'a', 'press-sys12')]],
    ['ELEC', [E('ELECTRICAL SYSTEM OVERVIEW', 'w'), E('C/B TRIPPED', 'a'), E('DC ESS BUS FAULT', 'a', 'elec-dc-ess'), E('ELEC EMER CONFIG', 'r')]],
    ['ENG', [E('ABN/NON-STD ENG START', 'a'), E('ENGINE MALFUNCTIONS', 'a'), E('ALL ENG FAIL', 'r'), E('ENG FAIL IN CRUISE', 'a'), E('ENG FAIL AFTER V1', 'a'),
      E('OEI APP AND LANDING', 'a'), E('OEI GO AROUND', 'a'), E('OEI BLEED MANAGEMENT', 'a'), E('TAILPIPE FIRE', 'a'), E('THRUST LOCKED', 'a'), E('TOGA LK', 'a'), E('THR LEVERS MANAGEMENT', 'a')]],
    ['F/CTL', [E('F/CTL LAWS OVERVIEW', 'w'), E('ELAC FAULTS', 'a', ['fctl-elac1', 'fctl-elac12']), E('ELEVATOR FAULTS', 'a'), E('RUDDER JAM', 'a'), E('SEC FAULTS', 'a', ['fctl-sec1', 'fctl-sec2', 'fctl-sec3']), E('SLATS OR FLAPS JAMMED', 'a'), E('STABILISER JAM', 'a'), E('TAKEOVER PB', 'w')]],
    ['FUEL', [E('FUEL IMBALANCE', 'a'), E('FUEL LEAK', 'a'), E('FUEL OVERREAD', 'a'), E('FUEL TEMPERATURE', 'a'), E('GRAVITY FUEL FEEDING', 'a')]],
    ['HYD', [E('HYD SYSTEM OVERVIEW', 'w', 'hyd-overview'), E('HYD SINGLE FAILURES', 'a', ['hyd-g-rsvr', 'hyd-b-lopr', 'hyd-y-pump']),
      E('HYD B+Y', 'r', 'hyd-by'), E('HYD G+B', 'r', 'hyd-gb'), E('HYD G+Y', 'r', 'hyd-gy')]],
    ['LG', [E('L/G GRAVITY EXTENSION', 'a'), E('LANDING WITH ABNORMAL L/G', 'a'), E('LGCIU FAULTS', 'a'), E('NWS FAULT', 'a'), E('TAXI WITH DEFLATED TIRE', 'a')]],
    ['MISC', [E('EMER DESCENT [MEM]', 'r'), E('EMER EVAC', 'r'), E('EMER LANDING ALL ENG FAILURE', 'r'), E('OVERWEIGHT LANDING', 'a'), E('REJECTED TAKEOFF', 'a'),
      E('STALL RECOVERY [MEM]', 'r'), E('STALL WARNING AT LIFTOFF [MEM]', 'r'), E('SYSTEM RESET', 'a'), E('VOLCANIC ASH ENCOUNTER', 'a')]],
    ['NAV', [E('ADIRS SYSTEM OVERVIEW', 'w'), E('ADR FAULTS', 'a'), E('IR FAULTS', 'a'), E('UNRELIABLE SPEED [MEM]', 'a'), E('RA FAULTS', 'a')]],
    ['SMOKE', [E('SMOKE/FUMES/AVNCS SMOKE', 'r'), E('CARGO SMOKE', 'r')]],
    ['SURV', [E('GPWS [MEM]', 'r'), E('TCAS [MEM]', 'r'), E('PREDICTIVE WINDSHEAR', 'a'), E('REACTIVE WINDSHEAR [MEM]', 'r')]],
    // Owner's request (0.7.39): the gear and brakes failures with WHEEL page indications go here;
    // drills to come from the owner's ECAM pages.
    ['WHEEL', [E('WHEEL TIRE DAMAGE SUSPECTED', 'a'), E('L/G LGCIU 1(2) FAULT', 'a'), E('L/G GEAR UPLOCK FAULT', 'a'), E('BRAKES BSCU CH 1(2) FAULT', 'a'), E('BRAKES RELEASED', 'a')]]
  ];

  // General ECAM handling questions for the Questions Bank.
  var GENERAL = [
    Q('A red ECAM warning comes with MASTER WARN and the continuous repetitive chime. What level is it?', 'Level 3: an emergency needing immediate action',
      ['Level 2: an abnormal needing crew awareness', 'Level 1: monitoring only', 'An advisory'],
      'Level 3 (red, MASTER WARN, continuous repetitive chime) needs immediate action. Level 2 (amber, MASTER CAUT, single chime) needs awareness. Level 1 (amber, no master light or chime) needs monitoring.'),
    Q('Which colour does the ECAM use for the actions to carry out?', 'Cyan', ['Green', 'White', 'Magenta'],
      'Cyan: actions and limitations. Green: normal operation. Amber: cautions. Red: warnings. White: titles and remarks.'),
    Q('Who reads and carries out the ECAM actions?', 'The PM, on the PF\'s command', ['The PF', 'Always the Captain', 'Whoever spots the warning first'],
      'The PF flies the aircraft and handles navigation and communication; the PM reads and does the ECAM actions, asking for confirmation where it is needed.'),
    Q('Which actions need confirmation from both pilots before they are done?', 'Thrust lever, ENG MASTER, fire pushbutton, IR and IDG', ['Any overhead pushbutton', 'Only the fire pushbutton', 'Only actions below 10 000 ft'],
      'These actions are critical or cannot be undone in flight, so the PM announces them and the PF confirms first.'),
    Q('When is CLR pressed after a failure?', 'When all actions are done and both pilots agree', ['As soon as the warning appears', 'Before the procedure is read', 'Only on the ground'],
      'The PM asks "Clear?" and the PF checks before agreeing. Clearing too early can hide actions not yet done.'),
    Q('What comes after the procedure of a failure is cleared?', 'Any secondary failures (marked *), then the STATUS page', ['The CRUISE page straight away', 'The E/WD goes blank', 'The ENG page'],
      'ECAM works through the alerts, then shows each secondary failure (for example *WHEEL, *F/CTL) on its SD page, then STATUS for review before the last CLR.'),
    Q('What does EMER CANC do for an amber caution?', 'Cancels it for the rest of the flight; it can be brought back with RCL', ['Cancels it until the next flight phase', 'Resets the failed system', 'Clears the STATUS page'],
      'EMER CANC is for spurious alerts. A cancelled caution is listed on STATUS as CANCELLED CAUTION and can be recalled with RCL.'),
    Q('What does a red LAND ASAP mean?', 'Land at the nearest airport where a safe landing can be made', ['Consider landing at the nearest suitable airport', 'Return to the departure airport', 'Continue to destination'],
      'Red LAND ASAP: land at the nearest suitable airport where a safe landing can be made. Amber LAND ASAP: consider landing at the nearest suitable airport.'),
    Q('From what height can the ECAM actions be started after take-off?', '400 ft AGL, with the flight path under control', ['1000 ft AGL', '1500 ft AGL', 'Straight after lift-off'],
      'Apart from silencing the aural warning, ECAM actions are not started below 400 ft AGL.'),
    Q('What does the STS indication at the bottom of the E/WD mean?', 'There is STATUS information to review', ['A system is on standby', 'The aircraft is stable', 'A caution was cancelled'],
      'STS reminds the crew that the STATUS page has content. Press STS on the ECAM control panel to see it.')
  ];

  // Every question, grouped by menu category, for the Questions Bank.
  function questions() {
    var out = [['GENERAL ECAM', GENERAL.slice()]];
    CATEGORIES.forEach(function (c) {
      var qs = [];
      c[1].forEach(function (e) {
        [].concat(e.drill || []).forEach(function (id) {
          var d = DRILLS[id];
          function add(q) { if (q && qs.indexOf(q) < 0) qs.push(Object.assign({ from: d.title }, q)); }
          d.steps.forEach(function (st) { if (st.k === 'quiz') add(st); });
          (d.seq || []).forEach(function (g) { add(g.q); });
          add(d.statusQ);
        });
      });
      if (qs.length) out.push([c[0], qs]);
    });
    return out;
  }

  window.ECAM_FAILURES = { DRILLS: DRILLS, CATEGORIES: CATEGORIES, questions: questions };
})();
