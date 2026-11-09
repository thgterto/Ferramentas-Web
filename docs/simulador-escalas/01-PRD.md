# PRD v3.7 — Simulador Operacional de Cobertura 24/7 (Brasil/CLT)

| Metadado | Detalhe |
| :--- | :--- |
| **Produto** | Simulador de Escalas & Cobertura 24/7 (Workforce Coverage Simulator) |
| **Versão** | 3.4 — **regime legal versionado (fim da escala 6x1: 44 h → 42 h → 40 h)** como restrição P0 do MVP (Módulo 10, §6.2, §8.1). 3.3 — **MVP enxuto ponta a ponta em 4 sprints** (P0 = MVP; demais itens reclassificados para Fase 2, ver §4 e `06`). v3.2: catálogo ampliado, construtor de escala, turmas (K) como restrição e matriz de cobertura entre cargos (v3.1: reposicionado como **simulador operacional de cobertura**; substitui v3.0 e `00-prd-original.md`, v2.0) |
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

### 4.1 MVP (Fase 1) — núcleo de cobertura enxuto, ponta a ponta (v3.3: 4 sprints, ~160 pts)
> **v3.5 (máxima customização):** entram no MVP o catálogo **completo** da §6.1 (37 modelos como seeds YAML, inclusive 4x3, 2x2 8 h/12 h, 4x4, 3x1, 3x2, 5x1, 6x3, DuPont, Panamá, Pitman, 12x60, 24x48, 24x72, 18x36, 5T/5T francesa, 6T, fim de semana, parcial, fixos, escalonado, split, reforço); **K livre** (fixo/mínimo/faixa/sugerir, 1–60, tamanho por turma, meias-turmas); **construtor completo** (FR-29–FR-31) com camadas (FR-30) e templates da organização; **janela de operação** para modelos não contínuos (simulam normalmente); **Quadro de turnos** (Gantt por dia e calendário com sigla/horário). Selos legais são informativos: nenhuma regra impede simular.
O MVP entrega **motor de cobertura + API + interface mínima** (wizard, heatmap 7×24, calendário de turmas, painel de achados) e export. Tudo o que está aqui é **P0**; o plano está no `06` §2–§3.
- **Demanda (FR-01–03):** postos fixos por faixa horária e curva 168 h (grade 7×24 e upload CSV/XLSX); shrinkage diurno e noturno.
- **Catálogo essencial (FR-28 essencial, 10 modelos):** `6X1_BASE` (baseline), `5X2`, `12X36`, `6X2`, `4X2` (5 turmas ou 9 meias-turmas), `2X2_12H`, `5T` (5 turmas, 33,6 h), `4X3` e turno fixo `FIXO_D`/`FIXO_N`. Critério: modelos mais usados em 24/7 e não contínuo no Brasil + baseline + os dois de 12 h. Geração cíclica determinística por dia absoluto (FR-05, FR-06).
- **Regime legal versionado (v3.4, FR-39–FR-42):** entidade *regime legal* com vigência e parâmetros (carga semanal máxima, jornada diária máxima, folgas semanais mínimas, compensação por ACT/CCT, regimes especiais); seeds `CLT_44H_ATUAL`, `TRANSICAO_42H`, `PEC_40H`; o cenário escolhe o regime ou uma data de referência; o M4 valida cada escala contra o regime; visão **"simular transição"** (mesma operação em 44 h → 42 h → 40 h com turmas/pessoas por fase); catálogo com selo de conformidade por regime (§6.2). Premissas legais a validar: §8.1.
- ~~Construtor básico (FR-29 básico)~~ → **Fase 2 na v3.4** (trocado pelo regime legal; ver `06` §3.5). No MVP só o catálogo essencial.
- **Turmas como restrição (FR-32 enxuto):** K **fixo** por operação (modo **mínimo** → Fase 2 na v3.4); sugestão de K/headcount (FR-08), agora com o **K mínimo legal** do regime (FR-41).
- **Cargos (FR-34–36 enxuto):** cargos com nível (sem habilidades), matriz **direcional** A→B com fator 1,0, **mínimo por cargo por turno**; cobertura e heatmap filtráveis por cargo.
- **Cobertura (núcleo):** cobertura hora a hora no horizonte; heatmap 7×24 de déficit/exato/excesso (pior caso/média); visão "postos + reserva" (FR-11); KPIs (FR-14); dimensionamento (FR-08).
- **Viabilidade essencial (M4):** interjornada 11 h (FR-15), descanso semanal 35 h e 7º dia (FR-16), jornada diária/média semanal com hora noturna 8/7 (FR-20, sem Súmula 60) **contra os limites do regime legal vigente** (FR-40: carga semanal média no ciclo, jornada diária, folgas semanais, 6x1 vedada, viável só com ACT/CCT, regime pendente de regulamentação). Selo "viabilidade parcial" lista as regras verificadas.
- **Visualização:** heatmap 7×24, calendário cíclico por turma (FR-21), painel de achados.
- **Export:** CSV e XLSX (FR-23).
- **Persistência mínima:** PostgreSQL 16 com `organization_id` + RLS; cenário salvo (FR-24 só "salvar"); simulação síncrona; auth simples (JWT de acesso). Sem PII.

### 4.2 Fora do MVP (Fase 2 e posteriores)
| Item | Fase | Motivo |
| :--- | :--- | :--- |
| Feriados e calendário real (FR-12), folguistas/volantes (FR-13), furos no intervalo (FR-10) | 2 (P1, Fase 2a) | Cortados para caber em 4 sprints; primeiros itens pós-MVP |
| Domingo periódico (FR-17), revezamento 6 h/8 h (FR-18), regras 12x36 (FR-19), Súmula 60 na jornada (FR-20 parcial) | 2 (P1, Fase 2a) | MVP verifica só interjornada, DSR/7º dia e jornada |
| Comparador operacional (FR-22), ajuste de escala (T5), homologação (T7), versionar/duplicar cenário (FR-24 parcial) | 2 (P1, Fase 2a) | Interface mínima no MVP |
| Catálogo restante da §6.1 (FR-28: 5x1, 6x3, 3x1, 3x2, Pitman, Panamá, DuPont, Continental, 12x60, 24x48, 24x72, 5T francesa, 6T, fim de semana, parcial, reforço, escalonado…) | 2 (P1, Fase 2a) | Entram como dados (ADR-010), sem mudança de motor |
| Construtor básico no wizard (FR-29 básico / FR-07) e modo K **mínimo** (FR-32) | 2 (P1, Fase 2a) | **v3.4:** trocados pelo regime legal (FR-39–42) para manter 40 pts/sprint (`06` §3.5) |
| Construtor avançado e T9 dedicada (FR-29 P1), mix de camadas (FR-30), templates (FR-31) | 2 (P1, Fase 2b) | — |
| K faixa/livre e por posto/cargo/camada (FR-32 parcial), tamanho de turma e meias-turmas configuráveis (FR-33) | 2 (P1, Fase 2b) | — |
| Regimes diferenciados por lei ordinária (12x36 e outros) com regras próprias; histórico de regimes por CCT; atualização do seed após texto promulgado | 2 (P1) | Dependem da lei ordinária e da confirmação do texto (§8.1, Q14–Q16) |
| Habilidades/certificações (FR-34 parcial, FR-36 por habilidade), substituição parcial e limite fora do cargo (FR-35 P1), telas T8.1/T8.2/T2.2 | 2 (P1, Fase 2b) | MVP configura cargos/matriz em tabela simples no wizard |
| Performance 1.000 colaboradores (NFR-01 completo), responsivo ≥ 768 px, hardening, beta externo | 2 (Fase 2c) | MVP: 200 colaboradores |
| **Módulo financeiro** (FR-25–27) | futura (P2) | Secundário ao objetivo de cobertura; depende de Q1, Q3 |
| Erlang-C / filas com SLA, UPH/TMA (FR-04) | futura (P2) | Exige calibração de volume |
| Solver ILP CP-SAT (turnos livres, folguistas ótimos, K e cargos) | futura | Heurística/fórmula/fluxo resolvem o MVP |
| Proporções entre cargos (FR-37), multi-skill (FR-38); ciclo em horas (18x36) e split shift | futura (P2) | Exigem alocação nominal/CP-SAT ou extensão do gerador |
| Alocação nominal, calendário pessoal, feriados municipais automáticos | futura | MVP trabalha por turma (sem PII) |
| Integrações TOTVS, Senior, ADP, SAP SuccessFactors; AFDT/ACJEF | 3 | Layouts proprietários |

## 5. Requisitos Funcionais

Prioridade (v3.3): **P0** = MVP de 4 sprints (`06` §3.1–3.4); **P1** = Fase 2 (pós-MVP, `06` §3.5); **P2** = fase futura. Onde um FR tem partes em fases diferentes, a tag indica "P0 … / P1 …". **Estes IDs são canônicos** e devem ser os referenciados em `02`–`06`.

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

**FR-07 (P1 — Fase 2 na v3.4, via FR-29 básico) Rotação customizada.** *(v3.2: absorvido pelo construtor FR-29 — mantido como o modo "sequência + offsets".)* Usuário define padrão `L` e offsets; o sistema calcula `K_min = turnos_por_dia × L / dias_trabalhados` e alerta se `K` não for compatível.
- Dado padrão de 6 dias com 4 trabalhados e 3 turnos/dia, então `K_min = 4,5` e exibe "não há cobertura exata com turmas inteiras".

**FR-08 (P0) Dimensionamento: turmas e headcount mínimo.** Para a demanda e o modelo escolhidos, calcular `K` necessário, headcount mínimo sem reserva (`K × postos`) e com reserva (shrinkage/folguistas), e sugerir o modelo/K que zera o déficit.
- Dado 3 postos 24/7 e modelo 6x2, então K = 4 e headcount mínimo = 12 (sem reserva).
- Dado 4x2 com 4 turmas informadas, então `COB_TURMAS_INSUFICIENTES` e sugestão "5 turmas ou 9 meias-turmas".

### Módulo 3 — Cobertura (núcleo do produto)

**FR-09 (P0) Cobertura hora a hora e heatmap 7×24.** Para cada hora do horizonte, `cobertura_h = Σ pessoas em turno ativo`; comparar com `N_req_h`. Heatmap com estados **déficit / exato / excesso** (cor + ícone + textura + número), tooltip com demanda, cobertura, diferença e turmas presentes; agregação 7×24 mostra o **pior caso** de cada hora da semana no horizonte (e alterna para média).
- Dado 12x36 com 4 turmas e 2 postos, então 168/168 h cobertas, déficit = 0.
- Dado 4x2 com 4 turmas inteiras, então o heatmap mostra as horas com déficit e `COB_DEFICIT`.
- Dado cobertura < demanda em uma hora, então a célula fica no estado déficit e mostra o déficit numérico.

**FR-10 (P1 — Fase 2) Furos no intervalo intrajornada.** Intervalo do turno é parâmetro: (i) *computado, com rendição no posto* (padrão — sem furo); (ii) *não computado, sem rendição* — o posto fica descoberto no intervalo e o motor marca `COB_FURO_INTERVALO` por hora/turno; (iii) *coberto por volante* — o motor dimensiona o nº de volantes necessários para render os intervalos (escalonados).
- Dado 6x2 com 3 postos, intervalo de 1 h não computado e sem rendição, então cada turno gera 3 horas-posto descobertas e o KPI "furos no intervalo" = 3 × 3 turnos × 7 dias = 63 horas-posto/semana.
- Dado o mesmo com volantes, então o motor informa quantos volantes por turno zeram o furo (intervalos escalonados).

**FR-11 (P0) Cobertura com shrinkage/absenteísmo.** Exibir duas visões: **"postos"** (cobertura nominal) e **"postos + reserva"** (cobertura esperada após ausências). A reserva é modelada como **pessoas extras por turma** ou **turma/folguistas de reserva**; o motor reporta cobertura esperada `cobertura_h × (1 − S_h)` vs. `N_req_h` e o déficit esperado.
- Dado 6x2, 3 postos, 12 pessoas e S_noturno = 10%, então a visão "postos + reserva" mostra déficit esperado de 0,3 posto em cada hora noturna e sugere +1 pessoa por turma ou folguistas.

**FR-12 (P1 — Fase 2) Cobertura em folgas e feriados.** A cobertura é calculada sobre o **calendário real** do horizonte (data inicial + `mmc(L,7)` dias ou horizonte informado), considerando feriados (nacionais automáticos; estaduais/municipais manuais) com demanda própria (ex.: demanda de domingo ou valor informado) e a política de folga em feriado (trabalha normalmente na escala / folga e precisa de cobertura).
- Dado feriado em uma quarta com política "folga e é coberto por folguista" e sem folguistas, então as horas daquele dia mostram déficit e `COB_DEFICIT` com contexto "feriado".
- Dado o ciclo 6x2 de 56 dias, então todo domingo do ciclo tem exatamente as mesmas turmas cobrindo M/T/N (o padrão não depende do dia da semana).

**FR-13 (P1 — Fase 2) Folguistas / volantes.** Turma de reserva sem posto fixo que cobre folgas, ausências, feriados e intervalos. Usuário informa nº de folguistas ou pede ao motor o **mínimo** que zera o déficit; o motor posiciona folguistas nos dias/turnos de déficit respeitando as restrições do Módulo 4.
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

**FR-17 (P1 — Fase 2) Folga dominical periódica.** Parâmetro "1 domingo de folga a cada N semanas" (padrão N=7 — Portaria MTP 671/2021; N=3 para comércio — Lei 10.101/2000 art. 6º p.ú.). Critério: ≥ 24 h de folga que incluam o domingo 00h–24h (ver Q5).
- Dado 6x2 e N=7, então o relatório lista, por turma, a maior distância entre domingos de folga e marca `CLT_DOMINGO_PERIODICIDADE` se > N.

**FR-18 (P1 — Fase 2) Turno ininterrupto de revezamento (Art. 7º, XIV CF; Súmula 423 TST).** Turma que alterna turnos cobrindo diurno e noturno: jornada máx. 6 h sem negociação coletiva; até 8 h com ACT/CCT; > 8 h é inválida mesmo com ACT.
- Dado 6x2 (M→T→N) 8 h e "ACT/CCT autoriza 8 h" desmarcado, então `CLT_REVEZAMENTO_6H` (ALERTA).
- Dado jornada > 8 h em revezamento, então `CLT_REVEZAMENTO_6H` com severidade ERRO.
- Dado 12x36 com turmas fixas dia/noite, então a regra não se aplica.

**FR-19 (P1 — Fase 2) Regras 12x36 (Art. 59-A CLT).** Bloquear dobra e descanso < 36 h entre jornadas de 12 h.
- Dado turma D12 alocada também ao N12 do mesmo dia, então `CLT_REGIME_12X36` (ERRO).

**FR-20 (P0 jornada 8/7 e média semanal / P1 Súmula 60) Limites de jornada e hora noturna reduzida na jornada computada.** Alerta de jornada > 10 h (exceto 12x36) e média semanal > carga contratual (padrão 44 h). A jornada computada usa a hora noturna reduzida (Art. 73 §1º: fator exato **8/7**) e a prorrogação (Súmula 60, II), parametrizáveis (Q3, Q4).
- Dado turno 22h–05h (7 h relógio), então horas noturnas computadas = 8,000000.
- Dado turno 22h–06h, então jornada computada = 7×8/7 + 1×8/7 = 9,142857 h → `CLT_JORNADA_DIARIA` (ALERTA, ver C6) com sugestão de encurtar para 22h–05h ou aceitar HE.
- Dado 6x2 (42 h/sem) com contrato 40 h, então `CLT_MEDIA_SEMANAL` (ALERTA, 2 h/sem acima).
- *(v3.4)* Os limites de jornada diária e de carga semanal deixam de ser constantes: vêm do **regime legal** do cenário (FR-39). `CLT_MEDIA_SEMANAL` compara com a **carga contratual**; `CLT_CARGA_SEMANAL_EXCEDIDA` (FR-40) compara com o **limite legal do regime**.

### Módulo 5 — Comparação, visualização e export

**FR-21 (P0) Calendário cíclico.** Grade turma × dia do ciclo calendário completo (`mmc(L,7)` dias: 14 no 12x36, 56 no 6x2, 42 no 4x2, 70 nas 5 turmas, 7 no 6x1), domingos e feriados destacados, marcadores de déficit e violação.

**FR-22 (P1 — Fase 2) Comparador operacional de cenários.** Até 5 cenários lado a lado com: turmas, headcount (sem/com reserva), h/sem média por pessoa, % horas-posto cobertas, horas-posto em déficit, pico de subcobertura, excesso, furos no intervalo, nº de violações `ERRO`/`ALERTA`; delta vs. baseline.
- Dado baseline 6x1 e 6x2, então a coluna delta mostra `cenário − baseline` por KPI.
- Dado cenário com violações `ERRO`, então ele aparece com selo "inviável".

**FR-23 (P0) Export CSV/XLSX.** XLSX com abas `Escala`, `Cobertura168h`, `KPIs`, `Violacoes`, `Parametros` (e `Custos` quando o Módulo 6 existir); CSV por aba (UTF-8 com BOM, separador `;`, decimal `,`).
- Dado cenário 6x2 de 56 dias, então a aba `Escala` tem 4 turmas × 56 dias com códigos M/T/N/F e a soma de horas confere com o resumo.

**FR-24 (P0 salvar / P1 versionar e duplicar) Salvar, versionar e duplicar cenários.**

### Módulo 7 — Repertório e construtor de escalas (v3.2)

> Amplia o Módulo 2. O catálogo completo está em §6.1; o construtor substitui e expande o FR-07 (que passa a ser o "modo sequência livre" do FR-29).

**FR-28 (P0 catálogo essencial de 10 modelos — §4.1 / P1 restante da §6.1) Catálogo ampliado de modelos.** O wizard oferece todos os modelos da §6.1, agrupados em *contínuos 24/7*, *não contínuos*, *complementares* (fim de semana, reforço, parcial) e *variações de turno* (fixo × rotativo, escalonado, fracionado). Cada card mostra sequência, h/sem média, turmas necessárias (24/7 e não contínuo), selo **"cobre 24/7 exato"** ou **"não exato"** (com a alternativa: meias-turmas ou excedente %) e selo de viabilidade padrão (`viável`, `exige CCT/ACT`, `inviável na CLT`).
- Dado o modelo 3x1 com 3 turnos de 8 h e 3 postos, quando selecionado, então o card mostra K = 4, "cobre 24/7 exato", 42 h/sem e headcount 12.
- Dado o DuPont (12 h, rotativo D/N), quando simulado, então o motor gera a cobertura (168/168 h) e emite `CLT_REVEZAMENTO_6H` com severidade ERRO (jornada > 8 h em revezamento, Súmula 423) — o cenário sai "inviável".
- Dado o 24x48, então o card exibe "inviável na CLT" e a simulação emite `CLT_JORNADA_DIARIA` (ERRO); o modelo continua disponível para comparação.

**FR-29 (P1 — v3.4: básico também saiu do MVP, ver §4.2; básico = sequência + horários + offsets com validação / avançado e T9 dedicada) Construtor de escala personalizada.** *(Os marcadores "(P0)" abaixo indicam o escopo do construtor básico da Fase 2a.)* Editor em que o gestor define:
- (P0) **sequência de ciclo livre** (ex.: `[M,M,T,T,N,N,F,F,F]`, até 84 posições), com códigos de turno da organização;
- (P0) **turnos**: código, início, duração (P1 — Fase 2: turnos sobrepostos e de tamanhos diferentes na mesma escala) (60–1.440 min); (P1) **turnos sobrepostos e de tamanhos diferentes** (ex.: D12 07–19 + INT 10–18);
- (P1 — Fase 2, depende de FR-10) **intervalo intrajornada** por turno (duração, posição, política FR-10: rendição / não computado / volante / **escalonado** — entradas ou intervalos defasados em `n` minutos entre subgrupos);
- (P0) **offsets por turma**; (P1) **data-âncora do ciclo** (dia absoluto 0) e **sentido da rotação** (para frente M→T→N ou para trás N→T→M; o construtor pode gerar a sequência a partir de "bloco de n dias por turno + folgas");
- (P1) **dias de folga fixos** (ex.: todo domingo, sobrepondo-se à sequência), **regras de feriado** por modelo (trabalha conforme escala / folga coberta / folga com fechamento da operação) e **semana com dia de reserva** (`R` = presente, não conta como posto).
- **Validação em tempo real** (≤ 300 ms por edição, sem simular o cenário completo): K necessário e se fecha exato, cobertura por turno-dia no ciclo, h/sem média, maior sequência de dias trabalhados, menor interjornada, maior descanso semanal e domingo de folga — usando as mesmas regras do M3/M4.
- Dado a sequência `[M,M,T,T,N,N,F,F,F]` (L=9, 6 trabalhados, 3 turnos), quando digitada, então o construtor mostra K\* = 4,5, "não exato: use 5 turmas (+11,1% de excesso) ou 9 meias-turmas" e `COB_PADRAO_NAO_EXATO` (INFO).
- Dado a sequência com N seguido de T no dia seguinte (rotação para trás), então o construtor marca a transição em vermelho com `CLT_INTERJORNADA` (06h → 14h = 8 h) antes de simular.
- Dado "domingo fixo de folga" sobre o 6x2, então a cobertura de domingo cai e o construtor exibe o déficit de domingo e sugere folguista ou turma extra.

**FR-30 (P1) Mix de modelos na mesma operação.** Um cenário pode ter **camadas** de escala, cada uma com modelo/sequência, turnos, turmas e cargo próprios (ex.: núcleo **12x36** 2 postos 24/7 + **reforço 5x2** INT 10–18 seg–sex + **SDF 12 h** sáb–dom). A cobertura do posto é a soma das camadas; o heatmap permite isolar cada camada.
- Dado núcleo 12x36 (2 postos) e reforço 5x2 10–18 (1 posto) com demanda de 3 postos 10–18 seg–sex e 2 no restante, então cobertura exata em 168/168 h e excesso 0.

**FR-31 (P1) Templates da organização e derivação.** "Duplicar do catálogo" cria um padrão editável (`custom_schedule_patterns`) com `derived_from` = código do catálogo; templates salvos ficam disponíveis para toda a organização, versionados (alteração cria nova versão; cenários guardam a versão usada).
- Dado o template "6x2 UTI" derivado do 6X2 e editado, quando outro planejador cria um cenário, então ele aparece no grupo "Da organização" com a origem "derivado de 6x2".

### Módulo 8 — Número de turmas como restrição (v3.2)

**FR-32 (P0 fixo por operação / P1 mínimo (v3.4), faixa, livre e por posto/cargo/camada) Parâmetro K (turmas) como restrição.** Por operação e, opcionalmente, por posto/cargo/camada: `K` em modo **fixo** (`K = k`), **faixa** (`K_min ≤ K ≤ K_max`) ou **livre**.
- (a) **K fixo:** o motor gera a escala com exatamente `k` turmas e informa a **cobertura alcançável** (% horas-posto, déficit) e o déficit residual; se `k < K*`, emite `COB_K_INSUFICIENTE` com o déficit e a menor alternativa (folguistas, meias-turmas, outro modelo com o mesmo `k`).
- (b) **K livre / faixa:** o motor sugere o **menor K** (dentro da faixa) que zera o déficit para o modelo; se nenhum K da faixa zera, `COB_K_INSUFICIENTE` com o melhor K e o déficit restante.
- Dado 6x2, 3 postos e K fixo = 3, então cobertura alcançável = 75% das horas-posto (em média 2,25 turmas trabalham por dia para 3 turnos), déficit = 0,75 turno-dia × 8 h × 3 postos × 7 = **126 horas-posto/semana** e `COB_K_INSUFICIENTE` com sugestão "K = 4 ou +folguistas".
- Dado 4x2 e K livre na faixa 4–6, então o motor sugere K = 5 (excedente 11,1%) e informa que K = 4 deixa 11,1% dos turnos-dia descobertos.
- Dado K máx = 4 na operação e modelo 5 turmas escolhido, então o wizard bloqueia o modelo com a explicação "exige 5 turmas; limite da operação = 4".

**FR-33 (P1 — Fase 2) Tamanho das turmas.** Por turma: `tamanho_min`, `tamanho_max` (pessoas) e tamanho alvo; turmas **com tamanhos diferentes** (ex.: turma A diurna 4 pessoas, C noturna 3) e **meias-turmas** (turma dividida em subturmas `A1/A2` com offsets próprios). O motor respeita `min ≤ tamanho ≤ max`.
- Dado demanda 3 postos e `tamanho_max` = 2, então o motor exige 2 turmas por turno-dia (ou meias-turmas) e recalcula K; se não houver solução com o K permitido, `COB_K_INSUFICIENTE`.
- Dado turma com 2 pessoas e `tamanho_min` = 3, então `COB_TURMA_ABAIXO_MINIMO` (ERRO); acima do máximo, `COB_TURMA_ACIMA_MAXIMO` (ALERTA).

### Módulo 9 — Cargos e matriz de cobertura entre cargos (v3.2)

**FR-34 (P0 cargos e nível / P1 habilidades e certificações) Cargos, níveis e habilidades.** Cadastro por organização de **cargos/funções** (nome, nível hierárquico 1–9, CBO opcional) e **habilidades/certificações** (ex.: `NR13_CALDEIRA`, `COREN_ENF`, `NR10`, com validade opcional). Cargos têm habilidades padrão; turmas/colaboradores (Fase 2) declaram a composição por cargo. Exemplos seed: enfermeiro (nível 3), técnico de enfermagem (2), operador de caldeira NR-13 (2), operador líder (3), supervisor (4).
- Dado o posto "Caldeira" com exigência `NR13_CALDEIRA`, quando uma turma não tem nenhum membro com essa habilidade no turno, então `COB_CARGO_SEM_QUALIFICADO` (ERRO) naquelas horas.

**FR-35 (P0) Matriz de substituição (quem pode cobrir quem).** Regras **direcionais** `A → B` ("A pode cobrir posto de B") com: `fator` (P0 = 1,0 cobre integralmente; **P1: substituição parcial** 0 < f < 1, conta como fração do posto), `prioridade` (1 = preferida), e (P1) `limite de horas fora do cargo` por pessoa/semana. A ausência de regra = não substitui. A diagonal (A → A) é sempre 1,0.
- Dado "enfermeiro → técnico de enfermagem" permitido e o inverso não, quando faltar 1 técnico e houver 1 enfermeiro excedente na hora, então o déficit de técnico é coberto, o heatmap do cargo técnico fica "exato" com marcador de substituição e `COB_COBERTURA_POR_SUBSTITUICAO` (INFO); quando faltar enfermeiro e sobrar técnico, o déficit permanece.
- Dado regra parcial "operador → operador líder" f = 0,5, então 2 operadores excedentes cobrem 1 posto de líder (P1).
- O motor nunca usa a mesma pessoa-hora duas vezes (uma pessoa cobre um posto por vez).

**FR-36 (P0 por cargo / P1 por habilidade) Mínimo por cargo por turno.** Requisitos de presença por turno ou faixa horária: "≥ 1 enfermeiro por plantão", "≥ 1 supervisor 24/7", "≥ 1 com `NR13_CALDEIRA` sempre que a caldeira opera". Podem ser satisfeitos por substitutos **somente** se a regra marcar `aceita_substituto`.
- Dado plantão noturno com 0 enfermeiros e 5 técnicos, então `COB_CARGO_SEM_QUALIFICADO` (ERRO) mesmo que o total de pessoas atenda a demanda.

**FR-37 (P2) Proporções entre cargos.** Ex.: "1 enfermeiro para cada 4 técnicos" (arredondamento para cima), por hora. Violação → `COB_PROPORCAO_VIOLADA` (ALERTA; ERRO se marcada como obrigatória por norma, ex.: COFEN).
- Dado 9 técnicos e 2 enfermeiros na hora, então exige `ceil(9/4) = 3` enfermeiros → `COB_PROPORCAO_VIOLADA` (falta 1).

**FR-38 (P2) Multi-skill avançado e custo de substituição.** Colaboradores/turmas polivalentes com várias habilidades e **custo/preferência** por substituição (o motor minimiza o custo total de substituições, ex.: prefere técnico de outro setor a enfermeiro); limite de horas fora do cargo por colaborador (`COB_LIMITE_FORA_CARGO`); exige alocação nominal (Fase 2).

**Integração com módulos existentes:**
- **FR-09/FR-14:** cobertura e KPIs passam a existir **por cargo** além do total; o heatmap é filtrável por cargo ("Todos", cada cargo, "só substituições").
- **FR-13:** o folguista sugerido tem cargo; o motor só o posiciona onde a matriz permite (folguista técnico não cobre déficit de enfermeiro) e prefere o cargo de menor prioridade de substituição.
- **FR-22:** comparador ganha "horas cobertas por substituição" e "horas sem qualificado".

### Módulo 10 — Regime legal versionado e transição da escala 6x1 (v3.4)

> Motivação: o pedido "as escalas simuladas devem atender às regras da mudança da escala 6x1". Os parâmetros vêm de **reportagens** sobre a PEC aprovada (§8.1); o texto promulgado **ainda não foi confirmado** — por isso as regras são **dados versionados** (ADR-005/ADR-011 do `02`), nunca código fixo.

**FR-39 (P0) Regime legal versionado e configurável.** Entidade *regime legal* com código, nome, **vigência** (`valid_from`/`valid_to`, ou âncora "data da promulgação + offset" enquanto a data não for conhecida), status (`vigente`, `previsto`, `premissa`) e parâmetros:
- `carga_semanal_max_h` (44 / 42 / 40), comparada com a **média semanal calculada sobre o ciclo** (`w × h_turno_computado × 7 / L`, hora noturna 8/7);
- `jornada_diaria_max_h` (8) com exceções: **compensação/redução por ACT/CCT** (`compensacao_act`) e **regimes especiais** (12x36, art. 59-A) com política própria (`autorizado`, `autorizado_pendente_lei`);
- `folgas_semanais_min` (dias de folga por 7 dias, média no ciclo; padrão 1 / 1 / **2 — premissa a validar**) e `criterio_folgas` (`media_ciclo` padrão | `toda_janela_7d`);
- `permite_6x1` (true só em `CLT_44H_ATUAL`; premissa a validar na transição);
- fonte normativa e nota de premissa.
Seeds: `CLT_44H_ATUAL`, `TRANSICAO_42H`, `PEC_40H` (`05` §3.13). O cenário escolhe **um regime** explicitamente **ou** uma **data de referência**, e o motor aplica o regime vigente naquela data; o regime aplicado e a sua versão ficam no `inputs_snapshot` (NFR-03).
- Dado cenário com data de referência dentro da vigência de `TRANSICAO_42H`, quando simulado, então o resultado registra `legal_regime = TRANSICAO_42H` e a carga máxima usada = 42 h.
- Dado regime com status `premissa`, então todo resultado traz `INFO_REGIME_PREMISSA` ("parâmetros baseados em reportagens; confirmar texto promulgado").
- Dado data de referência sem regime vigente (ex.: promulgação ainda sem data), então o wizard pede a escolha explícita do regime.

**FR-40 (P0) Validação da escala contra o regime.** O M4 valida **cada turma** contra o regime do cenário:
- média semanal no ciclo > `carga_semanal_max_h` → `CLT_CARGA_SEMANAL_EXCEDIDA` (ERRO; vira `CLT_VIAVEL_SOMENTE_COM_ACT` se o regime admite compensação por ACT/CCT **e** o cenário declara o instrumento — ver abaixo);
- jornada computada > `jornada_diaria_max_h` fora de regime especial → `CLT_JORNADA_DIARIA` (limite vindo do regime) e, se o regime admite compensação por ACT/CCT, `CLT_VIAVEL_SOMENTE_COM_ACT`;
- folgas por 7 dias (média no ciclo) < `folgas_semanais_min` → `CLT_FOLGAS_SEMANAIS_INSUFICIENTES` (ERRO);
- padrão com ≤ 1 folga a cada 7 dias (6x1 ou pior) em regime com `permite_6x1 = false` → `CLT_ESCALA_6X1_VEDADA` (ERRO);
- escala que **só é viável** com ACT/CCT (compensação de jornada/carga, 12 h fora de 12x36) → `CLT_VIAVEL_SOMENTE_COM_ACT` (ALERTA sem instrumento declarado; INFO com instrumento declarado) — **alerta claro na UI**: "Esta escala só é viável com acordo ou convenção coletiva";
- regime especial cuja regra depende da lei ordinária (12x36 e outras escalas diferenciadas no regime 40 h) → `CLT_REGIME_PENDENTE_REGULAMENTACAO` (ALERTA), sem `ERRO` de carga enquanto a política for `autorizado_pendente_lei`.
- Dado 6x2 8 h com 4 turmas em `PEC_40H`, então média = 42 h > 40 h → `CLT_CARGA_SEMANAL_EXCEDIDA` (ERRO, 2 h/sem acima) e folgas = 2 × 7/8 = 1,75 < 2 → `CLT_FOLGAS_SEMANAIS_INSUFICIENTES` (ERRO); a sugestão é "5 turmas (5T, 33,6 h) ou 4x2 com 9 meias-turmas (37,33 h)".
- Dado o mesmo 6x2 em `TRANSICAO_42H`, então nenhum achado de regime (42 h = 42 h; folgas 1,75 ≥ 1).
- Dado `6X1_BASE` 7h20 (44 h) em `CLT_44H_ATUAL`, então conforme; em `TRANSICAO_42H` ou `PEC_40H`, então `CLT_ESCALA_6X1_VEDADA` (ERRO) e `CLT_CARGA_SEMANAL_EXCEDIDA` (44 > 42/40).
- Dado `4X3` 10 h (40 h) em `PEC_40H` sem ACT/CCT declarado, então `CLT_VIAVEL_SOMENTE_COM_ACT` (ALERTA); com ACT/CCT declarado, INFO.
- Dado `12X36` (42 h média) em `PEC_40H`, então `CLT_REGIME_PENDENTE_REGULAMENTACAO` (ALERTA) e nenhum ERRO de carga.

**FR-41 (P0) Dimensionamento sob o regime e simulação da transição.** O dimensionamento (FR-08) passa a considerar o **K mínimo legal** por posto: `K_legal = horas_posto_semana_por_posto / carga_semanal_max_h` (24/7 com 3 × 8 h: 168/44 = 3,82 → 4; 168/42 = 4 → 4; 168/40 = **4,2 → 5 turmas, ou 4,5 com meias-turmas = 9 meias**). `K*_efetivo = max(K*_modelo, arred(K_legal))`, com `arred` para o inteiro (ou meio, se meias-turmas forem permitidas) superior. Visão **"simular transição"**: a mesma operação é simulada em cada fase da linha do tempo (`CLT_44H_ATUAL` → `TRANSICAO_42H` → `PEC_40H`), com modelo recomendado, turmas, pessoas, h/sem e achados por fase.
- Dado 10 postos 24/7 em 3 × 8 h, quando "simular transição", então: 44 h → 6x2 4 turmas, 40 pessoas (42 h); 42 h → 6x2 4 turmas, 40 pessoas; 40 h → 6x2 inviável; recomendado 4x2 com 9 meias-turmas, **45 pessoas** (37,33 h) ou 5T, 50 pessoas (33,6 h); limite inferior teórico `ceil(1.680/40)` = 42 pessoas.
- Dado K fixo = 4 pela operação em `PEC_40H` com 3 × 8 h 24/7, então `COB_K_INSUFICIENTE` (K_legal = 4,2) com sugestão "5 turmas ou 9 meias-turmas".

**FR-42 (P0) Conformidade por regime no catálogo.** Cada card do catálogo (FR-28) mostra o **selo de conformidade por regime** (44 h / 42 h / 40 h: `conforme`, `só com ACT/CCT`, `regime especial`, `não conforme`) e, quando não conforme, o **ajuste sugerido** (mais uma turma, turno menor, compensação via ACT/CCT, outro modelo) — tabela da §6.2.

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

### 6.1 Catálogo ampliado (v3.2, FR-28)

Convenções: `s` = turnos/dia a cobrir, `L` = ciclo da turma, `w` = dias trabalhados no ciclo; **K\* = s × L / w** turmas (por posto); h/sem = `w × h_turno × 7 / L`. "Exato" = existe offset com turmas inteiras de mesmo tamanho que cobre cada turno-dia exatamente uma vez (verificado por enumeração dos offsets `i·L/K` no ciclo calendário). Coluna *não contínuo* = turmas para 1 turno/dia na janela indicada. Viabilidade é a padrão (sem CCT); ver Apêndice A.

| Código | Modelo | Sequência (por turma) | h/turno | h/sem | K\* 24/7 | 24/7 exato? | K não contínuo | Aplicação | Observações legais (padrão) | Conformidade 44 h / 42 h / 40 h (v3.4, §6.2) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `5X2` | 5x2 | `[X×5,F,F]` L=7 | 8 (ou 8h48) | 40 (44) | 3×7/5 = 4,2 | Não (5 turmas, +19% excesso) | 1 (seg–sex) | Administrativo, reforço | Viável; folga fixa sáb/dom | ✔ / ✔ / ✔ (8 h = 40 h; 8h48 = 44 h só no 44 h) |
| `5X1` | 5x1 | `[X×5,F]` L=6 | 8 | 46,67 | 3,6 | Não (4 turmas, +11,1%) | 1,2 → 2 (seg–dom) | Varejo, logística | `CLT_MEDIA_SEMANAL` se contrato 44 h; usar 7h20 (36,7 h) ou 7h20+HE | ✖ 46,67 h (✔ com 7h20) / ✖ / ✖ carga + folgas 1,17 |
| `6X1_BASE` | 6x1 | `[X×6,F]` L=7 | 8 / 7h20 | 48 / 44 | 3,5 | Não; **exato com 7 meias-turmas** L=21 `[M×6,F,T×6,F,N×6,F]` | 1,17 → 2 (seg–dom) | Baseline | Ver C9/Q8; 7º dia sempre folga | ✔ só 7h20 (8 h = 48 h, Q8) / ✖ 6x1 vedada / ✖ 6x1 vedada |
| `4X3` | 4x3 | `[X×4,F,F,F]` L=7 | 10 | 40 | — (10 h não divide 24 h) | n/a | 1 (seg–qui) + 1 (qui–dom) = 2 para 7 d | Manutenção, não contínuo | Compensação semanal (art. 59 §2º, acordo); 12 h → `CLT_JORNADA_DIARIA` | ACT / ACT / ACT (10 h/dia ⇒ compensação por ACT/CCT) |
| `4X2` | 4x2 | L=6 (4 + 2 F) | 8 | 37,33 | 4,5 | Não (5 turmas +11,1%) / **exato com 9 meias** L=18 | 1,5 → 2 | Indústria | Revezamento: ACT p/ 8 h | ✔ / ✔ / ✔ (37,33 h; folgas 2,33) |
| `6X2` | 6x2 | `[M,M,T,T,N,N,F,F]` L=8 | 8 | 42 | 4 | **Sim** | 1,33 → 2 | Indústria | ACT p/ 8 h; `CLT_MEDIA_SEMANAL` se 40 h | ✔ / ✔ / ✖ 42 h + folgas 1,75 |
| `6X3` | 6x3 | `[M×2,T×2,N×2,F×3]` L=9 | 8 | 37,33 | 4,5 | Não (5 turmas +11,1%) / **exato com 9 meias** L=27 `[M×6,F×3,T×6,F×3,N×6,F×3]` | 1,5 → 2 | Mineração, offshore curto | ACT p/ 8 h | ✔ / ✔ / ✔ (37,33 h; folgas 2,33) |
| `3X1` | 3x1 | `[M,T,N,F]` L=4 (para frente) | 8 | 42 | 3×4/3 = 4 | **Sim** | 1,33 → 2 | Indústria, segurança | ACT p/ 8 h; rotação diária (fadiga) | ✔ / ✔ / ✖ 42 h + folgas 1,75 |
| `3X2` | 3x2 | `[M,T,N,F,F]` L=5 | 8 | 33,6 | 5 | **Sim** | 1,67 → 2 | Indústria, saneamento | ACT p/ 8 h | ✔ / ✔ / ✔ (33,6 h; folgas 2,8) |
| `2X2_12H` | 2x2 (12 h) | `[D,D,F,F]` L=4, turmas fixas D/N | 12 | 42 | 2×4/2 = 4 | **Sim** (2 D + 2 N) | 2 | Saúde, segurança | 12 h fora de 12x36 ⇒ `CLT_JORNADA_DIARIA` ERRO salvo CCT (override documentado) | CCT / CCT / ✖ 42 h |
| `PITMAN` | Pitman 2-2-3 | `[D,D,F,F,D,D,D,F,F,D,D,F,F,F]` L=14, fixas D/N | 12 | 42 | 4 | **Sim** (offset 7) | 2 | Polícia privada, utilities | Idem 2x2; fim de semana de 3 dias alternado | CCT / CCT / ✖ 42 h |
| `PANAMA` | Continental 2-2-3 / Panamá (12 h rotativo) | Pitman em D por 14 d, depois em N por 14 d, L=28 | 12 | 42 | 4 | **Sim** (offset 7) | — | Plantas químicas | Revezamento > 8 h ⇒ `CLT_REVEZAMENTO_6H` **ERRO** (Súmula 423) — inviável | ✖ / ✖ / ✖ (revezamento; + 42 h no 40 h) |
| `DUPONT` | DuPont | `[N×4,F×3,D×3,F,N×3,F×3,D×4,F×7]` L=28 | 12 | 42 | 2×28/14 = 4 | **Sim** (offset 7) | — | Refinarias | Rotativo D/N 12 h ⇒ `CLT_REVEZAMENTO_6H` ERRO — inviável | ✖ / ✖ / ✖ (revezamento; + 42 h no 40 h) |
| `CONTINENTAL_8H` | Continental (8 h) | `[M,M,T,T,N,N,N,F,F,M,M,T,T,T,N,N,F,F,M,M,M,T,T,N,N,F,F,F]` L=28 | 8 | 42 | 3×28/21 = 4 | **Sim** (offset 7) | — | Siderurgia | Tem 7 dias seguidos (`MMMTTNN`) ⇒ `CLT_SETIMO_DIA` ERRO; derivar no construtor | ✖ / ✖ / ✖ (7º dia; + 42 h no 40 h) |
| `12X36` | 12x36 | `[D,F]`/`[N,F]` L=2 | 12 | 42 | 4 | **Sim** | 2 | Saúde, vigilância | Art. 59-A; dia absoluto | ✔ / ✔ / especial (42 h; pendente lei ordinária) |
| `12X60` | 12x60 | `[D,F,F]` L=3, fixas D/N | 12 | 28 | 2×3/1 = 6 | **Sim** | 3 | Saúde (plantonista) | Descanso 60 h ≥ 36 h; enquadrar como 12x36 por CCT (ALERTA de enquadramento) | ✔ / ✔ / ✔ (28 h) |
| `24X48` | 24x48 | `[P24,F,F]` L=3 | 24 | 56 | 1×3/1 = 3 | **Sim** | — | Bombeiro/serviço público (não CLT) | `CLT_JORNADA_DIARIA` ERRO + `CLT_MEDIA_SEMANAL` — inviável na CLT | ✖ / ✖ / ✖ |
| `24X72` | 24x72 | `[P24,F,F,F]` L=4 | 24 | 42 | 4 | **Sim** | — | Idem | `CLT_JORNADA_DIARIA` ERRO — inviável salvo lei específica | ✖ / ✖ / ✖ |
| `18X36` | 18x36 | ciclo de **54 h** (18 trab. + 36 F) | 18 | 56 | 54/18 = 3 | **Sim** em horas; ciclo calendário `mmc(54,24)` = 216 h = 9 d | — | Embarcações | > 12 h ⇒ ERRO; exige ciclo em horas (`cycle_unit = 'hours'`) | ✖ / ✖ / ✖ |
| `5T` | 5 turmas | `[M,M,T,T,N,N,F,F,F,F]` L=10 | 8 | 33,6 | 5 | **Sim** | 2 | Indústria | ACT p/ 8 h | ✔ / ✔ / ✔ (33,6 h; folgas 2,8) |
| `5T_FR` | 5 turmas francesa (5×8) | `[M,M,T,T,N,N,R,F,F,F]` L=10 (`R` = reserva/formação) | 8 | 33,6 (+8 h R) | 5 | **Sim** (R não conta como posto) | — | Química, papel | R vira reserva para FR-11/FR-13 | ✔ / ✔ / ✔ (39,2 h com `R`; folgas 2,1) |
| `6T` | 6 turmas (8 h) | `[M,M,T,T,N,N,F×6]` L=12 | 8 | 28 | 6 | **Sim** | — | Alta fadiga | Horas baixas: avaliar contrato | ✔ / ✔ / ✔ (28 h) |
| `6T_6H` | 6 turmas (4 × 6 h) | `[M,M,T,T,V,V,F,N,N,F,F,F]` L=12 (M 06–12, T 12–18, V 18–24, N 00–06) | 6 | 28 | 4×12/8 = 6 | **Sim** | — | Revezamento sem ACT | Revezamento ≤ 6 h: dispensa ACT (art. 7º XIV) | ✔ / ✔ / ✔ (28 h) |
| `SDF_12H` | Fim de semana 12 h | `[F×5,D,D]` L=7 (D e/ou N) | 12 | 24 | complementar | — | 1 por turno de sáb–dom | Complementa 5x2 | Domingo toda semana ⇒ `CLT_DOMINGO_PERIODICIDADE`; 12 h ⇒ CCT | CCT / CCT / CCT (24 h; 12 h) |
| `PARCIAL_20/25/30` | Jornada parcial | `5x2` de 4 h / 5 h / 6 h | 4–6 | 20/25/30 | — | — | 1 por faixa | Picos, varejo | Art. 58-A (≤ 30 h sem HE ou ≤ 26 h + 6 HE) ⇒ `CLT_TEMPO_PARCIAL` | ✔ / ✔ / ✔ |
| `FIXO_N` / `FIXO_D` | Turno fixo noturno / diurno | qualquer sequência com um único turno | — | — | por modelo base | — | — | Saúde, vigilância | Fixo não é revezamento (FR-18 não se aplica) | = modelo base |
| `ROT_FRENTE` / `ROT_TRAS` | Rotação para frente × para trás | M→T→N (frente) / N→T→M (trás) | — | — | — | — | — | Qualquer | Para trás exige folga entre N e T (N 06h → T 14h = 8 h ⇒ `CLT_INTERJORNADA`) | = modelo base |
| `INT_PICO` | Intermediário / reforço de pico | turno `INT` (ex.: 10–18) em camada adicional (FR-30) | 6–8 | — | — | — | por pico | Picos diurnos | Só reforço; não substitui núcleo | conforme a sequência |
| `ESCALONADO` | Entradas escalonadas | subgrupos com entradas defasadas (ex.: 06, 07, 08 h) | 8 | — | — | — | — | Rampas de demanda, cobertura de intervalos | Cobre intervalo sem volante (FR-10 escalonado) | conforme a sequência |
| `SPLIT` | Jornada fracionada (split shift) | 2 blocos no dia (ex.: 07–11 + 17–21) | 8 | 40 | — | — | — | Transporte, restaurantes | Intervalo > 2 h exige acordo escrito/CCT (art. 71) ⇒ `CLT_INTRAJORNADA` | ✔ / ✔ / ✔ (40 h; intervalo > 2 h ⇒ acordo) |

**Resumo de exatidão 24/7 (turmas inteiras):** exatos — 6x2, 3x1, 3x2, 2x2, Pitman, Panamá, DuPont, Continental 8 h, 12x36, 12x60, 24x48, 24x72, 18x36 (em horas), 5T, 5T francesa, 6T, 6T 6 h. Não exatos — 5x2, 5x1, 6x1, 4x2, 6x3 (os três últimos fecham com meias-turmas). **Exato em cobertura não é viável na CLT:** DuPont, Panamá (revezamento > 8 h), Continental 8 h (7º dia), 24x48, 24x72, 18x36 (jornada) — o produto os mostra para comparação com selo "inviável" e permite derivá-los no construtor.

**MVP × fase (v3.3):** só o **catálogo essencial** entra no MVP — `6X1_BASE`, `5X2`, `12X36`, `6X2`, `4X2`, `2X2_12H`, `5T`, `4X3`, `FIXO_D`, `FIXO_N` (tag **MVP**); os demais códigos desta tabela são **Fase 2** e entram depois como dados de catálogo (o motor M2 é genérico; cada modelo é uma linha de `schedule_models` + `rotation_patterns` + teste golden). `18X36` (ciclo em horas) e `SPLIT` (dois blocos/dia) exigem extensões do gerador e são **P1**.

### 6.1.1 Versões com sobreposição (v3.6, FR-45)

Turnos com **sobreposição planejada**: `passagem_min` (últimos minutos sobrepostos ao turno seguinte, passagem de turno) ou `reforco` (turno de pico sobre o núcleo). Cobertura hora a hora **conta os dois** na janela sobreposta; o excesso explicado pela sobreposição vira **"excesso planejado de passagem"** (status `passagem`, KPI `handover_post_hours`, achado INFO `COB_PASSAGEM_PLANEJADA`) — não `COB_EXCESSO` (ociosidade). Horas trabalhadas, média semanal e interjornada usam a **duração e os horários reais**. Selo legal calculado (FR-42) e conferido por `pytest -k regime`; goldens em `golden/sobreposicao.yaml`.

| Código | Turnos (horários reais) | Turmas | h/sem | Passagem/dia | Selo 44 h / 42 h / 40 h |
|---|---|---|---|---|---|
| `6X2_PASSAGEM` | MP 06:00–14:20 · TP 14:00–22:20 · NP 22:00–06:20 (20 min) | 4 | 43,75 | 3 h | só com ACT / ✗ / ✗ |
| `4X2_PASSAGEM` | M30/T30/N30 8h30 (30 min) | 5 (ou 9 meias) | 39,67 | 3 h | só com ACT ×3 |
| `5T_PASSAGEM` | MP/TP/NP (20 min) | 5 | 35 | 3 h | só com ACT ×3 |
| `12X36_PASSAGEM` | D12P 06:45–19:00 · N12P 18:45–07:00 (15 + 15 = 30 min/dia) | 4 | 42,875 | 2 h | só com ACT / ✗ / ✗ |
| `2X2_12H_PASSAGEM` | D12P / N12P (interjornada real 11h45) | 4 | 42,875 | 2 h | só com ACT / ✗ / ✗ |
| `NUCLEO_PICO` | núcleo 6x2 M/T/N + `PICO` 10:00–18:48 seg–sex (reforço; camadas, motor genérico) | 4 + 1 | 42 / 44 | 9 h (pico) | só com ACT / ✗ / ✗ |
| `ESCALONADO_2H` | E06 / E08 / E10 / E12 (entradas a cada 2 h, não contínuo) | 4 | 40 | — (sobreposição real = excesso) | ✔ ×3 |

No construtor (FR-29), cada turno tem **"Passagem (min)"** (0–240): o valor estende o turno (06:00–14:00 + 20 → 06:00–14:20) e é tratado como sobreposição planejada.

### 6.1.2 Visões do resultado (v3.6, FR-43–FR-44)

- **FR-43 Matriz mensal** — `GET /scenarios/{id}/monthly-matrix?month=YYYY-MM`: linhas = pessoas (agrupáveis por turma/cargo; alternar turma/pessoa), colunas = dias do mês com dia da semana, fins de semana e **feriados nacionais** (fixos + Carnaval, Sexta-feira Santa, Corpus Christi) destacados. Célula = sigla do turno + cor (com texto, nunca só cor), `F` folga, `←N` turno da véspera que continua pela 00:00. Rodapé por dia: pessoas que iniciam cada turno × necessário (▼ déficit), total em folga, horas com déficit e horas de passagem. Totais por pessoa: dias trabalhados, folgas, horas no mês, domingos de folga, noites (≥ 2 h em 22–05 h). Filtros: turno, cargo, turma, busca. Linha e coluna fixas, rolagem horizontal, grade navegável por setas. Exportação `…/monthly-matrix/export?format=xlsx&months=N` (uma aba por mês, cores por turno) e `csv`; impressão CSS paisagem. Sem colaboradores cadastrados (MVP aloca por turma), gera **pessoas fictícias** por turma (`A-01`, `A-02`…) com o cargo da composição. Regenera o mês com a mesma âncora/K/offsets da simulação.
- **FR-44 Visões "Por turno" e "Pessoa"** — "Por turno": para cada dia, quem está em cada turno (lista agrupada por turma, com necessário × escalados), quem continua a noite anterior e quem folga. "Pessoa": calendário mensal individual (base do calendário pessoal), totais do mês e exportação CSV/XLSX/**ICS** (`person=A-01`).
- **Correção (v3.6):** no Gantt por dia, o turno noturno da véspera (ex.: N 22–06 de domingo) aparece no início do dia seguinte como `← N 22–06` — inclusive no 1º dia do horizonte — e em todas as visões (calendários e matriz).

### 6.2 Conformidade por regime legal (v3.4, FR-40–FR-42)

Premissas: regimes `CLT_44H_ATUAL` (44 h, ≥ 1 folga/7 d, 6x1 permitida), `TRANSICAO_42H` (42 h, ≥ 1 folga/7 d, 6x1 vedada — premissa), `PEC_40H` (40 h, **≥ 2 folgas/7 d — premissa**, 6x1 vedada); jornada até 8 h (compensação por ACT/CCT; 12x36 regime especial). **Média semanal** = `w × h × 7 / L`; **folgas/7 d** = `(L − w) × 7 / L` (média no ciclo). Legenda: ✔ conforme · **ACT** só viável com ACT/CCT (`CLT_VIAVEL_SOMENTE_COM_ACT`) · **especial** regime diferenciado pendente de lei ordinária (`CLT_REGIME_PENDENTE_REGULAMENTACAO`) · ✖ não conforme. Contas conferidas para todos os códigos da §6.1 (coluna "Conformidade").

**Catálogo essencial do MVP**

| Código | h/turno | h/sem média (conta) | Folgas/7 d (conta) | 44 h | 42 h | 40 h | Achados no 40 h | Ajuste sugerido para 40 h |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `6X1_BASE` | 8 / 7h20 | 6×8×7/7 = 48 / 6×7,33×7/7 = 44 | 1×7/7 = 1 | ✔ só 7h20 (8 h ⇒ `CLT_CARGA_SEMANAL_EXCEDIDA`, HE — Q8) | ✖ | ✖ | `CLT_ESCALA_6X1_VEDADA`, `CLT_CARGA_SEMANAL_EXCEDIDA` | **Baseline de comparação apenas.** 24/7: 4x2 (9 meias) ou 5T; não contínuo: 5x2 |
| `5X2` | 8 | 5×8×7/7 = **40** | 2×7/7 = 2 | ✔ | ✔ | ✔ | — | (8h48 = 44 h: reduzir para 8 h) · 24/7 exige 5 turmas (K\* 4,2) |
| `12X36` | 12 | 1×12×7/2 = **42** | 1×7/2 = 3,5 | ✔ | ✔ | especial | `CLT_REGIME_PENDENTE_REGULAMENTACAO` | Aguardar lei ordinária; se exigir ≤ 40 h: 5ª turma (12 h, 33,6 h) |
| `6X2` | 8 | 6×8×7/8 = **42** | 2×7/8 = **1,75** | ✔ | ✔ | ✖ | `CLT_CARGA_SEMANAL_EXCEDIDA` (+2 h), `CLT_FOLGAS_SEMANAIS_INSUFICIENTES` | +1 turma → **5T** (33,6 h) ou **4x2 9 meias** (37,33 h). ACT de compensação cobre a carga, **não** as folgas (premissa) |
| `4X2` | 8 | 4×8×7/6 = 37,33 | 2×7/6 = 2,33 | ✔ | ✔ | ✔ | — | — (5 turmas ou 9 meias) |
| `2X2_12H` | 12 | 2×12×7/4 = **42** | 2×7/4 = 3,5 | CCT | CCT | ✖ | `CLT_CARGA_SEMANAL_EXCEDIDA`, `CLT_JORNADA_DIARIA`/`CLT_VIAVEL_SOMENTE_COM_ACT` | 5 turmas 12 h `[D,D,F,F,F]` (2×5/2 = 5; 33,6 h) ou migrar para 12x36 |
| `5T` | 8 | 6×8×7/10 = 33,6 | 4×7/10 = 2,8 | ✔ | ✔ | ✔ | — | — (referência do regime 40 h em 24/7) |
| `4X3` | 10 | 4×10×7/7 = 40 | 3×7/7 = 3 | ACT | ACT | ACT | `CLT_VIAVEL_SOMENTE_COM_ACT` (10 h > 8 h) | Com ACT/CCT de compensação: conforme; sem: 4x3 de 8 h (32 h) ou 5x2 |
| `FIXO_D` / `FIXO_N` | — | do modelo base | do modelo base | = base | = base | = base | os do modelo base | os do modelo base |

**Dimensionamento 24/7 sob o regime (FR-41)** — 3 turnos de 8 h, por posto: `K_legal = 168 / carga`.

| Regime | `K_legal` | Turmas inteiras | Com meias-turmas | Exemplo 10 postos: modelo recomendado → pessoas |
| :--- | :--- | :--- | :--- | :--- |
| `CLT_44H_ATUAL` | 168/44 = 3,82 | 4 | 4 | 6x2 4T → **40** (42 h) |
| `TRANSICAO_42H` | 168/42 = 4,00 | 4 | 4 | 6x2 4T → **40** (42 h) |
| `PEC_40H` | 168/40 = **4,20** | **5** | **4,5 (9 meias)** | 4x2 9 meias → **45** (37,33 h) · 5T → 50 (33,6 h) · mínimo teórico `ceil(1.680/40)` = 42 |

Identidade usada nos testes: para modelo exato, `K*_modelo ≥ K_legal` ⇔ `h/sem do modelo ≤ carga máxima` (6x2: K\* = 4 < 4,2 ⇔ 42 h > 40 h). Com 2 turnos de 12 h o `K_legal` é o mesmo (168/40 = 4,2 → 5).

**Casos golden de regime (v3.4)** — entram na suíte do `02` §10: GT-REG-01 6x2 4T em `PEC_40H` → `CLT_CARGA_SEMANAL_EXCEDIDA` + `CLT_FOLGAS_SEMANAIS_INSUFICIENTES`; GT-REG-02 6x2 4T em `TRANSICAO_42H` → sem achados de regime; GT-REG-03 `6X1_BASE` 7h20 em 44 h → conforme, em 42 h → `CLT_ESCALA_6X1_VEDADA` + carga; GT-REG-04 5T em `PEC_40H` → conforme; GT-REG-05 transição 10 postos → 40 / 40 / 45 pessoas; GT-REG-06 12x36 em `PEC_40H` → `CLT_REGIME_PENDENTE_REGULAMENTACAO` sem ERRO; GT-REG-07 4x3 10 h em `PEC_40H` → `CLT_VIAVEL_SOMENTE_COM_ACT` (ALERTA sem ACT, INFO com ACT); GT-REG-08 data de referência → regime vigente correto nas bordas `valid_from`/`valid_to`.

**4x2 — duas opções no MVP:**
- **(a) 5 turmas**, padrão 4 trabalhados + 2 folgas (L=6), mesmo turno no bloco e rotação M→T→N a cada bloco; em média 3,33 turmas trabalham por dia → excedente de 11,1% (heatmap mostra excesso; usável como reserva de absenteísmo). O motor garante ≥ 1 turma por turno em todos os dias.
- **(b) 9 meias-turmas** (exige postos pares), L=18 `[M,M,M,M,F,F,T,T,T,T,F,F,N,N,N,N,F,F]`, offset 2: em qualquer dia 2 meias-turmas em M, 2 em T, 2 em N, 3 em F → cobertura exata.

**Turno de 8 h e intervalo intrajornada:** o turno é **tempo à disposição de 8 h**; o intervalo é parâmetro (FR-10): (i) computado com rendição no posto (padrão); (ii) não computado sem rendição (gera furo); (iii) coberto por volantes.

## 7. Requisitos Não Funcionais

- **NFR-01 Desempenho:** **MVP (v3.3):** 200 colaboradores em 8 semanas, p95 ≤ 2 s no backend (síncrono); render do heatmap ≤ 200 ms. **Fase 2:** 1.000 colaboradores em 8 semanas, p95 ≤ 2 s.
- **NFR-02 Precisão:** tempo em minutos inteiros; hora noturna em fração exata (8/7); valores monetários (P2) em `Decimal` ≥ 6 casas, `ROUND_HALF_UP` só nos totais exibidos/exportados. Frontend não recalcula.
- **NFR-03 Determinismo e auditoria:** mesma entrada ⇒ mesma saída; cada resultado inclui versão do motor, parâmetros, hash de entrada e regras aplicadas com fonte normativa.
- **NFR-04 Testabilidade:** motor puro (sem I/O) em módulo Python isolado, cobertura de testes ≥ 90%; suíte golden com os exemplos deste PRD.
- **NFR-05 API:** REST FastAPI com Pydantic v2, OpenAPI publicada; erros 422 com campo e mensagem em PT-BR.
- **NFR-06 Acessibilidade:** WCAG 2.2 AA; heatmap com ícone/textura/número além da cor. MVP: teclado e contraste nas telas entregues; auditoria completa na Fase 2.
- **NFR-07 Responsivo:** MVP: uso pleno ≥ 1280 px. Fase 2: leitura (heatmap/comparador) ≥ 768 px.
- **NFR-08 Dados:** sem dados pessoais no MVP (trabalha por turma); LGPD aplica-se quando houver alocação nominal (Fase 2).
- **NFR-09 i18n:** PT-BR, datas dd/mm/aaaa, fuso America/Sao_Paulo (BRL quando o Módulo 6 existir).

### 6.1.3 Subsetores, posições, pools e otimizadores (v3.7, FR-46–49)

**FR-46 — Hierarquia Operação/Setor → Subsetor → Posição [MVP v3.7].** Uma operação (setor) pode ter **subsetores** (ex.: Caldeiras, Turbinas) e cada subsetor **posições** (postos de trabalho: "Caldeira 1", "Leito 3", "Doca 2"). Cada posição tem **demanda própria** (postos fixos 24/7 ou curva 168 h — no wizard, postos numa faixa horária) e, opcionalmente, **cargo exigido**. Com subsetores, a demanda do setor = soma das posições. Pessoas (fictícias `A-01`… ou **cadastradas**) têm **subsetor de lotação** e **posição padrão**; as fictícias são espalhadas pelas "vagas" (posição × pico), preferindo a vaga do próprio cargo.

**FR-47 — Colunas e filtros [MVP v3.7].** Matriz mensal, "Por turno", "Pessoa" e exportações XLSX/CSV ganham **Subsetor** e **Posição** (colunas fixas); agrupar/filtrar por subsetor/posição e "só remanejados"; rodapé "No subsetor X" por dia; heatmap 7×24 e KPIs filtráveis por subsetor/posição (`coverage?subsector=|workstation=`).

**FR-48 — Intercambialidade (pools) [MVP v3.7].** Por setor, **pools** = grupos de subsetores cujos funcionários são intercambiáveis — **total** ou **restrito a cargos** —, com **limite opcional de horas emprestadas por pessoa/semana** e **preferência pela lotação de origem**. O motor aloca, hora a hora, as pessoas presentes às posições demandadas (min-cost max-flow: arestas só dentro do subsetor ou do pool e compatíveis com a matriz de cargos; custo menor na origem). Visões mostram o remanejamento (célula `M ⇄ TUR/TUR2`, CSV `M → TUR/TUR2`), KPI **horas remanejadas**, painel com **déficit sem pool × com pool** e achados `COB_REMANEJAMENTO_SUBSETOR` (INFO) / `COB_DEFICIT_SUBSETOR` (ALERTA).

**FR-49 — Otimizadores [MVP v3.7].** `POST /scenarios/{id}/optimize` (síncrono, *time limit* configurável, padrão 5 s) e aba **Otimizar**; devolvem solução, métricas antes × depois, **gap** e status **ótimo/viável**; "Criar cenário a partir da solução" ou "Aplicar neste cenário".
- **a. Mínimo de turmas/pessoas** para cobertura alvo (100 % ou %), tamanho fixo (turmas ou meias) ou livre (pessoas por offset), por operação, subsetor ou pool — ex.: 6x2 → K = 4; 4x2 → 5 turmas ou 9 meias; picos alternados em 2 subsetores: 16 pessoas separados × 12 em pool.
- **b. Defasagem ótima** (offsets) dado K: minimiza déficit e excesso.
- **c. Melhor modelo** do catálogo (+ personalizados salvos): ranking por conformidade, déficit, headcount e excesso; "só conformes" ou incluindo os viáveis com ACT/CCT.
- **d. Alocação nos pools** (pessoa × dia → posição): minimiza déficit, horas remanejadas e o máximo emprestado por pessoa; respeita cargos e o limite de horas (duro); horários = os da turma (interjornada preservada).
- **e. Fairness**: (b) com objetivo secundário de equilibrar domingos de folga e noites entre as turmas.
- Regras do regime como **restrições duras opcionais** (toggle): modelo não conforme → status `inviavel_regime`.

## 8. Premissas

1. Regra de negócio: CLT urbana; rural (21h–05h/20h–04h) fica para Fase 2.
2. *(v3.4)* A extinção da 6x1 é modelada como **regime legal versionado** (FR-39): o 6x1 permanece como **baseline de comparação**, permitido só em `CLT_44H_ATUAL`. Parâmetros e fontes em §8.1.
3. Feriados nacionais carregados automaticamente; estaduais/municipais informados manualmente.
4. O usuário informa se há ACT/CCT para 8 h em revezamento e para 12x36; o produto não valida o instrumento.
5. Headcount por turma = postos do turno; ausências (férias, absenteísmo) são cobertas por reserva/folguistas (FR-11, FR-13).
6. Horizonte padrão = ciclo calendário completo (`mmc(L,7)`).

### 8.1 Premissas legais — fim da escala 6x1 (v3.4)

> **Pendência bloqueante para homologação (não para o desenvolvimento): confirmar o texto promulgado pelo Congresso** (EC publicada no DOU) e atualizar os seeds de `legal_regimes` (`05` §3.13). Até lá, os três regimes têm status `premissa` e todo resultado mostra `INFO_REGIME_PREMISSA`.

| # | Premissa (fonte: reportagens — texto promulgado **não** confirmado) | Uso no produto | Status |
| :--- | :--- | :--- | :--- |
| PL1 | PEC do fim da 6x1 aprovada na Câmara (mai/2026) e no Senado (out/2026), rumo à promulgação | Existência dos regimes `TRANSICAO_42H` e `PEC_40H` | A validar (data de promulgação desconhecida → vigências ancoradas em "D0 = promulgação") |
| PL2 | Jornada semanal cai de **44 h para 40 h**; quem já está em 40 h ou 36 h não muda | `carga_semanal_max_h`; contratos ≤ 40 h não geram achado novo | A validar |
| PL3 | Transição (versão Câmara): 44 h → **42 h após 60 dias** → **40 h em 14 meses**; 5x2 mantida como referência | Vigências `CLT_44H_ATUAL` até D0+59 d, `TRANSICAO_42H` de D0+60 d até D0+14 meses−1 d, `PEC_40H` a partir de D0+14 meses | A validar (contagem dos 14 meses a partir da promulgação é premissa) |
| PL4 | Jornada **até 8 h diárias** e 40 h semanais, com **compensação/redução mediante ACT/CCT** | `jornada_diaria_max_h = 8`; `compensacao_act = true` ⇒ `CLT_VIAVEL_SOMENTE_COM_ACT` | A validar |
| PL5 | **Lei ordinária** tratará regimes diferenciados; **12x36** e outras escalas seguem autorizadas | 12x36 = regime especial `autorizado_pendente_lei` ⇒ `CLT_REGIME_PENDENTE_REGULAMENTACAO` | A validar; regras definitivas dependem da lei |
| PL6 | A proposta original de **36 h / 4x3** **não** consta da versão aprovada mais recente | Nenhum seed de 36 h; 4x3 continua no catálogo como modelo comum | Confirmado nas reportagens; reconfirmar no texto |
| PL7 | 6x1 deixa de ser permitida como regra geral ⇒ **mínimo de 2 dias de descanso semanais** no regime-alvo | `folgas_semanais_min = 2` e `permite_6x1 = false` em `PEC_40H`; `permite_6x1 = false` também em `TRANSICAO_42H` | **Premissa do produto a validar com o Jurídico** (Q14, Q15) |

Fontes: O Tempo, "Entenda a PEC que acaba com a escala 6x1, aprovada no Senado" (14/10/2026) — <https://www.otempo.com.br/politica/congresso/2026/10/14/entenda-a-pec-que-acaba-com-a-escala-6x1-aprovada-no-senado>; Agência Brasil, "Câmara aprova em dois turnos PEC pelo fim da escala 6x1" (mai/2026) — <https://agenciabrasil.ebc.com.br/politica/noticia/2026-05/camara-aprova-em-dois-turnos-pec-pelo-fim-da-escala-6x1>.

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
| Q12 | Substituição por cargo superior (enfermeiro cobrindo técnico) conta 100% do posto por padrão ou exige fator configurado? | Operações + RH | Não (padrão 1,0, FR-35) |
| Q13 | Modelos 12 h fora do 12x36 (2x2, Pitman, SDF): aceitar override por CCT com ALERTA, ou manter ERRO? | Jurídico | Não (padrão ERRO + override documentado) |
| **Q14** | **(v3.4) Fim da 6x1 — texto promulgado:** confirmar no texto da EC (i) carga 40 h e fases 42 h/40 h com datas exatas (60 dias / 14 meses contados de quê?), (ii) nº mínimo de folgas semanais (2?) e se a vedação da 6x1 vale já na fase 42 h, (iii) alcance da compensação por ACT/CCT (carga, jornada, folgas?), (iv) tratamento de 12x36 e demais regimes diferenciados até a lei ordinária | **Jurídico** | Sim (homologação; seeds `legal_regimes` com status `premissa` até lá) |
| Q15 | (v3.4) Folgas semanais: critério "média no ciclo" (padrão; 6x2 = 1,75) ou "em toda janela de 7 dias"? | Jurídico | Não (parâmetro `criterio_folgas`) |
| Q16 | (v3.4) Baseline 6x1 8 h com HE planejada no regime 44 h: `CLT_CARGA_SEMANAL_EXCEDIDA` como ERRO ou ALERTA (ligado a Q8)? | Jurídico + Produto | Não (padrão ALERTA com `he_planejada`) |
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

- **Fase 1 (MVP — 4 sprints, v3.3):** P0 = FR-01–03, FR-05–09, FR-11, FR-14–16, FR-20 (sem Súmula 60), FR-21, FR-23, FR-24 (salvar), FR-28 (essencial), FR-32 (fixo), FR-34–36 (enxutos), **FR-39–FR-42 (regime legal, v3.4)**. *(v3.4: FR-29 básico/FR-07 e K mínimo movidos para a Fase 2.)* Dependências: Q8; Q14 (só para homologação); casos golden de regime (GT-REG, §6.2) e de cobertura e viabilidade dos 10 modelos.
- **Fase 2 (pós-MVP, P1):** FR-07/FR-29 básico e K mínimo (v3.4), FR-10, FR-12, FR-13, FR-17–19, FR-20 (Súmula 60; depende de Q2, Q3), FR-22, FR-24 (versionar/duplicar), restante de FR-28/29/32/34–36, FR-30, FR-31, FR-33; NFR-01 completo. **Fase futura (P2):** Módulo 6 financeiro (FR-25–27), Erlang-C/UPH (FR-04), ILP CP-SAT, proporções e multi-skill (FR-37, FR-38), alocação nominal e calendário pessoal.
- **Fase 3:** integrações WFM/ponto (TOTVS, Senior, ADP, SAP) e avaliação de AFDT/ACJEF.

## Apêndice A — Catálogo canônico de códigos de achado

| Código | Severidade padrão | FR |
| :--- | :--- | :--- |
| `COB_DEFICIT` | ALERTA | FR-09, FR-12 |
| `COB_DEFICIT_POSTO_CRITICO` | ERRO | FR-02, FR-09 |
| `COB_EXCESSO` | INFO | FR-09 |
| `COB_PASSAGEM_PLANEJADA` | INFO | FR-45 (v3.6) — excesso explicado por passagem de turno / reforço de pico |
| `COB_REMANEJAMENTO_SUBSETOR` | INFO | FR-48 (v3.7) — horas-pessoa remanejadas entre subsetores do pool; mensagem traz déficit sem pool → com pool |
| `COB_DEFICIT_SUBSETOR` | ALERTA | FR-48 (v3.7) — déficit em um subsetor depois do remanejamento |
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
| `CLT_INTRAJORNADA` | ALERTA | FR-10, FR-20, FR-28 (split > 2 h) |
| `CLT_TEMPO_PARCIAL` | ALERTA | FR-28 |
| `COB_PADRAO_NAO_EXATO` | INFO | FR-28, FR-29 |
| `COB_K_INSUFICIENTE` | ALERTA (ERRO se posto crítico) | FR-32, FR-33 |
| `COB_K_ACIMA_NECESSARIO` | INFO | FR-32 |
| `COB_TURMA_ABAIXO_MINIMO` | ERRO | FR-33 |
| `COB_TURMA_ACIMA_MAXIMO` | ALERTA | FR-33 |
| `COB_CARGO_SEM_QUALIFICADO` | ERRO | FR-34, FR-36 |
| `COB_DEFICIT_CARGO` | ALERTA | FR-35 |
| `COB_COBERTURA_POR_SUBSTITUICAO` | INFO | FR-35 |
| `COB_LIMITE_FORA_CARGO` | ALERTA | FR-35 (P1), FR-38 |
| `COB_PROPORCAO_VIOLADA` | ALERTA (ERRO se obrigatória) | FR-37 (P2) |
| `INFO_DIVERGENCIA_59A_SUMULA60` | INFO | FR-20 |
| `CLT_CARGA_SEMANAL_EXCEDIDA` | ERRO (ALERTA com `he_planejada` em `CLT_44H_ATUAL`, Q16) | FR-40 |
| `CLT_FOLGAS_SEMANAIS_INSUFICIENTES` | ERRO | FR-40 |
| `CLT_ESCALA_6X1_VEDADA` | ERRO | FR-40 |
| `CLT_VIAVEL_SOMENTE_COM_ACT` | ALERTA (INFO se ACT/CCT declarado no cenário) | FR-40 |
| `CLT_REGIME_PENDENTE_REGULAMENTACAO` | ALERTA | FR-40 |
| `INFO_REGIME_PREMISSA` | INFO | FR-39 |

Severidades: **ERRO** (escala inviável / bloqueia homologação), **ALERTA** (exige ciência e justificativa), **INFO**.

**Distinções (v3.4):** `CLT_MEDIA_SEMANAL` = média acima da **carga contratual** (HE); `CLT_CARGA_SEMANAL_EXCEDIDA` = média acima do **limite legal do regime**. `CLT_ESCALA_6X1_VEDADA` (≤ 1 folga/7 d em regime que veda a 6x1) prevalece sobre `CLT_FOLGAS_SEMANAIS_INSUFICIENTES` (1 < folgas < mínimo) — o motor emite um dos dois.

**Distinções (v3.2):** `COB_TURMAS_INSUFICIENTES` = o K **informado no cenário** é menor que o K\* do modelo (pré-checagem do FR-08); `COB_K_INSUFICIENTE` = a **restrição** de K da operação/posto/cargo (fixo ou `K_max`) impede zerar o déficit (FR-32). `COB_DEFICIT_CARGO` = déficit de um cargo após aplicar a matriz de substituição; `COB_CARGO_SEM_QUALIFICADO` = mínimo de cargo/habilidade obrigatório (FR-36) ou certificação de posto (FR-34) não atendido.
