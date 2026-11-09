import { useState } from 'react'
import { clsx } from 'clsx'
import type { FindingOut } from '../api/client'
import { fmtDate } from '../api/format'

const SEV = {
  erro: { label: 'Erro', icon: '✕', cls: 'text-sev-erro bg-sev-erro-bg border-sev-erro' },
  alerta: { label: 'Alerta', icon: '!', cls: 'text-sev-alerta bg-sev-alerta-bg border-sev-alerta' },
  info: { label: 'Info', icon: 'i', cls: 'text-sev-info bg-sev-info-bg border-sev-info' },
} as const
type Sev = keyof typeof SEV

/** Painel de achados agrupado por severidade (04 §8.4); "Ver no calendário" leva o foco à data. */
export function FindingsPanel({ findings, onGoTo }: { findings: FindingOut[]; onGoTo?: (f: FindingOut) => void }) {
  const [filter, setFilter] = useState<Sev | 'todos'>('todos')
  const counts = { erro: 0, alerta: 0, info: 0 } as Record<Sev, number>
  findings.forEach((f) => (counts[f.severity as Sev] += 1))
  const groups = (['erro', 'alerta', 'info'] as Sev[]).filter((s) => filter === 'todos' || filter === s)
  return (
    <section aria-labelledby="achados-t" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="achados-t" className="text-h2 font-semibold">
          Achados de viabilidade
        </h2>
        <div role="group" aria-label="Filtrar por severidade" className="flex gap-1">
          {(['todos', 'erro', 'alerta', 'info'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={filter === s}
              onClick={() => setFilter(s)}
              className={clsx('rounded-full border px-3 py-1 text-caption', filter === s ? 'border-primary bg-primary text-white' : 'border-border')}
            >
              {s === 'todos' ? `Todos (${findings.length})` : `${SEV[s].label} (${counts[s]})`}
            </button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {findings.length} achados: {counts.erro} erros, {counts.alerta} alertas, {counts.info} informativos.
      </p>
      {findings.length === 0 && <p className="text-ink-muted">🛡✓ Nenhum achado: escala viável para os parâmetros.</p>}
      {groups.map((s) =>
        counts[s] === 0 ? null : (
          <div key={s}>
            <h3 className="mb-1 text-body font-semibold">
              {SEV[s].label} · {counts[s]}
            </h3>
            <ul className="flex flex-col gap-2">
              {findings
                .filter((f) => f.severity === s)
                .map((f) => (
                  <li key={f.id} className={clsx('rounded-card border-l-4 border bg-surface p-3', SEV[s].cls.split(' ').find((c) => c.startsWith('border-')))}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 text-caption font-medium', SEV[s].cls)}>
                        <span aria-hidden="true">{SEV[s].icon}</span>
                        {SEV[s].label}
                      </span>
                      <code className="font-mono text-caption">{f.rule_code}</code>
                      {f.team && <span className="text-caption text-ink-muted">Turma {f.team}</span>}
                      {f.occurs_on && <span className="text-caption text-ink-muted">{fmtDate(f.occurs_on)}</span>}
                    </div>
                    <p className="mt-1">{f.message}</p>
                    <p className="text-caption text-ink-subtle">Fundamento: {f.legal_reference}</p>
                    {f.occurs_on && onGoTo && (
                      <button type="button" className="mt-1 text-caption text-primary underline" onClick={() => onGoTo(f)}>
                        Ver no calendário
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ),
      )}
    </section>
  )
}
