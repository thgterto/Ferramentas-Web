/**
 * Graficário — tipo de gráfico `gauge`: Anéis de progresso.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'gauge', name: 'Anéis de progresso', group: 'Indicadores', shape: 'wide',
    family: 'tab',
    roles: ['Indicador', 'Valor', 'Meta / máximo (opc., padrão 100)'],
    hint: 'Até 4 proporções de meta lado a lado. Sem ponteiro, sem velocímetro: o número no centro.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'status', l: 'Estado por limite', t: 'select', o: [['none', 'Sem estado (uma cor)'], ['higher', 'Maior é melhor']], d: 'none' },
      { k: 'warn', l: 'Atenção abaixo de (% da meta)', t: 'number', d: 80 },
      { k: 'crit', l: 'Crítico abaixo de (% da meta)', t: 'number', d: 60 },
      { k: 'showPct', l: 'Mostrar % da meta no centro', t: 'toggle', d: true }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const items = ctx.data.rows.map((r) => ({ name: String(r[0] || ''), v: N(r[1]), max: N(r[2]) || 100 })).filter((x) => x.v !== null).slice(0, 4);
      const n = Math.max(items.length, 1);
      const L = ctx.layout;
      const availH = H - L.top - L.bottom;
      const cellW = (W - 32) / n;
      const r = Math.max(24, Math.min(cellW * 0.36, availH * 0.36));
      const cy = L.top + availH * 0.44;
      const hue = GG.tokens.THEMES[S.theme] ? GG.tokens.THEMES[S.theme].order[0] : 'blue';
      const ramp = GG.tokens.RAMPS[hue] || GG.tokens.RAMPS.blue;
      const track = ctx.mode === 'dark' ? ramp[12] : ramp[0];
      const ST = GG.tokens.STATUS;
      const series = items.map((it, i) => {
        const pct = it.v / it.max * 100;
        let col = ctx.hiOn ? (ctx.isHi(it.name) ? ctx.accentColor(0) : T.deemph) : ctx.color(0);
        let icon = '';
        if (S.status === 'higher') { const w = N(S.warn) || 80, c = N(S.crit) || 60; const st = pct < c ? 'critical' : pct < w ? 'warning' : 'good'; col = ST[st]; icon = { good: '✓ ', warning: '! ', critical: '✕ ' }[st]; }
        const w = Math.max(6, r * 0.16);
        return {
          type: 'gauge', center: [16 + cellW * (i + 0.5), cy], radius: r, startAngle: 90, endAngle: -270, min: 0, max: S.showPct ? 100 : it.max,
          progress: { show: true, width: w, roundCap: true, itemStyle: { color: col } },
          axisLine: { roundCap: true, lineStyle: { width: w, color: [[1, track]] } },
          pointer: { show: false }, anchor: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
          title: { show: true, offsetCenter: [0, r + 22], color: T.ink, fontSize: 13, fontWeight: 500, fontFamily: GG.FONT, width: cellW - 16, overflow: 'truncate' },
          detail: { show: true, offsetCenter: [0, 0], valueAnimation: false, color: T.ink, fontSize: Math.max(14, Math.round(r * 0.34)), fontWeight: 600, fontFamily: GG.FONT,
            formatter: ctx.fn('axis', { f: S.showPct ? { d: 0, s: '%' } : ctx.f }) },
          data: [{ value: +(S.showPct ? Math.min(pct, 100) : it.v).toFixed(4), name: icon + it.name }]
        };
      });
      const graphic = items.map((it, i) => ({ type: 'text', x: 16 + cellW * (i + 0.5), y: cy + r + 36, style: { text: ctx.fmt(it.v) + ' de ' + ctx.fmt(it.max), fill: T.ink2, font: '12px ' + GG.FONT, align: 'center' } }));
      return { option: { series, graphic, tooltip: { show: false } }, meta: { annot: false } };
    }
  });
})(window.GG = window.GG || {});
