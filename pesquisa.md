# Pesquisa Técnica e Plano de Melhorias

Este documento consolida a análise técnica da aplicação `CEP PRO` e propõe padrões para a implementação de melhorias estruturais, visando a modularização, manutenção e escalabilidade da ferramenta.

## 1. Identificação de Arquivos Afetados

Atualmente, a base de código consiste em um único arquivo monolítico. As melhorias técnicas afetarão a estrutura global do projeto, resultando na decomposição do arquivo `CEP PRO` em múltiplos componentes.

*   **Arquivo Original:** `CEP PRO` (contém HTML, CSS, JS e Web Worker inline).
*   **Novos Arquivos Propostos (Refatoração):**
    *   `index.html`: Estrutura semântica e importação de módulos.
    *   `css/style.css` (ou múltiplos arquivos CSS): Estilos extraídos e organizados (CSS Variables mantidas).
    *   `js/main.js`: Ponto de entrada da aplicação.
    *   `js/app.js`: Lógica de orquestração (Estado global).
    *   `js/ui.js`: Manipulação direta do DOM e Chart rendering.
    *   `js/spc.js`: Biblioteca de cálculos estatísticos (migrado do objeto `SPC`).
    *   `js/utils.js`: Funções utilitárias (formatadores, debouncers).
    *   `workers/worker.js`: Web Worker extraído para arquivo dedicado.

## 2. Padrões de Implementação Existentes

A análise do código atual (`CEP PRO`) revelou os seguintes padrões que devem ser considerados ou refatorados:

*   **Single Page Application (SPA) Vanilla:** A aplicação não usa frameworks reativos (React/Vue), manipulando o DOM diretamente via `document.getElementById` e `innerHTML`.
    *   *Padrão Atual:* Objeto global `App` serve como namespace e gerenciador de estado (`App.state`).
    *   *Padrão Atual:* `App.init()` faz o bootstrap.
*   **Web Worker Inline:** O Worker é definido dentro de uma tag `<script id="worker-js" type="javascript/worker">` e instanciado via `URL.createObjectURL(blob)`.
    *   *Obs:* Isso dificulta cache, linting e testes isolados do worker.
*   **Reatividade Manual:** Atualizações de interface são disparadas explicitamente (ex: `App.renderKPIs()`, `App.renderCharts()`) após mudanças de estado ou retorno do Worker.
    *   *Padrão Atual:* Uso de `debounce` para evitar recálculos excessivos em inputs.
*   **Bibliotecas Externas (CDN):**
    *   Plotly.js (Gráficos).
    *   SheetJS (xlsx) (Importação/Exportação).
    *   jStat (Estatística).

## 3. Documentação de Tecnologias e Padrões Externos

Para as melhorias técnicas, utilizaremos padrões modernos da Web (Modern Web APIs) para manter a aplicação leve e sem dependência de processos de build complexos (embora um bundler como Vite seja recomendado futuramente).

### 3.1. ES Modules (ESM)
Substituir o script monolítico por módulos nativos.
*   **Doc:** [MDN - JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
*   **Implementação:** `<script type="module" src="js/main.js"></script>`.

### 3.2. Web Workers API
Migrar o worker inline para um arquivo separado.
*   **Doc:** [MDN - Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
*   **Padrão Externo:**
    ```javascript
    // main.js
    const worker = new Worker('workers/worker.js');
    worker.postMessage(data);
    ```

### 3.3. Separação de Responsabilidades (MVC/MVVM Simplificado)
Adotar uma arquitetura mais limpa.
*   **Model:** O estado (`App.state`) e a lógica de negócios (`spc.js` e Worker).
*   **View:** O HTML e CSS.
*   **Controller/ViewModel:** `ui.js` e `app.js` que intermediam eventos do usuário e atualizações de tela.

### 3.4. CSS Variables e Metodologia
O projeto já usa CSS Variables (`:root`).
*   **Melhoria:** Separar definições de tema em `css/theme.css` e layout em `css/layout.css` para facilitar manutenção.

## 4. Estratégia de Migração

1.  **Renomear** `CEP PRO` para `index.html` (para servir corretamente em servidores web padrão).
2.  **Extrair** o CSS para arquivos externos.
3.  **Extrair** o Web Worker para `worker.js`.
4.  **Modularizar** o JS, separando `SPC` (lógica pura) de `UI` (DOM) e `App` (Estado).
5.  **Verificar** integridade das funcionalidades após a separação (testes manuais de regressão, já que não há testes automatizados).
