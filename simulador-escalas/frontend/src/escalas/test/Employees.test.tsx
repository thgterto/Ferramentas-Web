import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import EmployeesPage from '../pages/EmployeesPage'
import { axeViolations, mockFetch, renderWithProviders } from './utils'

const PATH = '/o/:org/operacoes/:op/colaboradores'
const ROUTE = '/o/org1/operacoes/op1/colaboradores'

const emp = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, operation_id: 'op1', name, registration: null, team_code: null, role_code: null, home_subsector_code: null,
  default_workstation_code: null, skills: [], hire_date: null, contract_weekly_hours: null, restrictions: [], pool_codes: [], active: true, ...extra,
})
const ANA = emp('e1', 'Ana Lima', { registration: '1001', team_code: 'A', role_code: 'OP', home_subsector_code: 'SA', default_workstation_code: 'A1', skills: ['NR-10'], hire_date: '2024-03-01', contract_weekly_hours: '44.00', restrictions: ['nao_noturno'], pool_codes: ['P1'] })
const BRUNO = emp('e2', 'Bruno Reis', { registration: '1002', team_code: 'B' })
const STRUCT = {
  operation_id: 'op1', employees: 2,
  subsectors: [{ id: 's1', operation_id: 'op1', code: 'SA', name: 'Sub A', sort_order: 0, workstations: [{ id: 'w1', subsector_id: 's1', subsector_code: 'SA', code: 'A1', name: 'Posição A1', required_role_code: null, demand_mode: 'postos_fixos', demand_values: [], peak: 1 }] }],
  pools: [{ id: 'p1', operation_id: 'op1', code: 'P1', name: 'Pool', subsector_codes: ['SA', 'SB'], mode: 'total', allowed_role_codes: [], max_borrowed_hours_week: null, prefer_home: true }],
}

function mocks(extra: Record<string, unknown> = {}) {
  return mockFetch({
    'GET /operations/op1': { data: { id: 'op1', name: 'Planta' } },
    'GET /operations/op1/employees': (url: string) => ({ data: url.includes('q=bru') ? [BRUNO] : [ANA, BRUNO] }),
    'GET /operations/op1/structure': { data: STRUCT },
    'GET /roles': { data: [{ id: 'r1', code: 'OP', name: 'Operador' }], meta: {} },
    'GET /scenarios': { data: [{ id: 'sc1', name: '6x1 fixo' }], meta: {} },
    'POST /operations/op1/employees': { data: emp('e3', 'Carla') },
    'PATCH /employees/e1': { data: { ...ANA, active: false } },
    ...extra,
  })
}

describe('Tela de colaboradores (v3.8)', () => {
  it('lista com busca, filtros, restrições legíveis e axe', async () => {
    const calls = mocks()
    const { container } = renderWithProviders(<EmployeesPage />, { route: ROUTE, path: PATH })
    const table = await screen.findByRole('table', { name: 'Colaboradores' })
    expect(within(table).getByText('Ana Lima')).toBeInTheDocument()
    expect(within(table).getByText('Não faz noite')).toBeInTheDocument()
    expect(within(table).getByText('SA / A1')).toBeInTheDocument()
    expect(within(table).getByText('01/03/2024')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'bru' } })
    await waitFor(() => expect(within(screen.getByRole('table', { name: 'Colaboradores' })).queryByText('Ana Lima')).toBeNull())
    fireEvent.change(screen.getByLabelText('Turma'), { target: { value: '-' } })
    await waitFor(() => expect(calls.some((c) => c.url.includes('team=-') && c.url.includes('status=ativo'))).toBe(true))
    expect(await axeViolations(container)).toEqual([])
  })

  it('cria com todos os campos e desativa', async () => {
    const calls = mocks()
    renderWithProviders(<EmployeesPage />, { route: ROUTE, path: PATH })
    fireEvent.click(await screen.findByRole('button', { name: 'Novo colaborador' }))
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carla' } })
    fireEvent.change(screen.getByLabelText('Matrícula'), { target: { value: '2001' } })
    await waitFor(() => expect(screen.getAllByRole('option', { name: 'Operador' }).length).toBeGreaterThan(1))
    fireEvent.change(screen.getByLabelText('Cargo', { selector: '#e-role' }), { target: { value: 'OP' } })
    fireEvent.change(screen.getByLabelText('Subsetor de lotação'), { target: { value: 'SA' } })
    fireEvent.change(screen.getByLabelText('Posição padrão'), { target: { value: 'A1' } })
    fireEvent.change(screen.getByLabelText('Turma', { selector: 'input' }), { target: { value: 'c' } })
    fireEvent.change(screen.getByLabelText('Data de admissão'), { target: { value: '2025-02-10' } })
    fireEvent.change(screen.getByLabelText('Jornada contratual (h/sem)'), { target: { value: '42,5' } })
    fireEvent.change(screen.getByLabelText(/Certificações/), { target: { value: 'NR-35, Brigada' } })
    fireEvent.click(screen.getByLabelText('Não faz noite'))
    fireEvent.click(screen.getByLabelText('P1'))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar colaborador' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/operations/op1/employees')).toBe(true))
    const body = calls.find((c) => c.method === 'POST' && c.url === '/operations/op1/employees')!.body
    expect(body).toEqual({
      name: 'Carla', registration: '2001', role_code: 'OP', home_subsector_code: 'SA', default_workstation_code: 'A1', team_code: 'C',
      hire_date: '2025-02-10', contract_weekly_hours: '42.5', skills: ['NR-35', 'Brigada'], restrictions: ['nao_noturno'], pool_codes: ['P1'], active: true,
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Desativar Ana Lima' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ active: false }))
  })

  it('importação: valida (dry-run) e mostra o relatório de erros por linha', async () => {
    const calls = mocks({
      'POST /operations/op1/employees:import': {
        data: { dry_run: true, total_rows: 3, created: 2, updated: 0, errors: [{ row: 3, field: 'name', message: 'Field required' }], employees: [] },
      },
    })
    renderWithProviders(<EmployeesPage />, { route: ROUTE, path: PATH })
    const file = new File(['matricula;nome\n1;A\n2;\n'], 'pessoas.csv', { type: 'text/csv' })
    fireEvent.change(await screen.findByLabelText('Arquivo'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Validar' }))
    const rep = await screen.findByRole('table', { name: 'Relatório de erros' })
    expect(within(rep).getByText('Field required')).toBeInTheDocument()
    expect(screen.getByText('1 erro(s)')).toBeInTheDocument()
    const c = calls.find((x) => x.url.startsWith('/operations/op1/employees:import'))!
    expect(c.url).toContain('dry_run=true')
    expect(c.body).toBeInstanceOf(FormData)
  })

  it('alocação automática: sugere por turma e aplica', async () => {
    const calls = mocks({
      'POST /operations/op1/employees:assign-teams': (_u: string, init?: RequestInit) => ({
        data: {
          applied: JSON.parse(String(init?.body)).apply, assignments: { e1: 'A', e2: 'E' }, unassigned: [], notes: ['1 vaga(s) sem colaborador'],
          teams: [
            { team: 'A', size: 1, works_night: false, works_weekend: true, roles: {}, assigned: ['e1'], missing: 0 },
            { team: 'E', size: 2, works_night: true, works_weekend: true, roles: {}, assigned: ['e2'], missing: 1 },
          ],
        },
      }),
    })
    renderWithProviders(<EmployeesPage />, { route: ROUTE, path: PATH })
    fireEvent.click(await screen.findByRole('button', { name: 'Sugerir alocação' }))
    const t = await screen.findByRole('table', { name: 'Alocação sugerida' })
    expect(within(t).getByText('Ana Lima')).toBeInTheDocument()
    expect(within(t).getByText('(1 em aberto)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar alocação' }))
    expect(await screen.findByText('✓ Alocação gravada nos colaboradores.')).toBeInTheDocument()
    const bodies = calls.filter((c) => c.url.includes('assign-teams')).map((c) => c.body)
    expect(bodies).toEqual([
      { scenario_id: 'sc1', apply: false, only_unassigned: false },
      { scenario_id: 'sc1', apply: true, only_unassigned: false },
    ])
  })
})
