/**
 * Graficário — modelos: Comparar.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

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
})(window.GG = window.GG || {});
