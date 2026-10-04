/**
 * Graficário — tipo de gráfico `line`: Linhas / áreas.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'line', name: 'Linhas / áreas', group: 'Tempo', shape: 'wide',
    family: 'tab', cartesian: true,
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
})(window.GG = window.GG || {});
