/**
 * Graficário — tipo de gráfico `waterfall`: Cascata (ponte).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);
  const { ORIENT } = B.lib;

  B.register({
    id: 'waterfall', name: 'Cascata (ponte)', group: 'Finanças', shape: 'wide',
    family: 'tab', cartesian: true,
    roles: ['Etapa (comece com "=" para subtotal)', 'Valor / variação'],
    hint: 'Do valor inicial ao final, passo a passo. A 1ª linha é o ponto de partida; linhas com "=" viram subtotais.',
    hl: 'none', annot: true,
    settings: [
      { k: 'finalLabel', l: 'Barra final (total)', t: 'text', d: 'Resultado' },
      { k: 'polarity', l: 'Aumento é', t: 'seg', o: [['good', 'Bom'], ['bad', 'Ruim']], d: 'good' },
      ORIENT('v')
    ],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const items = [];
      let run = 0;
      t.rows.forEach((r, i) => {
        const label = String(r[0] || '');
        const v = N(r[1]);
        if (i === 0) { run = v || 0; items.push({ name: label, from: 0, to: run, delta: run, kind: 'total' }); return; }
        if (/^=/.test(label)) { items.push({ name: label.replace(/^=\s*/, ''), from: 0, to: run, delta: run, kind: 'total' }); return; }
        if (v === null) return;
        items.push({ name: label, from: run, to: run + v, delta: v, kind: v >= 0 ? 'up' : 'down' });
        run += v;
      });
      if (S.finalLabel) items.push({ name: S.finalLabel, from: 0, to: run, delta: run, kind: 'total' });
      const good = GG.tokens.STATUS.good, bad = GG.tokens.STATUS.critical;
      const colors = { total: ctx.mode === 'dark' ? '#9a9890' : '#52514e', up: S.polarity === 'bad' ? bad : good, down: S.polarity === 'bad' ? good : bad };
      const horiz = S.orientation === 'h';
      const names = items.map((x) => x.name);
      // seletivos: totais + as 3 maiores variações (o resto fica na dica e na tabela)
      const bigDeltas = items.filter((x) => x.kind !== 'total').map((x) => Math.abs(x.delta)).sort((a, b) => b - a).slice(0, 3);
      const lbl = items.map((x) => {
        if (S.labels === 'none') return '';
        if (x.kind === 'total') return ctx.fmt(x.delta);
        if (S.labels === 'smart' && bigDeltas.indexOf(Math.abs(x.delta)) < 0) return '';
        return (x.delta >= 0 ? '▲ ' : '▼ ') + ctx.fmt(x.delta, { sg: true });
      });
      const legend = B.legend(ctx, ['Total', S.polarity === 'bad' ? 'Aumento (piora)' : 'Aumento', S.polarity === 'bad' ? 'Redução (melhora)' : 'Redução'], { icon: 'roundRect' });
      const band = (ctx.W - 90) / Math.max(names.length, 1);
      const rot = !horiz && Math.max(...names.map((n) => Math.max(...String(n).split(/\s+/).map((w) => B.measure(w, 11))))) > band - 6;
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } }
        : { axisLabel: { color: T.muted, fontSize: 11, interval: 0, rotate: rot ? 35 : 0, width: rot ? 120 : Math.max(50, band - 6), overflow: rot ? 'truncate' : 'break' } });
      const valAx = B.valueAxis(ctx, { scale: false });
      if (horiz) ctx.layout.right = Math.max(ctx.layout.right, 64);
      const series = [{
        type: 'custom', name: 'Etapas', renderItem: ctx.fn('rWaterfall', { h: horiz, labels: lbl, ink: T.ink2, font: GG.FONT, conn: T.axis, n: items.length }),
        encode: horiz ? { x: [1, 2], y: 0 } : { x: 0, y: [1, 2] },
        data: items.map((x, k) => ({ name: x.name, value: [k, x.from, x.to, x.delta], itemStyle: { color: colors[x.kind] } })),
        tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: 'variação', d: 3 }, { l: 'acumulado', d: 2 }] }) }
      }];
      // séries vazias só para a legenda
      [['Total', colors.total], [legend.data[1], colors.up], [legend.data[2], colors.down]].forEach(([nm, cl]) => series.push({ type: 'bar', name: nm, data: [], color: cl, legendIcon: 'roundRect' }));
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx, series
        },
        meta: { valueAxis: horiz ? 'x' : 'y' }
      };
    }
  });
})(window.GG = window.GG || {});
