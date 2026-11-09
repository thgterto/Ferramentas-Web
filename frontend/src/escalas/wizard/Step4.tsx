import { useQuery } from '@tanstack/react-query'
import { useFormContext } from 'react-hook-form'
import { clsx } from 'clsx'
import { apiData, type S, type ScheduleModelOut } from '../api/client'
import { fmt } from '../api/format'
import { ComplianceBadge, RegimeMiniLine } from '../components/ComplianceBadge'
import { statusFor } from '../components/compliance'
import { defaultShifts } from './shifts'
import { ErrorBox, Field, Spinner, inputCls } from '../components/ui'
import type { WizardValues } from './schema'
import type { RegimeResolution } from './useRegime'


const ADJUST: Record<string, string> = {
  nao_conforme: 'Ajuste sugerido: +1 turma ou outro modelo (veja “Simular transição”).',
  so_com_act: 'Só é viável com ACT/CCT de compensação.',
  regime_especial: 'Regime especial: pendente de lei ordinária.',
  baseline: '6x1 vedada neste regime — use só como baseline de comparação.',
}

export function Step4({ regime }: { regime: RegimeResolution }) {
  const { register, watch, setValue, formState } = useFormContext<WizardValues>()
  const e = formState.errors
  const models = useQuery({ queryKey: ['schedule-models'], queryFn: () => apiData<ScheduleModelOut[]>('/schedule-models'), staleTime: Infinity })
  const shifts = useQuery({ queryKey: ['shift-templates'], queryFn: () => apiData<S['ShiftTemplateOut'][]>('/shift-templates'), staleTime: Infinity })
  const code = watch('modelCode')
  const k = Number(watch('teamCount')) || 0
  const reg = regime.code ?? 'CLT_44H_ATUAL'
  const sel = models.data?.find((m) => m.code === code)
  const kReq = sel?.teams_24x7 ? Number(sel.teams_24x7) : null
  const weeklyMax = regime.regime ? Number(regime.regime.weekly_hours_max) : null
  const kLegal = sel?.is_continuous_24x7 && weeklyMax ? 168 / weeklyMax : null

  return (
    <div className="flex flex-col gap-4">
      {models.isLoading && <Spinner label="Carregando catálogo…" />}
      <ErrorBox error={models.error} />
      <fieldset>
        <legend className="mb-2 text-caption font-medium text-ink-muted">
          Modelo de escala · selo no regime {reg}
        </legend>
        {e.modelCode && <p className="text-caption text-sev-erro">{e.modelCode.message}</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {models.data?.map((m) => {
            const st = statusFor(m.code, reg, m.regime_compliance)
            const checked = code === m.code
            return (
              <label
                key={m.code}
                className={clsx('flex cursor-pointer flex-col gap-2 rounded-card border p-3', checked ? 'border-2 border-primary' : 'border-border')}
                data-testid={`modelo-${m.code}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      value={m.code}
                      {...register('modelCode', {
                        onChange: () => {
                          setValue('shiftCodes', defaultShifts(m))
                          if (m.teams_24x7) setValue('teamCount', Math.ceil(Number(m.teams_24x7)))
                        },
                      })}
                    />
                    <span className="font-semibold">{m.name}</span>
                  </span>
                  <ComplianceBadge status={st} compact />
                </span>
                <span className="text-caption text-ink-muted tabular-nums">
                  {m.work_days}x{m.off_days} · {m.shifts_per_day} turno(s)/dia · K necessário {m.teams_24x7 ? fmt(m.teams_24x7, 2) : '—'} · {fmt(m.avg_weekly_hours, 1)} h/sem · ciclo {m.calendar_cycle_days} d
                </span>
                <RegimeMiniLine modelCode={m.code} compliance={m.regime_compliance} current={reg} />
                {ADJUST[st] && <span className="text-caption text-ink-muted">{ADJUST[st]}</span>}
                {!m.is_continuous_24x7 && <span className="text-caption text-ink-subtle">Não contínuo: não cobre 24/7.</span>}
              </label>
            )
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Nº de turmas (K fixo)" htmlFor="teamCount" error={e.teamCount?.message}>
          <input id="teamCount" type="number" min={1} max={12} className={inputCls} aria-invalid={!!e.teamCount} {...register('teamCount', { valueAsNumber: true })} />
        </Field>
        <fieldset>
          <legend className="text-caption font-medium text-ink-muted">Turnos</legend>
          <div className="flex flex-wrap gap-3">
            {shifts.data?.map((s) => (
              <label key={s.code} className="flex items-center gap-1" title={`${s.start_time} · ${s.duration_minutes / 60} h`}>
                <input type="checkbox" value={s.code} {...register('shiftCodes')} /> {s.code} ({s.start_time})
              </label>
            ))}
          </div>
          {e.shiftCodes && <p className="text-caption text-sev-erro">{e.shiftCodes.message}</p>}
        </fieldset>
      </div>
      <div aria-live="polite" className="flex flex-col gap-2">
        {kReq != null && k < kReq && (
          <p className="rounded-card border border-sev-alerta bg-sev-alerta-bg px-3 py-2 text-sev-alerta">
            ⚠ COB_TURMAS_INSUFICIENTES: {k} turmas &lt; K necessário {fmt(kReq, 2)} — sugestão: {Math.ceil(kReq)} turmas
            {kReq % 1 ? ` ou ${Math.ceil(kReq * 2)} meias-turmas` : ''}. Você pode seguir para ver o déficit.
          </p>
        )}
        {kLegal != null && k < kLegal && (kReq == null || k >= kReq) && (
          <p className="rounded-card border border-sev-alerta bg-sev-alerta-bg px-3 py-2 text-sev-alerta">
            ⚠ K mínimo legal no regime {reg}: {fmt(kLegal, 2)} → {Math.ceil(kLegal)} turmas ou {Math.ceil(kLegal * 2)} meias-turmas.
          </p>
        )}
      </div>
    </div>
  )
}
