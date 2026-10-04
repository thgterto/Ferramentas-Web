/**
 * Graficário — tipo de gráfico `meter`: Barras de progresso.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'meter', name: 'Barras de progresso', group: 'Indicadores', shape: 'wide',
    family: 'tab',
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
})(window.GG = window.GG || {});
