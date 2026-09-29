/**
 * Graficário — construtores cartesianos: comparação, tempo, ranking, desvio.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  const SORT = { k: 'sort', l: 'Ordenar', t: 'select', o: [['none', 'Ordem dos dados'], ['desc', 'Maior → menor'], ['asc', 'Menor → maior']], d: 'none' };
  const ORIENT = (d) => ({ k: 'orientation', l: 'Orientação', t: 'seg', o: [['v', 'Colunas'], ['h', 'Barras']], d: d || 'v' });

  function labelPos(horiz, v) { return horiz ? (v < 0 ? 'left' : 'right') : (v < 0 ? 'bottom' : 'top'); }

  // ================================================================ BARRAS
  B.register({
    id: 'bar', name: 'Barras / colunas', group: 'Comparação', shape: 'wide',
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

  // ================================================================ LINHAS / ÁREAS
  B.register({
    id: 'line', name: 'Linhas / áreas', group: 'Tempo', shape: 'wide',
    roles: ['Período (eixo X)', 'Série (número)', '…mais séries'],
    hint: 'Tendência ao longo do tempo. Com muitas séries, destaque uma e deixe as outras em cinza.',
    hl: 'series', annot: true,
    settings: [
      { k: 'area', l: 'Preenchimento', t: 'select', o: [['none', 'Só linhas'], ['area', 'Área suave'], ['stacked', 'Áreas empilhadas'], ['percent', 'Áreas 100%']], d: 'none' },
      { k: 'smooth', l: 'Curvas suaves', t: 'toggle', d: false },
      { k: 'step', l: 'Degraus', t: 'toggle', d: false },
      { k: 'markers', l: 'Marcadores', t: 'select', o: [['end', 'Só no fim'], ['all', 'Todos os pontos'], ['none', 'Nenhum']], d: 'end' },
      { k: 'index100', l: 'Indexar (1º valor = 100)', t: 'toggle', d: false, help: 'Compara séries de escalas diferentes num só eixo — nunca use dois eixos Y.' },
      { k: 'ma', l: 'Média móvel (períodos)', t: 'number', d: '', ph: 'ex.: 7' },
      { k: 'yZero', l: 'Eixo Y começa no zero', t: 'toggle', d: false }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      let sets = series.map((s) => ({ ...s, vals: s.values.slice() }));
      let f = ctx.f;
      if (S.index100) {
        sets.forEach((s) => { const base = s.vals.find((v) => v !== null && v !== 0); s.vals = s.vals.map((v) => (v === null || !base ? null : v / base * 100)); });
        f = { d: 0 };
      }
      const pct = S.area === 'percent';
      if (pct) {
        const tot = cats.map((_, i) => sets.reduce((a, s) => a + (s.vals[i] || 0), 0));
        sets.forEach((s) => { s.vals = s.vals.map((v, i) => (tot[i] ? (v || 0) / tot[i] * 100 : 0)); });
        f = { s: '%', d: 0 };
      }
      const ma = parseInt(S.ma, 10);
      const stacked = S.area === 'stacked' || pct;
      const many = cats.length > 40;
      const endLabels = S.labels === 'smart' && !stacked && (ctx.hiOn || sets.length <= 5);
      if (endLabels) B.reserveRight(ctx, sets.filter((s) => !ctx.hiOn || ctx.isHi(s.name)).map((s) => s.name + ' ' + ctx.R.fmt(s.vals[s.vals.length - 1], f)));
      const names = sets.map((s) => s.name);
      const legend = B.legendNeeded(ctx, names.length) ? B.legend(ctx, names, { icon: undefined, itemWidth: 16, itemHeight: 8 }) : undefined;
      const out = [];
      // séries sem destaque primeiro (ficam atrás)
      const orderIdx = sets.map((_, i) => i).sort((a, b) => (ctx.isHi(sets[a].name) ? 1 : 0) - (ctx.isHi(sets[b].name) ? 1 : 0));
      orderIdx.forEach((j) => {
        const s = sets[j];
        const col = ctx.pick(s.name, s.idx);
        const dim = ctx.hiOn && !ctx.isHi(s.name);
        const lastIdx = s.vals.reduce((li, v, i) => (v !== null ? i : li), -1);
        const smart = S.labels === 'smart' && sets.length === 1 ? B.smartIdx(ctx, s.vals, cats, { last: true, extremes: true }) : new Set();
        // não repete o rótulo do fim: descarta extremos vizinhos do último ponto ou com o mesmo valor
        [...smart].forEach((i) => { if (i !== lastIdx && (lastIdx - i <= 2 || s.vals[i] === s.vals[lastIdx])) smart.delete(i); });
        const showAllMarkers = S.markers === 'all' && !many;
        const data = s.vals.map((v, i) => {
          const item = { value: v };
          const isEnd = i === lastIdx && S.markers !== 'none';
          if (!showAllMarkers && !isEnd) item.symbol = 'none';
          if (S.labels === 'all' && v !== null && !many) item.label = B.dataLabel(ctx, { position: 'top', formatter: ctx.fn('label', { f }) });
          else if (smart.has(i) && i !== lastIdx && v !== null) item.label = B.dataLabel(ctx, { position: 'top', formatter: ctx.fn('label', { f }) });
          return item;
        });
        const ser = {
          type: 'line', name: s.name, data, color: col,
          smooth: S.smooth ? 0.35 : false, step: S.step ? 'middle' : false,
          symbol: 'circle', symbolSize: 8, showSymbol: true,
          lineStyle: { width: dim ? 1.5 : 2, color: col, cap: 'round', join: 'round', opacity: ma > 1 ? 0.35 : 1 },
          itemStyle: B.ring(ctx, col),
          emphasis: { focus: sets.length > 2 ? 'series' : 'none', lineStyle: { width: 2.5 } },
          blur: { lineStyle: { opacity: 0.25 }, itemStyle: { opacity: 0.25 } },
          z: dim ? 2 : 3, connectNulls: true
        };
        if (stacked) { ser.stack = 'total'; ser.areaStyle = { color: col, opacity: ctx.mode === 'dark' ? 0.22 : 0.16 }; }
        else if (S.area === 'area') ser.areaStyle = { color: col, opacity: ctx.mode === 'dark' ? 0.14 : 0.10 };
        const wantEnd = endLabels && (!ctx.hiOn || ctx.isHi(s.name));
        if (wantEnd && !(ma > 1)) {
          ser.endLabel = { show: true, color: T.ink2, fontSize: 12, fontFamily: GG.FONT, distance: 8,
            formatter: ctx.fn('endLabel', { f, valueOnly: sets.length === 1 }) };
          ser.labelLayout = { moveOverlap: 'shiftY' };
        }
        out.push(ser);
        if (ma > 1) {
          const mv = s.vals.map((_, i) => {
            if (i < ma - 1) return null;
            const w = s.vals.slice(i - ma + 1, i + 1).filter((x) => x !== null);
            return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
          });
          out.push({
            type: 'line', name: s.name + ' (média ' + ma + ')', data: mv, color: col, smooth: 0.3, symbol: 'none', showSymbol: false,
            lineStyle: { width: 2, color: col }, z: 4, connectNulls: true,
            endLabel: endLabels && (!ctx.hiOn || ctx.isHi(s.name)) ? { show: true, color: T.ink2, fontSize: 12, distance: 8, formatter: ctx.fn('endLabel', { f, valueOnly: sets.length === 1 }) } : undefined
          });
        }
      });
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx, { axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f }), hideOverlap: true } }), { scale: !S.yZero && !stacked });
      if (pct) valAx.max = 100;
      if (S.yName) valAx.name = S.yName;
      const xAx = B.catAxis(ctx, cats, { boundaryGap: false, axisLabel: { color: T.muted, fontSize: 11, hideOverlap: true } });
      if (S.xName) xAx.name = S.xName;
      if (S.index100) {
        const a = ctx.S.annotations;
        if (!a.refs.some((r) => N(r.v) === 100)) a.refs = a.refs.concat([{ axis: 'val', v: 100, label: 'Base' }]);
      }
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { formatter: B.tipAxis(ctx, { f, order: sets.length > 3 ? 'desc' : undefined, total: S.area === 'stacked', showName: sets.length > 1 }) }),
          xAxis: xAx, yAxis: valAx, series: out
        },
        meta: {
          valueAxis: 'y', valFmt: f,
          annotSeries: out.length - 1,
          noteCoord: (n) => {
            const i = cats.indexOf(String(n.x)); if (i < 0) return null;
            const s = (n.series && sets.find((x) => x.name === n.series)) || sets.find((x) => ctx.isHi(x.name)) || sets[0];
            let v = s.vals[i];
            if (stacked) v = sets.slice(0, sets.indexOf(s) + 1).reduce((a, x) => a + (x.vals[i] || 0), 0);
            return [cats[i], v];
          }
        }
      };
    }
  });

  // ================================================================ PIRULITO
  B.register({
    id: 'lollipop', name: 'Pirulito', group: 'Comparação', shape: 'wide',
    roles: ['Categoria', 'Valor'],
    hint: 'Como barras, com menos tinta — bom para muitas categorias de valores parecidos.',
    hl: 'categories', annot: true,
    settings: [ORIENT('h'), Object.assign({}, SORT, { d: 'desc' })],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const s = series[0] || { values: [], name: '' };
      const order = B.sortIdx(s.values, S.sort);
      const names = order.map((i) => cats[i]);
      const vals = order.map((i) => s.values[i]);
      const horiz = S.orientation === 'h';
      const colorOf = (n) => (ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(0) : T.deemph) : ctx.color(0));
      const smart = B.smartIdx(ctx, vals, names, { extremes: true, min: true });
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } } : {});
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx), { zeroLocked: true });
      if (horiz) ctx.layout.right = Math.max(ctx.layout.right, 50);
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: B.tipAxis(ctx, { skip: ['__haste'] }) }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx,
          series: [
            { type: 'bar', name: '__haste', barWidth: 2, silent: true, data: vals.map((v, k) => ({ value: v, itemStyle: { color: colorOf(names[k]) } })), tooltip: { show: false } },
            {
              type: 'scatter', name: s.name, symbolSize: 12, z: 3,
              data: vals.map((v, k) => {
                const item = { value: horiz ? [v, names[k]] : [names[k], v], itemStyle: B.ring(ctx, colorOf(names[k])) };
                if (S.labels === 'all' || (S.labels === 'smart' && smart.has(k))) item.label = B.dataLabel(ctx, { position: horiz ? 'right' : 'top', distance: 8, formatter: ctx.fn('label', { f: ctx.f, dim: horiz ? 0 : 1 }) });
                return item;
              })
            }
          ]
        },
        meta: { valueAxis: horiz ? 'x' : 'y', annotSeries: 1, noteCoord: (n) => { const k = names.indexOf(String(n.x)); return k < 0 ? null : horiz ? [vals[k], names[k]] : [names[k], vals[k]]; } }
      };
    }
  });

  // ================================================================ HALTERE (antes → depois)
  B.register({
    id: 'dumbbell', name: 'Haltere (antes → depois)', group: 'Comparação', shape: 'wide',
    roles: ['Item', 'Antes', 'Depois'],
    hint: 'Mudança entre dois momentos para cada item. Um matiz, dois tons.',
    hl: 'categories', annot: true,
    settings: [
      { k: 'sort', l: 'Ordenar', t: 'select', o: [['none', 'Ordem dos dados'], ['after', 'Pelo "depois"'], ['diff', 'Pela variação']], d: 'after' },
      { k: 'showDelta', l: 'Mostrar variação no rótulo', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const a = series[0] || { values: [], name: 'Antes' }, b = series[1] || series[0] || { values: [], name: 'Depois' };
      let order = cats.map((_, i) => i);
      if (S.sort === 'after') order = B.sortIdx(b.values, 'desc');
      if (S.sort === 'diff') order = B.sortIdx(cats.map((_, i) => (b.values[i] || 0) - (a.values[i] || 0)), 'desc');
      const names = order.map((i) => cats[i]);
      const hue = GG.tokens.THEMES[S.theme] ? GG.tokens.THEMES[S.theme].order[0] : 'blue';
      const ramp = GG.tokens.RAMPS[hue] || GG.tokens.RAMPS.blue;
      const cA = ctx.mode === 'dark' ? ramp[3] : ramp[4];
      const cB = ctx.palette[0];
      const dim = (n) => ctx.hiOn && !ctx.isHi(n);
      const lblRight = S.labels !== 'none';
      if (lblRight) {
        const widest = Math.max(...order.map((i) => B.measure(ctx.fmt(b.values[i]) + (S.showDelta ? '  (' + ctx.fmt((b.values[i] || 0) - (a.values[i] || 0), { sg: true }) + ')' : ''), 11, 500)));
        ctx.layout.right = Math.max(ctx.layout.right, widest + 22);
      }
      const legend = B.legend(ctx, [a.name, b.name], { icon: 'circle', itemWidth: 10, itemHeight: 10 });
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: B.tipAxis(ctx, { skip: ['__haste', '__lbl'], showName: true }) }),
          xAxis: B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true }),
          yAxis: B.catAxis(ctx, names, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } }),
          series: [
            {
              type: 'custom', name: '__haste', silent: true, renderItem: ctx.fn('rRange', { h: true, t: 3 }), encode: { x: [1, 2], y: 0 },
              data: order.map((i, k) => ({ value: [k, Math.min(a.values[i], b.values[i]), Math.max(a.values[i], b.values[i])], itemStyle: { color: dim(names[k]) ? T.grid : T.axis } })),
              tooltip: { show: false }, z: 1
            },
            { type: 'scatter', name: a.name, symbolSize: 11, z: 2, itemStyle: { color: cA }, data: order.map((i, k) => ({ value: [a.values[i], names[k]], itemStyle: B.ring(ctx, dim(names[k]) ? T.deemph : cA) })) },
            { type: 'scatter', name: b.name, symbolSize: 12, z: 3, itemStyle: { color: cB }, data: order.map((i, k) => ({ value: [b.values[i], names[k]], itemStyle: B.ring(ctx, dim(names[k]) ? T.deemph : cB) })) },
            {
              // rótulo sempre à direita da ponta mais alta (nunca invade os nomes do eixo)
              type: 'scatter', name: '__lbl', symbolSize: 1, silent: true, z: 1, itemStyle: { color: 'transparent' }, tooltip: { show: false },
              data: order.map((i, k) => {
                const d = (b.values[i] || 0) - (a.values[i] || 0);
                const show = lblRight && (S.labels === 'all' || !ctx.hiOn || ctx.isHi(names[k]));
                const txt = (ctx.fmt(b.values[i]) + (S.showDelta ? '  (' + ctx.fmt(d, { sg: true }) + ')' : '')).replace(/[{}]/g, '');
                return { value: [Math.max(a.values[i], b.values[i]), names[k]], label: show ? B.dataLabel(ctx, { position: 'right', distance: 10, formatter: txt }) : undefined };
              })
            }
          ]
        },
        meta: { valueAxis: 'x', annotSeries: 2 }
      };
    }
  });

  // ================================================================ SLOPE
  B.register({
    id: 'slope', name: 'Inclinação (slope)', group: 'Ranking', shape: 'wide',
    roles: ['Item', 'Período inicial', 'Período final'],
    hint: 'Dois momentos, muitos itens: quem subiu, quem caiu. Rótulos diretos nas duas pontas.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'colorBy', l: 'Cor', t: 'select', o: [['direction', 'Pela direção (subiu/caiu)'], ['single', 'Uma cor']], d: 'direction' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const a = series[0], b = series[series.length - 1];
      if (!a) return { option: { series: [] } };
      const periods = [a.name, b.name];
      const up = ctx.color(0), down = ctx.color(1);
      const longest = Math.max(...cats.map((c, i) => Math.max(B.measure(c + '  ' + ctx.fmt(a.values[i]), 11), B.measure(c + '  ' + ctx.fmt(b.values[i]), 11))));
      const side = Math.min(ctx.W * 0.34, longest + 16);
      ctx.layout.left = side; ctx.layout.right = side;
      ctx.layout.top += 24;
      const out = cats.map((name, i) => {
        const v0 = a.values[i], v1 = b.values[i];
        let col = S.colorBy === 'single' ? ctx.color(0) : (v1 >= v0 ? up : down);
        const dim = ctx.hiOn && !ctx.isHi(name);
        if (dim) col = T.deemph;
        const showL = S.labels !== 'none' && (S.labels === 'all' || !ctx.hiOn || !dim);
        return {
          type: 'line', name, color: col, symbol: 'circle', symbolSize: 9, z: dim ? 2 : 3,
          lineStyle: { width: 2, color: col }, itemStyle: B.ring(ctx, col),
          label: showL ? { show: true, color: dim ? T.muted : T.ink2, fontSize: 11, fontFamily: GG.FONT } : { show: false },
          labelLayout: { moveOverlap: 'shiftY' },
          emphasis: { focus: 'series' }, blur: { lineStyle: { opacity: 0.2 }, itemStyle: { opacity: 0.2 }, label: { opacity: 0.3 } },
          data: [
            { value: v0, label: { position: 'left', distance: 8, formatter: (name + '  ' + ctx.fmt(v0)).replace(/[{}]/g, '') } },
            { value: v1, label: { position: 'right', distance: 8, formatter: (ctx.fmt(v1) + '  ' + name).replace(/[{}]/g, '') } }
          ]
        };
      });
      return {
        option: {
          grid: B.grid(ctx, { outerBoundsMode: 'none' }),
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: B.tipItem(ctx, { h: 's', rows: [{ l: '', d: 'v' }] }) }),
          xAxis: B.catAxis(ctx, periods, { boundaryGap: false, position: 'top', axisLine: { show: false }, axisLabel: { color: T.ink2, fontSize: 12, fontWeight: 600 }, splitLine: { show: true, lineStyle: { color: T.axis } } }),
          yAxis: B.applyValueRange(ctx, B.valueAxis(ctx, { show: false }), { scale: true }),
          series: out
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ BUMP (ranking no tempo)
  B.register({
    id: 'bump', name: 'Ranking no tempo (bump)', group: 'Ranking', shape: 'wide',
    roles: ['Período', 'Item A (valor ou posição)', '…mais itens'],
    hint: 'Mudança de posição ao longo do tempo. Destaque o item que importa.',
    hl: 'series', annot: false,
    settings: [
      { k: 'input', l: 'Os números são', t: 'select', o: [['value', 'Valores (maior = 1º)'], ['valueAsc', 'Valores (menor = 1º)'], ['rank', 'Posições (1, 2, 3…)']], d: 'value' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const ranks = series.map(() => []);
      cats.forEach((_, i) => {
        if (S.input === 'rank') { series.forEach((s, j) => { ranks[j][i] = s.values[i]; }); return; }
        const idx = series.map((s, j) => j).filter((j) => series[j].values[i] !== null);
        idx.sort((x, y) => (S.input === 'valueAsc' ? 1 : -1) * (series[x].values[i] - series[y].values[i]));
        idx.forEach((j, r) => { ranks[j][i] = r + 1; });
      });
      const n = series.length;
      B.reserveRight(ctx, series.map((s) => s.name));
      const out = series.map((s, j) => {
        const col = ctx.pick(s.name, s.idx);
        const dim = ctx.hiOn && !ctx.isHi(s.name);
        return {
          type: 'line', name: s.name, color: col, smooth: 0.3, symbol: 'circle', symbolSize: 10, z: dim ? 2 : 3,
          lineStyle: { width: dim ? 2 : 3, color: col }, itemStyle: B.ring(ctx, col),
          endLabel: S.labels !== 'none' ? { show: true, formatter: ctx.fn('endLabel', { nameOnly: true }), color: dim ? T.muted : T.ink2, fontSize: 12, distance: 8 } : undefined,
          emphasis: { focus: 'series' }, blur: { lineStyle: { opacity: 0.15 }, itemStyle: { opacity: 0.15 } },
          data: ranks[j].map((r) => (r === undefined ? null : r))
        };
      });
      const legend = B.legendNeeded(ctx, n) && S.labels === 'none' ? B.legend(ctx, series.map((s) => s.name)) : undefined;
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { formatter: ctx.fn('tipAxis', { f: { p: '', s: 'º', d: 0 }, c: ctx.c, showName: true, order: 'asc' }) }),
          xAxis: B.catAxis(ctx, cats, { boundaryGap: false, axisLine: { show: false }, splitLine: { show: true, lineStyle: { color: T.grid } } }),
          yAxis: { type: 'value', inverse: true, min: 1, max: n, interval: 1, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false },
            axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: { s: 'º', d: 0 } }) } },
          series: out
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ INTERVALO (mín–máx)
  B.register({
    id: 'range', name: 'Intervalo (mín–máx)', group: 'Distribuição', shape: 'wide',
    roles: ['Categoria', 'Mínimo', 'Máximo', 'Média (opcional)'],
    hint: 'Amplitude de cada categoria (faixas salariais, temperaturas, preços).',
    hl: 'categories', annot: true,
    settings: [ORIENT('h'), { k: 'sort', l: 'Ordenar', t: 'select', o: [['none', 'Ordem dos dados'], ['mid', 'Pela média'], ['width', 'Pela amplitude']], d: 'none' }],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const cats = t.rows.map((r) => String(r[0]));
      const lo = t.rows.map((r) => N(r[1])), hi = t.rows.map((r) => N(r[2]));
      const mid = t.rows.map((r, i) => (r.length > 3 && N(r[3]) !== null ? N(r[3]) : null));
      let order = cats.map((_, i) => i);
      if (S.sort === 'mid') order = B.sortIdx(cats.map((_, i) => (mid[i] !== null ? mid[i] : (lo[i] + hi[i]) / 2)), 'desc');
      if (S.sort === 'width') order = B.sortIdx(cats.map((_, i) => hi[i] - lo[i]), 'desc');
      const names = order.map((i) => cats[i]);
      const horiz = S.orientation === 'h';
      const col = (n) => (ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(0) : T.deemph) : ctx.color(0));
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } } : {});
      const valAx = B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true });
      const hasMid = mid.some((m) => m !== null);
      if (S.labels !== 'none' && horiz) ctx.layout.right = Math.max(ctx.layout.right, 60);
      const cols = t.columns;
      const series = [{
        type: 'custom', name: (cols[1] || 'Mín') + '–' + (cols[2] || 'Máx'), renderItem: ctx.fn('rRange', { h: horiz, t: 10 }),
        encode: horiz ? { x: [1, 2], y: 0 } : { x: 0, y: [1, 2] },
        data: order.map((i, k) => {
          const item = { value: [k, lo[i], hi[i]], itemStyle: { color: col(names[k]) } };
          return item;
        }),
        tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, nameDim: null, rows: [{ l: cols[1] || 'Mínimo', d: 1 }, { l: cols[2] || 'Máximo', d: 2 }] }) }
      }];
      if (S.labels !== 'none') {
        series.push({
          type: 'scatter', name: '__lbl', symbolSize: 0, silent: true, tooltip: { show: false },
          data: order.map((i, k) => ({ value: horiz ? [hi[i], names[k]] : [names[k], hi[i]], label: B.dataLabel(ctx, { position: horiz ? 'right' : 'top', formatter: (ctx.fmt(lo[i]) + '–' + ctx.fmt(hi[i])).replace(/[{}]/g, '') }) }))
        });
      }
      if (hasMid) {
        series.push({ type: 'scatter', name: cols[3] || 'Média', symbolSize: 10, z: 4, data: order.map((i, k) => ({ value: horiz ? [mid[i], names[k]] : [names[k], mid[i]], itemStyle: B.ring(ctx, T.ink) })) });
      }
      series[0].data.forEach((d, k) => { d.name = names[k]; });
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx, series
        },
        meta: { valueAxis: horiz ? 'x' : 'y' }
      };
    }
  });

  // ================================================================ PREVISÃO com intervalo
  B.register({
    id: 'forecast', name: 'Previsão com intervalo', group: 'Tempo', shape: 'wide',
    roles: ['Período', 'Real', 'Previsão', 'Limite inferior', 'Limite superior'],
    hint: 'Realizado em linha cheia, projeção tracejada e a faixa de incerteza — honestidade sobre o que não se sabe.',
    hl: 'none', annot: true,
    settings: [{ k: 'todayLabel', l: 'Rótulo do corte', t: 'text', d: 'Hoje' }],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const cats = t.rows.map((r) => String(r[0]));
      const col = (j) => t.rows.map((r) => N(r[j]));
      const real = col(1), fc = col(2), lo = col(3), hi = col(4);
      const c = ctx.color(0);
      const lastReal = real.reduce((li, v, i) => (v !== null ? i : li), -1);
      const names = [t.columns[1] || 'Real', t.columns[2] || 'Previsão'];
      const legend = B.legend(ctx, names.concat(['Intervalo']), { icon: undefined });
      const endL = S.labels !== 'none';
      if (endL) B.reserveRight(ctx, [ctx.fmt(fc[fc.length - 1]) + ' prev.']);
      const refs = ctx.S.annotations.refs;
      if (lastReal >= 0 && S.todayLabel && !refs.some((r) => r.axis === 'cat')) ctx.S.annotations.refs = refs.concat([{ axis: 'cat', v: cats[lastReal], label: S.todayLabel }]);
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { formatter: B.tipAxis(ctx, { skip: ['Intervalo', '__lo'], showName: true }) }),
          xAxis: B.catAxis(ctx, cats, { boundaryGap: false }),
          yAxis: B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true }),
          series: [
            { type: 'line', name: '__lo', data: lo, stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false } },
            { type: 'line', name: 'Intervalo', data: hi.map((h, i) => (h !== null && lo[i] !== null ? h - lo[i] : null)), stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color: c, opacity: ctx.mode === 'dark' ? 0.2 : 0.14 }, color: c, silent: true },
            { type: 'line', name: 'Limite inferior', data: lo, symbol: 'none', lineStyle: { opacity: 0 }, silent: true },
            { type: 'line', name: 'Limite superior', data: hi, symbol: 'none', lineStyle: { opacity: 0 }, silent: true },
            {
              type: 'line', name: names[0], color: c, lineStyle: { width: 2, color: c }, symbol: 'circle', symbolSize: 8, itemStyle: B.ring(ctx, c),
              data: real.map((v, i) => (i === lastReal ? { value: v, label: endL ? B.dataLabel(ctx, { position: 'top', formatter: ctx.fn('label', { f: ctx.f }) }) : undefined } : { value: v, symbol: 'none' }))
            },
            {
              type: 'line', name: names[1], color: c, lineStyle: { width: 2, color: c, type: [5, 4] }, symbol: 'circle', symbolSize: 8, itemStyle: { color: T.surface, borderColor: c, borderWidth: 2 },
              data: fc.map((v, i) => (i === fc.length - 1 ? v : { value: v, symbol: 'none' })),
              endLabel: endL ? { show: true, color: T.ink2, fontSize: 12, distance: 8, formatter: ctx.fn('label', { f: ctx.f, tpl: '{v} prev.' }) } : undefined
            }
          ]
        },
        meta: { valueAxis: 'y', annotSeries: 4, noteCoord: (n) => { const i = cats.indexOf(String(n.x)); return i < 0 ? null : [cats[i], real[i] !== null ? real[i] : fc[i]]; } }
      };
    }
  });

  // ================================================================ PEQUENOS MÚLTIPLOS
  B.register({
    id: 'multiples', name: 'Pequenos múltiplos', group: 'Tempo', shape: 'wide',
    roles: ['Período', 'Série A', '…mais séries (um painel cada)'],
    hint: 'Cura do "gráfico espaguete": um painel por série, mesma escala, as outras em cinza ao fundo.',
    hl: 'series', annot: false,
    settings: [
      { k: 'kind', l: 'Marca', t: 'seg', o: [['line', 'Linha'], ['area', 'Área'], ['bar', 'Colunas']], d: 'line' },
      { k: 'ghost', l: 'Outras séries em cinza ao fundo', t: 'toggle', d: true },
      { k: 'sharedY', l: 'Mesma escala em todos', t: 'toggle', d: true },
      { k: 'cols', l: 'Colunas de painéis', t: 'number', d: '', ph: 'auto' }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const { cats, series } = B.wide(ctx);
      const n = series.length || 1;
      const L = ctx.layout;
      const all = series.flatMap((s) => s.values).filter((v) => v !== null);
      const dmin = Math.min(...all), dmax = Math.max(...all);
      // limites "redondos" para que o mín/máx rotulados sejam números limpos
      let step = Math.pow(10, Math.floor(Math.log10((dmax - Math.min(0, dmin)) || 1)));
      if ((dmax - dmin) / step < 3) step /= 2;
      const gmax = Math.ceil(dmax / step) * step;
      const gmin = S.kind === 'line' ? Math.floor(dmin / step) * step : Math.min(0, Math.floor(dmin / step) * step);
      const af = Object.assign({ c: true }, B.axisF(ctx.f));
      const yl = Math.max(B.measure(ctx.R.fmt(gmax, af), 10), B.measure(ctx.R.fmt(gmin, af), 10)) + 8;
      const availW = W - 32, availH = H - L.top - L.bottom - 16;
      let cols = parseInt(S.cols, 10);
      if (!(cols > 0)) cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * (availW / Math.max(availH, 1)) * 0.9))));
      const rows = Math.ceil(n / cols);
      const gapX = 20, gapY = 26, head = 20;
      const gutter = S.sharedY ? yl : 0;
      const pw = (availW - gutter - gapX * (cols - 1) - (S.sharedY ? 0 : yl * cols)) / cols;
      const ph = (availH - gapY * (rows - 1)) / rows;
      const grids = [], xAxes = [], yAxes = [], out = [], titles = [];
      series.forEach((s, k) => {
        const r = Math.floor(k / cols), c = k % cols;
        const left = 16 + gutter + c * (pw + gapX + (S.sharedY ? 0 : yl)) + (S.sharedY ? 0 : yl);
        const top = L.top + r * (ph + gapY) + head;
        grids.push({ left, top, width: Math.max(pw, 20), height: Math.max(ph - head, 20), outerBoundsMode: 'none' });
        const hi = !ctx.hiOn || ctx.isHi(s.name);
        const col = hi ? ctx.accentColor(ctx.hiOn ? s.idx : 0) : T.muted;
        titles.push({ text: s.name + (S.labels !== 'none' ? '  ' + ctx.fmt(s.values[s.values.length - 1]) : ''), left: left - (c === 0 || !S.sharedY ? 0 : 0), top: top - head, textStyle: { fontSize: 12, fontWeight: 600, color: hi ? T.ink : T.ink2, fontFamily: GG.FONT, width: pw, overflow: 'truncate' } });
        const bottomRow = r === rows - 1 || k + cols >= n;
        xAxes.push(B.catAxis(ctx, cats, { gridIndex: k, boundaryGap: S.kind === 'bar', axisLabel: { show: bottomRow, color: T.muted, fontSize: 10, hideOverlap: true } }));
        yAxes.push(B.valueAxis(ctx, { gridIndex: k, splitNumber: 2, min: S.sharedY ? gmin : (S.kind === 'bar' ? 0 : 'dataMin'), max: S.sharedY ? gmax : undefined, axisLabel: { show: c === 0 || !S.sharedY, color: T.muted, fontSize: 10, formatter: ctx.fn('axis', { f: af }), showMinLabel: true, showMaxLabel: true } }));
        if (S.ghost && S.kind !== 'bar') {
          series.forEach((o) => { if (o !== s) out.push({ type: 'line', xAxisIndex: k, yAxisIndex: k, data: o.values, symbol: 'none', silent: true, lineStyle: { width: 1, color: T.deemph, opacity: 0.8 }, z: 1, name: '__ghost', tooltip: { show: false } }); });
        }
        if (S.kind === 'bar') out.push({ type: 'bar', name: s.name, xAxisIndex: k, yAxisIndex: k, data: s.values, barMaxWidth: 16, itemStyle: { color: col, borderRadius: [3, 3, 0, 0] }, z: 3 });
        else out.push({
          type: 'line', name: s.name, xAxisIndex: k, yAxisIndex: k, z: 3, symbol: 'circle', symbolSize: 7, color: col,
          data: s.values.map((v, i) => (i === s.values.length - 1 ? v : { value: v, symbol: 'none' })),
          lineStyle: { width: 2, color: col }, itemStyle: B.ring(ctx, col),
          areaStyle: S.kind === 'area' ? { color: col, opacity: 0.12 } : undefined
        });
      });
      return {
        option: {
          title: titles, grid: grids, xAxis: xAxes, yAxis: yAxes, series: out,
          tooltip: B.tooltip(ctx, { formatter: B.tipAxis(ctx, { skip: ['__ghost'], showName: true }) }),
          axisPointer: { link: [{ xAxisIndex: 'all' }] }
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ PARETO
  B.register({
    id: 'pareto', name: 'Pareto (curva ABC)', group: 'Qualidade', shape: 'wide',
    roles: ['Causa / item', 'Ocorrências'],
    hint: 'Poucas causas explicam a maioria dos efeitos. Barras e acumulado no MESMO eixo (% do total) — sem eixo duplo.',
    hl: 'none', annot: true,
    settings: [{ k: 'cut', l: 'Linha de corte (%)', t: 'number', d: 80 }],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const s = series[0] || { values: [], name: 'Ocorrências' };
      const order = B.sortIdx(s.values, 'desc');
      const names = order.map((i) => cats[i]);
      const vals = order.map((i) => s.values[i] || 0);
      const total = vals.reduce((a, b) => a + b, 0) || 1;
      const share = vals.map((v) => v / total * 100);
      let acc = 0; const cum = share.map((v) => (acc += v));
      const cut = N(S.cut) || 80;
      const vital = cum.findIndex((c) => c >= cut);
      const legend = B.legend(ctx, ['% do total', '% acumulado']);
      if (!ctx.S.annotations.refs.some((r) => N(r.v) === cut)) ctx.S.annotations.refs = ctx.S.annotations.refs.concat([{ axis: 'val', v: cut, label: 'Corte' }]);
      const pf = { s: '%', d: 0 };
      const band = (ctx.W - 90) / Math.max(names.length, 1);
      const rot = Math.max(...names.map((n) => Math.max(...String(n).split(/\s+/).map((w) => B.measure(w, 11))))) > band - 6 ? 35 : 0;
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: ctx.fn('tipAxis', { f: { s: '%', d: 1 }, c: ctx.c, showName: true, fs: { [s.name]: ctx.f } }) }),
          xAxis: B.catAxis(ctx, names, { axisLabel: { color: T.muted, fontSize: 11, interval: 0, rotate: rot, width: rot ? 110 : band - 6, overflow: rot ? 'truncate' : 'break' } }),
          yAxis: B.valueAxis(ctx, { min: 0, max: 100, interval: 20, axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: pf }) } }),
          series: [
            {
              type: 'bar', name: '% do total', barMaxWidth: 24, legendIcon: 'roundRect', color: ctx.color(0),
              data: share.map((v, k) => ({ value: v, itemStyle: { color: k <= vital ? ctx.color(0) : T.deemph, borderRadius: [4, 4, 0, 0] },
                label: S.labels === 'all' ? B.dataLabel(ctx, { position: 'top', formatter: ctx.fn('label', { f: pf }) }) : undefined }))
            },
            {
              type: 'line', name: '% acumulado', color: T.ink2, symbol: 'circle', symbolSize: 7, lineStyle: { width: 2, color: T.ink2 }, itemStyle: B.ring(ctx, T.ink2),
              data: cum.map((v, k) => ({ value: v, label: S.labels !== 'none' && k === vital ? B.dataLabel(ctx, { position: 'left', distance: 8, formatter: ctx.fn('label', { f: pf, tpl: '{v} com ' + (k + 1) + ' itens' }) }) : undefined }))
            },
            { type: 'line', name: s.name, data: vals, symbol: 'none', lineStyle: { opacity: 0 }, silent: true, clip: true }
          ]
        },
        meta: { valueAxis: 'y', annotSeries: 0, valFmt: pf }
      };
    }
  });

  // ================================================================ CASCATA (waterfall)
  B.register({
    id: 'waterfall', name: 'Cascata (ponte)', group: 'Finanças', shape: 'wide',
    roles: ['Etapa (comece com "=" para subtotal)', 'Valor / variação'],
    hint: 'Do valor inicial ao final, passo a passo. A 1ª linha é o ponto de partida; linhas com "=" viram subtotais.',
    hl: 'none', annot: true,
    settings: [
      { k: 'finalLabel', l: 'Barra final (total)', t: 'text', d: 'Resultado' },
      { k: 'polarity', l: 'Aumento é', t: 'seg', o: [['good', 'Bom'], ['bad', 'Ruim']], d: 'good' },
      ORIENT('v')
    ],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const items = [];
      let run = 0;
      t.rows.forEach((r, i) => {
        const label = String(r[0] || '');
        const v = N(r[1]);
        if (i === 0) { run = v || 0; items.push({ name: label, from: 0, to: run, delta: run, kind: 'total' }); return; }
        if (/^=/.test(label)) { items.push({ name: label.replace(/^=\s*/, ''), from: 0, to: run, delta: run, kind: 'total' }); return; }
        if (v === null) return;
        items.push({ name: label, from: run, to: run + v, delta: v, kind: v >= 0 ? 'up' : 'down' });
        run += v;
      });
      if (S.finalLabel) items.push({ name: S.finalLabel, from: 0, to: run, delta: run, kind: 'total' });
      const good = GG.tokens.STATUS.good, bad = GG.tokens.STATUS.critical;
      const colors = { total: ctx.mode === 'dark' ? '#9a9890' : '#52514e', up: S.polarity === 'bad' ? bad : good, down: S.polarity === 'bad' ? good : bad };
      const horiz = S.orientation === 'h';
      const names = items.map((x) => x.name);
      // seletivos: totais + as 3 maiores variações (o resto fica na dica e na tabela)
      const bigDeltas = items.filter((x) => x.kind !== 'total').map((x) => Math.abs(x.delta)).sort((a, b) => b - a).slice(0, 3);
      const lbl = items.map((x) => {
        if (S.labels === 'none') return '';
        if (x.kind === 'total') return ctx.fmt(x.delta);
        if (S.labels === 'smart' && bigDeltas.indexOf(Math.abs(x.delta)) < 0) return '';
        return (x.delta >= 0 ? '▲ ' : '▼ ') + ctx.fmt(x.delta, { sg: true });
      });
      const legend = B.legend(ctx, ['Total', S.polarity === 'bad' ? 'Aumento (piora)' : 'Aumento', S.polarity === 'bad' ? 'Redução (melhora)' : 'Redução'], { icon: 'roundRect' });
      const band = (ctx.W - 90) / Math.max(names.length, 1);
      const rot = !horiz && Math.max(...names.map((n) => Math.max(...String(n).split(/\s+/).map((w) => B.measure(w, 11))))) > band - 6;
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } }
        : { axisLabel: { color: T.muted, fontSize: 11, interval: 0, rotate: rot ? 35 : 0, width: rot ? 120 : Math.max(50, band - 6), overflow: rot ? 'truncate' : 'break' } });
      const valAx = B.valueAxis(ctx, { scale: false });
      if (horiz) ctx.layout.right = Math.max(ctx.layout.right, 64);
      const series = [{
        type: 'custom', name: 'Etapas', renderItem: ctx.fn('rWaterfall', { h: horiz, labels: lbl, ink: T.ink2, font: GG.FONT, conn: T.axis, n: items.length }),
        encode: horiz ? { x: [1, 2], y: 0 } : { x: 0, y: [1, 2] },
        data: items.map((x, k) => ({ name: x.name, value: [k, x.from, x.to, x.delta], itemStyle: { color: colors[x.kind] } })),
        tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: 'variação', d: 3 }, { l: 'acumulado', d: 2 }] }) }
      }];
      // séries vazias só para a legenda
      [['Total', colors.total], [legend.data[1], colors.up], [legend.data[2], colors.down]].forEach(([nm, cl]) => series.push({ type: 'bar', name: nm, data: [], color: cl, legendIcon: 'roundRect' }));
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx, series
        },
        meta: { valueAxis: horiz ? 'x' : 'y' }
      };
    }
  });

  // ================================================================ DIVERGENTE (acima/abaixo)
  B.register({
    id: 'diverging', name: 'Barras divergentes', group: 'Desvio', shape: 'wide',
    roles: ['Categoria', 'Valor (+/−)'],
    hint: 'Acima ou abaixo de uma referência (meta, média, zero). Dois matizes opostos, sem cor no meio.',
    hl: 'none', annot: true,
    settings: [
      ORIENT('h'), Object.assign({}, SORT, { d: 'desc' }),
      { k: 'pair', l: 'Cores (negativo ↔ positivo)', t: 'select', o: Object.keys(GG.tokens.DIV_PAIRS).map((k) => [k, GG.tokens.DIV_PAIRS[k].name]), d: 'red-blue' },
      { k: 'posLabel', l: 'Nome do lado positivo', t: 'text', d: 'Acima' },
      { k: 'negLabel', l: 'Nome do lado negativo', t: 'text', d: 'Abaixo' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const s = series[0] || { values: [] };
      const order = B.sortIdx(s.values, S.sort);
      const names = order.map((i) => cats[i]);
      const vals = order.map((i) => s.values[i]);
      const horiz = S.orientation === 'h';
      const cPos = GG.color.pole(S.pair, 'pos', ctx.mode), cNeg = GG.color.pole(S.pair, 'neg', ctx.mode);
      const smart = B.smartIdx(ctx, vals, names, { extremes: true, min: true });
      const mk = (pos) => vals.map((v, k) => {
        if (v === null || (pos ? v < 0 : v >= 0)) return null;
        const item = { value: v, itemStyle: { color: pos ? cPos : cNeg, borderRadius: B.barRadius(horiz, !pos) } };
        if (S.labels === 'all' || (S.labels === 'smart' && smart.has(k))) item.label = B.dataLabel(ctx, { position: labelPos(horiz, v), formatter: ctx.fn('label', { f: Object.assign({ sg: true }, ctx.f) }) });
        return item;
      });
      const legend = B.legend(ctx, [S.negLabel, S.posLabel]);
      const catAx = B.catAxis(ctx, names, horiz ? { inverse: true, axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11, width: Math.max(80, ctx.W * 0.28), overflow: 'truncate' } } : { axisLine: { show: false } });
      const valAx = B.valueAxis(ctx, { axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: Object.assign({ sg: true }, B.axisF(ctx.f)) }), hideOverlap: true } });
      const vv = vals.filter((v) => v !== null);
      const vmin = Math.min(0, ...vv), vmax = Math.max(0, ...vv);
      if (S.labels !== 'none') {
        // espaço para os rótulos nas duas pontas, proporcional ao texto
        const plotLen = horiz ? ctx.W * 0.6 : (ctx.H - ctx.layout.top - ctx.layout.bottom);
        const lw = horiz ? Math.max(...vv.map((v) => B.measure(ctx.fmt(v, { sg: true }), 11, 500))) + 10 : 20;
        const pad = Math.min(0.45, lw / Math.max(plotLen, 1)) * (vmax - vmin || 1);
        if (vmin < 0) valAx.min = +(vmin - pad).toPrecision(3);
        if (vmax > 0) valAx.max = +(vmax + pad).toPrecision(3);
      }
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: B.tipAxis(ctx, { f: Object.assign({ sg: true }, ctx.f) }) }),
          xAxis: horiz ? valAx : catAx, yAxis: horiz ? catAx : valAx,
          series: [
            { type: 'bar', name: S.negLabel, stack: 'd', data: mk(false), barMaxWidth: 22, color: cNeg, legendIcon: 'roundRect', markLine: { silent: true, symbol: 'none', data: [horiz ? { xAxis: 0 } : { yAxis: 0 }], lineStyle: { color: T.ink2, width: 1, type: 'solid' }, label: { show: false } } },
            { type: 'bar', name: S.posLabel, stack: 'd', data: mk(true), barMaxWidth: 22, color: cPos, legendIcon: 'roundRect' }
          ]
        },
        meta: { valueAxis: horiz ? 'x' : 'y', annotSeries: 1 }
      };
    }
  });

  // ================================================================ BULLET (realizado × meta)
  B.register({
    id: 'bullet', name: 'Bullet (realizado × meta)', group: 'Desvio', shape: 'wide',
    roles: ['Indicador', 'Realizado', 'Meta', 'Limite ruim (opc.)', 'Limite bom (opc.)'],
    hint: 'Substitui o velocímetro: barra fina do realizado, traço da meta e faixas qualitativas ao fundo.',
    hl: 'categories', annot: false,
    settings: [{ k: 'normalize', l: 'Escala em % da meta (indicadores de escalas diferentes)', t: 'toggle', d: true }],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const names = t.rows.map((r) => String(r[0]));
      const act = t.rows.map((r) => N(r[1])), tgt = t.rows.map((r) => N(r[2]));
      const bad = t.rows.map((r) => N(r[3])), ok = t.rows.map((r) => N(r[4]));
      const norm = S.normalize;
      const sc = (v, i) => (v === null ? null : norm ? (tgt[i] ? v / tgt[i] * 100 : null) : v);
      const rawMax = Math.max(...names.map((_, i) => Math.max(sc(act[i], i) || 0, sc(tgt[i], i) || 0, sc(ok[i], i) || 0))) * 1.08;
      const mag = Math.pow(10, Math.floor(Math.log10(rawMax || 1)));
      const maxV = Math.ceil(rawMax / mag * 2) / 2 * mag;
      const gray = GG.tokens.RAMPS.gray;
      const bands = ctx.mode === 'dark' ? [gray[12], gray[11], gray[10]] : [gray[2], gray[1], gray[0]];
      const r1 = names.map((_, i) => sc(bad[i], i) ?? (norm ? 70 : null));
      const r2 = names.map((_, i) => sc(ok[i], i) ?? (norm ? 100 : null));
      const r3 = names.map(() => maxV);
      const colorOf = (n) => (ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(0) : T.muted) : ctx.color(0));
      const f = norm ? { s: '%', d: 0 } : ctx.f;
      if (S.labels !== 'none') ctx.layout.right = Math.max(ctx.layout.right, 18 + Math.max(...names.map((_, i) => B.measure(ctx.fmt(act[i]) + (norm && tgt[i] ? '   ' + ctx.R.fmt(act[i] / tgt[i] * 100, { d: 0, s: '%' }) : ''), 11, 600))));
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'none' }, formatter: ctx.fn('tipAxis', { f, c: ctx.c, showName: true, skip: ['Faixa ruim', 'Faixa regular', 'Faixa boa'] }) }),
          xAxis: B.valueAxis(ctx, { min: 0, max: maxV, axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: B.axisF(f) }), hideOverlap: true } }),
          yAxis: B.catAxis(ctx, names, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.ink2, fontSize: 12, fontWeight: 500, width: Math.max(90, ctx.W * 0.28), overflow: 'truncate' } }),
          series: [
            { type: 'bar', name: 'Faixa ruim', stack: 'bg', barWidth: 22, silent: true, data: r1, itemStyle: { color: bands[0] } },
            { type: 'bar', name: 'Faixa regular', stack: 'bg', barWidth: 22, silent: true, data: r2.map((v, i) => (v !== null && r1[i] !== null ? v - r1[i] : null)), itemStyle: { color: bands[1] } },
            {
              type: 'bar', name: 'Faixa boa', stack: 'bg', barWidth: 22, silent: true, itemStyle: { color: bands[2] },
              // o rótulo mora no fim do fundo: nunca colide com a barra nem com a meta
              data: r3.map((v, i) => ({ value: v - (r2[i] || 0), label: S.labels !== 'none' ? B.dataLabel(ctx, { position: 'right', distance: 8, color: T.ink, fontWeight: 600,
                formatter: (ctx.fmt(act[i]) + (norm && tgt[i] ? '   ' + ctx.R.fmt(act[i] / tgt[i] * 100, { d: 0, s: '%' }) : '')).replace(/[{}]/g, '') }) : undefined }))
            },
            {
              type: 'bar', name: t.columns[1] || 'Realizado', barWidth: 8, barGap: '-100%', z: 3,
              data: names.map((n, i) => ({ value: sc(act[i], i), itemStyle: { color: colorOf(n), borderRadius: [0, 3, 3, 0] } }))
            },
            { type: 'scatter', name: t.columns[2] || 'Meta', symbol: 'rect', symbolSize: [3, 24], z: 4, itemStyle: { color: T.ink }, data: names.map((n, i) => [sc(tgt[i], i), n]) }
          ]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ MEDIDOR LINEAR (progresso)
  B.register({
    id: 'meter', name: 'Barras de progresso', group: 'Indicadores', shape: 'wide',
    roles: ['Item', 'Valor', 'Meta / máximo'],
    hint: 'Proporção de uma meta. O trilho é um tom claro da mesma cor; o estado vem com ícone e rótulo.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'status', l: 'Estado por limite', t: 'select', o: [['none', 'Sem estado (uma cor)'], ['higher', 'Maior é melhor'], ['lower', 'Menor é melhor']], d: 'none' },
      { k: 'warn', l: 'Atenção a partir de (% da meta)', t: 'number', d: 80 },
      { k: 'crit', l: 'Crítico a partir de (% da meta)', t: 'number', d: 60 }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const names = t.rows.map((r) => String(r[0]));
      const val = t.rows.map((r) => N(r[1])), max = t.rows.map((r) => N(r[2]) || 100);
      const pct = val.map((v, i) => (v === null ? null : v / max[i] * 100));
      const hue = GG.tokens.THEMES[S.theme] ? GG.tokens.THEMES[S.theme].order[0] : 'blue';
      const ramp = GG.tokens.RAMPS[hue] || GG.tokens.RAMPS.blue;
      const track = ctx.mode === 'dark' ? ramp[12] : ramp[0];
      const warn = N(S.warn) || 80, crit = N(S.crit) || 60;
      const ST = GG.tokens.STATUS;
      const state = (p) => {
        if (S.status === 'none' || p === null) return null;
        if (S.status === 'higher') return p < crit ? 'critical' : p < warn ? 'warning' : 'good';
        return p > (200 - crit) ? 'critical' : p > (200 - warn) ? 'warning' : 'good';
      };
      const ICON = { good: '✓', warning: '!', critical: '✕' };
      const colOf = (n, i) => { const s = state(pct[i]); if (s) return ST[s]; return ctx.hiOn ? (ctx.isHi(n) ? ctx.accentColor(0) : T.deemph) : ctx.color(0); };
      const top = Math.max(100, ...pct.filter((p) => p !== null));
      const mtxt = pct.map((p, i) => { const st = state(p); return (st ? ICON[st] + ' ' : '') + ctx.R.fmt(p, { d: 0, s: '%' }) + '   ' + ctx.fmt(val[i]) + ' de ' + ctx.fmt(max[i]); });
      if (S.labels !== 'none') ctx.layout.right = Math.max(ctx.layout.right, Math.max(...mtxt.map((x) => B.measure(x, 11, 500))) + 22);
      return {
        option: {
          grid: B.grid(ctx),
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'none' }, formatter: ctx.fn('tipAxis', { f: { s: '% da meta', d: 0 }, c: ctx.c, skip: ['__trilho', '__rotulo'] }) }),
          xAxis: { type: 'value', show: false, min: 0, max: top },
          yAxis: B.catAxis(ctx, names, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.ink2, fontSize: 12, fontWeight: 500, width: Math.max(90, ctx.W * 0.3), overflow: 'truncate' } }),
          series: [
            { type: 'bar', name: '__trilho', barWidth: 12, silent: true, data: names.map(() => 100), itemStyle: { color: track, borderRadius: 6 }, tooltip: { show: false } },
            {
              type: 'bar', name: 'Progresso', barWidth: 12, barGap: '-100%', z: 3,
              data: pct.map((p, i) => ({ value: Math.min(p || 0, top), itemStyle: { color: colOf(names[i], i), borderRadius: 6 } }))
            },
            {
              // rótulo depois do fim do trilho (ou da barra, se passou de 100%)
              type: 'bar', name: '__rotulo', barWidth: 12, barGap: '-100%', silent: true, z: 1, itemStyle: { color: 'transparent' }, tooltip: { show: false },
              data: pct.map((p, i) => ({ value: Math.max(100, Math.min(p || 0, top)), label: S.labels !== 'none' ? B.dataLabel(ctx, { position: 'right', distance: 10, color: T.ink2, formatter: mtxt[i].replace(/[{}]/g, '') }) : undefined }))
            }
          ]
        },
        meta: { annot: false, meterLabels: true }
      };
    }
  });

  // ================================================================ LIKERT (divergente empilhado)
  B.register({
    id: 'likert', name: 'Likert (escala de concordância)', group: 'Pesquisa', shape: 'wide',
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

  // ================================================================ PIRÂMIDE (borboleta)
  B.register({
    id: 'pyramid', name: 'Pirâmide / borboleta', group: 'Distribuição', shape: 'wide',
    roles: ['Faixa', 'Grupo esquerdo', 'Grupo direito'],
    hint: 'Duas distribuições espelhadas (ex.: pirâmide etária por sexo).',
    hl: 'series', annot: false,
    settings: [{ k: 'asPct', l: 'Mostrar como % do total', t: 'toggle', d: false }],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const a = series[0], b = series[1] || series[0];
      if (!a) return { option: { series: [] } };
      const totAll = a.values.concat(b.values).reduce((x, y) => x + (y || 0), 0) || 1;
      const conv = (v) => (S.asPct ? (v || 0) / totAll * 100 : v);
      const f = S.asPct ? { d: 1, s: '%' } : ctx.f;
      const legend = B.legend(ctx, [a.name, b.name]);
      const ca = ctx.pick(a.name, 0), cb = ctx.pick(b.name, 1);
      const lbl = (right) => (S.labels === 'all' ? B.dataLabel(ctx, { position: right ? 'right' : 'left', formatter: ctx.fn('label', { f, abs: true }) }) : undefined);
      const m = Math.max(...a.values.concat(b.values).map((v) => Math.abs(conv(v) || 0)));
      if (S.labels === 'all') { ctx.layout.left = Math.max(ctx.layout.left, 40); ctx.layout.right = Math.max(ctx.layout.right, 44); }
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { axisPointer: { type: 'shadow' }, formatter: B.tipAxis(ctx, { f, abs: true, showName: true }) }),
          xAxis: B.valueAxis(ctx, { min: -m * 1.05, max: m * 1.05, axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axisAbs', { f: Object.assign({ c: true }, f) }) } }),
          yAxis: B.catAxis(ctx, cats, { axisLine: { show: false }, axisLabel: { color: T.muted, fontSize: 11 } }),
          series: [
            { type: 'bar', name: a.name, stack: 'p', barCategoryGap: '12%', color: ca, legendIcon: 'roundRect', data: a.values.map((v) => ({ value: -conv(v), itemStyle: { color: ca, borderRadius: [4, 0, 0, 4] }, label: lbl(false) })) },
            { type: 'bar', name: b.name, stack: 'p', color: cb, legendIcon: 'roundRect', data: b.values.map((v) => ({ value: conv(v), itemStyle: { color: cb, borderRadius: [0, 4, 4, 0] }, label: lbl(true) })) }
          ]
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ MARIMEKKO
  B.register({
    id: 'marimekko', name: 'Marimekko (mosaico)', group: 'Parte do todo', shape: 'wide',
    roles: ['Coluna (largura = total)', 'Segmento A', '…mais segmentos'],
    hint: 'Duas partes-do-todo ao mesmo tempo: largura = tamanho do mercado, altura = participação.',
    hl: 'series', annot: false,
    settings: [{ k: 'inner', l: 'Rótulo % dentro dos blocos', t: 'toggle', d: true }],
    build(ctx) {
      const { T, S } = ctx;
      const { cats, series } = B.wide(ctx);
      const rowTot = cats.map((_, i) => series.reduce((a, s) => a + (s.values[i] || 0), 0));
      const grand = rowTot.reduce((a, b) => a + b, 0) || 1;
      const data = [];
      let x = 0;
      cats.forEach((c, i) => {
        const w = rowTot[i] / grand * 100;
        let y = 0;
        series.forEach((s, j) => {
          const h = rowTot[i] ? (s.values[i] || 0) / rowTot[i] * 100 : 0;
          data.push({ name: c, seriesName: s.name, value: [x, x + w, y, y + h, j, h, j === 0 ? 1 : 0, i, s.values[i] || 0] });
          y += h;
        });
        x += w;
      });
      const colors = series.map((s, j) => ctx.pick(s.name, s.idx));
      const legend = B.legend(ctx, series.map((s) => s.name));
      ctx.layout.bottom += 22;
      return {
        option: {
          grid: B.grid(ctx, { outerBoundsMode: 'none', left: 44 }),
          legend,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: 'n', rows: [{ l: 'da coluna', d: 5, f: { d: 1, s: '%' } }, { l: '', d: 8 }] }) }),
          xAxis: { type: 'value', min: 0, max: 100, show: false },
          yAxis: B.valueAxis(ctx, { min: 0, max: 100, interval: 25, axisLabel: { color: T.muted, fontSize: 11, formatter: ctx.fn('axis', { f: { d: 0, s: '%' } }) } }),
          series: [{
            type: 'custom', name: 'Mosaico', renderItem: ctx.fn('rMekko', { colors, labels: S.inner && S.labels !== 'none', cats, font: GG.FONT, muted: T.muted }),
            encode: { x: [0, 1], y: [2, 3] }, data
          }].concat(series.map((s, j) => ({ type: 'bar', name: s.name, data: [], color: colors[j], legendIcon: 'roundRect' })))
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ CARTA DE CONTROLE (CEP I-MR)
  B.register({
    id: 'control', name: 'Carta de controle (I-AM)', group: 'Qualidade', shape: 'wide',
    roles: ['Amostra', 'Medição'],
    hint: 'Controle estatístico de processo: média, limites de ±3σ (via amplitude móvel) e pontos fora de controle sinalizados.',
    hl: 'none', annot: true,
    settings: [
      { k: 'showMR', l: 'Painel de amplitude móvel', t: 'toggle', d: true },
      { k: 'zones', l: 'Zonas de ±1σ e ±2σ', t: 'toggle', d: false },
      { k: 'rule2', l: 'Regra: 8 pontos do mesmo lado', t: 'toggle', d: true },
      { k: 'rule3', l: 'Regra: 6 pontos em tendência', t: 'toggle', d: true },
      { k: 'lsl', l: 'Especificação inferior (LIE)', t: 'number', d: '' },
      { k: 'usl', l: 'Especificação superior (LSE)', t: 'number', d: '' }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const cats = t.rows.map((r) => String(r[0]));
      const v = t.rows.map((r) => N(r[1]));
      const vals = v.filter((x) => x !== null);
      const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      const mr = v.map((x, i) => (i === 0 || x === null || v[i - 1] === null ? null : Math.abs(x - v[i - 1])));
      const mrs = mr.filter((x) => x !== null);
      const mrBar = mrs.reduce((a, b) => a + b, 0) / (mrs.length || 1);
      const sigma = mrBar / 1.128;
      const ucl = mean + 3 * sigma, lcl = mean - 3 * sigma;
      const r1 = new Set(), r2 = new Set(), r3 = new Set();
      v.forEach((x, i) => { if (x !== null && (x > ucl || x < lcl)) r1.add(i); });
      if (S.rule2) {
        let run = 0, side = 0;
        v.forEach((x, i) => { const s = x > mean ? 1 : x < mean ? -1 : 0; if (s && s === side) run++; else { run = 1; side = s; } if (run >= 8) for (let k = i - run + 1; k <= i; k++) if (!r1.has(k)) r2.add(k); });
      }
      if (S.rule3) {
        let run = 1, dir = 0;
        v.forEach((x, i) => { if (i === 0) return; const d = x > v[i - 1] ? 1 : x < v[i - 1] ? -1 : 0; if (d && d === dir) run++; else { run = 2; dir = d; } if (run >= 6) for (let k = i - run + 1; k <= i; k++) if (!r1.has(k) && !r2.has(k)) r3.add(k); });
      }
      const ST = GG.tokens.STATUS;
      const main = ctx.color(0);
      const L = ctx.layout;
      const legendNames = [t.columns[1] || 'Medição', 'Fora dos limites'].concat(S.rule2 ? ['8 do mesmo lado'] : []).concat(S.rule3 ? ['Tendência de 6'] : []);
      const legend = B.legend(ctx, legendNames);
      const f3 = (x) => ctx.fmt(x, { d: ctx.f.d == null ? 2 : ctx.f.d });
      const lim = [
        { yAxis: ucl, name: 'LSC', label: { formatter: 'LSC ' + f3(ucl) }, lineStyle: { color: ST.critical, type: [5, 4] } },
        { yAxis: mean, name: 'LC', label: { formatter: 'Média ' + f3(mean) }, lineStyle: { color: T.ink2, type: 'solid' } },
        { yAxis: lcl, name: 'LIC', label: { formatter: 'LIC ' + f3(lcl) }, lineStyle: { color: ST.critical, type: [5, 4] } }
      ];
      const lsl = N(S.lsl), usl = N(S.usl);
      if (lsl !== null) lim.push({ yAxis: lsl, label: { formatter: 'LIE ' + f3(lsl) }, lineStyle: { color: T.ink, type: [2, 3] } });
      if (usl !== null) lim.push({ yAxis: usl, label: { formatter: 'LSE ' + f3(usl) }, lineStyle: { color: T.ink, type: [2, 3] } });
      const zones = S.zones ? { silent: true, itemStyle: { color: ctx.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(11,11,11,0.035)' },
        data: [[{ yAxis: mean - sigma }, { yAxis: mean + sigma }], [{ yAxis: mean + 2 * sigma }, { yAxis: mean + 3 * sigma }], [{ yAxis: mean - 3 * sigma }, { yAxis: mean - 2 * sigma }]] } : undefined;
      const plotH = ctx.H - L.top - L.bottom;
      const showMR = S.showMR && plotH > 260;
      const g1 = B.grid(ctx, { right: 96, bottom: showMR ? L.bottom + plotH * 0.3 + 24 : L.bottom });
      const grids = [g1];
      const pts = (set, sym, col, name) => ({ type: 'scatter', name, symbol: sym, symbolSize: 12, z: 5, itemStyle: { color: col, borderColor: T.surface, borderWidth: 1.5 }, data: v.map((x, i) => (set.has(i) ? [cats[i], x] : null)).filter(Boolean) });
      const series = [
        {
          type: 'line', name: legendNames[0], data: v, color: main, symbol: 'circle', symbolSize: 6, showSymbol: v.length <= 80,
          lineStyle: { width: 1.5, color: main }, itemStyle: B.ring(ctx, main), z: 3,
          markLine: { silent: true, symbol: 'none', animation: false, label: { position: 'end', color: T.ink2, fontSize: 11, fontFamily: GG.FONT }, data: lim },
          markArea: zones
        },
        pts(r1, 'diamond', ST.critical, 'Fora dos limites')
      ];
      if (S.rule2) series.push(pts(r2, 'triangle', ST.warning, '8 do mesmo lado'));
      if (S.rule3) series.push(pts(r3, 'rect', ST.serious, 'Tendência de 6'));
      const xAxes = [B.catAxis(ctx, cats, { boundaryGap: false, axisLabel: { show: !showMR, color: T.muted, fontSize: 11, hideOverlap: true } })];
      const yAxes = [B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true })];
      const allY = vals.concat([ucl, lcl]).concat(lsl !== null ? [lsl] : []).concat(usl !== null ? [usl] : []);
      yAxes[0].min = Math.min(...allY) - sigma * 0.5; yAxes[0].max = Math.max(...allY) + sigma * 0.5;
      yAxes[0].min = +yAxes[0].min.toPrecision(3); yAxes[0].max = +yAxes[0].max.toPrecision(3);
      const titles = [];
      if (showMR) {
        const mrUcl = 3.267 * mrBar;
        grids.push({ left: L.left, right: 96, height: plotH * 0.3 - 20, bottom: L.bottom, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' });
        xAxes.push(B.catAxis(ctx, cats, { gridIndex: 1, boundaryGap: false }));
        yAxes.push(B.valueAxis(ctx, { gridIndex: 1, splitNumber: 2, min: 0 }));
        titles.push({ text: 'Amplitude móvel', left: L.left, bottom: L.bottom + plotH * 0.3 - 16, textStyle: { fontSize: 11, fontWeight: 600, color: T.ink2, fontFamily: GG.FONT } });
        series.push({
          type: 'line', name: 'Amplitude móvel', xAxisIndex: 1, yAxisIndex: 1, data: mr, color: T.ink2, symbol: 'none', lineStyle: { width: 1.5, color: T.ink2 },
          markLine: { silent: true, symbol: 'none', label: { position: 'end', color: T.ink2, fontSize: 11 }, data: [{ yAxis: mrBar, label: { formatter: 'AM ' + f3(mrBar) }, lineStyle: { color: T.ink2, type: 'solid' } }, { yAxis: mrUcl, label: { formatter: 'LSC ' + f3(mrUcl) }, lineStyle: { color: ST.critical, type: [5, 4] } }] }
        });
      }
      return {
        option: {
          title: titles, grid: grids, legend, xAxis: xAxes, yAxis: yAxes, series,
          axisPointer: { link: [{ xAxisIndex: 'all' }] },
          tooltip: B.tooltip(ctx, { formatter: B.tipAxis(ctx, { showName: true, skip: ['Fora dos limites', '8 do mesmo lado', 'Tendência de 6'], f: { d: ctx.f.d == null ? 2 : ctx.f.d, p: ctx.f.p, s: ctx.f.s } }) })
        },
        meta: { annot: false, spc: { mean, sigma, ucl, lcl, n: vals.length, out: r1.size } }
      };
    }
  });

  // ================================================================ CANDLESTICK
  B.register({
    id: 'candlestick', name: 'Candlestick (OHLC)', group: 'Finanças', shape: 'wide',
    roles: ['Data', 'Abertura', 'Fechamento', 'Mínima', 'Máxima', 'Volume (opc.)'],
    hint: 'Preço de ativos. Alta = vazado verde, baixa = cheio vermelho (forma + cor). Volume em painel separado, nunca em 2º eixo.',
    hl: 'none', annot: true,
    settings: [
      { k: 'ma', l: 'Médias móveis (ex.: 5,20)', t: 'text', d: '5,20' },
      { k: 'zoom', l: 'Zoom com roda/gesto', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const cats = t.rows.map((r) => String(r[0]));
      const ohlc = t.rows.map((r) => [N(r[1]), N(r[2]), N(r[3]), N(r[4])]);
      const vol = t.rows.map((r) => N(r[5]));
      const hasVol = vol.some((x) => x !== null);
      const ST = GG.tokens.STATUS;
      const L = ctx.layout;
      const mas = String(S.ma || '').split(/[,;\s]+/).map((x) => parseInt(x, 10)).filter((x) => x > 1).slice(0, 3);
      const legendNames = ['Preço'].concat(mas.map((m) => 'MM' + m));
      const legend = mas.length ? B.legend(ctx, legendNames) : undefined;
      const plotH = ctx.H - L.top - L.bottom;
      const g1 = B.grid(ctx, { bottom: hasVol ? L.bottom + plotH * 0.22 + 16 : L.bottom });
      const grids = [g1];
      const close = ohlc.map((x) => x[1]);
      const series = [{
        type: 'candlestick', name: 'Preço', data: ohlc, barMaxWidth: 12,
        itemStyle: { color: T.surface, color0: ST.critical, borderColor: ST.good, borderColor0: ST.critical, borderWidth: 1.5 }
      }];
      mas.forEach((m, k) => {
        const col = ctx.color(k);
        series.push({ type: 'line', name: 'MM' + m, symbol: 'none', smooth: 0.2, color: col, lineStyle: { width: 2, color: col },
          data: close.map((_, i) => (i < m - 1 ? null : +(close.slice(i - m + 1, i + 1).reduce((a, b) => a + b, 0) / m).toFixed(4))) });
      });
      const xAxes = [B.catAxis(ctx, cats, { axisLabel: { show: !hasVol, color: T.muted, fontSize: 11, hideOverlap: true } })];
      const yAxes = [B.applyValueRange(ctx, B.valueAxis(ctx), { scale: true })];
      if (hasVol) {
        grids.push({ left: L.left, right: L.right, height: plotH * 0.22 - 8, bottom: L.bottom, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' });
        xAxes.push(B.catAxis(ctx, cats, { gridIndex: 1 }));
        yAxes.push(B.valueAxis(ctx, { gridIndex: 1, splitNumber: 2, axisLabel: { color: T.muted, fontSize: 10, formatter: ctx.fn('axis', { f: { c: true } }) } }));
        series.push({ type: 'bar', name: 'Volume', xAxisIndex: 1, yAxisIndex: 1, barMaxWidth: 12,
          data: vol.map((x, i) => ({ value: x, itemStyle: { color: ohlc[i][1] >= ohlc[i][0] ? ST.good : ST.critical, opacity: 0.55 } })) });
      }
      return {
        option: {
          grid: grids, legend, xAxis: xAxes, yAxis: yAxes, series,
          axisPointer: { link: [{ xAxisIndex: 'all' }] },
          dataZoom: S.zoom ? [{ type: 'inside', xAxisIndex: hasVol ? [0, 1] : [0], start: cats.length > 90 ? 100 - 9000 / cats.length : 0, end: 100 }] : undefined,
          tooltip: B.tooltip(ctx, { formatter: ctx.fn('tipOhlc', { f: ctx.f, c: ctx.c }) })
        },
        meta: { valueAxis: 'y', annotSeries: 0 }
      };
    }
  });

  // ================================================================ LINHA DO TEMPO (eventos)
  B.register({
    id: 'timeline', name: 'Linha do tempo de eventos', group: 'Projetos', shape: 'wide',
    roles: ['Data', 'Evento', 'Categoria (opc.)'],
    hint: 'Marcos no tempo com rótulos alternados acima e abaixo do eixo.',
    hl: 'categories', annot: false,
    settings: [{ k: 'levels', l: 'Níveis de altura dos rótulos', t: 'number', d: 3 }],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const rows = t.rows.map((r) => ({ d: GG.data.toDate(r[0]), text: String(r[1] || ''), cat: r[2] ? String(r[2]) : '' })).filter((x) => x.d).sort((a, b) => a.d - b.d);
      const cats = [];
      rows.forEach((r) => { if (r.cat && cats.indexOf(r.cat) < 0) cats.push(r.cat); });
      const lv = Math.max(1, Math.min(5, parseInt(S.levels, 10) || 3));
      const data = rows.map((r, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const lvl = (Math.floor(i / 2) % lv) + 1;
        const ci = r.cat ? cats.indexOf(r.cat) : 0;
        const col = ctx.hiOn ? (ctx.isHi(r.cat) || ctx.isHi(r.text) ? ctx.accentColor(ci) : T.deemph) : ctx.color(ci);
        return { name: r.text, value: [r.d.getTime(), side * lvl, ci], itemStyle: { color: col } };
      });
      const legend = cats.length > 1 ? B.legend(ctx, cats) : undefined;
      const ts = rows.map((r) => r.d.getTime());
      const pad = ts.length ? (Math.max(...ts) - Math.min(...ts)) * 0.06 + 864e5 : 864e5;
      return {
        option: {
          grid: B.grid(ctx, { outerBoundsMode: 'none', left: 40, right: 40 }), legend,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { c: ctx.c, rows: [{ l: '', d: 0, date: 'full' }] }) }),
          xAxis: { type: 'time', min: ts.length ? Math.min(...ts) - pad : undefined, max: ts.length ? Math.max(...ts) + pad : undefined,
            axisLine: { show: true, onZero: true, lineStyle: { color: T.ink2, width: 1.5 } }, axisTick: { show: false }, splitLine: { show: false },
            axisLabel: { show: false } },
          yAxis: { type: 'value', show: false, min: -lv - 0.8, max: lv + 0.8 },
          series: [{
            type: 'custom', name: 'Eventos', renderItem: ctx.fn('rEvent', { texts: rows.map((r) => r.text), dates: rows.map((r) => r.d.getTime()), ink: T.ink, ink2: T.ink2, stem: T.axis, surface: T.surface, font: GG.FONT, labels: S.labels !== 'none' }),
            encode: { x: 0, y: 1 }, data
          }].concat(cats.map((c, i) => ({ type: 'scatter', name: c, data: [], color: ctx.color(i) })))
        },
        meta: { annot: false }
      };
    }
  });

  // ================================================================ GANTT
  B.register({
    id: 'gantt', name: 'Gantt (cronograma)', group: 'Projetos', shape: 'wide',
    roles: ['Tarefa', 'Início (data)', 'Fim (data)', 'Fase / grupo (opc.)', 'Progresso 0–1 (opc.)'],
    hint: 'Cronograma de tarefas. Fases ganham cores; o progresso aparece como preenchimento parcial.',
    hl: 'series', annot: false,
    settings: [{ k: 'today', l: 'Data de hoje (linha)', t: 'text', d: '', ph: 'aaaa-mm-dd' }],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const rows = t.rows.map((r) => ({ task: String(r[0] || ''), s: GG.data.toDate(r[1]), e: GG.data.toDate(r[2]), g: r[3] ? String(r[3]) : 'Tarefas', p: N(r[4]) })).filter((x) => x.s && x.e);
      const groups = [];
      rows.forEach((r) => { if (groups.indexOf(r.g) < 0) groups.push(r.g); });
      const tasks = rows.map((r) => r.task);
      const legend = groups.length > 1 ? B.legend(ctx, groups) : undefined;
      const today = GG.data.toDate(S.today);
      ctx.layout.right = Math.max(ctx.layout.right, 30);
      ctx.layout.top += 20;
      const series = groups.map((g, gi) => {
        const col = ctx.pick(g, gi);
        return {
          type: 'custom', name: g, color: col, renderItem: ctx.fn('rGantt', { colors: [col], ink: T.ink, surface: T.surface }),
          encode: { x: [1, 2], y: 0 },
          data: rows.map((r, i) => (r.g === g ? { name: r.task, value: [i, r.s.getTime(), r.e.getTime() + (r.e > r.s ? 864e5 : 0), 0, r.p === null ? undefined : (r.p > 1 ? r.p / 100 : r.p)] } : null)).filter(Boolean),
          tooltip: { formatter: ctx.fn('tipGantt', { c: ctx.c, tasks, groups: [g] }) }
        };
      });
      if (today) {
        series[0].markLine = { silent: true, symbol: 'none', label: { formatter: 'Hoje', color: T.ink, fontSize: 11, position: 'end' }, lineStyle: { color: GG.tokens.STATUS.critical, width: 1.5, type: 'solid' }, data: [{ xAxis: today.getTime() }] };
      }
      return {
        option: {
          grid: B.grid(ctx), legend,
          tooltip: B.tooltip(ctx, { trigger: 'item' }),
          xAxis: { type: 'time', position: 'top', axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: true, lineStyle: { color: T.grid } },
            axisLabel: { color: T.muted, fontSize: 11, hideOverlap: true, formatter: { year: '{yyyy}', month: '{MMM}', day: '{d}/{M}' } } },
          yAxis: B.catAxis(ctx, tasks, { inverse: true, axisLine: { show: false }, axisLabel: { color: T.ink2, fontSize: 12, width: Math.max(110, ctx.W * 0.26), overflow: 'truncate' } }),
          series
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
