import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { Button, ErrorBox } from '../components/ui'
import { STEP_FIELDS, STEP_TITLES, defaultValues, wizardSchema, type WizardValues } from './schema'
import { Step1 } from './Step1'
import { Step2 } from './Step2'
import { Step3 } from './Step3'
import { Step4 } from './Step4'
import { Step5 } from './Step5'
import { createAndSimulate } from './submit'
import { useRegimeResolution, type RegimeResolution } from './useRegime'

const storeKey = (op: string) => `escalas.wizard.${op}`

function loadDraft(op: string): WizardValues | undefined {
  try {
    const s = sessionStorage.getItem(storeKey(op))
    if (!s) return undefined
    const parsed = wizardSchema.safeParse(JSON.parse(s))
    return parsed.success ? parsed.data : { ...defaultValues(), ...JSON.parse(s) }
  } catch {
    return undefined
  }
}

export function Stepper({ step, errors }: { step: number; errors: boolean[] }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Passos do cenário">
      {STEP_TITLES.map((t, i) => {
        const state = i === step ? 'atual' : errors[i] ? 'com erro' : i < step ? 'completa' : 'pendente'
        return (
          <li
            key={t}
            aria-current={i === step ? 'step' : undefined}
            className={clsx(
              'flex items-center gap-2 rounded-full border px-3 py-1 text-caption',
              i === step ? 'border-primary font-semibold text-primary' : errors[i] ? 'border-sev-erro text-sev-erro' : 'border-border text-ink-muted',
            )}
          >
            <span aria-hidden="true">{errors[i] ? '!' : i < step ? '✓' : i + 1}</span>
            {t}
            <span className="sr-only"> ({state})</span>
          </li>
        )
      })}
    </ol>
  )
}

export default function WizardPage() {
  const { org, op = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const step = Math.min(4, Math.max(0, Number(sp.get('passo') ?? '1') - 1))
  const form = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: loadDraft(op) ?? defaultValues(),
    mode: 'onTouched',
  })
  const [stepErr, setStepErr] = useState<boolean[]>([false, false, false, false, false])
  const [progress, setProgress] = useState<string | null>(null)
  const [submitErr, setSubmitErr] = useState<unknown>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const regime = useRegimeResolution(form.watch('legalMode'), form.watch('legalRegimeCode'), form.watch('legalReferenceDate'))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const sub = form.watch((v) => {
      try {
        sessionStorage.setItem(storeKey(op), JSON.stringify(v))
      } catch {
        /* sem armazenamento */
      }
    })
    return () => sub.unsubscribe()
  }, [form, op])

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const go = (n: number) => setSp({ passo: String(n + 1) })

  const next = async () => {
    const ok = await form.trigger(STEP_FIELDS[step])
    let blocked = !ok
    if (step === 0 && ok && form.getValues('legalMode') === 'data' && !regime.code) {
      form.setError('legalReferenceDate', { message: regime.error ? 'Sem regime vigente nesta data: escolha o regime explicitamente' : 'Aguarde a resolução do regime' })
      blocked = true
    }
    setStepErr((e) => e.map((x, i) => (i === step ? blocked : x)))
    if (!blocked) go(step + 1)
  }

  const simulate = form.handleSubmit(
    async (v) => {
      setSubmitErr(null)
      try {
        const id = await createAndSimulate(op, v, setProgress)
        try {
          sessionStorage.removeItem(storeKey(op))
        } catch {
          /* ignore */
        }
        void qc.invalidateQueries({ queryKey: ['scenarios', op] })
        nav(`/o/${org}/operacoes/${op}/cenarios/${id}/cobertura`)
      } catch (e) {
        setSubmitErr(e)
        setProgress(null)
      }
    },
    (errs) => {
      setStepErr(STEP_FIELDS.map((fs) => fs.some((f) => f in errs)))
    },
  )

  const Steps: React.ComponentType<{ regime: RegimeResolution }>[] = [Step1, Step2, Step3, Step4, Step5]
  const Current = Steps[step]
  return (
    <FormProvider {...form}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <h1 className="text-h1 font-semibold">Novo cenário</h1>
        <Stepper step={step} errors={stepErr} />
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (step === 4) void simulate()
            else void next()
          }}
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
        >
          <h2 ref={headingRef} tabIndex={-1} className="text-h2 font-semibold">
            Passo {step + 1} · {STEP_TITLES[step]}
          </h2>
          <Current regime={regime} />
          <ErrorBox error={submitErr} />
          {progress && (
            <p role="status" aria-live="polite" className="text-body text-ink-muted">
              {progress}
            </p>
          )}
          <div className="flex justify-between gap-2 border-t border-border pt-4">
            <Button variant="secondary" disabled={step === 0 || !!progress} onClick={() => go(step - 1)}>
              Voltar
            </Button>
            {step < 4 ? (
              <Button type="submit">Avançar</Button>
            ) : (
              <Button type="submit" disabled={!!progress}>
                {progress ? 'Simulando…' : 'Simular cobertura'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </FormProvider>
  )
}
