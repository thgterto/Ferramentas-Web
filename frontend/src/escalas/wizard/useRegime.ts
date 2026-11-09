import { useQuery } from '@tanstack/react-query'
import { apiData, type LegalRegimeOut } from '../api/client'

export type RegimeResolution = { code: string | null; regime?: LegalRegimeOut; error?: unknown; loading: boolean; all: LegalRegimeOut[] }

export function useLegalRegimes() {
  return useQuery({ queryKey: ['legal-regimes'], queryFn: () => apiData<LegalRegimeOut[]>('/legal-regimes'), staleTime: Infinity })
}

/** Regime explícito ou resolvido pela data de referência (`GET /legal-regimes:resolve`). */
export function useRegimeResolution(mode: string, code: string, date: string): RegimeResolution {
  const all = useLegalRegimes()
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
  const res = useQuery({
    queryKey: ['legal-regime-resolve', date],
    queryFn: () => apiData<LegalRegimeOut>(`/legal-regimes:resolve?date=${date}`),
    enabled: mode === 'data' && validDate,
    retry: false,
  })
  const list = all.data ?? []
  if (mode === 'data') {
    return { code: res.data?.code ?? null, regime: res.data, error: res.error ?? undefined, loading: res.isFetching, all: list }
  }
  return { code: code || null, regime: list.find((r) => r.code === code), loading: all.isLoading, all: list }
}
