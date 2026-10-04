/**
 * Graficário — tipo de gráfico `heatmap`: Mapa de calor (matriz).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { SCALE_SETTINGS, colorScale } = B.lib;

  B.register({
    id: 'heatmap', name: 'Mapa de calor (matriz)', group: 'Relação', shape: 'wide',
    family: 'tab',
    roles: ['Linha', 'Coluna A (valor)', 'Coluna B', '…'],
    hint: 'Padrões numa grade (dia × hora, coorte × mês, correlações). Sequencial para magnitude; divergente se o zero importa.',
    hl: 'none', annot: false,
    settings: SCALE_SETTINGS.concat([{ k: 'xTop', l: 'Rótulos das colunas no topo', t: 'toggle', d: false }]),
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const cols = series.map((s) => s.name);
      const data = [];
      series.forEach((s, x) => s.values.forEach((v, y) => { if (v !== null) data.push([x, y, v]); }));
      const cs = colorScale(ctx, data.map((d) => d[2]));
      const L = ctx.layout;
      if (S.xTop) { L.top += 22; }
      const plotW = ctx.W - 140, plotH = ctx.H - L.top - L.bottom - 30;
      const cellW = plotW / Math.max(cols.length, 1), cellH = plotH / Math.max(cats.length, 1);
      const f = ctx.f;
      const showLbl = S.labels === 'all' || (S.labels === 'smart' && cellW > 34 && cellH > 18);
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f, c: ctx.c, noKey: false, rows: [{ l: '', d: 2 }] }) }),
          xAxis: B.catAxis(ctx, cols, { position: S.xTop ? 'top' : 'bottom', axisLine: { show: false }, splitArea: { show: false }, axisLabel: { color: T.muted, fontSize: 11, interval: cellW < 26 ? 'auto' : 0, hideOverlap: true } }),
          yAxis: B.catAxis(ctx, cats, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, interval: cellH < 14 ? 'auto' : 0 } }),
          visualMap: cs.vm,
          series: [{
            type: 'heatmap', name: 'Valores',
            data: data.map((d) => {
              const col = cs.colorOf(d[2]);
              return { name: cats[d[1]] + ' · ' + cols[d[0]], value: d, label: showLbl ? { show: true, color: GG.color.inkOn(col), fontSize: 11, fontFamily: GG.FONT, formatter: ctx.fn('label', { f, dim: 2 }) } : undefined };
            }),
            itemStyle: { borderColor: T.surface, borderWidth: cellW > 8 && cellH > 8 ? 2 : 0, borderRadius: 2 },
            emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 1.5 } }
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
