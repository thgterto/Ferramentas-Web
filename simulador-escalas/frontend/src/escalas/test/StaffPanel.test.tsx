import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { RestReport, StaffingCalculator } from '../components/StaffPanel'
import { axeViolations, mockFetch, renderWithProviders } from './utils'

const STAFFING = {
  post_hours_week: '336.000000',
  post_hours_year: '17520.000000',
  simultaneous_posts_avg: '2.000000',
  weekly_hours: '42.000000',
  weekly_hours_source: 'modelo',
  shift_hours: '8.000000',
  contracted_hours_year: '2190.000000',
  net_hours_year: '1839.600000',
  unavailability_rate: '0.160000',
  components: [
    { code: 'ferias', rate: '0.000000', hours_per_year: '0.000000' },
    { code: 'absenteismo', rate: '0.160000', hours_per_year: '350.400000' },
  ],
  coverage_factor: '9.523810',
  people_per_post: '4.761905',
  headcount_min: 8,
  headcount_recommended: 10,
  reserve: 2,
  headcount_current: 8,
  headcount_gap: 2,
  status: 'sem_reserva',
  legal_regime: 'CLT_44H_ATUAL@1',
  legal_weekly_hours: '44.000000',
}

const person = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: id,
  team: id[0],
  role: null,
  worked_days: 21,
  rest_days: 7,
  min_rest_days: 8,
  pending_rest_days: 1,
  max_consecutive_days: 6,
  hours: '168.000000',
  sundays_worked: 3,
  holidays_worked: 1,
  nights: 7,
  weekends_off: 1,
  alerts: ['FOL_FOLGAS_PENDENTES'],
  ...over,
})

const REST = {
  month: '2027-02',
  generated_people: true,
  rule: { weekly_rest_days: '2.000000', max_consecutive_days: 6, min_rest_days_month: 8, source: 'informado', legal_regime: 'CLT_44H_ATUAL@1' },
  people: [person('A-01'), person('B-01', { rest_days: 8, pending_rest_days: 0, alerts: [] })],
  equity: [{ metric: 'rest_days', min: '7.000000', max: '8.000000', mean: '7.500000', index: '0.933333' }],
  coverage: { deficit_hours: 0, days_with_deficit: 0, coverage_index_min: '1.000000', coverage_index_mean: '1.000000' },
  can_close: false,
  blockers: [{ code: 'FOL_FOLGAS_PENDENTES', count: 1, message: '1 pessoa(s) com folgas pendentes (1 folga(s) abaixo do mínimo do mês)' }],
}

describe('Equipe e folgas (v3.9)', () => {
  it('calculadora de quadro envia os componentes e mostra mínima × recomendada', async () => {
    const calls = mockFetch({ 'POST /scenarios/sc1/staffing': { data: STAFFING } })
    const { container } = renderWithProviders(<StaffingCalculator scenarioId="sc1" />)
    expect(await screen.findByTestId('staffing-status')).toHaveTextContent('faltam 2 pessoa(s)')
    expect(calls[0].body).toMatchObject({ vacation_days: '30', absenteeism_pct: '0.0000' })
    fireEvent.change(screen.getByLabelText('Férias (dias/ano)'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Absenteísmo (%)'), { target: { value: '16' } })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular quadro' }))
    await waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1].body).toMatchObject({ vacation_days: '0', absenteeism_pct: '0.1600' })
    expect(calls[1].body).not.toHaveProperty('weekly_hours')
    expect(screen.getByText('Equipe recomendada').parentElement).toHaveTextContent('10')
    expect(screen.getByText('Equipe mínima').parentElement).toHaveTextContent('8')
    const t = screen.getByRole('table', { name: 'Componentes da indisponibilidade' })
    expect(within(t).getByText('Absenteísmo').closest('tr')).toHaveTextContent('16,0%')
    expect(await axeViolations(container)).toEqual([])
  })

  it('relatório de folgas mostra pendências e bloqueios de fechamento', async () => {
    const calls = mockFetch({ 'GET /scenarios/sc1/rest-report': { data: REST } })
    const { container } = renderWithProviders(<RestReport scenarioId="sc1" start="2027-02-01" />)
    expect(await screen.findByTestId('closing-status')).toHaveTextContent('pendências de fechamento')
    expect(screen.getByTestId('closing-status')).toHaveTextContent('1 pessoa(s) com folgas pendentes')
    const t = screen.getByRole('table', { name: 'Folgas por colaborador' })
    expect(within(t).getByText('A-01').closest('tr')).toHaveTextContent('✕ 1')
    expect(within(t).getByText('B-01').closest('tr')).not.toHaveTextContent('✕')
    expect(calls[0].url).toBe('/scenarios/sc1/rest-report?month=2027-02')
    fireEvent.change(screen.getByLabelText('Folgas por semana'), { target: { value: '2' } })
    await waitFor(() => expect(calls.at(-1)!.url).toContain('weekly_rest_days=2'))
    expect(await axeViolations(container)).toEqual([])
  })
})
