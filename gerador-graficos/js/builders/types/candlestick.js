/**
 * Graficário — tipo de gráfico `candlestick`: Candlestick (OHLC).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'candlestick', name: 'Candlestick (OHLC)', group: 'Finanças', shape: 'wide',
    family: 'ohlc', cartesian: true,
    roles: ['Data', 'Abertura', 'Fechamento', 'Mínima', 'Máxima', 'Volume (opc.)'],
    hint: 'Preço de ativos. Alta = vazado verde, baixa = cheio vermelho (forma + cor). Volume em painel separado, nunca em 2º eixo.',
    hl: 'none', annot: true,
    settings: [
      { k: 'ma', l: 'Médias móveis (ex.: 5,20)', t: 'text', d: '5,20' },
      { k: 'zoom', l: 'Zoom com roda/gesto', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const cats = t.rows.map((r) => String(r[0]));
      const ohlc = t.rows.map((r) => [N(r[1]), N(r[2]), N(r[3]), N(r[4])]);
      const vol = t.rows.map((r) => N(r[5]));
      const hasVol = vol.some((x) => x !== null);
      const ST = GG.tokens.STATUS;
      const L = ctx.layout;
      const mas = String(S.ma || '').split(/[,;\s]+/).map((x) => parseInt(x, 10)).filter((x) => x > 1).slice(0, 3);
      const legendNames = ['Preço'].concat(mas.map((m) => 'MM' + m));
      const legend = mas.length ? B.legend(ctx, legendNames) : undefined;
      const plotH = ctx.H - L.top - L.bottom;
      const g1 = B.grid(ctx, { bottom: hasVol ? L.bottom + plotH * 0.22 + 16 : L.bottom });
      const grids = [g1];
      const close = ohlc.map((x) => x[1]);
      const series = [{
        type: 'candlestick', name: 'Preço', data: ohlc, barMaxWidth: 12,
        itemStyle: { color: T.surface, color0: ST.critical, borderColor: ST.good, borderColor0: ST.critical, borderWidth: 1.5 }
      }];
      mas.forEach((m, k) => {
        const col = ctx.color(k);
        series.push({ type: 'line', name: 'MM' + m, symbol: 'none', smooth: 0.2, color: col, lineStyle: { width: 2, color: col },
          data: close.map((_, i) => (i < m - 1 ? null : +(close.slice(i - m + 1, i + 1).reduce((a, b) => a + b, 0) / m).toFixed(4))) });
      });
      const xAxes = [B.catAxis(ctx, cats, { axisLabel: { show: !hasVol, color: T.muted, fontSize: 11, hideOverlap: true } })];
      const yAxes = [B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true })];
      if (hasVol) {
        grids.push({ left: L.left, right: L.right, height: plotH * 0.22 - 8, bottom: L.bottom, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' });
        xAxes.push(B.catAxis(ctx, cats, { gridIndex: 1 }));
        yAxes.push(B.valueAxis(ctx, { gridIndex: 1, splitNumber: 2, axisLabel: { color: T.muted, fontSize: 10, formatter: ctx.fn('axis', { f: { c: true } }) } }));
        series.push({ type: 'bar', name: 'Volume', xAxisIndex: 1, yAxisIndex: 1, barMaxWidth: 12,
          data: vol.map((x, i) => ({ value: x, itemStyle: { color: ohlc[i][1] >= ohlc[i][0] ? ST.good : ST.critical, opacity: 0.55 } })) });
      }
      return {
        option: {
          grid: grids, legend, xAxis: xAxes, yAxis: yAxes, series,
          axisPointer: { link: [{ xAxisIndex: 'all' }] },
          dataZoom: S.zoom ? [{ type: 'inside', xAxisIndex: hasVol ? [0, 1] : [0], start: cats.length > 90 ? 100 - 9000 / cats.length : 0, end: 100 }] : undefined,
          tooltip: B.tooltip(ctx, { formatter: ctx.fn('tipOhlc', { f: ctx.f, c: ctx.c }) })
        },
        meta: { valueAxis: 'y', annotSeries: 0 }
      };
    }
  });
})(window.GG = window.GG || {});
