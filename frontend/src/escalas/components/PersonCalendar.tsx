import { useState } from 'react'
import { clsx } from 'clsx'
import { WEEKDAYS, fmt, fmtDate } from '../api/format'
import { swatchOf, type MonthlyMatrix } from '../api/matrix'
import { inputCls } from './ui'

/**
 * Visão "Pessoa" (v3.6): calendário mensal individual (base do calendário pessoal),
 * semanas seg→dom, sigla + horário, "← N" da noite anterior, feriados e totais do mês.
 */
export function PersonCalendar({ data, person: initial, onPersonChange, onExport }: { data: MonthlyMatrix; person?: string; onPersonChange?: (id: string) => void; onExport?: (format: 'csv' | 'xlsx' | 'ics', person: string) => void }) {
  const [pid, setPid] = useState(initial ?? data.people[0]?.id ?? '')
  const p = data.people.find((x) => x.id === pid) ?? data.people[0]
  if (!p) return <p className="text-ink-muted">Sem pessoas neste cenário.</p>
  const codes = data.shifts.map((s) => s.code)
  const info = new Map(data.shifts.map((s) => [s.code, s]))
  const lead = data.days[0].weekday - 1
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...data.days.map((_, i) => i)]
  while (cells.length % 7) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7))
  const t = p.totals
  return (
    <div className="flex flex-col gap-3" data-testid="calendario-pessoa">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col text-caption text-ink-muted">
          Colaborador
          <select
            className={inputCls}
            value={p.id}
            onChange={(e) => {
              setPid(e.target.value)
              onPersonChange?.(e.target.value)
            }}
          >
            {data.people.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} · turma {x.team}
                {x.role ? ` · ${x.role}` : ''}
                {x.subsector ? ` · ${x.subsector}/${x.workstation ?? '—'}` : ''}
              </option>
            ))}
          </select>
        </label>
        {onExport && (
          <div className="flex gap-2" role="group" aria-label="Exportar calendário individual">
            {(['xlsx', 'csv', 'ics'] as const).map((f) => (
              <button key={f} type="button" className="rounded-cell border border-border px-3 py-1.5" onClick={() => onExport(f, p.id)}>
                Exportar {f.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>
      {p.subsector && (
        <p className="text-caption" data-testid="lotacao">
          Lotação: <strong>subsetor {data.subsectors?.find((x) => x.code === p.subsector)?.name ?? p.subsector}</strong> · posição padrão <strong>{p.workstation ?? '—'}</strong>
          {p.moved_days ? ` · remanejado em ${p.moved_days} dia${p.moved_days === 1 ? '' : 's'}` : ''}
        </p>
      )}
      <dl className="flex flex-wrap gap-4 text-caption" aria-label={`Totais de ${p.name} no mês`}>
        <div>
          <dt className="text-ink-muted">Dias trabalhados</dt>
          <dd className="text-h2 font-semibold tabular-nums">{t.worked_days}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Folgas</dt>
          <dd className="text-h2 font-semibold tabular-nums">{t.off_days}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Horas no mês</dt>
          <dd className="text-h2 font-semibold tabular-nums">{fmt(t.hours, 2)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Domingos de folga</dt>
          <dd className="text-h2 font-semibold tabular-nums">{t.sundays_off}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Noites</dt>
          <dd className="text-h2 font-semibold tabular-nums">{t.nights}</dd>
        </div>
      </dl>
      <table className="w-full table-fixed border-separate border-spacing-1 text-caption" aria-label={`Calendário de ${p.name} em ${data.month}`}>
        <thead>
          <tr>
            {WEEKDAYS.map((w, i) => (
              <th key={w} scope="col" className={clsx('font-medium', i === 6 ? 'text-sev-info' : 'text-ink-muted')}>
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((wk, wi) => (
            <tr key={wi}>
              {wk.map((i, ci) => {
                if (i == null) return <td key={ci} />
                const d = data.days[i]
                const c = p.cells[i]
                const off = c.code === 'F'
                const sh = info.get(c.code)
                return (
                  <td
                    key={ci}
                    aria-label={`${fmtDate(d.date)}${d.holiday ? ` (feriado ${d.holiday})` : ''}: ${off ? 'folga' : `turno ${c.code} ${sh?.label ?? ''}`}${c.moved ? `; remanejado para ${c.subsector}/${c.workstation}` : ''}${c.carry ? `; continua de ontem: ${c.carry}` : ''}`}
                    className={clsx('h-16 rounded-cell border border-border p-1 align-top', off && 'pattern-off bg-surface-2 text-ink-muted', d.holiday && 'ring-2 ring-sev-alerta')}
                    style={off ? undefined : swatchOf(c.code, codes)}
                  >
                    <span aria-hidden="true" className="flex justify-between tabular-nums text-ink-muted">
                      <span>{d.date.slice(8, 10)}</span>
                      {d.holiday && <span title={d.holiday}>★</span>}
                    </span>
                    <span aria-hidden="true" className="block font-mono text-body font-bold">
                      {c.code}
                    </span>
                    {sh && (
                      <span aria-hidden="true" className="block text-micro tabular-nums">
                        {sh.label}
                      </span>
                    )}
                    {c.moved && (
                      <span aria-hidden="true" className="block text-micro font-semibold text-primary">
                        ⇄ {c.subsector}/{c.workstation}
                      </span>
                    )}
                    {c.carry && (
                      <span aria-hidden="true" className="block text-micro">
                        ← {c.carry} {info.get(c.carry)?.label}
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
  )
}
