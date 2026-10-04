/**
 * Graficário — tipo de gráfico `lollipop`: Pirulito.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { SORT, ORIENT } = B.lib;

  B.register({
    id: 'lollipop', name: 'Pirulito', group: 'Comparação', shape: 'wide',
    family: 'tab', cartesian: true,
    roles: ['Categoria', 'Valor'],
    hint: 'Como barras, com menos tinta — bom para muitas categorias de valores parecidos.',
    hl: 'categories', annot: true,
    settings: [ORIENT('h'), Object.assign({}, SORT, { d: 'desc' })],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const s = series[0] || { values: [], name: '' };
      const order = B.sortIdx(s.values, S.sort);
      const names = order.map((i) => cats[i]);
      const vals = order.map((i) => s.values[i]);
      const horiz = S.orientation === 'h';
      const colorOf = (n) => (ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(0) : T.deemph) : ctx.color(0));
      const smart = B.smartIdx(ctx, vals, names, { extremes: true, min: true });
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } } : {});
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx), { zeroLocked: true });
      if (horiz) ctx.layout.right = Math.max(ctx.layout.right, 50);
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: B.tipAxis(ctx, { skip: ['__haste'] }) }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx,
          series: [
            { type: 'bar', name: '__haste', barWidth: 2, silent: true, data: vals.map((v, k) => ({ value: v, itemStyle: { color: colorOf(names[k]) } })), tooltip: { show: false } },
            {
              type: 'scatter', name: s.name, symbolSize: 12, z: 3,
              data: vals.map((v, k) => {
                const item = { value: horiz ? [v, names[k]] : [names[k], v], itemStyle: B.ring(ctx, colorOf(names[k])) };
                if (S.labels === 'all' || (S.labels === 'smart' && smart.has(k))) item.label = B.dataLabel(ctx, { position: horiz ? 'right' : 'top', distance: 8, formatter: ctx.fn('label', { f: ctx.f, dim: horiz ? 0 : 1 }) });
                return item;
              })
            }
          ]
        },
        meta: { valueAxis: horiz ? 'x' : 'y', annotSeries: 1, noteCoord: (n) => { const k = names.indexOf(String(n.x)); return k < 0 ? null : horiz ? [vals[k], names[k]] : [names[k], vals[k]]; } }
      };
    }
  });
})(window.GG = window.GG || {});
