# Guia do usuário

Este guia mostra como criar, ajustar e exportar gráficos no Graficário. Para
a lista de tipos de gráfico e o formato de dados de cada um, consulte o
[README](../README.md#o-que-tem).

## Abrir o Graficário

Para abrir o Graficário, abra `gerador-graficos/index.html` no navegador. Você
não precisa de servidor nem de instalação.

O Graficário carrega o Apache ECharts de uma CDN. Sem internet, salve o arquivo
`echarts.min.js` da versão 6.1.0 em `gerador-graficos/vendor/`.

A tela tem três áreas:

- **Biblioteca de modelos** (à esquerda): modelos prontos, por situação.
- **Palco** (ao centro): o gráfico e, embaixo, as abas **Dados**, **Tabela
  acessível**, **Revisão** e **Código**.
- **Ajustes** (à direita): título, tipo, cores, números, eixos e anotações.

No celular, use a barra inferior para alternar entre **Modelos**,
**Gráfico**, **Dados** e **Ajustes**.

## Criar um gráfico a partir de um modelo

Para começar com um modelo:

1. Na **Biblioteca de modelos**, digite uma palavra na busca (por exemplo,
   `pareto`, `meta` ou `funil`) ou escolha uma situação na lista.
2. Selecione um modelo. O gráfico aparece no palco com dados de exemplo.
3. Na aba **Dados**, substitua os dados de exemplo pelos seus.
4. Em **Ajustes > História**, reescreva o título com a sua conclusão.

Para abrir um modelo diretamente, use um link com `#modelo=` e o id do modelo,
por exemplo `index.html#modelo=pareto-defeitos`.

## Inserir e editar dados

A primeira linha da tabela é o cabeçalho. A linha cinza sob o cabeçalho mostra
o papel de cada coluna no tipo de gráfico atual, por exemplo **CATEGORIA** ou
**SÉRIE (NÚMERO)**.

Você pode inserir dados de quatro formas:

- **Colar em uma célula:** copie um intervalo do Excel ou do Google Planilhas
  e cole em qualquer célula. A grade cresce para caber o conteúdo.
- **Colar tabela:** selecione **Colar tabela…** para substituir todos os dados,
  incluindo o cabeçalho.
- **Importar arquivo:** selecione **Importar arquivo…** e escolha um arquivo
  CSV, TSV ou TXT.
- **Modo texto:** selecione **Modo texto** para editar os dados como texto
  separado por tabulação, ponto e vírgula ou vírgula.

O Graficário aceita números nos formatos `1.234,56` e `1,234.56` e datas nos
formatos `2025-03-15` e `15/03/2025`.

Outros comandos da aba **Dados**:

- **+ Linha** e **+ Coluna** adicionam linhas e colunas vazias.
- **Transpor** troca linhas por colunas.
- **Ordenar ↓** ordena as linhas pela segunda coluna, do maior para o menor.
- **Restaurar exemplo** volta aos dados do modelo.
- **Enter** move para a célula de baixo e cria uma linha no fim da tabela.

## Ajustar o gráfico

O painel **Ajustes** tem as seções a seguir.

### História

Escreva no **Título** o que o leitor deve concluir, por exemplo “O Sul cresceu
23% e puxou o ano”, e não apenas o assunto. Use o **Subtítulo** para período e
unidade, e informe a **Fonte dos dados**.

### Tipo e forma

Escolha o **Tipo de gráfico**. A lista mostra primeiro os tipos compatíveis
com os dados atuais. Se você escolher um tipo com outro formato de dados, o
Graficário oferece carregar os dados de exemplo desse tipo, mantendo título,
subtítulo e fonte.

Os controles abaixo do tipo mudam conforme o gráfico, por exemplo orientação,
empilhamento, ordenação, média móvel ou limites de especificação.

### Cores e destaque

- **Paleta categórica:** escolha uma das quatro paletas validadas ou **Da
  marca**. Com **Da marca**, informe as cores em hexadecimal. O validador
  mostra se a paleta passa nas checagens de daltonismo, luminosidade e
  contraste.
- **Destacar:** selecione os itens da sua história. Eles ficam coloridos, e o
  resto fica em cinza.
- **Cor do destaque:** com **Automático**, um único destaque recebe a cor 1;
  vários destaques recebem a cor de cada item.
- **Texturas:** ative para impressão em preto e branco ou para leitores com
  daltonismo.

### Números, rótulos e legenda

Defina prefixo, sufixo, casas decimais e números compactos (por exemplo,
`12,9 mil`). Em **Rótulos de dados**, prefira **Seletivos**: o Graficário
rotula só destaques, extremos e o último ponto.

### Eixos

Defina mínimo, máximo e nomes dos eixos. Gráficos de barras sempre partem do
zero.

### Anotações

Adicione linhas de referência (por exemplo, uma meta), faixas (por exemplo, o
período de uma campanha) e notas em um ponto específico.

### Avançado

Desative a animação ou cole um JSON em **Sobrescrever option do ECharts** para
ajustes finos. O JSON é mesclado sobre o que o Graficário gera.

## Revisar antes de publicar

A aba **Revisão** verifica o gráfico e classifica cada item como problema,
aviso, dica ou aprovado. Ela verifica, por exemplo:

- se o título é uma conclusão;
- se há séries demais ou linhas cruzadas demais;
- se barras começam do zero;
- se a paleta da marca é aprovada.

Quando há uma correção automática, selecione o botão ao lado do item.

## Mudar o tamanho do gráfico

No palco, escolha o tamanho em **Ajustar à área** ou em um tamanho fixo, como
**Slide 16:9** ou **Post quadrado**. O tamanho fixo também vale para a
exportação. Com **Personalizado…**, informe largura e altura em pixels.

## Exportar

Para exportar, selecione **Exportar** e escolha um formato:

| Formato | Uso |
|---|---|
| PNG 2× ou 3× | Apresentações, documentos e impressão |
| SVG | Edição vetorial |
| Copiar imagem | Colar direto no PowerPoint, Docs ou e-mail |
| Imprimir / PDF | Imprime só o gráfico |
| HTML autônomo | Gráfico interativo que abre em qualquer navegador |
| Option do ECharts | Reuso em código |
| Dados em CSV | Abrir no Excel (separador `;`) |
| Arquivo do projeto | Continuar a edição depois ou em outro computador |

## Salvar e abrir

- **Salvar** guarda o gráfico neste navegador. Os gráficos salvos ficam em
  **Meus gráficos**.
- O Graficário também guarda automaticamente o último gráfico aberto.
- Para levar o trabalho a outro computador, use **Exportar > Arquivo do
  projeto** e, depois, **Meus gráficos > Abrir arquivo de projeto**.

## Atalhos de teclado

| Atalho | Ação |
|---|---|
| `Ctrl+Z` | Desfazer |
| `Ctrl+Shift+Z` ou `Ctrl+Y` | Refazer |
| `Ctrl+S` | Salvar |
| `Esc` | Fechar menus |

No macOS, use `Cmd` no lugar de `Ctrl`.
