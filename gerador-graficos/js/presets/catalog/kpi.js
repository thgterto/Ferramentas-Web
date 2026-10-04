/**
 * Graficário — modelos: Kpis.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

  P.add(
    {
      id: 'kpi-saas', cat: 'kpi', type: 'kpi', name: 'Painel de KPIs (SaaS)',
      desc: 'Linha de cartões: valor atual, variação com seta e sinal, minigráfico da tendência.',
      tags: ['kpi', 'saas', 'mrr', 'churn', 'nps', 'painel', 'dashboard'],
      data: (g) => ({ columns: ['Mês', 'MRR (R$)', 'Clientes ativos', 'Churn (%)', 'NPS'], rows: g.zip(g.months(12, 2025, 0), g.walk(1, 12, 412000, 14000, 6000, null, 0), g.walk(2, 12, 1840, 42, 18, null, 0), g.walk(3, 12, 3.4, -0.08, 0.15, null, 2), g.walk(4, 12, 44, 0.8, 2, null, 0)) }),
      settings: { title: 'Dezembro fechou com MRR recorde e churn abaixo de 3%', subtitle: 'Indicadores do mês e tendência dos últimos 12 meses', compare: 'prev', vsLabel: 'vs mês anterior', lowerBetter: 'churn', spark: true }
    },
    {
      id: 'kpi-industria', cat: 'kpi', type: 'kpi', name: 'KPIs de operação industrial',
      desc: 'Indicadores onde "menor é melhor" (refugo, paradas) ganham a cor certa na variação.',
      tags: ['oee', 'produção', 'refugo', 'paradas', 'indústria', 'kpi'],
      data: (g) => ({ columns: ['Semana', 'OEE (%)', 'Produção (t)', 'Refugo (%)', 'Paradas (h)'], rows: g.zip(g.weeks(10, 'Sem '), g.walk(11, 10, 71, 0.6, 1.2, null, 1), g.walk(12, 10, 840, 6, 20, null, 0), g.walk(13, 10, 2.9, -0.05, 0.2, null, 2), g.walk(14, 10, 14, -0.3, 1.6, null, 1)) }),
      settings: { title: 'OEE subiu pela 3ª semana seguida; refugo segue abaixo de 3%', subtitle: 'Linha de envase 2 — últimas 10 semanas', compare: 'prev', vsLabel: 'vs semana anterior', lowerBetter: 'refugo, paradas' }
    },
    {
      id: 'kpi-ecommerce', cat: 'kpi', type: 'kpi', name: 'KPIs de e-commerce (vs ano anterior)',
      desc: 'Comparação com 12 períodos antes, para neutralizar a sazonalidade.',
      tags: ['e-commerce', 'pedidos', 'ticket', 'conversão', 'yoy'],
      data: (g) => ({ columns: ['Mês', 'Pedidos', 'Ticket médio (R$)', 'Conversão (%)', 'Devoluções (%)'], rows: g.zip(g.months(24, 2024, 0), g.walk(51, 24, 15200, 260, 700, { amp: 2400, period: 12, phase: 2 }, 0), g.walk(52, 24, 182, 0.9, 3, null, 2), g.walk(53, 24, 2.1, 0.02, 0.08, null, 2), g.walk(54, 24, 6.2, -0.04, 0.25, null, 2)) }),
      settings: { title: 'Mais pedidos e ticket maior que em dezembro do ano passado', subtitle: 'Dezembro de 2025 comparado a dezembro de 2024', compare: 'yoy', vsLabel: 'vs ano anterior', lowerBetter: 'devoluções' }
    },
    {
      id: 'numero-heroi', cat: 'kpi', type: 'hero', name: 'Número em destaque',
      desc: 'Um número só? Escreva-o grande e diga o que significa. Um gráfico aqui só atrapalharia.',
      tags: ['número grande', 'hero', 'destaque', 'big number'],
      data: { columns: ['Rótulo', 'Valor', 'Contexto'], rows: [['economizados com a automação das conciliações', 4200000, 'Equivale a 18 mil horas de trabalho manual — o time foi realocado para análise de fraude.']] },
      settings: { title: 'A automação pagou o investimento em 7 meses', subtitle: '', prefix: 'R$ ', compact: true, decimals: 1, align: 'left' }
    },
    {
      id: 'numero-heroi-comparacao', cat: 'kpi', type: 'hero', name: 'Número em destaque + comparação',
      desc: 'Número principal com uma comparação discreta embaixo (ano anterior, meta).',
      tags: ['número grande', 'comparação', 'ano anterior'],
      data: { columns: ['Rótulo', 'Valor', 'Contexto'], rows: [['dos pedidos entregues no prazo em setembro', 96.4, 'Melhor resultado desde a troca de transportadora em maio.'], ['Setembro de 2024', 88.1, '']] },
      settings: { title: 'Pontualidade recorde', subtitle: '', suffix: '%', decimals: 1, align: 'center', accentNumber: true }
    },
    {
      id: 'aneis-metas', cat: 'kpi', type: 'gauge', name: 'Anéis de progresso',
      desc: 'Até quatro metas lado a lado, com o % no centro. Sem ponteiros nem velocímetros.',
      tags: ['meta', 'progresso', 'anel', 'gauge'],
      data: { columns: ['Meta', 'Realizado', 'Meta'], rows: [['Vendas', 8.7, 10], ['Novos clientes', 460, 500], ['Treinamentos', 38, 60], ['Satisfação', 91, 90]] },
      settings: { title: 'Treinamentos estão atrasados: 63% da meta com dois meses restantes', subtitle: 'Metas anuais, acumulado até outubro', status: 'higher', warn: 85, crit: 70, showPct: true }
    }
  );
})(window.GG = window.GG || {});
