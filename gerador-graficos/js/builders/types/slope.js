/**
 * Graficário — tipo de gráfico `slope`: Inclinação (slope).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;

  B.register({
    id: 'slope', name: 'Inclinação (slope)', group: 'Ranking', shape: 'wide',
    family: 'tab',
    roles: ['Item', 'Período inicial', 'Período final'],
    hint: 'Dois momentos, muitos itens: quem subiu, quem caiu. Rótulos diretos nas duas pontas.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'colorBy', l: 'Cor', t: 'select', o: [['direction', 'Pela direção (subiu/caiu)'], ['single', 'Uma cor']], d: 'direction' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const a = series[0], b = series[series.length - 1];
      if (!a) return { option: { series: [] } };
      const periods = [a.name, b.name];
      const up = ctx.color(0), down = ctx.color(1);
      const longest = Math.max(...cats.map((c, i) => Math.max(B.measure(c + '  ' + ctx.fmt(a.values[i]), 11), B.measure(c + '  ' + ctx.fmt(b.values[i]), 11))));
      const side = Math.min(ctx.W * 0.34, longest + 16);
      ctx.layout.left = side; ctx.layout.right = side;
      ctx.layout.top += 24;
      const out = cats.map((name, i) => {
        const v0 = a.values[i], v1 = b.values[i];
        let col = S.colorBy === 'single' ? ctx.color(0) : (v1 >= v0 ? up : down);
        const dim = ctx.hiOn && !ctx.isHi(name);
        if (dim) col = T.deemph;
        const showL = S.labels !== 'none' && (S.labels === 'all' || !ctx.hiOn || !dim);
        return {
          type: 'line', name, color: col, symbol: 'circle', symbolSize: 9, z: dim ? 2 : 3,
          lineStyle: { width: 2, color: col }, itemStyle: B.ring(ctx, col),
          label: showL ? { show: true, color: dim ? T.muted : T.ink2, fontSize: 11, fontFamily: GG.FONT } : { show: false },
          labelLayout: { moveOverlap: 'shiftY' },
          emphasis: { focus: 'series' }, blur: { lineStyle: { opacity: 0.2 }, itemStyle: { opacity: 0.2 }, label: { opacity: 0.3 } },
          data: [
            { value: v0, label: { position: 'left', distance: 8, formatter: (name + '  ' + ctx.fmt(v0)).replace(/[{}]/g, '') } },
            { value: v1, label: { position: 'right', distance: 8, formatter: (ctx.fmt(v1) + '  ' + name).replace(/[{}]/g, '') } }
          ]
        };
      });
      return {
        option: {
          grid: B.grid(ctx, { outerBoundsMode: 'none' }),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: B.tipItem(ctx, { h: 's', rows: [{ l: '', d: 'v' }] }) }),
          xAxis: B.catAxis(ctx, periods, { boundaryGap: false, position: 'top', axisLine: { show: false }, axisLabel: { color: T.ink2, fontSize: 12, fontWeight: 600 }, splitLine: { show: true, lineStyle: { color: T.axis } } }),
          yAxis: B.applyValueRange(ctx, B.valueAxis(ctx, { show: false }), { scale: true }),
          series: out
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
