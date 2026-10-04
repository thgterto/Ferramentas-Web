/**
 * Graficário — modelos: Fluxos.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

  P.add(
    {
      id: 'sankey-orcamento', cat: 'fluxo', type: 'sankey', name: 'Sankey: de onde vem, para onde vai',
      desc: 'Fluxos entre etapas. A largura é o volume; a cor segue a origem.',
      tags: ['sankey', 'orçamento', 'receita', 'fluxo'],
      data: { columns: ['Origem', 'Destino', 'R$ bi'], rows: [['ICMS', 'Receita', 48], ['IPVA', 'Receita', 9], ['Transferências', 'Receita', 21], ['Outras receitas', 'Receita', 12], ['Receita', 'Saúde', 19], ['Receita', 'Educação', 18], ['Receita', 'Previdência', 23], ['Receita', 'Segurança', 8], ['Receita', 'Infraestrutura', 10], ['Receita', 'Outros gastos', 12]] },
      settings: { title: 'O ICMS banca mais da metade de tudo que o estado gasta', subtitle: 'Receitas e despesas do estado em 2025, R$ bilhões', colorBy: 'origin', prefix: 'R$ ', suffix: ' bi', labels: 'all' }
    },
    {
      id: 'sankey-jornada', cat: 'fluxo', type: 'sankey', name: 'Sankey: jornada do cliente',
      desc: 'Caminhos entre canais, etapas e resultados. Destaque o caminho que importa.',
      tags: ['jornada', 'funil', 'canais', 'conversão'],
      data: { columns: ['De', 'Para', 'Visitas'], rows: [['Busca orgânica', 'Página de produto', 4200], ['Redes sociais', 'Página de produto', 3900], ['E-mail', 'Página de produto', 1300], ['Anúncios', 'Página de produto', 2600], ['Página de produto', 'Carrinho', 3800], ['Página de produto', 'Saída', 8200], ['Carrinho', 'Compra', 1500], ['Carrinho', 'Abandono', 2300]] },
      settings: { title: 'Sete em cada dez visitantes saem já na página de produto', subtitle: 'Caminho das visitas no site em setembro', highlight: ['Saída'], labels: 'all' }
    },
    {
      id: 'sankey-energia', cat: 'fluxo', type: 'sankey', name: 'Sankey de três etapas',
      desc: 'Fonte → transformação → uso final. Cores nas fontes, neutro no meio.',
      tags: ['energia', 'matriz', 'setores', 'consumo'],
      data: { columns: ['Origem', 'Destino', 'TWh'], rows: [['Hidráulica', 'Rede elétrica', 390], ['Eólica', 'Rede elétrica', 95], ['Solar', 'Rede elétrica', 70], ['Gás natural', 'Rede elétrica', 55], ['Biomassa', 'Rede elétrica', 50], ['Rede elétrica', 'Indústria', 250], ['Rede elétrica', 'Residências', 170], ['Rede elétrica', 'Comércio e serviços', 125], ['Rede elétrica', 'Perdas', 70], ['Rede elétrica', 'Outros usos', 45]] },
      settings: { title: 'A indústria consome quase metade da eletricidade gerada', subtitle: 'Geração por fonte e consumo por setor, TWh', suffix: ' TWh', labels: 'smart' }
    },
    {
      id: 'funil-vendas', cat: 'fluxo', type: 'funnel', name: 'Funil em barras',
      desc: 'Etapas ordenadas numa rampa de um só matiz, com % em relação ao topo.',
      tags: ['funil', 'conversão', 'vendas', 'etapas'],
      data: { columns: ['Etapa', 'Pessoas'], rows: [['Visitaram o site', 48000], ['Viram um produto', 21500], ['Adicionaram ao carrinho', 6400], ['Iniciaram o checkout', 3100], ['Compraram', 1900]] },
      settings: { title: 'Só 4% dos visitantes compram; o maior vazamento é antes do carrinho', subtitle: 'Visitantes únicos por etapa em agosto', style: 'bars', pctOf: 'top', compact: true, labels: 'smart' }
    },
    {
      id: 'funil-recrutamento', cat: 'fluxo', type: 'funnel', name: 'Funil clássico',
      desc: 'A forma de funil tradicional, com % em relação à etapa anterior.',
      tags: ['recrutamento', 'rh', 'seleção', 'funil'],
      data: { columns: ['Etapa', 'Candidatos'], rows: [['Inscritos', 1200], ['Triagem de currículo', 420], ['Teste técnico', 160], ['Entrevista', 45], ['Oferta', 12], ['Contratados', 9]] },
      settings: { title: 'Apenas 1 em cada 3 candidatos passa da triagem', subtitle: 'Processo seletivo para desenvolvedores, 2º semestre', style: 'funnel', pctOf: 'prev', labels: 'smart' }
    },
    {
      id: 'rede-colaboracao', cat: 'fluxo', type: 'graph', name: 'Rede de colaboração',
      desc: 'Quem se conecta com quem. O tamanho mostra o quanto cada pessoa conecta.',
      tags: ['rede', 'grafo', 'colaboração', 'pessoas', 'network'],
      data: { columns: ['Pessoa A', 'Pessoa B', 'Interações'], rows: [['Ana', 'Bruno', 12], ['Ana', 'Carla', 9], ['Ana', 'Hugo', 7], ['Ana', 'Iara', 8], ['Bruno', 'Carla', 6], ['Bruno', 'Davi', 5], ['Carla', 'Davi', 4], ['Hugo', 'Iara', 10], ['Hugo', 'João', 6], ['Iara', 'João', 5], ['Ana', 'Lia', 6], ['Lia', 'Marcos', 9], ['Lia', 'Nina', 7], ['Marcos', 'Nina', 8], ['Davi', 'Eva', 3], ['João', 'Otávio', 4], ['Nina', 'Paulo', 3]] },
      settings: { title: 'Ana é a ponte entre três equipes que não conversam entre si', subtitle: 'Interações entre pessoas em projetos no trimestre', layout: 'force', highlight: ['Ana'], labels: 'smart' }
    },
    {
      id: 'cordas-migracao', cat: 'fluxo', type: 'chord', name: 'Cordas: trocas entre regiões',
      desc: 'Fluxos nos dois sentidos entre membros de um mesmo grupo.',
      tags: ['migração', 'regiões', 'trocas', 'chord'],
      data: { columns: ['Origem', 'Destino', 'Mil pessoas'], rows: [['Nordeste', 'Sudeste', 320], ['Sudeste', 'Nordeste', 180], ['Sudeste', 'Sul', 140], ['Sul', 'Sudeste', 90], ['Sudeste', 'Centro-Oeste', 110], ['Nordeste', 'Centro-Oeste', 95], ['Norte', 'Centro-Oeste', 60], ['Nordeste', 'Norte', 70], ['Sul', 'Centro-Oeste', 55], ['Centro-Oeste', 'Sudeste', 50]] },
      settings: { title: 'Nordeste → Sudeste segue sendo o maior fluxo, mas a volta já é mais da metade', subtitle: 'Migração entre regiões nos últimos 5 anos, mil pessoas', suffix: ' mil', labels: 'smart' }
    },
    {
      id: 'rede-circular-sistemas', cat: 'fluxo', type: 'graph', name: 'Rede circular (dependências)',
      desc: 'Dependências entre sistemas num círculo: bom para ver quem é central.',
      tags: ['sistemas', 'dependências', 'arquitetura', 'integrações'],
      data: { columns: ['Sistema', 'Depende de', 'Chamadas/min'], rows: [['Loja', 'Catálogo', 900], ['Loja', 'Carrinho', 700], ['Carrinho', 'Preços', 650], ['Carrinho', 'Estoque', 500], ['Checkout', 'Carrinho', 300], ['Checkout', 'Pagamentos', 280], ['Checkout', 'Frete', 260], ['Pagamentos', 'Antifraude', 250], ['Frete', 'Estoque', 120], ['App', 'Catálogo', 800], ['App', 'Carrinho', 540], ['Backoffice', 'Estoque', 90], ['Backoffice', 'Preços', 60], ['Catálogo', 'Preços', 400]] },
      settings: { title: 'Carrinho e Preços são os pontos únicos de falha da loja', subtitle: 'Dependências entre serviços; espessura = chamadas por minuto', layout: 'circular', highlight: ['Carrinho', 'Preços'], labels: 'all' }
    }
  );
})(window.GG = window.GG || {});
