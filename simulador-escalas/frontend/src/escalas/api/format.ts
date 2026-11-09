export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const
export const WEEKDAYS_LONG = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const

export const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v))

export function fmt(v: string | number | null | undefined, digits = 1): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  return n.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

export function pct(v: string | number | null | undefined, digits = 1): string {
  if (v == null) return '—'
  return `${(Number(v) * 100).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const REGIME_LABEL: Record<string, string> = {
  CLT_44H_ATUAL: '44 h · atual',
  TRANSICAO_42H: '42 h · transição',
  PEC_40H: '40 h · regime-alvo',
}

export const regimeCode = (applied: string | null | undefined): string => (applied ?? '').split('@')[0]
