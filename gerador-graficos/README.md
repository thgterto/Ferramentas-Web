# Graficário — gerador de gráficos com ECharts

Gerador de gráficos em HTML + [Apache ECharts 6](https://echarts.apache.org/) com uma **biblioteca de 127 modelos** organizados por *situação* (não só por tipo de gráfico), **45 tipos de gráfico**, editor de dados estilo planilha, revisor de storytelling e exportação para PNG, SVG, HTML interativo, JSON e CSV.

Cada modelo já vem com dados de exemplo realistas, **um título que é a conclusão** (e não o assunto), subtítulo com contexto e unidade, destaque e anotações — é só trocar os dados.

## Documentação

- [Guia do usuário](docs/guia-do-usuario.md): criar, ajustar, revisar e exportar gráficos.
- [Guia de desenvolvimento](docs/desenvolvimento.md): arquitetura e como adicionar modelos e tipos.

## Como usar

1. Abra `gerador-graficos/index.html` no navegador (duplo clique funciona; não precisa de servidor nem de build).
2. Escolha um modelo na **Biblioteca** (busca por palavra: “pareto”, “meta”, “funil”, “CEP”…).
3. Cole seus dados na aba **Dados** — direto do Excel/Planilhas em qualquer célula, ou em *Colar tabela…*. A linha cinza sob o cabeçalho mostra o papel de cada coluna.
4. Ajuste título, destaque, rótulos e anotações no painel **Ajustes**. Veja a aba **Revisão**.
5. **Exportar**: PNG 2×/3×, SVG, copiar imagem, imprimir/PDF, HTML interativo autônomo, option JSON, CSV ou arquivo de projeto.

O ECharts é carregado de CDN (jsDelivr → unpkg → cdnjs). Para usar sem internet, salve `echarts.min.js` 6.1.0 em `gerador-graficos/vendor/`.

## O que tem

**Biblioteca por situação (127 modelos)**

| Situação | Modelos | Exemplos |
|---|---|---|
| Comparar categorias | 12 | Barras com destaque, Top N + "Outros", Colunas com linha de meta, Barras agrupadas… |
| Ranking e posição | 6 | Slope: dois momentos, Slope com uma unidade em foco, Bump… |
| Evolução no tempo | 16 | Linha com anotação, Várias linhas com uma em foco, Áreas 100%, Séries indexadas (base 100), Média móvel, Previsão com intervalo, Calendário, Retenção por coorte… |
| Parte do todo | 7 | Rosca com total ao centro, Waffle "3 em cada 10", Treemap, Sunburst, Marimekko… |
| Metas e desvios | 8 | Acima/abaixo da meta, Bullet, Ponte de variação (cascata), Superávit/déficit… |
| Distribuição | 10 | Histograma com Cp/Cpk, Boxplot + pontos, Enxame, Violino, Distribuição acumulada, Pirâmide etária… |
| Relação e correlação | 8 | Dispersão com R², Bolhas, Matriz esforço × impacto, Matriz BCG, Matriz de correlação, Coordenadas paralelas… |
| Fluxos e processos | 8 | Sankey (orçamento, jornada, energia), Funil, Rede, Cordas… |
| Hierarquia | 5 | Treemap, Organograma, Árvore de decisão, Sunburst… |
| Indicadores e KPIs | 6 | Cartões de KPI com minigráfico, Número em destaque, Anéis de progresso… |
| Qualidade e CEP | 8 | Carta de controle I-AM (regras de Western Electric), Pareto, Capabilidade, Run chart… |
| Finanças | 7 | DRE em cascata, Fluxo de caixa, Candlestick com volume, Carteira vs CDI… |
| Projetos e agenda | 6 | Gantt com progresso e "hoje", Burndown, Linha do tempo, Roadmap… |
| Pesquisas e opinião | 6 | Likert centrado no neutro, NPS, Intenção de voto, 360°… |
| Geografia | 4 | Mapa em grade do Brasil (UF), sequencial ou divergente… |
| Técnicas de storytelling | 10 | Cinza + uma cor, Título-conclusão, Anote a virada, Troque a pizza, Indexe em vez de eixo duplo… |

**Tipos de gráfico e formato dos dados** — a 1ª linha da tabela é o cabeçalho.

| Tipo | Grupo | Colunas esperadas |
|---|---|---|
| Barras / colunas | Comparação | Categoria · Série (número) · …mais séries |
| Linhas / áreas | Tempo | Período · Série · …mais séries |
| Pirulito | Comparação | Categoria · Valor |
| Haltere (antes → depois) | Comparação | Item · Antes · Depois |
| Inclinação (slope) | Ranking | Item · Período inicial · Período final |
| Ranking no tempo (bump) | Ranking | Período · Item A (valor ou posição) · … |
| Intervalo (mín–máx) | Distribuição | Categoria · Mínimo · Máximo · Média (opc.) |
| Previsão com intervalo | Tempo | Período · Real · Previsão · Limite inferior · Limite superior |
| Pequenos múltiplos | Tempo | Período · Série A · … (um painel cada) |
| Pareto (curva ABC) | Qualidade | Causa · Ocorrências |
| Cascata (ponte) | Finanças | Etapa (inicie com "=" para subtotal) · Valor/variação |
| Barras divergentes | Desvio | Categoria · Valor (+/−) |
| Bullet | Desvio | Indicador · Realizado · Meta · Limite ruim · Limite bom |
| Barras de progresso | Indicadores | Item · Valor · Meta |
| Likert | Pesquisa | Pergunta · Nível 1 (mais negativo) · … · Nível N |
| Pirâmide / borboleta | Distribuição | Faixa · Grupo esquerdo · Grupo direito |
| Marimekko | Parte do todo | Coluna (largura) · Segmento A · … |
| Carta de controle (I-AM) | Qualidade | Amostra · Medição |
| Candlestick | Finanças | Data · Abertura · Fechamento · Mínima · Máxima · Volume (opc.) |
| Linha do tempo | Projetos | Data · Evento · Categoria (opc.) |
| Gantt | Projetos | Tarefa · Início · Fim · Fase (opc.) · Progresso 0–1 (opc.) |
| Rosca / pizza, Waffle, Funil | Parte do todo / Fluxo | Categoria · Valor |
| Treemap, Sunburst, Árvore | Hierarquia | Nível 1 · Nível 2 · … · Valor |
| Sankey, Cordas, Rede | Fluxo | Origem · Destino · Valor |
| Histograma, Boxplot, Enxame, Violino, Acumulada | Distribuição | Uma coluna de medições por grupo |
| Dispersão / bolhas | Relação | X · Y · Tamanho (opc.) · Grupo (opc.) · Rótulo (opc.) |
| Mapa de calor | Relação | Linha · Coluna A · Coluna B · … |
| Calendário | Tempo | Data (aaaa-mm-dd) · Valor |
| Listras de anomalia | Tempo | Período · Anomalia |
| Coordenadas paralelas | Relação | Item · Dimensão A · Dimensão B · … |
| Radar | Comparação | Dimensão · Item A · Item B · … |
| Cartões de KPI | Indicadores | Período · Indicador (unidade entre parênteses, ex.: `Receita (R$)`) · … |
| Número em destaque | Indicadores | Rótulo · Valor · Contexto (opc.) |
| Anéis de progresso | Indicadores | Indicador · Valor · Meta |
| Mapa em grade — Brasil | Geografia | UF (sigla ou nome) · Valor |

Números aceitam `1.234,56` ou `1,234.56`; datas, `2025-03-15` ou `15/03/2025`.

## Princípios aplicados

- **Título = conclusão.** O revisor avisa quando o título descreve o assunto em vez da mensagem.
- **Cor com função.** Categórica (identidade), ordinal (etapas), sequencial (magnitude), divergente (polaridade) e status (bom/ruim, sempre com ícone e rótulo). A cor segue a entidade, nunca a posição no ranking.
- **Paletas validadas.** Quatro ordens das mesmas 8 cores, testadas para daltonismo protan/deutan (ΔE OKLab), luminosidade, croma e contraste, nos modos claro e escuro. Paletas da marca passam pelo mesmo validador no navegador.
- **Ênfase.** Destaque o que conta a história; o resto vira contexto em cinza. Rótulos seletivos, não um número em cada ponto.
- **Honestidade.** Barras sempre do zero. Nunca eixo Y duplo — use *Indexar (1º valor = 100)* ou pequenos múltiplos. Pareto com barras e acumulado no mesmo eixo (%).
- **Acessibilidade.** Tabela acessível de todo gráfico, descrição ARIA, texturas a 45°/135° para impressão P&B e daltonismo, respeito a `prefers-reduced-motion`, tema claro/escuro.

## Estrutura

```
gerador-graficos/
  index.html                 interface
  css/app.css                estilos (tokens claro/escuro)
  js/core/tokens.js          cores, rampas, temas e validador de paleta
  js/core/runtime.js         formatadores/tooltips/renderItem serializáveis (embutido no HTML exportado)
  js/manifest.js             lista (e ordem) de todos os módulos carregados
  js/core/data.js            CSV/TSV, números pt-BR, estatística, geradores de exemplo
  js/builders/base.js        registro e peças comuns dos construtores
  js/builders/lib/*.js       utilidades compartilhadas entre tipos
  js/builders/types/<id>.js  um arquivo por tipo de gráfico (45)
  js/presets/registry.js     categorias e registro de modelos
  js/presets/catalog/*.js    um arquivo por categoria (127 modelos)
  js/app/*.js                aplicação, editor de dados, inspetor, revisão e exportação
  tools/check.js             verificação em Node de todos os tipos e modelos
```

**Adicionar um modelo:** em `js/presets/catalog/<categoria>.js`, chame `P.add({ id, cat, type, name, desc, tags, data, settings })`. `data` pode ser uma tabela `{ columns, rows }` ou uma função que a gera.

**Adicionar um tipo de gráfico:** crie `js/builders/types/<id>.js` registrando com `GG.builders.register({ id, name, group, shape, family, cartesian, roles, hint, hl, annot, settings, build(ctx) })` e acrescente o id em `js/manifest.js`. Rode `node tools/check.js`. Toda função que entra no option deve ser criada por `ctx.fn(tipo, cfg)` (definida em `runtime.js`) para que a exportação em HTML continue funcionando.

Apache ECharts é licenciado sob Apache-2.0.
