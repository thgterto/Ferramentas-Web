import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import {
  api,
  apiBlob,
  apiData,
  type EmployeeImportOut,
  type EmployeeOut,
  type OperationOut,
  type RoleOut,
  type S,
  type ScenarioOut,
  type StructureOut,
  type TeamAssignOut,
} from '../api/client'
import { download } from '../components/download'
import { Button, Card, ErrorBox, Field, Spinner, inputCls } from '../components/ui'

const RESTRICTIONS: [string, string][] = [
  ['nao_noturno', 'Não faz noite'],
  ['nao_fim_de_semana', 'Não trabalha fim de semana'],
  ['nao_12h', 'Não faz turno > 10 h'],
  ['nao_hora_extra', 'Sem hora extra'],
]
const R_LABEL = Object.fromEntries(RESTRICTIONS)

type Form = {
  name: string
  registration: string
  role_code: string
  home_subsector_code: string
  default_workstation_code: string
  team_code: string
  hire_date: string
  contract_weekly_hours: string
  skills: string
  restrictions: string[]
  pool_codes: string[]
  active: boolean
}
const EMPTY: Form = {
  name: '', registration: '', role_code: '', home_subsector_code: '', default_workstation_code: '', team_code: '',
  hire_date: '', contract_weekly_hours: '', skills: '', restrictions: [], pool_codes: [], active: true,
}

function toForm(e: EmployeeOut): Form {
  return {
    name: e.name, registration: e.registration ?? '', role_code: e.role_code ?? '', home_subsector_code: e.home_subsector_code ?? '',
    default_workstation_code: e.default_workstation_code ?? '', team_code: e.team_code ?? '', hire_date: e.hire_date ?? '',
    contract_weekly_hours: e.contract_weekly_hours ? String(Number(e.contract_weekly_hours)) : '', skills: (e.skills ?? []).join(', '),
    restrictions: e.restrictions ?? [], pool_codes: e.pool_codes ?? [], active: e.active ?? true,
  }
}

function toBody(f: Form) {
  return {
    name: f.name.trim(), registration: f.registration.trim() || null, role_code: f.role_code || null,
    home_subsector_code: f.home_subsector_code || null, default_workstation_code: f.default_workstation_code || null,
    team_code: f.team_code.trim().toUpperCase() || null, hire_date: f.hire_date || null,
    contract_weekly_hours: f.contract_weekly_hours ? f.contract_weekly_hours.replace(',', '.') : null,
    skills: f.skills.split(',').map((x) => x.trim()).filter(Boolean), restrictions: f.restrictions, pool_codes: f.pool_codes, active: f.active,
  }
}

export default function EmployeesPage() {
  const { org, op } = useParams()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ subsector: '', workstation: '', role: '', team: '', status: 'ativo' })
  const [editing, setEditing] = useState<EmployeeOut | 'new' | null>(null)
  const [err, setErr] = useState<unknown>(null)
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v)
  const listKey = ['employees', op, params.toString()]
  const opQ = useQuery({ queryKey: ['operation', op], queryFn: () => apiData<OperationOut>(`/operations/${op}`) })
  const empQ = useQuery({ queryKey: listKey, queryFn: () => apiData<EmployeeOut[]>(`/operations/${op}/employees?${params}`) })
  const allQ = useQuery({ queryKey: ['employees', op, 'all'], queryFn: () => apiData<EmployeeOut[]>(`/operations/${op}/employees`) })
  const stQ = useQuery({ queryKey: ['structure', op], queryFn: () => apiData<StructureOut>(`/operations/${op}/structure`) })
  const rolesQ = useQuery({ queryKey: ['roles'], queryFn: () => api<{ data: RoleOut[] }>('/roles?per_page=200') })
  const roles = rolesQ.data?.data ?? []
  const subs = stQ.data?.subsectors ?? []
  const pools = stQ.data?.pools ?? []
  const teams = useMemo(() => [...new Set((allQ.data ?? []).map((e) => e.team_code).filter(Boolean) as string[])].sort(), [allQ.data])
  const wsAll = subs.flatMap((s) => (s.workstations ?? []).map((w) => ({ ...w, sub: s.code })))
  const refresh = () => qc.invalidateQueries({ queryKey: ['employees', op] })

  const toggleActive = async (e: EmployeeOut) => {
    setErr(null)
    try {
      await api(`/employees/${e.id}`, { method: 'PATCH', body: { active: !e.active } })
      await refresh()
    } catch (x) {
      setErr(x)
    }
  }
  const exportar = async (fmt: 'csv' | 'xlsx') => {
    setErr(null)
    try {
      const { blob, filename } = await apiBlob(`/operations/${op}/employees:export?format=${fmt}`)
      download(blob, filename)
    } catch (x) {
      setErr(x)
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <nav aria-label="Trilha" className="text-caption text-ink-muted">
        <Link className="text-primary underline" to={`/o/${org}/operacoes/${op}`}>
          {opQ.data?.name ?? 'Operação'}
        </Link>{' '}
        › Colaboradores
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h1 font-semibold">Colaboradores</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void exportar('csv')}>
            Exportar CSV
          </Button>
          <Button variant="secondary" onClick={() => void exportar('xlsx')}>
            Exportar XLSX
          </Button>
          <Button onClick={() => setEditing('new')}>Novo colaborador</Button>
        </div>
      </div>
      <ErrorBox error={err ?? opQ.error ?? empQ.error} />
      {editing && (
        <EmployeeForm
          op={op!}
          initial={editing === 'new' ? null : editing}
          roles={roles}
          subs={subs}
          pools={pools.map((p) => p.code)}
          onDone={async () => {
            setEditing(null)
            await refresh()
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      <Card title="Cadastro">
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-6" role="search">
          <Field label="Buscar" htmlFor="emp-q">
            <input id="emp-q" className={inputCls} placeholder="nome, matrícula ou habilidade" value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <Field label="Subsetor" htmlFor="f-sub">
            <select id="f-sub" className={inputCls} value={filters.subsector} onChange={(e) => setFilters({ ...filters, subsector: e.target.value, workstation: '' })}>
              <option value="">Todos</option>
              {subs.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Posição" htmlFor="f-ws">
            <select id="f-ws" className={inputCls} value={filters.workstation} onChange={(e) => setFilters({ ...filters, workstation: e.target.value })}>
              <option value="">Todas</option>
              {wsAll
                .filter((w) => !filters.subsector || w.sub === filters.subsector)
                .map((w) => (
                  <option key={`${w.sub}/${w.code}`} value={w.code}>
                    {w.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Cargo" htmlFor="f-role">
            <select id="f-role" className={inputCls} value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
              <option value="">Todos</option>
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Turma" htmlFor="f-team">
            <select id="f-team" className={inputCls} value={filters.team} onChange={(e) => setFilters({ ...filters, team: e.target.value })}>
              <option value="">Todas</option>
              <option value="-">Sem turma</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor="f-status">
            <select id="f-status" className={inputCls} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </Field>
        </div>
        {empQ.isLoading && <Spinner />}
        {empQ.data && empQ.data.length === 0 && (
          <p className="text-ink-muted">Nenhum colaborador encontrado. Sem cadastro, a matriz mensal usa pessoas fictícias (A-01, A-02…).</p>
        )}
        {empQ.data && empQ.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-body" aria-label="Colaboradores">
              <thead className="bg-surface-2 text-left">
                <tr>
                  {['Matrícula', 'Nome', 'Cargo', 'Subsetor / posição', 'Turma', 'Admissão', 'Jornada', 'Habilidades', 'Restrições', 'Pools', 'Status', 'Ações'].map((h) => (
                    <th key={h} scope="col" className="p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empQ.data.map((e) => (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="p-2 tabular-nums">{e.registration ?? '—'}</td>
                    <td className="p-2 font-medium">{e.name}</td>
                    <td className="p-2">{e.role_code ?? '—'}</td>
                    <td className="p-2">{[e.home_subsector_code, e.default_workstation_code].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="p-2">{e.team_code ?? '—'}</td>
                    <td className="p-2 tabular-nums">{e.hire_date ? e.hire_date.split('-').reverse().join('/') : '—'}</td>
                    <td className="p-2 tabular-nums">{e.contract_weekly_hours ? `${Number(e.contract_weekly_hours)} h` : '—'}</td>
                    <td className="p-2">{(e.skills ?? []).join(', ') || '—'}</td>
                    <td className="p-2">{(e.restrictions ?? []).map((r) => R_LABEL[r] ?? r).join(', ') || '—'}</td>
                    <td className="p-2">{(e.pool_codes ?? []).join(', ') || '—'}</td>
                    <td className="p-2">{e.active ? 'Ativo' : <span className="text-ink-muted">Inativo</span>}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" className="min-h-7 px-2 py-0.5" aria-label={`Editar ${e.name}`} onClick={() => setEditing(e)}>
                          Editar
                        </Button>
                        <Button variant="ghost" className="min-h-7 px-2 py-0.5" aria-label={`${e.active ? 'Desativar' : 'Reativar'} ${e.name}`} onClick={() => void toggleActive(e)}>
                          {e.active ? 'Desativar' : 'Reativar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-caption text-ink-muted">{empQ.data.length} colaborador(es)</p>
          </div>
        )}
      </Card>
      <ImportCard op={op!} onImported={refresh} />
      <AssignCard op={op!} onApplied={refresh} />
    </div>
  )
}

function EmployeeForm({
  op, initial, roles, subs, pools, onDone, onCancel,
}: {
  op: string
  initial: EmployeeOut | null
  roles: RoleOut[]
  subs: S['SubsectorOut'][]
  pools: string[]
  onDone: () => void | Promise<void>
  onCancel: () => void
}) {
  const [f, setF] = useState<Form>(initial ? toForm(initial) : EMPTY)
  const [err, setErr] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))
  const ws = subs.filter((s) => !f.home_subsector_code || s.code === f.home_subsector_code).flatMap((s) => s.workstations ?? [])
  const toggle = (k: 'restrictions' | 'pool_codes', v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v])
  const save = async () => {
    if (!f.name.trim()) {
      setErr(new Error('Informe o nome.'))
      return
    }
    setBusy(true)
    setErr(null)
    try {
      if (initial) await api(`/employees/${initial.id}`, { method: 'PATCH', body: toBody(f) })
      else await api(`/operations/${op}/employees`, { body: toBody(f) })
      await onDone()
    } catch (x) {
      setErr(x)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card title={initial ? `Editar ${initial.name}` : 'Novo colaborador'}>
      <form
        className="grid grid-cols-1 gap-3 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <Field label="Nome" htmlFor="e-name">
          <input id="e-name" className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} required />
        </Field>
        <Field label="Matrícula" htmlFor="e-reg">
          <input id="e-reg" className={inputCls} value={f.registration} onChange={(e) => set('registration', e.target.value)} />
        </Field>
        <Field label="Cargo" htmlFor="e-role">
          <select id="e-role" className={inputCls} value={f.role_code} onChange={(e) => set('role_code', e.target.value)}>
            <option value="">—</option>
            {roles.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Turma" htmlFor="e-team" hint="Letra da turma (A, B…) — alocação manual">
          <input id="e-team" className={inputCls} value={f.team_code} maxLength={3} onChange={(e) => set('team_code', e.target.value.toUpperCase())} />
        </Field>
        <Field label="Subsetor de lotação" htmlFor="e-sub">
          <select id="e-sub" className={inputCls} value={f.home_subsector_code} onChange={(e) => setF({ ...f, home_subsector_code: e.target.value, default_workstation_code: '' })}>
            <option value="">—</option>
            {subs.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Posição padrão" htmlFor="e-ws">
          <select id="e-ws" className={inputCls} value={f.default_workstation_code} onChange={(e) => set('default_workstation_code', e.target.value)}>
            <option value="">—</option>
            {ws.map((w) => (
              <option key={w.id} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data de admissão" htmlFor="e-hire">
          <input id="e-hire" type="date" className={inputCls} value={f.hire_date} onChange={(e) => set('hire_date', e.target.value)} />
        </Field>
        <Field label="Jornada contratual (h/sem)" htmlFor="e-hours">
          <input id="e-hours" inputMode="decimal" className={inputCls} value={f.contract_weekly_hours} onChange={(e) => set('contract_weekly_hours', e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Certificações / habilidades" htmlFor="e-skills" hint="Separadas por vírgula (ex.: NR-10, Empilhadeira)">
            <input id="e-skills" className={inputCls} value={f.skills} onChange={(e) => set('skills', e.target.value)} />
          </Field>
        </div>
        <fieldset className="md:col-span-1">
          <legend className="text-caption font-medium text-ink-muted">Restrições</legend>
          {RESTRICTIONS.map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-body">
              <input type="checkbox" checked={f.restrictions.includes(v)} onChange={() => toggle('restrictions', v)} /> {l}
            </label>
          ))}
        </fieldset>
        <fieldset className="md:col-span-1">
          <legend className="text-caption font-medium text-ink-muted">Pools que pode cobrir</legend>
          {pools.length === 0 && <p className="text-caption text-ink-subtle">Nenhum pool na operação.</p>}
          {pools.map((p) => (
            <label key={p} className="flex items-center gap-2 text-body">
              <input type="checkbox" checked={f.pool_codes.includes(p)} onChange={() => toggle('pool_codes', p)} /> {p}
            </label>
          ))}
          <label className="mt-2 flex items-center gap-2 text-body">
            <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Ativo
          </label>
        </fieldset>
        <div className="flex gap-2 md:col-span-4">
          <Button type="submit" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar colaborador'}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
        <div className="md:col-span-4">
          <ErrorBox error={err} />
        </div>
      </form>
    </Card>
  )
}

function ImportCard({ op, onImported }: { op: string; onImported: () => void | Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null)
  const [rep, setRep] = useState<EmployeeImportOut | null>(null)
  const [err, setErr] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const send = async (dry: boolean) => {
    const file = ref.current?.files?.[0]
    if (!file) {
      setErr(new Error('Escolha um arquivo CSV ou XLSX.'))
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const out = await apiData<EmployeeImportOut>(`/operations/${op}/employees:import?dry_run=${dry}`, { form })
      setRep(out)
      if (!out.dry_run) await onImported()
    } catch (x) {
      setErr(x)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card title="Importação em massa (CSV/XLSX)">
      <p className="mb-2 text-caption text-ink-muted">
        Colunas: matricula, nome, cargo, subsetor, posicao, turma, admissao (AAAA-MM-DD ou DD/MM/AAAA), jornada_semanal_h, habilidades, restricoes, pools, status.
        Matrícula existente atualiza o cadastro. Nada é gravado se houver erro.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Arquivo" htmlFor="imp-file">
          <input id="imp-file" ref={ref} type="file" accept=".csv,.xlsx" className="text-body" onChange={() => setRep(null)} />
        </Field>
        <Button variant="secondary" disabled={busy} onClick={() => void send(true)}>
          Validar
        </Button>
        <Button disabled={busy} onClick={() => void send(false)}>
          Importar
        </Button>
      </div>
      <div className="mt-3">
        <ErrorBox error={err} />
      </div>
      {rep && (
        <div className="mt-3 flex flex-col gap-2" aria-live="polite">
          <p className="text-body">
            {rep.total_rows} linha(s): {rep.created} nova(s), {rep.updated} atualização(ões),{' '}
            <strong className={rep.errors.length ? 'text-sev-erro' : 'text-sev-ok'}>{rep.errors.length} erro(s)</strong>
            {rep.errors.length === 0 && (rep.dry_run ? ' — validação OK, clique em Importar para gravar.' : ' — importado.')}
          </p>
          {rep.errors.length > 0 && (
            <table className="w-full text-body" aria-label="Relatório de erros">
              <thead className="bg-surface-2 text-left">
                <tr>
                  <th scope="col" className="p-2">Linha</th>
                  <th scope="col" className="p-2">Campo</th>
                  <th scope="col" className="p-2">Erro</th>
                </tr>
              </thead>
              <tbody>
                {rep.errors.map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2 tabular-nums">{e.row}</td>
                    <td className="p-2">{e.field ?? '—'}</td>
                    <td className="p-2 text-sev-erro">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Card>
  )
}

function AssignCard({ op, onApplied }: { op: string; onApplied: () => void | Promise<void> }) {
  const sQ = useQuery({ queryKey: ['scenarios', op], queryFn: () => api<{ data: ScenarioOut[] }>(`/scenarios?operation_id=${op}&per_page=200`) })
  const empQ = useQuery({ queryKey: ['employees', op, 'all'], queryFn: () => apiData<EmployeeOut[]>(`/operations/${op}/employees`) })
  const [sid, setSid] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  const [res, setRes] = useState<TeamAssignOut | null>(null)
  const [err, setErr] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const scen = sQ.data?.data ?? []
  const chosen = sid || scen[0]?.id || ''
  const names = Object.fromEntries((empQ.data ?? []).map((e) => [e.id, e.name]))
  const run = async (apply: boolean) => {
    if (!chosen) return
    setBusy(true)
    setErr(null)
    try {
      const out = await apiData<TeamAssignOut>(`/operations/${op}/employees:assign-teams`, { body: { scenario_id: chosen, apply, only_unassigned: onlyFree } })
      setRes(out)
      if (apply) await onApplied()
    } catch (x) {
      setErr(x)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card title="Alocação às turmas">
      <p className="mb-2 text-caption text-ink-muted">
        Automática: respeita o cargo (composição da turma) e as restrições (quem não faz noite vai para turmas sem N). Manual: edite a turma no cadastro.
        A matriz mensal e as visões por turno/pessoa passam a mostrar os colaboradores reais; turmas sem ninguém continuam com fictícios.
      </p>
      {scen.length === 0 ? (
        <p className="text-ink-muted">Crie e simule um cenário para alocar as turmas.</p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Cenário" htmlFor="as-sc">
            <select id="as-sc" className={inputCls} value={chosen} onChange={(e) => setSid(e.target.value)}>
              {scen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-body">
            <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} /> Manter quem já tem turma
          </label>
          <Button variant="secondary" disabled={busy} onClick={() => void run(false)}>
            Sugerir alocação
          </Button>
          <Button disabled={busy || !res} onClick={() => void run(true)}>
            Aplicar alocação
          </Button>
        </div>
      )}
      <div className="mt-3">
        <ErrorBox error={err} />
      </div>
      {res && (
        <div className="mt-3 flex flex-col gap-2" aria-live="polite">
          {res.applied && <p className="text-sev-ok">✓ Alocação gravada nos colaboradores.</p>}
          <table className="w-full text-body" aria-label="Alocação sugerida">
            <thead className="bg-surface-2 text-left">
              <tr>
                <th scope="col" className="p-2">Turma</th>
                <th scope="col" className="p-2">Vagas</th>
                <th scope="col" className="p-2">Faz noite</th>
                <th scope="col" className="p-2">Colaboradores</th>
              </tr>
            </thead>
            <tbody>
              {res.teams.map((t) => (
                <tr key={t.team} className="border-t border-border">
                  <td className="p-2 font-medium">{t.team}</td>
                  <td className="p-2 tabular-nums">
                    {t.size}
                    {(t.missing ?? 0) > 0 && <span className="text-sev-alerta"> ({t.missing} em aberto)</span>}
                  </td>
                  <td className="p-2">{t.works_night ? 'sim' : 'não'}</td>
                  <td className="p-2">{(t.assigned ?? []).map((id) => names[id] ?? id).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(res.notes ?? []).map((n) => (
            <p key={n} className="text-caption text-ink-muted">
              {n}
            </p>
          ))}
        </div>
      )}
    </Card>
  )
}
