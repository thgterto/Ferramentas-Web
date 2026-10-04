/**
 * Graficário — manifesto de módulos.
 *
 * Única lista de arquivos da aplicação, em ordem de carregamento. O index.html
 * (e o verificador tools/check.js) carregam exatamente esta lista. Para criar um
 * módulo novo (tipo de gráfico, categoria de modelos, painel), crie o arquivo e
 * acrescente o caminho na seção certa.
 *
 * A ordem de `types` é a ordem em que os tipos aparecem no seletor; a ordem de
 * `presets` é a ordem dos modelos na biblioteca.
 */
(function (root) {
  'use strict';
  var M = {
    // Núcleo: sem dependências de interface.
    core: [
      'js/core/tokens.js',
      'js/core/runtime.js',
      'js/core/data.js'
    ],
    // Base dos construtores e utilidades compartilhadas entre tipos.
    builders: [
      'js/builders/base.js',
      'js/builders/lib/cartesian.js',
      'js/builders/lib/part.js',
      'js/builders/lib/scale.js',
      'js/builders/lib/units.js'
    ],
    // Um arquivo por tipo de gráfico: js/builders/types/<id>.js
    types: [
      'bar',
      'line',
      'lollipop',
      'dumbbell',
      'slope',
      'bump',
      'range',
      'forecast',
      'multiples',
      'pareto',
      'waterfall',
      'diverging',
      'bullet',
      'meter',
      'likert',
      'pyramid',
      'marimekko',
      'control',
      'candlestick',
      'timeline',
      'gantt',
      'pie',
      'waffle',
      'treemap',
      'sunburst',
      'tree',
      'sankey',
      'chord',
      'graph',
      'funnel',
      'histogram',
      'boxplot',
      'strip',
      'violin',
      'ecdf',
      'scatter',
      'heatmap',
      'calendar',
      'stripes',
      'parallel',
      'radar',
      'kpi',
      'hero',
      'gauge',
      'tilemap'
    ],
    // Registro de categorias + um arquivo de modelos por categoria: js/presets/catalog/<categoria>.js
    presets: [
      'js/presets/registry.js',
      'comparar',
      'ranking',
      'tempo',
      'composicao',
      'desvio',
      'distribuicao',
      'relacao',
      'fluxo',
      'hierarquia',
      'kpi',
      'qualidade',
      'financas',
      'projetos',
      'pesquisa',
      'geo',
      'historia'
    ],
    // Interface (depende do DOM). app.js por último: ele inicia a aplicação.
    app: [
      'js/app/lint.js',
      'js/app/export.js',
      'js/app/grid.js',
      'js/app/inspector.js',
      'js/app/app.js'
    ]
  };
  var types = M.types.map(function (id) { return 'js/builders/types/' + id + '.js'; });
  var presets = M.presets.map(function (p) { return p.indexOf('/') >= 0 ? p : 'js/presets/catalog/' + p + '.js'; });
  root.GG_MANIFEST = [].concat(M.core, M.builders, types, presets, M.app);
})(typeof window !== 'undefined' ? window : globalThis);
