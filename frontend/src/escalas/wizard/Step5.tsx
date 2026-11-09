import { useFormContext } from 'react-hook-form'
import { REGIME_LABEL } from '../api/format'
import { totalTeams, type PatternSpec } from '../pattern/model'
import type { WizardValues } from './schema'
import type { RegimeResolution } from './useRegime'

function modelLine(v: WizardValues): string {
  if (v.customized && v.pattern) {
    const p = v.pattern as PatternSpec
    const seqs = p.layers.map((l) => `${l.code} [${l.sequence.join(' ')}] K ${l.team_mode === 'fixo' ? l.k : l.team_mode}`).join(' + ')
    return `Personalizado “${p.name}” · ${totalTeams(p)} turmas · ${seqs} · turnos ${p.shifts.map((s) => s.code).join('/')}`
  }
  const k = v.kMode === 'fixo' ? `${v.teamCount} turmas` : v.kMode === 'sugerir' ? 'K sugerido pelo motor' : v.kMode === 'minimo' ? `K ≥ ${v.kMin}` : `K ${v.kMin}–${v.kMax}`
  const sizes = v.kMode === 'fixo' && v.teamSizes.length ? ` (pessoas ${v.teamSizes.join('/')})` : ''
  return `${v.modelCode} · ${k}${sizes}${v.shiftCodes.length ? ` · turnos ${v.shiftCodes.join('/')}` : ''}`
}

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
    ['Modelo e turmas', modelLine(v)],
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
