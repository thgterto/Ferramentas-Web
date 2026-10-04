/**
 * Graficário — tipo de gráfico `treemap`: Treemap.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { toTree } = B.lib;

  B.register({
    id: 'treemap', name: 'Treemap', group: 'Hierarquia', shape: 'wide',
    family: 'tree',
    roles: ['Nível 1', 'Nível 2 (opc.)', '…', 'Valor'],
    hint: 'Hierarquia por área. Cores só no primeiro nível; o tamanho carrega o valor.',
    hl: 'categories', annot: false,
    settings: [{ k: 'zoom', l: 'Clique para aproximar', t: 'toggle', d: false }],
    build(ctx) {
      const { T, S } = ctx;
      const { root, levels } = toTree(ctx);
      root.children.sort((a, b) => (b.value || 0) - (a.value || 0));
      const colorByName = {};
      ctx.data.rows.forEach((r) => { const n = String(r[0]); if (!(n in colorByName)) colorByName[n] = Object.keys(colorByName).length; });
      const paint = (n, col, depth) => {
        n.itemStyle = Object.assign({}, n.itemStyle, { color: col });
        n.label = { color: GG.color.inkOn(col) };
        // o rótulo superior fica na faixa da borda (cor do fundo), então usa a tinta do tema
        if (depth === 1 && levels > 1) n.upperLabel = { color: T.ink };
        (n.children || []).forEach((c) => paint(c, col, depth + 1));
      };
      root.children.forEach((c) => {
        const i = colorByName[c.name];
        const col = ctx.hiOn ? (ctx.isHi(c.name) ? ctx.accentColor(i) : T.deemph) : ctx.color(i);
        paint(c, col, 1);
      });
      const L = ctx.layout;
      const total = root.value || 1;
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipTree', { f: ctx.f, c: ctx.c, total, dropRoot: true }) }),
          series: [{
            type: 'treemap', name: 'Total', data: root.children, top: L.top, bottom: L.bottom, left: 16, right: 16,
            roam: false, nodeClick: S.zoom ? 'zoomToNode' : false, breadcrumb: { show: !!S.zoom, bottom: 6, itemStyle: { color: T.surface2, borderColor: T.border, textStyle: { color: T.ink2 } } },
            visibleMin: 200, squareRatio: 0.5 * (1 + Math.sqrt(5)),
            label: { show: S.labels !== 'none', fontSize: 12, fontFamily: GG.FONT, formatter: ctx.fn('label', { f: ctx.f, tpl: S.labels === 'all' || levels === 1 ? '{n}\n{v}' : '{n}' }), overflow: 'truncate', padding: 4 },
            upperLabel: { show: levels > 1 && S.labels !== 'none', height: 22, fontSize: 12, fontWeight: 600, fontFamily: GG.FONT },
            itemStyle: { borderColor: T.surface, borderWidth: 2, gapWidth: 2 },
            levels: [
              { itemStyle: { borderColor: T.surface, borderWidth: 3, gapWidth: 3 }, upperLabel: { show: false } },
              { itemStyle: { borderColor: T.surface, borderWidth: 1, gapWidth: 2 } },
              { itemStyle: { borderColor: T.surface, borderWidth: 1, gapWidth: 1 } }
            ],
            emphasis: { itemStyle: { borderColor: T.ink } }
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
