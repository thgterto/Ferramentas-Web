/**
 * Graficário — tipo de gráfico `boxplot`: Boxplot (caixa).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const ST = GG.stats;
  const { hexA } = B.lib;

  B.register({
    id: 'boxplot', name: 'Boxplot (caixa)', group: 'Distribuição', shape: 'columns',
    family: 'samples', cartesian: true,
    roles: ['Grupo A (uma coluna de medições)', 'Grupo B', '…'],
    hint: 'Compara distribuições entre grupos: mediana, quartis e valores atípicos.',
    hl: 'categories', annot: true,
    settings: [
      { k: 'orientation', l: 'Orientação', t: 'seg', o: [['v', 'Vertical'], ['h', 'Horizontal']], d: 'v' },
      { k: 'sortBy', l: 'Ordenar grupos', t: 'select', o: [['none', 'Ordem dos dados'], ['median', 'Pela mediana']], d: 'none' },
      { k: 'points', l: 'Mostrar todos os pontos', t: 'toggle', d: false },
      { k: 'mean', l: 'Marcar a média (◆)', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      let groups = B.columnsSamples(ctx).map((g) => ({ ...g, st: ST.boxStats(g.values) }));
      if (S.sortBy === 'median') groups = groups.slice().sort((a, b) => b.st.median - a.st.median);
      const names = groups.map((g) => g.name);
      const horiz = S.orientation === 'h';
      const colOf = (g) => (ctx.hiOn ? (ctx.isHi(g.name) ? ctx.accentColor(0) : T.muted) : ctx.color(0));
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLine: { show: false } } : {});
      if (S.points) catAx.jitter = 18;
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true });
      const series = [{
        type: 'boxplot', name: 'Distribuição', boxWidth: [10, 34],
        data: groups.map((g) => ({ name: g.name, value: [g.st.min, g.st.q1, g.st.median, g.st.q3, g.st.max], itemStyle: { color: hexA(colOf(g), 0.14), borderColor: colOf(g), borderWidth: 1.5 } })),
        tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: 'mediana', d: 3 }, { l: 'Q1 – Q3 (50% central)', d: 2 }, { l: 'Q3', d: 4 }, { l: 'mínimo', d: 1 }, { l: 'máximo', d: 5 }] }) },
        emphasis: { itemStyle: { borderWidth: 2 } }
      }];
      const outl = [];
      groups.forEach((g, k) => g.st.outliers.forEach((o) => outl.push(horiz ? [o, g.name] : [g.name, o])));
      series.push({ type: 'scatter', name: 'Atípicos', symbolSize: 7, data: outl, itemStyle: { color: T.surface, borderColor: T.ink2, borderWidth: 1.5 }, tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: 's', rows: [{ l: '', d: horiz ? 0 : 1 }] }) } });
      if (S.points) {
        const pts = [];
        groups.forEach((g) => g.values.forEach((v) => pts.push({ value: horiz ? [v, g.name] : [g.name, v], itemStyle: { color: hexA(colOf(g), 0.55) } })));
        series.push({ type: 'scatter', name: 'Observações', symbolSize: 5, data: pts, z: 1, silent: true });
      }
      if (S.mean) {
        series.push({ type: 'custom', name: 'Média', renderItem: ctx.fn('rMark', { shape: 'diamond', h: horiz, color: T.ink, surface: T.surface, size: 5 }),
          encode: horiz ? { x: 1, y: 0 } : { x: 0, y: 1 }, data: groups.map((g, k) => ({ name: g.name, value: [k, g.st.mean] })), z: 5,
          tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: 'n', rows: [{ l: 'média', d: 1 }] }) } });
      }
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx, series
        },
        meta: { valueAxis: horiz ? 'x' : 'y' }
      };
    }
  });
})(window.GG = window.GG || {});
