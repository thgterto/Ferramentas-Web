/**
 * Graficário — modelos: Técnicas de storytelling.
 */
(function (GG) {
  'use strict';
  const P = GG.presets;
  const M = GG.gen.monthNames;

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
