# Análise Técnica da Codebase CEP PRO

Esta análise detalha as bibliotecas, padrões arquiteturais, componentes recorrentes e oportunidades de refatoração identificadas na base de código atual (`CEP PRO`).

## 1. Bibliotecas e Dependências

A aplicação utiliza um conjunto enxuto de bibliotecas externas via CDN, focadas em visualização de dados e cálculo estatístico.

| Biblioteca | Versão | Propósito | Observações |
| :--- | :--- | :--- | :--- |
| **Plotly.js** | `2.27.0` | Renderização de gráficos interativos (Cartas de Controle, Histogramas). | Biblioteca robusta, mas pesada. O uso da versão minificada via CDN é adequado para o modelo "single-file", mas o versionamento fixo é uma boa prática para evitar quebras. |
| **SheetJS (xlsx)** | `0.20.3` | Parsing de arquivos Excel (.xlsx) e CSV. | Essencial para a funcionalidade de "Importar Arquivo". Versão estável. |
| **jStat** | `latest` | Funções de distribuição probabilística (CDF Normal, etc.). | O uso da tag `latest` apresenta risco de estabilidade se a API mudar. Recomenda-se fixar uma versão específica. |
| **Google Fonts** | N/A | Tipografia (IBM Plex Sans) e Ícones (Material Icons). | Dependência externa de UI. |

## 2. Padrões de Código "State of the Art" (SOTA) & Modernos

Apesar da estrutura monolítica (arquivo único), o código emprega diversos padrões modernos de desenvolvimento web:

*   **Web Workers (Inline):** O uso de um Web Worker (definido via Blob URL) para offloading de cálculos pesados (verificação de regras em loops longos) é um padrão de alta performance (SOTA) para garantir que a UI não congele (Main Thread livre).
*   **CSS Variables (Custom Properties):** Uso extensivo de variáveis (`--col-primary`, `--bg-body`) para definição de temas e consistência visual. Facilita manutenção e implementação de "Dark Mode" futuro.
*   **CSS Grid & Flexbox:** O layout principal utiliza CSS Grid para a estrutura (Sidebar, Stage, Panel) e Flexbox para componentes internos, demonstrando domínio de layout moderno.
*   **Reatividade (Plotly.react):** A escolha de `Plotly.react` em vez de `Plotly.newPlot` para atualizações aproveita o algoritmo de diffing interno da biblioteca, otimizando a performance de renderização.
*   **Data Downsampling (LTTB):** A função `downsamplePairs` implementa um algoritmo de redução de pontos (provavelmente Largest-Triangle-Three-Buckets ou similar) para visualização eficiente de grandes datasets.

## 3. Componentes Recorrentes

Identificamos padrões de UI que são repetidos ao longo do código e poderiam ser encapsulados em componentes (web components ou funções geradoras de HTML):

*   **Chart Containers:** A estrutura `div.chart-container` > `div.chart-header` + `button.chart-action` + `div.plot-div` se repete para cada gráfico (Ind, MR, XBar, R, S, Run, etc.).
*   **KPI Cards:** Os cards de estatísticas no topo (`.kpi-item`) seguem um template rígido gerado pela função `UI.kpi`.
*   **Modais:** A estrutura de overlay + box + header + body é repetida para os modais de "Chart Expandido", "Insights" e "Notas".
*   **Tabs:** O padrão de navegação por abas (`.tab-btn` e `.tab-pane`) é manual e repetitivo.
*   **Sidebar Groups:** Grupos de inputs na barra lateral seguem o padrão `div.sidebar-group` > `div.group-title` + inputs.

## 4. Funções Polimorfizáveis e Oportunidades de Abstração

Várias seções do código JavaScript apresentam lógica similar que pode ser refatorada para funções mais genéricas (polimorfismo):

### 4.1. Renderização de Gráficos (`renderCharts`)
Atualmente, a função `renderCharts` chama `Plotly.react` explicitamente para cada ID de gráfico (`plt-ind`, `plt-mr`, etc.).
*   **Oportunidade:** Criar uma função genérica `renderChart(containerId, data, layoutConfig)` que aceite a configuração e os dados. Isso reduziria drasticamente o tamanho da função `renderCharts` e facilitaria a adição de novos gráficos.

### 4.2. Tratamento de Regras no Worker
O código do Worker possui múltiplos blocos `if` (r1, r2, r3...) com lógica de iteração muito parecida (janela deslizante).
*   **Oportunidade:** Implementar um padrão "Strategy" onde cada regra é uma função que aceita o array de dados e retorna violações. O loop principal apenas iteraria sobre as "Regras Ativas".

### 4.3. Cálculo de Limites (`calc`)
O cálculo de limites (UCL, CL, LCL) para diferentes cartas (Ind, XBar, R, S) segue a mesma estrutura matemática `Média +/- k * Sigma`.
*   **Oportunidade:** Uma função `calculateControlLimits(centerLine, sigma, multiplier)` poderia substituir as definições literais de objetos.

### 4.4. Handlers de Eventos
A inicialização de eventos (`init`) adiciona listeners manualmente para cada ID.
*   **Oportunidade:** Usar "Event Delegation" ou um mapa de configurações `id -> handler` para automatizar o binding de eventos.
