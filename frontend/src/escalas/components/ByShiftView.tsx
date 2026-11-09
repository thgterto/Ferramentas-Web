import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { WEEKDAYS_LONG, fmtDate } from '../api/format'
import { swatchOf, type MonthlyMatrix } from '../api/matrix'
import { shiftColor } from '../pattern/model'

/**
 * Visão "Por turno" (v3.6): para cada dia, quem está em cada turno (lista agrupada por
 * turma), quem continua a noite de ontem e quem folga — com necessário × escalados.
 * v3.7: agrupar por subsetor (onde a pessoa trabalhou no dia, com posição; ⇄ = remanejado).
 */
export function ByShiftView({ data, initialDay = 0 }: { data: MonthlyMatrix; initialDay?: number }) {
  const [day, setDay] = useState(Math.min(initialDay, data.days.length - 1))
  const hasSub = (data.subsectors?.length ?? 0) > 0
  const [groupBy, setGroupBy] = useState<'turma' | 'subsetor'>(hasSub ? 'subsetor' : 'turma')
  const subName = useMemo(() => new Map((data.subsectors ?? []).map((x) => [x.code, x.name])), [data.subsectors])
  const codes = data.shifts.map((s) => s.code)
  const d = data.days[day]
  const daily = data.daily[day]
  const groups = useMemo(() => {
    const by = (pred: (i: number) => boolean) => {
      const out = new Map<string, string[]>()
      data.people.forEach((p, i) => {
        if (!pred(i)) return
        const c = p.cells[day]
        const where = c.moved ? c.subsector : p.subsector
        const key = groupBy === 'subsetor' && where ? `Subsetor ${subName.get(where) ?? where}` : `Turma ${p.team}`
        const pos = groupBy === 'subsetor' && c.code !== 'F' ? (c.workstation ?? p.workstation) : null
        const label = p.name + (p.role ? ` (${p.role})` : '') + (pos ? ` [${pos}]` : '') + (c.moved ? ` ⇄ de ${subName.get(p.subsector ?? '') ?? p.subsector}` : '')
        out.set(key, [...(out.get(key) ?? []), label])
      })
      return [...out.entries()]
    }
    return {
      shifts: data.shifts.map((s) => ({ s, teams: by((i) => data.people[i].cells[day].code === s.code) })),
      carry: by((i) => !!data.people[i].cells[day].carry),
      off: by((i) => data.people[i].cells[day].code === 'F'),
    }
  }, [data, day, groupBy, subName])

  return (
    <div className="flex flex-col gap-3" data-testid="visao-por-turno">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button type="button" className="rounded-cell border border-border px-3 py-1.5 disabled:opacity-50" disabled={day === 0} onClick={() => setDay(day - 1)} aria-label="Dia anterior">
          ◀
        </button>
        <label className="flex items-center gap-2 text-caption text-ink-muted">
          Dia
          <select className="min-h-9 rounded-cell border border-border bg-surface px-3 py-1.5 text-body text-ink" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {data.days.map((x, i) => (
              <option key={x.date} value={i}>
                {fmtDate(x.date)} · {WEEKDAYS_LONG[x.weekday - 1]}
                {x.holiday ? ` · ${x.holiday}` : ''}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="rounded-cell border border-border px-3 py-1.5 disabled:opacity-50" disabled={day >= data.days.length - 1} onClick={() => setDay(day + 1)} aria-label="Próximo dia">
          ▶
        </button>
        {hasSub && (
          <label className="flex items-center gap-2 text-caption text-ink-muted">
            Agrupar por
            <select className="min-h-9 rounded-cell border border-border bg-surface px-3 py-1.5 text-body text-ink" value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}>
              <option value="subsetor">Subsetor / posição</option>
              <option value="turma">Turma</option>
            </select>
          </label>
        )}
        <h3 className="ml-2 text-body font-semibold" aria-live="polite">
          {WEEKDAYS_LONG[d.weekday - 1]}, {fmtDate(d.date)}
          {d.holiday ? ` · feriado (${d.holiday})` : ''}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {groups.carry.length > 0 && (
          <section aria-label="Continua de ontem" className="rounded-card border border-dashed border-border p-3">
            <h4 className="mb-1 font-semibold">← Continua de ontem (00h → fim da noite)</h4>
            <GroupList groups={groups.carry} />
          </section>
        )}
        {groups.shifts.map(({ s, teams }) => {
          const n = daily.by_shift[s.code] ?? 0
          const req = daily.required_by_shift[s.code]
          const def = daily.deficit_shifts.includes(s.code)
          return (
            <section key={s.code} aria-label={`Turno ${s.code}`} data-shift={s.code} className="rounded-card border border-border p-3" style={{ borderTop: `4px solid ${shiftColor(s.code, codes)}` }}>
              <h4 className="mb-1 flex flex-wrap items-baseline gap-2">
                <span className="rounded-cell px-1.5 font-mono font-bold" style={swatchOf(s.code, codes)}>
                  {s.code}
                </span>
                <span className="text-caption text-ink-muted">
                  {s.label}
                  {s.handover_min ? ` · passagem ${s.handover_min} min` : ''}
                  {s.peak ? ' · reforço de pico' : ''}
                </span>
                <span className={clsx('ml-auto text-caption tabular-nums', def ? 'font-bold text-sev-erro' : 'text-ink-muted')}>
                  {n} pessoa{n === 1 ? '' : 's'}
                  {req != null ? ` / ${req} necessário${req === 1 ? '' : 's'}` : ''}
                  {def ? ' ▼ déficit' : ''}
                </span>
              </h4>
              {teams.length ? <GroupList groups={teams} /> : <p className="text-caption text-ink-muted">Ninguém neste turno.</p>}
            </section>
          )
        })}
        <section aria-label="Folga" className="pattern-off rounded-card border border-border bg-surface-2 p-3">
          <h4 className="mb-1 flex items-baseline gap-2">
            <span className="font-mono font-bold">F</span> Folga
            <span className="ml-auto text-caption tabular-nums text-ink-muted">{daily.off} pessoas</span>
          </h4>
          <GroupList groups={groups.off} />
        </section>
      </div>
    </div>
  )
}

function GroupList({ groups }: { groups: [string, string[]][] }) {
  return (
    <ul className="flex flex-col gap-1 text-caption">
      {groups.map(([group, names]) => (
        <li key={group}>
          <span className="font-semibold">{group}:</span> {names.join(', ')}
        </li>
      ))}
    </ul>
  )
}
