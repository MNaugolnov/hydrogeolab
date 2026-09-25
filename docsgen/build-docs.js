// Build the «Справочник» (function library) section of the Cenozoic site.
// Usage: node build-docs.js   (writes into ../site/docs)
const fs = require('fs');
const path = require('path');
require('../assets/js/hydro-lib.js');
const H = globalThis.HydroLib;
const tex = require('./tex.js').render;
const META = require('./docs-meta.js');
const SIGS = JSON.parse(fs.readFileSync(path.join(__dirname, 'sigs.json'), 'utf-8'));
const OUT = path.join(__dirname, '..', 'docs');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sup = s => String(s).replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\*/g, '·');
const ru = v => (typeof v === 'number' ? String(v).replace('.', ',') : String(v));
const WARN = [];

// ----------------------------------------------------------------------------- parameters
function parseArg(text) {
  const m = /^(\S+)\s+-\s+(.*)$/.exec(text);
  if (!m) return { sym: '', desc: text, unit: '' };
  let desc = m[2], unit = '';
  const u = /,\s*((?:м|сут|ч|мм|км|КМ|г\/л|кг|мг|1\/м)[^,]*)$/.exec(desc);
  if (u) { unit = u[1]; desc = desc.slice(0, u.index); }
  const paren = /^(.*?)\s*\((или [^)]*)\)$/.exec(unit);
  if (paren) { unit = paren[1]; desc += ' (' + paren[2] + ')'; }
  unit = sup(unit).replace('КМ²', 'км²').replace(' (не м²!)', '');
  return { sym: sup(m[1]), desc: sup(desc), unit };
}
function params(name, over) {
  const sig = SIGS[name] || {};
  const names = (sig.params || []).map(p => p.replace(/^Optional\s+/, '').split(' ')[0]);
  const args = sig.args || [];
  return names.map((n, i) => {
    const base = args[i] ? parseArg(args[i]) : { sym: '', desc: '', unit: '' };
    const o = over && over[i];
    return { name: n, sym: base.sym, desc: (o && o.desc) || base.desc, unit: o && o.unit !== undefined ? o.unit : base.unit };
  });
}

// ----------------------------------------------------------------------------- scheme functions
const SCH = {};
function schemeFn(kind, conf, s) {
  const c = s.c, cu = c / 2;
  const coef = (x, sym) => (x === 1 ? '\\pi ' + sym : x === 0.5 ? '\\frac{\\pi}{2} ' + sym : x + '\\pi ' + sym);
  let t;
  const multi = /[+]/.test(s.X) || /-\s*0/.test(s.X);
  const XX = multi ? `\\left[ ${s.X} \\right]` : s.X;
  if (kind === 'drawdown') t = conf ? `S = \\frac{Q}{${coef(c, 'k m')}}\\,${XX}` :
    `S = h - \\sqrt{h^2 - \\frac{Q}{${coef(cu, 'k')}}\\,${XX}}`;
  else t = conf ? `Q = \\frac{${coef(c, 'k m S')}}{${s.X}}` : `Q = \\frac{${coef(cu, 'k')}(h_0^2 - h_1^2)}{${s.X}}`;
  const name = `${kind}_${conf ? 'conf' : 'unconf'}_${s.id}_simple`;
  const layer = conf ? 'напорный пласт' : 'безнапорный пласт';
  const res = kind === 'drawdown';
  const exBase = res ? META.EX_RES : META.EX_INF;
  const exStrip = res ? META.EX_RES_STRIP : META.EX_INF_STRIP;
  const ps = params(name);
  let args = ps.map(p => (s.id.startsWith('strip') && exStrip[p.name] !== undefined ? exStrip[p.name] : exBase[p.name]));
  if (res && !conf) args = args.map((v, i) => (ps[i].name === 'Q_debit' ? 1000 : v));
  if (res && s.exRes) args = args.map((v, i) => (s.exRes[ps[i].name] !== undefined ? s.exRes[ps[i].name] : v));
  const partner = `${kind}_${conf ? 'unconf' : 'conf'}_${s.id}_simple`;
  const other = `${res ? 'discharge' : 'drawdown'}_${conf ? 'conf' : 'unconf'}_${s.id}_simple`;
  const rel = [partner];
  if (SIGS[other]) rel.push(other);
  if (s.id === 'ch') rel.push('par_B', 'par_B2');
  rel.push(res ? 'r_bigwell_line' : 'r_bigwell_circle');
  const f = {
    title: `${s.title}: ${layer}`, short: layer, scheme: s,
    summary: (res ? 'Понижение уровня S в заданной точке пласта' : 'Водоприток Q в выработку при заданном понижении S') +
      ` — ${s.title.toLowerCase()} (${s.sub}), ${layer}.`,
    tex: t, rho: s.rho, result: res ? { desc: 'понижение уровня S', unit: 'м' } : { desc: 'водоприток Q', unit: 'м³/сут' },
    example: { args, story: (res ? META.STORY_RES : META.STORY_INF) + (res && !conf ? ' Для безнапорного пласта принят дебит 1 000 м³/сут.' : '') },
    notes: [], sources: res ? META.SRC_RES : META.SRC_INF, related: rel,
  };
  if (s.crit && res) f.notes.push(`Функция проверяет условие применимости ${s.crit}. Если оно не выполняется, вместо числа возвращается текст «не выполняется критерий (r^2)/(4*a*t) <= 0.1».`);
  if (s.crit && !res) f.notes.push(`Формула применима при ${s.crit.replace('≤ 0,1', '≪ 1')} (в функции не проверяется).`);
  if (!conf) f.notes.push('Если подкоренное выражение становится отрицательным (понижение больше мощности пласта), функция возвращает #ЧИСЛО!.');
  if (s.rho) f.notes.push('ρ₁ = 2L₁, ρ₂ = 2L₂, ρ₃ = √(ρ₁² + ρ₂²) — расстояния до скважин-отражений.');
  if (s.id.startsWith('strip')) f.notes.push('L — ширина полосы (расстояние между границами), L₁ — расстояние от скважины до ближайшей границы' + (s.id === 'strip_hq' ? ' (с постоянным напором).' : '.'));
  if (name === 'drawdown_conf_ch_simple') f.warn = 'В VBA-коде надстройки v0.2 стоит ln(1,12·B/r²) — размерно некорректно. Здесь приведена и используется в примере классическая формула ln(1,12·B/r) (Хантуш — Джейкоб), как в безнапорном аналоге drawdown_unconf_ch_simple. Исправьте modReserves, чтобы результаты в Excel совпали с сайтом.';
  if (!res && !conf) f.notes.push('h₀ — исходная мощность пласта, h₁ — остаточная мощность под дном выработки (понижение S = h₀ − h₁).');
  META.F[name] = f; SCH[name] = s;
  return name;
}
const resMod = META.MODULES.find(m => m.id === 'reserves');
const infMod = META.MODULES.find(m => m.id === 'inflow');
META.SCHEMES.forEach(s => {
  resMod.sections.push({ id: 'r-' + s.id, title: s.title, sub: s.sub, menu: ['Оценка запасов', 'Типовые схемы', 'Гидродинамический метод'],
    fns: [schemeFn('drawdown', false, s), schemeFn('drawdown', true, s)] });
  if (!s.reservesOnly) infMod.sections.push({ id: 'i-' + s.id, title: s.title, sub: s.sub, menu: ['Оценка водопритоков', 'Типовые схемы', 'Гидродинамический метод'],
    fns: [schemeFn('discharge', false, s), schemeFn('discharge', true, s)] });
});
infMod.sections.push({ id: 'i-bottom', title: 'Перетекание через дно', menu: ['Оценка водопритоков', 'Типовые схемы', 'Гидродинамический метод', 'Перетекание через дно'], fns: ['bottom_overflow'] });
infMod.sections.push({ id: 'i-atm', title: 'Атмосферные осадки', menu: ['Оценка водопритоков', 'Атмосферные осадки'],
  intro: 'Приток воды в выработку за счёт дождя, снеготаяния и ливней. Не зависит от подземного водопритока и суммируется с ним отдельно.',
  fns: ['rain_norm', 'meltwater', 'stormwater', 'intensity_stormwater'] });

// ----------------------------------------------------------------------------- index of all functions
const ALL = [];
META.MODULES.forEach(mod => mod.sections.forEach(sec => sec.fns.forEach(fn => {
  const f = META.F[fn];
  if (!f) throw new Error('No meta for ' + fn);
  f.name = fn; f.module = mod; f.section = sec;
  f.params = params(fn, f.params);
  if (!f.params.length) throw new Error('No params for ' + fn);
  ALL.push(f);
})));
const BYNAME = Object.fromEntries(ALL.map(f => [f.name, f]));
// Названия пунктов меню — как на ленте «Гидрогеология v.02»
const LABELS = {
  par_T: 'Водопроводимость T', levelcond: 'Уровнепроводность a', levelcond_star: 'Пьезопроводность a*',
  mu_star: 'Коэффициент упругой водоотдачи μ*', par_B: 'Параметр перетекания B', par_B2: 'Параметр перетекания B (два пласта)',
  Kxy_avg: 'Средний Кф анизотропного пласта', Kh_bulk: 'Приведённый Кф слоистой толщи (гор.)', Kv_bulk: 'Приведённый Кф слоистой толщи (верт.)',
  density: 'Плотность',
  r_bigwell_line: 'Линейный ряд / линейная дрена', r_bigwell_area: 'Площадная система (L/B > 3)',
  r_bigwell_rectangle: 'Прямоугольная (вытянутый прямоугольник)', r_bigwell_circle: 'Кольцевая / круг',
  r_bigwell_validity_noboundaries: 'Неограниченный в плане пласт', r_bigwell_validity_boundaries: 'Ограниченный в плане пласт',
  bigwell_center_x: 'Координата X центра тяжести', bigwell_center_y: 'Координата Y центра тяжести', bigwell_center: 'Координаты центра тяжести {x₀; y₀}',
  well_0b_0f: 'Сосредоточенный водозабор, без естественного потока', well_0b: 'Сосредоточенный водозабор, с естественным потоком',
  line_0b_0f: 'Линейный водозабор, без естественного потока', line_0b: 'Линейный водозабор, с естественным потоком',
  bottom_overflow: 'Перетекание через дно',
  rain_norm: 'Нормальный приток дождевых вод', meltwater: 'Нормальный приток талых вод', stormwater: 'Приток ливневых вод', intensity_stormwater: 'Интенсивность ливневого дождя',
  type_M: 'Тип воды по минерализации', type_pH: 'Тип воды по pH',
  Distance3D: 'Функция расстояния', DMStoDD: 'ГМС → десятичные градусы', DDtoDMS: 'Десятичные градусы → ГМС',
};
META.SCALES.forEach(([c, l]) => { LABELS['MapSheet' + c] = 'Масштаб ' + l; });
ALL.forEach(f => {
  f.label = LABELS[f.name] || (f.scheme ? f.short.charAt(0).toUpperCase() + f.short.slice(1) : f.title);
  f.navLabel = f.scheme ? f.scheme.title + ': ' + f.short : f.label;
});

// ----------------------------------------------------------------------------- example evaluation
const ROOTS = { f: '../../', tools: '../../', docs: '../' };
function colLetter(i) { return String.fromCharCode(65 + i); }
function evalExample(f) {
  if (f.range) {
    const r = f.range, n = r.rows.length;
    const cols = r.argCols.map(ci => r.rows.map(row => row[ci]));
    const v = H[f.name](...cols);
    const refs = r.argCols.map(ci => `${colLetter(ci)}2:${colLetter(ci)}${n + 1}`);
    return { value: v, formula: `=${f.name}(${refs.join('; ')})` };
  }
  const args = f.example.args;
  if (!args || args.length !== f.params.length) throw new Error('Bad example args for ' + f.name);
  const v = H[f.name](...args);
  return { value: v, formula: `=${f.name}(${args.map((_, i) => 'B' + (i + 1)).join('; ')})` };
}
function fmtVal(v) {
  if (H.isErr(v)) return v.err;
  if (typeof v === 'boolean') return v ? 'ИСТИНА' : 'ЛОЖЬ';
  if (typeof v === 'number') {
    const a = Math.abs(v);
    if (a !== 0 && a < 0.01) return String(Number(v.toPrecision(3))).replace('.', ',').replace(/e-(\d+)/, 'E-$1');
    return H.fmt(v);
  }
  return String(v);
}

// ----------------------------------------------------------------------------- scheme SVG
function schemeSvg(s) {
  const g = s.geo, W = 300, Hh = 180;
  const H1 = '#2f78b7', Q1 = '#56615b';
  const boundary = (x1, y1, x2, y2, type, label, lx, ly) => {
    let out = '';
    if (type === 'H') {
      out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${H1}" stroke-width="5" stroke-linecap="round"/>`;
    } else {
      out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${Q1}" stroke-width="2.5"/>`;
      const len = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(len / 12);
      const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      for (let i = 0; i <= n; i++) {
        const px = x1 + ux * i * 12, py = y1 + uy * i * 12;
        out += `<line x1="${px}" y1="${py}" x2="${px - uy * 8 - ux * 5}" y2="${py + ux * 8 - uy * 5}" stroke="${Q1}" stroke-width="1.3"/>`;
      }
    }
    out += `<text x="${lx}" y="${ly}" class="sv-lab" fill="${type === 'H' ? H1 : Q1}">${type === 'H' ? 'H = const' : 'Q = 0'}${label ? ' ' + label : ''}</text>`;
    return out;
  };
  const well = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="#16301a" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2.2" fill="#16301a"/>`;
  const dim = (x1, y1, x2, y2, label, lx, ly) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4c9040" stroke-width="1.4" marker-start="url(#a)" marker-end="url(#a)"/><text x="${lx}" y="${ly}" class="sv-dim">${label}</text>`;
  let body = '';
  if (g.type === 'none') {
    body += `<circle cx="150" cy="95" r="62" fill="none" stroke="#a7d79a" stroke-dasharray="5 5"/><circle cx="150" cy="95" r="34" fill="none" stroke="#c7e5bd" stroke-dasharray="4 4"/>` + well(150, 95) + dim(156, 95, 212, 95, 'r', 180, 88) + `<text x="150" y="172" class="sv-note" text-anchor="middle">границ нет — пласт бесконечен в плане</text>`;
  } else if (g.type === 'leak') {
    body += `<rect x="20" y="22" width="260" height="34" fill="#dbeaf6"/><text x="30" y="43" class="sv-note">смежный пласт, H = const</text>` +
      `<rect x="20" y="56" width="260" height="26" fill="url(#hatch)"/><text x="30" y="73" class="sv-note">разделяющий слой (kₚ, mₚ)</text>` +
      `<rect x="20" y="82" width="260" height="52" fill="#e2f1dd"/><text x="30" y="126" class="sv-note">основной пласт (k, m)</text>` +
      `<rect x="146" y="10" width="8" height="118" fill="#fff" stroke="#16301a" stroke-width="1.5"/>` +
      [70, 110, 200, 240].map(x => `<line x1="${x}" y1="60" x2="${x}" y2="80" stroke="${H1}" stroke-width="1.6" marker-end="url(#b)"/>`).join('') +
      `<text x="150" y="160" class="sv-note" text-anchor="middle">B — параметр перетекания</text>`;
  } else if (g.type === 'half') {
    body += boundary(50, 18, 50, 162, g.b1, '', 58, 30) + well(200, 100) + dim(56, 120, 194, 120, 'L', 122, 114);
  } else if (g.type === 'strip') {
    body += boundary(40, 18, 40, 162, g.b1, '', 46, 30) + boundary(260, 18, 260, 162, g.b2, '', 186, 30) + well(110, 90) +
      dim(46, 150, 254, 150, 'L', 146, 144) + dim(46, 108, 104, 108, 'L₁', 70, 102);
  } else if (g.type === 'corner') {
    body += boundary(50, 18, 50, 162, g.b1, '', 58, 30) + boundary(50, 162, 282, 162, g.b2, '', 190, 154) + well(150, 70) +
      dim(56, 70, 144, 70, 'L₁', 96, 64) + dim(150, 76, 150, 156, 'L₂', 156, 120);
  } else if (g.type === 'circle') {
    body += (g.b1 === 'H' ? `<circle cx="150" cy="92" r="72" fill="#eef5fb" stroke="${H1}" stroke-width="5"/>` :
      `<circle cx="150" cy="92" r="72" fill="#f3f6f2" stroke="${Q1}" stroke-width="2.5" stroke-dasharray="3 4"/>`) +
      well(150, 92) + dim(156, 92, 219, 92, 'R', 186, 86) + `<text x="150" y="178" class="sv-lab" text-anchor="middle" fill="${g.b1 === 'H' ? H1 : Q1}">${g.b1 === 'H' ? 'H = const на контуре' : 'Q = 0 на контуре'}</text>`;
  }
  return `<svg class="scheme-svg" viewBox="0 0 ${W} ${Hh + 6}" role="img" aria-label="Схема: ${esc(s.title)}"><defs>` +
    `<marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#4c9040"/></marker>` +
    `<marker id="b" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="${H1}"/></marker>` +
    `<pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#efe7da"/><line x1="0" y1="0" x2="0" y2="8" stroke="#b9a37f" stroke-width="2"/></pattern>` +
    `</defs>${body}</svg>`;
}

// ----------------------------------------------------------------------------- page chrome
function head(root, title, desc) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Справочник Cenozoic</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" href="${root}assets/img/favicon-32.png" sizes="32x32">
<link rel="icon" href="${root}assets/img/favicon-16.png" sizes="16x16">
<link rel="apple-touch-icon" href="${root}assets/img/apple-touch-icon.png">
<link rel="manifest" href="${root}site.webmanifest">
<meta name="theme-color" content="#123626">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${root}assets/css/style.css">
<link rel="stylesheet" href="${root}assets/css/docs.css">
</head>
<body class="docs-page">
`;
}
function nav(root) {
  return `<header class="nav is-light">
  <div class="nav-inner">
    <a href="${root}index.html" class="brand">
      <img src="${root}assets/img/logo-mark.png" alt="">
      <span class="brand-word">CENOZOIC</span>
    </a>
    <nav class="nav-links" id="navLinks">
      <a href="${root}index.html">Главная</a>
      <a href="${root}product.html">Модули</a>
      <a href="${root}docs/index.html" class="active">Справочник</a>
      <a href="${root}pricing.html">Тарифы</a>
      <a href="${root}company.html">Компания</a>
    </nav>
    <div class="nav-cta">
      <a href="${root}company.html#contact" class="btn btn-dark btn-sm btn-sm-hide">Написать нам</a>
      <button class="nav-toggle" id="navToggle" aria-label="Открыть меню" aria-expanded="false">
        <span data-icon="menu" style="width:20px;height:20px;display:block"></span>
      </button>
    </div>
  </div>
</header>
`;
}
function footer(root) {
  return `<footer>
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="${root}index.html" class="brand">
          <img src="${root}assets/img/logo-mark.png" alt="">
          <span class="brand-word">CENOZOIC</span>
        </a>
        <p>Инженерный софт для гидрогеологического моделирования, изысканий, мониторинга подземных вод и оценки притоков.</p>
      </div>
      <div class="footer-col">
        <h5>Продукт</h5>
        <ul>
          <li><a href="${root}product.html">Все модули</a></li>
          <li><a href="${root}parameters.html">Расчётные параметры</a></li>
          <li><a href="${root}reserves-inflow.html">Запасы и водопритоки</a></li>
          <li><a href="${root}tools.html">Инструменты</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5>Справочник</h5>
        <ul>
          <li><a href="${root}docs/index.html">Все функции</a></li>
          <li><a href="${root}docs/start.html">Как пользоваться</a></li>
          <li><a href="${root}docs/examples.html">Сквозные примеры</a></li>
          <li><a href="${root}docs/glossary.html">Глоссарий параметров</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5>Компания</h5>
        <ul>
          <li><a href="${root}company.html">О компании</a></li>
          <li><a href="${root}pricing.html">Тарифы</a></li>
          <li><a href="${root}company.html#contact">Контакты</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span data-year></span> Cenozoic. Прототип продукта.</span>
      <span>Белград, Сербия · Санкт-Петербург, Россия</span>
    </div>
  </div>
</footer>

<script src="${root}assets/js/main.js"></script>
<script src="${root}assets/js/hydro-lib.js"></script>
<script src="${root}assets/js/docs.js"></script>
</body>
</html>
`;
}
const TOOLS = {
  zso: { title: 'Калькулятор ЗСО', file: 'zso.html', mod: 'zso', icon: 'shield' },
  kurlov: { title: 'Формула солевого состава (Курлова)', file: 'kurlov.html', mod: 'hydrochem', icon: 'flask' },
  distance: { title: 'Калькулятор расстояния', file: 'distance.html', mod: 'aux', icon: 'ruler' },
  nomenclature: { title: 'Номенклатура карт', file: 'nomenclature.html', mod: 'aux', icon: 'map' },
  aggregator: { title: 'Агрегатор', file: 'aggregator.html', mod: 'aux', icon: 'combine' },
  converter: { title: 'Конвертер размерностей', file: 'converter.html', mod: 'aux', icon: 'swap' },
};
function sidebar(root, current) {
  let out = `<aside class="docs-side" id="docsSide">
  <div class="side-search"><input type="search" id="sideFilter" placeholder="Найти функцию…" aria-label="Найти функцию"></div>
  <a class="side-top${current === 'index' ? ' on' : ''}" href="${root}docs/index.html">Обзор справочника</a>
  <a class="side-top${current === 'start' ? ' on' : ''}" href="${root}docs/start.html">Как пользоваться</a>
  <a class="side-top${current === 'examples' ? ' on' : ''}" href="${root}docs/examples.html">Сквозные примеры</a>
  <a class="side-top${current === 'glossary' ? ' on' : ''}" href="${root}docs/glossary.html">Глоссарий параметров</a>
`;
  const curMod = BYNAME[current] ? BYNAME[current].module.id : Object.values(TOOLS).find(t => t.file === current + '.html') ? Object.values(TOOLS).find(t => t.file === current + '.html').mod : null;
  META.MODULES.forEach(mod => {
    out += `  <details class="side-mod"${curMod === mod.id ? ' open' : ''}><summary><span class="side-n">${mod.n}</span>${esc(mod.title)}</summary>\n`;
    (mod.tools || []).forEach(t => {
      const T = TOOLS[t];
      out += `    <a class="side-tool${current + '.html' === T.file ? ' on' : ''}" href="${root}docs/tools/${T.file}"><span data-icon="${T.icon}" class="side-ic"></span>${esc(T.title)}</a>\n`;
    });
    mod.sections.forEach(sec => {
      out += `    <div class="side-sec">${esc(sec.title)}</div>\n`;
      sec.fns.forEach(fn => {
        out += `    <a class="side-fn${fn === current ? ' on' : ''}" href="${root}docs/f/${fn}.html" data-k="${esc((fn + ' ' + BYNAME[fn].title + ' ' + BYNAME[fn].label).toLowerCase())}" title="${fn}">${esc(BYNAME[fn].label)}</a>\n`;
      });
    });
    out += '  </details>\n';
  });
  return out + '</aside>\n';
}
function crumbs(root, items) {
  return `<nav class="docs-crumb"><a href="${root}docs/index.html">Справочник</a>` +
    items.map(([t, h]) => `<span>›</span>` + (h ? `<a href="${h}">${esc(t)}</a>` : `<b>${esc(t)}</b>`)).join('') + '</nav>';
}
function layout(root, current, title, desc, main) {
  return head(root, title, desc) + nav(root) +
    `<div class="docs-wrap"><button class="side-toggle" id="sideToggle" aria-expanded="false">☰ Разделы справочника</button>` +
    sidebar(root, current) + `<main class="docs-main">${main}</main></div>\n` + footer(root);
}

// ----------------------------------------------------------------------------- function page
function sheetScalar(f, ex) {
  const rows = f.params.map((p, i) => `<tr><th>${i + 1}</th><td>${esc(p.sym || p.name)} — ${esc(shortDesc(p.desc))}</td><td class="v">${esc(ru(f.example.args[i]))}</td><td>${esc(p.unit || '')}</td></tr>`).join('');
  const n = f.params.length;
  let resultRow;
  if (Array.isArray(ex.value)) {
    const labels = f.result.labels || ex.value.map((_, i) => '#' + (i + 1));
    resultRow = `<tr class="res"><th>${n + 2}</th><td>Результат (массив)</td><td class="v" colspan="2">${ex.value.map((v, i) => `<span class="arr-cell"><em>${esc(labels[i])}</em>${esc(fmtVal(v))}</span>`).join('')}</td></tr>`;
  } else {
    resultRow = `<tr class="res"><th>${n + 2}</th><td>${esc(capital(f.result.desc))}</td><td class="v">${esc(fmtVal(ex.value))}</td><td>${esc(f.result.unit || '')}</td></tr>`;
  }
  return `<div class="xl"><div class="xl-bar"><span class="xl-cell">B${n + 2}</span><span class="xl-fx">fx</span><code>${esc(ex.formula)}</code></div>
<table class="xl-grid"><thead><tr><th></th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>${rows}<tr><th>${n + 1}</th><td></td><td></td><td></td></tr>${resultRow}</tbody></table></div>`;
}
function sheetRange(f, ex) {
  const r = f.range, n = r.rows.length;
  const head = `<tr><th></th>${r.cols.map((_, i) => `<th>${colLetter(i)}</th>`).join('')}</tr>`;
  let body = `<tr><th>1</th>${r.cols.map(c => `<td class="h">${esc(c)}</td>`).join('')}</tr>`;
  r.rows.forEach((row, i) => { body += `<tr><th>${i + 2}</th>${row.map(v => `<td class="${typeof v === 'number' ? 'v' : ''}">${esc(ru(v))}</td>`).join('')}</tr>`; });
  const val = Array.isArray(ex.value) ? ex.value.map((v, i) => `${(f.result.labels || [])[i] || ''} = ${fmtVal(v)}`).join(';  ') : fmtVal(ex.value);
  body += `<tr><th>${n + 2}</th>${r.cols.map(() => '<td></td>').join('')}</tr>`;
  body += `<tr class="res"><th>${n + 3}</th><td>${esc(capital(f.result.desc))}</td><td class="v" colspan="${r.cols.length - 1}">${esc(val)} ${esc(f.result.unit || '')}</td></tr>`;
  return `<div class="xl"><div class="xl-bar"><span class="xl-cell">B${n + 3}</span><span class="xl-fx">fx</span><code>${esc(ex.formula)}</code></div>
<table class="xl-grid"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}
const shortDesc = d => d.replace(/\s*\(.*\)\s*$/, '');
const capital = s => s.charAt(0).toUpperCase() + s.slice(1);

function fnPage(f, idx, list) {
  const root = ROOTS.f;
  const ex = evalExample(f);
  if (H.isErr(ex.value) || (typeof ex.value === 'string' && f.result.unit !== 'текст') || (typeof ex.value === 'number' && !isFinite(ex.value)))
    WARN.push(`${f.name}: example gives ${fmtVal(ex.value)}`);
  const mod = f.module, sec = f.section;
  const syntax = `=${f.name}(${f.params.map(p => p.name).join('; ')})`;
  const kind = f.array ? '<span class="badge badge-soon">возвращает массив</span>' :
    f.result.unit === 'текст' ? '<span class="badge badge-soon">возвращает текст</span>' :
    f.result.unit === 'логическое' ? '<span class="badge badge-soon">ИСТИНА / ЛОЖЬ</span>' : '';
  const menu = sec.menu.map(m => `<span>${esc(m)}</span>`).join('<i>›</i>') +
    (f.scheme ? `<i>›</i><span>${esc(f.scheme.title)}</span><i>›</i><span>${esc(capital(f.short))}</span>` :
      (sec.menu[sec.menu.length - 1] !== f.title && sec.id !== 'zso-fns' && sec.id !== 'mapsheets' && sec.id !== 'i-bottom' ? `<i>›</i><span>${esc(f.title)}</span>` : ''));
  const paramRows = f.params.map((p, i) => `<tr><td class="num">${i + 1}</td><td><code>${esc(p.name)}</code>${p.sym && p.sym !== p.name ? `<span class="sym">${esc(p.sym)}</span>` : ''}</td><td>${esc(capital(p.desc))}${GLOSS_KEYS.has(p.name) ? ` <a class="gl" href="${root}docs/glossary.html#p-${p.name}" title="В глоссарии">↗</a>` : ''}</td><td class="unit">${esc(p.unit || '—')}</td></tr>`).join('');
  const labels = f.result.labels ? `<ol class="res-labels">${f.result.labels.map(l => `<li>${esc(l)}</li>`).join('')}</ol>` : '';
  const notes = (f.notes || []).map(n => `<li>${esc(n)}</li>`).join('');
  const std = `<li><b>#ЗНАЧ!</b> — один из аргументов не является числом.</li><li><b>#ДЕЛ/0!</b> — нулевой знаменатель (например, k = 0 или m = 0).</li><li><b>#ЧИСЛО!</b> — недопустимые значения: отрицательное подкоренное выражение, логарифм от неположительного числа.</li>`;
  const rel = (f.related || []).filter(r => BYNAME[r]).map(r => `<a class="rel" href="${r}.html"><b>${esc(BYNAME[r].navLabel)}</b><code>${r}</code></a>`).join('');
  const prev = list[idx - 1], next = list[idx + 1];
  const calc = {
    fn: f.name, array: !!f.array, labels: f.result.labels || null, unit: f.result.unit,
    params: f.range ? null : f.params.map((p, i) => ({ name: p.name, sym: p.sym, unit: p.unit, value: f.example.args[i] })),
    range: f.range || null,
  };
  const extra = f.extraTable ? `<h3 class="d-h3">${esc(f.extraTable.caption)}</h3><div class="table-wrap"><table><thead><tr>${f.extraTable.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${f.extraTable.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  const main = `${crumbs(root, [[mod.title, root + 'docs/index.html#m-' + mod.id], [sec.title, root + 'docs/index.html#s-' + sec.id], [f.label]])}
<header class="fn-head">
  <div class="fn-kicker"><span class="side-n">${mod.n}</span>${esc(mod.title)}</div>
  <h1>${esc(f.title)}</h1>
  <p class="fn-title"><code class="fn-code">${f.name}</code> ${kind}</p>
  <p class="fn-sum">${esc(f.summary)}</p>
</header>

<section class="d-block">
  <h2 class="d-h2">Синтаксис</h2>
  <div class="code-line"><code id="syntax">${esc(syntax)}</code><button class="copy" data-copy="${esc(syntax)}">Копировать</button></div>
  <p class="ribbon-path"><span class="rp-label">На ленте:</span> <span>Гидрогеология v.02</span><i>›</i>${menu}</p>
</section>

<section class="d-block">
  <h2 class="d-h2">Формула</h2>
  <div class="formula-box${f.scheme ? ' with-scheme' : ''}">
    <div class="formula">${tex(f.tex)}</div>
    ${f.scheme ? `<figure class="scheme">${schemeSvg(f.scheme)}<figcaption>${esc(f.scheme.title)}${f.scheme.sub ? ' — ' + esc(f.scheme.sub) : ''}</figcaption></figure>` : ''}
  </div>
  ${f.warn ? `<div class="callout warn"><b>Важно.</b> ${esc(f.warn)}</div>` : ''}
  ${extra}
</section>

<section class="d-block">
  <h2 class="d-h2">Аргументы</h2>
  <div class="table-wrap"><table class="args"><thead><tr><th class="num">#</th><th>Аргумент</th><th>Описание</th><th>Ед. изм.</th></tr></thead><tbody>${paramRows}</tbody></table></div>
  <p class="res-line"><b>Результат:</b> ${esc(f.result.desc)}${f.result.unit && !['текст', 'логическое'].includes(f.result.unit) ? ', ' + esc(f.result.unit) : ''}.</p>
  ${labels}
</section>

<section class="d-block">
  <h2 class="d-h2">Пример использования</h2>
  <p class="story">${esc(f.example.story || '')}</p>
  ${f.range ? sheetRange(f, ex) : sheetScalar(f, ex)}
  ${f.array ? '<p class="muted small">Функция возвращает массив: выделите ячейки под результат в строке, введите формулу и нажмите <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd>. В Excel 365 результат «разольётся» по соседним ячейкам автоматически.</p>' : ''}
</section>

<section class="d-block try">
  <h2 class="d-h2">Попробуйте сами</h2>
  <p class="muted small">Измените значения — результат пересчитывается по тому же алгоритму, что и в надстройке (JavaScript-версия функции).</p>
  <div class="calc" data-calc='${esc(JSON.stringify(calc))}'></div>
</section>

<section class="d-block">
  <h2 class="d-h2">Ограничения и возвращаемые ошибки</h2>
  <ul class="notes">${notes}${std}</ul>
</section>

${rel ? `<section class="d-block"><h2 class="d-h2">Связанные функции</h2><div class="rel-grid">${rel}</div></section>` : ''}
${f.sources ? `<section class="d-block"><h2 class="d-h2">Источники</h2><p class="src">${esc(f.sources)}</p></section>` : ''}

<nav class="pn">${prev ? `<a href="${prev.name}.html" class="pn-prev"><small>← Предыдущая</small><b>${esc(prev.navLabel)}</b><code>${prev.name}</code></a>` : '<span></span>'}${next ? `<a href="${next.name}.html" class="pn-next"><small>Следующая →</small><b>${esc(next.navLabel)}</b><code>${next.name}</code></a>` : '<span></span>'}</nav>`;
  return layout(root, f.name, `${f.name} — ${f.title}`, f.summary, main);
}

// ----------------------------------------------------------------------------- glossary
const GLOSS = [
  ['Q_debit', 'дебит (расход) водозабора', 'м³/сут'], ['k_filtr', 'коэффициент фильтрации пласта', 'м/сут'],
  ['m_power', 'мощность напорного пласта', 'м'], ['h_power', 'мощность (уровень) безнапорного пласта до откачки', 'м'],
  ['a_piezo', 'пьезопроводность напорного пласта', 'м²/сут'], ['a_level', 'уровнепроводность безнапорного пласта', 'м²/сут'],
  ['t_time', 'время от начала откачки / эксплуатации', 'сут'], ['r_dist', 'расстояние от скважины до расчётной точки или радиус «большого колодца»', 'м'],
  ['S_drawdown', 'понижение уровня', 'м'], ['h0_initial', 'начальная мощность потока (для водопритоков)', 'м'],
  ['h1_remain', 'остаточная мощность потока под дном выработки', 'м'], ['B_perc', 'параметр перетекания', 'м'],
  ['L_bound', 'расстояние от скважины до границы пласта / ширина полосы', 'м'], ['L1_near', 'расстояние до ближней границы (пласт-полоса, пласт-угол)', 'м'],
  ['L2_far', 'расстояние до второй границы (пласт-угол)', 'м'], ['R_circ', 'радиус кругового пласта', 'м'],
  ['kp_aquit', 'коэффициент фильтрации слабопроницаемого слоя', 'м/сут'], ['mp_aquit', 'мощность слабопроницаемого слоя', 'м'],
  ['dh_head', 'разность напоров по обе стороны слабопроницаемого слоя', 'м'], ['F_area', 'площадь дна выработки (карьера, котлована)', 'м²'],
  ['F_catch', 'площадь водосбора (атмосферные осадки)', 'км²'], ['alpha_runoff', 'коэффициент поверхностного стока', '—'],
  ['lat', 'широта (+ север, − юг)', 'десятичные градусы'], ['lon', 'долгота (+ восток, − запад)', 'десятичные градусы'],
];
const GLOSS_KEYS = new Set(GLOSS.map(g => g[0]));
function glossaryPage() {
  const root = ROOTS.docs;
  const rows = GLOSS.map(([p, d, u]) => {
    const users = ALL.filter(f => f.params.some(x => x.name === p)).map(f => f.name);
    const list = users.slice(0, 8).map(n => `<a href="f/${n}.html"><code>${n}</code></a>`).join(' ') + (users.length > 8 ? ` <span class="muted">и ещё ${users.length - 8}</span>` : '');
    return `<tr id="p-${p}"><td><code>${p}</code></td><td>${esc(capital(d))}</td><td class="unit">${esc(u)}</td><td class="users">${list}</td></tr>`;
  }).join('');
  const main = `${crumbs(root, [['Глоссарий параметров']])}
<header class="fn-head"><h1>Глоссарий параметров</h1>
<p class="fn-sum">Многие функции модулей «Оценка запасов» и «Оценка водопритоков» используют одинаковые «говорящие» имена аргументов — это одна и та же величина в разных функциях. Значения аргументов, специфичных для одной функции (например, параметры формулы Молокова), описаны на странице самой функции и в подсказке Мастера аргументов Excel.</p></header>
<div class="table-wrap"><table class="args gloss"><thead><tr><th>Параметр</th><th>Значение</th><th>Ед. изм.</th><th>Где используется</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  return layout(root, 'glossary', 'Глоссарий параметров', 'Единые обозначения аргументов функций надстройки «Гидрогеология».', main);
}

// ----------------------------------------------------------------------------- docs index
function indexPage() {
  const root = ROOTS.docs;
  let cards = '';
  META.MODULES.forEach(mod => {
    const count = mod.sections.reduce((s, x) => s + x.fns.length, 0);
    cards += `<section class="lib-mod" id="m-${mod.id}"><div class="lib-mod-head"><div class="icon-badge" data-icon="${mod.icon}"></div><div><h2><span class="side-n">${mod.n}</span>${esc(mod.title)}</h2><p>${esc(mod.lead)}</p></div><span class="lib-count">${count} ${plural(count, 'функция', 'функции', 'функций')}${mod.tools ? ' · ' + mod.tools.length + ' ' + plural(mod.tools.length, 'окно', 'окна', 'окон') : ''}</span></div>`;
    if (mod.tools) cards += `<div class="lib-tools">${mod.tools.map(t => `<a href="tools/${TOOLS[t].file}" class="lib-tool"><span data-icon="${TOOLS[t].icon}"></span>${esc(TOOLS[t].title)}<small>окно-калькулятор</small></a>`).join('')}</div>`;
    mod.sections.forEach(sec => {
      cards += `<div class="lib-sec" id="s-${sec.id}"><h3>${esc(sec.title)}${sec.sub ? `<small>${esc(sec.sub)}</small>` : ''}</h3>${sec.intro ? `<p class="muted small">${esc(sec.intro)}</p>` : ''}<div class="lib-fns">`;
      sec.fns.forEach(fn => {
        const f = BYNAME[fn];
        cards += `<a class="lib-fn" href="f/${fn}.html" data-k="${esc((fn + ' ' + f.label + ' ' + f.title + ' ' + f.summary).toLowerCase())}"><b>${esc(f.label)}</b><code>${fn}</code></a>`;
      });
      cards += '</div></div>';
    });
    cards += '</section>';
  });
  const main = `<header class="lib-hero">
  <span class="kicker">Справочник пользователя · надстройка «Гидрогеология v.02»</span>
  <h1>Библиотека функций и модулей</h1>
  <p>Все ${ALL.length} функций и 6 окон-калькуляторов надстройки: синтаксис, формулы, аргументы с единицами измерения, условия применимости и готовый пример на листе Excel. На каждой странице можно пересчитать пример со своими данными.</p>
  <div class="lib-search"><input type="search" id="libSearch" placeholder="Поиск: «водоприток», «ЗСО», par_T, «номенклатура»…" aria-label="Поиск по функциям" autocomplete="off"><span id="libCount"></span></div>
  <div class="lib-quick"><a href="start.html" class="btn btn-dark btn-sm">Как пользоваться</a><a href="examples.html" class="btn btn-outline btn-sm">Сквозные примеры</a><a href="glossary.html" class="btn btn-outline btn-sm">Глоссарий параметров</a></div>
</header>
<p class="lib-empty" id="libEmpty" hidden>Ничего не найдено. Попробуйте другое слово или имя функции.</p>
${cards}`;
  return layout(root, 'index', 'Библиотека функций', `Справочник всех ${ALL.length} функций надстройки «Гидрогеология»: синтаксис, формулы, примеры.`, main);
}
function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; }

module.exports = { ALL, BYNAME, META, H, tex, esc, layout, crumbs, ROOTS, TOOLS, fmtVal, ru, schemeSvg, capital };

if (require.main === module) {
  fs.mkdirSync(path.join(OUT, 'f'), { recursive: true });
  ALL.forEach((f, i) => fs.writeFileSync(path.join(OUT, 'f', f.name + '.html'), fnPage(f, i, ALL)));
  fs.writeFileSync(path.join(OUT, 'index.html'), indexPage());
  fs.writeFileSync(path.join(OUT, 'glossary.html'), glossaryPage());
  require('./build-pages.js');
  console.log('functions:', ALL.length);
  if (WARN.length) console.log('WARNINGS:\n' + WARN.join('\n'));
}
