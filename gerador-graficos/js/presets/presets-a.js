/**
 * Modelos: comparar, ranking, tempo, parte do todo.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;
  const M = GG.gen.monthNames;

  // =========================================================== COMPARAR
  P.add(
    {
      id: 'vendas-regiao-destaque', cat: 'comparar', type: 'bar', name: 'Barras com destaque',
      desc: 'Uma categoria é a história; as outras são contexto em cinza. Ordenado do maior para o menor.',
      tags: ['vendas', 'região', 'ênfase', 'ranking'],
      data: { columns: ['Região', 'Vendas 2025 (R$ mi)'], rows: [['Sudeste', 412], ['Sul', 238], ['Nordeste', 221], ['Centro-Oeste', 118], ['Norte', 64]] },
      settings: { title: 'O Sul já vende mais que o Nordeste — e foi a região que mais cresceu', subtitle: 'Vendas em 2025, em R$ milhões', orientation: 'h', sort: 'desc', highlight: ['Sul'], prefix: 'R$ ', suffix: ' mi', labels: 'smart' }
    },
    {
      id: 'top-produtos-outros', cat: 'comparar', type: 'bar', name: 'Top N + "Outros"',
      desc: 'Muitas categorias? Mostre as principais e agrupe a cauda em "Outros" — nunca invente mais cores.',
      tags: ['produtos', 'receita', 'cauda longa', 'pareto'],
      data: { columns: ['Produto', 'Receita (R$ mil)'], rows: [['Café especial 500g', 842], ['Cápsulas intensas', 615], ['Moedor manual', 488], ['Café tradicional 1kg', 402], ['Filtro de papel', 310], ['Prensa francesa', 268], ['Caneca térmica', 211], ['Chá mate', 176], ['Achocolatado', 122], ['Biscoito amanteigado', 98], ['Açúcar demerara', 74], ['Adoçante', 51], ['Guardanapo', 33], ['Colher medidora', 21]] },
      settings: { title: 'Três produtos respondem por quase metade da receita', subtitle: 'Receita por produto em 2025, R$ mil — itens além do 8º somados em "Outros"', orientation: 'h', sort: 'desc', topN: 8, highlight: ['Café especial 500g', 'Cápsulas intensas', 'Moedor manual'], prefix: 'R$ ', suffix: ' mil', labels: 'all' }
    },
    {
      id: 'colunas-lojas-meta', cat: 'comparar', type: 'bar', name: 'Colunas com linha de meta',
      desc: 'Comparar unidades contra uma meta comum. A linha tracejada dá a referência sem outro eixo.',
      tags: ['meta', 'lojas', 'unidades', 'referência'],
      data: { columns: ['Loja', 'Vendas de março (R$ mil)'], rows: [['Centro', 64], ['Shopping Norte', 58], ['Aeroporto', 41], ['Bairro Alto', 47], ['Rodoviária', 36], ['Orla', 55], ['Campus', 29]] },
      settings: { title: 'Quatro das sete lojas ficaram abaixo da meta em março', subtitle: 'Vendas por loja, R$ mil — meta de R$ 50 mil por loja', orientation: 'v', sort: 'desc', highlight: ['Aeroporto', 'Bairro Alto', 'Rodoviária', 'Campus'], prefix: 'R$ ', suffix: ' mil', labels: 'all', annotations: { refs: [{ axis: 'val', v: 50, label: 'Meta' }] } }
    },
    {
      id: 'barras-agrupadas-anos', cat: 'comparar', type: 'bar', name: 'Barras agrupadas (ano × ano)',
      desc: 'Duas ou três séries lado a lado por categoria. Mais que isso, prefira pequenos múltiplos.',
      tags: ['comparação', 'ano anterior', 'categorias', 'agrupado'],
      data: { columns: ['Categoria', '2024', '2025'], rows: [['Bebidas', 180, 362], ['Mercearia', 420, 468], ['Limpeza', 240, 262], ['Hortifrúti', 310, 335], ['Padaria', 150, 171]] },
      settings: { title: 'Todas as categorias cresceram, mas Bebidas dobrou', subtitle: 'Vendas por categoria, R$ mil', orientation: 'v', mode: 'grouped', prefix: 'R$ ', suffix: ' mil', labels: 'none' }
    },
    {
      id: 'empilhadas-canal-regiao', cat: 'comparar', type: 'bar', name: 'Barras empilhadas com total',
      desc: 'Total por categoria e sua composição. O total vai no fim da barra; cada segmento tem um vão de 2px.',
      tags: ['canal', 'online', 'loja', 'empilhado', 'composição'],
      data: { columns: ['Região', 'Loja física', 'Site', 'Aplicativo'], rows: [['Sudeste', 180, 120, 96], ['Sul', 110, 64, 41], ['Nordeste', 128, 52, 37], ['Centro-Oeste', 70, 28, 18], ['Norte', 44, 13, 8]] },
      settings: { title: 'No Sudeste, os canais digitais já são mais da metade das vendas', subtitle: 'Vendas por canal, R$ milhões', orientation: 'h', mode: 'stacked', prefix: 'R$ ', suffix: ' mi', labels: 'smart' }
    },
    {
      id: 'empilhadas-100-trimestre', cat: 'comparar', type: 'bar', name: 'Empilhadas 100%',
      desc: 'Quando a pergunta é "qual a fatia?" e não "quanto?". Compare a participação entre períodos.',
      tags: ['participação', 'share', '100%', 'mix'],
      data: { columns: ['Trimestre', 'Cartão', 'Pix', 'Boleto', 'Dinheiro'], rows: [['1º tri 24', 52, 18, 14, 16], ['2º tri 24', 50, 24, 12, 14], ['3º tri 24', 47, 31, 10, 12], ['4º tri 24', 45, 36, 9, 10], ['1º tri 25', 43, 41, 8, 8]] },
      settings: { title: 'O Pix saiu de 18% para 41% dos pagamentos em cinco trimestres', subtitle: 'Participação de cada meio de pagamento no total de transações', orientation: 'v', mode: 'percent', labels: 'none' }
    },
    {
      id: 'pirulito-cidades', cat: 'comparar', type: 'lollipop', name: 'Pirulito (muitas categorias)',
      desc: 'Muitas categorias com valores próximos: menos tinta que barras, mesma leitura.',
      tags: ['satisfação', 'cidades', 'nota', 'pirulito'],
      data: { columns: ['Cidade', 'Satisfação (0–100)'], rows: [['Curitiba', 86], ['Florianópolis', 85], ['Porto Alegre', 83], ['Belo Horizonte', 82], ['Campinas', 82], ['Goiânia', 81], ['São Paulo', 80], ['Recife', 80], ['Brasília', 79], ['Salvador', 78], ['Fortaleza', 77], ['Rio de Janeiro', 75], ['Belém', 74], ['Manaus', 72]] },
      settings: { title: 'Curitiba lidera, mas só 14 pontos separam a 1ª da última cidade', subtitle: 'Índice de satisfação dos clientes, 0 a 100', orientation: 'h', sort: 'desc', highlight: ['Curitiba'], labels: 'smart' }
    },
    {
      id: 'haltere-salario-genero', cat: 'comparar', type: 'dumbbell', name: 'Haltere: dois grupos por item',
      desc: 'Distância entre dois valores de cada item. Ótimo para desigualdades e comparações pareadas.',
      tags: ['salário', 'gênero', 'desigualdade', 'haltere'],
      data: { columns: ['Cargo', 'Mulheres', 'Homens'], rows: [['Assistente', 3100, 3250], ['Analista', 5900, 6400], ['Especialista', 8700, 9900], ['Coordenação', 11200, 13600], ['Gerência', 16500, 21000], ['Diretoria', 28000, 37500]] },
      settings: { title: 'A diferença salarial cresce a cada nível de liderança', subtitle: 'Salário médio mensal por cargo, R$', sort: 'none', prefix: 'R$ ', compact: true, showDelta: true, labels: 'smart' }
    },
    {
      id: 'haltere-antes-depois', cat: 'comparar', type: 'dumbbell', name: 'Haltere: antes → depois',
      desc: 'O efeito de uma mudança em cada unidade: um tom claro para o antes, o forte para o depois.',
      tags: ['antes e depois', 'tempo de espera', 'melhoria', 'impacto'],
      data: { columns: ['Unidade', 'Antes da triagem', 'Depois da triagem'], rows: [['UPA Centro', 142, 58], ['UPA Norte', 118, 61], ['UPA Sul', 96, 49], ['UPA Leste', 131, 88], ['UPA Oeste', 88, 52], ['Hospital Regional', 176, 95]] },
      settings: { title: 'A triagem digital cortou a espera pela metade em quase todas as unidades', subtitle: 'Tempo médio de espera, minutos', sort: 'diff', suffix: ' min', showDelta: true, labels: 'smart' }
    },
    {
      id: 'radar-produtos', cat: 'comparar', type: 'radar', name: 'Radar de perfil (2 itens)',
      desc: 'Perfil de 1 a 3 itens em várias dimensões na mesma escala. Para precisão, prefira barras.',
      tags: ['avaliação', 'atributos', 'produto', 'perfil'],
      data: { columns: ['Atributo', 'Modelo A', 'Modelo B'], rows: [['Bateria', 6, 9], ['Câmera', 8, 7], ['Tela', 9, 7], ['Desempenho', 8, 8], ['Preço', 5, 8], ['Durabilidade', 7, 6]] },
      settings: { title: 'O Modelo B ganha em bateria e preço; o A, em tela e câmera', subtitle: 'Notas de avaliação, 0 a 10', max: 10, labels: 'none' }
    },
    {
      id: 'faixas-ordinais', cat: 'comparar', type: 'bar', name: 'Categorias ordenadas (rampa ordinal)',
      desc: 'Faixas etárias, portes, níveis: a ordem importa, então a cor segue uma rampa de um só matiz.',
      tags: ['faixa etária', 'ordinal', 'ticket', 'idade'],
      data: { columns: ['Faixa etária', 'Ticket médio (R$)'], rows: [['18–24', 86], ['25–34', 132], ['35–44', 174], ['45–54', 161], ['55–64', 128], ['65+', 97]] },
      settings: { title: 'Clientes de 35 a 44 anos têm o maior ticket médio', subtitle: 'Ticket médio por faixa etária, R$', orientation: 'v', colorBy: 'ordinal', prefix: 'R$ ', labels: 'all' }
    },
    {
      id: 'barras-horizontais-longos', cat: 'comparar', type: 'bar', name: 'Barras com nomes longos',
      desc: 'Rótulos longos pedem barras horizontais: o texto fica legível sem girar.',
      tags: ['motivos', 'nomes longos', 'horizontal', 'pesquisa'],
      data: { columns: ['Motivo do contato', 'Chamados'], rows: [['Dúvida sobre a fatura do mês', 1840], ['Segunda via de boleto', 1320], ['Alteração de endereço de entrega', 910], ['Problema de acesso ao aplicativo', 870], ['Cancelamento de assinatura', 640], ['Reclamação sobre atraso na entrega', 610], ['Troca ou devolução de produto', 430]] },
      settings: { title: 'Dúvidas de fatura geram mais chamados que qualquer outro motivo', subtitle: 'Chamados na central em fevereiro', orientation: 'h', sort: 'desc', highlight: ['Dúvida sobre a fatura do mês', 'Segunda via de boleto'], labels: 'all' }
    }
  );

  // =========================================================== RANKING
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

  // =========================================================== TEMPO
  P.add(
    {
      id: 'linha-receita-recorrente', cat: 'tempo', type: 'line', name: 'Linha única com anotação',
      desc: 'Tendência de uma série. Rotule só o fim e o pico; use notas para explicar eventos.',
      tags: ['receita', 'mrr', 'crescimento', 'anotação'],
      data: (g) => ({ columns: ['Mês', 'MRR (R$ mil)'], rows: g.zip(g.months(24, 2024, 0), g.walk(7, 24, 210, 9.5, 6, null, 0)) }),
      settings: { title: 'A receita recorrente dobrou em dois anos', subtitle: 'MRR mensal, R$ mil', prefix: 'R$ ', suffix: ' mil', labels: 'smart', area: 'area', annotations: { notes: [{ x: 'mar/25', text: 'Plano anual lançado' }] } }
    },
    {
      id: 'linhas-uma-em-foco', cat: 'tempo', type: 'line', name: 'Várias linhas, uma em foco',
      desc: 'A cura do espaguete: a série da história em cor, as demais em cinza como contexto.',
      tags: ['regiões', 'ênfase', 'destaque', 'espaguete'],
      data: (g) => ({ columns: ['Mês', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'], rows: g.zip(M, g.walk(3, 12, 96, -0.6, 2.5, null, 0), g.walk(5, 12, 92, 2.8, 1.4, null, 0), g.walk(8, 12, 101, 0.2, 2.8, null, 0), g.walk(11, 12, 104, -0.3, 2.2, null, 0), g.walk(13, 12, 99, 0.4, 2.6, null, 0)) }),
      settings: { title: 'Só o Nordeste cresceu mês após mês em 2025', subtitle: 'Índice de vendas (jan = 100)', highlight: ['Nordeste'], labels: 'smart' }
    },
    {
      id: 'areas-empilhadas-canais', cat: 'tempo', type: 'line', name: 'Áreas empilhadas',
      desc: 'Total ao longo do tempo e como ele se divide. Leia bem só a base e o total.',
      tags: ['canais', 'digital', 'empilhado', 'área'],
      data: { columns: ['Ano', 'Lojas físicas', 'E-commerce', 'Aplicativo'], rows: [['2019', 820, 140, 20], ['2020', 610, 390, 90], ['2021', 700, 430, 160], ['2022', 720, 450, 240], ['2023', 710, 470, 330], ['2024', 690, 500, 420], ['2025', 680, 520, 510]] },
      settings: { title: 'Desde 2023 os canais digitais vendem mais que as lojas físicas', subtitle: 'Faturamento por canal, R$ milhões', area: 'stacked', prefix: 'R$ ', suffix: ' mi', labels: 'none' }
    },
    {
      id: 'areas-100-matriz', cat: 'tempo', type: 'line', name: 'Áreas 100% (mix no tempo)',
      desc: 'Como a composição muda ao longo do tempo, quando o total não importa.',
      tags: ['energia', 'matriz', 'participação', 'renováveis'],
      data: { columns: ['Ano', 'Hidráulica', 'Eólica', 'Solar', 'Térmica', 'Outras'], rows: [['2015', 64, 4, 0, 28, 4], ['2016', 66, 5, 0, 25, 4], ['2017', 63, 7, 0, 26, 4], ['2018', 65, 8, 1, 22, 4], ['2019', 64, 9, 1, 22, 4], ['2020', 64, 10, 2, 20, 4], ['2021', 56, 11, 3, 26, 4], ['2022', 62, 12, 5, 17, 4], ['2023', 60, 13, 8, 15, 4], ['2024', 56, 14, 11, 15, 4], ['2025', 54, 15, 14, 13, 4]] },
      settings: { title: 'Eólica e solar foram de 4% para 29% da geração em dez anos', subtitle: 'Participação de cada fonte na geração de eletricidade', area: 'percent', labels: 'none' }
    },
    {
      id: 'linhas-indexadas', cat: 'tempo', type: 'line', name: 'Séries indexadas (base 100)',
      desc: 'Escalas diferentes? Não use dois eixos Y: indexe tudo a 100 no início e compare crescimentos.',
      tags: ['índice', 'base 100', 'eixo duplo', 'comparar crescimento'],
      data: (g) => ({ columns: ['Mês', 'Usuários', 'Receita (R$ mil)', 'Chamados'], rows: g.zip(g.months(18, 2024, 0), g.walk(21, 18, 12000, 520, 260, null, 0), g.walk(22, 18, 480, 12, 9, null, 0), g.walk(23, 18, 3100, 30, 90, null, 0)) }),
      settings: { title: 'Usuários cresceram mais rápido que a receita; chamados ficaram estáveis', subtitle: 'Índice, janeiro de 2024 = 100', index100: true, labels: 'smart' }
    },
    {
      id: 'media-movel-diaria', cat: 'tempo', type: 'line', name: 'Média móvel sobre dados ruidosos',
      desc: 'Dados diários oscilam demais. A média móvel revela a tendência; os dados brutos ficam claros ao fundo.',
      tags: ['diário', 'média móvel', 'ruído', 'tendência'],
      data: (g) => ({ columns: ['Dia', 'Pedidos'], rows: g.zip(g.days(150, '2025-03-01').map((d) => d.slice(8, 10) + '/' + d.slice(5, 7)), g.walk(31, 150, 420, -0.9, 10, { amp: 45, period: 7 }, 0)) }),
      settings: { title: 'Por trás do sobe-e-desce diário, os pedidos caíram 30% no período', subtitle: 'Pedidos por dia e média móvel de 7 dias', ma: 7, labels: 'smart' }
    },
    {
      id: 'linha-meta-evento', cat: 'tempo', type: 'line', name: 'Linha com meta e período marcado',
      desc: 'Uma referência (meta) e uma faixa sombreada para o período que explica a mudança.',
      tags: ['meta', 'campanha', 'faixa', 'evento'],
      data: { columns: ['Semana', 'Conversão (%)'], rows: [['S1', 2.1], ['S2', 2.2], ['S3', 2.0], ['S4', 2.3], ['S5', 2.2], ['S6', 2.9], ['S7', 3.4], ['S8', 3.6], ['S9', 3.1], ['S10', 2.8], ['S11', 2.9], ['S12', 3.0]] },
      settings: { title: 'A campanha de TV levou a conversão acima da meta — e parte do ganho ficou', subtitle: 'Taxa de conversão semanal do site, %', suffix: '%', decimals: 1, labels: 'smart', annotations: { refs: [{ axis: 'val', v: 3, label: 'Meta' }], bands: [{ from: 'S6', to: 'S8', label: 'Campanha de TV' }] } }
    },
    {
      id: 'degraus-taxa', cat: 'tempo', type: 'line', name: 'Linha em degraus',
      desc: 'Valores que mudam em saltos e ficam parados (taxas, preços tabelados, tarifas).',
      tags: ['juros', 'selic', 'tarifa', 'degrau'],
      data: { columns: ['Reunião', 'Taxa básica (% a.a.)'], rows: [['jan/24', 11.75], ['mar/24', 10.75], ['mai/24', 10.5], ['jun/24', 10.5], ['jul/24', 10.5], ['set/24', 10.75], ['nov/24', 11.25], ['dez/24', 12.25], ['jan/25', 13.25], ['mar/25', 14.25], ['mai/25', 14.75], ['jun/25', 15.0], ['jul/25', 15.0], ['set/25', 15.0]] },
      settings: { title: 'Depois de cortes em 2024, a taxa voltou a subir e parou em 15%', subtitle: 'Taxa básica de juros definida em cada reunião, % ao ano', step: true, suffix: '%', decimals: 2, labels: 'smart', markers: 'all' }
    },
    {
      id: 'previsao-demanda', cat: 'tempo', type: 'forecast', name: 'Previsão com faixa de incerteza',
      desc: 'Realizado, projeção tracejada e o intervalo de confiança: honestidade sobre o futuro.',
      tags: ['previsão', 'forecast', 'intervalo', 'demanda'],
      data: () => {
        const m = GG.gen.months(24, 2024, 0);
        const real = [820, 845, 870, 860, 905, 930, 950, 940, 985, 1010, 1060, 1120, 1005, 1030, 1070, 1080, 1110, 1150];
        const rows = m.map((x, i) => {
          if (i < 17) return [x, real[i], '', '', ''];
          const k = i - 17, base = 1150 + k * 22;
          return [x, i === 17 ? real[i] : '', base, base - 18 - k * 14, base + 18 + k * 14];
        });
        return { columns: ['Mês', 'Real', 'Previsão', 'Limite inferior', 'Limite superior'], rows };
      },
      settings: { title: 'A demanda deve passar de 1.250 unidades até dezembro — com margem de ±8%', subtitle: 'Unidades vendidas por mês; faixa = intervalo de 80%', labels: 'smart', todayLabel: 'Hoje' }
    },
    {
      id: 'multiplos-regioes', cat: 'tempo', type: 'multiples', name: 'Pequenos múltiplos',
      desc: 'Uma série por painel, mesma escala, as outras em cinza ao fundo. Nada de legenda para decifrar.',
      tags: ['small multiples', 'painéis', 'regiões', 'espaguete'],
      data: (g) => ({ columns: ['Mês', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Exterior'], rows: g.zip(M, g.walk(41, 12, 60, -2.2, 2, null, 0), g.walk(42, 12, 72, 1.1, 2.5, null, 0), g.walk(43, 12, 55, 0.9, 2, null, 0), g.walk(44, 12, 110, 1.6, 3, null, 0), g.walk(45, 12, 84, 0.8, 2.2, null, 0), g.walk(46, 12, 30, 1.4, 1.8, null, 0)) }),
      settings: { title: 'O Norte é a única região em queda desde março', subtitle: 'Vendas mensais por região, R$ milhões', kind: 'line', ghost: true, sharedY: true, highlight: ['Norte'], labels: 'smart' }
    },
    {
      id: 'calendario-vendas', cat: 'tempo', type: 'calendar', name: 'Calendário diário',
      desc: 'Ritmo semanal e sazonalidade num ano inteiro, dia a dia.',
      tags: ['calendário', 'diário', 'sazonalidade', 'dias da semana'],
      data: (g) => {
        const r = g.rng(77);
        const days = g.days(365, '2025-01-01');
        return { columns: ['Data', 'Vendas'], rows: days.map((d) => { const dt = GG.data.toDate(d); const wd = dt.getDay(); const m = dt.getMonth(); const base = 120 + (wd === 6 ? 90 : wd === 5 ? 50 : wd === 0 ? -40 : 0) + (m === 11 ? 80 : m === 10 ? 40 : 0); return [d, Math.round(base * (0.8 + r() * 0.4))]; }) };
      },
      settings: { title: 'Sábados vendem o dobro dos domingos — e dezembro é outro patamar', subtitle: 'Vendas por dia em 2025', hue: 'blue' }
    },
    {
      id: 'heatmap-dia-hora', cat: 'tempo', type: 'heatmap', name: 'Mapa de calor dia × hora',
      desc: 'Quando as coisas acontecem: dia da semana nas linhas, hora nas colunas.',
      tags: ['horário', 'semana', 'suporte', 'padrão'],
      data: (g) => {
        const r = g.rng(5);
        const hours = Array.from({ length: 12 }, (_, i) => (8 + i) + 'h');
        const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        return { columns: ['Dia'].concat(hours), rows: days.map((d, di) => [d].concat(hours.map((_, hi) => Math.round((di < 5 ? 40 : 12) * (hi < 4 ? 1.6 - hi * 0.12 : hi === 5 ? 0.7 : 1) * (di === 0 ? 1.7 : 1) * (0.8 + r() * 0.4))))) };
      },
      settings: { title: 'Segunda de manhã concentra o maior volume de chamados', subtitle: 'Chamados abertos por dia e hora (média de 8 semanas)', scale: 'seq', hue: 'blue', labels: 'smart', xTop: true }
    },
    {
      id: 'listras-temperatura', cat: 'tempo', type: 'stripes', name: 'Listras de anomalia',
      desc: 'Cada ano uma listra, azul abaixo da média e vermelho acima. Impacto imediato.',
      tags: ['clima', 'temperatura', 'anomalia', 'warming stripes'],
      data: (g) => { const r = g.rng(3); return { columns: ['Ano', 'Anomalia (°C)'], rows: g.years(1961, 2025).map((y, i) => [y, +(-0.45 + i * 0.019 + (r() - 0.5) * 0.35).toFixed(2)]) }; },
      settings: { title: 'Desde 2000, nenhum ano ficou abaixo da média', subtitle: 'Anomalia da temperatura média anual em relação a 1961–1990, °C', pair: 'blue-red', center: 0, suffix: ' °C', decimals: 2 }
    },
    {
      id: 'sazonalidade-anos', cat: 'tempo', type: 'line', name: 'Sazonalidade: anos sobrepostos',
      desc: 'Meses no eixo X e um ano por linha: compare o mesmo mês entre anos. Destaque o ano atual.',
      tags: ['sazonalidade', 'ano a ano', 'meses', 'yoy'],
      data: (g) => ({ columns: ['Mês', '2022', '2023', '2024', '2025'], rows: g.zip(M, g.walk(61, 12, 80, 1, 3, { amp: 14, period: 12, phase: 3 }, 0), g.walk(62, 12, 86, 1, 3, { amp: 14, period: 12, phase: 3 }, 0), g.walk(63, 12, 90, 1.1, 3, { amp: 15, period: 12, phase: 3 }, 0), g.walk(64, 12, 101, 1.2, 3, { amp: 16, period: 12, phase: 3 }, 0)) }),
      settings: { title: '2025 superou os anos anteriores em todos os meses', subtitle: 'Faturamento mensal, R$ milhões', highlight: ['2025'], labels: 'smart' }
    },
    {
      id: 'coorte-retencao', cat: 'tempo', type: 'heatmap', name: 'Retenção por coorte',
      desc: 'Cada linha é um grupo de entrada; cada coluna, meses depois. Leia a diagonal e as linhas.',
      tags: ['coorte', 'retenção', 'saas', 'churn', 'cohort'],
      data: () => {
        const cohorts = GG.gen.months(8, 2025, 0);
        const cols = ['Coorte'].concat(Array.from({ length: 8 }, (_, i) => 'M' + i));
        const rows = cohorts.map((c, i) => [c].concat(Array.from({ length: 8 }, (_, k) => (k < 8 - i ? Math.round(100 * Math.pow(0.8 + i * 0.012, Math.sqrt(k) * 1.4) * (k === 0 ? 1 : 1)) : ''))));
        return { columns: cols, rows };
      },
      settings: { title: 'Coortes mais recentes retêm mais: o onboarding novo está funcionando', subtitle: 'Clientes ativos (%) por mês desde a entrada', scale: 'seq', hue: 'blue', suffix: '%', decimals: 0, labels: 'all', xTop: true }
    },
    {
      id: 'area-usuarios', cat: 'tempo', type: 'line', name: 'Área suave (uma série)',
      desc: 'Uma única série de volume: a área leve reforça a magnitude sem pesar.',
      tags: ['usuários', 'área', 'volume', 'crescimento'],
      data: (g) => ({ columns: ['Semana', 'Usuários ativos'], rows: g.zip(g.weeks(26, 'S'), g.walk(88, 26, 18200, 420, 520, null, 0)) }),
      settings: { title: 'Usuários ativos semanais cresceram 60% no semestre', subtitle: 'Usuários únicos por semana', area: 'area', compact: true, labels: 'smart' }
    }
  );

  // =========================================================== PARTE DO TODO
  P.add(
    {
      id: 'rosca-mercado', cat: 'composicao', type: 'pie', name: 'Rosca com total ao centro',
      desc: 'Parte do todo num relance, com poucas fatias. O centro guarda o total ou a fatia-chave.',
      tags: ['market share', 'participação', 'rosca', 'donut'],
      data: { columns: ['Empresa', 'Participação'], rows: [['Líder', 38], ['Segunda', 22], ['Terceira', 17], ['Quarta', 11], ['Demais', 12]] },
      settings: { title: 'A líder tem quase o dobro da segunda colocada', subtitle: 'Participação de mercado em 2025, %', donut: true, center: 'first', suffix: '%', labels: 'smart', highlight: [] }
    },
    {
      id: 'pizza-tres-fatias', cat: 'composicao', type: 'pie', name: 'Pizza simples (2–3 fatias)',
      desc: 'Só funciona com pouquíssimas fatias bem diferentes. "Metade", "um terço" — leituras grosseiras.',
      tags: ['orçamento', 'pizza', 'metade'],
      data: { columns: ['Destino', 'R$ mi'], rows: [['Pessoal', 52], ['Custeio', 31], ['Investimento', 17]] },
      settings: { title: 'Metade do orçamento vai para a folha de pessoal', subtitle: 'Orçamento 2026, R$ milhões', donut: false, prefix: 'R$ ', suffix: ' mi', labels: 'smart', highlight: ['Pessoal'] }
    },
    {
      id: 'waffle-3-em-10', cat: 'composicao', type: 'waffle', name: 'Waffle "3 em cada 10"',
      desc: 'Proporções concretas e contáveis. Ideal para públicos amplos e apresentações.',
      tags: ['proporção', 'waffle', 'app', 'pessoas'],
      data: { columns: ['Canal de compra', 'Clientes'], rows: [['Aplicativo', 31], ['Site', 42], ['Loja física', 27]] },
      settings: { title: 'Quase 1 em cada 3 clientes já compra pelo aplicativo', subtitle: 'Canal da última compra, % dos clientes', highlight: ['Aplicativo'], cells: '100' }
    },
    {
      id: 'treemap-orcamento', cat: 'composicao', type: 'treemap', name: 'Treemap de orçamento',
      desc: 'Parte do todo com muitos itens e dois níveis. A área é o valor; a cor, o grupo.',
      tags: ['orçamento', 'despesas', 'treemap', 'hierarquia'],
      data: { columns: ['Área', 'Item', 'Valor (R$ mil)'], rows: [['Pessoal', 'Salários', 4200], ['Pessoal', 'Benefícios', 1100], ['Pessoal', 'Treinamento', 240], ['Tecnologia', 'Nuvem', 980], ['Tecnologia', 'Licenças', 620], ['Tecnologia', 'Equipamentos', 410], ['Marketing', 'Mídia paga', 860], ['Marketing', 'Eventos', 240], ['Marketing', 'Conteúdo', 180], ['Operações', 'Logística', 720], ['Operações', 'Aluguel', 540], ['Operações', 'Manutenção', 190], ['Jurídico', 'Consultoria', 210]] },
      settings: { title: 'Pessoal e tecnologia somam dois terços do orçamento', subtitle: 'Orçamento anual por área e item, R$ mil', prefix: 'R$ ', suffix: ' mil', compact: false, labels: 'smart' }
    },
    {
      id: 'sunburst-despesas', cat: 'composicao', type: 'sunburst', name: 'Sunburst de categorias',
      desc: 'Composição em anéis, do geral (centro) ao específico (borda).',
      tags: ['gastos', 'categorias', 'sunburst', 'níveis'],
      data: { columns: ['Grupo', 'Categoria', 'Item', 'Gasto (R$)'], rows: [['Casa', 'Moradia', 'Aluguel', 2200], ['Casa', 'Moradia', 'Condomínio', 650], ['Casa', 'Contas', 'Energia', 280], ['Casa', 'Contas', 'Internet', 120], ['Casa', 'Contas', 'Água', 90], ['Alimentação', 'Mercado', 'Mercado', 1400], ['Alimentação', 'Fora', 'Restaurantes', 520], ['Alimentação', 'Fora', 'Delivery', 310], ['Transporte', 'Carro', 'Combustível', 480], ['Transporte', 'Carro', 'Seguro', 190], ['Transporte', 'Apps', 'Corridas', 160], ['Lazer', 'Assinaturas', 'Streaming', 90], ['Lazer', 'Passeios', 'Viagens', 600]] },
      settings: { title: 'Moradia sozinha consome 38% do orçamento da família', subtitle: 'Gastos mensais por grupo, categoria e item', prefix: 'R$ ', labels: 'smart' }
    },
    {
      id: 'barra-unica-partes', cat: 'composicao', type: 'bar', name: 'Barra única 100% (para onde vai cada R$ 100)',
      desc: 'Substitui a pizza com leitura mais precisa: uma barra, segmentos ordenados, rótulos dentro.',
      tags: ['imposto', 'para onde vai', '100%', 'composição'],
      data: { columns: ['Total', 'Saúde', 'Educação', 'Previdência', 'Segurança', 'Infraestrutura', 'Outros'], rows: [['Cada R$ 100', 22, 19, 26, 9, 11, 13]] },
      settings: { title: 'De cada R$ 100 arrecadados, R$ 41 vão para saúde e educação', subtitle: 'Destino dos recursos do orçamento estadual, %', orientation: 'h', mode: 'percent', labels: 'all', legend: 'top' }
    },
    {
      id: 'marimekko-mercado', cat: 'composicao', type: 'marimekko', name: 'Marimekko (mercado × marcas)',
      desc: 'Duas partes-do-todo: a largura é o tamanho do segmento, a altura é a participação de cada marca.',
      tags: ['mercado', 'segmento', 'marca', 'mosaico', 'mekko'],
      data: { columns: ['Segmento', 'Nossa marca', 'Concorrente A', 'Concorrente B'], rows: [['Varejo', 420, 380, 200], ['Atacado', 160, 260, 180], ['Online', 240, 90, 70], ['Food service', 60, 110, 130]] },
      settings: { title: 'Lideramos o online, mas o atacado — 2º maior segmento — é da concorrência', subtitle: 'Largura: tamanho do segmento. Altura: participação de cada marca', inner: true }
    }
  );
})(window.GG = window.GG || {});
