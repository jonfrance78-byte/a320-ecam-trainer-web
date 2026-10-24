/* A320 Normal Procedures: flows and normal checklists.
 *
 * Built from the Airbus A320 family standard operating procedures (FCOM PRO-NOR-SOP)
 * and the Airbus standard normal checklist, simplified for training. Operator
 * procedures (Jet2 OM-B / SOP) can differ in order, wording and task sharing:
 * items marked ◆ are operator-dependent and should be checked against them.
 *
 * Step kinds:
 *   S(ref, to, say, why)   set or check one control on the panel (see js/np-core.js for 'to')
 *   C(say, why)            a check or action with no panel control; o.panel shows a panel
 *   L(name, items)         a normal checklist, read and responded at this point
 * o.who: CM1 / CM2 / PF / PM, where the task sharing is standard.
 * o.after: side effects on other controls, e.g. FAULT lights going out after engine start.
 */
(function () {
  'use strict';

  function S(ref, to, say, why, o) { return Object.assign({ k: 'set', ref: ref, to: to, say: say, why: why || '' }, o || {}); }
  function C(say, why, o) { return Object.assign({ k: 'check', say: say, why: why || '' }, o || {}); }
  function L(name, items, o) { return Object.assign({ k: 'list', name: name, items: items }, o || {}); }
  function T(ref, to) { return { ref: ref, to: to }; }

  // Lights that come and go with the systems.
  var GEN1 = 'ELEC/GEN 1', GEN2 = 'ELEC/GEN 2', P1 = 'HYD/ENG 1\nPUMP', P2 = 'HYD/ENG 2\nPUMP', EXT = 'ELEC/EXT\nPWR', START = 'LOWER/START';
  var ENG_STOPPED_1 = [[GEN1, { up: true }], [P1, { up: true }]], ENG_STOPPED_2 = [[GEN2, { up: true }], [P2, { up: true }]];
  var ENG_RUN_1 = [[GEN1, { up: false }], [P1, { up: false }]], ENG_RUN_2 = [[GEN2, { up: false }], [P2, { up: false }]];
  var FUEL = [['FUEL/1#1', 'L TK PUMP 1'], ['FUEL/2#1', 'L TK PUMP 2'], ['FUEL/CTR TK\nL XFR', 'CTR TK L XFR'], ['FUEL/CTR TK\nR XFR', 'CTR TK R XFR'], ['FUEL/1#2', 'R TK PUMP 1'], ['FUEL/2#2', 'R TK PUMP 2']];

  // The secured aircraft: where the previous crew left it after the securing checklist.
  var INITIAL = [
    T('ELEC/BAT 1', true), T('ELEC/BAT 2', true),
    T('ADIRS/IR 1 MODE', 'OFF'), T('ADIRS/IR 3 MODE', 'OFF'), T('ADIRS/IR 2 MODE', 'OFF'),
    T('OXY/CREW\nSUPPLY', true),
    T('LOWER/STROBE', 'OFF'), T('LOWER/BEACON', 'OFF'), T('LOWER/WING', 'OFF'), T('LOWER/NAV & LOGO', 'OFF'), T('LOWER/RWY TURN OFF', 'OFF'),
    T('LOWER/L', 'RETRACT'), T('LOWER/R', 'RETRACT'), T('LOWER/NOSE', 'OFF'),
    T('LOWER/SEAT BELTS', 'OFF'), T('LOWER/NO SMOKING', 'OFF'), T('LOWER/EMER EXIT LT', 'OFF'),
    T('ENGPED/ENG MASTER 1', 'OFF'), T('ENGPED/ENG MASTER 2', 'OFF'), T('ENGPED/MODE', 'NORM'),
    T('THR/Thrust lever 1', 'IDLE'), T('THR/Thrust lever 2', 'IDLE'),
    T('PARKBRK/PARKING BRK', 'ON'), T('LGLEVER/Landing gear lever', 'DOWN'),
    T('ATC/ATC mode', 'STBY'), T('ATC/TCAS mode', 'STBY'), T('WXR/WXR/PWS', 'OFF'),
    T('FCU/AP1', false), T('FCU/AP2', false), T('FCU/A/THR', false)
  ].concat(FUEL.map(function (f) { return T(f[0], true); }));

  var FLOWS = [
    /* ------------------------------------------------------------ preparation */
    {
      id: 'power', group: 'Preparation', title: 'Power-up', phase: 'Preliminary cockpit preparation',
      intro: 'Secured aircraft at the stand, external power available. Safety checks before any electrical power, then batteries, external power and the APU.',
      steps: [
        S('ENGPED/ENG MASTER 1', 'OFF', 'OFF — check', 'Safety check before power: both ENG MASTER levers OFF, so no engine can start.'),
        S('ENGPED/ENG MASTER 2', 'OFF', 'OFF — check'),
        S('ENGPED/MODE', 'NORM', 'NORM — check', 'Engine mode selector at NORM.'),
        S('WXR/WXR/PWS', 'OFF', 'OFF — check', 'Weather radar off near people on the ground.'),
        S('LGLEVER/Landing gear lever', 'DOWN', 'DOWN — check', 'Gear lever down before hydraulic power reaches the gear.'),
        S('WIPERL/WIPER', 'OFF', 'OFF — check', 'Both wipers off: they can damage a dry windshield.'),
        S('WIPERR/WIPER', 'OFF', 'OFF — check'),
        C('BAT 1 and BAT 2 voltage: above 25.5 V', 'Check with both batteries OFF. Below 25.5 V the batteries need a charging cycle (BAT AUTO with external power, about 20 minutes) ◆.', { panel: 'ELEC' }),
        S('ELEC/BAT 1', false, 'AUTO', 'OFF light out. The battery connects to the DC BAT bus.'),
        S('ELEC/BAT 2', false, 'AUTO', 'Lights come on: GEN 1 and GEN 2 FAULT (engines stopped), the HYD engine pump FAULT lights and EXT PWR AVAIL.',
          { after: ENG_STOPPED_1.concat(ENG_STOPPED_2, [[EXT, { up: true }]]) }),
        S(EXT, true, 'ON', 'Blue ON: external power supplies the aircraft. AVAIL goes out.', { after: [[EXT, { up: false }]] }),
        S('FIRE/TEST#2', 'press', 'TEST', 'APU fire test: APU FIRE pushbutton red, SQUIB and DISCH lights, MASTER WARN and the CRC.'),
        S('LOWER/MASTER SW', true, 'ON', 'APU MASTER SW ON: the APU air intake flap opens and the ECU runs its power-up test.'),
        S(START, true, 'ON', 'Push START (about 3 s after MASTER SW). ON goes out and AVAIL comes on when the APU is up to speed.',
          { after: [[START, { up: false, lo: true }]] }),
        S('AIR/APU\nBLEED', true, 'ON', 'APU BLEED ON once AVAIL is lit, for air conditioning. With EXT PWR on, external power keeps priority over the APU generator.')
      ]
    },
    {
      id: 'ovhd', group: 'Preparation', title: 'Overhead panel scan', phase: 'Cockpit preparation',
      intro: 'The overhead scan: left column top to bottom, centre column top to bottom, then the right column. Aim: all white lights out except those expected.',
      steps: [
        S('ADIRS/IR 1 MODE', 'NAV', 'NAV', 'Starts IR 1 alignment. ON BAT lights for a few seconds. Full alignment takes about 10 minutes (longer at high latitude); do not move the aircraft.'),
        S('ADIRS/IR 3 MODE', 'NAV', 'NAV'),
        S('ADIRS/IR 2 MODE', 'NAV', 'NAV'),
        S('FLTCTL1/ELAC 1', false, 'ON — check', 'ELAC 1, SEC 1 and FAC 1: no OFF or FAULT lights.'),
        S('EVAC/CAPT & PURS', ['CAPT & PURS', 'CAPT'], 'As required ◆', 'CAPT & PURS: the evacuation can be commanded from the cabin as well as the cockpit. Operator policy.'),
        S('EMERELEC/GEN 1\nLINE', false, 'ON — check', 'GEN 1 LINE: OFF light out.'),
        S('GPWS/SYS', false, 'ON — check', 'GPWS: all OFF lights out.'),
        S('RCDR/GND CTL', true, 'ON ◆', 'Powers the CVR and DFDR on the ground before engine start. Operator policy.'),
        S('OXY/CREW\nSUPPLY', false, 'ON', 'OFF light out: crew oxygen supply valve open. Check the crew oxygen pressure on the DOOR/OXY page.'),
        S('FIRE/TEST#1', 'press', 'ENG 1 TEST', 'ENG 1 FIRE pushbutton red, SQUIB and DISCH on both agents, MASTER WARN, CRC, ENG 1 FIRE on the ECAM and the FIRE light on the ENG panel.'),
        S('FIRE/TEST#3', 'press', 'ENG 2 TEST', 'Same check for engine 2.'),
        S(P1, false, 'ON — check', 'Engine pumps ON (FAULT is normal with the engines stopped), blue ELEC PUMP AUTO, PTU AUTO, yellow ELEC PUMP OFF.'),
        S(FUEL[0][0], false, 'ON', 'Fuel pumps ON. OFF light out.'),
        S(FUEL[1][0], false, 'ON'),
        S(FUEL[2][0], false, 'ON', 'Centre tank transfer ON.'),
        S(FUEL[3][0], false, 'ON'),
        S(FUEL[4][0], false, 'ON'),
        S(FUEL[5][0], false, 'ON'),
        S('FUEL/MODE SEL', false, 'AUTO — check', 'MODE SEL AUTO, X FEED off.'),
        C('ELEC panel: no FAULT lights except GEN 1 and 2', 'BAT AUTO, AC ESS FEED NORM, IDGs not disconnected, BUS TIE AUTO, GALY & CAB AUTO, COMMERCIAL ON.', { panel: 'ELEC' }),
        S('AIR/X BLEED', 'AUTO', 'AUTO — check', 'AIR panel: PACK FLOW as required, ENG BLEEDS ON, PACKS ON, HOT AIR ON, RAM AIR OFF, X BLEED AUTO.'),
        S('ANTIICE/PROBE/\nWINDOW HEAT', false, 'AUTO — check', 'Probe and window heat run automatically with an engine running; ON is not needed on the ground.'),
        S('CABPRESS/MODE SEL', false, 'AUTO — check', 'Cabin pressure: MODE SEL AUTO, LDG ELEV AUTO, DITCHING OFF.'),
        S('LOWER/STROBE', 'AUTO', 'AUTO', 'Strobes come on automatically when the main gear leaves the ground.'),
        S('LOWER/NAV & LOGO', ['2', '1'], 'ON (1 or 2)', 'NAV & LOGO lights on for the whole time the aircraft is powered on the stand ◆.'),
        S('LOWER/SEAT BELTS', 'ON', 'ON', 'Item on the cockpit preparation checklist.'),
        S('LOWER/NO SMOKING', 'AUTO', 'AUTO', 'AUTO: the signs follow the landing gear position.'),
        S('LOWER/EMER EXIT LT', 'ARM', 'ARM', 'Emergency lights come on automatically if normal aircraft power is lost.'),
        S('FLTCTL2/ELAC 2', false, 'ON — check', 'ELAC 2, SEC 2 and 3, FAC 2: no lights.'),
        S('CARGO/TEST', 'press', 'TEST', 'Cargo smoke test: SMOKE and DISCH lights, CARGO SMOKE on the ECAM, MASTER WARN and the CRC (two cycles).'),
        S('MANSTART/ENG 1', false, 'OFF — check', 'ENG MAN START: both ON lights out.')
      ]
    },
    {
      id: 'centre', group: 'Preparation', title: 'Glareshield, panel and pedestal', phase: 'Cockpit preparation',
      intro: 'After the overhead: the glareshield, the main instrument panel, the FMGS preparation on the MCDU, then the pedestal. The cockpit preparation checklist follows.',
      steps: [
        S('EFISL/BARO', 'press', 'QNH — set', 'Set the departure QNH on both EFIS panels; crosscheck with the ISIS and the airfield elevation.'),
        S('EFISL/FD', true, 'FD — on', 'Both flight directors on. LS pushbutton as required.'),
        S('FCU/ALT knob', 'press', 'Initial altitude — set', 'Set the initial cleared altitude in the FCU ALT window. SPD and HDG windows dashed (managed).'),
        S('EFISR/BARO', 'press', 'QNH — set', 'The F/O sets QNH and the FD on the right EFIS.'),
        S('AUTOBRK/A/SKID & N/W STRG', 'ON', 'ON — check', 'Anti-skid and nose wheel steering on.'),
        S('MCDU1/DATA', 'press', 'DATA', 'FMGS preparation, part 1: aircraft status (database validity, PERF factor).'),
        S('MCDU1/INIT', 'press', 'INIT A', 'INIT A: company route or FROM/TO, flight number, cost index, cruise flight level, and the IRS alignment position.'),
        S('MCDU1/F-PLN', 'press', 'F-PLN', 'Departure runway and SID, airways and the flight plan; check constraints and the total distance against the OFP.'),
        S('MCDU1/RAD\nNAV', 'press', 'RAD NAV', 'Navaids as required for the departure (for example the ILS of the departure runway for a return).'),
        S('MCDU1/INIT', 'press', 'INIT B', 'INIT B (next page): ZFW, ZFWCG and block fuel. Later checked against the loadsheet.'),
        S('MCDU1/PERF', 'press', 'PERF TO', 'Take-off speeds, flap setting, FLEX temperature, THR RED and ACC altitudes, and the engine-out acceleration altitude.'),
        S('ECP/RCL', 'press', 'RCL', 'Recall: shows the cautions and warnings cleared or inhibited, to see what the previous crew had.'),
        S('ECP/DOOR', 'press', 'DOOR / OXY', 'Crew oxygen pressure check on the DOOR/OXY page.'),
        S('THR/Thrust lever 1', 'IDLE', 'IDLE — check', 'Both thrust levers at idle.'),
        S('PARKBRK/PARKING BRK', 'ON', 'ON — check', 'Check the brake pressure on the triple indicator, and the brake accumulator pressure.'),
        S('SPDBRK/SPEED BRAKE', 'RET', 'RET — check', 'Speed brake lever retracted and not armed.'),
        S('FLAPS/FLAPS', '0', '0 — check', 'Flap lever position agrees with the slats and flaps on the E/WD.'),
        S('ATC/ATC mode', 'STBY', 'STBY — check', 'Transponder in standby; set the code from the clearance.'),
        L('COCKPIT PREPARATION', [['GEAR PINS & COVERS', 'REMOVED'], ['FUEL QUANTITY', '___ KG'], ['SEAT BELTS', 'ON'], ['ADIRS', 'NAV'], ['BARO REF', '___ (BOTH)']])
      ]
    },
    /* ------------------------------------------------------------ departure */
    {
      id: 'start', group: 'Departure', title: 'Before start', phase: 'Before pushback or start',
      intro: 'Loadsheet in, doors closing, start clearance received.',
      steps: [
        C('Loadsheet: final ZFW and ZFWCG entered; T.O data rechecked', 'INIT B, PERF TO and the trim setting confirmed against the final loadsheet.', { panel: 'MCDU1' }),
        S('ECP/DOOR', 'press', 'DOOR page — check', 'All doors and slides closed and armed (no amber door on the DOOR page).'),
        S('LOWER/BEACON', 'ON', 'ON', 'Beacon ON before pushback or engine start: the signal to ground staff that engines are about to start.'),
        S('THR/Thrust lever 1', 'IDLE', 'IDLE — check'),
        S('ATC/ATC mode', 'AUTO', 'AUTO ◆', 'AUTO: the transponder replies once airborne. Some airports require ON for ground surveillance.'),
        L('BEFORE START', [['PARKING BRAKE', '___'], ['T.O SPEEDS & THRUST', '___ (BOTH)'], ['WINDOWS / DOORS', 'CLOSED (BOTH)'], ['BEACON', 'ON']])
      ]
    },
    {
      id: 'eng', group: 'Departure', title: 'Engine start and after start', phase: 'Engine start',
      intro: 'Automatic start, engine 2 first ◆. Then the after start flow: APU, anti-ice, ground spoilers, flaps and trims.',
      steps: [
        S('ENGPED/MODE', 'IGN', 'IGN/START', 'The FADEC starts the start sequence when ENG MASTER goes ON. The ENG page shows on the SD.'),
        S('ENGPED/ENG MASTER 2', 'ON', 'ENG 2 — ON', 'Watch the start: start valve, N2 rising, IGN A or B, fuel flow, light-up (EGT). LEAP-1A engines may dry crank first to cool a bowed rotor, so the start takes longer.',
          { after: ENG_RUN_2 }),
        C('ENG 2 stabilised: AVAIL, parameters normal', 'GEN 2 FAULT and the yellow ENG 2 PUMP FAULT go out when the engine is running.', { panel: 'HYD' }),
        S('ENGPED/ENG MASTER 1', 'ON', 'ENG 1 — ON', 'Start engine 1 the same way.', { after: ENG_RUN_1 }),
        S('ENGPED/MODE', 'NORM', 'NORM', 'Back to NORM once both engines show AVAIL.'),
        S('AIR/APU\nBLEED', false, 'OFF', 'APU BLEED OFF; the engine bleeds now supply the packs.'),
        C('ENG ANTI ICE and WING ANTI ICE: as required', 'Engine anti-ice ON in icing conditions on the ground (OAT ≤ 10 °C with visible moisture).', { panel: 'ANTIICE' }),
        S('LOWER/MASTER SW', false, 'APU MASTER — OFF ◆', 'APU off unless needed (performance, hot day, single engine taxi).', { after: [[START, { lo: false }]] }),
        C('GND SPLRS: ARM', 'Pull the speed brake lever up in the RET position.', { panel: 'SPDBRK', who: 'PF' }),
        S('RUDTRIM/RUD TRIM', '', 'RUD TRIM — zero', 'Rudder trim neutral.'),
        S('FLAPS/FLAPS', '1', 'FLAPS — T.O', 'Set the take-off configuration from PERF TO (here CONF 1+F). Check the slats and flaps on the E/WD.', { who: 'PM' }),
        C('PITCH TRIM: set for the T.O CG', 'Set the trim wheel to the value from the loadsheet or the MCDU.', { panel: 'THR' }),
        S('ECP/STS', 'press', 'ECAM STATUS — check', 'No STATUS (or only items accepted under the MEL).'),
        L('AFTER START', [['ANTI ICE', '___'], ['ECAM STATUS', 'CHECKED'], ['PITCH TRIM', '___ %'], ['RUDDER TRIM', 'NEUTRAL']])
      ]
    },
    {
      id: 'taxi', group: 'Departure', title: 'Taxi', phase: 'Taxi',
      intro: 'Taxi clearance received. Lights, brakes, flight control check, take-off configuration test and the take-off briefing.',
      steps: [
        S('LOWER/NOSE', 'TAXI', 'TAXI', 'Nose taxi light on.'),
        S('LOWER/RWY TURN OFF', 'ON', 'ON', 'Runway turn-off lights as required.'),
        S('PARKBRK/PARKING BRK', 'OFF', 'OFF', 'Check the brake pressure on the triple indicator is zero.', { who: 'PF' }),
        C('Brakes: check', 'Press the brake pedals once moving, to check the normal (green) brakes.', { who: 'PF' }),
        S('AUTOBRK/MAX', true, 'MAX', 'MAX for take-off: maximum braking in a rejected take-off above 72 kt.'),
        S('ECP/F/CTL', 'press', 'F/CTL page', 'Flight control check: full sidestick and rudder travel. PF moves the controls, PM watches the F/CTL page.', { who: 'BOTH' }),
        S('ECP/T.O\nCONFIG', 'press', 'T.O CONFIG — test', 'Simulates take-off thrust: the ECAM shows T.O CONFIG NORMAL, or a warning (flaps, pitch trim, speed brake, brakes, doors).'),
        C('Take-off briefing: confirmed', 'FMA and PFD as briefed, take-off data, initial climb, engine failure procedure.', { who: 'PF' }),
        S('WXR/WXR/PWS', '1', 'ON', 'Weather radar on and the predictive windshear function AUTO before entering the runway.'),
        L('TAXI', [['FLIGHT CONTROLS', 'CHECKED (BOTH)'], ['FLT INST', 'CHECKED (BOTH)'], ['BRIEFING', 'CONFIRMED'], ['FLAP SETTING', 'CONF ___ (BOTH)'], ['RADAR & PRED W/S', 'ON & AUTO'], ['ENG MODE SEL', '___'], ['ECAM MEMO', 'T.O NO BLUE'], ['— AUTO BRK MAX · SIGNS ON · CABIN READY · SPLRS ARM · FLAPS T.O · T.O CONFIG NORM', '']])
      ]
    },
    {
      id: 'to', group: 'Departure', title: 'Line-up and take-off', phase: 'Take-off',
      intro: 'Cleared to line up and take off. Exterior lights, TCAS, thrust, and the after take-off sequence to clean configuration.',
      steps: [
        S('ATC/TCAS mode', 'TA/RA', 'TA/RA', 'TCAS on. TA only when required (for example parallel operations or an engine failure).'),
        S('LOWER/NOSE', 'T.O', 'T.O', 'Nose light to take-off.'),
        S('LOWER/STROBE', 'ON', 'ON'),
        S('LOWER/L', 'ON', 'LAND L — ON'),
        S('LOWER/R', 'ON', 'LAND R — ON'),
        L('LINE-UP', [['T.O RWY', '___ (BOTH)'], ['TCAS', 'TA OR TA/RA'], ['PACKS 1 & 2', '___']]),
        C('Thrust levers: about 50% N1, stabilise', 'Both engines stabilised and symmetrical before setting take-off thrust.', { panel: 'THR', who: 'PF' }),
        S('THR/Thrust lever 1', 'FLX MCT', 'FLX/MCT (or TOGA)', 'FMA: MAN FLX +xx, SRS, RWY, A/THR blue. PF calls "Take-off". (Both levers move together in the aircraft.)',
          { who: 'PF', after: [['THR/Thrust lever 2', { cur: 1 }], ['FCU/A/THR', { lo: true }]] }),
        C('"100 knots" — "V1" — "Rotate"', 'PM calls 100 kt (crosscheck the speeds), and V1. Rotate at VR to the SRS pitch.', { who: 'PM' }),
        S('LGLEVER/Landing gear lever', 'UP', 'GEAR UP', 'PM: "Positive climb". PF: "Gear up". PM selects the gear up.', { who: 'PM' }),
        S('FCU/AP1', true, 'AP1 — ON', 'Autopilot from 100 ft AGL after take-off ◆.', { who: 'PF' }),
        S('THR/Thrust lever 1', 'CL', 'CL detent', 'At THR RED ALT, LVR CLB flashes on the FMA: thrust levers to CL. A/THR becomes active.',
          { who: 'PF', after: [['THR/Thrust lever 2', { cur: 2 }]] }),
        C('ACC ALT: speed target increases', 'At the acceleration altitude the FMA target moves to the climb speed. Retract the flaps on schedule.', { who: 'PF' }),
        S('FLAPS/FLAPS', '0', 'FLAPS 0', 'PF: "Flaps zero" at S speed (from CONF 1+F, after F speed: CONF 1 then 0). PM selects.', { who: 'PM' }),
        C('GND SPLRS: disarm', 'Push the speed brake lever down. Disarming the ground spoilers also disarms the autobrake: MAX goes out.',
          { panel: 'SPDBRK', who: 'PM', after: [['AUTOBRK/MAX', { lo: false }]] })
      ]
    },
    {
      id: 'climb', group: 'Departure', title: 'Climb', phase: 'Climb',
      intro: 'Transition altitude and FL100: standard setting, lights, and the after take-off / climb checklist.',
      steps: [
        S('EFISL/BARO', 'press', 'STD', 'At the transition altitude: pull the BARO knob for STD on both sides. Crosscheck the altimeters.'),
        S('EFISR/BARO', 'press', 'STD'),
        L('AFTER T.O / CLIMB', [['LDG GEAR', 'UP'], ['FLAPS', 'RETRACTED'], ['PACKS', 'ON'], ['BARO REF', 'STD (BOTH)']]),
        S('LOWER/L', 'RETRACT', 'LAND L — RETRACT', 'Passing FL100: landing lights retracted.'),
        S('LOWER/R', 'RETRACT', 'LAND R — RETRACT'),
        S('LOWER/NOSE', 'OFF', 'NOSE — OFF'),
        S('LOWER/RWY TURN OFF', 'OFF', 'RWY TURN OFF — OFF'),
        C('SEAT BELTS: as required', 'Off when the climb is smooth, on in turbulence ◆.', { panel: 'LOWER' })
      ]
    },
    /* ------------------------------------------------------------ arrival */
    {
      id: 'desc', group: 'Arrival', title: 'Descent preparation', phase: 'Cruise, before top of descent',
      intro: 'About 80 NM before top of descent: weather, landing performance, FMS set-up for the arrival and the approach briefing.',
      steps: [
        C('Weather, NOTAMs and landing performance', 'Expected runway and approach, landing distance with the forecast conditions, autobrake setting.'),
        S('MCDU1/F-PLN', 'press', 'F-PLN — arrival', 'STAR, approach and missed approach. Check the waypoints, constraints and FPA against the chart.'),
        S('MCDU1/RAD\nNAV', 'press', 'RAD NAV', 'ILS or navaids for the approach, identified.'),
        S('MCDU1/PERF', 'press', 'PERF APPR', 'Destination QNH, temperature and wind, minimum (BARO or RADIO), landing configuration, VAPP check.'),
        S('MCDU1/FUEL\nPRED', 'press', 'FUEL PRED', 'Landing fuel and extra fuel against the plan and the diversion requirement.'),
        S('AUTOBRK/LO', true, 'LO (or MED)', 'Autobrake for landing from the landing performance ◆.'),
        S('ECP/STS', 'press', 'ECAM STATUS', 'Any STATUS item that affects the approach or landing.'),
        C('Approach briefing', 'Threats, arrival, approach and minima, missed approach, landing and taxi. Briefed by the PF.', { who: 'PF' }),
        S('FCU/ALT knob', 'press', 'Cleared altitude — set', 'Set the descent clearance altitude and push for managed descent (DES) at top of descent.', { who: 'PF' })
      ]
    },
    {
      id: 'appr', group: 'Arrival', title: 'Approach and landing', phase: 'Approach',
      intro: 'A standard ILS approach with a manual landing: transition level, FL100, approach phase and the configuration sequence. For other approach types, see Approaches.',
      steps: [
        S('EFISL/BARO', 'press', 'QNH', 'At the transition level: push the BARO knob and set QNH on both sides.'),
        S('EFISR/BARO', 'press', 'QNH'),
        L('APPROACH', [['BRIEFING', 'CONFIRMED'], ['ECAM STATUS', 'CHECKED'], ['SEAT BELTS', 'ON'], ['BARO REF', '___ (BOTH)'], ['MINIMUM', '___ (BOTH)'], ['ENG MODE SEL', '___']]),
        S('LOWER/L', 'ON', 'LAND L — ON', 'Passing FL100: landing lights on.'),
        S('LOWER/R', 'ON', 'LAND R — ON'),
        S('EFISL/LS', true, 'LS — ON', 'ILS deviation scales on the Captain\'s PFD.'),
        S('EFISR/LS', true, 'LS — ON'),
        S('MCDU1/PERF', 'press', 'ACTIVATE APPR PHASE', 'If not already active from the DECEL point: the speed target drops to green dot, then S and F as flaps extend.', { who: 'PM' }),
        S('FCU/APPR', true, 'APPR', 'Cleared for the approach, on an intercept heading: G/S and LOC armed (blue). Check CAT 1 or better on the FMA.', { who: 'PF' }),
        S('FLAPS/FLAPS', '1', 'FLAPS 1', 'At green dot or as needed for the deceleration.', { who: 'PM' }),
        S('FLAPS/FLAPS', '2', 'FLAPS 2', 'At or below VFE CONF 2; managed speed S.', { who: 'PM' }),
        S('LGLEVER/Landing gear lever', 'DOWN', 'GEAR DOWN', 'PF: "Gear down". Usually with CONF 2, and early enough to be stabilised at 1000 ft ◆.', { who: 'PM' }),
        C('GND SPLRS: ARM', 'With the gear down: arm the ground spoilers. Check the autobrake (LO or MED) and the NOSE light as required.', { panel: 'SPDBRK', who: 'PM' }),
        S('FLAPS/FLAPS', '3', 'FLAPS 3', 'At or below VFE CONF 3; managed speed F.', { who: 'PM' }),
        S('FLAPS/FLAPS', 'FULL', 'FLAPS FULL', 'Managed speed goes to VAPP.', { who: 'PM' }),
        L('LANDING', [['ECAM MEMO', 'LDG NO BLUE'], ['— LDG GEAR DN · SIGNS ON · CABIN READY · SPLRS ARM · FLAPS SET', '']]),
        C('1000 ft: "Stabilised"', 'On VAPP, on the LOC and G/S, landing configuration, thrust stable, checklist complete. If not stabilised: go around ◆.', { who: 'PM' }),
        C('"Minimum" — "Continue"', 'At DA with the required visual reference: PF calls "Continue" (or "Go around – flaps").', { who: 'PF' }),
        S('CONSL/Takeover pushbutton', 'press', 'AP — OFF', 'For a manual landing: disconnect with the takeover pushbutton on the sidestick at or above the minimum use height ◆.', { who: 'PF', after: [['FCU/AP1', { lo: false }], ['FCU/AP2', { lo: false }]] }),
        S('THR/Thrust lever 1', 'IDLE', 'RETARD — IDLE', '"RETARD" auto callout at 20 ft RA for a manual landing: thrust levers to idle. A/THR disconnects.',
          { who: 'PF', after: [['THR/Thrust lever 2', { cur: 3 }], ['FCU/A/THR', { lo: false }]] }),
        C('Touchdown: "Spoilers" — "Reverse green" — "Decel" — "70 knots"', 'Reverse thrust as required; idle reverse by 70 kt. Hold the autobrake or brake manually.', { who: 'PM' })
      ]
    },
    {
      id: 'land', group: 'Arrival', title: 'After landing', phase: 'Runway vacated',
      intro: 'Off the runway: clean up the aircraft, lights and radar, and start the APU.',
      steps: [
        C('GND SPLRS: disarm', 'Spoiler retraction also disarms the autobrake: LO goes out.', { panel: 'SPDBRK', after: [['AUTOBRK/LO', { lo: false }], ['FCU/APPR', { lo: false }]] }),
        S('FLAPS/FLAPS', '0', 'FLAPS 0', 'Flaps up once clear of the runway.'),
        S('LOWER/L', 'RETRACT', 'LAND L — RETRACT'),
        S('LOWER/R', 'RETRACT', 'LAND R — RETRACT'),
        S('LOWER/NOSE', 'TAXI', 'NOSE — TAXI'),
        S('LOWER/RWY TURN OFF', 'ON', 'RWY TURN OFF — as required'),
        S('LOWER/STROBE', 'AUTO', 'STROBE — AUTO'),
        S('ATC/TCAS mode', 'STBY', 'TCAS — STBY', 'Transponder as required by the airport ◆.'),
        S('WXR/WXR/PWS', 'OFF', 'RADAR — OFF', 'Weather radar and predictive windshear off.'),
        C('ENG ANTI ICE: as required', '', { panel: 'ANTIICE' }),
        S('LOWER/MASTER SW', true, 'APU MASTER — ON', 'Start the APU for the stand ◆.'),
        S(START, true, 'APU START', 'AVAIL comes on when the APU is ready.', { after: [[START, { up: false, lo: true }]] }),
        L('AFTER LANDING', [['RADAR & PRED W/S', 'OFF']])
      ]
    },
    /* ------------------------------------------------------------ turnaround */
    {
      id: 'park', group: 'At the stand', title: 'Parking', phase: 'Stand',
      intro: 'On the stand: brakes, engines off, lights and fuel pumps.',
      steps: [
        S('PARKBRK/PARKING BRK', 'ON', 'ON', 'Check the brake pressure on the triple indicator.', { who: 'CM1' }),
        S('AIR/APU\nBLEED', true, 'APU BLEED — ON', 'Air conditioning from the APU before the engines stop.'),
        S('ENGPED/ENG MASTER 1', 'OFF', 'ENG 1 — OFF', 'GEN 1 and green ENG 1 PUMP FAULT lights come on as the engine runs down.', { after: ENG_STOPPED_1 }),
        S('ENGPED/ENG MASTER 2', 'OFF', 'ENG 2 — OFF', '', { after: ENG_STOPPED_2 }),
        S('LOWER/BEACON', 'OFF', 'BEACON — OFF', 'When the engines have spooled down: the signal to ground staff that it is safe to approach.'),
        S('LOWER/NOSE', 'OFF', 'NOSE — OFF'),
        S('LOWER/RWY TURN OFF', 'OFF', 'RWY TURN OFF — OFF'),
        S('LOWER/SEAT BELTS', 'OFF', 'SEAT BELTS — OFF'),
        S(FUEL[0][0], true, 'OFF', 'Fuel pumps OFF.'),
        S(FUEL[1][0], true, 'OFF'),
        S(FUEL[2][0], true, 'OFF'),
        S(FUEL[3][0], true, 'OFF'),
        S(FUEL[4][0], true, 'OFF'),
        S(FUEL[5][0], true, 'OFF'),
        L('PARKING', [['APU BLEED', 'ON'], ['ENGINES', 'OFF'], ['SEAT BELTS', 'OFF'], ['EXT LT', '___'], ['FUEL PUMPS', 'OFF'], ['PARK BRK & CHOCKS', '___']])
      ]
    },
    {
      id: 'secure', group: 'At the stand', title: 'Securing the aircraft', phase: 'Leaving the aircraft',
      intro: 'Last crew off the aircraft: back to the secured state where Power-up starts.',
      steps: [
        S('ADIRS/IR 1 MODE', 'OFF', 'OFF', 'All three IRs OFF.'),
        S('ADIRS/IR 3 MODE', 'OFF', 'OFF'),
        S('ADIRS/IR 2 MODE', 'OFF', 'OFF'),
        S('OXY/CREW\nSUPPLY', true, 'OFF', 'Crew oxygen supply OFF.'),
        S('AIR/APU\nBLEED', false, 'APU BLEED — OFF'),
        S('LOWER/STROBE', 'OFF', 'STROBE — OFF'),
        S('LOWER/NAV & LOGO', 'OFF', 'NAV & LOGO — OFF'),
        S('LOWER/MASTER SW', false, 'APU MASTER — OFF', 'Wait for the APU flap to close (about 2 minutes) before the batteries go off.', { after: [[START, { lo: false }]] }),
        S('LOWER/EMER EXIT LT', 'OFF', 'EMER EXIT LT — OFF'),
        S('LOWER/NO SMOKING', 'OFF', 'NO SMOKING — OFF'),
        S('ATC/ATC mode', 'STBY', 'ATC — STBY'),
        S(EXT, false, 'EXT PWR — OFF ◆', 'If the aircraft is to be left unpowered. AVAIL comes back on while the ground power unit stays connected.', { after: [[EXT, { up: true }]] }),
        S('ELEC/BAT 1', true, 'BAT 1 — OFF'),
        S('ELEC/BAT 2', true, 'BAT 2 — OFF', 'The aircraft is dark.', { after: [[GEN1, { up: false }], [GEN2, { up: false }], [P1, { up: false }], [P2, { up: false }], [EXT, { up: false }]] }),
        L('SECURING THE AIRCRAFT', [['OXYGEN', 'OFF'], ['EMER EXIT LT', 'OFF'], ['EFBs', 'OFF ◆'], ['BATTERIES', 'OFF']])
      ]
    }
  ];

  /* Practice flows for the approach guides. They start from the end of the
   * descent preparation, below FL100 with the landing lights on. */
  var IN_APPR = [T('LOWER/L', 'ON'), T('LOWER/R', 'ON')];
  var CONFIG = [
    S('FLAPS/FLAPS', '1', 'FLAPS 1', '', { who: 'PM' }),
    S('FLAPS/FLAPS', '2', 'FLAPS 2', '', { who: 'PM' }),
    S('LGLEVER/Landing gear lever', 'DOWN', 'GEAR DOWN', 'Then GND SPLRS ARM.', { who: 'PM' }),
    S('FLAPS/FLAPS', '3', 'FLAPS 3', '', { who: 'PM' }),
    S('FLAPS/FLAPS', 'FULL', 'FLAPS FULL', 'Landing checklist.', { who: 'PM' })
  ];
  var RETARD = S('THR/Thrust lever 1', 'IDLE', 'RETARD — IDLE', '', { who: 'PF', after: [['THR/Thrust lever 2', { cur: 3 }], ['FCU/A/THR', { lo: false }]] });

  var PRACTICE = [
    {
      id: 'p-ils', from: 'appr', pre: IN_APPR, title: 'ILS CAT I — practise', phase: 'Approach',
      steps: [
        S('EFISL/LS', true, 'LS — ON', 'Both pilots: ILS scales on the PFD.'),
        S('MCDU1/RAD\nNAV', 'press', 'RAD NAV — ILS checked', 'ILS frequency, ident and course match the chart. Identify on the PFD.'),
        S('MCDU1/PERF', 'press', 'ACTIVATE APPR PHASE', '', { who: 'PM' }),
        S('FCU/APPR', true, 'APPR', 'On an intercept heading with the approach clearance. FMA: G/S and LOC blue, CAT 1 (or better).', { who: 'PF' }),
        C('LOC* then LOC — G/S* then G/S', 'PF reads the FMA changes, PM confirms ("Checked").'),
        S('FCU/ALT knob', 'press', 'Go-around altitude — set', 'Once G/S is captured: set the missed approach altitude on the FCU.', { who: 'PF' })
      ].concat(CONFIG, [
        C('1000 ft — "Stabilised"', ''),
        C('"Minimum" — "Continue"', ''),
        S('CONSL/Takeover pushbutton', 'press', 'AP — OFF', 'Manual landing: takeover pushbutton on the sidestick.', { who: 'PF', after: [['FCU/AP1', { lo: false }], ['FCU/AP2', { lo: false }]] }),
        RETARD
      ])
    },
    {
      id: 'p-lvo', from: 'appr', pre: IN_APPR, title: 'CAT III autoland — practise', phase: 'Approach',
      steps: [
        S('EFISL/LS', true, 'LS — ON'),
        S('EFISR/LS', true, 'LS — ON'),
        S('MCDU1/PERF', 'press', 'PERF APPR — RADIO DH', 'Enter the RADIO minimum (DH from the chart, or NO for no DH).'),
        S('FCU/APPR', true, 'APPR', '', { who: 'PF' }),
        S('FCU/AP2', true, 'AP2 — ON', 'Second autopilot: available once APPR is armed. FMA shows CAT 3 DUAL with both APs and A/THR.', { who: 'PF' }),
        C('FMA: CAT 3 DUAL, DH (or NO DH) — checked', 'PF announces the capability and minimum; PM crosschecks against the briefing.')
      ].concat(CONFIG, [
        C('400 ft RA: LAND', 'LAND green on the FMA. If LAND does not appear: no autoland ◆.'),
        C('Alert height 100 ft', 'CAT 3 DUAL: below the AH a single failure does not need a go-around.'),
        C('About 40 ft: FLARE', ''),
        C('"Minimum" — "Land" (or "Go around – flaps")', 'With a DH: decide at the "Minimum" callout. No DH: continue unless the AUTO LAND light comes on.'),
        S('THR/Thrust lever 1', 'IDLE', 'RETARD — IDLE', '"RETARD" at 10 ft RA in autoland.', { who: 'PF', after: [['THR/Thrust lever 2', { cur: 3 }], ['FCU/A/THR', { lo: false }]] }),
        C('ROLL OUT — "Spoilers" — "Reverse green" — "Decel"', 'The AP keeps the centreline on the localiser.'),
        S('CONSL/Takeover pushbutton', 'press', 'AP — OFF', 'Disconnect the APs at taxi speed, before leaving the runway: takeover pushbutton on the sidestick.', { who: 'PF', after: [['FCU/AP1', { lo: false }], ['FCU/AP2', { lo: false }]] })
      ])
    },
    {
      id: 'p-rnav', from: 'appr', pre: IN_APPR, title: 'RNAV (GNSS) FINAL APP — practise', phase: 'Approach',
      steps: [
        S('EFISL/LS', false, 'LS — OFF', 'No LS for a FINAL APP approach.'),
        S('MCDU1/PROG', 'press', 'PROG — GPS PRIMARY, RNP 0.3', 'REQUIRED 0.3 NM ◆ and ACCUR HIGH. GPS PRIMARY on both NDs.'),
        S('MCDU1/F-PLN', 'press', 'F-PLN — approach checked', 'Approach not modified between the FAF and the MAP: waypoints, altitudes and the FPA against the chart.'),
        S('MCDU1/PERF', 'press', 'PERF APPR — BARO minimum', 'MDA + add-on as DA (CDFA) ◆, or the LNAV/VNAV DA.'),
        S('FCU/APPR', true, 'APPR', 'FMA: APP NAV (green), FINAL (blue).', { who: 'PF' })
      ].concat(CONFIG, [
        C('FDP: FINAL APP engages', 'FMA FINAL APP green. The aircraft starts down on the FMS vertical path.'),
        S('FCU/ALT knob', 'press', 'Go-around altitude — set', 'Once FINAL APP is engaged and below the missed approach altitude.', { who: 'PF' }),
        C('Monitor: V/DEV, XTK, GPS PRIMARY', 'Go around if XTK exceeds 0.3 NM, V/DEV is excessive (½ dot ◆) or GPS PRIMARY is lost on both NDs.'),
        C('"Minimum" — "Continue"', ''),
        S('CONSL/Takeover pushbutton', 'press', 'AP — OFF', 'At or before the minimum: takeover pushbutton on the sidestick.', { who: 'PF', after: [['FCU/AP1', { lo: false }], ['FCU/AP2', { lo: false }]] }),
        RETARD
      ])
    },
    {
      id: 'p-fls', from: 'appr', pre: IN_APPR, title: 'FLS — practise', phase: 'Approach',
      steps: [
        S('EFISL/LS', true, 'LS — ON (FLS)', 'For an FLS approach the LS pushbutton shows the FLS beam: F-LOC and F-G/S scales.'),
        S('EFISR/LS', true, 'LS — ON'),
        C('FLS data on the PFD vs chart', 'FLS ident, course and slope. Course ±1°, overlay ±3°, slope ±0.1°: outside these, the FLS must not be used.'),
        C('Capability: F-APP / F-APP + RAW / RAW ONLY', 'F-APP + RAW: show the raw data needles. RAW ONLY: the FLS must not be used.'),
        S('MCDU1/PERF', 'press', 'PERF APPR — BARO minimum', ''),
        S('FCU/APPR', true, 'APPR', 'FMA: F-G/S and F-LOC blue (LOC and F-G/S for a localiser approach).', { who: 'PF' }),
        C('F-LOC* then F-LOC — F-G/S* then F-G/S', '')
      ].concat(CONFIG, [
        S('FCU/ALT knob', 'press', 'Go-around altitude — set', '', { who: 'PF' }),
        C('"Minimum" — "Continue"', ''),
        S('CONSL/Takeover pushbutton', 'press', 'AP — OFF', 'Takeover pushbutton on the sidestick.', { who: 'PF', after: [['FCU/AP1', { lo: false }], ['FCU/AP2', { lo: false }]] }),
        RETARD
      ])
    },
    {
      id: 'p-sel', from: 'appr', pre: IN_APPR, title: 'Selected NPA (TRK-FPA) — practise', phase: 'Approach',
      steps: [
        S('EFISL/ADF/VOR 1', 'VOR', 'VOR 1 needle', 'Raw data for the approach on the ND.'),
        S('EFISL/ND MODE', 'VOR', 'ROSE VOR', 'ND in ROSE VOR (or ARC with the needles).'),
        S('MCDU1/PERF', 'press', 'PERF APPR — BARO minimum', 'MDA + add-on as DA (CDFA) ◆.')
      ].concat(CONFIG, [
        C('Landing configuration and VAPP before the FDP', 'Early stabilised technique for a selected approach.'),
        S('FCU/HDG-V/S / TRK-FPA', 'press', 'TRK-FPA', 'The flight path vector (bird) shows on the PFD. FCU windows show TRK and FPA.', { who: 'PF' }),
        S('FCU/HDG knob', 'press', 'Final TRK — pull', 'Set the final approach course corrected for drift, and pull.', { who: 'PF' }),
        S('FCU/V/S knob', 'press', 'FPA −3.0 — pull', 'About 0.3 NM before the FDP for a 3° path ◆. FMA: FPA green. Check −3.0 in FPA, not V/S.', { who: 'PF' }),
        S('FCU/ALT knob', 'press', 'Go-around altitude — set', 'Once descending below the missed approach altitude.', { who: 'PF' }),
        C('Distance / altitude checks', 'PM calls the check heights each mile; PF adjusts the FPA to regain the path.', { who: 'PM' }),
        C('"Minimum" — "Continue"', 'No level-off at the MDA: continue only with the visual reference, otherwise go around.'),
        S('CONSL/Takeover pushbutton', 'press', 'AP — OFF', 'Takeover pushbutton on the sidestick.', { who: 'PF', after: [['FCU/AP1', { lo: false }], ['FCU/AP2', { lo: false }]] }),
        RETARD
      ])
    }
  ];

  // Names for controls whose panel legend alone is unclear (the fuel pumps are just 1 and 2).
  var LABELS = {};
  FUEL.forEach(function (f) { LABELS[f[0]] = f[1]; });
  LABELS['THR/Thrust lever 1'] = 'Thrust levers';

  window.NP_FLOWS = { INITIAL: INITIAL, FLOWS: FLOWS, PRACTICE: PRACTICE, LABELS: LABELS };
})();
