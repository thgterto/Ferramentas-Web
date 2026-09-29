/**
 * Graficário — parte do todo, hierarquia e fluxo.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  /** kv: rótulo + valor, mantendo o índice original (a cor segue a entidade). */
  function kv(ctx) {
    return ctx.data.rows.map((r, i) => ({ name: String(r[0] == null ? '' : r[0]), value: N(r[1]), idx: i })).filter((x) => x.value !== null);
  }
  /** Colunas de níveis + valor (última coluna numérica) → árvore. */
  function toTree(ctx) {
    const t = ctx.data;
    const lastIsNum = t.rows.length && t.rows.every((r) => r[r.length - 1] === '' || N(r[r.length - 1]) !== null);
    const nl = lastIsNum ? t.columns.length - 1 : t.columns.length;
    const root = { name: 'Total', children: [] };
    t.rows.forEach((r) => {
      let node = root;
      for (let l = 0; l < nl; l++) {
        const nm = r[l];
        if (nm === '' || nm === null || nm === undefined) break;
        let ch = node.children.find((c) => c.name === String(nm));
        if (!ch) { ch = { name: String(nm), children: [] }; node.children.push(ch); }
        node = ch;
      }
      if (lastIsNum) node.value = (node.value || 0) + (N(r[r.length - 1]) || 0);
    });
    const fin = (n) => {
      if (!n.children.length) { delete n.children; return n.value || 0; }
      const s = n.children.reduce((a, c) => a + fin(c), 0);
      if (lastIsNum) n.value = s;
      return s;
    };
    fin(root);
    return { root, valued: lastIsNum, levels: nl };
  }
  function flows(ctx) {
    const t = ctx.data;
    const links = t.rows.map((r) => ({ source: String(r[0] || ''), target: String(r[1] || ''), value: N(r[2]) })).filter((l) => l.source && l.target && l.value !== null && l.value > 0 && l.source !== l.target);
    const names = [];
    links.forEach((l) => { [l.source, l.target].forEach((n) => { if (names.indexOf(n) < 0) names.push(n); }); });
    return { links, names };
  }

  // ================================================================ PIZZA / ROSCA
  B.register({
    id: 'pie', name: 'Rosca / pizza', group: 'Parte do todo', shape: 'wide',
    roles: ['Fatia', 'Valor'],
    hint: 'Parte do todo num relance, com até 6 fatias. Para comparar valores próximos, prefira barras.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'donut', l: 'Rosca (com total no centro)', t: 'toggle', d: true },
      { k: 'maxSlices', l: 'Máximo de fatias (resto vira "Outros")', t: 'number', d: 6 },
      { k: 'sortSlices', l: 'Ordenar do maior para o menor', t: 'toggle', d: true },
      { k: 'center', l: 'Texto do centro', t: 'text', d: 'total' }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      let items = kv(ctx);
      if (S.sortSlices) items = items.slice().sort((a, b) => b.value - a.value);
      const max = Math.max(2, parseInt(S.maxSlices, 10) || 6);
      if (items.length > max) {
        const keep = items.slice(0, max - 1), rest = items.slice(max - 1);
        items = keep.concat([{ name: 'Outros', value: rest.reduce((a, b) => a + b.value, 0), idx: -1 }]);
      }
      const total = items.reduce((a, b) => a + b.value, 0);
      const L = ctx.layout;
      const legend = S.legend !== 'none' && S.labels === 'none' ? B.legend(ctx, items.map((x) => x.name)) : undefined;
      const areaH = H - L.top - L.bottom, cy = L.top + areaH / 2;
      const r = Math.max(30, Math.min(W * 0.5 - (S.labels !== 'none' ? 110 : 20), areaH / 2 - 8));
      const colorOf = (x) => (x.idx < 0 ? T.deemph : ctx.hiOn ? (ctx.isHi(x.name) ? ctx.accentColor(x.idx) : T.deemph) : ctx.color(x.idx));
      const graphic = [];
      if (S.donut && S.center) {
        const big = S.center === 'total' ? ctx.fmt(total) : S.center === 'first' && items[0] ? ctx.R.fmt(items[0].value / total * 100, { d: 0, s: '%' }) : S.center;
        const small = S.center === 'total' ? 'total' : S.center === 'first' && items[0] ? items[0].name : '';
        // o número cabe no furo da rosca: a fonte encolhe conforme o texto
        const hole = r * 0.62 * 2 * 0.78;
        const fs = Math.max(12, Math.min(30, r * 0.3, 30 * hole / Math.max(B.measure(big, 30, 600), 1)));
        graphic.push({ type: 'text', left: 'center', top: cy - (small ? fs * 0.9 : fs * 0.5), style: { text: big, fill: T.ink, font: '600 ' + fs + 'px ' + GG.FONT, align: 'center' } });
        if (small) graphic.push({ type: 'text', left: 'center', top: cy + 6, style: { text: small, fill: T.ink2, font: '12px ' + GG.FONT, align: 'center', width: r * 1.1, overflow: 'truncate' } });
      }
      return {
        option: {
          legend, graphic,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: '', d: 'v' }, { l: 'do total', d: 'p', f: { d: 1, s: '%' } }] }) }),
          series: [{
            type: 'pie', name: 'Fatias', center: ['50%', cy], radius: S.donut ? [r * 0.62, r] : [0, r],
            startAngle: 90, clockwise: true, avoidLabelOverlap: true, minAngle: 2,
            itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: S.donut ? 3 : 0 },
            label: S.labels === 'none' ? { show: false } : { show: true, color: T.ink2, fontSize: 12, fontFamily: GG.FONT, formatter: ctx.fn('label', { tpl: '{n}  {p}' }) },
            labelLine: { show: S.labels !== 'none', length: 10, length2: 12, lineStyle: { color: T.axis } },
            emphasis: { scale: true, scaleSize: 4, label: { fontWeight: 600 } },
            data: items.map((x) => ({ name: x.name, value: x.value, itemStyle: { color: colorOf(x) } }))
          }]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ WAFFLE
  B.register({
    id: 'waffle', name: 'Waffle (100 quadrados)', group: 'Parte do todo', shape: 'wide',
    roles: ['Categoria', 'Valor'],
    hint: '"3 em cada 10": proporções concretas, contáveis. Destaque a categoria da história.',
    hl: 'categories', annot: false,
    settings: [{ k: 'cells', l: 'Quadrados', t: 'select', o: [['100', '10 × 10'], ['50', '10 × 5'], ['200', '20 × 10']], d: '100' }],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const items = kv(ctx).filter((x) => x.value > 0);
      const total = items.reduce((a, b) => a + b.value, 0) || 1;
      const nCells = parseInt(S.cells, 10) || 100;
      const cols = nCells === 200 ? 20 : 10, rows = nCells / cols;
      // maior resto: os quadrados somam exatamente nCells
      const raw = items.map((x) => x.value / total * nCells);
      const cnt = raw.map(Math.floor);
      let left = nCells - cnt.reduce((a, b) => a + b, 0);
      raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { cnt[i]++; left--; } });
      const names = items.map((x, i) => x.name + '  ' + ctx.R.fmt(x.value / total * 100, { d: 0, s: '%' }));
      const legend = S.legend !== 'none' ? B.legend(ctx, names, { icon: 'rect', itemWidth: 10, itemHeight: 10 }) : undefined;
      const L = ctx.layout;
      const availW = W - 32, availH = H - L.top - L.bottom;
      const cell = Math.min(availW / cols, availH / rows);
      const gw = cell * cols, gh = cell * rows;
      const series = [];
      let k = 0;
      items.forEach((x, i) => {
        const col = ctx.hiOn ? (ctx.isHi(x.name) ? ctx.accentColor(x.idx) : T.deemph) : ctx.color(x.idx);
        const data = [];
        for (let c = 0; c < cnt[i]; c++, k++) {
          // preenche por colunas, de baixo para cima (leitura como barra)
          const cx = Math.floor(k / rows), cy = k % rows;
          data.push([cx, cy, 0]);
        }
        series.push({ type: 'custom', name: names[i], color: col, renderItem: ctx.fn('rWaffle', { colors: [col], gap: Math.max(2, cell * 0.12) }), data,
          tooltip: { formatter: ctx.fn('tipText', { tpl: (x.name + ': ' + ctx.fmt(x.value) + ' (' + cnt[i] + ' de ' + nCells + ')').replace(/[{}]/g, ''), c: ctx.c }) } });
      });
      return {
        option: {
          legend,
          grid: { left: 16 + (availW - gw) / 2, top: L.top + (availH - gh) / 2, width: gw, height: gh },
          xAxis: { type: 'value', min: -0.5, max: cols - 0.5, show: false },
          yAxis: { type: 'value', min: -0.5, max: rows - 0.5, show: false },
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          series
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ TREEMAP
  B.register({
    id: 'treemap', name: 'Treemap', group: 'Hierarquia', shape: 'wide',
    roles: ['Nível 1', 'Nível 2 (opc.)', '…', 'Valor'],
    hint: 'Hierarquia por área. Cores só no primeiro nível; o tamanho carrega o valor.',
    hl: 'categories', annot: false,
    settings: [{ k: 'zoom', l: 'Clique para aproximar', t: 'toggle', d: false }],
    build(ctx) {
      const { T, S } = ctx;
      const { root, levels } = toTree(ctx);
      root.children.sort((a, b) => (b.value || 0) - (a.value || 0));
      const colorByName = {};
      ctx.data.rows.forEach((r) => { const n = String(r[0]); if (!(n in colorByName)) colorByName[n] = Object.keys(colorByName).length; });
      const paint = (n, col, depth) => {
        n.itemStyle = Object.assign({}, n.itemStyle, { color: col });
        n.label = { color: GG.color.inkOn(col) };
        // o rótulo superior fica na faixa da borda (cor do fundo), então usa a tinta do tema
        if (depth === 1 && levels > 1) n.upperLabel = { color: T.ink };
        (n.children || []).forEach((c) => paint(c, col, depth + 1));
      };
      root.children.forEach((c) => {
        const i = colorByName[c.name];
        const col = ctx.hiOn ? (ctx.isHi(c.name) ? ctx.accentColor(i) : T.deemph) : ctx.color(i);
        paint(c, col, 1);
      });
      const L = ctx.layout;
      const total = root.value || 1;
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipTree', { f: ctx.f, c: ctx.c, total, dropRoot: true }) }),
          series: [{
            type: 'treemap', name: 'Total', data: root.children, top: L.top, bottom: L.bottom, left: 16, right: 16,
            roam: false, nodeClick: S.zoom ? 'zoomToNode' : false, breadcrumb: { show: !!S.zoom, bottom: 6, itemStyle: { color: T.surface2, borderColor: T.border, textStyle: { color: T.ink2 } } },
            visibleMin: 200, squareRatio: 0.5 * (1 + Math.sqrt(5)),
            label: { show: S.labels !== 'none', fontSize: 12, fontFamily: GG.FONT, formatter: ctx.fn('label', { f: ctx.f, tpl: S.labels === 'all' || levels === 1 ? '{n}\n{v}' : '{n}' }), overflow: 'truncate', padding: 4 },
            upperLabel: { show: levels > 1 && S.labels !== 'none', height: 22, fontSize: 12, fontWeight: 600, fontFamily: GG.FONT },
            itemStyle: { borderColor: T.surface, borderWidth: 2, gapWidth: 2 },
            levels: [
              { itemStyle: { borderColor: T.surface, borderWidth: 3, gapWidth: 3 }, upperLabel: { show: false } },
              { itemStyle: { borderColor: T.surface, borderWidth: 1, gapWidth: 2 } },
              { itemStyle: { borderColor: T.surface, borderWidth: 1, gapWidth: 1 } }
            ],
            emphasis: { itemStyle: { borderColor: T.ink } }
          }]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ SUNBURST
  B.register({
    id: 'sunburst', name: 'Sunburst (anéis)', group: 'Hierarquia', shape: 'wide',
    roles: ['Nível 1', 'Nível 2', '…', 'Valor'],
    hint: 'Hierarquia em anéis: bom para 2–3 níveis e caminhos (orçamento, jornadas).',
    hl: 'categories', annot: false,
    settings: [],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const { root, levels } = toTree(ctx);
      const colorByName = {};
      ctx.data.rows.forEach((r) => { const n = String(r[0]); if (!(n in colorByName)) colorByName[n] = Object.keys(colorByName).length; });
      // a cor do 1º nível desce para todos os descendentes (o sunburst não herda um itemStyle explícito)
      const paint = (n, col) => { n.itemStyle = Object.assign({}, n.itemStyle, { color: col }); (n.children || []).forEach((ch) => paint(ch, col)); };
      root.children.forEach((c) => {
        const i = colorByName[c.name];
        paint(c, ctx.hiOn ? (ctx.isHi(c.name) ? ctx.accentColor(i) : T.deemph) : ctx.color(i));
      });
      const L = ctx.layout;
      const areaH = H - L.top - L.bottom;
      const r = Math.min(W - 32, areaH) / 2;
      const lv = [{}];
      for (let k = 1; k <= levels; k++) {
        const outer = k === levels && levels > 2;
        lv.push({ itemStyle: { opacity: Math.max(0.45, 1 - 0.2 * (k - 1)) }, label: { show: S.labels === 'all' || (S.labels === 'smart' && !outer), minAngle: k === 1 ? 10 : 14 } });
      }
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipTree', { f: ctx.f, c: ctx.c, total: root.value || 0 }) }),
          series: [{
            type: 'sunburst', data: root.children, center: ['50%', L.top + areaH / 2], radius: [r * 0.18, r],
            sort: 'desc', nodeClick: 'rootToNode',
            itemStyle: { borderColor: T.surface, borderWidth: 2 },
            label: { show: S.labels !== 'none', rotate: 'radial', color: T.ink, fontSize: 11, fontFamily: GG.FONT, minAngle: 12, overflow: 'truncate', width: r * 0.3 },
            levels: lv,
            emphasis: { focus: 'ancestor' }
          }]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ ÁRVORE
  B.register({
    id: 'tree', name: 'Árvore / organograma', group: 'Hierarquia', shape: 'wide',
    roles: ['Nível 1', 'Nível 2', '…', 'Valor (opc.)'],
    hint: 'Estruturas: organogramas, árvores de decisão, taxonomias.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'orient', l: 'Direção', t: 'seg', o: [['LR', '→'], ['TB', '↓']], d: 'LR' },
      { k: 'rootName', l: 'Nome da raiz', t: 'text', d: '' },
      { k: 'edge', l: 'Ligações', t: 'seg', o: [['curve', 'Curvas'], ['polyline', 'Ângulos']], d: 'curve' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { root, valued } = toTree(ctx);
      let top = root;
      if (root.children && root.children.length === 1 && !S.rootName) top = root.children[0];
      else top.name = S.rootName || 'Total';
      const paint = (n, depth) => {
        const hi = ctx.isHi(n.name);
        const col = hi ? ctx.accentColor(0) : depth === 0 ? T.ink : ctx.color(0);
        n.itemStyle = { color: n.children ? col : T.surface, borderColor: col, borderWidth: 2 };
        if (valued && n.value !== undefined && S.labels === 'all') n.label = { formatter: (n.name + '  ' + ctx.fmt(n.value)).replace(/[{}]/g, '') };
        (n.children || []).forEach((c) => paint(c, depth + 1));
      };
      paint(top, 0);
      const L = ctx.layout;
      const lr = S.orient === 'LR';
      const leaves = [];
      const walk = (n) => { if (n.children) n.children.forEach(walk); else leaves.push(n.name); };
      walk(top);
      const leftM = lr ? Math.min(ctx.W * 0.3, B.measure(top.name, 12) + 24) : 30;
      const rightM = lr ? Math.min(ctx.W * 0.36, Math.max(...leaves.map((x) => B.measure(x, 12))) + 24) : 30;
      const bottomM = lr ? 0 : Math.min(ctx.H * 0.35, Math.max(...leaves.map((x) => B.measure(x, 12))) + 16);
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: valued ? ctx.fn('tipTree', { f: ctx.f, c: ctx.c }) : ctx.fn('tipText', { tpl: '{n}', c: ctx.c }) }),
          series: [{
            type: 'tree', data: [top], orient: S.orient, edgeShape: S.edge, initialTreeDepth: -1, expandAndCollapse: true,
            top: L.top + (lr ? 0 : 16), bottom: L.bottom + bottomM, left: leftM, right: rightM,
            symbol: 'circle', symbolSize: 10, roam: false,
            lineStyle: { color: T.axis, width: 1.2, curveness: 0.5 },
            label: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT, position: lr ? 'left' : 'top', verticalAlign: 'middle', align: lr ? 'right' : 'center', distance: 6 },
            leaves: { label: lr ? { position: 'right', align: 'left', verticalAlign: 'middle', color: T.ink2 } : { position: 'bottom', rotate: -90, align: 'left', verticalAlign: 'middle', distance: 8, color: T.ink2 } },
            emphasis: { focus: 'descendant' }
          }]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ SANKEY
  B.register({
    id: 'sankey', name: 'Sankey (fluxos)', group: 'Fluxo', shape: 'wide',
    roles: ['Origem', 'Destino', 'Valor'],
    hint: 'De onde vem e para onde vai: orçamento, energia, jornada do cliente. A cor segue a origem.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'colorBy', l: 'Cores', t: 'select', o: [['origin', 'Só nas origens (recomendado)'], ['all', 'Em todos os nós (até 8)']], d: 'origin' },
      { k: 'orient', l: 'Direção', t: 'seg', o: [['horizontal', '→'], ['vertical', '↓']], d: 'horizontal' },
      { k: 'align', l: 'Alinhamento dos nós', t: 'select', o: [['justify', 'Justificado'], ['left', 'À esquerda'], ['right', 'À direita']], d: 'justify' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { links, names } = flows(ctx);
      const targets = new Set(links.map((l) => l.target));
      const origins = names.filter((n) => !targets.has(n));
      const colorOf = (n) => {
        if (ctx.hiOn) return ctx.isHi(n) ? ctx.accentColor(Math.max(0, origins.indexOf(n))) : T.deemph;
        if (S.colorBy === 'all') return ctx.color(names.indexOf(n));
        const oi = origins.indexOf(n);
        return oi >= 0 ? ctx.color(oi) : (ctx.mode === 'dark' ? '#8c8a84' : '#6f6e69');
      };
      // cor do link: a da origem "raiz" que alimenta o nó de origem do link
      const rootOf = {};
      origins.forEach((o) => { rootOf[o] = o; });
      for (let it = 0; it < 6; it++) links.forEach((l) => { if (rootOf[l.source] && !rootOf[l.target]) rootOf[l.target] = rootOf[l.source]; });
      const linkCol = (l) => {
        if (ctx.hiOn) return ctx.isHi(l.source) || ctx.isHi(l.target) ? colorOf(ctx.isHi(l.source) ? l.source : l.target) : T.deemph;
        return S.colorBy === 'all' ? colorOf(l.source) : colorOf(rootOf[l.source] || l.source);
      };
      const L = ctx.layout;
      const horiz = S.orient !== 'vertical';
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipFlow', { f: ctx.f, c: ctx.c }) }),
          series: [{
            type: 'sankey', orient: S.orient, nodeAlign: S.align, left: 16, right: horiz ? 150 : 16, top: L.top, bottom: L.bottom + (horiz ? 0 : 30),
            nodeWidth: 10, nodeGap: 14, layoutIterations: 48, draggable: true,
            label: { show: S.labels !== 'none', color: T.ink2, fontSize: 12, fontFamily: GG.FONT, formatter: ctx.fn('label', { f: ctx.f, tpl: S.labels === 'all' ? '{n}  {v}' : '{n}' }) },
            itemStyle: { borderWidth: 0 },
            lineStyle: { curveness: 0.5, opacity: 0.32 },
            emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.6 } },
            data: names.map((n) => ({ name: n, itemStyle: { color: colorOf(n) } })),
            links: links.map((l) => ({ ...l, lineStyle: { color: linkCol(l) } }))
          }]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ CORDAS (chord)
  B.register({
    id: 'chord', name: 'Cordas (relações mútuas)', group: 'Fluxo', shape: 'wide',
    roles: ['Origem', 'Destino', 'Valor'],
    hint: 'Fluxos entre membros de um mesmo grupo (migração entre regiões, trocas entre áreas).',
    hl: 'categories', annot: false,
    settings: [],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const { links, names } = flows(ctx);
      const L = ctx.layout;
      const areaH = H - L.top - L.bottom;
      const r = Math.min(W - 180, areaH - 40) / 2;
      const colorOf = (n) => (ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(names.indexOf(n)) : T.deemph) : ctx.color(names.indexOf(n)));
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipFlow', { f: ctx.f, c: ctx.c }) }),
          series: [{
            type: 'chord', center: ['50%', L.top + areaH / 2], radius: [Math.max(r - 12, 20), Math.max(r, 30)], padAngle: 2,
            itemStyle: { borderRadius: [0, 0, 3, 3] },
            label: { show: S.labels !== 'none', position: 'outside', distance: 8, color: T.ink2, fontSize: 12, fontFamily: GG.FONT },
            lineStyle: { color: 'source', opacity: 0.3 },
            emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.6 } },
            data: names.map((n) => ({ name: n, itemStyle: { color: colorOf(n) } })),
            links: links.map((l) => ({ source: l.source, target: l.target, value: l.value }))
          }]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ REDE (grafo)
  B.register({
    id: 'graph', name: 'Rede (grafo)', group: 'Fluxo', shape: 'wide',
    roles: ['Nó A', 'Nó B', 'Peso'],
    hint: 'Conexões e comunidades. Tamanho do nó = soma das ligações. Arraste para explorar.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'layout', l: 'Disposição', t: 'seg', o: [['force', 'Forças'], ['circular', 'Círculo']], d: 'force' },
      { k: 'topLabels', l: 'Rotular os N maiores nós', t: 'number', d: 12 }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { links, names } = flows(ctx);
      const deg = {};
      links.forEach((l) => { deg[l.source] = (deg[l.source] || 0) + l.value; deg[l.target] = (deg[l.target] || 0) + l.value; });
      const dv = names.map((n) => deg[n] || 0);
      const mx = Math.max(...dv, 1), mn = Math.min(...dv, 0);
      const rank = names.slice().sort((a, b) => deg[b] - deg[a]);
      const topN = parseInt(S.topLabels, 10) || 12;
      const wmax = Math.max(...links.map((l) => l.value), 1);
      const L = ctx.layout;
      const size = (v) => 8 + (Math.sqrt(v) - Math.sqrt(mn)) / ((Math.sqrt(mx) - Math.sqrt(mn)) || 1) * 30;
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipFlow', { f: ctx.f, c: ctx.c, node: 'conexões (soma)' }) }),
          series: [{
            type: 'graph', layout: S.layout, top: L.top, bottom: L.bottom, left: 30, right: 30, roam: true, draggable: true,
            force: { repulsion: Math.max(80, Math.min(400, ctx.W * (ctx.H - L.top - L.bottom) / (names.length * 60))), edgeLength: [30, Math.max(50, Math.min(130, ctx.W / 8))], gravity: 0.1, layoutAnimation: !ctx.thumb },
            circular: { rotateLabel: true },
            label: { show: S.labels !== 'none', position: 'right', color: T.ink2, fontSize: 11, fontFamily: GG.FONT },
            lineStyle: { color: T.axis, curveness: S.layout === 'circular' ? 0.25 : 0.08, opacity: 0.9 },
            emphasis: { focus: 'adjacency', lineStyle: { width: 3, color: T.ink2 } },
            data: names.map((n) => {
              const hi = ctx.hiOn ? ctx.isHi(n) : true;
              const col = ctx.hiOn ? (hi ? ctx.accentColor(0) : T.deemph) : ctx.color(0);
              return { name: n, value: deg[n] || 0, symbolSize: size(deg[n] || 0), itemStyle: B.ring(ctx, col), label: { show: S.labels === 'all' || (S.labels === 'smart' && (rank.indexOf(n) < topN || ctx.isHi(n))) } };
            }),
            links: links.map((l) => ({ source: l.source, target: l.target, value: l.value, lineStyle: { width: 0.8 + l.value / wmax * 3.2 } }))
          }]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ FUNIL
  B.register({
    id: 'funnel', name: 'Funil de conversão', group: 'Fluxo', shape: 'wide',
    roles: ['Etapa (em ordem)', 'Quantidade'],
    hint: 'Etapas ordenadas: cor ordinal (um matiz, claro → escuro) e conversão entre etapas.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'style', l: 'Forma', t: 'seg', o: [['bars', 'Barras'], ['funnel', 'Funil']], d: 'bars' },
      { k: 'pctOf', l: 'Percentual em relação a', t: 'seg', o: [['top', 'Topo'], ['prev', 'Etapa anterior']], d: 'top' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const items = kv(ctx);
      const top = items.length ? items[0].value : 1;
      const hue = GG.tokens.THEMES[S.theme] ? GG.tokens.THEMES[S.theme].order[0] : 'blue';
      const ord = GG.color.ordinal(hue, items.length, ctx.mode).slice().reverse(); // fraco→forte invertido: topo = mais saliente
      const cols = items.map((x, i) => (ctx.hiOn ? (ctx.isHi(x.name) ? ctx.accentColor(0) : T.deemph) : ord[i]));
      const pTop = items.map((x) => x.value / top * 100);
      const pPrev = items.map((x, i) => (i === 0 ? 100 : x.value / items[i - 1].value * 100));
      const names = items.map((x) => x.name);
      const L = ctx.layout;
      const lbl = (i) => ctx.fmt(items[i].value) + '   ' + ctx.R.fmt(S.pctOf === 'prev' ? pPrev[i] : pTop[i], { d: 0, s: '%' });
      const tip = ctx.fn('tipItem', { f: ctx.f, c: ctx.c, nameDim: 1, rows: [{ l: '', d: 0 }, { l: 'do topo', d: 2, f: { d: 1, s: '%' } }, { l: 'da etapa anterior', d: 3, f: { d: 1, s: '%' } }] });
      if (S.style === 'funnel') {
        return {
          option: {
            tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: '', d: 'v' }] }) }),
            series: [{
              type: 'funnel', sort: 'none', gap: 2, left: '12%', width: '60%', top: L.top, bottom: L.bottom, minSize: '12%',
              label: { show: S.labels !== 'none', position: 'right', color: T.ink2, fontSize: 12, fontFamily: GG.FONT },
              labelLine: { lineStyle: { color: T.axis } },
              itemStyle: { borderColor: T.surface, borderWidth: 0 },
              data: items.map((x, i) => ({ name: x.name, value: x.value, itemStyle: { color: cols[i] }, label: { formatter: (x.name + '   ' + lbl(i)).replace(/[{}]/g, '') } }))
            }]
          },
          meta: { annot: false }
        };
      }
      ctx.layout.right = Math.max(ctx.layout.right, 120);
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: tip }),
          xAxis: { type: 'value', show: false, max: top * 1.02 },
          yAxis: B.catAxis(ctx, names, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.ink2, fontSize: 12, fontWeight: 500, width: Math.max(90, ctx.W * 0.26), overflow: 'truncate' } }),
          series: [{
            type: 'bar', name: 'Etapas', barMaxWidth: 26, encode: { x: 0, y: 1 },
            data: items.map((x, i) => ({ value: [x.value, x.name, pTop[i], i === 0 ? null : pPrev[i]], itemStyle: { color: cols[i], borderRadius: [0, 4, 4, 0] },
              label: S.labels !== 'none' ? B.dataLabel(ctx, { position: 'right', formatter: lbl(i).replace(/[{}]/g, '') }) : undefined }))
          }]
        },
        meta: { annot: false }
      };
    }
  });

  GG.builders.helpers = { kv, toTree, flows };
})(window.GG = window.GG || {});
