/**
 * Graficário — números como forma: KPIs, número-herói, anéis de progresso e
 * mapa em grade do Brasil. Às vezes a melhor visualização não é um gráfico.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  /** "Receita (R$)" → {label: 'Receita', f: {p: 'R$ '}}; "Churn (%)" → sufixo %. */
  function unitOf(name, base) {
    const m = String(name).match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const f = Object.assign({}, base);
    if (!m) return { label: String(name), f, pct: false };
    const u = m[2].trim();
    if (/^(R\$|US\$|U\$|€|£)$/.test(u)) f.p = u + ' ';
    else if (u === '%') f.s = '%';
    else if (/^p\.?p\.?$/i.test(u)) f.s = ' p.p.';
    else f.s = ' ' + u;
    return { label: m[1], f, pct: u === '%' };
  }

  // ================================================================ KPIs (cartões)
  B.register({
    id: 'kpi', name: 'Cartões de KPI', group: 'Indicadores', shape: 'wide',
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

  // ================================================================ NÚMERO-HERÓI
  B.register({
    id: 'hero', name: 'Número em destaque', group: 'Indicadores', shape: 'wide',
    roles: ['Rótulo', 'Valor', 'Contexto (opc.)'],
    hint: 'Um ou dois números? Não faça gráfico: escreva o número grande e diga o que ele significa.',
    hl: 'none', annot: false, keepGraphicInThumb: true,
    settings: [
      { k: 'align', l: 'Alinhamento', t: 'seg', o: [['left', 'Esquerda'], ['center', 'Centro']], d: 'left' },
      { k: 'accentNumber', l: 'Número na cor de destaque', t: 'toggle', d: false }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const rows = ctx.data.rows;
      const r0 = rows[0] || ['', null, ''];
      const r1 = rows[1];
      const L = ctx.layout;
      const availH = H - L.top - L.bottom;
      const size = Math.round(Math.max(40, Math.min(W * 0.16, availH * (r1 ? 0.34 : 0.44), 170)));
      const center = S.align === 'center';
      const x = center ? W / 2 : 24;
      const align = center ? 'center' : 'left';
      const numTxt = ctx.fmt(N(r0[1]));
      const ls = Math.max(15, Math.round(size * 0.16)), cs = Math.max(13, Math.round(size * 0.11));
      const lw = W - 48, cw = Math.min(W - 48, 640);
      const lblH = B.textLines(String(r0[0] || ''), ls, lw, 500) * (ls + 6);
      const ctxH = r0[2] ? B.textLines(String(r0[2]), cs, cw) * Math.max(18, cs + 6) : 0;
      const blockH = size * 1.08 + lblH + (ctxH ? 12 + ctxH : 0);
      const top = L.top + Math.max(0, (availH - blockH - (r1 ? 52 : 0)) / 2);
      const g = [
        { type: 'text', x, y: top, style: { text: numTxt, fill: S.accentNumber ? ctx.color(0) : T.ink, font: '600 ' + size + 'px ' + GG.FONT, align } },
        { type: 'text', x, y: top + size * 1.08, style: { text: B.wrap(String(r0[0] || ''), ls, lw, 500).join('\n'), fill: T.ink, font: '500 ' + ls + 'px ' + GG.FONT, align, lineHeight: ls + 6 } }
      ];
      if (r0[2]) g.push({ type: 'text', x, y: top + size * 1.08 + lblH + 12, style: { text: B.wrap(String(r0[2]), cs, cw).join('\n'), fill: T.ink2, font: cs + 'px ' + GG.FONT, align, lineHeight: Math.max(18, cs + 6) } });
      if (r1) {
        const v0 = N(r0[1]), v1 = N(r1[1]);
        const d = v0 !== null && v1 ? (v0 - v1) / Math.abs(v1) * 100 : null;
        const txt = String(r1[0]) + ': ' + ctx.fmt(v1) + (d !== null ? '   ' + (d >= 0 ? '▲ ' : '▼ ') + ctx.R.fmt(d, { d: 1, sg: true, s: '%' }) : '');
        g.push({ type: 'rect', shape: { x: center ? x - 180 : x, y: H - L.bottom - 44, width: center ? 360 : Math.min(W - 48, 420), height: 1 }, style: { fill: T.grid } });
        g.push({ type: 'text', x, y: H - L.bottom - 32, style: { text: txt, fill: T.ink2, font: '13px ' + GG.FONT, align } });
      }
      return { option: { graphic: g, series: [] }, meta: { annot: false } };
    }
  });

  // ================================================================ ANÉIS DE PROGRESSO
  B.register({
    id: 'gauge', name: 'Anéis de progresso', group: 'Indicadores', shape: 'wide',
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

  // ================================================================ MAPA EM GRADE — BRASIL
  const UF_POS = {
    RR: [1, 0], AP: [3, 0],
    AM: [1, 1], PA: [2, 1], MA: [3, 1], CE: [4, 1], RN: [5, 1],
    AC: [0, 2], RO: [1, 2], MT: [2, 2], TO: [3, 2], PI: [4, 2], PB: [5, 2],
    MS: [2, 3], GO: [3, 3], DF: [4, 3], PE: [5, 3],
    PR: [2, 4], SP: [3, 4], MG: [4, 4], BA: [5, 4], AL: [6, 4],
    SC: [2, 5], RJ: [4, 5], ES: [5, 5], SE: [6, 5],
    RS: [2, 6]
  };
  const UF_NAME = {
    AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
    MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco',
    PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
    SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
  };
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const BY_NAME = {};
  Object.keys(UF_NAME).forEach((k) => { BY_NAME[norm(UF_NAME[k])] = k; BY_NAME[k.toLowerCase()] = k; });

  B.register({
    id: 'tilemap', name: 'Mapa em grade — Brasil (UF)', group: 'Geografia', shape: 'wide',
    roles: ['UF (sigla ou nome)', 'Valor'],
    hint: 'Cada estado ocupa o mesmo espaço: nada de SP pequeno e AM gigante roubando a atenção pela área.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'scale', l: 'Escala de cor', t: 'seg', o: [['seq', 'Sequencial'], ['div', 'Divergente']], d: 'seq' },
      { k: 'hue', l: 'Matiz (sequencial)', t: 'select', o: Object.keys(GG.tokens.SEQ_HUES).map((k) => [k, GG.tokens.SEQ_HUES[k]]), d: 'blue' },
      { k: 'pair', l: 'Polos (divergente)', t: 'select', o: Object.keys(GG.tokens.DIV_PAIRS).map((k) => [k, GG.tokens.DIV_PAIRS[k].name]), d: 'blue-red' },
      { k: 'center', l: 'Centro da escala divergente', t: 'number', d: 0 }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      const got = {};
      ctx.data.rows.forEach((r) => { const uf = BY_NAME[norm(r[0])]; const v = N(r[1]); if (uf && v !== null) got[uf] = v; });
      const present = Object.keys(UF_POS).filter((k) => k in got), missing = Object.keys(UF_POS).filter((k) => !(k in got));
      const cs = B.helpersDist.colorScale(ctx, present.map((k) => got[k]), { dim: 2, seriesIndex: 0 });
      const L = ctx.layout;
      const availW = W - 32, availH = H - L.top - L.bottom;
      const cell = Math.min(availW / 7, availH / 7);
      const gw = cell * 7, gh = cell * 7;
      const f = Object.assign({ c: true }, ctx.f);
      return {
        option: {
          grid: { left: 16 + (availW - gw) / 2, top: L.top + (availH - gh) / 2, width: gw, height: gh },
          xAxis: { type: 'value', min: -0.5, max: 6.5, show: false },
          yAxis: { type: 'value', min: -0.5, max: 6.5, show: false, inverse: true },
          visualMap: cs.vm,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, noKey: true, rows: [{ l: '', d: 2 }] }) }),
          series: [
            { type: 'custom', name: 'Estados', renderItem: ctx.fn('rTile', { labels: present, vals: present.map((k) => ctx.R.fmt(got[k], f)), hi: present.map((k) => ctx.isHi(k)), ink: T.ink, font: GG.FONT }),
              encode: { x: 0, y: 1 }, data: present.map((k) => ({ name: k + ' · ' + UF_NAME[k], value: [UF_POS[k][0], UF_POS[k][1], got[k]] })) },
            { type: 'custom', name: 'Sem dados', color: T.surface2, silent: true, renderItem: ctx.fn('rTile', { labels: missing, vals: missing.map(() => 's/ dados'), font: GG.FONT }),
              encode: { x: 0, y: 1 }, data: missing.map((k) => ({ name: k, value: [UF_POS[k][0], UF_POS[k][1], 0] })) }
          ]
        },
        meta: { annot: false, pairs: 'seq' }
      };
    }
  });

  GG.geo = { UF_POS, UF_NAME };
})(window.GG = window.GG || {});
