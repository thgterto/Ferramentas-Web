# Ferramentas-Web
Repositório ferramentas em HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>CEP Industrial | v1.3.4</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

    <style>
        :root {
            --bg-app: #F8FAFC; 
            --surface: #FFFFFF;
            --text-main: #334155;
            --text-muted: #64748B;
            --col-brand: #44546A;
            --col-alert: #EF4444;
            --col-warn: #F59E0B;
            --col-ok: #10B981;
            --border: #E2E8F0;
            --shadow-card: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        * { box-sizing: border-box; outline: none; }
        body {
            font-family: 'Roboto', sans-serif; background: var(--bg-app); color: var(--text-main);
            margin: 0; height: 100vh; display: grid; overflow: hidden;
            grid-template-columns: 290px 1fr 340px; grid-template-rows: 64px 1fr;
        }

        /* HEADER */
        .header {
            grid-column: 1 / -1; background: #1E293B; color: white;
            display: flex; align-items: center; justify-content: space-between; padding: 0 25px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index: 50;
        }
        .brand-area { display: flex; align-items: center; gap: 10px; }
        .brand-logo { font-size: 1.2rem; font-weight: 900; letter-spacing: 0.5px; color: #F1F5F9; }
        .brand-ver { background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; color: #CBD5E0; }

        .kpi-deck { display: flex; gap: 30px; align-items: center; }
        .kpi-box { display: flex; flex-direction: column; align-items: flex-end; cursor: help; }
        .kpi-lbl { font-size: 0.7rem; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 2px; }
        .kpi-val-row { display: flex; align-items: center; gap: 8px; }
        .kpi-val { font-size: 1.4rem; font-weight: 900; color: #F8FAFC; font-family: 'Roboto Mono', monospace; }
        
        .status-badge {
            font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;
            text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;
        }
        .bdg-ok { background: #064E3B; color: #34D399; border: 1px solid #059669; }
        .bdg-warn { background: #78350F; color: #FBBF24; border: 1px solid #D97706; }
        .bdg-bad { background: #7F1D1D; color: #F87171; border: 1px solid #DC2626; }

        /* SIDEBAR */
        .sidebar {
            grid-row: 2; background: var(--surface); border-right: 1px solid var(--border);
            padding: 20px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto;
        }
        .grp-title { 
            font-size: 0.75rem; font-weight: 800; color: var(--col-brand); 
            text-transform: uppercase; margin-bottom: 8px; 
            border-left: 3px solid var(--col-brand); padding-left: 8px; 
            display: flex; justify-content: space-between; align-items: center;
        }
        
        .btn-action {
            background: var(--col-brand); color: white; width: 100%; padding: 10px;
            border: none; border-radius: 6px; font-weight: 700; cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            font-size: 0.85rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: 0.2s;
        }
        .btn-action:hover { background: #334155; transform: translateY(-1px); }

        .btn-mini {
            background: #E2E8F0; color: var(--text-main); border: none; 
            padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer;
        }
        .btn-mini:hover { background: #CBD5E0; }
        .btn-mini.active { background: var(--col-brand); color: white; }

        input, select {
            width: 100%; padding: 8px 10px; border: 1px solid #CBD5E0; border-radius: 5px;
            font-size: 0.9rem; color: var(--text-main);
        }
        input:focus { border-color: var(--col-brand); }

        .author-card {
            margin-top: auto; background: white; padding: 15px; border-radius: 8px;
            box-shadow: var(--shadow-card); border: 1px solid var(--border);
            display: flex; flex-direction: column; gap: 3px;
        }
        .author-name { font-weight: 800; color: #1E293B; font-size: 0.95rem; }
        .author-role { font-size: 0.8rem; color: var(--col-brand); font-weight: 600; margin-bottom: 5px; }
        .author-link { text-decoration: none; font-size: 0.8rem; color: #0077B5; font-weight: 700; display: flex; align-items: center; gap: 5px; }

        /* STAGE */
        .stage {
            grid-row: 2; background: var(--bg-app); padding: 20px; gap: 15px;
            display: grid; 
            grid-template-rows: 2fr 1.2fr 1.5fr; 
            position: relative;
        }
        .chart-box {
            background: white; border-radius: 8px; border: 1px solid var(--border);
            position: relative; overflow: hidden; box-shadow: var(--shadow-card);
            transition: box-shadow 0.3s;
        }
        .chart-box:hover { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .chart-lbl {
            position: absolute; top: 10px; left: 15px; z-index: 10;
            background: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 4px;
            font-size: 0.75rem; font-weight: 800; color: var(--col-brand); text-transform: uppercase;
            border: 1px solid #E2E8F0; pointer-events: none;
        }

        .fab-stack { position: absolute; top: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 20; }
        .fab {
            width: 45px; height: 45px; background: white; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; cursor: pointer;
            color: var(--col-brand); box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.2s;
        }
        .fab:hover { background: var(--col-brand); color: white; transform: scale(1.1); }

        /* PANEL */
        .panel {
            grid-row: 2; background: var(--surface); border-left: 1px solid var(--border);
            display: flex; flex-direction: column; overflow-y: auto;
        }
        .sec-header {
            padding: 12px 16px; background: #F1F5F9; font-size: 0.75rem; font-weight: 800;
            color: var(--col-brand); text-transform: uppercase; border-bottom: 1px solid var(--border);
        }
        .stat-row { 
            padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; 
            cursor: help; /* Indica tooltip */
        }
        .st-k { font-size: 0.8rem; color: #64748B; font-weight: 500; }
        .st-v { font-size: 0.9rem; font-weight: 700; color: #334155; font-family: 'Roboto Mono', monospace; }

        .log-item {
            padding: 12px 16px; border-bottom: 1px solid #E2E8F0; cursor: pointer; border-left: 4px solid transparent;
        }
        .log-item:hover { background: #F8FAFC; }
        .log-item.crit { border-left-color: var(--col-alert); background: #FEF2F2; }
        .log-item.warn { border-left-color: var(--col-warn); background: #FFFBEB; }

        .modal-mask {
            position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 99;
            display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px);
        }
        .modal-box {
            background: white; width: 90%; height: 85%; border-radius: 12px;
            padding: 10px; position: relative; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }

        #loader {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255,255,255,0.9); display: none; z-index: 100;
            align-items: center; justify-content: center; flex-direction: column;
            color: var(--col-brand); font-weight: 800;
        }

        #msg {
            font-size: 0.8rem;
            color: var(--col-alert);
            margin-top: 8px;
            display: none;
        }
    </style>
</head>
<body>

<header class="header">
    <div class="brand-area">
        <span class="material-icons" style="font-size:1.5rem; color:#94A3B8">analytics</span>
        <div><div class="brand-logo">CEP INDUSTRIAL</div><span class="brand-ver">v1.3.4</span></div>
    </div>
    <div class="kpi-deck">
        <div class="kpi-box" title="Cpk: Capacidade real do processo considerando a centralização. Se < 1, processo incapaz; se ≥ 1.33, capaz.">
            <div class="kpi-lbl">Cpk (Potencial)</div>
            <div class="kpi-val-row">
                <span class="kpi-val" id="h-cpk">--</span>
                <span id="tag-cpk" class="status-badge" style="display:none"></span>
            </div>
        </div>
        <div class="kpi-box" title="Ppk: Desempenho real do processo a longo prazo (sigma global). Mostra como o processo realmente rodou.">
            <div class="kpi-lbl">Ppk (Performance)</div>
            <div class="kpi-val-row">
                <span class="kpi-val" id="h-ppk">--</span>
                <span id="tag-ppk" class="status-badge" style="display:none"></span>
            </div>
        </div>
        <div class="kpi-box" title="PPM Estimado: Número esperado de defeitos por milhão se o processo continuar assim.">
            <div class="kpi-lbl">PPM (Estimado)</div>
            <div class="kpi-val" id="h-ppm">--</div>
        </div>
    </div>
</header>

<aside class="sidebar">
    <div>
        <div class="grp-title">1. Dados</div>
        <button class="btn-action" onclick="document.getElementById('fileInput').click()">
            <span class="material-icons">upload_file</span> IMPORTAR ARQUIVO
        </button>
        <input type="file" id="fileInput" accept=".csv,.xlsx" style="display:none">
        <div id="msg"></div>
    </div>

    <div style="margin-top:20px">
        <div class="grp-title">2. Configuração</div>
        <select id="selY" style="width:100%; margin-bottom:10px"><option value="">Carregue arquivo...</option></select>
        
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px">
            <input type="number" id="nSize" value="5" min="2" style="width:70px" title="Tamanho Subgrupo">
            <span style="font-size:0.8rem; color:#64748B">Tamanho (n)</span>
        </div>

        <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;" title="Remove pontos extremos usando a regra de amplitude interquartil (1.5*IQR).">
            <input type="checkbox" id="chk-outliers"> Filtrar Outliers (IQR)
        </label>
    </div>

    <div style="margin-top:20px">
        <div class="grp-title">3. Especificação</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px">
            <input type="number" id="lie" placeholder="LIE (Min)">
            <input type="number" id="lse" placeholder="LSE (Max)">
        </div>
    </div>

    <div style="margin-top:20px">
        <div class="grp-title">
            4. Regras (Nelson)
            <span class="material-icons" style="font-size:0.9rem; color:#94A3B8; cursor:help" title="Testes estatísticos para detectar causas especiais de variação (padrões não aleatórios).">help</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px; font-size:0.8rem; color:#334155">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;" title="R1: Indica um evento extremo fora do controle estatístico (3 desvios-padrão).">
                <input type="checkbox" id="rule-1" checked> 1) 1 ponto além de 3σ
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;" title="R2: Indica deslocamento sustentado da média do processo.">
                <input type="checkbox" id="rule-2" checked> 2) 9 pontos no mesmo lado da média
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;" title="R3: Alerta precoce de que o processo está saindo do centro.">
                <input type="checkbox" id="rule-3" checked> 3) 2 de 3 pontos além de 2σ (mesmo lado)
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;" title="R4: Detecta pequenas mudanças ou tendências sutis na média.">
                <input type="checkbox" id="rule-4" checked> 4) 4 de 5 pontos além de 1σ (mesmo lado)
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;" title="R5: Identifica uma tendência contínua de aumento ou diminuição (desgaste, aquecimento, etc.).">
                <input type="checkbox" id="rule-5" checked> 5) Tendência: 6 pts cresc/decresc
            </label>
        </div>
    </div>

    <div style="margin-top:20px">
        <div class="grp-title">5. Janela & Exportação</div>
        <div style="display:flex; gap:5px; margin-bottom:8px">
            <button class="btn-mini" onclick="App.setWindow(50)">50</button>
            <button class="btn-mini" onclick="App.setWindow(100)">100</button>
            <button class="btn-mini" onclick="App.setWindow(200)">200</button>
            <button class="btn-mini" onclick="App.setWindow(0)" title="Todos">ALL</button>
        </div>
        <input type="number" id="win-last" min="1" placeholder="Manual (ex: 500)" style="margin-bottom:10px">
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px">
            <button class="btn-action" style="font-size:0.75rem" onclick="App.exportSeries()">
                <span class="material-icons" style="font-size:1rem">table_view</span> SÉRIE
            </button>
            <button class="btn-action" style="font-size:0.75rem" onclick="App.exportEvents()">
                <span class="material-icons" style="font-size:1rem">warning</span> EVENTOS
            </button>
        </div>
    </div>

    <div class="author-card">
        <div style="font-size:0.7rem; color:#94A3B8; font-weight:600; text-transform:uppercase">Desenvolvido por</div>
        <div class="author-name">Thiago Terto</div>
        <div class="author-role">Eng. Químico</div>
        <a href="https://www.linkedin.com/in/thiago-terto-eng-qu%C3%ADmico/" target="_blank" class="author-link">
            <span class="material-icons" style="font-size:0.9rem">link</span> LinkedIn
        </a>
    </div>
</aside>

<section class="stage">
    <div id="loader">CALCULANDO...</div>
    
    <div class="chart-box">
        <div class="chart-lbl">Carta I (Individuais)</div>
        <div id="chart-top" style="width:100%; height:100%"></div>
    </div>
    
    <div class="chart-box">
        <div class="chart-lbl">Carta MR (Amplitude Móvel)</div>
        <div id="chart-mr" style="width:100%; height:100%"></div>
    </div>

    <div class="chart-box">
        <div class="chart-lbl">Carta X-Bar (Médias)</div>
        <div id="chart-btm" style="width:100%; height:100%"></div>
    </div>

    <div class="fab-stack">
        <div class="fab" onclick="App.openModal('cap')" title="Capabilidade"><span class="material-icons">equalizer</span></div>
        <div class="fab" onclick="App.openModal('box')" title="Boxplot"><span class="material-icons">candlestick_chart</span></div>
        <div class="fab" onclick="App.openModal('pareto')" title="Pareto de causas"><span class="material-icons">bar_chart</span></div>
    </div>
</section>

<!-- MODAL PLOTS -->
<div class="modal-mask" id="modal-overlay">
    <div class="modal-box">
        <span class="material-icons" onclick="App.closeModal()" style="position:absolute; top:15px; right:15px; cursor:pointer; z-index:10; font-size:2rem; color:#94A3B8">close</span>
        <div id="modal-plot-area" style="width:100%; height:100%"></div>
    </div>
</div>

<!-- MODAL NOTES -->
<div class="modal-mask" id="note-overlay" style="z-index:120; display:none;">
    <div class="modal-box" style="width:480px; height:auto; max-height:80%; padding:20px; display:flex; flex-direction:column;">
        <span class="material-icons" onclick="App.closeNoteModal()" style="position:absolute; top:15px; right:15px; cursor:pointer; font-size:1.8rem; color:#94A3B8">close</span>
        <h3 style="margin:0 0 5px 0; font-size:1.1rem; color:#1E293B;">Anotar Causa Especial</h3>
        <div style="font-size:0.85rem; color:#64748B; margin-bottom:15px; border-bottom:1px solid #E2E8F0; padding-bottom:10px;">
            Ponto <span id="note-point-label" style="font-weight:700; color:#334155;">#-</span> • Gráfico: <span id="note-chart-label" style="font-weight:700; color:#334155;">-</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px; flex:1;">
            <label style="font-size:0.85rem; font-weight:700; color:#475569;">
                Causa atribuível (O que houve?)
                <textarea id="note-cause" rows="2" style="width:100%; margin-top:4px; padding:8px; border:1px solid #CBD5E0; border-radius:4px; resize:vertical; font-family:sans-serif;"></textarea>
            </label>
            <label style="font-size:0.85rem; font-weight:700; color:#475569;">
                Ação corretiva (O que foi feito?)
                <textarea id="note-action" rows="2" style="width:100%; margin-top:4px; padding:8px; border:1px solid #CBD5E0; border-radius:4px; resize:vertical; font-family:sans-serif;"></textarea>
            </label>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button class="btn-action" style="width:auto; padding:8px 16px; background:#94A3B8;" onclick="App.clearNoteForCurrent()">Limpar</button>
            <button class="btn-action" style="width:auto; padding:8px 16px;" onclick="App.saveNoteForCurrent()">Salvar Anotação</button>
        </div>
    </div>
</div>

<aside class="panel">
    <div class="sec-header">Estatísticas Descritivas</div>
    <div id="stats-container"></div>
    <div id="cap-comment" style="padding:10px 16px; font-size:0.8rem; color:#475569; background:#F8FAFC; border-bottom:1px solid #E2E8F0;"></div>
    <div class="sec-header">Causas Especiais (Log)</div>
    <div id="log-list" style="flex:1; overflow-y:auto"></div>
</aside>

<script id="worker-js" type="javascript/worker">
    self.onmessage = function(e) {
        const { raw, mr, means, limitsInd, limitsMr, limitsBar, sigmaBar, rules } = e.data;
        const viols = [];

        function addViol(chart, i, x, v, c, d, t, ruleId) {
            viols.push({ chart, i, x, v, c, d, t, ruleId });
        }

        // 1) REGRA 1 (3 sigma)
        if (rules.r1) {
            for (let i = 0; i < raw.length; i++) {
                if (raw[i] > limitsInd.ucl || raw[i] < limitsInd.lcl) {
                    addViol('IND', i, i + 1, raw[i], 'Causa Especial (3σ)', 'Ponto individual fora dos limites', 'crit', 'R1');
                }
            }
            for (let i = 0; i < mr.length; i++) {
                if (mr[i] > limitsMr.ucl) {
                    addViol('MR', i + 1, i + 2, mr[i], 'Instabilidade (3σ)', 'Amplitude móvel alta', 'warn', 'R1');
                }
            }
            for (let i = 0; i < means.length; i++) {
                const val = means[i];
                if (val > limitsBar.ucl || val < limitsBar.lcl) {
                    addViol('XBAR', i, i + 1, val, 'Fora de Controle (3σ)', 'Média subgrupo fora dos limites', 'crit', 'R1');
                }
            }
        }

        // 2) REGRA 2 (9 pts lado)
        if (rules.r2 && means.length >= 9
