/**
 * Graficário — tipo de gráfico `bump`: Ranking no tempo (bump).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;

  B.register({
    id: 'bump', name: 'Ranking no tempo (bump)', group: 'Ranking', shape: 'wide',
    family: 'tab',
    roles: ['Período', 'Item A (valor ou posição)', '…mais itens'],
    hint: 'Mudança de posição ao longo do tempo. Destaque o item que importa.',
    hl: 'series', annot: false,
    settings: [
      { k: 'input', l: 'Os números são', t: 'select', o: [['value', 'Valores (maior = 1º)'], ['valueAsc', 'Valores (menor = 1º)'], ['rank', 'Posições (1, 2, 3…)']], d: 'value' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const ranks = series.map(() => []);
      cats.forEach((_, i) => {
        if (S.input === 'rank') { series.forEach((s, j) => { ranks[j][i] = s.values[i]; }); return; }
        const idx = series.map((s, j) => j).filter((j) => series[j].values[i] !== null);
        idx.sort((x, y) => (S.input === 'valueAsc' ? 1 : -1) * (series[x].values[i] - series[y].values[i]));
        idx.forEach((j, r) => { ranks[j][i] = r + 1; });
      });
      const n = series.length;
      B.reserveRight(ctx, series.map((s) => s.name));
      const out = series.map((s, j) => {
        const col = ctx.pick(s.name, s.idx);
        const dim = ctx.hiOn && !ctx.isHi(s.name);
        return {
          type: 'line', name: s.name, color: col, smooth: 0.3, symbol: 'circle', symbolSize: 10, z: dim ? 2 : 3,
          lineStyle: { width: dim ? 2 : 3, color: col }, itemStyle: B.ring(ctx, col),
          endLabel: S.labels !== 'none' ? { show: true, formatter: ctx.fn('endLabel', { nameOnly: true }), color: dim ? T.muted : T.ink2, fontSize: 12, distance: 8 } : undefined,
          emphasis: { focus: 'series' }, blur: { lineStyle: { opacity: 0.15 }, itemStyle: { opacity: 0.15 } },
          data: ranks[j].map((r) => (r === undefined ? null : r))
        };
      });
      const legend = B.legendNeeded(ctx, n) && S.labels === 'none' ? B.legend(ctx, series.map((s) => s.name)) : undefined;
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { formatter: ctx.fn('tipAxis', { f: { p: '', s: 'º', d: 0 }, c: ctx.c, showName: true, order: 'asc' }) }),
          xAxis: B.catAxis(ctx, cats, { boundaryGap: false, axisLine: { show: false }, splitLine: { show: true, lineStyle: { color: T.grid } } }),
          yAxis: { type: 'value', inverse: true, min: 1, max: n, interval: 1, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
            axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: { s: 'º', d: 0 } }) } },
          series: out
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
