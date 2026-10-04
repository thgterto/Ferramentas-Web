/**
 * Graficário — modelos: Geografia.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  P.add(
    {
      id: 'mapa-grade-uf', cat: 'geo', type: 'tilemap', name: 'Mapa em grade por UF',
      desc: 'Cada estado ocupa o mesmo espaço: a cor carrega o valor sem a área distorcer a leitura.',
      tags: ['mapa', 'estados', 'uf', 'brasil', 'coroplético', 'tile map'],
      data: { columns: ['UF', 'Acesso à internet (%)'], rows: UFS.map((u) => [u, { AC: 78, AL: 76, AP: 82, AM: 79, BA: 80, CE: 81, DF: 95, ES: 88, GO: 89, MA: 72, MT: 88, MS: 89, MG: 87, PA: 77, PB: 80, PR: 90, PE: 81, PI: 74, RJ: 91, RN: 83, RS: 89, RO: 84, RR: 83, SC: 92, SP: 93, SE: 81, TO: 83 }[u]]) },
      settings: { title: 'Maranhão e Piauí têm o menor acesso à internet do país', subtitle: 'Domicílios com acesso à internet, % por UF', scale: 'seq', hue: 'blue', suffix: '%', highlight: ['MA', 'PI'] }
    },
    {
      id: 'mapa-grade-variacao', cat: 'geo', type: 'tilemap', name: 'Mapa em grade divergente',
      desc: 'Variação positiva/negativa por estado, com escala divergente centrada no zero.',
      tags: ['mapa', 'variação', 'estados', 'divergente'],
      data: { columns: ['UF', 'Variação vs 2024 (%)'], rows: UFS.map((u, i) => [u, [-4, 6, 12, -2, 8, 5, -6, 3, 9, 11, 14, 7, 2, 10, 4, -1, 6, 13, -8, 5, -3, 9, 15, -5, -2, 3, 12][i]]) },
      settings: { title: 'Norte e Nordeste cresceram; o Sudeste encolheu', subtitle: 'Variação das vendas em 2025 em relação a 2024, % por UF', scale: 'div', pair: 'red-blue', center: 0, suffix: '%' }
    },
    {
      id: 'regioes-barras-uf', cat: 'geo', type: 'bar', name: 'Estados de uma região em foco',
      desc: 'Quando o mapa não cabe ou a precisão importa: barras ordenadas com a região da história destacada.',
      tags: ['estados', 'região', 'barras', 'nordeste'],
      data: { columns: ['UF', 'Crescimento do PIB (%)'], rows: [['PI', 4.8], ['MA', 4.4], ['CE', 3.9], ['TO', 3.7], ['BA', 3.5], ['MT', 3.4], ['PE', 3.1], ['GO', 2.9], ['PA', 2.8], ['SC', 2.6], ['PR', 2.4], ['RN', 2.3], ['MG', 2.1], ['SP', 1.9], ['RS', 1.2], ['RJ', 1.0]] },
      settings: { title: 'Quatro dos cinco estados que mais cresceram são do Nordeste', subtitle: 'Crescimento do PIB em 2025, % — estados selecionados', orientation: 'h', sort: 'desc', highlight: ['PI', 'MA', 'CE', 'BA', 'PE', 'RN'], suffix: '%', decimals: 1, labels: 'smart' }
    },
    {
      id: 'regioes-multiplos', cat: 'geo', type: 'multiples', name: 'Regiões em pequenos múltiplos',
      desc: 'Uma evolução por região, mesma escala — alternativa ao mapa animado.',
      tags: ['regiões', 'evolução', 'painéis', 'desemprego'],
      data: { columns: ['Ano', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'], rows: [['2019', 11.8, 14.1, 9.6, 12.3, 7.8], ['2020', 13.1, 16.2, 10.7, 13.9, 8.7], ['2021', 12.4, 15.5, 9.9, 13.1, 8.0], ['2022', 9.4, 11.6, 7.2, 9.1, 5.6], ['2023', 8.3, 10.4, 6.3, 7.9, 5.0], ['2024', 7.4, 9.5, 5.6, 6.8, 4.5], ['2025', 6.9, 8.8, 5.2, 6.1, 4.1]] },
      settings: { title: 'O desemprego caiu em todas as regiões desde 2020', subtitle: 'Taxa de desocupação média anual, %', kind: 'area', ghost: true, sharedY: true, suffix: '%', decimals: 1, labels: 'smart' }
    }
  );
})(window.GG = window.GG || {});
