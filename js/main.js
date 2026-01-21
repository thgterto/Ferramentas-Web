import { state, updateState } from './state.js';
import * as UI from './ui.js';
import * as Charts from './charts.js';
import { debounce, fmt } from './utils.js';

let worker;
let currentNoteKey = null;

function init() {
  worker = new Worker('workers/worker.js');
  worker.onmessage = handleWorkerMessage;

  setupEventListeners();
  Charts.initCharts();
  UI.renderKPIs();

  // Expose App for legacy onclicks (if any) and dynamic content
  window.App = {
      exportCSV,
      exportXLSX,
      openModal: handleOpenModal,
      closeModal: UI.closeModal,
      expandChart: Charts.expandChart,
      saveNote,
      scrollToLog,
      openNote // Exposed for consistency if needed, though we use delegation
  };
}

function setupEventListeners() {
    const dbUpdate = debounce(() => calc(), 300);

    document.getElementById('file-input').addEventListener('change', loadFile);
    document.getElementById('col-select').addEventListener('change', e => { updateState({col: e.target.value}); calc(); });
    document.getElementById('col-strat').addEventListener('change', e => { updateState({stratCol: e.target.value}); calc(); });

    ['inp-n', 'inp-lsl', 'inp-usl', 'rng-window'].forEach(id => document.getElementById(id).addEventListener('input', dbUpdate));
    ['chk-iqr', 'sel-window', 'sel-method', 'r1','r2','r3','r4','r5'].forEach(id => document.getElementById(id).addEventListener('change', () => calc()));

    document.getElementById('toggle-sidebar').addEventListener('click', () => UI.toggle('sidebar'));
    document.getElementById('toggle-panel').addEventListener('click', () => UI.toggle('panel'));

    document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', e => UI.switchTab(e.target, {
        't-six': Charts.renderSixpack,
        't-adv': Charts.renderAdvanced,
        't-run': Charts.renderRunChart
    })));

    const logList = document.getElementById('log-list');
    logList.addEventListener('scroll', () => {
      if (logList.scrollTop + logList.clientHeight >= logList.scrollHeight - 50) UI.appendLogs();
    });

    // Event delegation for Log Entries
    logList.addEventListener('click', (e) => {
        const entry = e.target.closest('.log-entry');
        if (entry) {
            openNote(entry.dataset.chart, entry.dataset.idx);
        }
    });
}

function calc() {
    if(!state.col) return;
    document.getElementById('loader').style.display = 'flex';

    const config = {
        col: state.col,
        stratCol: state.stratCol,
        iqrFilter: document.getElementById('chk-iqr').checked,
        windowSize: parseInt(document.getElementById('sel-window').value),
        windowOffset: parseInt(document.getElementById('rng-window').value),
        n: parseInt(document.getElementById('inp-n').value) || 5,
        method: document.getElementById('sel-method').value,
        lsl: parseFloat(document.getElementById('inp-lsl').value),
        usl: parseFloat(document.getElementById('inp-usl').value),
        rules: {
          r1: document.getElementById('r1').checked,
          r2: document.getElementById('r2').checked,
          r3: document.getElementById('r3').checked,
          r4: document.getElementById('r4').checked,
          r5: document.getElementById('r5').checked
        }
    };

    worker.postMessage({ cmd: 'calc', raw: state.raw, config });
}

function handleWorkerMessage(e) {
    const { processed, limits, stats, descStats, advanced, violations, strata, insights, kpis, windowInfo } = e.data;

    updateState({
        processed, limits, stats, descStats, advanced, violations, strata, data: processed.vals, insights, kpis
    });

    if (windowInfo) {
        const winRange = document.getElementById('rng-window');
        const winSize = parseInt(document.getElementById('sel-window').value);
        if(winSize > 0) {
            winRange.max = windowInfo.total - winSize;
            winRange.disabled = false;
            document.getElementById('lbl-window').textContent = `Janela: ${windowInfo.offset+1} - ${windowInfo.offset+windowInfo.displayed}`;
        } else {
            winRange.disabled = true;
            document.getElementById('lbl-window').textContent = `Total: ${windowInfo.total}`;
        }
    }

    Charts.renderCharts();
    UI.renderKPIs();
    UI.renderStatsPanel();
    UI.renderLog();

    document.getElementById('loader').style.display = 'none';
}

function loadFile(e) {
  const file = e.target.files[0];
  if(!file) return;

  document.getElementById('file-info').innerHTML = `<span class="material-icons" style="font-size:14px; animation:spin 1s linear infinite">sync</span> Carregando...`;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const data = new Uint8Array(evt.target.result);
    const wb = XLSX.read(data, {type:'array'});
    const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if(json.length) {
      updateState({ raw: json });
      const sel = document.getElementById('col-select');
      const selStrat = document.getElementById('col-strat');
      sel.innerHTML = '<option value="">Selecione a Coluna...</option>';
      selStrat.innerHTML = '<option value="">Nenhuma</option>';
      Object.keys(json[0]).forEach(k => {
        const opt1 = document.createElement('option'); opt1.value = k; opt1.text = k; sel.add(opt1);
        const opt2 = document.createElement('option'); opt2.value = k; opt2.text = k; selStrat.add(opt2);
      });
      document.getElementById('file-info').innerHTML = `<span class="material-icons" style="font-size:14px; color:var(--col-success)">check_circle</span> ${file.name} (${json.length} linhas)`;
    }
  };
  reader.readAsArrayBuffer(file);
}

function handleOpenModal(type) {
    if (type === 'pareto') Charts.renderPareto();
    else if (type === 'box') Charts.renderBoxplot();
    else if (type === 'insights') renderInsightsToModal();
    UI.openModal('modal-chart');
}

function renderInsightsToModal() {
    const { insights } = state;
    if (!insights) return;

    const container = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = 'Insights Gerados (IA)';
    container.innerHTML = `
        <div class="insight-card ${insights.statusClass}">
          <div class="insight-title">
            <span class="material-icons">${insights.status === 'Estável' ? 'check_circle' : 'error'}</span>
            Status do Processo: ${insights.status}
          </div>
          <div class="insight-body">
            Diagnóstico baseado nas regras de controle estatístico e índices de capacidade.
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <h4 style="margin:0 0 12px 0; color:var(--col-text); border-bottom:1px solid #EEE; padding-bottom:8px;">Análise Detalhada</h4>
          <ul class="insight-list">
            ${insights.findings.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>

        <div>
          <h4 style="margin:0 0 12px 0; color:var(--col-text); border-bottom:1px solid #EEE; padding-bottom:8px;">Plano de Ação Sugerido</h4>
          <ul class="insight-list">
            ${insights.actions.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      `;
}

function openNote(chart, i) {
    currentNoteKey = `${chart}-${i}`;
    const note = state.notes[currentNoteKey] || {};
    document.getElementById('note-context').innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <strong>Carta:</strong> ${chart}
      </div>
      <div><strong>Ponto:</strong> #${i}</div>
    `;
    document.getElementById('note-cause').value = note.cause || '';
    document.getElementById('note-action').value = note.action || '';
    UI.openModal('modal-note');
}

function saveNote() {
    if(currentNoteKey) {
        state.notes[currentNoteKey] = { cause: document.getElementById('note-cause').value, action: document.getElementById('note-action').value };
        UI.renderLog();
    }
    UI.closeModal('modal-note');
}

function scrollToLog() {
    document.getElementById('toggle-panel').click();
    document.getElementById('log-list').scrollIntoView({behavior: "smooth"});
}

function exportCSV(type) {
  if(!state.data.length) return alert('Sem dados para exportar.');
  let csvContent = "data:text/csv;charset=utf-8,";
  if(type === 'series') { csvContent += "Index,Valor\n" + state.data.map((v,i)=>`${i+1},${fmt(v)}`).join("\n"); }
  else { csvContent += "Carta,Ponto,Valor,Regra,Causa,Acao\n" + state.violations.map(v => { const n = state.notes[`${v.chart}-${v.i}`] || {}; return `${v.chart},${v.i},${fmt(v.val)},${v.rule},${n.cause||''},${n.action||''}`; }).join("\n"); }
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `cep_${type}.csv`);
  document.body.appendChild(link);
  link.click();
}

function exportXLSX() {
  if(!state.data.length) return alert('Sem dados para exportar.');
  const ws = XLSX.utils.json_to_sheet(state.data.map((v,i)=>({Index:i+1, Valor:v})));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, "cep_completo.xlsx");
}

document.addEventListener('DOMContentLoaded', init);
