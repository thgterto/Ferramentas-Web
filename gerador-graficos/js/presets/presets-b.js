/**
 * Modelos: metas e desvios, distribuição, relação, fluxos, hierarquia.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;
  const M = GG.gen.monthNames;

  // =========================================================== METAS E DESVIOS
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

  // =========================================================== DISTRIBUIÇÃO
  P.add(
    {
      id: 'histograma-capabilidade', cat: 'distribuicao', type: 'histogram', name: 'Histograma com especificação (Cp/Cpk)',
      desc: 'Distribuição de medições contra os limites de especificação. Calcula Cp e Cpk automaticamente.',
      tags: ['capabilidade', 'cpk', 'especificação', 'qualidade', 'histograma'],
      data: (g) => ({ columns: ['Diâmetro (mm)'], rows: g.normals(12, 220, 25.02, 0.036, 3).map((v) => [v]) }),
      settings: { title: 'Processo capaz: Cpk acima de 1,33 e média centrada no alvo', subtitle: 'Diâmetro de 220 peças do lote 45, mm', lsl: 24.85, usl: 25.2, target: 25, normal: true, stats: true, decimals: 2 }
    },
    {
      id: 'histograma-entregas', cat: 'distribuicao', type: 'histogram', name: 'Histograma assimétrico',
      desc: 'Média engana em distribuições com cauda longa (tempos, rendas, preços). Mostre a forma.',
      tags: ['entregas', 'prazo', 'cauda longa', 'assimetria'],
      data: (g) => ({ columns: ['Prazo de entrega (dias)'], rows: g.lognormals(9, 400, 0.8, 0.55, 1).map((v) => [v]) }),
      settings: { title: 'Metade das entregas chega em até 2 dias, mas a cauda passa de 10', subtitle: 'Distribuição de 400 entregas de agosto, em dias', normal: false, stats: true, suffix: ' d', decimals: 1 }
    },
    {
      id: 'boxplot-salarios', cat: 'distribuicao', type: 'boxplot', name: 'Boxplot por grupo',
      desc: 'Compare distribuições: mediana, 50% central, amplitude e atípicos de cada grupo.',
      tags: ['salário', 'boxplot', 'cargos', 'atípicos'],
      data: (g) => {
        const groups = [['Assistente', 3200, 380], ['Analista', 6100, 900], ['Especialista', 9200, 1500], ['Coordenação', 11800, 1700], ['Gerência', 17500, 3200]];
        const cols = groups.map((x, i) => g.normals(100 + i, 40, x[1], x[2], 0));
        cols[1][3] = 11900; cols[1][7] = 11200; cols[0][5] = 5600; cols[4][2] = 29000;
        return { columns: groups.map((x) => x[0]), rows: Array.from({ length: 40 }, (_, r) => cols.map((c) => c[r])) };
      },
      settings: { title: 'As faixas de analista e coordenação se sobrepõem', subtitle: 'Salário mensal por cargo, R$ (40 pessoas por cargo)', prefix: 'R$ ', compact: true, orientation: 'v', mean: true }
    },
    {
      id: 'boxplot-atendimento-pontos', cat: 'distribuicao', type: 'boxplot', name: 'Boxplot + todos os pontos',
      desc: 'Com amostras pequenas, mostre os pontos junto da caixa — ninguém se esconde atrás do resumo.',
      tags: ['tempo de atendimento', 'unidades', 'pontos', 'boxplot'],
      data: (g) => {
        const u = ['Centro', 'Norte', 'Sul', 'Leste', 'Oeste'];
        const cols = u.map((_, i) => g.lognormals(200 + i, 25, 2.6 + i * 0.12, 0.35, 0));
        return { columns: u, rows: Array.from({ length: 25 }, (_, r) => cols.map((c) => c[r])) };
      },
      settings: { title: 'Na unidade Oeste, um em cada quatro atendimentos passa de 30 minutos', subtitle: 'Tempo de atendimento, minutos (25 atendimentos por unidade)', suffix: ' min', orientation: 'h', points: true, sortBy: 'median', mean: false }
    },
    {
      id: 'strip-notas', cat: 'distribuicao', type: 'strip', name: 'Pontos por grupo (enxame)',
      desc: 'Todos os pontos, sem sobreposição, com a mediana marcada. Honesto e fácil de explicar.',
      tags: ['notas', 'turmas', 'beeswarm', 'enxame', 'escola'],
      data: (g) => {
        const t = ['Turma A', 'Turma B', 'Turma C', 'Turma D'];
        const cols = t.map((_, i) => g.normals(300 + i, 32, [6.8, 7.4, 5.9, 7.1][i], [1.2, 0.8, 1.6, 1.0][i], 1).map((v) => Math.max(0, Math.min(10, v))));
        return { columns: t, rows: Array.from({ length: 32 }, (_, r) => cols.map((c) => c[r])) };
      },
      settings: { title: 'A Turma C tem a menor mediana e a maior dispersão de notas', subtitle: 'Nota final de cada aluno (0 a 10); traço = mediana', orientation: 'h', swarm: true, decimals: 1, highlight: ['Turma C'] }
    },
    {
      id: 'violino-bimodal', cat: 'distribuicao', type: 'violin', name: 'Violino (revela dois picos)',
      desc: 'Quando a distribuição tem dois "morros", o boxplot esconde. O violino mostra.',
      tags: ['bimodal', 'densidade', 'turno', 'violino'],
      data: (g) => {
        const a = g.normals(401, 120, 42, 5, 1);
        const b = g.normals(402, 60, 36, 4, 1).concat(g.normals(403, 60, 55, 4, 1));
        const c = g.normals(404, 120, 45, 7, 1);
        return { columns: ['Turno manhã', 'Turno noite', 'Turno tarde'], rows: Array.from({ length: 120 }, (_, r) => [a[r], b[r], c[r]]) };
      },
      settings: { title: 'O turno da noite tem dois picos: dois jeitos diferentes de operar', subtitle: 'Tempo de ciclo por turno, segundos', suffix: ' s', highlight: ['Turno noite'] }
    },
    {
      id: 'ecdf-transportadoras', cat: 'distribuicao', type: 'ecdf', name: 'Distribuição acumulada (percentis)',
      desc: 'Responde "que % fica abaixo de X?" — ideal para SLAs e prazos.',
      tags: ['sla', 'percentil', 'prazo', 'transportadora', 'acumulada'],
      data: (g) => {
        const a = g.lognormals(501, 150, 0.9, 0.35, 1), b = g.lognormals(502, 150, 1.1, 0.5, 1), c = g.lognormals(503, 150, 1.0, 0.25, 1);
        return { columns: ['Transportadora A', 'Transportadora B', 'Transportadora C'], rows: Array.from({ length: 150 }, (_, r) => [a[r], b[r], c[r]]) };
      },
      settings: { title: 'Com a C, 90% das entregas chegam em até 4 dias; com a B, só 70%', subtitle: '% acumulado de entregas por prazo, dias', suffix: ' d', xName: 'Dias até a entrega', labels: 'smart', annotations: { refs: [{ axis: 'val', v: 90, label: '' }] } }
    },
    {
      id: 'piramide-etaria', cat: 'distribuicao', type: 'pyramid', name: 'Pirâmide etária',
      desc: 'Duas distribuições espelhadas por faixa. Clássico para população, clientes, colaboradores.',
      tags: ['população', 'idade', 'sexo', 'pirâmide'],
      data: { columns: ['Faixa etária', 'Homens', 'Mulheres'], rows: [['0–9', 6.1, 5.9], ['10–19', 6.8, 6.6], ['20–29', 7.9, 7.8], ['30–39', 8.2, 8.4], ['40–49', 7.2, 7.6], ['50–59', 6.0, 6.6], ['60–69', 4.3, 5.1], ['70–79', 2.3, 3.0], ['80+', 0.9, 1.6]] },
      settings: { title: 'A base estreitou: há menos crianças do que adultos de 30 a 39 anos', subtitle: 'População por faixa etária e sexo, milhões', decimals: 1, suffix: ' mi', labels: 'none' }
    },
    {
      id: 'intervalo-faixas-salariais', cat: 'distribuicao', type: 'range', name: 'Faixas mín–máx com média',
      desc: 'Amplitude por categoria (faixas salariais, preços praticados) com a média marcada.',
      tags: ['faixa', 'mínimo', 'máximo', 'salário', 'amplitude'],
      data: { columns: ['Cargo', 'Mínimo', 'Máximo', 'Média'], rows: [['Estágio', 1800, 2400, 2100], ['Assistente', 2600, 4200, 3300], ['Analista júnior', 4200, 6500, 5100], ['Analista pleno', 6200, 9500, 7600], ['Analista sênior', 8800, 13500, 10900], ['Coordenação', 11500, 17000, 13800], ['Gerência', 16000, 26000, 20500]] },
      settings: { title: 'As faixas se sobrepõem a partir de analista pleno', subtitle: 'Faixa salarial mensal por cargo, R$ — ponto = média praticada', prefix: 'R$ ', compact: true, orientation: 'h', labels: 'none' }
    },
    {
      id: 'intervalo-temperatura', cat: 'distribuicao', type: 'range', name: 'Mínima e máxima por mês',
      desc: 'Variação dentro de cada período, em colunas verticais.',
      tags: ['temperatura', 'clima', 'mínima', 'máxima'],
      data: { columns: ['Mês', 'Mínima', 'Máxima', 'Média'], rows: M.map((m, i) => [m, [19, 19, 18, 16, 13, 12, 11, 12, 14, 16, 17, 18][i], [28, 29, 28, 26, 24, 23, 23, 25, 25, 26, 27, 28][i], [23, 24, 23, 21, 18, 17, 17, 18, 19, 21, 22, 23][i]]) },
      settings: { title: 'Julho tem a maior amplitude térmica do ano: 12 °C entre mínima e máxima', subtitle: 'Temperaturas médias por mês, °C', orientation: 'v', suffix: ' °C', labels: 'none' }
    }
  );

  // =========================================================== RELAÇÃO
  P.add(
    {
      id: 'dispersao-tendencia', cat: 'relacao', type: 'scatter', name: 'Dispersão com tendência (R²)',
      desc: 'Uma medida explica a outra? A linha de regressão e o R² respondem quanto.',
      tags: ['correlação', 'regressão', 'mídia', 'vendas', 'r2'],
      data: (g) => { const r = g.rng(9); return { columns: ['Investimento em mídia (R$ mil)', 'Vendas (R$ mil)', 'Campanha'], rows: Array.from({ length: 36 }, (_, i) => { const x = Math.round(20 + r() * 180); return [x, Math.round(60 + x * 4.2 + (r() - 0.5) * 260), 'C' + (i + 1)]; }) }; },
      settings: { title: 'Cada R$ 1 mil em mídia trouxe cerca de R$ 4 mil em vendas', subtitle: 'Investimento e vendas de 36 campanhas', trend: true, labelCol: '', prefix: 'R$ ', suffix: ' mil', labels: 'none' }
    },
    {
      id: 'bolhas-municipios', cat: 'relacao', type: 'scatter', name: 'Bolhas com 3 grupos',
      desc: 'Três medidas: X, Y e o tamanho. Cor para até 3 grupos (acima disso, as cores se confundem).',
      tags: ['bolhas', 'renda', 'escolaridade', 'municípios'],
      data: (g) => {
        const r = g.rng(15);
        const groups = [['Capital', 3200, 11.5, 900], ['Região metropolitana', 2100, 9.6, 250], ['Interior', 1500, 8.2, 60]];
        const rows = [];
        groups.forEach(([gname, inc, esc, pop], gi) => { for (let i = 0; i < (gi === 0 ? 8 : 14); i++) rows.push([Math.round(inc * (0.75 + r() * 0.5)), +(esc * (0.88 + r() * 0.24)).toFixed(1), Math.round(pop * (0.4 + r() * 1.4)), gname, gname === 'Capital' ? ['Porto Alegre', 'Curitiba', 'Recife', 'Salvador', 'Belém', 'Goiânia', 'Natal', 'Vitória'][i] : '']); });
        return { columns: ['Renda média (R$)', 'Anos de estudo', 'População (mil)', 'Tipo', 'Município'], rows };
      },
      settings: { title: 'Nas capitais, renda e escolaridade andam juntas e acima do interior', subtitle: 'Renda domiciliar per capita × anos médios de estudo; tamanho = população', sizeCol: '2', groupCol: '3', labelCol: '4', labels: 'smart' }
    },
    {
      id: 'quadrante-esforco-impacto', cat: 'relacao', type: 'scatter', name: 'Matriz esforço × impacto',
      desc: 'Priorização em quadrantes nomeados. Cada ponto é uma iniciativa, com rótulo.',
      tags: ['priorização', 'quadrantes', 'esforço', 'impacto', 'matriz'],
      data: { columns: ['Esforço (1–10)', 'Impacto (1–10)', 'Iniciativa'], rows: [[2, 8, 'Checkout em 1 clique'], [3, 7, 'Lembrete de carrinho'], [7, 9, 'Novo app'], [8, 8, 'Programa de pontos'], [2, 3, 'Trocar ícones'], [4, 2, 'Página de imprensa'], [8, 3, 'Migrar CMS'], [6, 4, 'Chat 24h'], [3, 6, 'Frete grátis acima de R$ 150'], [9, 6, 'Marketplace']] },
      settings: { title: 'Três ganhos rápidos: alto impacto com pouco esforço', subtitle: 'Iniciativas avaliadas pelo time de produto (1 a 10)', labelCol: '2', quad: 'custom', qx: 5, qy: 5, q1: 'Grandes apostas', q2: 'Ganhos rápidos', q3: 'Tarefas menores', q4: 'Evitar', labels: 'all', highlight: ['Checkout em 1 clique', 'Lembrete de carrinho', 'Frete grátis acima de R$ 150'], yMin: 0, yMax: 10 }
    },
    {
      id: 'matriz-bcg', cat: 'relacao', type: 'scatter', name: 'Matriz de portfólio (BCG)',
      desc: 'Crescimento × participação, bolhas pela receita, quadrantes nomeados.',
      tags: ['bcg', 'portfólio', 'estratégia', 'quadrantes'],
      data: { columns: ['Participação relativa', 'Crescimento do mercado (%)', 'Receita (R$ mi)', 'Produto'], rows: [[1.8, 14, 120, 'Linha Premium'], [0.4, 18, 30, 'Orgânicos'], [2.4, 3, 210, 'Básicos'], [0.3, 2, 18, 'Enlatados'], [1.2, 9, 80, 'Congelados'], [0.7, 12, 42, 'Snacks'], [0.5, 4, 25, 'Temperos']] },
      settings: { title: 'Básicos financiam a casa; Orgânicos é a aposta a acelerar', subtitle: 'Participação relativa × crescimento do mercado; bolha = receita', sizeCol: '2', labelCol: '3', quad: 'custom', qx: 1, qy: 8, q1: 'Estrelas', q2: 'Interrogações', q3: 'Abacaxis', q4: 'Vacas leiteiras', labels: 'all', suffix: '' }
    },
    {
      id: 'matriz-correlacao', cat: 'relacao', type: 'heatmap', name: 'Matriz de correlação',
      desc: 'Correlação entre muitas variáveis de uma vez. Divergente centrado no zero.',
      tags: ['correlação', 'matriz', 'variáveis', 'estatística'],
      data: () => {
        const v = ['Preço', 'Desconto', 'Visitas', 'Avaliação', 'Frete', 'Vendas'];
        const m = [[1, -0.42, -0.18, 0.21, 0.35, -0.51], [-0.42, 1, 0.33, 0.05, -0.12, 0.62], [-0.18, 0.33, 1, 0.27, -0.08, 0.74], [0.21, 0.05, 0.27, 1, -0.02, 0.38], [0.35, -0.12, -0.08, -0.02, 1, -0.44], [-0.51, 0.62, 0.74, 0.38, -0.44, 1]];
        return { columns: ['Variável'].concat(v), rows: v.map((x, i) => [x].concat(m[i])) };
      },
      settings: { title: 'Visitas e desconto são os fatores mais ligados às vendas', subtitle: 'Correlação de Pearson entre variáveis de 180 produtos (−1 a 1)', scale: 'div', pair: 'orange-blue', center: 0, decimals: 2, labels: 'all' }
    },
    {
      id: 'paralelas-carros', cat: 'relacao', type: 'parallel', name: 'Coordenadas paralelas',
      desc: 'Muitos atributos de muitos itens: trade-offs. Destaque 1–3 itens da história.',
      tags: ['atributos', 'trade-off', 'carros', 'perfil', 'multidimensional'],
      data: { columns: ['Modelo', 'Preço (R$ mil)', 'Consumo (km/l ou equiv.)', 'Potência (cv)', 'Porta-malas (l)', 'Nota'], rows: [['Hatch A', 89, 13.8, 110, 300, 7.6], ['Hatch B', 95, 13.1, 128, 285, 8.1], ['Sedã C', 132, 12.2, 150, 480, 8.4], ['Sedã D', 118, 12.9, 116, 470, 7.9], ['SUV E', 158, 10.4, 165, 420, 8.6], ['SUV F', 145, 11.2, 150, 390, 8.0], ['Elétrico G', 198, 28, 204, 350, 9.1], ['Picape H', 172, 9.1, 180, 900, 7.7]] },
      settings: { title: 'O Sedã C equilibra preço, espaço e nota melhor que os SUVs', subtitle: 'Atributos de 8 modelos avaliados', highlight: ['Sedã C'] }
    },
    {
      id: 'dispersao-log', cat: 'relacao', type: 'scatter', name: 'Dispersão em escala log',
      desc: 'Dados que se espalham por ordens de grandeza (população, receita, seguidores).',
      tags: ['log', 'escala logarítmica', 'ordens de grandeza'],
      data: (g) => { const r = g.rng(33); return { columns: ['População', 'PIB (R$ mi)', 'Município'], rows: Array.from({ length: 60 }, () => { const p = Math.round(Math.pow(10, 3.5 + r() * 3.3)); return [p, Math.round(p * (0.02 + r() * 0.03) * Math.pow(p / 1e5, 0.12)), '']; }) }; },
      settings: { title: 'O PIB cresce quase na mesma proporção que a população', subtitle: 'População e PIB de 60 municípios, escala logarítmica nos dois eixos', logX: true, logY: true, trend: true, compact: true, labels: 'none' }
    },
    {
      id: 'dispersao-segmentos', cat: 'relacao', type: 'scatter', name: 'Dispersão por segmento',
      desc: 'Até 3 segmentos de clientes em cores distintas para ver onde cada um se concentra.',
      tags: ['clientes', 'segmentos', 'frequência', 'ticket'],
      data: (g) => {
        const r = g.rng(71), rows = [];
        [['Premium', 12, 380], ['Regular', 6, 160], ['Ocasional', 2, 120]].forEach(([s, f, t]) => { for (let i = 0; i < 30; i++) rows.push([+(f * (0.6 + r() * 0.8)).toFixed(1), Math.round(t * (0.7 + r() * 0.6)), s]); });
        return { columns: ['Compras por ano', 'Ticket médio (R$)', 'Segmento'], rows };
      },
      settings: { title: 'Clientes premium compram mais vezes e gastam mais por compra', subtitle: 'Frequência × ticket médio de 90 clientes', groupCol: '2', prefix: 'R$ ', labels: 'none' }
    }
  );

  // =========================================================== FLUXOS
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

  // =========================================================== HIERARQUIA
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
