"""M3 — K (turmas) como restrição, modo fixo (FR-32 MVP).

Gera o padrão com exatamente ``k`` turmas (offsets que maximizam a cobertura — busca do
``gerador``), mede a cobertura alcançável e emite ``COB_K_INSUFICIENTE`` se houver déficit
(ou se ``k`` < ``K_legal`` do regime, FR-41). Modos mínimo/faixa/livre: Fase 2.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date
from fractions import Fraction
from math import ceil

from escalas.services.engine.catalogo import ModeloEscala
from escalas.services.engine.cobertura import ResultadoCobertura, calcular_cobertura
from escalas.services.engine.demanda import CurvaDemanda
from escalas.services.engine.gerador import montar_grupo
from escalas.services.engine.types import Achado, Padrao, Severidade, Turno

COB_K_INSUFICIENTE = "COB_K_INSUFICIENTE"


@dataclass(frozen=True, slots=True)
class ResultadoKFixo:
    k: int
    padrao: Padrao
    cobertura: ResultadoCobertura
    achados: tuple[Achado, ...]


def padrao_k_fixo(modelo: ModeloEscala, k: int) -> Padrao:
    """Distribui ``k`` turmas entre os grupos (resto para os primeiros) e busca offsets."""
    ks = modelo.distribuir_k(k)
    grupos = tuple(montar_grupo(seq, n) for seq, n in zip(modelo.sequencias, ks, strict=True))
    return Padrao(modelo.codigo, grupos)


def simular_k_fixo(
    modelo: ModeloEscala, k: int, turnos: Mapping[str, Turno], curva: CurvaDemanda,
    postos: int, data_ancora: date, k_legal: Fraction | None = None,
) -> ResultadoKFixo:
    padrao = padrao_k_fixo(modelo, k)
    res = calcular_cobertura(padrao, turnos, curva, postos, data_ancora)
    critico = any(a.codigo == "COB_DEFICIT_POSTO_CRITICO" for a in res.achados)
    sev = Severidade.ERRO if critico else Severidade.ALERTA
    achados: list[Achado] = []
    k_est = modelo.k_estrela or Fraction(k)
    sugestao = f"K = {ceil(k_est)} ou +folguistas"
    if modelo.exato_meias and not modelo.exato:
        sugestao += f" ou {int(2 * k_est)} meias-turmas"
    if res.kpis.deficit_hp > 0:
        achados.append(Achado(
            COB_K_INSUFICIENTE, sev,
            f"K fixo = {k}: cobertura alcançável "
            f"{float(res.kpis.pct_horas_posto_cobertas):.1%}, déficit "
            f"{float(res.kpis.deficit_hp_semana):g} horas-posto/semana; {sugestao}",
            {"k": str(k), "pct": str(res.kpis.pct_horas_posto_cobertas),
             "deficit_hp_semana": str(res.kpis.deficit_hp_semana), "sugestao": sugestao}))
    if k_legal is not None and k < k_legal:
        achados.append(Achado(
            COB_K_INSUFICIENTE, sev,
            f"K fixo = {k} < K_legal = {float(k_legal):g} do regime",
            {"k": str(k), "k_legal": str(k_legal), "origem": "regime"}))
    return ResultadoKFixo(k, padrao, res, tuple(achados))
