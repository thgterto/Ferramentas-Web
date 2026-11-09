import { useFormContext } from 'react-hook-form'
import { REGIME_LABEL } from '../api/format'
import type { WizardValues } from './schema'
import type { RegimeResolution } from './useRegime'

export function Step5({ regime }: { regime: RegimeResolution }) {
  const v = useFormContext<WizardValues>().watch()
  const rows: [string, string][] = [
    ['Cenário', v.scenarioName],
    ['Regras', `${v.agreementKind}${v.allows8h ? ' · 8 h em revezamento autorizado' : ''}`],
    ['Regime legal', v.legalMode === 'regime' ? REGIME_LABEL[v.legalRegimeCode] ?? v.legalRegimeCode : `data ${v.legalReferenceDate} → ${regime.code ?? '?'}`],
    ['Compensação ACT/CCT', v.compensation ? 'sim' : 'não'],
    ['Horizonte', `${v.horizonStart} · ${v.horizonWeeks} semanas`],
    ['Demanda', v.demandMode === 'fixos' ? `${v.postos} postos fixos 24/7 (${v.positionName})` : `curva 168 h (${v.positionName})`],
    ['Shrinkage', `dia ${v.shrinkDay}% · noite ${v.shrinkNight}%`],
    ['Reserva', v.reserve === 'extras' ? `+${v.extrasPerTeam} por turma` : 'nenhuma'],
    ['Cargos', v.roles.length ? v.roles.map((r) => `${r.code}×${r.perTeam}`).join(', ') : 'cargo único'],
    ['Modelo e turmas', `${v.modelCode} · ${v.teamCount} turmas · turnos ${v.shiftCodes.join('/')}`],
    ['Simular transição', v.simulateTransition ? 'sim' : 'não'],
  ]
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
        {rows.map(([k, val]) => (
          <div key={k} className="contents">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="font-medium">{val}</dd>
          </div>
        ))}
      </dl>
      <details className="rounded-card border border-border p-3 text-ink-subtle">
        <summary>Parâmetros de custo (opcional — Fase 2)</summary>
        <p className="mt-2">Indisponível no MVP.</p>
      </details>
    </div>
  )
}
