# Especificação de Refatoração Tática

Esta especificação define o plano de ação para refatorar o monolito `CEP PRO` em uma arquitetura modular baseada em ES Modules e Web Workers.

## 1. Estrutura de Diretórios e Arquivos

### `index.html` (Modificar)
*   **O que fazer:**
    *   Remover todo o CSS inline (bloco `<style>`) e substituir por `<link rel="stylesheet" href="css/style.css">`.
    *   Remover o script do Web Worker inline (`<script id="worker-js" ...>`).
    *   Remover o script principal inline.
    *   Adicionar `<script type="module" src="js/main.js"></script>` no final do `<body>`.
    *   Manter as importações de CDN (Plotly, SheetJS, jStat).

### `css/style.css` (Criar)
*   **O que fazer:**
    *   Mover todas as definições de variáveis CSS (`:root`) e estilos globais para este arquivo.
    *   Incluir estilos de componentes (Botões, Inputs, Sidebar, Header).

### `css/layout.css` (Criar)
*   **O que fazer:**
    *   Mover estilos específicos de layout (Grid principal, classes `hide-sidebar`, `hide-panel`, media queries).
    *   Importar este arquivo em `style.css` via `@import` ou linkar separadamente no HTML.

### `js/utils.js` (Criar)
*   **O que fazer:**
    *   Extrair e exportar as seguintes funções:
        *   `debounce(func, wait)`
        *   `fmt(n, d)`
        *   `parseLocaleNumber(stringVal)`
        *   `downsamplePairs(idx, data, threshold)`
*   **Snippet:**
    ```javascript
    export function fmt(n, d=2) { ... }
    export function debounce(func, wait) { ... }
    ```

### `js/state.js` (Criar)
*   **O que fazer:**
    *   Implementar um store simples (Pub/Sub) para gerenciar o estado que antes ficava em `App.state`.
    *   O estado inicial deve conter: `raw`, `data`, `col`, `processed`, `limits`, `stats`, `violations`, `notes`.
*   **Snippet:**
    ```javascript
    const listeners = new Set();
    let state = {
        raw: [], data: [], col: null,
        // ...resto do estado inicial
    };

    export function subscribe(fn) { listeners.add(fn); }
    export function getState() { return state; }
    export function setState(updates) {
        state = { ...state, ...updates };
        listeners.forEach(listener => listener(state));
    }
    ```

### `js/ui.js` (Criar)
*   **O que fazer:**
    *   Mover a lógica de manipulação direta do DOM (ex: `document.getElementById`).
    *   Exportar funções para atualizar partes específicas da UI:
        *   `renderKPIs(stats, limits)`
        *   `renderStatsPanel(stats)`
        *   `renderLog(violations)`
        *   `toggleSidebar()`, `togglePanel()`
        *   `showLoader()`, `hideLoader()`

### `js/charts.js` (Criar)
*   **O que fazer:**
    *   Centralizar a lógica do Plotly.
    *   Exportar função `initCharts()` para criar os plots vazios.
    *   Exportar `renderCharts(state)` que recebe o estado e chama `Plotly.react`.
    *   Mover as configurações de layout (`getChartLayout`, `baseLayout`) para variáveis internas ou funções helpers deste módulo.

### `workers/worker.js` (Criar)
*   **O que fazer:**
    *   Mover **todo** o objeto `SPC` (lógica estatística) para este arquivo.
    *   Receber mensagens contendo `{ data, config, rules }`.
    *   Executar **todos** os cálculos aqui (não apenas as regras):
        *   Médias de subgrupos e Desvio Padrão (`means`, `ranges`, `stds`).
        *   Limites de controle (`limits`).
        *   Estatísticas descritivas (`moments`, `describe`).
        *   Testes avançados (`andersonDarling`, `runTest`, `cusum`, `ewma`).
        *   Verificação de violações (Regras 1-5).
    *   Retornar objeto completo com resultados prontos para renderização.

### `js/main.js` (Criar)
*   **O que fazer:**
    *   Importar módulos (`state`, `ui`, `charts`, `utils`).
    *   Instanciar o Web Worker: `const worker = new Worker('workers/worker.js');`.
    *   Configurar listeners de eventos do DOM (inputs, botões, upload de arquivo).
    *   Gerenciar o fluxo:
        1.  Usuário carrega arquivo -> `state.raw` atualizado.
        2.  Usuário muda parâmetro -> `main` envia dados pro `worker`.
        3.  `worker` retorna resultados -> `state` atualizado -> `ui` e `charts` reagem.

## 2. Passo a Passo da Refatoração

1.  **Preparação:** Criar as pastas `js`, `css`, `workers`.
2.  **CSS:** Migrar estilos inline para `css/style.css`.
3.  **Utils:** Migrar funções utilitárias para `js/utils.js`.
4.  **Worker:** Criar `workers/worker.js`, mover lógica `SPC` e adaptar `onmessage` para realizar todos os cálculos.
5.  **Charts & UI:** Criar módulos de UI e Charts.
6.  **Main & State:** Criar o `entry point` e o gerenciador de estado, conectando tudo.
7.  **Limpeza:** Remover código antigo de `index.html`.
