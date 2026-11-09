import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { clsx } from 'clsx'
import {
  api,
  apiAllCursor,
  apiData,
  type AssignmentOut,
  type CoverageOut,
  type FindingOut,
  type RoleOut,
  type S,
  type ScenarioOut,
  type ScheduleModelOut,
  type TransitionOut,
  type TransitionPhase,
} from '../api/client'
import { fmt, pct, regimeCode, REGIME_LABEL } from '../api/format'
import { Heatmap7x24 } from '../components/Heatmap7x24'
import { KpiHeader } from '../components/KpiHeader'
import { ScheduleCalendar, type CalendarTarget } from '../components/ScheduleCalendar'
import { FindingsPanel } from '../components/FindingsPanel'
import { TransitionBlock } from '../components/TransitionBlock'
import { ExportMenu } from '../components/ExportMenu'
import { ComplianceBadge } from '../components/ComplianceBadge'
import { ErrorBox, Spinner, inputCls } from '../components/ui'
import { useLegalRegimes } from '../wizard/useRegime'
import { defaultShifts } from '../wizard/shifts'
import { presenceAtSlot, presenceByHour } from '../api/schedule'
import { ShiftBoard } from '../components/ShiftBoard'

const TABS = [
  ['cobertura', 'Cobertura'],
  ['quadro', 'Quadro de turnos'],
  ['escala', 'Escala'],
  ['viabilidade', 'Viabilidade'],
  ['transicao', 'Simular transição'],
] as const
type Tab = (typeof TABS)[number][0]


const COPY_EMPTY = 'Este cenário ainda não foi calculado.'

export default function ResultPage() {
  const { org, op, id = '', aba = 'cobertura' } = useParams()
  const tab = (TABS.some(([k]) => k === aba) ? aba : 'cobertura') as Tab
  const nav = useNavigate()
  const base = `/escalas/o/${org}/operacoes/${op}/cenarios/${id}`
  const [view, setView] = useState<'postos' | 'reserva'>('postos')
  const [agg, setAgg] = useState<'pior' | 'media'>('pior')
  const [role, setRole] = useState<string>('')
  const [target, setTarget] = useState<CalendarTarget | null>(null)
  const [creating, setCreating] = useState<string | null>(null)

  const sQ = useQuery({ queryKey: ['scenario', id], queryFn: () => apiData<ScenarioOut>(`/scenarios/${id}`) })
  const calculated = !!sQ.data?.calculated_at
  const covQ = useQuery({
    queryKey: ['coverage', id, view, agg, role],
    queryFn: () => apiData<CoverageOut>(`/scenarios/${id}/coverage?view=${view}&agg=${agg}${role ? `&role=${encodeURIComponent(role)}` : ''}`),
    enabled: calculated,
    retry: false,
  })
  const fQ = useQuery({ queryKey: ['findings', id], queryFn: () => apiAllCursor<FindingOut>(`/scenarios/${id}/compliance-findings`), enabled: calculated })
  const aQ = useQuery({ queryKey: ['assignments', id], queryFn: () => apiAllCursor<AssignmentOut>(`/scenarios/${id}/assignments`), enabled: calculated })
  const rolesQ = useQuery({ queryKey: ['roles'], queryFn: () => api<{ data: RoleOut[] }>('/roles?per_page=200') })
  const regimesQ = useLegalRegimes()
  const showTransition = tab === 'transicao' || (tab === 'cobertura' && !!sQ.data?.simulate_transition)
  const tQ = useQuery({
    queryKey: ['transition', id],
    queryFn: () => apiData<TransitionOut>(`/scenarios/${id}/transition`, { body: { recommend: true, allow_half_teams: true } }),
    enabled: calculated && showTransition,
    staleTime: Infinity,
  })
  const modelsQ = useQuery({ queryKey: ['schedule-models'], queryFn: () => apiData<ScheduleModelOut[]>('/schedule-models'), staleTime: Infinity })

  const presence = useMemo(() => presenceByHour(aQ.data ?? [], sQ.data?.horizon_start ?? '2000-01-03'), [aQ.data, sQ.data?.horizon_start])
  const sizeOf = useMemo(() => {
    const m = new Map((sQ.data?.teams ?? []).map((t) => [t.code, Number(t.size_required) || t.size_assigned || 1]))
    return (team: string) => m.get(team) ?? 1
  }, [sQ.data?.teams])
  const teamCodes = useMemo(() => {
    const fromAsg = [...new Set((aQ.data ?? []).map((a) => a.team).filter(Boolean) as string[])].sort()
    return fromAsg.length ? fromAsg : (sQ.data?.teams ?? []).map((t) => t.code)
  }, [aQ.data, sQ.data])

  if (sQ.isLoading) return <Spinner label="Carregando cenário…" />
  if (sQ.error) return <ErrorBox error={sQ.error} />
  const sc = sQ.data!
  const findings = fQ.data ?? []
  const errors = findings.filter((f) => f.severity === 'erro').length
  const alerts = findings.filter((f) => f.severity === 'alerta').length
  const applied = regimeCode(sc.legal_regime_applied)
  const appliedRegime = regimesQ.data?.find((r) => r.code === applied)
  const model = modelsQ.data?.find((m) => m.code === sc.schedule_model.code)

  const goTo = (f: FindingOut) => {
    if (!f.occurs_on) return
    nav(`${base}/escala`)
    setTarget({ date: f.occurs_on, team: f.team, nonce: Date.now() })
  }

  const createPhase = async (p: TransitionPhase) => {
    const rec = p.scenario_model?.compliant ? null : p.recommended
    const code = rec?.code ?? sc.schedule_model.code
    const m = modelsQ.data?.find((x) => x.code === code)
    setCreating(p.regime)
    try {
      const created = await apiData<S['ScenarioCreated']>('/scenarios', {
        body: {
          name: `${sc.name} · ${REGIME_LABEL[regimeCode(p.regime)] ?? p.regime}`,
          operation_id: sc.operation_id,
          schedule_model_code: code,
          labor_agreement_id: sc.labor_agreement_id,
          demand_curve_id: sc.demand_curve_id,
          shrinkage_profile_id: sc.shrinkage_profile_id,
          shift_template_codes: m ? defaultShifts(m) : ['M', 'T', 'N'],
          team_count: rec ? Math.ceil(Number(rec.teams_required)) : sc.team_count,
          horizon_start: sc.horizon_start,
          horizon_weeks: sc.horizon_weeks,
          legal_regime_code: regimeCode(p.regime),
          compensation_agreement_declared: sc.compensation_agreement_declared,
          params: sc.params,
        },
      })
      await apiData(`/scenarios/${created.id}/simulate`, { body: { mode: 'auto' } })
      nav(`/escalas/o/${org}/operacoes/${op}/cenarios/${created.id}/cobertura`)
    } finally {
      setCreating(null)
    }
  }

  const transition = (
    <div aria-busy={tQ.isFetching}>
      {tQ.isFetching && <Spinner label="Simulando 44 h → 42 h → 40 h…" />}
      <ErrorBox error={tQ.error} />
      {tQ.data && <TransitionBlock data={tQ.data} regimes={regimesQ.data ?? []} current={applied} onCreatePhase={(p) => void createPhase(p)} />}
      {creating && <Spinner label="Criando cenário da fase…" />}
    </div>
  )

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 font-semibold">{sc.name}</h1>
          <p className="text-caption text-ink-muted">
            {sc.schedule_model.code === 'PERSONALIZADO' ? `Personalizado “${(sc.params as { pattern?: { name?: string } }).pattern?.name ?? ''}”` : sc.schedule_model.code} · {sc.teams.length || sc.team_count} turmas
            {(sc.layers?.length ?? 0) > 1 ? ` em ${sc.layers!.length} camadas (${sc.layers!.map((l) => `${l.code} K=${l.k}`).join(' + ')})` : ''} · v{sc.version} · regime {sc.legal_regime_applied ?? '—'}
            {sc.calculated_at && ` · calculado ${new Date(sc.calculated_at).toLocaleString('pt-BR')}`}
          </p>
        </div>
        {calculated && <ExportMenu scenarioId={id} />}
      </header>
      {!calculated && <p className="text-ink-muted">{COPY_EMPTY}</p>}
      {calculated && <KpiHeader scenario={sc} coverage={covQ.data} errors={errors} alerts={alerts} />}
      {calculated && covQ.data && (
        <p className="text-body" aria-live="polite">
          {pct(covQ.data.kpis.pct_hours_covered)} das horas-posto cobertas · {covQ.data.kpis.deficit_hours} horas com déficit
          {covQ.data.kpis.peak_undercoverage ? ` · pico −${fmt(covQ.data.kpis.peak_undercoverage.value)}` : ''}
          {sc.kpis.teams_required && Number(sc.kpis.teams_required) > sc.team_count ? ` · Como fechar o déficit: ${Math.ceil(Number(sc.kpis.teams_required))} turmas` : ''}
        </p>
      )}
      <div role="tablist" aria-label="Resultado" className="flex gap-1 border-b border-border">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            type="button"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`painel-${k}`}
            onClick={() => nav(`${base}/${k}`)}
            className={clsx('-mb-px border-b-2 px-4 py-2', tab === k ? 'border-primary font-semibold text-primary' : 'border-transparent text-ink-muted')}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`painel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex flex-col gap-4">
        {calculated && tab === 'cobertura' && (
          <>
            <div className="flex flex-wrap items-end gap-4 rounded-card border border-border bg-surface p-3">
              <label className="flex flex-col text-caption text-ink-muted">
                Cargo
                <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">Todos</option>
                  {(rolesQ.data?.data ?? []).map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </label>
              <div role="group" aria-label="Visão" className="flex overflow-hidden rounded-cell border border-border">
                {(['postos', 'reserva'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={clsx('px-3 py-1.5', view === v ? 'bg-primary text-white' : 'bg-surface')}>
                    {v === 'postos' ? 'Postos' : 'Postos + reserva'}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Agregação do horizonte" className="flex overflow-hidden rounded-cell border border-border">
                {(['pior', 'media'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={agg === v} onClick={() => setAgg(v)} className={clsx('px-3 py-1.5', agg === v ? 'bg-primary text-white' : 'bg-surface')}>
                    {v === 'pior' ? 'Pior caso' : 'Média'}
                  </button>
                ))}
              </div>
            </div>
            <ErrorBox error={covQ.error} />
            <div className="rounded-card border border-border bg-surface p-4">
              {covQ.isLoading && <Spinner label="Calculando cobertura…" />}
              {covQ.data && (
                <Heatmap7x24
                  slots={covQ.data.slots}
                  weeks={sc.horizon_weeks}
                  presenceAt={role || !aQ.data ? undefined : (i) => presenceAtSlot(presence, i, sc.horizon_start, sc.horizon_weeks, sizeOf, view === 'postos' && agg === 'pior' ? Number(covQ.data.slots[i]?.scheduled_worst) : undefined)}
                  caption={`Cobertura 7×24 · ${view === 'postos' ? 'postos' : 'postos + reserva'} · ${agg === 'pior' ? 'pior caso' : 'média'}${role ? ` · cargo ${role}` : ''}`}
                />
              )}
            </div>
            {showTransition && transition}
          </>
        )}
        {calculated && tab === 'quadro' && (
          <div className="rounded-card border border-border bg-surface p-4">
            <h2 className="mb-2 text-h2 font-semibold">Quadro de turnos</h2>
            {aQ.isLoading ? (
              <Spinner />
            ) : (
              <ShiftBoard assignments={aQ.data ?? []} teams={sc.teams} shifts={sc.shifts} start={sc.horizon_start} weeks={sc.horizon_weeks} roles={(rolesQ.data?.data ?? []).map((r) => ({ code: r.code, name: r.name }))} />
            )}
          </div>
        )}
        {calculated && tab === 'escala' && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
            <div className="rounded-card border border-border bg-surface p-4">
              <h2 className="mb-2 text-h2 font-semibold">Calendário das turmas</h2>
              {aQ.isLoading ? <Spinner /> : <ScheduleCalendar assignments={aQ.data ?? []} teams={teamCodes} start={sc.horizon_start} weeks={sc.horizon_weeks} findings={findings} target={target} />}
            </div>
            <div className="rounded-card border border-border bg-surface p-4">
              <FindingsPanel findings={findings} onGoTo={goTo} />
            </div>
          </div>
        )}
        {calculated && tab === 'viabilidade' && (
          <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2 text-body">
              <span className="font-semibold">Regime aplicado:</span>
              <code className="font-mono">{sc.legal_regime_applied ?? '—'}</code>
              {appliedRegime && <span className="text-ink-muted">{appliedRegime.name}</span>}
              {model && <ComplianceBadge status={errors > 0 && findings.some((f) => f.rule_code.startsWith('CLT_')) ? 'nao_conforme' : 'conforme'} />}
              {appliedRegime?.status === 'premissa' && <span className="rounded-full border border-sev-info bg-sev-info-bg px-2 text-caption text-sev-info">ⓘ premissa</span>}
            </div>
            <FindingsPanel findings={findings} onGoTo={goTo} />
          </div>
        )}
        {calculated && tab === 'transicao' && transition}
      </div>
    </div>
  )
}
