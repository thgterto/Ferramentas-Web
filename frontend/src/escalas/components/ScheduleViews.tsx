import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { apiBlob, apiData, type AssignmentOut, type S } from '../api/client'
import { carryBefore, monthLabel, monthOf, shiftMonth, type MonthlyMatrix as MM } from '../api/matrix'
import { ShiftBoard } from './ShiftBoard'
import { MonthlyMatrix } from './MonthlyMatrix'
import { ByShiftView } from './ByShiftView'
import { PersonCalendar } from './PersonCalendar'
import { Button, ErrorBox, Spinner } from './ui'
import { download } from './download'

type ViewKey = 'gantt' | 'calendario' | 'matriz' | 'turno' | 'pessoa'
const VIEWS: [ViewKey, string][] = [
  ['gantt', 'Gantt por dia'],
  ['calendario', 'Calendário turma × dia'],
  ['matriz', 'Matriz mensal'],
  ['turno', 'Por turno'],
  ['pessoa', 'Pessoa'],
]
const MONTHLY: ViewKey[] = ['matriz', 'turno', 'pessoa']

type ShiftInfo = { code: string; start: string; duration_min: number; blocks?: unknown[][] }

/**
 * Seletor de visões do resultado (v3.6): Gantt / Calendário (semana do horizonte) e as
 * visões mensais — Matriz mensal (pessoa × dia), Por turno (lista do dia) e Pessoa
 * (calendário individual) — todas com exportação.
 */
export function ScheduleViews({ scenarioId, assignments, teams, shifts, start, weeks, roles = [], initialView = 'gantt' }: { scenarioId: string; assignments: AssignmentOut[]; teams: S['TeamOut'][]; shifts?: ShiftInfo[]; start: string; weeks: number; roles?: { code: string; name: string }[]; initialView?: ViewKey }) {
  const [view, setView] = useState<ViewKey>(initialView)
  const [month, setMonth] = useState(monthOf(start))
  const [person, setPerson] = useState<string | undefined>()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<unknown>(null)
  const monthly = MONTHLY.includes(view)
  const mxQ = useQuery({
    queryKey: ['monthly-matrix', scenarioId, monthly ? month : monthOf(start)],
    queryFn: () => apiData<MM>(`/scenarios/${scenarioId}/monthly-matrix?month=${monthly ? month : monthOf(start)}`),
    retry: false,
  })
  const before = carryBefore(mxQ.data, start)

  const exportMx = async (format: 'xlsx' | 'csv' | 'ics', who?: string) => {
    setBusy(format)
    setErr(null)
    try {
      const q = new URLSearchParams({ month, format })
      if (who) q.set('person', who)
      const { blob, filename } = await apiBlob(`/scenarios/${scenarioId}/monthly-matrix/export?${q}`)
      download(blob, filename)
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div role="group" aria-label="Visão do resultado" className="flex flex-wrap overflow-hidden rounded-cell border border-border">
          {VIEWS.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={clsx('px-3 py-1.5', view === v ? 'bg-primary text-white' : 'bg-surface')}>
              {l}
            </button>
          ))}
        </div>
        {monthly && (
          <div className="flex items-end gap-2" role="group" aria-label="Mês">
            <button type="button" className="rounded-cell border border-border px-3 py-1.5" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
              ◀
            </button>
            <label className="flex flex-col text-caption text-ink-muted">
              Mês/ano
              <input type="month" className="min-h-9 rounded-cell border border-border bg-surface px-3 py-1.5 text-body text-ink" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </label>
            <button type="button" className="rounded-cell border border-border px-3 py-1.5" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
              ▶
            </button>
            <span className="pb-2 text-caption text-ink-muted" aria-live="polite">
              {monthLabel(month)}
            </span>
          </div>
        )}
        {view === 'matriz' && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!!busy} onClick={() => void exportMx('xlsx')}>
              {busy === 'xlsx' ? 'Exportando…' : 'Exportar matriz XLSX'}
            </Button>
            <Button variant="secondary" disabled={!!busy} onClick={() => void exportMx('csv')}>
              {busy === 'csv' ? 'Exportando…' : 'Exportar matriz CSV'}
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimir
            </Button>
          </div>
        )}
      </div>
      <ErrorBox error={err} />
      {(view === 'gantt' || view === 'calendario') && <ShiftBoard view={view} assignments={assignments} teams={teams} shifts={shifts} start={start} weeks={weeks} roles={roles} before={before} />}
      {monthly && (
        <>
          {mxQ.isLoading && <Spinner label="Montando a matriz do mês…" />}
          <ErrorBox error={mxQ.error} />
          {mxQ.data && view === 'matriz' && <MonthlyMatrix data={mxQ.data} />}
          {mxQ.data && view === 'turno' && <ByShiftView key={mxQ.data.month} data={mxQ.data} initialDay={mxQ.data.month === monthOf(start) ? Number(start.slice(8, 10)) - 1 : 0} />}
          {mxQ.data && view === 'pessoa' && <PersonCalendar key={mxQ.data.month} data={mxQ.data} person={person} onPersonChange={setPerson} onExport={(f, who) => void exportMx(f, who)} />}
        </>
      )}
    </div>
  )
}
