# PRD v3.0 — Simulador de Escalas 24/7 (Brasil/CLT)

| Metadado | Detalhe |
| :--- | :--- |
| **Produto** | Workforce Shift Simulator (Simulador de Escalas & Headcount) |
| **Versão** | 3.0 — refinado para engenharia (substitui `00-prd-original.md`, v2.0) |
| **Status** | Pronto para planejamento técnico (Spec) |
| **Stack alvo** | Frontend: React 19 + TypeScript + Vite 7 + Tailwind 4 (`/frontend`). Backend: FastAPI + Python (`/backend`) |
| **Data** | Novembro/2026 |

> **Aviso:** o simulador é ferramenta de apoio à decisão. Não substitui parecer jurídico nem a CCT/ACT aplicável. Toda regra legal é **parametrizável** e exibida com a fonte normativa.

---

## 1. Problema

Operações ininterruptas (indústria contínua, CDs, hospitais, NOC, segurança) precisam cobrir **168 h/semana** com turmas em revezamento. Hoje o dimensionamento é feito em planilhas que não modelam a matriz *turma × dia × hora*, ignoram a hora noturna reduzida, a prorrogação noturna (Súmula 60 TST), a interjornada de 11 h e o DSR — gerando postos descobertos, horas extras habituais e passivo trabalhista. A discussão sobre o fim da escala 6x1 aumenta a pressão por comparar alternativas (12x36, 6x2, 4x2, 5 turmas) com números confiáveis.

**Custo de não resolver:** headcount superdimensionado ou buracos de cobertura; condenações por violação de interjornada/revezamento (Art. 7º, XIV CF); decisões de mudança de escala sem visão financeira.

## 2. Personas

| Persona | Pergunta que precisa responder | Uso principal no MVP |
| :--- | :--- | :--- |
| **Gerente de Operações 24/7** (planta, CD, NOC) | "Quantas turmas e pessoas preciso para nunca deixar um posto vazio?" | Postos fixos, gerador de turmas, heatmap |
| **Coordenação de Enfermagem / Hospitalar** | "Minha 12x36 está correta e sem furos noturnos?" | Modelo 12x36, alertas de dobra/descanso |
| **BP de RH / Jurídico Trabalhista** | "A escala respeita CLT, Súmulas e a CCT?" | Motor de compliance, relatório de violações |
| **CFO / Controladoria** | "Quanto custa por ano cada alternativa vs. o 6x1 atual?" | Comparador financeiro, export XLSX |

## 3. Objetivos e KPIs

### 3.1 Objetivos
1. **Cobertura:** cenários gerados no modo postos fixos têm 0 h de subcobertura nas 168 h (quando o modelo é viável para o nº de turmas escolhido) ou explicitam o déficit hora a hora.
2. **Compliance:** 100% das violações das regras implementadas (interjornada, DSR/35 h, 7º dia, revezamento 6 h, 12x36) detectadas nos casos-teste oficiais (suíte "golden" com escalas de referência).
3. **Decisão financeira:** usuário compara ≥ 3 modelos lado a lado com custo anual em ≤ 10 min desde o início.
4. **Exatidão de cálculo:** divergência ≤ R$ 0,01 por colaborador/mês contra planilha de referência validada pelo Jurídico/DP.

### 3.2 KPIs
| Tipo | Métrica | Meta (sucesso / stretch) | Medição |
| :--- | :--- | :--- | :--- |
| Leading | Time-to-scenario (abrir → 1º cenário com custo) | ≤ 10 min / ≤ 5 min | Telemetria de eventos front |
| Leading | % sessões com ≥ 2 cenários comparados | ≥ 60% / ≥ 80% | Telemetria |
| Leading | % sessões com export | ≥ 40% / ≥ 60% | Contagem de downloads |
| Leading | p95 do tempo de simulação (1.000 colaboradores, 8 semanas) | ≤ 2 s / ≤ 1 s | Log do backend |
| Lagging | Cenários "homologados" (marcados como aprovados) em 90 dias | ≥ 30% dos exportados | Flag no cenário |
| Lagging | Redução de HE reportada pelos pilotos | ≥ 15% em 6 meses | Entrevista/pesquisa com pilotos |

> A meta "0% de quebra de regras" e "−15% de HE" do v2.0 são resultados do cliente, não do produto; foram mantidas como indicadores *lagging* de pilotos.

## 4. Escopo

### 4.1 MVP (Fase 1)
- **Entrada de demanda:** modo **postos fixos** por faixa horária e **curva 168 h** (edição em grade 7×24 e upload CSV/XLSX). Shrinkage diurno/noturno.
- **Catálogo de modelos** (geração cíclica determinística, ver §6):
  - **6x1 baseline** (referência de custo atual);
  - **12x36** (4 turmas);
  - **6x2** revezamento 8 h (4 turmas);
  - **4x2** revezamento 8 h (5 turmas com excedente ou 9 meias-turmas);
  - **5 turmas** (padrão 6T-4F, 33,6 h/sem).
- **Compliance:** interjornada 11 h, descanso semanal 35 h (24 h + 11 h), 7º dia consecutivo, folga dominical periódica (parâmetro), hora noturna reduzida, Súmula 60 (prorrogação), alerta Art. 7º XIV (revezamento > 6 h sem ACT/CCT), limites 12x36 (Art. 59-A CLT).
- **Financeiro:** salário, adicional noturno, DSR reflexo sobre variáveis, HE, periculosidade/insalubridade (percentual simples), encargos (% único parametrizável); comparador lado a lado e anualizado, incluindo "4 turmas + HE vs. 5ª turma".
- **Visualização:** heatmap 7×24 (déficit/exato/excedente), calendário cíclico por turma.
- **Export:** CSV e XLSX (escala por turma/dia, resumo de custos, violações).
- **Persistência:** cenários salvos no backend (SQLAlchemy), sem multi-tenant avançado.

### 4.2 Fora do MVP
| Item | Fase | Motivo |
| :--- | :--- | :--- |
| Erlang-C / filas com SLA, conversão UPH/TMA avançada | 2 | Exige calibração de dados de volume; postos fixos cobrem o caso crítico |
| Solver ILP de turnos livres/intermediários (Alg. 2 v2.0) | 2 | Modelos cíclicos fechados resolvem o MVP; ILP agrega dependência (OR-Tools/PuLP) |
| 3x1, 3x2, 5x2/4x3 contínuos, 6 turmas, jornadas parciais | 2 | Ampliação do catálogo sobre o mesmo motor |
| Alocação nominal de colaboradores, folguistas, sugestão automática de substituto | 2 | MVP trabalha por turma |
| Integrações TOTVS, Senior, ADP, SAP SuccessFactors | 3 | Layouts proprietários; validar demanda |
| Arquivos legais AFDT/ACJEF (Portaria 671/2021) | 3 | São arquivos de *registro de ponto realizado*, não de escala planejada |
| Calendário pessoal anual do colaborador, feriados municipais automáticos | 2 | — |
| Encargos detalhados (INSS por faixa, FGTS, 13º, férias, RAT/FAP) | 2 | MVP usa % único |

## 5. Requisitos Funcionais

Prioridade: **P0** = obrigatório MVP; **P1** = desejável MVP; **P2** = futuro.

### Módulo 1 — Demanda

**FR-01 (P0) Curva 168 h.** Grade editável 7 dias × 24 h (granularidade 60 min no MVP), valores inteiros ≥ 0, com upload CSV/XLSX.
- Dado um CSV com 168 linhas `dia(1-7),hora(0-23),demanda`, quando importado, então a grade exibe os 168 valores e o total semanal é a soma das linhas.
- Dado um arquivo com linha faltante, duplicada ou valor negativo, quando importado, então nada é aplicado e é exibido erro indicando a linha.

**FR-02 (P0) Postos fixos.** Definir `P(d,t)=k` por faixa (ex.: "todos os dias 00–24h = 3 postos"), gerando a curva 168 h.
- Dado "3 postos, 24/7", quando confirmado, então todas as 168 células = 3.

**FR-03 (P0) Shrinkage diurno/noturno.** `S` diurno e noturno (0–60%), `N_req = ceil(FTE / (1−S))`; hora noturna = 22h–05h.
- Dado 3 postos e S_noturno=10%, quando calculado, então células 22h–04h mostram `ceil(3/0,9)=4` e as diurnas (S=0) mostram 3.
- Dado S ≥ 100%, então o campo é rejeitado.

> Observação: no modo postos fixos o shrinkage é tratado como **reserva de cobertura** (folguistas/turma excedente), não como pessoas extras simultâneas no posto. O Spec deve explicitar ambas as visões no heatmap ("postos" vs. "postos + reserva").

**FR-04 (P2) Produtividade/Erlang-C.** UPH, TMA, SL alvo.

### Módulo 2 — Motor de turmas

**FR-05 (P0) Configurar turmas e turnos.** Usuário escolhe modelo do catálogo; turnos padrão editáveis (M 06–14, T 14–22, N 22–06; D12 07–19, N12 19–07), headcount por turma = postos do turno.
- Dado modelo 6x2 e 3 postos, então são criadas 4 turmas (A–D) com 3 pessoas cada; headcount total = 12.

**FR-06 (P0) Gerador cíclico.** Para cada turma `i`, `estado(i, dia) = padrão[(dia_absoluto + offset_i) mod L]`, com `dia_absoluto` contado desde a data inicial do cenário (nunca dia do mês).
- Dado o modelo 6x2 padrão (§6.2), quando gerados 56 dias, então em cada dia há exatamente uma turma em M, uma em T, uma em N e uma em F.
- Dado um horizonte que cruza a virada de mês (ex.: 31→1), então o padrão não sofre quebra de paridade.

**FR-07 (P0) Verificação de cobertura.** Para cada hora do horizonte, `cobertura = Σ pessoas em turno ativo`; comparar com `N_req`.
- Dado 12x36 com 4 turmas e 2 postos, então 168/168 h cobertas, déficit = 0.
- Dado 4x2 com 4 turmas inteiras (inviável), então o sistema mostra as horas com déficit e sugere 5 turmas ou 9 meias-turmas.

**FR-08 (P1) Rotação customizada.** Usuário define padrão `L` e offsets; o sistema calcula `K_min = turnos_por_dia × L / dias_trabalhados` e alerta se `K` informado não for compatível.
- Dado padrão de 6 dias com 4 trabalhados e 3 turnos/dia, então `K_min = 4,5` e exibe "não há cobertura exata com turmas inteiras".

### Módulo 3 — Compliance (todas as regras com severidade `ERRO` ou `ALERTA`, fonte normativa e opção de override documentado quando CCT permitir)

**FR-09 (P0) Hora noturna reduzida (Art. 73 §1º CLT).** Cada hora de relógio entre 22h e 05h vale `60/52,5 = 8/7 ≈ 1,142857` h.
- Dado turno 22h–05h (7 h relógio), então horas noturnas fictas = 8,000000.
- Dado turno 14h–22h, então horas noturnas = 0.

**FR-10 (P0) Prorrogação noturna (Súmula 60, II TST).** Se a jornada cobriu integralmente 22h–05h e se estende após 05h, as horas prorrogadas recebem adicional e redução.
- Dado turno 22h–06h, então fictas = 7×8/7 + 1×8/7 = 9,142857 h; jornada computada excede 8 h em 1,142857 h e é sinalizada (ver Correção C6).
- Dado turno 00h–08h (não cobriu 22h–05h integralmente), então 05h–08h **não** é tratado como prorrogação (parâmetro configurável; ver Pergunta Q4).
- Dado 12x36 sob Art. 59-A, então prorrogação é considerada compensada por padrão (parâmetro alterável, ver Q3).

**FR-11 (P0) Interjornada 11 h (Art. 66 CLT).** Calculada com **timestamps absolutos** (`início_próximo − fim_anterior`), sem `mod 24`.
- Dado saída do turno N às 06h e entrada no turno T às 14h do mesmo dia, então descanso = 8 h → `ERRO_INTERJORNADA`.
- Dado saída do turno T às 22h e entrada no turno M às 06h do dia seguinte, então descanso = 8 h → `ERRO_INTERJORNADA`.
- Dado M (06–14) seguido de T (14–22) no dia seguinte, então descanso = 24 h → OK.

**FR-12 (P0) Descanso semanal 35 h e 7º dia (Art. 67 CLT, Lei 605/49, Súmula 110 TST, OJ 410 SDI-1).** Em toda janela de 7 dias deve haver ≥ 1 repouso de 24 h + 11 h = 35 h consecutivas; não pode haver 7 dias consecutivos de trabalho.
- Dado 6x2 padrão, então todos os ciclos têm folga ≥ 35 h (de fato 72 h) → OK.
- Dado padrão com 7 dias seguidos de trabalho, então `ERRO_SETIMO_DIA`.

**FR-13 (P0) Folga dominical periódica.** Parâmetro "1 domingo de folga a cada N semanas" (padrão N=7 para atividades autorizadas — Portaria MTP 671/2021; N=3 para comércio — Lei 10.101/2000 art. 6º p.ú.). Folga dominical = turma em F em pelo menos parte relevante do domingo (critério: ≥ 24 h que incluam o domingo 00h–24h — ver Q5).
- Dado 6x2 e N=7, então o relatório lista, por turma, a maior distância entre domingos de folga e marca `ALERTA_DOMINGO` se > N.

**FR-14 (P0) Turno ininterrupto de revezamento (Art. 7º, XIV CF; Súmula 423 TST).** Se a turma alterna turnos que cobrem diurno e noturno, jornada normal máxima = 6 h/36 h sem negociação coletiva; até 8 h com ACT/CCT.
- Dado 6x2 (M→T→N) com 8 h e checkbox "ACT/CCT autoriza 8 h" desmarcado, então `ALERTA_REVEZAMENTO_6H` e as horas > 6ª/dia são tratadas como HE no financeiro.
- Dado o mesmo com checkbox marcado, então sem alerta e sem HE pela 7ª/8ª hora.
- Dado 12x36 com turmas fixas dia/noite, então a regra não se aplica.

**FR-15 (P0) Regras 12x36 (Art. 59-A CLT).** Bloquear dobra e descanso < 36 h entre jornadas de 12 h.
- Dado turma D12 alocada também ao N12 do mesmo dia, então `BLOQUEIO_VIOLACAO_REGIME_12X36`.

**FR-16 (P0) Limite diário/semanal.** Alerta de jornada > 10 h (exceto 12x36) e média semanal > carga contratual (padrão 44 h; parametrizável).

### Módulo 4 — Financeiro

**FR-17 (P0) Parâmetros de custo.** Salário base mensal, divisor (padrão 220; 180 para 36 h; 200 para 40 h), % adicional noturno (padrão 20%, até 100%), % HE (padrão 50%; domingos/feriados 100%), % periculosidade/insalubridade, % encargos.

**FR-18 (P0) Extrato por turma/mês.**
- `valor_hora = salário / divisor`
- `adic_noturno = horas_fictas × valor_hora × %AN`
- `HE = horas_excedentes × valor_hora × (1+%HE)`
- `DSR_reflexo = (adic_noturno + HE) / dias_úteis × (domingos + feriados)`, onde `dias_úteis = dias do mês − domingos − feriados` (sábado é útil).
- Dado salário R$ 2.200, divisor 220, 40 h fictas/mês, AN 20%, então adic_noturno = R$ 80,00.
- Dado mês com 25 dias úteis e 5 domingos+feriados e adic_noturno R$ 80,00, então DSR reflexo = R$ 16,00.
- Dado valores com mais casas, então arredondamento a 2 casas só no total final (NFR-02).

**FR-19 (P0) Comparador de cenários.** Até 5 cenários lado a lado: headcount, horas/semana médias, salários, AN, HE, DSR reflexo, adicionais, encargos, total mensal e anual (×12, 13º/férias no P2), delta vs. baseline 6x1.
- Dado baseline 6x1 e 6x2, então a coluna delta mostra `cenário − baseline` em R$ e %.
- Dado cenário com violações `ERRO`, então ele aparece no comparador com selo "não conforme".

**FR-20 (P0) 4 turmas + HE vs. 5ª turma.** Atalho que gera os dois cenários com os mesmos postos e mostra breakeven (diferença anual; payback = custo de transição informado ÷ economia mensal).
- Dado contrato 40 h e 6x2 (42 h/sem), então HE = 2 h/sem/pessoa no cenário de 4 turmas e 0 no de 5 turmas (33,6 h).

### Módulo 5 — Visualização e export

**FR-21 (P0) Heatmap 7×24.** Cores: vermelho = déficit, verde = exato, azul = excedente; tooltip com demanda, cobertura e diferença; legenda textual (não depender só de cor).
- Dado cobertura < demanda em uma hora, então a célula é vermelha e mostra o déficit numérico.

**FR-22 (P0) Calendário cíclico.** Grade turma × dia do ciclo completo (`mmc(L,7)` dias, ex. 56 para 6x2), com domingos destacados.

**FR-23 (P0) Export CSV/XLSX.** XLSX com abas `Escala`, `Cobertura168h`, `Custos`, `Violacoes`, `Parametros`; CSV por aba (UTF-8 com BOM, separador `;`, decimal `,`).
- Dado cenário 6x2 de 56 dias, então a aba `Escala` tem 4 turmas × 56 dias com códigos M/T/N/F e a soma de horas confere com o resumo.

**FR-24 (P1) Salvar/duplicar cenários.**

## 6. Modelos de escala (especificação corrigida)

Fórmula geral de cobertura exata com turmas inteiras de mesmo tamanho:
`K = turnos_por_dia × L / dias_trabalhados_no_ciclo` (precisa ser inteiro). Horas médias/semana = `dias_trabalhados × h_turno × 7 / L`.

| Modelo | Turnos/dia | Padrão (L) | K | h/sem média | Observações |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **12x36** | 2 × 12 h | `[D, F]` / `[N, F]` (L=2) | 4 (2 D, 2 N) | 42 | Turmas fixas dia/noite; não é revezamento |
| **6x2** | 3 × 8 h | `[M,M,T,T,N,N,F,F]` (L=8), offset 2 dias | 4 | 42 | Rotação direta M→T→N; folga de 72 h após N; ciclo calendário 56 dias |
| **4x2** | 3 × 8 h | `[M,M,T,T,F,F]`… ver abaixo | 4,5 → **5** ou **9 meias** | 37,33 | Não fecha com 4 turmas |
| **5 turmas** | 3 × 8 h | `[M,M,T,T,N,N,F,F,F,F]` (L=10), offset 2 | 5 | 33,6 | Equivale a 21 dias trab./35; folga 96 h após N; ciclo calendário 70 dias |
| **6x1 baseline** | 3 × 8 h | `[X×6, F]` (L=7) | 3,5 → 4 + folguistas | 48 (8 h) | Ver C9 |

**4x2 — duas opções no MVP:**
- **(a) 5 turmas** com padrão de 4 trabalhados + 2 folgas (L=6), mesmo turno no bloco e rotação M→T→N a cada bloco; em média 3,33 turmas trabalham por dia → excedente de 11,1% usado como reserva de absenteísmo (FR-07 mostra azul; dias em que só 3 turmas trabalham são cobertura exata). O motor deve garantir ≥ 1 turma por turno em todos os dias e reportar o excedente.
- **(b) 9 meias-turmas** (cada uma com metade dos postos, exige postos pares) com padrão L=18 `[M,M,M,M,F,F,T,T,T,T,F,F,N,N,N,N,F,F]` e offset 2 dias: em qualquer dia, 2 meias-turmas em M, 2 em T, 2 em N, 3 em F → cobertura exata.

**Turno 8 h e intervalo intrajornada:** "turno de 8 h com 1 h de intervalo" é ambíguo no v2.0. No MVP o turno é **tempo à disposição de 8 h**; o intervalo é parâmetro: (i) *computado na jornada* (posto não pode ser abandonado; cobertura por rendição no posto) — padrão; ou (ii) *não computado* (horas efetivas = 7 h; exige revezador e 9 h de amplitude se for manter 8 h efetivas).

## 7. Requisitos Não Funcionais

- **NFR-01 Desempenho:** simulação (geração + cobertura + compliance + custos) de 1.000 colaboradores em horizonte de 8 semanas: p95 ≤ 2 s no backend; render do heatmap ≤ 200 ms.
- **NFR-02 Precisão:** cálculos em `Decimal` (Python) com ≥ 6 casas; arredondamento contábil (ROUND_HALF_UP) apenas nos totais exibidos/exportados. Frontend não recalcula valores monetários.
- **NFR-03 Determinismo e auditoria:** mesma entrada ⇒ mesma saída; cada resultado inclui versão do motor, parâmetros e lista de regras aplicadas com fonte normativa.
- **NFR-04 Testabilidade:** motor de cálculo puro (sem I/O) em módulo Python isolado, cobertura de testes ≥ 90%; suíte golden com os exemplos deste PRD.
- **NFR-05 API:** endpoints REST FastAPI com Pydantic v2, OpenAPI publicada; erros de validação 422 com campo e mensagem em PT-BR.
- **NFR-06 Acessibilidade:** WCAG 2.1 AA; heatmap com padrão/rotulagem além da cor.
- **NFR-07 Responsivo:** uso pleno ≥ 1280 px; leitura (heatmap/comparador) ≥ 768 px.
- **NFR-08 Dados:** sem dados pessoais no MVP (trabalha por turma). Cenários salvos sem PII; LGPD aplica-se quando houver alocação nominal (P2).
- **NFR-09 i18n:** PT-BR, moeda BRL, datas dd/mm/aaaa, fuso America/Sao_Paulo.

## 8. Premissas

1. A regra de negócio é CLT urbana; rural (21h–05h/20h–04h, 25%) fica para P2.
2. A eventual extinção da 6x1 é tratada como **cenário**, não como norma vigente; o 6x1 permanece como baseline.
3. Feriados nacionais são carregados automaticamente; estaduais/municipais são informados manualmente.
4. O usuário informa se há ACT/CCT para 8 h em revezamento e para 12x36; o produto não valida o instrumento.
5. Headcount por turma = postos do turno (sem cobertura de férias no MVP; shrinkage cobre ausências).
6. Mês financeiro = mês civil; horizonte padrão = ciclo calendário completo (`mmc(L,7)`).

## 9. Perguntas em aberto

| # | Pergunta | Dono | Bloqueante? |
| :--- | :--- | :--- | :--- |
| Q1 | Divisor padrão para revezamento 8 h com ACT (220? 180?) — impacta valor-hora | Jurídico/DP | Sim (FR-17) |
| Q2 | Intervalo intrajornada computado ou não por padrão? | Jurídico + Operações | Sim |
| Q3 | 12x36: aplicar Art. 59-A p.ú. (prorrogação compensada) por padrão ou Súmula 60 II? | Jurídico | Sim (FR-10) |
| Q4 | Prorrogação para turnos que não cobrem 22h–05h integralmente (OJ 388 / jurisprudência) — tratar como parâmetro? | Jurídico | Não |
| Q5 | Critério exato de "folga coincidente com domingo" para turno N que termina 06h de domingo | Jurídico | Não |
| Q6 | Encargos: % único é aceitável para o CFO no MVP? | Produto/Financeiro | Não |
| Q7 | Persistência: SQLite local ou Postgres já existente no backend? | Engenharia | Não |
| Q8 | Baseline 6x1: modelar com 8 h (48 h/sem + HE) ou 7h20 (44 h) com sobreposição de turnos? | Produto/Operações | Sim (C9) |
| Q9 | Shrinkage em postos fixos: reserva (folguistas) ou pessoas simultâneas? | Produto | Não |

## 10. Correções em relação ao PRD v2.0

| # | Item no v2.0 | Verificação | Correção |
| :--- | :--- | :--- | :--- |
| **C1** | 6x2 `[M,M,T,T,N,N,F,F]`, offset 2 dias, 4 turmas, "1 em M, 1 em T, 1 em N, 1 em F" | Conferido: `K = 3×8/6 = 4`. Com offsets 0,2,4,6 as posições ocupadas num dia são {p, p+2, p+4, p+6} mod 8 → sempre uma em cada par (MM, TT, NN, FF). **A cobertura está correta.** Horas = 6×8×7/8 = **42 h/sem**. Interjornada mínima na rotação = 24 h (OK). | Mantido, com ressalvas: (i) 42 h > 40 h/36 h ⇒ HE se o contrato não for 44 h; (ii) é turno ininterrupto de revezamento ⇒ exige ACT/CCT para 8 h (Súmula 423); (iii) a frase "sem necessidade de horas extras" vale só com carga de 44 h e ACT. |
| **C2** | "4 turmas × 42 h = 168 h" e "K=168/44 ≈ 3,81 ⇒ 4 turmas" | 4×42 = 168 ✔. Mas a fórmula `168/J_sem` só vale para **1 posto**; o certo é `K = turnos/dia × L / dias_trab` e headcount = K × postos. 168/40 = 4,2 e 168/36 = 4,67 ⇒ 5 turmas a **33,6 h** (não 40 h nem 36 h). | Fórmula geral (§6). Catálogo "5 turmas 36h/40h" passa a "33,6 h". |
| **C3** | Francês 5 turmas: 21×8 = 168 h em 35 dias = 33,6 h | Turnos-turma necessários: 3×35 = 105; ofertados: 5×21 = 105 ✔. 840 h-turma = 840 h demandadas ✔. O v2.0 não define o padrão diário. | Padrão explícito `[M,M,T,T,N,N,F,F,F,F]` (L=10, 6/10 = 21/35), offset 2 ⇒ uma turma por turno/dia, folga de 96 h. |
| **C4** | "5 turmas elimina passivo de revezamento (Art. 7º XIV)" | Falso: a turma ainda alterna M/T/N com 8 h/dia; o limite constitucional é de **6 h diárias**, não só 36 h semanais. | Continua exigindo ACT/CCT para 8 h; o benefício é média semanal < 36 h e eliminação de HE semanal. |
| **C5** | 4x2 `[M,T,N,N,F,F]` com "4 ou 5 turmas" | `K = 3×6/4 = 4,5` ⇒ 4 turmas deixam 25% dos turnos-dia descobertos; o padrão desigual (2 N, 1 M, 1 T) também não equilibra. | 5 turmas (11% de excedente) ou 9 meias-turmas com L=18 (§6). |
| **C6** | Turno N 22h–06h tratado como 8 h | Pela hora reduzida + Súmula 60 II, 22h–06h = 9,142857 h computadas ⇒ 1,14 h de HE por noite, ou o turno deve ser encurtado (ex.: 22h–05h). | FR-10 sinaliza e o financeiro cobra; o usuário pode ajustar horários. |
| **C7** | FR-10: "sair 06h e entrar 14h = 8 h" | Conta correta (8 h < 11 h). Porém a fórmula do Alg. 4 `Δ = (I − F) mod 24` falha para descansos ≥ 24 h (ex.: 35 h vira 11 h) e para o caso do mesmo dia. | Usar timestamps absolutos (FR-11). |
| **C8** | DSR reflexo citando Súmula 172 e dividindo por "dias úteis" | Súmula 172 trata de **HE habituais**; para adicional noturno a base é Lei 605/49 art. 7º e Súmula 60 I. A fórmula (÷ dias úteis × domingos+feriados) está correta, mas "dias úteis" não era definido. | `dias_úteis = dias do mês − domingos − feriados` (sábado útil); reflexo sobre AN **e** HE; citações ajustadas. |
| **C9** | 6x1 como baseline 24/7 sem especificação | 6x1 com 3×8 h ⇒ `K = 3,5` e 48 h/sem (> 44 h). Não há cobertura exata com turmas inteiras. | Baseline com 4 turmas + folguistas e HE de 4 h/sem, ou 7h20 — decisão Q8. |
| **C10** | 12x36: `d mod 2` com `d ∈ {1..30}` (dia do mês) | Em meses de 31 dias, dia 31 e dia 1 são ímpares ⇒ turma trabalha 2 dias seguidos (viola 36 h). | Usar dia absoluto desde a data inicial (FR-06). 12x36 = 42 h/sem; base Art. 59-A CLT (não só Súmula 444). |
| **C11** | "Turno de 8 h (1 h intervalo)" | Com 06–14 e 1 h de intervalo não computado, trabalha-se 7 h e as somas (42 h, 168 h) não fecham. | Intervalo parametrizado (§6, Q2). |
| **C12** | Art. 7º XIV citado como "jornada de 6 h a menos que CCT" | Correto em essência, mas a negociação permite até **8 h** (Súmula 423); acima disso não. Não se aplica a turmas fixas (12x36 dia/noite fixos). | FR-14. |
| **C13** | NFR-04 exportar AFDT/ACJEF | São arquivos de **ponto realizado** (Portaria 671/2021), não escala planejada. | Movido para Fase 3, reavaliar. MVP: CSV/XLSX. |
| **C14** | Interjornada + DSR = 35 h citado só como regra de "ciclo" | Deve valer em toda janela de 7 dias (Súmula 110; OJ 410: folga após o 7º dia é ilegal). | FR-12 inclui `ERRO_SETIMO_DIA`. |
| **C15** | "Ciclo completo de 8 semanas" no 6x2 | Correto: `mmc(8,7) = 56 dias`. | Generalizado: ciclo calendário = `mmc(L,7)`. |

## 11. Fases e dependências

- **Fase 1 (MVP):** FR-01–03, 05–07, 09–23. Dependências: decisões Q1, Q2, Q3, Q8 do Jurídico antes do Spec do motor financeiro; planilha de referência para testes golden.
- **Fase 2:** Erlang-C/UPH (FR-04), ILP, catálogo ampliado, alocação nominal, encargos detalhados, FR-08 completo.
- **Fase 3:** integrações WFM/ponto (TOTVS, Senior, ADP, SAP) e avaliação de AFDT/ACJEF.
