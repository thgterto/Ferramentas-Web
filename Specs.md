# Especificação Tática de Implementação (Specs.md)

Este documento define o plano tático para refatoração e robustez do código monolítico `CEP PRO`, focando na redução de duplicidade, implementação de padrões de projeto e blindagem do upload de arquivos.

## 1. Arquivo Alvo: `CEP PRO`

Todas as modificações serão realizadas neste único arquivo.

### 1.1. Melhoria no Upload e Parsing de Arquivos (Robustez)
**Objetivo:** Garantir que o upload de arquivos `.csv` e `.xlsx` seja resiliente a diferentes formatos, encodings e erros de parsing. Implementar um "Dicionário Inteligente" para normalização de cabeçalhos e **Detecção Automática de Separador Decimal**.

**Ação:** Substituir/Aprimorar a função `loadFile`, introduzir `SmartDict` e `DecimalDetector`.

**Implementação Detalhada:**
1.  **SmartDict:** Normaliza cabeçalhos (ex: "Valor" -> "val").
2.  **DecimalDetector:** Analisa as primeiras linhas dos dados para inferir se o separador decimal é vírgula (`,`) ou ponto (`.`).
3.  **loadFile:** Lê o arquivo, normaliza cabeçalhos, detecta o separador decimal e armazena no estado (`App.state.decimalSep`).
4.  **parseLocaleNumber:** Atualizada para aceitar o separador detectado e fazer o parsing correto.

**Code Snippet (SmartDict, Detector & LoadFile):**
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
      if (h === key || synonyms.includes(h)) return key;
    }
    return header;
  }
};

const DecimalDetector = {
  detect(data, limit=50) {
    let commaScore = 0, dotScore = 0;
    const sample = data.slice(0, limit);
    for (const row of sample) {
      for (const val of Object.values(row)) {
        if (typeof val === 'string') {
          // Heurística: Último separador não numérico define o decimal
          const clean = val.trim();
          const lastComma = clean.lastIndexOf(',');
          const lastDot = clean.lastIndexOf('.');

          if (lastComma > lastDot && lastComma > -1) commaScore++;
          else if (lastDot > lastComma && lastDot > -1) dotScore++;
        }
      }
    }
    return commaScore > dotScore ? ',' : '.';
  }
};

// Atualização em UTILS
function parseLocaleNumber(stringVal, decimalSep = '.') {
  if (typeof stringVal === 'number') return stringVal;
  if (!stringVal) return NaN;
  let str = stringVal.toString().trim();

  if (decimalSep === ',') {
    // Formato BR/EU (1.234,56) -> Remove ponto, troca vírgula por ponto
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato US (1,234.56) -> Remove vírgula
    str = str.replace(/,/g, '');
  }
  return parseFloat(str);
}

// Dentro de App:
loadFile(e) {
  const file = e.target.files[0];
  if(!file) return;
  document.getElementById('file-info').innerHTML = `<span class="material-icons" style="font-size:14px; animation:spin 1s linear infinite">sync</span> Carregando...`;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      let wb;

      // Verificar extensão para decidir estratégia (CSV vs XLSX)
      const isCSV = /\.(csv|txt)$/i.test(file.name);

      if (isCSV) {
         let text = "";
         try { text = new TextDecoder("utf-8").decode(data); } catch(e) { console.error(e); }

         // Detecta e normaliza decimal (vírgula -> ponto) no texto bruto
         const detection = DecimalDetector.detectAndNormalize(text);
         this.state.decimalSep = detection.separator;

         // Lê como string para preservar estrutura
         wb = XLSX.read(detection.normalizedText, {type:'string', raw:true});
      } else {
         // XLSX/XLS (Binário) - SheetJS lida nativamente
         this.state.decimalSep = '.'; // Padrão JS
         wb = XLSX.read(data, {type:'array', raw:true});
      }

      const ws = wb.Sheets[wb.SheetNames[0]];
      let json = XLSX.utils.sheet_to_json(ws, {header:1, raw:false});

      if(!json.length) throw new Error("Arquivo vazio");

      const headers = json[0].map(h => SmartDict.normalize(h));
      const body = json.slice(1);

      const normalizedJson = body.map(row => {
        let obj = {};
        row.forEach((v, i) => { if(headers[i]) obj[headers[i]] = v; });
        return obj;
      });

      if(!normalizedJson.length) throw new Error("Nenhum dado válido encontrado");

      this.state.raw = normalizedJson;
      this.populateSelects(headers);
      document.getElementById('file-info').innerHTML = `<span class="material-icons" style="font-size:14px; color:var(--col-success)">check_circle</span> ${file.name} (${normalizedJson.length} linhas)`;
    } catch (err) {
      console.error(err);
      alert(`Erro ao ler arquivo: ${err.message}`);
      document.getElementById('file-info').innerHTML = `<span class="material-icons" style="font-size:14px; color:var(--col-danger)">error</span> Falha na leitura`;
    }
  };
  reader.readAsArrayBuffer(file);
},

// Atualização em calc() para usar o separador
calc() {
  // ...
  let mapped = this.state.raw.map(r => ({
      val: parseLocaleNumber(r[col], this.state.decimalSep), // Passa o separador
      strat: stratCol ? r[stratCol] : 'Todos'
  })).filter(o => !isNaN(o.val));
  // ...
}
```

### 1.2. Refatoração da Renderização de Gráficos (Polimorfismo)
*(Mantido conforme versão anterior)*

### 1.3. Refatoração do Web Worker (Strategy Pattern)
*(Mantido conforme versão anterior)*
