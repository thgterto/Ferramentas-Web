import { useRef, useState, type KeyboardEvent } from 'react'
import { clsx } from 'clsx'
import { Button, inputCls } from '../components/ui'
import { OFF, RESERVE, parseSequence, shiftColor } from './model'

const MAX = 366

/** Editor de sequência do ciclo (04 §8.9): arrastar, teclado (Alt+setas move, Delete remove). */
export function SequenceEditor({ sequence, codes, onChange, label }: { sequence: string[]; codes: string[]; onChange: (s: string[]) => void; label: string }) {
  const [sel, setSel] = useState<number | null>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const [text, setText] = useState<string | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const palette = [...codes, OFF, RESERVE]
  const valid = new Set(palette)

  const focusAt = (i: number) => requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-pos="${i}"]`)?.focus())
  const move = (from: number, to: number) => {
    if (to < 0 || to >= sequence.length || from === to) return
    const s = [...sequence]
    const [x] = s.splice(from, 1)
    s.splice(to, 0, x)
    onChange(s)
    setSel(to)
    focusAt(to)
  }
  const remove = (i: number) => {
    if (sequence.length <= 1) return
    onChange(sequence.filter((_, j) => j !== i))
    setSel(null)
    focusAt(Math.min(i, sequence.length - 2))
  }
  const put = (code: string) => {
    if (sel != null && sel < sequence.length) {
      onChange(sequence.map((c, j) => (j === sel ? code : c)))
      if (sel < sequence.length - 1) {
        setSel(sel + 1)
        focusAt(sel + 1)
      }
    } else if (sequence.length < MAX) onChange([...sequence, code])
  }
  const onKey = (e: KeyboardEvent, i: number) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => (e.altKey ? move(i, i - 1) : focusAt(Math.max(0, i - 1))),
      ArrowRight: () => (e.altKey ? move(i, i + 1) : focusAt(Math.min(sequence.length - 1, i + 1))),
      Home: () => focusAt(0),
      End: () => focusAt(sequence.length - 1),
      Delete: () => remove(i),
      Backspace: () => remove(i),
    }
    const act = actions[e.key]
    if (act) {
      e.preventDefault()
      act()
      return
    }
    const typed = palette.find((c) => c === e.key.toUpperCase())
    if (typed) {
      e.preventDefault()
      onChange(sequence.map((c, j) => (j === i ? typed : c)))
    }
  }
  const applyText = () => {
    if (text == null) return
    const s = parseSequence(text).slice(0, MAX)
    if (s.length && s.every((c) => valid.has(c))) onChange(s)
    setText(null)
  }
  const bad = text != null && parseSequence(text).filter((c) => !valid.has(c))

  return (
    <div className="flex flex-col gap-2">
      <p id={`${label}-ajuda`} className="text-caption text-ink-subtle">
        Arraste para reordenar ou use o teclado: setas navegam, <kbd>Alt</kbd>+setas movem o dia, <kbd>Delete</kbd> remove, digitar a sigla troca o turno. Clique num dia e depois numa sigla para substituir.
      </p>
      <ol ref={listRef} aria-label={`${label}: ${sequence.length} dias`} aria-describedby={`${label}-ajuda`} className="flex flex-wrap gap-1">
        {sequence.map((c, i) => {
          const off = c === OFF || c === RESERVE
          return (
            <li key={i} className={clsx('flex flex-col items-center', i > 0 && i % 7 === 0 && 'ml-2')}>
              <button
                type="button"
                data-pos={i}
                draggable
                aria-pressed={sel === i}
                aria-label={`Dia ${i + 1} do ciclo: ${c === OFF ? 'folga' : c === RESERVE ? 'reserva' : `turno ${c}`}`}
                onClick={() => setSel(sel === i ? null : i)}
                onKeyDown={(e) => onKey(e, i)}
                onDragStart={(e) => {
                  setDrag(i)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', String(i))
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = drag ?? Number(e.dataTransfer.getData('text/plain'))
                  setDrag(null)
                  move(from, i)
                }}
                className={clsx(
                  'flex h-9 min-w-10 cursor-grab items-center justify-center rounded-cell border px-1.5 font-mono text-caption font-semibold',
                  off ? 'pattern-off border-border bg-surface-2 text-ink-muted' : 'text-ink',
                  sel === i ? 'ring-2 ring-primary' : '',
                  drag === i && 'opacity-50',
                )}
                style={off ? undefined : { background: `color-mix(in srgb, ${shiftColor(c, codes)} 28%, rgb(var(--surface)))`, borderColor: shiftColor(c, codes) }}
              >
                {c}
              </button>
              <span aria-hidden="true" className="text-micro tabular-nums text-ink-subtle">
                {i + 1}
              </span>
            </li>
          )
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`${label}: inserir ou substituir`}>
        <span className="text-caption text-ink-muted">{sel != null ? `Substituir dia ${sel + 1} por:` : 'Adicionar ao fim:'}</span>
        {palette.map((c) => (
          <Button key={c} variant="secondary" className="min-h-8 px-2 py-1 font-mono" onClick={() => put(c)} aria-label={`${sel != null ? `Substituir dia ${sel + 1} por` : 'Adicionar'} ${c === OFF ? 'folga (F)' : c === RESERVE ? 'reserva (R)' : c}`}>
            {c}
          </Button>
        ))}
        {sel != null && (
          <>
            <Button variant="ghost" onClick={() => move(sel, sel - 1)} disabled={sel === 0} aria-label="Mover dia selecionado para a esquerda">
              ◀
            </Button>
            <Button variant="ghost" onClick={() => move(sel, sel + 1)} disabled={sel >= sequence.length - 1} aria-label="Mover dia selecionado para a direita">
              ▶
            </Button>
            <Button variant="ghost" onClick={() => remove(sel)} disabled={sequence.length <= 1}>
              Remover dia
            </Button>
          </>
        )}
      </div>
      <label className="flex flex-col gap-1 text-caption text-ink-muted">
        Editar como texto (siglas separadas por espaço)
        <input
          className={`${inputCls} font-mono`}
          value={text ?? sequence.join(' ')}
          onChange={(e) => setText(e.target.value)}
          onBlur={applyText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              applyText()
            }
          }}
          aria-invalid={!!(bad && bad.length)}
        />
        {bad && bad.length > 0 && <span className="text-sev-erro">Siglas não definidas: {bad.join(', ')} — crie o turno na régua.</span>}
      </label>
    </div>
  )
}
