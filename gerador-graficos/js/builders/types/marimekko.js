/**
 * Graficário — tipo de gráfico `marimekko`: Marimekko (mosaico).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;

  B.register({
    id: 'marimekko', name: 'Marimekko (mosaico)', group: 'Parte do todo', shape: 'wide',
    family: 'tab',
    roles: ['Coluna (largura = total)', 'Segmento A', '…mais segmentos'],
    hint: 'Duas partes-do-todo ao mesmo tempo: largura = tamanho do mercado, altura = participação.',
    hl: 'series', annot: false,
    settings: [{ k: 'inner', l: 'Rótulo % dentro dos blocos', t: 'toggle', d: true }],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const rowTot = cats.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
      const grand = rowTot.reduce((a, b) => a + b, 0) || 1;
      const data = [];
      let x = 0;
      cats.forEach((c, i) => {
        const w = rowTot[i] / grand * 100;
        let y = 0;
        series.forEach((s, j) => {
          const h = rowTot[i] ? (s.values[i] || 0) / rowTot[i] * 100 : 0;
          data.push({ name: c, seriesName: s.name, value: [x, x + w, y, y + h, j, h, j === 0 ? 1 : 0, i, s.values[i] || 0] });
          y += h;
        });
        x += w;
      });
      const colors = series.map((s, j) => ctx.pick(s.name, s.idx));
      const legend = B.legend(ctx, series.map((s) => s.name));
      ctx.layout.bottom += 22;
      return {
        option: {
          grid: B.grid(ctx, { outerBoundsMode: 'none', left: 44 }),
          legend,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: 'n', rows: [{ l: 'da coluna', d: 5, f: { d: 1, s: '%' } }, { l: '', d: 8 }] }) }),
          xAxis: { type: 'value', min: 0, max: 100, show: false },
          yAxis: B.valueAxis(ctx, { min: 0, max: 100, interval: 25, axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: { d: 0, s: '%' } }) } }),
          series: [{
            type: 'custom', name: 'Mosaico', renderItem: ctx.fn('rMekko', { colors, labels: S.inner && S.labels !== 'none', cats, font: GG.FONT, muted: T.muted }),
            encode: { x: [0, 1], y: [2, 3] }, data
          }].concat(series.map((s, j) => ({ type: 'bar', name: s.name, data: [], color: colors[j], legendIcon: 'roundRect' })))
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
