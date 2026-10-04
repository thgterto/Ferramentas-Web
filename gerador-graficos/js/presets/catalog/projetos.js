/**
 * Graficário — modelos: Projetos.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

  P.add(
    {
      id: 'gantt-projeto', cat: 'projetos', type: 'gantt', name: 'Cronograma (Gantt)',
      desc: 'Tarefas por fase, com progresso parcial, marcos (início = fim) e a linha de hoje.',
      tags: ['gantt', 'cronograma', 'projeto', 'fases', 'marcos'],
      data: { columns: ['Tarefa', 'Início', 'Fim', 'Fase', 'Progresso'], rows: [['Levantamento de requisitos', '2025-09-01', '2025-09-19', 'Descoberta', 1], ['Pesquisa com usuários', '2025-09-08', '2025-09-26', 'Descoberta', 1], ['Aprovação do escopo', '2025-09-29', '2025-09-29', 'Descoberta', ''], ['Protótipo navegável', '2025-09-29', '2025-10-17', 'Design', 0.8], ['Sistema visual', '2025-10-06', '2025-10-24', 'Design', 0.5], ['API de pedidos', '2025-10-13', '2025-11-14', 'Desenvolvimento', 0.3], ['App mobile', '2025-10-20', '2025-11-28', 'Desenvolvimento', 0.15], ['Testes integrados', '2025-11-24', '2025-12-12', 'Qualidade', 0], ['Lançamento', '2025-12-15', '2025-12-15', 'Qualidade', '']] },
      settings: { title: 'O app mobile é o caminho crítico para o lançamento de 15/12', subtitle: 'Cronograma do projeto de novo app de pedidos', today: '2025-10-28' }
    },
    {
      id: 'burndown-sprint', cat: 'projetos', type: 'line', name: 'Burndown de sprint',
      desc: 'Trabalho restante real contra o ideal. A diferença no fim é o atraso.',
      tags: ['burndown', 'sprint', 'scrum', 'ágil'],
      data: { columns: ['Dia', 'Ideal', 'Real'], rows: [['D1', 60, 60], ['D2', 54, 58], ['D3', 48, 55], ['D4', 42, 55], ['D5', 36, 49], ['D6', 30, 44], ['D7', 24, 40], ['D8', 18, 33], ['D9', 12, ''], ['D10', 6, ''], ['D11', 0, '']] },
      settings: { title: 'No ritmo atual, a sprint 14 termina com 12 pontos pendentes', subtitle: 'Pontos de história restantes por dia', highlight: ['Real'], markers: 'all', labels: 'smart' }
    },
    {
      id: 'linha-do-tempo', cat: 'projetos', type: 'timeline', name: 'Linha do tempo de marcos',
      desc: 'Eventos numa linha do tempo, com rótulos alternados acima e abaixo.',
      tags: ['história', 'marcos', 'eventos', 'timeline'],
      data: { columns: ['Data', 'Evento', 'Tipo'], rows: [['2019-03-10', 'Fundação', 'Empresa'], ['2019-11-05', 'Primeiro cliente', 'Comercial'], ['2020-06-15', 'Rodada seed', 'Investimento'], ['2021-02-20', 'Lançamento do app', 'Produto'], ['2021-10-01', '100 clientes', 'Comercial'], ['2022-05-12', 'Série A', 'Investimento'], ['2023-03-08', 'Expansão para o Sul', 'Comercial'], ['2024-01-22', 'Nova plataforma', 'Produto'], ['2025-06-30', '1.000 clientes', 'Comercial']] },
      settings: { title: 'De um cliente a mil em seis anos', subtitle: 'Principais marcos da empresa', levels: 3, source: '' }
    },
    {
      id: 'roadmap-trimestral', cat: 'projetos', type: 'gantt', name: 'Roadmap por trimestre',
      desc: 'Iniciativas por time ao longo do ano, sem progresso — visão de alto nível.',
      tags: ['roadmap', 'planejamento', 'trimestre', 'produto'],
      data: { columns: ['Iniciativa', 'Início', 'Fim', 'Time'], rows: [['Checkout novo', '2026-01-05', '2026-03-27', 'Compra'], ['Pix parcelado', '2026-02-02', '2026-05-29', 'Pagamentos'], ['Programa de fidelidade', '2026-04-06', '2026-08-28', 'Crescimento'], ['App para lojistas', '2026-03-02', '2026-07-31', 'Parceiros'], ['Recomendações com IA', '2026-06-01', '2026-10-30', 'Crescimento'], ['Migração de nuvem', '2026-01-12', '2026-06-26', 'Plataforma'], ['Novo antifraude', '2026-07-06', '2026-11-27', 'Pagamentos']] },
      settings: { title: 'Roadmap 2026: sete iniciativas, cinco times', subtitle: 'Planejamento anual de produto', source: '' }
    },
    {
      id: 'velocidade-sprints', cat: 'projetos', type: 'bar', name: 'Velocidade por sprint',
      desc: 'Colunas por período com a média como linha de referência.',
      tags: ['velocidade', 'sprints', 'média', 'ágil'],
      data: { columns: ['Sprint', 'Pontos entregues'], rows: [['S7', 34], ['S8', 41], ['S9', 38], ['S10', 29], ['S11', 44], ['S12', 46], ['S13', 43], ['S14', 48]] },
      settings: { title: 'A velocidade estabilizou acima de 40 pontos nas últimas quatro sprints', subtitle: 'Pontos de história entregues por sprint', orientation: 'v', labels: 'all', highlight: ['S11', 'S12', 'S13', 'S14'], annotations: { refs: [{ axis: 'val', v: 40.4, label: 'Média' }] } }
    },
    {
      id: 'calendario-commits', cat: 'projetos', type: 'calendar', name: 'Calendário de atividade',
      desc: 'Atividade diária num ano (commits, entregas, treinos).',
      tags: ['commits', 'atividade', 'calendário', 'hábitos'],
      data: (g) => { const r = g.rng(9001); return { columns: ['Data', 'Commits'], rows: g.days(365, '2025-01-01').map((d) => { const wd = GG.data.toDate(d).getDay(); return [d, wd === 0 || wd === 6 ? (r() < 0.2 ? Math.round(r() * 4) : 0) : Math.round(r() * r() * 14)]; }) }; },
      settings: { title: 'O time quase não trabalha nos fins de semana — e isso é bom', subtitle: 'Commits por dia no repositório principal em 2025', hue: 'aqua' }
    }
  );
})(window.GG = window.GG || {});
