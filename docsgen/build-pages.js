// Tool pages, «Как пользоваться», «Сквозные примеры».
const fs = require('fs');
const path = require('path');
const D = require('./build-docs.js');
const { H, tex, esc, layout, crumbs, TOOLS, fmtVal, ru, BYNAME, capital } = D;
const OUT = path.join(__dirname, '..', 'docs');
fs.mkdirSync(path.join(OUT, 'tools'), { recursive: true });
const R2 = '../../';
const fnLinks = (names, root) => `<div class="rel-grid">${names.map(n => `<a class="rel" href="${root}docs/f/${n}.html"><b>${esc(BYNAME[n].navLabel)}</b><code>${n}</code></a>`).join('')}</div>`;
const shot = (file, alt, cap, cls) => `<figure class="shot-frame${cls ? ' ' + cls : ''}"><img src="${R2}assets/img/screens/${file}" alt="${esc(alt)}" loading="lazy"></figure>${cap ? `<p class="shot-caption">${esc(cap)}</p>` : ''}`;
function toolPage(key, title, lead, body) {
  const T = TOOLS[key];
  const mod = D.META.MODULES.find(m => m.id === T.mod);
  const main = `${crumbs(R2, [[mod.title, R2 + 'docs/index.html#m-' + mod.id], [title]])}
<header class="fn-head"><div class="fn-kicker"><span class="side-n">${mod.n}</span>${esc(mod.title)} · окно-калькулятор</div><h1>${esc(title)}</h1><p class="fn-sum">${lead}</p></header>
${body}`;
  fs.writeFileSync(path.join(OUT, 'tools', T.file), layout(R2, T.file.replace('.html', ''), title, lead.replace(/<[^>]+>/g, ''), main));
}

// ---------------------------------------------------------------- ZSO
toolPage('zso', 'Калькулятор ЗСО', 'Кнопка <b>«Калькулятор ЗСО»</b> (группа «ЗСО») открывает немодальное окно — можно продолжать работать на листе, не закрывая его. Окно пересчитывает результат при любом изменении данных, у каждого параметра и результата есть кнопка «вставить в ячейку».', `
<section class="d-block"><div class="split-docs"><div>
<h2 class="d-h2">Четыре схемы водозабора</h2>
<p class="muted">Расчёт границ второго пояса ЗСО. Схема выбирается переключателями «Тип водозабора» и «Естественный поток».</p>
<div class="table-wrap"><table><thead><tr><th>Схема</th><th>Исходные данные</th><th>Функция</th></tr></thead><tbody>
<tr><td>Сосредоточенный, без естественного потока</td><td>Q, t, m, n</td><td><a href="../f/well_0b_0f.html"><code>well_0b_0f</code></a></td></tr>
<tr><td>Сосредоточенный, с естественным потоком</td><td>Q, t, k, m, n, i</td><td><a href="../f/well_0b.html"><code>well_0b</code></a></td></tr>
<tr><td>Линейный, без естественного потока</td><td>Q, t, l, k, m, n</td><td><a href="../f/line_0b_0f.html"><code>line_0b_0f</code></a></td></tr>
<tr><td>Линейный, с естественным потоком</td><td>Q, t, l, k, m, n, i</td><td><a href="../f/line_0b.html"><code>line_0b</code></a></td></tr>
</tbody></table></div></div>
<div>${shot('zso-form.png', 'Окно «ЗСО — расчёт зон санитарной охраны»', 'Окно калькулятора со схемой зоны: R — вверх по потоку, r — вниз, d — полуширина, L — длина.')}</div></div></section>
<section class="d-block try"><h2 class="d-h2">Попробуйте сами</h2><p class="muted small">Тот же алгоритм, что и в окне надстройки (бисекция и адаптивный метод Симпсона).</p><div class="widget" data-widget="zso"></div></section>
<section class="d-block"><h2 class="d-h2">Функции для ячеек</h2>${fnLinks(['well_0b_0f', 'well_0b', 'line_0b_0f', 'line_0b'], R2)}</section>`);

// ---------------------------------------------------------------- Kurlov
const K = H.kurlov({ HCO3: 305, CO3: 5, Cl: 72, SO4: 48, Ca: 75, Mg: 33, Na: 18, K: 8 });
toolPage('kurlov', 'Формула солевого состава (формула Курлова)', 'Кнопка <b>«Формула солевого состава»</b> (группа «Гидрохимия») открывает немодальный калькулятор: по концентрациям восьми основных ионов он строит формулу Курлова, считает минерализацию, баланс анализа и даёт словесное название воды.', `
<section class="d-block"><div class="split-docs"><div>
<h2 class="d-h2">Порядок работы</h2>
<ol class="steps">
<li>Введите концентрации ионов в <b>мг/л</b>: катионы Ca, Mg, Na, K и анионы HCO₃, CO₃, Cl, SO₄. Незаполненные поля считаются нулевыми.</li>
<li>Окно на лету пересчитывает:<ul>
<li><b>минерализацию M</b> (мг/л) — сумму концентраций всех ионов;</li>
<li><b>ошибку (баланс) анализа</b>, % — расхождение сумм катионов и анионов в мг-экв/л;</li>
<li><b>процентное содержание</b> ионов в %-экв (показываются ионы с долей ≥ 1 %);</li>
<li><b>название воды</b> — учитываются ионы с долей ≥ 20 %;</li>
<li><b>тип воды по минерализации</b>;</li>
<li><b>формулу Курлова</b> с верхними и нижними индексами — готовую для вставки в отчёт.</li></ul></li>
<li>Кнопками «вставить в ячейку» результат переносится на лист.</li></ol>
<h3 class="d-h3">Пример из окна надстройки</h3>
<p>HCO₃ 305, CO₃ 5, Cl 72, SO₄ 48, Ca 75, Mg 33, Na 18, K 8 мг/л → M = ${esc(fmtVal(K.M))} мг/л, ошибка анализа ${esc(fmtVal(K.error).replace(/(\d,\d\d)\d*/, '$1'))} %, ${esc(K.type)}; <i>${esc(K.name)}</i>.</p>
</div><div>${shot('kurlov-formula.png', 'Окно «Формула солевого состава (формула Курлова)»', 'Окно калькулятора с тем же примером.')}</div></div></section>
<section class="d-block try"><h2 class="d-h2">Попробуйте сами</h2><div class="widget" data-widget="kurlov"></div></section>
<section class="d-block"><h2 class="d-h2">Как считается</h2>
<p>Концентрации переводятся в мг-экв/л делением на эквивалентные массы: Ca 20,039; Mg 12,1525; Na 22,99; K 39,098; HCO₃ 61,016; CO₃ 30,004; Cl 35,453; SO₄ 48,031. Доли ионов (%-экв) округляются до целого и сортируются по убыванию. В названии воды последним стоит преобладающий ион, перед ним — остальные с долей ≥ 20 % («хлоридно-гидрокарбонатная»).</p>
<p class="muted small">Тип по минерализации в окне: &lt; 0,2 г/л — ультрапресная, 0,2–1 — пресная, 1–3 — слабосолоноватая, 3–10 — солоноватая, 10–35 — солёная, ≥ 35 — рассол. Для детального деления рассолов используйте функцию <a href="../f/type_M.html"><code>type_M</code></a>.</p></section>
<section class="d-block"><h2 class="d-h2">Связанные функции</h2>${fnLinks(['type_M', 'type_pH', 'density'], R2)}</section>`);

// ---------------------------------------------------------------- Distance
toolPage('distance', 'Калькулятор расстояния', 'Кнопка <b>«Калькулятор расстояния»</b> открывает окно для расчёта расстояния между двумя точками по их координатам — на плоскости и в пространстве. Результат вставляется в активную ячейку кнопкой «Вставить».', `
<section class="d-block"><div class="split-docs"><div>
<h2 class="d-h2">Что считает окно</h2>
<ul class="notes"><li>Введите X, Y, Z двух точек (Z по умолчанию 0).</li><li><b>Расстояние на плоскости</b>: √((X₂−X₁)² + (Y₂−Y₁)²).</li><li><b>Расстояние в пространстве</b>: √((X₂−X₁)² + (Y₂−Y₁)² + (Z₂−Z₁)²).</li><li>Чтобы расчёт пересчитывался при изменении данных на листе, используйте функцию <a href="../f/Distance3D.html"><code>Distance3D</code></a>.</li></ul>
</div><div>${shot('tools-distance.png', 'Окно «Расстояние между точками»', '', 'narrow')}</div></div></section>
<section class="d-block try"><h2 class="d-h2">Попробуйте сами</h2><div class="widget" data-widget="distance"></div></section>
<section class="d-block"><h2 class="d-h2">Функция для ячейки</h2>${fnLinks(['Distance3D'], R2)}</section>`);

// ---------------------------------------------------------------- Nomenclature
toolPage('nomenclature', 'Номенклатура карт', 'Кнопка <b>«Номенклатура карт»</b> открывает окно: вводятся координаты (десятичные градусы или градусы-минуты-секунды с выбором полушария), и окно сразу показывает номенклатуру листа для всех 11 масштабов — с кнопками вставки в ячейку.', `
<section class="d-block"><div class="split-docs"><div>
<h2 class="d-h2">Разграфка</h2>
<div class="table-wrap"><table><thead><tr><th>Масштаб</th><th>Деление листа</th><th>Пример</th></tr></thead><tbody>
${[['1:1 000 000', 'ряд A–V (4°) и колонна 1–60 (6°)', 0], ['1:500 000', '1:1 000 000 на 2×2, А–Г', 1], ['1:200 000', '1:1 000 000 на 6×6, I–XXXVI', 2], ['1:100 000', '1:1 000 000 на 12×12, 1–144', 3], ['1:50 000', '1:100 000 на 2×2, А–Г', 4], ['1:25 000', '1:50 000 на 2×2, а–г', 5], ['1:10 000', '1:25 000 на 2×2, 1–4', 6], ['1:5 000', '1:10 000 на 2×2, (1)–(4)', 7], ['1:2 000', '1:5 000 на 3×3, (1)–(9)', 8], ['1:1 000', '1:2 000 на 2×2, (1)–(4)', 9], ['1:500', '1:1 000 на 2×2, (1)–(4)', 10]]
    .map(([s, d, i]) => `<tr><td>${s}</td><td>${d}</td><td><code>${esc(H.mapNomenAll(59.506944, 80.259167)[i])}</code></td></tr>`).join('')}
</tbody></table></div>
<p class="muted small">Пример — точка 59°30′25″ с.ш., 80°15′33″ в.д. (как на скриншоте окна). Допустимый диапазон широт: |широта| ≤ 88°.</p>
</div><div>${shot('tools-nomen.png', 'Окно «Номенклатура листов карт»', '', 'narrow')}</div></div></section>
<section class="d-block try"><h2 class="d-h2">Попробуйте сами</h2><div class="widget" data-widget="nomenclature"></div></section>
<section class="d-block"><h2 class="d-h2">Функции для ячеек</h2>${fnLinks(D.META.SCALES.map(s => 'MapSheet' + s[0]), R2)}</section>`);

// ---------------------------------------------------------------- Aggregator
toolPage('aggregator', 'Агрегатор', 'Кнопка <b>«Агрегатор»</b> — универсальный инструмент группировки данных, не привязанный к гидрогеологии. Он сворачивает таблицу по выбранным столбцам и считает для остальных MAX, MIN, SUM или AVG. Результат выводится на новый лист.', `
<section class="d-block"><h2 class="d-h2">Порядок работы</h2>
<ol class="steps"><li>Выделите диапазон: минимум 2 столбца и 2 строки, заголовки — в первой строке (или выберите «Без заголовков (авто)»).</li>
<li>Нажмите «Агрегатор» — откроется окно. Перенесите кнопкой <b>&gt;&gt;</b> столбцы группировки в правый список; порядок (приоритет сверху вниз) меняется кнопками Up / Dn.</li>
<li>Отметьте столбцы агрегации и выберите для каждого функцию: MAX, MIN, SUM или AVG.</li>
<li>Выберите порядок результата («по первому появлению» или «сортировать по ключам»), при необходимости задайте имя листа (по умолчанию <code>Aggregated_ГГГГММДД</code>) и нажмите OK.</li></ol>
<p class="muted small">Столбцы, не выбранные ни для группировки, ни для агрегации, в результат не попадают — окно об этом предупреждает.</p></section>
<section class="d-block"><h2 class="d-h2">Пример 1. Геологические слои → интервалы</h2>
<p>Группировка по «Скважина + Возраст» с MIN для «От, м» и MAX для «До, м» сворачивает детальную литологическую колонку в геологически осмысленные интервалы.</p>
<div class="split-docs"><div>${shot('aggregator-1.png', 'Окно «Агрегатор по столбцам»: группировка по скважине и возрасту')}</div><div>${shot('aggregator-1-result.png', 'Результат: интервалы по скважине и возрасту', 'Результат на новом листе', 'narrow')}</div></div></section>
<section class="d-block"><h2 class="d-h2">Пример 2. Скважины → характеристики по горизонтам</h2>
<p>Группировка по «Водоносный горизонт»: суммарный дебит (SUM) и средняя минерализация (AVG) по всем скважинам горизонта.</p>
<div class="split-docs"><div>${shot('aggregator-2.png', 'Окно «Агрегатор по столбцам»: группировка по горизонту')}</div><div>${shot('aggregator-2-result.png', 'Результат: дебит и минерализация по горизонтам', 'Результат на новом листе', 'narrow')}</div></div></section>`);

// ---------------------------------------------------------------- Converter
toolPage('converter', 'Конвертер размерностей', 'Кнопка <b>«Конвертер размерностей»</b> открывает калькулятор перевода единиц. Категории — вкладки окна; ввод значения в любое поле мгновенно пересчитывает все остальные единицы категории.', `
<section class="d-block"><div class="split-docs"><div>
<h2 class="d-h2">Категории и единицы</h2>
<div class="table-wrap"><table><thead><tr><th>Вкладка</th><th>Единицы</th></tr></thead><tbody>
${Object.entries(H.CONVERTER).map(([c, v]) => `<tr><td>${esc(c)}</td><td>${esc(v.temp ? v.units.join(', ') : v.units.map(u => u[0]).join(', '))}</td></tr>`).join('')}
</tbody></table></div>
<div class="callout warn"><b>Замечено в v0.2.</b> Во вкладке «Плотность» для г/фут³ стоит коэффициент 35,31 кг/м³, а должно быть 0,0353 кг/м³ (1 г / 0,0283 м³). Остальные коэффициенты проверены.</div>
</div><div>${shot('tools-converter.png', 'Окно «Конвертер единиц»', '', 'narrow')}</div></div></section>
<section class="d-block try"><h2 class="d-h2">Попробуйте сами</h2><div class="widget" data-widget="converter"></div></section>`);

// ---------------------------------------------------------------- Start page
const R1 = '../';
const start = `${crumbs(R1, [['Как пользоваться']])}
<header class="fn-head"><h1>Как пользоваться надстройкой</h1>
<p class="fn-sum">Все инструменты собраны на одной вкладке ленты Excel — <b>«Гидрогеология v.02»</b>. Вкладка разбита на шесть групп кнопок: Расчётные параметры, ЗСО, Оценка запасов, Оценка водопритоков, Гидрохимия и Вспомогательные инструменты.</p></header>
<div class="shot-frame"><img src="${R1}assets/img/screens/ribbon-overview.png" alt="Вкладка «Гидрогеология v.02» на ленте Excel"></div>

<section class="d-block"><h2 class="d-h2">Подключение</h2>
<ol class="steps"><li>Прототип поставляется файлом Excel с макросами (<code>hydro_proto_v_0_2.xlsm</code>). Откройте его и нажмите «Включить содержимое» — на ленте появится вкладка «Гидрогеология v.02».</li>
<li>Для постоянной работы надстройку в формате <code>.xlam</code> подключают через <b>Файл → Параметры → Надстройки → Управление: Надстройки Excel → Перейти → Обзор</b>. Тогда вкладка доступна в любой книге.</li></ol></section>

<section class="d-block"><h2 class="d-h2">Два способа работы</h2>
<div class="grid grid-2">
<div class="card"><div class="icon-badge" data-icon="sigma"></div><h3>Формула в ячейке</h3><p class="desc" style="font-style:normal">Большинство пунктов меню — обычные функции Excel вида <code>=ИмяФункции(аргумент1; аргумент2; …)</code>. Кликните по пункту меню — надстройка вставит шаблон формулы в активную ячейку и откроет <b>Мастер аргументов</b> с подсказкой для каждого аргумента. Функции можно набирать вручную или найти через <b>fx → категория «Гидрогеология»</b>.</p></div>
<div class="card"><div class="icon-badge" data-icon="list-function"></div><h3>Окно-калькулятор</h3><p class="desc" style="font-style:normal">Для шести задач открывается отдельное окно: <a href="tools/zso.html">ЗСО</a>, <a href="tools/kurlov.html">формула Курлова</a>, <a href="tools/distance.html">расстояние между точками</a>, <a href="tools/nomenclature.html">номенклатура карт</a>, <a href="tools/converter.html">конвертер единиц</a>, <a href="tools/aggregator.html">агрегатор</a>. Данные вводятся в окне, результат копируется или вставляется в ячейку кнопкой.</p></div>
</div></section>

<section class="d-block"><h2 class="d-h2">Разделители и десятичная запятая</h2>
<p>Разделитель аргументов зависит от региональных настроек Excel. В русской локали это точка с запятой, а дробная часть отделяется запятой:</p>
<div class="code-line"><code>=par_T(15; 20)   =drawdown_conf_hb_simple(B1; B2; B3; B4; B5)   =type_M(0,564)</code></div>
<p class="muted small">В справочнике формулы записаны так же, как их нужно вводить в русской версии Excel.</p></section>

<section class="d-block"><h2 class="d-h2">Функции, возвращающие массив</h2>
<p><a href="f/bigwell_center.html"><code>bigwell_center</code></a> и функции ЗСО (<a href="f/well_0b_0f.html"><code>well_0b_0f</code></a>, <a href="f/well_0b.html"><code>well_0b</code></a>, <a href="f/line_0b_0f.html"><code>line_0b_0f</code></a>, <a href="f/line_0b.html"><code>line_0b</code></a>) возвращают сразу несколько значений в строку. Выделите нужное число соседних ячеек в строке, введите формулу и нажмите <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd>. В Excel 365 результат «разливается» по соседним ячейкам сам. Отдельное значение можно получить через <code>=ИНДЕКС(well_0b_0f(…); 1)</code>.</p></section>

<section class="d-block"><h2 class="d-h2">Что означают ошибки</h2>
<div class="table-wrap"><table><thead><tr><th>Значение в ячейке</th><th>Причина</th></tr></thead><tbody>
<tr><td><b>#ЗНАЧ!</b></td><td>Один из аргументов не число (текст, ошибка в ссылке) или координаты/минуты вне допустимого диапазона.</td></tr>
<tr><td><b>#ДЕЛ/0!</b></td><td>Нулевой знаменатель: k = 0, m = 0, r = 0, нулевая сумма дебитов и т.п.</td></tr>
<tr><td><b>#ЧИСЛО!</b></td><td>Недопустимые значения: отрицательное подкоренное выражение (понижение больше мощности безнапорного пласта), логарифм от неположительного числа, неположительное время.</td></tr>
<tr><td>«не выполняется критерий (r^2)/(4*a*t) &lt;= 0.1»</td><td>Для неограниченного пласта не выполнено условие применимости логарифмической аппроксимации — увеличьте время или уменьшите расстояние.</td></tr>
<tr><td>«Исходные данные неполные»</td><td>Диапазоны разной длины или содержат пустые/нечисловые ячейки (функции с диапазонами: Kh_bulk, Kv_bulk, bigwell_center…).</td></tr>
</tbody></table></div></section>

<section class="d-block"><h2 class="d-h2">Куда дальше</h2><div class="grid grid-3">
<a class="card" href="index.html"><div class="icon-badge" data-icon="list-function"></div><h3>Все функции</h3><p class="desc" style="font-style:normal">Каталог с поиском по названию и назначению.</p></a>
<a class="card" href="examples.html"><div class="icon-badge" data-icon="combine"></div><h3>Сквозные примеры</h3><p class="desc" style="font-style:normal">От задачи до готовой формулы: водозабор, карьер, химанализ.</p></a>
<a class="card" href="glossary.html"><div class="icon-badge" data-icon="database"></div><h3>Глоссарий</h3><p class="desc" style="font-style:normal">Единые обозначения аргументов и их единицы.</p></a>
</div></section>`;
fs.writeFileSync(path.join(OUT, 'start.html'), layout(R1, 'start', 'Как пользоваться', 'Как подключить надстройку «Гидрогеология v.02» и работать с её функциями и окнами.', start));

// ---------------------------------------------------------------- Examples page
function stepTable(rows) {
  return `<div class="table-wrap"><table class="steps-tbl"><thead><tr><th>#</th><th>Что считаем</th><th>Формула в ячейке</th><th>Результат</th></tr></thead><tbody>${rows.map((r, i) =>
    `<tr><td class="num">${i + 1}</td><td>${r[0]}</td><td><code>${esc(r[1])}</code>${r[3] ? ` <a class="gl" href="f/${r[3]}.html" title="Справка по функции">↗</a>` : ''}</td><td class="v">${esc(r[2])}</td></tr>`).join('')}</tbody></table></div>`;
}
// Scenario 1
const w = { x: [100, 300, 300, 100], y: [100, 100, 400, 400], q: [500, 800, 600, 400] };
const Qsum = w.q.reduce((a, b) => a + b, 0);
const T1 = H.par_T(15, 20), C1 = H.bigwell_center(w.x, w.y, w.q), R1b = H.r_bigwell_rectangle(200, 300);
const V1 = H.r_bigwell_validity_boundaries(R1b, 1200), S1 = H.drawdown_conf_hb_simple(Qsum, 15, 20, R1b, 1200);
// Scenario 2
const R2b = H.r_bigwell_circle(250000), Qg = H.discharge_unconf_0b_simple(5, 40, 10, 2000, 3650, R2b);
const Qb = H.bottom_overflow(0.002, 6, 25, 250000), Qr = H.rain_norm(1.6, 0.8, 2.5);
const Qtot = Qg + Qb + Qr;
// Scenario 3
const Kx = K;
const ex = `${crumbs(R1, [['Сквозные примеры']])}
<header class="fn-head"><h1>Сквозные примеры</h1><p class="fn-sum">Три типовые задачи «от исходных данных до готового результата» — какие функции надстройки использовать и в каком порядке. Все числа ниже посчитаны теми же алгоритмами, что и в Excel.</p></header>

<section class="d-block" id="wellfield"><h2 class="d-h2">1. Групповой водозабор у реки</h2>
<p>Четыре скважины (суммарно ${ru(Qsum)} м³/сут) образуют прямоугольный контур 200 × 300 м в напорном пласте: k = 15 м/сут, m = 20 м. Река (граница H = const) — в 1 200 м от центра водозабора. Нужно оценить понижение в центре водозабора.</p>
<div class="split-docs"><div><div class="xl"><table class="xl-grid"><thead><tr><th></th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead><tbody>
<tr><th>1</th><td class="h">Скважина</td><td class="h">X, м</td><td class="h">Y, м</td><td class="h">Q, м³/сут</td></tr>
${w.x.map((x, i) => `<tr><th>${i + 2}</th><td>Скв. ${i + 1}</td><td class="v">${x}</td><td class="v">${w.y[i]}</td><td class="v">${w.q[i]}</td></tr>`).join('')}
</tbody></table></div></div><div>${D.schemeSvg(D.META.SCHEMES.find(s => s.id === 'hb'))}</div></div>
${stepTable([
  ['Водопроводимость пласта', '=par_T(15; 20)', fmtVal(T1) + ' м²/сут', 'par_T'],
  ['Центр тяжести водозабора {x₀; y₀}', '=bigwell_center(B2:B5; C2:C5; D2:D5)', C1.map(fmtVal).join('; ') + ' м', 'bigwell_center'],
  ['Радиус «большого колодца» для контура 200 × 300 м', '=r_bigwell_rectangle(200; 300)', fmtVal(R1b) + ' м', 'r_bigwell_rectangle'],
  ['Можно ли заменять водозабор «большим колодцем»?', `=r_bigwell_validity_boundaries(${ru(R1b)}; 1200)`, fmtVal(V1), 'r_bigwell_validity_boundaries'],
  ['Понижение в центре водозабора (полуограниченный пласт, H = const)', `=drawdown_conf_hb_simple(${Qsum}; 15; 20; ${ru(R1b)}; 1200)`, fmtVal(S1) + ' м', 'drawdown_conf_hb_simple'],
])}
<p class="muted small">Полученное понижение сравнивают с допустимым. Для прогноза в отдельной скважине к нему добавляют понижение от её собственного дебита на радиусе скважины.</p></section>

<section class="d-block" id="pit"><h2 class="d-h2">2. Прогноз водопритока в карьер</h2>
<p>Карьер площадью 25 га вскрывает безнапорный пласт: k = 5 м/сут, исходная мощность 40 м, требуется осушить до 10 м; уровнепроводность 2 000 м²/сут, прогноз на 10 лет (3 650 сут). Под дном — 6 м глин (k = 0,002 м/сут), напор нижнего горизонта на 25 м выше дна. Водосбор карьера — 2,5 км², среднесуточные осадки 1,6 мм.</p>
${stepTable([
  ['Радиус «большого колодца» по площади карьера', '=r_bigwell_circle(250000)', fmtVal(R2b) + ' м', 'r_bigwell_circle'],
  ['Подземный водоприток (неограниченный безнапорный пласт)', `=discharge_unconf_0b_simple(5; 40; 10; 2000; 3650; ${ru(R2b)})`, fmtVal(Qg) + ' м³/сут', 'discharge_unconf_0b_simple'],
  ['Перетекание через дно', '=bottom_overflow(0,002; 6; 25; 250000)', fmtVal(Qb) + ' м³/сут', 'bottom_overflow'],
  ['Нормальный приток дождевых вод', '=rain_norm(1,6; 0,8; 2,5)', fmtVal(Qr) + ' м³/сут', 'rain_norm'],
  ['<b>Суммарный нормальный водоприток</b>', 'сумма результатов 2–4', fmtVal(Qtot) + ' м³/сут', null],
])}
<p class="muted small">Ливневые и талые воды (<a href="f/stormwater.html"><code>stormwater</code></a>, <a href="f/meltwater.html"><code>meltwater</code></a>) считаются в м³/ч и учитываются отдельно — как максимальный кратковременный приток при выборе насосного оборудования.</p></section>

<section class="d-block" id="chem"><h2 class="d-h2">3. Химический анализ пробы воды</h2>
<p>Результаты анализа, мг/л: HCO₃ 305, CO₃ 5, Cl 72, SO₄ 48, Ca 75, Mg 33, Na 18, K 8; pH = 7,6.</p>
${stepTable([
  ['Минерализация и формула Курлова — окно «Формула солевого состава»', 'окно-калькулятор', 'M = ' + fmtVal(Kx.M) + ' мг/л', null],
  ['Ошибка анализа (баланс катионов и анионов)', 'окно-калькулятор', fmtVal(Math.round(Kx.error * 100) / 100) + ' %', null],
  ['Название воды', 'окно-калькулятор', Kx.name, null],
  ['Тип воды по минерализации', '=type_M(0,564)', H.type_M(0.564), 'type_M'],
  ['Плотность воды', '=density(0,564)', fmtVal(H.density(0.564)) + ' кг/м³', 'density'],
  ['Тип воды по pH', '=type_pH(7,6)', H.type_pH(7.6), 'type_pH'],
])}
<div class="kurlov-print">${kurlovHtml(Kx)}</div>
<p class="muted small">Подробнее — на странице <a href="tools/kurlov.html">формулы Курлова</a>.</p></section>`;
fs.writeFileSync(path.join(OUT, 'examples.html'), layout(R1, 'examples', 'Сквозные примеры', 'Типовые задачи гидрогеолога от исходных данных до результата с функциями надстройки.', ex));

function kurlovHtml(k) {
  const part = arr => arr.map(([ion, p]) => `<span class="ion">${ion.replace(/(\d)/g, '<sub>$1</sub>')}<span class="pct">${p}</span></span>`).join('');
  return `<span class="kf"><span class="kf-m">M<sub>${String(Math.round(k.M_gL * 100) / 100).replace('.', ',')}</sub></span><span class="m-fr"><span class="m-n">${part(k.anions)}</span><span class="m-d">${part(k.cations)}</span></span></span>`;
}
console.log('tool pages, start, examples: ok');
