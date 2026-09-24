// Cenozoic — справочник: поиск, копирование, живые примеры и окна-калькуляторы.
(function () {
  'use strict';
  var H = window.HydroLib;
  if (!H) return;

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function val(v) {
    if (H.isErr(v)) return '<span class="err">' + v.err + '</span>';
    if (typeof v === 'number') {
      var a = Math.abs(v);
      if (a !== 0 && a < 0.01) return String(Number(v.toPrecision(3))).replace('.', ',').replace(/e-(\d+)/, 'E-$1');
    }
    return esc(H.fmt(v));
  }
  function ruIn(v) { return v === undefined || v === null ? '' : String(v).replace('.', ','); }
  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }

  // ------------------------------------------------------------ sidebar
  var side = document.getElementById('docsSide'), tgl = document.getElementById('sideToggle');
  if (side && tgl) tgl.addEventListener('click', function () {
    var open = side.classList.toggle('open'); tgl.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  var sf = document.getElementById('sideFilter');
  if (sf) sf.addEventListener('input', function () {
    var q = norm(sf.value.trim());
    side.querySelectorAll('.side-mod').forEach(function (mod) {
      var any = false;
      mod.querySelectorAll('.side-fn').forEach(function (a) {
        var hit = !q || norm(a.getAttribute('data-k')).indexOf(q) >= 0;
        a.style.display = hit ? '' : 'none'; any = any || hit;
      });
      mod.querySelectorAll('.side-sec').forEach(function (s) { s.style.display = q ? 'none' : ''; });
      if (q) { mod.open = any; mod.style.display = any ? '' : 'none'; } else { mod.style.display = ''; }
    });
  });
  var onLink = side && side.querySelector('.on');
  if (onLink && onLink.scrollIntoView) { try { onLink.scrollIntoView({ block: 'center' }); window.scrollTo(0, 0); } catch (e) {} }

  // ------------------------------------------------------------ library search
  var ls = document.getElementById('libSearch');
  if (ls) {
    var cnt = document.getElementById('libCount'), empty = document.getElementById('libEmpty');
    var run = function () {
      var q = norm(ls.value.trim()), shown = 0;
      document.querySelectorAll('.lib-fn').forEach(function (a) {
        var hit = !q || q.split(/\s+/).every(function (w) { return norm(a.getAttribute('data-k')).indexOf(w) >= 0; });
        a.style.display = hit ? '' : 'none'; if (hit) shown++;
      });
      document.querySelectorAll('.lib-sec').forEach(function (s) {
        var vis = Array.prototype.some.call(s.querySelectorAll('.lib-fn'), function (a) { return a.style.display !== 'none'; });
        s.style.display = vis ? '' : 'none';
      });
      document.querySelectorAll('.lib-mod').forEach(function (m) {
        var vis = Array.prototype.some.call(m.querySelectorAll('.lib-sec'), function (s) { return s.style.display !== 'none'; });
        m.style.display = vis || !q ? '' : 'none';
      });
      if (cnt) cnt.textContent = q ? 'найдено: ' + shown : '';
      if (empty) empty.hidden = shown > 0;
    };
    ls.addEventListener('input', run);
    if (location.hash && location.hash.indexOf('#q=') === 0) { ls.value = decodeURIComponent(location.hash.slice(3)); run(); }
  }

  // ------------------------------------------------------------ copy buttons
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy');
      var done = function () { var o = b.textContent; b.textContent = 'Скопировано'; setTimeout(function () { b.textContent = o; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done); else done();
    });
  });

  // ------------------------------------------------------------ function calculators
  document.querySelectorAll('.calc[data-calc]').forEach(function (box) {
    var cfg = JSON.parse(box.getAttribute('data-calc'));
    var fn = H[cfg.fn], out = el('div', { class: 'calc-out' });
    var form = el('div', { class: 'calc-form' });
    var get, restore;
    if (cfg.range) {
      var r = cfg.range, t = el('table', { class: 'calc-range' });
      var h = '<thead><tr>' + r.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      r.rows.forEach(function (row, i) {
        h += '<tr>' + row.map(function (v, j) {
          return r.argCols.indexOf(j) >= 0 ? '<td><input data-r="' + i + '" data-c="' + j + '" value="' + ruIn(v) + '" inputmode="decimal"></td>' : '<td>' + esc(v) + '</td>';
        }).join('') + '</tr>';
      });
      t.innerHTML = h + '</tbody>'; form.appendChild(t);
      var initialT = t.innerHTML;
      restore = function () { t.innerHTML = initialT; };
      get = function () {
        return r.argCols.map(function (c) {
          return r.rows.map(function (_, i) { return t.querySelector('input[data-r="' + i + '"][data-c="' + c + '"]').value; });
        });
      };
    } else {
      var inputs = cfg.params.map(function (p) {
        var lab = el('label', { class: 'calc-field' });
        lab.innerHTML = '<span class="cf-name"><code>' + esc(p.name) + '</code>' + (p.sym && p.sym !== p.name ? ' <i>' + esc(p.sym) + '</i>' : '') + '</span>';
        var inp = el('input', { type: 'text', inputmode: 'decimal', value: ruIn(p.value), 'aria-label': p.name });
        lab.appendChild(inp);
        if (p.unit) lab.appendChild(el('span', { class: 'cf-unit' }, esc(p.unit)));
        form.appendChild(lab); return inp;
      });
      get = function () { return inputs.map(function (i) { return i.value; }); };
      restore = function () { inputs.forEach(function (inp, i) { inp.value = ruIn(cfg.params[i].value); }); };
    }
    var reset = el('button', { class: 'btn btn-outline btn-sm calc-reset', type: 'button' }, 'Вернуть пример');
    function calc() {
      var res;
      try { res = fn.apply(null, get()); } catch (e) { res = { err: '#ЗНАЧ!' }; }
      if (Array.isArray(res)) {
        var labels = cfg.labels || [];
        out.innerHTML = '<div class="co-label">Результат (массив)</div><div class="co-arr">' + res.map(function (v, i) {
          return '<div><span>' + esc(labels[i] || '#' + (i + 1)) + '</span><b>' + val(v) + '</b></div>';
        }).join('') + '</div>';
      } else {
        var u = cfg.unit && ['текст', 'логическое'].indexOf(cfg.unit) < 0 ? ' <small>' + esc(cfg.unit) + '</small>' : '';
        out.innerHTML = '<div class="co-label">Результат</div><div class="co-val">' + val(res) + u + '</div>';
      }
    }
    box.appendChild(form); box.appendChild(out); box.appendChild(reset);
    box.addEventListener('input', calc);
    reset.addEventListener('click', function () { restore(); calc(); });
    calc();
  });

  // ------------------------------------------------------------ widgets (окна-калькуляторы)
  function fields(spec, onChange) {
    var wrap = el('div', { class: 'calc-form' }), map = {};
    spec.forEach(function (s) {
      var lab = el('label', { class: 'calc-field' });
      lab.innerHTML = '<span class="cf-name">' + s.label + '</span>';
      var inp = el('input', { type: 'text', inputmode: 'decimal', value: ruIn(s.value) });
      lab.appendChild(inp); if (s.unit) lab.appendChild(el('span', { class: 'cf-unit' }, s.unit));
      wrap.appendChild(lab); map[s.key] = inp; inp.addEventListener('input', onChange);
    });
    return { node: wrap, v: function (k) { return map[k].value; }, inp: map };
  }
  function resultGrid(pairs) {
    return '<div class="co-arr">' + pairs.map(function (p) { return '<div><span>' + p[0] + '</span><b>' + p[1] + '</b></div>'; }).join('') + '</div>';
  }
  var W = {};

  W.zso = function (box) {
    var schemes = [
      ['well_0b_0f', 'Сосредоточенный, без естественного потока', ['q', 't', 'm', 'n']],
      ['well_0b', 'Сосредоточенный, с естественным потоком', ['q', 't', 'k', 'm', 'n', 'i']],
      ['line_0b_0f', 'Линейный, без естественного потока', ['q', 't', 'l', 'k', 'm', 'n']],
      ['line_0b', 'Линейный, с естественным потоком', ['q', 't', 'l', 'k', 'm', 'n', 'i']]];
    var labels = { well_0b_0f: ['R — радиус ЗСО, м', 'd — диаметр, м', 'L — длина, м'],
      well_0b: ['q, м²/сут', 'xₚ, м', 'T̄', 'R̄', 'r̄', 'd̄', 'R — вверх по потоку, м', 'r — вниз по потоку, м', 'd — полуширина, м', 'L — длина ЗСО, м', '2d — ширина ЗСО, м'],
      line_0b_0f: ['T̄', 'R̄', 'R, м', 'd — полуширина, м', 'L — длина ЗСО, м', '2d — ширина, м'] };
    labels.line_0b = labels.well_0b;
    var spec = { q: ['Q — дебит', 'м³/сут', 2000], t: ['t — расчётное время', 'сут', 10000], l: ['l — длина ряда', 'м', 500], k: ['k — коэф. фильтрации', 'м/сут', 15], m: ['m — мощность пласта', 'м', 20], n: ['n — пористость', '—', 0.2], i: ['i — уклон потока', '—', 0.002] };
    var sel = el('div', { class: 'seg' });
    schemes.forEach(function (s, idx) { sel.appendChild(el('button', { type: 'button', 'data-i': idx, class: idx === 1 ? 'on' : '' }, s[1])); });
    var f = fields(Object.keys(spec).map(function (k) { return { key: k, label: spec[k][0], unit: spec[k][1], value: spec[k][2] }; }), run);
    var out = el('div', { class: 'calc-out' }), cur = 1;
    function run() {
      var s = schemes[cur];
      Object.keys(f.inp).forEach(function (k) { f.inp[k].parentNode.style.display = s[2].indexOf(k) >= 0 ? '' : 'none'; });
      var res = H[s[0]].apply(null, s[2].map(function (k) { return f.v(k); }));
      out.innerHTML = '<div class="co-label">Результат — <code>' + s[0] + '</code></div>' + (Array.isArray(res) ? resultGrid(res.map(function (v, i) { return [labels[s[0]][i], val(v)]; })) : '<div class="co-val">' + val(res) + '</div>');
    }
    sel.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      cur = +b.getAttribute('data-i'); sel.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); run();
    });
    box.appendChild(sel); box.appendChild(f.node); box.appendChild(out); run();
  };

  W.kurlov = function (box) {
    var ions = [['Ca', 75], ['Mg', 33], ['Na', 18], ['K', 8], ['HCO3', 305], ['CO3', 5], ['Cl', 72], ['SO4', 48]];
    var lab = function (k) { return k.replace(/(\d)/g, '<sub>$1</sub>'); };
    var f = fields(ions.map(function (x) { return { key: x[0], label: lab(x[0]), unit: 'мг/л', value: x[1] }; }), run);
    f.node.classList.add('ions');
    var out = el('div', { class: 'calc-out' });
    function part(arr) { return arr.map(function (p) { return '<span class="ion">' + lab(p[0]) + '<sup>' + p[1] + '</sup></span>'; }).join(''); }
    function run() {
      var o = {}; ions.forEach(function (x) { o[x[0]] = f.v(x[0]); });
      var r = H.kurlov(o);
      var ok = ions.every(function (x) { var s = String(o[x[0]]).trim(); return s === '' || !isNaN(Number(s.replace(',', '.'))); });
      if (!ok) { out.innerHTML = '<div class="co-val"><span class="err">Проверьте числа</span></div>'; return; }
      out.innerHTML = '<div class="co-label">Формула Курлова</div><div class="kurlov-print"><span class="kf"><span class="kf-m">M<sub>' +
        H.fmt(Math.round(r.M_gL * 100) / 100, 2) + '</sub></span><span class="m-fr"><span class="m-n">' + (part(r.anions) || '—') +
        '</span><span class="m-d">' + (part(r.cations) || '—') + '</span></span></span></div>' +
        resultGrid([['Минерализация M', val(r.M) + ' мг/л'], ['Ошибка анализа', H.fmt(r.error, 2) + ' %'], ['Тип по минерализации', esc(r.type)], ['Название', '<i>' + esc(r.name || '—') + '</i>']]);
    }
    box.appendChild(f.node); box.appendChild(out); run();
  };

  W.distance = function (box) {
    var s = [['X1', 5420], ['Y1', 3310], ['Z1', 142.5], ['X2', 5980], ['Y2', 3905], ['Z2', 131.2]];
    var f = fields(s.map(function (x) { return { key: x[0], label: x[0].replace(/(\d)/, '<sub>$1</sub>'), value: x[1] }; }), run);
    var out = el('div', { class: 'calc-out' });
    function run() {
      var a = s.map(function (x) { return f.v(x[0]); });
      out.innerHTML = resultGrid([['На плоскости', val(H.Distance3D(a[0], a[1], 0, a[3], a[4], 0))], ['В пространстве', val(H.Distance3D.apply(null, a))]]);
    }
    box.appendChild(f.node); box.appendChild(out); run();
  };

  W.nomenclature = function (box) {
    var f = fields([{ key: 'lat', label: 'Широта, ° (+ с.ш., − ю.ш.)', value: '59 30 25' }, { key: 'lon', label: 'Долгота, ° (+ в.д., − з.д.)', value: '80 15 33' }], run);
    var hint = el('p', { class: 'muted small' }, 'Можно ввести десятичные градусы (59,5069) или градусы, минуты и секунды через пробел (59 30 25).');
    var out = el('div', { class: 'calc-out' });
    var scales = ['1:1 000 000', '1:500 000', '1:200 000', '1:100 000', '1:50 000', '1:25 000', '1:10 000', '1:5 000', '1:2 000', '1:1 000', '1:500'];
    function parse(s) {
      var p = String(s).trim().replace(/[°′″'"]/g, ' ').split(/\s+/).filter(Boolean);
      if (p.length > 1) return H.DMStoDD(p[0], p[1] || 0, p[2] || 0);
      return p[0];
    }
    function run() {
      var la = parse(f.v('lat')), lo = parse(f.v('lon'));
      var s = H.isErr(la) || H.isErr(lo) ? null : H.mapNomenAll(la, lo);
      out.innerHTML = s ? '<table class="nom-out"><tbody>' + s.map(function (v, i) { return '<tr><td>' + scales[i] + '</td><td><code>' + esc(v) + '</code></td></tr>'; }).join('') + '</tbody></table>' :
        '<div class="co-val"><span class="err">#ЗНАЧ!</span> <small>координаты вне диапазона (|широта| ≤ 88°)</small></div>';
    }
    box.appendChild(f.node); box.appendChild(hint); box.appendChild(out); run();
  };

  W.converter = function (box) {
    var cats = Object.keys(H.CONVERTER), cur = 'Коэф. фильтрации';
    var sel = el('div', { class: 'seg wrap' });
    cats.forEach(function (c) { sel.appendChild(el('button', { type: 'button', class: c === cur ? 'on' : '' }, c)); });
    var host = el('div', { class: 'calc-form conv' });
    function units(c) { var d = H.CONVERTER[c]; return d.temp ? d.units : d.units.map(function (u) { return u[0]; }); }
    function build() {
      host.innerHTML = '';
      units(cur).forEach(function (u, i) {
        var lab = el('label', { class: 'calc-field' }); lab.innerHTML = '<span class="cf-name">' + esc(u) + '</span>';
        var inp = el('input', { type: 'text', inputmode: 'decimal', 'data-i': i }); lab.appendChild(inp); host.appendChild(lab);
      });
      var first = host.querySelector('input'); first.value = cur === 'Температура' ? '10' : '1'; update(0);
    }
    function update(from) {
      var ins = host.querySelectorAll('input'), v = ins[from].value;
      if (String(v).trim() === '' || isNaN(Number(String(v).replace(',', '.')))) return;
      var all = H.convertAll(cur, from, v);
      ins.forEach(function (inp, i) {
        if (i === from) return;
        var x = all[i], a = Math.abs(x);
        inp.value = (a !== 0 && (a >= 1e6 || a < 1e-6)) ? x.toExponential(6).replace('.', ',') : String(+x.toPrecision(12)).replace('.', ',');
      });
    }
    host.addEventListener('input', function (e) { if (e.target.tagName === 'INPUT') update(+e.target.getAttribute('data-i')); });
    sel.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      cur = b.textContent; sel.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); build();
    });
    box.appendChild(sel); box.appendChild(host); build();
  };

  document.querySelectorAll('.widget[data-widget]').forEach(function (box) {
    var k = box.getAttribute('data-widget'); if (W[k]) W[k](box);
  });
})();
