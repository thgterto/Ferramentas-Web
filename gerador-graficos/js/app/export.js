/**
 * Graficário — exportação: PNG, SVG, área de transferência, impressão, HTML
 * interativo autônomo, option JSON, CSV e arquivo de projeto.
 */
(function (GG) {
  'use strict';
  const E = GG.exporter = {};
  const A = () => GG.app;

  function slug(s) {
    return String(s || 'grafico').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'grafico';
  }
  function baseName() {
    const st = A().state;
    return slug(st.settings.title || (A().preset() ? A().preset().name : st.type));
  }
  function download(content, name, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function dataURLtoBlob(u) {
    const [head, b64] = u.split(',');
    const mime = head.match(/:(.*?);/)[1];
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  /** Reconstrói o option para o tamanho do quadro atual, sem animação. */
  function freshOption(mode) {
    const st = A().state;
    const { W, H } = A().frameSize();
    const o = GG.builders.build({ type: st.type, data: st.data, settings: JSON.parse(JSON.stringify(st.settings)), mode: mode || A().chartMode(), width: W, height: H });
    return { option: o, W, H };
  }
  function surface() { return GG.tokens.MODES[A().chartMode()].surface; }

  E.copyText = function (text, msg) {
    const done = () => A().toast(msg || 'Copiado.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { A().toast('Não foi possível copiar.'); }
      ta.remove();
    }
  };

  function pngURL(ratio) {
    return A().chart.getDataURL({ type: 'png', pixelRatio: ratio || 2, backgroundColor: surface() });
  }

  function svgString() {
    const { option, W, H } = freshOption();
    option.animation = false;
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + W + 'px;height:' + H + 'px';
    document.body.appendChild(d);
    const c = echarts.init(d, null, { renderer: 'svg', width: W, height: H, locale: GG.RT.LOCALE_NAME });
    c.setOption(option);
    const svg = c.renderToSVGString();
    c.dispose(); d.remove();
    return svg;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /** HTML autônomo: ECharts via CDN + runtime embutido + option + tabela dos dados. */
  E.htmlDoc = function () {
    const st = A().state;
    const mode = A().chartMode();
    const T = GG.tokens.MODES[mode];
    const { option, W, H } = freshOption(mode);
    // '<' escapado como \u003c: nenhum texto dos dados consegue fechar a tag <script>
    const json = GG.builders.serialize(option).replace(/</g, '\\u003c');
    const src = /^https?:/.test(window.GG_ECHARTS_SRC || '') ? window.GG_ECHARTS_SRC : 'https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js';
    const title = st.settings.title || 'Gráfico';
    const t = GG.data.clean(st.data);
    const rows = t.rows.slice(0, 1000).map((r) => '<tr>' + r.map((v, j) => (j === 0 ? '<th scope="row">' : '<td>') + esc(GG.data.numText(v)) + (j === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('\n');
    return '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + esc(title) + '</title>\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">\n' +
      '<style>\n  html,body{margin:0;background:' + T.page + ';color:' + T.ink + ';font:14px/1.5 "IBM Plex Sans",system-ui,sans-serif}\n' +
      '  .wrap{max-width:' + W + 'px;margin:24px auto;padding:0 16px}\n  #chart{width:' + W + 'px;max-width:100%;height:' + H + 'px;background:' + T.surface + ';border:1px solid ' + T.grid + ';border-radius:6px}\n' +
      '  details{margin-top:12px;color:' + T.ink2 + '} summary{cursor:pointer} table{border-collapse:collapse;margin-top:8px;font-size:13px} th,td{padding:4px 10px;border-bottom:1px solid ' + T.grid + ';text-align:left} td{font-variant-numeric:tabular-nums}\n</style>\n' +
      '<script src="' + src + '"><\/script>\n</head>\n<body>\n<div class="wrap">\n  <div id="chart" role="img" aria-label="' + esc([title, st.settings.subtitle].filter(Boolean).join(' — ')) + '"></div>\n' +
      '  <details><summary>Ver os dados em tabela</summary>\n  <table><caption style="text-align:left;font-weight:600;padding-bottom:6px">' + esc(title) + '</caption><thead><tr>' + t.columns.map((c) => '<th scope="col">' + esc(c) + '</th>').join('') + '</tr></thead>\n  <tbody>\n' + rows + '\n  </tbody></table></details>\n</div>\n' +
      '<script>\n/* Runtime do Graficário: reconstrói formatadores e renderItem a partir do JSON. */\n' + GG_RUNTIME.toString() + '\n' +
      'var RT = GG_RUNTIME(echarts);\nvar option = RT.revive(' + json + ');\n' +
      'var chart = echarts.init(document.getElementById("chart"), null, { locale: RT.LOCALE_NAME });\nchart.setOption(option);\n' +
      'window.addEventListener("resize", function () { chart.resize(); });\n<\/script>\n</body>\n</html>\n';
  };

  E.run = function (kind) {
    const st = A().state;
    try {
      if (kind === 'png' || kind === 'png3') {
        download(dataURLtoBlob(pngURL(kind === 'png3' ? 3 : 2)), baseName() + '.png');
        A().toast('PNG exportado (' + (kind === 'png3' ? '3' : '2') + '× a resolução do quadro).');
      } else if (kind === 'svg') {
        download(svgString(), baseName() + '.svg', 'image/svg+xml');
        A().toast('SVG exportado.');
      } else if (kind === 'clip') {
        const blob = dataURLtoBlob(pngURL(2));
        if (navigator.clipboard && window.ClipboardItem) {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(
            () => A().toast('Imagem copiada. Cole no PowerPoint, Docs, e-mail…'),
            () => { download(blob, baseName() + '.png'); A().toast('O navegador bloqueou a cópia; baixei o PNG.'); });
        } else { download(blob, baseName() + '.png'); A().toast('Este navegador não copia imagens; baixei o PNG.'); }
      } else if (kind === 'print') {
        window.print();
      } else if (kind === 'html') {
        download(E.htmlDoc(), baseName() + '.html', 'text/html');
        A().toast('HTML interativo exportado — abre em qualquer navegador.');
      } else if (kind === 'json') {
        download(GG.builders.serialize(freshOption().option, true), baseName() + '.option.json', 'application/json');
        A().toast('Option do ECharts exportado.');
      } else if (kind === 'csv') {
        download('﻿' + GG.data.toCSV(GG.data.clean(st.data), ';'), baseName() + '.csv', 'text/csv;charset=utf-8');
        A().toast('CSV exportado (separador ;, abre direto no Excel).');
      } else if (kind === 'project') {
        download(JSON.stringify({ app: 'graficario', v: 1, saved: new Date().toISOString(), state: st }, null, 2), baseName() + '.graficario.json', 'application/json');
        A().toast('Arquivo do projeto exportado. Abra depois em Meus gráficos › Abrir arquivo.');
      } else if (kind === 'import') {
        const f = document.getElementById('fileInput'); f.dataset.mode = 'project'; f.accept = '.json'; f.click();
        setTimeout(() => { f.accept = '.csv,.tsv,.txt,.json'; }, 1000);
      }
    } catch (e) {
      console.error(e);
      A().toast('Falha ao exportar: ' + e.message);
    }
  };
})(window.GG = window.GG || {});
