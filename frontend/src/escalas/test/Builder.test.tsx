import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SequenceEditor } from '../pattern/SequenceEditor'
import { ShiftRuler } from '../pattern/ShiftRuler'
import { LayerEditor } from '../pattern/LayerEditor'
import { applyTeams, blankPattern, fromBlocks, kStar, parseSequence, rangeLabel, totalTeams, weeklyHours, type LayerSpec, type ShiftSpec } from '../pattern/model'
import { axeViolations } from './utils'

function Seq({ initial = ['M', 'M', 'T', 'F'] }: { initial?: string[] }) {
  const [s, setS] = useState(initial)
  return (
    <>
      <SequenceEditor label="Sequência" sequence={s} codes={['M', 'T', 'N']} onChange={setS} />
      <output data-testid="seq">{s.join(' ')}</output>
    </>
  )
}

const SHIFTS: ShiftSpec[] = blankPattern().shifts

describe('Construtor de escala (FR-29)', () => {
  it('modelo: K*, h/sem, blocos, texto e faixas de horário', () => {
    expect(kStar(['M', 'M', 'T', 'T', 'N', 'N', 'F', 'F', 'F'])).toBe(4.5)
    expect(weeklyHours(['M', 'M', 'T', 'T', 'N', 'N', 'F', 'F', 'F', 'F'], SHIFTS)).toBeCloseTo(33.6)
    expect(fromBlocks(['M', 'T', 'N'], 2, 2)).toEqual(['M', 'M', 'T', 'T', 'N', 'N', 'F', 'F'])
    expect(fromBlocks(['M', 'T', 'N'], 1, 1, true)).toEqual(['N', 'T', 'M', 'F'])
    expect(parseSequence('m, m t  n;f')).toEqual(['M', 'M', 'T', 'N', 'F'])
    expect(rangeLabel('22:00', 480)).toBe('22–06')
    expect(rangeLabel('07:30', 720)).toBe('07:30–19:30')
    const p = applyTeams({ ...blankPattern(), layers: [blankPattern().layers[0], { ...blankPattern().layers[0], code: 'B' }] }, { mode: 'fixo', k: 5 })
    expect(p.layers.map((l) => l.k)).toEqual([3, 2])
    expect(totalTeams(p)).toBe(5)
    expect(applyTeams(blankPattern(), { mode: 'faixa', k: 5, kMin: 4, kMax: 6 }).layers[0]).toMatchObject({ team_mode: 'faixa', k_min: 4, k_max: 6, k: null })
  })

  it('sequência: teclado (Alt+setas move, Delete remove, sigla troca) e paleta', () => {
    render(<Seq />)
    const day1 = screen.getByRole('button', { name: 'Dia 1 do ciclo: turno M' })
    fireEvent.keyDown(day1, { key: 'ArrowRight', altKey: true })
    expect(screen.getByTestId('seq')).toHaveTextContent('M M T F')
    const day3 = screen.getByRole('button', { name: 'Dia 3 do ciclo: turno T' })
    fireEvent.keyDown(day3, { key: 'ArrowLeft', altKey: true })
    expect(screen.getByTestId('seq')).toHaveTextContent('M T M F')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Dia 4 do ciclo: folga' }), { key: 'n' })
    expect(screen.getByTestId('seq')).toHaveTextContent('M T M N')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Dia 1 do ciclo: turno M' }), { key: 'Delete' })
    expect(screen.getByTestId('seq')).toHaveTextContent('T M N')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar folga (F)' }))
    expect(screen.getByTestId('seq')).toHaveTextContent('T M N F')
    fireEvent.click(screen.getByRole('button', { name: 'Dia 2 do ciclo: turno M' }))
    fireEvent.click(screen.getByRole('button', { name: 'Substituir dia 2 por N' }))
    expect(screen.getByTestId('seq')).toHaveTextContent('T N N F')
  })

  it('sequência: arrastar e soltar reordena; texto livre valida siglas', () => {
    render(<Seq initial={['M', 'T', 'N', 'F']} />)
    const data = new Map<string, string>()
    const dt = { setData: (k: string, v: string) => data.set(k, v), getData: (k: string) => data.get(k) ?? '', effectAllowed: '' }
    fireEvent.dragStart(screen.getByRole('button', { name: 'Dia 1 do ciclo: turno M' }), { dataTransfer: dt })
    fireEvent.drop(screen.getByRole('button', { name: 'Dia 3 do ciclo: turno N' }), { dataTransfer: dt })
    expect(screen.getByTestId('seq')).toHaveTextContent('T N M F')
    const txt = screen.getByLabelText(/Editar como texto/)
    fireEvent.change(txt, { target: { value: 'M M Q F' } })
    expect(screen.getByText(/Siglas não definidas: Q/)).toBeInTheDocument()
    fireEvent.change(txt, { target: { value: 'M M T T N N F F F' } })
    fireEvent.blur(txt)
    expect(screen.getByTestId('seq')).toHaveTextContent('M M T T N N F F F')
  })

  it('régua: turnos livres (24 h, sobrepostos) e rótulos de horário', async () => {
    function R() {
      const [s, setS] = useState(SHIFTS)
      return <ShiftRuler shifts={s} used={new Set(['M'])} onChange={setS} />
    }
    const { container } = render(<R />)
    fireEvent.click(screen.getByRole('button', { name: '+ Turno 24 h' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Turno 6 h' }))
    expect(screen.getByRole('img', { name: /P24 07–07; S6 08–14/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Duração do turno N em horas'), { target: { value: '12' } })
    expect(screen.getByRole('img', { name: /N 22–10/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover turno M' })).toBeDisabled()
    expect(await axeViolations(container)).toEqual([])
  })

  it('camada: K fixo, tamanhos por turma, offsets manuais e folga fixa', () => {
    function C() {
      const [l, setL] = useState<LayerSpec>(blankPattern().layers[0])
      return (
        <>
          <LayerEditor layer={l} shifts={SHIFTS} index={0} firstTeam={0} defaultSize={3} onChange={setL} />
          <output data-testid="layer">{JSON.stringify(l)}</output>
        </>
      )
    }
    render(<C />)
    const layer = () => JSON.parse(screen.getByTestId('layer').textContent!) as LayerSpec
    fireEvent.change(screen.getByLabelText('K (turmas)'), { target: { value: '6' } })
    expect(screen.getAllByRole('spinbutton', { name: /^Pessoas na turma/ })).toHaveLength(6)
    fireEvent.change(screen.getByLabelText('Pessoas na turma F'), { target: { value: '4' } })
    expect(layer().team_sizes).toEqual([3, 3, 3, 3, 3, 4])
    fireEvent.click(screen.getByRole('checkbox', { name: /Offsets manuais/ }))
    expect(layer().offsets).toHaveLength(6)
    fireEvent.change(screen.getByLabelText('Offset da turma B'), { target: { value: '3' } })
    expect(layer().offsets?.[1]).toBe(3)
    const folgas = screen.getByRole('group', { name: 'Folgas fixas (sobrepõem a sequência)' })
    fireEvent.click(within(folgas).getByRole('checkbox', { name: 'Dom' }))
    expect(layer().fixed_off_weekdays).toEqual([6])
    fireEvent.change(screen.getByLabelText('Modo de K'), { target: { value: 'sugerir' } })
    expect(layer().team_mode).toBe('sugerir')
  })
})
