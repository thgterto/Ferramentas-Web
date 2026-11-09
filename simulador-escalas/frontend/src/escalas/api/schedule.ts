import type { AssignmentOut } from './client'

const HOUR = 3600_000

function parseLocal(s: string): number {
  const [d, t] = s.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [hh, mm] = t.split(':').map(Number)
  return Date.UTC(y, mo - 1, da, hh, mm || 0)
}

const dayStart = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Mapeia slot semanal (0..167) → turmas presentes em QUALQUER semana (legado). */
export function teamsBySlot(asg: AssignmentOut[]): Map<number, Set<string>> {
  const m = new Map<number, Set<string>>()
  for (const a of asg) {
    if (a.is_day_off || !a.starts_at || !a.ends_at || !a.team) continue
    for (let t = parseLocal(a.starts_at); t < parseLocal(a.ends_at); t += HOUR) {
      const d = new Date(t)
      const slot = ((d.getUTCDay() + 6) % 7) * 24 + d.getUTCHours()
      if (!m.has(slot)) m.set(slot, new Set())
      m.get(slot)!.add(a.team)
    }
  }
  return m
}

export type Presence = { team: string; shift: string; range: string }

const hh = (ms: number) => String(new Date(ms).getUTCHours()).padStart(2, '0')

/** Hora absoluta do horizonte (0 = início 00h) → turmas EFETIVAMENTE trabalhando e o turno. */
export function presenceByHour(asg: AssignmentOut[], start: string): Map<number, Presence[]> {
  const t0 = dayStart(start)
  const m = new Map<number, Presence[]>()
  for (const a of asg) {
    if (a.is_day_off || !a.starts_at || !a.ends_at || !a.team || !a.shift_code) continue
    const s = parseLocal(a.starts_at)
    const e = parseLocal(a.ends_at)
    const range = `${hh(s)}–${hh(e)}`
    for (let t = Math.floor(s / HOUR) * HOUR; t < e; t += HOUR) {
      const h = Math.round((t - t0) / HOUR)
      if (h < 0) continue
      const list = m.get(h) ?? []
      if (!list.some((p) => p.team === a.team)) list.push({ team: a.team, shift: a.shift_code, range })
      m.set(h, list)
    }
  }
  for (const l of m.values()) l.sort((x, y) => x.team.localeCompare(y.team, 'pt', { numeric: true }))
  return m
}

/** Weekday do início do horizonte (0 = seg). */
export const weekdayOfIso = (iso: string) => (new Date(`${iso.slice(0, 10)}T12:00:00Z`).getUTCDay() + 6) % 7

/**
 * Para o slot semanal (seg=0…dom 23h=167): a semana do horizonte com MENOS pessoas escaladas
 * (a mesma que define "Escalados" no pior caso; ``target`` = esse valor) e as turmas nela.
 */
export function presenceAtSlot(
  presence: Map<number, Presence[]>,
  slot: number,
  start: string,
  weeks: number,
  sizeOf: (team: string) => number = () => 1,
  target?: number,
): { week: number; teams: Presence[]; allWeeks: Presence[][] } {
  const offset = (slot - weekdayOfIso(start) * 24 + 168) % 168
  const allWeeks = Array.from({ length: Math.max(1, weeks) }, (_, w) => presence.get(w * 168 + offset) ?? [])
  const cov = allWeeks.map((l) => l.reduce((a, p) => a + sizeOf(p.team), 0))
  // semana cujo total bate com o "Escalados" do pior caso (a 1ª noite do horizonte vem do dia
  // anterior, que não está nas alocações); sem alvo, a de menor cobertura
  let best = target != null ? cov.findIndex((c) => Math.abs(c - target) < 1e-6) : -1
  if (best < 0) best = cov.indexOf(Math.min(...cov))
  return { week: best + 1, teams: allWeeks[best], allWeeks }
}
