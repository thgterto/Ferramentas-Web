# Especificação de Implementação (Refatoração Modular)

Esta especificação define a refatoração do arquivo monolítico `CEP PRO` para uma arquitetura modular baseada em ES Modules e Web Workers, conforme definido na pesquisa técnica.

## Arquivos a serem Criados

### 1. `index.html`
**O que fazer:**
*   Criar o arquivo HTML base substituindo o antigo `CEP PRO`.
*   Manter a estrutura do DOM (Header, Sidebar, Stage, Panel, Modals).
*   **Importante:** Remover todo o CSS inline (`<style>`) e JavaScript inline (`<script>`).
*   Adicionar links para os novos arquivos CSS: `<link rel="stylesheet" href="css/style.css">` e `<link rel="stylesheet" href="css/layout.css">`.
*   Adicionar o script de entrada como módulo: `<script type="module" src="js/main.js"></script>`.
*   Manter as bibliotecas externas via CDN (Plotly, SheetJS) no `<head>`. A biblioteca `jStat` não deve ser incluída aqui, pois será usada dentro do Worker.

### 2. `css/style.css`
**O que fazer:**
*   Extrair todas as variáveis de cores e configurações globais (`:root`) do bloco `<style>` original.
*   Extrair estilos de componentes: Botões (`.btn`), Inputs, Badges, Modals, Tipografia.
*   Não incluir estilos de layout (grid principal).

### 3. `css/layout.css`
**O que fazer:**
*   Extrair estilos estruturais do grid principal (`body`, `.header`, `.sidebar`, `.stage`, `.panel`).
*   Incluir regras de responsividade e classes de utilidade de layout (ex: `.hide-sidebar`).

### 4. `js/utils.js`
**O que fazer:**
*   Criar um módulo utilitário exportando as funções auxiliares puras.
*   Extrair e exportar: `debounce`, `fmt`, `parseLocaleNumber`.
*   Extrair e exportar: `downsamplePairs` (otimização de dados).

### 5. `js/state.js`
**O que fazer:**
*   Implementar um gerenciador de estado simples (Store Pattern).
*   Definir o estado inicial (similar ao `App.state` original).
*   Exportar funções `subscribe`, `update` e `getState`.

**Snippet (da pesquisa):**
```javascript
const listeners = new Set();
let state = {
    raw: [], data: [], col: null,
    processed: { vals:[], means:[], ranges:[], stds:[] },
    limits: {}, stats: {}, violations: [], notes: {},
    window: { size: 0, offset: 0 },
    // ... outros estados iniciais
};

export const getState = () => state;

export const subscribe = (fn) => listeners.add(fn);

export const update = (newState) => {
    state = { ...state, ...newState };
    listeners.forEach(fn => fn(state));
};
```

### 6. `workers/worker.js`
**O que fazer:**
*   Este arquivo conterá **toda** a lógica pesada e matemática.
*   Adicionar `importScripts('https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js');` no topo para carregar o jStat.
*   Migrar todo o objeto `SPC` (atualmente no main thread) para dentro do worker.
*   Implementar a lógica de mensagem (`self.onmessage`):
    1.  Receber dados brutos (`raw`) e configurações.
    2.  Executar cálculos (Médias, Desvios, Constantes, Anderson-Darling, CUSUM, EWMA).
    3.  Executar verificação de regras (Western Electric) - lógica que já estava no worker antigo.
    4.  Retornar objeto completo com dados processados e violações.

### 7. `js/charts.js`
**O que fazer:**
*   Criar módulo responsável exclusivamente pela renderização do Plotly.
*   Exportar funções específicas: `renderControlCharts(data, limits, violations)`, `renderSixpack(...)`, `renderRunChart(...)`, `renderAdvanced(...)`.
*   Abstrair configurações de layout (migrar `getChartLayout`, `baseLayout`, `plotlyConfig`).
*   Usar `Plotly.react` para atualizações.

### 8. `js/ui.js`
**O que fazer:**
*   Criar módulo para manipulação do DOM (exceto gráficos).
*   Exportar funções para atualizar painéis: `renderKPIs(stats)`, `renderStatsPanel(stats)`, `renderLog(violations)`.
*   Gerenciar interações de UI: `toggleSidebar`, `switchTab`, `openModal`.
*   O objeto `UI` original (templates literais) deve ser movido para cá.

### 9. `js/main.js`
**O que fazer:**
*   Ponto de entrada da aplicação.
*   Instanciar o Worker: `const worker = new Worker('workers/worker.js');`.
*   Configurar listeners de eventos (Input de arquivo, mudanças de select, botões).
*   Conectar o fluxo de dados:
    *   Evento UI -> `worker.postMessage`
    *   `worker.onmessage` -> `State.update(data)`
    *   `State.subscribe` -> Chama funções de renderização de `js/charts.js` e `js/ui.js`.

## Arquivos a serem Modificados / Removidos

### `CEP PRO` (Arquivo Original)
**O que fazer:**
*   Este arquivo serve apenas como **fonte** para a refatoração.
*   Após a criação da nova estrutura e verificação de funcionamento, este arquivo deverá ser removido.

---
**Observação:** A implementação deve seguir rigorosamente a separação de responsabilidades. Cálculos estatísticos **não** devem permanecer no thread principal (`js/main.js` ou `js/ui.js`), devendo residir exclusivamente em `workers/worker.js`.
