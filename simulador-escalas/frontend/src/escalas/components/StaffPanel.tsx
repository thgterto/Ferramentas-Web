import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { apiData, type S } from '../api/client'
import { fmt, pct } from '../api/format'
import { monthLabel, monthOf, shiftMonth } from '../api/matrix'
import { Button, ErrorBox, Spinner, inputCls } from './ui'

type StaffingOut = S['StaffingOut']
type RestReportOut = S['RestReportOut']

const COMPONENT_LABEL: Record<string, string> = {
  ferias: 'Férias',
  feriados: 'Feriados não trabalhados',
  absenteismo: 'Absenteísmo',
  treinamento: 'Treinamento',
  passagem: 'Passagem de turno',
}
const EQUITY_LABEL: Record<string, string> = {
  rest_days: 'Folgas',
  sundays_worked: 'Domingos trabalhados',
  holidays_worked: 'Feriados trabalhados',
  nights: 'Noites',
  hours: 'Horas',
}
const STATUS: Record<StaffingOut['status'], { label: string; cls: string; icon: string }> = {
  suficiente: { label: 'Quadro suficiente', cls: 'border-sev-ok bg-sev-ok-bg text-sev-ok', icon: '✓' },
  sem_reserva: { label: 'Cobre o mínimo, sem reserva', cls: 'border-sev-alerta bg-sev-alerta-bg text-sev-alerta', icon: '▲' },
  insuficiente: { label: 'Quadro insuficiente', cls: 'border-sev-erro bg-sev-erro-bg text-sev-erro', icon: '✕' },
}

type Form = { weekly: string; vacation: string; holidays: string; absent: string; training: string; handover: string }
const INITIAL: Form = { weekly: '', vacation: '30', holidays: '0', absent: '0', training: '0', handover: '0' }

const dec = (v: string) => String(Number(v.replace(',', '.')) || 0)

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-cell border border-border bg-surface-2 p-3">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-h2 font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="text-caption text-ink-subtle">{hint}</dd>}
    </div>
  )
}

function NumField({ id, label, value, onChange, step = '1', hint }: { id: string; label: string; value: string; onChange: (v: string) => void; step?: string; hint?: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-caption text-ink-muted">
      {label}
      <input id={id} type="number" min="0" step={step} inputMode="decimal" className={clsx(inputCls, 'w-full')} value={value} placeholder={hint} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

/** Calculadora de quadro (FR-51): horas do posto × horas úteis por colaborador. */
export function StaffingCalculator({ scenarioId }: { scenarioId: string }) {
  const [form, setForm] = useState<Form>(INITIAL)
  const [sent, setSent] = useState<Form>(INITIAL)
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const q = useQuery({
    queryKey: ['staffing', scenarioId, sent],
    queryFn: () =>
      apiData<StaffingOut>(`/scenarios/${scenarioId}/staffing`, {
        body: {
          ...(sent.weekly ? { weekly_hours: dec(sent.weekly) } : {}),
          vacation_days: dec(sent.vacation),
          holidays_days: dec(sent.holidays),
          absenteeism_pct: String((Number(dec(sent.absent)) / 100).toFixed(4)),
          training_hours: dec(sent.training),
          handover_min: dec(sent.handover),
        },
      }),
    retry: false,
    placeholderData: (prev) => prev,
  })
  const d = q.data
  const st = d ? STATUS[d.status] : null
  return (
    <section aria-labelledby="quadro-titulo" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <div>
        <h2 id="quadro-titulo" className="text-h2 font-semibold">
          Calculadora de quadro
        </h2>
        <p className="text-caption text-ink-muted">Horas que os postos exigem ÷ horas que cada pessoa entrega depois de férias, feriados, ausências e treinamento.</p>
      </div>
      <form
        className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 xl:grid-cols-7"
        onSubmit={(e) => {
          e.preventDefault()
          setSent(form)
        }}
      >
        <NumField id="st-weekly" label="Horas semanais por pessoa" value={form.weekly} onChange={set('weekly')} step="0.5" hint={d ? `${fmt(d.weekly_hours, 2)} (modelo)` : 'do modelo'} />
        <NumField id="st-vacation" label="Férias (dias/ano)" value={form.vacation} onChange={set('vacation')} />
        <NumField id="st-holidays" label="Feriados não trabalhados (dias/ano)" value={form.holidays} onChange={set('holidays')} />
        <NumField id="st-absent" label="Absenteísmo (%)" value={form.absent} onChange={set('absent')} step="0.1" />
        <NumField id="st-training" label="Treinamento (h/ano)" value={form.training} onChange={set('training')} />
        <NumField id="st-handover" label="Passagem de turno (min)" value={form.handover} onChange={set('handover')} />
        <Button type="submit" disabled={q.isFetching}>
          {q.isFetching ? 'Calculando…' : 'Calcular quadro'}
        </Button>
      </form>
      <ErrorBox error={q.error} />
      {q.isLoading && <Spinner label="Calculando o quadro…" />}
      {d && st && (
        <>
          <p data-testid="staffing-status" className={clsx('inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-body font-medium', st.cls)}>
            <span aria-hidden="true">{st.icon}</span>
            {st.label}:{' '}
            {d.headcount_gap > 0 ? `faltam ${d.headcount_gap} pessoa(s) para o quadro recomendado` : d.headcount_gap < 0 ? `${-d.headcount_gap} pessoa(s) acima do recomendado` : 'igual ao recomendado'}
          </p>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Quadro atual" value={String(d.headcount_current)} hint="pessoas nas turmas do cenário" />
            <Stat label="Equipe mínima" value={String(d.headcount_min)} hint={`${fmt(d.post_hours_week, 0)} h-posto/sem ÷ ${fmt(d.weekly_hours, 2)} h`} />
            <Stat label="Equipe recomendada" value={String(d.headcount_recommended)} hint={`mínima ÷ (1 − ${pct(d.unavailability_rate)}) · reserva de ${d.reserve}`} />
            <Stat label="Fator de cobertura" value={fmt(d.coverage_factor, 2)} hint={d.people_per_post ? `${fmt(d.people_per_post, 2)} pessoas por posto` : undefined} />
          </dl>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <table className="w-full text-body" aria-label="Componentes da indisponibilidade">
              <caption className="pb-1 text-left text-caption text-ink-muted">Indisponibilidade prevista por colaborador</caption>
              <thead>
                <tr className="border-b border-border text-left text-caption text-ink-muted">
                  <th scope="col" className="py-1 font-medium">
                    Componente
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Taxa
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Horas/ano
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.components.map((c) => (
                  <tr key={c.code} className="border-b border-border">
                    <th scope="row" className="py-1 text-left font-normal">
                      {COMPONENT_LABEL[c.code] ?? c.code}
                    </th>
                    <td className="py-1 text-right tabular-nums">{pct(c.rate)}</td>
                    <td className="py-1 text-right tabular-nums">{fmt(c.hours_per_year, 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <th scope="row" className="py-1 text-left">
                    Total
                  </th>
                  <td className="py-1 text-right tabular-nums">{pct(d.unavailability_rate)}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(Number(d.contracted_hours_year) - Number(d.net_hours_year), 0)}</td>
                </tr>
              </tfoot>
            </table>
            <dl className="grid grid-cols-[1fr_auto] content-start gap-x-4 gap-y-1 text-body">
              <dt className="text-ink-muted">Horas anuais exigidas pelos postos</dt>
              <dd className="text-right tabular-nums">{fmt(d.post_hours_year, 0)}</dd>
              <dt className="text-ink-muted">Postos simultâneos (média)</dt>
              <dd className="text-right tabular-nums">{fmt(d.simultaneous_posts_avg, 2)}</dd>
              <dt className="text-ink-muted">Horas contratadas por pessoa/ano</dt>
              <dd className="text-right tabular-nums">{fmt(d.contracted_hours_year, 0)}</dd>
              <dt className="text-ink-muted">Horas úteis por pessoa/ano</dt>
              <dd className="text-right tabular-nums">{fmt(d.net_hours_year, 0)}</dd>
              <dt className="text-ink-muted">Limite semanal do regime ({d.legal_regime})</dt>
              <dd className="text-right tabular-nums">{fmt(d.legal_weekly_hours, 1)} h</dd>
            </dl>
          </div>
        </>
      )}
    </section>
  )
}

/** Folgas e indicadores por colaborador no mês + pendências de fechamento (FR-52/53). */
export function RestReport({ scenarioId, start }: { scenarioId: string; start: string }) {
  const [month, setMonth] = useState(monthOf(start))
  const [weekly, setWeekly] = useState('')
  const [maxRun, setMaxRun] = useState('')
  const q = useQuery({
    queryKey: ['rest-report', scenarioId, month, weekly, maxRun],
    queryFn: () => {
      const p = new URLSearchParams({ month })
      if (weekly) p.set('weekly_rest_days', weekly)
      if (maxRun) p.set('max_consecutive_days', maxRun)
      return apiData<RestReportOut>(`/scenarios/${scenarioId}/rest-report?${p}`)
    },
    retry: false,
    placeholderData: (prev) => prev,
  })
  const d = q.data
  return (
    <section aria-labelledby="folgas-titulo" className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
      <div>
        <h2 id="folgas-titulo" className="text-h2 font-semibold">
          Folgas e fechamento do mês
        </h2>
        <p className="text-caption text-ink-muted">Folgas mínimas do mês = dias × folgas por semana ÷ 7. A escala só fecha sem folgas pendentes, sem excesso de dias consecutivos e sem déficit de cobertura.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-end gap-2" role="group" aria-label="Mês do relatório">
          <button type="button" className="rounded-cell border border-border px-3 py-1.5" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
            ◀
          </button>
          <label className="flex flex-col text-caption text-ink-muted">
            Mês/ano
            <input type="month" className={inputCls} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </label>
          <button type="button" className="rounded-cell border border-border px-3 py-1.5" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
            ▶
          </button>
        </div>
        <label className="flex flex-col text-caption text-ink-muted">
          Folgas por semana
          <select className={inputCls} value={weekly} onChange={(e) => setWeekly(e.target.value)}>
            <option value="">Do regime do cenário</option>
            <option value="1">1 por semana</option>
            <option value="2">2 por semana</option>
            <option value="3">3 por semana</option>
          </select>
        </label>
        <label className="flex flex-col text-caption text-ink-muted">
          Máx. dias consecutivos
          <select className={inputCls} value={maxRun} onChange={(e) => setMaxRun(e.target.value)}>
            <option value="">6 (padrão)</option>
            {[4, 5, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-caption text-ink-muted" aria-live="polite">
          {monthLabel(month)}
          {d ? ` · mínimo de ${d.rule.min_rest_days_month} folgas (${fmt(d.rule.weekly_rest_days, 1)}/semana, ${d.rule.source === 'regime' ? `regime ${d.rule.legal_regime}` : 'informado'})` : ''}
        </span>
      </div>
      <ErrorBox error={q.error} />
      {q.isLoading && <Spinner label="Apurando as folgas do mês…" />}
      {d && (
        <>
          <div data-testid="closing-status" className={clsx('rounded-card border px-3 py-2 text-body', d.can_close ? 'border-sev-ok bg-sev-ok-bg text-sev-ok' : 'border-sev-erro bg-sev-erro-bg text-sev-erro')}>
            <p className="font-semibold">
              <span aria-hidden="true">{d.can_close ? '✓ ' : '✕ '}</span>
              {d.can_close ? 'Escala do mês pronta para fechar' : 'Escala do mês com pendências de fechamento'}
            </p>
            {d.blockers.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {d.blockers.map((b) => (
                  <li key={b.code}>{b.message}</li>
                ))}
              </ul>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Índice de cobertura (pior dia/turno)" value={d.coverage.coverage_index_min == null ? '—' : fmt(d.coverage.coverage_index_min, 2)} hint="pessoas ÷ mínimo · abaixo de 1 = déficit" />
            <Stat label="Índice de cobertura (média)" value={d.coverage.coverage_index_mean == null ? '—' : fmt(d.coverage.coverage_index_mean, 2)} />
            <Stat label="Horas com déficit" value={String(d.coverage.deficit_hours)} hint={`${d.coverage.days_with_deficit} dia(s) do mês`} />
            <Stat label="Pessoas com pendência" value={String(d.people.filter((p) => p.alerts.length).length)} hint={`de ${d.people.length}`} />
          </dl>
          <table className="w-full max-w-2xl text-body" aria-label="Equidade da distribuição">
            <caption className="pb-1 text-left text-caption text-ink-muted">Equidade entre colaboradores (1,00 = distribuição igual)</caption>
            <thead>
              <tr className="border-b border-border text-left text-caption text-ink-muted">
                <th scope="col" className="py-1 font-medium">
                  Indicador
                </th>
                {['Mín.', 'Média', 'Máx.', 'Índice'].map((h) => (
                  <th key={h} scope="col" className="py-1 text-right font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.equity.map((e) => (
                <tr key={e.metric} className="border-b border-border">
                  <th scope="row" className="py-1 text-left font-normal">
                    {EQUITY_LABEL[e.metric] ?? e.metric}
                  </th>
                  <td className="py-1 text-right tabular-nums">{fmt(e.min, 1)}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(e.mean, 1)}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(e.max, 1)}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(e.index, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-body" aria-label="Folgas por colaborador">
              <caption className="pb-1 text-left text-caption text-ink-muted">
                Por colaborador{d.generated_people ? ' (pessoas fictícias por turma — cadastre os colaboradores para ver os nomes reais)' : ''}
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-caption text-ink-muted">
                  <th scope="col" className="py-1 font-medium">
                    Pessoa
                  </th>
                  <th scope="col" className="py-1 font-medium">
                    Turma
                  </th>
                  {['Dias trab.', 'Folgas', 'Mín.', 'Pendentes', 'Máx. seguidos', 'Horas', 'Domingos', 'Feriados', 'Noites', 'Fins de sem. livres'].map((h) => (
                    <th key={h} scope="col" className="py-1 text-right font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.people.map((p) => {
                  const pend = p.pending_rest_days > 0
                  const run = p.alerts.includes('FOL_DIAS_CONSECUTIVOS')
                  return (
                    <tr key={p.id} className="border-b border-border">
                      <th scope="row" className="py-1 text-left font-normal">
                        {p.name}
                        {p.role ? <span className="text-ink-subtle"> · {p.role}</span> : null}
                      </th>
                      <td className="py-1">{p.team}</td>
                      <td className="py-1 text-right tabular-nums">{p.worked_days}</td>
                      <td className="py-1 text-right tabular-nums">{p.rest_days}</td>
                      <td className="py-1 text-right tabular-nums">{p.min_rest_days}</td>
                      <td className={clsx('py-1 text-right tabular-nums', pend && 'font-semibold text-sev-erro')}>{pend ? `✕ ${p.pending_rest_days}` : '0'}</td>
                      <td className={clsx('py-1 text-right tabular-nums', run && 'font-semibold text-sev-erro')}>{run ? `✕ ${p.max_consecutive_days}` : p.max_consecutive_days}</td>
                      <td className="py-1 text-right tabular-nums">{fmt(p.hours, 1)}</td>
                      <td className="py-1 text-right tabular-nums">{p.sundays_worked}</td>
                      <td className="py-1 text-right tabular-nums">{p.holidays_worked}</td>
                      <td className="py-1 text-right tabular-nums">{p.nights}</td>
                      <td className="py-1 text-right tabular-nums">{p.weekends_off}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
