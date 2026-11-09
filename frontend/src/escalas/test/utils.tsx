import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import axe from 'axe-core'
import { vi } from 'vitest'

export function renderWithProviders(ui: ReactElement, { route = '/', path = '*' }: { route?: string; path?: string } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper })
}

/** Roda axe-core (WCAG 2.x A/AA) no contêiner; contraste não é medido no jsdom. */
export async function axeViolations(el: Element) {
  const r = await axe.run(el, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  })
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

type Handler = (url: string, init?: RequestInit) => unknown
/** fetch falso: mapeia "MÉTODO caminho" (prefixo, sem query) → corpo JSON. */
export function mockFetch(routes: Record<string, Handler | unknown>) {
  const calls: { method: string; url: string; body?: unknown }[] = []
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const p = url.replace(/^.*\/api\/v1\/escalas/, '')
    calls.push({ method, url: p, body: init?.body ? JSON.parse(String(init.body)) : undefined })
    const key = Object.keys(routes)
      .filter((k) => {
        const [m, rp] = k.split(' ')
        return m === method && (p === rp || p.split('?')[0] === rp || (rp.endsWith('*') && p.startsWith(rp.slice(0, -1))))
      })
      .sort((a, b) => b.length - a.length)[0]
    if (!key) return new Response(JSON.stringify({ error: { message: `sem mock ${method} ${p}` } }), { status: 404 })
    const h = routes[key]
    const val = typeof h === 'function' ? (h as Handler)(p, init) : h
    if (val instanceof Response) return val
    return new Response(JSON.stringify(val), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fn)
  return calls
}
