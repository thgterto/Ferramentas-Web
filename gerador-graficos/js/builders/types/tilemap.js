/**
 * Graficário — tipo de gráfico `tilemap`: Mapa em grade — Brasil (UF).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

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
    family: 'tab',
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
