# 04 — Briefing de Design · Simulador de Escalas 24/7

> Documento para o(a) designer de produto. Base: `00-prd-original.md`. Stack-alvo: React 19 + Tailwind (`frontend/`, hoje com `tailwind.config.js` sem extensões — este briefing propõe os tokens).

---

## 1. Objetivos de design

1. **Responder em segundos três perguntas**: *Quantas turmas preciso? Estou coberto nas 168 h? Estou dentro da lei e quanto custa?*
2. **Time-to-scenario ≤ 10 min** (meta do PRD) para um ciclo 24/7 completo, via wizard guiado com padrões inteligentes.
3. **Tornar o risco jurídico visível e explicável**: todo alerta aponta a regra (CLT/CF/Súmula/CCT), o local exato (turma × dia × hora) e uma correção sugerida.
4. **Permitir decisão financeira comparável**: cenários lado a lado com custo anualizado e decomposição (base, adicional noturno, DSR, DSR s/ AN, HE).
5. **Gerar confiança auditável**: cada número tem origem rastreável (premissa → regra → cálculo).

## 2. Princípios

| Princípio | O que significa na prática |
|---|---|
| **Densidade com hierarquia** | Telas ricas (heatmap 7×24, grade 168 h, extrato) são aceitáveis para usuários especialistas, desde que haja um *nível de leitura rápida* (KPIs + status) acima do detalhe. Progressive disclosure: resumo → drill-down → célula. |
| **Confiança & auditabilidade** | Numerais tabulares, unidades sempre explícitas (h, h:mm, R$, %), premissas visíveis em painel "Premissas do cálculo", versão do cenário + carimbo de data/autor, botão "Como calculamos?" em todo KPI. Nada de número "mágico". |
| **Clareza de alertas legais** | Linguagem simples primeiro, fundamento jurídico depois. Severidade sempre com cor **+ ícone + rótulo textual**. Um alerta = um problema = uma ação. |
| **Cor nunca sozinha** | Cobertura, severidade e turmas usam sempre um segundo canal (ícone, padrão de textura, letra). |
| **Reversível e sem medo** | Simulação é rascunho: desfazer/refazer, duplicar cenário, comparar antes/depois. Ações destrutivas pedem confirmação. |
| **Consistência de entidade** | A turma A tem a mesma cor em todas as telas, filtros não repintam turmas. |

## 3. Personas e contexto de uso

| Persona | Contexto | Tela-âncora | Necessidade de design |
|---|---|---|---|
| Gerente de Planta / Ops 24/7 | Desktop no escritório da planta, às vezes tablet no chão de fábrica | Heatmap de cobertura + calendário de turmas | Ver furos de cobertura de imediato, ajustar postos por hora |
| Gestora de Enfermagem | Tablet/desktop na coordenação, interrupções frequentes | Calendário cíclico 12x36 | Salvar automático, retomar onde parou, alto contraste em ambiente noturno (modo escuro) |
| BP / Jurídico Trabalhista | Desktop, leitura minuciosa, exporta para parecer | Painel de alertas + trilha de auditoria | Citação legal, filtros por regra, export PDF com fundamentação |
| CFO | Desktop/notebook, reuniões, tela compartilhada | Comparador de cenários + extrato financeiro | Números grandes legíveis em projetor, deltas claros, export XLSX |

**Plataformas**: desktop-first (≥ 1280 px; layout ideal 1440 px). Tablet (768–1279 px, paisagem e retrato) com funcionalidade completa de leitura e edição leve. Mobile (< 768 px) somente leitura de KPIs/alertas — fora do escopo do MVP visual, mas não pode quebrar.

## 4. Tom de voz e microcopy

**Tom**: especialista, direto, calmo. Nunca alarmista, nunca jurídico-hermético. Frase 1 = o que acontece; frase 2 = por que importa; ação = verbo no imperativo. Fundamento legal em linha secundária.

### Exemplos de alertas

| Severidade | Título | Corpo | Fundamento | Ação |
|---|---|---|---|---|
| Crítico | Descanso entre jornadas abaixo de 11 h | A Turma C sai às 22:00 de terça e volta às 06:00 de quarta — só 8 h de descanso. | CLT art. 66 | **Ajustar rotação** · Ver no calendário |
| Crítico | Turno ininterrupto acima de 6 h sem negociação coletiva | Turnos de 8 h em revezamento exigem acordo ou convenção coletiva. Informe a CCT para validar. | CF/88 art. 7º, XIV · Súmula 423 TST | **Anexar CCT** |
| Alto | Domingo sem folga há 7 semanas | A Turma E não folga em um domingo desde a semana 1. O limite usual é 1 a cada 7 semanas (comércio: 1 a cada 3). | Lei 10.101/2000 art. 6º · CCT | Redistribuir folgas |
| Médio | Hora noturna reduzida aplicada | 7 h de relógio entre 22:00 e 05:00 equivalem a 8 h pagas. Já incluímos isso no custo. | CLT art. 73 §1º | Entendi |
| Informativo | Prorrogação após 05:00 conta como noturna | Jornadas que começam à noite e passam das 05:00 mantêm o adicional. | Súmula 60 TST | Ver detalhe |

### Outros exemplos
- Estado vazio do heatmap: "Defina quantas pessoas cada posto precisa por hora para ver a cobertura."
- Sucesso: "Cenário salvo. 0 violações críticas · 2 avisos."
- Erro de cálculo: "Não conseguimos calcular este cenário. Seus dados estão salvos — tente de novo ou revise a etapa 3."
- KPI tooltip: "Headcount = postos × horas cobertas ÷ horas efetivas por colaborador, incluindo absenteísmo de 4% (editável)."
- Botão: preferir "Gerar escala", "Comparar cenários", "Exportar para RH" a "OK/Enviar".
- Formatos pt-BR: `R$ 1.234.567,89`, `08:00–20:00`, `seg 03/11`, `12x36`, `44 h/sem`.

## 5. Identidade visual

### 5.1 Paleta base (neutros + marca)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#F7F8FA` | `#0F1216` | fundo da app |
| `surface` | `#FFFFFF` | `#171B21` | cards, painéis |
| `surface-2` | `#F0F2F5` | `#1F242C` | cabeçalhos de tabela, zebra |
| `border` | `#D9DEE5` | `#2E353F` | divisórias |
| `text` | `#111827` | `#E7EAEE` | texto primário (≥ 15:1) |
| `text-muted` | `#4B5563` | `#A3ABB7` | secundário (≥ 7:1 claro / ≥ 7:1 escuro) |
| `text-subtle` | `#6B7280` | `#8590A0` | rótulos de eixo (≥ 4.5:1) |
| `primary` | `#1D4ED8` | `#6B9BFF` | ações, foco, links |
| `primary-hover` | `#1E40AF` | `#8DB2FF` | |
| `focus-ring` | `#2563EB` | `#93B4FF` | anel 2 px + offset 2 px |

### 5.2 Cobertura (semântica do heatmap) — verde/azul/vermelho seguro para daltônicos

Verde × vermelho puro falha para deuteranopia/protanopia. Proposta: **eixo divergente azul (excesso) ↔ neutro (adequado) ↔ laranja-vermelho (déficit)**, com "adequado" marcado em verde-azulado de baixa saturação + ícone. Cada estado tem **ícone e padrão redundantes**:

| Estado | Regra | Claro | Escuro | Ícone | Padrão (textura) |
|---|---|---|---|---|---|
| Déficit crítico | cobertura < 90% | `#B42318` | `#F97066` | ▲ triângulo com "!" | hachura diagonal 45° densa |
| Déficit leve | 90–99% | `#F79009` fill `#FEF0C7` | `#FDB022` fill `#4E3A10` | ▲ contorno | hachura 45° espaçada |
| Adequado | 100–110% | `#0E9384` fill `#CCFBEF` | `#2ED3B7` fill `#0B3B36` | ✓ check | liso |
| Excesso | > 110% | `#1849A9` fill `#D1E0FF` | `#84ADFF` fill `#1A2D5C` | ● círculo / "+n" | pontilhado |

- Intensidade no heatmap: rampa **sequencial de um só tom** dentro de cada lado (5 passos), nunca arco-íris.
- Em `forced-colors`/impressão, a textura assume a codificação.
- O número (ex.: `−2`, `+1`) aparece na célula em zoom ≥ 100% ou no hover.

### 5.3 Severidade de alertas (reservadas — nunca usadas para turmas)

| Severidade | Cor texto/ícone (claro / escuro) | Fundo (claro / escuro) | Ícone |
|---|---|---|---|
| Crítico | `#B42318` / `#F97066` | `#FEF3F2` / `#3A1513` | octógono ✕ |
| Alto | `#B54708` / `#FDB022` | `#FFFAEB` / `#3A2A0C` | triângulo ! |
| Médio | `#175CD3` / `#84ADFF` | `#EFF8FF` / `#14234A` | círculo i |
| Informativo | `#475467` / `#A3ABB7` | `#F2F4F7` / `#1F242C` | balão |
| Conforme | `#067647` / `#47CD89` | `#ECFDF3` / `#0D2E1E` | escudo ✓ |

### 5.4 Cores das turmas A–F (categóricas, ordem fixa)

Validadas com `dataviz/scripts/validate_palette.js` (claro: todos PASS — banda de luminosidade, croma, separação CVD ΔE ≥ 8,5, visão normal ≥ 22, contraste ≥ 3:1). **A ordem importa** (verde não pode ficar adjacente ao magenta).

| Turma | Claro | Escuro | Letra/forma redundante |
|---|---|---|---|
| A | `#2A6FDB` | `#5B93F0` | "A" + círculo |
| B | `#C96A00` | `#CF7A24`* | "B" + quadrado |
| C | `#14946B` | `#25A87C` | "C" + triângulo |
| D | `#7A5AF8` | `#9077F0` | "D" + losango |
| E | `#8A6D00` | `#AD8C22` | "E" + hexágono |
| F | `#C2338A` | `#E05CA8` | "F" + estrela |

\* No modo escuro o laranja `#D9822A` ficou levemente acima da banda de luminosidade; usar `#CF7A24` e revalidar no Figma/código. Rótulo da turma sempre em texto (`text`), nunca na cor da turma. Mais de 6 turmas → não gerar cor nova; usar padrão/rótulo.

## 6. Tipografia

- **Família**: **Inter** (variável, Google Fonts) com `font-feature-settings: "tnum" 1, "cv11" 1` em toda área numérica; alternativa **IBM Plex Sans** + **IBM Plex Mono** para códigos/IDs. Fallback: `system-ui, "Segoe UI", Roboto, sans-serif`.
- Classe utilitária `tabular-nums` obrigatória em tabelas, KPIs, eixos, células da grade.

| Token | Tamanho/linha | Peso | Uso |
|---|---|---|---|
| `display` | 32/40 | 600 | número-herói do KPI |
| `h1` | 24/32 | 600 | título de tela |
| `h2` | 18/28 | 600 | seção/card |
| `body` | 14/20 | 400 | padrão (densidade) |
| `body-lg` | 16/24 | 400 | wizard, textos explicativos |
| `caption` | 12/16 | 500 | eixos, legendas, meta |
| `micro` | 11/14 | 500 | célula de heatmap (mín. absoluto) |

## 7. Grid e espaçamento

- Base **4 px**; escala 4, 8, 12, 16, 24, 32, 48, 64.
- Desktop: 12 colunas, gutter 24 px, margens 32 px, largura máx. de conteúdo 1600 px; sidebar de navegação 240 px (colapsável a 64 px).
- Tablet: 8 colunas, gutter 16 px, margens 24 px; sidebar vira drawer.
- Mobile: 4 colunas, margem 16 px, sem scroll horizontal da página (grades largas rolam dentro do próprio contêiner).
- Densidade: modo *Confortável* (linha de tabela 40 px) e *Compacto* (32 px).
- Raio: 4 px (inputs/células), 8 px (cards), 12 px (modais). Sombras discretas; elevação por borda no modo escuro.

## 8. Componentes-chave

### 8.1 Heatmap de cobertura 7×24
- Linhas = dias (seg→dom), colunas = horas 00–23; célula ≥ 28×24 px desktop, gap de 2 px na cor da superfície.
- Faixa noturna 22:00–05:00 sinalizada por sombreado leve no cabeçalho + ícone lua.
- Hover/focus: tooltip "Ter 03:00 · Necessário 6 · Escalados 4 · Déficit −2 · Turmas C, D". Alvo de hover = célula inteira.
- Seletor de posto/função acima (uma linha de filtros). Legenda sempre visível com ícone + padrão.
- Alternativa acessível: botão "Ver como tabela" e navegação por setas (roving tabindex, `role="grid"`).
- Resumo acima: "Cobertura 97,6% · 4 horas com déficit (todas na madrugada de domingo)".

### 8.2 Calendário cíclico de turmas
- Linhas = turmas A–F; colunas = dias do ciclo (até 42 dias / 6 semanas), agrupados por semana.
- Célula mostra código do turno (M/T/N/12h/F) com fundo da cor da turma (turnos) e neutro hachurado (folga). Domingos destacados.
- Marcadores de violação inline (ícone de severidade no canto da célula).
- Controles: "Rotacionar", "Deslocar início", zoom semana/ciclo, ver por colaborador.

### 8.3 Card de KPI
- Rótulo (caption) → número-herói (display, tabular) → unidade → delta vs. cenário-base (seta + texto "▲ 3 turmas a mais", nunca só cor) → sparkline opcional → link "Como calculamos?".
- KPIs padrão: Turmas, Headcount, Cobertura %, Custo mensal/anual, HE estimada, Violações.

### 8.4 Painel de alertas com severidade
- Lista agrupada por severidade com contadores; filtros por regra, turma, severidade.
- Item: ícone + rótulo de severidade, título, corpo, fundamento legal (link para trecho), "Ir para" (destaca célula no heatmap/calendário), ação de correção, "Justificar/aceitar risco" (com campo obrigatório, entra na auditoria).
- Região `aria-live="polite"` anuncia mudanças no total ao recalcular.

### 8.5 Tabela de extrato financeiro
- Colunas: Rubrica · Base de cálculo · Qtd. (h) · Valor unitário · Total mensal · Total anual · % do total.
- Rubricas: Salário base, Adicional noturno (20%), Hora noturna reduzida, DSR, DSR s/ AN, HE 50%/100%, Encargos.
- Números alinhados à direita, tabulares; totais em negrito com borda superior; linhas expansíveis mostrando a fórmula. Export CSV/XLSX/PDF.

### 8.6 Comparador de cenários
- Até 4 colunas (ex.: 6x1 · 6x2 · 5x2 contínuo · 12x36), cenário-base fixado à esquerda.
- Linhas: KPIs + violações + custo; diferença absoluta e % por célula; melhor valor marcado com ícone ★ + texto.
- Gráfico de barras horizontais do custo anual (eixo único, começa em zero, rótulos diretos) — **nunca eixo duplo**.

### 8.7 Wizard stepper
- Etapas: 1 Operação (janela, 24/7?) → 2 Postos e demanda (grade 168 h) → 3 Regime e turnos (catálogo de escalas) → 4 Regras legais e CCT → 5 Custos → 6 Revisão & simular.
- Stepper horizontal no desktop, vertical/compacto no tablet; estado por etapa (pendente, atual, completa, com erro). Salvamento automático; "Voltar" nunca perde dados.

### 8.8 Grid editável 168 h
- 7×24 de inputs numéricos (pessoas por posto/hora). Seleção por arraste/shift, preencher série, copiar dia → dias, colar do Excel, atalhos (Ctrl+Z, Ctrl+D).
- Pré-sets: "24/7 constante", "pico comercial", "noite reduzida".
- Validação inline (inteiro ≥ 0) com mensagem textual; totais por linha/coluna fixos.

### Outros
Botões (primário, secundário, fantasma, destrutivo), inputs com máscara pt-BR, select de escala com descrição, badge de turma, chip de filtro, toast, modal, drawer de detalhes, tooltip, skeleton, banner de premissas, trilha de auditoria (timeline).

## 9. Estados

Para cada componente documentar: **padrão, hover, foco (visível), ativo, desabilitado, carregando (skeleton / "Calculando 1.000 colaboradores…" com progresso), vazio (com CTA), erro (com recuperação), sucesso, desatualizado** ("Premissas mudaram — recalcular"), **somente leitura** (cenário homologado, com cadeado) e **comparação** (diff destacado).

## 10. Acessibilidade — WCAG 2.2 AA

- Contraste: texto ≥ 4.5:1, texto grande e componentes/gráficos ≥ 3:1 (1.4.3, 1.4.11), em ambos os temas.
- Cor nunca é o único canal (1.4.1): ícone + padrão + texto em cobertura, severidade e turmas.
- Teclado total (2.1.1): grid e heatmap com setas, Home/End, PageUp/Down; sem armadilhas.
- **Foco visível e não obscurecido** (2.4.7, 2.4.11): anel 2 px; cabeçalhos fixos não cobrem a célula focada.
- **Alvos ≥ 24×24 px** (2.5.8); células menores ganham alvo expandido ou modo zoom.
- **Arrastar tem alternativa** (2.5.7): seleção por shift+setas e campos de intervalo.
- **Ajuda consistente** (3.2.6) e **entrada redundante evitada** (3.3.7): wizard reaproveita dados.
- Leitores de tela: `role="grid"`, `aria-label` por célula ("Terça, 03 horas, déficit de 2"), tabelas com `<th scope>`, `aria-live` para recálculo, alternativa tabular para todo gráfico.
- Reflow a 320 px CSS / zoom 400% sem perda (1.4.10) — grades rolam no contêiner.
- `prefers-reduced-motion` respeitado; modo escuro e `forced-colors` testados.
- Idioma `lang="pt-BR"`; abreviações (DSR, HE, CCT) com `<abbr title>` na primeira ocorrência.

## 11. Wireframes ASCII

### 11.1 Dashboard do cenário
```
┌──────────┬──────────────────────────────────────────────────────────────────┐
│ ◧ Logo   │ Cenário: CD Cajamar · 5x2 contínuo · v3 · salvo 14:02  [Comparar][Exportar▾]│
│          ├──────────────────────────────────────────────────────────────────┤
│ Cenários │ ┌Turmas──┐┌Headcount┐┌Cobertura┐┌Custo/ano────┐┌Violações──┐ │
│ Simular  │ │   5    ││  142    ││ 97,6%   ││ R$ 9,84 mi  ││ ✕1  !2    │ │
│ Comparar │ │▲1 vs 6x1││▼8 vs 6x1││▲ +2,1pp ││▼ −6,3%      ││Ver alertas│ │
│ Regras   │ └────────┘└─────────┘└─────────┘└─────────────┘└───────────┘ │
│ Auditoria├──────────────────────────────────────────┬───────────────────────┤
│          │ Cobertura 7×24   Posto:[Operador ▾]      │ ALERTAS (3)  [Filtro▾]│
│          │      00 01 02 03 ... ☾22 23               │ ✕ CRÍTICO             │
│          │ Seg  ▓▓ ▓▓ ░░ ░░ ... ▓▓ ▓▓                │ Descanso < 11 h       │
│          │ Ter  ▓▓ ▓▓ ▓▓ ▓▓ ... ▓▓ ▓▓                │ Turma C · ter→qua     │
│          │ ...                                       │ CLT art. 66 [Ajustar] │
│          │ Dom  ▲▲ ▲▲ ▲▲ ▲▲ ... ▓▓ ▓▓                │ ! ALTO  Domingo s/... │
│          │ Legenda: ▲Déficit ◬Leve ✓Adequado ●Excesso│ ! ALTO  ...           │
│          │ [Ver como tabela]                          │                       │
│          ├──────────────────────────────────────────┴───────────────────────┤
│          │ Calendário de turmas (ciclo 5 semanas)   [Semana|Ciclo] [Rotacionar]│
│          │      S1: seg ter qua qui sex sáb dom | S2: ...                   │
│          │  A●   M   M   M   M   M   /F/ /F/  |  T ...                      │
│          │  B■   T   T   T   T   /F/ /F/  N   |  ...                        │
│          │  C▲   N   N  ✕N   ... ...                                        │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

### 11.2 Wizard — etapa 2 (grid 168 h)
```
 ① Operação ── ② Postos e demanda ── ③ Regime ── ④ Regras/CCT ── ⑤ Custos ── ⑥ Revisão
               ━━━━━━━━━━━━━━━━━
 Posto: [Operador de empilhadeira ▾] [+ Posto]   Pré-set: [24/7 constante ▾]
 ┌────┬──┬──┬──┬── ... ──┬──┬──┬──────┐
 │    │00│01│02│         │22│23│ Total│
 │Seg │ 4│ 4│ 4│         │ 6│ 6│  118 │
 │... │  │  │  │         │  │  │      │
 │Dom │ 3│ 3│ 3│         │ 4│ 4│   84 │
 └────┴──┴──┴──┴── ... ──┴──┴──┴──────┘
 Dica: selecione células e digite para preencher. Ctrl+V cola do Excel.
                                            [Voltar]  [Continuar →]
```

### 11.3 Comparador de cenários
```
 Comparar cenários                                  [+ Adicionar] [Exportar PDF]
 ┌──────────────┬───────────┬────────────┬────────────┬────────────┐
 │              │ 6x1 (base)│ 6x2        │ 5x2 cont.  │ 12x36      │
 ├──────────────┼───────────┼────────────┼────────────┼────────────┤
 │ Turmas       │     4     │   4 (=)    │  5 (+1)    │  4 (=)     │
 │ Headcount    │   150     │ 158 (+5%)  │ 142 (−5%)★ │ 168 (+12%) │
 │ Custo anual  │ 10,50 mi  │ 10,92 mi   │ 9,84 mi ★  │ 11,20 mi   │
 │ Violações    │ ✕2 !1     │ ✓ 0        │ ✕1 !2      │ !1         │
 └──────────────┴───────────┴────────────┴────────────┴────────────┘
 Custo anual (R$ mi)  0 ─────────────── 12
 6x1     ████████████████▏ 10,50
 5x2     ███████████████   9,84
```

### 11.4 Extrato financeiro
```
 Extrato · 5x2 contínuo · mensal          [Mensal|Anual] [CSV][XLSX][PDF]
 Rubrica               Base       Qtd (h)    Valor/h     Total/mês     %
 Salário base          142 col.   31.240    R$ 18,20   R$ 568.568   69,3
 ▸ Adicional noturno   20%         7.420    R$  3,64   R$  27.009    3,3
 ▸ DSR s/ AN           ...
 ─────────────────────────────────────────────────────────────────────────
 Total                                                 R$ 820.400  100,0
```

## 12. Referências

- Visualização: Datawrapper, Observable Plot, IBM Carbon Data Viz, ferramenta `dataviz` (validador de paleta usado aqui).
- Design systems densos: IBM Carbon, Atlassian, GitHub Primer, Linear (estados), Stripe Dashboard (tabelas financeiras).
- Escalas/WFM: Quinyx, Deputy, When I Work, Kronos/UKG (calendários de turnos) — como referência de padrões, não de estilo.
- Acessibilidade: WCAG 2.2, ARIA APG (padrão *Grid*), Coblis/Sim Daltonism para simular CVD.
- Legislação para microcopy: CLT arts. 58, 59, 66, 67, 71, 73; CF/88 art. 7º XIV; Súmulas 60, 110, 423, 444 TST.

## 13. Entregáveis esperados do designer

1. Biblioteca Figma com tokens (variáveis claro/escuro) espelhando a seção 14.
2. Componentes da seção 8 com todas as variantes e estados da seção 9.
3. Protótipo navegável: wizard completo → dashboard → alerta → correção → comparador → export.
4. Telas em 1440, 1024 (tablet paisagem) e 768 (retrato); estados vazio/carregando/erro.
5. Especificação de interação do heatmap e da grade 168 h (teclado, seleção, tooltip).
6. Guia de microcopy (alertas por regra) e glossário.
7. Checklist WCAG 2.2 AA anotado + simulação CVD (protan/deutan/tritan) das paletas.
8. Handoff com redlines/tokens e notas de Code Connect para React.
9. Teste de usabilidade com ≥ 1 participante por persona (meta: cenário em ≤ 10 min).

## 14. Tokens Tailwind sugeridos

`tailwind.config.js` (usar CSS variables para alternar tema com `class="dark"` ou `data-theme`):

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: { DEFAULT: "rgb(var(--surface) / <alpha-value>)", 2: "rgb(var(--surface-2) / <alpha-value>)" },
        border: "rgb(var(--border) / <alpha-value>)",
        ink: { DEFAULT: "rgb(var(--text) / <alpha-value>)", muted: "rgb(var(--text-muted) / <alpha-value>)", subtle: "rgb(var(--text-subtle) / <alpha-value>)" },
        primary: { DEFAULT: "rgb(var(--primary) / <alpha-value>)", hover: "rgb(var(--primary-hover) / <alpha-value>)" },
        cov: { deficit: "var(--cov-deficit)", low: "var(--cov-low)", ok: "var(--cov-ok)", over: "var(--cov-over)" },
        sev: { critical: "var(--sev-critical)", high: "var(--sev-high)", medium: "var(--sev-medium)", info: "var(--sev-info)", ok: "var(--sev-ok)" },
        turma: { a: "var(--turma-a)", b: "var(--turma-b)", c: "var(--turma-c)", d: "var(--turma-d)", e: "var(--turma-e)", f: "var(--turma-f)" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        micro: ["11px", "14px"], caption: ["12px", "16px"], body: ["14px", "20px"],
        "body-lg": ["16px", "24px"], h2: ["18px", "28px"], h1: ["24px", "32px"], display: ["32px", "40px"],
      },
      borderRadius: { cell: "4px", card: "8px", modal: "12px" },
      spacing: { 18: "4.5rem", sidebar: "240px", "sidebar-sm": "64px" },
      gridTemplateColumns: { heatmap: "64px repeat(24, minmax(28px, 1fr))", week168: "64px repeat(24, minmax(36px, 1fr)) 72px" },
      ringWidth: { focus: "2px" },
    },
  },
  plugins: [],
};
```

`src/index.css`:

```css
:root {
  --bg: 247 248 250; --surface: 255 255 255; --surface-2: 240 242 245; --border: 217 222 229;
  --text: 17 24 39; --text-muted: 75 85 99; --text-subtle: 107 114 128;
  --primary: 29 78 216; --primary-hover: 30 64 175;
  --cov-deficit: #B42318; --cov-low: #F79009; --cov-ok: #0E9384; --cov-over: #1849A9;
  --sev-critical: #B42318; --sev-high: #B54708; --sev-medium: #175CD3; --sev-info: #475467; --sev-ok: #067647;
  --turma-a: #2A6FDB; --turma-b: #C96A00; --turma-c: #14946B; --turma-d: #7A5AF8; --turma-e: #8A6D00; --turma-f: #C2338A;
}
.dark, [data-theme="dark"] {
  --bg: 15 18 22; --surface: 23 27 33; --surface-2: 31 36 44; --border: 46 53 63;
  --text: 231 234 238; --text-muted: 163 171 183; --text-subtle: 133 144 160;
  --primary: 107 155 255; --primary-hover: 141 178 255;
  --cov-deficit: #F97066; --cov-low: #FDB022; --cov-ok: #2ED3B7; --cov-over: #84ADFF;
  --sev-critical: #F97066; --sev-high: #FDB022; --sev-medium: #84ADFF; --sev-info: #A3ABB7; --sev-ok: #47CD89;
  --turma-a: #5B93F0; --turma-b: #CF7A24; --turma-c: #25A87C; --turma-d: #9077F0; --turma-e: #AD8C22; --turma-f: #E05CA8;
}
body { background: rgb(var(--bg)); color: rgb(var(--text)); font-feature-settings: "tnum" 1, "cv11" 1; }
.pattern-deficit { background-image: repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 5px); }
.pattern-low     { background-image: repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 7px); }
.pattern-over    { background-image: radial-gradient(currentColor 1px, transparent 1.5px); background-size: 6px 6px; }
```
