# Product Requirement Document (PRD)

| Metadado | Detalhe |
| :--- | :--- |
| **Produto** | Workforce Shift Simulator (Simulador de Escalas & Headcount) |
| **Versão** | 2.0 (Escalas Convencionais, Alternativas e Regime Contínuo 24/7) |
| **Status** | Pronto para Revisão / Discovery & Engenharia |
| **Público-Alvo** | Gestores de Operações, Logística, Hospitais/Saúde, Varejo, Indústria Contínua, TI/NOC, Contact Center e RH |
| **Data** | Novembro de 2026 |

---

## 1. Visão Geral e Contexto Estratégico

### 1.1 Contexto
Com a transição e extinção progressiva da escala 6x1 na legislação trabalhista brasileira, operações comerciais, de serviços e, fundamentalmente, **operações ininterruptas 24/7** (hospitais, centrais de monitoramento/NOC, logística portuária e centros de distribuição, indústria de processo contínuo, química/siderúrgica e saneamento) enfrentam um desafio sem precedentes de dimensionamento. 

Para operações contínuas que não fecham aos finais de semana nem no período noturno ($168\text{ horas/semana}$), a simples substituição do modelo 6x1 por jornadas padrão sem um arranjo estruturado de turmas/equipes gera déficits de postos de trabalho, passivos milionários por violação de intervalos intrajornada/interjornada, desrespeito à hora noturna reduzida e despesas descontroladas com horas extras ou contratações redundantes.

### 1.2 Problema
* **Incerteza no Headcount e Número de Turmas:** Gestores têm dificuldade em definir quantas equipes (4, 5 ou 6 turmas) são necessárias para cobrir 168 horas semanais em modelos legais alternativos (como 5x2, 4x3, 6x2, 4x2, 3x1 ou 12x36).
* **Gargalos Operacionais no Trabalho Noturno:** Subdimensionamento da jornada decorrente da não aplicação da conversão legal da hora noturna reduzida ($52\text{ minutos e } 30\text{ segundos}$ entre 22h e 05h) e da prorrogação de jornada noturna (Súmula 60 do TST).
* **Complexidade Trabalhista em Turnos Ininterruptos:** Risco de passivo trabalhista por violação do limite constitucional para turnos ininterruptos de revezamento (Art. 7º, XIV da CF/88), descansos semanais remunerados (DSR) e intervalos interjornada de 11h na rotação de turnos (manhã $\rightarrow$ tarde $\rightarrow$ noite).
* **Simulações Manuais Falhas:** Planilhas convencionais não sustentam a matriz tridimensional (Colaborador $\times$ Dia $\times$ Intervalo Horário) necessária para orquestrar ciclos contínuos de folgas móveis em 24/7.

### 1.3 Visão do Produto
Ser o simulador inteligente padrão de mercado que permite modelar tanto jornadas de expediente comercial quanto regimes ininterruptos de funcionamento contínuo 24/7, otimizando o headcount e o arranjo de turmas em minutos, com simulação em tempo real de custo de folha (adicional noturno, DSR, DSR sobre adicional noturno e horas extras) e conformidade jurídica total.

---

## 2. Personas e Casos de Uso

| Persona | Perfil | Dores Principais | Objetivo no Simulador |
| :--- | :--- | :--- | :--- |
| **Gerente de Planta / Operações 24/7** | Responsável por plantas industriais, CDs logísticos ou NOCs. | Não pode parar a linha nem deixar postos desguarnecidos em nenhum dos 168 horários da semana. | Simular o número exato de turmas necessárias (4, 5 ou 6 equipes) para cobrir postos 24/7 sem subcobertura. |
| **Gestor de Enfermagem / Operações Hospitalares** | Coordena equipes de assistência contínua (12x36 ou 6x2). | Escalas com furos no período noturno, absenteísmo imprevisto e fadiga de colaboradores por turnos invertidos. | Modelar escalas 12x36 com turmas complementares para cobertura de picos e substituição de folgas. |
| **Business Partner / Jurídico Trabalhista** | Foco em conformidade com a CLT, Súmulas do TST e CCTs sindicais. | Risco de horas extras não autorizadas, passivo de interjornada na troca de turno e violação de DSR dominical. | Validar regras de turnos ininterruptos de revezamento, descansos legais e folgas aos domingos. |
| **CFO / Diretor Financeiro** | Foco em margem operacional e custo da mão de obra. | Aumento desproporcional do custo com encargos noturnos, DSR reflexo e headcount inflacionado. | Comparar o custo total anualizado de operar em 6x1 vs. 6x2 vs. 5x2 contínuo vs. 4x3 vs. 12x36. |

---

## 3. Metas de Negócio e Métricas de Sucesso (KPIs)

### 3.1 Métricas de Negócio
* **Acurácia do Dimensionamento em Postos Contínuos:** $100\%$ de preenchimento dos postos essenciais 24/7 sem déficit de cobertura.
* **Otimização Orçamentária:** Redução de no mínimo $15\%$ em gastos desnecessários com horas extras e reflexos decorrentes de buracos de escalas em finais de semana ou madrugadas.
* **Mitigação de Passivo Trabalhista:** $0\%$ de quebra de regras mandatárias (interjornada de 11h, limites diários de jornada e periodicidade legal de DSR).

### 3.2 Métricas do Produto (Adoção & Operação)
* **Time-to-Scenario 24/7:** Configuração de um ciclo completo de turmas 24/7 (até 6 semanas de rotação) em $\le 10$ minutos.
* **Scenario Completion Rate:** $> 80\%$ das simulações 24/7 convertidas em cenários homologados e exportados para escalas de trabalho.
* **Desempenho de Cálculo:** Geração da matriz de rotação de até 1.000 colaboradores em regime 24/7 em $\le 2$ segundos.

---

## 4. Escopo do Produto e Matriz de Escalas Suportadas

O simulador suporta o espectro completo de arranjos de trabalho, segregados em **Escalas Convencionais com Janela Fixa** e **Escalas de Revezamento Contínuo 24/7**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CATÁLOGO DE ESCALAS                             │
├──────────────────────────────────┬─────────────────────────────────────┤
│   A. Modelos Não Contínuos       │      B. Modelos Contínuos 24/7       │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • 5x2 Comercial (8h48 ou 8h)     │ • 12x36 (Dia Sim / Dia Não - 4 T.)  │
│ • 4x3 Alternativa (9h ou 10h)    │ • 6x2 Revezamento 8h (4 Turmas)     │
│ • 5x1 Rotativo Diurno (7h12)     │ • 4x2 Revezamento 8h / 8h48         │
│ • 6x1 Histórico (Baseline CLT)   │ • 3x1 / 3x2 Turno Rápido            │
│ • Jornadas Parciais / Fim de     │ • Sistema Francês / Petroquímico    │
│   Semana (20h / 30h)             │   (5 ou 6 Turmas - 36h / 40h sem.)  │
└──────────────────────────────────┴─────────────────────────────────────┘
```

| Modelo de Escala | Duração do Turno | Razão Trabalho/Folga | Aplicação Principal | Número Típico de Turmas em 24/7 |
| :--- | :--- | :--- | :--- | :--- |
| **12x36** | 12h (1h intervalo) | 1 trabalhado / 1 folga (cíclico) | Hospitais, Segurança, Centros de Monitoramento, Portaria | 4 turmas (2 diurnas, 2 noturnas) |
| **6x2 Revezamento** | 8h (1h intervalo) | 6 trabalhados / 2 folgas | Indústria manufatureira, centros de distribuição logística | 4 turmas rotativas |
| **4x2 Revezamento** | 8h a 8h48 (1h intervalo) | 4 trabalhados / 2 folgas | Mineração, papel e celulose, centrais de energia | 4 ou 5 turmas |
| **3x1 ou 3x2** | 8h | 3 trabalhados / 1 ou 2 folgas | Operações intensivas com alta demanda de recuperação | 4 a 5 turmas |
| **5 Turmas (36h/40h)** | 8h rotativas | Padrão cíclico (ex.: 6T-4F / 4T-2F) | Siderurgia, química, refinarias, concessionárias de serviços | 5 turmas (gera folgas longas de 72h-96h) |
| **5x2 e 4x3 Contínuos** | 8h, 8h48 ou 10h | 5T/2F ou 4T/3F com postos móveis | Centrais de atendimento 24/7, suporte de cloud/TI | 4 a 6 turmas com folgas intercaladas |

---

## 5. Requisitos Funcionais (FR)

### 5.1 Módulo 1: Modelagem de Demanda e Dimensionamento 24/7
* **FR-01 (Entrada de Demanda 168 Horas):** O sistema deve permitir o upload ou edição manual da curva horária para todas as 168 horas da semana ($7 \text{ dias} \times 24 \text{ horas}$).
* **FR-02 (Modo Postos Fixos Ininterruptos):** Para operações onde a demanda não varia por transações mas sim por presença mandatória (ex.: portaria, operador de caldeira, enfermeiro UTI, operador NOC), permitir fixar o número de postos necessários por intervalo $P(d, t) = k$.
* **FR-03 (Conversão de Produtividade & Erlang-C 24/7):** Suporte ao dimensionamento por unidades/hora ($UPH$) ou tempo médio de atendimento ($TMA$) com tratamento específico para a madrugada.
* **FR-04 (Fator de Shrinkage 24/7 Diferenciado):** Permitir calibrar percentuais de perda distintos para turnos noturnos e diurnos (o absenteísmo noturno tipicamente supera o diurno).

### 5.2 Módulo 2: Motor de Alocação de Turmas e Rotação Contínua
* **FR-05 (Configurador de Turmas/Equipes):** O usuário pode parametrizar a operação em número de turmas (ex.: Turmas A, B, C, D em 4 turmas; Turmas A, B, C, D, E em 5 turmas).
* **FR-06 (Gerador de Rotação Cíclica):** O simulador deve permitir rotação contínua (ex.: Turno 1 Manhã $\rightarrow$ Turno 2 Tarde $\rightarrow$ Turno 3 Noite $\rightarrow$ Folga) ou turnos fixos com turmas fixas de noite.
* **FR-07 (Tratamento de Jornadas Especiais):**
  * **12x36:** Escala estruturada em dias pares/ímpares, intercalando turmas Diurna A, Diurna B, Noturna A e Noturna B.
  * **6x2 / 4x2:** Cálculo exato da defasagem de dias para cobrir sábados, domingos e feriados sem gerar "pontas soltas" desguarnecidas.
  * **5 Turmas / 6 Turmas:** Geração de ciclos plurianuais/plurisemanais com distribuição equilibrada de horas para fechar em médias contratuais de 36h ou 40h semanais.

### 5.3 Módulo 3: Motor de Compliance Trabalhista e Regras Específicas 24/7
* **FR-08 (Cômputo da Hora Noturna Reduzida):** O sistema deve computar a hora ficta noturna entre 22:00 e 05:00, onde cada $52\text{ minutos e } 30\text{ segundos}$ de relógio equivalem a $60\text{ minutos}$ de trabalho (multiplicador de jornada: $\frac{60}{52.5} \approx 1.142857$).
* **FR-09 (Prorrogação da Jornada Noturna - Súmula 60 TST):** Cumprida integralmente a jornada no período noturno e prorrogada esta no horário diurno (após as 05h), o sistema deve aplicar o adicional noturno e a redução horária também às horas prorrogadas.
* **FR-10 (Intervalo Interjornada na Troca de Turnos):** O sistema deve impedir rotações que violem as 11 horas consecutivas de descanso entre o término de um turno e o início do próximo (ex.: sair do turno da noite às 06h da manhã e iniciar no mesmo dia no turno da tarde às 14h viola a regra: intervalo de apenas 8h).
* **FR-11 (Regra de Turnos Ininterruptos de Revezamento - Art. 7º, XIV CF/88):** Para empresas que adotam revezamento de horários (o mesmo trabalhador alterna dia/noite), alertar a obrigatoriedade de jornada de 6h, a menos que haja previsão em Acordo ou Convenção Coletiva de Trabalho (CCT/ACT) autorizando 8h ou mais.
* **FR-12 (DSR Dominical em Regime Contínuo):** 
  * Validar periodicidade obrigatória de folga coincidente com o domingo conforme o setor (Lei 10.101/2000 para comércio, Lei 605/1949 e Portaria MTE para indústria e serviços contínuos).
  * Validar regra de 24h consecutivas de DSR somadas às 11h de interjornada (total de 35h de repouso contínuo entre ciclos de trabalho).

### 5.4 Módulo 4: Análise Financeira Detalhada 24/7
* **FR-13 (Extrato de Custos Noturnos):** Exibição discriminada de:
  * Adicional Noturno contratual (mínimo legal de $20\%$ para urbano, ou percentual sindical superior);
  * DSR sobre o Adicional Noturno ($DSR_{adic} = \frac{ValorAdicNoturno}{DiasUteis} \times DomingosEFeriados$);
  * Custo de Adicional de Periculosidade / Insalubridade sobre a base de cálculo.
* **FR-14 (Simulação de Cenários de Substituição):** Comparador entre manter 4 turmas com horas extras vs. contratar uma 5ª turma para eliminar horas extras e passivo de fadiga.

---

## 6. Especificação Detalhada dos Algoritmos

Esta seção detalha os modelos matemáticos e algorítmicos expandidos para suportar demandas dinâmicas e postos fixos contínuos $24 \times 7$.

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Dimensionamento da Demanda Líquida (168h + Hora Noturna Reduzida)   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Otimização de Cobertura de Postos e Turnos Contínuos (ILP / Turmas) │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Gerador Cíclico de Escalas Contínuas (12x36, 6x2, 4x2, 5 Turmas)   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Motor de Compliance 24/7 e Demonstrativo Financeiro Completo        │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Algoritmo 1: Dimensionamento Horário com Compensação Noturna ($N_{req}(d, t)$)

Para cada dia $d \in \{1, \dots, 7\}$ e cada intervalo de tempo $t \in \{1, \dots, 24\}$ (ou intervalos de 30m):

#### 1. Fator de Conversão de Hora Noturna Ficta ($\phi(t)$):
Definido como:
$$\phi(t) = \begin{cases} 
\frac{60}{52.5} \approx 1.142857 & \text{se } t \in [22\text{h00}, 05\text{h00}) \text{ ou prorrogação após 05h00} \\
1.0 & \text{caso contrário}
\end{cases}$$

#### 2. Cálculo da Demanda em Postos / FTEs Brutos:
* **Modo Postos Fixos (Vigilância, UTI, Portaria, Supervisão de Sala de Controle):**
  $$FTE_{bruto}(d, t) = P_{fixo}(d, t)$$
* **Modo Fluxo de Demanda / Produtividade (Operações Industriais / Expedição / Suporte):**
  $$FTE_{bruto}(d, t) = \frac{V(d, t)}{UPH(t) \cdot \Delta t}$$
* **Modo Fila Contínua (Centrais 24/7 via Erlang-C):**
  Calcula $m$ tal que $SL(m, A(d, t)) \ge SL_{alvo}$ e $P_w(m, A(d, t)) \le P_{target}$.

#### 3. Ajuste por Shrinkage Específico de Turno:
Para acomodar maiores taxas de ausência em períodos críticos (noites/finais de semana):
$$S(d, t) = 1 - \big(1 - S_{int}(t)\big) \cdot \big(1 - S_{ext}(d, t)\big)$$
$$N_{req}(d, t) = \left\lceil \frac{FTE_{bruto}(d, t)}{1 - S(d, t)} \right\rceil$$

---

### 6.2 Algoritmo 2: Otimização de Cobertura e Alocação de Turnos Contínuos (ILP)

O objetivo é preencher todas as 168 horas da semana minimizando o custo total e a variabilidade de efetivo, garantindo que nenhum intervalo $t$ de nenhum dia $d$ fique desprovido de pessoal.

#### Parâmetros:
* $\mathcal{T}$: Conjunto de turnos padronizados.
  * Turnos de 8h: $T_1$ (06h–14h), $T_2$ (14h–22h), $T_3$ (22h–06h).
  * Turnos de 12h: $T_{D12}$ (07h–19h), $T_{N12}$ (19h–07h).
  * Turnos intermediários/reforço: $T_{int}$ (ex.: 10h–19h para absorver picos).
* $a_{j, t} \in \{0, 1\}$: Matriz de disponibilidade produtiva do turno $j$ no intervalo $t$ (descontando o intervalo intrajornada quando coberto por operador volante/revezador).
* $c_j$: Custo horário do turno $j$, parametrizado por:
  $$c_j = SalarioBase_j + \sum_{t \in j} AdicNoturno(t) + ReflexoDSR(t)$$

#### Formulação Matemática:
$$\min \sum_{d=1}^7 \sum_{j \in \mathcal{T}} c_j \cdot x_j(d) + \alpha \sum_{d=1}^7 \sum_{t=1}^{24} u(d, t) + \beta \sum_{d=1}^7 \sum_{t=1}^{24} o(d, t)$$

**Sujeito a:**
1. **Garantia de Cobertura Obrigatória (Sem Desabastecimento em 24/7):**
   $$\sum_{j \in \mathcal{T}} a_{j, t} \cdot x_j(d) + u(d, t) - o(d, t) = N_{req}(d, t), \quad \forall d \in \{1..7\}, \forall t \in \{1..24\}$$
   Em regime 24/7 essencial, restringe-se $u(d, t) = 0$ (impossibilidade estrita de déficit em postos críticos).
2. **Equilíbrio de Alocação de Postos Contínuos:**
   Para garantir estabilidade da planta sem oscilações bruscas entre postos:
   $$|x_{T_1}(d) - x_{T_2}(d)| \le \Delta_{max}, \quad \forall d$$

---

### 6.3 Algoritmo 3: Síntese de Escalas Contínuas e Matriz Cíclica de Turmas

Em operações 24/7, os indivíduos não são alocados individualmente de forma isolada; eles são agrupados em **Turmas (Equipes)** que percorrem um padrão cíclico de trabalho e folga.

#### 1. Cálculo do Número Teórico de Turmas Necessárias:
A semana possui $168\text{ horas}$. O número mínimo de turmas $K$ para cobrir a operação sem horas extras excessivas depende da jornada média semanal contratual $J_{sem}$ (ex.: 44h, 40h, 36h ou 30h):
$$K_{min} = \frac{168\text{ horas}}{J_{sem}}$$
* Para $J_{sem} = 44\text{h}$: $K = \frac{168}{44} \approx 3.81 \implies \mathbf{4 \text{ turmas}}$ (gera saldo semanal de $4 \times 42\text{h} = 168\text{h}$, demandando ajustes de compensação).
* Para $J_{sem} = 40\text{h}$: $K = \frac{168}{40} = 4.2 \implies \mathbf{5 \text{ turmas}}$ (4 turmas não são suficientes sem gerar horas extras habituais).
* Para $J_{sem} = 36\text{h}$ (turnos ininterruptos de revezamento sem acordo para 8h): $K = \frac{168}{36} \approx 4.67 \implies \mathbf{5 \text{ turmas}}$.

---

#### 2. Matrizes de Escalas Específicas 24/7:

##### A. Modelo 12x36 (4 Turmas)
Composto por 4 turmas:
* Turma A: Diurno Impar (07h às 19h)
* Turma B: Diurno Par (07h às 19h)
* Turma C: Noturno Impar (19h às 07h)
* Turma D: Noturno Par (19h às 07h)

A matriz para o dia do calendário $d \in \{1, \dots, 30\}$ é dada por:
$$M_{Turma}(d) = \begin{cases}
\text{Trabalha 12h} & \text{se } (d \pmod 2 == 1 \text{ e Turma } \in \{A, C\}) \text{ ou } (d \pmod 2 == 0 \text{ e Turma } \in \{B, D\}) \\
\text{Folga 36h} & \text{caso contrário}
\end{cases}$$

##### B. Modelo 6x2 Revezamento de 8 Horas (4 Turmas)
Ciclo de rotação de 8 dias ($6\text{ dias trabalhados} + 2\text{ dias de folga}$). A cada ciclo completo de 8 semanas (56 dias), a escala percorre todos os turnos e dias da semana:
* Turnos: $M$ (Manhã: 06h-14h), $T$ (Tarde: 14h-22h), $N$ (Noite: 22h-06h), $F$ (Folga).
* Padrão típico por turma: $[M, M, T, T, N, N, F, F]$ repetido sucessivamente.
* Defasagem entre turmas: Cada turma inicia o ciclo com 2 dias de defasagem em relação à anterior:
  $$Offset(Turma_i) = 2 \cdot (i - 1) \text{ dias}, \quad i \in \{1, 2, 3, 4\}$$
* Garantia de Cobertura: Em qualquer dia $d$, exatamente uma turma estará em $M$, uma em $T$, uma em $N$ e uma em $F$, assegurando 100% de cobertura 24/7 contínua sem necessidade de horas extras.

##### C. Modelo 4x2 Revezamento (4 ou 5 Turmas)
Ciclo de 6 dias ($4\text{ dias trabalhados} + 2\text{ dias de folga}$). Turnos de 8h (para 4 turmas com compensação de banco de horas) ou 8h48:
* Padrão cíclico: $[T_1, T_1, T_2, T_2, F, F]$ ou com rotação de turnos $[M, T, N, N, F, F]$.

##### D. Modelo Francês / Petroquímico de 5 Turmas (Jornada Média de 33.6h a 36h)
Projetado para eliminar passivo de turnos ininterruptos de revezamento (Art. 7º, XIV da CF) sem exceder limites legais:
* Ciclo de 35 dias (5 semanas):
  * Cada turma cumpre 21 dias de trabalho de 8h e 14 dias de folga.
  * Horas trabalhadas no ciclo: $21 \times 8\text{h} = 168\text{h}$ em 5 semanas.
  * Média semanal real: $\frac{168\text{h}}{5} = 33.6\text{ horas/semana}$.
  * As folgas são agrupadas de modo a gerar períodos de recuperação prolongada (folgas de 72h a 96h consecutivas), compensando o desgaste do trabalho noturno.

---

### 6.4 Algoritmo 4: Motor de Compliance Trabalhista 24/7 e Impacto Financeiro

#### 1. Verificação Paramétrica de Regras 24/7:
Para cada colaborador/turma ao longo de um horizonte de simulação de $W$ semanas:

* **Validação de Interjornada na Transição de Turnos:**
  Seja $F(k, d)$ o horário de término no dia $d$ e $I(k, d+1)$ o horário de início no dia $d+1$:
  $$\Delta t_{descanso} = (I(k, d+1) - F(k, d)) \pmod{24}$$
  * Se $\Delta t_{descanso} < 11\text{h}$, emite `ERRO_CRITICO_QUEBRA_INTERJORNADA`.
  * *Exemplo clássico monitorado:* Transição de Turno da Tarde (término 22h) para Turno da Manhã seguinte (início 06h) $\implies \Delta t_{descanso} = 8\text{h} < 11\text{h}$ (Bloqueio automático).

* **Validação de DSR Contínuo (35 Horas de Repouso):**
  Ao final do bloco trabalhado, a folga semanal deve ser de no mínimo 24h consecutivas acrescidas das 11h de interjornada:
  $$\Delta t_{folga\_ciclo} \ge 35\text{ horas}$$

* **Conformidade de DSR aos Domingos em 24/7:**
  Verifica se no horizonte de rotação $H_{rot}$, cada turma usufrui de folga coincidente com o domingo dentro da frequência legal exigida pela categoria:
  $$\text{Intervalo Máximo entre Domingos de Folga} \le W_{limite}$$

---

#### 2. Modelo Matemático Financeiro Detalhado 24/7:

O custo total consolidado da escala é expresso por:
$$CustoTotal_{24/7} = CustoFixo + CustoAdicNoturno + CustoDSR_{not} + CustoHE + EncargosSociais$$

Onde:

1. **Adicional Noturno ($Adic_{not}$):**
   Para cada hora $t$ trabalhada no intervalo [22h, 05h] ou em prorrogação:
   $$HorasNoturnasFictas = HorasRelogio \times \frac{60}{52.5} = HorasRelogio \times 1.142857$$
   $$ValorAdicNoturno = \sum_{k=1}^H \left[ HorasNoturnasFictas(k) \times \frac{SalarioBase(k)}{CargaMensal} \times \%AdicNot \right]$$
   (onde $\%AdicNot \ge 20\%$, configurável por CCT até $40\%$).

2. **DSR Reflexo sobre Adicional Noturno ($DSR_{ref}$):**
   Conforme Súmula 172 do TST:
   $$DSR_{ref} = ValorAdicNoturno \times \left( \frac{\text{Número de Domingos e Feriados do Mês}}{\text{Número de Dias Úteis do Mês}} \right)$$

3. **Custo de Horas Extras e Dobras de Escala ($CustoHE$):**
   Em modelos 24/7 com 4 turmas em jornada de 8h ($42\text{h}$ semanais em média) comparado a contratos de 40h ou 36h:
   $$HE_{excedente} = \max(0, HorasSemanaisReais - CargaContratual)$$
   $$CustoHE = HE_{excedente} \times \frac{SalarioBase}{CargaMensal} \times (1 + \%AdicHE) \times (1 + Encargos)$$

4. **Comparativo Multicritério Automático:**
   O motor calcula simultaneamente o **Delta Financeiro e Operacional** entre:
   * **Baseline:** Modelo Histórico 6x1 Diurno/Noturno.
   * **Cenário A:** 12x36 (4 Turmas).
   * **Cenário B:** 6x2 Revezamento (4 Turmas - 42h/sem).
   * **Cenário C:** 5 Turmas (33.6h/sem - Eliminação total de HE e passivo).
   * **Cenário D:** 4x3 Alternativo com turnos escalonados.

---

## 7. Requisitos Não Funcionais (NFR)

* **NFR-01 (Desempenho de Simulação 24/7):** O motor de cálculo deve sintetizar e validar uma escala ininterrupta de 168h semanais para até 1.000 colaboradores em até $2.0\text{ segundos}$.
* **NFR-02 (Precisão Decimal & Auditoria):** Todos os cálculos de hora noturna reduzida e reflexos devem manter precisão de 6 casas decimais antes do arredondamento contábil final.
* **NFR-03 (Visualização de Heatmap 24/7):** O dashboard visual deve fornecer uma matriz de calor completa de $7 \text{ dias} \times 24 \text{ horas}$, identificando visualmente:
  * Verde: Cobertura exata;
  * Azul: Superdimensionamento / Ociosidade;
  * Vermelho: Posto vago / Subcobertura crítica.
* **NFR-04 (Compatibilidade de Exportação para Softwares de Ponto/WFM):** O sistema deve exportar o mapa de alocação de turnos no formato padrão para integração com sistemas de ponto eletrônico (TOTVS Protheus/RM, Senior Ronda, ADP, SAP SuccessFactors e padrão AFDT/ACJEF do MTE).

---

## 8. Arquitetura da Solução e Fluxo de Dados 24/7

```
[Parâmetros Operacionais: Postos Fixos / Curva 168h]
                      │
                      ▼
[Algoritmo 1: Dimensionamento 168h + Hora Noturna Ficta (60/52.5)]
                      │
                      ▼
[Seleção do Modelo 24/7: 12x36, 6x2, 4x2, 5 Turmas ou Personalizado]
                      │
                      ▼
[Algoritmo 2: Solver ILP de Alocação de Turmas e Postos]
                      │
                      ▼
[Algoritmo 3: Síntese Cíclica de Rotação de Equipes e Folgas 35h]
                      │
                      ▼
[Algoritmo 4: Motor de Compliance CLT 24/7 & Custos Noturnos/DSR]
                      │
                      ▼
[Dashboard Executivo: Heatmap 168h + Comparador de Cenários + Exportador WFM]
```

---

## 9. Critérios de Aceite (Histórias de Usuário Específicas 24/7)

### História 1: Dimensionamento de Planta Industrial em Escala 6x2 de 4 Turmas
* **Como** Diretor Industrial de uma fábrica com processo produtivo contínuo,
* **Quero** simular a transição da antiga escala 6x1 para uma escala de revezamento 6x2 com 4 turmas em turnos de 8 horas,
* **Para que** eu veja a distribuição exata das folgas móveis, garanta que os postos de operação nunca fiquem vazios e entenda o custo com o reflexo de adicional noturno e DSR.
* **Critério de Aceite:**
  1. O Algoritmo 3 deve gerar a escala para as 4 turmas com cobertura constante de $100\%$ em todas as 168 horas da semana.
  2. O Algoritmo 4 deve calcular o número exato de horas noturnas fictas ($60/52.5$), o valor financeiro do adicional noturno e o DSR reflexo.
  3. A interface deve exibir a escala em formato de calendário cíclico de 8 semanas.

### História 2: Bloqueio de Escala 12x36 por Quebra de Interjornada ou Dobra Ilegal
* **Como** Coordenador de RH Hospitalar,
* **Quero** ser alertado se um colaborador de regime 12x36 for alocado para dobrar turno ou se a folga de 36h consecutivas for desrespeitada,
* **Para que** o hospital não sofra sanções fiscais do Ministério do Trabalho nem incorra em passivo na Justiça do Trabalho.
* **Critério de Aceite:**
  1. Caso o usuário tente alocar um colaborador da Turma Diurna A para cobrir a Turma Noturna A no mesmo dia ou na sequência sem cumprir as 36h de repouso, o Algoritmo 4 deve emitir o status `BLOQUEIO_VIOLACAO_REGIME_12X36`.
  2. O sistema deve sugerir automaticamente a convocação de um colaborador folguista/banco de horas habilitado com mais de 36h de descanso acumuladas.

### História 3: Análise de Viabilidade Financeira de 5ª Turma
* **Como** Gerente de Controladoria e Planejamento,
* **Quero** comparar um cenário de 4 turmas (com geração de 2 horas extras semanais médias por operador) contra um cenário de 5 turmas (com jornada média de 33.6h semanais e zero horas extras),
* **Para que** possamos decidir o ponto de equilíbrio financeiro (breakeven) entre custo de novas contratações versus economia de horas extras e passivo de absenteísmo.
* **Critério de Aceite:**
  1. O comparador do Módulo 4 deve apresentar lado a lado: Headcount total, Custo fixo de salários, Custo variável de horas extras, Encargos sociais consolidados e Total Anual.
  2. Exibir o delta financeiro líquido e o gráfico comparativo de pay-back da transição.

---

## 10. Matriz de Riscos e Mitigações

| Risco Identificado | Severidade | Estratégia de Mitigação |
| :--- | :--- | :--- |
| **Passivo por Turnos Ininterruptos de Revezamento:** Colaboradores alternando turnos de 8h sem acordo/convenção coletiva válida (risco de condenação a pagar horas extras excedentes à 6ª diária, Art. 7º, XIV da CF). | Crítica | O sistema emite flag `ALERTA_CF_TURNO_REVEZAMENTO_6H`, exigindo que o gestor marque a opção afirmativa "Possui ACT/CCT autorizando jornada de 8h em revezamento" para prosseguir. |
| **Cálculo Erôneo da Prorrogação Noturna:** Não inclusão de horas após as 05h00 na base do adicional noturno quando o turno noturno se estende pela manhã (Súmula 60 TST). | Alta | O Algoritmo 4 inclui a rotina automática que audita turnos que iniciam antes das 22h ou no período noturno e se estendem além das 05h, mantendo o cálculo do adicional noturno e da hora ficta sobre a extensão diurna. |
| **Resistência das Equipes na Mudança de Escala:** Mudança abrupta de 6x1 para 6x2 ou 12x36 gerando insatisfação e turnover devido à perda de previsibilidade de folgas aos finais de semana. | Média | O simulador inclui módulo de exportação de "Calendário Pessoal do Colaborador", permitindo gerar visões anuais antecipadas de todas as folgas e finais de semana livres para comunicação transparente. |