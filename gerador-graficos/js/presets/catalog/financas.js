/**
 * Graficário — modelos: Finanças.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;

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
})(window.GG = window.GG || {});
