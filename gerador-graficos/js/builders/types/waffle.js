/**
 * Graficário — tipo de gráfico `waffle`: Waffle (100 quadrados).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { kv } = B.lib;

  B.register({
    id: 'waffle', name: 'Waffle (100 quadrados)', group: 'Parte do todo', shape: 'wide',
    family: 'tab',
    roles: ['Categoria', 'Valor'],
    hint: '"3 em cada 10": proporções concretas, contáveis. Destaque a categoria da história.',
    hl: 'categories', annot: false,
    settings: [{ k: 'cells', l: 'Quadrados', t: 'select', o: [['100', '10 × 10'], ['50', '10 × 5'], ['200', '20 × 10']], d: '100' }],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const items = kv(ctx).filter((x) => x.value > 0);
      const total = items.reduce((a, b) => a + b.value, 0) || 1;
      const nCells = parseInt(S.cells, 10) || 100;
      const cols = nCells === 200 ? 20 : 10, rows = nCells / cols;
      // maior resto: os quadrados somam exatamente nCells
      const raw = items.map((x) => x.value / total * nCells);
      const cnt = raw.map(Math.floor);
      let left = nCells - cnt.reduce((a, b) => a + b, 0);
      raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { cnt[i]++; left--; } });
      const names = items.map((x, i) => x.name + '  ' + ctx.R.fmt(x.value / total * 100, { d: 0, s: '%' }));
      const legend = S.legend !== 'none' ? B.legend(ctx, names, { icon: 'rect', itemWidth: 10, itemHeight: 10 }) : undefined;
      const L = ctx.layout;
      const availW = W - 32, availH = H - L.top - L.bottom;
      const cell = Math.min(availW / cols, availH / rows);
      const gw = cell * cols, gh = cell * rows;
      const series = [];
      let k = 0;
      items.forEach((x, i) => {
        const col = ctx.hiOn ? (ctx.isHi(x.name) ? ctx.accentColor(x.idx) : T.deemph) : ctx.color(x.idx);
        const data = [];
        for (let c = 0; c < cnt[i]; c++, k++) {
          // preenche por colunas, de baixo para cima (leitura como barra)
          const cx = Math.floor(k / rows), cy = k % rows;
          data.push([cx, cy, 0]);
        }
        series.push({ type: 'custom', name: names[i], color: col, renderItem: ctx.fn('rWaffle', { colors: [col], gap: Math.max(2, cell * 0.12) }), data,
          tooltip: { formatter: ctx.fn('tipText', { tpl: (x.name + ': ' + ctx.fmt(x.value) + ' (' + cnt[i] + ' de ' + nCells + ')').replace(/[{}]/g, ''), c: ctx.c }) } });
      });
      return {
        option: {
          legend,
          grid: { left: 16 + (availW - gw) / 2, top: L.top + (availH - gh) / 2, width: gw, height: gh },
          xAxis: { type: 'value', min: -0.5, max: cols - 0.5, show: false },
          yAxis: { type: 'value', min: -0.5, max: rows - 0.5, show: false },
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          series
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
