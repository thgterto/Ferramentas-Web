import type { S } from '../api/client'

export type PatternSpec = S['PatternSpec-Input']
export type ShiftSpec = S['ShiftIn']
export type LayerSpec = S['LayerIn-Input']
export type KMode = 'fixo' | 'minimo' | 'faixa' | 'sugerir'
export type PatternValidation = S['PatternValidation']

export const OFF = 'F'
export const RESERVE = 'R'
export const WEEKDAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export const K_MODE_LABEL: Record<KMode, string> = {
  fixo: 'Fixo (K = k)',
  minimo: 'Mínimo (K ≥ k)',
  faixa: 'Faixa (k_min ≤ K ≤ k_max)',
  sugerir: 'Sugerir (motor escolhe K)',
}

/** Paleta de turnos: 8 matizes distintas (cores + sigla + horário, nunca só cor). */
const PALETTE = ['#D97706', '#0E9384', '#4338CA', '#0284C7', '#7C3AED', '#BE185D', '#4D7C0F', '#B45309', '#0F766E', '#9333EA']
const FIXED: Record<string, string> = { M: '#D97706', T: '#0E9384', N: '#4338CA', D12: '#0284C7', N12: '#7C3AED', INT: '#BE185D', ADM: '#4D7C0F' }

export function shiftColor(code: string, all: string[] = []): string {
  if (FIXED[code]) return FIXED[code]
  const free = PALETTE.filter((c) => !Object.values(FIXED).includes(c))
  const i = all.indexOf(code)
  if (i >= 0) return PALETTE[i % PALETTE.length]
  let h = 0
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return free[h % free.length]
}

export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}
export const fromMin = (m: number): string => {
  const x = ((m % 1440) + 1440) % 1440
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`
}
/** "06–14", "22–06", "07:30–19:30". */
export function rangeLabel(start: string, durationMin: number): string {
  const s = toMin(start)
  const e = s + durationMin
  const short = (m: number) => (m % 60 === 0 ? fromMin(m).slice(0, 2) : fromMin(m))
  return `${short(s)}–${short(e)}`
}

export function shiftSegments(sh: Pick<ShiftSpec, 'start' | 'duration_min' | 'blocks'>): [number, number][] {
  if (sh.blocks && sh.blocks.length) return sh.blocks.map(([a, d]) => [toMin(String(a)), toMin(String(a)) + Number(d)])
  const s = toMin(sh.start)
  return [[s, s + sh.duration_min]]
}

export function workedMinutes(sh: Pick<ShiftSpec, 'start' | 'duration_min' | 'blocks'>): number {
  return shiftSegments(sh).reduce((a, [s, e]) => a + e - s, 0)
}

export const isWork = (c: string) => c !== OFF && c !== RESERVE

export function kStar(seq: string[]): number {
  const w = seq.filter(isWork).length
  const s = new Set(seq.filter(isWork)).size
  return w ? (s * seq.length) / w : 0
}

export function weeklyHours(seq: string[], shifts: ShiftSpec[]): number {
  const by = new Map(shifts.map((s) => [s.code, s]))
  const min = seq.filter(isWork).reduce((a, c) => a + (by.get(c) ? workedMinutes(by.get(c)!) : 0), 0)
  return seq.length ? (min * 7) / (seq.length * 60) : 0
}

/** "Bloco de n dias por turno + folgas" (FR-29). */
export function fromBlocks(codes: string[], daysPerShift: number, offDays: number, reverse = false): string[] {
  const order = reverse ? [...codes].reverse() : codes
  return [...order.flatMap((c) => Array<string>(Math.max(1, daysPerShift)).fill(c)), ...Array<string>(Math.max(0, offDays)).fill(OFF)]
}

/** Texto livre "M M T T N N F F" / "M,M,T" → sequência. */
export function parseSequence(text: string): string[] {
  return text
    .toUpperCase()
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

export function layerK(l: LayerSpec): number {
  const ks = Math.ceil(kStar(l.sequence) || 1)
  if (l.team_mode === 'fixo' || !l.team_mode) return l.k ?? ks
  if (l.team_mode === 'minimo' || l.team_mode === 'faixa') return l.k_min ?? ks
  return ks
}

export function totalTeams(p: PatternSpec): number {
  return p.layers.reduce((a, l) => a + layerK(l), 0)
}

export function nextShiftCode(existing: string[], hours: number): string {
  const base = hours === 12 ? 'D12' : hours === 24 ? 'P24' : hours === 6 ? 'S6' : hours === 10 ? 'D10' : 'X'
  if (!existing.includes(base) && base !== 'X') return base
  for (let i = 1; i < 99; i++) {
    const c = `${base === 'X' ? 'T' : base}${i}`.slice(0, 8)
    if (!existing.includes(c)) return c
  }
  return `Z${existing.length}`
}

export function teamName(i: number): string {
  let s = ''
  let n = i + 1
  while (n) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function blankPattern(): PatternSpec {
  return {
    name: 'Padrão personalizado',
    derived_from: null,
    shifts: [
      { code: 'M', start: '06:00', duration_min: 480, break_min: 60, handover_min: 0, peak: false },
      { code: 'T', start: '14:00', duration_min: 480, break_min: 60, handover_min: 0, peak: false },
      { code: 'N', start: '22:00', duration_min: 480, break_min: 60, handover_min: 0, peak: false },
    ],
    layers: [{ code: 'NUCLEO', name: 'Núcleo', sequence: ['M', 'M', 'T', 'T', 'N', 'N', 'F', 'F', 'F', 'F'], rotation: 'frente', team_mode: 'fixo', k: 5, fixed_off_weekdays: [], active_weekdays: ALL_DAYS, weekly_anchor: false }],
    anchor_date: null,
    operating_window: null,
  }
}

/** Camada de reforço 5x2 (FR-30): turno intermediário seg–sex. */
export function reinforcementLayer(p: PatternSpec): { shifts: ShiftSpec[]; layer: LayerSpec } {
  const shifts = [...p.shifts]
  if (!shifts.some((s) => s.code === 'INT')) shifts.push({ code: 'INT', start: '10:00', duration_min: 480, break_min: 60, handover_min: 0, peak: false })
  let code = 'REFORCO'
  for (let i = 2; p.layers.some((l) => l.code === code); i++) code = `REFORCO${i}`
  return { shifts, layer: { code, name: 'Reforço 5x2', sequence: ['INT', 'INT', 'INT', 'INT', 'INT', 'F', 'F'], rotation: 'frente', team_mode: 'fixo', k: 1, fixed_off_weekdays: [], active_weekdays: ALL_DAYS, weekly_anchor: true } }
}

/** Aplica K/modo/tamanhos do passo 4 a um padrão derivado do catálogo (K distribuído entre camadas). */
export function applyTeams(p: PatternSpec, opts: { mode: KMode; k: number; kMin?: number; kMax?: number; sizes?: number[] }): PatternSpec {
  const n = p.layers.length
  let offset = 0
  const layers = p.layers.map((l, i) => {
    const share = (v: number) => Math.max(1, Math.floor(v / n) + (i < v % n ? 1 : 0))
    const k = share(opts.k)
    const out: LayerSpec = { ...l, team_mode: opts.mode, k: opts.mode === 'fixo' ? k : null, k_min: null, k_max: null }
    if (opts.mode === 'minimo') out.k_min = share(opts.kMin ?? opts.k)
    if (opts.mode === 'faixa') {
      out.k_min = share(opts.kMin ?? 1)
      out.k_max = Math.max(out.k_min, share(opts.kMax ?? opts.k))
    }
    if (opts.mode === 'fixo' && opts.sizes?.length) {
      out.team_sizes = opts.sizes.slice(offset, offset + k).map(String)
      if (out.team_sizes.length < k) out.team_sizes = undefined
    }
    if (out.offsets && out.offsets.length !== k) out.offsets = null
    offset += k
    return out
  })
  return { ...p, layers }
}
