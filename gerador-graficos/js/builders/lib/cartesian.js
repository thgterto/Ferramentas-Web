/**
 * Graficário — biblioteca compartilhada dos construtores: opções de ordenação/orientação e posição de rótulos dos gráficos cartesianos.
 */
(function (GG) {
  'use strict';
  const B = GG.builders;

  const SORT = { k: 'sort', l: 'Ordenar', t: 'select', o: [['none', 'Ordem dos dados'], ['desc', 'Maior → menor'], ['asc', 'Menor → maior']], d: 'none' };
  const ORIENT = (d) => ({ k: 'orientation', l: 'Orientação', t: 'seg', o: [['v', 'Colunas'], ['h', 'Barras']], d: d || 'v' });

  function labelPos(horiz, v) { return horiz ? (v < 0 ? 'left' : 'right') : (v < 0 ? 'bottom' : 'top'); }

  Object.assign(B.lib, { SORT, ORIENT, labelPos });
})(window.GG = window.GG || {});
