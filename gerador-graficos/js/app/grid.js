/**
 * Graficário — editor de dados em grade (estilo planilha).
 * Cole direto do Excel/Planilhas em qualquer célula; importe/exporte CSV; modo texto.
 */
(function (GG) {
  'use strict';
  const MAX_ROWS = 1500;
  const G = GG.grid = { textMode: false };

  function A() { return GG.app; }
  function data() { return A().state.data; }

  let pending = null;
  function commitSoon() {
    clearTimeout(pending);
    pending = setTimeout(() => A().setData(data(), { fromGrid: true }), 220);
  }

  function btn(label, title, fn, cls) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-sm ' + (cls || ''); b.textContent = label; if (title) b.title = title;
    b.addEventListener('click', fn);
    return b;
  }

  function roleFor(def, j) {
    const roles = def.roles || [];
    if (j < roles.length) return roles[j];
    const last = roles[roles.length - 1] || '';
    return /^…/.test(last) ? last.replace(/^…\s*/, '') : (def.shape === 'columns' ? 'Grupo' : 'Série');
  }

  G.render = function () {
    if (!GG.app || !GG.app.state) return;
    if (A().tab !== 'data') return;
    const body = document.getElementById('dockBody');
    const scrollTop = body.scrollTop, scrollLeft = body.scrollLeft;
    body.innerHTML = '';
    const root = document.createElement('div'); root.className = 'grid-root';
    root.appendChild(toolbar());
    if (G.textMode) root.appendChild(textEditor());
    else root.appendChild(table());
    body.appendChild(root);
    body.scrollTop = scrollTop; body.scrollLeft = scrollLeft;
  };

  function toolbar() {
    const t = document.createElement('div'); t.className = 'grid-tools';
    const d = data();
    t.append(
      btn('+ Linha', 'Adicionar linha no fim', () => { d.rows.push(d.columns.map(() => '')); A().setData(d); focusCell(d.rows.length - 1, 0); }),
      btn('+ Coluna', 'Adicionar coluna', () => { d.columns.push('Série ' + d.columns.length); d.rows.forEach((r) => r.push('')); A().setData(d); }),
      btn('Transpor', 'Trocar linhas por colunas', transpose),
      btn('Ordenar ↓', 'Ordenar linhas pela 2ª coluna, do maior para o menor', () => sortRows(-1)),
      btn(G.textMode ? 'Modo grade' : 'Modo texto', 'Editar os dados como texto (TSV/CSV)', () => { G.textMode = !G.textMode; G.render(); }),
      btn('Colar tabela…', 'Colar do Excel ou CSV substituindo os dados', () => { const m = document.getElementById('pasteModal'); document.getElementById('pasteArea').value = ''; m.showModal(); document.getElementById('pasteArea').focus(); }),
      btn('Importar arquivo…', 'CSV, TSV ou TXT', () => { const f = document.getElementById('fileInput'); f.dataset.mode = 'data'; f.click(); }),
      btn('Exportar CSV', '', () => GG.exporter.run('csv')),
      btn('Restaurar exemplo', 'Voltar aos dados do modelo', () => {
        const p = A().preset();
        if (!p || p.type !== A().state.type) { A().toast('Este gráfico não veio de um modelo com esse tipo.'); return; }
        A().setData(GG.presets.dataOf(p));
      }, 'btn-ghost')
    );
    const hint = document.createElement('span'); hint.className = 'hint';
    hint.textContent = G.textMode ? 'Uma linha por registro; colunas separadas por tabulação, ; ou ,' : 'Dica: cole do Excel em qualquer célula · Enter desce · a linha cinza mostra o papel de cada coluna';
    t.appendChild(hint);
    return t;
  }

  function isNumCol(d, j) {
    const vals = d.rows.map((r) => r[j]).filter((v) => v !== '' && v !== null && v !== undefined);
    return vals.length > 0 && vals.every((v) => GG.data.toNum(v) !== null);
  }

  function table() {
    const d = data();
    const def = A().def();
    const tb = document.createElement('table'); tb.className = 'datagrid';
    const thead = document.createElement('thead');
    const h1 = document.createElement('tr');
    const c0 = document.createElement('th'); c0.className = 'rownum'; c0.textContent = '#'; h1.appendChild(c0);
    d.columns.forEach((name, j) => {
      const th = document.createElement('th');
      const wrap = document.createElement('div'); wrap.className = 'col-actions';
      const inp = document.createElement('input'); inp.value = name; inp.dataset.h = j; inp.setAttribute('aria-label', 'Nome da coluna ' + (j + 1));
      const x = document.createElement('button'); x.className = 'col-x'; x.type = 'button'; x.textContent = '×'; x.title = 'Remover coluna'; x.dataset.delcol = j; x.setAttribute('aria-label', 'Remover coluna ' + name);
      wrap.append(inp, x); th.appendChild(wrap); h1.appendChild(th);
    });
    const h2 = document.createElement('tr'); h2.className = 'roles';
    const r0 = document.createElement('th'); r0.className = 'rownum'; h2.appendChild(r0);
    d.columns.forEach((_, j) => { const th = document.createElement('th'); th.textContent = roleFor(def, j); th.title = th.textContent; h2.appendChild(th); });
    thead.append(h1, h2);
    tb.appendChild(thead);
    const numCols = d.columns.map((_, j) => isNumCol(d, j));
    const tbody = document.createElement('tbody');
    const n = Math.min(d.rows.length, MAX_ROWS);
    for (let i = 0; i < n; i++) {
      const r = d.rows[i];
      const tr = document.createElement('tr');
      const rn = document.createElement('td'); rn.className = 'rownum';
      const x = document.createElement('button'); x.className = 'row-x'; x.type = 'button'; x.textContent = '×'; x.title = 'Remover linha'; x.dataset.delrow = i; x.setAttribute('aria-label', 'Remover linha ' + (i + 1));
      rn.append(x, document.createTextNode(String(i + 1)));
      tr.appendChild(rn);
      d.columns.forEach((_, j) => {
        const td = document.createElement('td'); if (numCols[j]) td.className = 'num';
        const inp = document.createElement('input');
        inp.value = GG.data.numText(r[j]);
        inp.dataset.r = i; inp.dataset.c = j;
        inp.setAttribute('aria-label', 'Linha ' + (i + 1) + ', ' + d.columns[j]);
        td.appendChild(inp); tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    tb.appendChild(tbody);
    const wrap = document.createElement('div');
    wrap.appendChild(tb);
    if (d.rows.length > MAX_ROWS) {
      const p = document.createElement('p'); p.style.cssText = 'margin:10px 12px;color:var(--muted);font-size:12px';
      p.textContent = 'Mostrando ' + MAX_ROWS + ' de ' + d.rows.length + ' linhas. Use o modo texto para editar todas.';
      wrap.appendChild(p);
    }
    bindTable(tb);
    return wrap;
  }

  function bindTable(tb) {
    tb.addEventListener('input', (e) => {
      const t = e.target;
      const d = data();
      if (t.dataset.h !== undefined) { d.columns[+t.dataset.h] = t.value; commitSoon(); return; }
      if (t.dataset.r !== undefined) {
        const v = t.value.trim();
        d.rows[+t.dataset.r][+t.dataset.c] = GG.data.cellValue(v);
        commitSoon();
      }
    });
    tb.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = data();
      if (b.dataset.delrow !== undefined) { d.rows.splice(+b.dataset.delrow, 1); A().setData(d); }
      if (b.dataset.delcol !== undefined) {
        if (d.columns.length <= 1) return;
        const j = +b.dataset.delcol;
        d.columns.splice(j, 1); d.rows.forEach((r) => r.splice(j, 1));
        A().setData(d);
      }
    });
    tb.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t.dataset.r === undefined) return;
      const r = +t.dataset.r, c = +t.dataset.c;
      if (e.key === 'Enter' || (e.key === 'ArrowDown' && !e.altKey)) {
        e.preventDefault();
        const d = data();
        if (r + 1 >= d.rows.length && e.key === 'Enter') { d.rows.push(d.columns.map(() => '')); A().setData(d); }
        focusCell(r + 1, c);
      } else if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(r - 1, c); }
    });
    tb.addEventListener('paste', (e) => {
      const t = e.target;
      if (t.dataset.r === undefined && t.dataset.h === undefined) return;
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\t\n]/.test(text)) return;
      e.preventDefault();
      pasteMatrix(text, t.dataset.h !== undefined ? -1 : +t.dataset.r, t.dataset.h !== undefined ? +t.dataset.h : +t.dataset.c);
    });
  }

  function pasteMatrix(text, r0, c0) {
    const d = data();
    const lines = text.replace(/\r/g, '').split('\n');
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const delim = text.includes('\t') ? '\t' : text.includes(';') ? ';' : ',';
    const m = lines.map((l) => GG.data.splitLine(l, delim).map((c) => c.trim()));
    const width = Math.max(...m.map((x) => x.length));
    while (d.columns.length < c0 + width) { d.columns.push('Série ' + d.columns.length); d.rows.forEach((row) => row.push('')); }
    m.forEach((vals, i) => {
      const ri = r0 + i;
      if (ri === -1) { vals.forEach((v, k) => { d.columns[c0 + k] = v || d.columns[c0 + k]; }); return; }
      while (d.rows.length <= ri) d.rows.push(d.columns.map(() => ''));
      vals.forEach((v, k) => { d.rows[ri][c0 + k] = GG.data.cellValue(v); });
    });
    A().setData(d);
    A().toast('Colado: ' + m.length + ' linha(s) × ' + width + ' coluna(s).');
  }

  function focusCell(r, c) {
    setTimeout(() => {
      const inp = document.querySelector('.datagrid input[data-r="' + r + '"][data-c="' + c + '"]');
      if (inp) { inp.focus(); inp.select(); }
    }, 30);
  }

  function transpose() {
    const d = GG.data.clean(data());
    const cols = [d.columns[0]].concat(d.rows.map((r) => String(r[0])));
    const rows = d.columns.slice(1).map((c, j) => [c].concat(d.rows.map((r) => r[j + 1])));
    A().setData({ columns: cols, rows });
    A().toast('Linhas e colunas trocadas.');
  }
  function sortRows(dir) {
    const d = data();
    d.rows.sort((a, b) => ((GG.data.toNum(b[1]) ?? -Infinity) - (GG.data.toNum(a[1]) ?? -Infinity)) * (dir < 0 ? 1 : -1));
    A().setData(d);
  }

  function textEditor() {
    const ta = document.createElement('textarea');
    ta.className = 'csv-edit'; ta.spellcheck = false; ta.setAttribute('aria-label', 'Dados em texto');
    const d = data();
    ta.value = [d.columns.join('\t')].concat(d.rows.map((r) => r.map((v) => GG.data.numText(v)).join('\t'))).join('\n');
    let t;
    ta.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const parsed = GG.data.parseTable(ta.value);
        if (parsed.columns.length) A().setData(parsed, { fromGrid: true });
      }, 400);
    });
    return ta;
  }

  // Importar arquivo (dados ou projeto)
  document.addEventListener('DOMContentLoaded', () => {
    const f = document.getElementById('fileInput');
    if (!f) return;
    f.addEventListener('change', () => {
      const file = f.files && f.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        if (f.dataset.mode === 'project' || /\.json$/i.test(file.name)) {
          try { const o = JSON.parse(text); GG.app.openState(o.state || o); } catch (e) { GG.app.toast('JSON inválido: ' + e.message); }
        } else {
          const t = GG.data.parseTable(text);
          if (!t.columns.length) { GG.app.toast('Arquivo sem dados reconhecíveis.'); return; }
          GG.app.setData(t);
          GG.app.toast('Importado: ' + t.rows.length + ' linhas × ' + t.columns.length + ' colunas.');
        }
        f.value = '';
      };
      reader.readAsText(file, 'utf-8');
    });
  });
})(window.GG = window.GG || {});
