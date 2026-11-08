# Simulador Operacional de Cobertura 24/7 — documentação

## Posicionamento

Este é um **simulador operacional**. A pergunta central é: **"minha operação está coberta, hora a hora, nas 168 h da semana — e quantas turmas e pessoas preciso para isso?"**

- **Núcleo (MVP v3.3, 4 sprints):** demanda/postos 168 h → modelo de escala (catálogo essencial ou sequência personalizada) e turmas → **cobertura por hora** (heatmap de déficit/exato/excesso, cobertura com shrinkage, por cargo, turmas e headcount mínimos). Furos no intervalo, feriados e folguistas: **Fase 2**.
- **KPIs principais:** % horas-posto cobertas, horas-posto em déficit, pico de subcobertura, horas com déficit, headcount mínimo, turmas necessárias.
- **Viabilidade CLT:** interjornada, DSR 35 h/7º dia, domingo, revezamento 6 h/8 h, 12x36 e limites de jornada são **restrições** — uma escala que as viola é marcada como *inviável*. Não são o foco do produto.
- **Financeiro** (adicional noturno, DSR reflexo, HE, encargos, breakeven): **módulo secundário P2, fase futura** — especificado (FR-25–27), fora do MVP.

## Índice

| Doc | Conteúdo | Fonte da verdade para |
|---|---|---|
| [`00-prd-original.md`](00-prd-original.md) | PRD v2.0 original (só referência, não editado) | — |
| [`01-PRD.md`](01-PRD.md) | PRD v3.3 (v3.2 + corte do MVP em 4 sprints): problema, personas, KPIs, escopo, **FR-01…FR-38**, modelos de escala e **catálogo ampliado (§6.1)**, NFRs, perguntas abertas, correções, **catálogo de códigos de achado (Apêndice A)** | IDs de requisito, códigos de achado, números dos modelos, escopo/fases |
| [`02-TRD.md`](02-TRD.md) | Arquitetura, stack, **módulos do motor M1–M6**, algoritmos, performance, precisão, segurança, testes, ADRs | Módulos do motor e stack |
| [`03-fluxo-do-app.md`](03-fluxo-do-app.md) | Sitemap, **telas T0–T9, rotas**, passos do wizard, fluxos e edge cases, rastreabilidade FR → tela | Telas, rotas, abas, passos do wizard |
| [`04-briefing-de-design.md`](04-briefing-de-design.md) | Objetivos de design, microcopy, paleta (cobertura, severidade, turmas), componentes, wireframes, tokens Tailwind | Tokens visuais |
| [`05-esquema-backend.md`](05-esquema-backend.md) | ER, **DDL PostgreSQL**, RLS, **contratos REST** (`/api/v1/escalas`), pastas, jobs, versionamento | Tabelas e endpoints |
| [`06-plano-de-implementacao.md`](06-plano-de-implementacao.md) | **MVP em 4 sprints (S1–S4, 160 pts)**, backlog, Fase 2, caminho crítico, Gantt, riscos, DoD, ordem para agentes | Cronograma e backlog |

## Convenções canônicas (resumo)

- **Catálogo essencial do MVP (v3.3):** `6X1_BASE`, `5X2`, `12X36`, `6X2`, `4X2`, `2X2_12H`, `5T`, `4X3`, `FIXO_D`, `FIXO_N`; demais códigos da §6.1 = Fase 2.
- **Modelos base:** 6x1 baseline (K = 3,5 → 4 turmas + folguistas, 48 h), 12x36 (4 turmas, 42 h, ciclo 14 d, **dia absoluto**), 6x2 (4 turmas, **42 h**, 56 d), 4x2 (**5 turmas** ou 9 meias-turmas, 37,33 h, 42 d), 5 turmas (**33,6 h**, 70 d). Fórmula `K = turnos/dia × L / dias_trabalhados`. Hora noturna: fator exato **8/7**.
- **Catálogo v3.2 (FR-28; v3.3: Fase 2 exceto o essencial):** + 5x2, 5x1, 4x3, 6x3, 3x1, 3x2, 2x2 12 h, Pitman, Panamá, DuPont, Continental 8 h, 12x60, 24x48, 24x72, 18x36 (P1), 5T francesa, 6 turmas (8 h e 4×6 h), fim de semana 12 h, parcial 20/25/30 h, fixo/rotativo, reforço, escalonado, split (P1). Exatos em 24/7 e viabilidade padrão: `01` §6.1.
- **Motor:** M1 Demanda+shrinkage · M2 Gerador cíclico (+ M2b catálogo/construtor) · **M3 Cobertura e dimensionamento** (+ K como restrição e cobertura por cargo) · M4 Viabilidade CLT · M5 ILP (Fase 2) · M6 Financeiro (P2). Código em `backend/app/services/engine/`.
- **Códigos de achado:** `COB_*` (cobertura, M3) e `CLT_*` (viabilidade, M4) + `INFO_DIVERGENCIA_59A_SUMULA60`; severidades `erro` / `alerta` / `info`.
- **Telas:** T0 Login · T1 Organização · T2 Operações · T2.1 Detalhe · **T2.2 Restrições de turmas** · T3 Wizard (5 passos) · T4 Resultado (abas `cobertura`, `escala`, `viabilidade`, `custos`=P2) · T5 Ajuste de escala · T6 Comparador · T7 Homologação & export · **T8 Cadastros (T8.1 cargos, T8.2 matriz de substituição, T8.3 modelos)** · **T9 Construtor de escala**.
- **Stack:** React 19 + TS + Vite 7 + Tailwind 4; FastAPI + Pydantic v2 + SQLAlchemy 2 + Alembic; PostgreSQL 16 com RLS; NumPy; Celery/Redis; OR-Tools: `min_cost_flow`/GLOP no MVP (alocação por cargo, ADR-009), CP-SAT na Fase 2.

## Registro de revisão

### Revisão v3.3 — MVP enxuto ponta a ponta em 4 sprints

**Pedido (decisão do usuário):** MVP com **apenas 4 sprints de 2 semanas (~40 pts cada, 160 pts)**, entregando motor de cobertura + API + interface mínima (wizard, heatmap 7×24, calendário de turmas, painel de achados). O que não coube foi **reclassificado para "Fase 2"**, sem apagar conteúdo.

**O que ficou no MVP (P0):** M1 demanda + shrinkage (FR-01–03); gerador cíclico + **catálogo essencial de 10 modelos** (`6X1_BASE`, `5X2`, `12X36`, `6X2`, `4X2` 5T/9 meias, `2X2_12H`, `5T`, `4X3`, `FIXO_D`, `FIXO_N`); **construtor básico** (sequência + horários + offsets com validação, absorve FR-07); M3 cobertura hora a hora, heatmap 7×24, KPIs, dimensionamento, visão com reserva (FR-08, 09, 11, 14); **K fixo/mínimo** por operação (FR-32 enxuto); **cargos** com matriz direcional f = 1,0 e mínimo por cargo por turno (FR-34–36 enxutos, sem habilidades); M4 **interjornada, DSR 35 h/7º dia, jornada/média com 8/7** (FR-15, 16, 20); calendário (FR-21); export CSV/XLSX (FR-23); salvar cenário (FR-24 parcial); API síncrona + Postgres/RLS + auth JWT simples; NFR-01 reduzido a 200 colaboradores.

**Sprints:** S1 fundações enxutas + M1 + geradores = 40 · S2 M3 + K + cargos + M4 essencial + construtor básico = 40 · S3 API + persistência + auth = 40 · S4 frontend mínimo + export + demo/beta interno = 40 → **160 pts**.

**Fase 2 (P1):** feriados (FR-12), folguistas (FR-13), furos no intervalo (FR-10), domingo/revezamento/12x36/Súmula 60 (FR-17–19, FR-20 parcial), comparador (FR-22), T5 ajuste, T7 homologação, versionamento (FR-24), catálogo restante (FR-28), construtor avançado/T9, camadas e templates (FR-29 P1, FR-30, FR-31), K faixa/livre e tamanho de turma (FR-32 parcial, FR-33), habilidades e substituição parcial (FR-34–36 parcial), T1/T2.2/T8, Celery, refresh token, performance 1.000 colaboradores, hardening, beta externo. Sem otimizador CP-SAT no MVP (M5 segue Fase 2; M6 financeiro segue P2).

| Doc | Mudanças |
|---|---|
| `01` | PRD **v3.3**: §4.1/§4.2 reescritas; legenda de prioridade (P0 = MVP de 4 sprints, P1 = Fase 2, P2 = futura); prioridades de FR-07, 10, 12, 13, 17–20, 22, 24, 28, 29, 32–36 ajustadas; §6.1 "MVP × fase" restrita ao catálogo essencial; NFR-01 (200 colab no MVP), NFR-06/07 ajustados; §11 refeita. |
| `02` | Quadro de corte por módulo; tags **[MVP]/[MVP parcial]/[Fase 2]/[P2]** nas seções M1–M6 e performance; árvore do motor (`folguistas.py` Fase 2); regras M4 e endpoints da §12 marcados; ADR-006 (MVP só síncrono). |
| `03` | Quadro de corte; sitemap com nós de Fase 2 tracejados (`classDef fase2`) e export direto de T4; coluna "Fase" nas rotas e na rastreabilidade; tags em T0–T9, passos 3.1–3.5, fluxos 4.1–4.5 e §5; cargos/matriz/mínimos em tabela simples no passo 3.3. |
| `04` | Quadro de corte; tags nos componentes §8.1–8.13, wireframes §11 e acessibilidade. |
| `05` | Quadro de corte; `-- [MVP]`/`-- [Fase 2]`/`-- [P2]` em todo `CREATE TABLE`; endpoints §5.4 e exemplos §5.5 marcados; enum `team_count_mode` ganha `minimo`; seeds `phase='mvp'` só no catálogo essencial (`3X1`, `6X3`, `DUPONT` → `fase2`); §7 Celery = Fase 2. |
| `06` | Replanejado: **S1–S4 com 40 pts cada** (IDs `F*-*` preservados; itens reduzidos marcados "enxuto"); §3.5 Fase 2a/2b/2c + Fase futura com o "resto" de cada item; caminho crítico, Gantt, riscos (R1 escopo apertado, R2 frontend concentrado na S4, R4/R5 cortes visíveis ao usuário), marcos, testes, DoD e ordem para agentes limitada ao MVP (§11) com §11.1 Fase 2. |

**Validação de diagramas:** Gantt do `06`, sitemap e fluxo do wizard do `03` renderizados sem erro com `@mermaid-js/mermaid-cli`.

**Em aberto (v3.3):** confirmar com o SME que o catálogo essencial cobre os pilotos; ordem de sacrifício do R1 (`06` §7) a validar com o PM; Q8 continua bloqueando o golden do 6x1.

### Revisão v3.2 — repertório de escalas, construtor, turmas (K) e cargos

**Pedido:** ampliar o repertório de escalas e a personalização do gestor; número de turmas e "quem pode cobrir quem" entre cargos como restrições.

| Doc | Mudanças |
|---|---|
| `01` | PRD v3.2. Novos **Módulo 7** (FR-28 catálogo ampliado, FR-29 construtor, FR-30 camadas P1, FR-31 templates P1), **Módulo 8** (FR-32 K fixo/faixa/livre, FR-33 tamanho de turma/meias-turmas) e **Módulo 9** (FR-34 cargos/habilidades, FR-35 matriz direcional, FR-36 mínimos por turno, FR-37 proporções P2, FR-38 multi-skill P2). §6.1 catálogo com K\*, exatidão 24/7, K não contínuo e observação legal (verificado por enumeração de offsets). FR-07 absorvido pelo FR-29. Apêndice A: `COB_PADRAO_NAO_EXATO`, `COB_K_INSUFICIENTE`, `COB_K_ACIMA_NECESSARIO`, `COB_TURMA_ABAIXO_MINIMO`, `COB_TURMA_ACIMA_MAXIMO`, `COB_CARGO_SEM_QUALIFICADO`, `COB_DEFICIT_CARGO`, `COB_COBERTURA_POR_SUBSTITUICAO`, `COB_LIMITE_FORA_CARGO`, `COB_PROPORCAO_VIOLADA`, `CLT_TEMPO_PARCIAL`. Q12–Q13. |
| `02` | §5.3.1 M2b (catálogo como dados, ciclo em horas, multibloco, `R`, folga fixa, validação do construtor, camadas); §5.4.1 K como restrição; §5.4.2 cobertura por cargo (min-cost-flow por hora + cache de perfis; LP para frações); §5.6 extensão CP-SAT (K, tamanho, autômato, substituição, mínimos, proporção, limite fora do cargo); ADR-009 (OR-Tools no MVP só fluxo/LP) e ADR-010 (padrões como dados); ER e API. |
| `03` | T2.2 restrições de turmas, T8.1 cargos, T8.2 matriz, T8.3 modelos, T9 construtor; rotas novas; passo 3.2 com demanda por cargo e mínimos; passo 3.4 com catálogo ampliado, K, composição e camadas (wizard continua com 5 passos); fluxos 4.4 (UTI enfermeiro→técnico) e 4.5 (K fixo por ACT); edge cases E19–E24; rastreabilidade FR-28–38. |
| `04` | Componentes §8.9 editor de sequência arrastável, §8.10 régua de turnos, §8.11 matriz cargo × cargo, §8.12 cobertura por cargo, §8.13 controle de K; microcopy dos novos códigos; wireframes §11.5–11.6. |
| `05` | §3.12: `roles`, `skills`, `role_skills`, `position_skills`, `employee_skills` (Fase 2), `substitution_rules`, `role_coverage_requirements`, `team_constraints`, `custom_schedule_patterns` + `_versions`, `scenario_layers`, `team_role_composition`, `coverage_role_results`; colunas novas em `schedule_models`/`teams`/`positions`/`scenarios`; seeds do catálogo; endpoints e exemplos JSON. |
| `06` | F1-18..F1-24, F2-9..F2-11, F3-11..F3-15, F4-7..F4-11 (P1), FX-8..FX-10; agentes A35–A43; MVP continua em **10 sprints** (S5 ≈ 10% acima da capacidade; P1 cortáveis). |

**Decisões de consistência**
- `COB_TURMAS_INSUFICIENTES` (K do cenário < K\* do modelo) ≠ `COB_K_INSUFICIENTE` (restrição de K da operação/posto/cargo impede zerar o déficit).
- Modelos exatos em cobertura mas inviáveis na CLT (DuPont, Panamá, Continental 8 h, 24x48, 24x72, 18x36) ficam no catálogo com selo "inviável" para comparação.
- Correção de achados de catálogo: 6x1 e 6x3 fecham exatos com meias-turmas (7 e 9); 6 turmas em 4×6 h usa `[M,M,T,T,V,V,F,N,N,F,F,F]` (a variante sem F entre V e N tinha 8 dias seguidos e interjornada 0 h).

**Validação de diagramas:** blocos mermaid alterados/novos (ER do `02` e `05`, sitemap, wizard e fluxo 4.4 do `03`, Gantt do `06`): os 12 blocos dos docs `02`, `03`, `05` e `06` foram renderizados sem erro com `@mermaid-js/mermaid-cli`.

**Em aberto (v3.2):** Q12 (fator padrão de substituição), Q13 (12 h fora do 12x36 com CCT); golden dos novos modelos a assinar pelo SME; `18X36` e `SPLIT` exigem extensão do gerador (P1).


### Revisão de 08/11/2026 — reposicionamento operacional + consistência cruzada

**Reposicionamento (todos os docs)**
- `01`: PRD v3.0 → **v3.1**. Novo Módulo 3 **Cobertura** como núcleo (FR-08 dimensionamento, FR-09 heatmap, FR-10 furos no intervalo, FR-11 shrinkage, FR-12 folgas/feriados, FR-13 folguistas/volantes, FR-14 KPIs). Compliance virou **Módulo 4 — Viabilidade** (FR-15–20). Financeiro virou **Módulo 6 P2** (FR-25–27), mantido mas fora do MVP. KPIs do produto passaram a ser de cobertura (§3.2). Personas: Operações é primária; CFO "fase futura".
- `02`: módulos renumerados e pipeline do MVP `M1 → M2 → M3 → M4`; nova seção §5.4 **M3 Cobertura** (algoritmo, KPIs, dimensionamento, heurística de folguistas); ILP (M5) e financeiro (M6) marcados Fase 2/P2.
- `03`: reescrito — T4 abre na aba `cobertura`; wizard sem passo financeiro; fluxos de uso trocados (feriado + folguista na 12x36; "quantas turmas preciso?") e breakeven movido para P2.
- `04`: objetivos, KPIs, comparador e wireframes centrados em cobertura; extrato financeiro marcado P2.
- `05`: KPIs de cobertura em `scenarios`; `coverage_results` com pior caso/média, cobertura esperada e furo de intervalo; `teams.kind` (folguista); `break_policy`, `holiday_policy`, `floater_count`; `financial_results` marcado P2; novo endpoint `POST /scenarios/{id}/sizing`.
- `06`: replanejado — Fase 1 = motor de cobertura; antiga Fase 4 (financeiro) movida para "Fase futura" (FX-1/FX-2); MVP de 11 → **10 sprints**.

**Inconsistências resolvidas**
| # | Divergência | Resolução (fonte) |
|---|---|---|
| 1 | `02`–`06` referenciavam a numeração FR do PRD v2.0 (`00`), diferente do `01` | Todos apontam para FR-01…FR-27 do `01` v3.1 |
| 2 | Códigos de alerta divergentes (`ERRO_CRITICO_QUEBRA_INTERJORNADA`, `ERRO_INTERJORNADA`, `ALERTA_CF_TURNO_REVEZAMENTO_6H`, `ALERTA_DOMINGO_W_LIMITE`, `BLOQUEIO_VIOLACAO_REGIME_12X36`…) | Catálogo único `COB_*`/`CLT_*` no `01` Apêndice A; seeds de `compliance_rules` (`05`) e tabela do `02` alinhadas |
| 3 | Severidades: Bloqueio/Alerta/Info (`03`), Crítico/Alto/Médio/Info (`04`), info/alerta/erro/critico (`05`) | `erro` / `alerta` / `info` em todos; tokens `sev-erro/alerta/info/ok` no `04` |
| 4 | Tabelas em português no `02` (`CENARIO`, `TURMA`…) vs. inglês no `05` | `05` é a fonte; ER do `02` usa os nomes do `05` |
| 5 | API `/api/v1/escalas/cenarios/.../simulacoes` (`02`) vs. `/api/v1/scenarios/.../simulate` (`05`) vs. `/scenarios/{id}/simulate` (`06`) | Prefixo `/api/v1/escalas` + recursos do `05` em todos; rotas do `03` mapeadas aos endpoints |
| 6 | Formato de erro RFC 7807 (`02`) vs. envelope `{"error":…}` (`05`) | Envelope do `05` |
| 7 | Pasta do motor: `app/escalas/engine/` (`02`), `app/services/engine/` com subpastas em inglês (`05`), `app/engine/` (`06`) | `backend/app/services/engine/` com arquivos M1–M6 (`02` §2.3 = `05` §6) |
| 8 | Papéis: `admin_org/planejador/juridico/…` (`02`), `owner/admin/planner/legal_reviewer/viewer` (`05`), outros no `03`/`06` | Enum `member_role` do `05` |
| 9 | Wizard com 5 passos (`03`) vs. 6 passos em outra ordem (`04`) | 5 passos do `03` (financeiro só como seção recolhida P2) |
| 10 | Comparador ≤ 5 (`01`), ≤ 6 (`05`), 4 colunas (`04`) | 5 cenários (FR-22) |
| 11 | 4x2: "4 ou 5 turmas" (`06`), "9 turmas em ciclo duplo" (`02`), "25% descoberto" (`01` C5) | 5 turmas ou 9 meias-turmas; 4 turmas = **11,1%** dos turnos-dia descobertos (C5 corrigido) |
| 12 | 5 turmas "33,6–36 h" (`06`) | 33,6 h |
| 13 | 12x36 "ciclo 4 dias" (`06`) | L=2 por turma, ciclo calendário `mmc(2,7)` = 14 dias, dia absoluto |
| 14 | Calendário "até 8 semanas" (`03`) / "até 42 dias" (`04`) | Ciclo calendário completo `mmc(L,7)` (até 70 dias) |
| 15 | Catálogo do wizard com 3x1/3x2/5x2/4x3 (`03`) e "5x2 contínuo" nos wireframes (`04`) | MVP = 6x1, 12x36, 6x2, 4x2, 5 turmas; demais "Fase 2" |
| 16 | Fator noturno `1.142857` como default (`05`) | Coluna só de exibição; motor usa `Fraction(8,7)` |
| 17 | Shrinkage máx. 60% (`01`) vs. `< 0.9` (`02`, `05`) | `< 0.6` |
| 18 | Códigos de turno T1/T2/T3 (`05`) vs. M/T/N (`01`, `03`) | M/T/N/D12/N12 |
| 19 | Alocação nominal / calendário pessoal / WFM no MVP (`03`, `06`) vs. "sem PII, Fase 2/3" (`01`) | MVP por turma; nominal, .ics e WFM em Fase 2/3; `employees` marcado Fase 2 |
| 20 | Persistência em aberto (Q7 no `01`) vs. Postgres decidido (`02`/`05`) | Q7 fechada: PostgreSQL 16 + RLS desde o início |
| 21 | WCAG 2.1 (`01`) vs. 2.2 (`04`) | WCAG 2.2 AA |
| 22 | Status do cenário "Com bloqueios" (`03`) vs. enum `scenario_status` (`05`) | Enum do `05`; "inviável" é selo, não status |
| 23 | Cor da turma B no escuro sem validação (`04`) | `#CF7A24`: contraste 5,78:1 (bg), 5,32:1 (surface), 4,80:1 (surface-2) — passa ≥ 3:1 |

**Validação de diagramas:** os 11 blocos mermaid (`02`, `03`, `05`, `06`) foram renderizados sem erro com `@mermaid-js/mermaid-cli` 11.4.2.

### Em aberto
- **Turma B escuro:** contraste validado; falta rerodar `validate_palette.js` (banda de luminosidade, croma, separação CVD) da paleta escura completa.
- **Decisões de produto/jurídico:** Q2 (intervalo padrão), Q3 (59-A × Súmula 60, só afeta FR-20), Q8 (baseline 6x1 8 h × 7h20), Q10 (heatmap pior caso × média), Q11 (política padrão em feriado); Q1/Q6 só para o Módulo 6.
- **Heurística de folguistas (FR-13):** devolve "mínimo encontrado", não ótimo garantido, até o M5 (CP-SAT).
- **Números ilustrativos** dos wireframes (`04` §11) e payloads de exemplo (`05` §5.5) não são casos golden; os golden saem dos exemplos de aceite do `01` §5.
- `00-prd-original.md` não foi alterado e continua com a numeração/códigos antigos (apenas referência histórica).
