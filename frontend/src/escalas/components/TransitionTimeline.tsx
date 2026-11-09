import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import type { LegalRegimeOut } from '../api/client'
import { fmtDate, REGIME_LABEL } from '../api/format'

const ORDER = ['CLT_44H_ATUAL', 'TRANSICAO_42H', 'PEC_40H']
const DEFAULT_RANGE: Record<string, string> = {
  CLT_44H_ATUAL: 'até D0 + 59 dias',
  TRANSICAO_42H: 'D0 + 60 d → D0 + 14 meses',
  PEC_40H: 'a partir de D0 + 14 meses',
}

function range(r: LegalRegimeOut | undefined, code: string): string {
  const from = r?.resolved_valid_from ?? r?.valid_from
  const to = r?.resolved_valid_to ?? r?.valid_to
  if (from && to) return `${fmtDate(from)} → ${fmtDate(to)}`
  if (from) return `a partir de ${fmtDate(from)}`
  if (to) return `até ${fmtDate(to)}`
  return DEFAULT_RANGE[code] ?? ''
}

/** Linha do tempo 44 h → 42 h → 40 h (04 §8.14). Sem cores de turma/cobertura: a fase não é severidade. */
export function TransitionTimeline({
  regimes,
  selected,
  renderDetail,
  ariaDetail,
}: {
  regimes: LegalRegimeOut[]
  selected?: string | null
  renderDetail?: (code: string) => ReactNode
  ariaDetail?: (code: string) => string
}) {
  const byCode = Object.fromEntries(regimes.map((r) => [r.code, r]))
  const premissa = regimes.some((r) => r.status === 'premissa')
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-medium text-ink-muted">Linha do tempo da transição</p>
        {premissa && (
          <span className="inline-flex items-center gap-1 rounded-full border border-sev-info bg-sev-info-bg px-2 py-0.5 text-caption text-sev-info">
            <span aria-hidden="true">ⓘ</span> Premissa — texto promulgado não confirmado
          </span>
        )}
      </div>
      <ol role="list" className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {ORDER.map((code) => {
          const r = byCode[code]
          const cur = selected === code
          const rng = range(r, code)
          return (
            <li
              key={code}
              role="listitem"
              aria-current={cur ? 'step' : undefined}
              aria-label={`Regime ${REGIME_LABEL[code]}, ${rng}${ariaDetail ? `, ${ariaDetail(code)}` : ''}`}
              className={clsx('regime-seg rounded-card border p-3', cur ? 'border-primary bg-surface' : 'border-border bg-surface-2')}
            >
              <p className={clsx('text-body', cur && 'font-semibold')}>
                {cur && <span aria-hidden="true">◆ </span>}
                {REGIME_LABEL[code]}
              </p>
              <p className="text-caption text-ink-muted">{rng}</p>
              {renderDetail?.(code)}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
