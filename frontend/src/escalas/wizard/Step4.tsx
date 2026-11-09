import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFormContext } from 'react-hook-form'
import { clsx } from 'clsx'
import { apiData, type S, type ScheduleModelOut } from '../api/client'
import { fmt } from '../api/format'
import { ComplianceBadge, RegimeMiniLine } from '../components/ComplianceBadge'
import { statusFor } from '../components/compliance'
import { defaultShifts } from './shifts'
import { Button, ErrorBox, Field, Spinner, inputCls } from '../components/ui'
import { PatternBuilder } from '../pattern/PatternBuilder'
import { K_MODE_LABEL, blankPattern, teamName, type KMode, type PatternSpec } from '../pattern/model'
import type { WizardValues } from './schema'
import type { RegimeResolution } from './useRegime'

const ADJUST: Record<string, string> = {
  nao_conforme: 'Ajuste sugerido: +1 turma ou outro modelo (veja “Simular transição”).',
  so_com_act: 'Só é viável com ACT/CCT de compensação.',
  regime_especial: 'Regime especial: pendente de lei ordinária.',
  baseline: '6x1 vedada neste regime — use só como baseline de comparação.',
}

const GROUPS = [
  ['', 'Todos'],
  ['continuo', 'Contínuos 24/7'],
  ['nao_continuo', 'Não contínuos'],
  ['complementar', 'Complementares'],
  ['variacao', 'Variações de turno'],
  ['sobreposicao', 'Com sobreposição (passagem/pico)'],
] as const

const GROUP_LABEL: Record<string, string> = { continuo: 'Contínuo 24/7', nao_continuo: 'Não contínuo', complementar: 'Complementar', variacao: 'Variação', sobreposicao: 'Sobreposição' }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function seqOf(m: ScheduleModelOut): string[] {
  const seqs = (m.default_params as { sequences?: string[][] } | undefined)?.sequences
  return seqs?.[0] ?? []
}

function suggestedK(m: ScheduleModelOut): number {
  if (m.teams_24x7) return Math.ceil(Number(m.teams_24x7))
  if (m.teams_non_continuous) return Math.ceil(Number(m.teams_non_continuous))
  return m.typical_teams?.[0] ?? 1
}

export function Step4({ regime }: { regime: RegimeResolution }) {
  const { register, watch, setValue, formState } = useFormContext<WizardValues>()
  const e = formState.errors
  const models = useQuery({ queryKey: ['schedule-models'], queryFn: () => apiData<ScheduleModelOut[]>('/schedule-models'), staleTime: Infinity })
  const templates = useQuery({ queryKey: ['schedule-patterns'], queryFn: () => apiData<S['PatternTemplateOut'][]>('/schedule-patterns'), retry: false })
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<string>('')
  const [onlyExact, setOnlyExact] = useState(false)
  const [loadingPattern, setLoadingPattern] = useState(false)
  const [patternErr, setPatternErr] = useState<unknown>(null)
  const code = watch('modelCode')
  const k = Number(watch('teamCount')) || 0
  const kMode = watch('kMode') as KMode
  const sizes = watch('teamSizes')
  const customized = watch('customized')
  const pattern = watch('pattern') as PatternSpec | null
  const postos = watch('demandMode') === 'fixos' ? Number(watch('postos')) || 1 : Math.max(1, ...watch('curve').map(Number))
  const demand = watch('demandMode') === 'curva' ? watch('curve').map(Number) : undefined
  const reg = regime.code ?? 'CLT_44H_ATUAL'
  const sel = models.data?.find((m) => m.code === code)
  const kReq = sel?.teams_24x7 ? Number(sel.teams_24x7) : null
  const weeklyMax = regime.regime ? Number(regime.regime.weekly_hours_max) : null
  const kLegal = sel?.is_continuous_24x7 && weeklyMax ? 168 / weeklyMax : null

  const list = useMemo(() => {
    const t = norm(q.trim())
    return (models.data ?? []).filter((m) => {
      if (group && m.catalog_group !== group) return false
      if (onlyExact && !m.exact_24x7) return false
      if (!t) return true
      return norm(`${m.code} ${m.name} ${seqOf(m).join(' ')} ${GROUP_LABEL[m.catalog_group] ?? ''}`).includes(t)
    })
  }, [models.data, q, group, onlyExact])

  const choose = (m: ScheduleModelOut) => {
    setValue('modelCode', m.code, { shouldValidate: true })
    setValue('shiftCodes', defaultShifts(m))
    setValue('teamCount', suggestedK(m))
    setValue('teamSizes', [])
    setValue('customized', false)
    setValue('pattern', null)
  }

  // register() de rádios com o mesmo nome guarda só o último onChange: resolve pelo valor
  const onPick = (c: string) => {
    const m = models.data?.find((x) => x.code === c)
    if (m) choose(m)
  }

  const personalize = async (fromScratch = false) => {
    setPatternErr(null)
    if (fromScratch || !code || code === 'PERSONALIZADO') {
      setValue('pattern', blankPattern())
    } else {
      setLoadingPattern(true)
      try {
        const p = await apiData<PatternSpec>(`/schedule-models/${code}/pattern?team_count=${Math.max(1, k)}`)
        setValue('pattern', p)
      } catch (err) {
        setPatternErr(err)
        setLoadingPattern(false)
        return
      }
      setLoadingPattern(false)
    }
    if (!code) setValue('modelCode', 'PERSONALIZADO', { shouldValidate: true })
    setValue('customized', true)
  }

  if (customized && pattern) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-body">
            <strong>Construtor de escala</strong> · edite turnos, sequência, turmas (K), tamanhos e camadas. A pré-visualização recalcula a cada edição.
          </p>
          <Button variant="secondary" onClick={() => setValue('customized', false)}>
            Voltar ao catálogo
          </Button>
        </div>
        <PatternBuilder value={pattern} onChange={(p) => setValue('pattern', p, { shouldDirty: true })} postos={postos} regimeCode={reg} demand={demand} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {models.isLoading && <Spinner label="Carregando catálogo…" />}
      <ErrorBox error={models.error} />
      <div className="flex flex-wrap items-end gap-3 rounded-card border border-border p-3">
        <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
          Buscar modelo
          <input type="search" className={`${inputCls} w-64`} placeholder="ex.: 4x3, 12 h, DuPont, M M T T" value={q} onChange={(ev) => setQ(ev.target.value)} />
        </label>
        <div role="group" aria-label="Grupo do catálogo" className="flex flex-wrap overflow-hidden rounded-cell border border-border">
          {GROUPS.map(([g, label]) => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={clsx('px-3 py-1.5 text-caption', group === g ? 'bg-primary text-white' : 'bg-surface')}>
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-caption">
          <input type="checkbox" checked={onlyExact} onChange={(ev) => setOnlyExact(ev.target.checked)} /> Só exatos 24/7
        </label>
        <span className="text-caption text-ink-muted" aria-live="polite">
          {list.length} de {models.data?.length ?? 0} modelos
        </span>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => void personalize()} disabled={loadingPattern}>
            {loadingPattern ? 'Abrindo…' : code ? `Personalizar ${code}` : 'Personalizar'}
          </Button>
          <Button variant="secondary" onClick={() => void personalize(true)}>
            Começar do zero
          </Button>
        </div>
      </div>
      <ErrorBox error={patternErr} />
      {(templates.data?.length ?? 0) > 0 && (
        <fieldset>
          <legend className="mb-2 text-caption font-medium text-ink-muted">Da organização (templates)</legend>
          <div className="flex flex-wrap gap-2">
            {templates.data!.map((t) => (
              <Button
                key={t.id}
                variant="secondary"
                onClick={() => {
                  setValue('modelCode', 'PERSONALIZADO', { shouldValidate: true })
                  setValue('pattern', t.pattern as unknown as PatternSpec)
                  setValue('customized', true)
                }}
              >
                {t.name}
                {t.derived_from_code ? ` · derivado de ${t.derived_from_code}` : ''}
              </Button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-2 text-caption font-medium text-ink-muted">Modelo de escala · selo no regime {reg} (informativo — nunca impede simular)</legend>
        {e.modelCode && <p className="text-caption text-sev-erro">{e.modelCode.message}</p>}
        <div className="grid max-h-[560px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => {
            const st = statusFor(m.code, reg, m.regime_compliance)
            const checked = code === m.code
            const seq = seqOf(m)
            return (
              <label key={m.code} className={clsx('flex cursor-pointer flex-col gap-2 rounded-card border p-3', checked ? 'border-2 border-primary' : 'border-border')} data-testid={`modelo-${m.code}`}>
                <span className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <input type="radio" value={m.code} {...register('modelCode', { onChange: (ev: { target: { value: string } }) => onPick(ev.target.value) })} />
                    <span className="font-semibold">{m.name}</span>
                  </span>
                  <ComplianceBadge status={st} compact />
                </span>
                <span className="flex flex-wrap gap-1 text-micro">
                  <span className="rounded-full border border-border px-1.5">{GROUP_LABEL[m.catalog_group] ?? m.catalog_group}</span>
                  {m.is_continuous_24x7 && <span className="rounded-full border border-border px-1.5">{m.exact_24x7 ? '✓ cobre 24/7 exato' : 'não exato'}</span>}
                  {m.legal_status === 'inviavel_clt' && <span className="rounded-full border border-sev-erro px-1.5 text-sev-erro">✕ inviável na CLT (comparação)</span>}
                  {m.phase === 'mvp' && <span className="rounded-full border border-border px-1.5">essencial</span>}
                </span>
                {seq.length > 0 && (
                  <code className="truncate font-mono text-micro text-ink-muted" title={seq.join(' ')}>
                    [{seq.slice(0, 16).join(' ')}
                    {seq.length > 16 ? ' …' : ''}] L={seq.length}
                  </code>
                )}
                <span className="text-caption text-ink-muted tabular-nums">
                  {m.work_days}x{m.off_days} · {m.shifts_per_day} turno(s)/dia · K {m.teams_24x7 ? fmt(m.teams_24x7, 2) : m.teams_non_continuous ? `${fmt(m.teams_non_continuous, 0)} (janela)` : '—'} · {fmt(m.avg_weekly_hours, 1)} h/sem · ciclo {m.calendar_cycle_days} d
                </span>
                <RegimeMiniLine modelCode={m.code} compliance={m.regime_compliance} current={reg} />
                {ADJUST[st] && <span className="text-caption text-ink-muted">{ADJUST[st]}</span>}
                {!m.is_continuous_24x7 && <span className="text-caption text-ink-subtle">Não contínuo: simula na janela de operação (horas/dias de funcionamento).</span>}
              </label>
            )
          })}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-3 rounded-card border border-border p-3">
        <legend className="px-1 font-semibold">Turmas (K) e tamanho</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Modo de K" htmlFor="kMode">
            <select id="kMode" className={inputCls} {...register('kMode')}>
              {(Object.keys(K_MODE_LABEL) as KMode[]).map((m) => (
                <option key={m} value={m}>
                  {K_MODE_LABEL[m]}
                </option>
              ))}
            </select>
          </Field>
          {kMode !== 'sugerir' && kMode !== 'faixa' && (
            <Field label={kMode === 'minimo' ? 'K mínimo (turmas)' : 'Nº de turmas (K)'} htmlFor={kMode === 'minimo' ? 'kMin' : 'teamCount'} error={e.teamCount?.message}>
              {kMode === 'minimo' ? (
                <input id="kMin" type="number" min={1} max={60} className={inputCls} {...register('kMin', { valueAsNumber: true })} />
              ) : (
                <input id="teamCount" type="number" min={1} max={60} className={inputCls} aria-invalid={!!e.teamCount} {...register('teamCount', { valueAsNumber: true })} />
              )}
            </Field>
          )}
          {kMode === 'faixa' && (
            <>
              <Field label="K mínimo" htmlFor="kMin">
                <input id="kMin" type="number" min={1} max={60} className={inputCls} {...register('kMin', { valueAsNumber: true })} />
              </Field>
              <Field label="K máximo" htmlFor="kMax" error={e.kMax?.message}>
                <input id="kMax" type="number" min={1} max={60} className={inputCls} {...register('kMax', { valueAsNumber: true })} />
              </Field>
            </>
          )}
          {kMode === 'fixo' && (
            <label className="flex items-center gap-2 self-end text-caption">
              <input type="checkbox" checked={sizes.length > 0} onChange={(ev) => setValue('teamSizes', ev.target.checked ? Array.from({ length: Math.max(1, k) }, () => postos) : [])} />
              Tamanhos diferentes por turma
            </label>
          )}
        </div>
        {kMode === 'fixo' && sizes.length > 0 && (
          <div className="flex flex-wrap gap-3" role="group" aria-label="Pessoas por turma">
            {Array.from({ length: Math.max(1, k) }, (_, i) => (
              <label key={i} className="flex flex-col text-caption text-ink-muted">
                Turma {teamName(i)}
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  className={`${inputCls} w-20`}
                  value={sizes[i] ?? postos}
                  onChange={(ev) => {
                    const v = Number(ev.target.value)
                    if (!(v > 0)) return
                    const next = Array.from({ length: Math.max(1, k) }, (_, j) => sizes[j] ?? postos)
                    next[i] = v
                    setValue('teamSizes', next)
                  }}
                />
              </label>
            ))}
          </div>
        )}
        <p className="text-caption text-ink-muted">Qualquer K é aceito (1 a 60, inclusive meias-turmas via tamanhos 0,5): o motor calcula a cobertura resultante e informa o déficit/excesso. “Sugerir” escolhe o menor K que zera o déficit.</p>
      </fieldset>
      <div aria-live="polite" className="flex flex-col gap-2">
        {kMode === 'fixo' && kReq != null && k < kReq && (
          <p className="rounded-card border border-sev-alerta bg-sev-alerta-bg px-3 py-2 text-sev-alerta">
            ⚠ COB_TURMAS_INSUFICIENTES: {k} turmas &lt; K necessário {fmt(kReq, 2)} — sugestão: {Math.ceil(kReq)} turmas
            {kReq % 1 ? ` ou ${Math.ceil(kReq * 2)} meias-turmas` : ''}. Você pode seguir para ver o déficit.
          </p>
        )}
        {kMode === 'fixo' && kLegal != null && k < kLegal && (kReq == null || k >= kReq) && (
          <p className="rounded-card border border-sev-alerta bg-sev-alerta-bg px-3 py-2 text-sev-alerta">
            ⚠ K mínimo legal no regime {reg}: {fmt(kLegal, 2)} → {Math.ceil(kLegal)} turmas ou {Math.ceil(kLegal * 2)} meias-turmas.
          </p>
        )}
      </div>
    </div>
  )
}
