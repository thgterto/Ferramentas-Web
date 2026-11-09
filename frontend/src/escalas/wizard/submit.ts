import { ApiError, api, apiData, type S } from '../api/client'
import { applyTeams, totalTeams, type PatternSpec } from '../pattern/model'
import { sectorCurve, workstationCurve, type WizardValues } from './schema'

/** Padrão a enviar em ``params.pattern``: construtor, ou catálogo com K não fixo/tamanhos por turma. */
export async function resolvePattern(v: WizardValues): Promise<PatternSpec | null> {
  if (v.customized && v.pattern) return v.pattern as PatternSpec
  if (v.kMode === 'fixo' && !v.teamSizes.length) return null
  const base = await apiData<PatternSpec>(`/schedule-models/${v.modelCode}/pattern?team_count=${v.teamCount}`)
  return applyTeams(base, { mode: v.kMode, k: v.teamCount, kMin: v.kMin, kMax: v.kMax, sizes: v.teamSizes })
}

const dec = (pctValue: number) => (pctValue / 100).toFixed(6)

/** Persiste os passos e simula (fluxo 4.1). Devolve o id do cenário. */
export async function createAndSimulate(op: string, v: WizardValues, progress: (m: string) => void = () => {}): Promise<string> {
  progress('Salvando regras (CCT/ACT)…')
  const ag = await apiData<S['LaborAgreementOut']>('/labor-agreements', {
    body: { name: v.agreementKind === 'CLT_PADRAO' ? 'CLT padrão' : `${v.agreementKind} ${v.scenarioName}`, kind: v.agreementKind, valid_from: v.horizonStart, allows_8h_rotating: v.allows8h },
  })
  for (const r of v.roles) {
    try {
      await apiData('/roles', { body: { code: r.code, name: r.name } })
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 409)) throw e
    }
  }
  if (v.subs.length) {
    await api('/substitution-rules', { method: 'PUT', body: { rules: v.subs.map((s) => ({ from_role: s.from, to_role: s.to })) } })
  }
  progress('Salvando demanda…')
  const pos = await apiData<S['PositionOut']>(`/operations/${op}/positions`, {
    body: { name: v.positionName, ...(v.roles[0] ? { required_role_code: v.roles[0].code } : {}) },
  })
  const values = v.subsectors.length ? sectorCurve(v.subsectors) : v.demandMode === 'fixos' ? Array.from({ length: 168 }, () => v.postos) : v.curve
  const curve = await apiData<S['DemandCurveOut']>(`/positions/${pos.id}/demand-curves`, {
    body: {
      name: v.subsectors.length ? 'Soma das posições dos subsetores' : v.demandMode === 'fixos' ? `${v.postos} postos fixos` : 'Curva 168 h',
      mode: !v.subsectors.length && v.demandMode === 'fixos' ? 'postos_fixos' : 'curva_168h',
      values: values.map(String),
    },
  })
  if (v.subsectors.length) {
    progress('Salvando subsetores, posições e pools…')
    for (const [i, sub] of v.subsectors.entries()) {
      const so = await apiData<S['SubsectorOut']>(`/operations/${op}/subsectors`, { body: { code: sub.code, name: sub.name, sort_order: i } })
      for (const [j, w] of sub.positions.entries()) {
        const fixed = w.from === 0 && w.to === 24
        await apiData(`/subsectors/${so.id}/workstations`, {
          body: {
            code: w.code,
            name: w.name,
            sort_order: j,
            ...(w.role ? { required_role_code: w.role } : {}),
            demand: fixed ? { mode: 'postos_fixos', posts: w.posts } : { mode: 'curva_168h', values: workstationCurve(w) },
          },
        })
      }
    }
    for (const pl of v.pools) {
      const roles = pl.roles.split(/[,\s]+/).filter(Boolean)
      await apiData(`/operations/${op}/subsector-pools`, {
        body: { code: pl.code, name: pl.name, subsector_codes: pl.members, mode: roles.length ? 'restrito' : 'total', allowed_role_codes: roles, max_borrowed_hours_week: pl.maxHours, prefer_home: pl.preferHome },
      })
    }
  }
  for (const m of v.minimums) {
    await apiData(`/operations/${op}/role-requirements`, { body: { kind: 'minimo', role_code: m.role, min_count: m.min, severity: 'erro' } })
  }
  let shrinkId: string | undefined
  if (v.shrinkDay > 0 || v.shrinkNight > 0) {
    const sh = await apiData<S['ShrinkageOut']>('/shrinkage-profiles', {
      body: { name: `${v.scenarioName} D${v.shrinkDay}/N${v.shrinkNight}`, operation_id: op, day_pct: dec(v.shrinkDay), night_pct: dec(v.shrinkNight) },
    })
    shrinkId = sh.id
  }
  progress('Criando cenário…')
  const peak = Math.max(...values)
  const params: Record<string, unknown> = {}
  if (v.reserve === 'extras' && v.extrasPerTeam > 0) params.team_size = peak + v.extrasPerTeam
  const pattern = await resolvePattern(v)
  if (pattern) params.pattern = pattern
  const sc = await apiData<S['ScenarioCreated']>('/scenarios', {
    body: {
      name: v.scenarioName,
      operation_id: op,
      schedule_model_code: v.customized ? 'PERSONALIZADO' : v.modelCode,
      labor_agreement_id: ag.id,
      demand_curve_id: curve.id,
      shrinkage_profile_id: shrinkId ?? null,
      shift_template_codes: pattern ? [] : v.shiftCodes,
      team_count: pattern ? Math.min(500, Math.max(1, totalTeams(pattern))) : v.teamCount,
      horizon_start: v.horizonStart,
      horizon_weeks: v.horizonWeeks,
      agreement_8h_confirmed: v.allows8h,
      legal_regime_code: v.legalMode === 'regime' ? v.legalRegimeCode : null,
      legal_reference_date: v.legalMode === 'data' ? v.legalReferenceDate : null,
      compensation_agreement_declared: v.compensation,
      simulate_transition: v.simulateTransition,
      params,
    },
  })
  progress('Calculando cobertura (M1 → M4)…')
  await apiData(`/scenarios/${sc.id}/simulate`, { body: { mode: 'auto' } })
  const withComp = v.roles.filter((r) => r.perTeam > 0)
  if (withComp.length) {
    progress('Aplicando composição por cargo…')
    const teams = await apiData<S['TeamOut'][]>(`/scenarios/${sc.id}/teams`)
    const composition = Object.fromEntries(withComp.map((r) => [r.code, r.perTeam]))
    for (const t of teams) await apiData(`/scenarios/${sc.id}/teams/${t.code}/composition`, { method: 'PUT', body: { composition } })
    await apiData(`/scenarios/${sc.id}/simulate`, { body: { mode: 'auto' } })
  }
  return sc.id
}
