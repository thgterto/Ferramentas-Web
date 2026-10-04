# Guia de desenvolvimento

Este guia explica a arquitetura do Graficário e como adicionar modelos e tipos
de gráfico. O projeto usa JavaScript puro, sem build: cada arquivo é um
`<script>` clássico carregado por `index.html` e registra suas partes no objeto
global `GG`.

## Arquitetura

O fluxo de um gráfico tem três etapas:

1. O **estado** (`GG.app.state`) guarda o tipo, os dados e os ajustes.
2. Um **construtor** transforma dados e ajustes em um `option` do ECharts.
3. A aplicação desenha o `option` com `echarts.setOption`.

| Arquivo | Responsabilidade |
|---|---|
| `js/core/tokens.js` | Cores, temas, rampas e validador de paleta (`GG.tokens`, `GG.color`) |
| `js/core/runtime.js` | Formatadores, tooltips e `renderItem` serializáveis (`GG_RUNTIME`) |
| `js/core/data.js` | Leitura de CSV, números pt-BR, estatística e geradores (`GG.data`, `GG.stats`, `GG.gen`) |
| `js/builders/base.js` | Registro, contexto, layout, eixos, legenda, anotações (`GG.builders`) |
| `js/builders/*.js` | Os 45 construtores |
| `js/presets/*.js` | Os 127 modelos (`GG.presets`) |
| `js/app/app.js` | Estado, biblioteca, palco, histórico e persistência (`GG.app`) |
| `js/app/grid.js` | Editor de dados |
| `js/app/inspector.js` | Painel de ajustes |
| `js/app/lint.js` | Aba Revisão |
| `js/app/export.js` | Exportações |

## Adicionar um modelo

Para adicionar um modelo, chame `P.add()` em um dos arquivos
`js/presets/presets-*.js`:

```js
P.add({
  id: 'vendas-canal-mensal',          // único; usado em #modelo=
  cat: 'tempo',                        // id de GG.presets.CATS
  type: 'line',                        // id de um construtor
  name: 'Vendas por canal',
  desc: 'Quando usar este modelo, em uma frase.',
  tags: ['vendas', 'canal'],           // termos extras para a busca
  data: {
    columns: ['Mês', 'Loja', 'Site'],
    rows: [['Jan', 120, 80], ['Fev', 118, 95]]
  },
  settings: {
    title: 'O site ganhou espaço sobre a loja',
    subtitle: 'Vendas mensais, R$ mil',
    highlight: ['Site'],
    suffix: ' mil'
  }
});
```

`data` também aceita uma função que recebe `GG.gen` e devolve a tabela. Use-a
para séries longas, por exemplo `g.walk(seed, n, inicio, tendencia, ruido)`.
Os geradores usam uma semente, então os dados são sempre os mesmos.

Se você não informar `settings.source`, o modelo recebe “dados fictícios para
demonstração”.

## Adicionar um tipo de gráfico

Para adicionar um tipo, registre um construtor com
`GG.builders.register()`:

```js
B.register({
  id: 'meu-tipo',
  name: 'Meu tipo',
  group: 'Comparação',
  shape: 'wide',                       // 'wide' ou 'columns'
  roles: ['Categoria', 'Valor'],       // papéis mostrados na grade
  hint: 'Quando usar este tipo.',
  hl: 'categories',                    // o que o destaque seleciona
  annot: true,                         // aceita anotações
  settings: [
    { k: 'sort', l: 'Ordenar', t: 'select', o: [['none', 'Não'], ['desc', 'Sim']], d: 'none' }
  ],
  build(ctx) {
    const { cats, series } = B.wide(ctx);
    return {
      option: { grid: B.grid(ctx), xAxis: B.catAxis(ctx, cats), yAxis: B.valueAxis(ctx), series: [] },
      meta: { valueAxis: 'y' }
    };
  }
});
```

Os tipos de controle em `settings` são `select`, `seg`, `toggle`, `number`,
`text` e `column`. O painel de ajustes monta os controles a partir dessa lista.

No `build`, use o contexto `ctx`:

- `ctx.S`: ajustes já mesclados com os padrões.
- `ctx.T`: cores da interface do gráfico no modo atual.
- `ctx.color(i)`: cor da entidade `i` na paleta.
- `ctx.pick(nome, i)`: cor considerando o destaque.
- `ctx.fmt(valor)`: número formatado com prefixo, sufixo e casas.
- `ctx.layout`: margens já calculadas para título, legenda e rodapé.

Chame `B.legend()` antes de `B.grid()`, porque a legenda reserva espaço no
layout.

Depois de criar o construtor, adicione o id ao mapa `FAMILY` em
`js/app/app.js` para que a troca de tipo saiba quais dados são compatíveis.

### Regra das funções

O `option` não pode conter funções comuns. Crie toda função, como formatadores,
tooltips e `renderItem`, com `ctx.fn(tipo, cfg)`. Se precisar de um tipo novo,
adicione-o ao objeto `KINDS` em `js/core/runtime.js`.

Essa regra existe porque a exportação em HTML converte o `option` em JSON. As
funções criadas por `ctx.fn` viram marcadores `{"__ggfn": tipo, "cfg": …}`, e
o runtime embutido no HTML as reconstrói. O runtime só pode depender do
`echarts` global.

Em tooltips, escape o texto vindo dos dados. As funções do runtime usam
`esc()` para isso, porque os dados podem vir de CSV não confiável.

## Cores

Não escolha cores à mão. Use `ctx.color()` e `ctx.pick()` para séries,
`GG.color.ordinal()` para etapas ordenadas, `GG.color.sequential()` para
magnitude e `GG.color.diverging()` para valores acima e abaixo de uma
referência. As cores de status (`GG.tokens.STATUS`) só valem para bom e ruim,
sempre acompanhadas de ícone e rótulo.

Para criar um tema novo, adicione uma ordem das oito cores em `THEMES`, em
`js/core/tokens.js`, e confirme que ela passa em `GG.color.validate()` nos
modos claro e escuro.

## Testar

O projeto não tem testes automatizados no repositório. Antes de enviar uma
mudança:

1. Abra `index.html` e selecione os modelos afetados nos temas claro e escuro.
2. Passe o mouse sobre o gráfico para verificar os tooltips.
3. Veja se a aba **Revisão** não mostra problemas nos modelos afetados.
4. Exporte em **HTML autônomo** e confira se o arquivo abre sem erros no
   console do navegador.
