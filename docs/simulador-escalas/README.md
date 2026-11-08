# Simulador Operacional de Cobertura 24/7 — documentação

## Posicionamento

Este é um **simulador operacional**. A pergunta central é: **"minha operação está coberta, hora a hora, nas 168 h da semana — e quantas turmas e pessoas preciso para isso?"**

- **Núcleo (MVP):** demanda/postos 168 h → modelo de escala e turmas → **cobertura por hora** (heatmap de déficit/exato/excesso, furos no intervalo intrajornada, cobertura com shrinkage/absenteísmo, folgas e feriados, folguistas/volantes, turmas e headcount mínimos).
- **KPIs principais:** % horas-posto cobertas, horas-posto em déficit, pico de subcobertura, horas com déficit, headcount mínimo, turmas necessárias.
- **Viabilidade CLT:** interjornada, DSR 35 h/7º dia, domingo, revezamento 6 h/8 h, 12x36 e limites de jornada são **restrições** — uma escala que as viola é marcada como *inviável*. Não são o foco do produto.
- **Financeiro** (adicional noturno, DSR reflexo, HE, encargos, breakeven): **módulo secundário P2, fase futura** — especificado (FR-25–27), fora do MVP.

## Índice

| Doc | Conteúdo | Fonte da verdade para |
|---|---|---|
| [`00-prd-original.md`](00-prd-original.md) | PRD v2.0 original (só referência, não editado) | — |
| [`01-PRD.md`](01-PRD.md) | PRD v3.1: problema, personas, KPIs, escopo, **FR-01…FR-27**, modelos de escala, NFRs, perguntas abertas, correções, **catálogo de códigos de achado (Apêndice A)** | IDs de requisito, códigos de achado, números dos modelos, escopo/fases |
| [`02-TRD.md`](02-TRD.md) | Arquitetura, stack, **módulos do motor M1–M6**, algoritmos, performance, precisão, segurança, testes, ADRs | Módulos do motor e stack |
| [`03-fluxo-do-app.md`](03-fluxo-do-app.md) | Sitemap, **telas T0–T7, rotas**, passos do wizard, fluxos e edge cases, rastreabilidade FR → tela | Telas, rotas, abas, passos do wizard |
| [`04-briefing-de-design.md`](04-briefing-de-design.md) | Objetivos de design, microcopy, paleta (cobertura, severidade, turmas), componentes, wireframes, tokens Tailwind | Tokens visuais |
| [`05-esquema-backend.md`](05-esquema-backend.md) | ER, **DDL PostgreSQL**, RLS, **contratos REST** (`/api/v1/escalas`), pastas, jobs, versionamento | Tabelas e endpoints |
| [`06-plano-de-implementacao.md`](06-plano-de-implementacao.md) | Fases, backlog, caminho crítico, Gantt, riscos, DoD, ordem para agentes | Cronograma e backlog |

## Convenções canônicas (resumo)

- **Modelos MVP:** 6x1 baseline (K = 3,5 → 4 turmas + folguistas, 48 h), 12x36 (4 turmas, 42 h, ciclo 14 d, **dia absoluto**), 6x2 (4 turmas, **42 h**, 56 d), 4x2 (**5 turmas** ou 9 meias-turmas, 37,33 h, 42 d), 5 turmas (**33,6 h**, 70 d). Fórmula `K = turnos/dia × L / dias_trabalhados`. Hora noturna: fator exato **8/7**.
- **Motor:** M1 Demanda+shrinkage · M2 Gerador cíclico · **M3 Cobertura e dimensionamento** · M4 Viabilidade CLT · M5 ILP (Fase 2) · M6 Financeiro (P2). Código em `backend/app/services/engine/`.
- **Códigos de achado:** `COB_*` (cobertura, M3) e `CLT_*` (viabilidade, M4) + `INFO_DIVERGENCIA_59A_SUMULA60`; severidades `erro` / `alerta` / `info`.
- **Telas:** T0 Login · T1 Organização · T2 Operações · T2.1 Detalhe · T3 Wizard (5 passos) · T4 Resultado (abas `cobertura`, `escala`, `viabilidade`, `custos`=P2) · T5 Ajuste de escala · T6 Comparador · T7 Homologação & export.
- **Stack:** React 19 + TS + Vite 7 + Tailwind 4; FastAPI + Pydantic v2 + SQLAlchemy 2 + Alembic; PostgreSQL 16 com RLS; NumPy; Celery/Redis; OR-Tools só na Fase 2.

## Registro de revisão

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
