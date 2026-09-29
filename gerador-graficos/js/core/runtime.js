/**
 * Graficário — runtime serializável.
 *
 * TODA função que entra num option do ECharts (formatadores, tooltips, renderItem)
 * é criada por RT.fn(tipo, cfg). A função recebe uma etiqueta {tipo, cfg} e, na
 * exportação, vira {"__ggfn": tipo, "cfg": {...}} no JSON. O HTML exportado embute
 * ESTE arquivo (via toString) e chama RT.revive(option) — o gráfico exportado
 * funciona sozinho, sem o gerador.
 *
 * Regra: este arquivo não pode depender de nada além do `echarts` global.
 */
function GG_RUNTIME(echarts) {
  'use strict';

  // --- Locale pt-BR (datas, legenda e descrição acessível) ----------------------
  // Baseado no locale oficial PT-br do Apache ECharts (Apache-2.0), com ajustes.
  var LOCALE = {
    time: {
      month: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
      monthAbbr: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
      dayOfWeek: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
      dayOfWeekAbbr: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    },
    legend: { selector: { all: 'Todas', inverse: 'Inverter' } },
    toolbox: {
      brush: { title: { rect: 'Seleção retangular', polygon: 'Laço', lineX: 'Horizontal', lineY: 'Vertical', keep: 'Manter', clear: 'Limpar' } },
      dataView: { title: 'Dados', lang: ['Dados', 'Fechar', 'Atualizar'] },
      dataZoom: { title: { zoom: 'Zoom', back: 'Restaurar zoom' } },
      magicType: { title: { line: 'Linhas', bar: 'Barras', stack: 'Empilhar', tiled: 'Lado a lado' } },
      restore: { title: 'Restaurar' },
      saveAsImage: { title: 'Salvar imagem', lang: ['Clique com o botão direito para salvar'] }
    },
    series: {
      typeNames: {
        pie: 'pizza', bar: 'barras', line: 'linhas', scatter: 'dispersão', effectScatter: 'dispersão', radar: 'radar',
        tree: 'árvore', treemap: 'mapa de árvore', boxplot: 'caixa', candlestick: 'candlestick', k: 'candlestick',
        heatmap: 'mapa de calor', map: 'mapa', parallel: 'coordenadas paralelas', lines: 'linhas', graph: 'rede',
        sankey: 'Sankey', funnel: 'funil', gauge: 'medidor', pictorialBar: 'barras pictóricas', themeRiver: 'rio',
        sunburst: 'explosão solar', custom: 'personalizado', chart: 'gráfico', chord: 'acordes'
      }
    },
    aria: {
      general: { withTitle: 'Gráfico intitulado "{title}"', withoutTitle: 'Gráfico' },
      series: {
        single: { prefix: '', withName: ' do tipo {seriesType}, série {seriesName}.', withoutName: ' do tipo {seriesType}.' },
        multiple: {
          prefix: '. Tem {seriesCount} séries.',
          withName: ' A série {seriesId} é do tipo {seriesType} e representa {seriesName}.',
          withoutName: ' A série {seriesId} é do tipo {seriesType}.',
          separator: { middle: '', end: '' }
        }
      },
      data: {
        allData: 'Os dados são: ', partialData: 'Os primeiros {displayCnt} itens são: ',
        withName: '{name}: {value}', withoutName: '{value}', separator: { middle: ', ', end: '. ' }
      }
    }
  };
  try { echarts.registerLocale('PT-gg', LOCALE); } catch (e) { /* já registrado */ }

  // --- Números -------------------------------------------------------------------
  var NF = {};
  function nf(key, o) { return NF[key] || (NF[key] = new Intl.NumberFormat('pt-BR', o)); }

  /** f = {p: prefixo, s: sufixo, d: casas, c: compacto, m: multiplicador, sg: sinal +} */
  function fmt(v, f) {
    f = f || {};
    if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) return '–';
    var n = +v;
    if (isNaN(n)) return String(v);
    if (f.m) n = n * f.m;
    var a = Math.abs(n), s;
    if (f.c && a >= 1000) {
      var dc = f.d == null ? 1 : f.d;
      s = nf('c' + dc, { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: dc }).format(a);
    } else {
      var d = f.d;
      if (d == null) d = a === 0 ? 0 : a < 1 ? 2 : a < 10 ? 2 : a < 100 ? 1 : 0;
      var mn = f.d == null ? 0 : d;
      s = nf('n' + mn + '_' + d, { minimumFractionDigits: mn, maximumFractionDigits: d }).format(a);
    }
    var sign = n < 0 ? '−' : (f.sg && n > 0 ? '+' : '');
    return sign + (f.p || '') + s + (f.s || '');
  }

  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function fmtDate(v, style) {
    var d = v instanceof Date ? v : new Date(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00' : v);
    if (isNaN(d)) return String(v);
    if (style === 'my') return LOCALE.time.monthAbbr[d.getMonth()] + '/' + String(d.getFullYear()).slice(2);
    if (style === 'dm') return pad(d.getDate()) + ' ' + LOCALE.time.monthAbbr[d.getMonth()].toLowerCase();
    if (style === 'full') return LOCALE.time.dayOfWeekAbbr[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function lum(hex) {
    if (typeof hex !== 'string' || hex.charAt(0) !== '#' || hex.length < 7) return 0.5;
    var c = [1, 3, 5].map(function (i) {
      var x = parseInt(hex.substr(i, 2), 16) / 255;
      return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function inkOn(hex) { var L = lum(hex); return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.0543) ? '#ffffff' : '#0b0b0b'; }

  // --- Tooltip (valor lidera, rótulo segue; chave de linha, não caixa) -------------
  function head(txt, c) {
    return '<div style="font-weight:600;font-size:12px;color:' + c.ink2 + ';margin:0 0 6px;max-width:280px;white-space:normal">' + esc(txt) + '</div>';
  }
  function row(color, value, label, c, strong) {
    var key = color ? '<span style="display:inline-block;width:12px;height:3px;border-radius:2px;background:' + color + ';flex:none"></span>' : '';
    return '<div style="display:flex;align-items:center;gap:8px;line-height:1.55;font-size:12px">' + key +
      '<span style="font-weight:' + (strong === false ? 400 : 600) + ';color:' + c.ink + ';font-variant-numeric:tabular-nums">' + esc(value) + '</span>' +
      (label ? '<span style="color:' + c.ink2 + '">' + esc(label) + '</span>' : '') + '</div>';
  }
  function colorOf(p) {
    var col = p.color;
    if (col && typeof col === 'object') col = (col.colorStops && col.colorStops[0] && col.colorStops[0].color) || '';
    return typeof col === 'string' && col !== 'transparent' ? col : '';
  }
  function pickArr(p) {
    if (Array.isArray(p.data)) return p.data;
    if (p.data && Array.isArray(p.data.value)) return p.data.value;
    if (Array.isArray(p.value)) return p.value;
    return [p.value];
  }
  function valOf(p, dim) {
    var v = p.value;
    if (Array.isArray(v)) v = v[dim == null ? v.length - 1 : dim];
    return v;
  }

  var KINDS = {
    axis: function (cfg) {
      return function (v) { return fmt(v, cfg.f); };
    },
    axisAbs: function (cfg) {
      return function (v) { return fmt(Math.abs(v), cfg.f); };
    },
    axisCat: function (cfg) {
      // encurta rótulos longos de categoria
      return function (v) { v = String(v); return v.length > cfg.max ? v.slice(0, cfg.max - 1) + '…' : v; };
    },
    axisDate: function (cfg) {
      return function (v) { return fmtDate(v, cfg.style); };
    },
    label: function (cfg) {
      return function (p) {
        var v = valOf(p, cfg.dim);
        if (cfg.hideZero && (!v || +v === 0)) return '';
        if (cfg.abs) v = Math.abs(v);
        var tpl = cfg.tpl || '{v}';
        return tpl.replace('{v}', fmt(v, cfg.f)).replace('{n}', p.name || '').replace('{s}', p.seriesName || '')
          .replace('{p}', p.percent != null ? fmt(p.percent, { d: cfg.pd == null ? 0 : cfg.pd, s: '%' }) : '');
      };
    },
    /** Tooltip de texto simples: escapa HTML (os dados podem vir de CSV/colagem não confiáveis). */
    tipText: function (cfg) {
      var c = cfg.c;
      return function (p) {
        var t = (cfg.tpl || '{n}').replace('{n}', p.name || '').replace('{s}', p.seriesName || '');
        return c ? head(t, c) : esc(t);
      };
    },
    endLabel: function (cfg) {
      return function (p) {
        var v = valOf(p, cfg.dim);
        return cfg.nameOnly ? p.seriesName : (cfg.valueOnly ? fmt(v, cfg.f) : p.seriesName + '  ' + fmt(v, cfg.f));
      };
    },
    tipAxis: function (cfg) {
      var c = cfg.c;
      return function (ps) {
        if (!Array.isArray(ps)) ps = [ps];
        if (!ps.length) return '';
        var skip = cfg.skip || [];
        var rows = [], total = 0;
        ps.forEach(function (p) {
          if (skip.indexOf(p.seriesName) >= 0) return;
          var v = valOf(p, cfg.dim);
          if (v === null || v === undefined || v === '' || v === '-') return;
          total += +v || 0;
          rows.push({ col: colorOf(p), v: +v, name: p.seriesName });
        });
        if (cfg.order === 'desc') rows.sort(function (a, b) { return b.v - a.v; });
        var h = head((cfg.hp || '') + (ps[0].axisValueLabel != null ? ps[0].axisValueLabel : ps[0].name), c);
        var body = rows.map(function (r) {
          var ff = (cfg.fs && cfg.fs[r.name]) || cfg.f;
          var val = fmt(cfg.abs ? Math.abs(r.v) : r.v, ff);
          if (cfg.share && total) val += '  (' + fmt(r.v / total * 100, { d: 0, s: '%' }) + ')';
          return row(r.col, val, rows.length > 1 || cfg.showName ? r.name : '', c);
        }).join('');
        if (cfg.total && rows.length > 1) body += '<div style="border-top:1px solid ' + c.grid + ';margin-top:4px;padding-top:4px">' + row('', fmt(total, cfg.f), 'Total', c) + '</div>';
        return h + body;
      };
    },
    tipItem: function (cfg) {
      var c = cfg.c;
      return function (p) {
        var arr = pickArr(p);
        var title;
        if (cfg.nameDim != null) title = arr[cfg.nameDim];
        else if (cfg.h === 's') title = p.seriesName;
        else if (cfg.h === 'ns') title = (p.seriesName ? p.seriesName + ' · ' : '') + (p.name || '');
        else if (cfg.h === 'sn') title = (p.name ? p.name + ' · ' : '') + (p.seriesName || '');
        else title = p.name || p.seriesName || '';
        var col = cfg.noKey ? '' : colorOf(p);
        var rows = cfg.rows || [{ l: '', d: 'v' }];
        var html = head(title, c);
        rows.forEach(function (r, i) {
          var v = r.d === 'v' ? valOf(p, cfg.dim) : r.d === 'p' ? p.percent : arr[r.d];
          if (v === undefined || v === null || v === '') return;
          var txt = r.date ? fmtDate(v, r.date) : r.raw ? String(v) : fmt(r.abs ? Math.abs(v) : v, r.f || cfg.f);
          html += row(i === 0 ? col : '', txt, r.l, c, i === 0);
        });
        return html;
      };
    },
    tipFlow: function (cfg) {
      var c = cfg.c;
      return function (p) {
        if (p.dataType === 'edge') {
          return head(p.data.source + ' → ' + p.data.target, c) + row(colorOf(p), fmt(p.value, cfg.f), cfg.edge || '', c);
        }
        var v = p.value;
        if (v === undefined && p.data) v = p.data.value;
        return head(p.name, c) + (v != null ? row(colorOf(p), fmt(v, cfg.f), cfg.node || '', c) : '');
      };
    },
    tipTree: function (cfg) {
      var c = cfg.c;
      return function (p) {
        var path = (p.treePathInfo || []).map(function (x) { return x.name; }).filter(Boolean);
        if (cfg.dropRoot) path = path.slice(1);
        var v = Array.isArray(p.value) ? p.value[0] : p.value;
        var html = head(path.join(' › ') || p.name, c) + row(colorOf(p), fmt(v, cfg.f), '', c);
        if (cfg.total && v != null) html += row('', fmt(v / cfg.total * 100, { d: 1, s: '%' }), 'do total', c, false);
        return html;
      };
    },
    tipGantt: function (cfg) {
      var c = cfg.c;
      return function (p) {
        var a = pickArr(p);
        var days = Math.round((a[2] - a[1]) / 864e5);
        var html = head(cfg.tasks[a[0]] || p.name, c);
        html += row(colorOf(p), fmtDate(a[1]) + (days > 0 ? ' → ' + fmtDate(a[2]) : ''), days > 0 ? days + ' dias' : 'marco', c);
        if (cfg.groups && cfg.groups[a[3]]) html += row('', cfg.groups[a[3]], '', c, false);
        if (a[4] != null && a[4] !== '' && !isNaN(a[4])) html += row('', fmt(a[4] * 100, { d: 0, s: '%' }), 'concluído', c, false);
        return html;
      };
    },
    /** Para a categoria sob o ponteiro, lista todas as linhas de uma tabela (Likert etc.). */
    tipTable: function (cfg) {
      var c = cfg.c;
      return function (ps) {
        var p = Array.isArray(ps) ? ps[0] : ps;
        if (!p) return '';
        var i = p.dataIndex;
        var html = head(cfg.cats[i] != null ? cfg.cats[i] : p.name, c);
        cfg.rows.forEach(function (r) { html += row(r.color, fmt(r.values[i], cfg.f), r.name, c); });
        return html;
      };
    },
    tipOhlc: function (cfg) {
      var c = cfg.c;
      return function (ps) {
        if (!Array.isArray(ps)) ps = [ps];
        var html = head(ps[0].axisValueLabel || ps[0].name, c);
        ps.forEach(function (p) {
          if (p.seriesType === 'candlestick') {
            var a = pickArr(p); var o = a.length === 5 ? a.slice(1) : a;
            var up = o[1] >= o[0];
            html += row(up ? '#0ca30c' : '#d03b3b', fmt(o[1], cfg.f), (up ? '▲ ' : '▼ ') + 'fechamento', c);
            html += row('', fmt(o[0], cfg.f), 'abertura', c, false);
            html += row('', fmt(o[2], cfg.f) + ' – ' + fmt(o[3], cfg.f), 'mín – máx', c, false);
          } else if (p.value != null && p.value !== '') {
            html += row(colorOf(p), fmt(valOf(p), p.seriesName === 'Volume' ? { c: true } : cfg.f), p.seriesName, c, false);
          }
        });
        return html;
      };
    },
    tipRadar: function (cfg) {
      var c = cfg.c;
      return function (p) {
        var arr = Array.isArray(p.value) ? p.value : [];
        var html = head(p.name, c);
        arr.forEach(function (v, i) { html += row(i === 0 ? colorOf(p) : '', fmt(v, cfg.f), cfg.dims[i], c, i === 0); });
        return html;
      };
    },
    tipCal: function (cfg) {
      var c = cfg.c;
      return function (p) { var a = pickArr(p); return head(fmtDate(a[0], 'full'), c) + row(colorOf(p), fmt(a[1], cfg.f), cfg.l || '', c); };
    },
    symSize: function (cfg) {
      var s0 = Math.sqrt(Math.max(cfg.min, 0)), s1 = Math.sqrt(Math.max(cfg.max, 0));
      return function (val) {
        var v = Array.isArray(val) ? val[cfg.dim] : val;
        var t = s1 - s0 > 0 ? (Math.sqrt(Math.max(+v || 0, 0)) - s0) / (s1 - s0) : 0.5;
        return cfg.r0 + Math.max(0, Math.min(1, t)) * (cfg.r1 - cfg.r0);
      };
    },

    // --- renderItem ------------------------------------------------------------
    rGantt: function (cfg) {
      return function (params, api) {
        var cat = api.value(0), s = api.coord([api.value(1), cat]), e = api.coord([api.value(2), cat]);
        var band = api.size([0, 1])[1];
        var h = Math.min(band * 0.56, cfg.maxH || 18);
        var color = cfg.colors[api.value(3)] || cfg.colors[0];
        var cs = params.coordSys;
        if (api.value(2) <= api.value(1)) {
          var d = h * 0.55;
          return { type: 'polygon', shape: { points: [[s[0], s[1] - d], [s[0] + d, s[1]], [s[0], s[1] + d], [s[0] - d, s[1]]] },
            style: { fill: cfg.ink, stroke: cfg.surface, lineWidth: 2 } };
        }
        var rect = echarts.graphic.clipRectByRect({ x: s[0], y: s[1] - h / 2, width: Math.max(e[0] - s[0], 3), height: h },
          { x: cs.x, y: cs.y, width: cs.width, height: cs.height });
        if (!rect) return null;
        var prog = api.value(4);
        var children = [];
        var hasProg = prog !== undefined && prog !== null && !isNaN(prog) && prog < 1;
        children.push({ type: 'rect', shape: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, r: 4 },
          style: { fill: color, opacity: hasProg ? 0.32 : 1 } });
        if (hasProg && prog > 0) {
          children.push({ type: 'rect', shape: { x: rect.x, y: rect.y, width: Math.max(rect.width * prog, 3), height: rect.height, r: 4 }, style: { fill: color } });
        }
        return { type: 'group', children: children };
      };
    },
    rMekko: function (cfg) {
      return function (params, api) {
        var p0 = api.coord([api.value(0), api.value(3)]), p1 = api.coord([api.value(1), api.value(2)]);
        var x = p0[0] + 1, y = p0[1] + 1, w = Math.max(p1[0] - p0[0] - 2, 1), h = Math.max(p1[1] - p0[1] - 2, 1);
        var col = cfg.colors[api.value(4)];
        var children = [{ type: 'rect', shape: { x: x, y: y, width: w, height: h }, style: { fill: col } }];
        var share = api.value(5);
        if (cfg.labels && w > 44 && h > 22) {
          children.push({ type: 'text', style: { x: x + 6, y: y + 6, text: fmt(share, { d: 0, s: '%' }), fill: inkOn(col), font: '600 11px ' + cfg.font } });
        }
        if (api.value(6) === 1) {
          var yb = api.coord([0, 0])[1];
          children.push({ type: 'text', style: { x: x + w / 2, y: yb + 8, text: cfg.cats[api.value(7)] || '', fill: cfg.muted, font: '11px ' + cfg.font, align: 'center', verticalAlign: 'top', width: Math.max(w, 30), overflow: 'truncate' } });
        }
        return { type: 'group', children: children };
      };
    },
    rTile: function (cfg) {
      return function (params, api) {
        var c = api.coord([api.value(0), api.value(1)]), sz = api.size([1, 1]);
        var s = Math.min(sz[0], sz[1]) - 4;
        var fill = api.visual('color');
        var ink = inkOn(typeof fill === 'string' ? fill : '#cccccc');
        var i = params.dataIndex;
        var hi = cfg.hi && cfg.hi[i];
        var ch = [{ type: 'rect', shape: { x: c[0] - s / 2, y: c[1] - s / 2, width: s, height: s, r: 3 }, style: { fill: fill, stroke: hi ? cfg.ink : null, lineWidth: hi ? 2.5 : 0 } }];
        if (s > 22) {
          ch.push({ type: 'text', style: { x: c[0], y: c[1] - (s > 40 ? 7 : 0), text: cfg.labels[i], fill: ink, font: '600 ' + (s > 40 ? 12 : 10) + 'px ' + cfg.font, align: 'center', verticalAlign: 'middle' } });
          if (s > 40) ch.push({ type: 'text', style: { x: c[0], y: c[1] + 9, text: cfg.vals[i], fill: ink, font: '11px ' + cfg.font, align: 'center', verticalAlign: 'middle', opacity: 0.9 } });
        }
        return { type: 'group', children: ch };
      };
    },
    rWaffle: function (cfg) {
      return function (params, api) {
        var c = api.coord([api.value(0), api.value(1)]), sz = api.size([1, 1]);
        var s = Math.min(sz[0], sz[1]) - (cfg.gap == null ? 3 : cfg.gap);
        return { type: 'rect', shape: { x: c[0] - s / 2, y: c[1] - s / 2, width: s, height: s, r: Math.min(3, s / 4) },
          style: { fill: cfg.colors[api.value(2)] } };
      };
    },
    rRange: function (cfg) {
      return function (params, api) {
        var cat = api.value(0), lo = api.value(1), hi = api.value(2);
        var a = cfg.h ? api.coord([lo, cat]) : api.coord([cat, lo]);
        var b = cfg.h ? api.coord([hi, cat]) : api.coord([cat, hi]);
        var band = cfg.h ? api.size([0, 1])[1] : api.size([1, 0])[0];
        var t = Math.max(4, Math.min(band * 0.32, cfg.t || 10));
        var shape = cfg.h
          ? { x: Math.min(a[0], b[0]), y: a[1] - t / 2, width: Math.max(Math.abs(b[0] - a[0]), 2), height: t, r: t / 2 }
          : { x: a[0] - t / 2, y: Math.min(a[1], b[1]), width: t, height: Math.max(Math.abs(b[1] - a[1]), 2), r: t / 2 };
        return { type: 'rect', shape: shape, style: { fill: api.visual('color'), opacity: cfg.o == null ? 1 : cfg.o } };
      };
    },
    /** Cascata: barra de `de` até `para`, conectores e rótulo com sinal. value = [cat, de, para, delta] */
    rWaterfall: function (cfg) {
      return function (params, api) {
        var k = api.value(0), from = api.value(1), to = api.value(2);
        var h = cfg.h;
        var band = h ? api.size([0, 1])[1] : api.size([1, 0])[0];
        var t = Math.min(band * 0.62, 28);
        var a = h ? api.coord([from, k]) : api.coord([k, from]);
        var b = h ? api.coord([to, k]) : api.coord([k, to]);
        var col = api.visual('color');
        var shape = h
          ? { x: Math.min(a[0], b[0]), y: a[1] - t / 2, width: Math.max(Math.abs(b[0] - a[0]), 1.5), height: t, r: 3 }
          : { x: a[0] - t / 2, y: Math.min(a[1], b[1]), width: t, height: Math.max(Math.abs(b[1] - a[1]), 1.5), r: 3 };
        var ch = [{ type: 'rect', shape: shape, style: { fill: col } }];
        if (k < cfg.n - 1) {
          var nxt = h ? api.coord([to, k + 1]) : api.coord([k + 1, to]);
          var seg = h ? { x1: b[0], y1: b[1] + t / 2, x2: b[0], y2: nxt[1] - t / 2 } : { x1: b[0] + t / 2, y1: b[1], x2: nxt[0] - t / 2, y2: b[1] };
          ch.push({ type: 'line', shape: seg, style: { stroke: cfg.conn, lineWidth: 1 }, silent: true });
        }
        var txt = cfg.labels[params.dataIndex];
        if (txt) {
          var up = to >= from;
          ch.push({ type: 'text', silent: true, style: h
            ? { x: Math.max(a[0], b[0]) + 6, y: a[1], text: txt, fill: cfg.ink, font: '500 11px ' + cfg.font, align: 'left', verticalAlign: 'middle' }
            : { x: a[0], y: (up ? Math.min(a[1], b[1]) - 6 : Math.max(a[1], b[1]) + 6), text: txt, fill: cfg.ink, font: '500 11px ' + cfg.font, align: 'center', verticalAlign: up ? 'bottom' : 'top' } });
        }
        return { type: 'group', children: ch };
      };
    },
    /** Evento na linha do tempo: haste do eixo até o rótulo. value = [ts, nível, cat] */
    rEvent: function (cfg) {
      return function (params, api) {
        var base = api.coord([api.value(0), 0]), tip = api.coord([api.value(0), api.value(1)]);
        var col = api.visual('color');
        var up = api.value(1) > 0;
        var i = params.dataIndex;
        var ch = [
          { type: 'line', shape: { x1: base[0], y1: base[1], x2: tip[0], y2: tip[1] }, style: { stroke: cfg.stem, lineWidth: 1 } },
          { type: 'circle', shape: { cx: base[0], cy: base[1], r: 5 }, style: { fill: col, stroke: cfg.surface, lineWidth: 2 } },
          { type: 'circle', shape: { cx: tip[0], cy: tip[1], r: 2.5 }, style: { fill: col } }
        ];
        if (cfg.labels) {
          // perto da borda direita, o rótulo vira para a esquerda da haste
          var cs = params.coordSys;
          var flip = tip[0] > cs.x + cs.width * 0.62;
          var tx = flip ? tip[0] - 6 : tip[0] + 6, al = flip ? 'right' : 'left';
          ch.push({ type: 'text', style: { x: tx, y: tip[1] + (up ? -2 : 2), text: cfg.texts[i], fill: cfg.ink, font: '500 12px ' + cfg.font, align: al, verticalAlign: up ? 'bottom' : 'top', width: 150, overflow: 'break' } });
          ch.push({ type: 'text', style: { x: tx, y: tip[1] + (up ? 2 : -2), text: fmtDate(cfg.dates[i], 'dm') + ' ' + new Date(cfg.dates[i]).getFullYear(), fill: cfg.ink2, font: '11px ' + cfg.font, align: al, verticalAlign: up ? 'top' : 'bottom' } });
        }
        return { type: 'group', children: ch };
      };
    },
    /** Histograma em eixo de valor: value = [x0, x1, contagem] */
    rHist: function (cfg) {
      return function (params, api) {
        var a = api.coord([api.value(0), api.value(2)]), b = api.coord([api.value(1), 0]);
        var w = Math.max(b[0] - a[0] - 2, 1);
        return { type: 'rect', shape: { x: a[0] + 1, y: a[1], width: w, height: Math.max(b[1] - a[1], 0), r: [Math.min(4, w / 2), Math.min(4, w / 2), 0, 0] },
          style: { fill: api.visual('color') } };
      };
    },
    /** Marca pontual num eixo de categorias: losango (média), traço (mediana) ou ponto. value = [cat, v] */
    rMark: function (cfg) {
      return function (params, api) {
        var p = cfg.h ? api.coord([api.value(1), api.value(0)]) : api.coord([api.value(0), api.value(1)]);
        var s = cfg.size || 5;
        if (cfg.shape === 'bar') {
          var shape = cfg.h ? { x: p[0] - 1.5, y: p[1] - s / 2, width: 3, height: s, r: 1.5 } : { x: p[0] - s / 2, y: p[1] - 1.5, width: s, height: 3, r: 1.5 };
          return { type: 'rect', shape: shape, style: { fill: cfg.color } };
        }
        if (cfg.shape === 'dot') return { type: 'circle', shape: { cx: p[0], cy: p[1], r: s }, style: { fill: cfg.color } };
        return { type: 'polygon', shape: { points: [[p[0], p[1] - s], [p[0] + s, p[1]], [p[0], p[1] + s], [p[0] - s, p[1]]] }, style: { fill: cfg.color, stroke: cfg.surface || null, lineWidth: 1.5 } };
      };
    },
    rViolin: function (cfg) {
      return function (params, api) {
        var gi = api.value(0), shape = cfg.shapes[gi];
        if (!shape || !shape.length) return null;
        var half = (cfg.h ? api.size([0, 1])[1] : api.size([1, 0])[0]) * 0.42;
        var left = [], right = [];
        shape.forEach(function (pt) {
          var p = cfg.h ? api.coord([pt[0], gi]) : api.coord([gi, pt[0]]);
          var w = half * pt[1];
          if (cfg.h) { left.push([p[0], p[1] - w]); right.push([p[0], p[1] + w]); }
          else { left.push([p[0] - w, p[1]]); right.push([p[0] + w, p[1]]); }
        });
        var col = cfg.colors[gi % cfg.colors.length];
        return { type: 'polygon', shape: { points: left.concat(right.reverse()) },
          style: { fill: col, opacity: 0.22, stroke: col, lineWidth: 1.5 } };
      };
    }
  };

  function fn(kind, cfg) {
    var maker = KINDS[kind];
    if (!maker) throw new Error('Runtime: tipo desconhecido ' + kind);
    var f = maker(cfg || {});
    try { Object.defineProperty(f, '__gg', { value: { kind: kind, cfg: cfg || {} }, enumerable: false }); } catch (e) { f.__gg = { kind: kind, cfg: cfg }; }
    return f;
  }

  /** Reconstrói as funções de um option exportado. */
  function revive(o) {
    if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) o[i] = revive(o[i]); return o; }
    if (o && typeof o === 'object') {
      if (typeof o.__ggfn === 'string') return fn(o.__ggfn, o.cfg);
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) o[k] = revive(o[k]);
    }
    return o;
  }

  return { fmt: fmt, fmtDate: fmtDate, esc: esc, inkOn: inkOn, fn: fn, revive: revive, LOCALE_NAME: 'PT-gg', LOCALE: LOCALE };
}
if (typeof window !== 'undefined') window.GG_RUNTIME = GG_RUNTIME;
