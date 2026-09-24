// Hand-ported from the VBA source of hydro_proto_v_0_2.xlsm
// (modHydroParams, modBigWell, modExtras, modGeoDistance, modCoordConvert,
//  modZSO_calc, modMapNomenclature, modKurlov, frmConverter).
// Behaviour (validation, messages, rounding) mirrors the add-in.

// ---------------------------------------------------------------- helpers
function toArr(v) {               // Excel range  -> flat array of values
  if (Array.isArray(v)) return v.flat(Infinity);
  return [v];
}
function fillPair(a, b) {
  const A = toArr(a), B = toArr(b);
  if (!A.length || !B.length || A.length !== B.length) return null;
  const outA = [], outB = [];
  for (let i = 0; i < A.length; i++) {
    if (!isNum(A[i]) || !isNum(B[i])) return null;
    outA.push(num(A[i])); outB.push(num(B[i]));
  }
  return [outA, outB];
}
function roundBankers(v, d) {     // VBA.Round
  const f = Math.pow(10, d), x = v * f, r = Math.round(x);
  const diff = Math.abs(x - Math.trunc(x));
  if (Math.abs(diff - 0.5) < 1e-9) { const fl = Math.floor(x); return (fl % 2 === 0 ? fl : fl + 1) / f; }
  return r / f;
}
function roundExcel(v, d) {       // WorksheetFunction.Round (half away from zero)
  const f = Math.pow(10, d);
  return Math.sign(v) * Math.round(Math.abs(v) * f + 1e-9) / f;
}

// ---------------------------------------------------------------- modHydroParams
function par_T(k, m) {
  if (!(isNum(k) && isNum(m))) return ERR_VALUE;
  return num(k) * num(m);
}
function levelcond(T_avg, mu) {
  if (!(isNum(T_avg) && isNum(mu))) return ERR_VALUE;
  if (num(mu) === 0) return ERR_DIV0;
  return num(T_avg) / num(mu);
}
function levelcond_star(k, eta_star) {
  if (!(isNum(k) && isNum(eta_star))) return ERR_VALUE;
  if (num(eta_star) === 0) return ERR_DIV0;
  return num(k) / num(eta_star);
}
function mu_star(eta_star, m) {
  if (!(isNum(eta_star) && isNum(m))) return ERR_VALUE;
  return num(eta_star) * num(m);
}
function par_B(t, kp, mp) {
  if (!(isNum(t) && isNum(kp) && isNum(mp))) return ERR_VALUE;
  if (num(kp) === 0) return ERR_DIV0;
  const v = num(t) * num(mp) / num(kp);
  if (v < 0) return ERR_NUM;
  return Math.sqrt(v);
}
function par_B2(t, k1, m1, k2, m2) {
  if (![t, k1, m1, k2, m2].every(isNum)) return ERR_VALUE;
  if (num(m1) === 0 || num(m2) === 0) return ERR_DIV0;
  const denom = num(k1) / num(m1) + num(k2) / num(m2);
  if (denom === 0) return ERR_DIV0;
  const v = num(t) / denom;
  if (v < 0) return ERR_NUM;
  return Math.sqrt(v);
}
function Kxy_avg(kx, ky) {
  if (!(isNum(kx) && isNum(ky))) return ERR_VALUE;
  const v = num(kx) * num(ky);
  if (v < 0) return ERR_NUM;
  return Math.sqrt(v);
}
function Kh_bulk(k, m) {
  const p = fillPair(k, m);
  if (!p) return 'Исходные данные неполные';
  let n = 0, d = 0;
  for (let i = 0; i < p[0].length; i++) { n += p[0][i] * p[1][i]; d += p[1][i]; }
  if (d === 0) return ERR_DIV0;
  return n / d;
}
function Kv_bulk(k, m) {
  const p = fillPair(k, m);
  if (!p) return 'Исходные данные неполные';
  let n = 0, d = 0;
  for (let i = 0; i < p[0].length; i++) {
    if (p[0][i] === 0) return ERR_DIV0;
    n += p[1][i]; d += p[1][i] / p[0][i];
  }
  if (d === 0) return ERR_DIV0;
  return n / d;
}

// ---------------------------------------------------------------- modExtras
function density(c) {
  if (!isNum(c)) return ERR_VALUE;
  return 1000 + 0.7 * num(c);
}
function type_M(value) {
  if (!isNum(value)) return ERR_VALUE;
  const v = num(value);
  let water = '', t = '';
  if (v <= 35) {
    water = 'воды';
    if (v <= 0.2) t = 'ультрапресные';
    else if (v <= 1) t = 'пресные';
    else if (v <= 3) t = 'слабосолоноватые';
    else if (v <= 10) t = 'солоноватые';
    else t = 'солёные';
  } else {
    water = 'рассолы';
    t = v <= 100 ? 'слабые' : 'крепкие';
  }
  return t + ' ' + water;
}
function type_pH(value) {
  if (!isNum(value)) return ERR_VALUE;
  const v = num(value);
  if (v <= 0 || v > 14) return 'некорректное значение величины pH';
  let t = '';
  if (v < 1.9) t = 'сильнокислые';
  else if (v < 4.1) t = 'кислые';
  else if (v < 7) t = 'слабокислые';
  else if (v === 7) t = 'нейтральные';
  else if (v < 8.3) t = 'слабощелочные';
  else if (v < 10.3) t = 'щелочные';
  else t = 'сильнощелочные';
  return t ? 'воды ' + t : 'воды';
}

// ---------------------------------------------------------------- modGeoDistance / modCoordConvert
function Distance3D(X1 = 0, Y1 = 0, Z1 = 0, X2 = 0, Y2 = 0, Z2 = 0) {
  if (![X1, Y1, Z1, X2, Y2, Z2].every(isNum)) return ERR_VALUE;
  const dx = num(X2) - num(X1), dy = num(Y2) - num(Y1), dz = num(Z2) - num(Z1);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function DMStoDD(deg = 0, minutes = 0, seconds = 0) {
  if (![deg, minutes, seconds].every(isNum)) return ERR_VALUE;
  const d = num(deg), m = num(minutes), s = num(seconds);
  if (m < 0 || m >= 60) return ERR_VALUE;
  if (s < 0 || s >= 60) return ERR_VALUE;
  const sign = d < 0 ? -1 : 1;
  return sign * (Math.abs(d) + m / 60 + s / 3600);
}
function DDtoDMS(dd = 0) {
  if (!isNum(dd)) return ERR_VALUE;
  const x = num(dd);
  const signStr = x < 0 ? '-' : '';
  const absX = Math.abs(x);
  const totalSec = absX * 3600;
  let deg = Math.floor(totalSec / 3600);
  let mn = Math.floor((totalSec - deg * 3600) / 60);
  let sec = totalSec - deg * 3600 - mn * 60;
  if (sec >= 60 - 0.000005) { sec = 0; mn += 1; }
  if (mn >= 60) { mn = 0; deg += 1; }
  const secStr = roundExcel(sec, 2).toFixed(2).padStart(5, '0').replace('.', ',');
  return signStr + deg + '°' + String(mn).padStart(2, '0') + '′' + secStr + '″';
}

// ---------------------------------------------------------------- modBigWell
function bwEta(bl) {
  const xT = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
  const yT = [1.05, 1.08, 1.12, 1.144, 1.16, 1.174, 1.18];
  if (bl <= xT[0]) return yT[0];
  if (bl >= xT[6]) return yT[6];
  for (let i = 0; i < 6; i++) {
    if (bl === xT[i]) return yT[i];
    if (xT[i] < bl && bl < xT[i + 1]) {
      const t = (bl - xT[i]) / (xT[i + 1] - xT[i]);
      return yT[i] + t * (yT[i + 1] - yT[i]);
    }
  }
  return 0;
}
function r_bigwell_line(l) {
  if (!isNum(l)) return ERR_VALUE;
  return roundBankers(0.2 * num(l), 2);
}
function r_bigwell_area(p) {
  if (!isNum(p)) return ERR_VALUE;
  return roundBankers(num(p) / (2 * Math.PI), 2);
}
function r_bigwell_rectangle(b, l) {
  if (!(isNum(b) && isNum(l))) return ERR_VALUE;
  const bb = num(b), L = num(l);
  if (L === 0) return ERR_DIV0;
  return roundBankers(bwEta(bb / L) * (L + bb) / 4, 2);
}
function r_bigwell_circle(f) {
  if (!isNum(f)) return ERR_VALUE;
  const F = num(f);
  if (F < 0) return ERR_NUM;
  return roundBankers(Math.sqrt(F / Math.PI), 2);
}
function r_bigwell_validity_boundaries(r, l) {
  if (!(isNum(r) && isNum(l))) return ERR_VALUE;
  if (num(r) === 0) return ERR_DIV0;
  return num(l) / num(r) >= 5;
}
function r_bigwell_validity_noboundaries(r, a_star, t) {
  if (!(isNum(r) && isNum(a_star) && isNum(t))) return ERR_VALUE;
  const at = num(a_star) * num(t);
  if (at < 0) return ERR_NUM;
  if (num(r) === 0) return ERR_DIV0;
  return 1.5 * Math.sqrt(at) / num(r) >= 5;
}
function bigwell_center_x(x, q) {
  const p = fillPair(x, q);
  if (!p) return 'Исходные данные неполные';
  let sxq = 0, sq = 0;
  p[0].forEach((xi, i) => { sxq += xi * p[1][i]; sq += p[1][i]; });
  if (sq === 0) return ERR_DIV0;
  return roundBankers(sxq / sq, 2);
}
function bigwell_center_y(y, q) { return bigwell_center_x(y, q); }
function bigwell_center(x, y, q) {
  const X = toArr(x), Y = toArr(y), Q = toArr(q);
  if (!X.length || X.length !== Y.length || X.length !== Q.length) return 'Исходные данные неполные';
  for (let i = 0; i < X.length; i++) if (![X[i], Y[i], Q[i]].every(isNum)) return 'Исходные данные неполные';
  let sx = 0, sy = 0, sq = 0;
  for (let i = 0; i < X.length; i++) { sx += num(X[i]) * num(Q[i]); sy += num(Y[i]) * num(Q[i]); sq += num(Q[i]); }
  if (sq === 0) return ERR_DIV0;
  return [roundBankers(sx / sq, 2), roundBankers(sy / sq, 2)];
}

// ---------------------------------------------------------------- modZSO_calc
const ZSO_PI = 3.14159265358979;
function zsoSearchRwell(T) {
  const eps = 0.0001; let lo = 0, hi = 1;
  const f = R => R - Math.log(1 + R);
  while (f(hi) < T) { lo = hi; hi *= 2; if (hi > 1e15) break; }
  while (hi - lo > eps) { const mid = (lo + hi) / 2; if (f(mid) < T) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function zsoSearchRrwell(T) {
  const eps = 0.0001; let lo = 0, hi = 1;
  const f = R => (1 - R <= 0 ? 1e300 : -(Math.log(1 - R) + R));
  while (hi - lo > eps) { const mid = (lo + hi) / 2; if (f(mid) < T) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function zsoSearchDwell(T) {
  const eps = 0.0001; let lo = 0, hi = ZSO_PI;
  const f = d => {
    if (d <= 0 || d >= ZSO_PI) return 1e300;
    const tn = Math.tan(d), sn = Math.sin(d);
    if (tn === 0 || sn === 0) return 1e300;
    return 1 - d / tn - Math.log(sn / d);
  };
  while (hi - lo > eps) { const mid = (lo + hi) / 2; if (f(mid) < T) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function zsoIntegrand(z) { const s = Math.sin(z); return (s === 0 || z === 0) ? 0 : -1 / (z * s * s); }
function zsoSimpson(a, b) { const c = (a + b) / 2; return (b - a) / 6 * (zsoIntegrand(a) + 4 * zsoIntegrand(c) + zsoIntegrand(b)); }
function zsoSimpsonRec(a, b, eps, whole, depth) {
  const c = (a + b) / 2, L = zsoSimpson(a, c), R = zsoSimpson(c, b);
  if (depth <= 0 || Math.abs(L + R - whole) <= 15 * eps) return L + R + (L + R - whole) / 15;
  return zsoSimpsonRec(a, c, eps / 2, L, depth - 1) + zsoSimpsonRec(c, b, eps / 2, R, depth - 1);
}
function zsoTvalLine(R) {
  const z = Math.atan(1 / R);
  return 2 * ZSO_PI * zsoSimpsonRec(ZSO_PI / 2, z, 0.000001, zsoSimpson(ZSO_PI / 2, z), 20);
}
function zsoSearchRline(T) {
  const eps = 0.001; let lo = eps, hi = 1, safety = 0;
  while (zsoTvalLine(hi) < T) { lo = hi; hi *= 2; if (++safety > 60) break; }
  while (hi - lo > eps) { const mid = (lo + hi) / 2; if (zsoTvalLine(mid) < T) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function zsoArgs(args) { return args.every(isNum) ? args.map(num) : null; }
function well_0b_0f(q, t, m, n) {
  const a = zsoArgs([q, t, m, n]); if (!a) return ERR_VALUE;
  [q, t, m, n] = a;
  const R = Math.sqrt(q * t / (ZSO_PI * m * n));
  return [roundExcel(R, 2), roundExcel(2 * R, 2), roundExcel(2 * R, 2)];
}
function well_0b(q, t, k, m, n, i) {
  const a = zsoArgs([q, t, k, m, n, i]); if (!a) return ERR_VALUE;
  [q, t, k, m, n, i] = a;
  const qv = k * m * i;
  const xp = q / (2 * ZSO_PI * qv);
  const T_ = qv * t / (m * n * xp);
  const R_ = zsoSearchRwell(T_), r_ = zsoSearchRrwell(T_), d_ = zsoSearchDwell(T_);
  const Rup = R_ * xp, rDn = r_ * xp, dHalf = d_ * xp;
  return [roundExcel(qv, 2), roundExcel(xp, 2), roundExcel(T_, 4), roundExcel(R_, 4),
          roundExcel(r_, 4), roundExcel(d_, 4), roundExcel(Rup, 2), roundExcel(rDn, 2),
          roundExcel(dHalf, 2), roundExcel(Rup + rDn, 2), roundExcel(2 * dHalf, 2)];
}
function line_0b_0f(q, t, l, k, m, n) {
  const a = zsoArgs([q, t, l, k, m, n]); if (!a) return ERR_VALUE;
  [q, t, l, k, m, n] = a;
  const T_ = q * t / (m * n * l * l);
  const R_ = zsoSearchRline(T_);
  const R = R_ * l, L = 2 * R;
  const dHalf = 2 * q * t / (ZSO_PI * m * n * L);
  return [roundExcel(T_, 4), roundExcel(R_, 4), roundExcel(R, 2), roundExcel(dHalf, 2),
          roundExcel(L, 1), roundExcel(2 * dHalf, 1)];
}
function line_0b(q, t, l, k, m, n, i) { return well_0b(q, t, k, m, n, i); }

// ---------------------------------------------------------------- modMapNomenclature
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI',
  'XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX',
  'XXXI','XXXII','XXXIII','XXXIV','XXXV','XXXVI'];
const CAPS = ['А', 'Б', 'В', 'Г'], LOWER = ['а', 'б', 'в', 'г'];
function subIdx(value, cellMin, cellSize, div, fromTop) {
  let idx = Math.floor((value - cellMin) / (cellSize / div));
  if (idx < 0) idx = 0; if (idx > div - 1) idx = div - 1;
  return fromTop ? div - 1 - idx : idx;
}
function mapNomenAll(lat, lon) {
  if (!isNum(lat) || !isNum(lon)) return null;
  lat = num(lat); lon = num(lon);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180 || Math.abs(lat) > 88) return null;
  const a = Math.abs(lat), s = [];
  const row = Math.min(Math.floor(a / 4), 21);
  const col = Math.min(Math.max(Math.floor((lon + 180) / 6), 0), 59);
  let swLat = row * 4, swLon = col * 6 - 180, szLat = 4, szLon = 6;
  const base = 'ABCDEFGHIJKLMNOPQRSTUV'[row] + '-' + (col + 1);
  s[0] = base;
  const rc = (swLa, swLo, la, lo, nr, nc) => [subIdx(a, swLa, la, nr, true), subIdx(lon, swLo, lo, nc, false)];
  let [r, c] = rc(swLat, swLon, 4, 6, 2, 2); s[1] = base + '-' + CAPS[r * 2 + c];
  [r, c] = rc(swLat, swLon, 4, 6, 6, 6); s[2] = base + '-' + ROMAN[r * 6 + c];
  const [r12, c12] = rc(swLat, swLon, 4, 6, 12, 12); s[3] = base + '-' + (r12 * 12 + c12 + 1);
  // descend: 100K -> 50K -> 25K -> 10K -> 5K -> 2K -> 1K -> 500
  const next = (swLa, swLo, la, lo, nr, nc, rr, cc) => [swLa + (nr - 1 - rr) * la / nr, swLo + cc * lo / nc];
  [swLat, swLon] = next(swLat, swLon, 4, 6, 12, 12, r12, c12); szLat = 4 / 12; szLon = 6 / 12;
  const steps = [
    [2, 2, i => '-' + CAPS[i]],
    [2, 2, i => '-' + LOWER[i]],
    [2, 2, i => '-' + (i + 1)],
    [2, 2, i => '-(' + (i + 1) + ')'],
    [3, 3, i => '-(' + (i + 1) + ')'],
    [2, 2, i => '-(' + (i + 1) + ')'],
    [2, 2, i => '-(' + (i + 1) + ')'],
  ];
  let prev = s[3];
  steps.forEach(([nr, nc, lab], k) => {
    [r, c] = rc(swLat, swLon, szLat, szLon, nr, nc);
    prev = prev + lab(r * nc + c); s[4 + k] = prev;
    [swLat, swLon] = next(swLat, swLon, szLat, szLon, nr, nc, r, c);
    szLat /= nr; szLon /= nc;
  });
  return s;
}
function mapSheet(idx) { return (lat, lon) => { const s = mapNomenAll(lat, lon); return s ? s[idx] : ERR_VALUE; }; }
const MapSheet1M = mapSheet(0), MapSheet500K = mapSheet(1), MapSheet200K = mapSheet(2),
  MapSheet100K = mapSheet(3), MapSheet50K = mapSheet(4), MapSheet25K = mapSheet(5),
  MapSheet10K = mapSheet(6), MapSheet5K = mapSheet(7), MapSheet2K = mapSheet(8),
  MapSheet1K = mapSheet(9), MapSheet500 = mapSheet(10);

// ---------------------------------------------------------------- modKurlov (dialog)
const EQ = { Ca: 20.039, Mg: 12.1525, Na: 22.99, K: 39.098, HCO3: 61.016, CO3: 30.004, Cl: 35.453, SO4: 48.031 };
const ANIONS = ['HCO3', 'CO3', 'Cl', 'SO4'], CATIONS = ['Ca', 'Mg', 'Na', 'K'];
const ION_MAIN = { Ca: 'кальциевая', Mg: 'магниевая', Na: 'натриевая', K: 'калиевая', HCO3: 'гидрокарбонатная', CO3: 'карбонатная', Cl: 'хлоридная', SO4: 'сульфатная' };
const ION_SUB = { Ca: 'кальциево-', Mg: 'магниево-', Na: 'натриево-', K: 'калиево-', HCO3: 'гидрокарбонатно-', CO3: 'карбонатно-', Cl: 'хлоридно-', SO4: 'сульфатно-' };
function kurlov(ions) {
  const v = k => (isNum(ions[k]) ? num(ions[k]) : 0);
  const M = [...CATIONS, ...ANIONS].reduce((s, k) => s + v(k), 0);
  const sum = keys => keys.reduce((s, k) => s + v(k) / EQ[k], 0);
  const rA = sum(ANIONS), rK = sum(CATIONS);
  const err = rA + rK === 0 ? 0 : 100 * (rK - rA) / (rK + rA);
  const pct = (keys, total) => {
    const out = [];
    if (total <= 0) return out;
    keys.forEach(k => { const p = Math.floor(100 * (v(k) / EQ[k]) / total + 0.5); if (p >= 1) out.push([k, p]); });
    // bubble sort, descending, stable like the VBA version
    for (let i = 0; i < out.length - 1; i++)
      for (let j = 0; j < out.length - 1 - i; j++)
        if (out[j][1] < out[j + 1][1]) { const t = out[j]; out[j] = out[j + 1]; out[j + 1] = t; }
    return out;
  };
  const pA = pct(ANIONS, rA), pK = pct(CATIONS, rK);
  const namePart = arr => {
    let res = '', main = false;
    arr.forEach(([k, p]) => { if (p >= 20) { if (!main) { res = ION_MAIN[k]; main = true; } else res = ION_SUB[k] + res; } });
    return res;
  };
  const nA = namePart(pA), nK = namePart(pK);
  const name = (nA || nK) ? ('вода ' + nA + ' ' + nK).trim() : '';
  const g = M / 1000;
  const cls = g < 0.2 ? 'ультрапресная' : g < 1 ? 'пресная' : g < 3 ? 'слабосолоноватая' : g < 10 ? 'солоноватая' : g < 35 ? 'солёная' : 'рассол';
  return { M, M_gL: g, error: err, anions: pA, cations: pK, name, type: cls };
}

// ---------------------------------------------------------------- frmConverter (dialog)
const CONVERTER = {
  'Температура': { temp: true, units: ['°C', 'K', '°F'] },
  'Плотность': { units: [['т/м³', 1000], ['кг/м³', 1], ['г/см³', 1000], ['г/л', 1], ['г/дм³', 1], ['г/фут³', 35.3146667215], ['фунт/см³', 453592.37], ['фунт/дм³', 453.59237], ['фунт/фут³', 16.01846337396], ['фунт/галлон', 119.826427316], ['фунт/баррель', 2.853010329]] },
  'Время': { units: [['с', 1], ['мин', 60], ['ч', 3600], ['сут', 86400], ['год', 31536000], ['год (365.25 сут)', 31557600]] },
  'Давление': { units: [['Па', 1], ['кПа', 1000], ['МПа', 1e6], ['бар', 1e5], ['атм', 101325], ['м вод. ст.', 9806.65], ['мм рт. ст.', 133.3223684211]] },
  'Длина': { units: [['мм', 0.001], ['см', 0.01], ['м', 1], ['км', 1000], ['дюйм', 0.0254], ['фут', 0.3048], ['ярд', 0.9144], ['миля', 1609.344]] },
  'Площадь': { units: [['мм²', 1e-6], ['см²', 1e-4], ['дм²', 0.01], ['м²', 1], ['га', 1e4], ['км²', 1e6], ['акр', 4046.8564224], ['дюйм²', 0.00064516], ['ярд²', 0.83612736], ['миля²', 2589988.110336]] },
  'Объём': { units: [['см³', 1e-6], ['л', 0.001], ['мл', 1e-6], ['м³', 1], ['дм³', 0.001], ['фут³', 0.028316846592], ['галлон', 0.003785411784]] },
  'Масса': { units: [['мг', 1e-6], ['г', 0.001], ['кг', 1], ['т', 1000], ['центнер', 100], ['фунт', 0.45359237], ['унция', 0.028349523125], ['карат', 0.0002]] },
  'Скорость': { units: [['км/час', 1000 / 3600], ['м/сек', 1], ['м/сут', 1 / 86400], ['миль/час', 1609.344 / 3600], ['фут/сек', 0.3048]] },
  'Коэф. фильтрации': { units: [['м/сут', 1 / 86400], ['м/час', 1 / 3600], ['м/мин', 1 / 60], ['м/сек', 1], ['см/сут', 0.01 / 86400], ['см/час', 0.01 / 3600], ['см/мин', 0.01 / 60], ['см/сек', 0.01], ['фут/сут', 0.3048 / 86400], ['фут/час', 0.3048 / 3600], ['фут/мин', 0.3048 / 60], ['фут/сек', 0.3048]] },
  'Расход': { units: [['м³/сут', 1 / 86400], ['м³/час', 1 / 3600], ['м³/мин', 1 / 60], ['м³/с', 1], ['л/час', 0.001 / 3600], ['л/мин', 0.001 / 60], ['л/с', 0.001]] },
};
function convertAll(category, fromIdx, value) {
  const c = CONVERTER[category]; const x = num(value);
  if (c.temp) {
    const K = [x + 273.15, x, (x - 32) * 5 / 9 + 273.15][fromIdx];
    return [K - 273.15, K, (K - 273.15) * 9 / 5 + 32];
  }
  const base = x * c.units[fromIdx][1];
  return c.units.map(u => base / u[1]);
}
