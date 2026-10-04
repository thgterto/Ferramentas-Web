/**
 * Graficário — tipo de gráfico `funnel`: Funil de conversão.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { kv } = B.lib;

  B.register({
    id: 'funnel', name: 'Funil de conversão', group: 'Fluxo', shape: 'wide',
    family: 'tab',
    roles: ['Etapa (em ordem)', 'Quantidade'],
    hint: 'Etapas ordenadas: cor ordinal (um matiz, claro → escuro) e conversão entre etapas.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'style', l: 'Forma', t: 'seg', o: [['bars', 'Barras'], ['funnel', 'Funil']], d: 'bars' },
      { k: 'pctOf', l: 'Percentual em relação a', t: 'seg', o: [['top', 'Topo'], ['prev', 'Etapa anterior']], d: 'top' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const items = kv(ctx);
      const top = items.length ? items[0].value : 1;
      const hue = GG.tokens.THEMES[S.theme] ? GG.tokens.THEMES[S.theme].order[0] : 'blue';
      const ord = GG.color.ordinal(hue, items.length, ctx.mode).slice().reverse(); // fraco→forte invertido: topo = mais saliente
      const cols = items.map((x, i) => (ctx.hiOn ? (ctx.isHi(x.name) ? ctx.accentColor(0) : T.deemph) : ord[i]));
      const pTop = items.map((x) => x.value / top * 100);
      const pPrev = items.map((x, i) => (i === 0 ? 100 : x.value / items[i - 1].value * 100));
      const names = items.map((x) => x.name);
      const L = ctx.layout;
      const lbl = (i) => ctx.fmt(items[i].value) + '   ' + ctx.R.fmt(S.pctOf === 'prev' ? pPrev[i] : pTop[i], { d: 0, s: '%' });
      const tip = ctx.fn('tipItem', { f: ctx.f, c: ctx.c, nameDim: 1, rows: [{ l: '', d: 0 }, { l: 'do topo', d: 2, f: { d: 1, s: '%' } }, { l: 'da etapa anterior', d: 3, f: { d: 1, s: '%' } }] });
      if (S.style === 'funnel') {
        return {
          option: {
            tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: '', d: 'v' }] }) }),
            series: [{
              type: 'funnel', sort: 'none', gap: 2, left: '12%', width: '60%', top: L.top, bottom: L.bottom, minSize: '12%',
              label: { show: S.labels !== 'none', position: 'right', color: T.ink2, fontSize: 12, fontFamily: GG.FONT },
              labelLine: { lineStyle: { color: T.axis } },
              itemStyle: { borderColor: T.surface, borderWidth: 0 },
              data: items.map((x, i) => ({ name: x.name, value: x.value, itemStyle: { color: cols[i] }, label: { formatter: (x.name + '   ' + lbl(i)).replace(/[{}]/g, '') } }))
            }]
          },
          meta: { annot: false }
        };
      }
      ctx.layout.right = Math.max(ctx.layout.right, 120);
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: tip }),
          xAxis: { type: 'value', show: false, max: top * 1.02 },
          yAxis: B.catAxis(ctx, names, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.ink2, fontSize: 12, fontWeight: 500, width: Math.max(90, ctx.W * 0.26), overflow: 'truncate' } }),
          series: [{
            type: 'bar', name: 'Etapas', barMaxWidth: 26, encode: { x: 0, y: 1 },
            data: items.map((x, i) => ({ value: [x.value, x.name, pTop[i], i === 0 ? null : pPrev[i]], itemStyle: { color: cols[i], borderRadius: [0, 4, 4, 0] },
              label: S.labels !== 'none' ? B.dataLabel(ctx, { position: 'right', formatter: lbl(i).replace(/[{}]/g, '') }) : undefined }))
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
