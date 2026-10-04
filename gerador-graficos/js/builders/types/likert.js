/**
 * Graficário — tipo de gráfico `likert`: Likert (escala de concordância).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'likert', name: 'Likert (escala de concordância)', group: 'Pesquisa', shape: 'wide',
    family: 'tab',
    roles: ['Pergunta', 'Nível 1 (mais negativo)', '…', 'Nível N (mais positivo)'],
    hint: 'Respostas em escala ordenada, centradas no neutro. Negativos à esquerda, positivos à direita.',
    hl: 'none', annot: false,
    settings: [
      { k: 'neutral', l: 'Neutro', t: 'select', o: [['split', 'Dividido ao meio'], ['omit', 'Omitir do gráfico']], d: 'split' },
      { k: 'pair', l: 'Cores (negativo ↔ positivo)', t: 'select', o: Object.keys(GG.tokens.DIV_PAIRS).map((k) => [k, GG.tokens.DIV_PAIRS[k].name]), d: 'orange-blue' },
      { k: 'sort', l: 'Ordenar perguntas', t: 'select', o: [['none', 'Ordem dos dados'], ['pos', 'Mais positivas primeiro']], d: 'pos' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const levels = series.map((s) => s.name);
      const L = levels.length;
      const odd = L % 2 === 1;
      const half = Math.floor(L / 2);
      const negIdx = Array.from({ length: half }, (_, i) => i);
      const posIdx = Array.from({ length: half }, (_, i) => L - half + i);
      const neuIdx = odd ? half : -1;
      const tot = cats.map((_, r) => series.reduce((a, s) => a + (s.values[r] || 0), 0) - (S.neutral === 'omit' && odd ? (series[neuIdx].values[r] || 0) : 0));
      const pct = series.map((s) => s.values.map((v, r) => (tot[r] ? (v || 0) / tot[r] * 100 : 0)));
      let order = cats.map((_, i) => i);
      if (S.sort === 'pos') order = B.sortIdx(cats.map((_, r) => posIdx.reduce((a, j) => a + pct[j][r], 0)), 'desc');
      const names = order.map((i) => cats[i]);
      const p = GG.tokens.DIV_PAIRS[S.pair] || GG.tokens.DIV_PAIRS['orange-blue'];
      // ordinal() devolve fraco→forte (perto do fundo → saliente) nos dois modos
      const negCols = GG.color.ordinal(p.neg, Math.max(half, 1) + 1, ctx.mode).slice(1);
      const posCols = GG.color.ordinal(p.pos, Math.max(half, 1) + 1, ctx.mode).slice(1);
      const gray = GG.tokens.RAMPS.gray;
      const neuCol = ctx.mode === 'dark' ? gray[9] : gray[3];
      const colorOf = (j) => {
        if (j === neuIdx) return neuCol;
        if (j < half) return negCols[half - 1 - j] || negCols[0];
        return posCols[j - (L - half)] || posCols[0];
      };
      const plotW = ctx.W - 220;
      const mkLabel = (v, col) => (S.labels !== 'none' && Math.abs(v) / 200 * plotW > 30 ? { show: true, position: 'inside', color: GG.color.inkOn(col), fontSize: 11, fontFamily: GG.FONT, formatter: ctx.fn('label', { f: { d: 0, s: '%' }, abs: true }) } : undefined);
      const out = [];
      const push = (name, j, vals, sign) => {
        const col = colorOf(j);
        out.push({
          type: 'bar', name, stack: 'l', barMaxWidth: 24, color: col, legendIcon: 'roundRect',
          itemStyle: { color: col, borderColor: T.surface, borderWidth: 1 },
          data: order.map((r) => { const v = sign * vals[r]; return { value: v, label: mkLabel(v, col) }; })
        });
      };
      if (odd && S.neutral === 'split') {
        push(levels[neuIdx], neuIdx, pct[neuIdx].map((v) => v / 2), -1);
        push(levels[neuIdx], neuIdx, pct[neuIdx].map((v) => v / 2), 1);
      }
      negIdx.slice().reverse().forEach((j) => push(levels[j], j, pct[j], -1));
      posIdx.forEach((j) => push(levels[j], j, pct[j], 1));
      const legendNames = levels.filter((_, j) => !(j === neuIdx && S.neutral === 'omit'));
      const legend = B.legend(ctx, legendNames);
      const rows = levels.map((lv, j) => ({ name: lv, color: colorOf(j), values: order.map((r) => pct[j][r]) }));
      const maxSide = Math.max(...names.map((_, k) => Math.max(
        negIdx.reduce((a, j) => a + rows[j].values[k], 0) + (odd && S.neutral === 'split' ? rows[neuIdx].values[k] / 2 : 0),
        posIdx.reduce((a, j) => a + rows[j].values[k], 0) + (odd && S.neutral === 'split' ? rows[neuIdx].values[k] / 2 : 0))));
      const lim = Math.min(100, Math.ceil(maxSide / 10) * 10 + 10);
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: ctx.fn('tipTable', { c: ctx.c, cats: names, rows: rows.filter((_, j) => !(j === neuIdx && S.neutral === 'omit')), f: { d: 0, s: '%' } }) }),
          xAxis: B.valueAxis(ctx, { min: -lim, max: lim, axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axisAbs', { f: { d: 0, s: '%' } }) } }),
          yAxis: B.catAxis(ctx, names, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.ink2, fontSize: 12, width: Math.max(100, ctx.W * 0.3), overflow: 'break' } }),
          series: out.concat([{ type: 'line', name: '__zero', data: [], markLine: { silent: true, symbol: 'none', data: [{ xAxis: 0 }], lineStyle: { color: T.ink2, width: 1, type: 'solid' }, label: { show: false } } }])
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
