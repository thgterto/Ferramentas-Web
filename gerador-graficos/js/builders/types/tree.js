/**
 * Graficário — tipo de gráfico `tree`: Árvore / organograma.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { toTree } = B.lib;

  B.register({
    id: 'tree', name: 'Árvore / organograma', group: 'Hierarquia', shape: 'wide',
    family: 'tree',
    roles: ['Nível 1', 'Nível 2', '…', 'Valor (opc.)'],
    hint: 'Estruturas: organogramas, árvores de decisão, taxonomias.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'orient', l: 'Direção', t: 'seg', o: [['LR', '→'], ['TB', '↓']], d: 'LR' },
      { k: 'rootName', l: 'Nome da raiz', t: 'text', d: '' },
      { k: 'edge', l: 'Ligações', t: 'seg', o: [['curve', 'Curvas'], ['polyline', 'Ângulos']], d: 'curve' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { root, valued } = toTree(ctx);
      let top = root;
      if (root.children && root.children.length === 1 && !S.rootName) top = root.children[0];
      else top.name = S.rootName || 'Total';
      const paint = (n, depth) => {
        const hi = ctx.isHi(n.name);
        const col = hi ? ctx.accentColor(0) : depth === 0 ? T.ink : ctx.color(0);
        n.itemStyle = { color: n.children ? col : T.surface, borderColor: col, borderWidth: 2 };
        if (valued && n.value !== undefined && S.labels === 'all') n.label = { formatter: (n.name + '  ' + ctx.fmt(n.value)).replace(/[{}]/g, '') };
        (n.children || []).forEach((c) => paint(c, depth + 1));
      };
      paint(top, 0);
      const L = ctx.layout;
      const lr = S.orient === 'LR';
      const leaves = [];
      const walk = (n) => { if (n.children) n.children.forEach(walk); else leaves.push(n.name); };
      walk(top);
      const leftM = lr ? Math.min(ctx.W * 0.3, B.measure(top.name, 12) + 24) : 30;
      const rightM = lr ? Math.min(ctx.W * 0.36, Math.max(...leaves.map((x) => B.measure(x, 12))) + 24) : 30;
      const bottomM = lr ? 0 : Math.min(ctx.H * 0.35, Math.max(...leaves.map((x) => B.measure(x, 12))) + 16);
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: valued ? ctx.fn('tipTree', { f: ctx.f, c: ctx.c }) : ctx.fn('tipText', { tpl: '{n}', c: ctx.c }) }),
          series: [{
            type: 'tree', data: [top], orient: S.orient, edgeShape: S.edge, initialTreeDepth: -1, expandAndCollapse: true,
            top: L.top + (lr ? 0 : 16), bottom: L.bottom + bottomM, left: leftM, right: rightM,
            symbol: 'circle', symbolSize: 10, roam: false,
            lineStyle: { color: T.axis, width: 1.2, curveness: 0.5 },
            label: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT, position: lr ? 'left' : 'top', verticalAlign: 'middle', align: lr ? 'right' : 'center', distance: 6 },
            leaves: { label: lr ? { position: 'right', align: 'left', verticalAlign: 'middle', color: T.ink2 } : { position: 'bottom', rotate: -90, align: 'left', verticalAlign: 'middle', distance: 8, color: T.ink2 } },
            emphasis: { focus: 'descendant' }
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
