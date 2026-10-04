/**
 * Graficário — aplicação: estado, biblioteca, palco, painéis, histórico e persistência.
 */
(function (GG) {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const REG = () => GG.builders.REG;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const debounce = (fn, ms) => { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); }; };

  // Família e eixos vêm da declaração de cada tipo (js/builders/types/<id>.js).
  const FAMILY = {};
  const CARTESIAN = new Set();
  Object.keys(REG()).forEach((id) => { FAMILY[id] = REG()[id].family; if (REG()[id].cartesian) CARTESIAN.add(id); });

  const A = GG.app = {
    FAMILY, CARTESIAN, store, clone, $, $$, norm, debounce,
    state: null, chart: null, lastOption: null, lastCtxMeta: null, tab: 'data',
    compatible: (a, b) => GG.builders.compatible(a, b)
  };

  // ================================================================ ESTADO
  function presetState(p) {
    return { v: 1, presetId: p.id, type: p.type, data: GG.presets.dataOf(p), settings: clone(p.settings || {}), frame: A.state ? A.state.frame : 'fit', customW: A.state ? A.state.customW : 1200, customH: A.state ? A.state.customH : 700 };
  }
  A.preset = () => (A.state && GG.presets.byId[A.state.presetId]) || null;
  A.def = () => REG()[A.state.type];

  A.loadPreset = function (id, opts) {
    const p = GG.presets.byId[id];
    if (!p) return;
    A.state = presetState(p);
    afterStateChange({ animate: true, full: true });
    pushHistoryNow();
    highlightCard();
    if (!(opts && opts.silentHash)) { try { history.replaceState(null, '', '#modelo=' + encodeURIComponent(id)); } catch (e) { /* file:// */ } }
  };

  /** Altera um ajuste. opts.full = redesenha o inspetor (ex.: mudou algo que muda controles). */
  A.setSetting = function (k, v, opts) {
    A.state.settings[k] = v;
    afterStateChange(Object.assign({ animate: false }, opts || {}));
  };
  A.setSettings = function (patch, opts) {
    Object.assign(A.state.settings, patch);
    afterStateChange(Object.assign({ animate: false }, opts || {}));
  };
  A.setData = function (table, opts) {
    A.state.data = table;
    afterStateChange(Object.assign({ animate: false, dataChanged: true }, opts || {}));
  };
  A.setType = function (type) {
    const cur = A.state.type;
    if (type === cur) return;
    const ex = GG.presets.list.find((p) => p.type === type);
    if (!A.compatible(cur, type) && ex) {
      const ok = window.confirm('Os dados atuais não estão no formato que "' + REG()[type].name + '" espera.\n\nOK = carregar os dados de exemplo desse tipo (mantendo título, subtítulo e fonte)\nCancelar = manter meus dados e tentar assim mesmo');
      if (ok) {
        const keep = { title: A.state.settings.title, subtitle: A.state.settings.subtitle, source: A.state.settings.source, note: A.state.settings.note, theme: A.state.settings.theme, customPalette: A.state.settings.customPalette };
        A.state.data = GG.presets.dataOf(ex);
        A.state.settings = Object.assign(clone(ex.settings), keep);
      }
    }
    // remove ajustes específicos do tipo antigo que não existem no novo
    const newKeys = new Set(REG()[type].settings.map((s) => s.k));
    REG()[cur].settings.forEach((s) => { if (!newKeys.has(s.k)) delete A.state.settings[s.k]; });
    A.state.type = type;
    afterStateChange({ animate: true, full: true, dataChanged: true });
  };

  function afterStateChange(opts) {
    opts = opts || {};
    render({ animate: !!opts.animate });
    if (opts.full) { GG.inspector.render(); GG.grid.render(); }
    else if (opts.dataChanged) { GG.inspector.refreshData(); if (!opts.fromGrid) GG.grid.render(); }
    refreshDock();
    autosave();
    pushHistory();
  }
  A.refresh = afterStateChange;

  // ================================================================ RENDERIZAÇÃO
  A.chartMode = function () {
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  A.frameSize = function () {
    const s = A.state;
    if (s.frame === 'fit') {
      const el = $('#chart');
      return { W: Math.max(240, el.clientWidth || 800), H: Math.max(200, el.clientHeight || 500) };
    }
    if (s.frame === 'custom') return { W: Math.max(240, +s.customW || 1200), H: Math.max(200, +s.customH || 700) };
    const m = String(s.frame).match(/^(\d+)x(\d+)$/);
    return m ? { W: +m[1], H: +m[2] } : { W: 800, H: 500 };
  };

  function layoutFrame() {
    const wrap = $('#canvasWrap'), frame = $('#frame');
    const s = A.state;
    const fit = s.frame === 'fit';
    wrap.classList.toggle('fit', fit);
    $('#customSize').hidden = s.frame !== 'custom';
    if (fit) {
      frame.style.width = ''; frame.style.height = ''; frame.style.transform = '';
      $('#zoomLbl').textContent = '';
      const r = $('#chart').getBoundingClientRect();
      $('#frameSize').textContent = Math.round(r.width) + ' × ' + Math.round(r.height);
      return;
    }
    const { W, H } = A.frameSize();
    frame.style.width = W + 'px'; frame.style.height = H + 'px';
    const k = Math.min((wrap.clientWidth - 40) / W, (wrap.clientHeight - 40) / H, 1);
    frame.style.transform = 'scale(' + Math.max(0.05, k).toFixed(4) + ')';
    $('#zoomLbl').textContent = Math.round(k * 100) + '%';
    $('#frameSize').textContent = W + ' × ' + H;
  }

  function render(opts) {
    if (!A.chart) return;
    layoutFrame();
    const { W, H } = A.frameSize();
    const cw = A.chart.getWidth(), ch = A.chart.getHeight();
    if (Math.abs(cw - W) > 1 || Math.abs(ch - H) > 1) A.chart.resize({ width: W, height: H });
    const err = $('#chartError');
    let option;
    try {
      option = GG.builders.build({ type: A.state.type, data: A.state.data, settings: clone(A.state.settings), mode: A.chartMode(), width: W, height: H });
    } catch (e) {
      console.error(e);
      err.hidden = false;
      err.innerHTML = '';
      const b = document.createElement('b'); b.textContent = 'Não foi possível desenhar este gráfico com os dados atuais.';
      const p = document.createElement('span'); p.textContent = 'Confira o formato esperado na aba Dados (linha cinza sob o cabeçalho). Detalhe: ' + e.message;
      err.append(b, p);
      return;
    }
    err.hidden = true;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!(opts && opts.animate) || reduce) option.animation = false;
    try {
      // trocar de tipo limpa o canvas: evita estados residuais entre séries diferentes (ex.: árvore → árvore)
      if (A.lastType !== A.state.type || A.state.type === 'tree') A.chart.clear();
      A.lastType = A.state.type;
      A.chart.setOption(option, { notMerge: true });
    } catch (e) {
      // um erro no meio do setOption deixa a instância inconsistente: recria e tenta de novo
      console.error(e);
      A.lastType = null;
      try {
        A.chart.dispose();
        A.chart = echarts.init($('#chart'), null, { renderer: 'canvas', locale: GG.RT.LOCALE_NAME });
        A.chart.setOption(option, { notMerge: true });
        A.lastType = A.state.type;
      } catch (e2) {
        console.error(e2);
        err.hidden = false; err.textContent = 'Erro do ECharts: ' + e2.message;
        return;
      }
    }
    A.lastOption = option;
    const S = A.state.settings;
    $('#chart').setAttribute('aria-label', [S.title, S.subtitle].filter(Boolean).join(' — ') || REG()[A.state.type].name);
    const ta = $('.inspector .override-err');
    if (ta) ta.textContent = option.__overrideError ? 'JSON inválido: ' + option.__overrideError : '';
  }
  A.render = render;

  // ================================================================ BIBLIOTECA
  const thumbs = { cache: {}, queue: [], busy: false, chart: null, io: null };

  function thumbFor(p) {
    const mode = A.chartMode();
    const key = p.id + ':' + mode;
    if (thumbs.cache[key]) return thumbs.cache[key];
    if (!thumbs.chart) {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:-10000px;top:0;width:224px;height:140px;';
      document.body.appendChild(d);
      thumbs.chart = echarts.init(d, null, { renderer: 'canvas', locale: GG.RT.LOCALE_NAME, width: 224, height: 140 });
    }
    const S = Object.assign(clone(p.settings), { title: '', subtitle: '', source: '', note: '', legend: 'none', labels: 'none', animation: false });
    try {
      const opt = GG.builders.build({ type: p.type, data: GG.presets.dataOf(p), settings: S, mode, width: 224, height: 140, thumb: true });
      opt.backgroundColor = GG.tokens.MODES[mode].page;
      thumbs.chart.clear();
      thumbs.chart.setOption(opt, { notMerge: true });
      thumbs.cache[key] = thumbs.chart.getDataURL({ type: 'png', pixelRatio: 1.5, backgroundColor: GG.tokens.MODES[mode].page });
    } catch (e) { console.warn('miniatura', p.id, e); thumbs.cache[key] = ''; }
    return thumbs.cache[key];
  }
  function pumpThumbs() {
    if (thumbs.busy) return;
    thumbs.busy = true;
    const step = () => {
      const img = thumbs.queue.shift();
      if (!img) { thumbs.busy = false; return; }
      const p = GG.presets.byId[img.dataset.id];
      if (p && img.isConnected) { const url = thumbFor(p); if (url) img.src = url; img.classList.remove('loading'); }
      (window.requestIdleCallback || ((f) => setTimeout(f, 16)))(step);
    };
    step();
  }
  function observeThumb(img) {
    if (!thumbs.io) {
      thumbs.io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { thumbs.io.unobserve(en.target); thumbs.queue.push(en.target); } });
        pumpThumbs();
      }, { root: $('#libList'), rootMargin: '200px' });
    }
    thumbs.io.observe(img);
  }

  function buildCategorySelect() {
    const sel = $('#libCat');
    sel.innerHTML = '';
    const all = document.createElement('option'); all.value = ''; all.textContent = 'Todas as situações (' + GG.presets.list.length + ')';
    sel.appendChild(all);
    GG.presets.CATS.forEach((c) => {
      const n = GG.presets.list.filter((p) => p.cat === c.id).length;
      if (!n) return;
      const o = document.createElement('option'); o.value = c.id; o.textContent = c.name + ' (' + n + ')';
      sel.appendChild(o);
    });
    const typeGroup = document.createElement('optgroup'); typeGroup.label = 'Por tipo de gráfico';
    GG.builders.ORDER.forEach((id) => {
      const n = GG.presets.list.filter((p) => p.type === id).length;
      if (!n) return;
      const o = document.createElement('option'); o.value = 'type:' + id; o.textContent = REG()[id].name + ' (' + n + ')';
      typeGroup.appendChild(o);
    });
    sel.appendChild(typeGroup);
  }

  function renderLibrary() {
    const q = norm($('#libSearch').value.trim());
    const cat = $('#libCat').value;
    const list = $('#libList');
    list.innerHTML = '';
    const words = q.split(/\s+/).filter(Boolean);
    const match = (p) => {
      if (cat && cat.startsWith('type:') && p.type !== cat.slice(5)) return false;
      if (cat && !cat.startsWith('type:') && p.cat !== cat) return false;
      if (!words.length) return true;
      const c = GG.presets.CATS.find((x) => x.id === p.cat);
      const hay = norm([p.name, p.desc, (p.tags || []).join(' '), REG()[p.type].name, c ? c.name : '', p.settings.title].join(' '));
      return words.every((w) => hay.includes(w));
    };
    const found = GG.presets.list.filter(match);
    $('#libCount').textContent = found.length + ' de ' + GG.presets.list.length;
    if (!found.length) {
      const d = document.createElement('div'); d.className = 'lib-empty'; d.textContent = 'Nenhum modelo encontrado. Tente “linha”, “meta”, “qualidade”…';
      list.appendChild(d); return;
    }
    GG.presets.CATS.forEach((c) => {
      const items = found.filter((p) => p.cat === c.id);
      if (!items.length) return;
      const h = document.createElement('div'); h.className = 'lib-group-title';
      const b = document.createElement('b'); b.textContent = c.name;
      const n = document.createElement('span'); n.textContent = items.length;
      const ds = document.createElement('span'); ds.className = 'lib-group-desc'; ds.textContent = c.desc;
      h.append(b, n, ds);
      h.id = 'grp-' + c.id;
      list.appendChild(h);
      items.forEach((p) => {
        const btn = document.createElement('button');
        btn.className = 'card'; btn.type = 'button'; btn.dataset.id = p.id; btn.setAttribute('role', 'listitem');
        const img = document.createElement('img'); img.className = 'thumb loading'; img.alt = ''; img.width = 112; img.height = 70; img.dataset.id = p.id;
        const key = p.id + ':' + A.chartMode();
        if (thumbs.cache[key]) { img.src = thumbs.cache[key]; img.classList.remove('loading'); } else observeThumb(img);
        const body = document.createElement('span');
        const nm = document.createElement('span'); nm.className = 'card-name'; nm.textContent = p.name;
        const ds2 = document.createElement('span'); ds2.className = 'card-desc'; ds2.textContent = p.desc;
        const tg = document.createElement('span'); tg.className = 'card-tag'; tg.textContent = REG()[p.type].name;
        body.append(nm, ds2, tg);
        btn.append(img, body);
        btn.title = p.settings.title || p.name;
        btn.addEventListener('click', () => { A.loadPreset(p.id); setView('stage'); });
        list.appendChild(btn);
      });
    });
    highlightCard();
  }
  function highlightCard(scroll) {
    let cur = null;
    $$('.card').forEach((c) => { const on = A.state && c.dataset.id === A.state.presetId; c.setAttribute('aria-current', on ? 'true' : 'false'); if (on) cur = c; });
    if (scroll && cur) cur.scrollIntoView({ block: 'center' });
  }

  // ================================================================ DOCA (painéis inferiores)
  function setTab(tab) {
    A.tab = tab;
    $$('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === tab ? 'true' : 'false'));
    $('#dockBody').setAttribute('aria-labelledby', 'tab-' + tab);
    $('#dock').classList.remove('collapsed');
    refreshDock(true);
  }
  A.setTab = setTab;

  function a11yTable() {
    const S = A.state.settings;
    const t = GG.data.clean(A.state.data);
    const wrap = document.createElement('div');
    wrap.style.overflow = 'auto';
    const tb = document.createElement('table'); tb.className = 'a11y-table';
    const cap = document.createElement('caption'); cap.textContent = S.title || REG()[A.state.type].name;
    if (S.subtitle) { const sm = document.createElement('div'); sm.style.cssText = 'font-weight:400;color:var(--ink-2);font-size:12.5px;margin-top:2px'; sm.textContent = S.subtitle; cap.appendChild(sm); }
    tb.appendChild(cap);
    const numCols = t.columns.map((_, j) => t.rows.length && t.rows.every((r) => r[j] === '' || GG.data.toNum(r[j]) !== null));
    const thead = document.createElement('thead'); const hr = document.createElement('tr');
    t.columns.forEach((c, j) => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = c; if (numCols[j] && j > 0) th.className = 'num'; hr.appendChild(th); });
    thead.appendChild(hr); tb.appendChild(thead);
    const f = { p: S.prefix || '', s: S.suffix || '' };
    if (S.decimals !== '' && S.decimals != null) f.d = +S.decimals;
    const tbody = document.createElement('tbody');
    t.rows.slice(0, 2000).forEach((r) => {
      const tr = document.createElement('tr');
      r.forEach((v, j) => {
        const cell = document.createElement(j === 0 ? 'th' : 'td');
        if (j === 0) cell.scope = 'row';
        const n = GG.data.toNum(v);
        if (numCols[j] && j > 0 && n !== null) { cell.textContent = GG.RT.fmt(n, f); cell.className = 'num'; } else cell.textContent = v === null || v === undefined ? '' : String(v);
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    wrap.appendChild(tb);
    if (t.rows.length > 2000) { const p = document.createElement('p'); p.style.cssText = 'margin:0 12px 12px;color:var(--muted);font-size:12px'; p.textContent = 'Mostrando as primeiras 2.000 linhas de ' + t.rows.length + '.'; wrap.appendChild(p); }
    return wrap;
  }

  function codePanel() {
    const wrap = document.createElement('div');
    const tools = document.createElement('div'); tools.className = 'code-tools';
    const mk = (label, fn, primary) => { const b = document.createElement('button'); b.className = 'btn btn-sm' + (primary ? ' btn-primary' : ''); b.textContent = label; b.addEventListener('click', fn); return b; };
    tools.append(
      mk('Copiar option (JSON)', () => GG.exporter.copyText(GG.builders.serialize(A.lastOption, true), 'Option copiado.'), true),
      mk('Copiar HTML completo', () => GG.exporter.copyText(GG.exporter.htmlDoc(), 'HTML copiado.')),
      mk('Baixar HTML', () => GG.exporter.run('html'))
    );
    const hint = document.createElement('span'); hint.className = 'hint';
    hint.textContent = 'Funções (formatadores, tooltips) aparecem como {"__ggfn": …}: o HTML exportado já inclui o runtime que as reconstrói.';
    tools.appendChild(hint);
    const pre = document.createElement('pre'); pre.className = 'code';
    pre.textContent = A.lastOption ? GG.builders.serialize(A.lastOption, true) : '';
    wrap.append(tools, pre);
    return wrap;
  }

  const refreshDockSoon = debounce(() => refreshDock(true), 250);
  function refreshDock(now) {
    if (!now) { refreshDockSoon(); updateBadges(); return; }
    const body = $('#dockBody');
    updateBadges();
    if (A.tab === 'data') { if (!body.querySelector('.grid-root')) GG.grid.render(); return; }
    body.innerHTML = '';
    if (A.tab === 'table') body.appendChild(a11yTable());
    else if (A.tab === 'review') body.appendChild(GG.lint.panel());
    else if (A.tab === 'code') body.appendChild(codePanel());
  }
  A.refreshDock = refreshDock;
  function updateBadges() {
    const t = GG.data.clean(A.state.data);
    $('#dataBadge').textContent = t.rows.length + '×' + t.columns.length;
    const res = GG.lint.run();
    const bad = res.filter((r) => r.level === 'bad').length, warn = res.filter((r) => r.level === 'warn').length;
    const b = $('#reviewBadge');
    b.textContent = bad ? bad : warn ? warn : '✓';
    b.className = 'badge' + (bad ? ' bad' : warn ? ' warn' : '');
    b.title = bad + ' problema(s), ' + warn + ' aviso(s)';
  }

  // ================================================================ HISTÓRICO
  const hist = { stack: [], idx: -1, lock: false };
  const snap = () => JSON.stringify({ presetId: A.state.presetId, type: A.state.type, data: A.state.data, settings: A.state.settings });
  function pushHistoryNow() {
    if (hist.lock) return;
    const s = snap();
    if (hist.stack[hist.idx] === s) return;
    hist.stack = hist.stack.slice(0, hist.idx + 1);
    hist.stack.push(s);
    if (hist.stack.length > 80) hist.stack.shift();
    hist.idx = hist.stack.length - 1;
    updateUndo();
  }
  const pushHistory = debounce(pushHistoryNow, 450);
  function restore(s) {
    hist.lock = true;
    const o = JSON.parse(s);
    Object.assign(A.state, o);
    render({ animate: false });
    GG.inspector.render(); GG.grid.render(); refreshDock(true); highlightCard(); autosave();
    hist.lock = false;
    updateUndo();
  }
  A.undo = () => { pushHistoryNow(); if (hist.idx > 0) { hist.idx--; restore(hist.stack[hist.idx]); } };
  A.redo = () => { if (hist.idx < hist.stack.length - 1) { hist.idx++; restore(hist.stack[hist.idx]); } };
  function updateUndo() { $('#undoBtn').disabled = hist.idx <= 0; $('#redoBtn').disabled = hist.idx >= hist.stack.length - 1; }

  // ================================================================ PERSISTÊNCIA
  const autosave = debounce(() => store.set('gg:current', A.state), 500);
  A.saveProject = function () {
    const list = store.get('gg:projects', []);
    const name = window.prompt('Nome do gráfico:', A.state.name || A.state.settings.title || (A.preset() ? A.preset().name : 'Meu gráfico'));
    if (name === null) return;
    const id = A.state.savedId || ('p' + Date.now().toString(36));
    A.state.savedId = id; A.state.name = name;
    const entry = { id, name, updated: Date.now(), state: clone(A.state) };
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list[i] = entry; else list.unshift(entry);
    if (store.set('gg:projects', list.slice(0, 60))) toast('Salvo em "Meus gráficos" neste navegador.');
    else toast('Não foi possível salvar (armazenamento do navegador indisponível). Use Exportar › Arquivo do projeto.');
    autosave();
  };
  function renderOpenMenu() {
    const m = $('#openMenu');
    m.innerHTML = '';
    const list = store.get('gg:projects', []);
    const lab = document.createElement('div'); lab.className = 'menu-label'; lab.textContent = 'Salvos neste navegador';
    m.appendChild(lab);
    if (!list.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Nada salvo ainda. Use “Salvar” para guardar o gráfico atual.'; m.appendChild(e); }
    list.forEach((it) => {
      const row = document.createElement('div'); row.className = 'saved-item';
      const b = document.createElement('button'); b.setAttribute('role', 'menuitem');
      const nm = document.createElement('span'); nm.className = 'name'; nm.textContent = it.name;
      const dt = document.createElement('small'); dt.textContent = new Date(it.updated).toLocaleDateString('pt-BR');
      b.append(nm, dt);
      b.addEventListener('click', () => { A.openState(it.state); closeMenus(); });
      const x = document.createElement('button'); x.className = 'btn btn-sm btn-ghost btn-icon'; x.setAttribute('aria-label', 'Excluir ' + it.name); x.title = 'Excluir';
      x.innerHTML = '<svg><use href="#i-x"/></svg>'; x.style.width = '28px';
      x.addEventListener('click', (ev) => { ev.stopPropagation(); if (!confirm('Excluir "' + it.name + '"?')) return; store.set('gg:projects', store.get('gg:projects', []).filter((p) => p.id !== it.id)); renderOpenMenu(); });
      row.append(b, x);
      m.appendChild(row);
    });
    const hr = document.createElement('hr'); m.appendChild(hr);
    const imp = document.createElement('button'); imp.setAttribute('role', 'menuitem'); imp.textContent = 'Abrir arquivo de projeto (.json)…';
    imp.addEventListener('click', () => { closeMenus(); GG.exporter.run('import'); });
    m.appendChild(imp);
  }
  A.openState = function (st) {
    if (!st || !st.type || !REG()[st.type] || !st.data) { toast('Arquivo de projeto inválido.'); return; }
    A.state = Object.assign({ frame: 'fit', customW: 1200, customH: 700, settings: {} }, clone(st));
    afterStateChange({ animate: true, full: true });
    pushHistoryNow(); highlightCard();
    toast('Gráfico aberto.');
  };

  // ================================================================ UI GERAL
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  A.toast = toast;

  function closeMenus() {
    $$('.menu').forEach((m) => { m.hidden = true; });
    $$('[aria-haspopup]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  function toggleMenu(btn, menu, before) {
    const open = menu.hidden;
    closeMenus();
    if (open) { if (before) before(); menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); const f = menu.querySelector('button'); if (f) f.focus(); }
  }

  function setView(v) {
    const mobile = window.innerWidth <= 1000;
    if (v === 'data') { document.body.dataset.view = 'stage'; setTab('data'); }
    else document.body.dataset.view = v;
    document.body.dataset.mview = v;
    if (mobile) {
      // no celular: "Gráfico" = gráfico grande; "Dados" = grade grande
      const dock = $('#dock');
      dock.classList.toggle('collapsed', v === 'stage');
      dock.style.height = v === 'data' ? '62%' : '';
    }
    $$('.mobile-nav button').forEach((b) => b.setAttribute('aria-current', b.dataset.view === v ? 'true' : 'false'));
    if (v === 'stage' || v === 'data') setTimeout(() => { A.chart && A.chart.resize(); render({ animate: false }); }, 30);
  }

  function setTheme(next) {
    if (next) document.documentElement.setAttribute('data-theme', next); else document.documentElement.removeAttribute('data-theme');
    store.set('gg:theme', next || '');
    try { localStorage.setItem('gg:theme', next || ''); } catch (e) { /* ignore */ }
    render({ animate: false });
    renderLibrary();
    GG.inspector.render();
  }

  function initDock() {
    const dock = $('#dock');
    const h = store.get('gg:dock', null);
    if (h && h.collapsed) dock.classList.add('collapsed');
    if (h && h.height) dock.style.height = h.height + 'px';
    $('#dockToggle').addEventListener('click', () => {
      dock.classList.toggle('collapsed');
      store.set('gg:dock', { collapsed: dock.classList.contains('collapsed'), height: parseInt(dock.style.height, 10) || null });
      setTimeout(onResize, 20);
    });
    const handle = $('#dockResize');
    let startY = 0, startH = 0;
    const move = (e) => { const y = e.touches ? e.touches[0].clientY : e.clientY; const nh = Math.max(120, Math.min(window.innerHeight * 0.7, startH + (startY - y))); dock.style.height = nh + 'px'; };
    const up = () => {
      handle.classList.remove('dragging');
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      store.set('gg:dock', { collapsed: false, height: parseInt(dock.style.height, 10) });
      onResize();
    };
    handle.addEventListener('pointerdown', (e) => { startY = e.clientY; startH = dock.getBoundingClientRect().height; dock.classList.remove('collapsed'); handle.classList.add('dragging'); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); e.preventDefault(); });
    $$('.tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));
  }

  const onResize = debounce(() => {
    if (!A.chart) return;
    if (A.state.frame === 'fit') { A.chart.resize(); render({ animate: false }); } else layoutFrame();
  }, 120);

  function bindUI() {
    $('#libSearch').addEventListener('input', debounce(renderLibrary, 120));
    $('#libCat').addEventListener('change', renderLibrary);
    $('#brandLink').addEventListener('click', (e) => { e.preventDefault(); $('#libSearch').value = ''; $('#libCat').value = ''; renderLibrary(); setView('library'); });
    $('#undoBtn').addEventListener('click', A.undo);
    $('#redoBtn').addEventListener('click', A.redo);
    $('#frameSel').addEventListener('change', (e) => {
      A.state.frame = e.target.value;
      if (A.state.frame === 'custom') { $('#customW').value = A.state.customW || 1200; $('#customH').value = A.state.customH || 700; }
      render({ animate: false }); autosave();
    });
    const custom = debounce(() => { A.state.customW = +$('#customW').value || 1200; A.state.customH = +$('#customH').value || 700; render({ animate: false }); autosave(); }, 250);
    $('#customW').addEventListener('input', custom); $('#customH').addEventListener('input', custom);
    $('#tableBtn').addEventListener('click', () => { setTab('table'); if (window.innerWidth <= 1000) setView('stage'); });
    $('#copyImgBtn').addEventListener('click', () => GG.exporter.run('clip'));
    $('#fullBtn').addEventListener('click', () => {
      const f = $('#frame');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (f.requestFullscreen) f.requestFullscreen().catch(() => toast('Tela cheia indisponível neste navegador.'));
    });
    document.addEventListener('fullscreenchange', () => {
      const f = $('#frame');
      if (document.fullscreenElement === f) { f.style.transform = 'none'; f.style.width = '100vw'; f.style.height = '100vh'; setTimeout(() => { A.chart.resize(); const S = clone(A.state.settings); const o = GG.builders.build({ type: A.state.type, data: A.state.data, settings: S, mode: A.chartMode(), width: window.innerWidth, height: window.innerHeight }); A.chart.setOption(o, { notMerge: true }); }, 60); }
      else setTimeout(() => { A.chart.resize(); render({ animate: false }); }, 60);
    });
    $('#themeBtn').addEventListener('click', () => setTheme(A.chartMode() === 'dark' ? 'light' : 'dark'));
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.getAttribute('data-theme')) { render({ animate: false }); renderLibrary(); } });
    $('#saveBtn').addEventListener('click', A.saveProject);
    $('#openBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu($('#openBtn'), $('#openMenu'), renderOpenMenu); });
    $('#exportBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu($('#exportBtn'), $('#exportMenu')); });
    $$('#exportMenu [data-export]').forEach((b) => b.addEventListener('click', () => { closeMenus(); GG.exporter.run(b.dataset.export); }));
    document.addEventListener('click', (e) => { if (!e.target.closest('.menu-wrap')) closeMenus(); });
    $$('.mobile-nav button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
      if (e.key === 'Escape') closeMenus();
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); A.saveProject(); }
      if (mod && !inField && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) A.redo(); else A.undo(); }
      if (mod && !inField && e.key.toLowerCase() === 'y') { e.preventDefault(); A.redo(); }
    });
    // Modal "colar tabela"
    const modal = $('#pasteModal');
    $$('[data-close]', modal).forEach((b) => b.addEventListener('click', () => modal.close()));
    $('#pasteApply').addEventListener('click', () => {
      const t = GG.data.parseTable($('#pasteArea').value);
      if (!t.columns.length || !t.rows.length) { toast('Não encontrei uma tabela com cabeçalho e pelo menos uma linha.'); return; }
      modal.close();
      A.setData(t);
      toast('Dados colados: ' + t.rows.length + ' linhas × ' + t.columns.length + ' colunas.');
    });
    new ResizeObserver(onResize).observe($('#canvasWrap'));
    window.addEventListener('hashchange', () => { const id = hashPreset(); if (id && (!A.state || id !== A.state.presetId)) A.loadPreset(id, { silentHash: true }); });
  }
  function hashPreset() {
    const m = String(location.hash || '').match(/modelo=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ================================================================ INÍCIO
  function boot() {
    if (!window.echarts) return;
    GG.RT = GG_RUNTIME(echarts);
    A.chart = echarts.init($('#chart'), null, { renderer: 'canvas', locale: GG.RT.LOCALE_NAME });
    const fromHash = hashPreset();
    const saved = store.get('gg:current', null);
    if (fromHash && GG.presets.byId[fromHash]) A.state = presetState(GG.presets.byId[fromHash]);
    else if (saved && saved.type && REG()[saved.type] && saved.data) A.state = Object.assign({ frame: 'fit', customW: 1200, customH: 700 }, saved);
    else A.state = presetState(GG.presets.byId['vendas-regiao-destaque'] || GG.presets.list[0]);
    $('#frameSel').value = A.state.frame || 'fit';
    if (A.state.frame === 'custom') { $('#customW').value = A.state.customW; $('#customH').value = A.state.customH; }
    buildCategorySelect();
    bindUI();
    initDock();
    renderLibrary();
    highlightCard(true);
    if (window.innerWidth <= 1000) $('#dock').classList.add('collapsed');
    GG.inspector.render();
    GG.grid.render();
    render({ animate: true });
    refreshDock(true);
    pushHistoryNow();
    // Depois que as fontes carregam, as medidas de texto mudam: redesenha
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render({ animate: false }));
    A.ready = true;
    document.dispatchEvent(new Event('gg:ready'));
  }
  function failed() {
    const e = $('#chartError');
    e.hidden = false;
    e.innerHTML = '<b>Não consegui carregar a biblioteca Apache ECharts.</b><span>Verifique a conexão com a internet (jsDelivr, unpkg ou cdnjs) ou coloque uma cópia em <code>vendor/echarts.min.js</code>.</span>';
  }
  const bad = GG.presets.validate();
  if (bad.length) console.error('Graficário: problemas no registro de modelos:\n' + bad.join('\n'));
  if (window.echarts) setTimeout(boot, 0);
  else if (window.GG_ECHARTS_FAILED) failed();
  else { document.addEventListener('gg:echarts', boot, { once: true }); document.addEventListener('gg:echarts-failed', failed, { once: true }); }
})(window.GG = window.GG || {});
