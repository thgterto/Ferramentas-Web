/**
 * Graficário — tipo de gráfico `pyramid`: Pirâmide / borboleta.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;

  B.register({
    id: 'pyramid', name: 'Pirâmide / borboleta', group: 'Distribuição', shape: 'wide',
    family: 'tab', cartesian: true,
    roles: ['Faixa', 'Grupo esquerdo', 'Grupo direito'],
    hint: 'Duas distribuições espelhadas (ex.: pirâmide etária por sexo).',
    hl: 'series', annot: false,
    settings: [{ k: 'asPct', l: 'Mostrar como % do total', t: 'toggle', d: false }],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const a = series[0], b = series[1] || series[0];
      if (!a) return { option: { series: [] } };
      const totAll = a.values.concat(b.values).reduce((x, y) => x + (y || 0), 0) || 1;
      const conv = (v) => (S.asPct ? (v || 0) / totAll * 100 : v);
      const f = S.asPct ? { d: 1, s: '%' } : ctx.f;
      const legend = B.legend(ctx, [a.name, b.name]);
      const ca = ctx.pick(a.name, 0), cb = ctx.pick(b.name, 1);
      const lbl = (right) => (S.labels === 'all' ? B.dataLabel(ctx, { position: right ? 'right' : 'left', formatter: ctx.fn('label', { f, abs: true }) }) : undefined);
      const m = Math.max(...a.values.concat(b.values).map((v) => Math.abs(conv(v) || 0)));
      if (S.labels === 'all') { ctx.layout.left = Math.max(ctx.layout.left, 40); ctx.layout.right = Math.max(ctx.layout.right, 44); }
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: B.tipAxis(ctx, { f, abs: true, showName: true }) }),
          xAxis: B.valueAxis(ctx, { min: -m * 1.05, max: m * 1.05, axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axisAbs', { f: Object.assign({ c: true }, f) }) } }),
          yAxis: B.catAxis(ctx, cats, { axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11 } }),
          series: [
            { type: 'bar', name: a.name, stack: 'p', barCategoryGap: '12%', color: ca, legendIcon: 'roundRect', data: a.values.map((v) => ({ value: -conv(v), itemStyle: { color: ca, borderRadius: [4, 0, 0, 4] }, label: lbl(false) })) },
            { type: 'bar', name: b.name, stack: 'p', color: cb, legendIcon: 'roundRect', data: b.values.map((v) => ({ value: conv(v), itemStyle: { color: cb, borderRadius: [0, 4, 4, 0] }, label: lbl(true) })) }
          ]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
