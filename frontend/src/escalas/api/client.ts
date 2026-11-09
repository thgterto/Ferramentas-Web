import type { components } from '../../api/types'

export type S = components['schemas']
export type ScenarioOut = S['ScenarioOut']
export type CoverageOut = S['CoverageOut']
export type CoverageSlot = S['CoverageSlot']
export type FindingOut = S['FindingOut']
export type AssignmentOut = S['AssignmentOut']
export type ScheduleModelOut = S['ScheduleModelOut']
export type LegalRegimeOut = S['LegalRegimeOut']
export type TransitionOut = S['TransitionOut']
export type TransitionPhase = S['TransitionPhase']
export type OperationOut = S['OperationOut']
export type RoleOut = S['RoleOut']
export type OptimizeOut = S['OptimizeOut']
export type OptimizeIn = S['OptimizeIn']
export type StructureOut = S['StructureOut']

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api/v1/escalas'
const TOKEN_KEY = 'escalas.token'

let memToken: string | null = null

export function getToken(): string | null {
  if (memToken) return memToken
  try {
    memToken = localStorage.getItem(TOKEN_KEY)
  } catch {
    /* armazenamento indisponível */
  }
  return memToken
}

export function setToken(t: string | null): void {
  memToken = t
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number
  code: string | undefined
  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type Opts = { method?: string; body?: unknown; headers?: Record<string, string> }

async function raw(path: string, opts: Opts = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  const t = getToken()
  if (t) headers.Authorization = `Bearer ${t}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(API_BASE + path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    let msg = `Erro ${res.status}`
    let code: string | undefined
    try {
      const j = await res.json()
      msg = j?.error?.message ?? j?.detail ?? msg
      if (typeof msg !== 'string') msg = JSON.stringify(msg)
      code = j?.error?.code
    } catch {
      /* corpo não-JSON */
    }
    if (res.status === 401) setToken(null)
    throw new ApiError(res.status, msg, code)
  }
  return res
}

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const res = await raw(path, opts)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Envelope `{data}` → data. */
export async function apiData<T>(path: string, opts: Opts = {}): Promise<T> {
  return (await api<{ data: T }>(path, opts)).data
}

export async function apiBlob(path: string, opts: Opts = {}): Promise<{ blob: Blob; filename: string }> {
  const res = await raw(path, opts)
  const cd = res.headers.get('content-disposition') ?? ''
  const filename = /filename="([^"]+)"/.exec(cd)?.[1] ?? 'export'
  return { blob: await res.blob(), filename }
}

/** Percorre a paginação por cursor. */
export async function apiAllCursor<T>(path: string): Promise<T[]> {
  const out: T[] = []
  let cursor: string | null = null
  const sep = path.includes('?') ? '&' : '?'
  for (let i = 0; i < 50; i++) {
    const page: { data: T[]; meta: { has_next: boolean; next_cursor: string | null } } = await api(
      `${path}${sep}limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    )
    out.push(...page.data)
    if (!page.meta.has_next || !page.meta.next_cursor) break
    cursor = page.meta.next_cursor
  }
  return out
}
