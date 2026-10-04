/**
 * Graficário — modelos: Tempo.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;
  const M = GG.gen.monthNames;

  P.add(
    {
      id: 'linha-receita-recorrente', cat: 'tempo', type: 'line', name: 'Linha única com anotação',
      desc: 'Tendência de uma série. Rotule só o fim e o pico; use notas para explicar eventos.',
      tags: ['receita', 'mrr', 'crescimento', 'anotação'],
      data: (g) => ({ columns: ['Mês', 'MRR (R$ mil)'], rows: g.zip(g.months(24, 2024, 0), g.walk(7, 24, 210, 9.5, 6, null, 0)) }),
      settings: { title: 'A receita recorrente dobrou em dois anos', subtitle: 'MRR mensal, R$ mil', prefix: 'R$ ', suffix: ' mil', labels: 'smart', area: 'area', annotations: { notes: [{ x: 'mar/25', text: 'Plano anual lançado' }] } }
    },
    {
      id: 'linhas-uma-em-foco', cat: 'tempo', type: 'line', name: 'Várias linhas, uma em foco',
      desc: 'A cura do espaguete: a série da história em cor, as demais em cinza como contexto.',
      tags: ['regiões', 'ênfase', 'destaque', 'espaguete'],
      data: (g) => ({ columns: ['Mês', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'], rows: g.zip(M, g.walk(3, 12, 96, -0.6, 2.5, null, 0), g.walk(5, 12, 92, 2.8, 1.4, null, 0), g.walk(8, 12, 101, 0.2, 2.8, null, 0), g.walk(11, 12, 104, -0.3, 2.2, null, 0), g.walk(13, 12, 99, 0.4, 2.6, null, 0)) }),
      settings: { title: 'Só o Nordeste cresceu mês após mês em 2025', subtitle: 'Índice de vendas (jan = 100)', highlight: ['Nordeste'], labels: 'smart' }
    },
    {
      id: 'areas-empilhadas-canais', cat: 'tempo', type: 'line', name: 'Áreas empilhadas',
      desc: 'Total ao longo do tempo e como ele se divide. Leia bem só a base e o total.',
      tags: ['canais', 'digital', 'empilhado', 'área'],
      data: { columns: ['Ano', 'Lojas físicas', 'E-commerce', 'Aplicativo'], rows: [['2019', 820, 140, 20], ['2020', 610, 390, 90], ['2021', 700, 430, 160], ['2022', 720, 450, 240], ['2023', 710, 470, 330], ['2024', 690, 500, 420], ['2025', 680, 520, 510]] },
      settings: { title: 'Desde 2023 os canais digitais vendem mais que as lojas físicas', subtitle: 'Faturamento por canal, R$ milhões', area: 'stacked', prefix: 'R$ ', suffix: ' mi', labels: 'none' }
    },
    {
      id: 'areas-100-matriz', cat: 'tempo', type: 'line', name: 'Áreas 100% (mix no tempo)',
      desc: 'Como a composição muda ao longo do tempo, quando o total não importa.',
      tags: ['energia', 'matriz', 'participação', 'renováveis'],
      data: { columns: ['Ano', 'Hidráulica', 'Eólica', 'Solar', 'Térmica', 'Outras'], rows: [['2015', 64, 4, 0, 28, 4], ['2016', 66, 5, 0, 25, 4], ['2017', 63, 7, 0, 26, 4], ['2018', 65, 8, 1, 22, 4], ['2019', 64, 9, 1, 22, 4], ['2020', 64, 10, 2, 20, 4], ['2021', 56, 11, 3, 26, 4], ['2022', 62, 12, 5, 17, 4], ['2023', 60, 13, 8, 15, 4], ['2024', 56, 14, 11, 15, 4], ['2025', 54, 15, 14, 13, 4]] },
      settings: { title: 'Eólica e solar foram de 4% para 29% da geração em dez anos', subtitle: 'Participação de cada fonte na geração de eletricidade', area: 'percent', labels: 'none' }
    },
    {
      id: 'linhas-indexadas', cat: 'tempo', type: 'line', name: 'Séries indexadas (base 100)',
      desc: 'Escalas diferentes? Não use dois eixos Y: indexe tudo a 100 no início e compare crescimentos.',
      tags: ['índice', 'base 100', 'eixo duplo', 'comparar crescimento'],
      data: (g) => ({ columns: ['Mês', 'Usuários', 'Receita (R$ mil)', 'Chamados'], rows: g.zip(g.months(18, 2024, 0), g.walk(21, 18, 12000, 520, 260, null, 0), g.walk(22, 18, 480, 12, 9, null, 0), g.walk(23, 18, 3100, 30, 90, null, 0)) }),
      settings: { title: 'Usuários cresceram mais rápido que a receita; chamados ficaram estáveis', subtitle: 'Índice, janeiro de 2024 = 100', index100: true, labels: 'smart' }
    },
    {
      id: 'media-movel-diaria', cat: 'tempo', type: 'line', name: 'Média móvel sobre dados ruidosos',
      desc: 'Dados diários oscilam demais. A média móvel revela a tendência; os dados brutos ficam claros ao fundo.',
      tags: ['diário', 'média móvel', 'ruído', 'tendência'],
      data: (g) => ({ columns: ['Dia', 'Pedidos'], rows: g.zip(g.days(150, '2025-03-01').map((d) => d.slice(8, 10) + '/' + d.slice(5, 7)), g.walk(31, 150, 420, -0.9, 10, { amp: 45, period: 7 }, 0)) }),
      settings: { title: 'Por trás do sobe-e-desce diário, os pedidos caíram 30% no período', subtitle: 'Pedidos por dia e média móvel de 7 dias', ma: 7, labels: 'smart' }
    },
    {
      id: 'linha-meta-evento', cat: 'tempo', type: 'line', name: 'Linha com meta e período marcado',
      desc: 'Uma referência (meta) e uma faixa sombreada para o período que explica a mudança.',
      tags: ['meta', 'campanha', 'faixa', 'evento'],
      data: { columns: ['Semana', 'Conversão (%)'], rows: [['S1', 2.1], ['S2', 2.2], ['S3', 2.0], ['S4', 2.3], ['S5', 2.2], ['S6', 2.9], ['S7', 3.4], ['S8', 3.6], ['S9', 3.1], ['S10', 2.8], ['S11', 2.9], ['S12', 3.0]] },
      settings: { title: 'A campanha de TV levou a conversão acima da meta — e parte do ganho ficou', subtitle: 'Taxa de conversão semanal do site, %', suffix: '%', decimals: 1, labels: 'smart', annotations: { refs: [{ axis: 'val', v: 3, label: 'Meta' }], bands: [{ from: 'S6', to: 'S8', label: 'Campanha de TV' }] } }
    },
    {
      id: 'degraus-taxa', cat: 'tempo', type: 'line', name: 'Linha em degraus',
      desc: 'Valores que mudam em saltos e ficam parados (taxas, preços tabelados, tarifas).',
      tags: ['juros', 'selic', 'tarifa', 'degrau'],
      data: { columns: ['Reunião', 'Taxa básica (% a.a.)'], rows: [['jan/24', 11.75], ['mar/24', 10.75], ['mai/24', 10.5], ['jun/24', 10.5], ['jul/24', 10.5], ['set/24', 10.75], ['nov/24', 11.25], ['dez/24', 12.25], ['jan/25', 13.25], ['mar/25', 14.25], ['mai/25', 14.75], ['jun/25', 15.0], ['jul/25', 15.0], ['set/25', 15.0]] },
      settings: { title: 'Depois de cortes em 2024, a taxa voltou a subir e parou em 15%', subtitle: 'Taxa básica de juros definida em cada reunião, % ao ano', step: true, suffix: '%', decimals: 2, labels: 'smart', markers: 'all' }
    },
    {
      id: 'previsao-demanda', cat: 'tempo', type: 'forecast', name: 'Previsão com faixa de incerteza',
      desc: 'Realizado, projeção tracejada e o intervalo de confiança: honestidade sobre o futuro.',
      tags: ['previsão', 'forecast', 'intervalo', 'demanda'],
      data: () => {
        const m = GG.gen.months(24, 2024, 0);
        const real = [820, 845, 870, 860, 905, 930, 950, 940, 985, 1010, 1060, 1120, 1005, 1030, 1070, 1080, 1110, 1150];
        const rows = m.map((x, i) => {
          if (i < 17) return [x, real[i], '', '', ''];
          const k = i - 17, base = 1150 + k * 22;
          return [x, i === 17 ? real[i] : '', base, base - 18 - k * 14, base + 18 + k * 14];
        });
        return { columns: ['Mês', 'Real', 'Previsão', 'Limite inferior', 'Limite superior'], rows };
      },
      settings: { title: 'A demanda deve passar de 1.250 unidades até dezembro — com margem de ±8%', subtitle: 'Unidades vendidas por mês; faixa = intervalo de 80%', labels: 'smart', todayLabel: 'Hoje' }
    },
    {
      id: 'multiplos-regioes', cat: 'tempo', type: 'multiples', name: 'Pequenos múltiplos',
      desc: 'Uma série por painel, mesma escala, as outras em cinza ao fundo. Nada de legenda para decifrar.',
      tags: ['small multiples', 'painéis', 'regiões', 'espaguete'],
      data: (g) => ({ columns: ['Mês', 'Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Exterior'], rows: g.zip(M, g.walk(41, 12, 60, -2.2, 2, null, 0), g.walk(42, 12, 72, 1.1, 2.5, null, 0), g.walk(43, 12, 55, 0.9, 2, null, 0), g.walk(44, 12, 110, 1.6, 3, null, 0), g.walk(45, 12, 84, 0.8, 2.2, null, 0), g.walk(46, 12, 30, 1.4, 1.8, null, 0)) }),
      settings: { title: 'O Norte é a única região em queda desde março', subtitle: 'Vendas mensais por região, R$ milhões', kind: 'line', ghost: true, sharedY: true, highlight: ['Norte'], labels: 'smart' }
    },
    {
      id: 'calendario-vendas', cat: 'tempo', type: 'calendar', name: 'Calendário diário',
      desc: 'Ritmo semanal e sazonalidade num ano inteiro, dia a dia.',
      tags: ['calendário', 'diário', 'sazonalidade', 'dias da semana'],
      data: (g) => {
        const r = g.rng(77);
        const days = g.days(365, '2025-01-01');
        return { columns: ['Data', 'Vendas'], rows: days.map((d) => { const dt = GG.data.toDate(d); const wd = dt.getDay(); const m = dt.getMonth(); const base = 120 + (wd === 6 ? 90 : wd === 5 ? 50 : wd === 0 ? -40 : 0) + (m === 11 ? 80 : m === 10 ? 40 : 0); return [d, Math.round(base * (0.8 + r() * 0.4))]; }) };
      },
      settings: { title: 'Sábados vendem o dobro dos domingos — e dezembro é outro patamar', subtitle: 'Vendas por dia em 2025', hue: 'blue' }
    },
    {
      id: 'heatmap-dia-hora', cat: 'tempo', type: 'heatmap', name: 'Mapa de calor dia × hora',
      desc: 'Quando as coisas acontecem: dia da semana nas linhas, hora nas colunas.',
      tags: ['horário', 'semana', 'suporte', 'padrão'],
      data: (g) => {
        const r = g.rng(5);
        const hours = Array.from({ length: 12 }, (_, i) => (8 + i) + 'h');
        const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        return { columns: ['Dia'].concat(hours), rows: days.map((d, di) => [d].concat(hours.map((_, hi) => Math.round((di < 5 ? 40 : 12) * (hi < 4 ? 1.6 - hi * 0.12 : hi === 5 ? 0.7 : 1) * (di === 0 ? 1.7 : 1) * (0.8 + r() * 0.4))))) };
      },
      settings: { title: 'Segunda de manhã concentra o maior volume de chamados', subtitle: 'Chamados abertos por dia e hora (média de 8 semanas)', scale: 'seq', hue: 'blue', labels: 'smart', xTop: true }
    },
    {
      id: 'listras-temperatura', cat: 'tempo', type: 'stripes', name: 'Listras de anomalia',
      desc: 'Cada ano uma listra, azul abaixo da média e vermelho acima. Impacto imediato.',
      tags: ['clima', 'temperatura', 'anomalia', 'warming stripes'],
      data: (g) => { const r = g.rng(3); return { columns: ['Ano', 'Anomalia (°C)'], rows: g.years(1961, 2025).map((y, i) => [y, +(-0.45 + i * 0.019 + (r() - 0.5) * 0.35).toFixed(2)]) }; },
      settings: { title: 'Desde 2000, nenhum ano ficou abaixo da média', subtitle: 'Anomalia da temperatura média anual em relação a 1961–1990, °C', pair: 'blue-red', center: 0, suffix: ' °C', decimals: 2 }
    },
    {
      id: 'sazonalidade-anos', cat: 'tempo', type: 'line', name: 'Sazonalidade: anos sobrepostos',
      desc: 'Meses no eixo X e um ano por linha: compare o mesmo mês entre anos. Destaque o ano atual.',
      tags: ['sazonalidade', 'ano a ano', 'meses', 'yoy'],
      data: (g) => ({ columns: ['Mês', '2022', '2023', '2024', '2025'], rows: g.zip(M, g.walk(61, 12, 80, 1, 3, { amp: 14, period: 12, phase: 3 }, 0), g.walk(62, 12, 86, 1, 3, { amp: 14, period: 12, phase: 3 }, 0), g.walk(63, 12, 90, 1.1, 3, { amp: 15, period: 12, phase: 3 }, 0), g.walk(64, 12, 101, 1.2, 3, { amp: 16, period: 12, phase: 3 }, 0)) }),
      settings: { title: '2025 superou os anos anteriores em todos os meses', subtitle: 'Faturamento mensal, R$ milhões', highlight: ['2025'], labels: 'smart' }
    },
    {
      id: 'coorte-retencao', cat: 'tempo', type: 'heatmap', name: 'Retenção por coorte',
      desc: 'Cada linha é um grupo de entrada; cada coluna, meses depois. Leia a diagonal e as linhas.',
      tags: ['coorte', 'retenção', 'saas', 'churn', 'cohort'],
      data: () => {
        const cohorts = GG.gen.months(8, 2025, 0);
        const cols = ['Coorte'].concat(Array.from({ length: 8 }, (_, i) => 'M' + i));
        const rows = cohorts.map((c, i) => [c].concat(Array.from({ length: 8 }, (_, k) => (k < 8 - i ? Math.round(100 * Math.pow(0.8 + i * 0.012, Math.sqrt(k) * 1.4) * (k === 0 ? 1 : 1)) : ''))));
        return { columns: cols, rows };
      },
      settings: { title: 'Coortes mais recentes retêm mais: o onboarding novo está funcionando', subtitle: 'Clientes ativos (%) por mês desde a entrada', scale: 'seq', hue: 'blue', suffix: '%', decimals: 0, labels: 'all', xTop: true }
    },
    {
      id: 'area-usuarios', cat: 'tempo', type: 'line', name: 'Área suave (uma série)',
      desc: 'Uma única série de volume: a área leve reforça a magnitude sem pesar.',
      tags: ['usuários', 'área', 'volume', 'crescimento'],
      data: (g) => ({ columns: ['Semana', 'Usuários ativos'], rows: g.zip(g.weeks(26, 'S'), g.walk(88, 26, 18200, 420, 520, null, 0)) }),
      settings: { title: 'Usuários ativos semanais cresceram 60% no semestre', subtitle: 'Usuários únicos por semana', area: 'area', compact: true, labels: 'smart' }
    }
  );
})(window.GG = window.GG || {});
