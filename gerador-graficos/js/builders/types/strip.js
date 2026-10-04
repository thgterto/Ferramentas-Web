/**
 * Graficário — tipo de gráfico `strip`: Pontos por grupo (strip).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const ST = GG.stats;

  B.register({
    id: 'strip', name: 'Pontos por grupo (strip)', group: 'Distribuição', shape: 'columns',
    family: 'samples', cartesian: true,
    roles: ['Grupo A (uma coluna de medições)', 'Grupo B', '…'],
    hint: 'Todos os pontos à vista, com a mediana marcada — honesto para amostras pequenas.',
    hl: 'categories', annot: true,
    settings: [
      { k: 'orientation', l: 'Orientação', t: 'seg', o: [['h', 'Horizontal'], ['v', 'Vertical']], d: 'h' },
      { k: 'swarm', l: 'Evitar sobreposição (enxame)', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const groups = B.columnsSamples(ctx);
      const names = groups.map((g) => g.name);
      const horiz = S.orientation === 'h';
      const plotLen = horiz ? (ctx.H - ctx.layout.top - ctx.layout.bottom) : (ctx.W - 80);
      const band = plotLen / Math.max(names.length, 1);
      const catAx = B.catAxis(ctx, names, Object.assign({ jitter: Math.max(6, band * 0.34), jitterOverlap: !S.swarm, jitterMargin: 1.5 }, horiz ? { inverse: true, axisLine: { show: false } } : {}));
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true });
      const colOf = (n) => (ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(0) : T.deemph) : ctx.color(0));
      const pts = [];
      groups.forEach((g) => g.values.forEach((v) => pts.push({ name: g.name, value: horiz ? [v, g.name] : [g.name, v], itemStyle: { color: colOf(g.name), opacity: 0.8, borderColor: T.surface, borderWidth: 1 } })));
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx,
          series: [
            { type: 'scatter', name: 'Observações', symbolSize: 8, data: pts, tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: '', d: horiz ? 0 : 1 }] }) } },
            { type: 'custom', name: 'Mediana', renderItem: ctx.fn('rMark', { shape: 'bar', h: horiz, color: T.ink, size: Math.min(band * 0.4, 26) }), z: 5,
              encode: horiz ? { x: 1, y: 0 } : { x: 0, y: 1 },
              data: groups.map((g, k) => ({ name: g.name, value: [k, ST.quantile(ST.sorted(g.values), 0.5)],
                label: S.labels !== 'none' ? { show: true } : undefined })),
              tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: 'n', rows: [{ l: 'mediana', d: 1 }] }) } }
          ]
        },
        meta: { valueAxis: horiz ? 'x' : 'y', annotSeries: 0 }
      };
    }
  });
})(window.GG = window.GG || {});
