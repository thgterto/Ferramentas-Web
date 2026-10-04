/**
 * Graficário — modelos: Ranking.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

  P.add(
    {
      id: 'slope-participacao', cat: 'ranking', type: 'slope', name: 'Slope: dois momentos',
      desc: 'Quem subiu e quem caiu entre dois momentos. Cor pela direção, rótulos nas duas pontas.',
      tags: ['participação', 'market share', 'antes e depois', 'inclinação'],
      data: { columns: ['Marca', '2023', '2025'], rows: [['Aurora', 24, 29], ['Brisa', 21, 18], ['Cume', 15, 17], ['Duna', 12, 14], ['Eco', 10, 7], ['Farol', 8, 9]] },
      settings: { title: 'Só Brisa e Eco perderam participação em dois anos', subtitle: 'Participação de mercado, %', suffix: '%', colorBy: 'direction', labels: 'smart' }
    },
    {
      id: 'slope-destaque', cat: 'ranking', type: 'slope', name: 'Slope com uma unidade em foco',
      desc: 'Muitos itens, uma história: a unidade em foco colorida, o resto em cinza para contexto.',
      tags: ['nps', 'unidades', 'foco', 'antes e depois'],
      data: { columns: ['Unidade', 'Jan', 'Jun'], rows: [['Campinas', 41, 44], ['Santos', 38, 40], ['Sorocaba', 35, 37], ['Ribeirão Preto', 33, 58], ['Bauru', 30, 31], ['Jundiaí', 29, 33], ['Piracicaba', 27, 26]] },
      settings: { title: 'Ribeirão Preto saltou de 33 para 58 pontos de NPS após o novo atendimento', subtitle: 'NPS por unidade, janeiro × junho', colorBy: 'single', highlight: ['Ribeirão Preto'], labels: 'smart' }
    },
    {
      id: 'bump-campeonato', cat: 'ranking', type: 'bump', name: 'Bump: posições ao longo do tempo',
      desc: 'Mudança de posição rodada a rodada. Os números são pontos; o gráfico calcula o ranking.',
      tags: ['campeonato', 'ranking', 'posição', 'bump'],
      data: { columns: ['Rodada', 'Azul', 'Verde', 'Rubro', 'Tricolor', 'Alvinegro', 'Grená'], rows: [['R1', 1, 3, 3, 1, 0, 3], ['R2', 4, 6, 4, 2, 3, 4], ['R3', 7, 7, 7, 5, 6, 5], ['R4', 10, 10, 8, 8, 9, 6], ['R5', 13, 11, 11, 9, 10, 9], ['R6', 16, 14, 12, 12, 11, 10], ['R7', 19, 15, 15, 13, 14, 11], ['R8', 22, 18, 16, 16, 15, 14]] },
      settings: { title: 'O Azul saiu do 4º para a liderança em oito rodadas', subtitle: 'Posição na tabela por rodada (calculada pelos pontos)', input: 'value', highlight: ['Azul'], labels: 'smart' }
    },
    {
      id: 'bump-marcas-anos', cat: 'ranking', type: 'bump', name: 'Bump com posições informadas',
      desc: 'Você já tem as posições (1º, 2º…)? Informe-as diretamente.',
      tags: ['marcas', 'ranking anual', 'posição'],
      data: { columns: ['Ano', 'Alfa', 'Beta', 'Gama', 'Delta', 'Ômega'], rows: [['2020', 1, 2, 3, 4, 5], ['2021', 1, 3, 2, 4, 5], ['2022', 2, 4, 1, 3, 5], ['2023', 3, 4, 1, 2, 5], ['2024', 4, 5, 1, 2, 3], ['2025', 4, 5, 2, 1, 3]] },
      settings: { title: 'Alfa, líder em 2020, caiu para o 4º lugar', subtitle: 'Posição no ranking de preferência da marca', input: 'rank', highlight: ['Alfa', 'Delta'], labels: 'smart' }
    },
    {
      id: 'ranking-variacao', cat: 'ranking', type: 'dumbbell', name: 'Ranking pela variação',
      desc: 'Ordene pela variação para mostrar quem mais mudou, não quem é maior.',
      tags: ['variação', 'crescimento', 'ranking', 'haltere'],
      data: { columns: ['Estado', '2024', '2025'], rows: [['SP', 62.1, 63.0], ['MG', 55.4, 59.8], ['BA', 41.2, 47.9], ['PR', 58.8, 60.1], ['PE', 44.0, 49.2], ['GO', 52.3, 53.1], ['CE', 46.5, 52.7]] },
      settings: { title: 'Ceará e Bahia tiveram os maiores avanços em cobertura de internet', subtitle: 'Domicílios com banda larga fixa, %', sort: 'diff', suffix: '%', decimals: 1, highlight: ['CE', 'BA'], labels: 'smart' }
    },
    {
      id: 'ranking-barras-estados', cat: 'ranking', type: 'bar', name: 'Ranking de 27 UFs',
      desc: 'Muitos itens ordenados: destaque um grupo (uma região) e deixe o resto como contexto.',
      tags: ['estados', 'uf', 'ranking', 'região'],
      data: { columns: ['UF', 'Índice'], rows: [['SC', 0.81], ['DF', 0.80], ['SP', 0.79], ['RJ', 0.77], ['PR', 0.77], ['RS', 0.76], ['MG', 0.75], ['ES', 0.75], ['GO', 0.74], ['MS', 0.74], ['MT', 0.73], ['TO', 0.72], ['RO', 0.71], ['RR', 0.71], ['AP', 0.70], ['AM', 0.70], ['CE', 0.70], ['RN', 0.70], ['PE', 0.69], ['PB', 0.69], ['AC', 0.69], ['PA', 0.69], ['BA', 0.69], ['SE', 0.68], ['PI', 0.68], ['AL', 0.67], ['MA', 0.67]] },
      settings: { title: 'Os três estados do Sul estão entre os seis primeiros', subtitle: 'Índice de desenvolvimento (0 a 1) por UF', orientation: 'h', sort: 'desc', highlight: ['SC', 'PR', 'RS'], decimals: 2, labels: 'smart' }
    }
  );
})(window.GG = window.GG || {});
