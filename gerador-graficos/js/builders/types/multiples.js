/**
 * Graficário — tipo de gráfico `multiples`: Pequenos múltiplos.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;

  B.register({
    id: 'multiples', name: 'Pequenos múltiplos', group: 'Tempo', shape: 'wide',
    family: 'tab',
    roles: ['Período', 'Série A', '…mais séries (um painel cada)'],
    hint: 'Cura do "gráfico espaguete": um painel por série, mesma escala, as outras em cinza ao fundo.',
    hl: 'series', annot: false,
    settings: [
      { k: 'kind', l: 'Marca', t: 'seg', o: [['line', 'Linha'], ['area', 'Área'], ['bar', 'Colunas']], d: 'line' },
      { k: 'ghost', l: 'Outras séries em cinza ao fundo', t: 'toggle', d: true },
      { k: 'sharedY', l: 'Mesma escala em todos', t: 'toggle', d: true },
      { k: 'cols', l: 'Colunas de painéis', t: 'number', d: '', ph: 'auto' }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const { cats, series } = B.wide(ctx);
      const n = series.length || 1;
      const L = ctx.layout;
      const all = series.flatMap((s) => s.values).filter((v) => v !== null);
      const dmin = Math.min(...all), dmax = Math.max(...all);
      // limites "redondos" para que o mín/máx rotulados sejam números limpos
      let step = Math.pow(10, Math.floor(Math.log10((dmax - Math.min(0, dmin)) || 1)));
      if ((dmax - dmin) / step < 3) step /= 2;
      const gmax = Math.ceil(dmax / step) * step;
      const gmin = S.kind === 'line' ? Math.floor(dmin / step) * step : Math.min(0, Math.floor(dmin / step) * step);
      const af = Object.assign({ c: true }, B.axisF(ctx.f));
      const yl = Math.max(B.measure(ctx.R.fmt(gmax, af), 10), B.measure(ctx.R.fmt(gmin, af), 10)) + 8;
      const availW = W - 32, availH = H - L.top - L.bottom - 16;
      let cols = parseInt(S.cols, 10);
      if (!(cols > 0)) cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * (availW / Math.max(availH, 1)) * 0.9))));
      const rows = Math.ceil(n / cols);
      const gapX = 20, gapY = 26, head = 20;
      const gutter = S.sharedY ? yl : 0;
      const pw = (availW - gutter - gapX * (cols - 1) - (S.sharedY ? 0 : yl * cols)) / cols;
      const ph = (availH - gapY * (rows - 1)) / rows;
      const grids = [], xAxes = [], yAxes = [], out = [], titles = [];
      series.forEach((s, k) => {
        const r = Math.floor(k / cols), c = k % cols;
        const left = 16 + gutter + c * (pw + gapX + (S.sharedY ? 0 : yl)) + (S.sharedY ? 0 : yl);
        const top = L.top + r * (ph + gapY) + head;
        grids.push({ left, top, width: Math.max(pw, 20), height: Math.max(ph - head, 20), outerBoundsMode: 'none' });
        const hi = !ctx.hiOn || ctx.isHi(s.name);
        const col = hi ? ctx.accentColor(ctx.hiOn ? s.idx : 0) : T.muted;
        titles.push({ text: s.name + (S.labels !== 'none' ? '  ' + ctx.fmt(s.values[s.values.length - 1]) : ''), left: left - (c === 0 || !S.sharedY ? 0 : 0), top: top - head, textStyle: { fontSize: 12, fontWeight: 600, color: hi ? T.ink : T.ink2, fontFamily: GG.FONT, width: pw, overflow: 'truncate' } });
        const bottomRow = r === rows - 1 || k + cols >= n;
        xAxes.push(B.catAxis(ctx, cats, { gridIndex: k, boundaryGap: S.kind === 'bar', axisLabel: { show: bottomRow, color: T.muted, fontSize: 10, hideOverlap: true } }));
        yAxes.push(B.valueAxis(ctx, { gridIndex: k, splitNumber: 2, min: S.sharedY ? gmin : (S.kind === 'bar' ? 0 : 'dataMin'), max: S.sharedY ? gmax : undefined, axisLabel: { show: c === 0 || !S.sharedY, color: T.muted, fontSize: 10, formatter: ctx.fn('axis', { f: af }), showMinLabel: true, showMaxLabel: true } }));
        if (S.ghost && S.kind !== 'bar') {
          series.forEach((o) => { if (o !== s) out.push({ type: 'line', xAxisIndex: k, yAxisIndex: k, data: o.values, symbol: 'none', silent: true, lineStyle: { width: 1, color: T.deemph, opacity: 0.8 }, z: 1, name: '__ghost', tooltip: { show: false } }); });
        }
        if (S.kind === 'bar') out.push({ type: 'bar', name: s.name, xAxisIndex: k, yAxisIndex: k, data: s.values, barMaxWidth: 16, itemStyle: { color: col, borderRadius: [3, 3, 0, 0] }, z: 3 });
        else out.push({
          type: 'line', name: s.name, xAxisIndex: k, yAxisIndex: k, z: 3, symbol: 'circle', symbolSize: 7, color: col,
          data: s.values.map((v, i) => (i === s.values.length - 1 ? v : { value: v, symbol: 'none' })),
          lineStyle: { width: 2, color: col }, itemStyle: B.ring(ctx, col),
          areaStyle: S.kind === 'area' ? { color: col, opacity: 0.12 } : undefined
        });
      });
      return {
        option: {
          title: titles, grid: grids, xAxis: xAxes, yAxis: yAxes, series: out,
          tooltip: B.tooltip(ctx, { formatter: B.tipAxis(ctx, { skip: ['__ghost'], showName: true }) }),
          axisPointer: { link: [{ xAxisIndex: 'all' }] }
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
