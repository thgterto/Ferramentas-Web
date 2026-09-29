/**
 * Graficário — distribuição, relação e matrizes.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);
  const ST = GG.stats;

  const hexA = (hex, a) => {
    const h = GG.color.normHex(hex).slice(1);
    return 'rgba(' + [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',') + ',' + a + ')';
  };
  /** Interpola linearmente em RGB entre paradas (igual ao visualMap), para escolher a cor do texto. */
  function lerpColor(stops, t) {
    t = Math.max(0, Math.min(1, t));
    const seg = (stops.length - 1) * t, i = Math.min(Math.floor(seg), stops.length - 2), f = seg - i;
    const a = GG.color.normHex(stops[i]).slice(1), b = GG.color.normHex(stops[i + 1]).slice(1);
    const c = [0, 2, 4].map((k) => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - f) + parseInt(b.slice(k, k + 2), 16) * f));
    return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  const SCALE_SETTINGS = [
    { k: 'scale', l: 'Escala de cor', t: 'seg', o: [['seq', 'Sequencial'], ['div', 'Divergente']], d: 'seq' },
    { k: 'hue', l: 'Matiz (sequencial)', t: 'select', o: Object.keys(GG.tokens.SEQ_HUES).map((k) => [k, GG.tokens.SEQ_HUES[k]]), d: 'blue' },
    { k: 'pair', l: 'Polos (divergente)', t: 'select', o: Object.keys(GG.tokens.DIV_PAIRS).map((k) => [k, GG.tokens.DIV_PAIRS[k].name]), d: 'blue-red' },
    { k: 'center', l: 'Centro da escala divergente', t: 'number', d: 0 }
  ];
  /** visualMap (escala de cor) + função para a cor de cada valor. */
  function colorScale(ctx, values, opts) {
    const { S, T } = ctx;
    const vals = values.filter((v) => v !== null && isFinite(v));
    let min = vals.length ? Math.min(...vals) : 0, max = vals.length ? Math.max(...vals) : 1;
    let stops;
    if (S.scale === 'div') {
      const c = N(S.center) || 0;
      const r = Math.max(Math.abs(max - c), Math.abs(c - min)) || 1;
      min = c - r; max = c + r;
      stops = GG.color.diverging(S.pair, ctx.mode);
    } else {
      stops = GG.color.sequential(S.hue || 'blue', ctx.mode);
    }
    if (min === max) max = min + 1;
    const f = Object.assign({ c: true }, ctx.f);
    const vm = {
      type: 'continuous', min, max, calculable: false, orient: 'horizontal', right: 16, bottom: ctx.layout.bottom - 6,
      itemWidth: 10, itemHeight: Math.min(180, ctx.W * 0.3), text: [ctx.R.fmt(max, f), ctx.R.fmt(min, f)], textGap: 6,
      textStyle: { color: T.muted, fontSize: 11, fontFamily: GG.FONT }, inRange: { color: stops }, dimension: opts && opts.dim, seriesIndex: opts && opts.seriesIndex,
      show: !(opts && opts.hide)
    };
    if (!(opts && opts.hide)) ctx.layout.bottom += 34;
    return { vm, colorOf: (v) => lerpColor(stops, (v - min) / (max - min)), stops, min, max };
  }

  // ================================================================ HISTOGRAMA
  B.register({
    id: 'histogram', name: 'Histograma', group: 'Distribuição', shape: 'columns',
    roles: ['Medições (uma coluna)'],
    hint: 'Forma da distribuição. Com limites de especificação, mostra Cp e Cpk (capabilidade).',
    hl: 'none', annot: false,
    settings: [
      { k: 'bins', l: 'Número de classes', t: 'number', d: '', ph: 'auto' },
      { k: 'normal', l: 'Curva normal ajustada', t: 'toggle', d: true },
      { k: 'stats', l: 'Estatísticas no topo', t: 'toggle', d: true },
      { k: 'lsl', l: 'Especificação inferior (LIE)', t: 'number', d: '' },
      { k: 'usl', l: 'Especificação superior (LSE)', t: 'number', d: '' },
      { k: 'target', l: 'Alvo', t: 'number', d: '' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const g = B.columnsSamples(ctx)[0] || { values: [], name: '' };
      const v = g.values;
      const bins = ST.niceBins(v, parseInt(S.bins, 10) || undefined);
      const m = ST.mean(v), sd = ST.sd(v);
      const lsl = N(S.lsl), usl = N(S.usl), tgt = N(S.target);
      const col = ctx.color(0);
      const graphic = [];
      if (S.stats && v.length) {
        const parts = ['n ' + v.length, 'média ' + ctx.fmt(m, { d: 2 }), 'σ ' + ctx.fmt(sd, { d: 2, p: '', s: '' })];
        if (lsl !== null && usl !== null && sd) parts.push('Cp ' + ctx.R.fmt((usl - lsl) / (6 * sd), { d: 2 }));
        if ((lsl !== null || usl !== null) && sd) parts.push('Cpk ' + ctx.R.fmt(Math.min(usl !== null ? (usl - m) / (3 * sd) : Infinity, lsl !== null ? (m - lsl) / (3 * sd) : Infinity), { d: 2 }));
        graphic.push({ type: 'text', left: 16, top: ctx.layout.top - 4, style: { text: parts.join('   ·   '), fill: T.ink2, font: '12px ' + GG.FONT } });
        ctx.layout.top += 22;
      }
      const step = bins.length ? bins[0].x1 - bins[0].x0 : 1;
      const xs = [bins.length ? bins[0].x0 : 0, bins.length ? bins[bins.length - 1].x1 : 1].concat([lsl, usl, tgt].filter((x) => x !== null));
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const pad = (x1 - x0) * 0.03;
      const lines = [];
      if (lsl !== null || usl !== null || tgt !== null) ctx.layout.top += 16;
      if (lsl !== null) lines.push({ xAxis: lsl, label: { formatter: 'LIE ' + ctx.fmt(lsl) }, lineStyle: { color: GG.tokens.STATUS.critical, type: [5, 4] } });
      if (usl !== null) lines.push({ xAxis: usl, label: { formatter: 'LSE ' + ctx.fmt(usl) }, lineStyle: { color: GG.tokens.STATUS.critical, type: [5, 4] } });
      if (tgt !== null) lines.push({ xAxis: tgt, label: { formatter: 'Alvo ' + ctx.fmt(tgt) }, lineStyle: { color: T.ink, type: 'solid' } });
      const series = [{
        type: 'custom', name: g.name, renderItem: ctx.fn('rHist', {}), encode: { x: [0, 1], y: 2 }, color: col,
        data: bins.map((b) => ({ name: ctx.fmt(b.x0) + ' – ' + ctx.fmt(b.x1), value: [b.x0, b.x1, b.n], itemStyle: { color: col } })),
        tooltip: { formatter: ctx.fn('tipItem', { c: ctx.c, rows: [{ l: 'ocorrências', d: 2, f: { d: 0 } }] }) },
        markLine: lines.length ? { silent: true, symbol: 'none', label: { position: 'end', color: T.ink2, fontSize: 11, fontFamily: GG.FONT }, data: lines } : undefined
      }];
      if (S.normal && sd > 0) {
        const pts = [];
        for (let i = 0; i <= 80; i++) { const x = x0 - pad + (x1 - x0 + 2 * pad) * i / 80; pts.push([x, v.length * step * Math.exp(-0.5 * ((x - m) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))]); }
        series.push({ type: 'line', name: 'Normal ajustada', data: pts, symbol: 'none', smooth: true, lineStyle: { width: 1.5, color: T.ink2 }, silent: true, z: 4, tooltip: { show: false } });
      }
      return {
        option: {
          graphic, grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: B.valueAxis(ctx, { min: +(x0 - pad).toPrecision(6), max: +(x1 + pad).toPrecision(6), splitLine: { show: false }, axisLine: { show: true, lineStyle: { color: T.axis } }, name: S.xName || g.name, nameLocation: 'middle', nameGap: 26 }),
          yAxis: B.valueAxis(ctx, { axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: { d: 0 } }) }, minInterval: 1 }),
          series
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ BOXPLOT
  B.register({
    id: 'boxplot', name: 'Boxplot (caixa)', group: 'Distribuição', shape: 'columns',
    roles: ['Grupo A (uma coluna de medições)', 'Grupo B', '…'],
    hint: 'Compara distribuições entre grupos: mediana, quartis e valores atípicos.',
    hl: 'categories', annot: true,
    settings: [
      { k: 'orientation', l: 'Orientação', t: 'seg', o: [['v', 'Vertical'], ['h', 'Horizontal']], d: 'v' },
      { k: 'sortBy', l: 'Ordenar grupos', t: 'select', o: [['none', 'Ordem dos dados'], ['median', 'Pela mediana']], d: 'none' },
      { k: 'points', l: 'Mostrar todos os pontos', t: 'toggle', d: false },
      { k: 'mean', l: 'Marcar a média (◆)', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      let groups = B.columnsSamples(ctx).map((g) => ({ ...g, st: ST.boxStats(g.values) }));
      if (S.sortBy === 'median') groups = groups.slice().sort((a, b) => b.st.median - a.st.median);
      const names = groups.map((g) => g.name);
      const horiz = S.orientation === 'h';
      const colOf = (g) => (ctx.hiOn ? (ctx.isHi(g.name) ? ctx.accentColor(0) : T.muted) : ctx.color(0));
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLine: { show: false } } : {});
      if (S.points) catAx.jitter = 18;
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true });
      const series = [{
        type: 'boxplot', name: 'Distribuição', boxWidth: [10, 34],
        data: groups.map((g) => ({ name: g.name, value: [g.st.min, g.st.q1, g.st.median, g.st.q3, g.st.max], itemStyle: { color: hexA(colOf(g), 0.14), borderColor: colOf(g), borderWidth: 1.5 } })),
        tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: 'mediana', d: 3 }, { l: 'Q1 – Q3 (50% central)', d: 2 }, { l: 'Q3', d: 4 }, { l: 'mínimo', d: 1 }, { l: 'máximo', d: 5 }] }) },
        emphasis: { itemStyle: { borderWidth: 2 } }
      }];
      const outl = [];
      groups.forEach((g, k) => g.st.outliers.forEach((o) => outl.push(horiz ? [o, g.name] : [g.name, o])));
      series.push({ type: 'scatter', name: 'Atípicos', symbolSize: 7, data: outl, itemStyle: { color: T.surface, borderColor: T.ink2, borderWidth: 1.5 }, tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: 's', rows: [{ l: '', d: horiz ? 0 : 1 }] }) } });
      if (S.points) {
        const pts = [];
        groups.forEach((g) => g.values.forEach((v) => pts.push({ value: horiz ? [v, g.name] : [g.name, v], itemStyle: { color: hexA(colOf(g), 0.55) } })));
        series.push({ type: 'scatter', name: 'Observações', symbolSize: 5, data: pts, z: 1, silent: true });
      }
      if (S.mean) {
        series.push({ type: 'custom', name: 'Média', renderItem: ctx.fn('rMark', { shape: 'diamond', h: horiz, color: T.ink, surface: T.surface, size: 5 }),
          encode: horiz ? { x: 1, y: 0 } : { x: 0, y: 1 }, data: groups.map((g, k) => ({ name: g.name, value: [k, g.st.mean] })), z: 5,
          tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: 'n', rows: [{ l: 'média', d: 1 }] }) } });
      }
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx, series
        },
        meta: { valueAxis: horiz ? 'x' : 'y' }
      };
    }
  });

  // ================================================================ DISPERSÃO EM FAIXAS (strip / beeswarm)
  B.register({
    id: 'strip', name: 'Pontos por grupo (strip)', group: 'Distribuição', shape: 'columns',
    roles: ['Grupo A (uma coluna de medições)', 'Grupo B', '…'],
    hint: 'Todos os pontos à vista, com a mediana marcada — honesto para amostras pequenas.',
    hl: 'categories', annot: true,
    settings: [
      { k: 'orientation', l: 'Orientação', t: 'seg', o: [['h', 'Horizontal'], ['v', 'Vertical']], d: 'h' },
      { k: 'swarm', l: 'Evitar sobreposição (enxame)', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const groups = B.columnsSamples(ctx);
      const names = groups.map((g) => g.name);
      const horiz = S.orientation === 'h';
      const plotLen = horiz ? (ctx.H - ctx.layout.top - ctx.layout.bottom) : (ctx.W - 80);
      const band = plotLen / Math.max(names.length, 1);
      const catAx = B.catAxis(ctx, names, Object.assign({ jitter: Math.max(6, band * 0.34), jitterOverlap: !S.swarm, jitterMargin: 1.5 }, horiz ? { inverse: true, axisLine: { show: false } } : {}));
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true });
      const colOf = (n) => (ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(0) : T.deemph) : ctx.color(0));
      const pts = [];
      groups.forEach((g) => g.values.forEach((v) => pts.push({ name: g.name, value: horiz ? [v, g.name] : [g.name, v], itemStyle: { color: colOf(g.name), opacity: 0.8, borderColor: T.surface, borderWidth: 1 } })));
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx,
          series: [
            { type: 'scatter', name: 'Observações', symbolSize: 8, data: pts, tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: '', d: horiz ? 0 : 1 }] }) } },
            { type: 'custom', name: 'Mediana', renderItem: ctx.fn('rMark', { shape: 'bar', h: horiz, color: T.ink, size: Math.min(band * 0.4, 26) }), z: 5,
              encode: horiz ? { x: 1, y: 0 } : { x: 0, y: 1 },
              data: groups.map((g, k) => ({ name: g.name, value: [k, ST.quantile(ST.sorted(g.values), 0.5)],
                label: S.labels !== 'none' ? { show: true } : undefined })),
              tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: 'n', rows: [{ l: 'mediana', d: 1 }] }) } }
          ]
        },
        meta: { valueAxis: horiz ? 'x' : 'y', annotSeries: 0 }
      };
    }
  });

  // ================================================================ VIOLINO
  B.register({
    id: 'violin', name: 'Violino (densidade)', group: 'Distribuição', shape: 'columns',
    roles: ['Grupo A (uma coluna de medições)', 'Grupo B', '…'],
    hint: 'Forma da distribuição por grupo (bimodalidade que o boxplot esconde), com caixa interna.',
    hl: 'categories', annot: true,
    settings: [{ k: 'orientation', l: 'Orientação', t: 'seg', o: [['v', 'Vertical'], ['h', 'Horizontal']], d: 'v' }],
    build(ctx) {
      const { T, S } = ctx;
      const groups = B.columnsSamples(ctx);
      const names = groups.map((g) => g.name);
      const horiz = S.orientation === 'h';
      const shapes = groups.map((g) => { const k = ST.kde(g.values, 60); const mx = Math.max(...k.map((p) => p[1]), 1e-12); return k.map((p) => [+p[0].toPrecision(6), +(p[1] / mx).toFixed(4)]); });
      const cols = groups.map((g) => (ctx.hiOn ? (ctx.isHi(g.name) ? ctx.accentColor(0) : T.muted) : ctx.color(0)));
      const all = shapes.flat().map((p) => p[0]);
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLine: { show: false } } : {});
      const lo = Math.min(...all), hi = Math.max(...all);
      const stp = Math.pow(10, Math.floor(Math.log10((hi - lo) || 1)));
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx, { min: Math.floor(lo / stp) * stp, max: Math.ceil(hi / stp) * stp }));
      const st = groups.map((g) => ST.boxStats(g.values));
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx,
          series: [
            { type: 'custom', name: 'Densidade', renderItem: ctx.fn('rViolin', { shapes, colors: cols, h: horiz }), encode: horiz ? { y: 0 } : { x: 0 }, data: groups.map((g, k) => ({ name: g.name, value: [k] })), silent: true },
            { type: 'boxplot', name: 'Quartis', boxWidth: [5, 7], z: 3,
              data: st.map((s, k) => ({ name: names[k], value: [s.q1, s.q1, s.median, s.q3, s.q3], itemStyle: { color: T.ink2, borderColor: T.ink2, borderWidth: 1 } })),
              tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: 'mediana', d: 3 }, { l: 'Q1', d: 2 }, { l: 'Q3', d: 4 }] }) } },
            { type: 'custom', name: 'Mediana', renderItem: ctx.fn('rMark', { shape: 'dot', h: horiz, color: T.surface, size: 3 }), encode: horiz ? { x: 1, y: 0 } : { x: 0, y: 1 }, z: 6, silent: true,
              data: st.map((s, k) => [k, s.median]) }
          ]
        },
        meta: { valueAxis: horiz ? 'x' : 'y', annotSeries: 1 }
      };
    }
  });

  // ================================================================ ECDF (acumulada)
  B.register({
    id: 'ecdf', name: 'Distribuição acumulada', group: 'Distribuição', shape: 'columns',
    roles: ['Grupo A (uma coluna de medições)', 'Grupo B', '…'],
    hint: '"Que % fica abaixo de X?" — lê percentis direto (ex.: 90% das entregas em até 3 dias).',
    hl: 'series', annot: true,
    settings: [],
    build(ctx) {
      const { T, S } = ctx;
      const groups = B.columnsSamples(ctx);
      const legend = B.legendNeeded(ctx, groups.length) ? B.legend(ctx, groups.map((g) => g.name), { icon: undefined }) : undefined;
      const series = groups.map((g) => {
        const s = ST.sorted(g.values);
        const col = ctx.pick(g.name, g.idx);
        const pts = s.map((v, i) => [v, (i + 1) / s.length * 100]);
        // sem rótulo no fim: todas as curvas terminam em 100% e os rótulos colidiriam — a legenda identifica
        return { type: 'line', name: g.name, step: 'end', symbol: 'none', color: col, lineStyle: { width: 2, color: col }, data: [[s[0], 0]].concat(pts) };
      });
      if (!ctx.S.annotations.refs.some((r) => N(r.v) === 50)) ctx.S.annotations.refs = ctx.S.annotations.refs.concat([{ axis: 'val', v: 50, label: 'Mediana' }]);
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { c: ctx.c, h: 's', rows: [{ l: 'ou menos', d: 0, f: ctx.f }, { l: 'das observações', d: 1, f: { d: 0, s: '%' } }] }) }),
          xAxis: B.applyValueRange(ctx, B.valueAxis(ctx, { scale: true, name: S.xName, nameLocation: 'middle', nameGap: 26 })),
          yAxis: B.valueAxis(ctx, { min: 0, max: 100, interval: 25, axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: { d: 0, s: '%' } }) } }),
          series
        },
        meta: { valueAxis: 'y', catIsValue: true, valFmt: { d: 0, s: '%' } }
      };
    }
  });

  // ================================================================ DISPERSÃO / BOLHAS
  B.register({
    id: 'scatter', name: 'Dispersão / bolhas', group: 'Relação', shape: 'wide',
    roles: ['X (número)', 'Y (número)', 'Tamanho (opc.)', 'Grupo (opc.)', 'Rótulo (opc.)'],
    hint: 'Relação entre duas medidas. Até 3 grupos de cor; tendência e quadrantes ajudam a contar a história.',
    hl: 'points', annot: true,
    settings: [
      { k: 'sizeCol', l: 'Coluna de tamanho (bolhas)', t: 'column', d: '' },
      { k: 'groupCol', l: 'Coluna de grupo (cor)', t: 'column', d: '' },
      { k: 'labelCol', l: 'Coluna de rótulo', t: 'column', d: '' },
      { k: 'trend', l: 'Linha de tendência (regressão linear)', t: 'toggle', d: false },
      { k: 'quad', l: 'Quadrantes', t: 'select', o: [['none', 'Sem quadrantes'], ['mean', 'Divididos pela média'], ['median', 'Divididos pela mediana'], ['custom', 'Valores definidos']], d: 'none' },
      { k: 'qx', l: 'Divisão em X', t: 'number', d: '' },
      { k: 'qy', l: 'Divisão em Y', t: 'number', d: '' },
      { k: 'q1', l: 'Quadrante ↗ (alto X, alto Y)', t: 'text', d: '' },
      { k: 'q2', l: 'Quadrante ↖ (baixo X, alto Y)', t: 'text', d: '' },
      { k: 'q3', l: 'Quadrante ↙ (baixo X, baixo Y)', t: 'text', d: '' },
      { k: 'q4', l: 'Quadrante ↘ (alto X, baixo Y)', t: 'text', d: '' },
      { k: 'logX', l: 'Escala log em X', t: 'toggle', d: false },
      { k: 'logY', l: 'Escala log em Y', t: 'toggle', d: false }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const ci = (k) => { const v = S[k]; if (v === '' || v === null || v === undefined) return -1; const n = parseInt(v, 10); return isNaN(n) || n >= t.columns.length ? -1 : n; };
      const sc = ci('sizeCol'), gc = ci('groupCol'), lc = ci('labelCol');
      const pts = t.rows.map((r) => ({ x: N(r[0]), y: N(r[1]), s: sc >= 0 ? N(r[sc]) : null, g: gc >= 0 ? String(r[gc]) : '', l: lc >= 0 ? String(r[lc]) : '' }))
        .filter((p) => p.x !== null && p.y !== null && (!S.logX || p.x > 0) && (!S.logY || p.y > 0));
      const groups = [];
      pts.forEach((p) => { if (groups.indexOf(p.g) < 0) groups.push(p.g); });
      const multi = groups.length > 1;
      const legend = multi && B.legendNeeded(ctx, groups.length) ? B.legend(ctx, groups, { icon: 'circle', itemWidth: 10, itemHeight: 10 }) : undefined;
      const sizes = pts.map((p) => p.s).filter((v) => v !== null);
      const symSize = sc >= 0 && sizes.length ? ctx.fn('symSize', { dim: 2, min: Math.min(...sizes), max: Math.max(...sizes), r0: 8, r1: 46 }) : 10;
      const byY = pts.slice().sort((a, b) => b.y - a.y);
      const topSet = new Set(byY.slice(0, 3).concat(pts.slice().sort((a, b) => b.x - a.x).slice(0, 2)));
      const hiPoint = (p) => ctx.isHi(p.l) || ctx.isHi(p.g);
      const series = [];
      groups.forEach((g, gi) => {
        const col = ctx.hiOn && !groups.some((x) => ctx.isHi(x)) ? ctx.color(gi) : ctx.pick(g, gi);
        const data = pts.filter((p) => p.g === g).map((p) => {
          const item = { name: p.l || (multi ? g : ''), value: [p.x, p.y, p.s === null ? 1 : p.s] };
          let c = col;
          if (ctx.hiOn && lc >= 0 && !groups.some((x) => ctx.isHi(x))) c = hiPoint(p) ? ctx.accentColor(gi) : T.deemph;
          item.itemStyle = { color: hexA(c, sc >= 0 ? 0.72 : 0.88), borderColor: T.surface, borderWidth: sc >= 0 ? 1.5 : 2 };
          const show = S.labels === 'all' ? !!p.l : S.labels === 'smart' ? !!p.l && (ctx.hiOn ? hiPoint(p) : topSet.has(p)) : false;
          if (show) item.label = { show: true, formatter: p.l.replace(/[{}]/g, ''), position: 'right', distance: 6, color: T.ink2, fontSize: 11, fontFamily: GG.FONT };
          if (ctx.hiOn && hiPoint(p)) item.z = 5;
          return item;
        });
        series.push({ type: 'scatter', name: g || (t.columns[1] || 'Pontos'), data, symbolSize: symSize, color: col, labelLayout: { hideOverlap: true }, z: 3,
          emphasis: { focus: multi ? 'series' : 'none', itemStyle: { borderColor: T.ink, borderWidth: 1.5 } }, blur: { itemStyle: { opacity: 0.2 } },
          tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: multi ? 'sn' : 'n', rows: [{ l: t.columns[1] || 'Y', d: 1 }, { l: t.columns[0] || 'X', d: 0 }].concat(sc >= 0 ? [{ l: t.columns[sc], d: 2 }] : []) }) } });
      });
      // camada de alvo (≥ 24px) para o hover: invisível, mesmo nome da série
      if (pts.length <= 1500 && !ctx.thumb) {
        series.slice().forEach((s) => series.push({ type: 'scatter', name: s.name, data: s.data.map((d) => ({ name: d.name, value: d.value })), symbolSize: 26, z: 6,
          itemStyle: { color: 'rgba(0,0,0,0)' }, emphasis: { itemStyle: { color: 'rgba(0,0,0,0)', borderColor: T.ink2, borderWidth: 1 } }, tooltip: s.tooltip, legendHoverLink: false }));
      }
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const extra = { type: 'scatter', name: '__all', symbolSize: 0, silent: true, data: pts.map((p) => [p.x, p.y]), tooltip: { show: false } };
      if (S.trend && pts.length > 2) {
        const lr = ST.linreg(S.logX ? xs.map(Math.log10) : xs, S.logY ? ys.map(Math.log10) : ys);
        const mnx = Math.min(...xs), mxx = Math.max(...xs);
        const yAt = (x) => { const xx = S.logX ? Math.log10(x) : x; const yy = lr.a + lr.b * xx; return S.logY ? Math.pow(10, yy) : yy; };
        const line = [];
        for (let i = 0; i <= 20; i++) { const x = S.logX ? Math.pow(10, Math.log10(mnx) + (Math.log10(mxx) - Math.log10(mnx)) * i / 20) : mnx + (mxx - mnx) * i / 20; line.push([x, yAt(x)]); }
        series.push({ type: 'line', name: 'Tendência', data: line, symbol: 'none', silent: true, lineStyle: { color: T.ink2, width: 1.5, type: [6, 4] }, z: 2,
          endLabel: { show: true, formatter: ('R² ' + ctx.R.fmt(lr.r2, { d: 2 })).replace(/[{}]/g, ''), color: T.ink2, fontSize: 11 }, tooltip: { show: false } });
        ctx.layout.right = Math.max(ctx.layout.right, 60);
      }
      if (S.quad !== 'none' && pts.length) {
        const sx = ST.sorted(xs), sy = ST.sorted(ys);
        const qx = S.quad === 'custom' ? N(S.qx) : S.quad === 'median' ? ST.quantile(sx, 0.5) : ST.mean(xs);
        const qy = S.quad === 'custom' ? N(S.qy) : S.quad === 'median' ? ST.quantile(sy, 0.5) : ST.mean(ys);
        if (qx !== null && qy !== null) {
          extra.markLine = { silent: true, symbol: 'none', lineStyle: { color: T.ink2, width: 1, type: [4, 3] }, label: { show: false }, data: [{ xAxis: qx }, { yAxis: qy }] };
          const lab = (txt, pos) => ({ show: !!txt, position: pos, color: T.ink2, fontSize: 12, fontWeight: 600, fontFamily: GG.FONT, formatter: String(txt || '').replace(/[{}]/g, ''), distance: 4, backgroundColor: T.surface, padding: [2, 4], borderRadius: 3 });
          extra.markArea = { silent: true, itemStyle: { color: 'rgba(0,0,0,0)' }, data: [
            [{ coord: [qx, qy], label: lab(S.q1, 'insideTopRight') }, { coord: ['max', 'max'] }],
            [{ coord: ['min', qy], label: lab(S.q2, 'insideTopLeft') }, { coord: [qx, 'max'] }],
            [{ coord: ['min', 'min'], label: lab(S.q3, 'insideBottomLeft') }, { coord: [qx, qy] }],
            [{ coord: [qx, 'min'], label: lab(S.q4, 'insideBottomRight') }, { coord: ['max', qy] }]
          ] };
        }
      }
      series.unshift(extra);
      const xName = S.xName || t.columns[0] || '', yName = S.yName || t.columns[1] || '';
      ctx.layout.bottom += 18;
      const xAx = B.valueAxis(ctx, { type: S.logX ? 'log' : 'value', scale: true, name: xName, nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT }, splitLine: { show: true, lineStyle: { color: T.grid } } });
      const yAx = B.valueAxis(ctx, { type: S.logY ? 'log' : 'value', scale: true, name: yName, nameLocation: 'end', nameGap: 12, nameTextStyle: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT, align: 'left' } });
      B.applyValueRange(ctx, yAx);
      return {
        option: { grid: B.grid(ctx), legend, tooltip: B.tooltip(ctx, { trigger: 'item' }), xAxis: xAx, yAxis: yAx, series },
        meta: { valueAxis: 'y', annotSeries: 0, catIsValue: true, pairs: 'all', groups: groups.length }
      };
    }
  });

  // ================================================================ MAPA DE CALOR (matriz)
  B.register({
    id: 'heatmap', name: 'Mapa de calor (matriz)', group: 'Relação', shape: 'wide',
    roles: ['Linha', 'Coluna A (valor)', 'Coluna B', '…'],
    hint: 'Padrões numa grade (dia × hora, coorte × mês, correlações). Sequencial para magnitude; divergente se o zero importa.',
    hl: 'none', annot: false,
    settings: SCALE_SETTINGS.concat([{ k: 'xTop', l: 'Rótulos das colunas no topo', t: 'toggle', d: false }]),
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const cols = series.map((s) => s.name);
      const data = [];
      series.forEach((s, x) => s.values.forEach((v, y) => { if (v !== null) data.push([x, y, v]); }));
      const cs = colorScale(ctx, data.map((d) => d[2]));
      const L = ctx.layout;
      if (S.xTop) { L.top += 22; }
      const plotW = ctx.W - 140, plotH = ctx.H - L.top - L.bottom - 30;
      const cellW = plotW / Math.max(cols.length, 1), cellH = plotH / Math.max(cats.length, 1);
      const f = ctx.f;
      const showLbl = S.labels === 'all' || (S.labels === 'smart' && cellW > 34 && cellH > 18);
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f, c: ctx.c, noKey: false, rows: [{ l: '', d: 2 }] }) }),
          xAxis: B.catAxis(ctx, cols, { position: S.xTop ? 'top' : 'bottom', axisLine: { show: false }, splitArea: { show: false }, axisLabel: { color: T.muted, fontSize: 11, interval: cellW < 26 ? 'auto' : 0, hideOverlap: true } }),
          yAxis: B.catAxis(ctx, cats, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, interval: cellH < 14 ? 'auto' : 0 } }),
          visualMap: cs.vm,
          series: [{
            type: 'heatmap', name: 'Valores',
            data: data.map((d) => {
              const col = cs.colorOf(d[2]);
              return { name: cats[d[1]] + ' · ' + cols[d[0]], value: d, label: showLbl ? { show: true, color: GG.color.inkOn(col), fontSize: 11, fontFamily: GG.FONT, formatter: ctx.fn('label', { f, dim: 2 }) } : undefined };
            }),
            itemStyle: { borderColor: T.surface, borderWidth: cellW > 8 && cellH > 8 ? 2 : 0, borderRadius: 2 },
            emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 1.5 } }
          }]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ CALENDÁRIO
  B.register({
    id: 'calendar', name: 'Calendário (dia a dia)', group: 'Tempo', shape: 'wide',
    roles: ['Data (aaaa-mm-dd)', 'Valor'],
    hint: 'Ritmos diários e semanais ao longo do ano (vendas, acessos, incidentes).',
    hl: 'none', annot: false,
    settings: SCALE_SETTINGS.slice(0, 2).concat([{ k: 'weekStart', l: 'Semana começa', t: 'seg', o: [['1', 'Segunda'], ['0', 'Domingo']], d: '1' }]),
    build(ctx) {
      const { T, S, W } = ctx;
      const rows = ctx.data.rows.map((r) => ({ d: GG.data.toDate(r[0]), v: N(r[1]) })).filter((x) => x.d && x.v !== null);
      const years = [...new Set(rows.map((r) => r.d.getFullYear()))].sort().slice(-3);
      const cs = colorScale(ctx, rows.map((r) => r.v));
      const L = ctx.layout;
      const availH = ctx.H - L.top - L.bottom;
      const cell = Math.max(6, Math.min((W - 90) / 54, (availH / years.length - 34) / 7));
      const cals = years.map((y, i) => ({
        range: String(y), top: L.top + 22 + i * (cell * 7 + 40), left: 56, cellSize: [cell, cell], orient: 'horizontal',
        splitLine: { show: false }, itemStyle: { color: T.surface2, borderColor: T.surface, borderWidth: 2 },
        yearLabel: { show: years.length > 1, position: 'left', margin: 36, color: T.ink2, fontSize: 12, fontFamily: GG.FONT },
        dayLabel: { firstDay: +S.weekStart, nameMap: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'], color: T.muted, fontSize: 10, margin: 6 },
        monthLabel: { nameMap: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], color: T.muted, fontSize: 11, margin: 6, fontFamily: GG.FONT }
      }));
      return {
        option: {
          calendar: cals, visualMap: cs.vm,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipCal', { f: ctx.f, c: ctx.c }) }),
          series: years.map((y, i) => ({
            type: 'heatmap', coordinateSystem: 'calendar', calendarIndex: i, name: String(y),
            data: rows.filter((r) => r.d.getFullYear() === y).map((r) => [GG.data.iso(r.d), r.v]),
            itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: 2 },
            emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 1 } }
          }))
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ LISTRAS (warming stripes)
  B.register({
    id: 'stripes', name: 'Listras de anomalia', group: 'Tempo', shape: 'wide',
    roles: ['Período', 'Anomalia (desvio da média)'],
    hint: 'Uma faixa de cor por período, divergindo de uma referência. Impacto imediato, leitura grosseira.',
    hl: 'none', annot: false,
    settings: [
      { k: 'pair', l: 'Polos (divergente)', t: 'select', o: Object.keys(GG.tokens.DIV_PAIRS).map((k) => [k, GG.tokens.DIV_PAIRS[k].name]), d: 'blue-red' },
      { k: 'center', l: 'Referência (centro)', t: 'number', d: 0 },
      { k: 'showAxis', l: 'Mostrar anos no eixo', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const s = series[0] || { values: [] };
      S.scale = 'div';
      const cs = colorScale(ctx, s.values);
      return {
        option: {
          grid: B.grid(ctx, { outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' }),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f: Object.assign({ sg: true }, ctx.f), c: ctx.c, rows: [{ l: '', d: 2 }] }) }),
          xAxis: B.catAxis(ctx, cats, { axisLine: { show: false }, axisLabel: { show: !!S.showAxis, color: T.muted, fontSize: 11, hideOverlap: true } }),
          yAxis: { type: 'category', data: [''], show: false },
          visualMap: cs.vm,
          series: [{ type: 'heatmap', name: s.name, data: s.values.map((v, i) => ({ name: cats[i], value: [i, 0, v] })).filter((d) => d.value[2] !== null), itemStyle: { borderWidth: 0 }, emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 1 } } }]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ COORDENADAS PARALELAS
  B.register({
    id: 'parallel', name: 'Coordenadas paralelas', group: 'Relação', shape: 'wide',
    roles: ['Item', 'Dimensão A', 'Dimensão B', '…'],
    hint: 'Muitos atributos de muitos itens: perfis, trade-offs. Destaque 1–3 itens.',
    hl: 'categories', annot: false,
    settings: [],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const dims = t.columns.slice(1);
      const L = ctx.layout;
      const items = t.rows.map((r) => ({ name: String(r[0]), v: dims.map((_, j) => N(r[j + 1])) }));
      const ordered = items.slice().sort((a, b) => (ctx.isHi(a.name) ? 1 : 0) - (ctx.isHi(b.name) ? 1 : 0));
      return {
        option: {
          parallel: { left: 40, right: 60, top: L.top + 30, bottom: L.bottom + 6, parallelAxisDefault: {
            type: 'value', nameLocation: 'end', nameGap: 12, nameTextStyle: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT, fontWeight: 600, width: 90, overflow: 'break' },
            axisLine: { lineStyle: { color: T.axis } }, axisTick: { show: false }, axisLabel: { color: T.muted, fontSize: 10, formatter: ctx.fn('axis', { f: { c: true } }) }, splitLine: { show: false } } },
          parallelAxis: dims.map((d, j) => ({ dim: j, name: d, inverse: false, scale: true })),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipText', { tpl: '{s}', c: ctx.c }) }),
          series: ordered.map((it) => {
            const hi = !ctx.hiOn || ctx.isHi(it.name);
            const col = ctx.hiOn ? (hi ? ctx.accentColor(items.indexOf(it) % 8) : T.deemph) : ctx.color(0);
            return { type: 'parallel', name: it.name, data: [it.v], smooth: false, lineStyle: { width: hi && ctx.hiOn ? 2.5 : 1.5, color: col, opacity: ctx.hiOn ? (hi ? 1 : 0.7) : 0.55 },
              emphasis: { lineStyle: { width: 3, opacity: 1 } }, z: hi ? 3 : 2 };
          })
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ RADAR
  B.register({
    id: 'radar', name: 'Radar', group: 'Comparação', shape: 'wide',
    roles: ['Dimensão (eixo)', 'Item A', 'Item B (opc.)', '…'],
    hint: 'Perfil multidimensional de 1–3 itens. A área distorce: para comparações precisas, use barras.',
    hl: 'series', annot: false,
    settings: [
      { k: 'max', l: 'Máximo comum dos eixos', t: 'number', d: '', ph: 'auto por eixo' },
      { k: 'shape', l: 'Forma', t: 'seg', o: [['polygon', 'Polígono'], ['circle', 'Círculo']], d: 'polygon' }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const { cats, series } = B.wide(ctx);
      const common = N(S.max);
      const legend = B.legendNeeded(ctx, series.length) ? B.legend(ctx, series.map((s) => s.name)) : undefined;
      const L = ctx.layout;
      const areaH = H - L.top - L.bottom;
      const r = Math.max(40, Math.min(W / 2 - 90, areaH / 2 - 26));
      return {
        option: {
          legend,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipRadar', { f: ctx.f, c: ctx.c, dims: cats }) }),
          radar: {
            center: ['50%', L.top + areaH / 2], radius: r, shape: S.shape, splitNumber: 4,
            indicator: cats.map((c, i) => ({ name: c, max: common !== null ? common : Math.max(...series.map((s) => s.values[i] || 0)) * 1.1 || 1 })),
            axisName: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT },
            splitLine: { lineStyle: { color: T.grid } }, splitArea: { show: false }, axisLine: { lineStyle: { color: T.grid } }
          },
          series: [{
            type: 'radar', name: 'Perfis', symbol: 'circle', symbolSize: 7,
            data: series.map((s) => {
              const col = ctx.pick(s.name, s.idx);
              const dim = ctx.hiOn && !ctx.isHi(s.name);
              return { name: s.name, value: s.values, lineStyle: { width: 2, color: col }, itemStyle: B.ring(ctx, col), areaStyle: { color: col, opacity: dim ? 0.02 : 0.1 }, z: dim ? 1 : 2 };
            }),
            emphasis: { lineStyle: { width: 3 } }
          }]
        },
        meta: { annot: false }
      };
    }
  });

  B.helpersDist = { colorScale, lerpColor, hexA, SCALE_SETTINGS };
})(window.GG = window.GG || {});
