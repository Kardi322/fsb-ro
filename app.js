(() => {
  'use strict';
  const data = window.RO_DATA, logic = window.RO_LOGIC;
  const $ = (s, root = document) => root.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => new Intl.NumberFormat('ru-RU').format(n);
  const state = { view: 'uk', scope: 'special', query: '', chapter: '', department: '', penalty: '', limit: 20, mode: 'maximum', exception: false, selected: new Map(), pkMode: 'guide', docQuery: '', docChapter: '', docLimit: 25 };
  const articles = new Map(Object.values(data).filter(x => x?.articles).flatMap(x => x.articles).map(a => [a.id, a]));
  const departments = { 'Ф': 'ФСБ', 'Р': 'МВД', 'В': 'Военная полиция', 'С': 'СК' };
  const searchIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>';
  function source(kind, number, chapter) { return data[kind].articles.find(a => a.number === number && (!chapter || a.chapterTitle.startsWith(`Глава ${chapter}.`))); }
  function ref(kind, number, chapter, label) { const a = source(kind, number, chapter); return a ? `<button class="inline-source" data-source="${a.id}">${esc(label || `${kind === 'uk' ? 'УК' : kind === 'pk' ? 'ПК' : 'Конституция'}${chapter ? `, гл. ${chapter},` : ','} ст. ${number}`)}</button>` : ''; }
  function download(kind) { return `<a class="source-link" href="./${encodeURIComponent(data.sources[kind])}" download>Исходный документ <span aria-hidden="true">↗</span></a>`; }
  function heading(title, eyebrow, subtitle, kind) { return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p class="lead">${subtitle}</p></div>${download(kind)}</div>`; }
  function searchBox(id, placeholder, value) { return `<div class="search-box">${searchIcon}<input type="search" id="${id}" aria-label="${placeholder}" placeholder="${placeholder}" autocomplete="off" value="${esc(value)}"><button class="icon-button" data-clear-search="${id}" aria-label="Очистить поиск" ${value ? '' : 'hidden'}>×</button><kbd aria-hidden="true">/</kbd></div>`; }
  function render() {
    document.querySelectorAll('[data-view]').forEach(b => { const active = b.dataset.view === state.view; b.classList.toggle('active', active); if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (state.view === 'uk') renderUK(); else if (state.view === 'pk') renderPK(); else renderConstitution();
  }
  function scopes() { return [['special', 'Особенная часть', data.uk.articles.filter(a => a.special).length], ['general', 'Общая часть', data.uk.articles.filter(a => !a.special).length], ['all', 'Все статьи', data.uk.articles.length]].map(([id, title, count]) => `<button class="scope-button ${state.scope === id ? 'active' : ''}" data-scope="${id}" aria-pressed="${state.scope === id}">${title}<span>${count}</span></button>`).join(''); }
  function renderUK() {
    $('#main').innerHTML = heading('Уголовный кодекс', 'БЫСТРЫЙ ДОСТУП К НОРМАМ', 'Найдите статью. Проверьте санкцию. Рассчитайте наказание.', 'uk') + `<div class="workspace"><section aria-label="Поиск и статьи">${searchBox('article-search', 'Номер статьи или ключевое слово', state.query)}<div class="filter-row"><select id="chapter-filter" aria-label="Глава уголовного кодекса"><option value="">Все главы</option>${data.uk.chapters.map(c => `<option value="${c.id}" ${state.chapter === c.id ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select><select id="department-filter" aria-label="Ведомство"><option value="">Все ведомства</option>${Object.entries(departments).map(([id, label]) => `<option value="${id}" ${state.department === id ? 'selected' : ''}>${label}</option>`).join('')}</select><select id="penalty-filter" aria-label="Наказание и судимость"><option value="">Все санкции</option><option value="fine" ${state.penalty === 'fine' ? 'selected' : ''}>Есть штраф</option><option value="record" ${state.penalty === 'record' ? 'selected' : ''}>С записью о судимости</option><option value="no-record" ${state.penalty === 'no-record' ? 'selected' : ''}>Без отметки о судимости</option></select></div><div class="scope-row" id="scopes" aria-label="Части кодекса">${scopes()}</div><a href="#calculator" class="mobile-calc-link">К расчёту наказания <span id="mobile-count">(${state.selected.size})</span> ↓</a><div id="results-meta" class="results-meta" aria-live="polite"></div><div id="article-list"></div><details class="data-notes"><summary>Как читать санкции и расчёт</summary><p>Сроки сохранены в месяцах, как в Особенной части. «До» означает верхний предел. Ст. 17.12.1 содержит точный срок — 50 месяцев. Реальное игровое время не пересчитывается: коэффициент в документах не задан.</p><p>Отметка в протоколе при аресте нужна при приоритете 4–5 (${ref('uk', '5.8')}). Это отдельный вопрос от общего правового статуса судимости (${ref('uk', '1.9')}). При уголовном штрафе судимость не возникает; вид штрафа по ст. 10.11 не уточнён.</p><p>В источниках есть расхождения: ${ref('uk', '5.11')} ч. 3 упоминает штраф в упрощённом порядке, но ${ref('uk', '5.2')} ч. 5 и ${ref('pk', '2.9', 'II')} ч. 5 запрещают его. В упрощённом режиме расчёт со штрафом помечается как недопустимый. Правила полномочий по назначению штрафа в ст. 5 УК также расходятся; полномочия проверяются отдельно.</p><p>Ст. 11.12 содержит формулировку «месяцев лишения» без слова «свободы»; текст источника сохранён. В расчёте эта санкция учтена как срок в месяцах.</p></details></section><aside class="calculator" id="calculator" aria-label="Калькулятор наказания"></aside></div>`;
    updateResults(); renderCalculator();
  }
  function filteredArticles() {
    return data.uk.articles.filter(a => (state.scope === 'all' || a.special === (state.scope === 'special')) && (!state.chapter || a.chapter === state.chapter) && (!state.department || a.departments.includes(state.department)) && (!state.penalty || (state.penalty === 'fine' ? a.fine : state.penalty === 'record' ? a.record : a.sanction && !a.record)) && logic.matches(a, state.query)).sort((a,b) => {
      const n = state.query.replace(/^(?:статья|ст\.)\s*/i, '').trim();
      return Number(b.number === n) - Number(a.number === n);
    });
  }
  function card(a) {
    const selected = state.selected.has(a.id);
    const term = a.months ? `${a.exactTerm ? '' : 'До '}${a.months} мес.` : '';
    return `<article class="article-card ${selected ? 'selected' : ''}" id="card-${a.id}"><div class="article-top"><span class="article-number">СТ. ${a.number}</span><span class="department">${a.departments.map(d => esc(departments[d] || d)).join(' / ')}</span></div><h2>${esc(a.title)}</h2>${a.sanction ? `<div class="sanctions"><span class="tag term">${term} лишения свободы</span><span class="tag ${a.record ? 'record' : 'muted'}">${a.record ? 'Запись о судимости' : 'Отметка не требуется'}</span>${a.fine ? '<span class="tag fine">Либо штраф · сумма не указана</span>' : ''}</div>${a.additional.length ? `<p class="extra-sanction">+ ${a.additional.map(esc).join(' · ')}</p>` : ''}` : `<p class="article-excerpt">${esc(a.body)}</p>`}<div class="article-actions"><button class="source-button" data-source="${a.id}">Полный текст <span aria-hidden="true">↗</span></button>${a.priority ? `<span class="priority">Розыск: ${a.priority} / 5</span>` : ''}${a.months ? `<button class="add-button ${selected ? 'active' : ''}" data-add="${a.id}" aria-pressed="${selected}" aria-label="${selected ? 'Убрать' : 'Добавить'} статью ${a.number} ${selected ? 'из расчёта' : 'в расчёт'}">${selected ? '✓ В расчёте' : '+ В расчёт'}</button>` : ''}</div></article>`;
  }
  function updateResults() {
    const list = filteredArticles();
    $('#scopes').innerHTML = scopes();
    $('#results-meta').innerHTML = `<span>Найдено статей: <b>${list.length}</b></span>${state.query || state.chapter || state.department || state.penalty ? '<button class="text-button" data-reset-filters>Сбросить фильтры</button>' : '<span>По порядку статей</span>'}`;
    $('#article-list').innerHTML = list.length ? list.slice(0, state.limit).map(card).join('') + (list.length > state.limit ? `<button class="load-more" data-more>Показать ещё ${Math.min(20, list.length - state.limit)} статей <span>· осталось ${list.length - state.limit}</span></button>` : '') : '<div class="no-results"><h2>Статей не найдено</h2><p>Попробуйте другой номер, часть слова или сбросьте фильтры.</p><button class="copy-button" data-reset-filters>Сбросить фильтры</button></div>';
  }
  const modeNotes = {
    maximum: 'В пределах наиболее строгой статьи. Общее правило по ч. 3 ст. 5.2 УК.',
    sum: 'Сумма санкций для сравнения. Сложение допускается судом или прокуратурой на основании постановления (ч. 3 ст. 5.2 УК).',
    simplified: 'Наиболее строгая статья, максимум 5 лет (60 месяцев). Только лишение свободы. Применимость порядка — гл. II ст. 2.9 ПК.'
  };
  function selectedItems() { return [...state.selected.values()]; }
  function calcItem(i) {
    return `<div class="calc-item"><div class="calc-item-top"><span>Статья ${i.article.number}</span><button class="icon-button" data-remove="${i.article.id}" aria-label="Убрать статью ${i.article.number}">×</button></div><p>${esc(i.article.title)}</p>${i.article.fine ? `<label class="field-label" for="type-${i.article.id}">Вид наказания</label><select id="type-${i.article.id}" data-penalty-type="${i.article.id}"><option value="prison" ${i.type === 'prison' ? 'selected' : ''}>Лишение свободы · до ${i.article.months} мес.</option><option value="fine" ${i.type === 'fine' ? 'selected' : ''}>Штраф вместо лишения свободы</option></select>` : `<span class="term-label">${i.article.exactTerm ? '' : 'До '}${i.article.months} месяцев</span>`}${i.type === 'fine' ? `<label class="field-label" for="amount-${i.article.id}">Сумма штрафа (в источнике не указана)</label><input class="fine-input" type="number" min="0" step="0.01" inputmode="decimal" id="amount-${i.article.id}" data-fine-amount="${i.article.id}" placeholder="Введите назначенную сумму" value="${i.amount ?? ''}">` : ''}</div>`;
  }
  function renderCalculator() {
    const items = selectedItems();
    $('#calculator').innerHTML = `<div class="calc-title"><h2>Расчёт наказания <span class="calc-count">${items.length}</span></h2><p>Добавляйте статьи из справочника</p></div><div class="calc-body"><label class="field-label" for="calc-mode">Порядок расчёта</label><select id="calc-mode"><option value="maximum" ${state.mode === 'maximum' ? 'selected' : ''}>По наиболее строгой статье</option><option value="sum" ${state.mode === 'sum' ? 'selected' : ''}>Полное сложение санкций</option><option value="simplified" ${state.mode === 'simplified' ? 'selected' : ''}>Упрощённый порядок</option></select><p class="mode-note">${modeNotes[state.mode]}</p>${state.mode === 'simplified' ? `<label class="checkbox-line"><input type="checkbox" id="insult-exception" ${state.exception ? 'checked' : ''}>Ст. 17.3 совершена во время процессуальных действий — добавить её срок отдельно</label>` : ''}${items.length ? `<div class="calc-items">${items.map(calcItem).join('')}</div>` : '<div class="empty-calc"><span aria-hidden="true">§ +</span><strong>Статьи пока не выбраны</strong><p>Нажмите «В расчёт» в карточке статьи, чтобы увидеть общий срок.</p></div>'}<div id="calc-summary"></div><div class="calc-bottom"><button class="copy-button" id="copy-calculation" ${items.length ? '' : 'disabled'}>Копировать расчёт</button><button class="text-button" id="clear-calculation" ${items.length ? '' : 'disabled'}>Очистить</button></div><div class="rule-link">Правила назначения: ${ref('uk', '5.2')}<br>Отметка о судимости: ${ref('uk', '5.8')}</div></div>`;
    updateSummary();
    if ($('#mobile-count')) $('#mobile-count').textContent = `(${items.length})`;
  }
  function recordText(r) { return r.record ? 'Требуется' : r.fineCount ? 'Уточнить вид штрафа' : 'Не требуется'; }
  function updateSummary() {
    const items = selectedItems(), r = logic.calculate(items, state.mode, state.exception);
    const label = state.mode === 'sum' ? 'Сумма сроков по санкциям' : 'Верхний предел срока';
    const extras = items.flatMap(i => i.article.additional.map(t => `Ст. ${i.article.number}: ${t}`));
    $('#calc-summary').innerHTML = `<div class="summary"><span class="summary-label">${label}</span><div class="summary-value">${items.length ? `${r.hasUpperBound && r.months ? '<span class="up-to">до </span>' : ''}${r.months} <small>мес.</small>` : '— <small>мес.</small>'}</div><div class="summary-line"><span>Штраф</span><b>${!r.fineCount ? 'Не выбран' : r.unknownFines ? 'Сумма не определена' : `${fmt(r.fineSum)} · введено вручную`}</b></div><div class="summary-line"><span>Отметка при аресте</span><b class="${r.record ? 'warn' : ''}">${items.length ? recordText(r) : '—'}</b></div>${items.length && state.mode !== 'sum' ? `<div class="summary-line"><span>Арифметическая сумма сроков</span><b>${r.hasUpperBound ? 'до ' : ''}${r.sum} мес.</b></div>` : ''}</div>${r.invalidFine ? '<div class="notice"><strong>Этот набор недопустим в упрощённом порядке.</strong> Уберите штраф или измените порядок расчёта. ПК, гл. II, ст. 2.9 ч. 5, 9.</div>' : ''}${state.mode === 'maximum' && r.fineCount && r.months ? '<p class="mode-note">Штраф показан отдельно для сравнения. Его сложение с лишением свободы не следует автоматически из общего правила ст. 5.2.</p>' : ''}${r.fineCount ? '<p class="mode-note">В ст. 10.11 вид и размер штрафа не заданы. При уголовном штрафе судимость не возникает (ст. 1.9 ч. 3 УК). Полномочия на назначение проверьте отдельно.</p>' : ''}${extras.length ? `<ul class="calc-extras">${extras.map(t => `<li>${esc(t)}; в денежный итог не включено.</li>`).join('')}</ul>` : ''}`;
  }
  function renderPK() {
    $('#main').innerHTML = heading('Процессуальный кодекс', 'ПОРЯДОК ДЕЙСТВИЙ', 'Памятка по задержанию и полный текст кодекса.', 'pk') + `<div class="doc-toolbar"><div class="segmented" aria-label="Раздел процессуального кодекса"><button data-pk-mode="guide" class="${state.pkMode === 'guide' ? 'active' : ''}" aria-pressed="${state.pkMode === 'guide'}">Памятка по задержанию</button><button data-pk-mode="full" class="${state.pkMode === 'full' ? 'active' : ''}" aria-pressed="${state.pkMode === 'full'}">Полный кодекс</button></div></div><div id="pk-content"></div>`;
    if (state.pkMode === 'guide') renderGuide(); else renderReader('pk', $('#pk-content'));
  }
  function renderConstitution() {
    $('#main').innerHTML = heading('Конституция РО', 'ОСНОВНОЙ ЗАКОН', 'Права, гарантии и устройство государства Россия Онлайн.', 'constitution') + `<div class="doc-toolbar"><span class="lead">Для задержания: ${ref('constitution', '14')} · ${ref('constitution', '16')} · ${ref('constitution', '19')}</span></div><div id="constitution-content"></div>`;
    renderReader('constitution', $('#constitution-content'));
  }
  function renderReader(kind, container) {
    container.innerHTML = `<section class="doc-reader" aria-label="Полный текст документа">${searchBox('doc-search', 'Номер статьи или слова в тексте', state.docQuery)}<div class="filter-row"><select id="doc-chapter" aria-label="Глава документа"><option value="">Все главы</option>${data[kind].chapters.map(c => `<option value="${c.id}" ${state.docChapter === c.id ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></div><div class="results-meta" id="doc-count" aria-live="polite"></div><div id="doc-results"></div></section>`;
    updateReader();
  }
  function updateReader() {
    const kind = state.view;
    const filtered = data[kind].articles.filter(a => (!state.docChapter || a.chapter === state.docChapter) && logic.matches(a, state.docQuery));
    $('#doc-count').innerHTML = `<span>Найдено статей: <b>${filtered.length}</b></span>${download(kind)}`;
    let prev = '';
    $('#doc-results').innerHTML = filtered.slice(0, state.docLimit).map(a => {
      const chapter = data[kind].chapters.find(c => c.id === a.chapter);
      const chapterHeading = prev !== a.chapter ? `<h2 class="doc-chapter-title">${esc(a.chapterTitle)}</h2>${!state.docQuery && chapter?.intro.length ? `<p class="chapter-intro">${esc(chapter.intro.join('\n\n'))}</p>` : ''}` : '';
      prev = a.chapter;
      const title = a.title.length > 150 ? a.title.slice(0, 150) + '…' : a.title;
      return `${chapterHeading}<details class="document-article"><summary><span>Ст. ${a.number}</span>${esc(title)}</summary><div class="document-body">${a.title.length > 150 ? `<p><strong>${esc(a.title)}</strong></p>` : ''}${a.body.split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('')}</div></details>`;
    }).join('') || '<div class="no-results"><h2>Ничего не найдено</h2><p>Попробуйте другую формулировку или выберите все главы.</p></div>';
    if (filtered.length > state.docLimit) $('#doc-results').insertAdjacentHTML('beforeend', '<button class="load-more" data-doc-more>Показать ещё статьи</button>');
  }
  function renderGuide() {
    const steps = [
      ['Проверьте законное основание', 'Нужно хотя бы одно основание: задержание при нарушении или сразу после; явные следы; указания трёх и более свидетелей; фото или видео; акт уполномоченного лица; ориентировка или основания полагать, что лицо в розыске; непосредственная угроза жизни или здоровью. Опьянение — при невозможности безопасно продолжать действия и одновременно признаках правонарушения. Учитывайте неприкосновенность и специальный статус.', ref('pk', '1', 'II') + ' · ' + ref('pk', '7', 'II')],
      ['Начните фиксацию и отсчёт задержания', 'Обеспечьте непрерывную видеозапись оснований и хода задержания. Зафиксируйте время фактического ограничения свободы: процессуальный час применяется независимо от наручников. Наручники применяются при необходимости.', ref('pk', '1', 'VII') + ' · ' + ref('pk', '6.3', 'I')],
      ['Представьтесь и установите личность', 'Предъявите опознавательный знак: нашивку, бейдж, жетон или удостоверение. Проведите первичный обыск для установления личности, принадлежности к государственному органу и обнаружения запрещённых предметов. При необходимости проверьте розыск.', ref('pk', '2', 'II')],
      ['Изымите опасные предметы', 'На время процессуальных действий изымите оружие, нелетальные спецсредства, взрывчатые вещества, колющие и режущие предметы, предполагаемые наркотические средства. Законные предметы возвращаются после отпадения оснований удержания. Для конфискации или сохранения в деле нужно самостоятельное основание.', ref('pk', '2', 'II') + ' · ' + ref('pk', '2.5.1', 'II')],
      ['Объясните основание, статьи и права', 'При законных основаниях внесите или измените сведения о розыске. Сообщите причину задержания, номера статей и кратко их содержание. Разъясните право молчать, не свидетельствовать против себя, супруга и близких родственников, право на звонок и адвоката. Если право не понято, объясните его повторно.', ref('pk', '2', 'II') + ' · ' + ref('pk', '6', 'II')]
    ];
    steps.push(
      ['Обеспечьте звонок и помощь адвоката', 'Один телефонный разговор — до 3 минут в присутствии сотрудника. Ответ государственного адвоката — 3 минуты, ожидание после подтверждения прибытия — до 10 минут. Частный адвокат — до 10 минут с подтверждения вызова. Прибывшего до окончательного решения адвоката допустите к защите; конфиденциальная беседа — до 10 минут. Нет доступа к каналу — запросите содействие другого сотрудника.', ref('pk', '3.1', 'II') + ' · ' + ref('pk', '3.2', 'II') + ' · ' + ref('pk', '3.3', 'II') + ' · ' + ref('pk', '9', 'II') + ' · ' + ref('pk', '2.3', 'II')],
      ['Определите дальнейшую процедуру', 'При необходимости доставьте лицо в ИВС или суд, проведите экспертизу и допрос. Запрошенный адвокат вправе присутствовать на допросе. Для госслужащего вызовите прокуратуру и СК; увольнение после начала задержания не отменяет процедуру. При исполнении действующего судебного или прокурорского акта повторное рассмотрение на месте не требуется. Исключительная подследственность требует передачи компетентному органу.', ref('pk', '2', 'II') + ' · ' + ref('pk', '10', 'II') + ' · ' + ref('pk', '11', 'II') + ' · ' + ref('pk', '2.7.1', 'II')],
      ['Проверьте доказательства и примите решение', 'Проверьте обвиняющие и оправдывающие обстоятельства. Нет оснований для удержания или достаточных допустимых доказательств — освободите. По истечении процессуального часа без предусмотренного законом решения лицо также освобождается. Упрощённый порядок допустим только при условиях ст. 2.9: без существенного спора, специального статуса и необходимости длительного расследования; назначается только лишение свободы.', ref('pk', '7', 'II') + ' · ' + ref('pk', '2.9', 'II')],
      ['Оформите арест и сохраните запись', 'При законном основании для ареста объявите квалификацию, срок и порядок обжалования. Проведите личный обыск и выемку перед помещением в установленное место содержания. Видеозапись храните не менее 48 часов после окончания действия; при жалобе, производстве или запросе — до окончания производства и истечения срока законного истребования.', ref('pk', '2', 'IV') + ' · ' + ref('pk', '3', 'VII')]
    );
    renderGuideContent(steps);
  }
  function renderGuideContent(steps) {
    const stepsHtml = steps.map(([title, text, refs], i) => '<div class="step"><span class="step-index">' + String(i+1).padStart(2,'0') + '</span><div><h3>' + title + '</h3><p>' + text + '</p>' + refs + '</div></div>').join('');
    $('#pk-content').innerHTML = '<div class="procedure-layout"><section class="steps"><div class="steps-header"><h2>От основания до решения</h2><span class="tag muted">9 шагов</span></div>' + stepsHtml + '</section><aside class="procedure-side" id="procedure-side"></aside></div>';
    renderGuideSide();
  }
  function renderGuideSide() {
    const times = [
      ['60', 'Процессуальный час, с учётом законных приостановлений.'],
      ['3', 'Ответ государственного адвоката на вызов.'],
      ['10', 'Ожидание адвоката после подтверждения. Отдельно — конфиденциальная беседа.'],
      ['15', 'Подтверждение вызова прокуратурой. Нет ответа — освободить госслужащего.'],
      ['15', 'Прибытие прокурора после подтверждения. Не прибыл — освободить и направить материалы.'],
      ['20', 'Дополнительная проверка. Отдельно — доставка и ожидание СК/ФСБ по ст. 2.7.1.']
    ];
    $('#procedure-side').innerHTML = guideSideHTML(times);
  }
  function guideSideHTML(times) {
    let html = '<section class="reference-panel"><h2>Сроки под рукой</h2>';
    for (const [n, description] of times) {
      html += '<div class="time-row"><span class="time-value">' + n + '<small>мин.</small></span><p>' + description + '</p></div>';
    }
    html += ref('pk', '7.1', 'II') + '</section>';
    html += rightsHTML();
    return html;
  }
  function rightsHTML() {
    const a = source('pk', '6', 'II');
    const phrase = a.body.match(/«([^»]+)»/)?.[1] || '';
    return '<section class="reference-panel rights-panel"><span class="eyebrow">РАЗЪЯСНЕНИЕ ПРАВ</span><h2>Формулировка из кодекса</h2><p>' + esc(phrase) + '</p>' + ref('pk', '6', 'II') + '</section><div class="notice">Приостановления процессуального часа допустимы только по основаниям кодекса. Фиксируйте начало, паузы и возобновление. ' + ref('pk', '7.1', 'II') + '<br>При непредвиденных обстоятельствах порядок шагов можно изменить, сохранив обязательные действия. ' + ref('pk', '2.1', 'II') + '</div>';
  }
  let toastTimer;
  function toast(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
  }
  function showSource(id) {
    const a = articles.get(id);
    if (!a) return;
    $('#source-title').textContent = a.heading;
    $('#source-body').textContent = a.chapterTitle + '\n\n' + a.body;
    $('#source-dialog').showModal();
  }
  function resetFilters() {
    Object.assign(state, { query: '', chapter: '', department: '', penalty: '', scope: 'special', limit: 20 });
    renderUK();
    $('#article-search').focus();
  }
  function toggleArticle(id, forceRemove = false) {
    const a = articles.get(id);
    if (!a?.months) return;
    if (state.selected.has(id) || forceRemove) state.selected.delete(id);
    else state.selected.set(id, { article: a, type: 'prison', amount: null });
    updateResults(); renderCalculator();
    toast(state.selected.has(id) ? 'Статья ' + a.number + ' добавлена' : 'Статья ' + a.number + ' убрана из расчёта');
  }
  function changeView(view) {
    if (!['uk', 'pk', 'constitution'].includes(view)) return;
    if (state.view !== view) { state.docQuery = ''; state.docChapter = ''; state.docLimit = 25; }
    state.view = view; render();
  }
  document.addEventListener('click', async event => {
    const b = event.target.closest('button');
    if (!b) return;
    if (b.dataset.view) { location.hash = b.dataset.view; changeView(b.dataset.view); }
    if (b.dataset.source) showSource(b.dataset.source);
    if (b.dataset.add) toggleArticle(b.dataset.add);
    if (b.dataset.remove) toggleArticle(b.dataset.remove, true);
    if (b.dataset.scope) { state.scope = b.dataset.scope; state.limit = 20; updateResults(); }
    if (b.hasAttribute('data-more')) { state.limit += 20; updateResults(); }
    if (b.hasAttribute('data-reset-filters')) resetFilters();
    if (b.dataset.clearSearch) { const input = document.getElementById(b.dataset.clearSearch); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }
    if (b.dataset.pkMode) { state.pkMode = b.dataset.pkMode; renderPK(); }
    if (b.hasAttribute('data-doc-more')) { state.docLimit += 25; updateReader(); }
    if (b.id === 'close-dialog') $('#source-dialog').close();
    if (b.id === 'clear-calculation') { state.selected.clear(); renderCalculator(); updateResults(); toast('Расчёт очищен'); }
    if (b.id === 'copy-calculation') await copyCalculation();
  });
  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'article-search') {
      state.query = input.value; state.limit = 20;
      if (state.query) state.scope = 'all';
      input.parentElement.querySelector('button').hidden = !input.value;
      updateResults();
    }
    if (input.id === 'doc-search') {
      state.docQuery = input.value; state.docLimit = 25;
      input.parentElement.querySelector('button').hidden = !input.value;
      updateReader();
    }
    if (input.dataset.fineAmount) {
      const n = input.valueAsNumber;
      state.selected.get(input.dataset.fineAmount).amount = Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER ? n : null;
      updateSummary();
    }
  });
  document.addEventListener('change', event => {
    const input = event.target;
    const filters = { 'chapter-filter': 'chapter', 'department-filter': 'department', 'penalty-filter': 'penalty' };
    if (filters[input.id]) {
      state[filters[input.id]] = input.value; state.limit = 20;
      if (input.id === 'chapter-filter' && input.value) state.scope = 'all';
      updateResults();
    }
    if (input.id === 'calc-mode') { state.mode = input.value; renderCalculator(); }
    if (input.id === 'insult-exception') { state.exception = input.checked; updateSummary(); }
    if (input.dataset.penaltyType) { state.selected.get(input.dataset.penaltyType).type = input.value; renderCalculator(); }
    if (input.id === 'doc-chapter') { state.docChapter = input.value; state.docLimit = 25; updateReader(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !$('#source-dialog').open) {
      const input = $('#article-search') || $('#doc-search');
      if (input) { event.preventDefault(); input.focus(); }
    }
  });
  $('#source-dialog').addEventListener('click', event => {
    if (event.target !== $('#source-dialog')) return;
    const bounds = event.target.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close();
  });
  async function copyCalculation() {
    const items = selectedItems(), r = logic.calculate(items, state.mode, state.exception);
    const lines = ['Расчёт по Уголовному кодексу РО', modeNotes[state.mode], ''];
    for (const i of items) {
      lines.push('Ст. ' + i.article.number + ' — ' + i.article.title);
      lines.push(i.type === 'prison' ? (i.article.exactTerm ? '' : 'До ') + i.article.months + ' мес.' : 'Штраф: ' + (i.amount == null ? 'размер не указан' : fmt(i.amount) + ' (введено вручную)'));
      i.article.additional.forEach(t => lines.push('Дополнительно: ' + t));
    }
    lines.push('', 'Срок: ' + (r.hasUpperBound && r.months ? 'до ' : '') + r.months + ' мес.', 'Арифметическая сумма сроков: ' + r.sum + ' мес.', 'Отметка при аресте: ' + recordText(r));
    if (r.fineCount) lines.push('Штраф: ' + (r.unknownFines ? 'сумма не определена' : fmt(r.fineSum) + ' (введено вручную)'), 'Вид штрафа и полномочия на его назначение проверяются отдельно.');
    if (state.mode === 'simplified' && state.exception) lines.push('Учтено исключение: ст. 17.3 во время процессуальных действий.');
    if (r.invalidFine) lines.push('НЕДОПУСТИМО: штраф в упрощённом порядке запрещён (ПК, гл. II ст. 2.9).');
    lines.push('Источник: предоставленный текст УК РО, импорт 15.09.2026.');
    const content = lines.join('\n');
    try { await navigator.clipboard.writeText(content); toast('Расчёт скопирован'); }
    catch {
      const area = document.createElement('textarea'); area.value = content;
      area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select();
      const copied = document.execCommand('copy'); area.remove();
      if (copied) toast('Расчёт скопирован');
      else { $('#source-title').textContent = 'Выделите и скопируйте расчёт'; $('#source-body').textContent = content; $('#source-dialog').showModal(); }
    }
  }
  window.addEventListener('hashchange', () => {
    const view = location.hash.slice(1);
    if (['uk', 'pk', 'constitution'].includes(view)) changeView(view);
  });
  changeView(['uk', 'pk', 'constitution'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'uk');
})();
