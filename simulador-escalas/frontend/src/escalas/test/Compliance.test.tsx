import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComplianceBadge, RegimeMiniLine } from '../components/ComplianceBadge'
import { statusFor } from '../components/compliance'
import { TransitionTimeline } from '../components/TransitionTimeline'
import { TransitionBlock } from '../components/TransitionBlock'
import type { TransitionOut } from '../api/client'
import { MODELS, REGIMES } from './fixtures'
import { axeViolations } from './utils'

const TRANSITION: TransitionOut = {
  team_size: 10,
  phases: [
    { regime: 'CLT_44H_ATUAL@1', k_legal: '4.000000', k_legal_half_teams: '4.000000', min_headcount_legal: 40, scenario_model: { code: '6X2', compliant: true, teams: '4.000000', headcount: 40, avg_weekly_hours: '42.000000', findings: [] }, recommended: null, alternatives: [] },
    { regime: 'TRANSICAO_42H@1', k_legal: '4.000000', k_legal_half_teams: '4.000000', min_headcount_legal: 40, scenario_model: { code: '6X2', compliant: true, teams: '4.000000', headcount: 40, avg_weekly_hours: '42.000000', findings: [] }, recommended: null, alternatives: [] },
    {
      regime: 'PEC_40H@1', k_legal: '5.000000', k_legal_half_teams: '4.500000', min_headcount_legal: 45,
      scenario_model: { code: '6X2', compliant: false, teams: '4.000000', headcount: 40, avg_weekly_hours: '42.000000', findings: [{ rule_code: 'CLT_CARGA_SEMANAL_EXCEDIDA', severity: 'erro', message: 'x', details: {} }, { rule_code: 'CLT_FOLGAS_SEMANAIS_INSUFICIENTES', severity: 'erro', message: 'y', details: {} }] },
      recommended: { code: '4X2', variant: 'meias', half_teams: true, teams_required: '4.500000', headcount: 45, avg_weekly_hours: '37.333333', delta_headcount_vs_first: 5 },
      alternatives: [],
    },
  ],
}

describe('Selo de conformidade e linha do tempo (A47)', () => {
  it('status por regime vem da API; 6x1 fora do 44 h é baseline', () => {
    const m6x2 = MODELS[0]
    expect(statusFor('6X2', 'PEC_40H', m6x2.regime_compliance)).toBe('nao_conforme')
    expect(statusFor('6X2', 'CLT_44H_ATUAL', m6x2.regime_compliance)).toBe('conforme')
    expect(statusFor('6X1_BASE', 'PEC_40H', MODELS[2].regime_compliance)).toBe('baseline')
    expect(statusFor('2X2_12H', 'CLT_44H_ATUAL', MODELS.find((m) => m.code === '2X2_12H')!.regime_compliance)).toBe('so_com_act')
    expect(statusFor('6X1_BASE', 'CLT_44H_ATUAL', MODELS[2].regime_compliance)).toBe('conforme')
  })

  it('selo tem ícone + texto (não só cor) e mini-linha 44/42/40', () => {
    render(
      <>
        <ComplianceBadge status="nao_conforme" />
        <RegimeMiniLine modelCode="6X2" compliance={MODELS[0].regime_compliance} current="PEC_40H" />
      </>,
    )
    expect(screen.getByText('Não conforme')).toBeInTheDocument()
    expect(screen.getByLabelText('40 horas: Não conforme')).toHaveClass('font-semibold')
    expect(screen.getByLabelText('44 horas: Conforme')).toBeInTheDocument()
  })

  it('linha do tempo: 3 fases em ordem, fase atual com aria-current e selo de premissa', () => {
    render(<TransitionTimeline regimes={REGIMES} selected="TRANSICAO_42H" />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual([expect.stringContaining('44 h'), expect.stringContaining('42 h'), expect.stringContaining('40 h')])
    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText(/Premissa — texto promulgado não confirmado/)).toBeInTheDocument()
  })

  it('bloco "Simular transição": 40 → 40 → 45 pessoas (4x2 9 meias)', async () => {
    const { container } = render(<TransitionBlock data={TRANSITION} regimes={REGIMES} current="CLT_44H_ATUAL" onCreatePhase={() => {}} />)
    expect(screen.getByLabelText(/Regime 40 h · regime-alvo.*45 pessoas, não conforme/)).toBeInTheDocument()
    expect(screen.getByText(/4X2 9 meias · 45 p\./)).toBeInTheDocument()
    expect(screen.getByText('+5 pessoas vs. 44 h')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Criar cenário desta fase' })).toHaveLength(3)
    expect(await axeViolations(container)).toEqual([])
  })
})
