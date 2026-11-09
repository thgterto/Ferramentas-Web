import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { clsx } from 'clsx'
import type { AssignmentOut, S } from '../api/client'
import { WEEKDAYS, fmtDate } from '../api/format'
import { rangeLabel, shiftColor, shiftSegments, toMin } from '../pattern/model'

type Team = S['TeamOut']
type ShiftInfo = { code: string; start: string; duration_min: number; blocks?: unknown[][] }
type Row = { key: string; team: string; label: string; sub?: string }

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Turnos a partir do cenário (``shifts``) ou deduzidos das alocações. */
function shiftCatalog(assignments: AssignmentOut[], shifts: ShiftInfo[] = []): ShiftInfo[] {
  const by = new Map(shifts.map((s) => [s.code, s]))
  for (const a of assignments) {
    if (a.is_day_off || !a.shift_code || by.has(a.shift_code) || !a.starts_at) continue
    by.set(a.shift_code, { code: a.shift_code, start: a.starts_at.slice(11, 16), duration_min: a.clock_minutes || 480 })
  }
  return [...by.values()].sort((a, b) => toMin(a.start) - toMin(b.start) || a.code.localeCompare(b.code))
}

/** Expande turmas em pessoas (A·1, A·2…) com o cargo da composição, na ordem. */
function personRows(teams: Team[], role: string): Row[] {
  const out: Row[] = []
  for (const t of teams) {
    const roles = Object.entries(t.composition ?? {}).flatMap(([r, n]) => Array<string>(n).fill(r))
    const n = Math.max(1, t.size_assigned || roles.length || 1)
    for (let i = 0; i < n; i++) {
      const r = roles[i]
      if (role && r !== role) continue
      out.push({ key: `${t.code}·${i + 1}`, team: t.code, label: `${t.code}·${i + 1}`, sub: r ?? undefined })
    }
  }
  return out
}

/**
 * Quadro de turnos (v3.5): quem trabalha em qual turno, legível.
 * (a) Gantt por dia — linhas = turmas/pessoas, barras coloridas por turno com rótulo de horário;
 * (b) calendário turma × dia com SIGLA + horário ("M 06–14", "F") e legenda (nunca só cor).
 */
export function ShiftBoard({ assignments, teams, shifts, start, weeks, roles = [] }: { assignments: AssignmentOut[]; teams: Team[]; shifts?: ShiftInfo[]; start: string; weeks: number; roles?: { code: string; name: string }[] }) {
  const [view, setView] = useState<'gantt' | 'calendario'>('gantt')
  const [by, setBy] = useState<'turma' | 'pessoa'>('turma')
  const [role, setRole] = useState('')
  const [week, setWeek] = useState(0)
  const [day, setDay] = useState(0)
  const nWeeks = Math.max(1, weeks)
  const cat = useMemo(() => shiftCatalog(assignments, shifts), [assignments, shifts])
  const codes = cat.map((s) => s.code)
  const info = useMemo(() => new Map(cat.map((s) => [s.code, s])), [cat])
  const byKey = useMemo(() => new Map(assignments.map((a) => [`${a.team}|${a.work_date}`, a])), [assignments])
  const teamList = useMemo(() => {
    const fromAsg = [...new Set(assignments.map((a) => a.team).filter(Boolean) as string[])]
    const known = new Map(teams.map((t) => [t.code, t]))
    const codesT = teams.length ? teams.map((t) => t.code) : fromAsg.sort()
    return codesT.map((c) => known.get(c) ?? ({ code: c, kind: 'regular', label: null, size_required: '1', size_assigned: 1, cycle_offset_days: 0, composition: {} } as Team))
  }, [assignments, teams])
  const rows: Row[] = useMemo(() => {
    if (by === 'pessoa') return personRows(teamList, role)
    return teamList.filter((t) => !role || (t.composition?.[role] ?? 0) > 0).map((t) => ({ key: t.code, team: t.code, label: t.code, sub: t.label?.includes('·') ? t.label.split('·')[1].trim() : `${t.size_assigned} pess.` }))
  }, [by, role, teamList])
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, week * 7 + i))
  const date = days[day]
  const prev = addDays(date, -1)

  const label = (a: AssignmentOut | undefined) => {
    if (!a || a.is_day_off || !a.shift_code) return { code: 'F', text: 'Folga', range: '' }
    const s = info.get(a.shift_code)
    const range = s ? rangeLabel(s.start, s.duration_min) : a.starts_at && a.ends_at ? `${a.starts_at.slice(11, 13)}–${a.ends_at.slice(11, 13)}` : ''
    return { code: a.shift_code, text: `${a.shift_code} ${range}`, range }
  }

  // calendário: roving tabindex
  const [act, setAct] = useState<[number, number]>([0, 0])
  const gridRef = useRef<HTMLTableElement>(null)
  const focus = (r: number, c: number) => {
    setAct([r, c])
    gridRef.current?.querySelector<HTMLElement>(`[data-rc="${r}-${c}"]`)?.focus()
  }
  const onGridKey = (e: KeyboardEvent) => {
    const [r, c] = act
    const m: Record<string, [number, number]> = {
      ArrowRight: [r, Math.min(6, c + 1)],
      ArrowLeft: [r, Math.max(0, c - 1)],
      ArrowDown: [Math.min(rows.length - 1, r + 1), c],
      ArrowUp: [Math.max(0, r - 1), c],
      Home: [r, 0],
      End: [r, 6],
    }
    const n = m[e.key]
    if (!n) return
    e.preventDefault()
    focus(n[0], n[1])
  }

  const segBars = (a: AssignmentOut | undefined, spill: boolean) => {
    if (!a || a.is_day_off || !a.shift_code) return []
    const s = info.get(a.shift_code)
    if (!s) return []
    const out: { left: number; width: number; cont: boolean }[] = []
    for (const [x, y] of shiftSegments({ start: s.start, duration_min: s.duration_min, blocks: (s.blocks as [string, number][] | undefined)?.length ? (s.blocks as [string, number][]) : null })) {
      const [a0, b0] = spill ? [x - 1440, y - 1440] : [x, y]
      const lo = Math.max(0, a0)
      const hi = Math.min(1440, b0)
      if (hi > lo) out.push({ left: (lo / 1440) * 100, width: ((hi - lo) / 1440) * 100, cont: spill })
    }
    return out
  }

  const swatch = (c: string) => ({ background: `color-mix(in srgb, ${shiftColor(c, codes)} 30%, rgb(var(--surface)))`, borderLeft: `4px solid ${shiftColor(c, codes)}` })

  return (
    <div className="flex flex-col gap-3" data-testid="quadro-turnos">
      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Visão do quadro" className="flex overflow-hidden rounded-cell border border-border">
          {(
            [
              ['gantt', 'Gantt por dia'],
              ['calendario', 'Calendário turma × dia'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={clsx('px-3 py-1.5', view === v ? 'bg-primary text-white' : 'bg-surface')}>
              {l}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Linhas do quadro" className="flex overflow-hidden rounded-cell border border-border">
          {(
            [
              ['turma', 'Turmas'],
              ['pessoa', 'Pessoas'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={by === v} onClick={() => setBy(v)} className={clsx('px-3 py-1.5', by === v ? 'bg-primary text-white' : 'bg-surface')}>
              {l}
            </button>
          ))}
        </div>
        {roles.length > 0 && (
          <label className="flex flex-col text-caption text-ink-muted">
            Cargo
            <select className="min-h-9 rounded-cell border border-border bg-surface px-3 py-1.5 text-body text-ink" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Todos</option>
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="ml-auto flex items-center gap-2" role="group" aria-label="Navegação por semana">
          <button type="button" className="rounded-cell border border-border px-3 py-1.5 disabled:opacity-50" disabled={week === 0} onClick={() => setWeek(week - 1)} aria-label="Semana anterior">
            ◀
          </button>
          <span className="tabular-nums" aria-live="polite">
            Semana {week + 1} de {nWeeks} · {fmtDate(days[0])}–{fmtDate(days[6])}
          </span>
          <button type="button" className="rounded-cell border border-border px-3 py-1.5 disabled:opacity-50" disabled={week >= nWeeks - 1} onClick={() => setWeek(week + 1)} aria-label="Próxima semana">
            ▶
          </button>
        </div>
      </div>

      <ul aria-label="Legenda dos turnos" className="flex flex-wrap gap-2 text-caption">
        {cat.map((s) => (
          <li key={s.code} className="flex items-center gap-1.5 rounded-cell px-2 py-0.5 text-ink" style={swatch(s.code)}>
            <strong className="font-mono">{s.code}</strong> {rangeLabel(s.start, s.duration_min)} · {s.duration_min / 60} h
          </li>
        ))}
        <li className="pattern-off flex items-center gap-1.5 rounded-cell border border-border bg-surface-2 px-2 py-0.5">
          <strong className="font-mono">F</strong> folga
        </li>
      </ul>

      {view === 'gantt' ? (
        <>
          <div role="group" aria-label="Dia da semana" className="flex flex-wrap gap-1">
            {days.map((d, i) => (
              <button key={d} type="button" aria-pressed={day === i} onClick={() => setDay(i)} className={clsx('rounded-cell border px-3 py-1.5 text-caption tabular-nums', day === i ? 'border-primary bg-primary text-white' : 'border-border bg-surface')}>
                {WEEKDAYS[(new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7]} {d.slice(8, 10)}/{d.slice(5, 7)}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-1 text-caption" aria-label={`Gantt de turnos em ${fmtDate(date)}`}>
              <thead>
                <tr>
                  <th scope="col" className="w-28 text-left">
                    {by === 'turma' ? 'Turma' : 'Pessoa'}
                  </th>
                  <th scope="col" className="text-left">
                    <div className="relative h-4" aria-hidden="true">
                      {Array.from({ length: 9 }, (_, i) => i * 3).map((h) => (
                        <span key={h} className="absolute -translate-x-1/2 tabular-nums text-ink-subtle" style={{ left: `${(h / 24) * 100}%` }}>
                          {String(h).padStart(2, '0')}h
                        </span>
                      ))}
                    </div>
                    <span className="sr-only">Linha do tempo 00h–24h</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const today = byKey.get(`${r.team}|${date}`)
                  const yday = byKey.get(`${r.team}|${prev}`)
                  const lt = label(today)
                  const spill = segBars(yday, true)
                  const bars = segBars(today, false)
                  const off = !today || today.is_day_off
                  const sr = `${off ? 'folga' : lt.text}${spill.length && yday?.shift_code ? `; continua de ontem: ${label(yday).text}` : ''}`
                  return (
                    <tr key={r.key} data-row={r.key}>
                      <th scope="row" className="pr-2 text-left align-middle">
                        <span className="font-semibold">{r.label}</span>
                        {r.sub && <span className="block text-micro font-normal text-ink-subtle">{r.sub}</span>}
                      </th>
                      <td className="align-middle">
                        <div className={clsx('relative h-8 rounded-cell', off && !spill.length ? 'pattern-off bg-surface-2' : 'bg-surface-2')} style={{ backgroundImage: off && !spill.length ? undefined : 'repeating-linear-gradient(90deg, rgb(var(--border)) 0 1px, transparent 1px calc(100% / 24))' }}>
                          <span className="sr-only">{sr}</span>
                          {spill.map((b, j) => (
                            <span key={`s${j}`} aria-hidden="true" className="absolute top-1 flex h-6 items-center overflow-hidden whitespace-nowrap rounded-cell px-1.5 font-semibold text-ink opacity-80" style={{ left: `${b.left}%`, width: `${b.width}%`, ...swatch(yday!.shift_code!) }} title={`${label(yday).text} (desde ontem)`}>
                              ↪ {label(yday).text}
                            </span>
                          ))}
                          {bars.map((b, j) => (
                            <span key={j} aria-hidden="true" data-shift={today?.shift_code} className="absolute top-1 flex h-6 items-center overflow-hidden whitespace-nowrap rounded-cell px-1.5 font-semibold text-ink" style={{ left: `${b.left}%`, width: `${b.width}%`, ...swatch(today!.shift_code!) }} title={lt.text}>
                              {lt.text}
                              {b.left + b.width >= 99.9 && toMin(info.get(today!.shift_code!)?.start ?? '00:00') + (info.get(today!.shift_code!)?.duration_min ?? 0) > 1440 ? ' →' : ''}
                            </span>
                          ))}
                          {off && !spill.length && (
                            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-semibold text-ink-muted">
                              F · folga
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto">
          <table ref={gridRef} role="grid" aria-label={`Calendário de turnos da semana ${week + 1}`} className="w-full min-w-[760px] border-separate border-spacing-1 text-caption" onKeyDown={onGridKey}>
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  {by === 'turma' ? 'Turma' : 'Pessoa'}
                </th>
                {days.map((d) => {
                  const wd = (new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7
                  return (
                    <th key={d} scope="col" className={clsx('text-center font-medium', wd === 6 ? 'text-sev-info' : 'text-ink-muted')}>
                      {WEEKDAYS[wd]} {d.slice(8, 10)}/{d.slice(5, 7)}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={r.key}>
                  <th scope="row" className="pr-2 text-left">
                    <span className="font-semibold">{r.label}</span>
                    {r.sub && <span className="block text-micro font-normal text-ink-subtle">{r.sub}</span>}
                  </th>
                  {days.map((d, ci) => {
                    const a = byKey.get(`${r.team}|${d}`)
                    const lt = label(a)
                    const off = lt.code === 'F'
                    return (
                      <td
                        key={d}
                        role="gridcell"
                        data-rc={`${ri}-${ci}`}
                        tabIndex={act[0] === ri && act[1] === ci ? 0 : -1}
                        onFocus={() => setAct([ri, ci])}
                        aria-label={`${by === 'turma' ? 'Turma' : 'Pessoa'} ${r.label}, ${fmtDate(d)}: ${off ? 'folga' : `turno ${lt.code}, ${lt.range}`}`}
                        className={clsx('h-11 min-w-20 rounded-cell px-1 text-center', off ? 'pattern-off bg-surface-2 text-ink-muted' : 'text-ink')}
                        style={off ? undefined : swatch(lt.code)}
                      >
                        <span aria-hidden="true" className="block font-mono text-body font-bold leading-4">
                          {lt.code}
                        </span>
                        {!off && (
                          <span aria-hidden="true" className="block text-micro tabular-nums">
                            {lt.range}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length === 0 && <p className="text-ink-muted">Nenhuma turma/pessoa com o cargo selecionado.</p>}
    </div>
  )
}
