"""v3.8: tela de colaboradores — CRUD, filtros, importação/exportação, alocação às turmas,
matriz com pessoas reais e aplicação da alocação do otimizador de pools."""

from __future__ import annotations

import io

from openpyxl import Workbook, load_workbook

from tests.api.conftest import Ctx, setup_operation
from tests.api.test_subsetores_otimizadores import _estrutura


def _emp(ctx: Ctx, op: str, **body: object) -> dict[str, object]:
    r = ctx.post(f"/operations/{op}/employees", json=body)
    assert r.status_code == 201, r.text
    return r.json()["data"]  # type: ignore[no-any-return]


def test_crud_filtros_desativar(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    op = ids["operation"]
    _estrutura(ctx, op)
    assert ctx.post("/roles", json={"code": "OP", "name": "Operador"}).status_code == 201
    a = _emp(ctx, op, name="Ana Lima", registration="1001", role_code="OP", team_code="A",
             default_workstation_code="A1", skills=["NR-10", "Empilhadeira"],
             hire_date="2024-03-01", contract_weekly_hours="44",
             restrictions=["nao_noturno"], pool_codes=["P1"])
    assert a["home_subsector_code"] == "SA" and a["skills"] == ["Empilhadeira", "NR-10"]
    _emp(ctx, op, name="Bruno Reis", registration="1002", home_subsector_code="SB",
         team_code="B")
    # matrícula duplicada / cargo / pool inexistente → 422
    r = ctx.post(f"/operations/{op}/employees", json={"name": "X", "registration": "1001"})
    assert r.status_code == 422 and r.json()["error"]["details"][0]["field"] == "registration"
    assert ctx.post(f"/operations/{op}/employees",
                    json={"name": "X", "role_code": "ZZ"}).status_code == 422
    assert ctx.post(f"/operations/{op}/employees",
                    json={"name": "X", "pool_codes": ["ZZ"]}).status_code == 422
    assert ctx.post(f"/operations/{op}/employees",
                    json={"name": "X", "restrictions": ["voa"]}).status_code == 422
    def lst(q: str) -> list[str]:
        return [e["name"] for e in ctx.get(f"/operations/{op}/employees?{q}").json()["data"]]

    assert lst("") == ["Ana Lima", "Bruno Reis"]
    assert lst("q=1002") == ["Bruno Reis"] and lst("q=empilha") == ["Ana Lima"]
    assert lst("subsector=SB") == ["Bruno Reis"] and lst("workstation=A1") == ["Ana Lima"]
    assert lst("role=OP") == ["Ana Lima"] and lst("team=B") == ["Bruno Reis"]
    # editar + desativar
    r = ctx.patch(f"/employees/{a['id']}", json={"active": False, "name": "Ana L."})
    assert r.status_code == 200 and r.json()["data"]["active"] is False
    assert lst("status=inativo") == ["Ana L."] and lst("status=ativo") == ["Bruno Reis"]
    assert ctx.get(f"/employees/{a['id']}").json()["data"]["registration"] == "1001"
    # viewer não escreve; outra organização não enxerga
    assert ctx.patch(f"/employees/{a['id']}", "a_viewer", json={"name": "z"}).status_code == 403
    assert ctx.get(f"/employees/{a['id']}", "b_owner").status_code == 404
    assert ctx.delete(f"/employees/{a['id']}").status_code == 204
    assert lst("") == ["Bruno Reis"]


def test_importacao_csv_xlsx_relatorio_e_exportacao(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    op = ids["operation"]
    _estrutura(ctx, op)
    csv_ruim = ("matrícula;nome;subsetor;turma;admissao;jornada_semanal_h;restricoes\n"
                "2001;Carla;SA;A;2023-01-10;44;nao noturno\n"
                "2002;;SA;A;;;\n"
                "2003;Davi;ZZ;B;31/02/2020;x;\n"
                "2001;Eva;SB;C;;;\n")
    r = ctx.post(f"/operations/{op}/employees:import",
                 files={"file": ("pessoas.csv", csv_ruim.encode(), "text/csv")})
    assert r.status_code == 200, r.text
    rep = r.json()["data"]
    assert rep["dry_run"] is True and rep["total_rows"] == 4   # erros ⇒ nada gravado
    linhas = {(e["row"], e["field"]) for e in rep["errors"]}
    assert (3, "name") in linhas and (4, "admissao") in linhas and (5, "matricula") in linhas
    assert ctx.get(f"/operations/{op}/employees").json()["data"] == []
    # XLSX válido: cria 2; reimportar com a mesma matrícula atualiza
    wb = Workbook()
    ws = wb.active
    assert ws is not None
    ws.append(["matricula", "nome", "subsetor", "posicao", "turma", "habilidades", "status"])
    ws.append(["3001", "Fábio", "SA", "A2", "a", "NR-35, Brigada", "ativo"])
    ws.append(["3002", "Gabi", "SB", "", "B", "", "inativo"])
    buf = io.BytesIO()
    wb.save(buf)
    xlsx = buf.getvalue()
    mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    r = ctx.post(f"/operations/{op}/employees:import?dry_run=true",
                 files={"file": ("p.xlsx", xlsx, mime)})
    assert r.json()["data"]["created"] == 2 and r.json()["data"]["dry_run"] is True
    assert ctx.get(f"/operations/{op}/employees").json()["data"] == []
    r = ctx.post(f"/operations/{op}/employees:import", files={"file": ("p.xlsx", xlsx, mime)})
    d = r.json()["data"]
    assert (d["created"], d["updated"], d["errors"]) == (2, 0, [])
    r = ctx.post(f"/operations/{op}/employees:import",
                 files={"file": ("p.csv", b"matricula,nome,turma\n3001,Fabio Souza,C\n",
                                 "text/csv")})
    assert r.json()["data"]["updated"] == 1
    emps = {e["registration"]: e for e in ctx.get(f"/operations/{op}/employees").json()["data"]}
    assert emps["3001"]["name"] == "Fabio Souza" and emps["3001"]["team_code"] == "C"
    assert emps["3001"]["default_workstation_code"] == "A2"   # campos ausentes preservados
    assert emps["3002"]["active"] is False
    # sem coluna nome → 422
    r = ctx.post(f"/operations/{op}/employees:import",
                 files={"file": ("p.csv", b"matricula\n1\n", "text/csv")})
    assert r.status_code == 422
    # exportação CSV e XLSX (cabeçalho reimportável)
    r = ctx.get(f"/operations/{op}/employees:export?format=csv")
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    texto = r.content.decode("utf-8-sig").splitlines()
    assert texto[0].startswith("matricula;nome;cargo") and len(texto) == 3
    r = ctx.get(f"/operations/{op}/employees:export?format=xlsx")
    ws2 = load_workbook(io.BytesIO(r.content)).active
    assert ws2 is not None
    rows = list(ws2.iter_rows(values_only=True))
    assert rows[1][1] == "Fabio Souza" and rows[2][-1] == "inativo"


def test_alocacao_automatica_e_matriz_com_colaboradores(ctx: Ctx) -> None:
    ids = setup_operation(ctx, postos=1, model="6X1_BASE", teams=6)
    op, sid = ids["operation"], ids["scenario"]
    assert ctx.post(f"/scenarios/{sid}/simulate").status_code == 200
    noite = _emp(ctx, op, name="Zé Diurno", restrictions=["nao_noturno"])
    for i in range(6):
        _emp(ctx, op, name=f"Pessoa {i}")
    r = ctx.post(f"/operations/{op}/employees:assign-teams",
                 json={"scenario_id": sid, "apply": False})
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["applied"] is False and len(d["teams"]) == 6
    turma_ze = d["assignments"][noite["id"]]
    perfil = {t["team"]: t for t in d["teams"]}
    assert perfil[turma_ze]["works_night"] is False
    assert sum(t["works_night"] for t in d["teams"]) == 2          # 6x1 fixo: 2 turmas N
    assert len(d["assignments"]) == 7 or d["unassigned"]
    assert ctx.get(f"/operations/{op}/employees?team=-").json()["data"]  # nada gravado
    d = ctx.post(f"/operations/{op}/employees:assign-teams",
                 json={"scenario_id": sid, "apply": True}).json()["data"]
    assert d["applied"] is True
    mx = ctx.get(f"/scenarios/{sid}/monthly-matrix?month=2027-01").json()["data"]
    nomes = [p["name"] for p in mx["people"]]
    assert "Zé Diurno" in nomes and mx["generated_people"] is False
    ze = next(p for p in mx["people"] if p["name"] == "Zé Diurno")
    assert all(c["code"] != "N" for c in ze["cells"])
    # turma sem ninguém cadastrado continua com fictícios (fallback)
    assert len(mx["people"]) >= 6


def test_aplicar_alocacao_do_otimizador_de_pools(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    _estrutura(ctx, ids["operation"])
    sid = ids["scenario"]
    assert ctx.post(f"/scenarios/{sid}/simulate").status_code == 200
    o = ctx.post(f"/scenarios/{sid}/optimize",
                 json={"objective": "pool_allocation", "time_limit_s": 5}).json()["data"]
    patch = o["scenario_patch"]
    assert patch and patch["params"]["pool_allocation"]["assignments"] == \
        o["solution"]["assignments"]
    r = ctx.post(f"/scenarios/{sid}/optimize/apply", json={"mode": "apply", "patch": patch})
    assert r.status_code == 200, r.text
    sc = ctx.get(f"/scenarios/{sid}").json()["data"]
    assert sc["params"]["pool_allocation"]["assignments"] == o["solution"]["assignments"]
    mes = o["solution"]["window"][0][:7]
    mx = ctx.get(f"/scenarios/{sid}/monthly-matrix?month={mes}").json()["data"]
    assert mx["pool_allocation_applied"] > 0
