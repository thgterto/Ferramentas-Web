/**
 * Graficário — tipo de gráfico `forecast`: Previsão com intervalo.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'forecast', name: 'Previsão com intervalo', group: 'Tempo', shape: 'wide',
    family: 'tab', cartesian: true,
    roles: ['Período', 'Real', 'Previsão', 'Limite inferior', 'Limite superior'],
    hint: 'Realizado em linha cheia, projeção tracejada e a faixa de incerteza — honestidade sobre o que não se sabe.',
    hl: 'none', annot: true,
    settings: [{ k: 'todayLabel', l: 'Rótulo do corte', t: 'text', d: 'Hoje' }],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const cats = t.rows.map((r) => String(r[0]));
      const col = (j) => t.rows.map((r) => N(r[j]));
      const real = col(1), fc = col(2), lo = col(3), hi = col(4);
      const c = ctx.color(0);
      const lastReal = real.reduce((li, v, i) => (v !== null ? i : li), -1);
      const names = [t.columns[1] || 'Real', t.columns[2] || 'Previsão'];
      const legend = B.legend(ctx, names.concat(['Intervalo']), { icon: undefined });
      const endL = S.labels !== 'none';
      if (endL) B.reserveRight(ctx, [ctx.fmt(fc[fc.length - 1]) + ' prev.']);
      const refs = ctx.S.annotations.refs;
      if (lastReal >= 0 && S.todayLabel && !refs.some((r) => r.axis === 'cat')) ctx.S.annotations.refs = refs.concat([{ axis: 'cat', v: cats[lastReal], label: S.todayLabel }]);
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { formatter: B.tipAxis(ctx, { skip: ['Intervalo', '__lo'], showName: true }) }),
          xAxis: B.catAxis(ctx, cats, { boundaryGap: false }),
          yAxis: B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true }),
          series: [
            { type: 'line', name: '__lo', data: lo, stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false } },
            { type: 'line', name: 'Intervalo', data: hi.map((h, i) => (h !== null && lo[i] !== null ? h - lo[i] : null)), stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color: c, opacity: ctx.mode === 'dark' ? 0.2 : 0.14 }, color: c, silent: true },
            { type: 'line', name: 'Limite inferior', data: lo, symbol: 'none', lineStyle: { opacity: 0 }, silent: true },
            { type: 'line', name: 'Limite superior', data: hi, symbol: 'none', lineStyle: { opacity: 0 }, silent: true },
            {
              type: 'line', name: names[0], color: c, lineStyle: { width: 2, color: c }, symbol: 'circle', symbolSize: 8, itemStyle: B.ring(ctx, c),
              data: real.map((v, i) => (i === lastReal ? { value: v, label: endL ? B.dataLabel(ctx, { position: 'top', formatter: ctx.fn('label', { f: ctx.f }) }) : undefined } : { value: v, symbol: 'none' }))
            },
            {
              type: 'line', name: names[1], color: c, lineStyle: { width: 2, color: c, type: [5, 4] }, symbol: 'circle', symbolSize: 8, itemStyle: { color: T.surface, borderColor: c, borderWidth: 2 },
              data: fc.map((v, i) => (i === fc.length - 1 ? v : { value: v, symbol: 'none' })),
              endLabel: endL ? { show: true, color: T.ink2, fontSize: 12, distance: 8, formatter: ctx.fn('label', { f: ctx.f, tpl: '{v} prev.' }) } : undefined
            }
          ]
        },
        meta: { valueAxis: 'y', annotSeries: 4, noteCoord: (n) => { const i = cats.indexOf(String(n.x)); return i < 0 ? null : [cats[i], real[i] !== null ? real[i] : fc[i]]; } }
      };
    }
  });
})(window.GG = window.GG || {});
