/**
 * Graficário — biblioteca compartilhada dos construtores: unidades a partir do nome da coluna ("Receita (R$)").
 */
(function (GG) {
  'use strict';
  const B = GG.builders;

  /** "Receita (R$)" → {label: 'Receita', f: {p: 'R$ '}}; "Churn (%)" → sufixo %. */
  function unitOf(name, base) {
    const m = String(name).match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const f = Object.assign({}, base);
    if (!m) return { label: String(name), f, pct: false };
    const u = m[2].trim();
    if (/^(R\$|US\$|U\$|€|£)$/.test(u)) f.p = u + ' ';
    else if (u === '%') f.s = '%';
    else if (/^p\.?p\.?$/i.test(u)) f.s = ' p.p.';
    else f.s = ' ' + u;
    return { label: m[1], f, pct: u === '%' };
  }

  Object.assign(B.lib, { unitOf });
})(window.GG = window.GG || {});
