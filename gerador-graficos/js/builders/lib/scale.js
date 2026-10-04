/**
 * Graficário — biblioteca compartilhada dos construtores: escalas de cor contínuas (visualMap) e interpolação de cores.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  const hexA = (hex, a) => {
    const h = GG.color.normHex(hex).slice(1);
    return 'rgba(' + [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',') + ',' + a + ')';
  };
  /** Interpola linearmente em RGB entre paradas (igual ao visualMap), para escolher a cor do texto. */
  function lerpColor(stops, t) {
    t = Math.max(0, Math.min(1, t));
    const seg = (stops.length - 1) * t, i = Math.min(Math.floor(seg), stops.length - 2), f = seg - i;
    const a = GG.color.normHex(stops[i]).slice(1), b = GG.color.normHex(stops[i + 1]).slice(1);
    const c = [0, 2, 4].map((k) => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - f) + parseInt(b.slice(k, k + 2), 16) * f));
    return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  const SCALE_SETTINGS = [
    { k: 'scale', l: 'Escala de cor', t: 'seg', o: [['seq', 'Sequencial'], ['div', 'Divergente']], d: 'seq' },
    { k: 'hue', l: 'Matiz (sequencial)', t: 'select', o: Object.keys(GG.tokens.SEQ_HUES).map((k) => [k, GG.tokens.SEQ_HUES[k]]), d: 'blue' },
    { k: 'pair', l: 'Polos (divergente)', t: 'select', o: Object.keys(GG.tokens.DIV_PAIRS).map((k) => [k, GG.tokens.DIV_PAIRS[k].name]), d: 'blue-red' },
    { k: 'center', l: 'Centro da escala divergente', t: 'number', d: 0 }
  ];
  /** visualMap (escala de cor) + função para a cor de cada valor. */
  function colorScale(ctx, values, opts) {
    const { S, T } = ctx;
    const vals = values.filter((v) => v !== null && isFinite(v));
    let min = vals.length ? Math.min(...vals) : 0, max = vals.length ? Math.max(...vals) : 1;
    let stops;
    if (S.scale === 'div') {
      const c = N(S.center) || 0;
      const r = Math.max(Math.abs(max - c), Math.abs(c - min)) || 1;
      min = c - r; max = c + r;
      stops = GG.color.diverging(S.pair, ctx.mode);
    } else {
      stops = GG.color.sequential(S.hue || 'blue', ctx.mode);
    }
    if (min === max) max = min + 1;
    const f = Object.assign({ c: true }, ctx.f);
    const vm = {
      type: 'continuous', min, max, calculable: false, orient: 'horizontal', right: 16, bottom: ctx.layout.bottom - 6,
      itemWidth: 10, itemHeight: Math.min(180, ctx.W * 0.3), text: [ctx.R.fmt(max, f), ctx.R.fmt(min, f)], textGap: 6,
      textStyle: { color: T.muted, fontSize: 11, fontFamily: GG.FONT }, inRange: { color: stops }, dimension: opts && opts.dim, seriesIndex: opts && opts.seriesIndex,
      show: !(opts && opts.hide)
    };
    if (!(opts && opts.hide)) ctx.layout.bottom += 34;
    return { vm, colorOf: (v) => lerpColor(stops, (v - min) / (max - min)), stops, min, max };
  }

  Object.assign(B.lib, { hexA, lerpColor, SCALE_SETTINGS, colorScale });
  B.helpersDist = { colorScale, lerpColor, hexA, SCALE_SETTINGS }; // compatibilidade
})(window.GG = window.GG || {});
