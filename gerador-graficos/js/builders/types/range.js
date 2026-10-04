/**
 * Graficário — tipo de gráfico `range`: Intervalo (mín–máx).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);
  const { ORIENT } = B.lib;

  B.register({
    id: 'range', name: 'Intervalo (mín–máx)', group: 'Distribuição', shape: 'wide',
    family: 'tab', cartesian: true,
    roles: ['Categoria', 'Mínimo', 'Máximo', 'Média (opcional)'],
    hint: 'Amplitude de cada categoria (faixas salariais, temperaturas, preços).',
    hl: 'categories', annot: true,
    settings: [ORIENT('h'), { k: 'sort', l: 'Ordenar', t: 'select', o: [['none', 'Ordem dos dados'], ['mid', 'Pela média'], ['width', 'Pela amplitude']], d: 'none' }],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const cats = t.rows.map((r) => String(r[0]));
      const lo = t.rows.map((r) => N(r[1])), hi = t.rows.map((r) => N(r[2]));
      const mid = t.rows.map((r, i) => (r.length > 3 && N(r[3]) !== null ? N(r[3]) : null));
      let order = cats.map((_, i) => i);
      if (S.sort === 'mid') order = B.sortIdx(cats.map((_, i) => (mid[i] !== null ? mid[i] : (lo[i] + hi[i]) / 2)), 'desc');
      if (S.sort === 'width') order = B.sortIdx(cats.map((_, i) => hi[i] - lo[i]), 'desc');
      const names = order.map((i) => cats[i]);
      const horiz = S.orientation === 'h';
      const col = (n) => (ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(0) : T.deemph) : ctx.color(0));
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } } : {});
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true });
      const hasMid = mid.some((m) => m !== null);
      if (S.labels !== 'none' && horiz) ctx.layout.right = Math.max(ctx.layout.right, 60);
      const cols = t.columns;
      const series = [{
        type: 'custom', name: (cols[1] || 'Mín') + '–' + (cols[2] || 'Máx'), renderItem: ctx.fn('rRange', { h: horiz, t: 10 }),
        encode: horiz ? { x: [1, 2], y: 0 } : { x: 0, y: [1, 2] },
        data: order.map((i, k) => {
          const item = { value: [k, lo[i], hi[i]], itemStyle: { color: col(names[k]) } };
          return item;
        }),
        tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, nameDim: null, rows: [{ l: cols[1] || 'Mínimo', d: 1 }, { l: cols[2] || 'Máximo', d: 2 }] }) }
      }];
      if (S.labels !== 'none') {
        series.push({
          type: 'scatter', name: '__lbl', symbolSize: 0, silent: true, tooltip: { show: false },
          data: order.map((i, k) => ({ value: horiz ? [hi[i], names[k]] : [names[k], hi[i]], label: B.dataLabel(ctx, { position: horiz ? 'right' : 'top', formatter: (ctx.fmt(lo[i]) + '–' + ctx.fmt(hi[i])).replace(/[{}]/g, '') }) }))
        });
      }
      if (hasMid) {
        series.push({ type: 'scatter', name: cols[3] || 'Média', symbolSize: 10, z: 4, data: order.map((i, k) => ({ value: horiz ? [mid[i], names[k]] : [names[k], mid[i]], itemStyle: B.ring(ctx, T.ink) })) });
      }
      series[0].data.forEach((d, k) => { d.name = names[k]; });
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
