import type { LegalRegimeOut, TransitionOut, TransitionPhase } from '../api/client'
import { fmt, REGIME_LABEL, regimeCode } from '../api/format'
import { ComplianceBadge } from './ComplianceBadge'
import { TransitionTimeline } from './TransitionTimeline'
import { Button } from './ui'

function delta(p: TransitionPhase, first: number | undefined): number | null {
  const hc = p.scenario_model?.compliant ? p.scenario_model.headcount : p.recommended?.headcount
  return hc != null && first != null ? hc - first : null
}

/** Bloco "Simular transição" (FR-41, 04 §8.14 / §11.7). */
export function TransitionBlock({
  data,
  regimes,
  current,
  onCreatePhase,
}: {
  data: TransitionOut
  regimes: LegalRegimeOut[]
  current?: string | null
  onCreatePhase?: (p: TransitionPhase) => void
}) {
  const byCode = Object.fromEntries(data.phases.map((p) => [regimeCode(p.regime), p]))
  const first = data.phases[0]?.scenario_model?.headcount
  const summary = (code: string) => {
    const p = byCode[code]
    if (!p) return 'sem dados'
    const sm = p.scenario_model
    const people = sm?.compliant ? sm.headcount : p.recommended?.headcount
    return `${people ?? '?'} pessoas, ${sm?.compliant ? 'conforme' : 'não conforme'}`
  }
  return (
    <section aria-labelledby="trans-t" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h2 id="trans-t" className="text-h2 font-semibold">
        Simular transição · {data.team_size} pessoas por turma
      </h2>
      <TransitionTimeline
        regimes={regimes}
        selected={current}
        ariaDetail={summary}
        renderDetail={(code) => {
          const p = byCode[code]
          if (!p) return null
          const sm = p.scenario_model
          const d = delta(p, first)
          return (
            <div className="mt-2 flex flex-col gap-1 text-caption">
              {sm && (
                <p className="tabular-nums">
                  {sm.code} · {fmt(sm.teams, 1)} turmas · {sm.headcount} p. · {fmt(sm.avg_weekly_hours, 1)} h/sem{' '}
                  <ComplianceBadge status={sm.compliant ? 'conforme' : 'nao_conforme'} compact />
                </p>
              )}
              {sm && !sm.compliant && sm.findings.length > 0 && <p className="text-ink-muted">{sm.findings.map((f) => f.rule_code).join(' · ')}</p>}
              {sm && !sm.compliant && p.recommended && (
                <p className="tabular-nums">
                  → {p.recommended.code}
                  {p.recommended.half_teams ? ` ${Math.round(Number(p.recommended.teams_required) * 2)} meias` : ` ${fmt(p.recommended.teams_required, 1)} turmas`} · {p.recommended.headcount} p. · {fmt(p.recommended.avg_weekly_hours, 1)} h{' '}
                  <ComplianceBadge status="conforme" compact />
                </p>
              )}
              {d != null && d !== 0 && <p className="font-semibold">{d > 0 ? `+${d}` : d} pessoas vs. 44 h</p>}
              {onCreatePhase && (
                <Button variant="ghost" className="w-fit px-0" onClick={() => onCreatePhase(p)}>
                  Criar cenário desta fase
                </Button>
              )}
            </div>
          )
        }}
      />
      <details>
        <summary className="cursor-pointer text-caption text-primary">Ver como tabela</summary>
        <table className="mt-2 w-full text-body">
          <thead className="bg-surface-2 text-left">
            <tr>
              <th scope="col" className="p-1">Fase</th>
              <th scope="col" className="p-1">Modelo do cenário</th>
              <th scope="col" className="p-1">K legal</th>
              <th scope="col" className="p-1">Recomendado</th>
              <th scope="col" className="p-1 text-right">Pessoas</th>
              <th scope="col" className="p-1 text-right">Δ vs. 44 h</th>
            </tr>
          </thead>
          <tbody>
            {data.phases.map((p) => (
              <tr key={p.regime} className="border-t border-border">
                <th scope="row" className="p-1 text-left font-normal">{REGIME_LABEL[regimeCode(p.regime)] ?? p.regime}</th>
                <td className="p-1">{p.scenario_model ? `${p.scenario_model.code} · ${p.scenario_model.compliant ? 'conforme' : 'não conforme'}` : '—'}</td>
                <td className="p-1 tabular-nums">{fmt(p.k_legal, 1)}</td>
                <td className="p-1">{p.recommended ? `${p.recommended.code}${p.recommended.half_teams ? ' (meias)' : ''}` : '—'}</td>
                <td className="p-1 text-right tabular-nums">{p.scenario_model?.compliant ? p.scenario_model.headcount : p.recommended?.headcount ?? '—'}</td>
                <td className="p-1 text-right tabular-nums">{delta(p, first) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
