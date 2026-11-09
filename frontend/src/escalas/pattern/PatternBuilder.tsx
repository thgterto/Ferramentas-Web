import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiData, type S } from '../api/client'
import { Button, ErrorBox, inputCls } from '../components/ui'
import { LayerEditor } from './LayerEditor'
import { PatternPreview } from './PatternPreview'
import { ShiftRuler } from './ShiftRuler'
import { ALL_DAYS, WEEKDAY_SHORT, layerK, reinforcementLayer, totalTeams, type PatternSpec, type ShiftSpec } from './model'

type Template = S['PatternTemplateOut']

/** Construtor de escala personalizada (T9 / 04 §8.9–8.13): turnos, camadas, K, preview, templates. */
export function PatternBuilder({ value, onChange, postos, regimeCode, demand }: { value: PatternSpec; onChange: (p: PatternSpec) => void; postos: number; regimeCode?: string | null; demand?: number[] }) {
  const qc = useQueryClient()
  const templates = useQuery({ queryKey: ['schedule-patterns'], queryFn: () => apiData<Template[]>('/schedule-patterns') })
  const [tplName, setTplName] = useState('')
  const [loaded, setLoaded] = useState<string>('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<unknown>(null)
  const used = new Set(value.layers.flatMap((l) => l.sequence))
  const set = (patch: Partial<PatternSpec>) => onChange({ ...value, ...patch })

  const onShifts = (next: ShiftSpec[]) => {
    // renomear uma sigla propaga para as sequências
    let layers = value.layers
    if (next.length === value.shifts.length) {
      next.forEach((s, i) => {
        const old = value.shifts[i].code
        if (s.code !== old && s.code) layers = layers.map((l) => ({ ...l, sequence: l.sequence.map((c) => (c === old ? s.code : c)) }))
      })
    }
    onChange({ ...value, shifts: next, layers })
  }

  const save = async () => {
    setErr(null)
    try {
      const name = tplName.trim() || value.name
      const t = await apiData<Template>('/schedule-patterns', { body: { name, pattern: { ...value, name } } })
      setMsg(`Template “${t.name}” salvo na organização (v${t.current_version}).`)
      setLoaded(t.id)
      void qc.invalidateQueries({ queryKey: ['schedule-patterns'] })
    } catch (e) {
      setErr(e)
    }
  }
  const update = async () => {
    setErr(null)
    try {
      const t = await apiData<Template>(`/schedule-patterns/${loaded}`, { method: 'PUT', body: { pattern: value } })
      setMsg(`Template “${t.name}” atualizado (v${t.current_version}).`)
      void qc.invalidateQueries({ queryKey: ['schedule-patterns'] })
    } catch (e) {
      setErr(e)
    }
  }
  const duplicate = async () => {
    setErr(null)
    try {
      const t = await apiData<Template>(`/schedule-patterns/${loaded}/duplicate`, { body: {} })
      setMsg(`Duplicado como “${t.name}”.`)
      setLoaded(t.id)
      void qc.invalidateQueries({ queryKey: ['schedule-patterns'] })
    } catch (e) {
      setErr(e)
    }
  }
  const load = (id: string) => {
    setLoaded(id)
    const t = templates.data?.find((x) => x.id === id)
    if (t) {
      onChange(t.pattern as unknown as PatternSpec)
      setMsg(`Template “${t.name}” carregado${t.derived_from_code ? ` (derivado de ${t.derived_from_code})` : ''}.`)
    }
  }

  const firsts = value.layers.map((_, i) => value.layers.slice(0, i).reduce((a, l) => a + layerK(l), 0))
  const w = value.operating_window
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]" data-testid="construtor">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3 rounded-card border border-border p-3">
          <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
            Nome do padrão
            <input className={`${inputCls} w-64`} value={value.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
            Data-âncora do ciclo (dia 1)
            <input type="date" className={inputCls} value={value.anchor_date ?? ''} onChange={(e) => set({ anchor_date: e.target.value || null })} />
          </label>
          <span className="text-caption text-ink-muted">
            {value.derived_from ? `Derivado de ${value.derived_from}` : 'Padrão livre'} · {totalTeams(value)} turmas no total
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-card border border-border p-3" role="group" aria-label="Templates da organização">
          <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
            Templates da organização
            <select className={`${inputCls} w-56`} value={loaded} onChange={(e) => load(e.target.value)}>
              <option value="">—</option>
              {(templates.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.current_version}){t.derived_from_code ? ` · de ${t.derived_from_code}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-caption font-medium text-ink-muted">
            Salvar como
            <input className={`${inputCls} w-48`} placeholder={value.name} value={tplName} onChange={(e) => setTplName(e.target.value)} />
          </label>
          <Button variant="secondary" onClick={() => void save()}>
            Salvar como template
          </Button>
          <Button variant="secondary" disabled={!loaded} onClick={() => void update()}>
            Atualizar template
          </Button>
          <Button variant="secondary" disabled={!loaded} onClick={() => void duplicate()}>
            Duplicar
          </Button>
          {msg && (
            <p role="status" className="w-full text-caption text-sev-ok">
              {msg}
            </p>
          )}
          <div className="w-full">
            <ErrorBox error={err} />
          </div>
        </div>

        <ShiftRuler shifts={value.shifts} used={used} onChange={onShifts} />

        {value.layers.map((l, i) => {
          return (
            <LayerEditor
              key={i}
              index={i}
              layer={l}
              shifts={value.shifts}
              firstTeam={firsts[i]}
              defaultSize={Math.max(1, postos)}
              onChange={(nl) => set({ layers: value.layers.map((x, j) => (j === i ? nl : x)) })}
              onRemove={value.layers.length > 1 ? () => set({ layers: value.layers.filter((_, j) => j !== i) }) : undefined}
            />
          )
        })}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const r = reinforcementLayer(value)
              onChange({ ...value, shifts: r.shifts, layers: [...value.layers, r.layer] })
            }}
          >
            + Camada de reforço (5x2)
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              let code = 'CAMADA'
              for (let i = 2; value.layers.some((l) => l.code === code); i++) code = `CAMADA${i}`
              set({ layers: [...value.layers, { code, name: 'Nova camada', sequence: [value.shifts[0].code, 'F'], rotation: 'frente', team_mode: 'sugerir', fixed_off_weekdays: [], active_weekdays: ALL_DAYS, weekly_anchor: false }] })
            }}
          >
            + Camada vazia
          </Button>
        </div>

        <fieldset className="flex flex-col gap-2 rounded-card border border-border p-3">
          <legend className="px-1 text-caption font-medium text-ink-muted">Janela de operação (não contínuo)</legend>
          <label className="flex items-center gap-2 text-caption">
            <input type="checkbox" checked={!!w} onChange={(e) => set({ operating_window: e.target.checked ? { weekdays: [0, 1, 2, 3, 4], start: '08:00', end: '18:00' } : null })} />
            Operação funciona só em dias/horas definidos (fora da janela a demanda é zero)
          </label>
          {w && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Dias de funcionamento">
                {WEEKDAY_SHORT.map((d, i) => (
                  <label key={d} className="flex items-center gap-1 text-caption">
                    <input type="checkbox" checked={(w.weekdays ?? []).includes(i)} onChange={(e) => set({ operating_window: { ...w, weekdays: e.target.checked ? [...(w.weekdays ?? []), i].sort() : (w.weekdays ?? []).filter((x) => x !== i) } })} />
                    {d}
                  </label>
                ))}
              </div>
              <label className="flex flex-col text-caption text-ink-muted">
                Abre
                <input type="time" className={inputCls} value={w.start} onChange={(e) => e.target.value && set({ operating_window: { ...w, start: e.target.value } })} />
              </label>
              <label className="flex flex-col text-caption text-ink-muted">
                Fecha
                <input type="time" className={inputCls} value={w.end} onChange={(e) => e.target.value && set({ operating_window: { ...w, end: e.target.value } })} />
              </label>
            </div>
          )}
        </fieldset>
      </div>
      <div className="xl:sticky xl:top-4 xl:self-start">
        <PatternPreview pattern={value} postos={postos} regimeCode={regimeCode} demand={demand} />
      </div>
    </div>
  )
}
