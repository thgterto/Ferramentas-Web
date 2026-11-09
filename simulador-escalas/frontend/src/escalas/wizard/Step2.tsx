import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Field, inputCls } from '../components/ui'
import { WEEKDAYS } from '../api/format'
import { parseDemandCsv, type WizardValues } from './schema'
import { StructureEditor } from './StructureEditor'

export function Step2() {
  const { register, watch, setValue, formState } = useFormContext<WizardValues>()
  const e = formState.errors
  const mode = watch('demandMode')
  const curve = watch('curve')
  const [uploadErr, setUploadErr] = useState<string[]>([])
  const hasSubs = watch('subsectors').length > 0
  const total = mode === 'fixos' ? (Number(watch('postos')) || 0) * 168 : curve.reduce((a, b) => a + (Number(b) || 0), 0)

  const onFile = async (f: File | undefined) => {
    if (!f) return
    if (f.size > 5 * 1024 * 1024) return setUploadErr(['Arquivo maior que 5 MB'])
    if (!/\.(csv|txt)$/i.test(f.name)) return setUploadErr(['Formato não suportado: envie CSV (XLSX: salve como CSV)'])
    const r = parseDemandCsv(await f.text())
    setUploadErr(r.errors)
    if (r.values) setValue('curve', r.values, { shouldValidate: true, shouldDirty: true })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Nome do posto" htmlFor="positionName" error={e.positionName?.message}>
          <input id="positionName" className={inputCls} aria-invalid={!!e.positionName} {...register('positionName')} />
        </Field>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-caption font-medium text-ink-muted">Modo de demanda</legend>
          <label className="flex items-center gap-2">
            <input type="radio" value="fixos" {...register('demandMode')} /> Postos fixos nas 168 h
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" value="curva" {...register('demandMode')} /> Curva 168 h (grade ou arquivo)
          </label>
        </fieldset>
        <p className="self-end text-body text-ink-muted" aria-live="polite">
          Demanda total: <strong className="tabular-nums text-ink">{total.toLocaleString('pt-BR')}</strong> horas-posto/semana
        </p>
      </div>
      <StructureEditor />
      {hasSubs ? null : mode === 'fixos' ? (
        <Field label="Postos simultâneos (todas as horas)" htmlFor="postos" error={e.postos?.message}>
          <input id="postos" type="number" min={0} className={`${inputCls} w-40`} aria-invalid={!!e.postos} {...register('postos', { valueAsNumber: true })} />
        </Field>
      ) : (
        <div className="flex flex-col gap-2">
          <Field label="Importar CSV (168 linhas ou 7×24)" htmlFor="demand-file">
            <input id="demand-file" type="file" accept=".csv,.txt,text/csv" onChange={(ev) => void onFile(ev.target.files?.[0])} />
          </Field>
          {uploadErr.length > 0 && (
            <ul role="alert" className="list-disc pl-5 text-caption text-sev-erro">
              {uploadErr.slice(0, 10).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {e.curve?.message && (
            <p role="alert" className="text-caption text-sev-erro">
              {e.curve.message}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0.5 text-micro" aria-label="Grade de demanda 168 h (pessoas por hora)">
              <thead>
                <tr>
                  <th scope="col" className="sr-only">Dia</th>
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} scope="col" className="w-9 text-ink-subtle tabular-nums">
                      {String(h).padStart(2, '0')}
                    </th>
                  ))}
                  <th scope="col" className="px-1 text-ink-subtle">Total</th>
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map((d, di) => (
                  <tr key={d}>
                    <th scope="row" className="pr-1 text-left text-caption">
                      {d}
                    </th>
                    {Array.from({ length: 24 }, (_, h) => {
                      const i = di * 24 + h
                      const bad = !!e.curve?.[i]
                      return (
                        <td key={h}>
                          <input
                            type="number"
                            min={0}
                            aria-label={`${d} ${String(h).padStart(2, '0')}h`}
                            aria-invalid={bad}
                            className="h-7 w-9 rounded-cell border border-border bg-surface text-center tabular-nums aria-[invalid=true]:border-sev-erro"
                            {...register(`curve.${i}`, { valueAsNumber: true })}
                          />
                        </td>
                      )
                    })}
                    <td className="px-1 text-right tabular-nums">{curve.slice(di * 24, di * 24 + 24).reduce((a, b) => a + (Number(b) || 0), 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
