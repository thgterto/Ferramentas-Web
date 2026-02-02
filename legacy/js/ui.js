import { state } from './state.js';
import { fmt } from './utils.js';

export const UI = {
  kpi: (label, value, badgeHtml = '') => `
    <div class="kpi-item">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      ${badgeHtml}
    </div>`,
  stat: (label, value) => `
    <div class="stat-item">
      <div class="stat-lbl">${label}</div>
      <div class="stat-val">${value}</div>
    </div>`
};

export function toggle(area) {
  document.body.classList.toggle(`hide-${area}`);
  document.getElementById(`toggle-${area}`).classList.toggle('active');
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    const active = document.querySelector('.tab-pane.active');
    if(active && window.Plotly) active.querySelectorAll('.plot-div').forEach(el=>Plotly.Plots.resize(el));
  }, 350);
}

export function switchTab(btn, callbacks = {}) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const tabId = btn.dataset.tab;
  document.getElementById(tabId).classList.add('active');
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
    const container = document.getElementById(tabId);
    if(window.Plotly) container.querySelectorAll('.plot-div').forEach(el => Plotly.Plots.resize(el));
    if(callbacks[tabId]) callbacks[tabId]();
  });
}

export function renderKPIs() {
    const { kpis } = state;
    if (!kpis) return;

    const { cp, cpk, pp, ppk, ppm, yieldPct } = kpis;

    const kpiContainer = document.getElementById('kpi-container');
    let badgeHtml = '';
    if(isFinite(cpk)) {
      const cls = cpk>=1.33 ? 'bdg-good' : cpk>=1 ? 'bdg-warn' : 'bdg-bad';
      const txt = cpk>=1.33 ? 'Bom' : (cpk>=1 ? 'Reg' : 'Mau');
      badgeHtml = `<div class="status-badge ${cls}">${txt}</div>`;
    }

    kpiContainer.innerHTML = [
      UI.kpi('Cp', isFinite(cp) ? fmt(cp) : '--'), `<div class="kpi-sep"></div>`,
      UI.kpi('Cpk', isFinite(cpk) ? fmt(cpk) : '--', badgeHtml), `<div class="kpi-sep"></div>`,
      UI.kpi('Pp', isFinite(pp) ? fmt(pp) : '--'), `<div class="kpi-sep"></div>`,
      UI.kpi('Ppk', isFinite(ppk) ? fmt(ppk) : '--'), `<div class="kpi-sep"></div>`,
      UI.kpi('Yield', isFinite(yieldPct) ? fmt(yieldPct)+'%' : '--%'), `<div class="kpi-sep"></div>`,
      UI.kpi('PPM', isFinite(ppm) ? Math.round(ppm).toLocaleString('pt-BR') : '--')
    ].join('');
}

export function renderStatsPanel() {
  const s = state.descStats;
  const { mean, sWithin, sOverall, skew, kurt } = state.stats;
  const grid = document.getElementById('stats-grid');
  if(!s || !s.n) { grid.innerHTML = '<div style="color:var(--col-muted); text-align:center; grid-column:span 2; font-style:italic; padding:20px;">Aguardando carregamento de dados...</div>'; return; }

  grid.innerHTML = [
    UI.stat('Média', fmt(mean,4)), UI.stat('Desv. Within', fmt(sWithin,4)),
    UI.stat('Desv. Overall', fmt(sOverall,4)), UI.stat('N', s.n),
    UI.stat('Mínimo', fmt(s.min,4)), UI.stat('Máximo', fmt(s.max,4)),
    UI.stat('Amplitude', fmt(s.range,4)), UI.stat('Mediana', fmt(s.median,4)),
    UI.stat('Assimetria', fmt(skew,4)), UI.stat('Curtose', fmt(kurt,4)),
    UI.stat('Q1', fmt(s.q1,4)), UI.stat('Q3', fmt(s.q3,4)),
    UI.stat('IQR', fmt(s.iqr,4))
  ].join('');
}

export function renderLog() {
  const list = document.getElementById('log-list');
  const badge = document.getElementById('alert-pill');
  const total = state.violations.length;
  badge.style.display = total ? 'flex' : 'none';
  document.getElementById('alert-count').textContent = total;
  list.innerHTML = '';
  state.logRendered = 0;
  if(!total) { list.innerHTML = '<div style="padding:24px; color:#aaa; text-align:center; font-style:italic;">Nenhuma anomalia detectada.</div>'; return; }
  appendLogs();
}

export function appendLogs() {
  const list = document.getElementById('log-list');
  const { violations, logRendered, logBatchSize, notes } = state;
  if (logRendered >= violations.length) return;
  const nextBatch = violations.slice(logRendered, logRendered + logBatchSize);

  const html = nextBatch.map(v => {
    const note = notes[`${v.chart}-${v.i}`];
    const icon = note ? '📝 ' : '';
    return `<div class="log-entry ${v.type}" data-chart="${v.chart}" data-idx="${v.i}">
      <div style="font-weight:600; color:var(--col-text); margin-bottom:4px; pointer-events:none;">${icon}${v.rule}</div>
      <div style="font-size:0.8rem; color:var(--col-muted; pointer-events:none;">
        <span style="font-weight:500; color:var(--col-primary); pointer-events:none;">${v.chart}</span> | Ponto #${v.i} | Valor: ${fmt(v.val, 3)}
      </div>
    </div>`;
  }).join('');

  const oldLoader = document.getElementById('log-loader');
  if (oldLoader) oldLoader.remove();

  list.insertAdjacentHTML('beforeend', html);
  state.logRendered += nextBatch.length;

  if (state.logRendered < violations.length) {
    list.insertAdjacentHTML('beforeend', `<div id="log-loader" class="log-loader-item">Carregando mais... (${state.logRendered}/${violations.length})</div>`);
  }
}

export function openModal(id) { document.getElementById(id).style.display = 'flex'; }
export function closeModal(id) { document.getElementById(id).style.display = 'none'; }
