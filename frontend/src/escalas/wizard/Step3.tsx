import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button, Field, inputCls } from '../components/ui'
import { sectorCurve, type WizardValues } from './schema'

export function Step3() {
  const { register, watch, formState, control } = useFormContext<WizardValues>()
  const e = formState.errors
  const roles = useFieldArray({ control, name: 'roles' })
  const subs = useFieldArray({ control, name: 'subs' })
  const mins = useFieldArray({ control, name: 'minimums' })
  const day = Number(watch('shrinkDay')) || 0
  const night = Number(watch('shrinkNight')) || 0
  const reserve = watch('reserve')
  const roleCodes = watch('roles').map((r) => r.code).filter(Boolean)
  const sectorSubs = watch('subsectors')
  const postos = sectorSubs.length ? Math.max(...sectorCurve(sectorSubs)) : watch('demandMode') === 'fixos' ? Number(watch('postos')) || 0 : Math.max(...watch('curve').map(Number))
  const gross = (p: number) => (p < 60 ? postos / (1 - p / 100) : NaN)
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Shrinkage diurno (%)" htmlFor="shrinkDay" error={e.shrinkDay?.message} hint={day > 40 ? 'ⓘ Acima de 40%: confira as premissas.' : undefined}>
          <input id="shrinkDay" type="number" step="0.1" min={0} max={59.9} className={inputCls} aria-invalid={!!e.shrinkDay} {...register('shrinkDay', { valueAsNumber: true })} />
        </Field>
        <Field label="Shrinkage noturno (%) — faixa 22h–05h" htmlFor="shrinkNight" error={e.shrinkNight?.message} hint={night > 40 ? 'ⓘ Acima de 40%: confira as premissas.' : undefined}>
          <input id="shrinkNight" type="number" step="0.1" min={0} max={59.9} className={inputCls} aria-invalid={!!e.shrinkNight} {...register('shrinkNight', { valueAsNumber: true })} />
        </Field>
        <p className="self-end text-body text-ink-muted" aria-live="polite">
          Pico nominal {postos} → com reserva: dia {Number.isFinite(gross(day)) ? gross(day).toFixed(2) : '—'} · noite {Number.isFinite(gross(night)) ? gross(night).toFixed(2) : '—'}
        </p>
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-caption font-medium text-ink-muted">Estratégia de reserva</legend>
        <label className="flex items-center gap-2">
          <input type="radio" value="nenhuma" {...register('reserve')} /> Nenhuma (só visualizar o risco)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" value="extras" {...register('reserve')} /> Pessoas extras por turma
        </label>
        <label className="flex items-center gap-2 text-ink-subtle">
          <input type="radio" disabled /> Turma de folguistas <span className="rounded-full border border-border px-1.5 text-micro">Fase 2</span>
        </label>
        {reserve === 'extras' && (
          <Field label="Pessoas extras por turma" htmlFor="extrasPerTeam" error={e.extrasPerTeam?.message}>
            <input id="extrasPerTeam" type="number" min={0} className={`${inputCls} w-32`} {...register('extrasPerTeam', { valueAsNumber: true })} />
          </Field>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-card border border-border p-4">
        <legend className="px-1 font-semibold">Cargos (opcional)</legend>
        <p className="text-caption text-ink-muted">Sem cargos, a operação usa um cargo único implícito. O 1º cargo é o exigido pelo posto.</p>
        <table className="text-body">
          <thead className="text-left text-caption text-ink-muted">
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Nome</th>
              <th scope="col">Pessoas por turma</th>
              <th scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.fields.map((f, i) => (
              <tr key={f.id}>
                <td className="pr-2">
                  <input aria-label={`Código do cargo ${i + 1}`} className={inputCls} aria-invalid={!!e.roles?.[i]?.code} {...register(`roles.${i}.code`)} />
                  {e.roles?.[i]?.code && <p className="text-caption text-sev-erro">{e.roles[i]?.code?.message}</p>}
                </td>
                <td className="pr-2">
                  <input aria-label={`Nome do cargo ${i + 1}`} className={inputCls} {...register(`roles.${i}.name`)} />
                </td>
                <td className="pr-2">
                  <input aria-label={`Pessoas por turma do cargo ${i + 1}`} type="number" min={0} className={`${inputCls} w-24`} {...register(`roles.${i}.perTeam`, { valueAsNumber: true })} />
                </td>
                <td>
                  <Button variant="ghost" onClick={() => roles.remove(i)} aria-label={`Remover cargo ${i + 1}`}>
                    Remover
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button variant="secondary" className="w-fit" onClick={() => roles.append({ code: '', name: '', perTeam: 0 })}>
          + Cargo
        </Button>

        <h3 className="mt-3 font-semibold">Matriz de substituição (A pode cobrir B)</h3>
        {subs.fields.map((f, i) => (
          <div key={f.id} className="flex items-center gap-2">
            <select aria-label={`Substituição ${i + 1}: cargo que cobre`} className={inputCls} {...register(`subs.${i}.from`)}>
              <option value="">—</option>
              {roleCodes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span aria-hidden="true">→ cobre →</span>
            <select aria-label={`Substituição ${i + 1}: cargo coberto`} className={inputCls} {...register(`subs.${i}.to`)}>
              <option value="">—</option>
              {roleCodes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            {e.subs?.[i]?.to && <span className="text-caption text-sev-erro">{e.subs[i]?.to?.message}</span>}
            <Button variant="ghost" onClick={() => subs.remove(i)}>
              Remover
            </Button>
          </div>
        ))}
        <Button variant="secondary" className="w-fit" disabled={roleCodes.length < 2} onClick={() => subs.append({ from: '', to: '' })}>
          + Substituição
        </Button>

        <h3 className="mt-3 font-semibold">Mínimos por turno</h3>
        {mins.fields.map((f, i) => (
          <div key={f.id} className="flex items-center gap-2">
            <select aria-label={`Mínimo ${i + 1}: cargo`} className={inputCls} {...register(`minimums.${i}.role`)}>
              <option value="">—</option>
              {roleCodes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span>≥</span>
            <input aria-label={`Mínimo ${i + 1}: quantidade`} type="number" min={1} className={`${inputCls} w-20`} {...register(`minimums.${i}.min`, { valueAsNumber: true })} />
            <span className="text-caption text-ink-muted">por turno</span>
            <Button variant="ghost" onClick={() => mins.remove(i)}>
              Remover
            </Button>
          </div>
        ))}
        <Button variant="secondary" className="w-fit" disabled={roleCodes.length < 1} onClick={() => mins.append({ role: '', min: 1 })}>
          + Mínimo
        </Button>
      </fieldset>
    </div>
  )
}
