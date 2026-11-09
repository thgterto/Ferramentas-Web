import { useId, useState } from 'react'
import { Button, inputCls } from '../components/ui'
import { fmt } from '../api/format'
import { SequenceEditor } from './SequenceEditor'
import { ALL_DAYS, K_MODE_LABEL, WEEKDAY_SHORT, fromBlocks, isWork, kStar, layerK, teamName, weeklyHours, type KMode, type LayerSpec, type ShiftSpec } from './model'

function DayChecks({ legend, value, onChange }: { legend: string; value: number[]; onChange: (v: number[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-caption font-medium text-ink-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_SHORT.map((d, i) => (
          <label key={d} className="flex items-center gap-1 text-caption">
            <input type="checkbox" checked={value.includes(i)} onChange={(e) => onChange(e.target.checked ? [...value, i].sort() : value.filter((x) => x !== i))} />
            {d}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Uma camada do padrão (FR-29/FR-30/FR-32/FR-33): sequência, K, offsets, tamanhos, folgas fixas. */
export function LayerEditor({
  layer,
  shifts,
  index,
  firstTeam,
  defaultSize,
  onChange,
  onRemove,
}: {
  layer: LayerSpec
  shifts: ShiftSpec[]
  index: number
  firstTeam: number
  defaultSize: number
  onChange: (l: LayerSpec) => void
  onRemove?: () => void
}) {
  const id = useId()
  const codes = shifts.map((s) => s.code)
  const set = (patch: Partial<LayerSpec>) => onChange({ ...layer, ...patch })
  const mode = (layer.team_mode ?? 'fixo') as KMode
  const ks = kStar(layer.sequence)
  const k = layerK(layer)
  const L = layer.sequence.length
  const manual = layer.offsets != null
  const [blk, setBlk] = useState({ codes: codes.filter((c) => ['M', 'T', 'N'].includes(c)).length ? codes.filter((c) => ['M', 'T', 'N'].includes(c)) : codes.slice(0, 1), days: 2, off: 2 })
  const sizes = Array.from({ length: k }, (_, i) => Number(layer.team_sizes?.[i] ?? defaultSize))
  const uniform = () => Array.from({ length: k }, (_, i) => Math.round((i * L) / k) % L)
  const setK = (n: number) => {
    const kk = Math.max(1, Math.min(60, n || 1))
    const patch: Partial<LayerSpec> = { k: kk }
    if (layer.offsets) patch.offsets = Array.from({ length: kk }, (_, i) => layer.offsets?.[i] ?? Math.round((i * L) / kk) % L)
    if (layer.team_sizes) patch.team_sizes = Array.from({ length: kk }, (_, i) => layer.team_sizes?.[i] ?? defaultSize)
    set(patch)
  }

  return (
    <section aria-labelledby={`${id}-t`} className="flex flex-col gap-4 rounded-card border border-border p-4" data-testid={`camada-${layer.code}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 id={`${id}-t`} className="font-semibold">
          Camada {index + 1}: {layer.name || layer.code}
        </h3>
        {onRemove && (
          <Button variant="ghost" onClick={onRemove}>
            Remover camada
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
          Código da camada
          <input className={`${inputCls} font-mono uppercase`} value={layer.code} maxLength={16} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') || 'C' })} />
        </label>
        <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
          Nome
          <input className={inputCls} value={layer.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
          Sentido da rotação
          <select className={inputCls} value={layer.rotation} onChange={(e) => set({ rotation: e.target.value as 'frente' | 'tras' })}>
            <option value="frente">Para frente (M→T→N)</option>
            <option value="tras">Para trás (N→T→M)</option>
          </select>
        </label>
      </div>

      <SequenceEditor label={`Sequência da camada ${layer.code}`} sequence={layer.sequence} codes={codes} onChange={(s) => set({ sequence: s, offsets: layer.offsets ? layer.offsets.map((o) => o % s.length) : null })} />
      <p className="text-caption text-ink-muted tabular-nums" aria-live="polite">
        L = {L} dias · {layer.sequence.filter(isWork).length} trabalhados · K* = {fmt(ks, 2)} · {fmt(weeklyHours(layer.sequence, shifts), 2)} h/sem média
      </p>

      <details className="rounded-card border border-border p-3">
        <summary className="cursor-pointer text-caption font-medium">Gerar por blocos (n dias por turno + folgas)</summary>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="text-caption text-ink-muted">Turnos, na ordem</legend>
            {codes.map((c) => (
              <label key={c} className="flex items-center gap-1 text-caption">
                <input type="checkbox" checked={blk.codes.includes(c)} onChange={(e) => setBlk({ ...blk, codes: e.target.checked ? [...blk.codes, c] : blk.codes.filter((x) => x !== c) })} />
                {c}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col text-caption text-ink-muted">
            Dias por turno
            <input type="number" min={1} max={14} className={`${inputCls} w-20`} value={blk.days} onChange={(e) => setBlk({ ...blk, days: Number(e.target.value) || 1 })} />
          </label>
          <label className="flex flex-col text-caption text-ink-muted">
            Folgas
            <input type="number" min={0} max={30} className={`${inputCls} w-20`} value={blk.off} onChange={(e) => setBlk({ ...blk, off: Number(e.target.value) || 0 })} />
          </label>
          <Button variant="secondary" disabled={!blk.codes.length} onClick={() => set({ sequence: fromBlocks(blk.codes, blk.days, blk.off, layer.rotation === 'tras'), offsets: null })}>
            Gerar sequência
          </Button>
        </div>
      </details>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-caption font-medium text-ink-muted">Turmas (K) desta camada</legend>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-caption text-ink-muted">
            Modo de K
            <select className={inputCls} value={mode} onChange={(e) => set({ team_mode: e.target.value as KMode, k: e.target.value === 'fixo' ? k : layer.k, k_min: e.target.value === 'faixa' || e.target.value === 'minimo' ? layer.k_min ?? Math.max(1, Math.floor(ks)) : layer.k_min, k_max: e.target.value === 'faixa' ? layer.k_max ?? Math.ceil(ks) + 1 : layer.k_max })}>
              {(Object.keys(K_MODE_LABEL) as KMode[]).map((m) => (
                <option key={m} value={m}>
                  {K_MODE_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          {mode === 'fixo' && (
            <label className="flex flex-col gap-1 text-caption text-ink-muted">
              K (turmas)
              <input type="number" min={1} max={60} className={`${inputCls} w-24`} value={layer.k ?? k} onChange={(e) => setK(Number(e.target.value))} />
            </label>
          )}
          {(mode === 'minimo' || mode === 'faixa') && (
            <label className="flex flex-col gap-1 text-caption text-ink-muted">
              K mínimo
              <input type="number" min={1} max={60} className={`${inputCls} w-24`} value={layer.k_min ?? 1} onChange={(e) => set({ k_min: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
          )}
          {mode === 'faixa' && (
            <label className="flex flex-col gap-1 text-caption text-ink-muted">
              K máximo
              <input type="number" min={1} max={60} className={`${inputCls} w-24`} value={layer.k_max ?? k} onChange={(e) => set({ k_max: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
          )}
          <span className="text-caption text-ink-muted">
            K necessário {fmt(ks, 2)} → {Math.ceil(ks)} turmas{ks % 1 ? ` ou ${Math.ceil(ks * 2)} meias-turmas` : ''}
          </span>
        </div>
      </fieldset>

      {mode === 'fixo' && (
        <div className="overflow-x-auto">
          <table className="text-body">
            <caption className="text-left text-caption font-medium text-ink-muted">Turmas desta camada: pessoas e offset do ciclo</caption>
            <thead className="text-left text-caption text-ink-muted">
              <tr>
                <th scope="col" className="pr-3">
                  Turma
                </th>
                <th scope="col" className="pr-3">
                  Pessoas
                </th>
                <th scope="col">Offset (dia do ciclo)</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((sz, i) => (
                <tr key={i}>
                  <th scope="row" className="pr-3 text-left font-semibold">
                    {teamName(firstTeam + i)}
                  </th>
                  <td className="pr-3">
                    <input
                      aria-label={`Pessoas na turma ${teamName(firstTeam + i)}`}
                      type="number"
                      min={0.5}
                      step={0.5}
                      className={`${inputCls} w-20`}
                      value={sz}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        if (!(v > 0)) return
                        set({ team_sizes: sizes.map((x, j) => (j === i ? v : x)) })
                      }}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Offset da turma ${teamName(firstTeam + i)}`}
                      type="number"
                      min={0}
                      max={L - 1}
                      disabled={!manual}
                      className={`${inputCls} w-20`}
                      value={manual ? layer.offsets?.[i] ?? 0 : ''}
                      placeholder="auto"
                      onChange={(e) => set({ offsets: (layer.offsets ?? uniform()).map((o, j) => (j === i ? Math.max(0, Math.min(L - 1, Number(e.target.value) || 0)) : o)) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-caption">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={manual} onChange={(e) => set({ offsets: e.target.checked ? uniform() : null })} /> Offsets manuais
            </label>
            {manual && (
              <Button variant="ghost" onClick={() => set({ offsets: uniform() })}>
                Distribuir uniformemente
              </Button>
            )}
            <Button variant="ghost" onClick={() => set({ team_sizes: null })} disabled={!layer.team_sizes}>
              Tamanho padrão ({defaultSize}) para todas
            </Button>
            <Button variant="ghost" onClick={() => set({ team_sizes: sizes.map(() => defaultSize / 2) })}>
              Meias-turmas ({defaultSize / 2})
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DayChecks legend="Folgas fixas (sobrepõem a sequência)" value={layer.fixed_off_weekdays ?? []} onChange={(v) => set({ fixed_off_weekdays: v })} />
        <DayChecks legend="Dias em que a camada opera" value={layer.active_weekdays ?? ALL_DAYS} onChange={(v) => set({ active_weekdays: v })} />
        <label className="flex items-center gap-2 text-caption">
          <input type="checkbox" checked={!!layer.weekly_anchor} onChange={(e) => set({ weekly_anchor: e.target.checked })} />
          Alinhar o dia 1 do ciclo à segunda-feira (ex.: 5x2 seg–sex, fim de semana)
        </label>
      </div>
    </section>
  )
}
