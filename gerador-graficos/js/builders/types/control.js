/**
 * Graficário — tipo de gráfico `control`: Carta de controle (I-AM).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'control', name: 'Carta de controle (I-AM)', group: 'Qualidade', shape: 'wide',
    family: 'tab', cartesian: true,
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
})(window.GG = window.GG || {});
