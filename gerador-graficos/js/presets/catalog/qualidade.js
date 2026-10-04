/**
 * Graficário — modelos: Qualidade e cep.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

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
})(window.GG = window.GG || {});
