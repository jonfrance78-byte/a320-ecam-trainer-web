/* A320 Normal Procedures: approach guides.
 *
 * Technique, FMA sequence, callouts and discontinue criteria for each approach type,
 * summarised from Airbus A320 family FCOM (PRO-NOR-SOP, DSC-22) and FCTM material.
 * ◆ marks values or practices set by the operator or the approval (Jet2 OM-A/B/C):
 * check them there. Inline markup: [g:..] green (engaged), [b:..] blue (armed),
 * [c:..] cyan, [m:..] magenta, [a:..] amber, [w:..] white.
 *
 * Blocks: { p } paragraph, { h } subheading, { list }, { table: { cols, rows } },
 * { seq: [[when, action, FMA or check]] }, { warn } caution box.
 */
(function () {
  'use strict';

  var STAB = { table: { cols: ['Stabilised by 1000 ft AAL ◆', 'Criteria'], rows: [
    ['Speed', 'VAPP −5 / +10 kt'],
    ['Path', 'On the lateral and vertical path (LOC/G/S within 1 dot, V/DEV and XTK within limits)'],
    ['Configuration', 'Landing configuration, landing checklist complete'],
    ['Rate of descent', 'Not more than 1000 ft/min unless briefed (steep approach)'],
    ['Thrust', 'Stabilised, above idle'],
    ['If not stabilised', 'Go around. 500 ft AAL is the last gate in VMC for some operators ◆']
  ] } };

  var PM_CALLS = { table: { cols: ['PM callout', 'When (below 1000 ft)'], rows: [
    ['"SPEED"', 'Speed below VAPP −5 kt or above VAPP +10 kt'],
    ['"SINK RATE"', 'V/S more than 1000 ft/min'],
    ['"BANK"', 'Bank more than 7°'],
    ['"PITCH"', 'Pitch more than 10° nose up, or less than −2.5°'],
    ['"LOC" / "GLIDE SLOPE"', 'LOC more than ½ dot, G/S more than 1 dot (ILS)'],
    ['"COURSE" / "V/DEV"', 'XTK or V/DEV beyond the approach limits (FINAL APP, FLS)']
  ] } };

  var APPROACHES = [
    /* ---------------------------------------------------------------- 2D / 3D */
    {
      id: 'types', title: '2D and 3D approaches', short: 'How approaches are classified, and which Airbus guidance flies each one.',
      tags: ['Concepts'],
      tabs: [
        { t: 'Classification', blocks: [
          { p: 'ICAO classifies an instrument approach by its guidance (2D or 3D) and by its minima (Type A or Type B). The Airbus guidance mode used to fly it is a separate choice.' },
          { table: { cols: ['', '2D approach', '3D approach'], rows: [
            ['Guidance', 'Lateral only', 'Lateral and vertical'],
            ['Minimum', 'MDA/MDH (flown as a DA in CDFA ◆)', 'DA/DH'],
            ['Examples', 'LOC only, VOR, NDB, RNP APCH to LNAV minima', 'ILS, GLS, RNP APCH to LNAV/VNAV or LPV minima, RNP AR'],
            ['Type', 'Type A (MDH or DH at or above 250 ft)', 'Type A (≥ 250 ft) or Type B (< 250 ft: CAT I, II, III)']
          ] } },
          { h: 'Continuous descent final approach (CDFA)' },
          { list: [
            'Every 2D approach is flown as a CDFA: a constant descent from the FAF (or FDP) to the minimum, with no level-off at the MDA.',
            'The MDA is used as a DA. EASA operators add an add-on (typically 50 ft) to the MDA unless the approval says otherwise ◆.',
            'At the DA without the required visual reference: go around. Do not descend below it, and do not level off to look for the runway.'
          ] }
        ] },
        { t: 'Guidance modes', blocks: [
          { p: 'Which A320 guidance can fly each approach type. Check the operator\'s approvals and the FCOM PRO-NOR-SOP-18 approach tables before use ◆.' },
          { table: { cols: ['Approach', 'Lateral / vertical guidance', 'Notes'], rows: [
            ['ILS', '[g:LOC] / [g:G/S] (APPR pb)', 'CAT I to CAT III. Autoland possible.'],
            ['LOC only', '[g:LOC] / [g:F-G/S] with FLS, or LOC / FPA', 'FLS gives a vertical path for a localiser approach.'],
            ['VOR, NDB (in database)', '[g:FINAL APP] or [g:F-LOC] / [g:F-G/S] or TRK / FPA', 'Navaid approaches: monitor the raw data.'],
            ['RNP APCH — LNAV', '[g:FINAL APP] or FLS or NAV / FPA', 'GPS PRIMARY required.'],
            ['RNP APCH — LNAV/VNAV', '[g:FINAL APP] (baro-VNAV)', 'Temperature limit on the chart.'],
            ['RNP AR', '[g:FINAL APP]', 'Separate approval and procedures, not covered here.'],
            ['Not in database, or coding doubtful', 'TRK / FPA (selected)', 'See Selected NPA.']
          ] } }
        ] },
        { t: 'Choosing the mode', blocks: [
          { seq: [
            ['Approach is an ILS', 'Fly the ILS (LOC/G/S).', 'LS pb ON'],
            ['Approach is in the database and not modified', 'Managed: FINAL APP, or FLS if the aircraft has it and the approach suits it.', 'Check the coding against the chart'],
            ['FLS data outside tolerance, or RAW ONLY', 'Do not use the FLS. Use FINAL APP where applicable, TRK-FPA with raw data, or another approach.', ''],
            ['GPS PRIMARY lost (both NDs), or coding error', 'Selected guidance: TRK-FPA with raw data, if the approach is navaid based.', 'RNAV approach: not available'],
            ['No suitable guidance', 'Choose another approach or runway, or divert.', '']
          ] }
        ] }
      ]
    },
    /* ---------------------------------------------------------------- ILS */
    {
      id: 'ils', title: 'ILS CAT I', short: 'Precision approach to a DA, manual landing. The baseline for every approach.', practise: 'p-ils',
      tags: ['3D', 'Type B', 'LOC / G/S'],
      tabs: [
        { t: 'Prepare', blocks: [
          { list: [
            'RAD NAV: ILS frequency, course and ident from the database, checked against the chart.',
            'PERF APPR: QNH, temperature, wind, BARO minimum (DA), landing configuration. VAPP = VLS + the greater of 5 kt or ⅓ of the headwind component (wind correction up to 15 kt).',
            'F-PLN: approach and missed approach; check the go-around altitude and the first turn.',
            'Autobrake LO or MED from the landing performance ◆.',
            'Brief: threats, approach and minimum, missed approach, landing configuration, taxi.'
          ] },
          { h: 'FMA you expect' },
          { p: '[b:G/S] and [b:LOC] armed after APPR, then [g:LOC*] → [g:LOC], [g:G/S*] → [g:G/S]. Column 4 shows the approach capability: [w:CAT 1] (or CAT 2 / CAT 3 if the aircraft status allows).' }
        ] },
        { t: 'Fly', blocks: [
          { p: 'Decelerated approach (FCTM standard for ILS): the aircraft slows down on the final approach and is stabilised at VAPP in landing configuration by 1000 ft AAL. Check the Jet2 configuration gates ◆.' },
          { seq: [
            ['Descent / DECEL pseudo waypoint', 'Approach phase activates (or ACTIVATE APPR PHASE on PERF). Managed speed targets green dot.', 'Speed target magenta'],
            ['Cleared for the approach, intercept heading', 'PM: LS ON (both). PF: APPR pb. Two APs only for CAT II/III.', '[b:G/S] [b:LOC] · [w:CAT 1]'],
            ['Localiser capture', 'Check the ILS ident on the PFD and the course.', '[g:LOC*] → [g:LOC]'],
            ['Green dot', 'FLAPS 1.', 'Target S'],
            ['Before the FAF / G/S intercept', 'FLAPS 2. Gear down. GND SPLRS ARM. NOSE light as required.', 'Target F after CONF 3'],
            ['Glide slope capture', 'Set the go-around altitude on the FCU. Crosscheck the altitude at the FAF / outer marker.', '[g:G/S*] → [g:G/S]'],
            ['Down the glide slope', 'FLAPS 3, then FLAPS FULL. Landing checklist.', 'Target VAPP'],
            ['1000 ft AAL', '"One thousand" — PM: "Stabilised" (or go around).', 'Stabilisation gate'],
            ['100 above', 'Auto callout. PF looks for the visual reference.', ''],
            ['DA — "Minimum"', 'Visual: "Continue". Not visual: "Go around – flaps".', ''],
            ['After "Continue"', 'AP OFF for the manual landing, at or above the minimum use height in FCOM LIM-AFS ◆.', '[g:LAND] below 400 ft RA'],
            ['30 ft RA (about)', 'Flare: bring the thrust levers to idle at the "RETARD" callout (20 ft).', '[g:FLARE]'],
            ['Touchdown', 'De-rotate, reverse as required. PM: "Spoilers", "Reverse green", "Decel", "70 knots" (idle reverse).', '']
          ] }
        ] },
        { t: 'Callouts', blocks: [STAB, PM_CALLS] },
        { t: 'Discontinue', blocks: [
          { list: [
            'Not stabilised at 1000 ft AAL (or the operator\'s VMC gate) ◆.',
            'No required visual reference at the DA.',
            'Excessive LOC or G/S deviation, or loss of the ILS signal, without visual reference.',
            'Glide slope captured from a side lobe (the FAF altitude check does not agree).',
            'Any doubt about the approach clearance, the runway or the aircraft state.'
          ] },
          { h: 'Glide slope from above' },
          { list: [
            'Arm APPR, then set the FCU altitude above the aircraft to avoid an altitude capture.',
            'Descend in V/S (up to about −1500 ft/min ◆) or OP DES, with the configuration and speed that allow the capture.',
            'After [g:G/S*]: reset the FCU altitude to the go-around altitude.',
            'Not stabilised by 1000 ft: go around.'
          ] }
        ] }
      ]
    },
    /* ---------------------------------------------------------------- LVO */
    {
      id: 'lvo', title: 'Low visibility: CAT II and CAT III', short: 'Autoland approaches to a radio DH or no DH, under LVP.', practise: 'p-lvo',
      tags: ['3D', 'Type B', 'CAT II / III', 'Autoland'],
      tabs: [
        { t: 'Categories', blocks: [
          { p: 'Typical EASA values. The minima to use are those on the chart and in the Jet2 OM-A/C for the crew and aircraft approval ◆.' },
          { table: { cols: ['Operation', 'DH', 'RVR (lowest)', 'FMA capability'], rows: [
            ['CAT I', '≥ 200 ft (BARO)', '550 m', 'CAT 1'],
            ['CAT II', '100 to < 200 ft (RADIO)', '300 m', 'CAT 2 (one or two APs)'],
            ['CAT IIIA (fail-passive)', '< 100 ft, at least 50 ft for the A320 ◆', '200 m', 'CAT 3 SINGLE'],
            ['CAT IIIB (fail-operational)', '< 50 ft or no DH', '75 m', 'CAT 3 DUAL (both APs, A/THR)']
          ] } },
          { h: 'Fail-passive and fail-operational' },
          { list: [
            'Fail-passive (CAT 3 SINGLE): a failure disconnects the AP without a significant out-of-trim. The crew takes over or goes around, so a DH is required.',
            'Fail-operational (CAT 3 DUAL): after a single failure below the alert height the autoland continues. Alert height 100 ft RA.',
            'The FMA capability reflects the aircraft status only. It does not include ground equipment, the crew qualification or the airport\'s LVP.'
          ] }
        ] },
        { t: 'Prepare', blocks: [
          { list: [
            'LVP in force at the destination. Crew qualified, aircraft approved, RVRs (TDZ, MID, END) at or above the minima.',
            'Aircraft capability: ECAM STATUS and INOP SYS for CAT 2 / CAT 3 SINGLE / CAT 3 DUAL. Required equipment in the FCOM / QRH LVO table ◆.',
            'PERF APPR: RADIO minimum (DH, or NO for no DH). The BARO minimum is not used.',
            'Seat at the eye reference position. Landing lights as required (they can dazzle in fog).',
            'Fuel: holding and the alternate (the destination can go below the minima).',
            'LVO briefing: minima and DH, AH, autoland, the failure and downgrade policy, the go-around, the taxi route under LVP.'
          ] },
          { h: 'Task sharing' },
          { p: 'Approaching the DH the PF looks out for the visual reference while the PM stays head-down, monitoring the FMA, the deviations and the callouts. Check the Jet2 LVO task sharing ◆.' }
        ] },
        { t: 'Fly', blocks: [
          { seq: [
            ['Intercept, cleared for the approach', 'LS ON. APPR, then AP2: both APs engaged. A/THR active.', '[b:G/S] [b:LOC] · [w:CAT 3] [w:DUAL]'],
            ['Capability', 'PF announces the capability and the DH; PM crosschecks against the briefing.', 'e.g. CAT 3 DUAL · DH 50 or NO DH'],
            ['Configuration', 'As for the ILS: stabilised at VAPP in landing configuration by 1000 ft. Landing checklist.', ''],
            ['400 ft RA', 'LAND mode. If LAND does not appear: no autoland ◆.', '[g:LAND]'],
            ['Below 200 ft', 'Watch for the red AUTO LAND light: go around unless visual.', ''],
            ['100 ft RA (CAT 3 DUAL)', 'Alert height. Below it, a single failure does not need a go-around.', ''],
            ['About 40 ft RA', 'Flare.', '[g:FLARE]'],
            ['DH — "Minimum"', 'Visual reference: "Land". Not visual: "Go around – flaps". No DH: continue unless the AUTO LAND light comes on.', ''],
            ['10 ft RA', '"RETARD": thrust levers to idle.', ''],
            ['Touchdown', 'AP keeps the runway centreline. Reverse, decel callouts.', '[g:ROLL OUT]'],
            ['Taxi speed', 'AP OFF before leaving the runway. Follow the LVP taxi routing.', '']
          ] }
        ] },
        { t: 'Failures', blocks: [
          { table: { cols: ['Height', 'A failure or downgrade', 'Action'], rows: [
            ['Above 1000 ft AAL', 'Downgrade of the capability (e.g. CAT 3 DUAL → CAT 3 SINGLE)', 'Check the new capability against the RVR and the approval, set the new DH, re-brief. Continue if within the new minima.'],
            ['1000 ft to the AH / DH', 'Downgrade, or an amber caution affecting the approach', 'Go around unless the operator policy allows continuing with the new minima already briefed ◆.'],
            ['Below the AH (CAT 3 DUAL)', 'Single failure', 'Continue the autoland.'],
            ['Below 200 ft RA', 'AUTO LAND light (red)', 'Go around, unless the visual reference is enough to land.']
          ] } },
          { h: 'AUTO LAND light' },
          { p: 'Flashes red in autoland below 200 ft RA when both APs disconnect, the LOC deviation is excessive (¼ dot above 15 ft), the G/S deviation is excessive (1 dot above 100 ft), the LOC or G/S signal is lost, or the radio altimeters disagree by more than 15 ft.' }
        ] }
      ]
    },
    /* ---------------------------------------------------------------- RNAV */
    {
      id: 'rnav', title: 'RNAV (GNSS) — FINAL APP', short: 'RNP APCH to LNAV or LNAV/VNAV minima, flown in managed guidance.', practise: 'p-rnav',
      tags: ['2D or 3D', 'RNP APCH', 'FINAL APP'],
      tabs: [
        { t: 'Requirements', blocks: [
          { table: { cols: ['Item', 'Requirement'], rows: [
            ['Database', 'Approach from the navigation database, not modified between the FAF and the MAP (laterally or vertically).'],
            ['Position', 'GPS PRIMARY. RNP 0.3 NM on PROG ◆, ACCUR HIGH.'],
            ['Equipment (PRO-SPO-51)', '1 FMGC, 1 GPS, 2 IRS, 1 MCDU, 1 FD, 1 PFD on the PF side, 2 NDs, 2 FCU channels. Same list for FINAL APP, NAV-FPA and TRK-FPA RNAV (GNSS) approaches.'],
            ['LNAV/VNAV', 'Local QNH (no remote setting). OAT at or above the chart minimum temperature, otherwise use the LNAV minima.'],
            ['Minimum', 'LNAV: MDA + add-on as DA (CDFA) ◆. LNAV/VNAV: DA.'],
            ['Not covered', 'RNP AR: separate approval. Its XTK 1 × RNP go-around criterion does not apply here.']
          ] } }
        ] },
        { t: 'Prepare', blocks: [
          { list: [
            'F-PLN: check every approach waypoint, altitude constraint and the FPA at the FDP against the chart. Do not modify the final approach.',
            'PROG: REQUIRED 0.3, ACCUR HIGH, GPS PRIMARY.',
            'PERF APPR: BARO minimum. Landing configuration.',
            'LS pushbutton OFF. ND in ARC or ROSE NAV, range to show the approach.',
            'Raw data navaids as a crosscheck where available.',
            'Cold weather: the FMS path is not temperature compensated. LNAV/VNAV below the chart temperature: fly the LNAV minima. Corrections to the published altitudes are coordinated with ATC.'
          ] }
        ] },
        { t: 'Fly', blocks: [
          { seq: [
            ['Approach phase', 'Activated at the DECEL point or manually.', ''],
            ['Cleared for the approach', 'PF: APPR pb. NAV must be engaged.', '[g:APP NAV] [b:FINAL]'],
            ['Before the FDP', 'Configure early: landing configuration and VAPP by the FDP is recommended ◆. Landing checklist.', ''],
            ['FDP', 'FINAL APP engages and the aircraft follows the FMS vertical path.', '[g:FINAL APP]'],
            ['Below the missed approach altitude', 'Set the go-around altitude on the FCU.', ''],
            ['Final', 'Monitor the V/DEV (brick on the PFD), the XTK on the ND and GPS PRIMARY.', 'V/DEV, XTK'],
            ['1000 ft AAL', '"Stabilised".', ''],
            ['DA — "Minimum"', 'Visual: "Continue", AP OFF at or before the minimum. Not visual: "Go around – flaps".', '']
          ] }
        ] },
        { t: 'Discontinue', blocks: [
          { table: { cols: ['Condition', 'Action'], rows: [
            ['GPS PRIMARY LOST on one ND', 'Continue: the other side still has GPS PRIMARY.'],
            ['GPS PRIMARY LOST on both NDs', 'Go around.'],
            ['NAV ACCUR DOWNGRAD / FM accuracy LOW', 'Go around (or do not start the approach).'],
            ['XTK more than 0.3 NM', 'Go around.'],
            ['V/DEV excessive (about ½ dot ◆)', 'Go around unless visual.'],
            ['FINAL APP does not engage, or reverts', 'Go around, or continue in selected modes only if briefed and the approach allows it.'],
            ['Equipment below the PRO-SPO-51 list', 'Go around, or do not start the approach.']
          ] } }
        ] }
      ]
    },
    /* ---------------------------------------------------------------- FLS */
    {
      id: 'fls', title: 'FLS', short: 'FMS Landing System: an ILS-like beam built by the FMS for non-precision approaches.', practise: 'p-fls',
      tags: ['2D flown 3D', 'xLS', 'F-LOC / F-G/S'],
      tabs: [
        { t: 'Concept', blocks: [
          { list: [
            'The FMS builds a virtual beam from the database final approach course and slope, anchored at the anchor point. It shows like an ILS on the PFD (LS pushbutton) and is flown in [g:F-LOC] and [g:F-G/S].',
            'Used for non-precision approaches from the database: VOR, NDB, RNAV (GNSS) to LNAV minima. For a localiser approach the lateral mode is the real [g:LOC] with [g:F-G/S] for the vertical path.',
            'The approach is still 2D: the minimum is an MDA used as a DA (CDFA) ◆.',
            'The FLS beam is only as good as the FMS position and the database coding, so both are checked before use.'
          ] }
        ] },
        { t: 'Capability', blocks: [
          { p: 'Shown on the PFD and the FMA once the FLS is selected. Summarised from your FLS card; check the conditions in the FCOM ◆.' },
          { table: { cols: ['Shown', 'Meaning', 'Crew action'], rows: [
            ['[w:F-APP]', 'FLS guidance can be used for the approach.', 'Fly the FLS; monitor.'],
            ['[w:F-APP + RAW]', 'FLS can be used, crosschecked with raw data (navaid-based approach).', 'Show the raw data needles and crosscheck them throughout.'],
            ['[w:RAW ONLY]', 'FLS guidance not available or not reliable.', 'Do not use the FLS. Raw data with TRK-FPA, FINAL APP where applicable, or another approach.']
          ] } },
          { h: 'Beam check against the chart' },
          { table: { cols: ['Check', 'Tolerance'], rows: [
            ['Lateral (course)', '± 1°'],
            ['Overlay', '± 3°'],
            ['Slope', '± 0.1°'],
            ['Outside a tolerance', 'The FLS must not be used. Fall back to TRK-FPA with raw data, FINAL APP where applicable, or another approach.']
          ] } }
        ] },
        { t: 'Fly', blocks: [
          { seq: [
            ['Preparation', 'Approach in the F-PLN, not modified. BARO minimum. Navaids tuned for raw data.', ''],
            ['Before the approach', 'LS ON (both). Check the FLS ident, course and slope against the chart. Check the capability.', '[w:F-APP]'],
            ['Cleared for the approach', 'PF: APPR pb.', '[b:F-G/S] [b:F-LOC]'],
            ['Lateral capture', '', '[g:F-LOC*] → [g:F-LOC]'],
            ['Vertical capture', 'Set the go-around altitude on the FCU.', '[g:F-G/S*] → [g:F-G/S]'],
            ['Final', 'Landing configuration and VAPP, as for the ILS. Monitor the deviations and the raw data (F-APP + RAW).', ''],
            ['DA — "Minimum"', 'Visual: "Continue", AP OFF. Not visual: "Go around – flaps".', '']
          ] }
        ] },
        { t: 'Degradation', blocks: [
          { list: [
            'Capability drops to RAW ONLY: stop using the FLS. Continue only in selected guidance with raw data, if briefed and the approach allows it; otherwise go around.',
            'Raw data and FLS disagree (F-APP + RAW): trust the raw data, go around if the aircraft is not on the published path.',
            'FM position doubtful (NAV ACCUR DOWNGRAD, GPS PRIMARY lost): check the capability; RNAV approach: go around.',
            'Excessive F-LOC or F-G/S deviation without visual reference: go around.'
          ] }
        ] }
      ]
    },
    /* ---------------------------------------------------------------- Selected */
    {
      id: 'sel', title: 'Selected NPA — TRK-FPA', short: 'Raw-data non-precision approach with selected track and flight path angle.', practise: 'p-sel',
      tags: ['2D', 'CDFA', 'TRK-FPA / NAV-FPA'],
      tabs: [
        { t: 'When', blocks: [
          { list: [
            'The approach is not in the database, the coding cannot be verified, or the FLS / FINAL APP cannot be used.',
            'NAV-FPA: managed lateral (NAV) with a selected FPA, where the lateral coding is checked and allowed.',
            'TRK-FPA: fully selected, flown on the raw data (VOR, NDB, DME).'
          ] }
        ] },
        { t: 'Prepare', blocks: [
          { list: [
            'Distance / altitude table from the chart. Find the FDP and the final FPA (usually −3.0°).',
            'BARO minimum: MDA + add-on as DA (CDFA) ◆.',
            'Raw data on the EFIS: VOR or ADF needles, ND in ROSE VOR / ARC.',
            'Brief the descent point lead (about 0.3 NM before the FDP for 3° ◆), the check heights and the missed approach.'
          ] }
        ] },
        { t: 'Fly', blocks: [
          { seq: [
            ['Intermediate approach', 'Landing configuration at VAPP before the FDP (early stabilised). Landing checklist.', ''],
            ['Established inbound', 'HDG-V/S / TRK-FPA pb to TRK-FPA. Set the final course, corrected for drift.', '[g:TRK] · FPV on the PFD'],
            ['Pre-set the FPA', 'Set −3.0 on the V/S-FPA knob, ready to pull.', ''],
            ['Descent point (lead)', 'Pull the FPA.', '[g:FPA]'],
            ['Below the missed approach altitude', 'Set the go-around altitude on the FCU.', ''],
            ['Each check point', 'PM calls the distance and the check altitude. PF adjusts the FPA to regain the profile, then returns to the published angle.', ''],
            ['DA — "Minimum"', 'Visual: "Continue", AP OFF. Not visual: "Go around – flaps". No level-off at the MDA.', '']
          ] }
        ] },
        { t: 'Threats', blocks: [
          { warn: 'V/S or FPA: −3.0 in FPA is a 3° path; the same knob in HDG-V/S gives −300 ft/min. Check TRK-FPA on the FCU, FPA on the FMA and the bird on the PFD.' },
          { list: [
            'Late FPA pull: the aircraft ends up high and steep. Pull on time, or go around if the path cannot be regained.',
            'Drift: the FPV shows the track flown; use it to hold the final course.',
            'Raw data tuning: wrong frequency or no identification.',
            'Cold temperature: published altitudes are too low; apply the corrections ◆.'
          ] }
        ] }
      ]
    },
    /* ---------------------------------------------------------------- GA */
    {
      id: 'ga', title: 'Go-around', short: 'From any approach type: thrust, pitch, flaps, gear, then the missed approach.',
      tags: ['All approaches'],
      tabs: [
        { t: 'Sequence', blocks: [
          { seq: [
            ['Decision', 'PF: thrust levers TOGA. "Go around – flaps".', '[g:MAN TOGA] [g:SRS] [g:GA TRK] · [b:A/THR]'],
            ['Same time', 'Rotate to the SRS pitch (about 15°). PM: flaps one step up.', ''],
            ['PM', '"Go around, flaps" done — reads the FMA. PF confirms.', ''],
            ['Positive climb', 'PM: "Positive climb". PF: "Gear up". PM selects the gear up.', ''],
            ['Above 100 ft', 'Lateral mode as required: NAV for the published missed approach.', '[g:NAV]'],
            ['THR RED ALT', 'Thrust levers to CL (LVR CLB flashing). A/THR active.', '[g:THR CLB]'],
            ['ACC ALT', 'Speed target increases. Retract the flaps on schedule (F, S).', ''],
            ['Clean', 'After take-off / climb checklist items as required. Plan the next approach or the diversion.', '']
          ] },
          { h: 'Notes' },
          { list: [
            'Check the FCU altitude: the go-around altitude was set during the approach.',
            'The GO AROUND phase is active. For a new approach: ACTIVATE APPR PHASE on the PERF GO AROUND page.',
            'Soft go-around, where installed: TOGA, then back to FLX/MCT for a reduced thrust go-around ◆.'
          ] }
        ] }
      ]
    }
  ];

  var GLOSSARY = [
    ['AAL', 'Above aerodrome level (Jet2: ARTE, above runway threshold elevation)'], ['AH', 'Alert height'], ['A/THR', 'Autothrust'],
    ['CDFA', 'Continuous descent final approach'], ['DA / DH', 'Decision altitude / height'], ['FAF', 'Final approach fix'],
    ['FDP', 'Final descent point'], ['FLS', 'FMS landing system'], ['FMA', 'Flight mode annunciator'], ['FPA', 'Flight path angle'],
    ['FPV', 'Flight path vector (the bird)'], ['LVP', 'Low visibility procedures'], ['MAP', 'Missed approach point'],
    ['MDA / MDH', 'Minimum descent altitude / height'], ['RNP APCH', 'Required navigation performance approach'],
    ['THR RED / ACC ALT', 'Thrust reduction / acceleration altitude'], ['V/DEV', 'Vertical deviation from the FMS path'],
    ['VAPP', 'Final approach speed'], ['VLS', 'Lowest selectable speed'], ['XTK', 'Cross-track error']
  ];

  window.NP_APPROACHES = { APPROACHES: APPROACHES, GLOSSARY: GLOSSARY };
})();
