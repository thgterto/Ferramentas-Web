import { useFormContext } from 'react-hook-form'
import { Field, inputCls } from '../components/ui'
import { TransitionTimeline } from '../components/TransitionTimeline'
import { REGIME_LABEL } from '../api/format'
import type { WizardValues } from './schema'
import type { RegimeResolution } from './useRegime'

export function Step1({ regime }: { regime: RegimeResolution }) {
  const { register, watch, formState } = useFormContext<WizardValues>()
  const e = formState.errors
  const mode = watch('legalMode')
  const allows8h = watch('allows8h')
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Nome do cenário" htmlFor="scenarioName" error={e.scenarioName?.message}>
          <input id="scenarioName" className={inputCls} aria-invalid={!!e.scenarioName} {...register('scenarioName')} />
        </Field>
        <Field label="Regras (CCT/ACT)" htmlFor="agreementKind">
          <select id="agreementKind" className={inputCls} {...register('agreementKind')}>
            <option value="CLT_PADRAO">CLT padrão</option>
            <option value="CCT">CCT (convenção coletiva)</option>
            <option value="ACT">ACT (acordo coletivo)</option>
          </select>
        </Field>
        <Field label="Data inicial do horizonte" htmlFor="horizonStart" error={e.horizonStart?.message}>
          <input id="horizonStart" type="date" className={inputCls} aria-invalid={!!e.horizonStart} {...register('horizonStart')} />
        </Field>
        <Field label="Horizonte (semanas)" htmlFor="horizonWeeks" error={e.horizonWeeks?.message} hint="Até 8 semanas no MVP">
          <input id="horizonWeeks" type="number" min={1} max={8} className={inputCls} aria-invalid={!!e.horizonWeeks} {...register('horizonWeeks', { valueAsNumber: true })} />
        </Field>
      </div>
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1 size-4" {...register('allows8h')} />
        <span>
          ACT/CCT autoriza 8 h em turnos ininterruptos de revezamento
          {!allows8h && <span className="block text-caption text-sev-alerta">⚠ Sem esta autorização, turnos &gt; 6 h em revezamento saem com ALERTA (não bloqueia).</span>}
        </span>
      </label>

      <fieldset className="flex flex-col gap-3 rounded-card border border-border p-4">
        <legend className="px-1 text-body font-semibold">Regime legal</legend>
        <div role="radiogroup" aria-label="Como definir o regime" className="inline-flex w-fit overflow-hidden rounded-cell border border-border">
          {(['regime', 'data'] as const).map((m) => (
            <label key={m} className={`cursor-pointer px-3 py-1.5 ${mode === m ? 'bg-primary text-white' : 'bg-surface'}`}>
              <input type="radio" value={m} className="sr-only" {...register('legalMode')} />
              {m === 'regime' ? 'Regime' : 'Data de referência'}
            </label>
          ))}
        </div>
        {mode === 'regime' ? (
          <Field label="Regime" htmlFor="legalRegimeCode" error={e.legalRegimeCode?.message}>
            <select id="legalRegimeCode" className={inputCls} {...register('legalRegimeCode')}>
              <option value="CLT_44H_ATUAL">CLT_44H_ATUAL — 44 h (6x1 permitida)</option>
              <option value="TRANSICAO_42H">TRANSICAO_42H — 42 h</option>
              <option value="PEC_40H">PEC_40H — 40 h, ≥ 2 folgas/semana</option>
            </select>
          </Field>
        ) : (
          <Field
            label="Data de referência"
            htmlFor="legalReferenceDate"
            error={e.legalReferenceDate?.message}
            hint={regime.loading ? 'Resolvendo regime…' : regime.code ? `Regime vigente: ${REGIME_LABEL[regime.code] ?? regime.code}` : regime.error ? 'Sem regime vigente nesta data — escolha o regime explicitamente.' : undefined}
          >
            <input id="legalReferenceDate" type="date" className={inputCls} aria-invalid={!!e.legalReferenceDate} {...register('legalReferenceDate')} />
          </Field>
        )}
        <TransitionTimeline regimes={regime.all} selected={regime.code} />
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4" {...register('compensation')} />
          Há ACT/CCT de compensação de jornada
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" role="switch" className="size-4" {...register('simulateTransition')} />
          Simular transição (44 h → 42 h → 40 h) no resultado
        </label>
      </fieldset>
    </div>
  )
}
