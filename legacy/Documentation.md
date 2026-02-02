# Documentação do CEP PRO

## 1. Visão Geral
O CEP PRO (Controle Estatístico de Processo Profissional) é uma ferramenta avançada de análise estatística desenvolvida para rodar inteiramente no navegador. Ela permite que engenheiros de qualidade, analistas e gestores realizem análises complexas de estabilidade e capacidade de processos sem a necessidade de softwares estatísticos pesados ou instalação de programas.

A ferramenta é distribuída como um arquivo único (.html), garantindo portabilidade e facilidade de uso em qualquer ambiente corporativo que disponha de um navegador moderno.

**Versão Atual:** V1.3 UI REFRESH

## 2. Funcionalidades Principais

### Importação de Dados
*   Suporte para arquivos Excel (.xlsx) e CSV (.csv).
*   Detecção automática de colunas numéricas.
*   Capacidade de selecionar coluna de dados e coluna de estratificação (opcional).

### Gráficos de Controle (Cartas de Controle)
O CEP PRO oferece diversos tipos de cartas de controle para monitorar a estabilidade do processo:

*   **I-MR (Individual - Amplitude Móvel):** Para dados individuais (tamanho de subgrupo n=1).
*   **X-Bar R (Média e Amplitude):** Para subgrupos pequenos (n entre 2 e 9).
*   **X-Bar S (Média e Desvio Padrão):** Para subgrupos maiores (n >= 10).
*   **Run Chart:** Gráfico de corrida para análise de tendências simples.
*   **Gráficos Avançados:**
    *   **CUSUM (Soma Acumulada):** Detecta pequenas mudanças na média do processo.
    *   **EWMA (Média Móvel Exponencialmente Ponderada):** Sensível a pequenas variações e tendências.

### Análise de Capacidade (Sixpack)
Um painel consolidado ("Sixpack") que fornece uma visão completa da saúde do processo:

*   Histograma com curva normal ajustada.
*   Gráficos de controle (Xbar e R/S).
*   Plotagem de Probabilidade Normal.
*   Gráfico de Capacidade (comparação entre histograma e limites de especificação).
*   Índices de Capacidade: Cp, Cpk, Pp, Ppk.

### Testes Estatísticos e Diagnósticos
*   **Estatística Descritiva:** Média, Mediana, Quartis, Desvio Padrão (Global e Dentro), Skewness (Assimetria), Kurtosis (Curtose).
*   **Teste de Normalidade:** Teste de Anderson-Darling para verificar se os dados seguem uma distribuição normal.
*   **Diagnóstico Automático:** O sistema analisa os dados e gera "insights" textuais sobre a estabilidade (regras violadas) e capacidade (adequação do Cpk), sugerindo ações corretivas (ex: "Investigue causas comuns", "Realize um DOE").

### Regras de Controle (Western Electric)
O sistema verifica automaticamente violações das seguintes regras para identificar causas especiais:

*   **Regra 1:** Qualquer ponto além de 3σ (limites de controle).
*   **Regra 2:** 9 pontos consecutivos do mesmo lado da linha central.
*   **Regra 3:** 2 de 3 pontos consecutivos além de 2σ (na mesma zona).
*   **Regra 4:** 4 de 5 pontos consecutivos além de 1σ (na mesma zona).
*   **Regra 5:** 6 pontos consecutivos em tendência (crescente ou decrescente).

### Outros Recursos
*   **Filtragem de Outliers:** Opção para remover outliers baseada no método IQR (Intervalo Interquartil).
*   **Janelamento Dinâmico:** Zoom e seleção de janela de dados (ex: últimos 50 pontos).
*   **Exportação:** Geração de relatórios em Excel e exportação de dados/logs em CSV.

## 3. Guia de Uso

### Passo 1: Carregar Dados
1.  Abra o arquivo `CEP PRO.html` no seu navegador.
2.  Clique no botão "Importar Arquivo" na barra lateral esquerda.
3.  Selecione seu arquivo .xlsx ou .csv. O sistema processará o arquivo e habilitará os seletores de coluna.

### Passo 2: Configurar Análise
1.  **Variável de Controle:** Selecione a coluna que contém os dados numéricos a serem analisados.
2.  **Fator de Estratificação (Opcional):** Selecione uma coluna para agrupar ou identificar os dados (ex: Lote, Operador).
3.  **Tamanho do Subgrupo (n):** Defina o tamanho do subgrupo para os gráficos X-Bar (padrão é 5).
4.  **Limites de Especificação:** Insira o LIE (Limite Inferior de Especificação) e o LSE (Limite Superior de Especificação) se desejar calcular os índices de capacidade (Cp/Cpk).

### Passo 3: Analisar Resultados
1.  Navegue pelas abas na parte superior (I-MR, X-Bar R, Sixpack, etc.) para visualizar os gráficos.
2.  Observe o painel de Diagnóstico (ícone `space_dashboard` no canto superior direito) para ver estatísticas detalhadas e interpretação automática.
3.  Verifique se há pontos vermelhos nos gráficos, indicando violações das regras de controle.

## 4. Detalhes Técnicos

### Arquitetura
O CEP PRO é uma SPA (Single Page Application) contida em um único arquivo HTML. Não requer servidor backend; todo o processamento é feito localmente no navegador do usuário (Client-Side).

### Bibliotecas Utilizadas
A ferramenta utiliza bibliotecas JavaScript modernas via CDN:
*   **Plotly.js:** Para renderização de gráficos interativos e responsivos.
*   **SheetJS (xlsx):** Para leitura e parsing de arquivos Excel e CSV.
*   **jStat:** Para funções de distribuição probabilística e cálculos estatísticos complexos.

### Performance (Web Workers)
Para garantir que a interface não congele durante o processamento de grandes conjuntos de dados, o CEP PRO utiliza Web Workers.
*   Os cálculos das regras de controle (verificação de violações em milhares de pontos) são delegados a uma thread separada (`worker-js`).
*   O worker retorna as violações encontradas, que são então plotadas nos gráficos principais.

### Estrutura do Código
*   **UTILS:** Funções auxiliares de formatação, debounce e manipulação de DOM.
*   **SPC MATH:** Módulo central contendo toda a lógica matemática (cálculo de média, desvio padrão, constantes A2/d2/etc., CUSUM, EWMA, Anderson-Darling).
*   **App:** Objeto principal que gerencia o estado da aplicação, eventos de UI e orquestração do fluxo de dados.

## 5. Fundamentação Estatística

### Constantes de Controle
O sistema utiliza constantes padrão para o cálculo dos limites de controle, variando conforme o tamanho do subgrupo (n):
*   **A2:** Para limites do gráfico X-Bar.
*   **d2:** Para estimativa de sigma baseada na amplitude média.
*   **D3/D4:** Para limites do gráfico R.
*   **B3/B4:** Para limites do gráfico S.

### Índices de Capacidade
*   **Cp:** (LSE - LIE) / 6σ (Mede o potencial do processo, ignorando a centralização).
*   **Cpk:** Min((Média - LIE)/3σ, (LSE - Média)/3σ) (Mede a capacidade real considerando a centralização).
*   **Sigma:** O desvio padrão utilizado para Cp/Cpk é o "Within" (R-bar / d2 ou S-bar / c4), representando a variação de curto prazo (Causas Comuns).
*   **Pp/Ppk:** Utilizam o desvio padrão global ("Overall") de todos os dados combinados.

### Testes
*   **Anderson-Darling:** Calcula a estatística A² e o p-valor correspondente para testar a hipótese nula de que os dados seguem uma distribuição normal. Se p-valor < 0.05, a normalidade é rejeitada.

## 6. Créditos
Desenvolvido por **Thiago Terto** (Engenheiro Químico).
