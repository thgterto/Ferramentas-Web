/**
 * Graficário — tipo de gráfico `kpi`: Cartões de KPI.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { unitOf } = B.lib;

  B.register({
    id: 'kpi', name: 'Cartões de KPI', group: 'Indicadores', shape: 'wide',
    family: 'tab',
    roles: ['Período', 'Indicador A — unidade entre parênteses, ex.: Receita (R$)', '…mais indicadores'],
    hint: 'Valor atual + variação com seta e sinal + minigráfico da tendência. Não é gráfico: é o número.',
    hl: 'none', annot: false, keepGraphicInThumb: true,
    settings: [
      { k: 'compare', l: 'Comparar com', t: 'select', o: [['prev', 'Período anterior'], ['first', 'Primeiro período'], ['yoy', '12 períodos antes']], d: 'prev' },
      { k: 'vsLabel', l: 'Texto da comparação', t: 'text', d: 'vs mês anterior' },
      { k: 'lowerBetter', l: 'Indicadores em que menor é melhor (vírgulas)', t: 'text', d: '' },
      { k: 'spark', l: 'Minigráfico de tendência', t: 'toggle', d: true },
      { k: 'cols', l: 'Cartões por linha', t: 'number', d: '', ph: 'auto' }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const { cats, series } = B.wide(ctx);
      const metrics = series.slice(0, 8);
      const n = Math.max(metrics.length, 1);
      const L = ctx.layout;
      const gap = 14;
      let cols = parseInt(S.cols, 10);
      if (!(cols > 0)) cols = Math.max(1, Math.min(n, Math.floor((W - 32 + gap) / (ctx.thumb ? 110 : 210))));
      const rows = Math.ceil(n / cols);
      const tileW = (W - 32 - gap * (cols - 1)) / cols;
      const tileH = Math.min(ctx.thumb ? 999 : 230, (H - L.top - L.bottom - gap * (rows - 1)) / rows);
      const lower = String(S.lowerBetter || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
      const graphic = [], grids = [], xAxes = [], yAxes = [], out = [], fs = {};
      const spark = S.spark && tileH > 120;
      metrics.forEach((m, k) => {
        const r = Math.floor(k / cols), c = k % cols;
        const x = 16 + c * (tileW + gap), y = L.top + r * (tileH + gap);
        const u = unitOf(m.name, ctx.f);
        const f = Object.assign({ c: true }, u.f);
        fs[m.name] = f;
        const idx = m.values.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0);
        const li = idx[idx.length - 1];
        const cur = li !== undefined ? m.values[li] : null;
        let pi = null;
        if (S.compare === 'first') pi = idx[0];
        else if (S.compare === 'yoy') pi = li - 12 >= 0 ? li - 12 : null;
        else pi = idx.length > 1 ? idx[idx.length - 2] : null;
        const prev = pi !== null && pi !== undefined && pi !== li ? m.values[pi] : null;
        const delta = prev !== null && cur !== null ? cur - prev : null;
        const isLower = lower.some((w) => u.label.toLowerCase().includes(w));
        let dTxt = '', dCol = T.muted;
        if (delta !== null) {
          const good = isLower ? delta < 0 : delta > 0;
          dCol = delta === 0 ? T.muted : good ? T.good : T.bad;
          const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '■';
          const dd = Math.abs(delta) < 0.1 ? 2 : 1;
          dTxt = arrow + ' ' + (u.pct ? ctx.R.fmt(delta, { d: dd, sg: true, s: ' p.p.' }) : ctx.R.fmt(prev ? delta / Math.abs(prev) * 100 : 0, { d: 1, sg: true, s: '%' }));
        }
        const pad = Math.min(16, tileW * 0.08);
        // o valor cabe inteiro no cartão: a fonte encolhe conforme o texto
        const valTxt = ctx.R.fmt(cur, f);
        const vf = Math.max(14, Math.min(42, tileH * 0.22, 10 * (tileW - 2 * pad) / Math.max(B.measure(valTxt, 10, 600), 1)));
        const children = [
          { type: 'rect', shape: { x: 0, y: 0, width: tileW, height: tileH, r: 6 }, style: { fill: T.surface, stroke: T.grid, lineWidth: 1 }, silent: true },
          { type: 'text', x: pad, y: pad, style: { text: u.label, fill: T.ink2, font: '500 ' + Math.max(11, Math.min(13, tileW * 0.07)) + 'px ' + GG.FONT, width: tileW - 2 * pad, overflow: 'truncate' }, silent: true },
          { type: 'text', x: pad, y: pad + 22, style: { text: valTxt, fill: T.ink, font: '600 ' + vf + 'px ' + GG.FONT }, silent: true }
        ];
        if (dTxt) {
          children.push({ type: 'text', x: pad, y: pad + 30 + vf, style: { text: dTxt, fill: dCol, font: '600 12px ' + GG.FONT }, silent: true });
          const dw = B.measure(dTxt, 12, 600) + 8;
          children.push({ type: 'text', x: pad + dw, y: pad + 30 + vf, style: { text: S.vsLabel || '', fill: T.muted, font: '12px ' + GG.FONT, width: Math.max(10, tileW - 2 * pad - dw), overflow: 'truncate' }, silent: true });
        }
        graphic.push({ type: 'group', x, y, children });
        if (spark) {
          grids.push({ left: x + pad, width: tileW - 2 * pad, top: y + tileH * 0.64, height: tileH * 0.36 - pad - 2, outerBoundsMode: 'none' });
          xAxes.push({ type: 'category', gridIndex: grids.length - 1, data: cats, show: false, boundaryGap: false });
          yAxes.push({ type: 'value', gridIndex: grids.length - 1, show: false, scale: true });
          const acc = ctx.color(0);
          out.push({
            type: 'line', name: m.name, xAxisIndex: grids.length - 1, yAxisIndex: grids.length - 1, symbol: 'circle', symbolSize: 7, color: T.deemph,
            lineStyle: { width: 1.5, color: ctx.mode === 'dark' ? '#6d6c66' : '#a3a29a' }, areaStyle: { color: T.deemph, opacity: 0.12 },
            data: m.values.map((v, i) => (i === li ? { value: v, itemStyle: B.ring(ctx, acc) } : { value: v, symbol: 'none' }))
          });
        }
      });
      return {
        option: {
          graphic, grid: grids.length ? grids : undefined, xAxis: xAxes.length ? xAxes : undefined, yAxis: yAxes.length ? yAxes : undefined, series: out,
          tooltip: B.tooltip(ctx, { formatter: ctx.fn('tipAxis', { f: ctx.f, fs, c: ctx.c, showName: true }) })
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
