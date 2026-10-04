/**
 * Graficário — tipo de gráfico `sankey`: Sankey (fluxos).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { flows } = B.lib;

  B.register({
    id: 'sankey', name: 'Sankey (fluxos)', group: 'Fluxo', shape: 'wide',
    family: 'flow',
    roles: ['Origem', 'Destino', 'Valor'],
    hint: 'De onde vem e para onde vai: orçamento, energia, jornada do cliente. A cor segue a origem.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'colorBy', l: 'Cores', t: 'select', o: [['origin', 'Só nas origens (recomendado)'], ['all', 'Em todos os nós (até 8)']], d: 'origin' },
      { k: 'orient', l: 'Direção', t: 'seg', o: [['horizontal', '→'], ['vertical', '↓']], d: 'horizontal' },
      { k: 'align', l: 'Alinhamento dos nós', t: 'select', o: [['justify', 'Justificado'], ['left', 'À esquerda'], ['right', 'À direita']], d: 'justify' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { links, names } = flows(ctx);
      const targets = new Set(links.map((l) => l.target));
      const origins = names.filter((n) => !targets.has(n));
      const colorOf = (n) => {
        if (ctx.hiOn) return ctx.isHi(n) ? ctx.accentColor(Math.max(0, origins.indexOf(n))) : T.deemph;
        if (S.colorBy === 'all') return ctx.color(names.indexOf(n));
        const oi = origins.indexOf(n);
        return oi >= 0 ? ctx.color(oi) : (ctx.mode === 'dark' ? '#8c8a84' : '#6f6e69');
      };
      // cor do link: a da origem "raiz" que alimenta o nó de origem do link
      const rootOf = {};
      origins.forEach((o) => { rootOf[o] = o; });
      for (let it = 0; it < 6; it++) links.forEach((l) => { if (rootOf[l.source] && !rootOf[l.target]) rootOf[l.target] = rootOf[l.source]; });
      const linkCol = (l) => {
        if (ctx.hiOn) return ctx.isHi(l.source) || ctx.isHi(l.target) ? colorOf(ctx.isHi(l.source) ? l.source : l.target) : T.deemph;
        return S.colorBy === 'all' ? colorOf(l.source) : colorOf(rootOf[l.source] || l.source);
      };
      const L = ctx.layout;
      const horiz = S.orient !== 'vertical';
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipFlow', { f: ctx.f, c: ctx.c }) }),
          series: [{
            type: 'sankey', orient: S.orient, nodeAlign: S.align, left: 16, right: horiz ? 150 : 16, top: L.top, bottom: L.bottom + (horiz ? 0 : 30),
            nodeWidth: 10, nodeGap: 14, layoutIterations: 48, draggable: true,
            label: { show: S.labels !== 'none', color: T.ink2, fontSize: 12, fontFamily: GG.FONT, formatter: ctx.fn('label', { f: ctx.f, tpl: S.labels === 'all' ? '{n}  {v}' : '{n}' }) },
            itemStyle: { borderWidth: 0 },
            lineStyle: { curveness: 0.5, opacity: 0.32 },
            emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.6 } },
            data: names.map((n) => ({ name: n, itemStyle: { color: colorOf(n) } })),
            links: links.map((l) => ({ ...l, lineStyle: { color: linkCol(l) } }))
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
