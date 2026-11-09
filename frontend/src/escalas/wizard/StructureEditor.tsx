import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button, inputCls } from '../components/ui'
import { sectorCurve, type WizardValues } from './schema'

/**
 * v3.7 — Subsetores → posições (postos de trabalho) com demanda própria e pools de
 * intercambialidade. Com subsetores, a demanda do setor = soma das posições.
 */
export function StructureEditor() {
  const { control, register, watch, formState } = useFormContext<WizardValues>()
  const subs = useFieldArray({ control, name: 'subsectors' })
  const pools = useFieldArray({ control, name: 'pools' })
  const values = watch('subsectors')
  const codes = values.map((s) => s.code).filter(Boolean)
  const total = values.length ? sectorCurve(values) : []
  const e = formState.errors
  return (
    <fieldset className="flex flex-col gap-3 rounded-card border border-border p-4" data-testid="estrutura">
      <legend className="px-1 font-semibold">Subsetores e posições (opcional)</legend>
      <p className="text-caption text-ink-muted">
        Use quando o setor tem dois ou mais subsetores (ex.: Caldeiras e Turbinas) com posições próprias (Caldeira 1, Turbina 2…). A demanda do setor passa a ser a soma das posições; as pessoas ficam lotadas em um subsetor/posição e podem ser remanejadas dentro de um pool.
      </p>
      {subs.fields.map((f, i) => (
        <SubsectorBlock key={f.id} index={i} onRemove={() => subs.remove(i)} />
      ))}
      {typeof e.subsectors?.message === 'string' && (
        <p role="alert" className="text-caption text-sev-erro">
          {e.subsectors.message}
        </p>
      )}
      <Button
        variant="secondary"
        className="w-fit"
        onClick={() => {
          const n = subs.fields.length + 1
          subs.append({ code: `S${n}`, name: `Subsetor ${n}`, positions: [{ code: `S${n}P1`, name: `Posição ${n}.1`, role: '', posts: 1, from: 0, to: 24 }] })
        }}
      >
        + Subsetor
      </Button>
      {values.length > 0 && (
        <p className="text-body text-ink-muted" aria-live="polite">
          Demanda do setor (soma das posições): pico <strong className="text-ink">{Math.max(...total)}</strong> · <strong className="text-ink">{total.reduce((a, b) => a + b, 0).toLocaleString('pt-BR')}</strong> horas-posto/semana
        </p>
      )}
      {values.length >= 2 && (
        <>
          <h3 className="mt-2 font-semibold">Pools de intercambialidade</h3>
          <p className="text-caption text-ink-muted">Subsetores do mesmo pool trocam pessoas hora a hora quando um tem sobra e o outro falta (preferindo a lotação de origem).</p>
          {pools.fields.map((f, i) => (
            <div key={f.id} className="flex flex-wrap items-end gap-2 rounded-cell border border-dashed border-primary p-2">
              <label className="flex flex-col text-caption text-ink-muted">
                Código
                <input aria-label={`Código do pool ${i + 1}`} className={`${inputCls} w-24`} {...register(`pools.${i}.code`)} />
              </label>
              <label className="flex flex-col text-caption text-ink-muted">
                Nome
                <input aria-label={`Nome do pool ${i + 1}`} className={inputCls} {...register(`pools.${i}.name`)} />
              </label>
              <fieldset className="flex flex-wrap gap-2 text-caption">
                <legend className="text-ink-muted">Subsetores</legend>
                {codes.map((c) => (
                  <label key={c} className="flex items-center gap-1">
                    <input type="checkbox" value={c} aria-label={`Pool ${i + 1} inclui ${c}`} {...register(`pools.${i}.members`)} /> {c}
                  </label>
                ))}
              </fieldset>
              <label className="flex flex-col text-caption text-ink-muted">
                Cargos (vazio = todos)
                <input aria-label={`Cargos do pool ${i + 1}`} placeholder="ex.: OPER" className={`${inputCls} w-32`} {...register(`pools.${i}.roles`)} />
              </label>
              <label className="flex flex-col text-caption text-ink-muted">
                Máx. h emprestadas/sem
                <input aria-label={`Limite de horas do pool ${i + 1}`} type="number" min={0} max={168} className={`${inputCls} w-24`} {...register(`pools.${i}.maxHours`, { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })} />
              </label>
              <label className="flex items-center gap-1 pb-2 text-caption">
                <input type="checkbox" {...register(`pools.${i}.preferHome`)} /> Preferir lotação de origem
              </label>
              <Button variant="ghost" onClick={() => pools.remove(i)}>
                Remover
              </Button>
              {e.pools?.[i]?.members && <p className="w-full text-caption text-sev-erro">{e.pools[i]?.members?.message}</p>}
            </div>
          ))}
          <Button variant="secondary" className="w-fit" onClick={() => pools.append({ code: `P${pools.fields.length + 1}`, name: 'Pool', members: codes.slice(0, 2), roles: '', maxHours: null, preferHome: true })}>
            + Pool
          </Button>
        </>
      )}
    </fieldset>
  )
}

function SubsectorBlock({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { control, register, formState } = useFormContext<WizardValues>()
  const pos = useFieldArray({ control, name: `subsectors.${index}.positions` })
  const e = formState.errors.subsectors?.[index]
  return (
    <div className="flex flex-col gap-2 rounded-cell border border-border p-3" data-subsector={index}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-caption text-ink-muted">
          Código do subsetor
          <input aria-label={`Código do subsetor ${index + 1}`} className={`${inputCls} w-28`} aria-invalid={!!e?.code} {...register(`subsectors.${index}.code`)} />
        </label>
        <label className="flex flex-col text-caption text-ink-muted">
          Nome do subsetor
          <input aria-label={`Nome do subsetor ${index + 1}`} className={inputCls} {...register(`subsectors.${index}.name`)} />
        </label>
        <Button variant="ghost" onClick={onRemove} aria-label={`Remover subsetor ${index + 1}`}>
          Remover subsetor
        </Button>
        {e?.code && <span className="text-caption text-sev-erro">{e.code.message}</span>}
      </div>
      <table className="text-body">
        <thead className="text-left text-caption text-ink-muted">
          <tr>
            <th scope="col">Posição</th>
            <th scope="col">Nome</th>
            <th scope="col">Cargo exigido</th>
            <th scope="col">Postos</th>
            <th scope="col">Das (h)</th>
            <th scope="col">Às (h)</th>
            <th scope="col">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {pos.fields.map((f, j) => (
            <tr key={f.id}>
              <td className="pr-1">
                <input aria-label={`Subsetor ${index + 1} posição ${j + 1} código`} className={`${inputCls} w-24`} {...register(`subsectors.${index}.positions.${j}.code`)} />
              </td>
              <td className="pr-1">
                <input aria-label={`Subsetor ${index + 1} posição ${j + 1} nome`} className={inputCls} {...register(`subsectors.${index}.positions.${j}.name`)} />
              </td>
              <td className="pr-1">
                <input aria-label={`Subsetor ${index + 1} posição ${j + 1} cargo`} placeholder="—" className={`${inputCls} w-24`} {...register(`subsectors.${index}.positions.${j}.role`)} />
              </td>
              <td className="pr-1">
                <input aria-label={`Subsetor ${index + 1} posição ${j + 1} postos`} type="number" min={0} className={`${inputCls} w-20`} {...register(`subsectors.${index}.positions.${j}.posts`, { valueAsNumber: true })} />
              </td>
              <td className="pr-1">
                <input aria-label={`Subsetor ${index + 1} posição ${j + 1} início`} type="number" min={0} max={23} className={`${inputCls} w-16`} {...register(`subsectors.${index}.positions.${j}.from`, { valueAsNumber: true })} />
              </td>
              <td className="pr-1">
                <input aria-label={`Subsetor ${index + 1} posição ${j + 1} fim`} type="number" min={1} max={24} className={`${inputCls} w-16`} {...register(`subsectors.${index}.positions.${j}.to`, { valueAsNumber: true })} />
              </td>
              <td>
                <Button variant="ghost" onClick={() => pos.remove(j)} disabled={pos.fields.length === 1}>
                  Remover
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="secondary" className="w-fit" onClick={() => pos.append({ code: `P${pos.fields.length + 1}`, name: `Posição ${pos.fields.length + 1}`, role: '', posts: 1, from: 0, to: 24 })}>
        + Posição
      </Button>
    </div>
  )
}
