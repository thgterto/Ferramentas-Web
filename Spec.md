# Specification (Spec) - Ata Digital API

## 1. Arquitetura e Estrutura de Arquivos

### Novos Arquivos
*   `backend/app/api/v1/endpoints/atas.py`: Router para endpoints de Atas.
*   `backend/app/schemas/ata.py`: Modelos Pydantic para validação (Request/Response).
*   `backend/app/services/ata_excel_service.py`: Lógica de exportação Excel.

### Arquivos Modificados
*   `backend/app/main.py`: Incluir router `api_router`.
*   `backend/requirements.txt`: Adicionar `openpyxl`.

## 2. Modelagem de Dados (Schemas)

### `backend/app/schemas/ata.py`

```python
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import date
import uuid

# Action Plan per Question
class ActionPlan(BaseModel):
    type: str = "" # "Manutenção", "5S", etc.
    s: str = ""
    b: str = ""
    a: str = ""
    r: str = ""

# Nested Dicts: { category_idx: { question_idx: VALUE } }
# Using Dict[int, Dict[int, ...]] for compatibility with JS indices
class AtaBase(BaseModel):
    date: date
    shift: str
    unit: str
    responsible: Optional[str] = None
    kpi_score: int
    answers: Dict[int, Dict[int, Optional[str]]] # "SIM", "NÃO", "NA", null
    action_plans: Dict[int, Dict[int, ActionPlan]]

class AtaCreate(AtaBase):
    pass

class Ata(AtaBase):
    id: uuid.UUID
    created_at: date

    class Config:
        from_attributes = True
```

## 3. Serviços (Logic)

### `backend/app/services/ata_excel_service.py`

#### Classe `AtaExcelService`
*   **Método `generate_report(ata: Ata) -> BytesIO`**
    1.  Criar Workbook `openpyxl`.
    2.  **Aba "Capa":**
        -   Preencher células com metadados (Data, Turno, Unidade, KPI).
        -   Formatar com estilos básicos (negrito, bordas).
    3.  **Abas de Checklist ("Balanças", "PCTS", "Industrial"):**
        -   Iterar sobre `auditData` (hardcoded no serviço para espelhar frontend ou passado como config).
        -   Listar perguntas.
        -   Preencher respostas ("SIM", "NÃO", "NA").
        -   Se houver anomalia, preencher colunas SBAR (Situação, Background, Assessment, Recommendation).
    4.  Retornar stream do arquivo.

## 4. API Endpoints

### `backend/app/api/v1/endpoints/atas.py`

#### Armazenamento (Simulado em Memória para MVP)
-   Variável global `ATAS_DB: Dict[uuid.UUID, Ata]`.

#### Endpoints

1.  **POST `/atas`**
    -   **Input:** `body: AtaCreate`.
    -   **Processo:** Gerar ID, salvar no `ATAS_DB`.
    -   **Output:** `Ata` (201 Created).

2.  **GET `/atas`**
    -   **Processo:** Listar valores de `ATAS_DB`.
    -   **Output:** `List[Ata]`.

3.  **GET `/atas/{id}`**
    -   **Processo:** Buscar ID. 404 se não achar.
    -   **Output:** `Ata`.

4.  **PUT `/atas/{id}`**
    -   **Input:** `body: AtaCreate`.
    -   **Processo:** Atualizar campos no `ATAS_DB`.
    -   **Output:** `Ata`.

5.  **DELETE `/atas/{id}`**
    -   **Processo:** Remover do `ATAS_DB`.
    -   **Output:** 204 No Content.

6.  **GET `/atas/{id}/export`**
    -   **Processo:**
        1.  Buscar Ata.
        2.  Chamar `AtaExcelService.generate_report(ata)`.
        3.  Retornar `StreamingResponse` com content-type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

## 5. Fluxo Lógico (Frontend "Office Script" Integration)
*   Frontend (`ata.html` ou Office Script) faz `POST /atas` com o JSON atual.
*   Backend valida e salva.
*   Usuário clica em "Exportar Excel".
*   Frontend chama `GET /atas/{id}/export` e baixa o blob.

## 6. Edge Cases
*   **Dados Incompletos:** `Optional` fields no schema, `None` nas respostas.
*   **Índices Ausentes:** Dicionários esparsos (usuário não preencheu tudo). O serviço de Excel deve tratar `KeyError` ou usar `.get()`.
