/**
 * Graficário — tipo de gráfico `ecdf`: Distribuição acumulada.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);
  const ST = GG.stats;

  B.register({
    id: 'ecdf', name: 'Distribuição acumulada', group: 'Distribuição', shape: 'columns',
    family: 'samples', cartesian: true,
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
})(window.GG = window.GG || {});
