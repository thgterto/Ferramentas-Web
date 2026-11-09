import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router'
import { api, apiData, getToken, setToken, type S } from './api/client'

type Me = S['MeOut']
type AuthCtx = {
  token: string | null
  me: Me | undefined
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(() => getToken())
  const qc = useQueryClient()
  const meQ = useQuery({ queryKey: ['me', token], queryFn: () => apiData<Me>('/me'), enabled: !!token })
  const login = useCallback(async (email: string, password: string) => {
    const r = await api<S['TokenOut']>('/auth/login', { body: { email, password } })
    setToken(r.access_token)
    setTok(r.access_token)
  }, [])
  const logout = useCallback(() => {
    setToken(null)
    setTok(null)
    qc.clear()
  }, [qc])
  const value = useMemo(() => ({ token, me: meQ.data, login, logout }), [token, meQ.data, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fora do AuthProvider')
  return c
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const loc = useLocation()
  if (!token) return <Navigate to={`/escalas/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <>{children}</>
}
