import { Button, inputCls } from '../components/ui'
import { fromMin, nextShiftCode, rangeLabel, shiftColor, shiftSegments, toMin, type ShiftSpec } from './model'

const HOURS = Array.from({ length: 25 }, (_, h) => h)

/** Barras de um turno na régua 0–24 h (quebra na meia-noite). */
function bars(sh: ShiftSpec): { left: number; width: number; cont: boolean }[] {
  const out: { left: number; width: number; cont: boolean }[] = []
  for (const [a, b] of shiftSegments(sh)) {
    let s = a
    let cont = false
    while (s < b) {
      const dayStart = Math.floor(s / 1440) * 1440
      const e = Math.min(b, dayStart + 1440)
      out.push({ left: ((s - dayStart) / 1440) * 100, width: ((e - s) / 1440) * 100, cont })
      s = e
      cont = true
    }
  }
  return out
}

/** Régua de turnos 0–24 h (04 §8.12): início/fim/duração livres, sobrepostos, 6 h…24 h. */
export function ShiftRuler({ shifts, used, onChange }: { shifts: ShiftSpec[]; used: Set<string>; onChange: (s: ShiftSpec[]) => void }) {
  const codes = shifts.map((s) => s.code)
  const set = (i: number, patch: Partial<ShiftSpec>) => onChange(shifts.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const add = (hours: number) => {
    const code = nextShiftCode(codes, hours)
    const start = hours === 24 ? '07:00' : hours === 12 ? '07:00' : '08:00'
    onChange([...shifts, { code, start, duration_min: hours * 60, break_min: hours > 6 ? 60 : 15, handover_min: 0, peak: false }])
  }
  return (
    <section aria-labelledby="regua-titulo" className="flex flex-col gap-3">
      <h3 id="regua-titulo" className="font-semibold">
        Turnos e régua 0–24 h
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-body">
          <thead className="text-left text-caption text-ink-muted">
            <tr>
              <th scope="col">Sigla</th>
              <th scope="col">Início</th>
              <th scope="col">Duração (h)</th>
              <th scope="col">Fim</th>
              <th scope="col">Intervalo (min)</th>
              <th scope="col" title="Minutos finais sobrepostos ao turno seguinte (passagem de turno)">
                Passagem (min)
              </th>
              <th scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s, i) => {
              const end = fromMin(toMin(s.start) + s.duration_min)
              const crosses = toMin(s.start) + s.duration_min > 1440
              return (
                <tr key={i} className="border-t border-border">
                  <td className="py-1 pr-2">
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="inline-block size-3 rounded-full" style={{ background: shiftColor(s.code, codes) }} />
                      <input
                        aria-label={`Sigla do turno ${i + 1}`}
                        className={`${inputCls} w-20 font-mono uppercase`}
                        value={s.code}
                        maxLength={8}
                        onChange={(e) => set(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                        aria-invalid={!/^[A-Z][A-Z0-9_]{0,7}$/.test(s.code) || s.code === 'F' || s.code === 'R' || codes.indexOf(s.code) !== i}
                      />
                    </span>
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label={`Início do turno ${s.code}`} type="time" className={inputCls} value={s.start} onChange={(e) => e.target.value && set(i, { start: e.target.value, blocks: null })} />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      aria-label={`Duração do turno ${s.code} em horas`}
                      type="number"
                      min={1}
                      max={24}
                      step={0.5}
                      className={`${inputCls} w-24`}
                      value={s.duration_min / 60}
                      onChange={(e) => {
                        const h = Number(e.target.value)
                        if (Number.isFinite(h) && h >= 1 && h <= 24) set(i, { duration_min: Math.round(h * 60), blocks: null })
                      }}
                    />
                  </td>
                  <td className="py-1 pr-2 tabular-nums text-ink-muted">
                    {end}
                    {crosses ? ' (+1 dia)' : ''}
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label={`Intervalo do turno ${s.code} em minutos`} type="number" min={0} max={240} className={`${inputCls} w-20`} value={s.break_min} onChange={(e) => set(i, { break_min: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })} />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      aria-label={`Sobreposição de passagem do turno ${s.code} em minutos`}
                      type="number"
                      min={0}
                      max={240}
                      step={5}
                      className={`${inputCls} w-20`}
                      value={s.handover_min ?? 0}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(240, Math.round(Number(e.target.value) || 0)))
                        const base = s.duration_min - (s.handover_min ?? 0)
                        // a passagem ESTENDE o turno (06:00–14:00 + 20 min → 06:00–14:20)
                        set(i, { handover_min: v, duration_min: Math.min(1440, base + v), blocks: null })
                      }}
                    />
                  </td>
                  <td className="py-1">
                    <Button variant="ghost" disabled={shifts.length === 1 || used.has(s.code)} title={used.has(s.code) ? 'Em uso em uma sequência' : undefined} onClick={() => onChange(shifts.filter((_, j) => j !== i))} aria-label={`Remover turno ${s.code}`}>
                      Remover
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        {[6, 8, 10, 12, 24].map((h) => (
          <Button key={h} variant="secondary" onClick={() => add(h)}>
            + Turno {h} h
          </Button>
        ))}
      </div>
      <div role="img" aria-label={`Régua 0 a 24 horas: ${shifts.map((s) => `${s.code} ${rangeLabel(s.start, s.duration_min)}`).join('; ')}`} className="flex flex-col gap-1">
        <div className="relative ml-16 h-4 text-micro text-ink-subtle" aria-hidden="true">
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <span key={h} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(h / 24) * 100}%` }}>
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>
        {shifts.map((s) => (
          <div key={s.code} className="flex items-center gap-2" aria-hidden="true">
            <span className="w-14 text-right font-mono text-caption font-semibold">{s.code}</span>
            <div className="relative h-6 flex-1 rounded-cell bg-surface-2" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgb(var(--border)) 0 1px, transparent 1px calc(100% / 24))' }}>
              {bars(s).map((b, j) => (
                <span
                  key={j}
                  className="absolute top-0.5 flex h-5 items-center overflow-hidden rounded-cell px-1 text-micro font-semibold text-ink"
                  style={{ left: `${b.left}%`, width: `${b.width}%`, background: `color-mix(in srgb, ${shiftColor(s.code, codes)} 30%, rgb(var(--surface)))`, borderLeft: `3px solid ${shiftColor(s.code, codes)}` }}
                >
                  {b.cont ? '← ' : ''}
                  {s.code} {rangeLabel(s.start, s.duration_min)}
                  {s.handover_min ? ` · ⇄${s.handover_min}′` : ''}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
