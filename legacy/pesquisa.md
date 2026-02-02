# Pesquisa Técnica e Plano de Melhorias

Este documento consolida a análise técnica da aplicação `CEP PRO` e propõe padrões para a implementação de melhorias estruturais, visando a modularização, manutenção e escalabilidade da ferramenta.

## 1. Identificação de Arquivos Afetados

Atualmente, a base de código consiste em um único arquivo monolítico. As melhorias técnicas afetarão a estrutura global do projeto, resultando na decomposição do arquivo `CEP PRO` em múltiplos componentes.

*   **Arquivo Original:** `CEP PRO` (HTML, CSS, JS e Web Worker inline).
*   **Novos Arquivos Propostos (Refatoração):**
    *   `index.html`: Estrutura semântica e importação de módulos.
    *   `css/style.css`: Estilos globais e variáveis de tema.
    *   `css/layout.css`: Estilos de grid e responsividade.
    *   `js/main.js`: Ponto de entrada (Entry point) e inicialização.
    *   `js/state.js`: Gerenciamento do estado global (`App.state`).
    *   `js/ui.js`: Manipulação direta do DOM, Modais e Templates.
    *   `js/charts.js`: Configurações e renderização do Plotly.
    *   `js/utils.js`: Funções utilitárias (`fmt`, `debounce`, `downsamplePairs`).
    *   `workers/worker.js`: **Todo** o cálculo estatístico e verificação de regras.

## 2. Padrões de Implementação Existentes (Análise Profunda)

### 2.1. Arquitetura e Estado
*   **Padrão Namespace Global:** A aplicação reside inteiramente no objeto `App`.
*   **Estado Centralizado:** `App.state` armazena tudo: dados brutos (`raw`), processados (`means`, `stds`), limites de controle, estatísticas descritivas e configurações de UI (`window`, `logBatchSize`).
*   **Anti-pattern Identificado:** O Web Worker atual é subutilizado. Ele realiza apenas a verificação de *regras de controle* (loops `for` para detectar violações). O cálculo pesado (médias de subgrupos, desvios padrão, Anderson-Darling, CUSUM, EWMA) ocorre na **Main Thread** (`App.calc`), o que pode bloquear a UI em grandes datasets.

### 2.2. Interface e Gráficos
*   **Plotly.react:** O código já utiliza `Plotly.react` ao invés de `newPlot` para atualizações eficientes, um padrão excelente que deve ser mantido.
*   **Downsampling:** Existe uma função `downsamplePairs` (implementação manual de LTTB?) para otimizar a renderização de grandes séries temporais. Isso deve ser extraído para `utils.js` ou movido para o Worker.
*   **UI Templates:** O objeto `UI` contém strings literais (Template Strings) para gerar HTML dinâmico (KPIs, Stats). Isso é um padrão leve de "View" que pode ser expandido.

### 2.3. Dependências
*   **Plotly.js (v2.27.0):** Renderização gráfica.
*   **SheetJS (v0.20.3):** Parsing de Excel/CSV.
*   **jStat (latest):** Funções estatísticas (CDF, Distribuições).

## 3. Documentação de Tecnologias e Padrões Externos

### 3.1. ES Modules (ESM)
*   **Doc:** [MDN - JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
*   **Aplicação:** Usar `export const` e `import { ... }` para compartilhar funções e estado, eliminando o namespace global `App`.

### 3.2. Web Workers API (Offloading Real)
*   **Doc:** [MDN - Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
*   **Melhoria Proposta:** Mover **toda** a lógica do objeto `SPC` (cálculos matemáticos) para o Worker.
*   **Fluxo Novo:**
    1.  Main envia `raw data` + `config`.
    2.  Worker calcula estatísticas, limites e violações.
    3.  Worker retorna objeto completo `processed` + `viols`.
    4.  Main apenas renderiza.

### 3.3. Padrão de Projeto: State Management Simples (Store)
Ao invés de um objeto solto, usar um padrão Pub/Sub simples para notificar a UI.
*   **Exemplo:**
    ```javascript
    // state.js
    const listeners = new Set();
    let state = { ... };
    export const subscribe = (fn) => listeners.add(fn);
    export const update = (newState) => {
        state = { ...state, ...newState };
        listeners.forEach(fn => fn(state));
    };
    ```

## 4. Estratégia de Migração Detalhada

1.  **Isolamento do Worker:** Criar `workers/worker.js` e migrar as funções do objeto `SPC` para dentro dele. Remover a tag `<script id="worker-js">`.
2.  **Extração de Utilidades:** Mover `debounce`, `fmt`, `parseLocaleNumber` e `downsamplePairs` para `js/utils.js`.
3.  **Modularização do Plotly:** Criar `js/charts.js` que exporta funções como `renderControlChart(divId, data, limits)`.
4.  **Refatoração do Main:** `js/main.js` deve apenas inicializar os listeners de eventos e instanciar o Worker.
5.  **CSS Split:** Separar o bloco `<style>` gigante em arquivos CSS organizados.
