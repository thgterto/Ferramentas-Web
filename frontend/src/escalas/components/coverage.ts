import type { CoverageSlot } from '../api/client'
import { WEEKDAYS_LONG, fmt, num } from '../api/format'

export type CellKind = 'forte' | 'leve' | 'exata' | 'excesso'

/** Déficit forte: cobertura < 90% da demanda (01 FR-09; 04 §5.2). */
export function classify(s: Pick<CoverageSlot, 'status' | 'gap' | 'required_net'>): CellKind {
  if (s.status === 'exata') return 'exata'
  if (s.status === 'excesso') return 'excesso'
  const req = num(s.required_net)
  const covered = req + num(s.gap)
  return req > 0 && covered / req < 0.9 ? 'forte' : 'leve'
}

export const KIND_META: Record<CellKind, { label: string; icon: string; cell: string; icon_cls: string; pattern?: string }> = {
  forte: { label: 'Déficit forte', icon: '▲', cell: 'bg-cov-deficit text-white', icon_cls: 'text-white', pattern: 'pattern-deficit' },
  leve: { label: 'Déficit leve', icon: '△', cell: 'bg-cov-low-fill text-ink', icon_cls: 'text-cov-low', pattern: 'pattern-low' },
  exata: { label: 'Exato', icon: '✓', cell: 'bg-cov-exact-fill text-ink', icon_cls: 'text-cov-exact' },
  excesso: { label: 'Excesso', icon: '●', cell: 'bg-cov-over-fill text-ink', icon_cls: 'text-cov-over', pattern: 'pattern-over' },
}

export const hh = (h: number) => String(h).padStart(2, '0')

export function diffText(gap: number): string {
  if (gap === 0) return '0'
  const v = fmt(Math.abs(gap), 1)
  return gap < 0 ? `−${v}` : `+${v}`
}

export function cellLabel(s: CoverageSlot, weeks: number, teams?: string[]): string {
  const h = Number(s.start.slice(0, 2))
  const k = classify(s)
  const gap = num(s.gap)
  const base = `${WEEKDAYS_LONG[s.weekday - 1]}, ${hh(h)} horas, ${KIND_META[k].label.toLowerCase()}`
  const amount = gap < 0 ? ` de ${fmt(-gap)} postos` : gap > 0 ? ` de ${fmt(gap)} postos` : ''
  const occ = gap < 0 && s.deficit_occurrences ? `, ocorre em ${s.deficit_occurrences} de ${weeks} semanas` : ''
  return `${base}${amount}. Necessário ${fmt(s.required_net)}, escalados ${fmt(num(s.required_net) + gap)}${teams?.length ? `, turmas ${teams.join(', ')}` : ''}${occ}`
}
