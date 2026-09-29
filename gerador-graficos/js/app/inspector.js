/**
 * Graficário — inspetor (painel de ajustes).
 * Os controles específicos de cada tipo vêm do esquema `settings` do construtor.
 */
(function (GG) {
  'use strict';
  const I = GG.inspector = {};
  const open = new Set(['story', 'type', 'color']);
  const A = () => GG.app;
  const S = () => GG.app.state.settings;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const uniq = (a) => Array.from(new Set(a.filter((x) => x !== '' && x !== null && x !== undefined).map(String)));

  // ajustes que mudam quais controles aparecem → redesenham o inspetor
  const STRUCTURAL = new Set(['quad', 'status', 'scale', 'theme', 'mode', 'normalize', 'style', 'kind']);
  // dependências de visibilidade
  const DEP = {
    qx: (s) => s.quad === 'custom', qy: (s) => s.quad === 'custom',
    q1: (s) => s.quad && s.quad !== 'none', q2: (s) => s.quad && s.quad !== 'none', q3: (s) => s.quad && s.quad !== 'none', q4: (s) => s.quad && s.quad !== 'none',
    warn: (s) => s.status && s.status !== 'none', crit: (s) => s.status && s.status !== 'none',
    hue: (s) => s.scale !== 'div', pair: (s) => s.scale === undefined || s.scale === 'div' || !('scale' in s), center: (s) => s.scale === undefined || s.scale === 'div'
  };

  function set(k, v) { A().setSetting(k, v, STRUCTURAL.has(k) ? { full: true } : undefined); }
  const later = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 250); }; };

  // --- controles ---------------------------------------------------------------------
  function field(label, control, help, id) {
    const f = el('div', 'fld');
    const l = el('label', null, label);
    if (id) { l.htmlFor = id; control.id = control.id || id; }
    f.append(l, control);
    if (help) f.appendChild(el('div', 'help', help));
    return f;
  }
  let uid = 0;
  const nid = (k) => 'ctl-' + k + '-' + (++uid);
  function textCtl(k, ph, area, rows) {
    const inp = el(area ? 'textarea' : 'input', area ? 'textarea' : 'input');
    if (area) inp.rows = rows || 2;
    inp.value = S()[k] == null ? '' : S()[k];
    if (ph) inp.placeholder = ph;
    inp.addEventListener('input', later(() => set(k, inp.value), 260));
    return inp;
  }
  function numCtl(k, ph) {
    const inp = el('input', 'input'); inp.type = 'text'; inp.inputMode = 'decimal';
    inp.value = S()[k] == null ? '' : GG.data.numText(S()[k]);
    if (ph) inp.placeholder = ph;
    inp.addEventListener('input', later(() => { const v = inp.value.trim(); set(k, v === '' ? '' : (GG.data.toNum(v) ?? v)); }, 300));
    return inp;
  }
  function selectCtl(k, options, onChange) {
    const s = el('select', 'select');
    options.forEach(([v, l]) => { const o = el('option', null, l); o.value = v; s.appendChild(o); });
    s.value = S()[k] == null ? options[0][0] : String(S()[k]);
    s.addEventListener('change', () => (onChange ? onChange(s.value) : set(k, s.value)));
    return s;
  }
  function segCtl(k, options, label) {
    const g = el('div', 'seg'); g.setAttribute('role', 'group'); if (label) g.setAttribute('aria-label', label);
    options.forEach(([v, l]) => {
      const b = el('button', null, l); b.type = 'button';
      b.setAttribute('aria-pressed', String(S()[k]) === String(v) ? 'true' : 'false');
      b.addEventListener('click', () => { g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); set(k, v); });
      g.appendChild(b);
    });
    return g;
  }
  function toggleCtl(k, label) {
    const w = el('label', 'switch');
    const i = el('input'); i.type = 'checkbox'; i.checked = !!S()[k];
    i.addEventListener('change', () => set(k, i.checked));
    w.append(i, el('span', null, label));
    return w;
  }

  function section(key, title, build) {
    const d = el('details', 'sec');
    if (open.has(key)) d.open = true;
    d.addEventListener('toggle', () => { if (d.open) open.add(key); else open.delete(key); });
    const s = el('summary', null, title);
    const body = el('div', 'sec-body');
    d.append(s, body);
    build(body);
    return d;
  }

  // --- blocos --------------------------------------------------------------------------
  function about(root) {
    const st = A().state;
    const p = A().preset();
    const def = A().def();
    const cat = p ? GG.presets.CATS.find((c) => c.id === p.cat) : null;
    const b = el('div', 'about');
    b.appendChild(el('span', 'type-chip', def.name + (cat ? ' · ' + cat.name : '')));
    b.appendChild(el('h2', null, p && p.type === st.type ? p.name : def.name));
    b.appendChild(el('p', null, p && p.type === st.type ? p.desc : def.hint));
    if (p && p.type === st.type && def.hint !== p.desc) {
      const h = el('p'); h.style.color = 'var(--muted)'; h.textContent = def.hint; b.appendChild(h);
    }
    root.appendChild(b);
  }

  function storySec(body) {
    const tip = el('div', 'story-tip');
    tip.innerHTML = '<b>O título é a conclusão.</b> Em vez de “Vendas por região”, escreva o que o leitor deve entender: “O Sul cresceu 23% e puxou o ano”.';
    body.appendChild(tip);
    let id = nid('title');
    body.appendChild(field('Título (conclusão)', textCtl('title', 'Ex.: O Sul cresceu 23% e puxou o ano', true, 2), null, id));
    id = nid('sub');
    body.appendChild(field('Subtítulo (contexto e unidade)', textCtl('subtitle', 'Ex.: Vendas em 2025, R$ milhões', true, 2), null, id));
    id = nid('src');
    body.appendChild(field('Fonte dos dados', textCtl('source', 'Ex.: ERP, jan–set/2025'), null, id));
    id = nid('note');
    body.appendChild(field('Nota de rodapé', textCtl('note', 'Ex.: valores sem impostos'), null, id));
  }

  function typeSec(body) {
    const st = A().state;
    const REG = GG.builders.REG;
    const sel = el('select', 'select');
    const same = el('optgroup'); same.label = 'Compatíveis com os dados atuais';
    const other = el('optgroup'); other.label = 'Outro formato de dados (carrega exemplo)';
    GG.builders.ORDER.forEach((id) => {
      const o = el('option', null, REG[id].name + ' — ' + REG[id].group); o.value = id;
      (A().compatible(st.type, id) ? same : other).appendChild(o);
    });
    sel.append(same, other);
    sel.value = st.type;
    sel.addEventListener('change', () => A().setType(sel.value));
    const id = nid('type');
    body.appendChild(field('Tipo de gráfico', sel, A().def().hint, id));
    const def = A().def();
    def.settings.forEach((x) => {
      if (DEP[x.k] && !DEP[x.k](Object.assign({}, S(), { scale: S().scale === undefined && def.settings.some((y) => y.k === 'scale') ? def.settings.find((y) => y.k === 'scale').d : S().scale }))) return;
      const cid = nid(x.k);
      let ctl;
      if (x.t === 'seg') ctl = segCtl(x.k, x.o, x.l);
      else if (x.t === 'select') ctl = selectCtl(x.k, x.o);
      else if (x.t === 'toggle') { body.appendChild(Object.assign(toggleCtl(x.k, x.l), {})); if (x.help) body.appendChild(el('div', 'help', x.help)); return; }
      else if (x.t === 'number') ctl = numCtl(x.k, x.ph);
      else if (x.t === 'column') {
        const cols = GG.data.clean(st.data).columns;
        ctl = selectCtl(x.k, [['', '— nenhuma —']].concat(cols.map((c, i) => [String(i), c])));
      } else ctl = textCtl(x.k, x.ph);
      body.appendChild(field(x.l, ctl, x.help, cid));
    });
  }

  function hlCandidates() {
    const st = A().state;
    const def = A().def();
    const t = GG.data.clean(st.data);
    const type = st.type;
    if (def.hl === 'none') return null;
    const col = (j) => t.rows.map((r) => r[j]);
    const numeric = (j) => t.rows.length && t.rows.every((r) => r[j] === '' || GG.data.toNum(r[j]) !== null);
    if (def.shape === 'columns') return { what: 'grupos', items: t.columns.map(String), series: true };
    if (type === 'gantt') return { what: 'fases', items: uniq(col(3).length ? col(3) : ['Tarefas']), series: true };
    if (type === 'timeline') return { what: 'categorias ou eventos', items: uniq(col(2)).concat(uniq(col(1))), series: false };
    if (A().FAMILY[type] === 'flow') return { what: 'nós', items: uniq(col(0).concat(col(1))), series: false };
    if (type === 'tree') return { what: 'nós', items: uniq(t.columns.flatMap((_, j) => (numeric(j) ? [] : col(j)))), series: false };
    if (type === 'scatter') {
      const lc = parseInt(S().labelCol, 10), gc = parseInt(S().groupCol, 10);
      if (!isNaN(lc) && t.columns[lc] !== undefined) return { what: 'pontos (rótulos)', items: uniq(col(lc)), series: false };
      if (!isNaN(gc) && t.columns[gc] !== undefined) return { what: 'grupos', items: uniq(col(gc)), series: true };
      return null;
    }
    let mode = def.hl;
    const nSeries = t.columns.slice(1).filter((_, j) => numeric(j + 1)).length;
    if (mode === 'auto') mode = nSeries > 1 ? 'series' : 'categories';
    if (mode === 'series') return { what: 'séries', items: t.columns.slice(1).map(String), series: true };
    return { what: 'categorias', items: uniq(col(0)), series: false };
  }

  function colorSec(body) {
    const st = A().state;
    const mode = A().chartMode();
    const def = A().def();
    const list = el('div', 'theme-list');
    const themes = Object.keys(GG.tokens.THEMES).map((k) => [k, GG.tokens.THEMES[k].name]).concat([['custom', 'Da marca']]);
    themes.forEach(([k, name]) => {
      const b = el('button', 'theme-opt'); b.type = 'button';
      b.setAttribute('aria-pressed', (S().theme || 'padrao') === k ? 'true' : 'false');
      b.appendChild(el('span', null, name));
      const sw = el('span', 'swatches');
      const cols = k === 'custom' ? GG.color.parseList(S().customPalette) : GG.color.themeColors(k, mode);
      (cols.length ? cols : ['#cccccc']).slice(0, 8).forEach((c) => { const i = el('i'); i.style.background = c; sw.appendChild(i); });
      b.appendChild(sw);
      b.addEventListener('click', () => set('theme', k));
      list.appendChild(b);
    });
    body.appendChild(field('Paleta categórica', list, 'Quatro ordens validadas das mesmas 8 cores (daltonismo protan/deutan, luminosidade, contraste). A cor segue a entidade, nunca a posição.'));
    if (S().theme === 'custom') {
      const ta = textCtl('customPalette', '#1f5fae, #e0632a, #2a9d6f …', true, 2);
      ta.style.fontFamily = 'var(--mono)';
      body.appendChild(field('Cores da marca (hex, na ordem)', ta, 'O validador abaixo roda as mesmas checagens das paletas prontas. Corrija qualquer FALHA antes de publicar.'));
      body.appendChild(validatorReport(GG.color.parseList(S().customPalette), mode, def));
    } else {
      const det = el('details'); const sm = el('summary', null, 'Ver checagens desta paleta'); sm.style.cssText = 'cursor:pointer;font-size:12px;color:var(--ink-2)';
      det.append(sm, validatorReport(GG.color.themeColors(S().theme || 'padrao', mode), mode, def));
      body.appendChild(det);
    }

    const hl = hlCandidates();
    if (hl && hl.items.length) {
      const chips = el('div', 'chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Destacar ' + hl.what);
      const cur = new Set((S().highlight || []).map(String));
      const pal = GG.color.themeColors(S().theme || 'padrao', mode, GG.color.parseList(S().customPalette));
      hl.items.slice(0, 120).forEach((name, i) => {
        const c = el('button', 'chip'); c.type = 'button';
        c.setAttribute('aria-pressed', cur.has(name) ? 'true' : 'false');
        if (hl.series) { const sw = el('i'); sw.style.background = pal[i] || GG.tokens.MODES[mode].deemph; c.appendChild(sw); }
        c.appendChild(el('span', null, name));
        c.title = name;
        c.addEventListener('click', () => {
          const s = new Set((S().highlight || []).map(String));
          if (s.has(name)) s.delete(name); else s.add(name);
          const next = hl.items.filter((x) => s.has(x));
          c.setAttribute('aria-pressed', s.has(name) ? 'true' : 'false');
          A().setSetting('highlight', next);
        });
        chips.appendChild(c);
      });
      const f = field('Destacar ' + hl.what, chips, 'Ênfase: o que você escolher ganha cor; o resto vira contexto em cinza. É o atalho mais eficaz para focar a atenção.');
      const clear = el('button', 'btn btn-sm btn-ghost', 'Limpar destaque'); clear.type = 'button'; clear.style.justifySelf = 'start';
      clear.addEventListener('click', () => { A().setSetting('highlight', [], { full: true }); });
      f.appendChild(clear);
      body.appendChild(f);
      const acc = [['auto', 'Automático (1 destaque = cor 1)'], ['entity', 'Cor de cada item']].concat(pal.slice(0, 8).map((c, i) => [String(i), 'Cor ' + (i + 1) + ' (' + c + ')']));
      body.appendChild(field('Cor do destaque', selectCtl('accent', acc), null, nid('accent')));
    }
    body.appendChild(toggleCtl('decal', 'Texturas (daltonismo, impressão P&B)'));
  }

  function validatorReport(colors, mode, def) {
    const box = el('div', 'vreport');
    if (!colors.length) { box.appendChild(el('span', null, 'Informe pelo menos 2 cores em hexadecimal.')); return box; }
    const pairs = def.id === 'scatter' ? 'all' : 'adjacent';
    const r = GG.color.validate(colors, { mode, pairs });
    r.report.forEach((row) => {
      const d = el('div', row.state === 'pass' ? 'pass' : row.state === 'warn' ? 'warn' : 'fail');
      d.append(el('b', null, row.state === 'pass' ? 'OK' : row.state === 'warn' ? 'AVISO' : 'FALHA'), el('span', null, row.check + ': ' + row.detail));
      box.appendChild(d);
    });
    const note = el('span', null, 'Modo ' + (mode === 'dark' ? 'escuro' : 'claro') + ', pares ' + (pairs === 'all' ? 'todos (dispersão)' : 'vizinhos') + '.');
    note.style.cssText = 'color:var(--muted);font-size:11px';
    box.appendChild(note);
    return box;
  }

  function numbersSec(body) {
    const g = el('div', 'fld-3');
    g.append(field('Prefixo', textCtl('prefix', 'R$ '), null, nid('prefix')), field('Sufixo', textCtl('suffix', '%'), null, nid('suffix')),
      field('Casas', selectCtl('decimals', [['', 'Auto'], ['0', '0'], ['1', '1'], ['2', '2'], ['3', '3']]), null, nid('dec')));
    body.appendChild(g);
    body.appendChild(toggleCtl('compact', 'Números compactos (12,9 mil · 4,2 mi)'));
    body.appendChild(field('Rótulos de dados', segCtl('labels', [['none', 'Nenhum'], ['smart', 'Seletivos'], ['all', 'Todos']], 'Rótulos de dados'),
      'Seletivos: só o que conta a história (destaques, extremos, o último ponto). Um número em cada ponto vira ruído.'));
    body.appendChild(field('Legenda', selectCtl('legend', [['auto', 'Automática'], ['top', 'No topo'], ['bottom', 'Embaixo'], ['right', 'À direita'], ['none', 'Sem legenda']]), 'Com 2+ séries a legenda é recomendada — a cor nunca deve ser o único jeito de identificar.', nid('legend')));
  }

  function axesSec(body) {
    const g = el('div', 'fld-2');
    g.append(field('Mínimo do eixo', numCtl('yMin', 'auto'), null, nid('ymin')), field('Máximo do eixo', numCtl('yMax', 'auto'), null, nid('ymax')));
    body.appendChild(g);
    if (['bar', 'lollipop', 'waterfall', 'pareto'].includes(A().state.type)) body.appendChild(el('div', 'help', 'Barras sempre partem do zero — cortar a base exagera as diferenças.'));
    const g2 = el('div', 'fld-2');
    g2.append(field('Nome do eixo X', textCtl('xName', ''), null, nid('xn')), field('Nome do eixo Y', textCtl('yName', ''), null, nid('yn')));
    body.appendChild(g2);
  }

  function annotSec(body) {
    const st = A().state;
    const ann = JSON.parse(JSON.stringify(S().annotations || { refs: [], bands: [], notes: [] }));
    ['refs', 'bands', 'notes'].forEach((k) => { ann[k] = ann[k] || []; });
    const cats = uniq(GG.data.clean(st.data).rows.map((r) => r[0]));
    const series = GG.data.clean(st.data).columns.slice(1);
    const save = (full) => A().setSetting('annotations', JSON.parse(JSON.stringify(ann)), full ? { full: true } : undefined);
    const saveLater = later(() => save(false), 300);
    const inp = (obj, key, ph, cls) => { const i = el('input', 'input' + (cls ? ' ' + cls : '')); i.value = obj[key] == null ? '' : obj[key]; i.placeholder = ph; i.setAttribute('aria-label', ph); i.addEventListener('input', () => { obj[key] = i.value; saveLater(); }); return i; };
    const sel = (obj, key, opts, label) => { const s = el('select', 'select'); s.setAttribute('aria-label', label); opts.forEach(([v, l]) => { const o = el('option', null, l); o.value = v; s.appendChild(o); }); s.value = obj[key] || opts[0][0]; s.addEventListener('change', () => { obj[key] = s.value; save(false); }); return s; };
    const x = (arr, i) => { const b = el('button', 'btn btn-sm btn-ghost btn-icon'); b.type = 'button'; b.innerHTML = '<svg><use href="#i-x"/></svg>'; b.setAttribute('aria-label', 'Remover'); b.addEventListener('click', () => { arr.splice(i, 1); save(true); }); return b; };
    const listBox = el('div', 'annot-list');
    ann.refs.forEach((r, i) => {
      const row = el('div', 'annot');
      row.append(sel(r, 'axis', [['val', 'Linha no valor'], ['cat', 'Linha na categoria/X']], 'Eixo'), inp(r, 'v', 'Valor (ex.: 50)'), x(ann.refs, i), inp(r, 'label', 'Rótulo (ex.: Meta)', 'full'));
      listBox.appendChild(row);
    });
    ann.bands.forEach((b, i) => {
      const row = el('div', 'annot');
      row.append(inp(b, 'from', 'De (ex.: ' + (cats[2] || 'jan') + ')'), inp(b, 'to', 'Até'), x(ann.bands, i), sel(b, 'axis', [['cat', 'Faixa na categoria/X'], ['val', 'Faixa no valor (Y)']], 'Eixo da faixa'), inp(b, 'label', 'Rótulo (ex.: Campanha)'));
      listBox.appendChild(row);
    });
    ann.notes.forEach((n, i) => {
      const row = el('div', 'annot');
      const xs = el('select', 'select'); xs.setAttribute('aria-label', 'Ponto');
      [''].concat(cats).forEach((c) => { const o = el('option', null, c || '— ponto —'); o.value = c; xs.appendChild(o); });
      xs.value = n.x || ''; xs.addEventListener('change', () => { n.x = xs.value; save(false); });
      const ss = sel(n, 'series', [['', 'Série: automática']].concat(series.map((s) => [s, s])), 'Série');
      row.append(xs, ss, x(ann.notes, i), inp(n, 'text', 'Texto da nota (ex.: Lançamento)', 'full'));
      listBox.appendChild(row);
    });
    body.appendChild(el('div', 'help', 'Anotações explicam o “porquê”: uma meta, o período de uma campanha, o dia em que algo mudou.'));
    body.appendChild(listBox);
    const add = el('div', 'annot-add');
    const addB = (label, fn) => { const b = el('button', 'btn btn-sm', label); b.type = 'button'; b.addEventListener('click', () => { fn(); save(true); }); return b; };
    add.append(
      addB('+ Linha de referência', () => ann.refs.push({ axis: 'val', v: '', label: 'Meta' })),
      addB('+ Faixa', () => ann.bands.push({ axis: 'cat', from: cats[0] || '', to: cats[1] || '', label: '' })),
      addB('+ Nota num ponto', () => ann.notes.push({ x: cats[Math.floor(cats.length / 2)] || '', text: 'O que aconteceu aqui?' }))
    );
    body.appendChild(add);
  }

  function advancedSec(body) {
    body.appendChild(toggleCtl('animation', 'Animação de entrada'));
    const ta = textCtl('override', '{ "grid": { "left": 40 } }', true, 5);
    ta.style.fontFamily = 'var(--mono)'; ta.style.fontSize = '12px';
    body.appendChild(field('Sobrescrever option do ECharts (JSON)', ta, 'Mesclado por cima do que o gerador produz. Para ajustes finos que a interface não cobre. Veja a aba Código.', nid('ovr')));
    body.appendChild(el('div', 'override-err'));
    const reset = el('button', 'btn btn-sm', 'Restaurar ajustes do modelo'); reset.type = 'button';
    reset.addEventListener('click', () => {
      const p = A().preset();
      if (!p || p.type !== A().state.type) { A().toast('Sem modelo de origem para este tipo.'); return; }
      A().state.settings = JSON.parse(JSON.stringify(p.settings));
      A().refresh({ full: true });
    });
    body.appendChild(reset);
  }

  // --- API ------------------------------------------------------------------------------
  I.render = function () {
    const root = document.getElementById('inspector');
    if (!root || !GG.app || !GG.app.state) return;
    const scroll = root.scrollTop;
    root.innerHTML = '';
    const def = A().def();
    about(root);
    root.appendChild(section('story', 'História', storySec));
    root.appendChild(section('type', 'Tipo e forma', typeSec));
    root.appendChild(section('color', 'Cores e destaque', colorSec));
    root.appendChild(section('num', 'Números, rótulos e legenda', numbersSec));
    if (A().CARTESIAN.has(A().state.type)) root.appendChild(section('axes', 'Eixos', axesSec));
    if (def.annot) root.appendChild(section('annot', 'Anotações', annotSec));
    root.appendChild(section('adv', 'Avançado', advancedSec));
    root.scrollTop = scroll;
  };
  /** Dados mudaram: só as partes que dependem deles (destaques, colunas, anotações). */
  I.refreshData = later(() => I.render(), 350);
})(window.GG = window.GG || {});
