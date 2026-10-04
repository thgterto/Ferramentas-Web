# Guia de desenvolvimento

Este guia explica a arquitetura do Graficário e como adicionar modelos e tipos
de gráfico. O projeto usa JavaScript puro, sem build, e é modular: cada tipo de gráfico e
cada categoria de modelos é um arquivo próprio que se registra no objeto global
`GG`. A lista de arquivos fica num único lugar, `js/manifest.js`, que o
`index.html` carrega em ordem. Os arquivos são `<script>` clássicos (não ES
modules) para que o `index.html` continue abrindo com duplo clique, sem
servidor.

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
| `js/manifest.js` | Lista e ordem de carregamento de todos os módulos (`GG_MANIFEST`) |
| `js/builders/base.js` | Registro, contexto, layout, eixos, legenda, anotações (`GG.builders`) |
| `js/builders/lib/*.js` | Utilidades compartilhadas entre tipos (`GG.builders.lib`) |
| `js/builders/types/<id>.js` | Um arquivo por tipo de gráfico (45) |
| `js/presets/registry.js` | Categorias da biblioteca e registro de modelos (`GG.presets`) |
| `js/presets/catalog/<categoria>.js` | Os modelos de uma categoria (127 no total) |
| `js/app/app.js` | Estado, biblioteca, palco, histórico e persistência (`GG.app`) |
| `js/app/grid.js` | Editor de dados |
| `js/app/inspector.js` | Painel de ajustes |
| `js/app/lint.js` | Aba Revisão |
| `js/app/export.js` | Exportações |
| `tools/check.js` | Verificação em Node: registro, manifesto e construção de todos os modelos |

### Módulos

Cada módulo segue o mesmo formato:

```js
(function (GG) {
  'use strict';
  const B = GG.builders;
  const { SORT, ORIENT } = B.lib;   // só o que o módulo usa
  B.register({ /* … */ });
})(window.GG = window.GG || {});
```

- Um módulo só depende do que vem **antes** dele no manifesto.
- Código usado por mais de um tipo vai para `js/builders/lib/` e é exposto em
  `B.lib`. Código usado por um só tipo fica no arquivo do tipo.
- O registro valida o que recebe: `B.register()` recusa tipos sem `id`, `name`,
  `group`, `shape`, `family` ou `build`, ids repetidos e ajustes com controle
  desconhecido; `P.add()` recusa modelos incompletos ou repetidos. Ao iniciar,
  a aplicação confere se cada modelo aponta para um tipo e uma categoria que
  existem e mostra os problemas no console.

## Adicionar um modelo

Para adicionar um modelo, chame `P.add()` no arquivo da categoria,
`js/presets/catalog/<categoria>.js`:

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

Para adicionar um tipo:

1. Crie `js/builders/types/meu-tipo.js` (copie um tipo parecido como ponto de
   partida).
2. Acrescente `'meu-tipo'` em `types`, no `js/manifest.js`. A posição na lista
   é a posição no seletor de tipos.
3. Crie ao menos um modelo de exemplo para ele (o verificador exige).
4. Rode `node tools/check.js`.

O arquivo registra o construtor com `GG.builders.register()`:

```js
B.register({
  id: 'meu-tipo',
  name: 'Meu tipo',
  group: 'Comparação',
  shape: 'wide',                       // 'wide' ou 'columns'
  family: 'tab',                       // formato dos dados (ver abaixo)
  cartesian: true,                     // tem eixos x/y (mostra a seção Eixos)
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

`family` diz com quais tipos este troca dados sem conversão: `tab` (tabela
larga), `tree` (níveis + valor), `flow` (origem, destino, valor), `samples`
(medições por grupo), `xy`, `dates`, `ohlc`, `events` ou `tasks`. Tipos da
mesma família mantêm os dados quando o usuário troca de tipo.

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

## Adicionar uma categoria de modelos

1. Acrescente a categoria em `CATS`, em `js/presets/registry.js`.
2. Crie `js/presets/catalog/<id>.js` com os modelos dela.
3. Acrescente o id em `presets`, no `js/manifest.js`.

## Testar

Rode o verificador (Node 18+, sem dependências):

```sh
node tools/check.js
```

Ele carrega todos os módulos do manifesto (menos a interface), confere o
registro (manifesto × arquivos no disco, tipos sem modelo, referências
quebradas) e constrói o `option` de todos os modelos nos temas claro e escuro.
Para refatorações que não deveriam mudar nenhum gráfico, grave um retrato antes
e compare depois:

```sh
node tools/check.js --snapshot /tmp/antes.json
# … mudanças …
node tools/check.js --compare /tmp/antes.json
```

Depois, no navegador:



1. Abra `index.html` e selecione os modelos afetados nos temas claro e escuro.
2. Passe o mouse sobre o gráfico para verificar os tooltips.
3. Veja se a aba **Revisão** não mostra problemas nos modelos afetados.
4. Exporte em **HTML autônomo** e confira se o arquivo abre sem erros no
   console do navegador.
