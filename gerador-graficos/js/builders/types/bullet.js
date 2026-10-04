/**
 * Graficário — tipo de gráfico `bullet`: Bullet (realizado × meta).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'bullet', name: 'Bullet (realizado × meta)', group: 'Desvio', shape: 'wide',
    family: 'tab',
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
})(window.GG = window.GG || {});
