# 04 — Briefing de Design · Simulador Operacional de Cobertura 24/7

> Documento para o(a) designer de produto. Base: `01-PRD.md` (PRD v3.3, IDs FR-xx; MVP de 4 sprints) e `03-fluxo-do-app.md` (telas T0–T9, rotas e passos do wizard). **Posicionamento:** simulador **operacional** — a tela-herói é o heatmap de cobertura; viabilidade CLT aparece como restrição; custos são módulo P2. Stack-alvo: React 19 + Tailwind (`frontend/`, hoje com `tailwind.config.js` sem extensões — este briefing propõe os tokens).

---

> **Corte do MVP (v3.3, 4 sprints — `06` §3.4):** componentes e wireframes marcados **[MVP]**, **[MVP parcial]**, **[Fase 2]** ou **[P2]**. Interface mínima do MVP: wizard (8.7, 8.8), heatmap 7×24 com filtro por cargo (8.1), cards de KPI (8.3), calendário de turmas (8.2) e painel de achados (8.4), com os tokens da §14. Componentes ricos (8.9–8.11, 8.13 completo) e comparador (8.6) são Fase 2. Desktop ≥ 1280 px no MVP (NFR-07).

## 1. Objetivos de design

1. **Responder em segundos três perguntas**: *Estou coberto em todas as 168 h? Onde e quando estão os furos? Quantas turmas/pessoas (e folguistas) preciso para fechá-los?*
2. **Time-to-coverage ≤ 10 min** (KPI do PRD §3.3) até o 1º heatmap de cobertura, via wizard guiado com padrões inteligentes.
3. **Tornar o déficit visível e acionável**: todo furo aponta o local exato (dia × hora × posto), a causa (turmas insuficientes, intervalo sem rendição, feriado, absenteísmo) e uma correção sugerida ("+1 turma", "+2 folguistas", "trocar para 5 turmas").
4. **Viabilidade como restrição, não como sermão**: uma escala que viola interjornada/DSR é sinalizada como *inviável* com a regra (CLT/CF/Súmula/CCT) e a correção — sem dominar a tela.
5. **Comparar modelos de escala pela cobertura**: cenários lado a lado com % horas-posto cobertas, déficit, pico de subcobertura e headcount. Custo (P2) entra depois como linha adicional.
6. **Gerar confiança auditável**: cada número tem origem rastreável (premissa → regra → cálculo).

## 2. Princípios

| Princípio | O que significa na prática |
|---|---|
| **Densidade com hierarquia** | Telas ricas (heatmap 7×24, grade 168 h, extrato) são aceitáveis para usuários especialistas, desde que haja um *nível de leitura rápida* (KPIs + status) acima do detalhe. Progressive disclosure: resumo → drill-down → célula. |
| **Confiança & auditabilidade** | Numerais tabulares, unidades sempre explícitas (h, h:mm, R$, %), premissas visíveis em painel "Premissas do cálculo", versão do cenário + carimbo de data/autor, botão "Como calculamos?" em todo KPI. Nada de número "mágico". |
| **Cobertura primeiro** | KPIs de cobertura no topo de toda tela de resultado; restrições legais em painel secundário; custos só quando o módulo P2 existir. |
| **Clareza de alertas legais** | Linguagem simples primeiro, fundamento jurídico depois. Severidade sempre com cor **+ ícone + rótulo textual**. Um alerta = um problema = uma ação. |
| **Cor nunca sozinha** | Cobertura, severidade e turmas usam sempre um segundo canal (ícone, padrão de textura, letra). |
| **Reversível e sem medo** | Simulação é rascunho: desfazer/refazer, duplicar cenário, comparar antes/depois. Ações destrutivas pedem confirmação. |
| **Consistência de entidade** | A turma A tem a mesma cor em todas as telas, filtros não repintam turmas. |

## 3. Personas e contexto de uso

| Persona | Contexto | Tela-âncora | Necessidade de design |
|---|---|---|---|
| Gerente de Planta / Ops 24/7 (primária) | Desktop no escritório da planta, às vezes tablet no chão de fábrica | Heatmap de cobertura + KPIs + calendário de turmas | Ver furos de cobertura de imediato, saber quantas turmas/folguistas fecham o déficit |
| Gestora de Enfermagem | Tablet/desktop na coordenação, interrupções frequentes | Calendário cíclico 12x36 | Salvar automático, retomar onde parou, alto contraste em ambiente noturno (modo escuro) |
| Planejamento / PCP / WFM | Desktop, compara alternativas | Comparador de cenários (cobertura) | Deltas claros de cobertura/headcount, export XLSX |
| BP / Jurídico Trabalhista (secundária) | Desktop, leitura minuciosa | Aba `viabilidade` + trilha de auditoria | Citação legal, filtros por regra, export com fundamentação |
| CFO (fase futura, P2) | Reuniões, tela compartilhada | Extrato financeiro / comparador de custo | Só quando o Módulo 6 existir |

**Plataformas**: desktop-first (≥ 1280 px; layout ideal 1440 px). Tablet (768–1279 px, paisagem e retrato) com funcionalidade completa de leitura e edição leve. Mobile (< 768 px) somente leitura de KPIs/alertas — fora do escopo do MVP visual, mas não pode quebrar.

## 4. Tom de voz e microcopy

**Tom**: especialista, direto, calmo. Nunca alarmista, nunca jurídico-hermético. Frase 1 = o que acontece; frase 2 = por que importa; ação = verbo no imperativo. Fundamento legal em linha secundária.

### Exemplos de alertas

Severidades canônicas (`01-PRD.md` Apêndice A): **Erro** (escala inviável / bloqueia homologação), **Alerta** (exige ciência), **Info**.

| Severidade | Código | Título | Corpo | Fundamento | Ação |
|---|---|---|---|---|---|
| Erro | `COB_DEFICIT_POSTO_CRITICO` | Posto crítico descoberto | Domingo 02:00–05:00 a Caldeira fica com 2 de 3 operadores. | FR-02 | **+1 folguista** · Ver no heatmap |
| Erro | `COB_TURMAS_INSUFICIENTES` | 4 turmas não fecham a 4x2 | Com 4 turmas, 11% dos turnos-dia ficam sem equipe. São necessárias 5 turmas (ou 9 meias-turmas). | `01-PRD` §6 | **Usar 5 turmas** |
| Alerta | `COB_FURO_INTERVALO` | Posto vazio no intervalo | O intervalo de 1 h não tem rendição: 63 horas-posto descobertas por semana. | CLT art. 71 · FR-10 | **Adicionar volantes** |
| Alerta | `COB_DEFICIT_ESPERADO_SHRINKAGE` | Noite fica curta com as ausências | Com 12% de absenteísmo noturno, a cobertura esperada cai para 2,6 de 3 postos. | FR-11 | Adicionar reserva |
| Erro | `CLT_INTERJORNADA` | Descanso entre jornadas abaixo de 11 h | A Turma C sai às 22:00 de terça e volta às 06:00 de quarta — só 8 h. | CLT art. 66 | **Ajustar rotação** |
| Alerta | `CLT_REVEZAMENTO_6H` | Turno ininterrupto acima de 6 h sem negociação coletiva | Turnos de 8 h em revezamento exigem acordo ou convenção coletiva. | CF/88 art. 7º, XIV · Súmula 423 TST | **Informar ACT/CCT** |
| Alerta | `CLT_DOMINGO_PERIODICIDADE` | Domingo sem folga há 8 semanas | A Turma E não folga em um domingo desde a semana 1 (limite: 7). | Portaria MTP 671/2021 · CCT | Redistribuir folgas |
| Alerta | `COB_K_INSUFICIENTE` | 4 turmas não bastam para a 4x2 | O acordo limita a operação a 4 turmas; com elas 88,9% das horas-posto ficam cobertas (56 h-posto/sem em déficit). | FR-32 | **Ver alternativas com 4 turmas** |
| Erro | `COB_CARGO_SEM_QUALIFICADO` | Plantão sem enfermeiro | Turma D, noite de quinta: 5 técnicos e nenhum enfermeiro. O mínimo é 1 por plantão. | FR-36 | **Ajustar composição** |
| Erro | `COB_TURMA_ABAIXO_MINIMO` | Turma C abaixo do mínimo | A Turma C tem 2 pessoas; o mínimo definido é 3. | FR-33 | Ajustar tamanho |
| Info | `COB_COBERTURA_POR_SUBSTITUICAO` | Técnico coberto por enfermeiro | 14 h-posto de técnico nesta semana são cobertas por enfermeiros excedentes. | FR-35 | Ver horas |
| Info | `COB_PADRAO_NAO_EXATO` | Sequência não fecha com turmas inteiras | Esta sequência precisa de 4,5 turmas. Use 5 turmas (11% de sobra) ou 9 meias-turmas. | FR-29 | **Usar 9 meias-turmas** |
| Info | `INFO_DIVERGENCIA_59A_SUMULA60` | Prorrogação noturna na 12x36 | Há divergência entre art. 59-A e Súmula 60; usamos o parâmetro da CCT. | CLT art. 59-A · Súmula 60 TST | Ver detalhe |

### Outros exemplos
- Estado vazio do heatmap: "Defina quantas pessoas cada posto precisa por hora para ver a cobertura."
- Sucesso: "Cenário calculado. 100% das horas-posto cobertas · 0 erros · 2 alertas."
- Erro de cálculo: "Não conseguimos calcular este cenário. Seus dados estão salvos — tente de novo ou revise a etapa 4 (Modelo e turmas)."
- KPI tooltip: "Headcount mínimo = turmas necessárias × postos por turno + reserva para absenteísmo de 4% (editável)."
- Botão: preferir "Simular cobertura", "Fechar déficit", "Comparar cenários", "Exportar" a "OK/Enviar".
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

### 5.2 Cobertura (semântica do heatmap) — déficit / exato / excesso, seguro para daltônicos

Verde × vermelho puro falha para deuteranopia/protanopia. Proposta: **eixo divergente laranja-vermelho (déficit) ↔ verde-azulado (exato) ↔ azul (excesso)**, com ícone e textura redundantes. Os três estados do PRD (FR-09) ganham duas intensidades de déficit:

| Estado | Regra | Claro | Escuro | Ícone | Padrão (textura) |
|---|---|---|---|---|---|
| Déficit forte | cobertura < 90% da demanda **ou** posto crítico | `#B42318` | `#F97066` | ▲ triângulo com "!" | hachura diagonal 45° densa |
| Déficit leve | 90% ≤ cobertura < 100% | `#F79009` fill `#FEF0C7` | `#FDB022` fill `#4E3A10` | ▲ contorno | hachura 45° espaçada |
| Exato | cobertura = demanda | `#0E9384` fill `#CCFBEF` | `#2ED3B7` fill `#0B3B36` | ✓ check | liso |
| Excesso | cobertura > demanda | `#1849A9` fill `#D1E0FF` | `#84ADFF` fill `#1A2D5C` | ● círculo / "+n" | pontilhado |

Camadas sobrepostas (toggle): **furo no intervalo** (borda tracejada + ícone ⏸), **feriado** (marcador "F" no cabeçalho do dia), **visão "postos + reserva"** (mesma escala, valores esperados).
- Intensidade no heatmap: rampa **sequencial de um só tom** dentro de cada lado (5 passos), nunca arco-íris.
- Em `forced-colors`/impressão, a textura assume a codificação.
- O número (ex.: `−2`, `+1`) aparece na célula em zoom ≥ 100% ou no hover.

### 5.3 Severidade de alertas (reservadas — nunca usadas para turmas)

| Severidade | Cor texto/ícone (claro / escuro) | Fundo (claro / escuro) | Ícone |
|---|---|---|---|
| Erro | `#B42318` / `#F97066` | `#FEF3F2` / `#3A1513` | octógono ✕ |
| Alerta | `#B54708` / `#FDB022` | `#FFFAEB` / `#3A2A0C` | triângulo ! |
| Info | `#175CD3` / `#84ADFF` | `#EFF8FF` / `#14234A` | círculo i |
| Conforme (estado, não severidade) | `#067647` / `#47CD89` | `#ECFDF3` / `#0D2E1E` | escudo ✓ |

### 5.4 Cores das turmas A–F (categóricas, ordem fixa)

Validadas com `dataviz/scripts/validate_palette.js` (claro: todos PASS; escuro: ver nota da turma B — banda de luminosidade, croma, separação CVD ΔE ≥ 8,5, visão normal ≥ 22, contraste ≥ 3:1). **A ordem importa** (verde não pode ficar adjacente ao magenta).

| Turma | Claro | Escuro | Letra/forma redundante |
|---|---|---|---|
| A | `#2A6FDB` | `#5B93F0` | "A" + círculo |
| B | `#C96A00` | `#CF7A24`* | "B" + quadrado |
| C | `#14946B` | `#25A87C` | "C" + triângulo |
| D | `#7A5AF8` | `#9077F0` | "D" + losango |
| E | `#8A6D00` | `#AD8C22` | "E" + hexágono |
| F | `#C2338A` | `#E05CA8` | "F" + estrela |

\* **Turma B no modo escuro — `#CF7A24` (validado para contraste):** contraste WCAG calculado (fórmula de luminância relativa WCAG 2.x) = **5,78:1** contra `bg` `#0F1216`, **5,32:1** contra `surface` `#171B21` e **4,80:1** contra `surface-2` `#1F242C` — todos ≥ 3:1 (1.4.11). O laranja original `#D9822A` (6,42:1) passava em contraste, mas ficava acima da banda de luminosidade da paleta. **Pendente:** rerodar `validate_palette.js` (banda de luminosidade, croma e separação CVD ΔE da paleta escura completa com `#CF7A24`) — o cálculo feito nesta revisão cobre só contraste. Rótulo da turma sempre em texto (`text`), nunca na cor da turma. Mais de 6 turmas → não gerar cor nova; usar padrão/rótulo.

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

### 8.1 Heatmap de cobertura 7×24 [MVP — com filtro por cargo]
- Linhas = dias (seg→dom), colunas = horas 00–23; célula ≥ 28×24 px desktop, gap de 2 px na cor da superfície.
- Faixa noturna 22:00–05:00 sinalizada por sombreado leve no cabeçalho + ícone lua.
- Hover/focus: tooltip "Ter 03:00 · Necessário 6 · Escalados 4 · Déficit −2 · Turmas C, D · ocorre em 3 de 8 semanas". Alvo de hover = célula inteira. Clique em déficit abre a T5 filtrada.
- Uma linha de filtros acima: posto/função · **Postos | Postos + reserva** (FR-11) · **Pior caso | Média** do horizonte · camada **Furos no intervalo** (FR-10) · camada **Feriados** (FR-12). Legenda sempre visível com ícone + padrão.
- Alternativa acessível: botão "Ver como tabela" e navegação por setas (roving tabindex, `role="grid"`).
- Resumo acima: "97,6% das horas-posto cobertas · 4 horas com déficit (todas na madrugada de domingo) · pico −2 dom 03:00". Ao lado, card **"Como fechar o déficit"** com 1–3 sugestões do motor (FR-08, FR-13).

### 8.2 Calendário cíclico de turmas [MVP]
- Linhas = turmas A–F + linhas de folguistas (FL1…); colunas = dias do ciclo calendário completo `mmc(L,7)` (12x36: 14 · 6x2: 56 · 4x2: 42 · 5 turmas: 70 · 6x1: 7), agrupados por semana com zoom semana/ciclo.
- Célula mostra código do turno (M/T/N/D12/N12/F) com fundo da cor da turma (turnos) e neutro hachurado (folga). Domingos e feriados destacados.
- Marcadores de violação inline (ícone de severidade no canto da célula).
- Controles: "Rotacionar", "Deslocar início", zoom semana/ciclo, ver por colaborador.

### 8.3 Card de KPI [MVP]
- Rótulo (caption) → número-herói (display, tabular) → unidade → delta vs. cenário-base (seta + texto "▲ 3 turmas a mais", nunca só cor) → sparkline opcional → link "Como calculamos?".
- KPIs padrão (FR-14): **% horas-posto cobertas** (herói), Horas-posto em déficit, Pico de subcobertura (com dia/hora), Turmas (atual/necessárias), Headcount (atual/mínimo), Furos no intervalo, Violações (Erro/Alerta). Custo mensal/anual só com o Módulo 6 (P2).

### 8.4 Painel de alertas com severidade [MVP — painel de achados]
- Lista agrupada por severidade com contadores; filtros por regra, turma, severidade.
- Item: ícone + rótulo de severidade, título, corpo, fundamento legal (link para trecho), "Ir para" (destaca célula no heatmap/calendário), ação de correção, "Justificar/aceitar risco" (com campo obrigatório, entra na auditoria).
- Região `aria-live="polite"` anuncia mudanças no total ao recalcular.

### 8.5 Tabela de extrato financeiro — P2 (fase futura) [P2]
- Não faz parte do MVP visual; desenhar apenas como variante futura (aba `custos` da T4).
- Colunas: Rubrica · Base de cálculo · Qtd. (h) · Valor unitário · Total mensal · Total anual · % do total.
- Rubricas: Salário base, Adicional noturno (20%), Hora noturna reduzida, DSR, DSR s/ AN, HE 50%/100%, Encargos.
- Números alinhados à direita, tabulares; totais em negrito com borda superior; linhas expansíveis mostrando a fórmula. Export CSV/XLSX/PDF.

### 8.6 Comparador de cenários [Fase 2]
- Até 5 colunas (FR-22; ex.: 6x1 · 12x36 · 6x2 4T · 4x2 5T · 5 turmas), cenário-base fixado à esquerda.
- Linhas: turmas, headcount (sem/com reserva), h/sem média, % horas-posto cobertas, horas-posto em déficit, pico de subcobertura, excesso, furos no intervalo, violações; diferença absoluta e % por célula; melhor valor marcado com ícone ★ + texto. Linhas de custo só na P2.
- Gráfico de barras horizontais de horas-posto em déficit e de headcount (eixo único, começa em zero, rótulos diretos) — **nunca eixo duplo**.

### 8.7 Wizard stepper [MVP]
- Etapas (iguais a `03-fluxo-do-app.md` T3): 1 Operação e regras (CCT/ACT) → 2 Demanda (postos fixos ou grade 168 h) → 3 Shrinkage e reserva → 4 Modelo de escala e turmas → 5 Revisão e simular. Parâmetros de custo: seção recolhida "Fase 2" no passo 5.
- v3.2: passo 2 ganha "Demanda por cargo + mínimos"; passo 4 ganha blocos "Turmas (K)", "Composição por cargo" e "Camadas", e o botão "Personalizar" abre o construtor (T9) em tela cheia, voltando ao passo 4 ao salvar. O nº de passos não muda.
- Stepper horizontal no desktop, vertical/compacto no tablet; estado por etapa (pendente, atual, completa, com erro). Salvamento automático; "Voltar" nunca perde dados.

### 8.8 Grid editável 168 h [MVP]
- 7×24 de inputs numéricos (pessoas por posto/hora). Seleção por arraste/shift, preencher série, copiar dia → dias, colar do Excel, atalhos (Ctrl+Z, Ctrl+D).
- Pré-sets: "24/7 constante", "pico comercial", "noite reduzida".
- Validação inline (inteiro ≥ 0) com mensagem textual; totais por linha/coluna fixos.

### 8.9 Editor de sequência do ciclo (construtor, T9 — FR-29) [Fase 2 — no MVP, campo de sequência em texto/tabela no passo 3.4]
- **Trilha horizontal de chips** (um por dia do ciclo, 40×40 px, rolagem horizontal acima de 28 posições, contador `L = 9` fixo à direita). Chip = código do turno (M/T/N/D12/N12/INT/F/R) com cor **do turno** (neutros + ícone: ☀ M, ◐ T, ☾ N, F hachurado) — **nunca** a cor da turma (§5.4) nem de severidade.
- **Arrastar** para reordenar, **paleta** de turnos à esquerda para soltar, `Alt+arrastar` duplica, seleção múltipla com Shift. Teclado: setas movem o foco, `Ctrl+←/→` move o chip, letras M/T/N/F trocam o código, `Del` remove, `Insert` adiciona. Anúncio `aria-live`: "Posição 5 alterada para Noite. K necessário 4,5 — não exato."
- **Gerador rápido** acima da trilha: "Bloco de [2] dias por turno · ordem [M→T→N | N→T→M] · [3] folgas" → preenche a trilha.
- **Marcadores de achado** sob o chip afetado: sublinhado + ícone de severidade (ex.: transição N→T com `CLT_INTERJORNADA`), tooltip com a regra.
- **Mini-calendário de turmas** abaixo (turmas × `mmc(L,7)` dias, células 12 px) atualizado ao vivo; linha de turma arrastável para mudar o **offset**.
- **Painel de validação ao vivo** (lado direito, fixo): K\* (com "exato ✓" ou "não exato — 5 turmas (+11%) ou 9 meias-turmas"), h/sem, maior sequência trabalhada, menor interjornada, maior descanso em 7 dias, domingos de folga no ciclo; cada linha com ícone ok/alerta/erro + texto.

### 8.10 Régua de turnos (construtor, T9) [Fase 2]
- Linha do tempo 00–24 h (estende a 36 h para turnos que cruzam a meia-noite); cada turno é uma barra arrastável (início) com alças (duração, passo 15 min); **sobreposições** empilham em faixas e mostram o total de pessoas na faixa sobreposta.
- Intervalo intrajornada como recorte na barra; política (rendição / não computado / volante / escalonado) em ícone + rótulo; "escalonado" mostra subgrupos defasados.

### 8.11 Matriz cargo × cargo (T8.2 — FR-35) [Fase 2 — no MVP, tabela simples "A pode cobrir B" no passo 3.3]
- Grade quadrada: linhas = **quem cobre**, colunas = **quem é coberto**; cabeçalho de linha com nível hierárquico (badge "N3"). Rótulos explícitos nos eixos ("pode cobrir →", "↓ cargo que cobre") — a direção é a informação mais importante.
- Célula: vazio = "não cobre" (traço cinza, `—`); ✓ = cobre 100%; fração ("0,5") = parcial (P1); número pequeno = prioridade; ícone escudo = vale para mínimo. Diagonal travada e hachurada.
- Clique/Enter abre popover (fator, prioridade, vale para mínimo, limite de horas fora do cargo — P1). Atalho "Nível superior cobre inferior" preenche o triângulo e destaca as células alteradas antes de confirmar.
- Painel de leitura em linguagem natural (lista sincronizada): "Enfermeiro → Técnico de enfermagem · 100% · prioridade 2". Assimetria A→B sem B→A é mostrada com seta ↗ na célula espelho vazia (tooltip "Técnico não cobre Enfermeiro").
- Acessível como `role="grid"` com `aria-label` por célula ("Enfermeiro cobre Técnico: sim, 100%, prioridade 2").

### 8.12 Visualização de cobertura por cargo (T4 `cobertura`) [MVP parcial: filtro por cargo no heatmap; tabela cargo × KPI e glifo ↺ Fase 2]
- Seletor segmentado acima do heatmap: **Todos · Enfermeiro · Técnico · Supervisor · Só substituições**. Com um cargo selecionado, o heatmap usa a mesma semântica déficit/exato/excesso (§5.2) **daquele cargo**; células cobertas por substituição recebem o glifo ↺ e textura pontilhada (não muda a cor — continua "exato").
- **Barra empilhada por hora** (variante compacta abaixo do heatmap): próprio cargo (sólido) + por substituição (pontilhado) + déficit (contorno vermelho tracejado, só contorno — não compete com a semântica do heatmap).
- **Tabela cargo × KPI**: demanda (h-posto), coberto pelo próprio cargo, por substituição, déficit, horas sem qualificado (ERRO em destaque).
- Cores de cargo: **não** usar as cores de turma; cargo é identificado por **rótulo + ícone** (estetoscópio, chave, escudo) e, quando precisar de cor, pela escala neutra/primária com padrão.

### 8.13 Controle de turmas (K) e tamanho (T2.2, passo 3.4) [MVP parcial: campo numérico K + modo fixo/mínimo; slider, faixa e tamanho Fase 2]
- Segmented **Fixo | Faixa | Livre**; Fixo = stepper numérico; Faixa = slider de dois polegares 1–12 com marca vertical em **K\*** do modelo ("K\* = 4,5"); Livre = texto "o motor sugere o menor K".
- Abaixo, "cobertura alcançável com K = 4: 88,9% · déficit 56 h-posto/sem" (atualiza ao mover). Tamanho por turma: par de inputs mín./máx. + toggle "permitir meias-turmas" (mostra A1/A2 nos badges).
- Turmas com tamanhos diferentes: tabela turma × cargo (composição), totais por turma e alerta inline `COB_TURMA_ABAIXO_MINIMO`.

### Outros
Botões (primário, secundário, fantasma, destrutivo), inputs com máscara pt-BR, select de escala com descrição, badge de turma, chip de filtro, toast, modal, drawer de detalhes, tooltip, skeleton, banner de premissas, trilha de auditoria (timeline).

## 9. Estados

Para cada componente documentar: **padrão, hover, foco (visível), ativo, desabilitado, carregando (skeleton / "Calculando cobertura…" com progresso por módulo M1→M4), vazio (com CTA), erro (com recuperação), sucesso, desatualizado** ("Premissas mudaram — recalcular"), **somente leitura** (cenário homologado, com cadeado) e **comparação** (diff destacado).

## 10. Acessibilidade — WCAG 2.2 AA [MVP: teclado, contraste e heatmap sem depender de cor; auditoria completa Fase 2]

- Alvo: **WCAG 2.2 AA** (NFR-06 do `01-PRD.md`).
- Contraste: texto ≥ 4.5:1, texto grande e componentes/gráficos ≥ 3:1 (1.4.3, 1.4.11), em ambos os temas.
- Cor nunca é o único canal (1.4.1): ícone + padrão + texto em cobertura, severidade e turmas.
- Teclado total (2.1.1): grid e heatmap com setas, Home/End, PageUp/Down; sem armadilhas.
- **Foco visível e não obscurecido** (2.4.7, 2.4.11): anel 2 px; cabeçalhos fixos não cobrem a célula focada.
- **Alvos ≥ 24×24 px** (2.5.8); células menores ganham alvo expandido ou modo zoom.
- **Arrastar tem alternativa** (2.5.7): seleção por shift+setas e campos de intervalo.
- **Ajuda consistente** (3.2.6) e **entrada redundante evitada** (3.3.7): wizard reaproveita dados.
- Leitores de tela: `role="grid"`, `aria-label` por célula ("Terça, 03 horas, déficit de 2 postos"), tabelas com `<th scope>`, `aria-live` para recálculo, alternativa tabular para todo gráfico.
- Reflow a 320 px CSS / zoom 400% sem perda (1.4.10) — grades rolam no contêiner.
- `prefers-reduced-motion` respeitado; modo escuro e `forced-colors` testados.
- Idioma `lang="pt-BR"`; abreviações (DSR, HE, CCT) com `<abbr title>` na primeira ocorrência.

## 11. Wireframes ASCII

### 11.1 Resultado do cenário (T4, aba `cobertura`) [MVP]
```
┌──────────┬───────────────────────────────────────────────────────────────────────┐
│ ◧ Logo   │ Cenário: CD Cajamar · 5 turmas · v3 · salvo 14:02   [Comparar][Exportar▾]│
│          ├───────────────────────────────────────────────────────────────────────┤
│ Operações│ ┌Cobertura──┐┌Déficit────┐┌Pico─────────┐┌Turmas──┐┌Headcount┐┌Viabil.─┐│
│ Cenários │ │  97,6%    ││ 12 h-posto││ −2 dom 03:00││ 5 / 5  ││ 15 / 16 ││ ✕0  !2 ││
│ Comparar │ │▲+2,1pp 6x1││▼−30 vs 6x1││             ││=necess.││mín. 16  ││        ││
│ Auditoria│ └───────────┘└───────────┘└─────────────┘└────────┘└─────────┘└────────┘│
│          ├ [cobertura] [escala] [viabilidade] ──────────────┬──────────────────────┤
│          │ Posto:[Operador▾] [Postos|Postos+reserva] [Pior|Média] │ COMO FECHAR O     │
│          │      00 01 02 03 ... ☾22 23                       │ DÉFICIT           │
│          │ Seg  ✓  ✓  ✓  ✓  ...  ✓  ✓                        │ • +1 folguista    │
│          │ Ter  ✓  ✓  ●  ●  ...  ✓  ✓                        │   (zera 12 h-posto)│
│          │ ...                                               │ • Turno N 22–05   │
│          │ Dom  ▲  ▲  ▲  ▲  ...  ✓  ✓                        │ ALERTAS (2)       │
│          │ Legenda: ▲Déficit ◬Leve ✓Exato ●Excesso ⏸Intervalo │ ! Domingo s/ folga│
│          │ [Ver como tabela]   Top horas em déficit ▸         │ ! Revezamento 8 h │
│          ├───────────────────────────────────────────────────┴──────────────────────┤
│          │ Calendário (ciclo 70 dias)       [Semana|Ciclo] [Rotacionar]          │
│          │      S1: seg ter qua qui sex sáb dom | S2: ...                        │
│          │  A●   M   M   T   T   N   N  /F/   |  ...                             │
│          │  B■  /F/ /F/  M   M   T   T   N    |  ...                             │
│          │  FL1  ·   ·   ·   ·   ·   ·   N    |  ...                             │
└──────────┴───────────────────────────────────────────────────────────────────────┘
```

### 11.2 Wizard — etapa 2 (grid 168 h) [MVP]
```
 ① Operação e regras ── ② Demanda ── ③ Shrinkage e reserva ── ④ Modelo e turmas ── ⑤ Revisão
                        ━━━━━━━━━━
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

### 11.3 Comparador de cenários (T6) [Fase 2]
```
 Comparar cenários                                        [+ Adicionar] [Exportar XLSX]
 ┌────────────────────┬───────────┬───────────┬───────────┬───────────┬───────────┐
 │                    │ 6x1 (base)│ 12x36     │ 6x2 4T    │ 4x2 5T    │ 5 turmas  │
 ├────────────────────┼───────────┼───────────┼───────────┼───────────┼───────────┤
 │ Turmas             │  4 + 2 FL │   4       │   4       │   5       │   5       │
 │ Headcount          │   14      │   8*      │  12 ★     │  15       │  15       │
 │ h/sem por pessoa   │   48      │   42      │   42      │  37,3     │  33,6     │
 │ % h-posto cobertas │  96,4%    │ 100% ★    │ 100% ★    │ 100% ★    │ 100% ★    │
 │ Déficit (h-posto)  │   18      │   0       │   0       │   0       │   0       │
 │ Excesso            │   0%      │   0%      │   0%      │  11,1%    │   0%      │
 │ Violações          │ ✕1 !2     │ ✓ 0       │ !1        │ !1        │ !1        │
 └────────────────────┴───────────┴───────────┴───────────┴───────────┴───────────┘
 * 12x36 com 2 postos por turno. Linhas de custo aparecem quando o Módulo 6 (P2) existir.
 Déficit (h-posto/semana)  0 ─────────────── 20
 6x1     ██████████████████ 18
 6x2     ▏ 0
```

### 11.4 Extrato financeiro — P2 (fase futura, fora do MVP visual) [P2]
```
 Extrato · 5 turmas · mensal          [Mensal|Anual] [CSV][XLSX][PDF]
 Rubrica               Base       Qtd (h)    Valor/h     Total/mês     %
 Salário base          142 col.   31.240    R$ 18,20   R$ 568.568   69,3
 ▸ Adicional noturno   20%         7.420    R$  3,64   R$  27.009    3,3
 ▸ DSR s/ AN           ...
 ─────────────────────────────────────────────────────────────────────────
 Total                                                 R$ 820.400  100,0
```

### 11.5 Construtor de escala (T9) [Fase 2]

```
┌─ Construtor · "6x2 UTI" (derivado de 6x2) ───────────────────────── [Salvar template] [Usar no cenário] ┐
│ Gerador: bloco [2] dias · ordem [M→T→N ▾] · folgas [2]  (aplicar)                                       │
│ Sequência (L = 8)                                                                                        │
│  [☀M][☀M][◐T][◐T][☾N][☾N][ F ][ F ]   + │ Paleta: ☀M ◐T ☾N D12 N12 INT F R                              │
│ Turnos            00   04   08   12   16   20   24   04                    │ Validação ao vivo            │
│  M  06–14 ▐████████▌ intervalo 1h · rendição                                 │ K* = 4  ✓ exato              │
│  T  14–22          ▐████████▌                                               │ 42,0 h/sem                   │
│  N  22–06                    ▐████████▌                                     │ máx. 6 dias seguidos ✓       │
│  INT 10–18 (camada reforço) ▐██████▌  ⧉ sobreposição +1                     │ menor interjornada 24 h ✓    │
│ Turmas  K = 4 (restrição: fixo 4)  tamanho 3–4  [ ] meias-turmas            │ descanso 7 d ≥ 72 h ✓        │
│  A off 0 ▮▮▮▮▮▮▯▯▮▮…   B off 2 …   C off 4 …   D off 6 …                     │ domingo folga 1/8 sem ⚠ N=7  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 11.6 Matriz de substituição (T8.2) [Fase 2]

```
┌─ Quem pode cobrir quem ───────────────────── [Nível superior cobre inferior] [Salvar] ┐
│                 é coberto →  Supervisor  Enfermeiro  Técnico enf.  │ Leitura            │
│ ↓ cobre                                                             │ Supervisor → Enf.  │
│ Supervisor (N4)              ▨▨▨▨       ✓ 1 🛡       ✓ 3           │  100% · p1 · mín.  │
│ Enfermeiro (N3)               —          ▨▨▨▨       ✓ 2           │ Enfermeiro → Téc.  │
│ Técnico enf. (N2)             —            — ↗       ▨▨▨▨         │  100% · p2         │
│ Legenda: ✓ cobre 100% · 0,5 parcial (P1) · nº prioridade · 🛡 vale p/ mínimo · — não cobre │
└───────────────────────────────────────────────────────────────────────────────────────┘
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
3. Protótipo navegável: wizard completo → resultado (heatmap) → déficit → "Como fechar o déficit" → ajuste de escala → comparador → export; e (v3.2) cadastro de cargos → matriz de substituição → construtor de escala → heatmap filtrado por cargo.
4. Telas em 1440, 1024 (tablet paisagem) e 768 (retrato); estados vazio/carregando/erro.
5. Especificação de interação do heatmap e da grade 168 h (teclado, seleção, tooltip).
6. Guia de microcopy (alertas por regra) e glossário.
7. Checklist WCAG 2.2 AA anotado + simulação CVD (protan/deutan/tritan) das paletas.
8. Handoff com redlines/tokens e notas de Code Connect para React.
9. Teste de usabilidade com ≥ 1 participante por persona (meta: 1º heatmap de cobertura em ≤ 10 min).

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
        cov: { deficit: "var(--cov-deficit)", low: "var(--cov-low)", exact: "var(--cov-exact)", over: "var(--cov-over)" },
        sev: { erro: "var(--sev-erro)", alerta: "var(--sev-alerta)", info: "var(--sev-info)", ok: "var(--sev-ok)" },
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
  --cov-deficit: #B42318; --cov-low: #F79009; --cov-exact: #0E9384; --cov-over: #1849A9;
  --sev-erro: #B42318; --sev-alerta: #B54708; --sev-info: #175CD3; --sev-ok: #067647;
  --turma-a: #2A6FDB; --turma-b: #C96A00; --turma-c: #14946B; --turma-d: #7A5AF8; --turma-e: #8A6D00; --turma-f: #C2338A;
}
.dark, [data-theme="dark"] {
  --bg: 15 18 22; --surface: 23 27 33; --surface-2: 31 36 44; --border: 46 53 63;
  --text: 231 234 238; --text-muted: 163 171 183; --text-subtle: 133 144 160;
  --primary: 107 155 255; --primary-hover: 141 178 255;
  --cov-deficit: #F97066; --cov-low: #FDB022; --cov-exact: #2ED3B7; --cov-over: #84ADFF;
  --sev-erro: #F97066; --sev-alerta: #FDB022; --sev-info: #84ADFF; --sev-ok: #47CD89;
  --turma-a: #5B93F0; --turma-b: #CF7A24; --turma-c: #25A87C; --turma-d: #9077F0; --turma-e: #AD8C22; --turma-f: #E05CA8;
}
body { background: rgb(var(--bg)); color: rgb(var(--text)); font-feature-settings: "tnum" 1, "cv11" 1; }
.pattern-deficit { background-image: repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 5px); }
.pattern-low     { background-image: repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 7px); }
.pattern-over    { background-image: radial-gradient(currentColor 1px, transparent 1.5px); background-size: 6px 6px; }
```
