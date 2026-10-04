/**
 * Graficário — tipo de gráfico `dumbbell`: Haltere (antes → depois).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;

  B.register({
    id: 'dumbbell', name: 'Haltere (antes → depois)', group: 'Comparação', shape: 'wide',
    family: 'tab', cartesian: true,
    roles: ['Item', 'Antes', 'Depois'],
    hint: 'Mudança entre dois momentos para cada item. Um matiz, dois tons.',
    hl: 'categories', annot: true,
    settings: [
      { k: 'sort', l: 'Ordenar', t: 'select', o: [['none', 'Ordem dos dados'], ['after', 'Pelo "depois"'], ['diff', 'Pela variação']], d: 'after' },
      { k: 'showDelta', l: 'Mostrar variação no rótulo', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const a = series[0] || { values: [], name: 'Antes' }, b = series[1] || series[0] || { values: [], name: 'Depois' };
      let order = cats.map((_, i) => i);
      if (S.sort === 'after') order = B.sortIdx(b.values, 'desc');
      if (S.sort === 'diff') order = B.sortIdx(cats.map((_, i) => (b.values[i] || 0) - (a.values[i] || 0)), 'desc');
      const names = order.map((i) => cats[i]);
      const hue = GG.tokens.THEMES[S.theme] ? GG.tokens.THEMES[S.theme].order[0] : 'blue';
      const ramp = GG.tokens.RAMPS[hue] || GG.tokens.RAMPS.blue;
      const cA = ctx.mode === 'dark' ? ramp[3] : ramp[4];
      const cB = ctx.palette[0];
      const dim = (n) => ctx.hiOn && !ctx.isHi(n);
      const lblRight = S.labels !== 'none';
      if (lblRight) {
        const widest = Math.max(...order.map((i) => B.measure(ctx.fmt(b.values[i]) + (S.showDelta ? '  (' + ctx.fmt((b.values[i] || 0) - (a.values[i] || 0), { sg: true }) + ')' : ''), 11, 500)));
        ctx.layout.right = Math.max(ctx.layout.right, widest + 22);
      }
      const legend = B.legend(ctx, [a.name, b.name], { icon: 'circle', itemWidth: 10, itemHeight: 10 });
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: B.tipAxis(ctx, { skip: ['__haste', '__lbl'], showName: true }) }),
          xAxis: B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true }),
          yAxis: B.catAxis(ctx, names, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } }),
          series: [
            {
              type: 'custom', name: '__haste', silent: true, renderItem: ctx.fn('rRange', { h: true, t: 3 }), encode: { x: [1, 2], y: 0 },
              data: order.map((i, k) => ({ value: [k, Math.min(a.values[i], b.values[i]), Math.max(a.values[i], b.values[i])], itemStyle: { color: dim(names[k]) ? T.grid : T.axis } })),
              tooltip: { show: false }, z: 1
            },
            { type: 'scatter', name: a.name, symbolSize: 11, z: 2, itemStyle: { color: cA }, data: order.map((i, k) => ({ value: [a.values[i], names[k]], itemStyle: B.ring(ctx, dim(names[k]) ? T.deemph : cA) })) },
            { type: 'scatter', name: b.name, symbolSize: 12, z: 3, itemStyle: { color: cB }, data: order.map((i, k) => ({ value: [b.values[i], names[k]], itemStyle: B.ring(ctx, dim(names[k]) ? T.deemph : cB) })) },
            {
              // rótulo sempre à direita da ponta mais alta (nunca invade os nomes do eixo)
              type: 'scatter', name: '__lbl', symbolSize: 1, silent: true, z: 1, itemStyle: { color: 'transparent' }, tooltip: { show: false },
              data: order.map((i, k) => {
                const d = (b.values[i] || 0) - (a.values[i] || 0);
                const show = lblRight && (S.labels === 'all' || !ctx.hiOn || ctx.isHi(names[k]));
                const txt = (ctx.fmt(b.values[i]) + (S.showDelta ? '  (' + ctx.fmt(d, { sg: true }) + ')' : '')).replace(/[{}]/g, '');
                return { value: [Math.max(a.values[i], b.values[i]), names[k]], label: show ? B.dataLabel(ctx, { position: 'right', distance: 10, formatter: txt }) : undefined };
              })
            }
          ]
        },
        meta: { valueAxis: 'x', annotSeries: 2 }
      };
    }
  });
})(window.GG = window.GG || {});
