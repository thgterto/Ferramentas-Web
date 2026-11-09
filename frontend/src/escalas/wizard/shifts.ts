import type { ScheduleModelOut } from '../api/client'

/** Turnos do modelo: os códigos das sequências do catálogo (fallback pelo nº de turnos/dia). */
export function defaultShifts(m: ScheduleModelOut): string[] {
  const seqs = (m.default_params as { sequences?: string[][] } | undefined)?.sequences
  if (seqs?.length) {
    const codes = [...new Set(seqs.flat().filter((c) => c !== 'F' && c !== 'R'))]
    if (codes.length) return codes.slice(0, 8)
  }
  if (m.shifts_per_day === 2) return ['D12', 'N12']
  if (m.shifts_per_day === 1) return [m.code === 'FIXO_N' ? 'N' : 'M']
  return ['M', 'T', 'N']
}
