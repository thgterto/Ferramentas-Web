import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { apiData } from '../api/client'
import { WEEKDAYS, fmt, num, pct } from '../api/format'
import { ErrorBox } from '../components/ui'
import type { PatternSpec, PatternValidation } from './model'

function useDebounced<T>(v: T, ms = 300): T {
  const [d, setD] = useState(v)
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms)
    return () => clearTimeout(t)
  }, [v, ms])
  return d
}

const SEV = { erro: 'border-sev-erro bg-sev-erro-bg text-sev-erro', alerta: 'border-sev-alerta bg-sev-alerta-bg text-sev-alerta', info: 'border-sev-info bg-sev-info-bg text-sev-info' } as const
const ICON = { erro: '✕', alerta: '!', info: 'ⓘ' } as const

/** Pré-visualização instantânea (FR-29): K*, exatidão, h/sem, interjornada, cobertura 7×24. */
export function PatternPreview({ pattern, postos, teamSize, regimeCode, demand }: { pattern: PatternSpec; postos: number; teamSize?: number; regimeCode?: string | null; demand?: number[] }) {
  const body = useDebounced(JSON.stringify({ pattern, postos: Math.max(1, postos || 1), team_size: teamSize || undefined, legal_regime_code: regimeCode || undefined, demand }), 300)
  const q = useQuery({
    queryKey: ['pattern-validate', body],
    queryFn: () => apiData<PatternValidation>('/schedule-patterns:validate', { body: JSON.parse(body) }),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60_000,
  })
  const v = q.data
  return (
    <section aria-labelledby="previa-t" aria-busy={q.isFetching} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h3 id="previa-t" className="font-semibold">
        Pré-visualização {q.isFetching && <span className="text-caption font-normal text-ink-muted">· atualizando…</span>}
      </h3>
      <ErrorBox error={q.error} />
      {v && (
        <>
          <dl className="grid grid-cols-2 gap-2 text-body" aria-live="polite">
            <div>
              <dt className="text-caption text-ink-muted">Cobertura</dt>
              <dd className="text-h2 font-semibold tabular-nums">{pct(v.coverage_pct)}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted">Déficit (h-posto/sem)</dt>
              <dd className="text-h2 font-semibold tabular-nums">{fmt(v.deficit_post_hours_week, 1)}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted">Turmas · pessoas</dt>
              <dd className="font-semibold tabular-nums">
                {v.teams_total} · {fmt(v.headcount, 1)}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-muted">K necessário (Σ)</dt>
              <dd className="font-semibold tabular-nums">{fmt(v.k_required_total, 2)}</dd>
            </div>
          </dl>
          <table className="text-caption">
            <caption className="sr-only">Métricas por camada</caption>
            <thead className="text-left text-ink-muted">
              <tr>
                <th scope="col">Camada</th>
                <th scope="col">K*</th>
                <th scope="col">K</th>
                <th scope="col">h/sem</th>
                <th scope="col">Interjornada mín.</th>
                <th scope="col">Exato</th>
              </tr>
            </thead>
            <tbody>
              {v.layers.map((l) => {
                const ij = l.min_rest_between_shifts_hours == null ? null : num(l.min_rest_between_shifts_hours)
                return (
                  <tr key={l.code} className="border-t border-border tabular-nums">
                    <th scope="row" className="text-left font-mono">
                      {l.code}
                    </th>
                    <td>{fmt(l.k_required, 2)}</td>
                    <td>{l.k_used}</td>
                    <td>{fmt(l.avg_weekly_hours, 1)}</td>
                    <td className={clsx(ij != null && ij < 11 && 'font-semibold text-sev-erro')}>{ij == null ? '—' : `${fmt(ij, 1)} h${ij < 11 ? ' ⚠' : ''}`}</td>
                    <td>{l.exact ? '✓ sim' : l.exact_with_half_teams ? 'meias' : 'não'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div role="img" aria-label={`Cobertura 7×24 da pré-visualização: ${pct(v.coverage_pct)} das horas-posto`} className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))' }}>
            {WEEKDAYS.map((d, r) => (
              <div key={d} className="contents">
                <span className="pr-1 text-micro text-ink-subtle">{d}</span>
                {Array.from({ length: 24 }, (_, h) => {
                  const s = v.slots[r * 24 + h]
                  const gap = num(s.gap_worst)
                  const req = num(s.required)
                  const cls = req === 0 && num(s.scheduled_worst) === 0 ? 'bg-surface-2' : gap < 0 ? 'bg-cov-deficit' : gap > 0 ? 'bg-cov-over-fill' : 'bg-cov-exact-fill'
                  return <span key={h} className={clsx('h-3 rounded-[2px]', cls)} title={`${d} ${String(h).padStart(2, '0')}h: necessário ${fmt(req)}, escalados ${fmt(s.scheduled_worst)}`} />
                })}
              </div>
            ))}
          </div>
          <p className="text-micro text-ink-subtle">
            <span className="mr-2">■ vermelho = déficit</span>
            <span className="mr-2">■ verde = exato</span>
            <span>■ azul = excesso · {v.elapsed_ms} ms</span>
          </p>
          {v.findings.length > 0 && (
            <ul className="flex flex-col gap-1" aria-label="Avisos da validação (não impedem simular)">
              {v.findings.map((f, i) => (
                <li key={i} className={clsx('rounded-cell border px-2 py-1 text-caption', SEV[f.severity])}>
                  <span aria-hidden="true">{ICON[f.severity]} </span>
                  <code className="font-mono">{f.rule_code}</code>
                  {f.layer ? ` · ${f.layer}` : ''}: {f.message}
                </li>
              ))}
            </ul>
          )}
          <p className="text-caption text-ink-muted">Avisos legais nunca impedem simular — viram achados no resultado.</p>
        </>
      )}
    </section>
  )
}
