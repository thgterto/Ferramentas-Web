# Simulador de Cobertura de Escalas 24/7 (v3.8)

App independente dentro do repositório Ferramentas-Web (o app de atas continua em `../backend` e `../frontend`).

| Pasta | Conteúdo |
|---|---|
| `backend/` | API FastAPI — pacote `escalas` (motor em `escalas/services/engine/`), Alembic, testes |
| `frontend/` | SPA React/Vite (simulador na rota `/`), Vitest e E2E (`e2e/fluxo-4-1.cjs`) |
| `docs/` | PRD, TRD, fluxo, design, esquema e plano ([índice](docs/README.md)) |
| `portable/` | Versão portable (PyInstaller) |
| `docker-compose*.yml` | Postgres (dev) e staging completo |

## Desenvolvimento

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'
DATABASE_URL=sqlite:///./dev.db .venv/bin/python scripts/dev_seed.py   # usuário gerente@demo.local / demo-12345
DATABASE_URL=sqlite:///./dev.db .venv/bin/uvicorn escalas.main:app --port 8000
cd ../frontend && npm ci && npm run dev                                 # http://localhost:5173
```

Verificações: `ruff check escalas tests alembic && mypy escalas tests && pytest` (backend);
`npm run lint && npx tsc -b && npm test && npm run build && npm run e2e` (frontend; o E2E usa `require('playwright')`).
Contrato: `python scripts/export_openapi.py && (cd ../frontend && npm run gen:api)`.

Staging: `docker compose -f docker-compose.staging.yml up --build` → http://localhost:8080/.

## Versão portable (sem instalar Python, Node ou Postgres)

**Baixar:** GitHub → Actions → workflow **Portable** → artefato `simulador-escalas-<Windows|macOS|Linux>` (gerado em
`workflow_dispatch` e em tags `v*`/`simulador-v*`). Ou gere localmente: `portable/build.sh` (Linux/macOS) ou
`portable\build.ps1` (Windows) → `portable/dist/simulador-escalas-<so>-<arch>.zip`.

**Executar:** descompacte e rode `simulador-escalas/simulador-escalas` (`simulador-escalas.exe` no Windows; no macOS,
na 1ª vez, botão direito → Abrir). O navegador abre em `http://127.0.0.1:<porta livre>` (padrão 8765).
Opções: `--port 9000`, `--no-browser`. Na 1ª execução são aplicadas as migrações e os seeds e é criado o
usuário **admin@local** com senha aleatória, mostrada no terminal e gravada em `credenciais-iniciais.txt`.

**Onde ficam os dados** (variável `ESCALAS_DATA_DIR` sobrescreve):

| SO | Pasta |
|---|---|
| Windows | `%LOCALAPPDATA%\SimuladorEscalas` |
| macOS | `~/Library/Application Support/SimuladorEscalas` |
| Linux | `~/.local/share/SimuladorEscalas` (ou `$XDG_DATA_HOME`) |

Arquivos: `escalas.db` (SQLite, todos os dados), `config.env` (segredo dos tokens), `credenciais-iniciais.txt`.

**Backup:** feche o app e copie a pasta inteira (ou só `escalas.db` + `config.env`). Para restaurar, coloque-os de volta
na mesma pasta. Atualizar de versão: substitua a pasta do executável; as migrações novas rodam sozinhas ao abrir.
