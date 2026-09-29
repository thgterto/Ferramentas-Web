/**
 * Graficário — Revisão: checagens de storytelling com dados e boas práticas de
 * visualização, com correção em um clique quando possível.
 * Níveis: bad (problema), warn (aviso), tip (dica), ok (passou).
 */
(function (GG) {
  'use strict';
  const L = GG.lint = {};
  const TOPIC = /^(gr[aá]fico|chart|evolu[cç][aã]o|distribui[cç][aã]o|compara[cç][aã]o|comparativo|an[aá]lise|panorama|vis[aã]o geral|dados|total|n[uú]mero|quantidade|percentual|relat[oó]rio|indicadores?|resultado|vendas|receita|faturamento)\b/i;
  const VERB = /\b(cresce|cresceu|caiu|cai|sobe|subiu|dobrou|triplicou|lidera|superou|supera|ficou|fica|bateu|concentra|respond|representa|explica|mostra|aumentou|reduziu|diminuiu|passou|chegou|manteve|perdeu|ganhou|vale|custa|está|são|é|foi|tem|têm|vão|vai|devem?|precisa|equivale|sobram|somam|financiam|estouraram|compensou)\w*/i;
  const PAST = /\b[a-zà-ú]{3,}(ou|eu|iu|aram|eram|iram|ando|endo|indo)\b/i; // verbos no passado/gerúndio
  const TIMEY = /^(\d{4}|\d{1,2}\/\d{2,4}|(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?(\/\d{2,4})?|[1-4]º?\s*tri|[1-4]t\d{2}|s\d+|d\d+|sem\s*\d+|r\d+|q[1-4])/i;
  const ORDINALISH = /(\d+\s*[–-]\s*\d+|\d+\+|faixa|etapa|nível|nota)/i;

  function info() {
    const A = GG.app;
    const st = A.state;
    const def = A.def();
    const t = GG.data.clean(st.data);
    const S = GG.builders.settingsFor(def, st.settings);
    const numCols = t.columns.map((_, j) => t.rows.length > 0 && t.rows.every((r) => r[j] === '' || GG.data.toNum(r[j]) !== null) && t.rows.some((r) => r[j] !== ''));
    return { A, st, def, t, S, numCols, nSeries: numCols.slice(1).filter(Boolean).length, cats: t.rows.map((r) => String(r[0])) };
  }

  L.run = function () {
    if (!GG.app || !GG.app.state) return [];
    const X = info();
    const { st, def, t, S, nSeries, cats } = X;
    const type = st.type;
    const out = [];
    const add = (level, title, msg, fix) => out.push({ level, title, msg, fix });

    // --- dados
    if (!t.rows.length) add('bad', 'Sem dados', 'A tabela está vazia. Cole ou digite os dados na aba Dados.');
    else if (def.shape === 'wide' && !['sankey', 'chord', 'graph', 'tree', 'timeline', 'gantt', 'calendar', 'tilemap', 'hero'].includes(type) && nSeries === 0) add('bad', 'Nenhuma coluna numérica', 'O tipo "' + def.name + '" precisa de pelo menos uma coluna de números. Confira a linha cinza de papéis na aba Dados.');
    else add('ok', 'Dados legíveis', t.rows.length + ' linhas × ' + t.columns.length + ' colunas.');

    // --- título
    const title = String(S.title || '').trim();
    if (!title) add('bad', 'Sem título', 'Escreva a conclusão que o leitor deve tirar: “As vendas do Sul cresceram 23%”, não “Vendas por região”.');
    else if (TOPIC.test(title) && !/\d/.test(title) && !VERB.test(title) && !PAST.test(title)) add('warn', 'O título parece um assunto, não uma conclusão', '“' + title + '” diz do que o gráfico trata, mas não o que ele mostra. Qual é a grande ideia?');
    else add('ok', 'Título com mensagem', 'O título diz o que concluir — é o que a maioria das pessoas vai ler.');
    if (title.length > 110) add('tip', 'Título longo', 'Títulos acima de ~100 caracteres cansam. Mova o contexto para o subtítulo.');
    if (!S.subtitle) add('tip', 'Sem subtítulo', 'Use o subtítulo para o contexto: período, unidade de medida, recorte.');
    if (!S.source) add('tip', 'Sem fonte', 'Informar a fonte dá credibilidade e permite checar os números.');

    // --- forma
    if (type === 'pie') {
      const n = t.rows.length;
      const max = Math.max(2, parseInt(S.maxSlices, 10) || 6);
      if (n > max) add('tip', 'Fatias agrupadas em “Outros”', n + ' fatias foram reduzidas a ' + max + '. Para comparar todas, use barras ordenadas.', { label: 'Trocar por barras', apply: () => { GG.app.setType('bar'); GG.app.setSettings({ orientation: 'h', sort: 'desc' }, { full: true }); } });
      const vals = t.rows.map((r) => GG.data.toNum(r[1])).filter((v) => v > 0).sort((a, b) => b - a);
      if (vals.length >= 4 && vals[0] / vals[vals.length - 1] < 1.6) add('warn', 'Fatias parecidas demais', 'Com valores próximos, ângulos são difíceis de comparar. Barras mostram a diferença com precisão.', { label: 'Trocar por barras', apply: () => { GG.app.setType('bar'); GG.app.setSettings({ orientation: 'h', sort: 'desc' }, { full: true }); } });
    }
    if (type === 'radar') add('tip', 'Radar distorce áreas', 'A área cresce com o quadrado dos valores e depende da ordem dos eixos. Para comparar com precisão, use barras agrupadas.', { label: 'Ver como barras', apply: () => GG.app.setType('bar') });
    if (type === 'bar' && nSeries === 1 && S.sort === 'none' && t.rows.length > 5 && S.colorBy !== 'ordinal' && !cats.every((c) => TIMEY.test(c) || ORDINALISH.test(c))) {
      add('tip', 'Ordene pelo valor', 'Categorias sem ordem natural ficam mais fáceis de ler do maior para o menor.', { label: 'Ordenar', apply: () => GG.app.setSetting('sort', 'desc', { full: true }) });
    }
    if (['bar', 'lollipop', 'waterfall', 'pareto'].includes(type) && GG.data.toNum(S.yMin) > 0) add('bad', 'Barra sem base zero', 'O comprimento da barra é o valor: cortar a base exagera diferenças. O gerador mantém o zero, mas revise o mínimo definido.', { label: 'Limpar mínimo', apply: () => GG.app.setSetting('yMin', '', { full: true }) });

    // --- séries e cor
    const multiSeries = ['line', 'bar', 'radar', 'ecdf', 'bump'].includes(type) || def.shape === 'columns';
    const nGroups = def.shape === 'columns' ? t.columns.length : nSeries;
    if (multiSeries && nGroups > 8) add('bad', 'Mais de 8 séries', 'Não existem 9 cores distinguíveis. Agrupe o excesso em “Outros”, destaque uma série ou use pequenos múltiplos.', { label: 'Pequenos múltiplos', apply: () => GG.app.setType('multiples') });
    if (type === 'line' && (S.area || 'none') === 'none' && nSeries >= 4 && !(S.highlight || []).length) add('warn', 'Gráfico espaguete', nSeries + ' linhas se cruzando competem pela atenção. Destaque a série da história (o resto fica cinza) ou separe em painéis.', { label: 'Separar em painéis', apply: () => GG.app.setType('multiples') });
    else if (type === 'line' && nSeries >= 2 && S.legend === 'none' && S.labels === 'none') add('warn', 'Séries sem identificação', 'Sem legenda e sem rótulos, a cor vira o único jeito de saber qual série é qual.', { label: 'Mostrar legenda', apply: () => GG.app.setSetting('legend', 'auto', { full: true }) });
    if (type === 'scatter') {
      const gc = parseInt(S.groupCol, 10);
      const ng = !isNaN(gc) ? new Set(t.rows.map((r) => r[gc])).size : 1;
      if (ng > 3) add('warn', 'Muitos grupos de cor na dispersão', ng + ' grupos: em dispersões qualquer ponto pode ficar ao lado de qualquer outro, e só 3 cores ficam distinguíveis para todos. Agrupe ou use pequenos múltiplos.');
    }
    if (nSeries >= 2 && S.legend === 'none' && !['slope', 'bump', 'likert', 'multiples', 'kpi', 'heatmap', 'dumbbell', 'marimekko', 'forecast', 'bullet', 'meter', 'range', 'pyramid'].includes(type)) add('warn', 'Legenda desligada', 'Com duas ou mais séries, a legenda garante que a identidade não dependa só da cor.', { label: 'Ligar legenda', apply: () => GG.app.setSetting('legend', 'auto', { full: true }) });
    if (['bar', 'lollipop', 'pie', 'waffle', 'funnel'].includes(type) && nSeries === 1 && t.rows.length >= 5 && !(S.highlight || []).length) add('tip', 'Onde o olho deve ir?', 'Destaque a categoria que conta a história — as outras ficam em cinza como contexto.');
    if (S.labels === 'all' && t.rows.length * Math.max(1, nSeries) > 40 && !['heatmap', 'treemap', 'sankey'].includes(type)) add('warn', 'Rótulos em todos os pontos', 'Um número em cada ponto vira ruído e ninguém lê. Rotule só o que importa.', { label: 'Rótulos seletivos', apply: () => GG.app.setSetting('labels', 'smart', { full: true }) });

    // --- paleta
    const mode = GG.app.chartMode();
    if (S.theme === 'custom') {
      const cols = GG.color.parseList(S.customPalette);
      if (cols.length < 2) add('bad', 'Paleta da marca vazia', 'Informe as cores em hexadecimal, separadas por vírgula.');
      else {
        const r = GG.color.validate(cols.slice(0, Math.max(2, nGroups || 2)), { mode, pairs: type === 'scatter' ? 'all' : 'adjacent' });
        const fail = r.report.filter((x) => x.state === 'fail'), warn = r.report.filter((x) => x.state === 'warn');
        if (fail.length) add('bad', 'Paleta da marca reprovada', fail.map((x) => x.check + ': ' + x.detail).join(' · '));
        else if (warn.length) add('warn', 'Paleta da marca com ressalvas', warn.map((x) => x.check).join(', ') + '. Use rótulos diretos ou a tabela acessível como apoio.');
        else add('ok', 'Paleta da marca aprovada', 'Passou nas checagens de daltonismo, luminosidade e contraste.');
      }
    } else add('ok', 'Paleta validada', 'Cores testadas para daltonismo (protan/deutan), luminosidade e contraste, nos modos claro e escuro.');

    // --- honestidade e acessibilidade
    if (GG.app.CARTESIAN.has(type) || ['line', 'bar'].includes(type)) add('ok', 'Um único eixo de valor', 'Sem eixo Y duplo: para comparar escalas diferentes, use “Indexar (1º valor = 100)” em linhas.');
    add('ok', 'Tabela acessível disponível', 'Todo valor pode ser lido sem depender de cor ou do mouse (aba Tabela acessível).');
    if (!S.decal && (S.labels === 'none' || nGroups > 4)) add('tip', 'Vai imprimir em preto e branco?', 'Ative as texturas em Cores e destaque: a identidade das séries passa a não depender só da cor.', { label: 'Ativar texturas', apply: () => GG.app.setSetting('decal', true, { full: true }) });
    if (S.override && String(S.override).trim()) {
      try { JSON.parse(S.override); add('tip', 'Option sobrescrito', 'Há ajustes manuais de JSON em Avançado — eles vencem os controles da interface.'); }
      catch (e) { add('bad', 'JSON inválido em Avançado', e.message); }
    }
    const order = { bad: 0, warn: 1, tip: 2, ok: 3 };
    return out.sort((a, b) => order[a.level] - order[b.level]);
  };

  L.panel = function () {
    const res = L.run();
    const wrap = document.createElement('div'); wrap.className = 'review';
    const bad = res.filter((r) => r.level === 'bad').length, warn = res.filter((r) => r.level === 'warn').length, ok = res.filter((r) => r.level === 'ok').length;
    const head = document.createElement('div'); head.className = 'review-head';
    const b = document.createElement('b'); b.textContent = bad ? 'Há ' + bad + ' problema(s) para resolver' : warn ? 'Quase lá: ' + warn + ' aviso(s)' : 'Pronto para publicar';
    const s = document.createElement('span'); s.textContent = ok + ' checagens ok · baseado em storytelling com dados e boas práticas de visualização';
    head.append(b, s);
    wrap.appendChild(head);
    const ICON = { ok: '✓', warn: '!', bad: '✕', tip: 'i' };
    res.forEach((r) => {
      const row = document.createElement('div'); row.className = 'check ' + r.level;
      const ico = document.createElement('span'); ico.className = 'ico'; ico.textContent = ICON[r.level]; ico.setAttribute('aria-label', { ok: 'ok', warn: 'aviso', bad: 'problema', tip: 'dica' }[r.level]);
      const txt = document.createElement('div');
      const t = document.createElement('b'); t.textContent = r.title;
      const p = document.createElement('p'); p.textContent = r.msg;
      txt.append(t, p);
      row.append(ico, txt);
      if (r.fix) {
        const btn = document.createElement('button'); btn.className = 'btn btn-sm'; btn.type = 'button'; btn.textContent = r.fix.label;
        btn.addEventListener('click', () => { r.fix.apply(); GG.app.setTab('review'); });
        row.appendChild(btn);
      } else row.appendChild(document.createElement('span'));
      wrap.appendChild(row);
    });
    return wrap;
  };
})(window.GG = window.GG || {});
