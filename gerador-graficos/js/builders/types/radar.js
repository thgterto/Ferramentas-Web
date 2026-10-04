/**
 * Graficário — tipo de gráfico `radar`: Radar.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'radar', name: 'Radar', group: 'Comparação', shape: 'wide',
    family: 'tab',
    roles: ['Dimensão (eixo)', 'Item A', 'Item B (opc.)', '…'],
    hint: 'Perfil multidimensional de 1–3 itens. A área distorce: para comparações precisas, use barras.',
    hl: 'series', annot: false,
    settings: [
      { k: 'max', l: 'Máximo comum dos eixos', t: 'number', d: '', ph: 'auto por eixo' },
      { k: 'shape', l: 'Forma', t: 'seg', o: [['polygon', 'Polígono'], ['circle', 'Círculo']], d: 'polygon' }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const { cats, series } = B.wide(ctx);
      const common = N(S.max);
      const legend = B.legendNeeded(ctx, series.length) ? B.legend(ctx, series.map((s) => s.name)) : undefined;
      const L = ctx.layout;
      const areaH = H - L.top - L.bottom;
      const r = Math.max(40, Math.min(W / 2 - 90, areaH / 2 - 26));
      return {
        option: {
          legend,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipRadar', { f: ctx.f, c: ctx.c, dims: cats }) }),
          radar: {
            center: ['50%', L.top + areaH / 2], radius: r, shape: S.shape, splitNumber: 4,
            indicator: cats.map((c, i) => ({ name: c, max: common !== null ? common : Math.max(...series.map((s) => s.values[i] || 0)) * 1.1 || 1 })),
            axisName: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT },
            splitLine: { lineStyle: { color: T.grid } }, splitArea: { show: false }, axisLine: { lineStyle: { color: T.grid } }
          },
          series: [{
            type: 'radar', name: 'Perfis', symbol: 'circle', symbolSize: 7,
            data: series.map((s) => {
              const col = ctx.pick(s.name, s.idx);
              const dim = ctx.hiOn && !ctx.isHi(s.name);
              return { name: s.name, value: s.values, lineStyle: { width: 2, color: col }, itemStyle: B.ring(ctx, col), areaStyle: { color: col, opacity: dim ? 0.02 : 0.1 }, z: dim ? 1 : 2 };
            }),
            emphasis: { lineStyle: { width: 3 } }
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
