/**
 * Graficário — tipo de gráfico `histogram`: Histograma.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);
  const ST = GG.stats;

  B.register({
    id: 'histogram', name: 'Histograma', group: 'Distribuição', shape: 'columns',
    family: 'samples', cartesian: true,
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
})(window.GG = window.GG || {});
