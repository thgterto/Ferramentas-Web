/**
 * Graficário — tipo de gráfico `bar`: Barras / colunas.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);
  const { SORT, ORIENT, labelPos } = B.lib;

  B.register({
    id: 'bar', name: 'Barras / colunas', group: 'Comparação', shape: 'wide',
    family: 'tab', cartesian: true,
    roles: ['Categoria', 'Série (número)', '…mais séries'],
    hint: 'Comparar magnitudes entre categorias. Uma série = uma cor; destaque a categoria que conta a história.',
    hl: 'auto', annot: true,
    settings: [
      ORIENT('v'),
      { k: 'mode', l: 'Várias séries', t: 'select', o: [['grouped', 'Lado a lado'], ['stacked', 'Empilhadas'], ['percent', 'Empilhadas 100%']], d: 'grouped' },
      SORT,
      { k: 'topN', l: 'Agrupar além do top N em "Outros"', t: 'number', d: '', ph: 'ex.: 8' },
      { k: 'colorBy', l: 'Cor (uma série)', t: 'select', o: [['single', 'Uma cor'], ['ordinal', 'Rampa ordinal (categorias ordenadas)']], d: 'single' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      let { cats, series } = B.wide(ctx);
      const horiz = S.orientation === 'h';
      const mode = series.length > 1 ? S.mode : 'grouped';
      const stacked = mode !== 'grouped';
      // total por categoria para ordenar/agrupar
      let totals = cats.map((_, i) => series.reduce((s, x) => s + (x.values[i] || 0), 0));
      let order = B.sortIdx(totals, S.sort);
      const topN = parseInt(S.topN, 10);
      let hasOther = false;
      if (topN > 0 && cats.length > topN + 1) {
        const keep = (S.sort === 'none' ? B.sortIdx(totals, 'desc') : order).slice(0, topN);
        const rest = order.filter((i) => keep.indexOf(i) < 0);
        const keepSet = new Set(keep);
        order = order.filter((i) => keepSet.has(i));
        cats = cats.concat(['Outros']);
        series = series.map((s) => ({ ...s, values: s.values.concat([rest.reduce((a, i) => a + (s.values[i] || 0), 0)]) }));
        totals = totals.concat([rest.reduce((a, i) => a + totals[i], 0)]);
        order.push(cats.length - 1);
        hasOther = true;
      }
      const catNames = order.map((i) => cats[i]);
      let seriesVals = series.map((s) => order.map((i) => s.values[i]));
      if (mode === 'percent') {
        seriesVals = seriesVals.map((vals) => vals.map((v, k) => { const t = order.map((i) => totals[i])[k]; return t ? (v || 0) / t * 100 : 0; }));
      }
      const f = mode === 'percent' ? { s: '%', d: 0 } : ctx.f;
      const single = series.length === 1;
      const ordinalCols = single && S.colorBy === 'ordinal' ? GG.color.ordinal(GG.tokens.THEMES[S.theme] ? GG.tokens.THEMES[S.theme].order[0] : 'blue', catNames.length, ctx.mode) : null;

      // ponta arredondada só no último segmento de cada pilha
      const lastPos = catNames.map((_, k) => { let li = -1; seriesVals.forEach((vals, j) => { if ((vals[k] || 0) > 0) li = j; }); return li; });
      const lastNeg = catNames.map((_, k) => { let li = -1; seriesVals.forEach((vals, j) => { if ((vals[k] || 0) < 0) li = j; }); return li; });

      const lbl = S.labels;
      const out = series.map((s, j) => {
        const vals = seriesVals[j];
        const smart = single ? B.smartIdx(ctx, vals, catNames, { extremes: !ctx.hiOn }) : null;
        const serColor = ctx.pick(s.name, s.idx);
        const data = vals.map((v, k) => {
          const name = catNames[k];
          let color;
          if (single) {
            if (hasOther && order[k] === cats.length - 1) color = T.deemph;
            else if (ctx.hiOn) color = ctx.isHi(name) ? ctx.accentColor(0) : T.deemph;
            else color = ordinalCols ? ordinalCols[k] : ctx.color(0);
          } else color = serColor;
          const neg = (v || 0) < 0;
          let radius = B.barRadius(horiz, neg);
          if (stacked) radius = (neg ? lastNeg[k] === j : lastPos[k] === j) ? B.barRadius(horiz, neg) : 0;
          const item = { value: v, itemStyle: { color, borderRadius: radius } };
          let show = false;
          if (lbl === 'all') show = !stacked || false;
          else if (lbl === 'smart') show = single ? smart.has(k) : (!stacked && ctx.hiOn && ctx.isHi(s.name));
          if (show && v !== null) item.label = B.dataLabel(ctx, { position: labelPos(horiz, v), formatter: ctx.fn('label', { f }) });
          // rótulo interno em barras horizontais empilhadas quando cabe
          if (stacked && lbl === 'all' && horiz && v) {
            const plotW = ctx.W - 220, maxT = mode === 'percent' ? 100 : Math.max(...totals);
            const px = Math.abs(v) / (maxT || 1) * plotW;
            const txt = ctx.R.fmt(v, f);
            if (px > txt.length * 6.4 + 12) item.label = { show: true, position: 'inside', color: GG.color.inkOn(color), fontSize: 11, formatter: ctx.fn('label', { f }) };
          }
          return item;
        });
        return {
          type: 'bar', name: s.name, data, stack: stacked ? 'total' : undefined,
          barMaxWidth: 24, barCategoryGap: single ? '40%' : '30%', barGap: stacked ? undefined : '12%',
          itemStyle: stacked ? { borderColor: T.surface, borderWidth: 1 } : {},
          legendIcon: 'roundRect', color: serColor,
          emphasis: { focus: single ? 'none' : 'series', itemStyle: { opacity: 1 } },
          blur: { itemStyle: { opacity: 0.35 } }
        };
      });
      // totais no topo de pilhas
      if (stacked && mode !== 'percent' && lbl !== 'none') {
        out.push({
          type: 'bar', name: '__total', stack: 'total', silent: true, barMaxWidth: 24, itemStyle: { color: 'transparent' },
          data: catNames.map((_, k) => ({
            value: 0,
            label: B.dataLabel(ctx, { position: horiz ? 'right' : 'top', fontWeight: 600, color: T.ink, formatter: ctx.R.fmt(totals[order[k]], f).replace(/[{}]/g, '') })
          })),
          tooltip: { show: false }
        });
      }
      const names = series.map((s) => s.name);
      const legend = !single && B.legendNeeded(ctx, names.length) ? B.legend(ctx, names) : undefined;
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx, { axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f }), hideOverlap: true }, max: mode === 'percent' ? 100 : undefined }), { zeroLocked: true });
      if (mode === 'percent') valAx.max = 100;
      if (S.yName) { valAx.name = S.yName; valAx.nameLocation = 'end'; }
      const catAx = B.catAxis(ctx, catNames, horiz ? { inverse: true, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } } : { axisLabel: { color: T.muted, fontSize: 11, hideOverlap: true, interval: 'auto' } });
      if (S.xName) { catAx.name = S.xName; }
      if (horiz && lbl !== 'none') {
        const maxV = mode === 'percent' ? 100 : Math.max(...(stacked ? totals : seriesVals.flat()).filter((v) => v !== null));
        ctx.layout.right = Math.max(ctx.layout.right, B.measure(ctx.R.fmt(maxV, f), 11, 600) + 18);
      }
      if (!horiz && lbl !== 'none') ctx.layout.top += 8;
      const option = {
        grid: B.grid(ctx),
        legend,
        tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: B.tipAxis(ctx, { f, total: stacked && mode !== 'percent', skip: ['__total'], showName: !single }) }),
        xAxis: horiz ? valAx : catAx,
        yAxis: horiz ? catAx : valAx,
        series: out
      };
      return {
        option,
        meta: {
          valueAxis: horiz ? 'x' : 'y', valFmt: f,
          noteCoord: (n) => { const k = catNames.indexOf(String(n.x)); if (k < 0) return null; const v = stacked ? totals[order[k]] : seriesVals[0][k]; return horiz ? [v, catNames[k]] : [catNames[k], v]; }
        }
      };
    }
  });
})(window.GG = window.GG || {});
