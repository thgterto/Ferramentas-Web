/**
 * Graficário — tipo de gráfico `hero`: Número em destaque.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  B.register({
    id: 'hero', name: 'Número em destaque', group: 'Indicadores', shape: 'wide',
    family: 'tab',
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
})(window.GG = window.GG || {});
