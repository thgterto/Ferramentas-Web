import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Link, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, RequireAuth, useAuth } from './auth'
import LoginPage from './pages/LoginPage'
import OperationsPage from './pages/OperationsPage'
import OperationPage from './pages/OperationPage'
import ResultPage from './pages/ResultPage'
import WizardPage from './wizard/WizardPage'

function Shell({ children }: { children: React.ReactNode }) {
  const { me, logout } = useAuth()
  const org = me?.current_organization_id
  return (
    <div className="flex min-h-screen">
      <nav aria-label="Principal" className="w-sidebar shrink-0 border-r border-border bg-surface p-4">
        <p className="mb-6 text-h2 font-semibold">Escalas 24/7</p>
        <ul className="flex flex-col gap-1">
          {org && (
            <li>
              <Link className="block rounded-cell px-2 py-1.5 text-primary hover:bg-surface-2" to={`/escalas/o/${org}/operacoes`}>
                Operações
              </Link>
            </li>
          )}
        </ul>
        {me && (
          <div className="mt-8 text-caption text-ink-muted">
            <p>{me.full_name}</p>
            <button type="button" className="mt-1 text-primary underline" onClick={logout}>
              Sair
            </button>
          </div>
        )}
      </nav>
      <main className="min-w-0 flex-1 p-6" id="conteudo">
        {children}
      </main>
    </div>
  )
}

function Home() {
  const { me } = useAuth()
  if (!me) return null
  return <Navigate to={`/escalas/o/${me.current_organization_id}/operacoes`} replace />
}

const guarded = (el: React.ReactNode) => (
  <RequireAuth>
    <Shell>{el}</Shell>
  </RequireAuth>
)

export function EscalasRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="" element={guarded(<Home />)} />
      <Route path="o/:org/operacoes" element={guarded(<OperationsPage />)} />
      <Route path="o/:org/operacoes/:op" element={guarded(<OperationPage />)} />
      <Route path="o/:org/operacoes/:op/cenarios/novo" element={guarded(<WizardPage />)} />
      <Route path="o/:org/operacoes/:op/cenarios/:id/:aba?" element={guarded(<ResultPage />)} />
      <Route path="*" element={<Navigate to="/escalas" replace />} />
    </Routes>
  )
}

export default function EscalasApp() {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }))
  useEffect(() => {
    const prev = document.documentElement.lang
    document.documentElement.lang = 'pt-BR'
    document.title = 'Simulador de Cobertura de Escalas'
    return () => {
      document.documentElement.lang = prev
    }
  }, [])
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <div className="escalas-root">
          <EscalasRoutes />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  )
}
