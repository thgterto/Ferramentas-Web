import type { AssignmentOut } from './client'

/** Mapeia slot semanal (0..167) → turmas presentes, a partir dos horários da escala. */
export function teamsBySlot(asg: AssignmentOut[]): Map<number, Set<string>> {
  const m = new Map<number, Set<string>>()
  const parse = (s: string) => {
    const [d, t] = s.split('T')
    const [y, mo, da] = d.split('-').map(Number)
    return Date.UTC(y, mo - 1, da, Number(t.slice(0, 2)))
  }
  for (const a of asg) {
    if (a.is_day_off || !a.starts_at || !a.ends_at || !a.team) continue
    for (let t = parse(a.starts_at); t < parse(a.ends_at); t += 3600_000) {
      const d = new Date(t)
      const slot = ((d.getUTCDay() + 6) % 7) * 24 + d.getUTCHours()
      if (!m.has(slot)) m.set(slot, new Set())
      m.get(slot)!.add(a.team)
    }
  }
  return m
}
