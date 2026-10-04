/**
 * Graficário — biblioteca compartilhada dos construtores: utilidades de parte do todo, hierarquia e fluxo (rótulo-valor, árvore, fluxos).
 */
(function (GG) {
  'use strict';
  const B = GG.builders;
  const N = (v) => GG.data.toNum(v);

  /** kv: rótulo + valor, mantendo o índice original (a cor segue a entidade). */
  function kv(ctx) {
    return ctx.data.rows.map((r, i) => ({ name: String(r[0] == null ? '' : r[0]), value: N(r[1]), idx: i })).filter((x) => x.value !== null);
  }
  /** Colunas de níveis + valor (última coluna numérica) → árvore. */
  function toTree(ctx) {
    const t = ctx.data;
    const lastIsNum = t.rows.length && t.rows.every((r) => r[r.length - 1] === '' || N(r[r.length - 1]) !== null);
    const nl = lastIsNum ? t.columns.length - 1 : t.columns.length;
    const root = { name: 'Total', children: [] };
    t.rows.forEach((r) => {
      let node = root;
      for (let l = 0; l < nl; l++) {
        const nm = r[l];
        if (nm === '' || nm === null || nm === undefined) break;
        let ch = node.children.find((c) => c.name === String(nm));
        if (!ch) { ch = { name: String(nm), children: [] }; node.children.push(ch); }
        node = ch;
      }
      if (lastIsNum) node.value = (node.value || 0) + (N(r[r.length - 1]) || 0);
    });
    const fin = (n) => {
      if (!n.children.length) { delete n.children; return n.value || 0; }
      const s = n.children.reduce((a, c) => a + fin(c), 0);
      if (lastIsNum) n.value = s;
      return s;
    };
    fin(root);
    return { root, valued: lastIsNum, levels: nl };
  }
  function flows(ctx) {
    const t = ctx.data;
    const links = t.rows.map((r) => ({ source: String(r[0] || ''), target: String(r[1] || ''), value: N(r[2]) })).filter((l) => l.source && l.target && l.value !== null && l.value > 0 && l.source !== l.target);
    const names = [];
    links.forEach((l) => { [l.source, l.target].forEach((n) => { if (names.indexOf(n) < 0) names.push(n); }); });
    return { links, names };
  }

  Object.assign(B.lib, { kv, toTree, flows });
  B.helpers = { kv, toTree, flows }; // compatibilidade
})(window.GG = window.GG || {});
