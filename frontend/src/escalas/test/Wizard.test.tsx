import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import WizardPage from '../wizard/WizardPage'
import { parseDemandCsv } from '../wizard/schema'
import { MODELS, REGIMES } from './fixtures'
import { axeViolations, mockFetch, renderWithProviders } from './utils'

const PATH = '/escalas/o/:org/operacoes/:op/cenarios/novo'
const ROUTE = '/escalas/o/org1/operacoes/op1/cenarios/novo?passo=1'
const SHIFTS = ['M', 'T', 'N', 'D12', 'N12'].map((c) => ({ id: c, code: c, name: c, start_time: '06:00', duration_minutes: 480, break_minutes: 60, break_policy: 'x', scope: 'global' }))

function mocks(extra: Record<string, unknown> = {}) {
  return mockFetch({
    'GET /legal-regimes': { data: REGIMES },
    'GET /schedule-models': { data: MODELS },
    'GET /shift-templates': { data: SHIFTS },
    'POST /labor-agreements': { data: { id: 'ag1' } },
    'POST /operations/op1/positions': { data: { id: 'pos1' } },
    'POST /positions/pos1/demand-curves': { data: { id: 'cur1' } },
    'POST /shrinkage-profiles': { data: { id: 'sh1' } },
    'POST /scenarios': { data: { id: 'sc1', lineage_id: 'l', version: 1, status: 'rascunho', row_version: 1 } },
    'POST /scenarios/sc1/simulate': { data: {} },
    ...extra,
  })
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Avançar' }))

describe('Wizard de 5 passos (A26/A47)', () => {
  it('passo 1: valida nome e mostra linha do tempo; data sem regime vigente bloqueia', async () => {
    mocks({ 'GET /legal-regimes:resolve': new Response(JSON.stringify({ error: { message: 'x' } }), { status: 422 }) })
    const { container } = renderWithProviders(<WizardPage />, { route: ROUTE, path: PATH })
    expect(await screen.findByRole('heading', { name: /Passo 1 · Operação e regras/ })).toBeInTheDocument()
    await screen.findByText(/Premissa — texto promulgado não confirmado/)
    expect(screen.getByRole('listitem', { current: 'step', name: /^Regime/ })).toHaveTextContent('44 h')
    fireEvent.change(screen.getByLabelText('Nome do cenário'), { target: { value: 'x' } })
    next()
    expect(await screen.findByText(/mínimo 2 caracteres/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nome do cenário'), { target: { value: 'Cenário A' } })
    fireEvent.click(screen.getByLabelText('Data de referência'))
    fireEvent.change(await screen.findByLabelText('Data de referência', { selector: 'input[type=date]' }), { target: { value: '2028-03-01' } })
    await screen.findByText(/Sem regime vigente nesta data/)
    next()
    await waitFor(() => expect(screen.getByRole('heading', { name: /Passo 1/ })).toBeInTheDocument())
    expect(await axeViolations(container)).toEqual([])
  })

  it('passo 1 com data resolve o regime (GET /legal-regimes:resolve)', async () => {
    mocks({ 'GET /legal-regimes:resolve': { data: REGIMES[2] } })
    renderWithProviders(<WizardPage />, { route: ROUTE, path: PATH })
    fireEvent.click(await screen.findByLabelText('Data de referência'))
    fireEvent.change(screen.getByLabelText('Data de referência', { selector: 'input[type=date]' }), { target: { value: '2028-03-01' } })
    expect(await screen.findByText('Regime vigente: 40 h · regime-alvo')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('listitem', { current: 'step', name: /^Regime/ })).toHaveTextContent('40 h'))
  })

  it('passo 2: grade 168 h exige demanda > 0; CSV inválido lista erros', async () => {
    mocks()
    renderWithProviders(<WizardPage />, { route: ROUTE.replace('passo=1', 'passo=2'), path: PATH })
    fireEvent.click(await screen.findByLabelText(/Curva 168 h/))
    expect(screen.getAllByRole('spinbutton', { name: /^(Seg|Ter|Qua|Qui|Sex|Sáb|Dom) \d\dh$/ })).toHaveLength(168)
    expect(parseDemandCsv('a;b\n1;2').errors[0]).toMatch(/esperado 168 linhas/)
    expect(parseDemandCsv(Array.from({ length: 168 }, () => '2').join('\n')).values).toHaveLength(168)
    expect(parseDemandCsv(Array.from({ length: 7 }, () => Array(24).fill('-1').join(';')).join('\n')).errors[0]).toMatch(/inteiro ≥ 0/)
  })

  it('passo 3: shrinkage ≥ 60% é inválido', async () => {
    mocks()
    renderWithProviders(<WizardPage />, { route: ROUTE.replace('passo=1', 'passo=3'), path: PATH })
    fireEvent.change(await screen.findByLabelText('Shrinkage diurno (%)'), { target: { value: '65' } })
    next()
    expect(await screen.findByText(/deve ser menor que 60%/)).toBeInTheDocument()
  })

  it('passo 4: cards com selo do regime, pré-checagem de K e axe', async () => {
    mocks()
    const { container } = renderWithProviders(<WizardPage />, { route: ROUTE.replace('passo=1', 'passo=4'), path: PATH })
    const card = await screen.findByTestId('modelo-4X2')
    expect(card).toHaveTextContent('Conforme')
    expect(screen.getByTestId('modelo-2X2_12H')).toHaveTextContent('Só com ACT/CCT')
    fireEvent.click(card)
    fireEvent.change(screen.getByLabelText('Nº de turmas (K fixo)'), { target: { value: '4' } })
    expect(await screen.findByText(/COB_TURMAS_INSUFICIENTES: 4 turmas < K necessário 4,5 — sugestão: 5 turmas ou 9 meias-turmas/)).toBeInTheDocument()
    expect(await axeViolations(container)).toEqual([])
  })

  it('fluxo completo: passo 5 simula e envia o cenário com regime/transição', async () => {
    const calls = mocks()
    renderWithProviders(<WizardPage />, { route: ROUTE, path: PATH })
    await screen.findByRole('heading', { name: /Passo 1/ })
    fireEvent.click(screen.getByLabelText(/Simular transição/))
    next()
    await screen.findByRole('heading', { name: /Passo 2/ })
    next()
    await screen.findByRole('heading', { name: /Passo 3/ })
    fireEvent.change(screen.getByLabelText('Shrinkage diurno (%)'), { target: { value: '8' } })
    next()
    await screen.findByRole('heading', { name: /Passo 4/ })
    await screen.findByTestId('modelo-6X2')
    next()
    await screen.findByRole('heading', { name: /Passo 5/ })
    expect(screen.getByText('6X2 · 4 turmas · turnos M/T/N')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Simular cobertura' }))
    await waitFor(() => expect(calls.some((c) => c.url === '/scenarios/sc1/simulate')).toBe(true))
    const sc = calls.find((c) => c.method === 'POST' && c.url === '/scenarios')!.body as Record<string, unknown>
    expect(sc).toMatchObject({ schedule_model_code: '6X2', team_count: 4, legal_regime_code: 'CLT_44H_ATUAL', simulate_transition: true, shrinkage_profile_id: 'sh1', shift_template_codes: ['M', 'T', 'N'] })
    const curve = calls.find((c) => c.url === '/positions/pos1/demand-curves')!.body as { values: string[] }
    expect(curve.values).toHaveLength(168)
  })
})
