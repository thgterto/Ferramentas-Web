import type { ScheduleModelOut } from '../api/client'

export function defaultShifts(m: ScheduleModelOut): string[] {
  if (m.shifts_per_day === 2) return ['D12', 'N12']
  if (m.shifts_per_day === 1) return [m.code === 'FIXO_N' ? 'N' : 'M']
  return ['M', 'T', 'N']
}
