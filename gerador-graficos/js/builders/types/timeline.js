/**
 * Graficário — tipo de gráfico `timeline`: Linha do tempo de eventos.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;

  B.register({
    id: 'timeline', name: 'Linha do tempo de eventos', group: 'Projetos', shape: 'wide',
    family: 'events',
    roles: ['Data', 'Evento', 'Categoria (opc.)'],
    hint: 'Marcos no tempo com rótulos alternados acima e abaixo do eixo.',
    hl: 'categories', annot: false,
    settings: [{ k: 'levels', l: 'Níveis de altura dos rótulos', t: 'number', d: 3 }],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const rows = t.rows.map((r) => ({ d: GG.data.toDate(r[0]), text: String(r[1] || ''), cat: r[2] ? String(r[2]) : '' })).filter((x) => x.d).sort((a, b) => a.d - b.d);
      const cats = [];
      rows.forEach((r) => { if (r.cat && cats.indexOf(r.cat) < 0) cats.push(r.cat); });
      const lv = Math.max(1, Math.min(5, parseInt(S.levels, 10) || 3));
      const data = rows.map((r, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const lvl = (Math.floor(i / 2) % lv) + 1;
        const ci = r.cat ? cats.indexOf(r.cat) : 0;
        const col = ctx.hiOn ? (ctx.isHi(r.cat) || ctx.isHi(r.text) ? ctx.accentColor(ci) : T.deemph) : ctx.color(ci);
        return { name: r.text, value: [r.d.getTime(), side * lvl, ci], itemStyle: { color: col } };
      });
      const legend = cats.length > 1 ? B.legend(ctx, cats) : undefined;
      const ts = rows.map((r) => r.d.getTime());
      const pad = ts.length ? (Math.max(...ts) - Math.min(...ts)) * 0.06 + 864e5 : 864e5;
      return {
        option: {
          grid: B.grid(ctx, { outerBoundsMode: 'none', left: 40, right: 40 }), legend,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { c: ctx.c, rows: [{ l: '', d: 0, date: 'full' }] }) }),
          xAxis: { type: 'time', min: ts.length ? Math.min(...ts) - pad : undefined, max: ts.length ? Math.max(...ts) + pad : undefined,
            axisLine: { show: true, onZero: true, lineStyle: { color: T.ink2, width: 1.5 } }, axisTick: { show: false }, splitLine: { show: false },
            axisLabel: { show: false } },
          yAxis: { type: 'value', show: false, min: -lv - 0.8, max: lv + 0.8 },
          series: [{
            type: 'custom', name: 'Eventos', renderItem: ctx.fn('rEvent', { texts: rows.map((r) => r.text), dates: rows.map((r) => r.d.getTime()), ink: T.ink, ink2: T.ink2, stem: T.axis, surface: T.surface, font: GG.FONT, labels: S.labels !== 'none' }),
            encode: { x: 0, y: 1 }, data
          }].concat(cats.map((c, i) => ({ type: 'scatter', name: c, data: [], color: ctx.color(i) })))
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
