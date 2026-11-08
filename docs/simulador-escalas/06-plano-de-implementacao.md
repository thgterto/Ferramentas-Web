# 06 — Plano de Implementação: Simulador Operacional de Cobertura 24/7 (CLT Brasil)

> Fonte: `01-PRD.md` (PRD v3.1 — IDs FR-01…FR-27, NFR-01…NFR-09 canônicos), `02-TRD.md` (módulos do motor M1–M6), `03-fluxo-do-app.md` (telas T0–T7), `05-esquema-backend.md` (tabelas e endpoints). Estrutura inspirada nos guias `ecc:plan` / `product-management:sprint-planning`.
> **Foco do MVP: cobertura.** O caminho crítico é demanda → gerador de turmas → cobertura hora a hora → heatmap. Viabilidade CLT entra no motor como restrição. O **financeiro (Módulo 6) sai do MVP** e vai para a "Fase futura" (§3, último bloco).
> Estado atual do repositório: `frontend/` (React 19 + TS 5.9 + Vite 7 + Tailwind 4, app inicial) e `backend/` (FastAPI com módulo de atas, `requirements.txt` sem versões fixadas, sem Alembic, sem testes, sem CI em `.github/`).

## 1. Premissas
- Sprints de **2 semanas**; capacidade ~**40 pontos/sprint** (equipe da seção 6). 1 ponto ≈ meio dia de dev focado.
- Motor de cálculo é **Python puro** em `backend/app/services/engine/` (sem FastAPI/DB; árvore em `05` §6), determinístico, tempo em minutos inteiros e hora noturna em `Fraction(8,7)` (NFR-02), testes golden.
- Módulo isolado do código de atas; prefixo de API **`/api/v1/escalas`**.
- Fora do MVP: ILP (M5), financeiro (M6), alocação nominal, calendário pessoal, layouts WFM/AFDT — ver "Fase futura".

## 2. Visão das fases

| Fase | Sprints | Objetivo | FRs/NFRs (`01-PRD.md`) |
|---|---|---|---|
| 0 Fundações | S1 | Monorepo, CI, Postgres/Alembic, auth | base |
| 1 Motor de cobertura | S2–S4 | M1 demanda, M2 geradores, **M3 cobertura/dimensionamento**, M4 viabilidade | FR-01–03, FR-05–21, NFR-01/02/04 |
| 2 API + persistência | S5 | Endpoints, modelos, jobs | FR-01, FR-02, FR-05–20, FR-24, NFR-03/05 |
| 3 Frontend | S6–S7 | Wizard, heatmap + KPIs, calendário, viabilidade | FR-01–03, FR-05–21, NFR-06/07 |
| 4 Comparador, ajuste e export | S8 | Comparador operacional, ajuste de escala (T5), CSV/XLSX | FR-12, FR-13, FR-22–24 |
| 5 Hardening + beta | S9–S10 | 1.000 colab ≤ 2 s, segurança, beta | NFR-01, todos |
| Futura | pós-beta | Financeiro (M6), Erlang-C, ILP, nominal, WFM | FR-04, FR-25–27 |

Total MVP: **10 sprints (~20 semanas)**.

## 3. Backlog detalhado por fase

Legenda: **Pts** = pontos; **Dep** = dependências; **DoD** = critério de pronto específico.

### Fase 0 — Fundações (Sprint 1)

| ID | Item / tarefas | Dep | Pts | DoD | FR |
|---|---|---|---|---|---|
| F0-1 | Monorepo: `pyproject.toml` (uv/poetry) com versões fixadas; deps pesadas em extra; `Makefile` `dev`, `test`, `lint` | — | 3 | `make test` roda back e front do zero | — |
| F0-2 | Qualidade: ruff + mypy (strict em `services/engine/`), pytest + coverage; ESLint/Prettier, Vitest + Testing Library | F0-1 | 3 | lint/types sem erro na main | — |
| F0-3 | CI GitHub Actions: back (lint, mypy, pytest), front (lint, tsc, vitest, build); required checks | F0-2 | 5 | PR bloqueado se qualquer job falha | — |
| F0-4 | Postgres 16 via docker-compose; SQLAlchemy 2; Alembic com migração inicial | F0-1 | 5 | `alembic upgrade head` em CI | — |
| F0-5 | Auth JWT (access+refresh); `users`, `organizations`, `memberships`; papéis `owner/admin/planner/legal_reviewer/viewer` | F0-4 | 8 | rotas protegidas 401/403 em testes | — |
| F0-6 | pydantic-settings; logging JSON; `/health` | F0-1 | 3 | `/health` verde em CI e compose | — |
| F0-7 | Frontend: React Router, cliente tipado (openapi-typescript), TanStack Query, layout base, login | F0-5 | 8 | login + rota protegida E2E local | — |
| F0-8 | ADRs: tempo em minutos + Fraction(8,7), engine puro, formato canônico de escala (turma × dia) | — | 2 | ADRs em `docs/simulador-escalas/adr/` | NFR-02 |

**Total ≈ 37 pts.** Demo: login + health + pipeline verde.

### Fase 1 — Motor de cobertura em Python puro (Sprints 2–4)

| ID | Item / tarefas | Dep | Pts | DoD | FR |
|---|---|---|---|---|---|
| F1-1 | Domínio: `Turno`, `Turma(kind=regular|folguista)`, `Padrao`, `Escala`, `Achado`; dataclasses frozen; minutos absolutos | F0-8 | 5 | 100% tipado | base |
| F1-2 | M1 demanda: curva 168 h, postos fixos (com posto crítico), shrinkage D/N (`N_bruto`) | F1-1 | 5 | exemplos FR-01–03 do PRD | FR-01–03 |
| F1-3 | M2 gerador cíclico genérico por **dia absoluto** + padrões 6x1, 12x36 (4T, L=2, ciclo 14 d), 6x2 (4T, L=8, 56 d) | F1-1 | 8 | 6x2: 1 turma em M/T/N/F por dia em 56 d; 12x36 sem 2 dias seguidos na virada 31→1 | FR-05, FR-06 |
| F1-4 | M2 padrões 4x2 (**5 turmas** L=6 e **9 meias-turmas** L=18) e **5 turmas** (L=10, **33,6 h**, 70 d) | F1-3 | 5 | 4x2 5T excedente 11,1%; 9 meias exata; 5T 33,6 h | FR-05, FR-06 |
| F1-5 | Golden-test harness: fixtures YAML em `tests/engine/golden/`, revisão por SME de operações + CLT | F1-2 | 3 | ≥ 30 casos golden assinados | NFR-04 |
| F1-6 | **M3 cobertura hora a hora** do horizonte + agregação 7×24 (pior caso/média) + status déficit/exato/excesso | F1-3 | 8 | 12x36 2 postos: 168/168 h; 4x2 4T: déficit 11,1% dos turnos-dia | FR-09 |
| F1-7 | **M3 KPIs**: % horas-posto cobertas, déficit, pico (dia/hora), horas com déficit, excesso | F1-6 | 3 | KPIs = soma das células (propriedade) | FR-14 |
| F1-8 | **M3 dimensionamento**: `K* = s·L/w`, headcount mínimo com/sem reserva, `COB_TURMAS_INSUFICIENTES` | F1-6 | 3 | 6x2 3 postos → K=4, HC=12; 4x2 4T → sugere 5T ou 9 meias | FR-07 (P1), FR-08 |
| F1-9 | **M3 furos no intervalo** (computado com rendição / não computado / volantes) | F1-6 | 5 | 6x2 3 postos não computado = 63 h-posto/semana | FR-10 |
| F1-10 | **M3 cobertura com shrinkage** (visão "postos + reserva") | F1-6, F1-2 | 3 | exemplo FR-11 (déficit esperado 0,3 posto à noite) | FR-11 |
| F1-11 | **M3 calendário real**: feriados (nacionais + manuais) e política em feriado | F1-6 | 3 | exemplo FR-12 | FR-12 |
| F1-12 | **M3 folguistas/volantes**: heurística gulosa + "calcular mínimo" (usa F1-15 `valida_incremental`) | F1-6, F1-15 | 8 | 6x1 baseline → 4 turmas + N folguistas, déficit 0 | FR-13 |
| F1-13 | M4 interjornada (timestamps absolutos), DSR 35 h, 7º dia | F1-1 | 5 | `CLT_INTERJORNADA` no caso 06h→14h; `CLT_SETIMO_DIA` | FR-15, FR-16 |
| F1-14 | M4 domingo periódico, revezamento 6 h/8 h, 12x36 (dobra/36 h), jornada computada com 8/7 e Súmula 60, média semanal | F1-13 | 8 | 22–06 = 9,142857 h → `CLT_JORNADA_DIARIA`; 6x2 contrato 40 h → `CLT_MEDIA_SEMANAL` | FR-17–20 |
| F1-15 | M4 `valida_incremental` (vizinhança ±7 dias) | F1-13 | 2 | ≤ 300 ms por movimento | FR-13, T5 |
| F1-16 | Testes de propriedade (Hypothesis): escalas do catálogo sem `CLT_*` ERRO; `K < K*` ⇒ déficit; KPIs consistentes | F1-6..14 | 3 | 1.000 exemplos sem falha | FR-08, FR-09 |
| F1-17 | Benchmark (pytest-benchmark) 1.000 colab × 8 semanas | F1-6..14 | 2 | baseline registrado; motor < 1,5 s | NFR-01 |

**Total ≈ 79 pts** (S2: F1-1..5; S3: F1-6..11; S4: F1-12..17). Demo S4: CLI `python -m app.services.engine simulate 6x2 --turmas 4 --postos 3` imprime KPIs de cobertura, heatmap ASCII e achados (fluxo 4.1 do `03`).

### Fase 2 — API + persistência (Sprint 5)

| ID | Item / tarefas | Dep | Pts | DoD | FR |
|---|---|---|---|---|---|
| F2-1 | Migrações conforme `05` §3: `operations`, `positions`, `demand_curves`, `demand_slots`, `shrinkage_profiles`, `shift_templates`, `schedule_models`, `rotation_patterns`, `scenarios`, `teams`, `assignments`, `coverage_results`, `compliance_rules`, `compliance_findings`, `simulation_jobs`, `exports`, `audit_log` + RLS | F0-4, F1-1 | 8 | up/down testada; RLS testado | FR-01, FR-05, FR-24 |
| F2-2 | CRUD de operações/postos/curvas/cenários + `slots:import` CSV/XLSX (168 linhas) | F2-1 | 5 | erros 422 legíveis | FR-01, FR-02, FR-24 |
| F2-3 | `POST /scenarios/{id}/simulate` → motor M1→M4, persiste; síncrono ≤ 2 s, fallback Celery | F2-1, F1 | 8 | contrato OpenAPI; integração | FR-05–20 |
| F2-4 | `GET /scenarios/{id}/coverage` (KPIs + heatmap `view`/`agg`) e `POST /scenarios/{id}/sizing` | F2-3 | 3 | payload ≤ 50 KB | FR-08–14 |
| F2-5 | `GET /compliance-findings`, `PATCH /assignments/{id}` com revalidação incremental | F1-15, F2-3 | 3 | retorna delta de cobertura + achados | FR-12, FR-13, FR-15–20 |
| F2-6 | Auditoria/reprodutibilidade: `inputs_hash`, `engine_version`, `rules_version` | F2-3 | 3 | resultado reproduzível por hash | NFR-03 |
| F2-7 | Autorização por organização em todas as rotas | F0-5 | 3 | org A não lê org B | segurança |
| F2-8 | Tipos TS gerados do OpenAPI no CI | F2-3, F0-7 | 2 | diff falha CI se desatualizado | NFR-05 |

**Total ≈ 35 pts.** Demo: Swagger simulando 4x2 com 4 turmas → `COB_TURMAS_INSUFICIENTES` e heatmap com déficit.

### Fase 3 — Frontend: wizard, heatmap, calendário (Sprints 6–7)

| ID | Item / tarefas | Dep | Pts | DoD | FR |
|---|---|---|---|---|---|
| F3-1 | Tokens Tailwind (`04` §14, incl. turma B escuro `#CF7A24`), componentes base | F0-7 | 5 | catálogo de componentes | NFR-06 |
| F3-2 | Wizard passo 1 (Operação e regras CCT/ACT, feriados, política em feriado) | F3-1, F2-2 | 3 | zod | FR-12, FR-17, FR-18 |
| F3-3 | Passo 2 Demanda: postos fixos + grade 168 h + upload + colar do Excel | F3-2 | 8 | 168 células fluidas; RTL | FR-01, FR-02 |
| F3-4 | Passo 3 Shrinkage e reserva | F3-2 | 3 | defaults do PRD | FR-03, FR-11, FR-13 |
| F3-5 | Passo 4 Modelo e turmas (catálogo MVP, K sugerido, intervalo, folguistas) + Passo 5 Revisão | F3-2, F2-4 | 5 | sugestão de K vinda da API | FR-05–08, FR-10 |
| F3-6 | **Heatmap 7×24** com toggles postos/reserva e pior/média, camadas intervalo/feriado, tooltip, "Ver como tabela" | F2-4 | 8 | contraste AA; teclado; teste visual | FR-09–12 |
| F3-7 | **Cabeçalho de KPIs** + card "Como fechar o déficit" | F2-4 | 3 | KPIs batem com API | FR-08, FR-13, FR-14 |
| F3-8 | Calendário cíclico `mmc(L,7)` com folguistas, domingos/feriados, marcadores | F2-3 | 8 | 5 turmas × 70 dias < 200 ms | FR-21 |
| F3-9 | Aba viabilidade com link para a célula do calendário | F3-8 | 3 | clique foca a data | FR-15–20 |
| F3-10 | E2E Playwright wizard → T4 aba cobertura | F3-2..7 | 3 | roda no CI | fluxo 4.1 |

**Total ≈ 49 pts.** Demo S7: fluxo 4.1 (6x1 → 6x2) ponta a ponta no navegador.

### Fase 4 — Comparador operacional, ajuste de escala e export (Sprint 8)

| ID | Item / tarefas | Dep | Pts | DoD | FR |
|---|---|---|---|---|---|
| F4-1 | `POST /scenario-comparisons` (até 5) com deltas de KPIs de cobertura | F2-4 | 3 | contrato + testes | FR-22 |
| F4-2 | UI comparador (T6) + gráfico de déficit/headcount | F4-1, F3-1 | 5 | fluxo 4.3 do `03` reproduzido | FR-22 |
| F4-3 | Ajuste de escala (T5): turma × dia, folguista, feriado; revalidação < 300 ms; nova versão | F2-5, F3-8 | 8 | fluxo 4.2 do `03` (12x36 feriado) E2E | FR-12, FR-13, FR-24 |
| F4-4 | Export XLSX/CSV (`Escala`, `Cobertura168h`, `KPIs`, `Violacoes`, `Parametros`) | F2-3 | 5 | round-trip; 6x2 = 4 × 56 | FR-23 |
| F4-5 | Homologação (T7): checklist, `approve`, somente leitura | F2-3 | 3 | `blocking_findings` 422 testado | FR-24 |
| F4-6 | Histórico de alterações (`audit_log`) | F4-3 | 3 | quem/quando/o quê | NFR-03 |

**Total ≈ 27 pts.** Demo: "quantas turmas preciso?" comparando 6x1, 6x2, 4x2 4T/5T e 5 turmas.

### Fase 5 — Hardening, performance, segurança, beta (Sprints 9–10)

| ID | Item / tarefas | Dep | Pts | DoD | FR |
|---|---|---|---|---|---|
| F5-1 | Perf: profiling, vetorização, cache por `inputs_hash` | F1-17 | 8 | p95 simulate 1.000 colab ≤ 2,0 s | NFR-01 |
| F5-2 | Teste de carga (k6/Locust): 20 usuários simultâneos | F5-1 | 5 | p95 dentro do SLO | NFR-01 |
| F5-3 | Segurança: OWASP ASVS L1, rate limit, CORS, headers, limites de upload, `pip-audit`/`npm audit`, Bandit | F0-5 | 8 | zero high/critical | — |
| F5-4 | Observabilidade (Prometheus/OTel por módulo M1–M4), alertas | F0-6 | 5 | dashboard de latência | — |
| F5-5 | Deploy staging/produção (Docker, migrações, backup) | F0-4 | 5 | rollback testado | — |
| F5-6 | Acessibilidade WCAG 2.2 AA e UX review | F3 | 3 | axe sem violações sérias | NFR-06 |
| F5-7 | Beta fechado com 2–3 operações, coleta de KPIs (§3.3 do PRD) | todos | 13 | time-to-coverage e redução de horas-posto descobertas medidos | KPIs |

**Total ≈ 47 pts.**

### Fase futura (pós-MVP — PRD Fase 2/3)

| ID | Item | FR | Observação |
|---|---|---|---|
| FX-1 | **M6 financeiro**: adicional noturno, DSR reflexo, HE, periculosidade/insalubridade, encargos (Decimal) | FR-25, FR-26 | Depende de Q1, Q3, Q6 e planilha de referência do DP |
| FX-2 | Comparador financeiro + "4 turmas + HE vs. 5ª turma" (breakeven/payback) e aba `custos` | FR-27 | Antiga Fase 4 do plano v1 |
| FX-3 | Erlang-C / UPH-TMA | FR-04 | — |
| FX-4 | M5 ILP CP-SAT (turnos livres, folguistas ótimos) | — | Feature flag |
| FX-5 | Alocação nominal, calendário pessoal (.ics/PDF), LGPD completa | NFR-08 | — |
| FX-6 | Catálogo ampliado (3x1, 3x2, 5x2/4x3 contínuos), CLT rural | — | — |
| FX-7 | Layouts WFM (TOTVS, Senior, ADP, SAP) e AFDT/ACJEF | — | PRD Fase 3 |

## 4. Caminho crítico

`F0-1 → F0-4 → F1-1 → F1-3 → F1-6 → (F1-8..F1-12) → F1-13 → F2-1 → F2-3 → F2-4 → F3-6/F3-7 → F4-3 → F5-1 → F5-7 (beta)`

Pontos sensíveis: (a) validação dos golden de cobertura e viabilidade pelo SME (F1-5); (b) contrato de `simulate`/`coverage` (F2-3/F2-4) — bloqueia todo o frontend de resultados; (c) heurística de folguistas (F1-12); (d) performance (F5-1).

## 5. Gantt

```mermaid
gantt
    title Simulador de Cobertura 24/7 — sprints de 2 semanas
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m
    section Fase 0
    Fundações (monorepo, CI, Postgres, auth)   :f0, 2026-11-16, 14d
    section Fase 1
    Domínio, demanda, geradores                :crit, f1a, after f0, 14d
    Cobertura, KPIs, intervalo, feriados       :crit, f1b, after f1a, 14d
    Folguistas, viabilidade CLT, bench         :crit, f1c, after f1b, 14d
    section Fase 2
    API + persistência                         :crit, f2, after f1c, 14d
    section Fase 3
    Wizard + heatmap + KPIs                    :crit, f3a, after f2, 14d
    Calendário + viabilidade + E2E             :crit, f3b, after f3a, 14d
    section Fase 4
    Comparador, ajuste de escala, export       :crit, f4, after f3b, 14d
    section Fase 5
    Performance + segurança                    :crit, f5a, after f4, 14d
    Beta fechado                               :milestone, crit, f5b, after f5a, 14d
```

## 6. Equipe sugerida

| Papel | Dedicação | Responsabilidade |
|---|---|---|
| Tech lead / backend sênior (Python) | 100% | motor (M1–M4), arquitetura, ADRs |
| Backend pleno | 100% | API, persistência, export |
| Frontend sênior (React/TS) | 100% (a partir de S3) | wizard, heatmap, calendário |
| QA/automação | 50% | golden harness, Playwright, carga |
| SME de operações 24/7 + especialista CLT | 20% | casos golden de cobertura e viabilidade |
| Product manager / designer | 50% | backlog, UX, beta |
| DevOps | 20% | CI, deploy, observabilidade |

## 7. Riscos e mitigação

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| KPIs de cobertura não refletirem a operação real (pior caso vs. média, feriados) | Média | Alto | Q10/Q11 decididos com pilotos; toggles na UI; golden assinados pelo SME de operações |
| Heurística de folguistas subótima | Média | Médio | Reportar "mínimo encontrado"; CP-SAT na fase futura |
| Interpretação jurídica (Súmula 60, domingo, CCT) | Média | Médio | Regras parametrizáveis; disclaimer; fonte exibida |
| Performance 1.000 colab > 2 s | Média | Alto | benchmark desde F1-17; simular por turma; cache; job assíncrono |
| Turnos cruzando meia-noite / virada de mês | Média | Médio | minutos e dia absolutos; testes de propriedade |
| Pressão para trazer custo ao MVP | Média | Médio | Módulo 6 especificado (FR-25–27) e planejado como FX-1/FX-2 |
| Backend existente com deps sem versão | Alta | Baixo | lock em F0-1 |
| Equipe pequena / dependência do tech lead | Média | Médio | ADRs, pareamento, tarefas pequenas para agentes |

## 8. Estratégia de testes por fase

| Fase | Testes |
|---|---|
| 0 | smoke de CI, migração, auth (401/403) |
| 1 | unitários ≥ 90% em `engine/` (NFR-04); **golden** de cobertura (KPIs exatos) e de viabilidade; propriedade (Hypothesis); benchmark |
| 2 | integração FastAPI + Postgres; contrato OpenAPI; isolamento multi-tenant (RLS) |
| 3 | Vitest + RTL; Playwright do wizard; regressão visual do heatmap; axe |
| 4 | E2E do comparador e do ajuste com violação; round-trip CSV/XLSX |
| 5 | carga, SAST/DAST, auditoria de deps, recuperação de backup |

## 9. Marcos e demos

| Marco | Fim de | Demo |
|---|---|---|
| M0 Fundações | S1 | login, `/health`, CI verde |
| M1 Motor de cobertura | S4 | CLI: 6x2 4T 100% coberto; 4x2 4T com déficit e sugestão de 5T; 6x1 + folguistas |
| M2 API | S5 | Swagger: criar cenário, simular, ver cobertura e achados |
| M3 MVP visual | S7 | wizard → heatmap + KPIs → calendário no navegador |
| M4 Decisão operacional | S8 | comparador "quantas turmas?", ajuste de feriado com folguista, export XLSX |
| M5 Beta | S10 | 1.000 colab ≤ 2 s; beta com operações piloto |

## 10. Checklist de Definição de Pronto (DoD)

- [ ] Código revisado por ≥ 1 pessoa (ou humano revisando PR de agente)
- [ ] Lint, tipos (mypy/tsc) e testes passando no CI
- [ ] Cobertura de testes: engine ≥ 90% (NFR-04), backend ≥ 85%, frontend ≥ 70%
- [ ] Regras de cobertura e viabilidade com caso golden aprovado pelo SME e fonte citada
- [ ] Tempo em minutos inteiros e hora noturna em `Fraction(8,7)` (NFR-02)
- [ ] Migração Alembic com upgrade e downgrade testados (se houver)
- [ ] Contrato OpenAPI atualizado e tipos TS regenerados
- [ ] Autorização por organização verificada
- [ ] Sem regressão no benchmark do motor (> 10% falha)
- [ ] Acessibilidade (teclado, contraste) em telas novas
- [ ] Critério de aceite do item e FR ligado demonstrados

## 11. Ordem sugerida para agentes de código

Cada tarefa: pequena (≤ 1 PR, ≤ ~300 linhas), com verificação objetiva. Executar na ordem; tarefas no mesmo nível podem ser paralelas. Caminhos do motor relativos a `backend/app/services/engine/`.

1. **A01** `backend/pyproject.toml` com deps fixadas; `requirements.txt` gerado. *Verif.:* `pip install -e .[dev]` e `python -c "import app.main"`.
2. **A02** ruff + mypy + pytest com `tests/test_health.py`. *Verif.:* verdes.
3. **A03** `/health` em `app/main.py`. *Verif.:* TestClient 200.
4. **A04** `.github/workflows/ci.yml` (back + front). *Verif.:* PR verde.
5. **A05** Vitest + RTL com 1 teste de `App`. *Verif.:* `npm test` verde.
6. **A06** docker-compose Postgres + Alembic. *Verif.:* `alembic upgrade head && alembic downgrade base`.
7. **A07** `users`/`organizations`/`memberships` + JWT. *Verif.:* 401/403/200.
8. **A08** `types.py` (Turno, Turma, Padrao, Escala, Achado). *Verif.:* mypy strict.
9. **A09** `demanda.py`, `shrinkage.py`. *Verif.:* exemplos FR-01–03.
10. **A10** `gerador.py` (dia absoluto) + 6x1, 12x36, 6x2. *Verif.:* 6x2 56 dias 1 turma/turno; 12x36 virada 31→1.
11. **A11** padrões 4x2 (5T e 9 meias) e 5T. *Verif.:* 33,6 h; excedente 11,1%.
12. **A12** Harness golden `tests/engine/golden/*.yaml`. *Verif.:* `pytest -k golden` ≥ 10 casos.
13. **A13** `cobertura.py` (horizonte, 7×24 pior/média, status). *Verif.:* 12x36 2 postos 168/168.
14. **A14** KPIs em `cobertura.py`. *Verif.:* propriedade KPIs = soma das células.
15. **A15** `dimensionamento.py` (K*, headcount). *Verif.:* 6x2 → 4/12; 4x2 4T → `COB_TURMAS_INSUFICIENTES`.
16. **A16** Furos no intervalo + shrinkage esperado + feriados. *Verif.:* 63 h-posto; exemplo FR-11; exemplo FR-12.
17. **A17** `compliance/` interjornada, DSR 35 h, 7º dia + `valida_incremental`. *Verif.:* 06h→14h = 8 h.
18. **A18** `compliance/` domingo, revezamento, 12x36, jornada (`noturno.py` 8/7 + Súmula 60), média semanal. *Verif.:* 22–06 = 9,142857.
19. **A19** `folguistas.py` (gulosa + mínimo). *Verif.:* 6x1 baseline déficit 0.
20. **A20** Hypothesis + pytest-benchmark. *Verif.:* < 1,5 s.
21. **A21** Migrações de domínio (`05` §3). *Verif.:* up/down + RLS.
22. **A22** CRUD + upload 168 h. *Verif.:* integração.
23. **A23** `simulate`, `coverage`, `sizing`, `compliance-findings`, `PATCH assignments`. *Verif.:* OpenAPI snapshot.
24. **A24** Tipos TS no CI. *Verif.:* diff vazio.
25. **A25** Frontend: router, TanStack Query, login. *Verif.:* Playwright login.
26. **A26** Wizard passos 1–5 (um PR por passo). *Verif.:* RTL por passo.
27. **A27** `Heatmap7x24` + cabeçalho de KPIs. *Verif.:* render + axe.
28. **A28** `ScheduleCalendar` + aba viabilidade. *Verif.:* foco na violação.
29. **A29** Comparador operacional (API + UI). *Verif.:* fluxo 4.3.
30. **A30** Ajuste de escala (T5). *Verif.:* E2E fluxo 4.2.
31. **A31** Export XLSX/CSV. *Verif.:* round-trip.
32. **A32** Homologação (T7). *Verif.:* 422 `blocking_findings`.
33. **A33** Performance guiada pelo benchmark. *Verif.:* p95 ≤ 2 s.
34. **A34** Hardening (rate limit, headers, upload, audits no CI). *Verif.:* CI verde sem high.

Regras para agentes: não alterar o módulo de atas; não pular testes golden; cada PR referencia ID (A##) e FR; sem commit direto na main; não implementar FR-25–27 (financeiro) antes da fase futura.
