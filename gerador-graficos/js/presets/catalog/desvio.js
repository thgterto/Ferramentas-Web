/**
 * Graficário — modelos: Metas e desvios.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;
  const M = GG.gen.monthNames;

  P.add(
    {
      id: 'divergente-meta-filiais', cat: 'desvio', type: 'diverging', name: 'Acima/abaixo da meta',
      desc: 'Desvio em relação a uma referência. Dois matizes opostos; o zero é a linha que importa.',
      tags: ['meta', 'variação', 'filiais', 'divergente'],
      data: { columns: ['Filial', 'Desvio da meta (%)'], rows: [['Curitiba', 12], ['Porto Alegre', 9], ['Campinas', 6], ['Belo Horizonte', 3], ['Goiânia', 1], ['Salvador', -4], ['Fortaleza', -7], ['Manaus', -11], ['Recife', -18]] },
      settings: { title: 'Recife ficou 18% abaixo da meta — o pior resultado da rede', subtitle: 'Vendas do trimestre em relação à meta de cada filial, %', orientation: 'h', sort: 'desc', pair: 'red-blue', posLabel: 'Acima da meta', negLabel: 'Abaixo da meta', suffix: '%', labels: 'all' }
    },
    {
      id: 'bullet-kpis', cat: 'desvio', type: 'bullet', name: 'Bullet: realizado × meta',
      desc: 'Substitui velocímetros: barra do realizado, traço da meta e faixas de desempenho ao fundo.',
      tags: ['bullet', 'meta', 'kpi', 'desempenho'],
      data: { columns: ['Indicador', 'Realizado', 'Meta', 'Limite ruim', 'Limite bom'], rows: [['Receita (R$ mi)', 12.6, 12, 9, 11.5], ['Novos clientes', 820, 900, 600, 850], ['NPS', 61, 55, 40, 50], ['Entregas no prazo (%)', 88, 95, 85, 92], ['Margem (%)', 21, 20, 15, 18]] },
      settings: { title: 'Receita, NPS e margem bateram a meta; entregas no prazo ainda não', subtitle: 'Realizado em % da meta de cada indicador; faixas: ruim, regular, bom', normalize: true, labels: 'smart' }
    },
    {
      id: 'cascata-lucro', cat: 'desvio', type: 'waterfall', name: 'Ponte de variação (cascata)',
      desc: 'Explique a diferença entre dois números: cada barra é um fator que soma ou subtrai.',
      tags: ['ponte', 'variação', 'lucro', 'bridge', 'cascata'],
      data: { columns: ['Fator', 'R$ mi'], rows: [['Lucro 2024', 48], ['Volume', 9.5], ['Preço', 12], ['Mix de produtos', 3.2], ['Frete', -8.4], ['Matéria-prima', -6.1], ['Câmbio', -2.7]] },
      settings: { title: 'O aumento de preço compensou a alta de frete e matéria-prima', subtitle: 'Do lucro de 2024 ao de 2025, R$ milhões', finalLabel: 'Lucro 2025', polarity: 'good', prefix: 'R$ ', suffix: ' mi', decimals: 1, labels: 'smart' }
    },
    {
      id: 'anomalia-barras-ano', cat: 'desvio', type: 'diverging', name: 'Anomalia anual (colunas)',
      desc: 'Série temporal de desvios: colunas azuis abaixo, vermelhas acima da referência, em ordem cronológica.',
      tags: ['anomalia', 'chuva', 'clima', 'desvio'],
      data: { columns: ['Ano', 'Chuva vs média (%)'], rows: [['2014', -22], ['2015', -18], ['2016', 4], ['2017', -6], ['2018', 3], ['2019', 8], ['2020', -12], ['2021', -26], ['2022', 11], ['2023', 15], ['2024', -9], ['2025', 6]] },
      settings: { title: '2021 foi o ano mais seco da série, 26% abaixo da média', subtitle: 'Chuva acumulada no reservatório em relação à média histórica, %', orientation: 'v', sort: 'none', pair: 'red-blue', posLabel: 'Acima da média', negLabel: 'Abaixo da média', suffix: '%', labels: 'smart' }
    },
    {
      id: 'orcado-realizado', cat: 'desvio', type: 'diverging', name: 'Realizado − orçado por área',
      desc: 'Quem gastou além do orçado. Quando gastar menos é bom, inverta as cores.',
      tags: ['orçamento', 'realizado', 'estouro', 'economia'],
      data: { columns: ['Área', 'Diferença (R$ mil)'], rows: [['Marketing', 84], ['TI', 41], ['Operações', 12], ['RH', -8], ['Jurídico', -15], ['Financeiro', -22], ['Facilities', -37]] },
      settings: { title: 'Marketing e TI estouraram o orçamento em R$ 125 mil somados', subtitle: 'Realizado menos orçado no semestre, R$ mil (positivo = gastou mais)', orientation: 'h', sort: 'desc', pair: 'blue-red', posLabel: 'Acima do orçado', negLabel: 'Abaixo do orçado', prefix: 'R$ ', suffix: ' mil', labels: 'all' }
    },
    {
      id: 'progresso-vendedores', cat: 'desvio', type: 'meter', name: 'Barras de progresso com estado',
      desc: 'Progresso de cada item em direção à meta; o estado aparece com ícone, rótulo e cor.',
      tags: ['meta', 'vendedores', 'progresso', 'status'],
      data: { columns: ['Vendedor', 'Vendido (R$ mil)', 'Meta (R$ mil)'], rows: [['Ana', 142, 120], ['Bruno', 118, 120], ['Carla', 96, 110], ['Diego', 88, 120], ['Eduarda', 61, 100], ['Fábio', 104, 100]] },
      settings: { title: 'Metade da equipe já bateu a meta; Eduarda precisa de apoio', subtitle: 'Vendas do mês em relação à meta individual', status: 'higher', warn: 90, crit: 70, prefix: 'R$ ', suffix: ' mil', labels: 'smart' }
    },
    {
      id: 'saldo-mensal', cat: 'desvio', type: 'diverging', name: 'Superávit/déficit mensal',
      desc: 'Saldo positivo ou negativo mês a mês, em ordem cronológica.',
      tags: ['caixa', 'saldo', 'déficit', 'superávit'],
      data: { columns: ['Mês', 'Saldo de caixa (R$ mil)'], rows: M.map((m, i) => [m, [42, 18, -12, -30, 6, 24, 38, -8, -21, 15, 33, 61][i]]) },
      settings: { title: 'O caixa ficou negativo em 4 dos 12 meses — sempre após os pagamentos trimestrais', subtitle: 'Saldo mensal (entradas − saídas), R$ mil', orientation: 'v', sort: 'none', pair: 'red-blue', posLabel: 'Superávit', negLabel: 'Déficit', prefix: 'R$ ', suffix: ' mil', labels: 'smart' }
    },
    {
      id: 'faixa-ideal-processo', cat: 'desvio', type: 'line', name: 'Linha dentro de uma faixa ideal',
      desc: 'Uma faixa (tolerância) sombreada no eixo de valor: tudo fora dela salta aos olhos.',
      tags: ['tolerância', 'faixa', 'processo', 'temperatura'],
      data: (g) => ({ columns: ['Hora', 'Temperatura do forno (°C)'], rows: g.zip(Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + 'h'), [182, 184, 181, 183, 186, 191, 188, 184, 180, 176, 179, 182, 183, 185, 184, 189, 193, 187, 183, 182, 181, 177, 180, 182]) }),
      settings: { title: 'O forno saiu da faixa ideal três vezes no dia', subtitle: 'Temperatura média por hora, °C — faixa ideal de 178 a 188 °C', suffix: ' °C', markers: 'all', labels: 'none', annotations: { bands: [{ axis: 'val', from: 178, to: 188, label: 'Faixa ideal' }] } }
    }
  );
})(window.GG = window.GG || {});
