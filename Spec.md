# Specification (Spec) - Excel CRUD API

## 1. Arquitetura e Estrutura de Arquivos

### Novos Arquivos
*   `backend/app/api/v1/endpoints/datasets.py`: Router para endpoints de dataset.
*   `backend/app/schemas/dataset.py`: Modelos Pydantic para validação.
*   `backend/app/services/excel_processor.py`: Lógica de processamento de arquivos.

### Arquivos Modificados
*   `backend/app/main.py`: Incluir router `api_router`.

## 2. Modelagem de Dados (Schemas)

### `backend/app/schemas/dataset.py`

```python
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

class DatasetBase(BaseModel):
    name: str
    description: Optional[str] = None

class DatasetCreate(DatasetBase):
    pass # File is handled via UploadFile

class Dataset(DatasetBase):
    id: uuid.UUID
    filename: str
    created_at: datetime
    rows: int
    columns: int
    column_names: List[str]

    class Config:
        from_attributes = True

class DatasetData(BaseModel):
    id: uuid.UUID
    data: List[Dict[str, Any]]
```

## 3. Serviços (Logic)

### `backend/app/services/excel_processor.py`

#### Classe `ExcelProcessor`
*   **Método `process_file(file: UploadFile) -> pd.DataFrame`**
    1.  Ler conteúdo do arquivo em memória (`await file.read()`).
    2.  Identificar extensão (`.xlsx`, `.xls` ou `.csv`).
    3.  Carregar DataFrame usando `pandas`.
        -   CSV: `pd.read_csv(io.BytesIO(content))`
        -   Excel: `pd.read_excel(io.BytesIO(content))`
    4.  **Limpeza ("Script"):**
        -   Normalizar nomes das colunas: `strip()`, `lower()`, substituir espaços por `_`.
        -   Tratar `NaN`: Substituir por `None` (para JSON valid).
    5.  Retornar DataFrame.

*   **Método `get_metadata(df: pd.DataFrame) -> dict`**
    -   Retorna: `{ "rows": len(df), "columns": len(df.columns), "column_names": list(df.columns) }`

## 4. API Endpoints

### `backend/app/api/v1/endpoints/datasets.py`

#### Armazenamento (Simulado em Memória para MVP)
-   Variável global `DATASETS_DB: Dict[uuid.UUID, dict]` (Metadados + DataFrame).

#### Endpoints

1.  **POST `/datasets/upload`**
    -   **Input:** `file: UploadFile`, `name: str` (Form), `description: str` (Form).
    -   **Processo:**
        1.  Validar extensão.
        2.  Chamar `ExcelProcessor.process_file`.
        3.  Extrair metadados via `ExcelProcessor.get_metadata`.
        4.  Gerar ID (UUID4).
        5.  Salvar em `DATASETS_DB`.
    -   **Output:** Schema `Dataset`.

2.  **GET `/datasets`**
    -   **Processo:** Listar valores de `DATASETS_DB`.
    -   **Output:** `List[Dataset]`.

3.  **GET `/datasets/{id}`**
    -   **Processo:** Buscar ID em `DATASETS_DB`. Se não existir, 404.
    -   **Output:** Schema `Dataset`.

4.  **GET `/datasets/{id}/data`**
    -   **Processo:**
        1.  Buscar DataFrame em `DATASETS_DB`.
        2.  Converter para JSON (`df.to_dict(orient='records')`).
    -   **Output:** Schema `DatasetData`.

5.  **DELETE `/datasets/{id}`**
    -   **Processo:** Remover chave de `DATASETS_DB`.
    -   **Output:** 204 No Content.

## 5. Fluxo Lógico
1.  Usuário envia arquivo via POST.
2.  Backend recebe stream, converte para DataFrame.
3.  Dados são limpos e estruturados.
4.  ID é retornado.
5.  Frontend usa ID para buscar metadados (visualização rápida) ou dados completos (plotagem).

## 6. Edge Cases
*   Arquivo vazio ou corrompido -> `HTTPException 400`.
*   Formato não suportado -> `HTTPException 400`.
*   Colunas duplicadas -> Pandas trata automaticamente (sufixo .1), aceitável.
*   Arquivo muito grande -> Limite de tamanho configurado no Nginx/FastAPI (fora do escopo deste código, mas bom notar).
