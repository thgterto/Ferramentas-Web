import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { clsx } from 'clsx'
import type { CoverageSlot } from '../api/client'
import { WEEKDAYS, fmt, num } from '../api/format'
import { KIND_META, cellLabel, classify, diffText, hh, type CellKind } from './coverage'




const isNight = (h: number) => h >= 22 || h < 5



export function Legend() {
  return (
    <ul className="flex flex-wrap gap-4 text-caption" aria-label="Legenda do heatmap">
      {(Object.keys(KIND_META) as CellKind[]).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={clsx('relative inline-flex size-5 items-center justify-center overflow-hidden rounded-cell text-micro', KIND_META[k].cell)}>
            {KIND_META[k].pattern && <span className={clsx('absolute inset-0 opacity-25', KIND_META[k].pattern, KIND_META[k].icon_cls)} />}
            <span className={clsx('relative', KIND_META[k].icon_cls)}>{KIND_META[k].icon}</span>
          </span>
          {KIND_META[k].label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true">☾</span> Faixa noturna 22h–05h
      </li>
    </ul>
  )
}

type Props = {
  slots: CoverageSlot[]
  weeks: number
  teamsAt?: (slotIndex: number) => string[]
  onActivate?: (s: CoverageSlot) => void
  caption?: string
}

/** Heatmap 7×24 de cobertura (04 §8.1): cor + ícone + textura, grid navegável por setas. */
export function Heatmap7x24({ slots, weeks, teamsAt, onActivate, caption = 'Cobertura por hora da semana' }: Props) {
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const tipId = useId()
  const bySlot = new Map(slots.map((s) => [s.weekday * 24 - 24 + Number(s.start.slice(0, 2)), s]))
  const shown = hover ?? active
  const tipSlot = bySlot.get(shown)

  const focusCell = (i: number) => {
    setActive(i)
    gridRef.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.focus()
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const r = Math.floor(active / 24)
    const c = active % 24
    let n: number | null = null
    switch (e.key) {
      case 'ArrowRight': n = r * 24 + Math.min(23, c + 1); break
      case 'ArrowLeft': n = r * 24 + Math.max(0, c - 1); break
      case 'ArrowDown': n = Math.min(6, r + 1) * 24 + c; break
      case 'ArrowUp': n = Math.max(0, r - 1) * 24 + c; break
      case 'Home': n = e.ctrlKey ? 0 : r * 24; break
      case 'End': n = e.ctrlKey ? 167 : r * 24 + 23; break
      case 'PageDown': n = 6 * 24 + c; break
      case 'PageUp': n = c; break
      case 'Enter':
      case ' ': {
        const s = bySlot.get(active)
        if (s && onActivate) {
          e.preventDefault()
          onActivate(s)
        }
        return
      }
      default: return
    }
    e.preventDefault()
    focusCell(n)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend />
        <button type="button" className="text-caption text-primary underline" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? 'Ver como heatmap' : 'Ver como tabela'}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full text-body">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 bg-surface-2 text-left">
              <tr>
                <th scope="col" className="p-1">Dia</th>
                <th scope="col" className="p-1">Hora</th>
                <th scope="col" className="p-1 text-right">Necessário</th>
                <th scope="col" className="p-1 text-right">Escalados</th>
                <th scope="col" className="p-1 text-right">Diferença</th>
                <th scope="col" className="p-1">Estado</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => (
                <tr key={s.slot_index} className="border-t border-border">
                  <td className="p-1">{WEEKDAYS[s.weekday - 1]}</td>
                  <td className="p-1 tabular-nums">{s.start}</td>
                  <td className="p-1 text-right tabular-nums">{fmt(s.required_net)}</td>
                  <td className="p-1 text-right tabular-nums">{fmt(num(s.required_net) + num(s.gap))}</td>
                  <td className="p-1 text-right tabular-nums">{diffText(num(s.gap))}</td>
                  <td className="p-1">
                    <span aria-hidden="true">{KIND_META[classify(s)].icon} </span>
                    {KIND_META[classify(s)].label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <div ref={gridRef} role="grid" aria-label={caption} aria-rowcount={8} aria-colcount={25} className="inline-grid min-w-[860px] grid-cols-heatmap gap-0.5" onKeyDown={onKey}>
            <div role="row" className="contents">
              <span role="columnheader" className="text-caption text-ink-subtle">
                <span className="sr-only">Dia</span>
              </span>
              {Array.from({ length: 24 }, (_, h) => (
                <span
                  key={h}
                  role="columnheader"
                  aria-label={`${hh(h)} horas${isNight(h) ? ', noturno' : ''}`}
                  className={clsx('rounded-cell text-center text-caption tabular-nums text-ink-subtle', isNight(h) && 'bg-surface-2')}
                >
                  {h === 22 && <span aria-hidden="true">☾</span>}
                  {hh(h)}
                </span>
              ))}
            </div>
            {WEEKDAYS.map((d, r) => (
              <div role="row" key={d} className="contents">
                <span role="rowheader" className="self-center pr-2 text-caption font-medium">
                  {d}
                </span>
                {Array.from({ length: 24 }, (_, c) => {
                  const i = r * 24 + c
                  const s = bySlot.get(i)
                  if (!s) return <span key={c} role="gridcell" aria-label="sem dados" className="h-7 rounded-cell bg-surface-2" />
                  const k = classify(s)
                  const m = KIND_META[k]
                  const gap = num(s.gap)
                  return (
                    <span
                      key={c}
                      role="gridcell"
                      data-i={i}
                      data-kind={k}
                      tabIndex={i === active ? 0 : -1}
                      aria-label={cellLabel(s, weeks, teamsAt?.(i))}
                      aria-describedby={i === shown ? tipId : undefined}
                      onFocus={() => setActive(i)}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => {
                        focusCell(i)
                        onActivate?.(s)
                      }}
                      className={clsx('relative flex h-7 min-w-7 cursor-default items-center justify-center overflow-hidden rounded-cell text-micro tabular-nums', m.cell)}
                    >
                      {m.pattern && <span aria-hidden="true" className={clsx('absolute inset-0 opacity-25', m.pattern, m.icon_cls)} />}
                      <span aria-hidden="true" className={clsx('relative font-semibold', m.icon_cls)}>
                        {gap === 0 ? m.icon : `${m.icon}${diffText(gap)}`}
                      </span>
                    </span>
                  )
                })}
              </div>
            ))}
          </div>
          {tipSlot && (
            <div id={tipId} role="tooltip" className="mt-2 rounded-card border border-border bg-surface px-3 py-2 text-caption shadow-sm" aria-live="off">
              <strong>
                {WEEKDAYS[tipSlot.weekday - 1]} {tipSlot.start}
              </strong>{' '}
              · Necessário {fmt(tipSlot.required_net)} · Escalados {fmt(num(tipSlot.required_net) + num(tipSlot.gap))} ·{' '}
              {num(tipSlot.gap) < 0 ? `Déficit ${diffText(num(tipSlot.gap))}` : num(tipSlot.gap) > 0 ? `Excesso ${diffText(num(tipSlot.gap))}` : 'Exato'}
              {teamsAt && teamsAt(shown).length > 0 && ` · Turmas ${teamsAt(shown).join(', ')}`}
              {num(tipSlot.gap) < 0 && tipSlot.deficit_occurrences > 0 && ` · ocorre em ${tipSlot.deficit_occurrences} de ${weeks} semanas`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
