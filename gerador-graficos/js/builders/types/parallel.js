/**
 * Graficário — tipo de gráfico `parallel`: Coordenadas paralelas.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'parallel', name: 'Coordenadas paralelas', group: 'Relação', shape: 'wide',
    family: 'tab',
    roles: ['Item', 'Dimensão A', 'Dimensão B', '…'],
    hint: 'Muitos atributos de muitos itens: perfis, trade-offs. Destaque 1–3 itens.',
    hl: 'categories', annot: false,
    settings: [],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const dims = t.columns.slice(1);
      const L = ctx.layout;
      const items = t.rows.map((r) => ({ name: String(r[0]), v: dims.map((_, j) => N(r[j + 1])) }));
      const ordered = items.slice().sort((a, b) => (ctx.isHi(a.name) ? 1 : 0) - (ctx.isHi(b.name) ? 1 : 0));
      return {
        option: {
          parallel: { left: 40, right: 60, top: L.top + 30, bottom: L.bottom + 6, parallelAxisDefault: {
            type: 'value', nameLocation: 'end', nameGap: 12, nameTextStyle: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT, fontWeight: 600, width: 90, overflow: 'break' },
            axisLine: { lineStyle: { color: T.axis } }, axisTick: { show: false }, axisLabel: { color: T.muted, fontSize: 10, formatter: ctx.fn('axis', { f: { c: true } }) }, splitLine: { show: false } } },
          parallelAxis: dims.map((d, j) => ({ dim: j, name: d, inverse: false, scale: true })),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipText', { tpl: '{s}', c: ctx.c }) }),
          series: ordered.map((it) => {
            const hi = !ctx.hiOn || ctx.isHi(it.name);
            const col = ctx.hiOn ? (hi ? ctx.accentColor(items.indexOf(it) % 8) : T.deemph) : ctx.color(0);
            return { type: 'parallel', name: it.name, data: [it.v], smooth: false, lineStyle: { width: hi && ctx.hiOn ? 2.5 : 1.5, color: col, opacity: ctx.hiOn ? (hi ? 1 : 0.7) : 0.55 },
              emphasis: { lineStyle: { width: 3, opacity: 1 } }, z: hi ? 3 : 2 };
          })
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
