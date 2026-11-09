import type { S } from './client'
import { shiftColor } from '../pattern/model'

export type MonthlyMatrix = S['MonthlyMatrixOut']
export type MatrixPerson = S['MatrixPerson']
export type MatrixShift = S['MatrixShift']
export type MatrixCell = S['MatrixCell']

export const monthOf = (iso: string) => iso.slice(0, 7)

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} de ${y}`
}

/** Turno da véspera de cada turma no 1º dia do horizonte (para o Gantt mostrar "← N 22–06"). */
export function carryBefore(mx: MonthlyMatrix | undefined, horizonStart: string): Record<string, string | null> {
  if (!mx || mx.month !== monthOf(horizonStart)) return {}
  const i = Number(horizonStart.slice(8, 10)) - 1
  return Object.fromEntries(mx.teams.map((t) => [t.code, t.cells[i]?.carry ?? null]))
}

export const isOff = (c: MatrixCell) => c.code === 'F'

/** Fundo 30% da cor do turno + filete inferior (a sigla sempre vem junto: nunca só cor). */
export const swatchOf = (code: string, codes: string[]) => ({
  background: `color-mix(in srgb, ${shiftColor(code, codes)} 30%, rgb(var(--surface)))`,
  boxShadow: `inset 0 -3px 0 ${shiftColor(code, codes)}`,
})
