import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { OptimizePanel } from '../components/OptimizePanel'
import type { S } from '../api/client'
import { axeViolations, mockFetch, renderWithProviders } from './utils'

const SC = { id: 'sc1', name: '6x2', team_count: 5, status: 'calculado' } as unknown as S['ScenarioOut']

const OUT = {
  objective: 'min_headcount',
  status: 'otimo',
  optimal: true,
  objective_value: 4,
  best_bound: 4,
  gap: 0,
  elapsed_ms: 31,
  solver: 'OR-Tools CP-SAT 9.14',
  scope: 'pool P1',
  before: { headcount: 15, team_count: 5, coverage_pct: 1, deficit_post_hours_week: 0, excess_post_hours_week: 42 },
  after: { headcount: 12, team_count: 4, coverage_pct: 1, deficit_post_hours_week: 0, excess_post_hours_week: 0 },
  solution: { units: 4, unit: 'turma', headcount: 12, offsets: [[1, 3, 5, 7]], headcount_separate_subsectors: 16 },
  candidates: [],
  scenario_patch: { team_count: 4, params: { team_size: 3, offsets: [[1, 3, 5, 7]] } },
  notes: ['pool P1: 12 pessoas vs 16 com subsetores separados'],
}

describe('Painel Otimizar (v3.7)', () => {
  it('envia objetivo/escopo/restrições, mostra status, gap, antes × depois e cria cenário', async () => {
    const onApplied = vi.fn()
    const calls = mockFetch({
      'POST /scenarios/sc1/optimize': { data: OUT },
      'POST /scenarios/sc1/optimize/apply': { data: { scenario_id: 'sc2', created: true, simulation: {} } },
    })
    const { container } = renderWithProviders(<OptimizePanel scenario={SC} subsectors={[{ code: 'SA', name: 'Caldeiras' }]} pools={[{ code: 'P1', name: 'Vapor' }]} onApplied={onApplied} />)
    fireEvent.change(screen.getByLabelText('Escopo da demanda'), { target: { value: 'pool:P1' } })
    fireEvent.change(screen.getByLabelText('Cobertura alvo (%)'), { target: { value: '95' } })
    fireEvent.click(screen.getByLabelText('Regras do regime como restrições duras'))
    fireEvent.click(screen.getByRole('button', { name: 'Otimizar' }))
    expect(await screen.findByTestId('opt-status')).toHaveTextContent('Ótimo')
    const body = calls.find((c) => c.url === '/scenarios/sc1/optimize')!.body as Record<string, unknown>
    expect(body).toMatchObject({ objective: 'min_headcount', pool: 'P1', target_coverage: '0.9500', legal_hard: false, team_size_mode: 'fixo' })
    const table = screen.getByRole('table', { name: 'Comparação antes e depois' })
    expect(table).toHaveTextContent(/Headcount1512/)
    expect(table).toHaveTextContent(/Turmas \(K\)54/)
    expect(screen.getByTestId('opt-solution')).toHaveTextContent('subsetores separados: 16')
    expect(screen.getByText(/gap 0.00%/)).toBeInTheDocument()
    expect(await axeViolations(container)).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Criar cenário a partir da solução' }))
    await waitFor(() => expect(onApplied).toHaveBeenCalledWith('sc2', true))
    const ap = calls.find((c) => c.url === '/scenarios/sc1/optimize/apply')!.body as Record<string, unknown>
    expect(ap).toMatchObject({ mode: 'create', patch: OUT.scenario_patch })
  })

  it('K para defasagem/fairness e ranking de modelos', async () => {
    const calls = mockFetch({
      'POST /scenarios/sc1/optimize': {
        data: {
          ...OUT,
          objective: 'best_model',
          scenario_patch: null,
          solution: { code: '6X2', name: '6x2', team_count: 4, headcount: 12, compliance: 'conforme' },
          candidates: [
            { code: '6X2', name: '6x2', compliance: 'conforme', eligible: true, rank: 1, team_count: 4, headcount: 12, deficit_post_hours_week: 0, excess_post_hours_week: 0, status: 'otimo' },
            { code: '6X1_BASE', name: '6x1', compliance: 'nao_conforme', eligible: false, status: 'excluido_regime' },
          ],
        },
      },
    })
    renderWithProviders(<OptimizePanel scenario={SC} />)
    fireEvent.change(screen.getByLabelText('Objetivo'), { target: { value: 'fairness' } })
    expect(screen.getByLabelText('Nº de turmas (K)')).toHaveValue(5)
    fireEvent.change(screen.getByLabelText('Objetivo'), { target: { value: 'best_model' } })
    expect(screen.queryByLabelText('Nº de turmas (K)')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Otimizar' }))
    const rank = await screen.findByRole('table', { name: 'Ranking de modelos' })
    expect(rank).toHaveTextContent('excluido_regime')
    expect(screen.getByText(/Melhor modelo:/)).toHaveTextContent('6x2')
    expect(screen.queryByRole('button', { name: 'Criar cenário a partir da solução' })).toBeNull()
    expect(calls[0].body).toMatchObject({ objective: 'best_model' })
  })
})
