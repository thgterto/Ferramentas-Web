/**
 * Graficário — modelos: Distribuição.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;
  const M = GG.gen.monthNames;

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
})(window.GG = window.GG || {});
