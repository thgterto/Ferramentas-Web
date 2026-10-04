/**
 * Graficário — modelos: Hierarquia.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

  P.add(
    {
      id: 'treemap-carteira', cat: 'hierarquia', type: 'treemap', name: 'Treemap de carteira',
      desc: 'Classe → ativo: a área mostra o peso de cada posição na carteira.',
      tags: ['investimentos', 'carteira', 'ativos', 'alocação'],
      data: { columns: ['Classe', 'Ativo', 'Valor (R$ mil)'], rows: [['Renda fixa', 'Tesouro Selic', 180], ['Renda fixa', 'CDB', 120], ['Renda fixa', 'Tesouro IPCA+', 95], ['Renda fixa', 'Debêntures', 40], ['Ações', 'Bancos', 70], ['Ações', 'Energia', 55], ['Ações', 'Varejo', 30], ['Ações', 'Mineração', 45], ['Fundos imobiliários', 'Logística', 38], ['Fundos imobiliários', 'Lajes', 22], ['Fundos imobiliários', 'Shoppings', 25], ['Exterior', 'ETF global', 60], ['Exterior', 'Dólar', 20]] },
      settings: { title: 'Renda fixa ainda é 55% da carteira', subtitle: 'Posições por classe e ativo, R$ mil', prefix: 'R$ ', suffix: ' mil', labels: 'smart' }
    },
    {
      id: 'treemap-simples', cat: 'hierarquia', type: 'treemap', name: 'Treemap de um nível',
      desc: 'Muitas categorias numa só hierarquia plana, com valores nos blocos.',
      tags: ['treemap', 'categorias', 'vendas', 'e-commerce'],
      data: { columns: ['Categoria', 'Vendas (R$ mil)'], rows: [['Eletrônicos', 820], ['Casa', 640], ['Moda', 590], ['Beleza', 420], ['Esporte', 310], ['Livros', 180], ['Brinquedos', 170], ['Pet', 150], ['Papelaria', 90], ['Jardim', 70]] },
      settings: { title: 'Eletrônicos, casa e moda fazem 60% das vendas', subtitle: 'Vendas por categoria no trimestre, R$ mil', prefix: 'R$ ', suffix: ' mil', labels: 'all' }
    },
    {
      id: 'organograma', cat: 'hierarquia', type: 'tree', name: 'Organograma',
      desc: 'Estrutura hierárquica de cima para baixo.',
      tags: ['organograma', 'estrutura', 'equipe', 'árvore'],
      data: { columns: ['Nível 1', 'Nível 2', 'Nível 3'], rows: [['Diretoria', 'Comercial', 'Vendas'], ['Diretoria', 'Comercial', 'Marketing'], ['Diretoria', 'Operações', 'Produção'], ['Diretoria', 'Operações', 'Qualidade'], ['Diretoria', 'Operações', 'Logística'], ['Diretoria', 'Tecnologia', 'Produto'], ['Diretoria', 'Tecnologia', 'Infraestrutura'], ['Diretoria', 'Pessoas', 'RH'], ['Diretoria', 'Pessoas', 'Financeiro']] },
      settings: { title: 'Nova estrutura: quatro diretorias e nove áreas', subtitle: 'Organograma a partir de janeiro', orient: 'TB', edge: 'polyline', highlight: ['Tecnologia'], source: '' }
    },
    {
      id: 'arvore-decisao', cat: 'hierarquia', type: 'tree', name: 'Árvore de decisão',
      desc: 'Regras encadeadas da esquerda para a direita.',
      tags: ['decisão', 'regras', 'crédito', 'fluxograma'],
      data: { columns: ['Pergunta 1', 'Pergunta 2', 'Resultado'], rows: [['Renda ≥ R$ 5 mil?', 'Sim → Score ≥ 700?', 'Aprovar'], ['Renda ≥ R$ 5 mil?', 'Sim → Score ≥ 700?', 'Análise manual'], ['Renda ≥ R$ 5 mil?', 'Não → Tem garantia?', 'Aprovar com garantia'], ['Renda ≥ R$ 5 mil?', 'Não → Tem garantia?', 'Recusar']] },
      settings: { title: 'Política de crédito: duas perguntas decidem 80% dos pedidos', subtitle: 'Regras de aprovação automática', orient: 'LR', edge: 'curve', source: '' }
    },
    {
      id: 'sunburst-taxonomia', cat: 'hierarquia', type: 'sunburst', name: 'Sunburst de três níveis',
      desc: 'Taxonomias e caminhos com três níveis. Clique num anel para aproximar.',
      tags: ['taxonomia', 'chamados', 'sunburst', 'motivos'],
      data: { columns: ['Área', 'Tema', 'Motivo', 'Chamados'], rows: [['Financeiro', 'Cobrança', 'Boleto', 420], ['Financeiro', 'Cobrança', 'Cartão recusado', 260], ['Financeiro', 'Reembolso', 'Prazo', 310], ['Logística', 'Entrega', 'Atraso', 540], ['Logística', 'Entrega', 'Endereço', 180], ['Logística', 'Troca', 'Tamanho', 240], ['Produto', 'Defeito', 'Chegou quebrado', 150], ['Produto', 'Dúvida', 'Especificação', 200], ['Conta', 'Acesso', 'Senha', 330], ['Conta', 'Cadastro', 'Dados', 90]] },
      settings: { title: 'Atrasos de entrega são o maior motivo individual de chamados', subtitle: 'Chamados por área, tema e motivo em setembro', labels: 'smart', highlight: ['Logística'] }
    }
  );
})(window.GG = window.GG || {});
