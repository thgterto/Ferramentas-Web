/**
 * Graficário — modelos: Pesquisas.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

  P.add(
    {
      id: 'likert-clima', cat: 'pesquisa', type: 'likert', name: 'Likert (clima organizacional)',
      desc: 'Escala de concordância centrada no neutro: negativos à esquerda, positivos à direita.',
      tags: ['likert', 'pesquisa', 'clima', 'concordância', 'engajamento'],
      data: { columns: ['Afirmação', 'Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'], rows: [['Minha liderança me dá feedback útil', 4, 9, 15, 44, 28], ['Tenho as ferramentas de que preciso', 6, 14, 22, 40, 18], ['Minha carga de trabalho é adequada', 18, 29, 21, 24, 8], ['Recomendaria a empresa a um amigo', 5, 8, 19, 38, 30], ['Vejo oportunidades de crescimento', 11, 20, 24, 31, 14], ['Sinto-me respeitado pela equipe', 2, 5, 11, 45, 37]] },
      settings: { title: 'Respeito e liderança vão bem; carga de trabalho é o ponto crítico', subtitle: 'Pesquisa de clima 2025 — % das respostas (n = 842)', neutral: 'split', pair: 'orange-blue', sort: 'pos', labels: 'smart' }
    },
    {
      id: 'likert-4-niveis', cat: 'pesquisa', type: 'likert', name: 'Likert sem neutro (4 níveis)',
      desc: 'Escalas pares forçam uma posição; o gráfico se ajusta ao número de níveis.',
      tags: ['likert', 'satisfação', 'serviços', 'escala par'],
      data: { columns: ['Serviço', 'Muito insatisfeito', 'Insatisfeito', 'Satisfeito', 'Muito satisfeito'], rows: [['Atendimento telefônico', 22, 31, 35, 12], ['Aplicativo', 6, 14, 48, 32], ['Loja física', 9, 18, 46, 27], ['Entrega', 12, 21, 44, 23], ['Pós-venda', 19, 27, 38, 16]] },
      settings: { title: 'O atendimento telefônico é o único serviço com maioria insatisfeita', subtitle: 'Satisfação por serviço, % das respostas', pair: 'red-blue', sort: 'pos' }
    },
    {
      id: 'nps-notas', cat: 'pesquisa', type: 'bar', name: 'Distribuição do NPS (0–10)',
      desc: 'As 11 notas em colunas, com os promotores (9–10) em destaque.',
      tags: ['nps', 'promotores', 'detratores', 'notas'],
      data: { columns: ['Nota', 'Respostas'], rows: [['0', 12], ['1', 6], ['2', 9], ['3', 11], ['4', 14], ['5', 30], ['6', 38], ['7', 71], ['8', 104], ['9', 162], ['10', 198]] },
      settings: { title: 'NPS 45: dois terços dos clientes dão nota 9 ou 10', subtitle: 'Respostas por nota à pergunta "Recomendaria a um amigo?" (n = 655)', orientation: 'v', highlight: ['9', '10'], labels: 'all' }
    },
    {
      id: 'intencao-voto', cat: 'pesquisa', type: 'line', name: 'Intenção de voto no tempo',
      desc: 'Várias pesquisas, poucas séries, rótulos no fim. Uma faixa para a margem de erro no final.',
      tags: ['eleição', 'pesquisa eleitoral', 'intenção de voto', 'empate técnico'],
      data: { columns: ['Pesquisa', 'Candidata A', 'Candidato B', 'Candidato C', 'Brancos e nulos'], rows: [['mai', 31, 24, 12, 18], ['jun', 32, 26, 11, 16], ['jul', 30, 28, 12, 15], ['ago 1ª', 31, 29, 10, 15], ['ago 2ª', 30, 30, 11, 14], ['set 1ª', 31, 31, 10, 13], ['set 2ª', 32, 31, 9, 13]] },
      settings: { title: 'A e B estão empatados tecnicamente desde agosto', subtitle: 'Intenção de voto estimulada, % — margem de erro de 2 pontos', suffix: '%', labels: 'smart', markers: 'all', highlight: ['Candidata A', 'Candidato B'] }
    },
    {
      id: 'multipla-escolha', cat: 'pesquisa', type: 'bar', name: 'Pergunta de múltipla escolha',
      desc: 'Motivos, preferências: barras horizontais ordenadas em %. A soma pode passar de 100%.',
      tags: ['múltipla escolha', 'motivos', 'cancelamento', 'pesquisa'],
      data: { columns: ['Motivo', '% dos respondentes'], rows: [['Preço alto', 47], ['Pouco uso', 33], ['Encontrei alternativa melhor', 21], ['Problemas técnicos', 14], ['Atendimento ruim', 11], ['Outro', 6]] },
      settings: { title: 'Preço é o principal motivo de cancelamento, citado por quase metade', subtitle: 'Por que você cancelou? (várias respostas possíveis, n = 1.204)', orientation: 'h', sort: 'desc', highlight: ['Preço alto'], suffix: '%', labels: 'all' }
    },
    {
      id: 'radar-competencias', cat: 'pesquisa', type: 'radar', name: 'Avaliação de competências (360°)',
      desc: 'Autoavaliação contra a média dos pares, em cada competência.',
      tags: ['360', 'competências', 'avaliação', 'rh', 'feedback'],
      data: { columns: ['Competência', 'Autoavaliação', 'Média dos pares'], rows: [['Comunicação', 4.5, 3.6], ['Técnica', 4.2, 4.4], ['Colaboração', 4.0, 4.1], ['Liderança', 4.6, 3.4], ['Organização', 3.8, 3.9], ['Inovação', 4.1, 3.7]] },
      settings: { title: 'A maior diferença de percepção está em liderança e comunicação', subtitle: 'Notas de 1 a 5 na avaliação 360°', max: 5, decimals: 1, labels: 'none' }
    }
  );
})(window.GG = window.GG || {});
