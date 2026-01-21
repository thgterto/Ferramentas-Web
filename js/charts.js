import { state } from './state.js';
import { downsamplePairs, fmt } from './utils.js';

export function getChartLayout(title, ucl, cl, lcl, yTitle) {
  return {
    margin: {t:40, b:40, l:50, r:60}, showlegend: false,
    title: { text: title, font: {size:12, family:'IBM Plex Sans'}, x:0.02, xanchor:'left' },
    xaxis: { showgrid:false },
    yaxis: { title: yTitle, showgrid:true, gridcolor:'#E0E0E0' },
    font: { family: 'IBM Plex Sans' },
    shapes: [
      { type:'line', x0:0, x1:1, xref:'paper', y0:ucl, y1:ucl, line:{color:'#D34041', dash:'dot', width:1.5} },
      { type:'line', x0:0, x1:1, xref:'paper', y0:cl, y1:cl, line:{color:'#118186', width:2} },
      { type:'line', x0:0, x1:1, xref:'paper', y0:lcl, y1:lcl, line:{color:'#D34041', dash:'dot', width:1.5} }
    ],
    annotations: [
      { x:1, xref:'paper', y:ucl, text:'UCL', showarrow:false, xanchor:'left', font:{color:'#D34041', size:10} },
      { x:1, xref:'paper', y:cl, text:'CL', showarrow:false, xanchor:'left', font:{color:'#118186', size:10} },
      { x:1, xref:'paper', y:lcl, text:'LCL', showarrow:false, xanchor:'left', font:{color:'#D34041', size:10} }
    ],
    hovermode: 'closest'
  };
}

export function plotlyConfig() { return { displayModeBar: false, responsive: true }; }

export function baseLayout(title, yTitle) {
   return {
      title: { text: title, font: {size:12, family:'IBM Plex Sans'}, x:0.02, xanchor:'left' },
      margin: {t:40, b:40, l:50, r:20},
      xaxis: { showgrid:false },
      yaxis: { title: yTitle, showgrid:true, gridcolor:'#E0E0E0' },
      font: { family: 'IBM Plex Sans' },
      separators: ',.'
   };
}

export function initCharts() {
  const base = { title: { text:'Aguardando dados...', font:{size:12, color:'#aaa'} } };
  ['plt-ind','plt-mr','plt-xbar','plt-r','plt-xbars','plt-s','plt-cusum','plt-ewma','plt-run'].forEach(id => {
     const el = document.getElementById(id);
     if(el) Plotly.newPlot(id, [], base, plotlyConfig());
  });
}

export function renderCharts() {
  const { data, limits, violations, strata, processed, stratCol } = state;
  const { ind, mr, xbar, xbars, r, s } = limits;
  if(!data.length) return;

  const idx = data.map((_,i)=>i+1);
  const { idx: drawIdx, data: drawData } = downsamplePairs(idx, data, 5000);
  const hasStrat = !!stratCol && strata.length === data.length;

  const getPointColor = (chartType, index) => {
     const v = violations.find(x => x.chart === chartType && x.i === index);
     if (v) return '#D34041';
     if (hasStrat) {
        const str = strata[index-1] || '';
        let hash = 0; for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
     }
     return '#118186';
  };

  const colorsInd = drawIdx.map(i => getPointColor('IND', i));
  const layoutInd = getChartLayout('', ind.ucl, ind.cl, ind.lcl, 'Individual');
  layoutInd.xaxis.matches = 'x'; layoutInd.separators = ',.';

  Plotly.react('plt-ind', [{
    x: drawIdx, y: drawData, type: 'scattergl', mode: 'lines+markers',
    marker: { color: colorsInd, size: 5, line: {color:'#fff', width:0.5} },
    line: { color: hasStrat ? '#ccc' : '#2AA8CE', width: 1.5 }
  }], layoutInd, plotlyConfig());

  const mrVals = []; for(let i=1; i<drawData.length; i++) mrVals.push(Math.abs(drawData[i]-drawData[i-1]));
  const layoutMr = getChartLayout('', mr.ucl, mr.cl, 0, 'Amplitude');
  layoutMr.xaxis.matches = 'x'; layoutMr.separators = ',.';
  Plotly.react('plt-mr', [{
    x: drawIdx.slice(1), y: mrVals, type: 'scattergl', mode: 'lines+markers', line:{color:'#2AA8CE', width:1.5},
    marker: { color: '#118186', size: 5 }
  }], layoutMr, plotlyConfig());

  const { means, ranges, stds } = processed;
  const xIdx = means.map((_, i) => i + 1);
  const layoutXBar = getChartLayout('', xbar.ucl, xbar.cl, xbar.lcl, 'Média');
  layoutXBar.xaxis.matches = 'x2'; layoutXBar.separators = ',.';
  Plotly.react('plt-xbar', [{ x: xIdx, y: means, type:'scatter', mode:'lines+markers', line:{color:'#2AA8CE', width:1.5}, marker: { color: '#118186', size: 6 } }], layoutXBar, plotlyConfig());

  const layoutXBarS = getChartLayout('', xbars.ucl, xbars.cl, xbars.lcl, 'Média');
  layoutXBarS.xaxis.matches = 'x2'; layoutXBarS.separators = ',.';
  Plotly.react('plt-xbars', [{ x: xIdx, y: means, type:'scatter', mode:'lines+markers', line:{color:'#2AA8CE', width:1.5}, marker: { color: '#118186', size: 6 } }], layoutXBarS, plotlyConfig());

  const layoutR = getChartLayout('', r.ucl, r.cl, r.lcl, 'Amplitude');
  layoutR.xaxis.matches = 'x2'; layoutR.separators = ',.';
  Plotly.react('plt-r', [{ x: xIdx, y: ranges, type:'scatter', mode:'lines+markers', line:{color:'#2AA8CE', width:1.5}, marker: {color: '#118186'} }], layoutR, plotlyConfig());

  const layoutS = getChartLayout('', s.ucl, s.cl, s.lcl, 'Desvio Padrão');
  layoutS.xaxis.matches = 'x2'; layoutS.separators = ',.';
  Plotly.react('plt-s', [{ x: xIdx, y: stds, type:'scatter', mode:'lines+markers', line:{color:'#2AA8CE', width:1.5}, marker: {color: '#118186'} }], layoutS, plotlyConfig());

  if(document.getElementById('t-six').classList.contains('active')) renderSixpack();
  if(document.getElementById('t-adv').classList.contains('active')) renderAdvanced();
  if(document.getElementById('t-run').classList.contains('active')) renderRunChart();
}

export function renderRunChart() {
  const { data, descStats, advanced } = state;
  const { median } = descStats;
  const { run } = advanced;
  if(!data.length) return;

  const layoutRun = baseLayout('', 'Valores Individuais');
  layoutRun.shapes = [{type:'line', x0:0, x1:1, xref:'paper', y0:median, y1:median, line:{color:'#118186', width:2, dash:'dash'}}];
  layoutRun.annotations = [{x:1, xref:'paper', y:median, text:'Mediana', showarrow:false, xanchor:'left', font:{size:10, color:'#118186'}}];

  Plotly.react('plt-run', [{
    y: data, type: 'scatter', mode: 'lines+markers',
    line: {color:'#2AA8CE'}, marker: {size:5, color: data.map(v => v > median ? '#2AA8CE' : '#D34041')}
  }], layoutRun, plotlyConfig());

  const tbl = `
    <table class="run-table">
      <tr><th>Métrica</th><th>Valor</th></tr>
      <tr><td>Número de Corridas</td><td>${run.runs}</td></tr>
      <tr><td>Corridas Esperadas</td><td>${fmt(run.E)}</td></tr>
      <tr><td>Valor P (Agrupamento)</td><td>${fmt(run.pCluster, 3)}</td></tr>
      <tr><td>Valor P (Misturas)</td><td>${fmt(run.pMixture, 3)}</td></tr>
    </table>
    <div style="font-size:0.75rem; color:#666; margin-top:12px; padding:8px; background:#F9FAFB; border-left:3px solid var(--col-info);">
      <strong>Nota:</strong> Valor P < 0.05 sugere comportamento não aleatório (Padrão Detectado).
    </div>
  `;
  document.getElementById('run-stats').innerHTML = tbl;
}

export function renderSixpack() {
  const { data, stats, limits } = state;
  const { mean, sOverall, sWithin } = stats;
  const { ind } = limits;
  if(data.length < 10) return;

  const layoutI = { margin:{t:20,b:20,l:30,r:10}, xaxis:{showticklabels:false}, yaxis:{showticklabels:false}, showlegend:false, separators:',.', shapes:[{type:'line', y0:ind.ucl, y1:ind.ucl, x0:0, x1:1, xref:'paper', line:{color:'#D34041', width:1}},{type:'line', y0:ind.lcl, y1:ind.lcl, x0:0, x1:1, xref:'paper', line:{color:'#D34041', width:1}}] };
  Plotly.react('six-1', [{ y: data, type:'scatter', mode:'lines', line:{color:'#2AA8CE', width:1} }], layoutI, plotlyConfig());

  const min=Math.min(...data), max=Math.max(...data), xRange=[]; const step=(max-min)/50; for(let v=min; v<=max; v+=step) xRange.push(v);
  const yWithin = xRange.map(x => (1/(sWithin*Math.sqrt(2*Math.PI))) * Math.exp(-0.5*Math.pow((x-mean)/sWithin, 2)));
  const yOverall = xRange.map(x => (1/(sOverall*Math.sqrt(2*Math.PI))) * Math.exp(-0.5*Math.pow((x-mean)/sOverall, 2)));

  const lsl=parseFloat(document.getElementById('inp-lsl').value), usl=parseFloat(document.getElementById('inp-usl').value);
  const shapesHist = [];
  if(!isNaN(lsl)) shapesHist.push({type:'line', x0:lsl, x1:lsl, y0:0, y1:1, yref:'paper', line:{color:'#D34041', width:2, dash:'dot'}});
  if(!isNaN(usl)) shapesHist.push({type:'line', x0:usl, x1:usl, y0:0, y1:1, yref:'paper', line:{color:'#D34041', width:2, dash:'dot'}});

  Plotly.react('six-2', [
    { x: data, type:'histogram', histnorm:'probability density', marker:{color:'rgba(42, 168, 206, 0.5)'}, name:'Hist' },
    { x: xRange, y: yWithin, type:'scatter', mode:'lines', line:{color:'#D34041', dash:'dash'}, name:'Within' },
    { x: xRange, y: yOverall, type:'scatter', mode:'lines', line:{color:'#118186'}, name:'Overall' }
  ], { margin:{t:20,b:20,l:30,r:10}, showlegend:false, shapes: shapesHist, separators:',.' }, plotlyConfig());

  const mrVals = []; for(let i=1; i<data.length; i++) mrVals.push(Math.abs(data[i]-data[i-1]));
  Plotly.react('six-3', [{ y: mrVals, type:'scatter', mode:'lines', line:{color:'#2AA8CE', width:1} }],
    { margin:{t:20,b:20,l:30,r:10}, xaxis:{showticklabels:false}, yaxis:{showticklabels:false}, showlegend:false, separators:',.' }, plotlyConfig());

  // Note: theoretical quantiles are needed for six-4. It involves math (SPC.cdf inverse or similar).
  // Ideally, worker calculates the theoretical quantiles or we implement the math here.
  // The original code did:
  // const theoretical = sorted.map((_,i) => { const p=(i+0.5)/data.length; return p<0.5 ? -Math.sqrt(-2*Math.log(p)) : Math.sqrt(-2*Math.log(1-p)); }).map(z => z*sOverall + mean);
  // This is simple enough to keep here.

  const sorted = [...data].sort((a,b)=>a-b);
  const theoretical = sorted.map((_,i) => { const p=(i+0.5)/data.length; return p<0.5 ? -Math.sqrt(-2*Math.log(p)) : Math.sqrt(-2*Math.log(1-p)); }).map(z => z*sOverall + mean);
  // pValue from AD test. Worker calculated stats, but maybe not AD pValue?
  // Wait, worker calculates AD pValue inside `diagnose` but doesn't expose it directly in `stats`.
  // Actually, `diagnose` returns findings.
  // Original code called `SPC.andersonDarling` here too.
  // I should move `andersonDarling` result to `stats` or `advanced` in worker.
  // For now, I'll skip the pValue annotation or approximate it?
  // No, I should expose it.

  const lineTrace = { x: [Math.min(...theoretical), Math.max(...theoretical)], y: [Math.min(...theoretical), Math.max(...theoretical)], type: 'scatter', mode: 'lines', line: {color:'#D34041'}, name:'Ref Line' };

  Plotly.react('six-4', [
    { x: theoretical, y: sorted, type:'scatter', mode:'markers', marker:{size:3, color:'#2AA8CE'} },
    lineTrace
  ], {
    margin: {t:20,b:20,l:35,r:10}, xaxis:{title:''}, yaxis:{title:''}, showlegend:false, separators:',.',
    // annotations: [{x:0.05, y:0.95, xref:'paper', yref:'paper', text:`P: ${fmt(ad.pValue, 3)}`, showarrow:false, align:'left', font:{size:10}}]
  }, plotlyConfig());

  const last25 = data.slice(-25);
  Plotly.react('six-5', [{ y: last25, type:'scatter', mode:'lines+markers', marker:{size:4, color:'#118186'} }],
    { margin:{t:20,b:20,l:30,r:10}, xaxis:{showticklabels:false}, yaxis:{showticklabels:false}, showlegend:false, separators:',.' }, plotlyConfig());

  const traces = [
    { x: [mean-3*sWithin, mean+3*sWithin], y: [1, 1], type:'scatter', mode:'lines', line:{width:5, color:'#2AA8CE'}, name:'Within' },
    { x: [mean-3*sOverall, mean+3*sOverall], y: [0.5, 0.5], type:'scatter', mode:'lines', line:{width:5, color:'#118186'}, name:'Overall' }
  ];
  if (!isNaN(lsl)) {
    const maxVis = Math.max(mean+4*sOverall, lsl + (mean-lsl)*2);
    traces.push({ x: [lsl, maxVis], y: [0, 0], type:'scatter', mode:'lines', line:{width:5, color:'#D34041'}, name:'LSL ->' });
    traces.push({ x: [lsl, lsl], y: [-0.1, 0.1], type:'scatter', mode:'lines', line:{width:5, color:'#D34041'}, showlegend:false });
  } else if (!isNaN(usl)) {
    const minVis = Math.min(mean-4*sOverall, usl - (usl-mean)*2);
    traces.push({ x: [minVis, usl], y: [0, 0], type:'scatter', mode:'lines', line:{width:5, color:'#D34041'}, name:'<- USL' });
    traces.push({ x: [usl, usl], y: [-0.1, 0.1], type:'scatter', mode:'lines', line:{width:5, color:'#D34041'}, showlegend:false });
  }
  Plotly.react('six-6', traces, { margin:{t:20,b:20,l:30,r:10}, xaxis:{showticklabels:true}, yaxis:{showticklabels:false, range:[-0.5, 1.5]}, showlegend:false, separators:',.' }, plotlyConfig());
}

export function renderAdvanced() {
    const { advanced } = state;
    const { cusum, ewma } = advanced;
    if (!cusum.cp) return;
    const idx = Array.from({length: cusum.cp.length}, (_, i) => i + 1);
    const layoutCusum = baseLayout('Tabular CUSUM', 'Soma Acumulada');
    layoutCusum.shapes = [ { type:'line', x0:0, x1:1, xref:'paper', y0:cusum.h, y1:cusum.h, line:{color:'#D34041', dash:'dot'} } ];
    Plotly.react('plt-cusum', [{ x: idx, y: cusum.cp, name: 'C+', mode: 'lines+markers', line: {color: '#2AA8CE'} }, { x: idx, y: cusum.cm, name: 'C-', mode: 'lines+markers', line: {color: '#118186'} }], layoutCusum, plotlyConfig());

    const layoutEwma = baseLayout('EWMA (Lambda=0.2)', 'Valor Ponderado');
    Plotly.react('plt-ewma', [{ x: idx, y: ewma.z, name: 'EWMA', mode: 'lines+markers', line: {color: '#2AA8CE'} }, { x: idx, y: ewma.ucl, name: 'UCL', mode: 'lines', line: {color: '#D34041', dash:'dot'} }, { x: idx, y: ewma.lcl, name: 'LCL', mode: 'lines', line: {color: '#D34041', dash:'dot'} }], layoutEwma, plotlyConfig());
}

export function renderPareto() {
  const { violations } = state;
  if (violations.length === 0) { document.getElementById('modal-body').innerHTML = '<div style="text-align:center; padding:50px; color:var(--col-muted);">Nenhuma violação registrada para análise.</div>'; document.getElementById('modal-title').textContent = 'Análise de Pareto'; return; }
  const counts = {}; violations.forEach(v => counts[v.rule] = (counts[v.rule] || 0) + 1);
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  Plotly.newPlot('modal-body', [{ x: sorted.map(x=>x[0]), y: sorted.map(x=>x[1]), type: 'bar', marker:{color:'#118186'} }], { title: 'Pareto de Causas', margin:{t:40,b:80}, font:{family:'IBM Plex Sans'} }, plotlyConfig());
  document.getElementById('modal-title').textContent = 'Análise de Pareto';
}

export function renderBoxplot() {
  const { data, strata, stratCol } = state;
  const hasStrat = !!stratCol && strata && strata.length === data.length;
  let traces = [];
  if (hasStrat) {
    const groups = {}; data.forEach((v, i) => { const g = strata[i]; if(!groups[g]) groups[g] = []; groups[g].push(v); });
    traces = Object.keys(groups).map(g => ({ y: groups[g], type:'box', name: g, boxmean:'sd' }));
  } else { traces = [{ y: data, type: 'box', boxmean: 'sd', marker:{color:'#118186'}, name:'Todos' }]; }
  Plotly.newPlot('modal-body', traces, { title: 'Distribuição (Boxplot)', margin:{t:40,b:40}, font:{family:'IBM Plex Sans'}, separators:',.' }, plotlyConfig());
  document.getElementById('modal-title').textContent = 'Distribuição (Boxplot)';
}

export function expandChart(id) {
  document.getElementById('modal-chart').style.display = 'flex';
  document.getElementById('modal-title').textContent = 'Visualização Expandida';
  const map = {'ind':'plt-ind', 'mr':'plt-mr', 'xbar':'plt-xbar', 'r':'plt-r', 'xbars':'plt-xbars', 's':'plt-s', 'run':'plt-run'};
  const srcId = map[id];
  const srcDiv = document.getElementById(srcId);
  if (srcDiv && srcDiv.data) Plotly.newPlot('modal-body', srcDiv.data, srcDiv.layout, plotlyConfig());
}
