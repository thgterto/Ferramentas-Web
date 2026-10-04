# Ferramentas-Web

Coleção de ferramentas web: API FastAPI da Ata Digital (`backend/`), páginas
HTML autônomas (`ata.html`, `legacy/`), frontend React (`frontend/`) e o
gerador de gráficos Graficário (`gerador-graficos/`, ver o README da pasta).

## Regras de segurança (obrigatórias)

Siga [SECURITY.md](SECURITY.md). Em resumo, ao escrever ou revisar código:

1. **Segredos:** nunca versione chaves, tokens ou `.env`. Use variáveis de
   ambiente.
2. **Dependências:** versão exata. Script de CDN leva `integrity` (SRI) e
   `crossorigin="anonymous"`; nada de `@latest`. Não adicione dependência que o
   código não usa.
3. **Dados não viram HTML:** dados externos (arquivos, CSV, JSON importado,
   `localStorage`, API, texto digitado) entram com `textContent`/`value`, nunca
   em `innerHTML`/`insertAdjacentHTML`. Tooltips do ECharts escapam com
   `esc()`. Sem `eval`, `new Function` ou `document.write`.
4. **Exportações:** texto do usuário nunca vira fórmula no Excel (`_texto()`)
   nem no CSV (apóstrofo). Nome de arquivo em cabeçalho só `[A-Za-z0-9._-]`.
5. **API:** todo modelo Pydantic tem limites e `extra="forbid"`; não exponha a
   API fora de `localhost` sem autenticação; CORS só com origens explícitas.
6. **Arquivos de terceiros:** projetos do Graficário e o JSON de "Avançado"
   passam por `sanitizeOverride()`. Não amplie o que ele aceita.
7. **Teste junto:** correção de segurança vem com teste que falha antes e passa
   depois. Regra checável entra em `scripts/security-check.mjs`.

## Comandos

```bash
node scripts/security-check.mjs                     # regras de segurança (CI)
cd backend && PYTHONPATH=. python -m pytest -q tests # testes da API
node gerador-graficos/tools/check.js                # constrói todos os modelos do Graficário
```

Antes de concluir uma mudança, rode o verificador de segurança e os testes da
área alterada. Ao corrigir ou encontrar uma vulnerabilidade, atualize a tabela
de achados em `SECURITY.md`.
