/**
 * Graficário — tipo de gráfico `scatter`: Dispersão / bolhas.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);
  const ST = GG.stats;
  const { hexA } = B.lib;

  B.register({
    id: 'scatter', name: 'Dispersão / bolhas', group: 'Relação', shape: 'wide',
    family: 'xy', cartesian: true,
    roles: ['X (número)', 'Y (número)', 'Tamanho (opc.)', 'Grupo (opc.)', 'Rótulo (opc.)'],
    hint: 'Relação entre duas medidas. Até 3 grupos de cor; tendência e quadrantes ajudam a contar a história.',
    hl: 'points', annot: true,
    settings: [
      { k: 'sizeCol', l: 'Coluna de tamanho (bolhas)', t: 'column', d: '' },
      { k: 'groupCol', l: 'Coluna de grupo (cor)', t: 'column', d: '' },
      { k: 'labelCol', l: 'Coluna de rótulo', t: 'column', d: '' },
      { k: 'trend', l: 'Linha de tendência (regressão linear)', t: 'toggle', d: false },
      { k: 'quad', l: 'Quadrantes', t: 'select', o: [['none', 'Sem quadrantes'], ['mean', 'Divididos pela média'], ['median', 'Divididos pela mediana'], ['custom', 'Valores definidos']], d: 'none' },
      { k: 'qx', l: 'Divisão em X', t: 'number', d: '' },
      { k: 'qy', l: 'Divisão em Y', t: 'number', d: '' },
      { k: 'q1', l: 'Quadrante ↗ (alto X, alto Y)', t: 'text', d: '' },
      { k: 'q2', l: 'Quadrante ↖ (baixo X, alto Y)', t: 'text', d: '' },
      { k: 'q3', l: 'Quadrante ↙ (baixo X, baixo Y)', t: 'text', d: '' },
      { k: 'q4', l: 'Quadrante ↘ (alto X, baixo Y)', t: 'text', d: '' },
      { k: 'logX', l: 'Escala log em X', t: 'toggle', d: false },
      { k: 'logY', l: 'Escala log em Y', t: 'toggle', d: false }
    ],
    build(ctx) {
      const { T, S } = ctx;
      const t = ctx.data;
      const ci = (k) => { const v = S[k]; if (v === '' || v === null || v === undefined) return -1; const n = parseInt(v, 10); return isNaN(n) || n >= t.columns.length ? -1 : n; };
      const sc = ci('sizeCol'), gc = ci('groupCol'), lc = ci('labelCol');
      const pts = t.rows.map((r) => ({ x: N(r[0]), y: N(r[1]), s: sc >= 0 ? N(r[sc]) : null, g: gc >= 0 ? String(r[gc]) : '', l: lc >= 0 ? String(r[lc]) : '' }))
        .filter((p) => p.x !== null && p.y !== null && (!S.logX || p.x > 0) && (!S.logY || p.y > 0));
      const groups = [];
      pts.forEach((p) => { if (groups.indexOf(p.g) < 0) groups.push(p.g); });
      const multi = groups.length > 1;
      const legend = multi && B.legendNeeded(ctx, groups.length) ? B.legend(ctx, groups, { icon: 'circle', itemWidth: 10, itemHeight: 10 }) : undefined;
      const sizes = pts.map((p) => p.s).filter((v) => v !== null);
      const symSize = sc >= 0 && sizes.length ? ctx.fn('symSize', { dim: 2, min: Math.min(...sizes), max: Math.max(...sizes), r0: 8, r1: 46 }) : 10;
      const byY = pts.slice().sort((a, b) => b.y - a.y);
      const topSet = new Set(byY.slice(0, 3).concat(pts.slice().sort((a, b) => b.x - a.x).slice(0, 2)));
      const hiPoint = (p) => ctx.isHi(p.l) || ctx.isHi(p.g);
      const series = [];
      groups.forEach((g, gi) => {
        const col = ctx.hiOn && !groups.some((x) => ctx.isHi(x)) ? ctx.color(gi) : ctx.pick(g, gi);
        const data = pts.filter((p) => p.g === g).map((p) => {
          const item = { name: p.l || (multi ? g : ''), value: [p.x, p.y, p.s === null ? 1 : p.s] };
          let c = col;
          if (ctx.hiOn && lc >= 0 && !groups.some((x) => ctx.isHi(x))) c = hiPoint(p) ? ctx.accentColor(gi) : T.deemph;
          item.itemStyle = { color: hexA(c, sc >= 0 ? 0.72 : 0.88), borderColor: T.surface, borderWidth: sc >= 0 ? 1.5 : 2 };
          const show = S.labels === 'all' ? !!p.l : S.labels === 'smart' ? !!p.l && (ctx.hiOn ? hiPoint(p) : topSet.has(p)) : false;
          if (show) item.label = { show: true, formatter: p.l.replace(/[{}]/g, ''), position: 'right', distance: 6, color: T.ink2, fontSize: 11, fontFamily: GG.FONT };
          if (ctx.hiOn && hiPoint(p)) item.z = 5;
          return item;
        });
        series.push({ type: 'scatter', name: g || (t.columns[1] || 'Pontos'), data, symbolSize: symSize, color: col, labelLayout: { hideOverlap: true }, z: 3,
          emphasis: { focus: multi ? 'series' : 'none', itemStyle: { borderColor: T.ink, borderWidth: 1.5 } }, blur: { itemStyle: { opacity: 0.2 } },
          tooltip: { formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, h: multi ? 'sn' : 'n', rows: [{ l: t.columns[1] || 'Y', d: 1 }, { l: t.columns[0] || 'X', d: 0 }].concat(sc >= 0 ? [{ l: t.columns[sc], d: 2 }] : []) }) } });
      });
      // camada de alvo (≥ 24px) para o hover: invisível, mesmo nome da série
      if (pts.length <= 1500 && !ctx.thumb) {
        series.slice().forEach((s) => series.push({ type: 'scatter', name: s.name, data: s.data.map((d) => ({ name: d.name, value: d.value })), symbolSize: 26, z: 6,
          itemStyle: { color: 'rgba(0,0,0,0)' }, emphasis: { itemStyle: { color: 'rgba(0,0,0,0)', borderColor: T.ink2, borderWidth: 1 } }, tooltip: s.tooltip, legendHoverLink: false }));
      }
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const extra = { type: 'scatter', name: '__all', symbolSize: 0, silent: true, data: pts.map((p) => [p.x, p.y]), tooltip: { show: false } };
      if (S.trend && pts.length > 2) {
        const lr = ST.linreg(S.logX ? xs.map(Math.log10) : xs, S.logY ? ys.map(Math.log10) : ys);
        const mnx = Math.min(...xs), mxx = Math.max(...xs);
        const yAt = (x) => { const xx = S.logX ? Math.log10(x) : x; const yy = lr.a + lr.b * xx; return S.logY ? Math.pow(10, yy) : yy; };
        const line = [];
        for (let i = 0; i <= 20; i++) { const x = S.logX ? Math.pow(10, Math.log10(mnx) + (Math.log10(mxx) - Math.log10(mnx)) * i / 20) : mnx + (mxx - mnx) * i / 20; line.push([x, yAt(x)]); }
        series.push({ type: 'line', name: 'Tendência', data: line, symbol: 'none', silent: true, lineStyle: { color: T.ink2, width: 1.5, type: [6, 4] }, z: 2,
          endLabel: { show: true, formatter: ('R² ' + ctx.R.fmt(lr.r2, { d: 2 })).replace(/[{}]/g, ''), color: T.ink2, fontSize: 11 }, tooltip: { show: false } });
        ctx.layout.right = Math.max(ctx.layout.right, 60);
      }
      if (S.quad !== 'none' && pts.length) {
        const sx = ST.sorted(xs), sy = ST.sorted(ys);
        const qx = S.quad === 'custom' ? N(S.qx) : S.quad === 'median' ? ST.quantile(sx, 0.5) : ST.mean(xs);
        const qy = S.quad === 'custom' ? N(S.qy) : S.quad === 'median' ? ST.quantile(sy, 0.5) : ST.mean(ys);
        if (qx !== null && qy !== null) {
          extra.markLine = { silent: true, symbol: 'none', lineStyle: { color: T.ink2, width: 1, type: [4, 3] }, label: { show: false }, data: [{ xAxis: qx }, { yAxis: qy }] };
          const lab = (txt, pos) => ({ show: !!txt, position: pos, color: T.ink2, fontSize: 12, fontWeight: 600, fontFamily: GG.FONT, formatter: String(txt || '').replace(/[{}]/g, ''), distance: 4, backgroundColor: T.surface, padding: [2, 4], borderRadius: 3 });
          extra.markArea = { silent: true, itemStyle: { color: 'rgba(0,0,0,0)' }, data: [
            [{ coord: [qx, qy], label: lab(S.q1, 'insideTopRight') }, { coord: ['max', 'max'] }],
            [{ coord: ['min', qy], label: lab(S.q2, 'insideTopLeft') }, { coord: [qx, 'max'] }],
            [{ coord: ['min', 'min'], label: lab(S.q3, 'insideBottomLeft') }, { coord: [qx, qy] }],
            [{ coord: [qx, 'min'], label: lab(S.q4, 'insideBottomRight') }, { coord: ['max', qy] }]
          ] };
        }
      }
      series.unshift(extra);
      const xName = S.xName || t.columns[0] || '', yName = S.yName || t.columns[1] || '';
      ctx.layout.bottom += 18;
      const xAx = B.valueAxis(ctx, { type: S.logX ? 'log' : 'value', scale: true, name: xName, nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT }, splitLine: { show: true, lineStyle: { color: T.grid } } });
      const yAx = B.valueAxis(ctx, { type: S.logY ? 'log' : 'value', scale: true, name: yName, nameLocation: 'end', nameGap: 12, nameTextStyle: { color: T.ink2, fontSize: 12, fontFamily: GG.FONT, align: 'left' } });
      B.applyValueRange(ctx, yAx);
      return {
        option: { grid: B.grid(ctx), legend, tooltip: B.tooltip(ctx, { trigger: 'item' }), xAxis: xAx, yAxis: yAx, series },
        meta: { valueAxis: 'y', annotSeries: 0, catIsValue: true, pairs: 'all', groups: groups.length }
      };
    }
  });
})(window.GG = window.GG || {});
