# Política e regras de segurança

Este documento define como reportar vulnerabilidades e as regras de segurança
que todo código do repositório Ferramentas-Web segue. As regras marcadas com
**[auto]** são verificadas a cada pull request pelo workflow
[Segurança](.github/workflows/seguranca.yml).

## Reportar uma vulnerabilidade

Não abra issue pública para falhas de segurança. Use o recurso
**Security > Report a vulnerability** do GitHub (aviso privado) e informe:

- o arquivo ou endpoint afetado;
- os passos para reproduzir;
- o impacto esperado.

A resposta inicial deve sair em até 5 dias úteis.

## Escopo

| Componente | Pasta | Superfície de risco |
|---|---|---|
| API Ata Digital (FastAPI) | `backend/` | Entrada JSON, exportação Excel |
| Ata Digital | `ata.html` | Formulário local, CDN |
| CEP PRO (legado) | `legacy/` | Leitura de planilhas, CDN |
| Frontend React | `frontend/` | Dependências npm |
| Graficário | `gerador-graficos/` | Dados colados, CSV, projetos importados, HTML exportado |

## Verificar localmente

Antes de abrir um pull request, rode:

```bash
node scripts/security-check.mjs          # regras S1, S2 e S3
cd backend && pip install -r requirements-test.txt && PYTHONPATH=. python -m pytest -q tests
```

O verificador sai com erro em violações e lista os avisos registrados abaixo.
Em caso de falso positivo, adicione `security-check:ignore` na linha, com um
comentário que justifique.

## Regras

### S1. Segredos nunca entram no git [auto]

- Use variáveis de ambiente. Versione apenas `.env.example`, sem valores reais.
- Não versione chaves, certificados (`.pem`, `.key`), arquivos `.env`,
  `__pycache__` ou `*.pyc`. O `.gitignore` da raiz já bloqueia esses padrões.
- Se um segredo for versionado, **revogue-o primeiro**. Removê-lo do histórico
  não basta, porque cópias já podem existir.

### S2. Dependências fixadas e verificáveis [auto]

- Scripts de CDN usam versão exata (nunca `@latest`), HTTPS e atributos
  `integrity` (SRI) e `crossorigin="anonymous"`. Gere o hash com
  `openssl dgst -sha384 -binary arquivo.js | openssl base64 -A`.
- Prefira jsDelivr ou unpkg com `/npm/pacote@versão`, que servem o arquivo
  idêntico ao do npm, e confira o hash contra o pacote do npm.
- Remova dependências que o código não usa.
- O Dependabot ([`.github/dependabot.yml`](.github/dependabot.yml)) abre pull
  requests de atualização. Revise o changelog antes de aceitar.
- Ações do GitHub de terceiros são fixadas por SHA de commit. As oficiais
  (`actions/*`) podem usar a tag de versão maior.

### S3. Dados nunca viram HTML ou código [auto]

Considere não confiável tudo o que vem de fora do código: arquivos e nomes de
arquivo, CSV, planilhas, JSON importado, `localStorage`, respostas de API e
texto digitado.

- Insira esses dados com `textContent`, `createElement` ou `value`. Não use
  `innerHTML`, `outerHTML` ou `insertAdjacentHTML` com valores dinâmicos.
- Quando HTML for inevitável (por exemplo, tooltips do ECharts), escape o texto
  com a função `esc()` do runtime e só aceite cores em formatos conhecidos.
- Não use `eval`, `new Function` nem `document.write`.
- Em `gerador-graficos/js/`, `frontend/src/` e `scripts/` essas regras
  bloqueiam o merge. Nas demais pastas, o verificador emite avisos.

### S4. Exportações não executam conteúdo

- **Excel:** texto do usuário é gravado como texto, nunca como fórmula. Use o
  helper `_texto()` em `backend/app/services/ata_excel_service.py`.
- **CSV:** valores que começam com `=`, `+`, `-`, `@`, tabulação ou CR recebem
  um apóstrofo (OWASP CSV Injection). A importação remove esse apóstrofo.
- **HTML exportado:** dados embutidos em `<script>` têm `<` escapado como
  `<`, e o script do ECharts leva SRI.
- **Nomes de arquivo em cabeçalhos:** só `[A-Za-z0-9._-]`, entre aspas.

### S5. A API valida tudo o que recebe

- Todo modelo Pydantic define limites: tamanho de texto (`max_length`), faixas
  numéricas (`ge`, `le`), tamanho de coleções e `extra="forbid"`.
- Armazenamentos em memória têm teto (`MAX_ATAS`).
- Respostas levam `X-Content-Type-Options`, `X-Frame-Options` e
  `Referrer-Policy`. Downloads levam `Cache-Control: no-store`.
- **Autenticação é obrigatória antes de expor a API fora de `localhost`.** Hoje
  a API não tem autenticação (veja os achados abertos).
- Se houver CORS, liste as origens explicitamente. Nunca combine `*` com
  credenciais.
- Não registre em log dados pessoais nem o conteúdo das atas.

### S6. Arquivos de terceiros são tratados como hostis

- Projetos do Graficário (`.graficario.json`) e o JSON de **Avançado** passam
  por `sanitizeOverride()`, que remove marcação HTML, URLs `javascript:`,
  `link`/`sublink` e objetos de função do runtime (`__ggfn`).
- Ao abrir um arquivo de projeto, valide a estrutura antes de usar.

### S7. Toda mudança de segurança tem teste

- Uma correção de vulnerabilidade vem com um teste que falha no código antigo
  e passa no novo, como em `backend/tests/test_seguranca.py`.
- Uma regra nova entra no verificador `scripts/security-check.mjs` sempre que
  puder ser checada automaticamente.

### S8. Revisão

- Pull requests que tocam entrada de dados, exportação, autenticação ou
  dependências pedem revisão com foco em segurança. No Claude Code, use
  `/security-review`.
- Mantenha a tabela de achados abaixo atualizada.

## Achados

Última revisão: 4 de outubro de 2026.

### Corrigidos

| Achado | Onde | Correção |
|---|---|---|
| Injeção de fórmula no Excel exportado (`=HYPERLINK`, `=cmd\|...`) | `backend/app/services/ata_excel_service.py` | Texto gravado como texto; testes em `backend/tests/test_seguranca.py` |
| Entrada sem limites (textos de MB, KPI negativo, coleções ilimitadas) | `backend/app/schemas/ata.py` | Limites Pydantic e `extra="forbid"` |
| Banco em memória sem teto | `backend/app/api/v1/endpoints/atas.py` | `MAX_ATAS` com resposta 507 |
| Nome de arquivo do usuário no `Content-Disposition` | `backend/app/api/v1/endpoints/atas.py` | `_nome_arquivo()` |
| XSS ao abrir projeto do Graficário com `tooltip.formatter` em HTML | `gerador-graficos/js/builders/base.js` | `sanitizeOverride()` |
| Cor sem validação no HTML do tooltip | `gerador-graficos/js/core/runtime.js` | `SAFE_COLOR` |
| Fórmulas no CSV exportado pelo Graficário | `gerador-graficos/js/core/data.js` | Apóstrofo em valores perigosos |
| ECharts de CDN sem verificação de integridade | `gerador-graficos/index.html`, `js/app/export.js` | SRI; cai para a próxima CDN se o hash não bater |
| `jstat@latest` sem versão nem SRI | `legacy/index.html`, `legacy/CEP_PRO_BACKUP` | `jstat@1.9.6` com SRI |
| Nome do arquivo inserido como HTML | `legacy/js/main.js`, `legacy/CEP_PRO_BACKUP` | `createTextNode` |
| `xlsx@0.18.5` vulnerável e não usado (CVE-2023-30533, CVE-2024-22363) | `frontend/package.json` | Dependência removida |
| `__pycache__` versionado | `backend/app/**` | Removido; `.gitignore` na raiz |

### Abertos

| Achado | Onde | Risco | Próximo passo |
|---|---|---|---|
| API sem autenticação | `backend/` | Alto se exposta | Exigir token ou SSO antes de publicar fora de `localhost` |
| Dependências Python sem versão | `backend/requirements.txt` | Médio | Fixar versões testadas (lockfile) |
| `plotly.js` (via `react-plotly.js`, não usado) com vulnerabilidades em `maplibre-gl` | `frontend/package.json` | Médio | Remover se continuar sem uso ou atualizar |
| Tailwind Play CDN sem SRI | `ata.html`, `legacy/sixpack_dashboard.html` | Médio | Gerar o CSS com o build do Tailwind |
| Plotly e SheetJS de CDN sem SRI | `legacy/index.html` | Médio | Calcular o hash a partir do arquivo publicado |
| `innerHTML` com valores dinâmicos (configuração local e dados internos) | `ata.html`, `legacy/js/*` | Baixo | Migrar para `textContent` ao mexer nesses arquivos |
