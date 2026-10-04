/**
 * Graficário — tipo de gráfico `calendar`: Calendário (dia a dia).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);
  const { SCALE_SETTINGS, colorScale } = B.lib;

  B.register({
    id: 'calendar', name: 'Calendário (dia a dia)', group: 'Tempo', shape: 'wide',
    family: 'dates',
    roles: ['Data (aaaa-mm-dd)', 'Valor'],
    hint: 'Ritmos diários e semanais ao longo do ano (vendas, acessos, incidentes).',
    hl: 'none', annot: false,
    settings: SCALE_SETTINGS.slice(0, 2).concat([{ k: 'weekStart', l: 'Semana começa', t: 'seg', o: [['1', 'Segunda'], ['0', 'Domingo']], d: '1' }]),
    build(ctx) {
      const { T, S, W } = ctx;
      const rows = ctx.data.rows.map((r) => ({ d: GG.data.toDate(r[0]), v: N(r[1]) })).filter((x) => x.d && x.v !== null);
      const years = [...new Set(rows.map((r) => r.d.getFullYear()))].sort().slice(-3);
      const cs = colorScale(ctx, rows.map((r) => r.v));
      const L = ctx.layout;
      const availH = ctx.H - L.top - L.bottom;
      const cell = Math.max(6, Math.min((W - 90) / 54, (availH / years.length - 34) / 7));
      const cals = years.map((y, i) => ({
        range: String(y), top: L.top + 22 + i * (cell * 7 + 40), left: 56, cellSize: [cell, cell], orient: 'horizontal',
        splitLine: { show: false }, itemStyle: { color: T.surface2, borderColor: T.surface, borderWidth: 2 },
        yearLabel: { show: years.length > 1, position: 'left', margin: 36, color: T.ink2, fontSize: 12, fontFamily: GG.FONT },
        dayLabel: { firstDay: +S.weekStart, nameMap: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'], color: T.muted, fontSize: 10, margin: 6 },
        monthLabel: { nameMap: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], color: T.muted, fontSize: 11, margin: 6, fontFamily: GG.FONT }
      }));
      return {
        option: {
          calendar: cals, visualMap: cs.vm,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipCal', { f: ctx.f, c: ctx.c }) }),
          series: years.map((y, i) => ({
            type: 'heatmap', coordinateSystem: 'calendar', calendarIndex: i, name: String(y),
            data: rows.filter((r) => r.d.getFullYear() === y).map((r) => [GG.data.iso(r.d), r.v]),
            itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: 2 },
            emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 1 } }
          }))
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
