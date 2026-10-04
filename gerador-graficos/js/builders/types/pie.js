/**
 * Graficário — tipo de gráfico `pie`: Rosca / pizza.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { kv } = B.lib;

  B.register({
    id: 'pie', name: 'Rosca / pizza', group: 'Parte do todo', shape: 'wide',
    family: 'tab',
    roles: ['Fatia', 'Valor'],
    hint: 'Parte do todo num relance, com até 6 fatias. Para comparar valores próximos, prefira barras.',
    hl: 'categories', annot: false,
    settings: [
      { k: 'donut', l: 'Rosca (com total no centro)', t: 'toggle', d: true },
      { k: 'maxSlices', l: 'Máximo de fatias (resto vira "Outros")', t: 'number', d: 6 },
      { k: 'sortSlices', l: 'Ordenar do maior para o menor', t: 'toggle', d: true },
      { k: 'center', l: 'Texto do centro', t: 'text', d: 'total' }
    ],
    build(ctx) {
      const { T, S, W, H } = ctx;
      let items = kv(ctx);
      if (S.sortSlices) items = items.slice().sort((a, b) => b.value - a.value);
      const max = Math.max(2, parseInt(S.maxSlices, 10) || 6);
      if (items.length > max) {
        const keep = items.slice(0, max - 1), rest = items.slice(max - 1);
        items = keep.concat([{ name: 'Outros', value: rest.reduce((a, b) => a + b.value, 0), idx: -1 }]);
      }
      const total = items.reduce((a, b) => a + b.value, 0);
      const L = ctx.layout;
      const legend = S.legend !== 'none' && S.labels === 'none' ? B.legend(ctx, items.map((x) => x.name)) : undefined;
      const areaH = H - L.top - L.bottom, cy = L.top + areaH / 2;
      const r = Math.max(30, Math.min(W * 0.5 - (S.labels !== 'none' ? 110 : 20), areaH / 2 - 8));
      const colorOf = (x) => (x.idx < 0 ? T.deemph : ctx.hiOn ? (ctx.isHi(x.name) ? ctx.accentColor(x.idx) : T.deemph) : ctx.color(x.idx));
      const graphic = [];
      if (S.donut && S.center) {
        const big = S.center === 'total' ? ctx.fmt(total) : S.center === 'first' && items[0] ? ctx.R.fmt(items[0].value / total * 100, { d: 0, s: '%' }) : S.center;
        const small = S.center === 'total' ? 'total' : S.center === 'first' && items[0] ? items[0].name : '';
        // o número cabe no furo da rosca: a fonte encolhe conforme o texto
        const hole = r * 0.62 * 2 * 0.78;
        const fs = Math.max(12, Math.min(30, r * 0.3, 30 * hole / Math.max(B.measure(big, 30, 600), 1)));
        graphic.push({ type: 'text', left: 'center', top: cy - (small ? fs * 0.9 : fs * 0.5), style: { text: big, fill: T.ink, font: '600 ' + fs + 'px ' + GG.FONT, align: 'center' } });
        if (small) graphic.push({ type: 'text', left: 'center', top: cy + 6, style: { text: small, fill: T.ink2, font: '12px ' + GG.FONT, align: 'center', width: r * 1.1, overflow: 'truncate' } });
      }
      return {
        option: {
          legend, graphic,
          tooltip: B.tooltip(ctx, { trigger: 'item', formatter: ctx.fn('tipItem', { f: ctx.f, c: ctx.c, rows: [{ l: '', d: 'v' }, { l: 'do total', d: 'p', f: { d: 1, s: '%' } }] }) }),
          series: [{
            type: 'pie', name: 'Fatias', center: ['50%', cy], radius: S.donut ? [r * 0.62, r] : [0, r],
            startAngle: 90, clockwise: true, avoidLabelOverlap: true, minAngle: 2,
            itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: S.donut ? 3 : 0 },
            label: S.labels === 'none' ? { show: false } : { show: true, color: T.ink2, fontSize: 12, fontFamily: GG.FONT, formatter: ctx.fn('label', { tpl: '{n}  {p}' }) },
            labelLine: { show: S.labels !== 'none', length: 10, length2: 12, lineStyle: { color: T.axis } },
            emphasis: { scale: true, scaleSize: 4, label: { fontWeight: 600 } },
            data: items.map((x) => ({ name: x.name, value: x.value, itemStyle: { color: colorOf(x) } }))
          }]
        },
        meta: { annot: false }
      };
    }
  });
})(window.GG = window.GG || {});
