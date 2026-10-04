/**
 * Graficário — base dos construtores.
 *
 * Um construtor transforma (dados + ajustes + tokens) num option do ECharts.
 * Esta base cuida do que é comum a todos: título-conclusão, subtítulo, fonte,
 * legenda, eixos recessivos, tooltip, anotações, texturas, modo miniatura e
 * o "override" avançado. As especificações de marca (barras ≤ 24px com ponta
 * arredondada de 4px, linhas de 2px, marcadores ≥ 8px com anel de 2px da cor do
 * fundo, grade em linha fina sólida) vivem aqui para serem iguais em todo gráfico.
 */
(function (GG) {
  'use strict';

  const FONT = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const REG = {};
  const ORDER = [];

  const REQUIRED = ['id', 'name', 'group', 'shape', 'family', 'build'];
  const CONTROL_TYPES = ['select', 'seg', 'toggle', 'number', 'text', 'column'];

  /**
   * Registra um tipo de gráfico. Cada tipo vive em js/builders/types/<id>.js e
   * declara tudo o que a aplicação precisa saber dele (inclusive `family`, que
   * define com quais tipos ele troca dados, e `cartesian`, se tem eixos x/y).
   */
  function register(def) {
    const miss = REQUIRED.filter((k) => def[k] === undefined || def[k] === '');
    if (miss.length) throw new Error('Tipo de gráfico ' + (def.id || '?') + ' sem: ' + miss.join(', '));
    if (REG[def.id]) throw new Error('Tipo de gráfico duplicado: ' + def.id);
    def.settings = def.settings || [];
    def.settings.forEach((x) => {
      if (!x.k || CONTROL_TYPES.indexOf(x.t) < 0) throw new Error('Ajuste inválido em ' + def.id + ': ' + JSON.stringify(x.k) + ' (' + x.t + ')');
    });
    def.cartesian = !!def.cartesian;
    REG[def.id] = def;
    ORDER.push(def.id);
  }
  /** Tipos da mesma família trocam dados sem conversão. */
  const compatible = (a, b) => !!REG[a] && !!REG[b] && REG[a].family === REG[b].family;

  // --- Ajustes comuns (padrões) ---------------------------------------------------
  const COMMON_DEFAULTS = {
    title: '', subtitle: '', source: '', note: '',
    theme: 'padrao', customPalette: '', highlight: [], accent: 'auto', decal: false,
    prefix: '', suffix: '', decimals: '', compact: false,
    labels: 'smart', legend: 'auto', yMin: '', yMax: '', xName: '', yName: '',
    annotations: { refs: [], bands: [], notes: [] },
    animation: true, override: ''
  };

  function settingsFor(def, s) {
    const out = Object.assign({}, COMMON_DEFAULTS);
    def.settings.forEach((x) => { if (x.d !== undefined) out[x.k] = x.d; });
    Object.assign(out, s || {});
    out.annotations = Object.assign({ refs: [], bands: [], notes: [] }, out.annotations || {});
    if (!Array.isArray(out.highlight)) out.highlight = out.highlight ? [out.highlight] : [];
    return out;
  }

  // --- Contexto -------------------------------------------------------------------
  function makeCtx(opts) {
    const mode = opts.mode || 'light';
    const T = Object.assign({}, GG.tokens.MODES[mode]);
    const def = REG[opts.type];
    const S = settingsFor(def, opts.settings);
    const R = GG.RT;
    const custom = S.theme === 'custom' ? GG.color.parseList(S.customPalette) : null;
    const palette = GG.color.themeColors(S.theme, mode, custom);
    const W = opts.width || 800, H = opts.height || 500;
    const f = {};
    if (S.prefix) f.p = S.prefix;
    if (S.suffix) f.s = S.suffix;
    if (S.decimals !== '' && S.decimals !== null && S.decimals !== undefined && !isNaN(+S.decimals)) f.d = +S.decimals;
    if (S.compact) f.c = true;
    const hi = (S.highlight || []).map(String);
    const ctx = {
      def, mode, T, S, R, W, H, f, FONT, palette, thumb: !!opts.thumb,
      data: GG.data.clean(opts.data || { columns: [], rows: [] }),
      small: W < 560,
      c: { ink: T.ink, ink2: T.ink2, muted: T.muted, grid: T.grid },
      hiOn: hi.length > 0,
      isHi: (name) => hi.indexOf(String(name)) >= 0,
      /** cor por entidade (índice fixo da coluna/categoria) — nunca por posição no ranking */
      color(i) { return i < palette.length ? palette[i] : T.deemph; },
      /** 'auto': um destaque → cor 1 (a mais forte); vários → cada um com a cor da sua entidade. */
      accentColor(i) {
        if (S.accent === 'auto' || S.accent === undefined || S.accent === '') return hi.length === 1 ? ctx.color(0) : ctx.color(i);
        if (S.accent === 'entity') return ctx.color(i);
        const k = parseInt(S.accent, 10);
        return isNaN(k) ? ctx.color(i) : ctx.color(k);
      },
      /** cor de uma série/categoria considerando o destaque */
      pick(name, i) {
        if (!ctx.hiOn) return ctx.color(i);
        return ctx.isHi(name) ? ctx.accentColor(i) : T.deemph;
      },
      fmt: (v, extra) => R.fmt(v, Object.assign({}, f, extra || {})),
      fn: (kind, cfg) => R.fn(kind, cfg)
    };
    ctx.layout = computeLayout(ctx);
    return ctx;
  }

  // Medição real de texto (canvas) — o layout reserva exatamente o espaço que o texto ocupa.
  let mctx = null;
  function measure(text, size, weight) {
    if (mctx === null) { try { mctx = document.createElement('canvas').getContext('2d'); } catch (e) { mctx = false; } }
    const s = String(text == null ? '' : text);
    if (!mctx) return s.length * size * 0.56;
    mctx.font = (weight || 400) + ' ' + size + 'px ' + FONT;
    return mctx.measureText(s).width;
  }
  /**
   * Quebra de linha com medição real. (O quebrador do zrender conta todo caractere
   * não-ASCII — é, ã, ç — como largura de ideograma e quebra cedo demais em português;
   * por isso entregamos o texto já quebrado com \n.)
   */
  function wrap(text, fontSize, width, weight) {
    if (!text) return [];
    const out = [];
    String(text).split('\n').forEach((para) => {
      let cur = '';
      para.split(/\s+/).filter(Boolean).forEach((w) => {
        const t = cur ? cur + ' ' + w : w;
        if (cur && measure(t, fontSize, weight) > width) { out.push(cur); cur = w; } else cur = t;
      });
      out.push(cur);
    });
    return out;
  }
  function textLines(text, fontSize, width, weight) { return wrap(text, fontSize, width, weight).length; }

  function footText(S) {
    return [S.note, S.source ? (/^fonte/i.test(S.source) ? S.source : 'Fonte: ' + S.source) : ''].filter(Boolean).join('  ·  ');
  }
  function computeLayout(ctx) {
    const { S, W } = ctx;
    const tw = W - 32;
    const titleSize = ctx.small ? 15 : 17, subSize = ctx.small ? 12 : 13;
    const titleL = wrap(S.title, titleSize, tw, 600), subL = wrap(S.subtitle, subSize, tw);
    const tl = titleL.length, sl = subL.length;
    let top = 16;
    const titleH = tl * (titleSize + 6);
    const subH = sl ? sl * (subSize + 5) : 0;
    top += titleH + (sl ? (tl ? 6 : 0) + subH : 0);
    const headerBottom = top;
    const footL = wrap(footText(S), 11, tw);
    const foot = footL.length ? footL.length * 15 + 6 : 0;
    return { titleSize, subSize, tw, titleL, subL, footL, headerBottom, top: top + (tl || sl ? 14 : 0), bottom: 14 + foot, foot, left: 16, right: 22 };
  }

  // --- Peças comuns ---------------------------------------------------------------
  /** Formato dos rótulos de eixo: mesmo prefixo/sufixo, casas automáticas (ticks já são redondos). */
  const axisF = (f) => { const o = Object.assign({}, f); delete o.d; delete o.sg; return o; };
  function valueAxis(ctx, extra) {
    const { T, S } = ctx;
    const ax = {
      type: 'value',
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: T.grid, width: 1, type: 'solid' } },
      axisLabel: { color: T.muted, fontSize: 11, fontFamily: FONT, formatter: ctx.fn('axis', { f: axisF(ctx.f) }), hideOverlap: true },
      nameTextStyle: { color: T.muted, fontSize: 11, fontFamily: FONT }
    };
    return Object.assign(ax, extra || {});
  }
  function catAxis(ctx, data, extra) {
    const { T } = ctx;
    return Object.assign({
      type: 'category', data: data,
      axisLine: { show: true, lineStyle: { color: T.axis, width: 1 } },
      axisTick: { show: false },
      axisLabel: { color: T.muted, fontSize: 11, fontFamily: FONT, hideOverlap: true },
      splitLine: { show: false },
      nameTextStyle: { color: T.muted, fontSize: 11, fontFamily: FONT }
    }, extra || {});
  }
  /** Aplica min/máx/nome do eixo de valor a partir dos ajustes. Barras sempre partem do zero. */
  function applyValueRange(ctx, ax, opts) {
    const { S } = ctx;
    const mn = GG.data.toNum(S.yMin), mx = GG.data.toNum(S.yMax);
    if (mn !== null && !(opts && opts.zeroLocked && mn > 0)) ax.min = mn;
    if (mx !== null) ax.max = mx;
    if (opts && opts.scale && mn === null) ax.scale = true;
    return ax;
  }
  function grid(ctx, extra) {
    const L = ctx.layout;
    return Object.assign({
      left: L.left, right: L.right, top: L.top, bottom: L.bottom,
      outerBoundsMode: 'same', outerBoundsContain: 'all'
    }, extra || {});
  }
  function tooltip(ctx, extra) {
    const { T } = ctx;
    return Object.assign({
      trigger: 'axis', confine: true,
      backgroundColor: T.surface, borderColor: T.border, borderWidth: 1, padding: [8, 10],
      textStyle: { color: T.ink, fontSize: 12, fontFamily: FONT },
      extraCssText: 'box-shadow:0 4px 16px ' + T.shadow + ';border-radius:4px;',
      axisPointer: { type: 'line', lineStyle: { color: T.axis, width: 1, type: 'solid' }, shadowStyle: { color: ctx.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(11,11,11,0.04)' }, label: { show: false } }
    }, extra || {});
  }
  const tipAxis = (ctx, extra) => ctx.fn('tipAxis', Object.assign({ f: ctx.f, c: ctx.c }, extra || {}));
  const tipItem = (ctx, extra) => ctx.fn('tipItem', Object.assign({ f: ctx.f, c: ctx.c }, extra || {}));

  /** Estilo de rótulo de dado (texto nunca usa a cor da série). */
  function dataLabel(ctx, extra) {
    return Object.assign({ show: true, color: ctx.T.ink2, fontSize: 11, fontFamily: FONT, fontWeight: 500 }, extra || {});
  }
  /** Raio de ponta de barra: arredondado na ponta de dado, reto na base. */
  function barRadius(horizontal, negative) {
    if (horizontal) return negative ? [4, 0, 0, 4] : [0, 4, 4, 0];
    return negative ? [0, 0, 4, 4] : [4, 4, 0, 0];
  }
  /** Anel da cor do fundo em marcadores e pontos. */
  const ring = (ctx, color) => ({ color: color, borderColor: ctx.T.surface, borderWidth: 2 });

  function legendNeeded(ctx, n) {
    const L = ctx.S.legend;
    if (L === 'none') return false;
    return n >= 2;
  }
  /** Reserva espaço para a legenda e devolve o componente. */
  function legend(ctx, names, extra) {
    const { T, S } = ctx;
    const pos = S.legend === 'auto' ? 'top' : S.legend;
    const base = {
      type: 'scroll', data: names, icon: 'roundRect', itemWidth: 12, itemHeight: 8, itemGap: 16,
      textStyle: { color: T.ink2, fontSize: 12, fontFamily: FONT },
      pageIconColor: T.ink2, pageIconInactiveColor: T.axis, pageTextStyle: { color: T.muted },
      inactiveColor: T.axis, selectedMode: true
    };
    if (pos === 'bottom') {
      Object.assign(base, { bottom: ctx.layout.bottom - 4, left: 16, right: 16 });
      ctx.layout.bottom += 30;
    } else if (pos === 'right') {
      Object.assign(base, { orient: 'vertical', right: 12, top: ctx.layout.top, bottom: ctx.layout.bottom });
      const longest = Math.max(...names.map((n) => measure(n, 12)), 30);
      ctx.layout.right += Math.min(200, longest + 36);
    } else {
      Object.assign(base, { top: ctx.layout.headerBottom + 10, left: 12, right: 16 });
      ctx.layout.top += 28;
    }
    return Object.assign(base, extra || {});
  }

  /** Espaço à direita para rótulos no fim das linhas. */
  function reserveRight(ctx, labels, size) {
    const longest = Math.max(0, ...labels.map((s) => measure(s, size || 12)));
    ctx.layout.right = Math.max(ctx.layout.right, Math.min(ctx.W * 0.34, longest + 20));
  }

  // --- Anotações (linhas de referência, faixas, notas) ------------------------------
  function annotate(ctx, option, meta) {
    const A = ctx.S.annotations || {};
    const refs = (A.refs || []).filter((r) => r && r.v !== '' && r.v !== undefined && GG.data.toNum(r.v) !== null);
    const bands = (A.bands || []).filter((b) => b && b.from !== '' && b.to !== '' && b.from !== undefined);
    const notes = (A.notes || []).filter((n) => n && n.x !== '' && n.x !== undefined && n.text);
    if (!refs.length && !bands.length && !notes.length) return;
    const series = option.series || [];
    const target = series[meta.annotSeries || 0];
    if (!target) return;
    const { T } = ctx;
    const valAxis = meta.valueAxis || 'y';
    const catAx = valAxis === 'y' ? 'xAxis' : 'yAxis';
    const valAx = valAxis === 'y' ? 'yAxis' : 'xAxis';
    const catIsValue = meta.catIsValue;

    if (refs.length) {
      target.markLine = {
        silent: true, symbol: ['none', 'none'], animation: false,
        lineStyle: { color: T.ink2, width: 1, type: [4, 3], opacity: 0.9 },
        label: { color: T.ink2, fontSize: 11, fontFamily: FONT, position: valAxis === 'y' ? 'insideEndTop' : 'insideEndTop', distance: 4 },
        data: refs.map((r) => {
          const v = GG.data.toNum(r.v);
          const o = {}; o[r.axis === 'cat' ? catAx : valAx] = r.axis === 'cat' ? (catIsValue ? v : String(r.v)) : v;
          o.label = { formatter: ((r.label ? r.label + ' ' : '') + (r.axis === 'cat' ? '' : ctx.R.fmt(v, meta.valFmt || ctx.f))).replace(/[{}]/g, '').trim() };
          if (r.axis === 'cat') o.label.position = 'insideEndTop';
          return o;
        })
      };
    }
    if (bands.length) {
      target.markArea = {
        silent: true, animation: false,
        itemStyle: { color: ctx.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(11,11,11,0.045)' },
        label: { color: T.ink2, fontSize: 11, fontFamily: FONT, position: 'insideTop', distance: 6 },
        data: bands.map((b) => {
          const onVal = b.axis === 'val';
          const ax = onVal ? valAx : catAx;
          const conv = (x) => (onVal || catIsValue ? GG.data.toNum(x) : String(x));
          const a = {}, z = {};
          a[ax] = conv(b.from); z[ax] = conv(b.to);
          a.name = (b.label || '').replace(/[{}]/g, '');
          return [a, z];
        })
      };
    }
    if (notes.length && meta.noteCoord) {
      target.markPoint = {
        animation: false,
        symbol: 'circle', symbolSize: 9,
        itemStyle: { color: T.ink, borderColor: T.surface, borderWidth: 2 },
        label: {
          show: true, position: 'top', distance: 8, color: T.ink, fontSize: 11, fontFamily: FONT, fontWeight: 500,
          backgroundColor: T.surface, padding: [3, 6], borderRadius: 3, borderColor: T.border, borderWidth: 1
        },
        data: notes.map((n) => {
          const coord = meta.noteCoord(n);
          if (!coord) return null;
          return { coord: coord, value: '', label: { formatter: String(n.text).replace(/[{}]/g, '') } };
        }).filter(Boolean)
      };
    }
  }

  // --- Texturas (acessibilidade, impressão) ------------------------------------------
  function decals(ctx) {
    const ink = ctx.mode === 'dark' ? 'rgba(255,255,255,0.42)' : 'rgba(11,11,11,0.34)';
    return Array.from({ length: 8 }, (_, i) => ({
      symbol: 'rect', symbolSize: 1, color: ink, backgroundColor: null,
      rotation: (i % 2 ? -1 : 1) * Math.PI / 4,
      dashArrayX: [1, 0], dashArrayY: [1.5, 2.5 + Math.floor(i / 2) * 2]
    }));
  }

  // --- Composição final --------------------------------------------------------------
  function compose(ctx, option, meta) {
    meta = meta || {};
    const { T, S, W } = ctx;
    const L = ctx.layout;
    const titles = [];
    if (S.title || S.subtitle) {
      titles.push({
        text: L.titleL.join('\n'), subtext: L.subL.join('\n'), left: 16, top: 16, itemGap: 6, padding: 0,
        textStyle: { color: T.ink, fontSize: L.titleSize, fontWeight: 600, fontFamily: FONT, lineHeight: L.titleSize + 6 },
        subtextStyle: { color: T.ink2, fontSize: L.subSize, fontFamily: FONT, lineHeight: L.subSize + 5 }
      });
    }
    if (L.footL.length) {
      titles.push({ text: L.footL.join('\n'), left: 16, bottom: 10, padding: 0, textStyle: { color: T.muted, fontSize: 11, fontWeight: 400, fontFamily: FONT, lineHeight: 15 } });
    }
    const out = Object.assign({
      backgroundColor: T.surface,
      textStyle: { fontFamily: FONT, color: T.ink2 },
      title: titles,
      color: ctx.palette.concat([T.deemph]),
      animation: S.animation !== false && !ctx.thumb,
      animationDuration: 550, animationDurationUpdate: 350, animationEasing: 'cubicOut',
      aria: { enabled: true, label: { enabled: true }, decal: { show: !!S.decal, decals: decals(ctx) } }
    }, option);
    if (option.title) out.title = titles.concat(option.title);

    if (meta.annot !== false) annotate(ctx, out, meta);

    if (S.override && typeof S.override === 'string' && S.override.trim()) {
      try {
        const removed = [];
        deepMerge(out, sanitizeOverride(JSON.parse(S.override), '', removed));
        if (removed.length) out.__overrideRemoved = removed;
      } catch (e) { out.__overrideError = e.message; }
    }
    if (ctx.thumb) thumbify(out, ctx);
    return out;
  }

  /**
   * O JSON de "Avançado" pode chegar de um arquivo de projeto de terceiros. O ECharts
   * interpreta alguns textos como HTML (tooltip.formatter) ou como navegação (title.link),
   * e o HTML exportado reconstrói objetos {"__ggfn": …}. Por isso: nada de marcação, de
   * URLs executáveis, de links nem de funções do runtime vindas daqui.
   */
  const BLOCKED_KEYS = new Set(['link', 'sublink', '__ggfn', '__proto__', 'constructor', 'prototype']);
  const UNSAFE_TEXT = /[<>]|javascript:|vbscript:|data:\s*text\/html/i;
  function sanitizeOverride(v, path, removed) {
    if (Array.isArray(v)) return v.map((x, i) => sanitizeOverride(x, path + '[' + i + ']', removed)).filter((x) => x !== undefined);
    if (v && typeof v === 'object') {
      if ('__ggfn' in v) { removed.push(path || '(raiz)'); return undefined; }
      const o = {};
      Object.keys(v).forEach((k) => {
        const p = path ? path + '.' + k : k;
        if (BLOCKED_KEYS.has(k)) { removed.push(p); return; }
        const w = sanitizeOverride(v[k], p, removed);
        if (w !== undefined) o[k] = w;
      });
      return o;
    }
    if (typeof v === 'string' && UNSAFE_TEXT.test(v)) { removed.push(path); return undefined; }
    return v;
  }

  function deepMerge(a, b) {
    Object.keys(b).forEach((k) => {
      const plain = (x) => x && typeof x === 'object' && !Array.isArray(x);
      if (plain(b[k]) && plain(a[k])) deepMerge(a[k], b[k]);
      // objeto sobre uma lista de componentes (ex.: vários grids): vale para o primeiro, como no ECharts
      else if (plain(b[k]) && Array.isArray(a[k]) && a[k].length && plain(a[k][0])) deepMerge(a[k][0], b[k]);
      else if (Array.isArray(b[k]) && Array.isArray(a[k]) && b[k].every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
        b[k].forEach((x, i) => { if (a[k][i] && typeof a[k][i] === 'object') deepMerge(a[k][i], x); else a[k][i] = x; });
      } else a[k] = b[k];
    });
    return a;
  }

  /** Miniatura: sem textos, sem interação, margens mínimas. */
  function thumbify(o, ctx) {
    o.title = [];
    o.animation = false;
    o.tooltip = { show: false };
    if (o.legend) [].concat(o.legend).forEach((l) => { l.show = false; });
    if (o.visualMap) [].concat(o.visualMap).forEach((v) => { v.show = false; });
    if (o.dataZoom) delete o.dataZoom;
    const gridPad = { left: 6, right: 6, top: 8, bottom: 6 };
    if (o.grid) {
      const gs = [].concat(o.grid);
      if (gs.length === 1) Object.assign(gs[0], gridPad, { outerBoundsMode: 'none' });
      else gs.forEach((g) => { g.outerBoundsMode = 'none'; });
    }
    ['xAxis', 'yAxis', 'radiusAxis', 'angleAxis', 'singleAxis'].forEach((k) => {
      if (!o[k]) return;
      [].concat(o[k]).forEach((ax) => { ax.axisLabel = Object.assign({}, ax.axisLabel, { show: false }); ax.name = ''; });
    });
    if (o.radar) [].concat(o.radar).forEach((r) => { r.axisName = { show: false }; r.radius = '78%'; r.center = ['50%', '52%']; });
    if (o.calendar) [].concat(o.calendar).forEach((c) => { c.dayLabel = { show: false }; c.monthLabel = { show: false }; c.yearLabel = { show: false }; c.left = 6; c.right = 6; c.top = 10; });
    if (o.parallelAxis) o.parallelAxis.forEach((a) => { a.name = ''; a.axisLabel = { show: false }; });
    if (o.parallel) Object.assign(o.parallel, { left: 10, right: 10, top: 10, bottom: 10 });
    (o.series || []).forEach((s) => {
      if (s.label) s.label = Object.assign({}, s.label, { show: false });
      if (s.endLabel) s.endLabel = { show: false };
      if (s.labelLine) s.labelLine = { show: false };
      if (s.edgeLabel) s.edgeLabel = { show: false };
      if (s.markLine && s.markLine.label) s.markLine.label.show = false;
      if (s.markArea && s.markArea.label) s.markArea.label.show = false;
      if (s.markPoint) delete s.markPoint;
      if (Array.isArray(s.data)) s.data.forEach((d) => { if (d && typeof d === 'object' && !Array.isArray(d) && d.label) d.label = { show: false }; });
      if (s.levels) s.levels.forEach((l) => { if (l.label) l.label.show = false; if (l.upperLabel) l.upperLabel.show = false; });
      if (s.type === 'treemap') { s.breadcrumb = { show: false }; s.upperLabel = { show: false }; s.top = 4; s.bottom = 4; s.left = 4; s.right = 4; }
      if (s.type === 'sunburst' || s.type === 'pie') { s.center = ['50%', '50%']; }
      if (s.type === 'sankey') Object.assign(s, { left: 6, right: 6, top: 8, bottom: 8 });
      if (s.type === 'funnel') Object.assign(s, { left: '10%', width: '80%', top: 8, bottom: 8 });
      if (s.type === 'gauge') { if (s.detail) s.detail.show = false; if (s.title) s.title.show = false; }
      if (s.type === 'tree') Object.assign(s, { top: 8, bottom: 8, left: 8, right: 8 });
      if (s.type === 'graph' || s.type === 'chord') Object.assign(s, { top: 6, bottom: 6, left: 6, right: 6 });
    });
    if (o.graphic && ctx.def && !ctx.def.keepGraphicInThumb) delete o.graphic;
    return o;
  }

  /** Transforma o option em JSON serializável (funções do runtime viram marcadores). */
  function serialize(option, pretty) {
    const seen = new WeakSet();
    const walk = (v) => {
      if (typeof v === 'function') return v.__gg ? { __ggfn: v.__gg.kind, cfg: v.__gg.cfg } : undefined;
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === 'object') {
        if (seen.has(v)) return undefined;
        seen.add(v);
        const o = {};
        Object.keys(v).forEach((k) => { if (k.startsWith('__')) return; const w = walk(v[k]); if (w !== undefined) o[k] = w; });
        return o;
      }
      return v;
    };
    return JSON.stringify(walk(option), null, pretty ? 2 : 0);
  }

  // --- Utilidades de dados para construtores -----------------------------------------
  /** Tabela larga → categorias + séries numéricas. */
  function wide(ctx) {
    const t = ctx.data;
    const cats = t.rows.map((r) => (r[0] === null || r[0] === undefined ? '' : String(r[0])));
    const series = t.columns.slice(1).map((name, j) => ({ name: String(name), idx: j, values: t.rows.map((r) => GG.data.toNum(r[j + 1])) }))
      .filter((s) => s.values.some((v) => v !== null));
    return { cats, series };
  }
  /** Tabela de colunas-amostra (cada coluna = um grupo). */
  function columnsSamples(ctx) {
    const t = ctx.data;
    return t.columns.map((name, j) => ({ name: String(name), idx: j, values: t.rows.map((r) => GG.data.toNum(r[j])).filter((v) => v !== null) }))
      .filter((g) => g.values.length);
  }
  function sortIdx(values, dir) {
    const idx = values.map((_, i) => i);
    if (dir === 'desc') idx.sort((a, b) => (values[b] ?? -Infinity) - (values[a] ?? -Infinity));
    else if (dir === 'asc') idx.sort((a, b) => (values[a] ?? Infinity) - (values[b] ?? Infinity));
    return idx;
  }
  /** Índices a rotular no modo "seletivo": máximo, mínimo, último e destaques. */
  function smartIdx(ctx, values, names, opt) {
    const set = new Set();
    const valid = values.map((v, i) => [v, i]).filter((x) => x[0] !== null);
    if (!valid.length) return set;
    if (opt && opt.all) { valid.forEach((x) => set.add(x[1])); return set; }
    if (ctx.hiOn && names) names.forEach((n, i) => { if (ctx.isHi(n)) set.add(i); });
    if (!ctx.hiOn || (opt && opt.extremes)) {
      let mx = valid[0], mn = valid[0];
      valid.forEach((x) => { if (x[0] > mx[0]) mx = x; if (x[0] < mn[0]) mn = x; });
      set.add(mx[1]);
      if (opt && opt.min) set.add(mn[1]);
      if (opt && opt.last) set.add(valid[valid.length - 1][1]);
    }
    return set;
  }

  GG.FONT = FONT;
  GG.builders = {
    REG, ORDER, register, compatible, CONTROL_TYPES, makeCtx,
    /** Utilidades compartilhadas entre tipos (preenchido por js/builders/lib/*.js). */
    lib: {},
    settingsFor, compose, serialize, deepMerge,
    valueAxis, catAxis, applyValueRange, grid, tooltip, tipAxis, tipItem, dataLabel, barRadius, ring,
    legend, legendNeeded, reserveRight, wide, columnsSamples, sortIdx, smartIdx, textLines, wrap, measure, axisF, COMMON_DEFAULTS,
    /** Constrói o option completo para (tipo, dados, ajustes). */
    build(opts) {
      const def = REG[opts.type];
      if (!def) throw new Error('Tipo de gráfico desconhecido: ' + opts.type);
      const ctx = makeCtx(opts);
      const res = def.build(ctx);
      return compose(ctx, res.option, res.meta);
    }
  };
})(window.GG = window.GG || {});
