/**
 * Modelos: KPIs, qualidade/CEP, finanças, projetos, pesquisas, geografia e
 * técnicas de storytelling.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;
  const M = GG.gen.monthNames;

  // =========================================================== KPIs
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

  // =========================================================== QUALIDADE E CEP
  P.add(
    {
      id: 'carta-controle-imr', cat: 'qualidade', type: 'control', name: 'Carta de controle I-AM',
      desc: 'Controle estatístico de processo (CEP): limites ±3σ pela amplitude móvel e regras de Western Electric.',
      tags: ['cep', 'spc', 'carta de controle', 'imr', 'qualidade', 'processo'],
      data: (g) => {
        const v = g.normals(81, 40, 12.0, 0.18, 2);
        v[17] = 12.86; v[18] = 12.79; v[29] = 11.3;
        return { columns: ['Amostra', 'Teor de umidade (%)'], rows: v.map((x, i) => ['A' + (i + 1), x]) };
      },
      settings: { title: 'O processo saiu de controle logo após a troca de lote de matéria-prima (A18)', subtitle: 'Umidade do produto final por amostra, % — limites calculados pela amplitude móvel', suffix: '%', decimals: 2, showMR: true, rule2: true, rule3: true }
    },
    {
      id: 'carta-controle-deriva', cat: 'qualidade', type: 'control', name: 'Carta de controle com deriva',
      desc: 'Processo dentro dos limites, mas "andando": as regras de sequência pegam a deriva antes da falha.',
      tags: ['cep', 'deriva', 'tendência', 'desgaste', 'ferramenta'],
      data: (g) => { const r = g.rng(91); return { columns: ['Peça', 'Diâmetro (mm)'], rows: Array.from({ length: 36 }, (_, i) => ['P' + (i + 1), +(25 + (i > 18 ? (i - 18) * 0.009 : 0) + (r() - 0.5) * 0.06).toFixed(3)]) }; },
      settings: { title: 'O diâmetro deriva para cima desde a peça 19 — desgaste da ferramenta', subtitle: 'Diâmetro por peça, mm — especificação 24,85 a 25,20 mm', decimals: 3, lsl: 24.85, usl: 25.2, showMR: false, zones: true, rule2: true, rule3: true }
    },
    {
      id: 'pareto-defeitos', cat: 'qualidade', type: 'pareto', name: 'Pareto de defeitos',
      desc: 'Poucas causas explicam a maioria dos problemas. Barras e acumulado no mesmo eixo (%).',
      tags: ['pareto', 'defeitos', 'curva abc', '80/20', 'qualidade'],
      data: { columns: ['Defeito', 'Ocorrências'], rows: [['Rótulo torto', 142], ['Tampa mal rosqueada', 118], ['Nível abaixo', 96], ['Embalagem amassada', 41], ['Lote ilegível', 28], ['Cor fora do padrão', 19], ['Vazamento', 12], ['Outros', 9]] },
      settings: { title: 'Três defeitos respondem por 76% das ocorrências', subtitle: 'Defeitos registrados na inspeção final em setembro', cut: 80, labels: 'smart' }
    },
    {
      id: 'pareto-paradas', cat: 'qualidade', type: 'pareto', name: 'Pareto de horas paradas',
      desc: 'Mesma lógica aplicada a tempo perdido: onde atacar primeiro.',
      tags: ['paradas', 'manutenção', 'tempo perdido', 'pareto'],
      data: { columns: ['Causa da parada', 'Horas'], rows: [['Troca de formato', 46], ['Falta de material', 31], ['Quebra da rotuladora', 22], ['Limpeza não programada', 12], ['Falta de operador', 8], ['Queda de energia', 5], ['Outras', 6]] },
      settings: { title: 'Troca de formato e falta de material somam 59% do tempo parado', subtitle: 'Horas de parada da linha 2 por causa, no trimestre', suffix: ' h', cut: 80 }
    },
    {
      id: 'capabilidade-brix', cat: 'qualidade', type: 'histogram', name: 'Capabilidade descentrada',
      desc: 'Histograma com limites: o Cpk baixo mostra um processo que cabe na tolerância, mas está descentrado.',
      tags: ['brix', 'laboratório', 'cpk', 'agro', 'capabilidade'],
      data: (g) => ({ columns: ['Brix do caldo (°Bx)'], rows: g.normals(44, 180, 20.9, 0.42, 2).map((v) => [v]) }),
      settings: { title: 'O Brix cabe na tolerância, mas está deslocado para o limite superior', subtitle: 'Leituras de laboratório do caldo, °Bx (180 amostras)', lsl: 18.5, usl: 22, target: 20.2, decimals: 2, normal: true, stats: true }
    },
    {
      id: 'boxplot-lotes', cat: 'qualidade', type: 'boxplot', name: 'Variação entre lotes',
      desc: 'Um boxplot por lote para enxergar deslocamentos e dispersões diferentes.',
      tags: ['lotes', 'variação', 'laboratório', 'boxplot'],
      data: (g) => {
        const lots = ['L-101', 'L-102', 'L-103', 'L-104', 'L-105', 'L-106'];
        const cols = lots.map((_, i) => g.normals(600 + i, 20, [12, 12.1, 11.9, 12.6, 12.05, 11.95][i], [0.15, 0.14, 0.16, 0.18, 0.4, 0.15][i], 2));
        return { columns: lots, rows: Array.from({ length: 20 }, (_, r) => cols.map((c) => c[r])) };
      },
      settings: { title: 'O lote L-104 está deslocado e o L-105 tem o dobro da variação', subtitle: 'Umidade medida em 20 amostras por lote, %', suffix: '%', decimals: 2, highlight: ['L-104', 'L-105'], mean: true, annotations: { refs: [{ axis: 'val', v: 12, label: 'Alvo' }] } }
    },
    {
      id: 'heatmap-defeitos-turno', cat: 'qualidade', type: 'heatmap', name: 'Defeitos por linha × turno',
      desc: 'Uma matriz simples revela onde e quando o problema acontece.',
      tags: ['defeitos', 'turno', 'linha', 'matriz'],
      data: { columns: ['Linha', 'Manhã', 'Tarde', 'Noite', 'Madrugada'], rows: [['Linha 1', 12, 14, 18, 22], ['Linha 2', 9, 11, 10, 12], ['Linha 3', 15, 17, 41, 38], ['Linha 4', 7, 8, 9, 11]] },
      settings: { title: 'A Linha 3 concentra defeitos à noite e de madrugada', subtitle: 'Defeitos por 10 mil unidades, média de setembro', scale: 'seq', hue: 'orange', labels: 'all' }
    },
    {
      id: 'grafico-sequencia-mediana', cat: 'qualidade', type: 'line', name: 'Gráfico de sequência (run chart)',
      desc: 'A versão simples da carta de controle: a série no tempo e a mediana como referência.',
      tags: ['run chart', 'mediana', 'melhoria contínua', 'tempo de ciclo'],
      data: { columns: ['Dia', 'Tempo de setup (min)'], rows: Array.from({ length: 20 }, (_, i) => ['D' + (i + 1), [48, 52, 45, 50, 47, 55, 49, 44, 46, 51, 38, 36, 35, 39, 33, 34, 31, 35, 32, 30][i]]) },
      settings: { title: 'Depois do SMED (dia 11), o setup caiu 30% e ficou abaixo da mediana', subtitle: 'Tempo de setup por dia, minutos', suffix: ' min', markers: 'all', labels: 'none', annotations: { refs: [{ axis: 'val', v: 42, label: 'Mediana' }], notes: [{ x: 'D11', text: 'SMED implantado' }] } }
    }
  );

  // =========================================================== FINANÇAS
  P.add(
    {
      id: 'dre-cascata', cat: 'financas', type: 'waterfall', name: 'DRE em cascata',
      desc: 'Da receita bruta ao lucro líquido. Linhas iniciadas por "=" viram subtotais calculados.',
      tags: ['dre', 'resultado', 'lucro', 'ebitda', 'contabilidade'],
      data: { columns: ['Linha da DRE', 'R$ mi'], rows: [['Receita bruta', 120], ['Impostos e devoluções', -21], ['= Receita líquida', ''], ['Custo dos produtos', -52], ['= Lucro bruto', ''], ['Despesas comerciais', -14], ['Despesas administrativas', -9], ['= EBITDA', ''], ['Depreciação', -4], ['Resultado financeiro', -3.5], ['Impostos sobre lucro', -5.2]] },
      settings: { title: 'De cada R$ 100 faturados, sobram R$ 9 de lucro líquido', subtitle: 'Demonstração do resultado de 2025, R$ milhões', finalLabel: 'Lucro líquido', polarity: 'good', prefix: 'R$ ', suffix: ' mi', decimals: 1, labels: 'smart' }
    },
    {
      id: 'fluxo-caixa-cascata', cat: 'financas', type: 'waterfall', name: 'Fluxo de caixa (horizontal)',
      desc: 'Saldo inicial, entradas e saídas até o saldo final, em barras horizontais.',
      tags: ['fluxo de caixa', 'caixa', 'saldo', 'tesouraria'],
      data: { columns: ['Movimento', 'R$ mil'], rows: [['Saldo inicial', 850], ['Recebimentos de clientes', 1420], ['Pagamento a fornecedores', -780], ['Folha de pagamento', -520], ['Impostos', -210], ['Empréstimo captado', 300], ['Investimentos em máquinas', -460], ['Juros', -45]] },
      settings: { title: 'Mesmo com o empréstimo, o caixa fechou o mês R$ 295 mil abaixo do início', subtitle: 'Fluxo de caixa de outubro, R$ mil', finalLabel: 'Saldo final', orientation: 'h', prefix: 'R$ ', suffix: ' mil' }
    },
    {
      id: 'candlestick-acao', cat: 'financas', type: 'candlestick', name: 'Candlestick com volume',
      desc: 'OHLC com médias móveis e volume em painel separado (nunca num segundo eixo).',
      tags: ['ações', 'bolsa', 'ohlc', 'candle', 'trading'],
      data: (g) => {
        const r = g.rng(123); let p = 32; const rows = [];
        g.days(120, '2025-04-01').forEach((d) => { const dt = GG.data.toDate(d); if (dt.getDay() === 0 || dt.getDay() === 6) return; const o = p; const c = +(o * (1 + (r() - 0.47) * 0.04)).toFixed(2); const h = +(Math.max(o, c) * (1 + r() * 0.015)).toFixed(2); const l = +(Math.min(o, c) * (1 - r() * 0.015)).toFixed(2); rows.push([d.slice(8, 10) + '/' + d.slice(5, 7), o, c, l, h, Math.round(1e6 * (0.6 + r() * 0.9))]); p = c; });
        return { columns: ['Data', 'Abertura', 'Fechamento', 'Mínima', 'Máxima', 'Volume'], rows };
      },
      settings: { title: 'A ação rompeu a média de 20 dias com volume acima do normal', subtitle: 'Cotação diária, R$ — médias móveis de 5 e 20 pregões', prefix: 'R$ ', decimals: 2, ma: '5,20', zoom: true }
    },
    {
      id: 'carteira-vs-cdi', cat: 'financas', type: 'line', name: 'Rentabilidade vs referências',
      desc: 'Carteira contra CDI e bolsa, todas indexadas a 100 — nada de dois eixos.',
      tags: ['rentabilidade', 'cdi', 'ibovespa', 'benchmark', 'carteira'],
      data: (g) => ({ columns: ['Mês', 'Carteira', 'CDI', 'Bolsa'], rows: g.zip(g.months(24, 2024, 0), g.walk(301, 24, 100, 1.05, 1.1, null, 2), g.walk(302, 24, 100, 0.92, 0.02, null, 2), g.walk(303, 24, 100, 0.5, 3.4, null, 2)) }),
      settings: { title: 'A carteira bateu o CDI com menos oscilação que a bolsa', subtitle: 'Valor de R$ 100 aplicados em janeiro de 2024', index100: true, highlight: ['Carteira'], labels: 'smart' }
    },
    {
      id: 'alocacao-rosca', cat: 'financas', type: 'pie', name: 'Alocação da carteira',
      desc: 'Poucas classes, participação num relance, total no centro.',
      tags: ['alocação', 'investimentos', 'rosca', 'patrimônio'],
      data: { columns: ['Classe', 'R$ mil'], rows: [['Renda fixa', 435], ['Ações', 200], ['Fundos imobiliários', 85], ['Exterior', 80]] },
      settings: { title: 'Mais da metade do patrimônio está em renda fixa', subtitle: 'Alocação por classe de ativo, R$ mil', donut: true, center: 'total', prefix: 'R$ ', suffix: ' mil', labels: 'smart' }
    },
    {
      id: 'despesas-categoria', cat: 'financas', type: 'bar', name: 'Despesas por categoria',
      desc: 'Onde o dinheiro vai, ordenado, com a maior despesa em destaque.',
      tags: ['despesas', 'custos', 'categorias', 'orçamento'],
      data: { columns: ['Categoria', 'R$ mil'], rows: [['Folha de pagamento', 1840], ['Aluguel', 420], ['Marketing', 380], ['Tecnologia', 360], ['Frete', 290], ['Energia', 140], ['Viagens', 90], ['Material de escritório', 35]] },
      settings: { title: 'A folha de pagamento é 52% de todas as despesas', subtitle: 'Despesas do semestre por categoria, R$ mil', orientation: 'h', sort: 'desc', highlight: ['Folha de pagamento'], prefix: 'R$ ', suffix: ' mil', labels: 'all' }
    },
    {
      id: 'divida-composicao', cat: 'financas', type: 'line', name: 'Composição da dívida no tempo',
      desc: 'Áreas empilhadas mostram o total e a troca entre tipos de dívida.',
      tags: ['dívida', 'endividamento', 'áreas', 'passivo'],
      data: { columns: ['Trimestre', 'Bancária', 'Debêntures', 'Fornecedores'], rows: [['1T24', 180, 40, 60], ['2T24', 170, 60, 58], ['3T24', 150, 90, 55], ['4T24', 130, 120, 52], ['1T25', 110, 140, 50], ['2T25', 95, 150, 48]] },
      settings: { title: 'A troca de dívida bancária por debêntures manteve o total estável', subtitle: 'Dívida por tipo, R$ milhões', area: 'stacked', prefix: 'R$ ', suffix: ' mi', labels: 'none' }
    }
  );

  // =========================================================== PROJETOS
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

  // =========================================================== PESQUISAS
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

  // =========================================================== GEOGRAFIA
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  P.add(
    {
      id: 'mapa-grade-uf', cat: 'geo', type: 'tilemap', name: 'Mapa em grade por UF',
      desc: 'Cada estado ocupa o mesmo espaço: a cor carrega o valor sem a área distorcer a leitura.',
      tags: ['mapa', 'estados', 'uf', 'brasil', 'coroplético', 'tile map'],
      data: { columns: ['UF', 'Acesso à internet (%)'], rows: UFS.map((u) => [u, { AC: 78, AL: 76, AP: 82, AM: 79, BA: 80, CE: 81, DF: 95, ES: 88, GO: 89, MA: 72, MT: 88, MS: 89, MG: 87, PA: 77, PB: 80, PR: 90, PE: 81, PI: 74, RJ: 91, RN: 83, RS: 89, RO: 84, RR: 83, SC: 92, SP: 93, SE: 81, TO: 83 }[u]]) },
      settings: { title: 'Maranhão e Piauí têm o menor acesso à internet do país', subtitle: 'Domicílios com acesso à internet, % por UF', scale: 'seq', hue: 'blue', suffix: '%', highlight: ['MA', 'PI'] }
    },
    {
      id: 'mapa-grade-variacao', cat: 'geo', type: 'tilemap', name: 'Mapa em grade divergente',
      desc: 'Variação positiva/negativa por estado, com escala divergente centrada no zero.',
      tags: ['mapa', 'variação', 'estados', 'divergente'],
      data: { columns: ['UF', 'Variação vs 2024 (%)'], rows: UFS.map((u, i) => [u, [-4, 6, 12, -2, 8, 5, -6, 3, 9, 11, 14, 7, 2, 10, 4, -1, 6, 13, -8, 5, -3, 9, 15, -5, -2, 3, 12][i]]) },
      settings: { title: 'Norte e Nordeste cresceram; o Sudeste encolheu', subtitle: 'Variação das vendas em 2025 em relação a 2024, % por UF', scale: 'div', pair: 'red-blue', center: 0, suffix: '%' }
    },
    {
      id: 'regioes-barras-uf', cat: 'geo', type: 'bar', name: 'Estados de uma região em foco',
      desc: 'Quando o mapa não cabe ou a precisão importa: barras ordenadas com a região da história destacada.',
      tags: ['estados', 'região', 'barras', 'nordeste'],
      data: { columns: ['UF', 'Crescimento do PIB (%)'], rows: [['PI', 4.8], ['MA', 4.4], ['CE', 3.9], ['TO', 3.7], ['BA', 3.5], ['MT', 3.4], ['PE', 3.1], ['GO', 2.9], ['PA', 2.8], ['SC', 2.6], ['PR', 2.4], ['RN', 2.3], ['MG', 2.1], ['SP', 1.9], ['RS', 1.2], ['RJ', 1.0]] },
      settings: { title: 'Quatro dos cinco estados que mais cresceram são do Nordeste', subtitle: 'Crescimento do PIB em 2025, % — estados selecionados', orientation: 'h', sort: 'desc', highlight: ['PI', 'MA', 'CE', 'BA', 'PE', 'RN'], suffix: '%', decimals: 1, labels: 'smart' }
    },
    {
      id: 'regioes-multiplos', cat: 'geo', type: 'multiples', name: 'Regiões em pequenos múltiplos',
      desc: 'Uma evolução por região, mesma escala — alternativa ao mapa animado.',
      tags: ['regiões', 'evolução', 'painéis', 'desemprego'],
      data: { columns: ['Ano', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'], rows: [['2019', 11.8, 14.1, 9.6, 12.3, 7.8], ['2020', 13.1, 16.2, 10.7, 13.9, 8.7], ['2021', 12.4, 15.5, 9.9, 13.1, 8.0], ['2022', 9.4, 11.6, 7.2, 9.1, 5.6], ['2023', 8.3, 10.4, 6.3, 7.9, 5.0], ['2024', 7.4, 9.5, 5.6, 6.8, 4.5], ['2025', 6.9, 8.8, 5.2, 6.1, 4.1]] },
      settings: { title: 'O desemprego caiu em todas as regiões desde 2020', subtitle: 'Taxa de desocupação média anual, %', kind: 'area', ghost: true, sharedY: true, suffix: '%', decimals: 1, labels: 'smart' }
    }
  );

  // =========================================================== TÉCNICAS DE STORYTELLING
  P.add(
    {
      id: 'historia-cinza-e-cor', cat: 'historia', type: 'line', name: 'Cinza para o contexto, cor para a história',
      desc: 'Técnica: atributo pré-atentivo. Todas as séries em cinza e só a que importa em cor — o olho vai direto nela.',
      tags: ['ênfase', 'destaque', 'atenção', 'pré-atentivo'],
      data: (g) => ({ columns: ['Mês', 'Loja', 'Site', 'Televendas', 'Aplicativo', 'Marketplace'], rows: g.zip(M, g.walk(701, 12, 142, -0.4, 3, null, 0), g.walk(702, 12, 138, 0.3, 3, null, 0), g.walk(703, 12, 118, -0.8, 3, null, 0), g.walk(704, 12, 96, 4.6, 2.5, null, 0), g.walk(705, 12, 124, 0.2, 3, null, 0)) }),
      settings: { title: 'Só o aplicativo aumentou o ticket médio em 2025', subtitle: 'Ticket médio por canal, R$', highlight: ['Aplicativo'], prefix: 'R$ ', labels: 'smart' }
    },
    {
      id: 'historia-titulo-conclusao', cat: 'historia', type: 'bar', name: 'O título é a conclusão',
      desc: 'Técnica: em vez de "Reclamações por mês", escreva o que o leitor deve concluir. A faixa marca a causa.',
      tags: ['título', 'conclusão', 'big idea', 'mensagem'],
      data: { columns: ['Mês', 'Reclamações'], rows: M.map((m, i) => [m, [412, 398, 430, 405, 388, 402, 316, 281, 262, 255, 248, 240][i]]) },
      settings: { title: 'Reclamações caíram 40% depois do novo SAC, em julho', subtitle: 'Reclamações registradas por mês em 2025', orientation: 'v', labels: 'smart', highlight: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], annotations: { bands: [{ from: 'Jul', to: 'Dez', label: 'Novo SAC' }] } }
    },
    {
      id: 'historia-antes-depois', cat: 'historia', type: 'slope', name: 'Antes → depois em dois pontos',
      desc: 'Técnica: reduza a série ao que importa. Dois momentos contam a mudança melhor que 24 pontos.',
      tags: ['antes e depois', 'simplificar', 'slope', 'mudança'],
      data: { columns: ['Fábrica', 'Antes do programa', 'Depois do programa'], rows: [['Betim', 20, 6], ['Camaçari', 12, 7], ['Manaus', 11, 8], ['Jundiaí', 9, 5], ['Sorocaba', 8, 6], ['Canoas', 7, 4]] },
      settings: { title: 'Todas as fábricas reduziram acidentes — Betim, em 70%', subtitle: 'Acidentes por mês, média de 6 meses antes × 6 meses depois do programa', colorBy: 'single', highlight: ['Betim'], labels: 'smart' }
    },
    {
      id: 'historia-evento-anotado', cat: 'historia', type: 'line', name: 'Anote o momento da virada',
      desc: 'Técnica: nota direta no gráfico. O leitor não precisa adivinhar por que a linha mudou.',
      tags: ['anotação', 'evento', 'virada', 'explicação'],
      data: (g) => ({ columns: ['Semana', 'Tempo de resposta (h)'], rows: g.zip(g.weeks(20, 'S'), [26, 28, 25, 27, 29, 31, 30, 18, 12, 9, 8, 8, 7, 8, 7, 6, 7, 6, 6, 5]) }),
      settings: { title: 'O chatbot reduziu o tempo de resposta de 30 para 6 horas', subtitle: 'Tempo médio até a primeira resposta, horas', suffix: ' h', labels: 'smart', annotations: { notes: [{ x: 'S8', text: 'Chatbot entra no ar' }], refs: [{ axis: 'val', v: 8, label: 'SLA' }] } }
    },
    {
      id: 'historia-ordene', cat: 'historia', type: 'bar', name: 'Ordene pelo valor, não pelo alfabeto',
      desc: 'Técnica: a ordem é informação. Ordenado do maior para o menor, o padrão aparece sozinho.',
      tags: ['ordenar', 'ranking', 'clareza', 'barras'],
      data: { columns: ['Fornecedor', 'Atraso médio (dias)'], rows: [['Alfa Embalagens', 1.2], ['Beta Químicos', 6.8], ['Gama Metais', 2.1], ['Delta Plásticos', 0.8], ['Épsilon Papel', 4.9], ['Zeta Têxtil', 1.6], ['Eta Vidros', 3.2]] },
      settings: { title: 'Dois fornecedores concentram os atrasos', subtitle: 'Atraso médio por entrega no semestre, dias', orientation: 'h', sort: 'desc', highlight: ['Beta Químicos', 'Épsilon Papel'], suffix: ' d', decimals: 1, labels: 'all' }
    },
    {
      id: 'historia-troque-pizza', cat: 'historia', type: 'bar', name: 'Troque a pizza de 10 fatias',
      desc: 'Técnica: fatias demais viram adivinhação. Barras ordenadas permitem comparar cada item.',
      tags: ['pizza', 'alternativa', 'barras', 'comparação'],
      data: { columns: ['Origem do tráfego', 'Visitas (%)'], rows: [['Google', 31], ['Instagram', 17], ['Direto', 14], ['E-mail', 9], ['TikTok', 8], ['Facebook', 7], ['YouTube', 5], ['Bing', 4], ['LinkedIn', 3], ['Outros', 2]] },
      settings: { title: 'Google traz quase o dobro de visitas do Instagram', subtitle: 'Origem das visitas ao site em outubro, %', orientation: 'h', sort: 'desc', highlight: ['Google', 'Instagram'], suffix: '%', labels: 'all' }
    },
    {
      id: 'historia-indexe', cat: 'historia', type: 'line', name: 'Indexe em vez de usar dois eixos',
      desc: 'Técnica: eixo duplo inventa correlações. Indexar ao mesmo ponto de partida compara crescimentos com honestidade.',
      tags: ['eixo duplo', 'índice', 'base 100', 'honestidade'],
      data: { columns: ['Ano', 'Alunos matriculados', 'Orçamento (R$ mi)'], rows: [['2019', 48200, 310], ['2020', 47900, 322], ['2021', 49100, 330], ['2022', 50300, 356], ['2023', 51000, 391], ['2024', 51400, 428], ['2025', 51800, 462]] },
      settings: { title: 'O orçamento cresceu 49%; as matrículas, só 7%', subtitle: 'Índice, 2019 = 100', index100: true, labels: 'smart' }
    },
    {
      id: 'historia-waffle', cat: 'historia', type: 'waffle', name: 'Torne a proporção concreta',
      desc: 'Técnica: "23%" é abstrato; 23 quadrados em 100 é algo que se vê e se lembra.',
      tags: ['proporção', 'concreto', 'waffle', 'público geral'],
      data: { columns: ['Situação', 'Pessoas'], rows: [['Não concluíram o curso', 23], ['Concluíram', 77]] },
      settings: { title: 'Quase 1 em cada 4 alunos não conclui o curso', subtitle: 'Situação dos matriculados em 2024, %', highlight: ['Não concluíram o curso'] }
    },
    {
      id: 'historia-numero', cat: 'historia', type: 'hero', name: 'Às vezes, só o número',
      desc: 'Técnica: com um ou dois números, um gráfico é ruído. O número grande e uma frase bastam.',
      tags: ['número', 'simplicidade', 'texto', 'destaque'],
      data: { columns: ['Rótulo', 'Valor', 'Contexto'], rows: [['dos clientes que ligam duas vezes cancelam em até 90 dias', 41, 'Resolver no primeiro contato é a alavanca de retenção mais barata que temos.']] },
      settings: { title: 'Cada segunda ligação é um alerta de cancelamento', subtitle: '', suffix: '%', decimals: 0, align: 'left', accentNumber: true, source: 'base de clientes, jan–set' }
    },
    {
      id: 'historia-espaguete', cat: 'historia', type: 'multiples', name: 'Desfaça o espaguete',
      desc: 'Técnica: 8 linhas cruzadas viram 8 painéis legíveis, com as outras séries em cinza ao fundo.',
      tags: ['espaguete', 'pequenos múltiplos', 'clareza', 'painéis'],
      data: (g) => ({ columns: ['Mês', 'Produto A', 'Produto B', 'Produto C', 'Produto D', 'Produto E', 'Produto F', 'Produto G', 'Produto H'], rows: g.zip(M, g.walk(801, 12, 50, 1.5, 3, null, 0), g.walk(802, 12, 60, -1, 3, null, 0), g.walk(803, 12, 45, 0.4, 3, null, 0), g.walk(804, 12, 40, 2.2, 3, null, 0), g.walk(805, 12, 58, 0, 3, null, 0), g.walk(806, 12, 35, -0.5, 3, null, 0), g.walk(807, 12, 52, 1, 3, null, 0), g.walk(808, 12, 47, -1.6, 3, null, 0)) }),
      settings: { title: 'Produto D cresce; B e H perdem espaço', subtitle: 'Vendas mensais por produto, mil unidades', kind: 'line', ghost: true, sharedY: true, highlight: ['Produto D', 'Produto B', 'Produto H'], labels: 'smart' }
    }
  );
})(window.GG = window.GG || {});
