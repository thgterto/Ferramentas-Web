/**
 * Graficário — tipo de gráfico `violin`: Violino (densidade).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const ST = GG.stats;

  B.register({
    id: 'violin', name: 'Violino (densidade)', group: 'Distribuição', shape: 'columns',
    family: 'samples', cartesian: true,
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
})(window.GG = window.GG || {});
