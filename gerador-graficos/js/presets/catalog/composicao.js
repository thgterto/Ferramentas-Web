/**
 * Graficário — modelos: Parte do todo.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

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
