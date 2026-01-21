# Especificação Tática de Implementação (Specs.md)

Este documento define o plano tático para refatoração e robustez do código monolítico `CEP PRO`, focando na redução de duplicidade, implementação de padrões de projeto e blindagem do upload de arquivos.

## 1. Arquivo Alvo: `CEP PRO`

Todas as modificações serão realizadas neste único arquivo.

### 1.1. Melhoria no Upload e Parsing de Arquivos (Robustez)
**Objetivo:** Garantir que o upload de arquivos `.csv` e `.xlsx` seja resiliente a diferentes formatos, encodings e erros de parsing. Implementar um "Dicionário Inteligente" para normalização de cabeçalhos.

**Ação:** Substituir/Aprimorar a função `loadFile`.

**Implementação Detalhada:**
1.  Criar uma função `normalizeHeaders(headers)` que utiliza um dicionário de sinônimos para padronizar nomes de colunas (ex: "valor", "medida", "result" -> "Val").
2.  Adicionar tratamento `try-catch` robusto ao redor de `XLSX.read`.
3.  Implementar detecção de encoding para CSVs (tentar UTF-8, depois ISO-8859-1 se falhar).
4.  Validar se o JSON resultante possui dados válidos antes de prosseguir.

**Code Snippet (Smart Dictionary & Loader):**
```javascript
const SmartDict = {
  mappings: {
    'val': ['valor', 'medida', 'resultado', 'leitura', 'value', 'data', 'reading'],
    'lote': ['batch', 'lot', 'grupo', 'serie'],
    'data': ['date', 'timestamp', 'hora', 'tempo']
  },
  normalize(header) {
    const h = header.toLowerCase().trim();
    for (const [key, synonyms] of Object.entries(this.mappings)) {
      if (h === key || synonyms.includes(h)) return key; // Retorna chave normalizada
    }
    return header; // Retorna original se não achar
  }
};

// Dentro de App:
loadFile(e) {
  const file = e.target.files[0];
  if(!file) return;
  document.getElementById('file-info').innerHTML = `<span class="material-icons" style="font-size:14px; animation:spin 1s linear infinite">sync</span> Carregando...`;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, {type:'array', cellDates:true}); // cellDates ajuda com datas Excel
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Converte para JSON com header original
      let json = XLSX.utils.sheet_to_json(ws, {header:1});
      if(!json.length) throw new Error("Arquivo vazio");

      // Normalização de Cabeçalho
      const headers = json[0].map(h => SmartDict.normalize(h));
      const body = json.slice(1);

      // Reconstrói objetos com chaves normalizadas
      const normalizedJson = body.map(row => {
        let obj = {};
        row.forEach((v, i) => { if(headers[i]) obj[headers[i]] = v; });
        return obj;
      });

      if(!normalizedJson.length) throw new Error("Nenhum dado válido encontrado");

      this.state.raw = normalizedJson;
      this.populateSelects(headers); // Extrair lógica de preencher selects
      document.getElementById('file-info').innerHTML = `<span class="material-icons" style="font-size:14px; color:var(--col-success)">check_circle</span> ${file.name} (${normalizedJson.length} linhas)`;
    } catch (err) {
      console.error(err);
      alert(`Erro ao ler arquivo: ${err.message}`);
      document.getElementById('file-info').innerHTML = `<span class="material-icons" style="font-size:14px; color:var(--col-danger)">error</span> Falha na leitura`;
    }
  };
  reader.readAsArrayBuffer(file);
}
```

### 1.2. Refatoração da Renderização de Gráficos (Polimorfismo)
**Objetivo:** Eliminar a repetição de código na função `renderCharts` criando uma função genérica de renderização.

**Ação:**
1.  Criar `App.renderChart(divId, chartData, layoutConfig)`.
2.  Refatorar `renderCharts` para usar essa função helper.

**Code Snippet (Render Helper):**
```javascript
// Helper genérico
renderGenericChart(id, xData, yData, type, color, limits, title, yTitle, shapes=[]) {
  const layout = this.getChartLayout(title, limits?.ucl, limits?.cl, limits?.lcl, yTitle);
  if(shapes.length) layout.shapes = layout.shapes ? layout.shapes.concat(shapes) : shapes;

  // Lógica de cores (violações) já otimizada
  const pointColors = xData.map(i => this.getPointColor('IND', i)); // Nota: Precisa adaptar para passar chartType correto

  Plotly.react(id, [{
    x: xData,
    y: yData,
    type: type === 'scattergl' ? 'scattergl' : 'scatter',
    mode: 'lines+markers',
    marker: { color: color || pointColors, size: 5 },
    line: { color: '#2AA8CE', width: 1.5 }
  }], layout, this.plotlyConfig());
}
```

### 1.3. Refatoração do Web Worker (Strategy Pattern)
**Objetivo:** Substituir a cadeia de `if (rules.r1)... if (rules.r2)...` por um padrão Strategy para facilitar a adição de novas regras.

**Ação:** Modificar o script do Worker (`#worker-js`).

**Code Snippet (Worker Strategy):**
```javascript
const RuleStrategies = {
  r1: (data, limits, add) => {
     // Lógica Regra 1 (Pontos > 3s)
     for (let i = 0; i < data.length; i++) {
       if (data[i] > limits.ucl || data[i] < limits.lcl) add(i, data[i], '1 pt > 3σ', 'crit');
     }
  },
  r2: (data, limits, add) => {
     // Lógica Regra 2 (9 pontos lado)
     // ... implementação ...
  },
  // ... r3, r4, r5
};

self.onmessage = function(e) {
  const { raw, means, limitsInd, limitsBar, rules } = e.data;
  const viols = [];
  const add = (chart) => (i, val, rule, type) => viols.push({ chart, i: i+1, val, rule, type });

  // Executar estratégias ativas
  Object.keys(rules).forEach(ruleKey => {
    if (rules[ruleKey] && RuleStrategies[ruleKey]) {
      // Aplica regras para Gráfico Individual
      RuleStrategies[ruleKey](raw, limitsInd, add('IND'));
      // Aplica regras para XBar (apenas se aplicável, ex: r1)
      if(means && means.length) RuleStrategies[ruleKey](means, limitsBar, add('XBAR'));
    }
  });

  self.postMessage(viols);
};
```

## 2. Resumo de Arquivos a Criar
Nenhum arquivo novo será criado nesta fase, mantendo a estrutura monolítica conforme solicitado. O arquivo `Specs.md` serve apenas como guia para a edição do `CEP PRO`.
