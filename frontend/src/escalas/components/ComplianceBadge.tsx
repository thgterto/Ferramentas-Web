import { clsx } from 'clsx'
import { statusFor, type ComplianceStatus } from './compliance'


const META: Record<ComplianceStatus, { label: string; icon: string; cls: string; tip?: string }> = {
  conforme: { label: 'Conforme', icon: '🛡✓', cls: 'text-sev-ok bg-sev-ok-bg border-sev-ok' },
  so_com_act: { label: 'Só com ACT/CCT', icon: '⚠', cls: 'text-sev-alerta bg-sev-alerta-bg border-sev-alerta', tip: 'Viável apenas com acordo/convenção de compensação' },
  regime_especial: { label: 'Regime especial', icon: 'ⓘ', cls: 'text-sev-info bg-sev-info-bg border-sev-info', tip: 'Pendente de lei ordinária' },
  nao_conforme: { label: 'Não conforme', icon: '✕', cls: 'text-sev-erro bg-sev-erro-bg border-sev-erro' },
  baseline: { label: 'Baseline', icon: '⟲', cls: 'text-ink-muted bg-surface-2 border-border', tip: '6x1 vedada neste regime: usado só como comparação' },
}

const SHORT: Record<string, string> = { CLT_44H_ATUAL: '44', TRANSICAO_42H: '42', PEC_40H: '40' }


export function ComplianceBadge({ status, compact = false }: { status: ComplianceStatus; compact?: boolean }) {
  const m = META[status]
  return (
    <span
      className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium', compact ? 'text-micro' : 'text-caption', m.cls)}
      title={m.tip}
    >
      <span aria-hidden="true">{m.icon}</span>
      {m.label}
    </span>
  )
}

/** Mini-linha 44 / 42 / 40 do card do catálogo (04 §8.15). */
export function RegimeMiniLine({ modelCode, compliance, current }: { modelCode: string; compliance: Record<string, unknown>; current: string }) {
  const regs = ['CLT_44H_ATUAL', 'TRANSICAO_42H', 'PEC_40H']
  return (
    <ul className="flex gap-1" aria-label="Conformidade por regime">
      {regs.map((r) => {
        const st = statusFor(modelCode, r, compliance)
        const ok = st === 'conforme'
        const sym = ok ? '✓' : st === 'nao_conforme' ? '✕' : st === 'baseline' ? '⟲' : st === 'so_com_act' ? '!' : 'i'
        return (
          <li
            key={r}
            className={clsx('rounded-full border px-1.5 text-micro tabular-nums', r === current ? 'border-primary font-semibold' : 'border-border text-ink-muted')}
            aria-label={`${SHORT[r]} horas: ${META[st].label}`}
          >
            {SHORT[r]} <span aria-hidden="true">{sym}</span>
          </li>
        )
      })}
    </ul>
  )
}
