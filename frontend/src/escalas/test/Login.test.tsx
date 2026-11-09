import { describe, expect, it } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { AuthProvider } from '../auth'
import { EscalasRoutes } from '../EscalasApp'
import { axeViolations, mockFetch } from './utils'

function app(route: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <Routes>
            <Route path="/escalas/*" element={<EscalasRoutes />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Login (A25)', () => {
  it('rota protegida redireciona ao login; erro 401 mostra mensagem genérica', async () => {
    mockFetch({ 'POST /auth/login': new Response(JSON.stringify({ error: { message: 'x' } }), { status: 401 }) })
    const { container } = app('/escalas/o/x/operacoes')
    expect(await screen.findByRole('heading', { name: 'Entrar no simulador' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.co' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
    expect(await axeViolations(container)).toEqual([])
  })

  it('login ok leva às operações da organização', async () => {
    mockFetch({
      'POST /auth/login': { access_token: 't', token_type: 'bearer', expires_in: 900 },
      'GET /me': { data: { id: 'u', email: 'a@b.co', full_name: 'Gerente', current_organization_id: 'org1', current_role: 'owner', memberships: [] } },
      'GET /operations': { data: [{ id: 'op1', name: 'Planta', sector: 'industria', is_24x7: true, timezone: 'x', created_at: '' }] },
    })
    app('/escalas/login')
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'a@b.co' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByRole('link', { name: 'Planta' })).toHaveAttribute('href', '/escalas/o/org1/operacoes/op1')
  })
})
