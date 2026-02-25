# Product Requirements Document (PRD) - Excel CRUD API

## 1. Contexto Técnico
O projeto ChemFlow visa integrar Design of Experiments (DOE) e Quimiometria em uma plataforma web. Atualmente, o backend possui apenas a estrutura básica (`main.py`). É necessário implementar o **Módulo 2: Gerenciamento de Dados**, permitindo que usuários façam upload de arquivos Excel com resultados experimentais para processamento posterior (PCA/PLS).

## 2. Problema a Resolver
Não existe mecanismo para persistir ou processar dados experimentais no backend. O sistema precisa de uma API RESTful para realizar operações CRUD (Create, Read, Update, Delete) sobre datasets, com foco específico no parsing e validação de arquivos Excel/CSV ("Excel Script").

## 3. Escopo da Implementação
Implementar um conjunto de endpoints e serviços para gerenciar o ciclo de vida de um dataset.

### Funcionalidades (CRUD)
1.  **Create (Upload):** Endpoint para upload de arquivos `.xlsx` ou `.csv`.
    *   Deve validar o formato do arquivo.
    *   Deve processar o arquivo usando `pandas` (limpeza básica, validação de colunas).
    *   Deve retornar um ID único e metadados do dataset.
2.  **Read (List/Get):**
    *   Listar todos os datasets disponíveis (metadados).
    *   Recuperar os dados processados de um dataset específico (formato JSON para o frontend).
    *   (Opcional para MVP) Download do arquivo original ou processado.
3.  **Update:**
    *   Atualizar metadados (nome, descrição).
    *   (Opcional) Re-upload de arquivo para substituir dados.
4.  **Delete:**
    *   Remover um dataset e seus dados associados.

### "Excel Script" (Processamento)
Lógica encapsulada para:
*   Ler o arquivo (Pandas `read_excel`/`read_csv`).
*   Tratar valores nulos (NaN) e infinitos.
*   Normalizar cabeçalhos (remover espaços, caracteres especiais).
*   Extrair metadados (número de linhas, colunas, tipos de dados).

## 4. Arquivos Afetados / A Criar
*   `backend/app/main.py`: Registro das novas rotas.
*   `backend/app/api/v1/endpoints/datasets.py`: Controladores da API.
*   `backend/app/schemas/dataset.py`: Modelos Pydantic para validação (Request/Response).
*   `backend/app/services/excel_processor.py`: Lógica de manipulação de Excel (o "Script").
*   `backend/app/models/dataset.py`: Modelo de dados (em memória ou DB simples para este MVP).

## 5. Referências Técnicas
*   **FastAPI:** Framework web.
*   **Pandas:** Manipulação de dados (`read_excel`, `DataFrame`).
*   **Python-Multipart:** Para upload de arquivos.
*   **Pydantic:** Validação de esquemas.

## 6. Restrições
*   Manter a implementação "Stateless" onde possível, ou usar armazenamento em memória/disco temporário se banco de dados não estiver configurado. (Assumiremos armazenamento em memória `dict` para simplicidade do MVP, conforme estrutura atual, ou SQLite se `sqlalchemy` estiver pronto).
*   Seguir estritamente o `chemflow_development_prompt.yaml`.
*   Código deve ser assíncrono (`async def`) onde envolver I/O.
