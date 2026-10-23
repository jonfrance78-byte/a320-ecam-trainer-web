/* A320 ECAM Trainer: FMGC behind the two MCDUs.
 * Lateral and vertical flight planning as the FCOM describes it (DSC-22_20,
 * FMS2 Thales): company route or city pair, departure and arrival, waypoint
 * insertion and deletion, discontinuities, the temporary flight plan (TMPY,
 * UNDO), airways, holds, offset, fix info, alternate, ENABLE ALTN, new
 * destination, DIR TO (abeam, radial in/out), overfly, LL crossing, speed
 * limit, speed/altitude/time constraints (RTA, ETT), step climbs/descents,
 * flight phases, POSITION UPDATE AT, and simple predictions.
 * The navigation database is a small training database around Toulouse and
 * Paris: not for navigation. Both MCDUs share one FMGC (one flight plan) and
 * keep their own page and scratchpad. A simple "fly" model moves the aircraft
 * from waypoint to waypoint so sequencing, holds and phases can be seen.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------ geometry */
  var R_NM = 3440.065;
  function rad(d) { return d * Math.PI / 180; }
  function dg(r) { return r * 180 / Math.PI; }
  function n360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function gdist(a, b) {
    var p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon - a.lon), dp = p2 - p1;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function gbrg(a, b) {
    var p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon - a.lon);
    return n360(dg(Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl))));
  }
  function gdest(p, brg, d) {
    var dr = d / R_NM, th = rad(brg), p1 = rad(p.lat), l1 = rad(p.lon);
    var p2 = Math.asin(Math.sin(p1) * Math.cos(dr) + Math.cos(p1) * Math.sin(dr) * Math.cos(th));
    var l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(dr) * Math.cos(p1), Math.cos(dr) - Math.sin(p1) * Math.sin(p2));
    return { lat: dg(p2), lon: dg(l2) };
  }
  // Flat projection (NM) around a reference latitude: enough for intersections.
  var LAT0 = 46.5;
  function xy(p) { return [p.lon * 60 * Math.cos(rad(LAT0)), p.lat * 60]; }
  function ll(q) { return { lat: q[1] / 60, lon: q[0] / 60 / Math.cos(rad(LAT0)) }; }
  function dir(brg) { return [Math.sin(rad(brg)), Math.cos(rad(brg))]; }
  // Intersection of segment a-b with the line p + t*d (t in [t0, t1]): [u along a-b, t] or null.
  function segLine(a, b, p, d, t0, t1) {
    var A = xy(a), B = xy(b), P = xy(p), ex = B[0] - A[0], ey = B[1] - A[1];
    var den = ex * d[1] - ey * d[0];
    if (Math.abs(den) < 1e-9) return null;
    var wx = P[0] - A[0], wy = P[1] - A[1];
    var u = (wx * d[1] - wy * d[0]) / den, t = (wx * ey - wy * ex) / den;
    if (u < 0 || u > 1 || t < t0 || t > t1) return null;
    return [u, t];
  }
  function lerpPos(a, b, u) { var A = xy(a), B = xy(b); return ll([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u]); }
  // Foot of the perpendicular from p onto segment a-b: [u, cross distance].
  function project(a, b, p) {
    var A = xy(a), B = xy(b), P = xy(p), ex = B[0] - A[0], ey = B[1] - A[1], L2 = ex * ex + ey * ey;
    if (!L2) return [0, Math.hypot(P[0] - A[0], P[1] - A[1])];
    var u = ((P[0] - A[0]) * ex + (P[1] - A[1]) * ey) / L2;
    return [u, Math.hypot(A[0] + ex * u - P[0], A[1] + ey * u - P[1])];
  }

  /* ---------------------------------------------- training nav database */
  // Not for navigation: positions are approximate and the procedures are made up.
  var APT = {
    LFBO: { name: 'TOULOUSE BLAGNAC', lat: 43.629, lon: 1.364, elev: 499, ta: 5000, rwys: { '14L': 143, '14R': 143, '32L': 323, '32R': 323 } },
    LFPO: { name: 'PARIS ORLY', lat: 48.723, lon: 2.379, elev: 291, ta: 5000, rwys: { '06': 62, '24': 242, '26': 257 } },
    LFPG: { name: 'PARIS CHARLES DE GAULLE', lat: 49.010, lon: 2.548, elev: 392, ta: 5000, rwys: { '09L': 86, '27R': 266 } },
    LFOB: { name: 'BEAUVAIS TILLE', lat: 49.454, lon: 2.113, elev: 359, ta: 5000, rwys: { '12': 123, '30': 303 } },
    LFBD: { name: 'BORDEAUX MERIGNAC', lat: 44.828, lon: -0.716, elev: 162, ta: 5000, rwys: { '05': 48, '23': 228 } }
  };
  var NAV = {
    TOU: [43.680, 1.310, 'VOR'], FISTO: [43.400, 1.150], NIRAD: [44.600, 1.150], LMG: [45.816, 1.026, 'VOR'],
    POI: [46.581, 0.299, 'VOR'], ABE: [47.050, 1.250], AMB: [47.429, 1.065, 'VOR'], CDN: [48.065, 1.382, 'VOR'],
    FRZ: [48.300, 1.900], MOLBA: [48.380, 1.620], ODILO: [48.480, 1.860], OKRIX: [48.620, 2.050], OLDAM: [48.672, 2.205],
    RBT: [48.654, 1.995, 'VOR'], ETAMP: [48.380, 2.070], OPRUS: [48.700, 2.680], OBATU: [48.712, 2.520],
    MLN: [48.455, 2.813, 'VOR'], BEROK: [47.900, 2.900], PON: [49.096, 2.036, 'VOR'], AAA: [49.600, 2.600], BVS: [49.430, 2.150, 'VOR'],
    CGN: [49.000, 2.620, 'VOR'], AGN: [43.890, 0.870, 'VOR'], BMC: [44.830, -0.520, 'VOR']
  };
  var AWY = { UB19: ['TOU', 'NIRAD', 'LMG', 'AMB', 'CDN', 'PON'], UB25: ['POI', 'BEROK', 'AAA'], UN460: ['AGN', 'TOU'], UM616: ['BMC', 'POI', 'AMB'] };
  var HOLDS = { ODILO: [76, 'L', 1.0], RBT: [60, 'R', 1.0], MLN: [257, 'R', 1.0], LMG: [5, 'R', 1.5] };
  var ALTNS = { LFPO: ['LFPG', 'LFOB'], LFPG: ['LFPO', 'LFOB'], LFBO: ['LFBD'] };
  // Legs: 'ID' (to fix), 'VA:crs:alt' (heading to altitude), 'VM:crs' (MANUAL),
  // 'CF:ID:crs' (course to fix), 'AF:ID' (DME arc), 'RF:ID' (radius to fix),
  // 'HF:ID' / 'HA:ID:alt' (database holds flown automatically), 'HM:ID'.
  // Then constraints: @5000 (at), +5000 (at or above), -FL100 (at or below), s220 (speed).
  var SID = {
    LFBO: {
      LMG5B: { rwys: ['32L', '32R'], legs: ['VA:323:1500', 'CF:NIRAD:340 +FL070', 'LMG'], trans: { POI: ['POI'] } },
      LMG5A: { rwys: ['14L', '14R'], legs: ['VA:143:1500', 'FISTO -FL060 s250', 'TOU', 'NIRAD', 'LMG'], trans: { POI: ['POI'] } },
      POI6M: { rwys: ['32L', '32R'], legs: ['VA:323:2000', 'VM:300'], trans: {} }
    }
  };
  var STAR = {
    LFPO: {
      MOLBA1W: { rwys: ['06', '24', '26'], legs: ['CDN -FL150', 'MOLBA +FL090 s250', 'ODILO @FL070'], trans: { AMB: ['AMB', 'CDN'] } },
      BEROK1E: { rwys: ['24', '26', '06'], legs: ['BEROK -FL170', 'MLN @FL080 s250', 'HF:MLN'], trans: {} }
    },
    LFPG: { PON1C: { rwys: ['09L', '27R'], legs: ['PON @FL080'], trans: {} } }
  };
  var APPR = {
    LFPO: {
      ILS06: { rwy: '06', ils: 'OLN/108.50', legs: ['OKRIX @3000 s220', 'OLDAM @2000 s180'], miss: ['VA:062:1500', 'RBT @3000', 'HM:RBT'], vias: { ODILO: ['ODILO', 'AF:OKRIX'] } },
      ILS26: { rwy: '26', ils: 'ORE/110.30', legs: ['OPRUS @3000 s220', 'OBATU @2000 s180'], miss: ['VA:257:1500', 'MLN @3000', 'HM:MLN'], vias: { MLN: ['MLN', 'RF:OPRUS'], ETAMP: ['ETAMP', 'OPRUS'] } },
      RNV24: { rwy: '24', legs: ['ETAMP @3000', 'OPRUS @2500'], miss: ['VA:242:1500', 'RBT @3000', 'HM:RBT'], vias: {} }
    },
    LFPG: { ILS27R: { rwy: '27R', ils: 'GLE/110.10', legs: ['AAA @4000', 'CGN @3000'], miss: ['VA:266:1500', 'PON @4000', 'HM:PON'], vias: {} } },
    LFOB: { ILS30: { rwy: '30', ils: 'BV/109.70', legs: ['BVS @2500'], miss: ['VA:303:1500', 'BVS @3000', 'HM:BVS'], vias: {} } },
    LFBD: { ILS23: { rwy: '23', legs: ['BMC @3000'], miss: ['VA:228:1500', 'BMC @3000', 'HM:BMC'], vias: {} } }
  };
  // Company routes. route: fixes, or [airway, end fix] after a fix.
  var CORTE = {
    TLSORY1: { from: 'LFBO', to: 'LFPO', rwy: '32L', sid: 'LMG5B', route: ['LMG', ['UB19', 'CDN']], star: 'MOLBA1W', appr: 'ILS06', via: 'ODILO', altn: 'ORYCDG1' },
    TLSORY2: { from: 'LFBO', to: 'LFPO', rwy: '32L', sid: 'LMG5B', trans: 'POI', route: ['POI', 'ABE', 'BEROK'], star: 'BEROK1E', appr: 'ILS26', via: 'MLN', altn: 'ORYBVA1' },
    ORYCDG1: { from: 'LFPO', to: 'LFPG', route: ['PON'], star: 'PON1C', appr: 'ILS27R' },
    ORYBVA1: { from: 'LFPO', to: 'LFOB', route: ['PON', 'BVS'], appr: 'ILS30' },
    ORYTLS1: { from: 'LFPO', to: 'LFBO', route: ['CDN', ['UB19', 'LMG'], 'NIRAD', 'TOU'] }
  };

  /* ------------------------------------------------------------- state */
  var S, SIDES;
  function fresh() {
    S = {
      phase: 'PREFLIGHT', init: { coRte: null, from: null, to: null, flt: null, ci: null, crz: null, tropo: 36090, zfw: null, cg: null, block: null, taxi: 0.2, rsv: 5 },
      act: null, sec: null, tmpy: null,
      ac: { lat: 0, lon: 0, alt: 0, flown: 0, mode: 'NAV', hold: false, immExit: false, fob: null, time: null, gps: true, navArm: false, tofTime: null },
      perf: { v1: null, vr: null, v2: null, flaps: null, flex: null, thrRed: 1500, acc: 1500, qnh: null, temp: null, wind: null, baro: null, radio: null, ldg: 'FULL', clbLim: [250, 10000], desLim: [250, 10000], presel: {} },
      ett: null, pilot: [], brgTo: null, depPicked: false, ilsFreq: null, vor: [null, null], posUpd: null, fixRef: null, simOffset: 0
    };
    SIDES = [side(), side()];
  }
  function side() { return { page: 'MENU', sp: '', msg: null, ctx: {}, scroll: 0, dim: 1 }; }
  function now() { var d = new Date(); return (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds() + S.simOffset) % 86400; }
  function msgAll(m) { SIDES.forEach(function (s) { s.msg = m; }); }

  /* ------------------------------------------------------- leg building */
  function pos(id) {
    if (APT[id]) return { lat: APT[id].lat, lon: APT[id].lon };
    if (NAV[id]) return { lat: NAV[id][0], lon: NAV[id][1] };
    for (var i = 0; i < S.pilot.length; i++) if (S.pilot[i].id === id) return { lat: S.pilot[i].lat, lon: S.pilot[i].lon };
    return null;
  }
  function parseAlt(s) {
    var m = /^FL(\d{2,3})$/.exec(s); if (m) return +m[1] * 100;
    m = /^(\d{3,5})$/.exec(s); return m ? +m[1] : null;
  }
  function wptLeg(id, seg, p) { return { id: id, type: 'TF', lat: p.lat, lon: p.lon, seg: seg }; }
  // Turns a database leg string into legs; prev is the previous positioned leg.
  function mkLegs(spec, seg, prev, elev) {
    var tok = spec.split(' '), f = tok[0].split(':'), L;
    if (f[0] === 'VA') {
      var alt = +f[2], d = Math.max(2, (alt - (prev.alt0 != null ? prev.alt0 : elev)) / 300);
      var p = gdest(prev, +f[1], d);
      L = { id: '(' + alt + ')', type: 'VA', crs: +f[1], lat: p.lat, lon: p.lon, seg: seg, alt0: alt + elev };
    } else if (f[0] === 'VM') {
      var q = gdest(prev, +f[1], 6);
      return [{ id: 'MANUAL', type: 'VM', crs: +f[1], lat: q.lat, lon: q.lon, seg: seg, noPos: true }, { type: 'DISCO', seg: seg, afterManual: true }];
    } else if (f[0] === 'HM' || f[0] === 'HF' || f[0] === 'HA') {
      var h = HOLDS[f[1]] || [Math.round(gbrg(prev, pos(f[1]))), 'R', 1.0], hp = pos(f[1]);
      L = { id: f[0] === 'HM' ? 'HOLD ' + h[1] : f[0] === 'HF' ? 'HOLD ' + h[1] : 'HOLD ' + h[1], type: f[0], lat: hp.lat, lon: hp.lon, seg: seg, fix: f[1], hold: { inb: h[0], turn: h[1], time: h[2], db: true }, haAlt: f[2] ? +f[2] : null };
    } else {
      var id = f[0] === 'CF' || f[0] === 'AF' || f[0] === 'RF' ? f[1] : f[0], pp = pos(id);
      L = wptLeg(id, seg, pp);
      if (f[0] !== id) { L.type = f[0]; if (f[0] === 'CF') L.crs = +f[2]; }
    }
    tok.slice(1).forEach(function (c) {
      if (c[0] === 's') L.spd = +c.slice(1);
      else L.alt = { t: c[0], v: parseAlt(c.slice(1)) };
    });
    return [L];
  }
  function lastPos(legs) { for (var i = legs.length - 1; i >= 0; i--) if (legs[i].type !== 'DISCO' && !legs[i].noPos) return legs[i]; return null; }
  function addSpecs(out, specs, seg, elev) {
    specs.forEach(function (s) {
      var prev = lastPos(out), L = mkLegs(s, seg, prev, elev);
      // The same fix twice in a row (end of one part, start of the next): keep one.
      var tail = out[out.length - 1];
      // A fix straight after its own hold: the hold already ends there.
      if (L[0].type === 'TF' && tail && /^H[FAM]$/.test(tail.type) && tail.fix === L[0].id) { if (L[0].alt) tail.alt = L[0].alt; return; }
      if (L[0].type === 'TF' && prev && tail === prev && prev.id === L[0].id && prev.type !== 'HM') { if (L[0].alt) prev.alt = L[0].alt; if (L[0].spd) prev.spd = L[0].spd; return; }
      out.push.apply(out, L);
    });
  }
  function originLeg(apt, rwy) { var a = APT[apt]; return { id: apt + (rwy || ''), type: 'APT', lat: a.lat, lon: a.lon, seg: 'dep', apt: apt, alt0: a.elev }; }
  function destLeg(apt, rwy, seg) { var a = APT[apt]; return { id: apt + (rwy || ''), type: 'APT', lat: a.lat, lon: a.lon, seg: seg || 'arr', apt: apt, dest: seg !== 'altn', altnApt: seg === 'altn' }; }
  function airwayFixes(awy, from, to) {
    var a = AWY[awy]; if (!a) return null;
    var i = a.indexOf(from), j = a.indexOf(to);
    if (i < 0 || j < 0 || i === j) return null;
    var out = []; for (var k = i; k !== j; k += j > i ? 1 : -1) out.push(a[k + (j > i ? 1 : -1)]);
    return out;
  }
  function routeLegs(route, seg, out) {
    var last = null;
    route.forEach(function (r) {
      if (typeof r === 'string') { out.push(wptLeg(r, seg, pos(r))); last = r; return; }
      (airwayFixes(r[0], last, r[1]) || [r[1]]).forEach(function (id) { var L = wptLeg(id, seg, pos(id)); L.awy = r[0]; out.push(L); });
      last = r[1];
    });
  }
  function depLegs(pl) {
    var out = [], sd = pl.sid && SID[pl.origin] && SID[pl.origin][pl.sid], elev = APT[pl.origin].elev;
    var tmp = [originLeg(pl.origin, pl.rwy)];
    if (sd) addSpecs(tmp, sd.legs.concat(pl.trans && sd.trans[pl.trans] ? sd.trans[pl.trans] : []), 'dep', elev);
    for (var i = 1; i < tmp.length; i++) out.push(tmp[i]);
    return out;
  }
  function arrLegs(pl) {
    var out = [], st = pl.star && STAR[pl.dest] && STAR[pl.dest][pl.star], ap = pl.appr && APPR[pl.dest] && APPR[pl.dest][pl.appr];
    var specs = [];
    if (st) specs = specs.concat(pl.strans && st.trans[pl.strans] ? st.trans[pl.strans] : [], st.legs);
    if (ap && pl.via && ap.vias[pl.via]) specs = specs.concat(ap.vias[pl.via]);
    var seed = [{ lat: APT[pl.dest].lat, lon: APT[pl.dest].lon, type: 'SEED' }];
    addSpecs(seed, specs, 'arr', APT[pl.dest].elev);
    if (ap) { var n0 = seed.length; addSpecs(seed, ap.legs, 'arr', APT[pl.dest].elev); for (var k = n0 - 1; k < seed.length; k++) if (seed[k].type !== 'SEED') seed[k].fin = true; }
    for (var i = 1; i < seed.length; i++) out.push(seed[i]);
    return out;
  }
  function missLegs(pl) {
    var ap = pl.appr && APPR[pl.dest] && APPR[pl.dest][pl.appr], out = [destLeg(pl.dest, ap ? ap.rwy : '')];
    if (ap) addSpecs(out, ap.miss, 'miss', APT[pl.dest].elev);
    return out.slice(1);
  }
  function altnLegs(pl) {
    if (!pl.altn) return [];
    var cr = pl.altnRte && CORTE[pl.altnRte], out = [];
    if (cr) { routeLegs(cr.route, 'altn', out); var tmp = { dest: pl.altn, star: cr.star, appr: cr.appr }; arrLegs(tmp).forEach(function (L) { L.seg = 'altn'; var t = out[out.length - 1]; if (t && t.id === L.id) { if (L.alt) t.alt = L.alt; } else out.push(L); }); }
    var ap = cr && cr.appr && APPR[pl.altn][cr.appr];
    out.push(destLeg(pl.altn, ap ? ap.rwy : '', 'altn'));
    return out;
  }
  // Puts the plan's legs together from its parts (company route or city pair).
  function newPlan(from, to) {
    return { origin: from, dest: to, rwy: null, sid: null, trans: null, star: null, strans: null, appr: null, via: null, altn: null, altnRte: null, offset: null, steps: [], legs: [originLeg(from), { type: 'DISCO', seg: 'enr' }, destLeg(to)] };
  }
  function fromCoRte(name) {
    var c = CORTE[name], pl = newPlan(c.from, c.to);
    pl.coRte = name; pl.rwy = c.rwy || null; pl.sid = c.sid || null; pl.trans = c.trans || null; pl.star = c.star || null; pl.appr = c.appr || null; pl.via = c.via || null;
    var enr = []; routeLegs(c.route, 'enr', enr);
    pl.legs = [originLeg(c.from, pl.rwy)];
    pl.legs = pl.legs.concat(depLegs(pl)); pl.depJoin = pl.legs.length > 1 ? pl.legs[pl.legs.length - 1].id : null; join(pl.legs, enr); join(pl.legs, arrLegs(pl));
    var ap = pl.appr && APPR[pl.dest][pl.appr];
    pl.legs.push(destLeg(pl.dest, ap ? ap.rwy : ''));
    pl.legs = pl.legs.concat(missLegs(pl));
    if (c.altn) { pl.altnRte = c.altn; pl.altn = CORTE[c.altn].to; pl.legs = pl.legs.concat(altnLegs(pl)); }
    return pl;
  }
  // Appends b to a: the same fix at the joint is kept once, otherwise a discontinuity.
  function join(a, b) {
    if (!b.length) return;
    var last = a[a.length - 1];
    if (last && last.type === 'TF' && b[0].type === 'TF' && last.id === b[0].id) { if (b[0].alt) last.alt = b[0].alt; if (b[0].spd) last.spd = b[0].spd; b = b.slice(1); }
    else if (last && last.type !== 'DISCO' && b[0].type !== 'DISCO' && a.length > 1) a.push({ type: 'DISCO', seg: b[0].seg });
    else if (last && last.type !== 'DISCO' && b[0].type !== 'DISCO' && last.type === 'APT') a.push({ type: 'DISCO', seg: b[0].seg });
    a.push.apply(a, b);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function destIdx(pl) { for (var i = 0; i < pl.legs.length; i++) if (pl.legs[i].dest) return i; return pl.legs.length - 1; }
  function primary(pl) { return pl.legs.slice(0, destIdx(pl) + 1); }

  /* --------------------------------------------------------- predictions */
  function gw(fob) { return S.init.zfw != null && fob != null ? S.init.zfw + fob : null; }
  function greenDot(w) { return Math.round(2 * (w || 64) + 85); }
  function optFl(w) { return Math.max(290, Math.min(390, Math.round((350 + (70 - (w || 66)) * 3) / 10) * 10)); }
  function recMax(w) { return Math.min(398, optFl(w) + 20); }
  function econ() {
    var ci = Math.min(S.init.ci || 0, 100);
    return { clb: Math.round(280 + ci * 0.4), mach: Math.round((0.76 + ci * 0.0004) * 100) / 100, des: Math.round(270 + ci * 0.5) };
  }
  function vapp() { var lw = S.init.zfw ? S.init.zfw + 4 : 62; return Math.round(60 + lw * 1.1 + 5); }
  function tasOf(spd, alt) {
    if (spd < 1) { var T = Math.max(216.65, 288.15 - 1.98 * alt / 1000); return spd * 661.47 * Math.sqrt(T / 288.15); }
    return spd * (1 + 0.02 * alt / 1000);
  }
  function crzAt(pl, sDist, steps) {
    var c = S.init.crz || 0;
    steps.forEach(function (st) { if (!st.ignored && st.s != null && sDist >= st.s) c = st.fl; });
    return c;
  }
  // Predictions along the plan from the aircraft: distance, time, speed,
  // altitude and fuel at each leg, and the pseudo waypoints.
  function predict(pl, rtaFactor, tStart) {
    var legs = pl.legs, di = destIdx(pl), ac = S.ac, e = econ();
    var out = { legs: [], pseudo: [], ok: !!S.init.crz && S.init.ci != null };
    var origin = APT[pl.origin], dest = APT[pl.dest];
    // Distances from the aircraft (legs[0] is the FROM waypoint, the aircraft position).
    var s = 0, last = legs[0], pts = [];
    for (var i = 0; i < legs.length; i++) {
      var L = legs[i];
      if (i > 0 && L.type !== 'DISCO' && !L.noPos) { s += gdist(last, L); last = L; }
      if (L.type === 'HF' || L.type === 'HA' || (L.type === 'HM' && i === 1 && ac.hold)) s += 0; // holds add time, not route distance
      out.legs[i] = { s: s };
      if (i === di) { out.dist = s; }
    }
    var total = out.legs[di].s;
    // Climb pass forward, descent pass backward (3°), constraints shaping them.
    var a0 = S.phase === 'PREFLIGHT' ? origin.elev : ac.alt;
    var steps = (pl.steps || []).map(function (st) { return Object.assign({}, st, { s: stepS(pl, st) }); });
    var clb = [], des = [];
    for (i = 0; i <= di; i++) {
      var sp = out.legs[i].s, prevS = i ? out.legs[i - 1].s : 0, c = i ? clb[i - 1] + 330 * (sp - prevS) : a0;
      L = legs[i];
      if (L.alt && L.seg === 'dep' && (L.alt.t === '-' || L.alt.t === '@') && L.alt.v < c && L.alt.v <= (S.init.crz || 0) * 100) c = Math.max(L.alt.v, i ? clb[i - 1] : a0);
      clb[i] = c;
    }
    des[di] = dest.elev + 50;
    for (i = di - 1; i >= 0; i--) {
      var h = des[i + 1] + 318 * (out.legs[i + 1].s - out.legs[i].s); L = legs[i];
      if (L.alt && L.seg !== 'dep' && L.alt.v <= (S.init.crz || 0) * 100) {
        if (L.alt.t === '@') h = L.alt.v; else if (L.alt.t === '-') h = Math.min(h, L.alt.v); else if (L.alt.t === '+') h = Math.max(h, L.alt.v);
      }
      des[i] = h;
    }
    function climbAt(x) { return interp(clb, x); }
    function desAt(x) { return interp(des, x); }
    function interp(arr, x) {
      for (var k = 1; k <= di; k++) if (out.legs[k].s >= x) { var s0 = out.legs[k - 1].s, s1 = out.legs[k].s; return s1 === s0 ? arr[k] : arr[k - 1] + (arr[k] - arr[k - 1]) * (x - s0) / (s1 - s0); }
      return arr[di];
    }
    function altAt(x) { return Math.min(climbAt(x), crzAt(pl, x, steps) * 100 || 99999, desAt(x)); }
    out.altAt = altAt;
    // Pseudo waypoints.
    var crzFt = (S.init.crz || 0) * 100, tc = null, td = null, step = 2;
    if (crzFt && S.phase !== 'DESCENT' && S.phase !== 'APPROACH' && S.phase !== 'GO AROUND') {
      // Top of climb: where the climb meets the cruise level, or the descent path
      // first (a short flight with no cruise: T/C and T/D together).
      var top = null;
      for (var x = 0; x <= total; x += step) { if (climbAt(x) >= Math.min(crzAt(pl, x, steps) * 100, desAt(x)) - 1) { top = x; break; } }
      if (a0 >= crzFt - 50) top = 0;
      if (top != null && climbAt(top) >= crzAt(pl, top, steps) * 100 - 1) {
        tc = a0 >= crzFt - 50 ? null : top;
        for (x = total; x >= top; x -= step) { if (desAt(x) >= crzAt(pl, x, steps) * 100) { td = x; break; } }
      } else if (top != null) { tc = top; td = top; }
    }
    if (tc != null) out.pseudo.push({ id: '(T/C)', s: tc });
    steps.forEach(function (st) {
      st.ignored = st.s == null || (tc != null && st.s < tc) || (td != null && st.s > td - 50);
      if (st.s != null && !st.ignored) out.pseudo.push({ id: st.fl * 100 > crzBefore(pl, st, steps) ? '(S/C)' : '(S/D)', s: st.s, step: st });
    });
    out.steps = steps;
    if (td != null && S.phase !== 'DESCENT') out.pseudo.push({ id: '(T/D)', s: td });
    var fi = -1; for (i = 0; i <= di; i++) if (legs[i].fin) { fi = i; break; }
    var decel = Math.max(0, (fi >= 0 ? out.legs[fi].s - 4 : total - 20));
    if (S.phase !== 'APPROACH' && S.phase !== 'GO AROUND' && S.phase !== 'DONE') out.pseudo.push({ id: '(DECEL)', s: decel });
    out.pseudo.sort(function (a, b) { return a.s - b.s; });
    out.tc = tc; out.td = td; out.decel = decel;
    // Speeds, time and fuel, integrated in short steps.
    var f = rtaFactor || 1, rtaS = pl.rta ? legIdxS(pl, out, pl.rta.id) : null;
    var lim = S.perf.clbLim, dlim = S.perf.desLim, w0 = gw(S.phase === 'PREFLIGHT' ? (S.init.block != null ? S.init.block - S.init.taxi : null) : ac.fob);
    var t = tStart != null ? tStart : S.phase === 'PREFLIGHT' ? Math.max(now(), S.ett || 0) : now(), fob = S.phase === 'PREFLIGHT' ? (S.init.block != null ? S.init.block - S.init.taxi : null) : ac.fob;
    var gd = greenDot(w0), va = vapp(), spdCap = 999;
    function phaseAt(x) {
      if (S.phase === 'GO AROUND' || S.phase === 'APPROACH' || x >= decel) return 'APP';
      if (tc != null && x < tc) return 'CLB';
      if (td != null && x >= td) return 'DES';
      if (tc == null && td == null) return S.phase === 'CRUISE' ? 'CRZ' : x < total / 2 ? 'CLB' : 'DES';
      return 'CRZ';
    }
    function spdAt(x, alt, ph, cap) {
      var v;
      if (ph === 'CLB') v = alt < lim[1] ? Math.min(lim[0], e.clb) : (S.perf.presel.CLB || e.clb);
      else if (ph === 'CRZ') v = pl.cmach && x >= (legIdxS(pl, out, pl.cmach.id) || 0) ? pl.cmach.m : (S.perf.presel.CRZ || e.mach);
      else if (ph === 'DES') v = alt < dlim[1] ? Math.min(dlim[0], e.des) : e.des;
      else { var k = Math.max(0, Math.min(1, (x - decel) / Math.max(1, total - decel))); v = Math.round(gd - (gd - va) * k); }
      if (v >= 1 && alt > 26000 && ph !== 'APP') v = ph === 'DES' ? e.mach : (ph === 'CLB' ? e.mach : v);
      if (v >= 1) v = Math.min(v, cap);
      return v;
    }
    var flow = { CLB: 2800, CRZ: 2300, DES: 700, APP: 1100 };
    var xs = 0, li = 1, ph0 = phaseAt(0), wind = 0;
    out.legs[0].t = t; out.legs[0].alt = a0; out.legs[0].fob = fob; out.legs[0].spd = spdAt(0, a0, ph0, 999);
    for (i = 1; i < legs.length && i <= di; i++) {
      L = legs[i];
      var se = out.legs[i].s;
      // Speed constraints: in climb up to the fix, in descent from the fix on.
      var capHere = spdCap;
      if (L.spd && L.seg === 'dep') capHere = Math.min(capHere, L.spd);
      if (L.wind) wind = L.wind;
      while (xs < se - 1e-6) {
        var dx = Math.min(5, se - xs), xm = xs + dx / 2, alt = altAt(xm), ph = phaseAt(xm);
        var v = spdAt(xm, alt, ph, capHere), ff = (rtaS == null || xm <= rtaS) ? f : 1;
        var gs = Math.max(120, tasOf(v * ff, alt) - headwind(wind, L, legs[i - 1]));
        t += dx / gs * 3600;
        if (fob != null) fob -= flow[ph] * (gw(fob) / 65) * dx / gs / 1000;
        xs += dx;
      }
      if (L.type === 'HF' || L.type === 'HA' || (L.type === 'HM' && i === 1 && ac.hold)) { t += 240; if (fob != null) fob -= 2.2 * 4 / 60; }
      if (L.spd && L.seg !== 'dep') spdCap = Math.min(spdCap, L.spd);
      var a = altAt(se), p2 = phaseAt(se);
      out.legs[i].t = t; out.legs[i].alt = i === di ? dest.elev : a; out.legs[i].fob = fob;
      out.legs[i].spd = i === di ? null : spdAt(se, a, p2, L.spd && L.seg === 'dep' ? Math.min(capHere) : spdCap);
      if (L.alt) out.legs[i].miss = altMissed(L.alt, out.legs[i].alt);
      if (L.spd) out.legs[i].spdMiss = out.legs[i].spd >= 1 && out.legs[i].spd > L.spd + 10;
    }
    out.pseudo.forEach(function (q) { q.t = timeAtS(out, q.s); q.alt = altAt(q.s); });
    out.destT = out.legs[di].t; out.destFob = out.legs[di].fob;
    // Missed approach and alternate legs: distance only.
    for (i = di + 1; i < legs.length; i++) out.legs[i] = { s: out.legs[i].s, alt: null };
    return out;
  }
  function headwind(w, L, P) {
    if (!w || !P || L.type === 'DISCO' || P.type === 'DISCO') return 0;
    return w.spd * Math.cos(rad(w.dir - gbrg(P, L)));
  }
  function altMissed(c, a) { if (a == null) return false; return c.t === '@' ? Math.abs(a - c.v) > 250 : c.t === '+' ? a < c.v - 250 : a > c.v + 250; }
  function timeAtS(out, x) {
    for (var k = 1; k < out.legs.length; k++) if (out.legs[k].t != null && out.legs[k].s >= x) { var a = out.legs[k - 1], b = out.legs[k]; return b.s === a.s ? b.t : a.t + (b.t - a.t) * (x - a.s) / (b.s - a.s); }
    return null;
  }
  function legIdxS(pl, out, id) { for (var i = 0; i < pl.legs.length; i++) if (pl.legs[i].id === id && out.legs[i]) return out.legs[i].s; return null; }
  function stepS(pl, st) {
    var s = 0, last = pl.legs[0];
    for (var i = 0; i < pl.legs.length; i++) {
      var L = pl.legs[i];
      if (i > 0 && L.type !== 'DISCO' && !L.noPos) { s += gdist(last, L); last = L; }
      if (L.id === st.id) return Math.max(0, s + (st.off || 0));
      if (L.dest) break;
    }
    return null;
  }
  function crzBefore(pl, st, steps) {
    var c = (S.init.crz || 0) * 100;
    steps.forEach(function (o) { if (o !== st && o.s != null && st.s != null && o.s < st.s) c = o.fl * 100; });
    return c;
  }
  // RTA: speed factor between green dot and VMO - 10 to match the time constraint.
  function rtaSolve(pl) {
    if (!pl.rta) return { pr: predict(pl), f: 1 };
    var base = predict(pl), idx = -1;
    pl.legs.forEach(function (L, i) { if (L.id === pl.rta.id && idx < 0) idx = i; });
    if (idx < 0 || base.legs[idx].t == null) return { pr: base, f: 1 };
    var want = pl.rta.t, lo = 0.82, hi = 1.08, pr = base, f = 1, t0 = null;
    // Preflight with no ETT: the take-off time is computed to meet the RTA at ECON speeds.
    if (S.phase === 'PREFLIGHT' && S.ett == null) {
      var req = want - (base.legs[idx].t - base.legs[0].t);
      if (req >= now()) { var p0 = predict(pl, 1, req); p0.ettReq = req; return finish(p0, 1); }
      t0 = now();
    }
    function tAt(ff) { var p = predict(pl, ff, t0); return [p, p.legs[idx].t]; }
    var tl = tAt(lo), th = tAt(hi);
    if (pl.rta.type === '-' && base.legs[idx].t <= want) return finish(base, 1);
    if (pl.rta.type === '+' && base.legs[idx].t >= want) return finish(base, 1);
    if (want >= tl[1]) return finish(tl[0], lo);
    if (want <= th[1]) return finish(th[0], hi);
    for (var k = 0; k < 18; k++) { f = (lo + hi) / 2; var r = tAt(f); pr = r[0]; if (r[1] > want) lo = f; else hi = f; }
    return finish(pr, f);
    function finish(p, ff) {
      var dt = p.legs[idx].t - want;
      var made = pl.rta.type === '@' ? Math.abs(dt) <= 30 : pl.rta.type === '-' ? dt <= 30 : dt >= -30;
      p.rta = { idx: idx, dt: dt, made: made }; return { pr: p, f: ff };
    }
  }
  var PRED = null; // cache per render
  function preds(pl) { return pl ? rtaSolve(pl).pr : null; }

  /* --------------------------------------------- the editable flight plan */
  var KEEP = { keep: true };
  function ed() { return S.tmpy ? S.tmpy.plan : S.act; }
  // Every lateral or vertical revision goes into the temporary flight plan.
  function rev(fn) {
    if (!S.act) return 'NOT ALLOWED';
    if (S.tmpy && S.tmpy.dir) return 'DIR TO IN PROCESS';
    if (!S.tmpy) S.tmpy = { plan: clone(S.act), revs: 0, prev: null, undoUsed: false, ac: { fromId: S.act.legs[0].id } };
    var before = clone(S.tmpy.plan);
    var r = fn(S.tmpy.plan);
    if (typeof r === 'string') { S.tmpy.plan = before; if (!S.tmpy.revs) S.tmpy = null; return r; }
    var full = partsFull(S.tmpy.plan);
    if (full) { S.tmpy.plan = before; if (!S.tmpy.revs) S.tmpy = null; return 'F-PLN FULL'; }
    S.tmpy.prev = before; S.tmpy.revs++;
    return r;
  }
  function partsFull(pl) {
    var p = 0, a = 0; pl.legs.forEach(function (L) { if (L.seg === 'altn') a++; else p++; });
    return p > 200 || a > 200;
  }
  function insertTmpy() {
    var t = S.tmpy; if (!t) return;
    var destChanged = t.plan.dest !== S.act.dest;
    S.act = t.plan; S.tmpy = null;
    if (t.dir) { S.ac.mode = t.dir.radial ? 'HDG' : 'NAV'; S.ac.navArm = !!t.dir.radial; S.act.offset = null; }
    if (destChanged && S.phase === 'GO AROUND' && S.ac.alt >= APT[S.act.origin].elev + S.perf.acc) S.phase = 'CLIMB';
    if (t.ci0) { S.init.ci = 0; S.init.crz = t.crz; }
  }
  function eraseTmpy() { S.tmpy = null; }
  function undo() { if (S.tmpy && S.tmpy.revs > 1 && !S.tmpy.undoUsed && S.tmpy.prev) { S.tmpy.plan = S.tmpy.prev; S.tmpy.prev = null; S.tmpy.revs--; S.tmpy.undoUsed = true; } }
  // After a lateral change inside the departure, the following departure fixes become en route.
  function markEnr(pl, i) { for (var k = i; k < pl.legs.length; k++) { if (pl.legs[k].seg !== 'dep') break; pl.legs[k].seg = 'enr'; } }

  /* ---------------------------------------------- waypoint entry formats */
  function storePilot(kind, lat, lon, def) {
    var n = S.pilot.filter(function (p) { return p.kind === kind; }).length;
    if (n >= 20) { var first = S.pilot.findIndex(function (p) { return p.kind === kind; }); S.pilot.splice(first, 1); n = 19; }
    var id; do { n++; id = kind + (n < 10 ? '0' : '') + n; } while (S.pilot.some(function (p) { return p.id === id; }));
    var w = { id: id, kind: kind, lat: lat, lon: lon, def: def }; S.pilot.push(w); return w;
  }
  function parseLL(s) {
    var m = /^(\d{2})(\d{2}(?:\.\d)?)?([NS])\/(\d{3})(\d{2}(?:\.\d)?)?([EW])$/.exec(s);
    if (!m) return null;
    var lat = +m[1] + (m[2] ? +m[2] / 60 : 0), lon = +m[4] + (m[5] ? +m[5] / 60 : 0);
    if (lat > 90 || lon > 180) return null;
    return { lat: m[3] === 'S' ? -lat : lat, lon: m[6] === 'W' ? -lon : lon };
  }
  // Ident, LAT/LONG, PLACE/BRG/DIST, PLACE-BRG/PLACE-BRG. PD (PLACE/±DIST) is handled where it applies.
  function lookup(s) {
    if (!s) return 'FORMAT ERROR';
    var p = pos(s); if (p) return { id: s, lat: p.lat, lon: p.lon, apt: !!APT[s] };
    if (/[NS]\/\d/.test(s)) { var q = parseLL(s); if (!q) return 'FORMAT ERROR'; var w = storePilot('LL', q.lat, q.lon, s); return { id: w.id, lat: q.lat, lon: q.lon }; }
    var m = /^([A-Z0-9]{2,5})\/(\d{1,3}(?:\.\d)?)\/(\d{1,3}(?:\.\d)?)$/.exec(s);
    if (m) { var b = pos(m[1]); if (!b) return 'NOT IN DATA BASE'; var d = gdest(b, +m[2], +m[3]), w2 = storePilot('PBD', d.lat, d.lon, s); return { id: w2.id, lat: d.lat, lon: d.lon }; }
    m = /^([A-Z0-9]{2,5})-(\d{1,3})\/([A-Z0-9]{2,5})-(\d{1,3})$/.exec(s);
    if (m) {
      var a1 = pos(m[1]), a2 = pos(m[3]); if (!a1 || !a2) return 'NOT IN DATA BASE';
      var r = segLine(a1, gdest(a1, +m[2], 400), a2, dir(+m[4]), -400, 400);
      if (!r) return 'NO INTERSECTION FOUND';
      var x = lerpPos(a1, gdest(a1, +m[2], 400), r[0]), w3 = storePilot('PBX', x.lat, x.lon, s); return { id: w3.id, lat: x.lat, lon: x.lon };
    }
    if (/^[A-Z0-9]{1,7}$/.test(s)) return 'NOT IN DATA BASE';
    return 'FORMAT ERROR';
  }
  var PD_RE = /^([A-Z0-9]{2,7})\/([+-]?\d{1,3}(?:\.\d)?)$/;
  // Along-track (PD) point on the plan: before (-) or after (+) the place.
  function alongTrack(pl, i, d) {
    var legs = pl.legs, here = legs[i], left = Math.abs(d), k = i, cur = here;
    var stepDir = d < 0 ? -1 : 1;
    while (true) {
      var j = k + stepDir; while (legs[j] && (legs[j].type === 'DISCO' || legs[j].noPos)) j += stepDir;
      if (!legs[j]) return null;
      var seg = gdist(cur, legs[j]);
      if (seg >= left) { var p = gdest(cur, gbrg(cur, legs[j]), left); return { pos: p, at: stepDir < 0 ? k : j }; }
      left -= seg; cur = legs[j]; k = j;
    }
  }

  /* ------------------------------------------------------ lateral revisions */
  function canRevise(pl, i, what) {
    var L = pl.legs[i];
    if (!L) return 'NOT ALLOWED';
    if (i === 0 && what !== 'from') return 'NOT ALLOWED';
    return null;
  }
  function insertWpt(pl, i, w) {
    if (i === 1 && S.phase !== 'PREFLIGHT' && S.ac.mode === 'NAV') return 'NOT ALLOWED';
    if (i === 0) return 'NOT ALLOWED';
    var L = wptLeg(w.id, pl.legs[i].seg === 'miss' || pl.legs[i].seg === 'altn' ? pl.legs[i].seg : (pl.legs[i].seg === 'arr' && !pl.legs[i - 1] ? 'arr' : pl.legs[i - 1].seg === 'dep' ? 'dep' : pl.legs[i].seg), w);
    if (L.seg === 'dep') L.seg = 'enr';
    var add = [L]; if (pl.legs[i].type !== 'DISCO') add.push({ type: 'DISCO', seg: L.seg });
    pl.legs.splice.apply(pl.legs, [i, 0].concat(add));
    markEnr(pl, i);
  }
  function deleteAt(pl, i) {
    var L = pl.legs[i];
    if (i === 0 || L.dest || L.altnApt || L.type === 'APT') return 'NOT ALLOWED';
    if (L.type === 'DISCO') { if (L.afterManual) return 'NOT ALLOWED'; pl.legs.splice(i, 1); return; }
    if (i === 1 && S.phase !== 'PREFLIGHT' && S.ac.mode === 'NAV' && L.type !== 'HM') return 'NOT ALLOWED';
    if (L.type === 'HM' || L.type === 'HF' || L.type === 'HA') { pl.legs.splice(i, 1); return; }
    if (pl.rta && pl.rta.id === L.id) { pl.rta = null; msgAll('RTA DELETED'); }
    var prevD = pl.legs[i - 1] && pl.legs[i - 1].type === 'DISCO', nextD = pl.legs[i + 1] && pl.legs[i + 1].type === 'DISCO';
    if (prevD || nextD) pl.legs.splice(i, 1); else pl.legs.splice(i, 1, { type: 'DISCO', seg: L.seg });
    // A hold at the deleted fix goes with it.
    if (pl.legs[i] && pl.legs[i].type === 'HM' && pl.legs[i].fix === L.id) pl.legs.splice(i, 1);
    markEnr(pl, i);
  }
  function setDeparture(pl, rwy, sid, trans) {
    pl.rwy = rwy; pl.sid = sid; pl.trans = trans;
    var rest = pl.legs.filter(function (L, i) { return i > 0 && L.seg !== 'dep'; });
    var oldDep = pl.legs.filter(function (L, i) { return i > 0 && L.seg === 'dep'; }), oldEnd = oldDep.length ? oldDep[oldDep.length - 1].id : pl.depJoin;
    while (rest.length && rest[0].type === 'DISCO') rest.shift();
    pl.legs = [originLeg(pl.origin, rwy)];
    var d = depLegs(pl);
    pl.legs = pl.legs.concat(d);
    // The new departure ends where the old one did: it joins the route with no discontinuity.
    if (oldEnd) pl.depJoin = oldEnd;
    if (rest.length && d.length && d[d.length - 1].id === pl.depJoin) pl.legs = pl.legs.concat(rest);
    else if (rest.length) join(pl.legs, rest);
  }
  function setArrival(pl, a) {
    Object.assign(pl, a);
    var di = destIdx(pl), keepAfter = pl.legs.slice(di + 1).filter(function (L) { return L.seg === 'altn'; });
    var newArr = arrLegs(pl), ap = pl.appr && APPR[pl.dest][pl.appr], dl = destLeg(pl.dest, ap ? ap.rwy : '');
    var inArr = S.phase !== 'PREFLIGHT' && pl.legs[1] && pl.legs[1].seg === 'arr';
    var removedHold = pl.legs.some(function (L, i) { return i <= di && L.seg === 'arr' && L.type === 'HM' && !L.db; });
    var head;
    if (inArr) {
      // Flying the arrival: keep the active leg; string what follows the TO waypoint.
      var to = pl.legs[1], k = -1;
      newArr.forEach(function (L, i) { if (k < 0 && L.id === to.id) k = i; });
      head = pl.legs.slice(0, 2);
      if (k >= 0) {
        var old = {}; pl.legs.forEach(function (L) { if (L.id) old[L.id] = L; });
        var tail = newArr.slice(k + 1); tail.forEach(function (L) { if (old[L.id] && (old[L.id].alt || old[L.id].spd)) { L.alt = old[L.id].alt; L.spd = old[L.id].spd; } });
        pl.legs = head.concat(tail);
      } else pl.legs = head.concat([{ type: 'DISCO', seg: 'arr' }], newArr);
    } else {
      head = pl.legs.slice(0, di).filter(function (L) { return L.seg !== 'arr'; });
      while (head.length > 1 && head[head.length - 1].type === 'DISCO') head.pop();
      pl.legs = head; join(pl.legs, newArr);
      if (!newArr.length && pl.legs[pl.legs.length - 1].type !== 'DISCO' && pl.legs.length > 1) pl.legs.push({ type: 'DISCO', seg: 'arr' });
    }
    pl.legs.push(dl);
    pl.legs = pl.legs.concat(missLegs(pl), keepAfter);
    if (removedHold) return 'MANUAL HOLD DELETED';
  }
  function newDest(pl, i, apt) {
    if (!APT[apt]) return 'NOT IN DATA BASE';
    var L = pl.legs[i];
    if (i === 0 || L.dest || L.seg === 'miss' || L.seg === 'altn') return 'NOT ALLOWED';
    pl.legs = pl.legs.slice(0, i + 1).concat([{ type: 'DISCO', seg: 'enr' }, destLeg(apt)]);
    pl.dest = apt; pl.star = pl.appr = pl.via = pl.strans = null; pl.altn = null; pl.altnRte = null;
    if (pl.rta && !pl.legs.some(function (l) { return l.id === pl.rta.id; })) { pl.rta = null; msgAll('RTA DELETED'); }
  }
  function enableAltn(pl, i) {
    if (!pl.altn) return 'NOT ALLOWED';
    var alt = pl.legs.filter(function (L) { return L.seg === 'altn'; }).map(function (L) { var c = clone(L); c.seg = 'enr'; if (c.altnApt) { c.altnApt = false; c.dest = true; } return c; });
    pl.legs = pl.legs.slice(0, i + 1).concat([{ type: 'DISCO', seg: 'enr' }], alt);
    var d = alt[alt.length - 1]; pl.dest = pl.altn; pl.altn = null; pl.altnRte = null;
    var cr = null; Object.keys(CORTE).forEach(function (k) { if (CORTE[k].to === pl.dest && CORTE[k].appr) cr = CORTE[k]; });
    pl.appr = cr ? cr.appr : null; pl.star = cr ? cr.star : null; pl.via = null;
    if (pl.appr) { var ap = APPR[pl.dest][pl.appr]; d.id = pl.dest + ap.rwy; pl.legs = pl.legs.concat(missLegs(pl)); }
    // Alternate predictions: FL100 under 100 NM, FL220 up to 200 NM, FL310 beyond.
    var dist = 0, last = pl.legs[i]; alt.forEach(function (L) { if (!L.noPos && L.type !== 'DISCO') { dist += gdist(last, L); last = L; } });
    S.tmpy.ci0 = true; S.tmpy.crz = dist < 100 ? 100 : dist < 200 ? 220 : 310;
  }
  function setAltn(pl, apt, rte) {
    pl.legs = pl.legs.filter(function (L) { return L.seg !== 'altn'; });
    pl.altn = apt || null; pl.altnRte = rte || null;
    if (apt) pl.legs = pl.legs.concat(altnLegs(pl));
  }
  function airwayRoute(start, rows) {
    // rows: [{via, to}] -> fixes after start, or an error.
    var out = [], from = start;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r]; if (!row.via || !row.to) break;
      var fx = row.to.x ? (airwayFixes(row.via, from, row.to.after) || []).concat([]) : airwayFixes(row.via, from, row.to.id);
      if (row.to.x) { fx.push(row.to.id); }
      if (!fx) return 'AWY/WPT MISMATCH';
      fx.forEach(function (id) { var p = row.to.x && id === row.to.id ? row.to : pos(id); out.push({ id: id, lat: p.lat, lon: p.lon, awy: row.via }); });
      from = row.to.x ? row.to.next : row.to.id;
      if (row.to.x) out.xfrom = from;
    }
    return out;
  }
  // First intersection downpath of the start fix between two airways.
  function awyIntersect(a1, startOnA1, a2) {
    var A = AWY[a1], B = AWY[a2], si = A.indexOf(startOnA1);
    if (!B) return 'NOT IN DATA BASE';
    for (var dirn = 1; dirn >= -1; dirn -= 2) {
      for (var k = si + dirn; k >= 0 && k < A.length; k += dirn) if (B.indexOf(A[k]) >= 0) return { id: A[k] };
    }
    for (dirn = 1; dirn >= -1; dirn -= 2) {
      for (k = si; k + dirn >= 0 && k + dirn < A.length; k += dirn) {
        var p = pos(A[k]), q = pos(A[k + dirn]);
        for (var j = 0; j + 1 < B.length; j++) {
          var b0 = pos(B[j]), b1 = pos(B[j + 1]), Bx = xy(b0), By = xy(b1), len = Math.hypot(By[0] - Bx[0], By[1] - Bx[1]);
          var r = segLine(p, q, b0, [(By[0] - Bx[0]) / len, (By[1] - Bx[1]) / len], 0, len);
          if (r) { var x = lerpPos(p, q, r[0]); return { id: 'X' + a2, lat: x.lat, lon: x.lon, x: true, after: A[k], next: B[j + 1], prevB: B[j] }; }
        }
      }
    }
    return 'NO INTERSECTION FOUND';
  }
  function applyAirways(base, i, rows) {
    var pl = clone(base), start = pl.legs[i].id, fixes = [], from = start;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r]; if (!row.via || !row.to) break;
      var f;
      if (row.to.x) { f = airwayFixes(row.via, from, row.to.after) || []; if (from === row.to.after) f = []; f = f.map(function (id) { return { id: id, p: pos(id) }; }); f.push({ id: row.to.id, p: row.to }); from = null; }
      else if (from === null) { var prevX = rows[r - 1].to; f = (airwayFixes(row.via, prevX.prevB, row.to.id) || []).map(function (id) { return { id: id, p: pos(id) }; }); from = row.to.id; }
      else { var g = airwayFixes(row.via, from, row.to.id); if (!g) return 'AWY/WPT MISMATCH'; f = g.map(function (id) { return { id: id, p: pos(id) }; }); from = row.to.id; }
      f.forEach(function (o) { var L = wptLeg(o.id, 'enr', o.p); L.awy = row.via; fixes.push(L); });
    }
    if (!fixes.length) return pl;
    var end = fixes[fixes.length - 1].id, k = -1;
    for (var j = i + 1, dI = destIdx(pl); j < dI; j++) if (pl.legs[j].id === end) { k = j; break; }
    var tail = k >= 0 ? pl.legs.slice(k + 1) : pl.legs.slice(i + 1);
    if (k >= 0) { fixes[fixes.length - 1] = Object.assign(pl.legs[k], { awy: fixes[fixes.length - 1].awy }); }
    else if (tail.length && tail[0].type !== 'DISCO') fixes.push({ type: 'DISCO', seg: 'enr' });
    pl.legs = pl.legs.slice(0, i + 1).concat(fixes, tail);
    markEnr(pl, i + 1);
    return pl;
  }
  function computedHold(pl, i) {
    var fix = pl.legs[i], prev = lastPos(pl.legs.slice(0, i)) || fix;
    var p = preds(pl), alt = p && p.legs[i] ? p.legs[i].alt : S.ac.alt;
    return { inb: Math.round(prev === fix ? 0 : gbrg(prev, fix)) || 360, turn: 'R', time: alt != null && alt > 14000 ? 1.5 : 1.0, db: false };
  }
  function insertHold(pl, i, which) {
    var fix = pl.legs[i];
    var h = which !== 'COMP' && HOLDS[fix.id] ? { inb: HOLDS[fix.id][0], turn: HOLDS[fix.id][1], time: HOLDS[fix.id][2], db: true } : computedHold(pl, i);
    var L = { id: 'HOLD ' + h.turn, type: 'HM', lat: fix.lat, lon: fix.lon, seg: fix.seg, fix: fix.id, hold: h, manual: true };
    if (pl.legs[i + 1] && pl.legs[i + 1].type === 'HM' && pl.legs[i + 1].fix === fix.id) pl.legs[i + 1] = L;
    else pl.legs.splice(i + 1, 0, L);
    // The offset ends before the first hold.
  }
  function holdSpeed(alt) { return Math.min(greenDot(gw(S.ac.fob)), alt == null || alt <= 14000 ? 230 : alt <= 20000 ? 240 : 265); }
  function holdEntry(inbTrack, hold) {
    // Sector rules (right-hand pattern; mirrored for left turns).
    var d = n360(inbTrack - hold.inb);
    if (hold.turn === 'L') d = n360(-d);
    if (d <= 110 || d >= 290) return 'DIRECT';
    return d < 180 ? 'PARALLEL' : 'TEARDROP';
  }

  /* ------------------------------------------------------------- DIR TO */
  function dirBuild(target, opt, radial) {
    var pl = clone(S.act), legs = pl.legs, ac = S.ac, k = -1;
    for (var i = 1; i < legs.length; i++) if (legs[i].id === target.id && legs[i].type !== 'HM') { k = i; break; }
    var tp = { id: 'T-P', type: 'TP', lat: legs[0].lat, lon: legs[0].lon, seg: legs[0].seg === 'dep' ? 'enr' : legs[0].seg };
    var tgt = k >= 0 ? legs[k] : wptLeg(target.id, 'enr', target), rest = k >= 0 ? legs.slice(k + 1) : [{ type: 'DISCO', seg: 'enr' }].concat(legs.slice(1));
    var mid = [];
    if (opt === 'ABEAM' && k > 1) {
      for (var j = 1; j < k; j++) {
        var L = legs[j]; if (L.type === 'DISCO' || L.noPos || L.type === 'HM') continue;
        var pr = project(tp, tgt, L); if (pr[0] <= 0 || pr[0] >= 1) continue;
        var p = lerpPos(tp, tgt, pr[0]);
        var ab = { id: 'AB' + (/^(LL|PBD|PBX|PD)\d/.test(L.id) ? llAbbrev(L) : L.id.slice(0, 5)), type: 'TF', lat: p.lat, lon: p.lon, seg: L.seg === 'dep' ? 'enr' : L.seg, alt: L.alt, spd: L.spd };
        if (pl.rta && pl.rta.id === L.id) pl.rta.id = ab.id;
        mid.push(ab);
      }
    }
    if (opt === 'IN' || opt === 'OUT') {
      // Current track: the MANUAL leg's heading, or the active leg.
      var trk = legs[1] && (legs[1].type === 'VM' || legs[1].type === 'FM') ? legs[1].crs : gbrg(legs[0], lastPos(legs.slice(1, 2)) || tgt);
      var crs = radial, dd = opt === 'IN' ? dir(n360(crs + 180)) : dir(crs);
      var r = segLine(tp, gdest(tp, trk, 400), tgt, dd, 0, 400), ang = Math.abs(((opt === 'IN' ? crs : crs) - trk + 540) % 360 - 180);
      if (ang > 160 || !r) return 'NO NAV INTERCEPT';
      var ip = lerpPos(tp, gdest(tp, trk, 400), r[0]);
      tp.id = opt === 'IN' ? 'INBND' : 'OUTBND'; tp.radial = crs;
      var ic = { id: 'INTCPT', type: 'CI', lat: ip.lat, lon: ip.lon, seg: tp.seg, crs: crs };
      if (opt === 'IN') { pl.legs = [tp, ic, tgt].concat(rest); }
      else { var fm = gdest(ip, crs, 6); pl.legs = [tp, ic, { id: 'MANUAL', type: 'FM', crs: crs, lat: fm.lat, lon: fm.lon, seg: tp.seg, noPos: true }, { type: 'DISCO', seg: tp.seg, afterManual: true }].concat(k >= 0 ? [tgt].concat(rest) : rest.slice(1)); }
      if (k < 0 && opt === 'IN') pl.legs.splice(3, 0, { type: 'DISCO', seg: 'enr' });
      pl.offset = null;
      return pl;
    }
    pl.legs = [tp].concat(mid, [tgt], rest);
    pl.offset = null;
    return pl;
  }
  function llAbbrev(L) { return (Math.abs(Math.round(L.lat)) + (L.lat < 0 ? 'S' : 'N') + Math.abs(Math.round(L.lon)) + (L.lon < 0 ? 'W' : 'E')).slice(0, 5); }
  function defaultRadial(target) {
    var legs = S.act.legs;
    for (var i = 1; i < legs.length; i++) if (legs[i].id === target.id) {
      if (legs[i - 1].type === 'DISCO' || legs[i - 1].noPos) { var nx = lastPos(legs.slice(i + 1, i + 2)); return nx ? Math.round(gbrg(legs[i], nx)) : null; }
      var pv = lastPos(legs.slice(0, i)); return pv ? Math.round(gbrg(pv, legs[i])) : null;
    }
    return null;
  }

  /* ----------------------------------------------------------- fix info */
  function fixInter(pl, ref, kind, val) {
    var legs = pl.legs, di = destIdx(pl), last = legs[0], best = null, dSum = 0;
    for (var i = 1; i <= di; i++) {
      var L = legs[i]; if (L.type === 'DISCO' || L.noPos) continue;
      var a = last, b = L, len = gdist(a, b), hit = null;
      if (kind === 'R') { var r = segLine(a, b, ref, dir(val), 0, 600); if (r) hit = r[0]; }
      else if (kind === 'C') {
        for (var u = 0; u <= 1.0001; u += 0.01) { var p = lerpPos(a, b, u); if (gdist(p, ref) <= val && gdist(a, ref) > val) { hit = u; break; } if (gdist(a, ref) <= val && gdist(p, ref) >= val && u > 0) { hit = u; break; } }
      } else { var pr = project(a, b, ref); if (pr[0] > 0 && pr[0] < 1 && (!best || pr[1] < best.cross)) best = { i: i, u: pr[0], d: dSum + len * pr[0], cross: pr[1], pos: lerpPos(a, b, pr[0]) }; }
      if (hit != null) return { i: i, u: hit, d: dSum + len * hit, pos: lerpPos(a, b, hit) };
      dSum += len; last = L;
    }
    return kind === 'A' ? best : null;
  }
  function fixStr(pl, x) { var p = fixPred(pl, x); return (p ? hhmm(p.t) : '----') + ' ' + pad(Math.round(x.d), 3) + ' ' + pad(altStr(p && p.alt, pl), 6); }
  function fixPred(pl, x) { var p = preds(pl); if (!p) return null; return { t: timeAtS(p, x.d), alt: p.altAt(x.d) }; }

  /* ------------------------------------------------------------ the fly model */
  function simTakeoff() {
    if (!S.act) return 'Set up a flight plan first (INIT A).';
    if (S.phase !== 'PREFLIGHT') return 'Already airborne.';
    S.phase = 'TAKEOFF'; S.ac.alt = APT[S.act.origin].elev; S.ac.fob = S.init.block != null ? S.init.block - S.init.taxi : null; S.ac.tofTime = now();
    S.ett = null;
    return 'SRS TO engaged with N1 above 85%: phase TAKEOFF. Now fly to the next waypoint.';
  }
  function seqTmpy(id) { if (S.tmpy && !S.tmpy.dir && S.tmpy.plan.legs[1] && S.tmpy.plan.legs[1].id === id) S.tmpy.plan.legs.shift(); }
  function simFly() {
    var pl = S.act; if (!pl) return 'No flight plan.';
    if (S.phase === 'PREFLIGHT') return 'Press Take off first.';
    if (S.phase === 'DONE') return 'Flight done. Press INIT or PERF to start the next flight (PREFLIGHT).';
    var legs = pl.legs, to = legs[1];
    if (S.ac.navArm) {
      if (to && to.type === 'CI') { moveTo(pl, 1); S.ac.mode = 'NAV'; S.ac.navArm = false; return 'Intercept point reached: NAV engages on the radial.'; }
      S.ac.navArm = false;
    }
    if (S.ac.mode !== 'NAV') return 'HDG/TRK mode: the aircraft is not guided along the F-PLN. Do a DIR TO to rejoin it.';
    if (!to) return 'End of the flight plan.';
    if (to.type === 'VM' || to.type === 'FM') return 'Flying the MANUAL leg (' + to.crs + '°): NAV stays engaged, and only a DIR TO sequences it.';
    if (to.type === 'HM') {
      if (S.ac.immExit) { legs.splice(1, 1); seqTmpy(to.id); S.ac.hold = false; S.ac.immExit = false; return 'Hold exited at the fix: navigation resumes.'; }
      S.simOffset += holdMin(to) * 60; if (S.ac.fob != null) S.ac.fob -= 2.2 * holdMin(to) / 60;
      return 'One more holding circuit. Predictions updated for one more circuit.';
    }
    var pr = preds(pl), d = pr.legs[1].s, dt = pr.legs[1].t - pr.legs[0].t, msg = [];
    var crossed = pr.pseudo.filter(function (q) { return q.s <= d + 0.01; }).map(function (q) { return q.id; });
    pr.pseudo.forEach(function (q) { if (q.step && q.s <= d + 0.01) { pl.steps.splice(pl.steps.indexOf(pl.steps.filter(function (s) { return s.id === q.step.id && s.fl === q.step.fl; })[0]), 1); if (S.init.crz === q.step.fl) msg.push('Step to FL' + q.step.fl + ' done.'); else msg.push('STEP DELETED (sequenced without a level change).'); msgAll('STEP DELETED'); } });
    S.simOffset += dt; if (pr.legs[1].fob != null) S.ac.fob = pr.legs[1].fob;
    S.ac.alt = Math.round(pr.legs[1].alt); S.ac.flown += d;
    if (to.type === 'HF' || to.type === 'HA') { legs.splice(1, 1); seqTmpy(to.id); return 'Database hold (' + to.type + ') flown once, then exited automatically at the fix.'; }
    var inbTrk = gbrg(legs[0], lastPos(legs.slice(0, 2)));
    moveTo(pl, 1);
    if (pl.rta && pl.rta.id === to.id) pl.rta = null;
    // Phase changes.
    if (S.phase === 'TAKEOFF' && S.ac.alt >= APT[pl.origin].elev + S.perf.acc) { S.phase = 'CLIMB'; msg.push('Acceleration altitude: phase CLIMB.'); }
    if (S.phase === 'CLIMB' && crossed.indexOf('(T/C)') >= 0) { S.phase = 'CRUISE'; msg.push('Cruise level reached: phase CRUISE.'); }
    if ((S.phase === 'CRUISE' || S.phase === 'CLIMB') && crossed.indexOf('(T/D)') >= 0) { S.phase = 'DESCENT'; msg.push('Past the T/D: phase DESCENT.'); }
    if (S.phase === 'DESCENT' && crossed.indexOf('(DECEL)') >= 0 && S.ac.alt < APT[pl.dest].elev + 9500) { S.phase = 'APPROACH'; msg.push('DECEL overflown in NAV below 9 500 ft AGL: phase APPROACH.'); }
    if (to.dest) {
      if (S.phase === 'APPROACH') { S.phase = 'DONE'; S.ac.alt = APT[pl.dest].elev; return 'Landed. The phase goes to DONE (30 s after landing).'; }
      msg.push('Destination sequenced.');
    }
    var nx = pl.legs[1];
    if (nx && nx.type === 'HM') {
      S.ac.hold = true; S.ac.immExit = false;
      if (pl.rta) { pl.rta = null; msgAll('RTA DELETED'); }
      msg.push('Hold entry: ' + holdEntry(inbTrk, nx.hold) + '. The aircraft enters the hold (one turn assumed in the predictions). Use IMM EXIT on the F-PLN to leave it.');
    }
    if (nx && nx.type === 'DISCO') { S.ac.mode = 'HDG'; msg.push('F-PLN discontinuity overflown: NAV reverts to HDG/TRK. Do a DIR TO to rejoin.'); }
    return msg.join(' ') || 'Waypoint ' + to.id + ' sequenced.';
  }
  function holdMin(h) { return (h.hold.time || 1) * 2 + 2; }
  function moveTo(pl, i) {
    var L = pl.legs[i]; S.ac.lat = L.lat; S.ac.lon = L.lon;
    var gone = pl.legs.splice(0, i);
    gone.forEach(function (g) { seqTmpy(pl.legs[0].id); });
    // Lat/long crossing points are deleted when sequenced (nothing stored).
  }
  function simGoAround() {
    if (S.phase !== 'APPROACH') return 'Go-around is available in the approach phase.';
    var pl = S.act, di = destIdx(pl);
    S.phase = 'GO AROUND'; S.ac.mode = 'NAV';
    if (pl.rta) { pl.rta = null; msgAll('RTA DELETED'); }
    // The missed approach becomes the active part; the destination follows it again.
    var d = pl.legs[di], miss = pl.legs.slice(di + 1).filter(function (L) { return L.seg === 'miss'; }), altn = pl.legs.filter(function (L) { return L.seg === 'altn'; });
    miss.forEach(function (L) { L.seg = 'enr'; });
    pl.legs = [Object.assign(clone(d), { dest: false, ga: true })].concat(miss, [{ type: 'DISCO', seg: 'arr' }, clone(d)], altn);
    S.tmpy = null;
    return 'SRS GA: phase GO AROUND. The missed approach is active. Reactivate APPR on PERF GO AROUND, or divert (ALTN, NEW DEST or SEC F-PLN).';
  }

  /* ------------------------------------------------------- screen model */
  function Screen() { this.c = []; for (var r = 0; r < 14; r++) { this.c.push(new Array(24)); } }
  Screen.prototype.put = function (r, col, s, cl, sm) { s = String(s); for (var i = 0; i < s.length; i++) if (col + i >= 0 && col + i < 24) this.c[r][col + i] = { ch: s[i], c: cl || 'w', s: !!sm }; };
  Screen.prototype.L = function (r, s, cl, sm) { this.put(r, 0, s, cl, sm); };
  Screen.prototype.R = function (r, s, cl, sm) { this.put(r, 24 - String(s).length, s, cl, sm); };
  Screen.prototype.C = function (r, s, cl, sm) { this.put(r, Math.floor((24 - String(s).length) / 2), s, cl, sm); };
  function pad(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }
  function hhmm(t) { if (t == null) return '----'; t = ((Math.round(t) % 86400) + 86400) % 86400; var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60); return (h < 10 ? '0' : '') + h + (m < 10 ? '0' : '') + m; }
  function hhmmss(t) { var s = Math.round(t) % 60; return hhmm(t) + (s < 10 ? '0' : '') + s; }
  function altStr(a, pl) { if (a == null) return '-----'; a = Math.round(a / 10) * 10; var ta = pl && APT[pl.origin] ? APT[pl.origin].ta : 5000; return a > ta ? 'FL' + pad(Math.round(a / 100), 3).replace(/ /g, '0') : String(a); }
  function spdStr(v) { if (v == null) return '---'; return v < 1 ? '.' + Math.round(v * 100) : String(Math.round(v)); }
  function cstrStr(c) { return (c.t === '@' ? '' : c.t) + altStr(c.v); }
  function fmtLat(p) { var a = Math.abs(p.lat), d = Math.floor(a), m = (a - d) * 60; return pad(d, 2).replace(' ', '0') + '°' + m.toFixed(1).padStart(4, '0') + (p.lat < 0 ? 'S' : 'N'); }
  function fmtLon(p) { var a = Math.abs(p.lon), d = Math.floor(a), m = (a - d) * 60; return String(d).padStart(3, '0') + '°' + m.toFixed(1).padStart(4, '0') + (p.lon < 0 ? 'W' : 'E'); }
  function t1(v) { return v == null ? '--.-' : (Math.round(v * 10) / 10).toFixed(1); }

  // Colour of a flight plan element: yellow in the TMPY, cyan (blue) for the
  // missed approach and alternate, green otherwise.
  function legCol(L, tm) { if (L.seg === 'miss' || L.seg === 'altn') return 'c'; return tm ? 'y' : 'g'; }
  function legNote(L, prev) {
    if (L.type === 'VA' || L.type === 'VM' || L.type === 'FM') return (L.type === 'FM' ? 'C' : 'H') + pad(L.crs, 3).replace(/ /g, '0') + '°';
    if (L.type === 'CF') return 'C' + pad(L.crs, 3).replace(/ /g, '0') + '°';
    if (L.type === 'CI') return 'IN' + L.crs + '°';
    if (L.type === 'AF') return 'ARC';
    if (L.type === 'RF') return 'RF';
    if (L.type === 'HM' || L.type === 'HF' || L.type === 'HA') return L.type === 'HM' ? 'HOLD' : L.type;
    if (L.awy) return L.awy;
    if (prev && L.type !== 'DISCO') return 'C' + pad(Math.round(gbrg(prev, L)) || 360, 3).replace(/ /g, '0') + '°';
    return '';
  }
  // The rows of the F-PLN page: legs, pseudo waypoints, ends of plan.
  function fplnItems(pl, pr) {
    var items = [], di = destIdx(pl), ps = pr && pr.ok ? pr.pseudo.slice() : [], hasAltn = false;
    pl.legs.forEach(function (L, i) {
      if (i <= di && pr) while (ps.length && ps[0].s <= pr.legs[i].s + 0.01 && i > 0) items.push({ k: 'ps', p: ps.shift() });
      items.push({ k: 'leg', i: i });
      if (L.seg === 'altn') hasAltn = true;
      var nx = pl.legs[i + 1];
      if ((L.dest || (i >= di && L.seg === 'miss')) && (!nx || nx.seg === 'altn')) items.push({ k: 'end', t: '------END OF F-PLN------' });
    });
    items.push({ k: 'end', t: hasAltn ? '---END OF ALTN F-PLN---' : '-----NO ALTN F-PLN-----' });
    return items;
  }

  /* --------------------------------------------------------------- pages */
  var PAGES = {};
  function tmpyRow6(sc, lsk, onRet, retLabel) {
    if (S.tmpy && S.tmpy.dir) { dirRow6(sc); lsk['6L'] = function () { eraseTmpy(); return KEEP; }; lsk['6R'] = function () { insertTmpy(); return KEEP; }; return; }
    if (S.tmpy) {
      sc.L(12, '<TMPY F-PLN', 'y'); sc.R(12, 'TMPY INSERT*', 'a');
      lsk['6L'] = function (sp, sd) { go(sd, 'FPLN'); return KEEP; };
      lsk['6R'] = function (sp, sd) { insertTmpy(); if (onRet) onRet(sd); return KEEP; };
      return;
    }
    if (onRet) { sc.L(12, '<' + (retLabel || 'RETURN')); lsk['6L'] = function (sp, sd) { onRet(sd); return KEEP; }; }
  }
  function dirRow6(sc) { sc.L(11, ' DIR TO', 'a', true); sc.R(11, 'DIR TO ', 'a', true); sc.L(12, '<ERASE', 'a'); sc.R(12, 'INSERT*', 'a'); }
  function go(sd, page, ctx) { sd.page = page; sd.ctx = ctx || {}; sd.scroll = 0; }
  function title(sc, s, tm) { if (tm) { sc.put(0, 0, 'TMPY', 'y'); sc.put(0, 5, s); } else sc.C(0, s); }

  PAGES.MENU = function (sc, lsk) {
    sc.C(0, 'MCDU MENU');
    sc.L(2, '<FMGC', 'g'); sc.R(2, 'SELECT ', 'w', true); sc.L(4, '<ATSU'); sc.L(6, '<AIDS'); sc.L(8, '<CFDS');
    sc.R(4, 'NAV B/UP>');
    lsk['1L'] = function (sp, sd) { go(sd, S.act ? 'FPLN' : 'STATUS'); return KEEP; };
    ['2L', '3L', '4L', '2R'].forEach(function (k) { lsk[k] = function () { return 'NOT AVAILABLE'; }; });
  };
  PAGES.STATUS = function (sc, lsk) {
    sc.C(0, 'A320-200'); sc.L(1, ' ENG', 'w', true); sc.L(2, 'CFM56-5B4', 'g');
    sc.L(3, ' ACTIVE DATA BASE', 'w', true); sc.L(4, 'TRAINING DB', 'c'); sc.R(4, 'NOT FOR NAV', 'a', true);
    sc.L(5, ' SECOND DATA BASE', 'w', true); sc.L(6, ' NONE', 'c', true);
    sc.L(9, ' CHG CODE', 'w', true); sc.L(10, '[  ]', 'c');
    sc.L(11, ' IDLE/PERF', 'w', true); sc.L(12, '+0.0/+0.0', 'g'); sc.R(12, 'STATUS/XLOAD>');
  };
  PAGES.DATA = function (sc, lsk) {
    sc.C(0, 'DATA INDEX'); sc.L(2, '<A/C STATUS'); sc.L(4, '<POSITION MONITOR'); sc.R(2, 'PILOTS WAYPOINTS>'); sc.R(4, 'STORED NAVAIDS>');
    lsk['1L'] = function (sp, sd) { go(sd, 'STATUS'); return KEEP; };
    lsk['1R'] = function (sp, sd) { go(sd, 'PWPT'); return KEEP; };
    lsk['2L'] = lsk['2R'] = function () { return 'NOT AVAILABLE'; };
  };
  PAGES.PWPT = function (sc, lsk, sd) {
    sc.C(0, 'PILOTS WAYPOINTS');
    var n = Math.max(1, S.pilot.length), i = ((sd.ctx.i || 0) % n + n) % n, w = S.pilot[i];
    if (!w) { sc.C(6, 'NO PILOT WAYPOINT', 'w'); return; }
    sc.R(0, (i + 1) + '/' + S.pilot.length, 'w', true);
    sc.L(1, ' IDENT', 'w', true); sc.L(2, w.id, 'g');
    sc.L(3, ' LAT/LONG', 'w', true); sc.L(4, fmtLat(w) + '/' + fmtLon(w), 'g');
    sc.L(5, ' DEFINED AS', 'w', true); sc.L(6, w.def, 'c');
    sd.ctx.slew = function (d) { sd.ctx.i = i + d; };
  };

  /* INIT A */
  PAGES.INITA = function (sc, lsk, sd) {
    var I = S.init, pl = S.act;
    sc.C(0, 'INIT'); sc.R(0, '→ ', 'w');
    sc.L(1, ' CO RTE', 'w', true); sc.R(1, 'FROM/TO  ', 'w', true);
    sc.L(2, I.coRte || (I.from ? 'NONE' : '□□□□□□□□□□'), I.coRte || I.from ? 'c' : 'a');
    sc.R(2, I.from ? I.from + '/' + I.to : '□□□□/□□□□', I.from ? 'c' : 'a');
    sc.L(3, 'ALTN/CO RTE', 'w', true); sc.L(4, pl ? (pl.altn || 'NONE') + '/' + (pl.altnRte || '') : '----/---------', pl ? 'c' : 'w');
    sc.L(5, 'FLT NBR', 'w', true); sc.L(6, I.flt || '□□□□□□□□', I.flt ? 'c' : 'a');
    sc.L(9, 'COST INDEX', 'w', true); sc.L(10, I.ci != null ? String(I.ci) : (pl ? '□□□' : '---'), I.ci != null ? 'c' : (pl ? 'a' : 'w'));
    sc.R(9, 'TROPO', 'w', true); sc.R(10, String(I.tropo), 'c');
    sc.L(11, 'CRZ FL/TEMP', 'w', true); sc.L(12, I.crz ? 'FL' + I.crz + '/---°' : (pl ? '□□□□□/□□□°' : '-----/---°'), I.crz ? 'c' : (pl ? 'a' : 'w'));
    lsk['1L'] = function (sp, sd2) {
      if (!sp) return KEEP;
      if (S.phase !== 'PREFLIGHT') return 'NOT ALLOWED';
      if (!CORTE[sp]) return 'NOT IN DATA BASE';
      var c = CORTE[sp]; I.coRte = sp; I.from = c.from; I.to = c.to; S.act = fromCoRte(sp); S.tmpy = null; S.ac.lat = APT[c.from].lat; S.ac.lon = APT[c.from].lon;
    };
    lsk['1R'] = function (sp, sd2) {
      if (!sp) return KEEP;
      if (S.phase !== 'PREFLIGHT') return 'NOT ALLOWED';
      var m = /^([A-Z]{4})\/([A-Z]{4})$/.exec(sp); if (!m) return 'FORMAT ERROR';
      if (!APT[m[1]] || !APT[m[2]]) return 'NOT IN DATA BASE';
      var list = Object.keys(CORTE).filter(function (k) { return CORTE[k].from === m[1] && CORTE[k].to === m[2]; });
      I.from = m[1]; I.to = m[2]; I.coRte = null; S.ac.lat = APT[m[1]].lat; S.ac.lon = APT[m[1]].lon;
      if (list.length) { go(sd2, 'ROUTESEL', { list: list, i: 0 }); return; }
      S.act = newPlan(m[1], m[2]); S.tmpy = null;
    };
    lsk['2L'] = function (sp) {
      if (!pl) return 'NOT ALLOWED';
      if (sp === 'CLR' || sp === 'NONE') { setAltn(pl, null); return; }
      var m = /^([A-Z]{4})(?:\/([A-Z0-9]+))?$/.exec(sp || ''); if (!m) return 'FORMAT ERROR';
      if (!APT[m[1]]) return 'NOT IN DATA BASE';
      var rte = m[2] || Object.keys(CORTE).filter(function (k) { return CORTE[k].from === pl.dest && CORTE[k].to === m[1]; })[0] || null;
      if (m[2] && !CORTE[m[2]]) return 'NOT IN DATA BASE';
      setAltn(pl, m[1], rte); if (S.tmpy) setAltn(S.tmpy.plan, m[1], rte);
    };
    lsk['3L'] = function (sp) { if (!sp || sp.length > 8) return 'FORMAT ERROR'; I.flt = sp; };
    lsk['5L'] = function (sp) { var v = +sp; if (!/^\d{1,3}$/.test(sp)) return 'FORMAT ERROR'; if (v > 999) return 'ENTRY OUT OF RANGE'; I.ci = v; };
    lsk['5R'] = function (sp) { var v = +sp; if (!/^\d{4,5}$/.test(sp)) return 'FORMAT ERROR'; I.tropo = v; };
    lsk['6L'] = function (sp) { return setCrz(sp); };
    sd.ctx.slew = function () { go(sd, 'INITB'); };
  };
  function setCrz(sp) {
    var m = /^(?:FL)?(\d{2,3})(?:\/-?\d+)?$/.exec(sp || ''); if (!m) return 'FORMAT ERROR';
    var fl = +m[1]; if (fl > 398 || fl < 10) return 'ENTRY OUT OF RANGE';
    S.init.crz = fl;
    var pl = S.act, warn = pl && pl.legs.some(function (L) { return L.alt && L.alt.v > fl * 100; });
    if (S.phase === 'DESCENT' || S.phase === 'APPROACH') S.phase = S.ac.alt < fl * 100 ? 'CLIMB' : 'CRUISE';
    if (warn) return { msg: 'ALT CSTR ABOVE CRZ FL' };
  }
  PAGES.ROUTESEL = function (sc, lsk, sd) {
    var list = sd.ctx.list, i = sd.ctx.i, k = list[i], c = CORTE[k];
    sc.C(0, 'ROUTE SELECTION'); sc.R(0, (i + 1) + '/' + list.length + ' ', 'w', true);
    sc.L(1, ' CO RTE', 'w', true); sc.L(2, k, 'g'); sc.R(1, 'FROM/TO ', 'w', true); sc.R(2, c.from + '/' + c.to, 'g');
    var ln = c.route.map(function (r) { return typeof r === 'string' ? r : r[0] + ' ' + r[1]; }).join(' ');
    sc.L(3, ' VIA', 'w', true); sc.L(4, (c.sid || 'NO SID') + ' ' + ln.slice(0, 16), 'g'); sc.L(6, ln.slice(16, 40), 'g');
    sc.L(7, ' ARRIVAL', 'w', true); sc.L(8, (c.star || 'NO STAR') + ' ' + (c.appr || ''), 'g');
    sc.L(9, ' ALTN', 'w', true); sc.L(10, c.altn ? CORTE[c.altn].to + '/' + c.altn : 'NONE', 'g');
    sc.L(12, '<RETURN'); sc.R(12, 'INSERT*', 'a');
    lsk['6L'] = function (sp, s2) { S.init.coRte = null; S.act = newPlan(S.init.from, S.init.to); go(s2, 'INITA'); return KEEP; };
    lsk['6R'] = function (sp, s2) { S.init.coRte = k; S.act = fromCoRte(k); S.tmpy = null; go(s2, 'INITA'); return KEEP; };
    sd.ctx.slew = function (d) { sd.ctx.i = (i + d + list.length) % list.length; };
  };
  PAGES.INITB = function (sc, lsk, sd) {
    var I = S.init, pr = S.act ? preds(S.act) : null, trip = pr && pr.destFob != null ? (I.block - I.taxi - pr.destFob) : null;
    var tripT = pr && pr.destT != null ? pr.destT - pr.legs[0].t : null, rsv = trip != null ? trip * I.rsv / 100 : null, altn = altnFuel(), fin = 1.1;
    var extra = trip != null ? I.block - I.taxi - trip - rsv - (altn || 0) - fin : null;
    sc.C(0, 'INIT'); sc.L(0, ' ←', 'w');
    sc.L(1, 'TAXI', 'w', true); sc.L(2, t1(I.taxi), 'c');
    sc.L(3, 'TRIP/TIME', 'w', true); sc.L(4, trip != null ? t1(trip) + '/' + hhmm(tripT).slice(0, 2) + hhmm(tripT).slice(2) : '---.-/----', 'g');
    sc.L(5, 'RTE RSV/%', 'w', true); sc.L(6, (rsv != null ? t1(rsv) : '---.-') + '/' + t1(I.rsv), 'c');
    sc.L(7, 'ALTN/TIME', 'w', true); sc.L(8, altn != null ? t1(altn) + '/----' : '---.-/----', 'g');
    sc.L(9, 'FINAL/TIME', 'w', true); sc.L(10, t1(fin) + '/0030', 'c');
    sc.L(11, 'EXTRA/TIME', 'w', true); sc.L(12, extra != null ? t1(extra) + '/----' : '---.-/----', 'g');
    sc.R(1, 'ZFW/ZFWCG', 'w', true); sc.R(2, I.zfw != null ? t1(I.zfw) + '/' + t1(I.cg) : '□□.□/□□.□', I.zfw != null ? 'c' : 'a');
    sc.R(3, 'BLOCK', 'w', true); sc.R(4, I.block != null ? t1(I.block) : '□□.□', I.block != null ? 'c' : 'a');
    sc.R(7, 'TOW/', 'w', true); sc.R(8, I.zfw && I.block ? t1(I.zfw + I.block - I.taxi) : '---.-', 'g');
    sc.R(9, 'LW', 'w', true); sc.R(10, I.zfw && pr && pr.destFob != null ? t1(I.zfw + pr.destFob) : '---.-', 'g');
    lsk['1L'] = function (sp) { if (!/^\d{1,2}(\.\d)?$/.test(sp || '')) return 'FORMAT ERROR'; I.taxi = +sp; };
    lsk['3L'] = function (sp) { var m = /^\/(\d{1,2}(\.\d)?)$/.exec(sp || ''); if (!m) return 'FORMAT ERROR'; I.rsv = +m[1]; };
    lsk['1R'] = function (sp) { var m = /^(\d{2}(?:\.\d)?)\/(\d{2}(?:\.\d)?)$/.exec(sp || ''); if (!m) return 'FORMAT ERROR'; if (+m[1] < 35 || +m[1] > 64.3) return 'ENTRY OUT OF RANGE'; I.zfw = +m[1]; I.cg = +m[2]; };
    lsk['2R'] = function (sp) { if (!/^\d{1,2}(\.\d)?$/.test(sp || '')) return 'FORMAT ERROR'; I.block = +sp; };
    sd.ctx.slew = function () { go(sd, 'INITA'); };
  };
  function altnFuel() {
    var pl = S.act; if (!pl || !pl.altn) return null;
    var d = 0, last = pl.legs[destIdx(pl)]; pl.legs.forEach(function (L) { if (L.seg === 'altn' && !L.noPos && L.type !== 'DISCO') { d += gdist(last, L); last = L; } });
    var fl = d < 100 ? 100 : d < 200 ? 220 : 310;
    return Math.round((0.3 + d * (fl === 100 ? 0.0075 : fl === 220 ? 0.0062 : 0.0055)) * 10) / 10;
  }

  /* F-PLN A / B */
  PAGES.FPLN = function (sc, lsk, sd) {
    var dt = S.tmpy && S.tmpy.dir, pl = S.tmpy ? S.tmpy.plan : S.act;
    if (!pl) { sc.C(6, 'NO F-PLN', 'w'); sc.C(8, 'USE INIT A', 'w', true); return; }
    var tm = !!S.tmpy, pr = preds(pl), items = fplnItems(pl, pr), B = sd.ctx.b;
    sd.scroll = Math.max(0, Math.min(sd.scroll, items.length - 1));
    var flt = S.init.flt || '';
    sc.put(0, 0, tm ? 'TMPY' : '', 'y'); sc.put(0, tm ? 5 : 1, pl.offset ? 'OFFSET ' + pl.offset.side + pl.offset.nm : 'FROM', 'w'); sc.R(0, flt, 'w', true);
    for (var r = 0; r < 5; r++) {
      var it = items[sd.scroll + r], row = 2 + r * 2; if (!it) break;
      if (r === 0 && sd.scroll === 0) sc.put(1, 8, B ? 'EFOB' : 'UTC', 'w', true), sc.R(1, B ? 'T.WIND ' : 'SPD/ALT ', 'w', true);
      if (it.k === 'end') { sc.L(row, it.t, 'w'); continue; }
      if (it.k === 'ps') {
        sc.L(row, it.p.id, 'w'); sc.put(row, 8, B ? '' : hhmm(it.p.t), 'g', true);
        sc.R(row, '   /' + pad(altStr(it.p.alt, pl), 6), 'g', true);
        if (it.p.step) { (function (st) { lsk[(r + 1) + 'L'] = function (sp) { if (sp !== 'CLR') return KEEP; return rev(function (p) { p.steps = p.steps.filter(function (o) { return !(o.id === st.id && o.fl === st.fl); }); }); }; })(it.p.step); }
        else lsk[(r + 1) + 'L'] = function (sp) { return sp ? 'NOT ALLOWED' : KEEP; };
        continue;
      }
      var i = it.i, L = pl.legs[i], P = pr.legs[i] || {};
      if (L.type === 'DISCO') { sc.L(row, '---F-PLN DISCONTINUITY--', 'w'); (function (i2) { lsk[(r + 1) + 'L'] = function (sp, s2) { return fplnLeft(sp, s2, i2); }; })(i); continue; }
      var col = legCol(L, tm), prev = lastPos(pl.legs.slice(0, i));
      if (r > 0 || sd.scroll > 0) {
        var note = i === 0 ? '' : legNote(L, prev), d = i > 0 && pr.legs[i - 1] ? Math.round(P.s - pr.legs[i - 1].s) : null;
        sc.L(row - 1, ' ' + note, 'w', true); if (d != null && !L.noPos && L.type !== 'HM') sc.put(row - 1, 9, pad(d, 3), 'w', true);
      }
      var id = L.type === 'HM' || L.type === 'HF' || L.type === 'HA' ? L.id : (i === 0 && L.type === 'TP' ? L.id : L.id);
      sc.L(row, id + (L.ovfy ? 'Δ' : ''), i === 0 && !tm ? 'w' : (i === 1 && !tm && S.phase !== 'PREFLIGHT' ? 'w' : col));
      if (L.type === 'HM') {
        var showExit = (i === 1 && S.ac.hold) || (i === 2 && !S.ac.hold && S.phase !== 'PREFLIGHT');
        if (showExit && !tm) { sc.R(row, S.ac.immExit ? 'RESUME HOLD*' : 'IMM EXIT*', 'a'); (function (i2) { lsk[(r + 1) + 'R'] = function () { if (S.ac.hold) S.ac.immExit = !S.ac.immExit; else S.act.legs.splice(i2, 1); return KEEP; }; })(i); }
        else sc.R(row, (L.hold.db ? 'DB ' : '') + 'INB ' + pad(L.hold.inb, 3).replace(/ /g, '0') + '°', col, true);
      } else if (!B && (i <= destIdx(pl) || P.t != null)) {
        sc.put(row, 8, pr.ok ? hhmm(P.t) : '----', i === 0 ? 'w' : col, true);
        var rt = pr.rta && pr.rta.idx === i;
        if (rt) sc.put(row, 7, '*', pr.rta.made ? 'm' : 'a', true);
        var sstr = L.spd ? spdStr(Math.min(L.spd, P.spd || 999)) : spdStr(P.spd), astr = altStr(P.alt, pl);
        var right = (L.spd ? '*' : ' ') + pad(sstr, 3) + '/' + (L.alt ? '*' : ' ') + pad(L.alt && P.alt == null ? cstrStr(L.alt) : astr, 5);
        if (P.alt == null && L.alt) right = '    /' + pad(cstrStr(L.alt), 6);
        if (!pr.ok) right = (L.spd ? ' ' + pad(L.spd, 3) : ' ---') + '/' + (L.alt ? pad(cstrStr(L.alt), 6) : ' -----');
        sc.R(row, right, pr.ok ? col : 'm', true);
        if (pr.ok && L.spd) sc.put(row, 24 - right.length, '*', P.spdMiss ? 'a' : 'm', true);
        if (pr.ok && L.alt && P.alt != null) sc.put(row, 24 - right.length + 5, '*', P.miss ? 'a' : 'm', true);
        if (!pr.ok && (L.alt || L.spd)) sc.R(row, right, 'm', true);
      } else if (B) {
        sc.put(row, 8, P.fob != null ? t1(P.fob) : '--.-', col, true);
        sc.R(row, L.wind ? pad(L.wind.dir, 3).replace(/ /g, '0') + '°/' + pad(L.wind.spd, 3) : '---°/---', 'c', true);
      }
      (function (i2) {
        lsk[(r + 1) + 'L'] = function (sp, s2) { return fplnLeft(sp, s2, i2); };
        if (!lsk[(r + 1) + 'R']) lsk[(r + 1) + 'R'] = function (sp, s2) { return fplnRight(sp, s2, i2); };
      })(i);
    }
    // Line 6: destination, or the TMPY prompts.
    if (tm) {
      if (dt) dirRow6(sc);
      else { sc.L(12, S.tmpy.revs > 1 && !S.tmpy.undoUsed ? '<UNDO' : '<ERASE', 'a'); sc.R(12, 'INSERT*', 'a'); }
      lsk['6L'] = function () { if (!dt && S.tmpy.revs > 1 && !S.tmpy.undoUsed) undo(); else eraseTmpy(); return KEEP; };
      lsk['6R'] = function () { insertTmpy(); return KEEP; };
    } else {
      var di = destIdx(pl), Dp = pr.legs[di];
      sc.L(11, ' DEST   UTC  DIST  EFOB', 'w', true);
      sc.L(12, pl.legs[di].id, 'w'); sc.put(12, 8, pr.ok ? hhmm(Dp.t) : '----', 'g', true); sc.put(12, 13, pad(Math.round(Dp.s), 4), 'g', true); sc.R(12, Dp.fob != null ? t1(Dp.fob) : '--.-', 'g', true);
      lsk['6L'] = function (sp, s2) { if (sp) return 'NOT ALLOWED'; go(s2, 'LATREV', { i: di }); return KEEP; };
      lsk['6R'] = function (sp, s2) { if (sp) return 'NOT ALLOWED'; go(s2, 'VERTREV', { i: di }); return KEEP; };
    }
    sd.ctx.scroll = function (d) { sd.scroll = Math.max(0, Math.min(items.length - 1, sd.scroll + d)); };
    sd.ctx.slew = function () { sd.ctx.b = !sd.ctx.b; };
    sd.ctx.airport = function () {
      for (var k = sd.scroll + 1; k < items.length; k++) { var q = items[k]; if (q.k === 'leg' && pl.legs[q.i].type === 'APT') { sd.scroll = k; return; } }
      sd.scroll = 0;
    };
  };
  function fplnLeft(sp, sd, i) {
    var pl = ed(), L = pl.legs[i];
    if (!sp) { if (L.type === 'DISCO') return KEEP; go(sd, 'LATREV', { i: i, id: L.id }); return KEEP; }
    if (sp === 'CLR') return rev(function (p) { return deleteAt(p, i); });
    if (sp === 'Δ') {
      if (L.type === 'DISCO' || L.type === 'HM' || i === 0) return 'NOT ALLOWED';
      return rev(function (p) { p.legs[i].ovfy = !p.legs[i].ovfy; });
    }
    var m = PD_RE.exec(sp);
    if (m && /\d/.test(m[2]) && /^[+-]/.test(m[2]) || (m && +m[2] !== 0 && m[1] === L.id)) {
      if (m[1] !== L.id) return 'FORMAT ERROR';
      if (i === 0) return 'NOT ALLOWED';
      return rev(function (p) {
        var at = alongTrack(p, i, +m[2]); if (!at) return 'ENTRY OUT OF RANGE';
        var w = storePilot('PD', at.pos.lat, at.pos.lon, sp), nl = wptLeg(w.id, p.legs[i].seg, at.pos);
        p.legs.splice(at.at, 0, nl);
      });
    }
    if (L.type === 'APT' && i === 0) return 'NOT ALLOWED';
    var w = lookup(sp); if (typeof w === 'string') return w;
    return rev(function (p) { return insertWpt(p, i, w); });
  }
  function fplnRight(sp, sd, i) {
    var L = ed().legs[i];
    if (!sp) { if (L.type === 'DISCO') return KEEP; go(sd, 'VERTREV', { i: i, id: L.id }); return KEEP; }
    if (sp === 'CLR') return rev(function (p) { delete p.legs[i].alt; delete p.legs[i].spd; });
    var m = /^(\d{3})?(?:\/([+-]?(?:FL)?\d{2,5}))?$/.exec(sp);
    if (!m || (!m[1] && !m[2])) return 'FORMAT ERROR';
    return rev(function (p) { return setCstr(p.legs[i], m[1], m[2]); });
  }
  function setCstr(L, spd, alt) {
    if (L.type === 'DISCO' || L.type === 'APT' && L.seg === 'dep' || L.ga) return 'NOT ALLOWED';
    var msg = null;
    if (spd) { if (+spd < 100 || +spd > 350) return 'ENTRY OUT OF RANGE'; L.spd = +spd; }
    if (alt) {
      var t = alt[0] === '+' || alt[0] === '-' ? alt[0] : '@', v = parseAlt(alt.replace(/^[+-]/, '').replace(/^(\d{2,3})$/, 'FL$1'));
      if (/^[+-]?\d{4,5}$/.test(alt)) v = +alt.replace(/^[+-]/, '');
      if (v == null || v > 39800) return 'ENTRY OUT OF RANGE';
      L.alt = { t: t, v: v };
      if (S.init.crz && v > S.init.crz * 100) msg = { msg: 'ALT CSTR ABOVE CRZ FL' };
    }
    return msg;
  }

  /* LAT REV */
  PAGES.LATREV = function (sc, lsk, sd) {
    var pl = ed(), i = findCtx(pl, sd), L = pl.legs[i];
    if (!L) { go(sd, 'FPLN'); return PAGES.FPLN(sc, lsk, sd); }
    var origin = i === 0 && L.type === 'APT' && S.phase === 'PREFLIGHT', from = i === 0, dest = !!L.dest, ppos = from && S.phase !== 'PREFLIGHT';
    title(sc, 'LAT REV FROM ' + (ppos ? 'PPOS' : L.id), !!S.tmpy);
    sc.C(1, ppos ? fmtLat(S.ac) + '/' + fmtLon(S.ac) : fmtLat(L) + '/' + fmtLon(L), 'g', true);
    if (origin) { sc.L(2, '<DEPARTURE'); lsk['1L'] = function (sp, s2) { go(s2, 'DEP', { mode: 'RWY' }); return KEEP; }; }
    if (dest) { sc.R(2, 'ARRIVAL>'); lsk['1R'] = function (sp, s2) { go(s2, 'ARR', { mode: 'APPR' }); return KEEP; }; }
    if (from && !origin) { sc.L(2, '<OFFSET'); lsk['1L'] = function (sp, s2) { go(s2, 'OFFSET'); return KEEP; }; }
    if (!L.seg || L.seg !== 'altn') { sc.L(4, '<FIX INFO'); lsk['2L'] = function (sp, s2) { go(s2, 'FIX', {}); return KEEP; }; }
    if (!dest && !origin && L.type !== 'HM') { sc.L(6, '<HOLD'); lsk['3L'] = function (sp, s2) { if (S.tmpy && S.tmpy.dir) return 'DIR TO IN PROCESS'; return openHold(s2, i, ppos); }; }
    if (dest) { sc.L(6, '<ALTN'); lsk['3L'] = function (sp, s2) { go(s2, 'ALTN'); return KEEP; }; }
    if (!dest && L.seg !== 'altn' && L.seg !== 'miss') {
      sc.R(3, 'LL XING/INCR/NO', 'w', true); sc.R(4, '[  ]°/[ ]°/[]', 'c');
      lsk['2R'] = function (sp) { return llXing(i, sp); };
      sc.R(5, 'NEXT WPT ', 'w', true); sc.R(6, '[    ]', 'c');
      lsk['3R'] = function (sp) {
        if (!sp) return KEEP;
        if (i + 1 === 1 && S.phase !== 'PREFLIGHT' && S.ac.mode === 'NAV') return 'NOT ALLOWED';
        var w = lookup(sp); if (typeof w === 'string') return w;
        return rev(function (p) { return insertWpt(p, i + 1, w); });
      };
      if (!from) { sc.R(7, 'NEW DEST ', 'w', true); sc.R(8, '[  ]', 'c'); lsk['4R'] = function (sp) { if (!sp) return KEEP; return rev(function (p) { return newDest(p, i, sp); }); }; }
      sc.R(10, 'AIRWAYS>'); lsk['5R'] = function (sp, s2) { if (S.tmpy && S.tmpy.dir) return 'DIR TO IN PROCESS'; go(s2, 'AWY', { i: i, id: L.id, rows: [], base: clone(ed()) }); return KEEP; };
      if (pl.altn && !from) { sc.L(10, '<ENABLE ALTN', 'c'); lsk['5L'] = function (sp, s2) { var r = rev(function (p) { return enableAltn(p, i); }); if (typeof r === 'string') return r; s2.msg = 'USING COST INDEX 0'; go(s2, 'FPLN'); return KEEP; }; }
    }
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };
  function findCtx(pl, sd) {
    var i = sd.ctx.i;
    if (sd.ctx.id && (!pl.legs[i] || pl.legs[i].id !== sd.ctx.id)) for (var k = 0; k < pl.legs.length; k++) if (pl.legs[k].id === sd.ctx.id) return k;
    return i;
  }
  function llXing(i, sp) {
    var m = /^([NSEW])?(\d{2,3})([NSEW])?\/(\d{1,2})\/(\d{1,2})$/.exec(sp || ''); if (!m) return 'FORMAT ERROR';
    var hemi = m[1] || m[3]; if (!hemi) return 'FORMAT ERROR';
    var isLat = hemi === 'N' || hemi === 'S', v0 = +m[2] * (hemi === 'S' || hemi === 'W' ? -1 : 1), inc = +m[4] * (hemi === 'S' || hemi === 'W' ? -1 : 1), n = +m[5];
    return rev(function (p) {
      var pr = preds(p), added = 0;
      for (var k = 0; k < n; k++) {
        var v = v0 + inc * k, legs = p.legs, di = destIdx(p);
        for (var j = i + 1; j <= di; j++) {
          var a = lastPos(legs.slice(0, j)), b = legs[j]; if (!a || b.type === 'DISCO' || b.noPos) continue;
          var va = isLat ? a.lat : a.lon, vb = isLat ? b.lat : b.lon;
          if ((va - v) * (vb - v) > 0 || va === vb) continue;
          var u = (v - va) / (vb - va), q = lerpPos(a, b, u), s = (pr.legs[j - 1] ? pr.legs[j - 1].s : 0) + gdist(a, q);
          if ((pr.tc != null && s < pr.tc) || (pr.td != null && s > pr.td)) break; // cruise only
          var id = isLat ? (v < 0 ? 'S' : 'N') + Math.abs(v) : (v < 0 ? 'W' : 'E') + String(Math.abs(v)).padStart(3, '0');
          if (legs.some(function (o) { return o.id === id; })) break;
          legs.splice(j, 0, { id: id, type: 'TF', lat: q.lat, lon: q.lon, seg: legs[j].seg, llx: true }); added++;
          break;
        }
      }
      if (!added) return 'NOT ALLOWED';
    });
  }
  function openHold(sd, i, ppos) {
    var r = rev(function (p) {
      if (ppos) { var t = { id: 'PPOS', type: 'TF', lat: S.ac.lat, lon: S.ac.lon, seg: p.legs[0].seg }; p.legs.splice(1, 0, t); insertHold(p, 1); }
      else insertHold(p, i);
    });
    if (typeof r === 'string') return r;
    go(sd, 'HOLD', { i: ppos ? 1 : i, id: ppos ? 'PPOS' : ed().legs[i].id });
    return KEEP;
  }

  /* DEPARTURE / ARRIVAL */
  PAGES.DEP = function (sc, lsk, sd) {
    var pl = ed(), apt = pl.origin, sids = SID[apt] || {}, mode = sd.ctx.mode || 'RWY';
    title(sc, 'DEPARTURE FROM ' + apt, !!S.tmpy);
    sc.L(1, ' RWY      SID     TRANS', 'w', true);
    var cl = S.tmpy ? 'y' : 'g';
    sc.L(2, pl.rwy || '---', cl); sc.put(2, 7, pl.sid || (pl.rwy ? 'NONE' : '------'), cl); sc.R(2, pl.trans || '------', cl);
    var list = [];
    if (mode === 'RWY') list = Object.keys(APT[apt].rwys).map(function (r) { return { t: r, s: 'CRS' + pad(APT[apt].rwys[r], 3).replace(/ /g, '0'), f: function (p) { setDeparture(p, r, null, null); sd.ctx.mode = 'SID'; } }; });
    if (mode === 'SID') list = Object.keys(sids).filter(function (k) { return sids[k].rwys.indexOf(pl.rwy) >= 0; }).map(function (k) { return { t: k, f: function (p) { setDeparture(p, p.rwy, k, null); sd.ctx.mode = 'TRANS'; } }; }).concat([{ t: 'NO SID', f: function (p) { setDeparture(p, p.rwy, null, null); } }]);
    if (mode === 'TRANS') list = Object.keys((sids[pl.sid] || { trans: {} }).trans).map(function (k) { return { t: k, f: function (p) { setDeparture(p, p.rwy, p.sid, k); } }; }).concat([{ t: 'NO TRANS', f: function (p) { setDeparture(p, p.rwy, p.sid, null); } }]);
    sc.L(3, ' ' + { RWY: 'AVAILABLE RUNWAYS', SID: 'SIDS     AVAILABLE', TRANS: 'TRANS    AVAILABLE' }[mode], 'w', true);
    sd.scroll = Math.max(0, Math.min(sd.scroll, Math.max(0, list.length - 4)));
    list.slice(sd.scroll, sd.scroll + 4).forEach(function (o, k) {
      sc.L(4 + k * 2, '<' + o.t, 'c'); if (o.s) sc.R(4 + k * 2, o.s, 'c', true);
      lsk[(k + 2) + 'L'] = function () { if (S.phase !== 'PREFLIGHT' && mode === 'RWY') return 'NOT ALLOWED'; var r = rev(function (p) { o.f(p); }); if (typeof r === 'string') return r; if (mode === 'RWY') S.depPicked = true; return KEEP; };
    });
    sc.R(1, '', 'w'); sc.L(0, S.tmpy ? 'TMPY' : '', 'y');
    sd.ctx.slew = function (d) { var ms = ['RWY', 'SID', 'TRANS'], k = (ms.indexOf(mode) + d + 3) % 3; sd.ctx.mode = ms[k]; sd.scroll = 0; };
    sd.ctx.scroll = function (d) { sd.scroll = Math.max(0, sd.scroll + d); };
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };
  PAGES.ARR = function (sc, lsk, sd) {
    var pl = ed(), apt = pl.dest, ap = APPR[apt] || {}, st = STAR[apt] || {}, mode = sd.ctx.mode || 'APPR', cl = S.tmpy ? 'y' : 'g';
    title(sc, 'ARRIVAL TO ' + apt, !!S.tmpy);
    sc.L(1, ' APPR    VIA    STAR', 'w', true); sc.R(1, 'TRANS', 'w', true);
    sc.L(2, pl.appr || '------', cl); sc.put(2, 8, pl.via || (pl.appr ? 'NONE' : '-----'), cl); sc.put(2, 14, (pl.star || '------').slice(0, 7), cl); sc.R(4, pl.strans ? 'TRANS ' + pl.strans : '', cl, true);
    var apprRwy = pl.appr && ap[pl.appr] ? ap[pl.appr].rwy : null, list = [];
    function A(k, f) { return { t: k, f: f }; }
    if (mode === 'APPR') list = Object.keys(ap).map(function (k) { return A(k, function (p) { var r = setArrival(p, { appr: k, via: null }); sd.ctx.mode = 'VIA'; return r; }); });
    if (mode === 'VIA') list = (pl.appr ? Object.keys(ap[pl.appr].vias) : []).map(function (k) { return A(k, function (p) { var r = setArrival(p, { via: k }); sd.ctx.mode = 'STAR'; return r; }); }).concat([A('NO VIA', function (p) { var r = setArrival(p, { via: null }); sd.ctx.mode = 'STAR'; return r; })]);
    if (mode === 'STAR') list = Object.keys(st).filter(function (k) { return !apprRwy || st[k].rwys.indexOf(apprRwy) >= 0; }).map(function (k) { return A(k, function (p) { var r = setArrival(p, { star: k, strans: null }); sd.ctx.mode = 'TRANS'; return r; }); }).concat([A('NO STAR', function (p) { return setArrival(p, { star: null, strans: null }); })]);
    if (mode === 'TRANS') list = Object.keys((st[pl.star] || { trans: {} }).trans).map(function (k) { return A(k, function (p) { return setArrival(p, { strans: k }); }); }).concat([A('NO TRANS', function (p) { return setArrival(p, { strans: null }); })]);
    sc.L(3, ' ' + { APPR: 'APPR AVAILABLE', VIA: 'APPR VIAS', STAR: 'STARS AVAILABLE', TRANS: 'TRANS AVAILABLE' }[mode], 'w', true);
    sd.scroll = Math.max(0, Math.min(sd.scroll, Math.max(0, list.length - 4)));
    list.slice(sd.scroll, sd.scroll + 4).forEach(function (o, k) {
      sc.L(4 + k * 2, '<' + o.t, 'c');
      if (mode === 'APPR' && ap[o.t]) sc.R(4 + k * 2, 'RWY ' + ap[o.t].rwy + ' CRS' + pad(APT[apt].rwys[ap[o.t].rwy], 3).replace(/ /g, '0'), 'c', true);
      lsk[(k + 2) + 'L'] = function (sp, s2) { var msg = null; var r = rev(function (p) { msg = o.f(p) || null; }); if (typeof r === 'string') return r; if (msg) s2.msg = msg; return KEEP; };
    });
    sd.ctx.slew = function (d) { var ms = ['APPR', 'VIA', 'STAR', 'TRANS'], k = (ms.indexOf(mode) + d + 4) % 4; sd.ctx.mode = ms[k]; sd.scroll = 0; };
    sd.ctx.scroll = function (d) { sd.scroll = Math.max(0, sd.scroll + d); };
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };

  /* AIRWAYS */
  PAGES.AWY = function (sc, lsk, sd) {
    var c = sd.ctx, rows = c.rows;
    title(sc, 'AIRWAYS FROM ' + c.id, !!S.tmpy);
    for (var r = 0; r < 5; r++) {
      var row = rows[r] || {}, y = 2 + r * 2, open = r === 0 || (rows[r - 1] && rows[r - 1].via);
      if (!open) break;
      sc.L(y - 1, ' VIA', 'w', true); sc.R(y - 1, 'TO ', 'w', true);
      sc.L(y, row.via || '[   ]', row.via ? 'y' : 'c'); sc.R(y, row.to ? row.to.id : '[   ]', row.to ? (row.to.auto ? 'y' : 'y') : 'c');
      (function (r2) {
        lsk[(r2 + 1) + 'L'] = function (sp) {
          if (!sp) return KEEP;
          if (!AWY[sp]) return 'NOT IN DATA BASE';
          if (r2 === 0) { if (AWY[sp].indexOf(c.id) < 0) return 'AWY/WPT MISMATCH'; rows[0] = { via: sp }; rows.length = 1; return; }
          var prev = rows[r2 - 1], startOnPrev = prev.to && !prev.to.auto ? null : (r2 === 1 ? c.id : (rows[r2 - 2].to ? rows[r2 - 2].to.id : null));
          var ix = awyIntersect(prev.via, r2 === 1 ? c.id : (rows[r2 - 2].to.x ? rows[r2 - 2].to.prevB : rows[r2 - 2].to.id), sp);
          if (typeof ix === 'string') return ix;
          ix.auto = true; prev.to = ix; rows[r2] = { via: sp }; rows.length = r2 + 1;
          return restring(c);
        };
        lsk[(r2 + 1) + 'R'] = function (sp) {
          if (!sp || !rows[r2] || !rows[r2].via) return sp ? 'NOT ALLOWED' : KEEP;
          var a = AWY[rows[r2].via], start = r2 === 0 ? c.id : (rows[r2 - 1].to.x ? rows[r2 - 1].to.prevB : rows[r2 - 1].to.id);
          if (a.indexOf(sp) < 0 || (!rows[r2 - 1] || !rows[r2 - 1].to || !rows[r2 - 1].to.x) && a.indexOf(start) < 0) return 'AWY/WPT MISMATCH';
          rows[r2].to = { id: sp }; rows.length = r2 + 1;
          return restring(c);
        };
      })(r);
    }
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };
  function restring(c) {
    var i = -1; c.base.legs.forEach(function (L, k) { if (L.id === c.id && i < 0) i = k; });
    var pl = applyAirways(c.base, i, c.rows); if (typeof pl === 'string') return pl;
    if (S.tmpy && S.tmpy.dir) return 'DIR TO IN PROCESS';
    if (!S.tmpy) S.tmpy = { plan: pl, revs: 1, prev: null, undoUsed: false };
    else { if (!c.counted) { S.tmpy.prev = clone(S.tmpy.plan); S.tmpy.revs++; } S.tmpy.plan = pl; }
    c.counted = true;
    if (partsFull(pl)) return 'F-PLN FULL';
  }

  /* HOLD */
  PAGES.HOLD = function (sc, lsk, sd) {
    var pl = ed(), i = findCtx(pl, sd), H = pl.legs[i + 1];
    if (!H || H.type !== 'HM') { go(sd, 'FPLN'); return PAGES.FPLN(sc, lsk, sd); }
    var h = H.hold, pr = preds(pl), alt = pr && pr.legs[i] ? pr.legs[i].alt : S.ac.alt, spd = holdSpeed(alt), dist = Math.round(spd * h.time / 60 * 10) / 10;
    title(sc, 'HOLD AT ' + pl.legs[i].id, !!S.tmpy);
    sc.L(1, 'INB CRS', 'w', true); sc.L(2, pad(h.inb, 3).replace(/ /g, '0') + '°', 'c');
    sc.L(3, 'TURN', 'w', true); sc.L(4, h.turn, 'c');
    sc.L(5, 'TIME/DIST', 'w', true); sc.L(6, t1(h.time) + '/' + t1(dist), 'c');
    sc.R(1, h.db ? '' : 'COMPUTED ', 'w', true); sc.R(2, h.db ? '<COMPUTED' : '', 'w');
    if (HOLDS[pl.legs[i].id]) { sc.R(4, h.db ? '' : '<DATABASE', 'w'); sc.R(3, h.db ? 'DATABASE ' : '', 'w', true); }
    lsk['1R'] = function () { return rev(function (p) { insertHold(p, i, 'COMP'); }) || KEEP; };
    lsk['2R'] = function () { if (!HOLDS[pl.legs[i].id]) return KEEP; return rev(function (p) { insertHold(p, i, 'DB'); }) || KEEP; };
    var lastExit = holdLastExit(pl, pr, i);
    sc.L(7, ' SPD   LAST EXIT', 'w', true); sc.L(8, String(spd), 'g'); sc.put(8, 6, lastExit ? hhmm(lastExit.t) + '  ' + t1(lastExit.f) : '----  --.-', 'm');
    sc.L(9, '  UTC  FUEL', 'w', true);
    lsk['1L'] = function (sp) { if (!/^\d{1,3}$/.test(sp || '') || +sp > 360) return 'FORMAT ERROR'; return rev(function (p) { p.legs[i + 1].hold.inb = +sp % 360 || 360; p.legs[i + 1].hold.db = false; }); };
    lsk['2L'] = function (sp) { if (sp !== 'L' && sp !== 'R') return 'FORMAT ERROR'; return rev(function (p) { p.legs[i + 1].hold.turn = sp; p.legs[i + 1].id = 'HOLD ' + sp; p.legs[i + 1].hold.db = false; }); };
    lsk['3L'] = function (sp) {
      var m = /^(\d(?:\.\d)?)?(?:\/(\d{1,2}(?:\.\d)?))?$/.exec(sp || ''); if (!m || (!m[1] && !m[2])) return 'FORMAT ERROR';
      return rev(function (p) { var hh = p.legs[i + 1].hold; hh.time = m[1] ? +m[1] : Math.round(+m[2] / spd * 600) / 10; hh.db = false; });
    };
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };
  function holdLastExit(pl, pr, i) {
    if (!pr || pr.destFob == null || !pr.legs[i] || pr.legs[i].fob == null) return null;
    var need = (altnFuel() || 0) + 1.1, spare = pr.destFob - need; // fuel to reach the alternate with no extra fuel
    if (spare <= 0) return { t: pr.legs[i].t, f: pr.legs[i].fob };
    return { t: pr.legs[i].t + spare / 2.4 * 3600, f: pr.legs[i].fob - spare };
  }

  /* OFFSET */
  PAGES.OFFSET = function (sc, lsk) {
    var pl = ed();
    title(sc, 'OFFSET', !!S.tmpy);
    sc.L(1, 'OFFSET', 'w', true); sc.L(2, pl.offset ? pl.offset.side + pl.offset.nm : '[ ]', pl.offset ? (S.tmpy ? 'y' : 'c') : 'c');
    sc.L(4, '1 TO 50 NM, L OR R', 'w', true);
    lsk['1L'] = function (sp) {
      if (sp === 'CLR' || sp === '0') return rev(function (p) { p.offset = null; });
      var m = /^(?:([LR])(\d{1,2})|(\d{1,2})([LR]))$/.exec(sp || ''); if (!m) return 'FORMAT ERROR';
      var nm = +(m[2] || m[3]), side = m[1] || m[4];
      if (nm < 1 || nm > 50) return 'ENTRY OUT OF RANGE';
      var to = pl.legs[1]; if (to && S.phase !== 'PREFLIGHT' && to.lat != null && gdist(S.ac, to) < 3) return 'ENTRY OUT OF RANGE';
      return rev(function (p) { p.offset = { side: side, nm: nm }; });
    };
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };
  // Offset path: from PPOS to the first hold, or the last fix before the approach.
  function offsetEnd(pl) {
    var di = destIdx(pl);
    for (var i = 1; i <= di; i++) if (pl.legs[i].type === 'HM' || pl.legs[i].fin || pl.legs[i].dest) return Math.max(1, i - (pl.legs[i].type === 'HM' ? 0 : 1));
    return di - 1;
  }

  /* FIX INFO */
  PAGES.FIX = function (sc, lsk, sd) {
    var c = S.fixRef || (S.fixRef = {}), pl = ed();
    title(sc, 'FIX INFO', !!S.tmpy);
    sc.L(1, 'REF FIX', 'w', true); sc.L(2, c.id || '[    ]', 'c');
    lsk['1L'] = function (sp) {
      if (sp === 'CLR') { S.fixRef = {}; return; }
      var w = lookup(sp); if (typeof w === 'string') return w; S.fixRef = { id: w.id, lat: w.lat, lon: w.lon, rad: [null, null], circle: null, abeam: false };
    };
    if (!c.id) { tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); }); return; }
    sc.R(3, 'UTC DIST  ALT ', 'w', true);
    [0, 1].forEach(function (k) {
      var y = 4 + k * 2, v = c.rad[k];
      sc.L(y - 1, ' RADIAL', 'w', true); sc.L(y, v != null ? pad(v, 3).replace(/ /g, '0') + '°' : '[ ]°', 'c');
      var x = v != null ? fixInter(pl, c, 'R', v) : null;
      if (x) sc.R(y, fixStr(pl, x), 'g', true);
      else if (v != null) sc.R(y, '---- ---  -----', 'w', true);
      lsk[(k + 2) + 'L'] = function (sp) {
        if (sp === 'CLR') { c.rad[k] = null; return; }
        if (!/^\d{1,3}$/.test(sp || '') || +sp > 360) return 'FORMAT ERROR'; c.rad[k] = +sp % 360;
      };
      lsk[(k + 2) + 'R'] = function () {
        if (!x) return 'NOT ALLOWED';
        var id = c.id.slice(0, 3) + pad(v, 3).replace(/ /g, '0');
        return rev(function (q) { q.legs.splice(x.i, 0, { id: id, type: 'TF', lat: x.pos.lat, lon: x.pos.lon, seg: q.legs[x.i].seg }); c.rad[k] = null; }) || KEEP;
      };
    });
    sc.L(7, ' RADIUS', 'w', true); sc.L(8, c.circle ? pad(c.circle, 3).replace(/ /g, '0') : '[ ]', 'c');
    var cx = c.circle ? fixInter(pl, c, 'C', c.circle) : null;
    if (cx) sc.R(8, fixStr(pl, cx), 'g', true);
    lsk['4L'] = function (sp) { if (sp === 'CLR') { c.circle = null; return; } if (!/^\d{1,3}$/.test(sp || '')) return 'FORMAT ERROR'; c.circle = +sp; };
    lsk['4R'] = function () {
      if (!cx) return 'NOT ALLOWED';
      return rev(function (q) { q.legs.splice(cx.i, 0, { id: 'D' + pad(c.circle, 3).replace(/ /g, '0') + c.id.slice(0, 3), type: 'TF', lat: cx.pos.lat, lon: cx.pos.lon, seg: q.legs[cx.i].seg }); c.circle = null; }) || KEEP;
    };
    var ab = c.abeam ? fixInter(pl, c, 'A') : null;
    sc.L(10, c.abeam ? (ab ? 'ABEAM' + pad(Math.round(gbrg(c, ab.pos)), 3).replace(/ /g, '0') + '°*' : 'NO ABEAM') : '<ABEAM', c.abeam ? 'c' : 'w');
    if (ab) sc.R(10, fixStr(pl, ab), 'g', true);
    lsk['5L'] = function () {
      if (!c.abeam) { c.abeam = true; return KEEP; }
      if (!ab) return 'NOT ALLOWED';
      return rev(function (q) { q.legs.splice(ab.i, 0, { id: 'AB' + c.id.slice(0, 5), type: 'TF', lat: ab.pos.lat, lon: ab.pos.lon, seg: q.legs[ab.i].seg }); c.abeam = false; }) || KEEP;
    };
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };

  /* ALTN */
  PAGES.ALTN = function (sc, lsk, sd) {
    var pl = ed(), list = (ALTNS[pl.dest] || []).slice(), c = sd.ctx;
    title(sc, 'ALTERNATE OF ' + pl.dest, !!S.tmpy);
    sc.L(1, ' ALTN  TRK  DIST  EXTRA', 'w', true);
    function extraFor(apt) {
      var pr = preds(S.act), d = gdist(APT[pl.dest], APT[apt]), af = 0.3 + d * 0.0062;
      return pr && pr.destFob != null ? pr.destFob - af - 1.1 : null;
    }
    list.slice(0, 3).forEach(function (a, k) {
      var y = 2 + k * 2, d = Math.round(gdist(APT[pl.dest], APT[a])), sel = pl.altn === a, ex = extraFor(a);
      sc.L(y, (sel ? '' : '<') + a, sel ? (S.tmpy ? 'y' : 'g') : 'c'); sc.put(y, 7, pad(Math.round(gbrg(APT[pl.dest], APT[a])), 3).replace(/ /g, '0') + '°', 'g', true); sc.put(y, 12, pad(d, 4), 'g', true); sc.R(y, ex != null ? t1(ex) : '--.-', 'g', true);
      lsk[(k + 1) + 'L'] = function () { var rte = Object.keys(CORTE).filter(function (r) { return CORTE[r].from === pl.dest && CORTE[r].to === a; })[0]; return rev(function (p) { setAltn(p, a, rte); }) || KEEP; };
    });
    sc.L(7, ' OTHER ALTN', 'w', true);
    var o = c.other;
    sc.L(8, o ? '<' + o : '[  ]', 'c');
    if (o) { var d2 = Math.round(gdist(APT[pl.dest], APT[o])), ex2 = extraFor(o); sc.put(8, 7, pad(Math.round(gbrg(APT[pl.dest], APT[o])), 3).replace(/ /g, '0') + '°', 'g', true); sc.put(8, 12, pad(d2, 4), 'g', true); sc.R(8, ex2 != null ? t1(ex2) : '--.-', 'g', true); }
    lsk['4L'] = function (sp) {
      if (!sp) { if (!o) return KEEP; var rte = Object.keys(CORTE).filter(function (r) { return CORTE[r].from === pl.dest && CORTE[r].to === o; })[0]; return rev(function (p) { setAltn(p, o, rte); }) || KEEP; }
      if (!/^[A-Z]{4}$/.test(sp)) return 'FORMAT ERROR'; if (!APT[sp]) return 'NOT IN DATA BASE'; c.other = sp;
    };
    sc.L(10, '<NO ALTN'); lsk['5L'] = function () { return rev(function (p) { setAltn(p, null); }) || KEEP; };
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'LATREV', { i: destIdx(ed()) }); });
  };

  /* DIR TO */
  PAGES.DIR = function (sc, lsk, sd) {
    if (!S.act) { sc.C(0, 'DIR TO'); sc.C(6, 'NO F-PLN', 'w'); return; }
    var c = sd.ctx, dt = S.tmpy && S.tmpy.dir;
    if (S.tmpy && !dt) { sc.C(0, 'DIR TO'); sc.C(6, 'TMPY F-PLN IN PROGRESS', 'a', true); tmpyRow6(sc, lsk); return; }
    sc.C(0, 'DIR TO');
    sc.L(1, ' WAYPOINT', 'w', true); sc.R(1, 'DIST  UTC ', 'w', true);
    sc.L(2, dt ? dt.target.id : '[     ]', dt ? 'y' : 'c');
    if (dt) { var pr = preds(S.tmpy.plan), k = 1; S.tmpy.plan.legs.forEach(function (L, j) { if (L.id === dt.target.id && k === 1) k = j; }); if (pr.legs[k]) sc.R(2, pad(Math.round(pr.legs[k].s), 4) + ' ' + hhmm(pr.legs[k].t), 'y', true); }
    var list = [], legs = S.act.legs;
    for (var j = 1; j < legs.length && list.length < 30; j++) if (legs[j].type !== 'DISCO' && !legs[j].noPos && legs[j].type !== 'HM' && legs[j].id) list.push(legs[j]);
    sd.scroll = Math.max(0, Math.min(sd.scroll, Math.max(0, list.length - 4)));
    sc.L(3, ' F-PLN WPTS', 'w', true);
    list.slice(sd.scroll, sd.scroll + 4).forEach(function (L, k2) {
      sc.L(4 + k2 * 2, '←' + L.id, 'c');
      lsk[(k2 + 2) + 'L'] = function () { return dirSet(L, c.opt || 'DIRECT') || KEEP; };
    });
    lsk['1L'] = function (sp) {
      if (!sp) return KEEP;
      var m = PD_RE.exec(sp), w;
      if (m && /^[+-]/.test(m[2])) {
        var i = -1; legs.forEach(function (L, k3) { if (L.id === m[1] && i < 0) i = k3; }); if (i < 0) return 'NOT IN DATA BASE';
        var at = alongTrack(S.act, i, +m[2]); if (!at) return 'ENTRY OUT OF RANGE'; var pw = storePilot('PD', at.pos.lat, at.pos.lon, sp); w = { id: pw.id, lat: at.pos.lat, lon: at.pos.lon };
      } else { w = lookup(sp); if (typeof w === 'string') return w; }
      return dirSet(w, c.opt || 'DIRECT');
    };
    var opt = dt ? dt.opt : (c.opt || 'DIRECT'), dr = dt ? defaultRadial(dt.target) : null;
    sc.R(4, (opt === 'DIRECT' ? '' : '') + 'DIRECT TO ' + (opt === 'DIRECT' ? '' : '>'), opt === 'DIRECT' && dt ? 'y' : 'w');
    sc.R(6, 'ABEAM PTS ' + (opt === 'ABEAM' ? '' : '>'), opt === 'ABEAM' && dt ? 'y' : 'w');
    sc.R(7, 'RADIAL IN ', 'w', true); sc.R(8, (opt === 'IN' ? pad(dt.radial, 3).replace(/ /g, '0') : (dr != null ? pad(dr, 3).replace(/ /g, '0') : '[ ]')) + '°', opt === 'IN' ? 'y' : 'c', opt !== 'IN');
    sc.R(9, 'RADIAL OUT ', 'w', true); sc.R(10, (opt === 'OUT' ? pad(dt.radial, 3).replace(/ /g, '0') : '[ ]') + '°', opt === 'OUT' ? 'y' : 'c', opt !== 'OUT');
    lsk['2R'] = function () { c.opt = 'DIRECT'; return (dt && dirSet(dt.target, 'DIRECT')) || KEEP; };
    lsk['3R'] = function () { c.opt = 'ABEAM'; return (dt && dirSet(dt.target, 'ABEAM')) || KEEP; };
    lsk['4R'] = function (sp) { if (!dt) return 'NOT ALLOWED'; var v = sp ? +sp : dr; if (sp && !/^\d{1,3}$/.test(sp) || v == null || v > 360) return 'FORMAT ERROR'; return dirSet(dt.target, 'IN', v % 360) || (sp ? undefined : KEEP); };
    lsk['5R'] = function (sp) { if (!dt) return 'NOT ALLOWED'; if (!/^\d{1,3}$/.test(sp || '') || +sp > 360) return 'FORMAT ERROR'; return dirSet(dt.target, 'OUT', +sp % 360); };
    sd.ctx.scroll = function (d) { sd.scroll = Math.max(0, sd.scroll + d); };
    if (dt) { dirRow6(sc); lsk['6L'] = function () { eraseTmpy(); return KEEP; }; lsk['6R'] = function (sp, s2) { insertTmpy(); go(s2, 'FPLN'); return KEEP; }; }
  };
  function dirSet(w, opt, radial) {
    var dt = S.tmpy && S.tmpy.dir;
    if (S.tmpy && !dt) return 'NOT ALLOWED';
    // The DIR TO temporary flight plan can be modified once.
    if (dt && dt.mods >= 1) return 'NOT ALLOWED';
    var pl = dirBuild({ id: w.id, lat: w.lat, lon: w.lon }, opt, radial);
    if (typeof pl === 'string') return pl;
    S.tmpy = { plan: pl, revs: 1, dir: { target: { id: w.id, lat: w.lat, lon: w.lon }, opt: opt, radial: radial, mods: dt ? dt.mods + 1 : 0 } };
  }

  /* VERT REV */
  PAGES.VERTREV = function (sc, lsk, sd) {
    var pl = ed(), i = findCtx(pl, sd), L = pl.legs[i];
    if (!L) { go(sd, 'FPLN'); return PAGES.FPLN(sc, lsk, sd); }
    var pr = preds(pl), P = pr.legs[i] || {}, clbSide = L.seg === 'dep' || (pr.tc != null && P.s < pr.tc), crz = !clbSide && L.seg === 'enr';
    title(sc, 'VERT REV AT ' + L.id, !!S.tmpy);
    sc.L(1, ' EFOB=' + (P.fob != null ? t1(P.fob) : '---.-'), 'w', true); sc.R(1, 'EXTRA=' + extraStr(pr), 'w', true);
    var lim = clbSide ? S.perf.clbLim : S.perf.desLim;
    sc.L(3, clbSide ? ' CLB SPD LIM' : ' DES SPD LIM', 'w', true); sc.L(4, lim ? lim[0] + '/' + altStr(lim[1]) : '[ ]/[   ]', 'm');
    lsk['2L'] = function (sp) {
      if (sp === 'CLR') { if (clbSide) S.perf.clbLim = [999, 0]; else S.perf.desLim = [999, 0]; return; }
      var m = /^(\d{3})\/((?:FL)?\d{2,5})$/.exec(sp || ''); if (!m) return 'FORMAT ERROR';
      var a = /^FL/.test(m[2]) ? parseAlt(m[2]) : +m[2]; if (a == null) return 'FORMAT ERROR';
      var v = [+m[1], a]; return rev(function () { if (clbSide) S.perf.clbLim = v; else S.perf.desLim = v; });
    };
    sc.R(3, 'RTA>', 'w'); lsk['2R'] = function (sp, s2) { go(s2, 'RTA', { id: L.id }); return KEEP; };
    sc.L(5, ' SPD CSTR', 'w', true); sc.L(6, L.spd ? String(L.spd) : '[ ]', L.spd ? 'm' : 'c');
    sc.R(5, 'ALT CSTR ', 'w', true); sc.R(6, L.alt ? cstrStr(L.alt) : '[    ]', L.alt ? 'm' : 'c');
    lsk['3L'] = function (sp) { if (sp === 'CLR') return rev(function (p) { delete p.legs[i].spd; }); if (!/^\d{3}$/.test(sp || '')) return 'FORMAT ERROR'; return rev(function (p) { return setCstr(p.legs[i], sp, null); }); };
    lsk['3R'] = function (sp) { if (sp === 'CLR') return rev(function (p) { delete p.legs[i].alt; }); if (!/^[+-]?(FL)?\d{2,5}$/.test(sp || '')) return 'FORMAT ERROR'; return rev(function (p) { return setCstr(p.legs[i], null, sp); }); };
    if (crz) {
      sc.L(7, ' MACH/START WPT', 'w', true); sc.L(8, pl.cmach && pl.cmach.id === L.id ? '.' + Math.round(pl.cmach.m * 100) + '/' + L.id : '[ ]/' + L.id, 'c');
      lsk['4L'] = function (sp) { if (sp === 'CLR') return rev(function (p) { p.cmach = null; }); var m = /^M?\.(\d{2})$/.exec(sp || ''); if (!m) return 'FORMAT ERROR'; return rev(function (p) { p.cmach = { m: +m[1] / 100, id: L.id }; }); };
    }
    sc.L(10, '<WIND'); lsk['5L'] = function (sp, s2) { go(s2, 'WIND', { i: i, id: L.id }); return KEEP; };
    if (crz || L.seg === 'enr') { sc.R(10, 'STEP ALTS>'); lsk['5R'] = function (sp, s2) { go(s2, 'STEP'); return KEEP; }; }
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };
  function extraStr(pr) {
    var I = S.init; if (!pr || pr.destFob == null) return '---.-';
    return t1(pr.destFob - (altnFuel() || 0) - 1.1 - (I.block - I.taxi - pr.destFob) * I.rsv / 100);
  }
  PAGES.WIND = function (sc, lsk, sd) {
    var pl = ed(), i = findCtx(pl, sd), L = pl.legs[i];
    title(sc, 'WIND AT ' + (L ? L.id : ''), !!S.tmpy);
    sc.L(1, ' TRU WIND', 'w', true); sc.L(2, L && L.wind ? pad(L.wind.dir, 3).replace(/ /g, '0') + '°/' + pad(L.wind.spd, 3).replace(/ /g, '0') : '[ ]°/[ ]', 'c');
    sc.L(4, 'APPLIES FROM THIS WPT ON', 'w', true);
    lsk['1L'] = function (sp) {
      if (sp === 'CLR') return rev(function (p) { delete p.legs[i].wind; });
      var m = /^(\d{1,3})\/(\d{1,3})$/.exec(sp || ''); if (!m || +m[1] > 360) return 'FORMAT ERROR';
      return rev(function (p) { p.legs[i].wind = { dir: +m[1], spd: +m[2] }; });
    };
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'VERTREV', { i: i, id: L && L.id }); });
  };

  /* RTA */
  PAGES.RTA = function (sc, lsk, sd) {
    var pl = ed(), c = sd.ctx, sol = rtaSolve(pl), pr = sol.pr;
    title(sc, 'RTA', !!S.tmpy);
    var id = pl.rta ? pl.rta.id : c.id, idx = -1; pl.legs.forEach(function (L, k) { if (L.id === id && idx < 0) idx = k; });
    sc.L(1, 'AT WPT', 'w', true); sc.L(2, id || '[    ]', 'c');
    sc.R(1, 'TIME CSTR', 'w', true); sc.R(2, pl.rta ? (pl.rta.type === '@' ? '' : pl.rta.type) + hhmmss(pl.rta.t) : '[      ]', pl.rta ? 'm' : 'c');
    if (pl.rta && pr.rta) {
      sc.L(3, ' DIST  PRED UTC', 'w', true); sc.L(4, pad(Math.round(pr.legs[idx].s), 4) + '  ' + hhmmss(pr.legs[idx].t), 'g');
      var adt = Math.min(5999, Math.round(Math.abs(pr.rta.dt)));
      sc.R(3, 'ΔT ', 'w', true); sc.R(4, (pr.rta.dt >= 0 ? '+' : '-') + pad(Math.floor(adt / 60), 2).replace(' ', '0') + ':' + pad(adt % 60, 2).replace(' ', '0'), pr.rta.made ? 'm' : 'a');
      sc.L(5, ' STATUS', 'w', true); sc.L(6, pr.rta.made ? 'MADE' : 'MISSED', pr.rta.made ? 'm' : 'a');
      sc.R(5, 'SPD FACTOR', 'w', true); sc.R(6, (sol.f * 100).toFixed(0) + '%', 'g', true);
    }
    lsk['1L'] = function (sp) {
      if (!sp) return KEEP;
      var k = -1; pl.legs.forEach(function (L, j) { if (L.id === sp && k < 0) k = j; });
      if (k < 0) return 'NOT IN DATA BASE'; if (k === 0) return 'NOT ALLOWED'; c.id = sp;
      if (pl.rta) return rev(function (p) { p.rta.id = sp; });
    };
    lsk['1R'] = function (sp) {
      if (sp === 'CLR') return rev(function (p) { p.rta = null; });
      var m = /^([+-])?(\d{2})(\d{2})(\d{2})$/.exec(sp || ''); if (!m) return 'FORMAT ERROR';
      if (+m[2] > 23 || +m[3] > 59 || +m[4] > 59) return 'ENTRY OUT OF RANGE';
      var k = idx; if (k <= 0) return 'NOT ALLOWED';
      var replaced = pl.rta && pl.rta.id !== id;
      return rev(function (p) { p.rta = { id: id, t: +m[2] * 3600 + +m[3] * 60 + +m[4], type: m[1] || '@' }; if (replaced) msgAll('RTA DELETED'); });
    };
    if (S.phase === 'PREFLIGHT') {
      var reqEtt = null;
      if (pl.rta && !S.ett) reqEtt = pr.ettReq != null ? pr.ettReq : null;
      if (S.ett != null && S.ett < now()) { S.ett = null; msgAll('CLK IS TAKE OFF TIME'); }
      sc.R(9, 'ETT ', 'w', true); sc.R(10, S.ett != null ? hhmmss(S.ett) : (reqEtt != null ? hhmmss(reqEtt) : '[      ]'), S.ett != null ? 'c' : (reqEtt != null ? 'm' : 'c'));
      lsk['5R'] = function (sp) {
        if (sp === 'CLR') { S.ett = null; return; }
        var m = /^(\d{2})(\d{2})(\d{2})$/.exec(sp || ''); if (!m) return 'FORMAT ERROR';
        var t = +m[1] * 3600 + +m[2] * 60 + +m[3]; if (t <= now()) return 'ENTRY OUT OF RANGE'; S.ett = t;
      };
    }
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };

  /* STEP ALTS */
  PAGES.STEP = function (sc, lsk, sd) {
    var pl = ed(), pr = preds(pl), steps = pr.steps || [], w = gw(S.phase === 'PREFLIGHT' && S.init.block != null ? S.init.block - S.init.taxi : S.ac.fob);
    title(sc, 'STEP ALTS', !!S.tmpy);
    sc.L(0, S.tmpy ? 'TMPY' : '', 'y'); sc.R(0, 'FL' + (S.init.crz || '---') + ' ', 'g', true);
    sc.L(1, ' ALT / WPT', 'w', true); sc.R(1, 'DIST/UTC ', 'w', true);
    var max = recMax(w);
    for (var k = 0; k < 4; k++) {
      var st = steps[k], y = 2 + k * 2;
      if (!st) { if (k === steps.length) sc.L(y, '[   ]/[     ]', 'c'); }
      else {
        sc.L(y, 'FL' + st.fl + '/' + st.label, S.tmpy ? 'y' : 'c');
        var note = st.fl > max ? 'ABOVE MAX' : st.ignored ? 'IGNORED' : (st.s != null && st.s < 20 ? 'STEP AHEAD' : pad(Math.round(st.s), 4) + '/' + hhmm(timeAtS(pr, st.s)));
        sc.R(y, note, note === 'IGNORED' || note === 'ABOVE MAX' ? 'a' : 'g', true);
        if (note === 'STEP AHEAD' && !st.warned) { st.warned = true; sd.msg = 'STEP AHEAD'; }
      }
      (function (k2) { lsk[(k2 + 1) + 'L'] = function (sp) { return stepEntry(k2, sp); }; })(k);
    }
    // Optimum position of the first step climb ahead.
    var first = steps.filter(function (s) { return s.s != null && s.fl * 100 > (S.init.crz || 0) * 100 - 1; })[0];
    var opt = first ? optStep(pr, first, w) : null;
    if (first && !opt) sc.L(10, 'NO OPTIMAL STEP', 'w', true);
    if (opt) {
      sc.L(9, ' OPT STEP', 'w', true); sc.L(10, '<' + pad(Math.round(opt.s), 4) + 'NM', 'g');
      sc.R(9, 'SAVINGS ', 'w', true); sc.R(10, Math.round(opt.kg) + 'KG ' + opt.min + 'MIN', 'g', true);
      lsk['5L'] = function () { return rev(function (p) { var o = p.steps.filter(function (s) { return s.id === first.id && s.fl === first.fl; })[0]; if (!o) return 'NOT ALLOWED'; var ref = anchor(p, opt.s); o.id = ref.id; o.off = ref.off; o.label = '(OPT)'; }) || KEEP; };
    }
    lsk['6L'] = function (sp, s2) { go(s2, 'FPLN'); return KEEP; };
    tmpyRow6(sc, lsk, function (s2) { go(s2, 'FPLN'); });
  };
  function anchor(pl, s) {
    var p = preds(pl), best = { id: pl.legs[1].id, off: 0 };
    pl.legs.forEach(function (L, i) { if (i > 0 && p.legs[i] && L.id && L.type === 'TF' && p.legs[i].s <= s) best = { id: L.id, off: Math.round(s - p.legs[i].s) }; });
    return best;
  }
  function optStep(pr, st, w) {
    if (!pr.ok || w == null || pr.tc == null && S.phase === 'PREFLIGHT' || pr.td == null) return null;
    var startS = Math.max((pr.tc || 0) + 20, 20), endS = Math.min(st.s - 20, pr.td - 300);
    if (endS <= startS) return null;
    var burnPerNm = 2.3 / 450 * (w / 65);
    for (var x = startS; x <= endS; x += 5) {
      if (optFl(w - burnPerNm * x) >= st.fl) {
        var kg = (st.s - x) * 0.6 * ((st.fl * 100 - crzBefore(null, st, pr.steps)) / 2000) * 1;
        if (kg < 100) return null;
        return { s: x, kg: kg, min: Math.round(kg / 400) };
      }
    }
    return null;
  }
  function stepEntry(k, sp) {
    var pl = ed(), steps = pl.steps || (pl.steps = []), cur = steps[k];
    if (sp === 'CLR') { if (!cur) return 'NOT ALLOWED'; return rev(function (p) { p.steps.splice(k, 1); }); }
    var fl = null, ref = null, off = 0, label = null, m;
    if ((m = /^([A-Z0-9]{2,7})\/(-?\d{1,3})\/(\d{3})$/.exec(sp || ''))) { ref = m[1]; off = +m[2]; fl = +m[3]; label = m[1] + '/' + m[2]; }
    else if ((m = /^(?:FL)?(\d{3})\/(.+)$/.exec(sp || ''))) { fl = +m[1]; ref = m[2]; }
    else if ((m = /^FL(\d{3})$/.exec(sp || '')) && cur) fl = +m[1];
    else if ((m = /^\/(.+)$/.exec(sp || '')) && cur) ref = m[1];
    else return 'FORMAT ERROR';
    if (!cur && steps.length >= 4) return 'NOT ALLOWED';
    var newFl = fl != null ? fl : cur.fl, newRef = ref || cur.id;
    if (ref && /\//.test(ref) && !PD_RE.test(ref)) {
      var w = lookup(ref); if (typeof w === 'string') return w;
      var x = fixInter(pl, w, 'A'); if (!x) return 'NOT ALLOWED'; var a = anchor(pl, x.d); newRef = a.id; off = a.off; label = w.id;
    } else if (ref && PD_RE.test(ref)) { var mm = PD_RE.exec(ref); newRef = mm[1]; off = +mm[2]; label = ref; }
    var idx = -1; pl.legs.forEach(function (L, j) { if (L.id === newRef && idx < 0) idx = j; });
    if (idx < 0) return 'NOT IN DATA BASE';
    if (idx === 0 || /^\(/.test(newRef)) return 'NOT ALLOWED';
    var others = steps.filter(function (s, j) { return j !== k; });
    if (others.some(function (s) { return s.id === newRef && (s.off || 0) === off; })) return 'NOT ALLOWED';
    // Order and rules: 500 ft minimum, no step climb after a step descent, not below an altitude constraint.
    var list = others.concat([{ id: newRef, off: off, fl: newFl }]).map(function (s) { return Object.assign({}, s, { s: stepS(pl, s) }); }).sort(function (a, b) { return a.s - b.s; });
    var lvl = (S.init.crz || 0), down = false;
    for (var j = 0; j < list.length; j++) {
      if (Math.abs(list[j].fl - lvl) * 100 < 500) return 'ENTRY OUT OF RANGE';
      if (list[j].fl > lvl && down) return 'NOT ALLOWED';
      if (list[j].fl < lvl) down = true;
      lvl = list[j].fl;
    }
    if (newFl < (S.init.crz || 0) && pl.legs.some(function (L, j2) { return j2 > idx && L.alt && L.seg !== 'dep' && L.alt.v > newFl * 100 && L.alt.v <= (S.init.crz || 0) * 100; })) return 'ENTRY OUT OF RANGE';
    var w2 = gw(S.phase === 'PREFLIGHT' && S.init.block != null ? S.init.block - S.init.taxi : S.ac.fob);
    var r = rev(function (p) { var n = { id: newRef, off: off, fl: newFl, label: label || newRef }; if (cur) p.steps[k] = n; else p.steps.push(n); });
    if (typeof r === 'string') return r;
    if (newFl > recMax(w2)) return { msg: 'STEP ABOVE MAX FL' };
    return r;
  }

  /* PROG */
  PAGES.PROG = function (sc, lsk, sd) {
    var w = gw(S.phase === 'PREFLIGHT' && S.init.block != null ? S.init.block - S.init.taxi : S.ac.fob);
    sc.C(0, 'PROG ' + (S.phase === 'PREFLIGHT' ? 'PREFLIGHT' : S.phase === 'GO AROUND' ? 'GO AROUND' : S.phase === 'TAKEOFF' ? 'TAKE OFF' : S.phase === 'DONE' ? 'DONE' : S.phase.slice(0, 3) === 'CRU' ? 'CRZ' : S.phase === 'CLIMB' ? 'CLB' : S.phase === 'DESCENT' ? 'DES' : 'APPR'), 'g');
    sc.R(0, S.init.flt || '', 'w', true);
    sc.L(1, ' CRZ    OPT    REC MAX', 'w', true);
    sc.L(2, S.init.crz ? 'FL' + S.init.crz : '-----', 'c'); sc.put(2, 7, w ? 'FL' + optFl(w) : '-----', 'g'); sc.put(2, 14, w ? 'FL' + recMax(w) : '-----', 'm');
    lsk['1L'] = function (sp) { return setCrz(sp); };
    sc.L(4, '<REPORT');
    lsk['2L'] = function () { return 'NOT AVAILABLE'; };
    // BRG/DIST TO the place entered at [3R] (owner's layout), from the aircraft position.
    var bt = S.brgTo, from = S.act ? S.act.legs[0] : (S.ac.lat ? S.ac : null);
    sc.L(5, ' BRG / DIST', 'w', true); sc.R(5, 'TO ', 'w', true);
    sc.L(6, bt && from ? pad(Math.round(gbrg(from, bt)), 3).replace(/ /g, '0') + '° /' + pad(Math.round(gdist(from, bt)), 4) + 'NM' : '---° /----', 'g');
    sc.R(6, bt ? bt.id : '[    ]', 'c');
    lsk['3R'] = function (sp) {
      if (sp === 'CLR') { S.brgTo = null; return; }
      var w3 = lookup(sp); if (typeof w3 === 'string') return w3; S.brgTo = { id: w3.id, lat: w3.lat, lon: w3.lon };
    };
    sc.L(7, ' POSITION UPDATE AT', 'w', true);
    var u = S.posUpd;
    sc.L(8, u ? (u.name || 'ENTRY').slice(0, 7) + ' ' + fmtLat(u).slice(0, 7) : '*[    ]', 'c');
    if (u) sc.R(8, 'UPDATE*', 'a');
    lsk['4L'] = function (sp) {
      if (S.ac.gps) return 'NOT ALLOWED';
      if (sp === 'CLR') { S.posUpd = null; return; }
      var w2 = lookup(sp); if (typeof w2 === 'string') return w2; S.posUpd = { name: pos(sp) ? sp : 'ENTRY', lat: w2.lat, lon: w2.lon };
    };
    lsk['4R'] = function (sp, s2) {
      if (!S.posUpd) return KEEP;
      S.ac.lat = S.posUpd.lat; S.ac.lon = S.posUpd.lon; if (S.act && S.act.legs[0]) { S.act.legs[0].lat = S.ac.lat; S.act.legs[0].lon = S.ac.lon; }
      S.posUpd = null; s2.msg = 'NAV ACCUR DOWNGRAD'; return KEEP;
    };
    sc.L(9, 'REQUIRED ACCUR ESTIMATED', 'w', true);
    var appr = S.phase === 'APPROACH';
    sc.L(10, (appr ? '0.30' : S.phase === 'CRUISE' ? '2.00' : '1.00') + 'NM', 'c'); sc.put(10, 8, S.ac.gps ? 'HIGH' : 'LOW', 'g'); sc.R(10, (S.ac.gps ? '0.05' : '0.80') + 'NM', 'g');
    sc.L(12, S.ac.gps ? 'GPS PRIMARY' : 'GPS PRIMARY LOST', S.ac.gps ? 'g' : 'a');
  };

  /* PERF */
  var PHASES = ['TAKE OFF', 'CLB', 'CRZ', 'DES', 'APPR', 'GO AROUND'];
  function phaseIdx() { return { PREFLIGHT: 0, TAKEOFF: 0, CLIMB: 1, CRUISE: 2, DESCENT: 3, APPROACH: 4, 'GO AROUND': 5, DONE: 4 }[S.phase]; }
  PAGES.PERF = function (sc, lsk, sd) {
    var k = sd.ctx.ph != null ? sd.ctx.ph : phaseIdx(), P = S.perf, e = econ(), act = k === phaseIdx();
    var w = gw(S.phase === 'PREFLIGHT' && S.init.block != null ? S.init.block - S.init.taxi : S.ac.fob), gd = greenDot(w);
    sc.C(0, 'PERF ' + PHASES[k], act ? 'g' : 'w');
    if (k === 0) {
      sc.L(1, ' V1', 'w', true); sc.L(2, P.v1 || '□□□', P.v1 ? 'c' : 'a');
      sc.L(3, ' VR', 'w', true); sc.L(4, P.vr || '□□□', P.vr ? 'c' : 'a');
      sc.L(5, ' V2', 'w', true); sc.L(6, P.v2 || '□□□', P.v2 ? 'c' : 'a');
      sc.put(1, 8, 'FLP RETR', 'w', true); sc.put(2, 8, 'F=' + Math.round(gd * 0.72), 'g', true); sc.put(4, 8, 'S=' + Math.round(gd * 0.85), 'g', true); sc.put(6, 8, 'O=' + gd, 'g', true);
      sc.L(7, 'TRANS ALT', 'w', true); sc.L(8, String(S.act ? APT[S.act.origin].ta : 5000), 'c');
      sc.L(9, 'THR RED/ACC', 'w', true); sc.L(10, P.thrRed + '/' + P.acc, 'c');
      sc.R(5, 'FLAPS/THS', 'w', true); sc.R(6, P.flaps || '[]/[   ]', 'c');
      sc.R(7, 'FLEX TO TEMP', 'w', true); sc.R(8, P.flex != null ? P.flex + '°' : '[ ]°', 'c');
      sc.R(9, 'ENG OUT ACC', 'w', true); sc.R(10, String(P.acc), 'c');
      function vs(key) { return function (sp) { if (!/^\d{3}$/.test(sp || '')) return 'FORMAT ERROR'; if (+sp < 90 || +sp > 200) return 'ENTRY OUT OF RANGE'; P[key] = +sp; if (P.v1 && P.vr && P.v2 && !(P.v1 <= P.vr && P.vr <= P.v2)) return { msg: 'V1/VR/V2 DISAGREE' }; }; }
      lsk['1L'] = vs('v1'); lsk['2L'] = vs('vr'); lsk['3L'] = vs('v2');
      lsk['5L'] = function (sp) { var m = /^(\d{3,4})?(?:\/(\d{3,4}))?$/.exec(sp || ''); if (!m || (!m[1] && !m[2])) return 'FORMAT ERROR'; if (m[1]) P.thrRed = +m[1]; if (m[2]) P.acc = +m[2]; };
      lsk['3R'] = function (sp) { if (!/^[123]\/(UP|DN)\d(\.\d)?$/.test(sp || '')) return 'FORMAT ERROR'; P.flaps = sp; };
      lsk['4R'] = function (sp) { if (!/^\d{1,2}$/.test(sp || '')) return 'FORMAT ERROR'; P.flex = +sp; };
    } else if (k >= 1 && k <= 3) {
      var key = PHASES[k];
      sc.L(1, ' ACT MODE', 'w', true); sc.L(2, P.presel[key] ? 'SELECTED' : 'MANAGED', 'g');
      sc.L(3, ' CI', 'w', true); sc.L(4, S.act && S.act.rta ? 'RTA CI' : (S.init.ci != null ? String(S.init.ci) : '---'), S.act && S.act.rta ? 'm' : 'c');
      sc.L(5, ' MANAGED', 'w', true); sc.L(6, k === 1 ? e.clb + '/.' + Math.round(e.mach * 100) : k === 2 ? '.' + Math.round(e.mach * 100) : '.' + Math.round(e.mach * 100) + '/' + e.des, 'g');
      if (!act) { sc.L(7, ' PRESEL', 'w', true); sc.L(8, P.presel[key] ? spdStr(P.presel[key]) : '[ ]', 'c'); lsk['4L'] = function (sp) { if (sp === 'CLR') { delete P.presel[key]; return; } var m = /^(\d{3}|\.\d{2})$/.exec(sp || ''); if (!m) return 'FORMAT ERROR'; P.presel[key] = sp[0] === '.' ? +('0' + sp) : +sp; }; }
      if (k === 2) { sc.R(10, 'STEP ALTS>'); lsk['5R'] = function (sp, s2) { go(s2, 'STEP'); return KEEP; }; }
      sc.R(1, 'DEST EFOB', 'w', true); var pr = S.act ? preds(S.act) : null; sc.R(2, pr && pr.destFob != null ? t1(pr.destFob) : '--.-', 'g');
    } else if (k === 4) {
      sc.L(1, 'QNH', 'w', true); sc.L(2, P.qnh || '□□□□', P.qnh ? 'c' : 'a');
      sc.L(3, 'TEMP', 'w', true); sc.L(4, P.temp != null ? P.temp + '°' : '[ ]°', 'c');
      sc.L(5, 'MAG WIND', 'w', true); sc.L(6, P.wind || '[ ]°/[ ]', 'c');
      sc.L(7, 'TRANS ALT', 'w', true); sc.L(8, '5000', 'c');
      sc.L(9, 'VAPP', 'w', true); sc.L(10, String(vapp()), 'g');
      sc.put(1, 9, 'FLP RETR', 'w', true); sc.put(4, 9, 'F=' + Math.round(gd * 0.72), 'g', true); sc.put(6, 9, 'S=' + Math.round(gd * 0.85), 'g', true); sc.put(8, 9, 'O=' + gd, 'g', true); sc.put(10, 9, 'VLS=' + (vapp() - 5), 'g', true);
      sc.R(3, 'BARO', 'w', true); sc.R(4, P.baro != null ? String(P.baro) : '[    ]', 'c');
      sc.R(5, 'RADIO', 'w', true); sc.R(6, P.radio != null ? String(P.radio) : '[    ]', 'c');
      sc.R(9, 'LDG CONF', 'w', true); sc.R(10, P.ldg === 'FULL' ? 'FULL' : 'CONF3', 'c');
      lsk['1L'] = function (sp) { if (!/^\d{3,4}$/.test(sp || '')) return 'FORMAT ERROR'; P.qnh = sp; };
      lsk['2L'] = function (sp) { if (!/^-?\d{1,2}$/.test(sp || '')) return 'FORMAT ERROR'; P.temp = +sp; };
      lsk['3L'] = function (sp) { if (!/^\d{1,3}\/\d{1,3}$/.test(sp || '')) return 'FORMAT ERROR'; P.wind = sp; };
      lsk['2R'] = function (sp) { if (!/^\d{3,5}$/.test(sp || '')) return 'FORMAT ERROR'; P.baro = +sp; P.radio = null; };
      lsk['3R'] = function (sp) { if (!/^(\d{1,4}|NO)$/.test(sp || '')) return 'FORMAT ERROR'; P.radio = sp; P.baro = null; };
      lsk['5R'] = function () { P.ldg = P.ldg === 'FULL' ? 'CONF3' : 'FULL'; return KEEP; };
    } else {
      sc.L(9, 'THR RED/ACC', 'w', true); sc.L(10, P.thrRed + '/' + P.acc, 'c');
      sc.L(1, ' GO AROUND SPEEDS', 'w', true); sc.L(2, 'VAPP OR CURRENT SPD', 'g', true); sc.L(4, 'GREEN DOT AT ACC ALT', 'g', true);
    }
    // Manual activation of the approach phase (twice: ACTIVATE then CONFIRM).
    if ((k === 4 && ['CLIMB', 'CRUISE', 'DESCENT'].indexOf(S.phase) >= 0) || (k === 5 && S.phase === 'GO AROUND')) {
      sc.L(11, sd.ctx.conf ? ' CONFIRM' : ' ACTIVATE', 'w', true); sc.L(12, sd.ctx.conf ? '*APPR PHASE' : '←APPR PHASE', sd.ctx.conf ? 'a' : 'c');
      lsk['6L'] = function () { if (!sd.ctx.conf) { sd.ctx.conf = true; return KEEP; } S.phase = 'APPROACH'; sd.ctx.conf = false; sd.ctx.ph = null; return KEEP; };
    } else if (k > 0 && k !== phaseIdx() + 0 && k - 1 >= 0) { sc.L(11, ' PREV', 'w', true); sc.L(12, '<PHASE'); lsk['6L'] = function () { sd.ctx.ph = k - 1; return KEEP; }; }
    if (k < 5) { sc.R(11, 'NEXT ', 'w', true); sc.R(12, 'PHASE>'); lsk['6R'] = function () { sd.ctx.ph = k + 1; sd.ctx.conf = false; return KEEP; }; }
  };

  /* FUEL PRED, RAD NAV, SEC F-PLN, ATC COMM */
  PAGES.FUEL = function (sc) {
    var pl = S.act, pr = pl ? preds(pl) : null, af = altnFuel(), w = gw(S.phase === 'PREFLIGHT' && S.init.block != null ? S.init.block - S.init.taxi : S.ac.fob);
    sc.C(0, 'FUEL PRED');
    sc.L(1, ' AT        UTC     EFOB', 'w', true);
    if (pl) {
      sc.L(2, pl.dest, 'g'); sc.put(2, 10, pr.ok ? hhmm(pr.destT) : '----', 'g'); sc.R(2, pr.destFob != null ? t1(pr.destFob) : '--.-', 'g');
      sc.L(4, pl.altn || '----', 'g'); sc.R(4, pr.destFob != null && af != null ? t1(pr.destFob - af) : '--.-', 'g');
    }
    sc.L(5, ' ROUTE RSV/%', 'w', true); sc.L(6, '---.-/' + t1(S.init.rsv), 'c');
    sc.L(7, ' ALTN/TIME', 'w', true); sc.L(8, af != null ? t1(af) + '/----' : '---.-/----', 'g');
    sc.L(9, ' FINAL/TIME', 'w', true); sc.L(10, '1.1/0030', 'c');
    sc.L(11, ' EXTRA/TIME', 'w', true); sc.L(12, extraStr(pr), 'g');
    sc.R(5, 'GW/   CG ', 'w', true); sc.R(6, w ? t1(w) + '/' + t1(S.init.cg) : '--.-/--.-', 'g');
    sc.R(7, 'FOB ', 'w', true); sc.R(8, (S.phase === 'PREFLIGHT' ? (S.init.block != null ? t1(S.init.block) : '--.-') : t1(S.ac.fob)) + ' FF+FQ', 'g');
    sc.R(9, 'MIN DEST FOB', 'w', true); sc.R(10, af != null ? t1(af + 1.1) : '--.-', 'c');
  };
  PAGES.RAD = function (sc, lsk) {
    var pl = S.act, ap = pl && pl.appr && APPR[pl.dest][pl.appr];
    sc.C(0, 'RADIO NAV');
    sc.L(1, 'VOR1/FREQ', 'w', true); sc.L(2, S.vor[0] || '[ ]/[  . ]', 'c'); sc.R(1, 'FREQ/VOR2', 'w', true); sc.R(2, S.vor[1] || '[  . ]/[ ]', 'c');
    sc.L(5, 'LS /FREQ', 'w', true); sc.L(6, S.ilsFreq || (ap && ap.ils) || '[  ]/[  . ]', S.ilsFreq || (ap && ap.ils) ? 'm' : 'c');
    sc.L(7, 'CRS', 'w', true); sc.L(8, ap ? pad(APT[pl.dest].rwys[ap.rwy], 3).replace(/ /g, '0') : '---', 'm');
    lsk['1L'] = function (sp) { if (!/^[A-Z]{2,3}(\/\d{3}\.\d{1,2})?$|^\d{3}\.\d{1,2}$/.test(sp || '')) return 'FORMAT ERROR'; S.vor[0] = sp; };
    lsk['1R'] = function (sp) { if (!/^[A-Z]{2,3}(\/\d{3}\.\d{1,2})?$|^\d{3}\.\d{1,2}$/.test(sp || '')) return 'FORMAT ERROR'; S.vor[1] = sp; };
    lsk['3L'] = function (sp) { if (sp === 'CLR') { S.ilsFreq = null; return; } if (!/^[A-Z]{2,4}(\/\d{3}\.\d{1,2})?$|^\d{3}\.\d{1,2}$/.test(sp || '')) return 'FORMAT ERROR'; S.ilsFreq = sp; };
  };
  PAGES.SEC = function (sc, lsk, sd) {
    sc.C(0, 'SEC INDEX');
    sc.L(2, '<COPY ACTIVE'); sc.L(4, S.sec ? '<SEC F-PLN' : ''); sc.L(6, S.sec ? '<DELETE SEC' : '');
    sc.R(2, 'INIT>'); lsk['1R'] = function (sp, s2) { go(s2, 'SECINIT'); return KEEP; };
    if (S.sec) sc.R(12, 'ACTIVATE SEC*', 'a');
    lsk['1L'] = function () { if (!S.act) return 'NOT ALLOWED'; S.sec = clone(S.act); return KEEP; };
    lsk['2L'] = function (sp, s2) { if (S.sec) go(s2, 'SECFPLN'); return KEEP; };
    lsk['3L'] = function () { S.sec = null; return KEEP; };
    lsk['6R'] = function () {
      if (!S.sec) return KEEP;
      var destChanged = S.act && S.sec.dest !== S.act.dest;
      S.act = S.sec; S.sec = null; S.tmpy = null;
      if (destChanged && S.phase === 'GO AROUND' && S.ac.alt >= APT[S.act.origin].elev + S.perf.acc) S.phase = 'CLIMB';
      return KEEP;
    };
  };
  PAGES.SECINIT = function (sc, lsk) {
    sc.C(0, 'SEC INIT');
    sc.R(1, 'FROM/TO  ', 'w', true); sc.R(2, S.sec ? S.sec.origin + '/' + S.sec.dest : '[  ]/[  ]', 'c');
    sc.L(4, 'IMMEDIATE RETURN: ENTER', 'w', true); sc.L(5, 'THE DEPARTURE AIRPORT AS', 'w', true); sc.L(6, 'BOTH FROM AND TO', 'w', true);
    lsk['1R'] = function (sp) {
      var m = /^([A-Z]{4})\/([A-Z]{4})$/.exec(sp || ''); if (!m) return 'FORMAT ERROR';
      if (!APT[m[1]] || !APT[m[2]]) return 'NOT IN DATA BASE';
      S.sec = newPlan(m[1], m[2]);
    };
    sc.L(12, '<SEC INDEX'); lsk['6L'] = function (sp, s2) { go(s2, 'SEC'); return KEEP; };
  };
  PAGES.SECFPLN = function (sc, lsk, sd) {
    var pl = S.sec; if (!pl) { go(sd, 'SEC'); return PAGES.SEC(sc, lsk, sd); }
    sc.C(0, 'SEC F-PLN', 'w');
    var items = pl.legs.filter(function (L) { return L.type !== 'DISCO' || true; });
    sd.scroll = Math.max(0, Math.min(sd.scroll, items.length - 1));
    items.slice(sd.scroll, sd.scroll + 5).forEach(function (L, r) { sc.L(2 + r * 2, L.type === 'DISCO' ? '---F-PLN DISCONTINUITY--' : L.id, L.type === 'DISCO' ? 'w' : 'w'); });
    sc.L(12, '<SEC INDEX'); lsk['6L'] = function (sp, s2) { go(s2, 'SEC'); return KEEP; };
    sd.ctx.scroll = function (d) { sd.scroll = Math.max(0, sd.scroll + d); };
  };
  PAGES.ATC = function (sc) { sc.C(0, 'ATC MENU'); sc.C(6, 'ATSU NOT INSTALLED', 'w', true); sc.C(8, 'IN THIS TRAINER', 'w', true); };

  /* ------------------------------------------------------------ keys */
  var FKEY = { DIR: 'DIR', PROG: 'PROG', PERF: 'PERF', INIT: 'INITA', DATA: 'DATA', 'F-PLN': 'FPLN', 'RAD NAV': 'RAD', 'FUEL PRED': 'FUEL', 'SEC F-PLN': 'SEC', 'ATC COMM': 'ATC', 'MCDU MENU': 'MENU' };
  function build(n) {
    var sd = SIDES[n], sc = new Screen(), lsk = {};
    var page = PAGES[sd.page] || PAGES.MENU;
    try { page(sc, lsk, sd); } catch (err) { if (window.console) console.error(err); sc = new Screen(); lsk = {}; sd.page = 'FPLN'; sc.C(6, 'FMGC PAGE ERROR', 'a'); }
    var spText = sd.msg ? sd.msg : sd.sp;
    sc.L(13, spText, sd.msg ? (/DELETED|MISMATCH|NOT|ERROR|FULL|RANGE|PROCESS|INTERCEPT|ABOVE|DOWNGRAD|DISAGREE/.test(sd.msg) ? 'a' : 'w') : 'w');
    return { sc: sc, lsk: lsk };
  }
  function key(n, k) {
    var sd = SIDES[n], other = SIDES[1 - n];
    if (S.phase === 'DONE' && (k === 'INIT' || k === 'PERF')) { var keep = S.pilot; fresh(); S.pilot = keep; sd = SIDES[n]; sd.msg = null; }
    if (FKEY[k]) { go(sd, FKEY[k]); if (k === 'PERF') sd.ctx.ph = null; return; }
    var m = /^LSK (\d)([LR])$/.exec(k);
    if (m) {
      var b = build(n), f = b.lsk[m[1] + m[2]];
      var sp = sd.msg ? '' : sd.sp;
      if (!f) { if (sp) sd.msg = 'NOT ALLOWED'; return; }
      var r = f(sp, sd);
      if (typeof r === 'string') { sd.msg = r; return; }
      if (r && r.msg) { sd.sp = ''; sd.msg = r.msg; return; }
      if (r === KEEP || (r && r.keep)) { if (sp === 'CLR' || sp === 'Δ') sd.sp = ''; return; }
      sd.sp = ''; sd.msg = null; return;
    }
    if (k === 'CLR') { if (sd.msg) sd.msg = null; else if (sd.sp && sd.sp !== 'CLR') sd.sp = sd.sp.slice(0, -1); else sd.sp = sd.sp === 'CLR' ? '' : 'CLR'; return; }
    if (k === 'OVFY') { if (!sd.sp || sd.sp === 'CLR') { sd.sp = 'Δ'; sd.msg = null; } return; }
    if (k === '↑' || k === '↓') { b = build(n); if (sd.ctx.scroll) sd.ctx.scroll(k === '↑' ? 1 : -1); return; }
    if (k === '←' || k === '→') { b = build(n); if (sd.ctx.slew) sd.ctx.slew(k === '←' ? -1 : 1); return; }
    if (k === 'AIR PORT') { b = build(n); if (sd.ctx.airport) sd.ctx.airport(); return; }
    if (k === 'BRT') { sd.dim = Math.min(1, sd.dim + 0.2); return; }
    if (k === 'DIM') { sd.dim = Math.max(0.3, sd.dim - 0.2); return; }
    var ch = k === 'SP' ? ' ' : k === '±' ? (sd.sp.slice(-1) === '-' ? '+' : '-') : k;
    if (ch.length !== 1) return;
    if (sd.msg) sd.msg = null;
    if (sd.sp === 'CLR' || sd.sp === 'Δ') sd.sp = '';
    if (k === '±' && /[+-]$/.test(sd.sp)) sd.sp = sd.sp.slice(0, -1);
    if (sd.sp.length < 22) sd.sp += ch;
  }

  /* ----------------------------------------------------------- drawing */
  // MCDU screen: 24 columns x 14 lines (title, six label/data pairs, scratchpad).
  function screenSvg(n, x, y, w, h) {
    var sc = build(n).sc, cw = w / 24, lh = h / 14, o = '<g opacity="' + SIDES[n].dim + '">';
    for (var r = 0; r < 14; r++) {
      var row = sc.c[r], col = 0;
      while (col < 24) {
        var cell = row[col]; if (!cell) { col++; continue; }
        var st = col, txt = '';
        while (col < 24 && row[col] && row[col].c === cell.c && row[col].s === cell.s) { txt += row[col].ch; col++; }
        var fs = cell.s ? lh * 0.68 : lh * 0.86;
        // One x per character, centred in its column: the 24-column grid stays exact.
        var xs = []; for (var q = 0; q < txt.length; q++) xs.push((x + (st + q + 0.5) * cw).toFixed(2));
        o += '<text x="' + xs.join(' ') + '" y="' + (y + (r + 0.82) * lh).toFixed(2) + '" font-size="' + fs.toFixed(2) + '" text-anchor="middle" class="mcdu-' + cell.c + '" style="white-space:pre">' + DESC(txt) + '</text>';
      }
    }
    return o + '</g>';
  }
  function DESC(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ND in PLAN mode (north up): active plan green, TMPY yellow, missed approach
  // and alternate blue, offset solid with the original dashed, fix info in blue.
  function ndSvg() {
    var W = 220, H = 200, o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fm-nd" role="img" aria-label="Navigation display, PLAN mode"><rect width="' + W + '" height="' + H + '" fill="#020304"/>';
    var pl = S.act; if (!pl) return o + '<text x="110" y="100" text-anchor="middle" class="mcdu-w" font-size="9">NO F-PLN</text></svg>';
    // Scaled to the primary flight plan (active and TMPY); the alternate may run off the edge.
    var plans = [pl].concat(S.tmpy ? [S.tmpy.plan] : []), pts = [pl.legs[0]];
    plans.forEach(function (p) { primary(p).forEach(function (L) { if (L.lat != null && !L.noPos) pts.push(L); }); });
    var X = pts.map(function (p) { return xy(p); }), minx = Math.min.apply(null, X.map(function (q) { return q[0]; })), maxx = Math.max.apply(null, X.map(function (q) { return q[0]; }));
    var miny = Math.min.apply(null, X.map(function (q) { return q[1]; })), maxy = Math.max.apply(null, X.map(function (q) { return q[1]; }));
    var sc = Math.min((W - 40) / Math.max(20, maxx - minx), (H - 64) / Math.max(20, maxy - miny)), cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    function P(p) { var q = xy(p); return [(W / 2 + (q[0] - cx) * sc).toFixed(1), (H / 2 - (q[1] - cy) * sc).toFixed(1)]; }
    o += '<clipPath id="fm-nd-clip"><rect x="0" y="22" width="' + W + '" height="' + (H - 40) + '"/></clipPath><g clip-path="url(#fm-nd-clip)">';
    function line(a, b, cls, dash) { var A = P(a), B = P(b); return '<line x1="' + A[0] + '" y1="' + A[1] + '" x2="' + B[0] + '" y2="' + B[1] + '" class="' + cls + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }
    function draw(p, tm) {
      var g = '', last = p.legs[0], di = destIdx(p), off = p.offset, oe = off ? offsetEnd(p) : -1;
      p.legs.forEach(function (L, i) {
        if (i === 0 || L.lat == null || L.type === 'DISCO') { if (L.type === 'DISCO') last = null; else if (i === 0) last = L; return; }
        var cls = tm ? 'nd-y' : (L.seg === 'miss' || L.seg === 'altn' ? 'nd-c' : 'nd-g');
        if (last && !L.noPos) {
          if (off && i <= oe && !tm) {
            g += line(last, L, cls, '3 3');
            var b = gbrg(last, L) + (off.side === 'R' ? 90 : -90);
            g += line(gdest(last, b, off.nm), gdest(L, b, off.nm), cls);
          } else g += line(last, L, cls, L.seg === 'miss' || L.seg === 'altn' ? '4 2' : null);
        } else if (L.noPos && last) g += line(last, L, cls, '2 2');
        if (L.type === 'HM' || L.type === 'HF' || L.type === 'HA') g += holdArt(L, P, sc, cls);
        if (!L.noPos) {
          var q = P(L);
          g += '<path d="M' + q[0] + ' ' + (q[1] - 2.6) + ' l2.6 2.6 l-2.6 2.6 l-2.6 -2.6 z" class="' + (i === 1 && !tm ? 'nd-w' : cls) + '" fill="none"/>';
          // Labels: the TMPY's when there is one; only airports in the missed approach and alternate.
          var lab = L.type !== 'HM' && (tm || !S.tmpy) && (!(L.seg === 'miss' || L.seg === 'altn') || L.type === 'APT');
          if (lab) g += '<text x="' + (+q[0] + 4) + '" y="' + (+q[1] - 3) + '" font-size="6" class="mcdu-' + (i === 1 && !tm ? 'w' : cls.slice(3)) + '">' + DESC(L.id + (L.ovfy ? 'Δ' : '')) + '</text>';
          if (L.alt && i <= di) g += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="5" class="nd-m" fill="none"/>';
          last = L;
        }
      });
      return g;
    }
    o += draw(pl, false); if (S.tmpy) o += draw(S.tmpy.plan, true);
    // Fix info: radials and circle, blue dashed.
    var f = S.fixRef;
    if (f && f.id) {
      f.rad.forEach(function (v) { if (v != null) o += line(f, gdest(f, v, 300), 'nd-c', '3 2'); });
      if (f.circle) { var c0 = P(f); o += '<circle cx="' + c0[0] + '" cy="' + c0[1] + '" r="' + (f.circle * sc).toFixed(1) + '" class="nd-c" fill="none" stroke-dasharray="3 2"/>'; }
      if (f.abeam) { var ab = fixInter(ed(), f, 'A'); if (ab) o += line(f, ab.pos, 'nd-c', '3 2'); }
      var fp = P(f); o += '<text x="' + (+fp[0] + 4) + '" y="' + (+fp[1] + 8) + '" font-size="6" class="mcdu-c">' + DESC(f.id) + '</text>';
    }
    // Aircraft symbol at the FROM position (yellow).
    var a = P(S.phase === 'PREFLIGHT' ? pl.legs[0] : S.ac), to = pl.legs[1] && pl.legs[1].lat != null ? pl.legs[1] : null, hd = to ? gbrg(pl.legs[0], to) : 0;
    o += '<g transform="translate(' + a[0] + ' ' + a[1] + ') rotate(' + hd.toFixed(0) + ')"><path d="M0 -7 V7 M-6 -1 H6 M-2.5 6 H2.5" class="nd-y" stroke-width="1.8"/></g></g>';
    o += '<text x="4" y="10" font-size="7" class="mcdu-w">PLAN</text>';
    o += '<text x="4" y="19" font-size="6" class="mcdu-g">' + DESC(S.ac.mode === 'NAV' ? 'NAV' : (S.ac.navArm ? 'HDG  NAV' : 'HDG')) + '</text>';
    if (to) o += '<text x="' + (W - 4) + '" y="10" font-size="7" text-anchor="end" class="mcdu-w">' + DESC(to.id) + '</text><text x="' + (W - 4) + '" y="19" font-size="6" text-anchor="end" class="mcdu-g">' + Math.round(gdist(pl.legs[0], to)) + 'NM</text>';
    if (pl.offset) o += '<text x="4" y="' + (H - 6) + '" font-size="6" class="mcdu-g">OFST ' + pl.offset.side + pl.offset.nm + '</text>';
    if (S.ac.gps) o += '<text x="' + (W / 2) + '" y="' + (H - 6) + '" font-size="6" text-anchor="middle" class="mcdu-w">GPS PRIMARY</text>';
    return o + '</svg>';
  }
  function holdArt(L, P, sc, cls) {
    var h = L.hold, lenNm = 230 * (h.time || 1) / 60, rNm = 1.5, out = n360(h.inb + 180), side = h.turn === 'R' ? 90 : -90;
    var fx = { lat: L.lat, lon: L.lon }, a2 = gdest(fx, out, lenNm), b1 = gdest(fx, h.inb + side, rNm * 2), b2 = gdest(a2, h.inb + side, rNm * 2);
    var p0 = P(fx), p1 = P(a2), p2 = P(b2), p3 = P(b1);
    return '<path d="M' + p0.join(' ') + ' L' + p1.join(' ') + ' L' + p2.join(' ') + ' L' + p3.join(' ') + ' Z" class="' + cls + '" fill="none" stroke-linejoin="round"/>';
  }

  // Getting-started guide beside the MCDU: one step at a time; a step is done
  // when the FMGC state shows it, then the next one appears.
  var GUIDE = [
    ['Start the FMGC', 'Press the key beside <FMGC on the MCDU MENU.', function () { return SIDES[0].page !== 'MENU' || SIDES[1].page !== 'MENU'; }],
    ['INIT A', 'Press INIT.', function () { return SIDES.some(function (s) { return s.page === 'INITA'; }); }],
    ['INIT A: company route', 'Type TLSORY1 and press [1L] (CO RTE). The flight plan, Toulouse to Paris Orly, is strung.', function () { return !!S.act; }],
    ['INIT A: cost index', 'Type 100 and press [5L] (COST INDEX).', function () { return S.init.ci != null; }],
    ['INIT A: cruise level', 'Type FL350 and press [6L] (CRZ FL).', function () { return !!S.init.crz; }],
    ['INIT B: ZFW/ZFWCG', 'Press → for INIT B. Type 60.0/28.0 and press [1R] (ZFW/ZFWCG). Leave the block fuel empty for now.', function () { return S.init.zfw != null; }],
    ['PERF TAKE OFF: speeds', 'Press PERF. Type 140 [1L] (V1), 142 [2L] (VR) and 145 [3L] (V2).', function () { return S.perf.v1 && S.perf.vr && S.perf.v2; }],
    ['PERF TAKE OFF: flaps and THS', 'Type 1/UP0.5 and press [3R] (FLAPS/THS).', function () { return !!S.perf.flaps; }],
    ['PERF TAKE OFF: flex', 'Type 50 and press [4R] (FLEX TO TEMP).', function () { return S.perf.flex != null; }],
    ['PROG: bearing and distance', 'Press PROG. Type TOU and press [3R]: BRG/DIST shows the bearing and distance to TOU.', function () { return !!S.brgTo; }],
    ['F-PLN: runway in use', 'Press F-PLN, then the left key beside LFBO32L (LAT REV) and <DEPARTURE [1L]. Choose the runway in use, then the SID LMG5B, and press TMPY INSERT* [6R].', function () { return S.depPicked && !S.tmpy && S.act && !!S.act.sid; }],
    ['RAD NAV', 'Press RAD NAV. Type TOU and press [1L] to tune VOR 1.', function () { return !!S.vor[0]; }],
    ['SEC: immediate return', 'Press SEC F-PLN, then INIT> [1R]. Type LFBO/LFBO and press [1R]: the secondary flight plan is ready for a return to Toulouse.', function () { return S.sec && S.act && S.sec.dest === S.act.origin; }],
    ['Take off', 'Below the MCDU, tap Take off.', function () { return S.phase !== 'PREFLIGHT'; }],
    ['Climb to cruise', 'Tap Fly to next waypoint until the phase is CRUISE. Watch the PROG page and the ND.', function () { return ['CRUISE', 'DESCENT', 'APPROACH', 'DONE'].indexOf(S.phase) >= 0; }],
    ['Direct to', 'Press DIR. Type CDN and press [1L]. Check the yellow line on the ND, then press INSERT* [6R].', function () { return S.act && S.act.legs[0].id === 'T-P' && !S.tmpy; }],
    ['Hold at CDN', 'Press F-PLN, then the left key beside CDN (LAT REV). Press <HOLD [3L], then TMPY INSERT* [6R].', function () { return S.act && S.act.legs.some(function (L) { return L.type === 'HM' && L.manual; }); }],
    ['Enter the hold', 'Tap Fly to next waypoint until the aircraft is in the hold.', function () { return S.ac.hold; }],
    ['Leave the hold', 'On F-PLN, press IMM EXIT* beside HOLD, then tap Fly to next waypoint.', function () { return !S.ac.hold && !(S.act && S.act.legs.some(function (L) { return L.type === 'HM' && L.manual; })); }],
    ['Land', 'Keep tapping Fly to next waypoint through the approach to the landing.', function () { return S.phase === 'DONE'; }]
  ];
  // What > enters for each step: MCDU keys, '@' + text typed into the scratchpad, or a function.
  function flyUntil(ok) { for (var k = 0; k < 30 && !ok(); k++) simNote = simFly(); }
  function lineOf(n, id) { var sd = SIDES[n]; go(sd, 'FPLN'); var pl = ed(); for (var i = 0; i < pl.legs.length; i++) if (pl.legs[i].id === id) { go(sd, 'LATREV', { i: i, id: id }); return; } }
  var AUTO = {
    'Start the FMGC': ['MCDU MENU', 'LSK 1L'],
    'INIT A': ['INIT'],
    'INIT A: company route': ['INIT', '@TLSORY1', 'LSK 1L'],
    'INIT A: cost index': ['INIT', '@100', 'LSK 5L'],
    'INIT A: cruise level': ['INIT', '@FL350', 'LSK 6L'],
    'INIT B: ZFW/ZFWCG': ['INIT', '→', '@60.0/28.0', 'LSK 1R'],
    'PERF TAKE OFF: speeds': ['PERF', '@140', 'LSK 1L', '@142', 'LSK 2L', '@145', 'LSK 3L'],
    'PERF TAKE OFF: flaps and THS': ['PERF', '@1/UP0.5', 'LSK 3R'],
    'PERF TAKE OFF: flex': ['PERF', '@50', 'LSK 4R'],
    'PROG: bearing and distance': ['PROG', '@TOU', 'LSK 3R'],
    'F-PLN: runway in use': [function (n) { lineOf(n, S.act.legs[0].id); }, 'LSK 1L', 'LSK 4L', 'LSK 2L', 'LSK 6R', 'F-PLN'],
    'RAD NAV': ['RAD NAV', '@TOU', 'LSK 1L'],
    'SEC: immediate return': ['SEC F-PLN', 'LSK 1R', function () { return '@' + S.act.origin + '/' + S.act.origin; }, 'LSK 1R'],
    'Take off': [function () { simNote = simTakeoff(); }],
    'Climb to cruise': [function () { flyUntil(function () { return S.phase === 'CRUISE'; }); }],
    'Direct to': ['DIR', '@CDN', 'LSK 1L', 'LSK 6R', 'F-PLN'],
    'Hold at CDN': [function (n) { lineOf(n, 'CDN'); }, 'LSK 3L', 'LSK 6R', 'F-PLN'],
    'Enter the hold': [function () { flyUntil(function () { return S.ac.hold; }); }],
    'Leave the hold': [function () { S.ac.immExit = true; simNote = simFly(); }, 'F-PLN'],
    'Land': [function () { flyUntil(function () { return S.phase === 'DONE'; }); }]
  };
  function autoDo(n, list) {
    SIDES[n].sp = ''; SIDES[n].msg = null;
    (list || []).forEach(function (a) {
      if (typeof a === 'function') a = a(n);
      if (typeof a !== 'string') return;
      if (a[0] === '@') { for (var i = 1; i < a.length; i++) key(n, a[i]); } else key(n, a);
    });
  }
  var gi = 0, pin = -1; // pin: a step brought back with <, shown until > is pressed
  var RESTART = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M17.5 3.5v4.2h-4.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function guideHtml() {
    while (gi < GUIDE.length && gi !== pin && GUIDE[gi][2]()) gi++;
    var g = GUIDE[gi], n = GUIDE.length;
    return '<aside class="fm-guide" aria-live="polite"><p class="fm-g-step">' + (g ? 'Step ' + (gi + 1) + ' of ' + n : 'All ' + n + ' steps done') + '</p>' +
      (g ? '<h3 class="fm-g-t">' + DESC(g[0]) + '</h3><p class="fm-g-d">' + DESC(g[1]) + '</p>' :
        '<h3 class="fm-g-t">Flight complete</h3><p class="fm-g-d">Press INIT for a new flight. Then try OFFSET (LAT REV at the FROM waypoint), AIRWAYS, NEW DEST, RTA (VERT REV), STEP ALTS or a go-around.</p>') +
      '<div class="fm-g-btns">' + gbtn('back', 'Previous step', '&lt;', !gi) + gbtn('skip', 'Next step', '&gt;', !g) + gbtn('restart', 'Start again', RESTART, false) + '</div></aside>';
  }
  function gbtn(k, label, icon, off) { return '<button class="fm-g-btn" data-act="fmguide" data-g="' + k + '" aria-label="' + label + '" title="' + label + '"' + (off ? ' disabled' : '') + '>' + icon + '</button>'; }
  // >: enters the step's inputs (unless already done), then the next instruction shows.
  function guide(k, panelId) {
    if (k === 'back' && gi > 0) { gi--; pin = gi; }
    if (k === 'skip' && GUIDE[gi]) { if (!GUIDE[gi][2]()) autoDo(panelId === 'MCDU2' ? 1 : 0, AUTO[GUIDE[gi][0]]); gi++; pin = -1; }
    if (k === 'restart') { fresh(); gi = 0; pin = -1; simNote = null; }
  }

  // Fly controls and status, shown under the MCDU in the expanded view.
  var simNote = null;
  function simHtml() {
    var a = S.ac, pl = S.act, ph = S.phase, b = function (k, t, on) { return '<button class="btn sm' + (on ? ' primary' : '') + '" data-act="fmsim" data-sim="' + k + '">' + t + '</button>'; };
    var st = ph + (ph !== 'PREFLIGHT' ? ' · ' + a.mode + (a.navArm ? ' (NAV armed)' : '') + ' · ' + altStr(a.alt, pl) + (a.hold ? ' · IN HOLD' : '') : '') + (pl && pl.legs[1] && pl.legs[1].id ? ' · TO ' + pl.legs[1].id : '');
    return '<div class="fm-sim"><div class="fm-nd-wrap">' + ndSvg() + '</div>' +
      '<p class="fm-status"><b>Flight</b> ' + DESC(st) + '</p>' +
      '<div class="fm-btns">' + (ph === 'PREFLIGHT' ? b('takeoff', 'Take off', true) : b('fly', 'Fly to next waypoint', true)) +
      (ph === 'APPROACH' ? b('ga', 'Go-around') : '') + b('gps', a.gps ? 'GPS: PRIMARY' : 'GPS: LOST') + b('reset', 'Reset FMGC') + '</div>' +
      (simNote ? '<p class="fm-note">' + DESC(simNote) + '</p>' : '') +
      '<p class="small">Training database (Toulouse to Paris, not for navigation). Try INIT A: TLSORY1, or LFBO/LFPO. Your computer keyboard types into the scratchpad (Backspace is CLR).</p></div>';
  }
  function sim(k) {
    if (k === 'takeoff') simNote = simTakeoff();
    else if (k === 'fly') simNote = simFly();
    else if (k === 'ga') simNote = simGoAround();
    else if (k === 'gps') { S.ac.gps = !S.ac.gps; simNote = S.ac.gps ? 'GPS PRIMARY: POSITION UPDATE AT is inhibited.' : 'GPS PRIMARY LOST: POSITION UPDATE AT is available on the PROG page (use with extreme caution).'; if (!S.ac.gps) msgAll('GPS PRIMARY LOST'); }
    else if (k === 'reset') { fresh(); gi = 0; pin = -1; simNote = 'FMGC reset.'; }
  }

  fresh();
  window.ECAM_FMGC = {
    key: function (panelId, k) { key(panelId === 'MCDU2' ? 1 : 0, k); },
    screen: function (panelId, x, y, w, h) { return screenSvg(panelId === 'MCDU2' ? 1 : 0, x, y, w, h); },
    simHtml: simHtml, sim: sim, guideHtml: guideHtml, guide: guide,
    _state: function () { return S; }
  };
})();
