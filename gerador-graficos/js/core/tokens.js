/**
 * Graficário — tokens de cor e validação de paleta.
 *
 * Toda cor de gráfico cumpre UM trabalho: identidade (categórica), ordem (ordinal),
 * magnitude (sequencial), polaridade (divergente) ou estado (status).
 * As paletas categóricas abaixo foram validadas (luminosidade, croma, separação
 * para daltonismo protan/deutan, piso de visão normal e contraste) nos modos claro
 * e escuro. A validação também roda no navegador (GG.color.validate) para paletas
 * personalizadas — nunca "no olho".
 */
(function (GG) {
  'use strict';

  // --- Superfícies e tinta (chrome do gráfico) --------------------------------
  const MODES = {
    light: {
      page: '#f9f9f7', surface: '#fcfcfb', surface2: '#f3f2ee',
      ink: '#0b0b0b', ink2: '#52514e', muted: '#898781',
      grid: '#e1e0d9', axis: '#c3c2b7', deemph: '#bebdb5',
      mid: '#f0efec', good: '#006300', bad: '#b3261e',
      border: 'rgba(11,11,11,0.10)', shadow: 'rgba(11,11,11,0.08)'
    },
    dark: {
      page: '#0d0d0d', surface: '#1a1a19', surface2: '#232322',
      ink: '#ffffff', ink2: '#c3c2b7', muted: '#898781',
      grid: '#2c2c2a', axis: '#383835', deemph: '#4a4945',
      mid: '#383835', good: '#0ca30c', bad: '#e66767',
      border: 'rgba(255,255,255,0.10)', shadow: 'rgba(0,0,0,0.5)'
    }
  };

  // --- Oito matizes categóricos (claro / escuro) --------------------------------
  const HUES = {
    blue:    { name: 'Azul',     light: '#2a78d6', dark: '#3987e5' },
    orange:  { name: 'Laranja',  light: '#eb6834', dark: '#d95926' },
    aqua:    { name: 'Água',     light: '#1baf7a', dark: '#199e70' },
    yellow:  { name: 'Amarelo',  light: '#eda100', dark: '#c98500' },
    magenta: { name: 'Magenta',  light: '#e87ba4', dark: '#d55181' },
    green:   { name: 'Verde',    light: '#008300', dark: '#008300' },
    violet:  { name: 'Violeta',  light: '#4a3aa7', dark: '#9085e9' },
    red:     { name: 'Vermelho', light: '#e34948', dark: '#e66767' }
  };

  // Temas = ordens das MESMAS oito cores. A ordem é o mecanismo de segurança
  // para daltonismo: cada uma passou em todos os gates (adjacente) nos dois modos,
  // e as três primeiras passam também em "todos os pares" (dispersão, mapas).
  const THEMES = {
    padrao: { name: 'Padrão', order: ['blue', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'violet', 'red'] },
    brasa:  { name: 'Brasa',  order: ['orange', 'violet', 'aqua', 'yellow', 'magenta', 'green', 'blue', 'red'] },
    mata:   { name: 'Mata',   order: ['green', 'violet', 'magenta', 'yellow', 'aqua', 'orange', 'blue', 'red'] },
    anil:   { name: 'Anil',   order: ['violet', 'orange', 'aqua', 'yellow', 'magenta', 'green', 'blue', 'red'] }
  };

  // Rampas de 13 passos (100 → 700). Azul é a rampa documentada; as demais
  // foram geradas em OKLCH com os mesmos L do azul e o matiz de cada cor.
  const RAMPS = {
    blue:    ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'],
    orange:  ['#fcd6c9', '#f7c3b0', '#f4af95', '#ee9a7c', '#e98560', '#e27044', '#dd5518', '#ca4801', '#b43f01', '#9e3601', '#892e02', '#752602', '#611e01'],
    aqua:    ['#c9e8d8', '#b0dcc5', '#94d1b3', '#78c5a0', '#57ba8e', '#2fae7c', '#009f6d', '#028f62', '#027f56', '#066f4b', '#016040', '#045136', '#01432c'],
    red:     ['#ffd4d0', '#fcbfb9', '#faa9a2', '#f5938c', '#f17c74', '#eb645f', '#e64445', '#d63136', '#bf2a2f', '#aa1e25', '#94181f', '#800e16', '#6a0b11'],
    violet:  ['#dbdcfd', '#caccf8', '#babbf7', '#a9aaf3', '#9a98f1', '#8b87ec', '#7c73ea', '#6f64db', '#6258c3', '#564caf', '#4a4198', '#3e3584', '#322b6e'],
    green:   ['#cee8cb', '#b8dcb4', '#9fd19b', '#87c582', '#6db968', '#53ad4e', '#2da128', '#129210', '#0e820b', '#017201', '#016300', '#025302', '#004500'],
    magenta: ['#f7d5e0', '#f0c2d0', '#ebadc2', '#e399b3', '#dd84a4', '#d57096', '#cd5887', '#be497a', '#a9406c', '#96355e', '#832c51', '#702344', '#5d1c38'],
    yellow:  ['#f1dcc1', '#e8cba5', '#e1ba85', '#d8a966', '#d09840', '#c78707', '#b47906', '#a26d00', '#8f6004', '#7e5404', '#6d4804', '#5c3c00', '#4c3100'],
    gray:    ['#e1dfdd', '#d2d0cd', '#c3c1bf', '#b4b2af', '#a5a3a1', '#979593', '#888684', '#7a7976', '#6c6b68', '#5f5d5b', '#52504e', '#454341', '#383735']
  };
  const SEQ_HUES = { blue: 'Azul', orange: 'Laranja', aqua: 'Água', violet: 'Violeta', green: 'Verde', magenta: 'Magenta', gray: 'Cinza' };
  const DIV_PAIRS = {
    'blue-red':    { name: 'Azul ↔ Vermelho', neg: 'blue', pos: 'red' },
    'red-blue':    { name: 'Vermelho ↔ Azul', neg: 'red', pos: 'blue' },
    'orange-blue': { name: 'Laranja ↔ Azul', neg: 'orange', pos: 'blue' },
    'blue-orange': { name: 'Azul ↔ Laranja', neg: 'blue', pos: 'orange' }
  };

  // Status: escala fixa, nunca tematizada; sempre acompanhada de ícone + rótulo.
  const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };

  // ============================================================================
  // Matemática de cor (OKLab / OKLCH / WCAG / simulação de daltonismo)
  // Porte fiel dos checks do validador de paleta (Machado-Oliveira-Fernandes 2009).
  // ============================================================================
  const s2lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lin2s = (c) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
  const isHex = (v) => /^#?[0-9a-fA-F]{6}$/.test(String(v || '').trim());
  const normHex = (v) => { v = String(v || '').trim().toLowerCase(); if (/^#?[0-9a-f]{3}$/.test(v)) { v = v.replace('#', ''); v = '#' + v.split('').map((c) => c + c).join(''); } return v.startsWith('#') ? v : '#' + v; };
  const hex2rgb = (h) => { h = normHex(h).slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
  const rgb2hex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
  const lin = (h) => hex2rgb(h).map(s2lin);
  const relLum = (h) => { const [r, g, b] = lin(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

  function oklabFromLin([r, g, b]) {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    ];
  }
  function linFromOklab(L, a, b) {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }
  const oklab = (h) => oklabFromLin(lin(h));
  const oklch = (h) => { const [L, a, b] = oklab(h); return [L, Math.hypot(a, b), Math.atan2(b, a)]; };
  const hueDeg = (h) => { const [, a, b] = oklab(h); return ((Math.atan2(b, a) * 180 / Math.PI) % 360 + 360) % 360; };
  function fromOklch(L, C, H) {
    let c = C;
    const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
    let rgb = linFromOklab(L, c * Math.cos(H), c * Math.sin(H));
    while (c > 0 && !inGamut(rgb)) { c -= 0.002; rgb = linFromOklab(L, c * Math.cos(H), c * Math.sin(H)); }
    return rgb2hex(rgb.map((v) => lin2s(Math.max(0, v))));
  }

  const MACHADO = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
  };
  function simulate(h, kind) {
    const [r, g, b] = lin(h), M = MACHADO[kind], cl = (c) => Math.max(0, Math.min(1, c));
    return [cl(M[0][0] * r + M[0][1] * g + M[0][2] * b), cl(M[1][0] * r + M[1][1] * g + M[1][2] * b), cl(M[2][0] * r + M[2][1] * g + M[2][2] * b)];
  }
  function deltaE(h1, h2, kind) {
    const a = oklabFromLin(kind ? simulate(h1, kind) : lin(h1));
    const b = oklabFromLin(kind ? simulate(h2, kind) : lin(h2));
    return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }

  const BAND = { light: [0.43, 0.77], dark: [0.48, 0.67] };

  /** Os checks computáveis de uma paleta categórica. state: pass | warn | fail */
  function validate(palette, opts) {
    opts = opts || {};
    const mode = opts.mode || 'light';
    const surface = opts.surface || MODES[mode].surface;
    const pairs = opts.pairs || 'adjacent';
    const [lo, hi] = BAND[mode];
    const out = [];
    const f3 = (x) => x.toFixed(3);

    const off = palette.filter((c) => { const L = oklch(c)[0]; return L < lo || L > hi; });
    out.push({ check: 'Faixa de luminosidade', state: off.length ? 'fail' : 'pass',
      detail: off.length ? 'Fora da faixa L ' + lo + '–' + hi + ': ' + off.map((c) => c + ' (L ' + f3(oklch(c)[0]) + ')').join(', ') : 'Todas dentro de L ' + lo + '–' + hi });

    const lowc = palette.filter((c) => oklch(c)[1] < 0.10);
    out.push({ check: 'Croma mínimo', state: lowc.length ? 'fail' : 'pass',
      detail: lowc.length ? 'Parecem cinza: ' + lowc.join(', ') : 'Todas com C ≥ 0,10' });

    const n = palette.length;
    const pl = [];
    if (pairs === 'all') { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pl.push([i, j]); }
    else { for (let i = 0; i < n - 1; i++) pl.push([i, i + 1]); }
    let worst = null;
    ['protan', 'deutan'].forEach((k) => pl.forEach(([i, j]) => {
      const d = deltaE(palette[i], palette[j], k);
      if (!worst || d < worst.d) worst = { d, k, a: palette[i], b: palette[j] };
    }));
    const wd = worst ? worst.d : 99;
    out.push({ check: 'Separação para daltonismo', state: wd >= 8 ? 'pass' : wd >= 6 ? 'warn' : 'fail',
      detail: worst ? 'Pior par ' + worst.a + '↔' + worst.b + ' ΔE ' + wd.toFixed(1) + ' (' + worst.k + ')' + (wd < 8 && wd >= 6 ? ' — exige rótulos diretos ou textura' : '') : 'n/a' });

    let nw = null;
    pl.forEach(([i, j]) => { const d = deltaE(palette[i], palette[j]); if (!nw || d < nw.d) nw = { d, a: palette[i], b: palette[j] }; });
    const nd = nw ? nw.d : 99;
    out.push({ check: 'Piso de visão normal', state: nd >= 15 ? 'pass' : 'fail',
      detail: nw ? 'Pior par ' + nw.a + '↔' + nw.b + ' ΔE ' + nd.toFixed(1) + (nd < 15 ? ' — difícil distinguir mesmo com visão plena' : '') : 'n/a' });

    const low = palette.filter((c) => contrast(c, surface) < 3);
    out.push({ check: 'Contraste com o fundo', state: low.length ? 'warn' : 'pass',
      detail: low.length ? 'Abaixo de 3:1 (use rótulos ou a tabela): ' + low.map((c) => c + ' ' + contrast(c, surface).toFixed(2) + ':1').join(', ') : 'Todas ≥ 3:1' });

    return { ok: out.every((r) => r.state !== 'fail'), report: out };
  }

  // --- Paletas derivadas ----------------------------------------------------------
  function themeColors(themeKey, mode, custom) {
    if (themeKey === 'custom' && custom && custom.length) return custom.map(normHex);
    const th = THEMES[themeKey] || THEMES.padrao;
    return th.order.map((h) => HUES[h][mode]);
  }

  /** Rampa sequencial contínua para escalas (visualMap). Claro: baixo = claro. Escuro: baixo = escuro. */
  function sequential(hue, mode, steps) {
    const r = RAMPS[hue] || RAMPS.blue;
    const idx = steps || (mode === 'dark' ? [11, 8, 6, 3, 0] : [0, 3, 6, 9, 12]);
    return idx.map((i) => r[i]);
  }

  /** Divergente: dois matizes + cinza neutro no meio (7 cores, de negativo a positivo). */
  function diverging(pairKey, mode) {
    const p = DIV_PAIRS[pairKey] || DIV_PAIRS['blue-red'];
    const n = RAMPS[p.neg], q = RAMPS[p.pos], mid = MODES[mode].mid;
    if (mode === 'dark') return [n[2], n[5], n[9], mid, q[9], q[5], q[2]];
    return [n[12], n[9], n[5], mid, q[5], q[9], q[12]];
  }
  /** Cor de um polo (para barras divergentes). */
  function pole(pairKey, side, mode) {
    const p = DIV_PAIRS[pairKey] || DIV_PAIRS['blue-red'];
    const hue = side === 'neg' ? p.neg : p.pos;
    return HUES[hue] ? HUES[hue][mode] : RAMPS[hue][7];
  }

  /**
   * Rampa ordinal com N passos (etapas de funil, faixas, níveis de Likert de um lado).
   * Interpola em OKLCH ao longo da rampa do matiz, restrita à faixa onde o passo
   * mais próximo do fundo ainda tem ≥ 2:1 de contraste.
   */
  function ordinal(hue, n, mode) {
    const r = RAMPS[hue] || RAMPS.blue;
    const surface = MODES[mode].surface;
    const pts = r.map(oklch);
    let a = 0, b = r.length - 1;
    if (mode === 'light') { while (a < b && contrast(r[a], surface) < 2.05) a++; }
    else { while (b > a && contrast(r[b], surface) < 2.05) b--; }
    if (n <= 1) return [mode === 'light' ? r[Math.round((a + b) / 2) + 1] : r[Math.round((a + b) / 2) - 1]];
    const res = [];
    for (let i = 0; i < n; i++) {
      const t = a + (b - a) * (i / (n - 1));
      const k = Math.min(Math.floor(t), r.length - 2), f = t - k;
      const p0 = pts[k], p1 = pts[k + 1];
      let dh = p1[2] - p0[2]; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
      res.push(fromOklch(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, p0[2] + dh * f));
    }
    // claro: do mais claro ao mais escuro; escuro: do mais escuro (perto do fundo) ao mais claro
    return mode === 'dark' ? res.reverse() : res;
  }

  /** Texto branco ou tinta sobre um preenchimento, pelo contraste. */
  function inkOn(fill) {
    try { return contrast(fill, '#ffffff') >= contrast(fill, '#0b0b0b') ? '#ffffff' : '#0b0b0b'; } catch (e) { return '#0b0b0b'; }
  }

  GG.tokens = { MODES, HUES, THEMES, RAMPS, SEQ_HUES, DIV_PAIRS, STATUS };
  GG.color = {
    isHex, normHex, contrast, oklch, hueDeg, deltaE, validate,
    themeColors, sequential, diverging, pole, ordinal, inkOn,
    parseList: (s) => String(s || '').split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean).filter(isHex).map(normHex)
  };
})(window.GG = window.GG || {});
