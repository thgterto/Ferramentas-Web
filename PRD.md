# Product Requirements Document (PRD) - Ata Digital API & Excel Integration

## 1. Contexto Técnico
O `ata.html` é um dashboard operacional ("single-page application") utilizado para registrar handovers de turno e checklists de qualidade ("Balanças", "Laboratório PCTS", "Laboratório Industrial"). Atualmente, a persistência é local ou manual via arquivos JSON. O objetivo é criar uma API Backend para centralizar o armazenamento (CRUD) e integrar funcionalidades de geração/leitura de Excel ("Excel Script").

## 2. Problema a Resolver
*   **Falta de Persistência Centralizada:** Dados são perdidos ao recarregar ou dependem de arquivos locais.
*   **Necessidade de Relatórios:** Gestores precisam dos dados em formato Excel para análise, não apenas na tela.
*   **Integração:** O frontend (`ata.html`) precisa de endpoints para Salvar/Carregar os dados.

## 3. Escopo da Implementação
Desenvolver um conjunto de endpoints RESTful (`/atas`) para gerenciar o ciclo de vida dos registros da Ata Digital.

### Funcionalidades (CRUD)
1.  **Create (POST /atas):** Receber o estado completo da Ata (Data, Turno, Unidade, Respostas, Planos de Ação) e salvar.
2.  **Read (GET /atas):** Listar todas as Atas salvas (resumo).
3.  **Read One (GET /atas/{id}):** Obter detalhes de uma Ata específica.
4.  **Update (PUT /atas/{id}):** Atualizar os dados de uma Ata.
5.  **Delete (DELETE /atas/{id}):** Remover uma Ata.

### Funcionalidades "Excel Script" (Processamento)
1.  **Export to Excel (GET /atas/{id}/export):** Gerar um arquivo `.xlsx` formatado contendo:
    *   Capa com metadados (Responsável, Unidade, KPI).
    *   Abas separadas para cada checklist (Balanças, PCTS, Industrial) com as respostas e desvios.
2.  **Import from Excel (POST /atas/import):** (Opcional/Futuro) Ler um Excel padrão e preencher a Ata. *Foco inicial na Exportação conforme necessidade de relatório.*

## 4. Arquivos Afetados / A Criar
*   `backend/app/api/v1/endpoints/atas.py`: Router para endpoints da Ata.
*   `backend/app/schemas/ata.py`: Modelos Pydantic (Request/Response) refletindo a estrutura do `ata.html`.
*   `backend/app/services/ata_excel_service.py`: Lógica de geração do relatório Excel (`openpyxl` ou `pandas`).
*   `backend/app/models/ata.py`: (Simulado em memória `ATAS_DB`).
*   `backend/app/main.py`: Registro das novas rotas.

## 5. Estrutura de Dados (Espelho do Frontend)
*   **Metadata:** `date`, `shift`, `unit`, `responsible`, `kpi_score`.
*   **Answers:** Dicionário aninhado `{ category_idx: { question_idx: "SIM"|"NÃO"|"NA" } }`.
*   **ActionPlans:** Dicionário `{ category_idx: { question_idx: { type, s, b, a, r } } }`.

## 6. Referências Técnicas
*   **FastAPI:** Backend framework.
*   **Pydantic:** Validação de dados complexos (JSON aninhado).
*   **OpenPyXL / Pandas:** Geração de arquivos `.xlsx`.
*   **Memory Storage:** Dicionário global para persistência MVP.

## 7. Restrições
*   Manter compatibilidade com a estrutura de dados existente no `ata.html` (arrays `auditData`, índices numéricos).
*   A solução deve ser "Online" (REST API).
*   Seguir o padrão SDD (Spec-Driven Development).
