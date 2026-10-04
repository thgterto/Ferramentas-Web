/**
 * Graficário — tipo de gráfico `chord`: Cordas (relações mútuas).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { flows } = B.lib;

  B.register({
    id: 'chord', name: 'Cordas (relações mútuas)', group: 'Fluxo', shape: 'wide',
    family: 'flow',
    roles: ['Origem', 'Destino', 'Valor'],
    hint: 'Fluxos entre membros de um mesmo grupo (migração entre regiões, trocas entre áreas).',
    hl: 'categories', annot: false,
    settings: [],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const { links, names } = flows(ctx);
      const L = ctx.layout;
      const areaH = H - L.top - L.bottom;
      const r = Math.min(W - 180, areaH - 40) / 2;
      const colorOf = (n) => (ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(names.indexOf(n)) : T.deemph) : ctx.color(names.indexOf(n)));
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipFlow', { f: ctx.f, c: ctx.c }) }),
          series: [{
            type: 'chord', center: ['50%', L.top + areaH / 2], radius: [Math.max(r - 12, 20), Math.max(r, 30)], padAngle: 2,
            itemStyle: { borderRadius: [0, 0, 3, 3] },
            label: { show: S.labels !== 'none', position: 'outside', distance: 8, color: T.ink2, fontSize: 12, fontFamily: GG.FONT },
            lineStyle: { color: 'source', opacity: 0.3 },
            emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.6 } },
            data: names.map((n) => ({ name: n, itemStyle: { color: colorOf(n) } })),
            links: links.map((l) => ({ source: l.source, target: l.target, value: l.value }))
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
