/**
 * Graficário — tipo de gráfico `diverging`: Barras divergentes.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { SORT, ORIENT, labelPos } = B.lib;

  B.register({
    id: 'diverging', name: 'Barras divergentes', group: 'Desvio', shape: 'wide',
    family: 'tab', cartesian: true,
    roles: ['Categoria', 'Valor (+/−)'],
    hint: 'Acima ou abaixo de uma referência (meta, média, zero). Dois matizes opostos, sem cor no meio.',
    hl: 'none', annot: true,
    settings: [
      ORIENT('h'), Object.assign({}, SORT, { d: 'desc' }),
      { k: 'pair', l: 'Cores (negativo ↔ positivo)', t: 'select', o: Object.keys(GG.tokens.DIV_PAIRS).map((k) => [k, GG.tokens.DIV_PAIRS[k].name]), d: 'red-blue' },
      { k: 'posLabel', l: 'Nome do lado positivo', t: 'text', d: 'Acima' },
      { k: 'negLabel', l: 'Nome do lado negativo', t: 'text', d: 'Abaixo' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const s = series[0] || { values: [] };
      const order = B.sortIdx(s.values, S.sort);
      const names = order.map((i) => cats[i]);
      const vals = order.map((i) => s.values[i]);
      const horiz = S.orientation === 'h';
      const cPos = GG.color.pole(S.pair, 'pos', ctx.mode), cNeg = GG.color.pole(S.pair, 'neg', ctx.mode);
      const smart = B.smartIdx(ctx, vals, names, { extremes: true, min: true });
      const mk = (pos) => vals.map((v, k) => {
        if (v === null || (pos ? v < 0 : v >= 0)) return null;
        const item = { value: v, itemStyle: { color: pos ? cPos : cNeg, borderRadius: B.barRadius(horiz, !pos) } };
        if (S.labels === 'all' || (S.labels === 'smart' && smart.has(k))) item.label = B.dataLabel(ctx, { position: labelPos(horiz, v), formatter: ctx.fn('label', { f: Object.assign({ sg: true }, ctx.f) }) });
        return item;
      });
      const legend = B.legend(ctx, [S.negLabel, S.posLabel]);
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } } : { axisLine: { show: false } });
      const valAx = B.valueAxis(ctx, { axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: Object.assign({ sg: true }, B.axisF(ctx.f)) }), hideOverlap: true } });
      const vv = vals.filter((v) => v !== null);
      const vmin = Math.min(0, ...vv), vmax = Math.max(0, ...vv);
      if (S.labels !== 'none') {
        // espaço para os rótulos nas duas pontas, proporcional ao texto
        const plotLen = horiz ? ctx.W * 0.6 : (ctx.H - ctx.layout.top - ctx.layout.bottom);
        const lw = horiz ? Math.max(...vv.map((v) => B.measure(ctx.fmt(v, { sg: true }), 11, 500))) + 10 : 20;
        const pad = Math.min(0.45, lw / Math.max(plotLen, 1)) * (vmax - vmin || 1);
        if (vmin < 0) valAx.min = +(vmin - pad).toPrecision(3);
        if (vmax > 0) valAx.max = +(vmax + pad).toPrecision(3);
      }
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: B.tipAxis(ctx, { f: Object.assign({ sg: true }, ctx.f) }) }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx,
          series: [
            { type: 'bar', name: S.negLabel, stack: 'd', data: mk(false), barMaxWidth: 22, color: cNeg, legendIcon: 'roundRect', markLine: { silent: true, symbol: 'none', data: [horiz ? { xAxis: 0 } : { yAxis: 0 }], lineStyle: { color: T.ink2, width: 1, type: 'solid' }, label: { show: false } } },
            { type: 'bar', name: S.posLabel, stack: 'd', data: mk(true), barMaxWidth: 22, color: cPos, legendIcon: 'roundRect' }
          ]
        },
        meta: { valueAxis: horiz ? 'x' : 'y', annotSeries: 1 }
      };
    }
  });
})(window.GG = window.GG || {});
