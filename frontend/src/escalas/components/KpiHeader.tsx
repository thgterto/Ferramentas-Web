import type { CoverageOut, ScenarioOut } from '../api/client'
import { WEEKDAYS, fmt, pct } from '../api/format'

function peakText(at: string | undefined): string {
  if (!at) return ''
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return at
  const wd = WEEKDAYS[(d.getDay() + 6) % 7]
  return `${wd} ${String(d.getHours()).padStart(2, '0')}:00`
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-36 flex-1 flex-col rounded-card border border-border bg-surface p-3">
      <dt className="text-caption font-medium text-ink-muted">{label}</dt>
      <dd className="text-display font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-caption text-ink-muted">{sub}</dd>}
    </div>
  )
}

/** Cabeçalho de KPIs (FR-14, 04 §8.3). */
export function KpiHeader({ scenario, coverage, errors, alerts }: { scenario: ScenarioOut; coverage?: CoverageOut; errors: number; alerts: number }) {
  const k = coverage?.kpis
  const peak = k?.peak_undercoverage
  const teamsReq = k?.teams_required ?? scenario.kpis.teams_required
  return (
    <section aria-label="Indicadores de cobertura" className="flex flex-col gap-2">
      <dl className="flex flex-wrap gap-3">
        <Kpi label="Horas-posto cobertas" value={pct(k?.pct_hours_covered ?? scenario.kpis.coverage_pct)} sub={coverage?.role ? `cargo ${coverage.role}` : coverage?.view === 'reserva' ? 'postos + reserva' : 'postos'} />
        <Kpi label="Horas-posto em déficit" value={fmt(k?.deficit_post_hours ?? scenario.kpis.deficit_post_hours)} sub={`${k?.deficit_hours ?? scenario.kpis.deficit_hours ?? 0} horas com déficit`} />
        <Kpi label="Pico de subcobertura" value={peak ? `−${fmt(peak.value)}` : '—'} sub={peak ? peakText(peak.at) : 'sem déficit'} />
        <Kpi label="Turmas (atual / necessárias)" value={`${scenario.team_count} / ${teamsReq != null ? fmt(teamsReq, 1) : '—'}`} />
        <Kpi label="Headcount mínimo" value={String(k?.headcount_min ?? scenario.kpis.headcount_min ?? '—')} />
        <Kpi label="Viabilidade" value={`✕${errors} !${alerts}`} sub={`${errors} erro(s) · ${alerts} alerta(s)`} />
      </dl>
    </section>
  )
}
