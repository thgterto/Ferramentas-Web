/**
 * Graficário — registro da biblioteca de modelos (presets).
 *
 * Cada modelo é uma SITUAÇÃO, não só um tipo de gráfico: traz dados de exemplo
 * realistas, um título que já é a conclusão (não o assunto), subtítulo com
 * contexto e unidade, e ajustes de destaque/anotação que contam a história.
 */
(function (GG) {
  'use strict';
  const CATS = [
    { id: 'comparar', name: 'Comparar categorias', icon: '▥', desc: 'Quem é maior? Quanto maior?' },
    { id: 'ranking', name: 'Ranking e posição', icon: '⇅', desc: 'Quem subiu, quem caiu' },
    { id: 'tempo', name: 'Evolução no tempo', icon: '⟋', desc: 'Tendência, sazonalidade, ritmo' },
    { id: 'composicao', name: 'Parte do todo', icon: '◔', desc: 'Participação e composição' },
    { id: 'desvio', name: 'Metas e desvios', icon: '±', desc: 'Acima/abaixo, realizado × meta' },
    { id: 'distribuicao', name: 'Distribuição', icon: '▁▃▇', desc: 'Forma, dispersão, atípicos' },
    { id: 'relacao', name: 'Relação e correlação', icon: '⁘', desc: 'Uma medida explica a outra?' },
    { id: 'fluxo', name: 'Fluxos e processos', icon: '⇉', desc: 'De onde vem, para onde vai' },
    { id: 'hierarquia', name: 'Hierarquia', icon: '▦', desc: 'Níveis, árvores, estruturas' },
    { id: 'kpi', name: 'Indicadores e KPIs', icon: '#', desc: 'Quando o número é o gráfico' },
    { id: 'qualidade', name: 'Qualidade e CEP', icon: '⌇', desc: 'Controle de processo, Pareto, capabilidade' },
    { id: 'financas', name: 'Finanças', icon: 'R$', desc: 'DRE, caixa, ativos' },
    { id: 'projetos', name: 'Projetos e agenda', icon: '▭', desc: 'Cronogramas, sprints, marcos' },
    { id: 'pesquisa', name: 'Pesquisas e opinião', icon: '❝', desc: 'Likert, NPS, intenção de voto' },
    { id: 'geo', name: 'Geografia', icon: '⌖', desc: 'Estados e regiões' },
    { id: 'historia', name: 'Técnicas de storytelling', icon: '✎', desc: 'Antes → depois de uma boa decisão' }
  ];
  const list = [];
  const byId = {};
  GG.presets = {
    CATS, list, byId,
    add(...ps) {
      ps.forEach((p) => {
        if (!p.settings) p.settings = {};
        if (p.settings.source === undefined) p.settings.source = 'dados fictícios para demonstração';
        list.push(p); byId[p.id] = p;
      });
    },
    /** Dados concretos de um modelo (gera se for função). */
    dataOf(p) {
      const d = typeof p.data === 'function' ? p.data(GG.gen) : p.data;
      return { columns: d.columns.slice(), rows: d.rows.map((r) => r.slice()) };
    }
  };
})(window.GG = window.GG || {});
