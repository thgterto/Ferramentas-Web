/**
 * Graficário — modelos: Relação.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

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
})(window.GG = window.GG || {});
