---
name: sdd-swarm-orchestrator
description: Orquestrador de enxame para desenvolvimento orientado a especificacoes (Spec-Driven Development / SDD). Executa o ciclo de 3 fases (Pesquisa -> PRD.md -> Planejamento -> Spec.md -> Implementacao Cirurgica) com isolamento estrito de contexto (Chain topology e barreiras de contexto). Use quando o usuario pedir para desenvolver features com SDD, arquitetar mudancas cirurgicas em bases de codigo ou orquestrar agentes em pipeline estruturado de pesquisa, especificacao e codificacao.
---

# SDD Swarm Orchestrator

Orquestrador de desenvolvimento de software baseado em Spec-Driven Development (SDD) e coordenacao de enxame (Swarm Orchestration). Aplica o regime Chain com isolamento estrito de contexto entre fases para eliminar poluicao de tokens, prevenir alucinacoes e garantir execucao cirurgica.

## When to Use

- Implementacao de novas funcionalidades, modulos ou refatoracoes em bases de codigo.
- Demandas de desenvolvimento guiado por especificacao (Spec-Driven Development / SDD).
- Execucao de tarefas tecnicas que exigem exploracao de base de codigo, sintese de documentacao externa e implementacao sem desperdicio de contexto.
- Quando o usuario solicitar um fluxo estruturado em 3 fases (Pesquisa/PRD -> Especificacao/Spec -> Codificacao/Execucao).

## Arquitetura de Coordenacao (Chain Topology)

O coordenador central mantem a autoridade do objetivo e executa o fluxo em regime **Chain**:

1. A saida aceita de um especialista e o insumo exato do proximo.
2. Cada fase opera sob barreira estrita de contexto (subagente isolado / fresh context), evitando que exploracoes preliminares sobrecarreguem a fase de codificacao.
3. Nenhum codigo e implementado antes que a `Spec.md` seja gerada e validada.
4. Ha garantia de escritor unico (single-writer) por arquivo durante a implementacao.

### Execucao no Claude Code

- Rode cada fase em um subagente separado (ferramenta `Agent`), passando apenas o prompt padrao da fase e o caminho do artefato de entrada (`PRD.md` ou `Spec.md`). Nunca repasse o historico da fase anterior.
- Entre as fases, o coordenador apenas valida o artefato (existe, segue o formato, sem instrucoes vagas) e decide aceitar ou devolver ao mesmo especialista.
- Se a Fase 3 for paralelizada, atribua conjuntos disjuntos de arquivos da `Spec.md` a cada worker (single-writer).

## Fases do Workflow

### Fase 1: Pesquisa e Mapeamento (Research -> PRD.md)

- **Papel:** Engenheiro de Software Senior focado em arquitetura e boas praticas.
- **Objetivo:** Mapear a base de codigo existente, documentacoes oficiais e padroes consolidados sem implementar codigo.
- **Acoes:**
  1. Analisar a base de codigo para identificar apenas os arquivos diretamente relevantes ou afetados.
  2. Localizar componentes, tipos, funcoes e utilitarios existentes reutilizaveis (evitar duplicacao e over-engineering).
  3. Consultar documentacao oficial das bibliotecas e dependencias do projeto.
  4. Extrair snippets essenciais de padroes consolidados de mercado.
- **Entregavel Obrigatorio:** Arquivo `PRD.md` contendo:
  - Lista de arquivos da base de codigo diretamente relevantes.
  - Trechos essenciais de documentacoes externas.
  - Snippets de codigo de referencia a seguir.
  - Decisoes arquiteturais sintetizadas para economia de contexto.
- **Barreira de Contexto:** Apos gerar o `PRD.md`, encerre o worker / limpe o contexto para iniciar a Fase 2 com a janela livre.

#### Prompt Padrao - Fase 1 (Research)

```plaintext
Voce e um engenheiro de software senior focado em arquitetura e boas praticas.

Preciso implementar a seguinte funcionalidade:
[DESCREVA SUA FEATURE AQUI EM DETALHES]

Seu objetivo nesta etapa e apenas pesquisar e sintetizar o conhecimento necessario, sem implementar codigo ainda.

Faca o seguinte:
1. Analise nossa base de codigo e identifique apenas os arquivos relevantes que serao afetados ou que servem de referencia.
2. Identifique padroes de codigo, componentes ou funcoes existentes no projeto que podem ser reaproveitados (evite duplicacao e over-engineering).
3. Busque documentacoes e padroes recomendados de mercado para as bibliotecas e ferramentas envolvidas.
4. Traga code snippets essenciais de padroes consolidados (ex.: Stack Overflow, repositorios de referencia).

OUTPUT OBRIGATORIO:
Gere um arquivo markdown chamado PRD.md contendo:
- Lista de arquivos da base de codigo diretamente relevantes
- Trechos essenciais de documentacoes externas
- Snippets de codigo de referencia que devemos seguir
- Decisoes arquiteturais resumidas para nao desperdicar contexto

Acao obrigatoria: Apos gerar o PRD.md, isole ou limpe a janela de contexto para a proxima fase.
```

---

### Fase 2: Planejamento Tatico (Spec -> Spec.md)

- **Papel:** Arquiteto de Software Tatico.
- **Objetivo:** Consumir exclusivamente o `PRD.md` e gerar um plano cirurgico no arquivo `Spec.md`.
- **Acoes:**
  1. Definir caminhos relativos exatos de cada arquivo a ser criado ou modificado.
  2. Estruturar assinaturas de funcoes, tipos, interfaces, dependencias e imports.
  3. Prever tratamento de erros e contratos modulares (uma responsabilidade por arquivo).
  4. Incluir trechos criticos de implementacao derivados do PRD.
- **Entregavel Obrigatorio:** Arquivo `Spec.md` estruturado estritamente no formato:
  - `[Path do arquivo]`
    - `[Acao: Criar / Modificar]`
    - `[Instrucoes detalhadas, assinaturas de funcoes, tipos e trechos criticos]`
- **Barreira de Contexto:** Apos salvar o `Spec.md`, encerre o worker / limpe a janela de contexto para disponibilizar 100% da capacidade para codificacao.

#### Prompt Padrao - Fase 2 (Spec)

```plaintext
Voce e um arquiteto de software encarregado de criar um plano tatico de implementacao.

Leia o arquivo PRD.md em anexo (ou presente no diretorio) e elabore um documento detalhado chamado Spec.md.

Regras para a Spec:
1. Para cada arquivo, defina exatamente o caminho relativo (path).
2. Agrupe em:
   - Arquivos a serem modificados
   - Arquivos a serem criados
3. Descreva com precisao o que deve ser feito em cada arquivo, incluindo assinaturas de funcoes, tipos, importacoes e trechos de codigo criticos baseados no PRD.md.
4. Garanta codigo modularizado: nao concentre responsabilidades diferentes no mesmo arquivo.

OUTPUT OBRIGATORIO:
Crie o arquivo Spec.md estruturado estritamente no padrao:
- [Path do arquivo]
  - [Acao: Criar / Modificar]
  - [Instrucoes detalhadas e codigo/assinaturas especificas]

Acao obrigatoria: Apos a geracao do Spec.md, isole ou limpe a janela de contexto para a codificacao.
```

---

### Fase 3: Implementacao Cirurgica (Code)

- **Papel:** Desenvolvedor Full-Stack de alto nivel focado em codigo limpo e producao.
- **Objetivo:** Implementar as alteracoes com contexto 100% focado exclusivamente na `Spec.md`.
- **Diretrizes:**
  1. Seguir estritamente as instrucoes de cada arquivo mapeado na `Spec.md`.
  2. Nao reinventar a roda: reaproveitar os utilitarios, tipos e snippets indicados na spec.
  3. Nao criar arquivos, dependencias ou abstracoes fora do escopo da spec.
  4. Manter o codigo conciso, modular, documentado e pronto para producao.
  5. Validar a integridade (compilacao, sintaxe, testes) ao finalizar.

#### Prompt Padrao - Fase 3 (Code)

```plaintext
Voce e um desenvolvedor full-stack de alto nivel focado em codigo limpo, simples e manutenivel.

Sua tarefa e implementar a funcionalidade descrita no arquivo Spec.md em anexo.

Diretrizes de execucao:
1. Siga estritamente as instrucoes de cada arquivo mapeado na Spec.md.
2. Nao reinvente a roda: reutilize componentes existentes e siga os snippets indicados.
3. Nao crie arquivos ou abstracoes desnecessarias fora do escopo da spec.
4. Mantenha o codigo conciso, modular e pronto para producao.

Execute a implementacao passo a passo conforme definido na Spec.md.
```

## Gotchas

- **Pular a barreira de contexto:** Misturar pesquisa preliminar e historico de discussao na fase de codigo gera alucinacoes de imports e perda de atencao aos detalhes tecnicos.
- **Modificacoes fora da spec:** Qualquer arquivo alterado que nao esteja mapeado na `Spec.md` representa quebra de contrato.
- **Gerar codigo durante a Fase 1 ou 2:** O pesquisador e o arquiteto devem produzir apenas documentos de especificacao (`PRD.md` e `Spec.md`).
- **Especificacao vaga:** Se a `Spec.md` contiver instrucoes genericas como "adicione a logica necessaria", rejeite o retorno antes de iniciar a Fase 3. Assinaturas e contratos devem ser explicitos.
