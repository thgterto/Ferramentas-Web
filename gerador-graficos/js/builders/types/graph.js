/**
 * Graficário — tipo de gráfico `graph`: Rede (grafo).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);
  const { flows } = B.lib;

  B.register({
    id: 'graph', name: 'Rede (grafo)', group: 'Fluxo', shape: 'wide',
    family: 'flow',
    roles: ['Nó A', 'Nó B', 'Peso'],
    hint: 'Conexões e comunidades. Tamanho do nó = soma das ligações. Arraste para explorar.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'layout', l: 'Disposição', t: 'seg', o: [['force', 'Forças'], ['circular', 'Círculo']], d: 'force' },
      { k: 'topLabels', l: 'Rotular os N maiores nós', t: 'number', d: 12 }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { links, names } = flows(ctx);
      const deg = {};
      links.forEach((l) => { deg[l.source] = (deg[l.source] || 0) + l.value; deg[l.target] = (deg[l.target] || 0) + l.value; });
      const dv = names.map((n) => deg[n] || 0);
      const mx = Math.max(...dv, 1), mn = Math.min(...dv, 0);
      const rank = names.slice().sort((a, b) => deg[b] - deg[a]);
      const topN = parseInt(S.topLabels, 10) || 12;
      const wmax = Math.max(...links.map((l) => l.value), 1);
      const L = ctx.layout;
      const size = (v) => 8 + (Math.sqrt(v) - Math.sqrt(mn)) / ((Math.sqrt(mx) - Math.sqrt(mn)) || 1) * 30;
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipFlow', { f: ctx.f, c: ctx.c, node: 'conexões (soma)' }) }),
          series: [{
            type: 'graph', layout: S.layout, top: L.top, bottom: L.bottom, left: 30, right: 30, roam: true, draggable: true,
            force: { repulsion: Math.max(80, Math.min(400, ctx.W * (ctx.H - L.top - L.bottom) / (names.length * 60))), edgeLength: [30, Math.max(50, Math.min(130, ctx.W / 8))], gravity: 0.1, layoutAnimation: !ctx.thumb },
            circular: { rotateLabel: true },
            label: { show: S.labels !== 'none', position: 'right', color: T.ink2, fontSize: 11, fontFamily: GG.FONT },
            lineStyle: { color: T.axis, curveness: S.layout === 'circular' ? 0.25 : 0.08, opacity: 0.9 },
            emphasis: { focus: 'adjacency', lineStyle: { width: 3, color: T.ink2 } },
            data: names.map((n) => {
              const hi = ctx.hiOn ? ctx.isHi(n) : true;
              const col = ctx.hiOn ? (hi ? ctx.accentColor(0) : T.deemph) : ctx.color(0);
              return { name: n, value: deg[n] || 0, symbolSize: size(deg[n] || 0), itemStyle: B.ring(ctx, col), label: { show: S.labels === 'all' || (S.labels === 'smart' && (rank.indexOf(n) < topN || ctx.isHi(n))) } };
            }),
            links: links.map((l) => ({ source: l.source, target: l.target, value: l.value, lineStyle: { width: 0.8 + l.value / wmax * 3.2 } }))
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
