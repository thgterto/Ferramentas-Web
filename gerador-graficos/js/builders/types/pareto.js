/**
 * Graficário — tipo de gráfico `pareto`: Pareto (curva ABC).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'pareto', name: 'Pareto (curva ABC)', group: 'Qualidade', shape: 'wide',
    family: 'tab', cartesian: true,
    roles: ['Causa / item', 'Ocorrências'],
    hint: 'Poucas causas explicam a maioria dos efeitos. Barras e acumulado no MESMO eixo (% do total) — sem eixo duplo.',
    hl: 'none', annot: true,
    settings: [{ k: 'cut', l: 'Linha de corte (%)', t: 'number', d: 80 }],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const s = series[0] || { values: [], name: 'Ocorrências' };
      const order = B.sortIdx(s.values, 'desc');
      const names = order.map((i) => cats[i]);
      const vals = order.map((i) => s.values[i] || 0);
      const total = vals.reduce((a, b) => a + b, 0) || 1;
      const share = vals.map((v) => v / total * 100);
      let acc = 0; const cum = share.map((v) => (acc += v));
      const cut = N(S.cut) || 80;
      const vital = cum.findIndex((c) => c >= cut);
      const legend = B.legend(ctx, ['% do total', '% acumulado']);
      if (!ctx.S.annotations.refs.some((r) => N(r.v) === cut)) ctx.S.annotations.refs = ctx.S.annotations.refs.concat([{ axis: 'val', v: cut, label: 'Corte' }]);
      const pf = { s: '%', d: 0 };
      const band = (ctx.W - 90) / Math.max(names.length, 1);
      const rot = Math.max(...names.map((n) => Math.max(...String(n).split(/\s+/).map((w) => B.measure(w, 11))))) > band - 6 ? 35 : 0;
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: ctx.fn('tipAxis', { f: { s: '%', d: 1 }, c: ctx.c, showName: true, fs: { [s.name]: ctx.f } }) }),
          xAxis: B.catAxis(ctx, names, { axisLabel: { color: T.muted, fontSize: 11, interval: 0, rotate: rot, width: rot ? 110 : band - 6, overflow: rot ? 'truncate' : 'break' } }),
          yAxis: B.valueAxis(ctx, { min: 0, max: 100, interval: 20, axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: pf }) } }),
          series: [
            {
              type: 'bar', name: '% do total', barMaxWidth: 24, legendIcon: 'roundRect', color: ctx.color(0),
              data: share.map((v, k) => ({ value: v, itemStyle: { color: k <= vital ? ctx.color(0) : T.deemph, borderRadius: [4, 4, 0, 0] },
                label: S.labels === 'all' ? B.dataLabel(ctx, { position: 'top', formatter: ctx.fn('label', { f: pf }) }) : undefined }))
            },
            {
              type: 'line', name: '% acumulado', color: T.ink2, symbol: 'circle', symbolSize: 7, lineStyle: { width: 2, color: T.ink2 }, itemStyle: B.ring(ctx, T.ink2),
              data: cum.map((v, k) => ({ value: v, label: S.labels !== 'none' && k === vital ? B.dataLabel(ctx, { position: 'left', distance: 8, formatter: ctx.fn('label', { f: pf, tpl: '{v} com ' + (k + 1) + ' itens' }) }) : undefined }))
            },
            { type: 'line', name: s.name, data: vals, symbol: 'none', lineStyle: { opacity: 0 }, silent: true, clip: true }
          ]
        },
        meta: { valueAxis: 'y', annotSeries: 0, valFmt: pf }
      };
    }
  });
})(window.GG = window.GG || {});
