# PRD v3.1 — Simulador Operacional de Cobertura 24/7 (Brasil/CLT)

| Metadado | Detalhe |
| :--- | :--- |
| **Produto** | Simulador de Escalas & Cobertura 24/7 (Workforce Coverage Simulator) |
| **Versão** | 3.1 — reposicionado como **simulador operacional de cobertura** (substitui v3.0 e `00-prd-original.md`, v2.0) |
| **Status** | Pronto para planejamento técnico (Spec) |
| **Stack alvo** | Frontend: React 19 + TypeScript + Vite 7 + Tailwind 4 (`/frontend`). Backend: FastAPI + Python + PostgreSQL 16 (`/backend`). Detalhes em `02-TRD.md` |
| **Data** | Novembro/2026 |

> **Posicionamento:** este é um simulador **operacional**. O objetivo é responder **"minha operação está coberta, hora a hora, nas 168 h da semana — e quantas turmas/pessoas preciso para isso?"**. As regras trabalhistas entram como **restrições de viabilidade** da escala (uma escala que viola interjornada ou DSR não é uma solução válida). O cálculo financeiro é **módulo secundário de fase futura** (P2).
>
> **Aviso:** ferramenta de apoio à decisão. Não substitui parecer jurídico nem a CCT/ACT aplicável. Toda regra legal é parametrizável e exibida com a fonte normativa.

---

## 1. Problema

Operações ininterruptas (indústria contínua, CDs, hospitais, NOC, segurança, saneamento) precisam manter **postos ocupados 168 h/semana** com turmas em revezamento. Hoje o dimensionamento é feito em planilhas que não modelam a matriz *turma × dia × hora* e, por isso, **não enxergam os furos de cobertura**: a madrugada de domingo descoberta, o posto vazio durante o intervalo de refeição, o feriado em que duas turmas folgam juntas, a semana em que o absenteísmo noturno derruba a cobertura abaixo do mínimo.

**Custo de não resolver:** postos descobertos (risco operacional, de segurança e de SLA), horas extras habituais para "tapar buraco", headcount superdimensionado "por garantia", e escalas montadas sem perceber que são inviáveis pela CLT (interjornada, 7º dia), o que obriga a refazê-las.

## 2. Personas

| Persona | Pergunta que precisa responder | Uso principal no MVP |
| :--- | :--- | :--- |
| **Gerente de Operações 24/7** (planta, CD, NOC) — *primária* | "Quantas turmas e pessoas preciso para nunca deixar um posto vazio? Onde estão os furos?" | Postos/curva 168 h, gerador de turmas, heatmap de cobertura, dimensionamento |
| **Coordenação de Enfermagem / Hospitalar** | "Minha 12x36 cobre todas as noites, inclusive feriados e ausências?" | Modelo 12x36, cobertura com absenteísmo, folguistas |
| **Planejamento / PCP / WFM** | "Qual modelo de escala cobre minha curva com menos ociosidade?" | Comparador operacional, excesso/déficit, export |
| **BP de RH / Jurídico Trabalhista** — *secundária* | "A escala proposta é viável pela CLT/CCT?" | Painel de viabilidade (restrições), relatório de violações |
| **CFO / Controladoria** — *fase futura* | "Quanto custa cada alternativa?" | Módulo financeiro (P2, §5 Módulo 6) |

## 3. Objetivos e KPIs

### 3.1 Objetivos
1. **Cobertura:** para qualquer cenário, mostrar hora a hora (168 h e horizonte completo) se a demanda está coberta, com déficit/excesso quantificado; no modo postos fixos com modelo viável, atingir 0 h de déficit.
2. **Dimensionamento:** dizer o **nº mínimo de turmas e de pessoas** (incluindo reserva para shrinkage e folguistas) que fecha a cobertura para a demanda informada.
3. **Viabilidade:** 100% das escalas geradas que violam as restrições implementadas (interjornada, DSR 35 h, 7º dia, revezamento 6 h/8 h, 12x36) são marcadas como **inviáveis** nos casos-teste golden.
4. **Rapidez de decisão:** usuário compara ≥ 3 modelos de escala lado a lado pela cobertura em ≤ 10 min desde o início.

### 3.2 KPIs do produto (o que o simulador mostra para cada cenário)
| KPI | Definição | Uso |
| :--- | :--- | :--- |
| **% horas-posto cobertas** | `Σ_h min(cobertura_h, N_req_h) / Σ_h N_req_h` no horizonte | KPI-herói do resultado |
| **Horas-posto em déficit** | `Σ_h max(0, N_req_h − cobertura_h)` | Tamanho do "buraco" |
| **Pico de subcobertura** | `max_h (N_req_h − cobertura_h)` + quando ocorre (dia/hora) | Pior momento da operação |
| **Horas com déficit** | nº de horas do horizonte com `cobertura_h < N_req_h` | Frequência do furo |
| **Headcount mínimo** | menor nº de pessoas (turmas × postos + reserva/folguistas) que zera o déficit | Dimensionamento |
| **Turmas necessárias** | `K` exigido pelo modelo (ver §6) | Escolha de modelo |
| **Excesso / ociosidade** | `Σ_h max(0, cobertura_h − N_req_h)` em horas-posto e % | Superdimensionamento |
| **Furos no intervalo** | horas-posto descobertas por intervalo intrajornada não rendido | Cobertura real do posto |
| **Viabilidade** | nº de violações `ERRO` / `ALERTA` das restrições | Escala válida ou não |

### 3.3 KPIs de sucesso do produto
| Tipo | Métrica | Meta (sucesso / stretch) | Medição |
| :--- | :--- | :--- | :--- |
| Leading | Time-to-coverage (abrir → 1º heatmap de cobertura) | ≤ 10 min / ≤ 5 min | Telemetria front |
| Leading | % sessões com ≥ 2 cenários comparados | ≥ 60% / ≥ 80% | Telemetria |
| Leading | % sessões com export | ≥ 40% / ≥ 60% | Downloads |
| Leading | p95 do tempo de simulação (1.000 colaboradores, 8 semanas) | ≤ 2 s / ≤ 1 s | Log do backend |
| Lagging | Redução de horas-posto descobertas reportada pelos pilotos | ≥ 50% em 3 meses | Entrevista com pilotos |
| Lagging | Cenários homologados em 90 dias | ≥ 30% dos exportados | Flag no cenário |

> Redução de HE e economia de custo são resultados do cliente e só serão medidos quando o módulo financeiro (P2) existir.

## 4. Escopo

### 4.1 MVP (Fase 1) — núcleo de cobertura
- **Demanda:** modo **postos fixos** por faixa horária e **curva 168 h** (grade 7×24 e upload CSV/XLSX). Shrinkage/absenteísmo diurno e noturno.
- **Modelos de escala** (geração cíclica determinística, §6): **6x1 baseline**, **12x36** (4 turmas), **6x2** (4 turmas, 42 h), **4x2** (5 turmas ou 9 meias-turmas), **5 turmas** (33,6 h).
- **Cobertura (núcleo):** cobertura hora a hora no horizonte; heatmap 7×24 de déficit/exato/excesso; furos no intervalo intrajornada; cobertura com shrinkage ("postos" vs. "postos + reserva"); cobertura em folgas e feriados do calendário real; dimensionamento de turmas/headcount mínimo; folguistas/volantes como turma de reserva.
- **Viabilidade (restrições CLT):** interjornada 11 h, descanso semanal 35 h e 7º dia, folga dominical periódica, revezamento 6 h/8 h (Art. 7º XIV), regras 12x36, limites de jornada diária/semanal (com hora noturna reduzida na jornada computada).
- **Comparador operacional:** até 5 cenários lado a lado pelos KPIs de cobertura e headcount.
- **Visualização:** heatmap 7×24, calendário cíclico por turma.
- **Export:** CSV e XLSX (escala, cobertura 168 h, violações, parâmetros).
- **Persistência:** PostgreSQL 16 com `organization_id` + RLS desde o início (custo baixo, evita migração); sem PII (trabalha por turma).

### 4.2 Fora do MVP
| Item | Fase | Motivo |
| :--- | :--- | :--- |
| **Módulo financeiro** (adicional noturno, DSR reflexo, HE, encargos, comparador de custo, breakeven 5ª turma) | 2 (P2) | Secundário ao objetivo de cobertura; depende de decisões jurídicas (Q1, Q3) |
| Erlang-C / filas com SLA, UPH/TMA | 2 | Exige calibração de volume; postos fixos cobrem o caso crítico |
| Solver ILP de turnos livres/intermediários | 2 | Modelos cíclicos fechados resolvem o MVP |
| 3x1, 3x2, 5x2/4x3 contínuos, 6 turmas, jornadas parciais | 2 | Ampliação do catálogo sobre o mesmo motor |
| Alocação nominal de colaboradores, sugestão automática de substituto por pessoa | 2 | MVP trabalha por turma (sem PII) |
| Calendário pessoal anual do colaborador (PDF/iCal), feriados municipais automáticos | 2 | — |
| Integrações TOTVS, Senior, ADP, SAP SuccessFactors; AFDT/ACJEF | 3 | Layouts proprietários; AFDT/ACJEF são de *ponto realizado* |

## 5. Requisitos Funcionais

Prioridade: **P0** = obrigatório MVP; **P1** = desejável MVP; **P2** = fase futura. **Estes IDs são canônicos** e devem ser os referenciados em `02`–`06`.

### Módulo 1 — Demanda

**FR-01 (P0) Curva 168 h.** Grade editável 7 dias × 24 h (granularidade 60 min no MVP), valores inteiros ≥ 0, com upload CSV/XLSX.
- Dado um CSV com 168 linhas `dia(1-7),hora(0-23),demanda`, quando importado, então a grade exibe os 168 valores e o total semanal é a soma das linhas.
- Dado um arquivo com linha faltante, duplicada ou valor negativo, quando importado, então nada é aplicado e é exibido erro indicando a linha.

**FR-02 (P0) Postos fixos.** Definir `P(d,t)=k` por faixa (ex.: "todos os dias 00–24h = 3 postos"), gerando a curva 168 h. Postos podem ser marcados como **críticos** (déficit não tolerado).
- Dado "3 postos, 24/7", quando confirmado, então todas as 168 células = 3.

**FR-03 (P0) Shrinkage / absenteísmo diurno e noturno.** `S` diurno e noturno (0–60%), opcionalmente decomposto (absenteísmo, férias, treinamento). `N_bruto = ceil(N_req / (1−S))`; hora noturna = 22h–05h.
- Dado 3 postos e S_noturno=10%, quando calculado, então células 22h–04h mostram `ceil(3/0,9)=4` e as diurnas (S=0) mostram 3.
- Dado S ≥ 60%, então o campo é rejeitado.

**FR-04 (P2) Produtividade/Erlang-C.** UPH, TMA, SL alvo.

### Módulo 2 — Modelo de escala e turmas

**FR-05 (P0) Configurar turmas e turnos.** Usuário escolhe modelo do catálogo; turnos padrão editáveis (M 06–14, T 14–22, N 22–06; D12 07–19, N12 19–07), headcount por turma = postos do turno.
- Dado modelo 6x2 e 3 postos, então são criadas 4 turmas (A–D) com 3 pessoas cada; headcount total = 12.

**FR-06 (P0) Gerador cíclico.** Para cada turma `i`, `estado(i, dia) = padrão[(dia_absoluto + offset_i) mod L]`, com `dia_absoluto` contado desde a data inicial do cenário (**nunca dia do mês**).
- Dado o modelo 6x2 padrão (§6), quando gerados 56 dias, então em cada dia há exatamente uma turma em M, uma em T, uma em N e uma em F.
- Dado 12x36 em horizonte que cruza 31→1, então nenhuma turma trabalha dois dias seguidos.

**FR-07 (P1) Rotação customizada.** Usuário define padrão `L` e offsets; o sistema calcula `K_min = turnos_por_dia × L / dias_trabalhados` e alerta se `K` não for compatível.
- Dado padrão de 6 dias com 4 trabalhados e 3 turnos/dia, então `K_min = 4,5` e exibe "não há cobertura exata com turmas inteiras".

**FR-08 (P0) Dimensionamento: turmas e headcount mínimo.** Para a demanda e o modelo escolhidos, calcular `K` necessário, headcount mínimo sem reserva (`K × postos`) e com reserva (shrinkage/folguistas), e sugerir o modelo/K que zera o déficit.
- Dado 3 postos 24/7 e modelo 6x2, então K = 4 e headcount mínimo = 12 (sem reserva).
- Dado 4x2 com 4 turmas informadas, então `COB_TURMAS_INSUFICIENTES` e sugestão "5 turmas ou 9 meias-turmas".

### Módulo 3 — Cobertura (núcleo do produto)

**FR-09 (P0) Cobertura hora a hora e heatmap 7×24.** Para cada hora do horizonte, `cobertura_h = Σ pessoas em turno ativo`; comparar com `N_req_h`. Heatmap com estados **déficit / exato / excesso** (cor + ícone + textura + número), tooltip com demanda, cobertura, diferença e turmas presentes; agregação 7×24 mostra o **pior caso** de cada hora da semana no horizonte (e alterna para média).
- Dado 12x36 com 4 turmas e 2 postos, então 168/168 h cobertas, déficit = 0.
- Dado 4x2 com 4 turmas inteiras, então o heatmap mostra as horas com déficit e `COB_DEFICIT`.
- Dado cobertura < demanda em uma hora, então a célula fica no estado déficit e mostra o déficit numérico.

**FR-10 (P0) Furos no intervalo intrajornada.** Intervalo do turno é parâmetro: (i) *computado, com rendição no posto* (padrão — sem furo); (ii) *não computado, sem rendição* — o posto fica descoberto no intervalo e o motor marca `COB_FURO_INTERVALO` por hora/turno; (iii) *coberto por volante* — o motor dimensiona o nº de volantes necessários para render os intervalos (escalonados).
- Dado 6x2 com 3 postos, intervalo de 1 h não computado e sem rendição, então cada turno gera 3 horas-posto descobertas e o KPI "furos no intervalo" = 3 × 3 turnos × 7 dias = 63 horas-posto/semana.
- Dado o mesmo com volantes, então o motor informa quantos volantes por turno zeram o furo (intervalos escalonados).

**FR-11 (P0) Cobertura com shrinkage/absenteísmo.** Exibir duas visões: **"postos"** (cobertura nominal) e **"postos + reserva"** (cobertura esperada após ausências). A reserva é modelada como **pessoas extras por turma** ou **turma/folguistas de reserva**; o motor reporta cobertura esperada `cobertura_h × (1 − S_h)` vs. `N_req_h` e o déficit esperado.
- Dado 6x2, 3 postos, 12 pessoas e S_noturno = 10%, então a visão "postos + reserva" mostra déficit esperado de 0,3 posto em cada hora noturna e sugere +1 pessoa por turma ou folguistas.

**FR-12 (P0) Cobertura em folgas e feriados.** A cobertura é calculada sobre o **calendário real** do horizonte (data inicial + `mmc(L,7)` dias ou horizonte informado), considerando feriados (nacionais automáticos; estaduais/municipais manuais) com demanda própria (ex.: demanda de domingo ou valor informado) e a política de folga em feriado (trabalha normalmente na escala / folga e precisa de cobertura).
- Dado feriado em uma quarta com política "folga e é coberto por folguista" e sem folguistas, então as horas daquele dia mostram déficit e `COB_DEFICIT` com contexto "feriado".
- Dado o ciclo 6x2 de 56 dias, então todo domingo do ciclo tem exatamente as mesmas turmas cobrindo M/T/N (o padrão não depende do dia da semana).

**FR-13 (P0) Folguistas / volantes.** Turma de reserva sem posto fixo que cobre folgas, ausências, feriados e intervalos. Usuário informa nº de folguistas ou pede ao motor o **mínimo** que zera o déficit; o motor posiciona folguistas nos dias/turnos de déficit respeitando as restrições do Módulo 4.
- Dado baseline 6x1 com 3 turnos de 8 h (K = 3,5), então o motor sugere 4 turmas + folguistas e informa quantos folguistas zeram o déficit.
- Dado folguistas insuficientes, então `COB_FOLGUISTA_INSUFICIENTE` com as horas restantes em déficit.

**FR-14 (P0) Painel de KPIs de cobertura.** Exibir para o cenário os KPIs da §3.2 (% horas-posto cobertas, horas-posto em déficit, pico de subcobertura com dia/hora, horas com déficit, headcount mínimo, turmas necessárias, excesso, furos no intervalo).
- Dado um cenário calculado, então os KPIs batem com a soma das células do heatmap e com a aba `Cobertura168h` do export.

### Módulo 4 — Viabilidade (restrições CLT/CCT)

Regras com severidade `ERRO` (escala inviável; bloqueia homologação), `ALERTA` (exige ciência/justificativa) ou `INFO`; fonte normativa e override documentado quando a CCT permitir. Na geração automática, o motor **só propõe escalas sem `ERRO`**; na edição manual, a violação é exibida e bloqueia homologação.

**FR-15 (P0) Interjornada 11 h (Art. 66 CLT).** Calculada com **timestamps absolutos** (`início_próximo − fim_anterior`), sem `mod 24`.
- Dado saída do turno N às 06h e entrada no T às 14h do mesmo dia, então descanso = 8 h → `CLT_INTERJORNADA`.
- Dado saída do T às 22h e entrada no M às 06h do dia seguinte, então descanso = 8 h → `CLT_INTERJORNADA`.
- Dado M (06–14) seguido de T (14–22) no dia seguinte, então descanso = 24 h → OK.

**FR-16 (P0) Descanso semanal 35 h e 7º dia (Art. 67 CLT, Lei 605/49, Súmula 110 TST, OJ 410 SDI-1).** Em toda janela de 7 dias ≥ 1 repouso de 24 h + 11 h = 35 h consecutivas; não pode haver 7 dias consecutivos de trabalho.
- Dado 6x2 padrão, então todos os ciclos têm folga ≥ 35 h (de fato 72 h) → OK.
- Dado padrão com 7 dias seguidos de trabalho, então `CLT_SETIMO_DIA`; janela sem 35 h → `CLT_DSR_35H`.

**FR-17 (P0) Folga dominical periódica.** Parâmetro "1 domingo de folga a cada N semanas" (padrão N=7 — Portaria MTP 671/2021; N=3 para comércio — Lei 10.101/2000 art. 6º p.ú.). Critério: ≥ 24 h de folga que incluam o domingo 00h–24h (ver Q5).
- Dado 6x2 e N=7, então o relatório lista, por turma, a maior distância entre domingos de folga e marca `CLT_DOMINGO_PERIODICIDADE` se > N.

**FR-18 (P0) Turno ininterrupto de revezamento (Art. 7º, XIV CF; Súmula 423 TST).** Turma que alterna turnos cobrindo diurno e noturno: jornada máx. 6 h sem negociação coletiva; até 8 h com ACT/CCT; > 8 h é inválida mesmo com ACT.
- Dado 6x2 (M→T→N) 8 h e "ACT/CCT autoriza 8 h" desmarcado, então `CLT_REVEZAMENTO_6H` (ALERTA).
- Dado jornada > 8 h em revezamento, então `CLT_REVEZAMENTO_6H` com severidade ERRO.
- Dado 12x36 com turmas fixas dia/noite, então a regra não se aplica.

**FR-19 (P0) Regras 12x36 (Art. 59-A CLT).** Bloquear dobra e descanso < 36 h entre jornadas de 12 h.
- Dado turma D12 alocada também ao N12 do mesmo dia, então `CLT_REGIME_12X36` (ERRO).

**FR-20 (P0) Limites de jornada e hora noturna reduzida na jornada computada.** Alerta de jornada > 10 h (exceto 12x36) e média semanal > carga contratual (padrão 44 h). A jornada computada usa a hora noturna reduzida (Art. 73 §1º: fator exato **8/7**) e a prorrogação (Súmula 60, II), parametrizáveis (Q3, Q4).
- Dado turno 22h–05h (7 h relógio), então horas noturnas computadas = 8,000000.
- Dado turno 22h–06h, então jornada computada = 7×8/7 + 1×8/7 = 9,142857 h → `CLT_JORNADA_DIARIA` (ALERTA, ver C6) com sugestão de encurtar para 22h–05h ou aceitar HE.
- Dado 6x2 (42 h/sem) com contrato 40 h, então `CLT_MEDIA_SEMANAL` (ALERTA, 2 h/sem acima).

### Módulo 5 — Comparação, visualização e export

**FR-21 (P0) Calendário cíclico.** Grade turma × dia do ciclo calendário completo (`mmc(L,7)` dias: 14 no 12x36, 56 no 6x2, 42 no 4x2, 70 nas 5 turmas, 7 no 6x1), domingos e feriados destacados, marcadores de déficit e violação.

**FR-22 (P0) Comparador operacional de cenários.** Até 5 cenários lado a lado com: turmas, headcount (sem/com reserva), h/sem média por pessoa, % horas-posto cobertas, horas-posto em déficit, pico de subcobertura, excesso, furos no intervalo, nº de violações `ERRO`/`ALERTA`; delta vs. baseline.
- Dado baseline 6x1 e 6x2, então a coluna delta mostra `cenário − baseline` por KPI.
- Dado cenário com violações `ERRO`, então ele aparece com selo "inviável".

**FR-23 (P0) Export CSV/XLSX.** XLSX com abas `Escala`, `Cobertura168h`, `KPIs`, `Violacoes`, `Parametros` (e `Custos` quando o Módulo 6 existir); CSV por aba (UTF-8 com BOM, separador `;`, decimal `,`).
- Dado cenário 6x2 de 56 dias, então a aba `Escala` tem 4 turmas × 56 dias com códigos M/T/N/F e a soma de horas confere com o resumo.

**FR-24 (P1) Salvar, versionar e duplicar cenários.**

### Módulo 6 — Financeiro (P2 — fase futura, opcional)

> Mantido para não perder o trabalho de especificação, mas **fora do MVP**. Só entra após decisões Q1/Q3 e planilha de referência do DP.

**FR-25 (P2) Parâmetros de custo.** Salário base, divisor (220/200/180), % adicional noturno (≥ 20%), % HE (50%; 100% domingos/feriados), periculosidade/insalubridade, % encargos.

**FR-26 (P2) Extrato por turma/mês.**
- `valor_hora = salário / divisor`; `adic_noturno = horas_fictas × valor_hora × %AN`; `HE = horas_excedentes × valor_hora × (1+%HE)`.
- `DSR_reflexo = (adic_noturno + HE) / dias_úteis × (domingos + feriados)`, com `dias_úteis = dias do mês − domingos − feriados` (sábado útil).
- Dado salário R$ 2.200, divisor 220, 40 h fictas/mês, AN 20%, então adic_noturno = R$ 80,00; com 25 dias úteis e 5 domingos+feriados, DSR reflexo = R$ 16,00.
- Encargos incidem uma única vez sobre a soma das verbas; arredondamento só no total (NFR-02).

**FR-27 (P2) Comparador financeiro e "4 turmas + HE vs. 5ª turma".** Custo mensal/anual por cenário e breakeven/payback da 5ª turma.
- Dado contrato 40 h e 6x2 (42 h/sem), então HE = 2 h/sem/pessoa no cenário de 4 turmas e 0 no de 5 turmas (33,6 h).

## 6. Modelos de escala (especificação corrigida)

Fórmula geral de cobertura exata com turmas inteiras de mesmo tamanho:
`K = turnos_por_dia × L / dias_trabalhados_no_ciclo` (precisa ser inteiro). Horas médias/semana = `dias_trabalhados × h_turno × 7 / L`. Headcount mínimo = `K × postos` (+ reserva).

| Modelo | Turnos/dia | Padrão (L) | K | h/sem média | Ciclo calendário `mmc(L,7)` | Observações |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **12x36** | 2 × 12 h | `[D, F]` / `[N, F]` (L=2) | 4 (2 D, 2 N) | 42 | 14 dias | Turmas fixas dia/noite; dia **absoluto** (não dia do mês) |
| **6x2** | 3 × 8 h | `[M,M,T,T,N,N,F,F]` (L=8), offset 2 | 4 | 42 | 56 dias | Rotação M→T→N; folga 72 h após N |
| **4x2** | 3 × 8 h | L=6 (4 trab. + 2 F) | 4,5 → **5** ou **9 meias** | 37,33 | 42 dias | Não fecha com 4 turmas |
| **5 turmas** | 3 × 8 h | `[M,M,T,T,N,N,F,F,F,F]` (L=10), offset 2 | 5 | **33,6** | 70 dias | 21 dias trab./35; folga 96 h após N |
| **6x1 baseline** | 3 × 8 h | `[X×6, F]` (L=7) | 3,5 → 4 + folguistas | 48 (8 h) | 7 dias | Ver C9/Q8 |

**4x2 — duas opções no MVP:**
- **(a) 5 turmas**, padrão 4 trabalhados + 2 folgas (L=6), mesmo turno no bloco e rotação M→T→N a cada bloco; em média 3,33 turmas trabalham por dia → excedente de 11,1% (heatmap mostra excesso; usável como reserva de absenteísmo). O motor garante ≥ 1 turma por turno em todos os dias.
- **(b) 9 meias-turmas** (exige postos pares), L=18 `[M,M,M,M,F,F,T,T,T,T,F,F,N,N,N,N,F,F]`, offset 2: em qualquer dia 2 meias-turmas em M, 2 em T, 2 em N, 3 em F → cobertura exata.

**Turno de 8 h e intervalo intrajornada:** o turno é **tempo à disposição de 8 h**; o intervalo é parâmetro (FR-10): (i) computado com rendição no posto (padrão); (ii) não computado sem rendição (gera furo); (iii) coberto por volantes.

## 7. Requisitos Não Funcionais

- **NFR-01 Desempenho:** simulação (geração + cobertura + viabilidade) de 1.000 colaboradores em 8 semanas: p95 ≤ 2 s no backend; render do heatmap ≤ 200 ms.
- **NFR-02 Precisão:** tempo em minutos inteiros; hora noturna em fração exata (8/7); valores monetários (P2) em `Decimal` ≥ 6 casas, `ROUND_HALF_UP` só nos totais exibidos/exportados. Frontend não recalcula.
- **NFR-03 Determinismo e auditoria:** mesma entrada ⇒ mesma saída; cada resultado inclui versão do motor, parâmetros, hash de entrada e regras aplicadas com fonte normativa.
- **NFR-04 Testabilidade:** motor puro (sem I/O) em módulo Python isolado, cobertura de testes ≥ 90%; suíte golden com os exemplos deste PRD.
- **NFR-05 API:** REST FastAPI com Pydantic v2, OpenAPI publicada; erros 422 com campo e mensagem em PT-BR.
- **NFR-06 Acessibilidade:** WCAG 2.2 AA; heatmap com ícone/textura/número além da cor.
- **NFR-07 Responsivo:** uso pleno ≥ 1280 px; leitura (heatmap/comparador) ≥ 768 px.
- **NFR-08 Dados:** sem dados pessoais no MVP (trabalha por turma); LGPD aplica-se quando houver alocação nominal (Fase 2).
- **NFR-09 i18n:** PT-BR, datas dd/mm/aaaa, fuso America/Sao_Paulo (BRL quando o Módulo 6 existir).

## 8. Premissas

1. Regra de negócio: CLT urbana; rural (21h–05h/20h–04h) fica para Fase 2.
2. A eventual extinção da 6x1 é tratada como **cenário**, não norma vigente; o 6x1 permanece como baseline.
3. Feriados nacionais carregados automaticamente; estaduais/municipais informados manualmente.
4. O usuário informa se há ACT/CCT para 8 h em revezamento e para 12x36; o produto não valida o instrumento.
5. Headcount por turma = postos do turno; ausências (férias, absenteísmo) são cobertas por reserva/folguistas (FR-11, FR-13).
6. Horizonte padrão = ciclo calendário completo (`mmc(L,7)`).

## 9. Perguntas em aberto

| # | Pergunta | Dono | Bloqueante? |
| :--- | :--- | :--- | :--- |
| Q2 | Intervalo intrajornada: padrão "computado com rendição" é aceitável? | Jurídico + Operações | Sim (FR-10) |
| Q3 | 12x36: Art. 59-A p.ú. (prorrogação compensada) por padrão ou Súmula 60 II? | Jurídico | Sim (FR-20) |
| Q4 | Prorrogação para turnos que não cobrem 22h–05h integralmente — tratar como parâmetro? | Jurídico | Não |
| Q5 | Critério de "folga coincidente com domingo" para turno N que termina 06h de domingo | Jurídico | Não |
| Q8 | Baseline 6x1: 8 h (48 h/sem + HE) ou 7h20 (44 h) com sobreposição? | Produto/Operações | Sim (C9) |
| Q9 | Shrinkage em postos fixos: reserva por turma ou turma de folguistas como padrão? | Produto | Não (FR-11 suporta ambos) |
| Q10 | Agregação do heatmap 7×24 sobre horizonte > 1 semana: pior caso (padrão) ou média? | Produto | Não |
| Q11 | Política padrão em feriado: escala corre normalmente ou turma de folga é convocada? | Operações | Não (FR-12) |
| Q1 | (P2) Divisor padrão para revezamento 8 h com ACT (220? 180?) | Jurídico/DP | Só para Módulo 6 |
| Q6 | (P2) Encargos: % único aceitável? | Produto/Financeiro | Só para Módulo 6 |

Resolvida: **Q7** (persistência) → PostgreSQL 16 (decisão do `02-TRD.md` / `05-esquema-backend.md`).

## 10. Correções em relação ao PRD v2.0

| # | Item no v2.0 | Verificação | Correção |
| :--- | :--- | :--- | :--- |
| **C1** | 6x2 `[M,M,T,T,N,N,F,F]`, offset 2, 4 turmas | `K = 3×8/6 = 4`; offsets 0,2,4,6 ⇒ uma turma em cada par (MM, TT, NN, FF) por dia. **Cobertura correta.** Horas = 6×8×7/8 = **42 h/sem**. Interjornada mínima na rotação = 24 h. | Mantido; ressalvas: 42 h > 40/36 h; exige ACT/CCT para 8 h (Súmula 423). |
| **C2** | "K=168/44 ≈ 3,81 ⇒ 4 turmas" | `168/J_sem` só vale para 1 posto; o certo é `K = turnos/dia × L / dias_trab`, headcount = K × postos. 168/36 = 4,67 ⇒ 5 turmas a **33,6 h**. | Fórmula geral (§6). |
| **C3** | 5 turmas: 21×8 = 168 h em 35 dias | 3×35 = 105 turnos = 5×21 ✔. Padrão diário não definido. | `[M,M,T,T,N,N,F,F,F,F]` (L=10), offset 2. |
| **C4** | "5 turmas elimina passivo de revezamento" | Falso: ainda alterna M/T/N com 8 h/dia; limite é de **6 h diárias**. | Continua exigindo ACT/CCT para 8 h. |
| **C5** | 4x2 `[M,T,N,N,F,F]` com "4 ou 5 turmas" | `K = 4,5` ⇒ 4 turmas cobrem em média 2,67 turnos-dia de 3 ⇒ **11,1% dos turnos-dia descobertos** (v3.0 dizia 25%, corrigido); padrão desigual. | 5 turmas (11% de excedente) ou 9 meias-turmas (§6). |
| **C6** | N 22h–06h tratado como 8 h | Hora reduzida + Súmula 60 II ⇒ 9,142857 h computadas. | FR-20 sinaliza; usuário pode encurtar para 22h–05h. |
| **C7** | Interjornada `Δ = (I − F) mod 24` | Falha para descansos ≥ 24 h e no mesmo dia. | Timestamps absolutos (FR-15). |
| **C8** | DSR reflexo citando Súmula 172 | Súmula 172 = HE; AN: Lei 605/49 art. 7º e Súmula 60 I; "dias úteis" indefinido. | FR-26 (P2). |
| **C9** | 6x1 como baseline 24/7 | 3×8 h ⇒ `K = 3,5`, 48 h/sem. Sem cobertura exata com turmas inteiras. | 4 turmas + folguistas (FR-13) ou 7h20 — Q8. |
| **C10** | 12x36: `d mod 2` com dia do mês | Dia 31 e dia 1 ímpares ⇒ dois dias seguidos. | Dia absoluto desde a data inicial (FR-06). 12x36 = 42 h/sem; Art. 59-A. |
| **C11** | "Turno de 8 h (1 h intervalo)" | Com intervalo não computado trabalha-se 7 h e há **furo de cobertura** de 1 h/turno. | Intervalo parametrizado e furo medido (FR-10). |
| **C12** | Art. 7º XIV "6 h a menos que CCT" | Negociação permite até **8 h** (Súmula 423). | FR-18. |
| **C13** | Exportar AFDT/ACJEF | São de **ponto realizado** (Portaria 671/2021). | Fase 3. MVP: CSV/XLSX. |
| **C14** | 35 h só por "ciclo" | Vale em toda janela de 7 dias; OJ 410. | FR-16 inclui `CLT_SETIMO_DIA`. |
| **C15** | "Ciclo de 8 semanas" no 6x2 | `mmc(8,7) = 56` ✔. | Generalizado: `mmc(L,7)`. |
| **C16** | v3.0 centrado em compliance/custo | Direção do produto: simulador **operacional de cobertura**. | Módulo 3 (Cobertura) vira núcleo; compliance = viabilidade; financeiro = P2. |

## 11. Fases e dependências

- **Fase 1 (MVP — cobertura):** FR-01–03 e FR-05–24 (FR-07 e FR-24 são P1). Dependências: Q2, Q3 (só para FR-20), Q8; casos golden de cobertura e de viabilidade.
- **Fase 2:** Módulo 6 financeiro (FR-25–27), Erlang-C/UPH (FR-04), ILP, catálogo ampliado, alocação nominal e calendário pessoal, FR-07 completo.
- **Fase 3:** integrações WFM/ponto (TOTVS, Senior, ADP, SAP) e avaliação de AFDT/ACJEF.

## Apêndice A — Catálogo canônico de códigos de achado

| Código | Severidade padrão | FR |
| :--- | :--- | :--- |
| `COB_DEFICIT` | ALERTA | FR-09, FR-12 |
| `COB_DEFICIT_POSTO_CRITICO` | ERRO | FR-02, FR-09 |
| `COB_EXCESSO` | INFO | FR-09 |
| `COB_FURO_INTERVALO` | ALERTA | FR-10 |
| `COB_DEFICIT_ESPERADO_SHRINKAGE` | ALERTA | FR-11 |
| `COB_TURMAS_INSUFICIENTES` | ERRO | FR-07, FR-08 |
| `COB_FOLGUISTA_INSUFICIENTE` | ALERTA | FR-13 |
| `CLT_INTERJORNADA` | ERRO | FR-15 |
| `CLT_DSR_35H` | ERRO | FR-16 |
| `CLT_SETIMO_DIA` | ERRO | FR-16 |
| `CLT_DOMINGO_PERIODICIDADE` | ALERTA | FR-17 |
| `CLT_REVEZAMENTO_6H` | ALERTA (ERRO se > 8 h) | FR-18 |
| `CLT_REGIME_12X36` | ERRO | FR-19 |
| `CLT_JORNADA_DIARIA` | ALERTA (ERRO se > 10 h fora de 12x36) | FR-20 |
| `CLT_MEDIA_SEMANAL` | ALERTA | FR-20 |
| `CLT_INTRAJORNADA` | ALERTA | FR-10, FR-20 |
| `INFO_DIVERGENCIA_59A_SUMULA60` | INFO | FR-20 |

Severidades: **ERRO** (escala inviável / bloqueia homologação), **ALERTA** (exige ciência e justificativa), **INFO**.
