/**
 * Graficário — tipo de gráfico `sunburst`: Sunburst (anéis).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { toTree } = B.lib;

  B.register({
    id: 'sunburst', name: 'Sunburst (anéis)', group: 'Hierarquia', shape: 'wide',
    family: 'tree',
    roles: ['Nível 1', 'Nível 2', '…', 'Valor'],
    hint: 'Hierarquia em anéis: bom para 2–3 níveis e caminhos (orçamento, jornadas).',
    hl: 'categories', annot: false,
    settings: [],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const { root, levels } = toTree(ctx);
      const colorByName = {};
      ctx.data.rows.forEach((r) => { const n = String(r[0]); if (!(n in colorByName)) colorByName[n] = Object.keys(colorByName).length; });
      // a cor do 1º nível desce para todos os descendentes (o sunburst não herda um itemStyle explícito)
      const paint = (n, col) => { n.itemStyle = Object.assign({}, n.itemStyle, { color: col }); (n.children || []).forEach((ch) => paint(ch, col)); };
      root.children.forEach((c) => {
        const i = colorByName[c.name];
        paint(c, ctx.hiOn ? (ctx.isHi(c.name) ? ctx.accentColor(i) : T.deemph) : ctx.color(i));
      });
      const L = ctx.layout;
      const areaH = H - L.top - L.bottom;
      const r = Math.min(W - 32, areaH) / 2;
      const lv = [{}];
      for (let k = 1; k <= levels; k++) {
        const outer = k === levels && levels > 2;
        lv.push({ itemStyle: { opacity: Math.max(0.45, 1 - 0.2 * (k - 1)) }, label: { show: S.labels === 'all' || (S.labels === 'smart' && !outer), minAngle: k === 1 ? 10 : 14 } });
      }
      return {
        option: {
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipTree', { f: ctx.f, c: ctx.c, total: root.value || 0 }) }),
          series: [{
            type: 'sunburst', data: root.children, center: ['50%', L.top + areaH / 2], radius: [r * 0.18, r],
            sort: 'desc', nodeClick: 'rootToNode',
            itemStyle: { borderColor: T.surface, borderWidth: 2 },
            label: { show: S.labels !== 'none', rotate: 'radial', color: T.ink, fontSize: 11, fontFamily: GG.FONT, minAngle: 12, overflow: 'truncate', width: r * 0.3 },
            levels: lv,
            emphasis: { focus: 'ancestor' }
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
