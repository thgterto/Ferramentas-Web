/**
 * Graficário — tipo de gráfico `stripes`: Listras de anomalia.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { colorScale } = B.lib;

  B.register({
    id: 'stripes', name: 'Listras de anomalia', group: 'Tempo', shape: 'wide',
    family: 'tab',
    roles: ['Período', 'Anomalia (desvio da média)'],
    hint: 'Uma faixa de cor por período, divergindo de uma referência. Impacto imediato, leitura grosseira.',
    hl: 'none', annot: false,
    settings: [
      { k: 'pair', l: 'Polos (divergente)', t: 'select', o: Object.keys(GG.tokens.DIV_PAIRS).map((k) => [k, GG.tokens.DIV_PAIRS[k].name]), d: 'blue-red' },
      { k: 'center', l: 'Referência (centro)', t: 'number', d: 0 },
      { k: 'showAxis', l: 'Mostrar anos no eixo', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const s = series[0] || { values: [] };
      S.scale = 'div';
      const cs = colorScale(ctx, s.values);
      return {
        option: {
          grid: B.grid(ctx, { outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' }),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f: Object.assign({ sg: true }, ctx.f), c: ctx.c, rows: [{ l: '', d: 2 }] }) }),
          xAxis: B.catAxis(ctx, cats, { axisLine: { show: false }, axisLabel: { show: !!S.showAxis, color: T.muted, fontSize: 11, hideOverlap: true } }),
          yAxis: { type: 'category', data: [''], show: false },
          visualMap: cs.vm,
          series: [{ type: 'heatmap', name: s.name, data: s.values.map((v, i) => ({ name: cats[i], value: [i, 0, v] })).filter((d) => d.value[2] !== null), itemStyle: { borderWidth: 0 }, emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 1 } } }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
