import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { clsx } from 'clsx'
import type { AssignmentOut, FindingOut } from '../api/client'
import { WEEKDAYS, fmtDate } from '../api/format'

const TURMA_VARS = ['a', 'b', 'c', 'd', 'e', 'f']
const SHAPES = ['●', '■', '▲', '◆', '⬢', '★']

export type CalendarTarget = { date: string; team?: string | null; nonce: number }

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const weekdayOf = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7

/** Calendário turma × dia (04 §8.2), até 8 semanas; marcadores de achados inline. */
export function ScheduleCalendar({
  assignments,
  teams,
  start,
  weeks,
  findings = [],
  target,
}: {
  assignments: AssignmentOut[]
  teams: string[]
  start: string
  weeks: number
  findings?: FindingOut[]
  target?: CalendarTarget | null
}) {
  const nDays = Math.min(8, Math.max(1, weeks)) * 7
  const days = useMemo(() => Array.from({ length: nDays }, (_, i) => addDays(start, i)), [start, nDays])
  const byKey = useMemo(() => new Map(assignments.map((a) => [`${a.team}|${a.work_date}`, a])), [assignments])
  const marks = useMemo(() => {
    const m = new Map<string, FindingOut[]>()
    for (const f of findings) {
      if (!f.occurs_on) continue
      const keys = f.team ? [`${f.team}|${f.occurs_on}`] : teams.map((t) => `${t}|${f.occurs_on}`)
      for (const k of keys) m.set(k, [...(m.get(k) ?? []), f])
    }
    return m
  }, [findings, teams])
  const [active, setActive] = useState<[number, number]>([0, 0])
  const ref = useRef<HTMLTableElement>(null)

  const focus = (r: number, c: number) => {
    setActive([r, c])
    ref.current?.querySelector<HTMLElement>(`[data-rc="${r}-${c}"]`)?.focus()
  }

  useEffect(() => {
    if (!target) return
    const c = days.indexOf(target.date)
    if (c < 0) return
    const r = Math.max(0, target.team ? teams.indexOf(target.team) : 0)
    focus(r, c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  const onKey = (e: KeyboardEvent) => {
    const [r, c] = active
    const map: Record<string, [number, number]> = {
      ArrowRight: [r, Math.min(nDays - 1, c + 1)],
      ArrowLeft: [r, Math.max(0, c - 1)],
      ArrowDown: [Math.min(teams.length - 1, r + 1), c],
      ArrowUp: [Math.max(0, r - 1), c],
      Home: [r, 0],
      End: [r, nDays - 1],
      PageDown: [r, Math.min(nDays - 1, c + 7)],
      PageUp: [r, Math.max(0, c - 7)],
    }
    const n = map[e.key]
    if (!n) return
    e.preventDefault()
    focus(n[0], n[1])
  }

  return (
    <div className="overflow-x-auto">
      <table ref={ref} role="grid" aria-label={`Calendário das turmas, ${nDays} dias a partir de ${fmtDate(start)}`} className="border-separate border-spacing-0.5 text-micro" onKeyDown={onKey}>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 bg-surface px-1 text-left text-caption">
              Turma
            </th>
            {days.map((d, i) => {
              const wd = weekdayOf(d)
              return (
                <th key={d} scope="col" className={clsx('min-w-8 px-0.5 text-center font-medium', wd === 6 ? 'text-sev-info' : 'text-ink-subtle', i % 7 === 0 && i > 0 && 'border-l-2 border-border')}>
                  <abbr title={fmtDate(d)} className="no-underline">
                    {WEEKDAYS[wd]}
                    <br />
                    {d.slice(8, 10)}
                  </abbr>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {teams.map((t, r) => {
            const idx = Math.max(0, t.charCodeAt(0) - 65) % 6
            return (
              <tr key={t}>
                <th scope="row" className="sticky left-0 bg-surface px-1 text-left text-caption font-semibold">
                  <span aria-hidden="true" style={{ color: `var(--turma-${TURMA_VARS[idx]})` }}>
                    {SHAPES[idx]}{' '}
                  </span>
                  {t}
                </th>
                {days.map((d, c) => {
                  const a = byKey.get(`${t}|${d}`)
                  const fs = marks.get(`${t}|${d}`) ?? []
                  const sev = fs.some((f) => f.severity === 'erro') ? 'erro' : fs.some((f) => f.severity === 'alerta') ? 'alerta' : fs.length ? 'info' : null
                  const off = !a || a.is_day_off
                  const code = off ? 'F' : a.shift_code ?? '?'
                  const sunday = weekdayOf(d) === 6
                  const y = c > 0 ? byKey.get(`${t}|${days[c - 1]}`) : undefined
                  const carry = y && !y.is_day_off && y.shift_code && y.ends_at && y.ends_at.slice(0, 10) > y.work_date ? y.shift_code : null
                  const label = `Turma ${t}, ${fmtDate(d)}${sunday ? ' (domingo)' : ''}: ${off ? 'folga' : `turno ${code}`}${carry ? `; continua de ontem: ${carry}` : ''}${fs.length ? `; ${fs.length} achado(s): ${fs.map((f) => f.rule_code).join(', ')}` : ''}`
                  return (
                    <td
                      key={d}
                      role="gridcell"
                      data-rc={`${r}-${c}`}
                      data-date={d}
                      data-team={t}
                      tabIndex={active[0] === r && active[1] === c ? 0 : -1}
                      aria-label={label}
                      onFocus={() => setActive([r, c])}
                      onClick={() => focus(r, c)}
                      className={clsx(
                        'relative h-7 min-w-8 rounded-cell text-center font-semibold tabular-nums',
                        off ? 'pattern-off bg-surface-2 text-ink-muted' : 'text-ink',
                        sunday && 'ring-1 ring-sev-info/60',
                        c % 7 === 0 && c > 0 && 'border-l-2 border-border',
                      )}
                      style={off ? undefined : { background: `color-mix(in srgb, var(--turma-${TURMA_VARS[idx]}) 22%, rgb(var(--surface)))`, borderBottom: `2px solid var(--turma-${TURMA_VARS[idx]})` }}
                    >
                      <span aria-hidden="true">{code}</span>
                      {carry && (
                        <span aria-hidden="true" title={`← ${carry} continua de ontem`} className="absolute -left-0.5 -top-1 text-micro text-ink-muted">
                          ←
                        </span>
                      )}
                      {sev && (
                        <span aria-hidden="true" className={clsx('absolute -right-0.5 -top-1 text-micro', sev === 'erro' ? 'text-sev-erro' : sev === 'alerta' ? 'text-sev-alerta' : 'text-sev-info')}>
                          {sev === 'erro' ? '✕' : sev === 'alerta' ? '!' : 'i'}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
