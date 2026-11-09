import { Fragment, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { clsx } from 'clsx'
import { WEEKDAYS, fmt, fmtDate, num } from '../api/format'
import { swatchOf, type MatrixPerson, type MonthlyMatrix } from '../api/matrix'
import { inputCls } from './ui'

type Row = { key: string; label: string; team: string; role: string | null; subsector: string | null; workstation: string | null; cells: MatrixPerson['cells']; totals: MatrixPerson['totals'] }

/**
 * Matriz mensal (v3.6): linhas = pessoas (ou turmas), colunas = dias do mês.
 * Célula = SIGLA do turno com cor (nunca só cor), "F" folga, "←N" noite que continua.
 * Rodapé por dia: pessoas por turno (déficit destacado), folgas e horas com déficit.
 * Totais por pessoa: dias, folgas, horas, domingos de folga, noites. Linha/coluna fixas.
 * v3.7: colunas fixas Subsetor e Posição (lotação), agrupar/filtrar por subsetor/posição,
 * célula remanejada ("M ⇄ SB/B2") e rodapé com pessoas por subsetor.
 */
export function MonthlyMatrix({ data }: { data: MonthlyMatrix }) {
  const [by, setBy] = useState<'pessoa' | 'turma'>('pessoa')
  const hasSub = (data.subsectors?.length ?? 0) > 0
  const [group, setGroup] = useState<'' | 'turma' | 'cargo' | 'subsetor' | 'posicao'>(hasSub ? 'subsetor' : 'turma')
  const [sub, setSub] = useState('')
  const [ws, setWs] = useState('')
  const [onlyMoved, setOnlyMoved] = useState(false)
  const subName = useMemo(() => new Map((data.subsectors ?? []).map((x) => [x.code, x.name])), [data.subsectors])
  const wsName = useMemo(() => new Map((data.workstations ?? []).map((x) => [x.code, x.name])), [data.workstations])
  const [shift, setShift] = useState('')
  const [role, setRole] = useState('')
  const [team, setTeam] = useState('')
  const [q, setQ] = useState('')
  const codes = data.shifts.map((s) => s.code)
  const info = useMemo(() => new Map(data.shifts.map((s) => [s.code, s])), [data.shifts])
  const roles = useMemo(() => [...new Set(data.people.map((p) => p.role).filter(Boolean) as string[])].sort(), [data.people])
  const teams = useMemo(() => data.teams.map((t) => t.code), [data.teams])

  const rows: Row[] = useMemo(() => {
    const base: Row[] =
      by === 'pessoa'
        ? data.people.map((p) => ({ key: p.id, label: p.name, team: p.team, role: p.role ?? null, subsector: p.subsector ?? null, workstation: p.workstation ?? null, cells: p.cells, totals: p.totals }))
        : data.teams.map((t) => ({ key: t.code, label: `Turma ${t.code}`, team: t.code, role: null, subsector: null, workstation: null, cells: t.cells, totals: t.totals }))
    const norm = q.trim().toLowerCase()
    return base.filter(
      (r) =>
        (!team || r.team === team) &&
        (!role || r.role === role) &&
        (!sub || r.subsector === sub || r.cells.some((c) => c.moved && c.subsector === sub)) &&
        (!ws || r.workstation === ws || r.cells.some((c) => c.workstation === ws)) &&
        (!onlyMoved || r.cells.some((c) => c.moved)) &&
        (!shift || r.cells.some((c) => c.code === shift)) &&
        (!norm || r.label.toLowerCase().includes(norm)),
    )
  }, [by, data, q, role, shift, team, sub, ws, onlyMoved])

  const groups = useMemo(() => {
    const key = (r: Row) =>
      group === 'turma'
        ? `Turma ${r.team}`
        : group === 'cargo'
          ? (r.role ?? 'Sem cargo')
          : group === 'subsetor'
            ? r.subsector ? `Subsetor ${subName.get(r.subsector) ?? r.subsector}` : 'Sem subsetor'
            : group === 'posicao'
              ? r.workstation ? `Posição ${wsName.get(r.workstation) ?? r.workstation}` : 'Sem posição'
              : ''
    const out: { name: string; rows: Row[] }[] = []
    for (const r of rows) {
      const k = by === 'turma' && group !== 'cargo' ? '' : key(r)
      const g = out.find((x) => x.name === k)
      if (g) g.rows.push(r)
      else out.push({ name: k, rows: [r] })
    }
    return out
  }, [by, group, rows, subName, wsName])

  // grade navegável por setas (roving tabindex)
  const flat = groups.flatMap((g) => g.rows)
  const nDays = data.days.length
  const [act, setAct] = useState<[number, number]>([0, 0])
  const ref = useRef<HTMLTableElement>(null)
  const focus = (r: number, c: number) => {
    setAct([r, c])
    ref.current?.querySelector<HTMLElement>(`[data-rc="${r}-${c}"]`)?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    const [r, c] = act
    const m: Record<string, [number, number]> = {
      ArrowRight: [r, Math.min(nDays - 1, c + 1)],
      ArrowLeft: [r, Math.max(0, c - 1)],
      ArrowDown: [Math.min(flat.length - 1, r + 1), c],
      ArrowUp: [Math.max(0, r - 1), c],
      Home: [r, 0],
      End: [r, nDays - 1],
    }
    const n = m[e.key]
    if (!n) return
    e.preventDefault()
    focus(n[0], n[1])
  }

  const dayCls = (i: number) => {
    const d = data.days[i]
    return d.holiday ? 'bg-sev-alerta-bg' : d.is_weekend ? 'bg-surface-2' : ''
  }
  const sticky = 'sticky left-0 z-10 bg-surface'
  const subCols = hasSub && by === 'pessoa'
  const stickySub = 'sticky left-28 z-10 w-24 min-w-24 bg-surface'
  const stickyWs = 'sticky left-52 z-10 w-24 min-w-24 bg-surface'
  const extra = subCols ? 2 : 0
  let ri = -1

  return (
    <div className="flex flex-col gap-3" data-testid="matriz-mensal">
      <style>{'@media print { @page { size: A4 landscape; margin: 8mm } .matrix-scroll { overflow: visible !important; max-height: none !important } }'}</style>
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div role="group" aria-label="Linhas da matriz" className="flex overflow-hidden rounded-cell border border-border">
          {(
            [
              ['pessoa', 'Pessoas'],
              ['turma', 'Turmas'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={by === v} onClick={() => setBy(v)} className={clsx('px-3 py-1.5', by === v ? 'bg-primary text-white' : 'bg-surface')}>
              {l}
            </button>
          ))}
        </div>
        <label className="flex flex-col text-caption text-ink-muted">
          Agrupar por
          <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value as typeof group)}>
            <option value="">Sem agrupamento</option>
            <option value="turma">Turma</option>
            <option value="cargo">Cargo</option>
            {hasSub && <option value="subsetor">Subsetor</option>}
            {hasSub && <option value="posicao">Posição</option>}
          </select>
        </label>
        <label className="flex flex-col text-caption text-ink-muted">
          Turno
          <select className={inputCls} value={shift} onChange={(e) => setShift(e.target.value)}>
            <option value="">Todos</option>
            {data.shifts.map((s) => (
              <option key={s.code} value={s.code}>
                Só quem está em {s.code} ({s.label})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-caption text-ink-muted">
          Turma
          <select className={inputCls} value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Todas</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {roles.length > 0 && (
          <label className="flex flex-col text-caption text-ink-muted">
            Cargo
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Todos</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}
        {hasSub && (
          <>
            <label className="flex flex-col text-caption text-ink-muted">
              Subsetor
              <select className={inputCls} value={sub} onChange={(e) => setSub(e.target.value)}>
                <option value="">Todos</option>
                {(data.subsectors ?? []).map((x) => (
                  <option key={x.code} value={x.code}>
                    {x.name} ({x.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-caption text-ink-muted">
              Posição
              <select className={inputCls} value={ws} onChange={(e) => setWs(e.target.value)}>
                <option value="">Todas</option>
                {(data.workstations ?? [])
                  .filter((w) => !sub || w.subsector === sub)
                  .map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name} ({w.code})
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 self-end pb-2 text-caption">
              <input type="checkbox" checked={onlyMoved} onChange={(e) => setOnlyMoved(e.target.checked)} /> Só remanejados
            </label>
          </>
        )}
        <label className="flex flex-col text-caption text-ink-muted">
          Buscar pessoa
          <input type="search" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex.: A-01" />
        </label>
      </div>

      <ul aria-label="Legenda da matriz" className="flex flex-wrap gap-2 text-caption">
        {data.shifts.map((s) => (
          <li key={s.code} className="flex items-center gap-1.5 rounded-cell px-2 py-0.5 text-ink" style={swatchOf(s.code, codes)}>
            <strong className="font-mono">{s.code}</strong> {s.label}
            {s.handover_min ? ` · passagem ${s.handover_min} min` : ''}
            {s.peak ? ' · reforço de pico' : ''}
            {s.night ? ' · ☾' : ''}
          </li>
        ))}
        <li className="pattern-off flex items-center gap-1.5 rounded-cell border border-border bg-surface-2 px-2 py-0.5">
          <strong className="font-mono">F</strong> folga
        </li>
        <li className="flex items-center gap-1.5 rounded-cell border border-border px-2 py-0.5">
          <strong className="font-mono">←N</strong> noite que continua de ontem
        </li>
        {hasSub && (
          <li className="flex items-center gap-1.5 rounded-cell border border-dashed border-primary px-2 py-0.5">
            <strong className="font-mono">⇄</strong> remanejado (pool): turno → subsetor/posição
          </li>
        )}
        <li className="flex items-center gap-1.5 rounded-cell bg-sev-alerta-bg px-2 py-0.5">feriado</li>
        <li className="flex items-center gap-1.5 rounded-cell bg-surface-2 px-2 py-0.5">fim de semana</li>
      </ul>

      <div className="matrix-scroll max-h-[70vh] overflow-auto rounded-card border border-border">
        <table ref={ref} role="grid" aria-label={`Matriz mensal ${data.month}`} aria-rowcount={flat.length + 1} className="border-separate border-spacing-0 text-caption" onKeyDown={onKey}>
          <thead className="sticky top-0 z-20 bg-surface">
            <tr>
              <th scope="col" className={clsx(sticky, 'z-30 w-28 min-w-28 border-b border-border px-2 py-1 text-left')}>
                {by === 'pessoa' ? 'Pessoa' : 'Turma'}
              </th>
              {subCols && (
                <>
                  <th scope="col" className={clsx(stickySub, 'z-30 border-b border-border px-2 py-1 text-left')}>
                    Subsetor
                  </th>
                  <th scope="col" className={clsx(stickyWs, 'z-30 border-b border-r border-border px-2 py-1 text-left')}>
                    Posição
                  </th>
                </>
              )}
              {data.days.map((d, i) => (
                <th key={d.date} scope="col" title={d.holiday ?? undefined} className={clsx('min-w-10 border-b border-border px-0.5 py-1 text-center font-medium', dayCls(i), d.weekday === 7 ? 'text-sev-info' : 'text-ink-muted')}>
                  <span className="block tabular-nums">{d.date.slice(8, 10)}</span>
                  <span className="block text-micro">{WEEKDAYS[d.weekday - 1]}</span>
                  {d.holiday && <span className="sr-only">feriado: {d.holiday}</span>}
                  {d.holiday && (
                    <span aria-hidden="true" className="block text-micro text-sev-alerta">
                      ★
                    </span>
                  )}
                </th>
              ))}
              {['Dias', 'Folgas', 'Horas', 'Dom. folga', 'Noites'].map((h) => (
                <th key={h} scope="col" className="border-b border-l border-border px-1.5 py-1 text-center font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.name || '_'}>
                {g.name && (
                  <tr>
                    <th scope="rowgroup" colSpan={1} className={clsx(sticky, 'bg-surface-2 px-2 py-1 text-left font-semibold')}>
                      {g.name} <span className="font-normal text-ink-muted">({g.rows.length})</span>
                    </th>
                    <td colSpan={nDays + 5 + extra} className="bg-surface-2" />
                  </tr>
                )}
                {g.rows.map((r) => {
                  ri++
                  const rIdx = ri
                  return (
                    <tr key={r.key} data-row={r.key}>
                      <th scope="row" className={clsx(sticky, 'border-b border-border px-2 py-0.5 text-left')}>
                        <span className="font-semibold">{r.label}</span>
                        {r.role && <span className="block text-micro font-normal text-ink-subtle">{r.role}</span>}
                      </th>
                      {subCols && (
                        <>
                          <td data-col="subsetor" className={clsx(stickySub, 'border-b border-border px-2 text-left')} title={r.subsector ? subName.get(r.subsector) : undefined}>
                            {r.subsector ? (subName.get(r.subsector) ?? r.subsector) : '—'}
                          </td>
                          <td data-col="posicao" className={clsx(stickyWs, 'border-b border-r border-border px-2 text-left')} title={r.workstation ? wsName.get(r.workstation) : undefined}>
                            {r.workstation ?? '—'}
                          </td>
                        </>
                      )}
                      {r.cells.map((c, ci) => {
                        const off = c.code === 'F'
                        const sh = info.get(c.code)
                        const dim = !!shift && c.code !== shift
                        const d = data.days[ci]
                        return (
                          <td
                            key={ci}
                            role="gridcell"
                            data-rc={`${rIdx}-${ci}`}
                            data-code={c.code}
                            tabIndex={act[0] === rIdx && act[1] === ci ? 0 : -1}
                            onFocus={() => setAct([rIdx, ci])}
                            data-moved={c.moved || undefined}
                            title={c.moved ? `remanejado → ${subName.get(c.subsector ?? '') ?? c.subsector} / ${wsName.get(c.workstation ?? '') ?? c.workstation}` : c.workstation ? `posição ${c.workstation}` : undefined}
                            aria-label={`${r.label}, ${fmtDate(d.date)}${d.holiday ? ` (feriado ${d.holiday})` : ''}: ${off ? (c.reserve ? 'reserva' : 'folga') : `turno ${c.code} ${sh?.label ?? ''}`}${c.moved ? `; remanejado para ${c.subsector}/${c.workstation}` : ''}${c.carry ? `; continua de ontem: ${c.carry} ${info.get(c.carry)?.label ?? ''}` : ''}`}
                            className={clsx('h-9 border-b border-r border-border px-0.5 text-center', off ? clsx('pattern-off text-ink-muted', dayCls(ci) || 'bg-surface-2') : 'text-ink', dim && 'opacity-30', c.moved && 'outline-1 -outline-offset-2 outline-dashed outline-primary')}
                            style={off ? undefined : swatchOf(c.code, codes)}
                          >
                            <span aria-hidden="true" className="block font-mono font-bold leading-4">
                              {c.reserve ? 'R' : c.code}
                            </span>
                            {c.moved && (
                              <span aria-hidden="true" className="block whitespace-nowrap text-micro leading-3 text-primary">
                                ⇄{c.subsector}/{c.workstation}
                              </span>
                            )}
                            {c.carry && !c.moved && (
                              <span aria-hidden="true" className="block text-micro leading-3 text-ink-muted">
                                ←{c.carry}
                              </span>
                            )}
                          </td>
                        )
                      })}
                      <td className="border-b border-l border-border px-1.5 text-center tabular-nums">{r.totals.worked_days}</td>
                      <td className="border-b border-border px-1.5 text-center tabular-nums">{r.totals.off_days}</td>
                      <td className="border-b border-border px-1.5 text-center tabular-nums">{fmt(r.totals.hours, 2)}</td>
                      <td className="border-b border-border px-1.5 text-center tabular-nums">{r.totals.sundays_off}</td>
                      <td className="border-b border-border px-1.5 text-center tabular-nums">{r.totals.nights}</td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-surface">
            {data.shifts.map((s) => (
              <tr key={s.code} data-foot={s.code}>
                <th scope="row" className={clsx(sticky, 'border-t border-border px-2 py-0.5 text-left')}>
                  Em {s.code} <span className="font-normal text-ink-muted">{s.label}</span>
                </th>
                {subCols && <td colSpan={2} className="border-t border-border" />}
                {data.daily.map((d) => {
                  const n = d.by_shift[s.code] ?? 0
                  const req = d.required_by_shift[s.code]
                  const def = d.deficit_shifts.includes(s.code)
                  return (
                    <td key={d.date} data-deficit={def || undefined} title={req != null ? `necessário ${req}` : undefined} className={clsx('border-t border-r border-border text-center tabular-nums', def ? 'bg-sev-erro-bg font-bold text-sev-erro' : '')}>
                      {def ? `▼${n}` : n}
                      {def && <span className="sr-only"> de {req} necessários (déficit)</span>}
                    </td>
                  )
                })}
                <td colSpan={5} className="border-t border-l border-border" />
              </tr>
            ))}
            {(data.subsectors ?? []).map((x) => (
              <tr key={x.code} data-foot={`sub-${x.code}`}>
                <th scope="row" className={clsx(sticky, 'border-t border-border px-2 py-0.5 text-left')}>
                  No subsetor <span className="font-normal text-ink-muted">{x.name}</span>
                </th>
                {subCols && <td colSpan={2} className="border-t border-border" />}
                {data.daily.map((d) => (
                  <td key={d.date} className="border-t border-r border-border text-center tabular-nums">
                    {d.by_subsector?.[x.code] ?? 0}
                  </td>
                ))}
                <td colSpan={5} className="border-t border-l border-border" />
              </tr>
            ))}
            <tr data-foot="F">
              <th scope="row" className={clsx(sticky, 'border-t border-border px-2 py-0.5 text-left')}>
                Em folga
              </th>
              {subCols && <td colSpan={2} className="border-t border-border" />}
              {data.daily.map((d) => (
                <td key={d.date} className="border-t border-r border-border text-center tabular-nums">
                  {d.off}
                </td>
              ))}
              <td colSpan={5} className="border-t border-l border-border" />
            </tr>
            <tr data-foot="deficit">
              <th scope="row" className={clsx(sticky, 'border-t border-border px-2 py-0.5 text-left')}>
                Horas c/ déficit
              </th>
              {subCols && <td colSpan={2} className="border-t border-border" />}
              {data.daily.map((d) => (
                <td key={d.date} className={clsx('border-t border-r border-border text-center tabular-nums', d.deficit_hours ? 'bg-sev-erro-bg font-bold text-sev-erro' : 'text-ink-subtle')}>
                  {d.deficit_hours || '·'}
                </td>
              ))}
              <td colSpan={5} className="border-t border-l border-border" />
            </tr>
            {data.daily.some((d) => d.handover_hours) && (
              <tr data-foot="passagem">
                <th scope="row" className={clsx(sticky, 'border-t border-border px-2 py-0.5 text-left')}>
                  Horas de passagem
                </th>
                {subCols && <td colSpan={2} className="border-t border-border" />}
                {data.daily.map((d) => (
                  <td key={d.date} className="border-t border-r border-border text-center tabular-nums text-ink-muted">
                    {d.handover_hours ? `⇄${d.handover_hours}` : '·'}
                  </td>
                ))}
                <td colSpan={5} className="border-t border-l border-border" />
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      {flat.length === 0 && <p className="text-ink-muted">Nenhuma pessoa com os filtros selecionados.</p>}
      <p className="text-micro text-ink-subtle">
        {data.generated_people ? 'Pessoas fictícias por turma (A-01, A-02…) — o MVP aloca por turma; ' : ''}
        {hasSub ? `${data.moved_hours} horas remanejadas no mês entre subsetores do pool; ` : ''}
        rodapé = pessoas que INICIAM o turno no dia (▼ = abaixo do necessário). Pico do mês: {fmt(Math.max(...data.daily.map((d) => num(d.required_peak))))} postos.
      </p>
    </div>
  )
}
