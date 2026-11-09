import { useState } from 'react'
import { clsx } from 'clsx'
import { apiData, type OptimizeIn, type OptimizeOut, type S } from '../api/client'
import { fmt } from '../api/format'
import { Button, ErrorBox, Field, Spinner, inputCls } from './ui'

type Objective = OptimizeIn['objective']
const OBJECTIVES: [Objective, string, string][] = [
  ['min_headcount', 'Mínimo de turmas/pessoas', 'menor K (e tamanho) que atinge a cobertura alvo'],
  ['offsets', 'Defasagem ótima das turmas', 'dado K, offsets que minimizam déficit e excesso'],
  ['best_model', 'Melhor modelo de escala', 'ranqueia catálogo + personalizados salvos'],
  ['pool_allocation', 'Alocação nos pools', 'pessoas → posições/subsetores, mínimo remanejamento'],
  ['fairness', 'Equilíbrio de folgas/noites/domingos', 'offsets com distribuição justa (objetivo secundário)'],
]

const METRICS: [keyof S['OptimizeMetrics'], string, (v: number) => string][] = [
  ['headcount', 'Headcount', (v) => String(v)],
  ['team_count', 'Turmas (K)', (v) => String(v)],
  ['coverage_pct', 'Cobertura', (v) => `${(v * 100).toFixed(1)}%`],
  ['deficit_post_hours_week', 'Déficit (h-posto/sem)', (v) => fmt(v, 1)],
  ['excess_post_hours_week', 'Excesso (h-posto/sem)', (v) => fmt(v, 1)],
  ['sundays_off_spread', 'Espalhamento domingos de folga', (v) => String(v)],
  ['nights_spread', 'Espalhamento noites', (v) => String(v)],
  ['deficit_post_hours', 'Déficit nos subsetores (h-posto)', (v) => String(v)],
  ['moved_hours', 'Horas remanejadas', (v) => String(v)],
  ['max_borrowed_hours_person', 'Máx. horas emprestadas/pessoa', (v) => String(v)],
]

const STATUS: Record<string, [string, string]> = {
  otimo: ['Ótimo', 'border-sev-ok bg-sev-ok-bg text-sev-ok'],
  viavel: ['Viável (limite de tempo)', 'border-sev-alerta text-sev-alerta'],
  inviavel: ['Inviável', 'border-sev-erro text-sev-erro'],
  inviavel_regime: ['Bloqueado pelo regime', 'border-sev-erro text-sev-erro'],
  sem_solucao: ['Sem solução no tempo', 'border-sev-erro text-sev-erro'],
}

/**
 * Painel "Otimizar" (v3.7): objetivo, restrições e escopo (operação, subsetor ou pool);
 * mostra status (ótimo/viável), gap, comparação antes × depois e permite criar um cenário a
 * partir da solução ou aplicá-la no cenário atual (re-simula).
 */
export function OptimizePanel({ scenario, subsectors = [], pools = [], onApplied }: { scenario: S['ScenarioOut']; subsectors?: { code: string; name: string }[]; pools?: { code: string; name: string }[]; onApplied?: (id: string, created: boolean) => void }) {
  const [objective, setObjective] = useState<Objective>('min_headcount')
  const [target, setTarget] = useState(100)
  const [scope, setScope] = useState('')
  const [sizeMode, setSizeMode] = useState<'fixo' | 'livre'>('fixo')
  const [half, setHalf] = useState(false)
  const [k, setK] = useState(scenario.team_count)
  const [limit, setLimit] = useState(5)
  const [legalHard, setLegalHard] = useState(true)
  const [act, setAct] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<unknown>(null)
  const [res, setRes] = useState<OptimizeOut | null>(null)
  const usesK = objective === 'offsets' || objective === 'fairness'

  const run = async () => {
    setBusy('run')
    setErr(null)
    setRes(null)
    try {
      const [kind, code] = scope.split(':')
      const body: Partial<OptimizeIn> = {
        objective,
        target_coverage: (target / 100).toFixed(4),
        team_size_mode: sizeMode,
        half_teams: half,
        time_limit_s: limit,
        legal_hard: legalHard,
        include_act: act,
        ...(usesK ? { team_count: k } : {}),
        ...(kind === 'sub' ? { subsector: code } : kind === 'pool' ? { pool: code } : {}),
      }
      setRes(await apiData<OptimizeOut>(`/scenarios/${scenario.id}/optimize`, { body }))
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(null)
    }
  }

  const apply = async (mode: 'create' | 'apply') => {
    if (!res?.scenario_patch) return
    setBusy(mode)
    setErr(null)
    try {
      const out = await apiData<S['OptimizeApplyOut']>(`/scenarios/${scenario.id}/optimize/apply`, {
        body: { mode, patch: res.scenario_patch, ...(mode === 'create' ? { name: `${scenario.name} · ${OBJECTIVES.find((o) => o[0] === objective)?.[1]}` } : {}) },
      })
      onApplied?.(out.scenario_id, out.created)
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(null)
    }
  }

  const st = res ? (STATUS[res.status] ?? [res.status, '']) : null
  const rows = res ? METRICS.filter(([key]) => res.before[key] != null || res.after[key] != null) : []
  const sol = (res?.solution ?? {}) as Record<string, unknown>

  return (
    <section aria-label="Otimizar" className="flex flex-col gap-4" data-testid="painel-otimizar">
      <form
        className="grid grid-cols-1 gap-3 rounded-card border border-border bg-surface p-4 md:grid-cols-3 xl:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault()
          void run()
        }}
      >
        <Field label="Objetivo" htmlFor="opt-objective" hint={OBJECTIVES.find((o) => o[0] === objective)?.[2]}>
          <select id="opt-objective" className={inputCls} value={objective} onChange={(e) => setObjective(e.target.value as Objective)}>
            {OBJECTIVES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Escopo da demanda" htmlFor="opt-scope">
          <select id="opt-scope" className={inputCls} value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="">Operação inteira</option>
            {subsectors.map((x) => (
              <option key={x.code} value={`sub:${x.code}`}>
                Subsetor {x.name}
              </option>
            ))}
            {pools.map((x) => (
              <option key={x.code} value={`pool:${x.code}`}>
                Pool {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cobertura alvo (%)" htmlFor="opt-target">
          <input id="opt-target" type="number" min={0} max={100} step={1} className={inputCls} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        </Field>
        <Field label="Limite de tempo (s)" htmlFor="opt-limit">
          <input id="opt-limit" type="number" min={0.5} max={60} step={0.5} className={inputCls} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
        </Field>
        {objective === 'min_headcount' && (
          <Field label="Tamanho das turmas" htmlFor="opt-size">
            <select id="opt-size" className={inputCls} value={sizeMode} onChange={(e) => setSizeMode(e.target.value as 'fixo' | 'livre')}>
              <option value="fixo">Fixo (do cenário)</option>
              <option value="livre">Livre (pessoas por offset)</option>
            </select>
          </Field>
        )}
        {usesK && (
          <Field label="Nº de turmas (K)" htmlFor="opt-k">
            <input id="opt-k" type="number" min={1} max={500} className={inputCls} value={k} onChange={(e) => setK(Number(e.target.value))} />
          </Field>
        )}
        <fieldset className="flex flex-col gap-1 text-caption md:col-span-2">
          <legend className="font-medium text-ink-muted">Restrições</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={legalHard} onChange={(e) => setLegalHard(e.target.checked)} /> Regras do regime como restrições duras
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={act} onChange={(e) => setAct(e.target.checked)} /> Aceitar modelos viáveis só com ACT/CCT
          </label>
          {objective === 'min_headcount' && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={half} disabled={sizeMode === 'livre'} onChange={(e) => setHalf(e.target.checked)} /> Permitir meias-turmas
            </label>
          )}
        </fieldset>
        <div className="flex items-end">
          <Button type="submit" disabled={!!busy}>
            {busy === 'run' ? 'Otimizando…' : 'Otimizar'}
          </Button>
        </div>
      </form>
      <ErrorBox error={err} />
      {busy === 'run' && <Spinner label={`Resolvendo com CP-SAT (até ${limit} s)…`} />}
      {res && st && (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-3">
            <span data-testid="opt-status" className={clsx('rounded-full border px-2 py-0.5 text-caption font-semibold', st[1])}>
              {st[0]}
            </span>
            <span className="text-caption text-ink-muted">
              {res.solver} · {res.elapsed_ms} ms · gap {res.gap != null ? `${(res.gap * 100).toFixed(2)}%` : '—'} · escopo {res.scope}
            </span>
          </div>
          {rows.length > 0 && (
            <table className="w-full max-w-2xl text-body" aria-label="Comparação antes e depois">
              <thead className="text-left text-caption text-ink-muted">
                <tr>
                  <th scope="col">Métrica</th>
                  <th scope="col" className="text-right">
                    Antes
                  </th>
                  <th scope="col" className="text-right">
                    Depois
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([key, label, f]) => {
                  const a = res.before[key]
                  const b = res.after[key]
                  return (
                    <tr key={key} className="border-t border-border">
                      <th scope="row" className="py-1 text-left font-normal">
                        {label}
                      </th>
                      <td className="text-right tabular-nums">{a != null ? f(Number(a)) : '—'}</td>
                      <td className={clsx('text-right font-semibold tabular-nums', a != null && b != null && Number(b) < Number(a) && 'text-status-exata')}>{b != null ? f(Number(b)) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <SolutionSummary objective={res.objective} sol={sol} />
          {(res.candidates ?? []).length > 0 && <Candidates rows={(res.candidates ?? []) as Record<string, unknown>[]} />}
          {(res.notes ?? []).length > 0 && (
            <ul className="list-disc pl-5 text-caption text-ink-muted">
              {(res.notes ?? []).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          {res.scenario_patch && (
            <div className="flex flex-wrap gap-2">
              <Button disabled={!!busy} onClick={() => void apply('create')}>
                {busy === 'create' ? 'Criando…' : 'Criar cenário a partir da solução'}
              </Button>
              <Button variant="secondary" disabled={!!busy || scenario.status === 'homologado'} onClick={() => void apply('apply')}>
                {busy === 'apply' ? 'Aplicando…' : 'Aplicar neste cenário'}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function SolutionSummary({ objective, sol }: { objective: Objective; sol: Record<string, unknown> }) {
  if (objective === 'best_model') {
    if (!sol.code) return null
    return (
      <p className="text-body">
        Melhor modelo: <strong>{String(sol.name ?? sol.code)}</strong> ({String(sol.code)}) · {String(sol.team_count)} {sol.half_teams ? 'meias-turmas' : 'turmas'} · {String(sol.headcount)} pessoas · {String(sol.compliance)}
      </p>
    )
  }
  if (objective === 'pool_allocation') {
    const asg = (sol.assignments as { person: string; day: string; workstation: string; subsector: string }[] | undefined) ?? []
    return (
      <div className="text-body">
        <p>
          {asg.length} turnos remanejados na janela {(sol.window as string[] | undefined)?.join(' → ')}
          {sol.deficit_without_pool != null ? ` · déficit sem pool: ${String(sol.deficit_without_pool)} h-posto` : ''}
        </p>
        {asg.length > 0 && (
          <ul className="mt-1 max-h-40 overflow-auto text-caption">
            {asg.slice(0, 30).map((a) => (
              <li key={`${a.person}-${a.day}`}>
                {a.day} · {a.person} ⇄ {a.subsector}/{a.workstation}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  const offs = sol.offsets as number[][] | undefined
  return (
    <p className="text-body" data-testid="opt-solution">
      {sol.units != null && (
        <>
          <strong>{String(sol.units)}</strong> {String(sol.unit ?? 'turma')}(s) · headcount <strong>{String(sol.headcount)}</strong>
          {sol.headcount_separate_subsectors != null ? ` (subsetores separados: ${String(sol.headcount_separate_subsectors)})` : ''}
          {Array.isArray(sol.team_sizes) ? ` · tamanhos ${(sol.team_sizes as number[]).join(', ')}` : ''} ·{' '}
        </>
      )}
      {offs && <>offsets {offs.map((g) => `[${g.join(', ')}]`).join(' + ')}</>}
    </p>
  )
}

function Candidates({ rows }: { rows: Record<string, unknown>[] }) {
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-caption" aria-label="Ranking de modelos">
        <thead className="sticky top-0 bg-surface text-left text-ink-muted">
          <tr>
            {['#', 'Modelo', 'Conformidade', 'Turmas', 'Headcount', 'Déficit/sem', 'Excesso/sem', 'Status'].map((h) => (
              <th key={h} scope="col" className="px-1">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={String(c.code)} className={clsx('border-t border-border', !c.eligible && 'text-ink-subtle')}>
              <td className="px-1 tabular-nums">{c.rank != null ? String(c.rank) : '—'}</td>
              <td className="px-1">
                {String(c.name ?? c.code)} <span className="font-mono text-ink-subtle">{String(c.code)}</span>
              </td>
              <td className="px-1">{String(c.compliance ?? '')}</td>
              <td className="px-1 tabular-nums">{c.team_count != null ? `${String(c.team_count)}${c.half_teams ? ' ½' : ''}` : '—'}</td>
              <td className="px-1 tabular-nums">{c.headcount != null ? String(c.headcount) : '—'}</td>
              <td className="px-1 tabular-nums">{c.deficit_post_hours_week != null ? fmt(Number(c.deficit_post_hours_week), 1) : '—'}</td>
              <td className="px-1 tabular-nums">{c.excess_post_hours_week != null ? fmt(Number(c.excess_post_hours_week), 1) : '—'}</td>
              <td className="px-1">{String(c.status ?? '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
