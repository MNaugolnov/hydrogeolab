"""Assemble assets/js/hydro-lib.js from generated + hand-ported parts."""
import subprocess, re
subprocess.run(['python3','vba2js.py','generated.js','vba_src/modReserves.bas','vba_src/modInflow.bas','vba_src/modAtmInflow.bas'], check=True)
gen = open('generated.js', encoding='utf-8').read()
hand = open('lib-handwritten.js', encoding='utf-8').read()
names = re.findall(r'^function (\w+)\(', gen, re.M)
hand_public = ['par_T','levelcond','levelcond_star','mu_star','par_B','par_B2','Kxy_avg','Kh_bulk','Kv_bulk',
  'density','type_M','type_pH','Distance3D','DMStoDD','DDtoDMS',
  'r_bigwell_line','r_bigwell_area','r_bigwell_rectangle','r_bigwell_circle',
  'r_bigwell_validity_boundaries','r_bigwell_validity_noboundaries','bigwell_center_x','bigwell_center_y','bigwell_center',
  'well_0b_0f','well_0b','line_0b_0f','line_0b',
  'MapSheet1M','MapSheet500K','MapSheet200K','MapSheet100K','MapSheet50K','MapSheet25K','MapSheet10K','MapSheet5K','MapSheet2K','MapSheet1K','MapSheet500']
extra = ['mapNomenAll','kurlov','convertAll','CONVERTER','isErr','fmt','ERR_VALUE','ERR_DIV0','ERR_NUM']
head = r"""/*! Cenozoic hydro-lib — JavaScript port of the «Гидрогеология v.02» Excel add-in functions.
 *  Used by the documentation site for live examples. Mirrors VBA behaviour
 *  (argument checks, error values, text messages, rounding).
 *  Parts are auto-generated from the VBA source (see docsgen/vba2js.py). */
(function (G) {
'use strict';
const PI = 3.14159265358979;               // VBA constant used by the add-in
const ERR_VALUE = { err: '#ЗНАЧ!' }, ERR_DIV0 = { err: '#ДЕЛ/0!' }, ERR_NUM = { err: '#ЧИСЛО!' };
function isErr(v) { return v && typeof v === 'object' && !Array.isArray(v) && 'err' in v; }
function isNum(v) {                        // VBA IsNumeric (RU locale, blank cell = 0)
  if (typeof v === 'number') return isFinite(v);
  if (typeof v === 'boolean') return true;
  if (v === undefined || v === null) return true;
  const s = String(v).trim().replace(/\s+/g, '').replace(',', '.');
  if (s === '') return true;
  return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s);
}
function num(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? -1 : 0;
  if (v === undefined || v === null) return 0;
  const s = String(v).trim().replace(/\s+/g, '').replace(',', '.');
  return s === '' ? 0 : Number(s);
}
function fmt(v, digits) {                  // RU number formatting for display
  if (isErr(v)) return v.err;
  if (typeof v === 'boolean') return v ? 'ИСТИНА' : 'ЛОЖЬ';
  if (Array.isArray(v)) return v.map(x => fmt(x, digits)).join('; ');
  if (typeof v !== 'number') return String(v);
  if (!isFinite(v)) return '#ЧИСЛО!';
  const d = digits === undefined ? (Math.abs(v) >= 100 ? 2 : Math.abs(v) >= 1 ? 3 : 4) : digits;
  let s = v.toFixed(d);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  const [i, f] = s.split('.');
  const ig = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return f ? ig + ',' + f : ig;
}
"""
fix = r"""
// FIX (сайт): в надстройке v0.2 для напорного пласта с перетеканием стоит ln(1.12*B/r^2).
// По Хантушу–Джейкобу и по безнапорному аналогу должно быть ln(1.12*B/r) — используем исправленную формулу.
drawdown_conf_ch_simple = function (Q_debit, k_filtr, m_power, r_dist, B_perc) {
  if (![Q_debit, k_filtr, m_power, r_dist, B_perc].every(isNum)) return ERR_VALUE;
  const Q = num(Q_debit), k = num(k_filtr), m = num(m_power), r = num(r_dist), B = num(B_perc);
  if (k === 0 || m === 0 || r === 0) return ERR_DIV0;
  const arg = 1.12 * B / r;
  if (arg <= 0) return ERR_NUM;
  return Q / (2 * PI * k * m) * Math.log(arg);
};
"""
tail = "\nG.HydroLib = {\n  " + ",\n  ".join(names + hand_public + extra) + "\n};\n})(typeof window !== 'undefined' ? window : globalThis);\n"
gen_body = gen.split('\n',2)[2].replace('const GENERATED_NAMES', '// const GENERATED_NAMES')
# allow override of the buggy function
gen_body = gen_body.replace('function drawdown_conf_ch_simple(', 'var drawdown_conf_ch_simple = function drawdown_conf_ch_simple_vba(', 1)
out = head + gen_body + fix + hand + tail
open('../assets/js/hydro-lib.js','w',encoding='utf-8').write(out)
print(len(names), 'generated +', len(hand_public), 'hand-ported')
